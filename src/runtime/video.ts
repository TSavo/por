import { Frame } from "../lib/ega.js";
import type { Cpu } from "../cpu/machine.js";
import { currentObjective, type JournalLead } from "./adventure-log.js";
import { loadedSlices } from "./overlay.js";

/**
 * BIOS int 10h for the calls Pool of Radiance actually makes.
 * Mode 0x0D is 320x200, 16 colors, 40 columns of 8x8 text. The game draws
 * its early screens with AH=02 (cursor) and AH=09 (character), and pixels
 * with AH=0C. This is the platform video service, not game logic.
 */
export const screen = new Frame(320, 200, 0);
const glyphs = new Uint8Array(40 * 25);
const attrs = new Uint8Array(40 * 25);
const gameText = new Map<number, [number, number]>();

export function visibleGameText(): [number, number, number][] {
  return [...gameText].map(([cell, [character, color]]) => [cell, character, color]);
}

let mode = 3;
let column = 0;
let row = 0;
export let int10Count = 0;

const planes = Array.from({ length: 4 }, () => new Uint8Array(0x10000));
const latches = new Uint8Array(4);
const graphics = new Uint8Array(9);
let graphicsIndex = 0;
let sequencerIndex = 0;
let mapMask = 15;

/** Capture the adapter state so an interrupted guest call can be retried. */
export function checkpointVideo(): () => void {
  const pixels = screen.pixels.slice();
  const planeBytes = planes.map((plane) => plane.slice());
  const latched = latches.slice();
  const registers = graphics.slice();
  const characters = glyphs.slice();
  const colors = attrs.slice();
  const text = new Map(gameText);
  const saved = { mode, column, row, graphicsIndex, sequencerIndex, mapMask, int10Count };
  return () => {
    ({ mode, column, row, graphicsIndex, sequencerIndex, mapMask, int10Count } = saved);
    screen.pixels.set(pixels);
    planes.forEach((plane, index) => plane.set(planeBytes[index]!));
    latches.set(latched);
    graphics.set(registers);
    glyphs.set(characters);
    attrs.set(colors);
    gameText.clear();
    for (const [cell, glyph] of text) gameText.set(cell, glyph);
  };
}

function resetPlanarVideo(): void {
  gameText.clear();
  for (const plane of planes) plane.fill(0);
  latches.fill(0);
  graphics.fill(0);
  graphics[8] = 255;
  graphicsIndex = sequencerIndex = 0;
  mapMask = 15;
}

function publishVideoMode(cpu: Cpu): void {
  cpu.write8(0x40, 0x49, mode);
  cpu.write16(0x40, 0x4a, mode === 2 || mode === 3 || mode === 7 ? 80 : 40);
  cpu.write16(0x40, 0x63, mode === 7 ? 0x3b4 : 0x3d4);
}

