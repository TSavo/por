# The port's game data

The files under `game/` are the port's own copy of everything the game needs besides the
original pictures. They are converted from the version 1.3 files and committed, so the game
runs with no original file present. Format name `pool-of-radiance-game-data`, format version 2.

```
npm run build:game-data -- <version 1.3 game directory>           write game/
npm run build:game-data -- <version 1.3 game directory> --check   fail if game/ differs
npm run verify:game-data                                          prove it (see below)
```

The converter is `tools/build-game-data.ts`. It needs the Python that runs the translator
(capstone): set `POR_PYTHON`, or have it as `python` on the PATH. The reader is
`src/runtime/game-data.ts`. The converter is deterministic: the same input files give the same
bytes.

## Which data the game runs from

- An original game directory supplied (`POR_GAMEDATA`, or a `gamedata/` folder): the game runs
  from the original files, exactly as before `game/` existed.
- None supplied: the game runs from `game/`.
- `POR_GAME_SOURCE=port` runs from `game/` even when original files are present.
  `POR_GAME_SOURCE=original` never falls back to `game/`.
- `POR_GAMEDATA` may also name another directory in this format, such as a test copy.

## Files

| File | What it holds |
| --- | --- |
| `manifest.json` | Format name and version, the game version, the names of the files below, and the size and SHA-256 of each. |
| `program.json` | The program: entry point, stack, the overlay table, and where the image and the overlays' bytes are. |
| `program/image.bin` | The program as it sits in memory at paragraph 0, with every instruction blank. |
| `program/overlays.bin` | The bytes of the 35 overlays, one after another, with every instruction blank. |
| `content/scripts.json`, `content/scripts.bin` | The area scripts (ECL). The JSON lists each script; its bytecode is in the blob. |
| `content/maps.json` | The 16 by 16 maps (GEO). |
| `content/walls.json` | The wall definitions (WALLDEF). |
| `content/items.json` | The item tables (ITEM archives) and the table of item kinds (ITEMS). |
| `content/monsters.json` | The monsters (MON*CHA), what they carry (MON*ITM) and their effects (MON*SPC). |
| `content/characters.json` | The ready-made characters (CHRDAT*), their items and effects. |
| `content/config.json` | The configuration (POOL.CFG). |
| `content/saved-games.json`, `content/saved-games.bin` | The two saved games shipped with 1.3. |
| `pictures.json` | Every picture record: identity, shape and the hash of each frame, and no pixels. |
| `tiles.json` | Every distinct 8 by 8 wall and scenery tile by hash, where it is stored, and its hash over each solid colour. |

JSON holds structure. A `.bin` file holds only content that is binary: the program bytes, script
bytecode and the shipped saved games. A JSON entry names its place in a blob as
`{ "file", "offset", "length" }`.

## The program

The translated TypeScript (`src/translated-1.3`) replaces the program's instructions. It still
reads text, tables and the data segment from memory, so those bytes are kept and the instructions
are not.

- `image.bin` is the 68,592-byte load image of `START.EXE` after unpacking. The converter asks
  the translator for the byte range of every instruction it emits
  (`python tools/tp_translate.py <dir> --game-version 1.3 --instruction-map <file>`) and writes
  zero over each: 40,862 bytes. It also blanks 1,581 bytes of library code the translation never
  reaches and so does not list (the sound unit's timer interrupt handler, and Crt and System
  routines nothing calls); the ranges are named in the converter.
- The overlay table (35 stub segments, 3,150 bytes) is not in the image. It is the `overlays`
  list in `program.json`: for each overlay its paragraph in the image, its place and size in
  the overlay file, and the offset of each procedure the resident program calls. The reader
  writes the stub segments back into memory from that list.
- What remains in the image: the 17,456-byte data segment, and 3,565 non-zero bytes below it,
  which are text, jump tables, sound data and numeric constants.
- `overlays.bin` holds the overlays' 197,641 bytes with 186,841 instruction bytes blank.
  9,598 non-zero bytes remain: the text and set constants the overlays' procedures read.
- `entry` and `stack` are the registers the program starts with.
- Relocations: each overlay lists the offsets a loader would relocate. The image lists none: the
  runtime loads it at paragraph 0, where every segment word already holds its final value.

The game's overlay loader opens `GAME.OVR` through DOS, so the reader presents an overlay file
built from this data: the signature, the length, and each overlay at its original offset with
its instructions blank. No program file is presented; nothing opens one.

## Game content records

Each entry is one original record. `file` is the DOS name the game opens. For an archive,
`block` is the record's number and `position` its place in the archive. `kind` says what it is
and `bytes` is its decoded size. The data is in one of these forms:

- `rows`: fixed-size rows of `rowBytes` bytes, each a string of hexadecimal. Items are 63-byte
  rows, monsters and characters 285, effects 9, item kinds 16 (after a two-byte first row).
  `name` or `names` repeat the names found in monster and character rows, for the reader.
- `map`: two header bytes and four planes of 16 rows of 16 squares: `northEast` and `southWest`
  (a wall type in each half of a byte), `flags`, and `extra` (two bits for each side).
