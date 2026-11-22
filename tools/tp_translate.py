#!/usr/bin/env python3
"""Mechanical translator: Turbo Pascal 8086 -> TypeScript.

Each instruction becomes one switch case. Control flow is the original
jump, call, and retf. DS offsets are left as the numbers in the binary.
"""

from __future__ import annotations

import argparse
import os
import struct
from pathlib import Path

from capstone import CS_ARCH_X86, CS_MODE_16, Cs

ROOT = Path(__file__).resolve().parents[1]
EXE: bytes
OVR: bytes
IMG: bytes

REG16 = {"ax", "cx", "dx", "bx", "sp", "bp", "si", "di"}
REG8 = {"al", "ah", "cl", "ch", "dl", "dh", "bl", "bh"}
SEG = {"es", "cs", "ss", "ds"}


def stubs(source: bytes | None = None) -> list[dict]:
    """Overlay stub segments. `source` is the file for an unpacked program, or the unpacked image."""
    source = EXE if source is None else source
    found = []
    seen = set()
    for i in range(len(source) - 32):
        if source[i : i + 2] != b"\xcd\x3f":
            continue
        memswap, fileoff, codesize, relsize, nentries, prev = struct.unpack_from("<HIHHHH", source, i + 2)
        if not (1 <= nentries <= 512 and 1 <= codesize <= 0xFFF0):
            continue
        if fileoff < 4 or fileoff + codesize + relsize > len(OVR):
            continue
        if fileoff in seen:
            continue
        seen.add(fileoff)
        found.append(
            {
                "index": len(found),
                "exe": i,
                "off": fileoff,
                "code": codesize,
                "rel": relsize,
                "n": nentries,
                "prev": prev,
            }
        )
    found.sort(key=lambda s: s["off"])
    for n, s in enumerate(found):
        s["index"] = n
    return found


def prologues(blob: bytes) -> list[int]:
    out = []
    i = 0
    while i < len(blob) - 2:
        if blob[i] == 0x55 and blob[i + 1] in (0x89, 0x8B) and blob[i + 2] == 0xE5:
            out.append(i)
            i += 3
        else:
            i += 1
    return out


# What differs between builds of the program. Each value was read from that build.
#   data_segment     The program's data segment. Resident code ends where it begins.
#   system_init      Image offset of the System unit's start-up code, the first call the entry makes.
#   crt_delay_dec_dx Image offset of `dec dx` in Crt.Delay. See render_proc.
#   ecl_loop         The script interpreter's loop and the dispatch routine it calls for each instruction.
#   intr             Turbo Pascal's Intr, which src/runtime/intr.ts stands in for.
#   system           Segment and offsets of System routines emitted on their own, if any.
PROFILES = {
    "1.0": {
        "directory": "translated", "overlay_magic": b"TPOV",
        "data_segment": 0x740, "system_init": 0x5BB0, "crt_delay_dec_dx": 0x53D8,
        "ecl_loop": ("ovl03_35db", 0x32DF), "intr": (0x504, 0xB),
        "system": (0x5BB, [0x0, 0xD1, 0x16B5, 0x1692, 0x634, 0x6C1, 0x64E, 0x1508, 0x364, 0xD8, 0xE3A, 0xD28]),
    },
    "1.3": {
        "directory": "translated-1.3", "overlay_magic": b"FBOV",
        "data_segment": 0xC7C, "system_init": 0xAF80, "crt_delay_dec_dx": 0xA6B7,
        # Image offset of `mov cx, [DelayCnt]` in Crt.Delay. See render_proc.
        "crt_delay_count_load": 0xA6B0,
        "ecl_loop": ("ovl03_3171", 0x2F2D), "intr": (0xA32, 0xB),
        "system": None,
        # MemAvail and MaxAvail load a routine's offset into BX and call through it. Each routine
        # is a loop entered at its test, so its code starts before its entry: entry -> first byte.
        "entries_inside": {0xB231: 0xB221, 0xB251: 0xB23D},
        # GOG disabled the code-wheel rejection by replacing this two-byte jump with NOPs.
        "code_wheel_branch": (2, 0x32C),
    },
}
PROFILE = PROFILES["1.0"]
SURVEY: list[str] | None = None
# With --data-map: one list per emitted unit of (address, size) for every instruction translated.
INSTRUCTIONS: list[list[tuple[int, int]]] | None = None
# Procedures whose entry is not their first byte: name -> entry address.
ENTRY_INSIDE: dict[str, int] = {}
# With --instruction-map: unit name -> emitted procedures and the byte ranges of their instructions.
INSTRUCTION_MAP: dict[str, list[dict]] | None = None
MAP_UNIT = ""


def byte_ranges(instructions: list) -> list[list[int]]:
    """Half-open byte ranges covered by decoded instructions, merged where they touch."""
    ranges: list[list[int]] = []
    for insn in sorted(instructions, key=lambda i: i.address):
        if ranges and insn.address <= ranges[-1][1]:
            ranges[-1][1] = max(ranges[-1][1], insn.address + insn.size)
        else:
            ranges.append([insn.address, insn.address + insn.size])
    return ranges

def library_prologues(blob: bytes) -> list[int]:
    """`push bp; mov bp, sp` as the assembler-written library units encode it (55 8B EC).

    Compiled Pascal uses 55 89 E5, which `prologues` finds. Library routines can fall
    through into one another, so these offsets start procedures but do not end them.
    """
    return [i for i in range(len(blob) - 2) if blob[i : i + 3] == b"\x55\x8b\xec"]


JUMPS = {
    "jmp", "je", "jne", "jb", "jae", "jbe", "ja", "jl", "jge", "jle", "jg",
    "js", "jns", "jo", "jno", "jp", "jnp", "jcxz", "loop", "loope", "loopne",
}


def cfg_insns(blob: bytes, start: int, end: int) -> list:
    """Instructions reachable from start. Jumps skip the bytes they jump over."""
    md = Cs(CS_ARCH_X86, CS_MODE_16)
    pending = [start]
    seen: set[int] = set()
    found = {}
    while pending:
        ip = pending.pop()
        if ip in seen or ip < start or ip >= end:
            continue
        for insn in md.disasm(bytes(blob[ip:end]), ip):
            if insn.address in seen:
                break
            seen.add(insn.address)
            found[insn.address] = insn
            nxt = insn.address + insn.size
            mn = "cbw" if insn.mnemonic == "cwde" else insn.mnemonic
            if mn in ("ret", "retf", "iret", "hlt") or (mn == "ljmp" and "[" in insn.op_str):
                break
            if mn in JUMPS:
                if insn.op_str.startswith("0x") or insn.op_str.lstrip("-").isdigit():
                    pending.append(num(insn.op_str) & 0xFFFF)
                if mn != "jmp":
                    pending.append(nxt)
                break
            if mn in ("call", "lcall", "int"):
                # Unit padding in START.EXE is a run of zero bytes after the last call.
                if blob[nxt : nxt + 4] != b"\x00\x00\x00\x00":
                    pending.append(nxt)
                break
    return [found[k] for k in sorted(found)]


def u16(n: int) -> str:
    return f"({n} & 0xffff)"


def num(text: str) -> int:
    text = text.strip()
    if text.startswith("0x") or text.startswith("-0x"):
        return int(text, 16)
    return int(text, 10)


def parse_mem(text: str) -> tuple[str, str]:
    """Return (segment expr, offset expr) for a memory operand."""
    import re

    seg = None
    body = text.strip()
    if ":" in body:
        seg, body = body.split(":", 1)
        seg = seg.strip()
    body = body.strip()
    if not (body.startswith("[") and body.endswith("]")):
        raise ValueError(f"not mem {text}")
    inner = body[1:-1].replace(" ", "")
    default = "m.ds"
    if seg == "es":
        default = "m.es"
    elif seg == "cs":
        default = "m.cs"
    elif seg == "ss":
        default = "m.ss"
    elif seg == "ds":
        default = "m.ds"
    terms: list[str] = []
    for part in re.findall(r"[+-]?[^+\-]+", inner):
        sign = 1
        if part[0] == "+":
            part = part[1:]
        elif part[0] == "-":
            sign = -1
            part = part[1:]
        if part in ("ax", "bx", "cx", "dx", "si", "di", "bp", "sp"):
            if part == "bp" and seg is None:
                default = "m.ss"
            terms.append(f"m.{part}" if sign == 1 else f"-m.{part}")
        else:
            terms.append(str(num(part) * sign))
    off = "(" + " + ".join(terms) + ") & 0xffff"
    return default, off


