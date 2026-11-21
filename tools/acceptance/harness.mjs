// Acceptance harness: drive the translated game over a pipe, with no browser.
//
// It starts the runner (tools/boot-translated.ts) on a fresh save directory,
// gives it one key at a time with normal input, and reads the screen text and
// the party position from each POR_FRAME line. Every failure message carries
// the screen text, so a red test says what the game showed.
//
// The runner asks for a key at a blocking read, where the game waits for the
// player, and at a keyboard poll, where the game is drawing, pausing, or
// sitting in a menu and only looks whether a key is down. The frame does not
// say which kind it is. The harness answers a poll with ":travel-poll", which
// the runner accepts only at a poll: the game then carries on with no key.
// `settle` does that until the text on screen stops changing, so a test presses a
// key only when the game has finished what the last key started, and no test
// has to count presses.

import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

/** The version the port runs and the walkthroughs describe (GOG 1.3). */
const defaultGameData = "/Users/tsavo/por-assets/gog-1.3/POOLRAD";
const defaultAudio = "/Users/tsavo/por-assets/original";
/** What the runner prints when it is given something that is not a key at a blocking read. */
const refusal = /^Enter a letter, digit, arrow name/;

/** The 40 by 25 text screen of a frame, as 25 strings. */
export function screenRows(frame) {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return Array.from({ length: 25 }, (_, row) => cells.slice(row * 40, row * 40 + 40).join(""));
}

/** The text on screen with runs of spaces collapsed, as verify-input reads it. */
export function screenText(frame) {
  return screenRows(frame).join("").replace(/ +/g, " ").trim();
}

/** The bottom line of the screen, where the game puts its menu. */
export function menuLine(frame) {
  return screenRows(frame)[24].replace(/ +/g, " ").trim();
}

/**
 * Where the party stands and the game clock, read from the status line the game draws under the
 * party list ("15,1 W 00:00"): { x, y, facing, hour, minute }, or undefined when it is not drawn.
 * The frame's own `exploration` field is the script's saved square, which is one move behind
 * while a move's event is still on screen, so the line the player sees is used instead.
 */
export function position(frame) {
  for (const row of screenRows(frame)) {
    // "camping" or "search" follows the clock while the party camps or searches.
    const match = /^\s*(\d+),(\d+) ([NESW]) (\d\d):(\d\d)(?: (\w+))?\s*$/.exec(row);
    if (match) return { x: +match[1], y: +match[2], facing: match[3], hour: +match[4], minute: +match[5], mode: match[6] };
  }
}

/** The party list as the game draws it: [{ name, ac, hp }]. */
export function party(frame) {
  const rows = screenRows(frame);
  const header = rows.findIndex((row) => /Name\s+AC\s+HP/.test(row));
  const members = [];
  for (let row = header + 1; header >= 0 && row < rows.length; row++) {
    const match = /^\s*(\S.*?)\s+(-?\d+)\s+(\d+)\s*$/.exec(rows[row]);
    // The party menu leaves a blank row under the heading; the list ends at the first other row.
    if (!match && !members.length && !rows[row].trim()) continue;
    if (!match) break;
    members.push({ name: match[1], ac: +match[2], hp: +match[3] });
  }
  return members;
}

/**
 * The party member the game has highlighted, by name. The game draws that name in white
 * (colour 15) and the others in another colour. Undefined when no single name is white.
 */
export function highlighted(frame) {
  const rows = screenRows(frame);
  const white = new Set();
  for (const [cell, , colour] of frame.text) if (colour === 15) white.add(Math.floor(cell / 40));
  const found = party(frame).map(({ name }) => name)
    .filter((name) => rows.some((row, index) => white.has(index) && row.trim().startsWith(name)));
  return found.length === 1 ? found[0] : undefined;
}

/** The coins on a character sheet the game is showing: { Platinum: 2, Silver: 36, ... }. */
export function coins(frame) {
  const found = {};
  const sheet = screenRows(frame).join("\n");
  for (const [, kind, count] of sheet.matchAll(/\b(Copper|Silver|Electrum|Gold|Platinum|Gems|Jewelry) +(\d+)/g)) found[kind] = +count;
  return found;
}

const headings = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
/** The menu the game shows while the party is free to walk. */
export const exploring = /Area Cast View Encamp Search Look\s*$/;
/** The game's "press a key to go on" line. */
export const pressReturn = /Press <enter>\/<return> to continue\s*$/;

/**
 * Start the game. Options:
 *   pregen  stage SSI's six ready-made characters (default true)
 *   saves   a save directory to reuse; by default a fresh one that close() deletes
 *   env     extra environment for the runner
 *   seconds kill the runner after this long (default 240)
 */
