# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining and nothing is left under "Not established". It reports 159 confirmed cells awaiting art now.**

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
| Remaining, all kinds | 159 |
| First-person cells to do | 159 |
|   of which one stored tile | 84 |
|   of which one tile over a solid colour | 17 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 58 |
|   of which the same pixels already have art of yours in another area | 139 |
| Battlefield cells to do | 0 |
| Tile keys in the manifests | 7316 |
|   accounted for by the tool | 7315 |
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
| 3 | Valjevo Castle | yes | 406 | 280 | 18 | 282 of 282 (2 as WebGL wall materials) |
| 4 | Valjevo Castle | yes | 206 | 206 | 0 | 214 of 214 (8 as WebGL wall materials) |
| 5 | Valjevo Castle | yes | 600 | 313 | 125 | 319 of 319 (6 as WebGL wall materials) |
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
| 26 | Wilderness, middle | yes | 301 | 216 | 16 | 285 of 285 (67 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 50 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 194 | 107 | 0 | 108 of 108 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 640 | 0 | 654 of 654 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 142 | 91 | 0 | 91 of 91 |

"Cells its views can show" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.
A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.

How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.
So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.

## To do: first-person cells

### Area 3: Valjevo Castle (18)

Map 3, 5; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1); WALLDEF2 block 2 (tiles 8X8D2 block 2), block 4 (tiles 8X8D2 block 4), block 1 (tiles 8X8D2 block 1).

#### tile set 8X8D2 block 2 (6)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:3:073bed6ce208bae09aa922cc701b2e85d31b89cb815bf9741c330a855b7f23ab` | 8X8D2 block 2 tile 63 | map 3, square (13,15) facing south, column 0 row 4 | `valjevo-audience-hall-terrain-073bed6ce208.png` (area 5, 7) |
| `tile:3:5b545ea61d854c0086b598dece7e13ff94eea34d6332231adf0408d0908fcadf` | 8X8D2 block 2 tile 38 | map 3, square (13,15) facing south, column 0 row 7 | `valjevo-audience-hall-terrain-5b545ea61d85.png` (area 5, 7) |
| `tile:3:9eec5ff0f33a6c72ec2878a6f5a2d8eee35fb5e99d44acd7fe625205a69d238d` | 8X8D2 block 2 tile 37 | map 3, square (13,15) facing south, column 0 row 6 | `valjevo-audience-hall-terrain-9eec5ff0f33a.png` (area 5, 7) |
| `tile:3:aadb7179967b871a1537140e62e72f4efe80518ac8c85bc3e913b3efa47d884a` | 8X8D2 block 2 tile 42 | map 3, square (13,15) facing south, column 0 row 8 | `valjevo-audience-hall-terrain-aadb7179967b.png` (area 5, 7) |
| `tile:3:ce7a775bfc2e583018da6f17f4f8679bfc0805c8d73f19770e05e048a8b75d62` | 8X8D2 block 2 tile 36 | map 3, square (13,15) facing south, column 0 row 5 | `valjevo-audience-hall-terrain-ce7a775bfc2e.png` (area 5, 7) |
| `tile:3:f57627006ba7f1682659e0dace099df9cdc3aad43e1da0f1263bdd2ca426dac8` | 8X8D2 block 2 tile 64 | map 3, square (13,15) facing south, column 1 row 6 | `valjevo-audience-hall-terrain-f57627006ba7.png` (area 5, 7) |

#### tile set 8X8D2 block 4 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:3:7b4217981664a8a19fbe732ce98871e7c7ba760810609049ce8930d96694617e` | 8X8D2 block 4 tile 50 over 8X8D1 block 203 tile 12 | map 3, square (13,11) facing east, column 4 row 5 |  |

#### tile set 8X8D5 block 241 (11)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:3:034c9aa1a85c256022c1df86fc995f479176195907d79789f6c8c6fa12d43155` | 8X8D5 block 241 tile 28 | map 3, square (12,15) facing east, column 6 row 5 | `valjevo-scope7-mounted-backdrop-034c9aa1a85c.png` (area 7) |
| `tile:3:2476c6733bd22d43e5dbfd05326b339da94727390a45f559d25996e615ddb325` | 8X8D5 block 241 tile 21 | map 3, square (12,15) facing east, column 4 row 5 | `valjevo-scope7-mounted-backdrop-2476c6733bd2.png` (area 7) |
| `tile:3:58a8bc82501c2a2c01038b3b2b57be050e281f3573030745cd4ba50b03af2376` | 8X8D5 block 241 tile 29 | map 3, square (12,15) facing east, column 5 row 4 | `valjevo-scope7-mounted-backdrop-58a8bc82501c.png` (area 7) |
| `tile:3:6267250f449a8457fd01a0b0e9c3ce587b836864ffa083666ea5a6f3d2fc7ecd` | 8X8D5 block 241 tile 44 | map 3, square (12,15) facing east, column 4 row 6 | `valjevo-scope7-mounted-backdrop-6267250f449a.png` (area 7) |
| `tile:3:6a871cd6675ac6159a9b6709cdc5ed76909f31c0410f87c572bb4cc98ddf03f4` | 8X8D5 block 241 tile 38 | map 3, square (12,15) facing east, column 6 row 6 | `valjevo-scope7-mounted-backdrop-6a871cd6675a.png` (area 7) |
| `tile:3:8c53631ec54614a29a80d0cb7885c189df7a5dc1725f6ee1073b91a81a6e34d2` | 8X8D5 block 241 tile 12 | map 3, square (12,15) facing east, column 4 row 4 | `valjevo-scope7-mounted-backdrop-8c53631ec546.png` (area 7) |
| `tile:3:8d4aca371c0c1ea560a68503b3da34a410dd93d11b9f421d24d23d067389abb1` | 8X8D5 block 241 tile 42 | map 3, square (12,15) facing east, column 5 row 6 | `valjevo-scope7-mounted-backdrop-8d4aca371c0c.png` (area 7) |
| `tile:3:a9f5aae2fa4147ba2922034548ff9b28d45ba189a5f7b028e881169968d3891d` | 8X8D5 block 241 tile 45 | map 3, square (12,15) facing east, column 5 row 5 | `valjevo-scope7-mounted-backdrop-a9f5aae2fa41.png` (area 7) |
| `tile:3:bf1b8bb021057e7adb35e55fb27d2ad59fdf2a1d4fb07c231494bc5ef2c6b76f` | 8X8D5 block 241 tile 36 | map 3, square (13,15) facing north, column 10 row 2 | `valjevo-scope7-mounted-backdrop-bf1b8bb02105.png` (area 5, 7) |
| `tile:3:e6827fee6b1288beb21d0a9801944af1e05a44a19e3dab5a10d94a0e79fb8a64` | 8X8D5 block 241 tile 13 | map 3, square (12,15) facing east, column 6 row 4 | `valjevo-scope7-mounted-backdrop-e6827fee6b12.png` (area 7) |
| `tile:3:f3e6242ea3d69e677cf33b98ed7c25d6f5356f7736215cc6c38de1e661d1b9ee` | 8X8D5 block 241 tile 35 | map 3, square (13,15) facing south, column 0 row 2 | `valjevo-scope7-mounted-backdrop-f3e6242ea3d6.png` (area 5, 7) |

