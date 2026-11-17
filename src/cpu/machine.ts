/**
 * Platform stand-in for the 8086 the game was compiled for.
 * Game state lives in this memory image at the original DS offsets.
 * This file is hand-written. It is not game logic.
 */

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
  ip = 0;
  cf = false;
  zf = false;
  sf = false;
  of = false;
  df = false;

  linear(seg: number, off: number): number {
    return ((seg << 4) + (off & 0xffff)) & 0xfffff;
  }

  read8(seg: number, off: number): number {
    return this.mem[this.linear(seg, off)] ?? 0;
  }

  read16(seg: number, off: number): number {
    const lo = this.read8(seg, off);
    const hi = this.read8(seg, off + 1);
    return lo | (hi << 8);
  }

  write8(seg: number, off: number, value: number): void {
    this.mem[this.linear(seg, off)] = value & 0xff;
  }

  write16(seg: number, off: number, value: number): void {
    this.write8(seg, off, value);
    this.write8(seg, off + 1, value >> 8);
  }

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

  setSubFlags(width: 8 | 16, a: number, b: number): number {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const result = (a - b) & mask;
    this.cf = a < b;
    this.zf = result === 0;
    this.sf = (result & sign) !== 0;
    this.of = ((a ^ b) & (a ^ result) & sign) !== 0;
    return result;
  }

  setAddFlags(width: 8 | 16, a: number, b: number): number {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const full = a + b;
    const result = full & mask;
    this.cf = full > mask;
    this.zf = result === 0;
    this.sf = (result & sign) !== 0;
    this.of = ((~(a ^ b)) & (a ^ result) & sign) !== 0;
    return result;
  }

  setLogicFlags(width: 8 | 16, result: number): void {
    const mask = width === 8 ? 0xff : 0xffff;
    const sign = width === 8 ? 0x80 : 0x8000;
    const value = result & mask;
    this.cf = false;
    this.of = false;
    this.zf = value === 0;
    this.sf = (value & sign) !== 0;
  }
}
