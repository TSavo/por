import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { loadExecutable } from "./exepack.js";
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
// Point POR_GAMEDATA at the current build and POR_GAMEDATA_1_3 at version
// 1.3 (default: ../por-assets/gog-1.3/POOLRAD).

const found = findGameRoot();
if (!found) throw new Error("Pool of Radiance game data not found");
const current: string = found;
const target = resolve(process.env.POR_GAMEDATA_1_3 ?? "../por-assets/gog-1.3/POOLRAD");
if (!existsSync(join(target, "START.EXE"))) throw new Error(`Version 1.3 was not found at ${target}`);
const file = (root: string, name: string) => new Uint8Array(readFileSync(join(root, name)));
const rows: [part: string, done: number, total: number, note: string][] = [];

// 1. Translation: every procedure in the 1.3 program needs a translated counterpart.
const { image, packed } = loadExecutable(file(target, "START.EXE"));
const overlays = file(target, "GAME.OVR");
const prologues = (code: Uint8Array, from: number, to: number) => {
  let count = 0;
  for (let i = from; i + 2 < to; i++) {
    if (code[i] === 0x55 && ((code[i + 1] === 0x89 && code[i + 2] === 0xe5) || (code[i + 1] === 0x8b && code[i + 2] === 0xec))) count++;
  }
  return count;
};
let residentStart = 0;
let procedures = 0;
let slices = 0;
const seen = new Set<number>();
const word = (i: number) => image[i]! | (image[i + 1]! << 8);
for (let i = 0; i + 32 < image.length; i += 16) {
  if (image[i] !== 0xcd || image[i + 1] !== 0x3f) continue;
  const offset = word(i + 4) | (word(i + 6) << 16), code = word(i + 8), relocation = word(i + 10), entries = word(i + 12);
  if (entries < 1 || entries > 512 || code < 1 || offset < 4 || offset + code + relocation > overlays.length) continue;
  residentStart = Math.max(residentStart, (i + 0x20 + entries * 5 + 15) & ~15);
  if (seen.has(offset)) continue;
  seen.add(offset);
  slices++;
  procedures += prologues(overlays.subarray(offset, offset + code), 0, code);
}
procedures += prologues(image, residentStart, image.length);
const translatedDirectory = new URL("../src/translated-1.3/", import.meta.url);
let translated = 0;
if (existsSync(translatedDirectory)) {
  for (const name of readdirSync(translatedDirectory).filter(name => name.endsWith(".ts"))) {
    translated += (readFileSync(new URL(name, translatedDirectory), "utf8").match(/^export function (?:exe|ovl\d\d)_[0-9a-f]+\(/gm) ?? []).length;
  }
}
rows.push(["Procedures translated", Math.min(translated, procedures), procedures,
  `${packed ? "EXEPACK" : "unpacked"} program, ${slices} overlay slices`]);

// 2. Script-keyed work: a script position carries over when the script bytes around it are the same in 1.3.
const catalog = JSON.parse(readFileSync(new URL("../src/maps/area-catalog.json", import.meta.url), "utf8")) as
  { areas: { id: number; scriptArchive: string }[] };
const archiveOf = new Map(catalog.areas.map(({ id, scriptArchive }) => [id, scriptArchive]));
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
 * Where a script changed length in 1.3, the first position that moved. Addresses inside
 * instructions shift by the length difference, so the walk allows a word to differ by exactly that.
 */
const editPoints = new Map<string, number | undefined>();
function editPoint(archive: string, block: number): number | undefined {
  const key = `${archive}:${block}`;
  if (!editPoints.has(key)) {
    const ours = script(current, archive, block), theirs = script(target, archive, block);
    let point: number | undefined;
    if (ours.length !== theirs.length || ours.some((byte, i) => byte !== theirs[i])) {
      const moved = theirs.length - ours.length;
      let at = 0;
      while (at < ours.length) {
        if (ours[at] === theirs[at]) { at++; continue; }
        const before = ours[at]! | (ours[at + 1]! << 8), after = theirs[at]! | (theirs[at + 1]! << 8);
        if (moved !== 0 && after - before === moved) { at += 2; continue; }
        break;
      }
      point = 0x9900 + at;
    }
    editPoints.set(key, point);
  }
  return editPoints.get(key);
}
/** A script position carries over unchanged when it comes before any edit in its script. */
function carries(archive: string, block: number, address: number): boolean {
  const point = editPoint(archive, block);
  return point === undefined || address < point;
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
    const archive = archiveOf.get(Number(area));
    if (archive && addresses.every(address => carries(archive, Number(area), address))) artCarried++;
    else artMoved.push(key);
  }
}
rows.push(["Artwork keys that work on 1.3", artCarried, artKeys,
  `${artScript} are keyed by script position; ${artMoved.length} sit after the New Phlan edit and must move`]);

const narration = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as {
  events: { sourceId: string; source: { archive: string; block: number; address: string } }[];
  units: { id: string; triggerSourceId: string; coveredSourceIds: string[] }[];
};
const eventCarries = new Map(narration.events.map(({ sourceId, source }) =>
  [sourceId, carries(source.archive, source.block, Number.parseInt(source.address, 16))]));
const unitsCarried = narration.units.filter(unit =>
  [unit.triggerSourceId, ...unit.coveredSourceIds].every(id => eventCarries.get(id) !== false)).length;
rows.push(["Narration units that work on 1.3", unitsCarried, narration.units.length,
  `${[...eventCarries.values()].filter(Boolean).length} of ${narration.events.length} source events are unchanged`]);

// The original sound driver and its data are part of START.EXE and differ in 1.3. Each of the 20 events
// has to be decoded from the 1.3 program, rendered, and checked against the original bytes again.
const soundPath = new URL("../qa/version-1.3-sound.json", import.meta.url);
const soundDone = existsSync(soundPath) ? (JSON.parse(readFileSync(soundPath, "utf8")) as { verifiedEvents: number }).verifiedEvents : 0;
rows.push(["Original sound events verified from 1.3", soundDone, 20, "Classic WAV renders come from the earlier program's driver"]);

// 3. The host's address bindings. Until they live in one named table, count the raw addresses.
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
const named = existsSync(table) ? (readFileSync(table, "utf8").match(/"1\.3": 0x[0-9a-f]+/g) ?? []).length : 0;
rows.push(["Host addresses named and mapped for 1.3", named, named + rawAddresses,
  `${rawAddresses} raw addresses remain in ${hostFiles.length} host files`]);

// 4. The checks that must pass on 1.3. Each records its result in qa/version-1.3-checks.json when it is run on 1.3.
const required = ["verify", "verify:input", "verify:translation-reproducible", "verify:campaign-opening", "verify:campaign --full", "verify:map-journal",
  "a save from the earlier build loads"];
const resultsPath = new URL("../qa/version-1.3-checks.json", import.meta.url);
const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) as Record<string, string> : {};
rows.push(["Checks passing on 1.3", required.filter(name => results[name] === "pass").length, required.length, required.join(", ")]);

let left = 0;
console.log(`${"part".padEnd(42)} ${"done".padStart(6)} ${"of".padStart(6)} ${"left".padStart(6)}`);
for (const [part, done, total, note] of rows) {
  left += total - done;
  console.log(`${part.padEnd(42)} ${String(done).padStart(6)} ${String(total).padStart(6)} ${String(total - done).padStart(6)}   ${note}`);
}
console.log(`\n${left} left before the port runs version 1.3 with all authored work intact`);
if (process.argv.includes("--list")) console.log(`\nArtwork keys to move:\n  ${artMoved.join("\n  ")}`);
if (left) process.exit(1);
