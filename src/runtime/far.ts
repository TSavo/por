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
export const disposeHits: string[] = [];
export const getmemRing: string[] = [];
export const dosAssigns: string[] = [];
export const farCallObservers = new WeakMap<Cpu, (seg: number, off: number) => void>();
export const farCallOverrides = new WeakMap<Cpu, (seg: number, off: number) => boolean>();
export let spMin = 0xffff;
export let spMax = 0;
export let farBudget = 0;
let farCount = 0;

export function resetFarBudget(limit: number): void {
  farBudget = limit;
  farCount = 0;
  callTrace.length = 0;
  disposeHits.length = 0;
  getmemRing.length = 0;
  dosAssigns.length = 0;
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
  if (farCallOverrides.get(m)?.(seg, off)) return;
  farCount += 1;
  if (farBudget && farCount > farBudget) {
    throw new Error(`far-call budget ${farBudget} hit at ${label}`);
  }
  if (label === "1d7:703" && dosAssigns.length < 20) {
    const ip = m.read16(m.ss, m.sp);
    const cs = m.read16(m.ss, m.sp + 2);
    const describe = (at: number) => {
      const off = m.read16(m.ss, m.sp + at);
      const seg = m.read16(m.ss, m.sp + at + 2);
      const len = m.read8(seg, off);
      return `${len}`;
    };
    const a = describe(0x12);
    const b = describe(0x0e);
    if (Number(a) > 20 || Number(b) > 20) {
      dosAssigns.push(`DAXCALL ${cs.toString(16)}:${ip.toString(16)} lens ${a},${b}`);
    }
  }
  if (label === "5bb:64e" && dosAssigns.length < 20) {
    const max = m.read16(m.ss, m.sp + 4);
    const soff = m.read16(m.ss, m.sp + 10);
    const sseg = m.read16(m.ss, m.sp + 12);
    const len = m.read8(sseg, soff);
    if (len > 20) {
      let text = "";
      for (let i = 1; i <= Math.min(len, 48); i++) {
        const c = m.read8(sseg, soff + i);
        text += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
      }
      const caller = `${m.read16(m.ss, m.sp + 2).toString(16)}:${m.read16(m.ss, m.sp).toString(16)}`;
      const before = Array.from({ length: 8 }, (_, i) => m.read8(sseg, soff - 8 + i).toString(16).padStart(2, "0")).join("");
      dosAssigns.push(`COPY max ${max.toString(16)} from ${caller} ${sseg.toString(16)}:${soff.toString(16)} before ${before} len ${len} "${text}"`);
    }
  }
  if (label === "5bb:13ef" && dosAssigns.length < 16) {
    const soff = m.read16(m.ss, m.sp + 4);
    const sseg = m.read16(m.ss, m.sp + 6);
    const len = m.read8(sseg, soff);
    let text = "";
    for (let i = 1; i <= Math.min(len, 40); i++) {
      const c = m.read8(sseg, soff + i);
      text += c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
    }
    const caller = `${m.read16(m.ss, m.sp + 2).toString(16)}:${m.read16(m.ss, m.sp).toString(16)}`;
    const line = `from ${caller} ds ${m.ds.toString(16)} idx ${m.read8(0x740, 0x52d4).toString(16)} drv ${m.read8(0x740, 0x53db).toString(16)} ${sseg.toString(16)}:${soff.toString(16)} len ${len} "${text}"`;
    if (text.includes("?")) {
      if (dosAssigns.length < 8) dosAssigns.push(`BAD ${line}`);
    } else if (dosAssigns.length < 4) {
      dosAssigns.push(line);
    }
  }
  if (m.sp < spMin) spMin = m.sp;
  if (m.sp > spMax) spMax = m.sp;
  callTrace.push(label);
  if (callTrace.length > 40) callTrace.shift();
  if (label === "5bb:364" && disposeHits.length < 12) {
    const ip = m.read16(m.ss, m.sp);
    const cs = m.read16(m.ss, m.sp + 2);
    const w0 = m.read16(m.ss, m.sp + 4);
    const off = m.read16(m.ss, m.sp + 6);
    const seg = m.read16(m.ss, m.sp + 8);
    const ptrOff = m.read16(seg, off);
    const ptrSeg = m.read16(seg, off + 2);
    const heapLo = m.read16(0x740, 0x436a);
    const heapHi = m.read16(0x740, 0x436e);
    if (ptrSeg < heapLo || ptrSeg > heapHi) {
      disposeHits.push(
        `BAD from ${cs.toString(16)}:${ip.toString(16)} arg ${w0.toString(16)} var ${seg.toString(16)}:${off.toString(16)} -> ${ptrSeg.toString(16)}:${ptrOff.toString(16)} heap ${heapLo.toString(16)}-${heapHi.toString(16)} bp ${m.bp.toString(16)} sp ${m.sp.toString(16)}`,
      );
    }
  }
  const saved = m.cs;
  m.cs = seg;
  let getmem: { size: number; seg: number; off: number; cs: number; ip: number } | null = null;
  if (label === "5bb:329" && disposeHits.length < 12) {
    getmem = {
      size: m.read16(m.ss, m.sp + 4),
      ip: m.read16(m.ss, m.sp),
      cs: m.read16(m.ss, m.sp + 2),
      off: m.read16(m.ss, m.sp + 6),
      seg: m.read16(m.ss, m.sp + 8),
    };
  }
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
    if (getmem) {
      const ptrOff = m.read16(getmem.seg, getmem.off);
      const ptrSeg = m.read16(getmem.seg, getmem.off + 2);
      getmemRing.push(
        `size ${getmem.size.toString(16)} -> ${ptrSeg.toString(16)}:${ptrOff.toString(16)} var ${getmem.seg.toString(16)}:${getmem.off.toString(16)} from ${getmem.cs.toString(16)}:${getmem.ip.toString(16)}`,
      );
      if (getmemRing.length > 8) getmemRing.shift();
    }
    m.cs = saved;
  }
}
