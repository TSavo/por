// A small headless-Chrome driver for the browser-engine checks (#223): opens a page, reads the page's
// own `state` (tools/play.js), presses keys as the player types them and takes screenshots.
// Chrome always runs --headless --mute-audio (AGENTS.md).
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

export async function openChrome(url, { chromePath = process.env.POR_CHROME ?? "/usr/bin/google-chrome", args = [], log, bypassCsp = false } = {}) {
  const profile = mkdtempSync(join(tmpdir(), "por-web-chrome-"));
  const chrome = spawn(chromePath, ["--headless", "--mute-audio", "--no-first-run", "--no-default-browser-check",
    "--enable-unsafe-swiftshader", "--use-angle=swiftshader", "--remote-debugging-port=0", `--user-data-dir=${profile}`,
    "--window-size=1280,900", ...args, "about:blank"], { stdio: "ignore" });
  let socket, id = 0;
  const pending = new Map();
  const listeners = [];
  const command = (method, params = {}) => new Promise((done, failed) => {
    pending.set(++id, { done, failed });
    socket.send(JSON.stringify({ id, method, params }));
  });
  let port;
  for (const deadline = Date.now() + 30_000; !port && Date.now() < deadline; await delay(50)) {
    try { port = readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]; } catch { /* not yet */ }
  }
  if (!port) throw new Error("Chrome did not start");
  const pages = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
  socket = new WebSocket(pages.find(({ type }) => type === "page").webSocketDebuggerUrl);
  await new Promise((done) => socket.addEventListener("open", done, { once: true }));
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (message.method) { for (const listen of listeners) listen(message); return; }
    const waiting = message.id && pending.get(message.id);
    if (!waiting) return;
    pending.delete(message.id);
    if (message.error) waiting.failed(new Error(message.error.message)); else waiting.done(message.result);
  });
  const consoleLines = [];
  listeners.push((message) => {
    if (message.method === "Runtime.consoleAPICalled") {
      const line = message.params.args.map((arg) => arg.value ?? arg.description ?? "").join(" ");
      consoleLines.push(line);
      log?.(`console: ${line}`);
    } else if (message.method === "Runtime.exceptionThrown") {
      const line = message.params.exceptionDetails.exception?.description ?? message.params.exceptionDetails.text;
      consoleLines.push(`exception: ${line}`);
      log?.(`exception: ${line}`);
    }
  });
  await command("Runtime.enable");
  await command("Page.enable");
  // A check that serves the player's folder from its own port has the page reach it past its CSP.
  if (bypassCsp) await command("Page.setBypassCSP", { enabled: true });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const until = async (what, expression, seconds = 60) => {
    for (const deadline = Date.now() + seconds * 1000; Date.now() < deadline; await delay(50)) {
      const value = await evaluate(expression).catch(() => undefined);
      if (value) return value;
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  await command("Page.navigate", { url });
  return {
    command, evaluate, until, consoleLines, listeners,
    async key(key) {
      const special = { enter: ["Enter", "Enter", 13], escape: ["Escape", "Escape", 27], up: ["ArrowUp", "ArrowUp", 38],
        down: ["ArrowDown", "ArrowDown", 40], left: ["ArrowLeft", "ArrowLeft", 37], right: ["ArrowRight", "ArrowRight", 39],
        home: ["Home", "Home", 36], end: ["End", "End", 35], pageup: ["PageUp", "PageUp", 33], pagedown: ["PageDown", "PageDown", 34],
        space: [" ", "Space", 32], backspace: ["Backspace", "Backspace", 8], f10: ["F10", "F10", 121] }[key];
      const [name, code, keyCode] = special ?? [key, `Key${key.toUpperCase()}`, key.toUpperCase().charCodeAt(0)];
      await command("Input.dispatchKeyEvent", { type: "keyDown", key: name, code, windowsVirtualKeyCode: keyCode,
        ...(special ? {} : { text: key }) });
      await command("Input.dispatchKeyEvent", { type: "keyUp", key: name, code, windowsVirtualKeyCode: keyCode });
    },
    async screenshot(file) {
      writeFileSync(file, Buffer.from((await command("Page.captureScreenshot", { format: "png" })).data, "base64"));
    },
    async close() {
      const exited = new Promise((done) => chrome.exitCode !== null || chrome.signalCode !== null ? done() : chrome.once("exit", done));
      // Browser.close lets Chrome's helper processes finish with the profile before it is removed.
      await Promise.race([exited, command("Browser.close").catch(() => chrome.kill())]);
      socket?.close();
      await exited;
      try { rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); } catch {}
    },
  };
}

/** The 40 by 25 text screen of the page's state, collapsed, as the pipe harness reads it. */
export const screenTextExpression = `(() => { const cells = Array(1000).fill(" ");
  for (const [cell, character] of state.text ?? []) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ").trim(); })()`;

/**
 * Drive the game page like the pipe harness drives the runner: press a key once the game waits for one
 * and wait until the screen it answers with has settled.
 */
export function gamePage(page) {
  const settled = `(typeof state === "object" && state.ready && !state.stopped && !posting && !state.presentationPolling && !animationFrame) ? state.sequence : 0`;
  const game = {
    async text() { return page.evaluate(screenTextExpression); },
    async state(expression) { return page.evaluate(expression); },
    async settle(seconds = 60) {
      let last = -1, stableSince = Date.now();
      for (const deadline = Date.now() + seconds * 1000; Date.now() < deadline; await delay(60)) {
        const sequence = await page.evaluate(settled).catch(() => 0);
        if (sequence && sequence === last) { if (Date.now() - stableSince > 400) return sequence; }
        else { last = sequence; stableSince = Date.now(); }
      }
      throw new Error(`The game did not settle. Screen: ${await game.text()}`);
    },
    async press(key, expected, seconds = 60) {
      const before = await game.settle(seconds);
      await page.key(key);
      for (const deadline = Date.now() + seconds * 1000; Date.now() < deadline; await delay(60)) {
        const sequence = await page.evaluate("state.sequence");
        if (sequence !== before) break;
      }
      await game.settle(seconds);
      const text = await game.text();
      if (expected && !expected.test(text)) throw new Error(`After ${key} the screen does not show ${expected}: ${text}`);
      return text;
    },
    async pressUntil(key, pattern, limit = 40) {
      for (let presses = 0; !pattern.test(await game.text()); presses++) {
        if (presses >= limit) throw new Error(`${key} ${limit} times did not reach ${pattern}: ${await game.text()}`);
        await game.press(key);
      }
    },
  };
  return game;
}
