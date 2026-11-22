# Artwork worklist

## What to do now

**There is art to do: 540 items.**

1. **Wall tiles: none. Outdoor fight terrain: 540 cells to draw (the ground and scenery of fights outdoors: grass, mountains, bushes, trees, logs, rocks, streams, cacti).** Each is listed below with its exact key.
2. **Pictures: none.**
3. **Do not draw anything under "Not established".** Those cells are not confirmed to appear. The QA owner is settling them by play and moves each one that proves real into item 1.

The artwork is done when items 1 and 2 are none and nothing is left under "Not established".

## The short version

This file covers the first-person view's wall tiles, the outdoor battle terrain, and any picture frame no artwork key names yet.
A cell is one 8 by 8 square of the screen, redrawn at 32 by 32. Most cells below are a shape you have already drawn, standing over a different sky or ground colour
(another hour of the day, another part of the map). So count shapes, not cells:

| Area | Cells to do | Distinct shapes | Shapes you have already drawn over another sky or ground | Shapes with no version yet |
| ---: | ---: | ---: | ---: | ---: |
| **All areas** | **0** | **0** | **0** | **0** |

Outdoor battle terrain: 540 cells. Each item below carries `shape` and, where there is one, `sameShapeAs`: the key of your existing art for that shape in the same area.
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
| Remaining, all kinds | 540 |
| First-person cells to do | 0 |
|   of which one stored tile | 0 |
|   of which one tile over a solid colour | 0 |
|   of which plain sky or ground | 0 |
|   of which several tiles together | 0 |
|   of which the same pixels already have art of yours in another area | 0 |
| Distinct shapes among the first-person cells (the same tiles, whatever sky or ground is behind them) | 0 |
|   of which the area already has your art for that shape over another sky or ground | 0 |
| Battlefield cells to do | 540 |
| Tile keys in the manifests | 7908 |
|   accounted for by the tool | 7908 |
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
| 8 | Phlan City Hall | yes | 326 | 326 | 0 | 336 of 336 (10 as WebGL wall materials) |
| 9 | Stojanow Gate | yes | 206 | 182 | 0 | 182 of 182 |
| 10 | Valhingen Graveyard | yes | 1007 | 1007 | 0 | 1019 of 1019 (12 as WebGL wall materials) |
| 11 | The Training Hall | yes | 326 | 326 | 0 | 326 of 326 |
| 13 | The Kobold Caves | yes | 211 | 211 | 0 | 213 of 213 (2 as WebGL wall materials) |
| 14 | Kovel Mansion | yes | 90 | 90 | 0 | 92 of 92 (2 as WebGL wall materials) |
| 15 | Mendor's Library | yes | 254 | 254 | 0 | 274 of 274 (15 as first views of the next area, 5 as WebGL wall materials) |
| 16 | The Lizardman Keep | yes | 419 | 419 | 0 | 440 of 440 (14 as WebGL wall materials, 7 only in unreachable views) |
| 17 | The Nomad Camp | yes | 164 | 164 | 0 | 175 of 175 (11 as WebGL wall materials) |
| 18 | Podol Plaza | yes | 273 | 273 | 0 | 306 of 306 (26 as first views of the next area, 7 as WebGL wall materials) |
| 20 | The Slums | yes | 288 | 288 | 0 | 296 of 296 (8 as WebGL wall materials) |
| 21 | Sokal Keep | yes | 254 | 254 | 0 | 314 of 314 (4 as first views of the next area, 40 as WebGL wall materials, 16 only in unreachable views) |
| 22 | Yarash's Pyramid | yes | 87 | 87 | 0 | 95 of 95 (8 as WebGL wall materials) |
| 23 | Yarash's Pyramid, lower | yes | 78 | 78 | 0 | 83 of 83 (5 as WebGL wall materials) |
| 24 | Temple of Bane | yes | 244 | 244 | 0 | 256 of 256 (12 as WebGL wall materials) |
| 25 | Wilderness, west | not yet | 42 | 22 |  | 22 of 22 |
| 26 | Wilderness, middle | yes | 214 | 214 | 0 | 285 of 285 (69 as first views of the next area, 2 as WebGL wall materials) |
| 27 | Wilderness, east | not yet | 41 | 21 |  | 22 of 22 (1 as first views of the next area) |
| 28 | Zhentil Keep Outpost | yes | 127 | 127 | 0 | 128 of 128 (1 as WebGL wall materials) |
| 29 | Kuto's Well | yes | 660 | 660 | 0 | 674 of 674 (1 as first views of the next area, 13 as WebGL wall materials) |
| 31 | Temple of Bane, interior | yes | 94 | 94 | 0 | 94 of 94 |

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
| WILDCOM.DAX | the scenery of fights outdoors: bushes, trees, logs, rocks, streams and cacti | 34 | 239 | 0 | 239 | 0 |
| SQRPACI.DAX | the terrain sheet: block 1 frames 0 to 39 are the ground of fights outdoors (the same pixels as BACPAC); the rest of block 1 and all of block 2 are the Moonsea overland map's tiles, which Enhanced replaces with the illustrated Moonsea plate | 256 | 1667 | 0 | 301 | 0 |
| BACPAC.DAX | 40 base terrain pictures loaded into the battlefield slots; their pixels match SQRPACI block 1 frames 0–39 | 40 | 301 | 0 | 301 | 0 |

