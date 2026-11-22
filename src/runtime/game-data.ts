import { buildDax, encodeRuns } from "../lib/dax.js";
import type { LoadImage } from "../lib/exepack.js";
import type { DosFile } from "./dos.js";

/**
 * The port's own game data: the files under `game/`, described in docs/GAME-DATA.md.
 *
 * `tools/build-game-data.ts` writes them from the version 1.3 files. This module reads them
 * back and builds what the runner needs with no original file present: the program's memory
 * image, the overlay file the overlay loader reads, and the game's data files in the container
 * format the game's own loaders expect. Pictures come back blank, in their original shape.
 */
export const GAME_DATA_FORMAT = "pool-of-radiance-game-data";
export const GAME_DATA_VERSION = 2;

/** Read one file under `game/` by its path relative to that folder. */
export type ReadGameData = (path: string) => Uint8Array;

export interface GameDataManifest {
  format: typeof GAME_DATA_FORMAT;
  formatVersion: number;
  gameVersion: string;
  /** The program description. */
  program: string;
  /** The files that list game content records, and the one that lists picture records. */
  content: string[];
  pictures: string;
  /** The catalogue of 8 by 8 tiles: see TileCatalogue. */
  tiles: string;
  /** Every other file under `game/`, with its size and SHA-256. */
  files: { path: string; bytes: number; sha256: string }[];
}

export interface BlobReference { file: string; offset: number; length: number }

export interface OverlayData {
  index: number;
  /** Paragraph of the overlay's stub segment in the memory image. */
  headerParagraph: number;
  /** Where the overlay's code sat in the overlay file. The overlay loader's table names it. */
  fileOffset: number;
  codeBytes: number;
  /** Two header words the overlay manager keeps: its swap state and the previous overlay's paragraph. */
  memorySwap: number;
  previous: number;
  /** The offset, in the overlay's code, of each procedure the resident program can call. */
  entries: number[];
  /** Where the overlay's bytes are, instructions blanked. */
  code: BlobReference;
  /** Offsets in the overlay's code of the segment words a loader would relocate. */
  relocations: number[];
}

export interface ProgramData {
  format: typeof GAME_DATA_FORMAT;
  formatVersion: number;
  gameVersion: string;
  entry: { segment: number; offset: number };
  stack: { segment: number; pointer: number };
  /** The memory image, loaded at paragraph 0, with instructions and the overlay table blanked. */
  image: BlobReference;
  overlayFile: { name: string; signature: string; bytes: number };
  overlays: OverlayData[];
  /** Why the image carries no relocations of its own. */
  imageRelocations: string;
  measured: Record<string, number>;
}

/** What identifies a record to the game: the DOS file, and for an archive the block and its place. */
export interface RecordIdentity {
  file: string;
  block?: number;
  position?: number;
  /**
   * For an archive block: its packed size in the original archive. The reader packs the block to
   * exactly this size, so the game reads and allocates what it did from the original file.
   */
  packedBytes?: number;
  kind: string;
  bytes: number;
}

/** A game content record. Exactly one of the data forms is present. */
export interface ContentRecord extends RecordIdentity {
  /** Fixed-size rows, each a string of hexadecimal bytes. */
  rows?: string[];
  rowBytes?: number;
  /** A text file: its lines, each ended by CR LF in the file. */
  lines?: string[];
  /** A map: two header bytes and four planes of 16 rows of 16 squares. */
  map?: { header: string; northEast: string[]; southWest: string[]; flags: string[]; extra: string[] };
  /** Wall definitions: for each set, five rows of 156 symbol numbers. */
  wallSets?: string[][];
  /** Binary content kept in a blob file. */
  blob?: BlobReference;
  /** Names read out of the record, for the reader. The bytes above are what the game gets. */
  name?: string;
  names?: string[];
}

export interface PictureShape {
  /** PIC and SPRIT records prefix each picture with a four-byte selector. */
  selector?: number;
  height: number;
  /** Width in pixels: a multiple of 8. */
  width: number;
  x: number;
  y: number;
  frames: number;
  /** Eight header bytes the game keeps with the picture. */
  field: string;
  /**
   * For each frame, the SHA-256 of its pixels as colour numbers, one byte a pixel, row by row:
   * what `frameSlice(decodePicture(record))` gives. A hash names the original picture without
   * holding it. For a set of 8 by 8 tiles this is the hash a `tile:` artwork key carries.
   */
  frameHashes: string[];
  /**
   * Battlefield terrain only: for each frame, the same hash of each 8 by 8 cell, row by row.
   * A `battle-tile:` artwork key carries one of these.
   */
  cellHashes?: string[][];
}

/** A picture record: its identity and shape, and no pixels. */
export interface PictureRecord extends RecordIdentity {
  layout: "picture" | "members" | "bitmap";
  pictures: PictureShape[];
}

