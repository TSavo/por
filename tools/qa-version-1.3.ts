import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { originalDriverLayout, renderOriginalSoundDriver } from "../src/audio/original-driver.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { parseDax } from "../src/lib/dax.js";
import { translationCoverage } from "./translation-coverage.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { runningScriptAddress } from "../src/runtime/bindings.js";
import { findGameRoot } from "./gamedata.js";

// The move to version 1.3, measured.
//
//   npm run qa:version-1.3
//
// The goal: the port runs version 1.3, passes every check the current build
// passes, and all authored work carries over: artwork, narration, the
// journal, fast travel and the maps. This report counts what is left in each
// part and fails while anything is left.
//
// Point POR_GAMEDATA at the first release and POR_GAMEDATA_1_3 at version
// 1.3 (default: ../por-assets/gog-1.3/POOLRAD). The report runs every check
// itself, on 1.3, each time: about half an hour, most of it the campaign in
// Chrome. It needs POR_CHROME, and POR_PYTHON with capstone and unicorn.
//
//   npm run qa:version-1.3 -- --skip-checks   the measured parts only; the checks count as not passed

const found = findGameRoot();
if (!found) throw new Error("Pool of Radiance game data not found");
const current: string = found;
const target = resolve(process.env.POR_GAMEDATA_1_3 ?? "../por-assets/gog-1.3/POOLRAD");
if (!existsSync(join(target, "START.EXE"))) throw new Error(`Version 1.3 was not found at ${target}`);
const file = (root: string, name: string) => new Uint8Array(readFileSync(join(root, name)));
const rows: [part: string, done: number, total: number, note: string][] = [];

// 1. Translation: every procedure in the 1.3 program needs a translated counterpart.
const coverage = await translationCoverage(target, "1.3");
rows.push(["Procedures translated", coverage.total - coverage.missing.length, coverage.total,
  `${coverage.resident} resident, ${coverage.total - coverage.resident} in ${coverage.slices} overlay slices`]);

// 2. Script-keyed work: a script position carries over when the script bytes around it are the same in 1.3.
const catalog = JSON.parse(readFileSync(new URL("../src/maps/area-catalog.json", import.meta.url), "utf8")) as
  { areas: { id: number; scriptArchive: string; maps: { id: number }[] }[] };
const scriptForArea = new Map(catalog.areas.map(area => [area.id, area]));
for (const area of catalog.areas) {
  for (const map of area.maps) {
    // Secondary maps retain their parent ECL script after LOAD FILES.
    if (!scriptForArea.has(map.id)) scriptForArea.set(map.id, area);
  }
}
const scripts = new Map<string, Uint8Array>();
const script = (root: string, archive: string, block: number) => {
  const key = `${root}:${archive}:${block}`;
  if (!scripts.has(key)) {
    const entry = parseDax(archive, file(root, archive)).entries.find(({ id }) => id === block);
    scripts.set(key, entry?.data ?? new Uint8Array());
  }
  return scripts.get(key)!;
};
/**
 * A script position works on 1.3 when the host's position mapping (src/runtime/bindings.ts) lands
 * it on the same instruction in 1.3's script. A position in a script that did not change maps to
 * itself and passes the same test. With the mapping switched off, 60 artwork keys and 27
 * narration units fail it.
 */
const walked = new Map<string, Map<number, { opcode: number }>>();
function instructions(root: string, archive: string, block: number) {
  const key = `${root}:${archive}:${block}`;
  if (!walked.has(key)) {
    const data = script(root, archive, block);
    walked.set(key, new Map(data.length < 2 ? [] : disassemble(scriptFromBlock(data)).instructions
      .map(({ address, opcode }) => [address, { opcode }])));
  }
  return walked.get(key)!;
}
function carries(archive: string, block: number, address: number): boolean {
  const there = runningScriptAddress(Number(/\d+/.exec(archive)?.[0]), block, address, "1.3");
  const ours = instructions(current, archive, block).get(address), theirs = instructions(target, archive, block).get(there);
  if (ours || theirs) return ours?.opcode === theirs?.opcode;
  // Not an instruction the linear walk reaches: compare the bytes. A block starts with a two-byte length.
  const before = script(current, archive, block), after = script(target, archive, block);
  return before[address - 0x9900 + 2] === after[there - 0x9900 + 2];
}

