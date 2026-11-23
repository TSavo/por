import type { TileFingerprint } from "../src/runtime/game-data.js";
import { allWallSymbols, areaViewCells, frontWallSymbols, symbolTile, unpackWallSides, viewCells,
  type ViewContext, type WorldData } from "./first-person-cells.js";
import { ExplorationCells } from "./exploration-cells.js";
import { valjevoGlyphSwaps } from "./gamedata.js";
import type { NativeExploration } from "./native-exploration.js";

interface WallLayout {
  context: Omit<ViewContext, "map">;
  maps: Set<number>;
  glyphs: Map<number, TileFingerprint>;
  allSymbols: string;
}

type ActiveScenery = NativeExploration & { area: number };

function mountedValjevoLayout(world: WorldData) {
  const sets = world.wallBlocks.get("5:24");
  const bank = "8X8D5.DAX:241";
  if (sets?.length !== 2 || world.wallBlocks.has("5:25") || world.tileBlocks.has("8X8D5.DAX:25") ||
      world.tileBlocks.get(bank)?.length !== 70 || world.tileBlocks.get("8X8D5.DAX:242")?.length !== 70) return;

  // The guest mounts a relocated copy of wall block 24 and swaps the same glyphs
  // in bank 241. Keep catalogue and composed-cell keys at their original indices.
  const wallBlocks = new Map(world.wallBlocks);
  wallBlocks.set("5:24", sets.map(set => set.map(symbol => valjevoGlyphSwaps.get(symbol) ?? symbol)));
  const tileOrigins = new Map<string, string>();
  for (const [a, b] of valjevoGlyphSwaps) {
    const left = `${bank}:${a - world.tables.bankBase[1]!}`;
    const right = `${bank}:${b - world.tables.bankBase[1]!}`;
    tileOrigins.set(left, right);
  }
  return { world: { ...world, wallBlocks }, tileOrigins };
}

/** Resolve the running game's wall art using only the packaged tile identities. */
export function standaloneExploration(world: WorldData, compositeHashes: Record<string, string>) {
  const catalogue = new Map(world.catalogue.tiles.map(tile => [tile.hash, tile]));
  const cells = new ExplorationCells(world, undefined, compositeHashes);
  const definitions = new Map<string, WallLayout[]>();
  const definitionsByMap = new Map<number, WallLayout[]>();
  const mountedValjevo = mountedValjevoLayout(world);
  for (const script of world.scripts) {
    for (const slots of script.wallSlots) {
      const original = { world, script, slots };
      register(original);
      if (script.archive === 5 && mountedValjevo && slots.slots.some(slot => slot?.wallBlock === 24)) {
        register({ ...original, ...mountedValjevo });
      }
    }
  }

  function register(context: WallLayout["context"]) {
    const { script, slots } = context;
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
    for (const map of maps) {
      const candidates = definitionsByMap.get(map);
      if (candidates) candidates.push(layout);
      else definitionsByMap.set(map, [layout]);
    }
  }

  function matchesActiveMap(layout: WallLayout, native: ActiveScenery) {
    return layout.context.script.area === native.area &&
      (native.mapId === undefined || layout.maps.has(native.mapId));
  }

  function compatibleLayouts(native: ActiveScenery, wholeDefinition: boolean): WallLayout[] {
    const layouts = definitions.get(native.frontSlots) ?? [];
    const exact = layouts.filter(layout => layout.allSymbols === native.cellGeometry?.wallSymbols);
    const candidates = wholeDefinition || exact.length ? exact : layouts;
    const scoped = candidates.filter(layout => matchesActiveMap(layout, native));
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

  function retainedSlotLayouts(native: ActiveScenery, wallSymbols: string, walls: Uint8Array): WallLayout[] {
    if (native.mapId === undefined) return [];
    const active = Buffer.from(wallSymbols, "base64");
    const symbolsPerSlot = 5 * 156;
    if (active.length !== 3 * symbolsPerSlot) return [];
    const candidates = (definitionsByMap.get(native.mapId) ?? []).filter(layout => {
      const { operands, slots } = layout.context.slots;
      const expected = Buffer.from(layout.allSymbols, "base64");
      const retained = [1, 2, 3].filter(slot => operands[slot - 1] === 0xff && !slots[slot]);
      if (!retained.length || retained.length === 3) return false;
      return [1, 2, 3].every(slot => {
        const start = (slot - 1) * symbolsPerSlot;
        const end = start + symbolsPerSlot;
        if (!retained.includes(slot)) return active.subarray(start, end).equals(expected.subarray(start, end));

        // LOAD PIECES 0xff leaves a wall slot and its bank in memory. Ignore that
        // state only if the map neither draws its wall types nor uses its glyphs.
        const firstType = (slot - 1) * 5 + 1;
        const firstSymbol = world.tables.bankBase[slot]!;
        return !walls.some(type => type >= firstType && type < firstType + 5) &&
          !expected.some(symbol => symbol >= firstSymbol && symbol < firstSymbol + 70);
      });
    });
    const scoped = candidates.filter(layout => layout.context.script.area === native.area);
    return scoped.length ? scoped : candidates;
  }

  function cellKeys(native: ActiveScenery): (string | undefined)[] {
    const geometry = native.cellGeometry;
    if (!geometry) return [];
    const exactLayouts = compatibleLayouts(native, true);
    const planes = Buffer.from(native.walls, "base64");
    if (planes.length !== 512) return [];
    const walls = unpackWallSides(planes.subarray(0, 256), planes.subarray(256));
    const { x, y, facing, groundColor, skyColor } = native;
    if (native.areaView) {
      // The overhead symbols come from the shared bank. The area's own script
      // supplies the boundary rules even when another bank is mounted.
      const script = world.scripts.find((script) => script.area === native.area);
      const slots = script?.wallSlots[0] ?? exactLayouts[0]?.context.slots;
      if (!script || !slots) return [];
      return areaViewCells({ world, script, map: { walls }, slots }, x, y, facing).map((stack) => {
        const { tiles } = cells.prune(stack);
        const hash = cells.cell("-", tiles).hash;
        return hash && `tile:${native.area}:${hash}`;
      });
    }
    // An identical wall definition in another archive can use different tile
    // banks. Prefer the active map's validated layout when it has a retained slot.
    const retained = exactLayouts.some(layout => matchesActiveMap(layout, native))
      ? [] : retainedSlotLayouts(native, geometry.wallSymbols, walls);
    const layouts = !exactLayouts.length || retained.some(layout => matchesActiveMap(layout, native))
      ? retained : exactLayouts;
    if (!layouts.length) return [];
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
