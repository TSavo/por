/**
 * Execute two procedures translated from Pool of Radiance and check the result.
 * ovl07_0000 is the ECL operand fetch at the start of overlay slice 7.
 * sys5bb_16b5 is System.FillChar.
 */
import { Cpu } from "../src/cpu/machine.js";
import { ovl07_0000 } from "../src/translated/ovl07.js";
import "../src/translated/system5bb.js";
import { farCall } from "../src/runtime/far.js";

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
console.log("translation checks passed");
