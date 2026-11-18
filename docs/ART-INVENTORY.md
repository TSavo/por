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
data. The font sheet contains 177 original 8×8 glyphs.

Picture records show the 4× target width and height per frame. The source
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

| Record | Role | 4× dimensions |
| --- | --- | --- |
| `SPRIT2.DAX` block 0 | Three kobold encounter distances | 160×320, 96×260, 96×228 |
| `PIC2.DAX` block 0, member 0, frame 0 | Kobold encounter portrait at (24,24) | 352×352 |
| `CPIC2.DAX` blocks 0 and 128 | Two combat sprites | 96×96 each |
| `MON2CHA.DAX` block 0 | Kobold character record | |

In six captured combat frames, matching all 146 foreground pixels of
`CPIC2.DAX` block 0 identified both horizontal facings. In one frame the five
24×24 sprite origins were (80,104) and (80,128) facing one way, and
(104,104), (104,128), and (128,128) reflected horizontally. Coordinates are
in the original 320×200 framebuffer. Later frames retain exact matches as
the combat layout changes. The transparent black pixels were excluded from
matching to allow the sprite to overlap background tiles.

Block 128 was loaded. The alternate VGA pose resolves in both facings in a
controlled framebuffer check using the original block. Sampling during the
recorded Slums fight yielded no exact 24×24 match for this block. Its draw
trigger and the middle and far encounter anchors remain unverified.

The near approach frame matches `SPRIT2.DAX` block 0, member 0, frame 0 at
(48,32). Index zero is skipped and index 13 is drawn black. The browser replay
displayed the 160×320 transparent replacement over the individually enhanced
tiles, then replaced the approach view with the dialogue portrait.

The portrait matched every pixel in the 88×88 image area across 17 successive
encounter captures. The enhanced browser replay showed the replacement in
those 17 frames and removed it on entry to combat. Switching to classic and
back during dialogue preserved the same guest frame.
