import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { encodePng } from "./png.js";
import { loadUpgradeArt, loadUpgradeArtFromManifests } from "./upgrade-art.js";

const [tracePath, manifestPath, reportPath, omitted] = process.argv.slice(2);
if (!tracePath || !manifestPath || !reportPath) {
  throw new Error("Usage: tsx tools/route-art-coverage.ts <tile-inventory.jsonl> <manifest.json|--browser> <report.json> [--omit-frames=20,22]");
}
const root = findGameRoot();
if (!root) throw new Error("Original game data is required for source tile matching");
const artwork = manifestPath === "--browser" ? loadUpgradeArt() : loadUpgradeArtFromManifests([manifestPath]);
const trace = readFileSync(tracePath, "utf8").trim();
if (!trace) throw new Error("The route trace contains no exploration frames");
const frames = trace.split(/\r?\n/).map((line) => JSON.parse(line) as [number, number, string, string?][]);
if (omitted && !/^--omit-frames=\d+(,\d+)*$/.test(omitted)) throw new Error("Expected --omit-frames with comma-separated frame numbers");
const omittedFrames = new Set(omitted?.slice("--omit-frames=".length).split(",").map(Number));
if ([...omittedFrames].some((frame) => frame >= frames.length) || omittedFrames.size === frames.length) {
  throw new Error("Omitted frames must be zero-based captured frame numbers and leave at least one frame");
}

interface SourceCandidate {
  archive: string;
  block: number;
  frame: number;
  fragment?: { x: number; y: number };
  role?: "terrain" | "sprite";
  reflected?: boolean;
}

const sourceByHash = new Map<string, { pixels: Uint8Array; candidates: SourceCandidate[] }>();
for (const archive of listGameFiles(root)) {
  const terrain = /^(BACPAC|SQRPACI)\.DAX$/i.test(archive);
  const sprite = /^(COMSPR|ICON|CPIC[1-8])\.DAX$/i.test(archive);
  const battlefield = terrain || sprite;
  if (!battlefield && !/^8X8D\d+\.DAX$/i.test(archive)) continue;
  for (const { id, data } of parseDax(archive, readGameFile(root, archive)).entries) {
    if (!isPicture(data)) continue;
    const picture = decodePicture(data);
    const size = battlefield ? 24 : 8;
    if (picture.width !== size || picture.height !== size) continue;
    for (let frame = 0; frame < picture.itemCount; frame++) {
      const sourceFrame = frameSlice(picture, frame);
      for (const reflected of sprite ? [false, true] : [false]) {
        for (let y = 0; y < size; y += 8) {
          for (let x = 0; x < size; x += 8) {
            const pixels = new Uint8Array(64);
            for (let row = 0; row < 8; row++) {
              const start = (y + row) * size + x;
              const strip = sourceFrame.subarray(start, start + 8);
              pixels.set(reflected ? strip.slice().reverse() : strip, row * 8);
            }
            if (battlefield && !pixels.some(Boolean)) continue;
            const hash = createHash("sha256").update(pixels).digest("hex");
            const key = (battlefield ? "battle-tile:" : "tile:") + hash;
            const source = sourceByHash.get(key) ?? { pixels, candidates: [] };
            const candidate: SourceCandidate = { archive, block: id, frame };
            if (battlefield) {
              candidate.fragment = { x, y };
              candidate.role = terrain ? "terrain" : "sprite";
              if (reflected) candidate.reflected = true;
            }
            source.candidates.push(candidate);
            sourceByHash.set(key, source);
          }
        }
      }
    }
  }
}

const sourceKey = (key: string) => key.replace(/^tile:\d+:/, "tile:");
const areaLabel = (area: number | "battlefield") => area === "battlefield" ? "Battlefield cells" : `Area ${area}`;
type TilePosition = { x: number; y: number; occurrences: number };
const cells = new Map<string, {
  area: number | "battlefield";
  occurrences: number;
  first: { frame: number; x: number; y: number };
  positions: Map<string, TilePosition>;
}>();
const tracedPixels = new Map<string, Buffer>();
for (const [frame, inventory] of frames.entries()) {
  if (omittedFrames.has(frame)) continue;
  for (const [x, y, key, indices] of inventory) {
    const match = /^(?:tile:(\d+):|battle-tile:)([a-f0-9]{64})$/.exec(key);
    if (!match) throw new Error(`Invalid tile key at frame ${frame}: ${key}`);
    if (indices !== undefined) {
      const pixels = Buffer.from(indices, "hex");
      if (!/^(?:0[0-9a-f]){64}$/.test(indices) || createHash("sha256").update(pixels).digest("hex") !== match[2]) {
        throw new Error(`Invalid tile pixels at frame ${frame}: ${key}`);
      }
      tracedPixels.set(key, pixels);
    }
    const cell = cells.get(key) ?? { area: match[1] === undefined ? "battlefield" : Number(match[1]), occurrences: 0, first: { frame, x, y }, positions: new Map<string, TilePosition>() };
    cell.occurrences++;
    const positionKey = `${x},${y}`;
    const position = cell.positions.get(positionKey) ?? { x, y, occurrences: 0 };
    position.occurrences++;
    cell.positions.set(positionKey, position);
    cells.set(key, cell);
  }
}

