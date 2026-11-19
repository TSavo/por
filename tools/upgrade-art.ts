import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupOverride, type EncounterAnchor, type OverrideManifest } from "../src/lib/assets.js";
import { portraitKey } from "./portrait-art.js";
import { encounterAnchor, encounterKey, encounterPixels } from "./encounter-art.js";
import { isCombatExtent, monsterCombatKey, partyCombatKey, partyCombatPart, randomCombatKey, randomCombatPixels } from "./combat-art.js";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";
import { pngDimensions } from "./png.js";

interface LoadedArtwork {
  file: string;
  path: string;
  png: Buffer;
  width: number;
  height: number;
  encounter?: EncounterAnchor;
}

/** Resolve the same assets for the browser and the production inventory. */
export function loadUpgradeArt(upgrades = process.env.POR_UPGRADES_DIR, gameRoot = findGameRoot()) {
  const artworkDirectories = upgrades === undefined ? [join("upgrades", "slums"), "upgrades"] : [upgrades];
  return loadUpgradeArtFromManifests(artworkDirectories.map((directory) => join(directory, "manifest.json")), gameRoot);
}

export function loadUpgradeArtFromManifests(paths: readonly string[], gameRoot = findGameRoot()) {
  const artwork = new Map<string, LoadedArtwork>();
  const gameFiles = new Map(gameRoot ? listGameFiles(gameRoot).map(file => [file.toUpperCase(), file]) : []);
  const archives = new Map<string, ReturnType<typeof parseDax>>();
  function originalArchive(name: string) {
    const file = gameFiles.get(name);
    if (!file || !gameRoot) return;
    let parsed = archives.get(file);
    if (!parsed) {
      parsed = parseDax(file, readGameFile(gameRoot, file));
      archives.set(file, parsed);
    }
    return parsed;
  }
  for (const manifestPath of paths) {
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as OverrideManifest;
      if (manifest.version !== 1 || !manifest.assets) continue;
      for (const id of Object.keys(manifest.assets)) {
        const encounter = encounterAnchor(id, manifest.encounters?.[id]);
        const monster = monsterCombatKey.exec(id);
        const party = partyCombatKey.exec(id);
        const random = randomCombatKey.exec(id);
        if (id !== "scene:title" && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !monster && !party && !random && !portraitKey.test(id) && !encounter) continue;
        const file = lookupOverride(manifest, id);
        if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) continue;
        try {
          const path = join(dirname(manifestPath), file);
          const png = readFileSync(path);
          const dimensions = pngDimensions(png);
          if (!dimensions) continue;
          let sourceWidth = 8;
          let sourceHeight = 8;
          if (encounter) {
            const archive = originalArchive(encounterKey.exec(id)![2]!);
            if (!archive || !encounterPixels(archive, id, encounter)) continue;
            ({ width: sourceWidth, height: sourceHeight } = encounter);
          } else if (id === "scene:title") [sourceWidth, sourceHeight] = [320, 200];
          else if (random) {
            const entry = originalArchive(random[1])?.entries.find(({ id }) => id === Number(random[2]));
            if (!entry || !randomCombatPixels(entry.data, Number(random[4]))) continue;
            sourceWidth = sourceHeight = 24;
          } else if (monster) {
            const entry = originalArchive(monster[2])?.entries.find(({ id: block }) => block === Number(monster[3]));
            if (!entry || !isPicture(entry.data)) continue;
            const picture = decodePicture(entry.data);
            if (picture.itemCount !== 1 || !isCombatExtent(picture.width, picture.height)) continue;
            ({ width: sourceWidth, height: sourceHeight } = picture);
          } else if (party) {
            const head = originalArchive("CHEAD.DAX")?.entries.find(({ id }) => id === Number(party[1]));
            const body = originalArchive("CBODY.DAX")?.entries.find(({ id }) => id === Number(party[2]));
            if (!head || !body || !partyCombatPart(head.data, 10) || !partyCombatPart(body.data, 24)) continue;
            sourceWidth = sourceHeight = 24;
          }
          else if (portraitKey.test(id)) sourceWidth = sourceHeight = 88;
          const { width, height } = dimensions;
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
