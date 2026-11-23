// These replays check the native local terrain, creature overlay, and choice handoff (#193).
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const ridgeTerrain = {
  center: [28, 8], slots: [0, 1, 39, 50, 99, 1, 40, 154, 50, 97, 0, 1, 38, 155, 52, 1, 0, 40, 54, 97, 0, 1, 0, 41, 99],
};
const westernTigers = {
  area: 25, archive: 6, cursor: "a204", block: 119, x: 48, width: 40, height: 65,
  fixture: "western-ankheg-eruption", caption: /YOUSURPRISEAGROUPOFTIGERS/i,
};
const scenes = {
  "nomad-camp-absent-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4320016", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    fixture: "nomad-entrance",
    terrain: { center: [24, 10], slots: [6, 16, 0, 1, 0, 17, 18, 1, 0, 1, 20, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 137, 148] },
    inputs: ["left", "enter", "c"],
  },
  "phlan-waterfront-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4320000", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    fixture: "wilderness-walk", recordedInputs: 28,
    terrain: { center: [23,28],
      slots: [88,108,108,101,108,146,89,88,243,252,120,122,121,86,244,123,144,146,132,77,127,128,130,131,77],
      detailSlots: [88,108,101,89,243,252,86,244,132,77,127,130,131], landmarkSlots: [243,252,244] },
    // A roof, a quay and the islet, all within the part of each cell visible in this window.
    landmarkProbes: [[243,70,48], [252,11,43], [244,25,19]],
    inputs: ["up", "right", "right", "right", "up",
      ...Array.from({ length: 6 }, () => ["down", "up"]).flat(), "down", "c"],
  },
  "silt-river-stirges": {
    area: 26, archive: 7, cursor: "a230", block: 61, x: 56, width: 24, height: 57,
    fixture: "pyramid-exterior", clock: "4321092", caption: /YOUSURPRISEAGROUPOFSTIRGES/i,
    terrain: { center: [21, 19], slots: [225, 226, 110, 0, 124, 113, 101, 111, 1, 0, 103, 102, 112, 0, 1, 104, 108, 111, 1, 0, 105, 106, 114, 0, 1],
      detailSlots: [225, 226, 110, 113, 101, 111, 103, 102, 112, 104, 108, 105, 106, 114] },
    inputs: ["right", "right", ...Array(6).fill("down"), "enter", "c"],
  },
  "landmark-buccaneer-tigers": {
    area: 25, archive: 6, cursor: "a204", block: 119, x: 48, width: 40, height: 65,
    fixture: "western-ankheg-eruption", clock: "4326226", caption: /YOUSURPRISEAGROUPOFTIGERS/i,
    terrain: { center: [11, 30], slots: [79, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 248, 175, 1, 0, 1, 175, 77],
      detailSlots: [79, 175, 77], landmarkSlots: [248] },
    inputs: [...Array(3).fill("right"), ...Array(7).fill("down"), "enter", "c"],
  },
  "landmark-zhentil-thri-kreens": {
    area: 25, archive: 6, cursor: "a204", block: 118, x: 56, width: 24, height: 65,
    fixture: "western-ankheg-eruption", clock: "4321061", caption: /YOUSURPRISEAGROUPOFTHRI.KREENS/i,
    terrain: { center: [4, 31], slots: [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 253, 0, 1, 172, 176, 172, 169, 174, 77],
      detailSlots: [172, 176, 169, 174, 77], landmarkSlots: [253] },
    inputs: [...Array(4).fill("left"), ...Array(8).fill("down"), "enter", "c"],
  },
  "wetland-tigers": {
    area: 25, archive: 6, cursor: "a204", block: 119, x: 48, width: 40, height: 65,
    fixture: "western-ankheg-eruption", clock: "4325156", caption: /YOUSURPRISEAGROUPOFTIGERS/i,
    terrain: { center: [8, 22], slots: [82, 78, 90, 1, 0, 83, 78, 79, 0, 1, 84, 78, 90, 1, 0, 1, 83, 91, 0, 1, 0, 82, 78, 90, 0],
      detailSlots: [82, 78, 90, 83, 79, 84, 91] },
    inputs: ["up", "down", "up", "down", "up", "down", "up", "down", "up", "enter", "c"],
  },
  "shoreline-tigers": {
    area: 25, archive: 6, cursor: "a204", block: 119, x: 48, width: 40, height: 65,
    fixture: "buccaneer-mounted-escort", clock: "4325156", caption: /YOUSURPRISEAGROUPOFTIGERS/i,
    terrain: { center: [8, 31], slots: [1, 83, 80, 0, 1, 0, 84, 85, 1, 0, 1, 0, 1, 0, 1, 172, 1, 0, 1, 0, 77, 171, 176, 172, 169],
      detailSlots: [83, 80, 84, 85, 172, 77, 171, 176, 169] },
    inputs: ["left", "left", "left", "left", "down", "up", "down", "up", "down", "enter", "c"],
  },
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
  "ridge-north-merchants": {
    cursor: "a230", block: 12, height: 65, clock: "4327656", caption: /YOUSURPRISEAGROUPOFMERCHANTS/i,
    terrain: { center: [22, 2], slots: [0, 1, 0, 1, 0, 5, 7, 8, 0, 1, 6, 3, 17, 15, 0, 32, 3, 17, 6, 15, 10, 32, 3, 17, 6] },
    inputs: [...Array(5).fill("left"), ...Array(6).fill("up"), "enter", "c"],
  },
  "ridge-west-stirges": {
    cursor: "a230", block: 61, height: 57, clock: "4322452", caption: /YOUSURPRISEAGROUPOFSTIRGES/i,
    terrain: { center: [17, 3], slots: [0, 1, 0, 1, 4, 5, 7, 5, 2, 17, 13, 14, 34, 17, 12, 33, 11, 10, 9, 11, 35, 33, 11, 10, 35] },
    inputs: [...Array(10).fill("left"), ...Array(5).fill("up"), "enter", "c"],
  },
  "ridge-far-west-tigers": {
    ...westernTigers, clock: "4325156",
    terrain: { center: [8, 14], slots: [33, 35, 33, 30, 3, 10, 33, 30, 3, 17, 29, 30, 3, 17, 6, 24, 19, 20, 22, 23, 0, 1, 0, 1, 0] },
    inputs: [...Array(9).fill("up"), "enter", "c"],
  },
  "diogenes-east-tigers": {
    ...westernTigers, clock: "4351160",
    terrain: { center: [12, 8], slots: [6, 3, 17, 13, 11, 17, 13, 14, 33, 35, 200, 201, 33, 11, 10, 202, 203, 35, 33, 11, 204, 205, 206, 35, 30] },
    inputs: [...Array(16).fill("up"), ...Array(4).fill("right"), "down", "enter", "c"],
  },
  "diogenes-west-tigers": {
    ...westernTigers, clock: "4345019",
    terrain: { center: [8, 10], slots: [35, 33, 11, 10, 200, 11, 10, 33, 35, 202, 33, 33, 35, 33, 204, 11, 10, 33, 35, 207, 33, 35, 33, 30, 3] },
    inputs: [...Array(13).fill("up"), "enter", "c"],
  },
};
const [chromePath, encounter, outputRoot = "out"] = process.argv.slice(2);
assert.ok(chromePath && Object.hasOwn(scenes, encounter),
  `Usage: node tools/verify-overland-encounter-sprite.mjs <chrome> <${Object.keys(scenes).join("|")}> [output-root]`);
