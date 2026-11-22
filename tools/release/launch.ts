/**
 * Starts an installed Pool of Radiance: the game server on a localhost port, then the player's browser
 * on it. `npm run release:build` compiles this to app/launch.mjs, which the release's own Node runs:
 *
 *   <root>/app/launch.mjs     this launcher
 *   <root>/app/server.mjs     tools/browser-play.ts, compiled
 *   <root>/app/runner.mjs     tools/boot-translated.ts, compiled
 *   <root>/game, upgrades, audio, qa, src, tools    the port's own files
 *
 * The game always runs from the port's own data in game/. Saves and the game's other writes go to the
 * player's own directory (userDataDirectory below). Ctrl-C, closing the terminal, or quitting the Mac
 * app stops the server and the runner. Launched again while the game runs, it opens the browser on the
 * running game instead of starting another.
 *
 *   POR_OPEN_BROWSER=0   print the address without opening a browser
 */
import { execFile } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// The console window's title on Windows.
process.title = "Pool of Radiance";
const appDirectory = dirname(fileURLToPath(import.meta.url));
const root = dirname(appDirectory);
const preferredPort = 43124;

function userDataDirectory(): string {
  if (process.platform === "darwin") return join(homedir(), "Library", "Application Support", "Pool of Radiance");
  if (process.platform === "win32") return join(process.env.APPDATA ?? join(homedir(), "AppData", "Roaming"), "Pool of Radiance");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "pool-of-radiance");
}

/** The preferred port when it is free, so the page keeps its browser storage across launches; else any free one. */
function freePort(port = preferredPort): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once("error", (error) => port ? freePort(0).then(resolve, reject) : reject(error));
    probe.listen(port, "127.0.0.1", () => {
      const address = probe.address();
      probe.close(() => typeof address === "object" && address ? resolve(address.port) : reject(new Error("No port")));
    });
  });
}

function answers(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const probe = request(url, { method: "GET", timeout: 2000 }, (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });
    probe.on("error", () => resolve(false));
    probe.on("timeout", () => { probe.destroy(); resolve(false); });
    probe.end();
  });
}

function openBrowser(url: string): void {
  if (process.env.POR_OPEN_BROWSER === "0") return;
  const fallback = (error: Error | null) => {
    if (!error) return;
    // No Chrome: the player's default browser.
    const [command, args] = process.platform === "darwin" ? ["open", [url]]
      : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
    execFile(command, args, { windowsHide: true }, (failed) => {
      if (failed) console.log(`Could not open a browser (${failed.message}). Open ${url} yourself.`);
    });
  };
  // The game is made for Chrome. Where Chrome is installed it is used.
  if (process.platform === "darwin") execFile("open", ["-a", "Google Chrome", url], fallback);
  else if (process.platform === "win32") execFile("cmd", ["/c", "start", "", "chrome", url], { windowsHide: true }, fallback);
  else fallback(new Error("xdg-open"));
}

const dataDirectory = userDataDirectory();
mkdirSync(dataDirectory, { recursive: true });
const runningFile = join(dataDirectory, "running.json");

// A second launch while the game runs opens the running game.
try {
  const running = JSON.parse(readFileSync(runningFile, "utf8")) as { pid: number; url: string };
  process.kill(running.pid, 0);
  if (await answers(running.url)) {
    console.log(`Pool of Radiance is already running at ${running.url}`);
    openBrowser(running.url);
    process.exit(0);
  }
} catch {
  // Not running.
}

const port = await freePort();
const url = `http://127.0.0.1:${port}/`;
const saveDirectory = process.env.POR_SAVE_DIR || join(dataDirectory, "saves");
mkdirSync(saveDirectory, { recursive: true });

// Only these settings pass through from the environment. Everything else that steers the server or the
// runner, such as POR_GAMEDATA or the asset directories a checkout uses, is dropped, so the release
// runs on its own files whatever environment it is started from.
const passed = new Set(["POR_CLOCK", "POR_PREGEN_PARTY", "POR_OPEN_BROWSER", "POR_TRACE_KEYS"]);
for (const name of Object.keys(process.env)) if (name.startsWith("POR_") && !passed.has(name)) delete process.env[name];
Object.assign(process.env, {
  POR_ROOT: root,
  POR_RUNNER: join(appDirectory, "runner.mjs"),
  POR_GAME_SOURCE: "port",
  POR_SAVE_DIR: saveDirectory,
  POR_PLAY_PORT: String(port),
});
// The runner writes its reports to out/ where it runs. That is the player's directory, not the install.
process.chdir(dataDirectory);
console.log(`Pool of Radiance ${root}`);
console.log(`Saves in ${saveDirectory}`);

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  rmSync(runningFile, { force: true });
  // The server stops the runner and closes on SIGTERM. A browser holding a connection open must not keep it alive.
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// Closing the terminal window, or the console window on Windows.
process.on("SIGHUP", () => {
  stop();
  process.emit("SIGTERM");
});
process.on("exit", () => rmSync(runningFile, { force: true }));

await import(pathToFileURL(join(appDirectory, "server.mjs")).href);
for (const started = Date.now(); !(await answers(url)); ) {
  if (Date.now() - started > 120_000) throw new Error(`The game server did not answer at ${url}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}
writeFileSync(runningFile, JSON.stringify({ pid: process.pid, url }) + "\n");
console.log(`Playing in your browser at ${url}`);
console.log("If no browser opened, open that address in Chrome. Close this window or press Ctrl-C to stop the game.");
openBrowser(url);
