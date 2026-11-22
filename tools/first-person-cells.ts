/**
 * Every 8 by 8 screen cell the first-person view can draw, worked out from the port's own data.
 *
 * The Enhanced display replaces the first-person view one screen cell at a time: the view is 11
 * by 11 cells, and each cell is looked up as `tile:<area>:<sha256 of its 64 pixels>`
 * (tools/live-input.ts). So the artwork a map needs is the set of distinct screen cells its views
 * can show, in the area the game is in at the time. This module computes that set.
 *
 * It follows the game's own draw procedure, read from the version 1.3 translation
 * (src/translated-1.3/ovl29.ts, procedures 0x05fd, 0x0211, 0x047b and 0x0000; ovl26.ts 0x016d for
 * the backdrop; ovl03.ts 0x0c74 for LOAD FILES and LOAD PIECES), and reads the tables that
 * procedure reads from the program image in game/. Nothing here is drawn from the scaffolding
 * renderer in src/lib/world.ts.
 */
import { createHash } from "node:crypto";
import { disassemble, scriptFromBlock, type Instruction } from "../src/lib/ecl.js";
import { segment, useGameVersion } from "../src/runtime/bindings.js";
import {
  contentBytes, programImage, type PortGameData, type ReadGameData, type TileCatalogue,
} from "../src/runtime/game-data.js";

export const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

/** The colour number the view treats as transparent in a tile (ovl34 0x003b loads tiles masked on 13). */
export const TRANSPARENT = 13;

/** One stored 8 by 8 tile: `8X8D4.DAX:20:17` is archive, block and index. */
export type TileName = string;

/** The tables the draw procedure reads from the data segment, at their version 1.3 offsets. */
export interface DrawTables {
  /** First symbol of each of the ten wall pieces in a 156-symbol wall definition (ds:0x0c8c). */
  pieceIndex: number[];
  pieceColumns: number[];
  pieceRows: number[];
  /** Left column and top row of each piece in the 11 by 11 view (ds:0x0caa, ds:0x0cbe). */
  pieceX: number[];
  pieceY: number[];
  /** First symbol number of each tile bank (ds:0x2722), and the lowest symbol a wall set rebases. */
  bankBase: number[];
  rebaseFrom: number;
  /** Step east and south for each facing 0..7 (ds:0x2736, ds:0x273f). */
  dx: number[];
  dy: number[];
  /** Sky colour for each value of the script's sky variables (ds:0x0c26). */
  skyColours: number[];
}

export function drawTables(data: PortGameData, read: ReadGameData): DrawTables {
  useGameVersion("1.3");
  const { image } = programImage(data.program, read);
  const ds = segment.data * 16;
  const bytes = (offset: number, count: number) => Array.from(image.subarray(ds + offset, ds + offset + count));
  const words = (offset: number, count: number) => Array.from({ length: count }, (_, i) => image[ds + offset + i * 2]! | image[ds + offset + i * 2 + 1]! << 8);
  const signed = (value: number) => value << 24 >> 24;
  const bankBase = words(0x2722, 5);
  const tables: DrawTables = {
    pieceIndex: bytes(0xc8c, 10), pieceColumns: bytes(0xc96, 10), pieceRows: bytes(0xca0, 10),
    pieceX: words(0xcaa, 10), pieceY: words(0xcbe, 10).map((word) => word & 0xff),
    bankBase, rebaseFrom: words(0x272c, 1)[0]!,
    dx: bytes(0x2736, 8).map(signed), dy: bytes(0x273f, 8).map(signed),
    skyColours: bytes(0xc26, 16),
  };
  // The procedure was read against these values. A different image needs the reading redone.
  const expected = JSON.stringify({
    pieceIndex: [0, 2, 6, 10, 22, 38, 54, 110, 132, 154], pieceColumns: [1, 1, 1, 3, 2, 2, 7, 2, 2, 1],
    pieceRows: [2, 4, 4, 4, 8, 8, 8, 11, 11, 2], pieceX: [5, 4, 6, 4, 2, 7, 2, 0, 9, 5], pieceY: [4, 3, 3, 3, 1, 1, 1, 0, 0, 4],
    bankBase: [1, 46, 116, 186, 256], rebaseFrom: 45, dx: [0, 1, 1, 1, 0, -1, -1, -1], dy: [-1, -1, 0, 1, 1, 1, 0, -1],
  });
  const { skyColours: _sky, ...found } = tables;
  if (JSON.stringify(found) !== expected) throw new Error("The draw tables in game/program are not the ones tools/first-person-cells.ts was written against");
  return tables;
}

