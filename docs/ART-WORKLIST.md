# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 851 confirmed cells awaiting art now.**

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
| Remaining, all kinds | 851 |
| First-person cells to do | 851 |
|   of which one stored tile | 172 |
|   of which one tile over a solid colour | 143 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 536 |
|   of which the same pixels already have art of yours in another area | 370 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 5989 |
|   accounted for by the tool | 5848 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2450 |
|   without (the catalogue's 720 when it was written) | 557 |
|     of those, no map can show | 426 |
|     of those, shown only together with other tiles, never alone | 6 |
|     of those, shown alone in some area | 125 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 308 | 0 | 321 of 321 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 385 | 131 | 50 | 134 of 134 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 580 | 382 | 0 | 406 of 406 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | not yet | 300 | 100 |  | 102 of 117 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 320 | 76 | 46 | 84 of 84 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | not yet | 393 | 91 |  | 114 of 176 (17 as first views of the next area, 6 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 310 | 76 | 88 | 82 of 82 (6 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | not yet | 269 | 64 |  | 104 of 162 (40 as first views of the next area) |
| 8 | Phlan City Hall | yes | 405 | 163 | 129 | 173 of 173 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 287 | 150 | 0 | 150 of 150 |
| 10 | Valhingen Graveyard | yes | 2452 | 890 | 0 | 902 of 902 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 405 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 313 | 147 | 64 | 149 of 149 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 150 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 436 | 185 | 118 | 205 of 205 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 856 | 221 | 166 | 235 of 235 (14 as WebGL wall materials) |
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

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares that may be out of reach.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 1: Buccaneer Base (50)

Map 1; WALLDEF6 block 2 (tiles 8X8D6 block 2), block 6 (tiles 8X8D6 block 6), block 6 (tiles 8X8D6 block 6).

#### tile set 8X8D6 block 2 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:1:f1e2c51783bc6780ddd30046cd7aa52da55967ca8bf567fe37eb1ea849c93ee6` | 8X8D6 block 2 tile 58 over 8X8D6 block 6 tile 2 over sky colour 11 | map 1, square (5,0) facing north, column 9 row 1 |  |

#### tile set 8X8D6 block 6 (49)

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
| `tile:1:28612dd48ec57d4365251acbdb808a2a92a9c48ffd24c8238aa33f484263801e` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 2 over sky colour 11 | map 1, square (14,6) facing east, column 0 row 3 |  |
| `tile:1:2e90898843be94884471f0d403caaacc6f0b7f74233f3b5a341a716a9ffe2c50` | 8X8D6 block 6 tile 12 over 8X8D6 block 6 tile 17 | map 1, square (14,6) facing east, column 0 row 6 |  |
| `tile:1:328f750df6630171a8075d9384cd889bf14996a15e680bc3f4073b4007830500` | 8X8D6 block 6 tile 35 over 8X8D6 block 6 tile 2 over sky colour 0 | map 1, square (14,6) facing east, column 0 row 3 |  |
| `tile:1:37b8c2ea5534c9b942d661ac3ba124b342bdd216670a1578b3b0c35a9b310317` | 8X8D6 block 6 tile 33 over 8X8D6 block 6 tile 52 | map 1, square (13,6) facing north, column 9 row 6 |  |
| `tile:1:3f14e8112ed32268e4cb3afce9cf634387b6ab791ad0068e34d7f82b9683e1d1` | 8X8D6 block 6 tile 34 over 8X8D6 block 2 tile 57 over sky colour 11 | map 1, square (12,6) facing north, column 1 row 4 |  |
| `tile:1:4cce08e2dfc37e720329a47c243471f38acd2386091c3b60bdebd20a74b85921` | 8X8D6 block 6 tile 34 over 8X8D6 block 6 tile 14 over sky colour 11 | map 1, square (13,6) facing east, column 1 row 4 |  |
| `tile:1:4f4776b4f8c8421342f9ca62a3a78b24cf90607c32d8c09d9af9f6b02ad0aa84` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 16 | map 1, square (14,6) facing north, column 10 row 4 |  |
| `tile:1:52a36258e26381b8b7a8dffa40e2f989b565a2a2a68af94c5975a280b2c9fdb9` | 8X8D6 block 6 tile 36 over 8X8D6 block 6 tile 2 over 8X8D6 block 6 tile 7 over sky colour 11 | map 1, square (14,6) facing north, column 10 row 3 |  |
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

### Area 4: Valjevo Castle (46)

Map 4; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### shared tile set 8X8D1 block 203 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:4:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 4, square (0,10) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 9, 11, 14, 15, 18, 20, 21, 22, 23, 29) |
| `tile:4:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 4, square (0,3) facing west, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:4:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 4, square (0,10) facing south, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 4, square (8,4) facing east, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 11, 13, 15, 16, 18, 20, 21, 24, 29) |
| `tile:4:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 4, square (0,3) facing west, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:4:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 4, square (0,5) facing north, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 11, 14, 15, 20, 21, 22, 23, 29) |

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
| `tile:4:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 4, square (0,6) facing north, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 4, square (0,5) facing north, column 3 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D5 block 1 tile 54 | map 4, square (0,10) facing south, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:4:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D5 block 1 tile 53 | map 4, square (0,10) facing south, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 4, square (0,5) facing north, column 3 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:4:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 4, square (0,9) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |

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
| `tile:6:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 6, square (5,0) facing west, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 9, 11, 14, 15, 18, 20, 21, 22, 23, 29) |
| `tile:6:195e9b93e8621946683a00161346595e0fa7b31ddbbf27fb0214ea3bfbe5c4dc` | 8X8D1 block 203 tile 40 | map 6, square (1,2) facing south, column 0 row 7 | `route-195e9b93e862.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 6, square (3,0) facing north, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:6:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 6, square (5,0) facing west, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 6, square (0,0) facing south, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 21, 23, 24, 28, 29, 31) |
| `tile:6:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 6, square (7,10) facing west, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 11, 13, 15, 16, 18, 20, 21, 24, 29) |
| `tile:6:8737539068992377d622a86a6ab259387e19fc5a846d63a4b75effc2a06fae8c` | 8X8D1 block 203 tile 11 | map 6, square (0,1) facing east, column 8 row 6 | `new-phlan-harbor-paving-joins-0-873753906899.png` (area 0, 2, 4, 5, 9, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 6, square (3,0) facing north, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 5, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:6:a54a22cfabadf3d87a0d29821dac782c1f6ff842af8e41be65b4578a712c5485` | 8X8D1 block 203 tile 20 over the ground colour 6 | map 6, square (1,1) facing south, column 2 row 8 | `new-phlan-training-paving-0-a54a22cfabad.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:b99063b51996f32692877bfb0938e2ddee836bfd65b398cfad050106b7120d17` | 8X8D1 block 203 tile 24 over the ground colour 6 | map 6, square (1,2) facing south, column 0 row 10 | `route-b99063b51996.png` (area 0, 1, 2, 3, 4, 5, 7, 8, 9, 11, 13, 14, 15, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 6, square (10,0) facing east, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 6, square (10,0) facing east, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
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
| `tile:6:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D5 block 1 tile 56 | map 6, square (9,0) facing east, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D5 block 1 tile 55 | map 6, square (5,0) facing west, column 8 row 4 | `route-23ade1020185.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D5 block 1 tile 54 | map 6, square (5,0) facing west, column 7 row 4 | `route-3df247a59ff1.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:6:41ea3ceae0f6da8a29151985f9d6f70572dbd7d9e81b672fe759802e75a7d115` | 8X8D5 block 1 tile 50 | map 6, square (0,1) facing south, column 0 row 6 | `room-tile-09.png` (area 0, 2, 4, 5, 9, 14, 20, 21, 23, 24, 28, 29, 31) |
| `tile:6:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D5 block 1 tile 9 | map 6, square (3,1) facing north, column 6 row 6 | `kuto-earth-chamber-joins-4fa7efe3e4e5.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D5 block 1 tile 21 | map 6, square (9,0) facing east, column 4 row 5 | `bane-side-galleries-terrain-54cfe77b0fa0.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D5 block 1 tile 11 | map 6, square (3,1) facing north, column 5 row 5 | `kuto-earth-chamber-joins-7870e9a9d014.png` (area 2, 4, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:6:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D5 block 1 tile 53 | map 6, square (5,0) facing west, column 7 row 5 | `route-85b030277ef7.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D5 block 1 tile 52 | map 6, square (5,0) facing west, column 8 row 5 | `route-ca1a1292cdd4.png` (area 0, 2, 8, 9, 10, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:6:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D5 block 1 tile 57 | map 6, square (13,0) facing west, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
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

### Area 8: Phlan City Hall (129)

Map 0; WALLDEF3 block 0 (tiles 8X8D3 block 101), block 0 set 2 (tiles 8X8D3 block 102), block 0 set 3 (tiles 8X8D3 block 103).

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 0, square (13,0) facing south, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 9, 11, 14, 15, 18, 20, 21, 22, 23, 29) |
| `tile:8:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 0, square (13,0) facing south, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:8:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 0, square (2,1) facing east, column 5 row 6 | `orc-door-936214d6ecd8.png` (area 0, 2, 5, 7, 10, 11, 13, 15, 16, 18, 20, 21, 24, 29) |
| `tile:8:7a62f42874a318807e50c5f76958ec89a88041ebcdbe85f63c86b39a4adb37d7` | 8X8D1 block 203 tile 34 over the ground colour 6 | map 0, square (3,1) facing west, column 6 row 6 | `orc-door-b39a4adb37d7.png` (area 0, 2, 3, 4, 5, 6, 7, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
| `tile:8:8737539068992377d622a86a6ab259387e19fc5a846d63a4b75effc2a06fae8c` | 8X8D1 block 203 tile 11 | map 0, square (0,3) facing south, column 2 row 6 | `new-phlan-harbor-paving-joins-0-873753906899.png` (area 0, 2, 4, 5, 9, 11, 14, 15, 18, 20, 21, 23, 24, 28, 29, 31) |

#### tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:daa0c6008046802d652f2f0fe732ebf6d5e55819c0757e8ca57e8bbeeb8294f7` | 8X8D1 block 203 tile 16 over 8X8D3 block 103 tile 6 over sky colour 12 | map 0, square (5,5) facing west, column 9 row 1 | `new-phlan-street-paving-joins-0-daa0c6008046.png` (area 0, 11) |

#### tile set 8X8D3 block 101 (17)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0fe98ad9cca711b154fa54acc26ca865f6582a794910079509e512f212a9fdb8` | 8X8D3 block 101 tile 30 | map 0, square (0,4) facing east, column 8 row 8 | `bane-rampart-paving-0fe98ad9cca7.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:15be260fd378f5b33c7dc10af0e7565eaa2221596debd496a87de8b4c13f9f35` | 8X8D3 block 101 tile 42 | map 0, square (2,3) facing west, column 0 row 6 | `bane-eastern-rampart-terrain-15be260fd378.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:1874c3b1e2b448afb22da579328fd9e473773e33baa85d7be3278cb2a99f19ec` | 8X8D3 block 101 tile 57 | map 0, square (13,0) facing south, column 7 row 4 | `phlan-fallback-0-1874c3b1e2b4.png` (area 0, 11) |
| `tile:8:190ac6332cc824f04f3d89592b0c0ce3ee634aaa2bb2983cad5c020189b58d16` | 8X8D3 block 101 tile 43 | map 0, square (0,3) facing east, column 10 row 6 | `bane-eastern-rampart-terrain-190ac6332cc8.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:3a345c508ec6aeaebd3f6c8ba2645d88c94984c3198f6c0f3fc9a82fa521c3d0` | 8X8D3 block 101 tile 64 | map 0, square (3,2) facing south, column 9 row 5 | `bane-south-colonnade-terrain-3a345c508ec6.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:40f1718d713d46dca3003667aa994c80ec701106dd1409d7fcad319327920a8b` | 8X8D3 block 101 tile 60 | map 0, square (0,2) facing south, column 6 row 5 | `phlan-fallback-0-40f1718d713d.png` (area 0, 11) |
| `tile:8:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D3 block 101 tile 40 | map 0, square (2,4) facing west, column 2 row 8 | `kuto-earth-perimeter-joins-4c23fe508a44.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:5b720a6a4fb8f83e4418b0f0f966a810b4590d0afca70948ce8f8a9253443abe` | 8X8D3 block 101 tile 14 | map 0, square (3,4) facing west, column 6 row 6 | `new-phlan-street-paving-joins-0-5b720a6a4fb8.png` (area 0, 11, 18, 21, 24) |
| `tile:8:688fefc217b332ae28481ccb2d038a8cc8c94a47133c9723ff2a47aebb810f0e` | 8X8D3 block 101 tile 58 | map 0, square (13,0) facing south, column 8 row 4 | `phlan-fallback-0-688fefc217b3.png` (area 0, 11) |
| `tile:8:79df1b8dae4f018af68d2bef802287f963249fa4f88521118c93285a05193515` | 8X8D3 block 101 tile 62 over sky colour 11 | map 0, square (3,4) facing west, column 6 row 4 | `new-phlan-south-market-terrain-0-79df1b8dae4f.png` (area 0, 11) |
| `tile:8:86ba657c5e38ad07f30066dd1c810ad2552c5383b57c9ddd71c56c2dd5302d1e` | 8X8D3 block 101 tile 33 | map 0, square (0,3) facing east, column 10 row 5 | `bane-eastern-rampart-terrain-86ba657c5e38.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:8cf3cea60a07a9d7bfe51b29ce5252f640c3bf3caeee2d2301c670f21fc55803` | 8X8D3 block 101 tile 27 over the ground colour 6 | map 0, square (3,3) facing south, column 6 row 6 | `bane-rampart-paving-8cf3cea60a07.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:91149bb7ce520ef1bf6d3fbbe7957b53c612718db98f28fb3a7bedb86c0b1ea5` | 8X8D3 block 101 tile 16 over sky colour 11 | map 0, square (5,2) facing east, column 9 row 4 | `new-phlan-harbor-paving-joins-0-91149bb7ce52.png` (area 0, 11) |
| `tile:8:dc6c3d5510b0653401790072e22a586a17ac1d36bc9b0f782ea2f57ec58b7828` | 8X8D3 block 101 tile 1 | map 0, square (5,2) facing east, column 9 row 5 | `new-phlan-harbor-paving-joins-0-dc6c3d5510b0.png` (area 0, 11, 18, 21, 24) |
| `tile:8:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D3 block 101 tile 69 | map 0, square (0,2) facing south, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:8:e3922047e12c2260eaef5a4f40f4426f51c95b755440c710331492e05e3c951a` | 8X8D3 block 101 tile 28 over the ground colour 6 | map 0, square (3,3) facing west, column 1 row 6 | `bane-rampart-paving-e3922047e12c.png` (area 0, 2, 11, 18, 24, 29, 31) |
| `tile:8:e72913a89f9d3daef62dc19e63acc5d329e89789dbe44e1e0e3099927e06f034` | 8X8D3 block 101 tile 34 | map 0, square (2,3) facing west, column 0 row 5 | `bane-eastern-rampart-terrain-e72913a89f9d.png` (area 0, 2, 11, 18, 24, 29, 31) |

#### tile set 8X8D3 block 102 (50)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:0e154b2b42e53709f209ebe14a14cd59008146dad1f01dc0475f8614a6202889` | 8X8D3 block 102 tile 16 | map 0, square (5,1) facing south, column 0 row 7 | `new-phlan-civic-terrain-0e154b2b42e5.png` (area 0, 7, 11, 20) |
| `tile:8:1930bf3912f12f181acb825e6e35b4935e2fbbcf9c15b721db739476417319a4` | 8X8D3 block 102 tile 19 | map 0, square (10,7) facing east, column 10 row 7 | `new-phlan-south-market-terrain-0-1930bf3912f1.png` (area 0, 11) |
| `tile:8:244e3a737dff103ce562544c8101531a1243923042056f12d1e433b13403ecd6` | 8X8D3 block 102 tile 69 | map 0, square (10,9) facing east, column 6 row 6 | `valjevo-terra-cotta-floor-244e3a737dff.png` (area 0, 7, 11) |
| `tile:8:2c07b5fab1efd528ab309be6c35e564bb46750de4ff813de5ff640b6ee22c2bf` | 8X8D3 block 102 tile 17 | map 0, square (13,8) facing west, column 1 row 6 | `new-phlan-south-market-terrain-0-2c07b5fab1ef.png` (area 0, 7, 11, 20) |
| `tile:8:2f4c62ac6c3847a825b124f5b92952adc23efc85b43287238b8da9591d1001a9` | 8X8D3 block 102 tile 39 | map 0, square (0,0) facing east, column 8 row 7 | `new-phlan-street-paving-joins-0-2f4c62ac6c38.png` (area 0, 11, 20) |
| `tile:8:34c8e1f49742be249357aba1a5180b7fbd7dff4350ff758ba579534fcd9cdb70` | 8X8D3 block 102 tile 57 | map 0, square (13,8) facing east, column 10 row 3 | `new-phlan-south-market-terrain-0-34c8e1f49742.png` (area 0, 7, 11, 20) |
| `tile:8:377420f76a2a02743aa7246fe5abc2356c698f47930ac0cbead1e1b62d2f1e44` | 8X8D3 block 102 tile 29 | map 0, square (2,1) facing east, column 5 row 5 | `new-phlan-south-market-terrain-0-377420f76a2a.png` (area 0, 5, 7, 11) |
| `tile:8:39cc1df080453d41cc72fbb1070c6f88e040bb5e36b16cb6cd948bd07b1180f5` | 8X8D3 block 102 tile 6 | map 0, square (10,7) facing east, column 10 row 4 | `new-phlan-south-market-terrain-0-39cc1df08045.png` (area 0, 11) |
| `tile:8:3bcfc4497c095510e26a7123dcf7d5000f75b567d0bb4cd72c92a870e9a41f48` | 8X8D3 block 102 tile 47 | map 0, square (0,0) facing west, column 10 row 7 | `phlan-fallback-0-3bcfc4497c09.png` (area 0, 11) |
| `tile:8:3c785d52bd5743e287ba141d5549e8235d3b16650a4a6dd89841f7b03fbc28f9` | 8X8D3 block 102 tile 66 | map 0, square (13,6) facing south, column 1 row 5 | `new-phlan-building-paving-joins-0-3c785d52bd57.png` (area 0, 7, 11) |
| `tile:8:456f9f400e4fb32e2b5f13e2bc06736c4ba19f898ed29143ac49fb15e0c33ad1` | 8X8D3 block 102 tile 0 | map 0, square (5,1) facing south, column 0 row 6 | `valjevo-lower-trim-456f9f400e4f.png` (area 0, 5, 7, 11, 20) |
| `tile:8:480c0193f74fe2f8eebe95e255b18123bc620f775b922bb08febe829502c265b` | 8X8D3 block 102 tile 65 | map 0, square (12,6) facing east, column 9 row 5 | `valjevo-merchant-wing-terrain-480c0193f74f.png` (area 0, 7, 11) |
| `tile:8:49adbe0c989896a2fc859c7518d72be11572fff18d83d579b7eb021b3dba21bc` | 8X8D3 block 102 tile 67 over 8X8D3 block 102 tile 5 | map 0, square (8,12) facing east, column 6 row 5 | `valjevo-merchant-wing-terrain-49adbe0c9898.png` (area 0, 7, 11) |
| `tile:8:4e24210255ed185eb54a70dc98aae7c1beeeb78e5107d1d01b5a931dcae9a8ae` | 8X8D3 block 102 tile 59 | map 0, square (15,8) facing south, column 10 row 4 | `new-phlan-building-paving-joins-0-4e24210255ed.png` (area 0, 7, 11, 20) |
| `tile:8:582935262251c3c3b53ec076d372c7bebfc34f9076968d8314e319ea8cca75bd` | 8X8D3 block 102 tile 18 | map 0, square (9,7) facing east, column 7 row 5 | `new-phlan-south-market-terrain-0-582935262251.png` (area 0, 7, 11) |
| `tile:8:5d6cc31ad8f8909dbfb51faf0fb70a9731367b107ace2c2761b9eb85951cc9ee` | 8X8D3 block 102 tile 36 | map 0, square (0,0) facing east, column 8 row 5 | `new-phlan-street-paving-joins-0-5d6cc31ad8f8.png` (area 0, 7, 11, 20) |
| `tile:8:624c54394650999904d165e8083586d2c5d9dea1cfb089dcbb22e946cbbf6f37` | 8X8D3 block 102 tile 58 | map 0, square (13,8) facing east, column 9 row 3 | `new-phlan-south-market-terrain-0-624c54394650.png` (area 0, 7, 11, 20) |
| `tile:8:6350a67cee5ed480bf0c6c1c98180dff777b31313ae09d346fa708c132025c0a` | 8X8D3 block 102 tile 60 | map 0, square (13,6) facing east, column 10 row 4 | `new-phlan-south-market-terrain-0-6350a67cee5e.png` (area 0, 11) |
| `tile:8:74a379270d22aa664ac146ea1c2a2d893fdc08a1971fd1a49b8ddab1632a6788` | 8X8D3 block 102 tile 68 | map 0, square (13,6) facing south, column 1 row 6 | `new-phlan-building-paving-joins-0-74a379270d22.png` (area 0, 7, 11) |
| `tile:8:76cac3df22ca0d41b487785b4d4d96f57f49be237438fa17e2e8813b0e536b56` | 8X8D3 block 102 tile 49 over sky colour 12 | map 0, square (1,1) facing east, column 8 row 2 | `new-phlan-north-avenue-terrain-76cac3df22ca.png` (area 0, 11) |
| `tile:8:78d49be0ec8d85548a56d9b83e8384b76643e1d87889ea01c72df92930638ba6` | 8X8D3 block 102 tile 56 | map 0, square (13,8) facing east, column 9 row 4 | `new-phlan-south-market-terrain-0-78d49be0ec8d.png` (area 0, 7, 11, 20) |
| `tile:8:7fa58d10584ec9c662b69570d9e0b6e0b3b1ad3eecfb3a259959f7fc136b792c` | 8X8D3 block 102 tile 42 | map 0, square (11,6) facing west, column 0 row 7 | `new-phlan-building-paving-joins-0-7fa58d10584e.png` (area 0, 5, 11) |
| `tile:8:804ed836f1ee59cdf32cc2c761738edb955337d1de0a5b1094116703ea7a2f93` | 8X8D3 block 102 tile 33 over sky colour 12 | map 0, square (1,1) facing north, column 0 row 0 | `new-phlan-north-avenue-terrain-804ed836f1ee.png` (area 0, 11) |
| `tile:8:819bbf4da7d50ea93fca2fc26d008607ba5e0526948870150042383e992d7c8c` | 8X8D3 block 102 tile 9 | map 0, square (10,7) facing east, column 10 row 6 | `new-phlan-south-market-terrain-0-819bbf4da7d5.png` (area 0, 11) |
| `tile:8:864e1c16f1f75e9bddb2a42fa78b1de7fb6124018e7418353073cfbd73c34aab` | 8X8D3 block 102 tile 50 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (12,6) facing west, column 1 row 5 | `new-phlan-harbor-paving-joins-0-864e1c16f1f7.png` (area 0, 11) |
| `tile:8:89a02b4a8a3398bae28de863ab4ada7f7326b2e1c12a038f763578c1b02dd484` | 8X8D3 block 102 tile 34 | map 0, square (8,7) facing east, column 6 row 5 | `new-phlan-south-market-terrain-0-89a02b4a8a33.png` (area 0, 11) |
| `tile:8:8a2485a2d40e912565d5459b113149d70ba66f6b94e463c6967af3caed303cdd` | 8X8D3 block 102 tile 35 | map 0, square (0,0) facing east, column 8 row 6 | `new-phlan-street-paving-joins-0-8a2485a2d40e.png` (area 0, 7, 11, 20) |
| `tile:8:8d3592ae6802ffa7f7f7ac5df9362eb4f08b56ae06b8be5a12827cb8bbb6d7b9` | 8X8D3 block 102 tile 45 | map 0, square (0,0) facing east, column 3 row 6 | `phlan-fallback-0-8d3592ae6802.png` (area 0, 11) |
| `tile:8:901342053079a4679add86d120a4add26a3058e08fb05eb433ee4f7a3927f4a2` | 8X8D3 block 102 tile 50 over 8X8D3 block 102 tile 30 | map 0, square (13,12) facing south, column 1 row 5 | `phlan-fallback-0-901342053079.png` (area 0, 11) |
| `tile:8:97b40cd88297680a69a47a9f4a38c9abc2eeea77bd894d37ce767387168bd6fe` | 8X8D3 block 102 tile 53 | map 0, square (13,8) facing west, column 1 row 4 | `new-phlan-south-market-terrain-0-97b40cd88297.png` (area 0, 7, 11, 20) |
| `tile:8:9ef13c4eabb84ad92b719a14aa51fbed3640611bb404b4ad2d58eebbd441af4a` | 8X8D3 block 102 tile 40 | map 0, square (0,0) facing east, column 7 row 6 | `new-phlan-street-paving-joins-0-9ef13c4eabb8.png` (area 0, 7, 11, 20) |
| `tile:8:a0c0c9c245686e8bfba08abd377e3a48184c276695b008174f605d7a2f83995e` | 8X8D3 block 102 tile 21 | map 0, square (11,7) facing west, column 2 row 5 | `new-phlan-south-market-terrain-0-a0c0c9c24568.png` (area 0, 5, 7, 11, 20) |
| `tile:8:a2c41c4f0c4fa31620dac8ca4d42c5425fdd1ba3f700cc05c8471549a309d990` | 8X8D3 block 102 tile 63 | map 0, square (10,9) facing east, column 8 row 4 | `new-phlan-south-market-terrain-0-a2c41c4f0c4f.png` (area 0, 11) |
| `tile:8:ad4007119c61bf7d6666c19092a0860486034153aa08a403fd206f9cd1940357` | 8X8D3 block 102 tile 15 | map 0, square (0,0) facing west, column 9 row 7 | `new-phlan-south-market-terrain-0-ad4007119c61.png` (area 0, 7, 11) |
| `tile:8:b17f6d862c65feca624f42f7f243b82e3062650c47a37e49f46e44d660a8566a` | 8X8D3 block 102 tile 48 | map 0, square (0,0) facing east, column 2 row 6 | `phlan-fallback-0-b17f6d862c65.png` (area 0, 11) |
| `tile:8:b8645fd4952e35317fa061a3be9a84e98b48141ba4090c3c1fa13f323d8720d5` | 8X8D3 block 102 tile 1 | map 0, square (13,8) facing west, column 0 row 6 | `new-phlan-south-market-terrain-0-b8645fd4952e.png` (area 0, 7, 11, 20) |
| `tile:8:bff4138f16da7e78e6c57d9e50fd19f21d6345bd6e54f319107767eaab2d78d5` | 8X8D3 block 102 tile 51 | map 0, square (12,5) facing south, column 9 row 5 | `new-phlan-harbor-paving-joins-0-bff4138f16da.png` (area 0, 11) |
| `tile:8:c5e2f7ff8d6b146f5520b9e77b107cfc1d8403f75c10befcf30bb317944e2303` | 8X8D3 block 102 tile 61 | map 0, square (14,7) facing south, column 2 row 4 | `new-phlan-south-market-terrain-0-c5e2f7ff8d6b.png` (area 0, 7, 11) |
| `tile:8:c9fef07a3a27e1df3aa7274c13835fc6346adacf4e92322f51f648ff0c88809b` | 8X8D3 block 102 tile 37 | map 0, square (0,0) facing east, column 7 row 5 | `new-phlan-street-paving-joins-0-c9fef07a3a27.png` (area 0, 7, 11, 20) |
| `tile:8:cd0c178e86616351240aa2ee992e50a4998ce99d0a7295965dc3a5de8481c2c5` | 8X8D3 block 102 tile 67 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (10,9) facing east, column 6 row 5 | `valjevo-merchant-branch-terrain-cd0c178e8661.png` (area 0, 7, 11) |
| `tile:8:ce13abf3874bf1742295c9181afd3559b8263f4ae3d25731c2214fd647da2110` | 8X8D3 block 102 tile 41 | map 0, square (3,0) facing west, column 4 row 5 | `orc-door-4fd647da2110.png` (area 0, 7, 11, 20) |
| `tile:8:ceaa1c6a928af7e169014854674189c9cdbdc41645ce50b1a41756218050daf6` | 8X8D3 block 102 tile 43 over the ground colour 6 | map 0, square (9,7) facing east, column 8 row 8 | `new-phlan-building-paving-joins-0-ceaa1c6a928a.png` (area 0, 7, 11) |
| `tile:8:ddf169cd0d8e5a9b7d91c469c73cfb6e6fdc47a98898e2205291ccbbb40a267f` | 8X8D3 block 102 tile 13 | map 0, square (10,7) facing east, column 9 row 6 | `new-phlan-south-market-terrain-0-ddf169cd0d8e.png` (area 0, 11) |
| `tile:8:e1e25d740d96dc559780490d178cccf8720a7224ec2336badb59664c9c44aef2` | 8X8D3 block 102 tile 55 | map 0, square (13,8) facing west, column 1 row 3 | `new-phlan-south-market-terrain-0-e1e25d740d96.png` (area 0, 7, 11, 20) |
| `tile:8:e3d609d69fc12018b9f7d110ea30eccc6d91ee967db698226ce57a499e471dd1` | 8X8D3 block 102 tile 54 | map 0, square (13,8) facing west, column 0 row 3 | `new-phlan-south-market-terrain-0-e3d609d69fc1.png` (area 0, 7, 11, 20) |
| `tile:8:e6c54d795264af5e30cea8c8db38610f1305aa1395cf05b3c96cd7496f272900` | 8X8D3 block 102 tile 22 | map 0, square (13,7) facing south, column 0 row 6 | `new-phlan-south-market-terrain-0-e6c54d795264.png` (area 0, 7, 11, 20) |
| `tile:8:e9660b0895d8aa142fec4c3ddb0f36b80f500aae4c3394f6680314fcaf79ce8c` | 8X8D3 block 102 tile 12 | map 0, square (9,7) facing east, column 7 row 6 | `new-phlan-south-market-terrain-0-e9660b0895d8.png` (area 0, 11) |
| `tile:8:f18965943be25bd3f32240928a4a8bec8ee34b07f230cb1069cac20279caea4a` | 8X8D3 block 102 tile 23 | map 0, square (11,7) facing west, column 2 row 7 | `new-phlan-south-market-terrain-0-f18965943be2.png` (area 0, 5, 7, 11, 20) |
| `tile:8:fbcbe0dd001b4c1a5fb04f913c956be88ece3e87439fb1b050904da2bb1cf1ec` | 8X8D3 block 102 tile 20 | map 0, square (13,8) facing west, column 0 row 7 | `new-phlan-south-market-terrain-0-fbcbe0dd001b.png` (area 0, 7, 11, 20) |
| `tile:8:fec9ae7f67a2d06652571b4104ee754e23f5596dbbae3bd0fa573995cdc2affb` | 8X8D3 block 102 tile 24 | map 0, square (13,8) facing west, column 0 row 4 | `new-phlan-south-market-terrain-0-fec9ae7f67a2.png` (area 0, 7, 11, 20) |

#### tile set 8X8D3 block 103 (56)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:8:01af9b25e39aaeea7fb9f20f5f35af970c3507db161604599c9dd2546acbe6d0` | 8X8D3 block 103 tile 46 | map 0, square (5,1) facing south, column 2 row 6 | `new-phlan-building-exits-terrain-01af9b25e39a.png` (area 0, 11) |
| `tile:8:06ab0ea758cbd6161799235b2b0d7e4521172faf22e35bf4119b31f0f52815f8` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 32 | map 0, square (14,11) facing west, column 3 row 5 | `phlan-fallback-0-06ab0ea758cb.png` (area 0, 11) |
| `tile:8:0d4b58782f4ca26533d6f17c315a5a856b1194a4cfc4dd92e4fa02d3ba67bf31` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (12,3) facing north, column 7 row 5 | `new-phlan-harbor-paving-joins-0-0d4b58782f4c.png` (area 0, 11) |
| `tile:8:0da28796f3f66a72e2645e54a1f2897c80134436264ad00d76b1c07aa990cd37` | 8X8D3 block 103 tile 37 | map 0, square (5,1) facing south, column 1 row 8 | `new-phlan-civic-terrain-0da28796f3f6.png` (area 0, 11) |
| `tile:8:1a83f260002396d35ecdecff75b4bdfb9225a0f1e09a1cbe43a89760a0df887a` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 3 | map 0, square (12,11) facing east, column 8 row 5 | `phlan-fallback-0-1a83f2600023.png` (area 0, 11) |
| `tile:8:243765cb742c7f8baa3c055be6cbba8c698816a73037869e4b304f63cea7bd01` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 37 | map 0, square (13,3) facing west, column 10 row 5 | `phlan-fallback-0-243765cb742c.png` (area 0, 11) |
| `tile:8:30f3bb975c3bf219afc9b2d64fc0e35835e7c401da3ad597bf5af8d9a439237d` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 30 | map 0, square (13,5) facing south, column 1 row 5 | `phlan-fallback-0-30f3bb975c3b.png` (area 0, 11) |
| `tile:8:39ec23f0982f82d51a199d2e205583ec5183e3f4f657da903eb6426c8777ed81` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 59 | map 0, square (13,3) facing north, column 4 row 5 | `phlan-fallback-0-39ec23f0982f.png` (area 0, 11) |
| `tile:8:451efcf97fe4cb8ea437dd0fba90a08e095423c51c7c23c69dd2f48be9fcead5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 21 | map 0, square (13,3) facing west, column 0 row 5 | `phlan-fallback-0-451efcf97fe4.png` (area 0, 11) |
| `tile:8:454c08486f123540ea56b2fed133366cbc56bff3f4b494cd4d08f710aafced94` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 47 | map 0, square (13,3) facing north, column 2 row 5 | `phlan-fallback-0-454c08486f12.png` (area 0, 11) |
| `tile:8:4803f5dc3182db9989861f38067bb331053bbfb52c7799bb976bd19144042bde` | 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 51 | map 0, square (12,12) facing east, column 9 row 5 | `phlan-fallback-0-4803f5dc3182.png` (area 0, 11) |
| `tile:8:5e6ca21cd26fb9dc2194d475c5ba58a893a144c307796462e5ba278a3ed9c93c` | 8X8D3 block 103 tile 52 over sky colour 11 | map 0, square (4,1) facing south, column 0 row 3 | `new-phlan-building-paving-joins-0-5e6ca21cd26f.png` (area 0, 11) |
| `tile:8:6095180558e9b73e9710a63a44cd88c6daf47a09c33828e19452d1b7ea39d0a5` | 8X8D3 block 103 tile 58 | map 0, square (14,7) facing south, column 2 row 6 | `new-phlan-south-market-terrain-0-6095180558e9.png` (area 0, 11) |
| `tile:8:646a996d9a877bf5fe36750fd9b9f368be1708dbcb48727b977d49f3e8eee2af` | 8X8D3 block 103 tile 9 | map 0, square (2,2) facing east, column 9 row 5 | `new-phlan-street-paving-joins-0-646a996d9a87.png` (area 0, 11, 15) |
| `tile:8:6ad37cf35c202965922d7096419fef61f87a49b9b7afc8d521913f7f32978264` | 8X8D3 block 103 tile 63 | map 0, square (4,1) facing south, column 0 row 7 | `new-phlan-building-paving-joins-0-6ad37cf35c20.png` (area 0, 11) |
| `tile:8:6eb0229fba37066c933fd301ebdf2d3f3f95c0aa02edc13b9efcec153f936da1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 38 | map 0, square (6,14) facing west, column 0 row 5 | `phlan-fallback-0-6eb0229fba37.png` (area 0, 11) |
| `tile:8:6ffbe31ffb6e357e7b5bc90c837a9e81d95b620e6c5d258167ece8994b0cb2ab` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 3 | map 0, square (15,11) facing east, column 6 row 5 | `phlan-fallback-11-6ffbe31ffb6e.png` (area 11) |
| `tile:8:719b5967a953045d0d20abcf9452381308bb1fface4a6baeb52d8b74ecf29040` | 8X8D3 block 103 tile 39 over 8X8D3 block 102 tile 5 | map 0, square (14,5) facing west, column 8 row 5 | `phlan-fallback-0-719b5967a953.png` (area 0, 11) |
| `tile:8:750047fda51e805e93727318ef77fa7a620e6edeb7a057b138bc80985275b9c7` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 101 tile 21 | map 0, square (14,3) facing south, column 1 row 5 | `phlan-fallback-11-750047fda51e.png` (area 11) |
| `tile:8:795899f6cf242fdcf69f3d4fe0e776713195ec44bc13eb38d2043a9ecb87dfd4` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 39 | map 0, square (3,14) facing east, column 10 row 5 | `phlan-fallback-11-795899f6cf24.png` (area 11) |
| `tile:8:79614e8063fe952222ed56df183e9e0623b3995656e248d0c2a01d05284ab9d6` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 32 | map 0, square (14,13) facing west, column 9 row 5 | `phlan-fallback-0-79614e8063fe.png` (area 0, 11) |
| `tile:8:7c4c73abf8f8be43d7999d9caf01d84a00760d26a26251f8632c43ece6879792` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 2 | map 0, square (15,11) facing east, column 8 row 5 | `phlan-fallback-11-7c4c73abf8f8.png` (area 11) |
| `tile:8:7f61c92327391a6bca5b0a528d2d032e6840ad63c3910f057a5486cdec840afa` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 5 | map 0, square (15,5) facing south, column 4 row 5 | `phlan-fallback-11-7f61c9232739.png` (area 11) |
| `tile:8:811ae3a349c441d47448e1f94f7d2d9f7d9611f40e3177c2d53c418cac59be77` | 8X8D3 block 103 tile 15 | map 0, square (3,0) facing east, column 7 row 5 | `new-phlan-training-paving-0-811ae3a349c4.png` (area 0, 11) |
| `tile:8:8912e73364ab5cc50ba0bce12eed2b990830fa4034cd0a69b34c204b99e1104e` | 8X8D3 block 103 tile 47 | map 0, square (4,1) facing south, column 0 row 6 | `new-phlan-building-exits-terrain-8912e73364ab.png` (area 0, 11) |
| `tile:8:89396b758064cb35796020a5347af3a0f5aa2b40a2a5293e8ae315ba0c1bc7e3` | 8X8D3 block 103 tile 53 over sky colour 11 | map 0, square (5,1) facing north, column 10 row 0 | `new-phlan-street-paving-joins-0-89396b758064.png` (area 0, 11) |
| `tile:8:8a7502a683b5ca79bfab71960c48f6abd3e0a5ea79e62fc5baa85e4f755b4e38` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 47 | map 0, square (15,4) facing south, column 2 row 5 | `phlan-fallback-11-8a7502a683b5.png` (area 11) |
| `tile:8:9859de0bc085d85d77c94427a28ac253d9dc5c2cb9f8774de7282aaf58a88512` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 21 | map 0, square (14,2) facing south, column 1 row 5 | `phlan-fallback-0-9859de0bc085.png` (area 0, 11) |
| `tile:8:99de9f9b4514c2decbc4de130b2681b346a3c51f9795c515e4bcedc012b14e2b` | 8X8D3 block 103 tile 41 over 8X8D3 block 101 tile 68 | map 0, square (12,4) facing north, column 6 row 5 | `phlan-fallback-0-99de9f9b4514.png` (area 0, 11) |
| `tile:8:9d678c0fec7e982dea23320ba77532401b0493422a9dc04a2bfa2bebd8c50c42` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 25 | map 0, square (14,3) facing west, column 10 row 5 | `phlan-fallback-0-9d678c0fec7e.png` (area 0, 11) |
| `tile:8:9dca57c2c800009211f6af8acd50aac8d40878ddadc46be8517ef0f3d0ffe98e` | 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 3 | map 0, square (5,14) facing west, column 4 row 5 | `new-phlan-market-turn-terrain-9dca57c2c800.png` (area 0, 11) |
| `tile:8:a283214480d9101b4208e2c3c73cd3055746bd9ea8611da11944b013875ee752` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 68 | map 0, square (15,4) facing east, column 9 row 5 | `phlan-fallback-11-a283214480d9.png` (area 11) |
| `tile:8:aff5e903c90440b24b67d198a77f832e074475934f66bdb265cc26b17c9a6077` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 35 | map 0, square (15,3) facing south, column 0 row 5 | `phlan-fallback-11-aff5e903c904.png` (area 11) |
| `tile:8:b386a3574a88e3d97c8dbf8af3f4bba1629b4647b8f37fe12ea834d90fcee0e8` | 8X8D3 block 103 tile 10 | map 0, square (2,2) facing south, column 1 row 6 | `new-phlan-training-civic-terrain-0-b386a3574a88.png` (area 0, 11) |
| `tile:8:b91c1a61b1b674049f1da4fdf724a912001190410004064840dea1621c0c3e16` | 8X8D3 block 103 tile 3 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (0,0) facing east, column 4 row 5 | `phlan-fallback-0-b91c1a61b1b6.png` (area 0, 11) |
| `tile:8:bc0fc51f67b36ed051bbab273b0e11f9886fba78b3e730da540b61b7fd1a64a0` | 8X8D3 block 103 tile 20 | map 0, square (3,4) facing north, column 10 row 1 | `new-phlan-street-paving-joins-0-bc0fc51f67b3.png` (area 0, 11) |
| `tile:8:bdc2846eeb75d16b7e334279cc32c448aae109f3c5fcdf2fb2cb9f1f1588ce52` | 8X8D3 block 103 tile 21 | map 0, square (4,3) facing west, column 0 row 1 | `new-phlan-harbor-paving-joins-0-bdc2846eeb75.png` (area 0, 11) |
| `tile:8:c32c234a7bbf0eaa70dc96a5319e6b2380a6410eef8894cba00a879b33355618` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 3 | map 0, square (14,11) facing east, column 6 row 5 | `phlan-fallback-11-c32c234a7bbf.png` (area 11) |
| `tile:8:c3f6c9dcaf3cbd15279435fed80c311d3039001afd1e0684d444730419443ef5` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 20 | map 0, square (15,11) facing south, column 0 row 5 | `phlan-fallback-11-c3f6c9dcaf3c.png` (area 11) |
| `tile:8:c9eacb92173da7fb7eb5191db83856abbcb0f04e6685eeb42c6606bc1cb85525` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 68 | map 0, square (14,2) facing south, column 0 row 5 | `phlan-fallback-11-c9eacb92173d.png` (area 11) |
| `tile:8:d07214e211bfcb95740dd2e555351451cfb989737372d71b9e72835a8b5128bf` | 8X8D3 block 103 tile 26 | map 0, square (5,1) facing south, column 0 row 8 | `new-phlan-civic-terrain-d07214e211bf.png` (area 0, 11) |
| `tile:8:d0da7ad4498cfdbaf905732257665c26ccefcad1c8f80bf67ab4abc30a869795` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 102 tile 5 | map 0, square (14,5) facing south, column 2 row 5 | `phlan-fallback-11-d0da7ad4498c.png` (area 11) |
| `tile:8:d26c869894444bd21b6653fccc8965779c2abd71678b6dc7df589317ab2dee30` | 8X8D3 block 103 tile 11 | map 0, square (2,2) facing east, column 9 row 6 | `new-phlan-street-paving-joins-0-d26c86989444.png` (area 0, 11) |
| `tile:8:d31e129c0c2e50debad0b3da0976aa310a242279dab9b105dfa862cbcf7c75a1` | 8X8D3 block 103 tile 0 over 8X8D1 block 203 tile 12 | map 0, square (15,3) facing west, column 10 row 5 | `phlan-fallback-0-d31e129c0c2e.png` (area 0, 11) |
| `tile:8:d356ab3a068af8d71f953dc85699005053abc5012267e706ef6280b202da0cc8` | 8X8D3 block 103 tile 52 over sky colour 12 | map 0, square (6,1) facing north, column 0 row 0 | `new-phlan-training-hall-terrain-d356ab3a068a.png` (area 0, 11) |
| `tile:8:d4bfebd9881c703ec9c8702d40af2b04c1a0c8a329673f23bef7bc145b267a73` | 8X8D3 block 103 tile 59 | map 0, square (9,7) facing east, column 8 row 6 | `new-phlan-south-market-terrain-0-d4bfebd9881c.png` (area 0, 11) |
| `tile:8:d5d688860efe2e51bcfe34f1c8df81638516bb24203b3d3c36bc23079bde91ce` | 8X8D3 block 103 tile 39 over 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 64 | map 0, square (14,9) facing east, column 6 row 5 | `phlan-fallback-11-d5d688860efe.png` (area 11) |
| `tile:8:dc911cb26109fedd8420ff441590f02ca7e728df8fa5068ea8aad3bd39309f2e` | 8X8D3 block 103 tile 31 over sky colour 11 | map 0, square (2,2) facing east, column 9 row 4 | `new-phlan-civic-terrain-dc911cb26109.png` (area 0, 11) |
| `tile:8:e26b92fadba50b8d889a6fd196a894e7522d35272a8daa59dae7752e34b12f1c` | 8X8D3 block 103 tile 4 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 0, square (2,0) facing west, column 6 row 5 | `new-phlan-building-exits-terrain-e26b92fadba5.png` (area 0, 11) |
| `tile:8:e761e6a0facf5cbda34a735d1b8599c90404f5a34979393df0120e4f06fc1191` | 8X8D3 block 103 tile 39 over 8X8D3 block 101 tile 35 | map 0, square (14,4) facing south, column 0 row 5 | `phlan-fallback-11-e761e6a0facf.png` (area 11) |
| `tile:8:eb9e232b185d36eb5f04234d2860e02ab68b2f7adf09bb63bab6f1ee640cc5d9` | 8X8D3 block 103 tile 0 over 8X8D3 block 101 tile 46 | map 0, square (15,5) facing north, column 10 row 5 | `phlan-fallback-11-eb9e232b185d.png` (area 11) |
| `tile:8:f396f4ed12b9fd4e0bd9427532c1789a2c7ae498a49246236bcd2f065e323cda` | 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 0 over 8X8D3 block 103 tile 41 over 8X8D3 block 102 tile 3 | map 0, square (12,14) facing east, column 6 row 5 | `phlan-fallback-0-f396f4ed12b9.png` (area 0, 11) |
| `tile:8:f6613a058106db88c64183aa031f0c43f9f33676f27b6bf26e5600c0126ae92d` | 8X8D3 block 103 tile 68 | map 0, square (6,0) facing south, column 6 row 6 | `new-phlan-training-paving-0-f6613a058106.png` (area 0, 11) |
| `tile:8:f694be99114d4ada4bbf639d34cb6229464da9146cd4f986fde0c9354e68924d` | 8X8D3 block 103 tile 66 | map 0, square (5,1) facing south, column 2 row 7 | `new-phlan-building-paving-joins-0-f694be99114d.png` (area 0, 11) |
| `tile:8:fc0e4e223ec8429fdf7048813be9cfacb0c4c7db3808aa2ad81a246c22147ac0` | 8X8D3 block 103 tile 67 | map 0, square (4,1) facing east, column 5 row 6 | `new-phlan-civic-terrain-fc0e4e223ec8.png` (area 0, 11) |
| `tile:8:fff82287ace63820723d4cf9e1f8d238622b3c38a20e044d150ba9f6821b7a1d` | 8X8D3 block 103 tile 36 | map 0, square (5,1) facing south, column 0 row 9 | `new-phlan-civic-terrain-fff82287ace6.png` (area 0, 11) |

### Area 13: The Kobold Caves (64)

Map 13; WALLDEF8 block 17 (tiles 8X8D8 block 17), block 18 (tiles 8X8D8 block 18), nothing.

#### tile set 8X8D8 block 17 (63)

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
| `tile:13:4b7d01315af236181737df7fb5ba0ff0221cd97c04473ce7453d5fa75cd9e1fe` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 17 | map 13, square (10,5) facing south, column 8 row 3 | `kuto-catacomb-layered-cell-4b7d01315af2.png` (area 29) |
| `tile:13:4dfbef68650f945103467b9c44c5a964fd44e13635cfb9af9c6be22579b87233` | 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 61 | map 13, square (10,9) facing north, column 9 row 1 |  |
| `tile:13:4e7cdff51981bcde74a68aaa521c43033f0c32ef410d5cfd81eba050b290c59a` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 69 over sky colour 0 | map 13, square (9,8) facing east, column 9 row 3 |  |
| `tile:13:542cff24c3188202f5960cbd4f598c2eabab9fd53eeae0f044c44640d27c2f3d` | 8X8D8 block 17 tile 15 over 8X8D8 block 18 tile 63 | map 13, square (10,9) facing south, column 1 row 1 |  |
| `tile:13:554289061d91933d9c687cd0dd7414fb40f1003cf78a57d13359dc6c5c881294` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 67 | map 13, square (9,9) facing east, column 4 row 6 |  |
| `tile:13:5794e360d97ab95ff6b57367390a4d69bc61b9a456df99d0c072d5c6faf9a0e2` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (2,2) facing south, column 7 row 4 |  |
| `tile:13:582f970de767c8dc9a6a0edd52b41247bda3e624f4b85c86b820e11452c5cf94` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 2 | map 13, square (10,9) facing east, column 2 row 3 |  |
| `tile:13:58e2df47c41000a23ceb290895df77049fb54735e6891f6bd158ec718cb11917` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 34 | map 13, square (11,7) facing east, column 9 row 6 |  |
| `tile:13:62b04d5962f2cea84aa1c4f8931caf77dd4c288da7cff20eaf5f726b598aa658` | 8X8D8 block 17 tile 8 over 8X8D8 block 18 tile 13 | map 13, square (1,13) facing north, column 10 row 4 |  |
| `tile:13:63c16a00c17b7955470a45a5b0a20a23ecd8f1370f37148ffb1e1de9e8dd6d02` | 8X8D8 block 17 tile 7 over 8X8D1 block 203 tile 41 | map 13, square (2,13) facing north, column 8 row 6 |  |
| `tile:13:6929147516344d817e3f8e17fc90c1b0f9dc1a6af14ff3b4ad12dbc6cb0c0ad4` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 50 over the ground colour 6 | map 13, square (3,6) facing west, column 1 row 6 |  |
| `tile:13:6f3f9fb06967888d6e1c3da83dcbc873c13b581277dd555d919e906cce1d9152` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 36 | map 13, square (1,12) facing east, column 4 row 5 |  |
| `tile:13:701267ab8c4c4caa3cb9e71d36d3226504131fc575c70abe2021e6863519ed3a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (12,2) facing north, column 1 row 4 |  |
| `tile:13:737a315cbcaf507e797dfa6d777081e785f010a937663cdbd05d8ffb71c32709` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 47 | map 13, square (1,2) facing south, column 2 row 4 |  |
| `tile:13:73a41193202df9021c550eea7e79a7058118e56273c894875697f66798064826` | 8X8D8 block 17 tile 49 over 8X8D8 block 18 tile 61 | map 13, square (10,9) facing north, column 9 row 3 |  |
| `tile:13:7b7b4ba104e3a7b6d11740385398b3e5141716772b752e03b130fd5d6328e2a4` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 14 over sky colour 0 | map 13, square (5,7) facing east, column 9 row 3 |  |
| `tile:13:7bce2f52146803335ea8ea44a893fd01bea1d78453a4e6706b0795b937ab36c0` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 67 over sky colour 0 | map 13, square (5,7) facing south, column 3 row 4 |  |
| `tile:13:918fa02251b5f50e2f8dba7ac02f336e9f33e6b8abdcb23dd7092d0cb79a9d9a` | 8X8D8 block 17 tile 5 over 8X8D8 block 17 tile 5 over 8X8D8 block 18 tile 62 | map 13, square (14,9) facing west, column 6 row 5 |  |
| `tile:13:9581ad2cdb4d835af0bc0faff61b3935f443c2b615b668826abe0e5b4ce0c6e6` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 4 | map 13, square (10,9) facing east, column 2 row 4 |  |
| `tile:13:95d4f3607c9b1ab683bf801ca2db9efd8449e6066b38a3a958778391eb3b5724` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 18 tile 51 | map 13, square (2,12) facing east, column 2 row 8 |  |
| `tile:13:974a08ca635b55852047fd350dd7a6aa34f7d78b9c12a89eadc33b082e010d2b` | 8X8D8 block 17 tile 8 over 8X8D8 block 18 tile 36 | map 13, square (12,8) facing west, column 7 row 5 |  |
| `tile:13:9ca74205126cf6c661c2e2c31dd0cb0f4426665e9dcc4822ad1bf6cbd975791a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 35 | map 13, square (11,6) facing east, column 1 row 6 | `kuto-catacomb-joins-9ca74205126c.png` (area 29) |
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

### Area 15: Mendor's Library (118)

Map 15; WALLDEF2 block 1 (tiles 8X8D2 block 1), block 19 (tiles 8X8D2 block 19), block 23 (tiles 8X8D2 block 23).

#### shared tile set 8X8D1 block 203 (11)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:15:3974a4e7cfac0989e459e020b7096d73c2878d20bfda05e4aca310a80a78b372` | 8X8D1 block 203 tile 3 over sky colour 0 | map 15, square (3,7) facing east, column 10 row 0 |  |
| `tile:15:540a8ad2911ffb5910b1bc1a407925bca2a1e586f1f12ab23ec6630cb2a96c4d` | 8X8D1 block 203 tile 3 over sky colour 11 | map 15, square (3,7) facing east, column 10 row 0 |  |
| `tile:15:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 15, square (10,10) facing south, column 1 row 6 | `pyramid-outer-threshold-terrain-71c858f7e6de.png` (area 0, 2, 4, 5, 7, 8, 9, 11, 14, 16, 21, 23, 24, 28, 29, 31) |
| `tile:15:79f10a451d41cdb7f5f72757c36094300c7dcb298ee8adea8d79a034bc93259e` | 8X8D1 block 203 tile 1 over 8X8D1 block 203 tile 1 over sky colour 11 | map 15, square (8,1) facing south, column 5 row 1 | `kuto-daylight-horizon-79f10a451d41.png` (area 29) |
| `tile:15:7a62f42874a318807e50c5f76958ec89a88041ebcdbe85f63c86b39a4adb37d7` | 8X8D1 block 203 tile 34 over the ground colour 6 | map 15, square (9,9) facing south, column 6 row 6 | `orc-door-b39a4adb37d7.png` (area 0, 2, 3, 4, 5, 6, 7, 9, 11, 14, 16, 18, 20, 21, 23, 24, 28, 29, 31) |
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
| `tile:15:5e6ca21cd26fb9dc2194d475c5ba58a893a144c307796462e5ba278a3ed9c93c` | 8X8D2 block 19 tile 52 over sky colour 11 | map 15, square (0,0) facing south, column 1 row 4 | `new-phlan-building-paving-joins-0-5e6ca21cd26f.png` (area 0, 11) |
| `tile:15:60f4be2071593f29fbf0370f30020d31faf0a87a9bd2f886092a179bf364f9dc` | 8X8D2 block 19 tile 10 | map 15, square (10,0) facing west, column 1 row 6 |  |
| `tile:15:654cd672ba145d985c302a232ed15e5453d2a231d5b16d92a7e1d20e917056d7` | 8X8D2 block 19 tile 15 over sky colour 0 | map 15, square (7,0) facing south, column 2 row 3 |  |
| `tile:15:680ff9ccccdc16a043342fed1e9a8d56c8e7e138b26cf40025ffac63dbbf3659` | 8X8D2 block 19 tile 17 over sky colour 11 | map 15, square (5,3) facing north, column 0 row 3 |  |
| `tile:15:73580aea19c37b0ba580744927cd0783bc0f64ee5f97a6c06c0b12e1e44a39a4` | 8X8D2 block 19 tile 7 over 8X8D1 block 203 tile 38 | map 15, square (4,2) facing north, column 1 row 8 |  |
| `tile:15:75052a8fd6f25a00bcea051ba28f493751e65b14919d98ce647f21b960fcfa49` | 8X8D2 block 19 tile 27 | map 15, square (10,14) facing west, column 8 row 8 |  |
| `tile:15:7a53cbbb1a9da9c668e83ffa028ddbb533abf2f5e6a3d31821148f2ba1981e90` | 8X8D2 block 19 tile 59 | map 15, square (11,14) facing west, column 6 row 5 |  |
| `tile:15:80a6a4fad1a3635853c9c2d6ce3c08b9224e06e7ec608542dce57a313480465d` | 8X8D2 block 19 tile 7 over sky colour 11 | map 15, square (3,7) facing west, column 1 row 3 |  |
| `tile:15:88c7e0e2e78b074ee7ee081b73dfe5ab0ac2d67a1a874d0e06c8f628595bf39a` | 8X8D2 block 19 tile 15 over sky colour 11 | map 15, square (7,0) facing south, column 2 row 3 |  |
| `tile:15:89396b758064cb35796020a5347af3a0f5aa2b40a2a5293e8ae315ba0c1bc7e3` | 8X8D2 block 19 tile 53 over sky colour 11 | map 15, square (0,0) facing east, column 9 row 4 | `new-phlan-street-paving-joins-0-89396b758064.png` (area 0, 11) |
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
| `tile:15:dc911cb26109fedd8420ff441590f02ca7e728df8fa5068ea8aad3bd39309f2e` | 8X8D2 block 19 tile 31 over sky colour 11 | map 15, square (6,0) facing east, column 9 row 4 | `new-phlan-civic-terrain-dc911cb26109.png` (area 0, 11) |
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

### Area 16: The Lizardman Keep (166)

Map 16, 30; WALLDEF8 block 9 (tiles 8X8D8 block 9), block 20 (tiles 8X8D8 block 20), block 23 (tiles 8X8D8 block 23); WALLDEF8 block 9 (tiles 8X8D8 block 9), block 17 (tiles 8X8D8 block 17), block 23 (tiles 8X8D8 block 23).

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 16, square (7,15) facing east, column 7 row 7 | `route-0ae60cf3309a.png` (area 0, 2, 9, 11, 14, 15, 18, 20, 21, 22, 23, 29) |
| `tile:16:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 16, square (7,15) facing east, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:16:79f10a451d41cdb7f5f72757c36094300c7dcb298ee8adea8d79a034bc93259e` | 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (8,0) facing south, column 0 row 5 | `kuto-daylight-horizon-79f10a451d41.png` (area 29) |
| `tile:16:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (9,15) facing west, column 3 row 7 | `new-phlan-harbor-paving-joins-0-bbce287c6ee7.png` (area 0, 2, 8, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:16:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 16, square (9,15) facing west, column 2 row 8 | `new-phlan-harbor-paving-joins-0-c1703ae17aff.png` (area 0, 2, 8, 9, 11, 14, 15, 20, 21, 22, 23, 29) |

#### tile set 8X8D8 block 9 (30)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:092d77784cc2a3aced6d966599044e9ab65765f0e473458aed86601150644fd9` | 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 6 | map 16, square (10,13) facing west, column 1 row 5 |  |
| `tile:16:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D8 block 9 tile 47 | map 16, square (8,14) facing west, column 1 row 3 | `sokal-west-lintel-corner.png` (area 9, 21, 28) |
| `tile:16:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D8 block 9 tile 22 | map 16, square (10,15) facing west, column 4 row 6 | `slums-courtyard-joins-1a0dfab20ddd.png` (area 2, 9, 14, 15, 20, 21, 22, 23, 29) |
| `tile:16:20ce93dc46276e688404749b96fc9868d9f1bd87f6545b3c1ebc86922d8f010f` | 8X8D8 block 9 tile 56 over 8X8D8 block 9 tile 3 | map 16, square (7,14) facing east, column 8 row 4 | `stojanow-legacy-cell-20ce93dc4627.png` (area 9) |
| `tile:16:215488a7ca18e31d90dd8bc2d00c5f3002c2801a983ba96bbb0ceb9b2b3bd498` | 8X8D8 block 9 tile 58 | map 16, square (10,13) facing west, column 1 row 6 | `zhentil-northern-lane-terrain-215488a7ca18.png` (area 1, 5, 7, 9, 20, 21, 28) |
| `tile:16:246f66c4e1032e6b33d74b506b32402c610419af7fd2345721eb9e9128b7a578` | 8X8D8 block 9 tile 13 | map 16, square (8,0) facing north, column 2 row 4 | `stojanow-west-rampart-terrain-246f66c4e103.png` (area 9, 21, 28) |
| `tile:16:2795a504ca67152aac8296d4f1e16f70523c5cf25af04d218c8cde895f0db0f0` | 8X8D8 block 9 tile 49 over sky colour 11 | map 16, square (8,15) facing east, column 0 row 3 | `sokal-west-lintel-mid.png` (area 21, 28) |
| `tile:16:2bf0907bbca4cab51410edb7133ca4b000d0fb21731e247c9641e7a1e54b6c98` | 8X8D8 block 9 tile 42 over 8X8D8 block 9 tile 15 | map 16, square (10,15) facing west, column 6 row 5 |  |
| `tile:16:33b51e82f012e7d91b96894cd582495df912d95b36989e787ee5f7885e92d5b7` | 8X8D8 block 9 tile 38 | map 16, square (9,13) facing west, column 0 row 6 | `stojanow-tower-lanes-terrain-33b51e82f012.png` (area 9, 21, 28) |
| `tile:16:414260af77afd8aef64b37cc3ab35c6ffbbbeeb0b6491dfc427d38dd5064d5e8` | 8X8D8 block 9 tile 42 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (6,14) facing east, column 6 row 5 | `sokal-legacy-cell-414260af77af.png` (area 21, 28) |
| `tile:16:42945697e83023b58f9b0ab01e2b4629d8f5ec4d796b65e5d04be6ef442ab87f` | 8X8D8 block 9 tile 7 | map 16, square (1,3) facing north, column 4 row 5 | `zhentil-outpost-terrain-42945697e830.png` (area 9, 21, 28) |
| `tile:16:5f7ade4531d3bada00bc1c2d310f67d23a25dbe485f1d71a0c78936df93bbd13` | 8X8D8 block 9 tile 41 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (10,14) facing west, column 4 row 5 | `sokal-west-gate-hinge-cap.png` (area 21, 28) |
| `tile:16:5fb9e67d0ccf7495bc8ed31bf8960390be987a6d6c92cd882e47d72a5d4cea53` | 8X8D8 block 9 tile 49 over 8X8D1 block 203 tile 12 | map 16, square (8,14) facing west, column 0 row 3 | `stojanow-legacy-cell-5fb9e67d0ccf.png` (area 9) |
| `tile:16:6182286c97e2af8cf47fcf4321d9b562df43cfb3c35ee22574e9528275ea8a7d` | 8X8D8 block 9 tile 56 over sky colour 11 | map 16, square (8,15) facing west, column 10 row 3 | `sokal-raking-gate-head-end.png` (area 21, 28) |
| `tile:16:755bda5b825770559bb1bca3b1582f2f4788da7f1a3b9cbb0b2ec3f4c2052f71` | 8X8D8 block 9 tile 56 over 8X8D1 block 203 tile 12 | map 16, square (8,14) facing east, column 10 row 3 | `stojanow-guard-wing-terrain-755bda5b8257.png` (area 9, 28) |
| `tile:16:8a69c0e8564e565884435ba1a08a6f282775d00ecb8af439bb001edeb3831ec2` | 8X8D8 block 9 tile 54 over 8X8D8 block 9 tile 54 over the ground colour 6 | map 16, square (8,15) facing north, column 5 row 6 | `stojanow-tower-lanes-terrain-8a69c0e8564e.png` (area 9, 21, 28) |
| `tile:16:8e4e495407f094508c6c358ba241bf1946da32e0ab2eff5fec8ab2cd82ac2998` | 8X8D8 block 9 tile 63 | map 16, square (8,8) facing east, column 2 row 4 | `stojanow-west-rampart-terrain-8e4e495407f0.png` (area 9) |
| `tile:16:9a4ac03bffe81d707e144cfb140cdf11478447a8ab201408ee5e418c2742a5ae` | 8X8D8 block 9 tile 64 | map 16, square (9,8) facing west, column 10 row 2 | `stojanow-upper-gate-terrain-9a4ac03bffe8.png` (area 9) |
| `tile:16:9fb217c9d87375988f0a4bfe6ed0ed5df1dabb3d5301b4410f163e72ddedcb0c` | 8X8D8 block 9 tile 60 | map 16, square (7,8) facing east, column 4 row 5 | `stojanow-west-rampart-terrain-9fb217c9d873.png` (area 9) |
| `tile:16:a1b8baf4059c3a18ecd999f94f44fbba3630c87a33820ec33a092d52785d83bd` | 8X8D8 block 9 tile 43 | map 16, square (6,12) facing south, column 1 row 5 | `stojanow-tower-warning-terrain-a1b8baf4059c.png` (area 9, 21, 28) |
| `tile:16:a5d4129237b2f11c1fbe432d281f82df864337f2d654c4e32cd72c83ee3233cf` | 8X8D8 block 9 tile 45 over 8X8D8 block 9 tile 3 | map 16, square (9,14) facing west, column 2 row 4 | `stojanow-legacy-cell-a5d4129237b2.png` (area 9) |
| `tile:16:abf4a264e67412e3e24a2b51727b24e0d063340fe6343e232ed3ab8abd123f60` | 8X8D8 block 9 tile 65 | map 16, square (9,8) facing east, column 0 row 2 | `stojanow-west-rampart-terrain-abf4a264e674.png` (area 9) |
| `tile:16:b38bb090ffc6ff28fd87d9752a69d3a271dbc6d5c12ef2bef8d273d5718e1701` | 8X8D8 block 9 tile 39 | map 16, square (8,8) facing east, column 3 row 4 | `stojanow-west-rampart-terrain-b38bb090ffc6.png` (area 9) |
| `tile:16:b75fa3bd05faf8986e8270c40a1e79514aaa1d6094f381c21de72443c561eb41` | 8X8D8 block 9 tile 62 | map 16, square (10,8) facing west, column 8 row 4 | `stojanow-barracks-side-terrain-b75fa3bd05fa.png` (area 9) |
| `tile:16:b784b8750b8adf3caafc9bb39eccbd31f78447d7268123fcf737875c487f9fea` | 8X8D8 block 9 tile 44 | map 16, square (8,14) facing east, column 10 row 7 | `stojanow-guard-wing-terrain-b784b8750b8a.png` (area 9, 21, 28) |
| `tile:16:ba6dffecfcac31b31c0359d99617b3180552c982bef2087cb4995bccd9554ee7` | 8X8D8 block 9 tile 45 over sky colour 11 | map 16, square (7,15) facing east, column 2 row 4 | `sokal-west-lintel-close.png` (area 21, 28) |
| `tile:16:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D8 block 9 tile 21 | map 16, square (6,15) facing east, column 6 row 6 | `route-e0a3abc3b4a8.png` (area 0, 2, 9, 11, 14, 15, 20, 21, 22, 23, 29) |
| `tile:16:f59a8b4ef53dca4b588a04b05a81d1c5a38fb9fa2354b6e64a4853bbbf7ad8f3` | 8X8D8 block 9 tile 46 | map 16, square (8,14) facing east, column 9 row 3 | `stojanow-guard-wing-terrain-f59a8b4ef53d.png` (area 9, 21, 28) |
| `tile:16:fc85e701ce21521a7c912ea59856be8e5876bb6a37598db60faf2fed8b5027ba` | 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 15 | map 16, square (6,15) facing east, column 4 row 5 |  |
| `tile:16:fd5111f010b1eb27874d7173f3f881527f0a97a68535e574937a39274ae5fb87` | 8X8D8 block 9 tile 48 | map 16, square (7,0) facing east, column 0 row 4 | `stojanow-tower-lanes-terrain-fd5111f010b1.png` (area 9, 21, 28) |

#### tile set 8X8D8 block 17 (91)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:0117291b71193cfdb0364507184c25d468b9eac43b7d68a5e3a87aab78cff103` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 33 | map 30, square (1,1) facing south, column 1 row 6 | `kobold-escort-rib-end.png` (area 13) |
| `tile:16:01a60dfea8fac365c1ea014064cbf2b1b38da1bc8a6866c5ec275a19839c51dc` | 8X8D8 block 17 tile 41 over the ground colour 6 | map 30, square (1,1) facing east, column 10 row 7 | `kuto-catacomb-layered-cell-01a60dfea8fa.png` (area 13, 29) |
| `tile:16:04a5f8a88df073af060bcd31139f0ec52dc5c0d221c1743aa3db2df8de5f4919` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 17 | map 30, square (9,4) facing north, column 0 row 2 | `kuto-catacomb-joins-04a5f8a88df0.png` (area 13, 29) |
| `tile:16:0800ea58a6066c1e883fcc3e57d75b77e2a7b9bb57a35284e716763ac63b924d` | 8X8D8 block 17 tile 43 over the ground colour 6 | map 30, square (14,1) facing west, column 8 row 8 | `kuto-catacomb-layered-cell-0800ea58a606.png` (area 13, 29) |
| `tile:16:0d3e568fb2163918ecf6326d8d70eb5df743f25ab6db29e8253ef3b23fc25fc9` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 32 | map 30, square (5,6) facing north, column 9 row 6 | `kobold-return-far-floor-join.png` (area 13) |
| `tile:16:0dd1ae7bf511694e0c52fa3f1ec5f18df62709224d5dc013272ae431abf0f289` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 67 over sky colour 11 | map 30, square (1,3) facing east, column 3 row 4 |  |
| `tile:16:0e73b6c23972aec306a67d3db48c5fa02483ce482cac7c5cc62c80c9f0f69ab5` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 30 | map 30, square (8,5) facing north, column 8 row 6 | `kuto-catacomb-layered-cell-0e73b6c23972.png` (area 13, 29) |
| `tile:16:0fe2248bf92bca927be490c4a509808d89c899691ef5c820f7a10bcf64b81346` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 17 | map 30, square (3,2) facing south, column 9 row 3 | `kuto-catacomb-joins-0fe2248bf92b.png` (area 13, 29) |
| `tile:16:147435d63e84181798e0e6d15a8df3f8431d4b9418443cde8304f4029d9e40ed` | 8X8D8 block 17 tile 18 over 8X8D8 block 23 tile 20 | map 30, square (3,3) facing north, column 1 row 6 |  |
| `tile:16:14d354c6a3f14f18b4535b024ca84fbea91764bed81262f83cdbaab8d4f308f0` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 28 | map 30, square (2,2) facing east, column 9 row 8 | `kuto-catacomb-joins-14d354c6a3f1.png` (area 13, 29) |
| `tile:16:1859274033985102470e1249f099fef6dd0e2c2398b3e1f3b0cf030727f962b4` | 8X8D8 block 17 tile 58 over 8X8D8 block 17 tile 29 | map 30, square (4,2) facing west, column 4 row 5 | `kobold-caves-terrain-185927403398.png` (area 13) |
| `tile:16:1d5e729c23d88554c77209bbbcb52c46e789e13696353dd01dcae98cf6435d8c` | 8X8D8 block 17 tile 14 over 8X8D1 block 203 tile 1 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (0,4) facing north, column 10 row 5 |  |
| `tile:16:268c60bb531e3f161b603c7f9d9c5d363b1ffae3ac6b3ac9153755994391095f` | 8X8D8 block 17 tile 18 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (0,1) facing south, column 0 row 5 |  |
| `tile:16:3122eabc010c7bbfaf5ca6691cfc49cf064c86c8e4567e01b9620ed7d8249382` | 8X8D8 block 17 tile 18 over the ground colour 6 | map 30, square (0,1) facing south, column 0 row 6 | `kuto-catacomb-joins-3122eabc010c.png` (area 13, 29) |
| `tile:16:34653d0854f43f4416ce6c818c183ade3143c551f10f14f4cb4151a7fa962cee` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 2 | map 30, square (2,2) facing west, column 0 row 2 | `kuto-catacomb-joins-34653d0854f4.png` (area 13, 29) |
| `tile:16:34ed26aafef210f1b996b53c377ea963355e37cf97e759f016295372d69419fb` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 47 | map 30, square (1,1) facing east, column 10 row 4 | `kobold-escort-rib-left-upper.png` (area 13) |
| `tile:16:3d4b40ddeb8af9963ad9c349eb9a5afed54abe3b219c6e48b43ed21fac3afc1a` | 8X8D8 block 17 tile 57 | map 30, square (13,1) facing west, column 10 row 9 |  |
| `tile:16:3d50c00ab8fecfed3d90ff96c851bd86cbe3d21673449efc3a6c007b61b61fb0` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 36 | map 30, square (8,10) facing east, column 7 row 3 |  |
| `tile:16:40c2f4c05764725d651ce2d18a31119dc093d840599c18f916a7112797c3c260` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 0 | map 30, square (1,3) facing east, column 2 row 4 | `kuto-catacomb-joins-40c2f4c05764.png` (area 13, 29) |
| `tile:16:414b4a63bb6ca1989f22a4f5c5f69e289a0a94229235919eab50e7eeb4d0fba9` | 8X8D8 block 17 tile 50 over the ground colour 6 | map 30, square (4,1) facing west, column 1 row 6 | `kobold-silt-joins-414b4a63bb6c.png` (area 13) |
| `tile:16:41dea904bf1f7df40b00b2a1f22e3d64be4e9deef1eacb667771432b80d92497` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 47 | map 30, square (8,4) facing east, column 3 row 3 | `kuto-catacomb-joins-41dea904bf1f.png` (area 13, 29) |
| `tile:16:4265f90431329d71e0ac99e66c9e3e2da7572e345139af65732e654e0cf316ca` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 1 | map 30, square (1,2) facing east, column 8 row 3 | `kobold-escort-rib-right-crown.png` (area 13) |
| `tile:16:4904837be10d035aade38224813dd8b21d6b452097656994981b9146cc9d4bdb` | 8X8D8 block 17 tile 56 | map 30, square (13,1) facing east, column 0 row 9 |  |
| `tile:16:4a17e8fa31dbf667601fa08c8fe8249a9d8cd4acd7065c63e19b323c95011eea` | 8X8D8 block 17 tile 4 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (12,1) facing east, column 2 row 5 |  |
| `tile:16:4a2fa38c70e4304e02feb6631a514da2cd87af42ed5cd7759652a6a573580fa1` | 8X8D8 block 17 tile 5 over 8X8D8 block 17 tile 19 | map 30, square (3,6) facing north, column 9 row 5 |  |
| `tile:16:4b01f851d279b7a5d7228c68254bd3729179a9dce07a5ca2ed9462de014e3497` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 29 | map 30, square (1,1) facing east, column 10 row 5 | `kobold-escort-rib-left-shaft.png` (area 13) |
| `tile:16:4df0f4402919582202cd1f1d1417985e4aaa8433ec86ae11d2dbc4ab3b412ac2` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 19 | map 30, square (1,2) facing south, column 1 row 5 | `kuto-catacomb-joins-4df0f4402919.png` (area 13, 29) |
| `tile:16:4ee02821c898575f957239991b32aa0d6bd3d46038790165a09dc9f5425ae654` | 8X8D8 block 17 tile 45 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (14,3) facing north, column 3 row 5 |  |
| `tile:16:526f124a5cbb7de82cb6aae1adb6f3e439dc28142f3fbea2f0a33a7ea974437e` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 19 | map 30, square (3,2) facing west, column 2 row 5 | `kuto-catacomb-joins-526f124a5cbb.png` (area 13, 29) |
| `tile:16:58e2df47c41000a23ceb290895df77049fb54735e6891f6bd158ec718cb11917` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 34 | map 30, square (3,2) facing south, column 9 row 6 |  |
| `tile:16:5c5ff46751ec31ddaa4b4c3baf0ec7326884e1f5b9bc8d173fd62d9dc5c1b996` | 8X8D8 block 17 tile 11 | map 30, square (12,1) facing east, column 3 row 7 | `kobold-silt-joins-5c5ff46751ec.png` (area 13) |
| `tile:16:5d0f245e35a35e50e94c2e74147f73ae987b02d644eab4f9e3c43a98b18ca6a5` | 8X8D8 block 17 tile 34 | map 30, square (3,0) facing north, column 9 row 6 | `kobold-cave-silt-5d0f245e35a3.png` (area 13, 29) |
| `tile:16:60fabf9d7676a7487c45a00a48aadd3ace071373918ded746964863507357843` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 30 | map 30, square (8,5) facing north, column 7 row 6 | `kuto-catacomb-joins-60fabf9d7676.png` (area 13, 29) |
| `tile:16:612e9c6b4133e442a8fb430800a9647436109d286a1ddb3eacdb62d483c0c40b` | 8X8D8 block 17 tile 27 | map 30, square (2,0) facing south, column 7 row 6 | `wild-cave-chamber-612e9c6b4133.png` (area 13, 27, 29) |
| `tile:16:63d1d7ce16dc81313aede5c5278ac4d60f69e145a0660c04247679f435760ddf` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 28 | map 30, square (2,2) facing west, column 1 row 8 | `kuto-catacomb-joins-63d1d7ce16dc.png` (area 13, 29) |
| `tile:16:65d6bb97e1ae8c5ee2df62a2e30413660dce61f0a6fc97b7dc92517113ff034a` | 8X8D8 block 17 tile 33 | map 30, square (2,0) facing south, column 1 row 6 | `wild-cave-minotaur-65d6bb97e1ae.png` (area 13, 27, 29) |
| `tile:16:6813dd72c66b17eb4da89b009952d72f12490ba07f186f3270f23fa7a26381c3` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 3 | map 30, square (2,2) facing east, column 9 row 5 | `kuto-catacomb-joins-6813dd72c66b.png` (area 13, 29) |
| `tile:16:6e239abd10bbb3ceb51e3976e4e816233cbba9dd9cba5ef642bda9d3339c4a00` | 8X8D8 block 17 tile 5 over sky colour 11 | map 30, square (12,1) facing east, column 3 row 4 |  |
| `tile:16:6ebfac4e621c82065e04712a06b3b924b71ff39a170c1d910e5f9ced4ff618df` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 32 | map 30, square (2,1) facing south, column 6 row 6 | `kuto-catacomb-joins-6ebfac4e621c.png` (area 13, 29) |
| `tile:16:737a315cbcaf507e797dfa6d777081e785f010a937663cdbd05d8ffb71c32709` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 47 | map 30, square (3,2) facing south, column 9 row 4 |  |
| `tile:16:75b02ecc37ae684cf4db0022ad94e1bead3974aaa98939471d9390a705780e8a` | 8X8D8 block 17 tile 8 over sky colour 11 | map 30, square (1,3) facing east, column 2 row 3 |  |
| `tile:16:7cf72af40c233e9369dce6ee1dbcad381e8833f78f1ab073d644c9d0f9d45318` | 8X8D8 block 17 tile 12 | map 30, square (14,1) facing west, column 7 row 7 |  |
| `tile:16:84b82e53b886dbb2dd0fdd93a29b758588e0bbcb775b209f19db0e86a26d7e33` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 36 | map 30, square (9,3) facing west, column 1 row 3 | `kobold-cave-exit-west-spur-crest.png` (area 13) |
| `tile:16:84bd9f932d01acd7802f14ad00019ab825662ed48286b3faa9a33c37557bdafb` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 19 | map 30, square (2,2) facing south, column 2 row 5 | `kuto-catacomb-joins-84bd9f932d01.png` (area 13, 29) |
| `tile:16:85552df26e60810012bc746f79958ed21cfac414be828a681a557d8f5a69ac83` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 1 | map 30, square (5,6) facing north, column 9 row 3 | `kobold-return-wide-face-crown.png` (area 13) |
| `tile:16:881d7b56c623eaa0db5b4074349cadf6ae994c2113b75d72b32b236ffed6421f` | 8X8D8 block 17 tile 40 over the ground colour 6 | map 30, square (3,1) facing west, column 0 row 7 | `kobold-caves-terrain-881d7b56c623.png` (area 13) |
| `tile:16:8869d6c43d92e6692557abcbec2a1a9eb7089d2e979c3de9144e230c441f88dc` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 30 | map 30, square (9,4) facing north, column 1 row 7 | `kuto-catacomb-joins-8869d6c43d92.png` (area 13, 29) |
| `tile:16:901bb0a0cdefda412230f4dc0aa5eeef7fc2cc701335562f7ca75a059abaa5bb` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 1 | map 30, square (9,3) facing west, column 0 row 3 | `kuto-catacomb-joins-901bb0a0cdef.png` (area 13, 29) |
| `tile:16:93578d621fc2b1971332d5aec3acb4550908084cee97cca0719404aba2c8fdc3` | 8X8D8 block 17 tile 14 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (4,1) facing south, column 10 row 5 |  |
| `tile:16:93e0d24299f4f009fb5a9226e1fccd627d38910bb502b608add84c53ff6d61fd` | 8X8D8 block 17 tile 32 | map 30, square (2,0) facing south, column 6 row 6 | `wild-cave-chamber-93e0d24299f4.png` (area 13, 27, 29) |
| `tile:16:9466b0967e96d56bee7ca80b53dd1ec9a110a1f86fca35439959f14250ea644a` | 8X8D8 block 17 tile 48 | map 30, square (3,1) facing west, column 0 row 3 | `kuto-catacomb-layered-cell-9466b0967e96.png` (area 13, 29) |
| `tile:16:9ca74205126cf6c661c2e2c31dd0cb0f4426665e9dcc4822ad1bf6cbd975791a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 35 | map 30, square (8,5) facing east, column 1 row 6 | `kuto-catacomb-joins-9ca74205126c.png` (area 29) |
| `tile:16:9eb8999a6731352266f87fd46b92f21f0ce98dd7046bdb2e850132c0e9abbbac` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 47 | map 30, square (1,2) facing east, column 8 row 4 | `kobold-escort-rib-right-upper.png` (area 13) |
| `tile:16:a2fd65729327cc7c2411302751caa1e8b2907fe0c101ca599873a1bac2e604fd` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 36 | map 30, square (1,1) facing east, column 10 row 3 | `kuto-catacomb-joins-a2fd65729327.png` (area 13, 29) |
| `tile:16:a46e5434e8f85141bd5a773d4e0787dc436ce13222a6f15abee7758c8177ccbd` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 0 | map 30, square (3,1) facing west, column 0 row 4 | `kuto-catacomb-layered-cell-a46e5434e8f8.png` (area 13, 29) |
| `tile:16:a60d20d873eb57acae0fd1e25105211bca6132b89287fcc49ae119367d950dac` | 8X8D8 block 17 tile 14 over the ground colour 6 | map 30, square (3,1) facing south, column 7 row 6 | `kuto-catacomb-joins-a60d20d873eb.png` (area 13, 29) |
| `tile:16:a6bde3cfae4c8aadc2991d888c483b1b8ed93520dd1b475edf3de3f99425a620` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 1 | map 30, square (2,2) facing south, column 2 row 2 | `kuto-catacomb-joins-a6bde3cfae4c.png` (area 13, 29) |
| `tile:16:aa8526e1ed071d69c2ac166bdde29f7d19edb547902097e0ffb59667c1390f2a` | 8X8D8 block 17 tile 58 over 8X8D8 block 17 tile 19 | map 30, square (0,1) facing east, column 9 row 5 | `kobold-cave-exit-outer-slab.png` (area 13) |
| `tile:16:ae337ef64c6c5b5e365cc6868affafecbe58d8c65c9e1cbed1ee88653a7e004c` | 8X8D8 block 17 tile 8 over the ground colour 6 | map 30, square (3,2) facing west, column 2 row 7 | `kobold-caves-terrain-ae337ef64c6c.png` (area 13) |
| `tile:16:b065e3c5ce60a1a2345e3fbc95bfe44ba3027d9104e7f56305c1888333759776` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 28 | map 30, square (1,1) facing east, column 10 row 6 | `kobold-escort-rib-left-base.png` (area 13) |
| `tile:16:b41d4656ebe51f0f92604274c4f462943cd6d3affe22758c9a4504998a144eb1` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 33 | map 30, square (9,9) facing west, column 1 row 6 | `kobold-return-near-column.png` (area 13) |
| `tile:16:bd5cb1a28f45cba9ca06a9a506c9eab644fe1d9319cd840ba07222a67acc2e40` | 8X8D8 block 17 tile 44 | map 30, square (13,2) facing north, column 5 row 5 |  |
| `tile:16:bd9ea1901d9b6de036f5842777a04222c7e67c37d2dc248bca7016a8ccea01f5` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 30 | map 30, square (8,4) facing east, column 2 row 7 | `kuto-catacomb-joins-bd9ea1901d9b.png` (area 13, 29) |
| `tile:16:be4566a59e158942a3eb34fbc5c44badfab885f494f447cc5d9cb9c1b939d64f` | 8X8D8 block 17 tile 58 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (0,0) facing south, column 1 row 5 |  |
| `tile:16:bfae91a5b6216d39e1390b44f91c6472952c8b868c07ded7ec0b8b63abddd4c6` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 1 | map 30, square (3,2) facing west, column 2 row 3 | `kobold-cave-exit-west-meeting-rib.png` (area 13) |
| `tile:16:c0b1186296f774376cf3e28e4b94cd8be6c7b9c2e1440f22f3ce61a6cf3bab6f` | 8X8D8 block 17 tile 46 over 8X8D8 block 17 tile 29 | map 30, square (15,1) facing west, column 6 row 5 | `kuto-catacomb-layered-cell-c0b1186296f7.png` (area 29) |
| `tile:16:c34fec648f462c1d4b85cab1cd42638c53bb8e15a4dabe41b5b279eada2f0348` | 8X8D8 block 17 tile 35 | map 30, square (2,0) facing south, column 0 row 7 | `kobold-cave-silt-c34fec648f46.png` (area 13, 29) |
| `tile:16:c52e8d1b619bdf358a9cff41324f1cb008826bd8c3d3731a7495695c00d77b42` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 17 | map 30, square (6,5) facing east, column 9 row 3 |  |
| `tile:16:c5ccd45d08c65587436bcef3cabe12dfcc83b7d08879b6a3d442862f1d69ed68` | 8X8D8 block 17 tile 7 over the ground colour 6 | map 30, square (1,2) facing east, column 8 row 7 | `kuto-catacomb-layered-cell-c5ccd45d08c6.png` (area 13, 29) |
| `tile:16:cc932c5b2c7ca162b09b0762fbeb1a4c011aa5ccb8b9a4c0f47064ccff3fc9a7` | 8X8D8 block 17 tile 4 over the ground colour 6 | map 30, square (12,1) facing east, column 2 row 6 | `kobold-silt-joins-cc932c5b2c7c.png` (area 13) |
| `tile:16:cf54e1993881e2dc8aaba4da672c2701e10601892fc137082f6dc14c35a60bfd` | 8X8D8 block 17 tile 47 | map 30, square (2,0) facing east, column 9 row 4 | `wild-cave-minotaur-cf54e1993881.png` (area 13, 27, 29) |
| `tile:16:d11f67c9a802f42a762b109c45cab63f885f512f7e97dad63b29729de5d77cc4` | 8X8D8 block 17 tile 46 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (15,2) facing west, column 9 row 5 |  |
| `tile:16:d22007dbcda0ff82aa0379a2a3da5afeafeb05e090932660f51d07feca8e5aa3` | 8X8D8 block 17 tile 8 over 8X8D8 block 17 tile 17 | map 30, square (6,6) facing east, column 2 row 3 | `kobold-return-outer-rib-head.png` (area 13) |
| `tile:16:d4731d2c85b6cee14876895097463ec94420cb59b6ad24c8fd45750895875f2b` | 8X8D8 block 17 tile 36 | map 30, square (2,0) facing east, column 7 row 3 | `wild-cave-minotaur-d4731d2c85b6.png` (area 13, 27, 29) |
| `tile:16:d5dd561a755316e3b5e425928c6150770623b55acd123912cf05e5188593588a` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 47 | map 30, square (2,3) facing east, column 1 row 4 | `kuto-catacomb-joins-d5dd561a7553.png` (area 13, 29) |
| `tile:16:d66b6691a62a1c10af5820513f2107d4f6e4ca223d1395cc03a98b331dd8ba75` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 19 | map 30, square (1,2) facing east, column 8 row 5 | `kobold-escort-rib-right-shaft.png` (area 13) |
| `tile:16:daf45dfae200642c3b1ef6d0a67ae4bc331c3a05f3b006d757837e2826d801f5` | 8X8D8 block 17 tile 4 over sky colour 11 | map 30, square (12,1) facing east, column 2 row 3 |  |
| `tile:16:dda5a8482681ed15b1aabb9de4b4701f152dd812bc71a4a50d078b008e7fe5a1` | 8X8D8 block 17 tile 5 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 30, square (12,1) facing east, column 3 row 5 |  |
| `tile:16:ddefb9dc375773174835a079a2b247bfdd6fba94874b355596fcc7cb17130b11` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 34 | map 30, square (6,4) facing south, column 6 row 6 | `kuto-catacomb-joins-ddefb9dc3757.png` (area 13, 29) |
| `tile:16:e156e3b75f1bd9aa8ae5fedb9896234aac1d9bdef7a587539ff52d3c1054b598` | 8X8D8 block 17 tile 5 over the ground colour 6 | map 30, square (12,1) facing east, column 3 row 6 |  |
| `tile:16:e270e53d7eec3394d611df23d149d9293787bf9773f32f132e5ba379a8818e33` | 8X8D8 block 17 tile 51 over the ground colour 6 | map 30, square (0,1) facing east, column 9 row 6 | `kobold-escort-masonry-foot.png` (area 13) |
| `tile:16:e510f228d95b25f5d705e4d02985f39ae32d54a283dfbb38d8c0a6bcd74fc740` | 8X8D8 block 17 tile 49 over 8X8D8 block 17 tile 1 | map 30, square (2,2) facing east, column 9 row 3 | `kuto-catacomb-joins-e510f228d95b.png` (area 13, 29) |
| `tile:16:e9fdb7054409a114274d22b98c3bd30972c7d88486be0d8f714060aa5723aa2c` | 8X8D8 block 17 tile 4 over 8X8D8 block 17 tile 29 | map 30, square (2,6) facing north, column 10 row 5 |  |
| `tile:16:f226637561a669e2196796d0815ff7829a1d095df55c82efd7f9a4fcc3ecfe31` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 28 | map 30, square (3,1) facing west, column 0 row 6 | `kobold-escort-rib-right-base.png` (area 13) |
| `tile:16:f25dd951d3af0ad8f6f3309ad874e6c600d4b22022aeb8f4d2eab811a2bb66b6` | 8X8D8 block 17 tile 14 over 8X8D8 block 23 tile 21 | map 30, square (1,3) facing north, column 9 row 6 |  |
| `tile:16:fa0785a9edf76eac267235316aff7e86ad5957c9b8155a09bf25193d7b2b6e90` | 8X8D8 block 17 tile 5 over 8X8D8 block 17 tile 5 over 8X8D8 block 17 tile 29 | map 30, square (4,6) facing north, column 6 row 5 |  |
| `tile:16:fa8c0ce1c541b2af2f53e5309d502256317e3a0b116a9d8f33dec598bef0f29f` | 8X8D8 block 17 tile 42 over the ground colour 6 | map 30, square (12,1) facing east, column 2 row 8 | `kuto-catacomb-layered-cell-fa8c0ce1c541.png` (area 13, 29) |
| `tile:16:fb089b8ff7a102450c65e507f291b6b165a0ea49342abf990afb315bee1127ed` | 8X8D8 block 17 tile 7 over 8X8D8 block 17 tile 29 | map 30, square (3,1) facing west, column 0 row 5 | `kuto-catacomb-layered-cell-fb089b8ff7a1.png` (area 13, 29) |
| `tile:16:fc3fa1490fa932744f194d3d32a5aac1bcc9d2c5ffcb677eee5c17afc02e127b` | 8X8D8 block 17 tile 16 over 8X8D8 block 17 tile 3 | map 30, square (2,2) facing east, column 10 row 2 | `kobold-pool-spur-terrain-fc3fa1490fa9.png` (area 13) |
| `tile:16:ff895827d85d886bb33f9c2f77b12a063130cf5089a6c383c9ac3b55ec22efa1` | 8X8D8 block 17 tile 14 over 8X8D8 block 17 tile 29 | map 30, square (1,1) facing south, column 1 row 5 | `kuto-catacomb-joins-ff895827d85d.png` (area 13, 29) |
| `tile:16:ff913b0f012f5419137db19c5e072d3b4b6d5d867ad1c85270a3f7f85a426645` | 8X8D8 block 17 tile 18 over 8X8D8 block 17 tile 17 | map 30, square (9,4) facing north, column 0 row 1 | `kuto-catacomb-joins-ff913b0f012f.png` (area 13, 29) |

#### tile set 8X8D8 block 20 (25)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:055a11adb286ee5d2fc8e0f5cbbba62bb74aa6ba686c8b0d8c7bd0a36ed0cc18` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (8,9) facing east, column 0 row 7 |  |
| `tile:16:105ea3fc7fa9165bd52590a9d6377ddf45ddcdb4fdcdec3f95ccea846518e09d` | 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 42 | map 16, square (5,0) facing north, column 10 row 7 |  |
| `tile:16:1d3c40ff64f533ee7914ef97fe6a69a29df7a1d3c8dd8ee6f52e58b41aac57f2` | 8X8D8 block 20 tile 47 over 8X8D8 block 9 tile 29 | map 16, square (8,8) facing north, column 10 row 7 |  |
| `tile:16:1ef701f8169d94212816c2c8abf454bae1dbbdf943aee059257360b66728a722` | 8X8D8 block 20 tile 48 over 8X8D8 block 23 tile 34 | map 16, square (5,0) facing north, column 9 row 7 |  |
| `tile:16:1fb812974078d5aa90dc8407744dd181a5044d78f281d9d4ac458ee918324719` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 27 over the ground colour 6 | map 16, square (6,8) facing south, column 0 row 7 | `mendor-library-west-rooms-terrain-1fb812974078.png` (area 2) |
| `tile:16:366e1ab77203b02ffe234f64b976aab5dd5d2f6106a56804e75f580defb56291` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 40 | map 16, square (5,1) facing east, column 0 row 7 |  |
| `tile:16:3d99a068ea8e6fb313ca883391d15e770a8ac8c232dc4e5d00fca2f5e88b9600` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 23 tile 35 | map 16, square (5,0) facing east, column 2 row 7 |  |
| `tile:16:4400e9167a3ab4833e4397e31b6d2c43dcd2b26cd3c457d20cc62b056f5a6b7d` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 34 | map 16, square (6,1) facing west, column 10 row 7 |  |
| `tile:16:4a6b9d218c44eb528b7d83d5e9faa641d2c9ced1ffc4cc5a670fdf4571ac0d8b` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D1 block 203 tile 36 over the ground colour 6 | map 16, square (10,8) facing west, column 8 row 8 | `kuto-street-joins-4a6b9d218c44.png` (area 2, 29) |
| `tile:16:4b2f5751774cd086d55ecf47af6fd155e6c00c95159c0081590bb8d46b62c9c9` | 8X8D8 block 20 tile 48 over 8X8D8 block 9 tile 30 | map 16, square (10,8) facing north, column 0 row 7 |  |
| `tile:16:4eee654eb7bc8ab798dbd2212333e177f100fa9083c056cecd20fb95e94ca493` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 16, square (8,8) facing east, column 3 row 7 |  |
| `tile:16:6a35bed254b4531cab39d077ae369c497781872c245696ee7516802670db7c65` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 34 | map 16, square (6,0) facing north, column 1 row 7 |  |
| `tile:16:6f81a850e05078537ce4e8fe28f4b13dfdf609164a8eafd6c1687cda27051710` | 8X8D8 block 20 tile 46 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (13,13) facing north, column 3 row 5 | `textile-waterfront-crossing-terrain-6f81a850e050.png` (area 2) |
| `tile:16:6fbe8db05a8c5ad6cb962aae0f1437058c8ff04987b4806b0c76ca824ca9be7d` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 49 over 8X8D1 block 203 tile 23 over the ground colour 6 | map 16, square (3,2) facing east, column 10 row 7 | `kuto-street-joins-6fbe8db05a8c.png` (area 29) |
| `tile:16:802eaa95697c55e8054146a63a5e1d3ae68f2fb66322679ede10f7fddc20afe7` | 8X8D8 block 20 tile 49 over 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 40 | map 16, square (5,0) facing east, column 3 row 7 |  |
| `tile:16:815527810550556073878310e47ac1b9cfafc756f17571b34f7d469229603ee4` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 40 | map 16, square (4,0) facing east, column 4 row 6 |  |
| `tile:16:84897dde121a467526a8172395426e19541c000165c965181eba9b9c525abfaa` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 9 tile 22 | map 16, square (7,8) facing east, column 4 row 6 |  |
| `tile:16:9c84dd3b3cdd3958c430b0367abaa46d2103a03bd51431435e98af97e56c3695` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 37 | map 16, square (1,15) facing north, column 1 row 7 |  |
| `tile:16:9e65c048e24257626e8f3dcf282746653d70eb9345ba911815c4cea34fd1111d` | 8X8D8 block 20 tile 44 over 8X8D8 block 20 tile 44 over 8X8D1 block 203 tile 15 over the ground colour 6 | map 16, square (10,8) facing west, column 7 row 7 | `kuto-street-joins-9e65c048e242.png` (area 2, 29) |
| `tile:16:a3076af3dfe01eb8c1d7593ede29501e310ff4d60a4a5928f6b1418451b315fb` | 8X8D8 block 20 tile 48 over 8X8D1 block 203 tile 18 over the ground colour 6 | map 16, square (5,0) facing west, column 0 row 7 | `kuto-street-joins-a3076af3dfe0.png` (area 2, 29) |
| `tile:16:a64581d6a51a85308188d1f97a30855b6ab72f87e76f2cb0d4704618b242e2d5` | 8X8D8 block 20 tile 47 over 8X8D8 block 20 tile 47 over 8X8D8 block 23 tile 38 | map 16, square (6,0) facing west, column 8 row 8 |  |
| `tile:16:aef5a210cde1074047705f1e34b4d4dfdefa1be92112c0931e966d77e3279104` | 8X8D8 block 20 tile 48 over 8X8D8 block 20 tile 48 over 8X8D8 block 9 tile 33 | map 16, square (8,8) facing east, column 2 row 7 |  |
| `tile:16:c104219ccd769bc7fb12de689c9613b77e67c5b6bd2601d23fb6c9a1583b2db2` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 40 | map 16, square (1,13) facing west, column 0 row 7 |  |
| `tile:16:e51182bf603035bb075499bef5a3c4d946430d64e84795585dc9e2aa81583439` | 8X8D8 block 20 tile 44 over 8X8D8 block 23 tile 39 | map 16, square (1,13) facing south, column 7 row 6 |  |
| `tile:16:ef495687915380f440f5501931b8b57585eb33cf8ff39b3261a64ce3eee59506` | 8X8D8 block 20 tile 49 over 8X8D8 block 23 tile 39 | map 16, square (1,0) facing west, column 10 row 7 |  |

#### tile set 8X8D8 block 23 (15)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:16:02cadbb8b38f14b780218b95568d64d0fff7630569981a83a4e8ace5869553f9` | 8X8D8 block 23 tile 45 over 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,7) facing west, column 4 row 5 |  |
| `tile:16:05dfdd7e1cc025934aa123746421cc62d22cb32949569570b7dc475c9de681e1` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (15,4) facing south, column 0 row 5 |  |
| `tile:16:102f8e21877bd947c60c540c5f64bf15612fef66ec0af7863e2acab2e879c349` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 6 row 5 |  |
| `tile:16:2336e8952d206f9189cb5d3a2e96bd04d1ca0bc543c7767564b5b21eb60320aa` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 33 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (11,0) facing north, column 5 row 5 |  |
| `tile:16:264b6cce9ee17a9f25ee27c5a93521e255cf8280048b772dc855b074eb90bc14` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 32 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 10 row 5 |  |
| `tile:16:28b5fdb65a19f4c1c2e11be815690f5bbd50f9dc5d3094db1146840a37d31d50` | 8X8D8 block 23 tile 45 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (1,6) facing west, column 1 row 5 |  |
| `tile:16:5152a0f4abbd7c1e9995b75268ec33fa3046a727bf2986f52bf7f14e992210b9` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 49 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 8 row 5 |  |
| `tile:16:5dff3db8e9d00fd872a3762699bb9d4c7c07d2c66a193c2a3d66f5d9884d97a4` | 8X8D8 block 23 tile 45 over 8X8D8 block 9 tile 41 over 8X8D8 block 9 tile 6 | map 16, square (6,0) facing east, column 1 row 5 |  |
| `tile:16:81b0644b42d1bfaabf669625a2eb0d1171629e8d83dfc143a939146233254986` | 8X8D8 block 23 tile 43 over 8X8D8 block 23 tile 45 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (2,15) facing west, column 4 row 5 |  |
| `tile:16:995407cf5606fc02058c1131c1ef44af2bc9cd820bc805924de781c9403d8287` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,2) facing south, column 9 row 5 |  |
| `tile:16:babc640b6f7d148642c90ade0c0d417f4ed83a55d6875fdae42531fd1a088056` | 8X8D8 block 23 tile 43 over 8X8D8 block 20 tile 30 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (10,0) facing east, column 2 row 5 |  |
| `tile:16:bc40ea3be142942d5e433d5b75d7dace8cc2aa0c544f4123b7056a5a69d7977e` | 8X8D8 block 23 tile 21 | map 30, square (5,0) facing north, column 9 row 6 |  |
| `tile:16:bd02818637eddbcdc983313c9e95908421925b13365587ff74cecf4ef14674ad` | 8X8D8 block 23 tile 44 over 8X8D8 block 20 tile 33 over the horizon row (three rows of sky 11, one of 15, two of 7, two of ground 6) | map 16, square (0,5) facing south, column 7 row 5 |  |
| `tile:16:d326cc9fabded3214b6092f46a582ccf73115a244f08ec2e00172fefe1c7f137` | 8X8D8 block 23 tile 20 | map 30, square (4,0) facing north, column 10 row 6 |  |
| `tile:16:dd03c2abc68d0f5e0f683edfdc06835035c340badeac07bbde4ffec00e60293d` | 8X8D8 block 23 tile 43 over 8X8D8 block 9 tile 43 | map 16, square (6,0) facing north, column 9 row 5 |  |

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
| `tile:26:bc40ea3be142942d5e433d5b75d7dace8cc2aa0c544f4123b7056a5a69d7977e` | 8X8D7 block 23 tile 21 | map 26, square (4,2) facing south, column 6 row 6 |  |
| `tile:26:d326cc9fabded3214b6092f46a582ccf73115a244f08ec2e00172fefe1c7f137` | 8X8D7 block 23 tile 20 | map 26, square (4,2) facing south, column 4 row 6 |  |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 3905 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 153 |
| first-person cells of an area whose reading is not confirmed | 1166 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 187 |
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
| 8X8D8 block 17 | 13, 22, 23, 24, 26, 38, 66, 68, 69 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 11 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 18 | 38 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 20 | 2, 3, 4, 22 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 20 | 25 | no symbol of the wall definitions loaded with its block names it |
| 8X8D8 block 23 | 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68 | wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window |
| 8X8D8 block 23 | 41 | no symbol of the wall definitions loaded with its block names it |

## Narrated passages with nothing to see

Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.