def imm(text: str) -> int:
    text = text.strip()
    if text.startswith("0x"):
        return int(text, 16)
    return int(text)


def emit_insn(insn, next_ip: int, proc_name: dict[int, str], falls: bool = True, present: set[int] | None = None) -> list[str]:
    mn = insn.mnemonic
    if mn == "cwde":
        mn = "cbw"
    op = insn.op_str
    ip = insn.address
    lines = [
        f"      case 0x{ip:x}: {{",
        f"        // {ip:04x}: {insn.mnemonic} {op}",
        f"        m.tick(0x{ip:x});",
    ]
    parts = [p.strip() for p in op.split(",")] if op else []

    def nxt(extra: str = "") -> None:
        lines.append(f"        {extra}".rstrip())
        lines.append(f"        ip = 0x{next_ip:x};")
        lines.append("        break;")
        lines.append("      }")

    if mn == "push" and "ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        width = "read8" if "byte" in parts[0] else "read16"
        nxt(f"m.push(m.{width}({seg}, {off}));")
    elif mn == "pop" and "ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.write16({seg}, {off}, m.pop());")
    elif mn == "push" and parts[0] in REG16 | SEG:
        src = "m.cs" if parts[0] == "cs" else f"m.{parts[0]}"
        nxt(f"m.push({src});")
    elif mn == "pop" and parts[0] in REG16 | SEG:
        nxt(f"m.{parts[0]} = m.pop();")
    elif mn == "mov" and parts[0] in REG16 and parts[1] in SEG:
        nxt(f"m.{parts[0]} = m.{parts[1]};")
    elif mn == "mov" and parts[0] in SEG and "ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.{parts[0]} = m.read16({seg}, {off});")
    elif mn == "mov" and parts[0] in SEG and parts[1] in REG16:
        nxt(f"m.{parts[0]} = m.{parts[1]};")
    elif mn == "mov" and parts[0] in SEG and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} = {imm(parts[1])} & 0xffff;")
    elif mn == "mov" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.{parts[0]} = m.{parts[1]};")
    elif mn == "mov" and parts[0] in REG8 and parts[1] in REG8:
        nxt(f"m.{parts[0]} = m.{parts[1]};")
    elif mn == "mov" and parts[0] in REG16 and parts[1].startswith("0x") or (mn == "mov" and parts[0] in REG16 and parts[1].isdigit()):
        nxt(f"m.{parts[0]} = {imm(parts[1])} & 0xffff;")
    elif mn == "mov" and parts[0] in REG8 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} = {imm(parts[1])} & 0xff;")
    elif mn == "mov" and parts[0] in REG8 and "ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.{parts[0]} = m.read8({seg}, {off});")
    elif mn == "mov" and parts[0] in REG16 and "ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.{parts[0]} = m.read16({seg}, {off});")
    elif mn == "mov" and "ptr" in parts[0] and parts[1] in REG8:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.write8({seg}, {off}, m.{parts[1]});")
    elif mn == "mov" and "ptr" in parts[0] and parts[1] in REG16:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.write16({seg}, {off}, m.{parts[1]});")
    elif mn == "mov" and "ptr" in parts[0] and (parts[1].startswith("0x") or parts[1].isdigit()):
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        width = "write8" if "byte" in parts[0] else "write16"
        nxt(f"m.{width}({seg}, {off}, {imm(parts[1])});")
    elif mn == "lea" and parts[0] in REG16:
        seg, off = parse_mem(parts[1] if parts[1].startswith("[") or ":" in parts[1] else parts[1])
        # lea di, [bp - 0x22] -> offset only
        nxt(f"m.{parts[0]} = {off};")
    elif mn == "xor" and parts[0] in REG16 | REG8 and parts[0] == parts[1]:
        width = 8 if parts[0] in REG8 else 16
        nxt(f"m.{parts[0]} = 0; m.setLogicFlags({width}, 0);")
    elif mn == "xor" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.{parts[0]} = (m.{parts[0]} ^ m.{parts[1]}) & 0xffff; m.setLogicFlags(16, m.{parts[0]});")
    elif mn == "add" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.{parts[0]} = m.setAddFlags(16, m.{parts[0]}, m.{parts[1]});")
    elif mn == "add" and parts[0] in REG16 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} = m.setAddFlags(16, m.{parts[0]}, {imm(parts[1])});")
    elif mn == "add" and parts[0] in ("di", "si", "ax", "bx", "cx", "dx") and "ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        width = 8 if "byte" in parts[1] else 16
        read = "read8" if width == 8 else "read16"
        nxt(f"m.{parts[0]} = m.setAddFlags({width}, m.{parts[0]}, m.{read}({seg}, {off}));")
    elif mn == "sub" and parts[0] == "sp" and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.sp = (m.sp - {imm(parts[1])}) & 0xffff;")
    elif mn == "sub" and parts[0] in REG16 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} = m.setSubFlags(16, m.{parts[0]}, {imm(parts[1])});")
    elif mn == "sub" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.{parts[0]} = m.setSubFlags(16, m.{parts[0]}, m.{parts[1]});")
    elif mn == "cmp" and parts[0] in REG8 and "byte ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.setSubFlags(8, m.{parts[0]}, m.read8({seg}, {off}));")
    elif mn == "cmp" and parts[0] in REG16 and "word ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.setSubFlags(16, m.{parts[0]}, m.read16({seg}, {off}));")
    elif mn == "cmp" and parts[0] in REG16 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.setSubFlags(16, m.{parts[0]}, {imm(parts[1])});")
    elif mn == "cmp" and parts[0] in REG8 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.setSubFlags(8, m.{parts[0]}, {imm(parts[1])});")
    elif mn == "cmp" and "word ptr" in parts[0] and (parts[1].startswith("0x") or parts[1].isdigit()):
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.setSubFlags(16, m.read16({seg}, {off}), {imm(parts[1])});")
    elif mn == "cmp" and "byte ptr" in parts[0] and (parts[1].startswith("0x") or parts[1].isdigit()):
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.setSubFlags(8, m.read8({seg}, {off}), {imm(parts[1])});")
    elif mn == "cmp" and parts[0] in REG8 and parts[1] in REG8:
        nxt(f"m.setSubFlags(8, m.{parts[0]}, m.{parts[1]});")
    elif mn == "shl" and parts[0] in REG16 and parts[1] == "1":
        nxt(
            f"{{ m.cf = (m.{parts[0]} & 0x8000) !== 0; m.{parts[0]} = (m.{parts[0]} << 1) & 0xffff; m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & 0x8000) !== 0; }}"
        )
    elif mn == "shl" and parts[0] in REG16 and parts[1] == "cl":
        nxt(
            f"{{ const n = m.cl & 31; if (n) {{ m.cf = ((m.{parts[0]} << (n - 1)) & 0x8000) !== 0; m.{parts[0]} = (m.{parts[0]} << n) & 0xffff; m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & 0x8000) !== 0; }} }}"
        )
    elif mn == "shr" and parts[0] in REG16 and parts[1] in ("1", "cl"):
        if parts[1] == "1":
            nxt(
                f"{{ m.cf = (m.{parts[0]} & 1) !== 0; m.{parts[0]} = (m.{parts[0]} >>> 1) & 0xffff; m.zf = m.{parts[0]} === 0; m.sf = false; }}"
            )
        else:
            nxt(
                f"{{ const n = m.cl & 31; if (n) {{ m.cf = ((m.{parts[0]} >>> (n - 1)) & 1) !== 0; m.{parts[0]} = (m.{parts[0]} >>> n) & 0xffff; m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & 0x8000) !== 0; }} }}"
            )
    elif mn == "and" and parts[0] in REG16 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} &= {imm(parts[1])}; m.setLogicFlags(16, m.{parts[0]});")
    elif mn == "or" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.{parts[0]} = (m.{parts[0]} | m.{parts[1]}) & 0xffff; m.setLogicFlags(16, m.{parts[0]});")
    elif mn == "or" and parts[0] in REG8 and parts[1] in REG8:
        nxt(f"m.{parts[0]} = m.{parts[0]} | m.{parts[1]}; m.setLogicFlags(8, m.{parts[0]});")
    elif mn == "or" and parts[0] in REG16 and "word ptr" in parts[1]:
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        nxt(f"m.{parts[0]} = (m.{parts[0]} | m.read16({seg}, {off})) & 0xffff; m.setLogicFlags(16, m.{parts[0]});")
    elif mn == "mov" and "ptr" in parts[0] and parts[1] in SEG:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(f"m.write16({seg}, {off}, m.{parts[1]});")
    elif mn == "sub" and "word ptr" in parts[0] and (
        parts[1].startswith("0x") or parts[1].lstrip("-").isdigit()
    ):
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read16({seg}, {off}); const r = m.setSubFlags(16, a, {imm(parts[1])}); m.write16({seg}, {off}, r); }}"
        )
    elif mn == "div" and parts[0] in REG8:
        # The remainder comes from the dividend, not from AX after AL holds the quotient.
        nxt(
            f"{{ const d = m.{parts[0]}; if (!d) throw new Error('div0'); const n = m.ax; m.al = Math.floor(n / d) & 0xff; m.ah = n % d; }}"
        )
    elif mn == "div" and parts[0] in REG16:
        # The dividend DX:AX is unsigned. `(m.dx << 16) | m.ax` is negative from 80000000h.
        nxt(
            f"{{ const d = m.{parts[0]}; if (!d) throw new Error('div0'); const n = m.dx * 0x10000 + m.ax; m.ax = Math.floor(n / d) & 0xffff; m.dx = n % d; }}"
        )
    elif mn == "and" and parts[0] in REG8 and (parts[1].startswith("0x") or parts[1].isdigit()):
        nxt(f"m.{parts[0]} &= {imm(parts[1])}; m.setLogicFlags(8, m.{parts[0]});")
    elif mn == "lds" and parts[0] in REG16:
        seg, off = parse_mem(parts[1].replace("ptr", "").strip())
        nxt(
            f"{{ const base = {off}; m.{parts[0]} = m.read16({seg}, base); m.ds = m.read16({seg}, (base + 2) & 0xffff); }}"
        )
    elif mn == "add" and "byte ptr" in parts[0] and parts[1] in REG8:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read8({seg}, {off}); m.write8({seg}, {off}, m.setAddFlags(8, a, m.{parts[1]})); }}"
        )
    elif mn == "not" and parts[0] in REG8:
        nxt(f"m.{parts[0]} = (~m.{parts[0]}) & 0xff;")
    elif mn == "cmp" and parts[0] in REG16 and parts[1] in REG16:
        nxt(f"m.setSubFlags(16, m.{parts[0]}, m.{parts[1]});")
    elif mn in (
        "jmp",
        "je",
        "jne",
        "jb",
        "jae",
        "jbe",
        "ja",
        "jl",
        "jge",
        "jle",
        "jg",
        "js",
        "jns",
        "jo",
        "jno",
        "jp",
        "jnp",
        "jcxz",
    ):
        target = imm(parts[0])
        cond = {
            "jmp": "true",
            "je": "m.zf",
            "jne": "!m.zf",
            "jb": "m.cf",
            "jae": "!m.cf",
            "jbe": "m.cf || m.zf",
            "ja": "!m.cf && !m.zf",
            "jl": "m.sf !== m.of",
            "jge": "m.sf === m.of",
            "jle": "m.zf || m.sf !== m.of",
            "jg": "!m.zf && m.sf === m.of",
            "js": "m.sf",
            "jns": "!m.sf",
            "jo": "m.of",
            "jno": "!m.of",
            "jp": "m.pf",
            "jnp": "!m.pf",
            "jcxz": "m.cx === 0",
        }[mn]
        # A jump into a shared tail (runtime error, Halt) is outside this switch.
        if present is not None and target not in present:
            lines.append(f"        if ({cond}) {{ nearCall(m, 0x{target:x}); return; }}")
            lines.append(f"        ip = 0x{next_ip:x};")
        else:
            lines.append(f"        ip = {cond} ? 0x{target:x} : 0x{next_ip:x};")
        lines.append("        break;")
        lines.append("      }")
    elif mn in ("loop", "loope", "loopne"):
        target = imm(parts[0])
        extra = {"loop": "true", "loope": "m.zf", "loopne": "!m.zf"}[mn]
        lines.append("        m.cx = (m.cx - 1) & 0xffff;")
        lines.append(f"        ip = m.cx !== 0 && ({extra}) ? 0x{target:x} : 0x{next_ip:x};")
        lines.append("        break;")
        lines.append("      }")
    elif mn == "call" and parts[0] in REG16:
        # A near call through a register. The register holds an offset in the current segment.
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        nearCall(m, NEAR_BASE + m.{parts[0]});")
        if falls:
            lines.append(f"        ip = 0x{next_ip:x};")
            lines.append("        break;")
        else:
            lines.append("        return;")
        lines.append("      }")
    elif mn == "iret":
        # An interrupt return pops the return address and then the flags.
        lines.append("        m.retf(0);")
        lines.append("        { const f = m.pop(); m.cf = (f & 1) !== 0; m.pf = (f & 4) !== 0; m.zf = (f & 0x40) !== 0; m.sf = (f & 0x80) !== 0; m.of = (f & 0x800) !== 0; }")
        lines.append("        return;")
        lines.append("      }")
    elif mn == "call":
        target = imm(parts[0])
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        nearCall(m, 0x{target:x});")
        if falls:
            lines.append(f"        ip = 0x{next_ip:x};")
            lines.append("        break;")
        else:
            lines.append("        return;")
        lines.append("      }")
    elif mn == "ret":
        n = imm(parts[0]) if parts else 0
        lines.append(f"        m.retn({n});")
        lines.append("        return;")
        lines.append("      }")
    elif mn == "int":
        lines.append(f"        m.intr({imm(parts[0])});")
        if falls:
            lines.append(f"        ip = 0x{next_ip:x};")
            lines.append("        break;")
        else:
            lines.append("        return;")
        lines.append("      }")
    elif mn == "lcall" and len(parts) == 1:
        seg, off = parse_mem(parts[0])
        lines.append(f"        {{ const base = {off}; const tgt = m.read16({seg}, base); const tseg = m.read16({seg}, (base + 2) & 0xffff);")
        lines.append(f"        m.push(m.cs);")
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        farCall(m, tseg, tgt); }}")
        if falls:
            lines.append(f"        ip = 0x{next_ip:x};")
            lines.append("        break;")
        else:
            lines.append("        return;")
        lines.append("      }")
    elif mn == "lcall":
        # "0x5bb, 0x16b5"
        seg = imm(parts[0])
        off = imm(parts[1])
        lines.append(f"        m.push(m.cs);")
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        farCall(m, 0x{seg:x}, 0x{off:x});")
        if falls:
            lines.append(f"        ip = 0x{next_ip:x};")
            lines.append("        break;")
        else:
            lines.append("        return;")
        lines.append("      }")
    elif mn == "ljmp" and len(parts) == 1 and "[" in parts[0]:
        # A far jump pushes nothing. The target's retf returns to this procedure's caller.
        seg, off = parse_mem(parts[0])
        lines.append(f"        {{ const base = {off}; const tgt = m.read16({seg}, base); const tseg = m.read16({seg}, (base + 2) & 0xffff);")
        lines.append(f"        farCall(m, tseg, tgt); }}")
        lines.append("        return;")
        lines.append("      }")
    elif mn == "retf":
        n = imm(parts[0]) if parts else 0
        lines.append(f"        m.retf({n});")
        lines.append("        return;")
        lines.append("      }")
    elif mn == "les" and parts[0] in REG16:
        seg, off = parse_mem(parts[1].replace("ptr", "").strip())
        nxt(
            f"{{ const base = {off}; m.{parts[0]} = m.read16({seg}, base); m.es = m.read16({seg}, (base + 2) & 0xffff); }}"
        )
    elif mn == "cbw":
        nxt("m.cbw();")
    elif mn == "cld":
        nxt("m.df = false;")
    elif mn == "std":
        nxt("m.df = true;")
    elif mn == "lodsb":
        src = "m.cs" if "cs:" in op else "m.es" if "es:" in op else "m.ss" if "ss:" in op else "m.ds"
        nxt(f"m.al = m.read8({src}, m.si); m.si = (m.si + (m.df ? -1 : 1)) & 0xffff;")
    elif mn == "stosb":
        nxt("m.write8(m.es, m.di, m.al); m.di = (m.di + (m.df ? -1 : 1)) & 0xffff;")
    elif mn == "stosw":
        nxt("m.write16(m.es, m.di, m.ax); m.di = (m.di + (m.df ? -2 : 2)) & 0xffff;")
    elif mn == "lodsw":
        src = "m.cs" if "cs:" in op else "m.es" if "es:" in op else "m.ss" if "ss:" in op else "m.ds"
        nxt(f"m.ax = m.read16({src}, m.si); m.si = (m.si + (m.df ? -2 : 2)) & 0xffff;")
    elif mn == "movsw":
        nxt(
            "m.write16(m.es, m.di, m.read16(m.ds, m.si)); m.si = (m.si + (m.df ? -2 : 2)) & 0xffff; m.di = (m.di + (m.df ? -2 : 2)) & 0xffff;"
        )
    elif mn == "movsb":
        nxt(
            "m.write8(m.es, m.di, m.read8(m.ds, m.si)); m.si = (m.si + (m.df ? -1 : 1)) & 0xffff; m.di = (m.di + (m.df ? -1 : 1)) & 0xffff;"
        )
    elif mn.startswith("rep") and "stosb" in f"{mn} {op}":
        nxt(
            "while (m.cx) { m.write8(m.es, m.di, m.al); m.di = (m.di + (m.df ? -1 : 1)) & 0xffff; m.cx = (m.cx - 1) & 0xffff; }"
        )
    elif mn.startswith("rep") and "stosw" in f"{mn} {op}":
        nxt(
            "while (m.cx) { m.write16(m.es, m.di, m.ax); m.di = (m.di + (m.df ? -2 : 2)) & 0xffff; m.cx = (m.cx - 1) & 0xffff; }"
        )
    elif mn.startswith("rep") and "movsw" in f"{mn} {op}":
        nxt(
            "while (m.cx) { m.write16(m.es, m.di, m.read16(m.ds, m.si)); m.si = (m.si + (m.df ? -2 : 2)) & 0xffff; m.di = (m.di + (m.df ? -2 : 2)) & 0xffff; m.cx = (m.cx - 1) & 0xffff; }"
        )
    elif "cmpsw" in f"{mn} {op}":
        body = (
            "const a = m.read16(m.ds, m.si); const b = m.read16(m.es, m.di); m.setSubFlags(16, a, b); "
            "const step = m.df ? -2 : 2; m.si = (m.si + step) & 0xffff; m.di = (m.di + step) & 0xffff;"
        )
        if "repne" in mn or "repnz" in mn:
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (m.zf) break; }}")
        elif mn.startswith("rep"):
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (!m.zf) break; }}")
        else:
            nxt(body)
    elif "cmpsb" in f"{mn} {op}":
        body = (
            "const a = m.read8(m.ds, m.si); const b = m.read8(m.es, m.di); m.setSubFlags(8, a, b); "
            "const step = m.df ? -1 : 1; m.si = (m.si + step) & 0xffff; m.di = (m.di + step) & 0xffff;"
        )
        if "repne" in mn or "repnz" in mn:
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (m.zf) break; }}")
        elif mn.startswith("rep"):
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (!m.zf) break; }}")
        else:
            nxt(body)
    elif "scasw" in f"{mn} {op}":
        body = (
            "m.setSubFlags(16, m.ax, m.read16(m.es, m.di)); const step = m.df ? -2 : 2; "
            "m.di = (m.di + step) & 0xffff;"
        )
        if "repne" in mn or "repnz" in mn:
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (m.zf) break; }}")
        elif mn.startswith("rep"):
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (!m.zf) break; }}")
        else:
            nxt(body)
    elif "scasb" in f"{mn} {op}":
        body = (
            "m.setSubFlags(8, m.al, m.read8(m.es, m.di)); const step = m.df ? -1 : 1; "
            "m.di = (m.di + step) & 0xffff;"
        )
        if "repne" in mn or "repnz" in mn:
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (m.zf) break; }}")
        elif mn.startswith("rep"):
            nxt(f"while (m.cx) {{ {body} m.cx = (m.cx - 1) & 0xffff; if (!m.zf) break; }}")
        else:
            nxt(body)
    elif mn.startswith("rep") and "movsb" in f"{mn} {op}":
        nxt(
            "while (m.cx) { m.write8(m.es, m.di, m.read8(m.ds, m.si)); m.si = (m.si + (m.df ? -1 : 1)) & 0xffff; m.di = (m.di + (m.df ? -1 : 1)) & 0xffff; m.cx = (m.cx - 1) & 0xffff; }"
        )
    elif mn == "div" and "ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        width = 8 if "byte" in parts[0] else 16
        if width == 8:
            nxt(
                f"{{ const d = m.read8({seg}, {off}); if (!d) throw new Error('div0'); const q = Math.floor(m.ax / d); const r = m.ax % d; m.al = q; m.ah = r; }}"
            )
        else:
            nxt(
                f"{{ const d = m.read16({seg}, {off}); if (!d) throw new Error('div0'); const n = m.dx * 0x10000 + m.ax; m.ax = Math.floor(n / d) & 0xffff; m.dx = (n % d) & 0xffff; }}"
            )
    else:
        extra = generic_op(mn, op, parts)
        if extra is None:
            raise ValueError(f"unsupported {ip:#x}: {mn} {op}")
        nxt(extra)
    return lines


