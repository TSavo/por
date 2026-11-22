// Make the checkpoint saves presentation replays start from, by play (#90).
//
//   POR_GAME_SOURCE=port node tools/make-replay-checkpoints.mjs <chrome> <results.jsonl> [--workers 4]
//     [--only <regex>] [--limit N] [--candidates N] [--base-port P]
//   node tools/make-replay-checkpoints.mjs --plan [--only <regex>] [--limit N]    what would be tried, no games
//   node tools/make-replay-checkpoints.mjs --adopt <results.jsonl>                 register the passes
//   node tools/make-replay-checkpoints.mjs --needs <results.jsonl>                 the routes no walk can start
//
// A route of tools/verify-slums-presentation.mjs plays from a saved game, and the save it was written
// against is not in the repository (npm run qa:replay-checkpoints). For each red route this
//   1. reads the route's keys from its table entry (`walk` or `inputs`, with the verifier's named key
//      lists resolved) and keeps the moves before its first other key: up (a step), left and right;
//   2. finds every square and facing of the area's map from which those moves pass the walls, by the
//      game's own rule (first-person-cells.ts `reachable`: an open side passes, a wall passes when its
//      passage bits are not 0);
//   3. takes the committed saves in the route's area (every qa/fixtures/**/[A-J].json: the area at byte
//      0x1e5 of the native save, x, y and facing at 0x3201) and, for each candidate square, the save the
//      party can walk there from in the fewest keys;
//   4. loads that save in the runner (from game/, as record-walk does), walks there, encamps and saves
//      in the route's slot letter, and runs the route in Chrome with that save. The nearest candidates
//      are tried first, at most --candidates of them (default 4), and a route stops at its first pass.
// Each try is one line of <results.jsonl>. A route the walk cannot start gets a "needs" line saying
// why: it names no area or no keys, its first key is not a move (the start square is not in the keys),
// no square of the map takes its moves, no save in the area reaches one, or every candidate failed.
// --adopt copies each passing save to qa/fixtures/replay-checkpoints/<id>/<slot>.json, with how it was
// made beside it (<slot>.made.json: the save it started from and the keys), and registers the route.
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import vm from "node:vm";

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const registryPath = "qa/replay-checkpoints.json";

