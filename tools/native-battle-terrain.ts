import { createHash } from "node:crypto";
import type { Cpu } from "../src/cpu/machine.js";
import type { PictureRecord } from "../src/runtime/game-data.js";
import type { CombatArtPlacement } from "./combat-art.js";

type TerrainPlacement = [x: number, y: number, key: string];
const blankCell = createHash("sha256").update(Buffer.alloc(64)).digest("hex");

export function observeNativeBattleTerrain(pictures: readonly PictureRecord[], art: ReadonlySet<string>,
  combatArt: ReadonlySet<string>) {
  const sheets = new Map(pictures.flatMap(({ file, block, pictures: shapes }) => {
    const shape = shapes[0];
    return shapes.length === 1 && shape?.width === 24 && shape.height === 24 && shape.cellHashes
      ? [[`${file}:${block}`, shape.cellHashes.map((cells, frame) => {
        const key = `combat:RANDCOM.DAX:1:0:${frame}`;
        const whole = file === "RANDCOM.DAX" && block === 1 && combatArt.has(key) &&
          cells.some(hash => hash !== blankCell && !art.has(`battle-tile:${hash}`));
        return { cells, prop: whole ? key : undefined, reflected: frame === 0 };
      })] as const] : [];
  }));
  const squares = Array.from({ length: 256 }, (_, picture) => {
    const block = picture < 128 ? 1 : 2;
    return sheets.get(`SQRPACI.DAX:${block}`)?.[picture & 0x7f];
  });
  const visible = new Map<number, TerrainPlacement>();
  const props = new Map<number, CombatArtPlacement>();

  return {
    copySheet(cpu: Cpu) {
      // The guest has finished copying the source block into SQRPACI block 1.
      const word = (displacement: number) => cpu.read16(cpu.ss, (cpu.bp + displacement) & 0xffff);
      const offset = word(0xa), segment = word(0xc);
      const length = cpu.read8(segment, offset);
      const name = String.fromCharCode(...Array.from({ length }, (_, index) =>
        cpu.read8(segment, (offset + index + 1) & 0xffff))).toUpperCase();
      const source = sheets.get(`${name}.DAX:1`);
      const start = word(8) & 0xff;
      const count = cpu.read8(word(-0x102), (word(-0x104) + 8) & 0xffff);
      for (let frame = 0; frame < count && start + frame < 128; frame++) squares[start + frame] = source?.[frame];
    },
    draw(column: number, row: number, picture: number) {
      const source = squares[picture];
      const left = 8 + ((column << 24) >> 24) * 8;
      const top = 8 + ((row << 24) >> 24) * 8;
      if (left >= 176 || top >= 176 || left + 24 <= 8 || top + 24 <= 8) return;
      for (const [id, [x, y]] of props) {
        if (x < left + 24 && left < x + 24 && y < top + 24 && top < y + 24) props.delete(id);
      }
      if (source?.prop) props.set(top * 320 + left, [left, top, source.prop, source.reflected]);
      for (let dy = 0; dy < 3; dy++) {
        for (let dx = 0; dx < 3; dx++) {
          const x = left + dx * 8, y = top + dy * 8;
          if (x < 8 || x >= 176 || y < 8 || y >= 176) continue;
          const cell = y * 320 + x;
          const key = `battle-tile:${source?.cells[dy * 3 + dx]}`;
          if (!source?.prop && art.has(key)) visible.set(cell, [x, y, key]);
          else visible.delete(cell);
        }
      }
    },
    reset() { visible.clear(); props.clear(); },
    placements() { return [...visible.values()]; },
    propPlacements() {
      return [...props.values()].sort(([ax, ay], [bx, by]) => ay - by || ax - bx);
    },
  };
}
