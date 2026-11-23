import assert from "node:assert/strict";
import { openChrome } from "./chrome-check.mjs";

// Run against the running worker or loose package server with a real Chrome executable.
const [url, chromePath] = process.argv.slice(2);
assert.ok(url && chromePath, "Pass the game URL and Chrome executable");
const page = await openChrome(url, { chromePath });
try {
  await page.until("game page", 'typeof recolorPartySprite === "function"');
  let verified = 0;
  for (const size of [0, 64]) {
    for (let head = size; head < size + 14; head++) {
      for (const pose of [0, 128]) {
        const keys = Array.from({ length: 32 }, (_, body) => `combat:party:${head}:${size + body + pose}`);
        const result = await page.evaluate(`(${exercisePoses})(${JSON.stringify(keys)})`);
        assert.equal(result, keys.length);
        verified += result;
      }
    }
  }
  console.log(`Chrome decoded and recolored all ${verified} editor poses through the game's asset routes.`);
} finally {
  await page.close();
}

async function exercisePoses(keys) {
  const palette = "0edcba987654321f";
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 96;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  async function pixels(url) {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (image.naturalWidth !== 96 || image.naturalHeight !== 96) throw new Error("Unexpected sprite dimensions for " + url.slice(0, 90));
    context.clearRect(0, 0, 96, 96);
    context.drawImage(image, 0, 0);
    return { image, bytes: context.getImageData(0, 0, 96, 96).data };
  }
  for (const key of keys) {
    const id = key + ":palette:" + palette;
    const before = await pixels("/art/" + key);
    const mask = await pixels("/art-materials/" + id);
    const result = await recolorPartySprite(before.image, id);
    if (!result) throw new Error("No colorized image for " + key);
    const after = await pixels(result);
    let changed = 0;
    for (let p = 0; p < before.bytes.length; p += 4) {
      if (before.bytes[p + 3] !== after.bytes[p + 3]) throw new Error("Changed silhouette for " + key);
      if (before.bytes[p + 3] < 128) continue;
      if ([0, 1, 2].every(channel => Math.abs(before.bytes[p + channel] - after.bytes[p + channel]) <= 2)) continue;
      if (!mask.bytes[p + 3] || !mask.bytes[p]) throw new Error("Changed an unmasked pixel for " + key);
      changed++;
    }
    if (!changed) throw new Error("No visible color change for " + key);
  }
  return keys.length;
}