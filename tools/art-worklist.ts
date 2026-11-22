/**
 * The artwork worklist: what Enhanced art is still to be drawn, and where it stands.
 *
 *   npm run art:worklist                      regenerate qa/art-worklist.json and docs/ART-WORKLIST.md
 *   npm run art:worklist -- --check           fail if the committed files are stale
 *   npm run art:worklist -- --sheets [dir]    also write reference sheets of the originals (default out/art-worklist/)
 *   npm run verify:art-worklist               check every item against the manifests and PNGs; print what remains
 *
 * It reads `game/` (no original file) and the two artwork manifests, fresh on every run. The
 * first-person view is worked out by tools/first-person-cells.ts. A screen cell whose pixels are
 * several tiles over each other can only be hashed from the pixels, so those hashes are kept in
 * qa/art-worklist-cells.json: with the player's own 1.3 files (POR_GAMEDATA) the tool recomputes
 * and rewrites that file; without them it uses it as committed. The sheets always need the 1.3 files.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, isPicture } from "../src/lib/picture.js";
import { readGameData } from "../src/runtime/game-data.js";
import {
  areaViewCells, covered, HORIZON, reachable, readWorld, sha256, TRANSPARENT, viewCells,
  type AreaScript, type TileName, type ViewContext, type WallSlots, type WorldData,
} from "./first-person-cells.js";
import { encodePng, pngDimensions } from "./png.js";

const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const at = (...parts: string[]) => join(repository, ...parts);
const MANIFESTS = ["upgrades/manifest.json", "upgrades/slums/manifest.json"] as const;
const WORKLIST = "qa/art-worklist.json", DOCUMENT = "docs/ART-WORKLIST.md", CELLS = "qa/art-worklist-cells.json";

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

interface Art { file: string; manifest: string; size?: { width: number; height: number } }
function readArt(): Map<string, Art> {
  const art = new Map<string, Art>();
  // The Slums pack is read first and the main manifest takes precedence, as tools/upgrade-art.ts loads them.
  for (const manifest of [MANIFESTS[1], MANIFESTS[0]]) {
    const assets = (JSON.parse(readFileSync(at(manifest), "utf8")) as { assets: Record<string, string> }).assets;
    for (const [key, file] of Object.entries(assets)) art.set(key, { file, manifest });
  }
  return art;
}
function artSize(art: Art): { width: number; height: number } | undefined {
  if (art.size) return art.size;
  try { art.size = pngDimensions(readFileSync(at(dirname(art.manifest), art.file))) ?? undefined; } catch { art.size = undefined; }
  return art.size;
}
/** Why a key is not done, or undefined when its art is in a manifest, on disk and the required size. */
function missing(art: Map<string, Art>, key: string, width: number, height: number): string | undefined {
  const entry = art.get(key);
  if (!entry) return "no key in a manifest";
  const size = artSize(entry);
  if (!size) return `${entry.file} is missing or not a readable PNG`;
  if (size.width !== width || size.height !== height) return `${entry.file} is ${size.width}x${size.height}, not ${width}x${height}`;
}

// ---------------------------------------------------------------------------------------------
// Original pixels, when the player's 1.3 files are at hand.

function originalTiles(directory: string | undefined): Map<TileName, Uint8Array> | undefined {
  if (!directory || !existsSync(directory)) return;
  const tiles = new Map<TileName, Uint8Array>();
  for (const file of readdirSync(directory)) {
    if (!/^8X8D\d\.DAX$/i.test(file)) continue;
    for (const { id, data } of parseDax(file, new Uint8Array(readFileSync(join(directory, file)))).entries) {
      if (!isPicture(data)) continue;
      const picture = decodePicture(data);
      if (picture.width !== 8 || picture.height !== 8) continue;
      for (let index = 0; index < picture.itemCount; index++) tiles.set(`${file.toUpperCase()}:${id}:${index}`, frameSlice(picture, index));
    }
  }
  return tiles.size ? tiles : undefined;
}

// ---------------------------------------------------------------------------------------------
// Screen cells.

/** What is behind the tiles of a cell: sky rows, the horizon row, ground rows, or nothing that shows. */
type Backdrop = `s${number}` | `h${number}` | "g" | "-";
const backdropOf = (row: number, sky: number): Backdrop => row < 5 ? `s${sky}` : row === 5 ? `h${sky}` : "g";

