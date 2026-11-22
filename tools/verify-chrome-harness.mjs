// The Chrome harness (tools/chrome-campaign-replay.mjs) against a slow, a hung and a dead Chrome (#176).
//
//   node tools/verify-chrome-harness.mjs <chrome> [harness module]     (Linux: it reads /proc and sends signals)
//
// Each case opens a leg at the publisher screen (POR_GAMEDATA picks the data, as for the campaign):
//   slow  the page's main thread is busy for 25 s, as on a loaded machine. The harness must wait for the answer.
//   hung  Chrome's renderers are stopped (SIGSTOP). The harness must fail and say hung, within its stated
//         window (POR_CHROME_STALL_SECONDS, shortened to 20 s for this one command) and a little more.
//   dead  Chrome is killed while a command waits. The harness must fail at once and say dead.
//   --load N  only this: N CPU burners run while a leg opens and shows its first frame, as on a busy
//         Battleaxe; the leg must open. The burners are stopped by PID when the case ends.
// Pass another harness module (for example the one before #176) to show it failing these.

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const options = process.argv.slice(2);
const loadAt = options.indexOf("--load");
const burners = loadAt >= 0 ? Number(options.splice(loadAt, 2)[1]) : 0;
const [chromePath, modulePath = "tools/chrome-campaign-replay.mjs"] = options;
assert.ok(chromePath, "Pass the path to Chrome.");
const stallSeconds = 20;
const { openChromeCampaignLeg } = await import(pathToFileURL(resolve(modulePath)).href);
const work = mkdtempSync(join(tmpdir(), "por-chrome-harness-"));
const busy = (seconds, value) => `(() => { const end = Date.now() + ${seconds * 1000}; while (Date.now() < end); return ${JSON.stringify(value)}; })()`;

/** Chrome's processes for a leg's profile: the browser process and its renderers. */
function chromeProcesses(directory) {
  const parent = new Map(), command = new Map();
  for (const name of readdirSync("/proc").filter((entry) => /^\d+$/.test(entry))) {
    try {
      const stat = readFileSync(`/proc/${name}/stat`, "utf8");
      parent.set(Number(name), Number(stat.slice(stat.lastIndexOf(")") + 2).split(" ")[1]));
      // Chrome rewrites its process title, so its arguments are one string with spaces, not NULs.
      command.set(Number(name), readFileSync(`/proc/${name}/cmdline`, "utf8").replaceAll("\0", " "));
    } catch { /* gone */ }
  }
  const profile = `--user-data-dir=${join(directory, "chrome")} `;
  const browser = [...command].find(([, line]) => `${line} `.includes(profile) && !line.includes("--type="))?.[0];
  assert.ok(browser, `No Chrome browser process for ${profile.trim()}`);
  const descends = (pid) => { for (let up = pid; up > 1; up = parent.get(up) ?? 0) if (up === browser) return true; return false; };
  const children = [...command.keys()].filter((pid) => pid !== browser && descends(pid));
  const renderers = children.filter((pid) => command.get(pid).includes("--type=renderer"));
  assert.ok(renderers.length, `No renderer under Chrome ${browser}`);
  return { browser, renderers, all: [browser, ...children] };
}

/**
 * The harness does not wait for Chrome or the game server to go after closing a leg, and leaves them
 * when the leg's setup fails: end what is left, Chrome by its profile and the game by its save directory.
 */
function endLeg({ directory, checkpointDir }) {
  let pids = [];
  try { pids = chromeProcesses(directory).all; } catch { /* no Chrome left */ }
  for (const name of readdirSync("/proc").filter((entry) => /^\d+$/.test(entry))) {
    try {
      if (readFileSync(`/proc/${name}/environ`, "utf8").split("\0").includes(`POR_SAVE_DIR=${checkpointDir}`)) pids.push(Number(name));
    } catch { /* gone or not ours */ }
  }
  for (const pid of pids) try { process.kill(pid, "SIGKILL"); } catch { /* gone */ }
}

/** The error a promise rejects with, and after how many seconds; or what it resolved to. */
async function outcome(promise) {
  const started = Date.now();
  try { return { value: await promise, seconds: (Date.now() - started) / 1000 }; }
  catch (error) { return { error: error.message, seconds: (Date.now() - started) / 1000 }; }
}

