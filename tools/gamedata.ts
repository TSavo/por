import fs from "node:fs";
import path from "node:path";
import { parseDax, type DaxEntry } from "../src/lib/dax.js";

const GAME_FILE = /\.(dax|exe|ovr|ex_|pic)$/i;

function storedRecord(entry: DaxEntry, archive: Uint8Array, id = entry.id) {
  const start = 2 + new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint16(0, true) + entry.offset;
  return { id, rawSize: entry.rawSize, compressed: archive.subarray(start, start + entry.compSize) };
}

function literalRecord(id: number, data: Uint8Array) {
  // Keep each run short enough for the guest's signed-byte run counter.
  const compressed = new Uint8Array(data.length + Math.ceil(data.length / 64));
  let write = 0;
  for (let start = 0; start < data.length; start += 64) {
    const chunk = data.subarray(start, start + 64);
    compressed[write++] = chunk.length - 1;
    compressed.set(chunk, write);
    write += chunk.length;
  }
  return { id, rawSize: data.length, compressed };
}

/** Make the supplied Valjevo wall sets available through the guest's DAX loader. */
export function mountValjevoWallPieces(files: readonly { name: string; data: Uint8Array }[]) {
  const archives = new Map(files.map(file => [file.name.toUpperCase(), file.data]));
  const walls = archives.get("WALLDEF5.DAX");
  const wallEntries = walls && parseDax("WALLDEF5.DAX", walls).entries;
  const groupedWalls = wallEntries?.find(({ id, rawSize }) => id === 24 && rawSize === 1560);
  const tiles = archives.get("8X8D5.DAX");
  const valjevoAtlases = tiles && parseDax("8X8D5.DAX", tiles).entries;
  const firstAtlas = valjevoAtlases?.find(({ id, rawSize }) => id === 241 && rawSize === 2257);
  const secondAtlas = valjevoAtlases?.find(({ id, rawSize }) => id === 242 && rawSize === 2257);
  // The guest adds 70 to every local wall index >= 45 when loading slot 2.
  // Move the two cross-bank references in its unreachable 70–114 range
  // into reachable positions in slot 1, keeping both sets' pixels intact.
  const split = groupedWalls && firstAtlas && secondAtlas &&
    !wallEntries?.some(({ id }) => id === 25) &&
    !valjevoAtlases?.some(({ id }) => id === 25);
  const renumber = new Map([[111, 50], [50, 111], [112, 51], [51, 112]]);
  return files.map(file => {
    const name = file.name.toUpperCase();
    if (name !== "WALLDEF5.DAX" && name !== "8X8D5.DAX") return file;
    const donorName = name.replace("5.DAX", "2.DAX");
    const donor = archives.get(donorName);
    const existing = parseDax(name, file.data).entries;
    const has = (id: number) => existing.some(entry => entry.id === id);
    const extra = donor ? parseDax(donorName, donor).entries
      .filter(({ id }) => (id === 2 || id === 4) && !has(id))
      .map(entry => storedRecord(entry, donor)) : [];
    const replacement = new Map<number, ReturnType<typeof literalRecord>>();
    if (split && groupedWalls && firstAtlas && secondAtlas) {
      if (name === "WALLDEF5.DAX") {
        const remapped = groupedWalls.data.map(tile => renumber.get(tile) ?? tile);
        replacement.set(24, literalRecord(24, remapped));
        extra.push(literalRecord(25, remapped.subarray(780).map(tile => tile < 45 ? tile : (tile - 70) & 0xff)));
      } else {
        const remapped = firstAtlas.data.slice();
        for (const [from, to] of renumber) {
          const start = 17 + (from - 46) * 32;
          remapped.set(firstAtlas.data.subarray(start, start + 32), 17 + (to - 46) * 32);
        }
        replacement.set(241, literalRecord(241, remapped));
        extra.push(storedRecord(secondAtlas, file.data, 25));
      }
    }
    if (!extra.length) return file;

    const records = [...existing.map(entry => replacement.get(entry.id) ?? storedRecord(entry, file.data)), ...extra];
    const directorySize = records.length * 9;
    const data = new Uint8Array(2 + directorySize + records.reduce((size, { compressed }) => size + compressed.length, 0));
    const directory = new DataView(data.buffer);
    directory.setUint16(0, directorySize, true);
    let offset = 0;
    for (const [index, { id, rawSize, compressed }] of records.entries()) {
      const address = 2 + index * 9;
      directory.setUint8(address, id);
      directory.setUint32(address + 1, offset, true);
      directory.setUint16(address + 5, rawSize, true);
      directory.setUint16(address + 7, compressed.length, true);
      data.set(compressed, 2 + directorySize + offset);
      offset += compressed.length;
    }
    return { ...file, data };
  });
}

function hasGameFiles(dir: string): boolean {
  return fs.readdirSync(dir).some((name) => GAME_FILE.test(name));
}

const defaultGameRoots = () => [path.resolve("gamedata"), "/workspace/gamedata", "/workspace/uploads/pool"];

function* gameDirectories(candidates: (string | undefined)[]) {
  for (const candidate of candidates) {
    if (!candidate || !fs.statSync(candidate, { throwIfNoEntry: false })?.isDirectory()) continue;
    yield candidate;
    for (const child of fs.readdirSync(candidate, { withFileTypes: true })) {
      const nested = path.join(candidate, child.name);
      if (child.isDirectory() || (child.isSymbolicLink() && fs.statSync(nested, { throwIfNoEntry: false })?.isDirectory())) yield nested;
    }
  }
}

/** First directory that actually contains Gold Box files. Never searches outside the candidates. */
export function findGameRoot(explicit?: string): string | null {
  for (const directory of gameDirectories([explicit, process.env.POR_GAMEDATA, ...defaultGameRoots()])) {
    if (hasGameFiles(directory)) return directory;
  }
  return null;
}

export function listGameFiles(root: string): string[] {
  return fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

export function requireBrowserGameRoot(): string {
  const explicit = process.env.POR_GAMEDATA;
  const required = ["START.EXE", "GAME.OVR", "ECL1.DAX"];
  let incomplete: { root: string; missing: string[] } | undefined;
  for (const directory of gameDirectories(explicit ? [explicit] : defaultGameRoots())) {
    const names = new Set(listGameFiles(directory).map(name => name.toUpperCase()));
    const missing = required.filter(name => !names.has(name));
    if (!missing.length) return path.resolve(directory);
    if (missing.length < required.length && (!incomplete || missing.length < incomplete.missing.length)) {
      incomplete = { root: path.resolve(directory), missing };
    }
  }
  if (incomplete) {
    throw new Error(`Incomplete Pool of Radiance data in ${incomplete.root}. Missing ${incomplete.missing.join(", ")}. Use the complete unpacked DOS game directory.`);
  }
  const location = explicit ? ` in ${path.resolve(explicit)}` : "";
  throw new Error(`Pool of Radiance data not found${location}. Set POR_GAMEDATA to the unpacked DOS game directory or place it under gamedata/.`);
}

export function readGameFile(root: string, name: string): Uint8Array {
  const safe = path.basename(name);
  const bytes = fs.readFileSync(path.join(root, safe));
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
