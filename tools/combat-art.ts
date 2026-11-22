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

export const monsterCombatKey = /^combat:(?:area:(\d{1,3}):)?(CPIC[1-8]\.DAX|ICON\.DAX):(\d{1,3})(?::ecl:([a-f0-9]{4}))?$/;
export const partyCombatKey = /^combat:party:(\d{1,3}):(\d{1,3})(?::palette:(0[1-9a-f]{15}))?$/;
export const partyRecolorKey = /^(combat:party:\d{1,3}:\d{1,3}):palette:0[0-9a-f]{15}$/;
export const combatEffectKey = /^combat-effect:(COMSPR\.DAX):(\d{1,3})(?::(flip-x|transpose))?$/;
export const randomCombatKey = /^combat:(RANDCOM\.DAX):(1):(0):([0-5])$/;
export const combatSelectionKey = /^combat-selection:(COMSPR\.DAX):(25|153)$/;
const fallenCombatKey = "combat:RANDCOM.DAX:1:0:5";
const partyMaterialIndices = new Set([1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 15]);
const smallHeadAliasSources = new Map([[11, 0], [12, 1], [13, 2]]);

export function randomCombatPixels(data: Uint8Array, frame: number) {
  if (!isPicture(data)) return;
  const picture = decodePicture(data);
  if (picture.width === 24 && picture.height === 24 && frame >= 0 && frame < picture.itemCount) return frameSlice(picture, frame);
}

export function transformCombatEffectPixels(pixels: Uint8Array, transform?: string): Uint8Array {
  if (!transform) return pixels;
  return Uint8Array.from(pixels, (_, index) => {
    const x = index % 24, y = Math.floor(index / 24);
    return pixels[transform === "flip-x" ? y * 24 + 23 - x : x * 24 + y]!;
  });
}

export function combatEffectFlightFamily(key: string): string {
  const block = combatEffectKey.exec(key)?.[2];
  if (block === "3" || block === "131") return "combat-effect:COMSPR.DAX:3";
  if (block === "4" || block === "132") return "combat-effect:COMSPR.DAX:4";
  if (block === "5" || block === "133") return "combat-effect:COMSPR.DAX:5";
  if (block === "6" || block === "134") return "combat-effect:COMSPR.DAX:6";
  if (block === "7" || block === "135") return "combat-effect:COMSPR.DAX:7";
  if (block === "8" || block === "136") return "combat-effect:COMSPR.DAX:8";
  return key;
}

export function loadCombatEffects(keys: string[], root = keys.length ? findGameRoot() : null) {
  const file = root && listGameFiles(root).find(name => name.toUpperCase() === "COMSPR.DAX");
  const assets = keys.flatMap(key => {
    const record = combatEffectKey.exec(key);
    return record ? [{ id: Number(record[2]), transform: record[3], key }] : [];
  });
  const entries = file && root ? parseDax("COMSPR.DAX", readGameFile(root, file)).entries : [];
  const effects = assets.flatMap(({ id, transform, key }) => {
    const entry = entries.find(entry => entry.id === id);
    if (!entry || !isPicture(entry.data)) return [];
    const { width, height, itemCount, pixels } = decodePicture(entry.data);
    return width === 24 && height === 24 && itemCount === 1
      ? [{ key, pixels: transformCombatEffectPixels(pixels, transform) }] : [];
  });
  return (frame: Frame, x: number, y: number, background: Uint8Array) => {
    let match: string | undefined;
    for (const { key, pixels } of effects) {
      let visible = false;
      const agrees = pixels.every((pixel, i) => {
        visible ||= pixel !== 0 && pixel !== background[i];
        return frame.get(x + i % 24, y + Math.floor(i / 24)) === (pixel || background[i]);
      });
      if (!agrees || !visible) continue;
      if (match) return;
      match = key;
    }
    return match;
  };
}

export function partyCombatPart(data: Uint8Array, height: 10 | 24) {
  if (!isPicture(data)) return;
  const picture = decodePicture(data);
  if (picture.width === 24 && (picture.height === height || (height === 10 && picture.height === 8)) &&
      picture.itemCount === 1) return picture.pixels;
}

