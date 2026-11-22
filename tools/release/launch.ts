/**
 * Starts an installed Pool of Radiance: the game server on a localhost port, then the player's browser
 * on it. `npm run release:build` compiles this to app/launch.mjs, which the release's own Node runs:
 *
 *   <root>/app/launch.mjs     this launcher
 *   <root>/app/server.mjs     tools/browser-play.ts, compiled
 *   <root>/app/runner.mjs     tools/boot-translated.ts, compiled
 *   <root>/game, upgrades, audio, qa, src, tools    the port's own files
 *
 * The game runs from the port's own data in game/, or from the player's own version 1.3 files when
 * they name them (originalFiles below), which unlocks Classic; their first-release files unlock it too,
 * with those files' pictures under the 1.3 game. Saves and the game's other writes go to the
 * player's own directory (userDataDirectory below). Ctrl-C, closing the terminal, or quitting the Mac
 * app stops the server and the runner. Launched again while the game runs, it opens the browser on the
 * running game instead of starting another.
 *
 *   POR_OPEN_BROWSER=0              print the address without opening a browser
 *   POR_ORIGINAL_FILES=<directory>  the player's original files, in place of original-files.json
 */
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { request } from "node:http";
import { createServer } from "node:net";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { inspectOriginalFiles, originalFilesSettingName, readOriginalFilesSetting, releaseName, type OriginalFolder } from "./original-files.js";

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

/** Chrome's own executable, where it is installed. */
function findChrome(): string | undefined {
  const candidates = process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", join(homedir(), "Applications", "Google Chrome.app", "Contents", "MacOS", "Google Chrome")]
    : process.platform === "win32"
      ? [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
        .filter((directory): directory is string => Boolean(directory))
        .map((directory) => join(directory, "Google", "Chrome", "Application", "chrome.exe"))
      : (process.env.PATH ?? "").split(":").flatMap((directory) =>
        ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((name) => join(directory, name)));
  return candidates.find((path) => existsSync(path));
}

let gameWindow: ChildProcess | undefined;

/**
 * Show the game. Where Chrome is installed it opens as a window of its own (Chrome's app mode, with a
 * profile kept in the player's data directory): no tabs or address bar, and the title music may play
 * at once, which a page opened in an ordinary tab may not until the player presses something. With
 * `ownsGame`, closing that window stops the game. Without Chrome, the default browser.
 */
function openBrowser(url: string, ownsGame = false, gameUrl = url): void {
  if (process.env.POR_OPEN_BROWSER === "0") return;
  const fallback = (error: Error | null) => {
    if (!error) return;
    const [command, args] = process.platform === "darwin" ? ["open", [url]]
      : process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : ["xdg-open", [url]];
    execFile(command, args, { windowsHide: true }, (failed) => {
      if (failed) console.log(`Could not open a browser (${failed.message}). Open ${url} yourself.`);
    });
  };
  const chrome = findChrome();
  // Without Chrome the default browser is opened on the game itself, once it answers.
  if (!chrome) { if (gameUrl === url) fallback(new Error("No Chrome")); return; }
  // A window the game does not own outlives this launcher, which may exit at once (a second launch):
  // on Windows only a detached child leaves the job object that kills Node's children when Node exits.
  // The game's window needs none of what Chrome downloads into a fresh profile (its components and the
  // optimization guide's models, 150 MB of the 181 MB a first start left on Windows), and the profile is
  // on the system drive.
  const browser = spawn(chrome, [
    `--user-data-dir=${join(dataDirectory, "browser")}`, `--app=${url}`, "--autoplay-policy=no-user-gesture-required",
    "--no-first-run", "--no-default-browser-check", "--window-size=1280,880", "--disable-component-update",
    "--disable-features=OptimizationGuideModelDownloading,OptimizationHintsFetching,OptimizationTargetPrediction,OptimizationHints",
  ], { stdio: "ignore", windowsHide: false, detached: !ownsGame });
  browser.on("error", fallback);
  if (!ownsGame) { browser.unref(); return; }
  gameWindow = browser;
  // The window closed: the game goes with it.
  browser.on("exit", () => { if (!stopping) { stop(); process.emit("SIGTERM"); } });
}

const dataDirectory = userDataDirectory();
mkdirSync(dataDirectory, { recursive: true });
const runningFile = join(dataDirectory, "running.json");

/**
 * The player's own original files, which unlock Classic (tools/release/original-files.ts):
 * POR_ORIGINAL_FILES, else original-files.json in the player's data directory, which the game page's
 * settings write. A version 1.3 folder is run from. A first-release folder gives Classic its pictures
 * while the game, version 1.3, runs from its own data. Anything else runs from the game's own data, and
 * one line says why. Nothing of the folder is copied anywhere.
 */
function originalFiles(override: string | undefined): OriginalFolder | undefined {
  const instead = "the game runs from its own data, without Classic.";
  const setting = override ? { path: override } : readOriginalFilesSetting(join(dataDirectory, originalFilesSettingName));
  if (setting.problem) console.log(`Original files: ${setting.problem}; ${instead}`);
  if (!setting.path) return;
  const found = inspectOriginalFiles(setting.path);
  if ("problem" in found) { console.log(`Original files: ${found.problem}; ${instead}`); return; }
  return found;
}
const original = originalFiles(process.env.POR_ORIGINAL_FILES);

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
const runsOriginal = original?.release === "1.3";
Object.assign(process.env, {
  POR_ROOT: root,
  POR_RUNNER: join(appDirectory, "runner.mjs"),
  POR_GAME_SOURCE: runsOriginal ? "original" : "port",
  ...(runsOriginal ? { POR_GAMEDATA: original.folder } : {}),
  // The first release's pictures under the version 1.3 game, in Classic.
  ...(original?.release === "first" ? { POR_CLASSIC_PICTURES: original.folder } : {}),
  // The page's "Original files" setting writes here, for the next start.
  POR_ORIGINAL_FILES_SETTING: join(dataDirectory, originalFilesSettingName),
  POR_SAVE_DIR: saveDirectory,
  POR_PLAY_PORT: String(port),
});
if (original) {
  console.log(`Original files: ${original.folder} (${releaseName(original.release)}; Classic available${runsOriginal ? "" : " with its pictures, the game version 1.3"})`);
}
// The runner writes its reports to out/ where it runs. That is the player's directory, not the install.
process.chdir(dataDirectory);
console.log(`Pool of Radiance ${root}`);
console.log(`Saves in ${saveDirectory}`);

let stopping = false;
const stop = () => {
  if (stopping) return;
  stopping = true;
  rmSync(runningFile, { force: true });
  // The game's window is Chrome running on the game's own profile: it closes with the game.
  gameWindow?.kill();
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

// The window opens at once on a loading page, which goes to the game when it answers.
openBrowser(`${pathToFileURL(join(root, "tools", "loading.html")).href}?game=${encodeURIComponent(url)}`, true, url);
await import(pathToFileURL(join(appDirectory, "server.mjs")).href);
for (const started = Date.now(); !(await answers(url)); ) {
  if (Date.now() - started > 120_000) throw new Error(`The game server did not answer at ${url}`);
  await new Promise((resolve) => setTimeout(resolve, 250));
}
writeFileSync(runningFile, JSON.stringify({ pid: process.pid, url }) + "\n");
console.log(`Playing in your browser at ${url}`);
console.log("If no browser opened, open that address in Chrome. Close the game's window, this window, or press Ctrl-C to stop the game.");
if (!gameWindow) openBrowser(url, true);
