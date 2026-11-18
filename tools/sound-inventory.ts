import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

interface SoundCallSite {
  file: string;
  line: number;
  procedure?: string;
  instruction?: string;
  argumentInstruction?: string;
  argumentAddress?: string;
  originalIndex?: number;
  semanticId?: string;
}

const soundManifest = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as {
  events: Array<{ id: string; index: number }>;
};
const semanticIds = new Map(soundManifest.events.map(({ id, index }) => [index, id]));

const translated = resolve(process.argv[2] ?? "src/translated");
const output = process.argv[3];
const callSites: SoundCallSite[] = [];

for (const name of readdirSync(translated).filter((entry) => /^(?:exe|ovl\d+)\.ts$/.test(entry)).sort()) {
  const path = join(translated, name);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);
  let procedure: string | undefined;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index]!;
    const declaration = /^export function (\w+)/.exec(line);
    if (declaration) procedure = declaration[1];
    const call = /farCall\(m, 0x27f, 0x0\)/.exec(line);
    if (!call) continue;
    const comments = lines.slice(Math.max(0, index - 24), index)
      .map((candidate) => /^\s*\/\/ ([0-9a-f]{4}): (.+)$/i.exec(candidate))
      .filter((match): match is RegExpExecArray => Boolean(match));
    const instruction = comments.at(-1);
    const argument = comments.slice(0, -1).reverse().find((match: RegExpExecArray) =>
      /^push (?!cs$|ds$|es$|ss$|bp$)/i.test(match[2]!));
    const addressMatch = argument && /word ptr \[0x([0-9a-f]+)\]/i.exec(argument[2]!);
    const address = addressMatch ? Number.parseInt(addressMatch[1]!, 16) : undefined;
    const originalIndex = address === 0x2626 ? 0xff : address !== undefined && address >= 0x2628 &&
      address <= 0x2650 && (address & 1) === 0 ? (address - 0x2628) / 2 : undefined;
    callSites.push({
      file: relative(process.cwd(), path).replaceAll("\\", "/"),
      line: index + 1,
      procedure,
      instruction: instruction ? `${instruction[1]}: ${instruction[2]}` : undefined,
      argumentInstruction: argument ? `${argument[1]}: ${argument[2]}` : undefined,
      argumentAddress: address === undefined ? undefined : `0x${address.toString(16)}`,
      originalIndex,
      semanticId: originalIndex === undefined ? undefined : semanticIds.get(originalIndex),
    });
  }
}

const inventory = {
  schema: 3,
  residentSoundDispatcher: "START.EXE image 0x27f0",
  modes: { tandy: 0, pcSpeaker: 1, silent: 2 },
  ports: { timerChannel0: "0x40", pcSpeakerChannel2: "0x42", pitControl: "0x43", speakerControl: "0x61", tandyPsg: "0xc0" },
  callSites,
  resolvedIndexCounts: Object.fromEntries([...new Set(callSites.flatMap(({ originalIndex }) =>
    originalIndex === undefined ? [] : [originalIndex]))].sort((a, b) => a - b).map((index) =>
      [index, callSites.filter((site) => site.originalIndex === index).length])),
};
const json = JSON.stringify(inventory, null, 2) + "\n";
if (output) {
  mkdirSync(dirname(resolve(output)), { recursive: true });
  writeFileSync(resolve(output), json);
} else {
  process.stdout.write(json);
}
console.error(`Found ${callSites.length} translated original-sound call sites.`);
