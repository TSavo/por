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
// the artwork of the frame that prints the passage was on screen from the line's start to its
// end; and the passage was spoken once, at once (no other recording of the same text spoke first).
//
// Pass 2 presses keys while a line is sounding. On the tour the game takes no key until a passage
// is printed, which is after its line has finished, so this pass gives the page's player lines of
// its own while the game waits. The owner's policy (the narration manifest: "subsequentNarration
// QueuesAfterCurrent") and the page's key handling say Enter lets the line run on and the next one
// waits its turn. The sounding line finishes, and the new picture's line waits for it.
// A line still queued for the previous picture is skipped. No two voices overlap. A
// key the game ignores (the left arrow at "Press <enter>/<return> to continue", checked by the
// screen staying the same) must leave the line playing and the line behind it queued. A key the
// game acts on (the left arrow at the area menu, which turns the party) must end the line, with
// nothing left sounding or queued.
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
  const playback = () => chrome.evaluate(
    "({ ...porNarrationPlayback(), painting: Boolean(animationFrame || renderingSequence !== undefined) })");
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
          if (!state.ready || posting || renderingSequence === state.sequence || animationFrame?.approach) return false;
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

const silent = (log) => !log.painting && !log.queued && !log.sounding && log.lines.every((line) => line.outcome);
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

// Let the new frame arrive but keep its portrait undecoded until the check
// has observed the old picture. A fast audio file used to start in this gap.
async function pressThroughRolfPortraitDecode(leg, key) {
  const approach = "encounter:area:0:SPRIT3.DAX:12:0:0";
  const portrait = "portrait:area:0:HEAD3.DAX:8:BODY3.DAX:9";
  const greeting = "por.voice.ecl3.b0-b0b6";
  const armed = await leg.chrome.evaluate(`(async () => {
    if (state.encounter?.[2] !== ${JSON.stringify(approach)}) return false;
    // Native input is ignored until the approach animation has finished.
    const settled = () => !animationFrame && renderingSequence === undefined && shownArtwork === ${JSON.stringify(approach)};
    if (!settled()) await new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        if (!settled()) return;
        observer.disconnect();
        resolve();
      });
      observer.observe(tileArt, { childList: true });
      AbortSignal.timeout(30_000).addEventListener("abort", () => {
        observer.disconnect();
        reject(new Error("Rolf's approach did not finish"));
      }, { once: true });
    });
    const decode = HTMLImageElement.prototype.decode;
    const entered = Promise.withResolvers();
    const released = Promise.withResolvers();
    window.rolfPortraitDecode = { entered: entered.promise, release: released.resolve };
    AbortSignal.timeout(30_000).addEventListener("abort", () => {
      HTMLImageElement.prototype.decode = decode;
      entered.reject(new Error("Rolf's greeting did not reach its portrait decode"));
      released.resolve();
    }, { once: true });
    HTMLImageElement.prototype.decode = function () {
      if (decodeURIComponent(new URL(this.src, location.href).pathname) !== ${JSON.stringify("/art/" + portrait)}) {
        return decode.call(this);
      }
      HTMLImageElement.prototype.decode = decode;
      entered.resolve();
      return released.promise.then(() => decode.call(this));
    };
    return true;
  })()`);
  if (!armed) return false;
  await leg.press(key, false);
  const observed = await leg.chrome.evaluate(`rolfPortraitDecode.entered.then(() => ({
    art: shownArtwork, queued: porNarrationPlayback().lines.some(line => line.unitId === ${JSON.stringify(greeting)})
  }))`);
  await leg.chrome.evaluate("rolfPortraitDecode.release()");
  assert.equal(observed.art, approach, "The previous approach should still be displayed while the portrait decodes");
  if (observed.queued) fail("Rolf's greeting queued before the portrait decoded");
  await leg.sync();
  return true;
}

