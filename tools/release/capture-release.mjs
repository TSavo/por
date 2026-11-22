// Plays the opening of a running release in headless Chrome and saves what the page shows.
//
//   node tools/release/capture-release.mjs <game-url> <output-directory> [chrome-executable]
//
// Start it before the release, so the page is up as soon as the server answers, as the player's browser
// is; then start the release with POR_PREGEN_PARTY=1 (the ready-made characters on the Add Character menu)
// and POR_OPEN_BROWSER=0. Chrome runs with its own throwaway profile. It saves, in the output directory:
//   1-publisher.png  the publisher screen, when the page is up in time to see it
//   2-title.png      the title, once its name and SPECIAL EDITION have faded in
//   3-code-wheel.png the start-up code-wheel question
//   4-main-menu.png  the first menu, after the word read off the wheel
//   5-new-phlan.png  the first-person view in New Phlan with the ready-made party
//   report.json      what each stage showed, the WebGL renderer, and the page's console
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [url, output, chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"] = process.argv.slice(2);
if (!url || !output) throw new Error("Usage: capture-release.mjs <game-url> <output-directory> [chrome-executable]");
mkdirSync(output, { recursive: true });
const wheel = JSON.parse(readFileSync(new URL("../../src/codewheel/wheel.json", import.meta.url), "utf8"));
const report = { url, stages: {}, console: [] };
const note = (stage, details) => {
  report.stages[stage] = details;
  console.log(`${stage}: ${JSON.stringify(details)}`);
  writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
};

/** The word the wheel gives, read the way a player reads it (as tools/verify-code-wheel-screen.mjs does). */
function readWheel({ espruar, dethek, path }) {
  const e = wheel.outer.runes.indexOf(espruar), k = wheel.inner.runes.indexOf(dethek);
  const { windows } = wheel.inner.paths.find(({ id }) => id === path);
  return windows.map((w, ring) => wheel.outer.rings[ring][(((w - k + e) % 36) + 36) % 36]).join("");
}

const profile = mkdtempSync(join(tmpdir(), "por-release-chrome-"));
const chrome = spawn(chromePath, ["--headless", "--no-first-run", "--mute-audio", "--window-size=1440,1000",
  "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"],
{ stdio: "ignore" });
let socket, id = 0;
const pending = new Map();
function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, { resolve, reject });
    socket.send(JSON.stringify({ id: n, method, params }));
  });
}
async function evaluate(expression) {
  const { result, exceptionDetails } = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}
