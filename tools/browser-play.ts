import { spawn } from "node:child_process";
import { detectGameVersion, useGameVersion } from "../src/runtime/bindings.js";
import { appendFileSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { isPortGameRoot, readGameFile, requireBrowserGameRoot } from "./gamedata.js";
import { PlaySession } from "./play-session.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "./upgrade-art.js";
import { partyRecolorKey } from "./combat-art.js";
import { enhancedArtEnv } from "./enhanced-runner.js";
import { NarrationCatalog, type RuntimeNarrationManifest } from "../src/runtime/narration.js";
import { readBuildVersion } from "./build-version.js";
import { fromPortRoot } from "./port-root.js";
import { useNodeResources } from "./resources/node-play.js";
import { inspectOriginalFiles, readOriginalFilesSetting, writeOriginalFilesSetting } from "./release/original-files.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43124);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
}
const origin = `http://127.0.0.1:${port}`;
const buildVersion = readBuildVersion();
const gameDirectory = requireBrowserGameRoot();
// The player's first-release files, whose pictures the runner puts under the 1.3 game (#74).
const classicPictures = isPortGameRoot(gameDirectory) ? process.env.POR_CLASSIC_PICTURES || undefined : undefined;
// Classic shows the player's own original pictures: playing from the port's own data alone there are none.
const classicAvailable = !isPortGameRoot(gameDirectory) || Boolean(classicPictures);
// A release's "Original files" setting (#74): the launcher names the file and reads it at the next start.
const originalFilesSetting = process.env.POR_ORIGINAL_FILES_SETTING || undefined;
const originalFilesInUse = !isPortGameRoot(gameDirectory) ? { folder: gameDirectory, release: "1.3" }
  : classicPictures ? { folder: classicPictures, release: "first" } : null;
// Every file the server reads goes through the resource layer (#224); the game root is a resource root.
const { root: gameRoot, resources } = useNodeResources(gameDirectory, {
  classicPictures, originalFilesSetting, artFile: (id) => artworkPath(id),
});
/** A resource's bytes for a response, or undefined when it cannot be read (a 404, as before). */
const readResource = (id: string) => {
  try {
    const bytes = resources.readNow(id);
    return bytes && Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  } catch {
    return undefined;
  }
};
const resourceText = (id: string) => {
  const bytes = resources.readNow(id);
  if (!bytes) throw new Error(`${id} not found`);
  return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
};
// What a folder looks like on this computer, for the setting's empty field.
const originalFilesExample = process.platform === "win32" ? "C:\\GOG Games\\Pool of Radiance"
  : process.platform === "darwin" ? "~/Games/Pool of Radiance" : "~/GOG Games/Pool of Radiance";
// Everything the server reads from the program depends on which build the directory holds.
const gameBuild = detectGameVersion(readGameFile(gameRoot, "GAME.OVR"));
useGameVersion(gameBuild);
const page = readFileSync(fromPortRoot("tools", "play.html"));
const script = readFileSync(fromPortRoot("tools", "play.js"));
const heldPortraitLoops = readFileSync(fromPortRoot("tools", "held-portrait-loops.mjs"));
const streetRenderer = readFileSync(fromPortRoot("tools", "renderer.js"));
const wheelPage = readFileSync(fromPortRoot("tools", "code-wheel.html"));
const wheelScript = readFileSync(fromPortRoot("tools", "code-wheel.js"));
const wheelDrawing = readFileSync(fromPortRoot("tools", "code-wheel-draw.js"));
const runeGlyphs = readFileSync(fromPortRoot("tools", "rune-glyphs.js"));
const wheelLayout = resourceText("manifest:src/codewheel/wheel.json");
const wheelRunes = new Map(resources.listNow("codewheel:").map(id => id.slice("codewheel:".length))
  .filter(name => /^(espruar|dethek)-\d{2}\.png$/.test(name))
  .map(name => [name.slice(0, -4), `codewheel:${name}`]));
