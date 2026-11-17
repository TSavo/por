# How this port is made

Pool of Radiance was compiled with unoptimized Turbo Pascal. `GAME.OVR` begins with the four bytes `TPOV`. The resident loader in `START.EXE` checks that magic before it installs the overlay interrupt.

```
575f  the open-overlay routine
5788  cmp word [bp-4], 5054h     ; 'TP'
578f  cmp word [bp-2], 564Fh     ; 'OV'
57a1  mov dx, 248h
57a6  mov ax, 253Fh
57a9  int 21h                    ; set vector 3Fh to CS:0248
```

The read routine at `591f` seeks with the dword at `[es+4]`, reads `word [es+8]` code bytes and `word [es+0Ah]` relocation bytes, then adds the program paragraph to each word the relocation list names:

```
597c  lodsw
597d  mov bx, ax
597f  add word es:[bx], di
```

That is the whole fixup format. The 38 descriptors that tile the file (232375 bytes of code plus relocations, plus the 4-byte magic) are in `docs/overlays.json`. Each one starts with `CD 3F` in `START.EXE` and carries the file offset, code size, relocation size, and entry count.

## What is translated

`tools/tp_translate.py` disassembles with Capstone in 16-bit mode and emits one TypeScript `switch` case per instruction. Jumps, near calls, and `retf` stay as control flow. `[bp+n]` and `[bp-n]` stay as those offsets. Absolute operands such as `[0x494e]` stay as those DS addresses. Nothing in the generated files was rewritten from Curse of the Azure Bonds.

Generated:

- `src/translated/ovl07.ts` — 30 procedures in the overlay at `GAME.OVR+0x78b0`. Procedure `ovl07_0000` is the ECL operand fetch (codes `00`, `01`, `02`, `03`, `80`, `81`). Procedure `ovl07_01c8` stores `0x9900` into DS:`0x494e` before it starts reading. That is the PoR script base, and it is whatever the instruction says, not a value copied from the later game.
- `src/translated/system5bb.ts` — five System-unit routines in `START.EXE` segment `0x5BB`: FillChar `16b5`, Move `1692`, string assign `634`, string append `6c1`, bounded string copy `64e`.

`npm run verify` executes FillChar and `ovl07_0000` and checks the bytes they write.

## What is hand-written

| Piece | Role |
| --- | --- |
| `src/cpu/machine.ts` | 8086 registers, flags, stack, the 1MB image that holds DS |
| `src/runtime/far.ts` | far-call table; unknown targets throw with the segment:offset |
| `src/lib/ega.ts`, `src/main.ts`, `src/style.css` | presentation, classic and upgraded |
| `src/lib/assets.ts` | asset ids for the upgraded override manifest |

## What is still scaffolding

`src/lib/dax.ts`, `picture.ts`, `ecl.ts`, `world.ts`, and `files.ts` are hand-written decoders. The browser still uses them to draw the title and the 3D window. They are marked as scaffolding at the top of each file and are not the port. The DAX file procedure `ovl07_0353` is translated but not yet executed: it calls other overlays through `int 3Fh` (`lcall 0x1d7:0x703` and others), and those slices are mapped but not translated.

## REA

REA 6.9.0 with Ghidra 12.1.4 loaded `START.EXE` as `dos-mz` / `x86:LE:16:Real Mode`. `rea search . --kind procedures` returned 175 procedures (`docs/rea/start-procedures.json`). `rea decompile` of the entry merged the overlay stub table into one unusable function. A search for the string `GAME.OVR` returned no defined string. `decompile-all` was not a usable map of the overlays, because the overlays are not inside the MZ image. Translation of slice 7 is from disassembly, which is the path that matches this compiler's regular prologues.

## Coverage

See `docs/COVERAGE.md`. 35 procedures translated, 2 of them executed and checked, out of 803 prologues found in the EXE image and the 38 slices.
