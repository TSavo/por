// Walk every square that can be reached from a saved game, with the narration ledger on, so that the
// passages the scripts tie to places are heard (#98).
//
//   node tools/acceptance/narration-walk.mjs <save directory> <slot> [--minutes N] [--seed N] [--run NAME] [--record-leg DIRECTORY]
//
// The party is loaded from <slot> of a copy of <save directory> (a campaign's out/campaign-*/ holds
// slots A to I). From where it stands it tries each of the four ways out of every square it has
// reached, nearest first, and walks there by the ways it has found. Whatever the game shows on the
// way is answered without looking for a particular outcome:
//   - a fight is won with the developer victory (POR_DEV_COMBAT=1), or played on Quick;
//   - "Press <enter>" is Enter; treasure is left; "claim your treasure?" is No;
//   - Yes/No and any other menu: one of its words, chosen with the seeded dice, so that runs with
//     different seeds take different branches. Leaving to DOS, camping, viewing and the like are
//     never chosen.
// The ledger is out/narration-ledgers/walk-<run>.jsonl (or POR_NARRATION_LEDGER), for
// `npm run qa:narration -- --merge`. Game data as for any acceptance run: POR_GAME_SOURCE=port plays
// from game/. It prints, as it goes, the squares reached and the passages heard.
// --record-leg writes one numbered replay leg for each load of the saved slot.
// Pass a leg directory to npm run verify:campaign -- <chrome> --replay-leg <directory>.
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { continueBattle, menuLine, pressReturn, screenText, startGame } from "./harness.mjs";

/** The menu the party walks from. Where the area has no map it has no "Area". */
const exploring = /(?:Area )?Cast View Encamp Search Look\s*$/;

const argument = (name, fallback) => {
  const at = process.argv.indexOf(name);
  return at >= 0 ? process.argv[at + 1] : fallback;
};
const [saves, slot] = process.argv.slice(2);
if (!saves || !/^[A-J]$/i.test(slot ?? "")) throw new Error("Usage: narration-walk.mjs <save directory> <slot A-J> [--minutes N] [--seed N] [--run NAME] [--record-leg DIRECTORY]");
const minutes = Number(argument("--minutes", "30"));
let seed = Number(argument("--seed", "1")) >>> 0;
const run = argument("--run", `${slot.toUpperCase()}-${seed}`);
const recordPath = argument("--record-leg");
if (process.argv.includes("--record-leg") && (!recordPath || recordPath.startsWith("--"))) {
  throw new Error("--record-leg requires a new directory.");
}
const recording = recordPath && resolve(recordPath);
if (recording) {
  mkdirSync(dirname(recording), { recursive: true });
  mkdirSync(recording);
}
const ledger = resolve(process.env.POR_NARRATION_LEDGER ?? `out/narration-ledgers/walk-${run}.jsonl`);
mkdirSync(dirname(ledger), { recursive: true });
rmSync(ledger, { force: true });
const started = Date.now();
const elapsed = () => Math.round((Date.now() - started) / 1000);
const log = (line) => console.log(`[${elapsed()}s] ${line}`);
/** The seeded dice: a choice among n, the same for the same seed. */
const roll = (n) => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  // The low bits of this generator repeat with a short period: take the high ones.
  return (seed >>> 16) % n;
};

const headings = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
const order = ["N", "E", "S", "W"];
/** Words of a menu that never lead anywhere new: leaving the game, camping, looking at the party. */
const never = /^(?:Quit|Encamp|View|Cast|Area|Look|Search|Camp|Save|Alter|Magic|Rest|Drop|Trade|Items|Pool|Share|Take|Order|Speed|Detect)$/i;
/** The way out of a shop, a temple or a list: taken first once a screen has held the walk this many answers. */
const leaveAfter = 12;
const leaving = /^(?:Exit|Leave)$/i;

const saveFiles = (directory) => readdirSync(directory).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name));
const boot = { bootKeys: "31000000:1c0d", startAt: "50000000", developerCombat: true, inputCompat: "" };
const copy = mkdtempSync(join(tmpdir(), "por-narration-walk-"));
for (const file of saveFiles(saves)) cpSync(join(saves, file), join(copy, file));
let game;
let legNumber = 0;
let leg;

