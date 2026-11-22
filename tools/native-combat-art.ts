import type { Cpu } from "../src/cpu/machine.js";
import type { Frame } from "../src/lib/ega.js";
import { data, segment as unit } from "../src/runtime/bindings.js";
import { isCombatExtent, type CombatArtPlacement } from "./combat-art.js";
import { findGameRoot, portGame } from "./gamedata.js";

const defaultPalette = "0123456789abcdef";

function partyPose(cpu: Cpu, slot: number, pose: number, art: ReadonlySet<string>, materialKeys: ReadonlySet<string>) {
  let segment = unit.data, pointer = data.combatRoster;
  for (let count = 0; count < 72; count++) {
    const offset = cpu.read16(segment, pointer);
    segment = cpu.read16(segment, pointer + 2);
    if (!offset && !segment) return;
    pointer = offset + 0x104;
    const record = (field: number) => cpu.read8(segment, offset + field);
    if (record(0x10e) !== 0 || record(0xbf) !== slot) continue;

    // The DOS loader adds 64 to both blocks for the tall icon archive.
    const size = cpu.read8(unit.data, data.partyIconSizeSuffix + record(0xc0));
    if (size !== 0x53 && size !== 0x54) return;
    const tall = size === 0x54 ? 64 : 0;
    const base = `combat:party:${record(0xbd) + tall}:${record(0xbe) + tall + pose * 128}`;
    const palette = [...defaultPalette];
    for (let pair = 0; pair < 6; pair++) {
      const index = cpu.read8(unit.data, data.partyIconPaletteIndices + pair);
      const colors = record(0xc1 + pair);
      palette[index] = (colors & 15).toString(16);
      palette[index + 8] = (colors >> 4).toString(16);
    }
    const remap = palette.join("");
    if (remap !== defaultPalette) {
      const recolored = `${base}:palette:${remap}`;
      if (art.has(recolored) || (art.has(base) && materialKeys.has(base))) return recolored;
    }
    return art.has(base) ? base : undefined;
  }
}

export function observeNativeCombatArt(art: ReadonlySet<string>, materialKeys: ReadonlySet<string>) {
  // The same cel can be stored in several archives. The original framebuffer matcher
  // sees the same pixels for each copy. Preserve that equivalence within a battle.
  const poseGroups = new Map<string, string[]>();
  const equivalentPoses = new Map<string, string[]>();
  const root = findGameRoot();
  for (const { file, block, pictures } of root ? portGame(root).data.pictures : []) {
    const [picture] = pictures;
    if (!/^(?:CPIC[1-8]|ICON)\.DAX$/.test(file) || !picture || pictures.length !== 1 || picture.frameHashes.length !== 1) continue;
    const signature = `${picture.width}:${picture.height}:${picture.frameHashes[0]}`;
    const group = poseGroups.get(signature) ?? [];
    const source = `${file}:${block}`;
    group.push(source);
    poseGroups.set(signature, group);
    equivalentPoses.set(source, group);
  }

  function monsterArt(source: string, area?: number, cursor?: number) {
    const areaPrefix = `combat:area:${area}:`;
    const battleSuffix = `:ecl:${cursor?.toString(16).padStart(4, "0")}`;
    for (const suffix of cursor === undefined ? [""] : [battleSuffix, ""]) {
      const direct = areaPrefix + source + suffix;
      if (art.has(direct)) return direct;
      const equivalents = (equivalentPoses.get(source) ?? [])
        .map(other => areaPrefix + other + suffix).filter(key => art.has(key));
      if (equivalents.length === 1) return equivalents[0];
    }
    const global = `combat:${source}`;
    return art.has(global) ? global : undefined;
  }
  const slots = new Map<number, { archive: string; ready: number }>();
  const draws = new Map<string, {
    x: number; y: number; width: number; height: number; monster?: string; party?: string; reflected: boolean;
  }>();

  function clear(x: number, y: number, width: number, height: number) {
    for (const [id, sprite] of draws) {
      if (sprite.x < x + width && x < sprite.x + sprite.width &&
          sprite.y < y + height && y < sprite.y + sprite.height) draws.delete(id);
    }
  }

  return {
    load(cpu: Cpu) {
      const arg = (offset: number) => cpu.read16(cpu.ss, (cpu.sp + offset) & 0xffff);
      const slot = arg(4) & 255;
      slots.delete(slot);
      const offset = arg(8), segment = arg(10);
      const bank = cpu.read8(cpu.ds, data.combatPictureBank);
      if (cpu.read8(segment, offset) !== 4) return;
      const name = String.fromCharCode(...[1, 2, 3, 4].map(index => cpu.read8(segment, (offset + index) & 0xffff)));
      if (name === "ICON" || (name === "CPIC" && bank >= 1 && bank <= 8)) {
        const archive = name === "ICON" ? "ICON.DAX" : `CPIC${bank}.DAX`;
        slots.set(slot, { archive, ready: arg(6) & 255 });
      }
    },
    draw(cpu: Cpu) {
      if (cpu.read8(cpu.ds, data.offscreenDraw) !== 1) return;
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const slot = arg(4), pose = arg(6), facing = arg(8);
      const row = (arg(10) << 24) >> 24, column = (arg(12) << 24) >> 24;
      if (pose > 1) return;
      const source = slots.get(slot);
      const monster = source && `${source.archive}:${source.ready + pose * 128}`;
      const party = !monster && slot < 8 ? partyPose(cpu, slot, pose, art, materialKeys) : undefined;
      if (!monster && !party) return;
      const pointer = data.combatPictureSlots + slot * 8 + pose * 4;
      const offset = cpu.read16(cpu.ds, pointer), segment = cpu.read16(cpu.ds, pointer + 2);
      if (!segment && !offset) return;
      const width = cpu.read16(segment, offset + 2) * 8, height = cpu.read16(segment, offset);
      if (!isCombatExtent(width, height)) return;
      const x = 8 + column * 24, y = 8 + row * 24;
      if (x >= 176 || y >= 176 || x + width <= 8 || y + height <= 8) return;
      // The masked blit preserves transparent pixels from earlier draws.
      draws.set(`${column}:${row}`, {
        x, y, width, height, monster, party, reflected: facing > 3,
      });
    },
    overwriteTile(column: number, row: number) {
      if (column <= 18 && row <= 18) clear(8 + column * 8, 8 + row * 8, 24, 24);
    },
    reset() { draws.clear(); },
    placements(frame: Frame, area?: number, cursor?: number): CombatArtPlacement[] {
      const result: CombatArtPlacement[] = [];
      for (const { x, y, width, height, monster, party, reflected } of draws.values()) {
        const key = party ?? (monster && monsterArt(monster, area, cursor));
        if (key) result.push([x, y, key, reflected, frame.get(x, y) === 15, width, height]);
      }
      return result;
    },
  };
}
