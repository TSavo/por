import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface NarratorDesign {
  status: string;
  selection: { savedVoiceId?: string | null; approvedByOwner: boolean };
  fishAnchor: { targetSeconds: string; source: string; audioFile: string | null; transcriptFile: string | null;
    fishSpeaker: number; status: string };
}
const anchorText = "This was once the chapel of the keep. Inside the doorway are the dried husks of two orcs, their faces twisted with terror. A large altar dominates the southern wall. Beyond the ruined halls, the road lies silent beneath a cold and watchful sky. The company moves onward with measured steps, uncertain what waits beyond the next ancient door.";
const generate = process.argv.includes("--generate");
const designPath = new URL("../src/audio/narrator-voice-design.json", import.meta.url);
const design = JSON.parse(readFileSync(designPath, "utf8")) as NarratorDesign;
const output = resolve(process.argv.find((argument, index) => index > 1 && !argument.startsWith("--")) ??
  "../por-assets/voices/narrator-anchor.wav");
console.log(anchorText);
if (!generate) {
  console.log("Dry run only. Anchor generation requires a selected saved voice, --generate, and ELEVENLABS_API_KEY.");
  process.exit(0);
}
if (design.status !== "voice-selected" || !design.selection.approvedByOwner || !design.selection.savedVoiceId)
  throw new Error("An owner-approved saved narrator voice is required before anchor generation");
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("ELEVENLABS_API_KEY is required with --generate");
const endpoint = `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(design.selection.savedVoiceId)}?output_format=pcm_44100`;
const response = await fetch(endpoint, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text: anchorText, model_id: "eleven_v3" }) });
if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
const pcm = new Uint8Array(await response.arrayBuffer());
const pcmBytes = pcm.length & ~1;
const wave = new Uint8Array(44 + pcmBytes);
const view = new DataView(wave.buffer);
const ascii = (offset: number, value: string) => { for (let index = 0; index < value.length; index++) wave[offset + index] = value.charCodeAt(index); };
ascii(0, "RIFF"); view.setUint32(4, wave.length - 8, true); ascii(8, "WAVEfmt ");
view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
view.setUint32(24, 44_100, true); view.setUint32(28, 88_200, true); view.setUint16(32, 2, true);
view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, pcmBytes, true); wave.set(pcm.subarray(0, pcmBytes), 44);
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, wave);
const transcript = output.replace(/\.wav$/i, ".txt");
writeFileSync(transcript, `${anchorText}\n`);
const provenance = output.replace(/\.wav$/i, ".json");
writeFileSync(provenance, `${JSON.stringify({ schema: 1, provider: "ElevenLabs", model: "eleven_v3",
  savedVoiceId: design.selection.savedVoiceId, text: anchorText, sampleRate: 44_100,
  seconds: pcmBytes / 2 / 44_100, sha256: createHash("sha256").update(wave).digest("hex"),
  generatedAt: new Date().toISOString() }, null, 2)}\n`);
design.fishAnchor.audioFile = "voices/narrator-anchor.wav";
design.fishAnchor.transcriptFile = "voices/narrator-anchor.txt";
design.fishAnchor.status = "generated-awaiting-owner-approval";
writeFileSync(designPath, `${JSON.stringify(design, null, 2)}\n`);
console.log(`Generated narrator anchor ${output}`);
