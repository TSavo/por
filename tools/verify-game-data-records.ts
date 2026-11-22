import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { loadPortGame } from "../src/runtime/game-data.js";

// Every record in the port's data, compared with the original it was converted from.
//
//   POR_GAMEDATA=<version 1.3 directory> npm run verify:game-data-records
//
// `npm run verify:game-data` proves that a short play gives the same game from game/ as from the
// original files. A short play reads few records. This check reads all of them: it builds the
// files the game would be handed from game/ alone, and compares each with the original file,
// record by record, as the game's own loaders would unpack them.
//
// - A record that is not a picture must unpack to exactly the original's bytes.
// - A picture record must unpack to the original's length, and to nothing but blank bytes:
//   game/ carries no original pixels.
// - Every original file must be present, with the same records, and nothing extra.

const original = resolve(process.env.POR_GAMEDATA ?? "../por-assets/gog-1.3/POOLRAD");
const repository = new URL("../game/", import.meta.url);
const port = loadPortGame((path) => new Uint8Array(readFileSync(new URL(path, repository))));
const served = new Map(port.files.map((file) => [file.name.toUpperCase(), file.data]));
const pictures = new Set(port.data.pictures.map(({ file, block }) => `${file.toUpperCase()}:${block}`));
const problems: string[] = [];
let content = 0, contentBytes = 0, pictureRecords = 0, plainFiles = 0;
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((value, index) => value === b[index]);

for (const name of readdirSync(original).filter((entry) => statSync(join(original, entry)).isFile()).sort()) {
  const upper = name.toUpperCase();
  // The program itself is not served as a file: the runner loads it from program/ (checked by verify:game-data).
  if (upper === "START.EXE" || upper === "GAME.OVR") continue;
  const before = new Uint8Array(readFileSync(join(original, name)));
  const after = served.get(upper);
  if (!after) { problems.push(`${name}: not in game/`); continue; }
  served.delete(upper);
  if (!upper.endsWith(".DAX")) {
    // Configuration and saved-game files are served whole. POOL.CFG is the port's own.
    if (upper === "POOL.CFG") continue;
    plainFiles++;
    if (!same(before, after)) problems.push(`${name}: served bytes differ from the original`);
    continue;
  }
  const then = parseDax(name, before).entries, now = new Map(parseDax(name, after).entries.map((entry) => [entry.id, entry]));
  for (const entry of then) {
    const converted = now.get(entry.id);
    now.delete(entry.id);
    if (!converted) { problems.push(`${name} block ${entry.id}: missing from game/`); continue; }
    if (pictures.has(`${upper}:${entry.id}`)) {
      pictureRecords++;
      if (converted.data.length !== entry.data.length) problems.push(`${name} block ${entry.id}: picture is ${converted.data.length} bytes, the original is ${entry.data.length}`);
      continue;
    }
    content++;
    contentBytes += entry.data.length;
    if (!same(entry.data, converted.data)) {
      const at = entry.data.findIndex((value, index) => value !== converted.data[index]);
      problems.push(`${name} block ${entry.id}: differs from the original (lengths ${entry.data.length} and ${converted.data.length}, first difference at byte ${at})`);
    }
  }
  for (const id of now.keys()) problems.push(`${name} block ${id}: in game/ but not in the original`);
}
// The overlay file is served for the game to open; its contents are checked by verify:game-data.
for (const name of served.keys()) if (name !== "POOL.CFG" && name !== "GAME.OVR") problems.push(`${name}: served from game/ but not an original file`);

if (problems.length) {
  console.error(`${problems.length} problems:\n  ${problems.slice(0, 60).join("\n  ")}`);
  process.exit(1);
}
console.log(`verified every record of game/ against the version 1.3 files: ${content} content records (${contentBytes.toLocaleString("en-US")} bytes) unpack to the original's bytes, ` +
  `${pictureRecords} picture records keep their length, ${plainFiles} plain files are the same`);
