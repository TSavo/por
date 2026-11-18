import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export type CombatArtPlacement = [x: number, y: number, key: string, reflected: boolean, highlighted?: boolean, width?: number, height?: number];

/** Palette index under a selected guest unit's transparent pixels. */
export function combatHighlightPixel(x: number, y: number): number {
  if (y === 0) return x < 23 ? 15 : 8;
  if (y === 23) return x === 0 ? 15 : 8;
  return x < 2 ? 15 : x >= 22 ? 8 : 7;
}

export const monsterCombatKey = /^combat:(?:area:(\d{1,3}):)?(CPIC[1-8]\.DAX):(\d{1,3})$/;

export function loadCombatArtMatcher(keys: string[]) {
  const areas = new Map<number, string[]>();
  const global = keys.filter(key => {
    const area = monsterCombatKey.exec(key)?.[1];
    if (area === undefined) return true;
    const id = Number(area);
    const scoped = areas.get(id) ?? [];
    scoped.push(key);
    areas.set(id, scoped);
    return false;
  });
  const fallback = buildCombatArtMatcher(global);
  const matchers = new Map<number, ReturnType<typeof buildCombatArtMatcher>>();
  return (frame: Frame, enhanced?: Frame, area?: number): CombatArtPlacement[] => {
    const scoped = area === undefined ? undefined : areas.get(area);
    if (!scoped || area === undefined) return fallback(frame, enhanced);
    let matcher = matchers.get(area);
    if (!matcher) {
      const sources = new Set(scoped.map(key => key.replace(/^combat:area:\d+:/, "combat:")));
      matcher = buildCombatArtMatcher([...global.filter(key => !sources.has(key)), ...scoped]);
      matchers.set(area, matcher);
    }
    return matcher(frame, enhanced);
  };
}

function buildCombatArtMatcher(keys: string[]) {
  type Pose = { key: string; reflected: boolean; pixels: Uint8Array; width: number };
  const patterns = new Map<string, Pose | null>();
  const poses: Pose[] = [];
  const sizes = new Map<string, { width: number; height: number }>();
  const register = (pixels: Uint8Array, key: string, reflected: boolean, width: number) => {
    const pattern = `${width}:${Buffer.from(pixels).toString("hex")}`;
    const previous = patterns.get(pattern);
    const pose = { key, reflected, pixels, width };
    patterns.set(pattern, previous === undefined || previous?.key === key ? pose : null);
    poses.push(pose);
  };
  const registerFacings = (pixels: Uint8Array, key: string, width = 24, height = 24) => {
    sizes.set(`${width}:${height}`, { width, height });
    const reflected = Buffer.from(pixels);
    for (let y = 0; y < height; y++) reflected.subarray(y * width, (y + 1) * width).reverse();
    register(reflected, key, true, width);
    register(pixels, key, false, width);
  };
  const selectedPose = (cell: Uint8Array, bevel: Uint8Array, width: number) => {
    // Aim draws white cursor pixels over the gray interior of the selection frame.
    if (cell[0] !== 15 || cell[cell.length - 1] !== 8) return;
    let match: Pose | undefined;
    for (const pose of poses) {
      if (pose.width !== width || pose.pixels.length !== cell.length || !pose.pixels.every((color, index) => color ? cell[index] === color :
        cell[index] === bevel[index] || (bevel[index] === 7 && cell[index] === 15))) continue;
      if (match && match.key !== pose.key) return;
      match = pose;
    }
    return match;
  };
  const root = keys.length ? findGameRoot() : null;
  if (root) {
    const monsters = new Map(keys.flatMap(key => {
      const parts = monsterCombatKey.exec(key);
      return parts ? [[`${parts[2]}:${Number(parts[3])}`, key] as const] : [];
    }));
    for (const file of listGameFiles(root)) {
      const archive = file.toUpperCase();
      if (![...monsters.keys()].some(key => key.startsWith(`${archive}:`))) continue;
      for (const { id, data } of parseDax(archive, readGameFile(root, file)).entries) {
        const key = monsters.get(`${archive}:${id}`);
        if (!key || !isPicture(data)) continue;
        const { width, height, itemCount, pixels } = decodePicture(data);
        if (!isCombatExtent(width, height) || itemCount !== 1 || !pixels.some(Boolean)) continue;
        registerFacings(pixels, key, width, height);
      }
    }
    const partyKeys = keys.flatMap((key) => {
      const ids = /^combat:party:(\d{1,3}):(\d{1,3})$/.exec(key);
      return ids ? [{ key, head: Number(ids[1]), body: Number(ids[2]) }] : [];
    });
    if (partyKeys.length) {
      const files = listGameFiles(root);
      const parts = (archive: string, height: number) => {
        const file = files.find(name => name.toUpperCase() === archive);
        return new Map(file ? parseDax(archive, readGameFile(root, file)).entries.flatMap(({ id, data }) => {
          if (!isPicture(data)) return [];
          const picture = decodePicture(data);
          return picture.width === 24 && picture.height === height && picture.itemCount === 1 ?
            [[id, picture.pixels] as const] : [];
        }) : []);
      };
      const heads = parts("CHEAD.DAX", 10);
      const bodies = parts("CBODY.DAX", 24);
      for (const { key, head, body } of partyKeys) {
        const face = heads.get(head);
        const torso = bodies.get(body);
        if (!face || !torso) continue;
        const pixels = torso.slice();
        pixels.set(face);
        registerFacings(pixels, key);
      }
    }
  }
  return (frame: Frame, enhanced?: Frame): CombatArtPlacement[] => {
    if (!patterns.size) return [];
    const placements: CombatArtPlacement[] = [];
    for (const { width, height } of sizes.values()) {
      const cell = Buffer.alloc(width * height);
      // Large units span multiple guest selection squares.
      const bevel = Uint8Array.from({ length: cell.length }, (_, index) =>
        combatHighlightPixel((index % width) % 24, Math.floor(index / width) % 24));
      // The guest draws the combat field inside the left-hand panel.
      for (let y = 8; y + height <= 176; y += 8) {
        for (let x = 8; x + width <= 176; x += 8) {
          for (let row = 0; row < height; row++) {
            const start = (y + row) * frame.width + x;
            cell.set(frame.pixels.subarray(start, start + width), row * width);
          }
          const plain = patterns.get(`${width}:${cell.toString("hex")}`);
          const selected = plain === undefined ? selectedPose(cell, bevel, width) : undefined;
          const match = plain ?? selected;
          if (!match) continue;
          placements.push(width !== 24 || height !== 24 ? [x, y, match.key, match.reflected, Boolean(selected), width, height]
            : selected ? [x, y, match.key, match.reflected, true] : [x, y, match.key, match.reflected]);
          if (!enhanced) continue;
          for (let row = 0; row < height; row++) {
            const start = (y + row) * enhanced.width + x;
            for (let column = 0; column < width; column++) {
              const index = row * width + column;
              enhanced.pixels[start + column] = selected
                ? match.pixels[index] ? bevel[index]! : cell[index]!
                : 0;
            }
          }
        }
      }
    }
    return placements;
  };
}

export function isCombatExtent(width: number, height: number): boolean {
  return [24, 48].includes(width) && [24, 48].includes(height);
}