export async function startGame({ pregen = true, saves, env = {}, seconds = 240 } = {}) {
  const ownSaves = saves === undefined;
  const directory = saves ?? mkdtempSync(join(tmpdir(), "por-acceptance-"));
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: {
      POR_GAMEDATA: defaultGameData, POR_AUDIO_DIR: defaultAudio, ...process.env,
      POR_PREGEN_PARTY: pregen ? "1" : "", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: directory, POR_TRACE_KEYS: "1",
      POR_JOURNAL_PROFILE: "", POR_BOOT_KEY_FILE: "", POR_INPUT_COMPAT: "", POR_CLOCK: "fixed",
      // The same start as verify-input: one Enter leaves the title, then every key comes from the test.
      POR_BOOT_KEYS: "31000000:1c0d", POR_LIVE_AT: "50000000", POR_BOOT_STEPS: "450000000", ...env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let errors = "";
  let discarded = 0;
  const texts = [];
  const dice = [];
  createInterface({ input: runner.stderr }).on("line", (line) => {
    const draw = /^POR_DICE \d+ (.+) range (\d+)$/.exec(line);
    if (draw) dice.push({ caller: draw[1], range: +draw[2] });
    else if (/^POR_KEY .* discarded$/.test(line)) discarded++;
    else if (!line.startsWith("POR_KEY ")) errors += line + "\n";
  });
  const lines = createInterface({ input: runner.stdout })[Symbol.asyncIterator]();
  const timer = setTimeout(() => runner.kill(), seconds * 1000);
  const game = {
    /** The last frame the runner sent. */
    frame: undefined,
    /** The save directory in use. */
    saves: directory,
    /** Every string the game has printed through its script text routine, in order. */
    printed: texts,
    /**
     * With env POR_TRACE_DICE=1: every random number the game has drawn so far, as { caller, range }.
     * The trace gives the range asked for, not the number drawn. It comes on the runner's other
     * pipe, so this waits a moment for lines still on their way.
     */
    async dice() {
      await new Promise((resolve) => setTimeout(resolve, 50));
      return dice;
    },
    /** Key presses the runner threw away because the game was only emptying its buffer. Must stay 0. */
    get discarded() { return discarded; },
    text: () => screenText(game.frame),
    rows: () => screenRows(game.frame),
    menu: () => menuLine(game.frame),
    position: () => position(game.frame),
    party: () => party(game.frame),
    fail(message) {
      throw new Error(`${message}\nThe screen shows:\n${game.rows().map((row) => row.trimEnd()).filter(Boolean).join("\n")}`);
    },
    /** Send one line to the runner. Returns true when the game went on to a new frame, false when it refused the line. */
    async send(command) {
      // The runner answers every line with exactly one frame or one refusal. `undefined` sends
      // nothing and reads the frame the runner prints by itself when it first asks for a key.
      if (command !== undefined) runner.stdin.write(command + "\n");
      for (;;) {
        const { value, done } = await lines.next();
        if (done) throw new Error(`The game stopped after ${JSON.stringify(command)}.\n${errors}\nLast screen:\n${game.frame ? game.text() : "(none)"}`);
        if (value.startsWith("POR_FRAME ")) {
          game.frame = JSON.parse(value.slice("POR_FRAME ".length));
          return true;
        }
        if (value.startsWith("POR_TEXT ")) texts.push(JSON.parse(value.slice("POR_TEXT ".length)).message);
        if (refusal.test(value)) return false;
      }
    },
    /**
     * Let the game run until it waits for the player. Every keyboard poll is answered with no key.
     * Stops at a blocking read, when `until` matches the screen, or when the text on screen has
     * stayed the same for `quiet` polls in a row (a menu polls the keyboard for as long as it
     * waits). The text is compared, not the picture: some menus sit beside a moving picture.
     */
    async settle({ until, quiet = 3, limit = 120 } = {}) {
      for (let polls = 0, same = 0; ; polls++) {
        if (until?.test(game.text())) return game.frame;
        if (polls >= limit) game.fail(`The text on screen was still changing after ${limit} keyboard polls${until ? ` without showing ${until}` : ""}.`);
        const before = game.rows().join("\n");
        if (!await game.send(":travel-poll")) return game.frame;
        same = game.rows().join("\n") === before ? same + 1 : 0;
        if (same >= quiet && !until) return game.frame;
      }
    },
    /** Press one key and return the frame the game shows when it next waits for the player. */
    async press(key, expected, why = "") {
      if (!await game.send(key)) game.fail(`The runner does not know the key ${JSON.stringify(key)}.`);
      await game.settle();
      // POR_ACCEPTANCE_TRACE=1 prints every key and the screen that followed, for writing a new test.
      if (process.env.POR_ACCEPTANCE_TRACE === "1") console.error(`[${key}]\n${game.rows().map((row) => row.trimEnd()).filter(Boolean).join("\n")}`);
      if (expected &&!expected.test(game.text())) game.fail(`${why}\nAfter one press of ${key} the screen does not show ${expected}.`.trim());
      return game.frame;
    },
    /** Press `key` until the screen matches `pattern`. Fails after `limit` presses. `key` may be a function of the screen text. */
    async pressUntil(key, pattern, limit = 40) {
      for (let presses = 0; !pattern.test(game.text()); presses++) {
        if (presses >= limit) game.fail(`${limit} presses did not reach ${pattern}.`);
        await game.press(typeof key === "function" ? key(game.text()) : key);
      }
      return game.frame;
    },
    /**
     * In a menu that asks for a party member ("WHO WILL PAY? Select"), move the highlight to the
     * member whose name starts with `name`. Only for such a menu: after it closes the game leaves
     * the white name on screen although its current character is another one.
     */
    async highlight(name) {
      for (let moves = 0; !highlighted(game.frame)?.startsWith(name); moves++) {
        if (moves >= 8) game.fail(`Could not highlight ${name} in the party list.`);
        await game.press("end");
      }
    },
    /**
     * From a menu that has View (walking, camp, a shop), read every member's coins from the
     * character sheets: { name: { Platinum: n, ... } }. Leaves the game on the same menu.
     * Each sheet is filed under the name the sheet itself shows, and the next member is chosen
     * with End, until every member of the party has been read.
     */
    async purses() {
      const menu = game.menu();
      if (!/\bView\b/.test(menu)) game.fail("This menu has no View to read the character sheets with.");
      const names = game.party().map(({ name }) => name);
      const purses = {};
      for (let views = 0; Object.keys(purses).length < names.length; views++) {
        if (views >= names.length * 2) game.fail(`Could not read the sheets of ${names.filter((name) => !(name in purses)).join(", ")}.`);
        await game.press("v", /View: ?Items/, "V shows a character sheet.");
        const name = game.rows().find((row) => row.trim()).trim();
        if (!names.includes(name)) game.fail(`The sheet is headed "${name}", which is not a member of the party.`);
        purses[name] = coins(game.frame);
        await game.press("e");
        if (game.menu() !== menu) game.fail(`Leaving ${name}'s character sheet did not return to "${menu}".`);
        await game.press("end");
      }
      return purses;
    },
    /** Turn until the party faces N, E, S or W. */
    async face(heading) {
      for (let turns = 0; game.position()?.facing !== heading; turns++) {
        if (!game.position()) game.fail(`Cannot turn to face ${heading}: the game is not showing the party's position.`);
        if (turns >= 4) game.fail(`Four turns did not face the party ${heading}.`);
        await game.press("right");
      }
    },
    /** Face a heading and walk one square that way. Fails unless the party arrives on that square. */
    async step(heading) {
      await game.face(heading);
      const from = game.position();
      await game.press("up");
      const to = game.position();
      const [dx, dy] = headings[heading];
      if (!to || to.x !== from.x + dx || to.y !== from.y + dy) {
        game.fail(`One step ${heading} from ${from.x},${from.y} did not reach ${from.x + dx},${from.y + dy}.`);
      }
      return game.frame;
    },
    /** Walk a route such as "EENW", one square for each letter. Each square must be reached. */
    async walk(route) {
      for (const heading of route) await game.step(heading);
      return game.frame;
    },
    /** Require the screen to match. */
    expect(pattern, why = "") {
      if (!pattern.test(game.text())) game.fail(`${why}\nThe screen does not show ${pattern}.`.trim());
    },
    /** Stop the runner and delete the save directory this game made. */
    close() {
      clearTimeout(timer);
      runner.kill();
      if (ownSaves) rmSync(directory, { recursive: true, force: true });
    },
  };
  await game.send(undefined);
  return game;
}

/**
 * From the first menu, add ready-made characters to the party until `size` are in it.
 * The Add list marks each added character with "*" and closes itself when none is left.
 */
export async function addReadyMadeParty(game, size = 6) {
  game.expect(/Add Character to Party/, "The game must be at its first menu.");
  await game.press("a", /Add a character: Add Exit/, "A opens the list of characters to add.");
  const marked = () => (game.text().match(/\* \w+/g) ?? []).length;
  const listOpen = () => /Add a character: Add Exit/.test(game.text());
  while (listOpen() && marked() < size) {
    const before = marked();
    await game.press("a");
    if (!listOpen()) break;
    if (marked() !== before + 1) game.fail("A did not add the highlighted character.");
    // The highlight stays on the character just added: move to the next one.
    if (marked() < size) await game.press("end");
  }
  if (/Add a character: Add Exit/.test(game.text())) await game.press("e");
  game.expect(/BEGIN Adventuring/, "The party menu must follow the Add list.");
  if (game.party().length !== size) game.fail(`The party has ${game.party().length} characters, not ${size}.`);
}

/**
 * Begin adventuring and go through whatever the opening shows until the party is free to walk.
 * Answers "Press <enter>" with Enter and nothing else. Returns the texts the game printed on the way.
 */
export async function beginAdventuring(game) {
  const from = game.printed.length;
  await game.press("b");
  for (let presses = 0; !exploring.test(game.text()); presses++) {
    if (presses >= 40 || !pressReturn.test(game.text())) game.fail("The opening did not reach the exploration menu.");
    await game.press("enter");
  }
  return game.printed.slice(from);
}
