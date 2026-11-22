/**
 * Convert the version 1.3 game files into the port's own data files under `game/`.
 *
 *   npm run build:game-data -- <1.3 game directory>           write game/
 *   npm run build:game-data -- <1.3 game directory> --check   fail if game/ differs from what would be written
 *
 * The format is described in docs/GAME-DATA.md. The converter needs the Python that runs
 * tools/tp_translate.py (capstone): set POR_PYTHON, or have it as `python` on the PATH.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDax } from "../src/lib/dax.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { isPicture, pictureMembers } from "../src/lib/picture.js";
import { segment, useGameVersion } from "../src/runtime/bindings.js";
import {
  blankPictureBytes, contentBytes, dataFiles, GAME_DATA_FORMAT, GAME_DATA_VERSION, overlayFile, overlayStub, programImage,
  type BlobReference, type ContentRecord, type GameDataManifest, type OverlayData, type PictureRecord, type PictureShape,
  type PortGameData, type ProgramData, type ReadGameData,
} from "../src/runtime/game-data.js";

export const repository = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const gameDataDirectory = join(repository, "game");

export interface InstructionMap {
  gameVersion: string;
  units: Record<string, { name: string; start: number; ranges: [number, number][] }[]>;
}

/** Ask the translator for the byte ranges of every instruction it emits. */
export function instructionMap(gameDirectory: string): InstructionMap {
  const scratch = mkdtempSync(join(tmpdir(), "por-instruction-map-"));
  try {
    const file = join(scratch, "instructions.json");
    const python = process.env.POR_PYTHON ?? "python";
    const run = spawnSync(python, [join(repository, "tools", "tp_translate.py"), gameDirectory, "--game-version", "1.3",
      "--instruction-map", file], { encoding: "utf8" });
    if (run.status !== 0) {
      throw new Error(`The translator did not list its instructions (${python}). Set POR_PYTHON to a Python with capstone.\n${run.stderr}`);
    }
    return JSON.parse(readFileSync(file, "utf8")) as InstructionMap;
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

const hex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((byte, index) => byte === b[index]);
const sha256 = (bytes: Uint8Array): string => createHash("sha256").update(bytes).digest("hex");

function rows(bytes: Uint8Array, rowBytes: number): string[] {
  if (bytes.length % rowBytes) throw new Error(`${bytes.length} bytes is not a whole number of ${rowBytes}-byte rows`);
  return Array.from({ length: bytes.length / rowBytes }, (_, row) => hex(bytes.subarray(row * rowBytes, (row + 1) * rowBytes)));
}

/** JSON with one value per line, except that a list of numbers stays on one line. */
function stringify(value: unknown, indent = ""): string {
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    if (value.every((item) => typeof item === "number")) return `[${value.join(", ")}]`;
    return `[\n${value.map((item) => `${indent} ${stringify(item, indent + " ")}`).join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    const fields = Object.entries(value).filter(([, item]) => item !== undefined);
    if (!fields.length) return "{}";
    return `{\n${fields.map(([key, item]) => `${indent} ${JSON.stringify(key)}: ${stringify(item, indent + " ")}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

/** A blob file under construction: records are appended and referenced by offset. */
class Blob {
  private readonly parts: Uint8Array[] = [];
  private size = 0;
  constructor(readonly file: string) {}
  add(bytes: Uint8Array): BlobReference {
    const reference = { file: this.file, offset: this.size, length: bytes.length };
    this.parts.push(bytes);
    this.size += bytes.length;
    return reference;
  }
  bytes(): Uint8Array {
    const out = new Uint8Array(this.size);
    let at = 0;
    for (const part of this.parts) { out.set(part, at); at += part.length; }
    return out;
  }
}

/** Pictures: archives whose every record is drawn. Their pixels are not converted. */
const PICTURE_ARCHIVE = /^(8X8D\d|BACPAC|BODY\d|CBODY|CHEAD|COMSPR|CPIC\d|DUNGCOM|FINAL\d|HEAD\d|ICON|PIC\d|RANDCOM|SPRIT\d|SQRPACI|TITLE|WILDCOM)\.DAX$/;
const PROGRAM_FILE = /^(START\.EXE|GAME\.OVR)$/;

const pascalName = (bytes: Uint8Array): string =>
  String.fromCharCode(...bytes.subarray(1, 1 + Math.min(bytes[0]!, 15)));

interface Built { files: Map<string, Uint8Array>; data: PortGameData; measured: Record<string, number> }

function blankRanges(bytes: Uint8Array, procedures: InstructionMap["units"][string] | undefined): number {
  const before = new Uint8Array(bytes.length);
  for (const { ranges } of procedures ?? []) {
    for (const [start, end] of ranges) {
      if (end > bytes.length) throw new Error(`An instruction range ends at ${end}, past ${bytes.length}`);
      before.fill(1, start, end);
    }
  }
  let blanked = 0;
  for (let i = 0; i < bytes.length; i++) if (before[i]) { bytes[i] = 0; blanked++; }
  return blanked;
}

/**
 * Library code in the version 1.3 image that the translation never reaches, so the translator's
 * instruction map does not list it: the sound unit's timer interrupt handler, and routines and
 * alternate entries of Crt and System that nothing in the game calls. Each range was read in a
 * disassembly of the bytes the instruction map left below the data segment; what remains there
 * after these are text, jump tables, sound data and numeric constants. [image offset, bytes].
 */
export const UNREACHED_CODE: [number, number][] = [
  [0x8a9c, 18], [0x9eca, 856], [0xa365, 3], [0xa52d, 22], [0xa5c0, 83], [0xa63f, 24], [0xa689, 19], [0xa6f6, 7],
  [0xac2e, 7], [0xad05, 1], [0xb02e, 51], [0xb437, 64], [0xb4f1, 3], [0xb53d, 4], [0xb978, 12], [0xb9d7, 4],
  [0xba64, 24], [0xbb44, 1], [0xbbcd, 1], [0xbcbc, 1], [0xbd20, 1], [0xbd61, 1], [0xbd7d, 1], [0xbd9b, 1],
  [0xbdb7, 1], [0xbdce, 1], [0xbdec, 196], [0xbf08, 1], [0xc02f, 42], [0xc0f4, 18], [0xc116, 4], [0xc126, 8],
  [0xc156, 57], [0xc445, 11], [0xc52a, 26], [0xc68b, 7],
];

/** Blank the unreached library code. It must lie wholly outside what the translator lists. */
export function blankUnreachedCode(image: Uint8Array, original: Uint8Array, procedures: InstructionMap["units"][string]): number {
  const listed = new Uint8Array(image.length);
  for (const { ranges } of procedures) for (const [start, end] of ranges) listed.fill(1, start, end);
  let blanked = 0;
  for (const [start, length] of UNREACHED_CODE) {
    for (let at = start; at < start + length; at++) {
      if (listed[at]) throw new Error(`Unreached code at ${at.toString(16)} is an instruction the translator lists`);
    }
    if (original[start - 1] !== 0 && !listed[start - 1]) throw new Error(`Unreached code at ${start.toString(16)} does not start where the listed instructions end`);
    image.fill(0, start, start + length);
    blanked += length;
  }
  return blanked;
}

const nonzero = (bytes: Uint8Array): number => bytes.reduce((count, byte) => count + (byte ? 1 : 0), 0);

function buildProgram(original: Map<string, Uint8Array>, map: InstructionMap, out: Map<string, Uint8Array>) {
  const exe = original.get("START.EXE"), ovr = original.get("GAME.OVR");
  if (!exe || !ovr) throw new Error("START.EXE and GAME.OVR are required");
  const signature = String.fromCharCode(...ovr.subarray(0, 4));
  if (signature !== "FBOV") throw new Error("GAME.OVR is not the version 1.3 overlay file");
  const view = new DataView(ovr.buffer, ovr.byteOffset, ovr.byteLength);
  if (view.getUint32(4, true) !== ovr.length - 8) throw new Error("GAME.OVR's length field does not match its size");
  const loaded = loadExecutable(exe);
  const image = loaded.image.slice();
  const word = (at: number) => image[at]! | (image[at + 1]! << 8);

  // The overlay table, as src/runtime/overlay.ts finds it in the image.
  const stubs: { at: number; fileOffset: number; codeBytes: number; relocationBytes: number; entries: number }[] = [];
  const seen = new Set<number>();
  for (let at = 0; at + 32 < image.length; at += 16) {
    if (image[at] !== 0xcd || image[at + 1] !== 0x3f) continue;
    const fileOffset = (word(at + 4) | (word(at + 6) << 16)) >>> 0;
    const codeBytes = word(at + 8), relocationBytes = word(at + 10), entries = word(at + 12);
    if (entries < 1 || entries > 512 || codeBytes < 1) continue;
    if (fileOffset < 4 || fileOffset + codeBytes + relocationBytes > ovr.length || seen.has(fileOffset)) continue;
    seen.add(fileOffset);
    stubs.push({ at, fileOffset, codeBytes, relocationBytes, entries });
  }
  stubs.sort((a, b) => a.fileOffset - b.fileOffset);

  const dataStart = segment.data * 16;
  const instructionBytes = blankRanges(image, map.units.exe);
  const unreachedBytes = blankUnreachedCode(image, loaded.image, map.units.exe ?? []);
  const slices = new Blob("program/overlays.bin");
  const overlays: OverlayData[] = [];
  let overlayInstructionBytes = 0, overlayCodeBytes = 0, overlayKept = 0, tableBytes = 0, covered = 8;
  for (const [index, stub] of stubs.entries()) {
    const code = ovr.slice(stub.fileOffset, stub.fileOffset + stub.codeBytes);
    overlayInstructionBytes += blankRanges(code, map.units[`ovl${String(index).padStart(2, "0")}`]);
    overlayCodeBytes += code.length;
    overlayKept += nonzero(code);
    covered += stub.codeBytes + stub.relocationBytes;
    const overlay: OverlayData = {
      index,
      headerParagraph: stub.at >> 4,
      fileOffset: stub.fileOffset,
      codeBytes: stub.codeBytes,
      memorySwap: word(stub.at + 2),
      previous: word(stub.at + 14),
      entries: Array.from({ length: stub.entries }, (_, entry) => word(stub.at + 32 + entry * 5 + 2)),
      code: slices.add(code),
      relocations: Array.from({ length: stub.relocationBytes / 2 },
        (_, entry) => view.getUint16(stub.fileOffset + stub.codeBytes + entry * 2, true)),
    };
    const rebuilt = overlayStub(overlay);
    if (!same(rebuilt, loaded.image.subarray(stub.at, stub.at + rebuilt.length))) {
      throw new Error(`Overlay ${index}'s table entry does not rebuild from its fields`);
    }
    image.fill(0, stub.at, stub.at + rebuilt.length);
    tableBytes += rebuilt.length;
    overlays.push(overlay);
  }
  if (covered !== ovr.length) throw new Error(`GAME.OVR holds ${ovr.length - covered} bytes outside its overlays`);
  if (!instructionBytes || !overlayInstructionBytes) throw new Error("The translator listed no instructions for the program");

  const program: ProgramData = {
    format: GAME_DATA_FORMAT, formatVersion: GAME_DATA_VERSION, gameVersion: "1.3",
    entry: { segment: loaded.cs, offset: loaded.ip },
    stack: { segment: loaded.ss, pointer: loaded.sp },
    image: { file: "program/image.bin", offset: 0, length: image.length },
    overlayFile: { name: "GAME.OVR", signature, bytes: ovr.length },
    overlays,
    imageRelocations: "None. The runtime loads the image at paragraph 0, where every segment word already holds its final value.",
    measured: {
      imageBytes: image.length,
      imageInstructionBytesBlanked: instructionBytes,
      imageUnreachedCodeBytesBlanked: unreachedBytes,
      imageOverlayTableBytesMovedToJson: tableBytes,
      imageDataSegmentBytes: image.length - dataStart,
      imageBytesBelowDataSegmentKept: nonzero(image.subarray(0, dataStart)),
      imageBytesKept: nonzero(image),
      overlayCodeBytes,
      overlayInstructionBytesBlanked: overlayInstructionBytes,
      overlayBytesKept: overlayKept,
    },
  };
  out.set(program.image.file, image);
  out.set(slices.file, slices.bytes());

  // The loader must give back the original bytes wherever the translator found no instruction.
  const read: ReadGameData = (path) => out.get(path)!;
  const expectedImage = loaded.image.slice();
  blankRanges(expectedImage, map.units.exe);
  blankUnreachedCode(expectedImage, loaded.image, map.units.exe ?? []);
  if (!same(programImage(program, read).image, expectedImage)) throw new Error("The stored image does not rebuild");
  const expectedOverlay = ovr.slice();
  for (const [index, stub] of stubs.entries()) {
    const code = expectedOverlay.subarray(stub.fileOffset, stub.fileOffset + stub.codeBytes);
    blankRanges(code, map.units[`ovl${String(index).padStart(2, "0")}`]);
  }
  if (!same(overlayFile(program, read), expectedOverlay)) throw new Error("The stored overlay file does not rebuild");
  return program;
}

function pictureRecord(file: string, block: number, position: number, data: Uint8Array): PictureRecord {
  const shape = (bytes: Uint8Array, selector?: number): PictureShape => {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return {
      selector, height: view.getInt16(0, true), width: view.getInt16(2, true) * 8, x: view.getInt16(4, true), y: view.getInt16(6, true),
      frames: bytes[8]!, field: hex(bytes.subarray(9, 17)),
    };
  };
  const identity = { file, block, position, kind: "picture", bytes: data.length };
  let record: PictureRecord;
  const members = isPicture(data) ? [] : pictureMembers(data);
  if (isPicture(data)) record = { ...identity, layout: "picture", pictures: [shape(data)] };
  else if (members.length) record = { ...identity, layout: "members", pictures: members.map(({ data, selector }) => shape(data, selector)) };
  else if (file === "8X8D1.DAX" && block === 201 && data.length % 8 === 0) record = { ...identity, kind: "font", layout: "bitmap", pictures: [] };
  else throw new Error(`${file} block ${block} is in a picture archive and is not a picture`);
  // The blank record must have the original's headers, and differ from it only in pixels.
  const blank = blankPictureBytes(record);
  if (record.layout !== "bitmap") {
    let at = record.layout === "members" ? 1 : 0;
    if (record.layout === "members" && blank[0] !== data[0]) throw new Error(`${file} block ${block}: member count`);
    for (const picture of record.pictures) {
      const header = record.layout === "members" ? 21 : 17;
      if (!same(blank.subarray(at, at + header), data.subarray(at, at + header))) throw new Error(`${file} block ${block}: header does not rebuild`);
      at += header + picture.frames * picture.height * (picture.width / 8) * 4;
    }
  }
  return record;
}

function contentRecord(file: string, block: number | undefined, position: number | undefined, data: Uint8Array,
  blobs: { scripts: Blob; saves: Blob }): { group: string; record: ContentRecord } {
  const identity = (kind: string) => ({ file, block, position, kind, bytes: data.length });
  const table = (group: string, kind: string, rowBytes: number, named = false) => {
    const split = rows(data, rowBytes);
    const names = named ? Array.from(split, (_, row) => pascalName(data.subarray(row * rowBytes))) : undefined;
    return { group, record: { ...identity(kind), ...(names?.length === 1 ? { name: names[0] } : { names }), rowBytes, rows: split } };
  };
  let match: RegExpExecArray | null;
  if (/^ECL\d\.DAX$/.test(file)) return { group: "scripts", record: { ...identity("script"), blob: blobs.scripts.add(data) } };
  if (/^GEO\d\.DAX$/.test(file)) {
    if (data.length !== 1026) throw new Error(`${file} block ${block} is ${data.length} bytes, not a 16 by 16 map`);
    const plane = (index: number) => rows(data.subarray(2 + index * 256, 2 + (index + 1) * 256), 16);
    return { group: "maps", record: { ...identity("map"), map: { header: hex(data.subarray(0, 2)), northEast: plane(0), southWest: plane(1), flags: plane(2), extra: plane(3) } } };
  }
  if (/^WALLDEF\d\.DAX$/.test(file)) {
    if (data.length % 780) throw new Error(`${file} block ${block} is not a whole number of wall sets`);
    return { group: "walls", record: { ...identity("walls"), wallSets: Array.from({ length: data.length / 780 }, (_, set) => rows(data.subarray(set * 780, (set + 1) * 780), 156)) } };
  }
  if (/^ITEM\d\.DAX$/.test(file)) return table("items", "items", 63);
  if (file === "ITEMS") {
    // Two leading bytes, then one 16-byte row for each kind of item.
    if (data.length % 16 !== 2) throw new Error("ITEMS is not two bytes and 16-byte rows");
    return { group: "items", record: { ...identity("item-kinds"), rowBytes: 16, rows: [hex(data.subarray(0, 2)), ...rows(data.subarray(2), 16)] } };
  }
  if ((match = /^MON\d(CHA|ITM|SPC)\.DAX$/.exec(file))) {
    return match[1] === "CHA" ? table("monsters", "monster", 285, true)
      : match[1] === "ITM" ? table("monsters", "monster-items", 63) : table("monsters", "monster-effects", 9);
  }
  if ((match = /^CHRDAT[A-Z]\d\.(SAV|ITM|SPC)$/.exec(file))) {
    return match[1] === "SAV" ? table("characters", "character", 285, true)
      : match[1] === "ITM" ? table("characters", "character-items", 63) : table("characters", "character-effects", 9);
  }
  if (file === "POOL.CFG") {
    const text = String.fromCharCode(...data);
    if (!text.endsWith("\r\n")) throw new Error("POOL.CFG does not end with a line break");
    const lines = text.slice(0, -2).split("\r\n");
    if (lines.length < 4) throw new Error("POOL.CFG has fewer than four lines");
    // The third and fourth lines are the data path and the save path. A store installer writes its
    // own directory there. The port's data names the port's directories, as tools/gamedata.ts does at run time.
    lines[2] = ".\\";
    lines[3] = ".\\SAVE\\";
    return { group: "config", record: { ...identity("configuration"), bytes: lines.join("\r\n").length + 2, lines } };
  }
  if (/^SAVGAM[A-Z]\.DAT$/.test(file)) return { group: "saved-games", record: { ...identity("saved-game"), blob: blobs.saves.add(data) } };
  throw new Error(`${file}${block === undefined ? "" : ` block ${block}`} is not a file the converter knows. Classify it in tools/build-game-data.ts.`);
}

/** Build every file of `game/` in memory from the original 1.3 files. */
export function buildGameData(gameDirectory: string, map = instructionMap(gameDirectory)): Built {
  useGameVersion("1.3");
  const original = new Map(readdirSync(gameDirectory).filter((name) => !name.startsWith(".") && statSync(join(gameDirectory, name)).isFile())
    .sort().map((name) => [name.toUpperCase(), new Uint8Array(readFileSync(join(gameDirectory, name)))]));
  const out = new Map<string, Uint8Array>();
  const program = buildProgram(original, map, out);

  const blobs = { scripts: new Blob("content/scripts.bin"), saves: new Blob("content/saved-games.bin") };
  const groups = new Map<string, ContentRecord[]>();
  const pictures: PictureRecord[] = [];
  const add = (file: string, block: number | undefined, position: number | undefined, data: Uint8Array) => {
    const { group, record } = contentRecord(file, block, position, data, blobs);
    groups.set(group, [...(groups.get(group) ?? []), record]);
  };
  for (const [file, bytes] of original) {
    if (PROGRAM_FILE.test(file)) continue;
    if (!file.endsWith(".DAX")) { add(file, undefined, undefined, bytes); continue; }
    const entries = parseDax(file, bytes).entries;
    if (new Set(entries.map(({ id }) => id)).size !== entries.length) throw new Error(`${file} holds two blocks with one number`);
    for (const [position, { id, data }] of entries.entries()) {
      if (PICTURE_ARCHIVE.test(file)) pictures.push(pictureRecord(file, id, position, data));
      else add(file, id, position, data);
    }
  }
  out.set(blobs.scripts.file, blobs.scripts.bytes());
  out.set(blobs.saves.file, blobs.saves.bytes());

  const text = (value: unknown) => new TextEncoder().encode(stringify(value) + "\n");
  const header = (kind: string) => ({ format: GAME_DATA_FORMAT, formatVersion: GAME_DATA_VERSION, kind });
  const content = [...groups.keys()].sort().map((group) => `content/${group}.json`);
  for (const [group, records] of groups) out.set(`content/${group}.json`, text({ ...header(group), records }));
  out.set("pictures.json", text({ ...header("pictures"), records: pictures }));
  out.set("program.json", text(program));
  const manifest: GameDataManifest = {
    format: GAME_DATA_FORMAT, formatVersion: GAME_DATA_VERSION, gameVersion: "1.3",
    program: "program.json", content, pictures: "pictures.json",
    files: [...out].sort(([a], [b]) => a < b ? -1 : 1).map(([path, bytes]) => ({ path, bytes: bytes.length, sha256: sha256(bytes) })),
  };
  out.set("manifest.json", text(manifest));

  // Every record must come back from the written files byte for byte, pictures blank.
  const read: ReadGameData = (path) => out.get(path)!;
  const data: PortGameData = { manifest, program, content: [...groups.values()].flat(), pictures };
  const served = new Map(dataFiles(data, read).map(({ name, data }) => [name, data]));
  let contentBytesTotal = 0, pictureRecords = 0;
  for (const [file, bytes] of original) {
    if (PROGRAM_FILE.test(file)) continue;
    const back = served.get(file);
    if (!back) throw new Error(`${file} is not served from the converted data`);
    if (!file.endsWith(".DAX")) {
      if (file !== "POOL.CFG" && !same(back, bytes)) throw new Error(`${file} does not come back unchanged`);
      contentBytesTotal += back.length;
      continue;
    }
    const before = parseDax(file, bytes).entries, after = parseDax(file, back).entries;
    if (before.length !== after.length) throw new Error(`${file} comes back with ${after.length} blocks, not ${before.length}`);
    for (const [index, entry] of before.entries()) {
      const again = after[index]!;
      if (again.id !== entry.id || again.rawSize !== entry.rawSize) throw new Error(`${file} block ${entry.id} changed its place or size`);
      if (PICTURE_ARCHIVE.test(file)) pictureRecords++;
      else {
        if (!same(again.data, entry.data)) throw new Error(`${file} block ${entry.id} does not come back unchanged`);
        contentBytesTotal += entry.data.length;
      }
    }
  }
  if (served.size !== original.size - 2) throw new Error("The converted data serves a different set of files");
  for (const record of data.content) contentBytes(record, read);
  const measured = { ...program.measured, contentRecords: data.content.length, contentBytes: contentBytesTotal, pictureRecords };
  return { files: out, data, measured };
}

/** Files under a directory, as paths relative to it. */
export function listTree(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, encoding: "utf8" })
    .filter((name) => statSync(join(directory, name)).isFile()).map((name) => name.split("\\").join("/")).sort();
}

/** What differs between the built files and a directory. Empty when they match. */
export function compareGameData(built: Map<string, Uint8Array>, directory = gameDataDirectory): string[] {
  const differences: string[] = [];
  const present = new Set(listTree(directory));
  for (const [path, bytes] of built) {
    if (!present.delete(path)) differences.push(`missing: ${path}`);
    else if (!same(new Uint8Array(readFileSync(join(directory, path))), bytes)) differences.push(`differs: ${path}`);
  }
  for (const path of present) differences.push(`not written by the converter: ${path}`);
  return differences;
}

function main(): void {
  const args = process.argv.slice(2);
  const check = args.includes("--check");
  const outIndex = args.indexOf("--out");
  const target = outIndex >= 0 ? resolve(args[outIndex + 1]!) : gameDataDirectory;
  const source = args.find((arg, index) => !arg.startsWith("--") && (outIndex < 0 || index !== outIndex + 1));
  if (!source) throw new Error("Usage: npm run build:game-data -- <version 1.3 game directory> [--check] [--out <directory>]");
  const { files, measured } = buildGameData(resolve(source));
  if (check) {
    const differences = compareGameData(files, target);
    if (differences.length) {
      console.error(`${relative(repository, target) || target} differs from what the converter writes:`);
      for (const difference of differences) console.error(`  ${difference}`);
      console.error("Run npm run build:game-data -- <version 1.3 game directory> and commit game/.");
      process.exit(1);
    }
    console.log(`${relative(repository, target) || target} matches the converter (${files.size} files)`);
    return;
  }
  for (const stale of listTree(target)) if (!files.has(stale)) rmSync(join(target, stale));
  for (const [path, bytes] of files) {
    mkdirSync(dirname(join(target, path)), { recursive: true });
    writeFileSync(join(target, path), bytes);
  }
  const total = [...files.values()].reduce((size, bytes) => size + bytes.length, 0);
  console.log(`wrote ${files.size} files, ${total} bytes, to ${target}`);
  for (const [path, bytes] of [...files].sort((a, b) => b[1].length - a[1].length).slice(0, 6)) console.log(`  ${String(bytes.length).padStart(8)}  ${path}`);
  for (const [name, value] of Object.entries(measured)) console.log(`  ${name}: ${value}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
