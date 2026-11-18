import { StepBudgetExceeded, type Cpu } from "../cpu/machine.js";
import { ovl08_0307 } from "../translated/ovl08.js";
import { ovl09_000f } from "../translated/ovl09.js";
import { farCallOverrides } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { checkpointVideo } from "./video.js";

/** Recover a stalled player Quick turn using the game's own manual turn. */
export function attachQuickRecovery(
  cpu: Cpu,
  slices: readonly LoadedSlice[],
  onRecovery: () => void,
  instructionLimit = 5_000_000,
): void {
  const combat = slices.find((slice) => slice.index === 8);
  const quick = slices.find((slice) => slice.index === 9);
  if (!combat || !quick) return;

  farCallOverrides.set(cpu, (seg, off) => {
    // The player can enter Quick either at the start of a turn (02AE) or
    // from the manual menu (0472). Leave other callers alone.
    if (seg !== quick.headerPara || off !== 0x25 || cpu.cs !== combat.loadPara) return false;
    const returnIp = cpu.read16(cpu.ss, cpu.sp);
    if (returnIp !== 0x2b3 && returnIp !== 0x477) return false;

    const budget = cpu.stepBudget;
    const limit = cpu.steps + instructionLimit;
    if (budget !== 0 && budget <= limit) return false;
    const { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, of, zf, sf, pf, df } = cpu;
    const registers = { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, of, zf, sf, pf, df };
    const memory = cpu.mem.slice();
    const restoreVideo = checkpointVideo();
    cpu.stepBudget = limit;
    cpu.cs = quick.loadPara;
    try {
      ovl09_000f(cpu);
      return true;
    } catch (error) {
      if (!(error instanceof StepBudgetExceeded) || cpu.steps !== limit + 1) throw error;
      cpu.mem.set(memory);
      Object.assign(cpu, registers);
      cpu.prevSp = sp;
      restoreVideo();
    } finally {
      cpu.cs = cs;
      cpu.stepBudget = budget;
    }
    // Stack still holds the same far return and actor argument. This is
    // the same byte the game's manual menu clears when disabling Quick.
    const actorOff = cpu.read16(ss, sp + 4);
    const actorSeg = cpu.read16(ss, sp + 6);
    cpu.write8(actorSeg, actorOff + 0x10f, 0);
    onRecovery();
    if (returnIp === 0x477) {
      // The manual menu marked the turn finished before calling Quick.
      // Clear that local so its original loop asks for another action.
      cpu.write8(ss, bp - 2, 0);
      cpu.retf(4);
    } else {
      ovl08_0307(cpu);
    }
    return true;
  });
}
