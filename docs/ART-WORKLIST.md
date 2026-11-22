# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 2181 confirmed cells awaiting art now.**

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
| Remaining, all kinds | 2181 |
| First-person cells to do | 2181 |
|   of which one stored tile | 482 |
|   of which one tile over a solid colour | 232 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 1467 |
|   of which the same pixels already have art of yours in another area | 794 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 3977 |
|   accounted for by the tool | 3832 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2293 |
|   without (the catalogue's 720 when it was written) | 714 |
|     of those, no map can show | 447 |
|     of those, shown only together with other tiles, never alone | 10 |
|     of those, shown alone in some area | 257 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 248 | 60 | 251 of 251 (3 as first views of the next area) |
| 1 | Buccaneer Base | yes | 385 | 129 | 52 | 129 of 129 |
| 2 | Cadorna Textile House | yes | 580 | 254 | 128 | 259 of 259 (5 as first views of the next area) |
| 3 | Valjevo Castle | not yet | 300 | 74 |  | 74 of 81 |
| 4 | Valjevo Castle | yes | 320 | 59 | 58 | 59 of 59 |
| 5 | Valjevo Castle | not yet | 393 | 49 |  | 51 of 110 (2 as first views of the next area) |
| 6 | Valjevo Castle | yes | 310 | 72 | 90 | 72 of 72 |
| 7 | Valjevo Castle, the Pool | not yet | 269 | 33 |  | 73 of 131 (40 as first views of the next area) |
| 8 | Phlan City Hall | yes | 405 | 157 | 132 | 157 of 157 |
| 9 | Stojanow Gate | yes | 287 | 117 | 33 | 117 of 117 |
| 10 | Valhingen Graveyard | yes | 2452 | 419 | 471 | 419 of 419 |
| 11 | The Training Hall | yes | 405 | 67 | 109 | 67 of 67 |
| 13 | The Kobold Caves | yes | 313 | 144 | 67 | 144 of 144 |
| 14 | Kovel Mansion | yes | 150 | 64 | 22 | 64 of 64 |
| 15 | Mendor's Library | not yet | 436 | 170 |  | 170 of 185 |
| 16 | The Lizardman Keep | yes | 856 | 158 | 105 | 158 of 158 |
| 17 | The Nomad Camp | yes | 186 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | not yet | 337 | 161 |  | 189 of 194 (28 as first views of the next area) |
| 20 | The Slums | not yet | 395 | 180 |  | 187 of 188 (7 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 500 | 85 | 165 | 85 of 85 |
| 22 | Yarash's Pyramid | yes | 140 | 70 | 17 | 70 of 70 |
| 23 | Yarash's Pyramid, lower | yes | 126 | 39 | 39 | 39 of 39 |
| 24 | Temple of Bane | yes | 312 | 188 | 29 | 188 of 188 |
| 25 | Wilderness, west | not yet | 51 | 0 |  | 0 of 0 |
| 26 | Wilderness, middle | yes | 387 | 96 | 137 | 162 of 162 (66 as first views of the next area) |
| 27 | Wilderness, east | not yet | 50 | 19 |  | 19 of 19 |
| 28 | Zhentil Keep Outpost | yes | 194 | 79 | 18 | 79 of 79 |
| 29 | Kuto's Well | yes | 1241 | 298 | 435 | 298 of 298 |
| 31 | Temple of Bane, interior | yes | 142 | 77 | 14 | 77 of 77 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares that may be out of reach.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 0: New Phlan (60)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:0:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 5 row 5 | `wild-cave-chamber-d20d585641c6.png` (area 1, 2, 7, 9, 13, 14, 15, 17, 18, 26, 27, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:0:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 0, square (13,0) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:0:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 0, square (13,0) facing south, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |

#### tile set 8X8D3 block 101 (16)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:0:046ad3c1e78ac7354ca7e0401cab3e3dc4ca27e8cf49682c378b105f05b70715` | 8X8D3 block 101 tile 4 over sky colour 0 | map 0, square (4,1) facing south, column 10 row 0 | `podal-shrine-side-lanes-terrain-046ad3c1e78a.png` (area 18) |
| `tile:0:1091af6ef7ffd2d40436f31ed8b4bded8191f728b08f77a211b9dbaee6bf6fe1` | 8X8D3 block 101 tile 7 over 8X8D3 block 101 tile 7 over sky colour 0 | map 0, square (4,1) facing west, column 6 row 1 |  |
| `tile:0:1874c3b1e2b448afb22da579328fd9e473773e33baa85d7be3278cb2a99f19ec` | 8X8D3 block 101 tile 57 | map 0, square (13,0) facing south, column 7 row 4 |  |
| `tile:0:1ee6b545de6112d23c5485b857a3b1b107a19e9849973bb41f16ebd2b39eca85` | 8X8D3 block 101 tile 62 over sky colour 0 | map 0, square (3,4) facing west, column 6 row 4 |  |
| `tile:0:40f1718d713d46dca3003667aa994c80ec701106dd1409d7fcad319327920a8b` | 8X8D3 block 101 tile 60 | map 0, square (0,2) facing south, column 6 row 5 |  |
| `tile:0:487e17f20dbc6c0fb86d6fa47c312eeab0de9abcccfea8cc1fb4188074231bda` | 8X8D3 block 101 tile 6 over 8X8D3 block 101 tile 6 over sky colour 0 | map 0, square (4,1) facing west, column 4 row 1 |  |
| `tile:0:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D3 block 101 tile 40 | map 0, square (2,4) facing west, column 2 row 8 | `kuto-earth-perimeter-joins-4c23fe508a44.png` (area 2, 18, 29) |
| `tile:0:52311369c866063e450c48f3773088e549bb6605c8b4acb651f88feafcacae37` | 8X8D3 block 101 tile 61 over sky colour 0 | map 0, square (13,1) facing west, column 1 row 4 |  |
| `tile:0:688fefc217b332ae28481ccb2d038a8cc8c94a47133c9723ff2a47aebb810f0e` | 8X8D3 block 101 tile 58 | map 0, square (13,0) facing south, column 8 row 4 |  |
| `tile:0:7ef87e5548a82e7c211613cc0266aefa8c3abc711afad60ec9d4cf3b7192c502` | 8X8D3 block 101 tile 9 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 2 | `podal-shrine-side-lanes-terrain-7ef87e5548a8.png` (area 18) |
| `tile:0:98110c9f8d54dd9af58e57336f0644295430d1c2cadda1e17e17c8124ad9dced` | 8X8D3 block 101 tile 16 over sky colour 0 | map 0, square (5,2) facing east, column 9 row 4 |  |
| `tile:0:a5f98dc0350255ef6862a6e1a9489d7b92cddde74f79d72b131ce1124ddaf77e` | 8X8D3 block 101 tile 5 over 8X8D3 block 101 tile 5 over sky colour 0 | map 0, square (4,1) facing west, column 3 row 1 | `podal-shrine-side-lanes-terrain-a5f98dc03502.png` (area 18) |
| `tile:0:c7b82d70fda9e7ad0bcc015a14e5a3772c4d1340637697919a7cbb0029718857` | 8X8D3 block 101 tile 65 over sky colour 0 | map 0, square (4,0) facing south, column 8 row 1 |  |
| `tile:0:df1a7dc7e5ee5dc9cb316e587c626701f8e4915ee56b250acf5b30ec7a91a7c8` | 8X8D3 block 101 tile 8 over sky colour 0 | map 0, square (4,0) facing west, column 0 row 1 | `podal-shrine-side-lanes-terrain-df1a7dc7e5ee.png` (area 18) |
| `tile:0:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D3 block 101 tile 69 | map 0, square (0,2) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:0:e3922047e12c2260eaef5a4f40f4426f51c95b755440c710331492e05e3c951a` | 8X8D3 block 101 tile 28 over the ground colour 6 | map 0, square (3,3) facing west, column 1 row 6 | `kuto-earth-perimeter-joins-e3922047e12c.png` (area 2, 18, 24, 29) |

#### tile set 8X8D3 block 102 (10)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:0:0067a44f2f0296324a93f2748022da512d25c262b7469fe213ff8aaa19cf3af3` | 8X8D3 block 102 tile 38 over sky colour 0 | map 0, square (4,0) facing west, column 1 row 1 |  |
| `tile:0:244e3a737dff103ce562544c8101531a1243923042056f12d1e433b13403ecd6` | 8X8D3 block 102 tile 69 | map 0, square (10,9) facing east, column 6 row 6 | `valjevo-terra-cotta-floor-244e3a737dff.png` (area 7) |
| `tile:0:3bcfc4497c095510e26a7123dcf7d5000f75b567d0bb4cd72c92a870e9a41f48` | 8X8D3 block 102 tile 47 | map 0, square (0,0) facing west, column 10 row 7 |  |
| `tile:0:480c0193f74fe2f8eebe95e255b18123bc620f775b922bb08febe829502c265b` | 8X8D3 block 102 tile 65 | map 0, square (12,6) facing east, column 9 row 5 | `valjevo-merchant-wing-terrain-480c0193f74f.png` (area 7) |
| `tile:0:49adbe0c989896a2fc859c7518d72be11572fff18d83d579b7eb021b3dba21bc` | 8X8D3 block 102 tile 67 over 8X8D3 block 102 tile 5 | map 0, square (8,12) facing east, column 6 row 5 | `valjevo-merchant-wing-terrain-49adbe0c9898.png` (area 7) |
| `tile:0:8d3592ae6802ffa7f7f7ac5df9362eb4f08b56ae06b8be5a12827cb8bbb6d7b9` | 8X8D3 block 102 tile 45 | map 0, square (0,0) facing east, column 3 row 6 |  |
| `tile:0:901342053079a4679add86d120a4add26a3058e08fb05eb433ee4f7a3927f4a2` | 8X8D3 block 102 tile 50 over 8X8D3 block 102 tile 30 | map 0, square (13,12) facing south, column 1 row 5 |  |
| `tile:0:a1517020332932e5edc1ce35bb6b00aab541870301ef1bd02de95da9187dac03` | 8X8D3 block 102 tile 50 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (14,12) facing south, column 4 row 5 |  |
| `tile:0:b17f6d862c65feca624f42f7f243b82e3062650c47a37e49f46e44d660a8566a` | 8X8D3 block 102 tile 48 | map 0, square (0,0) facing east, column 2 row 6 |  |
| `tile:0:cd0c178e86616351240aa2ee992e50a4998ce99d0a7295965dc3a5de8481c2c5` | 8X8D3 block 102 tile 67 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (10,9) facing east, column 6 row 5 | `valjevo-merchant-branch-terrain-cd0c178e8661.png` (area 7) |

#### tile set 8X8D3 block 103 (31)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:0:06ab0ea758cbd6161799235b2b0d7e4521172faf22e35bf4119b31f0f52815f8` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 32 | map 0, square (14,11) facing west, column 3 row 5 |  |
| `tile:0:169608062ff1aff8089bf5e0d2b3aee98f4d7bcdb6c9ac5208770245839f5e14` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (14,1) facing east, column 10 row 5 |  |
| `tile:0:1a83f260002396d35ecdecff75b4bdfb9225a0f1e09a1cbe43a89760a0df887a` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 3 | map 0, square (12,11) facing east, column 8 row 5 |  |
| `tile:0:243765cb742c7f8baa3c055be6cbba8c698816a73037869e4b304f63cea7bd01` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 37 | map 0, square (13,3) facing west, column 10 row 5 |  |
| `tile:0:2a90a9530957e394ceec691a8f4637ce327c4562b0b792fe311d4fec490a7512` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 26 | map 0, square (13,5) facing west, column 10 row 5 | `new-phlan-east-terrace-terrain-2a90a9530957.png` (area 8) |
| `tile:0:30f3bb975c3bf219afc9b2d64fc0e35835e7c401da3ad597bf5af8d9a439237d` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 30 | map 0, square (13,5) facing south, column 1 row 5 |  |
| `tile:0:39ec23f0982f82d51a199d2e205583ec5183e3f4f657da903eb6426c8777ed81` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 59 | map 0, square (13,3) facing north, column 4 row 5 |  |
| `tile:0:451efcf97fe4cb8ea437dd0fba90a08e095423c51c7c23c69dd2f48be9fcead5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 21 | map 0, square (13,3) facing west, column 0 row 5 |  |
| `tile:0:454c08486f123540ea56b2fed133366cbc56bff3f4b494cd4d08f710aafced94` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 47 | map 0, square (13,3) facing north, column 2 row 5 |  |
| `tile:0:4803f5dc3182db9989861f38067bb331053bbfb52c7799bb976bd19144042bde` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 51 | map 0, square (12,12) facing east, column 9 row 5 |  |
| `tile:0:601ca0f73a0f934ddf832048da2dbbc3bc9203cc12e77200bb222e236d683764` | 8X8D3 block 103 tile 31 over sky colour 0 | map 0, square (2,2) facing east, column 9 row 4 | `mendor-library-terrain-601ca0f73a0f.png` (area 15) |
| `tile:0:6eb0229fba37066c933fd301ebdf2d3f3f95c0aa02edc13b9efcec153f936da1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 38 | map 0, square (14,12) facing north, column 0 row 5 |  |
| `tile:0:719b5967a953045d0d20abcf9452381308bb1fface4a6baeb52d8b74ecf29040` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 5 | map 0, square (14,5) facing west, column 8 row 5 |  |
| `tile:0:79614e8063fe952222ed56df183e9e0623b3995656e248d0c2a01d05284ab9d6` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 32 | map 0, square (14,13) facing west, column 9 row 5 |  |
| `tile:0:8a056429f4099504d4208271c9c6416be226c53403a933041f07df132509656b` | 8X8D3 block 103 tile 19 over sky colour 0 | map 0, square (3,2) facing south, column 2 row 3 |  |
| `tile:0:8cc6fb33beebe284ad671b37641293211c29124408b1847a3c5eb3461be2dfa2` | 8X8D3 block 103 tile 45 over 8X8D3 block 103 tile 45 over sky colour 0 | map 0, square (5,1) facing west, column 5 row 3 |  |
| `tile:0:8e1c4a57f54a26ae024d7708cc6b909ac108666d402f5cd6701f9b74a8a113df` | 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 10 row 5 |  |
| `tile:0:9859de0bc085d85d77c94427a28ac253d9dc5c2cb9f8774de7282aaf58a88512` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 21 | map 0, square (14,4) facing north, column 1 row 5 |  |
| `tile:0:99de9f9b4514c2decbc4de130b2681b346a3c51f9795c515e4bcedc012b14e2b` | 8X8D3 block 103 tile 41 over 8X8D3 block 101 tile 68 | map 0, square (12,4) facing north, column 6 row 5 |  |
| `tile:0:9d678c0fec7e982dea23320ba77532401b0493422a9dc04a2bfa2bebd8c50c42` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 25 | map 0, square (14,3) facing west, column 10 row 5 |  |
| `tile:0:ac6a6e8299ac7fb8877475660d1da710aa61867a1064e5651f070167da55c205` | 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 7 row 5 |  |
| `tile:0:af99cac6a4bc33650e7528427afc58561f697a7767092c8a9f8194bba299ce12` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 |  |
| `tile:0:b91c1a61b1b674049f1da4fdf724a912001190410004064840dea1621c0c3e16` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 |  |
| `tile:0:c28c98a0416a67be49e6cc43b059d61e24c7e0ab0e5aee6a0dd206e3a368e447` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (12,3) facing north, column 7 row 5 |  |
| `tile:0:d31e129c0c2e50debad0b3da0976aa310a242279dab9b105dfa862cbcf7c75a1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 12 | map 0, square (15,3) facing west, column 10 row 5 |  |
| `tile:0:d7a42c36165673adb0dd94201efa22307a5b7c8710d5a71874597c97f2c553cf` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing north, column 2 row 5 |  |
| `tile:0:dd5258c1ed754a783abd6880bcc02737c21b61f9f6526f50342e44daacd14782` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (13,1) facing south, column 1 row 5 |  |
| `tile:0:e89a43156711377f65cb66bf9e3c92475d547ac90e8f976baef57e12b150fd06` | 8X8D3 block 103 tile 7 over 8X8D3 block 103 tile 7 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (0,2) facing north, column 5 row 5 |  |
| `tile:0:eaaf3eda22c409df59d46965bfbaa114fdfce2600636b7f78fb7a4c61b6ed7a7` | 8X8D3 block 103 tile 6 over sky colour 0 | map 0, square (2,2) facing east, column 10 row 3 |  |
| `tile:0:f396f4ed12b9fd4e0bd9427532c1789a2c7ae498a49246236bcd2f065e323cda` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 3 | map 0, square (12,14) facing east, column 6 row 5 |  |
| `tile:0:fda35ec7d9df04aeebd70aad095944df1c6a3e311c4f49c7cb25814d73ad0766` | 8X8D3 block 103 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 0, square (2,0) facing west, column 6 row 5 |  |

### Area 1: Buccaneer Base (52)

Map 1; WALLDEF6 block 2 (tiles 8X8D6 block 2), block 6 (tiles 8X8D6 block 6), block 6 (tiles 8X8D6 block 6).

#### tile set 8X8D6 block 2 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:1:f1e2c51783bc6780ddd30046cd7aa52da55967ca8bf567fe37eb1ea849c93ee6` | 8X8D6 block 2 tile 58 over 8X8D6 block 6 tile 2 over sky colour 11 | map 1, square (5,0) facing north, column 9 row 1 |  |

#### tile set 8X8D6 block 6 (51)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:1:033c5eed3d055b8bbf86f1d2fe67de6f07e7ce6f9ed5a364ad7a998b3b6fff2e` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 13 over sky colour 11 | map 1, square (13,6) facing north, column 9 row 4 |  |
| `tile:1:06a56cb7880c114d2499b881a051a556e3f4eae030bd8a652a9dd41c45e00e56` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 19 | map 1, square (14,6) facing east, column 0 row 4 |  |
| `tile:1:08094d4f989d0851c774d310794ce23b04d492f575177ac4d3338cb6f8676225` | 8X8D6 block 6 tile 69 | map 1, square (7,0) facing east, column 0 row 5 |  |
| `tile:1:095ec75a04deea989380ccb5b324ffc7906440b21d61eeaf171e8fff91d6cc14` | 8X8D6 block 6 tile 4 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 1, square (3,3) facing south, column 3 row 5 |  |
| `tile:1:0b7bb47e01e4214bc70d431c2e9284d3ac23b71ced5be41c980e8974a340da2c` | 8X8D6 block 6 tile 6 | map 1, square (5,6) facing south, column 8 row 5 |  |
| `tile:1:11febb08fb13e6d3f4d4623506b42af7e6b10ea2f167a77a3a6c72f4ef9a1adc` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 15 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 1, square (12,4) facing east, column 9 row 5 |  |
| `tile:1:1521d710601da0b7780dd97277fdec01c2406bdcac6ea53b4732eb90e3b3f793` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 50 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 1, square (12,6) facing east, column 1 row 5 |  |
| `tile:1:1959cb168649426a6febdb8a33faffad7e3f677b425b1dd2b67c7a81ffce9945` | 8X8D6 block 6 tile 36 over 8X8D1 block 203 tile 24 over the ground colour 6 | map 1, square (12,6) facing north, column 1 row 6 |  |
| `tile:1:26bcad86c61fced959b9e3e4468d14597252a8f54bc8b6ca7c375f92ac9139f0` | 8X8D6 block 6 tile 51 | map 1, square (7,0) facing north, column 5 row 5 |  |
| `tile:1:28612dd48ec57d4365251acbdb808a2a92a9c48ffd24c8238aa33f484263801e` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 2 over sky colour 11 | map 1, square (14,6) facing east, column 0 row 3 |  |
| `tile:1:2e90898843be94884471f0d403caaacc6f0b7f74233f3b5a341a716a9ffe2c50` | 8X8D6 block 6 tile 12 over 8X8D6 block 6 tile 17 | map 1, square (14,6) facing east, column 0 row 6 |  |
| `tile:1:328f750df6630171a8075d9384cd889bf14996a15e680bc3f4073b4007830500` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 2 over sky colour 0 | map 1, square (14,6) facing east, column 0 row 3 |  |
| `tile:1:37b8c2ea5534c9b942d661ac3ba124b342bdd216670a1578b3b0c35a9b310317` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 52 | map 1, square (13,6) facing north, column 9 row 6 |  |
| `tile:1:3f14e8112ed32268e4cb3afce9cf634387b6ab791ad0068e34d7f82b9683e1d1` | 8X8D6 block 6 tile 34 over 8X8D6 block 2 tile 57 over sky colour 11 | map 1, square (12,6) facing north, column 1 row 4 |  |
| `tile:1:4cce08e2dfc37e720329a47c243471f38acd2386091c3b60bdebd20a74b85921` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 14 over sky colour 11 | map 1, square (13,6) facing east, column 1 row 4 |  |
| `tile:1:4f4776b4f8c8421342f9ca62a3a78b24cf90607c32d8c09d9af9f6b02ad0aa84` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 16 | map 1, square (14,6) facing north, column 10 row 4 |  |
| `tile:1:52a36258e26381b8b7a8dffa40e2f989b565a2a2a68af94c5975a280b2c9fdb9` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 2 over 8X8D6 block 6 tile 7 over sky colour 11 | map 1, square (14,6) facing north, column 10 row 3 |  |
| `tile:1:541760b2fe1a3b5760a42cecaafd400c9825b25092e7218379e43f50086604ec` | 8X8D6 block 6 tile 3 | map 1, square (7,0) facing north, column 5 row 2 |  |
| `tile:1:5879f939d4ba099a5e4903f7f0fd0773389c1fff132a18236b085d04aa44c8b3` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 13 over sky colour 0 | map 1, square (13,6) facing north, column 9 row 4 |  |
| `tile:1:587e9632073682c4f8f34e98223982a74229a32356aa0a2b8298c961c0adeece` | 8X8D6 block 6 tile 33 over 8X8D6 block 2 tile 15 | map 1, square (13,8) facing south, column 1 row 6 |  |
| `tile:1:58e635182d12ab1cdc459bf064271dde19e5e859a4781c106c7c902c65e21b73` | 8X8D6 block 6 tile 37 over 8X8D6 block 6 tile 13 over sky colour 11 | map 1, square (14,7) facing north, column 9 row 4 |  |
| `tile:1:5b9dd69ae4ba4f7371ebe59b909654abc372747e7174a42dfd4bdbe24d2240b8` | 8X8D6 block 6 tile 7 over 8X8D6 block 6 tile 7 over sky colour 12 | map 1, square (6,7) facing north, column 2 row 1 |  |
| `tile:1:5ebc6a1f4f3dd7ba7fcab3a9db2be96e61c4adec9379d735da8931eb22c496d9` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 50 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 1, square (12,6) facing east, column 1 row 5 |  |
| `tile:1:66db3733dd44cb4dc909762985e3ce5755acb909f8513b6f6a3c9bffdbd396c6` | 8X8D6 block 6 tile 7 over 8X8D6 block 6 tile 7 over 8X8D6 block 6 tile 48 over sky colour 11 | map 1, square (12,4) facing south, column 6 row 4 |  |
| `tile:1:6ef32abfaa67bae6c4548296f3a6e2bd02278d0a085124ccc07698daec8ca780` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 52 | map 1, square (14,7) facing north, column 9 row 6 |  |
| `tile:1:6fe8145c4eca3d61a92aca0ed5b19443bec96f1392bc6d932d4187dad36af7df` | 8X8D6 block 6 tile 33 over 8X8D6 block 2 tile 57 over sky colour 11 | map 1, square (13,8) facing south, column 1 row 4 |  |
| `tile:1:73ae45e2383c936470a8535694b94bc45ca6bff536552ee86c548a2bdbb9a5dd` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 2 over 8X8D6 block 6 tile 7 over sky colour 0 | map 1, square (14,6) facing north, column 10 row 3 |  |
| `tile:1:73b54b8062f04124ec269dcd2fd2103de549179ba5be93fee0d4b6bf9ec1a4e2` | 8X8D6 block 6 tile 12 over 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 50 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 1, square (13,5) facing east, column 8 row 5 |  |
| `tile:1:758311a7c9a4cce4c7476f30ded7012025c337b4e10ac467ace0b38648d7b016` | 8X8D6 block 6 tile 12 over 8X8D6 block 6 tile 18 | map 1, square (14,6) facing north, column 10 row 6 |  |
| `tile:1:7be98aac54183eb27fec361c16ca8df7df0782ee5ef593dfdbd07098a49c3370` | 8X8D6 block 6 tile 5 over sky colour 12 | map 1, square (6,7) facing east, column 10 row 3 |  |
| `tile:1:7c6a56fef2aa2ebd366581fcba24cc031c815eac369b6aa0aadea028acd95f05` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 34 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 1, square (13,5) facing south, column 0 row 5 |  |
| `tile:1:8f1c77169c2c6f8e431e829b52c7098f8705c1169c58bd6623a44df676649803` | 8X8D6 block 6 tile 37 over 8X8D1 block 203 tile 24 over the ground colour 6 | map 1, square (12,7) facing north, column 0 row 7 |  |
| `tile:1:917b723714949869ce63205738df09b13f0f1445470974c4040e7346f4c4cc17` | 8X8D6 block 6 tile 8 over 8X8D6 block 6 tile 8 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 1, square (7,4) facing south, column 5 row 5 |  |
| `tile:1:94299599d326dc8ea4ed05c0ea3b4e928dbc8439c0243c9d067ff867ef6056bc` | 8X8D6 block 6 tile 7 over 8X8D6 block 6 tile 49 over sky colour 11 | map 1, square (13,4) facing south, column 1 row 4 |  |
| `tile:1:94f6cfe844a957ccafe00be82ccbe250d8512de221ddf480134d0bd474341421` | 8X8D6 block 6 tile 22 | map 1, square (4,6) facing south, column 2 row 5 |  |
| `tile:1:9f9cf9d40d6a86265d3158df88465c2f6f797dc90cb5f59e7f04c46cb27b14c8` | 8X8D6 block 6 tile 37 over 8X8D6 block 2 tile 58 over sky colour 11 | map 1, square (12,6) facing south, column 9 row 4 |  |
| `tile:1:a27e92940fe0407784537a7dbb039e957b77514a35f8cb73043095b3e1db2e19` | 8X8D6 block 6 tile 11 over 8X8D6 block 6 tile 11 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 1, square (7,2) facing north, column 5 row 5 |  |
| `tile:1:a68093d983f30c1989fbff3a6e7b3dcddcce525a8766a9e4ca0b839a699b74c7` | 8X8D6 block 6 tile 35 over 8X8D6 block 2 tile 57 over sky colour 11 | map 1, square (12,7) facing north, column 0 row 3 |  |
| `tile:1:abac9c071fb366c9537048f83246b48129b4bf7a1385bf9f7f4d0a25c993acb2` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 20 | map 1, square (14,6) facing north, column 10 row 7 |  |
| `tile:1:b26d8cf736e8be4006e2c5ab60c5e76acf6b143bf739aff4a040df89b033abf7` | 8X8D6 block 6 tile 36 over 8X8D6 block 2 tile 58 over sky colour 11 | map 1, square (12,6) facing south, column 10 row 3 |  |
| `tile:1:b6ae7e16f8b8000b7101c021ba1d4f9d8a8c9c4dc078c44b2989542c45501e46` | 8X8D6 block 6 tile 9 over sky colour 12 | map 1, square (6,7) facing north, column 0 row 0 |  |
| `tile:1:cb4de50d976d3787616518f422f728be8d8662f4b0ee032f6231f4b86a8344fa` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 14 over sky colour 0 | map 1, square (13,6) facing east, column 1 row 4 |  |
| `tile:1:cce43745e758a894c04634b6dcd51d2fae81e92391e0a9006987788b2707f951` | 8X8D6 block 6 tile 12 over 8X8D6 block 6 tile 1 | map 1, square (14,6) facing north, column 10 row 5 |  |
| `tile:1:d0d507807dab5cdd3e3c9a3b98277d2cc1bb2140a263b3395fd64e95921eacbf` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 53 | map 1, square (13,6) facing east, column 1 row 6 |  |
| `tile:1:de579cbb55d2c61f1a610e52f33c5e0f8c3890090281f7ff41e8055d1b7f51b8` | 8X8D6 block 6 tile 36 over 8X8D6 block 2 tile 15 | map 1, square (13,8) facing west, column 1 row 6 |  |
| `tile:1:e4ba36cab5c809ca5c5ef15e16e88604068999485de48f10f3dcec8e54a81bc9` | 8X8D6 block 6 tile 37 over 8X8D6 block 6 tile 20 | map 1, square (14,6) facing east, column 0 row 7 |  |
| `tile:1:e96b8222a396ab6149be131023a26edd48c4c0043a56f8696de3a186851269b9` | 8X8D6 block 6 tile 34 over 8X8D1 block 203 tile 26 over the ground colour 6 | map 1, square (12,6) facing south, column 10 row 7 |  |
| `tile:1:ef2a38cb738cbafb88fcf81022aa147453744cf7055c5a12a61afa3daac1d2b2` | 8X8D6 block 6 tile 8 over 8X8D6 block 6 tile 8 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 1, square (7,4) facing south, column 5 row 5 |  |
| `tile:1:f20d0b8c3d46b497bf7cf6dd7ea1b9fa5fabd70a7b4c0c11afb32dfbae41b738` | 8X8D6 block 6 tile 11 over 8X8D6 block 6 tile 11 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 1, square (7,2) facing north, column 5 row 5 |  |
| `tile:1:f69f67fd7e7e69d8c25d7f5172cdfeb1ab670949274e2037dc67db2eae4d6917` | 8X8D6 block 6 tile 34 over 8X8D6 block 2 tile 57 over sky colour 0 | map 1, square (12,6) facing north, column 1 row 4 |  |
| `tile:1:f90f07d7ae5e50b79a0f454a04d4fd52831f285e3bb9176f149bf2cfba05c460` | 8X8D6 block 6 tile 67 | map 1, square (7,1) facing north, column 5 row 5 |  |

### Area 2: Cadorna Textile House (128)

Map 2; WALLDEF4 block 1 (tiles 8X8D4 block 1), block 3 (tiles 8X8D4 block 3), block 20 (tiles 8X8D4 block 20).

#### tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:2:5feb5e3b872c280f3a8177b07476ed63bdd5f5b5843c4d4a6f73c2950a739163` | 8X8D1 block 203 tile 17 over 8X8D4 block 20 tile 63 over sky colour 11 | map 2, square (15,2) facing south, column 1 row 1 |  |
| `tile:2:992dce818540db60ec89f81c2034b8f664c6db8f62ecca3b2f9e1e24b38900cf` | 8X8D1 block 203 tile 16 over 8X8D4 block 20 tile 64 over sky colour 11 | map 2, square (15,4) facing north, column 9 row 1 |  |

#### tile set 8X8D4 block 1 (53)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:2:049cec4cd0fcbea17c3bf9246f3a68036b0bed597a4392bbbbefe60a98be3f75` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 16 over sky colour 11 | map 2, square (4,2) facing north, column 7 row 3 | `mendor-ruin-crossing-terrain-049cec4cd0fc.png` (area 20) |
| `tile:2:1424dd3f01b4a4e785374f43caafe8dbb9ef106b7ec4d81b7b4ea1345d4082b1` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 40 | map 2, square (0,3) facing west, column 7 row 5 |  |
| `tile:2:16ded593b389c2b2274231090289e2ab28469fcae450f644486306cdebcb76fe` | 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 31 | map 2, square (1,4) facing south, column 0 row 5 |  |
| `tile:2:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D4 block 1 tile 56 | map 2, square (0,2) facing south, column 1 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:2:1a3bd8aade86ac92a03b51fdcf75823feb5a126a1b751f713017e63cc96b11b0` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 50 | map 2, square (0,6) facing south, column 0 row 6 |  |
| `tile:2:27aeceaacc483db4c7464b80531ea86df338af08e3414333a287cb58ed9808cd` | 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 16 over sky colour 0 | map 2, square (9,1) facing west, column 10 row 3 | `kuto-podal-side-streets-kuto-terrain-27aeceaacc48.png` (area 29) |
| `tile:2:30a49411e45f51c307970357ef283ec90c8288afb7742c70b4d71bbe9f705f82` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 2, square (9,0) facing west, column 7 row 7 | `mendor-worn-floor-junction-30a49411e45f.png` (area 15, 20, 22) |
| `tile:2:3277623d54e941e5f8279b89091f945b1364ce9f964ef0c18167911ab08343b5` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 67 | map 2, square (8,14) facing east, column 0 row 6 |  |
| `tile:2:41b03752c504cac1e5e164acbbd730d4674056a82f7b5e4e954fcbb6128da93b` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 23 over sky colour 0 | map 2, square (10,11) facing north, column 10 row 2 |  |
| `tile:2:4c7c3b2be1a3cbf6494a5f4771d30a0af2392eea994aea26766866b6ff1ba28a` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 2, square (11,10) facing south, column 7 row 7 | `slums-courtyard-joins-4c7c3b2be1a3.png` (area 20, 29) |
| `tile:2:4eb517093139f21cce9889991a22361db52d158eb23b7fa26d65a3d16285c93e` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 52 | map 2, square (10,11) facing east, column 3 row 5 |  |
| `tile:2:4f6df5eb105b19593dcc6e952550630aa8be051f7468086fc56bfd87cd64076a` | 8X8D4 block 1 tile 4 over 8X8D4 block 20 tile 28 over the ground colour 6 | map 2, square (11,13) facing north, column 10 row 7 |  |
| `tile:2:53c8ff7a5784947e1a7ec25b4cdcc6e5f5c43b96441c9f350b1daefcc4caff9b` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 2, square (1,6) facing south, column 3 row 7 |  |
| `tile:2:54ad66560a7c69766cbf1f6a9bbebbdb1f7848cf0e4487cb06d9e69a459d4fb4` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 55 | map 2, square (10,11) facing east, column 3 row 4 |  |
| `tile:2:58c29f082dcdf844c2b584ac1ce85bcf7eab3d76955ef25451d853c2fbff06f6` | 8X8D4 block 1 tile 4 over 8X8D4 block 20 tile 33 over sky colour 11 | map 2, square (11,13) facing north, column 10 row 4 |  |
| `tile:2:5cc83393adbd6e029069e66f391eb4853f566090d839096309ac3d8a1c7a949a` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 2, square (10,11) facing east, column 3 row 7 |  |
| `tile:2:6ab6e594568d2309efeba73d47d2d4cda8e1afb6f5cadab959b8c5e967b35726` | 8X8D4 block 1 tile 4 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 2, square (1,3) facing east, column 10 row 5 |  |
| `tile:2:73e03895986a8d514262db06d29c350d9cb1cb4fd1a5f186ce5ecebcc78e0f3e` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 49 | map 2, square (8,14) facing north, column 7 row 6 |  |
| `tile:2:78019c86e294be77f9a8acb69ea6dcbf7943499eb5cf5c06f8d9fced10d50b84` | 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 2, square (0,6) facing south, column 0 row 7 |  |
| `tile:2:78593d4afc03a870c5de5d00ac605a20fb84e973c3a2e373e28e2f8d7de235a4` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 54 | map 2, square (11,10) facing south, column 7 row 4 | `slums-side-arcades-terrain-78593d4afc03.png` (area 20) |
| `tile:2:7cfbc5bd64b88994aed1915becabd924fb88f259a03a4fc7d3088e2fe4996186` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 50 | map 2, square (1,6) facing south, column 3 row 6 |  |
| `tile:2:869e7caf986a2da4c4165813123836475d8d3d14bde1ed6d242e07b9d0f3c864` | 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 17 over sky colour 0 | map 2, square (8,0) facing south, column 0 row 3 | `kuto-west-arcade-terrain-869e7caf986a.png` (area 29) |
| `tile:2:86ae970b8c10b8611e68b09a31c953f06f60ff5b4f14a3ead471ebaee957b741` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 42 | map 2, square (0,3) facing west, column 7 row 6 |  |
| `tile:2:87f723061f5a55c5a86757e1634672fbd33447f098e13728a0fb38fed2026152` | 8X8D4 block 1 tile 4 over 8X8D4 block 3 tile 3 | map 2, square (4,1) facing east, column 10 row 4 | `yarash-inner-court-terrain-87f723061f5a.png` (area 22) |
| `tile:2:8fa473cfc92a0d1bf13a5958deb5d56b049cd02c80d4d9449b3ef11eaa2a49c0` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 41 | map 2, square (0,6) facing south, column 0 row 5 |  |
| `tile:2:90a02a72b2f1c42a28564bfa17f19028ce2ec4ce579496081fcdf1c58d80cb34` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 34 | map 2, square (8,14) facing east, column 0 row 5 |  |
| `tile:2:96987836b2cb2a9620a6bd06b4c79b2bdc6a28648fb923b9834e5eaae54d75ff` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 2, square (9,0) facing west, column 3 row 5 |  |
| `tile:2:983eaf96bcc328751cbf293309d11fefd25bd1be34327e4dc768fbe2baa3065f` | 8X8D4 block 1 tile 4 over 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 39 | map 2, square (11,13) facing north, column 10 row 6 |  |
| `tile:2:989907034dc5a8ccb668b5a282a334713bceb7eca7c6f5ce8b5590ee1052877f` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 39 | map 2, square (8,0) facing east, column 7 row 4 | `slums-shop-frontage-terrain-989907034dc5.png` (area 15, 20, 22) |
| `tile:2:a353a86173ab83d526b4032d32f8909aee6e1f21b3f9a9fe33b3d0d994ac79dc` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 55 | map 2, square (10,12) facing east, column 0 row 4 | `mendor-library-terrain-a353a86173ab.png` (area 15) |
| `tile:2:ad7dbb0f3eff703147f1d3b2739c6a093e9d9c737c39ffd57a4eb7cf2d5ffeae` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 52 | map 2, square (10,12) facing east, column 0 row 5 | `mendor-library-terrain-ad7dbb0f3eff.png` (area 15, 29) |
| `tile:2:b2d04abe55c80329ca299b7bc4e8a1f3bcb0d1f9952bf17397dfd4bc2c4451a0` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 47 | map 2, square (5,2) facing north, column 0 row 5 |  |
| `tile:2:b3a3f23f84b5216e519053d4dba3a40a06458932fc30df15ed2448e64b05453d` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 61 | map 2, square (8,14) facing east, column 0 row 7 |  |
| `tile:2:be49e47e8262779623202d08ff52e203f5f4244bb5561ad97138bec10ca519d7` | 8X8D4 block 1 tile 5 over 8X8D4 block 20 tile 30 over sky colour 11 | map 2, square (1,4) facing south, column 0 row 4 |  |
| `tile:2:bfdde368c474f611b5fd15865814de090566c58210b302a779b9f3855500bd63` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 53 | map 2, square (11,10) facing south, column 7 row 5 | `slums-side-arcades-terrain-bfdde368c474.png` (area 20) |
| `tile:2:cb404f7ed71e3c8c5a855c3af2e0b70086988c8b0fcc7b7e11f6b64992cff365` | 8X8D4 block 1 tile 4 over 8X8D4 block 3 tile 2 | map 2, square (4,1) facing east, column 10 row 5 | `yarash-inner-court-terrain-cb404f7ed71e.png` (area 22) |
| `tile:2:d1ce3e3c39331359fad4d257dc39c300e3dd43640862c99d24479e61468e0647` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 39 | map 2, square (4,2) facing north, column 7 row 7 |  |
| `tile:2:d3357e30619d2e74e13b725972f5cfe2b8476a6365abf2fe593779a5b7f448a0` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 2, square (0,3) facing west, column 7 row 7 |  |
| `tile:2:d9ee1e84a38a18895337a6f1be72237b550984ff7bfad71c580cf8b17cb96f94` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 16 over sky colour 0 | map 2, square (9,0) facing west, column 7 row 3 | `kuto-west-arcade-terrain-d9ee1e84a38a.png` (area 29) |
| `tile:2:db0db526433e898528c6f97a8ed2b870fc5b6b8432390075aff6f72608c7a061` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 3 | map 2, square (4,1) facing west, column 0 row 5 | `yarash-braced-passage-terrain-db0db526433e.png` (area 22) |
| `tile:2:df787a068f2e956970c548da71bfec7422412c13751481c3a749cb301164b52d` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 68 | map 2, square (8,14) facing north, column 7 row 5 |  |
| `tile:2:e26c8b001652a1a0ef6c87d6299843039a8cf11bb0521574dbd4f7ec31b7088c` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 22 over sky colour 0 | map 2, square (11,10) facing west, column 0 row 2 |  |
| `tile:2:e64d4bb2078216ff1f2a0b804d81736f2d63ccbf6d1bb38608eb817557e43c39` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 38 | map 2, square (3,8) facing west, column 3 row 4 | `slums-shop-frontage-terrain-e64d4bb20782.png` (area 15, 20, 22) |
| `tile:2:e77bc10aafb50018c174281e64f2f9ce2a0ea9a380ce8cd649cb5da86c5d1bec` | 8X8D4 block 1 tile 4 over sky colour 0 | map 2, square (9,0) facing south, column 10 row 2 | `kuto-west-arcade-terrain-e77bc10aafb5.png` (area 29) |
| `tile:2:e7ddc41fd947bfeab18d26ac2430aeca71971e798ceca803099aad5ed9ec932d` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 41 | map 2, square (1,6) facing south, column 3 row 5 |  |
| `tile:2:eb793b63e5fbde83fe69f62582027547e1fa470ceb470db6de65735977eb6562` | 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 17 over sky colour 11 | map 2, square (4,1) facing west, column 0 row 3 | `mendor-east-court-terrain-01.png` (area 20) |
| `tile:2:ef69e7f6ce2a0509f7d7c0d4ef392a68cb280145031f723362a1724ef489daf7` | 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 28 | map 2, square (11,13) facing north, column 10 row 5 |  |
| `tile:2:f25092eb0d56bda81ec60df01868e464268bdaf74219b98ae16ee1789a2114b5` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 45 | map 2, square (5,2) facing north, column 0 row 7 |  |
| `tile:2:f6267d0f88c5dd1e0cb488a42a04434beea6e6a9ac67f2a0d0a896b6a4dd39a8` | 8X8D4 block 1 tile 4 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 2, square (4,1) facing east, column 10 row 7 | `kuto-earth-perimeter-joins-f6267d0f88c5.png` (area 15, 20, 22, 29) |
| `tile:2:f833dc2c7e1891c03c58bd5a3bacd86665a07e1d8b192c1913a5f01d97e75ecb` | 8X8D4 block 1 tile 5 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 2, square (10,12) facing east, column 0 row 7 | `kuto-earth-chamber-joins-f833dc2c7e18.png` (area 15, 29) |
| `tile:2:f84a35fc4036557603dc533c85fe3e65c4c5b69ea224584f0cb89ccc76e8cf2d` | 8X8D4 block 1 tile 4 over 8X8D4 block 1 tile 4 over 8X8D4 block 20 tile 47 over the ground colour 6 | map 2, square (11,13) facing east, column 3 row 6 |  |
| `tile:2:f9094a93d959e138af7ced5c8f8fdc573a6e59eeb7e3da34bd5bd6d6964e14be` | 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 2 | map 2, square (4,1) facing west, column 0 row 4 | `yarash-braced-passage-terrain-f9094a93d959.png` (area 22) |
| `tile:2:fd606ec72596e2370e5bf6ee42c634a6a5e4863b120b747575c1ea0aa0b91bc3` | 8X8D4 block 1 tile 5 over 8X8D4 block 1 tile 5 over 8X8D4 block 3 tile 7 | map 2, square (4,1) facing south, column 7 row 4 |  |

#### tile set 8X8D4 block 3 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:2:a650052d256c7c234636d2ccc493e2fd6b996c1b813727df19977080d878f3d8` | 8X8D4 block 3 tile 12 over 8X8D4 block 3 tile 12 over sky colour 0 | map 2, square (6,3) facing north, column 4 row 2 | `kuto-podal-side-streets-podal-terrain-a650052d256c.png` (area 18, 29) |
| `tile:2:bdaf1b91b6d53b20f3b2a866d38b67e1843680f677a26a622ff45e8195a1053b` | 8X8D4 block 3 tile 13 over 8X8D4 block 3 tile 13 over sky colour 0 | map 2, square (6,3) facing north, column 7 row 2 | `kuto-podal-side-streets-podal-terrain-bdaf1b91b6d5.png` (area 18, 29) |
| `tile:2:cca089937faeed00e6d548d8c4fa5a9398807335119e09b46203a0e0bc7dc2ff` | 8X8D4 block 3 tile 12 over 8X8D4 block 3 tile 12 over sky colour 11 | map 2, square (10,1) facing south, column 4 row 2 |  |
| `tile:2:fbb3153eaaa5dec2029f7f73ec8bea20a5f52be253fb5e1b8b60ad45482785f6` | 8X8D4 block 3 tile 56 over 8X8D4 block 3 tile 56 over sky colour 0 | map 2, square (6,3) facing south, column 5 row 4 | `podal-shrine-side-lanes-terrain-fbb3153eaaa5.png` (area 18, 29) |
| `tile:2:ff433a64d7f9717cfb69b8c0f5116e075bd5179afbd1363f7e1959c8108d7800` | 8X8D4 block 3 tile 11 over 8X8D4 block 3 tile 11 over sky colour 0 | map 2, square (6,3) facing north, column 3 row 2 | `kuto-podal-side-streets-podal-terrain-ff433a64d7f9.png` (area 18, 29) |

#### tile set 8X8D4 block 20 (68)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:2:01e849ebc4b537d2f117ccb05a596b78879040b6146265574b448bbeba273ab6` | 8X8D4 block 20 tile 46 over 8X8D4 block 3 tile 47 | map 2, square (13,12) facing west, column 8 row 5 |  |
| `tile:2:03ede61992707905e8bc89b4f52207cf45cca3a2cdf70afc1b33864ddfdcf422` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 28 over the ground colour 6 | map 2, square (9,6) facing west, column 6 row 6 | `kuto-packed-earth-03ede6199270.png` (area 16, 29) |
| `tile:2:07a228e1f52832792c7d2c3d4b32d3aee893574056e8452eb95ec57c27137eda` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 3 tile 21 | map 2, square (7,5) facing south, column 5 row 5 |  |
| `tile:2:10bb9e1d09d562f20c1d48af012226fb1e3a18378cda5a864eacc5e088581d17` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over sky colour 0 | map 2, square (6,4) facing south, column 4 row 4 | `podal-workshop-lanes-terrain-10bb9e1d09d5.png` (area 10, 18, 29) |
| `tile:2:1228edfe030f33759b57ac331ee4938a4e8c1ce706cd23bed12119678731f8c6` | 8X8D4 block 20 tile 26 over 8X8D1 block 203 tile 38 | map 2, square (1,8) facing west, column 0 row 6 | `swamp-elder-terrain-1228edfe030f.png` (area 16) |
| `tile:2:19d3df87d7c13b4cacd37664f2e1457220aa81e5a2f867c8609bbf839d62c6d1` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 49 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 2, square (1,10) facing south, column 10 row 7 |  |
| `tile:2:1f2a61e4456e0390674f8266aa2fd470f295b0f2ab2a90ab6b70778edd77a310` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 3 tile 37 | map 2, square (12,12) facing north, column 2 row 3 |  |
| `tile:2:235c0b3a319cb533366b0f2a124a948e61d12ea65e1a4bd90f160d6365dcb3bd` | 8X8D4 block 20 tile 47 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 2, square (9,5) facing west, column 1 row 6 | `lizard-sunken-wet-joins-235c0b3a319c.png` (area 16, 29) |
| `tile:2:262c6bcc393ca80cae1a577dc0f3ad07da20bda78e9f9631d54f384a969aaa79` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 3 tile 63 | map 2, square (3,6) facing west, column 4 row 4 | `graveyard-slate-court-joins-262c6bcc393c.png` (area 10, 29) |
| `tile:2:296405ff47dc88d9cf40cbebc362f836730f4690beacd1c13bb9e7d6f136c012` | 8X8D4 block 20 tile 48 over 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 2, square (1,10) facing north, column 0 row 7 | `swamp-elder-terrain-296405ff47dc.png` (area 16) |
| `tile:2:2a44b7121b727c5025a15cdc8e962f344bf336f7c10e995c7f4f13f3dd11da5a` | 8X8D4 block 20 tile 49 over 8X8D4 block 3 tile 39 | map 2, square (13,3) facing east, column 10 row 7 |  |
| `tile:2:2e5f7f48f8140b7c0377690b826be203cb2f92efc5e4d65d9b09f645c4bc60f6` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D1 block 203 tile 39 | map 2, square (0,9) facing west, column 4 row 4 | `kuto-perimeter-lanes-terrain-2e5f7f48f814.png` (area 29) |
| `tile:2:326785667f8ebc9565683c4d102f8199fbad185afd3eaa4feebfe72540872826` | 8X8D4 block 20 tile 48 over 8X8D1 block 203 tile 12 | map 2, square (0,9) facing west, column 0 row 7 | `lizard-north-canal-terrain-326785667f8e.png` (area 16) |
| `tile:2:3689c4715468180847b9f0186a1d0e496735679fa5d4c43ef9e1dffd24f6ce2b` | 8X8D4 block 20 tile 48 over 8X8D1 block 203 tile 28 | map 2, square (13,12) facing north, column 0 row 7 | `lizard-west-turn-terrain-3689c4715468.png` (area 10, 16) |
| `tile:2:3840e060421e29370b68e66a784d7143b7c8871f02525c2371e3c6a8be862f53` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 49 over 8X8D4 block 3 tile 39 | map 2, square (5,7) facing south, column 10 row 7 |  |
| `tile:2:393e3ff210b2ce6722730a4c4edb42e2e6d10a4f7e6004cbec3a3bcc0eb45978` | 8X8D4 block 20 tile 48 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 2, square (7,6) facing east, column 0 row 7 |  |
| `tile:2:3a6be008ddbcd000b657d2b58a12f17ac826d95a491714bedd12105ed8966dd8` | 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 44 over 8X8D4 block 3 tile 62 | map 2, square (12,8) facing east, column 7 row 7 |  |
| `tile:2:3cda696977e26e8f6e240aaa0c37f71182cb5f31fdbb9c7e83e13e0d6524087e` | 8X8D4 block 20 tile 30 over 8X8D4 block 3 tile 68 | map 2, square (7,5) facing south, column 8 row 5 |  |
| `tile:2:3ec151024287d36bba7194a3f166f22d813455c1a328cb95b813f0b1e8fbc22f` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D4 block 1 tile 57 | map 2, square (0,9) facing south, column 6 row 6 | `lizard-east-bank-terrain-3ec151024287.png` (area 16) |
| `tile:2:45300336d3d3fd7242d79f118a45028994ca6837f177f4d1af8adb3c641c0be0` | 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 2, square (13,3) facing west, column 0 row 7 |  |
| `tile:2:49bdf0621c9f87b0c254c8bced4e04b21a4b2d150cd755de9f1fc6143b2ed8bb` | 8X8D4 block 20 tile 35 over 8X8D1 block 203 tile 39 | map 2, square (0,8) facing south, column 7 row 4 |  |
| `tile:2:4a6b9d218c44eb528b7d83d5e9faa641d2c9ced1ffc4cc5a670fdf4571ac0d8b` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D1 block 203 tile 36 over the ground colour 6 | map 2, square (0,10) facing south, column 8 row 8 |  |
| `tile:2:4d7c74998055e50fc2f69531a8b1ad9d8aa469d6f7bac02c7e6a0963159be194` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 3 tile 7 | map 2, square (6,6) facing north, column 4 row 4 |  |
| `tile:2:5745bb7f429a1afa52a11ab57f7148ee24f79b3805d2c6a95d8c1ee9e779be01` | 8X8D4 block 20 tile 49 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 2, square (13,13) facing west, column 10 row 7 | `lizard-ruin-wet-joins-5745bb7f429a.png` (area 16, 29) |
| `tile:2:5e1ced0814626b5ae3f2e7276de7665c27fe92522cdd5ad7f7796158b15a2ba4` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 61 over sky colour 11 | map 2, square (15,11) facing south, column 2 row 3 | `lizard-lower-approaches-terrain-5e1ced081462.png` (area 16) |
| `tile:2:6175651c5050ed6078da03d2bf5e6321f8a5200ed91012594f80fa4d4935a7b1` | 8X8D4 block 20 tile 48 over 8X8D4 block 3 tile 36 | map 2, square (12,8) facing south, column 0 row 7 |  |
| `tile:2:672545b106bfe0346c520433c779a59a924b6fe53b77d938c5966e87277b9224` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 2, square (6,3) facing south, column 5 row 5 | `kuto-well-plaza-terrain-672545b106bf.png` (area 10, 29) |
| `tile:2:6cf8120c22850b01994ffdca03b5006b2d92192e9beba897983e59b408d2832e` | 8X8D4 block 20 tile 32 over 8X8D4 block 3 tile 37 | map 2, square (2,6) facing south, column 3 row 4 |  |
| `tile:2:75045d513668116f45b15d68144f7cf2bc3d2658b1fd297cbd4c7457a6095ea6` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D4 block 3 tile 27 over the ground colour 6 | map 2, square (11,8) facing east, column 6 row 6 |  |
| `tile:2:8066e1cc52f1cd804537a678c9d1776cdc9934b06a6a3b52d5c5cf17ba5e2b55` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over 8X8D4 block 3 tile 56 over 8X8D4 block 3 tile 56 over sky colour 11 | map 2, square (6,6) facing north, column 5 row 4 |  |
| `tile:2:842dd776408c1d55ce8b9ef045a4c5f691005dd47e97e5f95e534fff0d4d0f71` | 8X8D4 block 20 tile 16 over 8X8D1 block 203 tile 12 | map 2, square (0,2) facing east, column 10 row 2 |  |
| `tile:2:8702ad6f6409e5d76690001a6f1a39e6541a0b7e3b2c7203ddac7cc4cecbdc83` | 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 38 | map 2, square (0,9) facing west, column 1 row 7 | `lizard-north-canal-terrain-8702ad6f6409.png` (area 16) |
| `tile:2:8afcfc1590454f90463074d5b83d1174a2f3054e46cd321fa02356cab430131b` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 3 tile 65 | map 2, square (4,7) facing west, column 5 row 5 |  |
| `tile:2:94ef59d6815741a8e9fd75af7869f4d11e8efac2546ef6513ab81d0f800a20d3` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D1 block 203 tile 34 over the ground colour 6 | map 2, square (14,12) facing west, column 6 row 6 | `lizard-keep-rubble-terrain-94ef59d68157.png` (area 16, 29) |
| `tile:2:94fe98546478deecee6e02ae0c9b75b9c936e8bdfaa60890bbde58fe6e685a77` | 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 28 over the ground colour 6 | map 2, square (11,2) facing south, column 7 row 7 | `kuto-earth-perimeter-joins-94fe98546478.png` (area 16, 29) |
| `tile:2:9e65c048e24257626e8f3dcf282746653d70eb9345ba911815c4cea34fd1111d` | 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 2, square (0,10) facing south, column 7 row 7 |  |
| `tile:2:a572dda8df7f330ed49319445b62433037b57be84e52bd758f876cfebc64b4de` | 8X8D4 block 20 tile 17 over 8X8D4 block 1 tile 22 over sky colour 11 | map 2, square (0,2) facing west, column 0 row 2 |  |
| `tile:2:a7e17fe8fa9331f494c510307ab2fc3eba11256810b2d01c9c63959bd6d61f1c` | 8X8D4 block 20 tile 66 over 8X8D1 block 203 tile 35 | map 2, square (1,2) facing west, column 2 row 4 |  |
| `tile:2:a872a29842be2973576c7479620d6e5dedc9d048288700af41df720a377b7313` | 8X8D4 block 20 tile 49 over 8X8D4 block 20 tile 49 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 2, square (8,6) facing west, column 3 row 7 | `lizard-yard-wet-ground-a872a29842be.png` (area 16) |
| `tile:2:ace90c001bcf8993c050115f6d6017c6bca9954c01aa60875e05e8db9651a0ec` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D4 block 3 tile 30 | map 2, square (12,8) facing east, column 8 row 8 |  |
| `tile:2:b2a97de09b528c8055cd9e30356c730cd422c7f2b131d3f78970ff305806122f` | 8X8D4 block 20 tile 31 over 8X8D4 block 3 tile 63 | map 2, square (3,7) facing south, column 10 row 2 |  |
| `tile:2:b30bd497767f7f81a69da4456125b2833063009427146bba76318999b52e8e65` | 8X8D4 block 20 tile 44 over 8X8D4 block 3 tile 36 | map 2, square (12,8) facing south, column 1 row 7 |  |
| `tile:2:b957aa341370ea063c01bfef44da645c4aff1e636cd779584838e27b9063e30f` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over 8X8D4 block 3 tile 46 | map 2, square (3,7) facing west, column 5 row 4 |  |
| `tile:2:ba594a4b803a3987e842033dc3ed4c614beb16cbf7d20096b67f9a355cb0f144` | 8X8D4 block 20 tile 47 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 2, square (12,3) facing west, column 10 row 7 |  |
| `tile:2:bf4dfb5f75778580df00b8c5e9b4497a98cd731ce827fbad6a893f332e6b0e9b` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 16 over sky colour 11 | map 2, square (2,6) facing east, column 10 row 3 |  |
| `tile:2:c23e36172f2283ce3c1aec215565d86f16a4d6e8f9ad2e31b8b089d1cb28db75` | 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 39 | map 2, square (8,5) facing south, column 7 row 6 | `kuto-inner-lane-terrain-c23e36172f22.png` (area 10, 16, 29) |
| `tile:2:c48357dbb702583a2ae9dc14f11c46b9ca111229424bfcbec2738ecb9bc14868` | 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 31 | map 2, square (13,3) facing south, column 7 row 6 | `lizard-north-canal-terrain-c48357dbb702.png` (area 16) |
| `tile:2:c4c1d430ecb4acbb66cd3778b676e06c7280be51bfefcd89b52b785777be7af0` | 8X8D4 block 20 tile 49 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 2, square (1,9) facing south, column 10 row 7 | `lizard-bank-arch-terrain-c4c1d430ecb4.png` (area 16) |
| `tile:2:c561330cede75a1a2e83e6843a63513476635ebbaf9502498ffdd526426e1bfb` | 8X8D4 block 20 tile 48 over 8X8D4 block 20 tile 48 over 8X8D1 block 203 tile 29 | map 2, square (8,6) facing west, column 2 row 7 | `lizard-southwest-trail-terrain-c561330cede7.png` (area 16) |
| `tile:2:c6d1f2df48229850246be23892a9c414309f9ed182ae6f6199495298b10abf40` | 8X8D4 block 20 tile 60 over 8X8D4 block 20 tile 60 over 8X8D1 block 203 tile 16 over sky colour 11 | map 2, square (1,8) facing west, column 6 row 4 |  |
| `tile:2:cbed94335d2ad5da5d203820875d3e48f0f6b3d736c34051f7033d961b87ae71` | 8X8D4 block 20 tile 31 over 8X8D1 block 203 tile 12 | map 2, square (0,9) facing south, column 10 row 2 | `graveyard-slate-court-joins-cbed94335d2a.png` (area 10) |
| `tile:2:cc0ad4c25463c0191e022ed8217b0255cf8b4c2c66b9ca08eac43aa45139f358` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 38 | map 2, square (0,9) facing north, column 1 row 2 | `kuto-north-rubble-terrain-cc0ad4c25463.png` (area 29) |
| `tile:2:ccc282c0ed669c43f86af0e895160f4c001f8387c24939aeaa827ba5745069ca` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 17 over sky colour 11 | map 2, square (4,6) facing west, column 1 row 4 |  |
| `tile:2:d9a6c833d1ee06d36a0467fbd3b7af5c4ed0c51145f49f62c267960e280a8689` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D1 block 203 tile 21 over the ground colour 6 | map 2, square (13,12) facing west, column 8 row 8 | `lizard-west-ruin-terrain-d9a6c833d1ee.png` (area 16, 29) |
| `tile:2:dc9c2c52e334f90ae4fa5dc1acc794b41aa1afbb411a2269b58a1d33a829f5a0` | 8X8D4 block 20 tile 35 over 8X8D1 block 203 tile 12 | map 2, square (3,7) facing south, column 9 row 3 | `kuto-perimeter-lanes-terrain-dc9c2c52e334.png` (area 10, 29) |
| `tile:2:dd7d6f38693fdbf7d5dc68fea46b053d89074ff71630d10eef246193d6db1751` | 8X8D4 block 20 tile 48 over 8X8D1 block 203 tile 13 | map 2, square (0,10) facing west, column 0 row 7 |  |
| `tile:2:e6b528fc1dcb54c8fc3dd3f5704c6dcb2c60390759708396e1e3a152fa33406d` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 31 over sky colour 11 | map 2, square (7,5) facing south, column 10 row 3 |  |
| `tile:2:e97b5e48271634085f302010391d816b022e3033d02c4bca964f1dc65ae715ff` | 8X8D4 block 20 tile 26 over 8X8D4 block 1 tile 9 | map 2, square (1,9) facing west, column 0 row 6 |  |
| `tile:2:e9b947f3a7478f877a100223aed13dfcf9d3c9858c0caeb2c0bf9420f9fb8248` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 30 over sky colour 11 | map 2, square (2,6) facing north, column 9 row 3 | `lizard-west-ruin-terrain-e9b947f3a747.png` (area 16) |
| `tile:2:ea71b9f37c823424edd30e47d590c209267be1640a147db65edea120304bca5f` | 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 44 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 2, square (13,12) facing west, column 7 row 7 | `lizard-ruin-wet-joins-ea71b9f37c82.png` (area 16, 29) |
| `tile:2:ec3a1e66d68a3d5c6719ad35c7c7e7aa8e16d576037d268368ae7db91b9ea7c4` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 33 over sky colour 11 | map 2, square (2,6) facing north, column 10 row 2 | `lizard-west-ruin-terrain-ec3a1e66d68a.png` (area 16) |
| `tile:2:eeecdbfdbb288766198669bb0d970d05775ce1857d54367928de2ae0cb205f1a` | 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 27 over the ground colour 6 | map 2, square (6,7) facing west, column 4 row 6 | `kuto-packed-earth-eeecdbfdbb28.png` (area 16, 29) |
| `tile:2:efad43a6471e6bf15d598f1c62649d186d2c4e619a2a7f5549836cddf2053a1e` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 12 | map 2, square (2,7) facing south, column 1 row 2 |  |
| `tile:2:f2219ab3fb5872a2f3b3618a12c518283fb63aa77d9f83d97c851b4648b46c79` | 8X8D4 block 20 tile 32 over 8X8D1 block 203 tile 38 | map 2, square (0,10) facing north, column 3 row 4 | `kuto-north-rubble-terrain-f2219ab3fb58.png` (area 29) |
| `tile:2:f6ac070703f337f2c577b5b7e05898a266fe90a6668bdc2cf3adc52eb6b7ed0c` | 8X8D4 block 20 tile 47 over 8X8D4 block 3 tile 62 | map 2, square (12,4) facing north, column 10 row 7 |  |
| `tile:2:f7fd9eaad5c416530ede56e640a69d16d8ff339b311369e254d50e0cdddd1a7d` | 8X8D4 block 20 tile 60 over 8X8D4 block 20 tile 60 over 8X8D4 block 20 tile 31 over sky colour 0 | map 2, square (6,4) facing south, column 6 row 4 | `kuto-north-rubble-terrain-f7fd9eaad5c4.png` (area 29) |
| `tile:2:f9951e2b28b777e158333463ffeb701eceb703298809ed974f8c67444d35c1a0` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 61 over sky colour 11 | map 2, square (5,6) facing east, column 2 row 3 |  |
| `tile:2:ff5fa007d24a55574db4c37bf761e51bb82550feee540954afcd00acd51110b8` | 8X8D4 block 20 tile 19 over 8X8D4 block 20 tile 19 over 8X8D1 block 203 tile 35 | map 2, square (1,3) facing west, column 5 row 4 |  |

### Area 4: Valjevo Castle (58)

Map 4; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 4, square (0,3) facing west, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:4:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 4, square (8,4) facing east, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29) |
| `tile:4:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 4, square (0,3) facing west, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:4:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 4, square (0,5) facing north, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 14, 15, 20, 22, 29) |
| `tile:4:f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b` | 8X8D1 block 203 tile 13 | map 4, square (0,3) facing north, column 0 row 4 | `new-phlan-gate-31a92759fb4b.png` (area 0, 1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 26, 27, 29, 31) |

#### tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:73fca805c559f76cbe3313cb1c587758426d3cd915fd5ad36da8f6224c9c6e94` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 15 | map 4, square (7,1) facing east, column 1 row 4 |  |
| `tile:4:cd57c8e86c999742f3503cbefa549789a4b162b4acb03d89889c21f721e52f9c` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (0,6) facing south, column 6 row 4 |  |
| `tile:4:d2c4a6b5bf49ce6b432362612e67b21c93a35e4acef5c1c63d225fe95bb438bd` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 15 | map 4, square (14,10) facing north, column 10 row 3 |  |

#### tile set 8X8D5 block 1 (7)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D5 block 1 tile 14 | map 4, square (0,3) facing south, column 10 row 3 | `podal-west-boundary-terrain-0264796f9fa2.png` (area 2, 9, 10, 15, 18, 20, 26, 29, 31) |
| `tile:4:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 4, square (0,6) facing north, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:4:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 4, square (0,5) facing north, column 3 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 22, 29) |
| `tile:4:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D5 block 1 tile 13 | map 4, square (0,3) facing north, column 0 row 3 | `podal-west-boundary-terrain-9fcdf0ff6bdf.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |
| `tile:4:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 4, square (0,5) facing north, column 3 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29) |
| `tile:4:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 4, square (0,9) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:4:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D5 block 1 tile 15 | map 4, square (0,3) facing west, column 5 row 6 | `podal-west-boundary-terrain-f5d7a245e0ac.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |

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

#### tile set 8X8D5 block 242 (29)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:0671c9cef854c857a505d3563e75e5193a67c94acb5f068ed452871bb34e5508` | 8X8D5 block 242 tile 67 | map 4, square (0,4) facing east, column 5 row 5 | `valjevo-dungeon-briar-terrain-05.png` (area 3, 6) |
| `tile:4:0d64c1aba3330ac2faecf1c01d1f76ab69a04f1098002e698c370bc81a5cc4f3` | 8X8D5 block 242 tile 20 over sky colour 11 | map 4, square (1,4) facing east, column 7 row 3 | `valjevo-dungeon-briar-terrain-24.png` (area 3, 6) |
| `tile:4:1131e3b33c1897dc36ef3f052d3e14c5af1d1a21bde6716d2c8e0482bb2aab61` | 8X8D5 block 242 tile 37 | map 4, square (1,4) facing east, column 8 row 3 | `valjevo-dungeon-east-corner-terrain-01.png` (area 3, 6) |
| `tile:4:15963947cd6dc323654f4395e73488a38fd21e5b07d528f67ca8d4f29500340c` | 8X8D5 block 242 tile 65 | map 4, square (0,4) facing east, column 7 row 5 | `valjevo-dungeon-briar-terrain-12.png` (area 3, 6) |
| `tile:4:2090033b7fe53e0cda9f8161cb4a45eda52c55099e51bc9f51a6c3874b604804` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over sky colour 11 | map 4, square (0,4) facing east, column 4 row 2 | `valjevo-dungeon-briar-terrain-11.png` (area 3, 6) |
| `tile:4:2190abd1c1b89646bc81d87cccda58568c7e1b5acd76b519fccf5829d4e01c7b` | 8X8D5 block 242 tile 19 over sky colour 11 | map 4, square (0,4) facing south, column 2 row 3 | `valjevo-dungeon-briar-terrain-08.png` (area 3, 6) |
| `tile:4:32b798fa659035152c1f8a60929e92700d6fed3037c9ca4c597203ad57c200a4` | 8X8D5 block 242 tile 17 over sky colour 11 | map 4, square (0,4) facing north, column 10 row 1 | `valjevo-dungeon-briar-terrain-03.png` (area 3, 6) |
| `tile:4:3a44d0df208c486811e0b93eb75816a53c45fccf72281e35819962165662c040` | 8X8D5 block 242 tile 53 | map 4, square (0,4) facing east, column 5 row 6 | `valjevo-dungeon-briar-terrain-13.png` (area 3, 6) |
| `tile:4:4237c285f1899dd2fe96267fbf26054e94748dde58010edba4614281396e87cb` | 8X8D5 block 242 tile 15 | map 4, square (0,4) facing east, column 3 row 3 | `valjevo-dungeon-briar-terrain-04.png` (area 3, 6) |
| `tile:4:42c91e6a9044311f3d505aff1a1ef27aefe5e068dfc5b4ecb77e4a2f5418d92f` | 8X8D5 block 242 tile 31 | map 4, square (0,4) facing east, column 8 row 5 | `valjevo-dungeon-briar-terrain-14.png` (area 3, 6) |
| `tile:4:6b7842c0cd5ea68901e8e859608b02c78e4eeeff56dcf65fb093668fe3216446` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (0,4) facing east, column 3 row 2 | `valjevo-dungeon-briar-terrain-10.png` (area 3, 6) |
| `tile:4:7561fd89795b93019c59aa3f2845972ec76293d71113a27feb55ef92daa19d05` | 8X8D5 block 242 tile 69 | map 4, square (0,4) facing east, column 4 row 7 | `valjevo-dungeon-briar-terrain-17.png` (area 3, 6) |
| `tile:4:7befb7f5e8b497feb0508f160a2f16fffb17bdeda63c888da0dfa86345cb854e` | 8X8D5 block 242 tile 34 | map 4, square (1,4) facing east, column 6 row 6 | `valjevo-dungeon-briar-terrain-28.png` (area 3, 6) |
| `tile:4:7ddfc9b6c0342eabf84cdc86217cf578dcd68da5371291f0d39601be2343012e` | 8X8D5 block 242 tile 32 | map 4, square (0,4) facing north, column 9 row 9 | `valjevo-dungeon-briar-terrain-22.png` (area 3, 6) |
| `tile:4:877afc2b6549f6e3f546e63c9a5979c27cd67b398ef06f50d5d8b32d345c497c` | 8X8D5 block 242 tile 12 | map 4, square (0,4) facing east, column 3 row 8 | `valjevo-dungeon-briar-terrain-23.png` (area 3, 6) |
| `tile:4:893d4126af27130f16837df9ddeb49f4b0895ea59cf517c7e66edf12043cd6e0` | 8X8D5 block 242 tile 14 | map 4, square (0,4) facing south, column 1 row 3 | `valjevo-dungeon-briar-terrain-07.png` (area 3, 6) |
| `tile:4:94cf8702405e7f3d23dfdb4aed4040d1a8b0f3400086d67ce8ee4b26d2b8f728` | 8X8D5 block 242 tile 47 | map 4, square (0,4) facing east, column 6 row 3 | `valjevo-dungeon-briar-terrain-06.png` (area 3, 6) |
| `tile:4:a21e43542b7ab6d537b618c0858678aa46d03bf9f026b9d219aa953bd4ee6deb` | 8X8D5 block 242 tile 50 | map 4, square (0,4) facing north, column 10 row 9 | `valjevo-dungeon-briar-terrain-19.png` (area 3, 6) |
| `tile:4:a72cd795273e9928eaf87725b5550fff71b45e59ccd15c470831dcc9722049f5` | 8X8D5 block 242 tile 35 | map 4, square (0,4) facing south, column 4 row 6 | `valjevo-dungeon-briar-terrain-27.png` (area 3, 6) |
| `tile:4:a7d58f2e585a10f6423aa78da8d965e76f7aee6fcdf964a34c367e7ff57dd5ce` | 8X8D5 block 242 tile 20 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (1,4) facing south, column 6 row 4 | `valjevo-dungeon-briar-terrain-29.png` (area 3, 6) |
| `tile:4:a92b522baf70206e794b2a1953184928f00971bf98cea7a2830f171ce1791fee` | 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (1,4) facing south, column 4 row 4 | `valjevo-dungeon-east-corner-terrain-02.png` (area 3, 6) |
| `tile:4:b2387150b8b37b8747391045eb8e7e3aad8ff6c36dc1fb6e410c434faf31368d` | 8X8D5 block 242 tile 21 over sky colour 11 | map 4, square (1,4) facing south, column 8 row 3 | `valjevo-dungeon-briar-terrain-25.png` (area 3, 6) |
| `tile:4:c699c4a3f0c07e17bc52813d4cc3d7c302fc632d6da360c2d63ce92989cb6e32` | 8X8D5 block 242 tile 36 over sky colour 11 | map 4, square (0,4) facing south, column 3 row 3 | `valjevo-dungeon-briar-terrain-09.png` (area 3, 6) |
| `tile:4:cacd64e5955d704bd0be9542e59817e710e8e0735f6fbfec53edfa6c7c9a62a9` | 8X8D5 block 242 tile 16 | map 4, square (0,4) facing east, column 4 row 3 | `valjevo-dungeon-briar-terrain-15.png` (area 3, 6) |
| `tile:4:d048a50d90eea12677fb8456e2f971f6e5ab6b8f1e53c8547c5a1b2bf066a09a` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (5,7) facing north, column 6 row 4 |  |
| `tile:4:e0add5ad1eb7eaf44b1ac4ab22bcad0e965ea86eda665cd2faaf5e2239869150` | 8X8D5 block 242 tile 18 over sky colour 11 | map 4, square (0,4) facing south, column 0 row 1 | `valjevo-dungeon-briar-terrain-02.png` (area 3, 6) |
| `tile:4:eb039ad14db5712287672fd45f2d2d26a6a33ee522784b04e3a03eac4f04ad69` | 8X8D5 block 242 tile 33 | map 4, square (0,4) facing south, column 3 row 7 | `valjevo-dungeon-briar-terrain-20.png` (area 3, 6) |
| `tile:4:eb5914b49c7f93740850c50b55f61e79c2387d40b3ba5e638ed2f07bc0d28d43` | 8X8D5 block 242 tile 68 | map 4, square (0,4) facing east, column 8 row 6 | `valjevo-dungeon-briar-terrain-16.png` (area 3, 6) |
| `tile:4:f3538203420ffdd57a5c6b220c7224de270400f6893d8ae4eb5dc058acb02e5b` | 8X8D5 block 242 tile 13 | map 4, square (0,4) facing east, column 2 row 8 | `waystone-boundary-terrain-f3538203420f.png` (area 3, 6, 26) |

### Area 6: Valjevo Castle (90)

Map 6; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### shared tile set 8X8D1 block 203 (14)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 6, square (5,0) facing west, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:6:195e9b93e8621946683a00161346595e0fa7b31ddbbf27fb0214ea3bfbe5c4dc` | 8X8D1 block 203 tile 40 | map 6, square (1,2) facing south, column 0 row 7 | `route-195e9b93e862.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 6, square (3,0) facing north, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:6:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 6, square (5,0) facing west, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:6:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 6, square (0,0) facing south, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 16, 21, 23, 24, 28, 29, 31) |
| `tile:6:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 6, square (7,10) facing west, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29) |
| `tile:6:8737539068992377d622a86a6ab259387e19fc5a846d63a4b75effc2a06fae8c` | 8X8D1 block 203 tile 11 | map 6, square (0,1) facing east, column 8 row 6 | `mendor-library-annex-terrain-873753906899.png` (area 0, 2, 4, 5, 9, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 6, square (3,0) facing north, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:6:a54a22cfabadf3d87a0d29821dac782c1f6ff842af8e41be65b4578a712c5485` | 8X8D1 block 203 tile 20 over the ground colour 6 | map 6, square (1,1) facing south, column 2 row 8 | `new-phlan-training-paving-0-a54a22cfabad.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:b99063b51996f32692877bfb0938e2ddee836bfd65b398cfad050106b7120d17` | 8X8D1 block 203 tile 24 over the ground colour 6 | map 6, square (1,2) facing south, column 0 row 10 | `route-b99063b51996.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 6, square (10,0) facing east, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 14, 15, 20, 22, 29) |
| `tile:6:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 6, square (10,0) facing east, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 15, 20, 22, 29) |
| `tile:6:d7f44e9ae57491d39a4a9f79cd2680acaa61cef66e57f530b763ed7229cd425b` | 8X8D1 block 203 tile 22 over the ground colour 6 | map 6, square (0,1) facing south, column 0 row 7 | `new-phlan-training-paving-0-d7f44e9ae574.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 13, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b` | 8X8D1 block 203 tile 13 | map 6, square (3,0) facing north, column 4 row 4 | `new-phlan-gate-31a92759fb4b.png` (area 0, 1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 26, 27, 29, 31) |

#### tile set 8X8D1 block 203 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:73fca805c559f76cbe3313cb1c587758426d3cd915fd5ad36da8f6224c9c6e94` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (15,3) facing south, column 4 row 4 |  |
| `tile:6:c160536a81efbce52dbc73a8d5328bee3513abea5f2e561966d54bb6ae8d1133` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (15,3) facing south, column 4 row 4 |  |
| `tile:6:cd57c8e86c999742f3503cbefa549789a4b162b4acb03d89889c21f721e52f9c` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (9,0) facing west, column 6 row 4 |  |
| `tile:6:d2c4a6b5bf49ce6b432362612e67b21c93a35e4acef5c1c63d225fe95bb438bd` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (9,0) facing west, column 6 row 4 |  |

#### tile set 8X8D5 block 1 (17)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D5 block 1 tile 14 | map 6, square (3,0) facing north, column 3 row 4 | `podal-west-boundary-terrain-0264796f9fa2.png` (area 2, 9, 10, 15, 18, 20, 26, 29, 31) |
| `tile:6:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D5 block 1 tile 12 | map 6, square (3,1) facing north, column 4 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D5 block 1 tile 8 | map 6, square (3,1) facing north, column 5 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 6, square (9,0) facing east, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:6:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 6, square (5,0) facing west, column 8 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 22, 29) |
| `tile:6:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D5 block 1 tile 54 | map 6, square (5,0) facing west, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:6:41ea3ceae0f6da8a29151985f9d6f70572dbd7d9e81b672fe759802e75a7d115` | 8X8D5 block 1 tile 50 | map 6, square (0,1) facing south, column 0 row 6 | `room-tile-09.png` (area 0, 2, 4, 5, 9, 14, 20, 21, 23, 24, 28, 31) |
| `tile:6:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D5 block 1 tile 9 | map 6, square (3,1) facing north, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D5 block 1 tile 21 | map 6, square (9,0) facing east, column 4 row 5 | `kuto-podal-side-streets-kuto-terrain-54cfe77b0fa0.png` (area 2, 4, 9, 14, 15, 18, 29, 31) |
| `tile:6:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D5 block 1 tile 11 | map 6, square (3,1) facing north, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D5 block 1 tile 53 | map 6, square (5,0) facing west, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 15, 16, 20, 22, 29) |
| `tile:6:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D5 block 1 tile 13 | map 6, square (3,0) facing north, column 7 row 4 | `podal-west-boundary-terrain-9fcdf0ff6bdf.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |
| `tile:6:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 6, square (5,0) facing west, column 8 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29) |
| `tile:6:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 6, square (13,0) facing west, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:6:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D5 block 1 tile 10 | map 6, square (3,1) facing north, column 6 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D5 block 1 tile 7 | map 6, square (3,1) facing north, column 4 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:6:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D5 block 1 tile 15 | map 6, square (3,0) facing north, column 5 row 6 | `podal-west-boundary-terrain-f5d7a245e0ac.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |

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

#### tile set 8X8D5 block 242 (30)

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
| `tile:6:a935cfd5653e067413370e19a2f013bd8067d2e08ec0ea24fe27ed4345c09b84` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (4,0) facing south, column 8 row 2 |  |
| `tile:6:b53c88b670761d598d1e4ef19e72d60d5b8aad7d3a776d215f599cdb59d6ac75` | 8X8D5 block 242 tile 17 over 8X8D5 block 241 tile 14 | map 6, square (4,1) facing west, column 9 row 2 |  |
| `tile:6:cce5fe889bf7a3706d86523cdc1b5cfb9879ba9ead96ad6a5683d65564f2aee4` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over sky colour 15 | map 6, square (4,0) facing east, column 5 row 3 |  |
| `tile:6:cd3061c8e2d2b424a42f7ed64dd02c92c02e9cd434262de345e112a81487dc46` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 11 | map 6, square (6,7) facing south, column 9 row 4 |  |
| `tile:6:d048a50d90eea12677fb8456e2f971f6e5ab6b8f1e53c8547c5a1b2bf066a09a` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 11 | map 6, square (5,1) facing south, column 6 row 4 |  |
| `tile:6:d10086d2db410a712cd5ce872a25ab75d8b29af0360bca1065647e0cdb5b0772` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (5,1) facing south, column 6 row 4 |  |
| `tile:6:dc1cf3b23226184b441fa4d9d6d8c1348420fd23df7e9ca7c3e82da826fc2b6d` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (4,0) facing east, column 4 row 3 |  |
| `tile:6:e2b033cd65d9db2764cb3c6d624ea67b426d839bc3e64728b4850a803235bffa` | 8X8D5 block 242 tile 20 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (6,0) facing south, column 6 row 4 |  |
| `tile:6:e2e83d47a6cd35c3398178715fa8ef80a4e7401f9d5ca77540f7f1e7562ffbfc` | 8X8D5 block 242 tile 17 over sky colour 15 | map 6, square (4,0) facing east, column 10 row 1 |  |
| `tile:6:ef02284aecc878866eb27b80a4da70186003b5c3d95990ec80369b563a892427` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 15 | map 6, square (6,7) facing south, column 9 row 4 |  |
| `tile:6:f01936315dadc35c5e164c1668bdcc7c5301427c836620b1d627a45ec938e58c` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D1 block 203 tile 17 over sky colour 15 | map 6, square (5,0) facing east, column 2 row 2 |  |
| `tile:6:f1a0d40c62bb72a61cb372b9c094da9b9b070ff895d9ef9da059dd44821f8368` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 65 over sky colour 11 | map 6, square (4,0) facing south, column 8 row 2 |  |
| `tile:6:faa872107917abb576b13111d58e3e59d9cd756f71db8efce64b3da3b2fea0a6` | 8X8D5 block 242 tile 21 over sky colour 15 | map 6, square (5,0) facing south, column 8 row 3 |  |

### Area 8: Phlan City Hall (132)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 0, square (13,0) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:8:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 0, square (13,0) facing south, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:8:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 0, square (2,1) facing east, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29) |
| `tile:8:7a62f42874a318807e50c5f76958ec89a88041ebcdbe85f63c86b39a4adb37d7` | 8X8D1 block 203 tile 34 over the ground colour 6 | map 0, square (3,1) facing west, column 6 row 6 | `orc-door-b39a4adb37d7.png` (area 0, 2, 3, 4, 5, 6, 7, 9, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:8:8737539068992377d622a86a6ab259387e19fc5a846d63a4b75effc2a06fae8c` | 8X8D1 block 203 tile 11 | map 0, square (0,3) facing south, column 2 row 6 | `mendor-library-annex-terrain-873753906899.png` (area 0, 2, 4, 5, 9, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |

#### tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:daa0c6008046802d652f2f0fe732ebf6d5e55819c0757e8ca57e8bbeeb8294f7` | 8X8D1 block 203 tile 16 over 8X8D3 block 103 tile 6 over sky colour 12 | map 0, square (5,5) facing west, column 9 row 1 | `new-phlan-street-paving-joins-0-daa0c6008046.png` (area 0) |

#### tile set 8X8D3 block 101 (17)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0fe98ad9cca711b154fa54acc26ca865f6582a794910079509e512f212a9fdb8` | 8X8D3 block 101 tile 30 | map 0, square (0,4) facing east, column 8 row 8 | `new-phlan-harbor-paving-joins-0-0fe98ad9cca7.png` (area 0, 2, 18, 24) |
| `tile:8:15be260fd378f5b33c7dc10af0e7565eaa2221596debd496a87de8b4c13f9f35` | 8X8D3 block 101 tile 42 | map 0, square (2,3) facing west, column 0 row 6 | `new-phlan-harbor-paving-joins-0-15be260fd378.png` (area 0, 2, 18, 24) |
| `tile:8:1874c3b1e2b448afb22da579328fd9e473773e33baa85d7be3278cb2a99f19ec` | 8X8D3 block 101 tile 57 | map 0, square (13,0) facing south, column 7 row 4 |  |
| `tile:8:190ac6332cc824f04f3d89592b0c0ce3ee634aaa2bb2983cad5c020189b58d16` | 8X8D3 block 101 tile 43 | map 0, square (0,3) facing east, column 10 row 6 | `new-phlan-harbor-paving-joins-0-190ac6332cc8.png` (area 0, 2, 18, 24, 29) |
| `tile:8:3a345c508ec6aeaebd3f6c8ba2645d88c94984c3198f6c0f3fc9a82fa521c3d0` | 8X8D3 block 101 tile 64 | map 0, square (3,2) facing south, column 9 row 5 | `kuto-earth-perimeter-joins-3a345c508ec6.png` (area 0, 2, 18, 24, 29) |
| `tile:8:40f1718d713d46dca3003667aa994c80ec701106dd1409d7fcad319327920a8b` | 8X8D3 block 101 tile 60 | map 0, square (0,2) facing south, column 6 row 5 |  |
| `tile:8:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D3 block 101 tile 40 | map 0, square (2,4) facing west, column 2 row 8 | `kuto-earth-perimeter-joins-4c23fe508a44.png` (area 2, 18, 29) |
| `tile:8:5b720a6a4fb8f83e4418b0f0f966a810b4590d0afca70948ce8f8a9253443abe` | 8X8D3 block 101 tile 14 | map 0, square (3,4) facing west, column 6 row 6 | `podal-cobble-floor-5b720a6a4fb8.png` (area 0, 18, 24) |
| `tile:8:688fefc217b332ae28481ccb2d038a8cc8c94a47133c9723ff2a47aebb810f0e` | 8X8D3 block 101 tile 58 | map 0, square (13,0) facing south, column 8 row 4 |  |
| `tile:8:79df1b8dae4f018af68d2bef802287f963249fa4f88521118c93285a05193515` | 8X8D3 block 101 tile 62 over sky colour 11 | map 0, square (3,4) facing west, column 6 row 4 | `new-phlan-south-market-terrain-0-79df1b8dae4f.png` (area 0) |
| `tile:8:86ba657c5e38ad07f30066dd1c810ad2552c5383b57c9ddd71c56c2dd5302d1e` | 8X8D3 block 101 tile 33 | map 0, square (0,3) facing east, column 10 row 5 | `new-phlan-harbor-paving-joins-0-86ba657c5e38.png` (area 0, 2, 18, 24, 29) |
| `tile:8:8cf3cea60a07a9d7bfe51b29ce5252f640c3bf3caeee2d2301c670f21fc55803` | 8X8D3 block 101 tile 27 over the ground colour 6 | map 0, square (3,3) facing south, column 6 row 6 | `kuto-earth-perimeter-joins-8cf3cea60a07.png` (area 0, 2, 18, 24, 29) |
| `tile:8:91149bb7ce520ef1bf6d3fbbe7957b53c612718db98f28fb3a7bedb86c0b1ea5` | 8X8D3 block 101 tile 16 over sky colour 11 | map 0, square (5,2) facing east, column 9 row 4 | `new-phlan-harbor-paving-joins-0-91149bb7ce52.png` (area 0) |
| `tile:8:dc6c3d5510b0653401790072e22a586a17ac1d36bc9b0f782ea2f57ec58b7828` | 8X8D3 block 101 tile 1 | map 0, square (5,2) facing east, column 9 row 5 | `podal-south-arcade-terrain-dc6c3d5510b0.png` (area 0, 18, 24) |
| `tile:8:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D3 block 101 tile 69 | map 0, square (0,2) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:8:e3922047e12c2260eaef5a4f40f4426f51c95b755440c710331492e05e3c951a` | 8X8D3 block 101 tile 28 over the ground colour 6 | map 0, square (3,3) facing west, column 1 row 6 | `kuto-earth-perimeter-joins-e3922047e12c.png` (area 2, 18, 24, 29) |
| `tile:8:e72913a89f9d3daef62dc19e63acc5d329e89789dbe44e1e0e3099927e06f034` | 8X8D3 block 101 tile 34 | map 0, square (2,3) facing west, column 0 row 5 | `new-phlan-proclamation-walk-terrain-e72913a89f9d.png` (area 0, 2, 18, 24, 29) |

#### tile set 8X8D3 block 102 (53)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0e154b2b42e53709f209ebe14a14cd59008146dad1f01dc0475f8614a6202889` | 8X8D3 block 102 tile 16 | map 0, square (5,1) facing south, column 0 row 7 | `new-phlan-civic-terrain-0e154b2b42e5.png` (area 0, 7, 11, 20) |
| `tile:8:14ba42f38a9f3edda8214f1dec22d94f520717c59573aa456e72854416d753d4` | 8X8D3 block 102 tile 10 | map 0, square (11,6) facing south, column 8 row 5 | `slums-trade-row-terrain-14ba42f38a9f.png` (area 0, 5, 7, 20) |
| `tile:8:15450d2266965cb35a6f45fd06dbf087e58bdd114e2cf88e56dba3e596898eb1` | 8X8D3 block 102 tile 52 | map 0, square (14,7) facing east, column 9 row 4 | `slums-trade-row-terrain-15450d226696.png` (area 0, 7, 20) |
| `tile:8:1930bf3912f12f181acb825e6e35b4935e2fbbcf9c15b721db739476417319a4` | 8X8D3 block 102 tile 19 | map 0, square (10,7) facing east, column 10 row 7 | `new-phlan-south-market-terrain-0-1930bf3912f1.png` (area 0) |
| `tile:8:244e3a737dff103ce562544c8101531a1243923042056f12d1e433b13403ecd6` | 8X8D3 block 102 tile 69 | map 0, square (10,9) facing east, column 6 row 6 | `valjevo-terra-cotta-floor-244e3a737dff.png` (area 7) |
| `tile:8:2c07b5fab1efd528ab309be6c35e564bb46750de4ff813de5ff640b6ee22c2bf` | 8X8D3 block 102 tile 17 | map 0, square (13,8) facing west, column 1 row 6 | `slums-trade-row-terrain-2c07b5fab1ef.png` (area 0, 7, 20) |
| `tile:8:2f4c62ac6c3847a825b124f5b92952adc23efc85b43287238b8da9591d1001a9` | 8X8D3 block 102 tile 39 | map 0, square (0,0) facing east, column 8 row 7 | `new-phlan-street-paving-joins-0-2f4c62ac6c38.png` (area 0, 20) |
| `tile:8:34c8e1f49742be249357aba1a5180b7fbd7dff4350ff758ba579534fcd9cdb70` | 8X8D3 block 102 tile 57 | map 0, square (13,8) facing east, column 10 row 3 | `slums-shop-frontage-terrain-34c8e1f49742.png` (area 0, 7, 20) |
| `tile:8:377420f76a2a02743aa7246fe5abc2356c698f47930ac0cbead1e1b62d2f1e44` | 8X8D3 block 102 tile 29 | map 0, square (2,1) facing east, column 5 row 5 | `valjevo-merchant-branch-terrain-377420f76a2a.png` (area 0, 5, 7) |
| `tile:8:39cc1df080453d41cc72fbb1070c6f88e040bb5e36b16cb6cd948bd07b1180f5` | 8X8D3 block 102 tile 6 | map 0, square (10,7) facing east, column 10 row 4 | `new-phlan-south-market-terrain-0-39cc1df08045.png` (area 0) |
| `tile:8:3bcfc4497c095510e26a7123dcf7d5000f75b567d0bb4cd72c92a870e9a41f48` | 8X8D3 block 102 tile 47 | map 0, square (0,0) facing west, column 10 row 7 |  |
| `tile:8:3c785d52bd5743e287ba141d5549e8235d3b16650a4a6dd89841f7b03fbc28f9` | 8X8D3 block 102 tile 66 | map 0, square (13,6) facing south, column 1 row 5 | `new-phlan-building-paving-joins-0-3c785d52bd57.png` (area 0, 7) |
| `tile:8:456f9f400e4fb32e2b5f13e2bc06736c4ba19f898ed29143ac49fb15e0c33ad1` | 8X8D3 block 102 tile 0 | map 0, square (5,1) facing south, column 0 row 6 | `valjevo-lower-trim-456f9f400e4f.png` (area 0, 5, 7, 11, 20) |
| `tile:8:480c0193f74fe2f8eebe95e255b18123bc620f775b922bb08febe829502c265b` | 8X8D3 block 102 tile 65 | map 0, square (12,6) facing east, column 9 row 5 | `valjevo-merchant-wing-terrain-480c0193f74f.png` (area 7) |
| `tile:8:491c0e9a5a1fe2680ecad326e5a4a7920df0f9e348ad8b993c763c95cf886194` | 8X8D3 block 102 tile 46 | map 0, square (14,7) facing east, column 10 row 7 | `slums-worn-courtyard-491c0e9a5a1f.png` (area 0, 7, 20) |
| `tile:8:4e24210255ed185eb54a70dc98aae7c1beeeb78e5107d1d01b5a931dcae9a8ae` | 8X8D3 block 102 tile 59 | map 0, square (15,8) facing south, column 10 row 4 | `slums-worn-courtyard-4e24210255ed.png` (area 0, 7, 20) |
| `tile:8:582935262251c3c3b53ec076d372c7bebfc34f9076968d8314e319ea8cca75bd` | 8X8D3 block 102 tile 18 | map 0, square (9,7) facing east, column 7 row 5 | `valjevo-merchant-west-terrain-582935262251.png` (area 0, 7) |
| `tile:8:5b786e63e19e9e670c1f1c5e88c35e2a13f2d0706d213c1aae0f2473145467ca` | 8X8D3 block 102 tile 7 | map 0, square (10,7) facing south, column 2 row 5 | `valjevo-lower-trim-5b786e63e19e.png` (area 0, 5, 7, 20) |
| `tile:8:5d6cc31ad8f8909dbfb51faf0fb70a9731367b107ace2c2761b9eb85951cc9ee` | 8X8D3 block 102 tile 36 | map 0, square (0,0) facing east, column 8 row 5 | `new-phlan-street-paving-joins-0-5d6cc31ad8f8.png` (area 0, 7, 20) |
| `tile:8:624c54394650999904d165e8083586d2c5d9dea1cfb089dcbb22e946cbbf6f37` | 8X8D3 block 102 tile 58 | map 0, square (13,8) facing east, column 9 row 3 | `slums-shop-frontage-terrain-624c54394650.png` (area 0, 7, 20) |
| `tile:8:6350a67cee5ed480bf0c6c1c98180dff777b31313ae09d346fa708c132025c0a` | 8X8D3 block 102 tile 60 | map 0, square (13,6) facing east, column 10 row 4 | `new-phlan-south-market-terrain-0-6350a67cee5e.png` (area 0) |
| `tile:8:74a379270d22aa664ac146ea1c2a2d893fdc08a1971fd1a49b8ddab1632a6788` | 8X8D3 block 102 tile 68 | map 0, square (13,6) facing south, column 1 row 6 | `new-phlan-building-paving-joins-0-74a379270d22.png` (area 0, 7) |
| `tile:8:76cac3df22ca0d41b487785b4d4d96f57f49be237438fa17e2e8813b0e536b56` | 8X8D3 block 102 tile 49 over sky colour 12 | map 0, square (1,1) facing east, column 8 row 2 | `new-phlan-north-avenue-terrain-76cac3df22ca.png` (area 0) |
| `tile:8:78d49be0ec8d85548a56d9b83e8384b76643e1d87889ea01c72df92930638ba6` | 8X8D3 block 102 tile 56 | map 0, square (13,8) facing east, column 9 row 4 | `slums-shop-frontage-terrain-78d49be0ec8d.png` (area 0, 7, 20) |
| `tile:8:7fa58d10584ec9c662b69570d9e0b6e0b3b1ad3eecfb3a259959f7fc136b792c` | 8X8D3 block 102 tile 42 | map 0, square (11,6) facing west, column 0 row 7 | `valjevo-lower-trim-7fa58d10584e.png` (area 0, 5) |
| `tile:8:804ed836f1ee59cdf32cc2c761738edb955337d1de0a5b1094116703ea7a2f93` | 8X8D3 block 102 tile 33 over sky colour 12 | map 0, square (1,1) facing north, column 0 row 0 | `new-phlan-north-avenue-terrain-804ed836f1ee.png` (area 0) |
| `tile:8:819bbf4da7d50ea93fca2fc26d008607ba5e0526948870150042383e992d7c8c` | 8X8D3 block 102 tile 9 | map 0, square (10,7) facing east, column 10 row 6 | `new-phlan-south-market-terrain-0-819bbf4da7d5.png` (area 0) |
| `tile:8:864e1c16f1f75e9bddb2a42fa78b1de7fb6124018e7418353073cfbd73c34aab` | 8X8D3 block 102 tile 50 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (12,6) facing west, column 1 row 5 | `new-phlan-harbor-paving-joins-0-864e1c16f1f7.png` (area 0) |
| `tile:8:89a02b4a8a3398bae28de863ab4ada7f7326b2e1c12a038f763578c1b02dd484` | 8X8D3 block 102 tile 34 | map 0, square (8,7) facing east, column 6 row 5 | `new-phlan-south-market-terrain-0-89a02b4a8a33.png` (area 0) |
| `tile:8:8a2485a2d40e912565d5459b113149d70ba66f6b94e463c6967af3caed303cdd` | 8X8D3 block 102 tile 35 | map 0, square (0,0) facing east, column 8 row 6 | `new-phlan-street-paving-joins-0-8a2485a2d40e.png` (area 0, 7, 20) |
| `tile:8:8d3592ae6802ffa7f7f7ac5df9362eb4f08b56ae06b8be5a12827cb8bbb6d7b9` | 8X8D3 block 102 tile 45 | map 0, square (0,0) facing east, column 3 row 6 |  |
| `tile:8:901342053079a4679add86d120a4add26a3058e08fb05eb433ee4f7a3927f4a2` | 8X8D3 block 102 tile 50 over 8X8D3 block 102 tile 30 | map 0, square (13,12) facing south, column 1 row 5 |  |
| `tile:8:97b40cd88297680a69a47a9f4a38c9abc2eeea77bd894d37ce767387168bd6fe` | 8X8D3 block 102 tile 53 | map 0, square (13,8) facing west, column 1 row 4 | `slums-trade-row-terrain-97b40cd88297.png` (area 0, 7, 20) |
| `tile:8:9ef13c4eabb84ad92b719a14aa51fbed3640611bb404b4ad2d58eebbd441af4a` | 8X8D3 block 102 tile 40 | map 0, square (0,0) facing east, column 7 row 6 | `new-phlan-street-paving-joins-0-9ef13c4eabb8.png` (area 0, 7, 20) |
| `tile:8:a0c0c9c245686e8bfba08abd377e3a48184c276695b008174f605d7a2f83995e` | 8X8D3 block 102 tile 21 | map 0, square (11,7) facing west, column 2 row 5 | `valjevo-lower-trim-a0c0c9c24568.png` (area 0, 5, 7, 20) |
| `tile:8:a2c41c4f0c4fa31620dac8ca4d42c5425fdd1ba3f700cc05c8471549a309d990` | 8X8D3 block 102 tile 63 | map 0, square (10,9) facing east, column 8 row 4 | `new-phlan-south-market-terrain-0-a2c41c4f0c4f.png` (area 0) |
| `tile:8:ad4007119c61bf7d6666c19092a0860486034153aa08a403fd206f9cd1940357` | 8X8D3 block 102 tile 15 | map 0, square (0,0) facing west, column 9 row 7 | `valjevo-merchant-west-terrain-ad4007119c61.png` (area 0, 7) |
| `tile:8:b17f6d862c65feca624f42f7f243b82e3062650c47a37e49f46e44d660a8566a` | 8X8D3 block 102 tile 48 | map 0, square (0,0) facing east, column 2 row 6 |  |
| `tile:8:b8645fd4952e35317fa061a3be9a84e98b48141ba4090c3c1fa13f323d8720d5` | 8X8D3 block 102 tile 1 | map 0, square (13,8) facing west, column 0 row 6 | `slums-trade-row-terrain-b8645fd4952e.png` (area 0, 7, 20) |
| `tile:8:bff4138f16da7e78e6c57d9e50fd19f21d6345bd6e54f319107767eaab2d78d5` | 8X8D3 block 102 tile 51 | map 0, square (12,5) facing south, column 9 row 5 | `new-phlan-harbor-paving-joins-0-bff4138f16da.png` (area 0) |
| `tile:8:c5e2f7ff8d6b146f5520b9e77b107cfc1d8403f75c10befcf30bb317944e2303` | 8X8D3 block 102 tile 61 | map 0, square (14,7) facing south, column 2 row 4 | `valjevo-merchant-branch-terrain-c5e2f7ff8d6b.png` (area 0, 7) |
| `tile:8:c9fef07a3a27e1df3aa7274c13835fc6346adacf4e92322f51f648ff0c88809b` | 8X8D3 block 102 tile 37 | map 0, square (0,0) facing east, column 7 row 5 | `new-phlan-street-paving-joins-0-c9fef07a3a27.png` (area 0, 7, 20) |
| `tile:8:cd0c178e86616351240aa2ee992e50a4998ce99d0a7295965dc3a5de8481c2c5` | 8X8D3 block 102 tile 67 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (10,9) facing east, column 6 row 5 | `valjevo-merchant-branch-terrain-cd0c178e8661.png` (area 7) |
| `tile:8:ce13abf3874bf1742295c9181afd3559b8263f4ae3d25731c2214fd647da2110` | 8X8D3 block 102 tile 41 | map 0, square (3,0) facing west, column 4 row 5 | `orc-door-4fd647da2110.png` (area 0, 7, 20) |
| `tile:8:ceaa1c6a928af7e169014854674189c9cdbdc41645ce50b1a41756218050daf6` | 8X8D3 block 102 tile 43 over the ground colour 6 | map 0, square (9,7) facing east, column 8 row 8 | `valjevo-terra-cotta-floor-ceaa1c6a928a.png` (area 0, 7) |
| `tile:8:ddf169cd0d8e5a9b7d91c469c73cfb6e6fdc47a98898e2205291ccbbb40a267f` | 8X8D3 block 102 tile 13 | map 0, square (10,7) facing east, column 9 row 6 | `new-phlan-south-market-terrain-0-ddf169cd0d8e.png` (area 0) |
| `tile:8:e1e25d740d96dc559780490d178cccf8720a7224ec2336badb59664c9c44aef2` | 8X8D3 block 102 tile 55 | map 0, square (13,8) facing west, column 1 row 3 | `slums-trade-row-terrain-e1e25d740d96.png` (area 0, 7, 20) |
| `tile:8:e3d609d69fc12018b9f7d110ea30eccc6d91ee967db698226ce57a499e471dd1` | 8X8D3 block 102 tile 54 | map 0, square (13,8) facing west, column 0 row 3 | `slums-trade-row-terrain-e3d609d69fc1.png` (area 0, 7, 20) |
| `tile:8:e6c54d795264af5e30cea8c8db38610f1305aa1395cf05b3c96cd7496f272900` | 8X8D3 block 102 tile 22 | map 0, square (13,7) facing south, column 0 row 6 | `slums-trade-row-terrain-e6c54d795264.png` (area 0, 7, 20) |
| `tile:8:e9660b0895d8aa142fec4c3ddb0f36b80f500aae4c3394f6680314fcaf79ce8c` | 8X8D3 block 102 tile 12 | map 0, square (9,7) facing east, column 7 row 6 | `new-phlan-south-market-terrain-0-e9660b0895d8.png` (area 0) |
| `tile:8:f18965943be25bd3f32240928a4a8bec8ee34b07f230cb1069cac20279caea4a` | 8X8D3 block 102 tile 23 | map 0, square (11,7) facing west, column 2 row 7 | `valjevo-lower-trim-f18965943be2.png` (area 0, 5, 7, 20) |
| `tile:8:fbcbe0dd001b4c1a5fb04f913c956be88ece3e87439fb1b050904da2bb1cf1ec` | 8X8D3 block 102 tile 20 | map 0, square (13,8) facing west, column 0 row 7 | `slums-trade-row-terrain-fbcbe0dd001b.png` (area 0, 7, 20) |
| `tile:8:fec9ae7f67a2d06652571b4104ee754e23f5596dbbae3bd0fa573995cdc2affb` | 8X8D3 block 102 tile 24 | map 0, square (13,8) facing west, column 0 row 4 | `slums-trade-row-terrain-fec9ae7f67a2.png` (area 0, 7, 20) |

#### tile set 8X8D3 block 103 (56)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:01af9b25e39aaeea7fb9f20f5f35af970c3507db161604599c9dd2546acbe6d0` | 8X8D3 block 103 tile 46 | map 0, square (5,1) facing south, column 2 row 6 | `new-phlan-building-exits-terrain-01af9b25e39a.png` (area 0) |
| `tile:8:06ab0ea758cbd6161799235b2b0d7e4521172faf22e35bf4119b31f0f52815f8` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 32 | map 0, square (14,11) facing west, column 3 row 5 |  |
| `tile:8:0d4b58782f4ca26533d6f17c315a5a856b1194a4cfc4dd92e4fa02d3ba67bf31` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (12,3) facing north, column 7 row 5 | `new-phlan-harbor-paving-joins-0-0d4b58782f4c.png` (area 0) |
| `tile:8:0da28796f3f66a72e2645e54a1f2897c80134436264ad00d76b1c07aa990cd37` | 8X8D3 block 103 tile 37 | map 0, square (5,1) facing south, column 1 row 8 | `new-phlan-civic-terrain-0da28796f3f6.png` (area 0, 11) |
| `tile:8:1a83f260002396d35ecdecff75b4bdfb9225a0f1e09a1cbe43a89760a0df887a` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 3 | map 0, square (12,11) facing east, column 8 row 5 |  |
| `tile:8:243765cb742c7f8baa3c055be6cbba8c698816a73037869e4b304f63cea7bd01` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 37 | map 0, square (13,3) facing west, column 10 row 5 |  |
| `tile:8:2f163d7206ea4e6a2989a021b7bd568c838c61fdf825b0a95ad24462e87f1b84` | 8X8D3 block 103 tile 14 | map 0, square (3,3) facing east, column 10 row 6 | `new-phlan-civic-terrain-2f163d7206ea.png` (area 0) |
| `tile:8:30f3bb975c3bf219afc9b2d64fc0e35835e7c401da3ad597bf5af8d9a439237d` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 30 | map 0, square (13,5) facing south, column 1 row 5 |  |
| `tile:8:39ec23f0982f82d51a199d2e205583ec5183e3f4f657da903eb6426c8777ed81` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 59 | map 0, square (13,3) facing north, column 4 row 5 |  |
| `tile:8:451efcf97fe4cb8ea437dd0fba90a08e095423c51c7c23c69dd2f48be9fcead5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 21 | map 0, square (13,3) facing west, column 0 row 5 |  |
| `tile:8:454c08486f123540ea56b2fed133366cbc56bff3f4b494cd4d08f710aafced94` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 47 | map 0, square (13,3) facing north, column 2 row 5 |  |
| `tile:8:4803f5dc3182db9989861f38067bb331053bbfb52c7799bb976bd19144042bde` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 51 | map 0, square (12,12) facing east, column 9 row 5 |  |
| `tile:8:5e6ca21cd26fb9dc2194d475c5ba58a893a144c307796462e5ba278a3ed9c93c` | 8X8D3 block 103 tile 52 over sky colour 11 | map 0, square (4,1) facing south, column 0 row 3 | `new-phlan-building-paving-joins-0-5e6ca21cd26f.png` (area 0) |
| `tile:8:6095180558e9b73e9710a63a44cd88c6daf47a09c33828e19452d1b7ea39d0a5` | 8X8D3 block 103 tile 58 | map 0, square (14,7) facing south, column 2 row 6 | `new-phlan-south-market-terrain-0-6095180558e9.png` (area 0) |
| `tile:8:646a996d9a877bf5fe36750fd9b9f368be1708dbcb48727b977d49f3e8eee2af` | 8X8D3 block 103 tile 9 | map 0, square (2,2) facing east, column 9 row 5 | `mendor-library-terrain-646a996d9a87.png` (area 0, 15) |
| `tile:8:6ad37cf35c202965922d7096419fef61f87a49b9b7afc8d521913f7f32978264` | 8X8D3 block 103 tile 63 | map 0, square (4,1) facing south, column 0 row 7 | `new-phlan-building-paving-joins-0-6ad37cf35c20.png` (area 0) |
| `tile:8:6eb0229fba37066c933fd301ebdf2d3f3f95c0aa02edc13b9efcec153f936da1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 38 | map 0, square (6,14) facing west, column 0 row 5 |  |
| `tile:8:6ffbe31ffb6e357e7b5bc90c837a9e81d95b620e6c5d258167ece8994b0cb2ab` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 3 | map 0, square (15,11) facing east, column 6 row 5 |  |
| `tile:8:719b5967a953045d0d20abcf9452381308bb1fface4a6baeb52d8b74ecf29040` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 5 | map 0, square (14,5) facing west, column 8 row 5 |  |
| `tile:8:750047fda51e805e93727318ef77fa7a620e6edeb7a057b138bc80985275b9c7` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 101 tile 21 | map 0, square (14,3) facing south, column 1 row 5 |  |
| `tile:8:795899f6cf242fdcf69f3d4fe0e776713195ec44bc13eb38d2043a9ecb87dfd4` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 39 | map 0, square (3,14) facing east, column 10 row 5 |  |
| `tile:8:79614e8063fe952222ed56df183e9e0623b3995656e248d0c2a01d05284ab9d6` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 32 | map 0, square (14,13) facing west, column 9 row 5 |  |
| `tile:8:7c4c73abf8f8be43d7999d9caf01d84a00760d26a26251f8632c43ece6879792` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 2 | map 0, square (15,11) facing east, column 8 row 5 |  |
| `tile:8:7f61c92327391a6bca5b0a528d2d032e6840ad63c3910f057a5486cdec840afa` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 5 | map 0, square (15,5) facing south, column 4 row 5 |  |
| `tile:8:811ae3a349c441d47448e1f94f7d2d9f7d9611f40e3177c2d53c418cac59be77` | 8X8D3 block 103 tile 15 | map 0, square (3,0) facing east, column 7 row 5 | `new-phlan-training-paving-0-811ae3a349c4.png` (area 0) |
| `tile:8:8912e73364ab5cc50ba0bce12eed2b990830fa4034cd0a69b34c204b99e1104e` | 8X8D3 block 103 tile 47 | map 0, square (4,1) facing south, column 0 row 6 | `new-phlan-building-exits-terrain-8912e73364ab.png` (area 0) |
| `tile:8:89396b758064cb35796020a5347af3a0f5aa2b40a2a5293e8ae315ba0c1bc7e3` | 8X8D3 block 103 tile 53 over sky colour 11 | map 0, square (5,1) facing north, column 10 row 0 | `new-phlan-street-paving-joins-0-89396b758064.png` (area 0) |
| `tile:8:8a7502a683b5ca79bfab71960c48f6abd3e0a5ea79e62fc5baa85e4f755b4e38` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 47 | map 0, square (15,4) facing south, column 2 row 5 |  |
| `tile:8:9859de0bc085d85d77c94427a28ac253d9dc5c2cb9f8774de7282aaf58a88512` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 21 | map 0, square (14,2) facing south, column 1 row 5 |  |
| `tile:8:99de9f9b4514c2decbc4de130b2681b346a3c51f9795c515e4bcedc012b14e2b` | 8X8D3 block 103 tile 41 over 8X8D3 block 101 tile 68 | map 0, square (12,4) facing north, column 6 row 5 |  |
| `tile:8:9d678c0fec7e982dea23320ba77532401b0493422a9dc04a2bfa2bebd8c50c42` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 25 | map 0, square (14,3) facing west, column 10 row 5 |  |
| `tile:8:9dca57c2c800009211f6af8acd50aac8d40878ddadc46be8517ef0f3d0ffe98e` | 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 3 | map 0, square (5,14) facing west, column 4 row 5 | `new-phlan-market-turn-terrain-9dca57c2c800.png` (area 0) |
| `tile:8:a283214480d9101b4208e2c3c73cd3055746bd9ea8611da11944b013875ee752` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 68 | map 0, square (15,4) facing east, column 9 row 5 |  |
| `tile:8:aff5e903c90440b24b67d198a77f832e074475934f66bdb265cc26b17c9a6077` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 35 | map 0, square (15,3) facing south, column 0 row 5 |  |
| `tile:8:b386a3574a88e3d97c8dbf8af3f4bba1629b4647b8f37fe12ea834d90fcee0e8` | 8X8D3 block 103 tile 10 | map 0, square (2,2) facing south, column 1 row 6 | `new-phlan-training-civic-terrain-0-b386a3574a88.png` (area 0) |
| `tile:8:b91c1a61b1b674049f1da4fdf724a912001190410004064840dea1621c0c3e16` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 |  |
| `tile:8:c32c234a7bbf0eaa70dc96a5319e6b2380a6410eef8894cba00a879b33355618` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 3 | map 0, square (14,11) facing east, column 6 row 5 |  |
| `tile:8:c3f6c9dcaf3cbd15279435fed80c311d3039001afd1e0684d444730419443ef5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 20 | map 0, square (15,11) facing south, column 0 row 5 |  |
| `tile:8:c9eacb92173da7fb7eb5191db83856abbcb0f04e6685eeb42c6606bc1cb85525` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 68 | map 0, square (14,2) facing south, column 0 row 5 |  |
| `tile:8:d07214e211bfcb95740dd2e555351451cfb989737372d71b9e72835a8b5128bf` | 8X8D3 block 103 tile 26 | map 0, square (5,1) facing south, column 0 row 8 | `new-phlan-civic-terrain-d07214e211bf.png` (area 0, 11) |
| `tile:8:d0da7ad4498cfdbaf905732257665c26ccefcad1c8f80bf67ab4abc30a869795` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 5 | map 0, square (14,5) facing south, column 2 row 5 |  |
| `tile:8:d26c869894444bd21b6653fccc8965779c2abd71678b6dc7df589317ab2dee30` | 8X8D3 block 103 tile 11 | map 0, square (2,2) facing east, column 9 row 6 | `new-phlan-street-paving-joins-0-d26c86989444.png` (area 0) |
| `tile:8:d31e129c0c2e50debad0b3da0976aa310a242279dab9b105dfa862cbcf7c75a1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 12 | map 0, square (15,3) facing west, column 10 row 5 |  |
| `tile:8:d356ab3a068af8d71f953dc85699005053abc5012267e706ef6280b202da0cc8` | 8X8D3 block 103 tile 52 over sky colour 12 | map 0, square (6,1) facing north, column 0 row 0 | `new-phlan-training-hall-terrain-d356ab3a068a.png` (area 0, 11) |
| `tile:8:d4bfebd9881c703ec9c8702d40af2b04c1a0c8a329673f23bef7bc145b267a73` | 8X8D3 block 103 tile 59 | map 0, square (9,7) facing east, column 8 row 6 | `new-phlan-south-market-terrain-0-d4bfebd9881c.png` (area 0) |
| `tile:8:d5d688860efe2e51bcfe34f1c8df81638516bb24203b3d3c36bc23079bde91ce` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 64 | map 0, square (14,9) facing east, column 6 row 5 |  |
| `tile:8:dc911cb26109fedd8420ff441590f02ca7e728df8fa5068ea8aad3bd39309f2e` | 8X8D3 block 103 tile 31 over sky colour 11 | map 0, square (2,2) facing east, column 9 row 4 | `new-phlan-civic-terrain-dc911cb26109.png` (area 0) |
| `tile:8:e19067bee3819b8d873718c2a7a1a61cebdd3ffcf3d786860b77148e6863abfc` | 8X8D3 block 103 tile 8 | map 0, square (3,3) facing east, column 10 row 7 | `new-phlan-civic-terrain-e19067bee381.png` (area 0) |
| `tile:8:e26b92fadba50b8d889a6fd196a894e7522d35272a8daa59dae7752e34b12f1c` | 8X8D3 block 103 tile 4 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (2,0) facing west, column 6 row 5 | `new-phlan-building-exits-terrain-e26b92fadba5.png` (area 0) |
| `tile:8:e761e6a0facf5cbda34a735d1b8599c90404f5a34979393df0120e4f06fc1191` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 35 | map 0, square (14,4) facing south, column 0 row 5 |  |
| `tile:8:eb9e232b185d36eb5f04234d2860e02ab68b2f7adf09bb63bab6f1ee640cc5d9` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 46 | map 0, square (15,5) facing north, column 10 row 5 |  |
| `tile:8:f396f4ed12b9fd4e0bd9427532c1789a2c7ae498a49246236bcd2f065e323cda` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 3 | map 0, square (12,14) facing east, column 6 row 5 |  |
| `tile:8:f6613a058106db88c64183aa031f0c43f9f33676f27b6bf26e5600c0126ae92d` | 8X8D3 block 103 tile 68 | map 0, square (6,0) facing south, column 6 row 6 | `new-phlan-training-paving-0-f6613a058106.png` (area 0) |
| `tile:8:f694be99114d4ada4bbf639d34cb6229464da9146cd4f986fde0c9354e68924d` | 8X8D3 block 103 tile 66 | map 0, square (5,1) facing south, column 2 row 7 | `new-phlan-building-paving-joins-0-f694be99114d.png` (area 0) |
| `tile:8:fc0e4e223ec8429fdf7048813be9cfacb0c4c7db3808aa2ad81a246c22147ac0` | 8X8D3 block 103 tile 67 | map 0, square (4,1) facing east, column 5 row 6 | `new-phlan-civic-terrain-fc0e4e223ec8.png` (area 0) |
| `tile:8:fff82287ace63820723d4cf9e1f8d238622b3c38a20e044d150ba9f6821b7a1d` | 8X8D3 block 103 tile 36 | map 0, square (5,1) facing south, column 0 row 9 | `new-phlan-civic-terrain-fff82287ace6.png` (area 0, 11) |

### Area 9: Stojanow Gate (33)

Map 9; WALLDEF2 block 1 (tiles 8X8D2 block 1), block 9 (tiles 8X8D2 block 9), block 23 (tiles 8X8D2 block 23).

#### tile set 8X8D2 block 1 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D2 block 1 tile 12 | map 9, square (4,1) facing north, column 4 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:9:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D2 block 1 tile 8 | map 9, square (4,1) facing north, column 5 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:9:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D2 block 1 tile 9 | map 9, square (4,1) facing north, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:9:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D2 block 1 tile 11 | map 9, square (4,1) facing north, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:9:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D2 block 1 tile 10 | map 9, square (4,1) facing north, column 6 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:9:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D2 block 1 tile 7 | map 9, square (4,1) facing north, column 4 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 15, 18, 29, 31) |

#### tile set 8X8D2 block 9 (9)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D2 block 9 tile 47 | map 9, square (7,6) facing west, column 1 row 3 | `sokal-west-lintel-corner.png` (area 21) |
| `tile:9:20ce93dc46276e688404749b96fc9868d9f1bd87f6545b3c1ebc86922d8f010f` | 8X8D2 block 9 tile 56 over 8X8D2 block 9 tile 3 | map 9, square (7,6) facing east, column 8 row 4 |  |
| `tile:9:215488a7ca18e31d90dd8bc2d00c5f3002c2801a983ba96bbb0ceb9b2b3bd498` | 8X8D2 block 9 tile 58 | map 9, square (8,6) facing west, column 2 row 8 | `zhentil-northern-lane-terrain-215488a7ca18.png` (area 1, 5, 7, 20, 21, 28) |
| `tile:9:332ea602752f60f17beb82a3d53ab5e110ab4ad1eac48920858245111bb452bd` | 8X8D2 block 9 tile 49 over sky colour 0 | map 9, square (8,6) facing west, column 0 row 3 |  |
| `tile:9:5fb9e67d0ccf7495bc8ed31bf8960390be987a6d6c92cd882e47d72a5d4cea53` | 8X8D2 block 9 tile 49 over 8X8D1 block 203 tile 12 | map 9, square (7,6) facing west, column 0 row 3 |  |
| `tile:9:733c9571b8c777f9348c6770ac8de44f2880612358a5ed49f75533f15ffa4afa` | 8X8D2 block 9 tile 49 over sky colour 15 | map 9, square (8,6) facing west, column 0 row 3 |  |
| `tile:9:74dac469ed7ac305b97a7260d3819dc04341203c78d23b7dcdaae93d04612c4e` | 8X8D2 block 9 tile 56 over sky colour 15 | map 9, square (7,6) facing east, column 10 row 3 |  |
| `tile:9:a5d4129237b2f11c1fbe432d281f82df864337f2d654c4e32cd72c83ee3233cf` | 8X8D2 block 9 tile 45 over 8X8D2 block 9 tile 3 | map 9, square (8,6) facing west, column 2 row 4 |  |
| `tile:9:e5aa3be4526ec0e96b089822c9a6290a6b74a423c00b6973692f5d25dd767c29` | 8X8D2 block 9 tile 56 over sky colour 0 | map 9, square (7,6) facing east, column 10 row 3 |  |

#### tile set 8X8D2 block 23 (18)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:9:0d395f35c423a8c381d9123b8d10216a45d625127dcaf72cc887c45ef51ef430` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 9, square (15,0) facing south, column 4 row 5 |  |
| `tile:9:1988ac0ebd764a91570c1ee15fbffc06d65104fe257f4f5faf283cdb58e249e3` | 8X8D2 block 23 tile 29 over 8X8D2 block 23 tile 29 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 9, square (13,0) facing east, column 5 row 5 |  |
| `tile:9:1e7a6c09a5e78304b5e46f4064f3e7de19c4437e10189e92324c83e29f832c6b` | 8X8D2 block 23 tile 5 | map 9, square (14,0) facing south, column 1 row 6 | `nomad-rail-sand-edge-1e7a6c09a5e7.png` (area 17) |
| `tile:9:4398ba02b7f56393f1b451622f940fdf7ae68a382006fa7974067695f9d0bd5e` | 8X8D2 block 23 tile 46 over 8X8D1 block 203 tile 12 | map 9, square (15,2) facing north, column 6 row 5 |  |
| `tile:9:448ee9241a19b518a05c6411c2d9fcc9b45a76c73a481c33149b3262e34beb2f` | 8X8D2 block 23 tile 30 | map 9, square (15,0) facing north, column 9 row 7 | `mendor-library-waterfront-terrain-448ee9241a19.png` (area 15, 17) |
| `tile:9:4723cfae9987040d6fe598a64534c4214ff38409a832502e150f7f2cdb870c2a` | 8X8D2 block 23 tile 11 over 8X8D2 block 23 tile 11 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 9, square (14,0) facing east, column 5 row 5 |  |
| `tile:9:5525560a437d196e997885cb4f9811df60c0b8ddeab1c17c783987b967da111c` | 8X8D2 block 23 tile 9 | map 9, square (15,2) facing north, column 6 row 6 | `mendor-library-waterfront-terrain-5525560a437d.png` (area 15, 17) |
| `tile:9:8d4c8c5de6593226111fc3e7a8f660385a113e6f5371688c4c287030a4bc9397` | 8X8D2 block 23 tile 46 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 9, square (14,3) facing north, column 9 row 5 | `mendor-library-waterfront-terrain-8d4c8c5de659.png` (area 15, 17) |
| `tile:9:9c5af82ee1c4c534b6e42b65d8bd38a1ea6fce5ef4c50bb72811d725ed30e72a` | 8X8D2 block 23 tile 49 | map 9, square (15,0) facing north, column 10 row 7 | `mendor-library-waterfront-terrain-9c5af82ee1c4.png` (area 15, 17) |
| `tile:9:a5581d8d3a086e81e6ad023e24621cbd13a5c8a4d6555b66f973f0fee80612e9` | 8X8D2 block 23 tile 33 | map 9, square (15,0) facing north, column 10 row 8 | `mendor-library-waterfront-terrain-a5581d8d3a08.png` (area 15, 17) |
| `tile:9:c00b94e1050dfe1b0456b4af230cb62845953b67ad93c6811e3292411b174633` | 8X8D2 block 23 tile 11 over 8X8D1 block 203 tile 39 | map 9, square (15,0) facing north, column 9 row 5 | `mendor-library-waterfront-terrain-c00b94e1050d.png` (area 15) |
| `tile:9:d69d4cd121365a3bacf96732bfb8730831031538ace2a09b76fd8b6a3a9b0efa` | 8X8D2 block 23 tile 47 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 9, square (15,0) facing south, column 4 row 5 | `nomad-rail-horizon-d69d4cd12136.png` (area 17) |
| `tile:9:e321b4003995268270af653b62cb7db3bd107e7551a0460c95e0fbc2f8a7a7ed` | 8X8D2 block 23 tile 11 over 8X8D2 block 23 tile 11 over 8X8D2 block 9 tile 10 | map 9, square (14,6) facing east, column 6 row 5 |  |
| `tile:9:ebe9491fc52930a8100617e220f358bda985be1a994081df91cc78314a4ad9a2` | 8X8D2 block 23 tile 47 over 8X8D1 block 203 tile 12 | map 9, square (14,0) facing south, column 1 row 5 |  |
| `tile:9:ed42f930fb109af3049c1d96ecba5b1779dc0f5e62b3b0da1b0067f0bf382103` | 8X8D2 block 23 tile 46 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 9, square (14,3) facing north, column 9 row 5 |  |
| `tile:9:fc3b847b18569bc05e7fb4fd85e694ce1c0a1e4ef8f63d90a5808d0834b220ad` | 8X8D2 block 23 tile 11 over 8X8D2 block 9 tile 12 | map 9, square (0,5) facing west, column 1 row 5 |  |
| `tile:9:fed653b0ff0e32ccdaa436eeb765c6e973f9ade944cc7dba817de9ac9abca22b` | 8X8D2 block 23 tile 27 | map 9, square (15,0) facing north, column 9 row 9 | `mendor-library-waterfront-terrain-fed653b0ff0e.png` (area 15, 17) |
| `tile:9:ff6a32fbbb4c5d2972bfd9d1a8d7dcefc5def433b2ed312ea71dae297a9665eb` | 8X8D2 block 23 tile 46 over 8X8D2 block 9 tile 15 | map 9, square (0,4) facing south, column 6 row 5 |  |

### Area 10: Valhingen Graveyard (471)

Map 10; WALLDEF4 block 21 (tiles 8X8D4 block 211), block 21 set 2 (tiles 8X8D4 block 212), block 20 (tiles 8X8D4 block 20).

#### shared tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:b3b5ff78ad134ea5fe929d65c6f6a8eca4e69b939a3365c9e38fe3093301e676` | 8X8D1 block 203 tile 16 over sky colour 14 | map 10, square (6,0) facing west, column 10 row 0 |  |
| `tile:10:c05953c7caa5ad5c28ab9144ac53e4ea1529c35befb6e7a39846a84ed02f30a0` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 8 | map 10, square (0,4) facing west, column 4 row 7 |  |
| `tile:10:d1ee5e88b6409560eab88fbe74f8f5e098d9f2798a003ecb8d95a655f0db1e98` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 8 | map 10, square (0,4) facing west, column 6 row 7 |  |

#### tile set 8X8D4 block 20 (78)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:0178dc6543e744ad5c89e9df4071b5853e959e7df80dc23a0712356e50881885` | 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,0) facing north, column 0 row 2 |  |
| `tile:10:018c8a6ebd6f0ec36e95ddb15f351bcd9608ba3c27d9f35599267c40bee0b19a` | 8X8D4 block 20 tile 46 over 8X8D1 block 203 tile 38 | map 10, square (5,2) facing east, column 3 row 5 | `lizard-ruin-wet-joins-018c8a6ebd6f.png` (area 2, 16, 29) |
| `tile:10:078d287e5267a3319fd382b39259654cf57de9bc3ad56ada7fc22e3b71ae52a0` | 8X8D4 block 20 tile 60 over 8X8D4 block 20 tile 60 over sky colour 15 | map 10, square (6,6) facing west, column 5 row 3 |  |
| `tile:10:088c7b686b34b197fed003cb606b0449b5e679a86fbb6637c1abab3f6b33bdd2` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over 8X8D4 block 211 tile 8 over 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (6,0) facing east, column 5 row 4 |  |
| `tile:10:1079be7e886b2b8729cf162d42891e250867f343f157bbfd6d7f202f0f8656ca` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D4 block 212 tile 17 over sky colour 0 | map 10, square (5,0) facing east, column 4 row 4 |  |
| `tile:10:10c1b3aeb356a4bc6e9b4176e050356c67fb4166f7d8b80c08ad7b2f5b8e0f19` | 8X8D4 block 20 tile 31 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,0) facing north, column 10 row 2 |  |
| `tile:10:1187cea9ff208d9a8ff38a1ea0075207c2bec0c6e2caf64946b082831968ac19` | 8X8D4 block 20 tile 35 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,1) facing north, column 7 row 4 |  |
| `tile:10:14a922768f90471acfcfa30776edd5e70e5704bb79bf35e079f9ef921554beba` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (5,0) facing east, column 3 row 3 |  |
| `tile:10:1744c71b11c4d2b9b90fd69de0007e0f68854d24d2d7e25967ea8beb4e3328f3` | 8X8D4 block 20 tile 31 over sky colour 15 | map 10, square (5,6) facing north, column 0 row 3 |  |
| `tile:10:1746dc87fd235117d88ba2d74c060d7c356f4a39705c1bfa9821b529ef63ed5f` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over sky colour 14 | map 10, square (5,0) facing east, column 5 row 4 |  |
| `tile:10:1815f626686b8c75d731d6990cf85451927b9ae4399115373748812d44c1f3f8` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (5,0) facing east, column 7 row 3 |  |
| `tile:10:18d6e0f7aa07e92fd14d34085cc2653db3a15ec5647f7e19625d825c789a8b5b` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (7,0) facing south, column 7 row 4 |  |
| `tile:10:1a5b7f49a900a990d320c3b3dc884abcdc39804405906841c39d981e9494e58b` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 30 over sky colour 0 | map 10, square (6,2) facing east, column 0 row 3 | `kuto-inner-lane-terrain-1a5b7f49a900.png` (area 29) |
| `tile:10:1a6da4631b68f9486257449a164bba8394ba5f8f91ebb204eea6e6a75b453705` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 61 over sky colour 0 | map 10, square (13,2) facing north, column 2 row 3 | `kuto-inner-lane-terrain-1a6da4631b68.png` (area 29) |
| `tile:10:1da3a8d205297f7401e5437253c57ff67d5c52de107d7f88589877f745ad3f01` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 31 over sky colour 0 | map 10, square (5,0) facing east, column 10 row 3 | `kuto-north-rubble-terrain-1da3a8d20529.png` (area 29) |
| `tile:10:1db95b5bbcf127aab68e386ed66dbab07874697ee0775b001b9518b039b553fc` | 8X8D4 block 20 tile 31 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (5,14) facing west, column 0 row 3 |  |
| `tile:10:213de94b88676c7ce93255507fd61ff23b9f7c23ff87a4f79a151ebc4a040aff` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 10 over sky colour 14 | map 10, square (6,0) facing east, column 2 row 3 |  |
| `tile:10:23adeac73c0e5aed73ebb50a715fca8c5c6d5ca850c6c33166ca103da07f320d` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 212 tile 10 over sky colour 14 | map 10, square (15,0) facing south, column 2 row 3 |  |
| `tile:10:274de3eb360116c9d20c45b1a8ac611253490d5939494d5cc0c914b00428bcb0` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (5,0) facing east, column 3 row 3 | `kuto-north-rubble-terrain-274de3eb3601.png` (area 29) |
| `tile:10:2b698353e50059bee42af429c6556e5f8c8347109733a451e333efc4e06fd0c7` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 31 over sky colour 14 | map 10, square (5,1) facing east, column 7 row 3 |  |
| `tile:10:35592f53528f8a7912cd34dd4c582cd90df75181eac9f3f95f6ab69f7c9cab0a` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 12 over sky colour 14 | map 10, square (6,0) facing west, column 8 row 3 |  |
| `tile:10:373e888d8e3df1790033d1557264373ba3d7c55cfd3a61fb32fdd0b8283c85b4` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 61 over sky colour 14 | map 10, square (13,2) facing north, column 2 row 3 |  |
| `tile:10:37f21d6f8515f7514c15521461248ab62dc6eea5a941475c4461225bd7ea880c` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 12 over sky colour 0 | map 10, square (6,0) facing west, column 8 row 3 |  |
| `tile:10:3aa9499624671cf229e094b24a1cdfd1d32f5d228b6e91f0b87ec3d4b47a3469` | 8X8D4 block 20 tile 46 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,13) facing west, column 0 row 5 |  |
| `tile:10:3d89e04cbb1185af8239ab3ffa9c85f8a14dcd9f5cda8d7fde04dee8352cdafa` | 8X8D4 block 20 tile 46 over 8X8D1 block 203 tile 31 | map 10, square (6,14) facing west, column 3 row 5 |  |
| `tile:10:417c3fc15136fd32359f53dac39fd550e6f97961822a5121211be6a3fc173f77` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 61 over sky colour 14 | map 10, square (8,1) facing west, column 4 row 4 |  |
| `tile:10:440e062624b8db28889ae6fe1ae73fc52dbcf177cd488c76a636b1f91d356611` | 8X8D4 block 20 tile 47 over 8X8D4 block 212 tile 35 over the ground colour 8 | map 10, square (14,1) facing east, column 10 row 7 |  |
| `tile:10:4f9fa94909cdb66619c73cd1f95bfc127e7831c8841f5e5bf6461c8aa385b468` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 61 over sky colour 14 | map 10, square (6,2) facing north, column 2 row 3 |  |
| `tile:10:4ffe8a0eba7193b4e2f2fc7a976a332ef942d1ee4c5f4ebf7da4779ef9867877` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over 8X8D4 block 211 tile 8 over 8X8D4 block 211 tile 8 over sky colour 0 | map 10, square (6,0) facing east, column 5 row 4 |  |
| `tile:10:509696ebfdf647a51570a00f69be86a5cdd5ba4ea91cbb9909da13cff304bfc0` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D4 block 212 tile 17 over sky colour 14 | map 10, square (5,0) facing east, column 4 row 4 |  |
| `tile:10:5864c0f21eb0cb89c0231509982109a2d21529ee0ac85f90737423dd1109db00` | 8X8D4 block 20 tile 31 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (5,14) facing west, column 0 row 3 |  |
| `tile:10:5d03fe4a5856a42f5a71008648872763fa86d792b2e22ed20abf05ac2cdc56da` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over sky colour 14 | map 10, square (5,0) facing east, column 8 row 3 |  |
| `tile:10:62b7f3eab59c63eca703cd3b2600d9b3e27161e0b548dfe3a3b27bbb7d961bff` | 8X8D4 block 20 tile 32 over sky colour 15 | map 10, square (5,6) facing south, column 10 row 2 |  |
| `tile:10:6bbb40fe3e1c1b1ec28f43ece5fde034e6f479488101bb9251453729a11a89ad` | 8X8D4 block 20 tile 35 over 8X8D1 block 203 tile 28 | map 10, square (5,1) facing north, column 7 row 4 |  |
| `tile:10:6d5ef3ffc8914b3af66ae1e602c1f35e583604e00cfee9e22268bbbb4593d233` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 31 over sky colour 14 | map 10, square (5,0) facing east, column 10 row 3 |  |
| `tile:10:704d11582b17ce00bbd7d7e6bfbc2621b294031d21842a132eb26efa44425d0b` | 8X8D4 block 20 tile 35 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,12) facing south, column 8 row 5 |  |
| `tile:10:7290907925e94e2b25f681ee6aa6ee8534ecfe8b830119dcbcaaa35677daf682` | 8X8D4 block 20 tile 48 over 8X8D4 block 211 tile 35 over the ground colour 8 | map 10, square (8,6) facing east, column 0 row 7 |  |
| `tile:10:75925f470540c37d95e8423291dbf9b10a68911e3d73c8ff6855df999e91856e` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 30 over sky colour 0 | map 10, square (7,0) facing south, column 7 row 4 | `kuto-inner-lane-terrain-75925f470540.png` (area 29) |
| `tile:10:76c21367bdab1058f13dc9367ac4815d7a47a8256d5af35bc4002d823814a07c` | 8X8D4 block 20 tile 30 over 8X8D1 block 203 tile 12 | map 10, square (4,6) facing south, column 1 row 3 | `kuto-perimeter-lanes-terrain-76c21367bdab.png` (area 2, 29) |
| `tile:10:78ff3daa4f8b292b31b6a8a226d9d33f5b66eb05b31c7892b4e4a7727ccc5f38` | 8X8D4 block 20 tile 33 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,0) facing north, column 1 row 2 |  |
| `tile:10:7bae6ad4dc9f7458785b253f4ba7aa4e79b21ec83cf56b7cf08e1d80da7b639d` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 61 over sky colour 0 | map 10, square (8,1) facing west, column 4 row 4 |  |
| `tile:10:7f87f8e996c603167c7cbb910cee4a59cc587fa29cf45d93ab8209f8f33d3ba3` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over 8X8D4 block 212 tile 41 | map 10, square (15,1) facing south, column 5 row 4 |  |
| `tile:10:830508b07fdabc83ac68dfb816cf24c6d8ea046cdcb4d99fed350da031d16c86` | 8X8D4 block 20 tile 31 over 8X8D1 block 203 tile 28 | map 10, square (5,0) facing north, column 10 row 2 |  |
| `tile:10:847f4115442cedf85cdcd8c81418fe4883bc78d35668f870d2f2ecb75a6b445f` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D1 block 203 tile 16 over sky colour 14 | map 10, square (4,6) facing east, column 7 row 3 |  |
| `tile:10:8a13f7607ef498047fb51ed8383bf3e6323c74dd445dda8466bd66e0a09d8ccd` | 8X8D4 block 20 tile 46 over 8X8D4 block 20 tile 30 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,2) facing west, column 8 row 5 | `lizard-ruin-wet-joins-8a13f7607ef4.png` (area 2, 16, 29) |
| `tile:10:90c1cfcbca1486a998692168568266c297961c099a1b5db53ce997ae289cf809` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D1 block 203 tile 30 | map 10, square (5,0) facing east, column 2 row 3 |  |
| `tile:10:99fc740def3b2b973067bd6e136a6f6d7ceac977bb4ded1b4e353abbff0bb1c5` | 8X8D4 block 20 tile 61 over 8X8D4 block 20 tile 60 over sky colour 14 | map 10, square (5,0) facing south, column 2 row 3 |  |
| `tile:10:9decd19054ea3690f68a7f25db57277f7108cb8937a311bb4c761d86321ec9fc` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 16 over sky colour 0 | map 10, square (7,1) facing west, column 10 row 3 |  |
| `tile:10:9f8a0ba7db323d19e0850f8e3e8fd43991b6062b9ef213b4870ad5afada83c01` | 8X8D4 block 20 tile 35 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (6,1) facing north, column 7 row 4 |  |
| `tile:10:a29dd4a62e07e35916e16a4896d530bc9603e892adb83271c283b6b964f1618a` | 8X8D4 block 20 tile 48 over 8X8D4 block 212 tile 43 | map 10, square (8,5) facing east, column 9 row 7 |  |
| `tile:10:a2dd4fc70e4accbca16bbcfa6e8dedeb1f0cab76957a9ae4b320c8cb15e972f3` | 8X8D4 block 20 tile 44 over 8X8D4 block 20 tile 44 over 8X8D4 block 212 tile 8 over the ground colour 8 | map 10, square (13,0) facing west, column 7 row 7 |  |
| `tile:10:a3f70ca247507b6cdc6a2dd5ac03ee049bd242002e6c8cc8a9312618b086a709` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 33 over sky colour 14 | map 10, square (7,1) facing south, column 10 row 2 |  |
| `tile:10:a6425525f36c25b2edccf0c045476b56dc4eb36bc6323843755520582a65b885` | 8X8D4 block 20 tile 36 over 8X8D4 block 20 tile 36 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (2,6) facing east, column 5 row 5 | `kuto-podal-side-streets-kuto-terrain-a6425525f36c.png` (area 29) |
| `tile:10:aefbfc47739afb19daf09c630087ac39924890906c94aacc71e288f7b7b71ae6` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 10 over sky colour 0 | map 10, square (6,0) facing east, column 2 row 3 |  |
| `tile:10:ba9c2970c5959543fc075c55687ab0d06ddd102f568c923bdff4de424a2aba4d` | 8X8D4 block 20 tile 35 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (6,0) facing north, column 9 row 3 |  |
| `tile:10:bd35fe2ef8b33517d6b2ef770882d30051abd7e0576cfba16bd2ae85a9c4d2bd` | 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 16 over sky colour 14 | map 10, square (7,1) facing west, column 10 row 3 |  |
| `tile:10:bfbc33855cba2faea24c29edfefb289fa752b417cf1097a4a8f410bc4b01beed` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (6,2) facing east, column 0 row 3 |  |
| `tile:10:c4c1d430ecb4acbb66cd3778b676e06c7280be51bfefcd89b52b785777be7af0` | 8X8D4 block 20 tile 49 over 8X8D1 block 203 tile 19 over the ground colour 8 | map 10, square (9,5) facing south, column 10 row 7 | `lizard-bank-arch-terrain-c4c1d430ecb4.png` (area 16) |
| `tile:10:c4f355a6ab03ce8bc21785cb5e29e7919faa8720db1c07713bda020819373031` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 32 over 8X8D4 block 212 tile 48 | map 10, square (15,1) facing south, column 4 row 4 |  |
| `tile:10:c6156435d2567897f13621eeec4ba7092f96629ac3964b56ef2fdc0e8d7f478d` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D1 block 203 tile 30 | map 10, square (5,14) facing south, column 2 row 3 |  |
| `tile:10:c640a3fe1f7280b5d15409ee241744172f51540d6e178346ce192e17d1cc55af` | 8X8D4 block 20 tile 30 over sky colour 15 | map 10, square (5,6) facing north, column 1 row 3 |  |
| `tile:10:d3631847a73b93ffa44135a879be647328e2a7cac80893d1a5fc9ada9f6f5a57` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 35 over sky colour 15 | map 10, square (5,6) facing west, column 8 row 3 |  |
| `tile:10:d6868aec848dcf709ccecb74daf62df8e7882acc3867130466bb121d69236a93` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 212 tile 10 over sky colour 0 | map 10, square (15,0) facing south, column 2 row 3 |  |
| `tile:10:d77023de829b605418676e9e0a30075a88262a15881384b3ee1b4ad1d24c859b` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,0) facing west, column 7 row 3 |  |
| `tile:10:dc6406c9e7ae24b883ce8c24bd5cee4398824274e87aa26a0aba6e20812fed2b` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 61 over sky colour 0 | map 10, square (6,2) facing north, column 2 row 3 | `kuto-inner-lane-terrain-dc6406c9e7ae.png` (area 29) |
| `tile:10:de5402a67470bcc94cc3934cea15401b5efa483c15e5ca42f47353e878b3e277` | 8X8D4 block 20 tile 35 over 8X8D4 block 20 tile 32 over sky colour 14 | map 10, square (13,2) facing west, column 9 row 3 |  |
| `tile:10:debed1ba115e2f529829097f69bc22f99a5f677fc06a2ee4c4222d8bec84367c` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 30 over sky colour 0 | map 10, square (5,0) facing south, column 3 row 4 | `kuto-well-plaza-terrain-debed1ba115e.png` (area 29) |
| `tile:10:dedb7b194265002d2462a45cd8bcdf093d9935108a929b42143b2a132142a51b` | 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 31 over sky colour 0 | map 10, square (5,1) facing east, column 7 row 3 | `kuto-inner-lane-terrain-dedb7b194265.png` (area 29) |
| `tile:10:e04b87bf6e9e30bc3346ac3bfb55dcb9b267c88c1543e1b4e66f778b039ea2a9` | 8X8D4 block 20 tile 26 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (13,1) facing north, column 3 row 6 |  |
| `tile:10:e1458fa9f2a22e45053c269d7a08beb7e7f08e73fb39e1174a7e2ee2cf51c7e8` | 8X8D4 block 20 tile 60 over 8X8D4 block 20 tile 60 over sky colour 14 | map 10, square (6,0) facing south, column 5 row 3 |  |
| `tile:10:eb5afbdeb219be5d4a1620bb37d14ebe52a4e0398c791e3fed4499fc1ca573ce` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 33 over sky colour 0 | map 10, square (7,1) facing south, column 10 row 2 | `kuto-inner-lane-terrain-eb5afbdeb219.png` (area 29) |
| `tile:10:ec21f7d6a528b60c296f408ca27fd2fb1cd0e2b17bc99148e22bc866f28baa42` | 8X8D4 block 20 tile 31 over 8X8D4 block 20 tile 31 over sky colour 14 | map 10, square (5,0) facing east, column 6 row 3 |  |
| `tile:10:f0556c81c4b9dfb062f57d1e3628751995f979ecae06bf538542e6ac3837538b` | 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (5,0) facing south, column 3 row 4 |  |
| `tile:10:f4bacf1c567ac35c914d746791045602d36db57ec780106a14912ddb33ba51ef` | 8X8D4 block 20 tile 31 over 8X8D4 block 212 tile 1 | map 10, square (4,6) facing south, column 0 row 3 |  |
| `tile:10:f4e25574610b038ad703f772374a2ff4f6ad2e4b2c7abf7295b72e973778d11e` | 8X8D4 block 20 tile 47 over 8X8D4 block 212 tile 41 | map 10, square (8,5) facing east, column 10 row 7 |  |
| `tile:10:f62928cef75b959028988aeae8589c0e1ad0dba0d33e3e6be9436221a60d8618` | 8X8D4 block 20 tile 46 over 8X8D1 block 203 tile 28 | map 10, square (4,14) facing east, column 8 row 5 |  |
| `tile:10:fb34a9e180262a826979304780fb601db7d80871042784b6a37b3fbcb66bf468` | 8X8D4 block 20 tile 33 over sky colour 14 | map 10, square (5,0) facing south, column 1 row 2 |  |
| `tile:10:fb35235a22ec85f363bd786bfdd5b58c7760e9bde26df9e6be07dd7a4314c51f` | 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over sky colour 15 | map 10, square (5,6) facing west, column 3 row 2 |  |

#### tile set 8X8D4 block 211 (157)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:01f99565656a247d4974699bd05677fb27c24e0ea92cf38bc8c71643ef6a91ac` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 55 | map 10, square (1,2) facing south, column 9 row 5 |  |
| `tile:10:0395e2baab54d11becd2af2af5b7125606c2e44f1507893b45eee88788c7cca4` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D1 block 203 tile 31 | map 10, square (8,11) facing north, column 3 row 5 |  |
| `tile:10:0449b8cdad79f9c6c2eb2f01320c756c598137e705a375579370d5eac4e50beb` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 13 over sky colour 14 | map 10, square (5,0) facing west, column 7 row 4 |  |
| `tile:10:0728cdaea87624b80858af126ea42d87473eef084e4f8ab973746386c32da28b` | 8X8D4 block 211 tile 1 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (4,0) facing south, column 0 row 4 |  |
| `tile:10:082c70af1353bbb38250d65bd6ea53f9a18af1703957baa34d55ac0c1e814c6e` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (2,8) facing south, column 4 row 4 |  |
| `tile:10:08b331a8d271575301a0c53d1c3b2aebab8c1bcf84274a3d0388f736c868031b` | 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 21 | map 10, square (1,3) facing west, column 2 row 6 |  |
| `tile:10:0af3ff2fd90a57a16bdb23bac48a84035a0ef3cba51de8696a221e9df505c818` | 8X8D4 block 211 tile 23 over 8X8D4 block 212 tile 37 over sky colour 14 | map 10, square (9,0) facing south, column 9 row 4 |  |
| `tile:10:0c8ddbf6a638707ff23c815599c1749ceda8ed735ae3690516128885ea03f42d` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 61 over sky colour 14 | map 10, square (4,2) facing east, column 4 row 4 |  |
| `tile:10:0e98496d15c9c65e59594f0b7d9cc6f0719d3b526ce4d137aa421976db6eea72` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (15,13) facing south, column 6 row 5 |  |
| `tile:10:1012501e1a2f164b843a61995c6b75f0f0ef75f82eeda54468caff7b5ac27563` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over sky colour 14 | map 10, square (0,0) facing south, column 6 row 2 |  |
| `tile:10:13d0228fcf6e44a91c9cf931609e6b84e334db48b06bb9d6d5c97efbeeac2e57` | 8X8D4 block 211 tile 56 over the ground colour 8 | map 10, square (7,6) facing south, column 4 row 6 |  |
| `tile:10:1505b7ec6d21cd62f9b834ad6614f57fe3603eeade203aba2d48ccbdfb533268` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 7 over sky colour 0 | map 10, square (5,0) facing north, column 0 row 4 |  |
| `tile:10:1b71b9d8c9667b08698eae424092e92016ca2b073e6bb0bfe5eeae8412ebafce` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 19 over the ground colour 8 | map 10, square (10,0) facing south, column 6 row 6 |  |
| `tile:10:1c42f13d3cb8bdc481df08165946bd682c458b526db67cca4c01221fb090e456` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (5,5) facing west, column 6 row 5 |  |
| `tile:10:1dfc408963c7e20de9d137b58c80cf6760e7b5130816cc3ea6a98457871a8e48` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,11) facing east, column 9 row 5 |  |
| `tile:10:1e58cb364ced91b20a1b76c3f95fa2d5c0a6724a161753b0094ca79cf29b974a` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 63 over 8X8D4 block 212 tile 63 over 8X8D4 block 212 tile 19 over the ground colour 8 | map 10, square (0,2) facing south, column 6 row 6 |  |
| `tile:10:1ed10b00f0e14e423bb229a0258cfc52e521b40119ca05dbd075a995c03fc64a` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 11 over sky colour 0 | map 10, square (1,1) facing north, column 0 row 4 |  |
| `tile:10:21cc1bca1ba748f223402a37737260bebbac1e5677560585ecfc2b7913d25ca0` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 27 | map 10, square (10,0) facing south, column 6 row 5 |  |
| `tile:10:21d99ac6886ba27b014a21ec3a362507947d4f6da9b5eb0d5cf760825c8325ee` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (7,0) facing east, column 7 row 4 |  |
| `tile:10:231673d6cdff1d41b9e792386a388b168b56332e562816c12ecba807fd1000f2` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (3,7) facing east, column 4 row 4 |  |
| `tile:10:25a35cc4d20fb46fcf4c7c0b0f15e910947aefb9ac3a9f82c2a0d5cfa4d0aca3` | 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (0,0) facing south, column 2 row 4 |  |
| `tile:10:262c87696e68e360e2a719955e177d398a6eb3ac5a9a38f708df4d2e41776e5a` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 42 | map 10, square (3,8) facing south, column 0 row 4 |  |
| `tile:10:2a5ec3f918cba6cbb97c0c30a9bcf979b33becc1fb31cf1b14c5acf785020c1a` | 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 15 over 8X8D4 block 212 tile 33 | map 10, square (3,7) facing south, column 1 row 5 |  |
| `tile:10:2bf319a150c49f5618dc0387c7998bd420a44436195d421e49335927fc4afe7d` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (1,4) facing east, column 10 row 4 |  |
| `tile:10:2c6253bbc3ed06f4c65551d3ada76ed37679cead3ee662b0ad9b47f19b754f4e` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 42 | map 10, square (2,8) facing south, column 0 row 4 |  |
| `tile:10:2c6d9701b915530648de274f8a5f06d75c8af86cd19c9693dce3a192461495a8` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 61 over sky colour 0 | map 10, square (4,2) facing east, column 4 row 4 |  |
| `tile:10:2d31436c5898e8cb6c5d0efaaccbbe006b324bfce3e6262ed3cd9ca07feb485c` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 60 | map 10, square (1,5) facing west, column 7 row 4 |  |
| `tile:10:2daa1e6aeb5be0f8b8294c62496f150edecac7fc3ee09c2905fef96f067405a2` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 28 | map 10, square (9,0) facing west, column 0 row 4 |  |
| `tile:10:2dd473c1a9a99e20ef250a2470608e7703d24322f7027b9279ef0ca1ae70797c` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 55 | map 10, square (2,6) facing west, column 9 row 5 |  |
| `tile:10:2e6ffe2ef12221226a6404f09fc15cc7b712fcbbe50e682a882bf95d97af96cf` | 8X8D4 block 211 tile 11 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (1,2) facing north, column 3 row 4 |  |
| `tile:10:2f957f10aa0f0cc8526cb340741500f80b2adbdda5475e89f5cb1fdfcc448bf3` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 20 tile 47 over 8X8D4 block 20 tile 47 over the ground colour 8 | map 10, square (11,0) facing east, column 6 row 6 |  |
| `tile:10:307d838c81c61903ffe341a8dc350a9fe8eba71e6e63b71a6c542379c97c21c8` | 8X8D4 block 211 tile 12 over 8X8D4 block 212 tile 45 | map 10, square (8,13) facing west, column 9 row 5 |  |
| `tile:10:3246c4e46cf922f558bf662df78fde272a461c0b688b872a32886834f2fcdace` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 39 | map 10, square (4,7) facing south, column 6 row 5 |  |
| `tile:10:340ae40e6e0adc119984565f2a04e95e1f6928db3032628f632ca1e6fa6decd0` | 8X8D4 block 211 tile 11 over sky colour 14 | map 10, square (0,0) facing south, column 3 row 4 |  |
| `tile:10:3460b766581822ea593b2b4866690f9d8dc9ea7e796fa29cf4edb8a2fc5a5dd0` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 44 | map 10, square (4,8) facing east, column 10 row 4 |  |
| `tile:10:3aadf903290af4c9a679b042ac2d46a7f7902af8aeda2d00074e5ec45441b06f` | 8X8D4 block 211 tile 13 over 8X8D4 block 211 tile 34 | map 10, square (2,7) facing south, column 2 row 5 |  |
| `tile:10:3c302398b07a4d28c3d41d2d60155d4db93cedd5949d64f484af3eb537fbd27d` | 8X8D4 block 211 tile 13 over 8X8D4 block 211 tile 13 over 8X8D4 block 212 tile 45 | map 10, square (0,11) facing east, column 5 row 5 |  |
| `tile:10:3dabe0d35b37226a693b1158ff2e7f6b212e54d3ec5bc9c74eb951ce8929895c` | 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 59 | map 10, square (1,5) facing west, column 8 row 4 |  |
| `tile:10:3ed40a7814d83ce93631de6122a79bd539e4c32730648796231f68d61c7fcd77` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 48 | map 10, square (15,5) facing west, column 6 row 5 |  |
| `tile:10:3f78b4e21b83b6346e2971e83e8d5b993a658fb57f0cf12bd3bd63caaa044d5c` | 8X8D4 block 211 tile 43 | map 10, square (7,6) facing south, column 5 row 5 |  |
| `tile:10:402a81147ebd3cdb792aae10d824b2ac58d505417b9d19453b8dd006edd29281` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (4,0) facing east, column 4 row 4 |  |
| `tile:10:40af1947ec936201af6a5940a78992636e51f5b81567343c2f8e6a31df09a661` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 20 tile 33 over sky colour 14 | map 10, square (11,0) facing east, column 7 row 4 |  |
| `tile:10:414d1a5f8baad9caa991404700763f3a89b806b45174d10c0ebfd0d53cf0581b` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 48 | map 10, square (10,0) facing south, column 7 row 4 |  |
| `tile:10:4345dad5e3b5151e082a6b61e26345435f7814f21f2dadf17d8ba73760b82609` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 42 | map 10, square (6,3) facing east, column 6 row 6 |  |
| `tile:10:43fa4f152d5f19c4269ca3ff37d644080f7ed2e56fe508f857ffbf6be24c0ebd` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 13 over sky colour 0 | map 10, square (1,1) facing west, column 10 row 4 |  |
| `tile:10:4482b57496b6cbdfb0c8c603730583672a39b7f4d4307e547d8aaf00f04d7722` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (6,3) facing east, column 7 row 4 |  |
| `tile:10:457c0d32a605cd0a64778908e2c8ee3e5cca2fc1e232b9c4164e4971cadb3221` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (9,1) facing north, column 7 row 4 |  |
| `tile:10:4670408c4c62bf93392f8a52bf48689059f628920165b6f577686ce6e69f595f` | 8X8D4 block 211 tile 23 over 8X8D4 block 211 tile 23 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (8,1) facing south, column 2 row 2 |  |
| `tile:10:4848795341129b4b372f4d048028983692a4cdbc1b5eac864ca3b8dd33140bf6` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (1,2) facing north, column 7 row 4 |  |
| `tile:10:4eec84d14ed34c0b19be528f10d049ccd043f836b8820913060bc03a3eb86066` | 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 35 over sky colour 14 | map 10, square (4,2) facing north, column 10 row 4 |  |
| `tile:10:501f16a1ac25b2fcce228eec4598652d9168478e5a14fb3addfc658bd97bd8e3` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 17 over sky colour 14 | map 10, square (8,0) facing east, column 4 row 4 |  |
| `tile:10:5026a37e0f7389787853802e0452c92ce2e5d0e1d3e399e365d9e4903f761e20` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 69 over sky colour 0 | map 10, square (6,11) facing east, column 0 row 4 |  |
| `tile:10:50adb59a0c63fc477ca85dad05a15b767d5da329b80009ef4b3cd09f3cafa1e0` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 13 over sky colour 14 | map 10, square (0,0) facing south, column 7 row 4 |  |
| `tile:10:531edc307772edd21763309ab9b6f34489d90e02bfe0602ce43678348de43a2d` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (4,0) facing north, column 10 row 4 |  |
| `tile:10:5436ef3f91c15c19c9a68800b97a53263098173474afc3ca861f8bf4f4fb1789` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (15,14) facing south, column 10 row 4 |  |
| `tile:10:5597daf86b51293bc60305b88ca6ac182cf3f0f6ed306b60860ad1c42eb55dfa` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 45 | map 10, square (3,7) facing south, column 3 row 5 |  |
| `tile:10:59186234f02cde9fa6ba626033385da39870a30e07c2c1258058f723e4c94b0b` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 11 over sky colour 14 | map 10, square (1,1) facing east, column 0 row 4 |  |
| `tile:10:592004cdf6372e81085cc7fe796dc269ff3e4408300855b76d0141fa3614c069` | 8X8D4 block 211 tile 13 over 8X8D4 block 211 tile 13 over 8X8D4 block 20 tile 30 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (3,1) facing east, column 5 row 5 |  |
| `tile:10:5fc7de498a507312ea4aa7e3b7c92e8ec61a190662acbe9391bb5bd811824063` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 44 | map 10, square (15,6) facing north, column 4 row 5 |  |
| `tile:10:64e839ac5b8c9f795f35530b4e1abc043a0ddb9d1dcc8e63dfa60258df0ac047` | 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (3,4) facing east, column 10 row 4 |  |
| `tile:10:6804c7799b54c1a53339abfdd842bc7e55e3730fd4502aaebeaf62d2531268cb` | 8X8D4 block 211 tile 13 over 8X8D1 block 203 tile 12 | map 10, square (5,3) facing south, column 2 row 5 |  |
| `tile:10:6950eb9d907b930c079befd00269e9fbef19ff639d8638ff0c5e807923e331ab` | 8X8D4 block 211 tile 5 over sky colour 14 | map 10, square (0,0) facing east, column 10 row 3 |  |
| `tile:10:6a55708fd870899d70b8d79049f16715364adbadf43d332f55dac096ddb2e4ce` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 60 | map 10, square (0,3) facing south, column 7 row 4 |  |
| `tile:10:6c1a9b2379ea98a6ee5bbf13b85fde01a133eebf44de4bbdd36972ec6aaf5056` | 8X8D4 block 211 tile 3 over 8X8D1 block 203 tile 31 | map 10, square (4,3) facing south, column 3 row 5 |  |
| `tile:10:6efd4d7258a669a19eb966a2bd416518d8fd6a0f3d81243bc55a9a240eef5122` | 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (9,0) facing west, column 0 row 3 |  |
| `tile:10:6fd7885b741a69ae7883e7652c3979b3c739f581d83806bc88ce42ed31762bee` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 23 over 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (6,4) facing east, column 4 row 4 |  |
| `tile:10:702c8cdf7343c3dde8cd25809491d326904e79e35ab4cfbd9124f5ce229e4caa` | 8X8D4 block 211 tile 5 over 8X8D4 block 211 tile 5 over 8X8D1 block 203 tile 41 | map 10, square (6,3) facing north, column 5 row 6 |  |
| `tile:10:71182c852416fbf0bf1744b19cf598d9e0e7f36ac8c9d33582e0b90c2177d1de` | 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 21 | map 10, square (1,5) facing west, column 8 row 6 |  |
| `tile:10:73ed43d5d104cdf131b2989b386cbebcb245b4bd5008794e9456100f7a0df110` | 8X8D4 block 211 tile 42 | map 10, square (7,6) facing south, column 6 row 5 |  |
| `tile:10:7604e4e99fbaba6d100e409d1af60975ab1b486e4e43fdca5a041216a82e8109` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 8 over sky colour 0 | map 10, square (7,0) facing east, column 7 row 4 |  |
| `tile:10:76ff0657eec422ea86e260c01e96928533aab7ea944d874b7da5bbae890c4bfd` | 8X8D4 block 211 tile 2 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (3,3) facing east, column 1 row 5 |  |
| `tile:10:795743785786c1ecfacdee9c8d429db62b3adff2d024bb6a78d3a0e74685551e` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 13 over sky colour 0 | map 10, square (5,0) facing west, column 7 row 4 |  |
| `tile:10:80692570100a78682bf937e336812c1430c52ae5412901d2e0b80d9377c90e23` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 45 | map 10, square (1,3) facing west, column 3 row 5 |  |
| `tile:10:831824ec0c05ad80803b2a1658ba88de3df2a28cf6e8f57e8bc0998d28f3bd58` | 8X8D4 block 211 tile 19 over 8X8D4 block 211 tile 19 over 8X8D4 block 211 tile 46 over the ground colour 8 | map 10, square (0,5) facing north, column 3 row 7 |  |
| `tile:10:835784d039e55054e4e715f8ac5009efc8e1bd6f384c7cd9cb29bd8fa6710bf6` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (3,0) facing east, column 6 row 5 |  |
| `tile:10:847bd09811de727e7d228eda7706c779d7c263020e40f1d3a4629e171d6ccf39` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (3,2) facing east, column 3 row 5 |  |
| `tile:10:848892a676f92232a8b2fdaa19903a83cafa5d6c7aae42d21078f8270b685570` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over 8X8D4 block 212 tile 39 | map 10, square (0,11) facing east, column 6 row 5 |  |
| `tile:10:859d684416d054fcc80cfeadeb10fe1ee1483ec0204b33d09932723d28a6befc` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 55 | map 10, square (0,2) facing south, column 6 row 5 |  |
| `tile:10:880747cbba3244ea832555a0b0708f72dc034aedad9deb9d9f21695656045640` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 31 | map 10, square (8,0) facing south, column 6 row 6 |  |
| `tile:10:885f533bb882aa3ff3bcec844f8b78a27d42196253d0c2d3778873fb0f313e59` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 11 over sky colour 14 | map 10, square (1,1) facing north, column 0 row 4 |  |
| `tile:10:88c02d2c0e72ced1e53949363a751506cc18b25c38233d772dd5eccf56bd8e2e` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 35 over the ground colour 8 | map 10, square (15,5) facing west, column 6 row 6 |  |
| `tile:10:88ccca6335c311cd03c340e25efa240fa6d14bb843d2f23bef31e6a993724f88` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 15 over 8X8D1 block 203 tile 12 | map 10, square (4,8) facing east, column 6 row 5 |  |
| `tile:10:89f6606c082089f9b33b89083ccf3ce6ba1a067719b5a7d8696f299482097d10` | 8X8D4 block 211 tile 0 over sky colour 14 | map 10, square (1,0) facing east, column 10 row 4 |  |
| `tile:10:8a60c7c1cfc765934c588f0063dd9aeb014e73f385a3fb136f97ce49f1d05767` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (9,0) facing south, column 7 row 4 |  |
| `tile:10:8cd40dd17111c45f5ee52fcb9bab9ace1cfeb175535ab3c1d610ddc9de71575b` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 39 | map 10, square (8,11) facing west, column 4 row 5 |  |
| `tile:10:8f69cd99d8e2d54f9cd7f12032f7830bc23846c4d9dd51a87aadc3146c15c001` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 39 | map 10, square (6,4) facing north, column 10 row 4 |  |
| `tile:10:8fe07963ca7fc69a3cdbb690800441f21f1080c069aa2126ac2c1b004389be99` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 16 over the ground colour 8 | map 10, square (5,1) facing west, column 6 row 6 |  |
| `tile:10:929d4f2b57635668e7ecc403b363774cb5a91fc1cc3de609e7398d81f9b08930` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 15 over 8X8D4 block 212 tile 39 | map 10, square (4,7) facing south, column 4 row 5 |  |
| `tile:10:92b467fd8ff6e6aa227349faf80fc000d4d6ac7167477ed87f1c5e104cde96e8` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (1,7) facing north, column 6 row 5 |  |
| `tile:10:92f23e16551f88ff7495b17b2728074f8ec33077335ab9d07f8b3e88346c240f` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 13 over 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (3,2) facing east, column 2 row 5 |  |
| `tile:10:93129a70f2a07456952043cbb936c1443bb9695122c600da218449466c12371b` | 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 55 | map 10, square (2,2) facing west, column 1 row 5 |  |
| `tile:10:9313047f2c3096021d181944699ae7067b0ffaac496b256a784fff6250790d7f` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (9,1) facing north, column 0 row 4 |  |
| `tile:10:9345d255fa7e91d74b114635c3da369dd9c3ce745f6967543181f2ddeb87e9e1` | 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 35 over sky colour 0 | map 10, square (4,2) facing north, column 10 row 4 |  |
| `tile:10:9468517d3119edaabcbba0220094e192b9183443cd9ed6b7ecedfcf8e1f80e53` | 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (2,1) facing west, column 2 row 4 |  |
| `tile:10:981649d2bc4f3b62d22f1611fbf77f65fa0a5b3d88a0b729fcb273d0d0a27179` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 20 tile 30 over sky colour 14 | map 10, square (5,3) facing north, column 7 row 4 |  |
| `tile:10:9ab693c216b2f6d873c8c6e8b8149e128cb6ff24117e664d7dbccba052c102da` | 8X8D4 block 211 tile 11 over 8X8D4 block 211 tile 11 over 8X8D4 block 212 tile 16 over sky colour 14 | map 10, square (13,0) facing west, column 6 row 4 |  |
| `tile:10:9e1899a510d700840f794d89c2cf1e663076ba4de83e7234a9e11ed216577a95` | 8X8D4 block 211 tile 12 over 8X8D1 block 203 tile 31 | map 10, square (5,3) facing south, column 3 row 5 |  |
| `tile:10:a145bb6b92e5ab7211c74d21ccb201a06d5bbe82bf936c7a56d38c36d584a3a4` | 8X8D4 block 211 tile 1 over 8X8D1 block 203 tile 30 | map 10, square (7,10) facing south, column 0 row 4 |  |
| `tile:10:a4bc3eb36bec516509c45c6ad2dd5e1aa5cfc7071dbba89761680ed9e324c70f` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 25 | map 10, square (4,8) facing north, column 6 row 5 |  |
| `tile:10:a6e4f0046311c8cfd20970bb672936459ecaf975d9ef94e634d33d5dc33de3ef` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 23 over sky colour 0 | map 10, square (6,3) facing east, column 7 row 4 |  |
| `tile:10:a758b7f04070e64cf76a6bf5a2961d7af4cfa3245de49f3550ee1db23ea132cc` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 69 over sky colour 0 | map 10, square (1,2) facing north, column 7 row 4 |  |
| `tile:10:a771d70b6fe8353e05446b3a697d8f4065a13662d925f933dd70cd5b106e1369` | 8X8D4 block 211 tile 1 over 8X8D4 block 20 tile 32 over 8X8D4 block 20 tile 30 over sky colour 0 | map 10, square (4,0) facing south, column 0 row 4 |  |
| `tile:10:a8d02ccc8fe01f17ca76f16c1051ad3efd9c1182136050e9ab79e9f7bc49386a` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (1,0) facing west, column 0 row 4 |  |
| `tile:10:a9336381befe04a93d70a83ebbb3fe5319f381f05f466c87b35f3937de0f626d` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (4,0) facing east, column 4 row 4 |  |
| `tile:10:ab487dc1f85952405b43d7bfb2fbe3ecb80a3dea739e32e2f82a8da178db96ff` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 9 over sky colour 14 | map 10, square (5,1) facing west, column 0 row 4 |  |
| `tile:10:abc3b09e71497c6320a374a10496ecaded069a469d3e4fb02977dfcd8cf17287` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 34 over the ground colour 8 | map 10, square (4,8) facing north, column 6 row 6 |  |
| `tile:10:abcd30336019cacef31b3abeb5b984bbba505d7d229e44f11705363f9f64c13f` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (3,7) facing east, column 4 row 4 |  |
| `tile:10:ae69b96c1887c05d927e4a7ffc2fb94a9eef475d7b4cfe16b8f982d7e7745c3d` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 60 | map 10, square (1,6) facing west, column 10 row 4 |  |
| `tile:10:ae94153359e3c24a69f11859650e2cb538ffa45685557921f771eca01506c958` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 7 over sky colour 0 | map 10, square (4,0) facing north, column 10 row 4 |  |
| `tile:10:af37cd58745a2c15136f079816071c7c916a70066e5d3d5dcc6dc3a6e4792066` | 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (1,0) facing west, column 3 row 4 |  |
| `tile:10:b078324225a9bc4fc015ae3d9344c5be8e0ef920975836763372fbe8d4636da8` | 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (1,0) facing west, column 2 row 4 |  |
| `tile:10:b139c1d2ac99795534e1fbc655dee7d9d2738311e7ba334f62c124e4454ef515` | 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 49 | map 10, square (1,3) facing west, column 2 row 5 |  |
| `tile:10:b3640769c91eee35c3741cf953378eb4f1bf1d30233a765357f9ab4b3a14e396` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 20 tile 33 over sky colour 0 | map 10, square (11,0) facing east, column 7 row 4 |  |
| `tile:10:b3774726f3c49696e9abf627a9c417c39e28309f4466ebc0aad37a26d1392a18` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 38 | map 10, square (8,0) facing west, column 6 row 5 |  |
| `tile:10:b56f5443679632c023f668a765adf879cce141c64e4efa3f36f3627dfc080a59` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,0) facing east, column 6 row 5 |  |
| `tile:10:b5c80d376cfb4ab453de80e0b47792960191ab821bac231dd3ce2855902441c9` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 38 | map 10, square (6,3) facing east, column 6 row 5 |  |
| `tile:10:b7054969842839ef4e59cfb12bf9240545a6bcaed49f9a1440e922e3c20789b8` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 13 over sky colour 14 | map 10, square (1,1) facing west, column 10 row 4 |  |
| `tile:10:b8c239daf449a37722e16b4fe138570622b11f6c2661f7fcca9dc3ac01682d9d` | 8X8D4 block 211 tile 1 over 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 48 | map 10, square (12,8) facing west, column 7 row 4 |  |
| `tile:10:ba2b5a0c5672a69e939a908c6e08fec80f90371ff1321c5e0db23db43b7c74b6` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 33 | map 10, square (8,0) facing south, column 6 row 5 |  |
| `tile:10:c7c992ed89682ed647d1d8555d7c9dbaf55934cf16359823ce18f59335b28b4b` | 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (2,1) facing west, column 3 row 4 |  |
| `tile:10:c83fce25da96f5cafe47ffaa0c08422e0e501235a741f2a7f1ee4e3fc2d2f001` | 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,13) facing east, column 1 row 5 |  |
| `tile:10:c85fac792b87a0ab179915a1b06e58251665fb7f181e4ebb885c2e32f0ad65c8` | 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 34 | map 10, square (5,2) facing east, column 9 row 5 |  |
| `tile:10:c8e86ce3d83555e89fc289afdfb555bdf852206bfbfeecef088b4d0b1288fc90` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 23 over 8X8D4 block 211 tile 23 over 8X8D4 block 212 tile 36 over sky colour 0 | map 10, square (1,10) facing east, column 4 row 4 |  |
| `tile:10:cdc540649005ab1bbdec9e2da2ba74d85f879cb3103411e7a248d004f75e08b9` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 45 | map 10, square (12,8) facing north, column 0 row 4 |  |
| `tile:10:ce1c1e590d0b46d3f9fc422d03a983875fb337947914a9a728232f5bc111da97` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (12,7) facing south, column 6 row 5 |  |
| `tile:10:d20292c3da4cf17b76f74ece4390546412f1b58615e987e0e8916ad335f9bd95` | 8X8D4 block 211 tile 2 over 8X8D1 block 203 tile 31 | map 10, square (4,3) facing south, column 1 row 5 |  |
| `tile:10:d286dd6659fe7e62477c559fd0698cda6f636df7b2489e9c61f06c1ac7c44cae` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D1 block 203 tile 12 | map 10, square (6,10) facing east, column 6 row 5 |  |
| `tile:10:d4778037618b7674f9d52048ceec0c99381209d3ae4f1e821b57bb9fce0012ef` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 11 over sky colour 14 | map 10, square (1,0) facing south, column 0 row 4 |  |
| `tile:10:d95646b96bca9660a9c17af29b64a075682c79cfaad050e5ba2010f267caeabd` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 28 | map 10, square (6,4) facing south, column 6 row 5 |  |
| `tile:10:d9dd79e84db41a88ee0d3f47637d43b4261005b4dc122c24c2aaade977b4148b` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 48 | map 10, square (9,0) facing south, column 4 row 4 |  |
| `tile:10:da592e7bca3518b9260c2258bfbd8b65b0c833784feeb64a96c1c26c6c2e0764` | 8X8D4 block 211 tile 41 | map 10, square (7,6) facing south, column 4 row 5 |  |
| `tile:10:db2f60ce488bafc1408b55033f478a35eda9a56b748f2736dc0e9e1d88795861` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 9 over sky colour 14 | map 10, square (3,0) facing south, column 0 row 4 |  |
| `tile:10:dcd65349b3e7996e3429fde71bd223442afd6ebf76b9a65f5870beaa86ba13d1` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 10 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (2,9) facing west, column 6 row 5 |  |
| `tile:10:de12ff59ae9b4ded30c19ac45004ed4744d45138dc4d7a4971c014afff8253f0` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,13) facing east, column 6 row 5 |  |
| `tile:10:de655208ed95608d52756da6b982f94594879e3973cd82c215e972d207ea369a` | 8X8D4 block 211 tile 0 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (9,0) facing south, column 10 row 4 |  |
| `tile:10:de8c5f131a08be1ac87520ed5817727a676e1344d76980ab3e9c90e99398018f` | 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 33 | map 10, square (0,10) facing south, column 3 row 5 |  |
| `tile:10:df42533e0bf347eba2844426d55327cca450966b1b8d3d90fd4c46bf953f186d` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (5,1) facing west, column 6 row 5 |  |
| `tile:10:e16652c7d71f769b658ed639405fde6da68dc95eae349ddd86df6ea4f18b2c94` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (6,11) facing east, column 0 row 4 |  |
| `tile:10:e40cc107c5c317954de080cc9e3d81a9d5f0f693a962f7357f2b405a9ee24757` | 8X8D4 block 211 tile 24 over sky colour 14 | map 10, square (7,0) facing east, column 10 row 3 |  |
| `tile:10:e574b0d06c004262df768f4af3d6033572fdbfc941a78217969e80723c7bf8b3` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (5,0) facing north, column 0 row 4 |  |
| `tile:10:e7a755d073446854153fdebef689a59e77e9104cfe605f5b17bc636827faf5e3` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (8,0) facing south, column 7 row 4 |  |
| `tile:10:e7c36a572a1e845d3e31200472c499636b07a0cd060e048c6b48a5d25088c6f7` | 8X8D4 block 211 tile 18 over 8X8D4 block 211 tile 18 over 8X8D1 block 203 tile 37 over the ground colour 8 | map 10, square (0,5) facing north, column 2 row 8 |  |
| `tile:10:e83e1fbd37ab41f742373d8109b7edfd54a18eaa25ac2df625435dda9f243003` | 8X8D4 block 211 tile 19 over 8X8D1 block 203 tile 39 | map 10, square (0,5) facing west, column 9 row 8 |  |
| `tile:10:ee9681e5d12203bb48bebfb2546e4d720d88ecb2f6704e46a7a526d3114b66e7` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 3 over 8X8D4 block 212 tile 44 | map 10, square (1,10) facing south, column 6 row 5 |  |
| `tile:10:ef6c87fed7a84b4948f098f8db661ec8edb2e9957049b4ab3ccd7394825f8a0d` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (15,14) facing south, column 10 row 4 |  |
| `tile:10:f19b0b386156f282f8f0fdaaafbdeedb9e74a1f57b1a6206cbc83bd060012fd3` | 8X8D4 block 211 tile 1 over sky colour 14 | map 10, square (0,0) facing south, column 0 row 4 |  |
| `tile:10:f1a0e96fb17da270b5079398b96c12afae4fd2ea72260b7783a5fd6fa65ce203` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 25 over sky colour 0 | map 10, square (2,8) facing south, column 4 row 4 |  |
| `tile:10:f24f1380cb145bfa4206c5a2779c90f70923e23af51d7e088a3ea5bf468d9e1d` | 8X8D4 block 211 tile 1 over 8X8D4 block 212 tile 42 | map 10, square (7,12) facing south, column 0 row 4 |  |
| `tile:10:f6e8fff0e38347c1c8c27ea31199ee78d865ad60c1136810e800747dd8cf609f` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over 8X8D4 block 212 tile 39 | map 10, square (14,9) facing north, column 0 row 5 |  |
| `tile:10:f835df7e274de383de1d85d1e297c8f48c06b12836b139d2bba3491287e8ebb9` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,11) facing east, column 6 row 5 |  |
| `tile:10:f868af5bc4d2167dc692bbdb41197f57bee307e9b3bce0f4f1d2c9f48d519eb7` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 12 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (10,2) facing east, column 0 row 5 |  |
| `tile:10:f99cf63eaa90f571bdfc6594f4290fa73add8f8d3129f357ac365d55b0343383` | 8X8D4 block 211 tile 0 over 8X8D4 block 211 tile 26 | map 10, square (2,8) facing east, column 10 row 4 |  |
| `tile:10:fa25d83f2f806f3c912d513822302d1a064d1ce4a83ac50ffd245d2a9140befe` | 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 9 over 8X8D1 block 203 tile 31 | map 10, square (6,3) facing north, column 6 row 5 |  |
| `tile:10:fca91b9a86609e3ae21c84a9bdaafc37d99453de8379e78b1c4eca40c0cb4461` | 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 9 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (9,1) facing north, column 0 row 4 |  |
| `tile:10:fd6f6b84bfd1c4c09e5433b9477978ec6b25c36634d0df0ef17967ca279ce368` | 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (7,0) facing south, column 2 row 4 |  |
| `tile:10:fdb24207f5be23db3688470db1ad589cacf0fb8778fc78a2a5653f625c89113c` | 8X8D4 block 211 tile 19 over 8X8D4 block 211 tile 19 over 8X8D4 block 212 tile 20 over the ground colour 8 | map 10, square (0,6) facing north, column 4 row 6 |  |
| `tile:10:ffc8f4633202dca2a7d341ae34ae6f13a2bf805294d4d8332fb759535560ad34` | 8X8D4 block 211 tile 55 over the ground colour 8 | map 10, square (7,6) facing south, column 6 row 6 |  |

#### tile set 8X8D4 block 212 (233)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:10:0158a705b6379db72e095a79ee64d26285c69e2fc7a0c2c6f2925828c58dff9a` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over sky colour 0 | map 10, square (5,8) facing west, column 1 row 3 |  |
| `tile:10:0286cf70337b914b66e121efa4ee872ab1f1b7b3971d458eddec33c945606adc` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 11 over sky colour 14 | map 10, square (6,9) facing west, column 9 row 4 |  |
| `tile:10:034480ab1aa69c12d2e2937846e906ede8f581a23d5fa63706ebcec72a49fa54` | 8X8D4 block 212 tile 16 over sky colour 0 | map 10, square (1,0) facing south, column 9 row 4 |  |
| `tile:10:03a35b10706158623c1e0c465684ec7a3ad783e1b2df34e3e782ce6aaae3e11c` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 45 | map 10, square (5,8) facing west, column 0 row 4 |  |
| `tile:10:0425787f6b41fb200a58e5600143268245dcc2065618768f62703e0908c98e66` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 11 over the ground colour 8 | map 10, square (5,8) facing south, column 8 row 7 |  |
| `tile:10:0521aa6774c583ae0467a4e00fc8fc470d3b2e09c6dce952460826c367805920` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (4,9) facing north, column 9 row 3 |  |
| `tile:10:0527ce86fcd1d61f0d4d607d22a716087c5d5cd6373a254b332b0f060a1530eb` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (13,3) facing east, column 8 row 4 |  |
| `tile:10:065ea835e777a6f593600af8a0610bdc48cf06cdae2c0a8a6809e1c9ae89b520` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 39 | map 10, square (14,3) facing south, column 7 row 4 |  |
| `tile:10:089cca559322e5e5e49a79fd3eb2e0f84d2e2ae0e207c1ae3e6b77e771de7eed` | 8X8D4 block 212 tile 12 over 8X8D4 block 20 tile 33 over sky colour 14 | map 10, square (7,2) facing west, column 10 row 3 |  |
| `tile:10:0946708cd2ef39017fa3efc82724bc7443b7b44c5c0b5d5cd9e9319640153b4d` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 38 | map 10, square (14,3) facing west, column 1 row 2 |  |
| `tile:10:0a121604b24f77829388f8af0d9d5ce27a79fb685fa53c66e3d97e181f6a7a28` | 8X8D4 block 212 tile 16 over sky colour 14 | map 10, square (1,0) facing south, column 9 row 4 |  |
| `tile:10:0e4b9b0fe316572568fca8884b9d8244f25d75a2ae85600706548403bfb0a468` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 30 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 3 row 5 |  |
| `tile:10:123dfd361b02de951b1eb6b6618595cf9bbc8eb54ce41d058baa70ef3bb0e716` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 36 over sky colour 0 | map 10, square (5,9) facing west, column 2 row 2 |  |
| `tile:10:1276cc27cc6192110970bca3d6b8ccc196cf60bf003ae195aab7112508f79413` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 31 | map 10, square (4,9) facing north, column 9 row 5 |  |
| `tile:10:1417a187312417ee67bff820d44952411373a661b586a8cab841bbd620dcb6b0` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 41 | map 10, square (5,9) facing south, column 10 row 4 |  |
| `tile:10:14ef15d078c2456c9ac1d2df02d9c9514408186d4c28344602196542543b460a` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D1 block 203 tile 16 over sky colour 14 | map 10, square (6,9) facing north, column 8 row 2 |  |
| `tile:10:17fb4404e8337afcde23e25325619eb87ab578e6af8eb228f8c0363d50a3d2bc` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 16 over sky colour 14 | map 10, square (5,7) facing south, column 6 row 4 |  |
| `tile:10:1854d663d2e97425c48bd3b55ec84ee826f68426de3b43ef32c33cc604b6c739` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (4,9) facing north, column 10 row 3 |  |
| `tile:10:18924ee1192b3f1ed9efc96e2e5784563de1bd92dc6551e859f99641c3a28e17` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 31 | map 10, square (4,9) facing east, column 7 row 6 |  |
| `tile:10:1a2678be6885cf70f22ca2dbdd6fdbd36ef1ce48dc226e1c7064ac356235b245` | 8X8D4 block 212 tile 12 over 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (7,1) facing east, column 10 row 2 |  |
| `tile:10:1a5236b22a21a459750eee679269657ac0eef497ddcca5f385a12ebb4a2d0700` | 8X8D4 block 212 tile 15 over 8X8D4 block 212 tile 39 | map 10, square (13,7) facing west, column 6 row 5 |  |
| `tile:10:1c5a8800e035b2a5d8024936cb5cb1c3cccc624793a2964ba5590fd5d4021b72` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (6,7) facing west, column 0 row 6 |  |
| `tile:10:1d6384de3f0cab978c4e792ac202334af76f5bd10f8ff54acbc4f78063e270dd` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 37 over sky colour 14 | map 10, square (14,2) facing south, column 6 row 4 |  |
| `tile:10:1fe26b280e4f58163ab38f0929c95403caea73cc2ea52b2c7affdd6f3e8285d1` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 211 tile 25 over sky colour 0 | map 10, square (7,0) facing south, column 4 row 4 |  |
| `tile:10:225e622960c04b65636839f4dc0f9f604b2a8b1606c8ff0c5c094b891ff2ac55` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 3 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing south, column 3 row 5 |  |
| `tile:10:25e5edd85c677bad332c83f2a2c57274a41a8428bceecdd16336905f3b8156eb` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 25 over sky colour 0 | map 10, square (7,5) facing south, column 1 row 4 |  |
| `tile:10:2673bbb4c37d615c207be1c5be4a94fc08be49089895f9cf57d26b3fb1d5d28d` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 41 | map 10, square (5,9) facing south, column 10 row 7 |  |
| `tile:10:284eff2ada3a7f5f7ae3c5277e98514cea117530c55a9f25929e08c8b0b7fb0c` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 36 over the ground colour 8 | map 10, square (5,9) facing west, column 7 row 7 |  |
| `tile:10:2b7f5a6516f227bfc5f0541ce115cb3e91d6fe5710b22477eed8b08c6475d09d` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 34 over the ground colour 8 | map 10, square (5,8) facing west, column 0 row 7 |  |
| `tile:10:2bf6a1c4a03fc7c1252bd59a21576dcee005726008feea3472ed7ae9b62457f5` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (7,1) facing south, column 3 row 3 |  |
| `tile:10:2c976a4acc520e3e3b6a0cb2175aef60cfd446afa3c1714cf5275fb78eb79c41` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 34 | map 10, square (8,10) facing north, column 8 row 5 |  |
| `tile:10:2e33e112dc34196599c85af242f9b0fc04c76d98e7725c8cea1b602acb98337b` | 8X8D4 block 212 tile 12 over 8X8D4 block 211 tile 19 over 8X8D4 block 211 tile 15 over the ground colour 8 | map 10, square (5,9) facing north, column 1 row 6 |  |
| `tile:10:2ea86ed53b499103f2a99cba06fbba43ae0687d1a2973719856f46c9aa841453` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 18 over the ground colour 8 | map 10, square (5,9) facing west, column 9 row 8 |  |
| `tile:10:2ecd04512183d2e3c932a3cf679c72bde1e078534ca2272da66e697cd24d1de6` | 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 16 over sky colour 14 | map 10, square (8,8) facing east, column 10 row 3 |  |
| `tile:10:31778bff7db393d893c4af5048ab0c1f64c084168a21eae1bc73d5e64655a05a` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (5,8) facing west, column 0 row 3 |  |
| `tile:10:31810b7b0c46b2cc56dbc5b3a44e4583f68bcb9fd7b2026183fec557e5466e34` | 8X8D4 block 212 tile 13 over 8X8D1 block 203 tile 22 over the ground colour 8 | map 10, square (6,8) facing west, column 0 row 7 |  |
| `tile:10:318eb3d6954352359590e7015593000ea716c065bf962b896dfbb0ee83f25768` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 15 over the ground colour 8 | map 10, square (5,9) facing west, column 8 row 8 |  |
| `tile:10:31c4d5c993170f2c33012c476646595eeb37c6face6f65c1c65ce7ef409147d7` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (7,1) facing south, column 4 row 4 |  |
| `tile:10:3294d1228c282d717bba853b99084c6e11e9bf41159982a6969ad9bae7ed6189` | 8X8D4 block 212 tile 67 | map 10, square (8,4) facing east, column 4 row 7 |  |
| `tile:10:3322958172d0b30c8d9fb328e276e8eb42f9f550e6a6675e5482bf26ac1db46b` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,9) facing west, column 7 row 5 |  |
| `tile:10:3342e268312130a2264dcd1ea84d8747230ec1d2d29414e9d3c0539e05126323` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 19 over the ground colour 8 | map 10, square (6,9) facing west, column 7 row 6 |  |
| `tile:10:360b4a5ca99751e040f460a59402ba8f0a6a75d8ebef467a5b473c1c836ec190` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 61 over sky colour 0 | map 10, square (7,2) facing north, column 2 row 3 |  |
| `tile:10:39798da8a5ae810356ad3a66ffbeb78dfc1442d39a23d3bacaca74d71385a123` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 4 | map 10, square (5,9) facing north, column 0 row 7 |  |
| `tile:10:3b5aeb8beeaef8d4dfc42d8593fff272157783f122dec2e3eab2b44dd5ed61ce` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 45 | map 10, square (14,3) facing west, column 0 row 2 |  |
| `tile:10:3d4082386e2eabc441b25f919dde6598158a4281d863551e14c9d82c8262d344` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 44 over the ground colour 8 | map 10, square (7,5) facing east, column 8 row 7 |  |
| `tile:10:3ebddb602e370eb447141c18a9b6ad63710d83a1499f2cc0106f9c9bee614a42` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 10 over sky colour 14 | map 10, square (4,9) facing east, column 2 row 3 |  |
| `tile:10:3ee3446bb989f03f0d3de59ed0ee0df15bc12f17ffca53e1d3738c1dc31dab00` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 3 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,3) facing south, column 0 row 5 |  |
| `tile:10:41776205c06823cbd70043cb1a632db67fe1d4b537cfe5c0fcc875a9a6178421` | 8X8D4 block 212 tile 15 over 8X8D4 block 20 tile 32 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (9,1) facing west, column 4 row 5 |  |
| `tile:10:418c4e7c211541ce659d1f93af16d202de1f52ae5f5d30ee4bd921f45950c79d` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 37 over sky colour 14 | map 10, square (14,3) facing south, column 7 row 3 |  |
| `tile:10:41c7f09b02bb43219d9d84b212ba28b2e64ebd63f1bdbd467d15b7c7798db39a` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (5,8) facing west, column 1 row 3 |  |
| `tile:10:43ae8c30cbbe1fa43b7840bc0f9b029da12a41129e2b388a4a6a6855d18ed93f` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 1 over sky colour 14 | map 10, square (5,9) facing north, column 0 row 4 |  |
| `tile:10:44e6c051caa2bbb231efe02611b0387533cf7fd89d6466e38d0f82ed19ce4bb5` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 7 over sky colour 0 | map 10, square (4,9) facing north, column 10 row 3 |  |
| `tile:10:45c38b8cc36a12c1bae141ae8ee95178189d51f9a4c7a9facad241c60f4089c2` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,1) facing south, column 7 row 5 |  |
| `tile:10:461da9dbf63b57d5810812a8e84c3b56d7175795d88ad0cfafbdeb429c6e4935` | 8X8D4 block 212 tile 11 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (9,8) facing north, column 1 row 4 |  |
| `tile:10:47caebffd255930b38606dc9d6fcf9b10c4018d4cb6cbe7bcfc427ad1ca8382f` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 2 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing east, column 10 row 5 |  |
| `tile:10:489c2565daa8fd06143e42c62c727169042637846441ca0ee6c401491dbdb845` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 15 over 8X8D4 block 212 tile 44 | map 10, square (5,7) facing south, column 6 row 5 |  |
| `tile:10:4b058bd64dbd225ee6e2a3a6cb171686107f4acb935576d9a897a589c083e50d` | 8X8D4 block 212 tile 15 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,10) facing west, column 9 row 5 |  |
| `tile:10:4eccbd701cc52a208053fcfe41eb2643ab331d9339053d4912e6578534e386c4` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 19 over the ground colour 8 | map 10, square (5,9) facing west, column 10 row 8 |  |
| `tile:10:52b0cbf67cfd51022166cea832d4ccf7313fd93247e260688142754d7c18f259` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 25 over the ground colour 8 | map 10, square (3,9) facing east, column 4 row 6 |  |
| `tile:10:540d9a04397375ecab8f40cec17e2b3aab45519d52e53b8101863c400a6dfd82` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 11 over 8X8D1 block 203 tile 31 | map 10, square (4,9) facing east, column 3 row 5 |  |
| `tile:10:5439dbf2d2c1b83c409806d7e43d27dd197437229813266b0bc7962615dc3ef2` | 8X8D4 block 212 tile 13 over 8X8D1 block 203 tile 30 | map 10, square (7,5) facing south, column 0 row 8 |  |
| `tile:10:569a8afca0e9fd1e3450085f01b40f976bdbe8896d5e6b582971fe860bb72c1a` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 7 | map 10, square (7,1) facing west, column 0 row 5 |  |
| `tile:10:5721afb5f31a0a6fd2aca362e437c3fe37a1db0130dbc63581aa6468d413a8b4` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 40 | map 10, square (14,3) facing west, column 0 row 3 |  |
| `tile:10:576f01974982728907907bcdf87f2b4fbe5f717ba1377e9c7115cbd68471f600` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 44 | map 10, square (4,8) facing south, column 2 row 4 |  |
| `tile:10:58d0e10e7307a562a685251eaaccc1d2c0c0425e293ebaf715bfb3204340cb54` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 12 over sky colour 0 | map 10, square (5,8) facing south, column 8 row 3 |  |
| `tile:10:59354017a634891a6015b4e8524a0f0e1f837377c76521587daf8a4ff2048eb0` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (5,8) facing west, column 0 row 2 |  |
| `tile:10:5968a801211119698ad1e02b0c3a3b86e613510af0c386e92fe046401160864d` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (8,5) facing west, column 2 row 2 |  |
| `tile:10:5a6df4a6eec6eb0be76c7af3ead3c6dbca96ed836d5792788164c25da3447026` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 30 | map 10, square (4,9) facing east, column 7 row 5 |  |
| `tile:10:5ab3e92e7ad47e6456ff517db6fac3f65d2f7b1a884d2739b0acfa346c54550e` | 8X8D4 block 212 tile 66 | map 10, square (8,4) facing east, column 5 row 6 |  |
| `tile:10:5c65a76301e67a8418be9aa2bf81575aeb8be47e34837d446cd6042f5b3e798c` | 8X8D4 block 212 tile 10 over 8X8D1 block 203 tile 39 | map 10, square (7,2) facing west, column 9 row 6 |  |
| `tile:10:5f3b6d78194598d40c861fbc3a0b1f68d155c2fb3b42e6ae90b789a513da2ebc` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 40 | map 10, square (14,3) facing south, column 8 row 4 |  |
| `tile:10:61f85e711453385d7d12d493081367c3510d7054958a21c4df1dab11e55a8a4d` | 8X8D4 block 212 tile 12 over 8X8D4 block 20 tile 47 over the ground colour 8 | map 10, square (7,4) facing south, column 3 row 6 |  |
| `tile:10:62193273e133223b94790f280604e2d0b5b2f17f7be96fcf2f3c266cc031fd0b` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 21 over the ground colour 8 | map 10, square (4,9) facing east, column 8 row 8 |  |
| `tile:10:63d2219cb60181b2aae11923344975be407063d67ee3d30dfb94ba293f90d923` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (7,1) facing south, column 8 row 4 |  |
| `tile:10:63f788a5fd46552a56688c097ecbaefa422c59add578a7a2a96ca5496f0c4bb1` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 17 over sky colour 0 | map 10, square (3,9) facing east, column 4 row 4 |  |
| `tile:10:64a7ee10306be8b51f253097fb4ed7f66cd6def6869ed465e6599113feb8a7d2` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 33 over 8X8D4 block 212 tile 69 over sky colour 0 | map 10, square (7,2) facing north, column 4 row 4 |  |
| `tile:10:64e210ab372d31d4a8e1cf4024fc97ffd43f50a3e9a3d11522c15f813ca2a11f` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 34 over the ground colour 8 | map 10, square (6,8) facing west, column 1 row 6 |  |
| `tile:10:666843c50e9b0cfa339f83ff1f0a63e732de014c3dd00ade5110cb2097143065` | 8X8D4 block 212 tile 63 over 8X8D4 block 212 tile 19 over the ground colour 8 | map 10, square (1,2) facing south, column 9 row 6 |  |
| `tile:10:66d188b11c43b37b502cf03ab646e54d94479c1a57a0af04abc178f101e257f5` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 29 | map 10, square (4,9) facing east, column 8 row 5 |  |
| `tile:10:66ef52348f73d591b73d50454558af125a077e176878fcd8f00dfe62e1b99dfa` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (5,8) facing west, column 0 row 8 |  |
| `tile:10:6756a960d122e4a3cb125f5e2e8d5a1eec90eb02e4acfdee1ffc1e30c1a6454d` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 11 over sky colour 0 | map 10, square (5,9) facing north, column 3 row 4 |  |
| `tile:10:68333d3fa2fb0dfa82e5fdc84883fa6ae380c67c1588ab16d30f4f3b8820c066` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 37 over sky colour 0 | map 10, square (14,3) facing south, column 7 row 3 |  |
| `tile:10:68965edda36ed9d6720a38de367e98de76ad10362c51608831c09ea3d374b112` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,7) facing west, column 0 row 5 |  |
| `tile:10:6bd8d38db553ed9cdb93caed8012bea10a7ffd9712c5291ef7d30f0c66d714a1` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 7 | map 10, square (5,9) facing north, column 0 row 8 |  |
| `tile:10:6c7b6107dc62c8c33f200f9bc5ef1467ec10f6cb34d698b5d3b7c17903f080d1` | 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 44 over 8X8D4 block 212 tile 48 | map 10, square (7,4) facing east, column 10 row 6 |  |
| `tile:10:6c843e415e5b47fd7c6d511a1a12c9313463d10c4b5cdac41578bc22f02f9850` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 29 | map 10, square (5,8) facing west, column 1 row 5 |  |
| `tile:10:708d723622469c6992ce07603701ba6346fd433607073592480c80955ada776e` | 8X8D4 block 212 tile 12 over 8X8D4 block 20 tile 33 over sky colour 0 | map 10, square (7,2) facing west, column 10 row 3 |  |
| `tile:10:709499737786a9fa46cf4e8848f12b908c5366309418aaf44cc784426b096905` | 8X8D4 block 212 tile 14 over 8X8D4 block 20 tile 49 over the ground colour 8 | map 10, square (7,4) facing south, column 2 row 6 |  |
| `tile:10:7095a8a3e75b6f319045aa15c5bb8c3a1f85a31acd998fe5e65a25f57c4a11a8` | 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (11,0) facing west, column 1 row 4 |  |
| `tile:10:72c44ba54d1235dd9f8ee7c326c5399158835560b7f9d8e5dd12c80a082ab528` | 8X8D4 block 212 tile 11 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (9,8) facing north, column 1 row 4 |  |
| `tile:10:7544b26a5fa5846175ee352b9ae0722f90a0446696005757e252e838b6a8e443` | 8X8D4 block 212 tile 53 | map 10, square (8,3) facing east, column 10 row 7 |  |
| `tile:10:759cb0abc026bc5416f98948e50f8325b28556a17c1d64f113b7937f7d707e5a` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 11 over 8X8D4 block 211 tile 16 over the ground colour 8 | map 10, square (6,9) facing west, column 9 row 6 |  |
| `tile:10:769ec77baa08df3c952a4a0dadd6e0569c0099630ed61b1d453c071b431a0e57` | 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 34 over the ground colour 8 | map 10, square (7,4) facing east, column 9 row 6 |  |
| `tile:10:77610852e169d0701edffcdae86005e122d6ab44f5c91a6e7426fdcfa98c45b5` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 41 | map 10, square (14,3) facing west, column 0 row 4 |  |
| `tile:10:7894c62ca1e0e776e1a90b2de4211011fddd245517d4187316827b2c53535c37` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 11 over sky colour 0 | map 10, square (6,9) facing west, column 9 row 4 |  |
| `tile:10:7a185604aeb7a6b7cc3c06ecbbfda9cabbff7915a7cd5759a40d31bf8d28177b` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 43 | map 10, square (5,9) facing south, column 9 row 3 |  |
| `tile:10:7b5bbab8270235b2f53ae28db654f7a9a1b6640e40bb616479ff983392d00329` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (5,8) facing east, column 9 row 5 |  |
| `tile:10:7bb3dc85f6b6667098ead85f0006d306dfa2e0364d928650ea2d7a0e517fb345` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (6,8) facing west, column 1 row 4 |  |
| `tile:10:7cf52ee2c46d6a0a2dc86217b75dc05efe3f1d2f5dd8ede671296caf956e431f` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 48 | map 10, square (5,9) facing south, column 9 row 6 |  |
| `tile:10:7d78c6791a0d3d44831638a0d803393fcd54db78f04c1a1f085c91f495458fcb` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 33 over 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 5 row 5 |  |
| `tile:10:7dd42d1bc3fe335df23fecebd790a74e6eeea663cd9c2e7337127a98438539c1` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 4 | map 10, square (5,9) facing north, column 0 row 5 |  |
| `tile:10:7e26cbf9c45c98158635e4385e2b1dc450e205b08d8648f527e4b88dfd2bb5b0` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 16 over the ground colour 8 | map 10, square (5,8) facing east, column 9 row 6 |  |
| `tile:10:7fabaaa5226216b9fba36dba045361daf7871cf3749f2bee13b26f78f41229aa` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 29 | map 10, square (6,8) facing west, column 0 row 5 |  |
| `tile:10:7fbb8b4f75561fb3e1bcba0b0e4c7fae2bcb497102e288eef23fff1b56775e25` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (5,8) facing south, column 7 row 3 |  |
| `tile:10:805894bc118b57005657ed601978eb3a567ed2a38c0b921f93519cca350a118a` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 17 over sky colour 0 | map 10, square (4,9) facing east, column 4 row 4 |  |
| `tile:10:814729948941c26e4472f3173a33f1d921f81755c95e23800adea23cad780d38` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (14,3) facing east, column 10 row 4 |  |
| `tile:10:8183522b2f8f0a1a126e0b451f2ed6721ce832eff86e96d196229c8ac1834806` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 36 over sky colour 0 | map 10, square (6,8) facing west, column 1 row 4 |  |
| `tile:10:83dfbea11790ea09ef7c3dca53dac71f7d060fafc648df2c33016c8621db5ff8` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (14,3) facing east, column 9 row 6 |  |
| `tile:10:8515eb11c5d2f346a8c2b55af9d052be026da1997f9be23d9168b71b8ba58f7e` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 49 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,4) facing north, column 4 row 5 |  |
| `tile:10:85e983897ba0e2a6efb545c8291e03403f2cdab234492bbc77a9a1b3456ea5b8` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 24 over sky colour 14 | map 10, square (6,8) facing south, column 6 row 4 |  |
| `tile:10:85fabe40a8126a6cac69d46249217d51214dfb24119421abd70d94a8de6c18a8` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 9 over sky colour 14 | map 10, square (7,1) facing west, column 0 row 4 |  |
| `tile:10:88ba3233ef466af3c33189c83a04bc7c753c2a91a2f67fbadc1b5d0d627a180d` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 19 over 8X8D1 block 203 tile 36 over the ground colour 8 | map 10, square (5,9) facing west, column 10 row 7 |  |
| `tile:10:8a4c3906be8c2273d01a2f2c6a2f4cecd9e9b66cd5a8c3c81c45a5228aab8111` | 8X8D4 block 212 tile 13 over 8X8D1 block 203 tile 18 over the ground colour 8 | map 10, square (9,8) facing north, column 0 row 7 |  |
| `tile:10:8ac0e316fa62ddcd00bf6c95fc22a9ed8d447b9238d69bd8e3624758d9b21e75` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 39 | map 10, square (5,9) facing south, column 10 row 6 |  |
| `tile:10:8b1644c5c7ea2d1a02ae3dc19ab8654a366392569b714e6b24bf058ee81ddf71` | 8X8D4 block 212 tile 11 over sky colour 14 | map 10, square (0,0) facing north, column 1 row 2 |  |
| `tile:10:8bc38b425fb8cc89437bacded4a984f5a2edf012c663b5276e0aae7eda5ac2af` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 20 tile 33 over sky colour 0 | map 10, square (7,3) facing north, column 4 row 4 |  |
| `tile:10:8bc7da26686517149f3ef8f0b5a62d4728c0ec673431cdbd0c5cd2b4fe577f8c` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 46 | map 10, square (5,9) facing south, column 10 row 8 |  |
| `tile:10:8c4c97968d37745643ee968139de07bc5a54899d8cc073311ae5e2f7fd3d0b37` | 8X8D4 block 212 tile 50 | map 10, square (8,4) facing east, column 4 row 6 |  |
| `tile:10:8d02cb32dce1a61446e794f01ff1c51581aa8100be9e1a06ed9f36dae5a3c8d4` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 7 | map 10, square (5,9) facing north, column 3 row 5 |  |
| `tile:10:8df9faea40ec43521411de53d0b5dc56a5098b33e20d0f0215e851d184e0b034` | 8X8D4 block 212 tile 24 | map 10, square (0,4) facing west, column 5 row 6 |  |
| `tile:10:8e40d4bff6e8e4bfe9f7136ecd988c5547a1afa5065a09553692ebbd46e69043` | 8X8D4 block 212 tile 11 over 8X8D1 block 203 tile 29 | map 10, square (9,8) facing north, column 1 row 5 |  |
| `tile:10:8e79d6381975e872b2f6e1819fec1aab47dd78de679fe5bf9993f23c3f9b195c` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 48 | map 10, square (5,9) facing south, column 9 row 2 |  |
| `tile:10:8e823043d5e41447c091f87dee14e559c9caecbcb8d8e953ec3651ae210f5df4` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 41 | map 10, square (7,5) facing east, column 8 row 4 |  |
| `tile:10:8f7f7684187eabdd4d55e68707a4f8a49b55d94970effec8f951b1da8cbd3a30` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 11 over sky colour 0 | map 10, square (4,9) facing east, column 3 row 4 |  |
| `tile:10:9123aa42feea7fdf37aa107e066ae4bc56d9dd4ab5f0c50f44e51497a1b2830d` | 8X8D4 block 212 tile 69 over 8X8D1 block 203 tile 12 | map 10, square (0,3) facing west, column 0 row 2 |  |
| `tile:10:920971853aa69551bb64c88a6e2f1bac1053a605c3303f85849d85bd962d6a1b` | 8X8D4 block 212 tile 15 over 8X8D4 block 20 tile 33 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,3) facing south, column 1 row 5 |  |
| `tile:10:92ae0e39135b8cf9631ffa677eaa652a3be312cd4767132fc0f9f3e24f8cfc9c` | 8X8D4 block 212 tile 51 | map 10, square (8,4) facing east, column 6 row 6 |  |
| `tile:10:93307f402d66f9a70d624f6c42fa366fe0fdc04d9ee1848ae668fae51e9876e8` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 32 over sky colour 0 | map 10, square (7,2) facing north, column 3 row 4 |  |
| `tile:10:938fdc20bf6cbe189f27ec1a1a5af2e75743acc1be498db1482d701611cc7d60` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 46 | map 10, square (14,3) facing west, column 0 row 5 |  |
| `tile:10:953d4c603f38251d1c88de07f18186c89dc5186774fd69ad2e49caf13576960a` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 61 over sky colour 14 | map 10, square (7,2) facing north, column 2 row 3 |  |
| `tile:10:98008875f64191c632e3816f5c2fff6fdc779576933c11cba1994e6a12a74bb0` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 1 over sky colour 0 | map 10, square (5,9) facing north, column 0 row 4 |  |
| `tile:10:9cd3ee8ee1c839dc72e9a0f3397c9a3eca290c91b139681913b41cec040eafe1` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (6,2) facing north, column 9 row 4 |  |
| `tile:10:9f0a3873b1ebc033c08dac5a89a1406486efe7e2716039de2fc094d67c9cd6af` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (5,8) facing east, column 10 row 5 |  |
| `tile:10:a05b5b7f4aa83af7c5bc77036027f53a71271cb793859f10195e8491177b1680` | 8X8D4 block 212 tile 69 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (4,0) facing north, column 9 row 2 |  |
| `tile:10:a0fafe89a50d8fb9711f66e88782233a37c9065a6359dcfc1003cd81e3b1badb` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,2) facing north, column 10 row 5 |  |
| `tile:10:a140560f1b9d37e69e468d460d41fc3e20867d4c9db0df38292206c241c9ce8b` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (7,0) facing south, column 4 row 4 |  |
| `tile:10:a142fc82906989b280ff45cff046a06c2a111491e02cb21e1b81d234f4b15a95` | 8X8D4 block 212 tile 13 over 8X8D4 block 20 tile 44 over 8X8D4 block 212 tile 34 over the ground colour 8 | map 10, square (7,5) facing south, column 0 row 7 |  |
| `tile:10:a4b738e7451b56fbfe34dbe6b641a5307a13fc4eba966ce5c110684be75d94e8` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 63 over the ground colour 8 | map 10, square (13,3) facing south, column 0 row 6 |  |
| `tile:10:a5dc396408f6b5006c289d20cd408bdd153add80afef7888454ac23f85b8c452` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 32 over sky colour 14 | map 10, square (7,2) facing north, column 3 row 4 |  |
| `tile:10:a6ec66c00738a10802fa06305da983a987502ce34b19d200f4ec09e5c49cd8dd` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 11 over sky colour 14 | map 10, square (4,9) facing east, column 3 row 4 |  |
| `tile:10:a8f235d4195dd099bf661f1ef42c0c1392ea08e3bddb692285c946fd629d073a` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (11,6) facing south, column 3 row 5 |  |
| `tile:10:a9dae47a18e2117d1ab7bca4510e712fc844a7cd49bc52c26c60c52ecfef55ac` | 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 17 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,2) facing north, column 9 row 5 |  |
| `tile:10:aa117adfa2845a4f95c1e908510468d6dd327736c7654925008cd0b29526d20d` | 8X8D4 block 212 tile 13 over 8X8D4 block 20 tile 32 over sky colour 0 | map 10, square (7,2) facing west, column 9 row 3 |  |
| `tile:10:aba7b4e9e7f1159cde621efd9719bdcfa2670d8fd9d32aea436f8e6a9568f38b` | 8X8D4 block 212 tile 12 over 8X8D1 block 203 tile 18 over the ground colour 8 | map 10, square (7,5) facing south, column 1 row 6 |  |
| `tile:10:abc555e0d1f2ea34a7a142b99d7bd69b3e83ce8eca952cabbad7075f736290f7` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 23 over sky colour 14 | map 10, square (7,1) facing east, column 9 row 2 |  |
| `tile:10:ac0612b696ede71ad4be8a47baa09a8cc353f233d75ee50aa397527cc14153d0` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 38 | map 10, square (14,4) facing west, column 9 row 5 |  |
| `tile:10:ac83452c4fa65a00957db4f06ba9a810ecc3b26af4221d431c43c46f078e5c22` | 8X8D4 block 212 tile 37 over sky colour 14 | map 10, square (7,0) facing east, column 9 row 4 |  |
| `tile:10:ad9d6d15211cb30a39c096d08697fe341780c5ea2f9ecee2da7411d54ec5360a` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (7,5) facing south, column 1 row 4 |  |
| `tile:10:ae1a5c0b6a3bc19f9f9746d9920f4f062c6748d4eb71c96a56b7ba7301ae762a` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 43 | map 10, square (5,9) facing south, column 9 row 7 |  |
| `tile:10:ae541f4e883e4672e84ea7cb3c19816287fd801e759bfc5a1486595f69aecddf` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 9 over 8X8D4 block 211 tile 11 over sky colour 14 | map 10, square (5,9) facing north, column 3 row 4 |  |
| `tile:10:afdf76f756ab1cd4cbcbf6bfd3d7bf80f36c2696c50d20a9fcce720378df6336` | 8X8D4 block 212 tile 13 over sky colour 14 | map 10, square (0,0) facing south, column 9 row 2 |  |
| `tile:10:b0c0ab467d10b95ecd582ca7ab1b5a65f3362c943c8c392637c7dab351fa9ef2` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 12 over the ground colour 8 | map 10, square (4,9) facing east, column 3 row 6 |  |
| `tile:10:b0e1220d3ed9140681e1fafebeebc4722b99433f513b02f8075193cfe6e18366` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 14 over the ground colour 8 | map 10, square (5,9) facing north, column 2 row 8 |  |
| `tile:10:b138843b9beb386f4f0fbd5e04bbba74d6899e3236925e4a765d232cacfdcf9b` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 44 | map 10, square (7,5) facing south, column 0 row 5 |  |
| `tile:10:b17c814db2072861c14c6bd305f01fafd29f266e705b2de48599672fe88950e1` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 19 over the ground colour 8 | map 10, square (5,8) facing east, column 10 row 6 |  |
| `tile:10:b1e12f7ce311b32fd74a6085b6b86855f98b5ef1a3030a27ad1d9ecf6e8bc61c` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 17 over sky colour 14 | map 10, square (3,9) facing east, column 4 row 4 |  |
| `tile:10:b34c50b1c634487cd1604e81b50f34edb691977cd62d932bc9b75b118a5b0f6f` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 36 over sky colour 0 | map 10, square (5,8) facing west, column 0 row 3 |  |
| `tile:10:b3a0943d3b20b2d900050e06a617c5f140dd112b045a83abd79df37f8a5b881d` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 13 over the ground colour 8 | map 10, square (4,9) facing east, column 2 row 7 |  |
| `tile:10:b48d2788be1714373b8b6367016426678b3f3aea36684017290edf3f08e577ca` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (14,3) facing east, column 9 row 4 |  |
| `tile:10:b541997ad2fd8266c968ec517442b80aedd55a99f6f20d32c1cf4b75de38ee82` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 42 | map 10, square (14,4) facing west, column 9 row 6 |  |
| `tile:10:b60c80bd9fa7c0f3f9365ed3e02cbc05adf9c0f159bfa160c92b023cf77ee74a` | 8X8D4 block 212 tile 10 over 8X8D4 block 211 tile 9 over sky colour 0 | map 10, square (7,1) facing west, column 0 row 4 |  |
| `tile:10:b65c0fd83fe2906c5ec4d91a67557a1b7e271ac01e1c9c8f89ed384298a084be` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 38 | map 10, square (6,8) facing west, column 1 row 5 |  |
| `tile:10:b6638ca7a64fb989edbb158961e76f99b54b37b9511f6411d1ce56f5b52af315` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (8,5) facing west, column 3 row 3 |  |
| `tile:10:b6b1d16253465e025e611f4c38fc46aabde14ca559cc0051a6f3b78bc88675a5` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 36 over sky colour 0 | map 10, square (7,5) facing south, column 0 row 3 |  |
| `tile:10:b702738d2c54e4121204e289a267711cd18710bd25727a4cab794a4d23621b28` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 28 | map 10, square (9,8) facing west, column 4 row 4 |  |
| `tile:10:b7588eb0310beeb062e93fb581f163c77c927e3f78853f845adf9abba52b95fe` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 45 | map 10, square (5,9) facing south, column 10 row 2 |  |
| `tile:10:b89d8e3b00ed929aff225301d8c264a73e3ef165db7492b9e21dbf6abbcaa96e` | 8X8D4 block 212 tile 10 over 8X8D1 block 203 tile 17 over sky colour 14 | map 10, square (9,8) facing north, column 0 row 3 |  |
| `tile:10:b8ff74b52cf900e717576b042c15d1db98997537ecde2c4f5e0f56172994f6c8` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 38 | map 10, square (14,3) facing west, column 1 row 6 |  |
| `tile:10:b9b882f2bf6366e052126e2c7feafee970b82616be597c632c350d4e23d230c1` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 11 over sky colour 14 | map 10, square (11,6) facing south, column 3 row 4 |  |
| `tile:10:badc78d73bebf448cec3d396966cee6d76ab9649764d19281994cecb24158988` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 15 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (13,3) facing east, column 8 row 5 |  |
| `tile:10:be8e08bb890f34cb2d69f036e5b86b551fc771995dffd2ba963b7a0529bbd3d6` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (5,9) facing west, column 2 row 2 |  |
| `tile:10:bf70c2c6204ef16d933f77162e4c3eeb2304946758d1cc8b121d909d512f3a5b` | 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (0,0) facing east, column 7 row 3 |  |
| `tile:10:c46991b29508ea1ea602602dc4dd8074203a97c4aa801bb16f2c6d6f7737054d` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (6,7) facing west, column 0 row 4 |  |
| `tile:10:c57f1bfc19626576800dbc2ec33883587addb2e68f146d84fe65dcac765b12c9` | 8X8D4 block 212 tile 10 over sky colour 14 | map 10, square (0,0) facing north, column 0 row 1 |  |
| `tile:10:c611d66765b9ab7deed92448ee0b96e10764d0ee7de8a927814c1e4b77014c72` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 36 over sky colour 14 | map 10, square (7,5) facing south, column 0 row 3 |  |
| `tile:10:c86aaa73384a7c8d0c5ec413557f8691ce33124d29f009557a96ffad347c95c6` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 8 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (14,3) facing east, column 10 row 6 |  |
| `tile:10:c8d32f5ed7232cd59b50ac58c57f4225942f6c5d7028313bd72b460c0cf04d71` | 8X8D4 block 212 tile 12 over 8X8D1 block 203 tile 30 | map 10, square (7,2) facing west, column 10 row 4 |  |
| `tile:10:c9480d31e4e68ea5f51e4dfa5fa34e42109242c5114cbf837b626859177ab1df` | 8X8D4 block 212 tile 12 over 8X8D4 block 211 tile 8 over sky colour 14 | map 10, square (11,6) facing east, column 10 row 4 |  |
| `tile:10:c9ef1bd59b71657d3219abf1a97eb994cfeea7da719cac4353ba4c79ec9f60a0` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over sky colour 14 | map 10, square (0,0) facing north, column 2 row 3 |  |
| `tile:10:cae47878ef94ef0410910af286f108de8a107dd964055e50dd27b64813906d3d` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 44 | map 10, square (14,3) facing west, column 0 row 8 |  |
| `tile:10:cb2c9c569e30cae46fad861f9723952b8272ac6efe3cc60fd69575aef371b6a9` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 25 over sky colour 14 | map 10, square (5,8) facing west, column 1 row 4 |  |
| `tile:10:cbb6a76ab4f5aa95650ce4ce121a858ea22352e3221eb4ab29130feded18a6d6` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 37 over the ground colour 8 | map 10, square (5,9) facing north, column 3 row 7 |  |
| `tile:10:cc5b642fbef6aa6ba275d99bd891158034f823171258dda21055a900e35a9152` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (9,8) facing south, column 9 row 5 |  |
| `tile:10:cf91a7d470c17a110c0792b23d7b92433c119e471d6a0d1950b31e9f020db552` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (13,2) facing east, column 10 row 4 |  |
| `tile:10:cf9ab1f26b8abc8126377d4d0578449e0aab1312d50ab6c5d66f7fcc6b5b6367` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 47 | map 10, square (4,9) facing south, column 0 row 4 |  |
| `tile:10:cfc159cae185f615ba8ac0f6cc9b550dc6deaeb4ac06a665521273fa40d82857` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 29 | map 10, square (7,5) facing south, column 1 row 5 |  |
| `tile:10:d053f36e73b034d5dd241604784450a9f1bf63f702967d53ab2cb4e37bfb6e7b` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 2 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (9,9) facing south, column 10 row 5 |  |
| `tile:10:d26db4f89906ef7b0525873446dbf97bf46620cdd23f1733f89169f296335fc4` | 8X8D4 block 212 tile 15 over 8X8D1 block 203 tile 12 | map 10, square (7,3) facing south, column 4 row 5 |  |
| `tile:10:d2c65646ff2eaff57bc491f7a63af82a42e825f10905de676a6af4041ed2b12f` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 45 | map 10, square (14,3) facing west, column 0 row 7 |  |
| `tile:10:d2c73b79915c33ef1961542c3eb8323d63cda2e70414b69c20439ccb64e558c0` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 20 tile 33 over 8X8D4 block 212 tile 69 over sky colour 14 | map 10, square (7,2) facing north, column 4 row 4 |  |
| `tile:10:d432f41536db28b0bf07bda83e4b7958bf841a4b1e3d8d3ce6ad14107da4fc04` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 12 over 8X8D4 block 211 tile 17 over 8X8D4 block 211 tile 10 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,9) facing west, column 9 row 5 |  |
| `tile:10:d4c76d115513bec4d3b39db987bfc77a792725cde837c16ee2a6c845ec60a5a8` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (14,3) facing east, column 10 row 4 |  |
| `tile:10:d55fe5f5ce8e5d88c7f43d8c99dcc0fe7f092682684e7a9b8d5ae2b83407b193` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over the ground colour 8 | map 10, square (4,9) facing north, column 10 row 7 |  |
| `tile:10:d6446392478b56747b13650643877bf6e0d05d9d3b19c2c27fe39bb921518c08` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (14,3) facing east, column 9 row 5 |  |
| `tile:10:d8a282ffc83afe97413b11fa9a3c131980092329fe26559769ede23c758eb4c7` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 12 over sky colour 14 | map 10, square (5,8) facing south, column 8 row 3 |  |
| `tile:10:d9dcf90008ac87363f07d9c94412391f5a7bb68b92df58bfdf6d06f5df118130` | 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (0,0) facing north, column 0 row 0 |  |
| `tile:10:d9fd551f8b88120e3885a5aaa6e4943b320057fa600708b93f8e0022a16fba62` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 28 | map 10, square (4,8) facing south, column 2 row 5 |  |
| `tile:10:dc27f6922a34f63f33e87722b2995294d7226b9de7ae0d935d8e34692d39cbbe` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 47 | map 10, square (4,9) facing south, column 0 row 8 |  |
| `tile:10:dc8fe60700b6bd617e255807bd6087f1b234c8e135d6d807eca69f65451571d4` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 47 | map 10, square (7,5) facing south, column 0 row 6 |  |
| `tile:10:dd058b46799c91fc09285a93508c7c0f18591f7cd61576a641ca7b46463723c1` | 8X8D4 block 212 tile 14 over 8X8D1 block 203 tile 29 | map 10, square (9,8) facing north, column 0 row 5 |  |
| `tile:10:dd1c03ebe5144895825f6aef25d7962823117d1749c78201d5b15741d18b2063` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 42 | map 10, square (14,4) facing west, column 9 row 4 |  |
| `tile:10:de6309f25dc63705e3b50cf85e87021e9669cb93fbf5d4635354b0f727843aa7` | 8X8D4 block 212 tile 14 over 8X8D4 block 211 tile 13 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (6,9) facing west, column 8 row 5 |  |
| `tile:10:de7ea5e0df628e5cab5c2fd230d75484d08893061562d5e6673fc62f1045118e` | 8X8D4 block 212 tile 26 over the ground colour 8 | map 10, square (2,0) facing west, column 6 row 6 |  |
| `tile:10:dfb5efae2ac92a779337e22db4bcaf23a52024b1fb82ff9bd5ae3523285b4454` | 8X8D4 block 212 tile 11 over 8X8D4 block 211 tile 10 over 8X8D4 block 211 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 10, square (7,1) facing west, column 1 row 5 |  |
| `tile:10:dfc2e732125514ef3176c0a0fd9520aadbf9bc94b72a0ebdcbaff82c240dfc29` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 18 over the ground colour 8 | map 10, square (5,8) facing west, column 1 row 6 |  |
| `tile:10:e00a0a01192f85b53c0b3e43e5925d4e30f85b92d9d16c45ac13fec3ba252d2e` | 8X8D4 block 212 tile 10 over 8X8D1 block 203 tile 30 | map 10, square (9,8) facing north, column 0 row 4 |  |
| `tile:10:e10ce62d1e9e92a3f56424c7302f99509467305cf3116960da157a1732f2dc07` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 32 | map 10, square (6,8) facing west, column 0 row 6 |  |
| `tile:10:e1c17e2542e756cac630f9787ec3cf75b2fc9a5e07420fef4334a51a6d4584bd` | 8X8D4 block 212 tile 10 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (5,8) facing west, column 0 row 2 |  |
| `tile:10:e1d131e063b35bc937d40a94a54f76753be96b29c3247e75a54ca3d8efbc0fd5` | 8X8D4 block 212 tile 17 over sky colour 14 | map 10, square (0,0) facing east, column 4 row 4 |  |
| `tile:10:e3378e3931c4899128747662b70483239837e847878861eb29c56522216f97d8` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 10 over sky colour 0 | map 10, square (4,9) facing east, column 2 row 3 |  |
| `tile:10:e557b1473bb9476d53ce3455982396fc626dbc2e3f7242947f4847180bd8e846` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 7 over sky colour 0 | map 10, square (4,9) facing north, column 9 row 3 |  |
| `tile:10:e614d6875f92ef22f3386fb70663bb674c2acfc4f27dec853bd495922ca0f6aa` | 8X8D4 block 212 tile 13 over 8X8D4 block 20 tile 32 over sky colour 14 | map 10, square (7,2) facing west, column 9 row 3 |  |
| `tile:10:e6da74b6c0fb72f0626a479ac85563ea9e4431ae14098d0c92e7d6b3b6b2dac0` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 41 | map 10, square (5,8) facing south, column 8 row 4 |  |
| `tile:10:e708e27333d5fb6e1180b5c5ec88b30235bc5213ea09ac9af9598293936ff119` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 27 over the ground colour 8 | map 10, square (4,8) facing south, column 2 row 6 |  |
| `tile:10:e97b6d1e4da45bb6088151d92deace14ebb1a640720fa7f0a6f40561d030d845` | 8X8D4 block 212 tile 13 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (14,3) facing east, column 9 row 4 |  |
| `tile:10:eab7dae1f897311e3d12aa9a8725b3b4c10ba9ca16d259013adb3e2ea236f2f9` | 8X8D4 block 212 tile 14 over 8X8D4 block 212 tile 41 | map 10, square (14,3) facing west, column 0 row 6 |  |
| `tile:10:eb2e19785d249fd32c2ceeb2ed6e7f3868902b501c57c70ed048011f3a790828` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 46 | map 10, square (5,9) facing west, column 2 row 6 |  |
| `tile:10:ed15a8d5dad9828ca8cf96101580e3188a5d42516567b53cddbbef803a788b58` | 8X8D4 block 212 tile 13 over 8X8D4 block 211 tile 34 | map 10, square (11,6) facing east, column 9 row 5 |  |
| `tile:10:edf2aa3c0fb58b3143f0720d55782303c9a0c0dac47810140257594f76c5832e` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 17 over sky colour 14 | map 10, square (4,9) facing east, column 4 row 4 |  |
| `tile:10:ee69b61212e527897db8f696a9342009e68e2370ea8d095837ef0e62b60b3960` | 8X8D4 block 212 tile 12 over 8X8D4 block 212 tile 42 | map 10, square (14,3) facing west, column 1 row 7 |  |
| `tile:10:efe4be18ef9e2a361692ce3e6ea258f6c48165e9be8c859d6640d2a25596167c` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 6 over sky colour 0 | map 10, square (6,7) facing west, column 0 row 4 |  |
| `tile:10:f335e4e0cddad5a028c1697be330c5a6cd61c95870f0545fce426d68129ae43c` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 47 | map 10, square (14,3) facing south, column 7 row 6 |  |
| `tile:10:f40f0576e72b021ecbc2ebbd28760a5c04dc1fe80a1e32f0e1c697e76a73d211` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 19 over the ground colour 8 | map 10, square (7,1) facing south, column 7 row 6 |  |
| `tile:10:f43b6f3b537fe66ab2c661c1e97dd7b5898aee0c79b655c12dc1ffaecd9eed10` | 8X8D4 block 212 tile 12 over sky colour 14 | map 10, square (0,0) facing south, column 10 row 1 |  |
| `tile:10:f4b343fbd228ad424f1da2ffd4dfb7f99698ab5afb357ef1c85a0f3bf6d60c36` | 8X8D4 block 212 tile 69 over 8X8D4 block 212 tile 6 over sky colour 14 | map 10, square (4,0) facing north, column 9 row 2 |  |
| `tile:10:f59f6a4d60416539ffa6dee2a31133c92436e177cb6ea37c3ad260b5861c3d29` | 8X8D4 block 212 tile 10 over 8X8D1 block 203 tile 17 over sky colour 0 | map 10, square (9,8) facing north, column 0 row 3 |  |
| `tile:10:f875831ff78d2dd5a809212628e2096bf5c975ed33f2bf84209cf90f3c36081e` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 32 | map 10, square (4,9) facing east, column 8 row 6 |  |
| `tile:10:fa7d780811a8109cf0f984657502c58b8a04ec2f97ec483c903fffcc3034c43a` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 42 | map 10, square (14,3) facing west, column 1 row 3 |  |
| `tile:10:fa8378052a917cfd7417f3b21656882168cad88ac373647dfe62750daaace276` | 8X8D4 block 212 tile 11 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 25 over sky colour 0 | map 10, square (5,8) facing west, column 1 row 4 |  |
| `tile:10:fb35f18df237600c795b421b9a85cc673d226f0077fc6d40a36174c7f271b46a` | 8X8D4 block 212 tile 6 over 8X8D4 block 212 tile 6 over 8X8D4 block 20 tile 33 over sky colour 14 | map 10, square (7,3) facing north, column 4 row 4 |  |
| `tile:10:fcc2c97cdc77e09e833b75065d93f3411d621eaecf4efb5d57cdd2f698a02181` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 6 | map 10, square (5,9) facing north, column 2 row 5 |  |
| `tile:10:fdd0c36762c48c74479ce42759a7c3597708c1783b30d61a468535c05cf4fa5d` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D1 block 203 tile 23 over the ground colour 8 | map 10, square (4,9) facing east, column 7 row 7 |  |
| `tile:10:ff08b037741bc8614c94b1782c4c1bfd1558418f16eae01d5217300ad9292d47` | 8X8D4 block 212 tile 7 over 8X8D4 block 212 tile 7 over 8X8D4 block 211 tile 29 | map 10, square (7,0) facing south, column 4 row 5 |  |

### Area 11: The Training Hall (109)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:80e3c5025a5f43f7991f9fb1c372374d1d0c7cb666c72aa6115e3e381ccd814e` | the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 0, square (8,4) facing east, column 5 row 5 | `zhentil-floor-refinement-far-threshold.png` (area 0, 8, 21, 24, 28) |

#### shared tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:323c71332298aeae05cfee4eb5855d831835c8a068440a0f21f6f96ee43b2f9b` | 8X8D1 block 203 tile 17 over sky colour 11 | map 0, square (0,0) facing north, column 0 row 0 | `room-tile-00.png` (area 0, 2, 3, 4, 5, 6, 8, 15, 20, 21, 24, 26, 31) |
| `tile:11:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 0, square (11,6) facing west, column 0 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29) |
| `tile:11:7a62f42874a318807e50c5f76958ec89a88041ebcdbe85f63c86b39a4adb37d7` | 8X8D1 block 203 tile 34 over the ground colour 6 | map 0, square (3,1) facing west, column 6 row 6 | `orc-door-b39a4adb37d7.png` (area 0, 2, 3, 4, 5, 6, 7, 9, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |

#### tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:daa0c6008046802d652f2f0fe732ebf6d5e55819c0757e8ca57e8bbeeb8294f7` | 8X8D1 block 203 tile 16 over 8X8D3 block 103 tile 6 over sky colour 12 | map 0, square (5,5) facing west, column 9 row 1 | `new-phlan-street-paving-joins-0-daa0c6008046.png` (area 0) |

#### tile set 8X8D3 block 101 (10)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:09be609429c4e2db72e68769253a40f08fe1e0bf65055f356ed165cefcb83c91` | 8X8D3 block 101 tile 63 | map 0, square (0,0) facing south, column 7 row 4 | `new-phlan-gate-65cefcb83c91.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |
| `tile:11:91149bb7ce520ef1bf6d3fbbe7957b53c612718db98f28fb3a7bedb86c0b1ea5` | 8X8D3 block 101 tile 16 over sky colour 11 | map 0, square (5,2) facing east, column 9 row 4 | `new-phlan-harbor-paving-joins-0-91149bb7ce52.png` (area 0) |
| `tile:11:a709a24cc9b6b6e327458b686dabf569d04684f62e502130d50ddfa64bbd493f` | 8X8D3 block 101 tile 36 | map 0, square (1,0) facing west, column 2 row 6 | `new-phlan-gate-dfa64bbd493f.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |
| `tile:11:aa62939a3bc0ac6b7c3185e08b6b70c6a6717331f7b141187d51a65641a33f83` | 8X8D3 block 101 tile 37 | map 0, square (0,0) facing south, column 8 row 3 | `bane-outer-courts-terrain-aa62939a3bc0.png` (area 0, 2, 8, 14, 15, 18, 24, 29, 31) |
| `tile:11:af86e7c9eb5381ae57023c740c0d9c788d491ec24ed18487c0f2814547e972e1` | 8X8D3 block 101 tile 49 | map 0, square (0,0) facing south, column 8 row 7 | `new-phlan-gate-814547e972e1.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |
| `tile:11:b24a0082a3a043b8f572042b955363c4f154214f73877e027dd636eaa764e18b` | 8X8D3 block 101 tile 47 | map 0, square (1,0) facing west, column 2 row 5 | `new-phlan-gate-36eaa764e18b.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |
| `tile:11:b4045d005d3dc2b8406945d3af18f0dfe1e86a3eeef827c3c123906c75ba2a5a` | 8X8D3 block 101 tile 21 | map 0, square (10,0) facing west, column 0 row 5 | `new-phlan-gate-906c75ba2a5a.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |
| `tile:11:d4b85e9a1aca4d92e6837bc5a14ed9b1128634ac91d66bf98d1eac483c88b784` | 8X8D3 block 101 tile 22 | map 0, square (9,1) facing west, column 3 row 5 | `new-phlan-covered-market-terrain-d4b85e9a1aca.png` (area 0, 8) |
| `tile:11:dc6c3d5510b0653401790072e22a586a17ac1d36bc9b0f782ea2f57ec58b7828` | 8X8D3 block 101 tile 1 | map 0, square (5,2) facing east, column 9 row 5 | `podal-south-arcade-terrain-dc6c3d5510b0.png` (area 0, 18, 24) |
| `tile:11:efdc8d933de212d5d88ac5d346f07eceecfa8a614ad77866a1acae51b6ecb6fb` | 8X8D3 block 101 tile 35 | map 0, square (0,0) facing west, column 1 row 8 | `new-phlan-gate-ae51b6ecb6fb.png` (area 0, 2, 8, 14, 15, 18, 24, 26, 29, 31) |

#### tile set 8X8D3 block 102 (46)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:14ba42f38a9f3edda8214f1dec22d94f520717c59573aa456e72854416d753d4` | 8X8D3 block 102 tile 10 | map 0, square (10,8) facing north, column 5 row 5 | `slums-trade-row-terrain-14ba42f38a9f.png` (area 0, 5, 7, 20) |
| `tile:11:15450d2266965cb35a6f45fd06dbf087e58bdd114e2cf88e56dba3e596898eb1` | 8X8D3 block 102 tile 52 | map 0, square (13,8) facing south, column 2 row 4 | `slums-trade-row-terrain-15450d226696.png` (area 0, 7, 20) |
| `tile:11:1930bf3912f12f181acb825e6e35b4935e2fbbcf9c15b721db739476417319a4` | 8X8D3 block 102 tile 19 | map 0, square (10,8) facing west, column 10 row 7 | `new-phlan-south-market-terrain-0-1930bf3912f1.png` (area 0) |
| `tile:11:2c07b5fab1efd528ab309be6c35e564bb46750de4ff813de5ff640b6ee22c2bf` | 8X8D3 block 102 tile 17 | map 0, square (13,8) facing west, column 1 row 6 | `slums-trade-row-terrain-2c07b5fab1ef.png` (area 0, 7, 20) |
| `tile:11:34c8e1f49742be249357aba1a5180b7fbd7dff4350ff758ba579534fcd9cdb70` | 8X8D3 block 102 tile 57 | map 0, square (13,8) facing east, column 10 row 3 | `slums-shop-frontage-terrain-34c8e1f49742.png` (area 0, 7, 20) |
| `tile:11:377420f76a2a02743aa7246fe5abc2356c698f47930ac0cbead1e1b62d2f1e44` | 8X8D3 block 102 tile 29 | map 0, square (8,8) facing south, column 8 row 5 | `valjevo-merchant-branch-terrain-377420f76a2a.png` (area 0, 5, 7) |
| `tile:11:39cc1df080453d41cc72fbb1070c6f88e040bb5e36b16cb6cd948bd07b1180f5` | 8X8D3 block 102 tile 6 | map 0, square (10,8) facing west, column 10 row 4 | `new-phlan-south-market-terrain-0-39cc1df08045.png` (area 0) |
| `tile:11:491c0e9a5a1fe2680ecad326e5a4a7920df0f9e348ad8b993c763c95cf886194` | 8X8D3 block 102 tile 46 | map 0, square (13,8) facing east, column 10 row 7 | `slums-worn-courtyard-491c0e9a5a1f.png` (area 0, 7, 20) |
| `tile:11:4e24210255ed185eb54a70dc98aae7c1beeeb78e5107d1d01b5a931dcae9a8ae` | 8X8D3 block 102 tile 59 | map 0, square (15,8) facing south, column 10 row 4 | `slums-worn-courtyard-4e24210255ed.png` (area 0, 7, 20) |
| `tile:11:5073fed19218b31e25fe949a437664fe32b7c96cbaa20c93e5e796af062a2ecb` | 8X8D3 block 102 tile 31 | map 0, square (0,0) facing east, column 6 row 6 | `route-5073fed19218.png` (area 0, 4, 5, 6, 7, 8, 20) |
| `tile:11:542aa3de288bfb705a13cf971acc398ce6f17f10c113a97d2339053598b2cce3` | 8X8D3 block 102 tile 26 | map 0, square (0,0) facing north, column 9 row 7 | `orc-rubble-053598b2cce3.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:582935262251c3c3b53ec076d372c7bebfc34f9076968d8314e319ea8cca75bd` | 8X8D3 block 102 tile 18 | map 0, square (8,8) facing south, column 7 row 5 | `valjevo-merchant-west-terrain-582935262251.png` (area 0, 7) |
| `tile:11:5b786e63e19e9e670c1f1c5e88c35e2a13f2d0706d213c1aae0f2473145467ca` | 8X8D3 block 102 tile 7 | map 0, square (9,8) facing north, column 9 row 5 | `valjevo-lower-trim-5b786e63e19e.png` (area 0, 5, 7, 20) |
| `tile:11:624c54394650999904d165e8083586d2c5d9dea1cfb089dcbb22e946cbbf6f37` | 8X8D3 block 102 tile 58 | map 0, square (13,8) facing east, column 9 row 3 | `slums-shop-frontage-terrain-624c54394650.png` (area 0, 7, 20) |
| `tile:11:6350a67cee5ed480bf0c6c1c98180dff777b31313ae09d346fa708c132025c0a` | 8X8D3 block 102 tile 60 | map 0, square (9,13) facing west, column 7 row 4 | `new-phlan-south-market-terrain-0-6350a67cee5e.png` (area 0) |
| `tile:11:6a31f8112a44a50377f8425ac2fde4f502b684c316174a4bdbd9d61f4c2b2d4b` | 8X8D3 block 102 tile 33 over sky colour 11 | map 0, square (0,0) facing south, column 2 row 2 | `valjevo-dungeon-doorway-terrain-6a31f8112a44.png` (area 0, 3, 4, 5, 6, 8, 20) |
| `tile:11:76cac3df22ca0d41b487785b4d4d96f57f49be237438fa17e2e8813b0e536b56` | 8X8D3 block 102 tile 49 over sky colour 12 | map 0, square (1,1) facing east, column 8 row 2 | `new-phlan-north-avenue-terrain-76cac3df22ca.png` (area 0) |
| `tile:11:78d49be0ec8d85548a56d9b83e8384b76643e1d87889ea01c72df92930638ba6` | 8X8D3 block 102 tile 56 | map 0, square (13,8) facing east, column 9 row 4 | `slums-shop-frontage-terrain-78d49be0ec8d.png` (area 0, 7, 20) |
| `tile:11:7fa58d10584ec9c662b69570d9e0b6e0b3b1ad3eecfb3a259959f7fc136b792c` | 8X8D3 block 102 tile 42 | map 0, square (9,8) facing east, column 3 row 7 | `valjevo-lower-trim-7fa58d10584e.png` (area 0, 5) |
| `tile:11:804ed836f1ee59cdf32cc2c761738edb955337d1de0a5b1094116703ea7a2f93` | 8X8D3 block 102 tile 33 over sky colour 12 | map 0, square (1,1) facing north, column 0 row 0 | `new-phlan-north-avenue-terrain-804ed836f1ee.png` (area 0) |
| `tile:11:819bbf4da7d50ea93fca2fc26d008607ba5e0526948870150042383e992d7c8c` | 8X8D3 block 102 tile 9 | map 0, square (10,8) facing west, column 10 row 6 | `new-phlan-south-market-terrain-0-819bbf4da7d5.png` (area 0) |
| `tile:11:901342053079a4679add86d120a4add26a3058e08fb05eb433ee4f7a3927f4a2` | 8X8D3 block 102 tile 50 over 8X8D3 block 102 tile 30 | map 0, square (13,12) facing south, column 1 row 5 |  |
| `tile:11:97b40cd88297680a69a47a9f4a38c9abc2eeea77bd894d37ce767387168bd6fe` | 8X8D3 block 102 tile 53 | map 0, square (13,8) facing west, column 1 row 4 | `slums-trade-row-terrain-97b40cd88297.png` (area 0, 7, 20) |
| `tile:11:a0c0c9c245686e8bfba08abd377e3a48184c276695b008174f605d7a2f83995e` | 8X8D3 block 102 tile 21 | map 0, square (9,8) facing east, column 2 row 5 | `valjevo-lower-trim-a0c0c9c24568.png` (area 0, 5, 7, 20) |
| `tile:11:a2c41c4f0c4fa31620dac8ca4d42c5425fdd1ba3f700cc05c8471549a309d990` | 8X8D3 block 102 tile 63 | map 0, square (9,13) facing west, column 8 row 4 | `new-phlan-south-market-terrain-0-a2c41c4f0c4f.png` (area 0) |
| `tile:11:a8ed6d6150e8b242b1142b13dcee6be84fefbeac21ef725b37b80cd018dea6a6` | 8X8D3 block 102 tile 30 | map 0, square (10,1) facing south, column 5 row 5 | `orc-rubble-0cd018dea6a6.png` (area 0, 3, 4, 6, 8, 20) |
| `tile:11:ad4007119c61bf7d6666c19092a0860486034153aa08a403fd206f9cd1940357` | 8X8D3 block 102 tile 15 | map 0, square (10,8) facing west, column 9 row 8 | `valjevo-merchant-west-terrain-ad4007119c61.png` (area 0, 7) |
| `tile:11:af4d0380d89a958e265764fe02dcdcba866eb25f25e1950bb6e4aa05ee0bd059` | 8X8D3 block 102 tile 2 | map 0, square (0,0) facing east, column 8 row 3 | `route-af4d0380d89a.png` (area 0, 5, 7, 8, 20) |
| `tile:11:b8645fd4952e35317fa061a3be9a84e98b48141ba4090c3c1fa13f323d8720d5` | 8X8D3 block 102 tile 1 | map 0, square (13,8) facing west, column 0 row 6 | `slums-trade-row-terrain-b8645fd4952e.png` (area 0, 7, 20) |
| `tile:11:bd7ebf5b0e105d0f47a6c2dc24787872525ccdbe7e7081220f314f20085c8728` | 8X8D3 block 102 tile 3 | map 0, square (0,0) facing east, column 10 row 3 | `route-bd7ebf5b0e10.png` (area 0, 5, 7, 8, 20) |
| `tile:11:c109062bae81c00497c44a59d1a66885bdc4315d382df7c88791f17886541ad0` | 8X8D3 block 102 tile 25 | map 0, square (0,0) facing north, column 9 row 8 | `orc-rubble-f17886541ad0.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:c6c238d6832c50eb322fcf219d1ed5b19c1e59e4da05cc0f76e9053155ad4e1d` | 8X8D3 block 102 tile 28 | map 0, square (0,0) facing south, column 1 row 7 | `orc-rubble-053155ad4e1d.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:ceaa1c6a928af7e169014854674189c9cdbdc41645ce50b1a41756218050daf6` | 8X8D3 block 102 tile 43 over the ground colour 6 | map 0, square (9,7) facing east, column 8 row 8 | `valjevo-terra-cotta-floor-ceaa1c6a928a.png` (area 0, 7) |
| `tile:11:d1c8516a2591d8559a256177aea1794caa4db7259d6978f68de344c1902d1f25` | 8X8D3 block 102 tile 4 | map 0, square (0,0) facing south, column 2 row 4 | `route-d1c8516a2591.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:d95ee11282e4e744494473ad77ef9f9eae15e697a6c9b6fbac0dedbcd9289fc7` | 8X8D3 block 102 tile 32 | map 0, square (0,0) facing east, column 4 row 6 | `valjevo-dungeon-doorway-terrain-d95ee11282e4.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:db57986c636ff54578b5d2a864e2bab3b66c4e6e4347add855153b4614000ffb` | 8X8D3 block 102 tile 27 | map 0, square (0,0) facing north, column 8 row 7 | `orc-rubble-3b4614000ffb.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |
| `tile:11:ddf169cd0d8e5a9b7d91c469c73cfb6e6fdc47a98898e2205291ccbbb40a267f` | 8X8D3 block 102 tile 13 | map 0, square (10,8) facing west, column 9 row 6 | `new-phlan-south-market-terrain-0-ddf169cd0d8e.png` (area 0) |
| `tile:11:df30f16f431986f2cd1656a4b4e52c16bef9f85d526fc012b5b3718ca3694c8f` | 8X8D3 block 102 tile 49 over sky colour 11 | map 0, square (0,0) facing east, column 8 row 2 | `route-df30f16f4319.png` (area 0, 4, 5, 6, 8, 20) |
| `tile:11:e1e25d740d96dc559780490d178cccf8720a7224ec2336badb59664c9c44aef2` | 8X8D3 block 102 tile 55 | map 0, square (13,8) facing west, column 1 row 3 | `slums-trade-row-terrain-e1e25d740d96.png` (area 0, 7, 20) |
| `tile:11:e3d609d69fc12018b9f7d110ea30eccc6d91ee967db698226ce57a499e471dd1` | 8X8D3 block 102 tile 54 | map 0, square (13,8) facing west, column 0 row 3 | `slums-trade-row-terrain-e3d609d69fc1.png` (area 0, 7, 20) |
| `tile:11:e6c54d795264af5e30cea8c8db38610f1305aa1395cf05b3c96cd7496f272900` | 8X8D3 block 102 tile 22 | map 0, square (13,8) facing west, column 0 row 8 | `slums-trade-row-terrain-e6c54d795264.png` (area 0, 7, 20) |
| `tile:11:e9660b0895d8aa142fec4c3ddb0f36b80f500aae4c3394f6680314fcaf79ce8c` | 8X8D3 block 102 tile 12 | map 0, square (9,7) facing east, column 7 row 6 | `new-phlan-south-market-terrain-0-e9660b0895d8.png` (area 0) |
| `tile:11:f18965943be25bd3f32240928a4a8bec8ee34b07f230cb1069cac20279caea4a` | 8X8D3 block 102 tile 23 | map 0, square (9,8) facing east, column 2 row 7 | `valjevo-lower-trim-f18965943be2.png` (area 0, 5, 7, 20) |
| `tile:11:fbcbe0dd001b4c1a5fb04f913c956be88ece3e87439fb1b050904da2bb1cf1ec` | 8X8D3 block 102 tile 20 | map 0, square (13,8) facing west, column 0 row 7 | `slums-trade-row-terrain-fbcbe0dd001b.png` (area 0, 7, 20) |
| `tile:11:fec9ae7f67a2d06652571b4104ee754e23f5596dbbae3bd0fa573995cdc2affb` | 8X8D3 block 102 tile 24 | map 0, square (13,8) facing west, column 0 row 4 | `slums-trade-row-terrain-fec9ae7f67a2.png` (area 0, 7, 20) |
| `tile:11:ffdaaae4ccb00ac4c93c500ca5ac7c4be2428beb180d89b1f58902fd2baa34d0` | 8X8D3 block 102 tile 5 | map 0, square (0,0) facing north, column 3 row 8 | `route-ffdaaae4ccb0.png` (area 0, 3, 4, 5, 6, 7, 8, 20) |

#### tile set 8X8D3 block 103 (48)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:11:01af9b25e39aaeea7fb9f20f5f35af970c3507db161604599c9dd2546acbe6d0` | 8X8D3 block 103 tile 46 | map 0, square (5,1) facing south, column 2 row 6 | `new-phlan-building-exits-terrain-01af9b25e39a.png` (area 0) |
| `tile:11:04d5f13cec55cbafc390fc8a362209e64ab3a9416613680ae934c510589a45d1` | 8X8D3 block 103 tile 39 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 10 row 5 | `new-phlan-building-paving-joins-0-04d5f13cec55.png` (area 0, 8) |
| `tile:11:06a65aa8ca1dfc2a534d0d318a8dfc0e7b2bc6dce07bd749d040009ae04d5bf9` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 30 | map 0, square (14,0) facing east, column 7 row 5 | `new-phlan-east-terrace-terrain-06a65aa8ca1d.png` (area 0, 8) |
| `tile:11:11c970c93c97cfd4c3a7dcd5e4b1e720cee1d11696dbcaa41b327b0fa7c4985b` | 8X8D3 block 103 tile 43 | map 0, square (13,0) facing east, column 9 row 6 | `new-phlan-east-terrace-terrain-11c970c93c97.png` (area 0, 8) |
| `tile:11:152143a4081e40b57ab7b78fcb411dad2904f10639cdec53bb0670753811fd6e` | 8X8D3 block 103 tile 40 | map 0, square (13,0) facing east, column 10 row 7 | `new-phlan-east-terrace-terrain-152143a4081e.png` (area 0, 8) |
| `tile:11:198b73b68f171b01b1ab684a61e4d627b04a3e9383ae0d45e9f5434db96b3734` | 8X8D3 block 103 tile 65 | map 0, square (6,0) facing south, column 8 row 7 | `new-phlan-north-avenue-terrain-198b73b68f17.png` (area 0, 8) |
| `tile:11:1a83f260002396d35ecdecff75b4bdfb9225a0f1e09a1cbe43a89760a0df887a` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 3 | map 0, square (12,11) facing east, column 8 row 5 |  |
| `tile:11:1c7fe74cd165e154490774dc234e136d798ab24f3876d90ada11e4aeea9be2eb` | 8X8D3 block 103 tile 51 | map 0, square (6,0) facing south, column 8 row 5 | `new-phlan-north-avenue-terrain-1c7fe74cd165.png` (area 0, 8) |
| `tile:11:27e07df745edb20f8ce9db18e4dc2c69a1e293ba0ec1a1f43be3c56a96eee894` | 8X8D3 block 103 tile 7 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (5,2) facing north, column 1 row 5 | `new-phlan-north-avenue-terrain-27e07df745ed.png` (area 0, 8) |
| `tile:11:2a90a9530957e394ceec691a8f4637ce327c4562b0b792fe311d4fec490a7512` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 26 | map 0, square (13,11) facing east, column 10 row 5 | `new-phlan-east-terrace-terrain-2a90a9530957.png` (area 8) |
| `tile:11:30f3bb975c3bf219afc9b2d64fc0e35835e7c401da3ad597bf5af8d9a439237d` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 30 | map 0, square (13,5) facing south, column 1 row 5 |  |
| `tile:11:451efcf97fe4cb8ea437dd0fba90a08e095423c51c7c23c69dd2f48be9fcead5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 21 | map 0, square (13,3) facing west, column 0 row 5 |  |
| `tile:11:45fd2b8ac4cd01017ae72e5eb3ccb345b678028762c8cb54d90ffd9df0b77739` | 8X8D3 block 103 tile 38 | map 0, square (13,0) facing east, column 10 row 6 | `new-phlan-building-paving-joins-0-45fd2b8ac4cd.png` (area 0, 8) |
| `tile:11:4803f5dc3182db9989861f38067bb331053bbfb52c7799bb976bd19144042bde` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 51 | map 0, square (12,12) facing east, column 9 row 5 |  |
| `tile:11:48ba7aff907865121f0f9abc7acbaf2fbd9aba0e412d942536f0ecc929490d13` | 8X8D3 block 103 tile 54 | map 0, square (15,0) facing east, column 10 row 7 | `new-phlan-east-terrace-terrain-48ba7aff9078.png` (area 0, 8) |
| `tile:11:56d437010922e2491fd52ab5a11720856ef7be017d97cdb02c37308592793d7e` | 8X8D3 block 103 tile 17 | map 0, square (5,2) facing south, column 9 row 4 | `new-phlan-civic-terrain-56d437010922.png` (area 0, 8) |
| `tile:11:5e6ca21cd26fb9dc2194d475c5ba58a893a144c307796462e5ba278a3ed9c93c` | 8X8D3 block 103 tile 52 over sky colour 11 | map 0, square (4,1) facing south, column 0 row 3 | `new-phlan-building-paving-joins-0-5e6ca21cd26f.png` (area 0) |
| `tile:11:611fbe6c87417a20690cf2681fe58644193dae74482c453a4b1139ded0546833` | 8X8D3 block 103 tile 56 | map 0, square (13,1) facing east, column 0 row 6 | `new-phlan-east-terrace-terrain-611fbe6c8741.png` (area 0, 8) |
| `tile:11:646a996d9a877bf5fe36750fd9b9f368be1708dbcb48727b977d49f3e8eee2af` | 8X8D3 block 103 tile 9 | map 0, square (5,2) facing south, column 6 row 5 | `mendor-library-terrain-646a996d9a87.png` (area 0, 15) |
| `tile:11:6ad37cf35c202965922d7096419fef61f87a49b9b7afc8d521913f7f32978264` | 8X8D3 block 103 tile 63 | map 0, square (4,1) facing south, column 0 row 7 | `new-phlan-building-paving-joins-0-6ad37cf35c20.png` (area 0) |
| `tile:11:6c1cb747749f126535687ab0ad6282611445b167249e9df351953352d0be9770` | 8X8D3 block 103 tile 18 | map 0, square (5,1) facing south, column 7 row 5 | `new-phlan-civic-terrain-6c1cb747749f.png` (area 0, 8) |
| `tile:11:6eb0229fba37066c933fd301ebdf2d3f3f95c0aa02edc13b9efcec153f936da1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 38 | map 0, square (7,14) facing west, column 0 row 5 |  |
| `tile:11:75f1a0f0dd8afc085e998eaf410fc0f7c99d4c761883320d34621a03ff50279f` | 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (13,0) facing east, column 7 row 5 | `new-phlan-west-garden-terrain-75f1a0f0dd8a.png` (area 0, 8) |
| `tile:11:79614e8063fe952222ed56df183e9e0623b3995656e248d0c2a01d05284ab9d6` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 32 | map 0, square (14,13) facing west, column 9 row 5 |  |
| `tile:11:811ae3a349c441d47448e1f94f7d2d9f7d9611f40e3177c2d53c418cac59be77` | 8X8D3 block 103 tile 15 | map 0, square (6,0) facing south, column 6 row 5 | `new-phlan-training-paving-0-811ae3a349c4.png` (area 0) |
| `tile:11:8912e73364ab5cc50ba0bce12eed2b990830fa4034cd0a69b34c204b99e1104e` | 8X8D3 block 103 tile 47 | map 0, square (4,1) facing south, column 0 row 6 | `new-phlan-building-exits-terrain-8912e73364ab.png` (area 0) |
| `tile:11:89396b758064cb35796020a5347af3a0f5aa2b40a2a5293e8ae315ba0c1bc7e3` | 8X8D3 block 103 tile 53 over sky colour 11 | map 0, square (5,1) facing north, column 10 row 0 | `new-phlan-street-paving-joins-0-89396b758064.png` (area 0) |
| `tile:11:8ca2144dc7b6314a110c44e27481681e5d6ecce3e173c6abf1fc960ab9929527` | 8X8D3 block 103 tile 24 | map 0, square (3,2) facing south, column 2 row 5 | `new-phlan-civic-terrain-8ca2144dc7b6.png` (area 0, 8) |
| `tile:11:9b6a784556735dc9816f557fcc3d3b175499f936df6fee43202260dad8931b52` | 8X8D3 block 103 tile 16 | map 0, square (5,2) facing south, column 9 row 5 | `new-phlan-civic-terrain-9b6a78455673.png` (area 0, 8) |
| `tile:11:a283214480d9101b4208e2c3c73cd3055746bd9ea8611da11944b013875ee752` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 68 | map 0, square (15,4) facing east, column 9 row 5 |  |
| `tile:11:a8da5e24bdcf3792884e33ceca3a326681bb98295ff41493b81beff0702e768a` | 8X8D3 block 103 tile 57 | map 0, square (13,1) facing east, column 10 row 6 | `new-phlan-landmark-approaches-terrain-a8da5e24bdcf.png` (area 0, 8) |
| `tile:11:adc0a50821b02364997d6bc489a0e237ac8d2e2b6f7ae1bf2b4063dc854b4b23` | 8X8D3 block 103 tile 49 | map 0, square (6,0) facing south, column 8 row 6 | `new-phlan-north-avenue-terrain-adc0a50821b0.png` (area 0, 8) |
| `tile:11:b4b708104f67078b3cb017e33ecb3b43c125f6f424c842fc1511c02b2bc94a64` | 8X8D3 block 103 tile 42 | map 0, square (15,0) facing west, column 1 row 6 | `new-phlan-building-paving-joins-0-b4b708104f67.png` (area 0, 8) |
| `tile:11:b525b489a8bd7af2ce9a0a7e18f3e34317757f604503b5cf1aa2638c11b6431b` | 8X8D3 block 103 tile 19 over sky colour 11 | map 0, square (3,2) facing south, column 2 row 3 | `new-phlan-civic-terrain-b525b489a8bd.png` (area 0, 8) |
| `tile:11:c02eebecd52b47ecb5002e3a6a7677f8b622486d121691f2c81ca99e37ce82e2` | 8X8D3 block 103 tile 44 | map 0, square (14,0) facing south, column 0 row 7 | `new-phlan-east-terrace-terrain-c02eebecd52b.png` (area 0, 8) |
| `tile:11:c10bad57dae4106710a73914d9ac3210d97b15dc1769ae8844b9c978a77214cb` | 8X8D3 block 103 tile 64 | map 0, square (6,0) facing south, column 7 row 7 | `new-phlan-north-avenue-terrain-c10bad57dae4.png` (area 0, 8) |
| `tile:11:c270c2071655b25e35fe8d0c9ff4e75df87ec1c689a81f6e6707da80b462f112` | 8X8D3 block 103 tile 55 | map 0, square (13,1) facing north, column 4 row 6 | `new-phlan-east-terrace-terrain-c270c2071655.png` (area 0, 8) |
| `tile:11:c838dbbfe585cabfa88ae4bf9b6577e4981ad35d3da8eca47cfb1fdb620c9d3b` | 8X8D3 block 103 tile 1 | map 0, square (0,0) facing north, column 2 row 6 | `new-phlan-harbor-lane-terrain-c838dbbfe585.png` (area 0, 8) |
| `tile:11:d26c869894444bd21b6653fccc8965779c2abd71678b6dc7df589317ab2dee30` | 8X8D3 block 103 tile 11 | map 0, square (2,2) facing east, column 9 row 6 | `new-phlan-street-paving-joins-0-d26c86989444.png` (area 0) |
| `tile:11:d31e129c0c2e50debad0b3da0976aa310a242279dab9b105dfa862cbcf7c75a1` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 12 | map 0, square (14,12) facing west, column 6 row 5 |  |
| `tile:11:d4bfebd9881c703ec9c8702d40af2b04c1a0c8a329673f23bef7bc145b267a73` | 8X8D3 block 103 tile 59 | map 0, square (9,7) facing east, column 8 row 6 | `new-phlan-south-market-terrain-0-d4bfebd9881c.png` (area 0) |
| `tile:11:dc911cb26109fedd8420ff441590f02ca7e728df8fa5068ea8aad3bd39309f2e` | 8X8D3 block 103 tile 31 over sky colour 11 | map 0, square (2,2) facing east, column 9 row 4 | `new-phlan-civic-terrain-dc911cb26109.png` (area 0) |
| `tile:11:e2142330f065af697aa1885f9674e8030f32dc4271a7cc34a8b328152ae74717` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 3 | map 0, square (12,12) facing east, column 6 row 5 | `new-phlan-pier-branch-terrain-e2142330f065.png` (area 0, 8) |
| `tile:11:e666336645282e2e81ed4fbf36349293f87706df4ee8a4254c60c330ecd63a73` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing north, column 2 row 5 | `new-phlan-west-garden-terrain-e66633664528.png` (area 0, 8) |
| `tile:11:f2986adcc9d014d449f56d161e9e3b4c2ceae29ccda7cce4aa3a6d936b661287` | 8X8D3 block 103 tile 50 | map 0, square (6,0) facing south, column 7 row 5 | `new-phlan-north-avenue-terrain-f2986adcc9d0.png` (area 0, 8) |
| `tile:11:f6613a058106db88c64183aa031f0c43f9f33676f27b6bf26e5600c0126ae92d` | 8X8D3 block 103 tile 68 | map 0, square (6,0) facing south, column 6 row 6 | `new-phlan-training-paving-0-f6613a058106.png` (area 0) |
| `tile:11:f694be99114d4ada4bbf639d34cb6229464da9146cd4f986fde0c9354e68924d` | 8X8D3 block 103 tile 66 | map 0, square (5,1) facing south, column 2 row 7 | `new-phlan-building-paving-joins-0-f694be99114d.png` (area 0) |
| `tile:11:f9d8fed90af6718c57797bf400bb9116188fb7cbb109b11938af554694e8492e` | 8X8D3 block 103 tile 48 | map 0, square (6,0) facing south, column 7 row 6 | `new-phlan-north-avenue-terrain-f9d8fed90af6.png` (area 0, 8) |

### Area 13: The Kobold Caves (67)

Map 13; WALLDEF8 block 17 (tiles 8X8D8 block 17), block 18 (tiles 8X8D8 block 18), nothing.

#### tile set 8X8D8 block 17 (66)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:13:008a8a2ddc108d18ac526765bf883fcac4d213beef8b3d1b3ee085dc3042c457` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 16 over 8X8D8 block 18 tile 3 | map 13, square (10,9) facing east, column 3 row 3 |  |
| `tile:13:077dcfc01a2bd671fff498fcaaa9e7eca9db4c71ee23b17bb45b22e1248caa9f` | 8X8D8 block 17 tile 7 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 13, square (7,1) facing south, column 8 row 5 |  |
| `tile:13:0a1f056e8ee4c3f7fead2b8df808d00edb9cd08a1ce9116e33ff45bd0c85af85` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 41 | map 13, square (2,12) facing east, column 2 row 5 |  |
| `tile:13:0cd70991e0dd54027a577c13661b9dd6221d3783bb5e24a20bfe4b2346b6062d` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 14 over the ground colour 6 | map 13, square (0,1) facing east, column 10 row 6 |  |
| `tile:13:0d4a90e734e588cff9b9eb8c39e8f4af2338d1a557e0bef2e881828f37368849` | 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 21 | map 13, square (11,8) facing west, column 9 row 6 |  |
| `tile:13:154e4e6e458a64b3ac5e0caf15e0658381a5a779a073b121aa64d7c308ed4863` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 63 | map 13, square (9,9) facing east, column 4 row 5 |  |
| `tile:13:15bc6d30f8e4a9c1b8b86ae26fb2cfe7daf404658772aa35c03266c547a3ef7d` | 8X8D8 block 17 tile 8 over 8X8D8 block 18 tile 25 | map 13, square (1,13) facing north, column 10 row 6 |  |
| `tile:13:196b95f1bf4adc3c2cb10fa739ca2ece0c85262a575cd2834f1ca83c1a979046` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 18 tile 36 | map 13, square (2,3) facing north, column 1 row 5 |  |
| `tile:13:2524b432ddd832bc7aa4cb741deaebe4d89aff0c3279a6784a89e87099138c74` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 51 over the ground colour 6 | map 13, square (11,4) facing south, column 9 row 6 |  |
| `tile:13:3008b16b3ab2c62997b73b286d38fadeb77baa02e9310f23366efd21338e4152` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 43 | map 13, square (1,12) facing east, column 4 row 6 |  |
| `tile:13:33c275242cc1d63478fcbc05c662262b1b860e7cae62975e768f980972a13208` | 8X8D8 block 17 tile 43 over 8X8D8 block 17 tile 43 over 8X8D8 block 18 tile 66 | map 13, square (14,9) facing west, column 6 row 6 |  |
| `tile:13:361ec0262b127b2e5805b9662d5d83d3ea988b86a30a5a1e0d2f5f40f46df301` | 8X8D8 block 17 tile 42 over 8X8D8 block 18 tile 67 | map 13, square (14,8) facing west, column 1 row 6 |  |
| `tile:13:3651be55fffdc19c31dd59d2888b036d56769c047bae61210bd0a0c39bac5588` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 42 over the ground colour 6 | map 13, square (1,2) facing south, column 2 row 8 |  |
| `tile:13:3d4b40ddeb8af9963ad9c349eb9a5afed54abe3b219c6e48b43ed21fac3afc1a` | 8X8D8 block 17 tile 57 | map 13, square (13,9) facing south, column 10 row 9 |  |
| `tile:13:3d50c00ab8fecfed3d90ff96c851bd86cbe3d21673449efc3a6c007b61b61fb0` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 36 | map 13, square (11,4) facing west, column 7 row 3 |  |
| `tile:13:40f0dec311cf1197402fb58bc02b19332abd4c8173ca1f6cccec77230f7c6c5f` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 1 | map 13, square (1,2) facing east, column 9 row 3 |  |
| `tile:13:4904837be10d035aade38224813dd8b21d6b452097656994981b9146cc9d4bdb` | 8X8D8 block 17 tile 56 | map 13, square (13,9) facing north, column 0 row 9 |  |
| `tile:13:4b7d01315af236181737df7fb5ba0ff0221cd97c04473ce7453d5fa75cd9e1fe` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 17 | map 13, square (10,5) facing south, column 8 row 3 |  |
| `tile:13:4dfbef68650f945103467b9c44c5a964fd44e13635cfb9af9c6be22579b87233` | 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 61 | map 13, square (10,9) facing north, column 9 row 1 |  |
| `tile:13:4e7cdff51981bcde74a68aaa521c43033f0c32ef410d5cfd81eba050b290c59a` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 69 over sky colour 0 | map 13, square (9,8) facing east, column 9 row 3 |  |
| `tile:13:542cff24c3188202f5960cbd4f598c2eabab9fd53eeae0f044c44640d27c2f3d` | 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 63 | map 13, square (10,9) facing south, column 1 row 1 |  |
| `tile:13:554289061d91933d9c687cd0dd7414fb40f1003cf78a57d13359dc6c5c881294` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 67 | map 13, square (9,9) facing east, column 4 row 6 |  |
| `tile:13:5794e360d97ab95ff6b57367390a4d69bc61b9a456df99d0c072d5c6faf9a0e2` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (2,2) facing south, column 7 row 4 |  |
| `tile:13:582f970de767c8dc9a6a0edd52b41247bda3e624f4b85c86b820e11452c5cf94` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 2 | map 13, square (10,9) facing east, column 2 row 3 |  |
| `tile:13:58e2df47c41000a23ceb290895df77049fb54735e6891f6bd158ec718cb11917` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 34 | map 13, square (11,7) facing east, column 9 row 6 |  |
| `tile:13:6251bdc7645b63613e1bfc7cf807e1793f99364d0005c5a14cb55d7d38701f84` | 8X8D8 block 17 tile 55 | map 13, square (13,9) facing west, column 6 row 6 |  |
| `tile:13:62b04d5962f2cea84aa1c4f8931caf77dd4c288da7cff20eaf5f726b598aa658` | 8X8D8 block 17 tile 8 over 8X8D8 block 18 tile 13 | map 13, square (1,13) facing north, column 10 row 4 |  |
| `tile:13:63c16a00c17b7955470a45a5b0a20a23ecd8f1370f37148ffb1e1de9e8dd6d02` | 8X8D8 block 17 tile 7 over 8X8D1 block 203 tile 41 | map 13, square (2,13) facing north, column 8 row 6 |  |
| `tile:13:6929147516344d817e3f8e17fc90c1b0f9dc1a6af14ff3b4ad12dbc6cb0c0ad4` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 50 over the ground colour 6 | map 13, square (3,6) facing west, column 1 row 6 |  |
| `tile:13:6f3f9fb06967888d6e1c3da83dcbc873c13b581277dd555d919e906cce1d9152` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 36 | map 13, square (1,12) facing east, column 4 row 5 |  |
| `tile:13:701267ab8c4c4caa3cb9e71d36d3226504131fc575c70abe2021e6863519ed3a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (12,2) facing north, column 1 row 4 |  |
| `tile:13:737a315cbcaf507e797dfa6d777081e785f010a937663cdbd05d8ffb71c32709` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 47 | map 13, square (1,2) facing south, column 2 row 4 |  |
| `tile:13:73a41193202df9021c550eea7e79a7058118e56273c894875697f66798064826` | 8X8D8 block 17 tile 49 over 8X8D8 block 18 tile 61 | map 13, square (10,9) facing north, column 9 row 3 |  |
| `tile:13:7b7b4ba104e3a7b6d11740385398b3e5141716772b752e03b130fd5d6328e2a4` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 14 over sky colour 0 | map 13, square (5,7) facing east, column 9 row 3 |  |
| `tile:13:7bce2f52146803335ea8ea44a893fd01bea1d78453a4e6706b0795b937ab36c0` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (5,7) facing south, column 3 row 4 |  |
| `tile:13:892027ab6034ae5ee19aa0e2fc24836b738188c17a8216b8ef3f31002b21e789` | 8X8D8 block 17 tile 6 | map 13, square (13,9) facing west, column 5 row 4 |  |
| `tile:13:8d5ecba5c803351d3cab192d49d6343a4819284966ed2f0b5918d328dea722dd` | 8X8D8 block 17 tile 54 | map 13, square (13,9) facing west, column 6 row 5 |  |
| `tile:13:918fa02251b5f50e2f8dba7ac02f336e9f33e6b8abdcb23dd7092d0cb79a9d9a` | 8X8D8 block 17 tile 5 over 8X8D8 block 17 tile 5 over 8X8D8 block 18 tile 62 | map 13, square (14,9) facing west, column 6 row 5 |  |
| `tile:13:9581ad2cdb4d835af0bc0faff61b3935f443c2b615b668826abe0e5b4ce0c6e6` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 4 | map 13, square (10,9) facing east, column 2 row 4 |  |
| `tile:13:95d4f3607c9b1ab683bf801ca2db9efd8449e6066b38a3a958778391eb3b5724` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 51 | map 13, square (2,12) facing east, column 2 row 8 |  |
| `tile:13:974a08ca635b55852047fd350dd7a6aa34f7d78b9c12a89eadc33b082e010d2b` | 8X8D8 block 17 tile 8 over 8X8D8 block 18 tile 36 | map 13, square (12,8) facing west, column 7 row 5 |  |
| `tile:13:9ca74205126cf6c661c2e2c31dd0cb0f4426665e9dcc4822ad1bf6cbd975791a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 35 | map 13, square (11,6) facing east, column 1 row 6 |  |
| `tile:13:a11b4f7eb5447f44a5ca513cb8e3c77d9ccc91f9a2a9f2d3418d1b719b4236db` | 8X8D8 block 17 tile 4 over 8X8D8 block 18 tile 63 | map 13, square (14,8) facing west, column 1 row 5 |  |
| `tile:13:a359c05145c2ca4c2f7566603512a0f760dc7b2e04979a8024160be3d51fb480` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 18 tile 2 | map 13, square (10,9) facing east, column 8 row 3 |  |
| `tile:13:a3dccbda99d410210ecb9121bdd64678d55ba60a53e8b72de81da10a12dc58bb` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 13 | map 13, square (2,12) facing east, column 2 row 4 |  |
| `tile:13:a76d80ba0a379aff17f5d207986cc7039e0c07a9759c9b90b7287f6eaccf5b82` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 58 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 13, square (2,2) facing south, column 7 row 5 |  |
| `tile:13:ad4edf091ecbdb9f3522d943decddb6f38ff03ea794e728c2dcfeb0d390d22b1` | 8X8D8 block 17 tile 15 over 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 68 over sky colour 0 | map 13, square (9,9) facing east, column 4 row 3 |  |
| `tile:13:b3d420926b09d494c7f33c95bac17c1809aac886ba054085c62bdae9c7d371d3` | 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 61 | map 13, square (10,9) facing north, column 9 row 5 |  |
| `tile:13:b415914172fb2a6b7f92cd6af7949842d364811056ab7bbed53b51c22072d5a8` | 8X8D8 block 17 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 13, square (14,10) facing west, column 7 row 5 |  |
| `tile:13:b7c35a591b3f64d9802ad4e33396259a34782a444cff18865003e7fcc76ee092` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 18 tile 4 | map 13, square (10,9) facing east, column 2 row 2 |  |
| `tile:13:bd5cb1a28f45cba9ca06a9a506c9eab644fe1d9319cd840ba07222a67acc2e40` | 8X8D8 block 17 tile 44 | map 13, square (14,9) facing west, column 5 row 5 |  |
| `tile:13:c46106ca392a9649efbdca9dd9f10e1fc2fb5db7167e1417124bde2c8ed570cd` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 13, square (0,1) facing east, column 10 row 5 |  |
| `tile:13:c54f11111f988de9238c3be62954425f8f938964cc5e5bfedc043345208a9ce0` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 18 over 8X8D8 block 18 tile 66 | map 13, square (9,8) facing east, column 9 row 6 |  |
| `tile:13:c831d1806d50a3fc937156e4ab6cbd64e3d331a327ee7ad93be537376f65d558` | 8X8D8 block 17 tile 46 over 8X8D8 block 18 tile 4 | map 13, square (14,11) facing north, column 1 row 5 |  |
| `tile:13:ca3b167e35f973f1ff846bc2a2aa89e98b2f735cd913d698d53854ca9039d984` | 8X8D8 block 17 tile 58 over 8X8D8 block 18 tile 36 | map 13, square (1,14) facing north, column 9 row 5 |  |
| `tile:13:cc06e52ca0859bf0a07cffa5e9aafb5c23037ba748076f69cab47e4685d69b5b` | 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 62 | map 13, square (10,9) facing north, column 9 row 2 |  |
| `tile:13:ce81b7807fcf8d9096ef351b26c87067a7a05335d3f54ac88baa21b32b75df13` | 8X8D8 block 17 tile 16 over 8X8D8 block 18 tile 5 | map 13, square (10,9) facing north, column 10 row 2 |  |
| `tile:13:d358140b5fb7beae173bac541eca1d1c28c4cf2beedcfec3f53b2a73aea9ea4a` | 8X8D8 block 17 tile 15 over 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 69 over sky colour 0 | map 13, square (9,9) facing east, column 6 row 3 |  |
| `tile:13:d5a0cc5639ccfb277e0a2e7a48b580e4981ab04906128edde68fa9ba4679415a` | 8X8D8 block 17 tile 7 over 8X8D8 block 18 tile 1 | map 13, square (2,13) facing north, column 8 row 5 |  |
| `tile:13:dcb11776610b89b3c908730460f581da4651e26ca70286d8a5ba51740e46107f` | 8X8D8 block 17 tile 18 over 8X8D8 block 18 tile 3 | map 13, square (10,9) facing south, column 0 row 1 |  |
| `tile:13:df8a8bf1e0a2943da69e3c62bb14edc761a7a4233d18cd207e2cb19ce722b9f2` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 17 | map 13, square (11,7) facing east, column 9 row 3 |  |
| `tile:13:e68c9a22187e0a848f66ef8a45180805f7e3ed512fb4cad9e44be4678c2432f4` | 8X8D8 block 17 tile 7 over 8X8D8 block 18 tile 9 | map 13, square (2,13) facing north, column 8 row 3 |  |
| `tile:13:e905e306533daa70b0c31488a22c6cfe96b4d479c77f0308f65cd2c19bf7cd42` | 8X8D8 block 17 tile 7 over sky colour 0 | map 13, square (7,1) facing south, column 8 row 3 |  |
| `tile:13:eb2e8f492a1b1e4df44f6d9c47a1dd93891321dc8d96641050cda1859eacdca8` | 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 3 | map 13, square (10,9) facing north, column 10 row 1 |  |
| `tile:13:ebf917ba700985d098b769472fba73aa65e2d7c07bbf6c0c0b7886de718a77c9` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 51 over the ground colour 6 | map 13, square (3,3) facing west, column 6 row 6 |  |
| `tile:13:f3807374be42fcf068e6d0ce405ff214d37a75d60c11205dd749eab1c142f41d` | 8X8D8 block 17 tile 45 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 13, square (15,8) facing west, column 3 row 5 |  |

#### tile set 8X8D8 block 18 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:13:70d5e6e4782b613799cedd758e9bca68b586ed7a95ff2f5a5cef5120f34b6eb4` | 8X8D8 block 18 tile 6 | map 13, square (10,9) facing east, column 5 row 5 |  |

### Area 14: Kovel Mansion (22)

Map 14; WALLDEF3 block 1 (tiles 8X8D3 block 1), block 3 (tiles 8X8D3 block 3), block 5 (tiles 8X8D3 block 5).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:14:80e3c5025a5f43f7991f9fb1c372374d1d0c7cb666c72aa6115e3e381ccd814e` | the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 14, square (11,2) facing east, column 5 row 5 | `zhentil-floor-refinement-far-threshold.png` (area 0, 8, 21, 24, 28) |

#### shared tile set 8X8D1 block 203 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:14:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 14, square (5,0) facing west, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:14:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 14, square (4,0) facing north, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:14:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 14, square (5,0) facing west, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:14:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 14, square (14,2) facing west, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 16, 21, 23, 24, 28, 29, 31) |
| `tile:14:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over the ground colour 6 | map 14, square (3,0) facing north, column 10 row 8 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:14:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 14, square (3,0) facing east, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 15, 20, 22, 29) |

#### tile set 8X8D3 block 1 (12)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:14:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D3 block 1 tile 14 | map 14, square (3,0) facing north, column 10 row 4 | `podal-west-boundary-terrain-0264796f9fa2.png` (area 2, 9, 10, 15, 18, 20, 26, 29, 31) |
| `tile:14:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D3 block 1 tile 12 | map 14, square (2,1) facing north, column 10 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D3 block 1 tile 8 | map 14, square (3,1) facing north, column 8 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D3 block 1 tile 54 | map 14, square (3,0) facing east, column 2 row 4 | `route-3df247a59ff1.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:14:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D3 block 1 tile 9 | map 14, square (3,1) facing north, column 9 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D3 block 1 tile 11 | map 14, square (3,1) facing north, column 8 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D3 block 1 tile 53 | map 14, square (3,0) facing east, column 2 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 15, 16, 20, 22, 29) |
| `tile:14:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D3 block 1 tile 13 | map 14, square (4,0) facing north, column 7 row 4 | `podal-west-boundary-terrain-9fcdf0ff6bdf.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |
| `tile:14:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D3 block 1 tile 57 | map 14, square (6,0) facing west, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:14:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D3 block 1 tile 10 | map 14, square (3,1) facing north, column 9 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D3 block 1 tile 7 | map 14, square (2,1) facing north, column 10 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:14:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D3 block 1 tile 15 | map 14, square (4,0) facing north, column 5 row 6 | `podal-west-boundary-terrain-f5d7a245e0ac.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |

#### tile set 8X8D3 block 3 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:14:5ea33b314d6a559649dcdcb928b9da3c62d661fa6f496eaba32df44752996fed` | 8X8D3 block 3 tile 50 | map 14, square (8,0) facing south, column 2 row 6 | `kuto-south-passage-terrain-5ea33b314d6a.png` (area 0, 2, 8, 11, 18, 24, 29, 31) |
| `tile:14:6c7ec11bfc006585332f2495cbe7d713d38a049d7b8374177334f0c5c0af5f1d` | 8X8D3 block 3 tile 32 | map 14, square (11,0) facing west, column 1 row 6 | `kuto-earth-chamber-joins-6c7ec11bfc00.png` (area 2, 18, 29) |
| `tile:14:b6d8cf528e84d3abaa95a41f2d778e406ae1cd4a82c6e801321904894f13fe13` | 8X8D3 block 3 tile 51 | map 14, square (8,0) facing south, column 2 row 5 | `kuto-south-passage-terrain-b6d8cf528e84.png` (area 2, 18, 24, 29, 31) |

### Area 16: The Lizardman Keep (105)

Map 16, 30; WALLDEF8 block 9 (tiles 8X8D8 block 9), block 20 (tiles 8X8D8 block 20), block 23 (tiles 8X8D8 block 23); WALLDEF8 block 9 (tiles 8X8D8 block 9), block 17 (tiles 8X8D8 block 17), block 23 (tiles 8X8D8 block 23).

#### shared tile set 8X8D1 block 203 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 16, square (7,15) facing east, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:16:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 16, square (7,15) facing east, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:16:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (9,15) facing west, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 14, 15, 20, 22, 29) |
| `tile:16:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 16, square (9,15) facing west, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 15, 20, 22, 29) |

#### tile set 8X8D8 block 9 (33)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:092d77784cc2a3aced6d966599044e9ab65765f0e473458aed86601150644fd9` | 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 6 | map 16, square (10,13) facing west, column 1 row 5 |  |
| `tile:16:0d01df165df3a771d7c95a5ece6d1d424a69673aaf3122e1054732dc3aa20aeb` | 8X8D8 block 9 tile 54 over 8X8D8 block 9 tile 54 over 8X8D8 block 9 tile 28 | map 16, square (8,14) facing south, column 5 row 6 |  |
| `tile:16:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D8 block 9 tile 47 | map 16, square (8,14) facing west, column 1 row 3 | `sokal-west-lintel-corner.png` (area 21) |
| `tile:16:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D8 block 9 tile 22 | map 16, square (10,15) facing west, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:16:20ce93dc46276e688404749b96fc9868d9f1bd87f6545b3c1ebc86922d8f010f` | 8X8D8 block 9 tile 56 over 8X8D8 block 9 tile 3 | map 16, square (7,14) facing east, column 8 row 4 |  |
| `tile:16:215488a7ca18e31d90dd8bc2d00c5f3002c2801a983ba96bbb0ceb9b2b3bd498` | 8X8D8 block 9 tile 58 | map 16, square (10,13) facing west, column 1 row 6 | `zhentil-northern-lane-terrain-215488a7ca18.png` (area 1, 5, 7, 20, 21, 28) |
| `tile:16:246f66c4e1032e6b33d74b506b32402c610419af7fd2345721eb9e9128b7a578` | 8X8D8 block 9 tile 13 | map 16, square (8,0) facing north, column 2 row 4 | `stojanow-west-rampart-terrain-246f66c4e103.png` (area 9, 21, 28) |
| `tile:16:2795a504ca67152aac8296d4f1e16f70523c5cf25af04d218c8cde895f0db0f0` | 8X8D8 block 9 tile 49 over sky colour 11 | map 16, square (8,15) facing east, column 0 row 3 | `sokal-west-lintel-mid.png` (area 21) |
| `tile:16:2b189e32fb8cf14bccc4e230acdc7e87885e4ba1d93051e2861319877487c307` | 8X8D8 block 9 tile 55 | map 16, square (8,0) facing north, column 4 row 5 | `podal-workshop-lanes-terrain-2b189e32fb8c.png` (area 9, 18, 21, 24) |
| `tile:16:2bf0907bbca4cab51410edb7133ca4b000d0fb21731e247c9641e7a1e54b6c98` | 8X8D8 block 9 tile 42 over 8X8D8 block 9 tile 15 | map 16, square (10,15) facing west, column 6 row 5 |  |
| `tile:16:33b51e82f012e7d91b96894cd582495df912d95b36989e787ee5f7885e92d5b7` | 8X8D8 block 9 tile 38 | map 16, square (9,13) facing west, column 0 row 6 | `stojanow-tower-lanes-terrain-33b51e82f012.png` (area 9, 21) |
| `tile:16:414260af77afd8aef64b37cc3ab35c6ffbbbeeb0b6491dfc427d38dd5064d5e8` | 8X8D8 block 9 tile 42 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (6,14) facing east, column 6 row 5 |  |
| `tile:16:42945697e83023b58f9b0ab01e2b4629d8f5ec4d796b65e5d04be6ef442ab87f` | 8X8D8 block 9 tile 7 | map 16, square (1,3) facing north, column 4 row 5 | `zhentil-outpost-terrain-42945697e830.png` (area 9, 21, 28) |
| `tile:16:5f7ade4531d3bada00bc1c2d310f67d23a25dbe485f1d71a0c78936df93bbd13` | 8X8D8 block 9 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (10,14) facing west, column 4 row 5 | `sokal-west-gate-hinge-cap.png` (area 21) |
| `tile:16:5fb9e67d0ccf7495bc8ed31bf8960390be987a6d6c92cd882e47d72a5d4cea53` | 8X8D8 block 9 tile 49 over 8X8D1 block 203 tile 12 | map 16, square (8,14) facing west, column 0 row 3 |  |
| `tile:16:6182286c97e2af8cf47fcf4321d9b562df43cfb3c35ee22574e9528275ea8a7d` | 8X8D8 block 9 tile 56 over sky colour 11 | map 16, square (8,15) facing west, column 10 row 3 | `sokal-raking-gate-head-end.png` (area 21) |
| `tile:16:755bda5b825770559bb1bca3b1582f2f4788da7f1a3b9cbb0b2ec3f4c2052f71` | 8X8D8 block 9 tile 56 over 8X8D1 block 203 tile 12 | map 16, square (8,14) facing east, column 10 row 3 | `stojanow-guard-wing-terrain-755bda5b8257.png` (area 9) |
| `tile:16:80365aff0ddcf91182a971781062979ea6fb274bdd0be01e236be5c240ec701b` | 8X8D8 block 9 tile 8 | map 16, square (8,0) facing north, column 5 row 5 | `stojanow-tower-lanes-terrain-80365aff0ddc.png` (area 9, 21) |
| `tile:16:8a69c0e8564e565884435ba1a08a6f282775d00ecb8af439bb001edeb3831ec2` | 8X8D8 block 9 tile 54 over 8X8D8 block 9 tile 54 over the ground colour 6 | map 16, square (8,15) facing north, column 5 row 6 | `stojanow-tower-lanes-terrain-8a69c0e8564e.png` (area 9, 21) |
| `tile:16:8e4e495407f094508c6c358ba241bf1946da32e0ab2eff5fec8ab2cd82ac2998` | 8X8D8 block 9 tile 63 | map 16, square (8,8) facing east, column 2 row 4 | `stojanow-west-rampart-terrain-8e4e495407f0.png` (area 9) |
| `tile:16:9a4ac03bffe81d707e144cfb140cdf11478447a8ab201408ee5e418c2742a5ae` | 8X8D8 block 9 tile 64 | map 16, square (9,8) facing west, column 10 row 2 | `stojanow-upper-gate-terrain-9a4ac03bffe8.png` (area 9) |
| `tile:16:9fb217c9d87375988f0a4bfe6ed0ed5df1dabb3d5301b4410f163e72ddedcb0c` | 8X8D8 block 9 tile 60 | map 16, square (7,8) facing east, column 4 row 5 | `stojanow-west-rampart-terrain-9fb217c9d873.png` (area 9) |
| `tile:16:a1b8baf4059c3a18ecd999f94f44fbba3630c87a33820ec33a092d52785d83bd` | 8X8D8 block 9 tile 43 | map 16, square (6,12) facing south, column 1 row 5 | `stojanow-tower-warning-terrain-a1b8baf4059c.png` (area 9, 28) |
| `tile:16:a5d4129237b2f11c1fbe432d281f82df864337f2d654c4e32cd72c83ee3233cf` | 8X8D8 block 9 tile 45 over 8X8D8 block 9 tile 3 | map 16, square (9,14) facing west, column 2 row 4 |  |
| `tile:16:abf4a264e67412e3e24a2b51727b24e0d063340fe6343e232ed3ab8abd123f60` | 8X8D8 block 9 tile 65 | map 16, square (9,8) facing east, column 0 row 2 | `stojanow-west-rampart-terrain-abf4a264e674.png` (area 9) |
| `tile:16:b38bb090ffc6ff28fd87d9752a69d3a271dbc6d5c12ef2bef8d273d5718e1701` | 8X8D8 block 9 tile 39 | map 16, square (8,8) facing east, column 3 row 4 | `stojanow-west-rampart-terrain-b38bb090ffc6.png` (area 9) |
| `tile:16:b75fa3bd05faf8986e8270c40a1e79514aaa1d6094f381c21de72443c561eb41` | 8X8D8 block 9 tile 62 | map 16, square (10,8) facing west, column 8 row 4 | `stojanow-barracks-side-terrain-b75fa3bd05fa.png` (area 9) |
| `tile:16:b784b8750b8adf3caafc9bb39eccbd31f78447d7268123fcf737875c487f9fea` | 8X8D8 block 9 tile 44 | map 16, square (8,14) facing east, column 10 row 7 | `stojanow-guard-wing-terrain-b784b8750b8a.png` (area 9, 21) |
| `tile:16:ba6dffecfcac31b31c0359d99617b3180552c982bef2087cb4995bccd9554ee7` | 8X8D8 block 9 tile 45 over sky colour 11 | map 16, square (7,15) facing east, column 2 row 4 | `sokal-west-lintel-close.png` (area 21) |
| `tile:16:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D8 block 9 tile 21 | map 16, square (6,15) facing east, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:16:f59a8b4ef53dca4b588a04b05a81d1c5a38fb9fa2354b6e64a4853bbbf7ad8f3` | 8X8D8 block 9 tile 46 | map 16, square (8,14) facing east, column 9 row 3 | `stojanow-guard-wing-terrain-f59a8b4ef53d.png` (area 9, 21) |
| `tile:16:fc85e701ce21521a7c912ea59856be8e5876bb6a37598db60faf2fed8b5027ba` | 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 15 | map 16, square (6,15) facing east, column 4 row 5 |  |
| `tile:16:fd5111f010b1eb27874d7173f3f881527f0a97a68535e574937a39274ae5fb87` | 8X8D8 block 9 tile 48 | map 16, square (7,0) facing east, column 0 row 4 | `stojanow-tower-lanes-terrain-fd5111f010b1.png` (area 9, 21) |

#### tile set 8X8D8 block 20 (34)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:055a11adb286ee5d2fc8e0f5cbbba62bb74aa6ba686c8b0d8c7bd0a36ed0cc18` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (8,9) facing east, column 0 row 7 |  |
| `tile:16:0bd52c18233f2ba6453428caafbef7497c81af804cac1a0e85c156e0eada5797` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 61 over sky colour 11 | map 16, square (2,8) facing east, column 4 row 4 |  |
| `tile:16:105ea3fc7fa9165bd52590a9d6377ddf45ddcdb4fdcdec3f95ccea846518e09d` | 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 42 | map 16, square (5,0) facing north, column 10 row 7 |  |
| `tile:16:151d3540b6b85e9fe5f89a408c28a6655b6a7bc8d072f119244cc8e42d8bf257` | 8X8D8 block 20 tile 30 over 8X8D8 block 9 tile 15 | map 16, square (15,2) facing north, column 8 row 5 |  |
| `tile:16:1d3c40ff64f533ee7914ef97fe6a69a29df7a1d3c8dd8ee6f52e58b41aac57f2` | 8X8D8 block 20 tile 47 over 8X8D8 block 9 tile 29 | map 16, square (8,8) facing north, column 10 row 7 |  |
| `tile:16:1ef701f8169d94212816c2c8abf454bae1dbbdf943aee059257360b66728a722` | 8X8D8 block 20 tile 48 over 8X8D8 block 23 tile 34 | map 16, square (5,0) facing north, column 9 row 7 |  |
| `tile:16:1fb812974078d5aa90dc8407744dd181a5044d78f281d9d4ac458ee918324719` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 27 over the ground colour 6 | map 16, square (6,8) facing south, column 0 row 7 | `mendor-library-west-rooms-terrain-1fb812974078.png` (area 2) |
| `tile:16:366e1ab77203b02ffe234f64b976aab5dd5d2f6106a56804e75f580defb56291` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 40 | map 16, square (5,1) facing east, column 0 row 7 |  |
| `tile:16:37c7ee979175c76077a8058648a66ed2aa4ac98192ac1a1bdd3ea40f10283c96` | 8X8D8 block 20 tile 31 over 8X8D8 block 9 tile 3 | map 16, square (0,1) facing west, column 10 row 2 |  |
| `tile:16:3d99a068ea8e6fb313ca883391d15e770a8ac8c232dc4e5d00fca2f5e88b9600` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 23 tile 35 | map 16, square (5,0) facing east, column 2 row 7 |  |
| `tile:16:4400e9167a3ab4833e4397e31b6d2c43dcd2b26cd3c457d20cc62b056f5a6b7d` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 34 | map 16, square (6,1) facing west, column 10 row 7 |  |
| `tile:16:49bdf0621c9f87b0c254c8bced4e04b21a4b2d150cd755de9f1fc6143b2ed8bb` | 8X8D8 block 20 tile 35 over 8X8D1 block 203 tile 39 | map 16, square (0,1) facing west, column 9 row 3 |  |
| `tile:16:4a6b9d218c44eb528b7d83d5e9faa641d2c9ced1ffc4cc5a670fdf4571ac0d8b` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D1 block 203 tile 36 over the ground colour 6 | map 16, square (10,8) facing west, column 8 row 8 |  |
| `tile:16:4b2f5751774cd086d55ecf47af6fd155e6c00c95159c0081590bb8d46b62c9c9` | 8X8D8 block 20 tile 48 over 8X8D8 block 9 tile 30 | map 16, square (10,8) facing north, column 0 row 7 |  |
| `tile:16:4eee654eb7bc8ab798dbd2212333e177f100fa9083c056cecd20fb95e94ca493` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (8,8) facing east, column 3 row 7 |  |
| `tile:16:6a35bed254b4531cab39d077ae369c497781872c245696ee7516802670db7c65` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 34 | map 16, square (6,0) facing north, column 1 row 7 |  |
| `tile:16:6f81a850e05078537ce4e8fe28f4b13dfdf609164a8eafd6c1687cda27051710` | 8X8D8 block 20 tile 46 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (13,13) facing north, column 3 row 5 | `textile-waterfront-crossing-terrain-6f81a850e050.png` (area 2) |
| `tile:16:6fbe8db05a8c5ad6cb962aae0f1437058c8ff04987b4806b0c76ca824ca9be7d` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 16, square (3,2) facing east, column 10 row 7 |  |
| `tile:16:7ae31f24fea062d79eee729f3d497352915fd7eb916b73174846967e8b382ffe` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 9 tile 24 | map 16, square (0,1) facing north, column 2 row 3 |  |
| `tile:16:802eaa95697c55e8054146a63a5e1d3ae68f2fb66322679ede10f7fddc20afe7` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 40 | map 16, square (5,0) facing east, column 3 row 7 |  |
| `tile:16:815527810550556073878310e47ac1b9cfafc756f17571b34f7d469229603ee4` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 40 | map 16, square (4,0) facing east, column 4 row 6 |  |
| `tile:16:84897dde121a467526a8172395426e19541c000165c965181eba9b9c525abfaa` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 9 tile 22 | map 16, square (7,8) facing east, column 4 row 6 |  |
| `tile:16:8c399cdc60cf3f4b69e6b5c3da43ee7280663bab99adbb837012aa7c9aa12823` | 8X8D8 block 20 tile 26 over 8X8D8 block 23 tile 38 | map 16, square (1,0) facing north, column 3 row 6 |  |
| `tile:16:9c84dd3b3cdd3958c430b0367abaa46d2103a03bd51431435e98af97e56c3695` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 37 | map 16, square (1,15) facing north, column 1 row 7 |  |
| `tile:16:9e65c048e24257626e8f3dcf282746653d70eb9345ba911815c4cea34fd1111d` | 8X8D8 block 20 tile 44 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 16, square (10,8) facing west, column 7 row 7 |  |
| `tile:16:a3076af3dfe01eb8c1d7593ede29501e310ff4d60a4a5928f6b1418451b315fb` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 16, square (5,0) facing west, column 0 row 7 | `textile-waterfront-crossing-terrain-a3076af3dfe0.png` (area 2) |
| `tile:16:a64581d6a51a85308188d1f97a30855b6ab72f87e76f2cb0d4704618b242e2d5` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 38 | map 16, square (6,0) facing west, column 8 row 8 |  |
| `tile:16:aef5a210cde1074047705f1e34b4d4dfdefa1be92112c0931e966d77e3279104` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 9 tile 33 | map 16, square (8,8) facing east, column 2 row 7 |  |
| `tile:16:c104219ccd769bc7fb12de689c9613b77e67c5b6bd2601d23fb6c9a1583b2db2` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 40 | map 16, square (1,13) facing west, column 0 row 7 |  |
| `tile:16:d0ba369539e5a9e86da2f9dc423b79c33b328cb457840bbb96f89e2b24e39344` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 9 tile 3 | map 16, square (0,1) facing north, column 5 row 4 |  |
| `tile:16:dab091e3d16c6309b7e68fe2818579b5df543091274404d32a0d4240c9c9e1af` | 8X8D8 block 20 tile 26 over 8X8D8 block 9 tile 34 | map 16, square (10,9) facing north, column 3 row 6 |  |
| `tile:16:e51182bf603035bb075499bef5a3c4d946430d64e84795585dc9e2aa81583439` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 39 | map 16, square (1,13) facing south, column 7 row 6 |  |
| `tile:16:ef495687915380f440f5501931b8b57585eb33cf8ff39b3261a64ce3eee59506` | 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 39 | map 16, square (1,0) facing west, column 10 row 7 |  |
| `tile:16:f8f7ba95fbd312c31db1a44b5bab013451197d98b79e2b76f157e666ff09e7f5` | 8X8D8 block 20 tile 26 over 8X8D8 block 23 tile 35 | map 16, square (6,1) facing north, column 3 row 6 |  |

#### tile set 8X8D8 block 23 (34)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:02cadbb8b38f14b780218b95568d64d0fff7630569981a83a4e8ace5869553f9` | 8X8D8 block 23 tile 45 over 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,7) facing west, column 4 row 5 |  |
| `tile:16:05b9e2250968bf77a02fd73921bc0f1cc96fd6c375eb047e992f122a6ad702c6` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 12 | map 16, square (10,0) facing north, column 10 row 5 |  |
| `tile:16:05dfdd7e1cc025934aa123746421cc62d22cb32949569570b7dc475c9de681e1` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (15,4) facing south, column 0 row 5 |  |
| `tile:16:102f8e21877bd947c60c540c5f64bf15612fef66ec0af7863e2acab2e879c349` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 6 row 5 |  |
| `tile:16:172622f15260439dca2c8012f4b645d55b47ae84a7d2de86b9df226f7f128bc1` | 8X8D8 block 23 tile 44 over 8X8D8 block 9 tile 15 | map 16, square (6,0) facing east, column 0 row 5 |  |
| `tile:16:18abd14ccf8358f52b48b4f86f9e7fa59214345fe3f663222d3840ea26c630f9` | 8X8D8 block 23 tile 45 over 8X8D8 block 9 tile 15 | map 16, square (15,4) facing north, column 10 row 5 |  |
| `tile:16:1b1786c1bd78554a157b9d5322e62654f331a07d19220b37db10c5b2b14b63f2` | 8X8D8 block 23 tile 43 over 8X8D1 block 203 tile 29 | map 16, square (12,0) facing north, column 1 row 5 |  |
| `tile:16:1bf3d6718521018eaf5ba8bc24f4c9176cde4b1f8517603ca44f15eae6a5709a` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 38 | map 16, square (10,0) facing east, column 3 row 5 |  |
| `tile:16:2336e8952d206f9189cb5d3a2e96bd04d1ca0bc543c7767564b5b21eb60320aa` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (11,0) facing north, column 5 row 5 |  |
| `tile:16:264b6cce9ee17a9f25ee27c5a93521e255cf8280048b772dc855b074eb90bc14` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 10 row 5 |  |
| `tile:16:2718a6a619bd9253f4116173a41109cb70b08e6da644e2be26c87669f9d922f0` | 8X8D8 block 23 tile 43 over 8X8D8 block 9 tile 15 | map 16, square (6,0) facing east, column 2 row 5 |  |
| `tile:16:28b5fdb65a19f4c1c2e11be815690f5bbd50f9dc5d3094db1146840a37d31d50` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (1,6) facing west, column 1 row 5 |  |
| `tile:16:2d7ad388787e68c43ee056ba71c23e78a2f74b6dfdd1482f1c2a6e27b885b5f7` | 8X8D8 block 23 tile 43 over 8X8D1 block 203 tile 30 | map 16, square (10,0) facing north, column 9 row 5 |  |
| `tile:16:3d63a3e3463c461b97bb745741a5b9f6902f4ad9f6ee7401ff9ac453a0b8d2b0` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 8 | map 16, square (7,0) facing east, column 0 row 5 |  |
| `tile:16:5152a0f4abbd7c1e9995b75268ec33fa3046a727bf2986f52bf7f14e992210b9` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 8 row 5 |  |
| `tile:16:55aaef0a4baf8d041fde1cf09601e0adb9a7e5bb92b40ef822504e810f751669` | 8X8D8 block 23 tile 44 over 8X8D8 block 9 tile 6 | map 16, square (6,0) facing east, column 3 row 5 |  |
| `tile:16:58a48a7ca30b84b7c3b3d5714d54ac7020d09546c397dbfb6dceeefcb7e9a196` | 8X8D8 block 23 tile 45 over 8X8D8 block 23 tile 45 over 8X8D8 block 9 tile 10 | map 16, square (0,7) facing west, column 6 row 5 |  |
| `tile:16:5dff3db8e9d00fd872a3762699bb9d4c7c07d2c66a193c2a3d66f5d9884d97a4` | 8X8D8 block 23 tile 45 over 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 6 | map 16, square (6,0) facing east, column 1 row 5 |  |
| `tile:16:6c88a487ddcf3d4635ffef22e0f6f754ffc2c1da3f598ea99cd35bcab669fffd` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 28 | map 16, square (12,0) facing west, column 7 row 5 |  |
| `tile:16:710a08e5b5c35f1e92f656abccb4dfa08cb6e2fc38b36dcb1ad83997708d642b` | 8X8D8 block 23 tile 45 over 8X8D1 block 203 tile 39 | map 16, square (0,7) facing south, column 10 row 5 |  |
| `tile:16:81b0644b42d1bfaabf669625a2eb0d1171629e8d83dfc143a939146233254986` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 45 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (2,15) facing west, column 4 row 5 |  |
| `tile:16:995407cf5606fc02058c1131c1ef44af2bc9cd820bc805924de781c9403d8287` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 9 row 5 |  |
| `tile:16:9a59da668c0872165ef9621350e63d171f4c9e39536bbc8fad128cf27b365e2e` | 8X8D8 block 23 tile 44 over 8X8D8 block 9 tile 55 | map 16, square (6,0) facing north, column 10 row 5 |  |
| `tile:16:b1032cce1b6a60957562192fff39836dcd3220379c70016a7fa2131c9446abb8` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 39 | map 16, square (11,0) facing west, column 9 row 5 |  |
| `tile:16:ba5801c7d6d98a5fd0d859f2f97c869a7d8d78615f7fc52a17fd0f5270349fc7` | 8X8D8 block 23 tile 45 over 8X8D1 block 203 tile 12 | map 16, square (11,0) facing west, column 10 row 5 |  |
| `tile:16:babc640b6f7d148642c90ade0c0d417f4ed83a55d6875fdae42531fd1a088056` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (10,0) facing east, column 2 row 5 |  |
| `tile:16:bd02818637eddbcdc983313c9e95908421925b13365587ff74cecf4ef14674ad` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 7 row 5 |  |
| `tile:16:c659139ba5d9072517ca8bfbbc326f94f3f5ba99dfcadb64bb0998d29b5d690d` | 8X8D8 block 23 tile 44 over 8X8D1 block 203 tile 29 | map 16, square (11,0) facing east, column 0 row 5 |  |
| `tile:16:cb89b09371a9d88c823626eb88e979c39b4bc5fc59d31ce8969ca50418f10033` | 8X8D8 block 23 tile 45 over 8X8D8 block 23 tile 45 over 8X8D1 block 203 tile 29 | map 16, square (11,0) facing north, column 4 row 5 |  |
| `tile:16:dd03c2abc68d0f5e0f683edfdc06835035c340badeac07bbde4ffec00e60293d` | 8X8D8 block 23 tile 43 over 8X8D8 block 9 tile 43 | map 16, square (6,0) facing north, column 9 row 5 |  |
| `tile:16:e3230531e76860359e9202576e32d158bfeadc898c35a646d92b5ea57a23af95` | 8X8D8 block 23 tile 45 over 8X8D8 block 9 tile 52 | map 16, square (7,0) facing east, column 1 row 5 |  |
| `tile:16:e8235671c4df093d6aedd0d234f64bb1e83a873fc759cc83cea2b1eb6f28236f` | 8X8D8 block 23 tile 43 over 8X8D8 block 9 tile 10 | map 16, square (0,8) facing west, column 9 row 5 |  |
| `tile:16:ec5c65ec2f54c0955d159fc9abc285f78a70d0b032c73182a12924c438ba56e5` | 8X8D8 block 23 tile 45 over 8X8D1 block 203 tile 38 | map 16, square (11,0) facing east, column 1 row 5 |  |
| `tile:16:faf967fd363db5ac4121562f9009c7cdba09c53da6848bc6457034f1002cc70f` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 43 over 8X8D1 block 203 tile 12 | map 16, square (11,0) facing north, column 2 row 5 |  |

### Area 21: Sokal Keep (165)

Map 21; WALLDEF4 block 1 (tiles 8X8D4 block 1), block 5 (tiles 8X8D4 block 5), block 9 (tiles 8X8D4 block 9).

#### shared tile set 8X8D1 block 203 (11)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:21:07d5c50f71346b8e7dfb1509c04e147875817f2400ca77f9c0ff0e0c12f04290` | 8X8D1 block 203 tile 17 over the ground colour 6 | map 21, square (7,9) facing east, column 10 row 6 | `podal-workshop-lanes-terrain-07d5c50f7134.png` (area 18) |
| `tile:21:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 21, square (0,8) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:21:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over the ground colour 6 | map 21, square (7,7) facing east, column 10 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:21:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 21, square (0,8) facing south, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:21:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 21, square (7,7) facing east, column 10 row 5 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29) |
| `tile:21:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over the ground colour 6 | map 21, square (8,7) facing west, column 0 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31) |
| `tile:21:97ff4f78b15e4481b61bed70d5dffe6e9ab47632e36ac34439b23705f1f723b5` | 8X8D1 block 203 tile 43 | map 21, square (7,8) facing west, column 1 row 8 | `podal-workshop-lanes-terrain-97ff4f78b15e.png` (area 0, 8, 18, 24) |
| `tile:21:9b88f7a7329f3899fd4fdfcf0f17706a3995730c04dda467a643111d36f507df` | 8X8D1 block 203 tile 16 over the ground colour 6 | map 21, square (8,9) facing west, column 0 row 6 | `bane-altar-approach-terrain-9b88f7a7329f.png` (area 24) |
| `tile:21:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 21, square (15,8) facing south, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 14, 15, 20, 22, 29) |
| `tile:21:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 21, square (15,8) facing south, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 15, 20, 22, 29) |
| `tile:21:f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b` | 8X8D1 block 203 tile 13 | map 21, square (0,8) facing north, column 0 row 4 | `new-phlan-gate-31a92759fb4b.png` (area 0, 1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 26, 27, 29, 31) |

#### tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:21:c61703df5658b60ae2c2d23bd0d584030969fdbbc10fbe56b531b48e6348378b` | 8X8D1 block 203 tile 16 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (7,3) facing south, column 6 row 4 | `bane-altar-approach-terrain-c61703df5658.png` (area 24) |
| `tile:21:dea84c7c2f6021fca2f2c759076ef027aa4f84a6267d522cd5bd1ee892ba0ecd` | 8X8D1 block 203 tile 17 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (8,3) facing south, column 4 row 4 |  |

#### tile set 8X8D4 block 1 (39)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:21:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D4 block 1 tile 14 | map 21, square (0,8) facing south, column 10 row 3 | `podal-west-boundary-terrain-0264796f9fa2.png` (area 2, 9, 10, 15, 18, 20, 26, 29, 31) |
| `tile:21:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D4 block 1 tile 12 | map 21, square (6,14) facing south, column 1 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D4 block 1 tile 8 | map 21, square (15,8) facing south, column 5 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D4 block 1 tile 56 | map 21, square (9,14) facing west, column 1 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:21:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D4 block 1 tile 55 | map 21, square (0,8) facing south, column 8 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 22, 29) |
| `tile:21:24496d3a08d097a18184cf1e0ed7f714e985ff1ec84640cc8ef2251081b8ac14` | 8X8D4 block 1 tile 30 | map 21, square (0,15) facing north, column 8 row 7 | `kuto-border-fountain-terrain-24496d3a08d0.png` (area 18, 29) |
| `tile:21:2641de725160bed3ccf83642677807161ae17c04ec7f0201d24c4444cea4309c` | 8X8D4 block 1 tile 19 | map 21, square (0,15) facing east, column 1 row 9 | `kuto-packed-earth-2641de725160.png` (area 18, 29) |
| `tile:21:35bc16c225d0188de6e4d787bb7cc94cea1ed7739c1190f0db6a1915c6e4d4b5` | 8X8D4 block 1 tile 32 | map 21, square (0,15) facing north, column 7 row 7 | `kuto-border-fountain-terrain-35bc16c225d0.png` (area 18, 29) |
| `tile:21:38edb1790223ef81914551f6f0b9eea6a21f7e86fbe0515ddae1a08662aff9e7` | 8X8D4 block 1 tile 0 | map 21, square (0,15) facing north, column 5 row 5 | `kuto-border-fountain-terrain-38edb1790223.png` (area 18, 29) |
| `tile:21:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D4 block 1 tile 54 | map 21, square (0,8) facing south, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:21:3fee7e855b9465a3ca932316bcc9135e8d669a7b0c7fc89640598ecd55cf01f2` | 8X8D4 block 1 tile 37 | map 21, square (0,15) facing north, column 8 row 8 | `kuto-packed-earth-3fee7e855b94.png` (area 18, 29) |
| `tile:21:4347bf08046f39d7f4d4575c1b1fa5398cfd24a85e0b2cf75942ff5b761a722e` | 8X8D4 block 1 tile 27 | map 21, square (0,15) facing north, column 5 row 6 | `kuto-border-fountain-terrain-4347bf08046f.png` (area 18, 29) |
| `tile:21:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D4 block 1 tile 9 | map 21, square (15,9) facing north, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D4 block 1 tile 21 | map 21, square (6,13) facing south, column 1 row 5 | `kuto-podal-side-streets-kuto-terrain-54cfe77b0fa0.png` (area 2, 4, 9, 14, 15, 18, 29, 31) |
| `tile:21:5abd3cf4bfe6373c05e073bd3b979b4ef00d2434076f6a621e27f9ae8b59c885` | 8X8D4 block 1 tile 28 | map 21, square (0,15) facing north, column 4 row 7 | `kuto-border-fountain-terrain-5abd3cf4bfe6.png` (area 18, 29) |
| `tile:21:5d21f80204f885adf8274dc902585aabba14856ffc8e683b696965fdd68ea226` | 8X8D4 block 1 tile 38 | map 21, square (0,15) facing west, column 9 row 7 | `kuto-border-fountain-terrain-5d21f80204f8.png` (area 18, 29) |
| `tile:21:707a3661de40639856880d5863eb5fb241f95ab8c7a4e035fac140a7fb8c7f6b` | 8X8D4 block 1 tile 29 | map 21, square (0,15) facing north, column 8 row 6 | `kuto-border-fountain-terrain-707a3661de40.png` (area 18, 29) |
| `tile:21:780874fdade2d4968354973a6e45e373900cf2f360aaaee9048eff7760f1f294` | 8X8D4 block 1 tile 25 | map 21, square (0,15) facing north, column 2 row 6 | `kuto-border-fountain-terrain-780874fdade2.png` (area 18, 29) |
| `tile:21:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D4 block 1 tile 11 | map 21, square (15,8) facing south, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:7ea51baee154fa0f712d9f26bc1141387e2c7403c8c490db73b1da868c40b574` | 8X8D4 block 1 tile 61 | map 21, square (0,15) facing west, column 10 row 8 | `kuto-border-fountain-terrain-7ea51baee154.png` (area 18, 29) |
| `tile:21:8218bb2fd3cff1bb3b55dfb4d8626f1ef9eacf4084120b071ace691afcc06449` | 8X8D4 block 1 tile 3 | map 21, square (0,15) facing north, column 2 row 7 | `kuto-border-fountain-terrain-8218bb2fd3cf.png` (area 18, 29) |
| `tile:21:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D4 block 1 tile 53 | map 21, square (0,8) facing south, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 15, 16, 20, 22, 29) |
| `tile:21:94baea60a43c4a3789f6665ce0721e7bbdd8cc4fef7adce250e8f48d3344efe8` | 8X8D4 block 1 tile 33 | map 21, square (0,15) facing north, column 7 row 6 | `kuto-border-fountain-terrain-94baea60a43c.png` (area 18, 29) |
| `tile:21:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D4 block 1 tile 13 | map 21, square (0,8) facing north, column 0 row 3 | `podal-west-boundary-terrain-9fcdf0ff6bdf.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |
| `tile:21:a98541eb98d04b70525e398883915b338262458223739687d40ba50900a89567` | 8X8D4 block 1 tile 60 | map 21, square (0,15) facing east, column 0 row 10 | `kuto-packed-earth-a98541eb98d0.png` (area 18, 29) |
| `tile:21:ad321803c7cb77e1053d5ace43e19ea6adcd8cf1f35674112d057c9a3419b2d8` | 8X8D4 block 1 tile 62 | map 21, square (0,15) facing west, column 9 row 9 | `kuto-earth-chamber-joins-ad321803c7cb.png` (area 18, 29) |
| `tile:21:bb5fbe0659195461417a3592db18801edb797dd01b778f2ec9e18ec474d39347` | 8X8D4 block 1 tile 36 | map 21, square (0,15) facing north, column 2 row 8 | `kuto-packed-earth-bb5fbe065919.png` (area 18, 29) |
| `tile:21:c3a7b97b50237ff17eef35dcda2aa23700f0e0264180893885f504ca1c19148d` | 8X8D4 block 1 tile 63 | map 21, square (0,15) facing west, column 10 row 10 | `kuto-earth-chamber-joins-c3a7b97b5023.png` (area 18, 29) |
| `tile:21:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D4 block 1 tile 52 | map 21, square (0,8) facing south, column 8 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29) |
| `tile:21:d46241306c8fa8cb736fa216c7d1ab56e62b6495d92843bfcda972f5162d6158` | 8X8D4 block 1 tile 46 | map 21, square (0,15) facing east, column 1 row 7 | `kuto-court-junctions-terrain-d46241306c8f.png` (area 18, 29) |
| `tile:21:d5e0eedcfbae2634ac60516275495ad735e7ff952e0fb335b1181d29e4d2879f` | 8X8D4 block 1 tile 20 | map 21, square (0,15) facing north, column 5 row 4 | `kuto-border-fountain-terrain-d5e0eedcfbae.png` (area 18, 29) |
| `tile:21:d9b51cc9360d17737eebf2fc825d7cc895e96ea1d6f2020a5a7c8d54e5228dea` | 8X8D4 block 1 tile 59 | map 21, square (0,15) facing east, column 0 row 8 | `kuto-court-junctions-terrain-d9b51cc9360d.png` (area 18, 29) |
| `tile:21:db642afd69e7f1462ea1b65b8fda171ed215e5158c5dc2d0e8c0912c01cae65a` | 8X8D4 block 1 tile 58 | map 21, square (0,15) facing north, column 3 row 7 | `kuto-border-fountain-terrain-db642afd69e7.png` (area 18, 29) |
| `tile:21:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D4 block 1 tile 57 | map 21, square (6,14) facing east, column 9 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:21:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D4 block 1 tile 10 | map 21, square (6,14) facing south, column 0 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:e9ecbb72d30b0993e242f5c1ff9562df7dd7c28db20be6a0917234d9679aa17a` | 8X8D4 block 1 tile 31 | map 21, square (0,15) facing north, column 3 row 6 | `kuto-border-fountain-terrain-e9ecbb72d30b.png` (area 18, 29) |
| `tile:21:ebbb3407ad7721eaf32a9756092057bad2e2ccc5c7411838a50c8a7fc95ca0ee` | 8X8D4 block 1 tile 1 | map 21, square (0,15) facing north, column 4 row 6 | `kuto-border-fountain-terrain-ebbb3407ad77.png` (area 18, 29) |
| `tile:21:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D4 block 1 tile 7 | map 21, square (15,8) facing south, column 4 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:21:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D4 block 1 tile 15 | map 21, square (0,8) facing west, column 5 row 6 | `podal-west-boundary-terrain-f5d7a245e0ac.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |

#### tile set 8X8D4 block 5 (102)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:21:0145c0de44fed68a6e829858630a66fa1858cf6d7f80e3781a08ba21b628d989` | 8X8D4 block 5 tile 47 over 8X8D1 block 203 tile 12 | map 21, square (8,6) facing west, column 3 row 5 | `podal-shrine-side-lanes-terrain-0145c0de44fe.png` (area 18) |
| `tile:21:01697ad7b036813ed1b469175cdc453587c02d633b910dbea068f811eda34255` | 8X8D4 block 5 tile 9 | map 21, square (6,0) facing north, column 4 row 7 | `podal-shrine-side-lanes-terrain-01697ad7b036.png` (area 0, 8, 18, 24) |
| `tile:21:023ec9a774d8530335b342044ef3f55fbd114a48c2326e679d260ef15e8fe320` | 8X8D4 block 5 tile 25 | map 21, square (7,6) facing south, column 0 row 4 | `podal-workshop-lanes-terrain-023ec9a774d8.png` (area 18, 24) |
| `tile:21:030897c60c4ca0be7233553ad89ed0f923beb8b9eb41badca8605caadfe02e2e` | 8X8D4 block 5 tile 56 over sky colour 12 | map 21, square (7,5) facing south, column 0 row 1 | `bane-treasure-walk-terrain-030897c60c4c.png` (area 24) |
| `tile:21:0618d6cdc542a96502c9f55225212e813b9845d14a0173e6e6a39fae9f5b0540` | 8X8D4 block 5 tile 30 | map 21, square (9,8) facing west, column 4 row 6 | `bane-altar-paving-joins-0618d6cdc542.png` (area 24) |
| `tile:21:061e8aff8c276dec87583214a75e67ba19ca9f54268f6d059e9643bb384faaf9` | 8X8D4 block 5 tile 57 over 8X8D4 block 5 tile 57 over sky colour 12 | map 21, square (7,5) facing south, column 5 row 1 |  |
| `tile:21:071755a29c7aee80718c3ed78a27961932ce32d0d64f9e10a560517bf4f23756` | 8X8D4 block 5 tile 24 over 8X8D4 block 5 tile 6 over sky colour 12 | map 21, square (9,7) facing east, column 9 row 1 |  |
| `tile:21:076b541157110c6c87b7457adfe600f7d234aaac2da3a2796536d6ab6d0d560d` | 8X8D4 block 5 tile 23 over 8X8D4 block 5 tile 6 over sky colour 12 | map 21, square (6,7) facing west, column 1 row 1 |  |
| `tile:21:092256c86cef99877084f8d263b16051586a243198dc58b52323de56de4b608a` | 8X8D4 block 5 tile 59 over 8X8D4 block 5 tile 59 over the ground colour 6 | map 21, square (6,0) facing north, column 5 row 6 | `new-phlan-civic-terrain-092256c86cef.png` (area 0, 8, 11, 24) |
| `tile:21:0c7732f13856e8cd20061031338abf4be17558ae34803b8dfbca4e1290e7f397` | 8X8D4 block 5 tile 4 | map 21, square (6,0) facing north, column 3 row 3 | `podal-shrine-side-lanes-terrain-0c7732f13856.png` (area 0, 8, 18, 24) |
| `tile:21:0e85ae50ca9229200061641963f7876c217ce7f4dc88a393a1b5b0ae696d96ac` | 8X8D4 block 5 tile 51 over 8X8D4 block 5 tile 51 over 8X8D4 block 5 tile 50 over sky colour 12 | map 21, square (8,5) facing south, column 3 row 2 |  |
| `tile:21:10bf12baf29408481a0c53115f209c404df6eddaef8a075361781014dbc213e7` | 8X8D4 block 5 tile 8 | map 21, square (6,0) facing north, column 4 row 8 | `podal-shrine-side-lanes-terrain-10bf12baf294.png` (area 0, 8, 18, 24) |
| `tile:21:11913c45250c4c34aec752f37ff9b05ae2b236993864f93278d061fc017efc79` | 8X8D4 block 5 tile 55 over 8X8D4 block 5 tile 55 over sky colour 11 | map 21, square (6,0) facing north, column 3 row 1 | `new-phlan-building-paving-joins-0-11913c45250c.png` (area 0, 8, 24) |
| `tile:21:1268f06da827bbf72b6721ce171c2c267473da4db8b637d5332c803f61fad919` | 8X8D4 block 5 tile 31 | map 21, square (8,7) facing west, column 0 row 6 | `podal-workshop-lanes-terrain-1268f06da827.png` (area 18, 24) |
| `tile:21:141ade08c2e93f9373305245eeff8c07caa785a1887598812c718081b95646dc` | 8X8D4 block 5 tile 47 over 8X8D4 block 5 tile 36 | map 21, square (7,6) facing east, column 9 row 6 | `podal-shrine-side-lanes-terrain-141ade08c2e9.png` (area 18, 24) |
| `tile:21:164a07d4807884d4c0a92b54a97c2c0e22024c8648f86ba3d02ca01a0226cfa2` | 8X8D4 block 5 tile 28 | map 21, square (6,8) facing south, column 0 row 8 | `podal-workshop-lanes-terrain-164a07d48078.png` (area 18, 24) |
| `tile:21:185aabb65845f72434920477aca8840a620ac3b4a1b88cbe4c8017bf03e2c52c` | 8X8D4 block 5 tile 40 | map 21, square (7,8) facing west, column 0 row 8 | `podal-workshop-lanes-terrain-185aabb65845.png` (area 18, 24) |
| `tile:21:1a1d39e7d0d78e4676d1728fa952e9bcdb42c91d8683cd666331834e6e7e7a27` | 8X8D4 block 5 tile 67 over 8X8D4 block 5 tile 67 over 8X8D4 block 9 tile 27 over sky colour 12 | map 21, square (8,6) facing west, column 4 row 4 | `bane-altar-paving-joins-1a1d39e7d0d7.png` (area 24) |
| `tile:21:1df4f051066f64c43fc4a6b7947f9620bf66cc7146f574d8a993f8d532eeca01` | 8X8D4 block 5 tile 32 | map 21, square (7,7) facing east, column 10 row 6 | `podal-workshop-lanes-terrain-1df4f051066f.png` (area 18, 24) |
| `tile:21:207b7f4830988664ddd5cfc189fd50c2e5b758129da008159a4d9731d8d2b576` | 8X8D4 block 5 tile 44 | map 21, square (7,6) facing east, column 7 row 4 | `podal-shrine-side-lanes-terrain-207b7f483098.png` (area 18, 24) |
| `tile:21:20e744fe323fa0ea5768bd2a2c9a80af7518bf946dc89fc11c9c34fc9916e1c7` | 8X8D4 block 5 tile 59 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 21, square (7,4) facing south, column 2 row 5 | `bane-altar-terrain-20e744fe323f.png` (area 24) |
| `tile:21:21a905633d9c89ed30f6273cdb0a6e41260d0fc2a93ea4e1a68bc263a0548fba` | 8X8D4 block 5 tile 20 over the ground colour 6 | map 21, square (7,10) facing east, column 10 row 7 |  |
| `tile:21:21c3526814a3918724a042fc0267b60104cf88c0ef811989b485a282905c15b7` | 8X8D4 block 5 tile 49 | map 21, square (6,0) facing west, column 0 row 10 | `podal-cobble-floor-21c3526814a3.png` (area 18, 24) |
| `tile:21:2409020d9c57c7711f39a233676fbab8bb9c90ec232e839fe2f4a4f416857e8d` | 8X8D4 block 5 tile 46 | map 21, square (7,7) facing south, column 0 row 5 | `bane-altar-terrain-2409020d9c57.png` (area 24) |
| `tile:21:254d6fee54cd76a23d0f39af716ec5ae85acb8a1f2a6da107e9f0cbb75385836` | 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 22 | map 21, square (7,6) facing west, column 0 row 7 |  |
| `tile:21:259a6005cb1ac0534c46e4d11158b3a12e6648cb3af24fcae217296df65cbc6c` | 8X8D4 block 5 tile 41 | map 21, square (7,6) facing south, column 8 row 3 | `podal-workshop-lanes-terrain-259a6005cb1a.png` (area 18, 24) |
| `tile:21:25bb6466178c67efd63ad21c6e80cc90ed0ca8cbebbf4ad98eaf5ccc6f9f1624` | 8X8D4 block 5 tile 69 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (7,8) facing east, column 4 row 4 |  |
| `tile:21:2edd110cf91808f0a5ee3278775fb06c10f1fe395dc8428421ed98467575cecf` | 8X8D4 block 5 tile 65 | map 21, square (7,8) facing north, column 4 row 6 | `new-phlan-civic-terrain-2edd110cf918.png` (area 0, 8, 18, 24) |
| `tile:21:2ef1d0e6a7db6456bccdb5598bdbe75416778194b76407dffd458796d560d462` | 8X8D4 block 5 tile 63 | map 21, square (6,0) facing north, column 10 row 10 | `podal-cobble-floor-2ef1d0e6a7db.png` (area 18) |
| `tile:21:34dfa141daf27b3c85ef5c8558e5a5c833cee4791c09d422bf3fda028b0817fd` | 8X8D4 block 5 tile 45 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 21, square (7,6) facing south, column 3 row 5 | `bane-sanctuary-terrain-34dfa141daf2.png` (area 24) |
| `tile:21:37c1bb9341021115b664758362ffa606a4f93b9b1629cb77c3b6b9f847e43cda` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 6 over sky colour 12 | map 21, square (7,5) facing west, column 1 row 1 | `bane-sanctuary-terrain-37c1bb934102.png` (area 24) |
| `tile:21:384b3db048aec1cc9c5f9cd1b63ac2aafedb993fdbfd23e2267dd5ad788ec375` | 8X8D4 block 5 tile 13 | map 21, square (7,9) facing south, column 2 row 5 | `podal-shrine-side-lanes-terrain-384b3db048ae.png` (area 18, 24) |
| `tile:21:38814527e4670422a8d54f184289d398dee69d40251e1e2fb2a93596c4092b96` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D4 block 9 tile 27 over sky colour 11 | map 21, square (6,0) facing north, column 2 row 2 |  |
| `tile:21:3bd06c2cb3cf105fcfcb7999d9c82c401a31a2c874ad4e8fe2b8d70e3c0ba8e0` | 8X8D4 block 5 tile 58 | map 21, square (6,0) facing north, column 5 row 7 | `podal-workshop-lanes-terrain-3bd06c2cb3cf.png` (area 0, 8, 18, 24) |
| `tile:21:3e1090e78979c4c9f9df8291dfd3be1612c88020fc157ebdc5d6630c091ba677` | 8X8D4 block 5 tile 53 over 8X8D4 block 5 tile 53 over sky colour 11 | map 21, square (6,0) facing north, column 4 row 1 | `bane-gate-terrain-3e1090e78979.png` (area 24) |
| `tile:21:3f5c91cb0f492dabf7ba2d09ad7c6da460f8b208d9e0c6afabfcafb191ba0025` | 8X8D4 block 5 tile 43 over sky colour 12 | map 21, square (7,6) facing east, column 8 row 4 | `podal-shrine-side-lanes-terrain-3f5c91cb0f49.png` (area 18, 24) |
| `tile:21:3fa6cf4676a48932c9e325a5f64128f1b4af9dc7398d0422955dbe43d3669f03` | 8X8D4 block 5 tile 23 over sky colour 12 | map 21, square (7,6) facing south, column 0 row 3 | `podal-workshop-lanes-terrain-3fa6cf4676a4.png` (area 18, 24) |
| `tile:21:404de947b1c3dccb369cf7af07812c10a97013ed0c3f538ef6a81060b58032d5` | 8X8D4 block 5 tile 51 over sky colour 12 | map 21, square (7,5) facing east, column 10 row 0 |  |
| `tile:21:452118d96dcf90836db29fa3b9ad629d876984ade695d5956b2ca49304ef76c2` | 8X8D4 block 5 tile 60 | map 21, square (6,0) facing north, column 4 row 6 | `podal-shrine-side-lanes-terrain-452118d96dcf.png` (area 0, 8, 18, 24) |
| `tile:21:47ec4b15094d68775c69c2b62c39ea8cc3f449b9fae26b213873f6ef7df8d874` | 8X8D4 block 5 tile 69 over sky colour 12 | map 21, square (8,6) facing south, column 2 row 2 | `bane-treasure-walk-terrain-47ec4b15094d.png` (area 24) |
| `tile:21:498b73260d97e644afe7426589de26373d90bf5baaaa5e3aa141c892755b78e7` | 8X8D4 block 5 tile 36 | map 21, square (7,6) facing south, column 8 row 8 | `podal-cobble-floor-498b73260d97.png` (area 18, 24) |
| `tile:21:4a6e7d88447698cb68f69ce59ca7982d660a5b76cb45afc8b62107b42d80fef3` | 8X8D4 block 5 tile 47 over 8X8D4 block 5 tile 41 | map 21, square (7,6) facing east, column 9 row 5 |  |
| `tile:21:55fef8d37b1b98be42a153ec5b895daf6fd0cad9de82dd35f61ee3d9720fc58c` | 8X8D4 block 5 tile 7 over sky colour 11 | map 21, square (6,0) facing north, column 1 row 1 | `bane-gate-terrain-55fef8d37b1b.png` (area 24) |
| `tile:21:568b6dbfe4a2147b7c4930a629793aa049b682b65ed9f52a3b3e5da43e89eef9` | 8X8D4 block 5 tile 22 | map 21, square (7,6) facing south, column 0 row 7 | `podal-cobble-floor-568b6dbfe4a2.png` (area 18, 24) |
| `tile:21:578312445d28f7cb34207332dcbae26e8360793066255d1e3ae16128b118a31c` | 8X8D4 block 5 tile 10 | map 21, square (6,8) facing south, column 1 row 8 | `podal-workshop-lanes-terrain-578312445d28.png` (area 18, 24) |
| `tile:21:5b720a6a4fb8f83e4418b0f0f966a810b4590d0afca70948ce8f8a9253443abe` | 8X8D4 block 5 tile 64 | map 21, square (7,8) facing north, column 9 row 6 | `podal-cobble-floor-5b720a6a4fb8.png` (area 0, 18, 24) |
| `tile:21:63d086162996a91f0409156905fbaa45d42395ef004b279b17e51500b5fdfc15` | 8X8D4 block 5 tile 17 over sky colour 12 | map 21, square (7,8) facing north, column 4 row 3 | `bane-altar-terrain-63d086162996.png` (area 24) |
| `tile:21:651c198944d18884f12570fb5bdf8dc5bf4b4f15bfd324233879b73050e95e85` | 8X8D4 block 5 tile 18 over sky colour 11 | map 21, square (4,0) facing east, column 6 row 3 | `bane-north-court-terrain-651c198944d1.png` (area 24) |
| `tile:21:738307136e6c7dfe7ed1d5924ebb30927ef2f162cbc598900100ba00750145d6` | 8X8D4 block 5 tile 57 over 8X8D4 block 5 tile 57 over sky colour 11 | map 21, square (6,0) facing north, column 5 row 1 | `bane-gate-terrain-738307136e6c.png` (area 24) |
| `tile:21:743465f1979ba29859499e988ccb19a786bfe022c2a65bdf37482c353f6f532b` | 8X8D4 block 5 tile 52 over sky colour 11 | map 21, square (6,0) facing north, column 0 row 0 | `city-hall-district-terrain-30.png` (area 0, 8, 24) |
| `tile:21:76d1518376e46a2c1398f330a29e4b477a1aab8aacca84ae69f721166d0fae9a` | 8X8D4 block 5 tile 35 | map 21, square (7,3) facing south, column 2 row 5 | `podal-south-arcade-terrain-76d1518376e4.png` (area 18, 24) |
| `tile:21:76d272359b8d0ba4ab10638cd5d972cf295ac7ce25c65326995a5665f8bb3d4a` | 8X8D4 block 5 tile 47 over sky colour 12 | map 21, square (7,6) facing west, column 1 row 2 | `podal-shrine-side-lanes-terrain-76d272359b8d.png` (area 18, 24) |
| `tile:21:791da9b2a71e7d7f831a6bec448e9060b9def2986f27ddfe9f223b72d70471c3` | 8X8D4 block 5 tile 43 over the ground colour 6 | map 21, square (7,6) facing east, column 8 row 6 | `podal-shrine-side-lanes-terrain-791da9b2a71e.png` (area 18, 24) |
| `tile:21:81d65750b8a8e4ce6f3913519e42dc07b79dd3f97843ecc9f8a1fc901fd3cde1` | 8X8D4 block 5 tile 47 over 8X8D4 block 5 tile 42 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (7,6) facing east, column 9 row 4 | `bane-sanctuary-terrain-81d65750b8a8.png` (area 24) |
| `tile:21:81f9ad47ef9cbfac00f477435db61bab129bfb6efcde48a0fd7d95e00ef3b702` | 8X8D4 block 5 tile 20 over 8X8D4 block 9 tile 52 | map 21, square (8,10) facing east, column 10 row 5 |  |
| `tile:21:8425ebc8acfc93206c2b3b10a8dc66bfedd5accd6f02447c729e63eb951ce082` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 67 over sky colour 12 | map 21, square (7,5) facing south, column 8 row 2 | `bane-treasure-walk-terrain-8425ebc8acfc.png` (area 24) |
| `tile:21:881bf36e1b7b8508eca7a0bdd57ac2dc70dea3e4a05400659c869cd71fba5aa3` | 8X8D4 block 5 tile 55 over 8X8D4 block 5 tile 55 over sky colour 12 | map 21, square (7,5) facing south, column 3 row 1 |  |
| `tile:21:88b4332eea30bd70906810bb5f153dfa09d6ea99cacf1aa871b89c2038a8257d` | 8X8D4 block 5 tile 47 over 8X8D4 block 5 tile 47 over 8X8D4 block 5 tile 34 | map 21, square (9,7) facing south, column 8 row 6 |  |
| `tile:21:8a55e4ba11b6d511cc4489f53fa05d11d09e819261f8918d9f987dfb9d629093` | 8X8D4 block 5 tile 54 over 8X8D4 block 5 tile 54 over sky colour 12 | map 21, square (7,5) facing south, column 6 row 1 | `bane-sanctuary-terrain-8a55e4ba11b6.png` (area 24) |
| `tile:21:8dd1556ee58455c0ad59b27fa19e75545c8f3f9ccf299cd7ad0d799a898cd1f8` | 8X8D4 block 5 tile 39 | map 21, square (7,8) facing east, column 10 row 8 | `podal-workshop-lanes-terrain-8dd1556ee584.png` (area 18, 24) |
| `tile:21:8f0e6579d7872a4d8a2891c4247c62a0da055971d2ce4c9b7fd1bd193b589f58` | 8X8D4 block 5 tile 14 | map 21, square (7,8) facing north, column 4 row 4 | `new-phlan-civic-terrain-8f0e6579d787.png` (area 0, 8, 18, 24) |
| `tile:21:947a0fb3e20ee928ec232553003a76851246b61a7165ecec40aaea1f10ba9e0c` | 8X8D4 block 5 tile 19 | map 21, square (7,10) facing west, column 0 row 5 | `bane-altar-approach-terrain-947a0fb3e20e.png` (area 24) |
| `tile:21:9d8e720d8a91e1e5b7fd234ff77f2d5a2e6fe21a68576c77094190f908822772` | 8X8D4 block 5 tile 20 over 8X8D4 block 9 tile 15 | map 21, square (7,10) facing east, column 10 row 5 |  |
| `tile:21:a121dd3adc74e4eeec0f561340750abfd88526c6dd9a042538319f4c62f0206a` | 8X8D4 block 5 tile 67 over 8X8D4 block 5 tile 14 | map 21, square (7,4) facing south, column 1 row 4 | `bane-rampart-paving-a121dd3adc74.png` (area 24) |
| `tile:21:a29e4f78b2d4806b7daf319460c217def8cf1ff75455d4895d10e2432a77a180` | 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (6,7) facing east, column 3 row 4 | `bane-sanctuary-terrain-a29e4f78b2d4.png` (area 24) |
| `tile:21:a7c9b25c1026cb79d1ee966a4f554c7e66b8067159934142af4dcc15d0fb15c0` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D4 block 9 tile 26 over sky colour 12 | map 21, square (8,6) facing east, column 8 row 2 |  |
| `tile:21:a9ec2dad135f4e96dc4f2f9453c41f6839a33e91b4071feb819c702b6229b86e` | 8X8D4 block 5 tile 59 over 8X8D4 block 5 tile 59 over 8X8D1 block 203 tile 12 | map 21, square (6,0) facing east, column 5 row 6 |  |
| `tile:21:aafaf1a07a36fe7adc6f58cac01630fd86675ec02b6ac5be58c7cea01e286f31` | 8X8D4 block 5 tile 6 over sky colour 11 | map 21, square (6,0) facing north, column 1 row 0 | `bane-gate-terrain-aafaf1a07a36.png` (area 24) |
| `tile:21:adaacb03cf1395981366dea632859112fef0f841d6c6895d0a1af6c1176e307c` | 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 23 over 8X8D4 block 5 tile 50 over sky colour 12 | map 21, square (7,6) facing west, column 0 row 3 | `podal-shrine-side-lanes-terrain-adaacb03cf13.png` (area 18) |
| `tile:21:ae229021c890bcfa256d91638c7eca469fa51e8bf68f1dbff14b6b49bbcfb01c` | 8X8D4 block 5 tile 50 over 8X8D4 block 5 tile 50 over 8X8D4 block 5 tile 18 over sky colour 12 | map 21, square (7,4) facing south, column 6 row 3 | `bane-treasure-walk-terrain-ae229021c890.png` (area 24) |
| `tile:21:aec98271b4155f47073e99423fc2345704e592c16f434d27fb108df81f2ba8b0` | 8X8D4 block 5 tile 67 over 8X8D4 block 5 tile 67 over 8X8D4 block 9 tile 26 over sky colour 12 | map 21, square (7,6) facing east, column 6 row 4 |  |
| `tile:21:afcce2e35d81fb6e32eeb13151c302f9d8cc45518a8d5aa73de6061b316548ec` | 8X8D4 block 5 tile 37 | map 21, square (6,8) facing east, column 6 row 6 | `bane-altar-paving-joins-afcce2e35d81.png` (area 24) |
| `tile:21:b089021fb5441623c0ac282378995eda7c3667072b2333bfcac5ce04989b0c50` | 8X8D4 block 5 tile 51 over sky colour 11 | map 21, square (6,0) facing north, column 10 row 0 | `new-phlan-building-paving-joins-0-b089021fb544.png` (area 0, 8, 24) |
| `tile:21:b41b8352eae61850bf9be786d9c18aecee304cbdb3e7b7d268e510e8c53a72b3` | 8X8D4 block 5 tile 33 | map 21, square (8,10) facing west, column 2 row 7 | `bane-altar-approach-terrain-b41b8352eae6.png` (area 24) |
| `tile:21:b4c895f45f348d0190b70b5fd41cc6245400b11a0fab6ee0097eeabb9e9f18bf` | 8X8D4 block 5 tile 43 over 8X8D1 block 203 tile 12 | map 21, square (7,6) facing east, column 8 row 5 | `podal-shrine-side-lanes-terrain-b4c895f45f34.png` (area 18) |
| `tile:21:b5f9ae0637628bd41724848ae763c955501dbb7d9c8f1cd7d151475b2b07913f` | 8X8D4 block 5 tile 29 | map 21, square (8,6) facing south, column 2 row 8 | `bane-altar-paving-joins-b5f9ae063762.png` (area 24) |
| `tile:21:b8b729925153702a7a6c1207bf7e5fad499e1e832d68e1fdeed7683970520dee` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D4 block 9 tile 26 over sky colour 11 | map 21, square (6,0) facing west, column 8 row 2 |  |
| `tile:21:baf11928c56c8f093d0b0635d0196258cf5c576da59c4073554c82c09adf992a` | 8X8D4 block 5 tile 42 over sky colour 12 | map 21, square (7,6) facing south, column 8 row 2 | `podal-workshop-lanes-terrain-baf11928c56c.png` (area 18, 24) |
| `tile:21:bc2bf1391f5b5d0e8e71b30a99675da8bca9d879354b071c19432f5f172d472e` | 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 43 over 8X8D4 block 5 tile 14 | map 21, square (6,7) facing south, column 6 row 4 | `bane-altar-approach-terrain-bc2bf1391f5b.png` (area 24) |
| `tile:21:bd6a64fa5fc60d4149863e4297f3c9161423e0e3d029e545ef099ca9fbbe888c` | 8X8D4 block 5 tile 21 | map 21, square (7,6) facing south, column 7 row 7 | `podal-cobble-floor-bd6a64fa5fc6.png` (area 18, 24) |
| `tile:21:bf4b6ce5ef0139bbd6c3f5f34faa59723cb8d5c9349c789f75e443c9af495701` | 8X8D4 block 5 tile 24 over sky colour 12 | map 21, square (7,6) facing south, column 7 row 3 | `podal-workshop-lanes-terrain-bf4b6ce5ef01.png` (area 18, 24) |
| `tile:21:c19b9e1cf3c97e051af0f5db336eaa2d09397d65d4b5d8356234aae7d835d365` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D1 block 203 tile 16 over sky colour 12 | map 21, square (8,6) facing north, column 8 row 2 | `bane-sanctuary-terrain-c19b9e1cf3c9.png` (area 24) |
| `tile:21:c1a43294ec22a38e01ab2604f2ad7479a3c156a6e3fc56da0731a3944e458cbb` | 8X8D4 block 5 tile 42 over 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (8,8) facing west, column 6 row 4 |  |
| `tile:21:c55f9dff0da357ba6ad51c8def990818ae2ae09981047d68157916c417038cdc` | 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (7,3) facing south, column 2 row 4 | `bane-altar-terrain-c55f9dff0da3.png` (area 24) |
| `tile:21:c8a01e9835a9674a2c2f98cce38898e522378e360f3d18c696a4639f41af3eaf` | 8X8D4 block 5 tile 18 over sky colour 12 | map 21, square (7,8) facing north, column 9 row 3 | `bane-altar-terrain-c8a01e9835a9.png` (area 24) |
| `tile:21:c97685125724f596804cd5abdfe634c07241d3f365c8bcedf5c69fba0569aa8b` | 8X8D4 block 5 tile 5 | map 21, square (7,8) facing south, column 2 row 8 | `podal-workshop-lanes-terrain-c97685125724.png` (area 18, 24) |
| `tile:21:ca66beb5d5923e7d2dfc2257cbf331d3f3b84e6e9a8076759f28ab49952f0368` | 8X8D4 block 5 tile 16 | map 21, square (7,10) facing south, column 0 row 5 | `podal-shrine-side-lanes-terrain-ca66beb5d592.png` (area 18, 24) |
| `tile:21:d0f56d87eee16a503cf0bc41fdbb1249c62652b42841d109989084b691b44f0d` | 8X8D4 block 5 tile 68 over sky colour 12 | map 21, square (7,4) facing south, column 2 row 4 | `bane-altar-paving-joins-d0f56d87eee1.png` (area 24) |
| `tile:21:d2a1558a9fb15d0375e5ac4f9064eb9d8c2841add52610be61031d2a08190fef` | 8X8D4 block 5 tile 50 over 8X8D4 block 5 tile 17 over sky colour 12 | map 21, square (7,4) facing south, column 1 row 3 | `bane-treasure-walk-terrain-d2a1558a9fb1.png` (area 24) |
| `tile:21:d382403dfd36131cb94d6bc937674975ad34c9d5dad9009adbacd00cd3509fcd` | 8X8D4 block 5 tile 6 over 8X8D4 block 5 tile 6 over 8X8D4 block 5 tile 50 over sky colour 12 | map 21, square (7,5) facing south, column 8 row 1 | `bane-treasure-walk-terrain-d382403dfd36.png` (area 24) |
| `tile:21:dc6c3d5510b0653401790072e22a586a17ac1d36bc9b0f782ea2f57ec58b7828` | 8X8D4 block 5 tile 1 | map 21, square (7,3) facing south, column 3 row 5 | `podal-south-arcade-terrain-dc6c3d5510b0.png` (area 0, 18, 24) |
| `tile:21:de5d701c9a63f815da3a5ac4d3259bcb1a468994ed53a3213c4c2cae2772c1d7` | 8X8D4 block 5 tile 53 over 8X8D4 block 5 tile 53 over sky colour 12 | map 21, square (7,5) facing south, column 4 row 1 | `bane-sanctuary-terrain-de5d701c9a63.png` (area 24) |
| `tile:21:e2237e9ab1d7f3c042fcb38f788598597b973215ae67194d1833748eda49617e` | 8X8D4 block 5 tile 48 | map 21, square (6,0) facing east, column 10 row 10 | `podal-cobble-floor-e2237e9ab1d7.png` (area 18, 24) |
| `tile:21:e42d2d150d9d4f0638fd904e4f63b67e41783b3d26792412bc7a6862c59e0065` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D1 block 203 tile 17 over sky colour 12 | map 21, square (7,6) facing north, column 2 row 2 | `bane-sanctuary-terrain-e42d2d150d9d.png` (area 24) |
| `tile:21:e4c4cfe2e11e35939f460141bf79788540aa7b376191f2eff650b06913c59070` | 8X8D4 block 5 tile 27 | map 21, square (7,7) facing south, column 1 row 5 | `podal-shrine-side-lanes-terrain-e4c4cfe2e11e.png` (area 18, 24) |
| `tile:21:e8d4a7c8599a6ef4c03d7662f5011ff2af15c8bb523b808fb8866822294e7b8b` | 8X8D4 block 5 tile 67 over 8X8D1 block 203 tile 16 over sky colour 12 | map 21, square (7,7) facing north, column 9 row 4 | `bane-altar-paving-joins-e8d4a7c8599a.png` (area 24) |
| `tile:21:ed2de710665e57de96fa14612dc7f348d36b0b63c8c8488005b99eb6495217b6` | 8X8D4 block 5 tile 15 | map 21, square (8,6) facing south, column 2 row 3 | `bane-treasure-walk-terrain-ed2de710665e.png` (area 24) |
| `tile:21:edadac4e16775a226240148d5a36e848e2334afae0e2592dccd20b1480446507` | 8X8D4 block 5 tile 38 | map 21, square (7,10) facing east, column 8 row 7 | `podal-workshop-lanes-terrain-edadac4e1677.png` (area 18, 24) |
| `tile:21:f116bd07ec689f8d662d181e5027c9f9b60bd58cb16d6a9d6c0212b3c96d5c66` | 8X8D4 block 5 tile 7 over 8X8D4 block 5 tile 7 over 8X8D4 block 9 tile 27 over sky colour 12 | map 21, square (7,6) facing west, column 2 row 2 |  |
| `tile:21:f4869b3d1f02f79ce7120b1c9055fa9a11e07c1eca7c209525c7d6731fdc53f8` | 8X8D4 block 5 tile 56 over 8X8D4 block 5 tile 56 over sky colour 11 | map 21, square (6,0) facing north, column 7 row 1 | `new-phlan-building-paving-joins-0-f4869b3d1f02.png` (area 0, 8, 24) |
| `tile:21:f518ea1fc471b9461565dd79b87e39deb0b9c42c4eba39c33eae0e7241007b20` | 8X8D4 block 5 tile 34 | map 21, square (7,7) facing south, column 1 row 6 | `bane-altar-paving-joins-f518ea1fc471.png` (area 24) |
| `tile:21:fa92d68c379f3fe2612e175f7a880b123e87499c44662ba1734679bbc357f66d` | 8X8D4 block 5 tile 54 over 8X8D4 block 5 tile 54 over sky colour 11 | map 21, square (6,0) facing north, column 6 row 1 | `bane-gate-terrain-fa92d68c379f.png` (area 24) |

#### tile set 8X8D4 block 9 (11)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:21:00308b20dd60e4fcb79944ec771fa830560f10e9df85f3fb9dc38c4169ee872a` | 8X8D4 block 9 tile 27 over 8X8D4 block 5 tile 50 over sky colour 11 | map 21, square (5,1) facing east, column 3 row 3 |  |
| `tile:21:047999a951e18a76faa74bddd9e5c5668fa48328dc364e108ddabc89608836c1` | 8X8D4 block 9 tile 69 | map 21, square (4,5) facing east, column 5 row 5 | `zhentil-east-yard-terrain-047999a951e1.png` (area 28) |
| `tile:21:414260af77afd8aef64b37cc3ab35c6ffbbbeeb0b6491dfc427d38dd5064d5e8` | 8X8D4 block 9 tile 42 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 21, square (6,11) facing east, column 9 row 5 |  |
| `tile:21:4cc8264f5ecd2c21e583e5b83e3a954af56946f1e4ca455177fd0c176b120edd` | 8X8D4 block 9 tile 27 over 8X8D4 block 5 tile 6 over sky colour 11 | map 21, square (5,0) facing south, column 1 row 1 |  |
| `tile:21:7143a050c3f7b7ed9ad82387d8e9c8718cfc65da371bd7de40a7a90ef8ece325` | 8X8D4 block 9 tile 50 | map 21, square (0,10) facing north, column 9 row 5 | `zhentil-east-yard-terrain-7143a050c3f7.png` (area 28) |
| `tile:21:76c761c4e6a82a86174d395dc2c1ac992278f83aa067475a4c4d304b741e8e51` | 8X8D4 block 9 tile 27 over 8X8D4 block 5 tile 66 over sky colour 11 | map 21, square (8,14) facing west, column 1 row 4 |  |
| `tile:21:96fd03da5951e75db896a852086098690883937d60c8147999b4e16b67634a6a` | 8X8D4 block 9 tile 51 | map 21, square (0,6) facing south, column 1 row 5 | `zhentil-outer-courts-terrain-96fd03da5951.png` (area 28) |
| `tile:21:a1b8baf4059c3a18ecd999f94f44fbba3630c87a33820ec33a092d52785d83bd` | 8X8D4 block 9 tile 43 | map 21, square (6,15) facing north, column 7 row 5 | `stojanow-tower-warning-terrain-a1b8baf4059c.png` (area 9, 28) |
| `tile:21:a2d13a2bb170f306bfa910cc7391ab6d5faa733f9980b4076fd0b906bce29b5c` | 8X8D4 block 9 tile 26 over 8X8D4 block 5 tile 66 over sky colour 11 | map 21, square (7,14) facing east, column 9 row 4 |  |
| `tile:21:af6f7f3d23d14e323c0186d2222cbba1b5c65aa423d6a95359fdf066d8be56bb` | 8X8D4 block 9 tile 26 over 8X8D4 block 5 tile 6 over sky colour 11 | map 21, square (5,0) facing north, column 9 row 1 |  |
| `tile:21:e849c31f22b688338a210765bfc98363eec034a8e2111e4d58f27a80da532a1e` | 8X8D4 block 9 tile 26 over 8X8D4 block 5 tile 50 over sky colour 11 | map 21, square (4,1) facing north, column 10 row 3 |  |

### Area 22: Yarash's Pyramid (17)

Map 22; WALLDEF7 block 1 (tiles 8X8D7 block 1), block 3 (tiles 8X8D7 block 3), nothing.

#### tile set 8X8D7 block 1 (16)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:22:3d6d7f0d83f1316810afdb76cf662cb5ac4272762603c2930a53f51cb2a70fd0` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 6 | map 22, square (4,1) facing north, column 3 row 4 | `kuto-west-arcade-terrain-3d6d7f0d83f1.png` (area 2, 29) |
| `tile:22:4c7c3b2be1a3cbf6494a5f4771d30a0af2392eea994aea26766866b6ff1ba28a` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 22, square (11,0) facing south, column 7 row 7 | `slums-courtyard-joins-4c7c3b2be1a3.png` (area 20, 29) |
| `tile:22:4eb517093139f21cce9889991a22361db52d158eb23b7fa26d65a3d16285c93e` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 52 | map 22, square (10,1) facing east, column 3 row 5 |  |
| `tile:22:54ad66560a7c69766cbf1f6a9bbebbdb1f7848cf0e4487cb06d9e69a459d4fb4` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 55 | map 22, square (10,1) facing east, column 3 row 4 |  |
| `tile:22:5cc83393adbd6e029069e66f391eb4853f566090d839096309ac3d8a1c7a949a` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 22, square (10,1) facing east, column 3 row 7 |  |
| `tile:22:78593d4afc03a870c5de5d00ac605a20fb84e973c3a2e373e28e2f8d7de235a4` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 54 | map 22, square (11,0) facing south, column 7 row 4 | `slums-side-arcades-terrain-78593d4afc03.png` (area 20) |
| `tile:22:86551ba6c8aa1db27a72f21e7b3acfe0f3914b8672eba38b00c2480193be089c` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 22 over sky colour 15 | map 22, square (11,0) facing west, column 0 row 2 | `slums-side-arcades-terrain-86551ba6c8aa.png` (area 20) |
| `tile:22:9280d56337bd2920a227ff3e67a3800673354047720a68eab5b11ab4cd3a993c` | 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 7 | map 22, square (2,1) facing north, column 10 row 4 |  |
| `tile:22:9584541ebb4dfd9a81506266a0312e3aba3bfb81aa37a335ada5dcc9e5506bdc` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 17 | map 22, square (12,3) facing north, column 7 row 5 |  |
| `tile:22:a353a86173ab83d526b4032d32f8909aee6e1f21b3f9a9fe33b3d0d994ac79dc` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 55 | map 22, square (9,0) facing south, column 0 row 4 | `mendor-library-terrain-a353a86173ab.png` (area 15) |
| `tile:22:ad7dbb0f3eff703147f1d3b2739c6a093e9d9c737c39ffd57a4eb7cf2d5ffeae` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 52 | map 22, square (9,0) facing south, column 0 row 5 | `mendor-library-terrain-ad7dbb0f3eff.png` (area 15, 29) |
| `tile:22:bfdde368c474f611b5fd15865814de090566c58210b302a779b9f3855500bd63` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 53 | map 22, square (11,0) facing south, column 7 row 5 | `slums-side-arcades-terrain-bfdde368c474.png` (area 20) |
| `tile:22:c549f64602126b7401a307f8c698459faa9ccd6fe4d35f941427b683a4d5625f` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 17 | map 22, square (0,2) facing east, column 3 row 5 |  |
| `tile:22:c71fc7decb96fccb775a69588149f8a650a4a5a6620a0774325ec62fbc79d9b3` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 23 over sky colour 15 | map 22, square (10,1) facing north, column 10 row 2 |  |
| `tile:22:f833dc2c7e1891c03c58bd5a3bacd86665a07e1d8b192c1913a5f01d97e75ecb` | 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 22, square (9,0) facing south, column 0 row 7 | `kuto-earth-chamber-joins-f833dc2c7e18.png` (area 15, 29) |
| `tile:22:fd606ec72596e2370e5bf6ee42c634a6a5e4863b120b747575c1ea0aa0b91bc3` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 3 tile 7 | map 22, square (11,1) facing north, column 7 row 4 |  |

#### tile set 8X8D7 block 3 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:22:6b363b119a72bfe7e76cd10debc969dbe95c16da6489a0019aac12e4b9178cf6` | 8X8D7 block 3 tile 12 over 8X8D7 block 3 tile 12 over sky colour 15 | map 22, square (14,7) facing east, column 4 row 2 |  |

### Area 23: Yarash's Pyramid, lower (39)

Map 23; WALLDEF7 block 1 (tiles 8X8D7 block 1), block 3 (tiles 8X8D7 block 3), nothing.

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:23:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 23, square (12,2) facing north, column 10 row 7 | `route-0ae60cf3309a.png` (area 2, 9, 15, 18, 20, 22, 29) |
| `tile:23:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 23, square (13,2) facing north, column 8 row 8 | `route-699e8b134491.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:23:83a47be8f7541c55e4af4555aef88155720e0c7e664b78d7182822ecc183dce7` | 8X8D1 block 203 tile 35 | map 23, square (12,2) facing east, column 2 row 4 | `slums-guild-corners-terrain-83a47be8f754.png` (area 2, 15, 20, 22, 29) |
| `tile:23:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 23, square (1,2) facing west, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 14, 15, 20, 22, 29) |
| `tile:23:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 23, square (1,2) facing west, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 15, 20, 22, 29) |

#### tile set 8X8D7 block 1 (34)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:23:0278d7e045751e4d542f6ee204b6c2642c5b13bc94db84eccfbb33928e6a2f81` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 16 over sky colour 15 | map 23, square (14,1) facing west, column 7 row 3 | `mendor-library-west-rooms-terrain-0278d7e04575.png` (area 15, 20, 22) |
| `tile:23:06d3f856d5d5c37b20560459bdd2e899a43f72f77149f37ba7c743ed589d0c87` | 8X8D7 block 1 tile 5 over 8X8D7 block 3 tile 0 | map 23, square (0,2) facing west, column 0 row 6 | `yarash-inner-return-terrain-06d3f856d5d5.png` (area 22) |
| `tile:23:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D7 block 1 tile 56 | map 23, square (14,3) facing north, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 9, 14, 15, 20, 22, 29) |
| `tile:23:1c659927f8d8de37f347cb9923c62ff8b121cb4496abd7139fb0b6ad8ebcbd36` | 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 0 | map 23, square (0,3) facing west, column 10 row 6 | `yarash-inner-court-terrain-1c659927f8d8.png` (area 22) |
| `tile:23:1c7914d8638179e01d5da8ef2d1757899c5740d178bd270ee0be0ad911fb5834` | 8X8D7 block 1 tile 4 over sky colour 15 | map 23, square (14,1) facing south, column 10 row 2 | `slums-trade-row-terrain-1c7914d86381.png` (area 15, 20, 22) |
| `tile:23:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D7 block 1 tile 55 | map 23, square (1,2) facing west, column 3 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 22, 29) |
| `tile:23:2b318229a4b2903d4530ecbaa037fb98cc51f1c1731900f01c6dbba9cd27f8e2` | 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 23, square (13,1) facing south, column 0 row 7 | `mendor-east-court-terrain-03.png` (area 2, 15, 20, 22) |
| `tile:23:30a49411e45f51c307970357ef283ec90c8288afb7742c70b4d71bbe9f705f82` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 23, square (14,1) facing west, column 7 row 7 | `mendor-worn-floor-junction-30a49411e45f.png` (area 15, 20, 22) |
| `tile:23:3afb19e8b93efbce226a81d7fc31bbf5ed758889c699794abf237aff236b1411` | 8X8D7 block 1 tile 4 over the ground colour 6 | map 23, square (13,1) facing north, column 10 row 9 | `route-3afb19e8b93e.png` (area 2, 15, 20, 22, 29) |
| `tile:23:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D7 block 1 tile 54 | map 23, square (1,2) facing west, column 2 row 4 | `route-3df247a59ff1.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:23:3fac91ee9d1b24c2e56fcbe21729beb84a920355197406acbbe3102e64ef83a9` | 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 1 | map 23, square (0,3) facing west, column 10 row 2 | `yarash-inner-court-terrain-3fac91ee9d1b.png` (area 22) |
| `tile:23:46d61fcdc2b08771ec2c88b0bc7794ab572d13c6d4f606f1d14a0ccf6b9d4ffb` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 23, square (13,1) facing east, column 3 row 7 | `orc-joint-0ccf6b9d4ffb.png` (area 2, 15, 20, 22) |
| `tile:23:4c8712fe5d77f1f42c5d5d17083727ee42f9a4dc96fa949647efcf15cb1fe36c` | 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 12 | map 23, square (13,1) facing north, column 10 row 2 | `route-4c8712fe5d77.png` (area 2, 15, 20, 22, 26, 29) |
| `tile:23:5795b1b70c9b48e493751effcb0f24b088c03b0cd37d6bbabaddf30f832eafdc` | 8X8D7 block 1 tile 24 over 8X8D7 block 1 tile 24 over sky colour 15 | map 23, square (13,1) facing east, column 4 row 2 | `slums-shop-frontage-terrain-5795b1b70c9b.png` (area 15, 20, 22) |
| `tile:23:7033bf955be23d5fb08585cda628be324924c62fd2e8106836eae4d4d2878076` | 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 17 over sky colour 15 | map 23, square (13,1) facing south, column 0 row 3 | `slums-trade-row-terrain-7033bf955be2.png` (area 15, 20, 22) |
| `tile:23:78b9ac2bd20058bd099365b34299ba8c52ce378e7bf531a1146742456c9cf722` | 8X8D7 block 1 tile 23 over sky colour 15 | map 23, square (13,1) facing north, column 10 row 1 | `slums-trade-row-terrain-78b9ac2bd200.png` (area 15, 20, 22) |
| `tile:23:7f73301b6573dfe6b06da5cfb0cd788e913c0c11788fe0a250ce62ce7f13fd89` | 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 16 over sky colour 15 | map 23, square (14,1) facing south, column 10 row 3 | `slums-trade-row-terrain-7f73301b6573.png` (area 15, 20, 22) |
| `tile:23:8348e8cf591bca7b1e152388ccfeab65b05f250b7600fd8c427c2dbc463069f2` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over sky colour 15 | map 23, square (13,1) facing east, column 7 row 3 | `slums-trade-row-terrain-8348e8cf591b.png` (area 15, 20, 22) |
| `tile:23:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D7 block 1 tile 53 | map 23, square (1,2) facing west, column 2 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 15, 16, 20, 22, 29) |
| `tile:23:87f723061f5a55c5a86757e1634672fbd33447f098e13728a0fb38fed2026152` | 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 3 | map 23, square (1,2) facing south, column 10 row 4 | `yarash-inner-court-terrain-87f723061f5a.png` (area 22) |
| `tile:23:983bfc53257b5c0ef9d10cdd5ba4b4501fed50e212f885a7dd8b3a4c24ca878f` | 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 12 | map 23, square (13,1) facing south, column 0 row 4 | `mendor-east-court-terrain-02.png` (area 2, 15, 20, 22, 29) |
| `tile:23:989907034dc5a8ccb668b5a282a334713bceb7eca7c6f5ce8b5590ee1052877f` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D1 block 203 tile 39 | map 23, square (13,1) facing east, column 7 row 4 | `slums-shop-frontage-terrain-989907034dc5.png` (area 15, 20, 22) |
| `tile:23:9ac33380c39afce48e407e01c663a32dfc37c048c03c911accd29efbdb475032` | 8X8D7 block 1 tile 17 | map 23, square (12,3) facing north, column 9 row 5 | `route-9ac33380c39a.png` (area 2, 15, 20, 22, 29) |
| `tile:23:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D7 block 1 tile 52 | map 23, square (1,2) facing west, column 3 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29) |
| `tile:23:ca76200801250e2324082273c74573623d45b20be41c29f01ce44bc0c6378133` | 8X8D7 block 1 tile 5 over 8X8D7 block 3 tile 1 | map 23, square (0,2) facing west, column 0 row 2 | `yarash-inner-return-terrain-ca7620080125.png` (area 22) |
| `tile:23:cb404f7ed71e3c8c5a855c3af2e0b70086988c8b0fcc7b7e11f6b64992cff365` | 8X8D7 block 1 tile 4 over 8X8D7 block 3 tile 2 | map 23, square (1,2) facing south, column 10 row 5 | `yarash-inner-court-terrain-cb404f7ed71e.png` (area 22) |
| `tile:23:db0db526433e898528c6f97a8ed2b870fc5b6b8432390075aff6f72608c7a061` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 3 tile 3 | map 23, square (0,2) facing south, column 7 row 4 | `yarash-braced-passage-terrain-db0db526433e.png` (area 22) |
| `tile:23:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D7 block 1 tile 57 | map 23, square (12,3) facing north, column 9 row 6 | `route-e0a3abc3b4a8.png` (area 2, 9, 15, 20, 22, 29) |
| `tile:23:e64d4bb2078216ff1f2a0b804d81736f2d63ccbf6d1bb38608eb817557e43c39` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 38 | map 23, square (14,1) facing west, column 3 row 4 | `slums-shop-frontage-terrain-e64d4bb20782.png` (area 15, 20, 22) |
| `tile:23:e8a3dac421d6af612308c07fb01523531f55b4fcb51a7b4798f23b9c9950c854` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over the ground colour 6 | map 23, square (13,1) facing east, column 7 row 7 | `orc-joint-3b9c9950c854.png` (area 2, 15, 20, 22, 29) |
| `tile:23:e9e6a6fa6a9c36c5a43dca56ada96e1fdf95750c43accee9f99c8f3e088a3855` | 8X8D7 block 1 tile 4 over 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 17 over sky colour 15 | map 23, square (13,1) facing east, column 3 row 3 | `mendor-library-west-rooms-terrain-e9e6a6fa6a9c.png` (area 15, 20, 22) |
| `tile:23:f6267d0f88c5dd1e0cb488a42a04434beea6e6a9ac67f2a0d0a896b6a4dd39a8` | 8X8D7 block 1 tile 4 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 23, square (14,1) facing south, column 10 row 7 | `kuto-earth-perimeter-joins-f6267d0f88c5.png` (area 15, 20, 22, 29) |
| `tile:23:f6f788d5dc8b34c85b89b05c16a8afb195f53a565b079be15b69178639de7694` | 8X8D7 block 1 tile 22 over 8X8D7 block 1 tile 22 over sky colour 15 | map 23, square (13,1) facing east, column 7 row 2 | `slums-trade-row-terrain-f6f788d5dc8b.png` (area 15, 20, 22) |
| `tile:23:f9094a93d959e138af7ced5c8f8fdc573a6e59eeb7e3da34bd5bd6d6964e14be` | 8X8D7 block 1 tile 5 over 8X8D7 block 1 tile 5 over 8X8D7 block 3 tile 2 | map 23, square (0,2) facing south, column 7 row 5 | `yarash-braced-passage-terrain-f9094a93d959.png` (area 22) |

### Area 24: Temple of Bane (29)

Map 24; WALLDEF1 block 1 (tiles 8X8D1 block 1), block 3 (tiles 8X8D1 block 3), block 5 (tiles 8X8D1 block 5).

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:07d5c50f71346b8e7dfb1509c04e147875817f2400ca77f9c0ff0e0c12f04290` | 8X8D1 block 203 tile 17 over the ground colour 6 | map 24, square (15,6) facing east, column 10 row 9 | `podal-workshop-lanes-terrain-07d5c50f7134.png` (area 18) |
| `tile:24:f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b` | 8X8D1 block 203 tile 13 | map 24, square (15,4) facing north, column 10 row 4 | `new-phlan-gate-31a92759fb4b.png` (area 0, 1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 26, 27, 29, 31) |

#### tile set 8X8D1 block 1 (10)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D1 block 1 tile 14 | map 24, square (15,4) facing north, column 10 row 3 | `podal-west-boundary-terrain-0264796f9fa2.png` (area 2, 9, 10, 15, 18, 20, 26, 29, 31) |
| `tile:24:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D1 block 1 tile 12 | map 24, square (14,4) facing east, column 4 row 5 | `kuto-podal-side-streets-kuto-terrain-17becf7f4640.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D1 block 1 tile 8 | map 24, square (14,4) facing east, column 5 row 6 | `kuto-earth-chamber-joins-194c7a70c05e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D1 block 1 tile 9 | map 24, square (14,4) facing east, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D1 block 1 tile 21 | map 24, square (13,4) facing east, column 5 row 5 | `kuto-podal-side-streets-kuto-terrain-54cfe77b0fa0.png` (area 2, 4, 9, 14, 15, 18, 29, 31) |
| `tile:24:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D1 block 1 tile 11 | map 24, square (14,4) facing east, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D1 block 1 tile 13 | map 24, square (15,4) facing east, column 7 row 4 | `podal-west-boundary-terrain-9fcdf0ff6bdf.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |
| `tile:24:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D1 block 1 tile 10 | map 24, square (14,4) facing east, column 6 row 5 | `kuto-podal-side-streets-kuto-terrain-e661bce0938e.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D1 block 1 tile 7 | map 24, square (14,4) facing east, column 4 row 6 | `kuto-earth-chamber-joins-f08f5d405196.png` (area 2, 4, 15, 18, 29, 31) |
| `tile:24:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D1 block 1 tile 15 | map 24, square (15,4) facing east, column 5 row 6 | `podal-west-boundary-terrain-f5d7a245e0ac.png` (area 2, 9, 15, 18, 20, 26, 29, 31) |

#### tile set 8X8D1 block 3 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D1 block 3 tile 40 | map 24, square (13,2) facing south, column 2 row 8 | `kuto-earth-perimeter-joins-4c23fe508a44.png` (area 2, 18, 29) |
| `tile:24:6c7ec11bfc006585332f2495cbe7d713d38a049d7b8374177334f0c5c0af5f1d` | 8X8D1 block 3 tile 32 | map 24, square (2,4) facing north, column 4 row 6 | `kuto-earth-chamber-joins-6c7ec11bfc00.png` (area 2, 18, 29) |

#### tile set 8X8D1 block 5 (8)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:061e8aff8c276dec87583214a75e67ba19ca9f54268f6d059e9643bb384faaf9` | 8X8D1 block 5 tile 57 over 8X8D1 block 5 tile 57 over sky colour 12 | map 24, square (3,7) facing west, column 5 row 1 |  |
| `tile:24:2dddaeae22c651a128bd3ce03197cd0b1fb508b8bd45790dd91fd5e749672f28` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 16 over sky colour 11 | map 24, square (14,4) facing south, column 8 row 2 |  |
| `tile:24:2ef1d0e6a7db6456bccdb5598bdbe75416778194b76407dffd458796d560d462` | 8X8D1 block 5 tile 63 | map 24, square (2,7) facing north, column 10 row 10 | `podal-cobble-floor-2ef1d0e6a7db.png` (area 18) |
| `tile:24:3348a925d00f834aca7dfeb1da56f237b010e66ef986254c1987e06416447ede` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 17 over sky colour 11 | map 24, square (14,4) facing south, column 2 row 2 |  |
| `tile:24:381d5ddcf9b1baa18022604b3f482f50124211061b2a1c63a0270976948a71b4` | 8X8D1 block 5 tile 20 over 8X8D1 block 203 tile 12 | map 24, square (15,6) facing east, column 10 row 5 | `podal-shrine-side-lanes-terrain-381d5ddcf9b1.png` (area 18) |
| `tile:24:404de947b1c3dccb369cf7af07812c10a97013ed0c3f538ef6a81060b58032d5` | 8X8D1 block 5 tile 51 over sky colour 12 | map 24, square (3,7) facing south, column 10 row 0 |  |
| `tile:24:881bf36e1b7b8508eca7a0bdd57ac2dc70dea3e4a05400659c869cd71fba5aa3` | 8X8D1 block 5 tile 55 over 8X8D1 block 5 tile 55 over sky colour 12 | map 24, square (3,7) facing west, column 3 row 1 |  |
| `tile:24:f30eb31c5397cd6227a038e3aaf2b1e9cee6bb00f3e710d1a4a869dd27c98616` | 8X8D1 block 5 tile 62 | map 24, square (2,7) facing south, column 0 row 10 | `sokal-near-screen-floor-joint.png` (area 21) |

#### tile set 8X8D1 block 203 (7)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:24:1eb21f61cbb22808e095d2fd9bc7f93b7ad5ab8787e763d6cbe85cdde953f9f4` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 11 | map 24, square (15,5) facing east, column 9 row 1 |  |
| `tile:24:24e75c88b93e67d925a3cc94290fcc4c61f5f99b1462f48b7b10539f64f14f3e` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 12 | map 24, square (0,4) facing south, column 9 row 1 |  |
| `tile:24:aa25fd9c2993ec8955fd9dc8fa03d122fc66df39e037f56ca04a3a2d0e8f0d8a` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 50 over sky colour 12 | map 24, square (0,7) facing north, column 3 row 3 |  |
| `tile:24:db1e168ba5fc3e5ac5398a0202c4822f52443c4af67d80cfba81c0688398784e` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 50 over sky colour 12 | map 24, square (0,8) facing south, column 7 row 3 |  |
| `tile:24:dea84c7c2f6021fca2f2c759076ef027aa4f84a6267d522cd5bd1ee892ba0ecd` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 66 over sky colour 12 | map 24, square (13,9) facing east, column 4 row 4 |  |
| `tile:24:ecff85158038affb0af65074159d912a58696a3d9413b4fb7b1de944eb775fa0` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 6 over sky colour 11 | map 24, square (15,7) facing east, column 1 row 1 |  |
| `tile:24:f455475e32b7361acce9c1163d94f39af856a45f47d7a2f193e36da8d7f601a4` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 6 over sky colour 12 | map 24, square (14,5) facing north, column 1 row 1 |  |

### Area 26: Wilderness, middle (137)

Map 26; WALLDEF7 block 7 (tiles 8X8D7 block 7), block 8 (tiles 8X8D7 block 8), block 23 (tiles 8X8D7 block 23).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:8bcc06efdf06b3769418465aeb92a19e990cc54c212c2e7af5c4fe0897b17b35` | the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 0 row 5 | `orc-joint-fe0897b17b35.png` (area 0, 1, 2, 3, 4, 5, 6, 8, 11, 15, 16, 17, 20, 21, 24, 28, 31) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:5f57b5f1c4d81d263e49f7fba1ce046ca28f98846ad11666368c24c361633169` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (3,1) facing south, column 2 row 5 | `podal-workshop-lanes-terrain-5f57b5f1c4d8.png` (area 15, 18, 29) |
| `tile:26:79f10a451d41cdb7f5f72757c36094300c7dcb298ee8adea8d79a034bc93259e` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (3,1) facing south, column 2 row 5 |  |

#### tile set 8X8D7 block 7 (42)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:06c172195af69c6803d49dd5383a9566e2c3443276f705ade2cf9b52d458c4e8` | 8X8D7 block 7 tile 0 over 8X8D7 block 8 tile 32 | map 26, square (4,15) facing east, column 10 row 7 |  |
| `tile:26:0852506e4ab1c9afeb335b54d670524f4c934ccd10ec2c026e7ecc7adf2aa2f7` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (8,11) facing west, column 4 row 4 |  |
| `tile:26:0e6cbe18a8a92ad9b2b9500268f0c182de7131dd3903e5ed916b0e12ba9375ad` | 8X8D7 block 7 tile 19 over the ground colour 8 | map 26, square (10,0) facing north, column 8 row 7 |  |
| `tile:26:12f52d2b1e182ced19373a8a517c25b13aecd9a617a01fc3a50244efbfef8d5f` | 8X8D7 block 7 tile 45 over 8X8D7 block 7 tile 45 over the ground colour 8 | map 26, square (4,11) facing north, column 4 row 7 |  |
| `tile:26:1d1f11735aa1abd03b26f8064c9f8703b99503f0984aefa72d7e8dd613c832dd` | 8X8D7 block 7 tile 55 over 8X8D7 block 7 tile 55 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 7 |  |
| `tile:26:24d594840521cf5d98895182b43307fcde18dbb0e043f9014447b3ba05a7a410` | 8X8D7 block 7 tile 19 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (2,15) facing east, column 1 row 3 |  |
| `tile:26:39e4c97e1d6f4061c31b294f8f16f9a91a7bdf62a28fb3a9c507713e77a3e35d` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (1,0) facing east, column 0 row 4 | `nomad-canvas-joins-39e4c97e1d6f.png` (area 17) |
| `tile:26:428d34ea8886dce67e324bf68c2c93f1e192a08f8f22add318feb401d2c7428c` | 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (0,0) facing east, column 1 row 4 | `nomad-canvas-joins-428d34ea8886.png` (area 17) |
| `tile:26:42b5602454f3d50149ed8cf0544a95a45906735b91af6a68a133de3ae5d4fb39` | 8X8D7 block 7 tile 16 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (6,9) facing south, column 4 row 4 |  |
| `tile:26:4fcfa1b300546896594b37ea1febf52db8e6a541c97eb4a87a6ceb3a6f94e3a9` | 8X8D7 block 7 tile 52 over 8X8D7 block 7 tile 52 over the ground colour 8 | map 26, square (4,11) facing north, column 5 row 7 |  |
| `tile:26:525cc32fd542b5dc483cfcd9593270ae23c0c61e8a3874e7d76a505f69b9b632` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing north, column 9 row 5 | `nomad-canvas-joins-525cc32fd542.png` (area 17) |
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
| `tile:26:8c502b5c32feef3e5a69b20d77149d2120825b5f12712852ffd6beb3cd14fb81` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (8,13) facing west, column 10 row 4 |  |
| `tile:26:930e47c654cb4204c3b7591687d5402cd660b90fa4ec6317dd05b9e143588601` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing north, column 9 row 5 |  |
| `tile:26:948df3e4533789428269e0a1dac895b830fc222107e05c2e4b6471701840d26e` | 8X8D7 block 7 tile 44 over the ground colour 8 | map 26, square (4,11) facing east, column 4 row 6 |  |
| `tile:26:994476648e8dfcd90bfb329dc5b05961b3fbfc82c754f00062d205df80be7a72` | 8X8D7 block 7 tile 28 | map 26, square (9,10) facing south, column 8 row 8 | `nomad-inner-trail-994476648e8d.png` (area 17) |
| `tile:26:a918ea06119c2d2c402ec352e03184a52677444c754b103e80140ac3edae7b88` | 8X8D7 block 7 tile 46 over the ground colour 8 | map 26, square (9,0) facing east, column 3 row 6 |  |
| `tile:26:acd3f25c3290e989550a208d67b6d82a95119dfa4aa8562c7b411a11729c6b60` | 8X8D7 block 7 tile 15 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (1,14) facing east, column 6 row 4 |  |
| `tile:26:ae562b52d8473d99c7acc99ebb273387f89888ea7245a2f785242111b535ed1b` | 8X8D7 block 7 tile 15 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,14) facing east, column 6 row 4 |  |
| `tile:26:bea6b15ee028518639095b6eaa126e7182d4dc736f13df9442cec0e603fb9109` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (8,11) facing west, column 4 row 4 |  |
| `tile:26:c0450d9bf1998e77789d084426462c2f8aaf0c0dde9d2ce176ec448dadd8a14b` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 55 over sky colour 0 | map 26, square (2,15) facing north, column 9 row 3 |  |
| `tile:26:c0d9eb6b111dccaf822996120467f4838544e5804289e3b4c01fcd19a7daa3d8` | 8X8D7 block 7 tile 15 over sky colour 11 | map 26, square (2,0) facing north, column 10 row 3 | `nomad-canvas-joins-c0d9eb6b111d.png` (area 17) |
| `tile:26:c509ca48ac04ec5b325ea3c1bf97c19fbbbabc8ba76e2a29b643c1658ed9ed26` | 8X8D7 block 7 tile 45 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (4,11) facing west, column 0 row 5 |  |
| `tile:26:c7a112e1bfebc8c75050f01cac8a7990c39e9e462bfca7dedc598d4aa15c4b92` | 8X8D7 block 7 tile 20 over 8X8D7 block 7 tile 6 | map 26, square (2,9) facing south, column 6 row 5 |  |
| `tile:26:d18ab5c0ce1521909b05235b6b6bd10056d1054a839f0947c2d425ea52c18597` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (2,0) facing north, column 4 row 4 | `nomad-canvas-joins-d18ab5c0ce15.png` (area 17) |
| `tile:26:db4f51aa3d610f2a85e8723bf63572cb993a39e6313e9bef5426dbbdee7cb42e` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (1,0) facing north, column 7 row 4 | `nomad-canvas-joins-db4f51aa3d61.png` (area 17) |
| `tile:26:dd4050acf789b4af92cdeea1c2c2411411615d2ecb3479a57ec71862e5b05abe` | 8X8D7 block 7 tile 53 over the ground colour 8 | map 26, square (10,0) facing east, column 0 row 7 |  |
| `tile:26:df4ad0cbb76608e98890630f97ac02141cc128914d5e02354cfa7684652e9974` | 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (7,10) facing west, column 1 row 3 |  |
| `tile:26:e2daff7f76fefcb20d3e79170d3af14ec08a31ae63af859ab2f844b64e0fa785` | 8X8D7 block 7 tile 46 over 8X8D7 block 8 tile 33 | map 26, square (4,15) facing west, column 0 row 7 |  |
| `tile:26:efba91abd9f3d683ea36f5dc27d2e40d92e72e3af159659ed50a1726bfb206d3` | 8X8D7 block 7 tile 0 over 8X8D7 block 7 tile 0 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 8 |  |
| `tile:26:f015aecab9e46cb998fd6257afe68383df8ed2f9b730a1c66ecbee6b0e621cc4` | 8X8D7 block 7 tile 16 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (6,9) facing south, column 4 row 4 |  |
| `tile:26:f80e5cd6a539192958a45af8b52209e3f6d68bc7f25809c96f3db4fdd64995f5` | 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (8,13) facing west, column 10 row 4 |  |

#### tile set 8X8D7 block 8 (83)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:04f268e0292b2af8ef794b2a4dc979b3f6ea59c3283d43d18627d6846bd67461` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 11 | map 26, square (2,2) facing east, column 7 row 3 | `nomad-entry-terrain-04f268e0292b.png` (area 17) |
| `tile:26:06c9677d331fa4c663f40a274f0d5e0ee3e8784d7f040c8c9e9b31eca70ac65c` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 0 row 5 | `nomad-entry-terrain-06c9677d331f.png` (area 17) |
| `tile:26:0a980af61c9cf401625b905efdc527ae41f834c361071d89cc476235036f9549` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (4,0) facing south, column 8 row 4 |  |
| `tile:26:0b876a77f19f2f4c94f8a4a28942ae562807aff90fe38d37a3d5cfa9fdcda7e7` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (4,13) facing west, column 0 row 3 |  |
| `tile:26:0cee35c60132724477beb8dd12b141ee5327e410001d86ace3c1ee81940f6756` | 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,1) facing east, column 8 row 5 | `nomad-entry-terrain-0cee35c60132.png` (area 17) |
| `tile:26:0db5dcd49c1c8006f4bf707f3e1656e223894d183b56cf654bf3dc80d72b305d` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:0f698ff9dab44520b2692c4ef893f80774050951b0f7eeddf8c3134eb31ed9b6` | 8X8D7 block 8 tile 42 over 8X8D7 block 8 tile 42 over sky colour 11 | map 26, square (2,2) facing east, column 10 row 2 | `nomad-entry-terrain-0f698ff9dab4.png` (area 17) |
| `tile:26:15e8b10255e97e7352b9517f24d6747c206329b53d7e71a17bd2a7d0f393c238` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over sky colour 0 | map 26, square (2,2) facing south, column 3 row 4 | `nomad-south-trail-terrain-15e8b10255e9.png` (area 17) |
| `tile:26:1b521d0c4d8f2f9c521c5594863604093a7875a0763ffa9dd65d70a7592d094d` | 8X8D7 block 8 tile 18 over sky colour 0 | map 26, square (0,0) facing west, column 0 row 2 |  |
| `tile:26:230d521fefd536ebd77a37406d3dd889313a664324696041e2ba7b7d85230a34` | 8X8D7 block 8 tile 29 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 1 row 5 | `nomad-entry-terrain-230d521fefd5.png` (area 17) |
| `tile:26:24ba1c5e34fe608031a6df3a388dbfddb138c066a640a6992ebce3fa085595d6` | 8X8D7 block 8 tile 57 over sky colour 11 | map 26, square (2,2) facing north, column 9 row 4 | `nomad-entry-terrain-24ba1c5e34fe.png` (area 17) |
| `tile:26:2c9b9fa12751ae30b0e8d3139c14bcfc3b7342c57e1e3264dbebc861036d854d` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:310b7e9a6899803ea91ed9a46349921223764e303d59967104c700475ca1c32e` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 1 | map 26, square (5,12) facing east, column 3 row 4 |  |
| `tile:26:3cfb83230b6e63972f38fa12f9e3e61e7149a5f3d57dcd6995ccc595d24a97f6` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,1) facing south, column 0 row 4 | `nomad-entry-terrain-3cfb83230b6e.png` (area 17) |
| `tile:26:3f0f15df4dd059be3d1c4e54179e5e2eeddc20e8c01759aa60eb3fb5fd568e4c` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 20 over sky colour 0 | map 26, square (0,0) facing south, column 8 row 4 |  |
| `tile:26:43e75c8f3071fbd0e93f3bd98f07a3c7c56cafed22f63dc8fe77c7234d44b8d1` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:4573f8ac3e5df499c0fdbc3ec1f3938911b3a02d3bec10c3e79191352379e943` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 7 tile 16 over sky colour 0 | map 26, square (2,1) facing north, column 4 row 4 |  |
| `tile:26:45ba49af0f3f706042d6c9f8a9d2892df1a73238fe39ef6dfe05d1448f1f28fc` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:48a9f1c137ba7b76a5b8ad4c150e7566b6daa68bcd14e32c5ef85f4d7f9d66ab` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over sky colour 11 | map 26, square (2,2) facing east, column 10 row 3 | `nomad-entry-terrain-48a9f1c137ba.png` (area 17) |
| `tile:26:4947240effe92625bd5c00b7817a87117916c3bcda45520efd538e22144a9802` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 16 over sky colour 0 | map 26, square (4,13) facing west, column 0 row 3 |  |
| `tile:26:4faafbca57e58258d28549e313f904d970ed1e17c94f6eafc9896d571f1e67e4` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 19 over sky colour 0 | map 26, square (7,0) facing south, column 2 row 4 |  |
| `tile:26:61a050164781f66da0cdeaa89677357be901f14d7b5b5f2835c5d81c41aa3b4c` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 19 over sky colour 0 | map 26, square (4,13) facing west, column 0 row 4 |  |
| `tile:26:667786276e52104454e9f9c2aa32deb1e196c118a098ccf1de456562fac4d855` | 8X8D7 block 8 tile 17 over sky colour 11 | map 26, square (0,0) facing east, column 10 row 2 |  |
| `tile:26:6d1c0a1e107d15147ddc53b0087d9b900b68af5e52c55418e4cc05887f74fbb1` | 8X8D7 block 8 tile 15 over sky colour 11 | map 26, square (0,0) facing south, column 1 row 4 |  |
| `tile:26:6f244471d0d43f45ff07f5f3bfdd4dc475c64024ef0f5af1ae7568ba5da690a0` | 8X8D7 block 8 tile 19 over sky colour 11 | map 26, square (0,0) facing west, column 2 row 4 |  |
| `tile:26:743719882555cb155247940b0f296ff6263f11864a83db8c1ae4ade8eda2ea6e` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing west, column 6 row 5 |  |
| `tile:26:748c2e9c5cec4bb380ae4c85b078914a83f139ad011d9af80480d64e7a4557f4` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 55 over 8X8D7 block 8 tile 55 over sky colour 0 | map 26, square (2,2) facing south, column 3 row 3 | `nomad-south-trail-terrain-748c2e9c5cec.png` (area 17) |
| `tile:26:7798b99598ee3bdc92dcfc6f4a4cd0c1bd72e53c5b544c4fee35287f87a99a71` | 8X8D7 block 8 tile 19 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing west, column 4 row 5 |  |
| `tile:26:786993dccf9af1cc2d308c8c0aa73b308f0c0db61d2ebe4ebdb94b289cef7489` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:79b93579a671419340f89bd19c743564364418ab25f5a6d94e40815c1ed02b00` | 8X8D7 block 8 tile 58 over sky colour 11 | map 26, square (1,1) facing south, column 1 row 4 | `nomad-entry-terrain-79b93579a671.png` (area 17) |
| `tile:26:7befb7f5e8b497feb0508f160a2f16fffb17bdeda63c888da0dfa86345cb854e` | 8X8D7 block 8 tile 34 | map 26, square (0,0) facing east, column 6 row 6 | `valjevo-dungeon-briar-terrain-28.png` (area 3, 6) |
| `tile:26:7ddfc9b6c0342eabf84cdc86217cf578dcd68da5371291f0d39601be2343012e` | 8X8D7 block 8 tile 32 | map 26, square (0,0) facing east, column 7 row 7 | `valjevo-dungeon-briar-terrain-22.png` (area 3, 6) |
| `tile:26:7fa8f4f113cce1c9f1d8550cefd780d87610e288e43a6f639b0f9efc0670a96b` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 7 tile 16 over sky colour 11 | map 26, square (2,1) facing north, column 4 row 4 |  |
| `tile:26:803853241a4a21f155d2e6fc339027b7fc4f68235c523cc2494efec7c6de0c29` | 8X8D7 block 8 tile 36 over sky colour 0 | map 26, square (0,0) facing east, column 7 row 4 |  |
| `tile:26:811063002a5754116c7253d132ef0a3821249bb2dd9aa4f09af1a9be26404457` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:81e90cab1c2a69f991968319ee2c4db0099816f98ed7ab2e1be3fc22c9563124` | 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 15 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (4,0) facing south, column 8 row 4 |  |
| `tile:26:83a4b6bcac7a25600797b931a18ea825dba03009462a94ec7ee1483234d0fb18` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 22 over sky colour 0 | map 26, square (0,0) facing south, column 0 row 4 |  |
| `tile:26:877afc2b6549f6e3f546e63c9a5979c27cd67b398ef06f50d5d8b32d345c497c` | 8X8D7 block 8 tile 12 | map 26, square (0,0) facing south, column 0 row 8 | `valjevo-dungeon-briar-terrain-23.png` (area 3, 6) |
| `tile:26:8869bea82e51ff517629ca4fe2395571be78003c8b850dad6e9da830a52c8ce3` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (0,0) facing south, column 0 row 4 |  |
| `tile:26:89ac96a8296b38dc291f77978e964f9737df8b672dc6220b31f5615332555bd9` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 15 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (5,12) facing north, column 10 row 3 |  |
| `tile:26:8c786f4b1c38fdea80ad32e55aa8e05e74853760d5d8bc848f8a02af66bd695c` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:8d63259e68489d26f88412c002c6f628de1c29bccb785100548f427ffe5e3a34` | 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 2 over sky colour 0 | map 26, square (6,12) facing east, column 1 row 3 |  |
| `tile:26:9046192a9a0adcc9eaafa905409a8c185a2b1d3f67b0f3e89f71cc50db0cf8bf` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (5,12) facing north, column 10 row 4 |  |
| `tile:26:93f4911a018d97a2d7f582fac10a63a66374441de45e675a26181608badcda08` | 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (6,12) facing east, column 1 row 3 |  |
| `tile:26:944e107665ab927c8b165e2f2934e06bbc6f38a1877c2737a7d9cfaa4b51fea4` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:9702ced2218132135d73ccef39c047d78b34aca9fc0f1b425fc1d9a04720daaf` | 8X8D7 block 8 tile 19 over sky colour 0 | map 26, square (0,0) facing west, column 2 row 4 |  |
| `tile:26:994cfd79a8a7cc3f1a50743484e7592f4c1d04f1d638627df03b1e8f6fbc0319` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 19 over 8X8D7 block 7 tile 2 over sky colour 0 | map 26, square (5,12) facing north, column 10 row 4 |  |
| `tile:26:a06ae7ddbd5e570a1591ccfe1028e845c54a224d23755730d05483573459a8c9` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (4,13) facing south, column 7 row 4 |  |
| `tile:26:a1162ddd95c9389d0cca24a59ae30fadb3cee6d447e75c9ee3ecfea72a14d898` | 8X8D7 block 8 tile 36 over sky colour 11 | map 26, square (0,0) facing east, column 7 row 4 |  |
| `tile:26:a72cd795273e9928eaf87725b5550fff71b45e59ccd15c470831dcc9722049f5` | 8X8D7 block 8 tile 35 | map 26, square (0,0) facing west, column 4 row 6 | `valjevo-dungeon-briar-terrain-27.png` (area 3, 6) |
| `tile:26:a78614debab11ac914817f55d740f275b5382ef1c7dc97268d552f5f8dae4f9f` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 7 tile 19 over sky colour 11 | map 26, square (4,13) facing west, column 0 row 4 |  |
| `tile:26:a9eb1ad1c7e7e5f6b65cfa824481352e9ea16e0a268631ef6c032cc2975aa918` | 8X8D7 block 8 tile 29 over 8X8D7 block 8 tile 29 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing east, column 10 row 5 | `nomad-sand-joins-a9eb1ad1c7e7.png` (area 17) |
| `tile:26:ab6c5018b98fafddb703d5c823b283c7ea95fc6e6494d9debb621ef491eaca08` | 8X8D7 block 8 tile 20 over sky colour 0 | map 26, square (0,0) facing east, column 8 row 4 |  |
| `tile:26:af28a69903e30245191a8ff27b8c05548d119183345ded1509c5d1a5920c8d98` | 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 57 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over sky colour 0 | map 26, square (2,2) facing east, column 7 row 4 | `nomad-sand-joins-af28a69903e3.png` (area 17) |
| `tile:26:af51743e6c8735b5f0217a632196d9e43dea2456760cff3333cc42d3640f2cf9` | 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 16 over 8X8D7 block 8 tile 19 over sky colour 11 | map 26, square (7,0) facing south, column 2 row 4 |  |
| `tile:26:b17a7150a306024120df5ba54f07cfbc38a03819d66c514640c452951a28efa4` | 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 2 over sky colour 11 | map 26, square (3,13) facing west, column 1 row 4 | `nomad-foliage-joins-b17a7150a306.png` (area 17) |
| `tile:26:b30a99d0cf82cbb099b6bb80d3ef1820d9b11c24d2a539c29b95f697c0768697` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:b441b6390dfaa41f0f41c4bcc1c94e25d30652caee87a463a6005e4465294a16` | 8X8D7 block 8 tile 43 over 8X8D7 block 8 tile 43 over 8X8D7 block 7 tile 15 over 8X8D7 block 7 tile 52 over sky colour 0 | map 26, square (5,12) facing north, column 10 row 3 |  |
| `tile:26:b66bcf797f567ecfec4b58f06deaea3a11f657fc12824c43f52ae3e4c884a81f` | 8X8D7 block 8 tile 54 over sky colour 11 | map 26, square (2,2) facing north, column 10 row 1 | `nomad-entry-terrain-b66bcf797f56.png` (area 17) |
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
| `tile:26:d52bbe86618c3e9b12468b6a42f9e32dbb0a9d5ffc394a94e26836bcfdb3adb5` | 8X8D7 block 8 tile 17 over sky colour 0 | map 26, square (0,0) facing east, column 10 row 2 |  |
| `tile:26:d79d5e1a276264b74c90875936d1afd7e0b3c205ba3819c3b0839447a225c06c` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:d93036934660fef225e6f7264f593c31755cd0833cc160297ec6cc1ed592068a` | 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 58 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (1,1) facing east, column 10 row 4 | `nomad-entry-terrain-d93036934660.png` (area 17) |
| `tile:26:dcdc145bf22c16efb1ab9a51c36f3f257aa740e0af1a50ad2e13e2bc5f1d246c` | 8X8D7 block 8 tile 19 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (0,0) facing west, column 4 row 5 |  |
| `tile:26:dd57f5890ac6a05813c603f0d24819e7b06062b25004e31c0f36cfad35c7123c` | 8X8D7 block 8 tile 55 over sky colour 11 | map 26, square (1,1) facing east, column 9 row 3 | `nomad-entry-terrain-dd57f5890ac6.png` (area 17) |
| `tile:26:de09282f7a84b4acee0ce7438c0119adfaed07e49c3840456e0cf8df447022ca` | 8X8D7 block 8 tile 56 over sky colour 11 | map 26, square (1,1) facing east, column 9 row 4 | `nomad-entry-terrain-de09282f7a84.png` (area 17) |
| `tile:26:e8ba3e9c269840517c00c657fd9d3992f2d639a8fbf0d8f10015324b619bcff0` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (4,12) facing east, column 3 row 5 |  |
| `tile:26:eb039ad14db5712287672fd45f2d2d26a6a33ee522784b04e3a03eac4f04ad69` | 8X8D7 block 8 tile 33 | map 26, square (0,0) facing west, column 3 row 7 | `valjevo-dungeon-briar-terrain-20.png` (area 3, 6) |
| `tile:26:eb13e875f347adc3e80cf68affd34dc1be49d5cd316b2f93a1a08326f18a42f1` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing east, column 6 row 5 |  |
| `tile:26:efa69fe04edaa490fcfec57521fe35c34587935fed990b24adfb33e753a1ae85` | 8X8D7 block 8 tile 56 over 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 52 over sky colour 11 | map 26, square (4,14) facing south, column 9 row 3 |  |
| `tile:26:f16a7bc5ae91fc6aea5d3bedbc4752f9ca4b5789cc003dc758275b517932345c` | 8X8D7 block 8 tile 18 over sky colour 11 | map 26, square (0,0) facing west, column 0 row 2 |  |
| `tile:26:f181a98bbddb24ee4f4f4605abc79269e16c4e38bc95ccc0f0270d5c7a624fd7` | 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 28 over 8X8D7 block 8 tile 38 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 26, square (1,1) facing south, column 0 row 5 | `nomad-inner-trail-f181a98bbddb.png` (area 17) |
| `tile:26:f88f087f5b5ba2358b09710c64c89f732bc22208650dbe24dced29ad6544be74` | 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 56 over 8X8D7 block 8 tile 40 over 8X8D7 block 8 tile 40 over sky colour 0 | map 26, square (2,2) facing east, column 7 row 3 | `nomad-sand-joins-f88f087f5b5b.png` (area 17) |
| `tile:26:fa681c80dd69290566cc0a055492e2ee578df2b40498231afd97bfd2c9a6a22a` | 8X8D7 block 8 tile 58 over 8X8D7 block 7 tile 6 | map 26, square (6,12) facing east, column 1 row 4 |  |

#### tile set 8X8D7 block 23 (9)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:09be3b9182cb135aef97064a69cd744e59c825c702e2d88caab6f8dff3de11cf` | 8X8D7 block 23 tile 15 | map 26, square (4,3) facing south, column 3 row 8 |  |
| `tile:26:40f46157dc277243cf905276f1a16a2bd6d3f448351dbc9f69fe86602ec97b07` | 8X8D7 block 23 tile 16 | map 26, square (4,3) facing south, column 8 row 8 |  |
| `tile:26:6fcc88dfcbdd1381aa173a4930d0f43707657b86b987875de37d432aaf94f778` | 8X8D7 block 23 tile 19 | map 26, square (4,3) facing south, column 8 row 7 |  |
| `tile:26:82e8199099381a8c28943b20dddb6ed93932475f5ced4d14f5c14f1a87fa7900` | 8X8D7 block 23 tile 14 | map 26, square (4,2) facing south, column 5 row 6 |  |
| `tile:26:aa725e51a9d8e9a8abe3cefa68561d19a4b06c6f1526e46e3a55a23aef753c73` | 8X8D7 block 23 tile 69 | map 26, square (4,3) facing south, column 3 row 7 |  |
| `tile:26:bc40ea3be142942d5e433d5b75d7dace8cc2aa0c544f4123b7056a5a69d7977e` | 8X8D7 block 23 tile 21 | map 26, square (4,2) facing south, column 6 row 6 |  |
| `tile:26:bd497db7487c7813e1fe44ab57327e1071fa3e599e97eb77c229dbc490b75a6a` | 8X8D7 block 23 tile 17 | map 26, square (3,3) facing east, column 9 row 8 |  |
| `tile:26:d326cc9fabded3214b6092f46a582ccf73115a244f08ec2e00172fefe1c7f137` | 8X8D7 block 23 tile 20 | map 26, square (4,2) facing south, column 4 row 6 |  |
| `tile:26:dc6d9f29883b9f1e1de252ff78bd42c32bd7eaa18fcd20f058ade6e6b40e2053` | 8X8D7 block 23 tile 18 | map 26, square (3,3) facing east, column 9 row 7 |  |

### Area 28: Zhentil Keep Outpost (18)

Map 28; WALLDEF6 block 1 (tiles 8X8D6 block 1), block 2 (tiles 8X8D6 block 2), block 9 (tiles 8X8D6 block 9).

#### tile set 8X8D6 block 9 (18)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:28:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D6 block 9 tile 47 | map 28, square (7,0) facing east, column 1 row 3 | `sokal-west-lintel-corner.png` (area 21) |
| `tile:28:2795a504ca67152aac8296d4f1e16f70523c5cf25af04d218c8cde895f0db0f0` | 8X8D6 block 9 tile 49 over 8X8D1 block 203 tile 17 over sky colour 11 | map 28, square (7,0) facing east, column 0 row 3 | `sokal-west-lintel-mid.png` (area 21) |
| `tile:28:2b189e32fb8cf14bccc4e230acdc7e87885e4ba1d93051e2861319877487c307` | 8X8D6 block 9 tile 55 | map 28, square (7,0) facing north, column 2 row 4 | `podal-workshop-lanes-terrain-2b189e32fb8c.png` (area 9, 18, 21, 24) |
| `tile:28:33b51e82f012e7d91b96894cd582495df912d95b36989e787ee5f7885e92d5b7` | 8X8D6 block 9 tile 38 | map 28, square (7,0) facing east, column 3 row 6 | `stojanow-tower-lanes-terrain-33b51e82f012.png` (area 9, 21) |
| `tile:28:414260af77afd8aef64b37cc3ab35c6ffbbbeeb0b6491dfc427d38dd5064d5e8` | 8X8D6 block 9 tile 42 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 28, square (5,4) facing east, column 6 row 5 |  |
| `tile:28:58aef8f26084a2aca7cc4f541ba0f78ee369e284686f8f6b89ccb7c228377477` | 8X8D6 block 9 tile 57 | map 28, square (8,0) facing west, column 7 row 4 | `stojanow-guard-wing-terrain-58aef8f26084.png` (area 9, 16, 21) |
| `tile:28:5f7ade4531d3bada00bc1c2d310f67d23a25dbe485f1d71a0c78936df93bbd13` | 8X8D6 block 9 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 28, square (9,4) facing west, column 4 row 5 | `sokal-west-gate-hinge-cap.png` (area 21) |
| `tile:28:6182286c97e2af8cf47fcf4321d9b562df43cfb3c35ee22574e9528275ea8a7d` | 8X8D6 block 9 tile 56 over sky colour 11 | map 28, square (8,0) facing west, column 8 row 4 | `sokal-raking-gate-head-end.png` (area 21) |
| `tile:28:755bda5b825770559bb1bca3b1582f2f4788da7f1a3b9cbb0b2ec3f4c2052f71` | 8X8D6 block 9 tile 56 over 8X8D1 block 203 tile 16 over sky colour 11 | map 28, square (7,0) facing west, column 10 row 3 | `stojanow-guard-wing-terrain-755bda5b8257.png` (area 9) |
| `tile:28:80365aff0ddcf91182a971781062979ea6fb274bdd0be01e236be5c240ec701b` | 8X8D6 block 9 tile 8 | map 28, square (7,0) facing north, column 5 row 4 | `stojanow-tower-lanes-terrain-80365aff0ddc.png` (area 9, 21) |
| `tile:28:8a69c0e8564e565884435ba1a08a6f282775d00ecb8af439bb001edeb3831ec2` | 8X8D6 block 9 tile 54 over 8X8D6 block 9 tile 54 over the ground colour 6 | map 28, square (7,4) facing south, column 5 row 6 | `stojanow-tower-lanes-terrain-8a69c0e8564e.png` (area 9, 21) |
| `tile:28:8f3581a37a37d80a394e310d82b46ab3fd19b341e0181b9dbbbed1a2a1bcad32` | 8X8D6 block 9 tile 37 | map 28, square (7,0) facing east, column 2 row 6 | `lizard-peat-edge-finish-8f3581a37a37.png` (area 9, 16, 21) |
| `tile:28:b784b8750b8adf3caafc9bb39eccbd31f78447d7268123fcf737875c487f9fea` | 8X8D6 block 9 tile 44 | map 28, square (7,0) facing west, column 10 row 7 | `stojanow-guard-wing-terrain-b784b8750b8a.png` (area 9, 21) |
| `tile:28:ba6dffecfcac31b31c0359d99617b3180552c982bef2087cb4995bccd9554ee7` | 8X8D6 block 9 tile 45 over sky colour 11 | map 28, square (7,0) facing east, column 2 row 4 | `sokal-west-lintel-close.png` (area 21) |
| `tile:28:e5aa3be4526ec0e96b089822c9a6290a6b74a423c00b6973692f5d25dd767c29` | 8X8D6 block 9 tile 56 over 8X8D6 block 2 tile 58 over sky colour 11 | map 28, square (8,4) facing east, column 10 row 3 |  |
| `tile:28:e7e5bba5f7822ebd0de281edd589c3cd00b54e05e92c63c7980a882934fa77fa` | 8X8D6 block 9 tile 54 over 8X8D6 block 9 tile 54 over 8X8D1 block 203 tile 11 | map 28, square (7,0) facing north, column 5 row 6 |  |
| `tile:28:f59a8b4ef53dca4b588a04b05a81d1c5a38fb9fa2354b6e64a4853bbbf7ad8f3` | 8X8D6 block 9 tile 46 | map 28, square (7,0) facing west, column 9 row 3 | `stojanow-guard-wing-terrain-f59a8b4ef53d.png` (area 9, 21) |
| `tile:28:fd5111f010b1eb27874d7173f3f881527f0a97a68535e574937a39274ae5fb87` | 8X8D6 block 9 tile 48 | map 28, square (7,0) facing east, column 3 row 4 | `stojanow-tower-lanes-terrain-fd5111f010b1.png` (area 9, 21) |

### Area 29: Kuto's Well (435)

Map 29, 32; WALLDEF8 block 3 (tiles 8X8D8 block 3), block 20 (tiles 8X8D8 block 20), block 1 (tiles 8X8D8 block 1); WALLDEF8 block 18 (tiles 8X8D8 block 18), block 17 (tiles 8X8D8 block 17), block 1 (tiles 8X8D8 block 1).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:80e3c5025a5f43f7991f9fb1c372374d1d0c7cb666c72aa6115e3e381ccd814e` | the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 29, square (0,12) facing south, column 5 row 5 | `zhentil-floor-refinement-far-threshold.png` (area 0, 8, 21, 24, 28) |

#### tile set 8X8D1 block 203 (9)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:28c750a662bed32580d87762055a0fc89d22d6a50a0969097324cb149f7e1276` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 55 over sky colour 12 | map 32, square (11,2) facing south, column 7 row 3 |  |
| `tile:29:29ffcb5bbc68b04c6b757ecc709f359775c1325b3b908d679bb8965d17664d63` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (10,3) facing east, column 9 row 1 |  |
| `tile:29:49ad980f2d96e815379c2a7b8e992e010f189a12c682cf766dd24d3760f00d01` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 64 over sky colour 0 | map 32, square (2,0) facing east, column 10 row 3 |  |
| `tile:29:50262ada84495a47607eff1afb151a73c926dae3451a1eff49e9f7efb3740c56` | 8X8D1 block 203 tile 17 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (4,4) facing north, column 3 row 3 |  |
| `tile:29:84811cd35f30e60134e42ec0b16911aaa34bccc387edf9b918b306300e06d985` | 8X8D1 block 203 tile 17 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (2,0) facing west, column 0 row 3 |  |
| `tile:29:8c95a75901a875c8737e29ad9ee91da9cd16ea4d69ea4a1a4a0c02315c1ef00e` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 55 over sky colour 0 | map 32, square (11,2) facing south, column 7 row 3 |  |
| `tile:29:a0f8587e119ceae1551c383b3ae7bbb341bd55d55754b36733593acaeb4cda3e` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,6) facing east, column 9 row 4 |  |
| `tile:29:d7a49d3e7872b2d0f9470359c34074e99bd74e3078bf2aede4c9dfe0a4a1337c` | 8X8D1 block 203 tile 17 over 8X8D8 block 20 tile 55 over sky colour 0 | map 32, square (11,5) facing north, column 3 row 3 |  |
| `tile:29:f1f7d0ca403abc7f74a61ba00dedd2c3eaa5fa6bc23b83c35f3fcd07792085f8` | 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,0) facing east, column 9 row 4 |  |

#### tile set 8X8D8 block 1 (48)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:090fbe6290e450ac9ad3aa360e8e5253668f312bc18eceeba02c008487f6aefa` | 8X8D8 block 1 tile 5 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (6,9) facing north, column 0 row 5 |  |
| `tile:29:0ea18737b2c8a61a51ef2fb976008214eb9b09be4b66caecbb942736b6edd92a` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 25 | map 29, square (1,6) facing east, column 3 row 5 |  |
| `tile:29:115e0998e3606bbcdb84a6ddd7d4695eb09762edb54aea35f393ab5c586e2178` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 58 | map 29, square (5,8) facing south, column 3 row 4 |  |
| `tile:29:21d000ea7633da686f7d05c43cbac67b6c337b282bb71549f9ced7c2fe0bcc63` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 17 over sky colour 0 | map 29, square (15,3) facing south, column 3 row 3 | `textile-house-21d000ea7633.png` (area 2) |
| `tile:29:2b318229a4b2903d4530ecbaa037fb98cc51f1c1731900f01c6dbba9cd27f8e2` | 8X8D8 block 1 tile 5 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 29, square (15,3) facing west, column 0 row 7 | `mendor-east-court-terrain-03.png` (area 2, 15, 20, 22) |
| `tile:29:30a49411e45f51c307970357ef283ec90c8288afb7742c70b4d71bbe9f705f82` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 29, square (15,4) facing north, column 7 row 7 | `mendor-worn-floor-junction-30a49411e45f.png` (area 15, 20, 22) |
| `tile:29:33fe6a61ac946ccb0d8ba3eb988129ca6d3eb72cf77ae8d234934864f4b30ead` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 26 | map 29, square (5,8) facing south, column 3 row 5 |  |
| `tile:29:3be9879884a5225b7452926e818205cdc97d6a61ab79401073cc8aadc42e3662` | 8X8D8 block 1 tile 5 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (6,9) facing north, column 0 row 5 |  |
| `tile:29:413809be17339055f7c3e610800007b13a9447fd45827273a322ae34be03f76f` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 36 | map 29, square (4,15) facing south, column 10 row 6 | `textile-house-413809be1733.png` (area 2) |
| `tile:29:41ea3ceae0f6da8a29151985f9d6f70572dbd7d9e81b672fe759802e75a7d115` | 8X8D8 block 1 tile 50 | map 29, square (14,2) facing west, column 0 row 6 | `room-tile-09.png` (area 0, 2, 4, 5, 9, 14, 20, 21, 23, 24, 28, 31) |
| `tile:29:42654aed080780bf2c69eed95c5440f4c402760d07812643f07b5d686b2a998d` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 57 | map 29, square (4,8) facing east, column 10 row 4 |  |
| `tile:29:46d61fcdc2b08771ec2c88b0bc7794ab572d13c6d4f606f1d14a0ccf6b9d4ffb` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 29, square (15,4) facing north, column 3 row 7 | `orc-joint-0ccf6b9d4ffb.png` (area 2, 15, 20, 22) |
| `tile:29:4eb517093139f21cce9889991a22361db52d158eb23b7fa26d65a3d16285c93e` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 52 | map 29, square (15,3) facing south, column 3 row 5 |  |
| `tile:29:54ad66560a7c69766cbf1f6a9bbebbdb1f7848cf0e4487cb06d9e69a459d4fb4` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 55 | map 29, square (15,3) facing south, column 3 row 4 |  |
| `tile:29:5aaf66f66e00cbee83018ad1088ea5cacd3e3eeeda3f5ba2b703fc2032557305` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D1 block 203 tile 25 | map 29, square (1,5) facing east, column 7 row 5 |  |
| `tile:29:5cc83393adbd6e029069e66f391eb4853f566090d839096309ac3d8a1c7a949a` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 29, square (15,3) facing south, column 3 row 7 |  |
| `tile:29:660799b95efee63e2ac2bd107b1a5f41249b922937dbc951ac5eedff27652974` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 63 | map 29, square (3,11) facing south, column 10 row 4 | `textile-house-660799b95efe.png` (area 2) |
| `tile:29:687a8b9bd4f0ae2567e12880ad4e1d68fe9abb31b80deda766b1ceb599142ffd` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 45 | map 29, square (4,15) facing west, column 3 row 7 | `textile-return-687a8b9bd4f0.png` (area 2) |
| `tile:29:69eb4ca3320f43b2f18ff02499f918767bba7103eea8971c37a177f9c792273a` | 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 29, square (15,3) facing east, column 10 row 8 |  |
| `tile:29:6c7a873c23da730b5f519a2b29ace44a4f0f3d41b188af6cecba860e4ca58a80` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 46 | map 29, square (4,15) facing south, column 10 row 5 | `textile-house-6c7a873c23da.png` (area 2) |
| `tile:29:6f143115ba868ff9a37b228ea5900af4af8c3a5a6a8f5bae5425c851b8dc3c29` | 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 29, square (4,8) facing east, column 10 row 7 | `slums-worn-courtyard-6f143115ba86.png` (area 15, 20, 22) |
| `tile:29:79b2b4d48789191cb872a5e6964e0a7cd55cabdca9e1b13b93b9548fb53fa70e` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 21 | map 29, square (3,11) facing south, column 10 row 5 |  |
| `tile:29:833a0a7e385f45484fa2d028ca4b6e48c89355fe7a03bce6b1b588e29d8b913b` | 8X8D8 block 1 tile 4 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (2,8) facing north, column 10 row 5 |  |
| `tile:29:85eb4dc0a34fa4b07a0afda3d507fd8c67c9e61fbd22980a92f513cc3e53eba7` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 14 | map 29, square (15,3) facing east, column 10 row 4 |  |
| `tile:29:87f723061f5a55c5a86757e1634672fbd33447f098e13728a0fb38fed2026152` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 3 | map 29, square (3,12) facing west, column 10 row 5 | `yarash-inner-court-terrain-87f723061f5a.png` (area 22) |
| `tile:29:88c2ff87d997f8957a8d075074f38a457e677399f7f1d19545443565b3962be8` | 8X8D8 block 1 tile 4 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (2,8) facing north, column 10 row 5 |  |
| `tile:29:9280d56337bd2920a227ff3e67a3800673354047720a68eab5b11ab4cd3a993c` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 7 | map 29, square (6,8) facing south, column 10 row 4 |  |
| `tile:29:94f0e4cb3d1d4879a4ee9a0312adf5f51d53c6b7707f7f03ee8896d266b1757c` | 8X8D8 block 1 tile 4 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (5,8) facing east, column 10 row 5 |  |
| `tile:29:96987836b2cb2a9620a6bd06b4c79b2bdc6a28648fb923b9834e5eaae54d75ff` | 8X8D8 block 1 tile 4 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (5,8) facing east, column 10 row 5 |  |
| `tile:29:989907034dc5a8ccb668b5a282a334713bceb7eca7c6f5ce8b5590ee1052877f` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D1 block 203 tile 39 | map 29, square (15,3) facing south, column 7 row 4 | `slums-shop-frontage-terrain-989907034dc5.png` (area 15, 20, 22) |
| `tile:29:a2c5db9471e21ec711dd1d855600b2001637e6c3c5c21bb600f7aa9633722e53` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 29, square (2,8) facing east, column 3 row 5 |  |
| `tile:29:a353a86173ab83d526b4032d32f8909aee6e1f21b3f9a9fe33b3d0d994ac79dc` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 55 | map 29, square (1,7) facing south, column 0 row 4 | `mendor-library-terrain-a353a86173ab.png` (area 15) |
| `tile:29:ad7698862b1efb5a618eab4a241c5a1fabd052c20051f7f60f15734ff950d549` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (2,8) facing east, column 3 row 5 |  |
| `tile:29:b2d04abe55c80329ca299b7bc4e8a1f3bcb0d1f9952bf17397dfd4bc2c4451a0` | 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 47 | map 29, square (4,14) facing west, column 0 row 5 |  |
| `tile:29:bd86480def031bce8684d43fdc02f7a57aa1b6ab4c9d826f666cfd2abc3c15a3` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 37 | map 29, square (4,15) facing west, column 3 row 4 | `textile-ivy-court-terrain-bd86480def03.png` (area 2) |
| `tile:29:cca7b1f2a9e1203a4d5b2fa164d38d2e077e2129c63fb2b57559b1592049c4d4` | 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 36 | map 29, square (4,14) facing west, column 0 row 6 | `textile-return-cca7b1f2a9e1.png` (area 2) |
| `tile:29:cf4cdf64d65352dd7b173edcf0fb53106683f8c7b4f025979ba4608fc0872321` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 47 | map 29, square (4,15) facing south, column 10 row 3 | `textile-house-cf4cdf64d653.png` (area 2) |
| `tile:29:de308a910c954b20b4cc2c5da35993a0bb0b30e19e9b0990e3dae5281d86432c` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 31 | map 29, square (3,11) facing west, column 7 row 5 |  |
| `tile:29:df787a068f2e956970c548da71bfec7422412c13751481c3a749cb301164b52d` | 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 68 | map 29, square (3,10) facing west, column 0 row 5 |  |
| `tile:29:e5d63769789e7cafaede1cd7e95d25d1d3b9ddc8d5df62bc353cb69b20204a45` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (2,8) facing east, column 3 row 5 |  |
| `tile:29:e64d4bb2078216ff1f2a0b804d81736f2d63ccbf6d1bb38608eb817557e43c39` | 8X8D8 block 1 tile 4 over 8X8D8 block 1 tile 4 over 8X8D1 block 203 tile 38 | map 29, square (1,8) facing east, column 3 row 4 | `slums-shop-frontage-terrain-e64d4bb20782.png` (area 15, 20, 22) |
| `tile:29:e9d850190fd89ff0caf8ab721ce50c6d47d8b58186160495cd44912812f4a1fb` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 68 | map 29, square (2,10) facing east, column 10 row 5 | `textile-house-e9d850190fd8.png` (area 2) |
| `tile:29:f25092eb0d56bda81ec60df01868e464268bdaf74219b98ae16ee1789a2114b5` | 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 45 | map 29, square (4,14) facing west, column 0 row 7 |  |
| `tile:29:f390776105de293fac666152faf70903e5aa3cd221187de0e98b30d9b0d52e0c` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 21 | map 29, square (2,11) facing east, column 7 row 5 | `textile-return-f390776105de.png` (area 2) |
| `tile:29:f7deba478747aff32ba2a082771d2ebaf35017bb3766f1d9cb2bd050f442adc2` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 35 | map 29, square (4,15) facing south, column 10 row 7 | `textile-house-f7deba478747.png` (area 2) |
| `tile:29:fd606ec72596e2370e5bf6ee42c634a6a5e4863b120b747575c1ea0aa0b91bc3` | 8X8D8 block 1 tile 5 over 8X8D8 block 1 tile 5 over 8X8D8 block 3 tile 7 | map 29, square (5,8) facing south, column 7 row 4 |  |
| `tile:29:febf6b17e19e9fded6926c0f0b2160876dd930b13f7bc4d58588619abce31622` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 49 | map 29, square (3,11) facing south, column 10 row 6 |  |
| `tile:29:ff57893899a2b4116280c3e6847a3819e88209d3ff9c9a9e859e0d89c3373ba8` | 8X8D8 block 1 tile 4 over 8X8D8 block 3 tile 25 | map 29, square (4,8) facing east, column 10 row 5 |  |

#### tile set 8X8D8 block 3 (8)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:0fe98ad9cca711b154fa54acc26ca865f6582a794910079509e512f212a9fdb8` | 8X8D8 block 3 tile 30 | map 29, square (12,1) facing east, column 8 row 8 | `new-phlan-harbor-paving-joins-0-0fe98ad9cca7.png` (area 0, 2, 18, 24) |
| `tile:29:15be260fd378f5b33c7dc10af0e7565eaa2221596debd496a87de8b4c13f9f35` | 8X8D8 block 3 tile 42 | map 29, square (12,1) facing east, column 8 row 6 | `new-phlan-harbor-paving-joins-0-15be260fd378.png` (area 0, 2, 18, 24) |
| `tile:29:228a010ec6afee2452833b3324acc5c8caeed83bff7299f110435bf2f6400620` | 8X8D8 block 3 tile 53 | map 29, square (3,9) facing east, column 4 row 6 | `pyramid-upper-doorway-threshold-228a010ec6af.png` (area 2, 22) |
| `tile:29:69b37e4229250c117e87ecaea0d3f1c278197c5591b9678919a1ab2f71d07b35` | 8X8D8 block 3 tile 62 | map 29, square (12,0) facing east, column 10 row 7 | `bane-rampart-paving-69b37e422925.png` (area 2, 18, 24) |
| `tile:29:93eec02f48227e4eef2a0087cb562c7a4c3389d1f66ec9bd9e1837a1f203600e` | 8X8D8 block 3 tile 48 over the ground colour 6 | map 29, square (11,5) facing south, column 6 row 6 | `bane-outer-courts-terrain-93eec02f4822.png` (area 2, 14, 18, 24, 31) |
| `tile:29:aead7710ff3efb0da08b26dc8581d7f0aef7cd979a472728f8742c0fad007077` | 8X8D8 block 3 tile 69 | map 29, square (3,9) facing east, column 6 row 6 | `podal-workshop-lanes-terrain-aead7710ff3e.png` (area 2, 18, 22, 24) |
| `tile:29:c9fe5bbead8dfd4e95b06ac8273fd1098faa4490999df7d57744d9f5d72e2075` | 8X8D8 block 3 tile 22 | map 29, square (8,5) facing east, column 5 row 5 | `bane-inner-wing-terrain-c9fe5bbead8d.png` (area 2, 18, 24, 31) |
| `tile:29:f2213dcb1a2ac31b69195cb160ff6cd402c4206ed29291cc2b3411026c07dba6` | 8X8D8 block 3 tile 66 | map 29, square (12,1) facing east, column 8 row 7 | `bane-eastern-rampart-terrain-f2213dcb1a2a.png` (area 2, 18, 24) |

#### tile set 8X8D8 block 17 (53)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:01a60dfea8fac365c1ea014064cbf2b1b38da1bc8a6866c5ec275a19839c51dc` | 8X8D8 block 17 tile 41 over the ground colour 6 | map 32, square (9,2) facing east, column 10 row 7 | `kobold-escort-floor-inset-east.png` (area 13) |
| `tile:29:04a5f8a88df073af060bcd31139f0ec52dc5c0d221c1743aa3db2df8de5f4919` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 17 | map 32, square (10,4) facing east, column 0 row 2 | `kobold-south-loop-terrain-04a5f8a88df0.png` (area 13) |
| `tile:29:0800ea58a6066c1e883fcc3e57d75b77e2a7b9bb57a35284e716763ac63b924d` | 8X8D8 block 17 tile 43 over the ground colour 6 | map 32, square (9,3) facing east, column 8 row 8 | `kobold-escort-floor-rib-return.png` (area 13) |
| `tile:29:0e73b6c23972aec306a67d3db48c5fa02483ce482cac7c5cc62c80c9f0f69ab5` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 30 | map 32, square (9,3) facing east, column 8 row 6 | `kobold-return-inner-rib-foot.png` (area 13) |
| `tile:29:0fe2248bf92bca927be490c4a509808d89c899691ef5c820f7a10bcf64b81346` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 17 | map 32, square (10,3) facing east, column 10 row 1 | `kobold-south-loop-terrain-0fe2248bf92b.png` (area 13) |
| `tile:29:1004d541bd50d4d598ad97f776d0f7ee5cc265283df0dcecc38434a1cb1a7151` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over sky colour 12 | map 32, square (10,4) facing north, column 2 row 3 |  |
| `tile:29:14d354c6a3f14f18b4535b024ca84fbea91764bed81262f83cdbaab8d4f308f0` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 28 | map 32, square (10,4) facing west, column 9 row 6 | `kobold-pool-spur-terrain-14d354c6a3f1.png` (area 13) |
| `tile:29:18e8e2c5cfa0872badc140a95fc3d94498b8fa7ba348a834e6c7044d78a2882e` | 8X8D8 block 17 tile 67 over 8X8D8 block 17 tile 67 over sky colour 12 | map 32, square (9,2) facing south, column 5 row 4 |  |
| `tile:29:236c80c2a101492535877654f1eb9ab410ae16ce5c3bd52ac50912ee4a1bbda8` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 32, square (10,5) facing north, column 4 row 5 |  |
| `tile:29:3122eabc010c7bbfaf5ca6691cfc49cf064c86c8e4567e01b9620ed7d8249382` | 8X8D8 block 17 tile 18 over the ground colour 6 | map 32, square (9,2) facing south, column 3 row 6 | `kobold-return-edge-foot.png` (area 13) |
| `tile:29:34653d0854f43f4416ce6c818c183ade3143c551f10f14f4cb4151a7fa962cee` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 2 | map 32, square (10,3) facing west, column 0 row 2 | `kobold-west-gallery-terrain-34653d0854f4.png` (area 13) |
| `tile:29:40c2f4c05764725d651ce2d18a31119dc093d840599c18f916a7112797c3c260` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 0 | map 32, square (9,2) facing east, column 10 row 4 | `kobold-return-outer-rib-mid.png` (area 13) |
| `tile:29:41dea904bf1f7df40b00b2a1f22e3d64be4e9deef1eacb667771432b80d92497` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 47 | map 32, square (9,3) facing south, column 0 row 3 | `kobold-pool-passage-terrain-41dea904bf1f.png` (area 13) |
| `tile:29:4b7bca4ca089a50da85f7e7bc149529d93d40b7b1991322103f985d1ed262e1a` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (10,5) facing north, column 4 row 5 |  |
| `tile:29:4b7d01315af236181737df7fb5ba0ff0221cd97c04473ce7453d5fa75cd9e1fe` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 17 | map 32, square (9,3) facing east, column 8 row 3 |  |
| `tile:29:4df0f4402919582202cd1f1d1417985e4aaa8433ec86ae11d2dbc4ab3b412ac2` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 19 | map 32, square (10,4) facing north, column 8 row 6 | `kobold-west-gallery-terrain-4df0f4402919.png` (area 13) |
| `tile:29:526f124a5cbb7de82cb6aae1adb6f3e439dc28142f3fbea2f0a33a7ea974437e` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 19 | map 32, square (9,2) facing east, column 10 row 5 | `kobold-cave-exit-west-meeting-joint.png` (area 13) |
| `tile:29:58bb40c1830106a59ac431cbc4033618453e138ffccdd322ec81408e00e26605` | 8X8D8 block 17 tile 16 over sky colour 12 | map 32, square (9,2) facing south, column 2 row 3 |  |
| `tile:29:60fabf9d7676a7487c45a00a48aadd3ace071373918ded746964863507357843` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 30 | map 32, square (9,2) facing east, column 10 row 6 | `kobold-return-outer-rib-foot.png` (area 13) |
| `tile:29:63d1d7ce16dc81313aede5c5278ac4d60f69e145a0660c04247679f435760ddf` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 28 | map 32, square (10,3) facing west, column 1 row 8 | `kobold-west-gallery-terrain-63d1d7ce16dc.png` (area 13) |
| `tile:29:63ededc2c30cbb2cdaa8bfa7758e1cb7ac0c204595eea551dbd46de824d6aa5a` | 8X8D8 block 17 tile 18 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 3 row 5 |  |
| `tile:29:6813dd72c66b17eb4da89b009952d72f12490ba07f186f3270f23fa7a26381c3` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 3 | map 32, square (10,3) facing east, column 9 row 4 | `kobold-pool-passage-terrain-6813dd72c66b.png` (area 13) |
| `tile:29:68148839fd8c61a821bf81c69686e0617b35dc4221ca6241550f0473325391cf` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (10,5) facing north, column 4 row 5 | `kobold-cave-silt-68148839fd8c.png` (area 13) |
| `tile:29:6ebfac4e621c82065e04712a06b3b924b71ff39a170c1d910e5f9ced4ff618df` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 32 | map 32, square (10,2) facing south, column 6 row 6 | `kobold-cave-silt-6ebfac4e621c.png` (area 13) |
| `tile:29:84bd9f932d01acd7802f14ad00019ab825662ed48286b3faa9a33c37557bdafb` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 19 | map 32, square (10,3) facing east, column 9 row 6 | `kobold-south-loop-terrain-84bd9f932d01.png` (area 13) |
| `tile:29:8869d6c43d92e6692557abcbec2a1a9eb7089d2e979c3de9144e230c441f88dc` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 30 | map 32, square (10,4) facing north, column 8 row 7 | `kobold-west-gallery-terrain-8869d6c43d92.png` (area 13) |
| `tile:29:901bb0a0cdefda412230f4dc0aa5eeef7fc2cc701335562f7ca75a059abaa5bb` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 1 | map 32, square (10,3) facing east, column 10 row 2 | `kobold-south-loop-terrain-901bb0a0cdef.png` (area 13) |
| `tile:29:9466b0967e96d56bee7ca80b53dd1ec9a110a1f86fca35439959f14250ea644a` | 8X8D8 block 17 tile 48 | map 32, square (10,3) facing west, column 1 row 3 | `kobold-caves-terrain-9466b0967e96.png` (area 13) |
| `tile:29:9ca74205126cf6c661c2e2c31dd0cb0f4426665e9dcc4822ad1bf6cbd975791a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 35 | map 32, square (9,3) facing south, column 1 row 6 |  |
| `tile:29:9f854d624b3a9637746009722eaef901f1c798f10098cb00f4be7b24cd091faa` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over sky colour 12 | map 32, square (10,4) facing north, column 2 row 2 |  |
| `tile:29:a2fd65729327cc7c2411302751caa1e8b2907fe0c101ca599873a1bac2e604fd` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 36 | map 32, square (9,2) facing east, column 10 row 3 | `kobold-escort-rib-left-crown.png` (area 13) |
| `tile:29:a46e5434e8f85141bd5a773d4e0787dc436ce13222a6f15abee7758c8177ccbd` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 0 | map 32, square (9,3) facing east, column 8 row 4 | `kobold-caves-terrain-a46e5434e8f8.png` (area 13) |
| `tile:29:a60d20d873eb57acae0fd1e25105211bca6132b89287fcc49ae119367d950dac` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the ground colour 6 | map 32, square (10,4) facing north, column 2 row 6 | `kobold-cave-silt-a60d20d873eb.png` (area 13) |
| `tile:29:a6bde3cfae4c8aadc2991d888c483b1b8ed93520dd1b475edf3de3f99425a620` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 1 | map 32, square (10,3) facing south, column 2 row 2 | `kobold-pool-passage-terrain-a6bde3cfae4c.png` (area 13) |
| `tile:29:a7ff9b7da5370851e3c100136f543b475f343f102294b00bbe559dfbad88ed1a` | 8X8D8 block 17 tile 18 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 32, square (9,2) facing south, column 3 row 5 |  |
| `tile:29:bd9ea1901d9b6de036f5842777a04222c7e67c37d2dc248bca7016a8ccea01f5` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 30 | map 32, square (10,3) facing east, column 9 row 8 | `kobold-pool-passage-terrain-bd9ea1901d9b.png` (area 13) |
| `tile:29:c2e121ce96bc54839fd704badec4b9fe7d7996a13cd7267f56e28a633febde11` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 32, square (10,5) facing north, column 4 row 5 |  |
| `tile:29:c5ccd45d08c65587436bcef3cabe12dfcc83b7d08879b6a3d442862f1d69ed68` | 8X8D8 block 17 tile 7 over the ground colour 6 | map 32, square (9,3) facing east, column 8 row 7 | `kobold-escort-floor-inset-west.png` (area 13) |
| `tile:29:c7d9693190a9651a5128fc1b7400d4acc9cab4f33714ae6c27fe593e8e79803b` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 8 over sky colour 12 | map 32, square (1,4) facing south, column 5 row 3 |  |
| `tile:29:c9b031524b7b7f1ea5671507dd690b184fecddd5d9c354103f870216a3da7ca6` | 8X8D8 block 17 tile 9 over the ground colour 6 | map 32, square (3,4) facing west, column 1 row 6 |  |
| `tile:29:d070699df8508a4b3d4b8d2a56813eae1b30e556f24d4a1dfb3e3ac468d12b77` | 8X8D8 block 17 tile 10 | map 32, square (7,11) facing north, column 6 row 6 |  |
| `tile:29:d5dd561a755316e3b5e425928c6150770623b55acd123912cf05e5188593588a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 47 | map 32, square (9,3) facing south, column 1 row 4 | `kobold-cave-exit-lower-spur-corner.png` (area 13) |
| `tile:29:dd26f1da22db9cf676da64012f5ca445f97bea617519b57ce34391056b3b4167` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 35 | map 32, square (9,2) facing south, column 1 row 6 | `kobold-cave-silt-dd26f1da22db.png` (area 13) |
| `tile:29:ddefb9dc375773174835a079a2b247bfdd6fba94874b355596fcc7cb17130b11` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 34 | map 32, square (10,4) facing north, column 8 row 8 | `kobold-cave-silt-ddefb9dc3757.png` (area 13) |
| `tile:29:e1d034d94e88573ec9fced916de48d38fff1723f0d4d13fecd8be3301bf1e9e0` | 8X8D8 block 17 tile 15 over sky colour 12 | map 32, square (9,2) facing east, column 10 row 2 |  |
| `tile:29:e510f228d95b25f5d705e4d02985f39ae32d54a283dfbb38d8c0a6bcd74fc740` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 1 | map 32, square (10,4) facing west, column 9 row 3 | `kobold-pool-spur-terrain-e510f228d95b.png` (area 13) |
| `tile:29:f2652900aafa87fd68c85f6b4cf8b033e041b806b73c24ad6d031fa091b1a00c` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (10,5) facing north, column 4 row 5 |  |
| `tile:29:f3b8ed60dfea0d255f2517e43f2a8f866e22c297594c71d9fc0b24a2882e212b` | 8X8D8 block 17 tile 16 over sky colour 0 | map 32, square (9,2) facing south, column 2 row 3 | `kobold-pool-passage-terrain-f3b8ed60dfea.png` (area 13) |
| `tile:29:fa8c0ce1c541b2af2f53e5309d502256317e3a0b116a9d8f33dec598bef0f29f` | 8X8D8 block 17 tile 42 over the ground colour 6 | map 32, square (2,5) facing west, column 2 row 8 | `kobold-silt-joins-fa8c0ce1c541.png` (area 13) |
| `tile:29:fb089b8ff7a102450c65e507f291b6b165a0ea49342abf990afb315bee1127ed` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 29 | map 32, square (9,3) facing east, column 8 row 5 | `kobold-cave-exit-recess-edge.png` (area 13) |
| `tile:29:fb3456a245391138a53228c5ad7096ee14c19ee2d6b2202614fa8428477ee447` | 8X8D8 block 17 tile 18 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 3 row 5 | `kobold-return-edge-cap.png` (area 13) |
| `tile:29:ff895827d85d886bb33f9c2f77b12a063130cf5089a6c383c9ac3b55ec22efa1` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 29 | map 32, square (9,2) facing south, column 1 row 5 | `kobold-pool-passage-terrain-ff895827d85d.png` (area 13) |
| `tile:29:ff913b0f012f5419137db19c5e072d3b4b6d5d867ad1c85270a3f7f85a426645` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 17 | map 32, square (9,3) facing south, column 1 row 3 | `kobold-south-loop-terrain-ff913b0f012f.png` (area 13) |

#### tile set 8X8D8 block 18 (62)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:009457037d142fe80695a8e8261c64128344bd8452f96804deb7ab6d68fea5c0` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 30 | map 32, square (2,0) facing west, column 0 row 6 |  |
| `tile:29:08cb32f676a62ead288633d89fe93ca21aced20bd8ec83096f28bd37be13dadb` | 8X8D8 block 18 tile 16 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 32, square (0,0) facing east, column 10 row 5 |  |
| `tile:29:0b6e8d0d3d2e5349ee4523e6def2a8ef82c187ac5ea867b13404740fb1396a3d` | 8X8D8 block 18 tile 16 over sky colour 0 | map 32, square (14,0) facing west, column 2 row 4 |  |
| `tile:29:0bde341558510cfc07def5297d79e127a39a76a3969941153115379ea5b59f3f` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 30 | map 32, square (2,0) facing east, column 10 row 6 |  |
| `tile:29:11460ea840af57760f426283afb7f9c723610039196eb4be4599acafd77cf87d` | 8X8D8 block 18 tile 14 | map 32, square (0,0) facing east, column 10 row 7 |  |
| `tile:29:1205eca1c45885591e198d1a9193a726cb5d6b1df3e77e9d2bcffb75c0bd9645` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 29 | map 32, square (1,0) facing east, column 10 row 5 |  |
| `tile:29:2056f5cea302ca19385f0e21c500b27c2ee1362ccf4d49eedb05231d320dbca6` | 8X8D8 block 18 tile 15 | map 32, square (1,0) facing east, column 0 row 7 |  |
| `tile:29:2698b864d63d3cb18622284e96556bd60c59fb7745cfca7774741c48bd9cd9d9` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 59 | map 32, square (0,3) facing south, column 3 row 5 |  |
| `tile:29:2b773089d5ffe93efc12c1aa483a40dd92429aa223d156809005dede4e96b1e7` | 8X8D8 block 18 tile 65 | map 32, square (7,7) facing north, column 0 row 0 |  |
| `tile:29:2dda4c6e81ecef7d02edf271ed30ab6f993148b468e7cab9322c67c0c34c9015` | 8X8D8 block 18 tile 17 over 8X8D8 block 18 tile 17 over 8X8D8 block 18 tile 13 | map 32, square (7,7) facing north, column 3 row 4 |  |
| `tile:29:2e0e87fe312523847fab662707d009f69ce675e93c8558afc78d80817634bda3` | 8X8D8 block 18 tile 32 | map 32, square (7,7) facing north, column 0 row 4 |  |
| `tile:29:317bbd2618bded3bacbc7385a578eda445a5a778b6741a582988f3e622d3fea2` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 0 | map 32, square (11,0) facing south, column 2 row 4 |  |
| `tile:29:34d24cc5b84e9321ee3c1b1f0903c59fcea111373f2f40f8ff9c2461107bac4c` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 29 | map 32, square (3,0) facing west, column 0 row 5 |  |
| `tile:29:432de07bd14c8bc66c4bba6c84fdbe61f9cef64e4bb8c7365c0a587ce8c24fee` | 8X8D8 block 18 tile 56 | map 32, square (7,7) facing north, column 6 row 3 |  |
| `tile:29:4992acde087854d8bb2229efb9f1bb5d0288c32e9f93c8fd3cf68a13fd708db3` | 8X8D8 block 18 tile 57 | map 32, square (7,7) facing north, column 0 row 3 |  |
| `tile:29:4c7154f71485783702cbbe3dd607060a7585afa44a13efb9504059f849d79822` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 19 | map 32, square (2,0) facing east, column 10 row 5 |  |
| `tile:29:4d0525e6cabbfd8da7638b4769585dd603eff4d590c6fcd6844d8b8d7f99200f` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 28 | map 32, square (3,6) facing south, column 0 row 6 |  |
| `tile:29:4e45b797cd2bbe3b73dd4a389004e771721b0c3c3e9a12a8df491924a1874543` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 47 | map 32, square (4,6) facing south, column 2 row 4 |  |
| `tile:29:62101ecf19cbe531a15115f8aa04372039e130558e3185e139c2e84e44b25231` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 15 over 8X8D8 block 17 tile 0 | map 32, square (3,11) facing south, column 8 row 4 |  |
| `tile:29:64f1b6b3192784286aee3114c0319a3a74107b311479575df654ae76042b374f` | 8X8D8 block 18 tile 24 | map 32, square (0,0) facing south, column 0 row 5 | `kobold-cave-exit-exit-reveal.png` (area 13) |
| `tile:29:686aa8b7830905484a2c9cf072b0a106119cbc1ff7b527d9678b23926b33ae1a` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 31 | map 32, square (6,2) facing west, column 0 row 6 |  |
| `tile:29:6becd41d8a655f8b79fa4c8cabba69583219a15d992f3c4d09ec225c8bb301e0` | 8X8D8 block 18 tile 12 | map 32, square (0,0) facing east, column 10 row 3 |  |
| `tile:29:6c05ac92be404bafb97f6356732b0802a48b82a7d006bff95b3420098386dbac` | 8X8D8 block 18 tile 17 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (1,0) facing east, column 0 row 5 |  |
| `tile:29:6f8e23c2437e766bb9985e39846a50cfe404d002109ea8a60c9428596f2874a9` | 8X8D8 block 18 tile 47 | map 32, square (7,7) facing north, column 10 row 0 |  |
| `tile:29:7c8aec2bc303ec85f939bc1f851934470684f4378845e85982aeaa5993eb7f6b` | 8X8D8 block 18 tile 33 | map 32, square (7,7) facing north, column 10 row 4 |  |
| `tile:29:87413a53a88e8fe3d60f052ab15e7f24d8e81341ee71c7b08d55c0c53aa1495b` | 8X8D8 block 18 tile 0 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (5,10) facing north, column 9 row 5 |  |
| `tile:29:900ccf83fda933b82f4ec7bc7e51e4fc3dcefd727435bb1eaf7b8b46e8903273` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 28 | map 32, square (12,0) facing east, column 7 row 6 |  |
| `tile:29:9360a858be8db8bb3c21622f82cdf0b9aa0b8fdcb33e1f73a92e97933ff58516` | 8X8D8 block 18 tile 31 | map 32, square (7,7) facing north, column 6 row 4 |  |
| `tile:29:9393090ead9749a8e407dea14a7fc6e15ed203e2eb579c9b2bf6c3e308dbe2ba` | 8X8D8 block 18 tile 0 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 32, square (0,0) facing north, column 9 row 5 |  |
| `tile:29:97c5edfee5b51b1a35e3d78a3a3c915a316c056d30e667fffad1bd9287740d10` | 8X8D8 block 18 tile 30 | map 32, square (7,7) facing north, column 5 row 4 |  |
| `tile:29:97eec8857be5c78f4d6431d24c8c64e61ea3f42d3c15221aab5cd4c3a57495f1` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 62 | map 32, square (6,3) facing west, column 2 row 6 |  |
| `tile:29:9dff001660f1020e15c2ef88665e8c1acd97a86155201ef933d74f3c118ee3f2` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 31 | map 32, square (6,2) facing east, column 10 row 6 |  |
| `tile:29:a1c574e1bb10f89feb09315bd6b689d58f1e4def083c07a470af93fb291c89c2` | 8X8D8 block 18 tile 17 over sky colour 0 | map 32, square (1,0) facing east, column 0 row 4 |  |
| `tile:29:a3283ba8cd1e45e8d2477ee9651de21ff7d3795b8095517d0b1e0206c594da49` | 8X8D8 block 18 tile 58 | map 32, square (7,7) facing north, column 10 row 3 |  |
| `tile:29:a5a870487b1c927fdba74101cbe350ef5082e90954745fca01a5b92d5b3a3136` | 8X8D8 block 18 tile 46 | map 32, square (7,7) facing north, column 5 row 1 |  |
| `tile:29:ab51e3d8672bbf3e0b2b1beca02d34e786c1f9e85301489000a9d178eaff21f5` | 8X8D8 block 18 tile 44 | map 32, square (7,7) facing north, column 4 row 1 |  |
| `tile:29:acb90703131789cf429ff3d682446ef119f35be6a490bc5934772253575bd017` | 8X8D8 block 18 tile 55 | map 32, square (7,7) facing north, column 5 row 3 |  |
| `tile:29:b1cec1a99821922e1abba533486bdbc0b10c5ce881d1cfb0973cbf911e54f572` | 8X8D8 block 18 tile 17 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 32, square (1,0) facing east, column 0 row 5 |  |
| `tile:29:b31a196da8a2d930efe595783983ac9e214812278e7c5f9c4e6fccc8a65e3eb6` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 47 | map 32, square (2,0) facing west, column 0 row 4 |  |
| `tile:29:b4f1ee5c11b4713b4e2424950f183423ce2bd0938c9419ee717ed2a0448778c7` | 8X8D8 block 18 tile 45 | map 32, square (7,7) facing north, column 6 row 1 |  |
| `tile:29:b605eb2aa208fe8072bf88d13a52e498d5530add7315dddce313c7664e06d519` | 8X8D8 block 18 tile 29 | map 32, square (7,7) facing north, column 4 row 4 |  |
| `tile:29:bc3fabd62051e7bd22ce959d9616dc3d1dbf2b85363b51cc10b0a5da41772c79` | 8X8D8 block 18 tile 17 over 8X8D8 block 18 tile 24 | map 32, square (6,8) facing east, column 3 row 6 |  |
| `tile:29:bf140a1b5f168745e0149d0c3d0b5f094973bff98342b751ff4cafa082530540` | 8X8D8 block 18 tile 18 | map 32, square (12,0) facing west, column 0 row 10 | `kobold-silt-joins-bf140a1b5f16.png` (area 13) |
| `tile:29:c0b1186296f774376cf3e28e4b94cd8be6c7b9c2e1440f22f3ce61a6cf3bab6f` | 8X8D8 block 18 tile 0 over 8X8D8 block 17 tile 29 | map 32, square (1,0) facing east, column 9 row 5 |  |
| `tile:29:c194c6db43e0e2784ca6cd0bc4a51d1f14b0cd3956fd5af1b3dd35befa2850d7` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 19 | map 32, square (2,0) facing west, column 0 row 5 |  |
| `tile:29:c36767cd6c974d99c3184efb6551686a9674782fd856e2d0b57b4afff25b60c2` | 8X8D8 block 18 tile 0 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 32, square (0,0) facing north, column 9 row 5 |  |
| `tile:29:c44ec59d9feb309948881eee3028714fe98d5f9b580f3fce1d45f99fa8bf0d6c` | 8X8D8 block 18 tile 16 over 8X8D8 block 18 tile 46 | map 32, square (6,8) facing east, column 2 row 4 |  |
| `tile:29:c746d703104c8f7b0ad5b540853fe6475904bfd257b843dd2e1148ab95865287` | 8X8D8 block 18 tile 35 over the ground colour 6 | map 32, square (0,0) facing east, column 9 row 6 |  |
| `tile:29:c747902d490c8651566f0044d5054b5377fe2939d6a9656e8d6a7b518bee16b1` | 8X8D8 block 18 tile 19 | map 32, square (12,0) facing east, column 10 row 10 | `kobold-silt-joins-c747902d490c.png` (area 13) |
| `tile:29:cfbfd520ee1fb9140fa73dcc649955957e214bd5148e506d6286dc9f0168e54d` | 8X8D8 block 18 tile 13 | map 32, square (0,0) facing south, column 0 row 4 | `kobold-cave-thresholds-terrain-cfbfd520ee1f.png` (area 13) |
| `tile:29:d883d899fee78af6d7fa2f57125dcceafe319f67edd6fef7abc283205b33aea8` | 8X8D8 block 18 tile 16 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (0,0) facing east, column 10 row 5 |  |
| `tile:29:d8ef61f1d5bf78fd1ee381686a427847b24ee7d13ae40a19b89eb65efb119107` | 8X8D8 block 18 tile 0 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (5,10) facing north, column 9 row 5 |  |
| `tile:29:dadafd53b400497073e72587ebfa0959a9c1257fc40612826b7c1caadb5c274d` | 8X8D8 block 18 tile 17 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 32, square (1,0) facing east, column 0 row 5 |  |
| `tile:29:dd93f53ce96bf6e80f293c994120201a652bde05aa235fe5d69756c162375a4a` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 67 over sky colour 0 | map 32, square (8,2) facing south, column 3 row 4 |  |
| `tile:29:e0ce7a229d6caedd953d55b93b29c9231e5eaeee6aa628029376f3a36ec87ee7` | 8X8D8 block 18 tile 54 | map 32, square (7,7) facing north, column 4 row 3 |  |
| `tile:29:e6aff60be262a7801a0a779c909dda8f93e56dd4d455ed694be80d8e71ced9c7` | 8X8D8 block 18 tile 34 over the ground colour 6 | map 32, square (0,0) facing east, column 1 row 6 |  |
| `tile:29:e767ec39af5753538fba3c45ac0670931e256a0bbb166fbd01b47b2650872352` | 8X8D8 block 18 tile 16 over 8X8D8 block 17 tile 15 over sky colour 0 | map 32, square (6,3) facing west, column 2 row 4 |  |
| `tile:29:ecb0682eac09c6ea09be110b306e20682de0db7dee154559ff38070568acf057` | 8X8D8 block 18 tile 17 over 8X8D8 block 17 tile 0 | map 32, square (3,0) facing west, column 0 row 4 |  |
| `tile:29:f086b2fe6ed2698954c685a6a823085384835d51ba9acc7f04ffee8b1493392a` | 8X8D8 block 18 tile 16 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 32, square (0,0) facing east, column 10 row 5 |  |
| `tile:29:f2bd820fbc1933119e79e1e7e5df7023f699c8f34c1723527f9f10f927fcf1c5` | 8X8D8 block 18 tile 17 over the ground colour 6 | map 32, square (1,0) facing east, column 0 row 6 |  |
| `tile:29:f9dc096b972e26c610fec4b272468112d783f7303b836ac464d1c1081db99a1b` | 8X8D8 block 18 tile 0 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (0,0) facing north, column 9 row 5 |  |
| `tile:29:ffd3ce3f21b19722b8ba818d7ba97be7f4b10a0a24b3cb524002ac7e914df481` | 8X8D8 block 18 tile 16 over the ground colour 6 | map 32, square (0,0) facing east, column 10 row 6 |  |

#### tile set 8X8D8 block 20 (254)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:29:0331462acb2e60cd8e9a4f512ff9d1f6b2456e9befeb344aa0b093fec09e6cd3` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 2 | map 29, square (3,0) facing north, column 8 row 3 |  |
| `tile:29:04ef16d4b453b44ff8732f8b5b45e15c32f6cd2c6fb9dd1261d2d4e1b6d1dbdc` | 8X8D8 block 20 tile 67 over 8X8D1 block 203 tile 17 over sky colour 0 | map 29, square (7,7) facing west, column 1 row 4 |  |
| `tile:29:056951e0081a157ef5f967838f168d7346fbe42b0f9080e844ec2f58f2d8413c` | 8X8D8 block 20 tile 47 over 8X8D8 block 3 tile 39 | map 29, square (14,11) facing north, column 10 row 7 | `textile-house-056951e0081a.png` (area 2) |
| `tile:29:07a228e1f52832792c7d2c3d4b32d3aee893574056e8452eb95ec57c27137eda` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 3 tile 21 | map 29, square (2,0) facing west, column 5 row 5 |  |
| `tile:29:07adbce2fefc2f2d56de866c8c0b8d141e0c20d0838b1a944e51eb5b124dc1f9` | 8X8D8 block 20 tile 48 over 8X8D8 block 3 tile 45 | map 29, square (14,11) facing east, column 0 row 7 | `textile-waterfront-crossing-terrain-07adbce2fefc.png` (area 2) |
| `tile:29:08056617e3e8e51fe97f080d728a7d8673c2c65409c07503b6bc0ce707218e72` | 8X8D8 block 20 tile 67 over sky colour 12 | map 32, square (12,1) facing north, column 1 row 3 |  |
| `tile:29:08b8cb925687f7cd30c3ae963a43e0090a6bb9f4f53ddd93bf8924cbf4210938` | 8X8D8 block 20 tile 68 over 8X8D8 block 20 tile 65 over sky colour 0 | map 32, square (2,2) facing east, column 8 row 3 |  |
| `tile:29:09321b21629cc7b3c824ca01f4c9b919e5af774418ac9faa7899498714bbccbe` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (6,1) facing west, column 8 row 5 |  |
| `tile:29:0aa866b7c8a03753ac3f65e800a96a02422cd755e24c8112becee3e91c081f00` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (5,0) facing south, column 2 row 5 |  |
| `tile:29:0dca9729e159456b4f742d7156c333c8de335ced177cd89f9bd4cf69400d7717` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 3 tile 37 | map 29, square (1,0) facing west, column 5 row 4 | `textile-rubble-interior-terrain-0dca9729e159.png` (area 2) |
| `tile:29:0ef85eaa206bca26ef56680a72c7eff6db4e1f66c5f19087a468d4d36cc3fa38` | 8X8D8 block 20 tile 60 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,2) facing east, column 5 row 4 |  |
| `tile:29:0f5e0618a46b8b1e93ba8c6d99836a2ac7b5ddf71496fe9c5160261fa6928bf8` | 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 65 over 8X8D8 block 20 tile 65 over sky colour 0 | map 32, square (1,3) facing north, column 5 row 3 |  |
| `tile:29:0febcff21ac9aa44812ad250be1f8604104ab7acfe8a9f8abe265d6b33335299` | 8X8D8 block 20 tile 58 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 4 row 5 |  |
| `tile:29:11a5f5e2015b2c916e68c14953079b8cfcbba45950653242c139c23dd7c0bc72` | 8X8D8 block 20 tile 66 over 8X8D1 block 203 tile 16 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (5,6) facing south, column 9 row 4 |  |
| `tile:29:1228edfe030f33759b57ac331ee4938a4e8c1ce706cd23bed12119678731f8c6` | 8X8D8 block 20 tile 26 over 8X8D1 block 203 tile 38 | map 29, square (10,0) facing west, column 3 row 6 | `swamp-elder-terrain-1228edfe030f.png` (area 16) |
| `tile:29:128bee82932159e19572a163a68b8e1e213586f4ee927e1e79618fde260300ae` | 8X8D8 block 20 tile 37 | map 29, square (7,7) facing north, column 1 row 9 |  |
| `tile:29:13214196e1c53eb82cf14d7ce3432f8999a1d59b64fa6792c02c2157f8b9c56a` | 8X8D8 block 20 tile 30 over sky colour 12 | map 32, square (3,3) facing east, column 9 row 4 |  |
| `tile:29:156807dad12f54410cf5b35d4dab94f46d1eabe48efdcf66f874e827eb7f901e` | 8X8D8 block 20 tile 11 over sky colour 12 | map 32, square (12,1) facing east, column 7 row 4 |  |
| `tile:29:15b3de8579129d33ddee644f91c9b3bed9e009176f350c63bcfe51a9fc60aa5a` | 8X8D8 block 20 tile 58 over 8X8D1 block 203 tile 12 | map 32, square (1,2) facing east, column 4 row 5 | `textile-house-15b3de857912.png` (area 2) |
| `tile:29:1645ab036f7cc22794b35fcf8426caf495dfdb5e08a90803d440a827f026bbb8` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,4) facing north, column 10 row 4 |  |
| `tile:29:1765273a88efda6d9cfe4945503114eedf084084d72b13061ee6676184bd0eb2` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 68 over sky colour 0 | map 32, square (7,4) facing east, column 8 row 3 |  |
| `tile:29:18b57b66d653a6a804885383ba4e85d0f22dada126e32dbfee6d50fdd898a433` | 8X8D8 block 20 tile 20 over 8X8D8 block 20 tile 20 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (1,2) facing east, column 5 row 5 |  |
| `tile:29:190aea9be7251ae6345374385ed6610409983b196efcc6c111da737ddcdc1cad` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 21 over sky colour 12 | map 32, square (2,2) facing west, column 2 row 4 |  |
| `tile:29:19703de2c23c86f89119739508c3c21ac005b2ce35aa9664ea3692ac89e3c2b4` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over sky colour 0 | map 29, square (7,7) facing north, column 5 row 4 |  |
| `tile:29:1983a404eea405427358563ab0c7c8d875bb1be7ec460fdbbbbfb8d7f64f7b64` | 8X8D8 block 20 tile 52 | map 29, square (7,7) facing north, column 9 row 9 |  |
| `tile:29:1d0beb1dbe70f87295cffe5644153d55ac1d3ea951b80dba245356e6ea72e0bd` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 1 | map 32, square (4,4) facing north, column 9 row 2 |  |
| `tile:29:1dee67b93f797dbfac33ac7b199100ea9eded73708bfa1091274e59c8feff4a6` | 8X8D8 block 20 tile 57 over sky colour 12 | map 32, square (10,2) facing east, column 6 row 4 |  |
| `tile:29:1fb812974078d5aa90dc8407744dd181a5044d78f281d9d4ac458ee918324719` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 27 over the ground colour 6 | map 32, square (10,4) facing north, column 0 row 7 | `mendor-library-west-rooms-terrain-1fb812974078.png` (area 2) |
| `tile:29:21ae7aef1fee9343dfadd3da893c6dc1d41b4bbe71e38bfc55404e0c41169e25` | 8X8D8 block 20 tile 56 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,2) facing east, column 4 row 4 |  |
| `tile:29:24d01200bba96c8cde754ebc3038e7853e7230284dc3644cfb50c928dc30bf1d` | 8X8D8 block 20 tile 23 over 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (2,2) facing east, column 7 row 3 |  |
| `tile:29:25252f3bf47446657331d3f35e5e6eeffd850f76db635f17f747feaccbf5001c` | 8X8D8 block 20 tile 59 over 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (1,3) facing south, column 6 row 5 |  |
| `tile:29:26c47aad58b585817cac3af98c4eb82245225bc6cb521743435e9ba87bffc8e7` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 1 | map 32, square (5,8) facing west, column 9 row 7 |  |
| `tile:29:275179da6c6bf1ac958b5abaef08d7a4545f964ea95ac5fdea97c3db621f8beb` | 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (12,1) facing north, column 9 row 1 |  |
| `tile:29:28374f04f178e369fa0ff52c5bb37e62d2a7cef3f93b9a8e62bc92c504333764` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 23 over sky colour 0 | map 32, square (7,4) facing east, column 7 row 3 |  |
| `tile:29:296405ff47dc88d9cf40cbebc362f836730f4690beacd1c13bb9e7d6f136c012` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 29, square (10,1) facing east, column 0 row 7 | `swamp-elder-terrain-296405ff47dc.png` (area 16) |
| `tile:29:29848fa8640bd3e24cc9b6e3017d03559dfed5ed14ebacdb0056bad753894ef1` | 8X8D8 block 20 tile 54 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (9,4) facing east, column 3 row 3 |  |
| `tile:29:2a7ace6c9566e6d1f1deeea722eec76ccfd79836d5abfb0da7764e1b259f0afc` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,4) facing north, column 10 row 4 |  |
| `tile:29:2ac42b8d0ae2451084b01b1dc88d78a309911b93cbfc205f3a3efed6d94a2aac` | 8X8D8 block 20 tile 69 over 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (2,2) facing west, column 2 row 3 |  |
| `tile:29:2c7c2d08a9a2a925c223466cec81a2d48d34789221ae8dfba48b34472a72dd8e` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 56 over sky colour 12 | map 32, square (9,4) facing south, column 1 row 4 |  |
| `tile:29:2d3c54a2c443456bfe627d4ae1753f5c655acab30d8c62db30f8e9156a3f5a28` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (8,9) facing north, column 0 row 3 |  |
| `tile:29:2e16012e0525cc6b1642d669ef196bb469ed22e81c0c56b195265f70ced22085` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 0 | map 32, square (7,4) facing south, column 1 row 3 |  |
| `tile:29:2ea149acf3357124c855d6d666d03196bab723d93a1a0ac61da0098d8212788e` | 8X8D8 block 20 tile 30 over 8X8D8 block 3 tile 3 | map 29, square (14,11) facing east, column 8 row 5 |  |
| `tile:29:2ed0af54c610620fcdea0c631ba2e75a45829bfe40776c4f0142167aa2d9ed35` | 8X8D8 block 20 tile 69 over 8X8D8 block 20 tile 65 over sky colour 0 | map 32, square (2,2) facing west, column 2 row 3 |  |
| `tile:29:2f1a1f30c9239c024026e3e9f5714a45e046110ba5fdf5263ed3229a5669ad6d` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 21 over sky colour 12 | map 32, square (2,2) facing east, column 8 row 4 |  |
| `tile:29:2f2e39b2ca6378e64422de9fd1b6933575c65113c1bd0a674fa5520f3d462591` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D1 block 203 tile 16 over sky colour 12 | map 32, square (2,3) facing east, column 6 row 4 |  |
| `tile:29:2fdff1aa2637d7cb9d23ce42a8ae771967d30728b8e0713ab4a0b77b2908eefe` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 5 row 5 |  |
| `tile:29:31612dcc3aec56167cd6686d2f2dc7fb591ec70c34ec7b4924754b6ed2e2256a` | 8X8D8 block 20 tile 20 over 8X8D8 block 20 tile 20 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (1,2) facing east, column 5 row 5 |  |
| `tile:29:326785667f8ebc9565683c4d102f8199fbad185afd3eaa4feebfe72540872826` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 12 | map 29, square (7,0) facing north, column 0 row 7 | `lizard-north-canal-terrain-326785667f8e.png` (area 16) |
| `tile:29:351ab30c2bbce9552ceeaee4c7b3b3a5357f23a581dbebf87df4505f554bf519` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 57 over sky colour 0 | map 32, square (6,4) facing east, column 6 row 4 |  |
| `tile:29:35b6917f39a409892349698696dbd8c44516c51a1d8c0c4cebaef5fb5cf7200d` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (9,6) facing east, column 3 row 3 |  |
| `tile:29:3689c4715468180847b9f0186a1d0e496735679fa5d4c43ef9e1dffd24f6ce2b` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 28 | map 29, square (8,2) facing north, column 0 row 7 | `lizard-west-turn-terrain-3689c4715468.png` (area 10, 16) |
| `tile:29:393e3ff210b2ce6722730a4c4edb42e2e6d10a4f7e6004cbec3a3bcc0eb45978` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 29, square (5,1) facing north, column 0 row 7 |  |
| `tile:29:3b9ef3736ffcdddb335ca9bec61d8c281b4daeb432b4ab0b4a57a9623f5d3eb1` | 8X8D8 block 20 tile 61 over sky colour 12 | map 32, square (12,1) facing north, column 0 row 0 |  |
| `tile:29:3d89e04cbb1185af8239ab3ffa9c85f8a14dcd9f5cda8d7fde04dee8352cdafa` | 8X8D8 block 20 tile 46 over 8X8D1 block 203 tile 31 | map 29, square (13,11) facing south, column 0 row 5 |  |
| `tile:29:3e6f947f2979b0b3028b5215ebe798176c1d307f2353b20dc595dedfb830e62b` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 54 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (8,4) facing east, column 4 row 4 |  |
| `tile:29:3e92125776502de4b5c1fca0a2edb720a49bba0058ed2b3e7166e13256a21a23` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 57 over sky colour 0 | map 32, square (2,4) facing north, column 9 row 4 |  |
| `tile:29:42c5af1cc8195212f2bbfa2e1abfb831b1dfd2e02b380ce217b3b5d8410b9f4f` | 8X8D8 block 20 tile 16 over sky colour 0 | map 29, square (7,7) facing north, column 10 row 2 |  |
| `tile:29:456d97abb39cdaa08d1b53698065ee0f31978a0e92b32c8d2f64e16764870bcf` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 64 over sky colour 0 | map 32, square (2,2) facing west, column 1 row 3 |  |
| `tile:29:47789dbfc5361f8f9fbcd8cf47dca6af5807f8f8c35ea899aeeea1b4b63c2eb5` | 8X8D8 block 20 tile 20 over 8X8D8 block 20 tile 20 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (7,4) facing south, column 5 row 5 |  |
| `tile:29:4802ab8bf56106fdc7060356496d290a076347713d94c59952bd59a7d1cb5ec4` | 8X8D8 block 20 tile 47 over 8X8D8 block 3 tile 6 | map 29, square (10,4) facing east, column 10 row 7 |  |
| `tile:29:49bdf0621c9f87b0c254c8bced4e04b21a4b2d150cd755de9f1fc6143b2ed8bb` | 8X8D8 block 20 tile 35 over 8X8D1 block 203 tile 39 | map 29, square (4,0) facing west, column 9 row 3 |  |
| `tile:29:4a6b9d218c44eb528b7d83d5e9faa641d2c9ced1ffc4cc5a670fdf4571ac0d8b` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D1 block 203 tile 36 over the ground colour 6 | map 29, square (15,12) facing north, column 8 row 8 |  |
| `tile:29:4bd34efe2ae4e53879598d60f8c0ea1573235f51a3393a50f272c9dc5e21fb1a` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 60 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (10,4) facing north, column 5 row 4 |  |
| `tile:29:4c47499e1cd6890aa3a90b4197ffc982549b8001568ebe819fd24831de8cc503` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 60 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (10,4) facing north, column 5 row 4 |  |
| `tile:29:4d7c74998055e50fc2f69531a8b1ad9d8aa469d6f7bac02c7e6a0963159be194` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 7 | map 29, square (1,0) facing north, column 4 row 4 |  |
| `tile:29:4e33f2320bff83e29138d79b6b4a2113fa8f131db4bb6bbc08ff6eab7ab60ca1` | 8X8D8 block 20 tile 56 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,2) facing east, column 4 row 4 |  |
| `tile:29:517781b2fc5bfa6dc7db895f9c06998c7c5888ea77960f14907c4061f5e9d8c1` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (6,5) facing north, column 10 row 3 |  |
| `tile:29:5540f5daefccf22c4845fe61ca14e7d53f8c100b1ab9afb503e7b36e6c0ffb5d` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over 8X8D8 block 3 tile 3 | map 32, square (3,5) facing east, column 5 row 4 |  |
| `tile:29:573d740bc625c9900f388da0daf6eb1848b804b55b573fea84920f123bab2ad8` | 8X8D8 block 20 tile 6 | map 29, square (7,7) facing north, column 8 row 8 |  |
| `tile:29:584b97b37335c2c7c1b5f34725a884b4871965fa86931d931841591683ed8109` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 21 over 8X8D8 block 20 tile 21 over sky colour 12 | map 32, square (1,3) facing north, column 5 row 4 |  |
| `tile:29:5864c0f21eb0cb89c0231509982109a2d21529ee0ac85f90737423dd1109db00` | 8X8D8 block 20 tile 31 over 8X8D1 block 203 tile 17 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (5,4) facing north, column 0 row 3 |  |
| `tile:29:59c035d3f287e8f8be2d20c0646b5d41ba0207665a3861c7d30ecd8edfa91893` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over sky colour 12 | map 32, square (4,4) facing east, column 5 row 2 |  |
| `tile:29:5a8b27d1c988fd0d398f7c022f88c536f721d64e0a37461630c66a3bd811546b` | 8X8D8 block 20 tile 67 over 8X8D8 block 3 tile 7 | map 32, square (10,2) facing east, column 1 row 4 |  |
| `tile:29:5d5308ba5f34574b3d7d451f17b089959458408f848949697b6886a74a2fb79b` | 8X8D8 block 20 tile 58 over 8X8D8 block 3 tile 3 | map 32, square (6,8) facing south, column 1 row 5 |  |
| `tile:29:5d9d6c61916a8471f9319c90c7af6608bf9b1c5691a93019519c1bd4aa104026` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 68 over sky colour 12 | map 32, square (7,4) facing east, column 8 row 3 |  |
| `tile:29:5d9ebd17f67682a5cded1be9ddec9423d084d924ce5c04ebe55bd2b9faf02e26` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over sky colour 12 | map 32, square (4,4) facing east, column 8 row 3 |  |
| `tile:29:5db53044b6191190022a107762d1d27a08e1f05029178b5d0fd257b941a65e36` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (9,6) facing east, column 3 row 3 |  |
| `tile:29:5e192f28497e5dd6bbf24245e3cff1d1c2981ec972d4898eac00fcf35817b7b4` | 8X8D8 block 20 tile 44 over 8X8D8 block 20 tile 0 | map 32, square (5,7) facing west, column 1 row 7 |  |
| `tile:29:60f2a658781a2c0f8cb958efb3e79fef21646d60d316cb2cd6d6c16d491fbd52` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (10,8) facing north, column 9 row 3 |  |
| `tile:29:63256dba0ba85cd06506d75a4d3e478bde2914786b33bd58c998a916d96d0f09` | 8X8D8 block 20 tile 54 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (9,4) facing east, column 3 row 3 |  |
| `tile:29:645753d839ce60750f1c64cc36c3c216658f8d3606ffb7e733789047601a455d` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 64 over sky colour 0 | map 32, square (6,5) facing north, column 10 row 3 |  |
| `tile:29:65e2c1d2999ea75a0b212b40fa87d7a3dc664b549d9ca8ca4edb810f18f5e622` | 8X8D8 block 20 tile 33 over sky colour 12 | map 32, square (2,4) facing west, column 0 row 3 |  |
| `tile:29:667690594675b843399ac69ff4c2f239dbffadaff96ee46e5bd694e57ec341a5` | 8X8D8 block 20 tile 33 over 8X8D8 block 3 tile 6 | map 29, square (1,0) facing east, column 1 row 2 |  |
| `tile:29:672e2862be1da97cf0cd40b59be6d8195437fe80bfbbc3795b58b141fb880985` | 8X8D8 block 20 tile 36 over 8X8D8 block 20 tile 36 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (1,3) facing south, column 5 row 5 |  |
| `tile:29:68385bdde85e5c6e86b1799bdded38fa6ed0183a8484af2624bd54a9c0966de6` | 8X8D8 block 20 tile 24 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (2,2) facing west, column 3 row 3 |  |
| `tile:29:694dcdefd00e8bb257c612c9d2c7007d45f716ac8fd2f7cd6f394e966412b6f9` | 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 6 row 5 |  |
| `tile:29:695c472ab37924f5b0647ee7ca8a1d3974f80ebbf0c157c4ddb7a6e02f8ec17a` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 31 over sky colour 0 | map 29, square (14,12) facing east, column 7 row 3 |  |
| `tile:29:6988835a4f88367ace5452c6919f9487889116564b79646e3b244c250263246f` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 32, square (10,4) facing south, column 10 row 7 | `swamp-elder-terrain-6988835a4f88.png` (area 16) |
| `tile:29:6a852d39cf195833c3e01785f0220ea9869f6aba4eb7487c410d515fbe21641f` | 8X8D8 block 20 tile 21 over sky colour 12 | map 32, square (12,1) facing east, column 8 row 4 |  |
| `tile:29:6a8e11855bb6fc46fa5bcaee2e073f5608df235cfc4576088b317d527ef82729` | 8X8D8 block 20 tile 69 over sky colour 0 | map 32, square (12,1) facing east, column 2 row 3 |  |
| `tile:29:6b7decf9ed85600c765392d54ee532c65a33739374442b883d495fb544e541e1` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (3,9) facing west, column 9 row 4 |  |
| `tile:29:6cb31b5d08a09f1b265a7249fe2338150117617bb83c3cfff60e4feb4cde04f5` | 8X8D8 block 20 tile 15 | map 29, square (7,7) facing north, column 5 row 5 |  |
| `tile:29:6cf8120c22850b01994ffdca03b5006b2d92192e9beba897983e59b408d2832e` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 37 | map 29, square (1,0) facing west, column 2 row 3 |  |
| `tile:29:6cfd0ab077b4d7249ed877342e44618dfc7bec7acdeeaa249384023ff52f20ac` | 8X8D8 block 20 tile 24 over sky colour 0 | map 32, square (12,1) facing east, column 3 row 3 |  |
| `tile:29:6e645d6fed8c637712a7480805642df76d82319cdfb687b533732873a5298508` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 56 over sky colour 12 | map 32, square (1,3) facing east, column 1 row 4 |  |
| `tile:29:6f73ff25190335af564679d65a7f6cee7abee3ebd8ada434a3b4e50e7c33d5cc` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 39 | map 29, square (6,0) facing north, column 9 row 7 | `textile-waterfront-crossing-terrain-6f73ff251903.png` (area 2, 16) |
| `tile:29:6fbe8db05a8c5ad6cb962aae0f1437058c8ff04987b4806b0c76ca824ca9be7d` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 29, square (8,3) facing west, column 10 row 7 |  |
| `tile:29:702d01acfd45798d0eaf5ad9a98e446e81256170da4762aee6614b34e1943652` | 8X8D8 block 20 tile 67 over 8X8D1 block 203 tile 17 over sky colour 12 | map 32, square (3,5) facing south, column 1 row 4 |  |
| `tile:29:704d11582b17ce00bbd7d7e6bfbc2621b294031d21842a132eb26efa44425d0b` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (5,0) facing south, column 2 row 5 |  |
| `tile:29:71c820db4deb52c1213854260309c84bec0dd402056e11ea312468715e96e177` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D1 block 203 tile 27 over the ground colour 6 | map 29, square (4,7) facing north, column 4 row 6 | `mendor-library-west-rooms-terrain-71c820db4deb.png` (area 2) |
| `tile:29:71cf48879961cc43fc3e214a0eccd8daca6e4b2beb84b44ef98adc63639c37e6` | 8X8D8 block 20 tile 23 over sky colour 12 | map 32, square (1,2) facing east, column 7 row 3 |  |
| `tile:29:7397548084c9f76ebb76bb249a1e6b41e83b1ea3a599d9d343a050dab169ae90` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (5,10) facing north, column 7 row 4 |  |
| `tile:29:75f8e4856d7c53aeec6a71691ce8c1ec7caa8e4d173b4c848683effb7fd963a4` | 8X8D8 block 20 tile 17 over sky colour 0 | map 29, square (7,7) facing north, column 0 row 2 |  |
| `tile:29:784b99cda2bd54eedac7526ab2f7f767fccd6725f2463aadeb625759aff972d4` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 56 over sky colour 12 | map 32, square (9,2) facing south, column 1 row 4 |  |
| `tile:29:795148c2d50a5f8db9778024fc86357a85262f95f516f396d27655af3a27f2d3` | 8X8D8 block 20 tile 66 over 8X8D8 block 3 tile 7 | map 32, square (12,1) facing south, column 9 row 3 |  |
| `tile:29:7989cd53906231ba9c7d5867d56fbdd5ddb1383358ef89d583611f1ccc953240` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (5,10) facing north, column 7 row 4 |  |
| `tile:29:7bae6ad4dc9f7458785b253f4ba7aa4e79b21ec83cf56b7cf08e1d80da7b639d` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 61 over sky colour 0 | map 29, square (9,0) facing south, column 4 row 4 |  |
| `tile:29:7c64cecbce80dd85ba9da72465e5b9937a97e8a34e6c903d165e563bcf8ee408` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 69 over sky colour 0 | map 32, square (4,4) facing east, column 2 row 3 |  |
| `tile:29:7da5be70b696f26760ee129415a049c366359a1de4b2be4c34e5e713658a7d20` | 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 18 over sky colour 12 | map 32, square (12,1) facing west, column 5 row 3 |  |
| `tile:29:7f1f541d57d08d607a8e98e87bde57ef0291dab6ae20f28484fd7c5fb6ccf3a2` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 57 over sky colour 12 | map 32, square (6,4) facing east, column 6 row 4 |  |
| `tile:29:7f5be6075e9d9d9129260a85eeee1bdc880336432f9ab234c6dda32fd4f2f2e6` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (5,8) facing south, column 3 row 4 |  |
| `tile:29:80f018e2c3b152d61c2f3e6f444ae42497d0319a9d771a708cf93e68c16aba22` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 31 over sky colour 0 | map 32, square (9,8) facing east, column 6 row 4 |  |
| `tile:29:825415d928684bce36110dc5a9618fb507eabd69bf10bbdb41bd11238bb12c06` | 8X8D8 block 20 tile 4 | map 32, square (9,2) facing south, column 2 row 5 |  |
| `tile:29:82acd39709cc7defa365de65055ed976f251d5b3edc5e07f7dd1c292e0b4a1be` | 8X8D8 block 20 tile 68 over sky colour 0 | map 32, square (1,2) facing east, column 8 row 3 |  |
| `tile:29:83722c9ea7d85b8bb6ccb48941123d95bae0f692edb71e7b21c92b314163d40a` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 24 over sky colour 12 | map 32, square (5,12) facing east, column 0 row 3 |  |
| `tile:29:83cd9a2bf06122184e996c722274f1628518c3dad9a16679d8caf9ce458d41ff` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,4) facing north, column 6 row 4 |  |
| `tile:29:8470286515a8181a5627041351e0cea5e7b46491aaf6bfab909bacc51ec37fed` | 8X8D8 block 20 tile 2 | map 32, square (9,2) facing south, column 1 row 6 |  |
| `tile:29:84a5b3ebe45bff016e1914103c09dc818ed69ddc4bccb2bc823ea624bbfac945` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D1 block 203 tile 30 | map 29, square (5,0) facing west, column 5 row 4 |  |
| `tile:29:84ac497aea7c09af16f4f31c724edce29281d8d30cdf8899454abf6e4f27f5de` | 8X8D8 block 20 tile 69 over sky colour 12 | map 32, square (12,1) facing east, column 2 row 3 |  |
| `tile:29:8519186e0ebd60248c99e2e256f590262afd1dd8f31f37d094bb5dbdfb6eef3f` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 3 tile 3 | map 29, square (1,0) facing north, column 5 row 4 |  |
| `tile:29:85467a3a26a7c690f7d798b881ea920dac17a79c142a2a11882ad1b929cbc458` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 30 over sky colour 0 | map 32, square (6,10) facing south, column 7 row 4 |  |
| `tile:29:857fcb3a77498d15e2d08ff6919e9e23126eba590c712079fe9476c1a36becc9` | 8X8D8 block 20 tile 53 over 8X8D8 block 20 tile 64 over sky colour 0 | map 32, square (9,2) facing east, column 10 row 3 |  |
| `tile:29:8702ad6f6409e5d76690001a6f1a39e6541a0b7e3b2c7203ddac7cc4cecbdc83` | 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 38 | map 29, square (7,0) facing north, column 1 row 7 | `lizard-north-canal-terrain-8702ad6f6409.png` (area 16) |
| `tile:29:87537403b3237ec49ad6ade7883225702e6eb6e467bb6d562c43a773acd8dbf9` | 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (4,0) facing east, column 10 row 5 |  |
| `tile:29:8aaba6973114fdd4c56b10cab76e61b75ca4f0c1191634d6693f14e64fe86ceb` | 8X8D8 block 20 tile 16 over 8X8D8 block 20 tile 9 over sky colour 12 | map 32, square (3,2) facing east, column 10 row 2 |  |
| `tile:29:8c50beb046af7365a57b6e0c81a9a92334920b2676e583e82c82bad63eb744fc` | 8X8D8 block 20 tile 19 over 8X8D8 block 20 tile 19 over sky colour 12 | map 32, square (12,1) facing west, column 5 row 4 |  |
| `tile:29:90d71316df14961102e76b838ff12dc8d78a468969df4ad6d6c79fc5b4a0c828` | 8X8D8 block 20 tile 55 over sky colour 12 | map 32, square (9,2) facing south, column 1 row 3 |  |
| `tile:29:90f593d204ab0e78802d95259041f86eecfb2bc7a0f8a11323fc58ef51a83a6e` | 8X8D8 block 20 tile 21 over 8X8D8 block 20 tile 21 over 8X8D8 block 20 tile 60 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,4) facing north, column 5 row 4 |  |
| `tile:29:91c4fe4587595d38317ae0c34f3b3b363eda13d2aca3bd954cf3a531bd97feb4` | 8X8D8 block 20 tile 57 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,2) facing east, column 6 row 4 |  |
| `tile:29:91cb641284c83a9d4f83a83b8e0710acfbf12828cfa70015de9ff8535451f7ed` | 8X8D8 block 20 tile 40 over 8X8D8 block 20 tile 40 over the ground colour 6 | map 29, square (7,7) facing north, column 6 row 8 |  |
| `tile:29:9210670b1cc64e7dbaf8f70c9675657b38f2d4e4d12ef80a89106a1a7f6f515d` | 8X8D8 block 20 tile 39 over 8X8D8 block 20 tile 39 over the ground colour 6 | map 29, square (7,7) facing north, column 5 row 8 |  |
| `tile:29:92543d529d72bf0ee10df65d8ee64e1cc618f08e944132bdf79b37c0b597f658` | 8X8D8 block 20 tile 47 over 8X8D8 block 3 tile 32 | map 29, square (9,3) facing south, column 1 row 6 |  |
| `tile:29:93b09834099fef3e3246d3d1b63416501d32e1bbb824a620e47a0a2443393d09` | 8X8D8 block 20 tile 7 over sky colour 0 | map 29, square (7,7) facing north, column 1 row 2 |  |
| `tile:29:953612919a96aead4a318fd21a9d128ed7c638d36d34005b2975667ff73ca1c0` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D1 block 203 tile 16 over sky colour 0 | map 32, square (2,3) facing east, column 6 row 4 |  |
| `tile:29:9555c662a823196d9cd300282649d8a60b41c5771bbfc855f4c8ca07e955286d` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 30 over sky colour 12 | map 32, square (9,7) facing south, column 0 row 4 |  |
| `tile:29:963a146308d710d59cef0282162fde40551b83fc82574b8d64fd3cd9497ea76d` | 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (12,1) facing north, column 10 row 1 |  |
| `tile:29:9a00db69baff51ecc8b7233947534f88bf6eda142f2881d007fe24a2a62aaf09` | 8X8D8 block 20 tile 46 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (2,2) facing south, column 0 row 5 |  |
| `tile:29:9a25d263ace5d4e8bf482335baef1bfcb2ba17975beaec79e182a91bf56f5039` | 8X8D8 block 20 tile 51 | map 29, square (7,7) facing north, column 10 row 9 |  |
| `tile:29:9ae5d4ebf6ec90cacd532403103d1659c8ee6f2e431eff778b567e211cf48a9b` | 8X8D8 block 20 tile 67 over 8X8D8 block 3 tile 6 | map 32, square (2,2) facing south, column 0 row 4 |  |
| `tile:29:9b1c3f146b0f6c8b589b0f4a3c256230b35bf548749c8cf6b500acf22bf31e58` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 68 over 8X8D8 block 20 tile 65 over sky colour 0 | map 32, square (5,12) facing north, column 8 row 3 |  |
| `tile:29:9b5acb2d55f8b2e382cd86683082c55f90a186785ddef5ccbc808c24341f6446` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 24 over sky colour 12 | map 32, square (7,5) facing east, column 0 row 3 |  |
| `tile:29:9c32de97c06d641c847a690ede5780622d44635ce8e1abe51af2b4571a537d5f` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 69 over sky colour 12 | map 32, square (4,4) facing east, column 2 row 3 |  |
| `tile:29:9decd19054ea3690f68a7f25db57277f7108cb8937a311bb4c761d86321ec9fc` | 8X8D8 block 20 tile 33 over 8X8D1 block 203 tile 16 over sky colour 0 | map 29, square (2,0) facing north, column 10 row 3 |  |
| `tile:29:9e65c048e24257626e8f3dcf282746653d70eb9345ba911815c4cea34fd1111d` | 8X8D8 block 20 tile 44 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 29, square (15,12) facing north, column 7 row 7 |  |
| `tile:29:9e7571c108f6611a0321b717fb26ede61186e55e2336dacba324093b5bde1e38` | 8X8D8 block 20 tile 59 over 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 32, square (1,3) facing south, column 6 row 5 |  |
| `tile:29:9e9a2bf782c41e0ec95071f2134c5b2a51b0f191b417660384a19cc90fe08c0a` | 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 65 over 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (1,3) facing north, column 5 row 3 |  |
| `tile:29:9ee38ab5c4d118b9bf405ef017d4ce0c49a867411319f3872cd3e147e9f86d80` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 12, one of 0, two of 7, two of ground 6) | map 32, square (10,2) facing west, column 0 row 5 |  |
| `tile:29:a05a72587b0444a51a0c9325b2f543a54692dbd50dc5ad23720a255920d1912d` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 31 over sky colour 12 | map 32, square (4,4) facing east, column 4 row 2 |  |
| `tile:29:a1c6a9e718e84de0714f72ccf2606e6bdd8a21d72f56408693c43040b926b734` | 8X8D8 block 20 tile 35 over 8X8D8 block 3 tile 1 | map 29, square (15,13) facing north, column 9 row 3 |  |
| `tile:29:a23a42aba91ddfbdafe830eaaf8c9f36b5abd7803618e5ea9079544779162de8` | 8X8D8 block 20 tile 67 over 8X8D8 block 3 tile 3 | map 32, square (7,6) facing north, column 8 row 4 |  |
| `tile:29:a3076af3dfe01eb8c1d7593ede29501e310ff4d60a4a5928f6b1418451b315fb` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 29, square (10,0) facing south, column 0 row 7 | `textile-waterfront-crossing-terrain-a3076af3dfe0.png` (area 2) |
| `tile:29:a48e5fb9c0327293d60ac96aaff71cdb3700ceb810193c54aabd656db7d93a3a` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 24 over sky colour 0 | map 32, square (5,12) facing east, column 0 row 3 |  |
| `tile:29:a49f445685c5a4513e0158aad771fbd3b0110996619698ccfc3d305f45bd4585` | 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 6 row 5 |  |
| `tile:29:a555098a1746f2491100c2ef31f830558aa24a5644bbfbf6e832772d10bdddc9` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 57 over sky colour 12 | map 32, square (2,4) facing north, column 9 row 4 |  |
| `tile:29:a5b6ffef6e57910d7b5520bbf65d7170da41e409ffa02d387ea951ac99eb57b7` | 8X8D8 block 20 tile 50 | map 29, square (7,7) facing north, column 0 row 9 |  |
| `tile:29:a6bfac95981290a626397a92ee4889e06fddc84eb50eecae279920455d1f6164` | 8X8D8 block 20 tile 31 over 8X8D8 block 3 tile 11 over sky colour 0 | map 29, square (15,13) facing north, column 10 row 2 |  |
| `tile:29:a717625d06d66f8e010e380f6067a48c6fefaa9b5d7acabe772420a0dd06ba68` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 56 over sky colour 0 | map 32, square (1,3) facing east, column 1 row 4 |  |
| `tile:29:a854ff9ef796345c7e4f0359c5355f4d0ae6ba58dc94f243a874ea998acbf9f4` | 8X8D8 block 20 tile 16 over sky colour 12 | map 32, square (13,1) facing west, column 10 row 2 |  |
| `tile:29:a872a29842be2973576c7479620d6e5dedc9d048288700af41df720a377b7313` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 29, square (6,0) facing east, column 3 row 7 | `lizard-yard-wet-ground-a872a29842be.png` (area 16) |
| `tile:29:a910fdc93847470014a74fc7f0706aafd9e63376a5e42f23309b0f197ffc3359` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 0 | map 29, square (1,0) facing north, column 8 row 3 |  |
| `tile:29:a97b5038536956755e3aabca323560a0f6e82bd315e46901355ef1aaa8fa1d06` | 8X8D8 block 20 tile 48 over 8X8D8 block 3 tile 61 | map 29, square (7,9) facing south, column 0 row 7 |  |
| `tile:29:abc56d429d4967bd45fc6b47cbd3af0917c3bccabe246ce264ca414a4c3192cd` | 8X8D8 block 20 tile 35 over 8X8D8 block 3 tile 7 | map 29, square (2,0) facing west, column 9 row 3 |  |
| `tile:29:abe3071db9f52765465d9d5556a79c161713ab3b3b60061ea661efbf67a15792` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 29, square (5,6) facing north, column 0 row 7 | `lizard-peat-edge-finish-abe3071db9f5.png` (area 16) |
| `tile:29:ad6322f6f1750cedcb3b3f1c46445069003960ae77decb7c693515a162da4081` | 8X8D8 block 20 tile 24 over sky colour 12 | map 32, square (12,1) facing east, column 3 row 3 |  |
| `tile:29:ad982a87e8bff0321f7736c1f4bcfa887383045db756560af100455a950bc475` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 30 over sky colour 12 | map 32, square (6,10) facing south, column 7 row 4 |  |
| `tile:29:b22a78339e06868aee8c9fd8304c11aeb3eefbb00ae8095f9b58ea274e67bd83` | 8X8D8 block 20 tile 57 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (1,2) facing east, column 6 row 4 |  |
| `tile:29:b2a97de09b528c8055cd9e30356c730cd422c7f2b131d3f78970ff305806122f` | 8X8D8 block 20 tile 31 over 8X8D8 block 3 tile 63 | map 29, square (1,0) facing south, column 10 row 2 |  |
| `tile:29:b48c3254fbd2945f2fbacab37d68567714df6aab1bd798c9ae741d6b562ed678` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (2,2) facing west, column 1 row 3 |  |
| `tile:29:b5f6d48925a42d197a6ca831e79d529fc1d3872301b712e117168cfee077ca61` | 8X8D8 block 20 tile 13 | map 29, square (7,7) facing north, column 4 row 5 |  |
| `tile:29:b6b344d4132862c8e8e562704fa0da122ec990474ed2dd75b59a102bb8329dd1` | 8X8D8 block 20 tile 24 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (2,2) facing west, column 3 row 3 |  |
| `tile:29:b7019c3642cddbbd3477e78b124126eb3960202c511513441aa6eccb82209de8` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 11 over sky colour 0 | map 32, square (2,2) facing west, column 1 row 4 |  |
| `tile:29:b90f60a387b439a31b0705f3112ad830e5c77db40db001ce2b46342efe3e348b` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 11 over 8X8D1 block 203 tile 17 over sky colour 0 | map 32, square (13,1) facing west, column 4 row 4 |  |
| `tile:29:ba2e5d3ad4e52fc042f3c61e9ccb4c9df559200fb5e659faff88db18a5d1e748` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 42 | map 29, square (14,11) facing south, column 2 row 7 | `lizard-sunken-wet-joins-ba2e5d3ad4e5.png` (area 2, 16) |
| `tile:29:badf4613c61154906f9d6502123a9c688ec1ef71fe3215099ff98f658af4e440` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 10 over sky colour 12 | map 32, square (2,2) facing west, column 3 row 4 |  |
| `tile:29:bb1cda8e1e21f8594cbcb96754219e143bda8794235fe3a31c7593a72862c89c` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (10,2) facing west, column 0 row 5 |  |
| `tile:29:bc4c4110b91ffdae055449584f46baf907b792d210c78756f73729465febc047` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 23 over sky colour 12 | map 32, square (7,4) facing east, column 7 row 3 |  |
| `tile:29:be767bd1d78217b03a048e4282c6a80df98c42502717d2323c15160819951816` | 8X8D8 block 20 tile 23 over sky colour 0 | map 32, square (1,2) facing east, column 7 row 3 |  |
| `tile:29:bec41b350e608150527fba42ac5264d1d359f2da365cff7266570593785df191` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 31 over sky colour 12 | map 32, square (9,8) facing east, column 6 row 4 |  |
| `tile:29:bee809b56d6628ed8036809805b77e196e08d1f351ea3b4b195a008424cd04d0` | 8X8D8 block 20 tile 17 over 8X8D8 block 3 tile 1 | map 32, square (3,3) facing south, column 0 row 2 |  |
| `tile:29:c07b3020f22d8b7987d8b6ab21acf7e053cfbfc11251ad1772e2d6a97fce0aa0` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 56 over sky colour 12 | map 32, square (1,4) facing south, column 4 row 4 |  |
| `tile:29:c08b2bc48434f4fe1be371613a88e32cddb74ca0f766c8302d2b6a6a84226b7b` | 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 10 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,4) facing north, column 6 row 4 |  |
| `tile:29:c0a5f6097d2de5c4e6a0f8bde4c0e5508d827f1a86286311f5af541dd9043a81` | 8X8D8 block 20 tile 12 | map 29, square (7,7) facing north, column 7 row 8 |  |
| `tile:29:c0d1222e5b597764fcb488b98e61859ae949e50fc7f279803431e79bcd359349` | 8X8D8 block 20 tile 5 | map 29, square (7,7) facing north, column 2 row 8 |  |
| `tile:29:c12349443e4d925340d3efa67b95bfb6caf0420305530e49ade9be09a5c741e5` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 32 over sky colour 0 | map 29, square (14,12) facing south, column 0 row 3 |  |
| `tile:29:c1a91ac2d36d5a0a0788b2fd4d9627f9d2c2fd7e0da217c748a6ee296aa31e52` | 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (7,0) facing west, column 3 row 5 |  |
| `tile:29:c2f6f70d8c6e82b19de019862c6ee6086b1102dda01e9102d1e087bbd45ef036` | 8X8D8 block 20 tile 59 over 8X8D1 block 203 tile 12 | map 32, square (1,2) facing east, column 6 row 5 | `textile-house-c2f6f70d8c6e.png` (area 2) |
| `tile:29:c30dd6b0bf03e39b5f77912323f11b8a0feeabad6b2520731268a3c764c63db6` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 30 over sky colour 0 | map 32, square (9,7) facing south, column 0 row 4 |  |
| `tile:29:c3c768e3d3e55611bbe20055f053447de45ce592650b22b9a73fa57a90b45c7f` | 8X8D8 block 20 tile 38 over 8X8D8 block 20 tile 38 over the ground colour 6 | map 29, square (7,7) facing north, column 4 row 8 |  |
| `tile:29:c48357dbb702583a2ae9dc14f11c46b9ca111229424bfcbec2738ecb9bc14868` | 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 31 | map 29, square (13,10) facing east, column 10 row 6 | `lizard-north-canal-terrain-c48357dbb702.png` (area 16) |
| `tile:29:c4c1d430ecb4acbb66cd3778b676e06c7280be51bfefcd89b52b785777be7af0` | 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 19 over the ground colour 6 | map 29, square (10,0) facing south, column 10 row 7 | `lizard-bank-arch-terrain-c4c1d430ecb4.png` (area 16) |
| `tile:29:c561330cede75a1a2e83e6843a63513476635ebbaf9502498ffdd526426e1bfb` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 29 | map 29, square (6,0) facing east, column 2 row 7 | `lizard-southwest-trail-terrain-c561330cede7.png` (area 16) |
| `tile:29:c5617d4d357ad1f0e058f8597a57717854426044167427ca0a60722b38bc8ec8` | 8X8D8 block 20 tile 66 over sky colour 12 | map 32, square (12,1) facing east, column 2 row 4 |  |
| `tile:29:c57fa254edff52f7dba8fce7631c9614d48f8822681d90b47a23ab76061abb0d` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 36 over 8X8D8 block 20 tile 36 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (6,0) facing west, column 5 row 5 |  |
| `tile:29:c5d63e97e9c633c2a409a95884d641ca9a77cc9655f8ad293a6ec2881f47a2a4` | 8X8D8 block 20 tile 7 over 8X8D8 block 3 tile 6 | map 32, square (3,3) facing south, column 1 row 2 |  |
| `tile:29:c6467a1736fd1bab42d5125873b26d281e86129466f9990a182d1dcdffa4699e` | 8X8D8 block 20 tile 22 | map 32, square (9,2) facing south, column 3 row 6 |  |
| `tile:29:c6557bfa1f80b3409ca3987d39eaa84b3838ce86fd620e6899261eb3380d137d` | 8X8D8 block 20 tile 66 over 8X8D8 block 3 tile 3 | map 32, square (9,4) facing west, column 2 row 4 |  |
| `tile:29:c7005eab1330b6c651e56e40dc762f0bad3af114b144285f4876d4771d520ada` | 8X8D8 block 20 tile 8 over 8X8D8 block 3 tile 7 | map 32, square (12,1) facing south, column 9 row 2 |  |
| `tile:29:c754ecd6d675a29009c685d58c423903f09836d2f3b78f1747d411e3f1aab7e6` | 8X8D8 block 20 tile 47 over 8X8D1 block 203 tile 28 | map 32, square (5,8) facing west, column 10 row 7 |  |
| `tile:29:c7d9e82e4a595fd0013d5c62746a8015b7d056764c11f6720e81cb24ff477ab3` | 8X8D8 block 20 tile 31 over 8X8D8 block 3 tile 1 | map 29, square (2,0) facing west, column 10 row 2 |  |
| `tile:29:c86c2f9c0f394ac03d4ceba05e93db35b41f460a2ac11cd89364fec66c9f558c` | 8X8D8 block 20 tile 44 over 8X8D8 block 3 tile 7 | map 32, square (9,2) facing south, column 7 row 6 |  |
| `tile:29:cb3a6c7c6c4cb366e1ee925aef5721300028e5322f7d21e6919ff29a7bc2b209` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 57 over sky colour 12 | map 32, square (3,3) facing west, column 9 row 4 |  |
| `tile:29:cbed94335d2ad5da5d203820875d3e48f0f6b3d736c34051f7033d961b87ae71` | 8X8D8 block 20 tile 31 over 8X8D8 block 1 tile 23 over sky colour 0 | map 29, square (4,0) facing west, column 10 row 2 | `graveyard-slate-court-joins-cbed94335d2a.png` (area 10) |
| `tile:29:cc0f7c32f9ca29c44d35e913a30a5b8cd57d1041c9423df50cede5da55d39d4c` | 8X8D8 block 20 tile 21 over 8X8D8 block 20 tile 21 over 8X8D8 block 20 tile 60 over 8X8D8 block 20 tile 60 over sky colour 12 | map 32, square (1,4) facing north, column 5 row 4 |  |
| `tile:29:cde534e165552fb757b793d73579855a8ffaaccb6edf51c997994b33b8a0c5fb` | 8X8D8 block 20 tile 8 over sky colour 0 | map 29, square (7,7) facing north, column 9 row 2 |  |
| `tile:29:ce25a9c39a348d82a5f14a40bf0699ab8813b604110c184c7220991d422e6c4d` | 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 6) | map 29, square (7,0) facing west, column 3 row 5 |  |
| `tile:29:ce4a8247bf5f3caaa79f243cef28d7e02ddc1f64f1db94acad15d17a9a5eadcc` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 56 over sky colour 0 | map 32, square (9,2) facing south, column 1 row 4 |  |
| `tile:29:ce9db1b6a6db8cc088fe1b478d351ecec5d7c4259f25a2b01c7a4bdcd67cde81` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 1 tile 42 | map 29, square (4,6) facing north, column 2 row 7 |  |
| `tile:29:cf76eff4d1b711f15ab399d121c95d79d744ae5faff7e01e179dcee3fbd37e1e` | 8X8D8 block 20 tile 8 over sky colour 12 | map 32, square (13,1) facing west, column 9 row 2 |  |
| `tile:29:d13c5be172742ad8773137baf667e5a466f482e7744f4c5c619c8425fd62b49c` | 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 56 over sky colour 0 | map 32, square (1,4) facing south, column 4 row 4 |  |
| `tile:29:d1704892ec24a9c18126ab7be9de26265a48eb07638299793d633e579d347e0c` | 8X8D8 block 20 tile 62 over sky colour 12 | map 32, square (12,1) facing south, column 10 row 0 |  |
| `tile:29:d5aea039c3f75e8f6b8ed6ae9f50ba1c42446984ced9dd1e57af37c11b518a16` | 8X8D8 block 20 tile 10 over sky colour 12 | map 32, square (12,1) facing east, column 9 row 4 |  |
| `tile:29:d61d49525a8585758b1f46bf92a9ae61b9b30b2d2e40ac4c0950f6ec88e0c607` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 57 over sky colour 0 | map 32, square (3,3) facing west, column 9 row 4 |  |
| `tile:29:d64cf1ee54addc82b60594dd8bee0a648df6ab31bf04e05df3ff3f4a10736650` | 8X8D8 block 20 tile 7 over sky colour 12 | map 32, square (12,1) facing north, column 1 row 2 |  |
| `tile:29:d680d61320b633d6faa6843b3e3184c24758b97cff8bb4a849eff963bcecd64a` | 8X8D8 block 20 tile 53 over 8X8D8 block 20 tile 64 over sky colour 12 | map 32, square (9,2) facing east, column 10 row 3 |  |
| `tile:29:d6e256d845e3131fb474250454f2ad9467c69501bf5ab9af27d6e09027aef4bd` | 8X8D8 block 20 tile 48 over 8X8D8 block 3 tile 0 | map 32, square (11,2) facing east, column 0 row 7 |  |
| `tile:29:d77c6e6968fa390d455240475731eedef5975d6242bec93649ea27c55bff3634` | 8X8D8 block 20 tile 17 over sky colour 12 | map 32, square (12,1) facing north, column 0 row 2 |  |
| `tile:29:d8e0e4bacf03b730d651ef921233b70f1869e2114906f756e331dca12e07d827` | 8X8D8 block 20 tile 18 over 8X8D8 block 20 tile 18 over sky colour 0 | map 29, square (7,7) facing north, column 5 row 3 |  |
| `tile:29:d9c37775a2a9cf978af0b2381c257cc88151e80d3e356c759629810a582ecff1` | 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (12,1) facing east, column 9 row 3 |  |
| `tile:29:dc3288b1048f533e6dc4f8279fbf2df0efe6ebe94ab15491dbe5c3948037e4dc` | 8X8D8 block 20 tile 31 over 8X8D1 block 203 tile 17 over 8X8D8 block 20 tile 63 over sky colour 12 | map 32, square (5,4) facing north, column 0 row 3 |  |
| `tile:29:dd7d6f38693fdbf7d5dc68fea46b053d89074ff71630d10eef246193d6db1751` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 13 | map 29, square (15,12) facing east, column 0 row 7 |  |
| `tile:29:de259a79b6bfbf6c9f7a4ca334e7f3d71969cfdfbcd42af717643fa100c8fe6f` | 8X8D8 block 20 tile 14 | map 29, square (7,7) facing north, column 6 row 5 |  |
| `tile:29:df6b40952b1fe3601193bb8a6e275979fa8f45bc28bd750fc8340f9dd0805610` | 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 35 over 8X8D8 block 20 tile 68 over 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (5,12) facing north, column 8 row 3 |  |
| `tile:29:e29490ac941b4d4b302d1251ac1d2b36e753a29bcbb064ab85fe0e3f490675ce` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 22 over the ground colour 6 | map 29, square (10,4) facing south, column 3 row 7 | `lizard-sunken-wet-joins-e29490ac941b.png` (area 2, 16) |
| `tile:29:e3541529c16786acf6d02a583d3e6a1c163588b27b1474d2389c800492f9076a` | 8X8D8 block 20 tile 66 over 8X8D1 block 203 tile 16 over sky colour 0 | map 29, square (7,7) facing south, column 9 row 4 |  |
| `tile:29:e3ec967bf422838600b1a73de952297e86799c91833e861c3891ec06b4006fbd` | 8X8D8 block 20 tile 26 over 8X8D1 block 203 tile 28 | map 32, square (11,11) facing west, column 0 row 6 | `graveyard-slate-court-joins-e3ec967bf422.png` (area 10) |
| `tile:29:e514ae0d8359a593e090a4f1b8b9fa162ad420b3988f1284c800026a60130e20` | 8X8D8 block 20 tile 59 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (10,2) facing east, column 6 row 5 |  |
| `tile:29:e664c44470757c556c2b11057b464144fec6f6bc132589719187c53944823ec0` | 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 13 over sky colour 0 | map 29, square (3,0) facing east, column 0 row 2 |  |
| `tile:29:e7f9f472d3f4c22c14e442ab62831eef6c51dc5c73956661a370d9bd19f3df3a` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (10,8) facing north, column 9 row 3 |  |
| `tile:29:e8034ce759767aaf564bbb956084e77ad7e76b4fd2a791660ae24fb06b892f08` | 8X8D8 block 20 tile 31 over 8X8D8 block 20 tile 63 over sky colour 0 | map 32, square (8,9) facing north, column 0 row 3 |  |
| `tile:29:e80f8a70551bc34ac98c63e8a546a14743151dafa663bcba5756878dba1cd0a1` | 8X8D8 block 20 tile 66 over 8X8D8 block 3 tile 6 | map 32, square (9,2) facing south, column 9 row 4 |  |
| `tile:29:e919d2131daf99864470695a9c26a98600b77a528171790fcc51191926defd18` | 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 12, one of 15, two of 7, two of ground 6) | map 32, square (9,2) facing south, column 5 row 5 |  |
| `tile:29:ea09f7f82687b5e64dd022ad7a2d7c63d1fee6bb992a111a02455e03ef01db2f` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (9,6) facing east, column 2 row 3 |  |
| `tile:29:ea54ed4a4811fe44d1088c51e4defbfbe7d18acd881c64360e3d89b41b6bb90c` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 65 over sky colour 0 | map 32, square (9,6) facing east, column 2 row 3 |  |
| `tile:29:eb4228e3071e57c6ed7e314f7826c4e027658ff46e4a42d673e37bda2b1a8c15` | 8X8D8 block 20 tile 68 over sky colour 12 | map 32, square (1,2) facing east, column 8 row 3 |  |
| `tile:29:ec5a8eea8c76a0a3e9947d9e94fcf3dbe81d1cbf4a2c383d63a3e07d3d92fce5` | 8X8D8 block 20 tile 9 over sky colour 12 | map 32, square (12,1) facing north, column 10 row 2 |  |
| `tile:29:ecee491629a117a39c275c847bb5ac9f43b0561c51365351cf25daf54ca120dc` | 8X8D8 block 20 tile 68 over 8X8D8 block 20 tile 65 over sky colour 12 | map 32, square (2,2) facing east, column 8 row 3 |  |
| `tile:29:edc41e067d84be24e781a3304eae48c29bee142e003664474d8c9fd7c95ea8af` | 8X8D8 block 20 tile 56 over sky colour 12 | map 32, square (9,2) facing south, column 4 row 4 |  |
| `tile:29:edd2ff9c5ae72286d9e5231d7fe206132d66e2659758e7001eb1b597edb40535` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 3 tile 19 | map 29, square (10,4) facing south, column 2 row 7 |  |
| `tile:29:ef13118bc9d3fb5aa2528b03b9fd337dd7e838671901463902f6c2b074ab64af` | 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 1 | map 29, square (1,0) facing east, column 0 row 2 |  |
| `tile:29:efad43a6471e6bf15d598f1c62649d186d2c4e619a2a7f5549836cddf2053a1e` | 8X8D8 block 20 tile 33 over 8X8D1 block 203 tile 12 | map 29, square (1,0) facing north, column 1 row 2 |  |
| `tile:29:f075bbdd385d303d03fc5f888387512992290f844954ebb576261499f7a2ada0` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 60 over sky colour 0 | map 32, square (5,8) facing south, column 3 row 4 |  |
| `tile:29:f346615767ee53b703441e6ae5db80a4ecfcb9aa5594725863c2ef999ac8cc3a` | 8X8D8 block 20 tile 67 over 8X8D8 block 20 tile 30 over 8X8D8 block 20 tile 56 over sky colour 0 | map 32, square (9,4) facing south, column 1 row 4 |  |
| `tile:29:f43b69796604d23793b01dcea2adad7b1dbea0472b7a0f2f1426599c6a2bf934` | 8X8D8 block 20 tile 29 | map 29, square (7,7) facing north, column 3 row 8 |  |
| `tile:29:f4dbbd5d4a9f8c88b671844358989ab97d2f9265246529aba0288a76dea01aa2` | 8X8D8 block 20 tile 23 over 8X8D8 block 20 tile 64 over sky colour 0 | map 32, square (2,2) facing east, column 7 row 3 |  |
| `tile:29:f55efcfb82c8a2d442899a96985aefd0f1548082791b8a6f6a92dbed77ddca67` | 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 29, square (7,0) facing west, column 2 row 5 |  |
| `tile:29:f62928cef75b959028988aeae8589c0e1ad0dba0d33e3e6be9436221a60d8618` | 8X8D8 block 20 tile 46 over 8X8D1 block 203 tile 28 | map 32, square (7,5) facing north, column 8 row 5 |  |
| `tile:29:f70ffaf1d058455ba2de5410499d275d86f61a1a352622078f2967c78d3e01d1` | 8X8D8 block 20 tile 32 over 8X8D8 block 20 tile 24 over sky colour 0 | map 32, square (7,5) facing east, column 0 row 3 |  |
| `tile:29:f73fcebc8af1d14ad678ae13dd2e231647d83e8fe8c48b0f9b807daa19cf2c33` | 8X8D8 block 20 tile 66 over 8X8D8 block 20 tile 11 over sky colour 12 | map 32, square (2,2) facing east, column 7 row 4 |  |
| `tile:29:f80d35cb7b28610e4161e9d789fab4bde9a790b087e329ead41b94bea879ab35` | 8X8D8 block 20 tile 32 over 8X8D8 block 3 tile 6 | map 29, square (2,0) facing east, column 3 row 4 |  |
| `tile:29:f996177d0192b66df430ebfdd86542a258b9fa7b5ad2b546d940b32f10b22ea5` | 8X8D8 block 20 tile 17 over 8X8D8 block 20 tile 9 over sky colour 12 | map 32, square (1,2) facing west, column 0 row 2 |  |
| `tile:29:fa3cc84455d6b49523f29597c1210680c6884f29f14c6867f69d4c7ac8670289` | 8X8D8 block 20 tile 11 over 8X8D8 block 20 tile 11 over 8X8D1 block 203 tile 17 over sky colour 12 | map 32, square (13,1) facing west, column 4 row 4 |  |
| `tile:29:fb9d3f9b9feb796f615548b40c728b02b724013b533c77a8ae143f439223b657` | 8X8D8 block 20 tile 16 over 8X8D8 block 3 tile 1 | map 32, square (12,1) facing south, column 10 row 2 |  |
| `tile:29:fc43a6b17f8fd54ab519d7d463348eb9262447a1a7dca7d6be64a776c5ecca8f` | 8X8D8 block 20 tile 35 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 29, square (5,0) facing south, column 2 row 5 |  |
| `tile:29:feeeb2c71b0529f5a717d467c4af355712b6934a9a77879c18f7f8c41cd67237` | 8X8D8 block 20 tile 3 | map 32, square (9,2) facing south, column 2 row 6 |  |

### Area 31: Temple of Bane, interior (14)

Map 31; WALLDEF1 block 1 (tiles 8X8D1 block 1), block 3 (tiles 8X8D1 block 3), block 5 (tiles 8X8D1 block 5).

#### tile set 8X8D1 block 3 (14)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:31:0fe98ad9cca711b154fa54acc26ca865f6582a794910079509e512f212a9fdb8` | 8X8D1 block 3 tile 30 | map 31, square (14,4) facing north, column 8 row 8 | `new-phlan-harbor-paving-joins-0-0fe98ad9cca7.png` (area 0, 2, 18, 24) |
| `tile:31:15be260fd378f5b33c7dc10af0e7565eaa2221596debd496a87de8b4c13f9f35` | 8X8D1 block 3 tile 42 | map 31, square (14,4) facing north, column 8 row 6 | `new-phlan-harbor-paving-joins-0-15be260fd378.png` (area 0, 2, 18, 24) |
| `tile:31:190ac6332cc824f04f3d89592b0c0ce3ee634aaa2bb2983cad5c020189b58d16` | 8X8D1 block 3 tile 43 | map 31, square (14,2) facing south, column 2 row 6 | `new-phlan-harbor-paving-joins-0-190ac6332cc8.png` (area 0, 2, 18, 24, 29) |
| `tile:31:3a345c508ec6aeaebd3f6c8ba2645d88c94984c3198f6c0f3fc9a82fa521c3d0` | 8X8D1 block 3 tile 64 | map 31, square (4,10) facing west, column 1 row 5 | `kuto-earth-perimeter-joins-3a345c508ec6.png` (area 0, 2, 18, 24, 29) |
| `tile:31:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D1 block 3 tile 40 | map 31, square (14,2) facing south, column 2 row 8 | `kuto-earth-perimeter-joins-4c23fe508a44.png` (area 2, 18, 29) |
| `tile:31:69b37e4229250c117e87ecaea0d3f1c278197c5591b9678919a1ab2f71d07b35` | 8X8D1 block 3 tile 62 | map 31, square (13,4) facing north, column 10 row 7 | `bane-rampart-paving-69b37e422925.png` (area 2, 18, 24) |
| `tile:31:6c7ec11bfc006585332f2495cbe7d713d38a049d7b8374177334f0c5c0af5f1d` | 8X8D1 block 3 tile 32 | map 31, square (5,0) facing south, column 1 row 6 | `kuto-earth-chamber-joins-6c7ec11bfc00.png` (area 2, 18, 29) |
| `tile:31:86ba657c5e38ad07f30066dd1c810ad2552c5383b57c9ddd71c56c2dd5302d1e` | 8X8D1 block 3 tile 33 | map 31, square (14,2) facing south, column 2 row 5 | `new-phlan-harbor-paving-joins-0-86ba657c5e38.png` (area 0, 2, 18, 24, 29) |
| `tile:31:8cf3cea60a07a9d7bfe51b29ce5252f640c3bf3caeee2d2301c670f21fc55803` | 8X8D1 block 3 tile 27 over the ground colour 6 | map 31, square (0,11) facing east, column 6 row 6 | `kuto-earth-perimeter-joins-8cf3cea60a07.png` (area 0, 2, 18, 24, 29) |
| `tile:31:a42700fea5fc42908d4fdccd8ba4656d4e4ec432332f2b74ac7d672e8c11ecf5` | 8X8D1 block 3 tile 61 | map 31, square (13,2) facing south, column 0 row 7 | `bane-rampart-paving-a42700fea5fc.png` (area 2, 18, 24, 29) |
| `tile:31:c2b9b89fe07262973e1608f442f5e0ffd943f878b4a31642f0e6a52848a0c44d` | 8X8D1 block 3 tile 67 | map 31, square (13,2) facing south, column 0 row 6 | `bane-ivy-loop-terrain-c2b9b89fe072.png` (area 2, 18, 24, 29) |
| `tile:31:e3922047e12c2260eaef5a4f40f4426f51c95b755440c710331492e05e3c951a` | 8X8D1 block 3 tile 28 over the ground colour 6 | map 31, square (4,10) facing west, column 1 row 6 | `kuto-earth-perimeter-joins-e3922047e12c.png` (area 2, 18, 24, 29) |
| `tile:31:e72913a89f9d3daef62dc19e63acc5d329e89789dbe44e1e0e3099927e06f034` | 8X8D1 block 3 tile 34 | map 31, square (13,2) facing south, column 0 row 5 | `new-phlan-proclamation-walk-terrain-e72913a89f9d.png` (area 0, 2, 18, 24, 29) |
| `tile:31:f2213dcb1a2ac31b69195cb160ff6cd402c4206ed29291cc2b3411026c07dba6` | 8X8D1 block 3 tile 66 | map 31, square (14,4) facing north, column 8 row 7 | `bane-eastern-rampart-terrain-f2213dcb1a2a.png` (area 2, 18, 24) |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 4060 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 152 |
| first-person cells of an area whose reading is not confirmed | 1545 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 720 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 72 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Areas not confirmed, and why:

- Area 3 (Valjevo Castle): 7 of the 81 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 5 (Valjevo Castle): 59 of the 110 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 7 (Valjevo Castle, the Pool): 58 of the 131 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 15 (Mendor's Library): 15 of the 185 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 18 (Podol Plaza): 5 of the 194 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 20 (The Slums): 1 of the 188 cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete.
- Area 25 (Wilderness, west): only 0 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.
- Area 27 (Wilderness, east): only 19 cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against.

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
| 8X8D8 block 17 | 13, 22, 23, 24, 26, 38, 66, 68, 69 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 11 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 38 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 20 | 25 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 23 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 23 | 41 | no symbol of the wall definitions loaded with its block names it |

## Narrated passages with nothing to see

Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.
