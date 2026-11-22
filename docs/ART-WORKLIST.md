# Artwork worklist

**The artwork is done when `npm run verify:art-worklist` reports 0 remaining. It reports 231 now.**

This file is written by `npm run art:worklist`. Do not edit it or `qa/art-worklist.json` by hand: add art, run the tool, commit what it writes.

To the artwork agent: this list exists to carry your work to 100%, not to correct it. The owner's words are that you have
"done an amazing job of keeping the art consistent in the VGA style, creating all new 32x32 tiles from 8x8 inspirations".
The shipped game will run with no original file, in Enhanced only, so every picture the game can show needs your art, down to each
8 by 8 cell. Routes found most of them. This tool finds the rest from the game's own maps and wall definitions, so nothing waits to be stumbled on.

## One item, step by step

1. Pick an item below (or from `qa/art-worklist.json`). It gives the exact key and the PNG size.
2. See what you are redrawing: `npm run art:worklist -- --sheets` writes `out/art-worklist/index.html`, each original cell enlarged and
   labelled with its key, grouped as here. The sheets are made from the player's own 1.3 files: set `POR_GAMEDATA` to that directory.
   `out/` is outside version control. Never commit original pixels.
3. Draw it, 32 by 32, in the style of the pieces around it. `drawnIn` in the JSON ("already drawn in area" below) names areas where the very
   same original pixels already have your art: start from that piece, or bind the same PNG if it suits the place.
4. Save the PNG in `upgrades/` and add the key to `"assets"` in `upgrades/manifest.json`, exactly as given.
5. Run `npm run verify:art-worklist`. The item is done when the key is in a manifest and its PNG is there and 32 by 32. Then check it in Chrome as you do now.
6. Run `npm run art:worklist` and commit the regenerated files with your art.

## Conventions: yours, unchanged

- Keys are `tile:<area>:<sha256>`: the area number the game is in, and the SHA-256 of the cell's 64 original palette indices in row order (`upgrades/README.md`).
- A key belongs to one area. The same pixels in another area need their own key there; that key may name the same PNG.
- Each tile PNG is 32 by 32. File names are lower case letters, digits, `-` and `_`, ending `.png`; yours are a place and subject and the first 12 hex digits of the hash, such as `kobold-caves-terrain-0a1b2c3d4e5f.png`.
- A piece that is the exact mirror of one you have can be listed under `reflectedTiles` in the manifest, as the two Textile House pieces are.
- New keys go in `upgrades/manifest.json`. `upgrades/slums/manifest.json` is the bundled Slums pack; the main manifest takes precedence over it.

## What not to do

- Do not draw anything under "Still being worked out". Those are not confirmed to appear. They move into the list, or out of it for good, as the tool is finished.
- Do not add keys for tiles this file says no map can show (that section arrives with the next version).
- Do not add keys three lower for New Phlan on 1.3 (`ae66` for `ae69`): see the note at the top of `docs/ART-INVENTORY.md`.
- Do not edit `qa/art-worklist.json`, `qa/art-worklist-cells.json` or this file by hand.

## If the worklist is wrong

If an item cannot occur in play, or art of yours exists under a key the tool does not list as needed or as done, record it in
`qa/art-worklist-notes.md` (one line: the key, what you saw, where) and commit it. The tool's owner reads that file and fixes the tool.
Each area below also says how many of your existing keys the tool can account for; an area where it cannot account for all of them is not listed for work yet.

## Where things stand

| Area | Name | Reading confirmed | Cells the views can show | With art | To do | Your keys accounted for |
| ---: | --- | --- | ---: | ---: | ---: | ---: |
| 0 | New Phlan | not yet | 572 | 161 |  | 161 of 251 |
| 1 | Buccaneer Base | yes | 494 | 129 | 19 | 129 of 129 |
| 2 | Cadorna Textile House | not yet | 402 | 254 |  | 254 of 259 |
| 3 | Valjevo Castle | not yet | 184 | 46 |  | 46 of 81 |
| 4 | Valjevo Castle | not yet | 270 | 58 |  | 58 of 59 |
| 5 | Valjevo Castle | not yet | 0 | 0 |  | 0 of 110 |
| 6 | Valjevo Castle | not yet | 213 | 43 |  | 43 of 72 |
| 7 | Valjevo Castle, the Pool | not yet | 0 | 0 |  | 0 of 131 |
| 8 | Phlan City Hall | not yet | 0 | 0 |  | 0 of 157 |
| 9 | Stojanow Gate | yes | 242 | 117 | 18 | 117 of 117 |
| 10 | Valhingen Graveyard | not yet | 1116 | 131 |  | 131 of 419 |
| 11 | The Training Hall | not yet | 0 | 0 |  | 0 of 67 |
| 13 | The Kobold Caves | yes | 211 | 144 | 8 | 144 of 144 |
| 14 | Kovel Mansion | yes | 110 | 64 | 20 | 64 of 64 |
| 15 | Mendor's Library | not yet | 440 | 170 |  | 170 of 185 |
| 16 | The Lizardman Keep | not yet | 1466 | 158 |  | 158 of 158 |
| 17 | The Nomad Camp | yes | 164 | 120 | 5 | 120 of 120 |
| 18 | Podol Plaza | not yet | 198 | 125 |  | 125 of 194 |
| 20 | The Slums | not yet | 390 | 177 |  | 177 of 197 |
| 21 | Sokal Keep | yes | 601 | 85 | 115 | 85 of 85 |
| 22 | Yarash's Pyramid | yes | 87 | 68 | 2 | 68 of 68 |
| 23 | Yarash's Pyramid, lower | yes | 78 | 39 | 15 | 39 of 39 |
| 24 | Temple of Bane | not yet | 389 | 188 |  | 188 of 188 |
| 25 | Wilderness, west | not yet | 41 | 0 |  | 0 of 0 |
| 26 | Wilderness, middle | not yet | 68 | 34 |  | 34 of 162 |
| 27 | Wilderness, east | not yet | 41 | 19 |  | 19 of 19 |
| 28 | Zhentil Keep Outpost | yes | 189 | 79 | 15 | 79 of 79 |
| 29 | Kuto's Well | not yet | 1129 | 290 |  | 290 of 298 |
| 30 | area 30 | not yet | 816 | 0 |  | 0 of 0 |
| 31 | Temple of Bane, interior | yes | 115 | 77 | 14 | 77 of 77 |
| 32 | area 32 | not yet | 521 | 0 |  | 0 of 0 |

"Cells the views can show" counts every cell from every square of the map, including squares that may be out of reach; only cells seen from squares connected to your existing coverage are listed to do.

## To do

### Area 1: Buccaneer Base (19)

