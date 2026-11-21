import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface VoiceLine { id: string; type: "dialogue" | "narration"; speaker: string; subtitle: string;
  file: string; match?: string; scene?: string; timing?: { startMs: number; endMs: number }; status: string }
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
  selection: { generatedVoiceId: string | null; savedVoiceId?: string | null; approvedByOwner: boolean };
  production?: { provider: string; model: string; delivery: string };
  fishAnchor: { targetSeconds: string; audioFile: string | null; transcriptFile: string | null;
    fishSpeaker: number; status: string };
};
const fishRuntime = JSON.parse(readFileSync(new URL("../src/audio/fish-runtime.json", import.meta.url), "utf8")) as {
  productionModel: string;
  qualityBaseline: { runtime: string; model: string; status: string };
  localProfile: { hardware: { gpu: string; vramMiB: number; systemRamGiB: number }; runtime: string;
    repository: string; weights: string; expertOffload: boolean; expectedVramGiB: number; status: string; limitations: string[] };
  acceptance: { sameAnchorReference: boolean; exactPromptText: boolean; compareAgainstHosted: boolean; checks: string[] };
};
const dispositions = JSON.parse(readFileSync(new URL("../src/audio/voice-dispositions.json", import.meta.url), "utf8")) as {
  sourceEntries: number; counts: Record<string, number>;
  entries: { sourceId: string; disposition: string; selectionId: string | null; ruleId: string | null }[];
};
assert.equal(manifest.enhancedOnly, true);
assert.equal(new Set(manifest.lines.map(({ id }) => id)).size, manifest.lines.length);
assert(!manifest.lines.some(line => line.scene === "scene:title"), "title screen must not trigger speech");
const speakers = new Set(manifest.casting.map(({ speaker }) => speaker));
const directory = resolve(process.env.POR_VOICE_DIR ?? "audio/voices");
for (const line of manifest.lines) {
  assert(line.id.startsWith("por."));
  assert(speakers.has(line.speaker), `missing casting entry for ${line.speaker}`);
  assert(line.subtitle.trim());
  assert(line.match || line.scene, `${line.id} needs a runtime trigger`);
  if (line.timing) assert(line.timing.endMs > line.timing.startMs);
  const path = resolve(directory, line.file);
  assert(existsSync(path), `missing voice asset ${path}`);
  const audio = readFileSync(path);
  const isWav = audio.subarray(0, 4).toString("ascii") === "RIFF";
  const isMp3 = audio.subarray(0, 3).toString("ascii") === "ID3" ||
    (audio[0] === 0xff && (audio[1]! & 0xe0) === 0xe0);
  assert(isWav || isMp3, `${line.id} has no valid WAV/MP3 signature`);
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
assert(["awaiting-owner-approval", "owner-approved-for-preview-generation", "previews-generated-awaiting-owner-selection",
  "voice-selected"].includes(narratorDesign.status));
assert(narratorDesign.voiceDescription.length >= 20 && narratorDesign.voiceDescription.length <= 1000);
assert(narratorDesign.previewText.length >= 100 && narratorDesign.previewText.length <= 1000);
assert(narratorDesign.designParameters.guidanceScale >= 0 && narratorDesign.designParameters.guidanceScale <= 100);
assert(narratorDesign.designParameters.loudness >= -1 && narratorDesign.designParameters.loudness <= 1);
assert.equal(narratorDesign.designParameters.previewCount, 3);
if (narratorDesign.status === "voice-selected") {
  assert(narratorDesign.selection.generatedVoiceId);
  assert.equal(narratorDesign.selection.savedVoiceId, narratorDesign.selection.generatedVoiceId);
  assert.equal(narratorDesign.selection.approvedByOwner, true);
  assert.equal(narratorDesign.production?.provider, "ElevenLabs");
  assert.equal(narratorDesign.production?.model, "eleven_v4");
} else {
  assert.equal(narratorDesign.selection.generatedVoiceId, null);
  assert.equal(narratorDesign.selection.approvedByOwner, false);
}
assert.equal(narratorDesign.fishAnchor.fishSpeaker, 0);
assert(["not-generated", "generated-awaiting-owner-approval"].includes(narratorDesign.fishAnchor.status));
assert(fishRuntime.productionModel.startsWith("Not production"));
assert.equal(fishRuntime.qualityBaseline.status, "evaluated-and-rejected-for-production");
assert.equal(fishRuntime.qualityBaseline.model, "drama-3");
assert.equal(fishRuntime.localProfile.hardware.gpu, "NVIDIA GeForce RTX 3070");
assert.equal(fishRuntime.localProfile.hardware.vramMiB, 8192);
assert(fishRuntime.localProfile.hardware.systemRamGiB >= 64);
assert.equal(fishRuntime.localProfile.runtime, "Shared voice-stack Fish HTTP service");
assert(fishRuntime.localProfile.repository.startsWith("https://github.com/"));
assert.equal(fishRuntime.localProfile.expertOffload, true);
assert(fishRuntime.localProfile.expectedVramGiB < fishRuntime.localProfile.hardware.vramMiB / 1024);
assert.equal(fishRuntime.localProfile.status, "installed-and-smoke-tested-on-battleaxe");
assert(fishRuntime.localProfile.limitations.length >= 3);
assert.deepEqual([fishRuntime.acceptance.sameAnchorReference, fishRuntime.acceptance.exactPromptText,
  fishRuntime.acceptance.compareAgainstHosted], [true, true, true]);
assert(fishRuntime.acceptance.checks.length >= 6);
assert.equal(dispositions.sourceEntries, inventory.lines.length);
assert.equal(dispositions.entries.length, inventory.lines.length);
assert.equal(new Set(dispositions.entries.map(({ sourceId }) => sourceId)).size, inventory.lines.length);
assert.equal(Object.values(dispositions.counts).reduce((sum, count) => sum + count, 0), inventory.lines.length);
const dispositionBySource = new Map(dispositions.entries.map((entry) => [entry.sourceId, entry]));
for (const selection of plan.selections) {
  const disposition = dispositionBySource.get(selection.sourceId);
  assert.equal(disposition?.disposition, "selected");
  assert.equal(disposition.selectionId, selection.id);
}
for (const entry of dispositions.entries) {
  assert(["selected", "unvoiced-routine-interface", "pending-editorial-review"].includes(entry.disposition));
  if (entry.disposition === "unvoiced-routine-interface") assert(entry.ruleId);
}
console.log(`verified ${inventory.lines.length} legacy source entries, ${fishPrompts.promptCount} archived Drama 3 prompts, and ${manifest.lines.length} production runtime recordings`);
