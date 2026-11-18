import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, frameSlice, pictureMembers } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const pictureKey = /^portrait:(PIC\d+\.DAX):(\d{1,3}):(\d{1,3}):(\d{1,3})$/;
export const compositePortraitKey = /^portrait:(HEAD\d+\.DAX):(\d{1,3}):(BODY\d+\.DAX):(\d{1,3})$/;
export const portraitKey = /^(?:portrait:PIC\d+\.DAX:\d{1,3}:\d{1,3}:\d{1,3}|portrait:HEAD\d+\.DAX:\d{1,3}:BODY\d+\.DAX:\d{1,3})$/;
const left = 24;
const top = 24;
const size = 88;

export function loadPortraitArt(keys: string[]) {
  const root = keys.length ? findGameRoot() : null;
  const files = new Map(root ? listGameFiles(root).map((file) => [file.toUpperCase(), file]) : []);
  const patterns = new Map<string, string | null>();
  const archiveCache = new Map<string, ReturnType<typeof parseDax>>();
  function entry(archive: string, id: string) {
    const file = files.get(archive);
    if (!root || !file) return;
    let data = archiveCache.get(file);
    if (!data) {
      data = parseDax(file, readGameFile(root, file));
      archiveCache.set(file, data);
    }
    return data.entries.find(block => block.id === Number(id));
  }
  function register(pixels: Uint8Array, key: string) {
    if (!pixels.some(Boolean)) return;
    const signature = Buffer.from(pixels).toString("base64");
    patterns.set(signature, patterns.has(signature) ? null : key);
  }
  for (const key of keys) {
    const composite = compositePortraitKey.exec(key);
    if (composite) {
      const [, headArchive, headId, bodyArchive, bodyId] = composite;
      const head = entry(headArchive, headId);
      const body = entry(bodyArchive, bodyId);
      if (!head || !body) continue;
      const [top, bottom] = [head, body].map(part => decodePicture(part.data));
      if (top.width !== size || bottom.width !== size || top.height !== 40 || bottom.height !== 48 ||
          top.itemCount !== 1 || bottom.itemCount !== 1) continue;
      register(Buffer.concat([frameSlice(top, 0), frameSlice(bottom, 0)]), key);
      continue;
    }
    const match = pictureKey.exec(key);
    if (!match) continue;
    const [, archive, block, member, frame] = match;
    const source = entry(archive, block);
    const record = source && pictureMembers(source.data)[Number(member)];
    if (!record) continue;
    const picture = decodePicture(record.data);
    if (picture.width !== size || picture.height !== size || Number(frame) >= picture.itemCount) continue;
    register(frameSlice(picture, Number(frame)), key);
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