/**
 * Every distinct 8 by 8 tile of the wall and scenery sets, by the hash of its pixels, with the
 * places it is stored (`archive:block:index`). A tile with transparent pixels also lists the hash
 * of what a screen cell shows when one solid colour is behind it, for each of the 16 colours:
 * the first-person view draws such a tile over the sky or ground colour.
 */
export interface TileFingerprint {
  hash: string;
  sources: string[];
  overColour?: string[];
  /** One byte per row, with a set bit where the Enhanced artwork is cut out. */
  transparentMask?: string;
}

export interface TileCatalogue {
  format: string;
  formatVersion: number;
  kind: "tiles";
  transparentColour: number;
  tiles: TileFingerprint[];
}

export interface ContentFile { format: string; formatVersion: number; kind: string; records: ContentRecord[] }
export interface PictureFile { format: string; formatVersion: number; kind: string; records: PictureRecord[] }

const fromHex = (hex: string): Uint8Array => {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
};

function join(parts: readonly Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((size, part) => size + part.length, 0));
  let at = 0;
  for (const part of parts) { out.set(part, at); at += part.length; }
  return out;
}

const json = <T>(read: ReadGameData, path: string): T => JSON.parse(new TextDecoder().decode(read(path))) as T;

function blob(read: ReadGameData, { file, offset, length }: BlobReference): Uint8Array {
  const bytes = read(file);
  if (offset + length > bytes.length) throw new Error(`${file} is shorter than the record at ${offset}+${length}`);
  return bytes.subarray(offset, offset + length);
}

/** The bytes the game reads for a content record. */
export function contentBytes(record: ContentRecord, read: ReadGameData): Uint8Array {
  let bytes: Uint8Array;
  if (record.rows) bytes = join(record.rows.map(fromHex));
  else if (record.lines) bytes = Uint8Array.from(record.lines.map((line) => line + "\r\n").join(""), (c) => c.charCodeAt(0));
  else if (record.map) {
    const { header, northEast, southWest, flags, extra } = record.map;
    bytes = join([header, ...northEast, ...southWest, ...flags, ...extra].map(fromHex));
  } else if (record.wallSets) bytes = join(record.wallSets.flat().map(fromHex));
  else if (record.blob) bytes = blob(read, record.blob);
  else throw new Error(`${recordName(record)} carries no data`);
  if (bytes.length !== record.bytes) throw new Error(`${recordName(record)} decodes to ${bytes.length} bytes, not ${record.bytes}`);
  return bytes;
}

/** A blank picture record of the original's shape: the headers the game reads, and zero pixels. */
export function blankPictureBytes(record: PictureRecord): Uint8Array {
  const bytes = new Uint8Array(record.bytes);
  if (record.layout === "bitmap") return bytes;
  const view = new DataView(bytes.buffer);
  let at = 0;
  if (record.layout === "members") bytes[at++] = record.pictures.length;
  for (const picture of record.pictures) {
    if (record.layout === "members") { view.setUint32(at, picture.selector ?? 0, true); at += 4; }
    view.setInt16(at, picture.height, true);
    view.setInt16(at + 2, picture.width / 8, true);
    view.setInt16(at + 4, picture.x, true);
    view.setInt16(at + 6, picture.y, true);
    bytes[at + 8] = picture.frames;
    bytes.set(fromHex(picture.field), at + 9);
    at += 17 + picture.frames * picture.height * (picture.width / 8) * 4;
  }
  if (at !== record.bytes) throw new Error(`${recordName(record)} describes ${at} bytes, not ${record.bytes}`);
  return bytes;
}

export const recordName = ({ file, block }: RecordIdentity): string => block === undefined ? file : `${file} block ${block}`;

export interface PortGameData {
  manifest: GameDataManifest;
  program: ProgramData;
  content: ContentRecord[];
  pictures: PictureRecord[];
}

export function readGameData(read: ReadGameData): PortGameData {
  const manifest = json<GameDataManifest>(read, "manifest.json");
  if (manifest.format !== GAME_DATA_FORMAT) throw new Error("game/manifest.json is not Pool of Radiance game data");
  if (manifest.formatVersion !== GAME_DATA_VERSION) {
    throw new Error(`game/ is format version ${manifest.formatVersion}; this build reads version ${GAME_DATA_VERSION}. Run npm run build:game-data.`);
  }
  return {
    manifest,
    program: json<ProgramData>(read, manifest.program),
    content: manifest.content.flatMap((path) => json<ContentFile>(read, path).records),
    pictures: json<PictureFile>(read, manifest.pictures).records,
  };
}

