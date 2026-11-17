#!/usr/bin/env python3
"""Mechanical translator: Turbo Pascal 8086 -> TypeScript.

Each instruction becomes one switch case. Control flow is the original
jump, call, and retf. DS offsets are left as the numbers in the binary.
"""

from __future__ import annotations

import struct
from pathlib import Path

from capstone import CS_ARCH_X86, CS_MODE_16, Cs

ROOT = Path(__file__).resolve().parents[1]
EXE = Path("/tmp/por-zip/pool/START.EXE").read_bytes()
OVR = Path("/tmp/por-zip/pool/GAME.OVR").read_bytes()
IMG = EXE[944:]
assert OVR[:4] == b"TPOV"

REG16 = {"ax", "cx", "dx", "bx", "sp", "bp", "si", "di"}
REG8 = {"al", "ah", "cl", "ch", "dl", "dh", "bl", "bh"}
SEG = {"es", "cs", "ss", "ds"}


def stubs() -> list[dict]:
    found = []
    seen = set()
    for i in range(len(EXE) - 32):
        if EXE[i : i + 2] != b"\xcd\x3f":
            continue
        memswap, fileoff, codesize, relsize, nentries, prev = struct.unpack_from("<HIHHHH", EXE, i + 2)
        if not (1 <= nentries <= 512 and 16 <= codesize <= 0xFFF0):
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
        if blob[i] == 0x55 and blob[i + 1] == 0x89 and blob[i + 2] == 0xE5:
            out.append(i)
            i += 3
        else:
            i += 1
    return out


def insn_until_retf(blob: bytes, start: int, end: int) -> list:
    md = Cs(CS_ARCH_X86, CS_MODE_16)
    body = []
    for insn in md.disasm(bytes(blob[start:end]), start):
        body.append(insn)
        if insn.mnemonic == "retf":
            break
    return body


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


def emit_insn(insn, next_ip: int, proc_name: dict[int, str]) -> list[str]:
    mn = insn.mnemonic
    if mn == "cwde":
        mn = "cbw"
    op = insn.op_str
    ip = insn.address
    lines = [f"      case 0x{ip:x}: {{", f"        // {ip:04x}: {insn.mnemonic} {op}"]
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
    elif mn == "inc" and parts[0] in REG16:
        nxt(f"m.{parts[0]} = (m.{parts[0]} + 1) & 0xffff;")
    elif mn == "inc" and "byte ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read8({seg}, {off}); const saved = m.cf; const r = m.setAddFlags(8, a, 1); m.write8({seg}, {off}, r); m.cf = saved; }}"
        )
    elif mn == "inc" and "word ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read16({seg}, {off}); const saved = m.cf; const r = m.setAddFlags(16, a, 1); m.write16({seg}, {off}, r); m.cf = saved; }}"
        )
    elif mn == "dec" and parts[0] in REG16:
        nxt(f"m.{parts[0]} = (m.{parts[0]} - 1) & 0xffff;")
    elif mn == "dec" and "byte ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read8({seg}, {off}); const r = m.setSubFlags(8, a, 1); const cf = m.cf; m.write8({seg}, {off}, r); m.cf = cf; }}"
        )
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
    elif mn == "sub" and "word ptr" in parts[0]:
        seg, off = parse_mem(parts[0].split("ptr", 1)[1])
        nxt(
            f"{{ const a = m.read16({seg}, {off}); const r = m.setSubFlags(16, a, {imm(parts[1])}); m.write16({seg}, {off}, r); }}"
        )
    elif mn == "div" and parts[0] in REG16:
        nxt(
            f"{{ const d = m.{parts[0]}; if (!d) throw new Error('div0'); const n = (m.dx << 16) | m.ax; m.ax = Math.floor(n / d) & 0xffff; m.dx = n % d; }}"
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
    elif mn in ("jmp", "je", "jne", "jb", "jae", "jbe", "ja", "jl", "jge", "jle", "jg", "js", "jns"):
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
        }[mn]
        lines.append(f"        ip = {cond} ? 0x{target:x} : 0x{next_ip:x};")
        lines.append("        break;")
        lines.append("      }")
    elif mn == "call":
        target = imm(parts[0])
        name = proc_name.get(target, None)
        if not name:
            raise ValueError(f"near call to unlisted {target:#x} from {ip:#x}")
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        {name}(m);")
        lines.append(f"        ip = 0x{next_ip:x};")
        lines.append("        break;")
        lines.append("      }")
    elif mn == "lcall":
        # "0x5bb, 0x16b5"
        seg = imm(parts[0])
        off = imm(parts[1])
        lines.append(f"        m.push(m.cs);")
        lines.append(f"        m.push(0x{next_ip:x});")
        lines.append(f"        farCall(m, 0x{seg:x}, 0x{off:x});")
        lines.append(f"        ip = 0x{next_ip:x};")
        lines.append("        break;")
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
        nxt("m.al = m.read8(m.ds, m.si); m.si = (m.si + (m.df ? -1 : 1)) & 0xffff;")
    elif mn == "stosb":
        nxt("m.write8(m.es, m.di, m.al); m.di = (m.di + (m.df ? -1 : 1)) & 0xffff;")
    elif mn == "movsb":
        nxt(
            "m.write8(m.es, m.di, m.read8(m.ds, m.si)); m.si = (m.si + (m.df ? -1 : 1)) & 0xffff; m.di = (m.di + (m.df ? -1 : 1)) & 0xffff;"
        )
    elif mn.startswith("rep") and "stosb" in f"{mn} {op}":
        nxt(
            "while (m.cx) { m.write8(m.es, m.di, m.al); m.di = (m.di + (m.df ? -1 : 1)) & 0xffff; m.cx = (m.cx - 1) & 0xffff; }"
        )
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
                f"{{ const d = m.read16({seg}, {off}); if (!d) throw new Error('div0'); const n = (m.dx << 16) | m.ax; m.ax = Math.floor(n / d) & 0xffff; m.dx = (n % d) & 0xffff; }}"
            )
    else:
        raise ValueError(f"unsupported {ip:#x}: {mn} {op}")
    return lines


