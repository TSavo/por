/**
 * The game page of the browser build (#228): the engine runs in a Web Worker beside the page, and the
 * page's session (tools/play-session.ts) answers what the Node server answered. tools/play.js asks
 * through `window.porGameHost.fetch`: the state, keys, the automap, the exploration materials and the
 * original-files choice are answered here, in the page; every other request is the provider's file.
 *
 * The page preloads the port's game data and the engine's manifests, the player's saves (IndexedDB,
 * tools/web/idb-provider.ts) and, when the player has chosen them, their original files (#226).
 */
import { releaseName, type PickedOriginalFolder } from "../../src/resources/original-folder.js";
import { MemoryResources, useResources, type ResourceId } from "../../src/resources/provider.js";
import { detectGameVersion, useGameVersion } from "../../src/runtime/bindings.js";
import { readGameFile, useGameRoot } from "../gamedata.js";
import { PlaySession } from "../play-session.js";
import { openSaveSlots } from "../save-slots.js";
import { engineRoot, preloadEngineResources, startEngine, type RunningEngine } from "./engine.js";
import { IdbResources } from "./idb-provider.js";
import { forgetOriginalFolder, originalEntries, originalFolderAt, pickOriginalFolder, restoreOriginalFolder, type OriginalChoice } from "./original-picker.js";
import type { ResourceIndex } from "./resource-index.js";
import type { HostOriginalFiles } from "../electron/preload.js";

