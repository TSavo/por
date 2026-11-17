/**
 * SCAFFOLDING map and 3D view. The geometry was not translated from
 * Pool of Radiance. Presentation may call it until the real draw procedures
 * (still in untranslated overlays) replace it.
 */
import { Frame, TRANSPARENT } from "./ega.js";
import { decodePicture, isPicture, type Picture } from "./picture.js";

/** 16x16 Gold Box square. Directions 0,2,4,6 are N,E,S,W. */
export interface Cell {
  wall: [number, number, number, number];
  flags: number;
  extra: [number, number, number, number];
}

export interface GeoMap {
  id: number;
  cells: Cell[];
}

const DX = [0, 1, 1, 1, 0, -1, -1, -1];
const DY = [-1, -1, 0, 1, 1, 1, 0, -1];

export function directionDelta(dir: number): { x: number; y: number } {
  const i = ((dir % 8) + 8) % 8;
  return { x: DX[i] ?? 0, y: DY[i] ?? 0 };
}

export function parseGeo(block: Uint8Array, id: number): GeoMap {
  if (block.length < 0x402) {
    throw new Error(`GEO block ${id} is ${block.length} bytes, expected 1026`);
  }
  const body = block.subarray(2, 0x402);
  const cells: Cell[] = [];
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const i = (y << 4) + x;
      const a = body[i] ?? 0;
      const b = body[0x100 + i] ?? 0;
      const flags = body[0x200 + i] ?? 0;
      const extra = body[0x300 + i] ?? 0;
      cells.push({
        wall: [(a >> 4) & 15, a & 15, (b >> 4) & 15, b & 15],
        flags,
        extra: [extra & 3, (extra >> 2) & 3, (extra >> 4) & 3, (extra >> 6) & 3],
      });
    }
  }
  return { id, cells };
}

export function cellAt(map: GeoMap, x: number, y: number): Cell | null {
  if (x < 0 || y < 0 || x > 15 || y > 15) return null;
  return map.cells[y * 16 + x] ?? null;
}

/** Wall type on the named side of a square. 0 is open. Out of bounds is open. */
export function wallType(map: GeoMap, dir: number, x: number, y: number): number {
  const cell = cellAt(map, x, y);
  if (!cell) return 0;
  const index = [0, 2, 4, 6].indexOf(((dir % 8) + 8) % 8);
  if (index < 0) return 0;
  return cell.wall[index] ?? 0;
}

export function canStep(map: GeoMap, x: number, y: number, dir: number): boolean {
  return wallType(map, dir, x, y) === 0;
}

/**
 * Glyph sets, addressed the way the renderer does.
 * Set 0 is ids 1..0x2D, set 1 is 0x2E..0x73, then 0x74, 0xBA, 0x100.
 */
export const SYMBOL_BASE = [0x0001, 0x002e, 0x0074, 0x00ba, 0x0100] as const;

export interface GlyphSet {
  base: number;
  width: number;
  height: number;
  frames: Uint8Array[];
}

export function glyphsFromPicture(picture: Picture, base: number): GlyphSet {
  const n = picture.width * picture.height;
  const frames: Uint8Array[] = [];
  for (let i = 0; i < picture.itemCount; i++) {
    frames.push(picture.pixels.subarray(i * n, (i + 1) * n));
  }
  return { base, width: picture.width, height: picture.height, frames };
}

export function glyphFor(sets: GlyphSet[], symbolId: number): { set: GlyphSet; index: number } | null {
  if (symbolId <= 0) return null;
  for (let i = sets.length - 1; i >= 0; i--) {
    const set = sets[i];
    if (!set) continue;
    if (symbolId >= set.base) {
      const index = symbolId - set.base;
      if (index >= 0 && index < set.frames.length) return { set, index };
    }
  }
  return null;
}

/** One 5x156 wall-slot table. Values >= 0x2D are shifted when the set is not the first. */
export function loadWalldef(block: Uint8Array, setIndex: number): Uint8Array {
  if (block.length < 780) throw new Error(`walldef block is ${block.length} bytes, expected 780`);
  const out = new Uint8Array(block.subarray(0, 780));
  const offset = (SYMBOL_BASE[setIndex + 1] ?? SYMBOL_BASE[1]) - SYMBOL_BASE[1];
  if (offset !== 0) {
    for (let i = 0; i < out.length; i++) {
      if ((out[i] ?? 0) >= 0x2d) out[i] = ((out[i] ?? 0) + offset) & 0xff;
    }
  }
  return out;
}

export function wallSlot(block: Uint8Array, slice: number, index: number): number {
  if (slice < 0 || slice > 4 || index < 0 || index > 155) return 0;
  return block[slice * 156 + index] ?? 0;
}

