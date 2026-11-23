import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const chromePath = process.argv[2];
const source = process.env.POR_GAME_SOURCE;
assert.ok(chromePath && (source === "original" || source === "port"),
  "Usage: set POR_GAME_SOURCE to original or port and run node tools/verify-finale-recall.mjs <Chrome executable>");
const fixture = resolve("qa/fixtures/campaign-ending-leg");
const { bootKeys, startAt, developerCombat, inputCompat } = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line));
const exit = commands.indexOf("e", commands.lastIndexOf(":win-combat") + 1);
assert.ok(exit > 0, "Expected to exit the treasure menu after Tyranthraxus");

const output = resolve(process.env.POR_CAMPAIGN_OUTPUT_DIR ?? "out");
mkdirSync(output, { recursive: true });
const directory = mkdtempSync(join(output, "finale-recall-"));
const saves = join(directory, "saves");
mkdirSync(saves);
copyCampaignSaves(fixture, saves);
const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(directory, source), checkpointDir: saves,
  bootKeys, startAt, developerCombat, inputCompat, schedule: join(fixture, "prompts.jsonl"),
});
const text = frame => frame.text.toSorted(([a], [b]) => a - b).map(([, c]) => String.fromCharCode(c)).join("");

try {
  let frame = await chrome.nextFrame();
  for (const command of commands.slice(0, exit)) {
    await chrome.send(command);
    frame = await chrome.nextFrame();
  }
  assert.match(text(frame), /VIEWPOOLEXIT/i);
  const runnerLog = readFileSync(join(directory, source, "runner.log"), "utf8");
  assert.ok(runnerLog.includes("POR_GAME_DATA " + source + " "), "The replay must use the requested game data");

  await chrome.evaluate(`(() => {
    const art = document.querySelector("#tile-art");
    const prefix = "portrait:area:7:FINAL5.DAX:8:";
    const paints = [];
    const settled = [];
    const finalBatches = [];
    const finalPose = prefix + "5:0";
    const play = playAnimation;
    playAnimation = (...args) => {
      if (state.presentationPolling && state.animation?.at(-1)?.portrait === finalPose) {
        finalBatches.push(state.portrait);
      }
      return play(...args);
    };
    const observer = new MutationObserver(() => {
      const image = art.querySelector(".encounter-portrait");
      const visible = !art.hidden && image?.complete && image.naturalWidth === 352 && image.naturalHeight === 352 &&
        image.getClientRects().length;
      const portrait = visible ? decodeURIComponent(new URL(image.src).pathname).slice("/art/".length) : null;
      const clip = animationFrame;
      if (clip?.portrait?.startsWith(prefix) && portrait === clip.portrait) {
        if (paints.at(-1)?.portrait !== portrait) {
          paints.push({ portrait, nativeHoldMs: clip.gameMs, paintedAt: performance.now() });
        }
      } else if (!clip && paints.at(-1)?.portrait === finalPose) {
        const caption = state.text.toSorted(([a], [b]) => a - b).map(([, c]) => String.fromCharCode(c)).join("");
        if (/NOLordBane/i.test(caption)) settled.push(portrait);
      }
    });
    observer.observe(art, { childList: true });
    window.readFinaleRecall = () => {
      observer.disconnect();
      playAnimation = play;
      return { paints, settled, finalBatches };
    };
  })()`);

  await chrome.pressKey("e");
  frame = await chrome.nextFrame();
  let nextCommand = exit + 1;
  for (; nextCommand < commands.length; nextCommand++) {
    // This older fixture contains Enter advances after the hoard. Never use one to skip a clip.
    await chrome.evaluate(`new Promise(resolve => {
      function settled() {
        if (!animationFrame && renderingSequence === undefined) resolve(true);
        else requestAnimationFrame(settled);
      }
      settled();
    })`);
    if (/YOULEAVETHECASTLE.*MOVINGTHROUGHTHESTREETS/i.test(text(frame))) break;
    assert.equal(commands[nextCommand], "enter", "The castle departure should precede the first movement command");
    await chrome.send(commands[nextCommand]);
    frame = await chrome.nextFrame();
  }
  assert.match(text(frame), /YOULEAVETHECASTLE.*MOVINGTHROUGHTHESTREETS/i);

  const observations = await chrome.evaluate("window.readFinaleRecall()");
  const { paints, settled, finalBatches } = observations;
  writeFileSync(join(directory, "recall-paints.json"), JSON.stringify(observations, null, 2) + "\n");
  // GOG 1.3 draw trace at this save's game speed. The bundled runner preserves the same holds.
  const expected = [610, 90, 90, 90, 90, 80].map((nativeHoldMs, member) => ({
    portrait: `portrait:area:7:FINAL5.DAX:8:${member}:0`, nativeHoldMs,
  }));
  assert.deepEqual(paints.map(({ portrait, nativeHoldMs }) => ({ portrait, nativeHoldMs })), expected);
  const lastPose = expected.at(-1).portrait;
  assert.deepEqual(finalBatches, [lastPose], "The final polling batch must keep the last pose under the recall caption");
  assert.ok(settled.every(portrait => portrait === lastPose), "The recalled spirit must not reappear at the held caption");
  for (const command of commands.slice(nextCommand)) {
    if (/GATEWAYTOTHEUNSETTLEDAREAS/i.test(text(frame))) break;
    assert.equal(command, "enter", "The return to Phlan should precede the first movement command");
    await chrome.send(command);
    frame = await chrome.nextFrame();
  }
  assert.match(text(frame), /GATEWAYTOTHEUNSETTLEDAREAS/i);
  console.log(`Verified six visible finale recall poses from ${source} data and return to Phlan in Chrome: ${directory}`);
} finally {
  await chrome.close();
}
