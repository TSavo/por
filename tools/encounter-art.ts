import { parseDax } from "../src/lib/dax.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export const encounterKey = /^encounter:(?:area:(\d{1,3}):)?(SPRIT[1-8]\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
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
  const [, , , blockIndex, memberIndex, frameIndex] = match;
  const block = archive.entries.find(({ id }) => id === Number(blockIndex));
  const member = block && pictureMembers(block.data)[Number(memberIndex)];
  if (!member) return;
  const picture = decodePicture(member.data);
  if (picture.width !== anchor.width || picture.height !== anchor.height || Number(frameIndex) >= picture.itemCount) return;
  const pixels = frameSlice(picture, Number(frameIndex));
  if (pixels.some(Boolean)) return pixels;
}

export function loadEncounterArt(placements: Record<string, EncounterAnchor>) {
  const root = Object.keys(placements).length ? findGameRoot() : null;
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const archives = new Map<string, ReturnType<typeof parseDax>>();
  const patterns = [...new Map([...legacyAnchors, ...Object.entries(placements)])].flatMap(([key, anchor]) => {
    const match = encounterKey.exec(key);
    if (!root || !match) return [];
    const [, , name] = match;
    const file = files.get(name!);
    if (!file) return [];
    let archive = archives.get(file);
    if (!archive) {
      archive = parseDax(file, readGameFile(root, file));
      archives.set(file, archive);
    }
    const pixels = encounterPixels(archive, key, anchor);
    return pixels ? [{ key, anchor, pixels }] : [];
  });
  let background: Uint8Array | undefined;
  let backgroundArea: number | undefined;

  return (screen: Frame, enhanced: Frame, area: number | undefined): EncounterPlacement | undefined => {
    if (area !== backgroundArea) background = undefined;
    backgroundArea = area;
    if (area === undefined) {
      background = undefined;
      return;
    }
    for (const { key, anchor, pixels } of patterns) {
      if (anchor.area !== area) continue;
      const { x, y, width, height } = anchor;
      const address = (i: number) => (y + Math.floor(i / width)) * screen.width + x + i % width;
      // The perspective blitter skips index zero and draws light magenta as black.
      if (!pixels.every((color, i) => !color || screen.pixels[address(i)] === (color === 13 ? 0 : color))) continue;
      if (!Object.hasOwn(placements, key)) return;
      const clean = background && pixels.every((color, i) => color || screen.pixels[address(i)] === background![address(i)])
        ? background : undefined;
      // Keep the last clean view across successive distance frames.
      if (clean) {
        for (const [i, color] of pixels.entries()) {
          if (color) enhanced.pixels[address(i)] = clean[address(i)]!;
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
    background = screen.pixels.slice();
  };
}
