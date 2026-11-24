import { readFileSync } from "node:fs";
import { fromPortRoot } from "./port-root.js";
import { listGameFiles, readGameFile } from "./gamedata.js";
import { parseDax } from "../src/lib/dax.js";
import { parseGeo } from "../src/lib/world.js";
import { hasResources, readJsonNow, resources } from "../src/resources/provider.js";

/** The four wall types of one tile: north, east, south, west. */
export type AutomapWalls = [number, number, number, number];
export interface AutomapCell { x: number; y: number; walls: AutomapWalls; passage?: AutomapWalls; label?: string }
export interface AutomapEntrance {
  x: number;
  y: number;
  to: { area: number; mapId?: number; name?: string };
}
/** Places and events the party has already run into, stamped on the tile where they happened. */
export const automapMarkerKinds = [
  "temple", "shop", "tavern", "training", "place", "journal", "hazard", "theft",
] as const;
export type AutomapMarkerKind = typeof automapMarkerKinds[number];
export interface AutomapMarker { x: number; y: number; kind: AutomapMarkerKind }

export interface AutomapFloor {
  cells: Record<string, AutomapCell>;
  position?: { x: number; y: number; facing: number };
  entrances?: AutomapEntrance[];
  markers?: AutomapMarker[];
}
/** An area's own map, plus any other floors the party has walked there. */
export type AutomapArea = AutomapFloor & { floors?: Record<string, AutomapFloor> };
export type AutomapData = Record<string, AutomapArea>;

export interface ExploredPosition {
  area: number; x: number; y: number; facing: number;
  cameraX?: number; cameraY?: number;
  mapId?: number; walls?: AutomapWalls; passage?: AutomapWalls;
}
/** The map the guest's own scenery draw used, as captured from its memory. */
export interface DrawnMap { area: number; x: number; y: number; facing: number; mapId?: number; walls: string; extra?: string }

const labelLimit = 40;
const insideMap = (value: unknown): value is number => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 15;
const sameSides = (a?: AutomapWalls, b?: AutomapWalls) =>
  a === b || (!!a && !!b && a.every((value, side) => value === b[side]));

/**
 * ovl29 0x0350, as documented in tools/first-person-cells.ts reachable():
 * an open side (wall type 0) always passes; a wall passes when its two
 * passage bits, from the GEO extra plane, are not 0. Wall type alone is
 * not enough: every type 1–15 appears both blocked and passable in the maps.
 */
export function wallIsPassable(wallType: number, passage = 0): boolean {
  return wallType === 0 || passage !== 0;
}

function unpackPassage(byte: number): AutomapWalls {
  return [byte & 3, byte >> 2 & 3, byte >> 4 & 3, byte >> 6 & 3];
}

function cleanEntrance(input: unknown): AutomapEntrance | undefined {
  if (!input || typeof input !== "object") return;
  const { x, y, to } = input as { x?: unknown; y?: unknown; to?: { area?: unknown; mapId?: unknown; name?: unknown } };
  if (!insideMap(x) || !insideMap(y) || !to || typeof to !== "object") return;
  if (!Number.isInteger(to.area) || (to.area as number) < 0 || (to.area as number) > 999) return;
  const dest: AutomapEntrance["to"] = { area: to.area as number };
  if (Number.isInteger(to.mapId) && (to.mapId as number) >= 0 && (to.mapId as number) <= 999) dest.mapId = to.mapId as number;
  const name = typeof to.name === "string" ? cleanName(to.name) : "";
  if (name) dest.name = name;
  return { x, y, to: dest };
}

function entranceKey(entry: AutomapEntrance): string {
  return `${entry.x},${entry.y}->${entry.to.area}:${entry.to.mapId ?? ""}`;
}

function cleanEntrances(input: unknown): AutomapEntrance[] | undefined {
  if (!Array.isArray(input)) return;
  const seen = new Set<string>();
  const entrances: AutomapEntrance[] = [];
  for (const value of input) {
    const entry = cleanEntrance(value);
    if (!entry || seen.has(entranceKey(entry))) continue;
    seen.add(entranceKey(entry));
    entrances.push(entry);
  }
  return entrances.length ? entrances : undefined;
}

