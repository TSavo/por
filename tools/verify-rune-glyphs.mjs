// Checks the table the page draws the game's runes from (tools/rune-glyphs.js), against the game.
//
//   npm run verify:rune-glyphs
//
// The game runs from the port's own data in game/, or from the player's original files when
// they are found (POR_GAMEDATA; POR_GAME_SOURCE=port uses game/ regardless). Both hold the
// program's data and the scripts; only the original files hold the font's pixels.
//
// 1. The table names each of the wheel's 70 rune pictures once, by glyph codes no other rune uses.
// 2. Each picture's letter is the one the wheel gives it at the translate position, read the way
//    the Cluebook says: the rune at its TRANSLATE FROM tab, ring 1 under the dotted path.
// 3. The 13 start-up questions, from the game's own table in the program's data segment: each
//    question's Espruar glyph pair and Dethek glyphs are the pictures the wheel's question shows
//    (src/codewheel/wheel.json), and the question's word and path are the wheel's.
// 4. The words the game writes in runes during play, read out of the scripts (script opcode 3C,
//    PROTECTION: the address of a string of glyph code plus 0x3f, ended by 0): laid in a row of
//    cells as the game draws them, every glyph is part of a whole rune, and the pictures, read on
//    the wheel, spell LUX, SAMOSUD, SHESTNI, RHODIA, HARASH, RHODIA, RHODIA and NOKNOK.
// 5. With the original files only: each glyph's 8 by 8 pixels in the game's font (8X8D1 block
//    201, glyph code plus 0x40) are the pixels of its picture's cell (upgrades/codewheel, sampled
//    at the centre of each of the picture's 16 by 8 pixels). From game/ the font has no pixels and
//    this is reported as not checked.
import { readFileSync } from "node:fs";
import { inflateSync } from "node:zlib";
import { RUNE_GLYPHS, runePictures } from "./rune-glyphs.js";
import { findGameRoot, gameFiles, gameProgram, isPortGameRoot } from "./gamedata.ts";
import { entryById, parseDax } from "../src/lib/dax.ts";
import { readInstruction, scriptFromBlock } from "../src/lib/ecl.ts";
import { detectGameVersion, segment, useGameVersion } from "../src/runtime/bindings.ts";

const wheel = JSON.parse(readFileSync(new URL("../src/codewheel/wheel.json", import.meta.url), "utf8"));
const problems = [];
const N = wheel.positions;

// 2. The wheel's letter for each picture, at the translate position.
const ring1 = wheel.outer.rings[0];
const dottedRing1 = wheel.inner.paths.find(({ id }) => id === "dots").windows[0];
const outerTab = wheel.outer.runes.indexOf("translate-tab"), innerTab = wheel.inner.runes.indexOf("translate-tab");
const mod = (n) => ((n % N) + N) % N;
/** With the inner disc turned `turn` positions, inner position w lies over outer position w + turn. */
const letterOf = (picture) => {
  const outer = wheel.outer.runes.indexOf(picture), inner = wheel.inner.runes.indexOf(picture);
  // An Espruar rune is read with the inner disc's tab at it; a Dethek rune with the outer disc's.
  const turn = outer >= 0 ? outer - innerTab : outerTab - inner;
  return ring1[mod(dottedRing1 + turn)];
};
// The Cluebook's example: with the tabs together ring 1 shows 0, and one position on, A.
if (ring1[mod(dottedRing1 + outerTab - innerTab)] !== "0") problems.push("with the two tabs together the dotted path's ring 1 window does not show 0");

// 1. Every picture once, every code sequence once.
const pictures = RUNE_GLYPHS.map(([, picture]) => picture);
const onWheel = [...wheel.outer.runes, ...wheel.inner.runes].filter((id) => id !== "translate-tab");
for (const id of onWheel) {
  const count = pictures.filter((picture) => picture === id).length;
  if (count !== 1) problems.push(`the table names ${id} ${count} times`);
}
for (const picture of pictures) if (!onWheel.includes(picture)) problems.push(`the table names ${picture}, which is not on the wheel`);
const sequences = RUNE_GLYPHS.map(([codes]) => codes.join(","));
if (new Set(sequences).size !== sequences.length) problems.push("two runes share their glyph codes");
for (const [codes, picture] of RUNE_GLYPHS) {
  const espruar = picture.startsWith("espruar-");
  if (espruar && codes.length !== 2) problems.push(`${picture} is an Espruar rune and must be two glyphs`);
  if (codes.some((code) => !Number.isInteger(code) || code < 1 || code > 0x7f)) problems.push(`${picture} has a glyph code outside the rune font`);
}
const letters = RUNE_GLYPHS.map(([, picture]) => letterOf(picture));
for (const alphabet of ["espruar", "dethek"]) {
  const read = RUNE_GLYPHS.filter(([, picture]) => picture.startsWith(alphabet)).map(([, picture]) => letterOf(picture)).join("");
  if (read !== "ABCDEFGHIJKLMNOPQRSTUVWXYZ123456789") problems.push(`the ${alphabet} runes, in the table's order, read ${read} on the wheel`);
}