function backdropPixels(backdrop: Backdrop): Uint8Array {
  const out = new Uint8Array(64);
  if (backdrop === "g") out.fill(HORIZON.ground);
  else if (backdrop[0] === "s") out.fill(Number(backdrop.slice(1)));
  else if (backdrop[0] === "h") {
    // Rows 40..47 of the view: three of sky, one line, two of band, two of ground (ovl29 0x0174).
    out.fill(Number(backdrop.slice(1)), 0, 24);
    out.fill(HORIZON.line, 24, 32);
    out.fill(HORIZON.band, 32, 48);
    out.fill(HORIZON.ground, 48, 64);
  }
  return out;
}

type CellKind = "one stored tile" | "one tile over a solid colour" | "plain backdrop" | "several tiles together";
interface Cell {
  /** Canonical description of how the cell is made: backdrop, then tiles bottom first. */
  signature: string;
  kind: CellKind;
  hash?: string;
}

class Cells {
  private readonly byName = new Map<string, { hash: string; overColour?: string[] }>();
  private readonly memo = new Map<string, Cell>();
  /** Hashes of cells made of several tiles, by signature. */
  readonly composed = new Map<string, string>();
  missingHashes = 0;
  constructor(private readonly world: WorldData, private readonly pixels: Map<TileName, Uint8Array> | undefined, cache: Record<string, string>) {
    const byHash = new Map(world.catalogue.tiles.map((tile) => [tile.hash, tile]));
    for (const [block, hashes] of world.tileBlocks) hashes.forEach((hash, index) => this.byName.set(`${block}:${index}`, byHash.get(hash) ?? { hash }));
    if (!pixels) for (const [signature, hash] of Object.entries(cache)) this.composed.set(signature, hash);
  }
  private opaque(tile: TileName): boolean { return !this.byName.get(tile)!.overColour; }
  /** A tile with no pixel that shows: over any colour it is that colour. */
  private invisible(tile: TileName): boolean {
    const over = this.byName.get(tile)!.overColour;
    return Boolean(over && over[0] === sha256(new Uint8Array(64)));
  }
  cell(row: number, sky: number, stack: readonly TileName[]): Cell {
    let tiles = stack.filter((tile) => !this.invisible(tile));
    let backdrop: Backdrop = backdropOf(row, sky);
    for (let index = tiles.length - 1; index >= 0; index--) {
      if (this.opaque(tiles[index]!)) { tiles = tiles.slice(index); backdrop = "-"; break; }
    }
    const signature = `${backdrop}|${tiles.join(",")}`;
    let cell = this.memo.get(signature);
    if (cell) return cell;
    const solid = backdrop === "g" ? HORIZON.ground : backdrop[0] === "s" ? Number(backdrop.slice(1)) : undefined;
    if (backdrop === "-" && tiles.length === 1) cell = { signature, kind: "one stored tile", hash: this.byName.get(tiles[0]!)!.hash };
    else if (solid !== undefined && tiles.length === 0) cell = { signature, kind: "plain backdrop", hash: sha256(new Uint8Array(64).fill(solid)) };
    else if (solid !== undefined && tiles.length === 1) cell = { signature, kind: "one tile over a solid colour", hash: this.byName.get(tiles[0]!)!.overColour![solid]! };
    else {
      let hash: string | undefined;
      if (this.pixels) { hash = sha256(this.render(signature)); this.composed.set(signature, hash); }
      else hash = this.composed.get(signature);
      if (!hash) this.missingHashes++;
      cell = { signature, kind: "several tiles together", hash };
    }
    this.memo.set(signature, cell);
    return cell;
  }
  /** The 64 pixels of a cell, from the original tiles. */
  render(signature: string): Uint8Array {
    const [backdrop, list] = signature.split("|") as [Backdrop, string];
    const out = backdropPixels(backdrop);
    for (const tile of list ? list.split(",") : []) {
      const pixels = this.pixels!.get(tile);
      if (!pixels) throw new Error(`${tile} is not in the 1.3 files given`);
      for (let i = 0; i < 64; i++) if (pixels[i] !== TRANSPARENT) out[i] = pixels[i]!;
    }
    return out;
  }
}

