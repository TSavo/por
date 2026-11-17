import { Frame } from "../lib/ega.js";
import type { Cpu } from "../cpu/machine.js";

/**
 * BIOS int 10h for the calls Pool of Radiance actually makes.
 * Mode 0x0D is 320x200, 16 colors, 40 columns of 8x8 text. The game draws
 * its early screens with AH=02 (cursor) and AH=09 (character), and pixels
 * with AH=0C. This is the platform video service, not game logic.
 */
export const screen = new Frame(320, 200, 0);
const glyphs = new Uint8Array(40 * 25);
const attrs = new Uint8Array(40 * 25);

let mode = 3;
let column = 0;
let row = 0;
export let int10Count = 0;

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

export function resetVideo(): void {
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
    mode = al;
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
