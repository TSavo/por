import { parseDax } from "../src/lib/dax.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export const encounterKey = /^encounter:(?:area:(\d{1,3}):(?:ecl:([a-f0-9]{4}):(?:caller:([a-f0-9]{4}):)?)?)?(SPRIT[1-8]\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
const legacyAnchors = new Map<string, EncounterAnchor>([
  ["encounter:SPRIT2.DAX:0:0:0", { area: 20, x: 48, y: 32, width: 40, height: 80 }],
  ["encounter:SPRIT2.DAX:0:1:0", { area: 20, x: 56, y: 32, width: 24, height: 65 }],
  ["encounter:SPRIT2.DAX:0:2:0", { area: 20, x: 56, y: 32, width: 24, height: 57 }],
]);
export type EncounterPlacement = [x: number, y: number, key: string, width: number, height: number];

export function encounterAnchor(key: string, configured?: EncounterAnchor) {
  const anchor = configured ?? legacyAnchors.get(key);
  const match = encounterKey.exec(key);
  if (!match || !anchor) return;
  const { area, x, y, width, height, flatBackground } = anchor;
  if ([area, x, y, width, height].every(Number.isInteger) && area >= 0 && area <= 255 &&
      (match[1] === undefined || Number(match[1]) === area) &&
      x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 320 && y + height <= 200 &&
      (flatBackground === undefined || (Array.isArray(flatBackground) && flatBackground.length === 2 &&
        flatBackground.every(index => Number.isInteger(index) && index >= 0 && index < 16)))) return anchor;
}

export function encounterPixels(archive: ReturnType<typeof parseDax>, key: string, anchor: EncounterAnchor) {
  const match = encounterKey.exec(key);
  if (!match) return;
  const [, , , , , blockIndex, memberIndex, frameIndex] = match;
  const block = archive.entries.find(({ id }) => id === Number(blockIndex));
  const member = block && pictureMembers(block.data)[Number(memberIndex)];
  if (!member) return;
  const picture = decodePicture(member.data);
  if (picture.width !== anchor.width || picture.height !== anchor.height || Number(frameIndex) >= picture.itemCount) return;
  const pixels = frameSlice(picture, Number(frameIndex));
  if (pixels.some(Boolean)) return pixels;
}

