import type { Cpu } from "../cpu/machine.js";

/**
 * Far-call dispatch. Targets that have been translated are registered here.
 * Unknown targets throw with the original segment:offset so the gap is visible.
 */
export type FarFn = (m: Cpu) => void;

export const farTable = new Map<string, FarFn>();

export function farKey(seg: number, off: number): string {
  return `${seg.toString(16)}:${off.toString(16)}`;
}

export function registerFar(seg: number, off: number, fn: FarFn): void {
  farTable.set(farKey(seg, off), fn);
}

export function farCall(m: Cpu, seg: number, off: number): void {
  const fn = farTable.get(farKey(seg, off));
  if (!fn) {
    throw new Error(`untranslated far call ${farKey(seg, off)}`);
  }
  fn(m);
}
