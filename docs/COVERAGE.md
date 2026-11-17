# Translation coverage

Counted from `push bp; mov bp, sp` prologues in the TPOV slices and in `START.EXE`.
A procedure is translated when `tools/tp_translate.py` emitted it. Verified means a test executed it and checked a result.

| Unit | Procedures | Translated | Verified |
| --- | ---: | ---: | ---: |
| START.EXE resident | 46 | 5 | 1 (FillChar, `sys5bb_16b5`) |
| GAME.OVR all 38 slices | 757 | 30 (slice 7, ovr+0x78b0) | 1 (`ovl07_0000`, ECL operand fetch) |
| **Total** | **803** | **35** | **2** |

Slice 7 is the one that contains the Pascal strings `Loading...Please Wait`, `ECL`, and `.dax`, and the procedure at `0x0000` that reads ECL operand codes `0x00`, `0x01`, `0x02`, `0x03`, `0x80`, and `0x81`.

The other 37 slices are mapped (file offset, code size, relocation size, entry count) in `docs/overlays.json` and are not translated yet.

System routines translated from segment `0x5BB` because slice 7 calls them: `0x16b5` FillChar, `0x1692` Move, `0x634` string assign, `0x6c1` string append, `0x64e` length-limited string copy.