const tiles = [...cells].map(([key, { positions, ...cell }]) => ({
  key, ...cell, target: { width: 32, height: 32 },
  positions: [...positions.values()].sort((a, b) => a.y - b.y || a.x - b.x),
  replacement: artwork.get(key)?.file ?? null,
  reference: tracedPixels.has(key) ? "framebuffer" : sourceByHash.has(sourceKey(key)) ? "archive" : null,
  sourceCandidates: sourceByHash.get(sourceKey(key))?.candidates ?? [],
})).sort((a, b) => (a.area === "battlefield" ? 256 : a.area) - (b.area === "battlefield" ? 256 : b.area) || Number(Boolean(a.replacement)) - Number(Boolean(b.replacement)) ||
  b.occurrences - a.occurrences || a.key.localeCompare(b.key));
const areas = [...new Set(tiles.map(({ area }) => area))].map((area) => {
  const entries = tiles.filter((tile) => tile.area === area);
  return {
    area, patterns: entries.length,
    matched: entries.filter(({ replacement }) => replacement).length,
    withSourceCandidates: entries.filter(({ sourceCandidates }) => sourceCandidates.length).length,
    ...(area === "battlefield" && {
      withSpriteCandidates: entries.filter(({ sourceCandidates }) => sourceCandidates.some(({ role }) => role === "sprite")).length,
      withTerrainCandidates: entries.filter(({ sourceCandidates }) => sourceCandidates.some(({ role }) => role === "terrain")).length,
    }),
  };
});
const analyzedFrames = frames.length - omittedFrames.size;
writeFileSync(reportPath, JSON.stringify({ frames: analyzedFrames, omittedFrames: [...omittedFrames], areas, tiles }, null, 2) + "\n");
const galleryPath = reportPath + ".html";
const frameDirectory = join(dirname(tracePath), "tile-frames");
function galleryLink(path: string) {
  return relative(dirname(galleryPath), path).split(/[\\/]/).map(encodeURIComponent).join("/");
}
const sections = areas.map(({ area, patterns, matched }) => `<section><h2>${areaLabel(area)} · ${matched}/${patterns}</h2><div class="grid">` +
  tiles.filter((tile) => tile.area === area).map(({ key, first, occurrences, positions, sourceCandidates }) => {
    const placedArt = artwork.get(key);
    const src = placedArt && galleryLink(placedArt.path);
    const framePath = join(frameDirectory, `${first.frame}.png`);
    const frameLabel = existsSync(framePath) ? `<a href="${galleryLink(framePath)}">frame ${first.frame}</a>` : `frame ${first.frame}`;
    const candidates = sourceCandidates.map(({ archive, block, frame, fragment, role, reflected }) =>
      `${archive} #${block} frame ${frame}${fragment ? ` at (${fragment.x}, ${fragment.y})` : ""}${reflected ? " reflected" : ""}${role ? ` (${role})` : ""}`).join(", ");
    const pixels = tracedPixels.get(key) ?? sourceByHash.get(sourceKey(key))?.pixels;
    let reference = "<p>Original reference unavailable</p>";
    if (pixels) {
      const frame = new Frame(8, 8);
      frame.pixels.set(pixels);
      const uri = `data:image/png;base64,${Buffer.from(encodePng(frame)).toString("base64")}`;
      reference = `<a href="${uri}" download="${key.replaceAll(":", "-")}.png"><img src="${uri}" width="96" height="96" alt="Download original 8×8 tile"></a>`;
    }
    const spriteCandidate = sourceCandidates.some(({ role }) => role === "sprite");
    return `<article data-sprite-candidate="${spriteCandidate}"><div class="previews">${reference}${src ? `<img src="${src}" width="96" height="96" alt="Replacement tile">` : "<p>Replacement missing</p>"}</div>` +
      `<code>${key.slice(-12)}</code><p>First seen in ${frameLabel}, (${first.x}, ${first.y}) · ${occurrences} placements across ${positions.length} positions</p>` +
      `<p>${candidates || "Source tile unresolved"}</p></article>`;
  }).join("") + "</div></section>").join("");
writeFileSync(galleryPath, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Route artwork checklist</title><style>
body{font:16px system-ui;background:#191715;color:#efe4d0;margin:2rem}img{image-rendering:pixelated;display:block;margin-bottom:.5rem}a{color:#ffdcaa}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(14rem,1fr));gap:.65rem}article{background:#28241f;padding:.75rem;overflow-wrap:anywhere}
.previews{display:flex;align-items:center;gap:.5rem;flex-wrap:wrap}
p{margin:.4rem 0;font-size:.9rem}code{color:#ffdcaa}
body:has(#hide-sprite-candidates:checked) article[data-sprite-candidate="true"]{display:none}
</style><h1>Route artwork checklist</h1><p>${analyzedFrames} captured frames analyzed. Archive entries are pixel-match candidates.</p>${
  areas.some(({ area }) => area === "battlefield") ?
    "<p>Battlefield captures can include unmatched actors, effects, and partial tiles. Review each candidate in its frame.</p>" +
    '<label><input id="hide-sprite-candidates" type="checkbox"> Hide sprite candidates</label>' : ""}${
  omittedFrames.size ? `<p>Omitted frames ${[...omittedFrames].join(", ")}.</p>` : ""}${sections}</html>\n`);
for (const { area, patterns, matched, withSourceCandidates } of areas) {
  console.log(`${areaLabel(area)}: ${matched}/${patterns} patterns with 32×32 PNGs, ${withSourceCandidates} with source candidates`);
}
