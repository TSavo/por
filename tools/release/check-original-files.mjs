// Checks a release's "Use my original files" setting (#74) the way a player meets it: four starts of
// the release's launcher, each with POR_OPEN_BROWSER=0, a throwaway HOME and the fixed clock, setting
// the folder through the page's own requests in between.
//
//   node tools/release/check-original-files.mjs <release root> <version 1.3 folder> <first-release folder> [chrome]
//
// <release root> holds app/launch.mjs beside the port's folders (a package, an install, or a copy of
// dist/app with them). The launcher runs on the Node that runs this script. With a Chrome executable,
// the folder is chosen and the setting cleared in the page itself (headless, muted): Settings, the
// folder typed into its field, Enter, and Stop using them, reading what the page says.
//
//   1. Nothing named: no Classic. The setting refuses another origin and a folder that is not the
//      game's, and takes the folder that holds the 1.3 files (GOG keeps them one folder in).
//   2. The 1.3 files: the game runs from them, Classic available. The setting takes the first release.
//   3. The first release: the game runs from game/ (version 1.3) with every picture from those files,
//      Classic available; its first Classic frame is start 2's. The setting is cleared.
//   4. Nothing named again: no Classic. Nothing of either folder is under the player's directory.
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [root, version13, firstRelease] = process.argv.slice(2, 5).map((path) => path && resolve(path));
const chromePath = process.argv[5];
if (!root || !version13 || !firstRelease) {
  throw new Error("Usage: check-original-files.mjs <release root> <version 1.3 folder> <first-release folder> [chrome]");
}