/** The 32-byte header and the five-byte entries of one overlay's stub segment. */
export function overlayStub(overlay: OverlayData, relocationBytes = overlay.relocations.length * 2): Uint8Array {
  const bytes = new Uint8Array(32 + overlay.entries.length * 5);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0xcd; bytes[1] = 0x3f;
  view.setUint16(2, overlay.memorySwap, true);
  view.setUint32(4, overlay.fileOffset, true);
  view.setUint16(8, overlay.codeBytes, true);
  view.setUint16(10, relocationBytes, true);
  view.setUint16(12, overlay.entries.length, true);
  view.setUint16(14, overlay.previous, true);
  overlay.entries.forEach((entry, index) => {
    const at = 32 + index * 5;
    bytes[at] = 0xcd; bytes[at + 1] = 0x3f;
    view.setUint16(at + 2, entry, true);
  });
  return bytes;
}

/** The program as it sits in memory: the stored image with the overlay table written back in. */
export function programImage(program: ProgramData, read: ReadGameData): LoadImage {
  const image = blob(read, program.image).slice();
  for (const overlay of program.overlays) image.set(overlayStub(overlay), overlay.headerParagraph * 16);
  return {
    image, relocations: [], packed: false,
    cs: program.entry.segment, ip: program.entry.offset, ss: program.stack.segment, sp: program.stack.pointer,
  };
}

/** The overlay file as the game's overlay loader finds it: every overlay at its place, instructions blank. */
export function overlayFile(program: ProgramData, read: ReadGameData): Uint8Array {
  const { signature, bytes: size } = program.overlayFile;
  const bytes = new Uint8Array(size);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < signature.length; i++) bytes[i] = signature.charCodeAt(i);
  view.setUint32(signature.length, size - signature.length - 4, true);
  for (const overlay of program.overlays) {
    bytes.set(blob(read, overlay.code), overlay.fileOffset);
    overlay.relocations.forEach((offset, index) => view.setUint16(overlay.fileOffset + overlay.codeBytes + index * 2, offset, true));
  }
  return bytes;
}

/** An archive block from the player's own files: its bytes, and as their archive packs them. */
export interface OriginalBlock { data: Uint8Array; compressed: Uint8Array }

/**
 * `original`, a picture block from the player's own files, where it has the shape of `record`: the same
 * size and the same headers (the blank record's), so the game reads what it does from the port's own
 * data, and packed to the block's packed size, so it allocates the same. Their own packing is kept
 * where it has that size (the port's packer is not always as short as the original's). Otherwise undefined.
 */
export function samePictureShape(record: PictureRecord, original: OriginalBlock): OriginalBlock | undefined {
  const { data } = original;
  if (data.length !== record.bytes) return;
  const blank = blankPictureBytes(record);
  if (record.layout !== "bitmap") {
    // Only the pixels may differ: compare everything else.
    let at = 0;
    const header = record.layout === "members" ? 21 : 17;
    if (record.layout === "members") { if (data[0] !== blank[0]) return; at = 1; }
    for (const picture of record.pictures) {
      for (let i = at; i < at + header; i++) if (data[i] !== blank[i]) return;
      at += header + picture.frames * picture.height * (picture.width / 8) * 4;
    }
  }
  if (record.packedBytes === undefined || original.compressed.length === record.packedBytes) return original;
  try { return { data, compressed: encodeRuns(data, record.packedBytes) }; } catch { return; }
}

/**
 * The game's data files, re-packed for its own loaders. Archives keep their blocks in the original order.
 * Pictures are blank, unless `picture` gives a record the player's own (tools/gamedata.ts).
 */
export function dataFiles(data: PortGameData, read: ReadGameData, picture?: (record: PictureRecord) => OriginalBlock | undefined): DosFile[] {
  const archives = new Map<string, { position: number; id: number; data: Uint8Array; packedBytes?: number; compressed?: Uint8Array }[]>();
  const files: DosFile[] = [];
  const add = (record: RecordIdentity, bytes: Uint8Array, compressed?: Uint8Array) => {
    if (record.block === undefined) { files.push({ name: record.file, data: bytes }); return; }
    const blocks = archives.get(record.file) ?? [];
    archives.set(record.file, blocks);
    blocks.push({ position: record.position ?? blocks.length, id: record.block, data: bytes, packedBytes: record.packedBytes, compressed });
  };
  for (const record of data.content) add(record, contentBytes(record, read));
  for (const record of data.pictures) {
    const own = picture?.(record);
    add(record, own?.data ?? blankPictureBytes(record), own?.compressed);
  }
  for (const [name, blocks] of archives) {
    files.push({ name, data: buildDax(blocks.sort((a, b) => a.position - b.position)) });
  }
  return files.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
}

export interface PortGame {
  data: PortGameData;
  program: LoadImage;
  /** Every file the game opens, the overlay file included. There is no program file. */
  files: DosFile[];
}

/** Everything the runner needs, from `game/` alone. */
export function loadPortGame(read: ReadGameData): PortGame {
  const data = readGameData(read);
  const files = dataFiles(data, read);
  files.push({ name: data.program.overlayFile.name, data: overlayFile(data.program, read) });
  return { data, program: programImage(data.program, read), files };
}
