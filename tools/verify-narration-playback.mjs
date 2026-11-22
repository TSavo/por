import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

// Narration, as Chrome played it.
//
//   npm run verify:narration-playback -- <chrome> [--break=ended|overlap]
//
// From a fresh start on version 1.3 this makes one character and takes Rolf's tour of New Phlan:
// eight narrated passages in a row. It presses keys the way a player does, as keydown events on
// the page, so the page's own key handling decides what happens to the voice. It reads the page's
// playback log (tools/play.js, window.porNarrationPlayback) and the runner's narration ledger.
//
// Pass 1 waits for every line to finish before pressing on, and requires of each tour unit:
// the page was told to play exactly what the runner selected, in order, each unit once (a covered
// print would start nothing; the tour's units cover no print but their own, so none is reached);
// the recording started, ran in real time and ended at its full length; no two voices overlapped;
// one Enhanced artwork was on screen from the line's start to its end; and the passage was
// spoken once, at once (no other recording of the same text spoke first).
//
// Pass 2 presses Enter three seconds into each line. The owner's policy (the narration manifest:
// "subsequentNarrationQueuesAfterCurrent") and the page's key handling say Enter lets the line run
// on and the next one waits its turn, so it requires: the line pressed over ran to its end or was
// stopped at that key press; the next unit started from its beginning and was not dropped; no two
// voices overlapped. Then it presses a key that is not Enter and requires the line to stop at
// once, with nothing left sounding or queued, and the next passage's line to start cleanly.
//
// --break shows the check red: `ended` drops the player's handling of a recording's end, so the
// next line never starts; `overlap` lets the queue start a line while another is playing. A broken
// run makes pass 1 only.
// Every failure is printed; the check exits 1 if there is any. Evidence stays in out/.

const chromePath = process.argv[2];
assert.ok(chromePath && !chromePath.startsWith("--"), "Pass the path to Chrome.");
const broken = process.argv.find((argument) => argument.startsWith("--break="))?.slice(8);
assert.ok(!broken || ["ended", "overlap"].includes(broken), "--break takes ended or overlap");
mkdirSync("out", { recursive: true });
const directory = resolve(mkdtempSync(join("out", "narration-playback-")));
/** Seconds a recording's end, its real-time length and a key's effect may differ from the exact value. */
const tolerance = 0.5;
const failures = [];
const fail = (message) => { failures.push(message); console.log(`  FAIL ${message}`); };
const short = (unitId) => unitId.replace("por.voice.", "");
const isTour = (line) => /^por\.voice\.ecl3\.b0-b[0-9a-f]{3}$/.test(line.unitId);

const domKey = { enter: "Enter", left: "ArrowLeft" };
const textOf = (frame) => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return cells.join("").toLowerCase().replace(/ +/g, " ");
};

/** The key a player presses on this screen to make one character and follow Rolf. */
function nextKey(text) {
  if (/keep this character\?/.test(text)) return "y";
  if (/character name: *$/.test(text)) return "a";
  if (/character name: a *$/.test(text)) return "enter";
  if (/head body keep/.test(text)) return "k";
  if (/parts color-1 color-2 size exit/.test(text)) return "e";
  if (/is this icon ok\?/.test(text)) return "y";
  if (/add a character: add exit/.test(text)) return /\* a\b/.test(text) ? "e" : "a";
  if (/begin adventuring/.test(text)) return "b";
  if (/add character to party/.test(text)) return "a";
  if (/yes no *$/.test(text)) return "y";
  return "enter";
}

