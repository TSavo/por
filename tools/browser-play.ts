import { spawn } from "node:child_process";
import { detectGameVersion, useGameVersion } from "../src/runtime/bindings.js";
import { createHash } from "node:crypto";
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { isPortGameRoot, readGameFile, requireBrowserGameRoot } from "./gamedata.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "./upgrade-art.js";
import { isOpenObjective, type JournalLead, type JournalObjective } from "../src/runtime/adventure-log.js";
import { getKey, type CodeWheelQuestion, type PanelFrameStamp, type PresentationAnimationFrame, type OverlandTerrainFrame, type TileInventoryCell } from "./live-input.js";
import { developerVictoryCommand } from "./developer-combat.js";
import { partyRecolorKey, type CombatArtPlacement } from "./combat-art.js";
import type { CharacterSheetPart } from "./portrait-art.js";
import { enhancedArtEnv, packagedTerrain as packagedTerrainFor, packagedTiles } from "./enhanced-runner.js";
import type { EncounterPlacement } from "./encounter-art.js";
import { exactTextNarrations as exactTextUnits, NarrationCatalog, normalizeSpeech, type NarrationTrigger, type RuntimeNarrationManifest } from "../src/runtime/narration.js";
import { buildNewPhlanMaterials } from "./new-phlan-3d-materials.js";
import { buildExplorationMaterials, explorationMaterialArea } from "./exploration-materials.js";
import { fromPortRoot, fromWorkingRoot } from "./port-root.js";
import { classicSoundDirectory } from "./classic-sounds.js";
import type { NativeExploration } from "./native-exploration.js";
import { loadOverlandTravel, type PhlanApproach, type SokalPrompt, type SokalQuay, type TravelState } from "./overland-travel.js";
import { inspectOriginalFiles, readOriginalFilesSetting, writeOriginalFilesSetting } from "./release/original-files.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43124);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
}
const origin = `http://127.0.0.1:${port}`;
const gameRoot = requireBrowserGameRoot();
// The player's first-release files, whose pictures the runner puts under the 1.3 game (#74).
const classicPictures = isPortGameRoot(gameRoot) ? process.env.POR_CLASSIC_PICTURES || undefined : undefined;
// Classic shows the player's own original pictures: playing from the port's own data alone there are none.
const classicAvailable = !isPortGameRoot(gameRoot) || Boolean(classicPictures);
// A release's "Original files" setting (#74): the launcher names the file and reads it at the next start.
const originalFilesSetting = process.env.POR_ORIGINAL_FILES_SETTING || undefined;
const originalFilesInUse = !isPortGameRoot(gameRoot) ? { folder: gameRoot, release: "1.3" }
  : classicPictures ? { folder: classicPictures, release: "first" } : null;
// What a folder looks like on this computer, for the setting's empty field.
const originalFilesExample = process.platform === "win32" ? "C:\\GOG Games\\Pool of Radiance"
  : process.platform === "darwin" ? "~/Games/Pool of Radiance" : "~/GOG Games/Pool of Radiance";
// Everything the server reads from the program depends on which build the directory holds.
const gameBuild = detectGameVersion(readGameFile(gameRoot, "GAME.OVR"));
useGameVersion(gameBuild);
const packagedTerrain = packagedTerrainFor(gameRoot);
const planTravel = loadOverlandTravel(gameRoot);
const page = readFileSync(fromPortRoot("tools", "play.html"));
const script = readFileSync(fromPortRoot("tools", "play.js"));
const heldPortraitLoops = readFileSync(fromPortRoot("tools", "held-portrait-loops.mjs"));
const streetRenderer = readFileSync(fromPortRoot("tools", "new-phlan-webgl.js"));
const wheelPage = readFileSync(fromPortRoot("tools", "code-wheel.html"));
const wheelScript = readFileSync(fromPortRoot("tools", "code-wheel.js"));
const wheelDrawing = readFileSync(fromPortRoot("tools", "code-wheel-draw.js"));
const runeGlyphs = readFileSync(fromPortRoot("tools", "rune-glyphs.js"));
const wheelLayout = readFileSync(fromPortRoot("src", "codewheel", "wheel.json"));
const runeDirectory = fromPortRoot("upgrades", "codewheel");
const wheelRunes = new Map(readdirSync(runeDirectory)
  .filter(name => /^(espruar|dethek)-\d{2}\.png$/.test(name))
  .map(name => [name.slice(0, -4), join(runeDirectory, name)]));