const codeWheelAvailable = gameBuild === "1.3" && wheelRunes.size === 70;
const wheelArt = new Set([
  "background", "outer-disc", "inner-disc", "espruar-translate-tab", "dethek-translate-tab",
  "path-dashes", "path-dash-dot-dot", "path-dots",
]);
const voiceManifest = resourceText("manifest:src/audio/voices.json");
const parsedVoiceManifest = JSON.parse(voiceManifest.toString("utf8")) as { lines: { file: string; match?: string }[] };
const voiceFiles = new Set(parsedVoiceManifest.lines.map(({ file }) => file));
const narrationManifest = resourceText("manifest:src/audio/voice-master-manifest.json");
const parsedNarrationManifest = JSON.parse(narrationManifest.toString("utf8")) as RuntimeNarrationManifest & {
  events: { sourceId: string; normalizedText: string }[]
};
const narrationCatalog = new NarrationCatalog(parsedNarrationManifest);
const narrationFiles = narrationCatalog.assetFiles();
// The manifest lists the sound events of the first release. Version 1.3 replaced the driver's
// events above 12 with other sounds and never asks for them, so the rendered Classic files
// for those events do not belong to it.
const soundManifest = Buffer.from(JSON.stringify((() => {
  const manifest = JSON.parse(resourceText("manifest:src/audio/original-sounds.json").toString("utf8")) as
    { events: { index: number; classic?: boolean }[] };
  if (gameBuild === "1.3") for (const event of manifest.events) if (event.index > 12) event.classic = false;
  return manifest;
})()));
const geographyModel = resourceText("map:geography-model.json");
const atlasManifest = resourceText("map:atlas.json");
const atlasSheets = JSON.parse(atlasManifest.toString("utf8")) as { file: string; areas: number[]; mapId?: number }[];
const atlasFiles = new Set(atlasSheets.map(({ file }) => file));
const enhancedSoundFiles = new Set((JSON.parse(soundManifest.toString("utf8")) as
  { events: { enhancedFile?: string }[] }).events.flatMap(({ enhancedFile }) => enhancedFile ? [enhancedFile] : []));
