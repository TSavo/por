import type { Cpu } from "../cpu/machine.js";
import { dosLog } from "./dos.js";
import { registerFar } from "./far.js";

/**
 * Turbo Pascal's Intr. The original loads a register record, pushes the
 * interrupt vector, and retf's into it; the handler irets to an epilogue
 * that writes the registers back. The JS call stack cannot tail-call that
 * retf, so this shim does the same load / interrupt / store and returns
 * with retf 6, which is what the epilogue does.
 *
 * Record order matches the epilogue's stosw sequence: AX BX CX DX BP SI DI DS ES Flags.
 */
export const intrCounts = new Map<string, number>();

export function tpIntr(m: Cpu): void {
  const regsOff = m.read16(m.ss, m.sp + 4);
  const regsSeg = m.read16(m.ss, m.sp + 6);
  const intNo = m.read8(m.ss, m.sp + 8);
  const word = (index: number) => m.read16(regsSeg, regsOff + index * 2);
  const ax = word(0);
  const bx = word(1);
  const cx = word(2);
  const dx = word(3);
  const si = word(5);
  const di = word(6);
  const ds = word(7);
  const es = word(8);
  const callerBp = m.bp;
  const callerDs = m.ds;
  const key = `${intNo.toString(16)}:${(ax >> 8).toString(16)}`;
  intrCounts.set(key, (intrCounts.get(key) ?? 0) + 1);
  m.ax = ax;
  m.bx = bx;
  m.cx = cx;
  m.dx = dx;
  m.si = si;
  m.di = di;
  m.ds = ds;
  m.es = es;
  m.intr(intNo);
  const store = (index: number, value: number) => m.write16(regsSeg, regsOff + index * 2, value);
  store(0, m.ax);
  store(1, m.bx);
  store(2, m.cx);
  store(3, m.dx);
  store(4, m.bp);
  store(5, m.si);
  store(6, m.di);
  store(7, m.ds);
  store(8, m.es);
  let flags = 2;
  if (m.cf) flags |= 0x001;
  if (m.pf) flags |= 0x004;
  if (m.zf) flags |= 0x040;
  if (m.sf) flags |= 0x080;
  if (m.of) flags |= 0x800;
  store(9, flags);
  m.bp = callerBp;
  m.ds = callerDs;
  m.retf(6);
}

/** Stand in for Turbo Pascal's Intr at its address in this build of the program. */
export function registerIntr(segment: number, offset: number): void {
  registerFar(segment, offset, tpIntr);
}
