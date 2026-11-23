/**
 * "Use my original files" in the browser (#226): the player picks the folder of their own Pool of
 * Radiance, and the game reads its files where they are. Nothing is copied: with the File System Access
 * API the page keeps only the folder's handle (in IndexedDB), and reads the files again at each start;
 * without it, a folder input gives this page the files for as long as it is open.
 */
import { inspectPickedFolder, type PickedFile, type PickedOriginalFolder } from "../../src/resources/original-folder.js";
import type { ResourceId } from "../../src/resources/provider.js";

export type OriginalChoice = PickedOriginalFolder | { problem: string };

// The folder handle, under one key of one store. A handle is a reference to the folder, not its files.
const database = () => new Promise<IDBDatabase>((done, failed) => {
  const request = indexedDB.open("por-original-folder", 1);
  request.onupgradeneeded = () => request.result.createObjectStore("handles");
  request.onsuccess = () => done(request.result);
  request.onerror = () => failed(request.error);
});
async function handleStore<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await database();
  try {
    return await new Promise<T>((done, failed) => {
      const request = act(db.transaction("handles", mode).objectStore("handles"));
      request.onsuccess = () => done(request.result);
      request.onerror = () => failed(request.error);
    });
  } finally { db.close(); }
}

interface DirectoryHandle {
  name: string; kind: "directory";
  values(): AsyncIterable<DirectoryHandle | { kind: "file"; name: string; getFile(): Promise<File> }>;
  queryPermission?(options: { mode: "read" }): Promise<PermissionState>;
}
const fileBytes = async (file: Blob) => new Uint8Array(await file.arrayBuffer());

/** The files in a folder and in the folders directly inside it, as the inspection reads them. */
async function handleFiles(handle: DirectoryHandle, prefix = "", depth = 0): Promise<PickedFile[]> {
  const files: PickedFile[] = [];
  for await (const entry of handle.values()) {
    if (entry.kind === "file") files.push({ path: prefix + entry.name, read: async () => fileBytes(await entry.getFile()) });
    else if (depth === 0) files.push(...await handleFiles(entry, `${entry.name}/`, 1));
  }
  return files;
}

/** Ask for a folder: undefined if the player closed the picker. A folder that holds the game is kept for the next start. */
export async function pickOriginalFolder(): Promise<OriginalChoice | undefined> {
  const picker = (window as unknown as { showDirectoryPicker?(options: object): Promise<DirectoryHandle> }).showDirectoryPicker;
  if (picker) {
    let handle: DirectoryHandle;
    try { handle = await picker.call(window, { id: "por-original-files", mode: "read" }); } catch { return; }
    const found = await inspectPickedFolder(handle.name, await handleFiles(handle));
    if ("release" in found) await handleStore("readwrite", (store) => store.put(handle, "folder"));
    return found;
  }
  // A browser without the API: a folder input. Its files last as long as the page.
  const input = Object.assign(document.createElement("input"), { type: "file", webkitdirectory: true, hidden: true });
  document.body.append(input);
  try {
    const files = await new Promise<File[] | undefined>((done) => {
      input.addEventListener("change", () => done(Array.from(input.files ?? [])), { once: true });
      input.addEventListener("cancel", () => done(undefined), { once: true });
      input.click();
    });
    if (!files?.length) return;
    const name = files[0]!.webkitRelativePath.split("/")[0]!;
    return inspectPickedFolder(name, files.map((file) => ({
      path: file.webkitRelativePath.split("/").slice(1).join("/"), read: () => fileBytes(file),
    })));
  } finally { input.remove(); }
}

/** The folder kept from an earlier choice, read again now; undefined if there is none. */
export async function restoreOriginalFolder(): Promise<OriginalChoice | undefined> {
  if (typeof indexedDB === "undefined") return;
  const handle = await handleStore<DirectoryHandle | undefined>("readonly", (store) => store.get("folder")).catch(() => undefined);
  if (!handle) return;
  if (await handle.queryPermission?.({ mode: "read" }) !== "granted") return { problem: `the browser no longer lets the game read ${handle.name}: choose the folder again` };
  try {
    return await inspectPickedFolder(handle.name, await handleFiles(handle));
  } catch (error) {
    return { problem: `cannot read ${handle.name} (${(error as Error).message})` };
  }
}

/** Stop using the kept folder. */
export async function forgetOriginalFolder(): Promise<void> {
  if (typeof indexedDB !== "undefined") await handleStore("readwrite", (store) => store.delete("folder"));
}

/** The game's files, read into memory for the engine as `original:` resources (about 1.6 MB). */
export async function originalEntries(found: PickedOriginalFolder): Promise<[ResourceId, Uint8Array][]> {
  return Promise.all([...found.files].map(async ([name, file]): Promise<[ResourceId, Uint8Array]> => [`original:${name}`, await file.read()]));
}

/**
 * For the browser checks: a folder served at `url` (a JSON list of its file paths there, each file at
 * `url` + path), inspected as a picked folder would be.
 */
export async function originalFolderAt(url: string): Promise<OriginalChoice> {
  const paths = await (await fetch(url)).json() as string[];
  const name = decodeURIComponent(new URL(url, location.href).pathname.split("/").filter(Boolean).at(-1) ?? "folder");
  return inspectPickedFolder(name, paths.map((path) => ({
    path, read: async () => new Uint8Array(await (await fetch(url + path.split("/").map(encodeURIComponent).join("/"))).arrayBuffer()),
  })));
}