// ---------------------------------------------------------------------------------------------
// The worklist.

interface Item {
  kind: "first-person cell";
  /** The key to add to upgrades/manifest.json. */
  key: string;
  width: 32;
  height: 32;
  area: number;
  areaName: string;
  group: string;
  cellKind: CellKind;
  /** How the cell is made: the backdrop, then the stored tiles bottom first. */
  composition: string;
  description: string;
  /** One place to see it: map block, square, facing, and the cell's column and row in the 11 by 11 view. */
  seenAt: { map: number; x: number; y: number; facing: string; column: number; row: number };
  views: number;
  /** Areas where the same pixels already have artwork. */
  drawnIn: number[];
  why: string;
}

interface Context { label: number; script: AreaScript; map: number; slots: WallSlots }
interface AreaReport {
  area: number;
  name: string;
  established: boolean;
  why: string;
  maps: number[];
  wallSets: string[];
  existingKeys: number;
  existingKeysTheModelDraws: number;
  cellsTheModelDraws: number;
  cellsWithArt: number;
  toDo: number;
  notEstablished: Record<string, number>;
}

const FACING: Record<number, string> = { 0: "north", 2: "east", 4: "south", 6: "west" };

function describeSignature(signature: string): string {
  const [backdrop, list] = signature.split("|") as [Backdrop, string];
  const tiles = (list ? list.split(",") : []).map((tile) => tile.replace(".DAX", "").replace(/:(\d+):(\d+)$/, " block $1 tile $2"));
  const behind = backdrop === "-" ? "" : backdrop === "g" ? "the ground colour 6" : backdrop[0] === "s" ? `sky colour ${backdrop.slice(1)}`
    : `the horizon row (sky colour ${backdrop.slice(1)}, a line of 15, a band of 7, ground 6)`;
  if (!tiles.length) return behind;
  return [...tiles.reverse(), ...(behind ? [behind] : [])].join(" over ");
}

