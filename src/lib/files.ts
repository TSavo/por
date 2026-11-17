/** SCAFFOLDING loader used by the browser shell. Not the port. */
import { parseDax, type DaxFile } from "./dax.js";
import { scriptFromBlock, type Script } from "./ecl.js";
import { decodePicture, isPicture, type Picture } from "./picture.js";
import {
  glyphsFromPicture,
  loadWalldef,
  parseGeo,
  SYMBOL_BASE,
  wallType,
  type GeoMap,
  type GlyphSet,
  type ViewportAssets,
} from "./world.js";

export interface ByteSource {
  list(): Promise<string[]>;
  read(name: string): Promise<Uint8Array>;
}

export interface LoadedArea {
  area: number;
  geoFile: string;
  geo: GeoMap;
  wallFile: string;
  glyphFiles: string[];
  assets: ViewportAssets;
}

export interface LoadedGame {
  files: string[];
  titleFile: string | null;
  title: Picture | null;
  titlePages: Picture[];
  portraits: { file: string; id: number; picture: Picture }[];
  combat: { file: string; id: number; picture: Picture }[];
  area: LoadedArea | null;
  eclFile: string | null;
  eclBlockId: number | null;
  ecl: Script | null;
  notes: string[];
}

function findFile(files: string[], pattern: RegExp): string | undefined {
  return files.find((name) => pattern.test(name));
}

function areaNumber(name: string, prefix: string): number | null {
  const match = new RegExp(`^${prefix}(\\d+)\\.dax$`, "i").exec(name);
  if (!match) return null;
  return Number(match[1]);
}

async function readDax(source: ByteSource, name: string): Promise<DaxFile | null> {
  try {
    return parseDax(name, await source.read(name));
  } catch {
    return null;
  }
}

function largestInFile(file: DaxFile, masked: boolean): { id: number; picture: Picture } | null {
  let best: { id: number; picture: Picture } | null = null;
  for (const entry of file.entries) {
    if (!isPicture(entry.data)) continue;
    const picture = decodePicture(entry.data, masked ? 13 : null);
    const area = picture.width * picture.height;
    if (!best || area > best.picture.width * best.picture.height) best = { id: entry.id, picture };
  }
  return best;
}

async function largestPictures(
  source: ByteSource,
  files: string[],
  pattern: RegExp,
  masked: boolean,
  limit: number,
): Promise<{ file: string; id: number; picture: Picture }[]> {
  const found: { file: string; id: number; picture: Picture; area: number }[] = [];
  for (const name of files.filter((file) => pattern.test(file) && /\.dax$/i.test(file))) {
    const dax = await readDax(source, name);
    if (!dax) continue;
    const hit = largestInFile(dax, masked);
    if (!hit) continue;
    found.push({ file: name, id: hit.id, picture: hit.picture, area: hit.picture.width * hit.picture.height });
  }
  return found
    .sort((a, b) => b.area - a.area)
    .slice(0, limit)
    .map(({ file, id, picture }) => ({ file, id, picture }));
}

