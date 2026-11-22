import type { Cpu } from "../src/cpu/machine.js";
import type { Frame } from "../src/lib/ega.js";
import { data, segment as unit } from "../src/runtime/bindings.js";
import { isCombatExtent, type CombatArtPlacement } from "./combat-art.js";
import { findGameRoot, portGame } from "./gamedata.js";

const defaultPalette = "0123456789abcdef";
/** The combat picture slot that holds the COMSPR selection bevel: pose 0 is block 25, pose 1 block 153. */
const bevelSlot = 25;

/** A party icon as the game composes it: CHEAD and CBODY blocks, the size index, and the colour remap. */
interface PartyIcon { head: number; body: number; size: number; palette: string }

/** The icon fields of a character record: head 0xbd, body 0xbe, size 0xc0, six colour pairs from 0xc1. */
function recordIcon(cpu: Cpu, segment: number, offset: number, recolor: boolean): PartyIcon {
  const record = (field: number) => cpu.read8(segment, offset + field);
  const palette = [...defaultPalette];
  for (let pair = 0; recolor && pair < 6; pair++) {
    const index = cpu.read8(unit.data, data.partyIconPaletteIndices + pair);
    const colors = record(0xc1 + pair);
    palette[index] = (colors & 15).toString(16);
    palette[index + 8] = (colors >> 4).toString(16);
  }
  return { head: record(0xbd), body: record(0xbe), size: record(0xc0), palette: palette.join("") };
}

function partyIconKey(cpu: Cpu, icon: PartyIcon, pose: number, art: ReadonlySet<string>, materialKeys: ReadonlySet<string>) {
  // The DOS loader adds 64 to both blocks for the tall icon archive.
  const size = cpu.read8(unit.data, data.partyIconSizeSuffix + icon.size);
  if (size !== 0x53 && size !== 0x54) return;
  const tall = size === 0x54 ? 64 : 0;
  const base = `combat:party:${icon.head + tall}:${icon.body + tall + pose * 128}`;
  if (icon.palette !== defaultPalette) {
    const recolored = `${base}:palette:${icon.palette}`;
    if (art.has(recolored) || (art.has(base) && materialKeys.has(base))) return recolored;
  }
  return art.has(base) ? base : undefined;
}

function partyPose(cpu: Cpu, slot: number, pose: number, art: ReadonlySet<string>, materialKeys: ReadonlySet<string>) {
  let segment = unit.data, pointer = data.combatRoster;
  for (let count = 0; count < 72; count++) {
    const offset = cpu.read16(segment, pointer);
    segment = cpu.read16(segment, pointer + 2);
    if (!offset && !segment) return;
    pointer = offset + 0x104;
    const record = (field: number) => cpu.read8(segment, offset + field);
    if (record(0x10e) !== 0 || record(0xbf) !== slot) continue;
    return partyIconKey(cpu, recordIcon(cpu, segment, offset, true), pose, art, materialKeys);
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
    if (art.has(global)) return global;
    // The same picture stored in another archive (CPIC2.DAX block 1 is CPIC7.DAX block 1): the
    // framebuffer matcher finds its art by the pixels, whichever archive the key names, when one
    // key alone has them.
    const equivalents = (equivalentPoses.get(source) ?? []).map(other => `combat:${other}`).filter(key => art.has(key));
    return equivalents.length === 1 ? equivalents[0] : undefined;
  }
  const slots = new Map<number, { archive: string; ready: number }>();
  const draws = new Map<string, {
    x: number; y: number; width: number; height: number; monster?: string; party?: string; reflected: boolean;
  }>();
  // What each picture slot holds that was composed from a character record rather than loaded
  // from an archive: the party icons, and the icon editor's copy of the one being edited.
  const composed = new Map<number, PartyIcon>();
  // Where the selection bevel was drawn, by cell, and which COMSPR block it is.
  const bevels = new Map<string, { x: number; y: number; block: number }>();

  function clear(x: number, y: number, width: number, height: number) {
    for (const [id, sprite] of draws) {
      if (sprite.x < x + width && x < sprite.x + sprite.width &&
          sprite.y < y + height && y < sprite.y + sprite.height) draws.delete(id);
    }
    for (const [id, bevel] of bevels) {
      if (bevel.x < x + width && x < bevel.x + 24 && bevel.y < y + height && y < bevel.y + 24) bevels.delete(id);
    }
  }
  const actor = (cpu: Cpu) => [cpu.read16(unit.data, data.actor + 2), cpu.read16(unit.data, data.actor)] as const;

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
    /**
     * At the entry of the icon composer: it builds the actor's icon in the slot the record names,
     * from its head, body and size, and recolours it when its argument is set.
     */
    compose(cpu: Cpu) {
      const [segment, offset] = actor(cpu);
      const slot = cpu.read8(segment, offset + 0xbf);
      // The icon editor alone composes into a slot beyond the party's eight (it sets the record's
      // slot to 12 before it draws the old and new icons): what earlier screens drew is gone.
      if (slot >= 8) {
        draws.clear();
        bevels.clear();
      }
      composed.set(slot, recordIcon(cpu, segment, offset, cpu.read8(cpu.ss, (cpu.sp + 4) & 0xffff) !== 0));
    },
    /** At the entry of the icon editor's copy: source slot, destination slot, and whether to recolour from the actor. */
    copy(cpu: Cpu) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      // Above the return address: the enclosing procedure's frame, the recolour flag, the destination, the source.
      const recolor = arg(6) !== 0, destination = arg(8), from = composed.get(arg(10));
      if (!from) {
        composed.delete(destination);
        return;
      }
      const [segment, offset] = actor(cpu);
      composed.set(destination, { ...from, palette: recolor ? recordIcon(cpu, segment, offset, true).palette : from.palette });
    },
    draw(cpu: Cpu) {
      if (cpu.read8(cpu.ds, data.offscreenDraw) !== 1) return;
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const slot = arg(4), pose = arg(6), facing = arg(8);
      const row = (arg(10) << 24) >> 24, column = (arg(12) << 24) >> 24;
      if (pose > 1) return;
      const source = slots.get(slot);
      const monster = source && `${source.archive}:${source.ready + pose * 128}`;
      if (!monster && slot === bevelSlot && column >= 0 && row >= 0 && column < 7 && row < 7) {
        bevels.set(`${column}:${row}`, { x: 8 + column * 24, y: 8 + row * 24, block: bevelSlot + pose * 128 });
        return;
      }
      const icon = monster ? undefined : composed.get(slot);
      const party = monster ? undefined : (slot < 8 ? partyPose(cpu, slot, pose, art, materialKeys) : undefined) ??
        (icon && partyIconKey(cpu, icon, pose, art, materialKeys));
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
    reset() {
      draws.clear();
      bevels.clear();
    },
    /** The COMSPR block of the selection bevel the game drew in the cell at (x, y), if any. */
    bevel(x: number, y: number) {
      return [...bevels.values()].find(bevel => bevel.x === x && bevel.y === y)?.block;
    },
    placements(frame: Frame, area?: number, cursor?: number): CombatArtPlacement[] {
      const result: CombatArtPlacement[] = [];
      for (const { x, y, width, height, monster, party, reflected } of draws.values()) {
        const key = party ?? (monster && monsterArt(monster, area, cursor));
        const selected = frame.get(x, y) === 15 || bevels.has(`${(x - 8) / 24}:${(y - 8) / 24}`);
        if (key) result.push([x, y, key, reflected, selected, width, height]);
      }
      return result;
    },
  };
}
