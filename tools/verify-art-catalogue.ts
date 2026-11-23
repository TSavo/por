/**
 * The artwork catalogue: can the port's own data name every piece of Enhanced artwork?
 *
 *   npm run verify:art-catalogue
 *
 * It reads the built-in game data, the compiled screen-cell hashes, and the artwork manifests.
 *
 * 1. For every artwork key in upgrades/manifest.json and upgrades/slums/manifest.json: can the
 *    data in game/ produce that key from identities alone? A key that names a picture is
 *    reachable when game/ lists that archive, block, member and frame. A key that carries a hash
 *    (`tile:`, `battle-tile:`) is reachable when the package stores that fingerprint. A key
 *    that names a script position or a cue is reachable only when the converted script of that
 *    area holds the position, or the cue's text.
 * 2. The other way: which original pictures and frames does no key cover? Those are what Enhanced
 *    would show blank. Every 8 by 8 tile counts as its own item and needs a 32 by 32 PNG.
 *
 * It reports static matches and separately identifies keys observed only in historical
 * framebuffer captures. It writes those results to out/art-catalogue.json and fails on
 * unexplained keys.
 * An unresolved script key can still work in play. The runtime area ID can change while the
 * previous ECL block is still loaded, and some dialogue and menu text is composed at runtime.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { runningScriptAddress, useGameVersion } from "../src/runtime/bindings.js";
import { contentBytes, readGameData, type PictureRecord, type TileCatalogue } from "../src/runtime/game-data.js";
import { portGameRoot } from "./gamedata.js";
import { pngDimensions } from "./png.js";
import { endingPortraitKey, portraitHoldAction, scriptIllustrations } from "./portrait-art.js";
import { blankApproachSprites } from "./encounter-art.js";
import { readExplorationCellHashes } from "./exploration-cells.js";
import { monsterCombatKey } from "./combat-art.js";
import { overlandLandmarkSlots, overlandMapSlots } from "./overland-travel.js";

const read = (path: string) => new Uint8Array(readFileSync(join(portGameRoot, path)));
const data = readGameData(read);
useGameVersion("1.3");
const terrainSlots = new Set(overlandMapSlots(portGameRoot));
const records = new Map(data.pictures.map((record) => [`${record.file}:${record.block}`, record]));
const { historicalBattleFramebuffer } = JSON.parse(readFileSync(new URL("../qa/art-worklist-observed.json", import.meta.url), "utf8")) as {
  historicalBattleFramebuffer: { route: string; traceSha256: string; frames: number; cells: { key: string; occurrences: number }[] };
};
const historicalBattleKeys = new Set(historicalBattleFramebuffer.cells.map(({ key }) => key));

// Native captions printed while the ECL interpreter is suspended.
const nativeCueSources = new Map<string, { overlay: number; offset: number; exampleNumber?: string }>([
  ["scene-illustration:area:7:ecl:a82d:cue:possession-threat", { overlay: 0x12, offset: 0x20b }],
  ["scene-illustration:area:7:ecl:a82d:cue:pool-recall", { overlay: 0x12, offset: 0x260 }],
  ["scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-award", { overlay: 5, offset: 0x8c7, exampleNumber: "1" }],
  ["scene-illustration:area:6:ecl:a814:cue:curse-impact", { overlay: 7, offset: 0x2089, exampleNumber: "1" }],
]);

function nativeCaption({ overlay, offset, exampleNumber = "" }: { overlay: number; offset: number; exampleNumber?: string }): string {
  const code = data.program.overlays.find(entry => entry.index === overlay)?.code;
  if (!code) return "";
  const bytes = read(code.file).subarray(code.offset, code.offset + code.length);
  const firstLength = bytes[offset] ?? 0;
  const second = offset + firstLength + 1;
  const secondLength = bytes[second] ?? 0;
  if (!firstLength || !secondLength || second + secondLength >= bytes.length) return "";
  const decode = (start: number, length: number) => Buffer.from(bytes.subarray(start + 1, start + 1 + length)).toString("ascii");
  return (decode(offset, firstLength) + exampleNumber + decode(second, secondLength)).toUpperCase().replace(/\s/g, "");
}

interface CaptionPart { kind: string; rawText?: string }
const narration = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as {
  events: { sourceId: string; source: { archive: string; block: number; address: string }; outputParts?: CaptionPart[] }[];
  units: {
    triggerSourceId: string; resolution?: string; runtimeVariants?: { text: string }[];
    sourceParts?: { sourceId: string; outputParts?: CaptionPart[] }[];
  }[];
};
const narrationSources = new Map(narration.events.map(event => [event.sourceId, event]));
const runtimeCaptions = new Map<string, string[]>();
const podalPlaza = "ECL1.DAX:18";
const patrolSightings: string[] = [];
const patrolDepartures: string[] = [];
for (const { triggerSourceId, resolution, runtimeVariants, sourceParts } of narration.units) {
  const source = narrationSources.get(triggerSourceId)?.source;
  if (!source) continue;
  const output = sourceParts?.flatMap(part => part.outputParts ?? narrationSources.get(part.sourceId)?.outputParts ?? [{ kind: "unresolved" }]) ?? [];
  const texts = resolution === "finite-runtime-variants" ? runtimeVariants?.map(({ text }) => text)
    : resolution === "resolved" && output.length > 1 && output.every(part => part.kind === "literal" && part.rawText !== undefined)
      ? [output.map(part => part.rawText).join("")] : undefined;
  if (!texts?.length) continue;
  const key = `${source.archive}:${source.block}`;
  const captions = runtimeCaptions.get(key) ?? [];
  const normalized = texts.map(text => text.toUpperCase().replace(/\s/g, ""));
  captions.push(...normalized);
  runtimeCaptions.set(key, captions);
  if (key !== podalPlaza) continue;
  if (source.address === "0xa105" && resolution === "finite-runtime-variants") {
    patrolSightings.push(...normalized);
  }
  if (source.address === "0x9b9a" || source.address === "0x9bb5") {
    const end = narrationSources.get(sourceParts?.at(-1)?.sourceId ?? "")?.source;
    if (end?.archive === source.archive && end.block === source.block &&
        (end.address === "0x9ce6" || end.address === "0x9cf6")) {
      patrolDepartures.push(...normalized);
    }
  }
}
// Disguised patrols append their reaction and departure to the dynamic creature sighting.
// The narration manifest resolves each spoken part while art matches the whole displayed caption.
runtimeCaptions.get(podalPlaza)?.push(...patrolSightings.flatMap(sighting =>
  patrolDepartures.map(departure => sighting + departure)));

// Script blocks are the primary area IDs. A script can also load a separate map.
interface AreaScript {
  archive: number; block: number; end: number; starts: Set<number>; text: string; captions: string[];
  treasureMenus: Set<number>;
}
const scripts = new Map<number, AreaScript>();
for (const record of data.content) {
  if (record.kind !== "script" || record.block === undefined) continue;
  const script = scriptFromBlock(contentBytes(record, read));
  const { instructions } = disassemble(script);
  const captions = instructions.flatMap(({ operands }) =>
    operands.flatMap(({ text }) => text ? [text.toUpperCase().replace(/\s/g, "")] : []));
  const letters = captions.join("").replace(/[^A-Z0-9.]/g, "");
  const nextInstructions = new Map(instructions.map(instruction => [instruction.address, instruction]));
  const treasureMenus = new Set<number>();
  for (const instruction of instructions) {
    if (instruction.name !== "TREASURE") continue;
    const combat = nextInstructions.get(instruction.next);
    if (combat?.name === "COMBAT") treasureMenus.add(combat.next);
  }
  scripts.set(record.block, {
    archive: Number(/\d/.exec(record.file)![0]), block: record.block, end: script.base + script.length,
    starts: new Set(nextInstructions.keys()), text: letters, captions, treasureMenus,
  });
}

const areaCatalogue = JSON.parse(readFileSync(new URL("../src/maps/area-catalog.json", import.meta.url), "utf8")) as {
  areas: { id: number; maps: { id: number }[] }[];
};
const mapOwners = new Map<number, number[]>();
for (const area of areaCatalogue.areas) {
  for (const map of area.maps) {
    if (!scripts.has(map.id)) mapOwners.set(map.id, [...(mapOwners.get(map.id) ?? []), area.id]);
  }
}
for (const [map, owners] of mapOwners) {
  if (owners.length !== 1) continue;
  const script = scripts.get(owners[0]!);
  if (script) scripts.set(map, script);
}

// Hashes game/ stores, each with the picture it names.
const tileHashes = new Map<string, string[]>();
const battleHashes = new Map<string, string[]>();
const note = (map: Map<string, string[]>, hash: string, name: string) => map.set(hash, [...(map.get(hash) ?? []), name]);
for (const record of data.pictures) {
  for (const [member, picture] of record.pictures.entries()) {
    if (/^8X8D\d\.DAX$/.test(record.file) && picture.width === 8 && picture.height === 8) {
      picture.frameHashes.forEach((hash, frame) => note(tileHashes, hash, `${record.file}:${record.block}:${frame}`));
    }
    picture.cellHashes?.forEach((cells, frame) => cells.forEach((hash, cell) => note(battleHashes, hash, `${record.file}:${record.block}:${member}:${frame}:cell${cell}`)));
  }
}

// A tile with transparent pixels over one solid colour: the hash names the tile and the colour.
const tileCatalogue = JSON.parse(new TextDecoder().decode(read(data.manifest.tiles))) as TileCatalogue;
const tilesOverColour = new Map<string, { sources: string[]; colour: number }>();
for (const { sources, overColour } of tileCatalogue.tiles) overColour?.forEach((hash, colour) => tilesOverColour.set(hash, { sources, colour }));
const composedCellHashes = new Set(Object.values(readExplorationCellHashes()));
const tileKeysByForm = { "one stored tile": 0, "one tile over a solid colour": 0, "compiled screen cell": 0 };

/** Frames a key covers, as `file:block:member:frame`. */
const covered = new Set<string>();
const cover = (record: PictureRecord, member: number, frame: number) => covered.add(`${record.file}:${record.block}:${member}:${frame}`);
let positionsNotAtInstruction = 0;