export function loadEncounterArt(placements: Record<string, EncounterAnchor>,
  traceUnmatchedScope?: (key: string, anchor: EncounterAnchor, cursor: number) => void) {
  const root = Object.keys(placements).length ? findGameRoot() : null;
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const archives = new Map<string, ReturnType<typeof parseDax>>();
  const patterns = [...new Map([...legacyAnchors, ...Object.entries(placements)])].flatMap(([key, anchor]) => {
    const match = encounterKey.exec(key);
    if (!root || !match) return [];
    const [, , cursor, caller, name] = match;
    const file = files.get(name!);
    if (!file) return [];
    let archive = archives.get(file);
    if (!archive) {
      archive = parseDax(file, readGameFile(root, file));
      archives.set(file, archive);
    }
    const pixels = encounterPixels(archive, key, anchor);
    return pixels ? [{
      key, anchor, pixels,
      cursor: cursor === undefined ? undefined : Number.parseInt(cursor, 16),
      caller: caller === undefined ? undefined : Number.parseInt(caller, 16),
    }] : [];
  }).sort((a, b) => Number(b.caller !== undefined) - Number(a.caller !== undefined) ||
    Number(b.cursor !== undefined) - Number(a.cursor !== undefined));
  let background: Uint8Array | undefined;
  let backgroundArea: number | undefined;

  return (screen: Frame, enhanced: Frame, area: number | undefined, rememberBackground = true, cursor?: number,
    nativeDraws: readonly (Uint8Array | undefined)[] = [], caller?: number): EncounterPlacement | undefined => {
    if (rememberBackground && area !== backgroundArea) background = undefined;
    if (rememberBackground) backgroundArea = area;
    if (area === undefined) {
      if (rememberBackground) background = undefined;
      return;
    }
    let unmatchedScope: { key: string; anchor: EncounterAnchor } | undefined;
    for (const { key, anchor, pixels, cursor: expectedCursor, caller: expectedCaller } of patterns) {
      if (anchor.area !== area || (expectedCaller !== undefined && expectedCaller !== caller)) continue;
      const scopeMatches = expectedCursor === undefined || expectedCursor === cursor;
      if (!scopeMatches && (!traceUnmatchedScope || cursor === undefined || unmatchedScope)) continue;
      const { x, y, width, height } = anchor;
      const address = (i: number) => (y + Math.floor(i / width)) * screen.width + x + i % width;
      // The perspective blitter skips index zero and draws light magenta as black.
      if (!pixels.every((color, i) => !color || screen.pixels[address(i)] === (color === 13 ? 0 : color))) continue;
      if (!scopeMatches) {
        unmatchedScope = { key, anchor };
        continue;
      }
      if (!Object.hasOwn(placements, key)) return;
      const clean = area === backgroundArea && background && pixels.every((color, i) => color || screen.pixels[address(i)] === background![address(i)])
        ? background : undefined;
      // An ECL event can draw new scenery and paint an actor before the
      // next input frame. Use a captured native draw only when every
      // difference in the viewport lies under the actor's opaque pixels.
      const viewportIndex = (px: number, py: number) => (py - 24) * 88 + px - 24;
      const nativeClean = !clean && x >= 24 && y >= 24 && x + width <= 112 && y + height <= 112 &&
        nativeDraws.find(draw => {
          if (draw?.length !== 88 * 88) return false;
          let changed = false;
          for (let i = 0; i < draw.length; i++) {
            const px = 24 + i % 88;
            const py = 24 + Math.floor(i / 88);
            if (draw[i] === screen.get(px, py)) continue;
            if (px < x || py < y || px >= x + width || py >= y + height ||
                !pixels[(py - y) * width + px - x]) return false;
            changed = true;
          }
          return changed;
        });
      // Keep the last clean view across successive distance frames.
      if (clean) {
        for (const [i, color] of pixels.entries()) {
          if (color) enhanced.pixels[address(i)] = clean[address(i)]!;
        }
      } else if (nativeClean) {
        for (const [i, color] of pixels.entries()) {
          if (color) enhanced.pixels[address(i)] = nativeClean[viewportIndex(x + i % width, y + Math.floor(i / width))]!;
        }
      } else if (anchor.flatBackground) {
        // Some conversations draw the room and actor together. For explicitly
        // mapped flat scenery, restore the colors on either side of each row.
        const rows: { first: number; last: number; left: number; right: number }[] = [];
        for (let row = 0; row < height; row++) {
          const base = row * width;
          const line = pixels.subarray(base, base + width);
          const first = line.findIndex(Boolean);
          if (first < 0) continue;
          let last = width - 1;
          while (!line[last]) last--;
          if (first === 0 || last === width - 1) return;
          const left = screen.pixels[address(base + first - 1)]!;
          const right = screen.pixels[address(base + last + 1)]!;
          if (!anchor.flatBackground.includes(left) || !anchor.flatBackground.includes(right)) return;
          rows.push({ first: base + first, last: base + last, left, right });
        }
        for (const { first, last, left, right } of rows) {
          for (let i = first; i <= last; i++) {
            if (pixels[i]) enhanced.pixels[address(i)] = i - first <= last - i ? left : right;
          }
        }
      } else {
        return;
      }
      return [x, y, key, width, height];
    }
    if (unmatchedScope && cursor !== undefined) {
      traceUnmatchedScope?.(unmatchedScope.key, unmatchedScope.anchor, cursor);
    }
    if (rememberBackground) background = screen.pixels.slice();
  };
}