/**
 * 11x11 character window. Slot geometry is the Gold Box table at seg600:0ADA
 * in the CotAB engine (the same window Pool of Radiance drew). Each slot is
 * a rectangle of 8x8 glyphs looked up in the walldef for that wall type.
 */
const SLOT_INDEX = [0, 2, 6, 10, 22, 38, 54, 110, 132, 154];
const SLOT_COLS = [1, 1, 1, 3, 2, 2, 7, 2, 2, 1];
const SLOT_ROWS = [2, 4, 4, 4, 8, 8, 8, 11, 11, 2];
const SLOT_POS: Record<string, [number, number]> = {
  A: [5, 4],
  B: [4, 3],
  C: [6, 3],
  D: [4, 3],
  E: [2, 1],
  F: [7, 1],
  G: [2, 1],
  H: [0, 0],
  I: [9, 0],
  J: [5, 4],
};

export interface ViewportAssets {
  map: GeoMap;
  walldefs: Uint8Array[];
  glyphs: GlyphSet[];
}

function paintBackdrop(frame: Frame): void {
  frame.fillRect(0, 0, 88, 40, 11);
  frame.fillRect(0, 40, 88, 48, 6);
}

function blitGlyph(frame: Frame, assets: ViewportAssets, symbolId: number, col: number, row: number): void {
  if (row < 0 || row > 10 || col < 0 || col > 10 || symbolId <= 0) return;
  const found = glyphFor(assets.glyphs, symbolId);
  if (!found) return;
  const sprite = found.set.frames[found.index];
  if (!sprite) return;
  frame.blit(sprite, found.set.width, found.set.height, col * 8, row * 8);
}

function drawPiece(
  frame: Frame,
  assets: ViewportAssets,
  slot: number,
  wall: number,
  row: number,
  col: number,
): void {
  if (wall <= 0) return;
  const set = Math.floor((wall - 1) / 5);
  const slice = (wall - 1) % 5;
  const table = assets.walldefs[set];
  if (!table) return;
  const cols = SLOT_COLS[slot] ?? 0;
  const rows = SLOT_ROWS[slot] ?? 0;
  let index = SLOT_INDEX[slot] ?? 0;
  for (let y = row; y < row + rows; y++) {
    for (let x = col; x < col + cols; x++) {
      blitGlyph(frame, assets, wallSlot(table, slice, index), x, y);
      index++;
    }
  }
}

function drawFar(
  frame: Frame,
  assets: ViewportAssets,
  dir: number,
  left: number,
  right: number,
  x: number,
  y: number,
): void {
  const step = (px: number, py: number, facing: number) => {
    const d = directionDelta(facing);
    return { x: px + d.x, y: py + d.y };
  };
  let px = x;
  let py = y;
  let col = 0;
  let prev = 0;
  for (let i = 0; i < 4; i++) {
    const wall = wallType(assets.map, dir, px, py);
    if (!cellAt(assets.map, px, py) && wallType(assets.map, right, px, py) === 0) prev = 0;
    if (wall !== 0) {
      if (prev > 0) drawPiece(frame, assets, 9, prev, SLOT_POS.J![1], SLOT_POS.J![0] + col + 1);
      prev = wall;
      drawPiece(frame, assets, 0, wall, SLOT_POS.A![1], SLOT_POS.A![0] + col);
    } else {
      const back = step(px, py, (left + 4) % 8);
      if (prev > 0 && wallType(assets.map, left, back.x, back.y) !== 0) {
        drawPiece(frame, assets, 9, prev, SLOT_POS.J![1], SLOT_POS.J![0] + col + 1);
      }
      prev = 0;
    }
    col -= 2;
    const moved = step(px, py, left);
    px = moved.x;
    py = moved.y;
  }

  px = x;
  py = y;
  col = 0;
  prev = 0;
  for (let i = 0; i < 4; i++) {
    const wall = wallType(assets.map, dir, px, py);
    if (!cellAt(assets.map, px, py) && wallType(assets.map, left, px, py) === 0) prev = 0;
    if (wall !== 0) {
      if (prev > 0) drawPiece(frame, assets, 9, prev, SLOT_POS.J![1], SLOT_POS.J![0] + col - 1);
      prev = wall;
      drawPiece(frame, assets, 0, wall, SLOT_POS.A![1], SLOT_POS.A![0] + col);
    } else {
      const back = step(px, py, (right + 4) % 8);
      if (prev > 0 && wallType(assets.map, right, back.x, back.y) !== 0) {
        drawPiece(frame, assets, 9, prev, SLOT_POS.J![1], SLOT_POS.J![0] + col - 1);
      }
      prev = 0;
    }
    col += 2;
    const moved = step(px, py, right);
    px = moved.x;
    py = moved.y;
  }

  px = x;
  py = y;
  col = 0;
  for (let i = 0; i < 3; i++) {
    const side = wallType(assets.map, left, px, py);
    if (side !== 0) {
      const nudge = i === 0 ? 0 : -1;
      drawPiece(frame, assets, 1, side, SLOT_POS.B![1], SLOT_POS.B![0] + col + nudge);
    }
    col -= 2;
    const moved = step(px, py, left);
    px = moved.x;
    py = moved.y;
  }

  px = x;
  py = y;
  col = 0;
  for (let i = 0; i < 3; i++) {
    const side = wallType(assets.map, right, px, py);
    if (side !== 0) {
      const nudge = i === 0 ? 0 : 1;
      drawPiece(frame, assets, 2, side, SLOT_POS.C![1], SLOT_POS.C![0] + col + nudge);
    }
    col += 2;
    const moved = step(px, py, right);
    px = moved.x;
    py = moved.y;
  }
}

