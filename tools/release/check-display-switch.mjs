// Checks the display switch in a release (#153): after switching to Classic, nothing of Enhanced is
// visible over the game (only #screen, showing the game's own frame), and after switching back nothing
// of Classic is left (#screen shows Enhanced's picture again).
//
//   node tools/release/check-display-switch.mjs <release root> <original folder> <chrome>
//
// The release's launcher runs with POR_ORIGINAL_FILES naming the folder (version 1.3, or the first
// release for its pictures), POR_OPEN_BROWSER=0, the fixed clock, the ready-made party and a throwaway
// HOME (under POR_CHECK_TMP); the page in Chrome, headless and muted. The switch is made at each place
// the opening offers: the page's publisher splash at full strength and while it fades, the title with its
// name faded in, the code-wheel question and the main menu. A layer counts as visible when it is laid out
// and its opacity, multiplied up to #play, is above 0. Prints each place's layers; exits 1 while any
// place shows a layer it should not.
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [root, original, chromePath] = process.argv.slice(2);
if (!root || !original || !chromePath) throw new Error("Usage: check-display-switch.mjs <release root> <original folder> <chrome>");
const scratch = process.env.POR_CHECK_TMP ?? tmpdir();
const home = mkdtempSync(join(scratch, "por-display-switch-home-"));
const wheel = JSON.parse(readFileSync(new URL("../../src/codewheel/wheel.json", import.meta.url), "utf8"));
const failures = [];
const places = [];
const expect = (what, ok, seen) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${seen === undefined ? "" : `: ${JSON.stringify(seen)}`}`);
  if (!ok) failures.push(what);
};

const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("POR_") && name !== "XDG_DATA_HOME"));
Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: join(home, "AppData", "Roaming"), POR_ORIGINAL_FILES: resolve(original),
  POR_OPEN_BROWSER: "0", POR_CLOCK: "fixed", POR_PREGEN_PARTY: "1" });
const launcher = spawn(process.execPath, [join(root, "app", "launch.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
const exited = new Promise((done) => launcher.on("exit", (code, signal) => done({ code, signal })));
let log = "";
const profile = mkdtempSync(join(scratch, "por-display-switch-chrome-"));
let chrome, socket, id = 0;
const pending = new Map();
const command = (method, params = {}) => new Promise((done, failed) => {
  pending.set(++id, { done, failed });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const { result, exceptionDetails } = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
  return result.value;
}
async function until(what, expression, limit = 30_000) {
  for (const deadline = Date.now() + limit; Date.now() < deadline; await delay(25)) {
    const value = await evaluate(expression);
    if (value) return value;
  }
  throw new Error(`Timed out waiting for ${what}`);
}
const settled = `(Boolean(state.stopped) || (state.ready && !posting && renderingSequence === undefined)) && !(typeof codeWheel === "object" && codeWheel.busy)`;
async function key(name) {
  await until("the page to be ready for a key", settled);
  await evaluate(`window.dispatchEvent(new KeyboardEvent("keydown", { key: ${JSON.stringify(name)}, bubbles: true, cancelable: true })), undefined`);
  await until(`the page to deal with ${name}`, settled);
}
/** What shows over the game: each visible element in #play, outermost only, with its effective opacity. */
const layers = `(() => {
  const play = document.querySelector("#play");
  const seen = [];
  for (const element of play.querySelectorAll("*")) {
    if (!element.getClientRects().length || getComputedStyle(element).visibility === "hidden") continue;
    let opacity = 1;
    for (let node = element; node && node !== play; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    const box = element.getBoundingClientRect();
    if (opacity <= 0 || !box.width || !box.height) continue;
    if (seen.some(({ element: outer }) => outer.contains(element))) continue;
    seen.push({ element, opacity });
  }
  return seen.map(({ element, opacity }) => ({ layer: element.id ? "#" + element.id : element.tagName.toLowerCase() + "." + [...element.classList].join("."),
    opacity: Math.round(opacity * 1000) / 1000 }));
})()`;
const classicFrameShown = `document.querySelector("#screen").getAttribute("src") === "data:image/png;base64," + (typeof animationFrame === "object" && animationFrame ? animationFrame : state).frame`;
// Enhanced shows its own picture: the scene's art or the Enhanced frame, where the page has one that differs.
const enhancedPictureShown = `(() => {
  const view = (typeof animationFrame === "object" && animationFrame) || state;
  const enhancedOwn = view.art || (view.enhancedFrame && view.enhancedFrame !== view.frame);
  return Number.isInteger(view.codeWheelQuestion) || !enhancedOwn || document.querySelector("#screen").getAttribute("src") !== "data:image/png;base64," + view.frame;
})()`;
const twoFrames = "new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(true))))";

/** Switch at this place: Classic must show only the game's frame, now and a moment later; Enhanced nothing of Classic. */
async function switchHere(place, { back = true } = {}) {
  await evaluate(`document.querySelector("#presentation").click()`);
  await evaluate(twoFrames);
  const right = await evaluate(layers);
  await until(`${place}: the game's own frame in Classic`, classicFrameShown, 10_000).catch(() => false);
  await delay(2000);
  const later = await evaluate(layers);
  const frame = await evaluate(classicFrameShown);
  const extra = (list) => list.filter(({ layer }) => layer !== "#screen");
  places.push({ place, classic: right, classicLater: later });
  expect(`${place}: Classic, at the switch: only #screen`, extra(right).length === 0, right);
  expect(`${place}: Classic, 2 seconds on: only #screen, showing the game's own frame`, extra(later).length === 0 && frame, { later, frame });
  if (!back) return;
  await evaluate(`document.querySelector("#presentation").click()`);
  const enhanced = await until(`${place}: Enhanced's own picture again`, enhancedPictureShown, 10_000).catch(() => false);
  expect(`${place}: Enhanced again: nothing of Classic (#screen shows Enhanced's picture)`, Boolean(enhanced),
    await evaluate(`({ mode: document.documentElement.dataset.presentation, src: document.querySelector("#screen").getAttribute("src").slice(0, 40) })`));
}
async function open(url) {
  await command("Page.navigate", { url });
  await until("the game page", `typeof state === "object" && state.sequence > 0 && state.classicAvailable === true`);
  await until("the display switch", `!document.querySelector("#presentation").hidden && document.documentElement.dataset.presentation === "enhanced"`);
}
const splashAt = (opacity) => `(() => { const image = document.querySelector("#publisher-splash");
  return !image.hidden && image.complete && image.naturalWidth > 0 && ${opacity}; })()`;

