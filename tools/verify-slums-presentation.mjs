import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [checkpoint, chromePath, routeName = "kobolds", option] = process.argv.slice(2);
const routes = ["kobolds", "orcs", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard", "castle-dragon", "castle-ending"];
assert.ok(checkpoint && chromePath, `Usage: node tools/verify-slums-presentation.mjs <checkpoint> <Chrome executable> [${routes.join("|")}] [--terrain-only|--manual-party]`);
assert.ok(routes.includes(routeName), "Unknown presentation replay route");
const ending = routeName === "castle-ending";
const dragon = routeName === "castle-dragon";
const orcs = routeName === "orcs";
const armory = routeName === "sokal-armory";
const patrolCombat = routeName === "sokal-patrol-combat";
const courtyard = routeName === "sokal-courtyard";
const terrainOnly = option === "--terrain-only";
const manualParty = option === "--manual-party";
assert.ok(!option || (courtyard && (terrainOnly || manualParty)), "Both options require sokal-courtyard");
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const saved = resolve(directory, landing ? "J.json" : armory ? "D.json" : dragon ? "B.json" : orcs || ending ? "C.json" : "A.json");
const battleTrace = courtyard && process.env.POR_TRACE_BATTLE_TILES === "1"
  ? resolve(directory, "battle-tiles.jsonl") : undefined;
const frameDirectory = resolve(directory, "tile-frames");
let battleFrame = 0;
if (battleTrace) mkdirSync(frameDirectory);
const profile = resolve(directory, "chrome");
copyFileSync(checkpoint, saved);
const originalSave = readFileSync(saved);
const port = process.env.POR_PLAY_PORT ?? "43212";
const origin = `http://127.0.0.1:${port}`;
const browserEnvironment = { ...process.env };
delete browserEnvironment.POR_UPGRADES_DIR;
if (terrainOnly) {
  const pack = resolve(directory, "terrain-only");
  mkdirSync(pack);
  const combined = { version: 1, assets: {}, encounters: {} };
  for (const source of ["upgrades/slums", "upgrades"]) {
    const manifest = JSON.parse(readFileSync(resolve(source, "manifest.json")));
    for (const [id, file] of Object.entries(manifest.assets)) {
      if (id.startsWith("combat:")) continue;
      copyFileSync(resolve(source, file), resolve(pack, file));
      combined.assets[id] = file;
    }
    Object.assign(combined.encounters, manifest.encounters);
  }
  writeFileSync(resolve(pack, "manifest.json"), JSON.stringify(combined));
  browserEnvironment.POR_UPGRADES_DIR = pack;
}

const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...browserEnvironment, POR_PLAY_PORT: port, POR_SAVE_DIR: directory,
    POR_PREGEN_PARTY: "0", POR_TRACE_TILES: "1", POR_BOOT_KEY_FILE: "",
    POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:" + (landing ? "246a" : armory ? "2064" : dragon ? "3062" : orcs || ending ? "2e63" : "1e61"),
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
    if (battleTrace && frame.battleTileInventory?.length) {
      appendFileSync(battleTrace, JSON.stringify(frame.battleTileInventory) + "\n");
      writeFileSync(resolve(frameDirectory, `${battleFrame++}.png`), Buffer.from(frame.frame, "base64"));
    }
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
  if (dragon) {
    for (const key of ["right", ...Array(4).fill("up"), ...Array(3).fill("enter")]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:66:0:0");
    await waitFor("the dragon dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "enter", ...Array(6).fill("a"), "enter", "enter", "q"]) await advance(key);
    const sprite = frame.combatArt.find(([, , id]) => id === "combat:CPIC5.DAX:66");
    assert.ok(sprite);
    const [x, y, , reflected, highlighted, size] = sprite;
    assert.equal(highlighted, true);
    assert.equal(size, 48);
    await waitFor("the selected 4× dragon sprite", () => run(`(() => {
      const img = [...document.querySelectorAll(".combat-sprite")].find(img => img.src.endsWith("CPIC5.DAX:66"));
      return state.sequence === ${frame.sequence} && img?.naturalWidth === 192 && img.naturalHeight === 192 &&
        parseFloat(img.style.left) === ${x / 3.2} && parseFloat(img.style.top) === ${y / 2} &&
        parseFloat(img.style.width) === 15 && parseFloat(img.style.height) === 24 &&
        img.style.transform === ${JSON.stringify(reflected ? "scaleX(-1)" : "")};
    })()`));
    await switchBothWays();
    console.log("Verified the castle dragon in dialogue and selected combat, with state-preserving mode switches.");
  } else if (ending) {
    await advance("j");
    assert.equal(frame.journal?.objective.title, "Phlan is free");
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-castle")?.status, "turned-in");
    const endingVisible = () => run(`!document.querySelector("#journal").hidden &&
      document.querySelector("#objective strong")?.textContent === "Phlan is free"`);
    await waitFor("the saved campaign ending", endingVisible);
    assert.equal(await run("document.activeElement.id"), "close-journal");
    await switchBothWays();
    assert.ok(await endingVisible());
    const available = frame.journal.leads.find(({ id, status }) =>
      status && status !== "turned-in" && id !== frame.journal.trackedId);
    if (available) {
      const id = JSON.stringify(available.id);
      const sequenceBeforeTrack = frame.sequence;
      await run(`(() => {
        const track = [...document.querySelectorAll('[data-lead-id]')].find(button => button.dataset.leadId === ${id});
        track.focus();
        track.click();
      })()`);
      frame = await waitFor("the selected objective", async () => {
        const next = await latest();
        return next.ready && next.sequence > sequenceBeforeTrack && next.journal?.trackedId === available.id && next;
      });
      await waitFor("focus on the tracked commission", () => run(`document.activeElement.dataset.leadId === ${id} &&
        document.activeElement.getAttribute("aria-disabled") === "true"`));
      await run('document.activeElement.click()');
      assert.deepEqual(await latest(), frame);
    }
    await advance("j");
    await waitFor("return to the loaded game", () => run('document.querySelector("#journal").hidden'));
    assert.equal(await run("document.activeElement.id"), "screen");
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the completed campaign journal and mode switching in Chrome after reloading slot C.");
  } else if (armory || landing) {
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
    if (manualParty) {
      for (const key of ["enter", "enter", "enter"]) await advance(key);
      const brin = () => /BRINHITPOINTS6AC1MACEMOVEVIEWAIMUSEQUICKDONE/i.test(
        frame.text.map(([, character]) => String.fromCharCode(character)).join(""));
      for (let turn = 0; turn < 20 && !brin(); turn++) await advance("space");
      assert.ok(brin(), "Expected Brin's manual combat menu");
      const party = frame.combatArt.find(([, , id, , highlight]) => id === "combat:party:0:0" && highlight);
      assert.deepEqual(party, [80, 80, "combat:party:0:0", true, true]);
      await waitFor("Brin's rendered icon and restored selection frame", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll('.combat-sprite[src="/art/combat:party:0:0"]')]
          .find(image => image.style.left === "25%" && image.style.top === "40%");
        const image = document.querySelector("#screen");
        if (sprite?.naturalWidth !== 96 || !image.complete) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = context.canvas.height = 24;
        context.drawImage(image, 80, 80, 24, 24, 0, 0, 24, 24);
        const color = (x, y) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3).join(",");
        return color(0, 0) === "254,245,221" && color(23, 23) === "87,81,82" &&
          color(10, 6) === "174,166,153";
      })()`));
      await switchBothWays();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "sokal-brin-selected.png"), Buffer.from(shot.data, "base64"));
      for (const key of ["a", "n", "n", "n"]) await advance(key);
      const aim = [...frame.text].sort(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join("");
      assert.match(aim, /ORCHITPOINTS2AC6/i);
      assert.match(aim, /RANGE=3/i);
      const target = frame.combatArt.find(([, , id, , highlight]) => id === "combat:CPIC2.DAX:4" && highlight);
      assert.deepEqual(target, [128, 128, "combat:CPIC2.DAX:4", false, true]);
      await waitFor("the enhanced orc and preserved Aim cursor", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:4"]')]
          .find(image => image.style.left === "40%" && image.style.top === "64%");
        const image = document.querySelector("#screen");
        if (sprite?.naturalWidth !== 96 || !image.complete) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.drawImage(image, 131, 136, 1, 1, 0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].join(",") === "254,245,221,255";
      })()`));
      await switchBothWays();
      const aimShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "sokal-orc-aimed.png"), Buffer.from(aimShot.data, "base64"));
      console.log("Verified Brin's selected combat icon and the orc under the original Aim cursor in both modes.");
    } else if (terrainOnly) {
      assert.equal(frame.battleTiles.length, 0);
      for (const key of ["enter", "enter", "enter"]) await advance(key);
      for (let turn = 0; turn < 20 && !frame.battleTiles.length; turn++) await advance("q");
      assert.equal(frame.combatArt.length, 0);
      assert.ok(frame.battleTiles.length > 0);
      await waitFor("masonry without combat sprite artwork", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll(".combat-sprite").length === 0 &&
        document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
        [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32)`));
      await switchBothWays();
      console.log(`Verified ${frame.battleTiles.length} masonry placements without combat sprite artwork.`);
    } else if (patrolCombat || courtyard) {
      const bank = courtyard ? "CPIC2.DAX" : "CPIC4.DAX";
      const guards = courtyard ? ["4", "5", "6"] : ["34", "35"];
      const attackIds = new Set(guards.map((id) => String(Number(id) + 128)));
      await run(`(() => {
        window.combatSprites = new Set();
        window.partySpriteSeen = false;
        window.attackSwitch = null;
        new MutationObserver(() => {
          if (${courtyard} && animationFrame?.battleTiles.length && animationFrame.combatArt.length && !attackSwitch) {
            const attack = animationFrame;
            const sequence = state.sequence;
            const layer = document.querySelector("#tile-art");
            const screen = document.querySelector("#screen");
            const oldFrame = screen.getAttribute("src");
            document.querySelector("#presentation").click();
            const classic = layer.hidden && document.querySelector("#game-text").hidden &&
              screen.getAttribute("src") === "data:image/png;base64," + attack.frame;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
            window.attackSwitch = {
              classic,
              enhanced: !layer.hidden && screen.getAttribute("src") === oldFrame &&
                layer.querySelectorAll(".battle-tile").length === attack.battleTiles.length &&
                layer.querySelectorAll(".combat-sprite").length === attack.combatArt.length,
              sameAttack: animationFrame === attack && state.sequence === sequence,
            };
          }
          const party = document.querySelector('.combat-sprite[src="/art/combat:party:0:0"]');
          if (party) {
            const recordParty = () => {
              if (party.naturalWidth === 96 && party.naturalHeight === 96) window.partySpriteSeen = true;
            };
            if (party.complete) recordParty();
            else party.addEventListener("load", recordParty, { once: true });
          }
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
      if (courtyard) {
        assert.ok(frame.battleTiles.length > 0);
        await waitFor("all matched 4� battle terrain tiles", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
          [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32 && tile.naturalHeight === 32)`));
      }
      await switchBothWays();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, `${routeName}-battle.png`), Buffer.from(shot.data, "base64"));
      let layeredAttack;
      const strikes = new Set();
      const terrainLayouts = new Set();
      for (let turn = 0; turn < 180 && strikes.size < attackIds.size; turn++) {
        await advance("q");
        if (courtyard && frame.battleTiles.length) {
          terrainLayouts.add(JSON.stringify(frame.battleTiles));
          if (!frame.animation?.length && terrainLayouts.size <= 4) {
            await waitFor("masonry after the combat view changes", () => run(`state.sequence === ${frame.sequence} &&
              document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
              [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32)`));
          }
        }
        for (const view of frame.animation ?? []) {
          if (view.battleTiles.length && view.combatArt.length) layeredAttack ??= view;
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
      if (courtyard) {
        assert.ok(terrainLayouts.size >= 4, "Expected the battlefield to scroll");
        assert.ok(await run("window.partySpriteSeen"), "Expected the composed party sprite to render");
        assert.deepEqual(await run("window.attackSwitch"), { classic: true, enhanced: true, sameAttack: true });
        assert.deepEqual(readFileSync(saved), originalSave);
        assert.ok(layeredAttack, "Expected a captured attack with terrain and actors");
        await waitFor("the battle layers to use only the animation frame", () => run(`(() => {
          const next = state;
          try {
            // The next input frame can already be back in exploration or dialogue.
            state = { ...next,
              portrait: "portrait:PIC2.DAX:0:0:0", tiles: [[24, 24, "tile:unused-during-attack"]] };
            animationFrame = ${JSON.stringify(layeredAttack)};
            showScreen();
            const layer = document.querySelector("#tile-art");
            const terrain = [...layer.querySelectorAll(".battle-tile")];
            const actors = [...layer.querySelectorAll(".combat-sprite")];
            return !layer.hidden && terrain.length === animationFrame.battleTiles.length &&
              actors.length === animationFrame.combatArt.length &&
              layer.children.length === terrain.length + actors.length &&
              !document.querySelector("#game-text").hidden &&
              terrain.at(-1).nextElementSibling === actors[0];
          } finally {
            state = next;
            animationFrame = undefined;
            showScreen();
          }
        })()`));
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
    let cityTiles = 0;
    const tileLayouts = new Set();
    const routeTiles = [];
    let portrait = false;
    let encounter = false;
    const route = [
      "up", "up", "enter", "enter", "up", "up", "up", "up", "enter", "left",
      "up", "up", "up", "up", "up", "enter", ...Array(26).fill("up"), "c", "enter", "m", "down",
    ];
    assert.equal(frame.tiles.length, 121, "Every tile at the city gate needs a replacement");
    await waitFor("the assembled New Phlan gate", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelectorAll("#tile-art img").length === 121 &&
      [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
    const cityGate = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "new-phlan-gate.png"), Buffer.from(cityGate.data, "base64"));
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
      if (frame.tileInventory?.[0]?.[2].startsWith("tile:0:") && frame.tiles.length) {
        cityTiles += frame.tiles.length;
        await waitFor("New Phlan entrance tiles", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelectorAll("#tile-art img").length === ${frame.tiles.length} &&
          [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      }
      if (!frame.tileInventory?.[0]?.[2].startsWith("tile:20:")) continue;
      routeTiles.push(frame.tileInventory);
      assert.equal(frame.tiles.length, 121);
      assert.deepEqual(frame.tiles, frame.tileInventory.map(([x, y, id]) => [x, y, id]));
      tileLayouts.add(JSON.stringify(frame.tiles));
      await waitFor("121 individual tiles", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const tiles = [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")];
        const expected = ${JSON.stringify(frame.tiles)};
        return tiles.length === expected.length && tiles.every((tile, index) => {
          const [x, y, id] = expected[index];
          return tile.naturalWidth === 32 && tile.naturalHeight === 32 &&
            tile.getAttribute("src") === "/art/" + id &&
            Math.abs(parseFloat(tile.style.left) - x / 3.2) < 0.001 &&
            Math.abs(parseFloat(tile.style.top) - y / 2) < 0.001;
        });
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
    const menuCells = frame.text.filter(([cell]) => cell >= 960);
    const aim = menuCells.find(([, character]) => character === 65);
    assert.equal(aim?.[2], 15, "Aim must have its original highlighted shortcut");
    assert.deepEqual(menuCells.find(([cell]) => cell === aim[0] + 1), [aim[0] + 1, 105, 10],
      "Aim's other letters must use the original normal menu color");
    const menuColors = () => run(`(() => {
      if (state.sequence !== ${frame.sequence} || document.querySelector("#game-text").hidden) return false;
      const cells = [...document.querySelectorAll("#game-text span")].filter(glyph => parseFloat(glyph.style.top) === 96);
      return cells.length === ${menuCells.length} && ${JSON.stringify(menuCells)}.every(([cell, char, color]) => cells.some(glyph =>
        Math.abs(parseFloat(glyph.style.left) - (cell % 40) * 2.5) < 0.01 && glyph.textContent === String.fromCharCode(char) &&
        getComputedStyle(glyph).color === "rgb(" + state.textColors[color].join(", ") + ")"));
    })()`);
    const koboldPlacements = frame.combatArt.filter(([, , id]) => id === "combat:CPIC2.DAX:0");
    assert.ok(koboldPlacements.some((placement) => placement[3]) && koboldPlacements.some((placement) => !placement[3]));
    await waitFor("the mirrored 4× combat sprite", () => run(`[...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:0"]')]
      .some(image => image.naturalWidth === 96 && image.style.transform === "scaleX(-1)")`));
    for (const width of [430, 1100]) {
      await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await waitFor(`kobold combat artwork aligned at ${width}px`, () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const screen = document.querySelector("#screen").getBoundingClientRect();
        const sprites = [...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:0"]')];
        const placements = ${JSON.stringify(koboldPlacements)};
        return sprites.length === placements.length && placements.every(([x, y, , reflected]) => sprites.some(image => {
          const rect = image.getBoundingClientRect();
          return image.naturalWidth === 96 && image.naturalHeight === 96 &&
            Math.abs(rect.left - screen.left - x * screen.width / 320) < 1 &&
            Math.abs(rect.top - screen.top - y * screen.height / 200) < 1 &&
            Math.abs(rect.width - 24 * screen.width / 320) < 1 &&
            Math.abs(rect.height - 24 * screen.height / 200) < 1 &&
            (image.style.transform === "scaleX(-1)") === reflected;
        }));
      })()`));
      await switchBothWays();
      await waitFor(`original menu colors at ${width}px`, menuColors);
    }
    await waitFor("Chrome to display the final combat frame", () => run(`state.ready && state.sequence === ${frame.sequence}`));
    assert.deepEqual(await run(`(() => {
      const live = state;
      const screen = document.querySelector("#screen");
      const layer = document.querySelector("#tile-art");
      try {
        state = { ...live };
        showScreen();
        layer.querySelector(".combat-sprite").dispatchEvent(new Event("error"));
        const restoresGuest = layer.hidden && document.querySelector("#game-text").hidden &&
          screen.getAttribute("src") === "data:image/png;base64," + live.frame;
        state = { ...live };
        showScreen();
        return { restoresGuest, resumesEnhancements: !layer.hidden &&
          Boolean(layer.querySelector(".combat-sprite")) };
      } finally {
        state = live;
        showScreen();
      }
    })()`), { restoresGuest: true, resumesEnhancements: true });
    await command("Input.dispatchKeyEvent", { type: "keyDown", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await command("Input.dispatchKeyEvent", { type: "keyUp", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await waitFor("the guest frame after Alt+Q", async () => {
      const state = await latest();
      return state.ready && state.sequence > frame.sequence;
    });
    assert.ok(cityTiles > 0, "The New Phlan entrance must render enhanced tiles");
    console.log(`Verified ${cityTiles} New Phlan tile placements and ${views} Slums views and state-preserving switches in exploration, journal, dialogue, and combat.`);
    const trace = resolve(directory, "slums-tiles.jsonl");
    writeFileSync(trace, routeTiles.map((tiles) => JSON.stringify(tiles)).join("\n") + "\n");
    console.log("Slums artwork trace:", trace);
  }
  if (battleFrame) console.log(`Battlefield artwork trace (${battleFrame} frames):`, battleTrace);
} finally {
  socket?.close();
  chrome.kill();
  server.kill();
}
