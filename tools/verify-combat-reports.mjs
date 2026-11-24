// Check the actual Enhanced panel for the combat reports recorded on each route (#81).
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const chromePath = process.argv[2];
assert.ok(chromePath, "Supply the Chrome executable");
const routes = {
  boar: {
    walk: "walk-kobold-king", subject: "WILDBOAR",
    expected: ["ALDAATTACKSWILDBOARHITTINGFOR1POINTOFDAMAGE", "WILDBOARSTANDSUPANDGRINS",
      "DORNATTACKSWILDBOARHITTINGFOR4POINTSOFDAMAGE", "WILDBOARGOESDOWNANDISDYING"],
  },
  quarters: {
    walk: "walk-zhentil-envoy", subject: "YOUARRIVEBACKATYOURQUARTERS|ITISNIGHTANDYOUAREINYOURQUARTERS",
    expected: ["YOUARRIVEBACKATYOURQUARTERS", "ITISNIGHTANDYOUAREINYOURQUARTERS"],
  },
  turning: {
    walk: "walk-guide-party-turn-undead", subject: "TURNSUNDEAD|ISFORCEDTOFLEE",
    expected: ["DORIANTURNSUNDEAD", "SKELETONISFORCEDTOFLEE"],
  },
};
const route = routes[process.argv[3] ?? "boar"];
assert.ok(route, "Choose the boar, quarters or turning route");
const fixture = resolve("qa/fixtures", route.walk);
const directory = mkdtempSync(join(tmpdir(), "por-combat-reports-"));
const saves = join(directory, "saves");
mkdirSync(saves);
const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
copyCampaignSaves(resolve(fixture, boot.checkpointSource ?? "."), saves);
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
const leg = await openChromeCampaignLeg({ chromePath, directory: join(directory, "chrome"), checkpointDir: saves,
  ...boot, schedule: join(fixture, "prompts.jsonl") });
try {
  await leg.nextFrame();
  await leg.evaluate(`window.combatReports = [];
    const panel = document.querySelector("#game-text");
    new MutationObserver(() => {
      if (panel.hidden || !panel.getClientRects().length) return;
      const text = panel.textContent.replace(/\\s/g, "").toUpperCase();
      if (new RegExp(${JSON.stringify(route.subject)}).test(text) && window.combatReports.at(-1) !== text) window.combatReports.push(text);
    }).observe(panel, { childList: true, subtree: true });`);
  const { expected } = route;
  let seen = 0;
  for (const [index, command] of commands.entries()) {
    await leg.send(command);
    await leg.nextFrame();
    const reports = await leg.evaluate(`(async () => {
      // A new key can skip an animation. Let the fight reports paint before advancing.
      if (state.animation?.some(frame => new RegExp(${JSON.stringify(route.subject)}).test(frame.text.map(([, c]) => String.fromCharCode(c)).join("").replace(/\\s/g, "")))) {
        const limit = performance.now() + 30000;
        while (animationFrame || animationQueue.length) {
          if (performance.now() > limit) throw Error("Combat animation did not settle");
          await new Promise(resolve => setTimeout(resolve, 16));
        }
      }
      return window.combatReports.splice(0);
    })()`);
    for (const report of reports) {
      // The native panel may retain both the hit and its outcome on the same frame.
      while (seen < expected.length && report.includes(expected[seen])) seen++;
    }
    if (seen === expected.length) {
      console.log(`Chrome displayed ${expected.length} ordered ${route.walk} reports by input ${index + 1}.`);
      break;
    }
  }
  assert.equal(seen, expected.length, `Missing visible combat report: ${expected[seen]}`);
} finally {
  await leg.close();
  rmSync(directory, { recursive: true, force: true });
}
