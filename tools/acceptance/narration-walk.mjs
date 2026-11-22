// Walk every square that can be reached from a saved game, with the narration ledger on, so that the
// passages the scripts tie to places are heard (#98).
//
//   node tools/acceptance/narration-walk.mjs <save directory> <slot> [--minutes N] [--seed N] [--run NAME]
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
import { appendFileSync, cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
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
if (!saves || !/^[A-J]$/i.test(slot ?? "")) throw new Error("Usage: narration-walk.mjs <save directory> <slot A-J> [--minutes N] [--seed N] [--run NAME]");
const minutes = Number(argument("--minutes", "30"));
let seed = Number(argument("--seed", "1")) >>> 0;
const run = argument("--run", `${slot.toUpperCase()}-${seed}`);
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

const copy = mkdtempSync(join(tmpdir(), "por-narration-walk-"));
for (const file of readdirSync(saves).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name))) cpSync(join(saves, file), join(copy, file));
const game = await startGame({ pregen: false, saves: copy, seconds: minutes * 60 + 300,
  env: { POR_DEV_COMBAT: "1", POR_NARRATION_LEDGER: ledger, POR_NARRATION_RUN: process.env.POR_NARRATION_RUN ?? `walk-${run}` } });
// A character the saved party handed to Quick fights on with no menu, past the developer victory:
// take each one back (the harness answers such a poll with Space).
game.byHand = true;
game.expect(/Load Saved Game/, "The first menu offers to load a saved game.");
await game.press("l", /Load Which Game: A/, "L asks which saved game to load.");
await game.press(slot.toLowerCase());

const heardSoFar = () => readFileSync(ledger, "utf8").split("\n").filter((line) => line.includes('"outcome":"heard"')).length;
const where = () => game.square() ?? undefined;
const keyOf = (square) => `${square.area}:${square.x},${square.y}`;

/** Answer whatever the game shows until it is back on the exploration menu. Returns false when the game ended. */
const trace = ledger.replace(/\.jsonl$/, ".trace.txt");
rmSync(trace, { force: true });
rmSync(ledger.replace(/\.jsonl$/, ".error.txt"), { force: true });
/** One line per answer the walk gives, with the menu it answered: what the walk did, for reading back. */
const note = (key) => appendFileSync(trace, `${elapsed()}s ${JSON.stringify(game.menu())} -> ${key}\n`);
async function resolveScreen(limit = 120) {
  for (let presses = 0; presses < limit; presses++) {
    const menu = game.menu();
    const text = game.text();
    if (exploring.test(text)) return true;
    if ((/Create New Character|Exit to DOS/.test(text) && /Load Saved Game/.test(text)) || /party has been destroyed/.test(text)) {
      log(`the game ended: ${text.replace(/\s+/g, " ").trim().slice(0, 120)}`);
      return false;
    }
    // The party menu a training hall or an inn opens: back to the street.
    if (/BEGIN Adventuring/.test(text) && /Choose a function\s*$/.test(text)) { note("b"); await game.press("b"); continue; }
    if (game.frame.developerVictoryAvailable) { note(":win-combat"); await game.send(":win-combat"); await game.settle(); continue; }
    // A combatant's own menu with no developer victory on offer: end the turn on guard.
    if (game.fighting()) { note("d"); await game.press("d"); if (/Guard/.test(game.menu())) await game.press("g"); continue; }
    if (continueBattle.test(menu)) { note("n"); await game.press("n"); continue; }
    if (/claim your treasure\? Yes No\s*$/.test(text)) { note("n"); await game.press("n"); continue; }
    if (/^View (?:Take )?Pool (?:Share )?Exit$/.test(menuLine(game.frame))) { note("e"); await game.press("e"); continue; }
    if (pressReturn.test(text) || /Press (?:button or )?<?(?:enter|return)>?(?:\/<return>)? to continue\s*$/i.test(text) ||
        /Press any key to continue\s*$/.test(text)) { note("enter"); await game.press("enter"); continue; }
    if (/\bYes No\s*$/.test(text)) { const answer = roll(2) ? "y" : "n"; note(answer); await game.press(answer); continue; }
    const words = menu.replace(/^[^:]*:\s*/, "").split(" ").filter((word) => /^[A-Za-z]{2,}$/.test(word) && !never.test(word));
    if (words.length) {
      // A temple's healing list or a shop can hold the walk round and round: after a while, leave.
      const out = presses >= leaveAfter ? words.find((word) => leaving.test(word)) : undefined;
      const word = out ?? words[roll(words.length)];
      const letter = (/[A-Z]/.exec(word.slice(1))?.[0] ?? word[0]).toLowerCase();
      note(letter);
      await game.press(letter);
      continue;
    }
    // A line to type (a password, a name), or a menu the walk does not know: Enter.
    note("enter");
    await game.press("enter");
  }
  game.fail(`The walk could not get back to the exploration menu in ${limit} presses.`);
}

/** Squares reached, and for each the way it was found to lead: "wall", or the square it led to. */
const squares = new Map();
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
    await game.press("right");
    if (!(await resolveScreen())) return false;
  }
  await game.press("up");
  if (!(await resolveScreen())) return false;
  const to = where();
  if (!to) return true;
  const [dx, dy] = headings[heading];
  const moved = keyOf(to) !== keyOf(from);
  node.ways.set(heading, moved ? keyOf(to) : "wall");
  visit(to);
  if (moved && (to.x !== from.x + dx || to.y !== from.y + dy || to.area !== from.area)) log(`${keyOf(from)} ${heading} led to ${keyOf(to)}`);
  return true;
}

let lastReport = 0;
let errors = 0;
try {
  if (!(await resolveScreen())) throw new Error("The saved game did not come to the exploration menu.");
  for (;;) {
    if (Date.now() - started > minutes * 60_000) { log("time is up"); break; }
    const here = where();
    if (!here) { if (!(await resolveScreen())) break; continue; }
    visit(here);
    const route = nextGoal(here);
    if (!route) { log("every way out of every square reached has been tried"); break; }
    try {
      // Walk the known route one step at a time; where a step leads elsewhere (an event moved the
      // party), the way is recorded as it went and the next step re-plans.
      const node = squares.get(keyOf(here));
      const untried = order.filter((heading) => !node.ways.has(heading));
      const heading = route.length ? route[0] : untried[roll(untried.length)];
      if (!(await stepToward(heading))) break;
    } catch (error) {
      // A screen the walk does not know: note it and go on from wherever the game is, a few times.
      if (++errors > 8) throw error;
      log(`recovered: ${error.message.split("\n")[0]}`);
      appendFileSync(ledger.replace(/\.jsonl$/, ".error.txt"), `${error.stack}\n${screenText(game.frame)}\n`);
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
  game.close();
  rmSync(copy, { recursive: true, force: true });
}
