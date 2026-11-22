import { EGA_RGB, Frame } from "../lib/ega.js";
import type { Cpu } from "../cpu/machine.js";
import { currentObjective, type JournalLead } from "./adventure-log.js";
import { loadedSlices } from "./overlay.js";
import { code, isAt } from "./bindings.js";

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

/**
 * How often the game has written to each 8 by 8 cell of the visible screen. From the port's own
 * data every picture is blank, so a draw over a picture can leave its pixels as they were; the
 * count still changes. Observers that hold a picture's identity use it to know it was drawn over.
 */
const cellWrites = new Uint32Array(40 * 25);

/** A number that changes whenever the game writes to any cell of the given rectangle of cells. */
export function cellWriteMark(column: number, row: number, columns: number, rows: number): number {
  let mark = 0;
  for (let y = row; y < row + rows; y++) for (let x = column; x < column + columns; x++) mark += cellWrites[y * 40 + x]!;
  return mark;
}

export type PanelFrameStamp = [x: number, y: number, kind: "rail-x" | "rail-y" | "stud"];
const panelFrame = new Map<number, PanelFrameStamp[2]>();

export function stampPanelFrame(x: number, y: number, kind: PanelFrameStamp[2]): void {
  if (x < 40 && y < 25) panelFrame.set(y * 40 + x, kind);
}

export function visiblePanelFrame(): PanelFrameStamp[] | undefined {
  if (![...panelFrame.values()].includes("stud")) return;
  return [...panelFrame].sort(([a], [b]) => a - b)
    .map(([cell, kind]) => [(cell % 40) * 8, Math.floor(cell / 40) * 8, kind]);
}

/**
 * Observers of each character the game draws with its own font: the character code, its colour,
 * and whether the host captured it as text for the page to draw. They cannot change what is drawn.
 */
export const glyphObservers = new Set<(character: number, color: number, captured: boolean) => void>();

export function visibleGameText(): [number, number, number][] {
  return [...gameText].map(([cell, [character, color]]) => [cell, character, color]);
}

/**
 * The runes on screen: text cell, glyph code and colour of each glyph the game has drawn from its
 * rune font and not drawn over since. The game writes Espruar and Dethek words with these (script
 * opcode 3C, and the code-wheel question at start-up) for the player to translate with the wheel,
 * so they are never text for the page to draw as letters: they stay in the picture. The codes are
 * the ones qa/research/code-wheel.md uses: Espruar A is 01 02, Dethek A is 3a.
 */
const gameRunes = new Map<number, [number, number]>();
export function visibleGameRunes(): [number, number, number][] {
  return [...gameRunes].map(([cell, [glyph, color]]) => [cell, glyph, color]);
}

let mode = 3;
let column = 0;
let row = 0;
export let int10Count = 0;

/**
 * The EGA attribute controller: sixteen palette registers, each naming the 6-bit colour that a
 * pixel value is shown in, and the overscan (border) register. The game sets them through int 10h
 * AH=10h: on the title (slice 1) register 1 flashes through 9, 11 and 15 and back, and slice 31's
 * two routines show 0 as dark grey and 8 as black, then put them back. What `screen` holds is the
 * pixel value the game drew; the colour it is shown in is the register's.
 */
const paletteRegisters = new Uint8Array(16);
let overscan = 0;
/** Mode 0Dh is a 200-line mode: the monitor takes bit 4 of a register as intensity and ignores bits 3 and 5. */
let twoHundredLines = false;
/** The page int 10h AH=05h selected; in mode 0Dh each page is 0x2000 bytes of each plane. */
let displayPage = 0;
const planarPageBytes = 0x2000;
/** Changes whenever a palette register does. */
export let paletteRevision = 0;
/** Observers of each palette change: the sixteen registers after it. They cannot change what is shown. */
export const paletteObservers = new Set<(registers: readonly number[], cpu: Cpu) => void>();

function defaultPalette(): void {
  twoHundredLines = mode >= 4 && mode <= 6 || mode === 0x0d || mode === 0x0e;
  // The BIOS's tables for each kind of mode: the sixteen CGA colours in 200 lines, the EGA's own in 350.
  for (let value = 0; value < 16; value++) {
    paletteRegisters[value] = twoHundredLines ? (value & 7) | (value & 8) << 1
      : value === 6 ? 0x14 : value < 8 ? value : 0x30 | value;
  }
  overscan = 0;
  paletteRevision++;
}
defaultPalette();

/** The colour (an index into EGA_RGB) that a 6-bit EGA colour shows as on a 200-line monitor. */
function cgaColor(value: number): number {
  return (value & 7) | (value & 0x10) >> 1;
}

/** The red, green and blue of a 6-bit EGA colour as the current mode shows it. */
function egaColor(value: number): readonly [number, number, number] {
  if (twoHundredLines) return EGA_RGB[cgaColor(value)]!;
  const level = (primary: number, secondary: number) => (value >> primary & 1) * 0xaa + (value >> secondary & 1) * 0x55;
  return [level(2, 5), level(1, 4), level(0, 3)];
}

/** The colour each of the sixteen pixel values is shown in now, as the original's display shows it. */
export function displayPalette(): (readonly [number, number, number])[] {
  return Array.from(paletteRegisters, egaColor);
}

/** The sixteen palette registers as they stand. */
export function paletteState(): number[] {
  return [...paletteRegisters];
}

function paletteChanged(cpu: Cpu): void {
  paletteRevision++;
  for (const observer of paletteObservers) observer([...paletteRegisters], cpu);
}

