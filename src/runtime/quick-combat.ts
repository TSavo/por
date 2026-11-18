import { StepBudgetExceeded, type Cpu } from "../cpu/machine.js";
import { ovl08_0307 } from "../translated/ovl08.js";
import { ovl09_000f } from "../translated/ovl09.js";
import { farCallOverrides } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { checkpointVideo } from "./video.js";

/** Recover stalled Quick turns at the original combat dispatch boundary. */
export function attachQuickRecovery(
  cpu: Cpu,
  slices: readonly LoadedSlice[],
  onRecovery: (partyMember: boolean, timeout: StepBudgetExceeded) => void,
  instructionLimit?: number,
): void {
  const combat = slices.find((slice) => slice.index === 8);
  const quick = slices.find((slice) => slice.index === 9);
  if (!combat || !quick) return;
  const drawingSegments = new Set(slices.filter(({ index }) => index === 36 || index === 37)
    .map(({ loadPara }) => loadPara));

  farCallOverrides.set(cpu, (seg, off) => {
    // The player can enter Quick either at the start of a turn (02AE) or
    // from the manual menu (0472). Leave other callers alone.
    if (seg !== quick.headerPara || off !== 0x25 || cpu.cs !== combat.loadPara) return false;
    const returnIp = cpu.read16(cpu.ss, cpu.sp);
    if (returnIp !== 0x2b3 && returnIp !== 0x477) return false;

    const budget = cpu.stepBudget;
    let limit = cpu.steps + (instructionLimit ?? 5_000_000);
    if (budget !== 0 && budget <= limit) return false;
    const { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, of, zf, sf, pf, df } = cpu;
    const registers = { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, of, zf, sf, pf, df };
    const memory = cpu.mem.slice();
    const restoreVideo = checkpointVideo();
    const previousBudgetHandler = cpu.onStepBudgetExceeded;
    if (instructionLimit === undefined) {
      const ceiling = Math.min(budget || Infinity, limit + 15_000_000);
      cpu.onStepBudgetExceeded = () => {
        if (cpu.stepBudget !== limit) return;
        if (drawingSegments.has(cpu.cs)) {
          // A battlefield redraw can exhaust the usual turn budget.
          // Extend in bounded increments so even a stuck redraw expires.
          limit = Math.min(ceiling, limit + 1_000_000);
        } else if (cpu.cs === 0x512 && cpu.ip >= 0x53d3 && cpu.ip <= 0x53e5) {
          // The calibrated delay reloads CX from BX for each of DX iterations.
          const remaining = Math.max(1, cpu.dx) * (3 * (cpu.bx || 0x10000) + 5);
          limit = Math.min(ceiling, limit + remaining);
        } else return;
        cpu.stepBudget = limit;
      };
    }
    cpu.stepBudget = limit;
    cpu.cs = quick.loadPara;
    let timeout: StepBudgetExceeded;
    try {
      ovl09_000f(cpu);
      return true;
    } catch (error) {
      if (!(error instanceof StepBudgetExceeded) || cpu.steps !== limit + 1) throw error;
      timeout = error;
      cpu.mem.set(memory);
      Object.assign(cpu, registers);
      cpu.prevSp = sp;
      restoreVideo();
    } finally {
      cpu.cs = cs;
      cpu.onStepBudgetExceeded = previousBudgetHandler;
      // Quick can poll the keyboard and accept live input. Preserve any
      // session budget extension made while the turn watchdog was active.
      const extendedBudget = cpu.stepBudget > limit ? cpu.stepBudget : budget;
      cpu.stepBudget = budget === 0 ? 0 : Math.max(budget, extendedBudget);
    }
    // Read the actor from the original far-call stack. The original
    // "disable Quick" loop at ovl08:04F3 uses this same type boundary.
    const actorOff = cpu.read16(ss, sp + 4);
    const actorSeg = cpu.read16(ss, sp + 6);
    const partyMember = cpu.read8(actorSeg, actorOff + 0x84) < 0x80;
    onRecovery(partyMember, timeout);
    if (!partyMember) {
      // Keep NPC control automatic. The caller continues through its
      // normal end-of-turn cleanup with the pre-Quick state restored.
      cpu.retf(4);
      return true;
    }
    cpu.write8(actorSeg, actorOff + 0x10f, 0);
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