const markerKind = new Set<string>(automapMarkerKinds);

function markerKey(marker: AutomapMarker): string {
  return `${marker.x},${marker.y}:${marker.kind}`;
}

function cleanMarker(input: unknown): AutomapMarker | undefined {
  if (!input || typeof input !== "object") return;
  const { x, y, kind } = input as { x?: unknown; y?: unknown; kind?: unknown };
  if (!insideMap(x) || !insideMap(y) || typeof kind !== "string" || !markerKind.has(kind)) return;
  return { x, y, kind: kind as AutomapMarkerKind };
}

function cleanMarkers(input: unknown): AutomapMarker[] | undefined {
  if (!Array.isArray(input)) return;
  const seen = new Set<string>();
  const markers: AutomapMarker[] = [];
  for (const value of input) {
    const marker = cleanMarker(value);
    if (!marker || seen.has(markerKey(marker))) continue;
    seen.add(markerKey(marker));
    markers.push(marker);
  }
  return markers.length ? markers : undefined;
}

/**
 * Identify a named place from the text that told the party what it was.
 * Talk is only a signal when that is how the place is known; ordinary
 * conversation does not get a marker.
 */
export function locationKindFromText(text: string): AutomapMarkerKind | undefined {
  const u = text.replace(/\s+/g, " ").toUpperCase();
  if (
    /PRIESTS OF TYR WELCOME YOU TO THE TEMPLE/.test(u) ||
    /WELCOMED BY PRIESTESS JOY OF SUNE/.test(u) ||
    /PRIESTS OF TEMPUS BID YOU WELCOME/.test(u) ||
    /YOU NOW FACE AN ENTRANCE TO THE TEMPLE OF TYR/.test(u) ||
    /ADMITTED TO THE TEMPLE OF BANE/.test(u) ||
    /DO YOU SEEK HEALING\?/.test(u)
  ) return "temple";
  if (
    /SHOPKEEPER (GREETS YOU|OFFERS)/.test(u) ||
    /THE SHOP SPECIALIZES/.test(u) ||
    /OFFERS YOU ITEMS FOR SALE/.test(u) ||
    /CAN I SHOW YOU (SOMETHING|OUR WARES)/.test(u)
  ) return "shop";
  if (
    /YOU ARE IN A TAVERN/.test(u) ||
    /YOU HAVE ENTERED A CROWDED TAVERN/.test(u) ||
    /YOU OVERHEAR TAVERN TALE/.test(u)
  ) return "tavern";
  if (
    /SPECIAL TRAINING SCHOOLS/.test(u) ||
    /NOTICES FOR TEACHERS AND STUDENTS/.test(u) ||
    /DO YOU WANT TO TRAIN/.test(u) ||
    /WE TRAIN ONLY/.test(u) ||
    /DOOR MARKED FIGHTERS/.test(u) ||
    /FIGHTERS'? GUILD/.test(u)
  ) return "training";
  if (
    /YOU ENTER THE CITY HALL/.test(u) ||
    /YOU ARE OUTSIDE THE CITY HALL/.test(u) ||
    /JUST OUTSIDE THE CITY HALL/.test(u) ||
    /THE COUNCIL CLERK BEGINS LOOKING THROUGH A STACK OF PAPERS/.test(u) ||
    /THE ENTIRE CITY COUNCIL IS WAITING FOR YOU/.test(u) ||
    /ENTRY TO THE OLD ROPE GUILD/.test(u) ||
    /YOU (ENTER|HAVE ENTERED|ARE IN) .{0,40}GUILD/.test(u)
  ) return "place";
}

