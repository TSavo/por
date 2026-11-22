import type { Cpu } from "../src/cpu/machine.js";
import type { Frame } from "../src/lib/ega.js";
import { data } from "../src/runtime/bindings.js";
import { isCombatExtent, type CombatArtPlacement } from "./combat-art.js";

export function observeNativeCombatArt(art: ReadonlySet<string>) {
  const slots = new Map<number, { archive: string; ready: number }>();
  const draws = new Map<string, { x: number; y: number; width: number; height: number; source: string; reflected: boolean }>();

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
      if (bank < 1 || bank > 8 || cpu.read8(segment, offset) !== 4) return;
      const name = String.fromCharCode(...[1, 2, 3, 4].map(index => cpu.read8(segment, (offset + index) & 0xffff)));
      if (name === "CPIC") slots.set(slot, { archive: `CPIC${bank}.DAX`, ready: arg(6) & 255 });
    },
    draw(cpu: Cpu) {
      if (cpu.read8(cpu.ds, data.offscreenDraw) !== 1) return;
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const slot = slots.get(arg(4)), pose = arg(6), facing = arg(8);
      const row = (arg(10) << 24) >> 24, column = (arg(12) << 24) >> 24;
      if (!slot || pose > 1) return;
      const pointer = data.combatPictureSlots + arg(4) * 8 + pose * 4;
      const offset = cpu.read16(cpu.ds, pointer), segment = cpu.read16(cpu.ds, pointer + 2);
      if (!segment && !offset) return;
      const width = cpu.read16(segment, offset + 2) * 8, height = cpu.read16(segment, offset);
      if (!isCombatExtent(width, height)) return;
      const x = 8 + column * 24, y = 8 + row * 24;
      if (x >= 176 || y >= 176 || x + width <= 8 || y + height <= 8) return;
      // The masked blit preserves transparent pixels from earlier draws.
      draws.set(`${column}:${row}`, {
        x, y, width, height, source: `${slot.archive}:${slot.ready + pose * 128}`, reflected: facing > 3,
      });
    },
    overwriteTile(column: number, row: number) {
      if (column <= 18 && row <= 18) clear(8 + column * 8, 8 + row * 8, 24, 24);
    },
    reset() { draws.clear(); },
    placements(frame: Frame, area?: number, cursor?: number): CombatArtPlacement[] {
      const result: CombatArtPlacement[] = [];
      for (const { x, y, width, height, source, reflected } of draws.values()) {
        const local = `combat:area:${area}:${source}`;
        const scoped = `${local}:ecl:${cursor?.toString(16).padStart(4, "0")}`;
        const key = [scoped, local, `combat:${source}`].find(id => art.has(id));
        if (key) result.push([x, y, key, reflected, frame.get(x, y) === 15, width, height]);
      }
      return result;
    },
  };
}
