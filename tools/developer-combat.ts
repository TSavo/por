import type { Cpu } from "../src/cpu/machine.js";
import { code, codeSegment, data, procedure, segment as unit } from "../src/runtime/bindings.js";

const nextCombatant = 0x104;
const activeInCombat = 0x10d;
const combatTeam = 0x10e;

export const developerVictoryCommand = ":win-combat";

/**
 * The hostiles still in the fight: the combat roster's units of team 1 that are active.
 *
 * The game's own count of them (hostileCount) is not reliable after a developer's win. The game's
 * damage routine (START.EXE 2dc8) takes a unit out of the fight and decrements its team's count without
 * looking whether the unit was already out, so a party member on Quick who strikes a hostile the win
 * has removed takes the count below zero: in the Textile House courtyard it read 255, then 254, until
 * the game recounted the teams from the roster's active flags (2f81 to 2fb6) and asked Continue Battle
 * (#136). The roster's active flags are what the game counts from, so they say whether there is a
 * fight to win.
 */
function activeHostiles(cpu: Cpu): { segment: number; offset: number }[] {
  const enemies: { segment: number; offset: number }[] = [];
  let segment = unit.data;
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
  return enemies;
}

export function canWinDeveloperCombat(cpu: Cpu): boolean {
  return cpu.read8(unit.data, data.gameState) === 5 && activeHostiles(cpu).length > 0;
}

export function winDeveloperCombat(cpu: Cpu): number {
  const damageSegment = codeSegment(code.damageCombatant);
  if (damageSegment === undefined || !canWinDeveloperCombat(cpu)) throw new Error("Expected an active original battle");

  const enemies = activeHostiles(cpu);
  const gameData = unit.data;
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
  if (activeHostiles(cpu).length) throw new Error("Original combat damage left active hostiles");
  return enemies.length;
}
