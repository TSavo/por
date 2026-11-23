/**
 * The Electron shell (#108): a window on the packaged game's loose files (#229). The main process
 * registers `looseResponse` (tools/web/loose-files.ts) as the `por:` protocol, with the COOP/COEP
 * headers the engine's worker needs for its shared command buffer, and loads the browser build's
 * page in the window. The game runs in the page, not in Node.
 *
 *   npm run play:electron     builds the loose files and this main process, then opens the window
 *
 * A packaged app reads the files from `process.resourcesPath`. A checkout names them in
 * POR_LOOSE_DIR, or uses out/loose/ under the working directory.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { app, BrowserWindow, Menu, dialog, ipcMain, net, protocol } from "electron";
import type { IpcMainInvokeEvent, MenuItemConstructorOptions } from "electron";
import {
  inspectOriginalFiles, originalFilesSettingName, readOriginalFilesSetting, writeOriginalFilesSetting,
} from "../release/original-files.js";
import { looseResponse, openLooseFiles, type LooseFiles } from "../web/loose-files.js";
import type { HostOriginalFiles } from "./preload.js";

const scheme = "por";
const gameOrigin = `${scheme}://localhost`;
function isGamePage(url: string): boolean {
  const { protocol, host, pathname } = new URL(url);
  return protocol === `${scheme}:` && host === "localhost" && (pathname === "/" || pathname === "/play.html");
}

protocol.registerSchemesAsPrivileged([{
  scheme,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true },
}]);

app.setName("Pool of Radiance");
app.commandLine.appendSwitch("autoplay-policy", "no-user-gesture-required");

/** The folder of loose files: a packaged app's Resources, or the checkout's out/loose. */
function looseRoot(): string {
  if (process.env.POR_LOOSE_DIR) return resolve(process.env.POR_LOOSE_DIR);
  if (app.isPackaged) return process.resourcesPath;
  const candidates = [
    join(process.cwd(), "out", "loose"),
    // When this file is run unbundled from the checkout (tools/electron/main.ts).
    join(fileURLToPath(new URL("../..", import.meta.url)), "out", "loose"),
  ];
  const found = candidates.find((path) => existsSync(join(path, "web", "play.html")));
  if (!found) {
    throw new Error("The packaged game's loose files are missing. Run npm run web:build-loose, or set POR_LOOSE_DIR.");
  }
  return found;
}

const isolation: Record<string, string> = {
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
  "cross-origin-opener-policy": "same-origin",
  "cross-origin-embedder-policy": "require-corp",
  "cross-origin-resource-policy": "same-origin",
};

function registerProtocol(loose: LooseFiles): void {
  const written = JSON.parse(readFileSync(join(loose.root, "web", "resource-index.json"), "utf8")) as { engineEnv: Record<string, string> };
  const passed = Object.fromEntries(["POR_CLOCK", "POR_PREGEN_PARTY", "POR_TRACE_KEYS"]
    .flatMap((name) => process.env[name] ? [[name, process.env[name]!]] : []));
  const index = JSON.stringify({ ...written, engineEnv: { ...written.engineEnv, ...passed } });

  protocol.handle(scheme, (request) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response(null, { status: 403, headers: isolation });
    }
    let path: string;
    try { path = decodeURI(new URL(request.url).pathname); } catch {
      return new Response(null, { status: 400, headers: isolation });
    }
    if (path === "/resource-index.json") {
      return new Response(index, { headers: { ...isolation, "content-type": "application/json; charset=utf-8" } });
    }
    const answer = looseResponse(loose, path);
    if ("status" in answer) return new Response(null, { status: answer.status, headers: isolation });
    const headers: Record<string, string> = { ...isolation, "content-type": answer.type };
    if (path === "/" || path === "/play.html") {
      headers["content-security-policy"] = "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'";
    }
    const range = request.headers.get("range");
    return net.fetch(pathToFileURL(answer.file).href, range ? { headers: { range } } : undefined).then((response) => {
      for (const name of ["content-range", "accept-ranges", "content-length"]) {
        const value = response.headers.get(name);
        if (value) headers[name] = value;
      }
      return new Response(response.body, { status: response.status, headers });
    });
  });
}


function originalSettingPath(): string {
  return join(app.getPath("userData"), originalFilesSettingName);
}

/** The game's files in a named folder, through inspectOriginalFiles (#74, #226). */
function loadOriginalFiles(named: string): HostOriginalFiles | { problem: string } {
  const found = inspectOriginalFiles(named);
  if ("problem" in found) return found;
  try {
    const files = readdirSync(found.folder, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => ({ name: entry.name.toUpperCase(), data: new Uint8Array(readFileSync(join(found.folder, entry.name))) }));
    return { folder: found.folder, release: found.release, files };
  } catch (error) {
    return { problem: `Cannot read ${found.folder} (${(error as Error).message})` };
  }
}

