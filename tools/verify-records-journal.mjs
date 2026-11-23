import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const [chromePath] = process.argv.slice(2);
assert.ok(chromePath, "Usage: npm run verify:records-journal -- <Chrome executable>");
const fixture = "qa/fixtures/walk-clerk-offers-bivant";
const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const schedule = join(fixture, "prompts.jsonl");
const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").trim().split(/\r?\n/).map(JSON.parse);
const saveCommands = commands.slice(-4);
assert.deepEqual(saveCommands, ["s", "d", "n", "e"]);
const directory = mkdtempSync(join(tmpdir(), "por-records-"));
const saves = join(directory, "saves");
mkdirSync(saves);
copyCampaignSaves(fixture, saves);

const id = "commission-records";
const title = "Recover records of old Phlan - turned in";
const libraryReward = /THERE IS A REWARD FOR CLEARING THE LIBRARY/i;
const bookBounty = /WE FIND THESE DISCOURSES VALUABLE/i;
const camp = /Camp: Save View Magic Rest Alter Exit/i;
const text = ({ text }) => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of text) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ");
};

async function openJournal(chrome) {
  await chrome.pressKey("j");
  const { journal } = await chrome.nextFrame();
  assert.ok(journal, "J opens the Enhanced journal from Encamp");
  return journal.leads.find(lead => lead.id === id);
}

async function expectTurnedIn(chrome, stage) {
  const lead = await openJournal(chrome);
  assert.equal(lead?.status, "turned-in", `Records commission ${stage}`);
  assert.ok(await chrome.evaluate(`[...document.querySelectorAll("#leads > li > strong")]
    .some(heading => heading.textContent === ${JSON.stringify(title)} && heading.checkVisibility())`),
    `The Encamp journal shows the completed Records commission ${stage}`);
}

const first = await openChromeCampaignLeg({ chromePath, directory: join(directory, "first"),
  checkpointDir: saves, ...boot, schedule });
try {
  await first.nextFrame();
  let sawLibraryReward = false;
  let sawBookBounty = false;
  let frame;
  for (const key of commands.slice(0, -saveCommands.length)) {
    await first.send(key);
    frame = await first.nextFrame();
    sawLibraryReward ||= libraryReward.test(text(frame));
    sawBookBounty ||= bookBounty.test(text(frame));
  }
  assert.ok(sawLibraryReward && sawBookBounty, `Both distinct clerk rewards appeared in the stock walk (${directory})`);
  assert.match(text(frame), camp);
  console.log("Saw the Library clearance reward and the separate book bounty in the stock walk.");
  await expectTurnedIn(first, "after collecting the Library reward");
  await first.pressKey("j");
  assert.equal((await first.nextFrame()).journal, undefined);
  for (const key of saveCommands) {
    await first.send(key);
    await first.nextFrame();
  }
  const saved = JSON.parse(readFileSync(join(saves, "D.json"), "utf8"));
  assert.equal(saved.leads.find(lead => lead.id === id)?.status, "turned-in", "Slot D saves the turn-in");
} finally {
  await first.close();
}

const loadD = boot.bootKeys.replace(/:1265$/, ":2064");
assert.notEqual(loadD, boot.bootKeys, "Reload slot D instead of the original slot E");
const olderSave = join(directory, "older-saves");
mkdirSync(olderSave);
copyCampaignSaves(join(fixture, "after"), olderSave);
for (const [name, checkpointDir] of [["reload", saves], ["older-save", olderSave]]) {
  const chrome = await openChromeCampaignLeg({ chromePath, directory: join(directory, name),
    checkpointDir, ...boot, bootKeys: loadD });
  try {
    const initial = await chrome.nextFrame();
    assert.match(text(initial), /Area Cast View Encamp/i);
    await chrome.send("e");
    assert.match(text(await chrome.nextFrame()), camp);
    await expectTurnedIn(chrome, name === "reload" ? "after reloading slot D" : "when loading a pre-fix save");
  } finally {
    await chrome.close();
  }
}
console.log(`Verified the Records turn-in in Encamp, after saving and reloading, and from a pre-fix save (${directory}).`);
