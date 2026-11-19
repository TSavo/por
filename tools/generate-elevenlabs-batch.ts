import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface NarratorDesign { selection: { savedVoiceId?: string | null; approvedByOwner: boolean } }
interface Batch { model?: string; items: Array<{ output: string; text: string; direction: string }> }
const manifestPath = process.argv[2];
if (!manifestPath) throw new Error("Usage: generate-elevenlabs-batch <manifest.json>");
const batch = JSON.parse(readFileSync(resolve(manifestPath), "utf8")) as Batch;
const design = JSON.parse(readFileSync(new URL("../src/audio/narrator-voice-design.json", import.meta.url), "utf8")) as NarratorDesign;
if (!design.selection.approvedByOwner || !design.selection.savedVoiceId) throw new Error("An approved narrator voice is required");
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is required");
for (const item of batch.items) {
  const output = resolve(item.output);
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(design.selection.savedVoiceId)}?output_format=mp3_44100_128`, {
    method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ text: `[${item.direction}] ${item.text}`, model_id: batch.model ?? "eleven_v4" })
  });
  if (!response.ok) throw new Error(`ElevenLabs ${response.status} for ${output}: ${await response.text()}`);
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, new Uint8Array(await response.arrayBuffer()));
  writeFileSync(output.replace(/\.mp3$/i, ".txt"), `${item.text}\n`);
  console.log(output);
}
