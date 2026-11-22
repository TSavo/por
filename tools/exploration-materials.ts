import { createHash } from "node:crypto";
import type { TileFingerprint } from "../src/runtime/game-data.js";
import type { NativeExploration } from "./native-exploration.js";

type Artwork = ReadonlyMap<string, { file?: string; reflected?: boolean; screenCellOnly?: boolean }>;
type Material = { key: string; reflected?: boolean; pixels?: number[] };
type WallPart = { art: Material | null; status: string; mask?: number[] };
const fingerprint = (pixels: Buffer) => createHash("sha256").update(pixels).digest("hex");
const blankMaterial: Material = { key: "native:empty", pixels: Array<number>(64).fill(0) };

// These arrivals load the destination map and wall bank before changing the script area.
// The key is the previous script area and the new map. The value is the destination's art area.
const arrivalTerrainAreas = new Map([
  ["2:18", 18],  // Textile House to Podol Plaza
  ["3:7", 7],    // Outer Valjevo stairs into the Pool rooms
  ["4:3", 3],    // Valjevo archive west exit into the outer halls
  ["4:5", 3],    // Valjevo archive south exit into the outer halls
  ["6:3", 3],    // Valjevo chapel north exit into the outer halls
  ["6:5", 3],    // Valjevo chapel east exit into the outer halls
  ["7:3", 5],    // Pool stairs back to the outer Valjevo halls
  ["14:31", 24], // Kovel Mansion to the Temple of Bane vestibule
  ["15:2", 2],   // Mendor's Library to the Textile House
  ["20:29", 29], // Slums to Kuto's Well
  ["21:0", 0],   // Sokal ferry return to the New Phlan harbor
  ["22:23", 23], // Yarash's Pyramid to the lower floor
  ["23:22", 22], // Yarash's Pyramid back to the upper floor
  ["25:1", 1],   // Western wilderness to Buccaneer Base
  ["25:28", 28], // Western wilderness to Zhentil Keep
  ["26:22", 22], // Wilderness rowboat to Yarash's Pyramid
  ["27:13", 13], // Eastern wilderness to the Kobold Caves
  ["27:16", 16], // Eastern marshes to the Lizardman Keep
  ["29:18", 18], // Kuto's Well to Podol Plaza
  ["29:20", 20], // Kuto's Well to the Slums
]);

export function explorationMaterialArea({ area, mapId }: Pick<NativeExploration, "mapId"> & { area: number }) {
  return arrivalTerrainAreas.get(`${area}:${mapId}`) ?? area;
}

