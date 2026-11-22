// Find committed saves that make presentation replays pass (#90).
//
//   POR_GAME_SOURCE=port node tools/sweep-replay-checkpoints.mjs <chrome> <results.jsonl> [--workers N] [--only <regex>] [--routes-from <file>]
//
// For every route that npm run qa:replay-checkpoints lists as missing, tries each distinct saved game under
// qa/fixtures (campaign legs, walks, guide parties), relabelled to the route's slot letter, with
// tools/verify-slums-presentation.mjs, and appends one JSON line per try: {route, slot, source, exit, seconds, error}.
// It stops at a route's first pass. Routes with an option (--decline and the like) and routes that reload a save
// another route wrote are not tried. A pass is then written into qa/replay-checkpoints.json by
// tools/sweep-replay-checkpoints.mjs --adopt <results.jsonl>, which copies the relabelled save into
// qa/fixtures/replay-checkpoints/ (small JSON only).
import { spawn, execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const args = process.argv.slice(2);
const flag = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const positional = args.filter((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));

function relabel(save, letter) {
  const copy = JSON.parse(JSON.stringify(save));
  copy.name = copy.name.replace(/SAVGAM[A-J]/, `SAVGAM${letter}`);
  if (copy.party) copy.party = Object.fromEntries(Object.entries(copy.party).map(([k, v]) => [k.replace(/CHRDAT[A-J]/, `CHRDAT${letter}`), v]));
  return copy;
}

function candidates() {
  const found = new Map();
  const walk = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) { if (entry.name !== "replay-checkpoints") walk(path); continue; }
      if (!/^[A-J]\.json$/.test(entry.name)) continue;
      let save;
      try { save = JSON.parse(readFileSync(path, "utf8")); } catch { continue; }
      if (save.version !== 1 || typeof save.data !== "string") continue;
      const id = createHash("sha1").update(save.data).update(JSON.stringify(save.party ?? {})).digest("hex").slice(0, 12);
      if (!found.has(id)) found.set(id, { id, path, save });
    }
  };
  walk("qa/fixtures");
  return [...found.values()];
}

if (args.includes("--adopt")) {
  const results = readFileSync(flag("--adopt"), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line));
  const registryPath = "qa/replay-checkpoints.json";
  const registry = JSON.parse(readFileSync(registryPath, "utf8"));
  const pool = new Map(candidates().map(c => [c.id, c]));
  mkdirSync("qa/fixtures/replay-checkpoints", { recursive: true });
  let adopted = 0;
  for (const r of results.filter(r => r.exit === 0 && !registry.checkpoints[r.route])) {
    const candidate = pool.get(r.source);
    if (!candidate) continue;
    const file = `qa/fixtures/replay-checkpoints/${r.source}/${r.slot}.json`;
    if (!existsSync(file)) {
      mkdirSync(join("qa/fixtures/replay-checkpoints", r.source), { recursive: true });
      writeFileSync(file, JSON.stringify(relabel(candidate.save, r.slot)));
    }
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

const [chrome, resultsPath] = positional;
if (!chrome || !resultsPath) { console.error("usage: sweep-replay-checkpoints.mjs <chrome> <results.jsonl> [--workers N] [--only regex]"); process.exit(2); }
const workers = Number(flag("--workers", "12"));
const only = flag("--only") ? new RegExp(flag("--only")) : undefined;
const basePort = Number(flag("--base-port", "44000"));
const timeoutSeconds = Number(flag("--timeout", "240"));

const rows = JSON.parse(execFileSync("npx", ["tsx", "tools/qa-replay-checkpoints.ts", "--json"], { encoding: "utf8", maxBuffer: 1 << 26 }));
const done = new Set(existsSync(resultsPath) ? readFileSync(resultsPath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line)).filter(r => r.exit === 0 || r.exit === "none").map(r => r.route) : []);
const todo = rows.filter(row => row.status === "missing" && !done.has(row.name) && !/-(reload|save)$/.test(row.name) && (!only || only.test(row.name)));
const pool = candidates();
console.log(`${todo.length} routes to try against ${pool.length} distinct saves, ${workers} workers`);

const scratch = "/dev/shm/sweep";
mkdirSync(scratch, { recursive: true });
let next = 0;
let passes = 0;

function run(route, letter, candidate, worker) {
  return new Promise(resolve => {
    const dir = join(scratch, `w${worker}`);
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `${letter}.json`);
    writeFileSync(file, JSON.stringify(relabel(candidate.save, letter)));
    const started = Date.now();
    const child = spawn(process.execPath, ["tools/verify-slums-presentation.mjs", file, chrome, route.name], {
      env: { ...process.env, POR_PLAY_PORT: String(basePort + worker), POR_PRESENTATION_OUTPUT_DIR: join(dir, "out") },
      detached: true, stdio: ["ignore", "pipe", "pipe"],
    });
    let tail = "";
    const keep = chunk => { tail = (tail + chunk).slice(-4000); };
    child.stdout.on("data", keep); child.stderr.on("data", keep);
    const timer = setTimeout(() => { try { process.kill(-child.pid, "SIGKILL"); } catch {} }, timeoutSeconds * 1000);
    child.on("close", code => {
      clearTimeout(timer);
      try { process.kill(-child.pid, "SIGKILL"); } catch {}
      const error = code === 0 ? "" : (tail.split("\n").find(line => /Error|assert/i.test(line)) ?? tail.trim().split("\n").pop() ?? "").slice(0, 200);
      resolve({ exit: code, seconds: Math.round((Date.now() - started) / 1000), error });
    });
  });
}

async function worker(index) {
  while (next < todo.length) {
    const route = todo[next++];
    const letters = route.slot ? [route.slot] : ["A", "B"];
    let passed = false;
    for (const candidate of pool) {
      for (const letter of letters) {
        const result = await run(route, letter, candidate, index);
        appendFileSync(resultsPath, JSON.stringify({ route: route.name, slot: letter, source: candidate.id, from: relative(".", candidate.path), ...result }) + "\n");
        if (result.exit === 0) { passed = true; passes++; break; }
        if (/No BIOS key|Option does not apply|Unknown route/i.test(result.error)) break;
      }
      if (passed) break;
    }
    if (!passed) appendFileSync(resultsPath, JSON.stringify({ route: route.name, exit: "none", seconds: 0, error: "no saved game passes" }) + "\n");
  }
}
await Promise.all(Array.from({ length: workers }, (_, i) => worker(i)));
console.log(`done: ${passes} routes pass from a committed save`);
