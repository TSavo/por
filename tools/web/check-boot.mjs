// The boot proof of #225: the same walk through the Node runner (the pipe) and through the bundled
// engine in a Web Worker in headless Chrome (tools/web/boot.html), frame for frame.
//
//   node tools/web/check-boot.mjs [--original <folder>]
//
// With --original (#226), the player's own original files: the runner is given them as the launcher
// gives them (POR_GAMEDATA for version 1.3, POR_CLASSIC_PICTURES for the first release); the page reads
// them as a picked folder (tools/web/original-picker.ts), and a folder without the game is refused.
//
// The Node runner plays the walk the way the acceptance harness does (tools/acceptance/harness.mjs): it
// answers a poll the game makes by itself with ":travel-poll" and gives the next key when the game
// waits for the player: SSI's ready-made party, Begin Adventuring through the tour, a turn and a step.
// Every command it read is recorded; the browser engine is given exactly those commands. Each frame's
// screen text, party position and raw pixels (POR_FRAME_PIXELS) must be the same in both.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { exploring, pressReturn } from "../acceptance/harness.mjs";
import { openChrome } from "./chrome-check.mjs";
import { serveOriginalFolder } from "./original-test-server.mjs";

const argument = (name) => { const at = process.argv.indexOf(name); return at < 0 ? undefined : process.argv[at + 1]; };
const originalFolder = argument("--original");
// The game's folder: the one named, or the one inside it with GAME.OVR (GOG's POOLRAD).
const gameFolder = originalFolder && [originalFolder, ...readdirSync(originalFolder).map((name) => join(originalFolder, name))]
  .find((folder) => existsSync(join(folder, "GAME.OVR")));
const release = gameFolder && { FBOV: "1.3", TPOV: "first" }[readFileSync(join(gameFolder, "GAME.OVR")).subarray(0, 4).toString("latin1")];
if (originalFolder) assert.ok(release, `${originalFolder} holds no original game.`);
const originalEnv = release === "1.3" ? { POR_GAME_SOURCE: "", POR_GAMEDATA: gameFolder }
  : release === "first" ? { POR_GAME_SOURCE: "port", POR_GAMEDATA: "", POR_CLASSIC_PICTURES: gameFolder }
  : { POR_GAME_SOURCE: "port", POR_GAMEDATA: "" };

const work = mkdtempSync(join(tmpdir(), "por-check-boot-"));
const probe = createServer();
await new Promise((done) => probe.listen(0, "127.0.0.1", done));
const port = probe.address().port;
await new Promise((done) => probe.close(done));
const server = spawn(process.execPath, ["--import", "tsx", "tools/web/serve.ts"], { env: { ...process.env, POR_PLAY_PORT: String(port) }, stdio: ["ignore", "pipe", "inherit"] });
await new Promise((done) => server.stdout.on("data", (chunk) => /browser build at/.test(chunk) && done()));
const origin = `http://127.0.0.1:${port}`;
const index = await (await fetch(`${origin}/resource-index.json`)).json();
const artFile = join(work, "art.json");
writeFileSync(artFile, JSON.stringify(index.engineEnv));
// The runner's settings as tools/browser-play.ts starts it, with the replay's fixed clock and the harness's start.
const env = {
  POR_BROWSER_PLAY: "1", POR_CLOCK: "fixed", POR_PREGEN_PARTY: "1", POR_FRAME_PIXELS: "1",
  POR_BOOT_KEYS: "31000000:1c0d", POR_LIVE_AT: "50000000", POR_BOOT_STEPS: "450000000", POR_PICTURE_LOOP_FRAMES: "1",
};
const screen = (frame) => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text ?? []) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ").trim();
};
const summary = (frame) => ({ text: screen(frame), exploration: frame.exploration ?? null,
  pixels: frame.pixels ? createHash("sha256").update(frame.pixels).digest("hex") : null, scene: frame.scene ?? null });