#### tile set 8X8D6 block 6 (19)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:1:08094d4f989d0851c774d310794ce23b04d492f575177ac4d3338cb6f8676225` | 8X8D6 block 6 tile 69 | map 1, square (7,0) facing east, cell column 0 row 5 |  |
| `tile:1:0b7bb47e01e4214bc70d431c2e9284d3ac23b71ced5be41c980e8974a340da2c` | 8X8D6 block 6 tile 6 | map 1, square (5,6) facing south, cell column 8 row 5 |  |
| `tile:1:26bcad86c61fced959b9e3e4468d14597252a8f54bc8b6ca7c375f92ac9139f0` | 8X8D6 block 6 tile 51 | map 1, square (7,0) facing north, cell column 5 row 5 |  |
| `tile:1:42c8133d28c3cbe4dab1662413b8e99c54f64bfcb9a6133e97d2ca904df23195` | 8X8D6 block 6 tile 36 over sky colour 12 | map 1, square (11,5) facing east, cell column 8 row 4 |  |
| `tile:1:4671e63ef528ee8ce29751bb3b8a7c37d1a7689c8515f26e7e246b0d707215c4` | 8X8D6 block 6 tile 49 over sky colour 12 | map 1, square (11,4) facing south, cell column 4 row 4 |  |
| `tile:1:51e9efaaca77cd21ddb112c352c8c62124882ab44a39fb5b01eb83376a67506d` | 8X8D6 block 6 tile 33 over sky colour 12 | map 1, square (11,5) facing east, cell column 9 row 3 |  |
| `tile:1:541760b2fe1a3b5760a42cecaafd400c9825b25092e7218379e43f50086604ec` | 8X8D6 block 6 tile 3 | map 1, square (7,0) facing north, cell column 5 row 2 |  |
| `tile:1:5b9dd69ae4ba4f7371ebe59b909654abc372747e7174a42dfd4bdbe24d2240b8` | 8X8D6 block 6 tile 7 over sky colour 12 | map 1, square (1,0) facing east, cell column 10 row 3 |  |
| `tile:1:7be98aac54183eb27fec361c16ca8df7df0782ee5ef593dfdbd07098a49c3370` | 8X8D6 block 6 tile 5 over sky colour 12 | map 1, square (1,4) facing east, cell column 9 row 4 |  |
| `tile:1:808a2df88d22bd877eb5d6796527cee1e4073ec947acdc24b2b60bde00731208` | 8X8D6 block 6 tile 30 over sky colour 12 | map 1, square (11,4) facing east, cell column 10 row 4 |  |
| `tile:1:8d7047934de8b52fdd68a3f288112d164f882f4edb2d754530086a225ed53e33` | 8X8D6 block 6 tile 48 over sky colour 12 | map 1, square (11,4) facing east, cell column 9 row 4 |  |
| `tile:1:94f6cfe844a957ccafe00be82ccbe250d8512de221ddf480134d0bd474341421` | 8X8D6 block 6 tile 22 | map 1, square (4,6) facing south, cell column 2 row 5 |  |
| `tile:1:a66e83a9ab0981d3ba25e5f808970da0f2dc440d0232d005eb062f4de8669329` | 8X8D6 block 6 tile 14 over sky colour 12 | map 1, square (1,0) facing south, cell column 1 row 4 |  |
| `tile:1:aa7b2c3479ab12184d38dcaab1cf0f133fd608c1ac4791efd382b948d57d6f81` | 8X8D6 block 6 tile 13 over sky colour 12 | map 1, square (1,0) facing east, cell column 9 row 4 |  |
| `tile:1:b6ae7e16f8b8000b7101c021ba1d4f9d8a8c9c4dc078c44b2989542c45501e46` | 8X8D6 block 6 tile 9 over sky colour 12 | map 1, square (4,4) facing west, cell column 0 row 3 |  |
| `tile:1:d05c6f84a91a3a83b29e24b68646b6a158eb1e521ad05561ebe90f7d57b64f8f` | 8X8D6 block 6 tile 37 over sky colour 12 | map 1, square (12,5) facing east, cell column 9 row 3 |  |
| `tile:1:eac6e9c13651a87a4458945ed7071d5929d9e64e8108e178bdc440d04c0a34a2` | 8X8D6 block 6 tile 34 over sky colour 12 | map 1, square (13,5) facing west, cell column 1 row 3 |  |
| `tile:1:eaeaf4a0e14c84a5477a522f72dd2ef4a156f8bfc2638850c326b5767a790a40` | 8X8D6 block 6 tile 35 over sky colour 12 | map 1, square (11,5) facing south, cell column 2 row 4 |  |
| `tile:1:f90f07d7ae5e50b79a0f454a04d4fd52831f285e3bb9176f149bf2cfba05c460` | 8X8D6 block 6 tile 67 | map 1, square (7,1) facing north, cell column 5 row 5 |  |

### Area 9: Stojanow Gate (18)

#### tile set 8X8D2 block 1 (6)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:9:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D2 block 1 tile 12 | map 9, square (4,1) facing north, cell column 4 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:9:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D2 block 1 tile 8 | map 9, square (4,1) facing north, cell column 5 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:9:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D2 block 1 tile 9 | map 9, square (4,1) facing north, cell column 6 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:9:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D2 block 1 tile 11 | map 9, square (4,1) facing north, cell column 5 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:9:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D2 block 1 tile 10 | map 9, square (4,1) facing north, cell column 6 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:9:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D2 block 1 tile 7 | map 9, square (4,1) facing north, cell column 4 row 6 | 2, 4, 15, 18, 29, 31 |

#### tile set 8X8D2 block 23 (6)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:9:1e7a6c09a5e78304b5e46f4064f3e7de19c4437e10189e92324c83e29f832c6b` | 8X8D2 block 23 tile 5 | map 9, square (14,0) facing south, cell column 1 row 6 |  |
| `tile:9:448ee9241a19b518a05c6411c2d9fcc9b45a76c73a481c33149b3262e34beb2f` | 8X8D2 block 23 tile 30 | map 9, square (15,0) facing north, cell column 9 row 7 | 15, 17 |
| `tile:9:5525560a437d196e997885cb4f9811df60c0b8ddeab1c17c783987b967da111c` | 8X8D2 block 23 tile 9 | map 9, square (15,2) facing north, cell column 6 row 6 | 15, 17 |
| `tile:9:9c5af82ee1c4c534b6e42b65d8bd38a1ea6fce5ef4c50bb72811d725ed30e72a` | 8X8D2 block 23 tile 49 | map 9, square (15,0) facing north, cell column 10 row 7 | 15, 17 |
| `tile:9:a5581d8d3a086e81e6ad023e24621cbd13a5c8a4d6555b66f973f0fee80612e9` | 8X8D2 block 23 tile 33 | map 9, square (15,0) facing north, cell column 10 row 8 | 15, 17 |
| `tile:9:fed653b0ff0e32ccdaa436eeb765c6e973f9ade944cc7dba817de9ac9abca22b` | 8X8D2 block 23 tile 27 | map 9, square (15,0) facing north, cell column 9 row 9 | 15, 17 |

#### tile set 8X8D2 block 9 (6)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:9:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D2 block 9 tile 47 | map 9, square (7,6) facing west, cell column 1 row 3 | 21 |
| `tile:9:215488a7ca18e31d90dd8bc2d00c5f3002c2801a983ba96bbb0ceb9b2b3bd498` | 8X8D2 block 9 tile 58 | map 9, square (8,6) facing west, cell column 2 row 8 | 1, 5, 7, 20, 21, 28 |
| `tile:9:332ea602752f60f17beb82a3d53ab5e110ab4ad1eac48920858245111bb452bd` | 8X8D2 block 9 tile 49 over sky colour 0 | map 9, square (8,6) facing west, cell column 0 row 3 |  |
| `tile:9:733c9571b8c777f9348c6770ac8de44f2880612358a5ed49f75533f15ffa4afa` | 8X8D2 block 9 tile 49 over sky colour 15 | map 9, square (8,6) facing west, cell column 0 row 3 |  |
| `tile:9:74dac469ed7ac305b97a7260d3819dc04341203c78d23b7dcdaae93d04612c4e` | 8X8D2 block 9 tile 56 over sky colour 15 | map 9, square (7,6) facing east, cell column 10 row 3 |  |
| `tile:9:e5aa3be4526ec0e96b089822c9a6290a6b74a423c00b6973692f5d25dd767c29` | 8X8D2 block 9 tile 56 over sky colour 0 | map 9, square (7,6) facing east, cell column 10 row 3 |  |

### Area 13: The Kobold Caves (8)

#### tile set 8X8D8 block 17 (7)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:13:3d4b40ddeb8af9963ad9c349eb9a5afed54abe3b219c6e48b43ed21fac3afc1a` | 8X8D8 block 17 tile 57 | map 13, square (13,9) facing south, cell column 10 row 9 |  |
| `tile:13:4904837be10d035aade38224813dd8b21d6b452097656994981b9146cc9d4bdb` | 8X8D8 block 17 tile 56 | map 13, square (13,9) facing north, cell column 0 row 9 |  |
| `tile:13:6251bdc7645b63613e1bfc7cf807e1793f99364d0005c5a14cb55d7d38701f84` | 8X8D8 block 17 tile 55 | map 13, square (13,9) facing west, cell column 6 row 6 |  |
| `tile:13:892027ab6034ae5ee19aa0e2fc24836b738188c17a8216b8ef3f31002b21e789` | 8X8D8 block 17 tile 6 | map 13, square (13,9) facing west, cell column 5 row 4 |  |
| `tile:13:8d5ecba5c803351d3cab192d49d6343a4819284966ed2f0b5918d328dea722dd` | 8X8D8 block 17 tile 54 | map 13, square (13,9) facing west, cell column 6 row 5 |  |
| `tile:13:bd5cb1a28f45cba9ca06a9a506c9eab644fe1d9319cd840ba07222a67acc2e40` | 8X8D8 block 17 tile 44 | map 13, square (14,9) facing west, cell column 5 row 5 |  |
| `tile:13:e905e306533daa70b0c31488a22c6cfe96b4d479c77f0308f65cd2c19bf7cd42` | 8X8D8 block 17 tile 7 over sky colour 0 | map 13, square (7,1) facing south, cell column 8 row 3 |  |

