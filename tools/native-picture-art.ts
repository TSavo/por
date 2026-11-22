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

interface PortraitPart {
  source: string;
  address: number;
}

type VisiblePicture = { pixels: Buffer } & ({ picture: PictureMember } | { head: string; body: string });

export function observeNativePictureArt(art: ReadonlySet<string>, records: readonly PictureRecord[], viewport: () => Buffer) {
  // The loader allocates a separate far pointer for each animation member.
  const members = new Map<number, PictureMember>();
  let visible: VisiblePicture | undefined;
  let head: PortraitPart | undefined;
  let body: PortraitPart | undefined;
  const aliases = new Map<string, string[]>();
  const equivalent = new Map<string, string[]>();
  for (const record of records) {
    const family = /^(PIC|HEAD|BODY)[1-8]\.DAX$/.exec(record.file)?.[1];
    if (!family || !record.pictures.length || !record.pictures.every(p => p.width === 88)) continue;
    // The original stores some identical members and portrait pieces in different banks.
    const signature = JSON.stringify([family, record.pictures.map(picture =>
      [picture.selector, picture.height, picture.x, picture.y, picture.frameHashes])]);
    const source = `${record.file}:${record.block}`;
    let group = equivalent.get(signature);
    if (!group) equivalent.set(signature, group = []);
    group.push(source);
    aliases.set(source, group);
  }

  const sources = (source: string) => [source, ...(aliases.get(source) ?? []).filter(alias => alias !== source)];
  const partAddress = (cpu: Cpu, slot: number) => {
    const offset = cpu.read16(cpu.ds, slot), segment = cpu.read16(cpu.ds, slot + 2);
    return offset || segment ? pictureAddress(segment, offset) : undefined;
  };

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
      if (visible && "picture" in visible && members.get(address) === visible.picture) visible = undefined;
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
    partLoaded(cpu: Cpu, isHead: boolean) {
      const slot = isHead ? data.portraitHead : data.portraitBody;
      const address = partAddress(cpu, slot);
      const bank = cpu.read8(cpu.ds, data.eclArchive);
      const id = cpu.read8(cpu.ss, (cpu.bp + (isHead ? 8 : 6)) & 0xffff);
      const part = address !== undefined && bank >= 1 && bank <= 8
        ? { address, source: `${isHead ? "HEAD" : "BODY"}${bank}.DAX:${id}` } : undefined;
      if (isHead) head = part;
      else body = part;
    },
    composed(cpu: Cpu) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.bp + offset) & 0xffff);
      if (!arg(6) || arg(8) !== 3 || arg(10) !== 3) return;
      visible = head && body && head.address === partAddress(cpu, data.portraitHead) &&
        body.address === partAddress(cpu, data.portraitBody)
        ? { head: head.source, body: body.source, pixels: viewport() } : undefined;
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
      if ("head" in visible) {
        const heads = sources(visible.head), bodies = sources(visible.body);
        const pairs = heads.flatMap(head => bodies.map(body => `${head}:${body}`));
        for (const scope of scopes) {
          const found = pairs.map(pair => `portrait:${scope}${pair}`).find(key => art.has(key));
          if (found) return found;
        }
        return;
      }
      const { archive, block, member } = visible.picture;
      for (const scope of scopes) {
        for (const alias of sources(`${archive}:${block}`)) {
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