/** Show the eight-pixel group at this offset of the visible page from the planes. */
function showPlanarByte(shown: number, offset: number): void {
  for (let x = 0; x < 8; x++) {
    let color = 0;
    for (let p = 0; p < 4; p++) color |= ((planes[p]![offset]! >> (7 - x)) & 1) << p;
    screen.pixels[shown * 8 + x] = color;
  }
}

const planes = Array.from({ length: 4 }, () => new Uint8Array(0x10000));
const latches = new Uint8Array(4);
const graphics = new Uint8Array(9);
let graphicsIndex = 0;
let sequencerIndex = 0;
let mapMask = 15;

function resetPlanarVideo(): void {
  gameText.clear();
  gameRunes.clear();
  panelFrame.clear();
  for (let cell = 0; cell < cellWrites.length; cell++) cellWrites[cell]!++;
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
  publishDisplayPage(cpu);
}

/** The BIOS data area's active page and the page's start in video memory. */
function publishDisplayPage(cpu: Cpu): void {
  cpu.write8(0x40, 0x62, displayPage);
  cpu.write16(0x40, 0x4e, displayPage * (mode === 0x0d ? planarPageBytes : mode === 2 || mode === 3 || mode === 7 ? 0x1000 : 0x800));
}

/** EGA memory and indexed registers for planar mode 0Dh. */
export function attachPlanarVideo(cpu: Cpu): void {
  const start = 0xa0000;
  const end = start + 0x10000;
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
    // Only the page int 10h AH=05h selected is on screen; the game draws its offscreen pictures on page 1.
    const shown = offset - displayPage * planarPageBytes;
    if (shown >= 0 && shown < 8000) {
      const cell = Math.floor(shown / 320) * 40 + shown % 40;
      cellWrites[cell]!++;
      if (panelFrame.size) panelFrame.delete(cell);
      const glyphWrite = isAt(cpu, cpu.ip, code.glyphStoreA) || isAt(cpu, cpu.ip, code.glyphStoreB);
      const glyphRepeat = isAt(cpu, cpu.ip, code.glyphRepeatA) || isAt(cpu, cpu.ip, code.glyphRepeatB);
      if (glyphRepeat) {
        // The repeated store writes the row the first store just wrote.
      } else if (!glyphWrite) {
        gameText.delete(cell);
        gameRunes.delete(cell);
      } else if (cpu.read8(cpu.ss, cpu.bp - 0xf) === 7 && cpu.read8(cpu.ss, cpu.bp - 0xc) === 3) {
        const character = cpu.read8(cpu.ss, cpu.bp + 8);
        const color = cpu.read8(cpu.ss, cpu.bp + 0xc) & 15;
        // The text routine's first argument chooses the font: 1 for letters, 0 for the rune font,
        // where the character is the glyph code plus 0x40. A rune is not a letter, whatever
        // letter has the same code.
        const rune = cpu.read8(cpu.ss, cpu.bp + 6) === 0;
        if (!rune && character > 32 && character < 127 && color) gameText.set(cell, [character, color]);
        else gameText.delete(cell);
        if (rune && character > 0x40 && color) gameRunes.set(cell, [character - 0x40, color]);
        else gameRunes.delete(cell);
        for (const observer of glyphObservers) observer(character, color, gameText.has(cell));
      }
      showPlanarByte(shown, offset);
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
  if (panelFrame.size) panelFrame.delete((y >> 3) * 40 + (x >> 3));
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
  displayPage = 0;
  defaultPalette();
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
    displayPage = 0;
    // Setting a mode loads that mode's palette into the registers.
    defaultPalette();
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
    // Select the display page. The game selects page 0 when it sets mode 0Dh (START.EXE image 7101)
    // and draws its offscreen pictures on page 1 (image 7147 with page 1), which is never shown.
    const page = al & 7;
    if (page !== displayPage) {
      displayPage = page;
      if (mode === 0x0d) {
        for (let cell = 0; cell < cellWrites.length; cell++) cellWrites[cell]!++;
        for (let shown = 0; shown < 8000; shown++) showPlanarByte(shown, displayPage * planarPageBytes + shown);
      }
    }
    publishDisplayPage(cpu);
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
    cpu.bh = displayPage;
    cpu.cf = false;
    return;
  }
  if (ah === 0x10) {
    // The EGA palette functions. The game uses AL=00 (START.EXE image 704d, from slices 1 and 31).
    if (al === 0x00 && cpu.bl < 16) {
      paletteRegisters[cpu.bl] = cpu.bh & 0x3f;
      paletteChanged(cpu);
    } else if (al === 0x01 || (al === 0x00 && cpu.bl === 0x11)) {
      overscan = cpu.bh & 0x3f;
    } else if (al === 0x02) {
      // Sixteen registers and the overscan register from ES:DX.
      for (let index = 0; index < 16; index++) paletteRegisters[index] = cpu.read8(cpu.es, (cpu.dx + index) & 0xffff) & 0x3f;
      overscan = cpu.read8(cpu.es, (cpu.dx + 16) & 0xffff) & 0x3f;
      paletteChanged(cpu);
    } else if (al === 0x07 && cpu.bl < 16) {
      cpu.bh = paletteRegisters[cpu.bl]!;
    } else if (al === 0x08) {
      cpu.bh = overscan;
    } else if (al === 0x09) {
      for (let index = 0; index < 16; index++) cpu.write8(cpu.es, (cpu.dx + index) & 0xffff, paletteRegisters[index]!);
      cpu.write8(cpu.es, (cpu.dx + 16) & 0xffff, overscan);
    }
    // AL=03 (blink or intensity) changes nothing in a graphics mode; the VGA's DAC calls are not EGA's.
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
