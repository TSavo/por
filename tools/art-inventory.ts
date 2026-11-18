import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { encodePng } from "./png.js";
import { loadUpgradeArt } from "./upgrade-art.js";
import { compositePortraitKey } from "./portrait-art.js";

const families = [
  [/^(TITLE|FINAL\d+)\.DAX$/, "Title and ending"],
  [/^PIC\d+\.DAX$/, "Scene illustrations"],
  [/^SPRIT\d+\.DAX$/, "Encounter sprites"],
  [/^(CHEAD|CBODY|HEAD\d+|BODY\d+)\.DAX$/, "Character portraits"],
  [/^(CPIC\d+|COMSPR|ICON)\.DAX$/, "Combat images and icons"],
  [/^(8X8D\d+|SQRPACI|BACPAC)\.DAX$/, "Tiles and interface graphics"],
  [/^WALLDEF\d+\.DAX$/, "Wall composition"],
  [/^GEO\d+\.DAX$/, "Map geometry"],
] as const;
const gameData = findGameRoot(process.argv[2]);
if (!gameData) throw new Error("Supply the path to the original game files or set POR_GAMEDATA");
const output = process.argv[3] ?? "out/art-inventory";
const artScale = 4;
mkdirSync(join(output, "sheets"), { recursive: true });

interface Block {
  id: number;
  directoryIndex: number;
  bytes: number;
  sha256: string;
  format: string;
  pictures?: { width: number; height: number; frames: number; x: number; y: number; selector?: number; preview: string }[];
  enhancedFrames?: { width: number; height: number }[];
}

const archives = listGameFiles(gameData).filter((name) => /\.dax$/i.test(name)).sort().map((name) => {
  const file = name.toUpperCase();
  const category = families.find(([pattern]) => pattern.test(file))?.[1] ??
    (/^(ECL\d+|ITEM\d+|MON\d+(CHA|ITM|SPC)|DUNGCOM|RANDCOM|WILDCOM)\.DAX$/.test(file)
      ? "Game data" : "Unclassified");
  const entries = parseDax(name, readGameFile(gameData, name)).entries.map((entry, index): Block => {
    const digest = createHash("sha256").update(entry.data).digest("hex");
    const block = { id: entry.id, directoryIndex: index, bytes: entry.rawSize, sha256: digest };
    if (file === "8X8D1.DAX" && entry.id === 201 && entry.data.length % 8 === 0) {
      // Overlay 37 loads block 201 as eight one-bit rows per EGA glyph.
      const frames = entry.data.length / 8;
      const sheet = new Frame(128, Math.ceil(frames / 16) * 8);
      for (let glyph = 0; glyph < frames; glyph++) {
        for (let y = 0; y < 8; y++) {
          const row = entry.data[glyph * 8 + y]!;
          for (let x = 0; x < 8; x++) {
            if (row & (128 >> x)) sheet.set((glyph % 16) * 8 + x, Math.floor(glyph / 16) * 8 + y, 15);
          }
        }
      }
      const preview = `sheets/${file}-${entry.id}-${index}-0.png`;
      writeFileSync(join(output, preview), encodePng(sheet));
      return { ...block, format: "EGA font", pictures: [{ width: 8, height: 8, frames, x: 0, y: 0, preview }] };
    }
    if (category === "Game data" || category === "Wall composition" || category === "Map geometry") {
      return { ...block, format: category === "Game data" ? "game data" : "composition data" };
    }
    const members = pictureMembers(entry.data);
    if (!members.length) return { ...block, format: "unresolved" };
    const pictures = members.map(({ data, selector }, member) => {
      const picture = decodePicture(data);
      const columns = Math.min(picture.itemCount, Math.max(1, Math.floor(640 / picture.width)));
      const sheet = new Frame(columns * picture.width, Math.ceil(picture.itemCount / columns) * picture.height);
      for (let frame = 0; frame < picture.itemCount; frame++) {
        sheet.blit(frameSlice(picture, frame), picture.width, picture.height,
          (frame % columns) * picture.width, Math.floor(frame / columns) * picture.height);
      }
      const preview = `sheets/${file}-${entry.id}-${index}-${member}.png`;
      writeFileSync(join(output, preview), encodePng(sheet));
      return { width: picture.width, height: picture.height, frames: picture.itemCount,
        x: picture.x, y: picture.y, selector, preview };
    });
    return { ...block, format: "picture", pictures,
      enhancedFrames: pictures.map(({ width, height }) => ({ width: width * artScale, height: height * artScale })) };
  });
  return { file, category, entries };
});

