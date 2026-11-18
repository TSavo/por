import { parseDax } from "../src/lib/dax.js";
import type { Frame } from "../src/lib/ega.js";
import { decodePicture, isPicture } from "../src/lib/picture.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

export type CombatArtPlacement = [x: number, y: number, key: string, reflected: boolean, highlighted?: boolean];

/** Palette index under a selected guest unit's transparent pixels. */
export function combatHighlightPixel(x: number, y: number): number {
  if (y === 0) return x < 23 ? 15 : 8;
  if (y === 23) return x === 0 ? 15 : 8;
  return x < 2 ? 15 : x >= 22 ? 8 : 7;
}

export function loadCombatArtMatcher(keys: string[]) {
  type Pose = { key: string; reflected: boolean; pixels: Uint8Array };
  const patterns = new Map<string, Pose | null>();
  const poses: Pose[] = [];
  const register = (pixels: Uint8Array, key: string, reflected: boolean) => {
    const pattern = Buffer.from(pixels).toString("hex");
    const previous = patterns.get(pattern);
    const pose = { key, reflected, pixels };
    patterns.set(pattern, previous === undefined || previous?.key === key ? pose : null);
    poses.push(pose);
  };
  const registerFacings = (pixels: Uint8Array, key: string) => {
    const reflected = Buffer.from(pixels);
    for (let y = 0; y < 24; y++) reflected.subarray(y * 24, (y + 1) * 24).reverse();
    register(reflected, key, true);
    register(pixels, key, false);
  };
  const bevel = Uint8Array.from({ length: 24 * 24 }, (_, index) =>
    combatHighlightPixel(index % 24, Math.floor(index / 24)));
  const selectedPose = (cell: Uint8Array) => {
    // Aim draws white cursor pixels over the gray interior of the selection frame.
    if (cell[0] !== 15 || cell[575] !== 8) return;
    let match: Pose | undefined;
    for (const pose of poses) {
      if (!pose.pixels.every((color, index) => color ? cell[index] === color :
        cell[index] === bevel[index] || (bevel[index] === 7 && cell[index] === 15))) continue;
      if (match && match.key !== pose.key) return;
      match = pose;
    }
    return match;
  };
  const root = keys.length ? findGameRoot() : null;
  if (root) {
    for (const file of listGameFiles(root)) {
      const archive = file.toUpperCase();
      if (!keys.some((key) => key.startsWith(`combat:${archive}:`))) continue;
      for (const { id, data } of parseDax(archive, readGameFile(root, file)).entries) {
        const key = `combat:${archive}:${id}`;
        if (!keys.includes(key) || !isPicture(data)) continue;
        const { width, height, itemCount, pixels } = decodePicture(data);
        if (width !== 24 || height !== 24 || itemCount !== 1 || !pixels.some(Boolean)) continue;
        registerFacings(pixels, key);
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
    const cell = Buffer.alloc(24 * 24);
    // The guest draws the combat field inside the left-hand panel.
    for (let y = 8; y + 24 <= 176; y += 8) {
      for (let x = 8; x + 24 <= 176; x += 8) {
        for (let row = 0; row < 24; row++) {
          const start = (y + row) * frame.width + x;
          cell.set(frame.pixels.subarray(start, start + 24), row * 24);
        }
        const plain = patterns.get(cell.toString("hex"));
        const selected = plain === undefined ? selectedPose(cell) : undefined;
        const match = plain ?? selected;
        if (!match) continue;
        placements.push(selected ? [x, y, match.key, match.reflected, true] : [x, y, match.key, match.reflected]);
        if (!enhanced) continue;
        for (let row = 0; row < 24; row++) {
          const start = (y + row) * enhanced.width + x;
          for (let column = 0; column < 24; column++) {
            const index = row * 24 + column;
            enhanced.pixels[start + column] = selected
              ? match.pixels[index] ? bevel[index]! : cell[index]!
              : 0;
          }
        }
      }
    }
    return placements;
  };
}