let leg = 0;
/** Run `body` with a fresh leg at the publisher screen, and end everything of the leg afterwards. */
async function withLeg(body) {
  const where = { directory: join(work, `leg-${++leg}`), checkpointDir: mkdtempSync(join(work, "saves-")) };
  try {
    const game = await openChromeCampaignLeg({ chromePath, ...where, bootKeys: "", startAt: "24000000" });
    try { return await body(game, where.directory); } finally { await game.close(); }
  } finally { endLeg(where); }
}

const results = [];
async function check(name, run) {
  process.stderr.write(`[chrome-harness] ${name} ... `);
  try { const detail = await run(); results.push([name, true, detail]); process.stderr.write(`pass: ${detail}\n`); }
  catch (error) {
    const messages = [];
    for (let cause = error; cause; cause = cause.cause) messages.push(cause.message);
    results.push([name, false, messages.join(": ")]);
    process.stderr.write(`FAIL: ${messages.join(": ")}\n`);
  }
}

if (burners) {
  await check(`loaded: a leg opens and shows its first frame under ${burners} CPU burners`, async () => {
    const started = Date.now();
    const load = Array.from({ length: burners }, () => spawn(process.execPath, ["-e", "for (;;) {}"], { stdio: "ignore" }));
    try {
      return await withLeg(async (game) => {
        const frame = await game.nextFrame();
        return `frame ${frame.sequence} after ${((Date.now() - started) / 1000).toFixed(0)} s`;
      });
    } finally {
      for (const burner of load) burner.kill("SIGKILL");
    }
  });
}

if (!burners) await check("slow: a page busy for 25 s is waited for", () => withLeg(async (game) => {
  const answer = await outcome(game.evaluate(busy(25, "answered")));
  assert.equal(answer.value, "answered", `the harness gave up after ${answer.seconds.toFixed(1)} s: ${answer.error}`);
  return `answered after ${answer.seconds.toFixed(1)} s`;
}));

if (!burners) await check(`hung: a stopped renderer fails as hung within ${stallSeconds + 25} s`, () => withLeg(async (game, directory) => {
  const { renderers } = chromeProcesses(directory);
  for (const pid of renderers) process.kill(pid, "SIGSTOP");
  process.env.POR_CHROME_STALL_SECONDS = String(stallSeconds);
  try {
    const answer = await outcome(game.evaluate("1"));
    assert.ok(answer.error, "the stopped page answered");
    assert.match(answer.error, /hung/, `the error does not say hung: ${answer.error}`);
    assert.ok(answer.seconds >= stallSeconds && answer.seconds <= stallSeconds + 25, `failed after ${answer.seconds.toFixed(1)} s`);
    return `failed after ${answer.seconds.toFixed(1)} s: ${answer.error}`;
  } finally {
    delete process.env.POR_CHROME_STALL_SECONDS;
    for (const pid of renderers) try { process.kill(pid, "SIGCONT"); } catch { /* gone */ }
  }
}));

if (!burners) await check("dead: a killed Chrome fails at once as dead", () => withLeg(async (game, directory) => {
  const { browser } = chromeProcesses(directory);
  // The command is on its way to Chrome when evaluate returns its promise.
  const waiting = outcome(game.evaluate(busy(25, "answered")));
  const killed = Date.now();
  process.kill(browser, "SIGKILL");
  const answer = await waiting;
  const afterKill = (Date.now() - killed) / 1000;
  assert.ok(answer.error, "the killed Chrome answered");
  assert.match(answer.error, /dead/, `the error does not say dead: ${answer.error}`);
  assert.ok(afterKill < 3, `failed ${afterKill.toFixed(1)} s after Chrome was killed`);
  return `failed ${afterKill.toFixed(1)} s after the kill: ${answer.error}`;
}));

try { rmSync(work, { recursive: true, force: true }); } catch { /* a profile still being written; it is in the temporary directory */ }
const failed = results.filter(([, passed]) => !passed).length;
console.log(`${results.length - failed} of ${results.length} Chrome harness cases pass (${modulePath})`);
process.exit(failed ? 1 : 0);