| Key (PNG 32x32) | What it is |
| --- | --- |
| `battle-tile:bdc9bd36ac7f258351c81a3155a19ea5837b6ef164074f0189d876a5ec17f920` | WILDCOM block 1 picture 0, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:5d8e0280c700a1030278972fba6cf67e018773e19f5b6fdece667cebf22592fd` | WILDCOM block 1 picture 0, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:bb50cd7276c60819b494898f3b63ea5ee44eaacd43b007a98991339a93727db1` | WILDCOM block 1 picture 0, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:5549bb216e1186088d2a498ad980e02695dc35f9ed720e1c6009671cb3c93cb7` | WILDCOM block 1 picture 0, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:f031c256493a25481d9939ed673cde0e014d4f7d664670cb95f517a4309139a7` | WILDCOM block 1 picture 0, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:18e92d1d9b56efd5f315e270fb2514ef4e580e78e4f1dcdf6fc9b0d4345b0a50` | WILDCOM block 1 picture 0, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:02444ee06c98ae12f818312b43f973031be3d07169ba405e3011e4e08c089001` | WILDCOM block 1 picture 0, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:9a6ec1fbc20664084aa29da0da4f468ee3ffe86a39a11764c8c4129c3970055c` | WILDCOM block 1 picture 0, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:66454214f7b6801ef0e6f3e8445315b0df0d71d6314987742a6863725bd76ffe` | WILDCOM block 1 picture 0, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:62d789cbc2f00261d5809228a00da17a17b3469c64f61a865199213c5f0b1a3b` | WILDCOM block 1 picture 1, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:d7202c62d5f149a82ea7f055a24fe20f84307feb321741c766270a800f5fcec8` | WILDCOM block 1 picture 1, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:1c080c6c4060a2797df2b65cea7b17dffdd15dffdb7bd72b9390153b7a9fd7b8` | WILDCOM block 1 picture 1, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:eebc6e6ac11c8605acae8861936dceae9cfd323439f46556cd010d5e760dd21a` | WILDCOM block 1 picture 1, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:bbc1beee68d6fa18f33475ddbb81acd9578e154128ca82079a476fb373e9598b` | WILDCOM block 1 picture 1, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:bd28cb8d91aaa07ef51c6bc84de76eb7543ca632617f020fc4f6475a8c0e335e` | WILDCOM block 1 picture 1, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:5ca555b9d884c8be64a563941b1946459e989e7792eb14ba5dec5dd3b9e2b49c` | WILDCOM block 1 picture 1, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:24520767148a24a16a1fb598b4fca8e32be9b1d283b68341bb9540f66115c2be` | WILDCOM block 1 picture 1, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:70c56c18f849ba3ed80e6e1ad43f55fcd22d9659a20c8e8d94e7f96f32991a41` | WILDCOM block 1 picture 1, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:1c0d9694d87ec14a6d652ffbd58ad2578961aa3161f3de565448ebf660ba75cc` | WILDCOM block 1 picture 2, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:23b3a067cb4ed4011b83716b0ab607e61af4f2eec4e162b7296cda03d0775e8b` | WILDCOM block 1 picture 2, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:c183f3dfc17a6cb31f6abb2246ba2d5b3014016e323d9ce69c2faf4385f18dd2` | WILDCOM block 1 picture 2, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:98f792d47baf910d386c8edc798c2b1ff6181513143c20386c02f83c4ad74268` | WILDCOM block 1 picture 2, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:89893cffd3217c86516ce7e3e10c37203b03d658e128ad59b1f9736e1bff96ef` | WILDCOM block 1 picture 2, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:cc5374290001b6543592aae11152de8440277ad321b5f35f8edbed2b5e9966c0` | WILDCOM block 1 picture 2, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:077bc444e47999c49f39a3f59e35581e2d8ff26f6f6813edef4c3a1f21df1bb0` | WILDCOM block 1 picture 2, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:83de34b56af4dbaf7d12f095ffe9b0b718e30d852aae5506f889abb4cd7158d8` | WILDCOM block 1 picture 2, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:b137fcf922530afa197edbb312c43a9ee2026f1dce957742a646afae53c3c397` | WILDCOM block 1 picture 2, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:ba61a0bf4e9e0f18a7b2628fb50ff1a024b1febfa6ee18bfca51f2a92c13de5d` | WILDCOM block 1 picture 3, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:6c20d34516cc766d652b3dc7d8c07fe0ebab3b6312a10742e9b6fc8a34b3dd1a` | WILDCOM block 1 picture 3, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:ea2b1e4aebeecfdacf28e7a5cf5fa4f0d96eaff2231be200a89f7ee283ef98a6` | WILDCOM block 1 picture 3, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:e44f90ed4348ac1d55a16b6c254654ca1a00df6f2c6b09722a2e41035b6046a0` | WILDCOM block 1 picture 3, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:180ac81b3550b8c04d812cec6e31f67a8633cf76f242f8a478df5a9ddba31db5` | WILDCOM block 1 picture 3, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:fdc29540a9fd059b6e1789d3557465524b45656f82b7ac72ebace1a5ff7bb139` | WILDCOM block 1 picture 3, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:63a97e4adf70714e9304f39838d75ac68d7abb69a14abbad5fda750ec95f13c4` | WILDCOM block 1 picture 3, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:0f4ef2cfd45b92d0754cb8d71f08554ae3edbeef1ad2755670a4ef5a0b765386` | WILDCOM block 1 picture 4, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:e9d78e527780e70c7352c135f3b9edf08b04cab101aa68910649416e6c88e2f5` | WILDCOM block 1 picture 4, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:d65fc1d3c62aa7ef32cf84cd9befdbff2fb34fffa3a3973fbd66ffaec7fc6cf3` | WILDCOM block 1 picture 4, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:da4a75137a08d0d61a5bb97eecd2b33aa6a8ced47f658e7ea112650910f9a6a2` | WILDCOM block 1 picture 4, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:63b8c7c6b26f1574ef2cf32c779bdf2f206f20caa642951be0e336ea4390a739` | WILDCOM block 1 picture 4, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:05cf43bcf7db914deae69ab74c627947396f1c04e36de437cdb46ef55a4df364` | WILDCOM block 1 picture 4, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:65ec3aa65cf65653ee91cd5bd9faef53013e1d2de903f79660274bc7ba57d50f` | WILDCOM block 1 picture 4, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:644c79a3abd3dd422c4072d9f5f28fa487f4e70ce5a3061ac136260a384c6d39` | WILDCOM block 1 picture 4, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:8df261f173fe6d99b6079cde2ee1c8ba7f4ed35d23f38feb1584dd057bda95e7` | WILDCOM block 1 picture 4, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:a4968585f1b67dacc9c37e103396bfa4bf93465caad15110c906fbc5a12fca2c` | WILDCOM block 1 picture 5, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:f51b85e9a8f9ca52e7c0d03020a349f1d4ddabdaaa9fac64536d036bffb953c1` | WILDCOM block 1 picture 5, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:a999036cff06f8e6c9907ee4a02d249df541b09eca302a90476e767c19b167c9` | WILDCOM block 1 picture 5, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:f299b535b8875ab1bd98d5760d8260a626a8c2594b8ffaad152d3940d6871845` | WILDCOM block 1 picture 5, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:132988e743b4b1ad6c93c355087fddd817942ead4d0362d7ea7bd907ee38d528` | WILDCOM block 1 picture 5, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:d47f53c0a98ee14f8721f24313832534afdf4b4f6207619df62d5f308fc11e80` | WILDCOM block 1 picture 5, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:a75bec4df2ea4e3ad82c1feebcb9535eac73d062a0480a38997dbeafdcd77881` | WILDCOM block 1 picture 5, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:a92fa5c76a4b75110d3d8e980c544decb90d13ebf91dbd5b9035a36c2b471cdb` | WILDCOM block 1 picture 5, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:478f7b057980ebcf4e364c5ac29139d4d6960778a94c45fe53b6e5efa044032c` | WILDCOM block 1 picture 6, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:c4a5e41979824628ef25ca91b308e7cecff6de1f3e4e09413c84138cd1747f35` | WILDCOM block 1 picture 6, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0eab043a52984975cdb224966ee96af20f1c54e04b66ee92b67e79b8a20a34db` | WILDCOM block 1 picture 6, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:ad1d796233a3a620817c2edebed67a94b4f19c7213256491a639fbfcc633c652` | WILDCOM block 1 picture 6, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:500f02e8337694ec3bbf6b54529fc789fece5eaf65a857a2a2ac816f36eeba6b` | WILDCOM block 1 picture 6, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:966a1299305ba5876029b7327de0d58adc9f2bc63bd4777664897bfb737c32e3` | WILDCOM block 1 picture 6, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:3f40f37a87a243035b06cd3849bcdf20e380511fa92b6de05731c01f9b078a63` | WILDCOM block 1 picture 6, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:2089c395af0b3b2b0cf6738961a7d2cbb6ce5e789a853dc48e7c50c33dca0818` | WILDCOM block 1 picture 6, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:61bc1a1d635c4df473a2f6804cf44174e26bdb431f113d6086d084e60a823f87` | WILDCOM block 1 picture 7, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:65098bf65650683b73c43b20ddfb0c034a5302522977a948775401137e12f307` | WILDCOM block 1 picture 7, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:7a8ae97b6a91141b43b2e49cb4ca57a7f5b97f91b3dad7302496e84e4d47f8f7` | WILDCOM block 1 picture 7, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:cfda737f344b73767fc9f449414864d4d155f2ddd62a660104c7a48f8524adb4` | WILDCOM block 1 picture 7, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:48ed96e3998d9781c4141270e6db0591702e8ccd56124fb067e5d05f7f988434` | WILDCOM block 1 picture 7, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:1f2aec429e675587a2becae6bfdb7b21ff21b7632bd9ea65225b91bb1562363e` | WILDCOM block 1 picture 7, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:fbe502567d24125c466ae18b21b438ec6006b7afe2834d714cfa464ac015fd81` | WILDCOM block 1 picture 7, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:1c720ce23c879d8e8b09e1443c945c36b36823e1be5de7643e9382c15429b1d2` | WILDCOM block 1 picture 7, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:b4eeafa5375fa4c9b2a162727a17c75a4bc0e86f5f3e6ef4f00b4c000ba435b9` | WILDCOM block 1 picture 7, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:80ce11a1aefb403192f4d042ed7ba289c5ec05783b3ff3de8cf9753729803ee9` | WILDCOM block 1 picture 8, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:36789f3a18726f8667e56b1ca0427e8bc00254bcd9b2ce9026abbef87ef7a5c7` | WILDCOM block 1 picture 8, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:e099eb3035927a1fddcc40d2263998c52895eca06853f4464481f6285d260e31` | WILDCOM block 1 picture 8, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:2e0a7a840db33db792f104aa0b2aacdfde6cb0c7a458552e8a785819721989b3` | WILDCOM block 1 picture 8, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:e7a562ddd5026ce1d57b27374fd3c8d768f8312570be192bef7f22096bac67b3` | WILDCOM block 1 picture 8, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:50db68c6ff809e9679c8472177917ee1f36a840de609cdee7d2d1a643b3de184` | WILDCOM block 1 picture 8, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:41923f541cddb9bf14f515f44cd8cc17f74359905a8078b440e0ba2b05a4e2bd` | WILDCOM block 1 picture 8, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:4681c8b4d154248aab5fd966205b86fd7e2f954b2f1d286abea82336ee264ca6` | WILDCOM block 1 picture 8, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:e5b8583a2264fcefd090fcb2eb486b2730ecb82c7c403c1fe93500282858bd63` | WILDCOM block 1 picture 9, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:c45ba96e1f2bf31508a8e030ba9752af08b07dba048fbe0531da01073e7455c1` | WILDCOM block 1 picture 9, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:e772c6e49ae480165e84f0f8caef4e5b67fcec8b9c3a4932f18de4812014d5a8` | WILDCOM block 1 picture 9, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:3e19366639b6e64bdd14f0435248f5a85f5297e64d34c175a6b0f80e64d7e0a7` | WILDCOM block 1 picture 9, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:840acf2ea41c368025d624b9696776903f7e687a01020d665c07db48743c53ae` | WILDCOM block 1 picture 9, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:cade024a10ef046028f982be7e66734cee3a7a4313491f716ecaa36f2ba583e9` | WILDCOM block 1 picture 9, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:af4f73d0fb2e9fb6bb636b1aeaa8008bf844ecee39d361f5db1647501dd4f6db` | WILDCOM block 1 picture 10, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:17baec37947ef618784b5957d7c46e8fb144296925ee436667dc17de4f00386d` | WILDCOM block 1 picture 10, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:d4f375146889daf314080514314adad0a7535e89f9197c910d7b6632d96a710e` | WILDCOM block 1 picture 10, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:c3bed76638809eacd3724bda7fb3887062f749ede859e5b4d8d5c7166e3e5543` | WILDCOM block 1 picture 10, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:4a61cecaa43b80044e66705d8b59fc25cc487b1e6997a6029cfbbbe1624443a5` | WILDCOM block 1 picture 10, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:86193ca6110dfa84c522c258d9a9d3b956dbea23fdf51747ceaa806fdbd0892a` | WILDCOM block 1 picture 10, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:9f1637601968c927c51f3e545f1903c14a99473853e9358dd81f34b68cb6d740` | WILDCOM block 1 picture 10, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:c5553b46140b609b363f54eb037d78543de5c170619cbec1434cb4008e420797` | WILDCOM block 1 picture 11, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:7ca18ca0741e774e8837e515d816533eb1a3374ed4b7dad4e90cfcacbef54337` | WILDCOM block 1 picture 11, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:069da0ae80b9329d4ec0c25474e6e4f9e6bf7ef64eea057c54704b7f4477957e` | WILDCOM block 1 picture 11, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:9be2b8df719052ead034a45ca3d65efcacdff77902b2ab9dad251780ec1b20a6` | WILDCOM block 1 picture 11, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:4fe8256e90887c78a559f90a94c3c805d19a759044a526c91126cfe91482abda` | WILDCOM block 1 picture 11, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:dd494750d20f3080940ca7ab30e4d51a6611f527bd5913b21b920e0c1b11c8b1` | WILDCOM block 1 picture 11, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:9e74db0f6080d98f69f640bd83849d107c488a4eeaf33ee3f0ffd20ebd0e65e6` | WILDCOM block 1 picture 12, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:97c2508b3c6c56c334287151789d1aee2ad029758fd33e509fc4e0033af37d41` | WILDCOM block 1 picture 12, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:faa87c72e1609c1d6a54f27ce4e42f39ad0faba196b8189fd36f575ce3e8bedc` | WILDCOM block 1 picture 12, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:1f77f8bb23c75823d239078de6095c70c734d0ab4291cc4d65c64eac84660295` | WILDCOM block 1 picture 12, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:052d06d330c0e4d80ce9fce6de13696b7b8b6995946b711dec275eb0b7be21fa` | WILDCOM block 1 picture 12, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:3d3725105e93835df88b9de728ee58824a863f181ba4a96f5f340641327c8556` | WILDCOM block 1 picture 12, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:7c202951a7de3fa23aed088fd38e5bf5a25387810a6931edf494245f2665a6b0` | WILDCOM block 1 picture 13, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:f7c930fb75ce0f10986baca05a2fa234976b4384fa6d1c222ad440a372e0f5f9` | WILDCOM block 1 picture 13, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:2bd61474e4b4cc57954e925e96bb945359087a23a31c513ad2cd0e2779fe0940` | WILDCOM block 1 picture 13, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c8d0238e285a201326d5c21594a7cd5215d7515e147301bfdfe8b2030d58e733` | WILDCOM block 1 picture 13, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:b809bb66d772ab5f217d0f9e823cbbdbbb3ba886975de0b2160be465a88d3d64` | WILDCOM block 1 picture 13, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:0664499815533cbeb84acc557c9e29ad0347581ab1c69560c26ba7b8bfef7a5a` | WILDCOM block 1 picture 13, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:c383865c5ed555138d6221f8db17356580dcfa24b466fa1926a7622caad9084c` | WILDCOM block 1 picture 14, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:8877f9aab7353ad7933a0e228b39d9b1f9512b5ec218d18dfcf616bf1954008e` | WILDCOM block 1 picture 14, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:0947dedd56059d08f95221e85af18aa4a2f6786c097991deb31423eacc454656` | WILDCOM block 1 picture 14, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:5876bb9a176e3351410803acf32c1f45cddc02e8af96b330389fd2f72d8d843b` | WILDCOM block 1 picture 14, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:23f6c0a13496804adacb36897f3a16a736b848da8fc85cc24f1b9f0616a2b46a` | WILDCOM block 1 picture 14, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:18daeda594c51f86bab9b79be1b4f60f3320a2117597438487636b970b62c39f` | WILDCOM block 1 picture 15, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:62ded9c229ba6ed188dc9defc970c5021fbe1c1300e83959d67206d5c86f7163` | WILDCOM block 1 picture 15, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:a381e8e9b8465157db94a4239704be42eea3ba10e79e5c9a4b66ac6df7dd45d7` | WILDCOM block 1 picture 15, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:2021672edd1e2ceab1895ad1ff436efb3b575c00565f788430fb827e5f53967b` | WILDCOM block 1 picture 15, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:a0ec106cc9ad8af5236673f5b6516890654048c02553e55fe48f99bde82f6c89` | WILDCOM block 1 picture 15, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:7af209a3e1fb78d271216cc9d1ff6dba11d265285a2d5f41b9fa9005d44f79ff` | WILDCOM block 1 picture 15, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:8ee86705ea4ef1129ffd437017aae253a4a5954cd96840c03bdc52d1db58880a` | WILDCOM block 1 picture 16, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:6e83d52b133f08c3c39922820414bba66293281aad97a9b0f7bbc654d5e5c817` | WILDCOM block 1 picture 16, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:8ba1fa5d2f2f4f86827518fac8f2c7fb727255acac79b448d2869b3f42ad81ee` | WILDCOM block 1 picture 16, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:6a9530f4eda3f44ce2249b3415e015aa214dadf2273c0aa4d3b401a7483fcf68` | WILDCOM block 1 picture 16, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:bce5d2ac67cf69e4dc2b37e3eaaa9dfe5f5069b77b60cd9ce1d809b4f164f439` | WILDCOM block 1 picture 17, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:190ce7ce845b69a51463e4fdddcbe7603e6ed30c6598dc4521978231607fb392` | WILDCOM block 1 picture 17, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:09d60213cf001c9e4258ceda72a08ffb0dc742ede1e84b9bcbd13f9241e43544` | WILDCOM block 1 picture 17, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:c8604ed3ba671b2390fd7b0e9aea7113b81d219f3804131c5a31cba543b579bc` | WILDCOM block 1 picture 17, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:cfcb2574d88e5783200708c0d419bfced211c164640a2e5d48c5e85a0aaa9a5f` | WILDCOM block 1 picture 17, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:a28557e39b8ca9d0ddc103a6714065de1930bde5b89c8c72ae7a2ebe09892afb` | WILDCOM block 1 picture 17, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:5d5e39df680e66041f89008d19247e1909ee312ea98f86713bb284521f178bc8` | WILDCOM block 1 picture 17, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:b8bd90d626d1781cba8cdf051268540b9496c74f1c1f01b09565c12e41057971` | WILDCOM block 1 picture 17, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:ea82c4e5e7fb9b4fd5f5dffe90a19062810939811b9713faadb1293d2b3d7be7` | WILDCOM block 1 picture 17, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:0db9d1365a9cbf60859fde49606e87e6530a70552daec0e185cc0e9791e7241b` | WILDCOM block 1 picture 18, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:7359036e51fe390268a0f6a33dfa466e6add20443a911d69174e75daa61fdb98` | WILDCOM block 1 picture 18, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:33794bc7a80b169c08857bff2658ecf944272e4d78d13ad5a14c296a97234d29` | WILDCOM block 1 picture 18, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:13e7fa0ff7dc5d2448c303e318a9faed6223588e930185b9f24390163186aade` | WILDCOM block 1 picture 18, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:7084ef6b3f0bc8a4ee570445d1edf711f86a40d1fe2a0b847bb0cb4451c2ce0d` | WILDCOM block 1 picture 18, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:6155f13c2650d51faf12b0bab7ecc578d4ec922cdd3f16ce38139212f775ee86` | WILDCOM block 1 picture 18, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c02e91d837f78f5b262e97d46fd10944d2affc4bb49154bcd02f3294acf0a8ff` | WILDCOM block 1 picture 18, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:7687ca05179ee77bbc1af11ef171bc951dd477309e5793e3645192e547267b86` | WILDCOM block 1 picture 18, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:9779b1007aba89f625c5ae55d297f729a8d02848983bf2d887ef346fdc6cef5d` | WILDCOM block 1 picture 19, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:78bd43aad1579dede6a745bb4c1df87e4b8a276fdce9d993d23e618779bb351e` | WILDCOM block 1 picture 19, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:238eea7618f273b2c0a7c6f8ccd23099c178d60bf642473a4f289b16eb37421a` | WILDCOM block 1 picture 19, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:e4ab5d7d08c44d0ff6c74e06fd08a24af00453f82cf45329a96181ab2a82da83` | WILDCOM block 1 picture 19, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:e1e9eaef5fe198cecdf0f6da7a1c9667a7479f239715864df68dcbdcaae3df93` | WILDCOM block 1 picture 19, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:2b52c3ddba89e869dd9730839cccfc5123928964405dfbf376e3cc627ddf5135` | WILDCOM block 1 picture 19, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:ed3b682e2d6cded303bf461267fc4340687fb8c1f6c8ca1c9ef47ab2a4383257` | WILDCOM block 1 picture 19, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:362a8da21c577880eee02f7b9a5ac47660915de4a7e58ea6fd1d9676e7cd8103` | WILDCOM block 1 picture 19, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:5ebe58f6f1d502ec6340c60290897f60e7af3cf522503f45157a13683e9ea8a6` | WILDCOM block 1 picture 20, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:11e6ff65ebdb1654e9cae3151c8c535df0e58c9214168223dff396a436e12b7f` | WILDCOM block 1 picture 20, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:76ffc42d8db77935cae6f2647663f488f6cb182cace1da031bf6509bcd4e2620` | WILDCOM block 1 picture 20, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:0253bb42beeaa732eb7c52273b242e7db34ac0c08a8465747fe298569943cff9` | WILDCOM block 1 picture 20, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:33a343e6e8873e410d84f91b61f8f5d7c25617fdfa56f44c4c31fa6614212bc5` | WILDCOM block 1 picture 20, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:05daca9375eaee5be2c50b0e275434abc51ea7a077eb78b96f6330949996f499` | WILDCOM block 1 picture 20, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c2df80c6c0aa8901942e0ddda62331faf6e7381ec366ba47b0ca1545eb09ff15` | WILDCOM block 1 picture 20, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:5ee833bd25ed5e7183703ff09ae998becceff32e1dbd640bd8148a3f52db3426` | WILDCOM block 1 picture 20, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:3d8c94ee0122b47390cf679da39f2b5887e62d85f535acbbb84d267a422382fc` | WILDCOM block 1 picture 21, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:1943ab61b41935fa0a83df7c34dc9ccce61cb8e9ee0b02c740a67789d4cfe8b3` | WILDCOM block 1 picture 21, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:51d262c760b6e31ec77a1169cef7ccdf86c51a06a9d8155f6e639cf11cec8f44` | WILDCOM block 1 picture 21, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:3331de88a36fb6d0f4911422e7597d025f6660d29ba72356f0a5f13af4d64325` | WILDCOM block 1 picture 21, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:180c4b93496387a3cce54f4cb9174c9642d356baecb3a20321e9492290ec18ad` | WILDCOM block 1 picture 21, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:207a8ab2cb202fc1ecb077d0c526b95942b72c7726a5529315a6b855b1c840cb` | WILDCOM block 1 picture 21, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:bb37ca490ac4c8771b1bdc5e88641784e51c8ccf322cca09889eec9c7686a2f3` | WILDCOM block 1 picture 21, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:a47ea5860eba4639e752496327fddfd895fed13ee71a8dc242147870bb2f23d1` | WILDCOM block 1 picture 21, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:c37483927c40e3c8fb75f97b83b0aa2637d492296c37c08cd62f8b4ccdfe61f2` | WILDCOM block 1 picture 23, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:9c35db9392522a0db8e5e3bb9a58a2715d9dbc2e4ebb87c15871cb321518b971` | WILDCOM block 1 picture 23, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:69597c5f4c11ed3a9467f976397ad43837a749b78696f021e6f57eac47792849` | WILDCOM block 1 picture 23, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:5541d13ec58975378995e813b564e7e87e9d5698e36ab2f6184c92d829f5c41e` | WILDCOM block 1 picture 23, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:e0e4499b789efc9203d84a8d0e7c79d3f6179d3407eacfc96997bd34dc15f5b4` | WILDCOM block 1 picture 23, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:c3d9ca66594b65140d3071723c7d04bb63781b36255c1d58b5ab6aec5e1cfe6f` | WILDCOM block 1 picture 23, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:5b7048d1ac557a9cf41d5d305e059c96b8775673e6b26b0da75036b589704526` | WILDCOM block 1 picture 23, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:955b383fd08522ad0cb6ee4c7068142fb890856a924673dc56d5ad8d81c32964` | WILDCOM block 1 picture 24, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:2cae778b67afd843bb6fe68b5bb1aac46eaa085c1b0ef785f614a768e6b5fc00` | WILDCOM block 1 picture 24, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:76366777df662cf781d83ee1c485c1e895446105366aae3c33cbd2030b847ef2` | WILDCOM block 1 picture 24, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:b7acbfd6d9c65428349ed48ff60f7dffbe0592f7aff4f928c1ae79bb635b9ae3` | WILDCOM block 1 picture 24, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:20f7c1d4f32716fd47d7a1c4917af3fa050f33804748f5d0786ffda05e28b47b` | WILDCOM block 1 picture 24, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:356dc774dda93e4a246cc2002ca5c0849f81ab61a009bf9fbd60328a96aef82b` | WILDCOM block 1 picture 24, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:284a3768f23ac3396b091c1690e808837f2f41dede67e26bb10246aa3d8113db` | WILDCOM block 1 picture 25, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:6a628768780216945442df6bd7c9f1aca10d24837741f751ef458410d138cf27` | WILDCOM block 1 picture 25, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:5a4cc2da30a95d94f9fdc4d8e22e26be6eeef26ffba25578d169588af51fb529` | WILDCOM block 1 picture 25, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:4c36df9df0a776db54d9b15ef1249dc2e3725b92a70c7db5cfad8beec1d153dd` | WILDCOM block 1 picture 25, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:e2ad62bef1518dfb657ec1f614db77d291980e90cbbaf6befb0e8e80aec0a4d1` | WILDCOM block 1 picture 25, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:f48907d7da1a4e6f47237e9efb9bd08e4de0ce0a73a1377acb6069e2770fe00e` | WILDCOM block 1 picture 26, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:e0ea9c642c082144a0099c5e19bfd5fcc09eb4f19aef952fdc91c6a39ed2f858` | WILDCOM block 1 picture 26, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:35ed1f078e0b8aaad367049ef40184d9a68a84402102bd7508ea9cbc286b4045` | WILDCOM block 1 picture 26, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:6b98660ae3a6e28036ff65efaa9e9553a55106e41a9c8ffc6464ffb6db105977` | WILDCOM block 1 picture 26, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:96b1c9dd7623b126255fd5020ad2db35e0094a1c8f48d8ee050228d5bd08c87b` | WILDCOM block 1 picture 26, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:12bcc3ade12a34b22504697a26945de65deccc1ffb1b63c559823bb9c570a608` | WILDCOM block 1 picture 26, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:4dc85a52a338656b47cfa031c57f4c9ae5627b19348bf0529f9ca2525516b535` | WILDCOM block 1 picture 26, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:2464f63f39e0dd0e4fa0a7788515183a7e1e70014cd5f80dc7bd54ebf261d4ce` | WILDCOM block 1 picture 26, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:ac6535b4cf38d28475160e2c2eea4ee5686117f19de8e1d1faf121fd3870ecdd` | WILDCOM block 1 picture 27, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:7fff69614e772f80c6d6cbfb48071a931f75aa7970d1acde442c82c0d66a3e00` | WILDCOM block 1 picture 27, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:11aa42299eb10ac1d08a7190e48f1ba177cc2bb9ae343d1dd8f35ed06bc4e5aa` | WILDCOM block 1 picture 27, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:33697c45ac3cf06293a13dfbaf55b674a397a43d3b24c518292171c524b83336` | WILDCOM block 1 picture 27, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:481b890f6600df08ca5fd4df40c7db2859706a619aefdde699c14975eeefbe89` | WILDCOM block 1 picture 27, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:3d088761106f037ac8d483aa36b42a8aa3aa66bdea42046d9ae8763669a7f1b3` | WILDCOM block 1 picture 27, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:55c9d61f1bc621d798a1472c840ef93d6f8cad04801324b939b5b8da51dada77` | WILDCOM block 1 picture 27, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:630da78be5e136323ff35d4e25d4b3e6c24d3888d860abc4bc558f8428459400` | WILDCOM block 1 picture 27, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:d2bdecf54e44befc5ef6c57240568773ac5ddde17e4dc01d0c1980efcc535e5a` | WILDCOM block 1 picture 27, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:94b5001c31d54dca94e9be0318a8eee69091142815550bf8ddeb107ab9569bc9` | WILDCOM block 1 picture 28, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:69355a85a38ba74f7fd2b9965c39494b11612892ea287fd0abefb0a7a3afb49b` | WILDCOM block 1 picture 28, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:38caf009218efbb3b014b2d1882bf397f876b767c7d463444bced00a94c8ebc7` | WILDCOM block 1 picture 28, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:6020dc674f8a5dd6300f46f10e0f188b0731bc6df4fd23756837f991932e0028` | WILDCOM block 1 picture 28, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:4b88b274ac35bda0e9beb48c4edd607212690b3ebbd0a1e892789cc152079b45` | WILDCOM block 1 picture 28, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:e8cf3e669cade0491d32bb37ceb076e29250102c2a038fa5c50555c4f9a9bae5` | WILDCOM block 1 picture 28, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:538c78cf441742a6e5bfa834783ca585394eadda39c4c93d3d1bc1632273cbf9` | WILDCOM block 1 picture 28, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:b05dfd72a0aa43d5dfc30c1d8c1ffc1a230c3403e5278d52715c304b37054c5f` | WILDCOM block 1 picture 28, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:b90a178afeb5d7056e4e0fc075384cc3d22ecb06ae82c579cd14b1baf10a2f7d` | WILDCOM block 1 picture 28, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:817c7e480d578a451aba530356757ac68815c263ed2bd30d02d5de5310793e47` | WILDCOM block 1 picture 29, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:f7f96bd5691fc9717202577dde7129cf755cfb7fcd44b12c7dfe937fd481ffa4` | WILDCOM block 1 picture 29, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:acfa348fb4cb107acf218a405a7643920dfd37f5c4cd7d971fae139332104059` | WILDCOM block 1 picture 29, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:612e22167c20af29f0568e6a0753435d2837a5ae211b5fabc9e578e306763bb4` | WILDCOM block 1 picture 29, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:aced811a025b8945c1c113ddcb62dfea5f6d53e164abef82ccb42836c44f1266` | WILDCOM block 1 picture 29, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:8ffa8aab5122f20f35accdb03277a5e199e7e1e73528f6de544874a7a318c2cc` | WILDCOM block 1 picture 29, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:a1d671692ccda3b7994adda6536371c39731311819ececd4c2ff1994e157bf9a` | WILDCOM block 1 picture 29, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:04500c8aa5043ec9e99cdda8968ff323547410a9c84278328ec98b953dd606f0` | WILDCOM block 1 picture 29, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:f7ed2e100829b743569f47f9dd584a0134ae40fa220b3310394037197cdc3277` | WILDCOM block 1 picture 29, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:e824eabee508a6d0fc2f011fcdf2bd66a5deee1ce28375634a9b9ca05c5e5c61` | WILDCOM block 1 picture 30, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:de4b42579bda9511548b56750a99eb588587068a257a9c75866d9dc652486388` | WILDCOM block 1 picture 30, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:2c9dacd8c3f7dd35eb602fe70fa6f7f83cc6db4097d0dc10bc9c0d08d694266d` | WILDCOM block 1 picture 30, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:06c158b437d1ad28713869d8f153021370c4fad86b786f002546aa675d58784f` | WILDCOM block 1 picture 30, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:14e0f9f6471dbcc55f787cfbf18ffbf98248ae37b27a1abde545159ef127416c` | WILDCOM block 1 picture 30, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:5c9fdcf12eb9589f116cbd9d6f5d1e62f6ae53bb469a1e7ae940e8211cf54170` | WILDCOM block 1 picture 30, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:231a4be5b5e969b876abdcaf4a08fa4da4a727f84d39d873fc895937b8fc96da` | WILDCOM block 1 picture 30, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:b3427c9947de5bda69787a20e03ce694636d5c51e974891e40a7218434a4a2a0` | WILDCOM block 1 picture 31, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0f5267fc41df70ccbcabc22ae25213b3c3f4e15c001603fc824b231f40464351` | WILDCOM block 1 picture 31, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:508b799ea2964f3d3d473273ccc05c5490a1cb0cd95d02a82c906f6dcae866cf` | WILDCOM block 1 picture 31, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:da117cc8c6cdeaa49cf053b7dfb460c648b1c9a505b0e23321d9689b0caccdc3` | WILDCOM block 1 picture 31, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:69a6f35e4edd9a0145cae9cf205023b4c280ce8ce8b0600c9a9d85533a6fd999` | WILDCOM block 1 picture 31, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:7eb8ab57b6d0979fc1cb1e91489d9fca4484e51deb94941ed2d4b51e7f4b4216` | WILDCOM block 1 picture 31, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:fb4ea876f116715dc2d5ef9031b61bb342351f732de1a799a85a009a20103fbb` | WILDCOM block 1 picture 31, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:456e15d6582c97016a412010848f76a88f296a28c1ff2093724b69304bc7328e` | WILDCOM block 1 picture 32, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:076bc34786757343f263373c71ccdbf8f838df1cf01cbec6a1b1c831a1825538` | WILDCOM block 1 picture 32, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:d3a0172dd78938b39e4b2904afe0ea799b24b88bc3c15d5ef2a1be9def12887c` | WILDCOM block 1 picture 32, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:79e5c2e04fc12bbf22b3d7b07eba3af002da24417a4daa9fa897c0b434b9c579` | WILDCOM block 1 picture 33, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:1926dd6f1a35ef4047f175c46525bb408efadc45add44226401b931251b1d498` | WILDCOM block 1 picture 33, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:0cd18c65a34760c98a056abf87f846d26ade680d035a92aa9c06f940c0838a6e` | WILDCOM block 1 picture 33, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c20d36a49f6d2adbd43c83a04eee5cd44fcea7a845bf3c1cdf360924637cf065` | WILDCOM block 1 picture 33, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:221f03da2332b785113c9f62f7168bc6b89fcf9239ce639cce1fc34127f03599` | WILDCOM block 1 picture 33, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:08dea21f6cd6fb69bbbfa6229981094d3fb16613d4a98ddbdf99e7e0b4d0ce03` | WILDCOM block 1 picture 33, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:fb8a7621b678f465fa23c2d824ac31308086cf3db03140ddc12dfd183bc60544` | SQRPACI block 1 picture 0, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:d7a44145ea8df327afd88433915233f50b0846394bdd89ac76b8def7284ef7a1` | SQRPACI block 1 picture 0, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:48fc028825da763c302653a76388fd5cadc02837fe9e8c8f98d8456c436f481b` | SQRPACI block 1 picture 0, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:5bdde79d023ca3eddba1ae72792af2697ea50950750fe051ff77915472111e08` | SQRPACI block 1 picture 0, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:d0d878109ca83af02dee399573980f83588155f831aa20856918185ecc460f83` | SQRPACI block 1 picture 0, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:604632338abac5aadef196c69ffd91da1886fa7c6743c8648cae151d766d181e` | SQRPACI block 1 picture 0, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:4f1d85b7e0964755dd6add1741d303b7700ef89a96a1537e78ba8731b919ea6b` | SQRPACI block 1 picture 0, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:b202dcb3f9ee2fac12c3f97629e616830b4b5a4066d80a99daed284242023c5f` | SQRPACI block 1 picture 0, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:6df41df7c8b2c294df4d71395b4464cdb017c750009a83666c527dd24ee1e663` | SQRPACI block 1 picture 0, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:8103bdd1a60a12d06bd1731c565cce47e8751a0c38cbfcfe07d5a6e369a9541d` | SQRPACI block 1 picture 1, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:c6d09cfc2a60f6be5856a7ba3b1a3bac85c9aaf7a606bf498115d73e84fec861` | SQRPACI block 1 picture 1, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:1c1a72e5855accf9289abc4de2c80ef425e17ddc1cf3cfbadbd558ebccffc06a` | SQRPACI block 1 picture 1, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:c0fcb2a4d8ba36d1d420e0935449fe47d665e811d191aa5603ca549ca3ff3c3f` | SQRPACI block 1 picture 1, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:968052872d2c9267073d5a1d2737cf0d915bce86061fa82a39cdf8d16b1b49b2` | SQRPACI block 1 picture 1, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:f5eefd351cf78c0f7c8b126f45b5996501aabbc6a75ba727d17269d18e3dcef4` | SQRPACI block 1 picture 1, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c748d6f2f4f39bc43d83bc6a067e547fe9c23ab8cd0af2f1e1af53094a408998` | SQRPACI block 1 picture 1, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:f8a98de85cf98afb306e209164dabe66066658aa777ff6ea5256d4fe371a1bf1` | SQRPACI block 1 picture 1, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:7551aded40bee5a930a249e298a6831175fa17b74fe3692327c01e9122a276f2` | SQRPACI block 1 picture 1, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:743e41c3cbf6d75762da40cf6ca9b432953ccb6faad5fba4a3ab3e22413a6644` | SQRPACI block 1 picture 2, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:5eabe5653347e1318af3b446023a81cec09b37ad5c43407725258aa5384338e8` | SQRPACI block 1 picture 2, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:4844bfa1fc0c3deb509f05eb65897f4d955209b52f732cc245b597039f4581ef` | SQRPACI block 1 picture 2, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:54c6bf93e8b29a44bd58e0155b85304e4b4901a08a055e4856ae382d6c955034` | SQRPACI block 1 picture 2, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:840a5db7b78ea8d4468add0ef34d9c7e9e97182d5163ac7dc9aec687e7362cd3` | SQRPACI block 1 picture 2, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:80b78f7d3ca812699478d7be994b905722dbafd8e34cfc94d13195723fec59d8` | SQRPACI block 1 picture 2, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:3047ffb3e0e06f3598637bc6e902ed5e033313239dbab7c048591113660753af` | SQRPACI block 1 picture 2, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:51e0c0b73abac295ed70f5e9519ed12ea47959ab8a3efaaf4da9cc8291a1f83f` | SQRPACI block 1 picture 2, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:a1abed59d3212a51bdfe910796c14fa9e3c0c48192891aad5c2d8b5c07e670cb` | SQRPACI block 1 picture 2, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:766430fa30d43995f1a377445f518c6c2bb9a0822195b70b1bcda41cdad597b4` | SQRPACI block 1 picture 3, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:717b41ba55c9eda87eb4424598df5c96db56e9d5f6de4633fce154008e1e7e26` | SQRPACI block 1 picture 3, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:cee6cc06c057c7aa47327038aae7745019c77c8c0b886e93c645ff0c65a299fa` | SQRPACI block 1 picture 3, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:56b6dd992a238207ed9a0e30a59347d092dc7e246af958b2b185243843ff0563` | SQRPACI block 1 picture 3, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:aee3d8145cbab84bae7dbc9386f8f8c483d5937e560b9b0e023947c909a208b5` | SQRPACI block 1 picture 3, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:b0890432654f980b500356b350ba869293b3b1bfdbe29210582caf339f973f46` | SQRPACI block 1 picture 3, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c6c9120aeed0288c9a73b9d72f340f1922992a3fd082ad7f3da06ec8c625ace8` | SQRPACI block 1 picture 3, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:dd35067c2ed4aca51b5b9ed6fe18fb6d00004755989112dec40fc3447555e6d5` | SQRPACI block 1 picture 3, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:5c4f070517785d3ab70adfc0486e330b7364b4321f2736d6c09b5b416235c526` | SQRPACI block 1 picture 3, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:6ed0e6b14aafb3aa394ce2c05ef855b999469f5a38705b7135b9759b6338b64f` | SQRPACI block 1 picture 4, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:889d3135365aa39bf4e3b03a94c3755f47aa053b46462549a1c0bdcba3dc1f8a` | SQRPACI block 1 picture 4, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:94f93d921609b7c54f0a48b48f693f88917e10b903a729cdb99a2075bbf387ba` | SQRPACI block 1 picture 4, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:92af8225eec8f2badcdba16734f84e783d55045718621dde48c649bdddf3c4d8` | SQRPACI block 1 picture 4, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:052ceee2c9027d8389f13c65d0e64c814b6fc35b0432dfd1ec2531449b85a354` | SQRPACI block 1 picture 4, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:23e0df49c04f6941722e37fa9644798a1152f21bab57363aba6156c62a927bde` | SQRPACI block 1 picture 4, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:a75fa96805cd4c58c7ab41479066a9c8372a4c2029f31e6fcf65c9b6359c7b4c` | SQRPACI block 1 picture 4, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:ea89db94cdfac7584182201c72d8cf05fb0ef3a6abce9fc785cbc2376858ff63` | SQRPACI block 1 picture 4, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:9aa24f7b2cf4646a76c4308dfcfb4b292c6583b8efcf3c88a9a717730faec7aa` | SQRPACI block 1 picture 4, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:a332d405e302b923286fcdefc3c81a53bec41d1d32c3bd44668d0418c5f29c2b` | SQRPACI block 1 picture 5, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:a055c7cf4c5d8967846ba7f26eedf87242394215fb56aab7067a7cf57f24bb19` | SQRPACI block 1 picture 5, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:ab86fd2355b22dd97baac634ef40d6bbba4bf03cb62a8e0259f4ab9a6137fd45` | SQRPACI block 1 picture 5, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:8a903888d7c3c64342b457a36d9f3db3503bce8e837f8bda999274f1e2132ae3` | SQRPACI block 1 picture 5, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:f1100a5574f6f4fecd6d99cbb19a081050f8ece9703a4f82cbd385045c761b8e` | SQRPACI block 1 picture 5, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ccf8f3c163b954c4ee8de518b2ca57cb7fe50afc03862df46228299f7f6c7d3f` | SQRPACI block 1 picture 5, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:70d09e878503278ab58de1bd0c23c99608f80325c92f25a50cec42ec5ca66e16` | SQRPACI block 1 picture 5, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:c5c1532a0af447705953220189dadbf3f93b9b37261e59767f1a02d23e5600a9` | SQRPACI block 1 picture 5, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:d33111b8f20cb197e2d06035514b38177004c10d157f975dedca04bb3d9360f0` | SQRPACI block 1 picture 5, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:71472bd5d1e19a0e19850119cbe7af56f41218405ecd7a9c8be0761a09419d52` | SQRPACI block 1 picture 6, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:ac705be2f0b7b67e18222a3f249630a52755072f02752a1ea4bdcb9969171858` | SQRPACI block 1 picture 6, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0dfe92132502db579158249362d5858eb614d49f454b2ed0dd7c040c3d065e43` | SQRPACI block 1 picture 6, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:84ca3d9a77390a0fd6e35a53d9021239aeddab722928d1d416ddc28c926aec99` | SQRPACI block 1 picture 6, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:111b4e75d07facbe43a18c022ef2fa4ed3a8aa1d49df63ffd7b96f2bd175ecff` | SQRPACI block 1 picture 6, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:425ac730e678c134738405cd3efdba1fe3c3cfd162d56bdea39be9c9db8604c5` | SQRPACI block 1 picture 7, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:fabad7369c768386d6f724873b34343b246383e7976876fb4036a8c1f647058b` | SQRPACI block 1 picture 7, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:592d3b9b0b25643529d6ea22025dde3f7c92934d83a9d9691d52c51e392fe7f7` | SQRPACI block 1 picture 7, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:0c7a1cb55e84c1460a786ee8d4f52dacac622ac75c817555163944a5e46c378f` | SQRPACI block 1 picture 7, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:31db007149d602f7c631135d2075ffb53fe593b5f98463c7b4e3a3aa9cdccf77` | SQRPACI block 1 picture 7, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:f08b10ea805c5131e6479b83bfb6234b3e4e0874e92df3de9ccd5dac3d5912a3` | SQRPACI block 1 picture 7, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:91c115976d21e984169e3bc05ee02831ecd1349e5612d177d43dbf41f37c8d59` | SQRPACI block 1 picture 7, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:1e2b98d298a8ec24ea320980fad0aaf5c84c6bfcfec21df313da27334762fd09` | SQRPACI block 1 picture 7, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:bfe314cecef7f0090d8c21eab38a9b75569b7e9e3cf7729488ab37410b3c0500` | SQRPACI block 1 picture 7, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:303b8f7a05b9b703607d7cb044ac318bdf3312ac0a81fbb9d3cbc71ef78034dc` | SQRPACI block 1 picture 8, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:015bc91cf45ef004ee0824b1e444c3e3f776c042334bdde0430416bb82dd73b0` | SQRPACI block 1 picture 8, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:7aa22a3df4491132171da27a74f98fcc715cd2d6ee57f2ad66349f932b1fc3ab` | SQRPACI block 1 picture 8, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:7e7ace0e45b2023139236189632faa38bf234e19961a2fa2c6a0b1d4371b8b0a` | SQRPACI block 1 picture 8, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:d98ee019f03e34962de00746f084e33427f44ac1c859923aca1e5070d7910cca` | SQRPACI block 1 picture 8, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:07e190f2a94454ad5f8e8e61a4fad79472db7a44bbff0c8514703b69ed95facd` | SQRPACI block 1 picture 8, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:a652507adb17d41c4893e2583f2e62b27b459e55f8075ef9c3bff788f09648c7` | SQRPACI block 1 picture 8, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:116e064c5f6c0ddd63a7baba38fabab0e27176eb7d9c060847c64013844c613e` | SQRPACI block 1 picture 8, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:8a18373e89230a719014ff5bafb9502958b60aa4c2a893249f7c0d5de25c6c06` | SQRPACI block 1 picture 8, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:af1cfeeb35f4e9e007f6591e1e4ffced3c36950558780df358ec06f3c8d94c29` | SQRPACI block 1 picture 9, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:c169ed378858e195602bb0c521ae4931d9d9d65e5e0f799803eb057f275f664b` | SQRPACI block 1 picture 9, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:325e18c0f8f9fa1045f6c6d9eec11ce036a04801de052d7e717b8acdbaae275c` | SQRPACI block 1 picture 9, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:69806801e5c9d9f41ac2cc1a08cadfa40411e783eb47f41e0663755f87e63447` | SQRPACI block 1 picture 9, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:1dabbeb08adb2f3cbe8597e456c08b168cd3f679928f0d5e03c7cdeeadf0ad82` | SQRPACI block 1 picture 9, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:a3f67a42c8198f93d772b452f001ef25f9e38124f5a6084507e48f64a43e4ee6` | SQRPACI block 1 picture 9, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:1e5e5f29087c08bc1087e7f289cbddbd99b7862e3f2f595f4b7a976261c63e01` | SQRPACI block 1 picture 9, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:29629c25365f8526ad62f370833c7221af290662238c1517db2435bd965ce66b` | SQRPACI block 1 picture 9, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:270d22e4093997f80c44bccf6e9902408f69608f0e8c717599922a69542ed9ee` | SQRPACI block 1 picture 9, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:a1443706b960a54c91fb739e0ef0a21cd85638f377ad334cdf6c8964b63836b0` | SQRPACI block 1 picture 10, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:6271860449a1e0b70fc26b6a73f7cf1b932822d759b2c3ae3e5344f8644af7a6` | SQRPACI block 1 picture 10, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:bb36ae99f76c7a170822abbd05b3164faaa643b13c0851e16b616e8c35d39822` | SQRPACI block 1 picture 10, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:7385c832b167329e2734075a11da3b8260069842b20f1d19e17a0dfdd8deb0b8` | SQRPACI block 1 picture 10, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:eb41a36a83eb76466dc79b15e481d5b6e446a627f07eccd0a009535a1dde1dab` | SQRPACI block 1 picture 10, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:1552dc708a2248d35abb8bcb1fed2b8a5476b0bb008babadeef6cf11a5d59fd5` | SQRPACI block 1 picture 10, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:dc12b8d23396e4f9d57a623820efa5e775468b446ca0c1d1978423468478cced` | SQRPACI block 1 picture 10, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:07d3d12ab97bd46a8e7f1c8ad7e8de007c77dd807e9500f7fcbfe7eafbf70620` | SQRPACI block 1 picture 10, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:86ecb3da34f22c02016890b1bb11e94fdf1c255307ce4678bf7d642a99c45c83` | SQRPACI block 1 picture 10, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:acb80e4cfbca9f9b890c2ff36a46e9ea90266933fef5f70c1e5c16e4b2b659d8` | SQRPACI block 1 picture 11, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:c0b758c67cc7a4483f733d7137a46f02b5fa1baaaf952536035ca356c7c266e3` | SQRPACI block 1 picture 11, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:3f10796a36c9c3d906b011c3572f2b23769df80148f513975ce15fc22088f813` | SQRPACI block 1 picture 11, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:57857bf0004e6a2d54b333992db336f3ec244d8a07e7b3939098e37efdd03bcd` | SQRPACI block 1 picture 11, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:f32af8038f7c7d31a91913e51c41ebafad6bb1e94842966cefebefa00922c97b` | SQRPACI block 1 picture 11, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ef52e561d105a09823db5f9565b6f2a5fa2934033d94c47bb203929edcd1b67e` | SQRPACI block 1 picture 11, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:ddfe58f7c3872092a027de54f1314c77c711276b9ffbc68753cb15cdab23de76` | SQRPACI block 1 picture 11, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:83f8cb7618c6e1d45267541c8ef930043d7dd370606cd89b5b91e43dfe54628c` | SQRPACI block 1 picture 11, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:ef9483a5fcb1a879cac1098b0fab92f3c1a9a5b3c3d6aad5c90bf3b0da1eedb5` | SQRPACI block 1 picture 11, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:c8e117c74c1dd4777d7d8f3d5a0cb7558a588c56767fdba527f758dad6e91a9a` | SQRPACI block 1 picture 12, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:b112c7d7dc4ee245fbd03075fd8ef17d672db5ff7fdf37e03f29e6de2a527c2b` | SQRPACI block 1 picture 12, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:2eee47672ce076942d05170df9358bf7e63ad254e1e9c10c65a0801368780b66` | SQRPACI block 1 picture 12, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:bcd9a61edeac97e65fa4bb640152020a96e3329fbd886353ca4608c22db0fe78` | SQRPACI block 1 picture 12, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:7c5b7b38f9e56d725642c8818b92b6fc24dab242b4aaba4d140325ba62a96904` | SQRPACI block 1 picture 12, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:439e54a99b391087de4535814548e4851544c582f29ae10a818b0fe2cc71efa4` | SQRPACI block 1 picture 12, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:096103b5b1c759be56071673ef4d46303b186f74e4f31c6da6123f641d03a339` | SQRPACI block 1 picture 12, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:e4fbe71c7701ca58339d27d74d61e22ef467e3dfaa2cc847d4047e3f0a10cb03` | SQRPACI block 1 picture 12, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:26389a9de2be1c51ce470244a85d6b156d9dfab1427ba53b5a614e8f6bbb1873` | SQRPACI block 1 picture 12, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:02e7f4cc71e0ddd5d99594f028c764a6793c89ec32e8d6cefce3867efdf0d84b` | SQRPACI block 1 picture 13, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:7bf6a3cad1395bfaaa88d1dafa237308a6f063e1201c3546650c32ab2c11b42f` | SQRPACI block 1 picture 13, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0011f3636fda3bc39f5b6ec3de4a6aedf1d1743c4df2644ecc599e52752cc2bf` | SQRPACI block 1 picture 13, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:90ba3f6bbcddd790deda109495da1cee7a36d6f91e977856574792fc58f78eb1` | SQRPACI block 1 picture 13, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:a400e4d6df5face43d3604a065009735feaac42fb24bce924a17be278cd97467` | SQRPACI block 1 picture 13, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:d45d46c94159c892f09f7a23b39eee1f551977d2015dbfb1acd4c2e43cdbcf58` | SQRPACI block 1 picture 13, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:5f9531d70879f92b881a44737f8f09ac4b214576bfb9da3ee061de9bd64e4aca` | SQRPACI block 1 picture 13, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:c5d0e5bcbc3627d2349f7da65be8f52c39cb111f0f12056e4e2a00c285b2543d` | SQRPACI block 1 picture 13, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:50d29aaa4d8ca78d1492c34d4c28e231544903dbfa2c65f6666e6dcee01bac19` | SQRPACI block 1 picture 13, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:55613c70077d4c9ddbf7bdd5e123564b027d05c84e72052afbacf806ccadc291` | SQRPACI block 1 picture 14, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:451e1c01ee8b65c5bf4318cad5796611cf90bb489eb15448afb0ce9e052a3d0d` | SQRPACI block 1 picture 14, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:eff5cc480f70e065b396fed6f04cdef817336e736ff46262a339a22de1446400` | SQRPACI block 1 picture 14, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:08b7cfdad31643b6ece82ef257015a189c765d061eae13e7dce29a46ca890266` | SQRPACI block 1 picture 14, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:0878b784a02aa79f6548b8b34b8a2c9bf0d52634befd84b1da93358be3e63ca8` | SQRPACI block 1 picture 14, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:3fc917b8b9865c5858add0831124092ca29318506fca293a7fed317f3b04eb36` | SQRPACI block 1 picture 14, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:9be5ab75c84ec60e8323d6d127daab4ab4c790d986eb360db26df8245cc6c5a3` | SQRPACI block 1 picture 14, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:860c14634414107b42918309152f1e755051f5ad14961b4f95869234e7c154e3` | SQRPACI block 1 picture 14, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:3478deb2fa38c585e14673d7b952f1149ab7e1f670d4f86bde151ba0329de038` | SQRPACI block 1 picture 14, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:4bdaf654f3b20dd89ae23ec7e46b7d68d660a993d2419c3c7a415fd4bf0ac533` | SQRPACI block 1 picture 15, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:be28aaff8e369d33dda3f1ed7bff15f7e215c3f252bf1bac11425f661c507915` | SQRPACI block 1 picture 15, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:1462c319a9a56ed284fc104d36845b3205051fc4127278c28d37fdf03a440d21` | SQRPACI block 1 picture 15, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:c467a57966595dd458bf772c73550bcf2d294e6a053d551666e134fe5e6e80a8` | SQRPACI block 1 picture 15, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:b76633caf5edc3ae8c7e8cba4f662ae44774f8da0e4e0884968fa891c1c3c407` | SQRPACI block 1 picture 15, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:534ebd85d2f74641f7075277730e6f3c62a4b5b76b4ec7f329b834d776aaee06` | SQRPACI block 1 picture 16, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:30410a1d0542e3ed491b9f48d86681e1872560e00b00fda277a6f75c8a54d44a` | SQRPACI block 1 picture 16, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:da004ff5be392e79a1a7f86f204058c5593111fe48b3b2797b017df37f4f464e` | SQRPACI block 1 picture 16, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:186f5aff73cd2d076247f8f06058fe7a446248c961eb3ad5b3c73d173fefa73a` | SQRPACI block 1 picture 16, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:a667cf03acb98af717212944986a6748308ff7de2b2849634e4f1a5ef1f5a0af` | SQRPACI block 1 picture 16, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:12ba86e0624afc01605c87d533cc2b122c2501e4efde02f2767c99febaac3301` | SQRPACI block 1 picture 17, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:fc5a9f363b595ced1d0cb4567fae1e4becf386d29cec020ccd742403b96bf716` | SQRPACI block 1 picture 17, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:09ccc2a8d3cd982aaec176d48efa17391c00395d8f32fdc834880c9d39de9ee0` | SQRPACI block 1 picture 17, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:6aee72b88b70a6d38a40b2b54f614e06f9c2d53c3f9427d0116e74d4f1030dd2` | SQRPACI block 1 picture 17, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:e7b49a78b00e0e742ea5552e3827e23002a920dbe08c0b3ffc3fceaed2a33d77` | SQRPACI block 1 picture 17, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:8c6a38ca54a4b16c9034c3dc49300908f173d69206bfba892fdd7acdce01416a` | SQRPACI block 1 picture 17, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:71c1731a3609296a694018e94fa0d925c4c37d790466cca69d159dabe77ca0e1` | SQRPACI block 1 picture 17, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:39d627c16b3998d771a1c0ced8cba38c5ff6374680dc1e2e262ec957ad938402` | SQRPACI block 1 picture 17, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:ffee728611a31d1612154c5ce476546227da10a7729bf374bb413b8409bfa987` | SQRPACI block 1 picture 17, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:0f6b25ae888ff241119691e048b4af573ae5ade9baafb4b5d7f7beaaabff2860` | SQRPACI block 1 picture 18, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:869a59fd645aafa8361d45449d05ca26fbd5225afcfe3d8499793ee5aeed5cfd` | SQRPACI block 1 picture 18, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:e80a17fdc49a0c424b14bb4315ef577b85b7ac815c4c70ec87acc116171bae9f` | SQRPACI block 1 picture 18, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:7b4239ec41bc7278390083d94ac6d48f6575bfcc18077f91f645aaf75855b0c7` | SQRPACI block 1 picture 18, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:35aa2770e28f52c123e015c29c607abb755c20ade884ae7bf80d6e177b12ad73` | SQRPACI block 1 picture 18, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:98e10bb1ca7d1f834b1fd358d5dd2b602f2753c7207a8b5d2dad556b8f7f8715` | SQRPACI block 1 picture 18, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:98e0df96a64c20f7dd886da4be5e1148f3fe2bc5fc6a93b4f0166130777e6c9f` | SQRPACI block 1 picture 18, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:1802fc9707f9f3756aeca1693fec40fc723afa21cd2dd800d3f04279f98cbd47` | SQRPACI block 1 picture 19, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:2561b1242f3783e994effd35ae0506018370aa3da831c29ea0e3b79fcc255774` | SQRPACI block 1 picture 19, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:d6af2d8f65ab58f5f7607ce7a167e4d2b4bd3dcb8fb735485f5d8f98c8b40dc2` | SQRPACI block 1 picture 19, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:e102d4546055a5d8838bc1f2a5e2e9118b00b4b4ec694c828fe42b8510a264ee` | SQRPACI block 1 picture 19, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:af047d3b8d1011d80610e3b017e63207aee74ac0692d224d78b4ade528ea48bd` | SQRPACI block 1 picture 19, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:0c496a77d5e7a3735f4a7915089846e822c3e71eb6b5d475115063c11913fcc1` | SQRPACI block 1 picture 19, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:439ff42b8a23b26175e38a73a4bbc3a8512ec68139fdd5fa9f06bd850db404fc` | SQRPACI block 1 picture 19, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:cf4ef4331bf6acf65de8fb781151b36536f4f042db0f4154925eff112b81bfa9` | SQRPACI block 1 picture 19, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:b16454a28d3ed9bfa739e4190fdde054151eaea7481ea664cec5d095230ad5d0` | SQRPACI block 1 picture 19, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:f7ce540f9915c87a5befb56c870bf790e918006e5ec837d048e001a2c984735d` | SQRPACI block 1 picture 20, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:91f445751c7fb6be7e5ebd641da074ad6731917b5d3fbbbbac0403f8e4093968` | SQRPACI block 1 picture 20, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:6a0faa8009a42e12c31b46db3f80e046e9423ccfb7583c3e03aced12a0645984` | SQRPACI block 1 picture 20, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ea518e1c5326125461dfefd77b9fd95ddf73c4cbbb8b35698530bc9b7bf4f795` | SQRPACI block 1 picture 20, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:df3efa0786fe945ecf557ed064f2820ca995134523c71a9b624c6c24af81f057` | SQRPACI block 1 picture 21, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:5fffdb6abeb3d8874f78029a7606e859bb98394e66d3bc5a88e89581641da24b` | SQRPACI block 1 picture 21, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:2f79515dcc1347d9bb5574a7109fe21054c84ac083c9a55c7216cf44d522cabd` | SQRPACI block 1 picture 21, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:172f4902c02d8e7a7b92509ef633b70a9aaf0728a5b6e9c06a9b042b9ec9f1ff` | SQRPACI block 1 picture 22, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:23f6c5d5d55ad31d36339ac4c51637c7ca175e091d9a84dbd3ffcba0d7d3cee0` | SQRPACI block 1 picture 22, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:cc5da29a7c4d9f46494fb34be7171ec4aa1db59db9f6292dc6ba342936186142` | SQRPACI block 1 picture 22, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:12d23f253c6b09a81159178fc06d7e25be9b206794786464e86a77dae37b592f` | SQRPACI block 1 picture 22, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:14f09b9e5d9c309aa85ae3dcbae74395a6e1ae83b3b1d980455886919144d935` | SQRPACI block 1 picture 22, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c1019dc4e1a05e4446338163ac7dbef36e16381d143fdac86fb75211848e0239` | SQRPACI block 1 picture 22, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:76431cc4b4034588b25b452d7869b061e92c28b70fa06ab299b70c15148b54bb` | SQRPACI block 1 picture 23, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:2542650137df545fca95b675c94fe327fc92aeca43eb842010d76a1cccd49360` | SQRPACI block 1 picture 23, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:51352fb55835eed8b0c239d5854eb0c4acda379863d8dcd4e8492bfbd0302687` | SQRPACI block 1 picture 23, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:2f5e78a1396fad4fce1f54ec3631addfde816b8ba6ead5464ef588476d1dc1ca` | SQRPACI block 1 picture 23, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:8d5d937c523def281d98465713a5eb1ec56857ef82705b1a64f6d59e570a70cc` | SQRPACI block 1 picture 23, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ce91dbe2a2d320e525bc1b0b81347f06f8f82c3c7f53d67fe624a49077c3ff6e` | SQRPACI block 1 picture 23, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:3f5e16af54a0739ae9df53d0b008ecdaaf096fb0bdf149ff9b4a2f0a3631e1c6` | SQRPACI block 1 picture 23, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:f51272c8c3de1fec3bb59d2e74eef5294683e64eb7a123a26dc0885c7e835918` | SQRPACI block 1 picture 23, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:88ff3db2d4265ac8d377639cf5bb184fc7a1846134bdaaf15f0d84c9e2d437b4` | SQRPACI block 1 picture 23, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:230af22ae429ff4eb7dfef443296583849e949208135c5f9504b76ae1f8fdfcd` | SQRPACI block 1 picture 24, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:c55916de9cf4d368ba6f301b4051b4d38eb619cc846eff05bb4a0ba63c4aaf3c` | SQRPACI block 1 picture 24, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ff4f31d9ae9256cfcc66296d41f37e7332c3ad3d57c793b09e1b044538a2f8cf` | SQRPACI block 1 picture 24, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:a540de3482f154f488bf2997ac77fb655b52ae90a46e032b8bf352af101d1a4d` | SQRPACI block 1 picture 24, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:17540274e5ab84abf5d6d1f6d52f59ada86cdc96199399535a0658b27ad67022` | SQRPACI block 1 picture 24, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:eceeb3137b8b862ade57a905f4d32b8824c53e56bb85df4e96539bb0dbdbe80e` | SQRPACI block 1 picture 25, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:2c1d02556adbac4f25cb1a01376080fab1da8843ef447f2506f06b1bfb1daaca` | SQRPACI block 1 picture 25, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:4ecb0b19fd412044b30c2fac6b3e158eab74a7c96bade072a09eec891d755ae5` | SQRPACI block 1 picture 25, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:f0851f1de4c23560fdd21c67615c764d44bc30d1bc39a2035620b2966a320df1` | SQRPACI block 1 picture 25, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:e3df6773642d1930ee23a39b667866cb40b9a62661fff2823421508cd1c1b005` | SQRPACI block 1 picture 25, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:4f95e1dee17e94dbb55e52529a901233d8b8d2eed0753fbc506ecafde13c4114` | SQRPACI block 1 picture 25, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:ebc49bbc946f8a316431d0ef6751d89d043ad66f94d9372ca09262159bf7a2c2` | SQRPACI block 1 picture 25, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:ff19c52e35a91a30f7a9eaab1844b0de9691ffb3b02aef3254390da147aad4e2` | SQRPACI block 1 picture 25, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:c413ece5b1ee6005e5aec85033c917080b3b9d49856ab3a918ba2c4aad8c49f1` | SQRPACI block 1 picture 25, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:66f5e18a4f636ebc2b8ff3328c27e3ae011e58afdc2ebe367fd64743c7fc6770` | SQRPACI block 1 picture 26, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:2a3d08f601aa16561a83abf3fc7e5e43b557a6e3ed43dc5fffb1a7881f962a1b` | SQRPACI block 1 picture 26, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:f3226acf50053d47af3a85a4286529eccdd52c9454bdd693955b9aded46d232c` | SQRPACI block 1 picture 26, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:82b0e2ff29123656764f6ac8ff3891c3f985ca51e7e830999d9470205a2da5c4` | SQRPACI block 1 picture 26, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:3fea9cdcf6440d9dc8f51298493cbc41c106cb5a16910f4502981639515d50c4` | SQRPACI block 1 picture 26, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:ad556b462c727b170cb75f8d491ed190da7bd368a332cf7765152d4a5c1f6ea0` | SQRPACI block 1 picture 26, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:ec53be03e7b34ad91b33de182d4a688c58e2c5eeb94db9c88f3ecc882f45c20b` | SQRPACI block 1 picture 27, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:b52d808e76f15e45938b657a4b06d0b3b2fa58d87a2d52b630dab9ee812cbd89` | SQRPACI block 1 picture 27, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:65f0d3d992fec9028159c15e316e8fd8ea19ef04a03901410c4d410eb3e53578` | SQRPACI block 1 picture 27, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:67ffc921e650ea86f34dcfee035821f6c889d0016e7ce844c8b7d65a1970aade` | SQRPACI block 1 picture 27, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:8c6651d3a67361d361f4f29c80c07d9778b2ce2a8d38ed74731dcfbfffdb899d` | SQRPACI block 1 picture 27, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:c8319d8d2430f78a1eb39ff0bed151d56d0b5749d8248d1319fc638139b55160` | SQRPACI block 1 picture 27, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:bad1ca2438d484fe808b8e2df0569693aff7c86afef4477a2b0fce8412d6eb81` | SQRPACI block 1 picture 28, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:724f484993204c584ed0d14fe28e92421f17917ee58a74fd5c84c141bd77f3b5` | SQRPACI block 1 picture 28, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:66f84cde038ccce6123b22ba9a1d0029de0529e5b965f1c33614beac20efa336` | SQRPACI block 1 picture 28, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:59bcc88ea11360e87d7088b2a313089fe65a35992d7b0d5b802490ef43ce5a45` | SQRPACI block 1 picture 28, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:d9d77100335f307100969f7841c5a56132ec163618ec4f75e1fd8ba3687bb1e8` | SQRPACI block 1 picture 28, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:f788b941bc5c5c719c7a05fc97220060767ff2b96342ac2480b8d5ceca083eac` | SQRPACI block 1 picture 28, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:798703174669b8dd69b0094b3ea5b2b748ce5dabfe7bf0ccbb4fcc462102cd4d` | SQRPACI block 1 picture 28, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:8ac122f626512300a18b38240f9e82246f8fd9101dbd3f2fb74869739bae014e` | SQRPACI block 1 picture 29, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:7b001d39ef705017d251cff6a57891d362aa8b09194d83041a49f6b812531b26` | SQRPACI block 1 picture 29, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:9211d009786a4ee7c752c8d27645b12e6da6beead3202563a68021c66fb4dfdc` | SQRPACI block 1 picture 29, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:a401121ee0c8240f7ab98f684b6253e77247d7d128f02af677a7d1587996ec91` | SQRPACI block 1 picture 29, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:bd33bb276d9d1a71e91e72e0024d0a49e81f02795402f137484d6e523793fe24` | SQRPACI block 1 picture 29, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:df18fc608c4427233fe6efde879dab1b93c41c990039988885e81591b39e5045` | SQRPACI block 1 picture 29, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:3c91053c5d4e677a219776ea9d1401b742dafa346a59f174598838fd5217d592` | SQRPACI block 1 picture 29, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:4293c39db74d1ff925419d705d45fd1c9d1ec6587d13c203d79210b4b8ba40b4` | SQRPACI block 1 picture 29, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:fb730731fbd9476549d16c981af49cb485b613d0f6f07603b614f7d66768e439` | SQRPACI block 1 picture 30, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:cfe256ce12095d3f1d167c7abd79a9d947e1bfa653e05c1add4cee24331287ff` | SQRPACI block 1 picture 30, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0afedcd52d1ca37fe82b8d935190abc97562cfc08dbeb9d7ed8322150166e798` | SQRPACI block 1 picture 30, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:d200206d7a87166363dc45c1b02d12a672b08c123843fdd196ef67aad15df205` | SQRPACI block 1 picture 30, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:f852e8f3bd2fd154f7fb31d28d97ce9c425714a146c696d29b020b80abf81fbe` | SQRPACI block 1 picture 30, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:6e61f500843df2793c6568895c2e45b9b28a676b665f9bf86b61b1c2906499cc` | SQRPACI block 1 picture 30, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:1d05bb79bedb9f2cbdf6843a7a475550905de5e31a40e1d67995ea682736d35d` | SQRPACI block 1 picture 30, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:dc3211cd169d49e0c793f66b1815a3beb31a52a491f81a9e1429ad58cdb0083a` | SQRPACI block 1 picture 31, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:08018d514d73f3b019edc2c9d8f773612513e4a86f6b93569caead120c83ebc8` | SQRPACI block 1 picture 31, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:c7452d1fb23c3055270e412120b7ed6ddb3ca447b647a717c2e3d36c37d2542d` | SQRPACI block 1 picture 31, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:b952d8509e9f71d069faef4492e116cfd27f21bba0c1da4636beb5e1cc67a058` | SQRPACI block 1 picture 31, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:7768aa675e405d2a1544ac73a7d8470e6429cc46318ce694ef60e67850f8d5eb` | SQRPACI block 1 picture 31, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:166645219faf58c5bc9579a5de2ffec096bb286e31d912cf196d033915374211` | SQRPACI block 1 picture 31, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:aae9f5e9c17ec42f66d0938b37a00efc50904c738e9f7f9116213addc87ff506` | SQRPACI block 1 picture 32, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:26efb63b6a135c1e0376c1245f64b2c6f70e3e3d9b4d4580c41b422a9d90fe27` | SQRPACI block 1 picture 32, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:c354ef758e2aa84af933b0c1754f255eec54ee3859291db5ada2ede5499de377` | SQRPACI block 1 picture 32, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:5c99f2c58cd2d2972010c80e80898ec7fec6a3c4675a19b35b43fb9a54753335` | SQRPACI block 1 picture 32, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:8a2432e70faa429900b244cf9d706f23f5a1a7915c9035ced991fcffc05da8dd` | SQRPACI block 1 picture 32, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:c924cb087190b4039e9b22cbb3d378e1202896ba985cc462104c9e49294e04c9` | SQRPACI block 1 picture 32, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:b6ac399a1eb6b63342926705f24f4b92ec332cef56aa4e10078dbefa1de5c2d9` | SQRPACI block 1 picture 32, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:a91354768a41550e6fdffdd1daa3e48c3a43bff7316d5374314e353aaa4ebeca` | SQRPACI block 1 picture 32, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:f3a170757a5d9772094eb3fcbf320ee023114c8a3c93411f9ff8893871d0a411` | SQRPACI block 1 picture 33, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:6296436d3c0fbde22ac2aea7f3a4423fdfbe4e3f68003a72f78abce05aaa2ac6` | SQRPACI block 1 picture 33, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:7732e01d3bad1b1309b534d2d8f09573ede6899effd40b6284fa5ba6daf9295c` | SQRPACI block 1 picture 33, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:8ad6d917bfd7c454d026401e8289ae9b9d79fcfd9b56a6af0e2924510d25d281` | SQRPACI block 1 picture 33, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:c822ba7c15bce665590b7bc7292a50c883668ed44c5dcee8c8d6d6693ccd37b6` | SQRPACI block 1 picture 33, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:8c5a20d7a3e04b9a0d115b346e16bde84e00d107f085d2e34116e45d98327213` | SQRPACI block 1 picture 34, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:661da25d2604f5a4687194380bc5ce35067ff718055b1e8a1ae87183f7f77d13` | SQRPACI block 1 picture 34, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:49e5b46c37be0d9bb3273335dbc6c29762e5ce9b04d5bfa02ce8f1a5bd5b3966` | SQRPACI block 1 picture 34, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:4b80742873b5150280c8e2a4fc1540b542294d35ee26769ed8429de171cc517e` | SQRPACI block 1 picture 34, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:0df69cf6691db5e998c67af870cf83608868bd4ae0a68f614502734985661a8c` | SQRPACI block 1 picture 34, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:40f9bb8339b1929cd59f3adc86c09958301c9a4561a015b75d8f4d0a64045541` | SQRPACI block 1 picture 34, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:04d3cf4aad343e85fa0d4cc4828fdeb76bf9717c97eefa52a507f45a96c1ef08` | SQRPACI block 1 picture 34, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:1b2dd2c93eae4ad86af7e426a36dc7f9fb5393de1e1c15b8b979a3a6fcc961f7` | SQRPACI block 1 picture 34, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:1a8044f0f95dc77701da457969fefe572d7b445bafcb316a598db3fbb17ee4b3` | SQRPACI block 1 picture 34, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:9e8f9f1e8c0853a2baeb4f19c20c40f64d37fcb67899c5b68f55706f9666884c` | SQRPACI block 1 picture 35, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:b0b187e95557e87841988c2081d4ae11c361aec5a91dc1d6711989ed7dc038d4` | SQRPACI block 1 picture 35, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:2797d2a306d4935a43b05022ee0710d47e6a9030ff60a4cb1b546f2a8645637a` | SQRPACI block 1 picture 35, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:310972514a47edfe14bad1c2c596c6405da748cef7e4be4c3308e701a122650c` | SQRPACI block 1 picture 35, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:add28f08d75a078f88fdb0e7f4a8bfd5e54a4e430b748ba90017a278648925e0` | SQRPACI block 1 picture 35, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:3284fe42744dd48d75dfd7a4a9442fe15de788eb7d2016c9b7541e065526de0c` | SQRPACI block 1 picture 35, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:633b6366534755ac08084b1c72adf64b04095c9f2e96b98a1e3c1a6b6a1d92de` | SQRPACI block 1 picture 35, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:51bcc9bce26aedea4aafe82dc844a75f8d2f77c24a6235cfb9012a211a612b17` | SQRPACI block 1 picture 36, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:60c60c80dfd1dec951c0ae8b34d864d097d25dabfe8a3d9960c7867ec37aab5b` | SQRPACI block 1 picture 36, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:58b086fc36d45f33cdea7c7431b8090637a03aab6dff6ba5d0fd5f5b8a567ba3` | SQRPACI block 1 picture 36, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:3993171e743d10f1c729613c8e5a0b1b469f56fdf0338f68eeef067092f9163e` | SQRPACI block 1 picture 36, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:a90969e561a182b52b43345d9d932b5792525595b2298e60907e45df11955a47` | SQRPACI block 1 picture 36, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:ee2c1b3e9d71a37e31798535d22990ea4b6dadea3ade27e23082879e27c3d21e` | SQRPACI block 1 picture 36, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:9ee17883ac83ec953ea557f66218293e7ae3d14560be15abb17fef3245fb311d` | SQRPACI block 1 picture 36, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:86a58d6b72618184eb16395d5c3bf0026cbb4b2568fcda2c76da30f9ceb12d0f` | SQRPACI block 1 picture 36, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:79d00aabc4a2e5856e5de5b9c44bc8a45395e1200396d8f3bc8522fcf3647591` | SQRPACI block 1 picture 37, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:38111b927155911b5306b08068e48bbbe035582508864f9b4d25b7004391c275` | SQRPACI block 1 picture 37, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:0ddd8f94998298a57a82fa9c543c1e99b884d07995837e251864f456f2392e4f` | SQRPACI block 1 picture 37, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:851f8b7edeee41ca0e64ba71473b473a981d945f19f6129dea4b68559b5f72cb` | SQRPACI block 1 picture 37, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:33cb11b329410ac8277e0e3576be767570b739d1ac8b488a9ae1d4996f813557` | SQRPACI block 1 picture 37, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:31fe6ffcc33881cac99aaacbdeaf810cf01eaf64e70ba4ca62a962c27d0589bb` | SQRPACI block 1 picture 37, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:b17f92a036e70b1042363e2c71c31b0588dd2395aa848948806d619c60e0c93a` | SQRPACI block 1 picture 37, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:1301196d5d26bae522c3a3593e9d5cb105afb8831525336c92d6056e98cfd3ec` | SQRPACI block 1 picture 38, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:f4753749ad1b26ced90052a722e5e1ecf705d900ebf0c65b1e2cf6c55ec7c984` | SQRPACI block 1 picture 38, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:ab9f1fb9bee38aa9c33b51b4ba6d9c0ebf1a2ac7ed59c29547103708bf8defc7` | SQRPACI block 1 picture 38, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:70ef0961a613617509a32eb76b92c8edecf0adba072bb8dae6e29af339dfdbff` | SQRPACI block 1 picture 38, cell 3 (column 0, row 1 of its 3 by 3 cells) |
| `battle-tile:4768090c1d666a81d0315aae40db8bd3ecfc7797cc7a7cef949c200091abaade` | SQRPACI block 1 picture 38, cell 4 (column 1, row 1 of its 3 by 3 cells) |
| `battle-tile:546b829fb55c0c7f3d55ab70698bd9dfd9a47fbbb22a72d57c0dd0bbebf6d143` | SQRPACI block 1 picture 38, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:fdd905b4a0e298e5226c198f93ad1762329f0ce32244bfdccb42ab338caffce0` | SQRPACI block 1 picture 38, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:6c9c157764e57762c86ed89dfccf9cbb01f4d2a00a880c8dd298e5f73752081d` | SQRPACI block 1 picture 38, cell 8 (column 2, row 2 of its 3 by 3 cells) |
| `battle-tile:52f1d4625c42e1a230b53bb0921cddf52d9ad5f8537e96f4fe90c06b6b8497ac` | SQRPACI block 1 picture 39, cell 0 (column 0, row 0 of its 3 by 3 cells) |
| `battle-tile:528056152e67a5ec1f5de531ace70a7d2ad02b6486f77e8330cb72b7aec72d2b` | SQRPACI block 1 picture 39, cell 1 (column 1, row 0 of its 3 by 3 cells) |
| `battle-tile:f839b3be109e6d1230f9052f7e4a109f19f3a52ca3ae9b8c220a185aab0eac2e` | SQRPACI block 1 picture 39, cell 2 (column 2, row 0 of its 3 by 3 cells) |
| `battle-tile:20f940da22216a533a7d38d4318959ec3e0777412451911df7354ebefb9e4dba` | SQRPACI block 1 picture 39, cell 5 (column 2, row 1 of its 3 by 3 cells) |
| `battle-tile:21b5988bb933e7b2b307ef4da395d29befbbff477f93437f8d1d1e8e8f356d62` | SQRPACI block 1 picture 39, cell 6 (column 0, row 2 of its 3 by 3 cells) |
| `battle-tile:ae4cc754a3a484b116737e66874ef5dff6f3d46429462104d529eed2b4dc1354` | SQRPACI block 1 picture 39, cell 7 (column 1, row 2 of its 3 by 3 cells) |
| `battle-tile:55abbdc93008ca5ac5505240b80a108a9cf35a0620678f0255231b50c7e85ea6` | SQRPACI block 1 picture 39, cell 8 (column 2, row 2 of its 3 by 3 cells) |

## Not established

Do not start on these. Each is something the tool could not confirm can appear, with the reason. None is in the count above and none is dropped.

| What | Count |
| --- | ---: |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 7 |
| first-person cells of an area whose reading is not confirmed | 40 |
| first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows | not counted |
| distinct battlefield cells of pictures no artwork shows to have been on a battlefield | 0 |
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
