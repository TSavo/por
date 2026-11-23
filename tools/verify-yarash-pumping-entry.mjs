// Replay the recorded south-facing entry. The shorter pumping-room fixture
// faces east and starts with the middle pose.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, output = "out"] = process.argv.slice(2);
assert.ok(chromePath, "Usage: node tools/verify-yarash-pumping-entry.mjs CHROME [OUTPUT]");
const fixture = resolve("qa/fixtures/walk-yarash-pyramid");
mkdirSync(output, { recursive: true });
const root = mkdtempSync(join(resolve(output), "yarash-entry-"));
const checkpointDir = join(root, "saves");
mkdirSync(checkpointDir);
copyCampaignSaves(fixture, checkpointDir);

const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim()
  .split(/\r?\n/).map(line => JSON.parse(line));
const farCommand = 269;
assert.deepEqual(commands.slice(farCommand - 1, farCommand + 1), ["enter", "a"]);
const chrome = await openChromeCampaignLeg({
  ...boot, chromePath, directory: join(root, "browser"), checkpointDir,
  schedule: join(fixture, "prompts.jsonl"),
});

async function checkApproach(distance, width, height) {
  const key = `encounter:area:23:ecl:aa03:SPRIT7.DAX:57:${distance}:0`;
  const result = await chrome.evaluate(`(() => {
    const layer = document.querySelector("#tile-art:not([hidden])");
    const canvas = layer?.querySelector("canvas.street-viewport");
    const image = layer?.querySelector(".encounter-sprite");
    const gl = canvas?.getContext("webgl");
    const scene = state.scenery;
    const caption = state.text.toSorted(([a], [b]) => a - b)
      .map(([, letter]) => String.fromCharCode(letter)).join("").replace(/\\s+/g, "");
    return {
      caption,
      camera: scene && [scene.area, scene.mapId, scene.x, scene.y, scene.facing],
      encounter: state.encounter,
      webgl: Boolean(gl && !gl.isContextLost() && canvas.getClientRects().length),
      image: image && [image.getAttribute("src"), image.naturalWidth, image.naturalHeight],
    };
  })()`);
  assert.match(result.caption, /THEYRECOILINFEAR.*COMBATWAITFLEEADVANCE/i);
  assert.deepEqual(result.encounter, [56, 32, key, width, height]);
  assert.deepEqual(result.camera, [23, 23, 5, 4, 4]);
  assert.equal(result.webgl, true);
  assert.deepEqual(result.image, [`/art/${key}`, width * 4, height * 4]);
  writeFileSync(join(root, `prisoner-${distance}.png`), await chrome.screenshot());
}

try {
  await chrome.nextFrame();
  for (const input of commands.slice(0, farCommand)) {
    await chrome.send(input);
    await chrome.nextFrame();
  }
  await checkApproach(2, 24, 57);
  await chrome.send("a");
  await chrome.nextFrame();
  await checkApproach(1, 32, 65);
  console.log("Verified the distant prisoner and Advance in Enhanced WebGL. Captures:", root);
} finally {
  await chrome.close();
}
