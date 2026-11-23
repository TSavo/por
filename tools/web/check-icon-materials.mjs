import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { openChrome } from "./chrome-check.mjs";

// Run against the running worker or loose package server with a real Chrome executable.
const [url, chromePath, mode] = process.argv.slice(2);
assert.ok(url && chromePath, "Pass the game URL and Chrome executable");
assert.ok(mode === undefined || mode === "--each-color", "Unknown color check option");
const nativeColors = mode && JSON.parse(readFileSync(new URL("../../game/pictures.json", import.meta.url), "utf8")).partyIconColours;
const page = await openChrome(url, { chromePath });
try {
  await page.until("game page", 'typeof recolorPartySprite === "function" && typeof state === "object" && state.ready');
  let verified = 0;
  let trials = 0;
  for (const size of [0, 64]) {
    for (let head = size; head < size + 14; head++) {
      for (const pose of [0, 128]) {
        const keys = Array.from({ length: 32 }, (_, body) => `combat:party:${head}:${size + body + pose}`);
        const bits = nativeColors && keys.map(key => parseInt(nativeColors[key.slice("combat:party:".length)], 16));
        const result = await page.evaluate(`(${exercisePoses})(${JSON.stringify(keys)}, ${JSON.stringify(bits)})`);
        assert.equal(result.poses, keys.length);
        verified += result.poses;
        trials += result.trials;
      }
    }
  }
  if (nativeColors) console.log(`Verified ${trials} individual visible material changes.`);
  console.log(`Chrome decoded and recolored all ${verified} editor poses through the game's asset routes.`);
} finally {
  await page.close();
}

async function exercisePoses(keys, nativeBits) {
  const palette = "0edcba987654321f";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  async function pixels(url) {
    const image = new Image();
    image.src = url;
    try {
      await image.decode();
    } catch (error) {
      throw new Error("Image decode failed for " + url.slice(0, 90) + " (" + error.message + ")");
    }
    if (image.naturalWidth !== 96 || image.naturalHeight !== 96) throw new Error("Unexpected sprite dimensions for " + url.slice(0, 90));
    context.clearRect(0, 0, 96, 96);
    context.drawImage(image, 0, 0);
    return { image, bytes: context.getImageData(0, 0, 96, 96).data };
  }
  // The tall bow shoulder, axe collar, robe seam and foreground shield were cut out by the old head stencil (#301).
  const bodyLandmarks = new Map([[65, [40, 35]], [87, [45, 30]], [93, [38, 21]], [216, [45, 26]]]);
  let trials = 0;
  for (const [index, key] of keys.entries()) {
    const before = await pixels("/art/" + key);
    const landmark = bodyLandmarks.get(Number(key.split(":")[3]));
    if (landmark) {
      const [x, y] = landmark;
      if (before.bytes[4 * (96 * y + x) + 3] < 128) throw new Error("Missing body behind selected head for " + key);
    }
    const mask = await pixels("/art-materials/" + key + ":palette:" + palette);
    const materials = new Set();
    for (let p = 0; p < mask.bytes.length; p += 4) {
      if (before.bytes[p + 3] >= 128 && mask.bytes[p + 3]) materials.add(mask.bytes[p]);
    }
    const channels = nativeBits
      ? [1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 15].filter(id => (nativeBits[index] & (1 << id)) && materials.has(id))
      : [null];
    if (!channels.length) throw new Error("No editable material for " + key);
    for (const channel of channels) {
      // Purple is outside the twelve editable source indices, so this changes exactly one entry.
      const colors = channel === null ? palette : "0123456789abcdef".split("").map((v, i) => i === channel ? "5" : v).join("");
      const id = key + ":palette:" + colors;
      const result = await recolorPartySprite(before.image, id).catch(error => {
        throw new Error("Recolor failed for " + id + " (" + error.message + ")");
      });
      if (!result) throw new Error("No colorized image for " + id);
      const after = await pixels(result);
      let changed = 0;
      for (let p = 0; p < before.bytes.length; p += 4) {
        if (before.bytes[p + 3] !== after.bytes[p + 3]) throw new Error("Changed silhouette for " + id);
        if (before.bytes[p + 3] < 128) continue;
        // Canvas may round a translucent channel on the PNG round trip.
        if ([0, 1, 2].every(c => Math.abs(before.bytes[p + c] - after.bytes[p + c]) <= 2)) continue;
        const material = mask.bytes[p];
        if (!mask.bytes[p + 3] || !material || (channel !== null && material !== channel)) {
          throw new Error("Changed a pixel outside the selected material for " + id);
        }
        changed++;
      }
      if (!changed) throw new Error("No visible color change for " + id);
      trials++;
    }
  }
  return { poses: keys.length, trials };
}