/** EGA memory and indexed registers for planar mode 0Dh. */
export function attachPlanarVideo(cpu: Cpu): void {
  const start = 0xa0000;
  const end = start + 0x10000;
  const glyphSegment = loadedSlices.find((slice) => slice.index === 37)?.loadPara;
  publishVideoMode(cpu);
  const readOtherPort = cpu.onPortIn;
  cpu.onPortIn = (port) => {
    if (port !== 0x3da && port !== 0x3ba) return readOtherPort?.(port) ?? 0xff;
    // Deterministic scan timing for the original CRT polling loops.
    const scanline = Math.floor(cpu.steps / 128) % 262;
    const blanked = scanline >= 200 || cpu.steps % 128 >= 100;
    const verticalRetrace = scanline >= 224 && scanline < 228;
    return Number(blanked) | (verticalRetrace ? 8 : 0);
  };
  cpu.onPortOut = (port, value) => {
    if (port === 0x3c4) sequencerIndex = value;
    if (port === 0x3c5 && sequencerIndex === 2) mapMask = value & 15;
    if (port === 0x3ce) graphicsIndex = value;
    if (port === 0x3cf && graphicsIndex < graphics.length) graphics[graphicsIndex] = value;
  };
  cpu.onMemoryRead = (address) => {
    if (mode !== 0x0d || address < start || address >= end) return;
    for (let p = 0; p < 4; p++) latches[p] = planes[p]![address - start]!;
    if (!(graphics[5]! & 8)) return latches[graphics[4]! & 3]!;
    let match = 255;
    for (let p = 0; p < 4; p++) {
      if (graphics[7]! & (1 << p)) match &= ~(latches[p]! ^ ((graphics[2]! & (1 << p)) ? 255 : 0));
    }
    return match;
  };
  cpu.onMemoryWrite = (address, value) => {
    if (mode !== 0x0d || address < start || address >= end) return false;
    const offset = address - start;
    const writeMode = graphics[5]! & 3;
    const rotate = graphics[3]! & 7;
    const rotated = ((value >>> rotate) | (value << (8 - rotate))) & 255;
    const mask = graphics[8]!;
    for (let p = 0; p < 4; p++) {
      const bit = 1 << p;
      if (!(mapMask & bit)) continue;
      const latch = latches[p]!;
      if (writeMode === 1) {
        planes[p]![offset] = latch;
        continue;
      }
      let data = rotated;
      if (writeMode === 2) data = value & bit ? 255 : 0;
      else if (graphics[1]! & bit) data = graphics[0]! & bit ? 255 : 0;
      switch ((graphics[3]! >> 3) & 3) {
        case 1: data &= latch; break;
        case 2: data |= latch; break;
        case 3: data ^= latch; break;
      }
      planes[p]![offset] = (data & mask) | (latch & ~mask);
    }
    if (offset < 8000) {
      const cell = Math.floor(offset / 320) * 40 + offset % 40;
      const glyphWrite = cpu.cs === glyphSegment && (cpu.ip === 0x2aa || cpu.ip === 0x2dd);
      if (!glyphWrite) gameText.delete(cell);
      else if (cpu.read8(cpu.ss, cpu.bp - 0xf) === 7 && cpu.read8(cpu.ss, cpu.bp - 0xc) === 3) {
        const character = cpu.read8(cpu.ss, cpu.bp + 8);
        const color = cpu.read8(cpu.ss, cpu.bp + 0xc) & 15;
        if (character > 32 && character < 127 && color) gameText.set(cell, [character, color]);
        else gameText.delete(cell);
      }
      for (let x = 0; x < 8; x++) {
        let color = 0;
        for (let p = 0; p < 4; p++) color |= ((planes[p]![offset]! >> (7 - x)) & 1) << p;
        screen.pixels[offset * 8 + x] = color;
      }
    }
    return true;
  };
}

