# GAME.OVR

`GAME.OVR` is not a DOS MZ overlay tacked onto `START.EXE`. It is a separate file of code segments. The EXE keeps a stub for each segment. Calling a stub executes `int 3Fh`. The handler reads that stub's descriptor, loads the matching slice of `GAME.OVR` over the previous overlay, fixes up relocations, and rewrites each `EA` jump so it points at the routine that is now in memory. Callers keep calling the same far address. Only the five-byte jump changes.

The on-disk slice for one stub is:

```
file offset  = descriptor + 4   (uint32)
code bytes   = descriptor + 8   (uint16)
reloc bytes  = descriptor + 10  (uint16)
```

Phase 1 records the descriptor and can list the slices once an unpacked `START.EXE` is next to `GAME.OVR`. It does not yet apply the relocations or disassemble the slices. That is intentional. REA/Ghidra will do the disassembly on each slice loaded as a raw 16-bit image at the paragraph from the descriptor, and only after the EXE scan says the offsets are real.

## What REA will and will not do with this file

REA's DOS MZ loader understands an MZ image and an optional tail past the image. `GAME.OVR` has neither an MZ header nor a relocation table of the DOS kind. Pointing `rea inspect` at `GAME.OVR` directly is the wrong object: Ghidra would not see the stub descriptors, because those live in `START.EXE`.

The split that matches the tools:

1. Unpack `START.EXE` if EXEPACK is present.
2. `rea inspect` / `rea search` on the unpacked EXE for the `int 3Fh` handler and the opcode dispatch.
3. `npm run tools -- exe` to list stub file offsets.
4. Cut those ranges out of `GAME.OVR` and, if a range is real code, `rea inspect` that slice with an explicit raw 16-bit load. REA can do a headerless image when you tell it the format. It will not invent the overlay table.

This was not run on the game, because the uploaded archive was not in the VM. The tiny MZ in `docs/rea/tiny-mz-summary.json` only proves the DOS loader starts. It has no overlay stubs.

## Size of the unknown

The largest open question for the executable side is the relocation records inside each OVR slice. The descriptor gives a reloc size but not the record width. CotAB's loader walks that area and patches segment words. Until that loop is decompiled from the unpacked PoR (or CotAB) handler, slicing the file gives bytes without a load address you can trust. The DAX and ECL work did not need this, because those formats are data files. Combat math, the text driver, and the save-game layout do need it, which is why they sit in later phases of `ROADMAP.md`.
