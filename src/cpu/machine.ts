/**
 * Platform stand-in for the 8086 the game was compiled for.
 * Game state lives in this memory image at the original DS offsets.
 * This file is hand-written. It is not game logic.
 */

export class StepBudgetExceeded extends Error {}

export class Cpu {
  readonly mem = new Uint8Array(0x100000);
  ax = 0;
  cx = 0;
  dx = 0;
  bx = 0;
  sp = 0;
  bp = 0;
  si = 0;
  di = 0;
  cs = 0;
  ds = 0;
  ss = 0;
  es = 0;
  cf = false;
  zf = false;
  sf = false;
  of = false;
  pf = false;
  df = false;
  /** Instruction count for the current run. A tight loop trips stepBudget instead of hanging. */
  steps = 0;
  stepBudget = 0;
  onStepBudgetExceeded?: () => void;
  onEclInstruction?: (entering: boolean) => void;
  enforceCodeWheel = false;
  ip = 0;

  tick(at: number): void {
    this.ip = at;
    this.steps += 1;
    if (this.prevSp >= 0) {
      const delta = (this.sp - this.prevSp) & 0xffff;
      const signed = delta & 0x8000 ? delta - 0x10000 : delta;
      if (signed > 0x800 || signed < -0x800) {
        if (this.spJumps.length < 15) {
          this.spJumps.push(
            `${this.cs.toString(16)}:${at.toString(16)} sp ${this.prevSp.toString(16)}->${this.sp.toString(16)} (${signed})`,
          );
        }
      }
    }
    this.prevSp = this.sp;
    // Crt waits until the BIOS timer byte at 0040:006C changes. A frozen
    // counter is an infinite loop, so the clock advances with the instruction
    // stream. This is the platform timer, not game logic.
    if ((this.steps & 15) === 0) {
      const tick = 0x40 * 16 + 0x6c;
      this.mem[tick] = ((this.mem[tick] ?? 0) + 1) & 0xff;
    }
    if (this.stepBudget !== 0 && this.steps > this.stepBudget) {
      this.onStepBudgetExceeded?.();
      if (this.stepBudget === 0 || this.steps <= this.stepBudget) return;
      throw new StepBudgetExceeded(
        `step budget ${this.stepBudget} at ${this.cs.toString(16)}:${at.toString(16)}`,
      );
    }
  }

  linear(seg: number, off: number): number {
    return ((seg << 4) + (off & 0xffff)) & 0xfffff;
  }

  read8(seg: number, off: number): number {
    const address = this.linear(seg, off);
    return this.onMemoryRead?.(address) ?? this.mem[address] ?? 0;
  }

  read16(seg: number, off: number): number {
    const lo = this.read8(seg, off);
    const hi = this.read8(seg, off + 1);
    return lo | (hi << 8);
  }

  write8(seg: number, off: number, value: number): void {
    const lin = this.linear(seg, off);
    if (this.onMemoryWrite?.(lin, value & 0xff)) return;
    this.mem[lin] = value & 0xff;
    if (lin === 0xc6db && this.driveWrites.length < 8) {
      this.driveWrites.push(`${this.cs.toString(16)}:${this.ip.toString(16)}=${(value & 0xff).toString(16)}`);
    }
  }

  driveWrites: string[] = [];

  write16(seg: number, off: number, value: number): void {
    this.write8(seg, off, value);
    this.write8(seg, off + 1, value >> 8);
    this.onWrite16?.(seg, off, value & 0xffff);
  }

  onWrite16: ((seg: number, off: number, value: number) => void) | null = null;
  onMemoryRead: ((address: number) => number | undefined) | null = null;
  onMemoryWrite: ((address: number, value: number) => boolean) | null = null;
  prevSp = -1;
  spJumps: string[] = [];

