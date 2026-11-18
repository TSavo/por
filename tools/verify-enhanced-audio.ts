import { strict as assert } from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Effect { id: string; index: number; file: string; targetSeconds: number; prompt: string }
const plan = JSON.parse(readFileSync(new URL("../src/audio/enhanced-sounds.json", import.meta.url), "utf8")) as {
  provider: string; endpoint: string; model: string; outputFormat: string; promptInfluence: number;
  effects: Effect[];
};
const originals = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as {
  events: Array<{ id: string; index: number; kind: string; reachable?: boolean; enhancedFile?: string;
    enhancedStatus?: string }>;
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
  assert(["awaiting-elevenlabs-generation", "generated-elevenlabs-awaiting-review", "approved-elevenlabs"].includes(
    original.enhancedStatus ?? ""));
}

const directory = resolve(process.env.POR_ENHANCED_AUDIO_DIR ?? "../por-assets/enhanced");
const present = plan.effects.filter(({ file }) => existsSync(resolve(directory, file)));
assert(present.length === 0 || present.length === plan.effects.length,
  `partial ElevenLabs suite: ${present.length}/${plan.effects.length} files exist`);
if (present.length) {
  const provenancePath = resolve(directory, "elevenlabs-generation.json");
  assert(existsSync(provenancePath), "generated ElevenLabs suite needs provenance");
  const provenance = JSON.parse(readFileSync(provenancePath, "utf8")) as {
    effects: Array<{ id: string; file: string; sha256: string }>;
  };
  for (const effect of plan.effects) {
    const wave = readFileSync(resolve(directory, effect.file));
    const view = new DataView(wave.buffer, wave.byteOffset, wave.byteLength);
    assert.equal(wave.subarray(0, 4).toString("ascii"), "RIFF");
    assert.equal(wave.subarray(8, 12).toString("ascii"), "WAVE");
    assert.equal(view.getUint16(20, true), 1); assert.equal(view.getUint16(22, true), 1);
    assert.equal(view.getUint32(24, true), 44_100); assert.equal(view.getUint16(34, true), 16);
    const seconds = view.getUint32(40, true) / 2 / 44_100;
    assert(Math.abs(seconds - effect.targetSeconds) <= 1 / 44_100, `${effect.id} duration mismatch`);
    assert(provenance.effects.some(({ id, file, sha256 }) => id === effect.id && file === effect.file && sha256.length === 64),
      `${effect.id} missing provenance`);
  }
}
console.log(`verified ElevenLabs plan for ${plan.effects.length} effects${present.length ? " and generated WAV suite" : " (awaiting generation)"}`);
