import type { Cpu } from "../cpu/machine.js";

/**
 * Far-call dispatch for translated Turbo Pascal.
 * A direct registration wins. Otherwise a CD 3F stub loads the overlay
 * procedure named by the word after the interrupt, and a resident target
 * is the procedure whose image address is seg*16+off with the EXE loaded
 * at paragraph 0.
 */
export type FarFn = (m: Cpu) => void;

export const farTable = new Map<string, FarFn>();
export const exeByImage = new Map<number, FarFn>();
export const callTrace: string[] = [];
export let farBudget = 0;
let farCount = 0;

export function resetFarBudget(limit: number): void {
  farBudget = limit;
  farCount = 0;
  callTrace.length = 0;
}

let stubDispatch: ((m: Cpu, seg: number, off: number) => boolean) | null = null;

export function farKey(seg: number, off: number): string {
  return `${(seg & 0xffff).toString(16)}:${(off & 0xffff).toString(16)}`;
}

export function registerFar(seg: number, off: number, fn: FarFn): void {
  farTable.set(farKey(seg, off), fn);
}

export function installExeProcs(procs: Map<number, FarFn>): void {
  exeByImage.clear();
  for (const [image, fn] of procs) exeByImage.set(image, fn);
}

export function setStubDispatch(fn: (m: Cpu, seg: number, off: number) => boolean): void {
  stubDispatch = fn;
}

export function farCall(m: Cpu, seg: number, off: number): void {
  seg &= 0xffff;
  off &= 0xffff;
  const label = farKey(seg, off);
  farCount += 1;
  if (farBudget && farCount > farBudget) {
    throw new Error(`far-call budget ${farBudget} hit at ${label}`);
  }
  callTrace.push(label);
  if (callTrace.length > 40) callTrace.shift();
  const saved = m.cs;
  m.cs = seg;
  try {
    const direct = farTable.get(label);
    if (direct) {
      direct(m);
      return;
    }
    const image = m.linear(seg, off);
    const resident = exeByImage.get(image);
    if (resident) {
      resident(m);
      return;
    }
    if (m.read8(seg, off) === 0xcd && m.read8(seg, off + 1) === 0x3f) {
      if (stubDispatch?.(m, seg, off)) return;
    }
    throw new Error(`untranslated far call ${label} (image ${image.toString(16)})`);
  } finally {
    m.cs = saved;
  }
}