const escape = (value: string) => value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const monsterArt = archives.filter(({ file }) => /^MON\d+CHA\.DAX$/.test(file)).flatMap(({ file }) => {
  const combatFile = file.replace(/^MON(\d+)CHA/, "CPIC$1");
  const combat = archives.find(({ file }) => file === combatFile);
  return parseDax(file, readGameFile(gameData, file)).entries.flatMap(({ id, data }) => {
    const length = data[0] ?? 0;
    if (!length || length > 15 || data.length !== 285) return [];
    const name = new TextDecoder().decode(data.subarray(1, 1 + length)).replace(/\0+$/, "").trim();
    if (!/^[ -~]+$/.test(name) || !combat?.entries.some((block) => block.id === id)) return [];
    // The original combat record and the adventure dialogue spell this name differently.
    const dialogueName = name === "TYRANITHRAXUS" ? "Tyranthraxus" : undefined;
    return [{ characterFile: file, combatFile, id, name, dialogueName }];
  });
});
const monsterNames = new Map(monsterArt.map(({ combatFile, id, name, dialogueName }) =>
  [`${combatFile}:${id}`, dialogueName ? `${dialogueName} (${name} in the combat record)` : name]));
const scriptReferences = archives.filter(({ file }) => /^ECL\d+\.DAX$/.test(file)).flatMap(({ file }) => {
  const bank = file.slice(3, -4);
  return parseDax(file, readGameFile(gameData, file)).entries.flatMap((script) => {
    const decoded = disassemble(scriptFromBlock(script.data));
    return decoded.instructions.flatMap((instruction, index) => {
      if (instruction.name !== "PICTURE") return [];
      const operand = instruction.operands[0];
      if (!operand || operand.code !== 0 || operand.low === 255) return [];
      const pictureId = operand.low;
      const candidates = archives.filter((archive) => /^PIC\d+\.DAX$/.test(archive.file) &&
        archive.entries.some((entry) => entry.id === pictureId)).map((archive) => archive.file);
      const nearbyText = decoded.instructions.slice(index + 1, index + 7)
        .flatMap(({ operands }) => operands.flatMap(({ text }) => text?.trim() ? [text] : []))[0];
      return [{ file, script: script.id, address: instruction.address, pictureId,
        sameBank: candidates.find((name) => name === `PIC${bank}.DAX`), candidates, nearbyText }];
    });
  });
});
const referencesByPicture = new Map<string, typeof scriptReferences>();
for (const reference of scriptReferences) {
  if (!reference.sameBank) continue;
  const key = `${reference.sameBank}:${reference.pictureId}`;
  const matches = referencesByPicture.get(key) ?? [];
  matches.push(reference);
  referencesByPicture.set(key, matches);
}
mkdirSync(join(output, "enhanced"), { recursive: true });
mkdirSync(join(output, "comparison"), { recursive: true });
const comparisonArchives = new Map<string, ReturnType<typeof parseDax>>();
function classicPicture(archive: string, directoryIndex: number, member: number) {
  let dax = comparisonArchives.get(archive);
  if (!dax) {
    dax = parseDax(archive, readGameFile(gameData!, archive));
    comparisonArchives.set(archive, dax);
  }
  return decodePicture(pictureMembers(dax.entries[directoryIndex]!.data)[member]!.data);
}
function exportClassicFrame(original: Frame, index: number) {
  const preview = `comparison/${index}.png`;
  writeFileSync(join(output, preview), encodePng(original));
  return preview;
}
const replacements = [...loadUpgradeArt(undefined, gameData)].map(([id, { png, ...metadata }], index) => {
  const preview = `enhanced/${index}.png`;
  writeFileSync(join(output, preview), png);
  const match = /^(?:encounter:(?:area:\d+:)?|portrait:)([^:]+):(\d+):(\d+):(\d+)$/.exec(id) ??
    /^combat:(?:area:\d+:)?(CPIC\d+\.DAX):(\d+)$/.exec(id);
  let source;
  if (match) {
    const [, archive, blockId, memberId = "0", frameId = "0"] = match;
    const block = Number(blockId), member = Number(memberId), frame = Number(frameId);
    const entry = archives.find(({ file }) => file === archive)?.entries.find(({ id }) => id === block);
    const picture = entry?.pictures?.[member];
    if (entry && picture && frame < picture.frames && metadata.width === picture.width * artScale &&
        metadata.height === picture.height * artScale) {
      source = { archive, block, directoryIndex: entry.directoryIndex, member, frame, x: picture.x, y: picture.y };
    }
  }
  const composite = compositePortraitKey.exec(id);
  const sourceParts = composite ? [
    { archive: composite[1]!, block: Number(composite[2]), frame: 0, x: 0, y: 0 },
    { archive: composite[3]!, block: Number(composite[4]), frame: 0, x: 0, y: 40 },
  ].flatMap((part) => {
    const entry = archives.find(({ file }) => file === part.archive)?.entries.find(({ id }) => id === part.block);
    return entry ? [{ ...part, directoryIndex: entry.directoryIndex, member: 0 }] : [];
  }) : undefined;
  const area = /^(?:tile|combat:area):(\d+):/.exec(id)?.[1];
  const placement = metadata.encounter
    ?? (id.startsWith("portrait:") ? { x: 8, y: 8, width: 120, height: 120 }
      : id === "scene:title" ? { x: 0, y: 0, width: 320, height: 200 }
      : source || area !== undefined ? {
        ...(source && { x: source.x, y: source.y }),
        ...(area !== undefined && { area: Number(area) }),
      } : undefined);
  let classicPreview;
  if (source) {
    const picture = classicPicture(source.archive, source.directoryIndex, source.member);
    const original = new Frame(picture.width, picture.height);
    original.blit(frameSlice(picture, source.frame), picture.width, picture.height, 0, 0);
    classicPreview = exportClassicFrame(original, index);
  } else if (sourceParts?.length === 2) {
    const original = new Frame(88, 88);
    for (const part of sourceParts) {
      const picture = classicPicture(part.archive, part.directoryIndex, part.member);
      original.blit(frameSlice(picture, part.frame), picture.width, picture.height, part.x, part.y);
    }
    classicPreview = exportClassicFrame(original, index);
  }
  return { id, preview, classicPreview, source, sourceParts: sourceParts ?? undefined, placement, ...metadata };
});
const replacementsByBlock = new Map<string, typeof replacements>();
const runtimeReplacements = [];
for (const replacement of replacements) {
  if (!replacement.source) {
    runtimeReplacements.push(replacement);
    continue;
  }
  const { archive, directoryIndex } = replacement.source;
  const key = `${archive}:${directoryIndex}`;
  const matches = replacementsByBlock.get(key) ?? [];
  matches.push(replacement);
  replacementsByBlock.set(key, matches);
}
function replacementPreview({ id, preview, classicPreview, width, height, placement, file, source }: typeof replacements[number]) {
  const area = placement && "area" in placement ? ` · area ${placement.area}` : "";
  const origin = placement && "x" in placement ? ` · origin (${placement.x}, ${placement.y})` : "";
  const extent = placement && "width" in placement ? ` · display ${placement.width}×${placement.height}` : "";
  const enhanced = `<a href="${preview}" target="_blank" rel="noopener"><img loading="lazy" src="${preview}" alt="${escape(file)}"></a>`;
  const images = !classicPreview ? enhanced : `<div class="comparison" style="--preview-width:${Math.min(width, 176)}px">` +
    `<div><a href="${classicPreview}" target="_blank" rel="noopener"><img loading="lazy" src="${classicPreview}" alt="Classic frame"></a><small>Classic</small></div>` +
    `<div>${enhanced}<small>Enhanced</small></div></div>`;
  return `<div class="preview">${images}` +
    `<small>Enhanced · ${width}×${height} · ${escape(id)}${area}${origin}${extent}</small>` +
    `<small>${escape(file)}${source ? ` · member ${source.member}, frame ${source.frame}` : ""}</small></div>`;
}
const runtimeGallery = runtimeReplacements.length ?
  `<details data-category="Runtime artwork"><summary>Runtime artwork · ${runtimeReplacements.length} replacements</summary><div class="grid">` +
  runtimeReplacements.map((entry) => `<figure data-visual="true" data-enhanced="true">${replacementPreview(entry)}</figure>`).join("") +
  "</div></details>" : "";