const FONT: Record<string, string[]> = {
  " ": ["...", "...", "...", "...", "..."],
  "!": [".#.", ".#.", ".#.", "...", ".#."],
  '"': ["#.#", "#.#", "...", "...", "..."],
  "#": ["#.#", "###", "#.#", "###", "#.#"],
  "$": [".#.", "###", ".#.", "###", ".#."],
  "%": ["#.#", "..#", ".#.", "#..", "#.#"],
  "&": [".#.", "#.#", ".##", "#.#", ".##"],
  "'": [".#.", ".#.", "...", "...", "..."],
  "(": [".#.", "#..", "#..", "#..", ".#."],
  ")": [".#.", "..#", "..#", "..#", ".#."],
  "*": ["...", "#.#", ".#.", "#.#", "..."],
  "+": ["...", ".#.", "###", ".#.", "..."],
  ",": ["...", "...", "...", ".#.", "#.."],
  "-": ["...", "...", "###", "...", "..."],
  ".": ["...", "...", "...", "...", ".#."],
  "/": ["..#", "..#", ".#.", "#..", "#.."],
  "0": ["###", "#.#", "#.#", "#.#", "###"],
  "1": [".#.", "##.", ".#.", ".#.", "###"],
  "2": ["###", "..#", "###", "#..", "###"],
  "3": ["###", "..#", "###", "..#", "###"],
  "4": ["#.#", "#.#", "###", "..#", "..#"],
  "5": ["###", "#..", "###", "..#", "###"],
  "6": ["###", "#..", "###", "#.#", "###"],
  "7": ["###", "..#", "..#", ".#.", ".#."],
  "8": ["###", "#.#", "###", "#.#", "###"],
  "9": ["###", "#.#", "###", "..#", "###"],
  ":": ["...", ".#.", "...", ".#.", "..."],
  ";": ["...", ".#.", "...", ".#.", "#.."],
  "<": ["..#", ".#.", "#..", ".#.", "..#"],
  "=": ["...", "###", "...", "###", "..."],
  ">": ["#..", ".#.", "..#", ".#.", "#.."],
  "?": ["###", "..#", ".#.", "...", ".#."],
  "@": ["###", "#.#", "###", "#..", "###"],
  A: [".#.", "#.#", "###", "#.#", "#.#"],
  B: ["##.", "#.#", "##.", "#.#", "##."],
  C: [".##", "#..", "#..", "#..", ".##"],
  D: ["##.", "#.#", "#.#", "#.#", "##."],
  E: ["###", "#..", "##.", "#..", "###"],
  F: ["###", "#..", "##.", "#..", "#.."],
  G: [".##", "#..", "#.#", "#.#", ".##"],
  H: ["#.#", "#.#", "###", "#.#", "#.#"],
  I: ["###", ".#.", ".#.", ".#.", "###"],
  J: ["###", "..#", "..#", "#.#", ".#."],
  K: ["#.#", "#.#", "##.", "#.#", "#.#"],
  L: ["#..", "#..", "#..", "#..", "###"],
  M: ["#.#", "###", "#.#", "#.#", "#.#"],
  N: ["#.#", "##.", "#.#", "#.#", "#.#"],
  O: [".#.", "#.#", "#.#", "#.#", ".#."],
  P: ["##.", "#.#", "##.", "#..", "#.."],
  Q: [".#.", "#.#", "#.#", ".#.", "..#"],
  R: ["##.", "#.#", "##.", "#.#", "#.#"],
  S: [".##", "#..", ".#.", "..#", "##."],
  T: ["###", ".#.", ".#.", ".#.", ".#."],
  U: ["#.#", "#.#", "#.#", "#.#", ".#."],
  V: ["#.#", "#.#", "#.#", "#.#", ".#."],
  W: ["#.#", "#.#", "#.#", "###", "#.#"],
  X: ["#.#", "#.#", ".#.", "#.#", "#.#"],
  Y: ["#.#", "#.#", ".#.", ".#.", ".#."],
  Z: ["###", "..#", ".#.", "#..", "###"],
};

function glyphRows(ch: number): string[] | null {
  if (ch === 0xdb || ch === 0xdb) return ["###", "###", "###", "###", "###"];
  if (ch === 0xdc) return ["...", "...", "###", "###", "###"];
  if (ch === 0xdf) return ["###", "###", "###", "...", "..."];
  if (ch === 0xb0 || ch === 0xb1 || ch === 0xb2) return ["#.#", ".#.", "#.#", ".#.", "#.#"];
  const text = String.fromCharCode(ch);
  return FONT[text] ?? FONT[text.toUpperCase()] ?? null;
}

function putPixel(x: number, y: number, color: number): void {
  if (x < 0 || y < 0 || x >= 320 || y >= 200) return;
  screen.pixels[y * 320 + x] = color & 0x0f;
}

function drawChar(ch: number, col: number, line: number, color: number): void {
  if (col < 0 || line < 0 || col >= 40 || line >= 25) return;
  glyphs[line * 40 + col] = ch;
  attrs[line * 40 + col] = color;
  const rows = glyphRows(ch);
  const x0 = col * 8;
  const y0 = line * 8;
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) putPixel(x0 + x, y0 + y, 0);
  }
  if (!rows) {
    if (ch !== 0x20 && ch !== 0) {
      for (let y = 1; y < 7; y++) {
        putPixel(x0 + 1, y0 + y, color);
        putPixel(x0 + 6, y0 + y, color);
      }
    }
    return;
  }
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      if (row[x] === "#") {
        putPixel(x0 + 2 + x, y0 + 1 + y, color);
      }
    }
  }
}

