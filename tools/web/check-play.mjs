// The browser-engine acceptance check (#223), in headless Chrome, as a player plays:
//
//   node tools/web/check-play.mjs [--server runner|web|loose] [--original <folder>] [--shots <dir>] [--party-guide-only | --creation-picker-only | --temple-picker-only]
//
// --server runner  `tools/browser-play.ts`, the Node runner behind POST /key and GET /state
//          web     `tools/web/serve.ts`, the engine in a Web Worker in the page (#228)
//          loose   the packaged-app layout of loose files, served as plain files (#229)
// --original a folder of the player's own original files (version 1.3 or the first release): the
//          runner is started with it (POR_GAMEDATA or POR_CLASSIC_PICTURES); the browser build is
//          given it through its folder picker's own code path. Nothing of it is copied.
//
// It boots to the first menu, adds SSI's ready-made characters, begins adventuring, walks, shows the
// Enhanced view, switches to Classic where there are original files, saves in slot A, starts again
// and loads slot A. Every step says what the screen showed.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { exploring, pressReturn } from "../acceptance/harness.mjs";
import { gamePage, openChrome } from "./chrome-check.mjs";
import { serveOriginalFolder } from "./original-test-server.mjs";

const args = process.argv.slice(2);
const option = (name) => { const at = args.indexOf(name); return at >= 0 ? args[at + 1] : undefined; };
const server = option("--server") ?? "runner";
const original = option("--original") && resolve(option("--original"));
const saveFaults = args.includes("--save-faults");
if (saveFaults && server === "runner") throw new Error("--save-faults requires --server web or loose");
const shots = option("--shots") && resolve(option("--shots"));
if (shots) mkdirSync(shots, { recursive: true });
const work = mkdtempSync(join(tmpdir(), "por-check-play-"));
const log = (line) => console.log(line);
const failures = [];
const expect = (what, ok, seen) => {
  log(`${ok ? "ok  " : "FAIL"} ${what}${seen === undefined ? "" : `: ${typeof seen === "string" ? seen : JSON.stringify(seen)}`}`);
  if (!ok) failures.push(what);
};

async function freePort() {
  const probe = createServer();
  await new Promise((done) => probe.listen(0, "127.0.0.1", done));
  const { port } = probe.address();
  await new Promise((done) => probe.close(done));
  return port;
}

/** What a first-release or 1.3 folder is: the 1.3 GAME.OVR begins FBOV (tools/release/original-files.ts). */
function originalRelease(folder) {
  const names = readdirSync(folder);
  const inner = names.includes("GAME.OVR") ? folder : join(folder, names.find((name) => statSync(join(folder, name)).isDirectory() &&
    readdirSync(join(folder, name)).includes("GAME.OVR")));
  return inner;
}