/**
 * The colours under the sky: one row of `line`, two rows of `band`, then the ground (ovl29 0x0174).
 * ovl26 0x016d works them out from two bytes a script can write: 0xc05f gives line and band, 0xc059
 * the ground (ovl07 0x0ddd). The game starts with the values that give 15, 7 and 6.
 */
export interface Lower { line: number; band: number; ground: number }
export const HORIZON: Lower = { line: 15, band: 7, ground: 6 };
const lineOf = (code: number) => code === 8 || code === 0x41 ? 0 : 15;
const bandOf = (code: number) => code === 8 ? 8 : 7;
const groundOf = (code: number) => code === 0x0b ? 8 : code === 6 ? 1 : 6;

export interface AreaMap {
  block: number;
  /** Wall type on each side of each square: [north, east, south, west], 0 is open. */
  walls: Uint8Array;
  flags: Uint8Array;
  /** How a wall can be passed, two bits a side: 0 is not at all. */
  passage: Uint8Array;
}

function areaMap(block: number, map: { northEast: string[]; southWest: string[]; flags: string[]; extra: string[] }): AreaMap {
  const plane = (rows: string[]) => Uint8Array.from(rows.flatMap((row) => row.match(/../g)!.map((byte) => Number.parseInt(byte, 16))));
  const northEast = plane(map.northEast), southWest = plane(map.southWest), extra = plane(map.extra);
  const walls = new Uint8Array(1024), passage = new Uint8Array(1024);
  for (let square = 0; square < 256; square++) {
    walls.set([northEast[square]! >> 4, northEast[square]! & 15, southWest[square]! >> 4, southWest[square]! & 15], square * 4);
    passage.set([extra[square]! & 3, extra[square]! >> 2 & 3, extra[square]! >> 4 & 3, extra[square]! >> 6 & 3], square * 4);
  }
  return { block, walls, flags: plane(map.flags), passage };
}

/** What one LOAD PIECES leaves in the three wall slots. */
export interface WallSlots {
  /** The LOAD PIECES operands this came from. */
  operands: [number, number, number];
  /** For each slot 1..3: the wall definition block and set it holds, and the tile block of its bank. */
  slots: ({ wallBlock: number; set: number; tileBlock: number; loadedAt: number } | undefined)[];
  /** Notes on anything the load does that is not the plain case. */
  notes: string[];
}

/** One script's view of the world: the area number its keys carry and what it loads. */
export interface AreaScript {
  area: number;
  archive: number;
  /** Map blocks the script loads, with how each was established. */
  maps: { block: number; how: string; wallLoads: string[] }[];
  /** First operands of LOAD FILES the tool could not resolve to a map block. */
  unresolvedMaps: string[];
  wallSlots: WallSlots[];
  /** True when the script has no LOAD PIECES and the wall sets are those of the script that starts it. */
  inheritedWalls?: boolean;
  /** Values the script can leave in the two sky variables, as colours. `open` is under the sky, `covered` under a roof. */
  sky: { open: number[]; covered: number[]; unresolved: string[]; inherited: ("open" | "covered")[] };
  /** True when the script ever lets the player open the overhead area view (it clears variable 0x49fb). */
  areaView: boolean;
  /** Areas this script starts with NEW ECL, when the operand is a number. */
  leadsTo: number[];
}

