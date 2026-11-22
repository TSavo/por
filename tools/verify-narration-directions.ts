import { readdirSync, readFileSync } from "node:fs";
import { directionTags, sentDirection } from "./narration-direction.js";

// Every direction in every generation queue must be sendable as a plain manner.
//
//   npm run verify-narration-directions
//
// See tools/narration-direction.ts for why. This fails on a new direction written as an
// instruction with no manner in src/audio/direction-tags.json, and on a table entry no queue uses.

const audio = new URL("../src/audio/", import.meta.url);
const used = new Map<string, number>();
for (const name of readdirSync(audio).filter((file) => /generation-queue.*\.json$/.test(file)))
  for (const item of (JSON.parse(readFileSync(new URL(name, audio), "utf8")) as { items?: Array<{ direction: string }> }).items ?? [])
    used.set(item.direction, (used.get(item.direction) ?? 0) + 1);
const problems: string[] = [];
let asWritten = 0, throughTable = 0;
for (const [direction, count] of used) {
  try {
    if (sentDirection(direction) === direction) asWritten += count; else throughTable += count;
  } catch (error) { problems.push(`${count} recordings: ${(error as Error).message}`); }
}
for (const direction of Object.keys(directionTags)) {
  if (!used.has(direction)) problems.push(`src/audio/direction-tags.json has a manner for a direction no queue uses: ${direction}`);
}
if (problems.length) { console.error(`${problems.length} problems:\n  ${problems.join("\n  ")}`); process.exit(1); }
console.log(`verified ${used.size} directions over ${asWritten + throughTable} queued recordings: ${asWritten} are sent as written, ` +
  `${throughTable} through ${Object.keys(directionTags).length} hand-written manners`);
