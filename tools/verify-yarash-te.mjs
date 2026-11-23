import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { square, startGame } from "./acceptance/harness.mjs";
import { copyCampaignSaves } from "./chrome-campaign-replay.mjs";

const fixture = "qa/fixtures/walk-yarash-pyramid";
const boot = JSON.parse(readFileSync(join(fixture, "boot.json")));
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
assert.deepEqual(commands.slice(160, 163), ["enter", "m", "enter"]);
assert.deepEqual(commands.slice(184, 188), ["enter", "t", "m", "enter"]);

const visits = new Map([
  [161, { area: 23, x: 15, y: 12, facing: "E" }],
  // The landing coordinates update before the first step refreshes the area.
  [163, { x: 15, y: 7, facing: "E" }],
  [165, { area: 22, x: 14, y: 7, facing: "W" }],
  [185, { area: 23, x: 15, y: 12, facing: "E" }],
  [188, { area: 23, x: 11, y: 3, facing: "S" }],
]);
const saves = mkdtempSync(join(tmpdir(), "yarash-te-"));
copyCampaignSaves(fixture, saves);
const game = await startGame({ pregen: false, saves, seconds: 1200, env: {
  POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_DEV_COMBAT: "1",
  POR_INPUT_COMPAT: "", POR_PROMPT_SCHEDULE_IN: join(fixture, "prompts.jsonl"),
} });
try {
  for (const [index, key] of commands.slice(0, 188).entries()) {
    assert.ok(await game.send(key), "Rejected command " + (index + 1));
    const expected = visits.get(index + 1);
    if (expected) {
      const actual = square(game.frame);
      for (const [field, value] of Object.entries(expected)) {
        assert.equal(actual?.[field], value, "TE command " + (index + 1) + " " + field);
      }
    }
  }
  console.log("Verified both TE landings after TA.");
} finally {
  game.close();
}
