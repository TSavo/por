# Artwork worklist

## What to do now

**There is art to do: 104 items.**

1. **Wall tiles: 104 cells to draw, in Phlan City Hall, Stojanow Gate, The Training Hall, Temple of Bane, Temple of Bane, interior.** Each is listed below with its exact key.
2. **Pictures: none.**
3. **Do not draw anything under "Not established".** Those cells are not confirmed to appear. The QA owner is settling them by play and moves each one that proves real into item 1.

The artwork is done when items 1 and 2 are none and nothing is left under "Not established".

## The short version

This file covers the first-person view's wall tiles, the outdoor battle terrain, and any picture frame no artwork key names yet.
A cell is one 8 by 8 square of the screen, redrawn at 32 by 32. Most cells below are a shape you have already drawn, standing over a different sky or ground colour
(another hour of the day, another part of the map). So count shapes, not cells:

| Area | Cells to do | Distinct shapes | Shapes you have already drawn over another sky or ground | Shapes with no version yet |
| ---: | ---: | ---: | ---: | ---: |
| 8 Phlan City Hall | 31 | 31 | 30 | 1 |
| 11 The Training Hall | 31 | 31 | 30 | 1 |
| 24 Temple of Bane | 27 | 27 | 26 | 1 |
| 9 Stojanow Gate | 12 | 11 | 10 | 1 |
| 31 Temple of Bane, interior | 3 | 3 | 2 | 1 |
| **All areas** | **104** | **103** | **98** | **5** |

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
| Remaining, all kinds | 104 |
| First-person cells to do | 104 |
|   of which one stored tile | 0 |
|   of which one tile over a solid colour | 56 |
|   of which plain sky or ground | 1 |
|   of which several tiles together | 47 |
|   of which the same pixels already have art of yours in another area | 100 |
| Distinct shapes among the first-person cells (the same tiles, whatever sky or ground is behind them) | 103 |
|   of which the area already has your art for that shape over another sky or ground | 98 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 7784 |
|   accounted for by the tool | 7784 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2574 |
|   without (the catalogue's 720 when it was written) | 433 |
|     of those, no map can show | 412 |
|     of those, shown only together with other tiles, never alone | 6 |
|     of those, shown alone in some area | 15 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 328 | 328 | 0 | 341 of 341 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 181 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 402 | 402 | 0 | 426 of 426 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | yes | 341 | 307 | 0 | 313 of 313 (6 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | yes | 433 | 369 | 0 | 392 of 392 (23 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 182 | 182 | 0 | 190 of 190 (8 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | yes | 216 | 216 | 0 | 216 of 216 |
| 8 | Phlan City Hall | yes | 326 | 295 | 31 | 305 of 305 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 206 | 170 | 12 | 170 of 170 |
| 10 | Valhingen Graveyard | yes | 1007 | 1007 | 0 | 1019 of 1019 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 326 | 295 | 31 | 295 of 295 |
| 13 | The Kobold Caves | yes | 211 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 90 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 164 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 273 | 273 | 0 | 306 of 306 (26 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | yes | 288 | 268 | 0 | 276 of 276 (8 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 254 | 254 | 0 | 314 of 314 (4 as first views of the next area, 40 as WebGL wall materials, 16 only in unreachable views) |
| 22 | Yarash's Pyramid | yes | 87 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 78 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 244 | 217 | 27 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 42 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 214 | 214 | 0 | 285 of 285 (69 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 41 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 127 | 127 | 0 | 128 of 128 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 660 | 0 | 674 of 674 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 94 | 91 | 3 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 8: Phlan City Hall (31)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 5 row 5 | `slums-confirmed-cell-d20d585641c6.png` (area 0, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 18, 20, 21, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:45f5e38f7219ffc606ba569d2abe5be146d8630bf8dcde674e3c28c3ce4e621a` | 8X8D1 block 203 tile 17 over sky colour 0 | map 0, square (0,0) facing north, column 0 row 0 | `sokal-night-cell-45f5e38f7219.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |
| `tile:8:b03fbca109ab749692421d27e7e24a728523604f8fd1580a98748b76cb2ce15c` | 8X8D1 block 203 tile 16 over sky colour 0 | map 0, square (0,0) facing south, column 10 row 0 | `sokal-night-cell-b03fbca109ab.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |

#### tile set 8X8D3 block 101 (10)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:046ad3c1e78ac7354ca7e0401cab3e3dc4ca27e8cf49682c378b105f05b70715` | 8X8D3 block 101 tile 4 over sky colour 0 | map 0, square (4,1) facing south, column 10 row 0 | `podal-shrine-side-lanes-terrain-046ad3c1e78a.png` (area 0, 18) |
| `tile:8:1091af6ef7ffd2d40436f31ed8b4bded8191f728b08f77a211b9dbaee6bf6fe1` | 8X8D3 block 101 tile 7 over 8X8D3 block 101 tile 7 over sky colour 0 | map 0, square (4,1) facing west, column 6 row 1 | `phlan-fallback-0-1091af6ef7ff.png` (area 0) |
| `tile:8:1ee6b545de6112d23c5485b857a3b1b107a19e9849973bb41f16ebd2b39eca85` | 8X8D3 block 101 tile 62 over sky colour 0 | map 0, square (3,4) facing west, column 6 row 4 | `phlan-fallback-0-1ee6b545de61.png` (area 0) |
| `tile:8:487e17f20dbc6c0fb86d6fa47c312eeab0de9abcccfea8cc1fb4188074231bda` | 8X8D3 block 101 tile 6 over 8X8D3 block 101 tile 6 over sky colour 0 | map 0, square (4,1) facing west, column 4 row 1 | `phlan-fallback-0-487e17f20dbc.png` (area 0) |
| `tile:8:52311369c866063e450c48f3773088e549bb6605c8b4acb651f88feafcacae37` | 8X8D3 block 101 tile 61 over sky colour 0 | map 0, square (13,1) facing west, column 1 row 4 | `phlan-fallback-0-52311369c866.png` (area 0) |
| `tile:8:7ef87e5548a82e7c211613cc0266aefa8c3abc711afad60ec9d4cf3b7192c502` | 8X8D3 block 101 tile 9 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 2 | `podal-shrine-side-lanes-terrain-7ef87e5548a8.png` (area 0, 18) |
| `tile:8:98110c9f8d54dd9af58e57336f0644295430d1c2cadda1e17e17c8124ad9dced` | 8X8D3 block 101 tile 16 over sky colour 0 | map 0, square (5,2) facing east, column 9 row 4 | `phlan-fallback-0-98110c9f8d54.png` (area 0) |
| `tile:8:a5f98dc0350255ef6862a6e1a9489d7b92cddde74f79d72b131ce1124ddaf77e` | 8X8D3 block 101 tile 5 over 8X8D3 block 101 tile 5 over sky colour 0 | map 0, square (4,1) facing west, column 3 row 1 | `podal-shrine-side-lanes-terrain-a5f98dc03502.png` (area 0, 18) |
| `tile:8:c7b82d70fda9e7ad0bcc015a14e5a3772c4d1340637697919a7cbb0029718857` | 8X8D3 block 101 tile 65 over sky colour 0 | map 0, square (4,0) facing south, column 8 row 1 | `phlan-fallback-0-c7b82d70fda9.png` (area 0) |
| `tile:8:df1a7dc7e5ee5dc9cb316e587c626701f8e4915ee56b250acf5b30ec7a91a7c8` | 8X8D3 block 101 tile 8 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 1 | `podal-shrine-side-lanes-terrain-df1a7dc7e5ee.png` (area 0, 18) |

#### tile set 8X8D3 block 102 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0067a44f2f0296324a93f2748022da512d25c262b7469fe213ff8aaa19cf3af3` | 8X8D3 block 102 tile 38 over sky colour 0 | map 0, square (4,0) facing west, column 1 row 1 | `phlan-fallback-0-0067a44f2f02.png` (area 0) |
| `tile:8:0f6eabbe54e88f21a2dc14a9f75bd6030a546059e15d4dc2309ff8b7a42f5082` | 8X8D3 block 102 tile 49 over sky colour 0 | map 0, square (0,0) facing east, column 8 row 2 | `slums-confirmed-cell-0f6eabbe54e8.png` (area 0, 3, 4, 5, 6, 7, 20) |
| `tile:8:76b41f0cdc6578c287ba79592b23065544ce123c4f9ec8724e8d312657280772` | 8X8D3 block 102 tile 33 over sky colour 0 | map 0, square (0,0) facing south, column 2 row 2 | `slums-confirmed-cell-76b41f0cdc65.png` (area 0, 3, 4, 5, 6, 7, 20) |

#### tile set 8X8D3 block 103 (15)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:169608062ff1aff8089bf5e0d2b3aee98f4d7bcdb6c9ac5208770245839f5e14` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (14,1) facing east, column 10 row 5 | `phlan-fallback-0-169608062ff1.png` (area 0) |
| `tile:8:601ca0f73a0f934ddf832048da2dbbc3bc9203cc12e77200bb222e236d683764` | 8X8D3 block 103 tile 31 over sky colour 0 | map 0, square (2,2) facing east, column 9 row 4 | `mendor-library-terrain-601ca0f73a0f.png` (area 0, 15) |
| `tile:8:7b8772a162e24dbbfab628febba4c8018354d1997675d518b44e749fa71e1b6b` | 8X8D3 block 103 tile 52 over sky colour 0 | map 0, square (4,1) facing south, column 0 row 3 | `textile-waterfront-side-lanes-terrain-7b8772a162e2.png` (area 0, 2, 15) |
| `tile:8:8a056429f4099504d4208271c9c6416be226c53403a933041f07df132509656b` | 8X8D3 block 103 tile 19 over sky colour 0 | map 0, square (3,2) facing south, column 2 row 3 | `phlan-fallback-0-8a056429f409.png` (area 0) |
| `tile:8:8cc6fb33beebe284ad671b37641293211c29124408b1847a3c5eb3461be2dfa2` | 8X8D3 block 103 tile 45 over 8X8D3 block 103 tile 45 over sky colour 0 | map 0, square (5,1) facing west, column 5 row 3 | `phlan-fallback-0-8cc6fb33beeb.png` (area 0) |
| `tile:8:8e1c4a57f54a26ae024d7708cc6b909ac108666d402f5cd6701f9b74a8a113df` | 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 10 row 5 | `phlan-fallback-0-8e1c4a57f54a.png` (area 0) |
| `tile:8:a981c2e4290d3cfab1275af7b186649c90a2307191e93fd98b463e413040c010` | 8X8D3 block 103 tile 53 over sky colour 0 | map 0, square (5,1) facing north, column 10 row 0 | `new-phlan-training-hall-terrain-a981c2e4290d.png` (area 0, 15) |
| `tile:8:ac6a6e8299ac7fb8877475660d1da710aa61867a1064e5651f070167da55c205` | 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 7 row 5 | `phlan-fallback-0-ac6a6e8299ac.png` (area 0) |
| `tile:8:af99cac6a4bc33650e7528427afc58561f697a7767092c8a9f8194bba299ce12` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 | `phlan-fallback-0-af99cac6a4bc.png` (area 0) |
| `tile:8:c28c98a0416a67be49e6cc43b059d61e24c7e0ab0e5aee6a0dd206e3a368e447` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (12,3) facing north, column 7 row 5 | `phlan-fallback-0-c28c98a0416a.png` (area 0) |
| `tile:8:d7a42c36165673adb0dd94201efa22307a5b7c8710d5a71874597c97f2c553cf` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing north, column 2 row 5 | `phlan-fallback-0-d7a42c361656.png` (area 0) |
| `tile:8:dd5258c1ed754a783abd6880bcc02737c21b61f9f6526f50342e44daacd14782` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,1) facing south, column 1 row 5 | `phlan-fallback-0-dd5258c1ed75.png` (area 0) |
| `tile:8:e89a43156711377f65cb66bf9e3c92475d547ac90e8f976baef57e12b150fd06` | 8X8D3 block 103 tile 7 over 8X8D3 block 103 tile 7 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,2) facing north, column 5 row 5 | `phlan-fallback-0-e89a43156711.png` (area 0) |
| `tile:8:eaaf3eda22c409df59d46965bfbaa114fdfce2600636b7f78fb7a4c61b6ed7a7` | 8X8D3 block 103 tile 6 over sky colour 0 | map 0, square (2,2) facing east, column 10 row 3 | `phlan-fallback-0-eaaf3eda22c4.png` (area 0) |
| `tile:8:fda35ec7d9df04aeebd70aad095944df1c6a3e311c4f49c7cb25814d73ad0766` | 8X8D3 block 103 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (2,0) facing west, column 6 row 5 | `phlan-fallback-0-fda35ec7d9df.png` (area 0) |

### Area 9: Stojanow Gate (12)

Map 9; WALLDEF2 block 1 (tiles 8X8D2 block 1), block 9 (tiles 8X8D2 block 9), block 23 (tiles 8X8D2 block 23).

#### plain sky, horizon and ground (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:7885d9787cff36149f5166f2ad9167505a15fc132f946d6c7938f867d940326d` | sky colour 11 | map 9, square (4,0) facing north, column 1 row 0 | `room-tile-01.png` (area 0, 1, 2, 3, 4, 5, 6, 8, 11, 14, 15, 16, 17, 18, 20, 21, 24, 25, 26, 27, 28, 29, 31) |
| `tile:9:8bcc06efdf06b3769418465aeb92a19e990cc54c212c2e7af5c4fe0897b17b35` | the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 9, square (4,0) facing south, column 5 row 5 | `orc-joint-fe0897b17b35.png` (area 0, 1, 2, 3, 4, 5, 6, 8, 11, 14, 15, 16, 17, 18, 20, 21, 24, 26, 28, 31) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:0bae672ff3e01f653ae7241fc075226c0865693834d5c45e6f2863678a2526da` | 8X8D1 block 203 tile 16 over sky colour 11 | map 9, square (4,0) facing north, column 10 row 0 | `room-tile-02.png` (area 0, 2, 3, 4, 5, 6, 8, 11, 14, 15, 18, 20, 21, 24, 29, 31) |
| `tile:9:323c71332298aeae05cfee4eb5855d831835c8a068440a0f21f6f96ee43b2f9b` | 8X8D1 block 203 tile 17 over sky colour 11 | map 9, square (4,0) facing north, column 0 row 0 | `room-tile-00.png` (area 0, 2, 3, 4, 5, 6, 8, 11, 14, 15, 18, 20, 21, 24, 26, 29, 31) |

#### tile set 8X8D2 block 9 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:2795a504ca67152aac8296d4f1e16f70523c5cf25af04d218c8cde895f0db0f0` | 8X8D2 block 9 tile 49 over sky colour 11 | map 9, square (8,6) facing west, column 0 row 3 | `lizardman-upper-keep-cell-2795a504ca67.png` (area 16, 21, 28) |
| `tile:9:3aba0bc3a1f0358e649df430098738004297a0554176b8d049704de805a60256` | 8X8D2 block 9 tile 26 over sky colour 11 | map 9, square (1,4) facing east, column 9 row 4 | `zhentil-east-yard-terrain-3aba0bc3a1f0.png` (area 16, 21, 28) |
| `tile:9:6182286c97e2af8cf47fcf4321d9b562df43cfb3c35ee22574e9528275ea8a7d` | 8X8D2 block 9 tile 56 over sky colour 11 | map 9, square (7,6) facing east, column 10 row 3 | `lizardman-upper-keep-cell-6182286c97e2.png` (area 16, 21, 28) |
| `tile:9:642de7080d4eaa04eae4856a132c0a8f4ecb586738b11bedc9fabc00be247bb6` | 8X8D2 block 9 tile 27 over sky colour 11 | map 9, square (1,4) facing south, column 1 row 4 | `swamp-elder-terrain-642de7080d4e.png` (area 16, 21, 28) |

#### tile set 8X8D2 block 23 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:6ded5463acccbf3faf497bc8c6192cd0610a7b74017d82883f2984c61c129f5e` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 9, square (15,0) facing south, column 4 row 5 | `nomad-rail-horizon-6ded5463accc.png` (area 15, 17) |
| `tile:9:8c8fedef57e2b1feb1568258ac1bbc599576aa625e158b73a979eb03428615b7` | 8X8D2 block 23 tile 46 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 9, square (14,3) facing north, column 9 row 5 | `nomad-rail-horizon-8c8fedef57e2.png` (area 15, 17) |
| `tile:9:cfa5fd82ad4373ff737b245cdd2513eb9ab37a3c2820b7c003258a2c53660d65` | 8X8D2 block 23 tile 29 over 8X8D2 block 23 tile 29 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 9, square (13,0) facing east, column 5 row 5 | `nomad-rail-horizon-cfa5fd82ad43.png` (area 15, 17) |
| `tile:9:ef67b219e9658ff3e32bc27b9368a2017398638ae45700052437c54da519700e` | 8X8D2 block 23 tile 11 over 8X8D2 block 23 tile 11 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 9, square (14,0) facing east, column 5 row 5 | `nomad-rail-horizon-ef67b219e965.png` (area 15, 17) |

### Area 11: The Training Hall (31)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 5 row 5 | `slums-confirmed-cell-d20d585641c6.png` (area 0, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 18, 20, 21, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:45f5e38f7219ffc606ba569d2abe5be146d8630bf8dcde674e3c28c3ce4e621a` | 8X8D1 block 203 tile 17 over sky colour 0 | map 0, square (0,0) facing north, column 0 row 0 | `sokal-night-cell-45f5e38f7219.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |
| `tile:11:b03fbca109ab749692421d27e7e24a728523604f8fd1580a98748b76cb2ce15c` | 8X8D1 block 203 tile 16 over sky colour 0 | map 0, square (0,0) facing south, column 10 row 0 | `sokal-night-cell-b03fbca109ab.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |

#### tile set 8X8D3 block 101 (10)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:046ad3c1e78ac7354ca7e0401cab3e3dc4ca27e8cf49682c378b105f05b70715` | 8X8D3 block 101 tile 4 over sky colour 0 | map 0, square (4,1) facing south, column 10 row 0 | `podal-shrine-side-lanes-terrain-046ad3c1e78a.png` (area 0, 18) |
| `tile:11:1091af6ef7ffd2d40436f31ed8b4bded8191f728b08f77a211b9dbaee6bf6fe1` | 8X8D3 block 101 tile 7 over 8X8D3 block 101 tile 7 over sky colour 0 | map 0, square (4,1) facing west, column 6 row 1 | `phlan-fallback-0-1091af6ef7ff.png` (area 0) |
| `tile:11:1ee6b545de6112d23c5485b857a3b1b107a19e9849973bb41f16ebd2b39eca85` | 8X8D3 block 101 tile 62 over sky colour 0 | map 0, square (3,4) facing west, column 6 row 4 | `phlan-fallback-0-1ee6b545de61.png` (area 0) |
| `tile:11:487e17f20dbc6c0fb86d6fa47c312eeab0de9abcccfea8cc1fb4188074231bda` | 8X8D3 block 101 tile 6 over 8X8D3 block 101 tile 6 over sky colour 0 | map 0, square (4,1) facing west, column 4 row 1 | `phlan-fallback-0-487e17f20dbc.png` (area 0) |
| `tile:11:52311369c866063e450c48f3773088e549bb6605c8b4acb651f88feafcacae37` | 8X8D3 block 101 tile 61 over sky colour 0 | map 0, square (13,1) facing west, column 1 row 4 | `phlan-fallback-0-52311369c866.png` (area 0) |
| `tile:11:7ef87e5548a82e7c211613cc0266aefa8c3abc711afad60ec9d4cf3b7192c502` | 8X8D3 block 101 tile 9 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 2 | `podal-shrine-side-lanes-terrain-7ef87e5548a8.png` (area 0, 18) |
| `tile:11:98110c9f8d54dd9af58e57336f0644295430d1c2cadda1e17e17c8124ad9dced` | 8X8D3 block 101 tile 16 over sky colour 0 | map 0, square (5,2) facing east, column 9 row 4 | `phlan-fallback-0-98110c9f8d54.png` (area 0) |
| `tile:11:a5f98dc0350255ef6862a6e1a9489d7b92cddde74f79d72b131ce1124ddaf77e` | 8X8D3 block 101 tile 5 over 8X8D3 block 101 tile 5 over sky colour 0 | map 0, square (4,1) facing west, column 3 row 1 | `podal-shrine-side-lanes-terrain-a5f98dc03502.png` (area 0, 18) |
| `tile:11:c7b82d70fda9e7ad0bcc015a14e5a3772c4d1340637697919a7cbb0029718857` | 8X8D3 block 101 tile 65 over sky colour 0 | map 0, square (4,0) facing south, column 8 row 1 | `phlan-fallback-0-c7b82d70fda9.png` (area 0) |
| `tile:11:df1a7dc7e5ee5dc9cb316e587c626701f8e4915ee56b250acf5b30ec7a91a7c8` | 8X8D3 block 101 tile 8 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 1 | `podal-shrine-side-lanes-terrain-df1a7dc7e5ee.png` (area 0, 18) |

#### tile set 8X8D3 block 102 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:0067a44f2f0296324a93f2748022da512d25c262b7469fe213ff8aaa19cf3af3` | 8X8D3 block 102 tile 38 over sky colour 0 | map 0, square (4,0) facing west, column 1 row 1 | `phlan-fallback-0-0067a44f2f02.png` (area 0) |
| `tile:11:0f6eabbe54e88f21a2dc14a9f75bd6030a546059e15d4dc2309ff8b7a42f5082` | 8X8D3 block 102 tile 49 over sky colour 0 | map 0, square (0,0) facing east, column 8 row 2 | `slums-confirmed-cell-0f6eabbe54e8.png` (area 0, 3, 4, 5, 6, 7, 20) |
| `tile:11:76b41f0cdc6578c287ba79592b23065544ce123c4f9ec8724e8d312657280772` | 8X8D3 block 102 tile 33 over sky colour 0 | map 0, square (0,0) facing south, column 2 row 2 | `slums-confirmed-cell-76b41f0cdc65.png` (area 0, 3, 4, 5, 6, 7, 20) |

#### tile set 8X8D3 block 103 (15)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:169608062ff1aff8089bf5e0d2b3aee98f4d7bcdb6c9ac5208770245839f5e14` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (14,1) facing east, column 10 row 5 | `phlan-fallback-0-169608062ff1.png` (area 0) |
| `tile:11:601ca0f73a0f934ddf832048da2dbbc3bc9203cc12e77200bb222e236d683764` | 8X8D3 block 103 tile 31 over sky colour 0 | map 0, square (2,2) facing east, column 9 row 4 | `mendor-library-terrain-601ca0f73a0f.png` (area 0, 15) |
| `tile:11:7b8772a162e24dbbfab628febba4c8018354d1997675d518b44e749fa71e1b6b` | 8X8D3 block 103 tile 52 over sky colour 0 | map 0, square (4,1) facing south, column 0 row 3 | `textile-waterfront-side-lanes-terrain-7b8772a162e2.png` (area 0, 2, 15) |
| `tile:11:8a056429f4099504d4208271c9c6416be226c53403a933041f07df132509656b` | 8X8D3 block 103 tile 19 over sky colour 0 | map 0, square (3,2) facing south, column 2 row 3 | `phlan-fallback-0-8a056429f409.png` (area 0) |
| `tile:11:8cc6fb33beebe284ad671b37641293211c29124408b1847a3c5eb3461be2dfa2` | 8X8D3 block 103 tile 45 over 8X8D3 block 103 tile 45 over sky colour 0 | map 0, square (5,1) facing west, column 5 row 3 | `phlan-fallback-0-8cc6fb33beeb.png` (area 0) |
| `tile:11:8e1c4a57f54a26ae024d7708cc6b909ac108666d402f5cd6701f9b74a8a113df` | 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 10 row 5 | `phlan-fallback-0-8e1c4a57f54a.png` (area 0) |
| `tile:11:a981c2e4290d3cfab1275af7b186649c90a2307191e93fd98b463e413040c010` | 8X8D3 block 103 tile 53 over sky colour 0 | map 0, square (5,1) facing north, column 10 row 0 | `new-phlan-training-hall-terrain-a981c2e4290d.png` (area 0, 15) |
| `tile:11:ac6a6e8299ac7fb8877475660d1da710aa61867a1064e5651f070167da55c205` | 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 7 row 5 | `phlan-fallback-0-ac6a6e8299ac.png` (area 0) |
| `tile:11:af99cac6a4bc33650e7528427afc58561f697a7767092c8a9f8194bba299ce12` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 | `phlan-fallback-0-af99cac6a4bc.png` (area 0) |
| `tile:11:c28c98a0416a67be49e6cc43b059d61e24c7e0ab0e5aee6a0dd206e3a368e447` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (12,3) facing north, column 7 row 5 | `phlan-fallback-0-c28c98a0416a.png` (area 0) |
| `tile:11:d7a42c36165673adb0dd94201efa22307a5b7c8710d5a71874597c97f2c553cf` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing north, column 2 row 5 | `phlan-fallback-0-d7a42c361656.png` (area 0) |
| `tile:11:dd5258c1ed754a783abd6880bcc02737c21b61f9f6526f50342e44daacd14782` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,1) facing south, column 1 row 5 | `phlan-fallback-0-dd5258c1ed75.png` (area 0) |
| `tile:11:e89a43156711377f65cb66bf9e3c92475d547ac90e8f976baef57e12b150fd06` | 8X8D3 block 103 tile 7 over 8X8D3 block 103 tile 7 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,2) facing north, column 5 row 5 | `phlan-fallback-0-e89a43156711.png` (area 0) |
| `tile:11:eaaf3eda22c409df59d46965bfbaa114fdfce2600636b7f78fb7a4c61b6ed7a7` | 8X8D3 block 103 tile 6 over sky colour 0 | map 0, square (2,2) facing east, column 10 row 3 | `phlan-fallback-0-eaaf3eda22c4.png` (area 0) |
| `tile:11:fda35ec7d9df04aeebd70aad095944df1c6a3e311c4f49c7cb25814d73ad0766` | 8X8D3 block 103 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (2,0) facing west, column 6 row 5 | `phlan-fallback-0-fda35ec7d9df.png` (area 0) |

### Area 24: Temple of Bane (27)

Map 24; WALLDEF1 block 1 (tiles 8X8D1 block 1), block 3 (tiles 8X8D1 block 3), block 5 (tiles 8X8D1 block 5).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 24, square (4,1) facing east, column 7 row 5 | `slums-confirmed-cell-d20d585641c6.png` (area 0, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 18, 20, 21, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:45f5e38f7219ffc606ba569d2abe5be146d8630bf8dcde674e3c28c3ce4e621a` | 8X8D1 block 203 tile 17 over sky colour 0 | map 24, square (4,1) facing north, column 0 row 0 | `sokal-night-cell-45f5e38f7219.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |
| `tile:24:b03fbca109ab749692421d27e7e24a728523604f8fd1580a98748b76cb2ce15c` | 8X8D1 block 203 tile 16 over sky colour 0 | map 24, square (4,1) facing south, column 10 row 0 | `sokal-night-cell-b03fbca109ab.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |

#### tile set 8X8D1 block 5 (22)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:046ad3c1e78ac7354ca7e0401cab3e3dc4ca27e8cf49682c378b105f05b70715` | 8X8D1 block 5 tile 51 over sky colour 0 | map 24, square (2,6) facing east, column 10 row 2 | `podal-shrine-side-lanes-terrain-046ad3c1e78a.png` (area 0, 18) |
| `tile:24:116338ca66f44c22a38b5b9aefec1f7ec65266aea79f37ae5f8792325f543896` | 8X8D1 block 5 tile 7 over sky colour 0 | map 24, square (5,2) facing east, column 9 row 2 | `podal-gate-fountain-terrain-116338ca66f4.png` (area 18) |
| `tile:24:1e6559d3d062818095250e9ab468cdb8e9d117739ef2132f0509d7a929826aa1` | 8X8D1 block 5 tile 57 over 8X8D1 block 5 tile 57 over sky colour 0 | map 24, square (2,7) facing east, column 5 row 1 | `podal-shrine-side-lanes-terrain-1e6559d3d062.png` (area 18) |
| `tile:24:37386fdc91e5787193aca5b84ed89468432f74dd9bb3c645353d901b488c8114` | 8X8D1 block 5 tile 53 over sky colour 0 | map 24, square (6,2) facing east, column 10 row 1 | `podal-workshop-lanes-terrain-37386fdc91e5.png` (area 18) |
| `tile:24:41f4e696b7c9808b864b2b8cd46627c2af7a1d0f5b5fef0f88d6fe2b6f37a4da` | 8X8D1 block 5 tile 66 over sky colour 0 | map 24, square (4,1) facing south, column 2 row 4 | `podal-south-arcade-terrain-41f4e696b7c9.png` (area 18) |
| `tile:24:5afd7ba96181f1ebedb434a1fb21618bbd4f7b9c18e2fbe344cbe989bdf73763` | 8X8D1 block 5 tile 68 over sky colour 0 | map 24, square (1,6) facing east, column 8 row 4 | `podal-workshop-lanes-terrain-5afd7ba96181.png` (area 18) |
| `tile:24:679ce0b91bbcfec9f0af7a353ea77811bbda964d4092cac0c1f0ffcd20ebac81` | 8X8D1 block 5 tile 50 over 8X8D1 block 5 tile 50 over 8X8D1 block 5 tile 18 over sky colour 0 | map 24, square (5,2) facing south, column 6 row 3 |  |
| `tile:24:6dfea0604bd99ee6e8196b8c478f89c6206d87281600d647b552b518485cec65` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 16 over sky colour 0 | map 24, square (14,4) facing south, column 8 row 2 | `podal-gate-fountain-terrain-6dfea0604bd9.png` (area 18) |
| `tile:24:7a637a9ca7a97b8ec3d77d94e9de5fd97068f1e901c7a2735a654f77869bcf82` | 8X8D1 block 5 tile 17 over sky colour 0 | map 24, square (4,1) facing south, column 1 row 3 | `sokal-night-cell-7a637a9ca7a9.png` (area 18, 21) |
| `tile:24:7d6cb33d340bf08e306658683644e4c3b490f06883dcff1459e5b60980d9dec4` | 8X8D1 block 5 tile 59 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 24, square (1,6) facing east, column 8 row 5 | `podal-workshop-lanes-terrain-7d6cb33d340b.png` (area 18) |
| `tile:24:7ef7a8d9cefa87e58b3f992fc564d7ce4890d24a98010ebcf2a6430c0fc289e2` | 8X8D1 block 5 tile 50 over sky colour 0 | map 24, square (4,1) facing east, column 10 row 3 | `sokal-night-cell-7ef7a8d9cefa.png` (area 18, 21) |
| `tile:24:7ef87e5548a82e7c211613cc0266aefa8c3abc711afad60ec9d4cf3b7192c502` | 8X8D1 block 5 tile 52 over 8X8D1 block 5 tile 52 over sky colour 0 | map 24, square (2,7) facing east, column 7 row 2 | `podal-shrine-side-lanes-terrain-7ef87e5548a8.png` (area 0, 18) |
| `tile:24:81c70cea0b1b0082603e1f5b52bceb1fbe34161c776035ed784877b20abb5d78` | 8X8D1 block 5 tile 6 over 8X8D1 block 5 tile 6 over 8X8D1 block 5 tile 50 over sky colour 0 | map 24, square (6,2) facing south, column 8 row 1 |  |
| `tile:24:9e0bbd33b6be72084f6a5061e967500b7cce3486b04a3a9a67da4679b5315d81` | 8X8D1 block 5 tile 54 over sky colour 0 | map 24, square (6,2) facing west, column 0 row 1 | `podal-gate-fountain-terrain-9e0bbd33b6be.png` (area 18) |
| `tile:24:a450b9f6a9736eb58295e7d56da5ea77f2a51ea37247733e0327ae50ccfd9b19` | 8X8D1 block 5 tile 67 over sky colour 0 | map 24, square (4,1) facing east, column 10 row 4 | `podal-south-arcade-terrain-a450b9f6a973.png` (area 18) |
| `tile:24:a5f98dc0350255ef6862a6e1a9489d7b92cddde74f79d72b131ce1124ddaf77e` | 8X8D1 block 5 tile 55 over sky colour 0 | map 24, square (2,6) facing east, column 10 row 1 | `podal-shrine-side-lanes-terrain-a5f98dc03502.png` (area 0, 18) |
| `tile:24:b13678a75953c4ef15c9874d908065ece9c274b6652884401faf002cd303a513` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 67 over sky colour 0 | map 24, square (6,2) facing south, column 8 row 2 |  |
| `tile:24:c8c4461579fcf1223414b9ff6910f3109d630bcb9764cf8787e68d29757fe786` | 8X8D1 block 5 tile 6 over sky colour 0 | map 24, square (5,2) facing east, column 9 row 1 | `podal-gate-fountain-terrain-c8c4461579fc.png` (area 18) |
| `tile:24:d0b60f00e865fc0df7097f0e242f2a54a904d2272248e62d0c91d4ff0c530053` | 8X8D1 block 5 tile 18 over sky colour 0 | map 24, square (4,1) facing east, column 9 row 3 | `sokal-night-cell-d0b60f00e865.png` (area 18, 21) |
| `tile:24:d79bf2a57e9d6a0a284cf812f57163f00c532ea544100ca56f007e68b136512f` | 8X8D1 block 5 tile 50 over 8X8D1 block 5 tile 17 over sky colour 0 | map 24, square (9,1) facing south, column 1 row 3 |  |
| `tile:24:df1a7dc7e5ee5dc9cb316e587c626701f8e4915ee56b250acf5b30ec7a91a7c8` | 8X8D1 block 5 tile 56 over 8X8D1 block 5 tile 56 over sky colour 0 | map 24, square (2,7) facing east, column 7 row 1 | `podal-shrine-side-lanes-terrain-df1a7dc7e5ee.png` (area 0, 18) |
| `tile:24:e9f05767b049a2f2e698b88bab425ead4f69f3b2e61680a2c17de262a51c5159` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 17 over sky colour 0 | map 24, square (14,4) facing south, column 2 row 2 | `podal-gate-fountain-terrain-e9f05767b049.png` (area 18) |

#### tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:2d38e7553ce601d07a1ba243f8e839e028635ad46a684bcfae8ab1e2130c0d91` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 0 | map 24, square (15,5) facing east, column 9 row 1 | `podol-screen-final-18-2d38e7553ce6.png` (area 18) |
| `tile:24:fee2c7506184fe0e593d3138d0dcf93070650cab9abd075068a5798d5336a3df` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 6 over sky colour 0 | map 24, square (15,7) facing east, column 1 row 1 | `podol-screen-final-18-fee2c7506184.png` (area 18) |

### Area 31: Temple of Bane, interior (3)

Map 31; WALLDEF1 block 1 (tiles 8X8D1 block 1), block 3 (tiles 8X8D1 block 3), block 5 (tiles 8X8D1 block 5).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:31:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 31, square (4,0) facing south, column 5 row 5 | `slums-confirmed-cell-d20d585641c6.png` (area 0, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 18, 20, 21, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:31:45f5e38f7219ffc606ba569d2abe5be146d8630bf8dcde674e3c28c3ce4e621a` | 8X8D1 block 203 tile 17 over sky colour 0 | map 31, square (4,0) facing north, column 0 row 0 | `sokal-night-cell-45f5e38f7219.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |
| `tile:31:b03fbca109ab749692421d27e7e24a728523604f8fd1580a98748b76cb2ce15c` | 8X8D1 block 203 tile 16 over sky colour 0 | map 31, square (4,0) facing north, column 10 row 0 | `sokal-night-cell-b03fbca109ab.png` (area 0, 2, 3, 4, 5, 6, 9, 10, 14, 15, 18, 20, 21, 29) |

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
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 7 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 20 |
| first-person cells of an area whose reading is not confirmed | 40 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 0 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Struck off, not held: 115 cells the tool once tried under a sky or ground the area's script shows cannot occur there (`qa/art-worklist-observed.json`):

- Area 3 (Valjevo Castle), 34 cells: Valjevo Castle (ECL5 block 3)'s script sets the open sky only at 9a5f to 9a78 (11, or 8 when the hour 0x49c9 is 14 or more), which is colour 11 or 0, and the roofed sky to 9 (colour 15) at 9a65. Sky 12 came from the tool following the scratch variable 0x6e79, which other code uses for other numbers; nothing jumps into the middle of the sequence.
- Area 5 (Valjevo Castle), 57 cells: Valjevo Castle's script sets the open sky only at 9a5f to 9a78 (11, or 8 when the hour 0x49c9 is 14 or more), which is colour 11 or 0, and the roofed sky to 9 (colour 15) at 9a65. Sky 12 came from the tool following the scratch variable 0x6e79, which other code uses for other numbers; nothing jumps into the middle of the sequence.
- Area 9 (Stojanow Gate), 12 cells: Stojanow Gate's script sets the open sky only at 9935 to 994e (11, or 8 when the hour 0x49c9 is 14 or more), which is colour 11 or 0, and the roofed sky to 9 (colour 15) at 993b. Sky 9 came from the tool following the scratch variable 0x6e79, which other code uses for other numbers; nothing jumps into the middle of the sequence.
- Area 9 (Stojanow Gate), 12 cells: Stojanow Gate's script sets the open sky only at 9935 to 994e (11, or 8 when the hour 0x49c9 is 14 or more), which is colour 11 or 0, and the roofed sky to 9 (colour 15) at 993b. Sky 12 came from the tool following the scratch variable 0x6e79, which other code uses for other numbers; nothing jumps into the middle of the sequence.

Areas not confirmed, and why:

- Area 25 (Wilderness, west): only 22 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.
- Area 27 (Wilderness, east): only 22 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.

### Other pictures no key names

Every picture frame of the 1.3 files outside the tile sets and the battlefield that no artwork key names. Whether the game shows each has to be seen in play before art is commissioned
(`docs/ART-INVENTORY.md` says the same of secondary members), so none is counted as to do.

| Frame (archive:block:member:frame) | Size | What it is | Key form and PNG size | What is known |
| --- | --- | --- | --- | --- |

### Ending frames covered by Enhanced illustrations

The paired GOG 1.3 Chrome replays verified the illustrated ending and council reward. These archive records remain inventoried for Classic and are covered as a sequence in Enhanced.

- `FINAL5.DAX:1:0:0`
- `FINAL5.DAX:2:0:0`
- `FINAL5.DAX:2:1:0`
- `FINAL5.DAX:2:2:0`
- `FINAL5.DAX:2:3:0`
- `FINAL5.DAX:3:0:0`
- `FINAL5.DAX:4:0:0`
- `FINAL5.DAX:5:0:0`
- `FINAL5.DAX:6:0:0`
- `FINAL5.DAX:7:0:0`
- `FINAL5.DAX:7:1:0`
- `FINAL5.DAX:7:2:0`
- `FINAL5.DAX:7:3:0`
- `FINAL5.DAX:7:4:0`
- `FINAL5.DAX:7:5:0`
- `FINAL5.DAX:8:0:0`
- `FINAL5.DAX:8:1:0`
- `FINAL5.DAX:8:2:0`
- `FINAL5.DAX:8:3:0`
- `FINAL5.DAX:8:4:0`
- `FINAL5.DAX:8:5:0`

### Blank approach sprite frames

The native approach blitter skips palette index 0. Every pixel in each of these frames has that index, so the frame draws no actor and needs no art.

- `SPRIT6.DAX:10:0:0`
- `SPRIT6.DAX:67:0:0`
- `SPRIT6.DAX:74:0:0`
- `SPRIT6.DAX:119:0:0`
- `SPRIT8.DAX:113:0:0`
- `SPRIT8.DAX:116:0:0`

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
