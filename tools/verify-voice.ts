import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface VoiceLine { id: string; type: "dialogue" | "narration"; speaker: string; subtitle: string;
  file: string; match?: string; scene?: string; timing: { startMs: number; endMs: number }; status: string }
const manifest = JSON.parse(readFileSync(new URL("../src/audio/voices.json", import.meta.url), "utf8")) as
  { enhancedOnly: boolean; lines: VoiceLine[]; casting: { speaker: string }[] };
const inventory = JSON.parse(readFileSync(new URL("../src/audio/voice-inventory.json", import.meta.url), "utf8")) as {
  enhancedOnly: boolean; lineCount: number; generationPolicy: string;
  lines: { id: string; text: string; suggestedDelivery: string; deliveryConfidence: string;
    source: { archive: string; block: number; address: string };
    reviewStatus: string; assetStatus: string }[];
};
const plan = JSON.parse(readFileSync(new URL("../src/audio/voice-plan.json", import.meta.url), "utf8")) as {
  enhancedOnly: boolean; generationOwner: string;
  runtimePolicy: { originalTextAuthoritative: boolean; blocksGame: boolean; interruptible: boolean;
    skippable: boolean; textFallback: boolean; duplicatePolicy: string };
  selections: { id: string; type: string; speaker: string; conversation: string; sourceId: string;
    text: string; annotations: { text: string; direction: string }[]; status: string }[];
};
const fishPrompts = JSON.parse(readFileSync(new URL("../src/audio/fish-prompts.json", import.meta.url), "utf8")) as {
  provider: string; model: string; promptCount: number;
  prompts: { id: string; sourceId: string; prompt: string; spokenText: string; spokenTextSha256: string; status: string }[];
};
const narratorDesign = JSON.parse(readFileSync(new URL("../src/audio/narrator-voice-design.json", import.meta.url), "utf8")) as {
  designProvider: string; designModel: string; status: string; voiceDescription: string; previewText: string;
  designParameters: { guidanceScale: number; loudness: number; previewCount: number };
  selection: { generatedVoiceId: string | null; approvedByOwner: boolean };
  fishAnchor: { targetSeconds: string; audioFile: string | null; transcriptFile: string | null;
    fishSpeaker: number; status: string };
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
  assert(["narrator-prose", "narrator-performed-quotation", "narrator-with-quoted-character"].includes(line.suggestedDelivery));
  assert.equal(line.deliveryConfidence, "medium");
  assert.equal(line.assetStatus, "not-requested");
}
assert.equal(plan.enhancedOnly, true);
assert.equal(plan.generationOwner, "project-owner");
assert.deepEqual(plan.runtimePolicy, { originalTextAuthoritative: true, blocksGame: false, interruptible: true,
  skippable: true, textFallback: true, duplicatePolicy: "once-per-original-message-id" });
const inventoryById = new Map(inventory.lines.map((line) => [line.id, line]));
for (const selection of plan.selections) {
  const source = inventoryById.get(selection.sourceId);
  assert(source, `${selection.id} references missing source ${selection.sourceId}`);
  assert(source.text.includes(selection.text), `${selection.id} text is not present verbatim in its original source`);
  assert(speakers.has(selection.speaker));
  assert(selection.conversation);
  assert.equal(selection.annotations.map(({ text }) => text).join(""), selection.text);
  assert(selection.annotations.every(({ text, direction }) => text && direction && !/[\[\]]/.test(direction)));
  assert.equal(selection.status, "annotated-prompt-ready");
}
assert.equal(fishPrompts.provider, "Fish Audio");
assert.equal(fishPrompts.model, "drama-3");
assert.equal(fishPrompts.promptCount, plan.selections.length);
for (const prompt of fishPrompts.prompts) {
  const selection = plan.selections.find(({ id }) => id === prompt.id);
  assert(selection);
  assert.equal(prompt.sourceId, selection.sourceId);
  assert.equal(prompt.spokenText, selection.text);
  assert.equal(prompt.spokenTextSha256, createHash("sha256").update(selection.text).digest("hex"));
  assert(prompt.prompt.startsWith("<|speaker:0|>"));
  assert.equal(prompt.status, "annotated-prompt-ready");
}
assert.equal(narratorDesign.designProvider, "ElevenLabs Voice Design");
assert.equal(narratorDesign.designModel, "eleven_ttv_v3");
assert.equal(narratorDesign.status, "awaiting-owner-approval");
assert(narratorDesign.voiceDescription.length >= 20 && narratorDesign.voiceDescription.length <= 1000);
assert(narratorDesign.previewText.length >= 100 && narratorDesign.previewText.length <= 1000);
assert(narratorDesign.designParameters.guidanceScale >= 0 && narratorDesign.designParameters.guidanceScale <= 100);
assert(narratorDesign.designParameters.loudness >= -1 && narratorDesign.designParameters.loudness <= 1);
assert.equal(narratorDesign.designParameters.previewCount, 3);
assert.equal(narratorDesign.selection.generatedVoiceId, null);
assert.equal(narratorDesign.selection.approvedByOwner, false);
assert.equal(narratorDesign.fishAnchor.fishSpeaker, 0);
assert.equal(narratorDesign.fishAnchor.status, "not-generated");
console.log(`verified ${inventory.lines.length} source entries, ${fishPrompts.promptCount} annotated Drama 3 prompts, and ${manifest.lines.length} prototype assets`);
