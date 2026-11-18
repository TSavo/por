import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [checkpoint, chromePath, routeName = "kobolds"] = process.argv.slice(2);
assert.ok(checkpoint && chromePath, "Usage: node tools/verify-slums-presentation.mjs <checkpoint> <Chrome executable> [kobolds|orcs|sokal-armory|sokal-landing|sokal-patrol-combat|sokal-courtyard]");
assert.ok(["kobolds", "orcs", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard"].includes(routeName), "Unknown Slums replay route");
const orcs = routeName === "orcs";
const armory = routeName === "sokal-armory";
const patrolCombat = routeName === "sokal-patrol-combat";
const courtyard = routeName === "sokal-courtyard";
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const saved = resolve(directory, landing ? "J.json" : armory ? "D.json" : orcs ? "C.json" : "A.json");
const profile = resolve(directory, "chrome");
copyFileSync(checkpoint, saved);
const originalSave = readFileSync(saved);
const port = process.env.POR_PLAY_PORT ?? "43212";
const origin = `http://127.0.0.1:${port}`;
const browserEnvironment = { ...process.env };
delete browserEnvironment.POR_UPGRADES_DIR;
const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...browserEnvironment, POR_PLAY_PORT: port, POR_SAVE_DIR: directory,
    POR_PREGEN_PARTY: "0", POR_TRACE_TILES: "1", POR_BOOT_KEY_FILE: "",
    POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:" + (landing ? "246a" : armory ? "2064" : orcs ? "2e63" : "1e61"),
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
  if (armory || landing) {
    const route = courtyard ? [
      null, "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
      "p", "n", ..."shestni", "enter",
      ...Array(5).fill("up"), "enter", "y", "up", "left", "up", "y", "left", "y", "up", "enter",
    ] : landing ? [
      null, "up", "left", "up", "up", "enter", "enter", "end", "enter", "enter", "enter", "enter",
      "right", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up",
      "left", "enter", ...(patrolCombat ? [] : ["p", "n", ..."shestni", "enter"]),
    ] :
      ["up", "up", "up", "right", "up", "left", "up", "left", "up", "up", "up", "right", "up"];
    const seen = new Set();
    let views = 0;
    let patrol = false;
    for (const [step, key] of route.entries()) {
      if (key) await advance(key);
      if (landing && !courtyard && step === 9) {
        const parchment = frame.text.map(([, character]) => String.fromCharCode(character)).join("");
        assert.match(parchment, /THELASTPARTISEATENAWAY/i);
      }
      if (landing && frame.encounter && !patrol) {
        assert.deepEqual(frame.encounter, [48, 32, "encounter:SPRIT4.DAX:34:0:0", 40, 80]);
        await waitFor("Sokal patrol artwork", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector(".encounter-sprite")?.naturalWidth === 160 &&
          document.querySelector(".encounter-sprite")?.naturalHeight === 320`));
        await switchBothWays();
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "sokal-undead-patrol.png"), Buffer.from(shot.data, "base64"));
        patrol = true;
      }
      if (!frame.tileInventory?.length) continue;
      if (landing && frame.tileInventory.every(([, , , indices]) => /^0+$/.test(indices))) continue;
      views++;
      assert.equal(frame.tiles.length, 121, `Step ${step} (${key})`);
      for (const [, , id] of frame.tiles) {
        assert.match(id, /^tile:21:/);
        seen.add(id);
      }
      await waitFor("121 assembled Sokal tiles", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll("#tile-art img:not(.encounter-sprite)").length === 121 &&
        [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      if ((courtyard && step === route.length - 2) ||
          (landing && !courtyard && (step === 0 || step === 21 || step === route.length - 1)) || (!landing && (step === 2 || step === 9))) {
        if (step === (landing ? 0 : 2)) await switchBothWays();
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, `${routeName}-${step}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    const text = frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, patrolCombat ? /APACKOFUNDEADSUDDENLYAPPEARS/i :
      courtyard ? /ALARGEFORCEOFORCSANDHOBGOBLINSRUSHESYOU/i :
        landing ? /THEUNDEADLEAVE/i : /ONSTANDSAREASHIELD/i);
    if (landing) {
      assert.ok(patrol);
      if (!patrolCombat) assert.equal(frame.encounter, undefined);
    }
    assert.equal(views, courtyard ? 24 : patrolCombat ? 18 : landing ? 19 : 12);
    assert.equal(seen.size, courtyard ? 56 : landing ? 49 : 13);
    console.log(`Verified ${seen.size} ${routeName} patterns across ${views} views. Captures: ${directory}`);
    if (patrolCombat || courtyard) {
      const bank = courtyard ? "CPIC2.DAX" : "CPIC4.DAX";
      const guards = courtyard ? ["4", "5", "6"] : ["34", "35"];
      const attackIds = new Set(guards.map((id) => String(Number(id) + 128)));
      await run(`(() => {
        window.combatSprites = new Set();
        new MutationObserver(() => {
          for (const image of document.querySelectorAll('.combat-sprite[src^="/art/combat:${bank}:"]')) {
            const record = () => {
              if (image.naturalWidth === 96 && image.naturalHeight === 96) {
                window.combatSprites.add(image.getAttribute("src").split(":").at(-1));
              }
            };
            if (image.complete) record();
            else image.addEventListener("load", record, { once: true });
          }
        }).observe(document.querySelector("#tile-art"), { childList: true });
      })()`);
      for (const key of courtyard ? ["enter", "enter", "enter"] : ["c", "enter", "enter", "enter"]) await advance(key);
      for (let turn = 0; courtyard && turn < 20; turn++) {
        const visible = new Set(frame.combatArt.map(([, , id]) => id));
        if (guards.every(id => visible.has(`combat:${bank}:${id}`))) break;
        await advance("q");
      }
      await waitFor("all guard sprites", () => run(
        `${JSON.stringify(guards)}.every(id => combatSprites.has(id))`));
      const [x, y] = frame.combatArt.find(([, , id]) => id === `combat:${bank}:${guards[0]}`);
      await waitFor("transparent artwork over a cleared guest cell", () => run(`(() => {
        const image = document.querySelector("#screen");
        if (!image.complete || image.naturalWidth !== 320) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = context.canvas.height = 24;
        context.drawImage(image, ${x}, ${y}, 24, 24, 0, 0, 24, 24);
        return [...context.getImageData(0, 0, 24, 24).data].every(
          (value, index) => value === [15, 14, 18, 255][index % 4]);
      })()`));
      await switchBothWays();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, `${routeName}-battle.png`), Buffer.from(shot.data, "base64"));
      const strikes = new Set();
      for (let turn = 0; turn < 180 && strikes.size < attackIds.size; turn++) {
        await advance("q");
        for (const view of frame.animation ?? []) {
          for (const [, , id] of view.combatArt) {
            const prefix = `combat:${bank}:`;
            if (id.startsWith(prefix) && attackIds.has(id.slice(prefix.length))) strikes.add(id);
          }
        }
        if (frame.animation?.length) {
          await waitFor("the captured attack sequence", () => run(
            `state.sequence === ${frame.sequence} && !animationFrame`));
        }
      }
      assert.equal(strikes.size, attackIds.size);
      assert.deepEqual(await run("[...combatSprites].sort()"), [...guards, ...attackIds].sort());
      console.log(`Verified ${guards.length} guard and ${strikes.size} strike PNGs in live ${routeName} combat.`);
    }
  } else if (orcs) {
    const route = ["up", "left", "up", "up", "up", "right", "up", "right",
      ...Array(5).fill("up"), "right", "up", "left", "up", "left", "up"];
    const manifest = JSON.parse(readFileSync("upgrades/slums/manifest.json"));
    const junctions = new Set(Object.entries(manifest.assets)
      .filter(([, name]) => /^orc-(door|joint|rubble)-/.test(name)).map(([id]) => id));
    assert.ok(junctions.size > 0);
    for (const [step, key] of route.entries()) {
      await advance(key);
      assert.equal(frame.tiles.length, 121);
      await waitFor("all 121 corridor tiles", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll("#tile-art img").length === 121 &&
        [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      for (const [, , id] of frame.tiles) junctions.delete(id);
      if (step === 5) await switchBothWays();
    }
    assert.deepEqual([...junctions], []);
    let approach = false;
    for (let step = 0; step < 5; step++) {
      await advance("enter");
      if (!frame.encounter) continue;
      assert.deepEqual(frame.encounter, [48, 32, "encounter:SPRIT2.DAX:4:0:0", 40, 80]);
      await waitFor("the near orc", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-sprite")?.naturalWidth === 160 &&
        document.querySelector(".encounter-sprite")?.naturalHeight === 320`));
      approach = true;
    }
    assert.ok(approach);
    assert.equal(frame.encounter, undefined);
    const guard = "combat:CPIC2.DAX:4";
    assert.ok(frame.combatArt.filter(([, , id]) => id === guard).length >= 3);
    await waitFor("the combat orcs", () => run(`state.sequence === ${frame.sequence} &&
      [...document.querySelectorAll(".combat-sprite")].filter(img => img.naturalWidth === 96).length >= 3`));
    await switchBothWays();
    await run(`(() => {
      window.swingPlacements = [];
      new MutationObserver(() => {
        for (const image of document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:132"]')) {
          const remember = () => window.swingPlacements.push([
            Math.round(parseFloat(image.style.left) * 3.2),
            Math.round(parseFloat(image.style.top) * 2),
            image.naturalWidth, image.naturalHeight,
          ]);
          if (image.complete && image.naturalWidth) remember();
          else image.addEventListener("load", remember, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });
    })()`);
    const positions = new Set();
    const attacks = new Set();
    for (let turn = 0; turn < 15; turn++) {
      for (const [x, y, id] of frame.combatArt) {
        if (id === guard) positions.add(`${x},${y}`);
      }
      await advance("q");
      for (const view of frame.animation ?? []) {
        for (const [x, y, id] of view.combatArt) {
          if (id === "combat:CPIC2.DAX:132") attacks.add(`${x},${y}`);
        }
      }
      if (frame.animation?.length) {
        await waitFor("Chrome to finish the recorded attacks", () => run(
          `state.sequence === ${frame.sequence} && !animationFrame`));
      }
    }
    assert.ok(attacks.size >= 2, "Original combat must draw swings at multiple positions");
    const displayedSwings = await run("window.swingPlacements");
    const displayedPositions = new Set(displayedSwings
      .filter(([, , width, height]) => width === 96 && height === 96).map(([x, y]) => `${x},${y}`));
    assert.ok([...attacks].every((position) => displayedPositions.has(position)),
      "Chrome must display the 4� swing at each original position");
    assert.ok(positions.size > 4, "Guard artwork should follow moving units");
    console.log(`Verified ${route.length} Slums outpost views with guard sprites in ${positions.size} combat positions and swings in ${attacks.size}.`);
  } else {
    let views = 0;
    const tileLayouts = new Set();
    const routeTiles = [];
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
      routeTiles.push(frame.tileInventory);
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
    await waitFor("Chrome to display the final combat frame", () => run(`state.ready && state.sequence === ${frame.sequence}`));
    await command("Input.dispatchKeyEvent", { type: "keyDown", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await command("Input.dispatchKeyEvent", { type: "keyUp", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await waitFor("the guest frame after Alt+Q", async () => {
      const state = await latest();
      return state.ready && state.sequence > frame.sequence;
    });
    console.log(`Verified ${views} Slums views and state-preserving switches in exploration, journal, dialogue, and combat.`);
    const trace = resolve(directory, "slums-tiles.jsonl");
    writeFileSync(trace, routeTiles.map((tiles) => JSON.stringify(tiles)).join("\n") + "\n");
    console.log("Slums artwork trace:", trace);
  }
} finally {
  socket?.close();
  chrome.kill();
  server.kill();
}