#### tile set 8X8D8 block 18 (1)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:13:70d5e6e4782b613799cedd758e9bca68b586ed7a95ff2f5a5cef5120f34b6eb4` | 8X8D8 block 18 tile 6 | map 13, square (10,9) facing east, cell column 5 row 5 |  |

### Area 14: Kovel Mansion (20)

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:14:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 14, square (5,0) facing west, cell column 7 row 7 | 2, 9, 15, 18, 20, 22, 29 |
| `tile:14:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 14, square (5,0) facing west, cell column 8 row 8 | 2, 9, 15, 20, 22, 29 |
| `tile:14:71c858f7e6de451eb4a77c5f3e442f50738421472a239bbcd1afe85ced791161` | 8X8D1 block 203 tile 27 over the ground colour 6 | map 14, square (14,2) facing west, cell column 1 row 6 | 0, 2, 4, 5, 7, 8, 9, 11, 16, 21, 23, 24, 28, 29, 31 |
| `tile:14:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over the ground colour 6 | map 14, square (3,0) facing north, cell column 10 row 8 | 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31 |
| `tile:14:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 14, square (3,0) facing east, cell column 2 row 8 | 0, 2, 8, 9, 15, 20, 22, 29 |

#### tile set 8X8D3 block 1 (12)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:14:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D3 block 1 tile 14 | map 14, square (3,0) facing north, cell column 10 row 4 | 2, 9, 10, 15, 18, 26, 29, 31 |
| `tile:14:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D3 block 1 tile 12 | map 14, square (2,1) facing north, cell column 10 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:14:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D3 block 1 tile 8 | map 14, square (3,1) facing north, cell column 8 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:14:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D3 block 1 tile 54 | map 14, square (3,0) facing east, cell column 2 row 4 | 2, 9, 15, 20, 22, 29 |
| `tile:14:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D3 block 1 tile 9 | map 14, square (3,1) facing north, cell column 9 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:14:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D3 block 1 tile 11 | map 14, square (3,1) facing north, cell column 8 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:14:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D3 block 1 tile 53 | map 14, square (3,0) facing east, cell column 2 row 5 | 0, 2, 8, 9, 10, 15, 16, 20, 22, 29 |
| `tile:14:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D3 block 1 tile 13 | map 14, square (4,0) facing north, cell column 7 row 4 | 2, 9, 15, 18, 26, 29, 31 |
| `tile:14:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D3 block 1 tile 57 | map 14, square (6,0) facing west, cell column 6 row 6 | 2, 9, 15, 20, 22, 29 |
| `tile:14:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D3 block 1 tile 10 | map 14, square (3,1) facing north, cell column 9 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:14:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D3 block 1 tile 7 | map 14, square (2,1) facing north, cell column 10 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:14:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D3 block 1 tile 15 | map 14, square (4,0) facing north, cell column 5 row 6 | 2, 9, 15, 18, 26, 29, 31 |

#### tile set 8X8D3 block 3 (3)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:14:5ea33b314d6a559649dcdcb928b9da3c62d661fa6f496eaba32df44752996fed` | 8X8D3 block 3 tile 50 | map 14, square (8,0) facing south, cell column 2 row 6 | 0, 2, 8, 11, 18, 24, 29, 31 |
| `tile:14:6c7ec11bfc006585332f2495cbe7d713d38a049d7b8374177334f0c5c0af5f1d` | 8X8D3 block 3 tile 32 | map 14, square (11,0) facing west, cell column 1 row 6 | 2, 18, 29 |
| `tile:14:b6d8cf528e84d3abaa95a41f2d778e406ae1cd4a82c6e801321904894f13fe13` | 8X8D3 block 3 tile 51 | map 14, square (8,0) facing south, cell column 2 row 5 | 2, 18, 24, 29, 31 |

### Area 17: The Nomad Camp (5)

#### tile set 8X8D7 block 23 (4)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:17:0e7dd89cde56c7c25c582fcbd3763f80d927d7f2a4d1e357632549017cca5b9c` | 8X8D7 block 23 tile 31 | map 17, square (11,0) facing south, cell column 3 row 6 | 9, 15 |
| `tile:17:191cd6264eeb5f3b184e3df9c455bbbf0b8231c51790d9c48769ac83a24c6c3a` | 8X8D7 block 23 tile 48 | map 17, square (11,0) facing south, cell column 2 row 6 | 9, 15 |
| `tile:17:1e7a6c09a5e78304b5e46f4064f3e7de19c4437e10189e92324c83e29f832c6b` | 8X8D7 block 23 tile 5 | map 17, square (10,0) facing south, cell column 4 row 6 |  |
| `tile:17:32a0d474531c347b6c403cb208acbfb96df18c624677ca00057be714ccbab318` | 8X8D7 block 23 tile 32 | map 17, square (11,0) facing south, cell column 2 row 7 | 9, 15 |

#### tile set 8X8D7 block 7 (1)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:17:6271e2b56d8ed39f6f91f3e04494ec47ae843e8ba717e75a8f8f8de57caae4ec` | 8X8D7 block 7 tile 2 over sky colour 11 | map 17, square (7,3) facing east, cell column 10 row 2 |  |

### Area 21: Sokal Keep (115)

#### shared tile set 8X8D1 block 203 (11)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:21:07d5c50f71346b8e7dfb1509c04e147875817f2400ca77f9c0ff0e0c12f04290` | 8X8D1 block 203 tile 17 over the ground colour 6 | map 21, square (7,9) facing east, cell column 10 row 6 | 18 |
| `tile:21:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 21, square (0,8) facing south, cell column 7 row 7 | 2, 9, 15, 18, 20, 22, 29 |
| `tile:21:5b52670be92caf50b8a456a072b22f8a06279387eb20120d464ce4c70a50931e` | 8X8D1 block 203 tile 32 over the ground colour 6 | map 21, square (7,7) facing east, cell column 10 row 7 | 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31 |
| `tile:21:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 21, square (0,8) facing south, cell column 8 row 8 | 2, 9, 15, 20, 22, 29 |
| `tile:21:7a128cc02d3a0bf5cb49a3d6c04fb7ef793368a7413172aec694936214d6ecd8` | 8X8D1 block 203 tile 41 | map 21, square (7,7) facing east, cell column 10 row 5 | 0, 2, 5, 7, 10, 13, 15, 16, 18, 20, 24, 29 |
| `tile:21:92ccb4f65a1e573455d386a2986c6dad5b9d4e629110bd9bcbb6b6208dea253c` | 8X8D1 block 203 tile 33 over the ground colour 6 | map 21, square (8,7) facing west, cell column 0 row 7 | 0, 2, 3, 5, 8, 9, 15, 18, 24, 26, 29, 31 |
| `tile:21:97ff4f78b15e4481b61bed70d5dffe6e9ab47632e36ac34439b23705f1f723b5` | 8X8D1 block 203 tile 43 | map 21, square (7,8) facing west, cell column 1 row 8 | 0, 8, 18, 24 |
| `tile:21:9b88f7a7329f3899fd4fdfcf0f17706a3995730c04dda467a643111d36f507df` | 8X8D1 block 203 tile 16 over the ground colour 6 | map 21, square (8,9) facing west, cell column 0 row 6 | 24 |
| `tile:21:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 21, square (15,8) facing south, cell column 3 row 7 | 0, 2, 8, 9, 14, 15, 20, 22, 29 |
| `tile:21:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 21, square (15,8) facing south, cell column 2 row 8 | 0, 2, 8, 9, 15, 20, 22, 29 |
| `tile:21:f5a5fd42d16a20302798ef6ed309979b43003d2320d9f0e8ea9831a92759fb4b` | 8X8D1 block 203 tile 13 | map 21, square (0,8) facing north, cell column 0 row 4 | 0, 1, 2, 3, 5, 7, 8, 9, 10, 13, 14, 15, 16, 17, 18, 20, 26, 27, 29, 31 |

