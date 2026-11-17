import type { Cpu } from "../cpu/machine.js";
import { biosVideo, int10Count, resetVideo } from "./video.js";

/**
 * The DOS calls Turbo Pascal's System unit makes. This is the platform
 * layer: it serves the game's own data files and a bump heap. It does not
 * decide game rules.
 */
export interface DosFile {
  name: string;
  data: Uint8Array;
}

interface OpenFile {
  data: Uint8Array;
  pos: number;
}

export const dosLog: string[] = [];
export let consoleText = "";

export function attachDos(m: Cpu, files: DosFile[]): void {
  dosLog.length = 0;
  consoleText = "";
  resetVideo();
  const byName = new Map(files.map((f) => [f.name.toUpperCase(), f.data]));
  const handles = new Map<number, OpenFile>();
  let nextHandle = 5;
  let heap = 0x5000;

  const readAsciiz = (seg: number, off: number): string => {
    let s = "";
    for (let i = 0; i < 80; i++) {
      const c = m.read8(seg, off + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  let interrupts = 0;
  m.onIntr = (cpu, n) => {
    if (n === 0x10) {
      if (dosLog.length < 24) dosLog.push(`int10 ah=${cpu.ah.toString(16)} al=${cpu.al.toString(16)} bx=${cpu.bx.toString(16)} cx=${cpu.cx.toString(16)} dx=${cpu.dx.toString(16)}`);
      biosVideo(cpu);
      if (int10Count > 400_000) throw new Error(`video storm ah=${cpu.ah.toString(16)} at ${int10Count}`);
      return;
    }
    interrupts += 1;
    if (interrupts > 20000) throw new Error(`interrupt storm at int ${n.toString(16)} ah=${cpu.ah.toString(16)}`);
    if (n === 0x16) {
      // BIOS keyboard. AH=1 polls; an empty buffer sets ZF.
      if (cpu.ah === 1 || cpu.ah === 0x11) {
        cpu.zf = true;
        cpu.ax = 0;
        return;
      }
      if (cpu.ah === 2) {
        cpu.al = 0;
        return;
      }
      cpu.ax = 0x1c0d;
      cpu.zf = false;
      return;
    }
    if (n === 0x23 || n === 0x24 || n === 0x1b) return;
    if (n !== 0x21) throw new Error(`int ${n.toString(16)} ah=${cpu.ah.toString(16)}`);
    const ah = cpu.ah;
    if (ah === 0x30) {
      cpu.ax = 5;
      cpu.cf = false;
      return;
    }
    if (ah === 0x25 || ah === 0x35) {
      cpu.cf = false;
      if (ah === 0x35) {
        cpu.es = 0;
        cpu.bx = 0;
      }
      return;
    }
    if (ah === 0x2a) {
      cpu.cx = 1988;
      cpu.dx = 0x0601;
      cpu.al = 3;
      cpu.cf = false;
      return;
    }
    if (ah === 0x2c) {
      cpu.cx = 0x0c00;
      cpu.dx = 0;
      cpu.cf = false;
      return;
    }
    if (ah === 0x19) {
      cpu.al = 2;
      cpu.cf = false;
      return;
    }
    if (ah === 0x0e || ah === 0x1a || ah === 0x33) {
      cpu.cf = false;
      return;
    }
    if (ah === 0x48) {
      const paras = cpu.bx;
      cpu.ax = heap;
      heap += paras;
      cpu.cf = false;
      return;
    }
    if (ah === 0x49 || ah === 0x4a) {
      cpu.cf = false;
      return;
    }
    if (ah === 0x02 || (ah === 0x06 && cpu.dl !== 0xff)) {
      const ch = cpu.dl === 0x0d ? "" : cpu.dl === 0x0a ? "\n" : String.fromCharCode(cpu.dl);
      consoleText += ch;
      cpu.zf = false;
      cpu.cf = false;
      return;
    }
    if (ah === 0x06 && cpu.dl === 0xff) {
      cpu.zf = true;
      cpu.al = 0;
      cpu.cf = false;
      return;
    }
    if (ah === 0x09) {
      let off = cpu.dx;
      for (let i = 0; i < 200; i++) {
        const ch = cpu.read8(cpu.ds, off);
        if (ch === 0x24) break;
        consoleText += ch === 0x0d ? "" : ch === 0x0a ? "\n" : String.fromCharCode(ch);
        off = (off + 1) & 0xffff;
      }
      cpu.cf = false;
      return;
    }
    if (ah === 0x44) {
      cpu.cf = false;
      cpu.dx = 0;
      cpu.ax = 0;
      return;
    }
    if (ah === 0x3d) {
      const name = readAsciiz(cpu.ds, cpu.dx).toUpperCase();
      const base = name.split("\\").pop() ?? name;
      const data = byName.get(base);
      const hex = Array.from({ length: 64 }, (_, i) => cpu.read8(cpu.ds, cpu.dx - 0x30 + i).toString(16).padStart(2, "0")).join("");
      dosLog.push(data ? `open ${base}` : `miss ds ${cpu.ds.toString(16)}:${cpu.dx.toString(16)} at ${cpu.cs.toString(16)}:${cpu.ip.toString(16)} rec ${hex}`);
      if (!data) {
        cpu.ax = 2;
        cpu.cf = true;
        return;
      }
      const handle = nextHandle++;
      handles.set(handle, { data, pos: 0 });
      cpu.ax = handle;
      cpu.cf = false;
      return;
    }
    if (ah === 0x3f) {
      const file = handles.get(cpu.bx);
      if (!file) {
        cpu.ax = 6;
        cpu.cf = true;
        return;
      }
      const count = Math.min(cpu.cx, file.data.length - file.pos);
      for (let i = 0; i < count; i++) cpu.write8(cpu.ds, cpu.dx + i, file.data[file.pos + i] ?? 0);
      file.pos += count;
      cpu.ax = count;
      cpu.cf = false;
      return;
    }
    if (ah === 0x40) {
      const file = handles.get(cpu.bx);
      if (!file) {
        cpu.ax = 6;
        cpu.cf = true;
        return;
      }
      cpu.ax = cpu.cx;
      cpu.cf = false;
      return;
    }
    if (ah === 0x42) {
      const file = handles.get(cpu.bx);
      if (!file) {
        cpu.ax = 6;
        cpu.cf = true;
        return;
      }
      const delta = (cpu.cx << 16) | cpu.dx;
      if (cpu.al === 0) file.pos = delta;
      else if (cpu.al === 1) file.pos += delta;
      else file.pos = file.data.length + delta;
      if (file.pos < 0) file.pos = 0;
      cpu.ax = file.pos & 0xffff;
      cpu.dx = (file.pos >>> 16) & 0xffff;
      cpu.cf = false;
      return;
    }
    if (ah === 0x3e) {
      handles.delete(cpu.bx);
      cpu.cf = false;
      return;
    }
    if (ah === 0x4c) throw new Error(`dos exit ${cpu.al}`);
    throw new Error(`int 21 ah=${ah.toString(16)} al=${cpu.al.toString(16)}`);
  };
}