/** Why the script scope of a key is not in the converted scripts, or undefined when it is. */
function scope(area?: string, cursor?: string, caller?: string, scriptArea = area): string | undefined {
  if (area === undefined) return;
  const script = scripts.get(Number(scriptArea));
  if (!script) return cursor === undefined ? undefined : `area ${area} has no converted script`;
  for (const [what, position] of [["position", cursor], ["caller", caller]] as const) {
    if (position === undefined) continue;
    // Keys number script positions as the first release does. The converted scripts are 1.3's.
    const address = runningScriptAddress(script.archive, script.block, Number.parseInt(position, 16), "1.3");
    if (address < 0x9900 || address >= script.end) return `script ${what} ${position} is outside ${area}'s inferred script (ECL${script.archive}.DAX block ${script.block})`;
    if (!script.starts.has(address)) positionsNotAtInstruction++;
  }
}

/** Why a named frame is not in game/, or undefined when it is. Marks it covered. */
function frame(file: string, block: string, member = "0", index = "0"): string | undefined {
  const record = records.get(`${file}:${block}`);
  if (!record) return `${file} block ${block} is not in game/`;
  const picture = record.pictures[Number(member)];
  if (!picture) return `${file} block ${block} has no picture ${member}`;
  if (Number(index) >= picture.frames) return `${file} block ${block} picture ${member} has no frame ${index}`;
  cover(record, Number(member), Number(index));
}

