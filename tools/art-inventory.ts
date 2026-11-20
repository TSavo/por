import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { Frame } from "../src/lib/ega.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { encodePng, pngDimensions } from "./png.js";
import { loadCombatMaterialMasks, loadUpgradeArt, type ArtworkLoadIssue } from "./upgrade-art.js";
import { characterSheetPartKey, compositePortraitKey, loadPortraitArt, portraitKey, scriptIllustrations } from "./portrait-art.js";
import { combatEffectKey, transformCombatEffectPixels, combatSelectionKey, isCombatExtent, loadCombatArtMatcher, monsterCombatKey, partyCombatKey, randomCombatKey } from "./combat-art.js";

const families = [
  [/^(TITLE|FINAL\d+)\.DAX$/, "Title and ending"],
  [/^PIC\d+\.DAX$/, "Scene illustrations"],
  [/^SPRIT\d+\.DAX$/, "Encounter sprites"],
  [/^(CHEAD|CBODY|HEAD\d+|BODY\d+)\.DAX$/, "Character portraits"],
  [/^(CPIC\d+|COMSPR|ICON|RANDCOM)\.DAX$/, "Combat images and icons"],
  [/^(8X8D\d+|SQRPACI|BACPAC)\.DAX$/, "Tiles and interface graphics"],
  [/^WALLDEF\d+\.DAX$/, "Wall composition"],
  [/^GEO\d+\.DAX$/, "Map geometry"],
] as const;
const gameData = findGameRoot(process.argv[2]);
if (!gameData) throw new Error("Supply the path to the original game files or set POR_GAMEDATA");
const output = process.argv[3] ?? "out/art-inventory";
const tracePaths = process.argv.slice(4);
const artScale = 4;
const atlasSheets = (JSON.parse(readFileSync(new URL("../src/maps/atlas.json", import.meta.url), "utf8")) as
  { title: string; file: string; areas: number[]; mapId?: number }[]).map(sheet => {
  const path = join("upgrades", "maps", sheet.file);
  const dimensions = pngDimensions(readFileSync(path));
  if (!dimensions) throw new Error(`Invalid atlas illustration: ${path}`);
  return { ...sheet, ...dimensions, preview: relative(output, path).replaceAll("\\", "/") };
});
mkdirSync(join(output, "sheets"), { recursive: true });
mkdirSync(join(output, "frames"), { recursive: true });

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
    (/^(ECL\d+|ITEM\d+|MON\d+(CHA|ITM|SPC)|DUNGCOM|WILDCOM)\.DAX$/.test(file)
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
const tileSources = new Map<string, { archive: string; block: number; directoryIndex: number; member: number; frame: number }[]>();
for (const { file: archive, entries } of archives) {
  if (!/^8X8D\d+\.DAX$/.test(archive)) continue;
  for (const entry of entries) {
    if (entry.format !== "picture") continue;
    for (const [member, metadata] of (entry.pictures ?? []).entries()) {
      if (metadata.width !== 8 || metadata.height !== 8) continue;
      const picture = classicPicture(archive, entry.directoryIndex, member);
      for (let frame = 0; frame < metadata.frames; frame++) {
        const hash = createHash("sha256").update(frameSlice(picture, frame)).digest("hex");
        const candidates = tileSources.get(hash) ?? [];
        candidates.push({ archive, block: entry.id, directoryIndex: entry.directoryIndex, member, frame });
        tileSources.set(hash, candidates);
      }
    }
  }
}
type TraceCell = [x: number, y: number, id: string, pixels?: string];
type TraceRecord = { cells?: TraceCell[]; type?: string; picture?: number; area?: number; cursor?: number; caller?: number; dialogue?: string; sources?: string[]; sequence?: number };
const capturedTiles = new Map<string, { x: number; y: number; trace: string; frame: number; pixels: Buffer }>();
const nativeBattleTiles = new Map<string, Set<number>>();
const observedPortraitFallbacks: { area?: number; cursor?: number; caller?: number; dialogue?: string; sources: string[]; sequence: number; trace: string }[] = [];
const portraitTraceFrames: { area: number; sources: string[]; frame: number; trace: string }[] = [];
const matchTracePortrait = tracePaths.length ? loadPortraitArt([], true, gameData) : undefined;
for (const path of tracePaths) {
  const raw = readFileSync(path, "utf8").trim();
  if (!raw) continue;
  const frames: (TraceCell[] | TraceRecord)[] = path.endsWith(".jsonl")
    ? raw.split(/\r?\n/).map((line) => JSON.parse(line))
    : JSON.parse(raw);
  for (const [frame, record] of frames.entries()) {
    if (!Array.isArray(record) && record.type === "portrait-fallback") {
      const { area, cursor, caller, dialogue, sources, sequence } = record;
      if (sequence !== undefined && Number.isInteger(sequence) && Array.isArray(sources) &&
          sources.length && sources.every(id => typeof id === "string" && portraitKey.test(id))) {
        observedPortraitFallbacks.push({ area: Number.isInteger(area) ? area : undefined,
          cursor: cursor !== undefined && Number.isInteger(cursor) && cursor >= 0 && cursor <= 0xffff ? cursor : undefined,
          caller: caller !== undefined && Number.isInteger(caller) && caller >= 0 && caller <= 0xffff ? caller : undefined,
          dialogue: typeof dialogue === "string" ? dialogue : undefined, sources, sequence, trace: path });
      }
      continue;
    }
    const cells = Array.isArray(record) ? record : record.cells ?? [];
    // A cleared 11×11 view between scenes has no terrain to replace.
    if (cells.length === 121 && cells.every(([, , id, hex]) => id.startsWith("tile:") && hex === "00".repeat(64))) continue;
    const validated: [x: number, y: number, id: string, pixels: Buffer][] = [];
    for (const [x, y, id, hex] of cells) {
      if (!Number.isInteger(x) || !Number.isInteger(y) || !hex ||
          !/^(?:0[0-9a-f]){64}$/.test(hex)) continue;
      const hash = /^(?:tile:\d+:|battle-tile:)([a-f0-9]{64})$/.exec(id)?.[1];
      if (!hash) continue;
      const pixels = Buffer.from(hex, "hex");
      if (createHash("sha256").update(pixels).digest("hex") !== hash) {
        throw new Error(`Tile pixels do not match ${id} in ${path}, frame ${frame}`);
      }
      validated.push([x, y, id, pixels]);
    }
    const tileArea = /^tile:(\d{1,3}):/.exec(validated[0]?.[2] ?? "")?.[1];
    if (matchTracePortrait && tileArea !== undefined && validated.length === 121 &&
        validated.every(([x, y, id]) => x >= 24 && x < 112 && y >= 24 && y < 112 &&
          x % 8 === 0 && y % 8 === 0 && id.startsWith(`tile:${tileArea}:`)) &&
        new Set(validated.map(([x, y]) => y * 320 + x)).size === 121) {
      const screen = new Frame(320, 200);
      for (const [x, y, , pixels] of validated) screen.blit(pixels, 8, 8, x, y);
      const area = Number(tileArea);
      const sources = matchTracePortrait(screen, area);
      if (Array.isArray(sources) && sources.length) {
        portraitTraceFrames.push({ area, sources, frame, trace: path });
        continue;
      }
    }
    for (const [x, y, id, pixels] of validated) {
      if (!Array.isArray(record) && record.picture !== undefined && Number.isInteger(record.picture) && id.startsWith("battle-tile:")) {
        const pictures = nativeBattleTiles.get(id) ?? new Set<number>();
        pictures.add(record.picture);
        nativeBattleTiles.set(id, pictures);
      }
      if (!capturedTiles.has(id)) capturedTiles.set(id, { x, y, trace: path, frame, pixels });
    }
  }
}
const artworkLoadIssues: ArtworkLoadIssue[] = [];
const artwork = loadUpgradeArt(undefined, gameData, issue => artworkLoadIssues.push(issue));
const materialMasks = loadCombatMaterialMasks(artwork);
const portraitFallbackCoverage = observedPortraitFallbacks.map(fallback => {
  const { area, cursor, caller, sources } = fallback;
  const scopes = ["portrait:"];
  if (area !== undefined) {
    scopes.push(`portrait:area:${area}:`);
    if (cursor !== undefined) {
      const scope = `portrait:area:${area}:ecl:${cursor.toString(16).padStart(4, "0")}:`;
      scopes.push(scope);
      if (caller !== undefined) scopes.push(scope + `caller:${caller.toString(16).padStart(4, "0")}:`);
    }
  }
  const linkedCandidates = [...new Set(sources.flatMap(source => scopes.flatMap(scope => {
    const id = scope + source.slice("portrait:".length);
    return artwork.has(id) ? [id] : [];
  })))];
  return { ...fallback, linkedCandidates };
});
const portraitMatchIssues: { id: string; reason: string }[] = [];
const matchPortrait = loadPortraitArt([...artwork.keys()].filter(id => portraitKey.test(id)), false, gameData, (id, reason) => {
  portraitMatchIssues.push({ id, reason });
});
const replacements = [...artwork].map(([id, { png, ...metadata }], index) => {
  const preview = `enhanced/${index}.png`;
  writeFileSync(join(output, preview), png);
  const sheetPart = characterSheetPartKey.exec(id);
  const effect = combatEffectKey.exec(id);
  const overlay = combatSelectionKey.exec(id) ?? effect;
  const match = randomCombatKey.exec(id) ?? overlay?.slice(0, 3) ??
    /^(?:encounter|portrait):(?:area:\d+:(?:ecl:[a-f0-9]{4}:(?:caller:[a-f0-9]{4}:)?)?)?([^:]+):(\d+):(\d+):(\d+)$/.exec(id) ??
    /^combat:(?:area:\d+:)?(CPIC\d+\.DAX):(\d+)(?::ecl:[a-f0-9]{4})?$/.exec(id);
  let source;
  if (match || sheetPart) {
    const [, archive, blockId, memberId = "0", frameId = "0"] = match ?? [id, sheetPart![1]!, sheetPart![3]!];
    const block = Number(blockId), member = Number(memberId), frame = Number(frameId);
    const entry = archives.find(({ file }) => file === archive)?.entries.find(({ id }) => id === block);
    const picture = entry?.pictures?.[member];
    if (entry && picture && frame < picture.frames && metadata.width === picture.width * artScale &&
        metadata.height === picture.height * artScale) {
      source = { archive, block, directoryIndex: entry.directoryIndex, member, frame, x: picture.x, y: picture.y, transform: effect?.[3] };
    }
  }
  const composite = compositePortraitKey.exec(id);
  const party = partyCombatKey.exec(id);
  const compositeParts = composite ? [
    { archive: composite[1]!, block: Number(composite[2]), frame: 0, x: 0, y: 0 },
    { archive: composite[3]!, block: Number(composite[4]), frame: 0, x: 0, y: 40 },
  ] : party ? [
    { archive: "CBODY.DAX", block: Number(party[2]), frame: 0, x: 0, y: 0 },
    { archive: "CHEAD.DAX", block: Number(party[1]), frame: 0, x: 0, y: 0 },
  ] : undefined;
  const sourceParts = compositeParts?.flatMap((part) => {
    const entry = archives.find(({ file }) => file === part.archive)?.entries.find(({ id }) => id === part.block);
    return entry ? [{ ...part, directoryIndex: entry.directoryIndex, member: 0 }] : [];
  });
  const area = /^(?:tile|combat:area|portrait:area|scene-illustration:area):(\d+):/.exec(id)?.[1];
  const scriptCue = scriptIllustrations.get(id)?.toString();
  const placement = metadata.encounter
    ?? (id.startsWith("portrait:") || scriptCue !== undefined
      ? { x: 8, y: 8, width: 120, height: 120, ...(area !== undefined && { area: Number(area) }) }
      : sheetPart && source ? { x: 224, y: sheetPart[2] === "HEAD" ? 8 : 48, width: metadata.width / artScale, height: metadata.height / artScale }
      : id === "scene:title" || id === "scene:publisher" ? { x: 0, y: 0, width: 320, height: 200 }
      : overlay ? { width: metadata.width / artScale, height: metadata.height / artScale }
      : source || area !== undefined ? {
        ...(source && { x: source.x, y: source.y }),
        ...(area !== undefined && { area: Number(area) }),
      } : undefined);
  const tileHash = /^tile:\d+:(.+)$/.exec(id)?.[1];
  const sourceCandidates = tileHash && tileSources.get(tileHash) || undefined;
  const capture = capturedTiles.get(id);
  const capturedPlacement = capture && { x: capture.x, y: capture.y, trace: capture.trace, frame: capture.frame };
  let classicPreview;
  const reference = source ?? sourceCandidates?.[0];
  if (reference) {
    const picture = classicPicture(reference.archive, reference.directoryIndex, reference.member);
    const original = new Frame(picture.width, picture.height);
    const pixels = frameSlice(picture, reference.frame);
    original.blit(transformCombatEffectPixels(pixels, effect?.[3]), picture.width, picture.height, 0, 0);
    classicPreview = exportClassicFrame(original, index);
  } else if (sourceParts?.length === 2) {
    const size = party ? 24 : 88;
    const original = new Frame(size, size);
    for (const part of sourceParts) {
      const picture = classicPicture(part.archive, part.directoryIndex, part.member);
      const pixels = frameSlice(picture, part.frame);
      if (party) for (const [index, color] of pixels.entries()) original.pixels[index] = original.pixels[index]! | color;
      else original.blit(pixels, picture.width, picture.height, part.x, part.y);
    }
    const palette = party?.[3];
    if (palette) original.pixels.set(original.pixels.map(color => Number.parseInt(palette[color]!, 16)));
    classicPreview = exportClassicFrame(original, index);
  } else if (capture) {
    const original = new Frame(8, 8);
    original.pixels.set(capture.pixels);
    classicPreview = exportClassicFrame(original, index);
  }
  return { id, preview, classicPreview, source, sourceCandidates, sourceParts, scriptCue, placement, capturedPlacement, ...metadata };
});
const replacementsByBlock = new Map<string, typeof replacements>();
const monsterPosesBySource = new Map<string, typeof replacements>();
const monsterPosesByPixels = new Map<string, typeof replacements>();
function monsterPoseSignature(file: string, directoryIndex: number) {
  const picture = classicPicture(file, directoryIndex, 0);
  return `${picture.width}×${picture.height}:${createHash("sha256").update(picture.pixels).digest("hex")}`;
}
for (const replacement of replacements) {
  if (!monsterCombatKey.test(replacement.id) || !replacement.source) continue;
  const { archive, block, directoryIndex } = replacement.source;
  const source = `${archive}:${block}`;
  const signature = monsterPoseSignature(archive, directoryIndex);
  for (const [index, key] of [[monsterPosesBySource, source], [monsterPosesByPixels, signature]] as const) {
    const poses = index.get(key) ?? [];
    poses.push(replacement);
    index.set(key, poses);
  }
}
const matchGlobalCombatArt = loadCombatArtMatcher(replacements.map(({ id }) => id)
  .filter(id => monsterCombatKey.test(id) && !id.startsWith("combat:area:")), gameData);
const monsterPoseCoverage = monsterArt.map(monster => {
  const archive = archives.find(({ file }) => file === monster.combatFile);
  const poses = [monster.id, monster.id + 128].map(block => {
    const entry = archive?.entries.find(({ id }) => id === block);
    const native = entry?.pictures?.[0];
    const direct = monsterPosesBySource.get(`${monster.combatFile}:${block}`) ?? [];
    const equivalent = native && !direct.length ?
      monsterPosesByPixels.get(monsterPoseSignature(monster.combatFile, entry.directoryIndex)) ?? [] : [];
    let globalMatch: string | undefined;
    if (native && equivalent.some(({ id }) => !id.startsWith("combat:area:"))) {
      const picture = classicPicture(monster.combatFile, entry.directoryIndex, 0);
      const frame = new Frame(320, 200);
      frame.blit(picture.pixels, picture.width, picture.height, 8, 8);
      globalMatch = matchGlobalCombatArt(frame).find(([x, y]) => x === 8 && y === 8)?.[2];
    }
    const globalArt = equivalent.find(({ id }) => id === globalMatch);
    const links = (direct.length ? direct : globalArt ? [globalArt] : equivalent).map(({ id, preview }) => ({ id, preview }));
    const status = direct.length ? "Linked" : globalArt ? "Matched by global artwork"
      : equivalent.length ? "Identical source pixels in another frame" : native ? "Missing" : "No source frame";
    return { block, status, links };
  });
  return { ...monster, poses };
});
const missingMonsterPoses = monsterPoseCoverage.flatMap(({ poses }) => poses).filter(({ status }) => status === "Missing").length;
const scopedMonsterPoseCandidates = monsterPoseCoverage.flatMap(({ poses }) => poses)
  .filter(({ status }) => status === "Identical source pixels in another frame").length;
const tileFramesByBlock = new Map<string, Set<string>>();
const loadedIds = new Set(replacements.map(({ id }) => id));
const enhancedTilesByHash = new Map<string, { id: string; file: string; preview: string }[]>();
for (const { id, file, preview } of replacements) {
  const hash = /^tile:\d+:([a-f0-9]{64})$/.exec(id)?.[1];
  if (!hash) continue;
  const matches = enhancedTilesByHash.get(hash) ?? [];
  matches.push({ id, file, preview });
  enhancedTilesByHash.set(hash, matches);
}
const missingTiles = [...capturedTiles].filter(([id]) => !loadedIds.has(id)).map(([id, { pixels, ...capture }], index) => {
  const original = new Frame(8, 8);
  original.pixels.set(pixels);
  const hash = /^tile:\d+:([a-f0-9]{64})$/.exec(id)?.[1];
  return { id, ...capture, sourceCandidates: hash ? tileSources.get(hash) : undefined,
    enhancedCandidates: hash ? enhancedTilesByHash.get(hash) : undefined,
    nativeBattlePictures: [...(nativeBattleTiles.get(id) ?? [])].sort((a, b) => a - b),
    preview: exportClassicFrame(original, replacements.length + index) };
});
const missingByArea = new Map<string, typeof missingTiles>();
for (const tile of missingTiles) {
  const area = /^tile:(\d+):/.exec(tile.id)?.[1] ?? "Battlefield";
  const group = missingByArea.get(area) ?? [];
  group.push(tile);
  missingByArea.set(area, group);
}
const runtimeReplacements = [];
for (const replacement of replacements) {
  for (const { archive, directoryIndex, member, frame } of replacement.sourceCandidates ?? []) {
    const key = `${archive}:${directoryIndex}`;
    const matches = tileFramesByBlock.get(key) ?? new Set<string>();
    matches.add(`${member}:${frame}`);
    tileFramesByBlock.set(key, matches);
  }
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
function replacementPreview({ id, preview, classicPreview, width, height, placement, file, source, sourceParts, sourceCandidates, scriptCue, capturedPlacement, reflected }: typeof replacements[number]) {
  const area = placement && "area" in placement ? ` · area ${placement.area}` : "";
  const origin = placement && "x" in placement ? ` · origin (${placement.x}, ${placement.y})` : "";
  const extent = placement && "width" in placement ? ` · display ${placement.width}×${placement.height}` : "";
  const enhanced = `<a href="${preview}" target="_blank" rel="noopener"><img loading="lazy" src="${preview}" alt="${escape(file)}"${reflected ? ' style="transform:scaleX(-1)"' : ""}></a>`;
  const images = !classicPreview ? enhanced : `<div class="comparison" style="--preview-width:${Math.min(width, 176)}px">` +
    `<div><a href="${classicPreview}" target="_blank" rel="noopener"><img loading="lazy" src="${classicPreview}" alt="Classic frame"></a><small>Classic</small></div>` +
    `<div>${enhanced}<small>Enhanced</small></div></div>`;
  return `<div class="preview">${images}` +
    `<small>Enhanced · ${width}×${height} · ${escape(id)}${area}${origin}${extent}</small>` +
    `<small>${escape(file)}${reflected ? " · reflected in game" : ""}${source ? ` · member ${source.member}, frame ${source.frame}` : ""}</small>` +
    (source?.transform ? `<small>Native source transform · ${source.transform === "flip-x" ? "horizontal reflection" : "transpose"} of ${escape(source.archive)} #${source.block}</small>` : "") +
    (sourceParts?.length ? `<small>${sourceParts.map(({ archive, block }) => `${escape(archive)} #${block}`).join(" + ")}</small>` : "") +
    (scriptCue ? `<small>Dialogue cue <code>${escape(scriptCue)}</code></small>` : "") +
    (capturedPlacement ? `<small>Captured at (${capturedPlacement.x}, ${capturedPlacement.y}) · ${escape(capturedPlacement.trace)} frame ${capturedPlacement.frame}</small>` : "") +
    (sourceCandidates ? `<details class="sources"><summary>Exact pixel matches (${sourceCandidates.length})</summary>` +
      sourceCandidates.map(({ archive, block, member, frame }) =>
        `<small>${escape(archive)} #${block} · member ${member}, frame ${frame}</small>`).join("") + "</details>" : "") + "</div>";
}
const runtimeGroups = [
  { id: "scripted-scene-illustrations", label: "Scripted scene illustrations", entries: runtimeReplacements.filter(({ scriptCue }) => scriptCue) },
  { id: "runtime-artwork", label: "Runtime artwork", entries: runtimeReplacements.filter(({ scriptCue }) => !scriptCue) },
].filter(({ entries }) => entries.length);
const runtimeGallery = runtimeGroups.map(({ id, label, entries }) =>
  `<details id="${id}" data-category="${label}"><summary>${label} · ${entries.length} replacements</summary><div class="grid">` +
  entries.map((entry) => `<figure data-visual="true" data-enhanced="true" data-coverage="complete">${replacementPreview(entry)}</figure>`).join("") +
  "</div></details>").join("");
const missingGallery = [...missingByArea].sort(([left], [right]) => left.localeCompare(right, "en", { numeric: true }))
  .map(([area, tiles]) => `<details id="unmatched-${area.toLowerCase()}" data-category="Captured tiles without replacements"><summary>` +
    `${area === "Battlefield" ? area : `Area ${area}`} · ${tiles.length} captured tiles without replacements</summary><div class="grid">` +
    tiles.map(({ id, trace, frame, x, y, preview, sourceCandidates, enhancedCandidates, nativeBattlePictures }) =>
      `<figure data-visual="true" data-enhanced="false" data-coverage="missing">` +
      `<a href="${preview}" target="_blank" rel="noopener"><img width="32" height="32" loading="lazy" src="${preview}" alt="Classic tile"></a>` +
      `<p>${escape(id)}</p><p>${escape(trace)} · frame ${frame} · (${x}, ${y})</p>` +
      (nativeBattlePictures.length ? `<p>Native battlefield pictures ${nativeBattlePictures.join(", ")}</p>` : "") +
      (sourceCandidates?.length ? `<details><summary>Matching atlas frames</summary>${sourceCandidates.map(
        ({ archive, block, member, frame }) => `<p>${escape(archive)} #${block} · member ${member} · frame ${frame}</p>`).join("")}</details>` : "") +
      (enhancedCandidates?.length ? `<details><summary>Enhanced tiles with identical source pixels</summary>${enhancedCandidates.map(
        ({ id, file, preview }) => `<p><a href="${preview}" target="_blank" rel="noopener"><img width="32" height="32" loading="lazy" src="${preview}" alt="Enhanced tile"></a> ${escape(file)} · ${escape(id)}</p>`).join("")}</details>` : "") +
      "</figure>").join("") +
    "</div></details>").join("\n");
const gallery = archives.map(({ file, category, entries }) =>
  `<details id="archive-${escape(file)}" data-category="${escape(category)}"><summary>${escape(file)} · ${category} · ${entries.length} blocks</summary><div class="grid">` +
  entries.map((entry) => {
    const monster = monsterNames.get(`${file}:${entry.id}`);
    const key = `${file}:${entry.directoryIndex}`;
    const enhanced = replacementsByBlock.get(key) ?? [];
    const total = entry.enhancedFrames ? entry.pictures?.reduce((sum, picture) => sum + picture.frames, 0) ?? 0 : 0;
    const tileFrames = tileFramesByBlock.get(key);
    const linked = new Set([...enhanced.map(({ source }) => `${source?.member}:${source?.frame}`), ...(tileFrames ?? [])]).size;
    const coverage = total === 0 ? "" : linked === 0 ? "missing" : linked === total ? "complete" : "partial";
    return `<figure data-enhanced="${Boolean(linked)}" data-coverage="${coverage}" data-visual="${Boolean(entry.pictures?.length)}"><figcaption>${file} #${entry.id} · ${entry.format}${monster ? ` · ${escape(monster)}` : ""}${total ? ` · ${linked}/${total} frames linked` : ""}</figcaption>` +
    (tileFrames ? '<p>Atlas pixel matches count area-specific tiles in <a href="#runtime-artwork">Runtime artwork</a>.</p>' : "") +
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
const replacementCounts = new Map<string, number>();
for (const { id } of replacements) {
  const category = id.split(":", 1)[0]!;
  replacementCounts.set(category, (replacementCounts.get(category) ?? 0) + 1);
}
const inventoryCategories = [
  ["tile", "Exploration tiles"], ["battle-tile", "Battlefield tiles"],
  ["portrait", "Portraits and illustrations"], ["combat", "Combat frames"],
  ["combat-selection", "Combat selection frames"],
  ["combat-effect", "Combat effects"],
  ["scene-illustration", "Script illustrations"],
  ["encounter", "Encounter frames"], ["scene", "Full-screen scenes"],
] as const;
const battlefieldGaps = missingByArea.get("Battlefield")?.length ?? 0;
const loadedPngs = new Set(replacements.map(({ path }) => path)).size;
const capturedByArea = new Map<number, { captured: number; matched: number }>();
for (const id of capturedTiles.keys()) {
  const area = /^tile:(\d+):/.exec(id)?.[1];
  if (area === undefined) continue;
  const number = Number(area);
  const row = capturedByArea.get(number) ?? { captured: 0, matched: 0 };
  row.captured++;
  if (loadedIds.has(id)) row.matched++;
  capturedByArea.set(number, row);
}
const explorationCoverage = [...capturedByArea].map(([area, counts]) => ({ area, ...counts }))
  .sort((a, b) => (b.captured - b.matched) - (a.captured - a.matched) || a.area - b.area);
const explorationTotals = explorationCoverage.reduce((totals, { captured, matched }) => ({
  captured: totals.captured + captured,
  matched: totals.matched + matched,
}), { captured: 0, matched: 0 });
const battlefieldCaptured = capturedTiles.size - explorationTotals.captured;
const battlefieldTotals = { captured: battlefieldCaptured, matched: battlefieldCaptured - battlefieldGaps };
const nativeBattlefieldTotals = { captured: nativeBattleTiles.size,
  matched: [...nativeBattleTiles.keys()].filter(id => loadedIds.has(id)).length };
const portraitFrame = new Frame(320, 200);
const combatFrame = new Frame(320, 200);
const replacementsById = new Map(replacements.map(replacement => [replacement.id, replacement]));
const combatHeads = archives.find(({ file }) => file === "CHEAD.DAX")?.entries ?? [];
const dwarfHeads = combatHeads.filter(({ id }) => id < 14);
const combatBodies = archives.find(({ file }) => file === "CBODY.DAX")?.entries ?? [];
const bodyIds = new Set(combatBodies.map(({ id }) => id));
function partyCombatPose(head: number, body: number) {
  const id = `combat:party:${head}:${body}`;
  return { id, preview: replacementsById.get(id)?.preview, hasMaterialMask: materialMasks.has(id) };
}
// A full cycle through the small combat icon editor selects body IDs 0 through 31.
const dwarfWeapons = combatBodies.filter(({ id }) => id < 32 && bodyIds.has(id | 0x80));
const dwarfIconCoverage = dwarfHeads.filter((head, index) =>
  dwarfHeads.findIndex(({ sha256 }) => sha256 === head.sha256) === index
).flatMap((head) => dwarfWeapons.map(({ id: body }) => {
  return {
    head: head.id,
    aliases: dwarfHeads.filter(({ id, sha256 }) => id !== head.id && sha256 === head.sha256).map(({ id }) => id),
    body,
    ready: partyCombatPose(head.id, body),
    strike: partyCombatPose(head.id, body | 0x80),
  };
}));
// A full cycle through the Human weapon editor selects body IDs 64 through 95.
const tallWeapons = combatBodies.filter(({ id }) => id >= 64 && id <= 95 && bodyIds.has(id | 0x80));
const tallIconCoverage = combatHeads.filter(({ id }) => id >= 64 && id <= 77)
  .flatMap(({ id: head }) => tallWeapons.map(({ id: body }) => ({
    head, aliases: [], body,
    ready: partyCombatPose(head, body),
    strike: partyCombatPose(head, body | 0x80),
  })));
const defaultHumanIconCoverage = tallIconCoverage.filter(({ head }) => head === 64);
const encounterCoverage = archives.filter(({ file }) => /^(?:(?:PIC|SPRIT|CPIC)\d+|RANDCOM|COMSPR)\.DAX$/.test(file))
  .map(({ file, entries }) => {
    let frames = 0;
    const unlinkedFrames = entries.flatMap(({ id, directoryIndex, pictures }) => {
      const linked = new Set((replacementsByBlock.get(`${file}:${directoryIndex}`) ?? [])
        .filter(({ source }) => !source?.transform)
        .map(({ source }) => `${source?.member}:${source?.frame}`));
      return (pictures ?? []).flatMap((picture, member) => {
        frames += picture.frames;
        return Array.from({ length: picture.frames }, (_, frame) => ({
          id: `${file}:${directoryIndex}:${member}:${frame}`,
          block: id, directoryIndex, member, frame,
          width: picture.width * artScale, height: picture.height * artScale, preview: picture.preview,
        })).filter(({ frame }) => !linked.has(`${member}:${frame}`));
      });
    });
    const pixelMatchedFrames = unlinkedFrames.flatMap(source => {
      const width = source.width / artScale, height = source.height / artScale;
      let replacement: string | undefined;
      let reflected: boolean | undefined;
      if (file.startsWith("PIC") && width === 88 && height === 88) {
        const picture = classicPicture(file, source.directoryIndex, source.member);
        portraitFrame.blit(frameSlice(picture, source.frame), width, height, 24, 24);
        const match = matchPortrait(portraitFrame);
        if (typeof match === "string") replacement = match;
      } else if (file.startsWith("CPIC") && isCombatExtent(width, height)) {
        const picture = classicPicture(file, source.directoryIndex, source.member);
        const pixels = frameSlice(picture, source.frame);
        combatFrame.pixels.fill(0);
        combatFrame.blit(pixels, width, height, 8, 8);
        const match = matchGlobalCombatArt(combatFrame).find(([x, y, , , , w = 24, h = 24]) =>
          x === 8 && y === 8 && w === width && h === height);
        const native = match && replacementsById.get(match[2])?.source;
        if (match && native) {
          const artPicture = classicPicture(native.archive, native.directoryIndex, native.member);
          const artPixels = frameSlice(artPicture, native.frame);
          // The live matcher can separate an actor from the terrain behind
          // it. Here the candidate must match the complete pose bitmap.
          const exact = artPixels.length === pixels.length && artPixels.every((color, index) => {
            const column = index % width;
            return color === pixels[match[3] ? index - column + width - 1 - column : index];
          });
          if (exact) [, , replacement, reflected] = match;
        }
      }
      return replacement ? [{ ...source, replacement, reflected, replacementPreview: replacementsById.get(replacement)!.preview }] : [];
    });
    const pixelMatchedIds = new Set(pixelMatchedFrames.map(({ id }) => id));
    const remainingFrames = unlinkedFrames.filter(({ id }) => !pixelMatchedIds.has(id)).map(source => {
      const picture = classicPicture(file, source.directoryIndex, source.member);
      const pixels = frameSlice(picture, source.frame);
      let preview = source.preview;
      if (picture.itemCount > 1) {
        const original = new Frame(picture.width, picture.height);
        original.blit(pixels, picture.width, picture.height, 0, 0);
        preview = `frames/${source.id.replaceAll(":", "-")}.png`;
        writeFileSync(join(output, preview), encodePng(original));
      }
      const scopedCandidates = file.startsWith("CPIC") && source.member === 0 && picture.itemCount === 1
        ? (monsterPosesByPixels.get(monsterPoseSignature(file, source.directoryIndex)) ?? [])
          .filter(({ id }) => id.startsWith("combat:area:"))
          .map(({ id, preview }) => ({ id, preview }))
        : [];
      return { ...source, preview, uniform: pixels.every(color => color === pixels[0]), scopedCandidates };
    });
    return { file, frames, matched: frames - unlinkedFrames.length, pixelMatchedFrames, unlinkedFrames: remainingFrames };
  }).filter(({ frames }) => frames > 0);
const encounterTotals = encounterCoverage.reduce((total, row) => ({
  frames: total.frames + row.frames,
  matched: total.matched + row.matched,
  matchedByPixels: total.matchedByPixels + row.pixelMatchedFrames.length,
  remaining: total.remaining + row.unlinkedFrames.length,
  uniformUnlinked: total.uniformUnlinked + row.unlinkedFrames.filter(({ uniform }) => uniform).length,
  withScopedCandidates: total.withScopedCandidates + row.unlinkedFrames.filter(({ scopedCandidates }) => scopedCandidates.length).length,
}), { frames: 0, matched: 0, matchedByPixels: 0, remaining: 0, uniformUnlinked: 0, withScopedCandidates: 0 });
const encounterFamilies = [
  { label: "Scene illustrations", prefix: "PIC" },
  { label: "Encounter sprites", prefix: "SPRIT" },
  { label: "Combat poses", prefix: "CPIC" },
  { label: "Battlefield props", prefix: "RANDCOM" },
  { label: "Combat effects and selection frames", prefix: "COMSPR" },
].map(({ label, prefix }) => ({
  label,
  ...encounterCoverage.filter(({ file }) => file.startsWith(prefix)).reduce((total, row) => ({
    frames: total.frames + row.frames,
    linked: total.linked + row.matched,
    exact: total.exact + row.pixelMatchedFrames.length,
    unlinked: total.unlinked + row.unlinkedFrames.length,
  }), { frames: 0, linked: 0, exact: 0, unlinked: 0 }),
}));
writeFileSync(join(output, "index.html"), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pool of Radiance art inventory</title><style>
body{font:16px system-ui;background:#181715;color:#f3e9d6;margin:2rem auto;padding:0 1rem;max-width:1200px}
input,select{font:inherit;color:inherit;background:#242220;border:1px solid #8a7654;padding:.4em}
label{display:inline-block;margin:0 1rem .5rem 0}
.inventory-totals{display:flex;flex-wrap:wrap;gap:.5rem 1.5rem;margin:1rem 0}.inventory-totals dd{margin:0;font-weight:700;font-variant-numeric:tabular-nums}
summary{cursor:pointer;padding:.65rem 0;border-top:1px solid #514738}.grid{display:flex;flex-wrap:wrap;gap:1rem;padding:.5rem 0 1rem}
figure{margin:0;padding:.75rem;background:#242220;max-width:min(100%, 40rem);min-width:8rem}
figcaption{margin-bottom:.5rem}figure p{font-size:.85rem;color:#d6c9b4}img{image-rendering:pixelated;max-width:100%;vertical-align:middle;margin:.15rem}
.preview{display:inline-block;vertical-align:top;max-width:100%;margin:0 .35rem .5rem 0}.preview small{display:block;color:#d6c9b4}
.comparison{display:grid;grid-template-columns:repeat(2,minmax(0,var(--preview-width)));gap:.75rem;margin-bottom:.5rem}
.comparison img{display:block;width:100%;height:auto;margin:0}
.coverage-table{border-collapse:collapse;margin:.75rem 0}.coverage-table th,.coverage-table td{padding:.25rem .75rem;text-align:right;border-bottom:1px solid #514738}
</style><h1>Pool of Radiance art inventory</h1>
<p><strong>${replacements.length} loaded replacement entries</strong> · ${loadedPngs} PNG files · ${archives.length} source archives</p>
${artworkLoadIssues.length ? `<details><summary>${artworkLoadIssues.length} artwork loading issues</summary><ul>${
  artworkLoadIssues.map(({ manifest, id, reason }) =>
    `<li>${escape(manifest)}${id ? ` · <code>${escape(id)}</code>` : ""} · ${escape(reason)}</li>`).join("")
}</ul></details>` : ""}
${portraitMatchIssues.length ? `<details><summary>${portraitMatchIssues.length} portrait matching issues</summary><ul>${
  portraitMatchIssues.map(({ id, reason }) => `<li><code>${escape(id)}</code> · ${escape(reason)}</li>`).join("")
}</ul></details>` : ""}
<dl class="inventory-totals">${inventoryCategories.map(([category, label]) =>
  `<div><dt>${label}</dt><dd>${replacementCounts.get(category) ?? 0}</dd></div>`).join("")}</dl>
${capturedTiles.size ? `<p>Captured exploration patterns: ${explorationTotals.matched} of ${explorationTotals.captured} replaced, ${explorationTotals.captured - explorationTotals.matched} unmatched.</p>
${battlefieldCaptured ? `<p>Captured battlefield patterns: ${battlefieldTotals.matched} of ${battlefieldCaptured} replaced, ${battlefieldGaps} unmatched.</p>` : ""}
${nativeBattlefieldTotals.captured ? `<p>Native battlefield draws: ${nativeBattlefieldTotals.matched} of ${nativeBattlefieldTotals.captured} replaced, ${nativeBattlefieldTotals.captured - nativeBattlefieldTotals.matched} unmatched.</p>` : ""}
<p>Captured patterns can include composited sprites and transition frames.</p>` : ""}
${observedPortraitFallbacks.length ? `<details><summary>Portrait fallbacks observed during play · ${observedPortraitFallbacks.length}</summary>
<table class="coverage-table"><thead><tr><th>Area</th><th>ECL cursor</th><th>Caller</th><th>Source candidates</th><th>Linked candidates now</th><th>Dialogue</th><th>Trace frame</th></tr></thead><tbody>
${portraitFallbackCoverage.map(({ area, cursor, caller, dialogue, sources, linkedCandidates, sequence, trace }) =>
  `<tr><td>${area ?? "Unknown"}</td><td>${cursor?.toString(16).padStart(4, "0") ?? "—"}</td><td>${caller?.toString(16).padStart(4, "0") ?? "—"}</td>
  <td>${sources.map(id => `<code>${escape(id)}</code>`).join("<br>")}</td>
  <td>${linkedCandidates.map(id => `<code>${escape(id)}</code>`).join("<br>") || "None"}</td><td>${escape(dialogue ?? "")}</td>
  <td>${escape(trace)} #${sequence}</td></tr>`).join("")}
</tbody></table></details>` : ""}
${portraitTraceFrames.length ? `<details><summary>Portraits in tile traces · ${portraitTraceFrames.length}</summary><ul>${
  portraitTraceFrames.map(({ area, sources, frame, trace }) =>
    `<li>Area ${area} · ${escape(trace)} #${frame} · ${sources.map(id => `<code>${escape(id)}</code>`).join(", ")}</li>`).join("")
}</ul></details>` : ""}
${explorationCoverage.length ? `<details><summary>Exploration coverage by area</summary>
<table class="coverage-table"><thead><tr><th>Area</th><th>Captured</th><th>With replacements</th><th>Unmatched</th></tr></thead><tbody>
${explorationCoverage.map(({ area, captured, matched }) => {
  const missing = captured - matched;
  const gap = missing ? `<a href="#unmatched-${area}" aria-label="${missing} unmatched patterns in area ${area}">${missing}</a>` : "0";
  return `<tr><th scope="row">${area}</th><td>${captured}</td><td>${matched}</td><td>${gap}</td></tr>`;
}).join("")}
</tbody></table></details>` : ""}
<details><summary>Scene, encounter, and combat archives · ${encounterTotals.matched} linked · ${encounterTotals.matchedByPixels} exact matches · ${encounterTotals.remaining} unlinked</summary>
<p>An area-specific replacement counts once for the source frame. Exact matches use replacements the browser's global portrait or combat matcher already finds. Composite portraits are listed under Runtime artwork.</p>
<table class="coverage-table"><thead><tr><th>Art family</th><th>Source frames</th><th>Linked</th><th>Exact matches</th><th>Unlinked</th></tr></thead><tbody>
${encounterFamilies.map(({ label, frames, linked, exact, unlinked }) =>
  `<tr><th scope="row">${label}</th><td>${frames}</td><td>${linked}</td><td>${exact}</td><td>${unlinked}</td></tr>`).join("")}
</tbody></table>
<table class="coverage-table"><thead><tr><th>Archive</th><th>Source frames</th><th>Linked</th><th>Exact matches</th><th>Unlinked</th></tr></thead><tbody>
${encounterCoverage.map(({ file, frames, matched, pixelMatchedFrames, unlinkedFrames }) =>
  `<tr><th scope="row">${escape(file)}</th><td>${frames}</td><td>${matched}</td><td>${pixelMatchedFrames.length}</td><td>${unlinkedFrames.length ? `<a href="#unlinked-archive-${escape(file)}">${unlinkedFrames.length}</a>` : "0"}</td></tr>`).join("")}
</tbody></table></details>
<details><summary>Exact portrait and combat matches · ${encounterTotals.matchedByPixels}</summary>
<table class="coverage-table"><thead><tr><th>Source ID</th><th>Replacement ID</th><th>Preview</th></tr></thead><tbody>
${encounterCoverage.flatMap(({ pixelMatchedFrames }) => pixelMatchedFrames).map(({ id, replacement, replacementPreview, reflected }) =>
  `<tr><th scope="row"><code>${escape(id)}</code></th><td><code>${escape(replacement)}</code>${reflected ? " · mirrored" : ""}</td><td><a href="${escape(replacementPreview)}">Enhanced PNG</a></td></tr>`).join("")}
</tbody></table></details>
<details><summary>Unlinked source frames · ${encounterTotals.remaining}</summary>
<p>${encounterTotals.uniformUnlinked} unlinked frames are solid-color images.</p>
${encounterTotals.withScopedCandidates ? `<p>${encounterTotals.withScopedCandidates} unlinked combat frames have identical source pixels in an encounter with replacement art. Verify the actor and encounter before reusing those sprites.</p>` : ""}
<p>Each source ID contains the archive, directory entry, member, and zero-based frame number. Open a frame to see it at its native dimensions. Some archive frames may have no verified in-game use.</p>
${encounterCoverage.filter(({ unlinkedFrames }) => unlinkedFrames.length).map(({ file, unlinkedFrames }) =>
  `<details id="unlinked-archive-${escape(file)}"><summary>${escape(file)} · ${unlinkedFrames.length}</summary>
  <table class="coverage-table"><thead><tr><th>Source ID</th><th>Block</th><th>4× target</th><th>Preview</th></tr></thead><tbody>
  ${unlinkedFrames.map(({ id, block, width, height, preview, uniform, scopedCandidates }) =>
    `<tr><th scope="row"><code>${escape(id)}</code></th><td>${block}</td><td>${width}×${height}</td>
    <td><a href="${escape(preview)}" target="_blank" rel="noopener">Source frame</a>${uniform ? " · Solid color" : ""}
    ${scopedCandidates.length ? `<details><summary>Scoped reuse candidates (${scopedCandidates.length})</summary>${
      scopedCandidates.map(({ id, preview }) => `<div><a href="${escape(preview)}"><code>${escape(id)}</code></a></div>`).join("")
    }</details>` : ""}</td></tr>`).join("")}
  </tbody></table></details>`).join("")}
</details>
<details><summary>Named monster combat poses · ${missingMonsterPoses} without matching art · ${scopedMonsterPoseCandidates} with reuse candidates</summary>
<p>Links open the enhanced PNG. A global match is confirmed by the browser's combat matcher. Other identical source frames are candidates for reuse. Replacement IDs show area and encounter restrictions.</p>
<table class="coverage-table"><thead><tr><th scope="col">Monster</th><th scope="col">Archive</th><th scope="col">Ready</th><th scope="col">Strike</th></tr></thead><tbody>
${monsterPoseCoverage.map(({ name, dialogueName, combatFile, poses }) => `<tr><th scope="row">${escape(dialogueName ?? name)}</th><td>${escape(combatFile)}</td>${poses.map(({ block, status, links }) =>
  `<td>${block} · ${status}${links.map(({ id, preview }) => `<br><a href="${escape(preview)}">${escape(id)}</a>`).join("")}</td>`).join("")}</tr>`).join("")}
</tbody></table></details>
${Object.entries({ "Small party combat icons": dwarfIconCoverage, "Tall party combat icons": tallIconCoverage, "Default Human combat icons": defaultHumanIconCoverage })
  .map(([label, coverage]) => `<details><summary>${label} · ${coverage.filter(({ ready, strike }) => ready.preview && strike.preview).length} of ${coverage.length} combinations with both poses</summary>
<p>Head and body numbers are DAX block IDs. Identical head choices share a row for each body. ${coverage.filter(({ ready, strike }) => ready.hasMaterialMask && strike.hasMaterialMask).length} combinations have material masks for both poses.</p>
<table class="coverage-table"><thead><tr><th scope="col">CHEAD block</th><th scope="col">CBODY ready block</th><th scope="col">Ready</th><th scope="col">Strike</th></tr></thead><tbody>
${coverage.map(({ head, aliases, body, ready, strike }) => `<tr><th scope="row">${[head, ...aliases].join(", ")}</th><td>${body}</td>${[ready, strike].map(({ id, preview, hasMaterialMask }) =>
  `<td>${preview ? `<a href="${escape(preview)}">${escape(id)}</a>` : `Missing <code>${escape(id)}</code>`}${hasMaterialMask ? " · color mask" : ""}</td>`).join("")}</tr>`).join("")}
</tbody></table></details>`).join("")}
<p>Click any preview to open the full sheet. Search by archive, block number, replacement file, or nearby encounter dialogue.</p>
<label>Search <input id="search" type="search" placeholder="Tyranthraxus or PIC5"></label>
<label>Category <select id="category"><option value="">All categories</option><option>Illustrated atlas</option>${runtimeGroups.map(({ label }) => `<option>${label}</option>`).join("")}${missingGallery ? "<option>Captured tiles without replacements</option>" : ""}${[...new Set(archives.map(({ category }) => category))].sort().map((category) => `<option>${escape(category)}</option>`).join("")}</select></label>
<label><input id="include-data" type="checkbox"> Include composition and gameplay data</label>
<label>Replacement <select id="replacement"><option value="">Any</option><option value="linked">Has linked artwork</option><option value="unfinished">Has unmatched frames</option><option value="missing">No frames linked</option><option value="partial">Some frames linked</option><option value="complete">All frames linked</option></select></label>
<p id="matches" role="status"></p>
<details data-category="Illustrated atlas"><summary>Illustrated atlas · ${atlasSheets.length} plates</summary><div class="grid">
${atlasSheets.map(({ title, file, preview, width, height, areas, mapId }) => `<figure data-visual="true" data-enhanced="true" data-coverage="complete">
  <figcaption>${escape(title)} · ${width}×${height}</figcaption>
  <a href="${escape(preview)}"><img src="${escape(preview)}" alt="${escape(title)}" loading="lazy" width="320"></a>
  <p>${escape(file)} · Areas ${areas.join(", ")}${mapId === undefined ? "" : ` · Map ${mapId}`}</p>
</figure>`).join("")}</div></details>
${runtimeGallery}
${missingGallery}
${gallery}
<script>
const search = document.querySelector('#search');
const category = document.querySelector('#category');
const replacement = document.querySelector('#replacement');
const includeData = document.querySelector('#include-data');
let selectedArchive;
const archives = [...document.querySelectorAll('details[data-category]')].map((archive) => ({ archive,
  entries: [...archive.querySelectorAll('figure')].map((figure) => ({ figure, text: figure.textContent.toLowerCase() })) }));
function filter() {
  const query = search.value.trim().toLowerCase();
  let blocks = 0;
  for (const {archive, entries} of archives) {
    const categoryMatches = (!category.value || archive.dataset.category === category.value) &&
      (!selectedArchive || archive.id === selectedArchive);
    let visible = 0;
    for (const {figure, text} of entries) {
      const visual = figure.dataset.visual === 'true';
      const linked = figure.dataset.enhanced === 'true';
      const coverage = figure.dataset.coverage;
      const replacementMatches = !replacement.value || replacement.value === coverage ||
        (replacement.value === 'linked' && linked) ||
        (replacement.value === 'unfinished' && (coverage === 'missing' || coverage === 'partial'));
      figure.hidden = !categoryMatches || (!includeData.checked && !visual) || !replacementMatches || !text.includes(query);
      if (!figure.hidden) visible++;
    }
    archive.hidden = !visible;
    if (query || category.value || replacement.value) archive.open = Boolean(visible);
    blocks += visible;
  }
  document.querySelector('#matches').textContent = blocks + ' matching entries';
}
function clearArchiveFilter() {
  selectedArchive = undefined;
  filter();
}
search.addEventListener('input', clearArchiveFilter);
category.addEventListener('change', clearArchiveFilter);
includeData.addEventListener('change', filter);
replacement.addEventListener('change', clearArchiveFilter);
document.addEventListener('click', (event) => {
  const link = event.target.closest('.coverage-table a');
  if (!link) return;
  const group = document.getElementById(link.hash.slice(1));
  if (!group) return;
  if (group.id.startsWith('unlinked-archive-')) {
    for (let section = group; section; section = section.parentElement?.closest('details')) section.open = true;
    return;
  }
  search.value = '';
  category.value = group.dataset.category;
  selectedArchive = group.id.startsWith('archive-') ? group.id : undefined;
  replacement.value = selectedArchive ? 'unfinished' : 'missing';
  filter();
  group.open = true;
});
filter();
</script></html>\n`);
writeFileSync(join(output, "inventory.json"), JSON.stringify({ artScale, archives, atlasSheets, scriptReferences, monsterArt, monsterPoseCoverage, dwarfIconCoverage, tallIconCoverage, defaultHumanIconCoverage, replacements, artworkLoadIssues, portraitMatchIssues, missingTiles, observedPortraitFallbacks: portraitFallbackCoverage, portraitTraceFrames, explorationCoverage, explorationTotals, battlefieldTotals, nativeBattlefieldTotals, encounterCoverage, encounterTotals, encounterFamilies, embeddedVisuals: [
  { file: "START.EXE", status: "Runtime-rendered interface and font sources require a separate audit" },
  { file: "GAME.OVR", status: "Embedded graphics and draw procedures require a separate audit" },
] }, null, 2) + "\n");
const blocks = archives.flatMap(({ entries }) => entries);
console.log(`${archives.length} archives, ${blocks.length} blocks, ${blocks.flatMap((block) => block.pictures ?? []).length} picture sheets, ${blocks.filter((block) => block.format === "unresolved").length} unresolved blocks`);
