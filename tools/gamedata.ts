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
  const groupedWalls = walls && parseDax("WALLDEF5.DAX", walls).entries.find(({ id, rawSize }) => id === 24 && rawSize === 1560);
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
    if (groupedWalls && !has(25)) {
      // Block 24 loads two consecutive 780-byte wall sets. The scripts also
      // request set 25 directly, which uses the second set and its atlas 242.
      if (name === "WALLDEF5.DAX") extra.push(literalRecord(25, groupedWalls.data.subarray(780)));
      else {
        const atlas = existing.find(({ id }) => id === 242);
        if (atlas) extra.push(storedRecord(atlas, file.data, 25));
      }
    }
    if (!extra.length) return file;

    const records = [...existing.map(entry => storedRecord(entry, file.data)), ...extra];
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
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).some((name) => GAME_FILE.test(name));
}

/** First directory that actually contains Gold Box files. Never searches outside the candidates. */
export function findGameRoot(explicit?: string): string | null {
  const candidates = [
    explicit,
    process.env.POR_GAMEDATA,
    path.resolve("gamedata"),
    "/workspace/gamedata",
    "/workspace/uploads/pool",
  ].filter((value): value is string => Boolean(value));
  for (const candidate of candidates) {
    if (hasGameFiles(candidate)) return candidate;
    if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) continue;
    for (const child of fs.readdirSync(candidate)) {
      const nested = path.join(candidate, child);
      if (hasGameFiles(nested)) return nested;
    }
  }
  return null;
}

export function listGameFiles(root: string): string[] {
  return fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

export function readGameFile(root: string, name: string): Uint8Array {
  const safe = path.basename(name);
  const bytes = fs.readFileSync(path.join(root, safe));
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