def generic_op(mn: str, op: str, parts: list[str]) -> str | None:
    """One TS statement for a regular arithmetic or stack form, or None."""

    def load(part: str) -> tuple[str, int]:
        if part in REG8:
            return f"m.{part}", 8
        if part in REG16 or part in SEG:
            return f"m.{part}", 16
        if part.startswith("0x") or part.startswith("-0x") or part.lstrip("-").isdigit():
            return str(num(part) & 0xffff), 16
        if "ptr" in part:
            seg, off = parse_mem(part.split("ptr", 1)[1])
            width = 8 if "byte" in part else 16
            return f"m.read{width}({seg}, {off})", width
        raise ValueError(part)

    def store(part: str, expr: str, width: int) -> str:
        if part in REG8 or part in REG16 or part in SEG:
            return f"m.{part} = {expr};"
        if "ptr" in part:
            seg, off = parse_mem(part.split("ptr", 1)[1])
            return f"m.write{width}({seg}, {off}, {expr});"
        raise ValueError(part)

    if mn in ("add", "sub", "adc", "sbb", "and", "or", "xor", "cmp", "test") and len(parts) == 2:
        src, sw = load(parts[1])
        if "ptr" in parts[0]:
            seg, off = parse_mem(parts[0].split("ptr", 1)[1])
            width = 8 if "byte" in parts[0] else 16
            dst = f"m.read{width}({seg}, {off})"
            opname = {"add": "setAddFlags", "sub": "setSubFlags", "cmp": "setSubFlags", "adc": "setAdcFlags", "sbb": "setSbbFlags"}.get(mn)
            if opname:
                write = "" if mn == "cmp" else f" m.write{width}({seg}, {off}, r);"
                return f"{{ const a = {dst}; const r = m.{opname}({width}, a, {src});{write} }}"
            if mn == "test":
                return f"{{ const a = {dst}; m.setLogicFlags({width}, a & {src}); }}"
            bitop = {"and": "&", "or": "|", "xor": "^"}[mn]
            return (
                f"{{ const a = {dst}; const r = (a {bitop} {src}) & {0xff if width == 8 else 0xffff}; "
                f"m.write{width}({seg}, {off}, r); m.setLogicFlags({width}, r); }}"
            )
        dst, dw = load(parts[0])
        width = 8 if parts[0] in REG8 or ("byte" in parts[0]) else 16
        if mn == "cmp":
            return f"m.setSubFlags({width}, {dst}, {src});"
        if mn == "test":
            return f"m.setLogicFlags({width}, {dst} & {src});"
        if mn in ("and", "or", "xor"):
            bitop = {"and": "&", "or": "|", "xor": "^"}[mn]
            return f"m.{parts[0]} = ({dst} {bitop} {src}) & {0xff if width == 8 else 0xffff}; m.setLogicFlags({width}, m.{parts[0]});"
        opname = {"add": "setAddFlags", "sub": "setSubFlags", "adc": "setAdcFlags", "sbb": "setSbbFlags"}[mn]
        return f"m.{parts[0]} = m.{opname}({width}, {dst}, {src});"
    if mn in ("inc", "dec") and parts and "ptr" in parts[0]:
        width = 8 if "byte" in parts[0] else 16
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        fn = "setAddFlags" if mn == "inc" else "setSubFlags"
        return (
            f"{{ const saved = m.cf; const a = m.read{width}({seg}, {off}); "
            f"const r = m.{fn}({width}, a, 1); m.write{width}({seg}, {off}, r); m.cf = saved; }}"
        )
    if mn in ("inc", "dec") and parts and parts[0] in REG8 | REG16:
        width = 8 if parts[0] in REG8 else 16
        # inc/dec leave CF unchanged
        fn = "setAddFlags" if mn == "inc" else "setSubFlags"
        return f"{{ const saved = m.cf; m.{parts[0]} = m.{fn}({width}, m.{parts[0]}, 1); m.cf = saved; }}"
    if mn == "neg" and parts and parts[0] in REG8 | REG16:
        width = 8 if parts[0] in REG8 else 16
        return f"m.{parts[0]} = m.setSubFlags({width}, 0, m.{parts[0]});"
    if mn == "xchg" and len(parts) == 2 and "ptr" in parts[0] and parts[1] in REG8 | REG16:
        width = 8 if parts[1] in REG8 or "byte" in parts[0] else 16
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        return (
            f"{{ const t = m.read{width}({seg}, {off}); m.write{width}({seg}, {off}, m.{parts[1]}); m.{parts[1]} = t; }}"
        )
    if mn == "xchg" and len(parts) == 2 and parts[0] in REG8 | REG16 and "ptr" in parts[1]:
        width = 8 if parts[0] in REG8 or "byte" in parts[1] else 16
        seg, off = parse_mem(parts[1].split("ptr", 1)[1])
        return (
            f"{{ const t = m.read{width}({seg}, {off}); m.write{width}({seg}, {off}, m.{parts[0]}); m.{parts[0]} = t; }}"
        )
    if mn == "xchg" and len(parts) == 2 and parts[0] in REG8 | REG16 and parts[1] in REG8 | REG16:
        return f"{{ const t = m.{parts[0]}; m.{parts[0]} = m.{parts[1]}; m.{parts[1]} = t; }}"
    if mn == "mul" and parts:
        src, sw = load(parts[0])
        if sw == 8:
            return f"{{ const r = m.al * ({src}); m.ax = r & 0xffff; m.cf = m.of = r > 0xff; }}"
        return f"{{ const r = m.ax * ({src}); m.ax = r & 0xffff; m.dx = (r >>> 16) & 0xffff; m.cf = m.of = m.dx !== 0; }}"
    if mn == "imul" and parts:
        src, sw = load(parts[0])
        if sw == 8:
            return f"{{ const r = (m.al << 24 >> 24) * (({src}) << 24 >> 24); m.ax = r & 0xffff; }}"
        return f"{{ const r = (m.ax << 16 >> 16) * (({src}) << 16 >> 16); m.ax = r & 0xffff; m.dx = (r >> 16) & 0xffff; }}"
    if mn == "idiv" and parts:
        src, sw = load(parts[0])
        if sw == 8:
            return (
                f"{{ const d = ({src}) << 24 >> 24; const n = m.ax << 16 >> 16; if (!d) throw new Error('idiv0'); "
                f"m.al = Math.trunc(n / d) & 0xff; m.ah = (n % d) & 0xff; }}"
            )
        return (
            f"{{ const d = ({src}) << 16 >> 16; const n = (m.dx << 16) | m.ax; if (!d) throw new Error('idiv0'); "
            f"const s = n << 0 >> 0; m.ax = Math.trunc(s / d) & 0xffff; m.dx = (s % d) & 0xffff; }}"
        )
    if mn in ("cwd", "cdq"):
        return "m.dx = m.ax & 0x8000 ? 0xffff : 0;"
    if mn == "out" and parts[0] == "dx" and parts[1] == "al":
        return "m.portOut(m.dx, m.al);"
    if mn == "out" and parts[1] == "al":
        return f"m.portOut({num(parts[0]) & 0xffff}, m.al);"
    if mn == "in" and parts[0] == "al" and parts[1] == "dx":
        return "m.al = m.portIn(m.dx);"
    if mn == "in" and parts[0] == "al":
        return f"m.al = m.portIn({num(parts[1]) & 0xffff});"
    if mn == "stc":
        return "m.cf = true;"
    if mn == "clc":
        return "m.cf = false;"
    if mn in ("rol", "ror", "rcl", "rcr") and parts and parts[0] in REG8 | REG16:
        width = 8 if parts[0] in REG8 else 16
        mask = "0xff" if width == 8 else "0xffff"
        sign = "0x80" if width == 8 else "0x8000"
        count = "1" if parts[1] == "1" else "(m.cl & 31)"
        if mn == "rol":
            step = f"m.cf = (v & {sign}) !== 0; v = ((v << 1) | (m.cf ? 1 : 0)) & {mask};"
        elif mn == "ror":
            step = f"m.cf = (v & 1) !== 0; v = ((v >>> 1) | (m.cf ? {sign} : 0)) & {mask};"
        elif mn == "rcl":
            step = f"{{ const c = m.cf; m.cf = (v & {sign}) !== 0; v = ((v << 1) | (c ? 1 : 0)) & {mask}; }}"
        else:
            step = f"{{ const c = m.cf; m.cf = (v & 1) !== 0; v = ((v >>> 1) | (c ? {sign} : 0)) & {mask}; }}"
        return f"{{ let v = m.{parts[0]}; const n = {count}; for (let i = 0; i < n; i++) {{ {step} }} m.{parts[0]} = v; }}"
    if mn in ("shl", "shr", "sar") and parts[0] in REG8 | REG16:
        width = 8 if parts[0] in REG8 else 16
        sign = "0x80" if width == 8 else "0x8000"
        mask = "0xff" if width == 8 else "0xffff"
        count = "1" if parts[1] == "1" else "(m.cl & 31)"
        if mn == "shl":
            return (
                f"{{ const n = {count}; if (n) {{ m.cf = ((m.{parts[0]} << (n - 1)) & {sign}) !== 0; "
                f"m.{parts[0]} = (m.{parts[0]} << n) & {mask}; m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & {sign}) !== 0; }} }}"
            )
        if mn == "sar":
            return (
                f"{{ const n = {count}; if (n) {{ const signed = m.{parts[0]} << {32 - width} >> {32 - width}; "
                f"m.cf = ((signed >>> (n - 1)) & 1) !== 0; m.{parts[0]} = (signed >> n) & {mask}; "
                f"m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & {sign}) !== 0; }} }}"
            )
        return (
            f"{{ const n = {count}; if (n) {{ m.cf = ((m.{parts[0]} >>> (n - 1)) & 1) !== 0; "
            f"m.{parts[0]} = (m.{parts[0]} >>> n) & {mask}; m.zf = m.{parts[0]} === 0; m.sf = (m.{parts[0]} & {sign}) !== 0; }} }}"
        )
    if mn == "not" and parts and parts[0] in REG8 | REG16:
        mask = "0xff" if parts[0] in REG8 else "0xffff"
        return f"m.{parts[0]} = (~m.{parts[0]}) & {mask};"
    if mn == "nop" or mn in ("sti", "cli", "wait"):
        return "void 0;"
    if mn == "hlt":
        return "return;"
    if mn == "cmc":
        return "m.cf = !m.cf;"
    if mn == "leave":
        return "m.sp = m.bp; m.bp = m.pop();"
    if mn == "pushf":
        return "m.push((m.cf ? 1 : 0) | (m.pf ? 4 : 0) | (m.zf ? 0x40 : 0) | (m.sf ? 0x80 : 0) | (m.of ? 0x800 : 0) | 2);"
    if mn == "popf":
        return "{ const f = m.pop(); m.cf = (f & 1) !== 0; m.pf = (f & 4) !== 0; m.zf = (f & 0x40) !== 0; m.sf = (f & 0x80) !== 0; m.of = (f & 0x800) !== 0; }"
    if mn == "sahf":
        return "{ const f = m.ah; m.cf = (f & 1) !== 0; m.pf = (f & 4) !== 0; m.zf = (f & 0x40) !== 0; m.sf = (f & 0x80) !== 0; }"
    if mn == "lahf":
        return "m.ah = (m.cf ? 1 : 0) | (m.pf ? 4 : 0) | (m.zf ? 0x40 : 0) | (m.sf ? 0x80 : 0) | 2;"
    if mn == "aas":
        return (
            "{ if ((m.al & 0x0f) > 9) { m.al = (m.al - 6) & 0xff; m.ah = (m.ah - 1) & 0xff; m.cf = true; } "
            "m.al &= 0x0f; }"
        )
    return None


