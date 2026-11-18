import type { Cpu } from "../cpu/machine.js";
import { attachPlanarVideo, biosVideo, int10Count, resetVideo } from "./video.js";

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
  name: string;
  file: { data: Uint8Array };
  pos: number;
  writable: boolean;
  written: boolean;
  read: boolean;
}

export type DosFileClosed = (name: string, data: Uint8Array, written: boolean) => void;

export const dosLog: string[] = [];
export let consoleText = "";

export interface BiosKey {
  step: number;
  word: number;
}

export function attachDos(m: Cpu, files: DosFile[], keyboard: BiosKey[] = [],
  requestKey?: (blocking: boolean) => void, fileClosed?: DosFileClosed,
  fileDeleted?: (name: string) => void): void {
  dosLog.length = 0;
  consoleText = "";
  resetVideo();
  attachPlanarVideo(m);
  let cwd = "";
  const canonical = (name: string, base = cwd): string => {
    const path = name.replaceAll("/", "\\").toUpperCase().replace(/^[A-Z]:/, "");
    const parts = path.startsWith("\\") || !base ? [] : base.split("\\");
    for (const part of path.split("\\")) {
      if (part === "..") parts.pop();
      else if (part && part !== ".") parts.push(part);
    }
    return parts.join("\\");
  };
  const byName = new Map(files.map((f) => [canonical(f.name, ""), { data: f.data }]));
  const dirs = new Set([""]);
  const parent = (path: string) => path.slice(0, Math.max(0, path.lastIndexOf("\\")));
  for (const path of byName.keys()) {
    for (let dir = parent(path); dir; dir = parent(dir)) dirs.add(dir);
  }
  const handles = new Map<number, OpenFile>();
  let nextHandle = 5;
  let heap = 0x5000;
  let clockHundredths = 12 * 60 * 60 * 100;

  const readAsciiz = (seg: number, off: number): string => {
    let s = "";
    for (let i = 0; i < 80; i++) {
      const c = m.read8(seg, off + i);
      if (c === 0) break;
      s += String.fromCharCode(c);
    }
    return s;
  };

  m.onIntr = (cpu, n) => {
    if (n === 0x10) {
      if (dosLog.length < 24) dosLog.push(`int10 ah=${cpu.ah.toString(16)} al=${cpu.al.toString(16)} bx=${cpu.bx.toString(16)} cx=${cpu.cx.toString(16)} dx=${cpu.dx.toString(16)}`);
      biosVideo(cpu);
      if (int10Count > 400_000) throw new Error(`video storm ah=${cpu.ah.toString(16)} at ${int10Count}`);
      return;
    }
    if (n === 0x16) {
      const blocking = cpu.ah === 0 || cpu.ah === 0x10;
      if (blocking || cpu.ah === 1 || cpu.ah === 0x11) requestKey?.(blocking);
      const next = keyboard[0];
      const key = next && next.step <= cpu.steps ? next.word : undefined;
      // BIOS keyboard. AH=1 polls; an empty buffer sets ZF.
      if (cpu.ah === 1 || cpu.ah === 0x11) {
        cpu.zf = key === undefined;
        cpu.ax = key ?? 0;
        return;
      }
      if (cpu.ah === 2) {
        cpu.al = 0;
        return;
      }
      if (key !== undefined) keyboard.shift();
      cpu.ax = key ?? 0x1c0d;
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
      const value = clockHundredths++ % (24 * 60 * 60 * 100);
      const hours = Math.floor(value / 360000);
      const minutes = Math.floor(value / 6000) % 60;
      const seconds = Math.floor(value / 100) % 60;
      const hundredths = value % 100;
      cpu.cx = (hours << 8) | minutes;
      cpu.dx = (seconds << 8) | hundredths;
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
    if (ah === 0x39 || ah === 0x3b) {
      const path = canonical(readAsciiz(cpu.ds, cpu.dx));
      const exists = dirs.has(path);
      cpu.cf = ah === 0x39 ? exists || byName.has(path) || !dirs.has(parent(path)) : !exists;
      if (cpu.cf) cpu.ax = exists || byName.has(path) ? 5 : 3;
      else if (ah === 0x39) dirs.add(path);
      else cwd = path;
      return;
    }
    if (ah === 0x47) {
      for (let i = 0; i < cwd.length; i++) cpu.write8(cpu.ds, cpu.si + i, cwd.charCodeAt(i));
      cpu.write8(cpu.ds, cpu.si + cwd.length, 0);
      cpu.cf = false;
      return;
    }
    if (ah === 0x3d || ah === 0x3c) {
      const name = canonical(readAsciiz(cpu.ds, cpu.dx));
      if (ah === 0x3c && dirs.has(parent(name)) && !dirs.has(name)) {
        byName.set(name, { data: new Uint8Array() });
      }
      const file = byName.get(name);
      const hex = Array.from({ length: 64 }, (_, i) => cpu.read8(cpu.ds, cpu.dx - 0x30 + i).toString(16).padStart(2, "0")).join("");
      dosLog.push(file ? `open ${name}` : `miss ${JSON.stringify(name)} ds ${cpu.ds.toString(16)}:${cpu.dx.toString(16)} at ${cpu.cs.toString(16)}:${cpu.ip.toString(16)} rec ${hex}`);
      if (!file) {
        cpu.ax = 2;
        cpu.cf = true;
        return;
      }
      const handle = nextHandle++;
      handles.set(handle, { name, file, pos: 0, writable: ah === 0x3c || (cpu.al & 3) !== 0, written: ah === 0x3c, read: false });
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
      const count = Math.min(cpu.cx, Math.max(0, file.file.data.length - file.pos));
      file.read ||= count > 0;
      for (let i = 0; i < count; i++) cpu.write8(cpu.ds, cpu.dx + i, file.file.data[file.pos + i] ?? 0);
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
      if (!file.writable) {
        cpu.ax = 5;
        cpu.cf = true;
        return;
      }
      const end = file.pos + cpu.cx;
      const size = cpu.cx ? Math.max(end, file.file.data.length) : end;
      if (size > 0x1000000) {
        cpu.ax = 112;
        cpu.cf = true;
        return;
      }
      const data = new Uint8Array(size);
      data.set(file.file.data.subarray(0, size));
      for (let i = 0; i < cpu.cx; i++) data[file.pos + i] = cpu.read8(cpu.ds, cpu.dx + i);
      file.file.data = data;
      file.written = true;
      file.pos = end;
      cpu.ax = cpu.cx;
      cpu.cf = false;
      return;
    }
    if (ah === 0x41) {
      const name = canonical(readAsciiz(cpu.ds, cpu.dx));
      cpu.cf = !byName.delete(name);
      cpu.ax = cpu.cf ? 2 : 0;
      if (!cpu.cf) fileDeleted?.(name);
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
      else file.pos = file.file.data.length + delta;
      if (file.pos < 0) file.pos = 0;
      cpu.ax = file.pos & 0xffff;
      cpu.dx = (file.pos >>> 16) & 0xffff;
      cpu.cf = false;
      return;
    }
    if (ah === 0x3e) {
      const file = handles.get(cpu.bx);
      handles.delete(cpu.bx);
      cpu.cf = false;
      if (file && (file.written || file.read)) fileClosed?.(file.name, file.file.data, file.written);
      return;
    }
    if (ah === 0x4c) throw new Error(`dos exit ${cpu.al}`);
    throw new Error(`int 21 ah=${ah.toString(16)} al=${cpu.al.toString(16)}`);
  };
}