/** Start the game's server; resolves to its URL and a stop function. */
async function startServer() {
  const port = await freePort();
  const env = { ...process.env, POR_PLAY_PORT: String(port), POR_CLOCK: "fixed", POR_PREGEN_PARTY: "1", POR_SAVE_DIR: join(work, "saves") };
  let command;
  if (server === "runner") {
    command = ["--import", "tsx", "tools/browser-play.ts"];
    if (original) {
      const folder = originalRelease(original);
      const { readFileSync } = await import("node:fs");
      const magic = readFileSync(join(folder, "GAME.OVR")).subarray(0, 4).toString("latin1");
      if (magic === "FBOV") env.POR_GAMEDATA = folder;
      else env.POR_CLASSIC_PICTURES = folder;
    }
  } else if (server === "web") command = ["--import", "tsx", "tools/web/serve.ts"];
  else if (server === "loose") command = ["--import", "tsx", "tools/web/serve-loose.ts"];
  else throw new Error(`--server ${server}?`);
  const child = spawn(process.execPath, command, { env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  const url = await new Promise((found, failed) => {
    const read = (chunk) => {
      output += chunk;
      const match = /(http:\/\/127\.0\.0\.1:\d+\/?\S*)/.exec(output);
      if (match) found(match[1]);
    };
    child.stdout.on("data", read);
    child.stderr.on("data", (chunk) => { output += chunk; });
    child.on("exit", (code) => failed(new Error(`the server exited (${code}):\n${output}`)));
  });
  return { url, output: () => output, stop: async () => { child.kill(); await new Promise((done) => child.exitCode !== null ? done() : child.once("exit", done)); } };
}

let chrome;
const gameHttpRequests = new Set();
// Present the browser with lowercase DOS filenames to exercise case-insensitive folder loading.
const originalServer = server !== "runner" && original
  ? await serveOriginalFolder(original, { lowercaseFiles: true }) : undefined;
async function openGame(game) {
  if (!chrome) {
    chrome = await openChrome("about:blank", { bypassCsp: Boolean(originalServer), log: (line) => /exception|error/i.test(line) && log(`  page ${line}`) });
    if (server !== "runner") {
      await chrome.command("Network.enable");
      chrome.listeners.push(({ method, params }) => {
        if (method !== "Network.requestWillBeSent") return;
        const { origin, pathname } = new URL(params.request.url);
        if (origin === new URL(game.url).origin && ["/key", "/state"].includes(pathname)) gameHttpRequests.add(pathname);
      });
      await chrome.command("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.startedWorkers = [];
        window.Worker = class extends Worker {
          constructor(url, options) {
            super(url, options);
            window.startedWorkers.push(new URL(url, location.href).pathname);
          }
        };` });
    }
  }
  await chrome.command("Page.navigate", { url: game.url });
  await chrome.until("the game's first frame", "typeof state === 'object' && state.sequence > 0 && state.ready", 240);
  if (server !== "runner") {
    expect("the page started the game worker", await chrome.evaluate('window.startedWorkers.includes("/web/engine-worker.js")'));
  }
  if (server !== "runner" && original) {
    // The folder picker's own code path, given the player's files as the browser's picker gives them.
    const used = await chrome.evaluate(`porTestUseOriginalFolder(${JSON.stringify(originalServer.url)})`);
    log(`  original files: ${JSON.stringify(used)}`);
    await chrome.until("the game to start again with the original files", "state.classicAvailable === true && state.ready", 240);
  }
  return gamePage(chrome);
}

const screenshot = async (name) => { if (shots) await chrome.screenshot(join(shots, `${server}-${name}.png`)); };
const position = () => chrome.evaluate("state.exploration && [state.exploration.x, state.exploration.y, state.exploration.facing]");

async function checkFailedOverwrite(page) {
  const committed = () => chrome.evaluate(`new Promise((resolve, reject) => {
    const open = indexedDB.open("por-resources");
    open.onerror = () => reject(open.error);
    open.onsuccess = () => {
      const db = open.result;
      const req = db.transaction("records").objectStore("records").get("save:A");
      req.onsuccess = () => { db.close(); resolve(new TextDecoder().decode(req.result)); };
      req.onerror = () => { db.close(); reject(req.error); };
    };
  })`);
  const previous = await committed();
  assert.ok(previous, "the first save committed slot A");
  await page.press("down", exploring);
  const updated = await position();
  await page.press("e", /Camp: Save/);
  await page.press("s", /Save Which Game:/);
  await chrome.evaluate(`(() => {
    const put = IDBObjectStore.prototype.put;
    window.saveFault = { count: 0, action: null };
    IDBObjectStore.prototype.put = function (value, key) {
      const request = put.call(this, value, key);
      if (key !== "save:A") return request;
      saveFault.count++;
      request.onsuccess = () => {
        const hold = () => {
          if (saveFault.action === "abort") this.transaction.abort();
          else if (saveFault.action !== "commit") this.get(key).onsuccess = hold;
        };
        hold();
      };
      return request;
    };
  })()`);
  const saveEvent = await chrome.evaluate("state.saveSlotEvent");
  await chrome.key("a");
  await chrome.until("the overwrite transaction", "saveFault.count === 1", 15);
  await chrome.evaluate('saveFault.action = "abort"');
  await chrome.until("a visible save failure", 'document.querySelector("#retry-storage")?.offsetWidth', 10);
  assert.equal(await committed(), previous, "an aborted overwrite preserves the committed slot");
  assert.equal(await chrome.evaluate("state.saveSlotEvent"), saveEvent, "failure cannot acknowledge a save");
  assert.doesNotMatch(await page.text(), /Quit TO DOS/i);
  log("ok   failed overwrite stays retryable and preserves slot A");

  await chrome.evaluate("saveFault.action = null");
  const enter = { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 };
  await chrome.command("Input.dispatchKeyEvent", { ...enter, type: "keyDown", text: "\r" });
  await chrome.command("Input.dispatchKeyEvent", { ...enter, type: "keyUp" });
  await chrome.until("the retry transaction", "saveFault.count === 2", 15);
  const dialog = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("No reload confirmation for pending save")), 10000);
    chrome.listeners.push(({ method, params }) => {
      if (method === "Page.javascriptDialogOpening" && params.type === "beforeunload") {
        clearTimeout(timer);
        resolve();
      }
    });
  });
  await chrome.command("Runtime.evaluate", { expression: "setTimeout(() => location.reload(), 0)" });
  await dialog;
  await chrome.command("Page.handleJavaScriptDialog", { accept: false });
  assert.equal(await chrome.evaluate("state.saveSlotEvent"), saveEvent, "retry is still pending");
  assert.doesNotMatch(await page.text(), /Quit TO DOS/i);
  await chrome.evaluate('saveFault.action = "commit"');
  await chrome.until("the committed save and native quit prompt", `state.saveSlotEvent === ${saveEvent + 1} && state.ready`, 15);
  assert.match(await page.text(), /Quit TO DOS Yes No/i);
  assert.notEqual(await committed(), previous, "the retry committed new bytes");
  await chrome.key("y");
  await chrome.until("the game to quit", "state.stopped", 15);
  log("ok   pending retry guards reload, then allows save and quit");
  return updated;
}

async function clickChoice(label) {
  const point = await chrome.until(`the ${label} row click target`, `(() => {
    const b = [...document.querySelectorAll("#menu-choices button")].find(button =>
      button.getAttribute("aria-label") === ${JSON.stringify(label)})?.getBoundingClientRect();
    return b && { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  })()`, 10);
  for (const type of ["mousePressed", "mouseReleased"])
    await chrome.command("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
}

async function checkTemplePicker(page) {
  for (const heading of [2, 0]) {
    for (let turn = 0; turn < 3 && (await position())?.[2] !== heading; turn++) await page.press("right");
    await page.press("up");
  }
  await page.press("y", /Heal View Pool Appraise Exit/);
  await page.press("h", /how can we help you/);
  await page.press("down");
  const selected = `document.querySelector('#menu-choices button[aria-pressed="true"]')?.getAttribute("aria-label")`;
  await chrome.until("Cure Disease highlighted", `${selected} === "Cure Disease"`, 5);
  await page.press("up");
  await chrome.until("Cure Blindness highlighted", `${selected} === "Cure Blindness"`, 5);
  await clickChoice("Cure Light Wounds");
  await chrome.until("the priest responds to the click", '/anyway: Yes No|pay for cure Yes No/i.test(gameMenuText())', 10);
  if (/anyway: Yes No/i.test(await page.text())) await page.press("y");
  assert.match(await page.text(), /Cure Light Wounds will only cost 100 gold pieces/i);
  await page.press("n", /Heal Exit/);
  log("ok   arrow keys move the temple highlight and clicking Cure Light Wounds reaches its 100-gold confirmation");
}

async function checkCreationPicker(page) {
  const selected = `document.querySelector('#menu-choices button[aria-pressed="true"]')?.getAttribute("aria-label")`;
  async function pick(key, expected) {
    await page.press(key);
    await chrome.until(`selected ${expected}`, `${selected} === ${JSON.stringify(expected)}`, 5);
  }
  await page.press("c", /Half-Elf/);
  await chrome.until("Dwarf selected", `${selected} === "Dwarf"`, 5);
  await pick("down", "Elf");
  await pick("up", "Dwarf");
  await pick("down", "Elf");
  await screenshot("creation-arrow-elf");
  await page.press("enter", /Male Female/);
  await pick("down", "Female");
  await page.press("enter", /Fighter/);
  await pick("down", "Magic-User");
  await page.press("enter", /Lawful/);
  await pick("down", "Lawful Neutral");
  await page.press("enter", /Keep this character/);
  const sheet = await page.text();
  assert.match(sheet, /Female Elf/);
  assert.match(sheet, /Lawful Neutral/);
  assert.match(sheet, /Magic-User/);
  log("ok   ArrowDown/ArrowUp and Enter select the race, sex, class and alignment on the rolled sheet");
  await page.press("y", /Character name:/);
  await page.press("v");
  await page.press("enter", /Head Body Keep/);
  await page.press("k", /Parts color-1 color-2 Size Exit/);
  await page.press("e", /Is this icon ok/);
  await page.press("y", /Create New Character/);
  // Stay in this session: adding someone changes the layout of the next creation menus.
  await page.press("a", /Add a character: Add Exit/);
  const rosterHighlight = () => chrome.evaluate(`state.text.filter(([cell, glyph, color]) =>
    cell < 960 && glyph > 32 && color === 15).map(([, glyph]) => String.fromCharCode(glyph)).join("")`);
  const first = await rosterHighlight();
  assert.ok(first);
  await page.press("down");
  const second = await rosterHighlight();
  assert.ok(second && second !== first, "Down moved the native roster highlight");
  await page.press("up");
  assert.equal(await rosterHighlight(), first);
  await page.press("down");
  await page.press("a", /Add a character: Add Exit/);
  assert.equal(await rosterHighlight(), "*" + second);
  await page.press("e", /Create New Character/);
  const partyHighlight = () => chrome.evaluate(`state.text.filter(([cell, glyph, color]) =>
    cell >= 160 && cell < 400 && cell % 40 < 32 && glyph > 32 && color === 15)
    .map(([, glyph]) => String.fromCharCode(glyph)).join("")`);
  // Modify is available for the zero-experience character created above.
  await page.press("a", /Add a character: Add Exit/);
  for (let moves = 0; moves < 12 && await rosterHighlight() !== "V"; moves++) await page.press("down");
  const nextMember = await rosterHighlight();
  assert.equal(nextMember, "V");
  await page.press("a", /Add a character: Add Exit/);
  assert.equal(await rosterHighlight(), "*" + nextMember);
  await page.press("e", /Choose a function/);
  const activeMember = await partyHighlight();
  // The Add list uses the filename, while the party roster can show a longer name.
  assert.ok([second, nextMember].some(name => activeMember.startsWith(name)));
  const otherMember = activeMember.startsWith(second) ? nextMember : second;
  await page.press("down", /Choose a function/);
  assert.ok((await partyHighlight()).startsWith(otherMember), "Down moves the highlight on the main party roster");
  await page.press("up", /Choose a function/);
  assert.equal(await partyHighlight(), activeMember, "Up restores the main roster highlight");
  for (let moves = 0; moves < 3 && await partyHighlight() !== "V"; moves++) await page.press("end");
  assert.equal(await partyHighlight(), "V");
  await page.press("m", /Modify character: Keep Exit/);
  const scores = () => chrome.evaluate(`Array.from(gameMenuText().matchAll(
    /\\b(?:STR|INT|WIS|DEX|CON|CHA|HP) (-?\\d+(?:\\(\\d+\\))?)/g), match => match[1])`);
  const originalScores = await scores();
  assert.equal(originalScores.length, 7);
  await chrome.until("MaX on the Modify command row", `(() => {
    const option = document.querySelector("#max-character");
    const shortcut = option.lastElementChild;
    return !option.hidden && option.textContent === "MaX" &&
      getComputedStyle(option).top !== "auto" &&
      getComputedStyle(shortcut).color === "rgb(" + state.textColors[15].join(", ") + ")" &&
      getComputedStyle(shortcut).color !== getComputedStyle(option).color;
  })()`, 5);
  if (original) {
    await chrome.key("x");
    await chrome.until("MaX in progress", 'document.querySelector("#max-character").disabled');
    await chrome.key("f10");
    await chrome.until("Classic Modify menu", '!enhanced && document.querySelector("#max-character").hidden');
    await chrome.until("the interrupted MaX run to stop", '!document.querySelector("#max-character").disabled');
    await page.settle();
    const classicScores = await scores();
    await page.press("x", /Modify character: Keep Exit/);
    assert.deepEqual(await scores(), classicScores, "Switching to Classic stops MaX and X preserves the scores");
    assert.equal(await chrome.evaluate('document.querySelector("#max-character-status").textContent'), "");
    await chrome.key("f10");
    await chrome.until("Enhanced Modify menu", 'enhanced && !document.querySelector("#max-character").hidden');
  }
  await page.settle();
  // Deliver both events in one browser task so the first key's worker response is still pending.
  assert.equal(await chrome.evaluate(`(() => {
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", code: "ArrowDown" }));
    const pending = posting;
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "x", code: "KeyX" }));
    return pending;
  })()`), true, "Down is still in flight when X begins");
  await chrome.until("the maximum attributes and HP", 'document.querySelector("#max-character-status").textContent.includes("at their maximum")', 90);
  const maximum = await scores();
  assert.notDeepEqual(maximum, originalScores);
  for (let field = maximum.length - 1; field >= 0; field--) {
    assert.equal(await chrome.evaluate("modifyFields().findIndex(({ selected }) => selected)"), field);
    await page.press("right", /Modify character: Keep Exit/);
    assert.deepEqual(await scores(), maximum, "Right cannot raise a field beyond the shortcut's result");
    if (field > 0) await page.press("up", /Modify character: Keep Exit/);
  }
  await page.press("k", /Choose a function/);
  await page.press("m", /Modify character: Keep Exit/);
  assert.deepEqual(await scores(), maximum, "Keep saves all seven values");
  await page.press("e", /Choose a function/);
  assert.equal(await chrome.evaluate('document.querySelector("#max-character").hidden'), true);

  await page.press("c", /Half-Elf/);
  await pick("down", "Elf");
  await pick("up", "Dwarf");
  await clickChoice("Gnome");
  await chrome.until("race click advanced to gender", 'gameMenuText().includes("Male Female")', 10);
  await pick("down", "Female");
  await page.press("enter", /Fighter/);
  const secondOption = () => chrome.evaluate(`document.querySelectorAll("#menu-choices button")[1].getAttribute("aria-label")`);
  const secondClass = await secondOption();
  await pick("down", secondClass);
  await page.press("enter", /Lawful/);
  const secondAlignment = await secondOption();
  await pick("down", secondAlignment);
  await page.press("enter", /Keep this character/);
  const nextSheet = await page.text();
  assert.match(nextSheet, /Female Gnome/);
  assert.ok(nextSheet.includes(secondClass));
  assert.ok(nextSheet.includes(secondAlignment));
  log("ok   roster arrows add the highlighted character and all four creation menus still work without a reload");
}

async function checkPartyGuide(page) {
  const guide = "document.querySelector('#party-guide')";
  const guideVisible = `Boolean(${guide}?.getClientRects().length)`;
  const guideLines = "porNarrationPlayback().lines.filter(line => line.unitId === 'party-setup')";
  const heard = () => chrome.evaluate(`${guideLines}.length`);
  await chrome.until("the original title", "state.scene === 'scene:title' && !publisherSplashUp()");
  assert.equal(await chrome.evaluate(guideVisible), false, "the title hides the party instruction");
  assert.equal(await heard(), 0, "the title leaves the party guide unplayed");
  const isClassicTest = Boolean(original);
  if (isClassicTest) {
    await chrome.key("f10");
    await chrome.until("Classic presentation", "!enhanced");
  }
  await page.pressUntil("enter", /Create New Character.*Add Character to Party/);
  if (isClassicTest) {
    assert.equal(await chrome.evaluate(guideVisible), false, "Classic hides the party instruction");
    assert.equal(await heard(), 0, "Classic leaves the party guide unplayed");
    await chrome.key("f10");
    await chrome.until("Enhanced presentation", "enhanced");
  }
  await chrome.until("the Enhanced party instruction", guideVisible, 10);
  const overlaps = await chrome.evaluate(`(() => {
    const banner = ${guide}.getBoundingClientRect();
    return [...document.querySelectorAll("#game-text span")].some(span => {
      if (!span.textContent.trim()) return false;
      const glyph = span.getBoundingClientRect();
      return glyph.width && glyph.left < banner.right && glyph.right > banner.left &&
        glyph.top < banner.bottom && glyph.bottom > banner.top;
    });
  })()`);
  assert.equal(overlaps, false, "the party instruction leaves native menu text visible");
  const message = await chrome.evaluate(`${guide}.textContent.trim()`);
  assert.match(message, /up to six characters/i);
  assert.match(message, /add them to your party/i);
  assert.match(message, /begin adventuring/i);
  const playback = await chrome.until("party narration at full length",
    `${guideLines}.find(line => line.outcome === "ended")`, 30);
  assert.ok(playback.duration > 0 && playback.position >= playback.duration - 0.1);
  assert.equal(await heard(), 1);
  log(`ok   party screen displayed “${message}” and played the recording once (${playback.duration.toFixed(2)} s)`);
  await screenshot("1-first-menu");
  await page.press("a", /Add a character: Add Exit/);
  assert.equal(await chrome.evaluate(guideVisible), false, "the Add screen hides the instruction");
  await page.press("e", /Create New Character/);
  await chrome.until("the party instruction on return", guideVisible);
  assert.equal(await heard(), 1, "returning to the menu does not repeat the narration");
  await chrome.evaluate("window.guideTestBeforeReload = true");
  await chrome.command("Page.reload");
  await chrome.until("the reloaded game", "!window.guideTestBeforeReload && typeof state === 'object' && state.ready");
  await page.settle();
  if (await chrome.evaluate("state.scene === 'scene:title'")) {
    await chrome.until("the reloaded title", "!publisherSplashUp()");
  }
  await page.pressUntil("enter", /Create New Character.*Add Character to Party/);
  await chrome.until("the reloaded party screen", guideVisible);
  assert.equal(await heard(), 0, "reloading the menu does not replay the narration");
  log("ok   the party instruction survives a return and reload without repeating the recording");
}

let game = await startServer();
async function checkGame() {
  // 1. Boot to the first menu.
  let page = await openGame(game);
  await page.settle(240);
  if (args.includes("--party-guide-only")) return checkPartyGuide(page);
  let text = await page.text();
  for (let presses = 0; !/Add Character to Party/.test(text) && presses < 12; presses++) text = await page.press("enter");
  expect("boots to the first menu", /Create New Character/.test(text) && /Add Character to Party/.test(text), text);
  expect("starts in Enhanced", await chrome.evaluate("enhanced === true"));
  const classicAvailable = await chrome.evaluate("state.classicAvailable");
  expect(original ? "Classic is available with the original files" : "Classic is not available without original files",
    classicAvailable === Boolean(original), classicAvailable);
  expect("the display switch reflects Classic availability", await chrome.evaluate("!presentation.hidden") === classicAvailable);
  await screenshot("1-first-menu");
  if (args.includes("--creation-picker-only")) return checkCreationPicker(page);

  // 2. SSI's ready-made characters.
  text = await page.press("a", /Add a character: Add Exit/);
  const marked = (screen) => (screen.match(/\* \w+/g) ?? []).length;
  while (/Add a character: Add Exit/.test(text) && marked(text) < 6) {
    text = await page.press("a");
    if (/Add a character: Add Exit/.test(text) && marked(text) < 6) text = await page.press("end");
  }
  if (/Add a character: Add Exit/.test(text)) text = await page.press("e");
  expect("a ready-made party of six", /BEGIN Adventuring/.test(text) && (await chrome.evaluate("state.text.length")) > 0, text);
  await screenshot("2-party");

  // 3. Begin adventuring and go through the opening until the party can walk.
  text = await page.press("b");
  for (let presses = 0; !exploring.test(text) && presses < 60; presses++) {
    if (!pressReturn.test(text) && !/<enter>|<return>/i.test(text)) log(`  opening shows: ${text}`);
    text = await page.press("enter");
  }
  expect("begins adventuring and reaches the exploration menu", exploring.test(text), text);

  if (args.includes("--temple-picker-only")) return checkTemplePicker(page);

  // 4. Walk: the tour ends at the Slums gate (0,4) facing west; turn about and step east into New Phlan.
  const before = await position();
  await page.press("down");
  const turned = await position();
  text = await page.press("up");
  const after = await position();
  expect("the party turns and walks", turned?.[2] !== before?.[2] && after?.[0] !== turned?.[0], { before, turned, after });
  while (!exploring.test(text) && pressReturn.test(text)) text = await page.press("enter");
  expect("the party can walk on", exploring.test(text), text);

  // 5. The Enhanced view: scenery from the on-demand art, painted by the renderer.
  const paintedCanvas = `[...document.querySelectorAll("canvas")].some((c) => c.offsetParent && c.width > 0)`;
  await chrome.until("the Enhanced scenery to be painted", paintedCanvas, 60).catch(() => {});
  const enhancedView = await chrome.evaluate(`({ enhanced, scenery: Boolean(state.scenery), tiles: state.tiles?.length ?? 0,
    canvas: ${paintedCanvas} })`);
  expect("the Enhanced view shows the scenery", enhancedView.enhanced && (enhancedView.scenery || enhancedView.tiles > 0), enhancedView);
  await screenshot("3-enhanced");

  // 6. Classic, from the player's own files.
  if (classicAvailable) {
    await chrome.key("f10");
    await chrome.until("the Classic picture", `enhanced === false && typeof state.frame === "string"`, 60).catch(() => {});
    const classic = await chrome.evaluate(`({ enhanced, frame: typeof state.frame === "string" && state.frame.length })`);
    expect("F10 switches to Classic, showing the game's own picture", classic.enhanced === false && classic.frame > 1000, classic);
    await screenshot("4-classic");
    await chrome.key("f10");
    await chrome.until("the Enhanced view again", "enhanced === true", 60).catch(() => {});
    expect("F10 switches back to Enhanced", await chrome.evaluate("enhanced === true"));
  }

  // 7. Save in slot A.
  let saved = await position();
  await page.press("e", /Camp: Save View Magic Rest Alter Exit/);
  await page.press("s", /Save Which Game: A B C D E F G H I J/);
  await page.press("a", /Quit TO DOS Yes No/);
  await page.press("n", /Camp: Save View Magic Rest Alter Exit/);
  text = await page.press("e", exploring);
  expect("saves in slot A", exploring.test(text) && (await chrome.evaluate("state.saveSlot")) === "A", await chrome.evaluate("state.saveSlot"));

  if (saveFaults) saved = await checkFailedOverwrite(page);

  // 8. Start again and load slot A.
  if (server === "runner") {
    await game.stop();
    game = await startServer();
  }
  page = await openGame(game);
  await page.settle(240);
  text = await page.text();
  for (let presses = 0; !/Load Saved Game/.test(text) && presses < 12; presses++) text = await page.press("enter");
  await page.press("l", /Load Which Game: A/);
  text = await page.press("a");
  for (let presses = 0; !exploring.test(text) && pressReturn.test(text) && presses < 10; presses++) text = await page.press("enter");
  const loaded = await position();
  expect("loads slot A where the party saved", exploring.test(text) && JSON.stringify(loaded) === JSON.stringify(saved), { saved, loaded });
  await screenshot("5-loaded");
  if (server !== "runner" && original) {
    await chrome.key("f10");
    await chrome.until("Classic again", "!enhanced");
    await chrome.evaluate(`{
      window.dispatchEvent(new Event("por-original-files-changed"));
      if (document.querySelector("#settings").hidden) window.porShell.settings();
    }`);
    await chrome.until("the original files settings", '!document.querySelector("#original-files-stop").hidden');
    const currentGame = () => chrome.evaluate("JSON.stringify([state.sequence, state.exploration, state.saveSlot, state.text, enhanced])");
    const beforeChange = await currentGame();
    const requestChange = async (action) => {
      await chrome.evaluate(`document.querySelector("#original-files-${action}").click()`);
      await chrome.until("the restart warning", 'document.querySelector("#original-files-restart").open');
    };
    const cancelChange = async () => {
      await chrome.key("escape");
      await chrome.until("the restart warning to close", '!document.querySelector("#original-files-restart").open');
    };
    const continueChange = () => chrome.evaluate('document.querySelector("#original-files-continue").click()');

    await requestChange("use");
    await cancelChange();
    expect("canceling a folder change leaves the party and Classic display in place", await currentGame() === beforeChange);
    await chrome.evaluate(`window.showDirectoryPicker = async () => {
      window.testPickerCanceled = true;
      throw new DOMException("Canceled", "AbortError");
    }`);
    await requestChange("use");
    await continueChange();
    await chrome.until("the canceled picker to return", 'window.testPickerCanceled && !document.querySelector("#original-files-use").disabled');
    expect("canceling the picker leaves the party and Classic display in place", await currentGame() === beforeChange);

    await requestChange("stop");
    await cancelChange();
    expect("canceling removal leaves the party and Classic display in place", await currentGame() === beforeChange);
    await requestChange("stop");
    await continueChange();
    await chrome.until("the game to stop using the original files", "state.classicAvailable === false && enhanced && presentation.hidden");
    expect("confirming removal restarts in Enhanced and hides the Classic control", true);
  }
  if (server !== "runner") {
    expect("the page handled keys and state without HTTP requests", gameHttpRequests.size === 0, [...gameHttpRequests]);
  }
}
try {
  await checkGame();
} catch (error) {
  failures.push(error.message);
  log(`FAIL ${error.stack}`);
  if (chrome) await screenshot("failure").catch(() => {});
} finally {
  await chrome?.close();
  await game.stop();
  originalServer?.close();
  rmSync(work, { recursive: true, force: true });
}
log(failures.length ? `${failures.length} failed` : "all passed");
process.exitCode = failures.length ? 1 : 0;