async function openLeg(name) {
  process.env.POR_NARRATION_LEDGER = join(directory, `${name}.jsonl`);
  process.env.POR_NARRATION_RUN = `verify-narration-playback-${name}`;
  // On a busy machine the play server can take longer to start than the harness waits.
  let chrome;
  for (let attempt = 0; !chrome; attempt++) chrome = await openChromeCampaignLeg({
    chromePath, directory: join(directory, attempt ? `${name}-attempt-${attempt + 1}` : name), checkpointDir: directory,
    // The boot keys are the campaign opening's, which needs its input mode: there a press can be
    // spent when the game empties its keyboard buffer, so every key below is chosen from the text
    // on screen and pressed again if the screen did not move.
    bootKeys: "31000000:1c0d,45000000:2e63", startAt: "50000000",
  }).catch((error) => { if (attempt === 4) throw error; });
  if (broken === "ended") {
    // The player listens for a recording's end with { once: true }; the playback log does not.
    await chrome.evaluate(`(() => {
      const add = HTMLMediaElement.prototype.addEventListener;
      HTMLMediaElement.prototype.addEventListener = function (type, listener, options) {
        if (type === "ended" && options?.once) return;
        return add.call(this, type, listener, options);
      };
    })()`);
  }
  if (broken === "overlap") {
    await chrome.evaluate(`playNextNarration = () => { const line = narrationQueue.shift(); if (line) beginVoice(line); }`);
  }
  const playback = () => chrome.evaluate("porNarrationPlayback()");
  let frame = await chrome.nextFrame();
  return {
    chrome, playback,
    get frame() { return frame; },
    /** A keydown on the page, as a player's key press arrives. `advances` waits for the game's next frame. */
    async press(key, advances = true) {
      const event = JSON.stringify({ key: domKey[key] ?? key, bubbles: true, cancelable: true });
      for (const deadline = Date.now() + 30_000; ;) {
        const pressed = await chrome.evaluate(`(() => {
          if (state.sequence !== ${frame.sequence}) throw new Error("The game advanced before input");
          if (!state.ready || posting || renderingSequence === state.sequence) return false;
          window.dispatchEvent(new KeyboardEvent("keydown", ${event}));
          return true;
        })()`);
        if (pressed) break;
        assert.ok(Date.now() < deadline, `The page never accepted ${key}`);
        await delay(40);
      }
      if (!advances) return;
      // The game can take longer than the harness waits to print a passage on a busy machine.
      for (let attempt = 0; ; attempt++) {
        try { frame = await chrome.nextFrame(); return; }
        catch (error) { if (attempt === 3 || !/Timed out/.test(error.message)) throw error; }
      }
    },
    /** Take the frame the game drew by itself. */
    async sync() { frame = await chrome.nextFrame(); },
    /** Wait until `done(log)` holds. Returns the log, or undefined after `seconds`. */
    async until(done, seconds = 90) {
      for (const deadline = Date.now() + seconds * 1000; Date.now() < deadline; await delay(100)) {
        const log = await playback();
        if (done(log)) return log;
      }
    },
  };
}

const silent = (log) => !log.queued && !log.sounding && log.lines.every((line) => line.outcome);
const ledgerOf = (name) => readFileSync(join(directory, `${name}.jsonl`), "utf8").split("\n").filter(Boolean)
  .map((line) => JSON.parse(line)).filter((line) => line.t === "n");

function report(lines) {
  for (const line of lines) {
    console.log(`  ${short(line.unitId).padEnd(18)} waited ${line.startedAt === undefined ? "    -" : (line.startedAt - line.queuedAt).toFixed(2).padStart(5)}s  ` +
      `${line.outcome ?? "unfinished"}${line.reason ? ` (${line.reason})` : ""} at ${line.position?.toFixed(2) ?? "-"}s of ${line.duration ?? "-"}s  ` +
      `art ${(line.artSeen ?? []).map((key) => key ?? "none").join(" then ") || "-"}` +
      `${line.behindVoiceLine ? `  after ${line.behindVoiceLine}` : ""}${line.startedOver ? `  OVER ${line.startedOver.join(",")}` : ""}`);
  }
}

function requireNoOverlap(lines) {
  for (const line of lines) {
    if (line.startedOver?.length) fail(`${short(line.unitId)} started while ${line.startedOver.join(", ")} was still playing`);
    if (line.talkedOverBy !== undefined) fail(`${short(line.unitId)} was talked over by ${line.talkedOverBy}`);
  }
  const played = lines.filter((line) => line.startedAt !== undefined && line.endedAt !== undefined);
  for (const [index, line] of played.entries()) {
    const next = played[index + 1];
    if (next && next.startedAt < line.endedAt - 0.02) fail(`${short(next.unitId)} started ${(line.endedAt - next.startedAt).toFixed(2)}s before ${short(line.unitId)} ended`);
  }
}

