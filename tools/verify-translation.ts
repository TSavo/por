/**
 * Execute two procedures translated from Pool of Radiance and check the result.
 * ovl07_0000 is the ECL operand fetch at the start of overlay slice 7.
 * sys5bb_16b5 is System.FillChar.
 */
import { Cpu } from "../src/cpu/machine.js";
import { ovl07_0000, ovl07_0c93 } from "../src/translated/ovl07.js";
import "../src/translated/system5bb.js";
import { farCall } from "../src/runtime/far.js";
import { attachQuickRecovery } from "../src/runtime/quick-combat.js";
import type { LoadedSlice } from "../src/runtime/overlay.js";
import { currentObjective, discoveredLeads, progressAddresses, questProgress } from "../src/runtime/adventure-log.js";
import { commissions } from "../src/runtime/commission-journal.js";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

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

function checkQuickRecovery(partyMember: boolean): void {
  const m = fresh();
  const stack = m.sp;
  const actor = 0x100;
  m.bp = 0xff40;
  m.stepBudget = 100;
  m.write8(m.ss, m.bp - 2, 1);
  m.write8(m.ds, actor + 0x10f, 1);
  m.write8(m.ds, actor + 0x84, partyMember ? 0 : 0x80);
  m.push(m.ds);
  m.push(actor);
  m.push(m.cs);
  m.push(partyMember ? 0x477 : 0x2b3);
  const slice = (index: number, headerPara: number, loadPara: number): LoadedSlice =>
    ({ index, headerPara, loadPara, fileOffset: 0, codeBytes: 0, procs: new Map() });
  let recovered: boolean | undefined;
  attachQuickRecovery(m, [slice(8, 0x51, m.cs), slice(9, 0x58, 0x4000)], (party) => { recovered = party; }, 1);
  farCall(m, 0x58, 0x25);
  const expected = partyMember ? 0 : 1;
  if (recovered !== partyMember || m.sp !== stack || m.bp !== 0xff40 || m.cs !== 0x3000 || m.stepBudget !== 100 ||
      m.read8(m.ss, m.bp - 2) !== expected || m.read8(m.ds, actor + 0x10f) !== expected) {
    throw new Error("Quick watchdog did not restore the expected combat control");
  }
  console.log(partyMember ? "verified Quick timeout returns to manual combat" : "verified enemy Quick timeout retains automatic control");
}

checkQuickRecovery(true);
checkQuickRecovery(false);

function checkSokalQuestProgress(): void {
  const m = fresh();
  m.write16(m.ds, 0x4933, 0x20);
  m.write16(m.ds, 0x4935, 0x5000);
  const offered = discoveredLeads("SOKAL KEEP ON THORN ISLAND MUST BE CLEARED.");

  // Run the original ECL global setter used in the keep's success branch
  // and the council's reward routine.
  const saveSokalState = (value: number) => {
    m.push(0x4aa7);
    m.push(value);
    m.push(m.cs);
    m.push(0);
    ovl07_0c93(m);
  };

  saveSokalState(254);
  const ready = questProgress(m, offered, m.ds);
  if (ready[0]?.status !== "ready-to-report" || !currentObjective(ready).nextStep.includes("council clerk") ||
      questProgress(m, [], m.ds).length !== 0) {
    throw new Error("The journal did not recognize the original keep-clear flag");
  }
  const announced = discoveredLeads("WITH SOKAL KEEP IN OUR HANDS, WE CAN USE BOATS TO BYPASS THE BARREN RIVER.");
  if (announced[0]?.status !== "reward-pending") {
    throw new Error("The journal closed the quest before the original reward flag was written");
  }
  saveSokalState(255);
  if (questProgress(m, offered, m.ds)[0]?.status !== "turned-in") {
    throw new Error("The journal did not recognize the original reward flag");
  }
  console.log("verified Sokal journal progression against the translated ECL setter");
}

checkSokalQuestProgress();

function checkCampaignJournal(): void {
  const root = findGameRoot();
  if (!root) {
    console.log("campaign dialogue checks skipped (original game data unavailable)");
    return;
  }
  const lines = listGameFiles(root).filter((name) => /^ecl.*\.dax$/i.test(name)).flatMap((name) =>
    parseDax(name, readGameFile(root, name)).entries.flatMap(({ data }) =>
      disassemble(scriptFromBlock(data)).instructions.flatMap(({ operands }) =>
        operands.flatMap(({ text }) => text === null ? [] : [text]))));
  const m = fresh();
  m.write16(m.ds, 0x4933, 0x20);
  m.write16(m.ds, 0x4935, 0x5000);
  const writeGlobal = (address: number, value: number) => {
    m.push(address);
    m.push(value);
    m.push(m.cs);
    m.push(0);
    ovl07_0c93(m);
  };
  for (const commission of commissions) {
    const id = `commission-${commission.id}`;
    const lookup = (text: string) => discoveredLeads(text).find((lead) => lead.id === id);
    const fromGame = (trigger: string) => {
      const line = lines.find((text) => text.includes(trigger));
      if (line === undefined) throw new Error(`Original dialogue trigger missing for ${id}: ${trigger}`);
      return line;
    };
    const offer = lookup(fromGame(commission.offer));
    if (offer?.status !== "offered" || currentObjective([offer]).nextStep !== commission.next) {
      throw new Error(`Journal offer mismatch for ${id}`);
    }
    if (commission.accepted && lookup(fromGame(commission.accepted))?.status !== "accepted") {
      throw new Error(`Journal acceptance mismatch for ${id}`);
    }
    const address = progressAddresses[commission.id];
    if (commission.report && lookup(fromGame(commission.report))?.status !==
        (address === undefined ? "turned-in" : "reward-pending")) {
      throw new Error(`Journal reward dialogue mismatch for ${id}`);
    }
    if (address !== undefined) {
      writeGlobal(address, 254);
      if (questProgress(m, [offer], m.ds)[0]?.status !== "ready-to-report" || questProgress(m, [], m.ds).length) {
        throw new Error(`Journal completion flag mismatch for ${id}`);
      }
      writeGlobal(address, 255);
      if (questProgress(m, [offer], m.ds)[0]?.status !== "turned-in") {
        throw new Error(`Journal reward flag mismatch for ${id}`);
      }
    }
  }
  if (discoveredLeads("A SPECIAL PRIZE FOR ENDING THE GRAVEYARD MENACE").some(({ id }) =>
    id === "commission-bottle-vampire")) {
    throw new Error("The graveyard reward revealed an undiscovered bottle objective");
  }
  console.log(`verified ${commissions.length} journal definitions against original ECL dialogue and ${Object.keys(progressAddresses).length} progress flags through the translated setter`);
}

checkCampaignJournal();
console.log("translation checks passed");