function drawMid(
  frame: Frame,
  assets: ViewportAssets,
  dir: number,
  left: number,
  right: number,
  x: number,
  y: number,
): void {
  const dL = directionDelta(left);
  const dR = directionDelta(right);
  let px = x + dL.x * 2;
  let py = y + dL.y * 2;
  let col = -6;
  for (let i = 0; i < 3; i++) {
    const front = wallType(assets.map, dir, px, py);
    if (front) drawPiece(frame, assets, 3, front, SLOT_POS.D![1], SLOT_POS.D![0] + col);
    const side = wallType(assets.map, left, px, py);
    if (side) drawPiece(frame, assets, 4, side, SLOT_POS.E![1], SLOT_POS.E![0] + col);
    col += 3;
    px += dR.x;
    py += dR.y;
  }
  px = x + dR.x * 2;
  py = y + dR.y * 2;
  col = 6;
  for (let i = 0; i < 3; i++) {
    const front = wallType(assets.map, dir, px, py);
    if (front) drawPiece(frame, assets, 3, front, SLOT_POS.D![1], SLOT_POS.D![0] + col);
    const side = wallType(assets.map, right, px, py);
    if (side) drawPiece(frame, assets, 5, side, SLOT_POS.F![1], SLOT_POS.F![0] + col);
    col -= 3;
    px += dL.x;
    py += dL.y;
  }
}

function drawNear(
  frame: Frame,
  assets: ViewportAssets,
  dir: number,
  left: number,
  right: number,
  x: number,
  y: number,
): void {
  const dL = directionDelta(left);
  const dR = directionDelta(right);
  let px = x + dL.x;
  let py = y + dL.y;
  let col = -7;
  for (let i = 0; i < 2; i++) {
    const front = wallType(assets.map, dir, px, py);
    if (front) drawPiece(frame, assets, 6, front, SLOT_POS.G![1], SLOT_POS.G![0] + col);
    const side = wallType(assets.map, left, px, py);
    if (side) drawPiece(frame, assets, 7, side, SLOT_POS.H![1], SLOT_POS.H![0] + col);
    col += 7;
    px += dR.x;
    py += dR.y;
  }
  px = x + dR.x;
  py = y + dR.y;
  col = 7;
  for (let i = 0; i < 2; i++) {
    const front = wallType(assets.map, dir, px, py);
    if (front) drawPiece(frame, assets, 6, front, SLOT_POS.G![1], SLOT_POS.G![0] + col);
    const side = wallType(assets.map, right, px, py);
    if (side) drawPiece(frame, assets, 8, side, SLOT_POS.I![1], SLOT_POS.I![0] + col);
    col -= 7;
    px += dL.x;
    py += dL.y;
  }
}

/** Classic 88x88 dungeon window, far pieces first. */
export function renderViewport(assets: ViewportAssets, x: number, y: number, dir: number): Frame {
  const frame = new Frame(88, 88, 0);
  paintBackdrop(frame);
  const left = (dir + 6) % 8;
  const right = (dir + 2) % 8;
  const behind = (dir + 4) % 8;
  const d = directionDelta(dir);
  const b = directionDelta(behind);
  let px = x + d.x * 2;
  let py = y + d.y * 2;
  for (let step = 2; step >= 0; step--) {
    if (step === 2) drawFar(frame, assets, dir, left, right, px, py);
    else if (step === 1) drawMid(frame, assets, dir, left, right, px, py);
    else drawNear(frame, assets, dir, left, right, px, py);
    px += b.x;
    py += b.y;
  }
  return frame;
}

export function composeScreen(viewport: Frame): Frame {
  const screen = new Frame(320, 200, 0);
  screen.fillRect(0, 0, 320, 200, 1);
  screen.fillRect(12, 12, 96, 96, 0);
  screen.blit(viewport.pixels, viewport.width, viewport.height, 16, 16);
  return screen;
}

export function pictureOrNull(block: Uint8Array, masked: boolean): Picture | null {
  if (!isPicture(block)) return null;
  return decodePicture(block, masked ? 13 : null);
}

export { TRANSPARENT };
