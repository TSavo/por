// Checks that Enhanced display keeps the game's runic writing readable, in Chrome, on version 1.3.
//
//   npm run verify:runes-readable -- <chrome-executable>
//
// The game came with a cardboard translation wheel. During play it prints words in Espruar
// (Elvish) or Dethek (Dwarvish) runes with script opcode 3C, the player translates them rune by
// rune with the wheel, and types the word where the game asks for it. If Enhanced display draws
// letters in place of the runes, covers them or leaves them out, the puzzle is broken.
// qa/research/code-wheel.md lists the five places; this check stands at each one.
//
// At each place it requires, with the runes on screen:
//   1. the game's own picture has a rune in every cell the word should occupy;
//   2. Classic and Enhanced both show that rune there: the page is photographed in each display
//      and every rune cell is compared with the game's glyph, pixel for pixel of its 8 by 8;
//   3. the frame names each rune (`runes`: cell, glyph code, colour) and the codes are the ones
//      the word is written with, and no rune cell is among the letters the page draws (`text`);
//   4. no narration recording covers the rune instruction, and none of the passage speaks the word;
// and then that the game takes the translated word when it is typed where the game asks for it.
// A place whose word is asked for somewhere this check does not go is reported as "not
// established", never as passed.
//
// How each place is reached. Sokal Keep is walked to from a new game: Rolf's tour, the pier, the
// boat, the remains, and on to the undead patrol that asks for the word. The other four are deep
// in the game (Valjevo Castle and Yarash's pyramid), so the check uses developer travel: the saved
// game made after Rolf's tour carries a copy of New Phlan's script, and the check rewrites that
// copy so that the party's next step runs the script's own "go to another area" instruction
// (SAVE x, y, facing; NEW ECL block). From there every key is a player's key and the game runs
// its own scripts. Where a place needs something done earlier in the game, the travel sets that
// one script variable and the place's entry below says so. This is a question about display, not
// about play: the level 1 party has not earned its way there.
//
// Screenshots of both displays are written to out/runes-readable/ (not committed).
// POR_RUNES_PLACES=sokal,pyramid runs only the places named, while working on one.
import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";
import { addReadyMadeParty, beginAdventuring, exploring, startGame } from "./acceptance/harness.mjs";

const [chromePath] = process.argv.slice(2);
if (!chromePath) throw new Error("Usage: verify-runes-readable.mjs <chrome-executable>");
const only = (process.env.POR_RUNES_PLACES ?? "").split(",").filter(Boolean);
const shots = resolve("out", "runes-readable");
mkdirSync(shots, { recursive: true });
const dir = mkdtempSync(join(process.env.POR_CAMPAIGN_OUTPUT_DIR ?? tmpdir(), "por-runes-"));
const wheel = JSON.parse(readFileSync(new URL("../src/codewheel/wheel.json", import.meta.url), "utf8"));
const manifest = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8"));
process.env.POR_TRACE_KEYS = "1";

/**
 * The glyph codes a word is written with (qa/research/code-wheel.md): an Espruar letter is two
 * glyphs, A is 01 02, B is 03 04 and so on with 1f to 21 skipped; a Dethek letter is one glyph,
 * A is 3a.
 */
function glyphs(alphabet, word) {
  return [...word].flatMap((letter) => {
    const index = letter.charCodeAt(0) - 65;
    if (alphabet === "dethek") return [0x3a + index];
    const first = 2 * index + 1 + (2 * index + 1 >= 0x1f ? 3 : 0);
    return [first, first + 1];
  });
}
/** A word of runes on screen: where its first glyph is, as a text cell (row * 40 + column). */
const written = (alphabet, word, row, column) => {
  const codes = glyphs(alphabet, word);
  return { alphabet, word, cells: codes.map((code, index) => [row * 40 + column + index, code]) };
};

const pressReturn = /(?:Press <enter>\/<return>|PRESS BUTTON OR <RETURN>) to continue\s*$/i;
const exploringMenu = /Area Cast View Encamp Search Look\s*$/;