#### tile set 8X8D4 block 1 (39)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:21:0264796f9fa232ae9bca2bf9b86d335df78c2c4ac9f35e35c3c00dc131885739` | 8X8D4 block 1 tile 14 | map 21, square (0,8) facing south, cell column 10 row 3 | 2, 9, 10, 15, 18, 26, 29, 31 |
| `tile:21:17becf7f46404d6b55c17617c207d9b53707bc1d70bc2e28023728545c3a3447` | 8X8D4 block 1 tile 12 | map 21, square (15,8) facing south, cell column 4 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:21:194c7a70c05eb9c93cb1a063ea5cf6df0dc6fa2f8de1389233f822c0720703c3` | 8X8D4 block 1 tile 8 | map 21, square (15,8) facing south, cell column 5 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:21:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D4 block 1 tile 56 | map 21, square (9,14) facing west, cell column 1 row 6 | 9, 14, 15, 20, 22, 29 |
| `tile:21:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D4 block 1 tile 55 | map 21, square (0,8) facing south, cell column 8 row 4 | 2, 9, 14, 15, 20, 22, 29 |
| `tile:21:24496d3a08d097a18184cf1e0ed7f714e985ff1ec84640cc8ef2251081b8ac14` | 8X8D4 block 1 tile 30 | map 21, square (0,15) facing north, cell column 8 row 7 | 18, 29 |
| `tile:21:2641de725160bed3ccf83642677807161ae17c04ec7f0201d24c4444cea4309c` | 8X8D4 block 1 tile 19 | map 21, square (0,15) facing east, cell column 1 row 9 | 18, 29 |
| `tile:21:35bc16c225d0188de6e4d787bb7cc94cea1ed7739c1190f0db6a1915c6e4d4b5` | 8X8D4 block 1 tile 32 | map 21, square (0,15) facing north, cell column 7 row 7 | 18, 29 |
| `tile:21:38edb1790223ef81914551f6f0b9eea6a21f7e86fbe0515ddae1a08662aff9e7` | 8X8D4 block 1 tile 0 | map 21, square (0,15) facing north, cell column 5 row 5 | 18, 29 |
| `tile:21:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D4 block 1 tile 54 | map 21, square (0,8) facing south, cell column 7 row 4 | 2, 9, 15, 20, 22, 29 |
| `tile:21:3fee7e855b9465a3ca932316bcc9135e8d669a7b0c7fc89640598ecd55cf01f2` | 8X8D4 block 1 tile 37 | map 21, square (0,15) facing north, cell column 8 row 8 | 18, 29 |
| `tile:21:4347bf08046f39d7f4d4575c1b1fa5398cfd24a85e0b2cf75942ff5b761a722e` | 8X8D4 block 1 tile 27 | map 21, square (0,15) facing north, cell column 5 row 6 | 18, 29 |
| `tile:21:4fa7efe3e4e51e6f24a9fc238959e3417c491c59718d3668c99af1a3a648e190` | 8X8D4 block 1 tile 9 | map 21, square (15,8) facing south, cell column 6 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:21:54cfe77b0fa031f0e731581bb561e7930676dcaf217f5886e27719bedfc1eb68` | 8X8D4 block 1 tile 21 | map 21, square (6,13) facing south, cell column 1 row 5 | 2, 4, 9, 14, 15, 18, 29, 31 |
| `tile:21:5abd3cf4bfe6373c05e073bd3b979b4ef00d2434076f6a621e27f9ae8b59c885` | 8X8D4 block 1 tile 28 | map 21, square (0,15) facing north, cell column 4 row 7 | 18, 29 |
| `tile:21:5d21f80204f885adf8274dc902585aabba14856ffc8e683b696965fdd68ea226` | 8X8D4 block 1 tile 38 | map 21, square (0,15) facing west, cell column 9 row 7 | 18, 29 |
| `tile:21:707a3661de40639856880d5863eb5fb241f95ab8c7a4e035fac140a7fb8c7f6b` | 8X8D4 block 1 tile 29 | map 21, square (0,15) facing north, cell column 8 row 6 | 18, 29 |
| `tile:21:780874fdade2d4968354973a6e45e373900cf2f360aaaee9048eff7760f1f294` | 8X8D4 block 1 tile 25 | map 21, square (0,15) facing north, cell column 2 row 6 | 18, 29 |
| `tile:21:7870e9a9d014d5af73d6846dd36c122b941c5efafee1e099b135da968e0216b1` | 8X8D4 block 1 tile 11 | map 21, square (15,8) facing south, cell column 5 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:21:7ea51baee154fa0f712d9f26bc1141387e2c7403c8c490db73b1da868c40b574` | 8X8D4 block 1 tile 61 | map 21, square (0,15) facing west, cell column 10 row 8 | 18, 29 |
| `tile:21:8218bb2fd3cff1bb3b55dfb4d8626f1ef9eacf4084120b071ace691afcc06449` | 8X8D4 block 1 tile 3 | map 21, square (0,15) facing north, cell column 2 row 7 | 18, 29 |
| `tile:21:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D4 block 1 tile 53 | map 21, square (0,8) facing south, cell column 7 row 5 | 0, 2, 8, 9, 10, 15, 16, 20, 22, 29 |
| `tile:21:94baea60a43c4a3789f6665ce0721e7bbdd8cc4fef7adce250e8f48d3344efe8` | 8X8D4 block 1 tile 33 | map 21, square (0,15) facing north, cell column 7 row 6 | 18, 29 |
| `tile:21:9fcdf0ff6bdfd2b832cfd91e6160e494b4f67ec897064204ba4dc3a869b31c4d` | 8X8D4 block 1 tile 13 | map 21, square (0,8) facing north, cell column 0 row 3 | 2, 9, 15, 18, 26, 29, 31 |
| `tile:21:a98541eb98d04b70525e398883915b338262458223739687d40ba50900a89567` | 8X8D4 block 1 tile 60 | map 21, square (0,15) facing east, cell column 0 row 10 | 18, 29 |
| `tile:21:ad321803c7cb77e1053d5ace43e19ea6adcd8cf1f35674112d057c9a3419b2d8` | 8X8D4 block 1 tile 62 | map 21, square (0,15) facing west, cell column 9 row 9 | 18, 29 |
| `tile:21:bb5fbe0659195461417a3592db18801edb797dd01b778f2ec9e18ec474d39347` | 8X8D4 block 1 tile 36 | map 21, square (0,15) facing north, cell column 2 row 8 | 18, 29 |
| `tile:21:c3a7b97b50237ff17eef35dcda2aa23700f0e0264180893885f504ca1c19148d` | 8X8D4 block 1 tile 63 | map 21, square (0,15) facing west, cell column 10 row 10 | 18, 29 |
| `tile:21:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D4 block 1 tile 52 | map 21, square (0,8) facing south, cell column 8 row 5 | 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29 |
| `tile:21:d46241306c8fa8cb736fa216c7d1ab56e62b6495d92843bfcda972f5162d6158` | 8X8D4 block 1 tile 46 | map 21, square (0,15) facing east, cell column 1 row 7 | 18, 29 |
| `tile:21:d5e0eedcfbae2634ac60516275495ad735e7ff952e0fb335b1181d29e4d2879f` | 8X8D4 block 1 tile 20 | map 21, square (0,15) facing north, cell column 5 row 4 | 18, 29 |
| `tile:21:d9b51cc9360d17737eebf2fc825d7cc895e96ea1d6f2020a5a7c8d54e5228dea` | 8X8D4 block 1 tile 59 | map 21, square (0,15) facing east, cell column 0 row 8 | 18, 29 |
| `tile:21:db642afd69e7f1462ea1b65b8fda171ed215e5158c5dc2d0e8c0912c01cae65a` | 8X8D4 block 1 tile 58 | map 21, square (0,15) facing north, cell column 3 row 7 | 18, 29 |
| `tile:21:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D4 block 1 tile 57 | map 21, square (6,14) facing east, cell column 9 row 6 | 2, 9, 15, 20, 22, 29 |
| `tile:21:e661bce0938e73b6610229ae27e6f1e51de4af50b1df92a3ae665507ff3a15f7` | 8X8D4 block 1 tile 10 | map 21, square (15,8) facing south, cell column 6 row 5 | 2, 4, 15, 18, 29, 31 |
| `tile:21:e9ecbb72d30b0993e242f5c1ff9562df7dd7c28db20be6a0917234d9679aa17a` | 8X8D4 block 1 tile 31 | map 21, square (0,15) facing north, cell column 3 row 6 | 18, 29 |
| `tile:21:ebbb3407ad7721eaf32a9756092057bad2e2ccc5c7411838a50c8a7fc95ca0ee` | 8X8D4 block 1 tile 1 | map 21, square (0,15) facing north, cell column 4 row 6 | 18, 29 |
| `tile:21:f08f5d405196df228b0f4f6cb5937799da56badb58ba6ff58a9903bb9b1ca142` | 8X8D4 block 1 tile 7 | map 21, square (15,8) facing south, cell column 4 row 6 | 2, 4, 15, 18, 29, 31 |
| `tile:21:f5d7a245e0ac6784eeda9b1dc97243367e0de6bd450be85234f7e4e22cbd3dae` | 8X8D4 block 1 tile 15 | map 21, square (0,8) facing west, cell column 5 row 6 | 2, 9, 15, 18, 26, 29, 31 |

