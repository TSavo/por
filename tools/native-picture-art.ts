import type { Cpu } from "../src/cpu/machine.js";
import type { Frame } from "../src/lib/ega.js";
import { data } from "../src/runtime/bindings.js";
import type { PictureRecord } from "../src/runtime/game-data.js";
import { usesPortraitDelta, type CharacterSheetPart } from "./portrait-art.js";

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

const sheetX = 224, sheetY = 8, pictureSize = 88, headHeight = 40;

function sheetPixels(frame: Frame) {
  const pixels = Buffer.alloc(pictureSize * pictureSize);
  for (let row = 0; row < pictureSize; row++) {
    const start = (sheetY + row) * frame.width + sheetX;
    pixels.set(frame.pixels.subarray(start, start + pictureSize), row * pictureSize);
  }
  return pixels;
}

export function observeNativePictureArt(art: ReadonlySet<string>, sheetArt: ReadonlySet<string>,
  records: readonly PictureRecord[], viewport: () => Buffer) {
  // The loader allocates a separate far pointer for each animation member.
  const members = new Map<number, PictureMember>();
  let visible: VisiblePicture | undefined;
  let sheet: { head: string; body: string; pixels: Buffer } | undefined;
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
    composed(cpu: Cpu, frame: Frame) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.bp + offset) & 0xffff);
      const row = arg(8), column = arg(10);
      const portraitPanel = row === 3 && column === 3;
      const sheetPanel = row === 1 && column === 28;
      if (!arg(6) || (!portraitPanel && !sheetPanel)) return;
      const parts = head && body && head.address === partAddress(cpu, data.portraitHead) &&
        body.address === partAddress(cpu, data.portraitBody) ? { head: head.source, body: body.source } : undefined;
      if (sheetPanel) sheet = parts && { ...parts, pixels: sheetPixels(frame) };
      else visible = parts && { ...parts, pixels: viewport() };
    },
    clear() {
      visible = undefined;
    },
    matchSheet(frame: Frame): CharacterSheetPart[] | undefined {
      if (!sheet) return;
      if (!sheet.pixels.equals(sheetPixels(frame))) {
        sheet = undefined;
        return;
      }
      const key = (source: string) => sources(source).map(id => `character-sheet:${id}`).find(id => sheetArt.has(id));
      const headKey = key(sheet.head), bodyKey = key(sheet.body);
      if (headKey && bodyKey) return [
        [sheetX, sheetY, headKey, pictureSize, headHeight],
        [sheetX, sheetY + headHeight, bodyKey, pictureSize, pictureSize - headHeight],
      ];
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