try {
  const url = await new Promise((found, failed) => {
    const read = (chunk) => { log += chunk; const match = /Playing in your browser at (\S+)/.exec(log); if (match) found(match[1]); };
    launcher.stdout.on("data", read);
    launcher.stderr.on("data", read);
    exited.then(({ code }) => failed(new Error(`the launcher exited (${code}):\n${log}`)));
  });
  expect("the original files are in use", /^Original files: .*Classic available/m.test(log), log.split("\n").filter((line) => /^(Original files|POR_)/.test(line)));
  chrome = spawn(chromePath, ["--headless", "--mute-audio", "--no-first-run", "--no-default-browser-check", "--window-size=1280,900",
    "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let port;
  for (const deadline = Date.now() + 30_000; !port && Date.now() < deadline; await delay(50)) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]; } catch { /* not yet */ }
  }
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  socket = new WebSocket(pages.find(({ type }) => type === "page").webSocketDebuggerUrl);
  await new Promise((done) => socket.addEventListener("open", done, { once: true }));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    const waiting = message.id && pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.failed(new Error(message.error.message)); else waiting.done(message.result);
  });

  // The publisher splash at full strength.
  await open(url);
  await until("the publisher splash at full strength", splashAt(`getComputedStyle(image).opacity === "1"`));
  await switchHere("publisher splash, full");
  // The splash fading out over the title.
  await open(url);
  await until("the publisher splash fading", splashAt(`!image.classList.contains("shown") && Number(getComputedStyle(image).opacity) > 0.2`), 15_000);
  await switchHere("publisher splash, fading");
  // The title, its name and SPECIAL EDITION faded in.
  await open(url);
  await until("the title's name and SPECIAL EDITION", `[...document.querySelectorAll("#title-name, #title-edition")].every((image) =>
    image.complete && image.naturalWidth && getComputedStyle(image).opacity === "1")`, 30_000);
  await switchHere("title");
  // The code-wheel question.
  await key(" ");
  await until("the code-wheel question", `state.ready && (Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion))`);
  await until("the wheel to be drawn", `typeof codeWheel === "object" && Boolean(codeWheel.painted)`);
  await switchHere("code-wheel question");
  // The main menu, after the word read off the wheel (as tools/release/capture-release.mjs reads it).
  const number = await evaluate(`typeof codeWheel === "object" && codeWheel.question ? codeWheel.question.number : state.codeWheelQuestion`);
  const { espruar, dethek, path } = wheel.questions.find((entry) => entry.number === number);
  const e = wheel.outer.runes.indexOf(espruar), k = wheel.inner.runes.indexOf(dethek);
  const word = wheel.inner.paths.find((entry) => entry.id === path).windows
    .map((w, ring) => wheel.outer.rings[ring][(((w - k + e) % 36) + 36) % 36]).join("");
  for (const letter of word.toLowerCase()) await key(letter);
  await key("Enter");
  await until("the main menu", `state.ready && !(Boolean(state.codeWheel) || Number.isInteger(state.codeWheelQuestion))`, 20_000);
  await switchHere("main menu");
} catch (error) {
  expect(`no error (${error.stack ?? error})`, false);
} finally {
  socket?.close();
  chrome?.kill();
  if (chrome && chrome.exitCode === null) await new Promise((done) => chrome.once("exit", done));
  launcher.kill("SIGTERM");
  await exited;
  for (const path of [profile, home]) {
    try { rmSync(path, { recursive: true, force: true, maxRetries: 20, retryDelay: 250 }); } catch (error) { console.log(`left ${path}: ${error.message}`); }
  }
  const leftover = readdirSync(scratch).filter((name) => name.startsWith("por-display-switch-"));
  console.log(JSON.stringify({ failures, places: places.length, leftover: leftover.length }));
}
process.exitCode = failures.length ? 1 : 0;
