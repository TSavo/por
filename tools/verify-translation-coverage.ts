import { readFileSync } from "node:fs";
import { join } from "node:path";
import { procs as residentProcs } from "../src/translated/exe.js";
import { findGameRoot } from "./gamedata.js";

// Every procedure in the original program needs a translated counterpart.
// A procedure starts with `push bp; mov bp, sp`. Compiled Pascal encodes it
// as 55 89 E5. The assembler-written library units encode it as 55 8B EC.
// Add a missing procedure by running `npm run translate`, never by hand.

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const executable = new Uint8Array(readFileSync(join(root, "START.EXE")));
const overlays = new Uint8Array(readFileSync(join(root, "GAME.OVR")));
const view = new DataView(executable.buffer, executable.byteOffset, executable.byteLength);
const image = executable.subarray(view.getUint16(8, true) * 16);
const word = (offset: number) => image[offset]! | (image[offset + 1]! << 8);

/** The program's data segment. Resident code ends where it begins. */
const dataStart = 0x740 * 16;

function prologues(code: Uint8Array, from: number, to: number): number[] {
  const found: number[] = [];
  for (let i = from; i + 2 < to; i++) {
    if (code[i] !== 0x55) continue;
    const compiled = code[i + 1] === 0x89 && code[i + 2] === 0xe5;
    const library = code[i + 1] === 0x8b && code[i + 2] === 0xec;
    if (compiled || library) found.push(i);
  }
  return found;
}

// The overlay stub segments, read the way src/runtime/overlay.ts reads them.
interface Slice { fileOffset: number; codeBytes: number; headerPara: number }
const slices: Slice[] = [];
const seen = new Set<number>();
let residentStart = 0;
for (let i = 0; i + 32 < image.length; i += 16) {
  if (image[i] !== 0xcd || image[i + 1] !== 0x3f) continue;
  const fileOffset = word(i + 4) | (word(i + 6) << 16);
  const codeBytes = word(i + 8);
  const relocBytes = word(i + 10);
  const entries = word(i + 12);
  if (entries < 1 || entries > 512 || codeBytes < 1) continue;
  if (fileOffset < 4 || fileOffset + codeBytes + relocBytes > overlays.length) continue;
  // Resident code follows the last stub segment: a 32-byte header and five bytes per entry.
  residentStart = Math.max(residentStart, (i + 0x20 + entries * 5 + 15) & ~15);
  if (seen.has(fileOffset)) continue;
  seen.add(fileOffset);
  slices.push({ fileOffset, codeBytes, headerPara: i >> 4 });
}

const translatedSlices = new Map<number, Map<number, unknown>>();
for (let index = 0; index < slices.length; index++) {
  const name = `../src/translated/ovl${String(index).padStart(2, "0")}.js`;
  const module = await import(name).catch(() => undefined) as
    { SLICE: { fileOffset: number }; procs: Map<number, unknown> } | undefined;
  if (module) translatedSlices.set(module.SLICE.fileOffset, module.procs);
}

const missing: string[] = [];
let total = 0;

const resident = prologues(image, residentStart, dataStart);
total += resident.length;
for (const offset of resident) {
  if (!residentProcs.has(offset)) missing.push(`START.EXE image ${offset.toString(16).padStart(5, "0")}`);
}

slices.sort((a, b) => a.fileOffset - b.fileOffset);
for (const [index, slice] of slices.entries()) {
  const code = overlays.subarray(slice.fileOffset, slice.fileOffset + slice.codeBytes);
  const procs = translatedSlices.get(slice.fileOffset);
  const found = prologues(code, 0, code.length);
  total += found.length;
  for (const offset of found) {
    if (!procs?.has(offset)) {
      missing.push(`GAME.OVR slice ${index} +${offset.toString(16).padStart(4, "0")}`);
    }
  }
}

if (missing.length) {
  console.error(`${missing.length} of ${total} original procedures have no translation:`);
  for (const line of missing) console.error(`  ${line}`);
  console.error("Run `npm run translate` to regenerate src/translated from the original files.");
  process.exit(1);
}
console.log(`verified a translation for all ${total} original procedures ` +
  `(${resident.length} resident, ${total - resident.length} in ${slices.length} overlay slices)`);