// 1. The Node runner.
const nodeStarted = Date.now();
const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
  env: { ...process.env, ...env, ...originalEnv, POR_SAVE_DIR: join(work, "saves"), POR_ENHANCED_ART_FILE: artFile },
  stdio: ["pipe", "pipe", "pipe"],
});
runner.stderr.resume();
const commands = [];
const nodeFrames = [];
let stage = "menu", added = 0, steps = 0;
const next = (text) => {
  if (stage === "menu") { if (/Add Character to Party/.test(text) && !/BEGIN/.test(text)) { stage = "add"; return "a"; } return "enter"; }
  if (stage === "add") {
    const marked = (text.match(/\* \w+/g) ?? []).length;
    if (/Add a character: Add Exit/.test(text)) {
      if (marked >= 6) return "e";
      if (marked > added) { added = marked; return "end"; }
      return "a";
    }
    if (/BEGIN Adventuring/.test(text)) { stage = "opening"; return "b"; }
    return "enter";
  }
  if (stage === "opening") { if (exploring.test(text)) { stage = "walk"; return "down"; } return "enter"; }
  if (stage === "walk") { steps++; if (steps === 1) return "up"; if (pressReturn.test(text)) return "enter"; return ":quit"; }
};
await new Promise((done) => {
  createInterface({ input: runner.stdout }).on("line", (line) => {
    if (!line.startsWith("POR_FRAME ")) return;
    const frame = JSON.parse(line.slice(10));
    nodeFrames.push(summary(frame));
    const command = frame.awaitsKey ? next(screen(frame)) : ":travel-poll";
    commands.push(command);
    runner.stdin.write(command + "\n");
  });
  runner.on("exit", done);
});
const nodeMs = Date.now() - nodeStarted;
console.log(`${originalFolder ? `${originalFolder} (${release === "1.3" ? "version 1.3" : "the first release"})` : "the port's own data"}`);
console.log(`node runner: ${nodeFrames.length} frames for ${commands.length} commands in ${nodeMs} ms; last: ${nodeFrames.at(-1)?.text}`);
assert.ok(exploring.test(nodeFrames.at(-1)?.text ?? ""), "The walk must end at the exploration menu.");

// 2. The browser engine, given the same commands.
const page = await openChrome(`${origin}/boot.html`);
const served = originalFolder && await serveOriginalFolder(originalFolder);
// A folder without the game: refused with the launcher's kind of problem.
const notGame = originalFolder && await serveOriginalFolder(join(process.cwd(), "src", "maps"));
let browser, refused;
try {
  await page.until("the boot page", "typeof window.porBootCheck === 'function'");
  if (notGame) {
    refused = await page.evaluate(`porBootCheck(${JSON.stringify({ env, commands: [], original: notGame.url })})`);
    console.log(`a folder without the game: ${refused.problem}`);
    assert.match(refused.problem ?? "", /^maps has no START\.EXE, GAME\.OVR, ECL1\.DAX$/);
  }
  browser = await page.evaluate(`porBootCheck(${JSON.stringify({ env, commands, original: served?.url })})`);
  if (served) {
    console.log(`original files: ${JSON.stringify(browser.original)}`);
    assert.equal(browser.original?.release, release);
  }
} finally {
  served?.close();
  notGame?.close();
  await page.close();
  server.kill();
  rmSync(work, { recursive: true, force: true });
}
const browserFrames = browser.frames.map((frame) => ({ text: frame.text, exploration: frame.exploration ?? null,
  pixels: frame.pixels ? createHash("sha256").update(frame.pixels).digest("hex") : null, scene: frame.scene ?? null }));
console.log(`browser engine: cross-origin isolated ${browser.crossOriginIsolated}; preloaded ${JSON.stringify(browser.preloaded)} bytes;` +
  ` first frame ${browser.firstFrameMs} ms; ${browserFrames.length} frames in ${browser.totalMs} ms; stopped: ${browser.stopped}`);
let same = 0;
for (; same < Math.min(nodeFrames.length, browserFrames.length); same++) {
  if (JSON.stringify(nodeFrames[same]) !== JSON.stringify(browserFrames[same])) break;
}
console.log(`frames identical (text, position, pixels): ${same} / ${nodeFrames.length}`);
if (same < nodeFrames.length) {
  console.log("node   :", JSON.stringify(nodeFrames[same]).slice(0, 400));
  console.log("browser:", JSON.stringify(browserFrames[same] ?? null).slice(0, 400));
  console.log("browser lines:", browser.other.join("\n"));
}
assert.equal(browserFrames.length, nodeFrames.length, "The browser engine must draw as many frames as the runner.");
assert.equal(same, nodeFrames.length, "Every frame must be the same.");
console.log("the bundled engine booted in Chrome from preloaded game/ data and replayed the walk frame for frame");
