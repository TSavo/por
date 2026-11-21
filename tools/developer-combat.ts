import type { Cpu } from "../src/cpu/machine.js";
import { code, codeSegment, data, procedure, segment as unit } from "../src/runtime/bindings.js";

const nextCombatant = 0x104;
const activeInCombat = 0x10d;
const combatTeam = 0x10e;

export const developerVictoryCommand = ":win-combat";

export function canWinDeveloperCombat(cpu: Cpu): boolean {
  return cpu.read8(unit.data, data.gameState) === 5 && cpu.read8(unit.data, data.hostileCount) > 0;
}

export function winDeveloperCombat(cpu: Cpu): number {
  const damageSegment = codeSegment(code.damageCombatant);
  if (damageSegment === undefined || !canWinDeveloperCombat(cpu)) throw new Error("Expected an active original battle");

  const enemies: { segment: number; offset: number }[] = [];
  const gameData = unit.data;
  let segment = gameData;
  let link = data.combatRoster;
  for (let count = 0; ; count++) {
    const offset = cpu.read16(segment, link);
    segment = cpu.read16(segment, link + 2);
    if (!segment && !offset) break;
    if (count === 72) throw new Error("Original combat roster exceeds its capacity");
    if (cpu.read8(segment, offset + activeInCombat) && cpu.read8(segment, offset + combatTeam) === 1) {
      enemies.push({ segment, offset });
    }
    link = offset + nextCombatant;
  }
  if (enemies.length !== cpu.read8(gameData, data.hostileCount)) throw new Error("Original hostile count does not match the combat roster");

  const { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, zf, sf, of, pf, df } = cpu;
  try {
    // The original damage routine removes defeated units from combat and
    // updates the native team count. Leave rewards to the combat loop.
    const damageCombatant = procedure(code.damageCombatant);
    cpu.cs = damageSegment;
    cpu.ds = gameData;
    for (const enemy of enemies) {
      cpu.push(enemy.segment);
      cpu.push(enemy.offset);
      cpu.push(255);
      cpu.push(cs);
      cpu.push(ip);
      damageCombatant(cpu);
      if (cpu.sp !== sp) throw new Error("Original combat damage did not restore the stack");
    }
  } finally {
    Object.assign(cpu, { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, zf, sf, of, pf, df });
  }
  if (cpu.read8(gameData, data.hostileCount) !== 0) throw new Error("Original combat damage left active hostiles");
  return enemies.length;
}