- `wallSets`: for each wall set, five rows of 156 symbol numbers.
- `lines`: a text file's lines. Each ends with CR LF in the file. The configuration's third and
  fourth lines, the data path and the save path, name the port's directories (`.\` and
  `.\SAVE\`) where a store installer writes its own.
- `blob`: binary content in a `.bin` file.

The rows of the tables are not split into named fields: the game reads them at fixed offsets,
and the port does not yet name them.

## Picture records

`pictures.json` has one entry for each record of the picture archives (8X8D, BACPAC, BODY,
CBODY, CHEAD, COMSPR, CPIC, DUNGCOM, FINAL, HEAD, ICON, PIC, RANDCOM, SPRIT, SQRPACI, TITLE,
WILDCOM): 784 records. An entry holds the record's identity, its decoded size, and for each
picture in it the height, width, position, number of frames, eight header bytes the game keeps,
and for PIC and SPRIT members the four-byte selector. It holds no pixels. The font (8X8D1 block
201) is listed with its size only.

Each picture also carries `frameHashes`: for each frame, the SHA-256 of its pixels as colour
numbers, one byte a pixel, row by row (`frameSlice(decodePicture(record))`, the functions the
artwork lookups use). A hash names the original picture without holding it. For a set of 8 by 8
tiles this is the hash a `tile:<area>:<hash>` artwork key carries when the screen cell shows that
one tile. The battlefield terrain (DUNGCOM, WILDCOM, RANDCOM) also carries `cellHashes`: the same
hash of each 8 by 8 cell of each frame, which a `battle-tile:<hash>` key carries.

When the game asks for a picture record, the reader hands it a blank picture of that shape: the
same headers and zero pixels.

This classification of files into picture data, other content and program was made here from the
file formats. `npm run qa:standalone` is to classify them too; when it lands, the two are to be
reconciled.

`tiles.json` lists each distinct tile of the 8X8D sets once, by that hash, with every place it is
stored (`archive:block:index`). A tile that has transparent pixels (colour 13) also lists
`overColour`: the hash of the cell the screen shows when one solid colour is behind the tile, for
each of the 16 colours. The first-person view draws such tiles over the sky and ground colours,
and a `tile:` key taken from such a cell carries one of these hashes. 367 of the 1,334 distinct
tiles have transparent pixels.

## Serving the data to the game

The game's own loaders are translated code and read `.DAX` archives through DOS. The reader
(`loadPortGame`) therefore builds a virtual set of files for `src/runtime/dos.ts`: each archive
re-packed from its records in the original order, with the same block numbers and decoded sizes,
and each plain file as it was. Each record carries `packedBytes`, its packed size in the original
archive, and is packed to exactly that size (runs are split until it is), so every archive has
the original's size and directory. The game allocates its read buffer from the packed size; with
the original sizes its heap, and the pointers it leaves in saved character files, are the same. `tools/gamedata.ts` gives host tools the same files:
`listGameFiles`, `readGameFile`, `gameFiles` and `gameProgram` work on a directory in either
form.

## Proof

`npm run verify:game-data` (`tools/verify-game-data.ts`):

1. `game/` is what the converter writes from the 1.3 files.
2. Every byte the translator lists as an instruction is zero in the memory image and the overlay
   file built from `game/`, and every other byte equals the original, apart from the unreached
   library code named above. It prints how many bytes remain.
3. The same play, run once from the 1.3 files and once from `game/`, shows the same text on every
   frame, draws the same dice and writes the same saved-game bytes. It then shows the comparison
   fail on a copy of `game/` with one record changed.

## The artwork catalogue

`npm run verify:art-catalogue` (`tools/verify-art-catalogue.ts`) reads only `game/` and the
artwork manifests. For every artwork key it asks whether the data in `game/` can produce that key
from identities alone: a key that names a picture needs that archive, block, member and frame in
`pictures.json`; a key that carries a hash needs that hash stored for a named picture; a key that
names a script position or a cue needs the position, or the cue's text, in the area's converted
script. It prints the count for each kind of key, lists every unreachable key in
`out/art-catalogue.json`, and fails while any is unreachable. It also reports the other
direction: each 8 by 8 tile and whether a 32 by 32 replacement carries its hash, and each other
picture frame no key names.

It is red today. What it measures, and what is not built yet:

- A `tile:` key is the hash of an 8 by 8 cell of the first-person view as drawn. Of 3,940 keys,
  2,092 are one stored tile (`frameHashes`) and 1,078 are one tile over a solid colour
  (`tiles.json`). The other 770 are cells where a nearer wall's tile is drawn over a farther
  one. Measured against the original pictures, 516 of those are two tiles of one archive over a
  solid colour, and 254 are not explained by two layers. Those hashes are not in `game/` yet:
  storing every pair would be millions of hashes, so the converter has to work out from the
  wall definitions which tiles can overlap in a cell.
- The check takes an area's script to be the ECL block with the area's number. Areas 30, 31 and
  32 have maps and no block of their own, so keys scoped to them count as unreachable until the
  area-to-script table is read from the program's data.
- The running game does not use these hashes yet. The Enhanced lookups still read original
  pixels (`tools/upgrade-art.ts`, `tools/portrait-art.ts`, `tools/combat-art.ts`,
  `tools/encounter-art.ts`, `tools/live-input.ts`), so from `game/`, where pictures are blank,
  Enhanced artwork is not found.