if (args.includes("--adopt")) {
  const results = readFileSync(flag("--adopt"), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  let adopted = 0;
  for (const r of results.filter(r => r.exit === 0 && r.save && !registry.checkpoints[r.route])) {
    const text = readFileSync(r.save, "utf8");
    const id = createHash("sha1").update(text).digest("hex").slice(0, 12);
    const directory = join("qa/fixtures/replay-checkpoints", id);
    mkdirSync(directory, { recursive: true });
    const file = join(directory, `${r.slot}.json`);
    writeFileSync(file, text);
    writeFileSync(join(directory, `${r.slot}.made.json`), JSON.stringify({
      route: r.route, from: r.from, fromSlot: r.fromSlot, keys: r.keys, start: r.start, saveIn: r.slot,
      how: "tools/make-replay-checkpoints.mjs from game/: load `from`, walk `keys` (a message on the way read on, a fight won with :win-combat), then e, s and the slot letter",
    }, null, 1) + "\n");
    registry.checkpoints[r.route] = file;
    if (!registry.proved.includes(r.route)) registry.proved.push(r.route);
    adopted++;
  }
  registry.proved.sort();
  registry.checkpoints = Object.fromEntries(Object.entries(registry.checkpoints).sort(([a], [b]) => a.localeCompare(b)));
  writeFileSync(registryPath, JSON.stringify(registry, null, 2) + "\n");
  console.log(`adopted ${adopted} routes`);
  process.exit(0);
}

if (args.includes("--needs")) {
  const results = readFileSync(flag("--needs"), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  const passed = new Set(results.filter(r => r.exit === 0).map(r => r.route));
  const needs = results.filter(r => r.needs && !passed.has(r.route));
  const by = new Map();
  for (const r of needs) by.set(r.needs, [...(by.get(r.needs) ?? []), r.route]);
  for (const [need, routes] of [...by].sort((a, b) => b[1].length - a[1].length)) {
    console.log(`${routes.length}  ${need}\n    ${routes.join(" ")}`);
  }
  process.exit(0);
}

const { tsImport } = await import("tsx/esm/api");
const { portGameRoot, portGame } = await tsImport("./gamedata.ts", import.meta.url);
const { readWorld } = await tsImport("./first-person-cells.ts", import.meta.url);

// ---- The routes and their keys ---------------------------------------------------------------------

const verifierSource = readFileSync("tools/verify-slums-presentation.mjs", "utf8");
/** The text of the bracketed list that starts at `start`, quotes and regular expressions skipped. */
function balanced(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < text.length && text[i] !== c; i++) if (text[i] === "\\") i++;
      continue;
    }
    if (c === "[" || c === "(" || c === "{") depth++;
    if (c === "]" || c === ")" || c === "}") { depth--; if (depth === 0) return text.slice(start, i + 1); }
  }
}
const constants = new Map();
/** A top-level `const name = [...]` of the verifier, evaluated. */
function constant(name) {
  if (constants.has(name)) return constants.get(name);
  const at = verifierSource.search(new RegExp(`^const ${name} = \\[`, "m"));
  const value = at < 0 ? undefined : evaluate(balanced(verifierSource, verifierSource.indexOf("[", at)));
  constants.set(name, value);
  return value;
}
/** A key list's source, with the named lists it spreads resolved. Only lists of strings come back. */
function evaluate(text) {
  if (!text) return undefined;
  const context = { Array };
  for (const [, name] of text.matchAll(/\.\.\.([A-Za-z_]\w*)/g)) {
    const value = constant(name);
    if (!value) return undefined;
    context[name] = value;
  }
  try {
    const value = vm.runInNewContext(`(${text})`, context, { timeout: 1000 });
    return Array.isArray(value) && value.every(key => typeof key === "string") ? value : undefined;
  } catch { return undefined; }
}
function routeKeys(text) {
  const field = /\b(walk|inputs): \[/.exec(text ?? "");
  return field ? evaluate(balanced(text, field.index + field[0].length - 1)) : undefined;
}

// ---- The map, the walls and the walk ----------------------------------------------------------------

const world = readWorld(portGame(portGameRoot).data, (file) => new Uint8Array(readFileSync(join(portGameRoot, file))));
const areaMaps = new Map();
for (const script of world.scripts) {
  const maps = script.maps.map(({ block }) => world.maps.get(`${script.archive}:${block}`)).filter(Boolean);
  areaMaps.set(script.area, [...new Set([...(areaMaps.get(script.area) ?? []), ...maps])]);
}
const steps = [[0, -1], [1, 0], [0, 1], [-1, 0]];
const facingName = "N?E?S?W?";
/** Where one step forward from (x, y) facing `facing` (0 N, 2 E, 4 S, 6 W) leads, or undefined at a wall. */
function step(map, area, x, y, facing) {
  const side = facing / 2, square = y * 16 + x;
  if (map.walls[square * 4 + side] !== 0 && map.passage[square * 4 + side] === 0) return undefined;
  let nx = x + steps[side][0], ny = y + steps[side][1];
  if (nx < 0 || nx > 15 || ny < 0 || ny > 15) {
    if (area === 0 || area === 10 || area === 21) return undefined;
    nx &= 15; ny &= 15;
  }
  return [nx, ny];
}
function move(map, area, [x, y, facing], key) {
  if (key === "left") return [x, y, (facing + 6) % 8];
  if (key === "right") return [x, y, (facing + 2) % 8];
  const next = step(map, area, x, y, facing);
  return next && [next[0], next[1], facing];
}
const isMove = (key) => key === "up" || key === "left" || key === "right";
const stateId = ([x, y, f]) => (y * 16 + x) * 8 + f;
const searches = new Map();
/** Every state the party can reach from `from` ([x, y, facing]) over the walls, each with how. */
function searchFrom(map, area, from) {
  const key = `${map.block}:${area}:${stateId(from)}`;
  if (searches.has(key)) return searches.get(key);
  const previous = new Map([[stateId(from), undefined]]);
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    for (const press of ["up", "left", "right"]) {
      const next = move(map, area, queue[i], press);
      if (next && !previous.has(stateId(next))) { previous.set(stateId(next), { state: queue[i], key: press }); queue.push(next); }
    }
  }
  searches.set(key, previous);
  return previous;
}
/** The fewest keys from `from` to `to` (both [x, y, facing]) over the walls, or undefined. */
function path(map, area, from, to) {
  const previous = searchFrom(map, area, from);
  if (!previous.has(stateId(to))) return undefined;
  const keys = [];
  for (let at = to; previous.get(stateId(at)); at = previous.get(stateId(at)).state) keys.unshift(previous.get(stateId(at)).key);
  return keys;
}

