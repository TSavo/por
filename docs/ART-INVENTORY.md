# Original DOS art inventory

Run `npx tsx tools/art-inventory.ts` with the original game files installed.
The command accepts an optional game-data directory and output directory. It
writes `index.html`, `inventory.json`, and a `sheets/` directory to
`out/art-inventory` by default. The previews are generated locally from the
player's files.

| Category | Archives | Blocks | Preview sheets | Frames or glyphs |
| --- | ---: | ---: | ---: | ---: |
| Title and ending | 2 | 10 | 23 | 23 |
| Scene illustrations | 8 | 92 | 325 | 325 |
| Encounter sprites | 8 | 88 | 258 | 258 |
| Character portrait parts | 18 | 293 | 293 | 293 |
| Combat images and icons | 10 | 250 | 250 | 250 |
| Tiles, interface graphics, and EGA font | 10 | 48 | 48 | 3,489 |
| Wall composition | 8 | 38 | | |
| Map geometry | 8 | 29 | | |
| Gameplay data | 41 | 397 | | |
| Total | 113 | 1,245 | 1,197 | 4,638 |

The catalog identifies each block by file, directory index, block ID, and
SHA-256. For multi-record pictures it includes each selector, source dimensions,
frame count, offsets, and preview path. Wall definitions and map geometry
build views from the tiles, so the catalog lists those records as composition
data. The font sheet contains 177 original 8Ã—8 glyphs.

Picture records show the 4Ã— target width and height per frame. The source
offsets are preserved in the catalog as stored in the archive. The browser
handles text through the web font, so the font sheet has no raster target.

The archive inventory accounts for all DAX blocks in the supplied DOS set.
It keeps executable and overlay visuals flagged for a separate audit, including
interface drawing and any embedded graphics. The gallery supports category
filters, text search, and full-size sheets. It also lists 68 literal `PICTURE`
requests found in the ECL scripts. Of those, 43 have a candidate in the
matching picture bank. The JSON retains all candidate banks and nearby script
dialogue for each request. These are static references. Runtime bank changes,
computed picture IDs, and embedded visuals still need tracing.

The gallery includes 78 creature name matches between character records and
same-bank combat pictures with matching IDs. The catalog preserves both file
names. Tyranthraxus is also searchable by his dialogue spelling, which differs
from the original combat record.

Set `POR_TRACE_ART=1` to record original art archive reads in the translated
runner's DOS report. A live Slums replay into the kobold fight confirmed these
records by their payload offsets in the archives.

| Record | Role | 4Ã— dimensions |
| --- | --- | --- |
| `SPRIT2.DAX` block 0 | Three kobold encounter distances | 160Ã—320, 96Ã—260, 96Ã—228 |
| `PIC2.DAX` block 0, member 0, frame 0 | Kobold encounter portrait at (24,24) | 352Ã—352 |
| `CPIC2.DAX` blocks 0 and 128 | Two combat sprites | 96Ã—96 each |
| `MON2CHA.DAX` block 0 | Kobold character record | |

In six captured combat frames, matching all 146 foreground pixels of
`CPIC2.DAX` block 0 identified both horizontal facings. In one frame the five
24Ã—24 sprite origins were (80,104) and (80,128) facing one way, and
(104,104), (104,128), and (128,128) reflected horizontally. Coordinates are
in the original 320Ã—200 framebuffer. Later frames retain exact matches as
the combat layout changes. The transparent black pixels were excluded from
matching to allow the sprite to overlap background tiles.

Block 128 was loaded. The alternate VGA pose resolves in both facings in a
controlled framebuffer check using the original block. Sampling during the
recorded Slums fight yielded no exact 24Ã—24 match for this block. Its draw
trigger remains unverified.

The near approach frame matches `SPRIT2.DAX` block 0, member 0, frame 0 at
(48,32). Index zero is skipped and index 13 is drawn black. The browser replay
displayed the 160Ã—320 transparent replacement over the individually enhanced
tiles, then replaced the approach view with the dialogue portrait.
The near sprite also rendered with a standalone manifest containing no tile
replacements. For the middle and far checks, a controlled replay changed only
the distance argument to overlay 29's original draw procedure at `06d5`.
The matching original sprites appeared at (56,32), and Chrome drew the
96Ã—260 and 96Ã—228 replacements there over the restored environment tiles.
Both runs reached the portrait and original combat menus. This verifies
placement in the renderer. The natural Slums replay selects the near frame.

The portrait matched every pixel in the 88Ã—88 image area across 17 successive
encounter captures. The enhanced browser replay showed the replacement in
those 17 frames and removed it on entry to combat. Switching to classic and
back during dialogue preserved the same guest frame.

The fixed Slums orc outpost uses `CPIC2.DAX` block 4 for the 24Ã—24 guard
sprite. The enhanced renderer matches the original footprint and displays
the 96Ã—96 replacement. Chrome observed it in 12 distinct positions across
the first 15 combat frames. Block 132 has a separate swing PNG. A controlled
framebuffer check verified its placement in both facings. The original attack
pose appears during a calibrated delay between keyboard prompts. The browser
now plays the captured delay frames before showing the next prompt. In the
natural outpost replay, Chrome loaded the 96×96 swing at four separate guest
positions and returned to the stable combat screen after each sequence.

The fixed outpost's natural approach matches `SPRIT2.DAX` block 4,
member 0, frame 0 at (48,32). Its 160Ã—320 transparent replacement uses
the same rust tunic, copper brow, and shield as the combat art, with a
lowered blade for the approach. Chrome verified the sprite over the
individually rendered corridor tiles, then verified its removal on entry
to combat. A controlled replay passed the middle and far distance arguments to the original draw procedure. Chrome displayed the independently drawn 128Ã—260 middle pose at (56,32) and the 64Ã—196 far pose at (64,32), over the same corridor tiles. Both runs reached the original combat menus.

Reproduce the natural orc outpost art check with
`node tools/verify-slums-presentation.mjs PATH_TO_SLOT_C PATH_TO_CHROME orcs`.
Use the fresh party's Slums entrance save at (15,4). The replay verifies all
121 tile images per corridor view, door and rubble junction coverage, the
near approach sprite, and guard artwork across moving combat units. It also
switches presentation in the corridor and in combat and compares both the
guest frame and the save bytes across each switch.
