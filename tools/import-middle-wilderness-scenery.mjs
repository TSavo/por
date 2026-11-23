import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const [receiptRoot] = process.argv.slice(2);
assert.ok(receiptRoot, "Usage: node tools/import-middle-wilderness-scenery.mjs <paired Chrome results>");
const fixture = "middle-wilderness-patrols";
const fixtureRoot = join("qa", "fixtures", fixture);
const ledger = JSON.parse(readFileSync(join(fixtureRoot, "scenes.json"), "utf8"));
const { assets } = JSON.parse(readFileSync("upgrades/manifest.json", "utf8"));
const sha256 = file => createHash("sha256").update(readFileSync(file)).digest("hex");
const webglRendererSha256 = sha256("tools/renderer.js");
assert.equal(sha256(join(fixtureRoot, "A.json")), ledger.checkpointSha256);

function loadReceipt(route, data) {
  const directory = join(receiptRoot, route, data);
  const candidates = readdirSync(directory)
    .filter(name => name.startsWith(`overland-${route}-`))
    .map(name => join(directory, name, "receipt.json"))
    .filter(existsSync);
  assert.equal(candidates.length, 1, `Expected one complete Chrome receipt for ${route} (${data})`);
  return JSON.parse(readFileSync(candidates[0], "utf8"));
}

const proofs = ledger.scenes.map(scene => {
  const { route, producer, caption, position, placement } = scene;
  const [x, y, facing] = position;
  const [, , key, width, height] = placement;
  const expectedText = caption.replace(/\s/g, "");
  const status = new RegExp(`${x},${y}${"NESW"[facing]}\\d{2}:\\d{2}${expectedText}`, "i");
  const art = assets[key];
  assert.ok(art, `No installed artwork for ${key}`);
  const encounter = { placement, sha256: sha256(join("upgrades", art)) };
  const { center, slots } = ledger.terrainByRow[scene.terrainRow];
  const original = loadReceipt(route, "original");
  const port = loadReceipt(route, "port");
  assert.equal(original.rendererSha256, port.rendererSha256, route);
  const chrome = Object.fromEntries(Object.entries({ original, port }).map(([data, receipt]) => {
    const label = `${route} (${data})`;
    assert.equal(receipt.encounter, route, label);
    assert.equal(receipt.data, data, label);
    assert.equal(receipt.nativeProducer, producer, label);
    assert.equal(receipt.fixtureSha256, ledger.checkpointSha256, label);
    assert.match(receipt.rendererSha256, /^[a-f0-9]{64}$/, label);
    assert.equal(receipt.webglRendererSha256, webglRendererSha256, label);
    assert.deepEqual(receipt.inputs, [...scene.inputs, "c"], label);
    assert.deepEqual(receipt.terrain.center, center, label);
    assert.deepEqual(receipt.terrain.slots, slots, label);
    assert.deepEqual(receipt.sprite, { art, sha256: encounter.sha256 }, label);
    assert.match(receipt.held.caption, status, label);
    assert.match(receipt.held.caption, /COMBATWAITFLEEPARLAY$/i, label);
    assert.deepEqual(receipt.held.sprites,
      [{ id: `/art/${key}`, anchor: placement, width: width * 4, height: height * 4 }], label);
    assert.equal(receipt.held.missing, false, label);
    assert.ok(receipt.held.durationMs >= 1300 && receipt.held.samples > 38, label);
    assert.equal(receipt.handoff.choice, "c", label);
    assert.ok(receipt.handoff.notice.includes(expectedText) && /ABATTLEBEGINS/i.test(receipt.handoff.notice), label);
    return [data, {
      route, data, position, caption: receipt.held.caption, encounter,
      checkpointSha256: receipt.fixtureSha256, rendererSha256: receipt.rendererSha256,
    }];
  }));
  const prompt = key.split(":")[4];
  return { producer, prompt, caption, checkpoint: `${fixture}/A.json`, position, chrome };
});

// Emit the complete set only after all paired browser receipts pass validation.
console.log(JSON.stringify(proofs, null, 2));