#### tile set 8X8D4 block 5 (56)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:21:01697ad7b036813ed1b469175cdc453587c02d633b910dbea068f811eda34255` | 8X8D4 block 5 tile 9 | map 21, square (6,0) facing north, cell column 4 row 7 | 0, 8, 18, 24 |
| `tile:21:023ec9a774d8530335b342044ef3f55fbd114a48c2326e679d260ef15e8fe320` | 8X8D4 block 5 tile 25 | map 21, square (7,6) facing south, cell column 0 row 4 | 18, 24 |
| `tile:21:0618d6cdc542a96502c9f55225212e813b9845d14a0173e6e6a39fae9f5b0540` | 8X8D4 block 5 tile 30 | map 21, square (9,8) facing west, cell column 4 row 6 | 24 |
| `tile:21:0c7732f13856e8cd20061031338abf4be17558ae34803b8dfbca4e1290e7f397` | 8X8D4 block 5 tile 4 | map 21, square (6,0) facing north, cell column 3 row 3 | 0, 8, 18, 24 |
| `tile:21:10bf12baf29408481a0c53115f209c404df6eddaef8a075361781014dbc213e7` | 8X8D4 block 5 tile 8 | map 21, square (6,0) facing north, cell column 4 row 8 | 0, 8, 18, 24 |
| `tile:21:1268f06da827bbf72b6721ce171c2c267473da4db8b637d5332c803f61fad919` | 8X8D4 block 5 tile 31 | map 21, square (8,7) facing west, cell column 0 row 6 | 18, 24 |
| `tile:21:164a07d4807884d4c0a92b54a97c2c0e22024c8648f86ba3d02ca01a0226cfa2` | 8X8D4 block 5 tile 28 | map 21, square (6,8) facing south, cell column 0 row 8 | 18, 24 |
| `tile:21:185aabb65845f72434920477aca8840a620ac3b4a1b88cbe4c8017bf03e2c52c` | 8X8D4 block 5 tile 40 | map 21, square (7,8) facing west, cell column 0 row 8 | 18, 24 |
| `tile:21:1df4f051066f64c43fc4a6b7947f9620bf66cc7146f574d8a993f8d532eeca01` | 8X8D4 block 5 tile 32 | map 21, square (7,7) facing east, cell column 10 row 6 | 18, 24 |
| `tile:21:207b7f4830988664ddd5cfc189fd50c2e5b758129da008159a4d9731d8d2b576` | 8X8D4 block 5 tile 44 | map 21, square (7,6) facing east, cell column 7 row 4 | 18, 24 |
| `tile:21:21a905633d9c89ed30f6273cdb0a6e41260d0fc2a93ea4e1a68bc263a0548fba` | 8X8D4 block 5 tile 20 over the ground colour 6 | map 21, square (7,10) facing east, cell column 10 row 7 |  |
| `tile:21:21c3526814a3918724a042fc0267b60104cf88c0ef811989b485a282905c15b7` | 8X8D4 block 5 tile 49 | map 21, square (6,0) facing west, cell column 0 row 10 | 18, 24 |
| `tile:21:2409020d9c57c7711f39a233676fbab8bb9c90ec232e839fe2f4a4f416857e8d` | 8X8D4 block 5 tile 46 | map 21, square (7,7) facing south, cell column 0 row 5 | 24 |
| `tile:21:259a6005cb1ac0534c46e4d11158b3a12e6648cb3af24fcae217296df65cbc6c` | 8X8D4 block 5 tile 41 | map 21, square (7,6) facing south, cell column 8 row 3 | 18, 24 |
| `tile:21:2edd110cf91808f0a5ee3278775fb06c10f1fe395dc8428421ed98467575cecf` | 8X8D4 block 5 tile 65 | map 21, square (7,8) facing north, cell column 4 row 6 | 0, 8, 18, 24 |
| `tile:21:2ef1d0e6a7db6456bccdb5598bdbe75416778194b76407dffd458796d560d462` | 8X8D4 block 5 tile 63 | map 21, square (6,0) facing north, cell column 10 row 10 | 18 |
| `tile:21:384b3db048aec1cc9c5f9cd1b63ac2aafedb993fdbfd23e2267dd5ad788ec375` | 8X8D4 block 5 tile 13 | map 21, square (7,9) facing south, cell column 2 row 5 | 18, 24 |
| `tile:21:3bd06c2cb3cf105fcfcb7999d9c82c401a31a2c874ad4e8fe2b8d70e3c0ba8e0` | 8X8D4 block 5 tile 58 | map 21, square (6,0) facing north, cell column 5 row 7 | 0, 8, 18, 24 |
| `tile:21:3f5c91cb0f492dabf7ba2d09ad7c6da460f8b208d9e0c6afabfcafb191ba0025` | 8X8D4 block 5 tile 43 over sky colour 12 | map 21, square (7,6) facing east, cell column 8 row 4 | 18, 24 |
| `tile:21:3fa6cf4676a48932c9e325a5f64128f1b4af9dc7398d0422955dbe43d3669f03` | 8X8D4 block 5 tile 23 over sky colour 12 | map 21, square (7,6) facing south, cell column 0 row 3 | 18, 24 |
| `tile:21:404de947b1c3dccb369cf7af07812c10a97013ed0c3f538ef6a81060b58032d5` | 8X8D4 block 5 tile 51 over sky colour 12 | map 21, square (6,0) facing north, cell column 10 row 0 |  |
| `tile:21:452118d96dcf90836db29fa3b9ad629d876984ade695d5956b2ca49304ef76c2` | 8X8D4 block 5 tile 60 | map 21, square (6,0) facing north, cell column 4 row 6 | 0, 8, 18, 24 |
| `tile:21:47ec4b15094d68775c69c2b62c39ea8cc3f449b9fae26b213873f6ef7df8d874` | 8X8D4 block 5 tile 69 over sky colour 12 | map 21, square (8,6) facing south, cell column 2 row 2 | 24 |
| `tile:21:498b73260d97e644afe7426589de26373d90bf5baaaa5e3aa141c892755b78e7` | 8X8D4 block 5 tile 36 | map 21, square (7,6) facing south, cell column 8 row 8 | 18, 24 |
| `tile:21:55fef8d37b1b98be42a153ec5b895daf6fd0cad9de82dd35f61ee3d9720fc58c` | 8X8D4 block 5 tile 7 over sky colour 11 | map 21, square (6,0) facing north, cell column 1 row 1 | 24 |
| `tile:21:568b6dbfe4a2147b7c4930a629793aa049b682b65ed9f52a3b3e5da43e89eef9` | 8X8D4 block 5 tile 22 | map 21, square (7,6) facing south, cell column 0 row 7 | 18, 24 |
| `tile:21:578312445d28f7cb34207332dcbae26e8360793066255d1e3ae16128b118a31c` | 8X8D4 block 5 tile 10 | map 21, square (6,8) facing south, cell column 1 row 8 | 18, 24 |
| `tile:21:5b720a6a4fb8f83e4418b0f0f966a810b4590d0afca70948ce8f8a9253443abe` | 8X8D4 block 5 tile 64 | map 21, square (7,8) facing north, cell column 9 row 6 | 0, 18, 24 |
| `tile:21:63d086162996a91f0409156905fbaa45d42395ef004b279b17e51500b5fdfc15` | 8X8D4 block 5 tile 17 over sky colour 12 | map 21, square (4,0) facing east, cell column 4 row 3 | 24 |
| `tile:21:651c198944d18884f12570fb5bdf8dc5bf4b4f15bfd324233879b73050e95e85` | 8X8D4 block 5 tile 18 over sky colour 11 | map 21, square (4,0) facing east, cell column 6 row 3 | 24 |
| `tile:21:743465f1979ba29859499e988ccb19a786bfe022c2a65bdf37482c353f6f532b` | 8X8D4 block 5 tile 52 over sky colour 11 | map 21, square (6,0) facing north, cell column 0 row 0 | 0, 8, 24 |
| `tile:21:76d1518376e46a2c1398f330a29e4b477a1aab8aacca84ae69f721166d0fae9a` | 8X8D4 block 5 tile 35 | map 21, square (7,3) facing south, cell column 2 row 5 | 18, 24 |
| `tile:21:76d272359b8d0ba4ab10638cd5d972cf295ac7ce25c65326995a5665f8bb3d4a` | 8X8D4 block 5 tile 47 over sky colour 12 | map 21, square (7,6) facing west, cell column 1 row 2 | 18, 24 |
| `tile:21:791da9b2a71e7d7f831a6bec448e9060b9def2986f27ddfe9f223b72d70471c3` | 8X8D4 block 5 tile 43 over the ground colour 6 | map 21, square (7,6) facing east, cell column 8 row 6 | 18, 24 |
| `tile:21:8dd1556ee58455c0ad59b27fa19e75545c8f3f9ccf299cd7ad0d799a898cd1f8` | 8X8D4 block 5 tile 39 | map 21, square (7,8) facing east, cell column 10 row 8 | 18, 24 |
| `tile:21:8f0e6579d7872a4d8a2891c4247c62a0da055971d2ce4c9b7fd1bd193b589f58` | 8X8D4 block 5 tile 14 | map 21, square (7,8) facing north, cell column 4 row 4 | 0, 8, 18, 24 |
| `tile:21:947a0fb3e20ee928ec232553003a76851246b61a7165ecec40aaea1f10ba9e0c` | 8X8D4 block 5 tile 19 | map 21, square (7,10) facing west, cell column 0 row 5 | 24 |
| `tile:21:aafaf1a07a36fe7adc6f58cac01630fd86675ec02b6ac5be58c7cea01e286f31` | 8X8D4 block 5 tile 6 over sky colour 11 | map 21, square (6,0) facing north, cell column 1 row 0 | 24 |
| `tile:21:afcce2e35d81fb6e32eeb13151c302f9d8cc45518a8d5aa73de6061b316548ec` | 8X8D4 block 5 tile 37 | map 21, square (6,8) facing east, cell column 6 row 6 | 24 |
| `tile:21:b089021fb5441623c0ac282378995eda7c3667072b2333bfcac5ce04989b0c50` | 8X8D4 block 5 tile 51 over sky colour 11 | map 21, square (6,0) facing north, cell column 10 row 0 | 0, 8, 24 |
| `tile:21:b41b8352eae61850bf9be786d9c18aecee304cbdb3e7b7d268e510e8c53a72b3` | 8X8D4 block 5 tile 33 | map 21, square (8,10) facing west, cell column 2 row 7 | 24 |
| `tile:21:b5f9ae0637628bd41724848ae763c955501dbb7d9c8f1cd7d151475b2b07913f` | 8X8D4 block 5 tile 29 | map 21, square (8,6) facing south, cell column 2 row 8 | 24 |
| `tile:21:baf11928c56c8f093d0b0635d0196258cf5c576da59c4073554c82c09adf992a` | 8X8D4 block 5 tile 42 over sky colour 12 | map 21, square (7,6) facing south, cell column 8 row 2 | 18, 24 |
| `tile:21:bd6a64fa5fc60d4149863e4297f3c9161423e0e3d029e545ef099ca9fbbe888c` | 8X8D4 block 5 tile 21 | map 21, square (7,6) facing south, cell column 7 row 7 | 18, 24 |
| `tile:21:bf4b6ce5ef0139bbd6c3f5f34faa59723cb8d5c9349c789f75e443c9af495701` | 8X8D4 block 5 tile 24 over sky colour 12 | map 21, square (7,6) facing south, cell column 7 row 3 | 18, 24 |
| `tile:21:c55f9dff0da357ba6ad51c8def990818ae2ae09981047d68157916c417038cdc` | 8X8D4 block 5 tile 66 over sky colour 12 | map 21, square (7,3) facing south, cell column 2 row 4 | 24 |
| `tile:21:c8a01e9835a9674a2c2f98cce38898e522378e360f3d18c696a4639f41af3eaf` | 8X8D4 block 5 tile 18 over sky colour 12 | map 21, square (4,0) facing east, cell column 6 row 3 | 24 |
| `tile:21:c97685125724f596804cd5abdfe634c07241d3f365c8bcedf5c69fba0569aa8b` | 8X8D4 block 5 tile 5 | map 21, square (7,8) facing south, cell column 2 row 8 | 18, 24 |
| `tile:21:ca66beb5d5923e7d2dfc2257cbf331d3f3b84e6e9a8076759f28ab49952f0368` | 8X8D4 block 5 tile 16 | map 21, square (7,10) facing south, cell column 0 row 5 | 18, 24 |
| `tile:21:d0f56d87eee16a503cf0bc41fdbb1249c62652b42841d109989084b691b44f0d` | 8X8D4 block 5 tile 68 over sky colour 12 | map 21, square (7,4) facing south, cell column 2 row 4 | 24 |
| `tile:21:dc6c3d5510b0653401790072e22a586a17ac1d36bc9b0f782ea2f57ec58b7828` | 8X8D4 block 5 tile 1 | map 21, square (7,3) facing south, cell column 3 row 5 | 0, 18, 24 |
| `tile:21:e2237e9ab1d7f3c042fcb38f788598597b973215ae67194d1833748eda49617e` | 8X8D4 block 5 tile 48 | map 21, square (6,0) facing east, cell column 10 row 10 | 18, 24 |
| `tile:21:e4c4cfe2e11e35939f460141bf79788540aa7b376191f2eff650b06913c59070` | 8X8D4 block 5 tile 27 | map 21, square (7,7) facing south, cell column 1 row 5 | 18, 24 |
| `tile:21:ed2de710665e57de96fa14612dc7f348d36b0b63c8c8488005b99eb6495217b6` | 8X8D4 block 5 tile 15 | map 21, square (8,6) facing south, cell column 2 row 3 | 24 |
| `tile:21:edadac4e16775a226240148d5a36e848e2334afae0e2592dccd20b1480446507` | 8X8D4 block 5 tile 38 | map 21, square (7,10) facing east, cell column 8 row 7 | 18, 24 |
| `tile:21:f518ea1fc471b9461565dd79b87e39deb0b9c42c4eba39c33eae0e7241007b20` | 8X8D4 block 5 tile 34 | map 21, square (7,7) facing south, cell column 1 row 6 | 24 |

