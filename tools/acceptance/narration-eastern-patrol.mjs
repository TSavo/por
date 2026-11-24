// Roll an encounter from an ordinary save made at the end of the wilderness walk.
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "../chrome-campaign-replay.mjs";

const [clock, destination] = process.argv.slice(2);
const fixture = resolve("qa/fixtures/eastern-wilderness-patrols");
const scenes = JSON.parse(readFileSync(join(fixture, "scenes.json")));
const scene = scenes.find(entry => entry.clock === Number(clock));
assert.ok(scene && destination, "Pass a listed clock and a new output directory");
const manifest = JSON.parse(readFileSync("src/audio/voice-master-manifest.json"));
const variant = manifest.units.flatMap(unit => unit.runtimeVariants).find(entry => entry.id === scene.variant);
assert.ok(variant);
const output = resolve(destination);
mkdirSync(output);
process.env.POR_FIXED_CLOCK_START = clock;
process.env.POR_NARRATION_RUN = `issue-99-eastern-${scene.variant}-${process.env.POR_GAME_SOURCE ?? "port"}`;
process.env.POR_NARRATION_LEDGER = join(output, "decisions.jsonl");
process.env.POR_REPLAY_WAIT_NARRATION = "1";
const chrome = await openChromeCampaignLeg({
  chromePath: process.env.POR_CHROME ?? "/usr/bin/google-chrome", directory: join(output, "chrome"),
  checkpointDir: fixture, inputCompat: "", bootKeys: "31000000:1c0d,45000000:266c,52000000:2267", startAt: "85000000",
});
const compact = text => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
try {
  let frame = await chrome.nextFrame();
  for (let move = 0; move < scene.moves; move++) {
    await chrome.send(move % 2 === 0 ? "up" : "down");
    frame = await chrome.nextFrame();
  }
  const screen = frame.text.toSorted(([a], [b]) => a - b).map(([, glyph]) => String.fromCharCode(glyph)).join("");
  assert.ok(compact(screen).includes(compact(variant.text)), screen);
  assert.ok(compact(screen).includes("COMBATWAITFLEEPARLAY"), screen);
  await chrome.waitForNarration("eastern encounter");
  const voice = await chrome.evaluate(`porNarrationPlayback().lines.find(line => line.variantId === ${JSON.stringify(variant.id)})`);
  assert.ok(voice, variant.id);
  assert.equal(voice.asset, variant.asset);
  assert.ok(compact(voice.caption).includes(compact(variant.text)), voice.caption);
  assert.equal(voice.outcome, "ended");
  assert.ok(voice.duration > 0 && voice.position >= voice.duration - 0.25);
  assert.ok(voice.expectedArt);
  assert.deepEqual(voice.artSeen, [voice.expectedArt]);
  assert.equal(voice.artAtEnd, voice.expectedArt);
  const native = readFileSync(process.env.POR_NARRATION_LEDGER, "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(native.some(row => row.outcome === "heard" && row.variantId === variant.id &&
    row.value?.trim() === variant.dynamicValue.trim() && row.asset === voice.asset));
  writeFileSync(join(output, "encounter.png"), await chrome.screenshot());
  console.log(`${variant.id}: ${voice.caption}, ${voice.position.toFixed(2)} s, ${voice.expectedArt}`);
} finally {
  await chrome.close();
}
