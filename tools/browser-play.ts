import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { loadUpgradeArt } from "./upgrade-art.js";
import { isOpenObjective, type JournalLead, type JournalObjective } from "../src/runtime/adventure-log.js";
import { getKey, type CombatAnimationFrame, type TileInventoryCell } from "./live-input.js";
import type { CombatArtPlacement } from "./combat-art.js";
import { portraitKey } from "./portrait-art.js";
import type { EncounterPlacement } from "./encounter-art.js";
import { NarrationCatalog, type NarrationTrigger, type RuntimeNarrationManifest } from "../src/runtime/narration.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43124);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
}
const origin = `http://127.0.0.1:${port}`;
const page = readFileSync(new URL("./play.html", import.meta.url));
const script = readFileSync(new URL("./play.js", import.meta.url));
const voiceManifest = readFileSync(new URL("../src/audio/voices.json", import.meta.url));
const parsedVoiceManifest = JSON.parse(voiceManifest.toString("utf8")) as { lines: { file: string; match?: string }[] };
const voiceFiles = new Set(parsedVoiceManifest.lines.map(({ file }) => file));
const narrationManifest = readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url));
const parsedNarrationManifest = JSON.parse(narrationManifest.toString("utf8")) as RuntimeNarrationManifest & {
  events: { sourceId: string; normalizedText: string }[]
};
const narrationCatalog = new NarrationCatalog(parsedNarrationManifest);
const narrationFiles = narrationCatalog.assetFiles();
const normalizeSpeech = (text: string) => text.replace(/\s+/g, " ").trim().toUpperCase();
const explicitVoiceMatches = parsedVoiceManifest.lines.flatMap(line => line.match ? [normalizeSpeech(line.match)] : []);
const eventText = new Map(parsedNarrationManifest.events.map(event => [event.sourceId, normalizeSpeech(event.normalizedText)]));
const exactTextNarrations = new Map<string, typeof parsedNarrationManifest.units>();
for (const unit of parsedNarrationManifest.units) {
  if (!unit.asset || unit.coveredSourceIds.length !== 1 || (unit.runtimeVariants?.length ?? 0) > 0) continue;
  const text = eventText.get(unit.triggerSourceId);
  if (!text || normalizeSpeech(unit.spokenText) !== text) continue;
  exactTextNarrations.set(text, [...(exactTextNarrations.get(text) ?? []), unit]);
}
const soundManifest = readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url));
const enhancedSoundFiles = new Set((JSON.parse(soundManifest.toString("utf8")) as
  { events: { enhancedFile?: string }[] }).events.flatMap(({ enhancedFile }) => enhancedFile ? [enhancedFile] : []));
const upgrades = process.env.POR_UPGRADES_DIR ?? "upgrades";
const audioDirectory = process.env.POR_AUDIO_DIR ?? join("..", "por-assets", "original");
const voiceDirectory = process.env.POR_VOICE_DIR ?? join("..", "por-assets", "voices");
const assetDirectory = process.env.POR_ASSETS_DIR ?? join("..", "por-assets");
const enhancedAudioDirectory = process.env.POR_ENHANCED_AUDIO_DIR ?? join("..", "por-assets", "enhanced");
const gameFont = (() => {
  for (const path of new Set([join(upgrades, "font.woff2"), join("upgrades", "font.woff2")])) {
    try {
      return readFileSync(path);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced font", error);
    }
  }
})();
const artwork = loadUpgradeArt();
const encounters = Object.fromEntries([...artwork].flatMap(([id, { encounter }]) =>
  encounter ? [[id, encounter]] : []));
const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
  env: {
    ...process.env,
    POR_BROWSER_PLAY: "1",
    POR_BATTLE_TILE_KEYS: [...artwork.keys()].filter((key) => key.startsWith("battle-tile:")).join(","),
    POR_TILE_ART_KEYS: [...artwork.keys()].filter((key) => key.startsWith("tile:")).join(","),
    POR_COMBAT_ART_KEYS: [...artwork.keys()].filter((key) => key.startsWith("combat:")).join(","),
    POR_PORTRAIT_ART_KEYS: [...artwork.keys()].filter((key) => portraitKey.test(key)).join(","),
    POR_ENCOUNTER_ART: JSON.stringify(encounters),
    POR_LIVE_AT: process.env.POR_LIVE_AT ?? "24000000",
    POR_BOOT_STEPS: process.env.POR_BOOT_STEPS ?? "100000000",
  },
  stdio: ["pipe", "pipe", "inherit"],
  windowsHide: true,
});

interface FrameState {
  frame?: string;
  enhancedFrame?: string;
  scene?: string;
  portrait?: string;
  classicPortrait?: boolean;
  perspective?: boolean;
  encounter?: EncounterPlacement;
  tiles?: [number, number, string][];
  combatArt?: CombatArtPlacement[];
  battleTiles?: [number, number, string][];
  animation?: CombatAnimationFrame[];
  tileInventory?: TileInventoryCell[];
  battleTileInventory?: TileInventoryCell[];
  text?: [number, number, number][];
  textColors?: [number, number, number][];
  journal?: { objective: JournalObjective; leads: JournalLead[]; trackedId?: string };
}