const scoped = "(?:area:(\\d{1,3}):(?:ecl:([a-f0-9]{4}):(?:caller:([a-f0-9]{4}):)?)?)?";
function requiredPngSize(path: string, width: number, height: number): string | undefined {
  try {
    const size = pngDimensions(readFileSync(path));
    if (size?.width === width && size.height === height) return;
  } catch {
    return "its PNG could not be read";
  }
  return "its PNG must be " + width + "x" + height;
}

const rules: [RegExp, (match: RegExpExecArray, path: string) => string | undefined][] = [
  [/^overland-(tile|detail|landmark):(0|[1-9]\d{0,2})$/, ([, kind, rawSlot], path) => {
    const slot = Number(rawSlot);
    if (!terrainSlots.has(slot)) return "its slot does not appear in the native terrain table";
    if (kind === "landmark" && !overlandLandmarkSlots.has(slot)) return "its slot does not draw an overland landmark";
    return requiredPngSize(path, 96, 96);
  }],
  [/^overland-materials$/, (_, path) => requiredPngSize(path, 1024, 2048)],
  [/^tile:(\d{1,3}):([a-f0-9]{64})$/, ([, , hash]) => {
    const tiles = tileHashes.get(hash!) ?? tilesOverColour.get(hash!)?.sources;
    if (!tiles) {
      if (!composedCellHashes.has(hash!)) return "its fingerprint is absent from the stored tiles and compiled screen cells";
      tileKeysByForm["compiled screen cell"]++;
      return;
    }
    tileKeysByForm[tileHashes.has(hash!) ? "one stored tile" : "one tile over a solid colour"]++;
    for (const name of tiles) covered.add(name.replace(/:(\d+)$/, ":0:$1"));
  }],
  [/^battle-tile:([a-f0-9]{64})$/, ([, hash]) => battleHashes.has(hash!) ? undefined : "its pixels are not one stored cell of the battlefield terrain"],
  [/^combat:party:(\d{1,3}):(\d{1,3})(?::palette:[0-9a-f]{16})?$/, ([, head, body]) => frame("CHEAD.DAX", head!) ?? frame("CBODY.DAX", body!)],
  [monsterCombatKey, ([, area, file, block, cursor]) => frame(file!, block!) ?? scope(area, cursor)],
  [/^combat:(RANDCOM\.DAX):(1):(0):([0-5])$/, ([, file, block, member, index]) => frame(file!, block!, member, index)],
  [/^combat-effect:(COMSPR\.DAX):(\d{1,3})(?::(?:flip-x|transpose))?$/, ([, file, block]) => frame(file!, block!)],
  [/^combat-selection:(COMSPR\.DAX):(\d{1,3})$/, ([, file, block]) => frame(file!, block!)],
  [/^character-sheet:((?:HEAD|BODY)[1-8]\.DAX):(\d{1,3})$/, ([, file, block]) => frame(file!, block!)],
  [endingPortraitKey, ([key]) => {
    const [, , , file, block, member, index] = key.split(":");
    return frame(file!, block!, member, index);
  }],
  [/^portrait:area:(24):ecl:(aa47):cue:(?:northern|eastern|southern)-cache:(PIC1\.DAX):(1):([0-2]):(0)$/, ([key, area, cursor, file, block, member, index]) => {
    if (!scriptIllustrations.has(key)) return "its cache cue is not defined in tools/portrait-art.ts";
    return frame(file!, block!, member, index) ?? scope(area, cursor);
  }],
  [new RegExp(`^portrait:${scoped}(PIC\\d\\.DAX):(\\d{1,3}):(\\d{1,3}):(\\d{1,3})$`), ([, area, cursor, caller, file, block, member, index]) =>
    frame(file!, block!, member, index) ?? scope(area, cursor, caller)],
  [new RegExp(`^portrait:${scoped}(HEAD\\d\\.DAX):(\\d{1,3}):(BODY\\d\\.DAX):(\\d{1,3})$`), ([, area, cursor, caller, head, headBlock, body, bodyBlock]) =>
    frame(head!, headBlock!) ?? frame(body!, bodyBlock!) ?? scope(area, cursor, caller)],
  [new RegExp(`^encounter:${scoped}(SPRIT[1-8]\\.DAX):(\\d{1,3}):(\\d{1,3}):(\\d{1,3})$`), ([, area, cursor, caller, file, block, member, index]) =>
    frame(file!, block!, member, index) ?? scope(area, cursor, caller)],
  [/^scene-illustration:area:(\d{1,3}):ecl:([a-f0-9]{4})(?::caller:([a-f0-9]{4}))?(?::cue:[a-z0-9-]+)?$/, (match) => {
    const [key, area, cursor, caller] = match;
    // These transitions can leave the displayed area and active script on opposite sides of the handoff.
    let scriptArea = area;
    if (/^scene-illustration:area:19:ecl:aeeb:cue:diogenes-(?:advice-departure|bottle-departure|lair-empty)$/.test(key)) scriptArea = "25";
    // The cave's PRINTCLEAR instructions at a0ea and a4cc resume at these cursors before the area updates.
    if (/^scene-illustration:area:25:ecl:(?:a135:cue:diogenes-lair-empty|a558:cue:diogenes-flight)$/.test(key)) scriptArea = "19";
    if (/^scene-illustration:area:25:ecl:(?:b624:caller:(?:9d4d|9da7|9e0e|9bd9|9bfc)|b5ec|b6a0|(?:9bd5|9bf8|9c00):caller:9af6)(?::cue:|$)/.test(key)) scriptArea = "28";
    // Valhingen's first storm panel appears before the wilderness area ID changes.
    if (key === "scene-illustration:area:26:ecl:b695:caller:9c27") scriptArea = "10";
    // ECL7 block 26 prints the river recovery as the party leaves the Pyramid.
    if (/^scene-illustration:area:22:ecl:(?:af05:caller:9b05|ad46:caller:af09)$/.test(key)) scriptArea = "26";
    const missing = scope(area, cursor, caller, scriptArea);
    if (missing) return missing;
    const cue = scriptIllustrations.get(key);
    if (/:cue:/.test(key)) {
      if (cue === undefined) return "its cue is not defined in tools/portrait-art.ts";
      const nativeSource = nativeCueSources.get(key);
      if (nativeSource !== undefined) {
        const caption = nativeCaption(nativeSource);
        if (typeof cue === "string" ? caption.includes(cue) : cue.test(caption)) return;
      }
      // A displayed caption can outlast the script that printed it.
      // TREASURE prepares rewards; COMBAT opens the engine's loot menu at its resume cursor.
      if (cue === "VIEWTAKEPOOLEXIT" || cue === "VIEWTAKEPOOLSHAREEXIT") {
        const script = scripts.get(Number(scriptArea))!;
        const address = runningScriptAddress(script.archive, script.block, Number.parseInt(cursor, 16), "1.3");
        if (script.treasureMenus.has(address)) return;
      }
      for (const captionArea of new Set([area, scriptArea])) {
        const { archive, block, text, captions } = scripts.get(Number(captionArea))!;
        const variants = runtimeCaptions.get(`ECL${archive}.DAX:${block}`) ?? [];
        if (typeof cue === "string") {
          const normalized = cue.toUpperCase().replace(/[^A-Z0-9.]/g, "");
          if (text.includes(normalized) || variants.some(caption => caption.replace(/[^A-Z0-9.]/g, "").includes(normalized))) return;
        } else if ([text, ...captions, ...variants].some(caption => cue.test(caption))) return;
      }
      return "its cue's text is not in the area's converted script or known runtime captions";
    }
  }],
  [/^scene:(title|publisher)$/, () => records.has("TITLE.DAX:1") ? (cover(records.get("TITLE.DAX:1")!, 0, 0), cover(records.get("TITLE.DAX:2") ?? records.get("TITLE.DAX:1")!, 0, 0), undefined) : "TITLE.DAX is not in game/"],
  // The browser's title overlays are separate Enhanced art layers.
  [/^scene:title-(name|edition)$/, () => undefined],
];

