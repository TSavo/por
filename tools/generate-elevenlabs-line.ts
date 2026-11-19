import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface NarratorDesign { selection: { savedVoiceId?: string | null; approvedByOwner: boolean } }
const [outputArg, text, direction = "measured dramatic fantasy narration", model = "eleven_v4"] = process.argv.slice(2);
if (!outputArg || !text) throw new Error("Usage: generate-elevenlabs-line <output.mp3> <text> [direction] [model]");
const design = JSON.parse(readFileSync(new URL("../src/audio/narrator-voice-design.json", import.meta.url), "utf8")) as NarratorDesign;
if (!design.selection.approvedByOwner || !design.selection.savedVoiceId) throw new Error("An approved narrator voice is required");
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is required");
const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(design.selection.savedVoiceId)}?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text: `[${direction}] ${text}`, model_id: model })
});
if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
const output = resolve(outputArg);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, new Uint8Array(await response.arrayBuffer()));
writeFileSync(output.replace(/\.mp3$/i, ".txt"), `${text}\n`);
console.log(output);