#### tile set 8X8D4 block 9 (9)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:21:047999a951e18a76faa74bddd9e5c5668fa48328dc364e108ddabc89608836c1` | 8X8D4 block 9 tile 69 | map 21, square (4,5) facing east, cell column 5 row 5 | 28 |
| `tile:21:2006ced2aa38cb8843b18660165392bc2b65ff2bdda28e52c935e0fb47e84a91` | 8X8D4 block 9 tile 56 over sky colour 12 | map 21, square (6,12) facing east, cell column 8 row 4 |  |
| `tile:21:22fadf4220cd28d9eb2fbf127784d5e10db5333cfe283932299506b8b2441bc5` | 8X8D4 block 9 tile 26 over sky colour 12 | map 21, square (1,0) facing south, cell column 10 row 0 |  |
| `tile:21:54e23988a076b3a634c33eab5bad5b6c2b5f55ff4812ddbcd718d089e63223bc` | 8X8D4 block 9 tile 49 over sky colour 12 | map 21, square (7,12) facing west, cell column 0 row 3 |  |
| `tile:21:7143a050c3f7b7ed9ad82387d8e9c8718cfc65da371bd7de40a7a90ef8ece325` | 8X8D4 block 9 tile 50 | map 21, square (0,10) facing north, cell column 9 row 5 | 28 |
| `tile:21:96fd03da5951e75db896a852086098690883937d60c8147999b4e16b67634a6a` | 8X8D4 block 9 tile 51 | map 21, square (0,6) facing south, cell column 1 row 5 | 28 |
| `tile:21:a1b8baf4059c3a18ecd999f94f44fbba3630c87a33820ec33a092d52785d83bd` | 8X8D4 block 9 tile 43 | map 21, square (6,15) facing north, cell column 7 row 5 | 9, 28 |
| `tile:21:b762d5d836385e9ea94651ab7488b47053b0958365d8a92a8bbb672f624096ce` | 8X8D4 block 9 tile 27 over sky colour 12 | map 21, square (1,0) facing north, cell column 0 row 0 |  |
| `tile:21:f7f1cfd7f855df9f8a2cf56ec685afad5afab8cd7a8b33c3856d94c295566739` | 8X8D4 block 9 tile 45 over sky colour 12 | map 21, square (8,12) facing west, cell column 2 row 4 |  |