const immediate = (instruction: Instruction, index: number): number | undefined => {
  const operand = instruction.operands[index];
  return operand?.code === 0 ? operand.low : operand?.code === 2 ? operand.word ?? undefined : undefined;
};
const memory = (instruction: Instruction, index: number): number | undefined => {
  const operand = instruction.operands[index];
  return operand && (operand.code === 1 || operand.code === 3) && operand.word !== null ? operand.word : undefined;
};

export interface WorldData {
  tables: DrawTables;
  scripts: AreaScript[];
  maps: Map<string, AreaMap>;
  /** `archive:block` to the wall sets of that block, each 5 rows of 156 symbols flattened. */
  wallBlocks: Map<string, Uint8Array[]>;
  /** `8X8D<archive>.DAX:<block>` to the hashes of its tiles. */
  tileBlocks: Map<string, string[]>;
  catalogue: TileCatalogue;
  /** Line and band pairs, and ground colours, that some script sets. The first of each is what the game starts with. */
  bands: { line: number; band: number; from: string }[];
  grounds: { ground: number; from: string }[];
}

export function readWorld(data: PortGameData, read: ReadGameData): WorldData {
  const tables = drawTables(data, read);
  const digit = (file: string) => Number(/\d/.exec(file)![0]);
  const maps = new Map<string, AreaMap>(), wallBlocks = new Map<string, Uint8Array[]>(), tileBlocks = new Map<string, string[]>();
  for (const record of data.content) {
    if (record.kind === "map" && record.map) maps.set(`${digit(record.file)}:${record.block}`, areaMap(record.block!, record.map));
    if (record.kind === "walls" && record.wallSets) {
      wallBlocks.set(`${digit(record.file)}:${record.block}`, record.wallSets.map((rows) =>
        Uint8Array.from(rows.join("").match(/../g)!.map((byte) => Number.parseInt(byte, 16)))));
    }
  }
  for (const record of data.pictures) {
    const picture = record.pictures[0];
    if (/^8X8D\d\.DAX$/.test(record.file) && picture && picture.width === 8 && picture.height === 8) tileBlocks.set(`${record.file}:${record.block}`, picture.frameHashes);
  }
  const catalogue = JSON.parse(new TextDecoder().decode(read(data.manifest.tiles))) as TileCatalogue;

  // Every script, disassembled once.
  const listings = data.content.filter((record) => record.kind === "script" && record.block !== undefined).map((record) => ({
    area: record.block!, archive: digit(record.file), script: scriptFromBlock(contentBytes(record, read)),
    instructions: disassemble(scriptFromBlock(contentBytes(record, read))).instructions,
  }));
  // Numbers a variable can hold: every number any script saves into it, followed through one variable to the next.
  // A script's own saves are looked at first; a variable it never saves holds what another script left there.
  type Saves = Map<number, { numbers: Set<number>; from: Set<number>; other: boolean }>;
  const everywhere: Saves = new Map();
  const own = new Map<number, Saves>();
  for (const { area, instructions } of listings) {
    for (const saves of [everywhere, own.get(area) ?? own.set(area, new Map()).get(area)!]) for (const instruction of instructions) {
      const name = instruction.name;
      if (!name) continue;
      const last = instruction.operands.length - 1;
      const target = memory(instruction, last);
      if (target === undefined) continue;
      // SAVE writes its first operand; anything else that ends in a variable computes a value the tool does not follow.
      const writes = name === "SAVE" || /^(ADD|SUBTRACT|MULTIPLY|DIVIDE|AND|OR|RANDOM|GET TABLE|INPUT NUMBER|SAVE TABLE)/.test(name);
      if (!writes) continue;
      const entry = saves.get(target) ?? { numbers: new Set<number>(), from: new Set<number>(), other: false };
      saves.set(target, entry);
      if (name === "SAVE") {
        const number = immediate(instruction, 0), source = memory(instruction, 0);
        if (number !== undefined) entry.numbers.add(number);
        else if (source !== undefined) entry.from.add(source);
        else entry.other = true;
      } else entry.other = true;
    }
  }
  let current: Saves = everywhere;
  const valuesOf = (address: number, seen = new Set<number>()): { numbers: Set<number>; unresolved: string[] } => {
    const numbers = new Set<number>(), unresolved: string[] = [];
    if (seen.has(address)) return { numbers, unresolved };
    seen.add(address);
    const entry = current.get(address) ?? everywhere.get(address);
    if (!entry) return { numbers, unresolved: [`variable 0x${address.toString(16)} is never saved by a script`] };
    for (const number of entry.numbers) numbers.add(number);
    if (entry.other) unresolved.push(`variable 0x${address.toString(16)} is also computed`);
    for (const source of entry.from) {
      const inner = valuesOf(source, seen);
      for (const number of inner.numbers) numbers.add(number);
      unresolved.push(...inner.unresolved);
    }
    return { numbers, unresolved };
  };

  const scripts: AreaScript[] = [];
  for (const { area, archive, script, instructions } of listings) {
    current = own.get(area)!;
    const result: AreaScript = { area, archive, maps: [], unresolvedMaps: [], wallSlots: [], sky: { open: [], covered: [], unresolved: [], inherited: [] }, areaView: false, leadsTo: [] };
    // A LOAD FILES and a LOAD PIECES within two instructions of each other load a map with its own wall sets.
    const loads: { at: number; maps: number[] }[] = [], pieces: { at: number; operands: string }[] = [];
    let position = -1, loading: number[] = [];
    const addMap = (block: number, how: string) => {
      if (!maps.has(`${archive}:${block}`)) return;
      loading.push(block);
      if (!result.maps.some((map) => map.block === block)) result.maps.push({ block, how, wallLoads: [] });
    };
    const skyNumbers = { open: new Set<number>(), covered: new Set<number>() };
    for (const instruction of instructions) {
      const name = instruction.name;
      position++;
      if (loading.length) loads.push({ at: position - 1, maps: loading });
      loading = [];
      const at = instruction.address.toString(16);
      if (name === "LOAD FILES") {
        const number = immediate(instruction, 0), variable = memory(instruction, 0);
        if (number !== undefined) { if (number !== 0xff && number !== 0x7f) addMap(number, `LOAD FILES at ${at}`); }
        else if (variable !== undefined) {
          // The operand is a variable. Take every number a script saves in it, and every entry of a table a
          // GET TABLE in this script reads into it, that is a map block of this script's archive.
          const found: number[] = [];
          for (const number of valuesOf(variable).numbers) if (maps.has(`${archive}:${number}`)) found.push(number);
          for (const table of instructions) {
            if (table.name !== "GET TABLE" || memory(table, 2) !== variable) continue;
            const base = memory(table, 0);
            if (base === undefined) continue;
            for (let entry = 0; entry < 16; entry++) {
              const value = script.bytes[base - script.base + entry];
              if (value !== undefined && maps.has(`${archive}:${value}`)) found.push(value);
            }
          }
          if (found.length) for (const block of found) addMap(block, `LOAD FILES at ${at} through variable 0x${variable.toString(16)}`);
          else result.unresolvedMaps.push(`LOAD FILES at ${at} takes its map from variable 0x${variable.toString(16)}, which no number that is a map block reaches`);
        }
      }
      if (name === "LOAD PIECES") {
        const operands = [0, 1, 2].map((index) => immediate(instruction, index));
        if (operands.some((operand) => operand === undefined)) result.unresolvedMaps.push(`LOAD PIECES at ${at} takes a wall set from a variable`);
        else {
          const slots = wallSlots(operands as [number, number, number], archive, wallBlocks);
          if (!result.wallSlots.some((known) => known.operands.join() === slots.operands.join())) result.wallSlots.push(slots);
          pieces.push({ at: position, operands: slots.operands.join() });
        }
      }
      if (name === "SAVE" && (memory(instruction, 1) === 0x49fd || memory(instruction, 1) === 0x49fe)) {
        const which = memory(instruction, 1) === 0x49fd ? "open" : "covered";
        const number = immediate(instruction, 0), variable = memory(instruction, 0);
        if (number !== undefined) skyNumbers[which].add(number);
        else if (variable !== undefined) {
          const { numbers, unresolved } = valuesOf(variable);
          for (const value of numbers) skyNumbers[which].add(value);
          for (const reason of unresolved) if (!result.sky.unresolved.includes(reason)) result.sky.unresolved.push(reason);
        }
      }
      if (name === "SAVE" && memory(instruction, 1) === 0x49fb && immediate(instruction, 0) === 0) result.areaView = true;
      if (name === "NEW ECL") {
        const target = immediate(instruction, 0);
        if (target !== undefined && !result.leadsTo.includes(target)) result.leadsTo.push(target);
      }
    }
    const colours = (numbers: Set<number>) => [...new Set([...numbers].filter((number) => number < 16).map((number) => tables.skyColours[number]!))].sort((a, b) => a - b);
    result.sky.open = colours(skyNumbers.open);
    result.sky.covered = colours(skyNumbers.covered);
    if (loading.length) loads.push({ at: position, maps: loading });
    for (const map of result.maps) {
      const near = new Set<string>();
      for (const load of loads) if (load.maps.includes(map.block)) for (const piece of pieces) if (Math.abs(piece.at - load.at) <= 2) near.add(piece.operands);
      // A map loaded with no LOAD PIECES beside it is drawn with whichever wall sets the script has loaded.
      map.wallLoads = near.size ? [...near] : result.wallSlots.map((slots) => slots.operands.join());
    }
    scripts.push(result);
  }
  scripts.sort((a, b) => a.area - b.area);
  // A script with no LOAD PIECES draws with the wall sets left by the script that started it, when
  // that script reads the same archive.
  for (const script of scripts) {
    if (script.wallSlots.length) continue;
    for (const before of scripts) {
      if (before.archive !== script.archive || !before.leadsTo.includes(script.area)) continue;
      for (const slots of before.wallSlots) if (!script.wallSlots.some((known) => known.operands.join() === slots.operands.join())) script.wallSlots.push(slots);
    }
    script.inheritedWalls = script.wallSlots.length > 0;
    for (const map of script.maps) map.wallLoads = script.wallSlots.map((slots) => slots.operands.join());
  }
  // A script that never sets a sky variable draws with what the script before it left: take the
  // colours of the scripts that start it, and failing that of every script.
  for (const which of ["open", "covered"] as const) {
    const all = [...new Set(scripts.flatMap((script) => script.sky[which]))].sort((a, b) => a - b);
    const inherit = new Map<AreaScript, number[]>();
    for (const script of scripts) {
      if (script.sky[which].length) continue;
      const before = scripts.filter((other) => other.leadsTo.includes(script.area) && other.sky[which].length);
      inherit.set(script, before.length ? [...new Set(before.flatMap((other) => other.sky[which]))].sort((a, b) => a - b) : all);
    }
    for (const [script, colours] of inherit) { script.sky[which] = colours; script.sky.inherited.push(which); }
  }
  // Scripts that write the two backdrop bytes. What they leave stays until another script writes
  // them, so every area is tried with every value, and the artwork that exists says which occur.
  const bands: WorldData["bands"] = [{ line: HORIZON.line, band: HORIZON.band, from: "the game's starting value" }];
  const grounds: WorldData["grounds"] = [{ ground: HORIZON.ground, from: "the game's starting value" }];
  for (const { area, script, instructions } of listings) {
    for (const instruction of instructions) {
      const target = memory(instruction, instruction.operands.length - 1);
      if (target !== 0xc05f && target !== 0xc059) continue;
      const codes: number[] = [];
      const number = immediate(instruction, 0);
      if (instruction.name === "SAVE" && number !== undefined) codes.push(number);
      if (instruction.name === "GET TABLE") {
        const base = memory(instruction, 0);
        if (base !== undefined) for (let entry = 0; entry < 8; entry++) codes.push(script.bytes[base - script.base + entry] ?? 0);
      }
      const from = `area ${area}'s script at ${instruction.address.toString(16)}`;
      for (const code of codes) {
        if (target === 0xc05f && !bands.some((known) => known.line === lineOf(code) && known.band === bandOf(code))) bands.push({ line: lineOf(code), band: bandOf(code), from });
        if (target === 0xc059 && !grounds.some((known) => known.ground === groundOf(code))) grounds.push({ ground: groundOf(code), from });
      }
    }
  }
  return { tables, scripts, maps, wallBlocks, tileBlocks, catalogue, bands, grounds };
}

