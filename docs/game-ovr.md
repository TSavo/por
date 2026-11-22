# GAME.OVR

`GAME.OVR` is not a DOS MZ overlay tacked onto `START.EXE`. It is a separate file of code segments. The EXE keeps a stub for each segment. Calling a stub executes `int 3Fh`. The handler reads that stub's descriptor, loads the matching slice of `GAME.OVR` over the previous overlay, fixes up relocations, and rewrites each `EA` jump so it points at the routine that is now in memory. Callers keep calling the same far address. Only the five-byte jump changes.

The on-disk slice for one stub is:

```
file offset  = descriptor + 4   (uint32)
code bytes   = descriptor + 8   (uint16)
reloc bytes  = descriptor + 10  (uint16)
```

The port applies the relocations and runs the slices: `src/runtime/overlay.ts` copies each slice to its own segment, adds the load paragraph to every word the relocation list names, and runs the translated procedures (`tools/tp_translate.py` disassembled every slice with Capstone). The 38 descriptors are in `docs/overlays.json`; `npm run tools -- exe` lists them from the EXE. REA/Ghidra work on a slice, if wanted, loads it as a raw 16-bit image at the paragraph from the descriptor.

## What REA will and will not do with this file

REA's DOS MZ loader understands an MZ image and an optional tail past the image. `GAME.OVR` has neither an MZ header nor a relocation table of the DOS kind. Pointing `rea inspect` at `GAME.OVR` directly is the wrong object: Ghidra would not see the stub descriptors, because those live in `START.EXE`.

The split that matches the tools:

1. Unpack `START.EXE` if EXEPACK is present.
2. `rea inspect` / `rea search` on the unpacked EXE for the `int 3Fh` handler and the opcode dispatch.
3. `npm run tools -- exe` to list stub file offsets.
4. Cut those ranges out of `GAME.OVR` and, if a range is real code, `rea inspect` that slice with an explicit raw 16-bit load. REA can do a headerless image when you tell it the format. It will not invent the overlay table.

This was not run on the game, because the uploaded archive was not in the VM. The tiny MZ in `docs/rea/tiny-mz-summary.json` only proves the DOS loader starts. It has no overlay stubs.

## Size of the unknown

The relocation record width is settled: the read routine at `591f` in `START.EXE` walks the area one word at a time (`lodsw; add word es:[bx], di`; see `docs/PORT.md`). The descriptor gives the relocation byte count, so each slice has `reloc bytes / 2` entries.
