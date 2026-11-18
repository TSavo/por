import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture, frameSlice, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const [tracePath, manifestPath, reportPath] = process.argv.slice(2);
if (!tracePath || !manifestPath || !reportPath) {
  throw new Error("Usage: tsx tools/route-art-coverage.ts <tile-inventory.jsonl> <manifest.json> <report.json>");
}
const root = findGameRoot();
if (!root) throw new Error("Original game data is required for source tile matching");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { assets: Record<string, string> };
const trace = readFileSync(tracePath, "utf8").trim();
if (!trace) throw new Error("The route trace contains no exploration frames");
const frames = trace.split(/\r?\n/).map((line) => JSON.parse(line) as [number, number, string][]);

const sourceByHash = new Map<string, { archive: string; block: number; frame: number }[]>();
for (const archive of listGameFiles(root).filter((name) => /^8X8D\d+\.DAX$/i.test(name))) {
  for (const { id, data } of parseDax(archive, readGameFile(root, archive)).entries) {
    if (!isPicture(data)) continue;
    const picture = decodePicture(data);
    if (picture.width !== 8 || picture.height !== 8) continue;
    for (let frame = 0; frame < picture.itemCount; frame++) {
      const hash = createHash("sha256").update(frameSlice(picture, frame)).digest("hex");
      const sources = sourceByHash.get(hash) ?? [];
      sources.push({ archive, block: id, frame });
      sourceByHash.set(hash, sources);
    }
  }
}

const cells = new Map<string, { area: number; occurrences: number; first: { frame: number; x: number; y: number } }>();
for (const [frame, inventory] of frames.entries()) {
  for (const [x, y, key] of inventory) {
    const match = /^tile:(\d+):[a-f0-9]{64}$/.exec(key);
    if (!match) throw new Error(`Invalid tile key at frame ${frame}: ${key}`);
    const existing = cells.get(key);
    if (existing) existing.occurrences++;
    else cells.set(key, { area: Number(match[1]), occurrences: 1, first: { frame, x, y } });
  }
}

const tiles = [...cells].map(([key, cell]) => ({
  key, ...cell, replacement: manifest.assets[key] ?? null,
  sourceCandidates: sourceByHash.get(key.split(":")[2]!) ?? [],
})).sort((a, b) => a.area - b.area || Number(Boolean(a.replacement)) - Number(Boolean(b.replacement)) ||
  b.occurrences - a.occurrences || a.key.localeCompare(b.key));
const areas = [...new Set(tiles.map(({ area }) => area))].map((area) => {
  const entries = tiles.filter((tile) => tile.area === area);
  return {
    area, patterns: entries.length,
    matched: entries.filter(({ replacement }) => replacement).length,
    withSourceCandidates: entries.filter(({ sourceCandidates }) => sourceCandidates.length).length,
  };
});
writeFileSync(reportPath, JSON.stringify({ frames: frames.length, areas, tiles }, null, 2) + "\n");
for (const { area, patterns, matched, withSourceCandidates } of areas) {
  console.log(`Area ${area}: ${matched}/${patterns} patterns listed in manifest, ${withSourceCandidates} with source candidates`);
}
