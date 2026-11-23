import { resourceKind, type ResourceId } from "./provider.js";

/**
 * Where each id sits in the port's own tree of loose files: the checkout, a release, or the files a
 * packaged app keeps next to it (#229). Paths use `/` and are relative to the port's root.
 *
 * `art:` ids are named by the art catalogue, not by a path: `artFile` maps one to its PNG under
 * `upgrades/` (as `upgrades:<file>`). `original:`, `save:`, `setting:` and `journal:` ids have no place
 * in the tree: they are the player's own folder and data, which each backend keeps where it keeps them.
 */
export function layoutPath(id: ResourceId, artFile?: (artId: string) => string | undefined): string | undefined {
  const parsed = resourceKind(id);
  if (!parsed) return;
  const { kind, name } = parsed;
  if (kind === "index") return "web/resource-index.json";
  if (kind !== "font" && !safeName(name)) return;
  switch (kind) {
    case "game": return `game/${name}`;
    case "upgrades": return `upgrades/${name}`;
    case "atlas": return `upgrades/maps/${name}`;
    case "codewheel": return `upgrades/codewheel/${name}`;
    case "font": return "upgrades/font.woff2";
    case "audio": {
      const [set, file] = splitOnce(name);
      return (set === "classic" || set === "enhanced") && file ? `audio/${set}/${file}` : undefined;
    }
    case "voice": return `audio/voices/${name}`;
    case "narration": return `audio/${name}`;
    case "map": return `src/maps/${name}`;
    case "manifest": return manifestFiles.has(name) ? name : undefined;
    case "art": {
      const file = artFile?.(name);
      return file ? layoutPath(file) : undefined;
    }
    default: return;
  }
}

/** The data files under the port's root the game reads at start, by their path there. */
export const manifestFiles: ReadonlySet<string> = new Set([
  "src/audio/voices.json",
  "src/audio/voice-master-manifest.json",
  "src/audio/original-sounds.json",
  "src/codewheel/wheel.json",
  "qa/art-worklist-cells.json",
]);

function splitOnce(name: string): [string, string] {
  const colon = name.indexOf(":");
  return colon < 0 ? [name, ""] : [name.slice(0, colon), name.slice(colon + 1)];
}

/** A relative name that stays inside its directory. */
export function safeName(name: string): boolean {
  return name.length > 0 && !name.startsWith("/") && !name.includes("\\") && !name.includes("\0") &&
    name.split("/").every((part) => part !== "" && part !== "." && part !== "..");
}
