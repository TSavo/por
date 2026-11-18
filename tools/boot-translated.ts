/**
 * Run translated START.EXE from its real entry, and the ECL/DAX loader
 * procedure, against the game files in POR_GAMEDATA. Prints the first
 * place the translation still stops.
 */
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cpu } from "../src/cpu/machine.js";
import { attachDos, consoleText, dosLog, type BiosKey } from "../src/runtime/dos.js";
import { intrCounts } from "../src/runtime/intr.js";
import { journalFrame, screen, videoSummary } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { findGameRoot } from "./gamedata.js";
import { currentObjective, observeAdventureLog, questProgress, type JournalLead } from "../src/runtime/adventure-log.js";
import { liveInput } from "./live-input.js";
import { openJournalProfile } from "./journal-profile.js";
import { stagePregenParty } from "./pregen-party.js";
import { attachQuickRecovery } from "../src/runtime/quick-combat.js";
import { callTrace, disposeHits, dosAssigns, farCall, getmemRing, resetFarBudget, spMax, spMin } from "../src/runtime/far.js";
import { installProgram, loadedSlices } from "../src/runtime/overlay.js";
import { registerTranslated } from "../src/translated/register.js";
import { ovl07_0353 } from "../src/translated/ovl07.js";

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const gameFiles = readdirSync(root, { recursive: true, encoding: "utf8" })
  .filter((name) => !name.startsWith(".") && statSync(join(root, name)).isFile())
  .map((name) => ({ name, data: new Uint8Array(readFileSync(join(root, name))) }));
const files = process.env.POR_PREGEN_PARTY === "1" ? stagePregenParty(gameFiles) : gameFiles;

registerTranslated();

