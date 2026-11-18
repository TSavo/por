import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { encodePng } from "./png.js";

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
mkdirSync(join(output, "sheets"), { recursive: true });

interface Block {
  id: number;
  directoryIndex: number;
  bytes: number;
  sha256: string;
  format: string;
  pictures?: { width: number; height: number; frames: number; x: number; y: number; selector?: number; preview: string }[];
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
    const members: { data: Uint8Array; selector?: number }[] = [];
    if (isPicture(entry.data)) {
      members.push({ data: entry.data });
    } else {
      // PIC and SPRIT records contain a byte count and a four-byte selector
      // before each complete picture record.
      let offset = 1;
      for (let member = 0; member < entry.data[0]!; member++) {
        const pictureData = entry.data.subarray(offset + 4);
        if (!isPicture(pictureData)) break;
        const header = new DataView(entry.data.buffer, entry.data.byteOffset + offset);
        const size = 17 + header.getUint16(4, true) * header.getUint16(6, true) * 4 * pictureData[8]!;
        members.push({ data: pictureData.subarray(0, size), selector: header.getUint32(0, true) });
        offset += 4 + size;
      }
      if (offset !== entry.data.length || members.length !== entry.data[0]) members.length = 0;
    }
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
    return { ...block, format: "picture", pictures };
  });
  return { file, category, entries };
});

const escape = (value: string) => value.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
const gallery = archives.map(({ file, category, entries }) =>
  `<details><summary>${escape(file)} · ${category} · ${entries.length} blocks</summary><div class="grid">` +
  entries.map((entry) => `<figure><figcaption>Block ${entry.id} · ${entry.format}</figcaption>` +
    (entry.pictures ?? []).map((pic) => `<img loading="lazy" src="${escape(pic.preview)}" alt="${pic.width}×${pic.height}, ${pic.frames} frames">`).join("") +
    "</figure>").join("") + "</div></details>").join("\n");
writeFileSync(join(output, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8">
<title>Pool of Radiance art inventory</title><style>
body{font:16px system-ui;background:#181715;color:#f3e9d6;margin:2rem}
summary{cursor:pointer;padding:.5rem 0}.grid{display:flex;flex-wrap:wrap;gap:1rem}
figure{margin:0;padding:.5rem;background:#242220}img{image-rendering:pixelated;max-width:100%}
</style><h1>Pool of Radiance art inventory</h1>
<p>Block previews use the original palette. Composition data and unresolved formats are listed by block.</p>
${gallery}</html>\n`);
writeFileSync(join(output, "inventory.json"), JSON.stringify({ archives, embeddedVisuals: [
  { file: "START.EXE", status: "Runtime-rendered interface and font sources require a separate audit" },
  { file: "GAME.OVR", status: "Embedded graphics and draw procedures require a separate audit" },
] }, null, 2) + "\n");
const blocks = archives.flatMap(({ entries }) => entries);
console.log(`${archives.length} archives, ${blocks.length} blocks, ${blocks.flatMap((block) => block.pictures ?? []).length} picture sheets, ${blocks.filter((block) => block.format === "unresolved").length} unresolved blocks`);
