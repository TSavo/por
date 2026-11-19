import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
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
const hasMp3Signature = (bytes: Uint8Array) => bytes.length >= 3 &&
  (Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "ID3" || (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0));
const wait = (milliseconds: number) => new Promise(resolveWait => setTimeout(resolveWait, milliseconds));
for (const item of batch.items) {
  const output = resolve(item.output);
  mkdirSync(dirname(output), { recursive: true });
  const transcript = output.replace(/\.mp3$/i, ".txt");
  if (existsSync(output) && existsSync(transcript)) {
    const existing = readFileSync(output);
    if (hasMp3Signature(existing) && readFileSync(transcript, "utf8") === `${item.text}\n`) {
      console.log(`verified existing ${output}`);
      continue;
    }
  }
  let mp3: Uint8Array | undefined;
  let lastError = "unknown failure";
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(design.selection.savedVoiceId)}?output_format=mp3_44100_128`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ text: `[${item.direction}] ${item.text}`, model_id: batch.model ?? "eleven_v4" })
      });
      if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
      mp3 = new Uint8Array(await response.arrayBuffer());
      if (!hasMp3Signature(mp3)) throw new Error("ElevenLabs response is not a valid MP3");
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < 3) await wait(500 * 2 ** (attempt - 1));
    }
  }
  if (!mp3) throw new Error(`${lastError} for ${output}`);
  const suffix = `.partial-${process.pid}`;
  const outputTemp = `${output}${suffix}`;
  const transcriptTemp = `${transcript}${suffix}`;
  writeFileSync(outputTemp, mp3);
  writeFileSync(transcriptTemp, `${item.text}\n`);
  rmSync(output, { force: true });
  rmSync(transcript, { force: true });
  renameSync(outputTemp, output);
  renameSync(transcriptTemp, transcript);
  const receipt = output.replace(/\.mp3$/i, ".generation.json");
  writeFileSync(receipt, `${JSON.stringify({ schema: 1, provider: "ElevenLabs", model: batch.model ?? "eleven_v4",
    voiceId: design.selection.savedVoiceId, textSha256: createHash("sha256").update(item.text).digest("hex"),
    audioSha256: createHash("sha256").update(mp3).digest("hex"), bytes: mp3.length,
    generatedAt: new Date().toISOString() }, null, 2)}\n`);
  rmSync(outputTemp, { force: true });
  rmSync(transcriptTemp, { force: true });
  console.log(`generated ${output}`);
}