let artKeys = 0, artCarried = 0, artScript = 0;
const artMoved: string[] = [];
for (const manifest of ["upgrades/manifest.json", "upgrades/slums/manifest.json"]) {
  const { assets } = JSON.parse(readFileSync(new URL(`../${manifest}`, import.meta.url), "utf8")) as { assets: Record<string, unknown> };
  for (const key of Object.keys(assets)) {
    artKeys++;
    const area = /(?:^|:)area:(\d+):/.exec(key)?.[1];
    const addresses = [...key.matchAll(/:(?:ecl|caller):([0-9a-f]{4})/g)].map(match => Number.parseInt(match[1]!, 16));
    if (!addresses.length || area === undefined) { artCarried++; continue; }
    artScript++;
    const owner = scriptForArea.get(Number(area));
    if (owner && addresses.every(address => carries(owner.scriptArchive, owner.id, address))) artCarried++;
    else artMoved.push(key);
  }
}
rows.push(["Artwork keys that work on 1.3", artCarried, artKeys,
  `${artScript} are keyed by script position; ${artMoved.length} do not land on the same instruction in 1.3`]);

const narration = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as {
  events: { sourceId: string; source: { archive: string; block: number; address: string } }[];
  units: { id: string; triggerSourceId: string; coveredSourceIds: string[] }[];
};
const eventCarries = new Map(narration.events.map(({ sourceId, source }) =>
  [sourceId, carries(source.archive, source.block, Number.parseInt(source.address, 16))]));
const unitsCarried = narration.units.filter(unit =>
  [unit.triggerSourceId, ...unit.coveredSourceIds].every(id => eventCarries.get(id) !== false)).length;
rows.push(["Narration units that work on 1.3", unitsCarried, narration.units.length,
  `${[...eventCarries.values()].filter(Boolean).length} of ${narration.events.length} source events land on the same instruction in 1.3`]);

// 3. The original sound. The renderer must reproduce what the original 1.3 interrupt routine writes to
// the sound hardware. Each event from 2 to 21 is rendered here and compared, write for write, with the
// original bytes run under Unicorn. This needs Python with the unicorn package (POR_PYTHON).
const python = process.env.POR_PYTHON ?? "python3";
const output = resolve("out", "qa-version-1.3");
mkdirSync(output, { recursive: true });
const { image } = loadExecutable(file(target, "START.EXE"));
const layout = originalDriverLayout(image);
const traces: string[] = [];
for (const hardware of ["pc-speaker", "tandy"] as const) {
  for (let event = 2; event <= layout.events; event++) {
    const path = join(output, `${hardware}-${String(event).padStart(2, "0")}.json`);
    writeFileSync(path, JSON.stringify(renderOriginalSoundDriver(image, hardware, event)));
    traces.push(path);
  }
}
const report = join(output, "sound-unicorn.json");
rmSync(report, { force: true });
const validation = spawnSync(python, ["tools/validate-original-driver-unicorn.py", join(target, "START.EXE"), report, ...traces],
  { encoding: "utf8" });
const cases = existsSync(report)
  ? (JSON.parse(readFileSync(report, "utf8")) as { cases: { event: number; exactMatch: boolean }[] }).cases : [];
const exactEvents = Array.from({ length: layout.events - 1 }, (_, index) => index + 2)
  .filter(event => cases.filter(entry => entry.event === event && entry.exactMatch).length === 2).length;
rows.push(["Original sound events exact against 1.3", exactEvents, layout.events - 1,
  cases.length ? "events 2 to 21, PC speaker and Tandy, against the original interrupt routine under Unicorn"
    : `the comparison did not run: ${(validation.error?.message ?? validation.stderr ?? "").trim().split("\n").at(-1)}`]);

// 4. The host's address bindings: no raw program address may remain in the host files.
const table = new URL("../src/runtime/bindings.ts", import.meta.url);
const hostFiles = ["tools/live-input.ts", "tools/boot-translated.ts", "tools/native-exploration.ts", "tools/overland-travel.ts",
  "tools/developer-combat.ts", "tools/combat-art.ts", "src/runtime/adventure-log.ts", "src/runtime/ecl-narration-observer.ts",
  "src/runtime/video.ts", "src/runtime/far.ts", "src/runtime/intr.ts", "src/runtime/sound-trace.ts"];
