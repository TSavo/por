import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { detectGameVersion } from "../src/runtime/bindings.js";
import { findGameRoot } from "./gamedata.js";
import { translationCoverage, type GameVersion } from "./translation-coverage.js";

// Every procedure in the original program needs a translated counterpart.
// Add a missing procedure by running `npm run translate`, never by hand.
//
//   tsx tools/verify-translation-coverage.ts          the build in POR_GAMEDATA, whichever it is
//   tsx tools/verify-translation-coverage.ts 1.3      version 1.3 in POR_GAMEDATA_1_3

const root = process.argv[2] === "1.3"
  ? resolve(process.env.POR_GAMEDATA_1_3 ?? "../por-assets/gog-1.3/POOLRAD")
  : findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const version: GameVersion = detectGameVersion(new Uint8Array(readFileSync(join(root, "GAME.OVR"))));
const { total, resident, slices, missing } = await translationCoverage(root, version);
if (missing.length) {
  console.error(`${missing.length} of ${total} original procedures have no translation:`);
  for (const line of missing) console.error(`  ${line}`);
  console.error("Run `npm run translate` to regenerate the translation from the original files.");
  process.exit(1);
}
console.log(`verified a translation for all ${total} original procedures of version ${version} ` +
  `(${resident} resident, ${total - resident} in ${slices} overlay slices)`);
