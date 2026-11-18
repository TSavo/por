import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupOverride, type EncounterAnchor, type OverrideManifest } from "../src/lib/assets.js";
import { portraitKey } from "./portrait-art.js";
import { encounterAnchor } from "./encounter-art.js";

interface LoadedArtwork {
  file: string;
  path: string;
  png: Buffer;
  width: number;
  height: number;
  encounter?: EncounterAnchor;
}

/** Resolve the same assets for the browser and the production inventory. */
export function loadUpgradeArt(upgrades = process.env.POR_UPGRADES_DIR) {
  const artworkDirectories = upgrades === undefined ? [join("upgrades", "slums"), "upgrades"] : [upgrades];
  return loadUpgradeArtFromManifests(artworkDirectories.map((directory) => join(directory, "manifest.json")));
}

export function loadUpgradeArtFromManifests(paths: readonly string[]) {
  const artwork = new Map<string, LoadedArtwork>();
  for (const manifestPath of paths) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as OverrideManifest;
      if (manifest.version !== 1 || !manifest.assets) continue;
      for (const id of Object.keys(manifest.assets)) {
        const encounter = encounterAnchor(id, manifest.encounters?.[id]);
        if (id !== "scene:title" && !/^viewport:[a-f0-9]{64}$/.test(id) && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !/^combat:(?:CPIC[1-8]\.DAX:\d{1,3}|party:\d{1,3}:\d{1,3})$/.test(id) && !portraitKey.test(id) && !encounter) continue;
        const file = lookupOverride(manifest, id);
        if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) continue;
        try {
          const path = join(dirname(manifestPath), file);
          const png = readFileSync(path);
          if (png.length < 24 || png.toString("ascii", 12, 16) !== "IHDR" || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) continue;
          const size = (id.startsWith("tile:") || id.startsWith("battle-tile:")) ? 32 : id.startsWith("combat:") ? 96 : portraitKey.test(id) ? 352 : 0;
          const width = encounter ? encounter.width * 4 : size;
          const height = encounter ? encounter.height * 4 : size;
          if (width && (png.readUInt32BE(16) !== width || png.readUInt32BE(20) !== height)) continue;
          artwork.set(id, { file, path, png, encounter, width: png.readUInt32BE(16), height: png.readUInt32BE(20) });
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced artwork", error);
        }
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced artwork manifest", error);
    }
  }
  return artwork;
}