const codeWheelAvailable = gameBuild === "1.3" && wheelRunes.size === 70;
const wheelArt = new Set([
  "background", "outer-disc", "inner-disc", "espruar-translate-tab", "dethek-translate-tab",
  "path-dashes", "path-dash-dot-dot", "path-dots",
]);
const voiceManifest = readFileSync(fromPortRoot("src", "audio", "voices.json"));
const parsedVoiceManifest = JSON.parse(voiceManifest.toString("utf8")) as { lines: { file: string; match?: string }[] };
const voiceFiles = new Set(parsedVoiceManifest.lines.map(({ file }) => file));
const narrationManifest = readFileSync(fromPortRoot("src", "audio", "voice-master-manifest.json"));
const parsedNarrationManifest = JSON.parse(narrationManifest.toString("utf8")) as RuntimeNarrationManifest & {
  events: { sourceId: string; normalizedText: string }[]
};
const narrationCatalog = new NarrationCatalog(parsedNarrationManifest);
const narrationFiles = narrationCatalog.assetFiles();
const explicitVoiceMatches = parsedVoiceManifest.lines.flatMap(line => line.match ? [normalizeSpeech(line.match)] : []);
const exactTextNarrations = exactTextUnits(parsedNarrationManifest);
// The manifest lists the sound events of the first release. Version 1.3 replaced the driver's
// events above 12 with other sounds and never asks for them, so the rendered Classic files
// for those events do not belong to it.
const soundManifest = Buffer.from(JSON.stringify((() => {
  const manifest = JSON.parse(readFileSync(fromPortRoot("src", "audio", "original-sounds.json"), "utf8")) as
    { events: { index: number; classic?: boolean }[] };
  if (gameBuild === "1.3") for (const event of manifest.events) if (event.index > 12) event.classic = false;
  return manifest;
})()));
const geographyModel = readFileSync(fromPortRoot("src", "maps", "geography-model.json"));
const atlasManifest = readFileSync(fromPortRoot("src", "maps", "atlas.json"));
const atlasSheets = JSON.parse(atlasManifest.toString("utf8")) as { file: string; areas: number[]; mapId?: number }[];
const atlasFiles = new Set(atlasSheets.map(({ file }) => file));
const enhancedSoundFiles = new Set((JSON.parse(soundManifest.toString("utf8")) as
  { events: { enhancedFile?: string }[] }).events.flatMap(({ enhancedFile }) => enhancedFile ? [enhancedFile] : []));