function build(world: WorldData, art: Map<string, Art>, cells: Cells) {
  // Existing tile keys by area.
  const existing = new Map<number, Set<string>>();
  for (const key of art.keys()) {
    const tile = /^tile:(\d{1,3}):([a-f0-9]{64})$/.exec(key);
    if (tile) existing.set(Number(tile[1]), (existing.get(Number(tile[1])) ?? new Set<string>()).add(tile[2]!));
  }
  const drawnIn = new Map<string, number[]>();
  for (const [area, hashes] of existing) for (const hash of hashes) drawnIn.set(hash, [...(drawnIn.get(hash) ?? []), area].sort((a, b) => a - b));

  // A context is one script with one of its maps and one of its wall loads. Its keys carry the
  // script's area number; a map whose block number is no script's area is tried under its own number too.
  const scriptAreas = new Set(world.scripts.map((script) => script.area));
  const contexts: Context[] = [];
  for (const script of world.scripts) {
    for (const { block } of script.maps) {
      for (const slots of script.wallSlots) {
        if (block === script.area || scriptAreas.has(block)) { if (block === script.area) contexts.push({ label: script.area, script, map: block, slots }); }
        else contexts.push({ label: block, script, map: block, slots }, { label: script.area, script, map: block, slots });
      }
    }
  }

  interface Seen { cell: Cell; views: number; first: Item["seenAt"]; sky?: number; positions: Set<number>; context: Context; areaView: boolean }
  const items: Item[] = [];
  const reports: AreaReport[] = [];
  const labels = [...new Set([...contexts.map((context) => context.label), ...existing.keys()])].sort((a, b) => a - b);
  for (const label of labels) {
    const mine = contexts.filter((context) => context.label === label);
    const have = existing.get(label) ?? new Set<string>();
    const report: AreaReport = {
      area: label, name: names[label] ?? `area ${label}`, established: false, why: "", maps: [...new Set(mine.map((context) => context.map))],
      wallSets: [...new Set(mine.map((context) => `WALLDEF${context.script.archive} ${context.slots.slots.slice(1).map((slot) => slot ? `${slot.wallBlock}${slot.set ? `.${slot.set + 1}` : ""}` : "-").join("/")}`))],
      existingKeys: have.size, existingKeysTheModelDraws: 0, cellsTheModelDraws: 0, cellsWithArt: 0, toDo: 0, notEstablished: {},
    };
    reports.push(report);
    if (!mine.length) { report.why = "no script and map were found that draw under this area number"; continue; }

    // Every cell every view of every context can show, by hash, with where and under which sky.
    const seen = new Map<string, Seen[]>();
    const fullyDrawn = new Map<Context, Set<number>>();
    let unhashed = 0;
    for (const context of mine) {
      const map = world.maps.get(`${context.script.archive}:${context.map}`)!;
      const view: ViewContext = { world, script: context.script, map, slots: context.slots };
      const complete = new Set<number>();
      fullyDrawn.set(context, complete);
      for (let y = 0; y < 16; y++) {
        for (let x = 0; x < 16; x++) {
          for (const facing of [0, 2, 4, 6]) {
            const skies = covered(map, x, y) ? context.script.sky.covered : context.script.sky.open;
            const stacks = viewCells(view, x, y, facing);
            for (const sky of skies) {
              let withArt = 0;
              const walls = stacks.some((stack) => stack.length > 0);
              stacks.forEach((stack, index) => {
                const cell = cells.cell(Math.floor(index / 11), sky, stack);
                if (!cell.hash) { unhashed++; return; }
                if (have.has(cell.hash)) withArt++;
                const list = seen.get(cell.hash) ?? [];
                seen.set(cell.hash, list);
                let entry = list.find((known) => known.context === context && known.sky === (cell.signature.startsWith("-") || cell.signature.startsWith("g") ? undefined : sky) && !known.areaView);
                if (!entry) {
                  entry = { cell, views: 0, first: { map: context.map, x, y, facing: FACING[facing]!, column: index % 11, row: Math.floor(index / 11) },
                    sky: cell.signature.startsWith("-") || cell.signature.startsWith("g") ? undefined : sky, positions: new Set(), context, areaView: false };
                  list.push(entry);
                }
                entry.views++;
                entry.positions.add(y * 16 + x);
              });
              // A square where some view is wholly covered by existing art was stood on when that art was made.
              // A view of bare sky and ground says nothing about where it was seen, so it does not count.
              if (withArt === 121 && walls) complete.add(y * 16 + x);
            }
            if (context.script.areaView) {
              areaViewCells(view, x, y, facing).forEach((stack, index) => {
                const cell = cells.cell(0, 0, stack);
                if (!cell.hash) return;
                const list = seen.get(cell.hash) ?? [];
                seen.set(cell.hash, list);
                let entry = list.find((known) => known.context === context && known.areaView);
                if (!entry) {
                  entry = { cell, views: 0, first: { map: context.map, x, y, facing: FACING[facing]!, column: index % 11, row: Math.floor(index / 11) }, positions: new Set(), context, areaView: true };
                  list.push(entry);
                }
                entry.views++;
                entry.positions.add(y * 16 + x);
              });
            }
          }
        }
      }
    }
    report.cellsTheModelDraws = seen.size;
    for (const hash of have) if (seen.has(hash)) report.existingKeysTheModelDraws++;
    for (const hash of seen.keys()) if (have.has(hash)) report.cellsWithArt++;

    // The reading of this area is established when it draws every cell the area already has art for.
    const note = (reason: string, count = 1) => { report.notEstablished[reason] = (report.notEstablished[reason] ?? 0) + count; };
    if (unhashed) note("cells of several tiles whose hash is not in qa/art-worklist-cells.json (run with POR_GAMEDATA)", unhashed);
    if (mine.length > 1) report.why = `this area number covers ${mine.length} combinations of map and wall sets (${report.maps.map((map) => `map ${map}`).join(", ")}; ${report.wallSets.join(", ")}), and which of them the game shows is still being worked out`;
    else if (have.size < 30) report.why = `only ${have.size} cells of this area have artwork so far, too few to confirm the reading of its maps and wall sets against`;
    else if (report.existingKeysTheModelDraws < have.size) report.why = `${have.size - report.existingKeysTheModelDraws} of the ${have.size} cells that have artwork are not among the cells the tool works out for this area, so its reading of this area is not complete`;
    else { report.established = true; report.why = `all ${have.size} cells that have artwork are among the cells the tool works out`; }

    // Skies and squares that existing artwork confirms.
    const confirmedSkies = new Set<number>();
    for (const [hash, list] of seen) if (have.has(hash)) for (const entry of list) if (entry.sky !== undefined && list.every((other) => other.sky === entry.sky)) confirmedSkies.add(entry.sky);
    const walkable = new Map<Context, Set<number>>();
    for (const context of mine) {
      const map = world.maps.get(`${context.script.archive}:${context.map}`)!;
      walkable.set(context, reachable(map, [...fullyDrawn.get(context)!], context.script.area));
    }

    for (const [hash, list] of seen) {
      if (have.has(hash)) continue;
      const key = `tile:${label}:${hash}`;
      // Certain only when: the area's reading is established; the cell shows from a square connected to
      // squares the existing artwork was made from; and, if the sky shows in it, that sky colour is one the existing artwork has.
      const certain = list.filter((entry) => !entry.areaView && [...entry.positions].some((square) => walkable.get(entry.context)!.has(square)) &&
        (entry.sky === undefined || confirmedSkies.has(entry.sky)));
      const entry = certain[0] ?? list[0]!;
      const cellKind = entry.cell.kind;
      if (!report.established) { note("cells of an area whose reading is not confirmed"); continue; }
      if (!certain.length) {
        if (list.every((known) => known.areaView)) note("cells of the overhead area view");
        else if (list.every((known) => known.sky !== undefined && !confirmedSkies.has(known.sky))) note("cells that show a sky colour no existing artwork of the area shows");
        else note("cells seen only from squares not connected to any square the existing artwork was made from");
        continue;
      }
      if (cellKind === "several tiles together") { note("cells made of several tiles together"); continue; }
      const slot = entry.context.slots.slots.findIndex((loaded, index) => index > 0 && loaded && entry.cell.signature.includes(`8X8D${entry.context.script.archive}.DAX:${loaded.tileBlock}:`));
      const group = cellKind === "plain backdrop" ? "plain sky and ground"
        : slot > 0 ? `tile set 8X8D${entry.context.script.archive} block ${entry.context.slots.slots[slot]!.tileBlock}` : "shared tile set 8X8D1 block 203";
      const views = certain.reduce((sum, known) => sum + known.views, 0);
      items.push({
        kind: "first-person cell", key, width: 32, height: 32, area: label, areaName: report.name, group, cellKind,
        composition: entry.cell.signature, description: `${describeSignature(entry.cell.signature)}, shown in area ${label} (${report.name})`,
        seenAt: entry.first, views, drawnIn: drawnIn.get(hash) ?? [],
        why: `drawn in ${views} views of map ${entry.context.map} from squares connected to ones the existing artwork covers`,
      });
      report.toDo++;
    }
  }
  items.sort((a, b) => a.area - b.area || a.group.localeCompare(b.group) || a.key.localeCompare(b.key));
  return { items, reports };
}

