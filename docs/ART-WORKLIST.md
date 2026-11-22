# Artwork worklist

## What to do now

1. **Wall tiles: 88 cells to draw**, in The Slums. Each is listed below with its exact key. `npm run verify:art-worklist` reports this number.
2. **Pictures: 33 frames with no art** (portraits, approach sprites, icons, ending pictures), listed under "Other pictures no key names" with the key form for each. Portraits and approach sprites first; the ending pictures only if the ending needs them.
3. Nothing else is yours yet. Cells under "Not established" are not confirmed to appear: the QA owner is settling them by play, and each one that proves real is moved into item 1. Do not draw them.

The artwork is done when items 1 and 2 are at zero and nothing is left under "Not established".

## The short version

Portraits, monsters, scenes and combat pictures are not on this list: this is the first-person view's wall tiles and the outdoor battle terrain.
A cell is one 8 by 8 square of the screen, redrawn at 32 by 32. Most cells below are a shape you have already drawn, standing over a different sky or ground colour
(another hour of the day, another part of the map). So count shapes, not cells:

| Area | Cells to do | Distinct shapes | Shapes you have already drawn over another sky or ground | Shapes with no version yet |
| ---: | ---: | ---: | ---: | ---: |
| 20 The Slums | 88 | 87 | 14 | 73 |
| **All areas** | **88** | **87** | **14** | **73** |

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
| Remaining, all kinds | 88 |
| First-person cells to do | 88 |
|   of which one stored tile | 41 |
|   of which one tile over a solid colour | 10 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 37 |
|   of which the same pixels already have art of yours in another area | 64 |
| Distinct shapes among the first-person cells (the same tiles, whatever sky or ground is behind them) | 87 |
|   of which the area already has your art for that shape over another sky or ground | 14 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 7696 |
|   accounted for by the tool | 7696 |
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
| 0 | New Phlan | yes | 328 | 328 | 0 | 341 of 341 (3 as first views of the next area, 10 as WebGL wall materials) |
| 1 | Buccaneer Base | yes | 181 | 181 | 0 | 184 of 184 (3 as WebGL wall materials) |
| 2 | Cadorna Textile House | yes | 402 | 402 | 0 | 426 of 426 (5 as first views of the next area, 19 as WebGL wall materials) |
| 3 | Valjevo Castle | yes | 341 | 307 | 0 | 313 of 313 (6 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | yes | 433 | 369 | 0 | 392 of 392 (23 as WebGL wall materials) |
| 6 | Valjevo Castle | yes | 182 | 182 | 0 | 190 of 190 (8 as WebGL wall materials) |
| 7 | Valjevo Castle, the Pool | yes | 216 | 216 | 0 | 216 of 216 |
| 8 | Phlan City Hall | yes | 326 | 295 | 0 | 305 of 305 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 206 | 170 | 0 | 170 of 170 |
| 10 | Valhingen Graveyard | yes | 1007 | 1007 | 0 | 1019 of 1019 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 326 | 295 | 0 | 295 of 295 |
| 13 | The Kobold Caves | yes | 211 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 90 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 164 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 273 | 273 | 0 | 306 of 306 (26 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | yes | 288 | 180 | 88 | 188 of 188 (8 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 254 | 254 | 0 | 314 of 314 (4 as first views of the next area, 40 as WebGL wall materials, 16 only in unreachable views) |
| 22 | Yarash's Pyramid | yes | 87 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 78 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 244 | 217 | 0 | 229 of 229 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 42 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 214 | 214 | 0 | 285 of 285 (69 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 41 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 127 | 127 | 0 | 128 of 128 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 660 | 0 | 674 of 674 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 94 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 20: The Slums (88)

Map 20; WALLDEF2 block 2 (tiles 8X8D2 block 2), block 4 (tiles 8X8D2 block 4), block 1 (tiles 8X8D2 block 1).

#### plain sky, horizon and ground (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:20:d20d585641c6d76d5fdd15d21d1f0fe0f6663d6aded22bc96508569ac0bd84f7` | the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 20, square (5,0) facing west, column 0 row 5 | `sokal-night-cell-d20d585641c6.png` (area 0, 1, 2, 3, 4, 5, 6, 7, 9, 13, 14, 15, 16, 17, 18, 21, 25, 26, 27, 28, 29) |

#### shared tile set 8X8D1 block 203 (3)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:20:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over 8X8D1 block 203 tile 32 over the ground colour 6 | map 20, square (0,4) facing west, column 6 row 7 | `new-phlan-harbor-paving-joins-0-5b52670be92c.png` (area 0, 2, 3, 4, 5, 6, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |
| `tile:20:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 20, square (11,3) facing west, column 1 row 6 | `valjevo-scope3-cell-71c858f7e6de.png` (area 0, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 15, 16, 18, 21, 23, 24, 28, 29, 31) |
| `tile:20:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over 8X8D1 block 203 tile 33 over the ground colour 6 | map 20, square (0,4) facing west, column 4 row 7 | `new-phlan-harbor-paving-joins-0-92ccb4f65a1e.png` (area 0, 2, 3, 4, 5, 6, 8, 9, 11, 14, 15, 18, 21, 24, 26, 29, 31) |

#### tile set 8X8D2 block 1 (44)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:20:06895802b75b354304c7ec046e5f54d0df2a81a46db747d6fc26296f7d2f4db5` | 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 64 | map 20, square (13,13) facing north, column 10 row 4 |  |
| `tile:20:0bfa157280cdb96211af4429f6c5f4a227aacdc4bece6f5ddc04a7c3db429a30` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 32 | map 20, square (13,11) facing south, column 0 row 7 |  |
| `tile:20:135ba678e44ecf91ba0fab51b29ae2cc304b280f0db61d0257ee850c77c85365` | 8X8D2 block 1 tile 4 over 8X8D1 block 203 tile 41 | map 20, square (13,13) facing north, column 10 row 6 |  |
| `tile:20:1445947ec6d1a8563adaec0013bb54af366fd8bd0dd676895fb8c54e3e50b19c` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 21 | map 20, square (14,11) facing south, column 3 row 5 |  |
| `tile:20:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D2 block 1 tile 12 | map 20, square (1,3) facing west, column 1 row 5 | `valjevo-scope3-cell-17becf7f4640.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D2 block 1 tile 8 | map 20, square (1,4) facing west, column 5 row 6 | `valjevo-scope3-cell-194c7a70c05e.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:204b3489b5ac7080fbc6ccc2ce55ce7b5c02e7825abca378a41cf1652517c763` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 28 | map 20, square (13,14) facing east, column 0 row 6 |  |
| `tile:20:21d000ea7633da686f7d05c43cbac67b6c337b282bb71549f9ced7c2fe0bcc63` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D1 block 203 tile 17 over sky colour 0 | map 20, square (14,7) facing west, column 3 row 3 | `kuto-street-joins-21d000ea7633.png` (area 2, 29) |
| `tile:20:21dae3e0c2771969c3717d12ac61e42f436459a6e57f7da6ba936eac9a5cf37c` | 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 49 over sky colour 15 | map 20, square (13,13) facing north, column 10 row 3 |  |
| `tile:20:27aeceaacc483db4c7464b80531ea86df338af08e3414333a287cb58ed9808cd` | 8X8D2 block 1 tile 4 over 8X8D1 block 203 tile 16 over sky colour 0 | map 20, square (13,6) facing east, column 10 row 3 | `kuto-podal-side-streets-kuto-terrain-27aeceaacc48.png` (area 2, 29) |
| `tile:20:2a9495d937929dfcfcc004eab7254988740adca5f9eb377ecb79bcc84f2d3b5a` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 62 | map 20, square (13,14) facing east, column 0 row 4 |  |
| `tile:20:39c39567220f12c6e3e1556bdfc65e7b3e6bc14c24f60e6ec2e3f957bbf68d8a` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 60 | map 20, square (13,11) facing south, column 0 row 4 |  |
| `tile:20:3be9879884a5225b7452926e818205cdc97d6a61ab79401073cc8aadc42e3662` | 8X8D2 block 1 tile 5 over 8X8D2 block 1 tile 5 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 20, square (14,7) facing west, column 7 row 5 |  |
| `tile:20:445905090e9086fb5ee9bfd824d04a72b8f8636480df3645107fab2bc1daff76` | 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 43 over the ground colour 6 | map 20, square (13,13) facing north, column 10 row 7 |  |
| `tile:20:4d049786532c052a90f30dd56e9624891ac475cb06a487c42510d10852b6e860` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 62 | map 20, square (13,13) facing east, column 3 row 4 |  |
| `tile:20:4e3832e7c31b96e10345df3e5a214bc0ab11594bbbeeebf4ff4a864f1e79a12f` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 33 over sky colour 15 | map 20, square (13,11) facing south, column 0 row 3 |  |
| `tile:20:4eb517093139f21cce9889991a22361db52d158eb23b7fa26d65a3d16285c93e` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 52 | map 20, square (11,12) facing east, column 3 row 5 | `yarash-upper-screen-cell-4eb517093139.png` (area 2, 22, 29) |
| `tile:20:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D2 block 1 tile 9 | map 20, square (1,4) facing west, column 6 row 6 | `valjevo-scope3-cell-4fa7efe3e4e5.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:523c2991815139cd09fa6c582d3db3acabc5ba8da84842bb6e037900fff76d7b` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 33 over sky colour 15 | map 20, square (14,11) facing south, column 3 row 3 |  |
| `tile:20:54ad66560a7c69766cbf1f6a9bbebbdb1f7848cf0e4487cb06d9e69a459d4fb4` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 55 | map 20, square (11,12) facing east, column 3 row 4 | `yarash-upper-screen-cell-54ad66560a7c.png` (area 2, 22, 29) |
| `tile:20:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D2 block 1 tile 21 | map 20, square (2,4) facing west, column 5 row 5 | `valjevo-scope3-cell-54cfe77b0fa0.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:56b54aa911c164b42e26282f23a6198458c1749a91d2cb029e9a645cd3d207c0` | 8X8D2 block 1 tile 5 over 8X8D2 block 1 tile 5 over the horizon row (three rows of sky 15, one of 15, two of 7, two of ground 6) | map 20, square (12,12) facing west, column 7 row 5 | `pyramid-upper-paving-56b54aa911c1.png` (area 15, 22) |
| `tile:20:5b9fa4ccb6e5e4410c9626e58e814a1c32c8a9e6ff2fd254cbb2f90fd96b8817` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 22 | map 20, square (13,11) facing south, column 0 row 6 |  |
| `tile:20:5cc83393adbd6e029069e66f391eb4853f566090d839096309ac3d8a1c7a949a` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D1 block 203 tile 14 over the ground colour 6 | map 20, square (11,12) facing east, column 3 row 7 | `yarash-upper-screen-cell-5cc83393adbd.png` (area 2, 22, 29) |
| `tile:20:638a2ae773af79fe39f6bd7fb329a68270a61e3ee9010b3f30260c9bb4dd2a8c` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 0 | map 20, square (13,13) facing east, column 3 row 5 |  |
| `tile:20:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D2 block 1 tile 11 | map 20, square (1,4) facing west, column 5 row 5 | `valjevo-scope3-cell-7870e9a9d014.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:869e7caf986a2da4c4165813123836475d8d3d14bde1ed6d242e07b9d0f3c864` | 8X8D2 block 1 tile 5 over 8X8D1 block 203 tile 17 over sky colour 0 | map 20, square (14,6) facing west, column 0 row 3 | `kuto-west-arcade-terrain-869e7caf986a.png` (area 2, 29) |
| `tile:20:8bf2c46fee9e014aedf193a0324ebe32f7d0b504098941c070341c0c42ef6ea0` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 28 | map 20, square (13,13) facing east, column 3 row 6 |  |
| `tile:20:8fdabc3348907037819d74cadf9c9e19371ec03a89e676260c578e492a535a7f` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 21 | map 20, square (13,11) facing south, column 0 row 5 |  |
| `tile:20:a18919e8b0b576e4a8546f01e5106a79ad39b36b697a2fcd7eb7d21c59a1ad5f` | 8X8D2 block 1 tile 24 over 8X8D2 block 1 tile 24 over sky colour 0 | map 20, square (13,7) facing east, column 4 row 2 | `podol-screen-18-a18919e8b0b5.png` (area 2, 18, 29) |
| `tile:20:b2d2aa8609ace40dd9f489344fd1ae4c8f6163ca36423abe9d2dc2d5d8ffe753` | 8X8D2 block 1 tile 22 over sky colour 0 | map 20, square (14,6) facing west, column 0 row 2 | `podol-screen-final-18-b2d2aa8609ac.png` (area 2, 18, 29) |
| `tile:20:bbfdf7dabc8459072b29ad2a5622faf4944e1d54d0d696dd36f57d692692bd5f` | 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 29 | map 20, square (13,13) facing north, column 10 row 5 |  |
| `tile:20:c71fc7decb96fccb775a69588149f8a650a4a5a6620a0774325ec62fbc79d9b3` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 23 over sky colour 15 | map 20, square (11,12) facing north, column 10 row 2 | `yarash-upper-screen-cell-c71fc7decb96.png` (area 22) |
| `tile:20:c9145af2e4c672a2d282d90e72efe87bb8439881131bd15c9fc3b23d64cdcde0` | 8X8D2 block 1 tile 5 over sky colour 0 | map 20, square (14,7) facing north, column 0 row 2 | `podol-screen-final-18-c9145af2e4c6.png` (area 2, 18, 29) |
| `tile:20:cab712e43550777674b54ca7978d5f010878a130ce71178d7c866d5bf2072ce6` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 60 | map 20, square (14,11) facing south, column 3 row 4 |  |
| `tile:20:cac3da3dfddc8fe5a9660312cbc94a8772721e361ab54902774da8760997d0eb` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 0 | map 20, square (13,14) facing east, column 0 row 5 |  |
| `tile:20:d9ee1e84a38a18895337a6f1be72237b550984ff7bfad71c580cf8b17cb96f94` | 8X8D2 block 1 tile 5 over 8X8D2 block 1 tile 5 over 8X8D1 block 203 tile 16 over sky colour 0 | map 20, square (13,7) facing east, column 7 row 3 | `kuto-west-arcade-terrain-d9ee1e84a38a.png` (area 2, 29) |
| `tile:20:dba7c5ac472a2b668c60ab672c75f09e2afe1aea1346e1e611e03d4be4b95e05` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 22 | map 20, square (14,11) facing south, column 3 row 6 |  |
| `tile:20:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D2 block 1 tile 10 | map 20, square (1,4) facing west, column 6 row 5 | `valjevo-scope3-cell-e661bce0938e.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:e77bc10aafb50018c174281e64f2f9ce2a0ea9a380ce8cd649cb5da86c5d1bec` | 8X8D2 block 1 tile 4 over sky colour 0 | map 20, square (13,7) facing north, column 10 row 2 | `podol-screen-18-e77bc10aafb5.png` (area 2, 18, 29) |
| `tile:20:eb678b0268ef567b96e2d00394ef74473c39b52a5312bf3c8af754afe631c98c` | 8X8D2 block 1 tile 5 over 8X8D2 block 4 tile 5 | map 20, square (14,7) facing north, column 0 row 5 |  |
| `tile:20:efdad1bafe32419a6d023a341496d7f8216cd46efcc980782f611c6c867f294a` | 8X8D2 block 1 tile 4 over 8X8D2 block 1 tile 4 over 8X8D2 block 4 tile 32 | map 20, square (14,11) facing south, column 3 row 7 |  |
| `tile:20:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D2 block 1 tile 7 | map 20, square (1,3) facing west, column 1 row 6 | `valjevo-scope3-cell-f08f5d405196.png` (area 2, 3, 4, 5, 6, 9, 14, 15, 18, 21, 24, 29, 31) |
| `tile:20:ff4860ce30e110b079f3fcd93775a7da9203b1088f021b1dc767fd1870de3bc2` | 8X8D2 block 1 tile 23 over sky colour 0 | map 20, square (13,6) facing east, column 10 row 2 | `podol-screen-18-ff4860ce30e1.png` (area 2, 18, 29) |

#### tile set 8X8D2 block 2 (18)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:20:0074a4a4e147d6b679cc508e8599c9c6aad4f0d13b833284e6c8161dfddba398` | 8X8D2 block 2 tile 15 | map 20, square (8,9) facing west, column 1 row 6 | `zhentil-northern-lane-terrain-0074a4a4e147.png` (area 1, 3, 5, 28) |
| `tile:20:073bed6ce208bae09aa922cc701b2e85d31b89cb815bf9741c330a855b7f23ab` | 8X8D2 block 2 tile 63 | map 20, square (5,2) facing north, column 0 row 4 | `valjevo-scope3-se-cell-073bed6ce208.png` (area 3, 5, 7) |
| `tile:20:2270599a2f3b631b22ed520824fa05240378c03aa8433749b3299fe9ac9a27dc` | 8X8D2 block 2 tile 47 | map 20, square (4,2) facing north, column 10 row 7 | `valjevo-scope3-cell-2270599a2f3b.png` (area 3, 5, 7) |
| `tile:20:2fc007cd505f80826be70608bda50f7ba9e8007165c4bb87705749c5e66c80a9` | 8X8D2 block 2 tile 46 | map 20, square (4,2) facing north, column 10 row 8 | `valjevo-scope3-cell-2fc007cd505f.png` (area 3, 5, 7) |
| `tile:20:3f21b975ad2313528724b69d388e3efa2b461b7361bacf567063c5a696ee784e` | 8X8D2 block 2 tile 49 | map 20, square (4,2) facing north, column 10 row 5 | `valjevo-scope3-cell-3f21b975ad23.png` (area 3, 5, 7) |
| `tile:20:5864dc4c7d8e8c41ddae464241ae0ff99cbe16f44ee9c02e27239bfa98af98cc` | 8X8D2 block 2 tile 48 | map 20, square (4,2) facing north, column 10 row 6 | `valjevo-scope3-cell-5864dc4c7d8e.png` (area 3, 5, 7) |
| `tile:20:5b545ea61d854c0086b598dece7e13ff94eea34d6332231adf0408d0908fcadf` | 8X8D2 block 2 tile 38 | map 20, square (5,2) facing north, column 0 row 7 | `valjevo-scope3-se-cell-5b545ea61d85.png` (area 3, 5, 7) |
| `tile:20:5cd74a11ce0ee34721cd7f35ea6d457e48cd065912cdab12b5bf36d7bb722b6f` | 8X8D2 block 2 tile 52 | map 20, square (4,2) facing north, column 9 row 6 | `valjevo-scope3-cell-5cd74a11ce0e.png` (area 3, 5, 7) |
| `tile:20:6974ff73fd4b27570c376339fdf7b4db9c1a195e9bf091fb6640ea6590e60f7f` | 8X8D2 block 2 tile 44 | map 20, square (4,1) facing south, column 2 row 6 | `valjevo-scope3-cell-6974ff73fd4b.png` (area 3, 5, 7) |
| `tile:20:6bcb0080776afc6dd007127d29d9e372c589bc588f41d63999c48b0bd7be241a` | 8X8D2 block 2 tile 2 | map 20, square (4,2) facing north, column 10 row 3 | `valjevo-scope3-cell-6bcb0080776a.png` (area 3, 5, 7) |
| `tile:20:9eec5ff0f33a6c72ec2878a6f5a2d8eee35fb5e99d44acd7fe625205a69d238d` | 8X8D2 block 2 tile 37 | map 20, square (5,2) facing north, column 0 row 6 | `valjevo-scope3-se-cell-9eec5ff0f33a.png` (area 3, 5, 7) |
| `tile:20:aadb7179967b871a1537140e62e72f4efe80518ac8c85bc3e913b3efa47d884a` | 8X8D2 block 2 tile 42 | map 20, square (5,2) facing north, column 0 row 8 | `valjevo-scope3-se-cell-aadb7179967b.png` (area 3, 5, 7) |
| `tile:20:b5ee659c8a04daef26507d557a867032b8a80f092078d1a874fd5eea53660a6e` | 8X8D2 block 2 tile 0 over sky colour 11 | map 20, square (4,2) facing north, column 10 row 0 | `valjevo-scope3-cell-b5ee659c8a04.png` (area 3, 5) |
| `tile:20:ce7a775bfc2e583018da6f17f4f8679bfc0805c8d73f19770e05e048a8b75d62` | 8X8D2 block 2 tile 36 | map 20, square (5,2) facing north, column 0 row 5 | `valjevo-scope3-se-cell-ce7a775bfc2e.png` (area 3, 5, 7) |
| `tile:20:f1d5d200e8ca0ec4295a158726ecac3b5f545803ea8753000774e92e30ddb4ab` | 8X8D2 block 2 tile 54 | map 20, square (4,2) facing north, column 10 row 4 | `valjevo-scope3-cell-f1d5d200e8ca.png` (area 3, 5, 7) |
| `tile:20:f57627006ba7f1682659e0dace099df9cdc3aad43e1da0f1263bdd2ca426dac8` | 8X8D2 block 2 tile 64 | map 20, square (5,2) facing north, column 1 row 6 | `valjevo-scope3-se-cell-f57627006ba7.png` (area 3, 5, 7) |
| `tile:20:f87ce4a1d923b380c59c34794f46d94037dfc23c58e2b82be647d6f3e4acdf25` | 8X8D2 block 2 tile 1 over sky colour 11 | map 20, square (4,1) facing south, column 2 row 2 | `valjevo-scope3-cell-f87ce4a1d923.png` (area 3, 5) |
| `tile:20:ff1d77d3d1eb61a9976147905fd8677ecfe2ad3954c5d4862243f59bc3d85948` | 8X8D2 block 2 tile 51 | map 20, square (4,2) facing north, column 9 row 7 | `valjevo-scope3-cell-ff1d77d3d1eb.png` (area 3, 5, 7) |

#### tile set 8X8D2 block 4 (22)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:20:0f6eabbe54e88f21a2dc14a9f75bd6030a546059e15d4dc2309ff8b7a42f5082` | 8X8D2 block 4 tile 49 over sky colour 0 | map 20, square (2,1) facing north, column 10 row 0 | `valjevo-scope3-cell-0f6eabbe54e8.png` (area 0, 3, 4, 5, 6, 7) |
| `tile:20:1930bf3912f12f181acb825e6e35b4935e2fbbcf9c15b721db739476417319a4` | 8X8D2 block 4 tile 19 | map 20, square (3,5) facing west, column 10 row 7 | `valjevo-scope3-cell-1930bf3912f1.png` (area 0, 3, 5, 8, 11) |
| `tile:20:1ad3ff5cfbfb6f396cc8a3c4230a1c68fb1d77d0a7668b25b7adb12fb2fffd5a` | 8X8D2 block 4 tile 64 | map 20, square (14,13) facing north, column 7 row 4 | `valjevo-merchant-branch-terrain-1ad3ff5cfbfb.png` (area 7) |
| `tile:20:1bf064a94ae89e990280e32913a391f515e1bdb3ed99b3f6309cf0436dcc69c7` | 8X8D2 block 4 tile 11 | map 20, square (3,5) facing west, column 10 row 5 | `valjevo-scope3-cell-1bf064a94ae8.png` (area 0, 3, 5, 7, 8, 11) |
| `tile:20:244e3a737dff103ce562544c8101531a1243923042056f12d1e433b13403ecd6` | 8X8D2 block 4 tile 69 | map 20, square (14,14) facing north, column 6 row 6 | `valjevo-terra-cotta-floor-244e3a737dff.png` (area 0, 7, 8, 11) |
| `tile:20:34bb0ddbaaef14c264fa89af1d76ea141a489a5f95b33d44ce5ce1425ddf1c2b` | 8X8D2 block 4 tile 45 | map 20, square (4,4) facing west, column 2 row 6 | `valjevo-scope3-cell-34bb0ddbaaef.png` (area 3, 5, 7) |
| `tile:20:377420f76a2a02743aa7246fe5abc2356c698f47930ac0cbead1e1b62d2f1e44` | 8X8D2 block 4 tile 29 | map 20, square (4,3) facing south, column 7 row 5 | `valjevo-scope3-cell-377420f76a2a.png` (area 0, 3, 5, 7, 8, 11) |
| `tile:20:39cc1df080453d41cc72fbb1070c6f88e040bb5e36b16cb6cd948bd07b1180f5` | 8X8D2 block 4 tile 6 | map 20, square (3,5) facing west, column 10 row 4 | `valjevo-scope3-cell-39cc1df08045.png` (area 0, 3, 5, 8, 11) |
| `tile:20:582935262251c3c3b53ec076d372c7bebfc34f9076968d8314e319ea8cca75bd` | 8X8D2 block 4 tile 18 | map 20, square (3,5) facing west, column 9 row 5 | `valjevo-scope3-cell-582935262251.png` (area 0, 3, 5, 7, 8, 11) |
| `tile:20:76b41f0cdc6578c287ba79592b23065544ce123c4f9ec8724e8d312657280772` | 8X8D2 block 4 tile 33 over sky colour 0 | map 20, square (2,1) facing north, column 0 row 0 | `valjevo-scope3-cell-76b41f0cdc65.png` (area 0, 3, 4, 5, 6, 7) |
| `tile:20:811b805cdce632509236d3ee37c8661c258faa54df577895612af4b62dc4eabb` | 8X8D2 block 4 tile 14 | map 20, square (3,5) facing west, column 9 row 7 | `valjevo-scope3-cell-811b805cdce6.png` (area 0, 3, 5, 8, 11) |
| `tile:20:819bbf4da7d50ea93fca2fc26d008607ba5e0526948870150042383e992d7c8c` | 8X8D2 block 4 tile 9 | map 20, square (3,5) facing west, column 10 row 6 | `valjevo-scope3-cell-819bbf4da7d5.png` (area 0, 3, 5, 8, 11) |
| `tile:20:8aecaf8d8407332e208a7b64da102c379e9b2652ea0a9a36f92919d46cbfcd7b` | 8X8D2 block 4 tile 67 over 8X8D1 block 203 tile 12 | map 20, square (14,14) facing north, column 6 row 5 |  |
| `tile:20:8e60a227b6b39b0fae6019fcd9e477f38a828215ed10b5927b8bb4bdd9ae42f5` | 8X8D2 block 4 tile 47 | map 20, square (4,4) facing west, column 2 row 5 | `valjevo-scope3-cell-8e60a227b6b3.png` (area 3, 5, 7) |
| `tile:20:a600da3c810d19ab2126c5a1514bbb3d49963f57ae7c3c460cce0607d7ae00b5` | 8X8D2 block 4 tile 60 | map 20, square (4,3) facing west, column 0 row 4 | `valjevo-merchant-wing-terrain-a600da3c810d.png` (area 7) |
| `tile:20:a8232e5d75810f3a283f28e5f234125153457b93e76289360e9575fc30b923a1` | 8X8D2 block 4 tile 62 | map 20, square (4,3) facing south, column 7 row 4 | `valjevo-merchant-branch-terrain-a8232e5d7581.png` (area 7) |
| `tile:20:ad4007119c61bf7d6666c19092a0860486034153aa08a403fd206f9cd1940357` | 8X8D2 block 4 tile 15 | map 20, square (3,5) facing west, column 9 row 8 | `valjevo-scope3-cell-ad4007119c61.png` (area 0, 3, 5, 7, 8, 11) |
| `tile:20:b73acea3df0b2db646411d0c04fc648ecff820f1439bd4439a86f039a0672d84` | 8X8D2 block 4 tile 63 | map 20, square (14,13) facing north, column 8 row 4 | `valjevo-merchant-west-terrain-b73acea3df0b.png` (area 7) |
| `tile:20:c5e2f7ff8d6b146f5520b9e77b107cfc1d8403f75c10befcf30bb317944e2303` | 8X8D2 block 4 tile 61 | map 20, square (4,4) facing west, column 2 row 4 | `new-phlan-south-market-terrain-0-c5e2f7ff8d6b.png` (area 0, 7, 8, 11) |
| `tile:20:ceaa1c6a928af7e169014854674189c9cdbdc41645ce50b1a41756218050daf6` | 8X8D2 block 4 tile 43 over the ground colour 6 | map 20, square (14,13) facing north, column 7 row 7 | `new-phlan-building-paving-joins-0-ceaa1c6a928a.png` (area 0, 7, 8, 11) |
| `tile:20:ddf169cd0d8e5a9b7d91c469c73cfb6e6fdc47a98898e2205291ccbbb40a267f` | 8X8D2 block 4 tile 13 | map 20, square (3,5) facing west, column 9 row 6 | `valjevo-scope3-cell-ddf169cd0d8e.png` (area 0, 3, 5, 8, 11) |
| `tile:20:e9660b0895d8aa142fec4c3ddb0f36b80f500aae4c3394f6680314fcaf79ce8c` | 8X8D2 block 4 tile 12 | map 20, square (3,5) facing west, column 10 row 8 | `valjevo-scope3-cell-e9660b0895d8.png` (area 0, 3, 5, 8, 11) |

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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 219 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 7 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 20 |
| first-person cells of an area whose reading is not confirmed | 40 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 33 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Areas not confirmed, and why:

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
| ICON.DAX:1:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:129:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:2:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| ICON.DAX:130:0:0 | 24x24 | a 24 by 24 icon | `none: tools/upgrade-art.ts accepts no key for ICON pictures` - | the scripts do not name it; the program draws it, and where has not been read |
| SPRIT1.DAX:9:2:0 | 32x57 | an approach sprite | `encounter:SPRIT1.DAX:9:2:0, with its placement under "encounters"` 128x228 | no PICTURE 9 with a plain number is in a script of archive 1 |
| SPRIT2.DAX:1:0:0 | 40x80 | an approach sprite | `encounter:SPRIT2.DAX:1:0:0, with its placement under "encounters"` 160x320 | no PICTURE 1 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:0:0 | 48x73 | an approach sprite | `encounter:SPRIT2.DAX:71:0:0, with its placement under "encounters"` 192x292 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:1:0 | 40x65 | an approach sprite | `encounter:SPRIT2.DAX:71:1:0, with its placement under "encounters"` 160x260 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT2.DAX:71:2:0 | 24x57 | an approach sprite | `encounter:SPRIT2.DAX:71:2:0, with its placement under "encounters"` 96x228 | no PICTURE 71 with a plain number is in a script of archive 2 |
| SPRIT8.DAX:19:0:0 | 24x80 | an approach sprite | `encounter:SPRIT8.DAX:19:0:0, with its placement under "encounters"` 96x320 | no PICTURE 19 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:19:1:0 | 24x65 | an approach sprite | `encounter:SPRIT8.DAX:19:1:0, with its placement under "encounters"` 96x260 | no PICTURE 19 with a plain number is in a script of archive 8 |
| SPRIT8.DAX:19:2:0 | 16x49 | an approach sprite | `encounter:SPRIT8.DAX:19:2:0, with its placement under "encounters"` 64x196 | no PICTURE 19 with a plain number is in a script of archive 8 |

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