let frame: FrameState = {};
let sequence = 0;
let ready = false;
let stopped: string | undefined;
let notice: string | undefined;
let lastDiagnostic = "";
let soundId = 0;
const sounds: Array<{ id: number; index: number; mode: number; step: number }> = [];
let textId = 0;
const messages: Array<{ id: number; step: number; message: string }> = [];
let narrationId = 0;
const narrations: Array<{ id: number; step: number; unitId: string; variantId?: string;
  sourceId: string; coveredSourceIds: string[]; asset: string; text: string }> = [];
createInterface({ input: runner.stdout }).on("line", (line) => {
  if (line.startsWith("POR_FRAME ")) {
    frame = JSON.parse(line.slice("POR_FRAME ".length)) as FrameState;
    sequence++;
    ready = true;
  } else if (line.startsWith("POR_NOTICE ")) {
    notice = line.slice("POR_NOTICE ".length);
  } else if (line.startsWith("POR_SOUND ")) {
    const sound = JSON.parse(line.slice("POR_SOUND ".length)) as { index: number; mode: number; step: number };
    sounds.push({ id: ++soundId, index: sound.index, mode: sound.mode, step: sound.step });
    if (sounds.length > 64) sounds.shift();
  } else if (line.startsWith("POR_TEXT ")) {
    const text = JSON.parse(line.slice("POR_TEXT ".length)) as { step: number; message: string };
    messages.push({ id: ++textId, ...text });
    if (messages.length > 64) messages.shift();
    const normalized = normalizeSpeech(text.message);
    const handledByExplicitVoice = explicitVoiceMatches.some(match => normalized.includes(match));
    const exact = exactTextNarrations.get(normalized) ?? [];
    if (!handledByExplicitVoice && exact.length === 1) {
      const unit = exact[0]!;
      narrations.push({ id: ++narrationId, step: text.step, unitId: unit.id,
        sourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds,
        asset: unit.asset!, text: unit.spokenText });
      if (narrations.length > 256) narrations.shift();
    }
  } else if (line.startsWith("POR_NARRATION ")) {
    const event = JSON.parse(line.slice("POR_NARRATION ".length)) as NarrationTrigger & { step?: number };
    const resolved = narrationCatalog.resolve(event);
    if (resolved.status === "resolved") {
      const narration = resolved.narration;
      narrations.push({ id: ++narrationId, step: event.step ?? 0, unitId: narration.unitId,
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
runner.on("close", (code) => { stopped ??= lastDiagnostic || `Game stopped (exit ${code}).`; });

const server = createServer(async (req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  if (req.headers.host !== `127.0.0.1:${port}`) {
    res.writeHead(403).end();
  } else if (req.method === "GET" && req.url === "/") {
    res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'");
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(page);
  } else if (req.method === "GET" && req.url === "/play.js") {
    res.writeHead(200, { "content-type": "text/javascript; charset=utf-8" }).end(script);
  } else if (req.method === "GET" && req.url === "/voice-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(voiceManifest);
  } else if (req.method === "GET" && req.url === "/sound-manifest.json") {
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(soundManifest);
  } else if (req.method === "GET" && req.url?.startsWith("/enhanced-audio/") && enhancedSoundFiles.has(req.url.slice(16))) {
    try {
      const wav = readFileSync(join(enhancedAudioDirectory, req.url.slice(16)));
      res.writeHead(200, { "content-type": "audio/wav", "content-length": wav.length }).end(wav);
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
      const wav = readFileSync(join(audioDirectory, req.url!.slice(7)));
      res.writeHead(200, { "content-type": "audio/wav", "content-length": wav.length }).end(wav);
    } catch {
      res.writeHead(404).end();
    }
  } else if (req.method === "GET" && req.url?.startsWith("/art/")) {
    const png = artwork.get(req.url.slice(5))?.png;
    if (png) res.writeHead(200, { "content-type": "image/png" }).end(png);
    else res.writeHead(404).end();
  } else if (req.method === "GET" && (req.url === "/state" || /^\/state\?after=-?\d+$/.test(req.url ?? ""))) {
    const snapshot = req.url === `/state?after=${sequence}` ? {} : {
      ...frame,
      art: frame.scene === "scene:title" && artwork.has(frame.scene) ? `/art/${frame.scene}` : undefined,
    };
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      ...snapshot, sounds, soundId, messages, textId, narrations, narrationId,
      sequence, ready, stopped: stopped ?? null, notice: notice ?? null,
    }));
  } else if (req.method === "POST" && req.url === "/key") {
    if (req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    let command = "";
    try {
      for await (const chunk of req) {
        command += chunk.toString("utf8");
        if (command.length > 16) { res.writeHead(400).end(); return; }
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
    const gameKey = command.startsWith("key ") ? command.slice(4) : command;
    if ((!validTrack && getKey(gameKey) === undefined) ||
        (frame.journal && command.toLowerCase() !== "j" && !validTrack)) {
      res.writeHead(400).end();
      return;
    }
    ready = false;
    notice = undefined;
    runner.stdin.write((track ? `track ${track[1]}` : command) + "\n");
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