// ---------------------------------------------------------------------------------------------
// Output.

interface Worklist {
  schema: 1;
  about: string;
  done: string;
  remaining: number;
  stillBeingWorkedOut: Record<string, number | string>;
  areas: AreaReport[];
  items: Item[];
}

function stillBeingWorkedOut(reports: AreaReport[]): Record<string, number | string> {
  const totals: Record<string, number> = {};
  for (const report of reports) for (const [reason, count] of Object.entries(report.notEstablished)) totals[`first-person ${reason}`] = (totals[`first-person ${reason}`] ?? 0) + count;
  return {
    ...totals,
    "battlefield tiles (SQRPACI, DUNGCOM, WILDCOM, RANDCOM)": "not yet classified",
    "other picture frames no key names": "not yet classified: see `framesNoKeyNames` of npm run verify:art-catalogue",
    "narrated passages that describe something to see and have no artwork": "will come from npm run qa:narration, which another agent is building",
  };
}

function document(list: Worklist): string {
  const lines: string[] = [];
  const add = (...text: string[]) => lines.push(...text);
  add("# Artwork worklist", "",
    `**There are ${list.remaining} confirmed first-person cells awaiting art.** Run \`npm run verify:art-worklist\` to check this list. Open coverage questions are listed under “Still being worked out”.`, "",
    "This file is written by `npm run art:worklist`. Do not edit it or `qa/art-worklist.json` by hand: add art, run the tool, commit what it writes.", "",
    "To the artwork agent: this list exists to carry your work to 100%, not to correct it. The owner's words are that you have",
    "\"done an amazing job of keeping the art consistent in the VGA style, creating all new 32x32 tiles from 8x8 inspirations\".",
    "The shipped game will run with no original file, in Enhanced only, so every picture the game can show needs your art, down to each",
    "8 by 8 cell. Routes found most of them. This tool finds the rest from the game's own maps and wall definitions, so nothing waits to be stumbled on.", "",
    "## One item, step by step", "",
    "1. Pick an item below (or from `qa/art-worklist.json`). It gives the exact key and the PNG size.",
    "2. See what you are redrawing: `npm run art:worklist -- --sheets` writes `out/art-worklist/index.html`, each original cell enlarged and",
    "   labelled with its key, grouped as here. The sheets are made from the player's own 1.3 files: set `POR_GAMEDATA` to that directory.",
    "   `out/` is outside version control. Never commit original pixels.",
    "3. Draw it, 32 by 32, in the style of the pieces around it. `drawnIn` in the JSON (\"already drawn in area\" below) names areas where the very",
    "   same original pixels already have your art: start from that piece, or bind the same PNG if it suits the place.",
    "4. Save the PNG in `upgrades/` and add the key to `\"assets\"` in `upgrades/manifest.json`, exactly as given.",
    "5. Run `npm run verify:art-worklist`. The item is done when the key is in a manifest and its PNG is there and 32 by 32. Then check it in Chrome as you do now.",
    "6. Run `npm run art:worklist` and commit the regenerated files with your art.", "",
    "## Conventions: yours, unchanged", "",
    "- Keys are `tile:<area>:<sha256>`: the area number the game is in, and the SHA-256 of the cell's 64 original palette indices in row order (`upgrades/README.md`).",
    "- A key belongs to one area. The same pixels in another area need their own key there; that key may name the same PNG.",
    "- Each tile PNG is 32 by 32. File names are lower case letters, digits, `-` and `_`, ending `.png`; yours are a place and subject and the first 12 hex digits of the hash, such as `kobold-caves-terrain-0a1b2c3d4e5f.png`.",
    "- A piece that is the exact mirror of one you have can be listed under `reflectedTiles` in the manifest, as the two Textile House pieces are.",
    "- New keys go in `upgrades/manifest.json`. `upgrades/slums/manifest.json` is the bundled Slums pack; the main manifest takes precedence over it.", "",
    "## What not to do", "",
    "- Do not draw anything under \"Still being worked out\". Those are not confirmed to appear. They move into the list, or out of it for good, as the tool is finished.",
    "- Do not add keys for tiles this file says no map can show (that section arrives with the next version).",
    "- Do not add keys three lower for New Phlan on 1.3 (`ae66` for `ae69`): see the note at the top of `docs/ART-INVENTORY.md`.",
    "- Do not edit `qa/art-worklist.json`, `qa/art-worklist-cells.json` or this file by hand.", "",
    "## If the worklist is wrong", "",
    "If an item cannot occur in play, or art of yours exists under a key the tool does not list as needed or as done, record it in",
    "`qa/art-worklist-notes.md` (one line: the key, what you saw, where) and commit it. The tool's owner reads that file and fixes the tool.",
    "Each area below also says how many of your existing keys the tool can account for; an area where it cannot account for all of them is not listed for work yet.", "",
    "## Where things stand", "",
    "| Area | Name | Reading confirmed | Cells the views can show | With art | To do | Your keys accounted for |",
    "| ---: | --- | --- | ---: | ---: | ---: | ---: |");
  for (const area of list.areas) {
    add(`| ${area.area} | ${area.name} | ${area.established ? "yes" : "not yet"} | ${area.cellsTheModelDraws} | ${area.cellsWithArt} | ${area.established ? area.toDo : ""} | ${area.existingKeysTheModelDraws} of ${area.existingKeys} |`);
  }
  add("", "\"Cells the views can show\" counts every cell from every square of the map, including squares that may be out of reach; only cells seen from squares connected to your existing coverage are listed to do.", "",
    "## To do", "");
  if (!list.items.length) add("Nothing is listed yet.", "");
  const areas = [...new Set(list.items.map((item) => item.area))];
  for (const area of areas) {
    const mine = list.items.filter((item) => item.area === area);
    add(`### Area ${area}: ${mine[0]!.areaName} (${mine.length})`, "");
    for (const group of [...new Set(mine.map((item) => item.group))]) {
      const members = mine.filter((item) => item.group === group);
      add(`#### ${group} (${members.length})`, "", "| Key (PNG 32x32) | What it is | See it at | Already drawn in area |", "| --- | --- | --- | --- |");
      for (const item of members) {
        const { map, x, y, facing, column, row } = item.seenAt;
        add(`| \`${item.key}\` | ${describeSignature(item.composition)} | map ${map}, square (${x},${y}) facing ${facing}, cell column ${column} row ${row} | ${item.drawnIn.join(", ")} |`);
      }
      add("");
    }
  }
  add("## Still being worked out", "", "Do not start on these. The counts are what the tool has not yet confirmed or classified.", "",
    "| What | Count |", "| --- | ---: |");
  for (const [what, count] of Object.entries(list.stillBeingWorkedOut)) add(`| ${what} | ${count} |`);
  add("", "Areas not yet confirmed, and why:", "");
  for (const area of list.areas) if (!area.established) add(`- Area ${area.area} (${area.name}): ${area.why}.`);
  add("", "## Narrated passages with nothing to see", "",
    "Placeholder. `npm run qa:narration` (being built by another agent) will list narrated passages that describe something to see and have no artwork. They will be linked here.", "");
  return lines.join("\n");
}

