# DAX container and pictures

Gold Box games store almost every asset in `.DAX` files. Pool of Radiance and Curse of the Azure Bonds use the same container. The layout below was checked by decoding `TITLE.DAX` from the CotAB tree until the SSI title card was legible, pixel for pixel, at 320×200. Nothing in the header is game-specific; the same parser reads Pool of Radiance's files (the port runs from them), and the CotAB files are the next game in the same engine. The block ids and sizes quoted below are CotAB's examples.

## Container

Little-endian.

```
uint16 directoryBytes
repeat (directoryBytes / 9) times:
    uint8  id
    uint32 offset       from the first payload byte
    int16  rawSize      decompressed length
    uint16 compSize
payload starts at directoryBytes + 2
```

`directoryBytes` must be a positive multiple of 9, and each compressed span must lie inside the file. Block ids are not required to be dense or sorted. CotAB `ECL1.DAX` uses ids 80, 81, 82. `GEO2.DAX` uses 1, 3, 4. `8X8D1.DAX` uses 201, 202, 203.

## Runs

Each payload is a byte run stream.

```
int8 n
n >= 0    copy the next n+1 bytes
n <  0    repeat the next byte (-n) times
```

`src/lib/dax.ts` implements this. `npm run selftest` round-trips a mixed literal and repeat. Decompressed lengths for the CotAB title, geo, walldef, and ecl blocks matched the `rawSize` field exactly.

## Picture block

A decompressed block is a picture when the 17-byte header describes a sane bitmap and the remaining bytes are exactly the packed pixels.

```
int16  height          pixels
int16  widthUnits      pixel width = widthUnits * 8
int16  x
int16  y
uint8  itemCount
uint8  field9[8]
then itemCount images:
    height rows of (widthUnits * 4) bytes
    each byte is two pixels, high nibble first
```

The in-memory `dax_block` struct in the original (height, width, item count, then a pointer) is not what is on disk. The pointer and the `bpp` word are filled in after the load. On disk the pixels follow `field9` immediately.

CotAB `TITLE.DAX` block 1 is height 200, widthUnits 40, one item: a 320×200 screen, 32000 pixel bytes. Block 2 is the second full-screen page. Blocks 3 and 4 are smaller overlays. The CotAB title routine draws block 1 at the origin, replaces it with block 2, then paints block 3 at character cell (6, 11) and block 4 at (0, 11). Phase 1 exports each page on its own. PoR's title file may be one page or several; the loader takes the first picture block as the title and keeps the rest.

Color 13 is the mask color when a picture is loaded with masking (8×8 wall and monster tiles). Masked pixels are stored as 16 and skipped when blitted. Unmasked pictures, including the title, keep color 13 as magenta.

## Other block shapes

Not every block is a picture.

| File | Decompressed size | Contents |
| --- | --- | --- |
| `GEOn.DAX` | 1026 (0x402) | uint16 skipped, then 16×16 map |
| `WALLDEFn.DAX` | 780 (0x30C) | 5 slices × 156 glyph ids |
| `ECLn.DAX` | varies | uint16 skipped, then bytecode at address 0x9900 (PoR, `ECL_BASE` in `src/lib/ecl.ts`; 0x8000 in CotAB) |
| `8X8Dn.DAX` | picture, often 8×8 × N | symbol sets |

`8X8D1` block 201 in the CotAB set is not a picture (the first bytes are not a height and width). Blocks 202 and 203 are: 40 glyphs and 45 glyphs. The 45-glyph set is symbol ids 1..0x2D. Wall tiles live in the area file (`8X8D2` ids 1..4 are 70 glyphs each) and line up with `WALLDEF2` block ids.

## Map

After the skipped uint16, 1024 bytes:

```
0x000  16×16  high nibble = wall facing 0 (north), low nibble = facing 2 (east)
0x100  16×16  high nibble = facing 4 (south), low nibble = facing 6 (west)
0x200  16×16  per-square flags
0x300  16×16  two bits per direction, packed 0,2,4,6 from the low bits
```

A wall nibble of 0 is open. Types 1..5 use walldef set 0, 6..10 set 1, and so on, with the slice equal to `(type - 1) mod 5`. The 3D window is documented in `docs/ecl.md` only in passing; the drawer is `renderViewport` in `src/lib/world.ts`.

## Tools

```
npm run tools -- extract
npm run tools -- images
```

`extract` writes each decompressed block to `out/dax/<file>/<id>.bin`. `images` writes PNGs of the title, a character picture, a combat picture, the 88×88 view, and that view placed on a 320×200 screen. Output stays in `out/`, which is gitignored, because the pixels are the original art.
