# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 504 confirmed cells awaiting art now.**

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
| Remaining, all kinds | 504 |
| First-person cells to do | 504 |
|   of which one stored tile | 57 |
|   of which one tile over a solid colour | 118 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 329 |
|   of which the same pixels already have art of yours in another area | 176 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 6378 |
|   accounted for by the tool | 6237 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2471 |
|   without (the catalogue's 720 when it was written) | 536 |
|     of those, no map can show | 421 |
|     of those, shown only together with other tiles, never alone | 7 |
|     of those, shown alone in some area | 108 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 308 | 0 | 321 of 321 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 385 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 580 | 382 | 0 | 406 of 406 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | not yet | 300 | 100 |  | 102 of 117 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 320 | 76 | 46 | 84 of 84 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | not yet | 393 | 91 |  | 114 of 176 (17 as first views of the next area, 6 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 310 | 76 | 88 | 82 of 82 (6 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | not yet | 269 | 64 |  | 104 of 162 (40 as first views of the next area) |
| 8 | Phlan City Hall | yes | 405 | 292 | 3 | 302 of 302 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 287 | 150 | 0 | 150 of 150 |
| 10 | Valhingen Graveyard | yes | 2452 | 890 | 0 | 902 of 902 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 405 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 313 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 150 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 436 | 185 | 118 | 205 of 205 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 360 | 59 | 381 of 381 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 186 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | not yet | 337 | 162 |  | 197 of 202 (28 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | not yet | 395 | 180 |  | 187 of 188 (7 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 500 | 253 | 0 | 275 of 275 (22 as WebGL wall materials) |
| 22 | Yarash's Pyramid | yes | 140 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 126 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 312 | 217 | 0 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 51 | 13 |  | 13 of 13 |
| 26 | Wilderness, middle | yes | 387 | 105 | 190 | 173 of 173 (66 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 50 | 19 |  | 20 of 20 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 194 | 107 | 0 | 108 of 108 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 640 | 0 | 654 of 654 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 142 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 4: Valjevo Castle (46)

Map 4; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### shared tile set 8X8D1 block 203 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 4, square (0,10) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 18, 20, 21, 22, 23, 29) |
| `tile:4:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 4, square (0,3) facing west, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:4:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 4, square (0,10) facing south, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 4, square (8,4) facing east, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 8, 10, 11, 13, 15, 16, 18, 20, 21, 24, 29) |
| `tile:4:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 4, square (0,3) facing west, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:4:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 4, square (0,5) facing north, column 3 row 7 | `lizardman-upper-keep-cell-bbce287c6ee7.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |

#### tile set 8X8D1 block 203 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:73fca805c559f76cbe3313cb1c587758426d3cd915fd5ad36da8f6224c9c6e94` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 15 | map 4, square (7,1) facing east, column 1 row 4 |  |
| `tile:4:c160536a81efbce52dbc73a8d5328bee3513abea5f2e561966d54bb6ae8d1133` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (0,11) facing north, column 4 row 4 |  |
| `tile:4:cd57c8e86c999742f3503cbefa549789a4b162b4acb03d89889c21f721e52f9c` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (0,6) facing south, column 6 row 4 |  |
| `tile:4:d2c4a6b5bf49ce6b432362612e67b21c93a35e4acef5c1c63d225fe95bb438bd` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 15 | map 4, square (14,10) facing north, column 10 row 3 |  |

#### tile set 8X8D5 block 1 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 4, square (0,6) facing north, column 4 row 6 | `lizardman-upper-keep-cell-1a0dfab20ddd.png` (area 2, 9, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 4, square (0,5) facing north, column 3 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D5 block 1 tile 54 | map 4, square (0,10) facing south, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D5 block 1 tile 53 | map 4, square (0,10) facing south, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 4, square (0,5) facing north, column 3 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 4, square (0,9) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |

#### tile set 8X8D5 block 241 (14)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:25e491fa08f466868cbcfcb77030d54f34ec724c8d2b1573d4d180cc4bac1826` | 8X8D5 block 241 tile 22 | map 4, square (7,4) facing east, column 5 row 5 |  |
| `tile:4:3abb0e9552597674d3f20b9e07926a0f3571ca8e45e575d2c801f84f248e2df1` | 8X8D5 block 241 tile 41 over sky colour 11 | map 4, square (10,4) facing east, column 9 row 2 |  |
| `tile:4:452d9027cc05e132739ef5d86f317cd8b5b9fd6367064d84a15a88a119845b7c` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (10,4) facing west, column 1 row 2 |  |
| `tile:4:4a92dcd56b0d6131d823af1fb32cb324a7ff91a8de8a9154eaf7dcfcf152da3b` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 11 | map 4, square (10,4) facing south, column 3 row 3 |  |
| `tile:4:4e7944d1326cb4031b5acc9abf2d42d153ca354493b9aa01be067ab218166e2a` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 41 over sky colour 11 | map 4, square (11,4) facing west, column 3 row 4 |  |
| `tile:4:85a0d3b1281f79e4c87a2b645c822b26f738ca31f2d23007b529617e29a70a04` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 41 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (11,4) facing south, column 10 row 3 |  |
| `tile:4:88a4abc41a379d461d579bd14f4baee5e824470bb22f86c7de3d7816f3094826` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 11 | map 4, square (11,8) facing north, column 6 row 4 |  |
| `tile:4:8b54cd3414e3f331db8fee3660c943f741774971e7d44d954dff28b39df79d5c` | 8X8D5 block 241 tile 19 | map 4, square (8,4) facing east, column 5 row 5 |  |
| `tile:4:9e989607a2760793e5dea1c228a49887cbf26c4c5f53b10f8461239d00a0dff9` | 8X8D5 block 241 tile 39 over sky colour 11 | map 4, square (10,4) facing east, column 10 row 2 |  |
| `tile:4:b736305be4508242c7df967669e77fe01c85e6e9f59e00040c99b688576de57a` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (10,4) facing south, column 8 row 2 |  |
| `tile:4:c3e679bfe667e39d95541e5dacbbb8ae52d77e6b290b50a882022febb75acbcb` | 8X8D5 block 241 tile 49 over 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (11,4) facing west, column 1 row 4 |  |
| `tile:4:de7d955b786d51d9f00a9668a7ef85732749a3c801acca4b6e74dec00ef47892` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 66 over sky colour 11 | map 4, square (10,4) facing south, column 1 row 4 |  |
| `tile:4:e03d589172a3a77b3954c77073c332aaecb326fb713523302d20ac60346acc20` | 8X8D5 block 241 tile 66 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (11,7) facing south, column 4 row 4 | `valjevo-outer-service-terrain-04.png` (area 6) |
| `tile:4:f54344a6151b9aa36fd7f48d79eca6886550a2d1954cc4462e47e37300a018ab` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 11 | map 4, square (8,5) facing east, column 6 row 4 |  |

#### tile set 8X8D5 block 242 (16)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:0d64c1aba3330ac2faecf1c01d1f76ab69a04f1098002e698c370bc81a5cc4f3` | 8X8D5 block 242 tile 20 over sky colour 11 | map 4, square (1,4) facing east, column 7 row 3 | `valjevo-dungeon-briar-terrain-24.png` (area 3, 6) |
| `tile:4:2090033b7fe53e0cda9f8161cb4a45eda52c55099e51bc9f51a6c3874b604804` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over sky colour 11 | map 4, square (0,4) facing east, column 4 row 2 | `valjevo-dungeon-briar-terrain-11.png` (area 3, 6) |
| `tile:4:2190abd1c1b89646bc81d87cccda58568c7e1b5acd76b519fccf5829d4e01c7b` | 8X8D5 block 242 tile 19 over sky colour 11 | map 4, square (0,4) facing south, column 2 row 3 | `valjevo-dungeon-briar-terrain-08.png` (area 3, 6) |
| `tile:4:32b798fa659035152c1f8a60929e92700d6fed3037c9ca4c597203ad57c200a4` | 8X8D5 block 242 tile 17 over sky colour 11 | map 4, square (0,4) facing north, column 10 row 1 | `valjevo-dungeon-briar-terrain-03.png` (area 3, 6) |
| `tile:4:6b7842c0cd5ea68901e8e859608b02c78e4eeeff56dcf65fb093668fe3216446` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (0,4) facing east, column 3 row 2 | `valjevo-dungeon-briar-terrain-10.png` (area 3, 6) |
| `tile:4:7befb7f5e8b497feb0508f160a2f16fffb17bdeda63c888da0dfa86345cb854e` | 8X8D5 block 242 tile 34 | map 4, square (1,4) facing east, column 6 row 6 | `valjevo-dungeon-briar-terrain-28.png` (area 3, 6) |
| `tile:4:7ddfc9b6c0342eabf84cdc86217cf578dcd68da5371291f0d39601be2343012e` | 8X8D5 block 242 tile 32 | map 4, square (0,4) facing north, column 9 row 9 | `valjevo-dungeon-briar-terrain-22.png` (area 3, 6) |
| `tile:4:893d4126af27130f16837df9ddeb49f4b0895ea59cf517c7e66edf12043cd6e0` | 8X8D5 block 242 tile 14 | map 4, square (0,4) facing south, column 1 row 3 | `valjevo-dungeon-briar-terrain-07.png` (area 3, 6) |
| `tile:4:a72cd795273e9928eaf87725b5550fff71b45e59ccd15c470831dcc9722049f5` | 8X8D5 block 242 tile 35 | map 4, square (0,4) facing south, column 4 row 6 | `valjevo-dungeon-briar-terrain-27.png` (area 3, 6) |
| `tile:4:a7d58f2e585a10f6423aa78da8d965e76f7aee6fcdf964a34c367e7ff57dd5ce` | 8X8D5 block 242 tile 20 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (1,4) facing south, column 6 row 4 | `valjevo-dungeon-briar-terrain-29.png` (area 3, 6) |
| `tile:4:a92b522baf70206e794b2a1953184928f00971bf98cea7a2830f171ce1791fee` | 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (1,4) facing south, column 4 row 4 | `valjevo-dungeon-east-corner-terrain-02.png` (area 3, 6) |
| `tile:4:b2387150b8b37b8747391045eb8e7e3aad8ff6c36dc1fb6e410c434faf31368d` | 8X8D5 block 242 tile 21 over sky colour 11 | map 4, square (1,4) facing south, column 8 row 3 | `valjevo-dungeon-briar-terrain-25.png` (area 3, 6) |
| `tile:4:c699c4a3f0c07e17bc52813d4cc3d7c302fc632d6da360c2d63ce92989cb6e32` | 8X8D5 block 242 tile 36 over sky colour 11 | map 4, square (0,4) facing south, column 3 row 3 | `valjevo-dungeon-briar-terrain-09.png` (area 3, 6) |
| `tile:4:d048a50d90eea12677fb8456e2f971f6e5ab6b8f1e53c8547c5a1b2bf066a09a` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (5,7) facing north, column 6 row 4 |  |
| `tile:4:e0add5ad1eb7eaf44b1ac4ab22bcad0e965ea86eda665cd2faaf5e2239869150` | 8X8D5 block 242 tile 18 over sky colour 11 | map 4, square (0,4) facing south, column 0 row 1 | `valjevo-dungeon-briar-terrain-02.png` (area 3, 6) |
| `tile:4:eb039ad14db5712287672fd45f2d2d26a6a33ee522784b04e3a03eac4f04ad69` | 8X8D5 block 242 tile 33 | map 4, square (0,4) facing south, column 3 row 7 | `valjevo-dungeon-briar-terrain-20.png` (area 3, 6) |

### Area 6: Valjevo Castle (88)

Map 6; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### shared tile set 8X8D1 block 203 (13)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 6, square (5,0) facing west, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 18, 20, 21, 22, 23, 29) |
| `tile:6:195e9b93e8621946683a00161346595e0fa7b31ddbbf27fb0214ea3bfbe5c4dc` | 8X8D1 block 203 tile 40 | map 6, square (1,2) facing south, column 0 row 7 | `route-195e9b93e862.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 6, square (3,0) facing north, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:6:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 6, square (5,0) facing west, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 6, square (0,0) facing south, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 21, 23, 24, 28, 29, 31) |
| `tile:6:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 6, square (7,10) facing west, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 8, 10, 11, 13, 15, 16, 18, 20, 21, 24, 29) |
| `tile:6:8737539068992377d622a86a6ab259387e19fc5a846d63a4b75effc2a06fae8c` | 8X8D1 block 203 tile 11 | map 6, square (0,1) facing east, column 8 row 6 | `new-phlan-harbor-paving-joins-0-873753906899.png` (area 0, 2, 4, 5, 8, 9, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 6, square (3,0) facing north, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:6:a54a22cfabadf3d87a0d29821dac782c1f6ff842af8e41be65b4578a712c5485` | 8X8D1 block 203 tile 20 over the ground colour 6 | map 6, square (1,1) facing south, column 2 row 8 | `new-phlan-training-paving-0-a54a22cfabad.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:b99063b51996f32692877bfb0938e2ddee836bfd65b398cfad050106b7120d17` | 8X8D1 block 203 tile 24 over the ground colour 6 | map 6, square (1,2) facing south, column 0 row 10 | `route-b99063b51996.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 6, square (10,0) facing east, column 3 row 7 | `lizardman-upper-keep-cell-bbce287c6ee7.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 6, square (10,0) facing east, column 2 row 8 | `lizardman-upper-keep-cell-c1703ae17aff.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:d7f44e9ae57491d39a4a9f79cd2680acaa61cef66e57f530b763ed7229cd425b` | 8X8D1 block 203 tile 22 over the ground colour 6 | map 6, square (0,1) facing south, column 0 row 7 | `new-phlan-training-paving-0-d7f44e9ae574.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 13, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |

#### tile set 8X8D1 block 203 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:73fca805c559f76cbe3313cb1c587758426d3cd915fd5ad36da8f6224c9c6e94` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (15,3) facing south, column 4 row 4 |  |
| `tile:6:c160536a81efbce52dbc73a8d5328bee3513abea5f2e561966d54bb6ae8d1133` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (15,3) facing south, column 4 row 4 |  |
| `tile:6:cd57c8e86c999742f3503cbefa549789a4b162b4acb03d89889c21f721e52f9c` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (9,0) facing west, column 6 row 4 |  |
| `tile:6:d2c4a6b5bf49ce6b432362612e67b21c93a35e4acef5c1c63d225fe95bb438bd` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (9,0) facing west, column 6 row 4 |  |

#### tile set 8X8D5 block 1 (14)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D5 block 1 tile 12 | map 6, square (3,1) facing north, column 4 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D5 block 1 tile 8 | map 6, square (3,1) facing north, column 5 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 6, square (9,0) facing east, column 4 row 6 | `lizardman-upper-keep-cell-1a0dfab20ddd.png` (area 2, 9, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 6, square (5,0) facing west, column 8 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D5 block 1 tile 54 | map 6, square (5,0) facing west, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:41ea3ceae0f6da8a29151985f9d6f70572dbd7d9e81b672fe759802e75a7d115` | 8X8D5 block 1 tile 50 | map 6, square (0,1) facing south, column 0 row 6 | `room-tile-09.png` (area 0, 2, 4, 5, 9, 14, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D5 block 1 tile 9 | map 6, square (3,1) facing north, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D5 block 1 tile 21 | map 6, square (9,0) facing east, column 4 row 5 | `bane-side-galleries-terrain-54cfe77b0fa0.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D5 block 1 tile 11 | map 6, square (3,1) facing north, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D5 block 1 tile 53 | map 6, square (5,0) facing west, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 6, square (5,0) facing west, column 8 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 6, square (13,0) facing west, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D5 block 1 tile 10 | map 6, square (3,1) facing north, column 6 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D5 block 1 tile 7 | map 6, square (3,1) facing north, column 4 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |

#### tile set 8X8D5 block 241 (25)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:0e965427a4d3d1223622c0fbd9e49c897d1ee2a4bc5efcf6dd1c545fb2da8ad7` | 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (3,0) facing south, column 0 row 0 | `valjevo-merchant-wing-terrain-0e965427a4d3.png` (area 7, 20) |
| `tile:6:24fba682c92cad0205b42b70ca5d40d5fb669da18ffd3bf2eed6f96bf188748f` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 11 | map 6, square (4,9) facing south, column 8 row 2 |  |
| `tile:6:25e491fa08f466868cbcfcb77030d54f34ec724c8d2b1573d4d180cc4bac1826` | 8X8D5 block 241 tile 22 | map 6, square (8,9) facing west, column 3 row 5 |  |
| `tile:6:30fc530e9960bfd263d2ca53b3cd889b9a05c47e4f8cf364be6e42418ab5b666` | 8X8D5 block 241 tile 39 over sky colour 15 | map 6, square (4,9) facing east, column 10 row 2 |  |
| `tile:6:3abb0e9552597674d3f20b9e07926a0f3571ca8e45e575d2c801f84f248e2df1` | 8X8D5 block 241 tile 41 over sky colour 11 | map 6, square (4,9) facing east, column 9 row 2 |  |
| `tile:6:46b626996c03262f14f5d231994b5d6a900c5f1a5f00bf50e3f812cf8331fb52` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 15 | map 6, square (4,7) facing south, column 5 row 4 |  |
| `tile:6:4a92dcd56b0d6131d823af1fb32cb324a7ff91a8de8a9154eaf7dcfcf152da3b` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 11 | map 6, square (4,8) facing south, column 5 row 4 |  |
| `tile:6:55cc844fe94c3cf05f29f885d1e5d466c377e4cc21576ee85238490161b10290` | 8X8D5 block 241 tile 41 over sky colour 15 | map 6, square (4,9) facing east, column 9 row 2 |  |
| `tile:6:620a6303715d49edcfa38984eb64107d52fd85d1213c89f0b4d2a5c767a3dde7` | 8X8D5 block 241 tile 66 over 8X8D5 block 241 tile 49 over sky colour 11 | map 6, square (2,7) facing south, column 1 row 4 | `valjevo-kitchen-clay-620a6303715d.png` (area 4) |
| `tile:6:6acb8ac41337dc063fbb2533600cf31db60ca12aa6e5a6ee18bab5b2addacdaa` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 15 | map 6, square (4,8) facing south, column 5 row 4 |  |
| `tile:6:7cea0473b7274386a81c58a22192153f04b268185154b826d293aa3588e3d018` | 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (2,2) facing north, column 10 row 3 |  |
| `tile:6:88a4abc41a379d461d579bd14f4baee5e824470bb22f86c7de3d7816f3094826` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 11 | map 6, square (4,7) facing south, column 6 row 4 |  |
| `tile:6:8b54cd3414e3f331db8fee3660c943f741774971e7d44d954dff28b39df79d5c` | 8X8D5 block 241 tile 19 | map 6, square (7,10) facing west, column 5 row 5 |  |
| `tile:6:935f3ee085e1ae67e735ed893428bfa40eea469106fdccf67314fe34db6e17c1` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (4,9) facing south, column 8 row 2 |  |
| `tile:6:9e989607a2760793e5dea1c228a49887cbf26c4c5f53b10f8461239d00a0dff9` | 8X8D5 block 241 tile 39 over sky colour 11 | map 6, square (4,9) facing east, column 10 row 2 |  |
| `tile:6:a1cf8e16e142eb922786d34eccee7fa462e048ae73f2cbd34605fb7838b1087d` | 8X8D5 block 241 tile 66 over 8X8D5 block 241 tile 49 over sky colour 15 | map 6, square (2,7) facing south, column 1 row 4 |  |
| `tile:6:a3e0ffa0b9d6e0edfbafeb17c6e1cda5a59dcc16d4754b69f0c6b25f5fb6cac5` | 8X8D5 block 241 tile 66 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (11,1) facing south, column 4 row 4 |  |
| `tile:6:a6fd996f7610c94e0bcca55c1e9f45b8e580dab48f3569e0c22575e102a030be` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (4,8) facing south, column 6 row 4 |  |
| `tile:6:a75bd0ce8cf3e6db81b929b605d08cef5d350018cb3fac1b9ef2fcafff2e4495` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 15 | map 6, square (4,7) facing south, column 6 row 4 |  |
| `tile:6:ae9599a889b5cf5493701142b1abb5c0db263e644d167efddc32054867b55467` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 2 | map 6, square (4,9) facing west, column 0 row 2 |  |
| `tile:6:b736305be4508242c7df967669e77fe01c85e6e9f59e00040c99b688576de57a` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 11 | map 6, square (4,7) facing south, column 5 row 4 |  |
| `tile:6:c2a3d1ba70639e474e749be8353382d3d588590c27447609518a37fcd3bb67c8` | 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (3,0) facing north, column 10 row 0 | `valjevo-merchant-wing-terrain-c2a3d1ba7063.png` (area 7, 20) |
| `tile:6:c68f3a4639479cfeff0d8598fbb18a2ea5ab760c33e435a95c3e509e46d41d02` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 15 | map 6, square (4,9) facing west, column 1 row 2 |  |
| `tile:6:f1095fe0ba35d2821054bc05b6afe4b5d359f31097285e98c8c561a0e35d2b9e` | 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (2,2) facing north, column 10 row 3 | `valjevo-kitchen-corridor-terrain-28.png` (area 4) |
| `tile:6:f54344a6151b9aa36fd7f48d79eca6886550a2d1954cc4462e47e37300a018ab` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 11 | map 6, square (4,8) facing south, column 6 row 4 |  |

#### tile set 8X8D5 block 242 (32)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:12603975147e66ac9c8145af988f1d81749676a25fe6bba255bef5423ae8e54e` | 8X8D5 block 242 tile 18 over 8X8D5 block 241 tile 15 | map 6, square (4,0) facing west, column 1 row 2 |  |
| `tile:6:210f9259ebf75e2d9aea8070e48caee0bc244f6f981a7c0a605b5c984c8f1779` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D1 block 203 tile 16 over sky colour 11 | map 6, square (6,0) facing west, column 8 row 2 |  |
| `tile:6:22c88f03dad2a46bdca599ed5ccf78f99963874448dca5eef11c3eb007680ae0` | 8X8D5 block 242 tile 18 over sky colour 15 | map 6, square (4,0) facing west, column 0 row 1 |  |
| `tile:6:3f3c0f0111a7519882dcd2eca2f73e507ee2cb17cb19b36cf4149305d831ec35` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (11,4) facing north, column 8 row 2 |  |
| `tile:6:48b059ed3e6af72e284590eead2127ef7c540f223e6452f2eac06c828a3e8f75` | 8X8D5 block 242 tile 36 over sky colour 15 | map 6, square (4,0) facing south, column 0 row 3 |  |
| `tile:6:48e4ce0ecc8714b437f78aacc223da5c0e33b5eb0905b8f446fc70e997e74d16` | 8X8D5 block 242 tile 19 over sky colour 15 | map 6, square (5,0) facing south, column 2 row 3 |  |
| `tile:6:4b8cb127607b024ed014e9f3c749275c7a8ccc42ba8b84ab93ef26000c640424` | 8X8D5 block 242 tile 18 over 8X8D1 block 203 tile 38 | map 6, square (6,0) facing north, column 1 row 2 |  |
| `tile:6:511e54483eb8fb6615f31c8b9eeeecd4bf1401722cc5e38a36472bab4c27a5ed` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 65 over sky colour 11 | map 6, square (11,4) facing north, column 8 row 2 |  |
| `tile:6:5465ee6d3bbf33b7df6e253be8f0ffc33e30eb0ee4410498eaf6ee9a4d981ab8` | 8X8D5 block 242 tile 20 over sky colour 15 | map 6, square (5,0) facing south, column 7 row 3 |  |
| `tile:6:54e972061da7970654f2c67aa1461bc2aeaa6c0e89d730e0fd92b9a3e180300c` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (4,1) facing north, column 2 row 2 |  |
| `tile:6:55451057d58b9c1100692597a8d372afc7c38d6d069fefb2363ebe6168364d84` | 8X8D5 block 242 tile 17 over 8X8D1 block 203 tile 39 | map 6, square (5,0) facing north, column 9 row 2 |  |
| `tile:6:585e990b8ebc814b10dbb0ba332ddc2d8d75ea953f3135d9c887f9240121d49e` | 8X8D5 block 242 tile 36 over 8X8D5 block 241 tile 40 over sky colour 15 | map 6, square (4,7) facing south, column 4 row 4 |  |
| `tile:6:5b942c9b389a385391aa5c3e77212d1597ab8482261c0c864b281d15854ba7d0` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 66 over sky colour 11 | map 6, square (4,1) facing north, column 2 row 2 |  |
| `tile:6:5ccc45237510b55c91bc749a79b69eab42a9472b13cd428546d75b199e0cffdf` | 8X8D5 block 242 tile 36 over 8X8D5 block 241 tile 40 over sky colour 11 | map 6, square (4,7) facing south, column 4 row 4 |  |
| `tile:6:7d55aa568fe00da92c17f66f639adbc3ea5d0334fb5f55194e7d8ea52c651bd9` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D1 block 203 tile 17 over sky colour 11 | map 6, square (5,0) facing east, column 2 row 2 |  |
| `tile:6:841adad7dc08731cbcd48d9716f4d305ded741ff163c787f717fd21148dae141` | 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (4,0) facing south, column 1 row 4 |  |
| `tile:6:91b0666509f094e00046b9c286b77c5bb01ca4f89f502df5a2298d6bc92da951` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D1 block 203 tile 16 over sky colour 15 | map 6, square (6,0) facing west, column 8 row 2 |  |
| `tile:6:9654f4cba935394e5ee96f4c1c29d1b9d69327b0e674e4f9f0a8bcf4db560329` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 66 over sky colour 11 | map 6, square (15,11) facing west, column 2 row 2 |  |
| `tile:6:a935cfd5653e067413370e19a2f013bd8067d2e08ec0ea24fe27ed4345c09b84` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (4,0) facing south, column 8 row 2 |  |
| `tile:6:b53c88b670761d598d1e4ef19e72d60d5b8aad7d3a776d215f599cdb59d6ac75` | 8X8D5 block 242 tile 17 over 8X8D5 block 241 tile 14 | map 6, square (4,1) facing west, column 9 row 2 |  |
| `tile:6:cce5fe889bf7a3706d86523cdc1b5cfb9879ba9ead96ad6a5683d65564f2aee4` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over sky colour 15 | map 6, square (4,0) facing east, column 5 row 3 |  |
| `tile:6:cd3061c8e2d2b424a42f7ed64dd02c92c02e9cd434262de345e112a81487dc46` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 11 | map 6, square (6,7) facing south, column 9 row 4 |  |
| `tile:6:d048a50d90eea12677fb8456e2f971f6e5ab6b8f1e53c8547c5a1b2bf066a09a` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (5,1) facing south, column 6 row 4 |  |
| `tile:6:d10086d2db410a712cd5ce872a25ab75d8b29af0360bca1065647e0cdb5b0772` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (5,1) facing south, column 6 row 4 |  |
| `tile:6:dc1cf3b23226184b441fa4d9d6d8c1348420fd23df7e9ca7c3e82da826fc2b6d` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (4,0) facing east, column 4 row 3 |  |
| `tile:6:e26c67c9c1129c9d8b59cad5dc9e33bd4a949c11874c9d5eae469e96fcbdd5cd` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (15,11) facing west, column 2 row 2 |  |
| `tile:6:e2b033cd65d9db2764cb3c6d624ea67b426d839bc3e64728b4850a803235bffa` | 8X8D5 block 242 tile 20 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (6,0) facing south, column 6 row 4 |  |
| `tile:6:e2e83d47a6cd35c3398178715fa8ef80a4e7401f9d5ca77540f7f1e7562ffbfc` | 8X8D5 block 242 tile 17 over sky colour 15 | map 6, square (4,0) facing east, column 10 row 1 |  |
| `tile:6:ef02284aecc878866eb27b80a4da70186003b5c3d95990ec80369b563a892427` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 15 | map 6, square (6,7) facing south, column 9 row 4 |  |
| `tile:6:f01936315dadc35c5e164c1668bdcc7c5301427c836620b1d627a45ec938e58c` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D1 block 203 tile 17 over sky colour 15 | map 6, square (5,0) facing east, column 2 row 2 |  |
| `tile:6:f1a0d40c62bb72a61cb372b9c094da9b9b070ff895d9ef9da059dd44821f8368` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 65 over sky colour 11 | map 6, square (4,0) facing south, column 8 row 2 |  |
| `tile:6:faa872107917abb576b13111d58e3e59d9cd756f71db8efce64b3da3b2fea0a6` | 8X8D5 block 242 tile 21 over sky colour 15 | map 6, square (5,0) facing south, column 8 row 3 |  |

### Area 8: Phlan City Hall (3)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### tile set 8X8D3 block 102 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:a1517020332932e5edc1ce35bb6b00aab541870301ef1bd02de95da9187dac03` | 8X8D3 block 102 tile 50 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (14,12) facing south, column 4 row 5 | `phlan-fallback-0-a15170203329.png` (area 0, 11) |

#### tile set 8X8D3 block 103 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:26e59c1084293b98113f1ac103a8f882c5aa8dd1cdd968223da2e7c1b751b8c8` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 64 | map 0, square (15,9) facing east, column 6 row 5 | `phlan-fallback-11-26e59c108429.png` (area 11) |
| `tile:8:b1d3a9f69c781be7b58535cfc2f89b3251553e17b229f2288879e7078c3d531e` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 34 | map 0, square (15,9) facing east, column 8 row 5 | `phlan-fallback-11-b1d3a9f69c78.png` (area 11) |

### Area 15: Mendor's Library (118)

Map 15; WALLDEF2 block 1 (tiles 8X8D2 block 1), block 19 (tiles 8X8D2 block 19), block 23 (tiles 8X8D2 block 23).

#### shared tile set 8X8D1 block 203 (11)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:15:3974a4e7cfac0989e459e020b7096d73c2878d20bfda05e4aca310a80a78b372` | 8X8D1 block 203 tile 3 over sky colour 0 | map 15, square (3,7) facing east, column 10 row 0 |  |
| `tile:15:540a8ad2911ffb5910b1bc1a407925bca2a1e586f1f12ab23ec6630cb2a96c4d` | 8X8D1 block 203 tile 3 over sky colour 11 | map 15, square (3,7) facing east, column 10 row 0 |  |
| `tile:15:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 15, square (10,10) facing south, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 21, 23, 24, 28, 29, 31) |
| `tile:15:79f10a451d41cdb7f5f72757c36094300c7dcb298ee8adea8d79a034bc93259e` | 8X8D1 block 203 tile 1 over 8X8D1 block 203 tile 1 over sky colour 11 | map 15, square (8,1) facing south, column 5 row 1 | `kuto-daylight-horizon-79f10a451d41.png` (area 29) |
| `tile:15:7a62f42874a318807e50c5f76958ec89a88041ebcdbe85f63c86b39a4adb37d7` | 8X8D1 block 203 tile 34 over the ground colour 6 | map 15, square (9,9) facing south, column 6 row 6 | `orc-door-b39a4adb37d7.png` (area 0, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:15:a1ec645adb4e27a03561406297d0b67815b33426021805b79b1e8c27e42aaebe` | 8X8D1 block 203 tile 4 over sky colour 0 | map 15, square (3,7) facing west, column 0 row 0 |  |
| `tile:15:a54a22cfabadf3d87a0d29821dac782c1f6ff842af8e41be65b4578a712c5485` | 8X8D1 block 203 tile 20 over the ground colour 6 | map 15, square (7,2) facing east, column 2 row 8 | `new-phlan-training-paving-0-a54a22cfabad.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:15:b505a5db5557ee2f019256d5b39e70aaeaa91433d73e896784e9962672192f85` | 8X8D1 block 203 tile 25 | map 15, square (7,4) facing north, column 7 row 5 | `orc-door-962672192f85.png` (area 2, 3, 4, 5, 6, 9, 10, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:15:baf79855fad4de2ef9c3d21633b99f7163efd55342a582ca909541e5931fb3b4` | 8X8D1 block 203 tile 4 over sky colour 11 | map 15, square (3,7) facing west, column 0 row 0 |  |
| `tile:15:d7f44e9ae57491d39a4a9f79cd2680acaa61cef66e57f530b763ed7229cd425b` | 8X8D1 block 203 tile 22 over the ground colour 6 | map 15, square (7,2) facing east, column 3 row 7 | `new-phlan-training-paving-0-d7f44e9ae574.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 13, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:15:e7d7d14a879c66a799dcafca1c0de0cb542c33422c162a754961dcb7e40dd767` | 8X8D1 block 203 tile 1 over 8X8D1 block 203 tile 1 over sky colour 15 | map 15, square (8,1) facing south, column 5 row 1 |  |

#### tile set 8X8D2 block 1 (29)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:15:0d24723ae25838d56de5c30206b9f79f6a256715c54bad0e12a3694fb102fbf7` | 8X8D2 block 1 tile 22 over 8X8D2 block 1 tile 22 over sky colour 11 | map 15, square (3,7) facing north, column 7 row 2 | `orc-joint-694fb102fbf7.png` (area 2, 20, 29) |
| `tile:15:11f642096d3bf8df6196aeda49c3c6bc3be20d862c2e935ed7e80fdde0c4bf53` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 24 | map 15, square (3,7) facing west, column 10 row 5 |  |
| `tile:15:149be24ecd0f0110a08f2fb570f858f4e06ac7c9eaa9ff2d497d07ec0a0366e9` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 16 over sky colour 11 | map 15, square (3,7) facing west, column 10 row 3 |  |
| `tile:15:20c884ac38bbb41084801b632014044abe2d6f9357f24141496877d6740c2656` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 22 | map 15, square (3,7) facing east, column 0 row 6 |  |
| `tile:15:3d9046c9cd1b35d9b82cc1589c39741df9f96409f03c484c15cfa4df763ee223` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 17 over sky colour 11 | map 15, square (3,7) facing east, column 0 row 3 |  |
| `tile:15:3fce5bb8461f42541af44daff6893c9894d4dc96e1dc2b684633b6c5367a2025` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 17 over sky colour 0 | map 15, square (3,7) facing east, column 0 row 3 |  |
| `tile:15:41ea3ceae0f6da8a29151985f9d6f70572dbd7d9e81b672fe759802e75a7d115` | 8X8D2 block 1 tile 50 | map 15, square (7,2) facing east, column 3 row 6 | `room-tile-09.png` (area 0, 2, 4, 5, 9, 14, 20, 21, 23, 24, 28, 29, 31) |
| `tile:15:41fe5ac7d6c7d28ee56e381f115144860f8bbd669f7273b680ddb5063ad8df57` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 64 | map 15, square (3,7) facing east, column 0 row 7 |  |
| `tile:15:4bba8a6885ed69ab3d41ab1fee801848c6485f8b131ec7dbd1ce33aef8882e1f` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 26 | map 15, square (3,7) facing east, column 0 row 4 |  |
| `tile:15:593570e2f304b73c5da421e27b1c08b33fd2aa8cddde464249bcd6d6fd71b63e` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 36 | map 15, square (3,7) facing east, column 0 row 5 |  |
| `tile:15:593dbe847df0fa28709f6224ad96589c758fd92217941022a551138fec910051` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 41 | map 15, square (5,5) facing east, column 0 row 6 |  |
| `tile:15:64d056067152dc1808cf3bb5cfa25a2720adcea6bcb504943d8d9ad38894c01b` | 8X8D2 block 1 tile 23 over 8X8D2 block 1 tile 23 over sky colour 11 | map 15, square (3,7) facing north, column 3 row 2 | `route-64d056067152.png` (area 2, 20, 29) |
| `tile:15:7b69b8ce9e674856c13ec81f47d9cf325edf390b53b249570a2cee0bf6fd6a70` | 8X8D2 block 1 tile 5 over 8X8D2 block 1 tile 5 over sky colour 11 | map 15, square (3,7) facing north, column 7 row 3 | `orc-joint-ee0bf6fd6a70.png` (area 2, 20, 29) |
| `tile:15:85cb557d908ec6aeca773734cbbfd496462b5dc2a0203cf449a72ea43360b5df` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 35 | map 15, square (3,7) facing west, column 10 row 4 |  |
| `tile:15:87379f02fdc324762cce24bb98939af3e2b795fcefdb19835b13370e45f225ca` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 19 | map 15, square (3,7) facing west, column 10 row 6 |  |
| `tile:15:9ea89c8125afa888918ee8d019b42a66397fd68b22e36fd719e1b66b72df96c9` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 44 | map 15, square (3,7) facing north, column 3 row 6 |  |
| `tile:15:a18919e8b0b576e4a8546f01e5106a79ad39b36b697a2fcd7eb7d21c59a1ad5f` | 8X8D2 block 1 tile 24 over 8X8D2 block 1 tile 24 over sky colour 0 | map 15, square (3,7) facing north, column 4 row 2 | `kuto-west-arcade-terrain-a18919e8b0b5.png` (area 2, 29) |
| `tile:15:a221d218fa26f178715110410e165acaaab92bcd9f91b9bb614988ff66ade6f6` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 65 | map 15, square (3,7) facing west, column 10 row 7 |  |
| `tile:15:b2d2aa8609ace40dd9f489344fd1ae4c8f6163ca36423abe9d2dc2d5d8ffe753` | 8X8D2 block 1 tile 22 over 8X8D2 block 1 tile 22 over sky colour 0 | map 15, square (3,7) facing north, column 7 row 2 | `kuto-west-arcade-terrain-b2d2aa8609ac.png` (area 2, 29) |
| `tile:15:b61cb969cb65b61d78edae87a4f6b672a9690b82f54b35f8f60dcde4269d4f2f` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over sky colour 11 | map 15, square (3,7) facing north, column 3 row 3 | `orc-joint-cde4269d4f2f.png` (area 2, 20, 29) |
| `tile:15:b7c0b35072fd541227aed05a7caa45046053180acb71a911807afb284b85e91e` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 16 over sky colour 0 | map 15, square (3,7) facing west, column 10 row 3 |  |
| `tile:15:c163548c1fa9bbc33c2008005059c5470b9bb7e0659eeb62e3a7689e469db6cc` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 43 | map 15, square (5,5) facing east, column 0 row 5 |  |
| `tile:15:c9145af2e4c672a2d282d90e72efe87bb8439881131bd15c9fc3b23d64cdcde0` | 8X8D2 block 1 tile 5 over 8X8D2 block 1 tile 5 over sky colour 0 | map 15, square (3,7) facing north, column 7 row 3 | `kuto-west-arcade-terrain-c9145af2e4c6.png` (area 2, 29) |
| `tile:15:d0494e855cb4ffadf6314de36bfe829042bfcf47166313af4c6639ed35c6dbc4` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 43 | map 15, square (11,5) facing west, column 10 row 6 |  |
| `tile:15:d114ab557f35222a5bec8e5ecd8a2f63366f7258c05f70aa678725d452df6010` | 8X8D2 block 1 tile 5 over 8X8D2 block 19 tile 17 over sky colour 15 | map 15, square (3,7) facing east, column 0 row 3 |  |
| `tile:15:e77bc10aafb50018c174281e64f2f9ce2a0ea9a380ce8cd649cb5da86c5d1bec` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over sky colour 0 | map 15, square (3,7) facing north, column 3 row 3 | `kuto-west-arcade-terrain-e77bc10aafb5.png` (area 2, 29) |
| `tile:15:eef580961643f6765e107c4e9994e47066f67ed6349c36703915b5940acd92e0` | 8X8D2 block 1 tile 4 over 8X8D2 block 19 tile 16 over sky colour 15 | map 15, square (3,7) facing west, column 10 row 3 |  |
| `tile:15:f6a95546f13039b839e3349c7d4fea707dcb697389921f5633c73fe8f36828d1` | 8X8D2 block 1 tile 24 over 8X8D2 block 1 tile 24 over sky colour 11 | map 15, square (3,7) facing north, column 4 row 2 | `orc-joint-3fe8f36828d1.png` (area 2, 20, 29) |
| `tile:15:ff4860ce30e110b079f3fcd93775a7da9203b1088f021b1dc767fd1870de3bc2` | 8X8D2 block 1 tile 23 over 8X8D2 block 1 tile 23 over sky colour 0 | map 15, square (3,7) facing north, column 3 row 2 | `kuto-west-arcade-terrain-ff4860ce30e1.png` (area 2, 29) |

#### tile set 8X8D2 block 19 (65)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:15:0c81e7ccd3d7a4af274ff3c75d9afef1f94d7aac83b5d58d7f670beaf15eb21b` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 8 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (4,2) facing east, column 8 row 5 |  |
| `tile:15:0e04b5754f0abd800c0f353384252c99d4982dee0470560ebfbd40a38fc8e9ca` | 8X8D2 block 19 tile 29 over 8X8D2 block 1 tile 17 | map 15, square (3,8) facing north, column 9 row 5 |  |
| `tile:15:0fdea2543738f4be975a5e6892a3ffdbdd195142cd2a47d76e220268823640bf` | 8X8D2 block 19 tile 62 over 8X8D2 block 19 tile 41 | map 15, square (6,3) facing north, column 1 row 5 |  |
| `tile:15:12c3298ecb7ea0cc9b00fb98be69d35a9ab8d9b8193405b3894463942ab586e5` | 8X8D2 block 19 tile 16 over sky colour 11 | map 15, square (5,3) facing north, column 10 row 3 |  |
| `tile:15:13b6a88569adb887681b0dffe28660e35c7e17f06140331b31cde1a903575879` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 44 | map 15, square (4,6) facing south, column 8 row 5 |  |
| `tile:15:15194b95060e0155ff91f79d6769f1970af1df57f8ad4a5c24b484821a062dc6` | 8X8D2 block 19 tile 29 over 8X8D1 block 203 tile 12 | map 15, square (5,2) facing south, column 9 row 5 |  |
| `tile:15:19cb8faaff5ab55a554c27995ef7ae59f03799663266431b4a8d56b9a21737f8` | 8X8D2 block 19 tile 30 over 8X8D2 block 19 tile 2 | map 15, square (4,7) facing west, column 1 row 5 |  |
| `tile:15:1d92e0fd08ef7bfaa7c8b50a7cd25e6ed9a5ef99da173174ec61316df2070fbd` | 8X8D2 block 19 tile 1 over sky colour 0 | map 15, square (3,7) facing east, column 9 row 2 |  |
| `tile:15:2904ae15bb6712fa4dfdf09534e78c5b18202a5ab213a1fd089040f3c6571e1e` | 8X8D2 block 19 tile 62 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 15, square (5,3) facing east, column 0 row 5 |  |
| `tile:15:295ee16bd6d88f86e98172832c769b79daf7489d756657bf9f679e3782c3ade1` | 8X8D2 block 19 tile 7 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 15, square (6,4) facing west, column 1 row 6 |  |
| `tile:15:29eaef4c911ac20dc4b49d2908955ba2556c4ec41f37d36a4263b94ee0a02fbe` | 8X8D2 block 19 tile 62 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 15, square (5,3) facing east, column 0 row 5 |  |
| `tile:15:2a0b58733ffe136f8e071c1cfd4a47f3e5b5b93720a23743bc56cd43e070af75` | 8X8D2 block 19 tile 62 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (4,2) facing east, column 1 row 5 |  |
| `tile:15:2c9f20fad291727eca3f10b3baea6ffb1ea4b8b193cec243f061e4f5f37bcb48` | 8X8D2 block 19 tile 29 over 8X8D2 block 19 tile 8 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (4,2) facing south, column 6 row 5 |  |
| `tile:15:35ba9d6b3ce1c0c2a961c9192adf4ef8ee331f9bdd4368f632fb17ce05baef7f` | 8X8D2 block 19 tile 58 | map 15, square (7,14) facing east, column 4 row 5 |  |
| `tile:15:39c26fb9d707cf1e73997c3108bae0f5c2c3fb73c1e4976adda81a059a9c1e62` | 8X8D2 block 19 tile 30 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (6,3) facing west, column 1 row 5 |  |
| `tile:15:4069716d9f4447e42650eabf2b449ab9b84df39fa1cbbe8b10c31cbeb294b1c2` | 8X8D2 block 19 tile 1 over sky colour 11 | map 15, square (3,7) facing east, column 9 row 2 |  |
| `tile:15:448dccbfecf6ca675c149c68651ee41c6848a0411b82b9a86a3b0a3e3b37fce4` | 8X8D2 block 19 tile 29 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (10,3) facing east, column 9 row 5 |  |
| `tile:15:4598cf015865b2e0ab8aeba25368f0b809081660a6b9f4463778edaee956b054` | 8X8D2 block 19 tile 52 over sky colour 15 | map 15, square (0,0) facing south, column 1 row 4 |  |
| `tile:15:466f23c2be8d90c321b8ac2401e75cfb7d72833ba6eff008ba35a6610448524f` | 8X8D2 block 19 tile 6 over sky colour 15 | map 15, square (6,0) facing south, column 0 row 3 |  |
| `tile:15:47596048e7bf37d8fb1e7eac857802709b4582e3c5eb0861734ac60b7b615966` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 46 | map 15, square (4,7) facing south, column 10 row 3 |  |
| `tile:15:4b4474c3d0fef2dc221117d79acc22e6da161d0a80e97372be4e7ca9309711a0` | 8X8D2 block 19 tile 7 over 8X8D2 block 23 tile 34 | map 15, square (2,8) facing east, column 10 row 6 |  |
| `tile:15:4b5ff58f9c42ece9ef61697aac585ab79b58ed800d05576574ec7506767b5f79` | 8X8D2 block 19 tile 49 | map 15, square (8,14) facing east, column 2 row 6 |  |
| `tile:15:535401e4583b9b62705f14ffe9af75144dd175fdbc239c57f6f3688212c3b5d0` | 8X8D2 block 19 tile 1 over 8X8D1 block 203 tile 39 | map 15, square (4,2) facing south, column 9 row 2 |  |
| `tile:15:5364af48303beb2a9d0a96e949c1ad3f761be0a8f5c7868b1ceab9d41bfdc36a` | 8X8D2 block 19 tile 15 over sky colour 15 | map 15, square (7,0) facing south, column 2 row 3 |  |
| `tile:15:5729e04c13bfe3e9d979c43856dff78a49f56e2f110a5cfec01e5fa5ecaf58ec` | 8X8D2 block 19 tile 57 | map 15, square (8,14) facing east, column 3 row 5 |  |
| `tile:15:5a32877c0bae893e57eba3fafd1eac794e873eb27b6613d894d95a5dca30346e` | 8X8D2 block 19 tile 62 over 8X8D2 block 1 tile 17 | map 15, square (4,2) facing south, column 3 row 5 |  |
| `tile:15:5aff3c3a343f471ac80930aab34f451366512e8d07e0ac763e54f2cfca34a8f8` | 8X8D2 block 19 tile 4 | map 15, square (8,15) facing north, column 8 row 5 |  |
| `tile:15:5c7c82a7f606872e500b004c5c5bf6b144c896ffa2cc9f1c0bf55da6c298f12c` | 8X8D2 block 19 tile 8 over 8X8D2 block 19 tile 8 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (4,2) facing east, column 5 row 5 |  |
| `tile:15:5ca5f04695e8f7187e0aa6662461d625bda01d1f0f404bcaad224ea374d8141a` | 8X8D2 block 19 tile 1 over 8X8D2 block 19 tile 69 | map 15, square (4,7) facing south, column 9 row 2 |  |
| `tile:15:5e6ca21cd26fb9dc2194d475c5ba58a893a144c307796462e5ba278a3ed9c93c` | 8X8D2 block 19 tile 52 over sky colour 11 | map 15, square (0,0) facing south, column 1 row 4 | `new-phlan-building-paving-joins-0-5e6ca21cd26f.png` (area 0, 8, 11) |
| `tile:15:60f4be2071593f29fbf0370f30020d31faf0a87a9bd2f886092a179bf364f9dc` | 8X8D2 block 19 tile 10 | map 15, square (10,0) facing west, column 1 row 6 |  |
| `tile:15:654cd672ba145d985c302a232ed15e5453d2a231d5b16d92a7e1d20e917056d7` | 8X8D2 block 19 tile 15 over sky colour 0 | map 15, square (7,0) facing south, column 2 row 3 |  |
| `tile:15:680ff9ccccdc16a043342fed1e9a8d56c8e7e138b26cf40025ffac63dbbf3659` | 8X8D2 block 19 tile 17 over sky colour 11 | map 15, square (5,3) facing north, column 0 row 3 |  |
| `tile:15:73580aea19c37b0ba580744927cd0783bc0f64ee5f97a6c06c0b12e1e44a39a4` | 8X8D2 block 19 tile 7 over 8X8D1 block 203 tile 38 | map 15, square (4,2) facing north, column 1 row 8 |  |
| `tile:15:75052a8fd6f25a00bcea051ba28f493751e65b14919d98ce647f21b960fcfa49` | 8X8D2 block 19 tile 27 | map 15, square (10,14) facing west, column 8 row 8 |  |
| `tile:15:7a53cbbb1a9da9c668e83ffa028ddbb533abf2f5e6a3d31821148f2ba1981e90` | 8X8D2 block 19 tile 59 | map 15, square (11,14) facing west, column 6 row 5 |  |
| `tile:15:80a6a4fad1a3635853c9c2d6ce3c08b9224e06e7ec608542dce57a313480465d` | 8X8D2 block 19 tile 7 over sky colour 11 | map 15, square (3,7) facing west, column 1 row 3 |  |
| `tile:15:88c7e0e2e78b074ee7ee081b73dfe5ab0ac2d67a1a874d0e06c8f628595bf39a` | 8X8D2 block 19 tile 15 over sky colour 11 | map 15, square (7,0) facing south, column 2 row 3 |  |
| `tile:15:89396b758064cb35796020a5347af3a0f5aa2b40a2a5293e8ae315ba0c1bc7e3` | 8X8D2 block 19 tile 53 over sky colour 11 | map 15, square (0,0) facing east, column 9 row 4 | `new-phlan-street-paving-joins-0-89396b758064.png` (area 0, 8, 11) |
| `tile:15:8a71729a8de91de5e3eecee33467be5b74c5442299d962dab65c49809d6171e0` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 42 | map 15, square (4,7) facing south, column 10 row 5 |  |
| `tile:15:9424dd5c33157eeccd7c272e49d6ca62bd89be5eb36e9bafe70b66cc3a34b5d5` | 8X8D2 block 19 tile 62 over 8X8D2 block 19 tile 2 | map 15, square (4,7) facing west, column 0 row 5 |  |
| `tile:15:9cadd8a860dd3dabf52444ad03b7df409273a79854ec9d5b75bfb0a03268020d` | 8X8D2 block 19 tile 28 | map 15, square (7,14) facing east, column 4 row 6 |  |
| `tile:15:a02e5fc776e030bcdb0a53b32c5dec7118e002e7fbb4cfaf16c111340df87ac3` | 8X8D2 block 19 tile 30 over 8X8D1 block 203 tile 12 | map 15, square (5,2) facing south, column 1 row 5 |  |
| `tile:15:a5d0242f40300ce4430911f8dfef4781743c003d6044f67a5b80acfa5430ecf6` | 8X8D2 block 19 tile 7 over 8X8D2 block 23 tile 30 | map 15, square (14,7) facing north, column 10 row 6 |  |
| `tile:15:a7f8b48e94e81227b121dee6ca24ebf0d21ca99340cd2c87e821b690bd67cfb0` | 8X8D2 block 19 tile 20 | map 15, square (4,2) facing east, column 0 row 4 |  |
| `tile:15:aa2a84c83ee90c748fd63e7608c2d169092c076a8111eb1020760aee6e5d5e23` | 8X8D2 block 19 tile 56 | map 15, square (8,14) facing east, column 2 row 5 |  |
| `tile:15:aaaf41f48c2a366d2b384e041f9bc822f5feeb7fa88173c5fb45258d2f56a6e9` | 8X8D2 block 19 tile 6 over sky colour 11 | map 15, square (6,0) facing south, column 0 row 3 |  |
| `tile:15:ad7d0e1e28e29d158bdd2ee2e0c9e59afafb410389753d1c79a82544a47a6010` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 41 | map 15, square (5,2) facing east, column 10 row 5 |  |
| `tile:15:ae6a3e5324ac5a5b51116bc80337eb298bc10ea53fd15c1273533928059011c5` | 8X8D2 block 19 tile 7 over sky colour 15 | map 15, square (4,2) facing east, column 1 row 3 |  |
| `tile:15:b2d651ff8e33e94dc6729d6d371f1537e2a09c55ab96315f17250174072d1832` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 43 | map 15, square (5,2) facing east, column 10 row 6 |  |
| `tile:15:b6da349fcd0f2f758715c1bc179a44275fd258e6de18df11b7a536c639c295a1` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 37 | map 15, square (11,2) facing east, column 10 row 5 |  |
| `tile:15:b7600e44b70ba27452819ccfde0afc246d7f64c566b93625a3e37671f4cce66f` | 8X8D2 block 19 tile 16 over sky colour 0 | map 15, square (5,3) facing north, column 10 row 3 |  |
| `tile:15:c52814a57764bc734fedb891d367d67fe01931d332ad3affda0d1ce7eab06e86` | 8X8D2 block 19 tile 62 over 8X8D2 block 19 tile 13 | map 15, square (3,8) facing west, column 1 row 5 |  |
| `tile:15:c7194fbda4b141432df1ad82086ab37a787a51632fb517eb31f7a63c82ca64a9` | 8X8D2 block 19 tile 53 over sky colour 15 | map 15, square (0,0) facing east, column 9 row 4 |  |
| `tile:15:cb08651fc3136a32a4929a27f2d7fdfccf452e3cda87f7582cfedea23c41f339` | 8X8D2 block 19 tile 62 over 8X8D2 block 19 tile 37 | map 15, square (12,3) facing north, column 1 row 5 |  |
| `tile:15:cbc1231f62bb1817b727f8e54a187cd573bbbf076a6e512c2fd4ddc5f68d2edd` | 8X8D2 block 19 tile 30 over 8X8D2 block 19 tile 8 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (6,2) facing south, column 4 row 5 |  |
| `tile:15:cbf79ff6a55b43ae2923dcc4ab60369da5a0310bdb718d95e6a2f9d8c1f9c2fa` | 8X8D2 block 19 tile 7 over 8X8D2 block 23 tile 5 | map 15, square (14,6) facing south, column 1 row 6 |  |
| `tile:15:d2398c777765cf8d00e10d09674e1f6fc59ee2f9f8f2844850156f972c016680` | 8X8D2 block 19 tile 7 over 8X8D2 block 19 tile 12 | map 15, square (2,8) facing west, column 1 row 8 |  |
| `tile:15:dc911cb26109fedd8420ff441590f02ca7e728df8fa5068ea8aad3bd39309f2e` | 8X8D2 block 19 tile 31 over sky colour 11 | map 15, square (6,0) facing east, column 9 row 4 | `new-phlan-civic-terrain-dc911cb26109.png` (area 0, 8, 11) |
| `tile:15:dcf1d1bfda434c680fdf4c8ae574df16a584d69bc6ba896c6d7abdac184ea081` | 8X8D2 block 19 tile 7 over 8X8D2 block 23 tile 11 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (14,7) facing north, column 10 row 5 |  |
| `tile:15:e1beb5b3282d45ff5e17b0d8a754d98059ee968351416a174ba473b985811941` | 8X8D2 block 19 tile 7 over sky colour 0 | map 15, square (3,7) facing west, column 1 row 3 |  |
| `tile:15:e2fbce1ef790c3e85a0055497e6ddd6ab03332777853842000452d146466be28` | 8X8D2 block 19 tile 31 over sky colour 15 | map 15, square (6,0) facing east, column 9 row 4 |  |
| `tile:15:ecc2351f72b4b5ce071bf6f854df4dea5bdcd7582f7ac3348a81e0543221e560` | 8X8D2 block 19 tile 48 | map 15, square (8,14) facing east, column 3 row 6 |  |
| `tile:15:f05c8c35b565f99648a55dc179a0ca3ca7072094b475ecab3415d5da531724c0` | 8X8D2 block 19 tile 68 | map 15, square (4,2) facing south, column 7 row 5 |  |
| `tile:15:f957e637133a5cfaf42b060aa35f274f89936ab796f5e9f807cbf02d1dfd3702` | 8X8D2 block 19 tile 17 over sky colour 0 | map 15, square (5,3) facing north, column 0 row 3 |  |

#### tile set 8X8D2 block 23 (13)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:15:0d395f35c423a8c381d9123b8d10216a45d625127dcaf72cc887c45ef51ef430` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (14,0) facing south, column 1 row 5 | `stojanow-legacy-cell-0d395f35c423.png` (area 9) |
| `tile:15:1988ac0ebd764a91570c1ee15fbffc06d65104fe257f4f5faf283cdb58e249e3` | 8X8D2 block 23 tile 29 over 8X8D2 block 23 tile 29 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (13,0) facing east, column 5 row 5 | `stojanow-legacy-cell-1988ac0ebd76.png` (area 9) |
| `tile:15:1e7a6c09a5e78304b5e46f4064f3e7de19c4437e10189e92324c83e29f832c6b` | 8X8D2 block 23 tile 5 | map 15, square (14,0) facing south, column 1 row 6 | `nomad-rail-sand-edge-1e7a6c09a5e7.png` (area 9, 17) |
| `tile:15:4398ba02b7f56393f1b451622f940fdf7ae68a382006fa7974067695f9d0bd5e` | 8X8D2 block 23 tile 46 over 8X8D1 block 203 tile 12 | map 15, square (15,2) facing north, column 6 row 5 | `stojanow-legacy-cell-4398ba02b7f5.png` (area 9) |
| `tile:15:4723cfae9987040d6fe598a64534c4214ff38409a832502e150f7f2cdb870c2a` | 8X8D2 block 23 tile 11 over 8X8D2 block 23 tile 11 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (14,0) facing east, column 5 row 5 | `stojanow-legacy-cell-4723cfae9987.png` (area 9) |
| `tile:15:6ded5463acccbf3faf497bc8c6192cd0610a7b74017d82883f2984c61c129f5e` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 15, square (14,0) facing south, column 1 row 5 | `nomad-rail-horizon-6ded5463accc.png` (area 17) |
| `tile:15:8c8fedef57e2b1feb1568258ac1bbc599576aa625e158b73a979eb03428615b7` | 8X8D2 block 23 tile 46 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 15, square (15,3) facing north, column 6 row 5 | `nomad-rail-horizon-8c8fedef57e2.png` (area 17) |
| `tile:15:ace09f66eadee89411a734bd12b5998e664b732778c39bc5eb26a1d6e386a949` | 8X8D2 block 23 tile 40 | map 15, square (2,9) facing south, column 4 row 6 | `lizard-yard-wet-ground-ace09f66eade.png` (area 16) |
| `tile:15:cfa5fd82ad4373ff737b245cdd2513eb9ab37a3c2820b7c003258a2c53660d65` | 8X8D2 block 23 tile 29 over 8X8D2 block 23 tile 29 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 15, square (13,0) facing east, column 5 row 5 | `nomad-rail-horizon-cfa5fd82ad43.png` (area 17) |
| `tile:15:d69d4cd121365a3bacf96732bfb8730831031538ace2a09b76fd8b6a3a9b0efa` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 15, square (14,0) facing south, column 1 row 5 | `nomad-rail-horizon-d69d4cd12136.png` (area 9, 17) |
| `tile:15:ebe9491fc52930a8100617e220f358bda985be1a994081df91cc78314a4ad9a2` | 8X8D2 block 23 tile 47 over 8X8D1 block 203 tile 12 | map 15, square (2,14) facing west, column 1 row 5 | `stojanow-legacy-cell-ebe9491fc529.png` (area 9) |
| `tile:15:ed42f930fb109af3049c1d96ecba5b1779dc0f5e62b3b0da1b0067f0bf382103` | 8X8D2 block 23 tile 46 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 15, square (15,3) facing north, column 6 row 5 | `stojanow-legacy-cell-ed42f930fb10.png` (area 9) |
| `tile:15:ef67b219e9658ff3e32bc27b9368a2017398638ae45700052437c54da519700e` | 8X8D2 block 23 tile 11 over 8X8D2 block 23 tile 11 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 15, square (14,0) facing east, column 5 row 5 | `nomad-rail-horizon-ef67b219e965.png` (area 17) |

### Area 16: The Lizardman Keep (59)

Map 16, 30; WALLDEF8 block 9 (tiles 8X8D8 block 9), block 20 (tiles 8X8D8 block 20), block 23 (tiles 8X8D8 block 23); WALLDEF8 block 9 (tiles 8X8D8 block 9), block 17 (tiles 8X8D8 block 17), block 23 (tiles 8X8D8 block 23).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,0) facing east, column 4 row 5 | `stojanow-boardwalk-d20d585641c6.png` (area 0, 1, 2, 7, 9, 13, 14, 15, 17, 18, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:5f57b5f1c4d81d263e49f7fba1ce046ca28f98846ad11666368c24c361633169` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (4,6) facing south, column 8 row 5 | `podal-workshop-lanes-terrain-5f57b5f1c4d8.png` (area 15, 18, 29) |

#### tile set 8X8D8 block 9 (7)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:0ae963b7e3ae7860902898b9eaebf7e2c5b8696e1ca2425d3bb36b01eabbb10b` | 8X8D8 block 9 tile 42 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (6,14) facing east, column 6 row 5 | `zhentil-legacy-cell-0ae963b7e3ae.png` (area 28) |
| `tile:16:332ea602752f60f17beb82a3d53ab5e110ab4ad1eac48920858245111bb452bd` | 8X8D8 block 9 tile 49 over sky colour 0 | map 16, square (8,15) facing east, column 0 row 3 | `zhentil-legacy-cell-332ea602752f.png` (area 9, 28) |
| `tile:16:984d30227a603293ecfca9b0cd0e80157a905f43527819de05c337275ec4f2fd` | 8X8D8 block 9 tile 26 over sky colour 0 | map 16, square (0,0) facing south, column 10 row 0 | `stojanow-gate-terrain-984d30227a60.png` (area 9, 28) |
| `tile:16:e213f222fc2e4f51ae5608c2299fd2dfb8f1609d737dc01692b6824d3fa0a262` | 8X8D8 block 9 tile 45 over sky colour 0 | map 16, square (7,15) facing east, column 2 row 4 | `zhentil-legacy-cell-e213f222fc2e.png` (area 28) |
| `tile:16:e5aa3be4526ec0e96b089822c9a6290a6b74a423c00b6973692f5d25dd767c29` | 8X8D8 block 9 tile 56 over sky colour 0 | map 16, square (8,15) facing west, column 10 row 3 | `zhentil-legacy-cell-e5aa3be4526e.png` (area 9, 28) |
| `tile:16:ea2245a40961c3fe8086c6990711efe7c9378be72b9ac7844c5bc47b86cbaec0` | 8X8D8 block 9 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (10,14) facing west, column 4 row 5 | `zhentil-legacy-cell-ea2245a40961.png` (area 28) |
| `tile:16:f8ca3a417a1a3fd9d54e5c394f94b0f878b2f3aded71e1275305953be0257580` | 8X8D8 block 9 tile 27 over sky colour 0 | map 16, square (0,0) facing north, column 0 row 0 | `stojanow-gate-terrain-f8ca3a417a1a.png` (area 9, 28) |

#### tile set 8X8D8 block 17 (13)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:077dcfc01a2bd671fff498fcaaa9e7eca9db4c71ee23b17bb45b22e1248caa9f` | 8X8D8 block 17 tile 7 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (9,9) facing south, column 8 row 5 | `buccaneer-kobold-screen-13-077dcfc01a2b.png` (area 13) |
| `tile:16:078b0659a02a42d414682c7474a1b3eb398e42a2fc03b80ac9dc85ae41722413` | 8X8D8 block 17 tile 8 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (9,9) facing south, column 7 row 5 | `kobold-caves-terrain-078b0659a02a.png` (area 13) |
| `tile:16:36fefc2a1f1ee2f94abc0cad41b70938e64491d43a8fc433cd1cd66f2435855f` | 8X8D8 block 17 tile 5 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (12,2) facing north, column 9 row 5 |  |
| `tile:16:5d01aaf5f57fc1d37118b04e8f11aa9daf185c9c7534cfdcc744c0ef89216875` | 8X8D8 block 17 tile 8 over sky colour 0 | map 30, square (9,9) facing south, column 7 row 4 | `kobold-caves-terrain-5d01aaf5f57f.png` (area 13, 29) |
| `tile:16:68148839fd8c61a821bf81c69686e0617b35dc4221ca6241550f0473325391cf` | 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (5,4) facing south, column 1 row 5 | `kobold-cave-silt-68148839fd8c.png` (area 13) |
| `tile:16:701267ab8c4c4caa3cb9e71d36d3226504131fc575c70abe2021e6863519ed3a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 67 over sky colour 0 | map 30, square (7,6) facing north, column 1 row 4 | `buccaneer-kobold-screen-13-701267ab8c4c.png` (area 13) |
| `tile:16:b415914172fb2a6b7f92cd6af7949842d364811056ab7bbed53b51c22072d5a8` | 8X8D8 block 17 tile 4 over 8X8D8 block 17 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (13,2) facing north, column 4 row 5 | `buccaneer-kobold-screen-13-b415914172fb.png` (area 13) |
| `tile:16:c31f352e01707674dfce9c646cfbc54bc71c48b71f78bfec649f90ec3abbde9e` | 8X8D8 block 17 tile 67 over sky colour 0 | map 30, square (11,1) facing south, column 7 row 4 | `wild-cave-chamber-c31f352e0170.png` (area 13, 27, 29) |
| `tile:16:e905e306533daa70b0c31488a22c6cfe96b4d479c77f0308f65cd2c19bf7cd42` | 8X8D8 block 17 tile 7 over sky colour 0 | map 30, square (9,9) facing south, column 8 row 3 | `buccaneer-kobold-screen-13-e905e306533d.png` (area 13) |
| `tile:16:f02d93a6f833b905131d6b6877aa8e84104648cbd32e01727f213c6572d36d5e` | 8X8D8 block 17 tile 58 over 8X8D8 block 17 tile 58 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (7,3) facing south, column 5 row 5 | `kobold-cave-silt-f02d93a6f833.png` (area 13) |
| `tile:16:f3807374be42fcf068e6d0ce405ff214d37a75d60c11205dd749eab1c142f41d` | 8X8D8 block 17 tile 45 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (12,3) facing north, column 7 row 5 | `buccaneer-kobold-screen-13-f3807374be42.png` (area 13) |
| `tile:16:f3b8ed60dfea0d255f2517e43f2a8f866e22c297594c71d9fc0b24a2882e212b` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 16 over sky colour 0 | map 30, square (2,2) facing south, column 5 row 1 | `kuto-catacomb-joins-f3b8ed60dfea.png` (area 13, 29) |
| `tile:16:fb3456a245391138a53228c5ad7096ee14c19ee2d6b2202614fa8428477ee447` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 30, square (2,4) facing north, column 6 row 5 | `kobold-return-edge-cap.png` (area 13) |

#### tile set 8X8D8 block 20 (21)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:0aa866b7c8a03753ac3f65e800a96a02422cd755e24c8112becee3e91c081f00` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (5,5) facing south, column 8 row 5 |  |
| `tile:16:10bb9e1d09d562f20c1d48af012226fb1e3a18378cda5a864eacc5e088581d17` | 8X8D8 block 20 tile 33 over sky colour 0 | map 16, square (0,0) facing north, column 10 row 4 | `podal-workshop-lanes-terrain-10bb9e1d09d5.png` (area 2, 10, 18, 29) |
| `tile:16:1a5b7f49a900a990d320c3b3dc884abcdc39804405906841c39d981e9494e58b` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 30 over sky colour 0 | map 16, square (4,7) facing west, column 0 row 3 | `kuto-inner-lane-terrain-1a5b7f49a900.png` (area 10, 29) |
| `tile:16:1a6da4631b68f9486257449a164bba8394ba5f8f91ebb204eea6e6a75b453705` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 61 over sky colour 0 | map 16, square (13,0) facing north, column 2 row 3 | `kuto-inner-lane-terrain-1a6da4631b68.png` (area 10, 29) |
| `tile:16:549cfce088a28792b1506be7122282e36ce8ccc7ebf3ac6cf1edee07a3ea0535` | 8X8D8 block 20 tile 60 over 8X8D8 block 9 tile 26 over sky colour 0 | map 16, square (1,0) facing north, column 9 row 4 |  |
| `tile:16:6154305902cab11c3fde9f328cf82649f41e1cfa347627a148c2a4165aecc045` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 32 over sky colour 0 | map 16, square (13,0) facing west, column 9 row 3 | `kuto-north-rubble-terrain-6154305902ca.png` (area 10, 29) |
| `tile:16:672545b106bfe0346c520433c779a59a924b6fe53b77d938c5966e87277b9224` | 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,0) facing north, column 9 row 5 | `kuto-well-plaza-terrain-672545b106bf.png` (area 2, 10, 29) |
| `tile:16:75925f470540c37d95e8423291dbf9b10a68911e3d73c8ff6855df999e91856e` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 30 over sky colour 0 | map 16, square (5,6) facing south, column 7 row 4 | `kuto-inner-lane-terrain-75925f470540.png` (area 10, 29) |
| `tile:16:761101532292d10200de3ab48ddbde35b9af036dcae3deee8bbd2726cd376dbc` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over 8X8D8 block 9 tile 27 over sky colour 0 | map 16, square (0,1) facing north, column 3 row 3 |  |
| `tile:16:7bae6ad4dc9f7458785b253f4ba7aa4e79b21ec83cf56b7cf08e1d80da7b639d` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 61 over sky colour 0 | map 16, square (2,8) facing east, column 4 row 4 | `kuto-street-joins-7bae6ad4dc9f.png` (area 10, 29) |
| `tile:16:83fce327925de1356cfb138ecaa290efc9d7ff862c8ea29049d841c97635310d` | 8X8D8 block 20 tile 35 over sky colour 0 | map 16, square (3,0) facing west, column 10 row 4 | `kuto-north-rubble-terrain-83fce327925d.png` (area 10, 29) |
| `tile:16:87537403b3237ec49ad6ade7883225702e6eb6e467bb6d562c43a773acd8dbf9` | 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (5,0) facing east, column 6 row 5 |  |
| `tile:16:8bf064583936243f9e42134390a37c8be057b07f59548dd34411c06addf0849d` | 8X8D8 block 20 tile 60 over sky colour 0 | map 16, square (3,0) facing north, column 3 row 4 | `kuto-well-plaza-terrain-8bf064583936.png` (area 10, 29) |
| `tile:16:90bf5c2f3b558479ca43dba329ba716c2752673bfc08b962a46224d5976990f0` | 8X8D8 block 20 tile 32 over sky colour 0 | map 16, square (5,0) facing north, column 0 row 2 | `kuto-well-plaza-terrain-90bf5c2f3b55.png` (area 10, 29) |
| `tile:16:99e201c7ed1d809d0b8d763a14c2ff50b4237d5432ae0a11e63b495ec090f0c4` | 8X8D8 block 20 tile 33 over 8X8D8 block 9 tile 26 over sky colour 0 | map 16, square (4,4) facing north, column 10 row 3 |  |
| `tile:16:a6425525f36c25b2edccf0c045476b56dc4eb36bc6323843755520582a65b885` | 8X8D8 block 20 tile 36 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (5,5) facing south, column 7 row 5 | `kuto-podal-side-streets-kuto-terrain-a6425525f36c.png` (area 10, 29) |
| `tile:16:b4b96962ce24bbcfec62e5e9c2eb1e3e59345274a145572b868e2df0acdfc0cb` | 8X8D8 block 20 tile 61 over sky colour 0 | map 16, square (11,0) facing north, column 2 row 3 | `kuto-well-plaza-terrain-b4b96962ce24.png` (area 10, 29) |
| `tile:16:be0f05606982f82571cfe1f80c5a857065cd2be4951895f70ddca1d2baa6ae61` | 8X8D8 block 20 tile 31 over sky colour 0 | map 16, square (5,0) facing south, column 10 row 2 | `kuto-north-rubble-terrain-be0f05606982.png` (area 10, 29) |
| `tile:16:c1a91ac2d36d5a0a0788b2fd4d9627f9d2c2fd7e0da217c748a6ee296aa31e52` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (1,0) facing north, column 5 row 5 |  |
| `tile:16:eb5afbdeb219be5d4a1620bb37d14ebe52a4e0398c791e3fed4499fc1ca573ce` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 33 over sky colour 0 | map 16, square (5,7) facing south, column 10 row 2 | `kuto-inner-lane-terrain-eb5afbdeb219.png` (area 10, 29) |
| `tile:16:f55efcfb82c8a2d442899a96985aefd0f1548082791b8a6f6a92dbed77ddca67` | 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (1,0) facing north, column 4 row 5 |  |

#### tile set 8X8D8 block 23 (16)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:1cc104902a6ddef793920b9780b760e2a1bd245539ee4df928c4c6ac1b1aeee3` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 7 row 5 |  |
| `tile:16:28922bceeed1830e0addb7f697be890b0e82456dd926b32644c0b43cd36e646a` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (15,4) facing south, column 0 row 5 |  |
| `tile:16:4aa8991244516f9b2e602f676d9842e45fa86fd40fc789286ca1db18ab281b4a` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 6 row 5 |  |
| `tile:16:4d0fe8310698838e05e7390103e5210ead4753ecf4b853d62550087a83a34d29` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (1,6) facing west, column 1 row 5 |  |
| `tile:16:4e82a643ec587d21cada48672f0c4bfdbdc446db5677b59f8c154c4373a297d5` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (9,0) facing east, column 0 row 5 |  |
| `tile:16:58cabaf42f263c96676f71af9848f98269523a8065c0b24e9d7a288cee14b476` | 8X8D8 block 23 tile 45 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (1,0) facing west, column 9 row 5 |  |
| `tile:16:6480ae5bb1b7606bd358795ec5b70c372f1f857632f72803614d907f2089f6cb` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (10,0) facing east, column 2 row 5 |  |
| `tile:16:67642a1b24acd62d6e864e071efb162ced7b9f846d3073c758756083648ee5b8` | 8X8D8 block 23 tile 43 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (3,0) facing east, column 4 row 5 |  |
| `tile:16:979a4679248be6cb6f5590d76c183a0b5de4001c63941ab1dd211c0818510929` | 8X8D8 block 23 tile 45 over 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,7) facing west, column 4 row 5 |  |
| `tile:16:b222b393924ebde8e12e751f0b5b8cc7dc62df8693b6fbdf0165df3c3d238d5c` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 8 row 5 |  |
| `tile:16:b90191fce062c2df76765a7f1ef4ab41dce8dbfe90162a613ff5e44d5062070b` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (11,0) facing north, column 5 row 5 |  |
| `tile:16:b96b67d001b514a8b40e71ffb395bb9d8db8c7f1b83202d65583f5688307c09e` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 45 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (2,15) facing west, column 4 row 5 |  |
| `tile:16:c1cc41a8389e86ae2a73d9ee7b94a519febf24651c5002a7a31ee7a1afb18306` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (9,0) facing east, column 1 row 5 |  |
| `tile:16:c3b0f28f5941074ee24fce9145ed4599e358eee156132add7605986dc8544917` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 9 row 5 |  |
| `tile:16:d73738b6618811187934ee1a95a661fea22cacac2982a009ef048eb510b273dd` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 10 row 5 |  |
| `tile:16:f5e896328c7dc431d30e8c932392d139aec0c421bf22e306bf296eeca393c92d` | 8X8D8 block 23 tile 44 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 16, square (4,0) facing north, column 10 row 5 |  |

### Area 26: Wilderness, middle (190)

Map 26; WALLDEF7 block 7 (tiles 8X8D7 block 7), block 8 (tiles 8X8D7 block 8), block 23 (tiles 8X8D7 block 23).

#### plain sky, horizon and ground (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:09473fb0c069ff97e2a2daacf5b504830c53d6884503715e0c19cf16a145d3c3` | the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 0 row 5 |  |
| `tile:26:8bcc06efdf06b3769418465aeb92a19e990cc54c212c2e7af5c4fe0897b17b35` | the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 0 row 5 | `orc-joint-fe0897b17b35.png` (area 0, 1, 2, 3, 4, 5, 6, 8, 11, 14, 15, 16, 17, 20, 21, 24, 28, 31) |

#### shared tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:5f57b5f1c4d81d263e49f7fba1ce046ca28f98846ad11666368c24c361633169` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (3,1) facing south, column 2 row 5 | `podal-workshop-lanes-terrain-5f57b5f1c4d8.png` (area 15, 18, 29) |
| `tile:26:79f10a451d41cdb7f5f72757c36094300c7dcb298ee8adea8d79a034bc93259e` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (3,1) facing south, column 2 row 5 | `kuto-daylight-horizon-79f10a451d41.png` (area 29) |
| `tile:26:a2d4fb40e19b088ea40efa98dbfbec50a513a27d9857eb8f69e06a0987446e6c` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (3,1) facing south, column 2 row 5 |  |

#### tile set 8X8D7 block 7 (58)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:06c172195af69c6803d49dd5383a9566e2c3443276f705ade2cf9b52d458c4e8` | 8X8D7 block 7 tile 0 over 8X8D7 block 8 tile 32 | map 26, square (4,15) facing east, column 10 row 7 |  |
| `tile:26:0852506e4ab1c9afeb335b54d670524f4c934ccd10ec2c026e7ecc7adf2aa2f7` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (8,11) facing west, column 4 row 4 |  |
| `tile:26:0e6cbe18a8a92ad9b2b9500268f0c182de7131dd3903e5ed916b0e12ba9375ad` | 8X8D7 block 7 tile 19 over the ground colour 8 | map 26, square (10,0) facing north, column 8 row 7 |  |
| `tile:26:12f52d2b1e182ced19373a8a517c25b13aecd9a617a01fc3a50244efbfef8d5f` | 8X8D7 block 7 tile 45 over 8X8D7 block 7 tile 45 over the ground colour 8 | map 26, square (4,11) facing north, column 4 row 7 |  |
| `tile:26:149c6ea449b1072dc433c66be2cc9fea4365e52876c3f8b83a5e86e726dfde9c` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (8,13) facing west, column 10 row 4 |  |
| `tile:26:156a30f68b10cb275a9b8ee15d616da37aa131d41610ed076bfd14a322464c14` | 8X8D7 block 7 tile 45 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (4,11) facing west, column 0 row 5 |  |
| `tile:26:1d1f11735aa1abd03b26f8064c9f8703b99503f0984aefa72d7e8dd613c832dd` | 8X8D7 block 7 tile 55 over 8X8D7 block 7 tile 55 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 7 |  |
| `tile:26:2187d06c31a6c359ffe84dda538f14aea42b23dcc17e32279f7ab26bb7b3322e` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 14 | map 26, square (3,0) facing west, column 10 row 4 |  |
| `tile:26:24d594840521cf5d98895182b43307fcde18dbb0e043f9014447b3ba05a7a410` | 8X8D7 block 7 tile 19 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (2,15) facing east, column 1 row 3 |  |
| `tile:26:289227b52d663bd3ce2729ba2b69e151fbfc9725baf3e6af6eb4cdebc1e493b5` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 55 over sky colour 14 | map 26, square (2,15) facing north, column 9 row 3 |  |
| `tile:26:39e4c97e1d6f4061c31b294f8f16f9a91a7bdf62a28fb3a9c507713e77a3e35d` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (1,0) facing east, column 0 row 4 | `nomad-canvas-joins-39e4c97e1d6f.png` (area 17) |
| `tile:26:428d34ea8886dce67e324bf68c2c93f1e192a08f8f22add318feb401d2c7428c` | 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (0,0) facing east, column 1 row 4 | `nomad-canvas-joins-428d34ea8886.png` (area 17) |
| `tile:26:42b5602454f3d50149ed8cf0544a95a45906735b91af6a68a133de3ae5d4fb39` | 8X8D7 block 7 tile 16 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (6,9) facing south, column 4 row 4 |  |
| `tile:26:4fcfa1b300546896594b37ea1febf52db8e6a541c97eb4a87a6ceb3a6f94e3a9` | 8X8D7 block 7 tile 52 over 8X8D7 block 7 tile 52 over the ground colour 8 | map 26, square (4,11) facing north, column 5 row 7 |  |
| `tile:26:525cc32fd542b5dc483cfcd9593270ae23c0c61e8a3874e7d76a505f69b9b632` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 9 row 5 | `nomad-canvas-joins-525cc32fd542.png` (area 17) |
| `tile:26:5f44632f05d771e4005637b5bb2b7262ee6185345f345acbbb4f2260ec4015d8` | 8X8D7 block 7 tile 2 over sky colour 14 | map 26, square (0,0) facing north, column 10 row 4 |  |
| `tile:26:6271e2b56d8ed39f6f91f3e04494ec47ae843e8ba717e75a8f8f8de57caae4ec` | 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (0,0) facing north, column 10 row 4 | `nomad-tent-canvas-daylight-edge-6271e2b56d8e.png` (area 17) |
| `tile:26:63debdc444f6dd67fede14391bbf5aaf798e2f5d279e9d45b79258ba7a69a0ee` | 8X8D7 block 7 tile 19 over 8X8D7 block 8 tile 40 over sky colour 11 | map 26, square (2,15) facing east, column 1 row 3 |  |
| `tile:26:657a4944c4dce97784193c5f78d0fedff70af67ede53772169ef40934c8e7ef4` | 8X8D7 block 7 tile 20 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 1 row 5 | `nomad-canvas-joins-657a4944c4dc.png` (area 17) |
| `tile:26:68c7eacbd3e4e57c29df3d5c140da29b9143bc6b38104afdf53f0b7d77d4c4b6` | 8X8D7 block 7 tile 25 | map 26, square (1,10) facing east, column 10 row 7 | `nomad-inner-trail-68c7eacbd3e4.png` (area 17) |
| `tile:26:6b3b37e84f0464cd493d837b238594d9b8a60bbb8b5ad87c0fd2fca7e21f3a6f` | 8X8D7 block 7 tile 43 over the ground colour 8 | map 26, square (9,0) facing north, column 9 row 6 |  |
| `tile:26:7747179433157995403250255a3b76192335fea42a1ebea6bd1b9377d9f17af0` | 8X8D7 block 7 tile 45 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (4,11) facing west, column 0 row 5 |  |
| `tile:26:78ecc7bee3a4221a41e78389dcda81cbd4d6f882d730cdc306375ed25f93e5b7` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 55 over sky colour 11 | map 26, square (2,15) facing north, column 9 row 3 |  |
| `tile:26:7a167a44e892f9db4e73bf97a1547e1a2e30a2b73a2ae3b22a57f01c77dd63f5` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (3,0) facing west, column 10 row 4 | `nomad-canvas-joins-7a167a44e892.png` (area 17) |
| `tile:26:7fc75d2d9f236b7468337d3bda69d881527bc8ddf05ae9581bd9bb9dd0f78ea9` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 40 over sky colour 11 | map 26, square (7,10) facing west, column 1 row 3 |  |
| `tile:26:823960264055d8a6335e57bce9a738945a58775e8bb098c356fcbcc4d5a58000` | 8X8D7 block 7 tile 42 over the ground colour 8 | map 26, square (9,0) facing east, column 2 row 6 |  |
| `tile:26:8561492a597e081214f02b6e9e2c89fa3bd753f439900e5679c5de98e5c4434b` | 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (0,0) facing north, column 10 row 3 | `nomad-canvas-joins-8561492a597e.png` (area 17) |
| `tile:26:8abb0abfa5df5dbe9fc7db5839a6d7834d25848f1514e950bb7e62ee42504911` | 8X8D7 block 7 tile 19 over 8X8D7 block 8 tile 40 over sky colour 14 | map 26, square (2,15) facing east, column 1 row 3 |  |
| `tile:26:8c502b5c32feef3e5a69b20d77149d2120825b5f12712852ffd6beb3cd14fb81` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (8,13) facing west, column 10 row 4 |  |
| `tile:26:930e47c654cb4204c3b7591687d5402cd660b90fa4ec6317dd05b9e143588601` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing north, column 9 row 5 |  |
| `tile:26:948df3e4533789428269e0a1dac895b830fc222107e05c2e4b6471701840d26e` | 8X8D7 block 7 tile 44 over the ground colour 8 | map 26, square (4,11) facing east, column 4 row 6 |  |
| `tile:26:94d637bc6e2f4bf26ccde1b2a87f3c3f33824fe9e8e40b594b845f874bf50b5a` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (1,0) facing east, column 0 row 4 |  |
| `tile:26:954864dabf7dfbc45a33462ebc027be197d02328a507146a2727b451c8e6c99a` | 8X8D7 block 7 tile 15 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (1,14) facing east, column 6 row 4 |  |
| `tile:26:994476648e8dfcd90bfb329dc5b05961b3fbfc82c754f00062d205df80be7a72` | 8X8D7 block 7 tile 28 | map 26, square (9,10) facing south, column 8 row 8 | `nomad-inner-trail-994476648e8d.png` (area 17) |
| `tile:26:a431e80300faaa6a936ea41af8879d4bb0a800f733a24c3c886e9c83db70171d` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (1,0) facing north, column 7 row 4 |  |
| `tile:26:a918ea06119c2d2c402ec352e03184a52677444c754b103e80140ac3edae7b88` | 8X8D7 block 7 tile 46 over the ground colour 8 | map 26, square (9,0) facing east, column 3 row 6 |  |
| `tile:26:acd3f25c3290e989550a208d67b6d82a95119dfa4aa8562c7b411a11729c6b60` | 8X8D7 block 7 tile 15 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (1,14) facing east, column 6 row 4 |  |
| `tile:26:ae562b52d8473d99c7acc99ebb273387f89888ea7245a2f785242111b535ed1b` | 8X8D7 block 7 tile 15 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,14) facing east, column 6 row 4 |  |
| `tile:26:b415f26f377677b4cba0fb4286aeb64d973039f8c7627cc6d2fe1518e892f4a3` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 16 over sky colour 14 | map 26, square (2,0) facing north, column 4 row 4 |  |
| `tile:26:b8a1ed0bfe1e9c30995a1bfa688b1a0eeee4de9c53b6260db835b71268601173` | 8X8D7 block 7 tile 16 over sky colour 14 | map 26, square (0,0) facing east, column 1 row 4 |  |
| `tile:26:bb26c1c697f36a2ae985941151ee380716bd02c9df40631660794cfec3547cc3` | 8X8D7 block 7 tile 16 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (6,9) facing south, column 4 row 4 |  |
| `tile:26:bea6b15ee028518639095b6eaa126e7182d4dc736f13df9442cec0e603fb9109` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (8,11) facing west, column 4 row 4 |  |
| `tile:26:bec43d1513ddd268dca32940855bbcba6936af7fcfdb7bec08eb1fe40f98043a` | 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (0,0) facing north, column 10 row 3 |  |
| `tile:26:c0450d9bf1998e77789d084426462c2f8aaf0c0dde9d2ce176ec448dadd8a14b` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 55 over sky colour 0 | map 26, square (2,15) facing north, column 9 row 3 |  |
| `tile:26:c0d9eb6b111dccaf822996120467f4838544e5804289e3b4c01fcd19a7daa3d8` | 8X8D7 block 7 tile 15 over sky colour 11 | map 26, square (2,0) facing north, column 10 row 3 | `nomad-canvas-joins-c0d9eb6b111d.png` (area 17) |
| `tile:26:c2ea6eff10d001b70758bab106f9f458a9d850c452382619449a3923b88c3112` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 9 row 5 |  |
| `tile:26:c509ca48ac04ec5b325ea3c1bf97c19fbbbabc8ba76e2a29b643c1658ed9ed26` | 8X8D7 block 7 tile 45 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (4,11) facing west, column 0 row 5 |  |
| `tile:26:c7a112e1bfebc8c75050f01cac8a7990c39e9e462bfca7dedc598d4aa15c4b92` | 8X8D7 block 7 tile 20 over 8X8D7 block 7 tile 6 | map 26, square (2,9) facing south, column 6 row 5 |  |
| `tile:26:d0d7469410ab1cc66ee3f6bece4272942bd9b8e949921463b142fedf7cbb447e` | 8X8D7 block 7 tile 15 over sky colour 14 | map 26, square (2,0) facing north, column 10 row 3 |  |
| `tile:26:d18ab5c0ce1521909b05235b6b6bd10056d1054a839f0947c2d425ea52c18597` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (2,0) facing north, column 4 row 4 | `nomad-canvas-joins-d18ab5c0ce15.png` (area 17) |
| `tile:26:d4e939cacb1068233591e712f2224901191f4c67e552bbf10b2c416e9c83468d` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 40 over sky colour 14 | map 26, square (7,10) facing west, column 1 row 3 |  |
| `tile:26:db4f51aa3d610f2a85e8723bf63572cb993a39e6313e9bef5426dbbdee7cb42e` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (1,0) facing north, column 7 row 4 | `nomad-canvas-joins-db4f51aa3d61.png` (area 17) |
| `tile:26:dd4050acf789b4af92cdeea1c2c2411411615d2ecb3479a57ec71862e5b05abe` | 8X8D7 block 7 tile 53 over the ground colour 8 | map 26, square (10,0) facing east, column 0 row 7 |  |
| `tile:26:df4ad0cbb76608e98890630f97ac02141cc128914d5e02354cfa7684652e9974` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (7,10) facing west, column 1 row 3 |  |
| `tile:26:e2daff7f76fefcb20d3e79170d3af14ec08a31ae63af859ab2f844b64e0fa785` | 8X8D7 block 7 tile 46 over 8X8D7 block 8 tile 33 | map 26, square (4,15) facing west, column 0 row 7 |  |
| `tile:26:efba91abd9f3d683ea36f5dc27d2e40d92e72e3af159659ed50a1726bfb206d3` | 8X8D7 block 7 tile 0 over 8X8D7 block 7 tile 0 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 8 |  |
| `tile:26:f015aecab9e46cb998fd6257afe68383df8ed2f9b730a1c66ecbee6b0e621cc4` | 8X8D7 block 7 tile 16 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (6,9) facing south, column 4 row 4 |  |
| `tile:26:f80e5cd6a539192958a45af8b52209e3f6d68bc7f25809c96f3db4fdd64995f5` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (8,13) facing west, column 10 row 4 |  |

#### tile set 8X8D7 block 8 (125)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:04f268e0292b2af8ef794b2a4dc979b3f6ea59c3283d43d18627d6846bd67461` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 11 | map 26, square (2,2) facing east, column 7 row 3 | `nomad-entry-terrain-04f268e0292b.png` (area 17) |
| `tile:26:06c9677d331fa4c663f40a274f0d5e0ee3e8784d7f040c8c9e9b31eca70ac65c` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 0 row 5 | `nomad-entry-terrain-06c9677d331f.png` (area 17) |
| `tile:26:0a980af61c9cf401625b905efdc527ae41f834c361071d89cc476235036f9549` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (4,0) facing south, column 8 row 4 |  |
| `tile:26:0b876a77f19f2f4c94f8a4a28942ae562807aff90fe38d37a3d5cfa9fdcda7e7` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (4,13) facing west, column 0 row 3 |  |
| `tile:26:0cee35c60132724477beb8dd12b141ee5327e410001d86ace3c1ee81940f6756` | 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,1) facing east, column 8 row 5 | `nomad-entry-terrain-0cee35c60132.png` (area 17) |
| `tile:26:0db5dcd49c1c8006f4bf707f3e1656e223894d183b56cf654bf3dc80d72b305d` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:0f698ff9dab44520b2692c4ef893f80774050951b0f7eeddf8c3134eb31ed9b6` | 8X8D7 block 8 tile 42 over 8X8D7 block 8 tile 42 over sky colour 11 | map 26, square (2,2) facing east, column 10 row 2 | `nomad-entry-terrain-0f698ff9dab4.png` (area 17) |
| `tile:26:1240091100733a6d5844e5061ec9be81ccf7ab6a890d0197059dc0757a632d9b` | 8X8D7 block 8 tile 41 over sky colour 14 | map 26, square (0,0) facing west, column 3 row 4 |  |
| `tile:26:15e8b10255e97e7352b9517f24d6747c206329b53d7e71a17bd2a7d0f393c238` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over sky colour 0 | map 26, square (2,2) facing south, column 3 row 4 | `nomad-south-trail-terrain-15e8b10255e9.png` (area 17) |
| `tile:26:1614cabf2f6d89de18ea7402f0684c9eae82360b970a502852fc66ec6b85fd00` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:1b521d0c4d8f2f9c521c5594863604093a7875a0763ffa9dd65d70a7592d094d` | 8X8D7 block 8 tile 18 over sky colour 0 | map 26, square (0,0) facing west, column 0 row 2 |  |
| `tile:26:21649105ebd59325893daa71c43e88adb2b6813f5ae9ccba21b9eacdd44a59e0` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 7 tile 16 over sky colour 14 | map 26, square (2,1) facing north, column 4 row 4 |  |
| `tile:26:230d521fefd536ebd77a37406d3dd889313a664324696041e2ba7b7d85230a34` | 8X8D7 block 8 tile 29 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 1 row 5 | `nomad-entry-terrain-230d521fefd5.png` (area 17) |
| `tile:26:234d87ea9135aca5d53f0a30962abe7ad1cb285cd43c1efd75adc2178af37e4a` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing west, column 6 row 5 |  |
| `tile:26:24ba1c5e34fe608031a6df3a388dbfddb138c066a640a6992ebce3fa085595d6` | 8X8D7 block 8 tile 57 over sky colour 11 | map 26, square (2,2) facing north, column 9 row 4 | `nomad-entry-terrain-24ba1c5e34fe.png` (area 17) |
| `tile:26:292f655257d17354cce7e6799aff856bc68ca3c70d02e0be9f7987a87cc4dec6` | 8X8D7 block 8 tile 36 over sky colour 14 | map 26, square (0,0) facing east, column 7 row 4 |  |
| `tile:26:2c9b9fa12751ae30b0e8d3139c14bcfc3b7342c57e1e3264dbebc861036d854d` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:2cefe83c01c7ba7eb3aa2c65e58626d287424a66cdfcaf27562f60c0b0cc819c` | 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (0,1) facing east, column 8 row 4 |  |
| `tile:26:2d39241567583d2e65a46ed1f3ca110e2051198b07b1d6647de92283b7eb639a` | 8X8D7 block 8 tile 18 over sky colour 14 | map 26, square (0,0) facing west, column 0 row 2 |  |
| `tile:26:310b7e9a6899803ea91ed9a46349921223764e303d59967104c700475ca1c32e` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 1 | map 26, square (5,12) facing east, column 3 row 4 |  |
| `tile:26:36eafc0b367b73d2bfc26ee9833a6749bd7fa21da6a036ae3792e10b5dd8fa62` | 8X8D7 block 8 tile 28 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing east, column 9 row 5 |  |
| `tile:26:3b877b7beb7ac239aca5e46e6be47e3c011ddafb54f4dccef1592d1d1c67facd` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 19 over sky colour 14 | map 26, square (7,0) facing south, column 2 row 4 |  |
| `tile:26:3cfb83230b6e63972f38fa12f9e3e61e7149a5f3d57dcd6995ccc595d24a97f6` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,1) facing south, column 0 row 4 | `nomad-entry-terrain-3cfb83230b6e.png` (area 17) |
| `tile:26:3f0f15df4dd059be3d1c4e54179e5e2eeddc20e8c01759aa60eb3fb5fd568e4c` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 20 over sky colour 0 | map 26, square (0,0) facing south, column 8 row 4 |  |
| `tile:26:407e2c538a9c952d3c7a99fc4eb9a64856cd5cf1760cc93f74657e3c75862868` | 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (0,1) facing east, column 8 row 5 |  |
| `tile:26:4347b5e028ac928fe64e1406c0a40e773d65c97e96f56d90149afc2db5810d7d` | 8X8D7 block 8 tile 19 over sky colour 14 | map 26, square (0,0) facing west, column 2 row 4 |  |
| `tile:26:43e75c8f3071fbd0e93f3bd98f07a3c7c56cafed22f63dc8fe77c7234d44b8d1` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:4573f8ac3e5df499c0fdbc3ec1f3938911b3a02d3bec10c3e79191352379e943` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 7 tile 16 over sky colour 0 | map 26, square (2,1) facing north, column 4 row 4 |  |
| `tile:26:45ba49af0f3f706042d6c9f8a9d2892df1a73238fe39ef6dfe05d1448f1f28fc` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:45fd1156f009e76c8f086710c0a8fc309047b23629bc1bbbeef58e22d30ffb5b` | 8X8D7 block 8 tile 19 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing west, column 4 row 5 |  |
| `tile:26:48a9f1c137ba7b76a5b8ad4c150e7566b6daa68bcd14e32c5ef85f4d7f9d66ab` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over sky colour 11 | map 26, square (2,2) facing east, column 10 row 3 | `nomad-entry-terrain-48a9f1c137ba.png` (area 17) |
| `tile:26:4947240effe92625bd5c00b7817a87117916c3bcda45520efd538e22144a9802` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 16 over sky colour 0 | map 26, square (4,13) facing west, column 0 row 3 |  |
| `tile:26:4abb3a5f165da2aab9def1404e22004fcd597029b01b91388969e46eeacd39ea` | 8X8D7 block 8 tile 20 over sky colour 14 | map 26, square (0,0) facing east, column 8 row 4 |  |
| `tile:26:4c39fe013d617114061e3f93cf1f73b5de31131766e724c26587efe310543e3c` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (1,1) facing south, column 0 row 4 |  |
| `tile:26:4faafbca57e58258d28549e313f904d970ed1e17c94f6eafc9896d571f1e67e4` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 19 over sky colour 0 | map 26, square (7,0) facing south, column 2 row 4 |  |
| `tile:26:5dc8544ede2b9d6f9a98d94f4556e7e8eaac1cc2b03fe1293684be37920bf273` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 0 row 5 |  |
| `tile:26:5ed1c7d0ff16d80cccc584b5b0e58a91cc1a24126c568015bba75377aa13b6f5` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 14 | map 26, square (5,12) facing north, column 10 row 4 |  |
| `tile:26:61a050164781f66da0cdeaa89677357be901f14d7b5b5f2835c5d81c41aa3b4c` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 19 over sky colour 0 | map 26, square (4,13) facing west, column 0 row 4 |  |
| `tile:26:636070d51d9a4205299fbece03c0af397f8ea613b11094a0e6b4445895da3604` | 8X8D7 block 8 tile 17 over sky colour 14 | map 26, square (0,0) facing east, column 10 row 2 |  |
| `tile:26:63e3623fa02a44c541c6d1c774b8c3b3e124d57903fa438aa4688d74041f2d00` | 8X8D7 block 8 tile 15 over sky colour 14 | map 26, square (0,0) facing south, column 1 row 4 |  |
| `tile:26:667786276e52104454e9f9c2aa32deb1e196c118a098ccf1de456562fac4d855` | 8X8D7 block 8 tile 17 over sky colour 11 | map 26, square (0,0) facing east, column 10 row 2 |  |
| `tile:26:6d1c0a1e107d15147ddc53b0087d9b900b68af5e52c55418e4cc05887f74fbb1` | 8X8D7 block 8 tile 15 over sky colour 11 | map 26, square (0,0) facing south, column 1 row 4 |  |
| `tile:26:6e27b294f38b4892ca276caeb88bd8bad2aeae76e6022cb5a429a166de4a47ed` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 14 | map 26, square (2,2) facing east, column 7 row 3 |  |
| `tile:26:6f244471d0d43f45ff07f5f3bfdd4dc475c64024ef0f5af1ae7568ba5da690a0` | 8X8D7 block 8 tile 19 over sky colour 11 | map 26, square (0,0) facing west, column 2 row 4 |  |
| `tile:26:743719882555cb155247940b0f296ff6263f11864a83db8c1ae4ade8eda2ea6e` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing west, column 6 row 5 |  |
| `tile:26:748c2e9c5cec4bb380ae4c85b078914a83f139ad011d9af80480d64e7a4557f4` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 55 over 8X8D7 block 8 tile 55 over sky colour 0 | map 26, square (2,2) facing south, column 3 row 3 | `nomad-south-trail-terrain-748c2e9c5cec.png` (area 17) |
| `tile:26:7798b99598ee3bdc92dcfc6f4a4cd0c1bd72e53c5b544c4fee35287f87a99a71` | 8X8D7 block 8 tile 19 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing west, column 4 row 5 |  |
| `tile:26:786993dccf9af1cc2d308c8c0aa73b308f0c0db61d2ebe4ebdb94b289cef7489` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:79b93579a671419340f89bd19c743564364418ab25f5a6d94e40815c1ed02b00` | 8X8D7 block 8 tile 58 over sky colour 11 | map 26, square (1,1) facing south, column 1 row 4 | `nomad-entry-terrain-79b93579a671.png` (area 17) |
| `tile:26:7befb7f5e8b497feb0508f160a2f16fffb17bdeda63c888da0dfa86345cb854e` | 8X8D7 block 8 tile 34 | map 26, square (0,0) facing east, column 6 row 6 | `valjevo-dungeon-briar-terrain-28.png` (area 3, 6) |
| `tile:26:7bf5a394765603ab322f390c176b7834e85094942be3e60b4777c05148909dee` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over sky colour 14 | map 26, square (0,0) facing south, column 2 row 4 |  |
| `tile:26:7d1b93888d68d03bb70192de84ccd63ba3853aa136b3dab05c7c1f5d63202ac9` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 20 over sky colour 14 | map 26, square (0,0) facing south, column 8 row 4 |  |
| `tile:26:7ddfc9b6c0342eabf84cdc86217cf578dcd68da5371291f0d39601be2343012e` | 8X8D7 block 8 tile 32 | map 26, square (0,0) facing east, column 7 row 7 | `valjevo-dungeon-briar-terrain-22.png` (area 3, 6) |
| `tile:26:7fa8f4f113cce1c9f1d8550cefd780d87610e288e43a6f639b0f9efc0670a96b` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (2,1) facing north, column 4 row 4 |  |
| `tile:26:803853241a4a21f155d2e6fc339027b7fc4f68235c523cc2494efec7c6de0c29` | 8X8D7 block 8 tile 36 over sky colour 0 | map 26, square (0,0) facing east, column 7 row 4 |  |
| `tile:26:811063002a5754116c7253d132ef0a3821249bb2dd9aa4f09af1a9be26404457` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:81e90cab1c2a69f991968319ee2c4db0099816f98ed7ab2e1be3fc22c9563124` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (4,0) facing south, column 8 row 4 |  |
| `tile:26:83a4b6bcac7a25600797b931a18ea825dba03009462a94ec7ee1483234d0fb18` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (0,0) facing south, column 0 row 4 |  |
| `tile:26:84c4b6d91532aaa5fb29e3ce5cb5e2f87f6476dbc27f7876fb04eb1d9bbce7c4` | 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 2 over sky colour 14 | map 26, square (3,13) facing west, column 1 row 4 |  |
| `tile:26:857be5d44e1cdd16fb4ef67c124b0bc85ee0ee6530c9a0e92c8ed33e45e0a417` | 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (4,14) facing south, column 9 row 3 |  |
| `tile:26:8869bea82e51ff517629ca4fe2395571be78003c8b850dad6e9da830a52c8ce3` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (0,0) facing south, column 0 row 4 |  |
| `tile:26:89ac96a8296b38dc291f77978e964f9737df8b672dc6220b31f5615332555bd9` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 15 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (5,12) facing north, column 10 row 3 |  |
| `tile:26:8c786f4b1c38fdea80ad32e55aa8e05e74853760d5d8bc848f8a02af66bd695c` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:8d63259e68489d26f88412c002c6f628de1c29bccb785100548f427ffe5e3a34` | 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 2 over sky colour 0 | map 26, square (6,12) facing east, column 1 row 3 |  |
| `tile:26:9046192a9a0adcc9eaafa905409a8c185a2b1d3f67b0f3e89f71cc50db0cf8bf` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (5,12) facing north, column 10 row 4 |  |
| `tile:26:93f4911a018d97a2d7f582fac10a63a66374441de45e675a26181608badcda08` | 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (6,12) facing east, column 1 row 3 |  |
| `tile:26:944e107665ab927c8b165e2f2934e06bbc6f38a1877c2737a7d9cfaa4b51fea4` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:9702ced2218132135d73ccef39c047d78b34aca9fc0f1b425fc1d9a04720daaf` | 8X8D7 block 8 tile 19 over sky colour 0 | map 26, square (0,0) facing west, column 2 row 4 |  |
| `tile:26:9765ec58ffacd4df6cdb5cec6eb2827dfbc286dcecf2a0eb8fba00f3721b9dfa` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (0,0) facing south, column 0 row 4 |  |
| `tile:26:994cfd79a8a7cc3f1a50743484e7592f4c1d04f1d638627df03b1e8f6fbc0319` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 0 | map 26, square (5,12) facing north, column 10 row 4 |  |
| `tile:26:9a6a8f3ae6b45fd764b6c955974139c4a3c614b8bf94f950d00b35cdf4b30ddc` | 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 14 | map 26, square (1,1) facing east, column 10 row 3 |  |
| `tile:26:a06ae7ddbd5e570a1591ccfe1028e845c54a224d23755730d05483573459a8c9` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (4,13) facing south, column 7 row 4 |  |
| `tile:26:a1162ddd95c9389d0cca24a59ae30fadb3cee6d447e75c9ee3ecfea72a14d898` | 8X8D7 block 8 tile 36 over sky colour 11 | map 26, square (0,0) facing east, column 7 row 4 |  |
| `tile:26:a3606381fb1162bfe599c3ba73f0b41cc71d750c5d0df3660ec3adf5df6135dd` | 8X8D7 block 8 tile 56 over sky colour 14 | map 26, square (1,1) facing east, column 9 row 4 |  |
| `tile:26:a3b0c809109883d9eefbbcf267989ba45b48ef282cd6de9a8f8e7f4f20c84c50` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:a72cd795273e9928eaf87725b5550fff71b45e59ccd15c470831dcc9722049f5` | 8X8D7 block 8 tile 35 | map 26, square (0,0) facing west, column 4 row 6 | `valjevo-dungeon-briar-terrain-27.png` (area 3, 6) |
| `tile:26:a78614debab11ac914817f55d740f275b5382ef1c7dc97268d552f5f8dae4f9f` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 19 over sky colour 11 | map 26, square (4,13) facing west, column 0 row 4 |  |
| `tile:26:a9eb1ad1c7e7e5f6b65cfa824481352e9ea16e0a268631ef6c032cc2975aa918` | 8X8D7 block 8 tile 29 over 8X8D7 block 8 tile 29 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing east, column 10 row 5 | `nomad-sand-joins-a9eb1ad1c7e7.png` (area 17) |
| `tile:26:ab6c5018b98fafddb703d5c823b283c7ea95fc6e6494d9debb621ef491eaca08` | 8X8D7 block 8 tile 20 over sky colour 0 | map 26, square (0,0) facing east, column 8 row 4 |  |
| `tile:26:aec02dd93e53f75c029614bb4edafac6ad6fc39f9695a2cd9fdced61a0f90b15` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 16 over sky colour 14 | map 26, square (4,13) facing west, column 0 row 3 |  |
| `tile:26:af28a69903e30245191a8ff27b8c05548d119183345ded1509c5d1a5920c8d98` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over sky colour 0 | map 26, square (2,2) facing east, column 7 row 4 | `nomad-sand-joins-af28a69903e3.png` (area 17) |
| `tile:26:af51743e6c8735b5f0217a632196d9e43dea2456760cff3333cc42d3640f2cf9` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 19 over sky colour 11 | map 26, square (7,0) facing south, column 2 row 4 |  |
| `tile:26:b17a7150a306024120df5ba54f07cfbc38a03819d66c514640c452951a28efa4` | 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (3,13) facing west, column 1 row 4 | `nomad-foliage-joins-b17a7150a306.png` (area 17) |
| `tile:26:b30a99d0cf82cbb099b6bb80d3ef1820d9b11c24d2a539c29b95f697c0768697` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:b365ecf0082f198f445d2e0aeb3a676cbcc53a7ee083d456c4cb222aad43f85e` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (1,1) facing east, column 10 row 4 |  |
| `tile:26:b441b6390dfaa41f0f41c4bcc1c94e25d30652caee87a463a6005e4465294a16` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 15 over 8X8D7 block 7 tile 52 over sky colour 0 | map 26, square (5,12) facing north, column 10 row 3 |  |
| `tile:26:b506de94ccd93969b707b94fd2f441c7487ec965bf5ba2a2809326a75c628063` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:b66bcf797f567ecfec4b58f06deaea3a11f657fc12824c43f52ae3e4c884a81f` | 8X8D7 block 8 tile 54 over sky colour 11 | map 26, square (2,2) facing north, column 10 row 1 | `nomad-entry-terrain-b66bcf797f56.png` (area 17) |
| `tile:26:bb0531b8840404c30d5ebfe60948e0af2eebb412dc2c36070f82ad2f8d410fc6` | 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 2 over sky colour 14 | map 26, square (6,12) facing east, column 1 row 3 |  |
| `tile:26:bdcbcd83f1078ba53d23ffb8bd78967807266f561b526dd0a1d6806da02426bc` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:be761d32cb6d2e22e2b70f6a54cfd7e1d354f43e95bcff99e077cd12c2f6be16` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 15 over 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (5,12) facing north, column 10 row 3 |  |
| `tile:26:bf4ae1ea22a846010cfc9be9c0f64681bd4f84d0270ba1b9f7d4a31570687cc3` | 8X8D7 block 8 tile 28 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing east, column 9 row 5 | `nomad-entry-terrain-bf4ae1ea22a8.png` (area 17) |
| `tile:26:c1453f4b1d0bcf664f0ca41ffab0709ff7371fe9c99caad0b621c5a1be7c5d1a` | 8X8D7 block 8 tile 20 over sky colour 11 | map 26, square (0,0) facing east, column 8 row 4 |  |
| `tile:26:c14a643808b9eae32cd6793ad00595c95415cc55eea6573fe7230f8b8aed5603` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over sky colour 11 | map 26, square (0,0) facing south, column 2 row 4 |  |
| `tile:26:c23c87025373a645513efdc800edd0e7365b6fc9d459ddb9b408891e6a653563` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 20 over sky colour 11 | map 26, square (0,0) facing south, column 8 row 4 |  |
| `tile:26:c412d6a38d968545eadff0a4c3bc8b807d48a3cefa74c0e1a7d4a13e16746e44` | 8X8D7 block 8 tile 42 over 8X8D7 block 7 tile 1 | map 26, square (6,12) facing east, column 1 row 2 |  |
| `tile:26:c7296169573522ac20a741b7b17c8d430e15fabb1228859e293824887d893afc` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 7 tile 50 | map 26, square (4,11) facing east, column 6 row 5 |  |
| `tile:26:cd5c92b431b123c8cdac0ff6f422b20767c0b31ac5274d87b70150303569bbe1` | 8X8D7 block 8 tile 41 over sky colour 11 | map 26, square (0,0) facing west, column 3 row 4 | `nomad-entry-terrain-cd5c92b431b1.png` (area 17) |
| `tile:26:ce89e04c7d71fa044a41f17e3c365917199ac89286393d2653276395bf0370f0` | 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 11 | map 26, square (1,1) facing east, column 10 row 3 | `nomad-entry-terrain-ce89e04c7d71.png` (area 17) |
| `tile:26:cf6997d21052b02bbaba893235bb50f33163055edb0acdab39ec3c4527ae824a` | 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (0,1) facing east, column 8 row 4 | `nomad-entry-terrain-cf6997d21052.png` (area 17) |
| `tile:26:d07e52618ae86da54de7130c972bb5caf977934b77374f1c2374accb3bc30414` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (1,1) facing south, column 0 row 4 | `nomad-inner-trail-d07e52618ae8.png` (area 17) |
| `tile:26:d29b9a5642a9e6c8031890889148b8ae3ef66a801da242c210be5f9cbaf835e1` | 8X8D7 block 8 tile 54 over sky colour 14 | map 26, square (2,2) facing north, column 10 row 1 |  |
| `tile:26:d52bbe86618c3e9b12468b6a42f9e32dbb0a9d5ffc394a94e26836bcfdb3adb5` | 8X8D7 block 8 tile 17 over sky colour 0 | map 26, square (0,0) facing east, column 10 row 2 |  |
| `tile:26:d79d5e1a276264b74c90875936d1afd7e0b3c205ba3819c3b0839447a225c06c` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:d91f97aac4aa6dc928bfe3b0e9af32f9e44f85faab557da81a2596a0be01a6f6` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 14 | map 26, square (4,13) facing south, column 7 row 4 |  |
| `tile:26:d93036934660fef225e6f7264f593c31755cd0833cc160297ec6cc1ed592068a` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,1) facing east, column 10 row 4 | `nomad-entry-terrain-d93036934660.png` (area 17) |
| `tile:26:da74e59457386bbf11f60c9408310ffe3a864cdee7a7dc499141bc190bce25ec` | 8X8D7 block 8 tile 57 over sky colour 14 | map 26, square (2,2) facing north, column 9 row 4 |  |
| `tile:26:db9487da2657332411c220f1ff48a2fbff25fcebbe67f460dabb8ee5c0577361` | 8X8D7 block 8 tile 42 over 8X8D7 block 8 tile 42 over sky colour 14 | map 26, square (2,2) facing east, column 10 row 2 |  |
| `tile:26:dcdc145bf22c16efb1ab9a51c36f3f257aa740e0af1a50ad2e13e2bc5f1d246c` | 8X8D7 block 8 tile 19 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing west, column 4 row 5 |  |
| `tile:26:dd57f5890ac6a05813c603f0d24819e7b06062b25004e31c0f36cfad35c7123c` | 8X8D7 block 8 tile 55 over sky colour 11 | map 26, square (1,1) facing east, column 9 row 3 | `nomad-entry-terrain-dd57f5890ac6.png` (area 17) |
| `tile:26:de09282f7a84b4acee0ce7438c0119adfaed07e49c3840456e0cf8df447022ca` | 8X8D7 block 8 tile 56 over sky colour 11 | map 26, square (1,1) facing east, column 9 row 4 | `nomad-entry-terrain-de09282f7a84.png` (area 17) |
| `tile:26:dfbee7628caa7d1eaca8131ff789e52a12d2d59bcb5e3d43f3876fc8753b0292` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over sky colour 14 | map 26, square (2,2) facing east, column 10 row 3 |  |
| `tile:26:e8ba3e9c269840517c00c657fd9d3992f2d639a8fbf0d8f10015324b619bcff0` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (4,12) facing east, column 3 row 5 |  |
| `tile:26:e9ce30599cbdba2338de93b24feb4fa34baab9030e10f3057c42aa72c68d3cf8` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 19 over sky colour 14 | map 26, square (4,13) facing west, column 0 row 4 |  |
| `tile:26:eb039ad14db5712287672fd45f2d2d26a6a33ee522784b04e3a03eac4f04ad69` | 8X8D7 block 8 tile 33 | map 26, square (0,0) facing west, column 3 row 7 | `valjevo-dungeon-briar-terrain-20.png` (area 3, 6) |
| `tile:26:eb13e875f347adc3e80cf68affd34dc1be49d5cd316b2f93a1a08326f18a42f1` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:eb358069d639fee5a566e9d35bc58cec807d0f1a45239dbf5450401c636f554c` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 22 over sky colour 14 | map 26, square (4,0) facing south, column 8 row 4 |  |
| `tile:26:efa69fe04edaa490fcfec57521fe35c34587935fed990b24adfb33e753a1ae85` | 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (4,14) facing south, column 9 row 3 |  |
| `tile:26:f16a7bc5ae91fc6aea5d3bedbc4752f9ca4b5789cc003dc758275b517932345c` | 8X8D7 block 8 tile 18 over sky colour 11 | map 26, square (0,0) facing west, column 0 row 2 |  |
| `tile:26:f181a98bbddb24ee4f4f4605abc79269e16c4e38bc95ccc0f0270d5c7a624fd7` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 0 row 5 | `nomad-inner-trail-f181a98bbddb.png` (area 17) |
| `tile:26:f88f087f5b5ba2358b09710c64c89f732bc22208650dbe24dced29ad6544be74` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (2,2) facing east, column 7 row 3 | `nomad-sand-joins-f88f087f5b5b.png` (area 17) |
| `tile:26:f9356cf5b7a25a0589750f3ae6b04b01eeb00517f614a1c479df0b3ee4a264a5` | 8X8D7 block 8 tile 29 over the horizon row (three rows of sky 14, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 1 row 5 |  |
| `tile:26:f9cd935a789a300270311af9e7c99f334f721adce9f99eb9db7eb107591ddc0f` | 8X8D7 block 8 tile 58 over sky colour 14 | map 26, square (1,1) facing south, column 1 row 4 |  |
| `tile:26:fa681c80dd69290566cc0a055492e2ee578df2b40498231afd97bfd2c9a6a22a` | 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 6 | map 26, square (6,12) facing east, column 1 row 4 |  |
| `tile:26:ff540217ccdad30864cbfb0bd4c6bdab1d0af54e2379580a468ae3a55fcf8fbe` | 8X8D7 block 8 tile 55 over sky colour 14 | map 26, square (1,1) facing east, column 9 row 3 |  |

#### tile set 8X8D7 block 23 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:bc40ea3be142942d5e433d5b75d7dace8cc2aa0c544f4123b7056a5a69d7977e` | 8X8D7 block 23 tile 21 | map 26, square (4,2) facing south, column 6 row 6 | `lizardman-lower-keep-cell-bc40ea3be142.png` (area 16) |
| `tile:26:d326cc9fabded3214b6092f46a582ccf73115a244f08ec2e00172fefe1c7f137` | 8X8D7 block 23 tile 20 | map 26, square (4,2) facing south, column 4 row 6 | `lizardman-lower-keep-cell-d326cc9fabde.png` (area 16) |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 3440 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 153 |
| first-person cells of an area whose reading is not confirmed | 1166 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 180 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 72 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Areas not confirmed, and why:

- Area 3 (Valjevo Castle): 15 of the 117 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 5 (Valjevo Castle): 62 of the 176 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 7 (Valjevo Castle, the Pool): 58 of the 162 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 18 (Podol Plaza): 5 of the 202 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 20 (The Slums): 1 of the 188 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 25 (Wilderness, west): only 13 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.
- Area 27 (Wilderness, east): only 20 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.

### Other pictures no key names

Every picture frame of the 1.3 files outside the tile sets and the battlefield that no artwork key names. Whether the game shows each has to be seen in play before art is commissioned
(`docs/ART-INVENTORY.md` says the same of secondary members), so none is counted as to do.

| Frame (archive:block:member:frame) | Size | What it is | Key form and PNG size | What is known |
| --- | --- | --- | --- | --- |
| FINAL5.DAX:1:0:0 | 120x120 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:2:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:2:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:2:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:2:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:3:0:0 | 120x120 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:4:0:0 | 56x32 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:5:0:0 | 16x48 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:6:0:0 | 16x48 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:4:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:7:5:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:0:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:1:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:2:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:3:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:4:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| FINAL5.DAX:8:5:0 | 88x88 | a picture of the ending | `none: tools/upgrade-art.ts accepts no key for FINAL pictures` - | the scripts do not name it; the program draws it, and where has not been read |
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
| 8X8D2 block 2 | 4, 6, 19, 20, 21, 22, 23, 24, 25, 27, 28, 29, 30, 32, 34, 35, 41, 55, 67 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D2 block 4 | 34, 42, 50, 51, 65, 66, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
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
