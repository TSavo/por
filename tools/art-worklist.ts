/**
 * The artwork worklist: what Enhanced art is still to be drawn, and where it stands.
 *
 *   npm run art:worklist                      regenerate qa/art-worklist.json and docs/ART-WORKLIST.md
 *   npm run art:worklist -- --check           fail if the committed files are stale
 *   npm run art:worklist -- --sheets [dir]    also write reference sheets of the originals (default out/art-worklist/)
 *   npm run verify:art-worklist               check every item against the manifests and PNGs; print what remains
 *   npm run art:worklist -- --held            write the held ("Not established") first-person cells, with the backdrop,
 *                                             square and facing of each, to out/art-worklist-held.json (not committed)
 *
 * qa/art-worklist-observed.json records, per area, backdrops (sky, horizon, ground) seen in play, which count
 * exactly as backdrops existing artwork confirms, and backdrops the script shows cannot occur, whose cells are
 * dropped for good.
 *
 * It reads `game/` (no original file) and the two artwork manifests, fresh on every run. The
 * first-person view is worked out by tools/first-person-cells.ts. A screen cell whose pixels are
 * several tiles over each other can only be hashed from the pixels, and game/ holds no cell hashes
 * for SQRPACI and BACPAC, so those hashes are kept in qa/art-worklist-cells.json: with the
 * player's own 1.3 files (POR_GAMEDATA) the tool recomputes and rewrites that file; without them
 * it uses it as committed. The sheets always need the 1.3 files.
 *
 * An item is listed to do only when the tool is sure it can appear. Everything else is counted
 * under "not established" with the reason, and is neither listed nor dropped.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, isPicture, pictureMembers } from "../src/lib/picture.js";
import { contentBytes, readGameData, type PictureRecord, type PortGameData } from "../src/runtime/game-data.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import {
  areaViewCells, covered, frontWallSymbols, HORIZON, namedTiles, reachable, readWorld, sha256, symbolTile, viewCells,
  type AreaScript, type Lower, type TileName, type ViewContext, type WallSlots, type WorldData,
} from "./first-person-cells.js";
import { encodePng, pngDimensions } from "./png.js";
import { ExplorationCells as Cells, type Backdrop, type Cell, type CellKind } from "./exploration-cells.js";
import { explorationMaterialArea } from "./exploration-materials.js";
import { blankApproachSprites } from "./encounter-art.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts: string[]) => join(repository, ...parts);
const MANIFESTS = ["upgrades/manifest.json", "upgrades/slums/manifest.json"] as const;
const WORKLIST = "qa/art-worklist.json", DOCUMENT = "docs/ART-WORKLIST.md", CELLS = "qa/art-worklist-cells.json", NOTES = "qa/art-worklist-notes.md";
/** Backdrops seen in play, or shown from the script not to occur, per area: see the file's own "about". */
const OBSERVED = "qa/art-worklist-observed.json";
interface ObservedArea {
  /** Backdrops the running game drew in this area. `s<sky>` also stands for the horizon row under that sky. */
  shown?: { backdrop: Backdrop; how: string }[];
  /** Backdrops the script shows cannot occur in this area, with the reason. `s<sky>` also covers the horizon row under that sky. */
  notShown?: { backdrop: Backdrop; reason: string }[];
  /** Exact tile IDs captured from the native overhead Area command. */
  overheadCells?: { keys: string[]; how: string };
}
function readObserved(): Record<string, ObservedArea> {
  return existsSync(at(OBSERVED)) ? (JSON.parse(readFileSync(at(OBSERVED), "utf8")) as { areas: Record<string, ObservedArea> }).areas : {};
}
/** A held cell, for --held: what play would have to show for it to become work. */
interface Held { area: number; areaName: string; key: string; reason: string; backdrop: Backdrop; composition: string; map: number; x: number; y: number; facing: string; column: number; row: number; views: number }
const BLANK = sha256(new Uint8Array(64));

const names: Record<number, string> = {
  0: "New Phlan", 1: "Buccaneer Base", 2: "Cadorna Textile House", 3: "Valjevo Castle", 4: "Valjevo Castle", 5: "Valjevo Castle",
  6: "Valjevo Castle", 7: "Valjevo Castle, the Pool", 8: "Phlan City Hall", 9: "Stojanow Gate", 10: "Valhingen Graveyard",
  11: "The Training Hall", 13: "The Kobold Caves", 14: "Kovel Mansion", 15: "Mendor's Library", 16: "The Lizardman Keep",
  17: "The Nomad Camp", 18: "Podol Plaza", 19: "Cave of Diogenes", 20: "The Slums", 21: "Sokal Keep", 22: "Yarash's Pyramid",
  23: "Yarash's Pyramid, lower", 24: "Temple of Bane", 25: "Wilderness, west", 26: "Wilderness, middle", 27: "Wilderness, east",
  28: "Zhentil Keep Outpost", 29: "Kuto's Well", 31: "Temple of Bane, interior",
};

// ---------------------------------------------------------------------------------------------
// The manifests, read fresh.

interface Art {
  file: string;
  manifest: string;
  size?: { width: number; height: number } | null;
  screenCellOnly: boolean;
}
function readArt(): Map<string, Art> {
  const art = new Map<string, Art>();
  // The Slums pack is read first and the main manifest takes precedence, as tools/upgrade-art.ts loads them.
  for (const manifest of [MANIFESTS[1], MANIFESTS[0]]) {
    const { assets, screenCellsOnly } = JSON.parse(readFileSync(at(manifest), "utf8")) as {
      assets: Record<string, string>;
      screenCellsOnly?: string[];
    };
    const screenCells = new Set(screenCellsOnly);
    for (const [key, file] of Object.entries(assets)) art.set(key, { file, manifest, screenCellOnly: screenCells.has(key) });
  }
  return art;
}
/** Why a key is not done, or undefined when its art is in a manifest, on disk and the required size. */
function missing(art: Map<string, Art>, key: string, width: number, height: number): string | undefined {
  const entry = art.get(key);
  if (!entry) return "no key in a manifest";
  if (entry.size === undefined) {
    try { entry.size = pngDimensions(readFileSync(at(dirname(entry.manifest), entry.file))) ?? null; } catch { entry.size = null; }
  }
  if (!entry.size) return `${entry.file} is missing or not a readable PNG`;
  if (entry.size.width !== width || entry.size.height !== height) return `${entry.file} is ${entry.size.width}x${entry.size.height}, not ${width}x${height}`;
}

// ---------------------------------------------------------------------------------------------
// Original pixels, when the player's 1.3 files are at hand.

interface Originals {
  tiles: Map<TileName, Uint8Array>;
  /** `SQRPACI.DAX:1:0:5` to the pixels of that frame, with its width and height. */
  frames: Map<string, { width: number; height: number; pixels: Uint8Array }>;
}
function originals(directory: string | undefined): Originals | undefined {
  if (!directory || !existsSync(directory)) return;
  const tiles = new Map<TileName, Uint8Array>(), frames: Originals["frames"] = new Map();
  for (const file of readdirSync(directory)) {
    const name = file.toUpperCase();
    if (!/^(8X8D\d|BACPAC|DUNGCOM|FINAL\d|HEAD\d|ICON|PIC\d|SPRIT\d|SQRPACI|WILDCOM)\.DAX$/.test(name)) continue;
    for (const { id, data } of parseDax(file, new Uint8Array(readFileSync(join(directory, file)))).entries) {
      const members = isPicture(data) ? [{ data }] : pictureMembers(data);
      for (const [member, { data: bytes }] of members.entries()) {
        if (!isPicture(bytes)) continue;
        const picture = decodePicture(bytes);
        for (let index = 0; index < picture.itemCount; index++) {
          if (/^8X8D/.test(name)) { if (picture.width === 8 && picture.height === 8) tiles.set(`${name}:${id}:${index}`, frameSlice(picture, index)); }
          else frames.set(`${name}:${id}:${member}:${index}`, { width: picture.width, height: picture.height, pixels: frameSlice(picture, index) });
        }
      }
    }
  }
  return tiles.size ? { tiles, frames } : undefined;
}
function cellsOf(frame: { width: number; height: number; pixels: Uint8Array }): Uint8Array[] {
  const cells: Uint8Array[] = [];
  for (let y = 0; y + 8 <= frame.height; y += 8) {
    for (let x = 0; x + 8 <= frame.width; x += 8) {
      const cell = new Uint8Array(64);
      for (let row = 0; row < 8; row++) cell.set(frame.pixels.subarray((y + row) * frame.width + x, (y + row) * frame.width + x + 8), row * 8);
      cells.push(cell);
    }
  }
  return cells;
}

// ---------------------------------------------------------------------------------------------
// Screen cells of the first-person view.

const shortTile = (tile: TileName) => tile.replace(".DAX", "").replace(/:(\d+):(\d+)$/, " block $1 tile $2");
function describeSignature(signature: string): string {
  const [backdrop, list] = signature.split("|") as [Backdrop, string];
  const tiles = (list ? list.split(",") : []).map(shortTile);
  let behind = "";
  if (backdrop[0] === "g") behind = `the ground colour ${backdrop.slice(1)}`;
  else if (backdrop[0] === "s") behind = `sky colour ${backdrop.slice(1)}`;
  else if (backdrop[0] === "h") {
    const [sky, line, band, ground] = backdrop.slice(1).split(".");
    behind = `the horizon row (three rows of sky ${sky}, one of ${line}, two of ${band}, two of ground ${ground})`;
  }
  if (!tiles.length) return behind;
  return [...tiles.reverse(), ...(behind ? [behind] : [])].join(" over ");
}

// ---------------------------------------------------------------------------------------------
// The worklist.

interface Item {
  kind: "first-person cell" | "battlefield cell";
  /** The key to add to upgrades/manifest.json. */
  key: string;
  width: 32;
  height: 32;
  /** For a first-person cell, the area of the key. A battlefield key has no area. */
  area?: number;
  areaName?: string;
  group: string;
  what: CellKind | "one cell of a battlefield picture";
  /** How to make the original: the backdrop and stored tiles bottom first, or the frame and cell. */
  composition: string;
  description: string;
  /** One place to see it. */
  seenAt?: { map: number; x: number; y: number; facing: string; column: number; row: number };
  views?: number;
  /** Areas where the same pixels already have artwork, with one PNG that draws them. */
  drawnIn: number[];
  sameAs?: string;
  /** The stored tiles of the cell without the sky or ground behind them: cells with one shape differ only in that. */
  shape?: string;
  /** A key of this area that already has artwork for the same shape over another sky or ground. */
  sameShapeAs?: string;
  why: string;
}

