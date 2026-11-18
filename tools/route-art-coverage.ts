import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
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
const manifestDirectory = dirname(manifestPath);
const validImages = new Set<string>();
for (const [key, name] of Object.entries(manifest.assets)) {
  if (!key.startsWith("tile:") || !/^[a-z0-9_-]+\.png$/i.test(name)) continue;
  try {
    const png = readFileSync(join(manifestDirectory, name));
    if (png.length >= 24 && png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) &&
        png.toString("ascii", 12, 16) === "IHDR" && png.readUInt32BE(16) === 32 && png.readUInt32BE(20) === 32) {
      validImages.add(name);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
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
  key, ...cell, replacement: validImages.has(manifest.assets[key] ?? "") ? manifest.assets[key]! : null,
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
const galleryPath = reportPath + ".html";
const sections = areas.map(({ area, patterns, matched }) => `<section><h2>Area ${area} · ${matched}/${patterns}</h2><div class="grid">` +
  tiles.filter((tile) => tile.area === area).map(({ key, first, occurrences, replacement, sourceCandidates }) => {
    const src = replacement && relative(dirname(galleryPath), join(manifestDirectory, replacement))
      .split(/[\\/]/).map(encodeURIComponent).join("/");
    const candidates = sourceCandidates.map(({ archive, block, frame }) => `${archive} #${block} frame ${frame}`).join(", ");
    return `<article>${src ? `<img src="${src}" width="96" height="96" alt="Replacement tile">` : "<p>Replacement missing</p>"}` +
      `<code>${key.slice(-12)}</code><p>First seen at trace frame ${first.frame}, (${first.x}, ${first.y}) · ${occurrences} placements</p>` +
      `<p>${candidates || "Source tile unresolved"}</p></article>`;
  }).join("") + "</div></section>").join("");
writeFileSync(galleryPath, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Route artwork checklist</title><style>
body{font:16px system-ui;background:#191715;color:#efe4d0;margin:2rem}img{image-rendering:pixelated;display:block;margin-bottom:.5rem}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.65rem}article{background:#28241f;padding:.75rem;overflow-wrap:anywhere}
p{margin:.4rem 0;font-size:.9rem}code{color:#ffdcaa}
</style><h1>Route artwork checklist</h1><p>${frames.length} exploration frames. Archive entries are pixel-match candidates.</p>${sections}</html>\n`);
for (const { area, patterns, matched, withSourceCandidates } of areas) {
  console.log(`Area ${area}: ${matched}/${patterns} patterns with 32×32 PNGs, ${withSourceCandidates} with source candidates`);
}
