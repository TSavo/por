// What a speech recogniser hears in every narration recording, against its script.
//
//   POR_WHISPER_URL=http://<host>:8787 npm run qa:narration-transcripts            transcribe new or changed recordings, then report
//   npm run qa:narration-transcripts -- --report                                   report from the committed results only
//
// The narration checks prove that every recording exists and that its transcript file matches the
// game's text. Neither listens. A generated take can say a sentence twice, drop one, or wander, and
// still pass. This sends each MP3 to a Whisper server (any server with the OpenAI
// /v1/audio/transcriptions route) and compares the words it hears with the script beside the MP3.
//
// A recogniser mishears names (Tempus as "tempest"), so a low word match is a reason to listen, not
// a verdict. Saying a three-word phrase more often than the script has it (a repeat or a stutter),
// or clearly more or fewer words than the script, is close to one.
//
// Results are kept in qa/narration-transcripts.json, keyed by the MP3's SHA-256, so a recording is
// transcribed once and again only when it changes. Exits 1 while any recording is flagged or unheard.

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";

const root = resolve(new URL("..", import.meta.url).pathname);
const library = join(root, "audio", "voices", "narration");
const resultsPath = join(root, "qa", "narration-transcripts.json");
const reportOnly = process.argv.includes("--report");
const server = process.env.POR_WHISPER_URL?.replace(/\/$/, "");
if (!reportOnly && !server) throw new Error("Set POR_WHISPER_URL to a Whisper server, or pass --report.");

const results = existsSync(resultsPath) ? JSON.parse(readFileSync(resultsPath, "utf8")) : { schema: 1, recordings: {} };
const words = (text) => text.toUpperCase().replace(/[’']/g, "").replace(/[^A-Z0-9]+/g, " ").trim().split(" ").filter(Boolean);
/** Longest common subsequence of two word lists: how many script words were heard in order. */
function inOrder(a, b) {
  let row = new Array(b.length + 1).fill(0);
  for (const word of a) {
    const next = [0];
    for (let j = 1; j <= b.length; j++) next[j] = word === b[j - 1] ? row[j - 1] + 1 : Math.max(row[j], next[j - 1]);
    row = next;
  }
  return row[b.length];
}
/**
 * Three-word phrases the recording says again that the script does not. The comparison is by how
 * many repeats there are, not which words, so a name the recogniser mishears the same way twice
 * ("PHASE SPIDERS" heard as "FAZE SPIDERS") is not counted against a script that says it twice.
 */
export function repeatedPhrases(script, heard) {
  const count = (list) => {
    const seen = new Map();
    for (let i = 0; i + 3 <= list.length; i++) { const phrase = list.slice(i, i + 3).join(" "); seen.set(phrase, (seen.get(phrase) ?? 0) + 1); }
    return seen;
  };
  const extra = (seen) => [...seen.values()].reduce((sum, times) => sum + times - 1, 0);
  const spoken = count(heard);
  return extra(spoken) > extra(count(script)) ? [...spoken].filter(([, times]) => times >= 2).map(([phrase]) => phrase) : [];
}
function* files(directory) {
  for (const name of readdirSync(directory).sort()) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) yield* files(path);
    else if (name.endsWith(".mp3")) yield path;
  }
}

const recordings = [...files(library)].map((path) => {
  const bytes = readFileSync(path);
  return { path, key: relative(root, path), bytes, sha256: createHash("sha256").update(bytes).digest("hex") };
});
const pending = recordings.filter(({ key, sha256 }) => results.recordings[key]?.sha256 !== sha256);
if (!reportOnly && pending.length) {
  let done = 0;
  const queue = [...pending];
  await Promise.all(Array.from({ length: 4 }, async () => {
    for (let item; (item = queue.shift());) {
      const form = new FormData();
      form.append("file", new Blob([item.bytes], { type: "audio/mpeg" }), "recording.mp3");
      form.append("model", "whisper-1");
      form.append("language", "en");
      const response = await fetch(`${server}/v1/audio/transcriptions`, { method: "POST", body: form });
      if (!response.ok) throw new Error(`${item.key}: the server answered ${response.status}`);
      results.recordings[item.key] = { sha256: item.sha256, heard: (await response.json()).text.trim() };
      if (++done % 50 === 0 || done === pending.length) {
        console.log(`transcribed ${done} of ${pending.length}`);
        writeFileSync(resultsPath, `${JSON.stringify(results, null, 1)}\n`);
      }
    }
  }));
}
for (const key of Object.keys(results.recordings)) if (!recordings.some((recording) => recording.key === key)) delete results.recordings[key];
if (!reportOnly) writeFileSync(resultsPath, `${JSON.stringify(results, null, 1)}\n`);

const repeated = [], more = [], fewer = [], listen = [], unheard = [];
for (const { path, key, sha256 } of recordings) {
  const entry = results.recordings[key];
  if (entry?.sha256 !== sha256) { unheard.push(key); continue; }
  const script = words(readFileSync(path.replace(/\.mp3$/, ".txt"), "utf8")), heard = words(entry.heard);
  const matched = inOrder(script, heard), line = `${key}\n      script: ${script.join(" ")}\n      heard:  ${heard.join(" ")}`;
  // Two words of slack: a recogniser splits and joins words ("MAGIC USERS", "TRAPDOOR").
  const repeats = repeatedPhrases(script, heard);
  if (repeats.length) repeated.push(`${line}\n      repeated: ${repeats.slice(0, 4).join(" / ")}`);
  else if (heard.length > script.length * 1.25 + 2) more.push(line);
  else if (heard.length < script.length * 0.75 - 2) fewer.push(line);
  else if (matched < script.length * 0.7) listen.push(line);
}
const section = (title, list) => { if (list.length) console.log(`\n${title} (${list.length}):\n  ${list.join("\n  ")}`); };
section("Says a phrase more often than its script does: a repeat or a stutter", repeated);
section("Says clearly more than its script: an added passage", more);
section("Says clearly less than its script: a dropped passage", fewer);
section("Heard words match the script poorly: listen to these", listen);
section("Not transcribed yet, or changed since", unheard);
const flagged = repeated.length + more.length + fewer.length + listen.length;
console.log(`\n${recordings.length} recordings: ${recordings.length - flagged - unheard.length} heard as their script, ${repeated.length} repeat a phrase, ${more.length} say more, ` +
  `${fewer.length} say less, ${listen.length} to listen to, ${unheard.length} not transcribed`);
process.exit(flagged || unheard.length ? 1 : 0);
