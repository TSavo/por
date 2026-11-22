# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 0 confirmed cells awaiting art now.**

This file is written by `npm run art:worklist`. Do not edit it or `qa/art-worklist.json` by hand: add art, run the tool, commit what it writes.

To the artwork agent: this list exists to carry your work to 100%, not to correct it. The owner's words are that you have
"done an amazing job of keeping the art consistent in the VGA style, creating all new 32x32 tiles from 8x8 inspirations".
The shipped game will run with no original file, in Enhanced only, so every picture the game can show needs your art, down to each
8 by 8 cell. Your routes found most of them. This tool works out the rest from the game's own maps and wall definitions, so nothing is left to be stumbled on.

## One item, step by step

1. Pick an item below (or from `qa/art-worklist.json`). It gives the exact key and the PNG size. Work through one area and one tile set at a time: the list is in that order.
2. See what you are redrawing: `npm run art:worklist -- --sheets` writes `out/art-worklist/index.html`, each original cell enlarged and
   labelled with its key, grouped as here. The sheets are made from the player's own 1.3 files: set `POR_GAMEDATA` to that directory.
   `out/` is outside version control. Never commit original pixels.
3. Draw it, 32 by 32, in the style of the pieces around it. "Same pixels as" names a PNG of yours that already draws the very same original pixels in another area:
   bind that PNG under the new key if it suits the place, or redraw it for the place.
4. Save the PNG in `upgrades/` and add the key to `"assets"` in `upgrades/manifest.json`, exactly as given.
5. Run `npm run verify:art-worklist`. The item is done when the key is in a manifest and its PNG is there and 32 by 32. It needs no Chrome and no original file. Then check the place in Chrome as you do now: each item says a map square and facing where it shows.
6. Run `npm run art:worklist` and commit the regenerated files with your art.

## Conventions: yours, unchanged

- First-person keys are `tile:<area>:<sha256>`: the area number the game is in, and the SHA-256 of the cell's 64 original palette indices in row order (`upgrades/README.md`).
- A key belongs to one area. The same pixels in another area need their own key there; that key may name the same PNG.
- Battlefield keys are `battle-tile:<sha256>` of one 8 by 8 cell of the battlefield, with no area (`docs/ART-INVENTORY.md`).
- Each tile PNG is 32 by 32. File names are lower case letters, digits, `-` and `_`, ending `.png`; yours are a place and subject and the first 12 hex digits of the hash, such as `kobold-caves-terrain-0a1b2c3d4e5f.png`.
- A piece that is the exact mirror of one you have can be listed under `reflectedTiles` in the manifest, as the two Textile House pieces are.
- New keys go in `upgrades/manifest.json`. `upgrades/slums/manifest.json` is the bundled Slums pack; the main manifest takes precedence over it.

## What not to do

- Do not draw anything under "Not established". Those are not confirmed to appear. They move into the list, or out of it for good, as each is settled.
- Do not add keys for the tiles under "Stored tiles no map can show".
- Do not add keys three lower for New Phlan on 1.3 (`ae66` for `ae69`): see the note at the top of `docs/ART-INVENTORY.md`.
- Do not edit `qa/art-worklist.json`, `qa/art-worklist-cells.json` or this file by hand.

## If the worklist is wrong

If an item cannot occur in play, or art of yours exists under a key the tool does not account for, record it in `qa/art-worklist-notes.md`
(one line: the key, what you saw, where) and commit it. Whoever maintains `tools/art-worklist.ts` reads that file and fixes the tool.
The table below says, for each area, how many of your existing keys the tool accounts for. An area where it cannot account for all of them is not listed for work,
and its unaccounted keys are in `qa/art-worklist.json` under `areas[].unaccountedKeys`.

## Totals

