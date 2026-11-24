// Reproduce the two pauses distinguished in #81 using the Kobold Caves commission recording.
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const chromePath = process.argv[2];
assert.ok(chromePath, "Supply the Chrome executable");
const fixture = resolve("qa/fixtures/walk-kobold-king");
const directory = mkdtempSync(join(tmpdir(), "por-boar-reports-"));
const saves = join(directory, "saves");
mkdirSync(saves);
copyCampaignSaves(fixture, saves);
const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
const leg = await openChromeCampaignLeg({ chromePath, directory: join(directory, "chrome"), checkpointDir: saves,
  ...boot, schedule: join(fixture, "prompts.jsonl") });
try {
  await leg.nextFrame();
  await leg.evaluate(`window.boarReports = [];
    const panel = document.querySelector("#game-text");
    new MutationObserver(() => {
      if (panel.hidden || !panel.getClientRects().length) return;
      const text = panel.textContent.replace(/\\s/g, "").toUpperCase();
      if (text.includes("WILDBOAR") && window.boarReports.at(-1) !== text) window.boarReports.push(text);
    }).observe(panel, { childList: true, subtree: true });`);
  const expected = ["ALDAATTACKSWILDBOARHITTINGFOR1POINTOFDAMAGE", "WILDBOARSTANDSUPANDGRINS",
    "DORNATTACKSWILDBOARHITTINGFOR4POINTSOFDAMAGE", "WILDBOARGOESDOWNANDISDYING"];
  let seen = 0;
  for (const [index, command] of commands.entries()) {
    await leg.send(command);
    await leg.nextFrame();
    const reports = await leg.evaluate(`(async () => {
      // A new key can skip an animation. Let the fight reports paint before advancing.
      if (state.animation?.some(frame => frame.text.map(([, c]) => String.fromCharCode(c)).join("").replace(/\\s/g, "").includes("WILDBOAR"))) {
        const limit = performance.now() + 30000;
        while (animationFrame || animationQueue.length) {
          if (performance.now() > limit) throw Error("Combat animation did not settle");
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      }
      return window.boarReports.splice(0);
    })()`);
    for (const report of reports) {
      // The native panel may retain both the hit and its outcome on the same frame.
      while (seen < expected.length && report.includes(expected[seen])) seen++;
    }
    if (seen === expected.length) {
      console.log(`Chrome displayed Alda's hit, the boar getting up, Dorn's hit and the boar dying by input ${index + 1}.`);
      break;
    }
  }
  assert.equal(seen, expected.length, `Missing visible combat report: ${expected[seen]}`);
} finally {
  await leg.close();
  rmSync(directory, { recursive: true, force: true });
}
