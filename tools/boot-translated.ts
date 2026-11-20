/**
 * Run translated START.EXE from its real entry, and the ECL/DAX loader
 * procedure, against the game files in POR_GAMEDATA. Prints the first
 * place the translation still stops.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Cpu } from "../src/cpu/machine.js";
import { attachDos, consoleText, dosLog, type BiosKey, type DosFile, type DosFileClosed } from "../src/runtime/dos.js";
import { intrCounts } from "../src/runtime/intr.js";
import { journalFrame, screen, videoSummary } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { findGameRoot, mountValjevoWallPieces } from "./gamedata.js";
import { currentObjective, journalInventoryLeads, observeAdventureLog, questProgress, type JournalLead } from "../src/runtime/adventure-log.js";
import { liveInput } from "./live-input.js";
import { openJournalProfile } from "./journal-profile.js";
import { stagePregenParty } from "./pregen-party.js";
import { isPartyFile, openSaveSlots, saveSlotLetter } from "./save-slots.js";
import { callTrace, disposeHits, dosAssigns, farCall, farCallObservers, getmemRing, resetFarBudget, spMax, spMin } from "../src/runtime/far.js";
import { installProgram, loadedSlices, overlayCallObservers } from "../src/runtime/overlay.js";
import { registerTranslated } from "../src/translated/register.js";
import { ovl07_0353 } from "../src/translated/ovl07.js";
import { OriginalSoundTraceRecorder } from "../src/runtime/sound-trace.js";
import { EclNarrationObserver, type ObserverManifest } from "../src/runtime/ecl-narration-observer.js";

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const gameFiles = mountValjevoWallPieces(readdirSync(root, { recursive: true, encoding: "utf8" })
  .filter((name) => !name.startsWith(".") && statSync(join(root, name)).isFile())
  .map((name) => ({ name, data: new Uint8Array(readFileSync(join(root, name))) })));
const files = process.env.POR_PREGEN_PARTY === "1" ? stagePregenParty(gameFiles) : gameFiles;

registerTranslated();

const replayPath = process.env.POR_BOOT_KEY_FILE;
const replayKeys = replayPath ? readFileSync(replayPath, "utf8").trim() : "";
const scheduledKeys = [replayKeys, process.env.POR_BOOT_KEYS ?? ""].join("\n")
  .split(/[,\s]+/).filter(Boolean).map((key) => {
    const match = /^(?:(\d+):)?([0-9a-f]{4})$/i.exec(key);
    if (!match || !Number.isSafeInteger(Number(match[1] ?? 0))) {
      throw new Error("Replay expects [step:]hex BIOS key words separated by commas or whitespace");
    }
    return { step: Number(match[1] ?? 0), word: Number.parseInt(match[2]!, 16) };
  }).sort((a, b) => a.step - b.step);

function fresh(requestKey?: (cpu: Cpu, keys: BiosKey[], blocking: boolean) => void,
  fileClosed?: DosFileClosed, mountedFiles = files, fileDeleted?: (name: string) => void,
  readCompanions?: (name: string) => DosFile[] | undefined): Cpu {
  const cpu = new Cpu();
  const exe = files.find((f) => f.name.toUpperCase() === "START.EXE");
  const ovr = files.find((f) => f.name.toUpperCase() === "GAME.OVR");
  if (!exe || !ovr) throw new Error("START.EXE and GAME.OVR are required");
  const boot = installProgram(cpu, exe.data, ovr.data);
  const capturePresentationDelay = input?.capturePresentationDelay;
  const capturePerspective = input?.capturePerspective;
  const captureEncounterDraw = input?.captureEncounterDraw;
  const captureCombatEffectUnderlay = input?.captureCombatEffectUnderlay;
  const combatEffectSegment = captureCombatEffectUnderlay && loadedSlices.find(({ index }) => index === 25)?.loadPara;
  const deathEffectSegment = captureCombatEffectUnderlay && loadedSlices.find(({ index }) => index === 32)?.loadPara;
  const deathDelaySegment = captureCombatEffectUnderlay && loadedSlices.find(({ index }) => index === 37)?.loadPara;
  const encounterSegment = captureEncounterDraw && loadedSlices.find(({ index }) => index === 29)?.loadPara;
  const viewportSegment = capturePerspective && loadedSlices.find(({ index }) => index === 36)?.loadPara;
  const localScenerySegment = capturePerspective && loadedSlices.find(({ index }) => index === 30)?.loadPara;
  const traceBattleDraw = process.env.POR_TRACE_BATTLE_DRAW === "1";
  const captureBattleTerrain = input?.captureBattleTerrain;
  const terrainDrawSegment = traceBattleDraw || captureBattleTerrain
    ? loadedSlices.find(({ index }) => index === 33)?.loadPara : undefined;
  if (capturePresentationDelay || viewportSegment !== undefined || terrainDrawSegment !== undefined) {
    const tick = cpu.tick;
    const terrainDraws = new Set<string>();
    cpu.tick = function (at) {
      // The overlay's first-person draw has finished writing the viewport.
      if (at === 0x1eb9 && this.cs === viewportSegment) {
        const localScenery = this.read16(this.ss, this.sp) === 0x0610 &&
          this.read16(this.ss, (this.sp + 2) & 0xffff) === localScenerySegment;
        capturePerspective?.(this, localScenery);
      }
      // Overlay 25 draws projectiles and impacts into the offscreen picture,
      // flips the visible buffer, and then enters the original EGA delay.
      if (this.steps >= liveStep &&
          ((this.cs === combatEffectSegment && (at === 0x1d27 || at === 0x1fea || at === 0x2169)) ||
           (this.cs === deathEffectSegment && at === 0x0f33))) captureCombatEffectUnderlay?.(this);
      if (at === 0x53d3 && this.cs === 0x512 && this.steps >= liveStep) {
        const returnOffset = this.read16(this.ss, this.sp);
        const returnSegment = this.read16(this.ss, (this.sp + 2) & 0xffff);
        const projectileDelay = returnSegment === combatEffectSegment &&
          (returnOffset === 0x1d3c || returnOffset === 0x2005 || returnOffset === 0x217c);
        // Overlay 32 displays the defeated unit's marker and pauses through overlay 37.
        const deathDelay = returnSegment === deathDelaySegment && returnOffset === 0x0c96 &&
          this.read16(this.ss, (this.sp + 8) & 0xffff) === 0x100b &&
          this.read16(this.ss, (this.sp + 10) & 0xffff) === deathEffectSegment;
        const effectDelay = projectileDelay || deathDelay;
        capturePresentationDelay?.(this, effectDelay);
      }
      // Some approach sequences refresh several native distances between inputs.
      if (at === 0x078a && this.cs === encounterSegment && this.steps >= liveStep) captureEncounterDraw?.(this);
      // The terrain routine writes to the guest's offscreen EGA surface.
      if (at === 0x014d && this.cs === terrainDrawSegment && this.steps >= liveStep && captureBattleTerrain &&
          this.read8(this.ds, 0x497e) === 1 && this.read8(this.ss, (this.sp + 4) & 0xffff) === 1) {
        captureBattleTerrain(this, this.read8(this.ss, (this.sp + 10) & 0xffff),
          this.read8(this.ss, (this.sp + 8) & 0xffff), this.read8(this.ss, (this.sp + 6) & 0xffff));
      }
      // The far entry draws a frame from one of the two SQRPACI blocks.
      if (traceBattleDraw && at === 0x00f1 && this.cs === terrainDrawSegment && this.steps >= liveStep) {
        const argument = (offset: number) => this.read8(this.ss, (this.sp + offset) & 0xffff);
        const signed = (value: number) => (value << 24) >> 24;
        const x = signed(argument(10)), y = signed(argument(8)), picture = argument(6), flags = argument(4);
        const block = picture & 0x80 ? 2 : 1, frame = picture & 0x7f;
        const draw = JSON.stringify({
          x, y, picture, flags, archive: "SQRPACI.DAX", block, frame,
        });
        if (!terrainDraws.has(draw)) {
          terrainDraws.add(draw);
          console.error(`POR_BATTLE_DRAW ${draw}`);
        }
      }
      tick.call(this, at);
    };
  }
  const keys = [...scheduledKeys];
  attachDos(cpu, mountedFiles, keys, requestKey && ((blocking) => requestKey(cpu, keys, blocking)),
    fileClosed, fileDeleted, readCompanions);
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
let transcriptStart = 0;
const profilePath = process.env.POR_JOURNAL_PROFILE;
const updateJournal = openJournalProfile(profilePath);
const journal = (transcript = adventureLog?.() ?? ""): JournalLead[] =>
  updateJournal(transcript.slice(transcriptStart), (known) => questProgress(cpu, known, 0x740));
const liveAt = process.env.POR_LIVE_AT;
const liveStep = Number(liveAt);
if (liveAt !== undefined && (!Number.isSafeInteger(liveStep) || liveStep < 0)) {
  throw new Error("POR_LIVE_AT must be a nonnegative integer");
}
if (liveAt !== undefined) mkdirSync("out", { recursive: true });
const recording = liveAt === undefined ? undefined : process.env.POR_RECORD_KEYS;
if (recording) {
  const prefix = scheduledKeys.map(({ step, word }) => `${step}:${word.toString(16).padStart(4, "0")}\n`).join("");
  writeFileSync(recording, prefix, { flag: "wx" });
}
const input = liveAt === undefined ? undefined : liveInput(liveStep, () => {
  const known = journal();
  return [...known, ...journalInventoryLeads(cpu, known, 0x740)];
}, recording);
const saves = input && openSaveSlots(process.env.POR_SAVE_DIR ??
  join("out", "saves", createHash("sha256").update(realpathSync(root)).digest("hex").slice(0, 16)));
const rosterClosed: DosFileClosed = (name, data, written) => { if (written) saves?.saveRoster(name, data); };
let slotClosed = rosterClosed;
let loadingSlot = false;
const mountedFiles = saves ? [...saves.mountRoster(files), ...saves.files] : files;
const cpu = fresh(input?.requestKey, (name, data, written) => slotClosed(name, data, written), mountedFiles,
  (name) => { if (slotClosed === rosterClosed) saves?.saveRoster(name); },
  (name) => loadingSlot && saveSlotLetter(name) ? saves?.partyFiles(name) ?? [] : undefined);
const soundTracePath = process.env.POR_SOUND_TRACE;
const browserSound = process.env.POR_BROWSER_PLAY === "1";
let narrationObserver: EclNarrationObserver | undefined;
if (browserSound) {
  const manifest = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as ObserverManifest;
  const narration = new EclNarrationObserver(manifest);
  overlayCallObservers.set(cpu, ({ sliceIndex, procedure }) => {
    const event = narration.observe(cpu, sliceIndex, procedure);
    if (event) console.log(`POR_NARRATION ${JSON.stringify(event)}`);
  });
  narrationObserver = narration;
}
const soundRecorder = soundTracePath || browserSound ? new OriginalSoundTraceRecorder(cpu, browserSound
  ? (call) => console.log(`POR_SOUND ${JSON.stringify(call)}`) : undefined) : undefined;
let soundTraceWritten = false;
function writeSoundTrace(): void {
  if (!soundTracePath || !soundRecorder || soundTraceWritten) return;
  soundTraceWritten = true;
  mkdirSync(dirname(soundTracePath), { recursive: true });
  writeFileSync(soundTracePath, JSON.stringify(soundRecorder.snapshot(), null, 2) + "\n");
}
if (soundRecorder) process.once("exit", writeSoundTrace);
if (input && saves) {
  const disk = loadedSlices.find((slice) => slice.index === 17);
  if (!disk) throw new Error("Missing translated save overlay");
  disk.procs = new Map(disk.procs);
  // Load, save, and save-and-exit entry points in the original disk overlay.
  for (const offset of [0x159d, 0x1ced, 0x2265]) {
    const procedure = disk.procs.get(offset);
    if (!procedure) throw new Error(`Missing translated save procedure ${offset.toString(16)}`);
    disk.procs.set(offset, (m) => {
      const loading = offset === 0x159d;
      const start = adventureLog?.().length ?? 0;
      let slot: { name: string; data: Uint8Array } | undefined;
      const party = new Map<string, DosFile>();
      const previous = slotClosed;
      const wasLoading = loadingSlot;
      loadingSlot = loading;
      slotClosed = (name, data, written) => {
        if (saveSlotLetter(name) && data.length && written !== loading) slot = { name, data };
        if (!loading && written && isPartyFile(name)) party.set(name, { name, data });
      };
      const finish = () => {
        if (!slot) return;
        const letter = saveSlotLetter(slot.name);
        if (loading) {
          const saved = saves.get(slot.name);
          transcriptStart = start;
          updateJournal.restore(saved?.leads ?? []);
          input.restoreTracked(saved?.tracked);
        } else {
          saves.save(slot.name, slot.data, journal(), input.tracked(), [...party.values()]);
        }
        if (letter) console.log(`POR_SAVE_SLOT ${loading ? "load" : "save"} ${letter}`);
      };
      input.enterDiskMenu();
      try {
        procedure(m);
        finish();
      } catch (error) {
        if (offset === 0x2265 && error instanceof Error && /^dos exit \d+$/.test(error.message)) finish();
        throw error;
      } finally {
        input.leaveDiskMenu();
        slotClosed = previous;
        loadingSlot = wasLoading;
      }
    });
  }
}
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
const journalSlice = loadedSlices.find((slice) => slice.index === 3);
adventureLog = (process.env.POR_ADVENTURE_LOG === "1" || browserSound || liveAt !== undefined || profilePath) && journalSlice
  ? observeAdventureLog(cpu, journalSlice, loadedSlices.find((slice) => slice.index === 16),
    browserSound ? (message) => {
      console.log(`POR_TEXT ${JSON.stringify({ step: cpu.steps, message })}`);
      const event = narrationObserver?.observeRenderedText(cpu, message);
      if (event) console.log(`POR_NARRATION ${JSON.stringify(event)}`);
    } : undefined)
  : undefined;
if (input && process.env.POR_BROWSER_PLAY === "1") {
  const title = loadedSlices.find((slice) => slice.index === 1);
  const observe = farCallObservers.get(cpu);
  farCallObservers.set(cpu, (segment, offset) => {
    observe?.(segment, offset);
    if (!title || cpu.cs !== title.loadPara) return;
    if (segment === 0x18e && offset === 0x5c) {
      if (cpu.ip === 0x675) input.setScene("scene:publisher");
      if (cpu.ip === 0x6e9) input.setScene("scene:title");
    }
    if (segment === 0x26b && offset === 0xf6 && cpu.ip === 0x7f7) input.setScene(undefined);
  });
}
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
