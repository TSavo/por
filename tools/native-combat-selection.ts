import type { Cpu } from "../src/cpu/machine.js";
import { data } from "../src/runtime/bindings.js";
import { cellWriteMark } from "../src/runtime/video.js";

export const nativeSelectionKey = "combat-selection:COMSPR.DAX:25";
const cellSize = 24;
const panelStart = 8;
const panelCells = 7;
const terrainGroupsPerCell = cellSize / 8;

/** The count of writes to the visible screen over one combat cell (eight-pixel text cells). */
const visibleWrites = (cell: number) => cellWriteMark((panelStart + (cell % panelCells) * cellSize) / 8,
  (panelStart + Math.floor(cell / panelCells) * cellSize) / 8, terrainGroupsPerCell, terrainGroupsPerCell);

export function observeNativeCombatSelection() {
  const cells = new Map<number, [number, number]>();
  // The game draws the cursor and the terrain over it in its offscreen picture and copies that picture
  // to the screen later. A cursor drawn over stays on screen until the copy reaches its cell (#165):
  // each cell drawn over keeps the count of screen writes it had then, and goes when that count moves.
  const drawnOver = new Map<number, number>();

  return {
    draw(cpu: Cpu) {
      const arg = (offset: number) => cpu.read8(cpu.ss, (cpu.sp + offset) & 0xffff);
      const row = arg(10), column = arg(12);
      if (cpu.read8(cpu.ds, data.offscreenDraw) !== 1 || arg(4) !== 25 ||
          row >= panelCells || column >= panelCells) return;
      const cell = row * panelCells + column;
      cells.set(cell, [panelStart + column * cellSize, panelStart + row * cellSize]);
      drawnOver.delete(cell);
    },
    overwriteTile(column: number, row: number) {
      // Terrain coordinates use eight-pixel groups, while the cursor uses combat cells.
      if (column % terrainGroupsPerCell || row % terrainGroupsPerCell ||
          column >= panelCells * terrainGroupsPerCell || row >= panelCells * terrainGroupsPerCell) return;
      const cell = row / terrainGroupsPerCell * panelCells + column / terrainGroupsPerCell;
      if (cells.has(cell) && !drawnOver.has(cell)) drawnOver.set(cell, visibleWrites(cell));
    },
    reset() {
      cells.clear();
      drawnOver.clear();
    },
    placements(): [number, number, string][] {
      for (const [cell, mark] of drawnOver) {
        if (visibleWrites(cell) === mark) continue;
        cells.delete(cell);
        drawnOver.delete(cell);
      }
      return [...cells.values()].map(([x, y]) => [x, y, nativeSelectionKey]);
    },
  };
}
