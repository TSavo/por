#!/usr/bin/env python3
"""The palette registers the original sets, from its own code run under Unicorn (#82).

Runs the original bytes of GOG 1.3's START.EXE and GAME.OVR, not the translation: the title's flash
(slice 1, 0765 to 07d4: one flash, six calls of the palette routine with a Delay between each two)
and slice 31's two palette routines (00e3, which a fight calls when it begins, and 0105, which puts
the palette back when the fight ends). The palette routine (START.EXE image 704d) calls Turbo
Pascal's Intr (a32b), which jumps through the interrupt table to int 10h; the vector is pointed at
an IRET, where each call's AX and BX are recorded. Crt.Delay (a69c) records its argument and runs
one pass of its loop. Nothing is assumed about what the routines do: the record is what they did.

    python tools/palette-unicorn.py START.EXE GAME.OVR OUTPUT.json   (or - for standard output)

Requires the optional `unicorn` Python package (on Battleaxe: ~/por-venv).
"""
from __future__ import annotations

import hashlib
import json
import struct
import sys
from pathlib import Path

from unicorn import Uc, UC_ARCH_X86, UC_HOOK_CODE, UC_MODE_16
from unicorn.x86_const import (
    UC_X86_REG_AX, UC_X86_REG_BP, UC_X86_REG_BX, UC_X86_REG_CS, UC_X86_REG_DS, UC_X86_REG_ES,
    UC_X86_REG_IP, UC_X86_REG_SP, UC_X86_REG_SS,
)

# GOG 1.3: the data segment, the adapter byte (1 = EGA), Crt's delay count, Crt.Delay, the palette
# routine, and the overlay stubs of slices 1 and 31 (their paragraphs in the image).
DATA = 0xC7C
ADAPTER = 0x4A1E
DELAY_COUNT = 0x84FC
DELAY = 0xA69C
SET_PALETTE = 0x704D
SET_PALETTE_BYTES = bytes.fromhex("5589e5c606034a10")  # push bp; mov bp,sp; mov byte [4a03],10h
SLICE_STUBS = {1: 0x19, 31: 0x3E0}
ROUTINES = {
    "title": dict(slice=1, start=0x765, end=0x7D4, far=False,
                  what="The title's flash, once: slice 1 0765 to 07d4"),
    "battle": dict(slice=31, start=0xE3, far=True,
                   what="Slice 31 00e3, called when a fight begins (START.EXE image 3728)"),
    "restore": dict(slice=31, start=0x105, far=True,
                    what="Slice 31 0105, called when a fight ends (slice 8 0064)"),
}
OVERLAY = 0x9000  # paragraph the slice is loaded at; its far calls name the image's own segments
STUB = 0x9F00     # paragraph of the int 10h IRET and of the return address that ends a run
STACK = 0x9E00


def mz_image(path: Path) -> bytes:
    data = path.read_bytes()
    if data[:2] != b"MZ":
        raise ValueError("expected a DOS MZ executable")
    if b"Packed file is corrupt" in data:
        sys.path.insert(0, str(Path(__file__).resolve().parent))
        import exepack

        return bytes(exepack.unpack(data)[0])
    return data[struct.unpack_from("<H", data, 8)[0] * 16:]


def run(image: bytes, overlay: bytes, routine: dict) -> list[dict]:
    stub = SLICE_STUBS[routine["slice"]] * 16
    file_offset, code_bytes = struct.unpack_from("<IH", image, stub + 4)
    machine = Uc(UC_ARCH_X86, UC_MODE_16)
    machine.mem_map(0, 0x100000)
    machine.mem_write(0, image)
    machine.mem_write(OVERLAY * 16, overlay[file_offset:file_offset + code_bytes])
    machine.mem_write(STUB * 16, b"\xcf")          # int 10h: IRET
    machine.mem_write(STUB * 16 + 0x10, b"\xf4")   # where a far routine returns to
    machine.mem_write(0x10 * 4, struct.pack("<HH", 0, STUB))
    machine.mem_write(DATA * 16 + ADAPTER, b"\x01")
    machine.mem_write(DATA * 16 + DELAY_COUNT, struct.pack("<H", 1))
    events: list[dict] = []

    def word(segment: int, offset: int) -> int:
        return struct.unpack("<H", machine.mem_read(segment * 16 + (offset & 0xFFFF), 2))[0]

    def on_code(uc, address, _size, _user):
        if address == STUB * 16:
            ax, bx = uc.reg_read(UC_X86_REG_AX), uc.reg_read(UC_X86_REG_BX)
            events.append({"int10": {"ah": ax >> 8, "al": ax & 0xFF, "bl": bx & 0xFF, "bh": bx >> 8}})
        elif address == DELAY:
            events.append({"delayMs": word(uc.reg_read(UC_X86_REG_SS), uc.reg_read(UC_X86_REG_SP) + 4)})

    machine.hook_add(UC_HOOK_CODE, on_code)
    for register, value in ((UC_X86_REG_DS, DATA), (UC_X86_REG_ES, DATA), (UC_X86_REG_SS, STACK),
                            (UC_X86_REG_SP, 0xF000), (UC_X86_REG_BP, 0xF100)):
        machine.reg_write(register, value)
    if routine["far"]:
        sp = 0xF000 - 4
        machine.mem_write(STACK * 16 + sp, struct.pack("<HH", 0x10, STUB))
        machine.reg_write(UC_X86_REG_SP, sp)
        end = STUB * 16 + 0x10
    else:
        end = OVERLAY * 16 + routine["end"]
    machine.reg_write(UC_X86_REG_CS, OVERLAY)
    machine.reg_write(UC_X86_REG_IP, routine["start"])
    machine.emu_start(OVERLAY * 16 + routine["start"], end, count=2_000_000)
    stopped = machine.reg_read(UC_X86_REG_CS) * 16 + machine.reg_read(UC_X86_REG_IP)
    if stopped != end:
        raise RuntimeError(f"{routine['what']} stopped at {stopped:x}, not {end:x}")
    return events


def main() -> int:
    if len(sys.argv) != 4:
        raise SystemExit(f"usage: {sys.argv[0]} START.EXE GAME.OVR OUTPUT.json")
    executable, overlay_path = Path(sys.argv[1]), Path(sys.argv[2])
    image = mz_image(executable)
    if image[SET_PALETTE:SET_PALETTE + len(SET_PALETTE_BYTES)] != SET_PALETTE_BYTES:
        raise SystemExit("This is not GOG version 1.3's START.EXE: its palette routine is not at image 704d.")
    overlay = overlay_path.read_bytes()
    report = {
        "schema": 1,
        "validator": "Unicorn 16-bit x86 execution of the original START.EXE and GAME.OVR palette code",
        "executableSha256": hashlib.sha256(executable.read_bytes()).hexdigest(),
        "overlaySha256": hashlib.sha256(overlay).hexdigest(),
        "routines": {name: {"what": routine["what"], "events": run(image, overlay, routine)}
                     for name, routine in ROUTINES.items()},
    }
    output = json.dumps(report, indent=2) + "\n"
    if sys.argv[3] == "-":
        print(output, end="")
    else:
        Path(sys.argv[3]).write_text(output)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