/**
 * What LOAD PIECES a, b, c loads (ovl03 0x0d20, ovl29 0x0e08). Each operand names a wall definition
 * block of the script's archive for slots 1, 2 and 3; 0xff leaves a slot alone; 0x7f as the first
 * loads block 0 into slot 1. A block of several sets fills the following slots too. The tiles of
 * a one-set block n are tile block n; of set i of a several-set block n, tile block 10n+i (100+i for block 0).
 */
function wallSlots(operands: [number, number, number], archive: number, wallBlocks: Map<string, Uint8Array[]>): WallSlots {
  const slots: WallSlots["slots"] = [undefined, undefined, undefined, undefined];
  const notes: string[] = [];
  const load = (block: number, slot: number) => {
    const sets = wallBlocks.get(`${archive}:${block}`);
    if (!sets) { notes.push(`wall definition block ${block} is not in WALLDEF${archive}.DAX: the game loads slot ${slot} from it only when variables 0x49e7 and 0x49e8 are clear, and the scripts that name it set them first`); return; }
    for (let set = 0; set < sets.length && slot + set <= 3; set++) {
      slots[slot + set] = { wallBlock: block, set, tileBlock: sets.length > 1 ? (block || 10) * 10 + set + 1 : block, loadedAt: slot };
    }
  };
  const [first, second, third] = operands;
  if (first === 0x7f) load(0, 1);
  else {
    if (first !== 0xff) load(first, 1);
    if (second !== 0xff) load(second, 2);
    if (third !== 0xff) load(third, 3);
  }
  return { operands, slots, notes };
}