### Area 5: Valjevo Castle (125)

Map 3, 4, 6, 5, 7; WALLDEF5 block 24 (tiles 8X8D5 block 241), block 24 set 2 (tiles 8X8D5 block 242), block 1 (tiles 8X8D5 block 1); WALLDEF2 block 2 (tiles 8X8D2 block 2), block 4 (tiles 8X8D2 block 4), block 1 (tiles 8X8D2 block 1).

#### tile set 8X8D1 block 203 (1)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:5:73fca805c559f76cbe3313cb1c587758426d3cd915fd5ad36da8f6224c9c6e94` | 8X8D1 block 203 tile 17 over 8X8D5 block 242 tile 49 over sky colour 15 | map 4, square (7,1) facing east, column 1 row 4 | `valjevo-scope6-cell-73fca805c559.png` (area 4, 6) |

#### tile set 8X8D2 block 2 (4)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:5:06145db3166664c76d379016c0ffd7365ff21eb9189eee439750bb5743d9da42` | 8X8D2 block 2 tile 34 | map 7, square (3,2) facing south, column 1 row 5 | `valjevo-covered-gallery-terrain-06145db31666.png` (area 7) |
| `tile:5:3bce9b6a09eef236c940d266a8c91b797f5593ee0daae6f4d89b9f37ea8cefd6` | 8X8D2 block 2 tile 35 | map 7, square (11,5) facing south, column 6 row 5 | `valjevo-covered-gallery-terrain-3bce9b6a09ee.png` (area 7) |
| `tile:5:621564e4d2510319dadceaac73714b14769893f5f27710c56579f0347a9939e8` | 8X8D2 block 2 tile 20 | map 7, square (4,3) facing east, column 10 row 7 | `valjevo-terra-cotta-floor-621564e4d251.png` (area 7) |
| `tile:5:e3186849c39595898dc81456768972ec3ccb4e6dfd818445b630fc0799fea169` | 8X8D2 block 2 tile 41 | map 7, square (6,4) facing west, column 2 row 5 | `valjevo-hall-threshold-terrain-e3186849c395.png` (area 7, 20) |