export function loadCombatArtMatcher(keys: string[], root = keys.length ? findGameRoot() : null,
  materialKeys: ReadonlySet<string> = new Set()) {
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
  const fallback = buildCombatArtMatcher(global, root, materialKeys);
  const matchers = new Map<string, ReturnType<typeof buildCombatArtMatcher>>();
  return (frame: Frame, enhanced?: Frame, area?: number, cursor?: number, underlay?: Frame,
    iconEditor = false, aimCell?: [x: number, y: number]): CombatArtPlacement[] => {
    if (area === undefined || iconEditor) return fallback(frame, enhanced, underlay, iconEditor, aimCell);
    const areaScope = String(area);
    const battleScope = `${area}:${cursor?.toString(16).padStart(4, "0")}`;
    const scoped = scopes.get(areaScope);
    const battle = scopes.get(battleScope);
    if (!scoped && !battle) return fallback(frame, enhanced, underlay, false, aimCell);
    const scope = battle ? battleScope : areaScope;
    let matcher = matchers.get(scope);
    if (!matcher) {
      const sources = new Map<string, string>();
      for (const key of [...global, ...(scoped ?? []), ...(battle ?? [])]) {
        const monster = monsterCombatKey.exec(key);
        sources.set(monster ? `${monster[2]}:${monster[3]}` : key, key);
      }
      matcher = buildCombatArtMatcher([...sources.values()], root, materialKeys);
      matchers.set(scope, matcher);
    }
    return matcher(frame, enhanced, underlay, false, aimCell);
  };
}