interface Context {
  label: number;
  script: AreaScript;
  map: number;
  slots: WallSlots;
  wallArchive?: number;
  arrivalFrom?: number;
  camera?: readonly [x: number, y: number, facing?: number];
}
interface AreaReport {
  area: number;
  name: string;
  established: boolean;
  why: string;
  maps: number[];
  wallSets: string[];
  existingKeys: number;
  existingKeysAccountedFor: number;
  existingKeysOnlyAsArrivalViews: number;
  existingKeysOnlyAsWallMaterials?: number;
  existingKeysOnlyInUnreachableViews?: number;
  unaccountedKeys: string[];
  cellsTheViewsCanShow: number;
  cellsWithArt: number;
  toDo: number;
  notEstablished: Record<string, number>;
  /** Cells left out for good because qa/art-worklist-observed.json records, from the script, that their sky or ground does not occur here. */
  struckOff?: Record<string, number>;
}

const FACING: Record<number, string> = { 0: "north", 2: "east", 4: "south", 6: "west" };
const wallArchiveOf = (context: Context) => context.wallArchive ?? context.script.archive;
const scriptForWalls = (context: Context) => context.wallArchive === undefined ? context.script : { ...context.script, archive: context.wallArchive };
const slotText = (context: Context) => `WALLDEF${wallArchiveOf(context)} ${context.slots.slots.slice(1).map((slot) => slot ? `block ${slot.wallBlock}${slot.set ? ` set ${slot.set + 1}` : ""} (tiles 8X8D${wallArchiveOf(context)} block ${slot.tileBlock})` : "nothing").join(", ")}`;

interface Agg { rc: 0 | 1 | 2; roofed: boolean; shaft: boolean; tiles: TileName[]; open: boolean; views: number; squares: Set<number>; first: Item["seenAt"] }
interface Entry { cell: Cell; context: Context; views: number; squares: Set<number>; first: Item["seenAt"]; areaView: boolean }

