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
| `tiles.json` | Every distinct 8 by 8 wall and scenery tile by hash, where it is stored, its transparency mask, and its hash over each solid colour. |

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
file formats. `npm run qa:standalone` (docs/STANDALONE.md) classifies them too, and the two agree.
DUNGCOM.DAX and WILDCOM.DAX are pictures in both, though the art inventory lists them as game
data: their records have the picture header (24 by 24 pixels, 25 and 34 frames, and exactly the
bytes that shape needs), and 59 `battle-tile:` artwork keys are the hash of an 8 by 8 cell of a
DUNGCOM frame, which only pixels can give. A fight in the Slums played from `game/`, where these
records are blank, draws the same dice as from the 1.3 files.

Standalone Enhanced battlefields track the guest's replacement sheets in
the SQRPACI cache and place existing tile art from their packaged hashes.
GOG 1.3 Chrome comparisons verified wall placement and redraw order in
the Kobold Envoy and Bane hay-bunk fights. All nonblank DUNGCOM cells have
tile mappings. Native RANDCOM draws use available whole Enhanced artwork when
their nonblank cells lack complete tile coverage. These backdrops render beneath
combatants and are removed by terrain redraws. WILDCOM and untouched
SQRPACI cells still need Enhanced tile mappings. DUNGCOM frame 22 is
blank in the original battlefields.

The standalone browser resolves Enhanced monster sprites from the native
CPIC load and draw calls. The loader identifies each slot's archive and
ready block. The draw call supplies the pose, position, facing, and
picture extent. Terrain redraws remove overwritten placements. The
`kobold-envoy-strike` and `bane-hay-bunk-raider-combat` Chrome replays
verify ready and animated strike art with `POR_GAME_SOURCE=port`.
The browser uses framebuffer matching when it runs with the original files.
Standalone party sprites use the head, body, size and palette from the
native combatant record at the same draw call. The browser applies the
native palette through the existing Enhanced material masks where
available. The `kobold-envoy-party-icon-strike` Chrome replay checks
both party poses. Standalone uses the guest's COMSPR draw coordinates for combat
selection borders and replaces them on terrain redraw. The
`buccaneer-native-manual-aim` Chrome replay checks the border on occupied and empty
cells and its return to the active actor when Manual Aim closes.

Standalone projectile and impact art follows the guest's COMSPR loads,
scratch-frame copies and draw coordinates. The oil-flask Chrome replay
checks all four art variants and the defeat marker in both data modes.
Standalone identifies the marker by its source pointer in the combat
picture cache. Both effects clear after playback.

For Enhanced panel borders, standalone observes the guest's frame glyph draws
for the studs and horizontal and vertical rails from 8X8D1 block 202. Screen
writes and video resets remove overwritten stamps. The original-file browser
identifies the same glyphs in the EGA framebuffer. The Bane hay-bunk replay
checks the illustrated room's frame and its replacement by the battle frame.

In standalone mode, the PIC animation loader supplies the archive, block and
member for each native picture allocation. The renderer resolves existing
Enhanced portrait keys when the guest presents that member in the 88×88
picture panel, including when the underlying art pixels are blank. The guest
still draws the picture, and the observer drops its identity on release or when
the viewport changes. The portrait helper also records the HEAD and BODY
blocks it draws together, so the standalone mode can select the existing
composed artwork. The original-file renderer matches its native framebuffer.

Character creation uses the same native HEAD and BODY draws in the sheet at
`(224, 8)`. The standalone artwork loader validates each piece against its
packaged source dimensions. The Head / Body / Keep menu shows the two Enhanced
pieces as the guest changes them and clears them on entering the icon editor.

`tiles.json` lists each distinct tile of the 8X8D sets once, by that hash, with every place it is
stored (`archive:block:index`). A tile that has transparent pixels (colour 13) also lists
`overColour`: the hash of the cell the screen shows when one solid colour is behind the tile, for
each of the 16 colours. The first-person view draws such tiles over the sky and ground colours,
and a `tile:` key taken from such a cell carries one of these hashes. The 367 transparent
tiles also carry an eight-byte `transparentMask`, one byte per row with bits set where
the background shows through. With built-in data the WebGL renderer matches the active
wall definition to these tile identities, selects the installed Enhanced PNGs, and
applies their cutouts using the masks.

For complete screen cells, the browser combines the live wall layout, camera and
backdrop colours with the catalogue and the composed fingerprints in
`qa/art-worklist-cells.json`. The latter ships with the built-in data and contains
hashes only. Enhanced uses those exact cell replacements when WebGL is unavailable.
WebGL remains the default exploration renderer.

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

`npm run verify:art-catalogue` (`tools/verify-art-catalogue.ts`) reads the built-in game data,
the compiled screen-cell fingerprints and the artwork manifests. For every artwork key it asks
whether the built-in data can produce that key
from identities alone: a key that names a picture needs that archive, block, member and frame in
`pictures.json`; a key that carries a hash needs that hash stored for a named picture; a key that
names a script position or a cue needs the position, or the cue's text, in the area's converted
script. It prints the count for each kind of key, lists every unreachable key in
`out/art-catalogue.json`, and fails while any is unreachable. It also reports the other
direction: each 8 by 8 tile and whether a 32 by 32 replacement carries its hash, and each other
picture frame no key names.

The checker validates available fingerprints and script identities. Live replays
verify which artwork those identities select at a particular camera or dialogue cue.

- A `tile:` key is the hash of one 8 by 8 first-person cell. The checker reports
  stored tiles, tiles over a solid colour and compiled screen cells separately.
  The worklist computes actual overlaps from wall definitions and the maps that use them.
- The check looks for an ECL block with the area's number first. For a map with no same-numbered
  block it uses the area catalogue's owning script when ownership is unique. The Lizardman Keep,
  Bane Mansion and Kuto's Well maps 30, 31 and 32 therefore use ECL blocks 16, 24 and 29.
- Some portrait, encounter and combat lookups still read original picture pixels.
  Those presentations need their own identity-based lookup for the built-in data.
