import fs from "node:fs";
import path from "node:path";
import { parseDax } from "../src/lib/dax.js";

const GAME_FILE = /\.(dax|exe|ovr|ex_|pic)$/i;

/** Keep the art carried from the Valjevo approach available when loading a tower save. */
export function mountValjevoWallPieces(files: readonly { name: string; data: Uint8Array }[]) {
  const archives = new Map(files.map(file => [file.name.toUpperCase(), file.data]));
  return files.map(file => {
    const name = file.name.toUpperCase();
    if (name !== "WALLDEF5.DAX" && name !== "8X8D5.DAX") return file;
    const donorName = name.replace("5.DAX", "2.DAX");
    const donor = archives.get(donorName);
    if (!donor) return file;

    const existing = parseDax(name, file.data).entries;
    const extra = parseDax(donorName, donor).entries.filter(({ id }) =>
      (id === 2 || id === 4) && !existing.some(entry => entry.id === id));
    if (!extra.length) return file;

    const records = [
      ...existing.map(entry => ({ entry, archive: file.data })),
      ...extra.map(entry => ({ entry, archive: donor })),
    ];
    const directorySize = records.length * 9;
    const data = new Uint8Array(2 + directorySize + records.reduce((size, { entry }) => size + entry.compSize, 0));
    const directory = new DataView(data.buffer);
    directory.setUint16(0, directorySize, true);
    let offset = 0;
    for (const [index, { entry, archive }] of records.entries()) {
      const address = 2 + index * 9;
      directory.setUint8(address, entry.id);
      directory.setUint32(address + 1, offset, true);
      directory.setUint16(address + 5, entry.rawSize, true);
      directory.setUint16(address + 7, entry.compSize, true);
      const payload = 2 + new DataView(archive.buffer, archive.byteOffset, archive.byteLength).getUint16(0, true) + entry.offset;
      data.set(archive.subarray(payload, payload + entry.compSize), 2 + directorySize + offset);
      offset += entry.compSize;
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
