// Play a recorded Middle Wilderness encounter and choose one of the five native parlay attitudes.
// POR_GAMEDATA and POR_GAME_SOURCE select the source. Pass an empty output directory for each run:
// node tools/acceptance/narration-wilderness.mjs middle-wilderness-a194-kobolds haughty <output>
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "../chrome-campaign-replay.mjs";

const [route, attitude, directory] = process.argv.slice(2);
const fixture = resolve("qa/fixtures/middle-wilderness-patrols");
const scenes = JSON.parse(readFileSync(join(fixture, "scenes.json"))).scenes;
const row = scenes.find(scene => scene.route === route);
assert.ok(row && directory && ["haughty", "sly", "nice", "meek", "abusive", "direct"].includes(attitude),
  "Pass a Middle Wilderness route, a parlay attitude and a new result directory");
const manifest = JSON.parse(readFileSync("src/audio/voice-master-manifest.json"));
const variants = new Map(manifest.units.flatMap(unit => unit.runtimeVariants.map(variant => [variant.id, variant])));
const output = resolve(directory);
mkdirSync(output);
process.env.POR_FIXED_CLOCK_START = row.clock;
process.env.POR_REPLAY_WAIT_NARRATION = "1";
process.env.POR_NARRATION_RUN = `issue-99-${route}-${attitude}-${process.env.POR_GAME_SOURCE ?? "port"}`;
process.env.POR_NARRATION_LEDGER = join(output, "decisions.jsonl");
const chrome = await openChromeCampaignLeg({
  chromePath: process.env.POR_CHROME ?? "/usr/bin/google-chrome",
  directory: join(output, "chrome"), checkpointDir: fixture,
  bootKeys: "31000000:1c0d,45000000:266c,52000000:1e61", startAt: "85000000",
});
const compact = text => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
const caption = frame => compact(frame.text.toSorted(([a], [b]) => a - b).map(([, glyph]) => String.fromCharCode(glyph)).join(""));
try {
  let frame = await chrome.nextFrame();
  for (const key of row.inputs) {
    await chrome.send(key);
    frame = await chrome.nextFrame();
  }
  assert.ok(caption(frame).includes(compact(row.caption)));
  assert.ok(caption(frame).includes("COMBATWAITFLEEPARLAY"));
  const approachActor = await chrome.evaluate("state.encounter?.[2]");
  assert.ok(approachActor);
  const priorLines = await chrome.evaluate("porNarrationPlayback().lines.length");
  await chrome.send("p");
  let outcome = await chrome.nextFrame();
  if (attitude !== "direct") {
    assert.ok(caption(outcome).includes("HAUGHTYSLYNICEMEEKABUSIVE"));
    await chrome.send(attitude[0]);
    outcome = await chrome.nextFrame();
  }
  const result = caption(outcome);
  writeFileSync(join(output, "parlay.png"), await chrome.screenshot());
  await chrome.waitForNarration("end of parlay");
  const lines = await chrome.evaluate(`porNarrationPlayback().lines.slice(${priorLines}).filter(line => line.variantId)`);
  const actor = row.caption.split("GROUP OF ")[1];
  assert.ok(actor);
  const matches = lines.filter(line => {
    const variant = variants.get(line.variantId);
    return variant && variant.dynamicValue.trim() === actor && result.includes(compact(variant.text));
  });
  assert.equal(matches.length, 1, `Expected one voiced response for ${actor} at ${result}`);
  const [voice] = matches;
  const variant = variants.get(voice.variantId);
  if (result.includes("ABATTLEBEGINS")) {
    assert.deepEqual(voice.artSeen, [approachActor], "The approach must stay on screen through the parlay reply");
    assert.equal(voice.expectedArt, approachActor);
    assert.equal(voice.artAtEnd, approachActor);
    assert.equal(await chrome.evaluate('document.querySelector("#tile-art .encounter-sprite")?.naturalWidth > 0 && Boolean(document.querySelector("#tile-art .local-overland-encounter"))'), true);
    writeFileSync(join(output, "parlay.png"), await chrome.screenshot());
    await chrome.send("enter");
    await chrome.nextFrame();
    assert.equal(await chrome.evaluate('Boolean(state.battleTiles?.length || state.combatArt?.length) && !state.encounter && !document.querySelector("#tile-art .encounter-sprite")'), true,
      "The battlefield must replace the held parlay picture");
    writeFileSync(join(output, "battlefield.png"), await chrome.screenshot());
  }
  assert.equal(voice.asset, variant.asset);
  assert.ok(compact(voice.caption).includes(compact(variant.text)));
  assert.equal(voice.outcome, "ended");
  assert.ok(voice.duration > 0 && voice.position >= voice.duration - 0.25);
  const heard = readFileSync(process.env.POR_NARRATION_LEDGER, "utf8").trim().split("\n").map(line => JSON.parse(line));
  assert.ok(heard.some(entry => entry.outcome === "heard" && entry.variantId === voice.variantId &&
    entry.value?.trim() === actor && entry.asset === voice.asset), "Native selection disagrees with playback");
  console.log(`${route}, ${attitude}: ${voice.variantId}, "${variant.text}", ${voice.position.toFixed(2)} s`);
} finally {
  await chrome.close();
}
