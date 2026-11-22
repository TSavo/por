// The runes the game writes, from glyph code to the code wheel's picture of that rune.
//
// The game draws Espruar and Dethek with its 8 by 8 rune font, and the frame lists each glyph it
// has drawn (`state.runes`: cell, glyph code, colour; codes as in qa/research/code-wheel.md). The
// shipped game's font has no pixels, so the page draws the runes from the pictures the wheel uses
// (upgrades/codewheel, served at /code-wheel/<picture>.png): the player matches the same shapes.
//
// Each picture is a rune of the physical wheel, 16 by 8 of the game's pixels enlarged to 256 by
// 128. An Espruar rune is two glyphs side by side, the picture's left and right halves. A Dethek
// rune is one glyph in the picture's middle eight columns; the Dethek 9 is two glyphs, 6c and 70,
// filling all sixteen. 6c alone is the Dethek 5.
//
// The codes, in alphabetical order: Espruar A to Z are 01 02 to 36 37 with 1f to 21 skipped, and
// 1 to 9 are 55 56 to 65 66; Dethek A to Z are 3a to 53, and 1 to 8 are 68 to 6f. Each picture is
// named by its position on the wheel, so a rune's picture is the one the translate tab reads as
// its letter. Worked out from the game's own font against the wheel's runes (the glyphs drawn as
// glyph code plus 0x40, 8X8D1 block 201), and proved by `npm run verify:rune-glyphs` against the
// game's 13 start-up questions and the six words the game writes in runes.
//
// Dethek W, X and Z are the same glyph in the game's font and the same rune on the wheel.

/** [glyph codes, picture]. Espruar A to Z and 1 to 9, then Dethek A to Z and 1 to 9. */
export const RUNE_GLYPHS = [
  [[0x01, 0x02], "espruar-27"], // A
  [[0x03, 0x04], "espruar-28"], // B
  [[0x05, 0x06], "espruar-29"], // C
  [[0x07, 0x08], "espruar-30"], // D
  [[0x09, 0x0a], "espruar-31"], // E
  [[0x0b, 0x0c], "espruar-32"], // F
  [[0x0d, 0x0e], "espruar-33"], // G
  [[0x0f, 0x10], "espruar-34"], // H
  [[0x11, 0x12], "espruar-35"], // I
  [[0x13, 0x14], "espruar-00"], // J
  [[0x15, 0x16], "espruar-01"], // K
  [[0x17, 0x18], "espruar-02"], // L
  [[0x19, 0x1a], "espruar-03"], // M
  [[0x1b, 0x1c], "espruar-04"], // N
  [[0x1d, 0x1e], "espruar-05"], // O
  [[0x22, 0x23], "espruar-06"], // P
  [[0x24, 0x25], "espruar-07"], // Q
  [[0x26, 0x27], "espruar-08"], // R
  [[0x28, 0x29], "espruar-09"], // S
  [[0x2a, 0x2b], "espruar-10"], // T
  [[0x2c, 0x2d], "espruar-11"], // U
  [[0x2e, 0x2f], "espruar-12"], // V
  [[0x30, 0x31], "espruar-13"], // W
  [[0x32, 0x33], "espruar-14"], // X
  [[0x34, 0x35], "espruar-15"], // Y
  [[0x36, 0x37], "espruar-16"], // Z
  [[0x55, 0x56], "espruar-17"], // 1
  [[0x57, 0x58], "espruar-18"], // 2
  [[0x59, 0x5a], "espruar-19"], // 3
  [[0x5b, 0x5c], "espruar-20"], // 4
  [[0x5d, 0x5e], "espruar-21"], // 5
  [[0x5f, 0x60], "espruar-22"], // 6
  [[0x61, 0x62], "espruar-23"], // 7
  [[0x63, 0x64], "espruar-24"], // 8
  [[0x65, 0x66], "espruar-25"], // 9
  [[0x3a], "dethek-03"], // A
  [[0x3b], "dethek-02"], // B
  [[0x3c], "dethek-01"], // C
  [[0x3d], "dethek-00"], // D
  [[0x3e], "dethek-35"], // E
  [[0x3f], "dethek-34"], // F
  [[0x40], "dethek-33"], // G
  [[0x41], "dethek-32"], // H
  [[0x42], "dethek-31"], // I
  [[0x43], "dethek-30"], // J
  [[0x44], "dethek-29"], // K
  [[0x45], "dethek-28"], // L
  [[0x46], "dethek-27"], // M
  [[0x47], "dethek-26"], // N
  [[0x48], "dethek-25"], // O
  [[0x49], "dethek-24"], // P
  [[0x4a], "dethek-23"], // Q
  [[0x4b], "dethek-22"], // R
  [[0x4c], "dethek-21"], // S
  [[0x4d], "dethek-20"], // T
  [[0x4e], "dethek-19"], // U
  [[0x4f], "dethek-18"], // V
  [[0x50], "dethek-17"], // W
  [[0x51], "dethek-16"], // X
  [[0x52], "dethek-15"], // Y
  [[0x53], "dethek-14"], // Z
  [[0x68], "dethek-13"], // 1
  [[0x69], "dethek-12"], // 2
  [[0x6a], "dethek-11"], // 3
  [[0x6b], "dethek-10"], // 4
  [[0x6c], "dethek-09"], // 5
  [[0x6d], "dethek-08"], // 6
  [[0x6e], "dethek-07"], // 7
  [[0x6f], "dethek-06"], // 8
  [[0x6c, 0x70], "dethek-05"], // 9
];

const pairs = new Map(RUNE_GLYPHS.filter(([codes]) => codes.length === 2).map(([codes, picture]) => [codes.join(","), picture]));
const singles = new Map(RUNE_GLYPHS.filter(([codes]) => codes.length === 1).map(([[code], picture]) => [code, picture]));
/** Half of a two-glyph rune, for a glyph whose neighbour is not on screen. */
const halves = new Map(RUNE_GLYPHS.filter(([codes]) => codes.length === 2)
  .flatMap(([[first, second], picture]) => [[second, { picture, part: "right" }], [first, { picture, part: "left" }]]));

/**
 * The runes on screen as pictures to draw. `runes` is the frame's list: [cell, glyph code, colour].
 * Each result covers `width` text cells (1 or 2) from `cell` and shows `part` of its 16 by 8
 * picture: "all" (two glyphs, both cells), "middle" (a one-glyph Dethek rune), or "left" or
 * "right" (half of a two-glyph rune whose other glyph is not on screen). A glyph the table does
 * not name is left out.
 */
export function runePictures(runes) {
  const drawn = new Map((runes ?? []).map(([cell, glyph, color]) => [cell, { glyph, color }]));
  const pictures = [];
  const taken = new Set();
  for (const cell of [...drawn.keys()].sort((a, b) => a - b)) {
    if (taken.has(cell)) continue;
    const { glyph, color } = drawn.get(cell);
    const next = cell % 40 === 39 ? undefined : drawn.get(cell + 1);
    const pair = next && pairs.get(`${glyph},${next.glyph}`);
    if (pair) {
      taken.add(cell + 1);
      pictures.push({ cell, width: 2, picture: pair, part: "all", color });
    } else if (singles.has(glyph)) {
      pictures.push({ cell, width: 1, picture: singles.get(glyph), part: "middle", color });
    } else if (halves.has(glyph)) {
      pictures.push({ cell, width: 1, ...halves.get(glyph), color });
    }
  }
  return pictures;
}
