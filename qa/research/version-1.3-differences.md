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
- Script-level bindings (narration, scene art, journal flags) carry over unchanged, except New Phlan positions after the edit, which move by 3. (The edit is at `a692`, not `0xa42d`; see "What running 1.3 showed".)
- Every binding to a code address or a data-segment address has moved. For the 763 matched procedures the old and new addresses can be paired from the match, and data addresses can be paired from the operands of matched instructions.

## What carries over, measured

The narration and artwork must not be lost. Almost none of it is tied to anything that moves.

| Work | Keyed by | Count | Effect of moving to 1.3 |
| --- | --- | ---: | --- |
| Tiles and battlefield tiles | Pixel hash | 4,023 keys | None. The art data is identical. |
| Combat sprites, effects, character sheet | Data file and block | 2,160 keys | None. |
| Portraits, illustrations, scoped sprites | Script position | 1,880 keys | 60 are New Phlan positions after `0xa42d` and move by 3. The other 1,820 are unchanged. |
| Narration units | Script position | 1,432 units | 35 touch New Phlan events after the edit and move by 3. The other 1,397 are unchanged. |
| Narration recordings | File | 1,745 files | None. |
| Journal leads | The game's own text | 333 triggers | None. The text is identical. |

The 60 keys are 22 scene illustrations, 24 combat scopes, 9 portraits and 5 encounter sprites. Moving them is a mechanical rename, and the checks that validate every art mapping and every narration unit against the game data will confirm it.

## What running 1.3 showed

Measured on 2026-11-21 with the port running version 1.3. Each line corrects or adds to the sections above.

### The script edit

- The three bytes are not at `0xa42d`. They are at `a692`: New Phlan's tavern brawl ends with `GOTO a609` where the first release has `EXIT`. The instruction is three bytes longer, so the 370 later instructions of that script sit three bytes further on. Every one of them has the same opcode as before.
- The instruction at `a429` differs in an operand only: `RANDOM 17` in the first release, `RANDOM 16` in 1.3. The first release picks from 24 tavern tales, 1.3 from 23.
- Nothing was renamed. The host converts a script position it reads from the running game to the first release's numbering (`src/runtime/bindings.ts`), and all 8,076 artwork keys and 1,432 narration units land on the same instruction in 1.3. With the conversion off, 60 keys and 27 units fail.

### The program

- 846 procedures, not 788: 171 resident and 675 in 35 overlay slices. The first count missed resident code that sits between the overlay stub segments.
- Three overlay slices of the first release are resident in 1.3: slice 25 (combat effects) at segment `0xba`, slice 36 (first-person drawing) at `0x464`, and slice 37 (text) at `0x709`.
- The translator needed two new instruction forms: the interrupt return, and a near call through a register in `MemAvail` and `MaxAvail`, which enter a loop at its test.

### Behaviour that differs

| What | First release | Version 1.3 |
| --- | --- | --- |
| `FlushKeys` before a new screen | Reads and drops every waiting key | Returns at once: its first instruction jumps over the loop |
| Display pages | Text is stored to the visible page and to a second page | Both page variables point at the visible page, so each glyph row is stored twice |
| Tandy title theme and battle music | Requested by the game (sound events 13 and 14) | Never requested, on any hardware |
| Tavern tales | 24 | 23 |
| Brawl ending in New Phlan's tavern | `EXIT` | `GOTO a609` |
| Save directory | From `POOL.CFG` | From `POOL.CFG`; the store release ships its install directory there, so the port sets the paths itself |

The dice differ by exactly one draw. After the title, 1.3 draws one random number to pick its code-wheel question (`Random(13)` in overlay slice 2), and the first release does not. From the same seed, every later number 1.3 draws is the one the first release draws next. Measured with `POR_TRACE_DICE=1` over the first campaign leg: 1,221 draws in the first release, 1,222 in 1.3, and the same callers and ranges in the same order once that one draw is set aside.

A replay (`POR_CLOCK=fixed`) therefore starts 1.3's seed one generator step earlier, so play begins on the same dice in both builds. With that, the 118 screens of the first campaign leg show the same text in both. A played game takes its seed from the time of day, as before.

An earlier version of this note said the dice depend on how long the game waits for a key. That was a guess, and the trace showed it was wrong.

### Sound

- The driver is the same engine at other addresses, with 21 events and a different note format: three bytes per note with the length inline, and only a note for channel 0 starts a tone.
- Events 1 to 12 write exactly the same values to the sound hardware in both builds, on PC speaker and on Tandy. Events 13 to 21 are different sounds: 1.3 replaced the long scores with short ones.
- 1.3 never asks for an event above 12, so every Classic sound file it can play is the file already rendered.
- The renderer matches the original 1.3 interrupt routine under Unicorn for events 2 to 21 on both hardware paths: 40 of 40.
