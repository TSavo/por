import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { appendFileSync, copyFileSync, createWriteStream, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { basename, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { observeEnhancedFallbacks } from "./chrome-enhanced-fallbacks.mjs";

export function saveNarrationPlayback(directory, playback) {
  const ledger = process.env.POR_NARRATION_LEDGER;
  const run = process.env.POR_NARRATION_RUN ?? basename(ledger || directory).replace(/\.jsonl$/, "");
  const text = [{ t: "playback", run, leg: basename(directory), at: playback.at, frame: playback.frame, queued: playback.queued },
    ...playback.lines.map((line) => ({ t: "p", ...line }))].map((line) => JSON.stringify(line) + "\n").join("");
  writeFileSync(join(directory, "narration-playback.jsonl"), text);
  if (ledger) appendFileSync(ledger.replace(/\.jsonl$/, "") + ".playback.jsonl", text);
}

// How long Chrome may take to answer (#176). On a busy machine an answer can take far longer than the
// 10 s that used to fail a run, though nothing is wrong with the game. A command now fails only when
// Chrome is dead (it exited, its page crashed or its debug connection closed: at once), hung (neither
// Chrome's renderers nor the game server used CPU_FLOOR s of CPU time in STALL_SECONDS), or slow past
// LONGEST_SECONDS.
const SLOW_SECONDS = 10;
// Read for each command, so a test can shorten it for one command (tools/verify-chrome-harness.mjs).
// Long: under load the game page's Page.navigate took 89 s in which its renderers and the game server
// used 0.1 s of CPU between them (Battleaxe, 2026-11-22). A dead Chrome fails at once regardless.
const STALL_SECONDS = () => Number(process.env.POR_CHROME_STALL_SECONDS) || 300;
const LONGEST_SECONDS = Number(process.env.POR_CHROME_LONGEST_SECONDS) || 900;
const CPU_FLOOR = 0.5;

/**
 * What `pids` and, for `tree`, all their descendants are doing, from /proc: the CPU seconds each has
 * used, the bytes they have read from and written to storage, and whether one of them is waiting
 * on the disk (state D). Undefined where there is no /proc.
 */
function processActivity(pids, { tree = false } = {}) {
  let entries;
  try { entries = readdirSync("/proc").filter((name) => /^\d+$/.test(name)); } catch { return undefined; }
  const parent = new Map(), seconds = new Map(), state = new Map();
  for (const name of entries) {
    let stat;
    try { stat = readFileSync(`/proc/${name}/stat`, "utf8"); } catch { continue; }
    // After the command name in parentheses: state, ppid, ..., utime (12th), stime (13th).
    const fields = stat.slice(stat.lastIndexOf(")") + 2).split(" ");
    parent.set(Number(name), Number(fields[1]));
    state.set(Number(name), fields[0]);
    seconds.set(Number(name), (Number(fields[11]) + Number(fields[12])) / 100);
  }
  const roots = new Set(pids.filter((pid) => seconds.has(pid)));
  if (!roots.size) return undefined;
  const cpu = new Map();
  let io = 0, disk = false;
  for (const [pid] of seconds) {
    for (let up = pid; up > 1; up = tree ? parent.get(up) ?? 0 : 0) {
      if (!roots.has(up)) continue;
      cpu.set(pid, seconds.get(pid));
      disk ||= state.get(pid) === "D";
      // Storage only: an idle game server still exchanges about 500 bytes in 5 s over its pipes and
      // sockets with nobody making progress (a stopped page, measured on Battleaxe, #176).
      try {
        const counts = readFileSync(`/proc/${pid}/io`, "utf8");
        io += Number(/^read_bytes: (\d+)/m.exec(counts)?.[1] ?? 0) + Number(/^write_bytes: (\d+)/m.exec(counts)?.[1] ?? 0);
      } catch { /* not readable */ }
      break;
    }
  }
  return { cpu, io, disk };
}

async function freePort() {
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const { port } = probe.address();
  await new Promise((done) => probe.close(done));
  return port;
}

export function copyCampaignSaves(from, to) {
  for (const file of readdirSync(from).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name))) {
    copyFileSync(join(from, file), join(to, file));
  }
}

