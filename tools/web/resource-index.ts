/**
 * What the browser build preloads and what it may fetch (#225): the resource layer's `index`, made by
 * Node from the same sources the server reads. A page cannot list a directory or read 13,000 PNG
 * headers at start, so the index names the files and carries what they say:
 *
 *  - `game`: the port's own game data (`game:` ids), preloaded into the engine's memory;
 *  - `engineEnv`: the artwork keys the engine may resolve (tools/enhanced-runner.ts), as the server
 *    handed them to its runner.
 */
import { enhancedArtKeys } from "../enhanced-runner.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "../upgrade-art.js";
import type { ResidentResources } from "../../src/resources/provider.js";

export interface ResourceIndex {
  version: 1;
  game: string[];
  engineEnv: Record<string, string>;
}

export function resourceIndex(resources: ResidentResources, artwork = loadUpgradeArt(undefined, "res:game"),
  materialMasks = loadCombatMaterialMasks(artwork)): ResourceIndex {
  return {
    version: 1,
    game: resources.listNow("game:").map((id) => id.slice("game:".length)),
    engineEnv: enhancedArtKeys(artwork, materialMasks),
  };
}
