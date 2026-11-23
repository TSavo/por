// The saves of #227 through the browser engine: the same games through the Node runner, whose slots
// are files in a folder (tools/save-slots.ts), and through the bundled engine in headless Chrome, whose
// slots are IndexedDB records (tools/web/idb-provider.ts), compared frame for frame and byte for byte.
//
//   node tools/web/check-saves.mjs
//
// 1. A new party: SSI's ready-made characters (written to the roster), Begin Adventuring, a turn and
//    a step, Encamp, Save in slot A. The browser's records must be the runner's files, byte for byte.
// 2. Start again and Load slot A, from the browser's own records.
// 3. Start again with the records the Node runner wrote, put into a fresh store: existing slot files load.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { exploring, pressReturn } from "../acceptance/harness.mjs";
import { openChrome } from "./chrome-check.mjs";

const work = mkdtempSync(join(tmpdir(), "por-check-saves-"));
const saves = join(work, "saves");
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
const env = {
  POR_BROWSER_PLAY: "1", POR_CLOCK: "fixed", POR_PREGEN_PARTY: "1", POR_FRAME_PIXELS: "1",
  POR_BOOT_KEYS: "31000000:1c0d", POR_LIVE_AT: "50000000", POR_BOOT_STEPS: "450000000", POR_PICTURE_LOOP_FRAMES: "1",
};
const screen = (frame) => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text ?? []) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ").trim();
};
const digest = (pixels) => pixels ? createHash("sha256").update(pixels).digest("hex") : null;

/** One game through the Node runner, its keys chosen by `next` from each screen that waits for one. */
async function runNode(next) {
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: { ...process.env, ...env, POR_GAME_SOURCE: "port", POR_GAMEDATA: "", POR_SAVE_DIR: saves, POR_ENHANCED_ART_FILE: artFile },
    stdio: ["pipe", "pipe", "pipe"],
  });
  runner.stderr.resume();
  const commands = [], frames = [];
  await new Promise((done) => {
    createInterface({ input: runner.stdout }).on("line", (line) => {
      if (!line.startsWith("POR_FRAME ")) return;
      const frame = JSON.parse(line.slice(10));
      frames.push({ text: screen(frame), exploration: frame.exploration ?? null, pixels: digest(frame.pixels) });
      const command = frame.awaitsKey ? next(screen(frame)) : ":travel-poll";
      commands.push(command);
      runner.stdin.write(command + "\n");
    });
    runner.on("exit", done);
  });
  return { commands, frames };
}

function newParty() {
  let stage = "menu", added = 0, steps = 0;
  const camp = ["e", "s", "a", "n", "e"];
  return (text) => {
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
    if (stage === "walk") {
      if (++steps === 1) return "up";
      if (pressReturn.test(text)) return "enter";
      stage = "camp";
    }
    return camp.shift() ?? ":quit";
  };
}
function loadSlotA() {
  let asked = false;
  return (text) => {
    if (/Load Which Game: A/.test(text)) { asked = true; return "a"; }
    if (!asked) return /Load Saved Game/.test(text) ? "l" : "enter";
    if (exploring.test(text)) return ":quit";
    return "enter";
  };
}

const saved = await runNode(newParty());
const savedFiles = Object.fromEntries(readdirSync(saves).sort().map((file) => [`save:${file.replace(/\.json$/, "")}`, readFileSync(join(saves, file), "utf8")]));
const loaded = await runNode(loadSlotA());
console.log(`node runner: saved ${Object.keys(savedFiles).join(", ")}; after loading A: ${loaded.frames.at(-1)?.text}`);
assert.ok(savedFiles["save:A"] && savedFiles["save:roster"], "The runner must have written slot A and the roster.");
assert.ok(exploring.test(loaded.frames.at(-1)?.text ?? ""), "Loading slot A must end at the exploration menu.");

const page = await openChrome(`${origin}/boot.html`);
const failures = [];
const same = (what, node, browser) => {
  const frames = browser.frames.map(({ text, exploration, pixels }) => ({ text, exploration: exploration ?? null, pixels: digest(pixels) }));
  let at = 0;
  while (at < node.frames.length && JSON.stringify(node.frames[at]) === JSON.stringify(frames[at])) at++;
  const ok = at === node.frames.length && frames.length === node.frames.length;
  console.log(`${ok ? "ok  " : "FAIL"} ${what}: ${at} / ${node.frames.length} frames identical (browser drew ${frames.length}); last: ${frames.at(-1)?.text}`);
  if (!ok) failures.push(what);
};
try {
  await page.until("the boot page", "typeof window.porBootCheck === 'function'");
  const play = (commands, records) => page.evaluate(`porBootCheck(${JSON.stringify({ env, commands, records })})`);

  const first = await play(saved.commands, { database: "por-check-saves", clear: true });
  same("a new party saved in slot A", saved, first);
  const records = first.records ?? {};
  for (const [id, text] of Object.entries(savedFiles)) {
    const ok = records[id] === text;
    console.log(`${ok ? "ok  " : "FAIL"} ${id} in IndexedDB is the runner's file byte for byte (${text.length} bytes)`);
    if (!ok) failures.push(id);
  }

  same("slot A loads from the browser's own records", loaded, await play(loaded.commands, { database: "por-check-saves" }));

  const seed = Object.entries(savedFiles).map(([id, text]) => [id, Buffer.from(text).toString("base64")]);
  same("slot files the Node game wrote load in the browser", loaded, await play(loaded.commands, { database: "por-check-saves-seeded", clear: true, seed }));
} finally {
  await page.close();
  server.kill();
  rmSync(work, { recursive: true, force: true });
}
console.log(failures.length ? `${failures.length} failed` : "all passed");
process.exitCode = failures.length ? 1 : 0;
