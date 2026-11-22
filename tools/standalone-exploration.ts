import type { TileFingerprint } from "../src/runtime/game-data.js";
import { frontWallSymbols, symbolTile, type WorldData } from "./first-person-cells.js";
import type { NativeExploration } from "./native-exploration.js";

interface WallLayout {
  area: number;
  maps: Set<number>;
  glyphs: Map<number, TileFingerprint>;
}

/** Resolve materials from the active wall definition and the packaged tile identities. */
export function standaloneGlyphResolver(world: WorldData) {
  const catalogue = new Map(world.catalogue.tiles.map(tile => [tile.hash, tile]));
  const definitions = new Map<string, WallLayout[]>();
  for (const script of world.scripts) {
    for (const slots of script.wallSlots) {
      const context = { world, script, slots };
      const front = frontWallSymbols(context);
      const glyphs = new Map<number, TileFingerprint>();
      for (const symbol of new Set(front)) {
        const source = symbolTile(context, symbol);
        if (!source) continue;
        const separator = source.lastIndexOf(":");
        const hash = world.tileBlocks.get(source.slice(0, separator))?.[Number(source.slice(separator + 1))];
        const tile = hash && catalogue.get(hash);
        if (tile) glyphs.set(symbol, tile);
      }
      const key = front.toString("base64");
      const maps = new Set(script.maps.filter(map => map.wallLoads.includes(slots.operands.join())).map(map => map.block));
      const layout = { area: script.area, maps, glyphs };
      const candidates = definitions.get(key);
      if (candidates) candidates.push(layout);
      else definitions.set(key, [layout]);
    }
  }

  return (native: NativeExploration & { area: number }): ReadonlyMap<number, TileFingerprint> => {
    const layouts = definitions.get(native.frontSlots) ?? [];
    const scoped = layouts.filter(layout => layout.area === native.area &&
      (native.mapId === undefined || layout.maps.has(native.mapId)));
    const compatible = scoped.length ? scoped : layouts;
    const glyphs = new Map<number, TileFingerprint>();
    // The same wall definition may be loaded with different banks. Use a
    // glyph only when all remaining layouts agree on its identity.
    for (const [symbol, tile] of compatible[0]?.glyphs ?? []) {
      if (compatible.every(layout => layout.glyphs.get(symbol)?.hash === tile.hash)) glyphs.set(symbol, tile);
    }
    return glyphs;
  };
}