def render_proc(blob: bytes, start: int, end: int, fn: str, comment: str, names: dict[int, str],
                *, body: list | None = None, shared_entry: bool = False) -> str:
    if body is None:
        body = cfg_insns(blob, start, end)
    if not body:
        raise ValueError(f"{fn} decoded no instructions")
    reached = any(i.mnemonic in ("retf", "ret", "iret") for i in body)
    if not reached and body[-1].mnemonic not in ("call", "lcall", "int", "jmp", "ljmp"):
        raise ValueError(f"{fn} did not reach ret ({body[-1].mnemonic})")
    entry = f"0x{ENTRY_INSIDE.get(fn, start):x}"
    parameters = ", entry = " + entry if shared_entry else ""
    lines = [
        f"/** {comment} */",
        f"export function {fn}(m: Cpu{parameters}): void {{",
        "  let ip = " + ("entry" if shared_entry else entry) + ";",
        "  while (true) {",
        "    switch (ip) {",
    ]
    addrs = {insn.address for insn in body}
    for insn in body:
        nxt = insn.address + insn.size
        instruction = emit_insn(insn, nxt, names, nxt in addrs, addrs)
        if (branch := PROFILE.get("code_wheel_branch")) and fn == "ovl02_00fd" and insn.address == branch[1]:
            condition = f"        ip = !m.zf ? 0x330 : 0x{nxt:x};"
            # Classic still executes both of the original GOG NOPs. Enhanced allows the
            # translated conditional jump to reach the guest's own retry and exit.
            at = instruction.index(condition)
            instruction[at:at + 1] = [
                "        if (m.enforceCodeWheel && !m.zf) ip = 0x330;",
                "        else { m.tick(0x32d); ip = 0x32e; }",
            ]
        ecl_loop, ecl_dispatch = PROFILE["ecl_loop"]
        if fn == ecl_loop and f"        nearCall(m, 0x{ecl_dispatch:x});" in instruction:
            # The ECL loop has fetched its opcode and still points at its first byte.
            call = instruction.index(f"        nearCall(m, 0x{ecl_dispatch:x});")
            instruction.insert(call + 1, "        m.onEclInstruction?.(false);")
            instruction.insert(call, "        m.onEclInstruction?.(true);")
        near_base = "(m.cs << 4) + " if fn.startswith("exe_") else ""
        instruction = [line.replace("NEAR_BASE + ", near_base) for line in instruction]
        if fn.startswith("exe_") and insn.address == PROFILE["crt_delay_dec_dx"]:
            # Crt.Delay counts milliseconds in DX. The emulated BIOS tick is too fast for
            # Crt's calibration, which stores zero and would make each millisecond a
            # 65,536-pass loop. Leaving the flags alone ends the delay after one pass.
            # Remove this once the tick cadence and the recorded input tapes are recalibrated.
            flags = "        { const saved = m.cf; m.dx = m.setSubFlags(16, m.dx, 1); m.cf = saved; }"
            instruction[instruction.index(flags)] = "        m.dx = (m.dx - 1) & 0xffff;"
        if fn.startswith("exe_") and insn.address == PROFILE.get("crt_delay_count_load"):
            # This build's Delay runs a slower inner loop: with the zero the calibration stores,
            # its one pass costs about 720,000 instructions where the first release's costs about
            # 130,000. Loading a count of one makes the pass short. Timing is a named deviation
            # either way: the delay does not last the milliseconds asked for.
            load = [line for line in instruction if line.strip().startswith("m.cx = m.read16(")]
            if len(load) != 1:
                raise ValueError(f"{fn} expected one load of the delay count at {insn.address:#x}")
            instruction[instruction.index(load[0])] = "        m.cx = 1;"
        lines.extend(instruction)
    lines += [
        "      default:",
        "        throw new Error(`" + fn + " ip ${ip.toString(16)}`);",
        "    }",
        "  }",
        "}",
        "",
    ]
    return "\n".join(lines)