/** The letters a row of glyphs spells, drawn from cell 0 on, and any glyph that is not part of a whole rune. */
function spell(codes) {
  const shown = runePictures(codes.map((code, cell) => [cell, code, 15]));
  const covered = shown.filter(({ part }) => part === "all" || part === "middle").reduce((sum, { width }) => sum + width, 0);
  return { word: shown.map(({ picture }) => letterOf(picture)).join(""), pictures: shown.map(({ picture }) => picture), whole: covered === codes.length };
}

const root = findGameRoot();
if (!root) throw new Error("No game data: neither game/ nor original files were found");
const port = isPortGameRoot(root);
const files = gameFiles(root);
const file = (name) => {
  const found = files.find((entry) => entry.name.toUpperCase() === name);
  if (!found) throw new Error(`${name} is not in ${root}`);
  return found.data;
};
useGameVersion(detectGameVersion(file("GAME.OVR")));

// 3. The game's 13 questions: 21 bytes each from the data segment's offset 2, a Pascal string of
// the word, two Espruar glyphs, two Dethek glyphs (ff for none), and a Pascal string of the path.
const image = gameProgram(root).image;
const paths = { "- - - - -": "dashes", "-..-..-..": "dash-dot-dot", ".........": "dots" };
const pascal = (at) => String.fromCharCode(...image.subarray(at + 1, at + 1 + image[at]));
let questionsMatched = 0;
for (let number = 0; number < 13; number++) {
  const at = segment.data * 16 + 2 + 21 * number;
  const word = pascal(at), espruar = [image[at + 7], image[at + 8]], dethek = [image[at + 9], image[at + 10]].filter((code) => code !== 0xff);
  const path = paths[pascal(at + 11)];
  const question = wheel.questions.find((entry) => entry.number === number);
  const shownEspruar = spell(espruar), shownDethek = spell(dethek);
  const faults = [];
  if (!question) faults.push("the wheel has no such question");
  else {
    if (word !== question.word) faults.push(`the game's word is ${JSON.stringify(word)}, the wheel's ${question.word}`);
    if (path !== question.path) faults.push(`the game's path is ${pascal(at + 11)}, the wheel's ${question.path}`);
    if (!shownEspruar.whole || shownEspruar.pictures.join() !== question.espruar) {
      faults.push(`Espruar ${espruar.map(hex).join(" ")} draws ${shownEspruar.pictures.join(" ") || "nothing"}, the wheel shows ${question.espruar}`);
    }
    if (!shownDethek.whole || shownDethek.pictures.join() !== question.dethek) {
      faults.push(`Dethek ${dethek.map(hex).join(" ")} draws ${shownDethek.pictures.join(" ") || "nothing"}, the wheel shows ${question.dethek}`);
    }
  }
  if (faults.length) problems.push(`question ${number}: ${faults.join("; ")}`);
  else questionsMatched++;
}

// 4. The words in runes, at the script addresses tools/verify-runes-readable.mjs stands at.
const written = [
  ["ECL4.DAX", 21, 0x9bd8, "LUX", "Sokal Keep, the parchment"],
  ["ECL4.DAX", 21, 0x9bdd, "SAMOSUD", "Sokal Keep, the parchment"],
  ["ECL4.DAX", 21, 0x9be2, "SHESTNI", "Sokal Keep, the parchment"],
  ["ECL5.DAX", 3, 0xaa28, "RHODIA", "Valjevo Castle, Cadorna's slip"],
  ["ECL5.DAX", 4, 0xa478, "HARASH", "Valjevo Castle, the guards' list"],
  ["ECL5.DAX", 4, 0xa490, "RHODIA", "Valjevo Castle, the guards' list"],
  ["ECL5.DAX", 4, 0xa964, "RHODIA", "Valjevo Castle, the freed slave's slip"],
  ["ECL7.DAX", 23, 0xa46a, "NOKNOK", "Yarash's pyramid, the sign over the door"],
];
const scripts = new Map();
const read = [];
for (const [archive, block, address, expected, place] of written) {
  const key = `${archive}:${block}`;
  if (!scripts.has(key)) scripts.set(key, scriptFromBlock(entryById(parseDax(archive, file(archive)), block).data));
  const script = scripts.get(key);
  const instruction = readInstruction(script, address);
  const where = `${archive} block ${block} at ${address.toString(16)} (${place})`;
  if (instruction.name !== "PROTECTION" || instruction.operands[0]?.code !== 1) {
    problems.push(`${where} is ${instruction.name}, not PROTECTION with a string address`);
    continue;
  }
  const codes = [];
  for (let at = instruction.operands[0].word; script.byte(at) !== 0; at++) codes.push(script.byte(at) - 0x3f);
  const { word, whole } = spell(codes);
  read.push(word);
  if (!whole) problems.push(`${where}: glyphs ${codes.map(hex).join(" ")} are not all whole runes`);
  if (word !== expected) problems.push(`${where}: glyphs ${codes.map(hex).join(" ")} read ${word} on the wheel, not ${expected}`);
}

