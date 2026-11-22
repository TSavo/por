import type { Cpu } from "../src/cpu/machine.js";
import { data } from "../src/runtime/bindings.js";

export const nativeSelectionKey = "combat-selection:COMSPR.DAX:25";
const cellSize = 24;
const panelStart = 8;
const panelCells = 7;
const terrainGroupsPerCell = cellSize / 8;

export function observeNativeCombatSelection() {
  const cells = new Map<number, [number, number]>();

  return {
    draw(cpu: Cpu) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const row = arg(10), column = arg(12);
      if (cpu.read8(cpu.ds, data.offscreenDraw) !== 1 || arg(4) !== 25 ||
          row >= panelCells || column >= panelCells) return;
      cells.set(row * panelCells + column, [panelStart + column * cellSize, panelStart + row * cellSize]);
    },
    overwriteTile(column: number, row: number) {
      // Terrain coordinates use eight-pixel groups, while the cursor uses combat cells.
      if (column % terrainGroupsPerCell || row % terrainGroupsPerCell ||
          column >= panelCells * terrainGroupsPerCell || row >= panelCells * terrainGroupsPerCell) return;
      cells.delete(row / terrainGroupsPerCell * panelCells + column / terrainGroupsPerCell);
    },
    reset() { cells.clear(); },
    placements(): [number, number, string][] {
      return [...cells.values()].map(([x, y]) => [x, y, nativeSelectionKey]);
    },
  };
}
