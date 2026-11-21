import type { Cpu } from "../cpu/machine.js";
import { code, codeSegment, data, far, isFar, segment } from "./bindings.js";

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
/**
 * How far the game has got, counted in things both builds do identically: dice drawn, and calls
 * the game makes into the text unit (every line, number and menu it draws). Calls the text code
 * makes to itself are left out: the first release routes them through far calls and 1.3 does not. A replay uses it to say when
 * a key is pressed, where a count of executed instructions would differ from build to build.
 * Sound requests are not counted: the builds differ in them.
 */
export const gameProgress = { dice: 0, text: 0 };
export const farCallObservers = new WeakMap<Cpu, (seg: number, off: number) => void>();
export interface OriginalSoundCall {
  step: number;
  index: number;
  mode: number;
  callerSegment: number;
  callerOffset: number;
}
export const originalSoundCallObservers = new WeakMap<Cpu, (call: OriginalSoundCall) => void>();
export let spMin = 0xffff;
export let spMax = 0;
export let farBudget = 0;
let farCount = 0;

export function resetFarBudget(limit: number): void {
  farBudget = limit;
  farCount = 0;
  callTrace.length = 0;
  spMin = 0xffff;
  spMax = 0;
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
  farCallObservers.get(m)?.(seg, off);
  if (isFar(seg, off, far.random)) gameProgress.dice++;
  else if (seg === segment.text && m.cs !== seg && m.cs !== codeSegment(code.glyphStoreA)) gameProgress.text++;
  if (isFar(seg, off, far.sound)) {
    originalSoundCallObservers.get(m)?.({
      step: m.steps,
      index: m.read16(m.ss, m.sp + 4),
      mode: m.read8(m.ds, data.soundMode),
      callerOffset: m.read16(m.ss, m.sp),
      callerSegment: m.read16(m.ss, m.sp + 2),
    });
  }
  farCount += 1;
  if (farBudget && farCount > farBudget) {
    throw new Error(`far-call budget ${farBudget} hit at ${label}`);
  }
  if (m.sp < spMin) spMin = m.sp;
  if (m.sp > spMax) spMax = m.sp;
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