  get al(): number { return this.ax & 0xff; }
  set al(v: number) { this.ax = (this.ax & 0xff00) | (v & 0xff); }
  get ah(): number { return (this.ax >> 8) & 0xff; }
  set ah(v: number) { this.ax = (this.ax & 0x00ff) | ((v & 0xff) << 8); }
  get cl(): number { return this.cx & 0xff; }
  set cl(v: number) { this.cx = (this.cx & 0xff00) | (v & 0xff); }
  get ch(): number { return (this.cx >> 8) & 0xff; }
  set ch(v: number) { this.cx = (this.cx & 0x00ff) | ((v & 0xff) << 8); }
  get dl(): number { return this.dx & 0xff; }
  set dl(v: number) { this.dx = (this.dx & 0xff00) | (v & 0xff); }
  get dh(): number { return (this.dx >> 8) & 0xff; }
  set dh(v: number) { this.dx = (this.dx & 0x00ff) | ((v & 0xff) << 8); }
  get bl(): number { return this.bx & 0xff; }
  set bl(v: number) { this.bx = (this.bx & 0xff00) | (v & 0xff); }
  get bh(): number { return (this.bx >> 8) & 0xff; }
  set bh(v: number) { this.bx = (this.bx & 0x00ff) | ((v & 0xff) << 8); }

  push(value: number): void {
    this.sp = (this.sp - 2) & 0xffff;
    this.write16(this.ss, this.sp, value);
  }

  pop(): number {
    const value = this.read16(this.ss, this.sp);
    this.sp = (this.sp + 2) & 0xffff;
    return value;
  }

  /** Far return. The translated caller already returned in JS; this only fixes the stack. */
  retf(bytes: number): void {
    this.pop();
    this.pop();
    this.sp = (this.sp + bytes) & 0xffff;
  }

  retn(bytes: number): void {
    this.pop();
    this.sp = (this.sp + bytes) & 0xffff;
  }

  cbw(): void {
    this.ax = this.al & 0x80 ? this.al | 0xff00 : this.al;
  }

  /** Sign-extend AX into DX:AX. Turbo Pascal emits this before 16-bit division. */
  cwd(): void {
    this.dx = this.ax & 0x8000 ? 0xffff : 0;
  }

  setAdcFlags(width: 8 | 16, a: number, b: number): number {
    return this.setAddFlags(width, a, b, Number(this.cf));
  }

  setSbbFlags(width: 8 | 16, a: number, b: number): number {
    return this.setSubFlags(width, a, b, Number(this.cf));
  }

  /** DOS/BIOS hook. The platform layer replaces this. */
  intr(n: number): void {
    if (this.onIntr) this.onIntr(this, n);
    else throw new Error(`int ${n.toString(16)} with no handler`);
  }

  onIntr: ((cpu: Cpu, n: number) => void) | null = null;

  portOut(port: number, value: number): void {
    this.onPortOut?.(port, value);
    for (const observer of this.portOutObservers) observer(port & 0xffff, value & 0xff);
  }

  portIn(port: number): number {
    return this.onPortIn?.(port) ?? 0xff;
  }

  onPortOut: ((port: number, value: number) => void) | null = null;
  onPortIn: ((port: number) => number) | null = null;

  private readonly portOutObservers = new Set<(port: number, value: number) => void>();

  /** Observe hardware writes without taking ownership of the emulated port bus. */
  addPortOutObserver(observer: (port: number, value: number) => void): () => void {
    this.portOutObservers.add(observer);
    return () => this.portOutObservers.delete(observer);
  }

  setSubFlags(width: 8 | 16, a: number, b: number, borrow = 0): number {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const full = a - b - borrow;
    const result = full & mask;
    this.cf = full < 0;
    this.zf = result === 0;
    this.sf = (result & sign) !== 0;
    this.of = ((a ^ b) & (a ^ result) & sign) !== 0;
    this.pf = parity(result);
    return result;
  }

  setAddFlags(width: 8 | 16, a: number, b: number, carry = 0): number {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const full = a + b + carry;
    const result = full & mask;
    this.cf = full > mask;
    this.zf = result === 0;
    this.sf = (result & sign) !== 0;
    this.of = ((~(a ^ b)) & (a ^ result) & sign) !== 0;
    this.pf = parity(result);
    return result;
  }

  /** PF for a result: set when its low byte has an even number of one bits. */
  parityOf(value: number): boolean {
    return parity(value);
  }

  setLogicFlags(width: 8 | 16, result: number): void {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const value = result & mask;
    this.cf = false;
    this.of = false;
    this.zf = value === 0;
    this.sf = (value & sign) !== 0;
    this.pf = parity(value);
  }
}

function parity(value: number): boolean {
  let bits = value & 0xff;
  bits ^= bits >> 4;
  bits ^= bits >> 2;
  bits ^= bits >> 1;
  return (bits & 1) === 0;
}
