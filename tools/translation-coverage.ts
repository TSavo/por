import { readFileSync } from "node:fs";
import { join } from "node:path";
import { loadExecutable } from "../src/lib/exepack.js";

/** What differs between builds for finding their procedures. */
export const gameVersions = {
  "1.0": { directory: "translated", dataSegment: 0x740 },
  "1.3": { directory: "translated-1.3", dataSegment: 0xc7c },
} as const;
export type GameVersion = keyof typeof gameVersions;

export interface Coverage { total: number; resident: number; slices: number; missing: string[] }

// Every procedure in the original program needs a translated counterpart.
// A procedure starts with `push bp; mov bp, sp`. Compiled Pascal encodes it
// as 55 89 E5. The assembler-written library units encode it as 55 8B EC.
function prologues(code: Uint8Array, from: number, to: number): number[] {
  const found: number[] = [];
  for (let i = from; i + 2 < to; i++) {
    if (code[i] !== 0x55) continue;
    if ((code[i + 1] === 0x89 && code[i + 2] === 0xe5) || (code[i + 1] === 0x8b && code[i + 2] === 0xec)) found.push(i);
  }
  return found;
}

export async function translationCoverage(root: string, version: GameVersion): Promise<Coverage> {
  const { directory, dataSegment } = gameVersions[version];
  const { image } = loadExecutable(new Uint8Array(readFileSync(join(root, "START.EXE"))));
  const overlays = new Uint8Array(readFileSync(join(root, "GAME.OVR")));
  const word = (offset: number) => image[offset]! | (image[offset + 1]! << 8);
  // The overlay stub segments, read the way src/runtime/overlay.ts reads them.
  const slices: { fileOffset: number; codeBytes: number }[] = [];
  const seen = new Set<number>();
  // Resident code lies outside the stub segments. Version 1.3 has resident units between them.
  const stubs: [number, number][] = [];
  for (let i = 0; i + 32 < image.length; i += 16) {
    if (image[i] !== 0xcd || image[i + 1] !== 0x3f) continue;
    const fileOffset = word(i + 4) | (word(i + 6) << 16), codeBytes = word(i + 8), relocBytes = word(i + 10), entries = word(i + 12);
    if (entries < 1 || entries > 512 || codeBytes < 1) continue;
    if (fileOffset < 4 || fileOffset + codeBytes + relocBytes > overlays.length) continue;
    // A stub segment is a 32-byte header and five bytes per entry.
    stubs.push([i, (i + 0x20 + entries * 5 + 15) & ~15]);
    if (seen.has(fileOffset)) continue;
    seen.add(fileOffset);
    slices.push({ fileOffset, codeBytes });
  }
  slices.sort((a, b) => a.fileOffset - b.fileOffset);
  const load = async (name: string) => await import(`../src/${directory}/${name}.js`).catch(() => undefined) as
    { procs: Map<number, unknown>; SLICE?: { fileOffset: number } } | undefined;
  const residentProcs = (await load("exe"))?.procs;
  const translatedSlices = new Map<number, Map<number, unknown>>();
  for (let index = 0; index < slices.length; index++) {
    const module = await load(`ovl${String(index).padStart(2, "0")}`);
    if (module?.SLICE) translatedSlices.set(module.SLICE.fileOffset, module.procs);
  }
  const missing: string[] = [];
  const resident = prologues(image, stubs[0]?.[0] ?? 0, dataSegment * 16)
    .filter(offset => !stubs.some(([from, to]) => offset >= from && offset < to));
  for (const offset of resident) {
    if (!residentProcs?.has(offset)) missing.push(`START.EXE image ${offset.toString(16).padStart(5, "0")}`);
  }
  let total = resident.length;
  for (const [index, slice] of slices.entries()) {
    const code = overlays.subarray(slice.fileOffset, slice.fileOffset + slice.codeBytes);
    const procs = translatedSlices.get(slice.fileOffset);
    const found = prologues(code, 0, code.length);
    total += found.length;
    for (const offset of found) {
      if (!procs?.has(offset)) missing.push(`GAME.OVR slice ${index} +${offset.toString(16).padStart(4, "0")}`);
    }
  }
  return { total, resident: resident.length, slices: slices.length, missing };
}
