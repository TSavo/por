import { Cpu } from "../src/cpu/machine.js";
import { readInstruction, type Operand, type Script } from "../src/lib/ecl.js";
import { installProgram, loadedSlices } from "../src/runtime/overlay.js";
import { ovl03_35db } from "../src/translated/ovl03.js";
import { registerTranslated } from "../src/translated/register.js";
import { readGameFile } from "./gamedata.js";

const sites = {
  3: { entry: 0x9a89, exit: 0x9aa2 },
  6: { entry: 0x9b5a, exit: 0x9b95 },
  9: { entry: 0x9c68, exit: 0x9ca0 },
  15: { entry: 0x9aeb, exit: 0x9b03 },
  24: { entry: 0x992e, exit: 0x99a3, mapLoad: 0x997b, mapOnlyExit: 0x99a7 },
  29: { entry: 0x9918, exit: 0x9947 },
} as const;
const facings = ["north", "east", "south", "west"] as const;
type Facing = typeof facings[number];
type Condition = { facing: Facing; fromMapId?: number } | { exitRows: [number, number] };
type Outcome = { targetAreaId: number; loadsMapId?: number }
  | { loadsMapId: number; sameArea: true }
  | { missingAreaId: number };
type ExitCase = { when: Condition } & Outcome;

const hex = (address: number) => `0x${address.toString(16)}`;

/** Run just the original exit selector. Inputs are controlled, so this proves
 * the script's result for a direction, rather than a walk to that boundary. */
export function traceComputedAreaExits(root: string, areaIds: ReadonlySet<number>) {
  const exe = readGameFile(root, "START.EXE");
  const overlay = readGameFile(root, "GAME.OVR");
  registerTranslated();

  return (area: number, archive: string, script: Script, address: number) => {
    const site = sites[area as keyof typeof sites];
    if (!site || address !== site.exit) throw new Error(`Unverified computed exit at ${archive} block ${area} ${hex(address)}`);
    const archiveNumber = /^ECL(\d+)\.DAX$/i.exec(archive)?.[1];
    if (!archiveNumber) throw new Error(`Unexpected script archive ${archive}`);

    const probe = (facing: number, row: number, mapId: number): Outcome => {
      const cpu = new Cpu();
      installProgram(cpu, exe, overlay);
      const dispatcherSegment = loadedSlices.find(slice => slice.index === 3)!.loadPara;
      cpu.ds = 0x0740;
      cpu.ss = 0x9000;
      cpu.stepBudget = 50_000;
      const [global, local, scratch, bytecode] = [0x2000, 0x3000, 0x4000, 0x5000];
      for (const [index, segment] of [global, local, scratch, bytecode].entries()) {
        cpu.write16(cpu.ds, 0x4933 + index * 4, 0);
        cpu.write16(cpu.ds, 0x4935 + index * 4, segment);
      }
      cpu.mem.set(script.bytes, bytecode * 16);
      cpu.write16(global, (0x49c5 * 2 + 0x6e00) & 0xffff, mapId);
      cpu.write16(local, (0x6dd5 * 2 + 0x2a00) & 0xffff, 1); // Exit in progress.
      cpu.write8(cpu.ds, 0x52d4, Number(archiveNumber));
      cpu.write8(cpu.ds, 0x82a2, area);
      cpu.write8(cpu.ds, 0x6a0c, row);
      cpu.write8(cpu.ds, 0x6a0d, facing * 2);

      const value = (operand: Operand) => {
        if (operand.code === 0) return operand.low;
        if (operand.code === 2 && operand.word !== null) return operand.word;
        if (operand.code === 1 && operand.word !== null && operand.word >= 0x6b00 && operand.word <= 0x6eff)
          return cpu.read16(local, (operand.word * 2 + 0x2a00) & 0xffff);
        throw new Error(`Unexpected operand in computed exit at area ${area}, ${hex(address)}`);
      };

      const boundary = Symbol("exit selector boundary");
      let outcome: Outcome | undefined;
      let mapLoad: number | undefined;
      let continuation: number | undefined;
      cpu.onEclInstruction = entering => {
        if (!entering) return;
        const inst = readInstruction(script, cpu.read16(cpu.ds, 0x494e));
        if (inst.name === "NEW ECL" && inst.address === site.exit) {
          const destination = value(inst.operands[0]!);
          if (destination === 255) outcome = { missingAreaId: destination };
          else if (areaIds.has(destination)) {
            outcome = mapLoad !== undefined && mapLoad !== 255
              ? { targetAreaId: destination, loadsMapId: mapLoad }
              : { targetAreaId: destination };
          } else throw new Error(`Computed exit ${area}:${hex(address)} selects unknown area ${destination}`);
          throw boundary;
        }
        if ("mapLoad" in site && inst.address === site.mapLoad && inst.name === "LOAD FILES") {
          // Record the requested GEO file. Continue with the same script locals
          // after the graphics load so this audit needs no video or DOS device.
          mapLoad = value(inst.operands[0]!);
          continuation = inst.next;
          throw boundary;
        }
        if ("mapOnlyExit" in site && inst.address === site.mapOnlyExit && inst.name === "EXIT" && mapLoad !== undefined) {
          outcome = { loadsMapId: mapLoad, sameArea: true };
          throw boundary;
        }
      };

      const run = (entry: number) => {
        cpu.sp = 0x8000;
        cpu.bp = 0;
        cpu.cs = dispatcherSegment;
        cpu.push(entry);
        cpu.push(0);
        cpu.push(0);
        try { ovl03_35db(cpu); } catch (error) { if (error !== boundary) throw error; }
      };
      run(site.entry);
      if (continuation !== undefined) run(continuation);
      if (!outcome) throw new Error(`No computed exit outcome for ${area}:${hex(address)}, facing ${facing}, row ${row}, map ${mapId}`);
      return outcome;
    };

    let cases: ExitCase[];
    if (area === 9) {
      const firstRow = probe(0, 0, area);
      const otherRows = probe(0, 1, area);
      for (let row = 0; row <= 15; row++) {
        for (const [facing] of facings.entries()) {
          const expected = row === 0 ? firstRow : otherRows;
          if (JSON.stringify(probe(facing, row, area)) !== JSON.stringify(expected))
            throw new Error(`Stojanow Gate resolves differently at row ${row}, facing ${facings[facing]}`);
        }
      }
      cases = [{ when: { exitRows: [0, 0] }, ...firstRow }, { when: { exitRows: [1, 15] }, ...otherRows }];
    } else {
      cases = (area === 24 ? [24, 31] : [area]).flatMap(mapId => facings.map((facing, index) => ({
        when: area === 24 ? { facing, fromMapId: mapId } : { facing },
        ...probe(index, 0, mapId),
      })));
    }
    const targets = [...new Set(cases.flatMap(result => "targetAreaId" in result ? [result.targetAreaId] : []))]
      .sort((a, b) => a - b);
    return { selectorEntry: hex(site.entry), scriptTargets: targets, cases };
  };
}