const upgrades = process.env.POR_UPGRADES_DIR ?? fromWorkingRoot("upgrades");
const audioDirectory = process.env.POR_AUDIO_DIR ?? classicSoundDirectory;
const voiceDirectory = process.env.POR_VOICE_DIR ?? fromWorkingRoot("audio", "voices");
const assetDirectory = process.env.POR_ASSETS_DIR ?? fromWorkingRoot("audio");
const enhancedAudioDirectory = process.env.POR_ENHANCED_AUDIO_DIR ?? fromWorkingRoot("audio", "enhanced");
const gameFont = (() => {
  for (const path of new Set([join(upgrades, "font.woff2"), fromWorkingRoot("upgrades", "font.woff2")])) {
    try {
      return readFileSync(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced font", error);
    }
  }
})();
const artwork = loadUpgradeArt(undefined, gameRoot);
const portraitAssetKeys = new Map([...artwork]
  .filter(([id]) => id.startsWith("portrait:")).map(([id, art]) => [art.path, id]));
const materialMasks = loadCombatMaterialMasks(artwork);
let streetMaterials: ReturnType<typeof buildNewPhlanMaterials> | undefined;
const localMaterialSets = new Map<string, string>();
function newPhlanMaterials() {
  return streetMaterials ??= buildNewPhlanMaterials(gameRoot, new Map(
    [...artwork].filter(([, art]) => !art.screenCellOnly)
      .map(([key, art]) => [key, { file: art.path, reflected: Boolean(art.reflected) }])));
}
type ExplorationFrame = {
  nativeScenery?: NativeExploration & { area: number };
  scenery?: Pick<NativeExploration, "x" | "y" | "facing" | "walls" | "mapId"> & { materialId: string; area: number };
  overlandMap?: boolean;
  overlandTerrain?: OverlandTerrainFrame;
  areaView?: boolean;
  tiles?: [number, number, string][];
  tileInventory?: TileInventoryCell[];
};

function prepareScenery(view: ExplorationFrame) {
  // Keep the current travel surface until every slot in the local composition has artwork.
  if (view.overlandTerrain && (!artwork.has("overland-materials") ||
      view.overlandTerrain.slots.some(slot => !artwork.has(`overland-tile:${slot}`)))) delete view.overlandTerrain;
  const native = view.nativeScenery;
  if (!native) return;
  delete view.nativeScenery;
  const { x, y, facing, walls, area, mapId } = native;
  if (packagedTerrain && !native.viewportCleared) {
    const cells: TileInventoryCell[] = [];
    view.tiles = packagedTiles(packagedTerrain, artwork, native, cells);
    if (view.tileInventory) view.tileInventory = cells;
  }
  if (native.areaView) {
    view.areaView = true;
    return;
  }
  const materialArea = explorationMaterialArea(native);
  const harbor = materialArea === 0 && mapId === 0;
  const materialId = createHash("sha256")
    .update(JSON.stringify([area,materialArea,harbor,native.frontSlots,native.glyphs,native.skyColor,native.groundColor,
      ...(packagedTerrain ? [mapId, native.cellGeometry?.wallSymbols] : [])])).digest("hex");
  if (!localMaterialSets.has(materialId)) {
    if (localMaterialSets.size >= 32) localMaterialSets.delete(localMaterialSets.keys().next().value!);
    const materials = buildExplorationMaterials(native, artwork, packagedTerrain?.glyphs(native));
    if (harbor) {
      const { water, dockPiling } = newPhlanMaterials();
      localMaterialSets.set(materialId, JSON.stringify({ ...materials, water, dockPiling, layout: "phlan" }));
    } else localMaterialSets.set(materialId, JSON.stringify(materials));
  }
  view.scenery = { x, y, facing, walls, materialId, area, mapId };
}
const reflectedTiles = [...artwork].filter(([, art]) => art.reflected).map(([id]) => id);
let tileTrace = process.env.POR_TILE_TRACE_FILE;
let lastTileTrace: string | undefined;
let portraitTrace = process.env.POR_PORTRAIT_TRACE_FILE;
const tracedPortraits = new Set<string>();
// A release names its compiled runner, which the same Node runs. A checkout runs the TypeScript through tsx.
const runnerArguments = process.env.POR_RUNNER ? [process.env.POR_RUNNER] : ["--import", "tsx", "tools/boot-translated.ts"];
const runner = spawn(process.execPath, runnerArguments, {
  env: {
    ...process.env,
    POR_GAMEDATA: gameRoot,
    POR_BROWSER_PLAY: "1",
    // A played game rolls different dice each launch, as on DOS. Replays set POR_CLOCK=fixed.
    POR_CLOCK: process.env.POR_CLOCK ?? "real",
    // The artwork keys the runner may resolve: tools/enhanced-runner.ts, which the port parity check shares.
    ...enhancedArtEnv(artwork, materialMasks),
    POR_TRACE_TILES: tileTrace ? "1" : process.env.POR_TRACE_TILES,
    POR_LIVE_AT: process.env.POR_LIVE_AT ?? "24000000",
    // The page plays the castle ending's animation as the game draws it (#121).
    POR_PICTURE_LOOP_FRAMES: process.env.POR_PICTURE_LOOP_FRAMES ?? "1",
    POR_BOOT_STEPS: process.env.POR_BOOT_STEPS ?? "100000000",
  },
  stdio: ["pipe", "pipe", "inherit"],
  windowsHide: true,
});

interface FrameState extends ExplorationFrame {
  travelPosition?: TravelState;
  travelPolling?: boolean;
  phlanArrival?: PhlanApproach;
  sokalPrompt?: SokalPrompt;
  sokalQuay?: SokalQuay;
  districtRoad?: boolean;
  travel?: Pick<TravelState, "x" | "y" | "sector"> & { routes: ReturnType<typeof planTravel> };
  frame?: string;
  enhancedFrame?: string;
  scene?: string;
  codeWheelQuestion?: number;
  codeWheelAttempt?: number;
  codeWheel?: CodeWheelQuestion;
  portrait?: string;
  characterSheet?: CharacterSheetPart[];
  classicPortrait?: boolean;
  classicPortraitSources?: string[];
  classicPortraitArea?: number;
  classicPortraitCursor?: number;
  classicPortraitCaller?: number;
  perspective?: boolean;
  prompt?: "read" | "poll";
  awaitsKey?: boolean;
  exploration?: { area: number; mapId?: number; x: number; y: number; facing: number; cameraX?: number; cameraY?: number;
    walls?: [number, number, number, number] };
  encounter?: EncounterPlacement;
  tiles?: [number, number, string][];
  combatArt?: CombatArtPlacement[];
  combatSelections?: [number, number, string][];
  combatEffect?: [number, number, string];
  battleTiles?: [number, number, string][];
  battleProps?: CombatArtPlacement[];
  animation?: (PresentationAnimationFrame & ExplorationFrame)[];
  automaticCombat?: boolean;
  presentationPolling?: number;
  developerVictoryAvailable?: boolean;
  tileInventory?: TileInventoryCell[];
  battleTileInventory?: TileInventoryCell[];
  panelFrame?: PanelFrameStamp[];
  text?: [number, number, number][];
  runes?: [number, number, number][];
  textColors?: [number, number, number][];
  journal?: { objective: JournalObjective; leads: JournalLead[]; trackedId?: string };
}

let frame: FrameState = {};
let sequence = 0;
let ready = false;
let stopped: string | undefined;
let notice: string | undefined;
let saveSlot: string | undefined;
let saveSlotEvent = 0;
let saveSlotAction: "load" | "save" | undefined;
let lastDiagnostic = "";
let soundId = 0;
const sounds: Array<{ id: number; index: number; mode: number; step: number; enhancedOnly?: boolean }> = [];
let textId = 0;
const messages: Array<{ id: number; step: number; message: string }> = [];
let automap = '{"revision":-1,"maps":{}}';
let automapRevision = -1;
/** The page that plays the game: the newest window to start (see /state). */
let activePage: string | undefined;
let narrationId = 0;
const narrations: Array<{ id: number; step: number; unitId: string; variantId?: string;
  sourceId: string; coveredSourceIds: string[]; asset: string; text: string }> = [];
// The runner names a narration the moment the script prints its passage, which is before the game
// has drawn the screen and stopped for the player. Sent at once, the page spoke each line under the
// previous picture (measured in Chrome on Rolf's tour: every line began before its own picture, by
// seconds on a busy machine). A narration is therefore held here and given to the page with the next
// frame the game sends, so the narrator speaks when the picture he describes is up.
const heldNarrations: typeof narrations = [];
createInterface({ input: runner.stdout }).on("line", (line) => {
  if (line.startsWith("POR_FRAME ")) {
    frame = JSON.parse(line.slice("POR_FRAME ".length)) as FrameState;
    if (heldNarrations.length) {
      narrations.push(...heldNarrations.splice(0));
      while (narrations.length > 256) narrations.shift();
    }
    if (frame.travelPosition) {
      const { x, y, sector } = frame.travelPosition;
      frame.travel = { x, y, sector, routes: planTravel(frame.travelPosition) };
      delete frame.travelPosition;
    }
    prepareScenery(frame);
    frame.animation?.forEach(prepareScenery);
    // A cleared viewport between scenes has no terrain to inventory.
    if (tileTrace && frame.tileInventory?.some(([, , , indices]) => /[1-9a-f]/i.test(indices))) {
      const trace = JSON.stringify(frame.tileInventory);
      if (trace !== lastTileTrace) {
        try {
          appendFileSync(tileTrace, trace + "\n");
          lastTileTrace = trace;
        } catch (error) {
          console.error("Cannot write exploration tile trace", error);
          tileTrace = undefined;
        }
      }
    }
    sequence++;
    if (portraitTrace && frame.classicPortrait) {
      const { classicPortraitArea: area, classicPortraitCursor: cursor, classicPortraitCaller: caller, classicPortraitSources: sources = [] } = frame;
      const signature = JSON.stringify([area, cursor, caller, sources]);
      if (!tracedPortraits.has(signature)) {
        try {
          const cells = Array<string>(320).fill(" ");
          for (const [cell, character] of frame.text ?? []) {
            if (cell >= 640 && cell < 960) cells[cell - 640] = String.fromCharCode(character);
          }
          const dialogue = cells.join("").replace(/\s+/g, " ").trim();
          appendFileSync(portraitTrace, JSON.stringify({ type: "portrait-fallback", area, cursor, caller, sources, sequence, dialogue }) + "\n");
          tracedPortraits.add(signature);
        } catch (error) {
          console.error("Cannot write portrait fallback trace", error);
          portraitTrace = undefined;
        }
      }
    }
    ready = true;
  } else if (line.startsWith("POR_AUTOMAP ")) {
    // The runner owns the discovered map and stores it in the save slot.
    automap = line.slice("POR_AUTOMAP ".length);
    automapRevision = (JSON.parse(automap) as { revision: number }).revision;
  } else if (line.startsWith("POR_NOTICE ")) {
    notice = line.slice("POR_NOTICE ".length);
  } else if (line.startsWith("POR_SAVE_SLOT ")) {
    const match = /^(load|save) ([A-J])$/.exec(line.slice("POR_SAVE_SLOT ".length));
    if (match) {
      saveSlotAction = match[1] as "load" | "save";
      saveSlot = match[2];
      saveSlotEvent++;
    }
  } else if (line.startsWith("POR_SOUND ")) {
    const sound = JSON.parse(line.slice("POR_SOUND ".length)) as { index: number; mode: number; step: number; enhancedOnly?: boolean };
    sounds.push({ id: ++soundId, index: sound.index, mode: sound.mode, step: sound.step,
      ...(sound.enhancedOnly ? { enhancedOnly: true } : {}) });
    if (sounds.length > 64) sounds.shift();
  } else if (line.startsWith("POR_TEXT ")) {
    const text = JSON.parse(line.slice("POR_TEXT ".length)) as { step: number; message: string; fromEclText?: boolean };
    messages.push({ id: ++textId, step: text.step, message: text.message });
    if (messages.length > 64) messages.shift();
    const normalized = normalizeSpeech(text.message);
    const handledByExplicitVoice = explicitVoiceMatches.some(match => normalized.includes(match));
    const exact = [...new Map((exactTextNarrations.get(normalized) ?? []).map(unit => [unit.id, unit])).values()];
    if (!text.fromEclText && !handledByExplicitVoice && exact.length === 1) {
      const unit = exact[0]!;
      heldNarrations.push({ id: ++narrationId, step: text.step, unitId: unit.id,
        sourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds,
        asset: unit.asset!, text: unit.spokenText });
      if (narrations.length > 256) narrations.shift();
    }
  } else if (line.startsWith("POR_NARRATION ")) {
    const event = JSON.parse(line.slice("POR_NARRATION ".length)) as NarrationTrigger & { step?: number };
    const resolved = narrationCatalog.resolve(event);
    if (resolved.status === "resolved") {
      const narration = resolved.narration;
      heldNarrations.push({ id: ++narrationId, step: event.step ?? 0, unitId: narration.unitId,
        ...(narration.variantId ? { variantId: narration.variantId } : {}), sourceId: narration.triggerSourceId,
        coveredSourceIds: narration.coveredSourceIds, asset: narration.asset, text: narration.text });
      if (narrations.length > 256) narrations.shift();
    } else if (resolved.status === "ambiguous" || resolved.status === "selector-required") {
      console.error(`Narration ${event.sourceId}: ${resolved.status}`);
    }
  } else if (line.startsWith("entry:")) {
    lastDiagnostic = line;
  }
});
runner.on("error", (error) => { stopped = error.message; });
runner.stdin.on("error", (error) => { stopped ??= error.message; });
runner.on("close", (code) => {
  stopped ??= lastDiagnostic || `Game stopped (exit ${code}).`;
  if (frame.codeWheelQuestion !== undefined) {
    delete frame.codeWheelQuestion;
    delete frame.codeWheelAttempt;
    sequence++;
  }
});

const server = createServer(async (req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  if (req.headers.host !== `127.0.0.1:${port}`) {
    res.writeHead(403).end();
  } else if (req.method === "GET" && (req.url === "/" || req.url?.startsWith("/?"))) {
    res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
  } else if (req.method === "GET" && req.url === "/play.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(script);
  } else if (req.method === "GET" && req.url === "/held-portrait-loops.mjs") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(heldPortraitLoops);
  } else if (req.method === "GET" && /^\/code-wheel(?:\?|$)/.test(req.url ?? "")) {
    res.setHeader("content-security-policy", "default-src 'self'; style-src 'unsafe-inline'");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(wheelPage);
  } else if (req.method === "GET" && req.url === "/code-wheel.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(wheelScript);
  } else if (req.method === "GET" && req.url === "/code-wheel-draw.js") {
    // The wheel's drawing, which the standalone page and the game page share.
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(wheelDrawing);
  } else if (req.method === "GET" && req.url === "/rune-glyphs.js") {
    // Glyph code to the wheel's rune picture: the page draws the game's runes from it.
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(runeGlyphs);
  } else if (req.method === "GET" && req.url === "/code-wheel/layout") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(wheelLayout);
  } else if (req.method === "GET" && /^\/code-wheel\/[a-z0-9-]+\.png$/.test(req.url ?? "")) {
    const id = req.url!.slice("/code-wheel/".length, -4);
    const source = wheelRunes.get(id) ??
      (wheelArt.has(id) ? join(runeDirectory, `${id}.png`) : undefined);
    try {
      if (!source) { res.writeHead(404).end(); return; }
      const bytes = readFileSync(source);
      res.writeHead(200, { "content-type": "image/png" }).end(bytes);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url === "/new-phlan-webgl.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(streetRenderer);
  } else if (req.method === "GET" && req.url === "/exploration-materials/phlan") {
    try {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(newPhlanMaterials()));
    } catch (error) {
      console.error("Cannot prepare New Phlan 3D materials", error);
      res.writeHead(503).end();
    }
  } else if (req.method === "GET" && /^\/exploration-materials\/[0-9a-f]{64}$/.test(req.url ?? "")) {
    const materials = localMaterialSets.get(req.url!.slice("/exploration-materials/".length));
    if (materials) res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(materials);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url === "/voice-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(voiceManifest);
  } else if (req.method === "GET" && req.url === "/sound-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(soundManifest);
  } else if (req.method === "GET" && req.url === "/geography-model.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(geographyModel);
  } else if (req.method === "GET" && req.url === "/automap.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(automap);
  } else if (req.method === "POST" && req.url === "/automap") {
    // A map kept by an older browser, offered once for the loaded slot.
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk.toString("utf8");
        if (body.length > 2_000_000) { res.writeHead(413).end(); return; }
      }
    } catch {
      return;
    }
    let maps: unknown;
    try { maps = JSON.parse(body); } catch { res.writeHead(400).end(); return; }
    if (!ready || stopped || frame.journal || !maps || typeof maps !== "object") { res.writeHead(409).end(); return; }
    ready = false;
    runner.stdin.write(`:automap-import ${JSON.stringify(maps)}\n`);
    res.writeHead(204).end();
  } else if (req.method === "GET" && req.url === "/atlas.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(atlasManifest);
  } else if (req.method === "GET" && req.url?.startsWith("/atlas/") && atlasFiles.has(req.url.slice(7))) {
    try {
      const plate = readFileSync(fromPortRoot("upgrades", "maps", req.url.slice(7)));
      res.writeHead(200, { "content-type": "image/png", "content-length": plate.length }).end(plate);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url?.startsWith("/enhanced-audio/") && enhancedSoundFiles.has(req.url.slice(16))) {
    try {
      const file = req.url.slice(16);
      const audio = readFileSync(join(enhancedAudioDirectory, file));
      const contentType = file.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
      res.writeHead(200, { "content-type": contentType, "content-length": audio.length }).end(audio);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url?.startsWith("/narration/")) {
    const asset = decodeURIComponent(req.url.slice(11));
    if (!narrationFiles.has(asset)) { res.writeHead(404).end(); return; }
    try {
      const mp3 = readFileSync(join(assetDirectory, asset));
      res.writeHead(200, { "content-type": "audio/mpeg", "content-length": mp3.length }).end(mp3);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url?.startsWith("/voice/") && voiceFiles.has(req.url.slice(7))) {
    try {
      const wav = readFileSync(join(voiceDirectory, req.url.slice(7)));
      res.writeHead(200, { "content-type": "audio/wav", "content-length": wav.length }).end(wav);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url === "/font.woff2" && gameFont) {
    res.writeHead(200, { "content-type": "font/woff2" }).end(gameFont);
  } else if (req.method === "GET" && /^\/audio\/(?:pc-speaker|tandy)-(?:0[1-9]|1\d|20)\.wav$/.test(req.url ?? "")) {
    try {
      if (!audioDirectory) { res.writeHead(404).end(); return; }
      const wav = readFileSync(join(audioDirectory, req.url!.slice(7)));
      res.writeHead(200, { "content-type": "audio/wav", "content-length": wav.length }).end(wav);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url?.startsWith("/art-materials/")) {
    const id = req.url.slice("/art-materials/".length);
    const base = partyRecolorKey.exec(id)?.[1];
    const png = base && !artwork.has(id) ? materialMasks.get(base) : undefined;
    if (png) res.writeHead(200, { "content-type": "image/png" }).end(png);
    else res.writeHead(204).end();
  } else if (req.method === "GET" && req.url?.startsWith("/art/")) {
    const id = req.url.slice(5);
    const base = partyRecolorKey.exec(id)?.[1];
    const png = artwork.get(id)?.png ?? (base && materialMasks.has(base) ? artwork.get(base)?.png : undefined);
    if (png) res.writeHead(200, { "content-type": "image/png" }).end(png);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && (req.url === "/state" || /^\/state\?after=-?\d+$/.test(req.url ?? ""))) {
    // One window plays the game. The page names itself (X-POR-Page) and the newest one to start claims
    // the game (X-POR-Claim). Any other window, such as a second window opened on the same game, is
    // told it has been superseded and stops, so nothing is heard twice.
    const page = req.headers["x-por-page"];
    if (typeof page === "string" && req.headers["x-por-claim"] === "1") activePage = page;
    // A request with no page name (the checks reading the state from outside a page) is answered in full.
    if (activePage && typeof page === "string" && page !== activePage) {
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ superseded: true, sequence, ready: false }));
      return;
    }
    const portraitAsset = frame.portrait ? artwork.get(frame.portrait) : undefined;
    const snapshot = req.url === `/state?after=${sequence}` ? {} : {
      ...frame,
      reflectedTiles,
      portraitAssetKey: portraitAsset && portraitAssetKeys.get(portraitAsset.path),
      art: frame.scene && artwork.has(frame.scene) ? `/art/${frame.scene}` : undefined,
    };
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      ...snapshot, sounds, soundId, messages, textId, narrations, narrationId, automapRevision,
      sequence, ready, codeWheelAvailable, classicAvailable, saveSlot: saveSlot ?? null, saveSlotEvent, saveSlotAction: saveSlotAction ?? null,
      stopped: stopped ?? null, notice: notice ?? null,
    }));
  } else if (req.method === "GET" && req.url === "/original-files" && originalFilesSetting) {
    // What this start plays with, and what the setting names for the next one.
    const setting = readOriginalFilesSetting(originalFilesSetting);
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      inUse: originalFilesInUse, path: setting.path ?? null, problem: setting.problem ?? null, example: originalFilesExample,
    }));
  } else if (req.method === "POST" && req.url === "/original-files" && originalFilesSetting) {
    // The page names the player's folder, or none. Only a folder of the game's own files is written,
    // and it takes effect when the game next starts. Nothing of the folder is copied.
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    let body = "";
    try {
      for await (const chunk of req) {
        body += chunk.toString("utf8");
        if (body.length > 8192) { res.writeHead(413).end(); return; }
      }
    } catch {
      return;
    }
    let path: unknown;
    try { path = (JSON.parse(body) as { path?: unknown } | null)?.path; } catch { res.writeHead(400).end(); return; }
    const answer = (status: number, reply: object) =>
      res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(reply));
    try {
      if (path === null) {
        writeOriginalFilesSetting(originalFilesSetting, undefined);
        answer(200, { path: null });
      } else if (typeof path === "string" && path.trim()) {
        const found = inspectOriginalFiles(path);
        if ("problem" in found) { answer(422, { problem: found.problem }); return; }
        writeOriginalFilesSetting(originalFilesSetting, found.folder);
        answer(200, { path: found.folder, release: found.release });
      } else res.writeHead(400).end();
    } catch (error) {
      answer(500, { problem: `cannot write ${originalFilesSetting} (${(error as Error).message})` });
    }
  } else if (req.method === "POST" && req.url === "/key") {
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    const keyPage = req.headers["x-por-page"];
    if (activePage && typeof keyPage === "string" && keyPage !== activePage) { res.writeHead(409).end(); return; }
    let command = "";
    try {
      for await (const chunk of req) {
        command += chunk.toString("utf8");
        if (command.length > 64) { res.writeHead(400).end(); return; }
      }
    } catch {
      return;
    }
    const expected = req.headers["x-por-frame"];
    if (!ready || stopped || (expected !== undefined && expected !== String(sequence))) {
      res.writeHead(409).end();
      return;
    }
    const track = /^track ([1-9]\d{0,2})$/.exec(command);
    const validTrack = frame.journal && (command === "track auto" ||
      (track && Number(track[1]) <= frame.journal.leads.filter(isOpenObjective).length));
    // Recorded walks also keep the nonblocking polls sent by the pipe harness outside travel.
    const recordedPoll = process.env.POR_PROMPT_SCHEDULE_IN && frame.prompt === "poll" && !frame.awaitsKey;
    const validPoll = expected === String(sequence) && (command === ":poll" && (frame.automaticCombat || frame.presentationPolling) ||
      command === ":travel-poll" && (frame.travelPolling || recordedPoll));
    // While the game plays an animation by itself it takes no key: the page only asks for more of it.
    if (frame.presentationPolling && !validPoll) { res.writeHead(409).end(); return; }
    const validDeveloperVictory = command === developerVictoryCommand && expected === String(sequence) &&
      frame.developerVictoryAvailable;
    const validLabel = /^:map-label(?: [\x20-\x7e]{0,40})?$/.test(command) && Boolean(frame.exploration);
    if (command.length > 16 && !validLabel) { res.writeHead(400).end(); return; }
    const gameKey = command.startsWith("key ") ? command.slice(4) : command;
    if ((!validTrack && !validPoll && !validDeveloperVictory && !validLabel && getKey(gameKey) === undefined) ||
        (frame.journal && command.toLowerCase() !== "j" && !validTrack)) {
      res.writeHead(400).end();
      return;
    }
    const enableCodeWheel = req.headers["x-por-code-wheel"] === "enhanced" && codeWheelAvailable &&
      command === "backspace" && expected === String(sequence) &&
      (frame.scene === "scene:title" || frame.scene === "scene:publisher");
    ready = false;
    notice = undefined;
    runner.stdin.write((enableCodeWheel ? ":enable-code-wheel" : track ? `track ${track[1]}` : command) + "\n");
    res.writeHead(204).end();
  } else {
    res.writeHead(404).end();
  }
});
server.on("error", (error) => {
  console.error(error.message);
  runner.kill();
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () => console.log(`Play Pool of Radiance at ${origin}`));
const shutdown = () => { runner.kill(); server.close(); };
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
