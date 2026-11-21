import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Effect { id: string; index: number; file: string; targetSeconds: number; prompt: string }
const plan = JSON.parse(readFileSync(new URL("../src/audio/enhanced-sounds.json", import.meta.url), "utf8")) as {
  provider: string; endpoint: string; model: string; outputFormat: string; promptInfluence: number;
  effects: Effect[];
};
const originals = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as {
  events: Array<{ id: string; index: number; kind: string; reachable?: boolean; enhancedFile?: string;
    enhancedStatus?: string; enhancedSha256?: string }>;
};

assert.equal(plan.provider, "ElevenLabs Sound Effects");
assert.equal(plan.endpoint, "https://api.elevenlabs.io/v1/sound-generation");
assert.equal(plan.model, "eleven_text_to_sound_v3");
assert.equal(plan.outputFormat, "pcm_44100");
assert(plan.promptInfluence >= 0 && plan.promptInfluence <= 1);
assert.equal(new Set(plan.effects.map(({ id }) => id)).size, plan.effects.length);
assert.equal(new Set(plan.effects.map(({ index }) => index)).size, plan.effects.length);
assert.equal(new Set(plan.effects.map(({ file }) => file)).size, plan.effects.length);

const reachableEffects = originals.events.filter(({ kind, reachable }) => kind === "effect" && reachable !== false);
assert.deepEqual(plan.effects.map(({ index }) => index).sort((a, b) => a - b),
  reachableEffects.map(({ index }) => index).sort((a, b) => a - b));
for (const effect of plan.effects) {
  assert(effect.prompt.length > 20 && effect.prompt.length <= 450,
    `${effect.id} prompt must be 21..450 characters`);
  assert(effect.targetSeconds > 0 && effect.targetSeconds <= 30, `${effect.id} target duration is invalid`);
  const original = reachableEffects.find(({ index }) => index === effect.index);
  assert(original, `${effect.id} has no reachable original event`);
  assert.equal(effect.id, original.id);
  assert.equal(effect.file, original.enhancedFile);
  assert(["awaiting-elevenlabs-generation", "generated-elevenlabs-awaiting-review", "approved-elevenlabs",
    "approved-elevenlabs-edited"].includes(
    original.enhancedStatus ?? ""));
}

const directory = resolve(process.env.POR_ENHANCED_AUDIO_DIR ?? "../por-assets/enhanced");
const present = plan.effects.filter(({ file }) => existsSync(resolve(directory, file)));
for (const effect of plan.effects) {
  const original = reachableEffects.find(({ index }) => index === effect.index)!;
  const path = resolve(directory, effect.file);
  if (existsSync(path)) {
    const wave = readFileSync(resolve(directory, effect.file));
    const view = new DataView(wave.buffer, wave.byteOffset, wave.byteLength);
    assert.equal(wave.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(wave.subarray(8, 12).toString("ascii"), "WAVE");
    assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1);
    assert.equal(view.getUint32(24, true), 44_100); assert.equal(view.getUint16(34, true), 16);
    const seconds = view.getUint32(40, true) / 2 / 44_100;
    assert(Math.abs(seconds - effect.targetSeconds) <= 1 / 44_100, `${effect.id} duration mismatch`);
    assert(original.enhancedStatus?.startsWith("approved-"), `${effect.id} exists without approval`);
    assert.equal(createHash("sha256").update(wave).digest("hex"), original.enhancedSha256,
      `${effect.id} hash does not match approved master`);
  } else {
    assert(!original.enhancedStatus?.startsWith("approved-"), `${effect.id} approved master is missing`);
  }
}
const scores = originals.events.filter(event => event.kind === "score" && event.reachable);
assert.deepEqual(scores.map(({ index }) => index).sort((a, b) => a - b), [13, 14]);
for (const score of scores) {
  assert.equal(score.enhancedStatus, "approved-elevenlabs-music");
  const file = score.enhancedFile;
  assert(file && file.endsWith(".mp3"), `${score.id} has no approved music file`);
  const mp3 = readFileSync(resolve(directory, file));
  assert(mp3.subarray(0, 3).toString("ascii") === "ID3" || (mp3[0] === 0xff && (mp3[1]! & 0xe0) === 0xe0),
    `${score.id} is not an MP3`);
  assert.equal(createHash("sha256").update(mp3).digest("hex"), score.enhancedSha256,
    `${score.id} hash does not match approved master`);
}
console.log(`verified ${present.length} approved effects and ${scores.length} approved music cues`);