function sheets(directory: string, list: Worklist, cells: Cells): void {
  mkdirSync(join(directory, "cells"), { recursive: true });
  const rows: string[] = [];
  let area = -1;
  for (const item of list.items) {
    const hash = item.key.split(":")[2]!;
    const frame = new Frame(8, 8);
    frame.pixels.set(cells.render(item.composition));
    writeFileSync(join(directory, "cells", `${hash}.png`), encodePng(frame));
    if (item.area !== area) { area = item.area; rows.push(`<h2>Area ${area}: ${item.areaName}</h2>`); }
    rows.push(`<figure><img src="cells/${hash}.png" width="128" height="128"><figcaption><code>${item.key}</code><br>${item.group}<br>${describeSignature(item.composition)}<br>map ${item.seenAt.map} (${item.seenAt.x},${item.seenAt.y}) ${item.seenAt.facing}</figcaption></figure>`);
  }
  writeFileSync(join(directory, "index.html"), `<!doctype html><meta charset="utf-8"><title>Artwork worklist: originals to redraw</title>
<style>body{font:13px sans-serif;background:#222;color:#ddd}img{image-rendering:pixelated;border:1px solid #555}figure{display:inline-block;width:300px;vertical-align:top;margin:8px}code{font-size:10px;word-break:break-all}</style>
<h1>Originals still to redraw (${list.items.length})</h1><p>Made from the player's own 1.3 files. Keep outside version control.</p>
${rows.join("\n")}
`);
  console.log(`wrote ${list.items.length} reference cells to ${directory}/index.html`);
}

