// These replays check the native local terrain, creature overlay, and choice handoff (#193).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const ridgeTerrain = {
  center: [28, 8], slots: [0, 1, 39, 50, 99, 1, 40, 154, 50, 97, 0, 1, 38, 155, 52, 1, 0, 40, 54, 97, 0, 1, 0, 41, 99],
};
const scenes = {
  spotted: {
    cursor: "a194", block: 61, height: 57, clock: "4320000", caption: /YOUSPOTAGROUPOFSTIRGES/i,
    terrain: { center: [20, 9], slots: [33, 35, 33, 30, 3, 10, 33, 30, 17, 6, 26, 27, 21, 3, 17, 17, 18, 0, 22, 20, 215, 147, 1, 0, 1] },
  },
  surprise: {
    cursor: "a1e5", block: 61, height: 57, clock: "4320307", caption: /YOUARESURPRISEDBYAGROUPOFSTIRGES/i,
    terrain: { center: [27, 8], slots: [16, 0, 1, 39, 50, 18, 1, 40, 154, 50, 1, 0, 1, 38, 155, 0, 1, 0, 40, 54, 1, 0, 1, 0, 41] },
    inputs: ["up", "down", "up", "down", "up", "w"],
  },
  "ridge-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4320016", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: ridgeTerrain, inputs: ["right", "c"],
  },
  "ridge-bandits": {
    cursor: "a194", block: 15, height: 65, clock: "4320320", caption: /YOUSPOTAGROUPOFBANDITS/i,
    terrain: ridgeTerrain, inputs: ["right", "enter", "c"],
  },
  "woodland-bandits": {
    cursor: "a230", block: 15, height: 65, clock: "4320121", caption: /YOUSURPRISEAGROUPOFBANDITS/i,
    terrain: { center: [28, 12], slots: [0, 1, 0, 41, 99, 1, 0, 1, 0, 41, 148, 1, 0, 1, 0, 122, 148, 1, 0, 1, 144, 122, 148, 1, 0] },
    inputs: ["down", "down", "down", "down", "right", "enter", "c"],
  },
  "woodland-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4321424", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [28, 13], slots: [1, 0, 1, 0, 41, 148, 1, 0, 1, 0, 122, 148, 1, 0, 1, 144, 122, 148, 1, 0, 122, 144, 145, 149, 1] },
    inputs: ["down", "down", "down", "down", "right", "down", "enter", "c"],
  },
  "woodland-south-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4327933", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [28, 14], slots: [148, 1, 0, 1, 0, 122, 148, 1, 0, 1, 144, 122, 148, 1, 0, 122, 144, 145, 149, 1, 144, 122, 145, 146, 148] },
    inputs: ["down", "down", "down", "down", "right", "down", "down", "enter", "c"],
  },
  "woodland-west-stirges": {
    cursor: "a230", block: 61, height: 57, clock: "4321092", caption: /YOUSURPRISEAGROUPOFSTIRGES/i,
    terrain: { center: [21, 10], slots: [33, 30, 17, 6, 16, 27, 21, 3, 17, 18, 18, 0, 22, 20, 1, 147, 1, 0, 1, 0, 121, 148, 1, 0, 1] },
    inputs: [...Array(6).fill("left"), "down", "down", "enter", "c"],
  },
  "woodland-southwest-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4321145", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [20, 11], slots: [26, 27, 21, 3, 17, 17, 18, 0, 22, 20, 215, 147, 1, 0, 1, 120, 121, 148, 1, 0, 123, 120, 121, 148, 1] },
    inputs: [...Array(7).fill("left"), "down", "down", "down", "enter", "c"],
  },
  "foothill-meadow-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4321424", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [24, 5], slots: [17, 6, 15, 0, 1, 3, 17, 6, 15, 0, 32, 3, 17, 16, 1, 30, 6, 3, 16, 0, 3, 17, 21, 18, 1] },
    inputs: ["left", "left", "left", "up", "up", "up", "c"],
  },
  "foothill-snow-stirges": {
    cursor: "a230", block: 61, height: 57, clock: "4321092", caption: /YOUSURPRISEAGROUPOFSTIRGES/i,
    terrain: { center: [21, 6], slots: [11, 10, 32, 3, 17, 35, 33, 35, 32, 3, 33, 11, 10, 30, 6, 35, 33, 30, 3, 17, 33, 30, 17, 6, 16] },
    inputs: [...Array(6).fill("left"), "up", "up", "enter", "c"],
  },
  "alpine-high-stirges": {
    cursor: "a230", block: 61, height: 57, clock: "4325169", caption: /YOUSURPRISEAGROUPOFSTIRGES/i,
    terrain: { center: [20, 5], slots: [17, 12, 32, 3, 17, 9, 11, 10, 32, 3, 10, 35, 33, 35, 32, 35, 33, 11, 10, 30, 33, 35, 33, 30, 3] },
    inputs: [...Array(7).fill("left"), "up", "up", "up", "enter", "c"],
  },
  "alpine-pass-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4321061", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [16, 9], slots: [35, 33, 10, 35, 33, 10, 35, 33, 11, 10, 11, 10, 35, 31, 26, 30, 28, 27, 3, 17, 17, 6, 3, 17, 215] },
    inputs: [...Array(11).fill("left"), "down", "enter", "c"],
  },
};
const [chromePath, encounter, outputRoot = "out"] = process.argv.slice(2);
assert.ok(chromePath && Object.hasOwn(scenes, encounter),
  `Usage: node tools/verify-overland-encounter-sprite.mjs <chrome> <${Object.keys(scenes).join("|")}> [output-root]`);
