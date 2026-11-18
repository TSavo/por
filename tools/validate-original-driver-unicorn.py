#!/usr/bin/env python3
"""Compare generated traces with ticks executed by the original 8086 ISR.

Requires the optional `unicorn` Python package. This is an independent validation
tool; production generation does not depend on Unicorn.
"""
from __future__ import annotations

import json
import struct
import sys
from pathlib import Path

from unicorn import Uc, UC_ARCH_X86, UC_HOOK_CODE, UC_HOOK_INSN, UC_MODE_16
from unicorn.x86_const import (
    UC_X86_INS_IN, UC_X86_INS_OUT, UC_X86_REG_CS, UC_X86_REG_DS,
    UC_X86_REG_ES, UC_X86_REG_IP, UC_X86_REG_SP, UC_X86_REG_SS,
)

RESIDENT = 0x27F0
ISR = 0x49AD
ISR_EXITS = {0x49E4, 0x49F2}
RECORD_SIZE = 0x30


def mz_image(path: Path) -> bytes:
    data = path.read_bytes()
    if data[:2] != b"MZ":
        raise ValueError("expected a DOS MZ executable")
    return data[struct.unpack_from("<H", data, 8)[0] * 16:]


def validate(executable: Path, expected_path: Path) -> dict:
    expected = json.loads(expected_path.read_text())
    hardware = expected["hardware"]
    event = expected["event"]
    if event < 2:
        raise ValueError("event 0/1 are dispatcher controls; validate numbered events 2..20")
    image = mz_image(executable)
    machine = Uc(UC_ARCH_X86, UC_MODE_16)
    machine.mem_map(0, 0x100000)
    machine.mem_write(0, image)
    state_base = 0xD9 if hardware == "pc-speaker" else 0x273
    table = 0x40B if hardware == "pc-speaker" else 0x4AB

    def read_word(offset: int) -> int:
        return struct.unpack("<H", machine.mem_read(RESIDENT + offset, 2))[0]

    def write_word(offset: int, value: int) -> None:
        machine.mem_write(RESIDENT + offset, struct.pack("<H", value & 0xFFFF))

    write_word(0xAB, event - 1)
    for channel in range(4):
        record = state_base + channel * RECORD_SIZE
        machine.mem_write(RESIDENT + record, bytes(RECORD_SIZE))
        entry = read_word(table + (event - 1) * 8 + channel * 2)
        if entry:
            write_word(record, 1)
            write_word(record + 2, entry)

    ports: dict[int, int] = {}
    writes: list[dict[str, int]] = []
    tick = 0

    def on_out(_uc, port, _size, value, _user):
        ports[port] = value & 0xFF
        if (hardware == "pc-speaker" and port in (0x42, 0x61)) or (hardware == "tandy" and port == 0xC0):
            writes.append({"tick": tick, "port": port, "value": value & 0xFF})

    def on_in(_uc, port, _size, _user):
        return ports.get(port, 0)

    def on_code(uc, address, _size, _user):
        if address in ISR_EXITS:
            uc.emu_stop()

    machine.hook_add(UC_HOOK_INSN, on_out, None, 1, 0, UC_X86_INS_OUT)
    machine.hook_add(UC_HOOK_INSN, on_in, None, 1, 0, UC_X86_INS_IN)
    machine.hook_add(UC_HOOK_CODE, on_code)
    machine.reg_write(UC_X86_REG_CS, 0x27F)
    machine.reg_write(UC_X86_REG_DS, 0x27F)
    machine.reg_write(UC_X86_REG_ES, 0x27F)
    machine.reg_write(UC_X86_REG_SS, 0x9000)
    machine.reg_write(UC_X86_REG_SP, 0xF000)

    for tick in range(expected["ticks"]):
        machine.reg_write(UC_X86_REG_CS, 0x27F)
        machine.reg_write(UC_X86_REG_IP, 0x21BD)
        machine.emu_start(ISR, 0x100000, count=100000)

    wanted = [{"tick": item["tick"], "port": item["port"], "value": item["value"]}
              for item in expected["writes"]
              if (hardware == "tandy" and item["port"] == 0xC0) or
              (hardware == "pc-speaker" and item["port"] in (0x42, 0x61))]
    first_difference = next((index for index, pair in enumerate(zip(writes, wanted)) if pair[0] != pair[1]), None)
    matches = len(writes) == len(wanted) and first_difference is None
    return {
        "schema": 1,
        "hardware": hardware,
        "event": event,
        "ticks": expected["ticks"],
        "originalWrites": len(writes),
        "generatedWrites": len(wanted),
        "exactMatch": matches,
        "firstDifference": first_difference,
        "originalAtDifference": writes[first_difference] if first_difference is not None else None,
        "generatedAtDifference": wanted[first_difference] if first_difference is not None else None,
    }


if __name__ == "__main__":
    if len(sys.argv) < 4:
        raise SystemExit(f"usage: {sys.argv[0]} START.EXE OUTPUT.json GENERATED_TRACE.json...")
    cases = [validate(Path(sys.argv[1]), Path(path)) for path in sys.argv[3:]]
    report = {
        "schema": 1,
        "validator": "Unicorn 16-bit x86 execution of original START.EXE resident ISR",
        "cases": cases,
        "totals": {"cases": len(cases), "exactMatches": sum(case["exactMatch"] for case in cases)},
    }
    output = json.dumps(report, indent=2) + "\n"
    if sys.argv[2] == "-":
        print(output, end="")
    else:
        Path(sys.argv[2]).write_text(output)
    raise SystemExit(0 if all(case["exactMatch"] for case in cases) else 1)
