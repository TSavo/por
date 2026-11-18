/**
 * Stable ids for every renderable so an upgraded asset can replace one classic
 * picture without a second copy of the rules.
 *
 *   pic:<FILE>:<block>
 *   glyph:<FILE>:<block>:<index>
 *   walldef:<FILE>:<block>
 *   geo:<FILE>:<block>
 *   scene:title
 *   scene:viewport
 *
 * An override is a PNG in upgrades/ named by the id with ":" turned into "__",
 * listed in upgrades/manifest.json. Missing overrides fall back to the classic
 * pixels. The fallback decision is presentation-only; it never writes game state.
 */

export interface AssetOverride {
  id: string;
  file: string;
}

export interface OverrideManifest {
  version: 1;
  assets: Record<string, string>;
  encounters?: Record<string, EncounterAnchor>;
}

export interface EncounterAnchor {
  area: number;
  x: number;
  y: number;
  width: number;
  height: number;
  flatBackground?: [number, number];
}

export function assetId(kind: string, file: string, block?: number, index?: number): string {
  const name = file.toUpperCase();
  let id = `${kind}:${name}`;
  if (block !== undefined) id += `:${block}`;
  if (index !== undefined) id += `:${index}`;
  return id;
}

export function overrideFilename(id: string): string {
  return `${id.replaceAll(":", "__")}.png`;
}

export function lookupOverride(manifest: OverrideManifest, id: string): string | null {
  return manifest.assets[id] ?? null;
}