#### tile set 8X8D2 block 4 (33)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:5:0e154b2b42e53709f209ebe14a14cd59008146dad1f01dc0475f8614a6202889` | 8X8D2 block 4 tile 16 | map 7, square (1,4) facing north, column 1 row 7 | `new-phlan-civic-terrain-0e154b2b42e5.png` (area 0, 7, 8, 11, 20) |
| `tile:5:1ad3ff5cfbfb6f396cc8a3c4230a1c68fb1d77d0a7668b25b7adb12fb2fffd5a` | 8X8D2 block 4 tile 64 | map 7, square (1,3) facing south, column 7 row 4 | `valjevo-merchant-branch-terrain-1ad3ff5cfbfb.png` (area 7) |
| `tile:5:244e3a737dff103ce562544c8101531a1243923042056f12d1e433b13403ecd6` | 8X8D2 block 4 tile 69 | map 7, square (1,2) facing south, column 6 row 6 | `valjevo-terra-cotta-floor-244e3a737dff.png` (area 0, 7, 8, 11) |
| `tile:5:2c07b5fab1efd528ab309be6c35e564bb46750de4ff813de5ff640b6ee22c2bf` | 8X8D2 block 4 tile 17 | map 7, square (1,4) facing north, column 1 row 6 | `new-phlan-south-market-terrain-0-2c07b5fab1ef.png` (area 0, 7, 8, 11, 20) |
| `tile:5:2f4c62ac6c3847a825b124f5b92952adc23efc85b43287238b8da9591d1001a9` | 8X8D2 block 4 tile 39 | map 7, square (1,9) facing east, column 8 row 7 | `valjevo-scope7-backdrop-2f4c62ac6c38.png` (area 0, 7, 8, 11, 20) |
| `tile:5:34c8e1f49742be249357aba1a5180b7fbd7dff4350ff758ba579534fcd9cdb70` | 8X8D2 block 4 tile 57 | map 7, square (1,4) facing south, column 10 row 3 | `new-phlan-south-market-terrain-0-34c8e1f49742.png` (area 0, 7, 8, 11, 20) |
| `tile:5:3c785d52bd5743e287ba141d5549e8235d3b16650a4a6dd89841f7b03fbc28f9` | 8X8D2 block 4 tile 66 | map 7, square (2,2) facing south, column 1 row 5 | `new-phlan-building-paving-joins-0-3c785d52bd57.png` (area 0, 7, 8, 11) |
| `tile:5:480c0193f74fe2f8eebe95e255b18123bc620f775b922bb08febe829502c265b` | 8X8D2 block 4 tile 65 | map 7, square (1,2) facing east, column 9 row 5 | `valjevo-merchant-wing-terrain-480c0193f74f.png` (area 0, 7, 8, 11) |
| `tile:5:49adbe0c989896a2fc859c7518d72be11572fff18d83d579b7eb021b3dba21bc` | 8X8D2 block 4 tile 67 over 8X8D2 block 4 tile 5 | map 7, square (1,3) facing south, column 6 row 5 | `valjevo-merchant-wing-terrain-49adbe0c9898.png` (area 0, 7, 8, 11) |
| `tile:5:4e24210255ed185eb54a70dc98aae7c1beeeb78e5107d1d01b5a931dcae9a8ae` | 8X8D2 block 4 tile 59 | map 7, square (1,4) facing south, column 10 row 4 | `new-phlan-building-paving-joins-0-4e24210255ed.png` (area 0, 7, 8, 11, 20) |
| `tile:5:5d6cc31ad8f8909dbfb51faf0fb70a9731367b107ace2c2761b9eb85951cc9ee` | 8X8D2 block 4 tile 36 | map 7, square (3,8) facing west, column 0 row 5 | `new-phlan-street-paving-joins-0-5d6cc31ad8f8.png` (area 0, 7, 8, 11, 20) |
| `tile:5:624c54394650999904d165e8083586d2c5d9dea1cfb089dcbb22e946cbbf6f37` | 8X8D2 block 4 tile 58 | map 7, square (1,4) facing south, column 9 row 3 | `new-phlan-south-market-terrain-0-624c54394650.png` (area 0, 7, 8, 11, 20) |
| `tile:5:74a379270d22aa664ac146ea1c2a2d893fdc08a1971fd1a49b8ddab1632a6788` | 8X8D2 block 4 tile 68 | map 7, square (2,2) facing south, column 1 row 6 | `new-phlan-building-paving-joins-0-74a379270d22.png` (area 0, 7, 8, 11) |
| `tile:5:78d49be0ec8d85548a56d9b83e8384b76643e1d87889ea01c72df92930638ba6` | 8X8D2 block 4 tile 56 | map 7, square (1,4) facing south, column 9 row 4 | `new-phlan-south-market-terrain-0-78d49be0ec8d.png` (area 0, 7, 8, 11, 20) |
| `tile:5:7b4217981664a8a19fbe732ce98871e7c7ba760810609049ce8930d96694617e` | 8X8D2 block 4 tile 50 over 8X8D1 block 203 tile 12 | map 3, square (13,11) facing east, column 4 row 5 |  |
| `tile:5:8a2485a2d40e912565d5459b113149d70ba66f6b94e463c6967af3caed303cdd` | 8X8D2 block 4 tile 35 | map 7, square (3,8) facing west, column 0 row 6 | `new-phlan-street-paving-joins-0-8a2485a2d40e.png` (area 0, 7, 8, 11, 20) |
| `tile:5:97b40cd88297680a69a47a9f4a38c9abc2eeea77bd894d37ce767387168bd6fe` | 8X8D2 block 4 tile 53 | map 7, square (1,4) facing north, column 1 row 4 | `new-phlan-south-market-terrain-0-97b40cd88297.png` (area 0, 7, 8, 11, 20) |
| `tile:5:9ef13c4eabb84ad92b719a14aa51fbed3640611bb404b4ad2d58eebbd441af4a` | 8X8D2 block 4 tile 40 | map 7, square (1,8) facing east, column 10 row 6 | `new-phlan-street-paving-joins-0-9ef13c4eabb8.png` (area 0, 7, 8, 11, 20) |
| `tile:5:a600da3c810d19ab2126c5a1514bbb3d49963f57ae7c3c460cce0607d7ae00b5` | 8X8D2 block 4 tile 60 | map 7, square (2,3) facing south, column 0 row 4 | `valjevo-merchant-wing-terrain-a600da3c810d.png` (area 7) |
| `tile:5:a8232e5d75810f3a283f28e5f234125153457b93e76289360e9575fc30b923a1` | 8X8D2 block 4 tile 62 | map 7, square (2,2) facing east, column 10 row 4 | `valjevo-merchant-branch-terrain-a8232e5d7581.png` (area 7) |
| `tile:5:b73acea3df0b2db646411d0c04fc648ecff820f1439bd4439a86f039a0672d84` | 8X8D2 block 4 tile 63 | map 7, square (1,3) facing south, column 8 row 4 | `valjevo-merchant-west-terrain-b73acea3df0b.png` (area 7) |
| `tile:5:b8645fd4952e35317fa061a3be9a84e98b48141ba4090c3c1fa13f323d8720d5` | 8X8D2 block 4 tile 1 | map 7, square (1,4) facing north, column 0 row 6 | `new-phlan-south-market-terrain-0-b8645fd4952e.png` (area 0, 7, 8, 11, 20) |
| `tile:5:c5e2f7ff8d6b146f5520b9e77b107cfc1d8403f75c10befcf30bb317944e2303` | 8X8D2 block 4 tile 61 | map 7, square (3,3) facing south, column 2 row 4 | `new-phlan-south-market-terrain-0-c5e2f7ff8d6b.png` (area 0, 7, 8, 11) |
| `tile:5:c9fef07a3a27e1df3aa7274c13835fc6346adacf4e92322f51f648ff0c88809b` | 8X8D2 block 4 tile 37 | map 7, square (1,8) facing east, column 10 row 5 | `new-phlan-street-paving-joins-0-c9fef07a3a27.png` (area 0, 7, 8, 11, 20) |
| `tile:5:cd0c178e86616351240aa2ee992e50a4998ce99d0a7295965dc3a5de8481c2c5` | 8X8D2 block 4 tile 67 over the horizon row (three rows of sky 0, one of 15, two of 7, two of ground 6) | map 7, square (1,2) facing south, column 6 row 5 | `valjevo-merchant-branch-terrain-cd0c178e8661.png` (area 0, 7, 8, 11) |
| `tile:5:ce13abf3874bf1742295c9181afd3559b8263f4ae3d25731c2214fd647da2110` | 8X8D2 block 4 tile 41 | map 7, square (3,7) facing south, column 7 row 5 | `orc-door-4fd647da2110.png` (area 0, 7, 8, 11, 20) |
| `tile:5:ceaa1c6a928af7e169014854674189c9cdbdc41645ce50b1a41756218050daf6` | 8X8D2 block 4 tile 43 over the ground colour 6 | map 7, square (1,3) facing south, column 7 row 7 | `new-phlan-building-paving-joins-0-ceaa1c6a928a.png` (area 0, 7, 8, 11) |
| `tile:5:e1e25d740d96dc559780490d178cccf8720a7224ec2336badb59664c9c44aef2` | 8X8D2 block 4 tile 55 | map 7, square (1,4) facing north, column 1 row 3 | `new-phlan-south-market-terrain-0-e1e25d740d96.png` (area 0, 7, 8, 11, 20) |
| `tile:5:e3d609d69fc12018b9f7d110ea30eccc6d91ee967db698226ce57a499e471dd1` | 8X8D2 block 4 tile 54 | map 7, square (1,4) facing north, column 0 row 3 | `new-phlan-south-market-terrain-0-e3d609d69fc1.png` (area 0, 7, 8, 11, 20) |
| `tile:5:e6c54d795264af5e30cea8c8db38610f1305aa1395cf05b3c96cd7496f272900` | 8X8D2 block 4 tile 22 | map 7, square (2,3) facing south, column 0 row 6 | `new-phlan-south-market-terrain-0-e6c54d795264.png` (area 0, 7, 8, 11, 20) |
| `tile:5:f18136f91922d6527567552b066f06c8cb7d20e84a29007dd8f1305f40782da1` | 8X8D2 block 4 tile 38 | map 7, square (1,8) facing south, column 2 row 5 | `orc-door-305f40782da1.png` (area 7, 20) |
| `tile:5:fbcbe0dd001b4c1a5fb04f913c956be88ece3e87439fb1b050904da2bb1cf1ec` | 8X8D2 block 4 tile 20 | map 7, square (1,4) facing north, column 0 row 7 | `new-phlan-south-market-terrain-0-fbcbe0dd001b.png` (area 0, 7, 8, 11, 20) |
| `tile:5:fec9ae7f67a2d06652571b4104ee754e23f5596dbbae3bd0fa573995cdc2affb` | 8X8D2 block 4 tile 24 | map 7, square (1,4) facing north, column 0 row 4 | `new-phlan-south-market-terrain-0-fec9ae7f67a2.png` (area 0, 7, 8, 11, 20) |

