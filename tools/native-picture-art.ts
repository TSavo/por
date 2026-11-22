import type { Cpu } from "../src/cpu/machine.js";
import { data } from "../src/runtime/bindings.js";
import type { PictureRecord } from "../src/runtime/game-data.js";
import { usesPortraitDelta } from "./portrait-art.js";

const pictureAddress = (segment: number, offset: number) => ((segment << 4) + offset) & 0xfffff;

interface PictureMember {
  archive: string;
  block: number;
  member: number;
}

export function observeNativePictureArt(art: ReadonlySet<string>, records: readonly PictureRecord[], viewport: () => Buffer) {
  // The loader allocates a separate far pointer for each animation member.
  const members = new Map<number, PictureMember>();
  let visible: { picture: PictureMember; pixels: Buffer } | undefined;
  const aliases = new Map<string, string[]>();
  const equivalent = new Map<string, string[]>();
  for (const record of records) {
    if (!/^PIC[1-8]\.DAX$/.test(record.file) ||
        !record.pictures.length || !record.pictures.every(p => p.width === 88 && p.height === 88)) continue;
    // Preserve exact aliases such as the treasure animation duplicated across banks.
    const signature = JSON.stringify(record.pictures.map(picture =>
      [picture.selector, picture.x, picture.y, picture.frameHashes]));
    const source = `${record.file}:${record.block}`;
    let group = equivalent.get(signature);
    if (!group) equivalent.set(signature, group = []);
    group.push(source);
    aliases.set(source, group);
  }

  return {
    load(cpu: Cpu) {
      const word = (displacement: number) => cpu.read16(cpu.ss, (cpu.bp + displacement) & 0xffff);
      const offset = cpu.read16(cpu.ss, (cpu.sp + 4) & 0xffff);
      const segment = cpu.read16(cpu.ss, (cpu.sp + 6) & 0xffff);
      const address = pictureAddress(segment, offset);
      members.delete(address);
      const nameOffset = word(14), nameSegment = word(16);
      if (cpu.read8(nameSegment, nameOffset) !== 3) return;
      const name = String.fromCharCode(
        cpu.read8(nameSegment, nameOffset + 1),
        cpu.read8(nameSegment, nameOffset + 2),
        cpu.read8(nameSegment, nameOffset + 3),
      );
      if (name !== "PIC") return;
      const bank = cpu.read8(cpu.ds, data.eclArchive);
      if (bank < 1 || bank > 8) return;
      const member = (word(-0x12) & 0xff) - 1;
      if (member >= 0) members.set(address, { archive: `PIC${bank}.DAX`, block: word(12) & 0xff, member });
    },
    release(cpu: Cpu) {
      const offset = cpu.read16(cpu.ss, (cpu.sp + 4) & 0xffff);
      const segment = cpu.read16(cpu.ss, (cpu.sp + 6) & 0xffff);
      const address = pictureAddress(cpu.read16(segment, offset + 2), cpu.read16(segment, offset));
      if (visible && members.get(address) === visible.picture) visible = undefined;
      members.delete(address);
    },
    presented(cpu: Cpu) {
      const word = (displacement: number) => cpu.read16(cpu.ss, (cpu.bp + displacement) & 0xffff);
      const offset = word(6), segment = word(8);
      if (!offset && !segment) return;
      // The browser's portrait layer occupies the original 88×88 picture panel.
      const picture = word(12) === 3 && word(14) === 3 &&
        cpu.read16(segment, offset) === 88 && cpu.read16(segment, offset + 2) === 11
        ? members.get(pictureAddress(segment, offset)) : undefined;
      visible = picture ? { picture, pixels: viewport() } : undefined;
    },
    clear() {
      visible = undefined;
    },
    match(area?: number, cursor?: number, caller?: number) {
      if (!visible) return;
      if (!visible.pixels.equals(viewport())) {
        visible = undefined;
        return;
      }
      const { archive, block, member } = visible.picture;
      const scopes: string[] = [];
      if (area !== undefined) {
        const areaScope = `area:${area}:`;
        if (cursor !== undefined) {
          const cursorScope = `${areaScope}ecl:${cursor.toString(16).padStart(4, "0")}:`;
          if (caller !== undefined) scopes.push(`${cursorScope}caller:${caller.toString(16).padStart(4, "0")}:`);
          scopes.push(cursorScope);
        }
        scopes.push(areaScope);
      }
      scopes.push("");
      const source = `${archive}:${block}`;
      const sources = [source, ...(aliases.get(source) ?? []).filter(alias => alias !== source)];
      for (const scope of scopes) {
        for (const alias of sources) {
          const base = `portrait:${scope}${alias}:`;
          const exact = `${base}${member}:0`;
          const first = `${base}0:0`;
          if (art.has(exact)) return exact;
          if (member && art.has(first) && usesPortraitDelta(first)) return first;
        }
      }
    },
  };
}