OVL_HEADER = """// Generated by tools/tp_translate.py from Pool of Radiance. Do not edit.
// Each case is one instruction. `near` is keyed by the offset in this slice.

import type { Cpu } from "../cpu/machine.js";
import { farCall } from "../runtime/far.js";

const near = new Map<number, (m: Cpu) => void>();
export function nearCall(m: Cpu, addr: number): void {
  const fn = near.get(addr);
  if (!fn) throw new Error(`untranslated near ${addr.toString(16)}`);
  fn(m);
}
export const procs = near;
"""

EXE_HEADER = """// Generated by tools/tp_translate.py from START.EXE. Do not edit.
// `procs` is keyed by image offset with the EXE loaded at paragraph 0.

import type { Cpu } from "../cpu/machine.js";
import { farCall } from "../runtime/far.js";

const near = new Map<number, (m: Cpu) => void>();
export function nearCall(m: Cpu, addr: number): void {
  const fn = near.get(addr);
  if (!fn) throw new Error(`untranslated near ${addr.toString(16)}`);
  fn(m);
}
export const procs = near;
"""


def bound_end(blob_len: int, start: int, prologues_at: list[int]) -> int:
    later = min((p for p in prologues_at if p > start), default=blob_len)
    return min(later, start + 0x2000, blob_len)