// `inputCompat` keeps replays recorded before 2026-11-21 working. Until then a key press was
// spent each time the game emptied its keyboard buffer, and their key lists include those
// presses. Pass "" for a replay that presses each key once.
export async function openChromeCampaignLeg({ chromePath, directory, checkpointDir, bootKeys, startAt, developerCombat = false,
  inputCompat = "discard-poll-prompt", schedule, pregenParty = false,
  traceEnhancedFallbacks = process.env.POR_TRACE_ENHANCED_FALLBACKS === "1" }) {
  mkdirSync(directory);
  // The guest overwrites slots during a campaign. Preserve the input saves
  // and commands for each leg, including host-side journal commands.
  copyCampaignSaves(checkpointDir, directory);
  writeFileSync(join(directory, "boot.json"), JSON.stringify({ bootKeys, startAt, developerCombat, inputCompat }) + "\n");
  const commands = join(directory, "commands.jsonl");
  writeFileSync(commands, "");
  const log = createWriteStream(join(directory, "runner.log"));
  const port = await freePort();
  const origin = `http://127.0.0.1:${port}`;
  const profile = join(directory, "chrome");
  const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
    env: {
      ...process.env, POR_PLAY_PORT: String(port), POR_SAVE_DIR: checkpointDir,
      POR_DEV_COMBAT: developerCombat ? "1" : "0",
      POR_JOURNAL_PROFILE: "", POR_PREGEN_PARTY: pregenParty ? "1" : "0", POR_BOOT_KEY_FILE: "", POR_BOOT_KEYS: bootKeys,
      POR_LIVE_AT: startAt, POR_BOOT_STEPS: "450000000", POR_RECORD_KEYS: join(directory, "keys.txt"),
      POR_INPUT_COMPAT: inputCompat, POR_CLOCK: "fixed",
      // Every leg records when it asked for each key, in game progress. A leg that has such a
      // record in the repository asks at the same moments. See docs/REPLAYS.md.
      POR_PROMPT_SCHEDULE_OUT: join(directory, "prompts.jsonl"),
      POR_PROMPT_SCHEDULE_IN: schedule && existsSync(schedule) ? schedule : "",
    },
    stdio: ["ignore", "pipe", "pipe"], windowsHide: true,
  });
  server.stdout.pipe(log, { end: false });
  server.stderr.pipe(log, { end: false });
  server.once("close", () => log.end());
  // Chrome refuses audio.play() on a page nobody has clicked, and these replays send keys through
  // the page's own send(), which is not a click. Without the autoplay flag every narration is
  // refused and none plays. --mute-audio only silences the output: the recordings still load and
  // run in real time, which is what the playback log measures.
  const chrome = spawn(chromePath, ["--headless", "--no-first-run", "--mute-audio", "--disable-component-update",
    "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], {
    stdio: "ignore", windowsHide: true,
  });
  let childError;
  for (const child of [server, chrome]) child.on("error", (error) => { childError = error; });
  let socket, browserSocket;
  let messageId = 0;
  // Commands sent to the page and not yet answered, and requests to Chrome's browser process.
  const pending = new Map();
  const browserPending = new Map();
  const failPending = (why) => { for (const entry of [...pending.values()]) entry.dead(why); };
  let chromeExit;
  chrome.once("exit", (code, signal) => {
    chromeExit = signal ? `signal ${signal}` : `code ${code}`;
    failPending(`it exited (${chromeExit})`);
  });
  let lastSequence = -1;
  let observingFallbacks = false;

  async function waitFor(description, read, timeout = 30_000) {
    const limit = Date.now() + LONGEST_SECONDS * 1000;
    // A pending DevTools or fetch request also counts toward the total wait.
    let timer;
    const expired = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out waiting for ${description} after ${LONGEST_SECONDS} s`)), LONGEST_SECONDS * 1000);
    });
    try {
      return await Promise.race([pollUntil(description, read, timeout, limit), expired]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function pollUntil(description, read, timeout, limit) {
    const start = Date.now();
    let deadline = Math.min(start + timeout, limit);
    // Sample shortly before expiry. Fast predicates never pay to enumerate the process tree.
    const interval = Math.min(10_000, timeout / 2);
    let nextSample = deadline - interval;
    let previous;
    while (Date.now() < limit) {
      if (childError) throw childError;
      for (const [name, child] of [["Game server", server], ["Chrome", chrome]]) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${name} exited during ${description}`);
      }
      const value = await read();
      if (value) return value;
      if (Date.now() >= nextSample) {
        const renderers = await chromeRenderers();
        const game = processActivity([server.pid], { tree: true });
        const cpu = new Map([...(renderers?.cpu ?? []), ...(game?.cpu ?? [])]);
        const now = Date.now();
        if (previous && now >= deadline) {
          let used = 0;
          for (const [pid, seconds] of cpu) used += Math.max(0, seconds - (previous.cpu.get(pid) ?? seconds));
          const storage = game && previous.io !== undefined && game.io > previous.io;
          if (used < CPU_FLOOR && !storage && !game?.disk && !processActivity([chrome.pid], { tree: true })?.disk) break;
          deadline = Math.min(now + interval, limit);
          log.write(`[chrome-harness] Still waiting for ${description}: ${used.toFixed(2)} s CPU, storage activity ${Boolean(storage)}\n`);
        }
        // A single slow predicate can consume the whole initial timeout before the first sample.
        if (!previous && now >= deadline) deadline = Math.min(now + interval, limit);
        previous = { cpu, io: game?.io };
        nextSample = deadline;
      }
      await delay(40);
    }
    throw new Error(`Timed out waiting for ${description}`);
  }

  /**
   * Chrome's renderers, as its browser process reports them: their process ids and the CPU seconds
   * they have used. Only the renderers: the browser and GPU processes keep using a little CPU while a
   * stopped page does nothing (0.3 s in 5 s, measured with SIGSTOPped renderers on Battleaxe, #176).
   */
  function chromeRenderers() {
    if (browserSocket?.readyState !== WebSocket.OPEN) return Promise.resolve(undefined);
    const id = ++messageId;
    return new Promise((done) => {
      const timer = setTimeout(() => { browserPending.delete(id); done(undefined); }, 30_000);
      browserPending.set(id, (message) => {
        clearTimeout(timer);
        const renderers = message.result?.processInfo?.filter(({ type }) => type === "renderer");
        done(renderers && { pids: renderers.map(({ id: pid }) => pid), cpu: new Map(renderers.map(({ id: pid, cpuTime }) => [pid, cpuTime])) });
      });
      browserSocket.send(JSON.stringify({ id, method: "SystemInfo.getProcessInfo" }));
    });
  }

  /**
   * Send `method` to the page and wait for its answer however long a busy machine makes it. Fail at
   * once when Chrome is dead, and otherwise only when it is hung or slow past LONGEST_SECONDS. From
   * SLOW_SECONDS on, every 5 s, Chrome's renderers and the game server (with the runner it starts) are
   * looked at. They are hung when, over the last STALL_SECONDS, they used less than CPU_FLOOR s of CPU
   * between them, the game server read and wrote nothing on storage, and none of them waited on the disk.
   */
  function command(method, params = {}) {
    const id = ++messageId;
    const started = Date.now();
    const stallSeconds = STALL_SECONDS();
    const waited = () => ((Date.now() - started) / 1000).toFixed(1);
    // What was seen while waiting: CPU seconds, bytes the game server read and wrote, looks with a disk wait.
    const seen = { looks: 0, cpu: 0, io: 0, disk: 0 };
    const describe = () => `${seen.looks} looks saw ${seen.cpu.toFixed(1)} s of renderer and game-server CPU, ` +
      `${seen.io} bytes of game-server storage I/O and ${seen.disk} disk waits`;
    return new Promise((done, reject) => {
      let watchdog;
      const finish = () => { clearTimeout(watchdog); pending.delete(id); };
      const entry = {
        answer(message) {
          finish();
          if ((Date.now() - started) / 1000 > SLOW_SECONDS) {
            log.write(`[chrome-harness] Chrome answered ${method} after ${waited()} s: slow, not dead (#176); ${describe()}\n`);
          }
          if (message.error) reject(new Error(message.error.message));
          else done(message.result);
        },
        dead(why) {
          finish();
          reject(new Error(`Chrome is dead: ${why} while ${method} waited ${waited()} s`));
        },
      };
      pending.set(id, entry);
      if (chromeExit) return entry.dead(`it exited (${chromeExit})`);
      if (socket.readyState !== WebSocket.OPEN) return entry.dead("its debug connection is closed");
      socket.send(JSON.stringify({ id, method, params }));
      // One entry per look: { at, cpu: CPU seconds used since the look before, active: I/O or disk wait }.
      const samples = [];
      const lastCpu = new Map();
      let lastIo, watchedSince;
      const check = async () => {
        const renderers = await chromeRenderers();
        if (!pending.has(id)) return;
        const game = processActivity([server.pid], { tree: true });
        const now = Date.now();
        // Each process's own increase: renderers come and go (a navigation replaces one).
        let cpu = 0;
        for (const [pid, seconds] of [...(renderers?.cpu ?? []), ...(game?.cpu ?? [])]) {
          if (lastCpu.has(pid)) cpu += Math.max(0, seconds - lastCpu.get(pid));
          lastCpu.set(pid, seconds);
        }
        // Serving the page is I/O, not CPU; and on Battleaxe's USB disk one read can take many seconds,
        // for the game server or for any of Chrome's processes (a navigation starts new ones).
        const io = lastIo !== undefined && game ? Math.max(0, game.io - lastIo) : 0;
        const disk = Boolean(game?.disk) || Boolean(processActivity([chrome.pid], { tree: true })?.disk);
        lastIo = game?.io;
        if (watchedSince === undefined) watchedSince = now;
        else {
          samples.push({ at: now, cpu, active: io > 0 || disk });
          Object.assign(seen, { looks: seen.looks + 1, cpu: seen.cpu + cpu, io: seen.io + io, disk: seen.disk + Number(disk) });
        }
        if (process.env.POR_CHROME_HARNESS_TRACE === "1") {
          log.write(`[chrome-harness] ${method} at ${waited()} s: renderers ${JSON.stringify([...(renderers?.cpu ?? [])])}, ` +
            `cpu +${cpu.toFixed(2)} s, game-server io +${io}, disk ${disk}\n`);
        }
        while (samples.length && now - samples[0].at > stallSeconds * 1000) samples.shift();
        const used = samples.reduce((sum, sample) => sum + sample.cpu, 0);
        if (now - watchedSince >= stallSeconds * 1000 && used < CPU_FLOOR && !samples.some((sample) => sample.active)) {
          finish();
          reject(new Error(`Chrome is hung: no answer to ${method} in ${waited()} s, and in the last ${stallSeconds} s ` +
            `Chrome's renderers and the game server used ${used.toFixed(2)} s of CPU, the game server read and wrote nothing on storage ` +
            `and none of them waited on the disk${renderers === undefined ? " (Chrome's browser process did not report)" : ""}; ${describe()}`));
        } else if (now - started >= LONGEST_SECONDS * 1000) {
          finish();
          reject(new Error(`Chrome is slow past the limit: no answer to ${method} in ${waited()} s, though Chrome's ` +
            `renderers and the game server kept working; ${describe()}`));
        } else watchdog = setTimeout(check, 5_000);
      };
      watchdog = setTimeout(check, SLOW_SECONDS * 1000);
    });
  }

  async function evaluate(expression) {
    const { result, exceptionDetails } = await command("Runtime.evaluate", {
      expression, awaitPromise: true, returnByValue: true,
    });
    assert.ok(!exceptionDetails, exceptionDetails?.exception?.description ?? exceptionDetails?.text);
    return result.value;
  }

  // What the page's audio element did with each narration it was told to play: one line per
  // narration, in the leg's directory and, when a narration ledger is being kept, beside it as
  // <ledger>.playback.jsonl for `npm run qa:narration -- --merge`. See docs/NARRATION-QA.md.
  async function writeNarrationPlayback() {
    if (socket?.readyState !== WebSocket.OPEN) return;
    let playback;
    try { playback = await evaluate('typeof porNarrationPlayback === "function" ? porNarrationPlayback() : undefined'); }
    catch { return; }
    if (!playback) return;
    saveNarrationPlayback(directory, playback);
  }

  async function close() {
    if (observingFallbacks && socket?.readyState === WebSocket.OPEN) {
      try {
        const trace = await evaluate("window.porEnhancedFallbacks()");
        writeFileSync(join(directory, "enhanced-fallbacks.json"), JSON.stringify(trace, null, 2) + "\n");
      } catch (error) {
        console.error("Could not read the Chrome artwork fallback capture", error);
      }
    }
    await writeNarrationPlayback();
    browserSocket?.close();
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ id: ++messageId, method: "Browser.close" }));
      socket.close();
    } else chrome.kill();
    server.kill();
  }

  try {
    const debuggerPort = await waitFor("Chrome's debug port", () => {
      try { return readFileSync(join(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]; }
      catch (error) {
        // Chrome can briefly lock this file while publishing the debug port.
        if (error.code !== "ENOENT" && error.code !== "EBUSY") throw error;
      }
    });
    const pages = await fetch(`http://127.0.0.1:${debuggerPort}/json/list`).then((response) => response.json());
    socket = new WebSocket(pages.find(({ type }) => type === "page").webSocketDebuggerUrl);
    socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      if (message.id !== undefined) pending.get(message.id)?.answer(message);
      else if (message.method === "Inspector.targetCrashed") failPending("its page crashed");
    });
    socket.addEventListener("close", () => failPending("its debug connection closed"));
    // The browser process answers while a page is busy: it reports how much CPU Chrome is using.
    const { webSocketDebuggerUrl } = await fetch(`http://127.0.0.1:${debuggerPort}/json/version`).then((response) => response.json());
    browserSocket = new WebSocket(webSocketDebuggerUrl);
    browserSocket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      browserPending.get(message.id)?.(message);
      browserPending.delete(message.id);
    });
    await waitFor("Chrome's debug connection", () => socket.readyState === WebSocket.OPEN && browserSocket.readyState === WebSocket.OPEN);
    await command("Inspector.enable");
    // The server inventories the artwork before listening. A cold checkout can take longer
    // than the browser's normal per-frame wait to open every asset header.
    await waitFor("the game server", () => fetch(origin).then((response) => response.ok, () => false), 360_000);
    // The page starts in Enhanced; the checks were written for a page that starts in Classic.
    await command("Page.navigate", { url: `${origin}/?display=classic` });
    // The game's 320 by 200 picture; or, from the port's own data (no Classic), any first picture.
    // The runner starts once the server has loaded the artwork and must then boot to startAt before its
    // first frame, so the wait grows with the leg's boot: a second for each million steps beyond 30 s.
    // Leg 2 boots to step 85,000,000; its first picture came after 23 s in Chrome and after 30 s on a
    // busy machine (issue #75). A game that stops fails at once.
    await waitFor("the game page", () => evaluate(`(() => {
      if (typeof state === "object" && state.stopped) throw new Error(state.stopped);
      return typeof send === "function" && (document.querySelector("#screen").naturalWidth === 320 ||
        (state.classicAvailable === false && document.querySelector("#screen").naturalWidth > 0));
    })()`), 30_000 + (Number(startAt) || 0) / 1000);
    if (traceEnhancedFallbacks) {
      await evaluate(`(${observeEnhancedFallbacks})()`);
      observingFallbacks = true;
    }
    await evaluate(`(() => {
      if (!enhanced) document.querySelector("#presentation").click();
      const sendKey = send;
      // The existing route supplies the original combat inputs itself. The page still asks for more of
      // an animation the game plays by itself, which takes no key (#121).
      send = key => key === ":poll" && !state.presentationPolling ? undefined : sendKey(key);
    })()`);

    // POR_REPLAY_WAIT_NARRATION=1: before each key, wait until every narration the page was told to
    // play has ended and none is queued (#102). A replay presses through send(), which the page's key
    // handling never sees, so without this the lines pile up and play long after their passage, under
    // other pictures. With it, each line plays whole on the frame that printed its passage, and the
    // playback log can say whether that passage's artwork stayed on screen from start to end.
    const waitForNarration = process.env.POR_REPLAY_WAIT_NARRATION === "1";
    async function narrationFinished(key) {
      if (!waitForNarration) return;
      await waitFor(`the narration to finish before ${key} at frame ${lastSequence}`, () => evaluate(`(() => {
        if (state.stopped) throw new Error(state.stopped);
        if (animationFrame || renderingSequence !== undefined) return false;
        if (typeof porNarrationPlayback !== "function") return true;
        const log = porNarrationPlayback();
        return !log.queued && !log.sounding && log.lines.every((line) => line.outcome);
      })()`), 180_000);
    }

    return {
      async nextFrame() {
        // The game can run a long while between two prompts. After Tyranthraxus falls, the Enter on
        // "...by possessing one of you!" starts about 50M instructions of his exit through the pool
        // before the next prompt: 25 to 28 s over a pipe, and past the old 30 s wait in Chrome on a
        // busy machine (#120). A game or page that stops still fails at once.
        const frame = await waitFor("the next Enhanced game frame", () => evaluate(`(() => {
          if (state.stopped) throw new Error(state.stopped);
          if (!state.ready || state.sequence <= ${lastSequence} || renderingSequence === state.sequence) return;
          // A frame of an animation the game plays by itself is not a prompt: the page goes on by itself.
          if (state.presentationPolling) return;
          if (${traceEnhancedFallbacks} && animationFrame) return;
          if (document.documentElement.dataset.presentation !== "enhanced") throw new Error("Expected Enhanced mode");
          return { sequence: state.sequence, text: state.text, journal: state.journal };
        })()`), 180_000);
        lastSequence = frame.sequence;
        return frame;
      },
      async send(key) {
        await narrationFinished(key);
        await waitFor(`${key} at frame ${lastSequence}`, () => evaluate(`(async () => {
          if (state.sequence !== ${lastSequence}) throw new Error("The game advanced before input");
          if (!state.ready || posting || renderingSequence === state.sequence) return;
          const sent = await send(${JSON.stringify(key)});
          if (sent === false) throw new Error("The game server rejected the input");
          return sent;
        })()`));
        appendFileSync(commands, JSON.stringify(key) + "\n");
      },
      async pressKey(input) {
        const special = {
          enter: ["Enter", 13], up: ["ArrowUp", 38], down: ["ArrowDown", 40],
          left: ["ArrowLeft", 37], right: ["ArrowRight", 39],
        }[input];
        assert.ok(special || /^[a-z0-9]$/.test(input), `Unsupported Chrome key: ${input}`);
        const key = special?.[0] ?? input;
        const code = special?.[0] ?? (/\d/.test(input) ? `Digit${input}` : `Key${input.toUpperCase()}`);
        const windowsVirtualKeyCode = special?.[1] ?? input.toUpperCase().charCodeAt(0);
        await narrationFinished(key);
        await waitFor(`Chrome ready for ${key}`, () => evaluate(`(() => {
          if (state.sequence !== ${lastSequence}) throw new Error("The game advanced before input");
          if (!state.ready || posting || renderingSequence === state.sequence) return;
          screen.focus({ preventScroll: true });
          return true;
        })()`));
        await command("Input.dispatchKeyEvent", { type: "keyDown", key, code, windowsVirtualKeyCode });
        await command("Input.dispatchKeyEvent", { type: "keyUp", key, code, windowsVirtualKeyCode });
        appendFileSync(commands, JSON.stringify(input) + "\n");
      },
      close,
      evaluate,
      waitForNarration: narrationFinished,
      processes: { chrome: chrome.pid, server: server.pid },
      /** A PNG of the page as Chrome paints it, or of `clip` ({ x, y, width, height } in page pixels). */
      async screenshot(clip) {
        const { data } = await command("Page.captureScreenshot",
          { format: "png", ...(clip ? { clip: { ...clip, scale: 1 } } : {}) });
        return Buffer.from(data, "base64");
      },
    };
  } catch (error) {
    await close();
    throw new Error(`Chrome campaign setup failed. Diagnostics in ${resolve(directory)}`, { cause: error });
  }
}