/** The game's page in headless Chrome, for `use`; then Chrome is closed. */
async function inPage(url, use) {
  const profile = mkdtempSync(join(process.env.POR_CHECK_TMP ?? tmpdir(), "por-original-files-chrome-"));
  const chrome = spawn(chromePath, ["--headless", "--mute-audio", "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { stdio: "ignore" });
  let socket, id = 0;
  const pending = new Map();
  const command = (method, params = {}) => new Promise((done, failed) => {
    pending.set(++id, { done, failed });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const { result, exceptionDetails } = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (exceptionDetails) throw new Error(exceptionDetails.exception?.description ?? exceptionDetails.text);
    return result.value;
  };
  const until = async (what, expression) => {
    for (const deadline = Date.now() + 30_000; Date.now() < deadline; await delay(50)) {
      const value = await evaluate(expression);
      if (value) return value;
    }
    throw new Error(`Timed out waiting for ${what}`);
  };
  /** Keys as the player types them, into whatever has the focus. */
  const type = async (text) => {
    for (const character of text) await command("Input.dispatchKeyEvent", { type: "keyDown", key: character, text: character });
    for (const type of ["keyDown", "keyUp"]) await command("Input.dispatchKeyEvent", { type, key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  };
  try {
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
    await command("Page.navigate", { url });
    await until("the game page", `typeof state === "object" && state.sequence > 0`);
    await until("the Original files setting", `!document.querySelector("#original-files").hidden`);
    return await use({ evaluate, until, type });
  } finally {
    socket?.close();
    chrome.kill();
    await new Promise((done) => chrome.exitCode !== null ? done() : chrome.once("exit", done));
    rmSync(profile, { recursive: true, force: true });
  }
}
const pageText = (selector) => `document.querySelector(${JSON.stringify(selector)}).textContent`;
const home = mkdtempSync(join(process.env.POR_CHECK_TMP ?? tmpdir(), "por-original-files-home-"));
const dataDirectory = process.platform === "darwin" ? join(home, "Library", "Application Support", "Pool of Radiance")
  : process.platform === "win32" ? join(home, "AppData", "Roaming", "Pool of Radiance") : join(home, ".local", "share", "pool-of-radiance");
const settingFile = join(dataDirectory, "original-files.json");
const report = { root, version13, firstRelease, home, starts: [] };
const failures = [];
const expect = (what, ok, seen) => {
  console.log(`${ok ? "ok  " : "FAIL"} ${what}${seen === undefined ? "" : `: ${JSON.stringify(seen)}`}`);
  if (!ok) failures.push(what);
};

const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.startsWith("POR_") && name !== "XDG_DATA_HOME"));
Object.assign(env, { HOME: home, USERPROFILE: home, APPDATA: join(home, "AppData", "Roaming"), POR_OPEN_BROWSER: "0", POR_CLOCK: "fixed" });

async function start(label) {
  const started = Date.now();
  const launcher = spawn(process.execPath, [join(root, "app", "launch.mjs")], { env, stdio: ["ignore", "pipe", "pipe"] });
  let log = "";
  const exited = new Promise((done) => launcher.on("exit", (code, signal) => done({ code, signal })));
  const url = await new Promise((found, failed) => {
    const read = (chunk) => {
      log += chunk;
      const match = /Playing in your browser at (\S+)/.exec(log);
      if (match) found(match[1]);
    };
    launcher.stdout.on("data", read);
    launcher.stderr.on("data", read);
    exited.then(({ code }) => failed(new Error(`${label}: the launcher exited (${code}) before the game answered:\n${log}`)));
  });
  const state = async () => (await fetch(new URL("state", url))).json();
  let first;
  for (const deadline = Date.now() + 120_000; Date.now() < deadline; await delay(100)) {
    first = await state();
    if (first.ready) break;
  }
  const setting = async (body, origin = new URL(url).origin) => {
    const response = await fetch(new URL("original-files", url), body === undefined ? {} : {
      method: "POST", headers: { origin, "content-type": "application/json" }, body: JSON.stringify(body),
    });
    return { status: response.status, reply: await response.json().catch(() => null) };
  };
  const run = {
    label, url, seconds: (Date.now() - started) / 1000, scene: first?.scene, classicAvailable: first?.classicAvailable,
    frame: first?.frame && createHash("sha256").update(first.frame).digest("hex"),
    setting: (await setting()).reply,
  };
  return {
    run, setting, log: () => log,
    async stop() {
      launcher.kill("SIGTERM");
      run.exit = await exited;
      run.log = log.split("\n").filter((line) => /^(Original files|POR_GAME_DATA|POR_CLASSIC_PICTURES|Saves in)/.test(line));
      report.starts.push(run);
      console.log(`${label}: ${JSON.stringify(run)}`);
    },
  };
}
const lines = (game, pattern) => game.log().split("\n").filter((line) => pattern.test(line));

try {
  // 1. Nothing named.
  let game = await start("1 nothing named");
  expect("1: no Classic", game.run.classicAvailable === false, game.run.classicAvailable);
  expect("1: the setting is offered, nothing in use", game.run.setting?.inUse === null && game.run.setting?.path === null, game.run.setting);
  const elsewhere = await game.setting({ path: version13 }, "http://example.com");
  expect("1: another origin is refused", elsewhere.status === 403, elsewhere.status);
  const own = await game.setting({ path: join(root, "game") });
  expect("1: the port's own game/ is refused, saying why", own.status === 422 && /has no START\.EXE/.test(own.reply?.problem), own);
  const missing = await game.setting({ path: join(home, "no such folder") });
  expect("1: a missing folder is refused", missing.status === 422 && /is not a folder/.test(missing.reply?.problem), missing);
  expect("1: nothing written after refusals", !existsSync(settingFile));
  if (chromePath) {
    // The player: Settings, the folder typed into the field, Enter.
    const seen = await inPage(game.run.url, async ({ evaluate, until, type }) => {
      const status = await evaluate(pageText("#original-files-status"));
      const hiddenAtFirst = await evaluate(`document.querySelector("#settings").hidden`);
      await evaluate(`document.querySelector("#audio-toggle").click(); document.querySelector("#original-files-path").focus()`);
      const before = await evaluate("state.sequence");
      await type(join(root, "game"));
      const refused = await until("the refusal", `/^Not saved/.test(${pageText("#original-files-message")}) && ${pageText("#original-files-message")}`);
      await evaluate(`document.querySelector("#original-files-path").value = ""`);
      await type(dirname(version13));
      const saved = await until("the saved message", `/^Saved/.test(${pageText("#original-files-message")}) && ${pageText("#original-files-message")}`);
      return { hiddenAtFirst, status, refused, saved, after: await evaluate(pageText("#original-files-status")),
        field: await evaluate(`document.querySelector("#original-files-path").value`),
        keysReachedGame: (await fetch(new URL("state", game.run.url)).then((response) => response.json())).sequence !== before };
    });
    expect("1: the page: the setting is inside Settings, which starts closed", seen.hiddenAtFirst === true, seen.hiddenAtFirst);
    expect("1: the page says nothing is in use", /^Not in use/.test(seen.status), seen.status);
    expect("1: the page refuses game/, saying why", /has no START\.EXE/.test(seen.refused), seen.refused);
    expect("1: the page saves the 1.3 folder and says it takes effect at the next start",
      seen.saved.includes(version13) && /next time the game starts/.test(seen.saved) && seen.field === version13, seen);
    expect("1: the page says what the next start uses", seen.after.includes(`From the next start: ${version13}`), seen.after);
    expect("1: the keys typed into the field did not reach the game", seen.keysReachedGame === false, seen.keysReachedGame);
  } else {
    const chosen = await game.setting({ path: dirname(version13) });
    expect("1: the folder holding the 1.3 files is taken, as the 1.3 folder in it",
      chosen.status === 200 && chosen.reply?.path === version13 && chosen.reply?.release === "1.3", chosen);
  }
  expect("1: original-files.json names it", existsSync(settingFile) && JSON.parse(readFileSync(settingFile, "utf8")).path === version13);
  const pending = (await game.setting()).reply;
  expect("1: in use until the next start: nothing", pending?.inUse === null && pending?.path === version13, pending);
  await game.stop();
  const blank = game.run.frame;

  // 2. The 1.3 files.
  game = await start("2 version 1.3");
  expect("2: the launcher names the 1.3 folder", lines(game, /^Original files: /).some((line) => line.includes(version13) && line.includes("version 1.3")), lines(game, /^Original files/));
  expect("2: runs from it", lines(game, /^POR_GAME_DATA original /).some((line) => line.endsWith(version13)), lines(game, /^POR_GAME_DATA/));
  expect("2: Classic available", game.run.classicAvailable === true, game.run.classicAvailable);
  expect("2: in use: 1.3", game.run.setting?.inUse?.release === "1.3" && game.run.setting?.inUse?.folder === version13, game.run.setting);
  const first = await game.setting({ path: firstRelease });
  expect("2: the first release is taken", first.status === 200 && first.reply?.release === "first", first);
  await game.stop();
  const original = game.run.frame;

  // 3. The first release: its pictures under the 1.3 game.
  game = await start("3 first release");
  expect("3: runs from game/", lines(game, /^POR_GAME_DATA port /).length === 1, lines(game, /^POR_GAME_DATA/));
  const pictures = lines(game, /^POR_CLASSIC_PICTURES /);
  const [, used, total] = /(\d+)\/(\d+)$/.exec(pictures[0] ?? "") ?? [];
  expect("3: every picture from the first release", pictures.length === 1 && pictures[0].includes(firstRelease) && used === total && Number(total) > 0, pictures);
  expect("3: Classic available", game.run.classicAvailable === true, game.run.classicAvailable);
  expect("3: in use: the first release", game.run.setting?.inUse?.release === "first" && game.run.setting?.inUse?.folder === firstRelease, game.run.setting);
  expect("3: its first Classic frame is the 1.3 files' and not the blank one", game.run.frame === original && game.run.frame !== blank,
    { blank, original, first: game.run.frame });
  if (chromePath) {
    const seen = await inPage(game.run.url, async ({ evaluate, until }) => {
      const status = await evaluate(pageText("#original-files-status"));
      await evaluate(`document.querySelector("#audio-toggle").click(); document.querySelector("#original-files-stop").click()`);
      return { status, saved: await until("the saved message", `/^Saved/.test(${pageText("#original-files-message")}) && ${pageText("#original-files-message")}`) };
    });
    expect("3: the page says the first release is in use", seen.status.startsWith(`In use: ${firstRelease} (the first release)`), seen.status);
    expect("3: Stop using them clears the setting", /^Saved: no original files/.test(seen.saved) && !existsSync(settingFile), seen.saved);
  } else {
    const cleared = await game.setting({ path: null });
    expect("3: the setting is cleared", cleared.status === 200 && cleared.reply?.path === null && !existsSync(settingFile), cleared);
  }
  await game.stop();

  // 4. Nothing named again.
  game = await start("4 cleared");
  expect("4: no Classic", game.run.classicAvailable === false, game.run.classicAvailable);
  expect("4: no Original files line", lines(game, /^Original files/).length === 0, lines(game, /^Original files/));
  await game.stop();

  // Nothing of the player's folders is copied: no game file under the player's directory.
  const copied = readdirSync(home, { recursive: true }).filter((name) => /\.(dax|exe|ovr|ex_|pic|cfg)$/i.test(String(name)));
  expect("nothing of the folders under the player's directory", copied.length === 0, copied);
  expect("every start stopped on SIGTERM", report.starts.every(({ exit }) => exit?.signal === "SIGTERM" || exit?.code === 0),
    report.starts.map(({ exit }) => exit));
} finally {
  report.failures = failures;
  console.log(JSON.stringify({ failures, starts: report.starts.map(({ label, seconds, scene }) => ({ label, seconds, scene })) }));
  rmSync(home, { recursive: true, force: true });
}
process.exitCode = failures.length ? 1 : 0;
