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

- `src/translated/ovl00.ts` through `ovl37.ts` — every prologue in all 38 slices, including the 7-byte empty unit. Slice 7 (`ovl07.ts`, `GAME.OVR+0x78b0`) still has the ECL operand fetch `ovl07_0000` and the loader `ovl07_0353`.
- `src/translated/exe.ts` — the entry at image `0x6` through `System.Halt`, plus the resident prologues and the non-prologue routines those call.
- `src/translated/system5bb.ts` — System routines that do not use a stack frame: startup, FillChar, Move, strings, BlockRead, Dispose, Halt.

`npm run verify` executes FillChar and `ovl07_0000` and checks the bytes they write. `npx tsx tools/boot-translated.ts` runs the real entry against the game files.

## What is hand-written

| Piece | Role |
| --- | --- |
| `src/cpu/machine.ts` | 8086 registers, flags, stack, the 1MB image. The BIOS timer byte at `0040:006C` advances with the instruction stream, because Crt waits until that byte changes |
| `src/runtime/far.ts` | far calls, resident image lookup, and the `CD 3F` stub dispatch |
| `src/runtime/overlay.ts` | copies each slice to its own segment above the emulated heap and runs the translated procedure with that CS |
| `src/runtime/dos.ts` | the `int 21h` services the System unit calls, including an advancing DOS clock, plus keyboard `int 16h` and console output |
| `src/runtime/video.ts`, `tools/browser-play.ts`, `tools/play.html`, `tools/play.js` | EGA and browser presentation for the translated runtime |
| `src/lib/assets.ts` | asset ids for the upgraded override manifest |

## What is still scaffolding

`src/lib/dax.ts`, `picture.ts`, `ecl.ts`, `world.ts`, and `files.ts` support asset inspection, image export, and ECL analysis. They are not the game: the game is the translated runtime above.

The translated entry runs the whole game, from the title through play, in the browser (`npm run play`). Resident translated slices use a backing arena above segment `0x9000`, so ordinary `GetMem` calls cannot overwrite an overlay slice's CS-relative strings. DOS `Get Time` advances deterministically so the game's delay loops finish. `npx tsx tools/boot-translated.ts` is the bare boot harness; calling `ovl07_0353` on a fresh machine, without startup state, stops at an untranslated resident far call.

## REA

REA 6.9.0 with Ghidra 12.1.4 loaded `START.EXE` as `dos-mz` / `x86:LE:16:Real Mode`. `rea search . --kind procedures` returned 175 procedures (`docs/rea/start-procedures.json`). `rea decompile` of the entry merged the overlay stub table into one unusable function. A search for the string `GAME.OVR` returned no defined string. `decompile-all` was not a usable map of the overlays, because the overlays are not inside the MZ image. Translation of slice 7 is from disassembly, which is the path that matches this compiler's regular prologues.

## Coverage

See `docs/COVERAGE.md`. All 758 overlay prologues and the resident procedures the translator can close over are emitted. Two of them are checked byte-for-byte on their own; the rest are exercised by the replays listed there, which play the game from the title onward.
