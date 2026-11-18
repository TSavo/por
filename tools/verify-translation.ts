/**
 * Execute two procedures translated from Pool of Radiance and check the result.
 * ovl07_0000 is the ECL operand fetch at the start of overlay slice 7.
 * sys5bb_16b5 is System.FillChar.
 */
import { Cpu } from "../src/cpu/machine.js";
import { ovl07_0000 } from "../src/translated/ovl07.js";
import "../src/translated/system5bb.js";
import { farCall } from "../src/runtime/far.js";
import { attachQuickRecovery } from "../src/runtime/quick-combat.js";
import type { LoadedSlice } from "../src/runtime/overlay.js";

function fresh(): Cpu {
  const m = new Cpu();
  m.ds = 0x2000;
  m.ss = 0x2000;
  m.es = 0x2000;
  m.cs = 0x3000;
  m.sp = 0xff00;
  return m;
}

function checkFillChar(): void {
  const m = fresh();
  // FillChar(dest, count, value). Stack at entry, last push is the first read at [bx+4].
  // Caller pushes dest_seg, dest_off, count, value, then far-call pushes cs, ip.
  const seg = 0x4000;
  m.push(seg);
  m.push(0x10);
  m.push(4);
  m.push(0x7e);
  m.push(m.cs);
  m.push(0);
  farCall(m, 0x5bb, 0x16b5);
  const bytes = [0, 1, 2, 3].map((i) => m.read8(seg, 0x10 + i));
  if (bytes.join(",") !== "126,126,126,126") {
    throw new Error(`FillChar wrote ${bytes}`);
  }
  console.log("verified sys5bb_16b5 FillChar  START.EXE 5bb:16b5");
}

function checkOperandFetch(): void {
  const m = fresh();
  const eclSeg = 0x5000;
  // Far pointer at DS:0x493f. Index 0x98ff, then the procedure adds 1 and 0x6700,
  // which wraps to offset 0 of this segment. See the instruction at ovl07_0000 / 0x0022.
  m.write16(m.ds, 0x493f, 0);
  m.write16(m.ds, 0x4941, eclSeg);
  m.write16(m.ds, 0x494e, 0x98ff);
  m.write8(eclSeg, 0, 0x00);
  m.write8(eclSeg, 1, 0x2a);
  m.ax = 1;
  m.push(m.ax);
  m.push(m.cs);
  m.push(0);
  ovl07_0000(m);
  const code = m.read8(m.ds, 0x6dcb + 1);
  const low = m.read8(m.ds, 0x6e4b + 1);
  const index = m.read16(m.ds, 0x494e);
  if (code !== 0x00 || low !== 0x2a || index !== 0x9902) {
    throw new Error(`operand fetch code=${code} low=${low} index=${index.toString(16)}`);
  }
  console.log("verified ovl07_0000 ECL operand fetch  GAME.OVR slice 7 +0x0000");
}

checkFillChar();
checkOperandFetch();

function checkQuickRecovery(): void {
  const m = fresh();
  const stack = m.sp;
  const actor = 0x100;
  m.bp = 0xff40;
  m.stepBudget = 100;
  m.write8(m.ss, m.bp - 2, 1);
  m.write8(m.ds, actor + 0x10f, 1);
  m.push(m.ds);
  m.push(actor);
  m.push(m.cs);
  m.push(0x477);
  const slice = (index: number, headerPara: number, loadPara: number): LoadedSlice =>
    ({ index, headerPara, loadPara, fileOffset: 0, codeBytes: 0, procs: new Map() });
  let recovered = false;
  attachQuickRecovery(m, [slice(8, 0x51, m.cs), slice(9, 0x58, 0x4000)], () => { recovered = true; }, 1);
  farCall(m, 0x58, 0x25);
  if (!recovered || m.sp !== stack || m.bp !== 0xff40 || m.cs !== 0x3000 || m.stepBudget !== 100 ||
      m.read8(m.ss, m.bp - 2) !== 0 || m.read8(m.ds, actor + 0x10f) !== 0) {
    throw new Error("Quick watchdog did not restore the original manual turn");
  }
  console.log("verified Quick timeout returns to manual combat");
}

checkQuickRecovery();
console.log("translation checks passed");