function firstPerson(world: WorldData, art: Map<string, Art>, cells: Cells) {
  const observed = readObserved();
  const held: Held[] = [];
  const existing = new Map<number, Set<string>>();
  const drawnIn = new Map<string, number[]>(), sameAs = new Map<string, string>();
  const tilesBySource = new Map(world.catalogue.tiles.flatMap(tile => tile.sources.map(source => [source, tile] as const)));
  const storedTileHashes = new Set(world.catalogue.tiles.map((tile) => tile.hash));
  for (const [key, { file }] of art) {
    const tile = /^tile:(\d{1,3}):([a-f0-9]{64})$/.exec(key);
    if (!tile) continue;
    const area = Number(tile[1]), hash = tile[2]!;
    existing.set(area, (existing.get(area) ?? new Set<string>()).add(hash));
    drawnIn.set(hash, [...(drawnIn.get(hash) ?? []), area].sort((a, b) => a - b));
    if (!sameAs.has(hash)) sameAs.set(hash, file);
  }

  // A context is one script with one of its maps and the wall sets it loads beside that map. Its keys
  // carry the script's area number. A map whose block number is no script's own takes that number
  // instead when artwork already exists under it: that is how the Temple of Bane's interior is area 31.
  const scriptAreas = new Set(world.scripts.map((script) => script.area));
  const own: Context[] = [];
  for (const script of world.scripts) {
    for (const map of script.maps) {
      for (const operands of map.wallLoads) {
        const slots = script.wallSlots.find((known) => known.operands.join() === operands);
        if (!slots) continue;
        const label = !scriptAreas.has(map.block) && existing.has(map.block) ? map.block : script.area;
        // The Pool script retains scope 7 for one map 3 draw at its west-facing stair exit.
        const camera = script.area === 7 && map.block === 3 ? [13, 15, 6] as const : undefined;
        own.push({ label, script, map: map.block, slots, camera });
      }
    }
  }
  // Valjevo can keep the Slums wall bank mounted across an archive change.
  // The native map number still refers to GEO5, while its walls use WALLDEF2.
  const slumsWalls = world.scripts.filter((script) => script.archive === 2)
    .flatMap((script) => script.wallSlots).find((slots) => slots.operands.join() === "2,4,1");
  if (slumsWalls) {
    const borrowedMaps = [[3, [3, 4]], [5, [3, 4, 5, 6, 7]], [7, [7, 3]]] as const;
    for (const [area, maps] of borrowedMaps) {
      const script = world.scripts.find((candidate) => candidate.area === area && candidate.archive === 5);
      if (!script) continue;
      for (const map of maps) {
        const camera = area === 7 && map === 3 ? [13, 15, 6] as const
          : area === 5 && map === 7 ? [5, 7] as const : undefined;
        if (world.maps.has(`5:${map}`)) own.push({ label: area, script, map, slots: slumsWalls, wallArchive: 2, camera });
      }
    }
  }
  // Both mounted banks are visible under scope 5 on the Pool stair landing.
  const stairTraveler = world.scripts.find((script) => script.area === 5 && script.archive === 5);
  const valjevoWalls = stairTraveler?.wallSlots.find((slots) => slots.operands.join() === "24,25,1");
  if (stairTraveler && valjevoWalls && world.maps.has("5:7")) {
    own.push({ label: 5, script: stairTraveler, map: 7, slots: valjevoWalls, camera: [5, 7] });
  }
  // NEW ECL keeps the old area number until the new script's first turn (ovl03 0x0bd1 and 0x3387), so
  // the first view of the area it starts is drawn, and keyed, under the number of the area left.
  const arrivals: Context[] = [];
  for (const script of world.scripts) {
    for (const context of own) {
      if (context.label === script.area) continue;
      const observed = explorationMaterialArea({ area: script.area, mapId: context.map }) === context.label;
      if (script.leadsTo.includes(context.script.area) || observed) arrivals.push({ ...context, label: script.area, arrivalFrom: script.area });
    }
  }

  const skyBack = (sky: number) => `s${sky}`;
  const lowers: Lower[] = world.bands.flatMap((band) => world.grounds.map(({ ground }) => ({ line: band.line, band: band.band, ground })));
  const usual = (lower: Lower) => lower.line === HORIZON.line && lower.band === HORIZON.band && lower.ground === HORIZON.ground;

  /** Every cell a context can show, with where. */
  const enumerate = (context: Context, have: Set<string>, auditReachability = true) => {
    const map = world.maps.get(`${context.script.archive}:${context.map}`)!;
    const view: ViewContext = { world, script: scriptForWalls(context), map, slots: context.slots };
    const aggs = new Map<string, Agg>();
    const views: { square: number; roofed: boolean; shaft: boolean; aggs: Agg[]; walls: boolean }[] = [];
    const overhead = new Map<string, Entry>();
    // ECL29 sets water under the ladder at (7,7) and restores dry ground before
    // drawing the surface. The two maps use different horizon bands.
    const kuto = context.script.area === 29 && (context.map === 29 || context.map === 32);
    const lowerWell = kuto && context.map === 32;
    const lizardKeep = auditReachability && !context.arrivalFrom && context.script.area === 16 && (context.map === 16 || context.map === 30);
    const lizardCellar = lizardKeep && context.map === 30;
    const mendorLibrary = auditReachability && !context.arrivalFrom && context.script.area === 15 && context.map === 15;
    const valjevo = auditReachability && !context.arrivalFrom && context.script.archive === 5
      && context.script.area === context.map && (context.map === 4 || context.map === 6 || context.map === 7);
    const podolPlaza = auditReachability && !context.arrivalFrom && context.script.area === 18 && context.map === 18;
    const middleWilderness = auditReachability && !context.arrivalFrom && context.script.area === 26 && context.map === 26;
    const wildernessEncounter = context.script.area === context.map && context.map >= 25 && context.map <= 27;
    const sokalKeep = auditReachability && !context.arrivalFrom && context.script.area === 21 && context.map === 21;
    const auditedPalette = lizardKeep || mendorLibrary || valjevo || sokalKeep;
    // ECL16's descents enter a roofed component. Its relocations all land in
    // that component. The surface starts include the entrance and stair returns.
    const lizardStarts: readonly (readonly [number, number])[] = lizardCellar ? [[1, 7], [13, 1], [4, 15], [4, 5], [10, 4], [7, 10], [10, 8]]
      : [[8, 14], [10, 4], [9, 6], [6, 6], [3, 7], [5, 12], [7, 9], [9, 8]];
    // Library entrances and ECL15's scripted relocations cannot cross into
    // the five sealed cells at map 15's masonry corners.
    const libraryStarts: readonly (readonly [number, number])[] = [[1, 4], [8, 3], [14, 7], [4, 10], [7, 9], [5, 5], [9, 9], [9, 11]];
    const starts = mendorLibrary ? libraryStarts : lizardKeep ? lizardStarts
      : valjevo && context.map === 6 ? [[14, 4]] as const
      : valjevo && context.map === 7 ? [[5, 6]] as const
      : sokalKeep ? [[8, 14]] as const : undefined;
    const camera = context.camera;
    const poolLanding = auditReachability && context.script.area === 5 && context.map === 7;
    const playable = camera ? new Set([camera[1] * 16 + camera[0]])
      : starts && reachable(map, starts.map(([x, y]) => y * 16 + x), context.script.area);
    // An area whose own script writes the horizon band or the ground colour shows those, not what
    // another area's script left behind: the Graveyard writes both (9a8c, 9aa0), and none of its 922
    // cells with artwork uses any other. Without this the Graveyard was tried with Kuto's Well's and
    // the starting values as well, which made 1,542 cells out of a few dozen. Kuto's Well has its own
    // audited rule below, and a first view on arrival is still drawn under the area just left.
    const writtenHere = (from: string) => from.startsWith(`area ${context.script.area}'s script`);
    // The game resets both bytes whenever it starts a newly loaded script (ovl07 0x01b6 in 1.3 writes
    // 0x41 and 9 to them and puts the script cursor back at 0x9900), so nothing carries over from the
    // area before. An area whose script writes neither therefore shows only the starting values.
    // ovl07 0x01b6 has two callers: the NEW ECL command (ovl03 0x0c55, straight after the new block
    // is loaded) and the start of the exploring loop (ovl03 0x335d: a new game and a loaded one).
    // The 0x41 goes to the ground code (DS:0x6f68, script 0xc059), where ovl26 0x012f reads it as
    // ground 6; the 9 goes to the horizon code (DS:0x6f69, script 0xc05f), which ovl26 0x00c7 and
    // 0x00fb read as line 15 and band 7. So the reset draws exactly HORIZON; 0x41 means line 0 only
    // as a horizon code, which Kuto's Well alone writes.
    // Seen in play on 2026-11-21 (qa/art-worklist-observed.json, "rules"): New Phlan 0x41 and 9; the
    // Graveyard 0x0b and 8 after its own writes; one step off the Graveyard's edge (its NEW ECL 26)
    // 0x41 and 9 again, though no script writes 9 to the horizon code.
    const starting = (from: string) => from === "the game's starting value";
    const written = { bands: world.bands.filter(({ from }) => writtenHere(from)), grounds: world.grounds.filter(({ from }) => writtenHere(from)) };
    const ownBands = kuto || context.arrivalFrom ? [] : written.bands.length ? written.bands : world.bands.filter(({ from }) => starting(from));
    const ownGrounds = kuto || context.arrivalFrom ? [] : written.grounds.length ? written.grounds : world.grounds.filter(({ from }) => starting(from));
    const ownGround = (ground: number) => !ownGrounds.length || ownGrounds.some((known) => known.ground === ground);
    const ownBand = (line: number, band: number) => !ownBands.length || ownBands.some((known) => known.line === line && known.band === band);
    const groundAllowed = (ground: number, shaft: boolean) => ownGround(ground) && ((!kuto && !auditedPalette && !poolLanding) || ground === 6 || (shaft && ground === 1));
    const lowerValues = (shaft: boolean) => lowers.filter(({ line, band, ground }) =>
      ownBand(line, band) && groundAllowed(ground, shaft) && (!kuto || (line === 0 && band === (lowerWell ? 8 : 7)))
      && (!(auditedPalette || podolPlaza || poolLanding) || (line === 15 && band === 7)));
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        if (playable && !playable.has(y * 16 + x)) continue;
        const roofed = covered(map, x, y);
        const shaft = lowerWell && x === 7 && y === 7;
        for (const facing of [0, 2, 4, 6]) {
          if (camera?.[2] !== undefined && facing !== camera[2]) continue;
          const stacks = viewCells(view, x, y, facing);
          const mine = new Set<Agg>();
          let walls = false;
          stacks.forEach((stack, index) => {
            const row = Math.floor(index / 11);
            const rc = row < 5 ? 0 : row === 5 ? 1 : 2;
            if (stack.length) walls = true;
            const key = `${rc}${roofed ? 1 : 0}${shaft ? 1 : 0}|${stack.join(",")}`;
            let agg = aggs.get(key);
            if (!agg) {
              const { tiles, open } = cells.prune(stack);
              agg = { rc, roofed, shaft, tiles, open, views: 0, squares: new Set(), first: { map: context.map, x, y, facing: FACING[facing]!, column: index % 11, row } };
              aggs.set(key, agg);
            }
            agg.views++;
            agg.squares.add(y * 16 + x);
            mine.add(agg);
          });
          views.push({ square: y * 16 + x, roofed, shaft, aggs: [...mine], walls });
          // ECL6/7/8 set 0x49fb to 255 when restoring GEO blocks 25/26/27.
          // The branches that enable Area load different maps for the caves.
          if (context.script.areaView && !context.arrivalFrom && !wildernessEncounter) {
            areaViewCells(view, x, y, facing).forEach((stack, index) => {
              const { tiles } = cells.prune(stack);
              const cell = cells.cell("-", tiles);
              if (!cell.hash) return;
              const entry = overhead.get(cell.hash) ?? { cell, context, views: 0, squares: new Set<number>(), first: { map: context.map, x, y, facing: FACING[facing]!, column: index % 11, row: Math.floor(index / 11) }, areaView: true };
              overhead.set(cell.hash, entry);
              entry.views++;
              entry.squares.add(y * 16 + x);
            });
          }
        }
      }
    }
    // Each aggregate under each backdrop it can have.
    const entries = new Map<string, Entry[]>();
    const hashesOf = new Map<Agg, Map<string, string | undefined>>();
    const skies = (roofed: boolean) => {
      if (lizardKeep) return lizardCellar ? [0] : [0, 11];
      if (poolLanding) return [15];
      if (middleWilderness && roofed) return [0];
      if (sokalKeep) return roofed ? [12] : [0, 11];
      if (valjevo && context.map === 7) return roofed ? [15] : [0];
      if (mendorLibrary || valjevo) return roofed ? [15] : [0, 11];
      const possible = roofed ? context.script.sky.covered : context.script.sky.open;
      // Paired native captures of the Podol healer route show canopy colour 12.
      if (roofed && context.script.area === 18 && context.map === 18) return [...new Set([...possible, 12])];
      return possible.filter((sky) => (!middleWilderness || sky !== 14)
        && (!kuto || sky === 0 || sky === 11 || (!lowerWell && sky === 12)));
    };
    const backdropsOf = (agg: Agg): Backdrop[] => !agg.open ? ["-"]
      : agg.rc === 0 ? skies(agg.roofed).map(skyBack)
      : agg.rc === 2 ? world.grounds.filter(({ ground }) => groundAllowed(ground, agg.shaft)).map(({ ground }) => `g${ground}`)
      : skies(agg.roofed).flatMap((sky) => lowerValues(agg.shaft).map((lower) => `h${sky}.${lower.line}.${lower.band}.${lower.ground}`));
    for (const agg of aggs.values()) {
      const byBackdrop = new Map<string, string | undefined>();
      hashesOf.set(agg, byBackdrop);
      for (const backdrop of backdropsOf(agg)) {
        const cell = cells.cell(backdrop, agg.tiles);
        byBackdrop.set(backdrop, cell.hash);
        if (!cell.hash) continue;
        const list = entries.get(cell.hash) ?? [];
        entries.set(cell.hash, list);
        list.push({ cell, context, views: agg.views, squares: agg.squares, first: agg.first, areaView: false });
      }
    }
    // A square where some view with a wall in it is wholly covered by existing art, under one sky
    // and one set of colours below it, was stood on when that art was made.
    const stoodOn = new Set<number>();
    for (const { square, roofed, shaft, aggs: mine, walls } of views) {
      if (!walls || stoodOn.has(square)) continue;
      search: for (const sky of skies(roofed)) {
        for (const lower of lowerValues(shaft)) {
          const ok = mine.every((agg) => {
            const backdrop = !agg.open ? "-" : agg.rc === 0 ? skyBack(sky) : agg.rc === 2 ? `g${lower.ground}` : `h${sky}.${lower.line}.${lower.band}.${lower.ground}`;
            const hash = hashesOf.get(agg)!.get(backdrop);
            return hash !== undefined && have.has(hash);
          });
          if (ok) { stoodOn.add(square); break search; }
        }
      }
    }
    for (const [hash, entry] of overhead) entries.set(hash, [...(entries.get(hash) ?? []), entry]);
    return { entries, stoodOn, map, playable, auditedPalette, narrowedPalette: middleWilderness || podolPlaza };
  };

  const items: Item[] = [];
  const reports: AreaReport[] = [];
  const faceSize = world.tables.pieceColumns[6]! * world.tables.pieceRows[6]!;
  /** Tiles that show in some cell of some context, from any square. */
  const shownTiles = new Set<TileName>(), shownAlone = new Set<TileName>();
  const labels = [...new Set([...own.map((context) => context.label), ...existing.keys()])].sort((a, b) => a - b);
  for (const label of labels) {
    const mine = own.filter((context) => context.label === label);
    const have = existing.get(label) ?? new Set<string>();
    const report: AreaReport = {
      area: label, name: names[label] ?? `area ${label}`, established: false, why: "", maps: [...new Set(mine.map((context) => context.map))],
      wallSets: [...new Set(mine.map(slotText))], existingKeys: have.size, existingKeysAccountedFor: 0, existingKeysOnlyAsArrivalViews: 0, unaccountedKeys: [],
      cellsTheViewsCanShow: 0, cellsWithArt: 0, toDo: 0, notEstablished: {},
    };
    reports.push(report);
    if (!mine.length) { report.why = "the tool found no script and map that draw under this area number"; report.unaccountedKeys = [...have].map((hash) => `tile:${label}:${hash}`); continue; }

    const seen = new Map<string, Entry[]>();
    const wallMaterials = new Set<string>();
    const unreachableHashes = new Set<string>();
    const auditedContexts = new Set<Context>();
    const walkable = new Map<Context, Set<number>>();
    for (const context of mine) {
      const { entries, stoodOn, map, playable, auditedPalette, narrowedPalette } = enumerate(context, have);
      if (auditedPalette) auditedContexts.add(context);
      if (auditedPalette || narrowedPalette) {
        // Keep existing files traceable without counting the unreachable views as playable.
        for (const hash of enumerate(context, have, false).entries.keys()) {
          if (!entries.has(hash) && have.has(hash)) unreachableHashes.add(hash);
        }
      }
      for (const [hash, list] of entries) seen.set(hash, [...(seen.get(hash) ?? []), ...list]);
      // WebGL samples the uncomposited foreground of each wall present on the map.
      const wallContext = { world, script: scriptForWalls(context), slots: context.slots };
      const types = new Set(map.walls);
      frontWallSymbols(wallContext).forEach((symbol, index) => {
        if (!types.has(Math.floor(index / faceSize) + 1)) return;
        const source = symbolTile(wallContext, symbol);
        const tile = source && tilesBySource.get(source);
        if (tile && tile.transparentMask !== "ffffffffffffffff") wallMaterials.add(tile.hash);
      });
      // Squares connected to ones stood on are taken as reachable, unless another area's script uses the
      // same map: there a door may lead into the other area, so only the squares stood on count.
      // The hedge maze (ECL5 block 5) keeps its own script on all of map 4, which area 4's script also
      // loads: it leaves only by NEW ECL 3 for event codes 30 and 31 (9c25), which no square of map 4
      // has, and NEW ECL 7 up the stairs (a482). So every square walked to from one stood on is area 5's.
      const hedgeMaze = context.script.archive === 5 && context.script.area === 5 && context.map === 4;
      const shared = !hedgeMaze && world.scripts.filter((script) => script.archive === context.script.archive && script.maps.some((known) => known.block === context.map)).length > 1;
      walkable.set(context, playable ?? (shared ? stoodOn : reachable(map, [...stoodOn], context.script.area)));
    }
    for (const list of seen.values()) for (const { cell } of list) {
      for (const tile of cell.tiles) shownTiles.add(tile);
      if (cell.tiles.length === 1) shownAlone.add(cell.tiles[0]!);
    }
    const arrivalHashes = new Set<string>();
    for (const context of arrivals.filter((arrival) => arrival.label === label)) {
      if ([...have].every((hash) => seen.has(hash) || wallMaterials.has(hash) || arrivalHashes.has(hash))) break;
      for (const hash of enumerate(context, have).entries.keys()) arrivalHashes.add(hash);
    }
    report.cellsTheViewsCanShow = seen.size;
    for (const hash of have) {
      if (seen.has(hash)) { report.existingKeysAccountedFor++; report.cellsWithArt++; }
      else if (wallMaterials.has(hash)) {
        report.existingKeysAccountedFor++;
        report.existingKeysOnlyAsWallMaterials = (report.existingKeysOnlyAsWallMaterials ?? 0) + 1;
      } else if (arrivalHashes.has(hash)) { report.existingKeysAccountedFor++; report.existingKeysOnlyAsArrivalViews++; }
      else if (unreachableHashes.has(hash)) {
        report.existingKeysAccountedFor++;
        report.existingKeysOnlyInUnreachableViews = (report.existingKeysOnlyInUnreachableViews ?? 0) + 1;
      } else if (storedTileHashes.has(hash)) {
        // The pixels of one stored tile, keyed here although this area's own maps do not put that wall
        // up: the wall material of the area next door, sampled while the area number still names this
        // one (the Valjevo gallery arch under area 3, the Valjevo threshold under the Slums). It is a
        // real piece of the game's art in use, so it says nothing against the reading of this area.
        report.existingKeysAccountedFor++;
        report.existingKeysOnlyAsWallMaterials = (report.existingKeysOnlyAsWallMaterials ?? 0) + 1;
      } else report.unaccountedKeys.push(`tile:${label}:${hash}`);
    }

    const note = (reason: string, count = 1) => { report.notEstablished[reason] = (report.notEstablished[reason] ?? 0) + count; };
    if (have.size < 30) report.why = `only ${have.size} cells of this area have artwork so far, too few to confirm the tool's reading of its maps and wall sets against`;
    else if (report.unaccountedKeys.length) report.why = `${report.unaccountedKeys.length} of the ${have.size} cells that have artwork are not among the cells the tool works out for this area, so its reading of the area is not complete`;
    else { report.established = true; report.why = `all ${have.size} cells that have artwork are among the cells the tool works out`; }

    // Backdrops the existing artwork confirms: a cell with art that only one backdrop can make.
    const confirmed = new Set<Backdrop>(["-"]);
    // Backdrops seen in play in this area count exactly as ones existing artwork confirms.
    for (const { backdrop } of observed[label]?.shown ?? []) confirmed.add(backdrop);
    // Backdrops the script shows cannot occur here: their cells are neither work nor held.
    const ruledOut = observed[label]?.notShown ?? [];
    const ruling = (backdrop: Backdrop) => ruledOut.find((rule) => rule.backdrop === backdrop
      || (rule.backdrop[0] === "s" && backdrop.startsWith(`h${rule.backdrop.slice(1)}.`)));
    // These two scope 26 keys were authored for the Valhingen arrival while
    // the script area still reports 26. They establish nothing about map 26's ground.
    const graveyardArrivalBackdrops = label === 26 ? new Set([
      cells.cell("g8", []).hash, cells.cell("h0.0.8.8", []).hash,
    ]) : undefined;
    // Palette 8 is the original open-square fill in AREA mode. Its screen
    // art does not establish an ordinary first-person ground profile.
    const areaFill = cells.cell("g8", []).hash;
    for (const [hash, list] of seen) {
      if (!have.has(hash) || (hash === areaFill && art.get(`tile:${label}:${hash}`)?.screenCellOnly) || graveyardArrivalBackdrops?.has(hash)) continue;
      const backdrops = new Set(list.filter((entry) => !entry.areaView).map((entry) => entry.cell.backdrop));
      if (backdrops.size === 1) confirmed.add([...backdrops][0]!);
    }
    const skyOk = (sky: string) => confirmed.has(`s${sky}`) || [...confirmed].some((backdrop) => backdrop.startsWith(`h${sky}.`));
    const groundOk = (ground: string) => confirmed.has(`g${ground}`) || [...confirmed].some((backdrop) => backdrop[0] === "h" && backdrop.endsWith(`.${ground}`));
    const backdropOk = (backdrop: Backdrop): boolean => {
      if (confirmed.has(backdrop)) return true;
      if (backdrop[0] === "s") return skyOk(backdrop.slice(1));
      if (backdrop[0] === "g") return groundOk(backdrop.slice(1));
      // The horizon row: the usual colours below a confirmed sky, or exactly a combination the artwork has.
      const [sky, line, band, ground] = backdrop.slice(1).split(".") as [string, string, string, string];
      return skyOk(sky) && groundOk(ground) && usual({ line: Number(line), band: Number(band), ground: Number(ground) });
    };
    const overheadConfirmed = [...seen].some(([hash, list]) => have.has(hash) && list.every((entry) => entry.areaView));
    const observedOverhead = observed[label]?.overheadCells;
    const overheadKeys = new Set(observedOverhead?.keys);

    const shapeOf = (signature: string) => signature.includes("|") ? signature.slice(signature.indexOf("|") + 1) : signature;
    const shapeWithArt = new Map<string, string>();
    for (const [hash, list] of seen) if (have.has(hash)) for (const entry of list) {
      const shape = shapeOf(entry.cell.signature);
      if (shape && !shapeWithArt.has(shape)) shapeWithArt.set(shape, `tile:${label}:${hash}`);
    }
    for (let [hash, list] of seen) {
      if (have.has(hash)) continue;
      if (!report.established) { note("cells of an area whose reading is not confirmed"); continue; }
      const struck = list.length && list.every((entry) => !entry.areaView && ruling(entry.cell.backdrop)) ? ruling(list[0]!.cell.backdrop) : undefined;
      if (struck) { (report.struckOff ??= {})[struck.reason] = (report.struckOff[struck.reason] ?? 0) + 1; continue; }
      list = list.filter((entry) => entry.areaView || !ruling(entry.cell.backdrop));
      const reached = list.filter((entry) => [...entry.squares].some((square) => walkable.get(entry.context)!.has(square)));
      const certain = reached.filter((entry) => entry.areaView
        ? (observedOverhead ? overheadKeys.has(`tile:${label}:${hash}`) : overheadConfirmed)
        : auditedContexts.has(entry.context) || backdropOk(entry.cell.backdrop));
      // Held back, not listed. On 2026-11-21 these were listed as "likely" work for an hour and that
      // was wrong: the sky and ground combinations the tool tries include values other areas' scripts
      // set (the Graveyard sets its own on entry, yet was multiplied by Kuto's Well's and the starting
      // values), which turned a few dozen cells into 1,542. Nothing goes on the list until the area's
      // own sky and ground are established.
      const likely = "";
      if (!certain.length) {
        if (list.every((entry) => entry.areaView)) note("cells of the overhead area view, which no existing artwork of the area confirms");
        else if (!reached.length) note("cells seen only from squares not connected to any square the existing artwork was made from");
        else note("cells that show a sky or ground colour no existing artwork of the area shows");
        const reason = list.every((entry) => entry.areaView) ? "overhead view" : !reached.length ? "unconnected squares" : "unproven sky or ground";
        for (const entry of reached.length ? reached : list) {
          held.push({ area: label, areaName: report.name, key: `tile:${label}:${hash}`, reason, backdrop: entry.cell.backdrop, composition: entry.cell.signature,
            map: entry.context.map, x: entry.first!.x, y: entry.first!.y, facing: entry.first!.facing, column: entry.first!.column, row: entry.first!.row, views: entry.views });
        }
        continue;
      }
      const entry = certain[0]!;
      const { context, cell } = entry;
      const slot = context.slots.slots.findIndex((loaded, index) => index > 0 && loaded && cell.tiles.some((tile) => tile.startsWith(`8X8D${wallArchiveOf(context)}.DAX:${loaded.tileBlock}:`)));
      const top = cell.tiles.at(-1);
      const group = entry.areaView ? "overhead area view, 8X8D1 block 202" : !cell.tiles.length ? "plain sky, horizon and ground"
        : top!.startsWith("8X8D1.DAX:203:") && slot <= 0 ? "shared tile set 8X8D1 block 203"
        : `tile set ${top!.replace(".DAX", "").replace(/:(\d+):\d+$/, " block $1")}`;
      const views = certain.reduce((sum, known) => sum + known.views, 0);
      items.push({
        kind: "first-person cell", key: `tile:${label}:${hash}`, width: 32, height: 32, area: label, areaName: report.name, group, what: cell.kind,
        composition: cell.signature, description: `${describeSignature(cell.signature)}, shown in area ${label} (${report.name})`,
        seenAt: entry.first, views, drawnIn: drawnIn.get(hash) ?? [], sameAs: sameAs.get(hash),
        shape: shapeOf(cell.signature), ...(shapeWithArt.has(shapeOf(cell.signature)) ? { sameShapeAs: shapeWithArt.get(shapeOf(cell.signature)) } : {}),
        why: likely ? `${likely}; drawn in ${views} views of map ${context.map} (${slotText(context)})`
          : `drawn in ${views} views of map ${context.map} (${slotText(context)}) from squares connected to ones the existing artwork covers`,
      });
      report.toDo++;
    }
  }
  if (cells.missingHashes) {
    const first = reports[0]!;
    first.notEstablished["cells of several tiles whose hash is not in qa/art-worklist-cells.json: run npm run art:worklist with POR_GAMEDATA set"] = cells.missingHashes;
  }

  // Stored tiles no view of any map shows, with why.
  const loaded = new Map<string, Set<TileName>>();
  for (const context of own) {
    const map = world.maps.get(`${context.script.archive}:${context.map}`)!;
    const named = namedTiles({ world, script: scriptForWalls(context), map, slots: context.slots });
    for (const slot of context.slots.slots) {
      if (!slot) continue;
      const block = `8X8D${wallArchiveOf(context)}.DAX:${slot.tileBlock}`;
      loaded.set(block, loaded.get(block) ?? new Set());
    }
    for (const tile of named) {
      const block = tile.replace(/:\d+$/, "");
      loaded.set(block, (loaded.get(block) ?? new Set()).add(tile));
    }
  }
  const withArtAnywhere = new Set([...existing.values()].flatMap((hashes) => [...hashes]));
  const byHash = new Map(world.catalogue.tiles.map((tile) => [tile.hash, tile]));
  const never: { block: string; reason: string; tiles: number[] }[] = [];
  const stored = { tiles: 0, blank: 0, distinctPictures: new Set<string>(), withArtInSomeArea: 0, withoutArt: 0, withoutArtNoMapShows: 0, withoutArtShownOnlyWithOthers: 0, withoutArtShownAlone: 0 };
  for (const [block, hashes] of [...world.tileBlocks].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))) {
    const reasons = new Map<string, number[]>();
    hashes.forEach((hash, index) => {
      stored.tiles++;
      if (hash === BLANK) { stored.blank++; return; }
      stored.distinctPictures.add(hash);
      const tile = `${block}:${index}`;
      const hasArt = withArtAnywhere.has(hash) || Boolean(byHash.get(hash)?.overColour?.some((over) => withArtAnywhere.has(over)));
      if (hasArt) stored.withArtInSomeArea++; else stored.withoutArt++;
      if (shownTiles.has(tile)) {
        if (!hasArt) { if (shownAlone.has(tile)) stored.withoutArtShownAlone++; else stored.withoutArtShownOnlyWithOthers++; }
        return;
      }
      if (!hasArt) stored.withoutArtNoMapShows++;
      const reason = block === "8X8D1.DAX:202" ? "a symbol of the overhead view's bank that the overhead view never draws (it draws the 16 wall patterns and 4 arrows); other screens may draw it, which the tool has not read"
        : block === "8X8D1.DAX:203" ? "a tile of the shared bank that no wall definition a script loads names; the screen frame is drawn from this bank outside the view, where no artwork key applies"
        : !loaded.has(block) ? "its tile block is loaded by no LOAD PIECES of any script"
        : cells.invisible(tile) ? "every pixel of it is transparent"
        : !loaded.get(block)!.has(tile) ? "no symbol of the wall definitions loaded with its block names it"
        : "wall definitions name it, but only in pieces of wall types that no view of any map that loads them places in the 11 by 11 window";
      reasons.set(reason, [...(reasons.get(reason) ?? []), index]);
    });
    for (const [reason, tiles] of reasons) never.push({ block: block.replace(".DAX", "").replace(":", " block "), reason, tiles });
  }
  items.sort((a, b) => a.area! - b.area! || a.group.localeCompare(b.group, undefined, { numeric: true }) || a.key.localeCompare(b.key));
  return {
    items, reports, never, held,
    stored: { ...stored, distinctPictures: stored.distinctPictures.size },
    backdrops: { bands: world.bands, grounds: world.grounds },
  };
}

