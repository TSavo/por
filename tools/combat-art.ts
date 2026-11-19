import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export type CombatArtPlacement = [x: number, y: number, key: string, reflected: boolean, highlighted?: boolean, width?: number, height?: number];

/** Palette index under a selected guest unit's transparent pixels. */
export function combatHighlightPixel(x: number, y: number): number {
  if (y === 0) return x < 23 ? 15 : 8;
  if (y === 23) return x === 0 ? 15 : 8;
  return x < 2 ? 15 : x >= 22 ? 8 : 7;
}

export const monsterCombatKey = /^combat:(?:area:(\d{1,3}):)?(CPIC[1-8]\.DAX):(\d{1,3})(?::ecl:([a-f0-9]{4}))?$/;
export const partyCombatKey = /^combat:party:(\d{1,3}):(\d{1,3})(?::palette:(0[1-9a-f]{15}))?$/;
export const randomCombatKey = /^combat:(RANDCOM\.DAX):(1):(0):([0-5])$/;
const fallenCombatKey = "combat:RANDCOM.DAX:1:0:5";

export function randomCombatPixels(data: Uint8Array, frame: number) {
  if (!isPicture(data)) return;
  const picture = decodePicture(data);
  if (picture.width === 24 && picture.height === 24 && frame >= 0 && frame < picture.itemCount) return frameSlice(picture, frame);
}

export function partyCombatPart(data: Uint8Array, height: 10 | 24) {
  if (!isPicture(data)) return;
  const picture = decodePicture(data);
  if (picture.width === 24 && (picture.height === height || (height === 10 && picture.height === 8)) &&
      picture.itemCount === 1) return picture.pixels;
}

export function loadCombatArtMatcher(keys: string[], root = keys.length ? findGameRoot() : null) {
  const scopes = new Map<string, string[]>();
  const global = keys.filter(key => {
    const [, area, , , cursor] = monsterCombatKey.exec(key) ?? [];
    if (area === undefined) return true;
    const id = cursor === undefined ? area : `${area}:${cursor}`;
    const scoped = scopes.get(id) ?? [];
    scoped.push(key);
    scopes.set(id, scoped);
    return false;
  });
  const fallback = buildCombatArtMatcher(global, root);
  const matchers = new Map<string, ReturnType<typeof buildCombatArtMatcher>>();
  return (frame: Frame, enhanced?: Frame, area?: number, cursor?: number, underlay?: Frame): CombatArtPlacement[] => {
    if (area === undefined) return fallback(frame, enhanced, underlay);
    const areaScope = String(area);
    const battleScope = `${area}:${cursor?.toString(16).padStart(4, "0")}`;
    const scoped = scopes.get(areaScope);
    const battle = scopes.get(battleScope);
    if (!scoped && !battle) return fallback(frame, enhanced, underlay);
    const scope = battle ? battleScope : areaScope;
    let matcher = matchers.get(scope);
    if (!matcher) {
      const sources = new Map<string, string>();
      for (const key of [...global, ...(scoped ?? []), ...(battle ?? [])]) {
        const monster = monsterCombatKey.exec(key);
        sources.set(monster ? `${monster[2]}:${monster[3]}` : key, key);
      }
      matcher = buildCombatArtMatcher([...sources.values()], root);
      matchers.set(scope, matcher);
    }
    return matcher(frame, enhanced, underlay);
  };
}

