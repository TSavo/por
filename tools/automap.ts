import { readFileSync } from "node:fs";
import { fromPortRoot } from "./port-root.js";
import { listGameFiles, readGameFile } from "./gamedata.js";
import { parseDax } from "../src/lib/dax.js";
import { parseGeo } from "../src/lib/world.js";

/** The four wall types of one tile: north, east, south, west. */
export type AutomapWalls = [number, number, number, number];
export interface AutomapCell { x: number; y: number; walls: AutomapWalls; label?: string }
export interface AutomapFloor {
  cells: Record<string, AutomapCell>;
  position?: { x: number; y: number; facing: number };
}
/** An area's own map, plus any other floors the party has walked there. */
export type AutomapArea = AutomapFloor & { floors?: Record<string, AutomapFloor> };
export type AutomapData = Record<string, AutomapArea>;

export interface ExploredPosition {
  area: number; x: number; y: number; facing: number;
  cameraX?: number; cameraY?: number;
  mapId?: number; walls?: AutomapWalls;
}
/** The map the guest's own scenery draw used, as captured from its memory. */
export interface DrawnMap { area: number; x: number; y: number; facing: number; mapId?: number; walls: string }

const labelLimit = 40;
const insideMap = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 15;

function cleanFloor(input: unknown): AutomapFloor | undefined {
  if (!input || typeof input !== "object") return;
  const { cells, position } = input as { cells?: unknown; position?: { x?: unknown; y?: unknown; facing?: unknown } };
  if (!cells || typeof cells !== "object") return;
  const floor: AutomapFloor = { cells: {} };
  for (const cell of Object.values(cells as Record<string, unknown>)) {
    if (!cell || typeof cell !== "object") continue;
    const { x, y, walls, label } = cell as { x?: unknown; y?: unknown; walls?: unknown; label?: unknown };
    if (!insideMap(x) || !insideMap(y) || !Array.isArray(walls) || walls.length !== 4 || !walls.every(insideMap)) continue;
    const text = typeof label === "string" ? cleanLabel(label) : "";
    floor.cells[`${x},${y}`] = { x, y, walls: walls as AutomapWalls, ...(text ? { label: text } : {}) };
  }
  if (position && insideMap(position.x) && insideMap(position.y) && Number.isInteger(position.facing)) {
    floor.position = { x: position.x, y: position.y, facing: (position.facing as number) & 7 };
  }
  return floor;
}

export function cleanLabel(label: string): string {
  return label.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim().slice(0, labelLimit);
}

/** Keep only well-formed map records from a save slot or an older browser copy. */
export function cleanAutomap(input: unknown): AutomapData {
  const data: AutomapData = {};
  if (!input || typeof input !== "object") return data;
  for (const [area, value] of Object.entries(input as Record<string, unknown>)) {
    if (!/^\d{1,3}$/.test(area)) continue;
    const base = cleanFloor(value);
    if (!base) continue;
    const entry: AutomapArea = base;
    const floors = (value as { floors?: unknown }).floors;
    if (floors && typeof floors === "object") {
      for (const [mapId, floor] of Object.entries(floors as Record<string, unknown>)) {
        const clean = /^\d{1,3}$/.test(mapId) ? cleanFloor(floor) : undefined;
        if (clean) (entry.floors ??= {})[mapId] = clean;
      }
    }
    data[area] = entry;
  }
  return data;
}

/**
 * The party's discovered map. It records each tile the party stands on, with
 * the walls the original game drew there. It belongs to the running game and
 * is stored in the save slot beside the journal.
 */
export function openAutomap(root: string) {
  const geometry = new Map<number, ReturnType<typeof parseGeo>>();
  for (const name of listGameFiles(root).filter(name => /^GEO\d+\.DAX$/i.test(name))) {
    for (const entry of parseDax(name, readGameFile(root, name)).entries) {
      if (entry.rawSize === 0x402) geometry.set(entry.id, parseGeo(entry.data, entry.id));
    }
  }
  // An illustrated plate that names a map id marks a floor kept apart from its area's own map.
  const sheets = JSON.parse(readFileSync(fromPortRoot("src", "maps", "atlas.json"), "utf8")) as
    { areas: number[]; mapId?: number }[];
  let data: AutomapData = {};
  let revision = 0;

  function floorAt({ area, mapId }: ExploredPosition, create: boolean): AutomapFloor | undefined {
    const base = data[area] ?? (create ? data[area] = { cells: {} } : undefined);
    if (!base || mapId === undefined) return base;
    return base.floors?.[mapId] ?? (create ? (base.floors ??= {})[mapId] = { cells: {} } : undefined);
  }

  return {
    get revision() { return revision; },
    /** Add the map id and the tile's walls to a position reported by the guest. */
    locate(position: ExploredPosition, drawn?: DrawnMap): ExploredPosition {
      if (drawn?.area === position.area && drawn.mapId !== undefined &&
          sheets.some(sheet => sheet.mapId === drawn.mapId && sheet.areas.includes(position.area))) {
        const { mapId, x, y, facing } = drawn;
        const bytes = Buffer.from(drawn.walls, "base64");
        const cell = y * 16 + x;
        const northEast = bytes[cell]!, southWest = bytes[cell + 256]!;
        return { ...position, mapId, x, y, facing,
          walls: [northEast >> 4, northEast & 15, southWest >> 4, southWest & 15] };
      }
      if (!insideMap(position.x) || !insideMap(position.y)) return position;
      const walls = geometry.get(position.area)?.cells[position.y * 16 + position.x]?.wall as AutomapWalls | undefined;
      return walls ? { ...position, walls } : position;
    },
    /** Remember the tile the party is standing on. */
    record(position: ExploredPosition): void {
      const { x, y, facing, walls } = position;
      if (!walls || !insideMap(x) || !insideMap(y)) return;
      const floor = floorAt(position, true)!;
      const key = `${x},${y}`;
      const known = floor.cells[key];
      const here = floor.position;
      if (known && known.walls.every((wall, side) => wall === walls[side]) &&
          here?.x === x && here.y === y && here.facing === facing) return;
      floor.cells[key] = { ...known, x, y, walls: [...walls] };
      floor.position = { x, y, facing };
      revision++;
    },
    /** Label the tile the party is standing on. An empty label removes it. */
    label(position: ExploredPosition, label: string): boolean {
      const cell = floorAt(position, false)?.cells[`${position.x},${position.y}`];
      if (!cell) return false;
      const text = cleanLabel(label);
      if (text) cell.label = text; else delete cell.label;
      revision++;
      return true;
    },
    snapshot(): AutomapData { return cleanAutomap(data); },
    restore(saved: unknown): void {
      data = cleanAutomap(saved);
      revision++;
    },
    /** Add tiles from a map kept by an older browser. Tiles already recorded stay as they are. */
    adopt(saved: unknown): boolean {
      let added = false;
      const merge = (into: AutomapFloor, from: AutomapFloor) => {
        for (const [key, cell] of Object.entries(from.cells)) {
          if (into.cells[key]) continue;
          into.cells[key] = cell;
          added = true;
        }
        into.position ??= from.position;
      };
      for (const [area, legacy] of Object.entries(cleanAutomap(saved))) {
        const base = data[area] ??= { cells: {} };
        merge(base, legacy);
        for (const [mapId, floor] of Object.entries(legacy.floors ?? {})) {
          merge((base.floors ??= {})[mapId] ??= { cells: {} }, floor);
        }
      }
      if (added) revision++;
      return added;
    },
  };
}

export type Automap = ReturnType<typeof openAutomap>;