if (typeof window !== "undefined" && (window.porElectron || /\bElectron\//.test(navigator.userAgent))) {
  document.documentElement.classList.add("electron-app");
}


/** The runner's settings as tools/browser-play.ts starts it; the index's (the server's passed settings) come after. */
const runnerEnv = {
  POR_BROWSER_PLAY: "1", POR_CLOCK: "real", POR_LIVE_AT: "24000000", POR_PICTURE_LOOP_FRAMES: "1", POR_BOOT_STEPS: "100000000",
};

let provider: IdbResources;
let index: ResourceIndex;
let gameEntries: [ResourceId, Uint8Array][];
let session: PlaySession;
let engine: RunningEngine | undefined;
let original: PickedOriginalFolder | undefined;
let originalProblem: string | undefined;
let originalRemembered: string | undefined;
let storageWrite: Promise<void> | undefined;

const storageStatus = document.querySelector<HTMLParagraphElement>("#storage-status")!;
const storageError = document.querySelector<HTMLDialogElement>("#storage-error")!;
const storageMessage = document.querySelector<HTMLParagraphElement>("#storage-message")!;
const retryStorage = document.querySelector<HTMLButtonElement>("#retry-storage")!;

function guardStorageWrite(event: BeforeUnloadEvent) {
  event.preventDefault();
  event.returnValue = true;
}

async function commitRecord(id: ResourceId, data: Uint8Array | undefined) {
  const label = id === "save:roster" ? "character roster" : `slot ${id.slice("save:".length)}`;
  window.addEventListener("beforeunload", guardStorageWrite);
  try {
    storageStatus.hidden = false;
    storageStatus.textContent = `Saving ${label}…`;
    for (;;) {
      try {
        await (data ? provider.put(id, data) : provider.remove(id));
        return;
      } catch (error) {
        console.error(`Cannot store ${id}`, error);
        storageMessage.textContent = `Could not save ${label}. Your saved data was unchanged.`;
        await new Promise<void>((retry) => {
          retryStorage.addEventListener("click", () => retry(), { once: true });
          storageError.showModal();
        });
        storageError.close();
      }
    }
  } finally {
    storageStatus.hidden = true;
    window.removeEventListener("beforeunload", guardStorageWrite);
  }
}
storageError.addEventListener("cancel", (event) => event.preventDefault());

/** Start the game from its beginning, with the original files chosen now (none, or the player's). */
async function start() {
  const entries = [...gameEntries, ...original ? await originalEntries(original) : []];
  if (storageWrite) await storageWrite;
  const root = engineRoot(original);
  // The page reads the same game data as the engine: the overland routes, the packaged terrain, New Phlan's street.
  useResources(new MemoryResources(entries));
  useGameRoot(root);
  const build = detectGameVersion(readGameFile(root, "GAME.OVR"));
  useGameVersion(build);
  engine?.stop();
  const previous = session as PlaySession | undefined;
  let running: RunningEngine | undefined;
  const next = new PlaySession({
    root, artwork: new Map(Object.entries(index.artwork)), classicAvailable: Boolean(original),
    codeWheelAvailable: build === "1.3" && index.codeWheel, buildVersion: index.buildVersion,
    // A page that keeps asking sees the new game's first frame as new.
    firstSequence: previous ? previous.sequence + 1 : 0,
    write(command) { if (!running?.write(command.replace(/\n$/, ""))) next.failed("The game cannot take more input."); },
    log: (line) => console.error(line),
  });
  session = next;
  engine = running = startEngine({
    entries: [...entries, ...provider.residentRecords()], root, env: { ...runnerEnv, ...index.engineEnv },
    onLines(lines) { for (const line of lines) next.line(line); },
    onPut(id, data) {
      storageWrite = commitRecord(id, data).finally(() => { storageWrite = undefined; });
      return storageWrite;
    },
    onStopped(message, dosExitCode) {
      next.closed(message);
      if (session === next && dosExitCode === 0) void window.porElectron?.quitGame();
    },
  });
}

/** Use `choice` from now: the game starts again with it. */
async function useOriginal(choice: OriginalChoice | undefined) {
  if (choice && "problem" in choice) return choice;
  original = choice;
  originalProblem = undefined;
  originalRemembered = undefined;
  await start();
  return choice ? { folder: choice.folder, release: choice.release } : {};
}

function originalFromHost(payload: HostOriginalFiles): PickedOriginalFolder {
  return {
    folder: payload.folder,
    release: payload.release,
    files: new Map(payload.files.map((file) => [file.name, { path: file.name, read: async () => file.data }])),
  };
}

const ready = (async () => {
  provider = await IdbResources.open();
  index = (await provider.getJson<ResourceIndex>("index"))!;
  gameEntries = await preloadEngineResources(provider, index, ["manifest:src/audio/voices.json", "manifest:qa/art-worklist-cells.json"]);
  const kept = await (async (): Promise<OriginalChoice | undefined> => {
    if (!window.porElectron) return restoreOriginalFolder();
    const host = await window.porElectron.getOriginalFiles();
    return host && "release" in host ? originalFromHost(host) : host ?? undefined;
  })().catch((error: Error): OriginalChoice => ({ problem: error.message }));
  if (kept && "release" in kept) original = kept;
  else {
    originalProblem = kept?.problem;
    originalRemembered = kept?.remembered;
  }
  await start();
})();
ready.catch((error) => console.error("The game cannot start", error));

const json = (body: unknown, status = 200) => new Response(typeof body === "string" ? body : JSON.stringify(body),
  { status, headers: { "content-type": "application/json" } });
const empty = (status: number) => new Response(null, { status });

function legacySaveRecords(body: unknown): Map<ResourceId, Uint8Array> {
  if (!Array.isArray(body) || body.length < 1 || body.length > 11) {
    throw new Error("The folder must contain save slots A.json through J.json or roster.json.");
  }
  const records = new Map<ResourceId, Uint8Array>();
  const encode = new TextEncoder();
  for (const file of body) {
    if (!Array.isArray(file) || file.length !== 2 || typeof file[0] !== "string" ||
        !/^(?:[A-J]|roster)$/.test(file[0]) || typeof file[1] !== "string") {
      throw new Error("Invalid save file.");
    }
    const id: ResourceId = `save:${file[0]}`;
    if (records.has(id)) throw new Error(`The folder contains more than one copy of ${file[0]}.json.`);
    records.set(id, encode.encode(file[1]));
  }
  // These are the same records the engine will read when it next starts.
  openSaveSlots(new MemoryResources(records));
  return records;
}

async function gameFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(input instanceof Request ? input.url : String(input), location.href);
  if (url.origin !== location.origin) return fetch(input, init);
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const path = url.pathname;
  const answered = ["/state", "/key", "/automap.json", "/automap", "/original-files", "/save-import"].includes(path) || path.startsWith("/exploration-materials/");
  if (!answered) return fetch(input, init);
  await ready;
  if (path === "/state" && method === "GET") {
    const after = url.searchParams.get("after");
    return json(session.state(after === null ? undefined : Number(after), headers.get("x-por-page") ?? undefined, headers.get("x-por-claim") === "1"));
  }
  if (path === "/key" && method === "POST") {
    if (storageWrite) return empty(409);
    return empty(session.key(String(init.body ?? ""), {
      expected: headers.get("x-por-frame") ?? undefined, page: headers.get("x-por-page") ?? undefined,
      codeWheel: headers.get("x-por-code-wheel") === "enhanced",
    }));
  }
  if (path === "/automap.json" && method === "GET") return json(session.automapJson());
  if (path === "/automap" && method === "POST") {
    let maps: unknown;
    try { maps = JSON.parse(String(init.body)); } catch { return empty(400); }
    return empty(session.importAutomap(maps));
  }
  if (path === "/exploration-materials/phlan" && method === "GET") {
    try { return json(session.newPhlanMaterials()); } catch (error) {
      console.error("Cannot prepare New Phlan 3D materials", error);
      return empty(503);
    }
  }
  if (/^\/exploration-materials\/[0-9a-f]{64}$/.test(path) && method === "GET") {
    const materials = session.materials(path.slice("/exploration-materials/".length));
    return materials ? json(materials) : empty(404);
  }
  if (path === "/save-import" && method === "POST") {
    let records: Map<ResourceId, Uint8Array>;
    try { records = legacySaveRecords(JSON.parse(String(init.body))); }
    catch (error) { return json({ problem: (error as Error).message }, 422); }
    try { return json(await provider.importMissingSaves(records)); }
    catch (error) { return json({ problem: (error as Error).message }, 500); }
  }
  if (path === "/original-files" && method === "GET") {
    // The browser picks a folder rather than naming a path (#226).
    return json({ picker: true, inUse: original ? { folder: original.folder, release: original.release } : null, path: null, problem: originalProblem ?? null, remembered: originalRemembered ?? null });
  }
  if (path === "/original-files" && method === "POST") {
    let body: { pick?: unknown; path?: unknown; restore?: unknown };
    try { body = JSON.parse(String(init.body)) as typeof body; } catch { return empty(400); }
    if (body.path === null) {
      if (window.porElectron) await window.porElectron.forgetOriginalFiles();
      else await forgetOriginalFolder();
      await useOriginal(undefined);
      return json({ path: null, started: true });
    }
    if (window.porElectron || (body.pick !== true && body.restore !== true)) return empty(400);
    const choice = body.restore === true ? await restoreOriginalFolder(true) : await pickOriginalFolder();
    if (!choice) return json({ cancelled: true });
    const used = await useOriginal(choice);
    if ("problem" in used) return json({ problem: used.problem }, 422);
    return json({ path: used.folder, release: used.release, releaseName: used.release && releaseName(used.release), started: true });
  }
  return empty(404);
}

declare global {
  interface Window {
    porGameHost: { fetch: typeof gameFetch };
    /** For the browser checks, which have no folder picker: a served folder, as a picked one is read (#226). */
    porTestUseOriginalFolder(url: string): Promise<unknown>;
    /** The Electron shell: original files from File > Use Original Files… or original-files.json. */
    porElectron?: {
      getOriginalFiles(): Promise<HostOriginalFiles | { problem: string } | null>;
      quitGame(): Promise<void>;
      forgetOriginalFiles(): Promise<void>;
      onOriginalFiles(callback: (payload: HostOriginalFiles) => void): void;
    };
  }
}
window.porGameHost = { fetch: gameFetch };
window.porTestUseOriginalFolder = async (url) => {
  await ready;
  return useOriginal(await originalFolderAt(url));
};
window.porElectron?.onOriginalFiles((payload) => {
  void ready.then(async () => {
    await useOriginal(originalFromHost(payload));
    window.dispatchEvent(new Event("por-original-files-changed"));
  }).catch((error) => console.error("Cannot open the original files", error));
});
