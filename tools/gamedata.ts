import fs from "node:fs";
import path from "node:path";

const GAME_FILE = /\.(dax|exe|ovr|ex_|pic)$/i;

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
