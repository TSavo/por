// What the Enhanced display hands the runner, and what it adds to the runner's frames, shared by the
// browser server (tools/browser-play.ts) and the check that compares the two data sources
// (tools/verify-port-parity.mjs), so that the check runs the game exactly as the shipped one runs.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { isPortGameRoot, portGame } from "./gamedata.js";
import { characterSheetPartKey, endingPortraitKey, portraitKey, scriptIllustrations } from "./portrait-art.js";
import { readExplorationCellHashes } from "./exploration-cells.js";
import { readWorld } from "./first-person-cells.js";
import { standaloneExploration } from "./standalone-exploration.js";
import type { NativeExploration } from "./native-exploration.js";
import type { loadUpgradeArt } from "./upgrade-art.js";

type Artwork = ReturnType<typeof loadUpgradeArt>;

/** The environment that tells the runner which artwork keys exist, as the browser server starts it. */
export function enhancedArtEnv(artwork: Artwork, materialMasks: ReadonlyMap<string, unknown>): Record<string, string> {
  const keys = [...artwork.keys()];
  const encounters = Object.fromEntries([...artwork].flatMap(([id, { encounter }]) => encounter ? [[id, encounter]] : []));
  return {
    POR_BATTLE_TILE_KEYS: keys.filter((key) => key.startsWith("battle-tile:")).join(","),
    POR_TILE_ART_KEYS: keys.filter((key) => key.startsWith("tile:")).join(","),
    POR_COMBAT_ART_KEYS: keys.filter((key) => key.startsWith("combat:")).join(","),
    POR_COMBAT_MATERIAL_KEYS: [...materialMasks.keys()].join(","),
    POR_COMBAT_EFFECT_KEYS: keys.filter(key => key.startsWith("combat-effect:")).join(","),
    POR_COMBAT_SELECTION_KEYS: keys.filter(key => key.startsWith("combat-selection:")).join(","),
    POR_PORTRAIT_ART_KEYS: keys.filter(key => portraitKey.test(key) || scriptIllustrations.has(key) || endingPortraitKey.test(key)).join(","),
    POR_CHARACTER_SHEET_ART_KEYS: keys.filter((key) => characterSheetPartKey.test(key)).join(","),
    POR_ENCOUNTER_ART: JSON.stringify(encounters),
  };
}

/** From the port's own data, the first-person cells come from the maps and wall sets, not from pixels. */
export function packagedTerrain(gameRoot: string) {
  if (!isPortGameRoot(gameRoot)) return;
  const world = readWorld(portGame(gameRoot).data, file => new Uint8Array(readFileSync(join(gameRoot, file))));
  return standaloneExploration(world, readExplorationCellHashes());
}

/** The tile artwork of the first-person view the game drew, from the packaged terrain. */
export function packagedTiles(terrain: NonNullable<ReturnType<typeof packagedTerrain>>, artwork: { has(key: string): boolean },
  native: NativeExploration & { area: number }, inventory?: [number, number, string, string][]): [number, number, string][] {
  const tiles: [number, number, string][] = [];
  terrain.cellKeys(native).forEach((key, index) => {
    if (!key) return;
    const screenX = 24 + (index % 11) * 8, screenY = 24 + Math.floor(index / 11) * 8;
    if (artwork.has(key)) tiles.push([screenX, screenY, key]);
    inventory?.push([screenX, screenY, key, ""]);
  });
  return tiles;
}
