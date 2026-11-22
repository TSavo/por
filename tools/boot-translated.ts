/**
 * Run translated START.EXE from its real entry, and the ECL/DAX loader
 * procedure, against the game files in POR_GAMEDATA. Prints the first
 * place the translation still stops.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Cpu } from "../src/cpu/machine.js";
import { openAutomap } from "./automap.js";
import { attachDos, consoleText, dosLog, noon, timeOfDay, type BiosKey, type DosFile, type DosFileClosed } from "../src/runtime/dos.js";
import { intrCounts } from "../src/runtime/intr.js";
import { journalFrame, screen, videoSummary } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { findGameRoot, gameFiles as readGameFiles, isPortGameRoot, mountValjevoWallPieces, portGame, usePortPaths } from "./gamedata.js";
import { currentObjective, journalInventoryLeads, observeAdventureLog, questProgress, type JournalLead } from "../src/runtime/adventure-log.js";
import { liveInput } from "./live-input.js";
import { openJournalProfile } from "./journal-profile.js";
import { stagePregenParty } from "./pregen-party.js";
import { isPartyFile, openSaveSlots, saveSlotLetter } from "./save-slots.js";
import { callTrace, exeByImage, farCall, farCallObservers, resetFarBudget, spMax, spMin } from "../src/runtime/far.js";
import { installImage, installProgram, loadedSlices } from "../src/runtime/overlay.js";
import { behaviour, code, codeSegment, data, far, previousRandomSeed, isAt, isFar, loadTranslation, procedure, returnsTo, segment as unit, startupInput } from "../src/runtime/bindings.js";
import { OriginalSoundTraceRecorder } from "../src/runtime/sound-trace.js";
import { EclNarrationObserver, eclTextOpcodes, type ObserverManifest } from "../src/runtime/ecl-narration-observer.js";
import { standaloneTrace } from "./standalone-trace.js";
import { narrationLedger } from "./narration-ledger.js";

// The browser server reads frames from this process's stdout pipe. Node writes
// to a pipe asynchronously on macOS and Linux, and this process blocks reading
// the next key before a large frame is flushed. Blocking writes keep each
// frame ahead of the read that waits for its answer.
(process.stdout as unknown as { _handle?: { setBlocking?: (blocking: boolean) => void } })
  ._handle?.setBlocking?.(true);

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
// With no original files supplied the game runs from the port's own data, which holds no program file:
// the memory image comes from it directly.
const port = isPortGameRoot(root) ? portGame(root) : undefined;
const portProgram = port?.program;
const gameFiles = usePortPaths(mountValjevoWallPieces(readGameFiles(root)));
const files = process.env.POR_PREGEN_PARTY === "1" ? stagePregenParty(gameFiles) : gameFiles;

const overlayFile = files.find((f) => f.name.toUpperCase() === "GAME.OVR");
if (!overlayFile) throw new Error("GAME.OVR is required");
await loadTranslation(overlayFile.data);
if (process.env.POR_CLOCK !== "real" && behaviour.extraStartupDraws > 0) {
  // A replay starts every build on the same dice. This build draws extra numbers before play
  // begins, so its seed starts that many steps earlier and play begins where the first release's does.
  const randomize = procedure(code.randomize);
  exeByImage.set(code.randomize.at, (m) => {
    randomize(m);
    let seed = (m.read16(m.ds, data.randSeed + 2) << 16 | m.read16(m.ds, data.randSeed)) >>> 0;
    for (let draw = 0; draw < behaviour.extraStartupDraws; draw++) seed = previousRandomSeed(seed);
    m.write16(m.ds, data.randSeed, seed & 0xffff);
    m.write16(m.ds, data.randSeed + 2, seed >>> 16);
  });
}

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
  if (!ovr || (!exe && !portProgram)) throw new Error("START.EXE and GAME.OVR are required");
  const boot = portProgram ? installImage(cpu, portProgram, ovr.data) : installProgram(cpu, exe!.data, ovr.data);
  // POR_TRACE_STANDALONE: record which bytes of the loaded program the game reads. Observes only.
  standaloneTrace?.traceMemory(cpu, boot, unit.data, loadedSlices);
  const capturePresentationDelay = input?.capturePresentationDelay;
  const capturePerspective = input?.capturePerspective;
  const captureEncounterDraw = input?.captureEncounterDraw;
  const captureCombatEffectUnderlay = input?.captureCombatEffectUnderlay;
  const traceBattleDraw = process.env.POR_TRACE_BATTLE_DRAW === "1";
  const captureBattleTerrain = input?.captureBattleTerrain;
  const nativeCombat = input?.nativeCombat;
  const nativePicture = input?.nativePicture;
  const picturePresentation = nativePicture ? code.pictureMemberPresented : undefined;
  const nativeBattleTerrain = input?.nativeBattleTerrain;
  const nativeSelection = input?.nativeSelection;
  const selectionReturn = code.combatSelectionDrawResumes;
  const codeWheel = input && process.env.POR_BROWSER_PLAY === "1" ? startupInput.codeWheel : undefined;
  if (capturePresentationDelay || capturePerspective || traceBattleDraw || captureBattleTerrain ||
      codeWheel || nativeCombat || nativeSelection || nativeBattleTerrain || nativePicture) {
    const tick = cpu.tick;
    const terrainDraws = new Set<string>();
    // Above the pause routine's return address sit its argument, its saved BP and its own return address.
    const deathReturnDepth = 8;
    cpu.tick = function (at) {
      if (picturePresentation && at === picturePresentation.at && isAt(this, at, picturePresentation)) {
        nativePicture?.presented(this);
      }
      if (codeWheel && isAt(this, at, codeWheel.beforeRead)) {
        input?.setCodeWheelQuestion(
          this.read8(this.ss, (this.bp + codeWheel.questionOffset) & 0xffff),
          this.read8(this.ss, (this.bp + codeWheel.attemptOffset) & 0xffff),
        );
      }
      if (codeWheel && isAt(this, at, codeWheel.afterRead)) input?.setCodeWheelQuestion(undefined);
      if (nativeCombat && this.steps >= liveStep) {
        if (isAt(this, at, code.combatPictureLoad)) nativeCombat.load(this);
        if (isAt(this, at, code.combatPictureDraw)) nativeCombat.draw(this);
      }
      if (nativeSelection && selectionReturn && this.steps >= liveStep && isAt(this, at, code.combatPictureDraw) &&
          returnsTo(this, 0, selectionReturn)) nativeSelection.draw(this);
      if (nativeBattleTerrain && isAt(this, at, code.battleTerrainSheetCopied)) nativeBattleTerrain.copySheet(this);
      // The first-person draw has finished writing the viewport.
      if (capturePerspective && isAt(this, at, code.viewportDrawn)) {
        capturePerspective(this, returnsTo(this, 0, code.localSceneryResumes));
      }
      // The combat effect code draws projectiles and impacts into the offscreen
      // picture, flips the visible buffer, and then enters the original EGA delay.
      if (captureCombatEffectUnderlay && this.steps >= liveStep &&
          (isAt(this, at, code.effectShownA) || isAt(this, at, code.effectShownB) || isAt(this, at, code.effectShownC) ||
           isAt(this, at, code.deathShown))) captureCombatEffectUnderlay(this);
      if (isAt(this, at, code.delayLoop) && this.steps >= liveStep) {
        const projectileDelay = captureCombatEffectUnderlay !== undefined &&
          (returnsTo(this, 0, code.effectPausedA) || returnsTo(this, 0, code.effectPausedB) || returnsTo(this, 0, code.effectPausedC));
        // The death routine displays the defeated unit's marker and pauses through the pause routine.
        const deathDelay = captureCombatEffectUnderlay !== undefined &&
          returnsTo(this, 0, code.pauseResumes) && returnsTo(this, deathReturnDepth, code.deathResumes);
        const effectDelay = projectileDelay || deathDelay;
        // The two message routines print on the bottom line and pause through the pause routine, then
        // clear the line. The pause's length is Delay's argument, just above its return address.
        const messageMs = returnsTo(this, 0, code.pauseResumes) &&
          (returnsTo(this, deathReturnDepth, code.messageResumes) || returnsTo(this, deathReturnDepth, code.colouredMessageResumes))
          ? this.read16(this.ss, (this.sp + 4) & 0xffff) : undefined;
        capturePresentationDelay?.(this, effectDelay, messageMs);
      }
      // Some approach sequences refresh several native distances between inputs.
      if (captureEncounterDraw && isAt(this, at, code.encounterDrawn) && this.steps >= liveStep) captureEncounterDraw(this);
      // The terrain routine writes to the guest's offscreen EGA surface.
      if ((captureBattleTerrain || nativeCombat || nativeSelection || nativeBattleTerrain) && isAt(this, at, code.terrainDrawn) &&
          this.steps >= liveStep && this.read8(this.ds, data.offscreenDraw) === 1) {
        const column = this.read8(this.ss, (this.sp + 10) & 0xffff);
        const row = this.read8(this.ss, (this.sp + 8) & 0xffff);
        const picture = this.read8(this.ss, (this.sp + 6) & 0xffff);
        nativeCombat?.overwriteTile(column, row);
        nativeSelection?.overwriteTile(column, row);
        nativeBattleTerrain?.draw(column, row, picture);
        if (captureBattleTerrain && this.read8(this.ss, (this.sp + 4) & 0xffff) === 1) {
          captureBattleTerrain(this, column, row, picture);
        }
      }
      // The far entry draws a frame from one of the two SQRPACI blocks.
      if (traceBattleDraw && isAt(this, at, code.terrainEntry) && this.steps >= liveStep) {
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
  if (process.env.POR_TRACE_DICE === "1") {
    // One line for every random number the game draws: who asked, the range, and the number drawn.
    // The caller is named by overlay slice and offset, or by resident segment and offset.
    // The number is read from AX after the game's own Random has returned; nothing is written.
    const tick = cpu.tick;
    let pending: string | undefined;
    const report = (value?: number) => {
      if (pending !== undefined) console.error(value === undefined ? pending : `${pending} value ${value}`);
      pending = undefined;
    };
    cpu.tick = function (at) {
      if (isAt(this, at, code.nextRandom)) {
        // A draw that did not come through Random(n) is reported without a value, before the next one.
        report();
        const offset = this.read16(this.ss, (this.sp + 2) & 0xffff), segment = this.read16(this.ss, (this.sp + 4) & 0xffff);
        const slice = loadedSlices.find(({ loadPara }) => loadPara === segment);
        const caller = slice ? `slice ${slice.index}+${offset.toString(16)}` : `${segment.toString(16)}:${offset.toString(16)}`;
        pending = `POR_DICE ${this.steps} ${caller} range ${this.read16(this.ss, (this.sp + 6) & 0xffff)}`;
      }
      tick.call(this, at);
    };
    const random = procedure(code.random);
    exeByImage.set(code.random.at, (m) => {
      random(m);
      report(m.ax);
    });
  }
  const keys = [...scheduledKeys];
  attachDos(cpu, mountedFiles, keys, requestKey && ((blocking) => requestKey(cpu, keys, blocking)),
    fileClosed, fileDeleted, readCompanions,
    process.env.POR_CLOCK === "real" ? timeOfDay() : noon);
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
  updateJournal(transcript.slice(transcriptStart), (known) => questProgress(cpu, known, unit.data));
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
const automap = liveAt === undefined ? undefined : openAutomap(root);
// POR_NARRATION_LEDGER: opened before the display reads its artwork list. Observes only.
if (process.env.POR_BROWSER_PLAY === "1") narrationLedger?.open();
const input = liveAt === undefined ? undefined : liveInput(liveStep, () => {
  const known = journal();
  return [...known, ...journalInventoryLeads(cpu, known, unit.data)];
}, recording, automap, Boolean(port), port?.data.pictures);
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
const eclTextHandlers: boolean[] = [];
if (browserSound) {
  const manifest = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as ObserverManifest;
  const narration = new EclNarrationObserver(manifest);
  // POR_NARRATION_LEDGER: record every narration decision. Observes only.
  narrationLedger?.observe(narration, manifest);
  cpu.onEclInstruction = entering => {
    if (!entering) {
      eclTextHandlers.pop();
      return;
    }
    eclTextHandlers.push(eclTextOpcodes.has(cpu.read8(cpu.ds, data.eclOpcode)));
    const event = narration.observe(cpu);
    if (event) console.log(`POR_NARRATION ${JSON.stringify(event)}`);
  };
  narrationObserver = narration;
}
const soundRecorder = soundTracePath || browserSound ? new OriginalSoundTraceRecorder(cpu, browserSound
  ? (call) => {
    standaloneTrace?.sound(call.index);
    console.log(`POR_SOUND ${JSON.stringify(call)}`);
  } : undefined) : undefined;
let soundTraceWritten = false;
function writeSoundTrace(): void {
  if (!soundTracePath || !soundRecorder || soundTraceWritten) return;
  soundTraceWritten = true;
  mkdirSync(dirname(soundTracePath), { recursive: true });
  writeFileSync(soundTracePath, JSON.stringify(soundRecorder.snapshot(), null, 2) + "\n");
}
if (soundRecorder) process.once("exit", writeSoundTrace);
if (input && saves) {
  const diskSlice = code.loadGame.slice;
  const disk = loadedSlices.find(({ index }) => index === diskSlice);
  if (!disk) throw new Error("Missing translated save overlay");
  disk.procs = new Map(disk.procs);
  // Load, save, and save-and-exit entry points in the original disk overlay.
  for (const entry of [code.loadGame, code.saveGame, code.saveAndLeave]) {
    const offset = entry.at;
    const original = disk.procs.get(offset);
    if (!original) throw new Error(`Missing translated save procedure ${offset.toString(16)}`);
    disk.procs.set(offset, (m) => {
      const loading = entry === code.loadGame;
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
          automap?.restore(saved?.automap);
        } else {
          saves.save(slot.name, slot.data, journal(), input.tracked(), [...party.values()], automap?.snapshot());
        }
        if (letter) console.log(`POR_SAVE_SLOT ${loading ? "load" : "save"} ${letter}`);
      };
      input.enterDiskMenu();
      try {
        original(m);
        finish();
      } catch (error) {
        if (entry === code.saveAndLeave && error instanceof Error && /^dos exit \d+$/.test(error.message)) finish();
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
  // The frame state names the code-wheel question while the game asks it. The game picks the
  // question with Random(13) inside its code-wheel routine, and the number Random returns is the
  // question's place in the game's table. Nothing here writes to the game's memory.
  const wheel = JSON.parse(readFileSync(new URL("../src/codewheel/wheel.json", import.meta.url), "utf8")) as
    { questions: { number: number; espruar: string; dethek: string; path: string }[] };
  const wheelSlice = loadedSlices.find(({ index }) => index === code.codeWheel.slice);
  const ask = wheelSlice?.procs.get(code.codeWheel.at);
  if (wheelSlice && ask) {
    wheelSlice.procs = new Map(wheelSlice.procs);
    wheelSlice.procs.set(code.codeWheel.at, (m) => {
      try { ask(m); } finally { input.setCodeWheel(undefined); }
    });
    const random = procedure(code.random);
    exeByImage.set(code.random.at, (m) => {
      const forWheel = returnsTo(m, 0, code.codeWheelQuestionDrawn);
      random(m);
      if (!forWheel) return;
      const question = wheel.questions.find(({ number }) => number === m.ax);
      input.setCodeWheel(question && { number: question.number, espruar: question.espruar, dethek: question.dethek, path: question.path });
    });
  }
}
const journalSlice = loadedSlices.find(({ index }) => index === code.eclLoop.slice);
adventureLog = (process.env.POR_ADVENTURE_LOG === "1" || browserSound || liveAt !== undefined || profilePath) && journalSlice
  ? observeAdventureLog(cpu, journalSlice, loadedSlices.find(({ index }) => index === code.trainerRefusedA.slice),
    (message) => {
      // Capture the seal's state before the original menu can resolve the offer.
      if (message.includes("WE CAN DUPLICATE THE SEAL ON THAT CHEST")) journal();
      if (!browserSound) return;
      const fromEclText = eclTextHandlers.at(-1) === true;
      console.log(`POR_TEXT ${JSON.stringify({ step: cpu.steps, message, fromEclText })}`);
      narrationLedger?.text(cpu.steps, message, fromEclText);
      const event = fromEclText ? narrationObserver?.observeRenderedText(cpu, message) : undefined;
      if (event) console.log(`POR_NARRATION ${JSON.stringify(event)}`);
    })
  : undefined;
if (input && process.env.POR_BROWSER_PLAY === "1") {
  const observe = farCallObservers.get(cpu);
  farCallObservers.set(cpu, (segment, offset) => {
    observe?.(segment, offset);
    if (input.nativePicture && isAt(cpu, cpu.ip, code.pictureMember)) input.nativePicture.load(cpu);
    if (input.nativePicture && isAt(cpu, cpu.ip, code.pictureMemberRelease)) input.nativePicture.release(cpu);
    // The clear before the battle music branch runs in every hardware mode.
    // Where the game itself asks for event 14, on Tandy in the first release, it is not sent twice.
    if (isAt(cpu, cpu.ip, code.battleBegins) && isFar(segment, offset, far.clearText)) {
      input.nativeCombat?.reset();
      input.nativeSelection?.reset();
      input.nativeBattleTerrain?.reset();
      const mode = cpu.read8(cpu.ds, data.soundMode);
      if (mode !== 0 || !behaviour.startsBattleMusicOnTandy) console.log(`POR_SOUND ${JSON.stringify({ index: 14, mode, step: cpu.steps, enhancedOnly: true })}`);
    }
    if (isFar(segment, offset, far.showPicture)) {
      if (isAt(cpu, cpu.ip, code.titlePublisher)) input.setScene("scene:publisher");
      if (isAt(cpu, cpu.ip, code.titleTitle)) input.setScene("scene:title");
    }
    if (isFar(segment, offset, far.flushKeys) && isAt(cpu, cpu.ip, code.titleDone)) input.setScene(undefined);
  });
}
if (input && !behaviour.flushKeysDiscardsTypeAhead) {
  const observe = farCallObservers.get(cpu);
  farCallObservers.set(cpu, (segment, offset) => {
    observe?.(segment, offset);
    if (isFar(segment, offset, far.flushKeys)) input.legacyFlush(cpu);
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
// Without a live session, also run the script loader on a fresh machine.
const loaderSegment = codeSegment(code.eclLoad);
if (loaderSegment === undefined) throw new Error("the script overlay was not loaded");
const loader = fresh();
loader.ds = 0x2000;
loader.ss = 0x2000;
loader.sp = 0xff00;
loader.cs = loaderSegment;
loader.stepBudget = 2_000_000;
resetFarBudget(8000);
try {
  loader.push(0);
  procedure(code.eclLoad)(loader);
  console.log("the script loader returned");
} catch (error) {
  report("script loader", error);
}