/** Save the last screen of this run before closing its runner. */
function closeGame() {
  try {
    if (leg) writeFileSync(join(leg, "last-screen.txt"), game.rows().map((row) => row.trimEnd()).join("\n").trimEnd() + "\n");
  } finally {
    leg = undefined;
    game.close();
  }
}

/** Start the game on the copy of the saves and load the slot. Done again when the party dies. */
async function begin() {
  const nextLeg = recording && join(recording, `leg-${++legNumber}`);
  const commands = nextLeg && join(nextLeg, "commands.jsonl");
  if (nextLeg) {
    mkdirSync(nextLeg);
    for (const file of saveFiles(copy)) cpSync(join(copy, file), join(nextLeg, file));
    writeFileSync(join(nextLeg, "boot.json"), JSON.stringify(boot) + "\n");
    writeFileSync(commands, "");
  }
  game = await startGame({ pregen: false, saves: copy, seconds: minutes * 60 + 300,
    env: { POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_INPUT_COMPAT: boot.inputCompat,
      POR_DEV_COMBAT: boot.developerCombat ? "1" : "0",
      POR_NARRATION_LEDGER: ledger, POR_NARRATION_RUN: process.env.POR_NARRATION_RUN ?? `walk-${run}`,
      ...(nextLeg ? { POR_PROMPT_SCHEDULE_IN: "", POR_PROMPT_SCHEDULE_OUT: join(nextLeg, "prompts.jsonl") } : {}),
    } });
  leg = nextLeg;
  if (commands) {
    const send = game.send;
    game.send = async (command) => {
      const accepted = await send(command);
      if (accepted && command !== undefined) appendFileSync(commands, JSON.stringify(command) + "\n");
      return accepted;
    };
  }
  // A character the saved party handed to Quick fights on with no menu, past the developer victory:
  // take each one back (the harness answers such a poll with Space).
  game.byHand = true;
  game.expect(/Load Saved Game/, "The first menu offers to load a saved game.");
  await game.press("l", /Load Which Game: A/, "L asks which saved game to load.");
  await game.press(slot.toLowerCase());
}
await begin();

const heardSoFar = () => readFileSync(ledger, "utf8").split("\n").filter((line) => line.includes('"outcome":"heard"')).length;
/**
 * Where the party stands. Where an illustration covers the view at the exploration menu (New
 * Phlan's gateway, a landmark), the frame has no live square: the status line under the party list
 * still gives the square and the facing, and the area is the last one walked.
 */
let lastArea;
const where = () => {
  const square = game.square();
  if (square) { lastArea = square.area; return square; }
  const shown = game.here();
  return shown && lastArea !== undefined ? { area: lastArea, x: shown.x, y: shown.y, facing: shown.facing } : undefined;
};
const keyOf = (square) => `${square.area}:${square.x},${square.y}`;

/** Answer whatever the game shows until it is back on the exploration menu. Returns false when the game ended. */
const trace = ledger.replace(/\.jsonl$/, ".trace.txt");
rmSync(trace, { force: true });
rmSync(ledger.replace(/\.jsonl$/, ".error.txt"), { force: true });
/** One line per answer the walk gives, with the menu it answered: what the walk did, for reading back. */
const note = (key) => appendFileSync(trace, `${elapsed()}s ${JSON.stringify(game.menu())} -> ${key}\n`);
/** The last screen answered with Enter alone, and whether a Yes/No was answered No since the step began. */
let lastUnanswered = "";
let saidNo = false;

/**
 * One key, then on until the game waits for the player, as the harness's press() does, except that
 * the developer victory is taken wherever the game offers it. The harness answers every poll of a
 * fight the computer plays with no key, so a fight in which the monsters move first (the council
 * guard's, when the walk refuses to leave City Hall) could kill the party before it had a menu.
 */