let rawAddresses = 0;
for (const name of hostFiles) {
  const source = readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
  // A guest address: a memory read or write at a literal offset, or a comparison with a code position.
  rawAddresses += (source.match(/(?:read|write)(?:8|16)\([^,()]+, (?:[^,()]*\+ )?0x[0-9a-f]{3,4}\b|(?:cs|ip|at|Offset|offset|Segment|segment) === 0x[0-9a-f]{2,4}\b|loadedSlices\.find\(\(?\{? ?index ?\}?\)? => index === \d+|slice\.index === \d+/g) ?? []).length;
}
const named = (readFileSync(table, "utf8").match(/"1\.3": /g) ?? []).length;
rows.push(["Host addresses named and mapped for 1.3", named, named + rawAddresses,
  `${rawAddresses} raw addresses remain in ${hostFiles.length} host files`]);

// 5. The checks, run now on version 1.3. Nothing here is read from an earlier run.
// The Chrome checks need POR_CHROME. --skip-checks leaves them out and counts them as not passed.
const chrome = process.env.POR_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const environment = { ...process.env, POR_GAMEDATA: target, POR_CAMPAIGN_OUTPUT_DIR: output,
  POR_AUDIO_DIR: process.env.POR_AUDIO_DIR ?? resolve("..", "por-assets", "original"),
  // The package scripts call `python`. Put the chosen interpreter's directory first.
  PATH: python.includes("/") ? `${dirname(python)}:${process.env.PATH}` : process.env.PATH };
let openingDirectory: string | undefined;
const checks: { name: string; command: () => string[] }[] = [
  { name: "verify", command: () => ["npm", "run", "-s", "verify"] },
  { name: "verify:input", command: () => ["npm", "run", "-s", "verify:input"] },
  { name: "verify:translation-reproducible:1.3", command: () => [python, "tools/tp_translate.py", target, "--game-version", "1.3", "--check"] },
  { name: "verify-voice-master", command: () => ["npm", "run", "-s", "verify-voice-master"] },
  { name: "verify-narration-generation", command: () => ["npm", "run", "-s", "verify-narration-generation"] },
  { name: "verify-narration-runtime", command: () => ["npm", "run", "-s", "verify-narration-runtime"] },
  { name: "verify:campaign-opening", command: () => ["npm", "run", "-s", "verify:campaign-opening", "--", chrome] },
  { name: "verify:map-journal", command: () => ["npm", "run", "-s", "verify:map-journal", "--", chrome, openingDirectory ?? "missing"] },
  { name: "a save from the first release loads and plays on 1.3",
    command: () => ["npm", "run", "-s", "verify:map-journal", "--", chrome, resolve("qa", "fixtures", "first-release-slums-gate")] },
  { name: "verify:campaign --full", command: () => ["npm", "run", "-s", "verify:campaign", "--", chrome, "--full"] },
];
const skip = process.argv.includes("--skip-checks");
const results: Record<string, string> = {};
for (const [index, check] of checks.entries()) {
  if (skip) { results[check.name] = "not run"; continue; }
  const started = Date.now();
  process.stderr.write(`check ${index + 1}/${checks.length}: ${check.name} ... `);
  const [program, ...parameters] = check.command();
  const run = spawnSync(program!, parameters, { encoding: "utf8", env: environment, maxBuffer: 256 * 1024 * 1024 });
  const log = join(output, `${check.name.replace(/[^a-z0-9.]+/gi, "-")}.log`);
  writeFileSync(log, `${run.stdout ?? ""}\n${run.stderr ?? ""}`);
  results[check.name] = run.status === 0 ? "pass" : "fail";
  if (check.name === "verify:campaign-opening") {
    openingDirectory = /campaign opening complete: (.+)$/m.exec(run.stdout ?? "")?.[1]?.trim();
  }
  process.stderr.write(`${results[check.name]} in ${Math.round((Date.now() - started) / 1000)} s (${log})\n`);
}
const passed = checks.filter(({ name }) => results[name] === "pass").length;
rows.push(["Checks passing on 1.3, run now", passed, checks.length,
  skip ? "not run: --skip-checks" : checks.map(({ name }) => `${name}: ${results[name]}`).join("; ")]);

let left = 0;
console.log(`${"part".padEnd(42)} ${"done".padStart(6)} ${"of".padStart(6)} ${"left".padStart(6)}`);
for (const [part, done, total, note] of rows) {
  left += total - done;
  console.log(`${part.padEnd(42)} ${String(done).padStart(6)} ${String(total).padStart(6)} ${String(total - done).padStart(6)}   ${note}`);
}
console.log(`\n${left} left before the port runs version 1.3 with all authored work intact`);
if (process.argv.includes("--list")) console.log(`\nArtwork keys that do not work on 1.3:\n  ${artMoved.join("\n  ")}`);
if (left) process.exit(1);