export async function loadGame(source: ByteSource): Promise<LoadedGame> {
  const files = [...(await source.list())].sort((a, b) => a.localeCompare(b));
  const notes: string[] = [];
  const titleName =
    findFile(files, /^title\.dax$/i) ??
    findFile(files, /title/i) ??
    null;
  let title: Picture | null = null;
  const titlePages: Picture[] = [];
  if (titleName) {
    const dax = await readDax(source, titleName);
    if (dax) {
      for (const entry of dax.entries) {
        if (!isPicture(entry.data)) continue;
        const picture = decodePicture(entry.data, null);
        titlePages.push(picture);
      }
      title = titlePages[0] ?? null;
      notes.push(`${titleName}: ${titlePages.length} picture block(s)`);
    } else {
      notes.push(`${titleName} did not parse as a DAX container`);
    }
  } else {
    notes.push("no TITLE file in the game directory");
  }

  const portraits = await largestPictures(source, files, /^(head|body)/i, false, 2);
  const combat = await largestPictures(source, files, /^(sprit|comspr|cpic)/i, true, 2);

  const area = await loadFirstArea(source, files, notes);

  let eclFile: string | null = null;
  let eclBlockId: number | null = null;
  let ecl: Script | null = null;
  const eclName = files.find((f) => /^ecl\d*\.dax$/i.test(f));
  if (eclName) {
    const dax = await readDax(source, eclName);
    if (dax && dax.entries[0]) {
      eclFile = eclName;
      eclBlockId = dax.entries[0].id;
      try {
        ecl = scriptFromBlock(dax.entries[0].data);
        notes.push(`${eclName} block ${eclBlockId}: ${ecl.length} script bytes`);
      } catch (error) {
        notes.push(`${eclName}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } else {
    notes.push("no ECL*.DAX in the game directory");
  }

  return {
    files,
    titleFile: titleName,
    title,
    titlePages,
    portraits,
    combat,
    area,
    eclFile,
    eclBlockId,
    ecl,
    notes,
  };
}

async function loadFirstArea(source: ByteSource, files: string[], notes: string[]): Promise<LoadedArea | null> {
  const geos = files
    .map((name) => ({ name, area: areaNumber(name, "GEO") }))
    .filter((item): item is { name: string; area: number } => item.area !== null)
    .sort((a, b) => a.area - b.area);
  for (const geo of geos) {
    const wallName = files.find((f) => areaNumber(f, "WALLDEF") === geo.area);
    const glyphName = files.find((f) => areaNumber(f, "8X8D") === geo.area);
    if (!wallName) {
      notes.push(`${geo.name} has no matching WALLDEF${geo.area}`);
      continue;
    }
    const geoDax = await readDax(source, geo.name);
    const wallDax = await readDax(source, wallName);
    if (!geoDax || !wallDax) continue;
    const geoEntry = geoDax.entries.find((e) => e.rawSize === 0x402) ?? geoDax.entries[0];
    if (!geoEntry) continue;
    let map: GeoMap;
    try {
      map = parseGeo(geoEntry.data, geoEntry.id);
    } catch (error) {
      notes.push(`${geo.name}: ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    const wallBlocks = wallDax.entries.filter((e) => e.rawSize >= 780).slice(0, 3);
    const walldefs = wallBlocks.map((entry, index) => loadWalldef(entry.data, index));
    const glyphs: GlyphSet[] = [];
    const glyphFiles: string[] = [];
    const baseFile = files.find((f) => /^8x8d1\.dax$/i.test(f)) ?? glyphName;
    if (baseFile) {
      const base = await readDax(source, baseFile);
      const font = base?.entries.find((e) => isPicture(e.data) && decodePicture(e.data, 13).itemCount === 45);
      if (font) {
        glyphs.push(glyphsFromPicture(decodePicture(font.data, 13), SYMBOL_BASE[0]));
        glyphFiles.push(`${baseFile}#${font.id}`);
      }
    }
    if (glyphName) {
      const tiles = await readDax(source, glyphName);
      if (tiles) {
        wallBlocks.forEach((wall, index) => {
          const match =
            tiles.entries.find((e) => e.id === wall.id && isPicture(e.data)) ??
            tiles.entries.find((e) => isPicture(e.data) && decodePicture(e.data, 13).itemCount >= 60);
          if (!match) return;
          const picture = decodePicture(match.data, 13);
          const base = SYMBOL_BASE[index + 1];
          if (base === undefined) return;
          glyphs.push(glyphsFromPicture(picture, base));
          glyphFiles.push(`${glyphName}#${match.id}`);
        });
      }
    }
    notes.push(
      `area ${geo.area}: ${geo.name} block ${geoEntry.id}, ${wallName} (${walldefs.length} sets), glyphs ${glyphFiles.join(", ") || "none"}`,
    );
    return {
      area: geo.area,
      geoFile: geo.name,
      geo: map,
      wallFile: wallName,
      glyphFiles,
      assets: { map, walldefs, glyphs },
    };
  }
  notes.push("no GEO/WALLDEF pair decoded");
  return null;
}

/** A square with a wall in view, so the first picture is not an empty sky. */
export function interestingView(map: GeoMap): { x: number; y: number; dir: number } {
  let best = { x: 8, y: 8, dir: 0, score: -1 };
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      for (const dir of [0, 2, 4, 6]) {
        const dx = dir === 2 ? 1 : dir === 6 ? -1 : 0;
        const dy = dir === 0 ? -1 : dir === 4 ? 1 : 0;
        let score = 0;
        if (wallType(map, dir, x, y) > 0) score += 3;
        if (wallType(map, dir, x + dx, y + dy) > 0) score += 4;
        if (wallType(map, dir, x + dx * 2, y + dy * 2) > 0) score += 2;
        score -= Math.abs(x - 8) + Math.abs(y - 8);
        if (score > best.score) best = { x, y, dir, score };
      }
    }
  }
  return { x: best.x, y: best.y, dir: best.dir };
}
