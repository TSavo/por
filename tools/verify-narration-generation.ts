import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, extname, join, relative, resolve } from "node:path";

interface QueueItem {
  id?: string;
  output: string;
  text: string;
}
interface QueueManifest {
  items: QueueItem[];
}
interface Expected extends QueueItem {
  manifest: string;
  index: number;
  absoluteOutput: string;
  absoluteTranscript: string;
  displayId: string;
}
type State = "complete" | "pending" | "in-progress" | "failed";
interface Result { expected: Expected; state: State; problems: string[]; bytes?: number; sha256?: string }

const root = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));
const audioDir = join(root, "src", "audio");
const graceMilliseconds = 15_000;
const jsonOutput = process.argv.includes("--json");
const manifestNames = readdirSync(audioDir).filter(name => /generation-queue.*\.json$/i.test(name)).sort();
const expected: Expected[] = [];
const manifestProblems: string[] = [];

for (const manifest of manifestNames) {
  let parsed: QueueManifest;
  try {
    parsed = JSON.parse(readFileSync(join(audioDir, manifest), "utf8")) as QueueManifest;
  } catch (error) {
    manifestProblems.push(`${manifest}: invalid JSON (${error instanceof Error ? error.message : String(error)})`);
    continue;
  }
  if (!Array.isArray(parsed.items)) {
    manifestProblems.push(`${manifest}: items is not an array`);
    continue;
  }
  for (const [index, item] of parsed.items.entries()) {
    if (!item || typeof item.output !== "string" || typeof item.text !== "string") {
      manifestProblems.push(`${manifest} item ${index}: output and text must be strings`);
      continue;
    }
    const absoluteOutput = resolve(root, item.output);
    expected.push({ ...item, manifest, index, absoluteOutput,
      absoluteTranscript: absoluteOutput.replace(/\.mp3$/i, ".txt"),
      displayId: item.id ?? `${manifest}#${index}` });
  }
}

function groupedDuplicates<T>(values: readonly T[], key: (value: T) => string | null) {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const groupKey = key(value);
    if (groupKey === null) continue;
    groups.set(groupKey, [...(groups.get(groupKey) ?? []), value]);
  }
  return [...groups.entries()].filter(([, group]) => group.length > 1);
}

const duplicateIds = groupedDuplicates(expected, item => item.id ?? null);
const duplicateOutputs = groupedDuplicates(expected, item => item.absoluteOutput.toLowerCase());
const now = Date.now();
const isRecent = (path: string) => existsSync(path) && now - statSync(path).mtimeMs < graceMilliseconds;
const hasMp3Signature = (bytes: Uint8Array) =>
  bytes.length >= 3 && (Buffer.from(bytes.subarray(0, 3)).toString("ascii") === "ID3" ||
    (bytes[0] === 0xff && (bytes[1]! & 0xe0) === 0xe0));

const results: Result[] = expected.map(item => {
  const mp3Exists = existsSync(item.absoluteOutput);
  const transcriptExists = existsSync(item.absoluteTranscript);
  if (!mp3Exists && !transcriptExists) return { expected: item, state: "pending", problems: [] };
  const recent = isRecent(item.absoluteOutput) || isRecent(item.absoluteTranscript);
  const problems: string[] = [];
  let bytes: Buffer | undefined;
  if (!mp3Exists) problems.push("MP3 is missing");
  else {
    bytes = readFileSync(item.absoluteOutput);
    if (bytes.length === 0) problems.push("MP3 is zero bytes");
    else if (!hasMp3Signature(bytes)) problems.push("MP3 has no valid ID3/MPEG signature");
  }
  if (!transcriptExists) problems.push("transcript is missing");
  else if (readFileSync(item.absoluteTranscript, "utf8") !== `${item.text}\n`) problems.push("transcript does not exactly match queued text");
  if (problems.length > 0) return { expected: item, state: recent ? "in-progress" : "failed", problems,
    ...(bytes ? { bytes: bytes.length } : {}) };
  return { expected: item, state: "complete", problems: [], bytes: bytes!.length,
    sha256: createHash("sha256").update(bytes!).digest("hex") };
});

const complete = results.filter(result => result.state === "complete");
const duplicateContent = groupedDuplicates(complete, result => result.sha256 ?? null);

function walkFiles(directory: string, found: string[]) {
  if (!existsSync(directory)) return;
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    if (statSync(path).isDirectory()) walkFiles(path, found);
    else if (extname(name).toLowerCase() === ".mp3" || extname(name).toLowerCase() === ".txt") found.push(path);
  }
}
const narrationRoot = resolve(root, "../por-assets/voices/narration");
const tracked = new Set(expected.flatMap(item => [item.absoluteOutput.toLowerCase(), item.absoluteTranscript.toLowerCase()]));
const narrationFiles: string[] = [];
walkFiles(narrationRoot, narrationFiles);
const untracked = narrationFiles.filter(path => !tracked.has(path.toLowerCase())).sort();
const counts = Object.fromEntries((["complete", "pending", "in-progress", "failed"] as const)
  .map(state => [state.replace("-", ""), results.filter(result => result.state === state).length]));
const failures = results.filter(result => result.state === "failed");
const report = {
  manifestCount: manifestNames.length,
  expectedCount: expected.length,
  ...counts,
  manifestProblems,
  duplicateIds: duplicateIds.map(([id, items]) => ({ id, items: items.map(item => `${item.manifest}#${item.index}`) })),
  duplicateOutputs: duplicateOutputs.map(([output, items]) => ({ output, items: items.map(item => `${item.manifest}#${item.index}`) })),
  duplicateContent: duplicateContent.map(([sha256, items]) => ({ sha256, outputs: items.map(item => item.expected.absoluteOutput) })),
  failures: failures.map(result => ({ id: result.expected.displayId, output: result.expected.absoluteOutput, problems: result.problems })),
  inProgressItems: results.filter(result => result.state === "in-progress").map(result => ({
    id: result.expected.displayId, output: result.expected.absoluteOutput, observations: result.problems
  })),
  untracked: untracked.map(path => relative(narrationRoot, path))
};

if (jsonOutput) console.log(JSON.stringify(report, null, 2));
else {
  console.log(`Narration generation: ${expected.length} items in ${manifestNames.length} manifests`);
  console.log(`complete ${counts.complete} | pending ${counts.pending} | in progress ${counts.inprogress} | failed ${counts.failed}`);
  console.log(`duplicate IDs ${duplicateIds.length} | duplicate outputs ${duplicateOutputs.length} | duplicate content ${duplicateContent.length}`);
  console.log(`untracked narration files ${untracked.length}`);
  for (const path of untracked) console.log(`UNTRACKED ${relative(narrationRoot, path)}`);
  for (const problem of manifestProblems) console.error(`MANIFEST: ${problem}`);
  for (const result of failures) console.error(`FAILED ${result.expected.displayId}: ${result.problems.join("; ")} (${result.expected.absoluteOutput})`);
  for (const [id, items] of duplicateIds) console.error(`DUPLICATE ID ${id}: ${items.map(item => item.manifest).join(", ")}`);
  for (const [output, items] of duplicateOutputs) console.error(`DUPLICATE OUTPUT ${output}: ${items.map(item => item.manifest).join(", ")}`);
  for (const [sha256, items] of duplicateContent) console.error(`DUPLICATE CONTENT ${sha256}: ${items.map(item => basename(item.expected.absoluteOutput)).join(", ")}`);
}

if (manifestProblems.length || failures.length || duplicateIds.length || duplicateOutputs.length || duplicateContent.length) process.exitCode = 1;
