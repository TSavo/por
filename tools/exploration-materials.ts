import { createHash } from "node:crypto";
import type { NativeExploration } from "./native-exploration.js";

type Artwork = ReadonlyMap<string, { reflected?: boolean }>;
type Material = { key: string; reflected?: boolean; pixels?: number[] };

/** Generate surfaces from the active native glyph bank, including alternate levels. */
export function buildExplorationMaterials(native: NativeExploration & { area: number }, artwork: Artwork) {
  function texture(pixels: Buffer, transparent = false): Material {
    const resolved = createHash("sha256").update(pixels).digest("hex");
    const key = `tile:${native.area}:${resolved}`;
    const art = artwork.get(key);
    if (art) return { key, reflected: art.reflected };
    const indexed = [...pixels].map(color => transparent && color === 13 ? 16 : color);
    return { key: `native:${resolved}:${Number(transparent)}`, pixels: indexed };
  }

  const slots = Buffer.from(native.frontSlots, "base64");
  const partsBySymbol = new Map<number, { art: Material | null; status: string; mask?: number[] }>();
  for (const symbol of new Set(slots)) {
    const glyph = native.glyphs[symbol];
    if (symbol === 0 || !glyph) {
      partsBySymbol.set(symbol, { art: null, status: "transparent" });
      continue;
    }
    const pixels = Buffer.from(glyph, "hex");
    const mask = [...pixels].map(color => Number(color !== 13));
    if (!mask.some(Boolean)) {
      partsBySymbol.set(symbol, { art: null, status: "transparent" });
      continue;
    }
    if (mask.every(Boolean)) {
      const art = texture(pixels);
      partsBySymbol.set(symbol, { art, status: art.pixels ? "native" : "exact" });
      continue;
    }
    // Match complete native backdrop composites to the existing manifest,
    // then remove the backdrop to keep the actual wall silhouette.
    const matches = [native.skyColor, native.groundColor, 0].map(background =>
      texture(Buffer.from([...pixels].map((color, i) => mask[i] ? color : background))));
    const art = matches.find(candidate => !candidate.pixels) ?? texture(pixels, true);
    partsBySymbol.set(symbol, { art, mask, status: art.pixels ? "native" : "composited" });
  }
  const wallFaces = Array.from({ length: 15 }, (_, type) => ({
    type: type + 1,
    parts: [...slots.subarray(type * 56, type * 56 + 56)].map(symbol => partsBySymbol.get(symbol)!),
  }));
  const ground = texture(Buffer.alloc(64, native.groundColor));
  const sky = texture(Buffer.alloc(64, native.skyColor));
  const materialOverrides: { type: number; art: Material; crop: [number, number, number, number] }[] = [];
  if (native.area === 10 && native.mapId === 10) {
    // Valhingen's solid west wall uses several perspective-specific slate and path joins.
    // Use the flat slate portion of the existing crypt tile across the WebGL face.
    const key = "tile:10:a24fa37ba247373627bc3757d2e05f7a630cca2d6b3f0dd17e10b6c16e5d0ac0";
    if (artwork.has(key)) materialOverrides.push({ type: 4, art: { key }, crop: [0, 0, 16, 32] });
  }
  return { wallFaces, ground, sky, materialOverrides };
}
