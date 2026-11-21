import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

interface DesignManifest {
  designModel: string;
  status: string;
  voiceDescription: string;
  previewText: string;
  designParameters: { guidanceScale: number; loudness: number; seed: number | null; previewCount: number };
}

const manifest = JSON.parse(readFileSync(new URL("../src/audio/narrator-voice-design.json", import.meta.url), "utf8")) as
  DesignManifest;
const generate = process.argv.includes("--generate");
const outputArg = process.argv.find((argument, index) => index > 1 && !argument.startsWith("--"));
const batch = process.argv.find((argument) => argument.startsWith("--batch="))?.split("=")[1] ??
  new Date().toISOString().replaceAll(":", "-").replace(/\.\d{3}Z$/, "Z");
const output = resolve(outputArg ?? "audio/voices/candidates", `narrator-design-${batch}`);
const key = process.env.ELEVENLABS_API_KEY;

console.log(`Voice description:\n${manifest.voiceDescription}\n\nPreview text:\n${manifest.previewText}`);
if (!generate) {
  console.log("\nDry run only. Generation requires owner approval plus --generate and ELEVENLABS_API_KEY.");
  process.exit(0);
}
if (manifest.status !== "owner-approved-for-preview-generation")
  throw new Error(`Narrator design status is ${manifest.status}; owner approval must be recorded first`);
if (!key) throw new Error("ELEVENLABS_API_KEY is required with --generate");

const endpoint = "https://api.elevenlabs.io/v1/text-to-voice/design?output_format=mp3_44100_128";
const response = await fetch(endpoint, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ voice_description: manifest.voiceDescription, model_id: manifest.designModel,
    text: manifest.previewText, auto_generate_text: false, loudness: manifest.designParameters.loudness,
    guidance_scale: manifest.designParameters.guidanceScale, seed: manifest.designParameters.seed,
    stream_previews: false, should_enhance: false }) });
if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
const result = await response.json() as { text: string; previews: { audio_base_64: string; generated_voice_id: string;
  media_type: string; duration_secs: number; language: string }[] };
if (result.previews.length !== manifest.designParameters.previewCount)
  throw new Error(`Expected ${manifest.designParameters.previewCount} previews, received ${result.previews.length}`);

mkdirSync(output, { recursive: true });
const previews = result.previews.map((preview, index) => {
  const audio = Buffer.from(preview.audio_base_64, "base64");
  const file = `narrator-preview-${index + 1}.mp3`;
  writeFileSync(join(output, file), audio);
  return { candidate: index + 1, file, generatedVoiceId: preview.generated_voice_id,
    mediaType: preview.media_type, durationSeconds: preview.duration_secs, language: preview.language,
    sha256: createHash("sha256").update(audio).digest("hex") };
});
const provenance = { schema: 1, batch, status: "awaiting-owner-selection", endpoint, model: manifest.designModel,
  voiceDescription: manifest.voiceDescription, previewText: result.text,
  parameters: manifest.designParameters, generatedAt: new Date().toISOString(), previews };
writeFileSync(join(output, "narrator-previews.json"), `${JSON.stringify(provenance, null, 2)}\n`);
console.log(`Generated ${previews.length} narrator previews in ${output}`);
