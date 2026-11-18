import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createInterface } from "node:readline";
import { join } from "node:path";
import { lookupOverride, type OverrideManifest } from "../src/lib/assets.js";
import { isOpenObjective, type JournalLead, type JournalObjective } from "../src/runtime/adventure-log.js";
import { getKey } from "./live-input.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43124);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
}
const origin = `http://127.0.0.1:${port}`;
const page = readFileSync(new URL("./play.html", import.meta.url));
const script = readFileSync(new URL("./play.js", import.meta.url));
const upgrades = process.env.POR_UPGRADES_DIR ?? "upgrades";
const titleArt = (() => {
  try {
    const manifest = JSON.parse(readFileSync(join(upgrades, "manifest.json"), "utf8")) as OverrideManifest;
    if (manifest.version !== 1 || !manifest.assets) return;
    const file = lookupOverride(manifest, "scene:title");
    if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) return;
    const png = readFileSync(join(upgrades, file));
    if (png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return png;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced title artwork", error);
  }
})();
const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
  env: {
    ...process.env,
    POR_BROWSER_PLAY: "1",
    POR_LIVE_AT: process.env.POR_LIVE_AT ?? "24000000",
    POR_BOOT_STEPS: process.env.POR_BOOT_STEPS ?? "100000000",
  },
  stdio: ["pipe", "pipe", "inherit"],
  windowsHide: true,
});

interface FrameState {
  frame?: string;
  scene?: string;
  journal?: { objective: JournalObjective; leads: JournalLead[]; trackedId?: string };
}

let frame: FrameState = {};
let sequence = 0;
let ready = false;
let stopped: string | undefined;
let notice: string | undefined;
let lastDiagnostic = "";
createInterface({ input: runner.stdout }).on("line", (line) => {
  if (line.startsWith("POR_FRAME ")) {
    frame = JSON.parse(line.slice("POR_FRAME ".length)) as FrameState;
    sequence++;
    ready = true;
  } else if (line.startsWith("POR_NOTICE ")) {
    notice = line.slice("POR_NOTICE ".length);
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
  } else if (req.method === "GET" && req.url === "/art/title.png" && titleArt) {
    res.writeHead(200, { "content-type": "image/png" }).end(titleArt);
  } else if (req.method === "GET" && (req.url === "/state" || /^\/state\?after=-?\d+$/.test(req.url ?? ""))) {
    const snapshot = req.url === `/state?after=${sequence}` ? {} : {
      ...frame, art: titleArt && frame.scene === "scene:title" ? "/art/title.png" : undefined,
    };
    res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({
      ...snapshot, sequence, ready, stopped: stopped ?? null, notice: notice ?? null,
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