def close_entries(blob: bytes, starts: list[int], prologues_at: list[int] | None = None) -> list[int]:
    """Add near-call targets that are real routines without a standard prologue."""
    anchors = prologues_at if prologues_at is not None else starts
    known = set(starts)
    queue = list(starts)
    while queue:
        start = queue.pop()
        end = bound_end(len(blob), start, anchors)
        try:
            insns = cfg_insns(blob, start, end)
        except Exception:
            continue
        for insn in insns:
            if insn.mnemonic != "call" or not insn.op_str.startswith("0x"):
                continue
            tgt = num(insn.op_str) & 0xFFFF
            if tgt in known or tgt >= len(blob):
                continue
            if blob[tgt : tgt + 2] in (b"\xcd\x3f", b"\x00\x00"):
                continue
            try:
                render_proc(blob, tgt, bound_end(len(blob), tgt, anchors), "probe", "probe", {})
            except Exception:
                continue
            known.add(tgt)
            queue.append(tgt)
    return sorted(known)


def emit_unit(blob: bytes, spans: list[tuple[int, int, str, str]]) -> tuple[str, list[tuple[int, str]]]:
    body: list[str] = []
    regs: list[tuple[int, str]] = []
    entries = {ENTRY_INSIDE.get(name, start) for start, _, name, _ in spans}
    functions = {name: cfg_insns(blob, start, end) for start, end, name, _ in spans}
    owners = {insn.address: name for name, instructions in functions.items() for insn in instructions}
    external = set()
    for instructions in functions.values():
        local = {insn.address for insn in instructions}
        for insn in instructions:
            if insn.mnemonic not in JUMPS or insn.mnemonic.startswith("loop"):
                continue
            target = imm(insn.op_str)
            if target is not None and target not in local and target not in entries:
                external.add(target)

    # Some entries consist only of a jump to translated code. Preserve that
    # instruction as well as the destination, without adding a guest return.
    decoder = Cs(CS_ARCH_X86, CS_MODE_16)
    redirects: dict[int, int] = {}
    for target in sorted(external - owners.keys()):
        if not 0 <= target < len(blob):
            continue
        insn = next(decoder.disasm(blob[target:target + 15], target, count=1), None)
        if insn is None or insn.mnemonic != "jmp":
            continue
        destination = imm(insn.op_str)
        if destination is not None and (destination in owners or destination in entries):
            redirects[target] = destination
    if INSTRUCTIONS is not None:
        taken = {(insn.address, insn.size) for instructions in functions.values() for insn in instructions}
        for target in redirects:
            jump = next(decoder.disasm(blob[target:target + 15], target, count=1))
            taken.add((jump.address, jump.size))
        INSTRUCTIONS.append(sorted(taken))

    # A jump into another routine shares its tail and starts at that IP
    # with the existing stack and registers.
    shared = {target: owners[target] for target in external.union(redirects.values())
              if target in owners and target not in entries}
    shared_owners = set(shared.values())
    for start, end, name, comment in spans:
        try:
            body.append(render_proc(blob, start, end, name, comment, {},
                                    body=functions[name], shared_entry=name in shared_owners))
        except ValueError as error:
            if SURVEY is None:
                raise
            # With --survey, list everything the translator cannot emit yet and keep going.
            SURVEY.append(f"{name}: {error}")
            continue
        regs.append((ENTRY_INSIDE.get(name, start), name))
    registered = {name for _, name in regs}
    if INSTRUCTION_MAP is not None:
        listed = INSTRUCTION_MAP.setdefault(MAP_UNIT, [])
        for start, _, name, _ in spans:
            if name in registered:
                listed.append({"name": name, "start": start, "ranges": byte_ranges(functions[name])})
        for target, destination in redirects.items():
            # An entry that is only a jump into translated code is emitted as that one instruction.
            if destination in entries or shared.get(destination) in registered:
                insn = next(decoder.disasm(blob[target:target + 15], target, count=1))
                listed.append({"name": f"jump_{target:05x}", "start": target, "ranges": byte_ranges([insn])})
    tail = "\n".join([
        *(f"near.set(0x{off:x}, {name});" for off, name in regs),
        *(f"near.set(0x{target:x}, m => {owner}(m, 0x{target:x}));"
          for target, owner in sorted(shared.items()) if owner in registered),
        *(f"near.set(0x{target:x}, m => {{ m.tick(0x{target:x}); nearCall(m, 0x{destination:x}); }});"
          for target, destination in redirects.items() if destination in entries or shared.get(destination) in registered),
    ])
    return "\n".join(body) + "\n" + tail + "\n", regs


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("game_dir", nargs="?", type=Path, help="directory containing START.EXE and GAME.OVR")
    parser.add_argument("--output", type=Path, help="directory for generated TypeScript and coverage")
    parser.add_argument("--game-version", choices=sorted(PROFILES), default="1.0",
                        help="which build of the program the game directory holds")
    parser.add_argument("--survey", action="store_true",
                        help="list every procedure the translator cannot emit yet, and why, instead of stopping at the first")
    parser.add_argument("--check", action="store_true",
                        help="regenerate into a temporary directory and fail if src/translated differs")
    parser.add_argument("--data-map", type=Path,
                        help="also write, as JSON, which bytes of the program image and of each overlay slice "
                             "are instructions the translator emitted; every other byte is data or unclassified")
    parser.add_argument("--instruction-map", type=Path, metavar="FILE",
                        help="write, as JSON, the byte ranges of every instruction of every emitted procedure. "
                             "The TypeScript goes to --output, or to a temporary directory: src/ is not touched")
    args = parser.parse_args()
    if args.instruction_map:
        import json
        import tempfile

        global INSTRUCTION_MAP
        if args.check:
            parser.error("--instruction-map and --check are separate runs")
        INSTRUCTION_MAP = {}
        with tempfile.TemporaryDirectory() as scratch:
            args.output = args.output or Path(scratch)
            generate(parser, args)
        units = {
            unit: sorted(procedures, key=lambda procedure: (procedure["start"], procedure["name"]))
            for unit, procedures in sorted(INSTRUCTION_MAP.items())
        }
        args.instruction_map.write_text(json.dumps({"gameVersion": args.game_version, "units": units}, indent=1) + "\n")
        return
    if args.check:
        import tempfile

        if args.output:
            parser.error("--check writes to a temporary directory; do not pass --output")
        if args.data_map:
            parser.error("--data-map goes with a normal run; pass --output to keep src/ untouched")
        with tempfile.TemporaryDirectory() as scratch:
            args.check = False
            args.output = Path(scratch)
            generate(parser, args)
            raise SystemExit(compare(Path(scratch), ROOT / "src" / PROFILES[args.game_version]["directory"]))
    generate(parser, args)