const gameFont = (() => {
  try {
    return resources.readNow("font");
  } catch (error) {
    console.error("Cannot load enhanced font", error);
  }
})();
const artwork = loadUpgradeArt(undefined, gameRoot);
function artworkPath(id: string) { return artwork.get(id)?.path; }
const materialMasks = loadCombatMaterialMasks(artwork);
let tileTrace = process.env.POR_TILE_TRACE_FILE;
let lastTileTrace: string | undefined;
let portraitTrace = process.env.POR_PORTRAIT_TRACE_FILE;
const tracedPortraits = new Set<string>();
// A release names its compiled runner, which the same Node runs. A checkout runs the TypeScript through tsx.
const runnerArguments = process.env.POR_RUNNER ? [process.env.POR_RUNNER] : ["--import", "tsx", "tools/boot-translated.ts"];
const runner = spawn(process.execPath, runnerArguments, {
  env: {
    ...process.env,
    POR_GAMEDATA: gameDirectory,
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

const session = new PlaySession({
  root: gameRoot, artwork, classicAvailable, codeWheelAvailable, buildVersion,
  write: (command) => { runner.stdin.write(command); },
  recordedPolls: Boolean(process.env.POR_PROMPT_SCHEDULE_IN),
  log: (line) => console.error(line),
  onFrame(frame, sequence) {
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
  },
});
createInterface({ input: runner.stdout }).on("line", (line) => session.line(line));
runner.on("error", (error) => session.failed(error.message));
runner.stdin.on("error", (error) => session.failed(error.message));
runner.on("close", (code) => session.closed(`Game stopped (exit ${code}).`));

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
      (wheelArt.has(id) ? `codewheel:${id}.png` : undefined);
    const bytes = source && readResource(source);
    if (bytes) res.writeHead(200, { "content-type": "image/png" }).end(bytes);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url === "/renderer.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(streetRenderer);
  } else if (req.method === "GET" && req.url === "/exploration-materials/phlan") {
    try {
      res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(JSON.stringify(session.newPhlanMaterials()));
    } catch (error) {
      console.error("Cannot prepare New Phlan 3D materials", error);
      res.writeHead(503).end();
    }
  } else if (req.method === "GET" && /^\/exploration-materials\/[0-9a-f]{64}$/.test(req.url ?? "")) {
    const materials = session.materials(req.url!.slice("/exploration-materials/".length));
    if (materials) res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(materials);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url === "/voice-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(voiceManifest);
  } else if (req.method === "GET" && req.url === "/sound-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(soundManifest);
  } else if (req.method === "GET" && req.url === "/geography-model.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(geographyModel);
  } else if (req.method === "GET" && req.url === "/automap.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(session.automapJson());
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
    res.writeHead(session.importAutomap(maps)).end();
  } else if (req.method === "GET" && req.url === "/atlas.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(atlasManifest);
  } else if (req.method === "GET" && req.url?.startsWith("/atlas/") && atlasFiles.has(req.url.slice(7))) {
    const plate = readResource(`atlas:${req.url.slice(7)}`);
    if (plate) res.writeHead(200, { "content-type": "image/png", "content-length": plate.length }).end(plate);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url?.startsWith("/enhanced-audio/") && enhancedSoundFiles.has(req.url.slice(16))) {
    const file = req.url.slice(16);
    const audio = readResource(`audio:enhanced:${file}`);
    const contentType = file.endsWith(".mp3") ? "audio/mpeg" : "audio/wav";
    if (audio) res.writeHead(200, { "content-type": contentType, "content-length": audio.length }).end(audio);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url?.startsWith("/narration/")) {
    const asset = decodeURIComponent(req.url.slice(11));
    if (!narrationFiles.has(asset)) { res.writeHead(404).end(); return; }
    const mp3 = readResource(`narration:${asset}`);
    if (mp3) res.writeHead(200, { "content-type": "audio/mpeg", "content-length": mp3.length }).end(mp3);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url?.startsWith("/voice/") && voiceFiles.has(req.url.slice(7))) {
    const wav = readResource(`voice:${req.url.slice(7)}`);
    if (wav) res.writeHead(200, { "content-type": "audio/wav", "content-length": wav.length }).end(wav);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && req.url === "/font.woff2" && gameFont) {
    res.writeHead(200, { "content-type": "font/woff2" }).end(gameFont);
  } else if (req.method === "GET" && /^\/audio\/(?:pc-speaker|tandy)-(?:0[1-9]|1\d|20)\.mp3$/.test(req.url ?? "")) {
    const wav = readResource(`audio:classic:${req.url!.slice(7)}`);
    if (wav) res.writeHead(200, { "content-type": "audio/mpeg", "content-length": wav.length }).end(wav);
    else res.writeHead(404).end();
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
    // One window plays the game: the session answers which (tools/play-session.ts).
    const page = req.headers["x-por-page"];
    const after = /^\/state\?after=(-?\d+)$/.exec(req.url!)?.[1];
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(
      session.state(after === undefined ? undefined : Number(after), typeof page === "string" ? page : undefined, req.headers["x-por-claim"] === "1")));
  } else if (req.method === "GET" && req.url === "/original-files" && originalFilesSetting) {
    // What this start plays with, and what the setting names for the next one.
    const setting = readOriginalFilesSetting(resources);
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
        writeOriginalFilesSetting(resources, undefined);
        answer(200, { path: null });
      } else if (typeof path === "string" && path.trim()) {
        const found = inspectOriginalFiles(path);
        if ("problem" in found) { answer(422, { problem: found.problem }); return; }
        writeOriginalFilesSetting(resources, found.folder);
        answer(200, { path: found.folder, release: found.release });
      } else res.writeHead(400).end();
    } catch (error) {
      answer(500, { problem: `cannot write ${originalFilesSetting} (${(error as Error).message})` });
    }
  } else if (req.method === "POST" && req.url === "/key") {
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    const keyPage = req.headers["x-por-page"];
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
    res.writeHead(session.key(command, {
      expected: typeof expected === "string" ? expected : undefined,
      page: typeof keyPage === "string" ? keyPage : undefined,
      codeWheel: req.headers["x-por-code-wheel"] === "enhanced",
    })).end();
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
