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
