import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface Effect { id: string; index: number; file: string; targetSeconds: number; prompt: string }
interface Manifest { endpoint: string; model: string; outputFormat: string; promptInfluence: number; effects: Effect[] }
const manifest = JSON.parse(readFileSync(new URL("../src/audio/enhanced-sounds.json", import.meta.url), "utf8")) as Manifest;
const generate = process.argv.includes("--generate");
const onlyArg = process.argv.find((arg) => arg.startsWith("--only="))?.split("=")[1];
const selectedIndex = onlyArg === undefined ? undefined : Number(onlyArg);
const batch = process.argv.find((arg) => arg.startsWith("--batch="))?.split("=")[1] ??
  new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const outputArg = process.argv.find((arg) => !arg.startsWith("--") && arg !== process.argv[0] && arg !== process.argv[1]);
const output = resolve(outputArg ?? "audio/enhanced", "candidates", batch);
const key = process.env.ELEVENLABS_API_KEY;

if (!generate) {
  for (const effect of manifest.effects)
    console.log(`${effect.index.toString().padStart(2)} ${effect.id} (${effect.targetSeconds}s reference)\n  ${effect.prompt}`);
  console.log("Dry run only. Generation requires --generate --only=<event> and ELEVENLABS_API_KEY.");
  process.exit(0);
}
if (!Number.isInteger(selectedIndex)) throw new Error("--generate requires exactly one --only=<event> selection");
const effect = manifest.effects.find(({ index }) => index === selectedIndex);
if (!effect) throw new Error(`No Enhanced effect specification for event ${selectedIndex}`);
if (!key) throw new Error("ELEVENLABS_API_KEY is required with --generate");
mkdirSync(output, { recursive: true });

const generationSeconds = Math.max(.5, effect.targetSeconds);
const url = `${manifest.endpoint}?output_format=${encodeURIComponent(manifest.outputFormat)}`;
const response = await fetch(url, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text: effect.prompt, loop: false, duration_seconds: generationSeconds,
    prompt_influence: manifest.promptInfluence, model_id: manifest.model }) });
if (!response.ok) throw new Error(`${effect.id}: ElevenLabs ${response.status} ${await response.text()}`);
const pcm = new Uint8Array(await response.arrayBuffer());
const sampleRate = 44_100;
const pcmBytes = pcm.length & ~1;
const wave = new Uint8Array(44 + pcmBytes);
const view = new DataView(wave.buffer);
const ascii = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) wave[offset + i] = value.charCodeAt(i); };
ascii(0, "RIFF"); view.setUint32(4, wave.length - 8, true); ascii(8, "WAVEfmt ");
view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, pcmBytes, true);
wave.set(pcm.subarray(0, pcmBytes), 44);

const candidateFile = effect.file.replace(/\.wav$/, `-${batch}.wav`);
writeFileSync(join(output, candidateFile), wave);
const provenance = { schema: 2, batch, promoted: false, effects: [{ id: effect.id, index: effect.index,
  file: candidateFile, intendedMasterFile: effect.file, prompt: effect.prompt,
  promptSha256: createHash("sha256").update(effect.prompt).digest("hex"), model: manifest.model,
  outputFormat: manifest.outputFormat, promptInfluence: manifest.promptInfluence,
  requestedSeconds: generationSeconds, returnedSeconds: pcmBytes / 2 / sampleRate,
  referenceSeconds: effect.targetSeconds, characterCost: response.headers.get("character-cost"),
  generatedAt: new Date().toISOString(), sha256: createHash("sha256").update(wave).digest("hex") }] };
writeFileSync(join(output, "elevenlabs-candidate.json"), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`generated untrimmed candidate ${join(output, candidateFile)}`);