async function press(key) {
  if (!(await game.send(key))) game.fail(`The runner does not know the key ${JSON.stringify(key)}.`);
  for (let polls = 0; !game.frame.awaitsKey; polls++) {
    if (polls >= 3000) game.fail("The game was still running by itself after 3000 keyboard polls.");
    if (game.frame.developerVictoryAvailable) { note(":win-combat"); await game.send(":win-combat"); continue; }
    const takeControl = /^Move\/Attack, Move Left = \d+$/.test(game.menu());
    if (!(await game.send(takeControl ? "space" : ":travel-poll"))) game.fail("The runner refused to go on at a frame that does not wait for a key.");
  }
}
async function resolveScreen(limit = 120) {
  for (let presses = 0; presses < limit; presses++) {
    const menu = game.menu();
    const text = game.text();
    if (exploring.test(text)) return true;
    // The party destroyed: by the script ("The monsters rejoice"), or in a fight ("The entire party is
    // killed!", after which the game exits to DOS).
    if ((/Create New Character|Exit to DOS/.test(text) && /Load Saved Game/.test(text)) ||
        /party has been destroyed|entire party is killed/i.test(text)) {
      log(`the game ended: ${text.replace(/\s+/g, " ").trim().slice(0, 120)}`);
      return false;
    }
    // The party menu a training hall or an inn opens: back to the street.
    if (/BEGIN Adventuring/.test(text) && /Choose a function\s*$/.test(text)) { note("b"); await press("b"); continue; }
    if (game.frame.developerVictoryAvailable) { note(":win-combat"); await press(":win-combat"); continue; }
    // A combatant's own menu with no developer victory on offer: end the turn on guard.
    if (game.fighting()) { note("d"); await press("d"); if (/Guard/.test(game.menu())) await press("g"); continue; }
    if (continueBattle.test(menu)) { note("n"); await press("n"); continue; }
    if (/claim your treasure\? Yes No\s*$/.test(text)) { note("n"); await press("n"); continue; }
    if (/^View (?:Take )?Pool (?:Share )?Exit$/.test(menuLine(game.frame))) { note("e"); await press("e"); continue; }
    if (pressReturn.test(text) || /Press (?:button or )?<?(?:enter|return)>?(?:\/<return>)? to continue\s*$/i.test(text) ||
        /Press any key to continue\s*$/.test(text)) { note("enter"); await press("enter"); continue; }
    if (/\bYes No\s*$/.test(text)) {
      const answer = roll(2) ? "y" : "n";
      if (answer === "n") saidNo = true;
      note(answer); await press(answer); continue;
    }
    // A menu's choices are its words with a capital: "Leave Force your way past" offers Leave and
    // Force; "your", "way" and "past" are not choices, and a prompt in capitals ("WHO WILL GAMBLE?") is not either.
    const words = menu.replace(/^[^:]*:\s*/, "").split(" ")
      .filter((word) => /^(?:[A-Z][a-z]+|[a-z]+[A-Z][a-z]*)$/.test(word) && !never.test(word));
    if (words.length) {
      // A temple's healing list or a shop can hold the walk round and round: after a while, leave.
      const out = presses >= leaveAfter ? words.find((word) => leaving.test(word)) : undefined;
      const word = out ?? words[roll(words.length)];
      const letter = (/[A-Z]/.exec(word.slice(1))?.[0] ?? word[0]).toLowerCase();
      note(letter);
      await press(letter);
      continue;
    }
    // A line to type (a password, a number of coins) or a menu the walk does not know: Enter. Where
    // Enter alone leaves the screen as it was, type something first: a number, or a word.
    if (text === lastUnanswered) {
      const typed = /NUMBER|HOW MANY|GP\b/i.test(text) ? ["1", "10", "100"][roll(3)] : ["yes", "friend", "abc"][roll(3)];
      for (const character of typed) await press(character);
      note(`${typed} enter`);
    } else note("enter");
    lastUnanswered = text;
    await press("enter");
  }
  game.fail(`The walk could not get back to the exploration menu in ${limit} presses.`);
}