// ---- pass 1: wait for every line -----------------------------------------------------------------------------------
console.log(`Pass 1: wait for every line to finish before pressing on${broken ? ` (broken on purpose: ${broken})` : ""}`);
{
  const leg = await openLeg("waiting");
  let heldRolfPortrait = false;
  let log;
  try {
    for (let presses = 0; presses < 80; presses++) {
      // The native scene can arrive with movement clips before its narration is eligible.
      log = await leg.until(silent);
      if (!log) { log = await leg.playback(); fail(`the narration did not finish within 90s at "${textOf(leg.frame).slice(-80).trim()}"`); break; }
      const text = textOf(leg.frame);
      if (/our tour is ended/.test(text) && /area cast view encamp search look/.test(text)) break;
      const key = nextKey(text);
      if (!heldRolfPortrait && await pressThroughRolfPortraitDecode(leg, key)) heldRolfPortrait = true;
      else await leg.press(key);
    }
    log ??= await leg.playback();
  } finally { await leg.chrome.close(); }
  assert.ok(heldRolfPortrait, "The tour must exercise the held portrait decode");
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
    if (!line.expectedArt) fail(`${name}: the frame that printed its passage named no Enhanced artwork`);
    else if (line.artSeen.length !== 1 || line.artSeen[0] !== line.expectedArt || line.artAtEnd !== line.expectedArt) {
      fail(`${name}: expected ${line.expectedArt} throughout playback, saw ${line.artSeen.join(" then ")} and ended on ${line.artAtEnd}`);
    }
    // A line with another ahead of it waited its turn: in this pass, which waits for silence, none may.
    // Otherwise the time from queue to sound is the fetch and Chrome starting its audio output: 0.34s
    // for the page's first recording on a quiet machine and 0.81s on a busy one, 0.01 to 0.02s after
    // that. The shortest tour line is 9s, so these limits cannot pass a wait behind another line.
    const loading = line.startedAt - line.queuedAt;
    if (line.behindVoiceLine) fail(`${name} was spoken twice: ${line.behindVoiceLine} read the passage first and the unit waited ${loading.toFixed(1)}s for it`);
    else if (line.ahead) fail(`${name} was queued behind ${line.ahead} other lines and waited ${loading.toFixed(2)}s`);
    else if (loading > (line === log.lines[0] ? 1.5 : tolerance)) fail(`${name} took ${loading.toFixed(2)}s to start with nothing before it`);
  }
  requireNoOverlap(log.lines);
}

