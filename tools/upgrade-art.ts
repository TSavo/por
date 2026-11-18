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
        if (id !== "scene:title" && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !/^combat:(?:CPIC[1-8]\.DAX:\d{1,3}|party:\d{1,3}:\d{1,3})$/.test(id) && !portraitKey.test(id) && !encounter) continue;
        const file = lookupOverride(manifest, id);
        if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) continue;
        try {
          const path = join(dirname(manifestPath), file);
          const png = readFileSync(path);
          if (png.length < 24 || png.toString("ascii", 12, 16) !== "IHDR" || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) continue;
          let sourceWidth = 8;
          let sourceHeight = 8;
          if (encounter) ({ width: sourceWidth, height: sourceHeight } = encounter);
          else if (id === "scene:title") [sourceWidth, sourceHeight] = [320, 200];
          else if (id.startsWith("combat:")) sourceWidth = sourceHeight = 24;
          else if (portraitKey.test(id)) sourceWidth = sourceHeight = 88;
          const width = png.readUInt32BE(16);
          const height = png.readUInt32BE(20);
          if (width !== sourceWidth * 4 || height !== sourceHeight * 4) continue;
          artwork.set(id, { file, path, png, encounter, width, height });
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