def compare(fresh: Path, checked_in: Path) -> int:
    """Report generated files that differ from the checked-in translation."""
    import difflib

    stale = []
    names = sorted({p.name for p in fresh.glob("*.ts")} | {p.name for p in checked_in.glob("*.ts")})
    for name in names:
        a = (checked_in / name).read_text().splitlines() if (checked_in / name).exists() else []
        b = (fresh / name).read_text().splitlines() if (fresh / name).exists() else []
        if a != b:
            lines = sum(1 for line in difflib.unified_diff(a, b, lineterm="", n=0)
                        if line[:1] in "+-" and not line.startswith(("+++", "---")))
            stale.append((name, lines))
    if not stale:
        print(f"src/translated matches the generator ({len(names)} files)")
        return 0
    print(f"{len(stale)} of {len(names)} files in src/translated differ from the generator:")
    for name, lines in stale:
        print(f"  {name}: {lines} changed lines")
    print("Change tools/tp_translate.py and run `npm run translate`. Do not edit src/translated.")
    return 1


def generate(parser: argparse.ArgumentParser, args: argparse.Namespace) -> None:
    global EXE, OVR, IMG, PROFILE, SURVEY, INSTRUCTIONS, MAP_UNIT
    PROFILE = PROFILES[args.game_version]
    SURVEY = [] if args.survey else None
    INSTRUCTIONS = [] if args.data_map else None
    slice_map: list[dict] = []
    root = args.game_dir or Path(os.environ.get("POR_GAMEDATA") or ROOT / "gamedata")
    candidates = [root, *sorted(path for path in root.iterdir() if path.is_dir())] if root.is_dir() else []
    for candidate in candidates:
        files = {path.name.upper(): path for path in candidate.iterdir() if path.is_file()}
        if {"START.EXE", "GAME.OVR"} <= files.keys():
            EXE = files["START.EXE"].read_bytes()
            OVR = files["GAME.OVR"].read_bytes()
            break
    else:
        parser.error(f"START.EXE and GAME.OVR were not found under {root}")
    if len(EXE) < 28 or EXE[:2] != b"MZ" or OVR[:4] != PROFILE["overlay_magic"]:
        parser.error(f"expected an MZ executable and a {PROFILE['overlay_magic'].decode()} overlay file for version {args.game_version}")
    if b"Packed file is corrupt" in EXE:
        # The stub scan and the translation need the program as it sits in memory.
        import exepack

        IMG = exepack.unpack(EXE)[0]
        packed = True
    else:
        IMG = EXE[struct.unpack_from("<H", EXE, 8)[0] * 16 :]
        packed = False
    out_dir = args.output or ROOT / "src" / PROFILE["directory"]
    out_dir.mkdir(parents=True, exist_ok=True)
    all_stubs = stubs(IMG if packed else None)
    header_bytes = 0 if packed else struct.unpack_from("<H", EXE, 8)[0] * 16
    rows: list[str] = []
    imports: list[str] = []
    mounts: list[str] = []
    ovr_total = 0
    ovr_done = 0
    for index, s in enumerate(all_stubs):
        blob = OVR[s["off"] : s["off"] + s["code"]]
        if (branch := PROFILE.get("code_wheel_branch")) and index == branch[0]:
            at = branch[1]
            if blob[at : at + 4] != bytes.fromhex("90 90 EB 25"):
                raise ValueError("Unexpected version 1.3 code-wheel branch bytes")
            # Decode the earlier release's jump to include the intact retry block in the CFG.
            # The source game files are untouched, and render_proc gates the emitted jump.
            blob = blob[:at] + bytes.fromhex("75 02") + blob[at + 2 :]
        anch = prologues(blob)
        found = close_entries(blob, anch, anch)
        ovr_total += len(anch)
        spans = []
        for a in found:
            b = bound_end(len(blob), a, anch)
            spans.append((a, b, f"ovl{index:02d}_{a:04x}", f"GAME.OVR slice {index} ovr+0x{s['off']:x} procedure 0x{a:04x}."))
        MAP_UNIT = f"ovl{index:02d}"
        text, regs = emit_unit(blob, spans) if spans else ("", [])
        if INSTRUCTIONS is not None:
            slice_map.append({"index": index, "fileOffset": s["off"], "codeBytes": s["code"], "relocationBytes": s["rel"],
                              "stubImageOffset": s["exe"] - (0 if packed else struct.unpack_from("<H", EXE, 8)[0] * 16),
                              "stubEntries": s["n"], "instructions": INSTRUCTIONS.pop() if spans else []})
        ovr_done += len(regs)
        header_para = (s["exe"] - header_bytes) // 16
        file = out_dir / f"ovl{index:02d}.ts"
        file.write_text(
            OVL_HEADER
            + f"export const SLICE = {{ index: {index}, fileOffset: 0x{s['off']:x}, headerPara: 0x{header_para:x} }};\n\n"
            + text
        )
        rows.append(f"| {index} | 0x{s['off']:x} | {len(found)} | {len(regs)} |")
        imports.append(f'import {{ procs as p{index}, SLICE as s{index} }} from "./ovl{index:02d}.js";')
        mounts.append(f"  {{ ...s{index}, procs: p{index} }},")

    exe_prologues = prologues(IMG)
    exe_library = [p for p in library_prologues(IMG) if p < PROFILE["data_segment"] * 16]
    seeds = set(exe_prologues) | set(exe_library)
    seeds.add(PROFILE["system_init"])
    seeds.update(PROFILE.get("entries_inside", {}).values())
    for i in range(len(IMG) - 1):
        if IMG[i] == 0x8B and IMG[i + 1] == 0xDC:
            seeds.add(i)
        # Empty far procedures: xor ax,ax / retf n. Crt installs these as handlers.
        if i + 3 <= len(IMG) and IMG[i : i + 3] == b"\x33\xc0\xca":
            seeds.add(i)

    def take_far(blob: bytes, start: int, end: int) -> None:
        try:
            insns = cfg_insns(blob, start, end)
        except Exception:
            return
        for insn in insns:
            if insn.mnemonic != "lcall" or "," not in insn.op_str:
                continue
            seg_s, off_s = insn.op_str.split(",")
            image = ((num(seg_s) & 0xFFFF) << 4) + (num(off_s) & 0xFFFF)
            if 0 <= image < len(IMG) and IMG[image : image + 2] != b"\xcd\x3f":
                seeds.add(image)

    for stub in all_stubs:
        blob = OVR[stub["off"] : stub["off"] + stub["code"]]
        procs = prologues(blob)
        for a, b in zip(procs, procs[1:] + [len(blob)]):
            take_far(blob, a, b)
    for a, b in zip(exe_prologues, exe_prologues[1:] + [len(IMG)]):
        take_far(IMG, a, b)
    take_far(IMG, PROFILE["system_init"], PROFILE["system_init"] + 0x200)
    exe_found = close_entries(IMG, sorted(seeds), exe_prologues)
    exe_spans = []
    inside = {first: entry for entry, first in PROFILE.get("entries_inside", {}).items()}
    for a in exe_found:
        b = bound_end(len(IMG), a, exe_prologues)
        if a in inside:
            ENTRY_INSIDE[f"exe_{inside[a]:05x}"] = inside[a]
            exe_spans.append((a, b, f"exe_{inside[a]:05x}", f"START.EXE image 0x{a:x}, entered at 0x{inside[a]:x}."))
        else:
            exe_spans.append((a, b, f"exe_{a:05x}", f"START.EXE image 0x{a:x}."))
    if 6 not in exe_found:
        # Startup falls into the program frame at 0xfb (push bp). That frame is
        # not a separate procedure, so the entry has to run through the halt call.
        exe_spans.insert(0, (6, 0x160, "exe_00006", "START.EXE entry at image 0x6, through System.Halt."))
    MAP_UNIT = "exe"
    exe_text, exe_regs = emit_unit(IMG, exe_spans)
    image_instructions = INSTRUCTIONS.pop() if INSTRUCTIONS is not None else []
    (out_dir / "exe.ts").write_text(EXE_HEADER + exe_text)

    sys_regs: list[tuple[int, str]] = []
    if PROFILE["system"]:
        system_segment, sys_targets = PROFILE["system"]
        base = system_segment * 16
        seg_img = IMG[base : base + 0x8000]
        sys_spans = []
        for t in sys_targets:
            sys_spans.append((t, min(t + 0x600, len(seg_img)), f"sys5bb_{t:04x}", f"System unit 0x5bb:0x{t:04x}."))
        MAP_UNIT = "system5bb"
        sys_body, sys_regs = emit_unit(seg_img, sys_spans)
        if INSTRUCTIONS is not None:
            image_instructions = sorted(set(image_instructions) | {(base + at, size) for at, size in INSTRUCTIONS.pop()})
        sys_header = """// Generated by tools/tp_translate.py from START.EXE segment 0x5BB.
// Non-prologue System routines (FillChar, Move, strings, BlockRead).

import type { Cpu } from "../cpu/machine.js";
import { exeByImage, farCall, registerFar } from "../runtime/far.js";

const near = new Map<number, (m: Cpu) => void>();
const SYSTEM_BASE = 0x5bb0;
export function nearCall(m: Cpu, addr: number): void {
  const fn = near.get(addr) ?? exeByImage.get(SYSTEM_BASE + addr);
  if (!fn) throw new Error(`untranslated near ${addr.toString(16)}`);
  fn(m);
}
"""
        footer = "\n".join(f"registerFar(0x5bb, 0x{off:x}, {name});" for off, name in sys_regs)
        (out_dir / "system5bb.ts").write_text(sys_header + sys_body + footer + "\n")

    intr_segment, intr_offset = PROFILE["intr"]
    reg = "\n".join(imports) + ("""
import "./system5bb.js";""" if PROFILE["system"] else "") + f"""
import {{ registerIntr }} from "../runtime/intr.js";
import {{ procs as exeProcs }} from "./exe.js";
import {{ installExeProcs }} from "../runtime/far.js";
import {{ mountSlices, type SliceModule }} from "../runtime/overlay.js";

export function registerTranslated(): void {{
  registerIntr(0x{intr_segment:x}, 0x{intr_offset:x});
  installExeProcs(exeProcs);
  mountSlices([
""" + "\n".join(mounts) + """
  ] as SliceModule[]);
}
"""
    (out_dir / "register.ts").write_text("// Generated by tools/tp_translate.py.\n" + reg)

    report_dir = args.output or ROOT / "out"
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "translation-coverage.md").write_text(
        f"""# Translation coverage

A procedure counts as found when it starts with `push bp; mov bp, sp`, or when a translated procedure calls it directly.
Compiled Pascal encodes the prologue as `55 89 E5`. The assembler-written library units encode it as `55 8B EC`.
Translated means `tools/tp_translate.py` emitted it with no unsupported instruction.
Verified means a test ran it alone and checked the bytes it wrote. The entry point at image `0x6` is translated in addition to the procedure count.

| Unit | Procedures | Translated | Verified |
| --- | ---: | ---: | ---: |
| START.EXE resident procedures | {len(exe_found)} | {len(exe_regs)} (includes entry) | 1 (FillChar, `sys5bb_16b5`) |
| GAME.OVR slices | {ovr_total} | {ovr_done} | 1 (`ovl07_0000`, ECL operand fetch) |
| System unit, non-prologue | {len(sys_regs)} | {len(sys_regs)} | 1 (FillChar) |
| **Total procedures** | **{len(exe_found) + ovr_total}** | **{ovr_done + len([r for r in exe_regs if r[0] != 6])}** | **2** |

| Slice | File offset | Found | Translated |
| --- | --- | ---: | ---: |
"""
        + "\n".join(rows)
        + """

`src/runtime/overlay.ts` is the int 3Fh behaviour: the word after `CD 3F` is the procedure offset, the header at that segment names the slice, and the procedure runs with CS equal to the segment the slice's code was copied into. `src/runtime/dos.ts` answers the System unit's int 21h calls.
"""
    )
    if args.data_map:
        import json

        args.data_map.write_text(json.dumps({
            "gameVersion": args.game_version,
            "image": {"bytes": len(IMG), "dataSegment": PROFILE["data_segment"], "instructions": image_instructions},
            "overlayFileBytes": len(OVR),
            "slices": slice_map,
        }) + "\n")
    print(f"overlays {ovr_done}/{ovr_total} exe {len(exe_regs)} system {len(sys_regs)}")
    if SURVEY:
        print(f"{len(SURVEY)} procedures could not be emitted:")
        for line in SURVEY:
            print(f"  {line}")
        raise SystemExit(1)


if __name__ == "__main__":
    main()
