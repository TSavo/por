import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export const nearKoboldKey = "encounter:SPRIT2.DAX:0:0:0";
export const nearKoboldAnchor = { x: 48, y: 32, width: 40, height: 80 };

export function loadEncounterArt(enabled: boolean) {
  const root = enabled ? findGameRoot() : null;
  const archive = root && listGameFiles(root).find((name) => name.toUpperCase() === "SPRIT2.DAX");
  const block = root && archive && parseDax(archive, readGameFile(root, archive)).entries.find(({ id }) => id === 0);
  const member = block && pictureMembers(block.data)[0];
  if (!member) return () => undefined;
  const picture = decodePicture(member.data);
  const { x, y, width, height } = nearKoboldAnchor;
  if (picture.width !== width || picture.height !== height) return () => undefined;
  const pixels = frameSlice(picture, 0);
  let background: Uint8Array | undefined;

  return (screen: Frame, enhanced: Frame, visible: boolean) => {
    if (!visible) {
      background = undefined;
      return;
    }
    const current = new Uint8Array(width * height);
    for (let row = 0; row < height; row++) {
      const start = (y + row) * screen.width + x;
      current.set(screen.pixels.subarray(start, start + width), row * width);
    }
    // The perspective blitter skips index zero and draws light magenta as black.
    const matches = pixels.every((color, i) => !color || current[i] === (color === 13 ? 0 : color));
    if (!matches) {
      background = current;
      return;
    }
    // Use the prior guest background only when the transparent pixels agree.
    const clean = background;
    if (!clean || !pixels.every((color, i) => color || current[i] === clean[i])) return;
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const i = row * width + col;
        if (pixels[i]) enhanced.pixels[(y + row) * screen.width + x + col] = clean[i]!;
      }
    }
    return nearKoboldKey;
  };
}
