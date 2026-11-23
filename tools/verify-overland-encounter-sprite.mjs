// These replays check the native local terrain, creature overlay, and choice handoff (#193).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath, encounter, outputRoot = "out"] = process.argv.slice(2);
assert.ok(chromePath && ["spotted", "surprise"].includes(encounter),
  "Usage: node tools/verify-overland-encounter-sprite.mjs <chrome> <spotted|surprise> [output-root]");

const spotted = encounter === "spotted";
const fixture = resolve("qa/fixtures", spotted ? "wilderness-walk" : "lizard-wilds-stirge-surprise");
const slot = spotted ? "F.json" : "A.json";
let boot = {
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1e61",
  startAt: "85000000", inputCompat: "discard-poll-prompt",
};
let inputs = ["up", "down", "up", "down", "up", "w"];
let schedule;
if (spotted) {
  boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
  inputs = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line)).slice(0, 121);
  assert.equal(inputs.at(-1), "f");
  schedule = join(fixture, "prompts.jsonl");
}

const cursor = spotted ? "a194" : "a1e5";
const sprite = `encounter:area:26:ecl:${cursor}:SPRIT7.DAX:61:1:0`;
const terrain = spotted ? {
  center: [20, 9], slots: [33, 35, 33, 30, 3, 10, 33, 30, 17, 6, 26, 27, 21, 3, 17, 17, 18, 0, 22, 20, 215, 147, 1, 0, 1],
} : {
  center: [27, 8], slots: [16, 0, 1, 39, 50, 18, 1, 40, 154, 50, 1, 0, 1, 38, 155, 0, 1, 0, 40, 54, 1, 0, 1, 0, 41],
};
const caption = spotted ? /YOUSPOTAGROUPOFSTIRGES/i : /YOUARESURPRISEDBYAGROUPOFSTIRGES/i;
const screenText = frame => frame.text.toSorted(([a], [b]) => a - b).map(([, glyph]) => String.fromCharCode(glyph)).join("");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(resolve(outputRoot, `overland-${encounter}-`));
const checkpointDir = join(output, "saves");
cpSync(fixture, checkpointDir, { recursive: true });
process.env.POR_FIXED_CLOCK_START = spotted ? "4320000" : "4320307";
const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(output, "chrome"), checkpointDir, ...boot, developerCombat: false,
  traceEnhancedFallbacks: true, schedule,
});
try {
  let frame = await chrome.nextFrame();
  if (!spotted) {
    assert.equal(await chrome.evaluate(`!document.querySelector("#travel-map").hidden &&
      !document.querySelector(".local-overland-encounter")`), true, "The regular travel map stays visible before the encounter");
  }
  for (const key of inputs.slice(0, -1)) {
    await chrome.send(key);
    frame = await chrome.nextFrame();
  }
  const heldCaption = screenText(frame);
  assert.match(heldCaption, caption);
  assert.match(heldCaption, /COMBATWAITFLEEPARLAY/i);
  const held = await chrome.evaluate(`new Promise(resolve => {
    const sprites = new Set();
    let start, samples = 0, missing = false;
    function sample(now) {
      start ??= now;
      const images = document.querySelectorAll("#tile-art:not([hidden]) .encounter-sprite");
      const image = images[0];
      const canvas = document.querySelector(".local-overland-encounter");
      if (state.sequence !== ${frame.sequence} || state.portrait || images.length !== 1 ||
          !image?.complete || !image.naturalWidth || !image.checkVisibility() ||
          !canvas?.checkVisibility() || !document.querySelector("#travel-map").hidden) missing = true;
      else sprites.add(JSON.stringify({
        id: image.getAttribute("src"), anchor: state.encounter, width: image.naturalWidth, height: image.naturalHeight,
      }));
      samples++;
      if (now - start < 1300) requestAnimationFrame(sample);
      else resolve({ sprites: [...sprites].map(JSON.parse), samples, missing, durationMs: now - start });
    }
    requestAnimationFrame(sample);
  })`);
  assert.equal(held.missing, false);
  assert.ok(held.samples > 38);
  assert.deepEqual(held.sprites, [{ id: "/art/" + sprite, anchor: [56, 32, sprite, 24, 57], width: 96, height: 228 }]);
  assert.deepEqual(await chrome.evaluate("state.overlandTerrain"), terrain);
  const surface = await chrome.evaluate(`(() => {
    const canvas = document.querySelector(".local-overland-encounter");
    const gl = canvas.getContext("webgl");
    const sampled = [];
    for (let y = 36; y < canvas.height; y += 56) {
      for (let x = 36; x < canvas.width; x += 56) {
        const pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        sampled.push(pixel.toString());
      }
    }
    return { pixels: new Set(sampled).size, png: canvas.toDataURL(), width: canvas.width, height: canvas.height };
  })()`);
  assert.ok(surface.pixels > 28, "The WebGL window must contain authored terrain, not a blank panel");
  assert.deepEqual([surface.width, surface.height], [352, 352]);
  writeFileSync(join(output, "held.png"), await chrome.screenshot());

  const choice = inputs.at(-1);
  await chrome.send(choice);
  frame = await chrome.nextFrame();
  const notice = screenText(frame);
  assert.match(notice, caption);
  assert.match(notice, /ABATTLEBEGINS/i);
  assert.equal(await chrome.evaluate(`!state.encounter && !state.portrait &&
    !document.querySelector("#tile-art .encounter-sprite, #tile-art .encounter-portrait")`), true);
  writeFileSync(join(output, "battle-notice.png"), await chrome.screenshot());
  writeFileSync(join(output, "receipt.json"), JSON.stringify({
    encounter, data: await chrome.evaluate('state.classicAvailable === false ? "port" : "original"'),
    fixtureSha256: digest(readFileSync(join(fixture, slot))),
    rendererSha256: digest(readFileSync("tools/play.js")), terrain, terrainSha256: digest(surface.png),
    held: { caption: heldCaption, ...held },
    handoff: { choice, notice },
  }, null, 2) + "\n");
  console.log(`Verified the ${encounter} local terrain, stirge sprite and battle handoff in Chrome. ${output}`);
} finally {
  await chrome.close();
}