function cleanFloor(input: unknown): AutomapFloor | undefined {
  if (!input || typeof input !== "object") return;
  const { cells, position, entrances, markers } = input as {
    cells?: unknown; position?: { x?: unknown; y?: unknown; facing?: unknown }; entrances?: unknown; markers?: unknown;
  };
  if (!cells || typeof cells !== "object") return;
  const floor: AutomapFloor = { cells: {} };
  for (const cell of Object.values(cells as Record<string, unknown>)) {
    if (!cell || typeof cell !== "object") continue;
    const { x, y, walls, passage, label } = cell as {
      x?: unknown; y?: unknown; walls?: unknown; passage?: unknown; label?: unknown;
    };
    if (!insideMap(x) || !insideMap(y) || !Array.isArray(walls) || walls.length !== 4 || !walls.every(insideMap)) continue;
    const text = typeof label === "string" ? cleanLabel(label) : "";
    const sides = Array.isArray(passage) && passage.length === 4 && passage.every(insideMap)
      ? { passage: passage as AutomapWalls } : {};
    floor.cells[`${x},${y}`] = { x, y, walls: walls as AutomapWalls, ...sides, ...(text ? { label: text } : {}) };
  }
  if (position && insideMap(position.x) && insideMap(position.y) && Number.isInteger(position.facing)) {
    floor.position = { x: position.x, y: position.y, facing: (position.facing as number) & 7 };
  }
  const kept = cleanEntrances(entrances);
  if (kept) floor.entrances = kept;
  const marks = cleanMarkers(markers);
  if (marks) floor.markers = marks;
  return floor;
}

export function cleanLabel(label: string): string {
  return label.replace(/[^\x20-\x7e]/g, " ").replace(/\s+/g, " ").trim().slice(0, labelLimit);
}

