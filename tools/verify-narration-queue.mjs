import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

// Revisit the Rolf tour without waiting for the greeting to finish at
// each prompt. The temple picture must leave before its queued voice starts.
const chromePath = process.argv[2];
assert.ok(chromePath, "Pass the path to Chrome");
mkdirSync("out", { recursive: true });
const directory = resolve(mkdtempSync(join("out", "narration-queue-")));
const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(directory, "browser"), checkpointDir: directory,
  bootKeys: "31000000:1c0d,45000000:2e63", startAt: "50000000", inputCompat: "discard-poll-prompt",
});
const approach = "encounter:area:0:SPRIT3.DAX:12:0:0";
const greetingPicture = "portrait:area:0:HEAD3.DAX:8:BODY3.DAX:9";
const templePicture = "scene-illustration:area:0:ecl:af3f:caller:b256";
const dockPicture = "scene-illustration:area:0:ecl:af3f:caller:b2f2";
const greeting = "por.voice.ecl3.b0-b0b6";
const temple = "por.voice.ecl3.b0-b1c2";
const dock = "por.voice.ecl3.b0-b257";
const bootKeys = ["enter", "enter", "enter", "enter", "enter", "y", "t", "s", "t", "enter", "k", "e", "y", "a", "a", "e", "b", "enter", "enter"];
const line = unit => `porNarrationPlayback().lines.find(item => item.unitId === ${JSON.stringify(unit)})`;
const painted = art => `shownArtwork === ${JSON.stringify(art)} && renderingSequence === undefined && !animationFrame`;
const wait = condition => chrome.evaluate(`new Promise((resolve, reject) => {
  const target = document.querySelector("#tile-art");
  const artwork = new MutationObserver(check);
  const audio = window.narrationQueueReceipt.audio;
  const timeout = setTimeout(() => {
    cleanup();
    reject(new Error(JSON.stringify({ shownArtwork, sequence:state.sequence, lines:porNarrationPlayback().lines })));
  }, 25000);
  function cleanup() {
    clearTimeout(timeout);
    artwork.disconnect();
    audio.removeEventListener("change", check);
  }
  function check() {
    const result = (${condition});
    if (!result) return;
    cleanup();
    resolve(result);
  }
  artwork.observe(target, { childList:true });
  audio.addEventListener("change", check);
  check();
})`);
async function pressEnter() {
  await chrome.pressKey("enter");
  await chrome.nextFrame();
}
try {
  await chrome.nextFrame();
  for (const key of bootKeys) {
    await chrome.send(key);
    await chrome.nextFrame();
  }
  await chrome.evaluate(`(() => {
    const play = HTMLMediaElement.prototype.play;
    const audio = new EventTarget();
    const events = [];
    window.narrationQueueReceipt = { audio, events };
    HTMLMediaElement.prototype.play = function () {
      if (this.src.includes("/narration/")) {
        const url = decodeURIComponent(this.src);
        const note = event => {
          events.push({ event, url, art:shownArtwork, sequence:state.sequence });
          audio.dispatchEvent(new Event("change"));
        };
        note("play-request");
        this.addEventListener("playing", () => note("playing"), { once:true });
        this.addEventListener("ended", () => note("ended"), { once:true });
      }
      return play.call(this);
    };
  })()`);
  await wait(painted(approach));
  await pressEnter();
  await wait(`${painted(greetingPicture)} && (${line(greeting)})?.startedAt !== undefined`);
  await pressEnter();
  await wait(`${painted(templePicture)} && !!(${line(temple)})`);
  const queued = await chrome.evaluate(line(temple));
  assert.equal(queued.startedAt, undefined, "The temple recording should be queued behind the greeting");
  await pressEnter();
  await wait(`${painted(dockPicture)} &&
    ( (${line(temple)})?.startedAt !== undefined ||
      ((${line(temple)})?.outcome && (${line(dock)})?.startedAt !== undefined) )`);

  const evidence = await chrome.evaluate("({ events: window.narrationQueueReceipt.events, log: porNarrationPlayback() })");
  writeFileSync(join(directory, "playback.json"), JSON.stringify({ bootKeys, queued, ...evidence }, null, 2) + "\n");
  const find = unit => evidence.log.lines.find(item => item.unitId === unit);
  assert.equal(find(greeting).outcome, "ended", "Enter should let the already sounding greeting finish");
  assert.equal(find(temple).outcome, "never-started", "The dock must never play the queued temple recording");
  assert.match(find(temple).reason, /^key enter: picture advanced/);
  assert.equal(find(dock).artAtStart, dockPicture);
  assert.ok(!evidence.events.some(({url}) => url.endsWith("/b0-b1c2.mp3")), "No play request for the retired recording");
  console.log("Verified the native Rolf queue skip and the dock narration:", directory);
} finally {
  await chrome.close();
}