// ---------------------------------------------------------------------------------------------
// The battlefield.

interface BattleReport {
  archive: string;
  what: string;
  frames: number;
  cells: number;
  distinctCells: number;
  withArt: number;
  toDo: number;
  notEstablished: number;
  why: string;
}

function battlefield(data: PortGameData, art: Map<string, Art>, original: Originals | undefined, cache: Record<string, string[]>) {
  // Hashes of the nine cells of each 24 by 24 frame. game/ holds them for DUNGCOM, WILDCOM and RANDCOM.
  const frames = new Map<string, string[]>();
  for (const record of data.pictures) {
    if (!/^(DUNGCOM|WILDCOM|RANDCOM|SQRPACI|BACPAC)\.DAX$/.test(record.file)) continue;
    record.pictures.forEach((picture, member) => {
      for (let index = 0; index < picture.frames; index++) {
        const name = `${record.file}:${record.block}:${member}:${index}`;
        const hashes = picture.cellHashes?.[index] ?? (original?.frames.has(name) ? cellsOf(original.frames.get(name)!).map(sha256) : cache[name]);
        if (hashes) frames.set(name, hashes);
      }
    });
  }
  const derived: Record<string, string[]> = {};
  for (const [name, hashes] of frames) if (/^(SQRPACI|BACPAC)/.test(name)) derived[name] = hashes;
  const keyed = new Set([...art.keys()].filter((key) => key.startsWith("battle-tile:")).map((key) => key.slice(12)));
  const holders = new Map<string, Set<string>>();
  for (const [, hashes] of frames) for (const hash of hashes) holders.set(hash, (holders.get(hash) ?? new Set()).add(hashes.join()));
  const random = new Set([...frames].filter(([name]) => name.startsWith("RANDCOM")).map(([, hashes]) => hashes.join()));
  // A picture is drawn whole. One whose pixels only it has, and which has art for a cell, has been on a battlefield.
  const proven = new Set<string>();
  for (const [, hashes] of frames) if (hashes.some((hash) => keyed.has(hash) && holders.get(hash)!.size === 1)) proven.add(hashes.join());

  const items: Item[] = [];
  const reports: BattleReport[] = [];
  const listed = new Set<string>();
  const unconfirmed = new Set<string>();
  // Indoor setup leaves slots 25–33 holding BACPAC, but no indoor fight draws them. The battlefield
  // draws (overlay 0x1f at 0206, 067d, 06de, 0966) pass slot = DS:2747[4 * kind]. The indoor builder
  // (overlay 0x0a 0810, writing through 0221) stores kind = 1 + a constant 0..24 in every cell; 0000
  // adds kinds 0x1a–0x1d; combat writes 0x1e and 0x1f and restores saved kinds. Kinds 0–31 name
  // slots 0–24 and 34–39 only: slots 25–33 are kinds 0x39–0x41, which only the outdoor builder writes.
  const indoorUnused = new Set([...frames]
    .filter(([name]) => /^BACPAC\.DAX:1:\d+:(2[5-9]|3[0-3])$/.test(name))
    .flatMap(([, hashes]) => hashes));
  const struckIndoor = new Set<string>();
  const about: Record<string, string> = {
    "DUNGCOM.DAX": "terrain pictures of fights indoors; the game copies them into the battlefield's picture slots",
    "WILDCOM.DAX": "the scenery of fights outdoors: bushes, trees, logs, rocks, streams and cacti",
    "SQRPACI.DAX": "the native blitter's terrain sheet; Enhanced draws the Moonsea overland map with its illustrated plate",
    "BACPAC.DAX": "40 Moonsea pictures whose pixels match SQRPACI block 1 frames 0–39; outdoor battle setup replaces all 40 slots",
  };
  for (const archive of ["DUNGCOM.DAX", "WILDCOM.DAX", "SQRPACI.DAX", "BACPAC.DAX"]) {
    const mine = [...frames].filter(([name]) => name.startsWith(archive));
    const report: BattleReport = { archive, what: about[archive]!, frames: mine.length, cells: 0, distinctCells: 0, withArt: 0, toDo: 0, notEstablished: 0, why: "" };
    const distinct = new Set<string>();
    for (const [name, hashes] of mine) {
      hashes.forEach((hash, cell) => {
        if (hash === BLANK) return;
        report.cells++;
        if (distinct.has(hash)) return;
        distinct.add(hash);
        if (keyed.has(hash)) { report.withArt++; return; }
        if (random.has(hashes.join())) return;
        if (archive === "SQRPACI.DAX" || archive === "BACPAC.DAX") {
          if (indoorUnused.has(hash)) struckIndoor.add(hash);
          return;
        }
        if (!proven.has(hashes.join()) && archive !== "WILDCOM.DAX") {
          report.notEstablished++;
          unconfirmed.add(hash);
          return;
        }
        report.toDo++;
        if (listed.has(hash)) return;
        listed.add(hash);
        const [file, block, , frame] = name.split(":");
        items.push({
          kind: "battlefield cell", key: `battle-tile:${hash}`, width: 32, height: 32, group: `battlefield, ${file!.replace(".DAX", "")}`,
          what: "one cell of a battlefield picture", composition: `${name}:cell${cell}`,
          description: `${file!.replace(".DAX", "")} block ${block} picture ${frame}, cell ${cell} (column ${cell % 3}, row ${Math.floor(cell / 3)} of its 3 by 3 cells)`,
          drawnIn: [], why: archive === "WILDCOM.DAX" ? "native outdoor battlefield setup loads WILDCOM"
            : "another cell of the same picture already has artwork, so the picture has been on a battlefield, and a picture is drawn whole",
        });
      });
    }
    report.distinctCells = distinct.size;
    report.why = mine.length ? "a cell is listed to do when another cell of its picture has artwork; for the rest, which pictures a fight can place has not been read from the game's battlefield builder"
      : "game/ holds no cell hashes for this archive: run npm run art:worklist with POR_GAMEDATA set";
    reports.push(report);
  }
  return { items, reports, derived, unconfirmedCells: [...unconfirmed].filter((hash) => !listed.has(hash)).length, struckIndoorCells: struckIndoor.size,
    keys: keyed.size, keysThatAreAStoredCell: [...keyed].filter((hash) => holders.has(hash)).length };
}

