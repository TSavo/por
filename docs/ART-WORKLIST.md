# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 120 confirmed cells awaiting art now.**

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
| Remaining, all kinds | 120 |
| First-person cells to do | 120 |
|   of which one stored tile | 9 |
|   of which one tile over a solid colour | 49 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 62 |
|   of which the same pixels already have art of yours in another area | 81 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 6852 |
|   accounted for by the tool | 6716 |
| Battlefield keys in the manifests | 83 |
|   that are one stored cell of a battlefield picture | 78 |
| Stored 8 by 8 tiles | 3016 |
|   blank | 9 |
|   distinct pictures among the rest | 1333 |
|   with art in some area, alone or over a solid colour | 2495 |
|   without (the catalogue's 720 when it was written) | 512 |
|     of those, no map can show | 421 |
|     of those, shown only together with other tiles, never alone | 7 |
|     of those, shown alone in some area | 84 |

## Where each area stands

| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | yes | 406 | 308 | 0 | 321 of 321 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 385 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 580 | 382 | 0 | 406 of 406 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | not yet | 300 | 100 |  | 102 of 117 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | not yet | 393 | 91 |  | 114 of 176 (17 as first views of the next area, 6 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 182 | 140 | 42 | 148 of 148 (8 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | not yet | 269 | 64 |  | 104 of 162 (40 as first views of the next area) |
| 8 | Phlan City Hall | yes | 405 | 295 | 0 | 305 of 305 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 287 | 150 | 0 | 150 of 150 |
| 10 | Valhingen Graveyard | yes | 2452 | 890 | 0 | 902 of 902 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 405 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 313 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 150 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 186 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 350 | 194 | 61 | 226 of 226 (25 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | not yet | 395 | 180 |  | 187 of 188 (7 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 500 | 253 | 0 | 275 of 275 (22 as WebGL wall materials) |
| 22 | Yarash's Pyramid | yes | 140 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 126 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 312 | 217 | 0 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 51 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 302 | 216 | 17 | 285 of 285 (67 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 50 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 194 | 107 | 0 | 108 of 108 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 640 | 0 | 654 of 654 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 142 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 6: Valjevo Castle (42)

Map 6; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 6, square (3,0) facing south, column 5 row 5 | `wilderness-sides-screen-25-d20d585641c6.png` (area 0, 1, 2, 4, 7, 9, 13, 14, 15, 16, 17, 18, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (2)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:45f5e38f7219ffc606ba569d2abe5be146d8630bf8dcde674e3c28c3ce4e621a` | 8X8D1 block 203 tile 17 over sky colour 0 | map 6, square (3,0) facing north, column 0 row 0 | `valjevo-scope4-screen-4-45f5e38f7219.png` (area 0, 2, 4, 9, 10, 14, 15, 18, 20, 29) |
| `tile:6:b03fbca109ab749692421d27e7e24a728523604f8fd1580a98748b76cb2ce15c` | 8X8D1 block 203 tile 16 over sky colour 0 | map 6, square (3,0) facing south, column 10 row 0 | `valjevo-scope4-screen-4-b03fbca109ab.png` (area 0, 2, 4, 9, 10, 14, 15, 18, 20, 29) |

#### tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:f9769bbced9df6b26e4835ee46efdde03db708812b8d4897d09fbb2039c8e6cc` | 8X8D1 block 203 tile 16 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (9,0) facing west, column 6 row 4 | `valjevo-scope4-screen-4-f9769bbced9d.png` (area 4) |

#### tile set 8X8D5 block 241 (19)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:04836a293e609ba63f00a8ea91daff078a36b261bdfe66c02c4a25dda5f27e1c` | 8X8D5 block 241 tile 39 over sky colour 0 | map 6, square (4,9) facing east, column 10 row 2 | `valjevo-scope4-screen-4-04836a293e60.png` (area 4) |
| `tile:6:0aac84aaaedf81576bc43833d31b2527a862b0aa25a6092920404ffa90b846cb` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (4,11) facing north, column 10 row 3 |  |
| `tile:6:0f6eabbe54e88f21a2dc14a9f75bd6030a546059e15d4dc2309ff8b7a42f5082` | 8X8D5 block 241 tile 65 over sky colour 0 | map 6, square (3,0) facing north, column 10 row 0 | `valjevo-tower-hall-terrain-0f6eabbe54e8.png` (area 0, 4, 7) |
| `tile:6:176faa53868619eb5587f27886a3c89bcc01851f2e998b0b8328f516e6dd436c` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 0 | map 6, square (4,7) facing south, column 5 row 4 | `valjevo-scope4-screen-4-176faa538686.png` (area 4) |
| `tile:6:18a18a72e4859362183cce0d2d9574c7fa26182fd5f5baed8267df085e917cd1` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 0 | map 6, square (4,7) facing south, column 6 row 4 | `valjevo-scope4-screen-4-18a18a72e485.png` (area 4) |
| `tile:6:214e6fd7ba362dedf6bf8eb4deae2afecf0a8dc4bc4783e9a73fbfe00b7aefc5` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (4,10) facing south, column 0 row 3 |  |
| `tile:6:24bb00ef62c14720f6b75173096fdbd228709d9ee5ab58b646ab89ed585de4a4` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 0 | map 6, square (4,8) facing south, column 6 row 4 | `valjevo-scope4-screen-4-24bb00ef62c1.png` (area 4) |
| `tile:6:277335998ae644a33dafc1c4ce9d982c0827eb0410a7287ca66690a4fe00b623` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (4,11) facing north, column 4 row 4 |  |
| `tile:6:710cb137fdb127903fe9e3b52b1140ec2c0a8792e5c17cb7f64029af5a79a496` | 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (2,2) facing north, column 10 row 3 | `valjevo-scope4-screen-4-710cb137fdb1.png` (area 4) |
| `tile:6:76b41f0cdc6578c287ba79592b23065544ce123c4f9ec8724e8d312657280772` | 8X8D5 block 241 tile 66 over sky colour 0 | map 6, square (3,0) facing south, column 0 row 0 | `valjevo-tower-hall-terrain-76b41f0cdc65.png` (area 0, 4, 7) |
| `tile:6:80b2c3241bfb571afd127db227947dbe6a09a72650dd270945b20e5d47036cf3` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (4,10) facing north, column 3 row 3 |  |
| `tile:6:8375772bd10ffc5494e66d81aefee21ce250263b5fdf174bd780dccb389a1e49` | 8X8D5 block 241 tile 41 over sky colour 0 | map 6, square (4,9) facing east, column 9 row 2 | `valjevo-scope4-screen-4-8375772bd10f.png` (area 4) |
| `tile:6:995d92c29ba324909e4b9f9955ff22ce714acb560baf17f1b598064198459203` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 0 | map 6, square (4,8) facing south, column 5 row 4 | `valjevo-scope4-screen-4-995d92c29ba3.png` (area 4) |
| `tile:6:ad6a37d79ac1c91c0ee850a86c0164c2f02d1c72a1c027cabc277d6fed4a0412` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 15 | map 6, square (4,11) facing east, column 3 row 4 | `valjevo-scope4-screen-4-ad6a37d79ac1.png` (area 4) |
| `tile:6:be3e782c7d9f268631c074a609460b9bbcd3a4ede4e4053836fe388d7fc69c08` | 8X8D5 block 241 tile 66 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (11,1) facing south, column 4 row 4 | `valjevo-scope4-screen-4-be3e782c7d9f.png` (area 4) |
| `tile:6:d05e4db7f6564c6aa5a34c452a27fb83c5934c5c35803789cffca5a17f2db32b` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 0 | map 6, square (4,9) facing south, column 8 row 2 | `valjevo-scope4-screen-4-d05e4db7f656.png` (area 4) |
| `tile:6:d5d509dc7afe4adde9e98b7f9076ac5c316e9e4d4df8299e9ca271b66812efca` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 4 | map 6, square (4,10) facing north, column 2 row 3 | `valjevo-scope4-screen-4-d5d509dc7afe.png` (area 4) |
| `tile:6:e4068d2375541c21af0134e9955f6ff86492a0d6ac66e9bf581ab1e8ce32d329` | 8X8D5 block 241 tile 66 over 8X8D5 block 241 tile 49 over sky colour 0 | map 6, square (2,7) facing south, column 1 row 4 | `valjevo-scope4-screen-4-e4068d237554.png` (area 4) |
| `tile:6:edcd5c1295b47441c47626bcb799733ccadcbf827cab3851b3121d3a0f012a89` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 14 | map 6, square (4,10) facing west, column 9 row 2 | `valjevo-scope4-screen-4-edcd5c1295b4.png` (area 4) |

#### tile set 8X8D5 block 242 (19)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:6:0db7c87e510e6c6cef111f2299563211c786f1ebea213f85bb5e20e2c44f7344` | 8X8D5 block 242 tile 19 over sky colour 0 | map 6, square (5,0) facing south, column 2 row 3 | `valjevo-scope4-screen-4-0db7c87e510e.png` (area 4) |
| `tile:6:0e0548cc21e50d283a67a28526df1d28ada653da62235cabed3760d055d3e5d8` | 8X8D5 block 242 tile 20 over sky colour 0 | map 6, square (5,0) facing south, column 7 row 3 | `valjevo-scope4-screen-4-0e0548cc21e5.png` (area 4) |
| `tile:6:11718963cc1006db99f7bf3e12ee8f53dc3a571bf74d8028aa6998a58ffe721e` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 66 over sky colour 0 | map 6, square (4,1) facing north, column 2 row 2 | `valjevo-scope4-screen-4-11718963cc10.png` (area 4) |
| `tile:6:172e0024a263af25489f60756580ce5643482d4d9d8e5457034a57c2c81ffb59` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 65 over sky colour 0 | map 6, square (4,0) facing south, column 8 row 2 | `valjevo-scope4-screen-4-172e0024a263.png` (area 4) |
| `tile:6:24c774ef176aab5c5274d158d0b5f9cf177e64a61b50c7f5ba6f3e4ac17d0b11` | 8X8D5 block 242 tile 36 over sky colour 0 | map 6, square (4,0) facing south, column 0 row 3 | `valjevo-scope4-screen-4-24c774ef176a.png` (area 4) |
| `tile:6:431eff9844ad93a53fef4ef7cfdbb6269b4e939cb491b68b6d44071280f8c7b9` | 8X8D5 block 242 tile 36 over 8X8D5 block 241 tile 40 over sky colour 0 | map 6, square (4,7) facing south, column 4 row 4 |  |
| `tile:6:441d53b35e5fb372342d02edc2f8177ca5d7b0147d9aaa93365865887281960d` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 0 | map 6, square (6,7) facing south, column 9 row 4 |  |
| `tile:6:487b9fa3c83afa664c4d163c534ce90d5f2d1baab210d849b63f902e00e23bf5` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D1 block 203 tile 17 over sky colour 0 | map 6, square (5,0) facing east, column 2 row 2 | `valjevo-scope4-screen-4-487b9fa3c83a.png` (area 4) |
| `tile:6:4ba2970b30ceb86095e24f129519c66dd25adcb5db5234cf3e99397d8e578ace` | 8X8D5 block 242 tile 17 over sky colour 0 | map 6, square (4,0) facing east, column 10 row 1 | `valjevo-scope4-screen-4-4ba2970b30ce.png` (area 4) |
| `tile:6:50315cf1500d49295fc212a7fc41849dc7db64b8e52c8f4c9f83bba2698c2934` | 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (4,0) facing south, column 1 row 4 | `valjevo-scope4-screen-4-50315cf1500d.png` (area 4) |
| `tile:6:55f2e5abaed1f70cfc57e460385f8a42c47796882803f65a7056bc2339623d1a` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (4,0) facing east, column 4 row 3 | `valjevo-scope4-screen-4-55f2e5abaed1.png` (area 4) |
| `tile:6:61d25064ca9963a0a52c46d1787cc6f7fd1f82b402acfb35e53c078aa4005947` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D5 block 241 tile 66 over sky colour 0 | map 6, square (15,11) facing west, column 2 row 2 | `valjevo-scope4-screen-4-61d25064ca99.png` (area 4) |
| `tile:6:6cb82728cd3e45b9475b94aa8311ac97ff9f8e8b75955cde4296304a74ca5bd2` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over sky colour 0 | map 6, square (4,0) facing east, column 5 row 3 | `valjevo-scope4-screen-4-6cb82728cd3e.png` (area 4) |
| `tile:6:85d885617fca5dfd9091f89813f84645e46523ae68ff3ed9f7c4f8c66011bda9` | 8X8D5 block 242 tile 18 over sky colour 0 | map 6, square (4,0) facing west, column 0 row 1 | `valjevo-scope4-screen-4-85d885617fca.png` (area 4) |
| `tile:6:ad252d42f91a7ab600f69ada8433d114900953936cf795c3faec3cc5af2b3cb9` | 8X8D5 block 242 tile 49 over 8X8D5 block 242 tile 49 over 8X8D1 block 203 tile 16 over sky colour 0 | map 6, square (6,0) facing west, column 8 row 2 | `valjevo-scope4-screen-4-ad252d42f91a.png` (area 4) |
| `tile:6:be5eac9f1eb5ab214bd91c3f9275f7b01ca02d79e625d8959536668e4ff0791e` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (5,1) facing south, column 6 row 4 | `valjevo-scope4-screen-4-be5eac9f1eb5.png` (area 4) |
| `tile:6:d1b971c6c8434806d55194d2600360e1c7a75e6886ebee9f2c434541b7b50e67` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 65 over sky colour 0 | map 6, square (11,4) facing north, column 8 row 2 | `valjevo-scope4-screen-4-d1b971c6c843.png` (area 4) |
| `tile:6:d4f2932dd9e9681cc3ac2b3c39a34a8fd849042c476400cf9ce14b2aadf51c89` | 8X8D5 block 242 tile 20 over 8X8D5 block 242 tile 49 over sky colour 0 | map 6, square (6,0) facing south, column 6 row 4 | `valjevo-scope4-screen-4-d4f2932dd9e9.png` (area 4) |
| `tile:6:f34316599f96e0331ffe513c939ae14c64d03704b1765197a133d334ec229765` | 8X8D5 block 242 tile 21 over sky colour 0 | map 6, square (5,0) facing south, column 8 row 3 | `valjevo-scope4-screen-4-f34316599f96.png` (area 4) |

### Area 18: Podol Plaza (61)

Map 18; WALLDEF1 block 1 (tiles 8X8D1 block 1), block 3 (tiles 8X8D1 block 3), block 5 (tiles 8X8D1 block 5).

#### shared tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:18:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 18, square (14,11) facing north, column 8 row 8 | `route-699e8b134491.png` (area 0, 2, 4, 6, 8, 9, 11, 14, 15, 16, 20, 21, 22, 23, 29) |
| `tile:18:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 18, square (14,15) facing north, column 4 row 6 | `valjevo-scope6-cell-71c858f7e6de.png` (area 0, 2, 4, 5, 6, 7, 8, 9, 11, 14, 15, 16, 21, 23, 24, 28, 29, 31) |
| `tile:18:9b88f7a7329f3899fd4fdfcf0f17706a3995730c04dda467a643111d36f507df` | 8X8D1 block 203 tile 16 over the ground colour 6 | map 18, square (1,15) facing west, column 1 row 8 | `bane-altar-approach-terrain-9b88f7a7329f.png` (area 21, 24) |

#### tile set 8X8D1 block 1 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:18:0d24723ae25838d56de5c30206b9f79f6a256715c54bad0e12a3694fb102fbf7` | 8X8D1 block 1 tile 22 over sky colour 11 | map 18, square (15,10) facing north, column 0 row 1 | `orc-joint-694fb102fbf7.png` (area 2, 20, 29) |
| `tile:18:7b69b8ce9e674856c13ec81f47d9cf325edf390b53b249570a2cee0bf6fd6a70` | 8X8D1 block 1 tile 5 over sky colour 11 | map 18, square (15,10) facing north, column 0 row 2 | `orc-joint-ee0bf6fd6a70.png` (area 2, 20, 29) |
| `tile:18:86e0dc45d7f030b3cfa99416dd87b45d0f990b58a930c177a57ca5f41eabcdc9` | 8X8D1 block 1 tile 4 over the horizon row (three rows of sky 0, one of 0, two of 7, two of ground 6) | map 18, square (15,10) facing south, column 10 row 5 | `kuto-earth-perimeter-joins-86e0dc45d7f0.png` (area 29) |
| `tile:18:b2d2aa8609ace40dd9f489344fd1ae4c8f6163ca36423abe9d2dc2d5d8ffe753` | 8X8D1 block 1 tile 22 over sky colour 0 | map 18, square (15,10) facing north, column 0 row 1 | `kuto-west-arcade-terrain-b2d2aa8609ac.png` (area 2, 29) |
| `tile:18:c514183138565c8fef68cbb0f63a68cf37eff1ce8f976eb45f48df14112526ca` | 8X8D1 block 1 tile 5 over 8X8D1 block 5 tile 3 | map 18, square (15,10) facing north, column 0 row 3 |  |
| `tile:18:c9145af2e4c672a2d282d90e72efe87bb8439881131bd15c9fc3b23d64cdcde0` | 8X8D1 block 1 tile 5 over sky colour 0 | map 18, square (15,10) facing north, column 0 row 2 | `kuto-west-arcade-terrain-c9145af2e4c6.png` (area 2, 29) |

#### tile set 8X8D1 block 3 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:18:30bc8b737f4b78b81e9d7806315f0110d7959ef95fae539b35c6cc4ca8c5bb52` | 8X8D1 block 3 tile 56 over 8X8D1 block 3 tile 56 over sky colour 11 | map 18, square (13,10) facing east, column 5 row 4 | `kuto-street-joins-30bc8b737f4b.png` (area 2, 29) |
| `tile:18:8716890d48690fada18c0167535fefc99e81757d743a9012253b1b39f3619c11` | 8X8D1 block 3 tile 11 over sky colour 11 | map 18, square (14,10) facing north, column 10 row 1 | `kuto-street-joins-8716890d4869.png` (area 2, 29) |
| `tile:18:cca089937faeed00e6d548d8c4fa5a9398807335119e09b46203a0e0bc7dc2ff` | 8X8D1 block 3 tile 12 over 8X8D1 block 3 tile 12 over sky colour 11 | map 18, square (14,10) facing east, column 4 row 2 | `kuto-street-joins-cca089937fae.png` (area 2, 29) |
| `tile:18:d125bcbc944bdffa51980c50924891cfd1d58f8dac5ca6aa5e1b20f0e24d1862` | 8X8D1 block 3 tile 58 | map 18, square (14,11) facing north, column 8 row 4 | `kuto-perimeter-lanes-terrain-d125bcbc944b.png` (area 2, 22, 29) |
| `tile:18:df4f61f72876d03cda43c11cbe108ba27453e26d897e0b874ffc72a77780b78b` | 8X8D1 block 3 tile 13 over 8X8D1 block 3 tile 13 over sky colour 11 | map 18, square (14,10) facing east, column 7 row 2 | `kuto-street-joins-df4f61f72876.png` (area 2, 29) |
| `tile:18:ea7591059e3663b18bcca4c3818cd64b25a459ce3159c0ff106758d703d93bee` | 8X8D1 block 3 tile 26 | map 18, square (14,11) facing north, column 8 row 5 | `kuto-perimeter-lanes-terrain-ea7591059e36.png` (area 2, 22, 29) |

#### tile set 8X8D1 block 5 (38)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:18:030842a7169bde9ba0eadee993120008a48ebd1b6ed48d7ca4822fba37c4a2bf` | 8X8D1 block 5 tile 50 over sky colour 12 | map 18, square (15,7) facing west, column 2 row 1 | `bane-altar-terrain-030842a7169b.png` (area 21, 24) |
| `tile:18:0917396f43c78efac56f1b4865ce8a4030c8cce75cf878f6549b9600c8325e0e` | 8X8D1 block 5 tile 42 over sky colour 11 | map 18, square (0,14) facing east, column 9 row 4 |  |
| `tile:18:11913c45250c4c34aec752f37ff9b05ae2b236993864f93278d061fc017efc79` | 8X8D1 block 5 tile 55 over sky colour 11 | map 18, square (13,7) facing east, column 10 row 1 | `new-phlan-building-paving-joins-0-11913c45250c.png` (area 0, 8, 11, 21, 24) |
| `tile:18:124e519e84cbf0beb5373679b761b56ae1aff8fb7085eccca286f9756c720c3e` | 8X8D1 block 5 tile 59 over sky colour 11 | map 18, square (0,14) facing south, column 2 row 4 | `bane-rampart-paving-124e519e84cb.png` (area 24) |
| `tile:18:20e744fe323fa0ea5768bd2a2c9a80af7518bf946dc89fc11c9c34fc9916e1c7` | 8X8D1 block 5 tile 59 over sky colour 12 | map 18, square (0,14) facing south, column 2 row 4 | `bane-altar-terrain-20e744fe323f.png` (area 21, 24) |
| `tile:18:2427877b749302fe251ec450ebff8b87f5e180e5b83cea01d12d38b8dd2c320f` | 8X8D1 block 5 tile 47 over sky colour 11 | map 18, square (0,14) facing south, column 0 row 4 |  |
| `tile:18:2bde1d5af1ff6f822d38c38bd87baaa360499945587598144bfd792091336101` | 8X8D1 block 5 tile 69 over sky colour 0 | map 18, square (1,15) facing west, column 2 row 2 |  |
| `tile:18:2dddaeae22c651a128bd3ce03197cd0b1fb508b8bd45790dd91fd5e749672f28` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 16 over sky colour 11 | map 18, square (11,7) facing south, column 8 row 2 | `kovel-bane-screen-24-2dddaeae22c6.png` (area 24) |
| `tile:18:2f8f99db8232cba9c6e94985f89f1417e7353e7d914673943717100755edea5e` | 8X8D1 block 5 tile 69 over sky colour 11 | map 18, square (1,15) facing west, column 2 row 2 |  |
| `tile:18:30a0176786e529d4ba17bc006f8e4c3fe7a72ff24d7c5f4f25f9dbacac6780ee` | 8X8D1 block 5 tile 67 over 8X8D1 block 5 tile 67 over 8X8D1 block 203 tile 16 over sky colour 11 | map 18, square (11,6) facing south, column 6 row 4 |  |
| `tile:18:3348a925d00f834aca7dfeb1da56f237b010e66ef986254c1987e06416447ede` | 8X8D1 block 5 tile 7 over 8X8D1 block 5 tile 7 over 8X8D1 block 203 tile 17 over sky colour 11 | map 18, square (11,7) facing south, column 2 row 2 | `kovel-bane-screen-24-3348a925d00f.png` (area 24) |
| `tile:18:3e1090e78979c4c9f9df8291dfd3be1612c88020fc157ebdc5d6630c091ba677` | 8X8D1 block 5 tile 53 over sky colour 11 | map 18, square (11,7) facing east, column 10 row 1 | `sokal-legacy-cell-3e1090e78979.png` (area 21, 24) |
| `tile:18:47ec4b15094d68775c69c2b62c39ea8cc3f449b9fae26b213873f6ef7df8d874` | 8X8D1 block 5 tile 69 over sky colour 12 | map 18, square (1,15) facing west, column 2 row 2 | `bane-treasure-walk-terrain-47ec4b15094d.png` (area 21, 24) |
| `tile:18:4a6e7d88447698cb68f69ce59ca7982d660a5b76cb45afc8b62107b42d80fef3` | 8X8D1 block 5 tile 47 over 8X8D1 block 203 tile 39 | map 18, square (1,15) facing south, column 1 row 4 | `sokal-legacy-cell-4a6e7d884476.png` (area 21) |
| `tile:18:4b20f8635fc0f6fab54dc9b65bafab4467d18f089609d22cd5cc403ebb681d84` | 8X8D1 block 5 tile 68 over sky colour 11 | map 18, square (12,7) facing east, column 8 row 4 | `bane-rampart-paving-4b20f8635fc0.png` (area 24) |
| `tile:18:55fef8d37b1b98be42a153ec5b895daf6fd0cad9de82dd35f61ee3d9720fc58c` | 8X8D1 block 5 tile 7 over sky colour 11 | map 18, square (10,7) facing east, column 9 row 2 | `sokal-legacy-cell-55fef8d37b1b.png` (area 21, 24) |
| `tile:18:5fee994580f831f9def796aa537448e8c6b1ecd5413c15bf85e76c10dc611a31` | 8X8D1 block 5 tile 24 over sky colour 0 | map 18, square (1,14) facing east, column 10 row 3 |  |
| `tile:18:651c198944d18884f12570fb5bdf8dc5bf4b4f15bfd324233879b73050e95e85` | 8X8D1 block 5 tile 18 over sky colour 11 | map 18, square (9,6) facing east, column 9 row 3 | `sokal-legacy-cell-651c198944d1.png` (area 21, 24) |
| `tile:18:738307136e6c7dfe7ed1d5924ebb30927ef2f162cbc598900100ba00750145d6` | 8X8D1 block 5 tile 57 over 8X8D1 block 5 tile 57 over sky colour 11 | map 18, square (13,8) facing east, column 5 row 1 | `sokal-legacy-cell-738307136e6c.png` (area 21, 24) |
| `tile:18:743465f1979ba29859499e988ccb19a786bfe022c2a65bdf37482c353f6f532b` | 8X8D1 block 5 tile 52 over 8X8D1 block 5 tile 52 over sky colour 11 | map 18, square (13,8) facing east, column 7 row 2 | `new-phlan-building-paving-joins-0-743465f1979b.png` (area 0, 8, 11, 21, 24) |
| `tile:18:7ddecb2c10620713d8e5bff6ed42819bfa68244104eafb0557917b87742cfb23` | 8X8D1 block 5 tile 43 over 8X8D1 block 5 tile 43 over sky colour 11 | map 18, square (0,14) facing south, column 5 row 4 |  |
| `tile:18:88b4332eea30bd70906810bb5f153dfa09d6ea99cacf1aa871b89c2038a8257d` | 8X8D1 block 5 tile 47 over sky colour 0 | map 18, square (0,14) facing south, column 0 row 4 | `sokal-legacy-cell-88b4332eea30.png` (area 21) |
| `tile:18:947a0fb3e20ee928ec232553003a76851246b61a7165ecec40aaea1f10ba9e0c` | 8X8D1 block 5 tile 19 | map 18, square (1,15) facing west, column 0 row 5 | `bane-altar-approach-terrain-947a0fb3e20e.png` (area 21, 24) |
| `tile:18:a025ff31efdc687931b36cc382280126632a5a4485a6b581b07fa27dfce6c756` | 8X8D1 block 5 tile 23 over sky colour 11 | map 18, square (1,14) facing west, column 0 row 3 |  |
| `tile:18:a9235ecdc9a2baff018147f8e39fbc32fffc1ca6741e62ce5bfd5d1e8ed4fa5d` | 8X8D1 block 5 tile 23 over sky colour 0 | map 18, square (1,14) facing west, column 0 row 3 |  |
| `tile:18:aafaf1a07a36fe7adc6f58cac01630fd86675ec02b6ac5be58c7cea01e286f31` | 8X8D1 block 5 tile 6 over sky colour 11 | map 18, square (10,7) facing east, column 9 row 1 | `sokal-legacy-cell-aafaf1a07a36.png` (area 21, 24) |
| `tile:18:afcce2e35d81fb6e32eeb13151c302f9d8cc45518a8d5aa73de6061b316548ec` | 8X8D1 block 5 tile 37 | map 18, square (2,15) facing west, column 6 row 6 | `bane-altar-paving-joins-afcce2e35d81.png` (area 21, 24) |
| `tile:18:b089021fb5441623c0ac282378995eda7c3667072b2333bfcac5ce04989b0c50` | 8X8D1 block 5 tile 51 over sky colour 11 | map 18, square (13,7) facing east, column 10 row 2 | `new-phlan-building-paving-joins-0-b089021fb544.png` (area 0, 8, 11, 21, 24) |
| `tile:18:b0c4fa0697fea65bf1495c92fff70f2eb4379630f4282aaecf18ff92447e4b0c` | 8X8D1 block 5 tile 42 over sky colour 0 | map 18, square (0,14) facing east, column 9 row 4 |  |
| `tile:18:b41b8352eae61850bf9be786d9c18aecee304cbdb3e7b7d268e510e8c53a72b3` | 8X8D1 block 5 tile 33 | map 18, square (2,15) facing west, column 2 row 7 | `bane-altar-approach-terrain-b41b8352eae6.png` (area 21, 24) |
| `tile:18:b5f9ae0637628bd41724848ae763c955501dbb7d9c8f1cd7d151475b2b07913f` | 8X8D1 block 5 tile 29 | map 18, square (1,15) facing west, column 2 row 8 | `bane-altar-paving-joins-b5f9ae063762.png` (area 21, 24) |
| `tile:18:ec0a62954e91ef343d1cdefc2c1e22d27bd7ea331ae26ccee5709ca5b1c9fa1e` | 8X8D1 block 5 tile 24 over sky colour 11 | map 18, square (1,14) facing east, column 10 row 3 |  |
| `tile:18:ed2de710665e57de96fa14612dc7f348d36b0b63c8c8488005b99eb6495217b6` | 8X8D1 block 5 tile 15 | map 18, square (1,15) facing west, column 2 row 3 | `bane-treasure-walk-terrain-ed2de710665e.png` (area 21, 24) |
| `tile:18:ee7e1acfdcd9bd40ba7905b8711299d15b27d689a67b5c8d5dfa8cc30ae72d69` | 8X8D1 block 5 tile 66 over sky colour 11 | map 18, square (9,5) facing south, column 1 row 4 | `bane-north-court-terrain-ee7e1acfdcd9.png` (area 24) |
| `tile:18:f30eb31c5397cd6227a038e3aaf2b1e9cee6bb00f3e710d1a4a869dd27c98616` | 8X8D1 block 5 tile 62 | map 18, square (13,8) facing south, column 0 row 10 | `sokal-near-screen-floor-joint.png` (area 21, 24) |
| `tile:18:f4869b3d1f02f79ce7120b1c9055fa9a11e07c1eca7c209525c7d6731fdc53f8` | 8X8D1 block 5 tile 56 over 8X8D1 block 5 tile 56 over sky colour 11 | map 18, square (13,8) facing east, column 7 row 1 | `new-phlan-building-paving-joins-0-f4869b3d1f02.png` (area 0, 8, 11, 21, 24) |
| `tile:18:f518ea1fc471b9461565dd79b87e39deb0b9c42c4eba39c33eae0e7241007b20` | 8X8D1 block 5 tile 34 | map 18, square (5,2) facing north, column 4 row 6 | `bane-altar-paving-joins-f518ea1fc471.png` (area 21, 24) |
| `tile:18:fa92d68c379f3fe2612e175f7a880b123e87499c44662ba1734679bbc357f66d` | 8X8D1 block 5 tile 54 over sky colour 11 | map 18, square (11,7) facing west, column 0 row 1 | `sokal-legacy-cell-fa92d68c379f.png` (area 21, 24) |

#### tile set 8X8D1 block 203 (8)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:18:0bffbdba87be846f864ff66cb8c2d3863272e5242142d18eecea120e41b304db` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 50 over sky colour 0 | map 18, square (15,6) facing south, column 7 row 3 |  |
| `tile:18:1eb21f61cbb22808e095d2fd9bc7f93b7ad5ab8787e763d6cbe85cdde953f9f4` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 11 | map 18, square (15,7) facing south, column 9 row 1 | `kovel-bane-screen-24-1eb21f61cbb2.png` (area 24) |
| `tile:18:24e75c88b93e67d925a3cc94290fcc4c61f5f99b1462f48b7b10539f64f14f3e` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 12 | map 18, square (15,7) facing south, column 9 row 1 | `kovel-bane-screen-24-24e75c88b93e.png` (area 24) |
| `tile:18:2d38e7553ce601d07a1ba243f8e839e028635ad46a684bcfae8ab1e2130c0d91` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 6 over sky colour 0 | map 18, square (15,7) facing south, column 9 row 1 |  |
| `tile:18:330bc3366c9d2efbaaa125335a2dbff01bc49f6777161a37fd234e927eeb028b` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 50 over sky colour 11 | map 18, square (15,6) facing south, column 7 row 3 |  |
| `tile:18:db1e168ba5fc3e5ac5398a0202c4822f52443c4af67d80cfba81c0688398784e` | 8X8D1 block 203 tile 16 over 8X8D1 block 5 tile 50 over sky colour 12 | map 18, square (15,6) facing south, column 7 row 3 | `kovel-bane-screen-24-db1e168ba5fc.png` (area 24) |
| `tile:18:ecff85158038affb0af65074159d912a58696a3d9413b4fb7b1de944eb775fa0` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 6 over sky colour 11 | map 18, square (15,10) facing north, column 1 row 1 | `kovel-bane-screen-24-ecff85158038.png` (area 24) |
| `tile:18:fee2c7506184fe0e593d3138d0dcf93070650cab9abd075068a5798d5336a3df` | 8X8D1 block 203 tile 17 over 8X8D1 block 5 tile 6 over sky colour 0 | map 18, square (15,10) facing north, column 1 row 1 |  |

### Area 26: Wilderness, middle (17)

Map 26; WALLDEF7 block 7 (tiles 8X8D7 block 7), block 8 (tiles 8X8D7 block 8), block 23 (tiles 8X8D7 block 23).

#### tile set 8X8D7 block 7 (13)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:0852506e4ab1c9afeb335b54d670524f4c934ccd10ec2c026e7ecc7adf2aa2f7` | 8X8D7 block 7 tile 2 over 8X8D7 block 7 tile 2 over 8X8D7 block 8 tile 22 over sky colour 11 | map 26, square (8,11) facing west, column 4 row 4 |  |
| `tile:26:0e6cbe18a8a92ad9b2b9500268f0c182de7131dd3903e5ed916b0e12ba9375ad` | 8X8D7 block 7 tile 19 over the ground colour 8 | map 26, square (10,0) facing north, column 8 row 7 |  |
| `tile:26:12f52d2b1e182ced19373a8a517c25b13aecd9a617a01fc3a50244efbfef8d5f` | 8X8D7 block 7 tile 45 over 8X8D7 block 7 tile 45 over the ground colour 8 | map 26, square (4,11) facing north, column 4 row 7 |  |
| `tile:26:1d1f11735aa1abd03b26f8064c9f8703b99503f0984aefa72d7e8dd613c832dd` | 8X8D7 block 7 tile 55 over 8X8D7 block 7 tile 55 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 7 |  |
| `tile:26:4fcfa1b300546896594b37ea1febf52db8e6a541c97eb4a87a6ceb3a6f94e3a9` | 8X8D7 block 7 tile 52 over 8X8D7 block 7 tile 52 over the ground colour 8 | map 26, square (4,11) facing north, column 5 row 7 |  |
| `tile:26:6b3b37e84f0464cd493d837b238594d9b8a60bbb8b5ad87c0fd2fca7e21f3a6f` | 8X8D7 block 7 tile 43 over the ground colour 8 | map 26, square (9,0) facing north, column 9 row 6 |  |
| `tile:26:7747179433157995403250255a3b76192335fea42a1ebea6bd1b9377d9f17af0` | 8X8D7 block 7 tile 45 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (4,11) facing west, column 0 row 5 |  |
| `tile:26:823960264055d8a6335e57bce9a738945a58775e8bb098c356fcbcc4d5a58000` | 8X8D7 block 7 tile 42 over the ground colour 8 | map 26, square (9,0) facing east, column 2 row 6 |  |
| `tile:26:930e47c654cb4204c3b7591687d5402cd660b90fa4ec6317dd05b9e143588601` | 8X8D7 block 7 tile 19 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing north, column 9 row 5 |  |
| `tile:26:948df3e4533789428269e0a1dac895b830fc222107e05c2e4b6471701840d26e` | 8X8D7 block 7 tile 44 over the ground colour 8 | map 26, square (4,11) facing east, column 4 row 6 |  |
| `tile:26:a918ea06119c2d2c402ec352e03184a52677444c754b103e80140ac3edae7b88` | 8X8D7 block 7 tile 46 over the ground colour 8 | map 26, square (9,0) facing east, column 3 row 6 |  |
| `tile:26:dd4050acf789b4af92cdeea1c2c2411411615d2ecb3479a57ec71862e5b05abe` | 8X8D7 block 7 tile 53 over the ground colour 8 | map 26, square (10,0) facing east, column 0 row 7 |  |
| `tile:26:efba91abd9f3d683ea36f5dc27d2e40d92e72e3af159659ed50a1726bfb206d3` | 8X8D7 block 7 tile 0 over 8X8D7 block 7 tile 0 over the ground colour 8 | map 26, square (4,11) facing north, column 3 row 8 |  |

#### tile set 8X8D7 block 8 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:26:2c9b9fa12751ae30b0e8d3139c14bcfc3b7342c57e1e3264dbebc861036d854d` | 8X8D7 block 8 tile 19 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (5,1) facing east, column 4 row 5 |  |
| `tile:26:8c786f4b1c38fdea80ad32e55aa8e05e74853760d5d8bc848f8a02af66bd695c` | 8X8D7 block 8 tile 20 over 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 6 row 5 |  |
| `tile:26:944e107665ab927c8b165e2f2934e06bbc6f38a1877c2737a7d9cfaa4b51fea4` | 8X8D7 block 8 tile 21 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (2,1) facing west, column 0 row 5 |  |
| `tile:26:eb13e875f347adc3e80cf68affd34dc1be49d5cd316b2f93a1a08326f18a42f1` | 8X8D7 block 8 tile 20 over the horizon row (three rows of sky 0, one of 0, two of 8, two of ground 8) | map 26, square (0,0) facing east, column 6 row 5 |  |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 3092 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 172 |
| first-person cells of an area whose reading is not confirmed | 980 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 104 |
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
