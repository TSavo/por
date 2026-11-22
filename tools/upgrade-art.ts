import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupOverride, type EncounterAnchor, type OverrideManifest } from "../src/lib/assets.js";
import { characterSheetPartKey, characterSheetPartPixels, portraitKey, scriptIllustrations } from "./portrait-art.js";
import { encounterAnchor, encounterKey, encounterPixels, matchesEncounterSource } from "./encounter-art.js";
import { combatSelectionKey, combatEffectKey, isCombatExtent, monsterCombatKey, partyCombatKey, partyCombatPart, randomCombatKey, randomCombatPixels } from "./combat-art.js";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture, isPicture } from "../src/lib/picture.js";
import { findGameRoot, isPortGameRoot, listGameFiles, portGame, readGameFile } from "./gamedata.js";
import { pngDimensions } from "./png.js";

interface LoadedArtwork {
  file: string;
  path: string;
  png: Buffer;
  width: number;
  height: number;
  reflected?: boolean;
  screenCellOnly?: boolean;
  encounter?: EncounterAnchor;
}

export function loadCombatMaterialMasks(artwork: ReadonlyMap<string, LoadedArtwork>) {
  const masks = new Map<string, Buffer>();
  const filesByDirectory = new Map<string, Set<string>>();
  // A companion PNG records the original material index for each enhanced pixel.
  for (const [id, art] of artwork) {
    const party = partyCombatKey.exec(id);
    if (!party || party[3]) continue;
    const directory = dirname(art.path);
    let files = filesByDirectory.get(directory);
    if (!files) filesByDirectory.set(directory, files = new Set(readdirSync(directory)));
    const name = art.file.replace(/\.png$/i, "-materials.png");
    if (name === art.file || !files.has(name)) continue;
    const mask = readFileSync(join(directory, name));
    const size = pngDimensions(mask);
    if (size?.width === art.width && size.height === art.height) masks.set(id, mask);
  }
  return masks;
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
  const packagedPictures = gameRoot && isPortGameRoot(gameRoot)
    ? new Map(portGame(gameRoot).data.pictures.map(record => [`${record.file}:${record.block}`, record.pictures]))
    : undefined;
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
      const screenCellsOnly = new Set(manifest.screenCellsOnly ?? []);
      for (const id of Object.keys(manifest.assets)) {
        const encounter = encounterAnchor(id, manifest.encounters?.[id]);
        const monster = monsterCombatKey.exec(id);
        const party = partyCombatKey.exec(id);
        const random = randomCombatKey.exec(id);
        const effect = combatEffectKey.exec(id);
        const combatSelection = combatSelectionKey.exec(id);
        const sheetPart = characterSheetPartKey.exec(id);
        // scene:title-name is the game's name, drawn on its own so the page can fade it in over the title art.
        const startupScene = id === "scene:title" || id === "scene:publisher" || id === "scene:title-name";
        const scriptIllustration = scriptIllustrations.has(id);
        if (!startupScene && !scriptIllustration && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !monster && !party && !random && !combatSelection && !effect && !sheetPart && !portraitKey.test(id) && !encounter) {
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
            const [, , , , name, block, member, frame] = encounterKey.exec(id)!;
            const archive = packagedPictures ? undefined : originalArchive(name!);
            const shape = packagedPictures?.get(`${name}:${block}`)?.[Number(member)];
            const validSource = packagedPictures
              ? shape && matchesEncounterSource(encounter, shape) && Number(frame) < shape.frames
              : archive && encounterPixels(archive, id, encounter);
            if (!validSource) {
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
          } else if (combatSelection || effect) {
            const source = combatSelection ?? effect!;
            const entry = originalArchive(source[1])?.entries.find(({ id }) => id === Number(source[2]));
            const picture = entry && isPicture(entry.data) ? decodePicture(entry.data) : undefined;
            if (!picture || picture.width !== 24 || picture.height !== 24 || picture.itemCount !== 1) {
              reject("Combat effect source frame is missing or invalid.", id);
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
            sourceWidth = 88;
            sourceHeight = sheetPart[2] === "HEAD" ? 40 : 48;
            const shapes = packagedPictures?.get(`${sheetPart[1]}:${sheetPart[3]}`);
            const shape = shapes?.[0];
            const entry = packagedPictures ? undefined : originalArchive(sheetPart[1]!)?.entries.find(({ id }) => id === Number(sheetPart[3]));
            const valid = packagedPictures
              ? shapes?.length === 1 && shape?.width === sourceWidth && shape.height === sourceHeight && shape.frames === 1
              : entry && characterSheetPartPixels(entry.data, sheetPart[2]!)?.some(Boolean);
            if (!valid) {
              reject("Character sheet source part is missing or invalid.", id);
              continue;
            }
          } else if (portraitKey.test(id) || scriptIllustration) sourceWidth = sourceHeight = 88;
          const { width, height } = dimensions;
          if (width !== sourceWidth * 4 || height !== sourceHeight * 4) {
            reject(`Expected ${sourceWidth * 4}×${sourceHeight * 4} PNG, found ${width}×${height}.`, id);
            continue;
          }
          const explorationTile = id.startsWith("tile:");
          artwork.set(id, { file, path, png, encounter, width, height,
            reflected: explorationTile && reflectedTiles.has(id) || undefined,
            screenCellOnly: explorationTile && screenCellsOnly.has(id) || undefined });
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