function buildCombatArtMatcher(keys: string[], root: string | null, materialKeys: ReadonlySet<string>) {
  type Pose = {
    key: string; pattern: string; scoped: boolean; reflected: boolean; pixels: Uint8Array;
    width: number; foregroundProbe: number; party: boolean;
  };
  const registered: Pose[] = [];
  const palettePoses: { pose: Pose; opaqueSample: number }[] = [];
  // Sample the interior of a 24×24 party cel with a 30-bit silhouette.
  const paletteSamples = [4, 8, 12, 16, 20].flatMap(y => [3, 6, 9, 12, 15, 18].map(x => y * 24 + x));
  const sizes = new Map<string, { width: number; height: number }>();
  const register = (pixels: Uint8Array, key: string, reflected: boolean, width: number) => {
    const pattern = `${width}:${Buffer.from(pixels).toString("hex")}`;
    const chromatic = pixels.findIndex(color => color !== 0 && color !== 7 && color !== 8 && color !== 15);
    // A foreground color absent from grayscale terrain rejects empty windows early.
    const foregroundProbe = chromatic >= 0 ? chromatic : pixels.findIndex(Boolean);
    const pose = {
      key, pattern, scoped: key.startsWith("combat:area:"), reflected, pixels, width,
      foregroundProbe, party: partyCombatKey.test(key),
    };
    registered.push(pose);
    if (materialKeys.has(key)) {
      const opaqueSample = paletteSamples.reduce((bits, pixel, bit) =>
        pixels[pixel] ? bits | (1 << bit) : bits, 0);
      palettePoses.push({ pose, opaqueSample });
    }
  };
  const matchesProbe = (cell: Uint8Array, pose: Pose) =>
    pose.foregroundProbe < 0 || cell[pose.foregroundProbe] === pose.pixels[pose.foregroundProbe];
  const registerFacings = (pixels: Uint8Array, key: string, width = 24, height = 24, artReflected = false) => {
    sizes.set(`${width}:${height}`, { width, height });
    const reflected = Buffer.from(pixels);
    for (let y = 0; y < height; y++) reflected.subarray(y * width, (y + 1) * width).reverse();
    register(reflected, key, !artReflected, width);
    register(pixels, key, artReflected, width);
  };
  const selectedPose = (cell: Uint8Array, bevel: Uint8Array, width: number) => {
    // Aim draws white cursor pixels over the gray interior of the selection frame.
    if (cell[0] !== bevel[0] || cell[cell.length - 1] !== bevel[bevel.length - 1]) return;
    const battleSelection = bevel[0] === 15;
    let match: Pose | undefined;
    for (const pose of poses) {
      if (pose.width !== width || pose.pixels.length !== cell.length || !matchesProbe(cell, pose) ||
          !pose.pixels.every((color, index) => color ? cell[index] === color :
        cell[index] === bevel[index] || (battleSelection && bevel[index] === 7 && cell[index] === 15))) continue;
      if (match && match.key !== pose.key) return;
      match = pose;
    }
    return match;
  };
  const recoloredParty = (cell: Buffer, background: Uint8Array, selected: boolean) => {
    // A recolored pose must contribute at least one visible pixel.
    if (cell.equals(background)) return;
    const allowsAimCursor = selected && background[0] === 15;
    const matchesBackground = (pixel: number) => cell[pixel] === background[pixel] ||
      (allowsAimCursor && background[pixel] === 7 && cell[pixel] === 15);
    const requiredSample = paletteSamples.reduce((bits, pixel, bit) =>
      matchesBackground(pixel) ? bits : bits | (1 << bit), 0);
    let match: Pose | undefined;
    const remap = new Int8Array(16);
    for (const { pose, opaqueSample } of palettePoses) {
      if (requiredSample & ~opaqueSample) continue;
      remap.fill(-1);
      remap[0] = 0;
      let visible = false;
      const agrees = pose.pixels.every((index, pixel) => {
        const observed = cell[pixel]!;
        if (!index) return matchesBackground(pixel);
        if (observed !== background[pixel]) visible = true;
        if (!partyMaterialIndices.has(index)) return observed === index;
        if (remap[index] === -1) remap[index] = observed;
        return remap[index] === observed;
      });
      if (!agrees || !visible) continue;
      const palette = [...remap].map((color, original) => color < 0 ? original : color);
      if (palette.every((color, original) => color === original)) continue;
      const key = pose.key + ":palette:" + palette.map(color => color.toString(16)).join("");
      if (match && (match.key !== key || match.reflected !== pose.reflected)) return;
      match = { ...pose, key };
    }
    return match;
  };
  const exactAreaTerrainPose = (cell: Uint8Array, background?: Uint8Array) => {
    if (!background) return;
    let match: Pose | undefined;
    for (const pose of areaTerrainPoses) {
      if (!matchesProbe(cell, pose)) continue;
      let visible = false;
      let terrain = false;
      const agrees = pose.pixels.every((color, index) => {
        const underlay = background[index]!;
        visible ||= color !== 0 && color !== underlay;
        terrain ||= color === 0 && underlay !== 0;
        return cell[index] === (color || underlay);
      });
      if (!agrees || !visible || !terrain) continue;
      if (match && (match.key !== pose.key || match.reflected !== pose.reflected)) return;
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
      if (!matchesProbe(cell, pose)) continue;
      const matchesBackground = background && pose.pixels.every((color, index) => color || cell[index] === background[index]);
      if (pose.party && !matchesBackground) continue;
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
      const partyKeySet = new Set(partyKeys.map(({ key }) => key));
      for (const { key, head, body, palette } of partyKeys) {
        const face = heads.get(head);
        const torso = bodies.get(body);
        if (!face || !torso) continue;
        // Identical small heads share their art. The framebuffer cannot distinguish
        // them, so register one pose. The native matcher still uses the chosen head.
        const sourceHead = smallHeadAliasSources.get(head);
        if (sourceHead !== undefined) {
          const source = heads.get(sourceHead);
          const sourceKey = `combat:party:${sourceHead}:${body}${palette ? `:palette:${palette}` : ""}`;
          if (partyKeySet.has(sourceKey) && source?.length === face.length &&
              source.every((color, index) => color === face[index])) continue;
        }
        const pixels = torso.slice();
        // The guest combines the head and body bitplanes before applying the palette.
        for (const [index, color] of face.entries()) pixels[index] = pixels[index]! | color;
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
    if (key !== fallenCombatKey && !overlapsTerrain && !pose.party) continue;
    const extent = `${width}:${pixels.length}`;
    const matching = terrainPoses.get(extent) ?? [];
    matching.push(pose);
    terrainPoses.set(extent, matching);
  }
  const areaTerrainPoses = poses.filter(({ key, width, pixels }) => {
    const [, area, , , cursor] = monsterCombatKey.exec(key) ?? [];
    return area !== undefined && cursor === undefined && width === 24 && pixels.length === 24 * 24;
  });
  const patterns = new Map<string, Pose | null>();
  for (const pose of poses) {
    const previous = patterns.get(pose.pattern);
    patterns.set(pose.pattern, previous === undefined || previous?.key === pose.key ? pose : null);
  }
  function partialAimPose(cell: Uint8Array, width: number, background: Uint8Array, aimX: number, aimY: number) {
    let match: Pose | undefined;
    for (const pose of terrainPoses.get(`${width}:${cell.length}`) ?? []) {
      if (!matchesProbe(cell, pose)) continue;
      const agrees = pose.pixels.every((color, index) => {
        const pixel = cell[index];
        if (color) return pixel === color;
        const x = index % width - aimX;
        const y = Math.floor(index / width) - aimY;
        if (x < 0 || x >= 24 || y < 0 || y >= 24) return pixel === background[index];
        const bevel = combatHighlightPixel(x, y);
        return pixel === bevel || (bevel === 7 && pixel === 15);
      });
      if (!agrees) continue;
      if (match && match.key !== pose.key) return;
      match = pose;
    }
    return match;
  }
  function clippedPoses(frame: Frame, underlay: Frame, width: number, height: number, enhanced?: Frame,
    aimCell?: [x: number, y: number]) {
    const placements: CombatArtPlacement[] = [];
    const candidates = terrainPoses.get(`${width}:${width * height}`) ?? [];
    for (let y = 32 - height; y < 176; y += 24) {
      for (let x = 32 - width; x < 176; x += 24) {
        if (x >= 8 && y >= 8 && x + width <= 176 && y + height <= 176) continue;
        const left = Math.max(8, x), right = Math.min(176, x + width);
        const top = Math.max(8, y), bottom = Math.min(176, y + height);
        const aimed = aimCell && aimCell[0] >= left && aimCell[0] + 24 <= right &&
          aimCell[1] >= top && aimCell[1] + 24 <= bottom;
        let match: Pose | undefined;
        for (const pose of candidates) {
          let agrees = true;
          let visible = false;
          for (let row = top; row < bottom && agrees; row++) {
            for (let column = left; column < right && agrees; column++) {
              const background = underlay.get(column, row);
              const color = pose.pixels[(row - y) * width + column - x]!;
              const pixel = frame.get(column, row);
              const aimX = aimed ? column - aimCell[0] : -1;
              const aimY = aimed ? row - aimCell[1] : -1;
              if (color === 0 && aimX >= 0 && aimX < 24 && aimY >= 0 && aimY < 24) {
                const bevel = combatHighlightPixel(aimX, aimY);
                agrees = pixel === bevel || (bevel === 7 && pixel === 15);
              } else {
                agrees = pixel === (color || background);
              }
              visible ||= color !== 0 && color !== background;
            }
          }
          if (!agrees || !visible) continue;
          if (match && (match.key !== pose.key || match.reflected !== pose.reflected)) {
            match = undefined;
            break;
          }
          match = pose;
        }
        if (!match) continue;
        placements.push([x, y, match.key, match.reflected, false, width, height]);
        if (!enhanced) continue;
        for (let row = top; row < bottom; row++) {
          const start = row * frame.width + left;
          enhanced.pixels.set(underlay.pixels.subarray(start, start + right - left), start);
        }
      }
    }
    return placements;
  }
  return (frame: Frame, enhanced?: Frame, underlay?: Frame, iconEditor = false,
    aimCell?: [x: number, y: number]): CombatArtPlacement[] => {
    if (!patterns.size) return [];
    const placements: CombatArtPlacement[] = [];
    for (const { width, height } of sizes.values()) {
      if (!iconEditor && underlay && width * height > 24 * 24) {
        placements.push(...clippedPoses(frame, underlay, width, height, enhanced, aimCell));
      }
      const cell = Buffer.alloc(width * height);
      const background = underlay && (terrainPoses.has(`${width}:${cell.length}`) ||
        (width === 24 && height === 24 && areaTerrainPoses.length)) ? Buffer.alloc(cell.length) : undefined;
      // Large units span multiple guest selection squares.
      const bevel = Uint8Array.from({ length: cell.length }, (_, index) =>
        combatHighlightPixel((index % width) % 24, Math.floor(index / width) % 24));
      // The editor uses the same bevel as combat with gray trim and a black
      // interior around the unselected pose.
      const inactiveBevel = iconEditor ? bevel.map(color => color === 15 ? 7 : color === 7 ? 0 : color) : undefined;
      // The guest draws the combat field inside the left-hand panel.
      for (let y = 8; y + height <= 176; y += 8) {
        for (let x = 8; x + width <= 176; x += 8) {
          for (let row = 0; row < height; row++) {
            const start = (y + row) * frame.width + x;
            cell.set(frame.pixels.subarray(start, start + width), row * width);
          }
          const plain = patterns.get(`${width}:${cell.toString("hex")}`);
          const poseBevel = inactiveBevel && cell[0] === 7 ? inactiveBevel : bevel;
          const selected = plain === undefined ? selectedPose(cell, poseBevel, width) : undefined;
          if (plain === undefined && !selected && background && underlay) {
            for (let row = 0; row < height; row++) {
              const start = (y + row) * frame.width + x;
              background.set(underlay.pixels.subarray(start, start + width), row * width);
            }
          }
          const aimX = aimCell ? aimCell[0] - x : -1;
          const aimY = aimCell ? aimCell[1] - y : -1;
          // Manual Aim draws a single bevel over one cell of a large monster.
          const partialAim = plain === undefined && !selected && background && cell.length > 24 * 24 &&
            aimX >= 0 && aimX < width && aimX % 24 === 0 && aimY >= 0 && aimY < height && aimY % 24 === 0
            ? partialAimPose(cell, width, background, aimX, aimY) : undefined;
          const terrain = plain === undefined && !selected && !partialAim
            ? terrainPose(cell, width, background) : undefined;
          const colorSelection = plain === undefined && !selected && !terrain && width === 24 && height === 24 &&
            cell[0] === poseBevel[0] && cell[cell.length - 1] === poseBevel[cell.length - 1]
            ? recoloredParty(cell, poseBevel, true) : undefined;
          const colorTerrain = plain === undefined && !selected && !terrain && !colorSelection && width === 24 && height === 24 && background
            ? recoloredParty(cell, background, false) : undefined;
          const existing = plain ?? selected ?? partialAim ?? terrain ?? colorSelection ?? colorTerrain;
          const exactAreaTerrain = plain === undefined && !existing && areaTerrainPoses.length && width === 24 && height === 24
            ? exactAreaTerrainPose(cell, background) : undefined;
          const match = existing ?? exactAreaTerrain;
          if (!match) continue;
          // A standing unit can obscure a prop in the guest's terrain pass.
          // Restore the whole prop as its own layer when the visible pixels
          // agree with that backdrop and the complete prop bitmap matches.
          const highlighted = Boolean(selected ?? colorSelection);
          const restoreTerrain = (terrain ?? colorTerrain ?? exactAreaTerrain) && background &&
            match.pixels.every((color, index) => color || cell[index] === background[index]);
          const backdrop = restoreTerrain ? patterns.get(`${width}:${background.toString("hex")}`) : undefined;
          const prop = backdrop && randomCombatKey.test(backdrop.key) ? backdrop : undefined;
          if (prop) placements.push([x, y, prop.key, prop.reflected]);
          placements.push(width !== 24 || height !== 24 ? [x, y, match.key, match.reflected, highlighted, width, height]
            : highlighted ? [x, y, match.key, match.reflected, true] : [x, y, match.key, match.reflected]);
          if (!enhanced) continue;
          for (let row = 0; row < height; row++) {
            const start = (y + row) * enhanced.width + x;
            for (let column = 0; column < width; column++) {
              const index = row * width + column;
              enhanced.pixels[start + column] = highlighted
                ? match.pixels[index] ? poseBevel[index]! : cell[index]!
                : partialAim ? background![index]!
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