/** Squares reached, and for each the way it was found to lead: "wall", or the square it led to. */
const squares = new Map();
/** How often each way out ("area:x,y heading") stayed shut because the walk answered No. */
const refusals = new Map();
const visit = (square) => {
  const key = keyOf(square);
  if (!squares.has(key)) squares.set(key, { square, ways: new Map() });
  return squares.get(key);
};
/** The shortest known route from `from` to a square with a way not yet tried, as headings, and that square. */
function nextGoal(from) {
  const queue = [[keyOf(from), []]];
  const seen = new Set([keyOf(from)]);
  while (queue.length) {
    const [key, route] = queue.shift();
    const node = squares.get(key);
    if (!node) continue;
    if (order.some((heading) => !node.ways.has(heading))) return route;
    for (const heading of order) {
      const to = node.ways.get(heading);
      if (!to || to === "wall" || seen.has(to)) continue;
      seen.add(to);
      queue.push([to, [...route, heading]]);
    }
  }
  return undefined;
}
async function stepToward(heading) {
  const from = where();
  if (!from) return resolveScreen();
  const node = visit(from);
  // Turn by the game's own Right. A turn can start an event, or the square can spin the party:
  // answer what comes, and give up on this way out after four turns that do not face it.
  for (let turns = 0; where()?.facing !== heading; turns++) {
    if (turns >= 4 || keyOf(where() ?? from) !== keyOf(from)) { node.ways.set(heading, "wall"); return true; }
    await press("right");
    if (!(await resolveScreen())) return false;
  }
  saidNo = false;
  await press("up");
  if (!(await resolveScreen())) return false;
  const to = where();
  if (!to) return true;
  const [dx, dy] = headings[heading];
  const moved = keyOf(to) !== keyOf(from);
  // A way the party did not take because the walk answered No (a stair, a door, "do you want to
  // enter?") is tried again, up to three times, so that the dice can answer Yes.
  const key = `${keyOf(from)} ${heading}`;
  if (!moved && saidNo && (refusals.get(key) ?? 0) < 3) { refusals.set(key, (refusals.get(key) ?? 0) + 1); return true; }
  node.ways.set(heading, moved ? keyOf(to) : "wall");
  visit(to);
  if (moved && (to.x !== from.x + dx || to.y !== from.y + dy || to.area !== from.area)) log(`${keyOf(from)} ${heading} led to ${keyOf(to)}`);
  return true;
}

let lastReport = 0;
let errors = 0;
let deaths = 0;
let blind = 0;
try {
  if (!(await resolveScreen())) throw new Error("The saved game did not come to the exploration menu.");
  for (;;) {
    if (Date.now() - started > minutes * 60_000) { log("time is up"); break; }
    const here = where();
    if (!here) {
      // On the exploration menu with no square to read at all: step forward and look again, a few times.
      if (!(await resolveScreen())) break;
      if (++blind > 20) { log("the game shows no square to walk from"); break; }
      if (!where()) await press("up");
      continue;
    }
    blind = 0;
    visit(here);
    const route = nextGoal(here);
    if (!route) { log("every way out of every square reached has been tried"); break; }
    try {
      // Walk the known route one step at a time; where a step leads elsewhere (an event moved the
      // party), the way is recorded as it went and the next step re-plans.
      const node = squares.get(keyOf(here));
      const untried = order.filter((heading) => !node.ways.has(heading));
      const heading = route.length ? route[0] : untried[roll(untried.length)];
      if (!(await stepToward(heading))) {
        // The party died (a fight the walk could not win, or a question answered into death, such
        // as refusing to leave when the council guard says so). That way is closed, the game starts
        // again from the saved slot, and the walk goes on with what it has found.
        if (++deaths > 8) break;
        node.ways.set(heading, "wall");
        log(`the party died stepping ${heading} from ${keyOf(here)}: loading slot ${slot.toUpperCase()} again`);
        closeGame();
        await begin();
        if (!(await resolveScreen())) break;
      }
    } catch (error) {
      // A screen the walk does not know: note it and go on from wherever the game is, a few times.
      if (++errors > 8) throw error;
      log(`recovered: ${error.message.split("\n")[0]}`);
      appendFileSync(ledger.replace(/\.jsonl$/, ".error.txt"), `${error.stack}\n${screenText(game.frame)}\n`);
      // The runner ended (the game went back to DOS): start it again from the saved slot.
      if (/The game stopped/.test(error.message)) {
        if (++deaths > 8) break;
        log(`the game ended: loading slot ${slot.toUpperCase()} again`);
        closeGame();
        await begin();
      }
      if (!(await resolveScreen())) break;
    }
    if (elapsed() - lastReport >= 60) {
      lastReport = elapsed();
      log(`${squares.size} squares reached in ${new Set([...squares.values()].map(({ square }) => square.area)).size} areas; ${heardSoFar()} narrations heard`);
    }
  }
} catch (error) {
  log(`stopped: ${error.message.split("\n")[0]}`);
  appendFileSync(ledger.replace(/\.jsonl$/, ".error.txt"), `${error.stack}\n${screenText(game.frame)}\n`);
} finally {
  log(`done: ${squares.size} squares reached; ${heardSoFar()} narrations heard; ledger ${ledger}`);
  closeGame();
  rmSync(copy, { recursive: true, force: true });
}
