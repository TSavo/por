# Our build against version 1.3

_Measured on 2026-11-21. Ours is `por-assets/pool` (Internet Archive `POR_EGA`). Version 1.3 is `por-assets/gog-1.3/POOLRAD` (GOG)._

## Which version is which

- The credits text in 1.3 reads "version 1.3" after "SSI Special Projects".
- Ours has nothing there. The Stephen S. Lee guide says no version shown means v1.0.
- The "v1.1" in `docs/AUDIO.md` is the tag of the source reconstruction the sound work was matched against.

## Content

| Part | Result |
| --- | --- |
| Shared files | 130 of 134 are byte-identical |
| Files that differ | `START.EXE`, `GAME.OVR`, `ECL3.DAX`, `POOL.CFG` |
| Script blocks | 28 of 29 are identical |

The one script that differs is New Phlan (`ECL3.DAX` block 0), 3 bytes longer in 1.3. The streams line up, allowing for addresses moved by 3, until script address `0xa42d`. That is the tavern code:

- Ours draws the tale number with `RANDOM 23`, then adds 1: tales 1 to 24.
- 1.3 uses `RANDOM 22`: tales 1 to 23, and three bytes are added just after.

The Adventurer's Journal has 23 tales, so ours can announce a Tavern Tale 24 that does not exist. What the three added bytes do is not yet decoded.

## Program

| | Ours | 1.3 |
| --- | ---: | ---: |
| `START.EXE` on disk | 47,936 bytes, not packed | 65,231 bytes, EXEPACK |
| Load image | 46,992 bytes | 68,592 bytes |
| Entry point | 0000:0006 | 0000:0006 |
| `GAME.OVR` | 232,379 bytes, `TPOV` header | 206,105 bytes, `FBOV` header |
| Overlay slices | 38 | 35 |
| Overlay code | 223,317 bytes | 197,641 bytes |
| Procedures (both prologue forms) | 831 | 788 |
| Instructions in those procedures | 92,594 | 88,537 |

The overlay stubs in the unpacked 1.3 image have the same layout as ours: `CD 3F`, a zero word, the file offset, code size, relocation size and entry count. The `FBOV` file has an 8-byte header where `TPOV` has 4.

### Procedure match

Each procedure was reduced to its instruction sequence with absolute addresses, large constants and jump targets masked, then matched.

| Result | Procedures of ours |
| --- | ---: |
| Identical apart from addresses | 239 |
| At least 90% of instructions the same | 369 |
| 60% to 90% the same | 155 |
| No counterpart in 1.3 | 68 |
| In 1.3 with no counterpart in ours | 25 |

So 608 of our 831 procedures (73%) are the same or nearly the same in 1.3, 155 (19%) changed moderately, and 68 (8%) have no match. 8,112 instructions differ inside the matched-but-changed procedures. Most of the small differences look like a newer compiler's code generation, not source changes; that is an inference and has not been checked procedure by procedure.

The largest unmatched code in ours is in slices 25 and 26 (shared party utilities and menus) and the runtime library. In 1.3 some overlay code has moved into the main program (for example our slice 37 text routine matches a resident procedure).

## What this means for translating 1.3

- The translator needs an EXEPACK unpack step and the `FBOV` header length. The stub scan already fits.
- Script-level bindings (narration, scene art, journal flags) carry over unchanged, except New Phlan positions after `0xa42d`, which move by 3.
- Every binding to a code address or a data-segment address has moved. For the 763 matched procedures the old and new addresses can be paired from the match, and data addresses can be paired from the operands of matched instructions.
