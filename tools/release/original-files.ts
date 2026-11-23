/**
 * The player's own original files (#74), which unlock the Classic display in a release.
 *
 * The setting is `original-files.json` in the player's data directory, `{ "path": "<folder>" }`. The
 * launcher reads it when the game starts (tools/release/launch.ts). The game page changes it from its
 * settings, through the server (tools/browser-play.ts), and the change takes effect at the next start.
 * Nothing of the player's folder is copied anywhere: it is read where it is.
 *
 * The game is always version 1.3. A version 1.3 folder is run from as it is. A folder of the first
 * release (GAME.OVR starting with its overlay manager's TPOV) gives the Classic display its pictures,
 * while the game runs from the port's own data in game/ (`POR_CLASSIC_PICTURES`, tools/gamedata.ts).
 */
import { closeSync, openSync, readSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { missingOriginalFiles, originalRelease, releaseName, type OriginalRelease } from "../../src/resources/original-folder.js";
import { readTextNow, type ResidentResources } from "../../src/resources/provider.js";
import { NodeDiskResources } from "../resources/node-disk.js";

export type { OriginalRelease };
export { releaseName };
export interface OriginalFolder { folder: string; release: OriginalRelease }

export const originalFilesSettingName = "original-files.json";

function inspectFolder(folder: string): OriginalFolder | { problem: string } {
  const names = new Map(readdirSync(folder).map((name) => [name.toUpperCase(), name]));
  const missing = missingOriginalFiles(names.keys());
  if (missing.length) return { problem: `${folder} has no ${missing.join(", ")}` };
  const overlay = Buffer.alloc(4);
  const file = openSync(join(folder, names.get("GAME.OVR")!), "r");
  try { readSync(file, overlay, 0, 4, 0); } finally { closeSync(file); }
  const release = originalRelease(folder, overlay);
  return typeof release === "string" ? { folder, release } : release;
}

/**
 * What `named` holds: the game's files, in it or in one folder directly inside it (GOG keeps them in
 * POOLRAD inside the game's folder). A problem says why not, in a line the player can act on.
 */
export function inspectOriginalFiles(named: string): OriginalFolder | { problem: string } {
  // A path pasted from a file manager may come quoted; ~ is the player's home, as in a shell.
  const folder = resolve(named.trim().replace(/^"(.*)"$/, "$1").replace(/^~(?=$|[\\/])/, homedir()));
  try {
    if (!statSync(folder, { throwIfNoEntry: false })?.isDirectory()) return { problem: `${folder} is not a folder` };
    const own = inspectFolder(folder);
    if ("release" in own) return own;
    // The game's files may be one folder further in.
    for (const child of readdirSync(folder, { withFileTypes: true })) {
      const inner = join(folder, child.name);
      if (!(child.isDirectory() || (child.isSymbolicLink() && statSync(inner, { throwIfNoEntry: false })?.isDirectory()))) continue;
      try {
        const found = inspectFolder(inner);
        if ("release" in found) return found;
      } catch {
        // An unreadable folder inside is not the game's.
      }
    }
    return own;
  } catch (error) {
    return { problem: `cannot read ${folder} (${(error as Error).message})` };
  }
}

/** `setting:original-files` of the resource layer (#224): the file a release names, or a provider's own. */
const settingStore = (setting: string | ResidentResources) =>
  typeof setting === "string" ? new NodeDiskResources({ originalFilesSetting: setting }) : setting;
const settingLabel = (setting: string | ResidentResources) => typeof setting === "string" ? setting
  : setting instanceof NodeDiskResources ? setting.path("setting:original-files") ?? "the original-files setting" : "the original-files setting";

/** The folder the setting file names, or why it names none. No setting at all is neither. */
export function readOriginalFilesSetting(setting: string | ResidentResources): { path?: string; problem?: string } {
  try {
    const text = readTextNow(settingStore(setting), "setting:original-files");
    if (text === undefined) return {};
    const path = (JSON.parse(text) as { path?: unknown }).path;
    if (typeof path !== "string" || !path) return { problem: `${settingLabel(setting)} names no "path"` };
    return { path };
  } catch (error) {
    return { problem: `cannot read ${settingLabel(setting)} (${(error as Error).message})` };
  }
}

/** Name the player's folder for the next start, or, with undefined, stop using one. */
export function writeOriginalFilesSetting(setting: string | ResidentResources, folder: string | undefined): void {
  const store = settingStore(setting);
  if (folder === undefined) store.removeNow("setting:original-files");
  else store.putNow("setting:original-files", JSON.stringify({ path: folder }, null, 2) + "\n");
}