function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes("--check"), verify = args.includes("--verify");
  const sheetIndex = args.indexOf("--sheets");
  const started = Date.now();
  const read = (path: string) => new Uint8Array(readFileSync(at("game", path)));
  const world = readWorld(readGameData(read), read);
  const pixels = originalTiles(process.env.POR_GAMEDATA);
  const cache = existsSync(at(CELLS)) ? (JSON.parse(readFileSync(at(CELLS), "utf8")) as { cells: Record<string, string> }).cells : {};
  const cells = new Cells(world, pixels, cache);
  const art = readArt();
  const { items, reports } = build(world, art, cells);
  // Every listed item is, by construction, not done. Verify says so in the terms of the files.
  const list: Worklist = {
    schema: 1,
    about: "Written by npm run art:worklist. Do not edit by hand. See docs/ART-WORKLIST.md.",
    done: "The confirmed first-person worklist is clear when npm run verify:art-worklist reports 0 remaining and no invalid tile artwork.",
    remaining: items.length, stillBeingWorkedOut: stillBeingWorkedOut(reports), areas: reports, items,
  };
  const json = JSON.stringify(list, null, 1) + "\n", text = document(list);
  const cellsJson = JSON.stringify({
    about: "SHA-256 of first-person screen cells made of several tiles, by how each is made. Derived from the 1.3 files by npm run art:worklist with POR_GAMEDATA set. Hashes only.",
    cells: Object.fromEntries([...cells.composed].sort(([a], [b]) => a < b ? -1 : 1)),
  }, null, 0).replace(/","/g, "\",\n\"") + "\n";

  if (verify || check) {
    console.log("area  name                         to do");
    for (const report of reports) if (report.established) console.log(`${String(report.area).padStart(4)}  ${report.name.padEnd(28)} ${String(report.toDo).padStart(5)}`);
    for (const group of [...new Set(items.map((item) => `${item.area}: ${item.group}`))]) {
      console.log(`  area ${group}: ${items.filter((item) => `${item.area}: ${item.group}` === group).length}`);
    }
  }
  if (check) {
    // Art added since the files were written does not make them stale; a changed analysis does.
    const committed = existsSync(at(WORKLIST)) ? JSON.parse(readFileSync(at(WORKLIST), "utf8")) as Worklist : undefined;
    const problems: string[] = [];
    if (!committed) problems.push(`${WORKLIST} is missing`);
    else {
      const now = new Set(items.map((item) => item.key));
      const before = new Set(committed.items.map((item) => item.key));
      for (const key of now) if (!before.has(key)) problems.push(`${key} is needed and is not in ${WORKLIST}`);
      for (const item of committed.items) if (!now.has(item.key) && missing(art, item.key, item.width, item.height)) problems.push(`${item.key} is in ${WORKLIST}, has no art, and the tool no longer lists it`);
    }
    if (pixels && existsSync(at(CELLS)) && readFileSync(at(CELLS), "utf8") !== cellsJson) problems.push(`${CELLS} differs from what the 1.3 files give`);
    if (problems.length) {
      console.error(`art:worklist: the committed worklist is stale (${problems.length}). The first:`);
      for (const problem of problems.slice(0, 10)) console.error(`  ${problem}`);
      console.error("Run npm run art:worklist and commit the result.");
      process.exit(1);
    }
    console.log(`art:worklist: the committed worklist is current. ${items.length} remaining.`);
    return;
  }
  if (verify) {
    const invalidTiles = [...art.keys()].filter((key) => key.startsWith("tile:")).flatMap((key) => {
      const issue = missing(art, key, 32, 32);
      return issue ? [`${key}: ${issue}`] : [];
    });
    console.log(`\nverify:art-worklist: ${items.length} confirmed first-person cells remaining (${Date.now() - started} ms).`);
    if (invalidTiles.length) console.error(`Invalid tile artwork (first ${Math.min(invalidTiles.length, 10)} of ${invalidTiles.length}):\n${invalidTiles.slice(0, 10).join("\n")}`);
    const pending = Object.entries(list.stillBeingWorkedOut).filter(([, count]) => typeof count === "number");
    if (pending.length) console.log(`Not counted, still being worked out: ${pending.map(([what, count]) => `${count} ${what}`).join("; ")}`);
    if (cells.missingHashes) console.log(`${cells.missingHashes} cells have no hash in ${CELLS}: run npm run art:worklist with POR_GAMEDATA set`);
    process.exit(items.length || invalidTiles.length ? 1 : 0);
  }
  writeFileSync(at(WORKLIST), json);
  writeFileSync(at(DOCUMENT), text);
  if (pixels) writeFileSync(at(CELLS), cellsJson);
  console.log(`wrote ${WORKLIST} and ${DOCUMENT}: ${items.length} remaining${pixels ? `; ${CELLS}: ${cells.composed.size} hashes` : ""} (${Date.now() - started} ms)`);
  if (sheetIndex >= 0) {
    if (!pixels) { console.error("--sheets needs the player's own 1.3 files: set POR_GAMEDATA to their directory"); process.exit(1); }
    const next = args[sheetIndex + 1];
    sheets(next && !next.startsWith("--") ? resolve(next) : at("out", "art-worklist"), list, cells);
  }
}

main();