| What | Count |
| --- | ---: |
| Remaining, all kinds | 0 |
| First-person cells to do | 0 |
|   of which one stored tile | 0 |
|   of which one tile over a solid colour | 0 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 0 |
|   of which the same pixels already have art of yours in another area | 0 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 7420 |
|   accounted for by the tool | 7415 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2553 |
|   without (the catalogue's 720 when it was written) | 454 |
|     of those, no map can show | 412 |
|     of those, shown only together with other tiles, never alone | 6 |
|     of those, shown alone in some area | 36 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 308 | 0 | 321 of 321 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 385 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 580 | 382 | 0 | 406 of 406 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | not yet | 415 | 307 |  | 309 of 313 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | yes | 507 | 369 | 0 | 392 of 392 (23 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 182 | 182 | 0 | 190 of 190 (8 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | yes | 220 | 216 | 0 | 216 of 216 |
| 8 | Phlan City Hall | yes | 405 | 295 | 0 | 305 of 305 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 287 | 150 | 0 | 150 of 150 |
| 10 | Valhingen Graveyard | yes | 2452 | 890 | 0 | 902 of 902 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 405 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 313 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 150 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 186 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 326 | 253 | 0 | 286 of 286 (26 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | not yet | 395 | 180 |  | 187 of 188 (7 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 500 | 253 | 0 | 275 of 275 (22 as WebGL wall materials) |
| 22 | Yarash's Pyramid | yes | 140 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 126 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 312 | 217 | 0 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 51 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 301 | 216 | 0 | 285 of 285 (67 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 50 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 194 | 107 | 0 | 108 of 108 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 640 | 0 | 654 of 654 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 142 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

Nothing is listed.

## To do: battlefield cells

The battlefield is drawn from 24 by 24 pictures, each nine cells. SQRPACI.DAX holds the battlefield's two picture slots; DUNGCOM.DAX and WILDCOM.DAX are pictures too (terrain for fights indoors and outdoors,
24 by 24, 25 and 34 of them), not game content: the art inventory's listing of them as game data is the one that was wrong.

| Archive | What it is | Pictures | Distinct cells | With art | To do | Not established |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| DUNGCOM.DAX | terrain pictures of fights indoors; the game copies them into the battlefield's picture slots | 25 | 59 | 59 | 0 | 0 |
| WILDCOM.DAX | terrain pictures of fights outdoors; the game copies them into the battlefield's picture slots | 34 | 239 | 0 | 0 | 239 |
| SQRPACI.DAX | the battlefield's two picture slots as stored (overlay 11 loads blocks 1 and 2; the terrain draw takes its frames from them) | 256 | 1667 | 0 | 0 | 1667 |
| BACPAC.DAX | 40 pictures of 24 by 24 that no artwork key names; where the game draws them is not read yet | 40 | 301 | 0 | 0 | 301 |

## Not established

Do not start on these. Each is something the tool could not confirm can appear, with the reason. None is in the count above and none is dropped.

| What | Count |
| --- | ---: |
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 3221 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 172 |
| first-person cells of an area whose reading is not confirmed | 381 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 111 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 72 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Areas not confirmed, and why:

- Area 3 (Valjevo Castle): 4 of the 313 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 20 (The Slums): 1 of the 188 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 25 (Wilderness, west): only 22 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.
- Area 27 (Wilderness, east): only 22 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.

### Other pictures no key names

Every picture frame of the 1.3 files outside the tile sets and the battlefield that no artwork key names. Whether the game shows each has to be seen in play before art is commissioned
(`docs/ART-INVENTORY.md` says the same of secondary members), so none is counted as to do.

| Frame (archive:block:member:frame) | Size | What it is | Key form and PNG size | What is known |
| --- | --- | --- | --- | --- |
| FINAL5.DAX:1:0:0 | 120x120 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:2:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:2:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:2:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:2:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:3:0:0 | 120x120 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:4:0:0 | 56x32 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:5:0:0 | 16x48 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:6:0:0 | 16x48 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:4:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:7:5:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:4:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| FINAL5.DAX:8:5:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding |
| HEAD6.DAX:1:0:0 | 88x40 | a portrait head | `portrait:HEAD6.DAX:1:BODYn.DAX:<body> for each body it is shown with, or character-sheet:HEAD6.DAX:1` 352x352 for a portrait; 352 wide for a sheet part | the scripts do not name it; the program draws it, and where has not been read |
| HEAD6.DAX:3:0:0 | 88x40 | a portrait head | `portrait:HEAD6.DAX:3:BODYn.DAX:<body> for each body it is shown with, or character-sheet:HEAD6.DAX:3` 352x352 for a portrait; 352 wide for a sheet part | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:0:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:128:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:1:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:129:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:2:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:130:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| PIC2.DAX:71:0:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC2.DAX:71:0:0` 352x352 | no PICTURE 71 with a plain number is in a script of archive 2 |
| PIC2.DAX:71:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC2.DAX:71:1:0` 352x352 | no PICTURE 71 with a plain number is in a script of archive 2 |
| PIC2.DAX:71:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC2.DAX:71:2:0` 352x352 | no PICTURE 71 with a plain number is in a script of archive 2 |
| PIC2.DAX:71:3:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC2.DAX:71:3:0` 352x352 | no PICTURE 71 with a plain number is in a script of archive 2 |
| PIC4.DAX:9:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:9:1:0` 352x352 | no PICTURE 9 with a plain number is in a script of archive 4 |
| PIC4.DAX:9:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:9:2:0` 352x352 | no PICTURE 9 with a plain number is in a script of archive 4 |
| PIC4.DAX:9:3:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:9:3:0` 352x352 | no PICTURE 9 with a plain number is in a script of archive 4 |
| PIC4.DAX:18:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:18:2:0` 352x352 | no PICTURE 18 with a plain number is in a script of archive 4 |
| PIC4.DAX:18:4:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:18:4:0` 352x352 | no PICTURE 18 with a plain number is in a script of archive 4 |
| PIC4.DAX:72:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:72:1:0` 352x352 | no PICTURE 72 with a plain number is in a script of archive 4 |
| PIC4.DAX:72:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:72:2:0` 352x352 | no PICTURE 72 with a plain number is in a script of archive 4 |
| PIC4.DAX:72:3:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:72:3:0` 352x352 | no PICTURE 72 with a plain number is in a script of archive 4 |
| PIC4.DAX:72:4:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:72:4:0` 352x352 | no PICTURE 72 with a plain number is in a script of archive 4 |
| PIC4.DAX:72:5:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC4.DAX:72:5:0` 352x352 | no PICTURE 72 with a plain number is in a script of archive 4 |
| PIC5.DAX:56:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC5.DAX:56:2:0` 352x352 | no PICTURE 56 with a plain number is in a script of archive 5 |
| PIC6.DAX:65:0:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC6.DAX:65:0:0` 352x352 | no PICTURE 65 with a plain number is in a script of archive 6 |
| PIC6.DAX:65:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC6.DAX:65:1:0` 352x352 | no PICTURE 65 with a plain number is in a script of archive 6 |
| PIC6.DAX:117:5:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC6.DAX:117:5:0` 352x352 | a PICTURE 117 is in the script of area 19 at 9aec, area 19 at 9c7d, area 19 at a142, area 19 at a285; this is member 5 frame 0 of the record, and which members a PICTURE draws must be seen in play |
| PIC7.DAX:51:0:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:51:0:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 7 |
| PIC7.DAX:51:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:51:1:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 7 |
| PIC7.DAX:51:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:51:2:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 7 |
| PIC7.DAX:51:3:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:51:3:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 7 |
| PIC7.DAX:51:4:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:51:4:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 7 |
| PIC7.DAX:69:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC7.DAX:69:2:0` 352x352 | no PICTURE 69 with a plain number is in a script of archive 7 |
| PIC8.DAX:51:0:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC8.DAX:51:0:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 8 |
| PIC8.DAX:51:1:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC8.DAX:51:1:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 8 |
| PIC8.DAX:51:2:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC8.DAX:51:2:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 8 |
| PIC8.DAX:51:3:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC8.DAX:51:3:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 8 |
| PIC8.DAX:51:4:0 | 88x88 | a picture of the 88 by 88 window | `portrait:PIC8.DAX:51:4:0` 352x352 | no PICTURE 51 with a plain number is in a script of archive 8 |
| SPRIT1.DAX:9:2:0 | 32x57 | an approach sprite | `encounter:SPRIT1.DAX:9:2:0, with its placement under "encounters"` 128x228 | no PICTURE 9 with a plain number is in a script of archive 1 |
| SPRIT2.DAX:1:0:0 | 40x80 | an approach sprite | `encounter:SPRIT2.DAX:1:0:0, with its placement under "encounters"` 160x320 | no PICTURE 1 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:0:0 | 48x73 | an approach sprite | `encounter:SPRIT2.DAX:71:0:0, with its placement under "encounters"` 192x292 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:1:0 | 40x65 | an approach sprite | `encounter:SPRIT2.DAX:71:1:0, with its placement under "encounters"` 160x260 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:2:0 | 24x57 | an approach sprite | `encounter:SPRIT2.DAX:71:2:0, with its placement under "encounters"` 96x228 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT6.DAX:10:0:0 | 88x88 | an approach sprite | `encounter:SPRIT6.DAX:10:0:0, with its placement under "encounters"` 352x352 | no PICTURE 10 with a plain number is in a script of archive 6 |
| SPRIT6.DAX:67:0:0 | 88x88 | an approach sprite | `encounter:SPRIT6.DAX:67:0:0, with its placement under "encounters"` 352x352 | no PICTURE 67 with a plain number is in a script of archive 6 |
| SPRIT6.DAX:74:0:0 | 88x88 | an approach sprite | `encounter:SPRIT6.DAX:74:0:0, with its placement under "encounters"` 352x352 | no PICTURE 74 with a plain number is in a script of archive 6 |
| SPRIT6.DAX:119:0:0 | 88x88 | an approach sprite | `encounter:SPRIT6.DAX:119:0:0, with its placement under "encounters"` 352x352 | no PICTURE 119 with a plain number is in a script of archive 6 |
| SPRIT8.DAX:19:0:0 | 24x80 | an approach sprite | `encounter:SPRIT8.DAX:19:0:0, with its placement under "encounters"` 96x320 | no PICTURE 19 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:19:1:0 | 24x65 | an approach sprite | `encounter:SPRIT8.DAX:19:1:0, with its placement under "encounters"` 96x260 | no PICTURE 19 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:19:2:0 | 16x49 | an approach sprite | `encounter:SPRIT8.DAX:19:2:0, with its placement under "encounters"` 64x196 | no PICTURE 19 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:113:0:0 | 88x88 | an approach sprite | `encounter:SPRIT8.DAX:113:0:0, with its placement under "encounters"` 352x352 | no PICTURE 113 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:116:0:0 | 88x88 | an approach sprite | `encounter:SPRIT8.DAX:116:0:0, with its placement under "encounters"` 352x352 | no PICTURE 116 with a plain number is in a script of archive 8 |

## Stored tiles no map can show

These tiles are in the 8 by 8 tile sets and no first-person view of any map can put them on screen, for the reason given. They need no art. Do not add keys for them.
The proof is by trying: the tool draws the view from every square of every map, facing each way, with the wall sets each script loads beside that map, and these tiles are in none of those views.
It holds as far as the tool's reading of each area holds: for the areas marked "not yet" above (Valjevo's areas 3, 5 and 7 above all) a tile of their sets listed here may yet turn out to be shown.

| Tile set | Tiles | Why no view shows them |
| --- | --- | --- |
| 8X8D1 block 1 | 0, 1, 3, 6, 17, 18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D1 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D1 block 1 | 69 | every pixel of it is transparent |
| 8X8D1 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D1 block 3 | 53 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D1 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D1 block 202 | 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30 | a symbol of the overhead view's bank that the overhead view never draws (it draws the 16 wall patterns and 4 arrows); other screens may draw it, which the tool has not read |
| 8X8D1 block 203 | 0, 2 | a tile of the shared bank that no wall definition a script loads names; the screen frame is drawn from this bank outside the view, where no artwork key applies |
| 8X8D2 block 1 | 0, 1, 3, 6, 18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D2 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D2 block 1 | 69 | every pixel of it is transparent |
| 8X8D2 block 4 | 48 | no symbol of the wall definitions loaded with its block names it |
| 8X8D2 block 9 | 0 | no symbol of the wall definitions loaded with its block names it |
| 8X8D2 block 9 | 1, 2, 4, 5 | every pixel of it is transparent |
| 8X8D2 block 9 | 17, 18, 19, 20, 41, 42, 50, 51, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D2 block 19 | 18 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D2 block 19 | 23 | no symbol of the wall definitions loaded with its block names it |
| 8X8D2 block 23 | 0, 1, 2, 3, 4, 6, 7, 8, 10, 12, 13, 20, 21, 25, 42, 43, 44, 45, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D2 block 23 | 41 | no symbol of the wall definitions loaded with its block names it |
| 8X8D3 block 1 | 0, 1, 3, 4, 5, 6, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D3 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D3 block 1 | 69 | every pixel of it is transparent |
| 8X8D3 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D3 block 3 | 11, 12, 13, 22, 25, 26, 27, 28, 30, 31, 33, 34, 40, 42, 43, 53, 56, 57, 58, 61, 62, 64, 65, 66, 67, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D3 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D3 block 5 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D3 block 101 | 17 | no symbol of the wall definitions loaded with its block names it |
| 8X8D3 block 101 | 48, 53 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D3 block 102 | 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D3 block 103 | 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D4 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 1 | 6, 18, 26, 34, 35, 44, 45, 47, 48, 49, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D4 block 1 | 69 | every pixel of it is transparent |
| 8X8D4 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D4 block 9 | 0 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 9 | 1, 2, 4, 5 | every pixel of it is transparent |
| 8X8D4 block 9 | 16, 21, 22, 59, 60 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D4 block 20 | 2, 3, 4, 5, 6, 12, 13, 14, 15, 22, 29, 37, 38, 39, 40, 43, 50, 51, 52, 53, 54, 55 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D4 block 20 | 25 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 212 | 54 | no symbol of the wall definitions loaded with its block names it |
| 8X8D5 block 1 | 0, 1, 3, 4, 5, 6, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D5 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D5 block 1 | 69 | every pixel of it is transparent |
| 8X8D5 block 241 | 48 | no symbol of the wall definitions loaded with its block names it |
| 8X8D6 block 1 | 0, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D6 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D6 block 1 | 69 | every pixel of it is transparent |
| 8X8D6 block 2 | 0, 1, 2, 3, 4, 5, 6, 16, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 60, 61, 62, 63, 64, 66, 67, 68, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D6 block 6 | 38, 39, 40, 41, 42, 43, 44, 45, 46, 47 | no symbol of the wall definitions loaded with its block names it |
| 8X8D6 block 6 | 54, 55, 56, 57, 58, 59, 60, 61, 63, 64 | every pixel of it is transparent |
| 8X8D6 block 9 | 0 | no symbol of the wall definitions loaded with its block names it |
| 8X8D6 block 9 | 1, 2, 4, 5 | every pixel of it is transparent |
| 8X8D6 block 9 | 16, 21, 22, 28, 29, 30, 31, 33, 34, 35, 36, 39, 40, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D6 block 17 | 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 16, 18, 20, 21, 31, 37, 39, 40, 41, 42, 43, 44, 45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D6 block 17 | 13, 22, 23, 24, 26, 38, 66, 68, 69 | no symbol of the wall definitions loaded with its block names it |
| 8X8D7 block 1 | 0, 1, 3, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 18, 19, 20, 21, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D7 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D7 block 1 | 69 | every pixel of it is transparent |
| 8X8D7 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D7 block 3 | 18, 19, 21, 22, 27, 28, 30, 32, 33, 34, 35, 36, 37, 38, 39, 40, 42, 43, 45, 46, 47, 48, 49, 50, 51, 52, 54, 55, 56, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D7 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D7 block 7 | 7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 47, 48, 49, 56, 57, 58, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D7 block 8 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 23, 30, 31, 39, 46, 47, 60, 61 | no symbol of the wall definitions loaded with its block names it |
| 8X8D7 block 8 | 24, 25, 26, 27 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D7 block 8 | 37 | every pixel of it is transparent |
| 8X8D7 block 23 | 0, 1, 2, 3, 4, 6, 7, 8, 10, 12, 13, 25, 34, 35, 36, 37, 38, 39, 40, 42, 43, 44, 45, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D7 block 23 | 41 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 1 | 6, 18, 26, 34, 35, 44, 45, 47, 48, 49, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 1 | 69 | every pixel of it is transparent |
| 8X8D8 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D8 block 9 | 0 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 9 | 1, 2, 4, 5 | every pixel of it is transparent |
| 8X8D8 block 9 | 17, 18, 19, 20, 50, 51, 69 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 17 | 12 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 17 | 13, 22, 23, 24, 26, 38, 66, 68, 69 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 11 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 38 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 20 | 2, 3, 4, 22 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 20 | 25 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 23 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 23 | 41 | no symbol of the wall definitions loaded with its block names it |

## Narrated passages with nothing to see

Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.