#### tile set 8X8D5 block 241 (59)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:5:034c9aa1a85c256022c1df86fc995f479176195907d79789f6c8c6fa12d43155` | 8X8D5 block 241 tile 28 | map 3, square (12,15) facing east, column 6 row 5 | `valjevo-scope7-mounted-backdrop-034c9aa1a85c.png` (area 7) |
| `tile:5:04836a293e609ba63f00a8ea91daff078a36b261bdfe66c02c4a25dda5f27e1c` | 8X8D5 block 241 tile 39 over sky colour 0 | map 4, square (10,4) facing east, column 10 row 2 | `valjevo-scope6-backdrop-04836a293e60.png` (area 4, 6) |
| `tile:5:0aac84aaaedf81576bc43833d31b2527a862b0aa25a6092920404ffa90b846cb` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (4,11) facing north, column 10 row 3 | `valjevo-scope6-backdrop-0aac84aaaedf.png` (area 6) |
| `tile:5:11f757f6b1489e90bee42a46c92085257733986167a1d214b564b8643c14502b` | 8X8D5 block 241 tile 23 | map 7, square (11,5) facing south, column 6 row 6 | `valjevo-scope7-mounted-backdrop-11f757f6b148.png` (area 7) |
| `tile:5:13d1f056dd172d3976b57c6b0411beb1e18349fe781899f1aaa39fd5c3e7c5fa` | 8X8D5 block 241 tile 24 | map 7, square (1,8) facing east, column 4 row 6 | `valjevo-scope7-mounted-backdrop-13d1f056dd17.png` (area 7) |
| `tile:5:176faa53868619eb5587f27886a3c89bcc01851f2e998b0b8328f516e6dd436c` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 0 | map 4, square (10,4) facing south, column 8 row 2 | `valjevo-scope6-backdrop-176faa538686.png` (area 4, 6) |
| `tile:5:18a18a72e4859362183cce0d2d9574c7fa26182fd5f5baed8267df085e917cd1` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 0 | map 4, square (11,8) facing north, column 6 row 4 | `valjevo-scope6-backdrop-18a18a72e485.png` (area 4, 6) |
| `tile:5:2476c6733bd22d43e5dbfd05326b339da94727390a45f559d25996e615ddb325` | 8X8D5 block 241 tile 21 | map 3, square (12,15) facing east, column 4 row 5 | `valjevo-scope7-mounted-backdrop-2476c6733bd2.png` (area 7) |
| `tile:5:24bb00ef62c14720f6b75173096fdbd228709d9ee5ab58b646ab89ed585de4a4` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 0 | map 4, square (8,5) facing east, column 6 row 4 | `valjevo-scope6-backdrop-24bb00ef62c1.png` (area 4, 6) |
| `tile:5:24fba682c92cad0205b42b70ca5d40d5fb669da18ffd3bf2eed6f96bf188748f` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 11 | map 4, square (11,6) facing north, column 8 row 2 | `valjevo-scope4-screen-4-24fba682c92c.png` (area 4, 6) |
| `tile:5:269390f429db18d5efc50b398fc972456b0d6820a698daa00785aab5c5be39b5` | 8X8D5 block 241 tile 49 over 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 0 | map 4, square (11,4) facing west, column 1 row 4 | `valjevo-scope4-screen-4-269390f429db.png` (area 4) |
| `tile:5:277335998ae644a33dafc1c4ce9d982c0827eb0410a7287ca66690a4fe00b623` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 66 over sky colour 15 | map 6, square (4,11) facing north, column 4 row 4 | `valjevo-scope6-backdrop-277335998ae6.png` (area 6) |
| `tile:5:2fd4016e7b5406246be77caf22c98ed78355268045ae07dabbbc431c8d8373b6` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 49 over sky colour 0 | map 4, square (10,4) facing west, column 1 row 2 | `valjevo-scope4-screen-4-2fd4016e7b54.png` (area 4) |
| `tile:5:30fc530e9960bfd263d2ca53b3cd889b9a05c47e4f8cf364be6e42418ab5b666` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 39 over sky colour 15 | map 6, square (5,10) facing south, column 5 row 3 | `valjevo-scope6-cell-30fc530e9960.png` (area 4, 6) |
| `tile:5:3abb0e9552597674d3f20b9e07926a0f3571ca8e45e575d2c801f84f248e2df1` | 8X8D5 block 241 tile 41 over sky colour 11 | map 4, square (10,4) facing east, column 9 row 2 | `valjevo-scope6-cell-3abb0e955259.png` (area 4, 6) |
| `tile:5:452d9027cc05e132739ef5d86f317cd8b5b9fd6367064d84a15a88a119845b7c` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (10,4) facing west, column 1 row 2 | `valjevo-scope4-screen-4-452d9027cc05.png` (area 4) |
| `tile:5:4a92dcd56b0d6131d823af1fb32cb324a7ff91a8de8a9154eaf7dcfcf152da3b` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 11 | map 4, square (10,4) facing south, column 3 row 3 | `valjevo-scope6-cell-4a92dcd56b0d.png` (area 4, 6) |
| `tile:5:4e7944d1326cb4031b5acc9abf2d42d153ca354493b9aa01be067ab218166e2a` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 41 over sky colour 11 | map 4, square (11,4) facing west, column 3 row 4 | `valjevo-scope4-screen-4-4e7944d1326c.png` (area 4) |
| `tile:5:55cc844fe94c3cf05f29f885d1e5d466c377e4cc21576ee85238490161b10290` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 242 tile 20 over sky colour 15 | map 6, square (4,10) facing north, column 7 row 3 | `valjevo-scope6-cell-55cc844fe94c.png` (area 4, 6) |
| `tile:5:58a8bc82501c2a2c01038b3b2b57be050e281f3573030745cd4ba50b03af2376` | 8X8D5 block 241 tile 29 | map 3, square (12,15) facing east, column 5 row 4 | `valjevo-scope7-mounted-backdrop-58a8bc82501c.png` (area 7) |
| `tile:5:620a6303715d49edcfa38984eb64107d52fd85d1213c89f0b4d2a5c767a3dde7` | 8X8D5 block 241 tile 66 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (13,8) facing north, column 1 row 4 | `valjevo-scope6-cell-620a6303715d.png` (area 4, 6) |
| `tile:5:6267250f449a8457fd01a0b0e9c3ce587b836864ffa083666ea5a6f3d2fc7ecd` | 8X8D5 block 241 tile 44 | map 3, square (12,15) facing east, column 4 row 6 | `valjevo-scope7-mounted-backdrop-6267250f449a.png` (area 7) |
| `tile:5:6a871cd6675ac6159a9b6709cdc5ed76909f31c0410f87c572bb4cc98ddf03f4` | 8X8D5 block 241 tile 38 | map 3, square (12,15) facing east, column 6 row 6 | `valjevo-scope7-mounted-backdrop-6a871cd6675a.png` (area 7) |
| `tile:5:6acb8ac41337dc063fbb2533600cf31db60ca12aa6e5a6ee18bab5b2addacdaa` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 15 | map 6, square (4,10) facing north, column 6 row 3 | `valjevo-scope6-cell-6acb8ac41337.png` (area 4, 6) |
| `tile:5:790d3be54bb230280d606d25814e04d6a0d1312817cb946b9ca24d5b632f2b12` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 40 over sky colour 11 | map 4, square (8,5) facing east, column 4 row 4 | `valjevo-scope4-screen-4-790d3be54bb2.png` (area 4) |
| `tile:5:7cea0473b7274386a81c58a22192153f04b268185154b826d293aa3588e3d018` | 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 15 | map 3, square (13,12) facing south, column 9 row 4 | `valjevo-scope3-map5-cell-7cea0473b727.png` (area 3) |
| `tile:5:8375772bd10ffc5494e66d81aefee21ce250263b5fdf174bd780dccb389a1e49` | 8X8D5 block 241 tile 41 over sky colour 0 | map 4, square (10,4) facing east, column 9 row 2 | `valjevo-scope6-backdrop-8375772bd10f.png` (area 4, 6) |
| `tile:5:85a0d3b1281f79e4c87a2b645c822b26f738ca31f2d23007b529617e29a70a04` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 41 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (11,4) facing south, column 10 row 3 | `valjevo-scope4-screen-4-85a0d3b1281f.png` (area 4) |
| `tile:5:88a4abc41a379d461d579bd14f4baee5e824470bb22f86c7de3d7816f3094826` | 8X8D5 block 241 tile 65 over 8X8D5 block 241 tile 40 over sky colour 11 | map 4, square (11,8) facing north, column 6 row 4 | `valjevo-scope6-cell-88a4abc41a37.png` (area 4, 6) |
| `tile:5:8c53631ec54614a29a80d0cb7885c189df7a5dc1725f6ee1073b91a81a6e34d2` | 8X8D5 block 241 tile 12 | map 3, square (12,15) facing east, column 4 row 4 | `valjevo-scope7-mounted-backdrop-8c53631ec546.png` (area 7) |
| `tile:5:8d4aca371c0c1ea560a68503b3da34a410dd93d11b9f421d24d23d067389abb1` | 8X8D5 block 241 tile 42 | map 3, square (12,15) facing east, column 5 row 6 | `valjevo-scope7-mounted-backdrop-8d4aca371c0c.png` (area 7) |
| `tile:5:935f3ee085e1ae67e735ed893428bfa40eea469106fdccf67314fe34db6e17c1` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 15 | map 6, square (5,11) facing north, column 8 row 2 | `valjevo-scope6-cell-935f3ee085e1.png` (area 4, 6) |
| `tile:5:995d92c29ba324909e4b9f9955ff22ce714acb560baf17f1b598064198459203` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 40 over sky colour 0 | map 4, square (10,4) facing south, column 3 row 3 | `valjevo-scope6-backdrop-995d92c29ba3.png` (area 4, 6) |
| `tile:5:9b7ed76ed66cbf56caea2f54128720afb0451c1fab0ffdbee3790abf7dc6e1f7` | 8X8D5 block 241 tile 34 | map 7, square (1,8) facing east, column 4 row 5 | `valjevo-scope7-mounted-backdrop-9b7ed76ed66c.png` (area 7) |
| `tile:5:9e989607a2760793e5dea1c228a49887cbf26c4c5f53b10f8461239d00a0dff9` | 8X8D5 block 241 tile 39 over sky colour 11 | map 4, square (10,4) facing east, column 10 row 2 | `valjevo-scope6-cell-9e989607a276.png` (area 4, 6) |
| `tile:5:a1422492a11a323aa967d4b0617604f6c483dddeb3b6869cfed32902326899f1` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 65 over sky colour 11 | map 4, square (10,6) facing north, column 10 row 3 | `valjevo-scope4-screen-4-a1422492a11a.png` (area 4) |
| `tile:5:a6fd996f7610c94e0bcca55c1e9f45b8e580dab48f3569e0c22575e102a030be` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over 8X8D5 block 242 tile 49 over sky colour 15 | map 6, square (5,11) facing north, column 7 row 3 | `valjevo-scope6-cell-a6fd996f7610.png` (area 4, 6) |
| `tile:5:a9f5aae2fa4147ba2922034548ff9b28d45ba189a5f7b028e881169968d3891d` | 8X8D5 block 241 tile 45 | map 3, square (12,15) facing east, column 5 row 5 | `valjevo-scope7-mounted-backdrop-a9f5aae2fa41.png` (area 7) |
| `tile:5:ab8a57f8b7d945c1b2573c5366ab8c7a1549d37e95fee46b92057816163b905a` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 41 over sky colour 0 | map 4, square (11,4) facing west, column 3 row 4 | `valjevo-scope4-screen-4-ab8a57f8b7d9.png` (area 4) |
| `tile:5:ad6a37d79ac1c91c0ee850a86c0164c2f02d1c72a1c027cabc277d6fed4a0412` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 15 | map 4, square (10,6) facing east, column 3 row 4 | `valjevo-scope6-backdrop-ad6a37d79ac1.png` (area 4, 6) |
| `tile:5:ae9599a889b5cf5493701142b1abb5c0db263e644d167efddc32054867b55467` | 8X8D5 block 241 tile 39 over 8X8D5 block 241 tile 2 | map 4, square (11,5) facing east, column 10 row 2 | `valjevo-scope4-screen-4-ae9599a889b5.png` (area 4, 6) |
| `tile:5:b31d87199c37e182e16235c714920239131a1090a9b7b6b1c1790d020121f7f4` | 8X8D5 block 241 tile 31 | map 7, square (6,3) facing west, column 0 row 4 | `valjevo-scope7-mounted-backdrop-b31d87199c37.png` (area 7) |
| `tile:5:b677fcc530b5df9b7d61c5a59f3ac9fda54c03c38c3f65107bbdd756385116d1` | 8X8D5 block 241 tile 18 | map 7, square (4,3) facing east, column 10 row 4 | `valjevo-scope7-mounted-backdrop-b677fcc530b5.png` (area 7) |
| `tile:5:b736305be4508242c7df967669e77fe01c85e6e9f59e00040c99b688576de57a` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (10,4) facing south, column 8 row 2 | `valjevo-scope6-cell-b736305be450.png` (area 4, 6) |
| `tile:5:b81d459ed338a2273d2c6f689df64ecad8685258d813911e7d085ea6091abd30` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 66 over sky colour 0 | map 4, square (10,4) facing south, column 1 row 4 | `valjevo-scope4-screen-4-b81d459ed338.png` (area 4) |
| `tile:5:c02f21b9af02daeb56935df1520d8b59068755548cea6821e9fa3677ab1600fb` | 8X8D5 block 241 tile 33 | map 7, square (11,5) facing south, column 6 row 5 | `valjevo-scope7-mounted-backdrop-c02f21b9af02.png` (area 7) |
| `tile:5:c3e679bfe667e39d95541e5dacbbb8ae52d77e6b290b50a882022febb75acbcb` | 8X8D5 block 241 tile 49 over 8X8D5 block 242 tile 36 over 8X8D5 block 242 tile 49 over sky colour 11 | map 4, square (11,4) facing west, column 1 row 4 | `valjevo-scope4-screen-4-c3e679bfe667.png` (area 4) |
| `tile:5:c462f57aac7a3c66ec72ebae802e16b67bb382dc6cc37e351bcf84c092ead44a` | 8X8D5 block 241 tile 30 | map 7, square (6,4) facing west, column 2 row 4 | `valjevo-scope7-mounted-backdrop-c462f57aac7a.png` (area 7) |
| `tile:5:c68f3a4639479cfeff0d8598fbb18a2ea5ab760c33e435a95c3e509e46d41d02` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 15 | map 4, square (11,6) facing east, column 1 row 2 | `valjevo-scope4-screen-4-c68f3a463947.png` (area 4, 6) |
| `tile:5:caa98830d5dbff3c5c1c4d9366de5ae53a85197818997646163f0ba25ab0578d` | 8X8D5 block 241 tile 37 | map 7, square (4,4) facing east, column 8 row 4 | `valjevo-scope7-mounted-backdrop-caa98830d5db.png` (area 7) |
| `tile:5:cc56e96f5ea85cca8d9edc5798377c216b80d3e75c27e0cc2a9d265d727e10aa` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 40 over sky colour 0 | map 4, square (8,5) facing east, column 4 row 4 | `valjevo-scope4-screen-4-cc56e96f5ea8.png` (area 4) |
| `tile:5:d05e4db7f6564c6aa5a34c452a27fb83c5934c5c35803789cffca5a17f2db32b` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 65 over sky colour 0 | map 4, square (11,6) facing north, column 8 row 2 | `valjevo-scope6-backdrop-d05e4db7f656.png` (area 4, 6) |
| `tile:5:da1f848e66aff5a16fd003945cf2097d752f7a9753bec0cd99590ec2fc87ad25` | 8X8D5 block 241 tile 32 | map 7, square (3,2) facing south, column 1 row 5 | `valjevo-scope7-mounted-backdrop-da1f848e66af.png` (area 7) |
| `tile:5:dc159ae2ed50d75f137fb246b446465802cf2bbc0f827430b4f2817239702db3` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 65 over sky colour 0 | map 4, square (10,6) facing north, column 10 row 3 | `valjevo-scope4-screen-4-dc159ae2ed50.png` (area 4) |
| `tile:5:de7d955b786d51d9f00a9668a7ef85732749a3c801acca4b6e74dec00ef47892` | 8X8D5 block 241 tile 49 over 8X8D5 block 241 tile 66 over sky colour 11 | map 4, square (10,4) facing south, column 1 row 4 | `valjevo-scope4-screen-4-de7d955b786d.png` (area 4) |
| `tile:5:e4068d2375541c21af0134e9955f6ff86492a0d6ac66e9bf581ab1e8ce32d329` | 8X8D5 block 241 tile 66 over 8X8D5 block 241 tile 49 over sky colour 0 | map 4, square (13,8) facing north, column 1 row 4 | `valjevo-scope6-backdrop-e4068d237554.png` (area 4, 6) |
| `tile:5:e4758c39443ea936f87b60a8993992efc39576d67c99d67f80a601a5c794eace` | 8X8D5 block 241 tile 40 over 8X8D5 block 241 tile 41 over 8X8D5 block 242 tile 49 over sky colour 0 | map 4, square (11,4) facing south, column 10 row 3 | `valjevo-scope4-screen-4-e4758c39443e.png` (area 4) |
| `tile:5:e6827fee6b1288beb21d0a9801944af1e05a44a19e3dab5a10d94a0e79fb8a64` | 8X8D5 block 241 tile 13 | map 3, square (12,15) facing east, column 6 row 4 | `valjevo-scope7-mounted-backdrop-e6827fee6b12.png` (area 7) |
| `tile:5:f54344a6151b9aa36fd7f48d79eca6886550a2d1954cc4462e47e37300a018ab` | 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 41 over 8X8D5 block 241 tile 65 over sky colour 11 | map 4, square (8,5) facing east, column 6 row 4 | `valjevo-scope6-cell-f54344a6151b.png` (area 4, 6) |

