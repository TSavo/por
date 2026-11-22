# The port's game data

The files under `game/` are the port's own copy of everything the game needs besides the
original pictures. They are converted from the version 1.3 files and committed, so the game
runs with no original file present. Format name `pool-of-radiance-game-data`, format version 1.

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
| `pictures.json` | Every picture record: identity and shape, and no pixels. |

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

When the game asks for a picture record, the reader hands it a blank picture of that shape: the
same headers and zero pixels.

This classification of files into picture data, other content and program was made here from the
file formats. `npm run qa:standalone` is to classify them too; when it lands, the two are to be
reconciled.

## Serving the data to the game

The game's own loaders are translated code and read `.DAX` archives through DOS. The reader
(`loadPortGame`) therefore builds a virtual set of files for `src/runtime/dos.ts`: each archive
re-packed from its records in the original order, with the same block numbers and decoded sizes,
and each plain file as it was. `tools/gamedata.ts` gives host tools the same files:
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
