import type { Cpu } from "../cpu/machine.js";
import { setStubDispatch, type FarFn } from "./far.js";

/**
 * TPOV overlay dispatch.
 *
 * On disk a stub segment starts with a 32-byte header and, at offset 0x20,
 * five-byte entries: CD 3F, dw procedureOffset. The resident loader reads
 * the procedure offset from the word after the interrupt, seeks to the
 * header's file offset, and copies the code into a segment. Pascal strings
 * use that segment as CS. Relocation adds the load paragraph to the word
 * at each reloc offset; with the EXE image at paragraph 0 the linked
 * segment numbers are already correct, so the addend is 0.
 */
export interface SliceModule {
  index: number;
  fileOffset: number;
  headerPara: number;
  procs: Map<number, FarFn>;
}

export interface LoadedSlice {
  index: number;
  fileOffset: number;
  headerPara: number;
  codeBytes: number;
  loadPara: number;
  procs: Map<number, FarFn>;
}

export const loadedSlices: LoadedSlice[] = [];

const byHeader = new Map<number, LoadedSlice>();

export function mountSlices(slices: SliceModule[]): void {
  setStubDispatch((m, seg, off) => dispatch(m, seg, off));
  // The tables are filled when the EXE image and GAME.OVR are installed.
  pendingModules = slices;
}

let pendingModules: SliceModule[] = [];

export function installProgram(m: Cpu, exeFile: Uint8Array, ovr: Uint8Array): { cs: number; ip: number; ss: number; sp: number } {
  if (exeFile[0] !== 0x4d || exeFile[1] !== 0x5a) throw new Error("START.EXE is not an MZ file");
  const headerParas = exeFile[8]! | (exeFile[9]! << 8);
  const headerBytes = headerParas * 16;
  const image = exeFile.subarray(headerBytes);
  m.mem.set(image, 0);

  const modules = new Map(pendingModules.map((s) => [s.fileOffset, s]));
  loadedSlices.length = 0;
  byHeader.clear();
  // Translated slices stay resident so dispatch can call their TypeScript
  // procedures directly. Keep their backing bytes above Turbo Pascal's
  // emulated heap (which currently ends at segment 0x9000); otherwise normal
  // GetMem allocations overwrite later slices and their CS-relative constants.
  let para = 0xa000;
  const seen = new Set<number>();
  for (let i = 0; i + 32 < image.length; i++) {
    if (image[i] !== 0xcd || image[i + 1] !== 0x3f) continue;
    const fileOffset = image[i + 4]! | (image[i + 5]! << 8) | (image[i + 6]! << 16) | (image[i + 7]! << 24);
    const codeBytes = image[i + 8]! | (image[i + 9]! << 8);
    const relocBytes = image[i + 10]! | (image[i + 11]! << 8);
    const entries = image[i + 12]! | (image[i + 13]! << 8);
    if (entries < 1 || entries > 512 || codeBytes < 1) continue;
    if (fileOffset < 4 || fileOffset + codeBytes + relocBytes > ovr.length) continue;
    if ((i & 15) !== 0) continue;
    if (seen.has(fileOffset)) continue;
    seen.add(fileOffset);
    const mod = modules.get(fileOffset);
    const code = ovr.subarray(fileOffset, fileOffset + codeBytes);
    if (para * 16 + codeBytes > m.mem.length) throw new Error("overlay image does not fit");
    m.mem.set(code, para * 16);
    const slice: LoadedSlice = {
      index: mod?.index ?? -1,
      fileOffset,
      headerPara: i >> 4,
      codeBytes,
      loadPara: para,
      procs: mod?.procs ?? new Map(),
    };
    loadedSlices.push(slice);
    byHeader.set(slice.headerPara, slice);
    para += Math.ceil(codeBytes / 16);
  }

  const ip = exeFile[0x14]! | (exeFile[0x15]! << 8);
  const cs = exeFile[0x16]! | (exeFile[0x17]! << 8);
  const sp = exeFile[0x10]! | (exeFile[0x11]! << 8);
  const ss = exeFile[0x0e]! | (exeFile[0x0f]! << 8);
  return { cs, ip, ss, sp };
}

function dispatch(m: Cpu, seg: number, off: number): boolean {
  const proc = m.read16(seg, off + 2);
  const slice = byHeader.get(seg);
  if (!slice) return false;
  const fn = slice.procs.get(proc);
  if (!fn) {
    throw new Error(
      `overlay ${slice.index} file+${slice.fileOffset.toString(16)} has no translated procedure ${proc.toString(16)}`,
    );
  }
  m.cs = slice.loadPara;
  fn(m);
  return true;
}