#### tile set 8X8D5 block 242 (28)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
| `tile:5:2b3f05d8a2377ae6f729062ed03ad4a872161392eb6a80b16abf5d167e054931` | 8X8D5 block 242 tile 51 | map 7, square (0,8) facing south, column 0 row 6 | `valjevo-scope7-mounted-backdrop-2b3f05d8a237.png` (area 7) |
| `tile:5:354eae2c08d55fef8b662fd965c00640875c2316400d3e7ba8e51dc7106639bb` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 49 over sky colour 0 | map 4, square (9,6) facing north, column 8 row 2 | `valjevo-scope4-screen-4-354eae2c08d5.png` (area 4) |
| `tile:5:3d4d73e210ce3bd3430961fdd993088b59724598dea65c1157875658fa9fac70` | 8X8D5 block 242 tile 54 | map 7, square (1,3) facing south, column 7 row 6 | `valjevo-scope7-mounted-backdrop-3d4d73e210ce.png` (area 7) |
| `tile:5:431eff9844ad93a53fef4ef7cfdbb6269b4e939cb491b68b6d44071280f8c7b9` | 8X8D5 block 242 tile 36 over 8X8D5 block 241 tile 40 over sky colour 0 | map 6, square (4,7) facing south, column 4 row 4 | `valjevo-scope6-backdrop-431eff9844ad.png` (area 6) |
| `tile:5:441d53b35e5fb372342d02edc2f8177ca5d7b0147d9aaa93365865887281960d` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 0 | map 6, square (6,7) facing south, column 9 row 4 | `valjevo-scope6-backdrop-441d53b35e5f.png` (area 6) |
| `tile:5:4a4a7ef1663aff45e1d5e982a3d3007cd8e92e217f3b58ec2996b3272737bad9` | 8X8D5 block 242 tile 43 over sky colour 0 | map 7, square (2,2) facing south, column 1 row 4 | `valjevo-scope7-mounted-backdrop-4a4a7ef1663a.png` (area 7) |
| `tile:5:4a6d68fa00df0d1406d8784a2fc1b70bac2c6f71664b9b3fbe28f39d4c17b2b9` | 8X8D5 block 242 tile 44 over sky colour 15 | map 7, square (1,4) facing east, column 9 row 4 | `valjevo-scope7-mounted-backdrop-4a6d68fa00df.png` (area 7) |
| `tile:5:51f8f4e98ba63527d92d8e60a40a190930302f62dbb3ad083310ab2d483cf7a8` | 8X8D5 block 242 tile 44 over sky colour 0 | map 7, square (1,2) facing south, column 6 row 4 | `valjevo-scope7-mounted-backdrop-51f8f4e98ba6.png` (area 7) |
| `tile:5:55f0af6ef38801b9bd8391795ea1ec599907c8f85d9a9d3cfb4372170a6b3cc4` | 8X8D5 block 242 tile 44 over sky colour 11 | map 7, square (1,2) facing south, column 6 row 4 |  |
| `tile:5:5ccc45237510b55c91bc749a79b69eab42a9472b13cd428546d75b199e0cffdf` | 8X8D5 block 242 tile 36 over 8X8D5 block 241 tile 40 over sky colour 11 | map 6, square (4,7) facing south, column 4 row 4 | `valjevo-scope6-cell-5ccc45237510.png` (area 6) |
| `tile:5:6829c9458d2fddc78a6561401af3d3b155fde9eccc9d8cf4c254adcc64c06f63` | 8X8D5 block 242 tile 46 | map 7, square (1,2) facing south, column 6 row 5 | `valjevo-scope7-mounted-backdrop-6829c9458d2f.png` (area 7) |
| `tile:5:6a67369f0003a2c06b5cd95263f2506bd134cfe49788903b582c46f21f85dbdd` | 8X8D5 block 242 tile 55 | map 7, square (1,3) facing south, column 8 row 6 | `valjevo-scope7-mounted-backdrop-6a67369f0003.png` (area 7) |
| `tile:5:72062dfcc876910995691a547ec63cf8fbbce8a57eb381f8ec3d4fc167df6776` | 8X8D5 block 242 tile 57 | map 7, square (2,3) facing south, column 0 row 6 | `valjevo-scope7-mounted-backdrop-72062dfcc876.png` (area 7) |
| `tile:5:75d2bb200595762b03076322bf2b7aba0a711b7ea784291ea80ac1b160be7cc3` | 8X8D5 block 242 tile 41 | map 7, square (1,3) facing south, column 8 row 3 | `valjevo-scope7-mounted-backdrop-75d2bb200595.png` (area 7) |
| `tile:5:75f65bee208a738ee1d7fc821740f5c553dea4fd092f8594d80861be72ea4977` | 8X8D5 block 242 tile 52 over 8X8D5 block 242 tile 52 over 8X8D5 block 241 tile 49 over sky colour 11 | map 4, square (9,6) facing north, column 8 row 2 | `valjevo-scope4-screen-4-75f65bee208a.png` (area 4) |
| `tile:5:8429eaf9f85531feb526e9e502bb97f723eda6c7a3ac756e81fbae815df4b91d` | 8X8D5 block 242 tile 43 over sky colour 15 | map 7, square (0,4) facing east, column 4 row 4 | `valjevo-scope7-mounted-backdrop-8429eaf9f855.png` (area 7) |
| `tile:5:879a1aabd10d886eaec41590a013f02b5a359035215e7b295a1739f7dc9329d8` | 8X8D5 block 242 tile 38 | map 7, square (3,3) facing south, column 2 row 3 | `valjevo-scope7-mounted-backdrop-879a1aabd10d.png` (area 7) |
| `tile:5:8f2bc5749983e8f9d8a5b425cdf74cd45842af0a4771d9a4798ff309ee003aad` | 8X8D5 block 242 tile 45 | map 7, square (2,2) facing south, column 1 row 5 | `valjevo-scope7-mounted-backdrop-8f2bc5749983.png` (area 7) |
| `tile:5:92e0f8b26352b8acbd960eb0deb05c9a577b03ca7d144847810c07a378c622c8` | 8X8D5 block 242 tile 39 | map 7, square (2,3) facing south, column 0 row 4 | `valjevo-scope7-mounted-backdrop-92e0f8b26352.png` (area 7) |
| `tile:5:939298a275e1154529cf15704cd10a56bf27bc88cd0c3754386d65ed92935c84` | 8X8D5 block 242 tile 24 | map 7, square (2,2) facing east, column 10 row 5 | `valjevo-scope7-mounted-backdrop-939298a275e1.png` (area 7) |
| `tile:5:93f135101f9839bcf88b3621daa80d8e845f20bf295e971f59f5219524768669` | 8X8D5 block 242 tile 43 over sky colour 11 | map 7, square (2,2) facing south, column 1 row 4 |  |
| `tile:5:a11c7f40f392b813c562930b4f33ba32a8c671dae39b936c4c9a4282f90ca573` | 8X8D5 block 242 tile 40 | map 7, square (1,3) facing south, column 7 row 4 | `valjevo-scope7-mounted-backdrop-a11c7f40f392.png` (area 7) |
| `tile:5:a2eecc797cd64c74e57e5115d9b4d12f177b83131b743c8d7e5547e5dce86055` | 8X8D5 block 242 tile 30 | map 7, square (1,2) facing east, column 9 row 5 | `valjevo-scope7-mounted-backdrop-a2eecc797cd6.png` (area 7) |
| `tile:5:c009daf0934fc92bb54c121a0c0a91d96802fafd65492bbcb72637341efb04b5` | 8X8D5 block 242 tile 29 | map 7, square (2,3) facing east, column 8 row 5 | `valjevo-scope7-mounted-backdrop-c009daf0934f.png` (area 7) |
| `tile:5:cd3061c8e2d2b424a42f7ed64dd02c92c02e9cd434262de345e112a81487dc46` | 8X8D5 block 242 tile 20 over 8X8D5 block 241 tile 49 over sky colour 11 | map 6, square (6,7) facing south, column 9 row 4 | `valjevo-scope6-cell-cd3061c8e2d2.png` (area 6) |
| `tile:5:d0103701afdee200f8a92f470a1e146bdc4efa15b4e8e96cf47119d7218e2874` | 8X8D5 block 242 tile 59 | map 7, square (1,2) facing south, column 6 row 6 | `valjevo-scope7-mounted-backdrop-d0103701afde.png` (area 7) |
| `tile:5:d804ca951e4f5802ca25c6327b81e7f2b2ed41fc768c7a2c90e68791a373b371` | 8X8D5 block 242 tile 56 | map 7, square (3,3) facing south, column 2 row 6 | `valjevo-scope7-mounted-backdrop-d804ca951e4f.png` (area 7) |
| `tile:5:e6f2dba83dbe5bcfca34c65f1ccb3c8c8a47e2873dad93672f4dab68e5a660e2` | 8X8D5 block 242 tile 48 | map 7, square (0,8) facing east, column 10 row 6 | `valjevo-scope7-mounted-backdrop-e6f2dba83dbe.png` (area 7) |

### Area 26: Wilderness, middle (16)

Map 26; WALLDEF7 block 7 (tiles 8X8D7 block 7), block 8 (tiles 8X8D7 block 8), block 23 (tiles 8X8D7 block 23).

#### tile set 8X8D7 block 7 (12)

| Key (PNG 32x32) | What it is | See it at | Same pixels as |
| --- | --- | --- | --- |
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
| first-person cells that show a sky or ground colour no existing artwork of the area shows | 3317 |
| first-person cells of the overhead area view, which no existing artwork of the area confirms | 172 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 131 |
| first-person cells of an area whose reading is not confirmed | 273 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| battlefield cells of pictures no artwork shows to have been on a battlefield | 2207 |
| battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain) | not counted: needs the game's battlefield builder read |
| other picture frames no key names (listed below) | 72 |
| screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them | not counted |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration |

Areas not confirmed, and why:

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