const { cursor, block, height, clock, caption, terrain } = scenes[encounter];
const spotted = encounter === "spotted";
const fixture = resolve("qa/fixtures", spotted ? "wilderness-walk" : "lizard-wilds-stirge-surprise");
const slot = spotted ? "F.json" : "A.json";
let boot = {
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1e61",
  startAt: "85000000", inputCompat: "discard-poll-prompt",
};
let inputs = scenes[encounter].inputs;
let schedule;
if (spotted) {
  boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
  inputs = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line)).slice(0, 121);
  assert.equal(inputs.at(-1), "f");
  schedule = join(fixture, "prompts.jsonl");
}

const sprite = `encounter:area:26:ecl:${cursor}:SPRIT7.DAX:${block}:1:0`;
const screenText = frame => frame.text.toSorted(([a], [b]) => a - b).map(([, glyph]) => String.fromCharCode(glyph)).join("");
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
mkdirSync(outputRoot, { recursive: true });
const output = mkdtempSync(resolve(outputRoot, `overland-${encounter}-`));
const checkpointDir = join(output, "saves");
cpSync(fixture, checkpointDir, { recursive: true });
process.env.POR_FIXED_CLOCK_START = clock;
const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(output, "chrome"), checkpointDir, ...boot, developerCombat: false,
  traceEnhancedFallbacks: true, schedule,
});
try {
  let frame = await chrome.nextFrame();
  if (!spotted) {
    assert.equal(await chrome.evaluate(`!document.querySelector("#travel-map").hidden &&
      !document.querySelector(".local-overland-encounter")`), true, "The regular travel map stays visible before the encounter");
    writeFileSync(join(output, "travel.png"), await chrome.screenshot());
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
  assert.deepEqual(held.sprites, [{ id: "/art/" + sprite, anchor: [56, 32, sprite, 24, height], width: 96, height: height * 4 }]);
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
  writeFileSync(join(output, "terrain.png"), Buffer.from(surface.png.split(",")[1], "base64"));
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
    rendererSha256: digest(readFileSync("tools/play.js")),
    webglRendererSha256: digest(readFileSync("tools/new-phlan-webgl.js")),
    terrain, terrainSha256: digest(surface.png),
    held: { caption: heldCaption, ...held },
    handoff: { choice, notice },
  }, null, 2) + "\n");
  console.log(`Verified the ${encounter} local terrain, encounter sprite and battle handoff in Chrome. ${output}`);
} finally {
  await chrome.close();
}