// 5. The game's own glyph pixels against the pictures, where the font has pixels.
let pixels;
const font = entryById(parseDax("8X8D1.DAX", file("8X8D1.DAX")), 201)?.data;
if (!font || font.every((byte) => byte === 0)) pixels = "not checked: the game's font has no pixels here";
else {
  let compared = 0;
  for (const [codes, picture] of RUNE_GLYPHS) {
    const tile = readPng(new URL(`../upgrades/codewheel/${picture}.png`, import.meta.url));
    // A one-glyph Dethek rune is in the middle eight of the picture's sixteen columns.
    const start = codes.length === 1 ? 4 : 0;
    codes.forEach((code, index) => {
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        const glyphLit = (font[(code + 0x40) * 8 + y] >> (7 - x)) & 1;
        const [red, , , alpha] = tile.rgba(((start + index * 8 + x) * tile.width) / 16 + tile.width / 32, (y * tile.height) / 8 + tile.height / 16);
        if (glyphLit !== (alpha > 128 && red > 160 ? 1 : 0)) {
          problems.push(`glyph ${hex(code)} differs from ${picture} at its pixel ${x},${y}`);
          return;
        }
      }
      compared++;
    });
  }
  pixels = `${compared} glyphs of the game's font are their pictures, pixel for pixel`;
}

if (problems.length) {
  console.log(problems.join("\n"));
  process.exit(1);
}
console.log(`verified the rune glyph table from ${port ? "the port's own data (game/)" : `the original files (${root})`}: ` +
  `70 pictures, each once, each read as its letter at the translate position; ${questionsMatched} of 13 start-up questions ` +
  `draw the wheel's runes; the scripts' rune strings read ${read.join(", ")}; ${pixels}`);

function hex(code) { return code.toString(16).padStart(2, "0"); }

/** A PNG's pixels: 8-bit, not interlaced, any colour type. `rgba(x, y)` takes whole or fractional pixels. */
function readPng(url) {
  const bytes = readFileSync(url);
  let at = 8, width = 0, height = 0, type = 0, palette;
  const data = [];
  while (at < bytes.length) {
    const length = bytes.readUInt32BE(at), kind = bytes.toString("latin1", at + 4, at + 8), body = bytes.subarray(at + 8, at + 8 + length);
    if (kind === "IHDR") {
      width = body.readUInt32BE(0); height = body.readUInt32BE(4); type = body[9];
      if (body[8] !== 8 || body[12] !== 0) throw new Error(`${url.pathname} is not an 8-bit, non-interlaced PNG`);
    } else if (kind === "PLTE") palette = body;
    else if (kind === "IDAT") data.push(body);
    at += 12 + length;
  }
  const channels = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type];
  const raw = inflateSync(Buffer.concat(data)), stride = width * channels, out = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? out[y * stride + x - channels] : 0, up = y ? out[(y - 1) * stride + x] : 0;
      const corner = x >= channels && y ? out[(y - 1) * stride + x - channels] : 0;
      const guess = left + up - corner;
      const paeth = Math.abs(guess - left) <= Math.abs(guess - up) && Math.abs(guess - left) <= Math.abs(guess - corner) ? left
        : Math.abs(guess - up) <= Math.abs(guess - corner) ? up : corner;
      const predicted = [0, left, up, (left + up) >> 1, paeth][filter];
      out[y * stride + x] = (raw[y * (stride + 1) + 1 + x] + predicted) & 255;
    }
  }
  return {
    width, height,
    rgba(fx, fy) {
      const i = Math.floor(fy) * stride + Math.floor(fx) * channels;
      if (type === 6) return [out[i], out[i + 1], out[i + 2], out[i + 3]];
      if (type === 2) return [out[i], out[i + 1], out[i + 2], 255];
      if (type === 4) return [out[i], out[i], out[i], out[i + 1]];
      if (type === 3) return [palette[out[i] * 3], palette[out[i] * 3 + 1], palette[out[i] * 3 + 2], 255];
      return [out[i], out[i], out[i], 255];
    },
  };
}