// ---- pass 2: press keys while a line is sounding --------------------------------------------------------------------
if (!broken) console.log("Pass 2: press keys while a line is sounding");
if (!broken) {
  const leg = await openLeg("pressing");
  // The game takes no key until it has printed a passage, and on the tour that is after the passage's
  // own line has finished. So the lines pressed over here are given to the page's player by this check
  // (enqueueNarration, the same door the play server's narrations come through), while the game waits.
  const recording = "voices/narration/ecl3/b0-b2f3.mp3";
  let given = 9000;
  const give = async () => {
    const id = ++given;
    await leg.chrome.evaluate(`enqueueNarration({ id: ${id}, unitId: "check.given.${id}", asset: ${JSON.stringify(recording)} })`);
    return id;
  };
  const line = (log, id) => log.lines.find((entry) => entry.id === id);
  const playing = (id, seconds) => (log) => line(log, id)?.position >= seconds && !line(log, id).outcome;
  const walk = async (until) => {
    for (let presses = 0; presses < 60 && !until.test(textOf(leg.frame)); presses++) {
      await leg.until(silent);
      await leg.press(nextKey(textOf(leg.frame)));
    }
    assert.match(textOf(leg.frame), until);
    await delay(300);
    await leg.until(silent);
  };
  let log, ignored, entered, acted;
  try {
    await walk(/i will start the tour.*press <enter>\/<return> to continue/);
    // 1. A key the game ignores: the left arrow means nothing at "Press <enter>/<return> to continue".
    const first = await give();
    const queued = await give();
    if (await leg.until(playing(first, 1), 20)) {
      const screen = await leg.chrome.evaluate("state.frame");
      await leg.press("left", false);
      await delay(1500);
      if (await leg.chrome.evaluate("state.sequence") !== leg.frame.sequence) await leg.sync();
      const after = await leg.playback();
      ignored = { first, queued, after: line(after, first), queuedAfter: line(after, queued), sameScreen: await leg.chrome.evaluate("state.frame") === screen };
    } else fail("the line given to the player did not start");
    // 2. Enter while the first is sounding, or the one queued behind it if the key above ended the first:
    // the line runs on and whatever follows waits its turn.
    const now = await leg.playback();
    const over = [first, queued].find((id) => !line(now, id).outcome && line(now, id).startedAt !== undefined);
    if (over) {
      entered = { over, lines: now.lines.length };
      await leg.press("enter");
    }
    await leg.until(silent, 120);
    // 3. A key the game acts on: at the area menu the left arrow turns the party.
    await walk(/area cast view encamp search look/);
    const last = await give();
    const behind = await give();
    if (await leg.until(playing(last, 1), 20)) {
      const screen = await leg.chrome.evaluate("state.frame");
      await leg.press("left");
      await delay(800);
      const after = await leg.playback();
      acted = { last, behind, after: line(after, last), behindAfter: line(after, behind), sounding: after.sounding, queued: after.queued,
        sameScreen: await leg.chrome.evaluate("state.frame") === screen };
    } else fail("the line given to the player at the area menu did not start");
    await leg.until(silent, 60);
    log = await leg.playback();
  } finally { await leg.chrome.close(); }
  writeFileSync(join(directory, "pressing-playback.json"), JSON.stringify(log, null, 1) + "\n");
  report(log.lines);
  requireSelectedWerePlayed("pressing", log.lines.filter((entry) => entry.id < 9000));
  requireNoOverlap(log.lines);
  const whole = (entry) => entry.outcome === "ended" && Math.abs(entry.position - entry.duration) <= tolerance;
  const how = (entry) => `${entry.outcome ?? "unfinished"}${entry.reason ? ` (${entry.reason})` : ""} at ${entry.position?.toFixed(2) ?? "-"}s of ${entry.duration ?? "-"}s`;
  if (ignored) {
    if (!ignored.sameScreen) fail("the left arrow changed the screen at the tour's first passage: it is not a key the game ignores there");
    else if (ignored.after.outcome) fail(`a key the game ignored ended the line: ${how(ignored.after)}`);
    else if (!whole(line(log, ignored.first))) fail(`after a key the game ignored the line did not play to its end: ${how(line(log, ignored.first))}`);
    else console.log("  a key the game ignores left the line playing to its end");
    if (ignored.queuedAfter.outcome === "never-started") fail(`a key the game ignored dropped the line waiting behind: ${how(ignored.queuedAfter)}`);
  }
  if (!entered) fail("not tested: no line was sounding to press Enter over");
  else {
    const over = line(log, entered.over);
    if (!whole(over)) fail(`the line pressed over with Enter did not run on to its end: ${how(over)}`);
    const skipped = (entry) => entry.id === ignored?.queued && entry.outcome === "never-started" &&
      /^key enter: picture advanced/.test(entry.reason ?? "");
    const after = log.lines.filter((entry) => entry.queuedAt > over.queuedAt &&
      entry.id !== acted?.last && entry.id !== acted?.behind && !skipped(entry));
    if (!after.some((entry) => entry.id < 9000)) fail("Enter over the line reached no narration of the game's own");
    for (const entry of after) {
      if (entry.startedAt === undefined) fail(`${short(entry.unitId)}, sent after Enter, never started: ${entry.reason ?? "still waiting"}`);
      else if (entry.startedAt < over.endedAt - 0.02) fail(`${short(entry.unitId)} started before the line pressed over had finished`);
      else if (!whole(entry)) fail(`${short(entry.unitId)}, which waited its turn, did not then play to its end: ${how(entry)}`);
    }
    if (whole(over) && after.every(whole)) console.log(`  Enter let the line run on; ${after.length} lines sent after it waited their turn and played to the end`);
  }
  if (acted) {
    if (acted.sameScreen) fail("the left arrow did not change the screen at the area menu: it is not a key the game acts on there");
    else if (acted.after.outcome !== "stopped" || !/^key ArrowLeft/.test(acted.after.reason ?? "")) fail(`a key the game acted on did not end the line: ${how(acted.after)}`);
    else if (acted.sounding || acted.queued) fail(`after the key the game acted on, ${acted.sounding} voices were sounding and ${acted.queued} lines queued`);
    else console.log(`  a key the game acts on ended the line at ${acted.after.position.toFixed(2)}s of ${acted.after.duration}s and dropped the one waiting behind it`);
  }
}

console.log(`Evidence: ${directory}`);
if (failures.length) {
  console.log(`\n${failures.length} failures:`);
  for (const failure of failures) console.log(`  ${failure}`);
  process.exit(1);
}
console.log("Rolf's tour: every unit played once to its full length in real time with its artwork on screen, none overlapped, " +
  "each started once; Enter let a line run on and the next wait its turn; a key the game ignores left the line alone; a key it acts on ended it.");
