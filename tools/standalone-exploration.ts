import type { TileFingerprint } from "../src/runtime/game-data.js";
import { allWallSymbols, frontWallSymbols, symbolTile, unpackWallSides, viewCells,
  type ViewContext, type WorldData } from "./first-person-cells.js";
import { ExplorationCells } from "./exploration-cells.js";
import type { NativeExploration } from "./native-exploration.js";

interface WallLayout {
  context: Omit<ViewContext, "map">;
  maps: Set<number>;
  glyphs: Map<number, TileFingerprint>;
  allSymbols: string;
}

type ActiveScenery = NativeExploration & { area: number };

/** Resolve the running game's wall art using only the packaged tile identities. */
export function standaloneExploration(world: WorldData, compositeHashes: Record<string, string>) {
  const catalogue = new Map(world.catalogue.tiles.map(tile => [tile.hash, tile]));
  const cells = new ExplorationCells(world, undefined, compositeHashes);
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
      const layout = { context, maps, glyphs, allSymbols: allWallSymbols(context).toString("base64") };
      const candidates = definitions.get(key);
      if (candidates) candidates.push(layout);
      else definitions.set(key, [layout]);
    }
  }

  function compatibleLayouts(native: ActiveScenery, wholeDefinition: boolean): WallLayout[] {
    const layouts = definitions.get(native.frontSlots) ?? [];
    const exact = layouts.filter(layout => layout.allSymbols === native.cellGeometry?.wallSymbols);
    const candidates = wholeDefinition || exact.length ? exact : layouts;
    const scoped = candidates.filter(layout => layout.context.script.area === native.area &&
      (native.mapId === undefined || layout.maps.has(native.mapId)));
    return scoped.length ? scoped : candidates;
  }

  function glyphs(native: ActiveScenery): ReadonlyMap<number, TileFingerprint> {
    const compatible = compatibleLayouts(native, false);
    const glyphs = new Map<number, TileFingerprint>();
    // The same wall definition may be loaded with different banks. Use a
    // glyph only when all remaining layouts agree on its identity.
    for (const [symbol, tile] of compatible[0]?.glyphs ?? []) {
      if (compatible.every(layout => layout.glyphs.get(symbol)?.hash === tile.hash)) glyphs.set(symbol, tile);
    }
    return glyphs;
  }

  function cellKeys(native: ActiveScenery): (string | undefined)[] {
    const geometry = native.cellGeometry;
    if (!geometry) return [];
    const layouts = compatibleLayouts(native, true);
    if (!layouts.length) return [];
    const planes = Buffer.from(native.walls, "base64");
    if (planes.length !== 512) return [];
    const walls = unpackWallSides(planes.subarray(0, 256), planes.subarray(256));
    const { x, y, facing, groundColor, skyColor } = native;
    const horizon = `h${skyColor}.${geometry.lineColor}.${geometry.bandColor}.${groundColor}`;
    const views = layouts.map(({ context }) =>
      viewCells({ ...context, map: { walls } }, x, y, facing).map((stack, index) => {
        const row = Math.floor(index / 11);
        const { tiles, open } = cells.prune(stack);
        const backdrop = row < 5 ? `s${skyColor}` : row === 5 ? horizon : `g${groundColor}`;
        return cells.cell(open ? backdrop : "-", tiles).hash;
      }));
    return views[0]!.map((hash, index) =>
      hash && views.every(view => view[index] === hash) ? `tile:${native.area}:${hash}` : undefined);
  }

  return { glyphs, cellKeys };
}
