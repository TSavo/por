# Artwork worklist

**72 wall-tile cells still need art. The artwork is done when `npm run verify:art-worklist` reports 0 and nothing is left under "Not established".**

## The short version

Portraits, monsters, scenes and combat pictures are not on this list: this is the first-person view's wall tiles and the outdoor battle terrain.
A cell is one 8 by 8 square of the screen, redrawn at 32 by 32. Most cells below are a shape you have already drawn, standing over a different sky or ground colour
(another hour of the day, another part of the map). So count shapes, not cells:

| Area | Cells to do | Distinct shapes | Shapes you have already drawn over another sky or ground | Shapes with no version yet |
| ---: | ---: | ---: | ---: | ---: |
| 10 Valhingen Graveyard | 72 | 72 | 72 | 0 |
| **All areas** | **72** | **72** | **72** | **0** |

Outdoor battle terrain: 0 cells. Each item below carries `shape` and, where there is one, `sameShapeAs`: the key of your existing art for that shape in the same area.
Start with the shapes you have already drawn: those are the same piece over a new background. Then the shapes with no version yet.

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
| Remaining, all kinds | 72 |
| First-person cells to do | 72 |
|   of which one stored tile | 0 |
|   of which one tile over a solid colour | 0 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 72 |
|   of which the same pixels already have art of yours in another area | 0 |
| Distinct shapes among the first-person cells (the same tiles, whatever sky or ground is behind them) | 72 |
|   of which the area already has your art for that shape over another sky or ground | 72 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 7624 |
|   accounted for by the tool | 7619 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2572 |
|   without (the catalogue's 720 when it was written) | 435 |
|     of those, no map can show | 412 |
|     of those, shown only together with other tiles, never alone | 6 |
|     of those, shown alone in some area | 17 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 328 | 0 | 341 of 341 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 385 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 580 | 402 | 0 | 426 of 426 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | not yet | 415 | 307 |  | 309 of 313 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | yes | 507 | 369 | 0 | 392 of 392 (23 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 182 | 182 | 0 | 190 of 190 (8 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | yes | 220 | 216 | 0 | 216 of 216 |
| 8 | Phlan City Hall | yes | 405 | 295 | 0 | 305 of 305 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 287 | 170 | 0 | 170 of 170 |
| 10 | Valhingen Graveyard | yes | 2452 | 935 | 72 | 947 of 947 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 405 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 313 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 150 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 186 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 326 | 273 | 0 | 306 of 306 (26 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | not yet | 395 | 180 |  | 187 of 188 (7 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 254 | 254 | 0 | 314 of 314 (4 as first views of the next area, 40 as WebGL wall materials, 16 only in unreachable views) |
| 22 | Yarash's Pyramid | yes | 140 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 126 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 312 | 217 | 0 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 51 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 282 | 216 | 0 | 285 of 285 (67 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 50 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 194 | 127 | 0 | 128 of 128 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 660 | 0 | 674 of 674 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 142 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 10: Valhingen Graveyard (72)

Map 10; WALLDEF4 block 21 (tiles 8X8D4 block 211), block 21 set 2 (tiles 8X8D4 block 212), block 20 (tiles 8X8D4 block 20).

#### tile set 8X8D4 block 20 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:3898fa17990cd57625cf675a3015bc875b25064c7d85a37e3bcce70b5c31ae09` | 8X8D4 block 20 tile 36 over 8X8D4 block 20 tile 36 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,6) facing east, column 5 row 5 |  |
| `tile:10:6990f37d31b78e745126e74324635be1d0a8d085625518595a3f89a1a2035f29` | 8X8D4 block 20 tile 35 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,12) facing south, column 8 row 5 |  |
| `tile:10:a8977b97afa61f459633f8b9e788f2572b8bc554a75e6e045a993d7f653468ea` | 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,1) facing east, column 4 row 5 |  |
| `tile:10:b957bddc773e5671ad54a6f38e2a2772d9c19ec1cfc52fefc292840f20107a83` | 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (10,2) facing east, column 1 row 5 |  |

#### tile set 8X8D4 block 211 (38)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:0230c354d077c94bb067a1518e3459f59368028b79fe83911e301c14668682c0` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,1) facing south, column 9 row 5 |  |
| `tile:10:0bad0e2b5d2af6051d106ce3a43b168927a95c02b1aac68d63c451fccaa39716` | 8X8D4 block 211 tile 2 over 8X8D4 block 20 tile 35 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (4,4) facing north, column 10 row 5 |  |
| `tile:10:0efbe0884a485057021b14952eaf5d70eff53d31d842fc2bfe0b3b0ae8a2ae6e` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,2) facing east, column 3 row 5 |  |
| `tile:10:13c35abfdf6e2f63337cbf981fd6c0e3b0d80e8793571be3447f03de99ac48d2` | 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,0) facing west, column 4 row 5 |  |
| `tile:10:2566186bbff8894c8086743ddeacb82fb994708f609fefe9d3baf4ff7485913a` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (10,2) facing east, column 0 row 5 |  |
| `tile:10:2c8762b3b842299664b9729b2ffe3f06415ff0dd374e89ce5827ce5b7bbb5afa` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,13) facing east, column 6 row 5 |  |
| `tile:10:2e66903363838e12834f04de868fd70cab9d16bf21d975bcfff85db508d7dc34` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,2) facing west, column 3 row 5 |  |
| `tile:10:442445e76503311a8ef3b851bc2881483c481792cb99e54649907398d3d7bcc1` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (15,13) facing south, column 6 row 5 |  |
| `tile:10:4c59f6851f748bb902f00fffd77fc9a6b228ac1479d4d8bf4ffdb0250f1b8f24` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,5) facing west, column 6 row 5 |  |
| `tile:10:4c92602675aeab70c1d0c51ccfc2c421fdfdcea35330e0b2a4e27595224d068f` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (11,2) facing north, column 4 row 5 |  |
| `tile:10:55f5c7ee52e6dd27a5f7eeddec5c6d351987e4443d8d9b956f230b509287f7cd` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (0,1) facing north, column 6 row 5 |  |
| `tile:10:5a98d15d66c96a28a87661783ea1a41b420e4dc2c47f07fc0e4d89f855f8bf2e` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (1,0) facing south, column 3 row 5 |  |
| `tile:10:60e742f3495c04a0ae97b497fea40ce220a26138d3b79ee2c5b4256cd8d7832e` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,9) facing west, column 6 row 5 |  |
| `tile:10:685f2a02332f709eed4ceb617260b32b0a3c0825b6db21b814253dc40123734f` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (11,0) facing east, column 6 row 5 |  |
| `tile:10:73e741cdc0f725fa40a069c94abe88abae820d388c3ab1d76361e228eb602524` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (10,1) facing east, column 3 row 5 |  |
| `tile:10:7471ce15963b99ae54bc414500e02bafa55f1d934f785bec8b7787cd6b827dbd` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,0) facing east, column 6 row 5 |  |
| `tile:10:7558048d461f97ee04491a83c78091dd16c72eedbf5a0083da6e0ba77311038b` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (1,2) facing east, column 9 row 5 |  |
| `tile:10:818dc5e2a1dd1ad3653e38017eec08608997781e31c3a191eb749a51d42a1f25` | 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,0) facing west, column 1 row 5 |  |
| `tile:10:821aa6484a790b451b0f543f155e1d4b0bffb4d73f4651fa83dd82406a3cf624` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (0,0) facing south, column 6 row 5 |  |
| `tile:10:854d4d4f9184a479c272cf3cde086c9846b7615afc65285955c030258a1fb6eb` | 8X8D4 block 211 tile 2 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,3) facing east, column 1 row 5 |  |
| `tile:10:8bbdedb8bff145c571b80b475b8a24b9b6fa79c7faceca8982743ce2995f5b63` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (10,2) facing north, column 9 row 5 |  |
| `tile:10:93e7a08d5348cfac6d7a1091d26889a8c1a58b3a3554b52ad47f74e0b690dc4f` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,0) facing east, column 6 row 5 |  |
| `tile:10:9745cef6e8f58737ff2cb02f28e96eb6a26868910bd9a555d96d253174036e5b` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (1,7) facing north, column 6 row 5 |  |
| `tile:10:9765c07cae90e45d3b0511ce2f0624f65e70232f607fd5db91140391092c5fc5` | 8X8D4 block 211 tile 12 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,0) facing east, column 9 row 5 |  |
| `tile:10:9d0d918447e5d1e9123ab7260c003008d2d23053cf81aac3bd7d1cb630c08795` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,11) facing east, column 9 row 5 |  |
| `tile:10:9db02a338b645b1d9acd7ca1a6d83be0696e416ce67428539bb22445f7887fff` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (8,1) facing east, column 3 row 5 |  |
| `tile:10:a3339b0fbf308f9615dda81883294113a6907ab600738f47da0bc13e72ffd3cf` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (1,1) facing south, column 6 row 5 |  |
| `tile:10:ae95b9b4329fb0a1cb23ee2c1d18edc659a858e5f73337f4c10fe3b02e5fc211` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,11) facing east, column 6 row 5 |  |
| `tile:10:b428e03626f15a5c9dcf785cde5c23de128545426e208c95e08069f3a1144a75` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,4) facing south, column 6 row 5 |  |
| `tile:10:bd2f035127cd5cad9edab8b0acc1ec91d8ee293037ca4e45bd47f1b9783af45a` | 8X8D4 block 211 tile 2 over 8X8D4 block 20 tile 36 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,4) facing north, column 7 row 5 |  |
| `tile:10:bff1d5d543a4a8b561a975efb4873e01ad84d238d1279cb2181f4160b1dc527a` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (3,2) facing north, column 9 row 5 |  |
| `tile:10:c0e2c994a812d05c17ca40d1486e3d86fdb3f8e9b35e955797faec920eb813bc` | 8X8D4 block 211 tile 3 over 8X8D4 block 20 tile 36 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,4) facing east, column 9 row 5 |  |
| `tile:10:caa840950c139c8bd5f01bcd0ac2d3634823a3792af755df43047e959e1d0d37` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (12,7) facing south, column 6 row 5 |  |
| `tile:10:cda80d6923b0187ed149f708700b366d7bb47692e6bcb513a0f1e5ee3f920c20` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (4,0) facing south, column 4 row 5 |  |
| `tile:10:ce60d38462a7d38a3a9c7977451c2a2d8f99aca6b58b9f6aba5d47268db13b3f` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (0,4) facing south, column 6 row 5 |  |
| `tile:10:d3f9e54bc4fad08075bafd4c9fc7a0397596f812dc80a9f62fc3c32223b5e1b3` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,13) facing east, column 1 row 5 |  |
| `tile:10:e24c8f1ed4d56508761feb8562527ad0de1b22c0d891eb854ec777421da65c79` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,1) facing west, column 6 row 5 |  |
| `tile:10:fa4781976dcc33f93ebbab024ef2d8e760c9c1faed8d98765f955c09e7be3ab4` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (2,4) facing west, column 9 row 5 |  |

