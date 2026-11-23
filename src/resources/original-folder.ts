/**
 * Which original files a folder holds (#74, #226): the rules of tools/release/original-files.ts, for
 * the Node launcher's folder on disk and for a folder the player picks in the browser alike.
 *
 * The folder, or one folder directly inside it (GOG keeps the game in POOLRAD inside its folder), must
 * hold START.EXE, GAME.OVR and ECL1.DAX. GAME.OVR's first four bytes, its overlay manager's name, tell
 * version 1.3 (FBOV) from the first release (TPOV).
 */
export type OriginalRelease = "1.3" | "first";

/** The files the game requires of an original folder. */
export const requiredOriginalFiles = ["START.EXE", "GAME.OVR", "ECL1.DAX"] as const;

/** The overlay manager's name at the start of GAME.OVR tells the releases apart (src/runtime/bindings.ts). */
export const originalReleases: Readonly<Record<string, OriginalRelease>> = { FBOV: "1.3", TPOV: "first" };

export const releaseName = (release: OriginalRelease): string => release === "1.3" ? "version 1.3" : "the first release";

/** The files of `folder` that are missing, by their upper-case names. */
export const missingOriginalFiles = (names: Iterable<string>): string[] => {
  const upper = new Set([...names].map((name) => name.toUpperCase()));
  return requiredOriginalFiles.filter((name) => !upper.has(name));
};

/** What GAME.OVR's first bytes say, or the problem the player is told. */
export function originalRelease(folder: string, overlayStart: Uint8Array): OriginalRelease | { problem: string } {
  const magic = String.fromCharCode(...overlayStart.subarray(0, 4));
  return originalReleases[magic] ?? { problem: `${folder} is not Pool of Radiance version 1.3 or its first release (its GAME.OVR starts ${JSON.stringify(magic)})` };
}

/** One file of a folder the player picked, by its path inside that folder ("POOLRAD/GAME.OVR"). */
export interface PickedFile { path: string; read(): Promise<Uint8Array> }

export interface PickedOriginalFolder {
  /** The folder as the player knows it: its name, and the folder inside it the game was found in. */
  folder: string;
  release: OriginalRelease;
  /** The files directly in the game's folder, keyed by their uppercase DOS names. */
  files: Map<string, PickedFile>;
}

/**
 * The game's folder among the files the player picked, named `name`: the picked folder itself or one
 * folder directly inside it. A problem says why neither, in the same words as the launcher's.
 */
export async function inspectPickedFolder(name: string, picked: readonly PickedFile[]): Promise<PickedOriginalFolder | { problem: string }> {
  const folders = new Map<string, Map<string, PickedFile>>([["", new Map()]]);
  for (const file of picked) {
    const parts = file.path.split("/").filter(Boolean);
    if (parts.length > 2) continue;
    const inner = parts.length === 2 ? parts[0]! : "";
    if (!folders.has(inner)) folders.set(inner, new Map());
    folders.get(inner)!.set(parts.at(-1)!.toUpperCase(), file);
  }
  const inspect = async (inner: string): Promise<PickedOriginalFolder | { problem: string }> => {
    const folder = inner ? `${name}/${inner}` : name;
    const files = folders.get(inner)!;
    const missing = missingOriginalFiles(files.keys());
    if (missing.length) return { problem: `${folder} has no ${missing.join(", ")}` };
    const overlay = files.get("GAME.OVR")!;
    const release = originalRelease(folder, await overlay.read());
    return typeof release === "string" ? { folder, release, files } : release;
  };
  const own = await inspect("");
  if ("release" in own) return own;
  for (const inner of [...folders.keys()].filter(Boolean).sort()) {
    const found = await inspect(inner);
    if ("release" in found) return found;
  }
  return own;
}