def render_proc(blob: bytes, start: int, end: int, fn: str, comment: str, names: dict[int, str]) -> str:
    body = insn_until_retf(blob, start, end)
    if not body or body[-1].mnemonic != "retf":
        raise ValueError(f"{fn} did not end in retf")
    lines = [
        f"/** {comment} */",
        f"export function {fn}(m: Cpu): void {{",
        f"  let ip = 0x{start:x};",
        "  while (true) {",
        "    switch (ip) {",
    ]
    for i, insn in enumerate(body):
        nxt = body[i + 1].address if i + 1 < len(body) else insn.address + insn.size
        lines.extend(emit_insn(insn, nxt, names))
    lines += [
        "      default:",
        "        throw new Error(`" + fn + " ip ${ip.toString(16)}`);",
        "    }",
        "  }",
        "}",
        "",
    ]
    return "\n".join(lines)


def main() -> None:
    all_stubs = stubs()
    total = 0
    for s in all_stubs:
        blob = OVR[s["off"] : s["off"] + s["code"]]
        total += len(prologues(blob))
    # resident prologues in the EXE image, a lower bound
    exe_procs = len(prologues(IMG))
    ovr = all_stubs[7]
    blob = OVR[ovr["off"] : ovr["off"] + ovr["code"]]
    procs = prologues(blob)
    names = {p: f"ovl07_{p:04x}" for p in procs}
    chunks = []
    for a, b in zip(procs, procs[1:] + [len(blob)]):
        chunks.append(
            render_proc(
                blob,
                a,
                b,
                names[a],
                f"GAME.OVR slice ovr+0x{ovr['off']:x} procedure 0x{a:04x}. Original far entries use this overlay's segment.",
                names,
            )
        )
    header = """// Generated by tools/tp_translate.py from Pool of Radiance GAME.OVR.
// Do not edit by hand. Each case is one instruction from the binary.

import type { Cpu } from "../cpu/machine.js";
import { farCall } from "../runtime/far.js";

"""
    out = ROOT / "src" / "translated" / "ovl07.ts"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(header + "\n".join(chunks))

    # System unit routines used by this overlay, translated the same way.
    sys_targets = [0x16B5, 0x1692, 0x634, 0x6C1, 0x64E]
    sys_names = {t: f"sys5bb_{t:04x}" for t in sys_targets}
    sys_chunks = []
    base = 0x5BB * 16
    seg_img = IMG[base : base + 0x10000]
    for t in sys_targets:
        sys_chunks.append(
            render_proc(
                seg_img,
                t,
                min(t + 0x80, len(seg_img)),
                sys_names[t],
                f"START.EXE segment 0x5bb offset 0x{t:04x} (image 0x{base + t:x}), Turbo Pascal System unit.",
                sys_names,
            )
        )
    sys_header = """// Generated by tools/tp_translate.py from Pool of Radiance START.EXE segment 0x5BB.
// These are the System-unit routines the translated overlay calls.

import type { Cpu } from "../cpu/machine.js";
import { farCall, registerFar } from "../runtime/far.js";

"""
    footer = "\n".join(
        [f'registerFar(0x5bb, 0x{t:x}, {sys_names[t]});' for t in sys_targets]
    )
    (ROOT / "src" / "translated" / "system5bb.ts").write_text(sys_header + "\n".join(sys_chunks) + footer + "\n")

    coverage = ROOT / "docs" / "COVERAGE.md"
    coverage.write_text(
        f"""# Translation coverage

Counted from `push bp; mov bp, sp` prologues in the TPOV slices and in `START.EXE`.
A procedure is translated when `tools/tp_translate.py` emitted it. Verified means a test executed it and checked a result.

| Unit | Procedures | Translated | Verified |
| --- | ---: | ---: | ---: |
| START.EXE resident | {exe_procs} | {len(sys_targets)} | 1 (FillChar, `sys5bb_16b5`) |
| GAME.OVR all 38 slices | {total} | {len(procs)} (slice 7, ovr+0x{ovr['off']:x}) | 1 (`ovl07_0000`, ECL operand fetch) |
| **Total** | **{exe_procs + total}** | **{len(procs) + len(sys_targets)}** | **2** |

Slice 7 is the one that contains the Pascal strings `Loading...Please Wait`, `ECL`, and `.dax`, and the procedure at `0x0000` that reads ECL operand codes `0x00`, `0x01`, `0x02`, `0x03`, `0x80`, and `0x81`.

The other 37 slices are mapped (file offset, code size, relocation size, entry count) in `docs/overlays.json` and are not translated yet.

System routines translated from segment `0x5BB` because slice 7 calls them: `0x16b5` FillChar, `0x1692` Move, `0x634` string assign, `0x6c1` string append, `0x64e` length-limited string copy.
"""
    )
    print(f"overlay procs {len(procs)} exe prologues {exe_procs} ovr prologues {total}")


if __name__ == "__main__":
    main()