function fresh(requestKey?: (cpu: Cpu, keys: BiosKey[], blocking: boolean) => void): Cpu {
  const cpu = new Cpu();
  const exe = files.find((f) => f.name.toUpperCase() === "START.EXE");
  const ovr = files.find((f) => f.name.toUpperCase() === "GAME.OVR");
  if (!exe || !ovr) throw new Error("START.EXE and GAME.OVR are required");
  const boot = installProgram(cpu, exe.data, ovr.data);
  const keys = (process.env.POR_BOOT_KEYS ?? "").split(",").filter(Boolean).map((key) => {
    const match = /^(?:(\d+):)?([0-9a-f]{4})$/i.exec(key);
    if (!match) throw new Error("POR_BOOT_KEYS expects comma-separated [step:]hex BIOS key words");
    return { step: Number(match[1] ?? 0), word: Number.parseInt(match[2]!, 16) };
  }).sort((a, b) => a.step - b.step);
  attachDos(cpu, files, keys, requestKey && ((blocking) => requestKey(cpu, keys, blocking)));
  cpu.ss = boot.ss;
  cpu.sp = boot.sp || 0xfffe;
  cpu.ds = 0x2000;
  // DOS passes the PSP in ES. Word at PSP:2 is the top of conventional memory.
  cpu.es = 0x9ff0;
  cpu.write16(cpu.es, 2, 0x9ff0);
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
  if (intrCounts.size) {
    const ranked = [...intrCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
    console.log(`  intr ${ranked.map(([k, v]) => `${k} x${v}`).join(" | ")}`);
  }
  const picture = videoSummary();
  if (picture.trim()) console.log(picture);
  mkdirSync("out", { recursive: true });
  if (label.startsWith("entry")) writeFileSync(join("out", "por-boot.png"), encodePng(screen));
  if (disposeHits.length) console.log(`  dispose:\n    ${disposeHits.join("\n    ")}`);
  if (dosAssigns.length) console.log(`  assign:\n    ${dosAssigns.join("\n    ")}`);
  if (getmemRing.length) console.log(`  getmem:\n    ${getmemRing.join("\n    ")}`);
  if (writes.length) console.log(`  writes of 9a50:\n    ${writes.join("\n    ")}`);
  console.log(`  sp range ${spMin.toString(16)}..${spMax.toString(16)}`);
  if (cpu.spJumps.length) console.log(`  sp jumps:\n    ${cpu.spJumps.join("\n    ")}`);
  if (cpu.driveWrites.length) console.log(`  drive byte writes: ${cpu.driveWrites.join(" | ")}`);
}

let adventureLog: (() => string) | undefined;
const profilePath = process.env.POR_JOURNAL_PROFILE;
const updateJournal = openJournalProfile(profilePath);
const journal = (transcript = adventureLog?.() ?? ""): JournalLead[] =>
  updateJournal(transcript, (known) => questProgress(cpu, known, 0x740));
const liveAt = process.env.POR_LIVE_AT;
const liveStep = Number(liveAt);
if (liveAt !== undefined && (!Number.isSafeInteger(liveStep) || liveStep < 0)) {
  throw new Error("POR_LIVE_AT must be a nonnegative integer");
}
if (liveAt !== undefined) mkdirSync("out", { recursive: true });
const input = liveAt === undefined ? undefined : liveInput(liveStep, journal);
const cpu = fresh(input?.requestKey);
if (input) {
  const camp = loadedSlices.find((slice) => slice.index === 15);
  const menus = loadedSlices.find((slice) => slice.index === 26);
  const select = menus?.procs.get(0xe4);
  const address = 0x791c;
  const prefixOffset = 0x1e31;
  const menu = Buffer.from("Save View Magic Rest Alter Exit", "ascii");
  const prefix = Buffer.from("Camp: ", "ascii");
  if (camp && menus && select && cpu.mem[address] === menu.length &&
      menu.every((byte, i) => cpu.mem[address + i + 1] === byte) &&
      cpu.read8(camp.loadPara, prefixOffset) === prefix.length &&
      prefix.every((byte, i) => cpu.read8(camp.loadPara, prefixOffset + i + 1) === byte)) {
    const extended = Buffer.from(`${menu.toString()} Journal`, "ascii");
    cpu.mem[address] = extended.length;
    cpu.mem.set(extended, address + 1);
    // The six-character Camp prefix would clip the last choice on the 40-column row.
    cpu.write8(camp.loadPara, prefixOffset, 0);
    menus.procs = new Map(menus.procs);
    menus.procs.set(0xe4, (m) => {
      const fromCamp = m.read16(m.ss, m.sp) === 0x1efa && m.read16(m.ss, m.sp + 2) === camp.loadPara;
      if (!fromCamp) { select(m); return; }
      input.setCampMenu(true);
      try {
        select(m);
        // The shared selector returns the initial of the chosen item in AL.
        if (m.al === 0x4a) input.openJournal();
      } finally {
        input.setCampMenu(false);
      }
    });
  }
}
if (liveAt !== undefined) {
  attachQuickRecovery(cpu, loadedSlices, (partyMember) => console.log(
    partyMember
      ? "Quick combat stalled. Returning control to the player."
      : "An enemy's Quick combat stalled. Ending its turn.",
  ));
}
const journalSlice = loadedSlices.find((slice) => slice.index === 7);
adventureLog = (process.env.POR_ADVENTURE_LOG === "1" || liveAt !== undefined || profilePath) && journalSlice
  ? observeAdventureLog(cpu, journalSlice)
  : undefined;
const boot = (cpu as Cpu & { boot: { cs: number; ip: number; ss: number; sp: number } }).boot;
console.log(
  `image entry ${boot.cs.toString(16)}:${boot.ip.toString(16)} ss ${boot.ss.toString(16)} sp ${boot.sp.toString(16)} slices ${loadedSlices.length}`,
);
const writes: string[] = [];
cpu.onWrite16 = (seg, off, value) => {
  if (value === 0x9a50 || (value === 0x5c && writes.length && writes[writes.length - 1].includes("9a50"))) {
    writes.push(`${seg.toString(16)}:${off.toString(16)}=${value.toString(16)} ip ${cpu.cs.toString(16)}:${cpu.ip.toString(16)}`);
    if (writes.length > 12) writes.shift();
  }
};
cpu.stepBudget = Number(process.env.POR_BOOT_STEPS ?? 30_000_000);
if (!Number.isSafeInteger(cpu.stepBudget) || cpu.stepBudget <= 0) {
  throw new Error("POR_BOOT_STEPS must be a positive integer");
}
resetFarBudget(0);
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

if (adventureLog) {
  mkdirSync("out", { recursive: true });
  const transcript = adventureLog();
  const leads = journal(transcript);
  writeFileSync(join("out", "adventure-log.txt"), transcript + "\n");
  writeFileSync(join("out", "adventure-journal.json"), JSON.stringify({ objective: currentObjective(leads), leads }, null, 2) + "\n");
  writeFileSync(join("out", "adventure-journal.png"), encodePng(journalFrame(leads)));
}
if (liveAt !== undefined) process.exit(0);
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
