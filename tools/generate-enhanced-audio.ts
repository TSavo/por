import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface Effect { id: string; index: number; file: string; targetSeconds: number; prompt: string }
interface Manifest { provider: string; endpoint: string; model: string; outputFormat: string;
  promptInfluence: number; effects: Effect[] }
const manifest = JSON.parse(readFileSync(new URL("../src/audio/enhanced-sounds.json", import.meta.url), "utf8")) as Manifest;
const generate = process.argv.includes("--generate");
const outputArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
const output = resolve(outputArg ?? "../por-assets/enhanced");
const key = process.env.ELEVENLABS_API_KEY;

if (!generate) {
  for (const effect of manifest.effects)
    console.log(`${effect.index.toString().padStart(2)} ${effect.id} -> ${effect.file} (${effect.targetSeconds}s)\n  ${effect.prompt}`);
  console.log("Dry run only. Pass --generate and set ELEVENLABS_API_KEY to create billed ElevenLabs assets.");
  process.exit(0);
}
if (!key) throw new Error("ELEVENLABS_API_KEY is required with --generate");
mkdirSync(output, { recursive: true });

function waveFromPcm(pcm: Uint8Array, targetSeconds: number) {
  const sampleRate = 44_100;
  const targetBytes = Math.min(pcm.length & ~1, Math.round(targetSeconds * sampleRate) * 2);
  const bytes = new Uint8Array(44 + targetBytes);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  ascii(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, targetBytes, true);
  bytes.set(pcm.subarray(0, targetBytes), 44);
  const fadeSamples = Math.min(Math.round(sampleRate * .012), targetBytes / 2);
  for (let i = 0; i < fadeSamples; i++) {
    const offset = 44 + targetBytes - (fadeSamples - i) * 2;
    view.setInt16(offset, Math.round(view.getInt16(offset, true) * (1 - i / fadeSamples)), true);
  }
  return bytes;
}

const provenance: Array<Record<string, unknown>> = [];
for (const effect of manifest.effects) {
  const generationSeconds = Math.max(.5, effect.targetSeconds);
  const url = `${manifest.endpoint}?output_format=${encodeURIComponent(manifest.outputFormat)}`;
  const response = await fetch(url, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text: effect.prompt, loop: false, duration_seconds: generationSeconds,
      prompt_influence: manifest.promptInfluence, model_id: manifest.model }) });
  if (!response.ok) throw new Error(`${effect.id}: ElevenLabs ${response.status} ${await response.text()}`);
  const pcm = new Uint8Array(await response.arrayBuffer());
  const wave = waveFromPcm(pcm, effect.targetSeconds);
  writeFileSync(join(output, effect.file), wave);
  provenance.push({ id: effect.id, index: effect.index, file: effect.file, prompt: effect.prompt,
    promptSha256: createHash("sha256").update(effect.prompt).digest("hex"), model: manifest.model,
    outputFormat: manifest.outputFormat, promptInfluence: manifest.promptInfluence,
    requestedSeconds: generationSeconds, targetSeconds: effect.targetSeconds,
    characterCost: response.headers.get("character-cost"), generatedAt: new Date().toISOString(),
    sha256: createHash("sha256").update(wave).digest("hex") });
  console.log(`generated ${effect.file}`);
}
writeFileSync(join(output, "elevenlabs-generation.json"), `${JSON.stringify({ schema: 1, effects: provenance }, null, 2)}\n`);