/**
 * The places. `travel` is developer travel (see the top of this file): the archive and block of
 * the area's script, the square and facing (0 north, 1 east, 2 south, 3 west) the party arrives
 * on, and script variables set on the way. `reach` plays from the exploration menu to the screen
 * with the runes on it. `answer` then types the word where the game asks, and returns nothing
 * when the game took it or a sentence saying why that is not established.
 */
const places = [
  {
    id: "sokal", title: "Sokal Keep, the parchment on the remains", script: ["ecl-4", 21],
    runeInstructions: ["9bd8", "9bdd", "9be2"], passage: ["9b90", "9be6"],
    words: [written("espruar", "LUX", 5, 2), written("espruar", "SAMOSUD", 7, 1), written("espruar", "SHESTNI", 9, 1)],
    async reach(game) {
      // New Phlan: from the end of Rolf's tour at (0,4) past City Hall to the pier at (15,1).
      for (const heading of "EEEENEEEEEENENEEEE") await game.step(heading);
      await game.expect(/8,14 N/, "The boat lands the party at Sokal Keep, (8,14)");
      await game.step("N");
      await game.face("W");
      await game.key("ArrowUp");
      await game.key("ArrowUp");
      await game.expect(/SKELETON OF A LONG-DEAD ELF/, "The remains are at (6,13)");
      await game.key("Enter");
      await game.expect(/WHAT DO YOU DO\?.*LEAVE.*SEARCH.*ATTACK.*TALK/, "The remains offer Leave, Search, Attack, Talk");
      await game.key("End");
      await game.key("Enter");
      await game.expect(/CRUMBLING PARCHMENT SCROLL WITH THE WORDS/, "Search finds the parchment");
      await game.key("Enter");
      await game.expect(/THE LAST PART IS EATEN AWAY/, "The parchment's words are on screen");
    },
    async answer(game) {
      await game.key("Enter");
      await game.expect(exploringMenu, "The party is free to walk after the parchment");
      // To the undead patrol inside the gate, which asks for a word.
      // It meets the party on a roll of the dice at each step in the courtyard, so the party
      // walks in to (8,11) and paces there until it comes.
      const route = "EENN" + "WE".repeat(40);
      for (const heading of route) {
        if (/UNDEAD/i.test(await game.screenText())) break;
        await game.step(heading, { read: false });
        while (pressReturn.test(await game.screenText()) && !/UNDEAD/i.test(await game.screenText())) await game.key("Enter");
      }
      await game.expect(/PACK OF UNDEAD SUDDENLY APPEARS/i, "The undead patrol meets the party");
      for (let presses = 0; presses < 6 && !/\bParlay\b/i.test(await game.screenText()); presses++) await game.key("Enter");
      await game.expect(/\bParlay\b/i, "The patrol offers Parlay");
      await game.key("p");
      for (let presses = 0; presses < 4 && !/WHAT DO YOU SAY\?/i.test(await game.screenText()); presses++) await game.key("n");
      await game.expect(/WHAT DO YOU SAY\? \(TYPE A SINGLE WORD\)/i, "The patrol asks for a word");
      // The parchment's third word is the one the patrol takes on the way in. LUX is asked for
      // deeper in the keep, and SAMOSUD is the word for the way out.
      await game.type("shestni");
      await game.key("Enter");
      await game.expect(/THE UNDEAD LEAVE/i, "SHESTNI, typed to the undead patrol, is accepted");
    },
  },
  {
    // No runes on screen here: the printed Journal's Entry 35 gives the tribal friend-word as an
    // Espruar rune, a Dethek rune and the dashes path (SAVIOR, the wheel's question 9). The runner marks
    // the prompt (codeWheelHint) and the wheel comes up with those runes on its card.
    id: "friend-word", title: "The Lizardman Keep, the old lizard man's friend-word (Journal Entry 35)", script: ["ecl-8", 16],
    runeInstructions: [], passage: ["a049", "a0bd"], words: [],
    // Location 1 is (4,3). The old lizard man comes only to a party that freed his people (bit 1 of 4a52, ECL8 16 at 9f01).
    // The keep's script puts an arriving party at its gate, (0,4) facing east, whatever square it was sent to.
    travel: { archive: 8, block: 16, x: 0, y: 4, facing: 1, set: { 0x4a52: 1 } },
    async reach(game) {
      for (const heading of "EEEEN") {
        if (/OLD LIZARDMAN APPEARS/.test(await game.screenText())) break;
        await game.step(heading, { read: false });
        for (let presses = 0; presses < 6 && pressReturn.test(await game.screenText()) && !/OLD LIZARDMAN/.test(await game.screenText()); presses++) await game.key("Enter");
      }
      await game.expect(/OLD LIZARDMAN APPEARS/, "The old lizard man meets the party at (4,3)");
      for (let presses = 0; presses < 8 && !/\bParlay\b/i.test(await game.screenText()); presses++) await game.key("Enter");
      await game.key("p");
      for (let presses = 0; presses < 8 && !/WHAT IS IT\?/.test(await game.screenText()); presses++) {
        await game.key(/HAUGHTY|SLY|NICE|MEEK|ABUSIVE/i.test(await game.screenText()) ? "n" : "Enter");
      }
      await game.expect(/WHAT IS IT\?/, "The old lizard man asks for the friend-word");
    },
    async answer(game) {
      const card = await game.page('typeof codeWheel === "object" && codeWheel.question ? codeWheel.question.number : null');
      assert.equal(card, 9, "The wheel's card shows Journal Entry 35's runes and path (question 9)");
      await game.type("savior");
      await game.key("Enter");
      await game.expect(/DO YOU REALLY MEAN/, "The game asks to confirm the word");
      await game.key("y");
      await game.expect(/RECOGNIZES THE WORD/, "SAVIOR, read from the wheel, is accepted");
    },
  },
  {
    id: "pyramid", title: "Yarash's pyramid, the sign over the door", script: ["ecl-7", 23],
    runeInstructions: ["a46a"], passage: ["a408", "a480"],
    words: [written("dethek", "NOKNOK", 21, 1)],
    // Beside the door on the pyramid's lowest level; the sign is read on stepping east onto (1,1).
    travel: { archive: 7, block: 23, x: 0, y: 1, facing: 1 },
    async reach(game) {
      await game.key("ArrowUp");
      await game.expect(/SIX DWARVISH RUNES/, "The sign over the door is at (1,1)");
    },
    async answer(game) {
      await game.key("Enter");
      await game.expect(/YOU QUICKLY TRANSLATE THEM AND SAY/, "The game asks for the word at the door");
      await game.type("noknok");
      await game.key("Enter");
      await game.expect(/DO YOU REALLY MEAN NOKNOK/i, "The game repeats the word");
      await game.key("y");
      await game.expect(exploringMenu, "NOKNOK is accepted: the party is free to walk");
      assert.doesNotMatch(await game.printed(), /HIDDEN DOOR BURSTS OPEN/, "NOKNOK must not spring the trap");
    },
  },
  {
    id: "list", title: "Valjevo Castle, the guards' list of passwords", script: ["ecl-5", 4],
    runeInstructions: ["a478", "a490"], passage: ["a465", "a47d"],
    words: [written("espruar", "HARASH", 17, 22), written("dethek", "RHODIA", 19, 22)],
    // The list lies on the ground at (8,0) once the giants who carried it are dead (bit 16 of
    // script variable 4a66), and is found in search mode.
    travel: { archive: 5, block: 4, x: 7, y: 0, facing: 1, set: { 0x4a66: 16 } },
    async reach(game) {
      await game.key("s");
      await game.key("ArrowUp");
      await game.expect(/ON THE GROUND YOU FIND A PEACE OF PAPER/, "The list is on the ground at (8,0)");
      await game.key("Enter");
      await game.expect(/TODAY'S PASSWORD IS.*THE GATE PASSWORD IS/, "The list's two lines are on screen");
    },
    // RHODIA is asked for at the hedge gate: the "gate" place below types it there.
    notEstablished: "HARASH is asked for by the castle's patrols and posts when the party is disguised; this check does not go there",
  },
  {
    id: "slip", title: "Valjevo Castle, the freed slave's slip of paper", script: ["ecl-5", 4],
    runeInstructions: ["a964"], passage: ["a94c", "a97a"],
    words: [written("dethek", "RHODIA", 18, 1)],
    // Outside the kitchen door; the kitchen is entered by stepping north.
    travel: { archive: 5, block: 4, x: 15, y: 8, facing: 0 },
    async reach(game) {
      await game.key("ArrowUp");
      await game.expect(/REEKS OF SMOKE AND BURNED FOOD/, "The kitchen is at (15,7)");
      await game.key("Enter");
      await game.expect(/KILL THE OVERSEER AND FREE THE SLAVES/, "The kitchen offers to free the slaves");
      await game.key("Enter");
      for (const line of [/CUT THE OVERSEER'S THROAT/, /TEARS OF GRATITUDE/, /HE TAKES A SLIP OF PAPER/]) {
        await game.expect(line, "The freed slave's thanks");
        await game.key("Enter");
      }
      await game.expect(/YOU LOOK AT THE WRITING/, "The slip's writing is on screen");
    },
    notEstablished: "RHODIA is asked for at the hedge gate, in another area: the \"gate\" place types it there",
  },
  {
    id: "gate", title: "Valjevo Castle, Cadorna's slip of paper at the hedge gate", script: ["ecl-5", 3],
    runeInstructions: ["aa28"], passage: ["a9e8", "aa3e"],
    words: [written("dethek", "RHODIA", 20, 1)],
    // Before the hedge gate, with Cadorna released from his cell and walking with the party
    // (bit 2 of script variable 4a66). Arriving facing north loads this quarter of the castle.
    travel: { archive: 5, block: 3, x: 3, y: 7, facing: 0, set: { 0x4a66: 2 } },
    async reach(game) {
      await game.key("ArrowRight");
      await game.key("ArrowUp");
      await game.expect(/WHAT IS THE PASSWORD\?.*GIVE THE PASSWORD/, "A voice at the hedge gate asks for the password");
      await game.key("Enter");
      await game.expect(/CADORNA HANDS YOU A SLIP OF PAPER/, "Cadorna's slip is on screen");
    },
    async answer(game) {
      await game.key("Enter");
      await game.expect(/WHAT PASSWORD DO YOU GIVE/, "The gate asks for the word");
      await game.type("rhodia");
      await game.key("Enter");
      await game.expect(/ALL RIGHT, THEN\. PASS!/, "RHODIA, typed at the hedge gate, is accepted");
    },
  },
];

/** The word the wheel gives for the start-up question, read the way a player reads it. */
function readWheel({ espruar, dethek, path }) {
  const e = wheel.outer.runes.indexOf(espruar), k = wheel.inner.runes.indexOf(dethek);
  const { windows } = wheel.inner.paths.find(({ id }) => id === path);
  return windows.map((w, ring) => wheel.outer.rings[ring][(((w - k + e) % 36) + 36) % 36]).join("");
}

/** A saved game after Rolf's tour, made by playing: the six ready-made characters at (0,4), slot A. */
async function tourSave(directory) {
  const game = await startGame({ saves: directory, seconds: 300 });
  try {
    await addReadyMadeParty(game);
    await beginAdventuring(game);
    for (const key of ["e", "s", "a", "n", "e"]) await game.press(key);
    game.expect(exploring, "The party is free to walk after saving.");
  } finally {
    game.close();
  }
}

/**
 * Developer travel. A saved game holds the script of the area the party is in, at offset 0x1401
 * (src/runtime/bindings.ts). This writes a few instructions over the start of New Phlan's copy
 * and points the script's two walking entries at them, so the party's next step sets each script
 * variable asked for, the square and the facing, and runs NEW ECL: the game's own way of going to
 * another area, as the pier does for Sokal Keep. `archive` is the number of the ECLn.DAX file
 * that holds the block, which those scripts also set first.
 */
function travelSave(directory, { archive, block, x, y, facing, set = {} }) {
  const file = join(directory, "A.json");
  const slot = JSON.parse(readFileSync(file, "utf8"));
  const data = Buffer.from(slot.data, "base64");
  const scriptCopy = 0x1401, base = 0x9900, at = (address) => scriptCopy + address - base;
  // SAVE byte value, mem address.
  const save = (value, address) => [0x09, 0x00, value, 0x01, address & 255, address >> 8];
  const instructions = [
    ...save(archive, 0x6e12),
    ...Object.entries(set).flatMap(([address, value]) => save(value, Number(address))),
    ...save(x, 0xc04b), ...save(y, 0xc04c), ...save(facing, 0xc04d),
    0x20, 0x00, block, // NEW ECL byte block
  ];
  const start = 0x9914;
  assert.deepEqual([...data.subarray(at(base), at(base) + 2)], [0x01, 0x01], "The saved script must begin with its entry GOTOs");
  data.set(instructions, at(start));
  // The first two entries are the ones a step runs: GOTO mem start.
  for (const entry of [0, 1]) data.set([0x01, 0x01, start & 255, start >> 8], at(base + entry * 4));
  slot.data = data.toString("base64");
  writeFileSync(file, JSON.stringify(slot));
}

/** What the narration manifest holds for a place: problems as sentences, none when it is clean. */
function narrationProblems({ script: [archive, block], runeInstructions, passage, words }) {
  const source = (address) => `por.review.${archive}.block-${block}.at-${address}`;
  const problems = [];
  for (const address of runeInstructions) {
    const id = source(address);
    if (manifest.events.some((event) => event.sourceId === id) ||
        manifest.units.some((unit) => unit.triggerSourceId === id || unit.coveredSourceIds.includes(id))) {
      problems.push(`the narration manifest has an entry for the rune instruction at ${address}`);
    }
  }
  const prefix = `por.review.${archive}.block-${block}.at-`;
  const [from, to] = passage.map((address) => parseInt(address, 16));
  for (const unit of manifest.units) {
    const inPassage = unit.coveredSourceIds.some((id) => id.startsWith(prefix) &&
      parseInt(id.slice(prefix.length), 16) >= from && parseInt(id.slice(prefix.length), 16) <= to);
    for (const { word } of words) {
      if (inPassage && new RegExp(`\\b${word}\\b`, "i").test(unit.spokenText ?? "")) {
        problems.push(`narration unit ${unit.id} speaks ${word}: "${unit.spokenText}"`);
      }
    }
  }
  return problems;
}

/** Page code: an image's pixels, from a base64 PNG. */
const pixelsOf = `async (png) => {
  const image = new Image();
  image.src = "data:image/png;base64," + png;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const brush = canvas.getContext("2d");
  brush.drawImage(image, 0, 0);
  const { data } = brush.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, bright: (x, y) => {
    const at = (y * canvas.width + x) * 4;
    return data[at] * .299 + data[at + 1] * .587 + data[at + 2] * .114 > 110 ? "1" : "0";
  } };
}`;

/**
 * The rune cells of the game's own picture (the frame's 320 by 200 Classic picture, pixel for
 * pixel). For each cell: 64 characters, one for each pixel of the 8 by 8 glyph, "1" where it is bright.
 */
const gameInk = (cells) => `(async () => {
  const picture = await (${pixelsOf})(state.frame);
  return ${JSON.stringify(cells)}.map(cell => {
    let bits = "";
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += picture.bright(cell % 40 * 8 + x, Math.floor(cell / 40) * 8 + y);
    return bits;
  });
})()`;

/**
 * The rune cells of a photograph of the page, where `box` is the game picture in it. The page
 * enlarges the picture by a fraction (about 1.45) and the browser places it on whole pixels, so
 * where the picture's pixels fall is known only to within a pixel. Each cell is therefore sampled
 * with its origin moved by quarter pixels, up to three quarters each way: 49 strings of 64 characters.
 */
const photographInk = (png, box, cells) => `(async () => {
  const photograph = await (${pixelsOf})(${JSON.stringify(png.toString("base64"))});
  const box = ${JSON.stringify(box)};
  return ${JSON.stringify(cells)}.map(cell => {
    const samplings = [];
    const moves = [0, -.25, .25, -.5, .5, -.75, .75];
    for (const dy of moves) for (const dx of moves) {
      let bits = "";
      for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
        bits += photograph.bright(Math.floor(dx + box.x + (cell % 40 + (x + .5) / 8) / 40 * box.width),
          Math.floor(dy + box.y + (Math.floor(cell / 40) + (y + .5) / 8) / 25 * box.height));
      }
      samplings.push(bits);
    }
    return samplings;
  });
})()`;
/** How many of a glyph's 64 pixels a photograph gets wrong, at its best sampling. */
const wrongPixels = (glyph, samplings) => Math.min(...samplings.map((bits) => {
  let wrong = 0;
  for (let bit = 0; bit < 64; bit++) if (glyph[bit] !== bits[bit]) wrong++;
  return wrong;
}));

const results = [];
const base = join(dir, "tour-save");
mkdirSync(base);
await tourSave(base);

for (const place of places) {
  if (only.length && !only.includes(place.id)) continue;
  const result = { place, problems: [], reached: false, answered: undefined };
  results.push(result);
  const saves = join(dir, `${place.id}-saves`);
  cpSync(base, saves, { recursive: true });
  if (place.travel) travelSave(saves, place.travel);
  let leg = join(dir, place.id);
  let chrome;
  try {
    const open = () => openChromeCampaignLeg({ chromePath, directory: leg, checkpointDir: saves,
      bootKeys: "", startAt: "24000000", inputCompat: "" });
    // On a busy machine the game server or Chrome can miss its start-up limit of 30 seconds:
    // let the last leg's processes go and start again, four more times at most.
    for (let start = 1; !chrome; start++) {
      try {
        chrome = await open();
      } catch (error) {
        if (start === 5) throw error;
        await delay(5000);
        leg = join(dir, `${place.id}-start-${start + 1}`);
      }
    }
    const page = (expression) => chrome.evaluate(expression);
    const screenText = () => page(`(() => {
      const cells = Array(1000).fill(" ");
      for (const [cell, character] of state.text ?? []) cells[cell] = String.fromCharCode(character);
      return cells.join("").replace(/ +/g, " ");
    })()`);
    const until = async (what, expression, limit = 60_000) => {
      for (const deadline = Date.now() + limit; Date.now() < deadline; await delay(50)) {
        const value = await page(expression);
        if (value) return value;
      }
      throw new Error(`Timed out waiting for ${what}. The screen shows: ${await screenText()}`);
    };
    const busy = 'typeof codeWheel === "object" && codeWheel.busy';
    const settled = `(Boolean(state.stopped) || (state.ready && !posting && renderingSequence === undefined)) && !(${busy})`;
    const printedFrom = [];
    const game = {
      screenText,
      /** The page, for a place that checks the wheel's own state. */
      page,
      /** A real key press on the page, given once the page has dealt with the one before. */
      async key(name) {
        await until("the page to be ready for a key", settled);
        await page(`window.dispatchEvent(new KeyboardEvent("keydown", {
          key: ${JSON.stringify(name)}, bubbles: true, cancelable: true })), undefined`);
        await until(`the page to deal with ${name}`, settled);
        printedFrom.push(await screenText());
      },
      async type(word) { for (const letter of word) await game.key(letter); },
      /** Everything the screen has shown after a key, joined: for "this text never appeared". */
      printed: async () => printedFrom.join("\n"),
      /** Wait for the screen to show `pattern`; the message is what the check was looking for. */
      async expect(pattern, what) {
        for (const deadline = Date.now() + 30_000; Date.now() < deadline; await delay(50)) {
          if (pattern.test(await screenText()) && await page(settled)) return;
        }
        throw new Error(`${what}. The screen does not show ${pattern}: ${await screenText()}`);
      },
      facing: () => page('"N?E?S?W?"[state.exploration?.facing ?? -1]'),
      async face(heading) {
        for (let turns = 0; await game.facing() !== heading; turns++) {
          assert.ok(turns < 4, `The party could not turn to face ${heading}: ${await screenText()}`);
          await game.key("ArrowRight");
        }
      },
      /** Face a heading, walk one square, and answer "press return" until the party can walk again. */
      async step(heading, { read = true } = {}) {
        await game.face(heading);
        await game.key("ArrowUp");
        for (let presses = 0; read && pressReturn.test(await screenText()); presses++) {
          assert.ok(presses < 12, `The game kept asking for Return: ${await screenText()}`);
          await game.key("Enter");
        }
      },
    };

    // The title waits for one key; the start-up question follows and Enhanced requires the word.
    await chrome.nextFrame();
    await game.key(" ");
    await until("the code-wheel prompt", "state.ready && (Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion))");
    const asked = await page('typeof codeWheel === "object" && codeWheel.question ? codeWheel.question.number : state.codeWheelQuestion');
    const question = wheel.questions.find(({ number }) => number === asked);
    assert.ok(question, `The page asks question ${asked}, which is not one of the wheel's`);
    await game.type(readWheel(question).toLowerCase());
    await game.key("Enter");
    await delay(1000);
    await game.expect(/Load Saved Game/, "The right word reaches the main menu");
    await game.key("l");
    await game.key("a");
    await game.expect(exploringMenu, "Slot A loads the party after Rolf's tour");
    if (place.travel) {
      // Any step runs the rewritten script: the party turns round and walks east.
      await game.key("ArrowRight");
      await game.key("ArrowRight");
      await game.key("ArrowUp");
      const { x, y } = place.travel;
      // An arrival message ("YOU SENSE AN ANTI-MAGIC SHELL", at the Lizardman Keep) waits for Return.
      for (let presses = 0; presses < 6; presses++) {
        await until("the page to settle after travel", settled);
        if (!pressReturn.test(await screenText())) break;
        await game.key("Enter");
      }
      await until("developer travel to put the party on its square",
        `state.ready && state.exploration?.x === ${x} && state.exploration?.y === ${y}`, 30_000);
    }
    await place.reach(game);
    await until("the page to settle on the runes", settled);
    result.reached = true;

    // The wheel comes up by itself with runes on screen, beside them, and Escape puts it away and brings it back.
    const wheelUp = 'typeof codeWheelShown === "function" && codeWheelShown() && document.querySelector("#code-wheel").dataset.mode === "tool"';
    try {
      await until("the wheel to come up by itself beside the runes", wheelUp, 10_000);
      await game.key("Escape");
      if (await page(wheelUp)) result.problems.push("Escape did not put the wheel away");
      await game.key("Escape");
      if (!await page(wheelUp)) result.problems.push("Escape did not bring the wheel back");
    } catch (error) { result.problems.push(`With runes on screen the wheel did not come up: ${error.message.split("\n")[0]}`); }

    // The runes are on screen. Photograph the game picture in both displays.
    const cells = place.words.flatMap(({ cells }) => cells.map(([cell]) => cell));
    // Where the game picture is in the window, scrolled into it first: a photograph is of the window.
    const box = () => page(`(() => {
      const screen = document.querySelector("#screen");
      screen.scrollIntoView({ block: "start" });
      const { x, y, width, height } = screen.getBoundingClientRect();
      if (y < 0 || y + height > innerHeight || x < 0 || x + width > innerWidth) throw new Error("The game picture does not fit the window");
      return { x, y, width, height };
    })()`);
    const display = () => page("document.documentElement.dataset.presentation");
    const photograph = async (name) => {
      // Let a held portrait or a panel finish drawing.
      await delay(1500);
      await until("the page to finish drawing", settled);
      const where = await box();
      const png = await chrome.screenshot();
      writeFileSync(join(shots, `${place.id}-${name}.png`), png);
      return page(photographInk(png, where, cells));
    };
    assert.equal(await display(), "enhanced", "The leg plays in Enhanced display");
    const frame = JSON.parse(await page(`JSON.stringify({ text: state.text, runes: state.runes ?? null,
      portrait: state.portrait ?? null, scene: state.scene ?? null, art: state.art ?? null })`));
    const glyphInk = await page(gameInk(cells));
    const enhancedInk = await photograph("enhanced");
    await page('document.querySelector("#presentation").click(), undefined');
    await until("Classic display", 'document.documentElement.dataset.presentation === "classic"');
    const classicInk = await photograph("classic");
    await page('document.querySelector("#presentation").click(), undefined');
    await until("Enhanced display", 'document.documentElement.dataset.presentation === "enhanced"');
    result.picture = frame.portrait ?? frame.scene ?? frame.art;
    if (process.env.POR_RUNES_DEBUG) {
      for (const [index, cell] of cells.entries()) {
        console.log(`cell ${cell}: the game's glyph, Classic as photographed, Enhanced as photographed`);
        for (let y = 0; y < 8; y++) {
          console.log(`  ${[glyphInk[index], classicInk[index][0], enhancedInk[index][0]].map((bits) => bits.slice(y * 8, y * 8 + 8)).join("  ")}`);
        }
      }
    }

    const letters = new Map(frame.text.map(([cell, character]) => [cell, String.fromCharCode(character)]));
    const named = new Map((frame.runes ?? []).map(([cell, glyph]) => [cell, glyph]));
    for (const { alphabet, word, cells: wordCells } of place.words) {
      const faults = { blank: 0, classic: 0, differs: 0, letters: "", unnamed: 0, wrong: 0 };
      for (const [cell, code] of wordCells) {
        const index = cells.indexOf(cell);
        // A rune has at least four bright pixels, and a display shows it when its photograph
        // has the glyph's 64 pixels right but for two at most.
        if ((glyphInk[index].match(/1/g) ?? []).length < 4) faults.blank++;
        else if (wrongPixels(glyphInk[index], classicInk[index]) > 2) faults.classic++;
        if (wrongPixels(glyphInk[index], enhancedInk[index]) > 2) faults.differs++;
        if (letters.has(cell)) faults.letters += letters.get(cell);
        if (!named.has(cell)) faults.unnamed++;
        else if (named.get(cell) !== code) faults.wrong++;
      }
      const name = `${word} (${alphabet}, ${wordCells.length} cells)`;
      if (faults.blank) result.problems.push(`${name}: the game's picture has no rune in ${faults.blank} of its cells, so the check is not looking where the game wrote`);
      if (faults.classic) result.problems.push(`${name}: Classic does not show the game's rune in ${faults.classic} of its cells`);
      if (faults.differs) result.problems.push(`${name}: Enhanced does not show the game's rune in ${faults.differs} of its cells`);
      if (faults.letters) result.problems.push(`${name}: the page draws the letters "${faults.letters}" where the runes are`);
      if (faults.unnamed) result.problems.push(`${name}: the frame names no rune in ${faults.unnamed} of its cells`);
      if (faults.wrong) result.problems.push(`${name}: the frame names the wrong glyph in ${faults.wrong} of its cells`);
    }
    result.problems.push(...narrationProblems(place));

    if (place.answer) {
      try {
        await place.answer(game);
        result.answered = true;
      } catch (error) {
        result.answered = false;
        result.problems.push(`the word was not accepted: ${(error.cause?.message ?? error.message).split("\n")[0]}`);
      }
    }
  } catch (error) {
    result.problems.push(`${result.reached ? "failed at the place" : "the place was not reached"}: ${(error.cause?.message ?? error.message).split("\n")[0]} (diagnostics in ${leg})`);
  } finally {
    await chrome?.close();
  }
  const { problems } = result;
  console.log(`${problems.length ? "FAIL" : "pass"}  ${place.title}${place.travel ? " [developer travel]" : ""}`);
  for (const problem of problems) console.log(`      ${problem}`);
  if (result.reached) {
    console.log(`      picture shown with the runes: ${result.picture ?? "none"}`);
    console.log(`      typed word: ${result.answered === true ? "accepted" : result.answered === false ? "NOT accepted"
      : `not established (${place.notEstablished})`}`);
  }
}

const failed = results.filter(({ problems }) => problems.length);
const open = results.filter(({ place, reached }) => !reached || !place.answer);
console.log(`\n${results.length - failed.length} of ${results.length} places keep their runes readable in Enhanced display.`);
if (open.length) {
  console.log("Not established:");
  for (const { place, reached } of open) {
    console.log(`  ${place.title}: ${reached ? place.notEstablished : "the place was not reached"}`);
  }
}
console.log(`Screenshots: ${shots}\nDiagnostics: ${dir}`);
if (failed.length) process.exit(1);