/** Generate surfaces from the active native glyph bank, including alternate levels. */
export function buildExplorationMaterials(native: NativeExploration & { area: number }, artwork: Artwork,
  catalogueGlyphs?: ReadonlyMap<number, TileFingerprint>) {
  const { area, mapId } = native;
  // The Training Hall script uses the same physical map and wall bank as New Phlan.
  const areas = area === 11 && mapId === 0 ? [area, 0] : [explorationMaterialArea(native)];
  function replacement(hash: string, area: number): Material | undefined {
    const key = `tile:${area}:${hash}`;
    const art = artwork.get(key);
    if (art && !art.screenCellOnly) return { key, reflected: art.reflected };
  }

  const backgrounds = new Set([native.skyColor, native.groundColor, 0]);
  function backdropReplacement(hashOver: (colour: number) => string, area: number): Material | undefined {
    const matches = new Map<string, Material>();
    for (const colour of backgrounds) {
      const asset = replacement(hashOver(colour), area);
      if (!asset) continue;
      const source = artwork.get(asset.key)!;
      matches.set(JSON.stringify([source.file ?? asset.key, Boolean(source.reflected)]), asset);
    }
    // Backdrop matches may belong to different contextual redraws of the
    // same foreground. Only use a redraw when its identity is unambiguous.
    return matches.size === 1 ? matches.values().next().value : undefined;
  }

  function foreground(hash: string, hashOver?: (colour: number) => string) {
    for (const area of areas) {
      const exact = replacement(hash, area);
      if (exact) return { art: exact, status: "exact" };
      const composited = hashOver && backdropReplacement(hashOver, area);
      if (composited) return { art: composited, status: "composited" };
    }
  }

  function texture(pixels: Buffer, transparent = false): Material {
    const hash = fingerprint(pixels);
    return foreground(hash)?.art ?? {
      key: `native:${hash}:${Number(transparent)}`,
      pixels: [...pixels].map(color => transparent && color === 13 ? 16 : color),
    };
  }

  function cataloguePart(tile: TileFingerprint | undefined): WallPart {
    if (!tile) return { art: blankMaterial, status: "missing" };
    const { overColour } = tile;
    if (!overColour) return foreground(tile.hash) ?? { art: blankMaterial, status: "missing" };
    if (!tile.transparentMask) return { art: blankMaterial, status: "missing" };
    const bytes = Buffer.from(tile.transparentMask, "hex");
    if (bytes.length !== 8) return { art: blankMaterial, status: "missing" };
    const mask = Array.from({ length: 64 }, (_, index) => Number(!(bytes[index >> 3]! & (0x80 >> (index & 7)))));
    if (!mask.some(Boolean)) return { art: null, status: "transparent" };
    const material = foreground(tile.hash, colour => overColour[colour]!);
    return { ...(material ?? { art: blankMaterial, status: "missing" }), mask };
  }

  const slots = Buffer.from(native.frontSlots, "base64");
  const solid = new Map([...backgrounds].map(colour => {
    const pixels = Buffer.alloc(64, colour);
    return [colour, catalogueGlyphs ? fingerprint(pixels) : pixels.toString("hex")];
  }));
  const partsBySymbol = new Map<number, WallPart>();
  for (const symbol of new Set(slots)) {
    if (catalogueGlyphs && symbol) {
      partsBySymbol.set(symbol, cataloguePart(catalogueGlyphs.get(symbol)));
      continue;
    }
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
    // Older entries fingerprint the glyph over a backdrop. Use those
    // when there is no replacement fingerprinted from the glyph itself.
    const material = foreground(fingerprint(pixels), background =>
      fingerprint(Buffer.from([...pixels].map((color, i) => mask[i] ? color : background))));
    partsBySymbol.set(symbol, { ...(material ?? { art: texture(pixels, true), status: "native" }), mask });
  }
  const wallFaces = Array.from({ length: 15 }, (_, type) => {
    const symbols = [...slots.subarray(type * 56, type * 56 + 56)];
    // WALLDEF stores an eight-row screen composition. A complete strip
    // matching the backdrop belongs to the sky or ground, not the wall quad.
    function backdropRow(row: number, color: number) {
      const symbolsInRow = symbols.slice(row * 7, row * 7 + 7);
      return symbolsInRow.length === 7 &&
        symbolsInRow.every(symbol => {
          if (partsBySymbol.get(symbol)?.status === "transparent") return true;
          const identity = catalogueGlyphs ? catalogueGlyphs.get(symbol)?.hash : native.glyphs[symbol];
          return identity === solid.get(color) || identity === solid.get(0);
        });
    }
    let firstRow = 0;
    let endRow = 8;
    while (firstRow < endRow && backdropRow(firstRow, native.skyColor)) firstRow++;
    while (endRow > firstRow && backdropRow(endRow - 1, native.groundColor)) endRow--;
    return {
      type: type + 1,
      parts: symbols.slice(firstRow * 7, endRow * 7).map(symbol => partsBySymbol.get(symbol)!),
      rows: endRow - firstRow,
    };
  });
  const ground = texture(Buffer.alloc(64, native.groundColor));
  const sky = texture(Buffer.alloc(64, native.skyColor));
  return { wallFaces, ground, sky };
}
