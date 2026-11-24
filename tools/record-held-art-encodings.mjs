// Run from the repository root: node tools/record-held-art-encodings.mjs <checkout-at-0f40eb1a0>.
// A receipt still identifies the exact PNG Chrome was served. Only a second byte
// encoding of the same static Chrome pixels can be listed as its successor.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { openChrome } from "./web/chrome-check.mjs";

const [previous] = process.argv.slice(2);
if (!previous) throw new Error("Pass the path of the checkout containing the pre-recompression PNGs");
const receipts = new Set();
for (const name of ["held-portraits", "held-portrait-one-shots", "held-portrait-restores"]) {
  const evidence = readFileSync(`qa/${name}.json`, "utf8");
  for (const match of evidence.matchAll(/"([a-f0-9]{64})"/g)) receipts.add(match[1]);
}
const files = new Set();
for (const manifest of ["upgrades/manifest.json", "upgrades/slums/manifest.json"]) {
  for (const [key, file] of Object.entries(JSON.parse(readFileSync(manifest)).assets)) {
    if (/^(portrait|encounter|scene-illustration):/.test(key)) files.add(join(dirname(manifest), file));
  }
}
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
function staticPng(bytes) {
  if (!bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex"))) return false;
  for (let offset = 8; offset + 12 <= bytes.length; offset += 12 + bytes.readUInt32BE(offset)) {
    const chunk = bytes.toString("ascii", offset + 4, offset + 8);
    if (chunk === "acTL") return false;
    if (chunk === "IEND") return true;
  }
  return false;
}
async function samePixels(sources) {
  const pixels = await Promise.all(sources.map(async base64 => {
    const image = new Image();
    image.src = "data:image/png;base64," + base64;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }));
  const [a, b] = pixels;
  return a.width === b.width && a.height === b.height && a.data.every((value, i) => value === b.data[i]);
}
const verified = new Map();
let different = 0;
const browser = await openChrome("about:blank");
try {
  for (const file of [...files].sort()) {
    const old = join(previous, file);
    if (!existsSync(old) || !existsSync(file)) continue;
    const before = readFileSync(old), observed = hash(before);
    if (!receipts.has(observed)) continue;
    const after = readFileSync(file), current = hash(after);
    if (observed === current || !staticPng(before) || !staticPng(after)) continue;
    if (verified.get(observed) === current) continue;
    const images = [before, after].map(bytes => bytes.toString("base64"));
    if (await browser.evaluate(`(${samePixels})(${JSON.stringify(images)})`)) {
      if (verified.has(observed)) throw new Error(`Conflicting encodings for ${file}`);
      verified.set(observed, current);
    } else {
      different++;
      console.warn(`Different displayed pixels: ${file}`);
    }
  }
} finally {
  await browser.close();
}
writeFileSync("qa/held-art-encodings.json", JSON.stringify(Object.fromEntries([...verified].sort()), null, 1) + "\n");
console.log(`Verified ${verified.size} static PNG encoding pairs at native size in Chrome; ${different} pixel mismatches excluded.`);