interface Finding { key: string; manifest: string; reason: string }
const unreachable: Finding[] = [];
const historical: Finding[] = [];
const wrongSize: { key: string; file: string; found: string }[] = [];
const counts = new Map<string, { total: number; reachable: number; historical: number }>();
const tileArt = new Map<string, { areas: Set<string>; sized: boolean }>();
let total = 0;
for (const manifest of ["upgrades/manifest.json", "upgrades/slums/manifest.json"]) {
  const assets = (JSON.parse(readFileSync(manifest, "utf8")) as { assets: Record<string, string> }).assets;
  for (const [key, file] of Object.entries(assets)) {
    total++;
    const kind = key.split(":", 1)[0]!;
    const count = counts.get(kind) ?? { total: 0, reachable: 0, historical: 0 };
    counts.set(kind, count);
    count.total++;
    let reason: string | undefined = "the catalogue does not know this shape of key";
    for (const [pattern, rule] of rules) {
      const match = pattern.exec(key);
      if (match) { reason = rule(match, join(dirname(manifest), file)); break; }
    }
    if (!reason) count.reachable++;
    else if (kind === "battle-tile" && historicalBattleKeys.has(key)) {
      historical.push({ key, manifest, reason });
      count.historical++;
    } else unreachable.push({ key, manifest, reason });
    const tile = /^tile:(\d{1,3}):([a-f0-9]{64})$/.exec(key);
    if (tile) {
      let size: { width: number; height: number } | undefined;
      try { size = pngDimensions(readFileSync(join(dirname(manifest), file))); } catch { size = undefined; }
      const sized = size?.width === 32 && size.height === 32;
      if (!sized) wrongSize.push({ key, file, found: size ? `${size.width}x${size.height}` : "unreadable" });
      const art = tileArt.get(tile[2]!) ?? { areas: new Set<string>(), sized: true };
      art.areas.add(tile[1]!);
      art.sized &&= sized;
      tileArt.set(tile[2]!, art);
    }
  }
}

