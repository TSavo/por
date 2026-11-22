import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { sentDirection } from "./narration-direction.js";

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
// The voice model sometimes says a sentence twice, or drops one, in a take that is otherwise fine.
// Every take is therefore transcribed by a Whisper server and kept only if it says about as many
// words as its script. Set POR_WHISPER_URL (any server with /v1/audio/transcriptions); pass
// --unchecked to generate without listening, which is how the takes that repeated got in.
const whisper = process.env.POR_WHISPER_URL?.replace(/\/$/, "");
if (!whisper && !process.argv.includes("--unchecked"))
  throw new Error("POR_WHISPER_URL is required so every take is listened to; pass --unchecked to skip that");
const words = (text: string) => text.toUpperCase().replace(/[’']/g, "").replace(/[^A-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
async function heardIn(mp3: Uint8Array): Promise<string> {
  const form = new FormData();
  form.append("file", new Blob([Buffer.from(mp3)], { type: "audio/mpeg" }), "take.mp3");
  form.append("model", "whisper-1");
  form.append("language", "en");
  const response = await fetch(`${whisper}/v1/audio/transcriptions`, { method: "POST", body: form });
  if (!response.ok) throw new Error(`The Whisper server answered ${response.status}`);
  return ((await response.json()) as { text: string }).text.trim();
}
/** The same tolerance as npm run qa:narration-transcripts. */
const saysItsScript = (script: string, heard: string) => {
  const scripted = words(script), spoken = words(heard);
  const phrases = (list: string[]) => {
    const seen = new Map<string, number>();
    for (let i = 0; i + 3 <= list.length; i++) { const phrase = list.slice(i, i + 3).join(" "); seen.set(phrase, (seen.get(phrase) ?? 0) + 1); }
    return seen;
  };
  // More repeated three-word phrases than the script has is a repeat or a stutter. Counting repeats,
  // not words, keeps a name the recogniser mishears the same way twice from failing the take.
  const extra = (seen: Map<string, number>) => [...seen.values()].reduce((sum, times) => sum + times - 1, 0);
  if (extra(phrases(spoken)) > extra(phrases(scripted))) return false;
  return spoken.length <= scripted.length * 1.25 + 2 && spoken.length >= scripted.length * 0.75 - 2;
};
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
  let heard: string | undefined;
  let lastError = "unknown failure";
  let sent = sentDirection(item.direction);
  for (let attempt = 1; attempt <= (whisper ? 6 : 3); attempt++) {
    // Three takes that do not say the script: the manner itself is being read. Send the line alone.
    if (whisper && attempt > 3) sent = "";
    try {
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(design.selection.savedVoiceId)}?output_format=mp3_44100_128`, {
        method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ text: sent ? `[${sent}] ${item.text}` : item.text, model_id: batch.model ?? "eleven_v4" })
      });
      if (!response.ok) throw new Error(`ElevenLabs ${response.status}: ${await response.text()}`);
      mp3 = new Uint8Array(await response.arrayBuffer());
      if (!hasMp3Signature(mp3)) throw new Error("ElevenLabs response is not a valid MP3");
      if (whisper) {
        heard = await heardIn(mp3);
        if (!saysItsScript(item.text, heard)) {
          const rejected = heard;
          mp3 = undefined;
          heard = undefined;
          throw new Error(`take ${attempt} does not say its script; it was heard as: ${rejected}`);
        }
      }
      break;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      console.log(`retrying ${output}: ${lastError}`);
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
    directionSent: sent,
    ...(heard === undefined ? {} : { heardByWhisper: heard }),
    generatedAt: new Date().toISOString() }, null, 2)}\n`);
  rmSync(outputTemp, { force: true });
  rmSync(transcriptTemp, { force: true });
  console.log(`generated ${output}`);
}
