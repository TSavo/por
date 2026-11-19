import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface VoiceLine { id: string; type: "dialogue" | "narration"; speaker: string; subtitle: string;
  file: string; match?: string; scene?: string; timing: { startMs: number; endMs: number }; status: string }
const manifest = JSON.parse(readFileSync(new URL("../src/audio/voices.json", import.meta.url), "utf8")) as
  { enhancedOnly: boolean; lines: VoiceLine[]; casting: { speaker: string }[] };
const inventory = JSON.parse(readFileSync(new URL("../src/audio/voice-inventory.json", import.meta.url), "utf8")) as {
  enhancedOnly: boolean; lineCount: number; generationPolicy: string;
  lines: { id: string; text: string; source: { archive: string; block: number; address: string };
    reviewStatus: string; assetStatus: string }[];
};
assert.equal(manifest.enhancedOnly, true);
assert(manifest.lines.some(({ type }) => type === "dialogue"));
assert(manifest.lines.some(({ type }) => type === "narration"));
assert.equal(new Set(manifest.lines.map(({ id }) => id)).size, manifest.lines.length);
const speakers = new Set(manifest.casting.map(({ speaker }) => speaker));
const directory = resolve(process.env.POR_VOICE_DIR ?? "../por-assets/voices");
for (const line of manifest.lines) {
  assert(line.id.startsWith("por."));
  assert(speakers.has(line.speaker), `missing casting entry for ${line.speaker}`);
  assert(line.subtitle.trim());
  assert(line.match || line.scene, `${line.id} needs a runtime trigger`);
  assert(line.timing.endMs > line.timing.startMs);
  const path = resolve(directory, line.file);
  assert(existsSync(path), `missing voice asset ${path}`);
  const wave = readFileSync(path);
  assert.equal(wave.subarray(0, 4).toString("ascii"), "RIFF");
}
assert.equal(inventory.enhancedOnly, true);
assert.equal(inventory.lineCount, inventory.lines.length);
assert.equal(new Set(inventory.lines.map(({ id }) => id)).size, inventory.lines.length);
assert(inventory.generationPolicy.includes("project owner"));
for (const line of inventory.lines) {
  assert(line.id.startsWith("por.voice.ecl-"));
  assert(line.text.trim());
  assert(/^ECL\d+\.DAX$/.test(line.source.archive));
  assert(line.source.address.startsWith("0x"));
  assert.equal(line.assetStatus, "not-requested");
}
console.log(`verified ${inventory.lines.length} source voice entries and ${manifest.lines.length} prototype assets`);
