import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export const portraitKey = /^portrait:(PIC\d+\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
const left = 24;
const top = 24;
const size = 88;

export function loadPortraitArt(keys: string[]) {
  const root = keys.length ? findGameRoot() : null;
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const patterns = new Map<string, string | null>();
  for (const key of keys) {
    const match = portraitKey.exec(key);
    if (!root || !match) continue;
    const [, archive, block, member, frame] = match;
    const file = files.get(archive!);
    if (!file) continue;
    const entry = parseDax(file, readGameFile(root, file)).entries.find(({ id }) => id === Number(block));
    const record = entry && pictureMembers(entry.data)[Number(member)];
    if (!record) continue;
    const picture = decodePicture(record.data);
    if (picture.width !== size || picture.height !== size || Number(frame) >= picture.itemCount) continue;
    const pixels = frameSlice(picture, Number(frame));
    if (!pixels.some(Boolean)) continue;
    const signature = Buffer.from(pixels).toString("base64");
    patterns.set(signature, patterns.has(signature) ? null : key);
  }
  return (screen: Frame) => {
    if (!patterns.size) return;
    const pixels = Buffer.alloc(size * size);
    for (let y = 0; y < size; y++) {
      const offset = (top + y) * screen.width + left;
      pixels.set(screen.pixels.subarray(offset, offset + size), y * size);
    }
    return patterns.get(pixels.toString("base64")) ?? undefined;
  };
}
