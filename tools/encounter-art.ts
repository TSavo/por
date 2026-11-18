import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export const encounterAnchors = new Map([
  ["encounter:SPRIT2.DAX:0:0:0", { x: 48, y: 32, width: 40, height: 80 }],
  ["encounter:SPRIT2.DAX:0:1:0", { x: 56, y: 32, width: 24, height: 65 }],
  ["encounter:SPRIT2.DAX:0:2:0", { x: 56, y: 32, width: 24, height: 57 }],
]);
export type EncounterPlacement = [x: number, y: number, key: string, width: number, height: number];

export function loadEncounterArt(keys: string[]) {
  const root = keys.length ? findGameRoot() : null;
  const archive = root && listGameFiles(root).find((name) => name.toUpperCase() === "SPRIT2.DAX");
  const block = root && archive && parseDax(archive, readGameFile(root, archive)).entries.find(({ id }) => id === 0);
  if (!block) return () => undefined;
  const members = pictureMembers(block.data);
  const patterns = [...encounterAnchors].flatMap(([key, anchor], index) => {
    const member = members[index];
    if (!member) return [];
    const picture = decodePicture(member.data);
    if (picture.width !== anchor.width || picture.height !== anchor.height) return [];
    return [{ key, anchor, pixels: frameSlice(picture, 0) }];
  });
  let background: Uint8Array | undefined;

  return (screen: Frame, enhanced: Frame, visible: boolean): EncounterPlacement | undefined => {
    if (!visible) {
      background = undefined;
      return;
    }
    for (const { key, anchor: { x, y, width, height }, pixels } of patterns) {
      const address = (i: number) => (y + Math.floor(i / width)) * screen.width + x + i % width;
      // The perspective blitter skips index zero and draws light magenta as black.
      if (!pixels.every((color, i) => !color || screen.pixels[address(i)] === (color === 13 ? 0 : color))) continue;
      const clean = background;
      // Keep the last clean view across successive distance frames.
      if (!keys.includes(key) || !clean ||
          !pixels.every((color, i) => color || screen.pixels[address(i)] === clean[address(i)])) return;
      for (const [i, color] of pixels.entries()) {
        if (color) enhanced.pixels[address(i)] = clean[address(i)]!;
      }
      return [x, y, key, width, height];
    }
    background = screen.pixels.slice();
  };
}