// ---------------------------------------------------------------------------------------------
// Other pictures no key names.

interface OtherPicture {
  frame: string;
  width: number;
  height: number;
  what: string;
  keyForm: string;
  pngSize: string;
  evidence: string;
}

function otherPictures(data: PortGameData, read: (path: string) => Uint8Array): { pictures: OtherPicture[]; error?: string } {
  // The catalogue says which frames no key names. It exits non-zero while any key is unreachable; its file is written first.
  const run = spawnSync(process.execPath, ["--import", "tsx", at("tools", "verify-art-catalogue.ts")], { cwd: repository, encoding: "utf8" });
  const file = at("out", "art-catalogue.json");
  if (!existsSync(file)) return { pictures: [], error: `npm run verify:art-catalogue wrote no out/art-catalogue.json (${run.stderr.slice(0, 200)})` };
  const uncovered = (JSON.parse(readFileSync(file, "utf8")) as { framesNoKeyNames: Record<string, string[]> }).framesNoKeyNames;
  const records = new Map<string, PictureRecord>(data.pictures.map((record) => [`${record.file}:${record.block}`, record]));
  // PICTURE operands in the scripts, by archive number.
  const shown = new Map<string, string[]>();
  for (const record of data.content) {
    if (record.kind !== "script" || record.block === undefined) continue;
    const archive = /\d/.exec(record.file)![0];
    for (const instruction of disassemble(scriptFromBlock(contentBytes(record, read))).instructions) {
      if (instruction.name !== "PICTURE") continue;
      const operand = instruction.operands[0];
      if (operand?.code !== 0) continue;
      const key = `${archive}:${operand.low}`;
      shown.set(key, [...(shown.get(key) ?? []), `area ${record.block} at ${instruction.address.toString(16)}`]);
    }
  }
  const pictures: OtherPicture[] = [];
  for (const [family, frames] of Object.entries(uncovered)) {
    if (/^(DUNGCOM|WILDCOM|SQRPACI|BACPAC|8X8D)$/.test(family)) continue;
    for (const frame of frames) {
      const [file, block, member, index] = frame.split(":") as [string, string, string, string];
      const picture = records.get(`${file}:${block}`)?.pictures[Number(member)];
      if (!picture) continue;
      const archive = /\d/.exec(file)?.[0];
      const scripts = archive ? shown.get(`${archive}:${block}`) : undefined;
      const [what, keyForm, pngSize] = family === "PIC" ? ["a picture of the 88 by 88 window", `portrait:${file}:${block}:${member}:${index}`, "352x352"]
        : family === "SPRIT" ? ["an approach sprite", `encounter:${file}:${block}:${member}:${index}, with its placement under "encounters"`, `${picture.width * 4}x${picture.height * 4}`]
        : family === "HEAD" ? ["a portrait head", `portrait:${file}:${block}:BODYn.DAX:<body> for each body it is shown with, or character-sheet:${file}:${block}`, "352x352 for a portrait; 352 wide for a sheet part"]
        : family === "FINAL" ? ["a picture of the ending", "none: tools/upgrade-art.ts accepts no key for FINAL pictures", "-"]
        : family === "ICON" ? ["a 24 by 24 combat icon", `combat:${file}:${block}`, "96x96"]
        : ["a picture", "none known", "-"];
      const evidence = (family === "PIC" || family === "SPRIT")
        ? scripts ? `a PICTURE ${block} is in the script of ${[...new Set(scripts)].slice(0, 4).join(", ")}${Number(member) || Number(index) ? `; this is member ${member} frame ${index} of the record, and which members a PICTURE draws must be seen in play` : ""}`
          : `no PICTURE ${block} with a plain number is in a script of archive ${archive}`
        : family === "ICON" ? "the native combat picture loader loads ICON ready and strike pairs (see docs/ART-INVENTORY.md)"
        : file === "FINAL5.DAX"
          ? "native placement confirmed by the GOG 1.3 valjevo-dragon-loot draw trace (see docs/ART-INVENTORY.md); Enhanced covers the sequence with scene illustrations, and this frame has no individual binding"
          : "the scripts do not name it; the program draws it, and where has not been read";
      pictures.push({ frame, width: picture.width, height: picture.height, what, keyForm, pngSize, evidence });
    }
  }
  return { pictures };
}