console.log("Enhanced artwork keys and their provenance");
console.log("kind                 total     static  historical    unresolved");
const summary = (kind: string, total: number, reachable: number, observed: number) =>
  `${kind.padEnd(20)} ${String(total).padStart(5)}  ${String(reachable).padStart(9)}  ${String(observed).padStart(10)}  ${String(total - reachable - observed).padStart(12)}`;
for (const [kind, { total, reachable, historical }] of [...counts].sort((a, b) => b[1].total - a[1].total)) {
  console.log(summary(kind, total, reachable, historical));
}
console.log(summary("all", total, total - historical.length - unreachable.length, historical.length));
if (historical.length) console.log(`${historical.length} keys observed in the historical ${historicalBattleFramebuffer.route} final framebuffer have no single-cell source in the static catalogue`);
console.log(`tile keys by form: ${Object.entries(tileKeysByForm).map(([form, count]) => `${form} ${count}`).join(", ")}`);
if (positionsNotAtInstruction) console.log(`${positionsNotAtInstruction} script positions named by keys are inside the script but not at the start of an instruction the disassembly reached`);
const reasons = new Map<string, number>();
for (const { reason } of unreachable) reasons.set(reason.replace(/\d+|[a-f0-9]{4}\b/g, "N"), (reasons.get(reason.replace(/\d+|[a-f0-9]{4}\b/g, "N")) ?? 0) + 1);
for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) console.log(`  ${String(count).padStart(5)}  ${reason}`);