const gallery = archives.map(({ file, category, entries }) =>
  `<details data-category="${escape(category)}"><summary>${escape(file)} · ${category} · ${entries.length} blocks</summary><div class="grid">` +
  entries.map((entry) => {
    const monster = monsterNames.get(`${file}:${entry.id}`);
    const enhanced = replacementsByBlock.get(`${file}:${entry.directoryIndex}`) ?? [];
    const total = entry.enhancedFrames ? entry.pictures?.reduce((sum, picture) => sum + picture.frames, 0) ?? 0 : 0;
    const linked = new Set(enhanced.map(({ source }) => `${source?.member}:${source?.frame}`)).size;
    const coverage = total === 0 ? "" : linked === 0 ? "missing" : linked === total ? "complete" : "partial";
    return `<figure data-enhanced="${Boolean(linked)}" data-coverage="${coverage}" data-visual="${Boolean(entry.pictures?.length)}"><figcaption>${file} #${entry.id} · ${entry.format}${monster ? ` · ${escape(monster)}` : ""}${total ? ` · ${linked}/${total} frames linked` : ""}</figcaption>` +
    (entry.pictures ?? []).map((pic, index) => {
      const target = entry.enhancedFrames?.[index];
      return `<div class="preview"><a href="${escape(pic.preview)}" target="_blank" rel="noopener"><img loading="lazy" src="${escape(pic.preview)}" alt="${file} #${entry.id}, ${pic.width}×${pic.height}, ${pic.frames} frames"></a>` +
        `<small>${pic.width}×${pic.height}${target ? ` → ${target.width}×${target.height} at 4×` : ""}${pic.frames > 1 ? ` per frame · ${pic.frames} frames` : ""}</small>` +
        `<small>Directory entry ${entry.directoryIndex} · member ${index}${pic.selector === undefined ? "" : ` · selector ${pic.selector}`} · origin (${pic.x}, ${pic.y})</small></div>`;
    }).join("") + enhanced.map(replacementPreview).join("") +
    (referencesByPicture.get(`${file}:${entry.id}`) ?? []).map((ref) =>
      `<p>Script candidate ${ref.file} #${ref.script} · ${ref.address.toString(16)}${ref.nearbyText ? ` · ${escape(ref.nearbyText)}` : ""}</p>`).join("") +
    "</figure>";
  }).join("") + "</div></details>").join("\n");
