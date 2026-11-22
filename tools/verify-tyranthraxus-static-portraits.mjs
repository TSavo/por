import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";
import { portraitLoopSignature } from "./held-portrait-loops.mjs";

// Replays the tracked finale checkpoint through appraisal, offer, and six Attack votes.
const [chromePath, directory = "out"] = process.argv.slice(2);
assert.ok(chromePath, "Usage: node tools/verify-tyranthraxus-static-portraits.mjs <chrome> [output directory]");
mkdirSync(directory, { recursive: true });
const output = mkdtempSync(join(resolve(directory), "tyranthraxus-static-"));
const fixture = resolve("qa/fixtures/campaign-full/leg-10");
const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split("\n").map(line => JSON.parse(line));
const manifest = JSON.parse(readFileSync("upgrades/manifest.json", "utf8"));
const digest = value => createHash("sha256").update(value).digest("hex");
const saves = mkdtempSync(join(output, "saves-"));
for (const file of readdirSync(fixture).filter(name => /^(?:[A-J]|roster)\.json$/.test(name))) {
  cpSync(join(fixture, file), join(saves, file));
}

const chrome = await openChromeCampaignLeg({
  chromePath, directory: join(output, "leg"), checkpointDir: saves,
  ...boot, schedule: join(fixture, "prompts.jsonl"),
});
const evidence = {};
let frame;
let data;
const caption = () => frame.text.toSorted(([left], [right]) => left - right)
  .map(([, code]) => String.fromCharCode(code)).join("");

async function press(key) {
  await chrome.send(key);
  frame = await chrome.nextFrame();
}

async function verifyHold(name, expectedCaption, portrait) {
  assert.match(caption(), expectedCaption);
  assert.equal(await chrome.evaluate("state.portrait"), portrait);
  const paint = await chrome.evaluate(`new Promise(resolve => {
    const start = performance.now();
    const poses = new Set();
    let samples = 0, replaced = false;
    function sample(now) {
      const image = document.querySelector("#tile-art:not([hidden]) .encounter-portrait");
      if (state.sequence !== ${frame.sequence} || animationFrame || !image?.complete ||
          image.naturalWidth !== 352 || image.getBoundingClientRect().width <= 0 || image.dataset.heldPose) {
        replaced = true;
      } else {
        poses.add(new URL(image.src).pathname.slice(5));
      }
      samples++;
      if (now - start < 3650) requestAnimationFrame(sample);
      else resolve({ durationMs: Math.round(now - start), samples, poses: [...poses], replaced });
    }
    requestAnimationFrame(sample);
  })`);
  assert.ok(paint.samples >= 90 && paint.durationMs >= 3650);
  assert.equal(paint.replaced, false, name + " replaced its held picture");
  assert.deepEqual(paint.poses, [portrait]);
  evidence[name] = {
    route: "tyranthraxus-static-portraits", data, caption: caption(), portrait,
    checkpointSha256: digest(readFileSync(join(fixture, "H.json"))),
    artSha256: digest(readFileSync(join("upgrades", manifest.assets[portrait]))),
    rendererSha256: digest(readFileSync("tools/play.js", "utf8").replace(/\r\n/g, "\n")),
    bindingSha256: digest(portraitLoopSignature(portrait)), ...paint,
  };
  writeFileSync(join(output, name + ".png"), await chrome.screenshot());
}

try {
  frame = await chrome.nextFrame();
  data = await chrome.evaluate('state.classicAvailable === false ? "port" : "original"');
  for (const key of commands.slice(0, 25)) await press(key);
  await verifyHold("appraisal", /THEDRAGONLOOKSATYOUWITHINTEREST/i, "portrait:area:7:ecl:995f:caller:a6a7:PIC5.DAX:66:0:0");
  await press("enter");
  await verifyHold("offer", /IFYOUJOINMEIWILLMAKEYOUTHECOMMANDERS/i, "portrait:area:7:ecl:995f:caller:a718:PIC5.DAX:66:0:0");
  await press("enter");
  await verifyHold("vote", /ALDAHOWDOYOUVOTE/i, "portrait:area:7:ecl:a768:PIC5.DAX:66:0:0");
  for (let voter = 0; voter < 6; voter++) await press("a");
  assert.match(caption(), /Abattlebegins/i);
  const battlePortrait = "portrait:area:7:ecl:a803:PIC5.DAX:66:0:0";
  assert.equal(await chrome.evaluate("state.portrait"), battlePortrait);
  evidence.battle = { caption: caption(), portrait: battlePortrait };
  writeFileSync(join(output, "proof.json"), JSON.stringify(evidence, null, 2) + "\n");
} finally {
  await chrome.close();
}
console.log(output);
