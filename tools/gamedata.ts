import fs from "node:fs";
import path from "node:path";
import { parseDax, type DaxEntry } from "../src/lib/dax.js";
import { loadExecutable, type LoadImage } from "../src/lib/exepack.js";
import { dataFiles, GAME_DATA_FORMAT, loadPortGame, samePictureShape, type OriginalBlock, type PortGame } from "../src/runtime/game-data.js";
import { fromPortRoot } from "./port-root.js";

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

/**
 * Point the game at the port's own directories. POOL.CFG's third and fourth lines are the data
 * path and the save path. The installer of a store release writes its own install directory there.
 */
export function usePortPaths<T extends { name: string; data: Uint8Array }>(files: readonly T[]): T[] {
  return files.map((file) => {
    if (file.name.toUpperCase() !== "POOL.CFG") return file;
    const lines = new TextDecoder("latin1").decode(file.data).split("\r\n");
    if (lines.length < 4) return file;
    lines[2] = ".\\";
    lines[3] = ".\\SAVE\\";
    return { ...file, data: Uint8Array.from(lines.join("\r\n"), (character) => character.charCodeAt(0)) };
  });
}

export const valjevoGlyphSwaps: ReadonlyMap<number, number> = new Map([
  [111, 50], [50, 111], [112, 51], [51, 112],
]);

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
        const remapped = groupedWalls.data.map(tile => valjevoGlyphSwaps.get(tile) ?? tile);
        replacement.set(24, literalRecord(24, remapped));
        extra.push(literalRecord(25, remapped.subarray(780).map(tile => tile < 45 ? tile : (tile - 70) & 0xff)));
      } else {
        const remapped = firstAtlas.data.slice();
        for (const [from, to] of valjevoGlyphSwaps) {
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

/** The port's own game data, converted from version 1.3 by tools/build-game-data.ts. */
export const portGameRoot = fromPortRoot("game");

/** True when `dir` holds the port's own data files rather than the original game. */
export function isPortGameRoot(dir: string): boolean {
  const manifest = path.join(dir, "manifest.json");
  if (!fs.existsSync(manifest)) return false;
  try {
    return (JSON.parse(fs.readFileSync(manifest, "utf8")) as { format?: string }).format === GAME_DATA_FORMAT;
  } catch {
    return false;
  }
}

const portGames = new Map<string, PortGame>();

/** Everything the runner needs from a directory of the port's own data. */
export function portGame(root: string): PortGame {
  const key = path.resolve(root);
  let game = portGames.get(key);
  if (!game) {
    game = loadPortGame((file) => new Uint8Array(fs.readFileSync(path.join(key, file))));
    portGames.set(key, game);
  }
  return game;
}

/**
 * Which data to run from. POR_GAME_SOURCE=port uses the port's own data even when original files
 * are present. POR_GAME_SOURCE=original never falls back to it. Unset, original files win when a
 * directory of them is supplied, and the port's own data is used when none is.
 */
function gameSource(): "port" | "original" | undefined {
  const source = process.env.POR_GAME_SOURCE;
  if (source === undefined || source === "") return undefined;
  if (source !== "port" && source !== "original") throw new Error("POR_GAME_SOURCE must be port or original");
  return source;
}

function hasGameFiles(dir: string): boolean {
  const source = gameSource();
  if (isPortGameRoot(dir)) return source !== "original";
  return source !== "port" && fs.readdirSync(dir).some((name) => GAME_FILE.test(name));
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
  return gameSource() !== "original" && isPortGameRoot(portGameRoot) ? portGameRoot : null;
}

export function listGameFiles(root: string): string[] {
  if (isPortGameRoot(root)) return portGame(root).files.map(({ name }) => name).sort((a, b) => a.localeCompare(b));
  return fs
    .readdirSync(root)
    .filter((name) => fs.statSync(path.join(root, name)).isFile())
    .sort((a, b) => a.localeCompare(b));
}

export function requireBrowserGameRoot(): string {
  const explicit = process.env.POR_GAMEDATA;
  const required = ["START.EXE", "GAME.OVR", "ECL1.DAX"];
  let incomplete: { root: string; missing: string[] } | undefined;
  if (gameSource() === "port") {
    const found = findGameRoot();
    if (found) return path.resolve(found);
    throw new Error("The port's own game data was not found under game/. Run npm run build:game-data.");
  }
  for (const directory of gameDirectories(explicit ? [explicit] : defaultGameRoots())) {
    if (isPortGameRoot(directory)) {
      if (gameSource() === "original") continue;
      return path.resolve(directory);
    }
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
  // With no original files supplied, the game runs from the port's own data.
  if (!explicit && gameSource() !== "original" && isPortGameRoot(portGameRoot)) return portGameRoot;
  const location = explicit ? ` in ${path.resolve(explicit)}` : "";
  throw new Error(`Pool of Radiance data not found${location}. Set POR_GAMEDATA to the unpacked DOS game directory or place it under gamedata/.`);
}

/**
 * The port's own data with the pictures of the player's own original files in place of its blank ones
 * (#74): POR_CLASSIC_PICTURES names a folder of the first release, whose pictures the Classic display
 * then shows while the game stays version 1.3. A block is taken where the folder has it in the shape
 * 1.3 has (samePictureShape); any other stays blank. Read where it is: nothing is copied.
 */
export function classicPictureFiles(root: string, folder: string): { files: { name: string; data: Uint8Array }[]; used: number; total: number } {
  const game = portGame(root);
  const names = new Map(fs.readdirSync(folder).map((name) => [name.toUpperCase(), name]));
  const archives = new Map<string, Map<number, OriginalBlock>>();
  const blocks = (file: string) => {
    let found = archives.get(file);
    if (!found) {
      const name = names.get(file);
      const archive = name ? new Uint8Array(fs.readFileSync(path.join(folder, name))) : undefined;
      found = new Map(archive ? parseDax(file, archive).entries.map((entry) =>
        [entry.id, { data: entry.data, compressed: storedRecord(entry, archive).compressed }]) : []);
      archives.set(file, found);
    }
    return found;
  };
  let used = 0;
  const files = dataFiles(game.data, (file) => new Uint8Array(fs.readFileSync(path.join(root, file))), (record) => {
    const original = record.block === undefined ? undefined : blocks(record.file).get(record.block);
    const block = original && samePictureShape(record, original);
    if (block) used++;
    return block;
  });
  const overlay = game.files.find(({ name }) => name === game.data.program.overlayFile.name)!;
  return { files: [...files, overlay], used, total: game.data.pictures.length };
}

/** Every file the game can open, by name. From the port's own data, archives are re-packed and pictures are blank. */
export function gameFiles(root: string): { name: string; data: Uint8Array }[] {
  const pictures = process.env.POR_CLASSIC_PICTURES;
  if (isPortGameRoot(root) && pictures) {
    const { files, used, total } = classicPictureFiles(root, pictures);
    // Says where the Classic pictures come from, so a launch can be checked from its log.
    console.error(`POR_CLASSIC_PICTURES ${pictures} ${used}/${total}`);
    return files;
  }
  if (isPortGameRoot(root)) return portGame(root).files.map(({ name, data }) => ({ name, data }));
  return fs.readdirSync(root, { recursive: true, encoding: "utf8" })
    .filter((name) => !name.startsWith(".") && fs.statSync(path.join(root, name)).isFile())
    .map((name) => ({ name, data: new Uint8Array(fs.readFileSync(path.join(root, name))) }));
}

/** The program as it sits in memory. The port's own data holds it with every instruction blank. */
export function gameProgram(root: string): LoadImage {
  if (isPortGameRoot(root)) return portGame(root).program;
  return loadExecutable(readGameFile(root, "START.EXE"));
}

export function readGameFile(root: string, name: string): Uint8Array {
  const safe = path.basename(name);
  if (isPortGameRoot(root)) {
    const file = portGame(root).files.find((file) => file.name === safe.toUpperCase());
    if (!file) throw new Error(`${safe} is not among the port's game data. The program file is not: use gameProgram.`);
    return file.data;
  }
  const bytes = fs.readFileSync(path.join(root, safe));
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}
