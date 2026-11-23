import type { Cpu } from "../src/cpu/machine.js";
import { data, eclGlobalOffset } from "../src/runtime/bindings.js";

export interface NativeExploration {
  x: number;
  y: number;
  facing: number;
  roofed: boolean;
  mapId?: number;
  areaView?: boolean;
  viewportCleared?: boolean;
  walls: string;
  /** GEO extra plane, 256 bytes: two passage bits on each side of a square. */
  extra?: string;
  frontSlots: string;
  glyphs: Record<number, string>;
  skyColor: number;
  groundColor: number;
  cellGeometry?: { wallSymbols: string; lineColor: number; bandColor: number };
}

/** Read the same active map and graphics records the guest's scenery draw used. */
export function captureNativeExploration(cpu: Cpu, includeCellGeometry = false): NativeExploration | undefined {
  const ds = cpu.ds;
  const geoOffset = cpu.read16(ds, data.geo);
  const geoSegment = cpu.read16(ds, data.geo + 2);
  const wallOffset = cpu.read16(ds, data.walls);
  const wallSegment = cpu.read16(ds, data.walls + 2);
  const x = cpu.read8(ds, data.cameraX);
  const y = cpu.read8(ds, data.cameraY);
  const facing = cpu.read8(ds, data.facing);
  if (!geoSegment || !wallSegment || x > 15 || y > 15 || facing > 6 || facing % 2) return;
  const partyOffset = cpu.read16(ds, data.eclGlobals);
  const partySegment = cpu.read16(ds, data.eclGlobals + 2);
  // The active GEO block is guest ECL variable 0x49c5 in the party record.
  const mapId = partySegment ? cpu.read16(partySegment, partyOffset + eclGlobalOffset(0x49c5)) : undefined;

  // The first two planes contain the four wall nibbles for each tile.
  const walls = Buffer.from(Array.from({ length: 512 }, (_, i) => cpu.read8(geoSegment, geoOffset + i)));
  const extra = Buffer.from(Array.from({ length: 256 }, (_, i) => cpu.read8(geoSegment, geoOffset + 0x300 + i)));
  // Bit 7 of the following per-square flag plane selects the guest's covered sky.
  const roofed = (cpu.read8(geoSegment, geoOffset + 512 + y * 16 + x) & 0x80) !== 0;
  const slots = Buffer.from(Array.from({ length: 15 * 56 }, (_, i) =>
    cpu.read8(wallSegment, wallOffset + Math.floor(i / 56) * 156 + 54 + i % 56)));
  const planeMasks = [0, 1, 2, 3].map(plane => cpu.read8(ds, data.planeMasks + plane) & 15);
  const glyphs: Record<number, string> = {};
  for (const symbol of new Set(slots)) {
    if (!symbol) continue;
    const group = symbol < 0x2e ? 0 : symbol < 0x74 ? 1 : symbol < 0xba ? 2 : 3;
    const index = symbol - cpu.read16(ds, data.glyphBase + group * 2);
    const offset = cpu.read16(ds, data.glyphBanks + group * 4);
    const segment = cpu.read16(ds, data.glyphBanks + 2 + group * 4);
    const size = cpu.read16(segment, offset + 0x11);
    if (!segment || size !== 32 || index < 0 || index >= 70) continue;
    const bitmap = offset + 0x17 + index * size;
    const maskOffset = cpu.read16(segment, offset + 0x13);
    const maskSegment = cpu.read16(segment, offset + 0x15);
    const hasMask = maskOffset !== 0 || maskSegment !== 0;
    const maskBitmap = maskOffset + index * (size / 4);
    const pixels = Buffer.alloc(64);
    for (let row = 0; row < 8; row++) {
      const planes = planeMasks.map((_, plane) => cpu.read8(segment, bitmap + row * 4 + plane));
      // Overlay 36's EGA blit uses one mask byte for all four planes.
      // Transparent color 13 otherwise reads as black in the color bitmap.
      const transparent = hasMask ? cpu.read8(maskSegment, maskBitmap + row) : 0;
      for (let x = 0; x < 8; x++) {
        const bit = 0x80 >> x;
        pixels[row * 8 + x] = (transparent & bit) ? 13 :
          planes.reduce((color, bits, plane) => color | (bits & bit ? planeMasks[plane]! : 0), 0);
      }
    }
    glyphs[symbol] = pixels.toString("hex");
  }
  // Overlay 30's backdrop draw reads the top and bottom fill colors here.
  const cellGeometry = includeCellGeometry ? {
    wallSymbols: Buffer.from(Array.from({ length: 15 * 156 }, (_, i) =>
      cpu.read8(wallSegment, wallOffset + i))).toString("base64"),
    // The boundary line and band sit between the sky and ground colors.
    lineColor: cpu.read8(ds, data.skyColor + 1) & 15,
    bandColor: cpu.read8(ds, data.skyColor + 2) & 15,
  } : undefined;
  const areaView = cpu.read8(ds, data.areaViewActive) !== 0 || undefined;
  return { x, y, facing, roofed, mapId, areaView, walls: walls.toString("base64"), extra: extra.toString("base64"), frontSlots: slots.toString("base64"), glyphs,
    skyColor: cpu.read8(ds, data.skyColor) & 15, groundColor: cpu.read8(ds, data.groundColor) & 15, cellGeometry };
}