// The other direction: every 8 by 8 tile as its own item.
console.log("\n8 by 8 tiles and their 32 by 32 replacements (a tile counts when a tile key in any area carries its hash)");
console.log("archive    block  tiles  blank  replaced  wrong size  without  areas with a key");
const blankTile = createHash("sha256").update(new Uint8Array(64)).digest("hex");
const tilesWithout: string[] = [];
let tileTotal = 0, tileReplaced = 0;
for (const record of data.pictures) {
  if (!/^8X8D\d\.DAX$/.test(record.file)) continue;
  const picture = record.pictures[0];
  if (!picture || picture.width !== 8 || picture.height !== 8) continue;
  let replaced = 0, wrong = 0, without = 0, empty = 0;
  const areas = new Set<string>();
  // A tile repeated in a set is counted each time; a tile whose pixels are all colour 0 has nothing to replace.
  for (const [index, hash] of picture.frameHashes.entries()) {
    if (hash === blankTile) { empty++; continue; }
    const art = tileArt.get(hash) ?? tileCatalogue.tiles.find((tile) => tile.hash === hash)?.overColour?.map((over) => tileArt.get(over)).find(Boolean);
    if (!art) { without++; tilesWithout.push(`${record.file}:${record.block}:${index}`); }
    else if (!art.sized) wrong++;
    else { replaced++; for (const area of art.areas) areas.add(area); }
  }
  tileTotal += picture.frames - empty;
  tileReplaced += replaced;
  console.log(`${record.file.padEnd(10)} ${String(record.block).padStart(5)}  ${String(picture.frames).padStart(5)}  ${String(empty).padStart(5)}  ${String(replaced).padStart(8)}  ${String(wrong).padStart(10)}  ${String(without).padStart(7)}  ${[...areas].sort((a, b) => +a - +b).join(",")}`);
}
console.log(`tiles that are not blank: ${tileTotal}; with a 32 by 32 replacement: ${tileReplaced}; without: ${tilesWithout.length}; tile PNGs of the wrong size: ${wrongSize.length}`);

