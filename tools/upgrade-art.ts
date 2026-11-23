import { closeSync, openSync, readFileSync, readSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { lookupOverride, type EncounterAnchor, type OverrideManifest } from "../src/lib/assets.js";
import { characterSheetPartKey, characterSheetPartPixels, endingPortraitKey, portraitKey, scriptIllustrations } from "./portrait-art.js";
import { encounterAnchor, encounterKey, encounterPixels, matchesEncounterSource } from "./encounter-art.js";
import { combatSelectionKey, combatEffectKey, isCombatExtent, monsterCombatKey, partyCombatKey, partyCombatPart, randomCombatKey, randomCombatPixels } from "./combat-art.js";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture, isPicture } from "../src/lib/picture.js";
import { findGameRoot, isPortGameRoot, listGameFiles, portGame, readGameFile } from "./gamedata.js";
import { pngDimensions, pngHeaderDimensions } from "./png.js";
import { fromWorkingRoot } from "./port-root.js";
import { hasResources, resources } from "../src/resources/provider.js";

/**
 * Where the catalogue's files are read: a path on disk (the tools), or an `upgrades:` id of the
 * resource layer (the play path, #224). A resource path is `upgrades:<dir>/<file>`.
 */
const isResourcePath = (path: string) => path.startsWith("upgrades:");
const parentOf = (path: string) => isResourcePath(path) ? path.slice(0, path.lastIndexOf("/") + 1) || "upgrades:" : dirname(path);
const within = (directory: string, file: string) => isResourcePath(directory)
  ? (directory.endsWith(":") || directory.endsWith("/") ? directory : directory + "/") + file : join(directory, file);
function readArtFile(path: string, length?: number): Buffer {
  if (isResourcePath(path)) {
    const bytes = resources().readNow(path, length);
    if (!bytes) throw Object.assign(new Error(`${path} not found`), { code: "ENOENT" });
    return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }
  if (length === undefined) return readFileSync(path);
  const header = Buffer.alloc(length);
  const descriptor = openSync(path, "r");
  try { readSync(descriptor, header, 0, header.length, 0); } finally { closeSync(descriptor); }
  return header;
}
function listArtDirectory(directory: string): string[] {
  if (!isResourcePath(directory)) return readdirSync(directory);
  return resources().listNow(directory).map((id) => id.slice(directory.length)).filter((name) => !name.includes("/"));
}

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
  const masks = new Map<string, { readonly png: Buffer | undefined }>();
  const filesByDirectory = new Map<string, Set<string>>();
  // A companion PNG records the original material index for each enhanced pixel.
  for (const [id, art] of artwork) {
    const party = partyCombatKey.exec(id);
    if (!party || party[3]) continue;
    const directory = parentOf(art.path);
    let files = filesByDirectory.get(directory);
    if (!files) filesByDirectory.set(directory, files = new Set(listArtDirectory(directory)));
    const name = art.file.replace(/\.png$/i, "-materials.png");
    if (name === art.file || !files.has(name)) continue;
    const path = within(directory, name);
    const size = pngHeaderDimensions(readArtFile(path, 33));
    if (size?.width !== art.width || size.height !== art.height) continue;
    masks.set(id, {
      get png() {
        const bytes = readArtFile(path);
        const dimensions = pngDimensions(bytes);
        return dimensions?.width === art.width && dimensions.height === art.height ? bytes : undefined;
      },
    });
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
  report?: (issue: ArtworkLoadIssue) => void, fromResources = upgrades === process.env.POR_UPGRADES_DIR && hasResources()) {
  // Through the resource layer `upgrades:` is POR_UPGRADES_DIR, or the working upgrades/ with its slums/ set.
  if (fromResources) {
    const manifests = process.env.POR_UPGRADES_DIR === undefined ? ["upgrades:slums/manifest.json", "upgrades:manifest.json"] : ["upgrades:manifest.json"];
    return loadUpgradeArtFromManifests(manifests, gameRoot, report);
  }
  const artworkDirectories = upgrades === undefined ? [fromWorkingRoot("upgrades", "slums"), fromWorkingRoot("upgrades")] : [upgrades];
  return loadUpgradeArtFromManifests(artworkDirectories.map((directory) => join(directory, "manifest.json")), gameRoot, report);
}

export function loadUpgradeArtFromManifests(paths: readonly string[], gameRoot = findGameRoot(),
  report?: (issue: ArtworkLoadIssue) => void) {
  const artwork = new Map<string, LoadedArtwork>();
  const dimensionsByPath = new Map<string, NonNullable<ReturnType<typeof pngHeaderDimensions>>>();
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
      const manifest = JSON.parse(readArtFile(manifestPath).toString("utf8")) as OverrideManifest;
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
        const overlandTile = /^overland-(?:tile|detail|landmark):(0|[1-9]\d{0,2})$/.exec(id);
        const validOverlandTile = overlandTile !== null && Number(overlandTile[1]) <= 255;
        const overlandMaterials = id === "overland-materials";
        const sheetPart = characterSheetPartKey.exec(id);
        // scene:title-name and scene:title-edition are the game's name and SPECIAL EDITION, each drawn on its own so the page can fade them in over the title art.
        const startupScene = id === "scene:title" || id === "scene:publisher" || id === "scene:title-name" || id === "scene:title-edition";
        const illustration = scriptIllustrations.has(id) || endingPortraitKey.test(id);
        if (!/^panel:(rail-x|rail-y|stud)$/.test(id) && !startupScene && !illustration && !/^tile:\d{1,3}:[a-f0-9]{64}$/.test(id) &&
            !/^battle-tile:[a-f0-9]{64}$/.test(id) && !validOverlandTile && !overlandMaterials && !monster && !party && !random && !combatSelection && !effect && !sheetPart && !portraitKey.test(id) && !encounter) {
          reject("Unsupported asset ID or invalid encounter placement.", id);
          continue;
        }
        const file = lookupOverride(manifest, id);
        if (typeof file !== "string" || !/^[a-z0-9_-]+\.png$/i.test(file)) {
          reject("Invalid PNG filename.", id);
          continue;
        }
        try {
          const path = within(parentOf(manifestPath), file);
          // Many area and scene keys share one PNG. Read its header once per load
          // and validate the expected dimensions separately for each binding.
          let dimensions = dimensionsByPath.get(path);
          if (!dimensions) {
            dimensions = pngHeaderDimensions(readArtFile(path, 33));
            if (!dimensions) {
              reject("Invalid PNG header.", id);
              continue;
            }
            dimensionsByPath.set(path, dimensions);
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
          else if (validOverlandTile) sourceWidth = sourceHeight = 24;
          else if (overlandMaterials) [sourceWidth, sourceHeight] = [256, 512];
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
          } else if (portraitKey.test(id) || illustration) sourceWidth = sourceHeight = 88;
          const { width, height } = dimensions;
          if (width !== sourceWidth * 4 || height !== sourceHeight * 4) {
            reject(`Expected ${sourceWidth * 4}×${sourceHeight * 4} PNG, found ${width}×${height}.`, id);
            continue;
          }
          const explorationTile = id.startsWith("tile:");
          artwork.set(id, { file, path, get png() { return readArtFile(path); }, encounter, width, height,
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