/** A stack of tiles drawn into one screen cell, bottom first, over the backdrop of that row. */
export interface CellStack {
  /** Row of the view, 0..10: rows 0..4 are sky, row 5 holds the horizon, rows 6..10 are ground. */
  row: number;
  tiles: TileName[];
}

export interface ViewContext {
  world: WorldData;
  script: AreaScript;
  map: AreaMap;
  slots: WallSlots;
}

/** The tile a symbol of the loaded wall table draws, or undefined when it draws nothing. */
function symbolTile(context: ViewContext, symbol: number): TileName | undefined {
  const { bankBase } = context.world.tables;
  if (symbol <= 0) return;
  // ovl34 0x015d: symbols 1..0x2d are the shared bank, then three banks of 70, then the area view's bank.
  const bank = symbol <= 0x2d ? 0 : symbol <= 0x73 ? 1 : symbol <= 0xb9 ? 2 : symbol <= 0xff ? 3 : symbol <= 0x11e ? 4 : -1;
  if (bank < 0) return;
  const index = symbol - bankBase[bank]!;
  const block = bank === 0 ? "8X8D1.DAX:203" : bank === 4 ? "8X8D1.DAX:202"
    : context.slots.slots[bank] ? `8X8D${context.script.archive}.DAX:${context.slots.slots[bank]!.tileBlock}` : undefined;
  if (!block) return;
  const tiles = context.world.tileBlocks.get(block);
  if (!tiles || index < 0 || index >= tiles.length) return;
  return `${block}:${index}`;
}