### Area 22: Yarash's Pyramid (2)

#### tile set 8X8D7 block 3 (2)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:22:228a010ec6afee2452833b3324acc5c8caeed83bff7299f110435bf2f6400620` | 8X8D7 block 3 tile 53 | map 22, square (15,9) facing north, cell column 4 row 6 | 2 |
| `tile:22:92df48167746faefc397c59326840c70b6dc6988740a5af2a7007a7e319ea69d` | 8X8D7 block 3 tile 13 over sky colour 15 | map 22, square (15,6) facing west, cell column 0 row 2 |  |

### Area 23: Yarash's Pyramid, lower (15)

#### shared tile set 8X8D1 block 203 (5)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:23:0ae60cf3309accf1a341b5cc07952a90cf121d33ec8c6432d727b57c0c6c20f1` | 8X8D1 block 203 tile 15 over the ground colour 6 | map 23, square (12,2) facing north, cell column 10 row 7 | 2, 9, 15, 18, 20, 22, 29 |
| `tile:23:699e8b134491518fdbccbf4e9783a7ecde8cec6424c1858827d3cbc005fdbaea` | 8X8D1 block 203 tile 36 over the ground colour 6 | map 23, square (13,2) facing north, cell column 8 row 8 | 2, 9, 15, 20, 22, 29 |
| `tile:23:83a47be8f7541c55e4af4555aef88155720e0c7e664b78d7182822ecc183dce7` | 8X8D1 block 203 tile 35 | map 23, square (12,2) facing east, cell column 2 row 4 | 2, 15, 20, 22, 29 |
| `tile:23:bbce287c6ee78ffeb335f96aa0495fd20d9f1188892a017452b2592b0bf1f997` | 8X8D1 block 203 tile 14 over the ground colour 6 | map 23, square (1,2) facing west, cell column 3 row 7 | 0, 2, 8, 9, 14, 15, 20, 22, 29 |
| `tile:23:c1703ae17aff024be5fa1603c19a3d65cdfe2b61e20be7cd68214ea1e2a36585` | 8X8D1 block 203 tile 37 over the ground colour 6 | map 23, square (1,2) facing west, cell column 2 row 8 | 0, 2, 8, 9, 15, 20, 22, 29 |

#### tile set 8X8D7 block 1 (10)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:23:1a0dfab20ddd54d612ffb12175d632859d32e97be62e6eb473715674473547de` | 8X8D7 block 1 tile 56 | map 23, square (14,3) facing north, cell column 4 row 6 | 9, 14, 15, 20, 22, 29 |
| `tile:23:1c7914d8638179e01d5da8ef2d1757899c5740d178bd270ee0be0ad911fb5834` | 8X8D7 block 1 tile 4 over sky colour 15 | map 23, square (14,1) facing south, cell column 10 row 2 | 15, 20, 22 |
| `tile:23:23ade102018548cabe2a52d3a65ad144116cddbcf45ae2414102faaa74d4b7d4` | 8X8D7 block 1 tile 55 | map 23, square (1,2) facing west, cell column 3 row 4 | 2, 9, 14, 15, 20, 22, 29 |
| `tile:23:3afb19e8b93efbce226a81d7fc31bbf5ed758889c699794abf237aff236b1411` | 8X8D7 block 1 tile 4 over the ground colour 6 | map 23, square (13,1) facing north, cell column 10 row 9 | 2, 15, 20, 22, 29 |
| `tile:23:3df247a59ff18323be4631a63c96cf8ab98193f543ef4003a72a7c1e856e15f8` | 8X8D7 block 1 tile 54 | map 23, square (1,2) facing west, cell column 2 row 4 | 2, 9, 15, 20, 22, 29 |
| `tile:23:78b9ac2bd20058bd099365b34299ba8c52ce378e7bf531a1146742456c9cf722` | 8X8D7 block 1 tile 23 over sky colour 15 | map 23, square (13,1) facing north, cell column 10 row 1 | 15, 20, 22 |
| `tile:23:85b030277ef782597e0905e1f528dc419436fb4c80e649f5a0ba20d492065e2b` | 8X8D7 block 1 tile 53 | map 23, square (1,2) facing west, cell column 2 row 5 | 0, 2, 8, 9, 10, 15, 16, 20, 22, 29 |
| `tile:23:9ac33380c39afce48e407e01c663a32dfc37c048c03c911accd29efbdb475032` | 8X8D7 block 1 tile 17 | map 23, square (12,3) facing north, cell column 9 row 5 | 2, 15, 20, 22, 29 |
| `tile:23:ca1a1292cdd484da405ff32f0a76c0246e016d31ae63e7506cf401b0d243a84e` | 8X8D7 block 1 tile 52 | map 23, square (1,2) facing west, cell column 3 row 5 | 0, 2, 8, 9, 10, 14, 15, 16, 20, 22, 29 |
| `tile:23:e0a3abc3b4a8d171ac804ef60ea102f382d0189b8cd2be1c2a616fc8c2e8d86a` | 8X8D7 block 1 tile 57 | map 23, square (12,3) facing north, cell column 9 row 6 | 2, 9, 15, 20, 22, 29 |

### Area 28: Zhentil Keep Outpost (15)

#### tile set 8X8D6 block 9 (15)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:28:14d3757ae4f739077b25d4727195ea3f08c518f72d332bb55af6d09f750228cb` | 8X8D6 block 9 tile 47 | map 28, square (7,0) facing east, cell column 1 row 3 | 21 |
| `tile:28:2006ced2aa38cb8843b18660165392bc2b65ff2bdda28e52c935e0fb47e84a91` | 8X8D6 block 9 tile 56 over sky colour 12 | map 28, square (8,0) facing west, cell column 8 row 4 |  |
| `tile:28:22fadf4220cd28d9eb2fbf127784d5e10db5333cfe283932299506b8b2441bc5` | 8X8D6 block 9 tile 26 over sky colour 12 | map 28, square (7,0) facing south, cell column 10 row 0 |  |
| `tile:28:2b189e32fb8cf14bccc4e230acdc7e87885e4ba1d93051e2861319877487c307` | 8X8D6 block 9 tile 55 | map 28, square (7,0) facing north, cell column 2 row 4 | 9, 18, 21, 24 |
| `tile:28:33b51e82f012e7d91b96894cd582495df912d95b36989e787ee5f7885e92d5b7` | 8X8D6 block 9 tile 38 | map 28, square (7,0) facing east, cell column 3 row 6 | 9, 21 |
| `tile:28:58aef8f26084a2aca7cc4f541ba0f78ee369e284686f8f6b89ccb7c228377477` | 8X8D6 block 9 tile 57 | map 28, square (8,0) facing west, cell column 7 row 4 | 9, 16, 21 |
| `tile:28:6182286c97e2af8cf47fcf4321d9b562df43cfb3c35ee22574e9528275ea8a7d` | 8X8D6 block 9 tile 56 over sky colour 11 | map 28, square (8,0) facing west, cell column 8 row 4 | 21 |
| `tile:28:80365aff0ddcf91182a971781062979ea6fb274bdd0be01e236be5c240ec701b` | 8X8D6 block 9 tile 8 | map 28, square (7,0) facing north, cell column 5 row 4 | 9, 21 |
| `tile:28:8f3581a37a37d80a394e310d82b46ab3fd19b341e0181b9dbbbed1a2a1bcad32` | 8X8D6 block 9 tile 37 | map 28, square (7,0) facing east, cell column 2 row 6 | 9, 16, 21 |
| `tile:28:b762d5d836385e9ea94651ab7488b47053b0958365d8a92a8bbb672f624096ce` | 8X8D6 block 9 tile 27 over sky colour 12 | map 28, square (7,0) facing north, cell column 0 row 0 |  |
| `tile:28:b784b8750b8adf3caafc9bb39eccbd31f78447d7268123fcf737875c487f9fea` | 8X8D6 block 9 tile 44 | map 28, square (7,0) facing west, cell column 10 row 7 | 9, 21 |
| `tile:28:ba6dffecfcac31b31c0359d99617b3180552c982bef2087cb4995bccd9554ee7` | 8X8D6 block 9 tile 45 over sky colour 11 | map 28, square (7,0) facing east, cell column 2 row 4 | 21 |
| `tile:28:f59a8b4ef53dca4b588a04b05a81d1c5a38fb9fa2354b6e64a4853bbbf7ad8f3` | 8X8D6 block 9 tile 46 | map 28, square (7,0) facing west, cell column 9 row 3 | 9, 21 |
| `tile:28:f7f1cfd7f855df9f8a2cf56ec685afad5afab8cd7a8b33c3856d94c295566739` | 8X8D6 block 9 tile 45 over sky colour 12 | map 28, square (7,0) facing east, cell column 2 row 4 |  |
| `tile:28:fd5111f010b1eb27874d7173f3f881527f0a97a68535e574937a39274ae5fb87` | 8X8D6 block 9 tile 48 | map 28, square (7,0) facing east, cell column 3 row 4 | 9, 21 |

