import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [checkpoint, chromePath] = process.argv.slice(2);
assert.ok(checkpoint && chromePath, "Usage: node tools/verify-slums-presentation.mjs <slot A checkpoint> <Chrome executable>");
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const saved = resolve(directory, "A.json");
const profile = resolve(directory, "chrome");
copyFileSync(checkpoint, saved);
const originalSave = readFileSync(saved);
const port = process.env.POR_PLAY_PORT ?? "43212";
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...process.env, POR_PLAY_PORT: port, POR_SAVE_DIR: directory, POR_UPGRADES_DIR: "upgrades/slums",
    POR_PREGEN_PARTY: "0", POR_TRACE_TILES: "1", POR_BOOT_KEY_FILE: "",
    POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:1e61",
    POR_LIVE_AT: "85000000", POR_BOOT_STEPS: "450000000",
  },
  stdio: ["ignore", "ignore", "inherit"],
});
const chrome = spawn(chromePath, [
  "--headless", "--no-first-run", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

async function waitFor(description, read) {
  const deadline = Date.now() + 30_000;
  let lastError;
  do {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await delay(75);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${description}`, { cause: lastError });
}

let socket;
try {
  const debugPort = await waitFor("Chrome's debug port", () =>
    readFileSync(resolve(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]);
  const tab = await waitFor("Chrome tab", async () => {
    const tabs = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
    return tabs.find(({ type }) => type === "page");
  });
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let messageId = 0;
  function command(method, params) {
    const id = ++messageId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(new Error(`Chrome did not answer ${method}`));
      }, 10_000);
      function receive(event) {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timeout);
        socket.removeEventListener("message", receive);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function run(expression) {
    const response = await command("Runtime.evaluate", { expression, returnByValue: true });
    assert.ok(!response.exceptionDetails, response.exceptionDetails?.text);
    return response.result.value;
  }
  const latest = () => fetch(origin + "/state").then((response) => response.json());
  let frame = await waitFor("the loaded party", async () => {
    const state = await latest();
    return state.ready && state;
  });
  await command("Page.navigate", { url: origin });
  await waitFor("the game display", () => run('document.querySelector("#screen")?.naturalWidth === 320'));

  async function advance(key) {
    const sequence = frame.sequence;
    const response = await fetch(origin + "/key", {
      method: "POST", headers: { Origin: origin, "X-POR-Frame": String(sequence) }, body: key,
    });
    assert.equal(response.status, 204, `Input rejected: ${key}`);
    frame = await waitFor(`guest frame after ${key}`, async () => {
      const state = await latest();
      return state.ready && state.sequence > sequence && state;
    });
  }

  async function switchBothWays() {
    const before = await latest();
    await run('document.querySelector("#presentation").click()');
    await waitFor("classic presentation", () => run('document.querySelector("#game-text").hidden && document.querySelector("#tile-art").hidden'));
    assert.deepEqual(await latest(), before);
    await run('window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }))');
    await waitFor("enhanced text", () => run('!document.querySelector("#game-text").hidden'));
    assert.deepEqual(await latest(), before);
    assert.deepEqual(readFileSync(saved), originalSave);
  }

  await run('document.querySelector("#presentation").click()');
  let views = 0;
  const tileLayouts = new Set();
  let portrait = false;
  let encounter = false;
  const route = [
    "up", "up", "enter", "enter", "up", "up", "up", "up", "enter", "left",
    "up", "up", "up", "up", "up", "enter", ...Array(26).fill("up"), "c", "enter", "m", "down",
  ];
  for (const key of route) {
    await advance(key);
    if (frame.encounter && !encounter) {
      assert.equal(frame.encounter[2], "encounter:SPRIT2.DAX:0:0:0");
      await waitFor("the near encounter sprite", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
      encounter = true;
    }
    if (frame.portrait && !portrait) {
      assert.equal(frame.portrait, "portrait:PIC2.DAX:0:0:0");
      assert.equal(frame.tiles.length, 0);
      await waitFor("the kobold portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      portrait = true;
    }
    if (!frame.tileInventory?.[0]?.[2].startsWith("tile:20:")) continue;
    assert.equal(frame.tiles.length, 121);
    tileLayouts.add(JSON.stringify(frame.tiles));
    await waitFor("121 individual tiles", () => run(`(() => {
      const tiles = [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")];
      return tiles.length === 121 && tiles.every(tile => tile.naturalWidth === 32 && tile.naturalHeight === 32);
    })()`));
    if (++views !== 3) continue;

    await waitFor("the loaded web font", () => run(`Array.from(document.fonts)
      .some(font => font.family.includes("Game Web Font") && font.status === "loaded")`));
    for (const width of [430, 1100]) {
      await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      assert.ok(await run(`(() => {
        const screen = document.querySelector("#screen").getBoundingClientRect();
        const tile = document.querySelector("#tile-art img");
        const rect = tile.getBoundingClientRect();
        const glyph = document.querySelector("#game-text span");
        return getComputedStyle(tile).imageRendering === "pixelated" &&
          Math.abs(rect.width - screen.width * .025) < 1 && Math.abs(rect.height - screen.height * .04) < 1 &&
          Math.abs(rect.left - screen.left - screen.width * .075) < 1 &&
          Math.abs(rect.top - screen.top - screen.height * .12) < 1 &&
          getComputedStyle(glyph).fontFamily.includes("Game Web Font");
      })()`), `Overlay alignment and web font at ${width}px`);
      await switchBothWays();
    }
    await advance("j");
    assert.ok(frame.journal);
    await waitFor("the journal", () => run('!document.querySelector("#journal").hidden'));
    await run('document.querySelector("#close-journal").focus()');
    await switchBothWays();
    assert.equal(await run("document.activeElement.id"), "close-journal");
    await advance("j");
  }

  assert.ok(encounter && portrait, "The kobold encounter and dialogue must both render");
  assert.ok(tileLayouts.size > 1, "Walking and turning must change the assembled view");
  assert.equal(frame.tiles.length, 0);
  const menu = frame.text.filter(([cell]) => cell >= 960).sort(([a], [b]) => a - b)
    .map(([, character]) => String.fromCharCode(character)).join("");
  assert.match(menu, /move|attack|aim|quick/i);
  assert.ok(frame.combatArt.some((placement) => placement[3]) && frame.combatArt.some((placement) => !placement[3]));
  await waitFor("the mirrored 4× combat sprite", () => run(`[...document.querySelectorAll(".combat-sprite")]
    .some(image => image.naturalWidth === 96 && image.style.transform === "scaleX(-1)")`));
  await switchBothWays();
  console.log(`Verified ${views} Slums views and state-preserving switches in exploration, journal, dialogue, and combat.`);
} finally {
  socket?.close();
  chrome.kill();
  server.kill();
}