writeFileSync(join(output, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pool of Radiance art inventory</title><style>
body{font:16px system-ui;background:#181715;color:#f3e9d6;margin:2rem auto;padding:0 1rem;max-width:1200px}
input,select{font:inherit;color:inherit;background:#242220;border:1px solid #8a7654;padding:.4em}
label{display:inline-block;margin:0 1rem .5rem 0}
summary{cursor:pointer;padding:.65rem 0;border-top:1px solid #514738}.grid{display:flex;flex-wrap:wrap;gap:1rem;padding:.5rem 0 1rem}
figure{margin:0;padding:.75rem;background:#242220;max-width:min(100%, 40rem);min-width:8rem}
figcaption{margin-bottom:.5rem}figure p{font-size:.85rem;color:#d6c9b4}img{image-rendering:pixelated;max-width:100%;vertical-align:middle;margin:.15rem}
.preview{display:inline-block;vertical-align:top;max-width:100%;margin:0 .35rem .5rem 0}.preview small{display:block;color:#d6c9b4}
.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,var(--preview-width)));gap:.75rem;margin-bottom:.5rem}
.comparison img{display:block;width:100%;height:auto;margin:0}
</style><h1>Pool of Radiance art inventory</h1>
<p>Click any preview to open the full sheet. Search by archive, block number, replacement file, or nearby encounter dialogue.</p>
<label>Search <input id="search" type="search" placeholder="Tyranthraxus or PIC5"></label>
<label>Category <select id="category"><option value="">All categories</option>${runtimeGallery ? "<option>Runtime artwork</option>" : ""}${[...new Set(archives.map(({ category }) => category))].sort().map((category) => `<option>${escape(category)}</option>`).join("")}</select></label>
<label><input id="include-data" type="checkbox"> Include composition and gameplay data</label>
<label>Replacement <select id="replacement"><option value="">Any</option><option value="linked">Has linked artwork</option><option value="missing">No frames linked</option><option value="partial">Some frames linked</option><option value="complete">All frames linked</option></select></label>
<p id="matches" role="status"></p>
${runtimeGallery}
${gallery}
<script>
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const replacement = document.querySelector('#replacement');
const includeData = document.querySelector('#include-data');
const archives = [...document.querySelectorAll('details')].map((archive) => ({ archive,
  entries: [...archive.querySelectorAll('figure')].map((figure) => ({ figure, text: figure.textContent.toLowerCase() })) }));
function filter() {
  const query = search.value.trim().toLowerCase();
  let blocks = 0;
  for (const {archive, entries} of archives) {
    const categoryMatches = !category.value || archive.dataset.category === category.value;
    let visible = 0;
    for (const {figure, text} of entries) {
      const visual = figure.dataset.visual === 'true';
      const linked = figure.dataset.enhanced === 'true';
      const replacementMatches = !replacement.value || (replacement.value === 'linked' ? linked : figure.dataset.coverage === replacement.value);
      figure.hidden = !categoryMatches || (!includeData.checked && !visual) || !replacementMatches || !text.includes(query);
      if (!figure.hidden) visible++;
    }
    archive.hidden = !visible;
    if (query || category.value || replacement.value) archive.open = Boolean(visible);
    blocks += visible;
  }
  document.querySelector('#matches').textContent = blocks + ' matching blocks';
}
search.addEventListener('input', filter);
category.addEventListener('change', filter);
includeData.addEventListener('change', filter);
replacement.addEventListener('change', filter);
filter();
</script></html>\n`);
writeFileSync(join(output, "inventory.json"), JSON.stringify({ artScale, archives, scriptReferences, monsterArt, replacements, embeddedVisuals: [
  { file: "START.EXE", status: "Runtime-rendered interface and font sources require a separate audit" },
  { file: "GAME.OVR", status: "Embedded graphics and draw procedures require a separate audit" },
] }, null, 2) + "\n");
const blocks = archives.flatMap(({ entries }) => entries);
console.log(`${archives.length} archives, ${blocks.length} blocks, ${blocks.flatMap((block) => block.pictures ?? []).length} picture sheets, ${blocks.filter((block) => block.format === "unresolved").length} unresolved blocks`);