// Every other picture frame, by archive.
console.log("\nPicture frames no key names, by archive (8 by 8 tile sets are in the table above)");
const blankSprites = new Set(blankApproachSprites(data.pictures));
const byArchive = new Map<string, { frames: number; uncovered: string[]; twins: number; holds: string[] }>();
// A frame no key names may still have the pixels of one a key does name: the hashes say so.
const namedHashes = new Set<string>();
for (const record of data.pictures) {
  record.pictures.forEach((picture, member) => picture.frameHashes.forEach((hash, index) => {
    if (covered.has(`${record.file}:${record.block}:${member}:${index}`)) namedHashes.add(`${picture.width}x${picture.height}:${hash}`);
  }));
}
for (const record of data.pictures) {
  if (/^8X8D\d\.DAX$/.test(record.file)) continue;
  const family = record.file.replace(/\d?\.DAX$/, "");
  const entry = byArchive.get(family) ?? { frames: 0, uncovered: [], twins: 0, holds: [] };
  byArchive.set(family, entry);
  for (const [member, picture] of record.pictures.entries()) {
    for (let index = 0; index < picture.frames; index++) {
      const name = `${record.file}:${record.block}:${member}:${index}`;
      if (blankSprites.has(name)) continue;
      entry.frames++;
      if (covered.has(name)) continue;
      if (portraitHoldAction(record, member, index)) { entry.holds.push(name); continue; }
      if (namedHashes.has(`${picture.width}x${picture.height}:${picture.frameHashes[index]}`)) entry.twins++;
      else entry.uncovered.push(name);
    }
  }
}
let frames = 0, uncoveredFrames = 0, twinFrames = 0, holdFrames = 0;
const inventoried = { frames: 0, named: 0, twins: 0, holds: 0 };
for (const [family, { frames: count, uncovered, twins, holds }] of byArchive) {
  frames += count;
  uncoveredFrames += uncovered.length;
  twinFrames += twins;
  holdFrames += holds.length;
  const named = count - uncovered.length - twins - holds.length;
  // docs/ART-INVENTORY.md counts the portrait, encounter and combat archives.
  if (/^(PIC|SPRIT|CPIC|COMSPR|RANDCOM)$/.test(family)) {
    inventoried.frames += count;
    inventoried.named += named;
    inventoried.twins += twins;
    inventoried.holds += holds.length;
  }
  console.log(`${family.padEnd(8)} ${String(count).padStart(5)} frames  ${String(named).padStart(5)} named by a key  ${String(twins).padStart(5)} same pixels as a named frame  ${String(holds.length).padStart(5)} portrait holds  ${String(uncovered.length).padStart(5)} not covered`);
}
console.log(`all      ${String(frames).padStart(5)} frames  ${String(frames - uncoveredFrames - twinFrames - holdFrames).padStart(5)} named by a key  ${String(twinFrames).padStart(5)} same pixels as a named frame  ${String(holdFrames).padStart(5)} portrait holds  ${String(uncoveredFrames).padStart(5)} not covered`);
console.log(`${blankSprites.size} fully transparent approach frames draw no actor`);
console.log(`PIC, SPRIT, CPIC, COMSPR and RANDCOM, the archives docs/ART-INVENTORY.md counts: ${inventoried.frames} frames, ${inventoried.named} named by a key, ${inventoried.twins} more with the pixels of a named frame, ${inventoried.holds} portrait holds`);

mkdirSync("out", { recursive: true });
writeFileSync(join("out", "art-catalogue.json"), JSON.stringify({
  keys: total, unreachable, historical, wrongSize, tilesWithout,
  portraitHolds: [...byArchive.values()].flatMap(({ holds }) => holds),
  blankApproachSprites: [...blankSprites],
  framesNoKeyNames: Object.fromEntries([...byArchive].map(([family, { uncovered }]) => [family, uncovered])),
}, null, 1) + "\n");
console.log("\nHistorical observations, unresolved keys, uncovered tiles and unnamed frames are listed in out/art-catalogue.json");
if (unreachable.length) {
  console.error(`\nverify:art-catalogue: ${unreachable.length} of ${total} artwork keys were not resolved by the static audit. The first of each kind:`);
  const shown = new Set<string>();
  for (const { key, reason } of unreachable) {
    const kind = key.split(":", 1)[0]!;
    if (shown.has(kind)) continue;
    shown.add(kind);
    console.error(`  ${key}: ${reason}`);
  }
  process.exit(1);
}
console.log(`\nverified: ${total - historical.length} static keys and ${historical.length} historical framebuffer keys`);
