/**
 * What the browser build preloads and what it may fetch (#225): the resource layer's `index`, made by
 * Node from the same sources the server reads. A page cannot list a directory or read 13,000 PNG
 * headers at start, so the index names the files and carries what they say:
 *
 *  - `game`: the port's own game data (`game:` ids), preloaded into the engine's memory;
 *  - `engineEnv`: the artwork keys the engine may resolve (tools/enhanced-runner.ts), as the server
 *    handed them to its runner;
 *  - `artwork`: what the page's session needs of each piece of art (tools/play-session.ts), its file
 *    fetched only when it is on screen (#228);
 *  - `codeWheel`: whether the code wheel's art is all there; `buildVersion`, what the page shows.
 */
import { enhancedArtKeys } from "../enhanced-runner.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "../upgrade-art.js";
import type { ResidentResources } from "../../src/resources/provider.js";
import { readBuildVersion } from "../build-version.js";
import type { SessionArtwork } from "../play-session.js";

type ArtInfo = SessionArtwork extends ReadonlyMap<string, infer A> ? A : never;

export interface ResourceIndex {
  version: 1;
  game: string[];
  engineEnv: Record<string, string>;
  artwork: Record<string, ArtInfo>;
  codeWheel: boolean;
  buildVersion: unknown;
}

/** The code wheel's runes, by the name the page asks for (/code-wheel/<name>.png). */
export const codeWheelRunes = (resources: ResidentResources) => new Map(resources.listNow("codewheel:")
  .map((id) => id.slice("codewheel:".length)).filter((name) => /^(espruar|dethek)-\d{2}\.png$/.test(name))
  .map((name) => [name.slice(0, -4), `codewheel:${name}`]));

export function resourceIndex(resources: ResidentResources, artwork = loadUpgradeArt(undefined, "res:game"),
  materialMasks = loadCombatMaterialMasks(artwork)): ResourceIndex {
  return {
    version: 1,
    game: resources.listNow("game:").map((id) => id.slice("game:".length)),
    engineEnv: enhancedArtKeys(artwork, materialMasks),
    artwork: Object.fromEntries([...artwork].map(([id, { file, path, reflected, screenCellOnly, encounter, width, height }]) =>
      [id, { file, path, reflected, screenCellOnly, encounter, width, height }])),
    codeWheel: codeWheelRunes(resources).size === 70,
    buildVersion: readBuildVersion(),
  };
}