function requireSelectedWerePlayed(name, lines) {
  const ledger = ledgerOf(name);
  const selected = ledger.filter((line) => line.outcome === "heard");
  assert.deepEqual(lines.map((line) => line.asset), selected.map((line) => line.asset),
    "The page was not told to play exactly what the runner selected, in order");
  return { selected, covered: ledger.filter((line) => line.outcome === "covered") };
}

// ---- pass 1: wait for every line -----------------------------------------------------------------------------------
console.log(`Pass 1: wait for every line to finish before pressing on${broken ? ` (broken on purpose: ${broken})` : ""}`);
{
  const leg = await openLeg("waiting");
  let log;
  try {
    for (let presses = 0; presses < 80; presses++) {
      // A narration is sent with the frame that prints its text; give the page a moment to queue it.
      await delay(300);
      log = await leg.until(silent);
      if (!log) { log = await leg.playback(); fail(`the narration did not finish within 90s at "${textOf(leg.frame).slice(-80).trim()}"`); break; }
      const text = textOf(leg.frame);
      if (/our tour is ended/.test(text) && /area cast view encamp search look/.test(text)) break;
      await leg.press(nextKey(text));
    }
    log ??= await leg.playback();
  } finally { await leg.chrome.close(); }
  writeFileSync(join(directory, "waiting-playback.json"), JSON.stringify(log, null, 1) + "\n");
  report(log.lines);
  const { covered } = requireSelectedWerePlayed("waiting", log.lines);
  const tour = log.lines.filter(isTour);
  if (tour.length !== 8) fail(`expected the 8 passages of Rolf's tour, the page was told to play ${tour.length}`);
  // The page was told exactly what the runner selected, so a covered print the route reached started nothing.
  console.log(`  covered prints reached: ${covered.length}${covered.length ? "" : " (the tour's units cover no print but their own: that a covered print starts nothing is not shown here)"}`);
  for (const unit of new Set(tour.map((line) => line.unitId))) {
    if (tour.filter((line) => line.unitId === unit).length > 1) fail(`${short(unit)} was started more than once`);
  }
  for (const line of tour) {
    const name = short(line.unitId);
    if (line.startedAt === undefined) { fail(`${name} never started${line.reason ? `: ${line.reason}` : ""}`); continue; }
    if (line.outcome !== "ended") { fail(`${name} did not play to its end: ${line.outcome ?? "still playing"}${line.reason ? ` (${line.reason})` : ""} at ${line.position?.toFixed(2)}s of ${line.duration}s`); continue; }
    if (Math.abs(line.position - line.duration) > tolerance) fail(`${name} ended at ${line.position}s of ${line.duration}s`);
    const elapsed = line.endedAt - line.startedAt;
    if (Math.abs(elapsed - line.duration) > tolerance) fail(`${name} took ${elapsed.toFixed(2)}s to play ${line.duration}s: it did not run in real time`);
    if (line.pauses) fail(`${name} was paused ${line.pauses} times while it played`);
    if (line.artSeen.length !== 1 || !line.artSeen[0] || line.artAtEnd !== line.artSeen[0]) {
      fail(`${name} did not keep one artwork on screen: ${[...line.artSeen, line.artAtEnd].map((key) => key ?? "none").join(" then ")}`);
    }
    if (line.behindVoiceLine) {
      fail(`${name} was spoken twice: ${line.behindVoiceLine} read the passage first and the unit waited ${(line.startedAt - line.queuedAt).toFixed(1)}s for it`);
    } else if (line.startedAt - line.queuedAt > tolerance) fail(`${name} started ${(line.startedAt - line.queuedAt).toFixed(2)}s after it was queued with nothing before it`);
  }
  requireNoOverlap(log.lines);
}