#### tile set 8X8D4 block 212 (30)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:14ed5d87e75720026560cbae96be48ebc95f6ffd979084d801403216dae29673` | 8X8D4 block 212 tile 15 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,10) facing west, column 9 row 5 |  |
| `tile:10:14fe6ca0c21075dd17d692911b6d6c1ccb3c8e571698d0fd247ae29397b567bc` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing east, column 9 row 5 |  |
| `tile:10:2080ccc55373afecfa6a8ac8551dabeb8004c16d8be9db551c814a1f68dbb565` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (8,5) facing north, column 0 row 5 |  |
| `tile:10:29b924eb58ecc8c6752463441855b32dab133e2500b7c15332fdab186b8a3ac9` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 49 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 4 row 5 |  |
| `tile:10:2e77fbcd5408bce2eca31dee94d6f83df6fc23bed6bea08d48b89ffadba3f24c` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,1) facing west, column 1 row 5 |  |
| `tile:10:2f17c19d5d7e1b518537b4ee9ea194c9cae111e851b305bbbc26967b0e5768e4` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (8,0) facing south, column 9 row 5 |  |
| `tile:10:300dba587b80798172c5559eac20a9c4ca38302d39a4b13894b70c104dd615cb` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (8,5) facing north, column 1 row 5 |  |
| `tile:10:33d327521374d03eb42962d9e9c6e00d568cc463d606a993a31ffaff2ae041d6` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,8) facing south, column 0 row 5 |  |
| `tile:10:40de1e72b6a8e728c1e6c6edf3c182e0dde62ba0efe25bdf8da038c347beb452` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,9) facing west, column 9 row 5 |  |
| `tile:10:46943dfcaaef7d5e3fd1e2cf1649976665812f3bec22c3f0cbe1dd46d3112a7c` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,2) facing east, column 10 row 5 |  |
| `tile:10:47304d686cbfe01ba6f8104a9b9779d3e4367c64d40ab03601dc3c2ff1c43956` | 8X8D4 block 212 tile 15 over 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (9,1) facing west, column 4 row 5 |  |
| `tile:10:522c11c62dbcd8775b302812ac697ac801f4ea7cb003cd23e9ac9621694a56ed` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (9,8) facing south, column 9 row 5 |  |
| `tile:10:5b91c1c75a03f3b0a2edc64d96977ff28b57614ab956b61ee02ce9e7c66bc73e` | 8X8D4 block 212 tile 15 over 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,3) facing south, column 1 row 5 |  |
| `tile:10:5c0e05f08eed18f3eef66852e04bf7fcca0eff38990ff3289ac37c0820c696ed` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,1) facing south, column 7 row 5 |  |
| `tile:10:6131c4fa094a55947c94325cd9a6a9492a2ca9c5b8cf6cb66a96e60613c9d78f` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,9) facing west, column 7 row 5 |  |
| `tile:10:731e8c613c0889586b338042b57a79578dd36f5b8bb3ab20a20ef51b57809593` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 2 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (8,5) facing west, column 7 row 5 |  |
| `tile:10:752ec0455514606fca3aaddfa872e0de1c5ff2efc761a1ca764d0761e1e5fa00` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,8) facing east, column 10 row 5 |  |
| `tile:10:7be5456be12449f1453f426d7150b9fcf3665f98413c10802caab22391f64a75` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,2) facing north, column 9 row 5 |  |
| `tile:10:7d330d007beda903f705292c02daacf16d1745dd9f2b313dcb4e956513b8a5ac` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing south, column 3 row 5 |  |
| `tile:10:85d62f577c6fd61e2f4bf5dfb65673e4b0c3bf0dd617ba72115a0dc22c1933f7` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 3 row 5 |  |
| `tile:10:9001c27f1d9901138b735840f000350453b919b1daf45f2b014ffc874794b0b6` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 3 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,3) facing south, column 0 row 5 |  |
| `tile:10:a5f7607d3af5006b27121cea38fca6bb8c000e0becaf030e9c8264dbc54c19eb` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (13,3) facing east, column 8 row 5 |  |
| `tile:10:a6e649a8d31086414945a98b5a9ebad6daeeba24b9cea9ef9522a2929123bdc2` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,2) facing north, column 10 row 5 |  |
| `tile:10:c7034fc729852428f9a0c67c9a9e276475c7583a0196c79247ade748d9efbba5` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 5 row 5 |  |
| `tile:10:c8e8a99dc2cd0e6e43cbbde63fb797c1971ba0a55f54f6f7b6f77edd84af9b17` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (9,9) facing south, column 10 row 5 |  |
| `tile:10:cf2899c7654a681619fb45320a69d7e40233751345cfe8c9bebfad5b1c10d17f` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (5,8) facing east, column 9 row 5 |  |
| `tile:10:e01791b438fe3e263d0941288e7c276919f19b8ae361bd09284b1149a8e59b30` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 17 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (7,1) facing south, column 6 row 5 |  |
| `tile:10:e113a510ebb096a669353ba75e00a4c10ac8bc7130d67ad051f7cf9630d30808` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing east, column 10 row 5 |  |
| `tile:10:e2d74505f288c406a51d644e12b888b73e7d54837c0f20a6bc7958117fd9e0ef` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (11,6) facing south, column 3 row 5 |  |
| `tile:10:fc93009e0db9e618edea70a880198b80dc874a0290f1a07cd878f90ff51540d5` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 14, one of 0, two of 8, two of ground 8) | map 10, square (6,7) facing west, column 0 row 5 |  |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 2994 |
| first-person cells of an area whose reading is not confirmed | 381 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 7 |
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
| 8X8D4 block 1 | 0, 1, 3, 6, 18, 19, 20, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 44, 45, 46, 47, 48, 49, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D4 block 1 | 2, 39 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 1 | 69 | every pixel of it is transparent |
| 8X8D4 block 3 | 4, 5, 8, 9, 10, 14, 15, 16, 17, 20, 23, 24, 29, 41, 44 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 3 | 59, 60 | every pixel of it is transparent |
| 8X8D4 block 9 | 0 | no symbol of the wall definitions loaded with its block names it |
| 8X8D4 block 9 | 1, 2, 4, 5 | every pixel of it is transparent |
| 8X8D4 block 9 | 16, 21, 22, 28, 29, 30, 31, 33, 34, 35, 36, 39, 40, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
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