function buildCombatArtMatcher(keys: string[], root: string | null) {
  type Pose = { key: string; pattern: string; scoped: boolean; reflected: boolean; pixels: Uint8Array; width: number };
  const registered: Pose[] = [];
  const sizes = new Map<string, { width: number; height: number }>();
  const register = (pixels: Uint8Array, key: string, reflected: boolean, width: number) => {
    const pattern = `${width}:${Buffer.from(pixels).toString("hex")}`;
    registered.push({ key, pattern, scoped: key.startsWith("combat:area:"), reflected, pixels, width });
  };
  const registerFacings = (pixels: Uint8Array, key: string, width = 24, height = 24, artReflected = false) => {
    sizes.set(`${width}:${height}`, { width, height });
    const reflected = Buffer.from(pixels);
    for (let y = 0; y < height; y++) reflected.subarray(y * width, (y + 1) * width).reverse();
    register(reflected, key, !artReflected, width);
    register(pixels, key, artReflected, width);
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
  const terrainPose = (cell: Uint8Array, width: number, background?: Uint8Array) => {
    // Tall monsters can overlap the backdrop and adjacent units. Wide
    // and encounter-specific monsters can overlap grayscale terrain.
    let match: Pose | undefined;
    const wide = cell.length === width * 24;
    for (const pose of terrainPoses.get(`${width}:${cell.length}`) ?? []) {
      const matchesBackground = background && pose.pixels.every((color, index) => color || cell[index] === background[index]);
      if (partyCombatKey.test(pose.key) && !matchesBackground) continue;
      if (!pose.pixels.every((color, index) => {
            const pixel = cell[index];
            if (color) return pixel === color;
            return matchesBackground || !wide || pixel === 0 || pixel === 7 || pixel === 8 || pixel === 15;
          })) continue;
      if (match && match.key !== pose.key) return;
      match = pose;
    }
    return match;
  };
  if (root && keys.length) {
    const randomFrames = keys.flatMap(key => {
      const match = randomCombatKey.exec(key);
      return match ? [{ key, frame: Number(match[4]) }] : [];
    });
    if (randomFrames.length) {
      const file = listGameFiles(root).find(name => name.toUpperCase() === "RANDCOM.DAX");
      const record = file ? parseDax(file, readGameFile(root, file)).entries.find(({ id }) => id === 1) : undefined;
      if (record) for (const { key, frame } of randomFrames) {
        const pixels = randomCombatPixels(record.data, frame);
        // The two loose-stone layouts use opposite diagonals. Frame 0
        // matches its own guest pixels and mirrors the enhanced frame 1 art.
        if (pixels?.some(Boolean)) registerFacings(pixels, key, 24, 24, frame === 0);
      }
    }
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
      const ids = partyCombatKey.exec(key);
      return ids ? [{ key, head: Number(ids[1]), body: Number(ids[2]), palette: ids[3] }] : [];
    });
    if (partyKeys.length) {
      const files = listGameFiles(root);
      const parts = (archive: string, height: 10 | 24) => {
        const file = files.find(name => name.toUpperCase() === archive);
        return new Map(file ? parseDax(archive, readGameFile(root, file)).entries.flatMap(({ id, data }) => {
          const pixels = partyCombatPart(data, height);
          return pixels ? [[id, pixels] as const] : [];
        }) : []);
      };
      const heads = parts("CHEAD.DAX", 10);
      const bodies = parts("CBODY.DAX", 24);
      for (const { key, head, body, palette } of partyKeys) {
        const face = heads.get(head);
        const torso = bodies.get(body);
        if (!face || !torso) continue;
        const pixels = torso.slice();
        // The head is a masked overlay. Its clear pixels leave the sword,
        // bow, or shield already drawn in the top rows of the body visible.
        face.forEach((color, index) => { if (color) pixels[index] = color; });
        registerFacings(palette ? pixels.map(color => Number.parseInt(palette[color]!, 16)) : pixels, key);
      }
    }
  }
  // Different CPIC archives can contain the same native pose. A local binding
  // takes precedence over the matching global bitmap in this area's matcher.
  const scopedPatterns = new Set(registered.filter(({ scoped }) => scoped).map(({ pattern }) => pattern));
  const poses = registered.filter(({ scoped, pattern }) => scoped || !scopedPatterns.has(pattern));
  const terrainPoses = new Map<string, Pose[]>();
  for (const pose of poses) {
    const { width, pixels, key } = pose;
    const overlapsTerrain = monsterCombatKey.test(key) && (width === 48 || pixels.length === width * 48 || key.includes(":ecl:"));
    if (key !== fallenCombatKey && !overlapsTerrain && !partyCombatKey.test(key)) continue;
    const extent = `${width}:${pixels.length}`;
    const matching = terrainPoses.get(extent) ?? [];
    matching.push(pose);
    terrainPoses.set(extent, matching);
  }
  const patterns = new Map<string, Pose | null>();
  for (const pose of poses) {
    const previous = patterns.get(pose.pattern);
    patterns.set(pose.pattern, previous === undefined || previous?.key === pose.key ? pose : null);
  }
  return (frame: Frame, enhanced?: Frame, underlay?: Frame): CombatArtPlacement[] => {
    if (!patterns.size) return [];
    const placements: CombatArtPlacement[] = [];
    for (const { width, height } of sizes.values()) {
      const cell = Buffer.alloc(width * height);
      const background = underlay && terrainPoses.has(`${width}:${cell.length}`) ? Buffer.alloc(cell.length) : undefined;
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
          if (plain === undefined && !selected && background && underlay) {
            for (let row = 0; row < height; row++) {
              const start = (y + row) * frame.width + x;
              background.set(underlay.pixels.subarray(start, start + width), row * width);
            }
          }
          const terrain = plain === undefined && !selected
            ? terrainPose(cell, width, background) : undefined;
          const match = plain ?? selected ?? terrain;
          if (!match) continue;
          // A standing unit can obscure a prop in the guest's terrain pass.
          // Restore the whole prop as its own layer when the visible pixels
          // agree with that backdrop and the complete prop bitmap matches.
          const restoreTerrain = terrain && background && match.pixels.every((color, index) => color || cell[index] === background[index]);
          const backdrop = restoreTerrain ? patterns.get(`${width}:${background.toString("hex")}`) : undefined;
          const prop = backdrop && randomCombatKey.test(backdrop.key) ? backdrop : undefined;
          if (prop) placements.push([x, y, prop.key, prop.reflected]);
          placements.push(width !== 24 || height !== 24 ? [x, y, match.key, match.reflected, Boolean(selected), width, height]
            : selected ? [x, y, match.key, match.reflected, true] : [x, y, match.key, match.reflected]);
          if (!enhanced) continue;
          for (let row = 0; row < height; row++) {
            const start = (y + row) * enhanced.width + x;
            for (let column = 0; column < width; column++) {
              const index = row * width + column;
              enhanced.pixels[start + column] = selected
                ? match.pixels[index] ? bevel[index]! : cell[index]!
                : restoreTerrain ? prop ? 0 : background[index]!
                : terrain && !match.pixels[index] ? cell[index]! : 0;
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