/** Compose a host panel on a copy of the guest display. */
export function journalFrame(leads: readonly JournalLead[], trackedId?: string): Frame {
  const frame = new Frame(screen.width, screen.height);
  frame.pixels.set(screen.pixels);
  frame.fillRect(16, 16, 288, 168, 7);
  frame.fillRect(17, 17, 286, 166, 1);
  const line = (text: string, y: number, color: number) => {
    for (let i = 0; i < Math.min(44, text.length); i++) {
      const rows = glyphRows(text.charCodeAt(i));
      rows?.forEach((row, dy) => {
        for (let dx = 0; dx < row.length; dx++) {
          if (row[dx] === "#") frame.fillRect(28 + i * 6 + dx * 2, y + dy * 2, 2, 2, color);
        }
      });
    }
  };
  line("ADVENTURE JOURNAL", 27, 14);
  frame.fillRect(28, 44, 264, 1, 7);
  let y = 54;
  const objective = currentObjective(leads, trackedId);
  const sections = [{ title: objective.title, detail: objective.nextStep }, ...leads];
  for (const lead of sections) {
    const lines = lead.detail.match(/.{1,43}(?:\s|$)|\S{1,43}/g) ?? [];
    if (y + 14 + lines.length * 12 > 174) break;
    line(lead.title, y, 11);
    y += 14;
    for (const detail of lines) {
      line(detail.trim(), y, 15);
      y += 12;
    }
    y += 10;
  }
  return frame;
}

export function resetVideo(): void {
  resetPlanarVideo();
  mode = 3;
  column = 0;
  row = 0;
  int10Count = 0;
  glyphs.fill(0);
  attrs.fill(0);
  screen.pixels.fill(0);
}

export function biosVideo(cpu: Cpu): void {
  int10Count += 1;
  const ah = cpu.ah;
  const al = cpu.al;
  if (ah === 0x00) {
    resetPlanarVideo();
    mode = al;
    publishVideoMode(cpu);
    column = 0;
    row = 0;
    glyphs.fill(0);
    attrs.fill(0);
    screen.pixels.fill(0);
    cpu.cf = false;
    return;
  }
  if (ah === 0x02) {
    column = cpu.dl;
    row = cpu.dh;
    cpu.cf = false;
    return;
  }
  if (ah === 0x03) {
    cpu.dh = row & 0xff;
    cpu.dl = column & 0xff;
    cpu.cx = 0;
    cpu.cf = false;
    return;
  }
  if (ah === 0x05) {
    cpu.cf = false;
    return;
  }
  if (ah === 0x08) {
    const index = row * 40 + column;
    cpu.al = glyphs[index] ?? 0;
    cpu.ah = attrs[index] ?? 0;
    cpu.cf = false;
    return;
  }
  if (ah === 0x09 || ah === 0x0a) {
    const color = ah === 0x0a ? 0x0f : cpu.bl & 0x0f;
    const count = cpu.cx || 1;
    for (let i = 0; i < count && i < 80; i++) drawChar(al, column + i, row, color);
    cpu.cf = false;
    return;
  }
  if (ah === 0x0e) {
    if (al === 0x0d) column = 0;
    else if (al === 0x0a) row += 1;
    else {
      drawChar(al, column, row, 0x0f);
      column += 1;
      if (column >= 40) {
        column = 0;
        row += 1;
      }
    }
    cpu.cf = false;
    return;
  }
  if (ah === 0x0c) {
    putPixel(cpu.cx, cpu.dx, al);
    cpu.cf = false;
    return;
  }
  if (ah === 0x0d) {
    const x = cpu.cx;
    const y = cpu.dx;
    cpu.al = x >= 0 && y >= 0 && x < 320 && y < 200 ? screen.pixels[y * 320 + x]! : 0;
    cpu.cf = false;
    return;
  }
  if (ah === 0x0f) {
    cpu.ah = mode === 0x0d ? 40 : 80;
    cpu.al = mode;
    cpu.bh = 0;
    cpu.cf = false;
    return;
  }
  if (ah === 0x11) {
    cpu.cx = 8;
    cpu.dl = 7;
    cpu.cf = false;
    return;
  }
  cpu.cf = false;
}

export function videoSummary(): string {
  const lines: string[] = [];
  for (let y = 0; y < 25; y++) {
    let text = "";
    for (let x = 0; x < 40; x++) {
      const ch = glyphs[y * 40 + x] ?? 0;
      text += ch >= 32 && ch < 127 ? String.fromCharCode(ch) : ch === 0 ? " " : ".";
    }
    if (text.trim()) lines.push(text.replace(/\s+$/, ""));
  }
  return `mode ${mode.toString(16)} cursor ${row},${column} int10 ${int10Count}\n${lines.join("\n")}`;
}