const scene = scenes[encounter];
const { area = 26, archive = 7, cursor, block, x = 56, width = 24, height, clock, caption, terrain } = scene;
const spotted = encounter === "spotted";
const fixture = resolve("qa/fixtures", scene.fixture ?? (spotted ? "wilderness-walk" : "lizard-wilds-stirge-surprise"));
const recordedInputs = spotted ? 121 : scene.recordedInputs;
const slot = recordedInputs ? "F.json" : "A.json";
let boot = {
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1e61",
  startAt: "85000000", inputCompat: "discard-poll-prompt",
};
let inputs = scene.inputs;
let schedule;
if (recordedInputs) {
  boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
  const prefix = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n")
    .map(line => JSON.parse(line)).slice(0, recordedInputs);
  assert.equal(prefix.length, recordedInputs);
  inputs = [...prefix, ...(inputs ?? [])];
}
if (spotted) {
  assert.equal(inputs.at(-1), "f");
  schedule = join(fixture, "prompts.jsonl");
}

const sprite = `encounter:area:${area}:ecl:${cursor}:SPRIT${archive}.DAX:${block}:1:0`;
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
  if (!recordedInputs) {
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
  assert.deepEqual(held.sprites, [{ id: "/art/" + sprite, anchor: [x, 32, sprite, width, height], width: width * 4, height: height * 4 }]);
  assert.deepEqual(await chrome.evaluate("state.overlandTerrain"), terrain);
  let landmarks;
  if (scene.landmarkProbes) {
    // Compare pixels from each source cel against the translated world position in the WebGL buffer.
    landmarks = await chrome.evaluate(`(async () => {
      const canvas = document.querySelector(".local-overland-encounter");
      const gl = canvas.getContext("webgl");
      const sample = document.createElement("canvas").getContext("2d", { willReadFrequently: true });
      return Promise.all(${JSON.stringify(scene.landmarkProbes)}.map(async ([slot, x, y]) => {
        const image = new Image();
        image.src = "/art/overland-landmark:" + slot;
        await image.decode();
        sample.clearRect(0, 0, 1, 1);
        sample.drawImage(image, x, y, 1, 1, 0, 0, 1, 1);
        const source = [...sample.getImageData(0, 0, 1, 1).data];
        const index = state.overlandTerrain.slots.indexOf(slot);
        const viewX = index % 5 * 96 - 64 + x, viewY = Math.floor(index / 5) * 96 - 64 + y;
        const rendered = new Uint8Array(4);
        gl.readPixels(viewX, canvas.height - 1 - viewY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, rendered);
        return { slot, x: viewX, y: viewY, source, rendered: [...rendered] };
      }));
    })()`);
    for (const { slot, source, rendered } of landmarks) {
      assert.ok(source[3] >= 250 && rendered[3] === 255);
      assert.ok(rendered.slice(0, 3).every((value, i) => Math.abs(value - source[i]) <= 8),
        `Landmark ${slot} is missing or misaligned in the WebGL terrain`);
    }
  }
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
  if (terrain.landmarkSlots?.length) {
    const landWithoutMarkers = await chrome.evaluate(`(async () => {
      const { slots, center, detailSlots } = state.overlandTerrain;
      const load = async id => {
        const image = new Image();
        image.src = "/art/" + id;
        await image.decode();
        return image;
      };
      const details = new Set(detailSlots);
      const [materials, tiles, masks] = await Promise.all([
        load("overland-materials"), Promise.all(slots.map(slot => load("overland-tile:" + slot))),
        detailSlots && Promise.all(slots.map(slot => details.has(slot) ? load("overland-detail:" + slot) : undefined)),
      ]);
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 352;
      const { createOverlandViewport } = await import("/new-phlan-webgl.js");
      createOverlandViewport(canvas).draw(undefined, { materials, tiles, details: masks, center });
      return canvas.toDataURL();
    })()`);
    assert.notEqual(surface.png, landWithoutMarkers, "The visible landmark should add pixels to the local terrain");
    writeFileSync(join(output, "terrain-without-landmarks.png"), Buffer.from(landWithoutMarkers.split(",")[1], "base64"));
  }


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
    terrain, landmarks, terrainSha256: digest(surface.png),
    held: { caption: heldCaption, ...held },
    handoff: { choice, notice },
  }, null, 2) + "\n");
  console.log(`Verified the ${encounter} local terrain, encounter sprite and battle handoff in Chrome. ${output}`);
} finally {
  await chrome.close();
}