// ---------------------------------------------------------------------------------------------
// Output.

interface Worklist {
  schema: 2;
  about: string;
  done: string;
  remaining: number;
  totals: Record<string, number | string>;
  notEstablished: Record<string, number | string>;
  areas: AreaReport[];
  battlefield: BattleReport[];
  battlefieldStruckOff?: { cells: number; reason: string };
  storedTilesNoMapShows: { block: string; reason: string; tiles: number[] }[];
  otherPicturesNoKeyNames: OtherPicture[];
  endingFramesCoveredByIllustrations: OtherPicture[];
  blankApproachSprites: string[];
  backdrops: { bands: WorldData["bands"]; grounds: WorldData["grounds"] };
  items: Item[];
}

function document(list: Worklist): string {
  const lines: string[] = [];
  const add = (...text: string[]) => lines.push(...text);
  const cellItems = list.items.filter((item) => item.kind === "first-person cell"), battleItems = list.items.filter((item) => item.kind === "battlefield cell");
  add("# Artwork worklist", "",
    "## What to do now", "",
    ...(() => {
      // Requests the owner has made that no tool can find (qa/art-requests.json): open ones are work.
      const requests = (JSON.parse(readFileSync(at("qa", "art-requests.json"), "utf8")) as { requests: { id: string; key: string; file: string; what: string; done: string | null }[] })
        .requests.filter((request) => !request.done);
      const keyable = list.otherPicturesNoKeyNames.filter((picture) => !/^none\b/.test(picture.keyForm));
      const ending = list.otherPicturesNoKeyNames.filter((picture) => /^none\b/.test(picture.keyForm));
      const work = list.remaining + keyable.length + requests.length;
      return [
        work ? `**There is art to do: ${work} item${work === 1 ? "" : "s"}.**` : "**There is no proven art to do right now.** Everything the tools can show the game draws has your art. Check back after the QA owner's next update to this file.", "",
        `1. **Wall tiles: ${cellItems.length ? `${cellItems.length} cells to draw, in ${[...new Set(cellItems.map((item) => item.areaName))].join(", ")}` : "none"}. Outdoor fight terrain: ${battleItems.length ? `${battleItems.length} cells to draw (the ground and scenery of fights outdoors: grass, mountains, bushes, trees, logs, rocks, streams, cacti)` : "none"}.**${list.remaining ? " Each is listed below with its exact key." : ""}`,
        `2. **Pictures: ${keyable.length ? `${keyable.length} frames to draw` : "none"}.**${keyable.length ? ` Listed under "Other pictures no key names", each with its key form.` : ""}` +
          (ending.length ? ` The ${ending.length} ending frames under "Other pictures no key names" are not work: no key can name them, and the Enhanced ending covers those beats with its scene illustrations (docs/ART-INVENTORY.md). Whether the very last beat, the final council reward, is covered is still to be checked.` : ""),
        ...(requests.length ? [`**Asked for by the owner (qa/art-requests.json): ${requests.length}.**`, ...requests.map((request) => `   - \`${request.key}\` (${request.file}): ${request.what}`)] : []),
        `3. **Do not draw anything under "Not established".** Those cells are not confirmed to appear. The QA owner is settling them by play and moves each one that proves real into item 1.`, "",
        "The artwork is done when items 1 and 2 are none and nothing is left under \"Not established\".", "",
      ];
    })(),
    "## The short version", "",
    "This file covers the first-person view's wall tiles, the outdoor battle terrain, and any picture frame no artwork key names yet.",
    "A cell is one 8 by 8 square of the screen, redrawn at 32 by 32. Most cells below are a shape you have already drawn, standing over a different sky or ground colour",
    "(another hour of the day, another part of the map). So count shapes, not cells:", "",
    "| Area | Cells to do | Distinct shapes | Shapes you have already drawn over another sky or ground | Shapes with no version yet |", "| ---: | ---: | ---: | ---: | ---: |",
    ...(() => {
      const byArea = new Map<string, Item[]>();
      for (const item of cellItems) byArea.set(`${item.area} ${item.areaName}`, [...(byArea.get(`${item.area} ${item.areaName}`) ?? []), item]);
      const rows = [...byArea].sort(([, a], [, b]) => b.length - a.length).map(([area, items]) => {
        const shapes = new Set(items.map((item) => item.shape)), known = new Set(items.filter((item) => item.sameShapeAs).map((item) => item.shape));
        return { area, cells: items.length, shapes: shapes.size, known: known.size };
      });
      const sum = (pick: (row: typeof rows[number]) => number) => rows.reduce((total, row) => total + pick(row), 0);
      return [...rows.map((row) => `| ${row.area} | ${row.cells} | ${row.shapes} | ${row.known} | ${row.shapes - row.known} |`),
        `| **All areas** | **${sum((row) => row.cells)}** | **${sum((row) => row.shapes)}** | **${sum((row) => row.known)}** | **${sum((row) => row.shapes - row.known)}** |`];
    })(), "",
    `Outdoor battle terrain: ${battleItems.length} cells. Each item below carries \`shape\` and, where there is one, \`sameShapeAs\`: the key of your existing art for that shape in the same area.`,
    "Start with the shapes you have already drawn: those are the same piece over a new background. Then the shapes with no version yet.", "",
    "This file is written by `npm run art:worklist`. Do not edit it or `qa/art-worklist.json` by hand: add art, run the tool, commit what it writes.", "",
    "To the artwork agent: this list exists to carry your work to 100%, not to correct it. The owner's words are that you have",
    "\"done an amazing job of keeping the art consistent in the VGA style, creating all new 32x32 tiles from 8x8 inspirations\".",
    "The shipped game will run with no original file, in Enhanced only, so every picture the game can show needs your art, down to each",
    "8 by 8 cell. Your routes found most of them. This tool works out the rest from the game's own maps and wall definitions, so nothing is left to be stumbled on.", "",
    "## One item, step by step", "",
    "1. Pick an item below (or from `qa/art-worklist.json`). It gives the exact key and the PNG size. Work through one area and one tile set at a time: the list is in that order.",
    "2. See what you are redrawing: `npm run art:worklist -- --sheets` writes `out/art-worklist/index.html`, each original cell enlarged and",
    "   labelled with its key, grouped as here. The sheets are made from the player's own 1.3 files: set `POR_GAMEDATA` to that directory.",
    "   `out/` is outside version control. Never commit original pixels.",
    "3. Draw it, 32 by 32, in the style of the pieces around it. \"Same pixels as\" names a PNG of yours that already draws the very same original pixels in another area:",
    "   bind that PNG under the new key if it suits the place, or redraw it for the place.",
    "4. Save the PNG in `upgrades/` and add the key to `\"assets\"` in `upgrades/manifest.json`, exactly as given.",
    "5. Run `npm run verify:art-worklist`. The item is done when the key is in a manifest and its PNG is there and 32 by 32. It needs no Chrome and no original file. Then check the place in Chrome as you do now: each item says a map square and facing where it shows.",
    "6. Run `npm run art:worklist` and commit the regenerated files with your art.", "",
    "## Conventions: yours, unchanged", "",
    "- First-person keys are `tile:<area>:<sha256>`: the area number the game is in, and the SHA-256 of the cell's 64 original palette indices in row order (`upgrades/README.md`).",
    "- A key belongs to one area. The same pixels in another area need their own key there; that key may name the same PNG.",
    "- Battlefield keys are `battle-tile:<sha256>` of one 8 by 8 cell of the battlefield, with no area (`docs/ART-INVENTORY.md`).",
    "- Each tile PNG is 32 by 32. File names are lower case letters, digits, `-` and `_`, ending `.png`; yours are a place and subject and the first 12 hex digits of the hash, such as `kobold-caves-terrain-0a1b2c3d4e5f.png`.",
    "- A piece that is the exact mirror of one you have can be listed under `reflectedTiles` in the manifest, as the two Textile House pieces are.",
    "- New keys go in `upgrades/manifest.json`. `upgrades/slums/manifest.json` is the bundled Slums pack; the main manifest takes precedence over it.", "",
    "## What not to do", "",
    "- Do not draw anything under \"Not established\". Those are not confirmed to appear. They move into the list, or out of it for good, as each is settled.",
    "- Do not add keys for the tiles under \"Stored tiles no map can show\".",
    "- Do not add keys three lower for New Phlan on 1.3 (`ae66` for `ae69`): see the note at the top of `docs/ART-INVENTORY.md`.",
    "- Do not edit `qa/art-worklist.json`, `qa/art-worklist-cells.json` or this file by hand.", "",
    "## If the worklist is wrong", "",
    `If an item cannot occur in play, or art of yours exists under a key the tool does not account for, record it in \`${NOTES}\``,
    "(one line: the key, what you saw, where) and commit it. Whoever maintains `tools/art-worklist.ts` reads that file and fixes the tool.",
    "The table below says, for each area, how many of your existing keys the tool accounts for. An area where it cannot account for all of them is not listed for work,",
    "and its unaccounted keys are in `qa/art-worklist.json` under `areas[].unaccountedKeys`.", "",
    "## Totals", "", "| What | Count |", "| --- | ---: |");
  for (const [what, count] of Object.entries(list.totals)) add(`| ${what} | ${count} |`);
  add("", "## Where each area stands", "",
    "| Area | Name | Reading confirmed | Cells its views can show | With art | To do | Your keys accounted for |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: |");
  for (const area of list.areas) {
    const extra = [
      area.existingKeysOnlyAsArrivalViews && `${area.existingKeysOnlyAsArrivalViews} as first views of the next area`,
      area.existingKeysOnlyAsWallMaterials && `${area.existingKeysOnlyAsWallMaterials} as WebGL wall materials`,
      area.existingKeysOnlyInUnreachableViews && `${area.existingKeysOnlyInUnreachableViews} only in unreachable views`,
    ].filter(Boolean).join(", ");
    add(`| ${area.area} | ${area.name} | ${area.established ? "yes" : "not yet"} | ${area.cellsTheViewsCanShow} | ${area.cellsWithArt} | ${area.established ? area.toDo : ""} | ${area.existingKeysAccountedFor} of ${area.existingKeys}${extra ? ` (${extra})` : ""} |`);
  }
  add("", "\"Cells its views can show\" counts every cell from every square of the map under every sky the script can set, including squares whose reachability is still unverified.",
    "A cell is listed to do only when it shows from a square connected to squares your existing art already covers, under a sky and ground colour your existing art of the area shows.", "",
    "How a cell is keyed: the view is 11 by 11 cells. Rows 0 to 4 are sky, row 5 holds the horizon, rows 6 to 10 are ground. The game stamps wall pieces over that, far ones first, and colour 13 of a tile lets what is behind show.",
    "So a cell is one stored tile, one tile over the sky or ground colour, or several tiles over each other; each distinct result is one key.", "",
    "## To do: first-person cells", "");
  if (!cellItems.length) add("Nothing is listed.", "");
  for (const area of [...new Set(cellItems.map((item) => item.area!))]) {
    const mine = cellItems.filter((item) => item.area === area);
    const report = list.areas.find((known) => known.area === area)!;
    add(`### Area ${area}: ${mine[0]!.areaName} (${mine.length})`, "", `Map ${report.maps.join(", ")}; ${report.wallSets.join("; ")}.`, "");
    for (const group of [...new Set(mine.map((item) => item.group))]) {
      const members = mine.filter((item) => item.group === group);
      add(`#### ${group} (${members.length})`, "", "| Key (PNG 32x32) | What it is | See it at | Same pixels as |", "| --- | --- | --- | --- |");
      for (const item of members) {
        const { map, x, y, facing, column, row } = item.seenAt!;
        add(`| \`${item.key}\` | ${describeSignature(item.composition)} | map ${map}, square (${x},${y}) facing ${facing}, column ${column} row ${row} | ${item.sameAs ? `\`${item.sameAs}\` (area ${item.drawnIn.join(", ")})` : ""} |`);
      }
      add("");
    }
  }
  add("## To do: battlefield cells", "",
    "The battlefield is drawn from 24 by 24 pictures, each nine cells. Combat copies DUNGCOM or WILDCOM into the shared terrain sheet, then copies RANDCOM into slots 34–39.",
    "Outdoor setup replaces all 40 BACPAC slots. Indoor setup leaves slots 25–33 holding BACPAC, but no indoor fight can name those slots (struck off under Not established).", "",
    "| Archive | What it is | Pictures | Distinct cells | With art | To do | Not established |", "| --- | --- | ---: | ---: | ---: | ---: | ---: |");
  for (const report of list.battlefield) add(`| ${report.archive} | ${report.what} | ${report.frames} | ${report.distinctCells} | ${report.withArt} | ${report.toDo} | ${report.notEstablished} |`);
  add("");
  if (battleItems.length) {
    add("| Key (PNG 32x32) | What it is |", "| --- | --- |");
    for (const item of battleItems) add(`| \`${item.key}\` | ${item.description} |`);
    add("");
  }
  add("## Not established", "", "Do not start on these. Each is something the tool could not confirm can appear, with the reason. None is in the count above and none is dropped.", "",
    "| What | Count |", "| --- | ---: |");
  for (const [what, count] of Object.entries(list.notEstablished)) add(`| ${what} | ${count} |`);
  const struck = list.areas.flatMap((area) => Object.entries(area.struckOff ?? {}).map(([reason, count]) => ({ area, reason, count })));
  if (struck.length) {
    add("", `Struck off, not held: ${struck.reduce((sum, { count }) => sum + count, 0)} cells the tool once tried under a sky or ground the area's script shows cannot occur there (\`${OBSERVED}\`):`, "");
    for (const { area, reason, count } of struck) add(`- Area ${area.area} (${area.name}), ${count} cells: ${reason}`);
  }
  if (list.battlefieldStruckOff?.cells) add("", `Struck off, not held: ${list.battlefieldStruckOff.cells} ${list.battlefieldStruckOff.reason}.`);
  add("", "Areas not confirmed, and why:", "");
  for (const area of list.areas) if (!area.established) add(`- Area ${area.area} (${area.name}): ${area.why}.`);
  add("", "### Other pictures no key names", "",
    "Every picture frame of the 1.3 files outside the tile sets and the battlefield that no artwork key names. Whether the game shows each has to be seen in play before art is commissioned",
    "(`docs/ART-INVENTORY.md` says the same of secondary members), so none is counted as to do.", "",
    "| Frame (archive:block:member:frame) | Size | What it is | Key form and PNG size | What is known |", "| --- | --- | --- | --- | --- |");
  for (const picture of list.otherPicturesNoKeyNames) add(`| ${picture.frame} | ${picture.width}x${picture.height} | ${picture.what} | \`${picture.keyForm}\` ${picture.pngSize} | ${picture.evidence} |`);
  if (list.endingFramesCoveredByIllustrations.length) add("", "### Ending frames covered by Enhanced illustrations", "",
    "The paired GOG 1.3 Chrome replays verified the illustrated ending and council reward. These archive records remain inventoried for Classic and are covered as a sequence in Enhanced.", "",
    ...list.endingFramesCoveredByIllustrations.map(({ frame }) => `- \`${frame}\``));
  add("", "### Blank approach sprite frames", "",
    "The native approach blitter skips palette index 0. Every pixel in each of these frames has that index, so the frame draws no actor and needs no art.", "",
    ...list.blankApproachSprites.map(frame => `- \`${frame}\``));
  add("", "## Stored tiles no map can show", "",
    "These tiles are in the 8 by 8 tile sets and no first-person view of any map can put them on screen, for the reason given. They need no art. Do not add keys for them.",
    "The proof is by trying: the tool draws the view from every square of every map, facing each way, with the wall sets each script loads beside that map, and these tiles are in none of those views.",
    "It holds as far as the tool's reading of each area holds: for the areas marked \"not yet\" above (Valjevo's areas 3, 5 and 7 above all) a tile of their sets listed here may yet turn out to be shown.", "",
    "| Tile set | Tiles | Why no view shows them |", "| --- | --- | --- |");
  for (const { block, reason, tiles } of list.storedTilesNoMapShows) add(`| ${block} | ${tiles.join(", ")} | ${reason} |`);
  add("", "## Narrated passages with nothing to see", "",
    "Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.", "");
  return lines.join("\n");
}

function sheets(directory: string, list: Worklist, cells: Cells, original: Originals): void {
  mkdirSync(join(directory, "cells"), { recursive: true });
  const rows: string[] = [];
  let heading = "";
  const picture = (name: string, pixels: Uint8Array, width: number, height: number) => {
    const frame = new Frame(width, height);
    frame.pixels.set(pixels.map((pixel) => pixel & 15));
    writeFileSync(join(directory, "cells", `${name}.png`), encodePng(frame));
  };
  for (const item of list.items) {
    const hash = item.key.split(":").at(-1)!;
    if (item.kind === "first-person cell") picture(hash, cells.render(item.composition), 8, 8);
    else {
      const [file, block, member, index, cell] = item.composition.split(":");
      const frame = original.frames.get(`${file}:${block}:${member}:${index}`);
      if (!frame) continue;
      picture(hash, cellsOf(frame)[Number(cell!.slice(4))]!, 8, 8);
    }
    const title = item.kind === "first-person cell" ? `Area ${item.area}: ${item.areaName}, ${item.group}` : item.group;
    if (title !== heading) { heading = title; rows.push(`<h2>${title}</h2>`); }
    const where = item.seenAt ? `<br>map ${item.seenAt.map} (${item.seenAt.x},${item.seenAt.y}) ${item.seenAt.facing}, column ${item.seenAt.column} row ${item.seenAt.row}` : "";
    rows.push(`<figure><img src="cells/${hash}.png" width="128" height="128"><figcaption><code>${item.key}</code><br>${item.kind === "first-person cell" ? describeSignature(item.composition) : item.description}${where}${item.sameAs ? `<br>same pixels as ${item.sameAs}` : ""}</figcaption></figure>`);
  }
  rows.push("<h2>Other pictures no key names (not established: see docs/ART-WORKLIST.md)</h2>");
  for (const other of list.otherPicturesNoKeyNames) {
    const frame = original.frames.get(other.frame);
    if (!frame) continue;
    const name = other.frame.replace(/[:.]/g, "-");
    picture(name, frame.pixels, frame.width, frame.height);
    rows.push(`<figure><img src="cells/${name}.png" width="${frame.width * 3}" height="${frame.height * 3}"><figcaption>${other.frame}<br><code>${other.keyForm}</code> ${other.pngSize}</figcaption></figure>`);
  }
  writeFileSync(join(directory, "index.html"), `<!doctype html><meta charset="utf-8"><title>Artwork worklist: originals to redraw</title>
<style>body{font:13px sans-serif;background:#222;color:#ddd}img{image-rendering:pixelated;border:1px solid #555}figure{display:inline-block;width:300px;vertical-align:top;margin:8px}code{font-size:10px;word-break:break-all}</style>
<h1>Originals still to redraw (${list.items.length})</h1><p>Made from the player's own 1.3 files. Keep outside version control. Colour 13 (magenta) in a single stored tile is transparent in play.</p>
${rows.join("\n")}
`);
  console.log(`wrote ${list.items.length} reference cells to ${join(directory, "index.html")}`);
}

function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes("--check"), verify = args.includes("--verify");
  const sheetIndex = args.indexOf("--sheets");
  const started = Date.now();
  const read = (path: string) => new Uint8Array(readFileSync(at("game", path)));
  const data = readGameData(read);
  const world = readWorld(data, read);
  const original = originals(process.env.POR_GAMEDATA);
  const cache = existsSync(at(CELLS)) ? JSON.parse(readFileSync(at(CELLS), "utf8")) as { cells: Record<string, string>; battlefield?: Record<string, string[]> } : { cells: {} };
  const cells = new Cells(world, original?.tiles, cache.cells);
  const art = readArt();
  const first = firstPerson(world, art, cells);
  const battle = battlefield(data, art, original, cache.battlefield ?? {});
  const items = [...first.items, ...battle.items];
  const committed = existsSync(at(WORKLIST)) ? JSON.parse(readFileSync(at(WORKLIST), "utf8")) as Worklist : undefined;
  // The catalogue takes several seconds and changes nothing that is counted, so the quick modes reuse the committed list.
  const others = verify || check ? { pictures: [...(committed?.otherPicturesNoKeyNames ?? []), ...(committed?.endingFramesCoveredByIllustrations ?? [])] } : otherPictures(data, read);
  const blankSprites = new Set(blankApproachSprites(data.pictures));
  const endingKeys = [
    "scene-illustration:area:7:ecl:a82d:cue:possession-threat",
    "scene-illustration:area:7:ecl:a82d:cue:pool-recall",
    "scene-illustration:area:7:ecl:995f:caller:a8b2",
    "scene-illustration:area:7:ecl:9b18:cue:phlan-homecoming",
    "portrait:area:8:ecl:9f21:caller:9a4a:HEAD3.DAX:24:BODY3.DAX:32",
    "scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-award",
    "scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-payout",
  ];
  const endingCovered = endingKeys.every((key) => !missing(art, key, 352, 352));
  const endingFramesCoveredByIllustrations = endingCovered ? others.pictures.filter(({ frame }) => frame.startsWith("FINAL5.DAX:")) : [];
  const otherPicturesNoKeyNames = others.pictures.filter((picture) => !blankSprites.has(picture.frame) && !endingFramesCoveredByIllustrations.includes(picture));

  const notEstablished: Record<string, number | string> = {};
  for (const report of first.reports) for (const [reason, count] of Object.entries(report.notEstablished)) notEstablished[`first-person ${reason}`] = Number(notEstablished[`first-person ${reason}`] ?? 0) + count;
  notEstablished["first views of an area, drawn under the number of the area just left: the tool accounts for existing keys of this kind but cannot say which square and facing each arrival shows"] = "not counted";
  notEstablished["distinct battlefield cells of pictures no artwork shows to have been on a battlefield"] = battle.unconfirmedCells;
  notEstablished["battlefield cells that are not one stored cell (terrain drawn clipped or over other terrain)"] = "not counted: needs the game's battlefield builder read";
  notEstablished["other picture frames no key names (listed below)"] = otherPicturesNoKeyNames.length;
  if ("error" in others && others.error) notEstablished["other picture frames: " + others.error] = "?";
  notEstablished["screen frame, text window borders and other symbols drawn outside the first-person view: no artwork key form exists for them"] = "not counted";
  notEstablished["narrated passages that describe something to see and have no artwork"] = "will come from npm run qa:narration";

  const cellItems = first.items;
  const totals: Record<string, number | string> = {
    "Remaining, all kinds": items.length,
    "First-person cells to do": cellItems.length,
    "  of which one stored tile": cellItems.filter((item) => item.what === "one stored tile").length,
    "  of which one tile over a solid colour": cellItems.filter((item) => item.what === "one tile over a solid colour").length,
    "  of which plain sky or ground": cellItems.filter((item) => item.what === "plain backdrop").length,
    "  of which several tiles together": cellItems.filter((item) => item.what === "several tiles together").length,
    "  of which the same pixels already have art of yours in another area": cellItems.filter((item) => item.sameAs).length,
    "Distinct shapes among the first-person cells (the same tiles, whatever sky or ground is behind them)": new Set(cellItems.map((item) => `${item.area}:${item.shape}`)).size,
    "  of which the area already has your art for that shape over another sky or ground": new Set(cellItems.filter((item) => item.sameShapeAs).map((item) => `${item.area}:${item.shape}`)).size,
    "Battlefield cells to do": battle.items.length,
    "Tile keys in the manifests": first.reports.reduce((sum, report) => sum + report.existingKeys, 0),
    "  accounted for by the tool": first.reports.reduce((sum, report) => sum + report.existingKeysAccountedFor, 0),
    "Battlefield keys in the manifests": battle.keys,
    "  that are one stored cell of a battlefield picture": battle.keysThatAreAStoredCell,
    "Stored 8 by 8 tiles": first.stored.tiles,
    "  blank": first.stored.blank,
    "  distinct pictures among the rest": first.stored.distinctPictures,
    "  with art in some area, alone or over a solid colour": first.stored.withArtInSomeArea,
    "  without (the catalogue's 720 when it was written)": first.stored.withoutArt,
    "    of those, no map can show": first.stored.withoutArtNoMapShows,
    "    of those, shown only together with other tiles, never alone": first.stored.withoutArtShownOnlyWithOthers,
    "    of those, shown alone in some area": first.stored.withoutArtShownAlone,
  };
  const list: Worklist = {
    schema: 2,
    about: "Written by npm run art:worklist. Do not edit by hand. See docs/ART-WORKLIST.md.",
    done: "The confirmed worklist is clear when npm run verify:art-worklist reports 0 remaining and no invalid tile artwork. The artwork is done when, as well, nothing is left under notEstablished.",
    remaining: items.length, totals, notEstablished, areas: first.reports, battlefield: battle.reports,
    battlefieldStruckOff: { cells: battle.struckIndoorCells, reason: "distinct BACPAC cells of slots 25–33 that no battlefield draws. Outdoor setup replaces all 40 slots. "
      + "Indoors every battlefield draw (overlay 0x1f at 0206, 067d, 06de and 0966) takes its slot from the kind table at DS:2747, and the indoor builder "
      + "(overlay 0x0a at 0810, through 0221 and 0000) and combat's later writes store only kinds 1–31, which name slots 0–24 and 34–39. "
      + "Slots 25–33 are kinds 0x39–0x41, written only by the outdoor builder at 11b4 after it has loaded WILDCOM over them. "
      + "17 Slums fights traced with POR_TRACE_BATTLE_DRAW=1 and the Bane, Valjevo and wyvern traces in docs/ART-INVENTORY.md drew no slot from 25 to 33" },
    storedTilesNoMapShows: first.never, otherPicturesNoKeyNames, endingFramesCoveredByIllustrations, blankApproachSprites: [...blankSprites], backdrops: first.backdrops, items,
  };
  const json = JSON.stringify(list, null, 1) + "\n", text = document(list);
  const line = (record: Record<string, unknown>) => Object.entries(record).sort(([a], [b]) => a < b ? -1 : 1).map(([key, value]) => `${JSON.stringify(key)}:${JSON.stringify(value)}`).join(",\n");
  const cellsJson = `{"about":"SHA-256 of first-person screen cells made of several tiles, by how each is made, and of the nine cells of each SQRPACI and BACPAC picture. Derived from the 1.3 files by npm run art:worklist with POR_GAMEDATA set. Hashes only.",\n"cells":{\n${line(Object.fromEntries(cells.composed))}\n},\n"battlefield":{\n${line(battle.derived)}\n}}\n`;

  if (verify || check) {
    const groups = new Map<string, number>();
    for (const item of items) {
      const group = item.kind === "first-person cell" ? `area ${String(item.area).padStart(2)} ${item.areaName}: ${item.group}` : item.group;
      groups.set(group, (groups.get(group) ?? 0) + 1);
    }
    console.log("remaining  group");
    for (const [group, count] of groups) console.log(`${String(count).padStart(9)}  ${group}`);
  }
  if (check) {
    // Art added since the files were written does not make them stale; a changed analysis does.
    const problems: string[] = [];
    if (!committed) problems.push(`${WORKLIST} is missing`);
    else {
      const now = new Set(items.map((item) => item.key));
      const before = new Set(committed.items.map((item) => item.key));
      for (const key of now) if (!before.has(key)) problems.push(`${key} is needed and is not in ${WORKLIST}`);
      for (const item of committed.items) if (!now.has(item.key) && missing(art, item.key, item.width, item.height)) problems.push(`${item.key} is in ${WORKLIST}, has no art, and the tool no longer lists it`);
    }
    if (!existsSync(at(DOCUMENT))) problems.push(`${DOCUMENT} is missing`);
    if (original && (!existsSync(at(CELLS)) || readFileSync(at(CELLS), "utf8") !== cellsJson)) problems.push(`${CELLS} differs from what the 1.3 files give`);
    if (cells.missingHashes) problems.push(`${cells.missingHashes} cells of several tiles have no hash in ${CELLS}`);
    if (problems.length) {
      console.error(`art:worklist: the committed worklist is stale (${problems.length} differences). The first:`);
      for (const problem of problems.slice(0, 10)) console.error(`  ${problem}`);
      console.error("Run npm run art:worklist (with POR_GAMEDATA set if it asks) and commit the result.");
      process.exit(1);
    }
    console.log(`art:worklist: the committed worklist is current. ${items.length} remaining (${Date.now() - started} ms).`);
    return;
  }
  if (verify) {
    // Each listed item was found without art just now; say so in the terms of the files, for the first few.
    for (const item of items.slice(0, 3)) console.log(`  for example ${item.key}: ${missing(art, item.key, item.width, item.height)}`);
    // Tile art already in a manifest must be there and 32 by 32 too (the artwork agent's check, kept).
    const invalidTiles = [...art.keys()].filter((key) => /^(tile|battle-tile):/.test(key)).flatMap((key) => {
      const issue = missing(art, key, 32, 32);
      return issue ? [`${key}: ${issue}`] : [];
    });
    console.log(`\nverify:art-worklist: ${items.length} confirmed cells remaining (${Date.now() - started} ms).`);
    if (invalidTiles.length) console.error(`Invalid tile artwork (first ${Math.min(invalidTiles.length, 10)} of ${invalidTiles.length}):\n${invalidTiles.slice(0, 10).join("\n")}`);
    const pending = Object.entries(notEstablished).filter(([, count]) => typeof count === "number" && count > 0);
    if (pending.length) console.log(`Not counted, not established (see ${DOCUMENT}): ${pending.map(([what, count]) => `${count} ${what}`).join("; ")}`);
    process.exit(items.length || invalidTiles.length ? 1 : 0);
  }
  if (args.includes("--held")) {
    // Not committed: out/ is the scratch directory. One row per held cell and backdrop, with a square and facing that shows it.
    mkdirSync(at("out"), { recursive: true });
    writeFileSync(at("out", "art-worklist-held.json"), JSON.stringify(first.held, null, 1) + "\n");
    console.log(`wrote out/art-worklist-held.json: ${first.held.length} rows for ${new Set(first.held.map((row) => row.key)).size} held cells`);
    return;
  }
  writeFileSync(at(WORKLIST), json);
  writeFileSync(at(DOCUMENT), text);
  if (original) writeFileSync(at(CELLS), cellsJson);
  console.log(`wrote ${WORKLIST} and ${DOCUMENT}: ${items.length} remaining${original ? `; ${CELLS}: ${cells.composed.size} cell hashes` : ""} (${Date.now() - started} ms)`);
  if (cells.missingHashes) console.log(`${cells.missingHashes} cells of several tiles have no hash in ${CELLS}: set POR_GAMEDATA to the 1.3 files and run again`);
  if (sheetIndex >= 0) {
    if (!original) { console.error("--sheets needs the player's own 1.3 files: set POR_GAMEDATA to their directory"); process.exit(1); }
    const next = args[sheetIndex + 1];
    sheets(next && !next.startsWith("--") ? resolve(next) : at("out", "art-worklist"), list, cells, original);
  }
}

main();
