import type { Cpu } from "../src/cpu/machine.js";
import { loadedSlices } from "../src/runtime/overlay.js";
import { ovl25_2266 as damageCombatant } from "../src/translated/ovl25.js";

const gameData = 0x740;
const combatRoster = 0x5cf4;
const nextCombatant = 0x104;
const activeInCombat = 0x10d;
const combatTeam = 0x10e;
const hostileCount = 0x6773;

export const developerVictoryCommand = ":win-combat";

export function canWinDeveloperCombat(cpu: Cpu): boolean {
  return cpu.read8(gameData, 0x4954) === 5 && cpu.read8(gameData, hostileCount) > 0;
}

export function winDeveloperCombat(cpu: Cpu): number {
  const overlay = loadedSlices.find(({ index }) => index === 25);
  if (!overlay || !canWinDeveloperCombat(cpu)) throw new Error("Expected an active original battle");

  const enemies: { segment: number; offset: number }[] = [];
  let segment = gameData;
  let link = combatRoster;
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
  if (enemies.length !== cpu.read8(gameData, hostileCount)) throw new Error("Original hostile count does not match the combat roster");

  const { ax, bx, cx, dx, si, di, bp, sp, cs, ds, es, ss, ip, cf, zf, sf, of, pf, df } = cpu;
  try {
    // Overlay 25 at 2266 applies damage, removes defeated units from combat,
    // and updates the native team count. Leave rewards to the combat loop.
    cpu.cs = overlay.loadPara;
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
  if (cpu.read8(gameData, hostileCount) !== 0) throw new Error("Original combat damage left active hostiles");
  return enemies.length;
}