function currentOriginalFiles(): HostOriginalFiles | { problem: string } | null {
  const { path, problem } = readOriginalFilesSetting(originalSettingPath());
  if (problem) return { problem };
  return path ? loadOriginalFiles(path) : null;
}

async function pickOriginalFiles(): Promise<void> {
  const win = gameWindow;
  if (!win) return;
  const picked = await dialog.showOpenDialog(win, {
    title: "Use Original Files",
    properties: ["openDirectory"],
    defaultPath: readOriginalFilesSetting(originalSettingPath()).path,
  });
  if (picked.canceled || !picked.filePaths[0] || win.isDestroyed()) return;
  const loaded = loadOriginalFiles(picked.filePaths[0]);
  if ("problem" in loaded) {
    await dialog.showMessageBox(win, { type: "warning", title: "Use Original Files", message: loaded.problem });
    return;
  }
  writeOriginalFilesSetting(originalSettingPath(), loaded.folder);
  win.webContents.send("original-files:used", loaded);
}

function requireGameWindow(event: IpcMainInvokeEvent): void {
  const frame = event.senderFrame;
  if (!frame || event.sender !== gameWindow?.webContents || frame !== event.sender.mainFrame || !isGamePage(frame.url)) {
    throw new Error("Original files are available only to the game window.");
  }
}

ipcMain.handle("original-files:get", (event) => {
  requireGameWindow(event);
  return currentOriginalFiles();
});
ipcMain.handle("original-files:forget", (event) => {
  requireGameWindow(event);
  writeOriginalFilesSetting(originalSettingPath(), undefined);
});

function runInPage(script: string): void {
  void gameWindow?.webContents.executeJavaScript(script);
}

function applicationMenu(): Menu {
  const mac = process.platform === "darwin";
  // J and M are shown on the items but not registered as accelerators: those letters also belong to
  // the game (Move, Magic, Join, …), and the page already applies the shortcuts only at menus that
  // do not use the letter (tools/play.js hostShortcutFree).
  const gameMenu: MenuItemConstructorOptions = {
    label: "Game",
    submenu: [
      { label: "Settings", click: () => runInPage("window.porShell?.settings()") },
      { label: "Journal", accelerator: "J", registerAccelerator: false, click: () => runInPage("window.porShell?.journal()") },
      { label: "Map", accelerator: "M", registerAccelerator: false, click: () => runInPage("window.porShell?.map()") },
    ],
  };
  const fileMenu: MenuItemConstructorOptions = {
    label: "File",
    submenu: [
      { label: "Use Original Files…", click: () => { void pickOriginalFiles(); } },
      ...(!mac ? [{ type: "separator" as const }, { role: "quit" as const }] : []),
    ],
  };
  const template: MenuItemConstructorOptions[] = [
    ...(mac ? [{ role: "appMenu" as const }] : []),
    fileMenu,
    gameMenu,
    { role: "editMenu" },
    ...(mac ? [{ role: "windowMenu" as const }] : []),
  ];
  return Menu.buildFromTemplate(template);
}

let gameWindow: BrowserWindow | undefined;

function openWindow(): void {
  if (gameWindow) {
    if (gameWindow.isMinimized()) gameWindow.restore();
    gameWindow.focus();
    return;
  }
  const win = new BrowserWindow({
    title: "Pool of Radiance",
    width: 1280,
    height: 960,
    useContentSize: true,
    backgroundColor: "#000000",
    autoHideMenuBar: false,
    webPreferences: {
      preload: join(dirname(fileURLToPath(import.meta.url)), "preload.cjs"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      spellcheck: false,
    },
    show: false,
  });
  const icon = [process.resourcesPath, dirname(app.getAppPath()), process.cwd()]
    .map((directory) => join(directory, "pool-of-radiance.png")).find((path) => existsSync(path));
  if (icon) win.setIcon(icon);
  gameWindow = win;
  win.once("ready-to-show", () => win.show());
  win.on("closed", () => { gameWindow = undefined; });
  win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  win.webContents.on("will-prevent-unload", (event) => {
    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      title: "Save in progress",
      message: "A save is still pending.",
      detail: "Stay to finish saving, or leave and keep your last completed save.",
      buttons: ["Stay", "Leave"], defaultId: 0, cancelId: 0,
    });
    if (choice === 1) event.preventDefault();
  });
  win.webContents.on("will-navigate", (event, url) => {
    if (!isGamePage(url)) event.preventDefault();
  });
  win.webContents.on("dom-ready", () => {
    void win.webContents.executeJavaScript('document.documentElement.classList.add("electron-app")');
  });
  void win.loadURL(`${gameOrigin}/`);
}

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => openWindow());
  app.on("window-all-closed", () => app.quit());
  app.whenReady().then(() => {
    if (process.platform === "win32") app.setAppUserModelId("io.github.tsavo.pool-of-radiance");
    Menu.setApplicationMenu(applicationMenu());
    registerProtocol(openLooseFiles(looseRoot()));
    openWindow();
  });
}