/** The symbol at `index` of wall type 1..15, after the rebasing ovl29 0x0e08 does when it loads a slot. */
function wallSymbol(context: ViewContext, type: number, index: number): number {
  const slot = Math.floor((type - 1) / 5) + 1;
  const loaded = context.slots.slots[slot];
  if (!loaded) return 0;
  const sets = context.world.wallBlocks.get(`${context.script.archive}:${loaded.wallBlock}`)!;
  const stored = sets[loaded.set]![((type - 1) % 5) * 156 + index]!;
  const { bankBase, rebaseFrom } = context.world.tables;
  // The shift is worked out once for the slot the block was loaded at, so the later sets of a block of several sets store symbols of their own bank.
  return stored >= rebaseFrom ? (stored + bankBase[loaded.loadedAt]! - bankBase[1]!) & 0xff : stored;
}

/** Every tile some symbol of the loaded wall definitions names, whether or not a map ever places it. */
export function namedTiles(context: ViewContext): Set<TileName> {
  const named = new Set<TileName>();
  for (let type = 1; type <= 15; type++) {
    for (let index = 0; index < 156; index++) {
      const tile = symbolTile(context, wallSymbol(context, type, index));
      if (tile) named.add(tile);
    }
  }
  return named;
}

/** The 121 cell stacks of the view from a square, facing 0, 2, 4 or 6. */
export function viewCells(context: ViewContext, x: number, y: number, facing: number): TileName[][] {
  const { tables } = context.world;
  const { map, script } = context;
  const cells: TileName[][] = Array.from({ length: 121 }, () => []);
  // ovl29 0x031f and 0x047b: off the map there is no wall in areas 0 and 10; elsewhere each coordinate wraps once.
  const inside = (cx: number, cy: number) => cx >= 0 && cx <= 15 && cy >= 0 && cy <= 15;
  const wall = (cx: number, cy: number, side: number): number => {
    if (!inside(cx, cy) && (script.area === 0 || script.area === 10)) return 0;
    if (cx > 15) cx = 0;
    if (cx < 0) cx = 15;
    if (cy > 15) cy = 0;
    if (cy < 0) cy = 15;
    return map.walls[(cy * 16 + cx) * 4 + side / 2]!;
  };
  // ovl29 0x0211: stamp one piece of a wall type with its top left cell at (column, row).
  const piece = (number: number, type: number, column: number) => {
    let index = tables.pieceIndex[number]!;
    const top = tables.pieceY[number]!;
    for (let row = top; row < top + tables.pieceRows[number]!; row++) {
      for (let col = column; col < column + tables.pieceColumns[number]!; col++, index++) {
        if (row < 0 || row > 10 || col < 0 || col > 10) continue;
        const tile = symbolTile(context, wallSymbol(context, type, index));
        if (tile) cells[row * 11 + col]!.push(tile);
      }
    }
  };
  const { dx, dy, pieceX } = tables;
  const left = (facing + 6) % 8, back = (facing + 4) % 8, right = (facing + 2) % 8;
  let px = x + 2 * dx[facing]!, py = y + 2 * dy[facing]!;
  for (let distance = 2; distance >= 0; distance--) {
    if (distance === 2) {
      // The far row: fronts three squares ahead, to the left and then to the right, with the corner piece between neighbours.
      for (const [step, other, sign] of [[left, right, -1], [right, left, 1]] as const) {
        let cx = px, cy = py, offset = 0, previous = 0;
        for (let i = 0; i < 4; i++) {
          const front = wall(cx, cy, facing);
          if (!inside(cx, cy) && wall(cx, cy, other) === 0) previous = 0;
          if (front !== 0) {
            if (previous > 0) piece(9, previous, pieceX[9]! + offset - sign);
            previous = front;
            piece(0, front, pieceX[0]! + offset);
          } else {
            if (previous > 0 && wall(cx - dx[step]!, cy - dy[step]!, step) !== 0) piece(9, previous, pieceX[9]! + offset - sign);
            previous = 0;
          }
          offset += 2 * sign;
          cx += dx[step]!;
          cy += dy[step]!;
        }
      }
      for (const [step, number, sign] of [[left, 1, -1], [right, 2, 1]] as const) {
        let cx = px, cy = py, offset = 0;
        for (let i = 0; i < 3; i++) {
          const side = wall(cx, cy, step);
          if (side !== 0) piece(number, side, pieceX[number]! + offset + (i === 0 ? 0 : sign));
          offset += 2 * sign;
          cx += dx[step]!;
          cy += dy[step]!;
        }
      }
    } else {
      // The middle row is three squares wide a side and the near row two, each side walked from its far end inward.
      const [front, sides, reach, start, stride] = distance === 1 ? [3, [4, 5], 2, 6, 3] as const : [6, [7, 8], 1, 7, 7] as const;
      for (const [from, toward, sideWall, number, sign] of [[left, right, left, sides[0], -1], [right, left, right, sides[1], 1]] as const) {
        let cx = px + reach * dx[from]!, cy = py + reach * dy[from]!, offset = start * sign;
        for (let i = 0; i < (distance === 1 ? 3 : 2); i++) {
          const ahead = wall(cx, cy, facing);
          if (ahead !== 0) piece(front, ahead, pieceX[front]! + offset);
          const side = wall(cx, cy, sideWall);
          if (side !== 0) piece(number, side, pieceX[number]! + offset);
          offset -= stride * sign;
          cx += dx[toward]!;
          cy += dy[toward]!;
        }
      }
    }
    px += dx[back]!;
    py += dy[back]!;
  }
  return cells;
}

