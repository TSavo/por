import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface Preview { candidate: number; generatedVoiceId: string }
interface PreviewBatch { status: string; previews: Preview[] }
interface NarratorDesign {
  status: string; voiceDescription: string;
  selection: { generatedVoiceId: string | null; savedVoiceId?: string | null; approvedByOwner: boolean };
}

const candidateArg = process.argv.find((argument) => argument.startsWith("--candidate="))?.split("=")[1];
const candidateNumber = Number(candidateArg);
const save = process.argv.includes("--save");
const batchPath = resolve(process.argv.find((argument, index) => index > 1 && !argument.startsWith("--")) ??
  "../por-assets/voices/candidates/narrator-design-review-01/narrator-previews.json");
const designPath = new URL("../src/audio/narrator-voice-design.json", import.meta.url);
const batch = JSON.parse(readFileSync(batchPath, "utf8")) as PreviewBatch;
const design = JSON.parse(readFileSync(designPath, "utf8")) as NarratorDesign;
if (!Number.isInteger(candidateNumber)) throw new Error("Specify exactly one --candidate=1, --candidate=2, or --candidate=3");
const selected = batch.previews.find(({ candidate }) => candidate === candidateNumber);
if (!selected) throw new Error(`Candidate ${candidateNumber} is not present in ${batchPath}`);
console.log(`Candidate ${candidateNumber}: generated voice ${selected.generatedVoiceId}`);
if (!save) {
  console.log("Dry run only. Saving requires the owner's selection, --save, and ELEVENLABS_API_KEY.");
  process.exit(0);
}
if (design.status !== "previews-generated-awaiting-owner-selection")
  throw new Error(`Narrator design status is ${design.status}; refusing to create another saved voice`);
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is required with --save");
const rejected = batch.previews.filter(({ candidate }) => candidate !== candidateNumber)
  .map(({ generatedVoiceId }) => generatedVoiceId);
const response = await fetch("https://api.elevenlabs.io/v1/text-to-voice", { method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify({
    voice_name: "Pool of Radiance Narrator", voice_description: design.voiceDescription,
    generated_voice_id: selected.generatedVoiceId, played_not_selected_voice_ids: rejected,
    labels: { project: "pool-of-radiance", role: "narrator" }
  }) });
if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
const saved = await response.json() as { voice_id: string; name?: string };
design.status = "voice-selected";
design.selection = { generatedVoiceId: selected.generatedVoiceId, savedVoiceId: saved.voice_id, approvedByOwner: true };
writeFileSync(designPath, `${JSON.stringify(design, null, 2)}\n`);
batch.status = "owner-selected";
writeFileSync(batchPath, `${JSON.stringify(batch, null, 2)}\n`);
console.log(`Saved candidate ${candidateNumber} as ElevenLabs voice ${saved.voice_id}`);
