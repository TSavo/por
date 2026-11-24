// Exercise the castle patrol's native surprise roll and its conditional, voiced response.
// node tools/acceptance/narration-valjevo.mjs outer <new-output-directory>
import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { openChromeCampaignLeg } from "../chrome-campaign-replay.mjs";

const [sector, destination] = process.argv.slice(2);
const routes = {
  outer: { block: 3, clock: "4320033", voice: "9d1f-9d6e", keys: ["s", "enter", "up", "enter", "enter", "up", "enter", "enter"] },
  maze: { block: 4, clock: "4320128", voice: "9c74-9cc3", keys: ["up", "enter", "enter", "up", "down", "up", "down", "up", "down"] },
  forge: { block: 6, clock: "4320128", voice: "a974-a9c3", keys: ["up", "enter", "enter", "up", "down", "up", "down", "up", "down"] },
};
const route = routes[sector];
assert.ok(route && destination, "Pass outer, maze, or forge, and a new result directory");
const output = resolve(destination);
mkdirSync(output);
const fixture = resolve(`qa/fixtures/valjevo-${sector}-patrol`);
const unitId = `por.voice.ecl5.b${route.block}-${route.voice}`;
const manifest = JSON.parse(readFileSync("src/audio/voice-master-manifest.json"));
const expected = manifest.units.find(unit => unit.id === unitId).runtimeVariants[0];
process.env.POR_FIXED_CLOCK_START = route.clock;
process.env.POR_REPLAY_WAIT_NARRATION = "1";
process.env.POR_NARRATION_RUN = `issue-99-valjevo-${sector}-spots-patrol-${process.env.POR_GAME_SOURCE ?? "port"}`;
process.env.POR_NARRATION_LEDGER = join(output, "decisions.jsonl");
const chrome = await openChromeCampaignLeg({ chromePath: process.env.POR_CHROME ?? "/usr/bin/google-chrome",
  directory: join(output, "chrome"), checkpointDir: fixture,
  bootKeys: "31000000:1c0d,45000000:266c,52000000:3062", startAt: "85000000" });
const compact = text => text.toUpperCase().replace(/[^A-Z0-9]/g, "");
try {
  let frame = await chrome.nextFrame();
  let voice;
  for (const key of route.keys) {
    await chrome.send(key);
    frame = await chrome.nextFrame();
    if (readFileSync(process.env.POR_NARRATION_LEDGER, "utf8").includes(expected.id)) {
      await chrome.waitForNarration("the captain's alert");
      voice = await chrome.evaluate(`porNarrationPlayback().lines.find(line => line.variantId === ${JSON.stringify(expected.id)})`);
      break;
    }
  }
  assert.ok(voice, `Patrol did not reach ${expected.id} at frame ${frame.sequence}`);
  assert.equal(voice.unitId, unitId);
  assert.equal(voice.asset, expected.asset);
  assert.ok(compact(voice.caption).includes(compact(expected.text)), voice.caption);
  assert.equal(voice.outcome, "ended");
  assert.ok(voice.duration > 0 && voice.position >= voice.duration - 0.25);
  assert.match(voice.expectedArt, new RegExp(`^encounter:area:${route.block}:`));
  assert.deepEqual(voice.artSeen, [voice.expectedArt]);
  assert.equal(voice.artAtEnd, voice.expectedArt);
  const native = readFileSync(process.env.POR_NARRATION_LEDGER, "utf8").trim().split("\n").map(JSON.parse);
  assert.ok(native.some(row => row.outcome === "heard" && row.variantId === expected.id && row.asset === expected.asset &&
    row.selector && row.value?.trim() === expected.dynamicValue.trim()));
  writeFileSync(join(output, "alert.png"), await chrome.screenshot());
  console.log(`${sector}: ${expected.id}, "${voice.caption}", ${voice.position.toFixed(2)}s`);
} finally {
  await chrome.close();
}
