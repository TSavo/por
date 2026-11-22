import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { appendFileSync, copyFileSync, createWriteStream, mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from "node:fs";
import { createServer } from "node:net";
import { basename, join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

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
  inputCompat = "discard-poll-prompt", schedule, pregenParty = false }) {
  mkdirSync(directory);
  // The guest overwrites slots during a campaign. Preserve the input saves
  // and commands for each leg, including host-side journal commands.
  copyCampaignSaves(checkpointDir, directory);
  writeFileSync(join(directory, "boot.json"), JSON.stringify({ bootKeys, startAt, developerCombat }) + "\n");
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
  const chrome = spawn(chromePath, ["--headless", "--no-first-run", "--mute-audio",
    "--autoplay-policy=no-user-gesture-required", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], {
    stdio: "ignore", windowsHide: true,
  });
  let childError;
  for (const child of [server, chrome]) child.on("error", (error) => { childError = error; });
  let socket;
  let messageId = 0;
  let lastSequence = -1;

  async function waitFor(description, read, timeout = 30_000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (childError) throw childError;
      for (const [name, child] of [["Game server", server], ["Chrome", chrome]]) {
        if (child.exitCode !== null || child.signalCode !== null) throw new Error(`${name} exited during ${description}`);
      }
      const value = await read();
      if (value) return value;
      await delay(40);
    }
    throw new Error(`Timed out waiting for ${description}`);
  }

  function command(method, params = {}) {
    const id = ++messageId;
    return new Promise((done, reject) => {
      const timer = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(new Error(`Chrome did not respond to ${method}`));
      }, 10_000);
      function receive(event) {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timer);
        socket.removeEventListener("message", receive);
        if (message.error) reject(new Error(message.error.message));
        else done(message.result);
      }
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
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
    const ledger = process.env.POR_NARRATION_LEDGER;
    const run = process.env.POR_NARRATION_RUN ?? basename(ledger || directory).replace(/\.jsonl$/, "");
    const text = [{ t: "playback", run, leg: basename(directory), at: playback.at, frame: playback.frame, queued: playback.queued },
      ...playback.lines.map((line) => ({ t: "p", ...line }))].map((line) => JSON.stringify(line) + "\n").join("");
    writeFileSync(join(directory, "narration-playback.jsonl"), text);
    if (ledger) appendFileSync(ledger.replace(/\.jsonl$/, "") + ".playback.jsonl", text);
  }

  async function close() {
    await writeNarrationPlayback();
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
    await waitFor("Chrome's debug connection", () => socket.readyState === WebSocket.OPEN);
    await waitFor("the game server", () => fetch(origin).then((response) => response.ok, () => false));
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
    await evaluate(`(() => {
      if (!enhanced) document.querySelector("#presentation").click();
      const sendKey = send;
      // The existing route supplies the original combat inputs itself.
      send = key => key === ":poll" ? undefined : sendKey(key);
    })()`);

    return {
      async nextFrame() {
        // The game can run a long while between two prompts. After Tyranthraxus falls, the Enter on
        // "...by possessing one of you!" starts about 50M instructions of his exit through the pool
        // before the next prompt: 25 to 28 s over a pipe, and past the old 30 s wait in Chrome on a
        // busy machine (#120). A game or page that stops still fails at once.
        const frame = await waitFor("the next Enhanced game frame", () => evaluate(`(() => {
          if (state.stopped) throw new Error(state.stopped);
          if (!state.ready || state.sequence <= ${lastSequence} || renderingSequence === state.sequence) return;
          if (document.documentElement.dataset.presentation !== "enhanced") throw new Error("Expected Enhanced mode");
          return { sequence: state.sequence, text: state.text, journal: state.journal };
        })()`), 180_000);
        lastSequence = frame.sequence;
        return frame;
      },
      async send(key) {
        await waitFor(`${key} at frame ${lastSequence}`, () => evaluate(`(async () => {
          if (state.sequence !== ${lastSequence}) throw new Error("The game advanced before input");
          if (!state.ready || posting || renderingSequence === state.sequence) return;
          const sent = await send(${JSON.stringify(key)});
          if (sent === false) throw new Error("The game server rejected the input");
          return sent;
        })()`));
        appendFileSync(commands, JSON.stringify(key) + "\n");
      },
      close,
      evaluate,
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
