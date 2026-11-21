# Roadmap

## Current port status

The browser runs the original campaign through the translated DOS runtime.
Original character creation, exploration, combat, spells, and saving have
all been exercised. [Coverage](docs/COVERAGE.md) records which checks use
ordinary play and which start from controlled saves.

- The unedited party replay creates six characters, participates in Rolf's
  tour, equips the party in New Phlan, completes Ohlo's commission, and
  plays through the Slums and Sokal Keep's hidden armory. The verified
  route uses the original menus and saves. The full unedited campaign
  through the final council reward still needs a continuous replay.
- The original Tyranthraxus fight and City Hall finale have been replayed
  from a controlled party. The ending reward, a completed save reload,
  and Classic/Enhanced switching in Chrome have separate verification.
- `npm run verify:campaign-opening -- <chrome-executable>` runs the opening
  in Enhanced Chrome from an empty save directory through the first Slums
  victory and reload. Each leg carries forward the party earned in play and
  keeps its input saves and key recording under `out/campaign-*`.
- `npm run verify:campaign -- <chrome-executable>` continues the party through
  Ohlo’s commission, the voyage to Sokal Keep, and the hidden armory. It reloads
  the earned equipment in slot F, then returns to New Phlan for temple healing
  and evoker recruitment, then reloads the party beyond the undead patrol at
  Sokal Keep. Resume with `--from-slums <slot-D>`, `--from-sokal <slot-A>`,
  `--from-sokal-armory <slot-F>`, or `--from-evoker <slot-H>`. Use `--replay-leg <directory>`
  to rerun a recorded leg independently in Chrome and compare its final frame.
- The Encamp journal tracks witnessed clues and the selected commission in
  the active save slot. The art inventory tracks individual replacements,
  placement metadata, and observed gaps. [Art inventory](docs/ART-INVENTORY.md)
  describes how to generate it and feed it route traces.
- Current artwork work prioritizes scene illustrations, portraits, and
  encounter and combat sprites.

## Original engineering plan

The phase descriptions below record the early plan. Their status labels
are from that stage of development. Use the coverage log for current
verification and limitations.

The goal is a full playthrough of Pool of Radiance, start to finish, with a second presentation the player can flip on with one key and no change to the story state. Phase 1 is the formats, the tools, and a shell that already keeps rules away from pixels. Everything under "not started" is still that: not started.

Status words mean what they say. "Skeleton" means the data loads and one path runs. It does not mean the system is faithful yet.

## Phase 1 — Map the binary and translate the first procedures

Status: **started on the real Pool of Radiance files.** The archive hash is `6950e9ca62e8a034ecd300e2233a81135c52872bf3c564f74dd99edba004346b`.

Done, from this game's bytes:

- `GAME.OVR` is TPOV. 38 slices mapped in `docs/overlays.json`. The resident reader at `START.EXE` `0x591f` seeks, reads, and applies word fixups.
- `START.EXE` is an unpacked MZ (no EXEPACK). REA/Ghidra lists 175 procedures.
- Mechanical translator `tools/tp_translate.py`. 30 procedures in overlay slice 7 and 5 System-unit routines emitted as instruction switches.
- Verified by execution: FillChar (`5bb:16b5`) and the ECL operand fetch (`ovl07_0000`).

Asset inspection and export use the analysis tools in `src/lib/dax.ts`, `ecl.ts`, `picture.ts`, `world.ts`, and `files.ts`. The browser draws the translated runtime's EGA output.

Not done:

- Translate the other 37 slices, including the DAX file opener behind `int 3Fh` (`lcall 0x1d7:0x703`)
- Run `ovl07_0353` (the procedure that builds `ECL` + area + `.dax` and copies the block) on a real file
- Ghidra decompiler output for the overlays. REA's decompiler folded the stub table into `entry` and does not see `GAME.OVR` as part of the MZ. Disassembly is the path that is working.

The pictures in a format-check run are only as good as the directory you point at. See the README.

## Phase 2 — Character creation

Status: **not started.**

Roll attributes, race, class, alignment, and the portrait picker. Spells known at first level. The PoR character record is the thing CotAB later imports; its field layout should be taken from the unpacked save/load code, not invented from the later game. Creation is a session mutation. Both presentations read the same record.

## Phase 3 — Exploration

Status: **skeleton.**

The shell already steps on a 16×16 map and blocks on a facing wall. Still missing: doors and secret doors (the two-bit extra field), stairs, area changes, wilderness (different map and no 3D window), the area map on symbol set 4, rest, time, and the encounter distance counter. `LOAD FILES` has to actually bind the GEO and WALLDEF the script names.

## Phase 4 — ECL completeness

Status: **partial.**

Opcodes that run: GOTO, GOSUB, RETURN, COMPARE, the six IFs, ADD/SUB/MUL/DIV, SAVE, PRINT, PRINTCLEAR, and a few no-ops. Menus, input, pictures, new-script, treasure, and calls halt on purpose. Finishing this phase is implementing each halted opcode against the decompiled handler, then diffing PoR's dispatch so a CotAB-only opcode is not silently reused. The disassembler already stops when the bytes disagree.

## Phase 5 — Tactical combat

Status: **not started.**

The combat icon decoder writes a PNG. The fight itself does not exist: initiative, the grid, movement, melee, ranged, morale, and the end-of-combat return into the script. `COMBAT`, `LOAD MONSTER`, and `DAMAGE` are the script edge. The map and the participants belong to the session. Classic draws the small icons in the 3D frame; upgraded may draw larger ones for the same participant id.

## Phase 6 — Spells

Status: **not started.**

Books, memorization, components, and the area and combat effects. `SPELL` is an opcode and nothing more today. Saving throws and THAC0 live here too, because spells and attacks share them.

## Phase 7 — Saves

Status: **not started.**

Read and write the original save so a party from the DOS game loads, and write a documented engine save that does not include presentation mode. The original record layout comes from the unpacked load routine.

## Phase 8 — Classic audio and the real UI font

Status: **not started.**

PC speaker / ADL cues as sound ids. The 8×8 font used for messages, lifted from the EXE or from the symbol set, so classic mode does not depend on an HTML font for story text.

## Phase 9 — Upgrade pipeline

Status: **seam only.**

Ids, manifest, and the F10 switch exist. The art pass is still ahead:

- Author replacement PNGs keyed by `pic:`, `glyph:`, `scene:title`, and `scene:viewport`
- A checker that fails the build when an override's pixel size is incompatible with the slot it fills
- Upgraded combat frames and UI widgets that emit the same intents
- Per-id fallback test: delete one PNG, confirm that id returns to EGA and the others stay upgraded
- Audio replacements on the same ids

No override ships in this repo. The manifest is empty.

## Phase 10 — The whole campaign

Status: **not started.**

New Phlan through the end, including the slavelord chain, as a playthrough on the classic presentation, then the same save opened in upgraded mode at an arbitrary fight. After that, a second campaign that is only data and scripts. That last step is why the engine is not allowed to special-case Phlan in code.