async function until(what, expression, limit = 60_000) {
  for (const deadline = Date.now() + limit; Date.now() < deadline; await delay(50)) {
    const value = await evaluate(expression);
    if (value) return value;
  }
  throw new Error(`Timed out waiting for ${what}. The screen shows: ${await screenText()}`);
}
const screenText = () => evaluate(`(() => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of state.text ?? []) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ");
})()`);
const settled = `(Boolean(state.stopped) || (state.ready && !posting && renderingSequence === undefined)) && !(typeof codeWheel === "object" && codeWheel.busy)`;
async function key(name) {
  await until("the page to be ready for a key", settled);
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(name)}, bubbles: true, cancelable: true })), undefined`);
  await until(`the page to deal with ${name}`, settled);
}
async function shot(file) {
  const { data } = await command("Page.captureScreenshot", { format: "png" });
  writeFileSync(join(output, file), Buffer.from(data, "base64"));
}

try {
  let port;
  for (const deadline = Date.now() + 30_000; !port && Date.now() < deadline; await delay(50)) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]; } catch { /* not yet */ }
  }
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  socket = new WebSocket(pages.find(({ type }) => type === "page").webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    } else if (message.method === "Runtime.consoleAPICalled") {
      report.console.push(`${message.params.type}: ${message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ")}`);
    } else if (message.method === "Runtime.exceptionThrown") {
      report.console.push(`exception: ${message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text}`);
    }
  });
  await command("Runtime.enable");
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  for (const deadline = Date.now() + 180_000; ; await delay(100)) {
    if (await fetch(url).then((response) => response.ok, () => false)) break;
    if (Date.now() > deadline) throw new Error(`No game server at ${url}`);
  }
  report.serverAnsweredAt = new Date().toISOString();
  // What the game showed when its server first answered, before the page loads.
  report.firstState = await fetch(new URL("state", url)).then((response) => response.json())
    .then(({ ready, scene, sequence }) => ({ ready, scene: scene ?? null, sequence }));
  await command("Page.navigate", { url });
  await until("the game page", `typeof send === "function" && document.querySelector("#screen").naturalWidth === 320`);
  // The page opens in Classic display. The release runs in Enhanced.
  const openedIn = await evaluate("document.documentElement.dataset.presentation ?? (enhanced ? 'enhanced' : 'classic')");
  await evaluate(`if (!enhanced) document.querySelector("#presentation").click(); undefined`);
  report.openedIn = openedIn;

  // The game's own publisher frame, or the page's publisher splash shown before the title.
  const scene = () => evaluate("state.scene ?? null");
  const splash = `(() => { const image = document.querySelector("#publisher-splash");
    return Boolean(image && !image.hidden && image.complete && image.naturalWidth && getComputedStyle(image).opacity === "1"); })()`;
  const sceneWhenThePageLoaded = await scene();
  let publisher;
  for (const deadline = Date.now() + 15_000; !publisher && Date.now() < deadline; await delay(50)) {
    if (await evaluate(splash)) publisher = "the page's splash";
    else if (await scene() === "scene:publisher") publisher = "the game's frame";
  }
  if (publisher) {
    await shot("1-publisher.png");
    note("publisher", { shownBy: publisher, sceneWhenThePageLoaded });
    if (publisher === "the game's frame") await key("Enter");
  } else note("publisher", { seen: false, sceneWhenThePageLoaded });

  await until("the title", `state.ready && state.scene === "scene:title"`);
  await until("the title's name and SPECIAL EDITION to fade in",
    `[...document.querySelectorAll("#title-name, #title-edition")].every(image => image.complete && image.naturalWidth && getComputedStyle(image).opacity === "1")`, 30_000);
  await shot("2-title.png");
  note("title", { scene: await scene(), layers: await evaluate(`[...document.querySelectorAll("#title-name, #title-edition")].map(image =>
    ({ id: image.id, shown: image.classList.contains("shown"), opacity: getComputedStyle(image).opacity, width: image.naturalWidth }))`) });

  await key(" ");
  await until("the code-wheel question", `state.ready && (Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion))`);
  await until("the wheel to be drawn", `typeof codeWheel === "object" && Boolean(codeWheel.painted)`, 30_000);
  await delay(1000);
  await shot("3-code-wheel.png");
  const number = await evaluate(`typeof codeWheel === "object" && codeWheel.question ? codeWheel.question.number : state.codeWheelQuestion`);
  const question = wheel.questions.find((entry) => entry.number === number);
  const word = readWheel(question);
  note("code wheel", { question: number, espruar: question.espruar, dethek: question.dethek, path: question.path, word,
    wheelShown: await evaluate(`!document.querySelector("#code-wheel").hidden`) });

  for (const letter of word.toLowerCase()) await key(letter);
  await key("Enter");
  await delay(1000);
  await until("the main menu", `state.ready && !(Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion))`, 20_000);
  await shot("4-main-menu.png");
  note("main menu", { text: (await screenText()).trim() });

  // Add Character to Party, then each of the six ready-made characters: add the one highlighted
  // (the list marks those in the party with *), then End, which moves a Gold Box list to the next.
  await key("a");
  let addMenu = "";
  for (let added = 0; added < 6; added++) {
    await key("a");
    addMenu = (await screenText()).trim();
    await key("End");
  }
  // With all six in the party the list closes by itself; else leave it.
  if (/Add a character/.test(await screenText())) await key("e");
  note("party", { addMenu, afterAdding: (await screenText()).trim() });
  await key("b");
  const explorationMenu = /Area Cast View Encamp Search Look/;
  for (let presses = 0; !explorationMenu.test(await screenText()); presses++) {
    if (presses >= 80) throw new Error(`The opening did not reach the exploration menu: ${await screenText()}`);
    await key(/Yes No\s*$/.test((await screenText()).trimEnd()) ? "n" : "Enter");
  }
  await until("the first-person view", `Boolean(streetViewport) || streetUnavailable`, 30_000);
  await delay(2500);
  await shot("5-new-phlan.png");
  note("New Phlan", {
    text: (await screenText()).trim(),
    exploration: await evaluate("state.exploration ?? null"),
    streetUnavailable: await evaluate("streetUnavailable"),
    webglCanvas: await evaluate(`Boolean(streetViewport?.canvas?.getContext("webgl") || streetViewport?.canvas?.getContext("webgl2"))`),
    canvasInPage: await evaluate(`Boolean(streetViewport?.canvas?.isConnected) && streetViewport.canvas.getClientRects().length > 0`),
    renderer: await evaluate(`(() => {
      const gl = document.createElement("canvas").getContext("webgl");
      const info = gl?.getExtension("WEBGL_debug_renderer_info");
      return gl ? { vendor: gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR), renderer: gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER) } : null;
    })()`),
    fellBack: report.console.some((line) => line.includes("WebGL exploration is unavailable")),
  });
} catch (error) {
  report.error = error.message;
  console.log(`FAILED: ${error.message}`);
  try { await shot("failure.png"); } catch { /* no page */ }
  process.exitCode = 1;
} finally {
  writeFileSync(join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  try { socket?.send(JSON.stringify({ id: ++id, method: "Browser.close" })); } catch { /* closed */ }
  await delay(500);
  chrome.kill();
  rmSync(profile, { recursive: true, force: true });
}
