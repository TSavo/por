import type { Cpu } from "../src/cpu/machine.js";
import { data } from "../src/runtime/bindings.js";

// These authored variants have the same source pixels as the mirrored blocks.
const mirrorAliases = new Map<number, string>([
  [2, "130"], [130, "2"], [131, "3:transpose"], [132, "4:transpose"],
]);

export function observeNativeCombatEffects(art: ReadonlySet<string>) {
  const slots = new Map<number, number>();
  const scratch = new Map<number, string>();

  return {
    load(cpu: Cpu) {
      const word = (offset: number) => cpu.read16(cpu.ss, (cpu.sp + offset) & 0xffff);
      const slot = word(4) & 255;
      slots.delete(slot);
      const offset = word(8), segment = word(10);
      if (cpu.read8(segment, offset) !== 6) return;
      const name = String.fromCharCode(...Array.from({ length: 6 }, (_, index) =>
        cpu.read8(segment, (offset + index + 1) & 0xffff)));
      if (name.toUpperCase() === "COMSPR") slots.set(slot, word(6) & 255);
    },
    compose(cpu: Cpu) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const frame = arg(6), pose = arg(8);
      scratch.delete(frame);
      const ready = slots.get(arg(10));
      if (ready === undefined || pose > 1) return;
      const block = ready + pose * 128;
      const variant = arg(4) ? mirrorAliases.get(block) ?? `${block}:flip-x` : String(block);
      const key = `combat-effect:COMSPR.DAX:${variant}`;
      if (art.has(key)) scratch.set(frame, key);
    },
    draw(frame: number) { return scratch.get(frame); },
    drawDirect(cpu: Cpu, offset: number, segment: number, frame: number) {
      if (frame !== 0 || (!offset && !segment)) return;
      for (const [slot, ready] of slots) {
        for (let pose = 0; pose < 2; pose++) {
          const pointer = data.combatPictureSlots + slot * 8 + pose * 4;
          if (cpu.read16(cpu.ds, pointer) !== offset || cpu.read16(cpu.ds, pointer + 2) !== segment) continue;
          const key = `combat-effect:COMSPR.DAX:${ready + pose * 128}`;
          return art.has(key) ? key : undefined;
        }
      }
    },
    reset() { scratch.clear(); },
  };
}