### Area 31: Temple of Bane, interior (14)

#### tile set 8X8D1 block 3 (14)

| Key (PNG 32x32) | What it is | See it at | Already drawn in area |
| --- | --- | --- | --- |
| `tile:31:0fe98ad9cca711b154fa54acc26ca865f6582a794910079509e512f212a9fdb8` | 8X8D1 block 3 tile 30 | map 31, square (14,4) facing north, cell column 8 row 8 | 0, 2, 18, 24 |
| `tile:31:15be260fd378f5b33c7dc10af0e7565eaa2221596debd496a87de8b4c13f9f35` | 8X8D1 block 3 tile 42 | map 31, square (14,4) facing north, cell column 8 row 6 | 0, 2, 18, 24 |
| `tile:31:190ac6332cc824f04f3d89592b0c0ce3ee634aaa2bb2983cad5c020189b58d16` | 8X8D1 block 3 tile 43 | map 31, square (14,2) facing south, cell column 2 row 6 | 0, 2, 18, 24, 29 |
| `tile:31:3a345c508ec6aeaebd3f6c8ba2645d88c94984c3198f6c0f3fc9a82fa521c3d0` | 8X8D1 block 3 tile 64 | map 31, square (4,10) facing west, cell column 1 row 5 | 0, 2, 18, 24, 29 |
| `tile:31:4c23fe508a44e32f9998329dce0edb6985bec740d0542a22c128aec206e025cb` | 8X8D1 block 3 tile 40 | map 31, square (14,2) facing south, cell column 2 row 8 | 2, 18, 29 |
| `tile:31:69b37e4229250c117e87ecaea0d3f1c278197c5591b9678919a1ab2f71d07b35` | 8X8D1 block 3 tile 62 | map 31, square (13,4) facing north, cell column 10 row 7 | 2, 18, 24 |
| `tile:31:6c7ec11bfc006585332f2495cbe7d713d38a049d7b8374177334f0c5c0af5f1d` | 8X8D1 block 3 tile 32 | map 31, square (5,0) facing south, cell column 1 row 6 | 2, 18, 29 |
| `tile:31:86ba657c5e38ad07f30066dd1c810ad2552c5383b57c9ddd71c56c2dd5302d1e` | 8X8D1 block 3 tile 33 | map 31, square (14,2) facing south, cell column 2 row 5 | 0, 2, 18, 24, 29 |
| `tile:31:8cf3cea60a07a9d7bfe51b29ce5252f640c3bf3caeee2d2301c670f21fc55803` | 8X8D1 block 3 tile 27 over the ground colour 6 | map 31, square (0,11) facing east, cell column 6 row 6 | 0, 2, 18, 24, 29 |
| `tile:31:a42700fea5fc42908d4fdccd8ba4656d4e4ec432332f2b74ac7d672e8c11ecf5` | 8X8D1 block 3 tile 61 | map 31, square (13,2) facing south, cell column 0 row 7 | 2, 18, 24, 29 |
| `tile:31:c2b9b89fe07262973e1608f442f5e0ffd943f878b4a31642f0e6a52848a0c44d` | 8X8D1 block 3 tile 67 | map 31, square (13,2) facing south, cell column 0 row 6 | 2, 18, 24, 29 |
| `tile:31:e3922047e12c2260eaef5a4f40f4426f51c95b755440c710331492e05e3c951a` | 8X8D1 block 3 tile 28 over the ground colour 6 | map 31, square (4,10) facing west, cell column 1 row 6 | 2, 18, 24, 29 |
| `tile:31:e72913a89f9d3daef62dc19e63acc5d329e89789dbe44e1e0e3099927e06f034` | 8X8D1 block 3 tile 34 | map 31, square (13,2) facing south, cell column 0 row 5 | 0, 2, 18, 24, 29 |
| `tile:31:f2213dcb1a2ac31b69195cb160ff6cd402c4206ed29291cc2b3411026c07dba6` | 8X8D1 block 3 tile 66 | map 31, square (14,4) facing north, cell column 8 row 7 | 2, 18, 24 |

## Still being worked out

Do not start on these. The counts are what the tool has not yet confirmed or classified.

| What | Count |
| --- | ---: |
| first-person cells of an area whose reading is not confirmed | 6402 |
| first-person cells that show a sky colour no existing artwork of the area shows | 711 |
| first-person cells made of several tiles together | 306 |
| first-person cells of the overhead area view | 60 |
| first-person cells seen only from squares not connected to any square the existing artwork was made from | 61 |
| battlefield tiles (SQRPACI, DUNGCOM, WILDCOM, RANDCOM) | not yet classified |
| other picture frames no key names | not yet classified: see `framesNoKeyNames` of npm run verify:art-catalogue |
| narrated passages that describe something to see and have no artwork | will come from npm run qa:narration, which another agent is building |

Areas not yet confirmed, and why:

- Area 0 (New Phlan): 90 of the 251 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 2 (Cadorna Textile House): 5 of the 259 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 3 (Valjevo Castle): 35 of the 81 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 4 (Valjevo Castle): 1 of the 59 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 5 (Valjevo Castle): no script and map were found that draw under this area number.
- Area 6 (Valjevo Castle): 29 of the 72 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 7 (Valjevo Castle, the Pool): no script and map were found that draw under this area number.
- Area 8 (Phlan City Hall): no script and map were found that draw under this area number.
- Area 10 (Valhingen Graveyard): 288 of the 419 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 11 (The Training Hall): no script and map were found that draw under this area number.
- Area 15 (Mendor's Library): 15 of the 185 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 16 (The Lizardman Keep): this area number covers 4 combinations of map and wall sets (map 16, map 30; WALLDEF8 9/20/23, WALLDEF8 9/17/23), and which of them the game shows is still being worked out.
- Area 18 (Podol Plaza): 69 of the 194 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 20 (The Slums): 20 of the 197 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 24 (Temple of Bane): this area number covers 2 combinations of map and wall sets (map 31, map 24; WALLDEF1 1/3/5), and which of them the game shows is still being worked out.
- Area 25 (Wilderness, west): only 0 cells of this area have artwork so far, too few to confirm the reading of its maps and wall sets against.
- Area 26 (Wilderness, middle): 128 of the 162 cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete.
- Area 27 (Wilderness, east): only 19 cells of this area have artwork so far, too few to confirm the reading of its maps and wall sets against.
- Area 29 (Kuto's Well): this area number covers 4 combinations of map and wall sets (map 29, map 32; WALLDEF8 3/20/1, WALLDEF8 18/17/1), and which of them the game shows is still being worked out.
- Area 30 (area 30): this area number covers 2 combinations of map and wall sets (map 30; WALLDEF8 9/20/23, WALLDEF8 9/17/23), and which of them the game shows is still being worked out.
- Area 32 (area 32): this area number covers 2 combinations of map and wall sets (map 32; WALLDEF8 3/20/1, WALLDEF8 18/17/1), and which of them the game shows is still being worked out.

## Narrated passages with nothing to see

Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.
