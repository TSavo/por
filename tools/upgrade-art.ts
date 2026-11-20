import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupOverride, type EncounterAnchor, type OverrideManifest } from "../src/lib/assets.js";
import { characterSheetPartKey, characterSheetPartPixels, portraitKey } from "./portrait-art.js";
import { encounterAnchor, encounterKey, encounterPixels } from "./encounter-art.js";
import { combatSelectionKey, isCombatExtent, monsterCombatKey, partyCombatKey, partyCombatPart, randomCombatKey, randomCombatPixels } from "./combat-art.js";
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
  reflected?: boolean;
  encounter?: EncounterAnchor;
}

export interface ArtworkLoadIssue {
  manifest: string;
  id?: string;
  reason: string;
}

/** Resolve the same assets for the browser and the production inventory. */
export function loadUpgradeArt(upgrades = process.env.POR_UPGRADES_DIR, gameRoot = findGameRoot(),
  report?: (issue: ArtworkLoadIssue) => void) {
  const artworkDirectories = upgrades === undefined ? [join("upgrades", "slums"), "upgrades"] : [upgrades];
  return loadUpgradeArtFromManifests(artworkDirectories.map((directory) => join(directory, "manifest.json")), gameRoot, report);
}

export function loadUpgradeArtFromManifests(paths: readonly string[], gameRoot = findGameRoot(),
  report?: (issue: ArtworkLoadIssue) => void) {
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
    const reject = (reason: string, id?: string) => report?.({ manifest: manifestPath, id, reason });
    try {
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as OverrideManifest;
      if (manifest.version !== 1 || !manifest.assets) {
        reject("Unsupported manifest version or missing assets.");
        continue;
      }
      const reflectedTiles = new Set(manifest.reflectedTiles ?? []);
      for (const id of Object.keys(manifest.assets)) {
        const encounter = encounterAnchor(id, manifest.encounters?.[id]);
        const monster = monsterCombatKey.exec(id);
        const party = partyCombatKey.exec(id);
        const random = randomCombatKey.exec(id);
        const combatSelection = combatSelectionKey.exec(id);
        const sheetPart = characterSheetPartKey.exec(id);
        const startupScene = id === "scene:title" || id === "scene:publisher";
        if (!startupScene && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !monster && !party && !random && !combatSelection && !sheetPart && !portraitKey.test(id) && !encounter) {
          reject("Unsupported asset ID or invalid encounter placement.", id);
          continue;
        }
        const file = lookupOverride(manifest, id);
        if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) {
          reject("Invalid PNG filename.", id);
          continue;
        }
        try {
          const path = join(dirname(manifestPath), file);
          const png = readFileSync(path);
          const dimensions = pngDimensions(png);
          if (!dimensions) {
            reject("Invalid PNG header.", id);
            continue;
          }
          let sourceWidth = 8;
          let sourceHeight = 8;
          if (encounter) {
            const archive = originalArchive(encounterKey.exec(id)![3]!);
            if (!archive || !encounterPixels(archive, id, encounter)) {
              reject("Encounter source frame does not match its placement.", id);
              continue;
            }
            ({ width: sourceWidth, height: sourceHeight } = encounter);
          } else if (startupScene) [sourceWidth, sourceHeight] = [320, 200];
          else if (random) {
            const entry = originalArchive(random[1])?.entries.find(({ id }) => id === Number(random[2]));
            if (!entry || !randomCombatPixels(entry.data, Number(random[4]))) {
              reject("Random combat source frame is missing or invalid.", id);
              continue;
            }
            sourceWidth = sourceHeight = 24;
          } else if (combatSelection) {
            const entry = originalArchive(combatSelection[1])?.entries.find(({ id }) => id === Number(combatSelection[2]));
            const picture = entry && isPicture(entry.data) ? decodePicture(entry.data) : undefined;
            if (!picture || picture.width !== 24 || picture.height !== 24 || picture.itemCount !== 1) {
              reject("Combat selection source frame is missing or invalid.", id);
              continue;
            }
            sourceWidth = sourceHeight = 24;
          } else if (monster) {
            const entry = originalArchive(monster[2])?.entries.find(({ id: block }) => block === Number(monster[3]));
            const picture = entry && isPicture(entry.data) ? decodePicture(entry.data) : undefined;
            if (!picture || picture.itemCount !== 1 || !isCombatExtent(picture.width, picture.height)) {
              reject("Monster combat source frame is missing or invalid.", id);
              continue;
            }
            ({ width: sourceWidth, height: sourceHeight } = picture);
          } else if (party) {
            const head = originalArchive("CHEAD.DAX")?.entries.find(({ id }) => id === Number(party[1]));
            const body = originalArchive("CBODY.DAX")?.entries.find(({ id }) => id === Number(party[2]));
            if (!head || !body || !partyCombatPart(head.data, 10) || !partyCombatPart(body.data, 24)) {
              reject("Party combat source parts are missing or invalid.", id);
              continue;
            }
            sourceWidth = sourceHeight = 24;
          }
          else if (sheetPart) {
            const entry = originalArchive(sheetPart[1]!)?.entries.find(({ id }) => id === Number(sheetPart[3]));
            const pixels = entry && characterSheetPartPixels(entry.data, sheetPart[2]!);
            if (!pixels?.some(Boolean)) {
              reject("Character sheet source part is missing or invalid.", id);
              continue;
            }
            sourceWidth = 88;
            sourceHeight = pixels.length / sourceWidth;
          } else if (portraitKey.test(id)) sourceWidth = sourceHeight = 88;
          const { width, height } = dimensions;
          if (width !== sourceWidth * 4 || height !== sourceHeight * 4) {
            reject(`Expected ${sourceWidth * 4}×${sourceHeight * 4} PNG, found ${width}×${height}.`, id);
            continue;
          }
          artwork.set(id, { file, path, png, encounter, width, height,
            reflected: id.startsWith("tile:") && reflectedTiles.has(id) || undefined });
        } catch (error) {
          reject(`Cannot read ${file} (${(error as NodeJS.ErrnoException).code ?? "invalid artwork"}).`, id);
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced artwork", error);
        }
      }
    } catch (error) {
      reject(`Cannot read manifest (${(error as NodeJS.ErrnoException).code ?? "invalid JSON"}).`);
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Cannot load enhanced artwork manifest", error);
    }
  }
  return artwork;
}
