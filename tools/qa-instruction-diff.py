#!/usr/bin/env python3
"""Run every translated instruction against the original program's bytes under Unicorn.

    npm run qa:instruction-diff                                    version 1.3, src/translated-1.3
    python tools/qa-instruction-diff.py GAME_DIR --game-version 1.0 [--translation DIR]

Each `case` in the translation (tools/tp_translate.py writes one per original instruction) is one
instruction. For every one, the original bytes run under Unicorn (a 386 in real mode) and the
translated case runs on the port's Cpu (src/cpu/machine.ts, through tools/qa-instruction-diff-run.ts),
from the same randomized machine states: the registers, the flags, and all memory filled with random
bytes, so whatever the instruction reads is the same on both sides. The results are compared on

  - the registers AX BX CX DX SI DI BP SP DS ES SS,
  - the flags the Cpu models: CF PF ZF SF OF DF (AF, IF and TF are not modelled),
  - every byte either side wrote, and every port write,
  - where execution goes next: the next instruction, a jump, call or return target, an interrupt.

Not compared: flags the instruction leaves undefined (after MUL, DIV, AND and the like; Intel's
tables), and states where the original raises a divide error (the game would stop there) or a word
access straddles a segment end (an 8086 wraps inside the segment, Unicorn's 386 does not).

A difference only in flags that no later instruction of the procedure reads before overwriting them is
listed as dead and does not fail the check. Liveness takes the flags after a call to be the callee's
(compiled Pascal never passes flags into a call or reads them across one); a return, an interrupt or a
jump out of the procedure counts as reading every flag.
Differences the generator makes on purpose (render_proc in tools/tp_translate.py) are listed as
named deviations. Anything else is a mismatch, and the check fails while any is left or any
translated instruction could not be run.

Needs Python with capstone and unicorn (POR_PYTHON on Battleaxe: ~/por-venv), and node with tsx.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import random
import re
import struct
import subprocess
import sys
import time
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import tp_translate as tp  # noqa: E402
from capstone import CS_ARCH_X86, CS_MODE_16, Cs  # noqa: E402

CF, PF, AF, ZF, SF, DF, OF = 0x1, 0x4, 0x10, 0x40, 0x80, 0x400, 0x800
ARITH = CF | PF | AF | ZF | SF | OF
ALL = ARITH | DF
MODELLED = CF | PF | ZF | SF | OF | DF
FLAG_NAMES = [(CF, "CF"), (PF, "PF"), (ZF, "ZF"), (SF, "SF"), (OF, "OF"), (DF, "DF")]
REGS = ["ax", "bx", "cx", "dx", "si", "di", "bp", "sp", "ds", "es", "ss"]
# A state is 14 words: the registers above, then CS, FLAGS and the byte an IN instruction reads.
STATE_WORDS = 14
I_CS, I_FLAGS, I_PORT = 11, 12, 13
MEMORY = 0x100000
REG16 = tp.REG16
REG8 = tp.REG8
EDGES = (0, 1, 2, 0x7F, 0x80, 0xFF, 0x100, 0x7FFF, 0x8000, 0x8001, 0xFFFE, 0xFFFF)
JCC_READS = {
    "jo": OF, "jno": OF, "jb": CF, "jae": CF, "je": ZF, "jne": ZF, "jbe": CF | ZF, "ja": CF | ZF,
    "js": SF, "jns": SF, "jp": PF, "jnp": PF, "jl": SF | OF, "jge": SF | OF, "jle": ZF | SF | OF,
    "jg": ZF | SF | OF, "jcxz": 0, "loop": 0, "loope": ZF, "loopne": ZF,
}
STRING = {"movsb", "movsw", "stosb", "stosw", "lodsb", "lodsw", "cmpsb", "cmpsw", "scasb", "scasw"}
CASE = re.compile(r"^      case 0x([0-9a-f]+): \{$")
FUNCTION = re.compile(r"^export function (\w+)\(")
REDIRECT = re.compile(r"^near\.set\(0x([0-9a-f]+), m => \{ (m\.tick\(0x[0-9a-f]+\); nearCall\(m, 0x[0-9a-f]+\);) \}\);$")
COMMENT = re.compile(r"^        // ([0-9a-f]+): (.*)$")


def split(mnemonic: str) -> tuple[str | None, str]:
    """(rep prefix or None, the instruction's own mnemonic)."""
    words = mnemonic.split()
    rep = words[0] if len(words) > 1 and words[0].startswith("rep") else None
    base = words[-1]
    return rep, {"cwde": "cbw", "cdq": "cwd"}.get(base, base)


def operands(op_str: str) -> list[str]:
    return [part.strip() for part in op_str.split(",")] if op_str else []


def width_of(part: str) -> int:
    return 8 if part in REG8 or "byte ptr" in part else 16


def immediate(text: str) -> int | None:
    try:
        return tp.num(text) & 0xFFFF
    except ValueError:
        return None


# ---------------------------------------------------------------------------------------------
# The program and its translation


def load_program(game_dir: Path, version: str) -> tuple[dict, dict[str, bytes], str]:
    profile = tp.PROFILES[version]
    candidates = [game_dir, *sorted(p for p in game_dir.iterdir() if p.is_dir())] if game_dir.is_dir() else []
    for candidate in candidates:
        files = {path.name.upper(): path for path in candidate.iterdir() if path.is_file()}
        if {"START.EXE", "GAME.OVR"} <= files.keys():
            exe, ovr = files["START.EXE"].read_bytes(), files["GAME.OVR"].read_bytes()
            break
    else:
        raise SystemExit(f"START.EXE and GAME.OVR were not found under {game_dir}")
    if exe[:2] != b"MZ" or ovr[:4] != profile["overlay_magic"]:
        raise SystemExit(f"{game_dir} does not hold version {version} (expected MZ and {profile['overlay_magic'].decode()})")
    tp.EXE, tp.OVR, tp.PROFILE = exe, ovr, profile
    if b"Packed file is corrupt" in exe:
        import exepack

        image = bytes(exepack.unpack(exe)[0])
        slices = tp.stubs(image)
    else:
        image = exe[struct.unpack_from("<H", exe, 8)[0] * 16:]
        slices = tp.stubs()
    blobs = {"exe": image}
    for s in slices:
        blobs[f"ovl{s['index']:02d}"] = ovr[s["off"]: s["off"] + s["code"]]
    if profile["system"]:
        segment, _ = profile["system"]
        blobs["system5bb"] = image[segment * 16: segment * 16 + 0x8000]
    digest = hashlib.sha256(exe + ovr).hexdigest()
    return profile, blobs, digest


def parse_translation(directory: Path) -> list[dict]:
    """Every case of every generated procedure, and every entry emitted as a single jump."""
    cases: list[dict] = []
    for path in sorted(directory.glob("*.ts")):
        unit = path.stem
        if unit == "register":
            continue
        function = None
        current: dict | None = None
        for line in path.read_text().splitlines():
            if current is not None:
                if line == "      }":
                    comment = COMMENT.match(current["lines"][0]) if current["lines"] else None
                    current["text"] = comment.group(2).strip() if comment else None
                    current["body"] = "\n".join(current.pop("lines"))
                    cases.append(current)
                    current = None
                else:
                    current["lines"].append(line)
                continue
            if found := FUNCTION.match(line):
                function = found.group(1)
            elif (found := CASE.match(line)) and function:
                current = {"unit": unit, "fn": function, "addr": int(found.group(1), 16), "lines": []}
            elif found := REDIRECT.match(line):
                addr = int(found.group(1), 16)
                cases.append({"unit": unit, "fn": f"jump_{addr:05x}", "addr": addr, "text": None, "body": found.group(2)})
    return cases


# ---------------------------------------------------------------------------------------------
# Flags: which ones an instruction leaves undefined, reads and writes


def undefined_flags(base: str, parts: list[str], state: list[int]) -> int:
    if base in ("mul", "imul"):
        return SF | ZF | PF | AF
    if base in ("div", "idiv"):
        return ALL & ~DF
    if base in ("and", "or", "xor", "test"):
        return AF
    if base in ("aaa", "aas"):
        return OF | SF | ZF | PF
    if base in ("daa", "das"):
        return OF
    if base in ("shl", "sal", "shr", "sar", "rol", "ror", "rcl", "rcr") and len(parts) == 2:
        count = (state[2] & 0xFF if parts[1] == "cl" else immediate(parts[1]) or 0) & 31
        if count == 0:
            return 0
        if base in ("rol", "ror", "rcl", "rcr"):
            return 0 if count == 1 else OF
        undefined = AF | (OF if count > 1 else 0)
        if base in ("shl", "sal", "shr") and count >= width_of(parts[0]):
            undefined |= CF
        return undefined
    return 0


def effects(insn) -> tuple[int, int]:
    """(flags read, flags written) by one original instruction, for the liveness pass."""
    rep, base = split(insn.mnemonic)
    parts = operands(insn.op_str)
    if base in JCC_READS:
        return JCC_READS[base], 0
    if base in ("call", "lcall"):
        # The flags after a call are the callee's (and a callee does not read the caller's).
        return 0, ALL
    if base in ("add", "sub", "cmp", "neg", "and", "or", "xor", "test", "mul", "imul", "div", "idiv"):
        return 0, ARITH
    if base in ("adc", "sbb"):
        return CF, ARITH
    if base in ("inc", "dec"):
        return 0, ARITH & ~CF
    if base in ("shl", "sal", "shr", "sar", "rol", "ror", "rcl", "rcr"):
        reads = CF if base in ("rcl", "rcr") else 0
        # A count in CL may be zero, which writes nothing.
        if len(parts) == 2 and parts[1] != "cl":
            return reads, ARITH if base in ("shl", "sal", "shr", "sar") else CF | OF
        return reads, 0
    if base == "cmc":
        return CF, CF
    if base in ("clc", "stc"):
        return 0, CF
    if base in ("cld", "std"):
        return 0, DF
    if base in STRING:
        return DF, ARITH if base[:4] in ("cmps", "scas") and not rep else 0
    if base == "pushf":
        return ALL, 0
    if base == "popf":
        return 0, ALL
    if base == "sahf":
        return 0, CF | PF | AF | ZF | SF
    if base == "lahf":
        return CF | PF | AF | ZF | SF, 0
    if base in ("aaa", "aas", "daa", "das"):
        return AF | CF, ARITH
    if base in ("int", "into"):
        return ALL, 0
    return 0, 0


def successors(insn) -> list[int] | None:
    """Addresses that can run next inside the procedure. None: execution leaves it."""
    _, base = split(insn.mnemonic)
    nxt = insn.address + insn.size
    if base in ("ret", "retf", "iret", "hlt", "ljmp"):
        return None
    target = immediate(insn.op_str) if insn.op_str else None
    if base == "jmp":
        return [target] if target is not None and insn.op_str.startswith("0x") else None
    if base in JCC_READS:
        return [target, nxt]
    return [nxt]


def liveness(instructions: dict[int, object]) -> dict[int, int]:
    """Flags live after each instruction: read on some path before being overwritten."""
    flow = {}
    for address, insn in instructions.items():
        reads, writes = effects(insn)
        flow[address] = (reads, writes, successors(insn))
    live_in = {address: 0 for address in instructions}
    live_out = {address: 0 for address in instructions}
    changed = True
    while changed:
        changed = False
        for address in sorted(instructions, reverse=True):
            reads, writes, succ = flow[address]
            out = ALL if succ is None else 0
            for s in succ or []:
                out |= live_in[s] if s in live_in else ALL
            inn = reads | (out & ~writes)
            if out != live_out[address] or inn != live_in[address]:
                live_out[address], live_in[address] = out, inn
                changed = True
    return live_out


# ---------------------------------------------------------------------------------------------
# Random machine states


def word(rng: random.Random) -> int:
    return rng.choice(EDGES) if rng.random() < 0.25 else rng.getrandbits(16)


def segment(rng: random.Random) -> int:
    # Below F000 so that no access passes the end of the first megabyte.
    return rng.randrange(0x40, 0xF000)


def register_value(name: str, state: list[int]) -> int | None:
    if name in REG16:
        return state[REGS.index(name)]
    if name in REG8:
        full = state[REGS.index(name[0] + "x")]
        return full >> 8 if name[1] == "h" else full & 0xFF
    return None


def make_states(case: dict, trials: int, seed: int) -> list[list[int]]:
    rng = random.Random(f"{seed}:{case['unit']}:{case['addr']:x}")
    rep, base, parts = case["rep"], case["base"], case["parts"]
    states = []
    for trial in range(trials):
        state = [word(rng) for _ in range(8)] + [segment(rng) for _ in range(3)]
        # Resident code runs at CS 0, where the image offset the translation uses is the IP.
        flags = 2
        for bit in (CF, PF, AF, ZF, SF, DF, OF):
            if rng.random() < 0.5:
                flags |= bit
        state += [0 if case["unit"] == "exe" else segment(rng), flags, rng.getrandbits(8)]
        cx = REGS.index("cx")
        if rep and base in STRING:
            state[cx] = 0 if rng.random() < 0.125 else rng.randrange(1, 33)
        elif base in ("loop", "loope", "loopne", "jcxz") and trial % 4 == 0:
            state[cx] = (trial // 4) % 3
        elif len(parts) == 2 and parts[1] == "cl" and trial % 2 == 0:
            state[cx] = (state[cx] & 0xFF00) | rng.randrange(0, 18)
        if base in ("div", "idiv") and parts:
            mode = trial % 3
            wide = width_of(parts[0]) == 16
            ax, dx = REGS.index("ax"), REGS.index("dx")
            low = state[ax] if wide else state[ax] & 0xFF
            sign = (low & (0x8000 if wide else 0x80)) != 0
            high = None
            if base == "idiv" and mode < 2:
                high = (0xFFFF if wide else 0xFF) if sign else 0
            elif base == "div" and mode == 0:
                high = 0
            elif base == "div" and mode == 1 and parts[0] not in ("dx", "dl", "dh", "ah", "al", "ax"):
                divisor = register_value(parts[0], state)
                high = rng.randrange(divisor) if divisor else 0
            if high is not None and wide:
                state[dx] = high
            elif high is not None:
                state[ax] = (high << 8) | low
        states.append(state)
    return states


# ---------------------------------------------------------------------------------------------
# The original under Unicorn, and the comparison (one worker per chunk of instructions)


def check_chunk(job: tuple) -> list[dict]:
    from unicorn import (UC_ARCH_X86, UC_HOOK_CODE, UC_HOOK_INSN, UC_HOOK_INTR, UC_HOOK_MEM_WRITE,
                         UC_MODE_16, Uc, UcError)
    from unicorn import x86_const as x

    index, cases, trials, work, first = job
    with open(work / "states.bin", "rb") as handle:
        handle.seek(first * trials * STATE_WORDS * 2)
        raw = handle.read(len(cases) * trials * STATE_WORDS * 2)
    words = struct.unpack(f"<{len(cases) * trials * STATE_WORDS}H", raw)
    translated = [json.loads(line) for line in (work / f"translated-{index}.jsonl").read_text().splitlines()]
    if len(translated) != len(cases):
        raise SystemExit(f"chunk {index}: {len(translated)} translated results for {len(cases)} instructions")

    unicorn_regs = [getattr(x, f"UC_X86_REG_{name.upper()}") for name in REGS]
    ctx = {"start": 0, "count": 0, "again": False, "intr": None, "writes": set(), "outs": [], "port": 0}

    def on_code(u, address, _size, c):
        # Stop at the first instruction after this one. Execution comes back to the start for each
        # repetition of a REP instruction, and when a store into the instruction's own translated block
        # makes QEMU restart it. An instruction that can jump to itself stops there instead.
        if address == c["start"] and (c["count"] == 0 or c["again"]) and c["count"] < 100000:
            c["count"] += 1
            return
        u.emu_stop()

    def on_intr(u, intno, c):
        c["intr"] = intno
        u.emu_stop()

    def on_write(_u, _access, address, size, _value, c):
        c["writes"].update(range(address, address + size))

    def on_in(_u, _port, _size, c):
        return c["port"]

    def on_out(_u, port, _size, value, c):
        c["outs"].append([port & 0xFFFF, value & 0xFF])

    def machine(pattern: bytes):
        # Unicorn hands a fault to the hook but never clears QEMU's record of it, so the next fault
        # would arrive as a double fault and the one after that not at all. A fresh machine follows each.
        uc = Uc(UC_ARCH_X86, UC_MODE_16)
        uc.mem_map(0, MEMORY + 0x10000)
        uc.mem_write(0, pattern)
        uc.hook_add(UC_HOOK_CODE, on_code, ctx)
        uc.hook_add(UC_HOOK_INTR, on_intr, ctx)
        uc.hook_add(UC_HOOK_MEM_WRITE, on_write, ctx)
        uc.hook_add(UC_HOOK_INSN, on_in, ctx, 1, 0, x.UC_X86_INS_IN)
        uc.hook_add(UC_HOOK_INSN, on_out, ctx, 1, 0, x.UC_X86_INS_OUT)
        return uc

    summaries = [{"trials": 0, "compared": 0, "wrap": 0, "fault": 0, "mismatch": 0, "dead": 0,
                  "first": None, "deadFlags": 0, "errors": []} for _ in cases]
    with open(work / "patterns.bin", "rb") as handle:
        for trial in range(trials):
            handle.seek(trial * MEMORY)
            pattern = handle.read(MEMORY)
            uc = machine(pattern)
            for i, case in enumerate(cases):
                state = list(words[(i * trials + trial) * STATE_WORDS:(i * trials + trial + 1) * STATE_WORDS])
                summary = summaries[i]
                summary["trials"] += 1
                code = bytes.fromhex(case["code"])
                cs, ip = state[I_CS], case["addr"] & 0xFFFF
                start = (cs << 4) + ip
                uc.mem_write(start, code)
                uc.ctl_remove_cache(start, start + len(code))
                for register, value in zip(unicorn_regs, state):
                    uc.reg_write(register, value)
                uc.reg_write(x.UC_X86_REG_CS, cs)
                uc.reg_write(x.UC_X86_REG_IP, ip)
                uc.reg_write(x.UC_X86_REG_EFLAGS, state[I_FLAGS])
                ctx.update(start=start, count=0, again=not case["self"], intr=None, writes=set(), outs=[],
                           port=state[I_PORT])
                error = None
                try:
                    uc.emu_start(start, MEMORY + 0xFFFF)
                except UcError as failure:
                    error = str(failure)
                after = [uc.reg_read(register) & 0xFFFF for register in unicorn_regs]
                flags = uc.reg_read(x.UC_X86_REG_EFLAGS) & 0xFFFF
                if ctx["intr"] is not None and case["base"] in ("div", "idiv"):
                    where = ["fault"]
                elif ctx["intr"] is not None:
                    where = ["int", ctx["intr"]]
                else:
                    where = ["at", uc.reg_read(x.UC_X86_REG_CS) & 0xFFFF, uc.reg_read(x.UC_X86_REG_IP) & 0xFFFF]
                written = sorted(ctx["writes"])
                final = {}
                if written:
                    low, high = written[0], written[-1] + 1
                    block = uc.mem_read(low, high - low)
                    final = {a: block[a - low] for a in written}
                # Put memory back as the pattern had it.
                for a in written:
                    uc.mem_write(a, pattern[a:a + 1] if a < MEMORY else b"\0")
                uc.mem_write(start, pattern[start:start + len(code)])
                if ctx["intr"] is not None and case["base"] != "int":
                    uc = machine(pattern)
                original = {"regs": after, "flags": flags, "where": where, "writes": final, "outs": ctx["outs"],
                            "error": error}
                compare(case, state, original, translated[i]["t"][trial], pattern, code, start, summary)
    return summaries


def baseline(address: int, pattern: bytes, code: bytes, start: int) -> int:
    if start <= address < start + len(code):
        return code[address - start]
    return pattern[address] if address < MEMORY else 0


def compare(case: dict, state: list[int], original: dict, translated: list, pattern: bytes, code: bytes,
            start: int, summary: dict) -> None:
    regs, flags, kind, a, b, writes, outs, wrap, error = translated
    if error or original["error"]:
        if len(summary["errors"]) < 3:
            summary["errors"].append({"translated": error, "original": original["error"]})
        return
    if wrap:
        summary["wrap"] += 1
        return
    if original["where"] == ["fault"]:
        # The original stops with a divide error here; the game would not go on.
        summary["fault"] += 1
        return
    cs0 = state[I_CS]
    where = {
        "ip": ["at", cs0, a & 0xFFFF],
        "near": ["at", cs0, a & 0xFFFF],
        "ret": ["at", cs0, a & 0xFFFF],
        "far": ["at", a & 0xFFFF, b & 0xFFFF],
        "retf": ["at", a & 0xFFFF, b & 0xFFFF],
        "int": ["int", a],
        "fault": ["fault"],
        "halt": ["halt"],
    }.get(kind, [kind])
    summary["compared"] += 1
    base = case["base"]
    differences = {}
    if where != original["where"]:
        differences["next"] = [original["where"], where]
    for name, mine, theirs in zip(REGS, original["regs"], regs):
        mask = 0xEFFF if base == "lahf" and name == "ax" else 0xFFFF
        if (mine ^ theirs) & mask:
            differences[name] = [mine, theirs]
    flag_mask = MODELLED & ~undefined_flags(base, case["parts"], state)
    flag_difference = (original["flags"] ^ flags) & flag_mask
    if flag_difference:
        differences["flags"] = [original["flags"] & flag_mask, flags & flag_mask]
    mine_written = original["writes"]
    theirs_written = {int(address): value for address, value in writes}
    pushed = ((original["regs"][REGS.index("ss")] << 4) + original["regs"][REGS.index("sp")]) if base == "pushf" else -1
    for address in sorted(set(mine_written) | set(theirs_written)):
        mine = mine_written.get(address, baseline(address, pattern, code, start))
        theirs = theirs_written.get(address, baseline(address, pattern, code, start))
        mask = 0xEF if address == pushed else 0xFF  # AF is not modelled
        if (mine ^ theirs) & mask:
            differences.setdefault("memory", []).append([address, mine, theirs])
    if [list(o) for o in original["outs"]] != [list(o) for o in outs]:
        differences["ports"] = [original["outs"], outs]
    if not differences:
        return
    if set(differences) == {"flags"} and not (flag_difference & case["live"]):
        summary["dead"] += 1
        summary["deadFlags"] |= flag_difference
        return
    summary["mismatch"] += 1
    if summary["first"] is None:
        if "memory" in differences:
            differences["memory"] = differences["memory"][:8]
        summary["first"] = {"state": state, "differences": differences}


# ---------------------------------------------------------------------------------------------


def hex_word(value: int) -> str:
    return f"0x{value:04x}"


def describe(differences: dict) -> str:
    out = []
    for field, value in differences.items():
        if field == "flags":
            mine, theirs = value
            names = [name for bit, name in FLAG_NAMES if (mine ^ theirs) & bit]
            out.append("flags " + " ".join(f"{n} {int(bool(mine & b))}/{int(bool(theirs & b))}"
                                           for b, n in FLAG_NAMES if n in names))
        elif field == "memory":
            out.append("memory " + " ".join(f"{a:05x} {m:02x}/{t:02x}" for a, m, t in value[:4]))
        elif field == "next":
            out.append(f"next {fmt_where(value[0])}/{fmt_where(value[1])}")
        elif field == "ports":
            out.append(f"ports {value[0]}/{value[1]}")
        else:
            out.append(f"{field} {hex_word(value[0])}/{hex_word(value[1])}")
    return "; ".join(out)


def fmt_where(where: list) -> str:
    if where[0] == "at":
        return f"{where[1]:04x}:{where[2]:04x}"
    return " ".join(str(w) for w in where)


def fmt_state(state: list[int]) -> str:
    names = REGS + ["cs", "flags", "in"]
    return " ".join(f"{n}={v:04x}" for n, v in zip(names, state))


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("game_dir", nargs="?", type=Path, help="directory holding START.EXE and GAME.OVR")
    parser.add_argument("--game-version", choices=sorted(tp.PROFILES), default="1.3")
    parser.add_argument("--translation", type=Path, help="generated TypeScript (default src/translated-1.3 or src/translated)")
    parser.add_argument("--trials", type=int, default=16, help="random machine states per instruction (default 16)")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--jobs", type=int, default=min(8, os.cpu_count() or 1))
    parser.add_argument("--work", type=Path, default=ROOT / "out" / "qa-instruction-diff")
    parser.add_argument("--report", type=Path, help="JSON report (default <work>/report-<version>.json)")
    parser.add_argument("--node", default=os.environ.get("POR_NODE", "node"))
    parser.add_argument("--only", help="check only this unit (exe, ovl03, ...)")
    parser.add_argument("--list", type=int, default=40, help="mismatches to print (default 40)")
    args = parser.parse_args()
    version = args.game_version
    default_dir = (os.environ.get("POR_GAMEDATA_1_3") or "../por-assets/gog-1.3/POOLRAD") if version == "1.3" \
        else (os.environ.get("POR_GAMEDATA") or str(ROOT / "gamedata"))
    game_dir = (args.game_dir or Path(default_dir)).resolve()
    translation = (args.translation or ROOT / "src" / tp.PROFILES[version]["directory"]).resolve()
    started = time.time()

    profile, blobs, digest = load_program(game_dir, version)
    named = {("exe", profile["crt_delay_dec_dx"]):
             "Crt.Delay's DEC DX leaves the flags alone so a delay ends after one pass (render_proc)"}
    if (load := profile.get("crt_delay_count_load")) is not None:
        named[("exe", load)] = "Crt.Delay loads a count of one (render_proc)"
    if branch := profile.get("code_wheel_branch"):
        named[(f"ovl{branch[0]:02d}", branch[1])] = \
            "GOG's NOPs over the code-wheel rejection; the earlier release's jump, gated by enforceCodeWheel (render_proc)"

    md = Cs(CS_ARCH_X86, CS_MODE_16)
    parsed = parse_translation(translation)
    if args.only:
        parsed = [case for case in parsed if case["unit"] == args.only]
    # One check per distinct case. The same instruction emitted by two procedures is checked once.
    unique: dict[tuple, dict] = {}
    for case in parsed:
        key = (case["unit"], case["addr"], case["body"])
        if key in unique:
            unique[key]["procedures"].append(case["fn"])
        else:
            unique[key] = {**case, "procedures": [case["fn"]]}
    cases = list(unique.values())

    unchecked: list[dict] = []
    decoded: list[dict] = []
    by_procedure: dict[tuple, dict[int, object]] = {}
    for case in cases:
        blob = blobs.get(case["unit"])
        insn = next(md.disasm(blob[case["addr"]:case["addr"] + 16], case["addr"], count=1), None) if blob else None
        if insn is None:
            unchecked.append({**case, "reason": "no original bytes decode at this address"})
            continue
        text = f"{insn.mnemonic} {insn.op_str}".strip()
        case["original"] = text
        case["decodedDifferently"] = case["text"] is not None and case["text"] != text
        case["code"] = bytes(blob[case["addr"]:case["addr"] + insn.size]).hex()
        case["rep"], case["base"] = split(insn.mnemonic)
        case["parts"] = operands(insn.op_str)
        target = immediate(insn.op_str) if insn.op_str.startswith("0x") else None
        case["self"] = case["base"] in (*JCC_READS, "jmp", "call") and target == case["addr"] & 0xFFFF
        case["named"] = named.get((case["unit"], case["addr"]))
        decoded.append(case)
        for fn in case["procedures"]:
            by_procedure.setdefault((case["unit"], fn), {})[case["addr"]] = insn
    live = {key: liveness(instructions) for key, instructions in by_procedure.items()}
    for case in decoded:
        case["live"] = 0
        for fn in case["procedures"]:
            case["live"] |= live[(case["unit"], fn)].get(case["addr"], ALL)

    work = args.work.resolve()
    work.mkdir(parents=True, exist_ok=True)
    print(f"qa-instruction-diff {version}: {len(parsed)} translated instructions in {translation.relative_to(ROOT) if translation.is_relative_to(ROOT) else translation}, "
          f"{len(decoded)} distinct; {args.trials} states each", flush=True)
    with open(work / "patterns.bin", "wb") as handle:
        for trial in range(args.trials):
            handle.write(random.Random(args.seed * 7919 + trial).randbytes(MEMORY))
    chunk = max(1, (len(decoded) + args.jobs * 4 - 1) // (args.jobs * 4))
    with open(work / "states.bin", "wb") as states, open(work / "cases.jsonl", "w") as specs:
        for number, case in enumerate(decoded):
            case["id"] = number
            for state in make_states(case, args.trials, args.seed):
                states.write(struct.pack(f"<{STATE_WORDS}H", *state))
            specs.write(json.dumps({"id": number, "chunk": number // chunk, "unit": case["unit"], "addr": case["addr"],
                                    "code": case["code"], "body": case["body"]}) + "\n")
    print(f"  states written in {time.time() - started:.0f} s; running the translated cases", flush=True)

    run = subprocess.run([args.node, "--import", "tsx", "tools/qa-instruction-diff-run.ts", str(work), str(args.trials)],
                         cwd=ROOT, text=True, capture_output=True)
    if run.returncode != 0:
        raise SystemExit(f"the translated side failed:\n{run.stdout}\n{run.stderr}")
    print(f"  {run.stdout.strip()}; running the original under Unicorn", flush=True)

    chunks = [decoded[i:i + chunk] for i in range(0, len(decoded), chunk)]
    jobs = [(index, [{k: c[k] for k in ("unit", "addr", "code", "rep", "base", "parts", "live", "self")} for c in part],
             args.trials, work, index * chunk) for index, part in enumerate(chunks)]
    summaries: list[dict] = []
    with Pool(args.jobs) as pool:
        for done, result in enumerate(pool.imap(check_chunk, jobs), 1):
            summaries.extend(result)
            print(f"  chunk {done}/{len(jobs)}", flush=True)

    mismatches, deviations, dead, errors = [], [], [], []
    wrap = fault = 0
    for case, summary in zip(decoded, summaries):
        wrap += summary["wrap"]
        fault += summary["fault"]
        entry = {"unit": case["unit"], "procedures": case["procedures"], "address": f"0x{case['addr']:x}",
                 "translatedAs": case["text"], "original": case["original"], "trials": summary["trials"],
                 "compared": summary["compared"], "differing": summary["mismatch"]}
        if summary["errors"] or summary["compared"] == 0:
            errors.append({**entry, "errors": summary["errors"],
                           "reason": "did not run" if summary["errors"] else "every state was excluded"})
            continue
        if case["named"]:
            deviations.append({**entry, "why": case["named"], "differs": bool(summary["mismatch"] or case["decodedDifferently"]),
                               "first": summary["first"]})
            continue
        if summary["mismatch"] or case["decodedDifferently"]:
            mismatches.append({**entry, "decodedDifferently": case["decodedDifferently"], "first": summary["first"]})
        elif summary["dead"]:
            dead.append({**entry, "flags": [n for b, n in FLAG_NAMES if summary["deadFlags"] & b], "states": summary["dead"]})
    for case in unchecked:
        errors.append({"unit": case["unit"], "procedures": case["procedures"], "address": f"0x{case['addr']:x}",
                       "translatedAs": case["text"], "reason": case["reason"]})

    checked = len(decoded) - len([e for e in errors if "errors" in e])
    total = len(cases)
    procedures = sorted({(m["unit"], p) for m in mismatches for p in m["procedures"]})
    by_kind: dict[str, int] = {}
    for m in mismatches:
        key = m["original"].split()[0] if not m["original"].startswith("rep") else " ".join(m["original"].split()[:2])
        by_kind[key] = by_kind.get(key, 0) + 1
    dead_kinds: dict[str, int] = {}
    for d in dead:
        key = f"{d['original'].split()[0]} {','.join(d['flags'])}"
        dead_kinds[key] = dead_kinds.get(key, 0) + 1

    print()
    print(f"instructions checked: {checked} / {total} ({args.trials} random states each; "
          f"{wrap} states excluded for a word straddling a segment end, {fault} where the original raises a divide error)")
    print(f"mismatches: {len(mismatches)} instructions in {len(procedures)} procedures"
          + (f" ({', '.join(f'{k} {v}' for k, v in sorted(by_kind.items(), key=lambda kv: -kv[1]))})" if by_kind else ""))
    for m in mismatches[:args.list]:
        first = m["first"]
        detail = describe(first["differences"]) if first else "decoded differently"
        print(f"  {m['unit']} {'/'.join(m['procedures'])} {m['address']}: {m['original']}"
              + (f" (translated as `{m['translatedAs']}`)" if m["decodedDifferently"] else "")
              + f": {detail} [original/translated] in {m['differing']} of {m['compared']} states")
        if first:
            print(f"      state {fmt_state(first['state'])}")
    if len(mismatches) > args.list:
        print(f"  ... {len(mismatches) - args.list} more in the report")
    print(f"named deviations: {len(deviations)}")
    for d in deviations:
        print(f"  {d['unit']} {'/'.join(d['procedures'])} {d['address']}: {d['original']}: "
              + (describe(d["first"]["differences"]) if d["first"] else "decoded differently" if d["differs"] else "no difference seen")
              + f" ({d['why']})")
    print(f"dead flag differences (no later instruction reads them): {len(dead)} instructions"
          + (f" ({', '.join(f'{k} {v}' for k, v in sorted(dead_kinds.items(), key=lambda kv: -kv[1]))})" if dead_kinds else ""))
    print(f"not checked: {len(errors)}")
    for e in errors[:args.list]:
        print(f"  {e['unit']} {'/'.join(e['procedures'])} {e['address']}: {e.get('translatedAs')}: {e['reason']} {e.get('errors', '')}")

    report = args.report or work / f"report-{version}.json"
    report.write_text(json.dumps({
        "schema": 1,
        "gameVersion": version,
        "programSha256": digest,
        "translation": str(translation),
        "trials": args.trials,
        "seed": args.seed,
        "total": total,
        "checked": checked,
        "excludedStates": {"segmentWrap": wrap, "originalDivideError": fault},
        "mismatches": mismatches,
        "namedDeviations": deviations,
        "deadFlagDifferences": dead,
        "notChecked": errors,
        "seconds": round(time.time() - started),
    }, indent=1) + "\n")
    print(f"\nreport: {report} ({time.time() - started:.0f} s)")
    raise SystemExit(1 if mismatches or errors else 0)


if __name__ == "__main__":
    main()