/** True when the square is under a roof: bit 7 of its flag byte picks the covered sky variable (ovl26 0x016d). */
export const covered = (map: AreaMap, x: number, y: number): boolean => map.flags[y * 16 + x]! > 0x7f;

/**
 * The overhead area view (ovl29 0x0000): an 11 by 11 window of the map, one symbol 0x104 + sides
 * with a wall for each square, and the party arrow 0x100 + facing/2 drawn over the party's square.
 */
export function areaViewCells(context: ViewContext, x: number, y: number, facing: number): TileName[][] {
  const { map, script } = context;
  const cells: TileName[][] = Array.from({ length: 121 }, () => []);
  const clamp = (value: number) => Math.max(0, Math.min(5, value - 5));
  const left = clamp(x), top = clamp(y);
  const present = (cx: number, cy: number, side: number) => {
    const inside = cx >= 0 && cx <= 15 && cy >= 0 && cy <= 15;
    if (!inside && (script.area === 0 || script.area === 10)) return false;
    return map.walls[((cy & 15) * 16 + (cx & 15)) * 4 + side / 2]! !== 0;
  };
  for (let row = 0; row <= 10; row++) {
    for (let col = 0; col <= 10; col++) {
      let symbol = 0x104;
      for (const [side, bit] of [[0, 1], [2, 2], [4, 4], [6, 8]] as const) if (present(left + col, top + row, side)) symbol += bit;
      const tile = symbolTile(context, symbol);
      if (tile) cells[row * 11 + col]!.push(tile);
    }
  }
  const arrow = symbolTile(context, 0x100 + facing / 2);
  if (arrow) cells[(y - top) * 11 + (x - left)]!.push(arrow);
  return cells;
}

/** Squares the party can stand on: those reached from `starts` through open sides and passable walls. */
export function reachable(map: AreaMap, starts: readonly number[], area: number): Set<number> {
  const seen = new Set<number>(starts);
  const queue = [...starts];
  const steps = [[0, -1], [1, 0], [0, 1], [-1, 0]] as const;
  while (queue.length) {
    const square = queue.pop()!;
    const x = square & 15, y = square >> 4;
    for (let side = 0; side < 4; side++) {
      // ovl29 0x0350: an open side passes; a wall passes when its two passage bits are not 0.
      if (map.walls[square * 4 + side]! !== 0 && map.passage[square * 4 + side]! === 0) continue;
      let nx = x + steps[side]![0], ny = y + steps[side]![1];
      if (nx < 0 || nx > 15 || ny < 0 || ny > 15) {
        if (area === 0 || area === 10) continue;
        nx &= 15;
        ny &= 15;
      }
      const next = ny * 16 + nx;
      if (!seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return seen;
}