// ---- The committed saves ----------------------------------------------------------------------------

function saves() {
  const found = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) { walk(file); continue; }
      const letter = /^([A-J])\.json$/.exec(entry.name)?.[1];
      if (!letter) continue;
      let save;
      try { save = JSON.parse(readFileSync(file, "utf8")); } catch { continue; }
      if (save.version !== 1 || typeof save.data !== "string") continue;
      const native = Buffer.from(save.data, "base64");
      if (native.length < 0x3204) continue;
      const id = createHash("sha1").update(save.data).update(JSON.stringify(save.party ?? {})).digest("hex").slice(0, 12);
      if (found.has(id)) continue;
      found.set(id, { id, file, letter, area: native[0x1e5], x: native[0x3201], y: native[0x3202], facing: native[0x3203] });
    }
  };
  walk("qa/fixtures");
  return [...found.values()];
}

// ---- What to try --------------------------------------------------------------------------------

const rows = JSON.parse(execFileSync("npx", ["tsx", "tools/qa-replay-checkpoints.ts", "--json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
const only = flag("--only") ? new RegExp(flag("--only")) : undefined;
const limit = Number(flag("--limit", "100000"));
const maxCandidates = Number(flag("--candidates", "4"));
const pool = saves();
const resultsPath = positional[1];
const tried = new Set(resultsPath && existsSync(resultsPath)
  ? readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line)).filter(r => r.done).map(r => r.route) : []);

/** The plan for one route: its candidates (nearest first) or why it has none. */
function plan(row) {
  const area = Number(/\barea:\s*(\d+)/.exec(row.text ?? "")?.[1] ?? NaN);
  if (!row.text) return { needs: "an explicit route: its start is in the verifier's code, not a table" };
  if (!row.slot) return { needs: "no slot letter in its table entry" };
  if (!Number.isInteger(area)) return { needs: "no area in its table entry" };
  const keys = routeKeys(row.text);
  if (!keys) return { needs: "no walk or inputs list the tool can read" };
  // Search (S) and the journal (J) change nothing about where the party stands: the moves after them count.
  let first = 0;
  while (first < keys.length && (keys[first] === "s" || keys[first] === "j")) first++;
  const moves = [];
  for (const key of keys.slice(first)) { if (!isMove(key)) break; moves.push(key); }
  if (!moves.some(key => key === "up")) return { needs: `its first keys take no step (${keys.slice(0, 3).join(" ")}): the start square is not in its keys` };
  const maps = areaMaps.get(area) ?? [];
  const here = pool.filter(save => save.area === area);
  if (!here.length) return { needs: `no committed save in area ${area}` };
  const candidates = [];
  for (const map of maps) {
    for (let square = 0; square < 256; square++) {
      for (let facing = 0; facing < 8; facing += 2) {
        let state = [square & 15, square >> 4, facing];
        for (const key of moves) { state = state && move(map, area, state, key); }
        if (!state) continue;
        const start = [square & 15, square >> 4, facing];
        let best;
        for (const save of here) {
          const keysThere = path(map, area, [save.x, save.y, save.facing], start);
          if (keysThere && (!best || keysThere.length < best.keys.length)) best = { save, keys: keysThere };
        }
        if (best) candidates.push({ start, map, ...best });
      }
    }
  }
  if (!candidates.length) return { needs: `no square of area ${area}'s map takes its ${moves.length} moves and is reached from a save` };
  candidates.sort((a, b) => a.keys.length - b.keys.length);
  return { area, moves, total: candidates.length, candidates: candidates.slice(0, maxCandidates) };
}

// Largest groups first (routes that share a slot and an area), as qa:replay-checkpoints --group lists them.
const groupOf = (row) => `${row.slot ?? "?"}|${/\barea:\s*(\d+)/.exec(row.text ?? "")?.[1] ?? "?"}`;
const groupSize = new Map();
for (const row of rows.filter(row => row.status === "missing")) groupSize.set(groupOf(row), (groupSize.get(groupOf(row)) ?? 0) + 1);
// Every red route is planned first. A batch (--limit) is that many routes with squares to try, largest
// groups first; the routes no walk can start are all written as "needs" lines in the first batch.
const planned = rows.filter(row => row.status === "missing" && !tried.has(row.name) && (!only || only.test(row.name)))
  .sort((a, b) => groupSize.get(groupOf(b)) - groupSize.get(groupOf(a)) || groupOf(a).localeCompare(groupOf(b)) || a.name.localeCompare(b.name))
  .map(row => ({ row, plan: plan(row) }));
const unplayable = planned.filter(({ plan }) => plan.needs);
const todo = planned.filter(({ plan }) => !plan.needs).slice(0, limit);

if (args.includes("--plan")) {
  const counts = new Map();
  for (const { row, plan: p } of [...unplayable, ...todo]) {
    const key = p.needs ?? "candidates";
    counts.set(key, (counts.get(key) ?? 0) + 1);
    if (!p.needs) console.log(`${row.name}  area ${p.area} slot ${row.slot}: ${p.total} squares take its ${p.moves.length} moves; nearest ` +
      p.candidates.map(c => `${c.start[0]},${c.start[1]} ${facingName[c.start[2]]} from ${relative(".", c.save.file)} in ${c.keys.length} keys`).join("; "));
  }
  for (const [key, n] of [...counts].sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${key}`);
  process.exit(0);
}

// ---- Playing ------------------------------------------------------------------------------------

const chrome = positional[0];
if (!chrome || !resultsPath) { console.error("usage: make-replay-checkpoints.mjs <chrome> <results.jsonl> [--workers N] [--only regex] [--limit N]"); process.exit(2); }
const { startGame, exploring } = await import("./acceptance/harness.mjs");
// The game writes this line in either case: "Press <enter>" walking, "press <enter>" in a fight.
const pressReturn = /press <enter>\/<return> to continue\s*$/i;
const { loadUpgradeArt, loadCombatMaterialMasks } = await tsImport("./upgrade-art.ts", import.meta.url);
const { enhancedArtEnv } = await tsImport("./enhanced-runner.ts", import.meta.url);
const artwork = loadUpgradeArt(undefined, portGameRoot);
const portEnv = { POR_GAME_SOURCE: "port", ...enhancedArtEnv(artwork, loadCombatMaterialMasks(artwork)) };
const scanCodes = { A: 0x1e, B: 0x30, C: 0x2e, D: 0x20, E: 0x12, F: 0x21, G: 0x22, H: 0x23, I: 0x17, J: 0x24 };
const slotKey = (letter) => ((scanCodes[letter] << 8) | letter.toLowerCase().charCodeAt(0)).toString(16).padStart(4, "0");
const workers = Number(flag("--workers", "4"));
const basePort = Number(flag("--base-port", "45200"));
// Short on purpose: the verifier makes Chrome put its SingletonSocket under this directory, and a Unix
// socket path longer than 108 bytes kills Chrome with SIGTRAP (#187).
const scratch = resolve(flag("--scratch", "/dev/shm/mrc"));
const timeoutSeconds = Number(flag("--timeout", "240"));
const record = (line) => appendFileSync(resultsPath, JSON.stringify(line) + "\n");

/**
 * Whatever a step brought up that is not the walking menu, dealt with as a player passing through
 * would: a message is read on, an encounter is fought and won with the developer's command (the
 * campaign's own way, POR_DEV_COMBAT), a treasure is left. False when the screen is something else
 * (a question, a shop): that candidate is given up.
 */
async function passThrough(game) {
  for (let presses = 0; presses < 40; presses++) {
    if (exploring.test(game.text())) return true;
    const menu = game.menu();
    if (pressReturn.test(menu)) await game.press("enter");
    else if (/^Combat Wait Flee/i.test(menu)) await game.press("c");
    else if (/Continue Battle:Yes No\s*$/i.test(menu)) await game.press("n");
    else if (game.frame.developerVictoryAvailable) {
      if (!await game.send(":win-combat")) return false;
      await game.settle();
    } else if (/\bView\b.*\bExit\s*$/.test(menu) && /\bTake\b/.test(menu)) await game.press("e");
    else if (/still treasure left/i.test(game.text()) && /Yes No\s*$/.test(menu)) await game.press("n");
    else if (/Hitpoints/.test(game.text()) && /\bQuick\b/.test(menu)) await game.press("q");
    else return false;
  }
  return exploring.test(game.text());
}

/** Load `save`, walk to `start` over `map`'s walls, and save in `letter`. Returns the written save file, or why not. */
async function makeSave(save, map, area, start, letter, directory) {
  const saves = join(directory, "saves");
  rmSync(saves, { recursive: true, force: true });
  mkdirSync(saves, { recursive: true });
  copyFileSync(save.file, join(saves, `${save.letter}.json`));
  const roster = join(dirname(save.file), "roster.json");
  if (existsSync(roster)) copyFileSync(roster, join(saves, "roster.json"));
  const game = await startGame({ pregen: false, saves, seconds: 300, env: { ...portEnv,
    POR_BOOT_KEYS: `31000000:1c0d,45000000:266c,52000000:${slotKey(save.letter)}`, POR_LIVE_AT: "85000000",
    POR_DEV_COMBAT: "1", POR_INPUT_COMPAT: "", POR_PROMPT_SCHEDULE_IN: "", POR_PROMPT_SCHEDULE_OUT: "" } });
  // As record-walk settles: a fight the game would play by itself is won at the first poll that offers it.
  game.settle = async () => {
    for (let polls = 0; !game.frame.awaitsKey; polls++) {
      if (polls >= 3000) game.fail("The game was still running by itself after 3000 keyboard polls.");
      const command = game.frame.developerVictoryAvailable ? ":win-combat" : ":travel-poll";
      if (!await game.send(command)) game.fail(`The runner refused ${command}.`);
    }
    return game.frame;
  };
  const pressed = [];
  try {
    const at = () => game.frame.exploration && [game.frame.exploration.x, game.frame.exploration.y, game.frame.exploration.facing];
    const same = (a, b) => a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    await game.settle();
    if (!same(at(), [save.x, save.y, save.facing])) return { failed: `the save loaded at ${at()} on "${game.menu()}", not ${save.x},${save.y},${save.facing}`, keys: pressed };
    // One key at a time, planned again from wherever the party stands after anything on the way.
    for (let moves = 0; !same(at(), start); moves++) {
      if (moves >= 120) return { failed: `120 keys did not reach ${start}`, keys: pressed };
      if (game.frame.exploration?.area !== area) return { failed: `the walk left area ${area} for ${game.frame.exploration?.area}`, keys: pressed };
      const keys = path(map, area, at(), start);
      if (!keys?.length) return { failed: `no way over the walls from ${at()} to ${start}`, keys: pressed };
      await game.press(keys[0]);
      pressed.push(keys[0]);
      if (!await passThrough(game)) {
        return { failed: `the walk met "${game.menu()}" at ${at() ?? "no square"}: ${game.text().slice(-160)}`, keys: pressed };
      }
    }
    await game.press("e", /Camp: Save View Magic Rest Alter Exit/, "E makes camp.");
    await game.press("s", /Save Which Game/, "S asks for the slot.");
    await game.press(letter.toLowerCase(), /Quit TO DOS Yes No/i, "The letter saves the game.");
    const written = join(saves, `${letter}.json`);
    if (!existsSync(written)) return { failed: `no ${letter}.json after saving`, keys: pressed };
    const kept = join(directory, `${letter}.json`);
    copyFileSync(written, kept);
    return { file: kept, keys: pressed };
  } catch (error) {
    return { failed: String(error.message ?? error).split("\n").slice(0, 2).join(" ").slice(0, 200), keys: pressed };
  } finally {
    game.close();
  }
}

function runRoute(file, route, worker, directory) {
  return new Promise(done => {
    const started = Date.now();
    const child = spawn(process.execPath, ["tools/verify-slums-presentation.mjs", file, chrome, route], {
      env: { ...process.env, POR_PLAY_PORT: String(basePort + worker), POR_PRESENTATION_OUTPUT_DIR: join(directory, "out") },
      detached: true, stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const keep = chunk => { tail = (tail + chunk).slice(-4000); };
    child.stdout.on("data", keep); child.stderr.on("data", keep);
    const timer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, timeoutSeconds * 1000);
    child.on("close", code => {
      clearTimeout(timer);
      try { process.kill(-child.pid, "SIGKILL"); } catch {}
      // The assertion and the lines that say what was seen and expected.
      const lines = tail.split("\n");
      const at = lines.findIndex(line => /Error|assert/i.test(line));
      const error = code === 0 ? "" : (at >= 0 ? lines.slice(at, at + 6).map(line => line.trim()).filter(Boolean).join(" | ")
        : lines.filter(Boolean).pop() ?? "").slice(0, 400);
      done({ exit: code, seconds: Math.round((Date.now() - started) / 1000), error });
    });
  });
}

let next = 0, passes = 0, done = 0;
async function worker(index) {
  const directory = join(scratch, `w${index}`);
  while (next < todo.length) {
    const { row, plan: p } = todo[next++];
    {
      let passed = false;
      for (const [n, candidate] of p.candidates.entries()) {
        rmSync(directory, { recursive: true, force: true });
        mkdirSync(directory, { recursive: true });
        const base = { route: row.name, slot: row.slot, area: p.area, start: candidate.start, from: relative(".", candidate.save.file),
          fromSlot: candidate.save.letter, keys: candidate.keys, candidate: n + 1, of: p.total };
        const made = await makeSave(candidate.save, candidate.map, p.area, candidate.start, row.slot, directory);
        base.keys = made.keys;
        if (!made.file) { record({ ...base, exit: "walk", error: made.failed }); continue; }
        const keep = join(scratch, "saves", row.name);
        mkdirSync(keep, { recursive: true });
        const save = join(keep, `${n + 1}-${row.slot}.json`);
        copyFileSync(made.file, save);
        const result = await runRoute(made.file, row.name, index, directory);
        record({ ...base, ...result, save });
        if (result.exit === 0) { passed = true; passes++; break; }
        if (/No BIOS key|Option does not apply|Unknown route/i.test(result.error)) break;
      }
      record({ route: row.name, slot: row.slot, done: true, ...(passed ? {} : { needs: `none of the ${p.candidates.length} nearest of ${p.total} squares that take its moves passed` }) });
    }
    done++;
    console.log(`[${done}/${todo.length}] ${row.name} (${passes} passed so far)`);
  }
}
for (const { row, plan: p } of unplayable) record({ route: row.name, slot: row.slot, needs: p.needs, done: true });
console.log(`${unplayable.length} routes no walk can start (needs lines written); ${todo.length} routes to play, ${pool.length} distinct saves, ${workers} workers`);
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
console.log(`done: ${passes} of ${todo.length} routes pass from a save made by play`);
