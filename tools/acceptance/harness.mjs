// Acceptance harness: drive the translated game over a pipe, with no browser.
//
// It starts the runner (tools/boot-translated.ts) on a fresh save directory,
// gives it one key at a time with normal input, and reads the screen text and
// the party position from each POR_FRAME line. Every failure message carries
// the screen text, so a red test says what the game showed.
//
// The runner asks for a key at a blocking read and at every keyboard poll. Each
// frame says which it was (`prompt`: "read" or "poll") and whether the game is
// waiting for the player there (`awaitsKey`): at a blocking read, and at the poll
// inside the game's menu routine, which loops on it for as long as a menu or a
// "press return" line is up. Every other poll is one look at the keyboard from
// code that carries on by itself: a fight being played out, a rest, a pause.
// The harness answers those with ":travel-poll", which the runner accepts only
// at a poll: the game then carries on with no key. `settle` does that until the
// game waits for the player, so a test presses a key only when the game has
// finished what the last key started, and no test has to count presses.

import { spawn } from "node:child_process";
import { appendFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
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

/**
 * What a pause put on screen (POR_PAUSE's `text`, [cell, character] pairs) that the page did not
 * already show in `before`, the frame that ended the previous input: the message (#81).
 */
export function pauseMessage(pause, before) {
  const cells = new Map((before?.text ?? []).map(([cell, character]) => [cell, character]));
  return pause.text.filter(([cell, character]) => character > 32 && cells.get(cell) !== character);
}

/**
 * Whether a pause's message reached the page: every glyph of it, at its cell, in one of the frames
 * the runner sent with, or as, the frame that ends this input (#81).
 */
export function pauseShown(message, frame) {
  return pauseMissing(message, frame).length === 0;
}

/** The glyphs of a pause's message that the frame showing the most of it lacks. */
export function pauseMissing(message, frame) {
  let best = message;
  for (const shown of [...(frame.animation ?? []), frame]) {
    const cells = new Map((shown.text ?? []).map(([cell, character]) => [cell, character]));
    const missing = message.filter(([cell, character]) => cells.get(cell) !== character);
    if (missing.length < best.length) best = missing;
  }
  return best;
}

/** The text on screen with runs of spaces collapsed, as verify-input reads it. */
export function screenText(frame) {
  return screenRows(frame).join("").replace(/ +/g, " ").trim();
}

/**
 * Everything a frame shows the player, as one string: the text with its colours, both pictures,
 * the artwork placed on them (a fight's aim highlight among it) and where the party stands. Two
 * frames with the same look show the same screen. From the port's own data the Classic picture is
 * blank, so Aim's Next from one orc to another at the same range changes only the Enhanced
 * picture and the highlight. The pictures the game showed on the way (`animation`) are not part
 * of the screen it stops on; `flashed` keeps its messages.
 */
function look(frame) {
  const { animation, ...shown } = frame ?? {};
  return JSON.stringify(shown);
}

/** The bottom line of the screen, where the game puts its menu. */
export function menuLine(frame) {
  return screenRows(frame)[24].replace(/ +/g, " ").trim();
}

/**
 * Where the party stands and the game clock, read from the status line the game draws under the
 * party list ("15,1 W 00:00"): { x, y, facing, hour, minute }, or undefined when it is not drawn.
 * This is what the player reads. The game redraws the line when it redraws the party list, so
 * right after the party changes area the line can still show the square it left; `square` reads
 * the game's own position and has no such delay.
 */
export function position(frame) {
  for (const row of screenRows(frame)) {
    // "camping" or "search" follows the clock while the party camps or searches.
    const match = /^\s*(\d+),(\d+) ([NESW]) (\d\d):(\d\d)(?: (\w+))?\s*$/.exec(row);
    if (match) return { x: +match[1], y: +match[2], facing: match[3], hour: +match[4], minute: +match[5], mode: match[6] };
  }
}

/**
 * The square the party stands on and the way it faces, from the game's own live position as the
 * frame reports it: { area, x, y, facing }, or undefined when the party is not walking a map.
 */
export function square(frame) {
  const where = frame.exploration;
  return where && { area: where.area, x: where.x, y: where.y, facing: "N?E?S?W?"[where.facing] };
}

/**
 * The party list as the game draws it: [{ name, ac, hp, hurt }]. `hurt` is true where the game
 * draws the hit points in yellow (colour 14) and not in green: the manual (p.8, p.13) says the hit
 * points of a character with damage that has not been healed are highlighted. The list shows no
 * maximum, so this is how a player sees who needs healing.
 */
export function party(frame) {
  const rows = screenRows(frame);
  const header = rows.findIndex((row) => /Name\s+AC\s+HP/.test(row));
  const members = [];
  for (let row = header + 1; header >= 0 && row < rows.length; row++) {
    const match = /^\s*(\S.*?)\s+(-?\d+)\s+(\d+)\s*$/.exec(rows[row]);
    // The party menu leaves a blank row under the heading; the list ends at the first other row.
    if (!match && !members.length && !rows[row].trim()) continue;
    if (!match) break;
    // The colour of the last character of the row: the last digit of the hit points.
    const last = row * 40 + rows[row].trimEnd().length - 1;
    const colour = frame.text.find(([cell]) => cell === last)?.[2];
    members.push({ name: match[1], ac: +match[2], hp: +match[3], hurt: colour === 14 });
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

/**
 * The row of a list the game has highlighted: the index of the one row from `first` to `last`
 * that is drawn in white (colour 15), or undefined when no single row is.
 */
function whiteRow(frame, first, last) {
  const white = new Set();
  for (const [cell, character, colour] of frame.text) if (colour === 15 && character > 32) white.add(Math.floor(cell / 40));
  const rows = [...white].filter((row) => row >= first && row <= last);
  return rows.length === 1 ? rows[0] : undefined;
}

/**
 * A character's Items screen, as the game draws it: [{ name, ready, selected }] in list order.
 * `ready` is the game's own Yes or No in the Ready column; `selected` marks the highlighted row.
 * Undefined when the screen is not an Items screen.
 */
export function items(frame) {
  const rows = screenRows(frame);
  const header = rows.findIndex((row) => /^\s*Ready Item\s*$/.test(row));
  if (header < 0) return undefined;
  const white = whiteRow(frame, header + 1, 23);
  const found = [];
  for (let row = header + 1; row < 24; row++) {
    const match = /^\s*(Yes|No)\s+(\S.*?)\s*$/.exec(rows[row]);
    if (match) found.push({ name: match[2], ready: match[1] === "Yes", selected: row === white });
  }
  return found;
}

/**
 * What a character sheet the game is showing says: { name, classes, level, exp, ac, hp, status,
 * weapon, armor }, or undefined when no sheet is up. `hp` is the number after "HP" (what the
 * character has now) and `status` the word after "Status" (Okay, Unconscious, Dying, Dead, ...).
 */
export function sheet(frame) {
  const rows = screenRows(frame).map((row) => row.trim());
  const text = rows.join("\n");
  const status = /^Status (.+)$/m.exec(text);
  const hp = /^HP (-?\d+)\b/m.exec(text);
  if (!status || !hp) return undefined;
  const filled = rows.filter(Boolean);
  const level = /^Level ([\d/]+)\s+Exp (\d+)/m.exec(text);
  return {
    name: filled[0], classes: filled[3], level: level?.[1], exp: level ? +level[2] : undefined,
    ac: +(/^AC (-?\d+)/m.exec(text)?.[1] ?? NaN), hp: +hp[1], status: status[1].trim(),
    weapon: /^Weapon (.+)$/m.exec(text)?.[1].trim(), armor: /^Armor (.+)$/m.exec(text)?.[1].trim(),
  };
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

// Fights. The game's own words, from its fight screens and from the text of GAME.OVR.
/**
 * A combatant's command menu. Cast and Turn are there only for a character who can, and Use only
 * for one who carries something: a magic-user who has thrown her darts sees "Move View Aim Quick Done".
 */
export const combatMenu = /Move View Aim (?:Use )?(?:Cast )?(?:Turn )?Quick Done\s*$/;
/** The menu of the Aim command. Target is offered only for a combatant the attacker can reach. */
export const aimMenu = /Aim:Next Prev Manual (?:Target )?Center Exit\s*$/;
/** Asked on a turn when no enemy is left that can still fight or be seen. No ends the fight. */
export const continueBattle = /Continue Battle:Yes No\s*$/;
/** How a fight ends, by the sentence the game shows. */
const fightEnds = [
  ["won", /The party has won\./],
  ["fled", /The party has fled\./],
  ["lost", /The entire party is killed!|the party has been destroyed/],
];

/**
 * The combatant the fight screen describes in its right-hand panel: the one whose turn it is, or
 * under Aim the one aimed at. { name, hp, ac, weapon, range }, or undefined outside a fight.
 * `range` is the distance Aim prints ("Range = 2"), undefined when Aim is not open.
 */
export function combatant(frame) {
  const rows = screenRows(frame);
  const at = rows.findIndex((row) => /^\s{20,}Hitpoints \d+\s*$/.test(row));
  if (at < 1) return undefined;
  const column = rows[at].search(/\S/);
  // The panel's lines from the top, blank rows left out: the name, the hit points, the armor
  // class, then what is in hand. The menu line below the panel is not part of it.
  const panel = rows.slice(0, 24).map((row) => row.slice(column).trim()).filter(Boolean);
  const hitpoints = panel.findIndex((line) => /^Hitpoints \d+$/.test(line));
  const range = /Range = (\d+)/.exec(rows.join("\n"));
  return {
    name: panel[hitpoints - 1], hp: +panel[hitpoints].slice("Hitpoints ".length),
    ac: +(/^AC (-?\d+)$/.exec(panel[hitpoints + 1] ?? "")?.[1] ?? NaN),
    weapon: panel.slice(hitpoints + 2).join(" "), range: range ? +range[1] : undefined,
  };
}

/**
 * Start the game. Options:
 *   pregen  stage SSI's six ready-made characters (default true)
 *   saves   a save directory to reuse; by default a fresh one that close() deletes
 *   env     extra environment for the runner
 *   seconds kill the runner after this long (default 240)
 *   watch   script variables whose values each frame reports, as numbers (0x4900 to 0x4cff): see `variable`
 */
export async function startGame({ pregen = true, saves, env = {}, seconds = 240, watch = [] } = {}) {
  const ownSaves = saves === undefined;
  const directory = saves ?? mkdtempSync(join(tmpdir(), "por-acceptance-"));
  // POR_PAUSE_LOG=<file.jsonl>: at close, append every pause with text on screen and whether that
  // text reached the page, as the evidence for npm run qa:pause-callers (tools/record-pause-callers.mjs, #81).
  const setting = (name) => env[name] ?? process.env[name];
  const pauseLog = setting("POR_PAUSE_LOG");
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: {
      POR_GAMEDATA: defaultGameData, POR_AUDIO_DIR: defaultAudio, ...process.env,
      POR_PREGEN_PARTY: pregen ? "1" : "", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: directory, POR_TRACE_KEYS: "1",
      POR_JOURNAL_PROFILE: "", POR_BOOT_KEY_FILE: "", POR_INPUT_COMPAT: "", POR_CLOCK: "fixed",
      // The same start as verify-input: one Enter leaves the title, then every key comes from the test.
      POR_BOOT_KEYS: "31000000:1c0d", POR_LIVE_AT: "50000000", POR_BOOT_STEPS: "450000000",
      POR_WATCH_ECL: watch.map((address) => address.toString(16)).join(","),
      // The fight's highlight, as the Enhanced display places it (nativeSelectionKey in
      // tools/native-combat-selection.ts). From the port's own data the frame has no other picture
      // of the battlefield, and without it Aim's Next between two alike monsters would look like a
      // swallowed key to `press`.
      POR_COMBAT_SELECTION_KEYS: "combat-selection:COMSPR.DAX:25", ...(pauseLog ? { POR_TRACE_PAUSES: "1" } : {}), ...env,
    },
    stdio: ["pipe", "pipe", "pipe"],
  });
  let errors = "";
  let discarded = 0;
  const texts = [];
  const narrations = [];
  // The names on the last party list the game showed: a fight screen has no such list.
  let friends = [];
  const flashed = [];
  const pauses = [];
  let pendingPauses = [];
  const dice = [];
  createInterface({ input: runner.stderr }).on("line", (line) => {
    const draw = /^POR_DICE \d+ (.+) range (\d+)(?: value (\d+))?$/.exec(line);
    if (draw) dice.push({ caller: draw[1], range: +draw[2], value: draw[3] === undefined ? undefined : +draw[3] });
    else if (/^POR_KEY .* discarded$/.test(line)) discarded++;
    // A key POR_SWALLOW_KEY made the runner swallow: say so, as a test of that is reading.
    else if (/^POR_KEY .* swallowed /.test(line)) console.error(line);
    else if (!line.startsWith("POR_KEY ")) errors += line + "\n";
  });
  const lines = createInterface({ input: runner.stdout })[Symbol.asyncIterator]();
  const timer = setTimeout(() => runner.kill(), seconds * 1000);
  const game = {
    /** The last frame the runner sent. */
    frame: undefined,
    /** Set to take the characters back from Quick in the fights that follow: see `settle`. */
    byHand: false,
    /** The save directory in use. */
    saves: directory,
    /** Every string the game has printed through its script text routine, in order. */
    printed: texts,
    /** Every narration event the runner has reported, in order: { sourceId, ... } as the narration observer names it. */
    narrated: narrations,
    /**
     * Every message the game has put on the bottom line for a moment and cleared again by itself,
     * in order: { text, ms }. "Must be Readied" and "Your hands are full!" are shown this way: the
     * game pauses `ms` milliseconds on them and asks for no key, so no screen a test stops on has them.
     */
    flashed,
    /**
     * With env POR_TRACE_PAUSES=1: every pause through the game's pause routine, in order, as
     * { returns, via, ms, text, message, rows, shown }: where the call that paused returns to
     * (`slice 19 +1bbd` or `exe 2d1c`), whether it came through a message routine, the text on screen
     * ([cell, character] pairs), what of it the page did not already show (`pauseMessage`, also as
     * rows), and whether that reached the page (`pauseShown`).
     */
    pauses,
    /**
     * With env POR_TRACE_DICE=1: every random number the game has drawn so far, as
     * { caller, range, value }: who asked, for a number from 0 to range - 1, and the number the
     * game's Random returned. The trace comes on the runner's other pipe, so this waits a moment
     * for lines still on their way.
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
    square: () => square(game.frame),
    /** Where the party is: the game's live square, or the status line while a picture hides the map view. */
    here: () => square(game.frame) ?? position(game.frame),
    party: () => party(game.frame),
    /**
     * The value of a script variable named in `watch`, as the game holds it now. The scripts keep
     * their lasting state in these (which fights are won, how far a block is cleared), and most of
     * it never reaches the screen. Undefined before a game is in play.
     */
    variable(address) {
      if (!watch.includes(address)) throw new Error(`Script variable ${address.toString(16)} is not in this game's watch list.`);
      return game.frame.scriptVariables?.[address.toString(16)];
    },
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
          const before = game.frame;
          game.frame = JSON.parse(value.slice("POR_FRAME ".length));
          const listed = party(game.frame);
          if (listed.length) friends = listed.map(({ name }) => name);
          for (const shown of game.frame.animation ?? []) {
            if (shown.statusMessage) flashed.push({ text: menuLine(shown), ms: shown.durationMs });
          }
          for (const pause of pendingPauses) {
            const message = pauseMessage(pause, before);
            const asRows = (glyphs) => screenRows({ text: glyphs }).map((row) => row.trimEnd()).filter(Boolean);
            const missing = pauseMissing(message, game.frame);
            pauses.push({ ...pause, message, rows: asRows(message), shown: missing.length === 0, missing: asRows(missing) });
          }
          pendingPauses = [];
          return true;
        }
        if (value.startsWith("POR_PAUSE ")) pendingPauses.push(JSON.parse(value.slice("POR_PAUSE ".length)));
        if (value.startsWith("POR_TEXT ")) texts.push(JSON.parse(value.slice("POR_TEXT ".length)).message);
        if (value.startsWith("POR_NARRATION ")) narrations.push(JSON.parse(value.slice("POR_NARRATION ".length)));
        // The runner reports where the translation stopped on this pipe ("entry: ..."): keep it for the failure.
        if (value.startsWith("entry:")) errors += value + "\n";
        if (refusal.test(value)) return false;
      }
    },
    /**
     * Let the game run until it waits for the player: until the frame says `awaitsKey`. Every
     * other keyboard poll is answered with no key. With `until`, stops as soon as the screen
     * matches, and fails if the game comes to wait for a key on a screen that does not.
     *
     * The frame says when the game waits, so nothing here compares screens. The earlier rule, "the
     * text stayed the same for three polls", is gone: no place was found that still needs it.
     *
     * While `game.byHand` is set, a poll the game makes while it moves a character by itself in a
     * fight (the bottom line then reads "Move/Attack, Move Left = n") is answered with Space: the
     * Quick Reference Card's "<Space>: Resets all characters to manual control". A character once
     * given to Quick stays with the computer from fight to fight until that key.
     */
    async settle({ until, limit = 3000 } = {}) {
      for (let polls = 0; ; polls++) {
        if (until?.test(game.text())) return game.frame;
        if (game.frame.awaitsKey) {
          if (until) game.fail(`The game is waiting for a key and does not show ${until}.`);
          return game.frame;
        }
        if (polls >= limit) game.fail(`The game was still running by itself after ${limit} keyboard polls${until ? ` without showing ${until}` : ""}.`);
        const takeControl = game.byHand && /^Move\/Attack, Move Left = \d+$/.test(menuLine(game.frame));
        if (!await game.send(takeControl ? "space" : ":travel-poll")) game.fail("The runner refused to go on at a frame that does not wait for a key.");
      }
    },
    /**
     * Press one key and return the frame the game shows when it next waits for the player.
     * Every key is one input: a press after which the game shows exactly what it showed before
     * (the same `look`, and nothing printed, narrated or flashed on the way) was swallowed, and
     * fails. So no loop of presses here can make up for a swallowed key by pressing again (#76).
     */
    async press(key, expected, why = "") {
      const before = { look: look(game.frame), printed: texts.length, narrated: narrations.length, flashed: flashed.length };
      if (!await game.send(key)) game.fail(`The runner does not know the key ${JSON.stringify(key)}.`);
      await game.settle();
      // POR_ACCEPTANCE_TRACE=1 prints every key and the screen that followed, for writing a new test.
      if (process.env.POR_ACCEPTANCE_TRACE === "1") console.error(`[${key}]\n${game.rows().map((row) => row.trimEnd()).filter(Boolean).join("\n")}`);
      if (look(game.frame) === before.look && texts.length === before.printed && narrations.length === before.narrated &&
        flashed.length === before.flashed) {
        game.fail(`${why}\nThe game swallowed ${JSON.stringify(key)}: after the press it shows what it showed before.`.trim());
      }
      if (expected &&!expected.test(game.text())) game.fail(`${why}\nAfter one press of ${key} the screen does not show ${expected}.`.trim());
      return game.frame;
    },
    /**
     * Press `key` until the screen matches `pattern`. Fails after `limit` presses. `key` may be a
     * function of the screen text. Each press must change what the game shows (see `press`).
     */
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
        await game.press("v", /View: ?[A-Z][a-z]+ .*Exit\s*$/, "V shows a character sheet.");
        const name = game.rows().find((row) => row.trim()).trim();
        if (!names.includes(name)) game.fail(`The sheet is headed "${name}", which is not a member of the party.`);
        purses[name] = coins(game.frame);
        await game.press("e");
        if (game.menu() !== menu) game.fail(`Leaving ${name}'s character sheet did not return to "${menu}".`);
        // End moves to the next member; alone in the party, there is none and End changes nothing.
        if (names.length > 1) await game.press("end");
      }
      return purses;
    },
    /**
     * From a menu that has View (walking, camp, a shop, the treasure menu), open the character
     * sheet of the member whose name starts with `name` and return what it says (see `sheet`).
     * The sheet is left open, on its menu "View:Items Spells Trade Drop Exit".
     */
    async viewSheet(name) {
      if (!/\bView\b/.test(game.menu())) game.fail("This menu has no View to open a character sheet with.");
      const menu = game.menu();
      for (let views = 0; ; views++) {
        if (views >= 9) game.fail(`Could not open the character sheet of ${name}.`);
        await game.press("v", /View: ?[A-Z][a-z]+ .*Exit\s*$/, "V shows a character sheet.");
        const shown = sheet(game.frame);
        if (!shown) game.fail("V did not show a character sheet with hit points and a status.");
        if (shown.name.startsWith(name)) return shown;
        await game.press("e");
        if (game.menu() !== menu) game.fail(`Leaving the character sheet did not return to "${menu}".`);
        await game.press("end");
      }
    },
    /**
     * From a menu that has View, read every member's sheet: [{ name, hp, status, ... }] in the
     * order the sheets came up. Leaves the game on the same menu. This is how a player learns who
     * is hurt, unconscious or dead: the party list shows only the hit points.
     */
    async sheets() {
      const menu = game.menu();
      const names = game.party().map(({ name }) => name);
      const found = new Map();
      for (let views = 0; found.size < names.length; views++) {
        if (views >= names.length * 2) game.fail(`Could not read the sheets of ${names.filter((name) => !found.has(name)).join(", ")}.`);
        await game.press("v", /View: ?[A-Z][a-z]+ .*Exit\s*$/, "V shows a character sheet.");
        const shown = sheet(game.frame);
        if (!shown || !names.includes(shown.name)) game.fail("V showed a sheet that is not a party member's.");
        found.set(shown.name, shown);
        await game.press("e");
        if (game.menu() !== menu) game.fail(`Leaving ${shown.name}'s character sheet did not return to "${menu}".`);
        if (names.length > 1) await game.press("end");
      }
      return names.map((name) => found.get(name));
    },
    /**
     * In a list where the game highlights one row (spells, cures, a shop's stock), move the
     * highlight with End to the first row that matches `pattern`. Returns that row's text. Such a
     * list can open with the highlight on any row, so a test must not count rows. The list's
     * heading, on the top row, can be white too and is not looked at.
     */
    async selectLine(pattern) {
      for (let moves = 0; ; moves++) {
        const row = whiteRow(game.frame, 2, 23);
        const text = row === undefined ? undefined : game.rows()[row].trim();
        if (text !== undefined && pattern.test(text)) return text;
        if (moves >= 30) game.fail(`Could not move the highlight to a row that matches ${pattern}.`);
        await game.press("end");
      }
    },
    /** The Items screen on show: see `items`. */
    items: () => items(game.frame),
    /** On an Items screen, move the highlight to the first item whose name matches `pattern`. Returns that item. */
    async selectItem(pattern) {
      for (let moves = 0; ; moves++) {
        const list = items(game.frame);
        if (!list) game.fail("The game is not showing a character's Items screen.");
        const selected = list.find((item) => item.selected);
        if (selected && pattern.test(selected.name)) return selected;
        if (!list.some(({ name }) => pattern.test(name))) game.fail(`The Items screen lists nothing that matches ${pattern}.`);
        if (moves >= list.length + 1) game.fail(`Could not move the highlight to ${pattern}.`);
        await game.press("end");
      }
    },
    /** Turn until the party faces N, E, S or W. */
    async face(heading) {
      for (let turns = 0; game.here()?.facing !== heading; turns++) {
        if (!game.here()) game.fail(`Cannot turn to face ${heading}: the game is not showing the party's position.`);
        if (turns >= 4) game.fail(`Four turns did not face the party ${heading}.`);
        await game.press("right");
      }
    },
    /** Face a heading and walk one square that way. Fails unless the party arrives on that square. */
    async step(heading) {
      await game.face(heading);
      const from = game.here();
      await game.press("up");
      const to = game.here();
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
    /** True while a combatant of the party has its command menu up. */
    fighting: () => combatMenu.test(game.menu()),
    /** True from the start of a fight to its end screen, whoever is acting. */
    inFight: () => combatMenu.test(game.menu()) || continueBattle.test(game.menu()) || Boolean(game.fightEnded()),
    /** The combatant the fight screen describes: see `combatant`. */
    combatant: () => combatant(game.frame),
    /** How the fight on screen has ended: "won", "lost" or "fled", or undefined while it has not. */
    fightEnded() {
      const text = game.text();
      return fightEnds.find(([, shown]) => shown.test(text))?.[0];
    },
    /**
     * Start a fight from a menu that offers one, by pressing `key` (C for Combat at an encounter
     * menu, or the menu's own word for attacking). Fails unless a fight follows: a combatant's
     * menu, the Continue Battle question, or the end of a fight the game played out by itself.
     */
    async startFight(key = "c") {
      await game.press(key);
      for (let presses = 0; pressReturn.test(game.menu()); presses++) {
        if (presses >= 6) game.fail("The game kept asking for return and no fight began.");
        await game.press("enter");
      }
      if (!game.fighting() && !continueBattle.test(game.menu()) && !game.fightEnded()) game.fail(`${JSON.stringify(key)} did not start a fight.`);
    },
    /**
     * From a combatant's menu, list everyone the game lets that combatant aim at, friend and foe,
     * with the game's own Aim command: [{ name, hp, ac, weapon, range, reachable }], nearest first,
     * starting with the combatant itself at range 0. `reachable` is true where Aim offers Target.
     * Monsters of one kind share a name: tell them apart by their place in the list. Leaves the
     * game on the same menu.
     */
    async combatants() {
      if (!game.fighting()) game.fail("Only a combatant's own menu has Aim.");
      await game.press("a", aimMenu, "A opens Aim.");
      const found = [];
      for (;;) {
        const shown = game.combatant();
        if (!shown || shown.range === undefined) game.fail("Aim does not show whom it is aimed at.");
        // Next goes round the list and comes back to the combatant itself, at range 0.
        if (found.length && shown.range === 0) break;
        if (found.length >= 80) game.fail("Aim's Next did not come back to the combatant itself.");
        found.push({ ...shown, reachable: /\bTarget\b/.test(game.menu()) });
        await game.press("n", aimMenu, "N aims at the next combatant.");
      }
      await game.press("e", combatMenu, "E leaves Aim.");
      return found;
    },
    /**
     * From a combatant's menu, attack a chosen target with the game's own Aim command: Next until
     * `choose(target, place)` accepts a combatant that can be reached, then Target. `choose` gets
     * what `combatants` lists. Returns the target as it was shown before the attack, or undefined,
     * with the menu as it was, when no combatant in reach was chosen.
     */
    async aim(choose, giveUp) {
      if (!game.fighting()) game.fail("Only a combatant's own menu has Aim.");
      await game.press("a", aimMenu, "A opens Aim.");
      return game.target(choose, giveUp);
    },
    /**
     * With the Aim menu open (after Aim, or after choosing a spell that asks for a target): Next
     * until `choose(target, place)` accepts a combatant that can be reached, then Target. Returns
     * that combatant, or undefined after leaving the Aim menu with Exit when none was chosen.
     * `giveUp(target, place)`, when given, ends the search early at a combatant it accepts.
     */
    async target(choose, giveUp) {
      game.expect(aimMenu, "Targets are chosen from the Aim menu.");
      let self;
      for (let place = 0; ; place++) {
        const shown = game.combatant();
        if (!shown) game.fail("Aim does not show whom it is aimed at.");
        // Aim starts on the combatant itself and Next comes round to it again. With a weapon the
        // game prints the range, 0 for the combatant itself; for a spell it names the spell
        // ("Spell:Sleep") and prints no range, so there the combatant is known by its name,
        // which no other combatant has (monsters of a kind share theirs; party members do not).
        if (!place) self = shown.name;
        if (place && (shown.range === 0 || (shown.range === undefined && shown.name === self))) break;
        if (place >= 80) game.fail("Aim's Next did not come back to the combatant itself.");
        const target = { ...shown, reachable: /\bTarget\b/.test(game.menu()) };
        if (target.reachable && choose(target, place)) {
          await game.press("t");
          return target;
        }
        if (giveUp?.(target, place)) break;
        await game.press("n", aimMenu, "N aims at the next combatant.");
      }
      await game.press("e");
      return undefined;
    },
    /**
     * One combatant's turn played by hand, from its command menu, with the game's own commands:
     *   - a caster who has one of `spells` in memory (patterns, tried in order) casts it at the
     *     nearest enemy the game lets it target;
     *   - otherwise the combatant attacks the nearest enemy in reach, with Aim and Target;
     *   - otherwise it ends its turn with Done and Guard, and waits for the enemy to come.
     * An enemy is a combatant whose name is not one of the party's (the names of the last party
     * list the game showed). Aim lists the combatants nearest first, so the search stops at the
     * first enemy: if that one is out of reach, the ones behind it are taken to be too.
     * Nobody is handed to Quick, so the next fight is by hand too.
     * Returns what was done: { cast, at } | { attacked } | { guarded: true }.
     */
    async playTurn({ spells = [] } = {}) {
      const enemy = ({ name }) => !friends.includes(name);
      if (/\bCast\b/.test(game.menu()) && spells.length) {
        await game.press("c", /Choose Spell: Cast Exit\s*$/, "Cast lists the spells in memory.");
        const known = game.rows().map((row) => row.trim());
        const spell = spells.find((pattern) => known.some((row) => pattern.test(row)));
        if (spell) {
          const cast = await game.selectLine(spell);
          await game.press("c");
          if (aimMenu.test(game.menu())) {
            const at = await game.target(enemy, enemy);
            if (at) return { cast, at };
          } else if (!/Choose Spell: Cast Exit\s*$/.test(game.menu())) return { cast };
        }
        // No such spell, or nobody to cast it at: back to the command menu. Leaving Aim with a
        // spell in hand, the game asks "Abort Spell?".
        for (let presses = 0; !combatMenu.test(game.menu()); presses++) {
          if (presses >= 3) game.fail("Leaving the spell list did not return to the combatant's menu.");
          await game.press(/Abort Spell\? Yes No\s*$/.test(game.menu()) ? "y" : "e");
        }
      }
      const attacked = await game.aim(enemy, enemy);
      if (attacked) return { attacked };
      if (!combatMenu.test(game.menu())) game.fail("Leaving Aim did not return to the combatant's menu.");
      await game.press("d");
      if (/Guard Delay Quit (?:Bandage )?(?:Speed )?Exit\s*$/.test(game.menu())) await game.press("g");
      return { guarded: true };
    },
    /**
     * Fight until the fight ends, reacting to what the game shows and never counting presses.
     *   turn(game)      called at each combatant's menu; must act. By default Quick: the game plays
     *                   that combatant from then on, in this fight and the next ones.
     *   continueBattle  the answer when the game asks "Continue Battle" (default "n": stop)
     * Returns { outcome: "won" | "lost" | "fled", xp, rounds } at the end screen, which is left
     * up: `xp` is what "Each character receives N experience points" says (undefined otherwise),
     * `rounds` how many menus and questions were answered.
     */
    async fight({ turn, continueBattle: answer = "n", limit = 400 } = {}) {
      for (let rounds = 0; ; rounds++) {
        const outcome = game.fightEnded();
        if (outcome) {
          const xp = /Each character receives (\d+) experience points\./.exec(game.text());
          return { outcome, xp: xp ? +xp[1] : undefined, rounds };
        }
        if (rounds >= limit) game.fail(`The fight did not end in ${limit} turns.`);
        if (game.fighting()) {
          const before = game.frame;
          if (turn) await turn(game); else await game.press("q");
          if (game.frame === before) game.fail("The turn did nothing: the game shows the frame it showed before.");
        } else if (continueBattle.test(game.menu())) await game.press(answer);
        else game.fail("The fight shows something the harness does not know.");
      }
    },
    /** `fight`, and a lost fight or a flight is a failure that shows the screen. Returns what `fight` returns. */
    async win(options) {
      const result = await game.fight(options);
      if (result.outcome !== "won") game.fail(`The fight was ${result.outcome}, not won.`);
      return result;
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
      if (pauseLog) {
        const source = setting("POR_GAME_SOURCE") === "port" ? "port" : "original";
        const walk = setting("POR_PAUSE_WALK") ?? basename(process.argv[1] ?? "harness");
        for (const { returns, via, rows, message, shown, missing } of pauses) {
          if (!message.length) continue;
          appendFileSync(pauseLog, JSON.stringify({ walk, source, returns, via, text: rows, shown, ...(shown ? {} : { missing }) }) + "\n");
        }
      }
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
