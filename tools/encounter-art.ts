import { parseDax } from "../src/lib/dax.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const encounterKey = /^encounter:(SPRIT[1-8]\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
const legacyAnchors = new Map([
  ["encounter:SPRIT2.DAX:0:0:0", { area: 20, x: 48, y: 32, width: 40, height: 80 }],
  ["encounter:SPRIT2.DAX:0:1:0", { area: 20, x: 56, y: 32, width: 24, height: 65 }],
  ["encounter:SPRIT2.DAX:0:2:0", { area: 20, x: 56, y: 32, width: 24, height: 57 }],
]);
export type EncounterPlacement = [x: number, y: number, key: string, width: number, height: number];

export function encounterAnchor(key: string, configured?: EncounterAnchor) {
  const anchor = configured ?? legacyAnchors.get(key);
  if (!encounterKey.test(key) || !anchor) return;
  const { area, x, y, width, height } = anchor;
  if ([area, x, y, width, height].every(Number.isInteger) && area >= 0 && area <= 255 &&
      x >= 0 && y >= 0 && width > 0 && height > 0 && x + width <= 320 && y + height <= 200) return anchor;
}

export function loadEncounterArt(placements: Record<string, EncounterAnchor>) {
  const root = Object.keys(placements).length ? findGameRoot() : null;
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const archives = new Map<string, ReturnType<typeof parseDax>>();
  const patterns = [...new Map([...legacyAnchors, ...Object.entries(placements)])].flatMap(([key, anchor]) => {
    const match = encounterKey.exec(key);
    if (!root || !match) return [];
    const [, name, blockIndex, memberIndex, frameIndex] = match;
    const file = files.get(name!);
    if (!file) return [];
    let archive = archives.get(file);
    if (!archive) {
      archive = parseDax(file, readGameFile(root, file));
      archives.set(file, archive);
    }
    const block = archive.entries.find(({ id }) => id === Number(blockIndex));
    const member = block && pictureMembers(block.data)[Number(memberIndex)];
    if (!member) return [];
    const picture = decodePicture(member.data);
    if (picture.width !== anchor.width || picture.height !== anchor.height || Number(frameIndex) >= picture.itemCount) return [];
    const pixels = frameSlice(picture, Number(frameIndex));
    return pixels.some(Boolean) ? [{ key, anchor, pixels }] : [];
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
      const clean = background;
      // Keep the last clean view across successive distance frames.
      if (!Object.hasOwn(placements, key) || !clean ||
          !pixels.every((color, i) => color || screen.pixels[address(i)] === clean[address(i)])) return;
      for (const [i, color] of pixels.entries()) {
        if (color) enhanced.pixels[address(i)] = clean[address(i)]!;
      }
      return [x, y, key, width, height];
    }
    background = screen.pixels.slice();
  };
}