function cleanName(label: string): string {
  return cleanLabel(label.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"'));
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
  type Sheet = { title?: string; areas: number[]; mapId?: number };
  const sheets = hasResources() ? readJsonNow<Sheet[]>(resources(), "map:atlas.json") ?? []
    : JSON.parse(readFileSync(fromPortRoot("src", "maps", "atlas.json"), "utf8")) as Sheet[];
  type AreaInfo = { id: number; label?: string };
  const geography = hasResources() ? readJsonNow<{ areas?: AreaInfo[] }>(resources(), "map:geography-model.json")
    : JSON.parse(readFileSync(fromPortRoot("src", "maps", "geography-model.json"), "utf8")) as { areas?: AreaInfo[] };
  const areaLabel = new Map((geography?.areas ?? []).map(area => [area.id, area.label] as const));
  let data: AutomapData = {};
  let revision = 0;
  let lastVisit: { area: number; mapId?: number; x: number; y: number } | undefined;

  function floorAt({ area, mapId }: { area: number; mapId?: number }, create: boolean): AutomapFloor | undefined {
    const base = data[area] ?? (create ? data[area] = { cells: {} } : undefined);
    if (!base || mapId === undefined) return base;
    return base.floors?.[mapId] ?? (create ? (base.floors ??= {})[mapId] = { cells: {} } : undefined);
  }

  function floorName(area: number, mapId?: number): string | undefined {
    const titled = sheets.filter(sheet => sheet.areas.includes(area) && sheet.mapId === mapId && sheet.title)
      .sort((a, b) => a.areas.length - b.areas.length)[0]?.title;
    if (mapId !== undefined) return titled;
    return areaLabel.get(area) ?? titled;
  }

  /** Passage bits for a tile, from its GEO extra plane when the walls match. */
  function passageFromGeo(id: number, x: number, y: number, walls?: AutomapWalls): AutomapWalls | undefined {
    const cell = geometry.get(id)?.cells[y * 16 + x];
    if (!cell || (walls && !cell.wall.every((type, side) => type === walls[side]))) return;
    return cell.extra as AutomapWalls;
  }

  function fillPassage(floor: AutomapFloor, geoId: number): void {
    for (const cell of Object.values(floor.cells)) {
      if (cell.passage) continue;
      const passage = passageFromGeo(geoId, cell.x, cell.y, cell.walls);
      if (passage) cell.passage = [...passage];
    }
  }

  function enrich(maps: AutomapData): AutomapData {
    for (const [area, entry] of Object.entries(maps)) {
      fillPassage(entry, Number(area));
      for (const [mapId, floor] of Object.entries(entry.floors ?? {})) fillPassage(floor, Number(mapId));
    }
    return maps;
  }

  function rememberEntrance(from: NonNullable<typeof lastVisit>, to: ExploredPosition): void {
    if (from.area === to.area && from.mapId === to.mapId) return;
    const origin = floorAt(from, true);
    const dest = floorAt(to, true);
    if (!origin || !dest) return;
    const add = (floor: AutomapFloor, x: number, y: number, area: number, mapId: number | undefined) => {
      const raw = floorName(area, mapId);
      const name = raw ? cleanName(raw) : "";
      const entry: AutomapEntrance = { x, y, to: { area, ...(mapId !== undefined ? { mapId } : {}), ...(name ? { name } : {}) } };
      const list = floor.entrances ??= [];
      if (list.some(existing => entranceKey(existing) === entranceKey(entry))) return;
      list.push(entry);
    };
    add(origin, from.x, from.y, to.area, to.mapId);
    add(dest, to.x, to.y, from.area, from.mapId);
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
        const walls: AutomapWalls = [northEast >> 4, northEast & 15, southWest >> 4, southWest & 15];
        const extra = drawn.extra ? Buffer.from(drawn.extra, "base64")[cell] : undefined;
        const passage = extra !== undefined ? unpackPassage(extra)
          : passageFromGeo(mapId, x, y, walls);
        return { ...position, mapId, x, y, facing, walls, ...(passage ? { passage } : {}) };
      }
      if (!insideMap(position.x) || !insideMap(position.y)) return position;
      const cell = geometry.get(position.area)?.cells[position.y * 16 + position.x];
      const walls = cell?.wall as AutomapWalls | undefined;
      const passage = cell?.extra as AutomapWalls | undefined;
      return walls ? { ...position, walls, ...(passage ? { passage } : {}) } : position;
    },
    /** Remember the tile the party is standing on. */
    record(position: ExploredPosition): void {
      const { x, y, facing, walls, passage } = position;
      if (!walls || !insideMap(x) || !insideMap(y)) return;
      const floor = floorAt(position, true)!;
      const key = `${x},${y}`;
      const known = floor.cells[key];
      const here = floor.position;
      const crossed = lastVisit && (lastVisit.area !== position.area || lastVisit.mapId !== position.mapId);
      if (crossed) rememberEntrance(lastVisit!, position);
      lastVisit = { area: position.area, mapId: position.mapId, x, y };
      const nextPassage = passage ?? known?.passage;
      if (!crossed && known && known.walls.every((wall, side) => wall === walls[side]) &&
          sameSides(known.passage, nextPassage) &&
          here?.x === x && here.y === y && here.facing === facing) return;
      floor.cells[key] = { ...known, x, y, walls: [...walls], ...(nextPassage ? { passage: [...nextPassage] } : {}) };
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
    /** Stamp a discovered event on the party's tile. A kind is stored once per tile. */
    mark(kind: AutomapMarkerKind, position?: ExploredPosition): boolean {
      if (!markerKind.has(kind)) return false;
      const place = (area: number, mapId: number | undefined, x: number, y: number): boolean => {
        if (!insideMap(x) || !insideMap(y)) return false;
        const floor = floorAt({ area, mapId }, false);
        if (!floor?.cells[`${x},${y}`]) return false;
        const list = floor.markers ??= [];
        if (list.some(existing => existing.x === x && existing.y === y && existing.kind === kind)) return false;
        list.push({ x, y, kind });
        revision++;
        return true;
      };
      const located = position ? this.locate(position) : undefined;
      if (located) {
        if (located.walls && insideMap(located.x) && insideMap(located.y)) this.record(located);
        if (place(located.area, located.mapId, located.x, located.y)) return true;
      }
      if (lastVisit) return place(lastVisit.area, lastVisit.mapId, lastVisit.x, lastVisit.y);
      return false;
    },
    snapshot(): AutomapData { return enrich(cleanAutomap(data)); },
    restore(saved: unknown): void {
      data = enrich(cleanAutomap(saved));
      lastVisit = undefined;
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
        if (from.entrances) {
          const list = into.entrances ??= [];
          for (const entry of from.entrances) {
            if (list.some(existing => entranceKey(existing) === entranceKey(entry))) continue;
            list.push(entry);
            added = true;
          }
          if (!list.length) delete into.entrances;
        }
        if (from.markers) {
          const list = into.markers ??= [];
          for (const marker of from.markers) {
            if (list.some(existing => markerKey(existing) === markerKey(marker))) continue;
            list.push(marker);
            added = true;
          }
          if (!list.length) delete into.markers;
        }
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