// ---- pass 2: press on early ----------------------------------------------------------------------------------------
if (!broken) console.log("Pass 2: press Enter three seconds into each line, then stop one with another key");
if (!broken) {
  const leg = await openLeg("pressing");
  /** The newest narration, once it has been playing for `seconds`. */
  const playingFor = (seconds) => (log) => log.lines.at(-1)?.position >= seconds && !log.lines.at(-1).outcome;
  let log;
  const pressedOver = [];
  let stopped, afterStop;
  try {
    for (let presses = 0; presses < 60 && !/i will start the tour/.test(textOf(leg.frame)); presses++) await leg.press(nextKey(textOf(leg.frame)));
    assert.match(textOf(leg.frame), /i will start the tour/);
    /** Press on until the page is told to play another narration. A press can be spent (see openLeg). */
    const pressOn = async (count) => {
      for (let presses = 0; presses < 6; presses++) {
        await leg.press(nextKey(textOf(leg.frame)));
        if (await leg.until((now) => now.lines.length > count, 4)) return true;
      }
      return false;
    };
    while (pressedOver.length < 4) {
      const before = await leg.until(playingFor(3));
      if (!before) { fail(`no narration was playing three seconds into passage ${pressedOver.length + 1}`); break; }
      pressedOver.push({ id: before.lines.at(-1).id, at: before.at });
      if (!await pressOn(before.lines.length)) { fail(`pressing on from passage ${pressedOver.length} reached no further narration`); break; }
    }
    // A key that is not Enter or Space stops the voice (tools/play.js keydown). The game ignores it here.
    const before = await leg.until(playingFor(3));
    if (before) {
      await leg.press("left", false);
      await delay(400);
      const now = await leg.playback();
      stopped = { before: before.lines.at(-1), now: now.lines.find((line) => line.id === before.lines.at(-1).id), sounding: now.sounding, queued: now.queued, lines: now.lines.length };
      if (await leg.chrome.evaluate("state.sequence") !== leg.frame.sequence) await leg.sync();
      await pressOn(now.lines.length);
      await leg.until(silent);
      afterStop = (await leg.playback()).lines.filter((line) => line.id > stopped.before.id);
    } else fail("no narration was playing to stop with a key");
    log = await leg.playback();
  } finally { await leg.chrome.close(); }
  writeFileSync(join(directory, "pressing-playback.json"), JSON.stringify(log, null, 1) + "\n");
  report(log.lines);
  requireSelectedWerePlayed("pressing", log.lines);
  requireNoOverlap(log.lines);
  for (const { id, at } of pressedOver) {
    const line = log.lines.find((entry) => entry.id === id);
    const name = short(line.unitId);
    const ranOn = line.outcome === "ended" && Math.abs(line.position - line.duration) <= tolerance;
    const stoppedByKey = line.outcome === "stopped" && /^key /.test(line.reason) && Math.abs(line.endedAt - at) <= 1;
    if (!ranOn && !stoppedByKey) fail(`${name}, pressed over with Enter, neither ran to its end nor stopped at the key: ` +
      `${line.outcome ?? "unfinished"}${line.reason ? ` (${line.reason})` : ""} at ${line.position?.toFixed(2)}s of ${line.duration}s`);
    const next = log.lines.find((entry) => entry.id === id + 1);
    if (!next) fail(`no narration followed ${name}`);
    else if (next.startedAt === undefined) fail(`${short(next.unitId)}, the line after ${name}, never started: ${next.reason ?? "still waiting"}`);
    else if (next.startedAt < line.endedAt - 0.02) fail(`${short(next.unitId)} started before ${name} had finished`);
  }
  if (stopped) {
    const { before, now } = stopped;
    const name = short(before.unitId);
    if (now.outcome !== "stopped" || !/^key ArrowLeft/.test(now.reason ?? "")) fail(`${name} was not stopped by the key: ${now.outcome ?? "still playing"} ${now.reason ?? ""}`);
    else if (now.position < before.position || now.position > before.position + 1.5) fail(`${name} stopped at ${now.position}s, the key came at about ${before.position}s`);
    if (stopped.sounding || stopped.queued) fail(`after the key ${stopped.sounding} voices were sounding and ${stopped.queued} lines queued`);
    if (!afterStop.length) fail(`no narration started after ${name} was stopped`);
    for (const line of afterStop) {
      if (line.outcome !== "ended" || Math.abs(line.position - line.duration) > tolerance) {
        fail(`${short(line.unitId)}, after the stop, did not play cleanly to its end: ${line.outcome ?? "unfinished"}${line.reason ? ` (${line.reason})` : ""}`);
      }
    }
  }
}

console.log(`Evidence: ${directory}`);
if (failures.length) {
  console.log(`\n${failures.length} failures:`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log("Rolf's tour: every unit played once to its full length in real time with its artwork on screen, none overlapped, " +
  "each started once; Enter let a line run on and queued the next; another key stopped the line at once.");
