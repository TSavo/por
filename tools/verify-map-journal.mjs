// Verifies the discovered map and the journal in Chrome.
//
//   npm run verify:map-journal -- <chrome-executable> <campaign-opening-directory>
//
// The second argument is the directory printed by `npm run verify:campaign-opening`.
// Its slot C holds the equipped party at the Slums gate.
//
// The runner records each tile the party stands on and stores the map in the
// save slot. The original Camp menu is unchanged. The journal opens with J in
// Enhanced display, and Classic display sends J to the game.
import assert from "node:assert/strict";
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";
const [chromePath, source] = process.argv.slice(2);
if (!chromePath || !source) throw new Error("Usage: verify-map-journal.mjs <chrome-executable> <campaign-opening-directory>");
const dir = mkdtempSync(join(process.env.POR_CAMPAIGN_OUTPUT_DIR ?? tmpdir(), "por-map-journal-"));
const saves = join(dir, "saves");
mkdirSync(saves);
for (const f of readdirSync(source).filter(n => /^(?:[A-J]|roster)\.json$/.test(n))) copyFileSync(join(source, f), join(saves, f));
const text = f => { const c = Array(1000).fill(" "); for (const [cell, ch] of f.text) c[cell] = String.fromCharCode(ch); return c.join("").replace(/ +/g, " "); };
const load = key => `31000000:1c0d,45000000:266c,52000000:${key}`;
async function leg(name, key, body) {
  const chrome = await openChromeCampaignLeg({ chromePath, directory: join(dir, name), checkpointDir: saves, bootKeys: load(key), startAt: "85000000", inputCompat: "" });
  try {
    let frame = await chrome.nextFrame();
    const step = async k => { await chrome.send(k); frame = await chrome.nextFrame(); return frame; };
    const maps = async () => JSON.parse(await chrome.evaluate(`(async () => {
      for (let i = 0; i < 100 && (automapRevision === undefined || automapRevision !== state.automapRevision); i++) await new Promise(r => setTimeout(r, 50));
      return JSON.stringify({ revision: automapRevision, want: state.automapRevision, maps: discoveredMaps, here: state.exploration });
    })()`));
    const keydown = key => chrome.evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", {
      key: ${JSON.stringify(key)}, code: ${JSON.stringify(key.length === 1 ? "Key" + key.toUpperCase() : key)}, bubbles: true, cancelable: true }))`);
    // A real key press that reaches the game produces a new frame.
    const type = async key => { await keydown(key); frame = await chrome.nextFrame(); return frame; };
    await body({ chrome, step, maps, keydown, type, frame: () => frame });
  } finally { await chrome.close(); }
}
const cells = m => Object.values(m.maps).reduce((n, a) => n + Object.keys(a.cells).length + Object.values(a.floors ?? {}).reduce((k, f) => k + Object.keys(f.cells).length, 0), 0);
let savedHere;
await leg("first", "2e63", async ({ chrome, step, maps, keydown, type, frame }) => {
  assert.match(text(frame()), /Area Cast View Encamp/i, text(frame()));
  let m = await maps();
  assert.equal(m.revision, m.want);
  // Loading restores the slot's map. A slot saved before maps were stored knows only the current tile.
  const stored = JSON.parse(readFileSync(join(saves, "C.json"), "utf8")).automap ?? {};
  const storedCells = cells({ maps: stored });
  assert.ok(cells(m) === storedCells || cells(m) === storedCells + 1,
    `Expected the ${storedCells} saved tiles after loading, found ${cells(m)}`);
  assert.ok(m.here?.walls, "The current tile reports its walls");
  assert.equal(await chrome.evaluate('document.querySelector("#journal-toggle").hidden'), false);
  for (const k of ["up", "right", "up", "right", "up", "right", "up"]) await step(k);
  m = await maps();
  assert.ok(cells(m) >= 2, "Walking discovers more tiles");
  await chrome.evaluate('send(":map-label Slums gate")'); await chrome.nextFrame();
  m = await maps();
  const floor = m.here.mapId === undefined ? m.maps[m.here.area] : m.maps[m.here.area].floors[m.here.mapId];
  assert.equal(floor.cells[`${m.here.x},${m.here.y}`].label, "Slums gate");
  savedHere = m.here;
  // The exploration menu does not use M, so M opens the map there and sends the game nothing.
  const exploring = await chrome.evaluate("state.sequence");
  await keydown("m");
  assert.equal(await chrome.evaluate('document.querySelector("#automap").hidden'), false, "M opens the map while exploring");
  await keydown("Escape");
  assert.equal(await chrome.evaluate('document.querySelector("#automap").hidden'), true);
  assert.equal(await chrome.evaluate("state.sequence"), exploring, "Opening the map sends the game no key");
  // One press of E opens the Camp menu.
  await step("e");
  assert.match(text(frame()), /Camp: Save View Magic Rest Alter Exit/);
  // The Camp menu uses M for Magic, so M goes to the game.
  await type("m");
  assert.match(text(frame()), /Cast Memorize Scribe Display Rest Exit/, `M should open Magic: ${text(frame())}`);
  assert.equal(await chrome.evaluate('document.querySelector("#automap").hidden'), true, "M must not open the map in camp");
  await step("e");
  assert.match(text(frame()), /Camp: Save View Magic Rest Alter Exit/);
  // The Camp menu does not use J, so a real J key opens the journal.
  await type("j");
  assert.ok(frame().journal, "J opens the journal from camp");
  await type("j");
  assert.equal(frame().journal, undefined);
  assert.doesNotMatch(text(frame()), /Journal/i, "The original Camp menu is unchanged");
  await step("j"); assert.ok(frame().journal, "J opens the journal from camp in Enhanced");
  await step("j"); assert.equal(frame().journal, undefined);
  await step("s");
  await step("e");
  const slot = JSON.parse(readFileSync(join(saves, "E.json"), "utf8"));
  const savedFloor = savedHere.mapId === undefined ? slot.automap[savedHere.area] : slot.automap[savedHere.area].floors[savedHere.mapId];
  assert.equal(savedFloor.cells[`${savedHere.x},${savedHere.y}`].label, "Slums gate", "The slot stores the labelled tile");
  // Classic: no Journal control, and J goes to the game.
  await chrome.evaluate('document.querySelector("#presentation").click()');
  assert.equal(await chrome.evaluate('document.documentElement.dataset.presentation'), "classic");
  assert.equal(await chrome.evaluate('document.querySelector("#journal-toggle").hidden'), true);
  const journal = await chrome.evaluate(`(async () => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", bubbles: true, cancelable: true }));
    await new Promise(r => setTimeout(r, 1500));
    return Boolean(state.journal) || !document.querySelector("#journal").hidden;
  })()`);
  assert.equal(journal, false, "J does not open the journal in Classic");
});
await leg("second", "1265", async ({ maps, frame }) => {
  const m = await maps();
  const floor = savedHere.mapId === undefined ? m.maps[savedHere.area] : m.maps[savedHere.area].floors[savedHere.mapId];
  assert.equal(floor.cells[`${savedHere.x},${savedHere.y}`].label, "Slums gate", "Loading the slot restores the map");
  assert.ok(cells(m) >= 2);
});
console.log("Verified the discovered map through a save and reload, the original Camp menu, and the Enhanced-only journal key:", dir);
