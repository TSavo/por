// Exercise the normal folder input, browser storage, and the guest's Load Saved Game menu.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exploring, pressReturn } from "../acceptance/harness.mjs";
import { gamePage, openChrome } from "./chrome-check.mjs";

const work = mkdtempSync(join(tmpdir(), "por-save-import-"));
const folder = (name) => { const path = join(work, name); mkdirSync(path); return path; };
const primary = folder("legacy");
const overlap = folder("overlapping");
const malformed = folder("malformed");
const campaign = resolve("qa/fixtures/campaign-full");
const reward = resolve("qa/fixtures/walk-guide-party-sokal-reward/after/E.json");
copyFileSync(join(campaign, "A.json"), join(primary, "A.json"));
copyFileSync(reward, join(primary, "E.json"));
copyFileSync(join(campaign, "roster.json"), join(primary, "roster.json"));
copyFileSync("qa/fixtures/walk-guide-party-sokal-training/after/A.json", join(overlap, "A.json"));
copyFileSync("qa/fixtures/walk-guide-party-sokal-approach/after/J.json", join(overlap, "J.json"));
copyFileSync(join(campaign, "A.json"), join(malformed, "A.json"));
writeFileSync(join(malformed, "B.json"), '{"version":2}');
assert.notEqual(readFileSync(join(primary, "A.json"), "utf8"), readFileSync(join(overlap, "A.json"), "utf8"));

const probe = createServer().listen(0, "127.0.0.1");
await once(probe, "listening");
const { port } = probe.address();
await new Promise((done) => probe.close(done));
const url = `http://127.0.0.1:${port}/`;
const server = spawn(process.execPath, ["--import", "tsx", "tools/web/serve.ts"], {
  env: { ...process.env, POR_PLAY_PORT: String(port), POR_CLOCK: "fixed" },
  stdio: ["ignore", "pipe", "inherit"],
});
let chrome;
try {
  await Promise.race([once(server.stdout, "data"), once(server, "exit").then(([code]) => { throw new Error(`Server exited ${code}`); })]);
  chrome = await openChrome(url);
  await chrome.until("the game's Settings", 'state.ready && !document.querySelector("#save-import").hidden');
  await chrome.evaluate('window.porShell.settings()');
  await chrome.command("Page.setInterceptFileChooserDialog", { enabled: true });
  async function importFolder(path, message) {
    await chrome.command("Runtime.evaluate", {
      expression: 'document.querySelector("#save-import-button").click()',
      userGesture: true,
    });
    const { root } = await chrome.command("DOM.getDocument");
    const { nodeId } = await chrome.command("DOM.querySelector", { nodeId: root.nodeId, selector: "#save-import-folder" });
    await chrome.command("DOM.setFileInputFiles", { nodeId, files: [path] });
    return chrome.until(message, `(() => {
      const text = document.querySelector("#save-import-status").textContent;
      return text.includes(${JSON.stringify(message)}) && text;
    })()`);
  }
  const records = () => chrome.evaluate(`new Promise((done, failed) => {
    const open = indexedDB.open("por-resources", 1);
    open.onerror = () => failed(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const entries = {};
      const request = db.transaction("records", "readonly").objectStore("records").openCursor();
      request.onerror = () => { db.close(); failed(request.error); };
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) { db.close(); done(entries); return; }
        entries[cursor.key] = new TextDecoder().decode(cursor.value);
        cursor.continue();
      };
    };
  })`);
  console.log(await importFolder(malformed, "Could not import saves"));
  assert.deepEqual(await records(), {}, "A bad slot leaves the entire import untouched");
  console.log(await importFolder(primary, "Restart the game to use these saves"));
  console.log(await importFolder(overlap, "Existing records kept: A"));
  const persisted = Object.fromEntries([
    ["save:A", join(primary, "A.json")], ["save:E", reward],
    ["save:J", join(overlap, "J.json")], ["save:roster", join(primary, "roster.json")],
  ].map(([id, path]) => [id, readFileSync(path, "utf8")]));
  assert.deepEqual(await records(), persisted, "The disk records must persist byte for byte. Occupied A stays intact.");

  await chrome.command("Page.navigate", { url });
  await chrome.until("the restarted game", "typeof state === 'object' && state.ready", 240);
  assert.deepEqual(await records(), persisted);
  const page = gamePage(chrome);
  await chrome.evaluate("window.porShell.loadGame()");
  await chrome.until("the native slot picker", 'gameMenuText().includes("Load Which Game")');
  let text = await page.press("e");
  for (let at = 0; !exploring.test(text) && pressReturn.test(text) && at < 10; at++) text = await page.press("enter");
  assert.match(text, exploring);
  assert.equal(await chrome.evaluate("state.saveSlot"), "E");
  assert.match(text, /AELAR/);
  const saved = JSON.parse(persisted["save:E"]);
  const maps = await chrome.evaluate('gameFetch("/automap.json").then(response => response.json()).then(result => result.maps)');
  for (const [area, map] of Object.entries(saved.automap)) {
    for (const cell of Object.keys(map.cells)) assert.ok(maps[area]?.cells[cell], `Restored explored cell ${area}/${cell}`);
  }
  await chrome.evaluate("window.porShell.saveGame()");
  assert.match(await page.text(), /Save Which Game:/);
  await page.press("b", /Quit TO DOS/i);
  await page.press("n", /Camp: Save View Magic Rest Alter Exit/);
  await chrome.key("j");
  await chrome.until("the imported slot's Encamp journal", "state.journal?.leads.some(lead => lead.id === 'sokal-back-in-phlan')");
  console.log("Imported slot E loaded with the same party, journal, and automap after restart. The roster and preserved slot A were byte-identical.");
} finally {
  await chrome?.close();
  const stopped = once(server, "exit");
  if (server.exitCode === null) { server.kill(); await stopped; }
  rmSync(work, { recursive: true, force: true });
}
