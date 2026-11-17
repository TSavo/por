/**
 * Run translated START.EXE from its real entry, and the ECL/DAX loader
 * procedure, against the game files in POR_GAMEDATA. Prints the first
 * place the translation still stops.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { Cpu } from "../src/cpu/machine.js";
import { attachDos, consoleText, dosLog } from "../src/runtime/dos.js";
import { callTrace, farCall, resetFarBudget } from "../src/runtime/far.js";
import { installProgram, loadedSlices } from "../src/runtime/overlay.js";
import { registerTranslated } from "../src/translated/register.js";
import { ovl07_0353 } from "../src/translated/ovl07.js";

const root = process.env.POR_GAMEDATA ?? "/tmp/por-zip/pool";
const files = readdirSync(root)
  .filter((name) => !name.startsWith(".") && statSync(join(root, name)).isFile())
  .map((name) => ({ name, data: new Uint8Array(readFileSync(join(root, name))) }));

registerTranslated();

function fresh(): Cpu {
  const cpu = new Cpu();
  const exe = files.find((f) => f.name.toUpperCase() === "START.EXE");
  const ovr = files.find((f) => f.name.toUpperCase() === "GAME.OVR");
  if (!exe || !ovr) throw new Error("START.EXE and GAME.OVR are required");
  const boot = installProgram(cpu, exe.data, ovr.data);
  attachDos(cpu, files);
  cpu.ss = boot.ss;
  cpu.sp = boot.sp || 0xfffe;
  cpu.ds = 0x2000;
  // DOS passes the PSP in ES. Word at PSP:2 is the top of conventional memory.
  cpu.es = 0xf000;
  cpu.write16(0xf000, 2, 0xa000);
  return Object.assign(cpu, { boot });
}

function report(label: string, error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  console.log(`\n${label}: ${message}`);
  console.log(`  trail: ${callTrace.slice(-12).join(" -> ")}`);
  if (dosLog.length) {
    const names = [...new Set(dosLog)];
    console.log(`  dos (${dosLog.length}): ${names.join(" | ")}`);
  }
  if (consoleText.trim()) console.log(`  console: ${consoleText.trim()}`);
}

const cpu = fresh();
const boot = (cpu as Cpu & { boot: { cs: number; ip: number; ss: number; sp: number } }).boot;
console.log(
  `image entry ${boot.cs.toString(16)}:${boot.ip.toString(16)} ss ${boot.ss.toString(16)} sp ${boot.sp.toString(16)} slices ${loadedSlices.length}`,
);
cpu.stepBudget = 20_000_000;
resetFarBudget(200_000);
try {
  farCall(cpu, boot.cs, boot.ip);
  console.log(`entry returned ax=${cpu.ax.toString(16)} ds=${cpu.ds.toString(16)} steps=${cpu.steps}`);
  report("entry state", new Error("returned"));
  const text: string[] = [];
  for (let i = 0; i < 80 * 25 * 2; i += 2) {
    const ch = cpu.mem[0xb8000 + i] ?? 0;
    text.push(ch >= 32 && ch < 127 ? String.fromCharCode(ch) : " ");
  }
  const rows = text.join("");
  console.log(rows.replace(/ +$/gm, "").split(" ").length ? rows.match(/.{80}/g)?.filter((r) => r.trim()).join("\n") : "(blank text)");
} catch (error) {
  report("entry", error);
  const ds = 0x740;
  const w = (off: number) => cpu.read16(ds, off).toString(16);
  console.log(
    `  heap lo ${w(0x436a)}:${w(0x4368)} hi ${w(0x436e)}:${w(0x436c)} free ${w(0x4372)}:${w(0x4370)} top ${w(0x4372)}`,
  );
  console.log(
    `  regs bx:cx ${cpu.bx.toString(16)}:${cpu.cx.toString(16)} dx:ax ${cpu.dx.toString(16)}:${cpu.ax.toString(16)} es:di ${cpu.es.toString(16)}:${cpu.di.toString(16)}`,
  );
}

const slice7 = loadedSlices.find((s) => s.index === 7);
if (!slice7) throw new Error("slice 7 was not loaded");
const loader = fresh();
loader.ds = 0x2000;
loader.ss = 0x2000;
loader.sp = 0xff00;
loader.cs = slice7.loadPara;
loader.stepBudget = 2_000_000;
resetFarBudget(8000);
try {
  loader.push(0);
  farCall(loader, slice7.headerPara, 0x20);
  console.log("ovl07 first stub returned", loader.ax.toString(16));
} catch (error) {
  report("slice7 stub 0", error);
}

loader.steps = 0;
loader.stepBudget = 2_000_000;
resetFarBudget(8000);
try {
  loader.push(0);
  ovl07_0353(loader);
  console.log("ovl07_0353 returned");
} catch (error) {
  report("ovl07_0353", error);
}
