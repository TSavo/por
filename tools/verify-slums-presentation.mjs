import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [checkpoint, chromePath, routeName = "kobolds", option] = process.argv.slice(2);
const environmentRoutes = new Map([
  ["bane-sanctuary", {
    slot: "A", area: 24, views: 23, patterns: 69,
    walk: ["left", "up", "up", "left", "up", "left", "up", "up", "left", "up",
      "right", "up", "up", "right", "up", "right", "up", "up", "up", "up", "right", "up"],
  }],
  ["buccaneer-pens", {
    slot: "A", area: 1, views: 15, patterns: 49,
    walk: ["left", "left", ...Array(6).fill("up"), "right", "up", "up", "up", "right", "up"],
  }],
  ["swamp-ruins", {
    slot: "A", area: 16, views: 12, patterns: 51,
    walk: ["up", "right", "up", "up", "left", "up", "up", "left", "up", "right", "up"],
  }],
  ["pyramid-fountain-approach", {
    slot: "A", area: 23, views: 2, patterns: 19,
    walk: ["up", "right", "up", "enter"],
  }],
  ["pyramid-lower-corridors", {
    slot: "A", area: 23, views: 15, patterns: 35,
    walk: ["up", "right", "up", "up", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["pyramid-entrance", {
    slot: "A", area: 22, views: 20, patterns: 22,
    walk: [...Array(15).fill("up"), "enter", "right", "up", "enter", "right", "up"],
  }],
  ["zhentil-quarter", {
    slot: "A", area: 28, views: 7, patterns: 16,
    walk: ["up", "right", "up", "right", "up", "right", "up"],
  }],
  ["zhentil-yard", {
    slot: "A", area: 28, views: 16, patterns: 44,
    walk: ["right", "right", "up", "b", "left", "up", "b", "up", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["textile-approach", {
    slot: "B", views: 16, patterns: 135,
    walk: ["right", "right", "up", "up", "right", "up", "left", "up", "up", "right", ...Array(5).fill("up"), "left"],
  }],
  ["textile-wing", {
    slot: "J", views: 10, patterns: 82,
    walk: ["left", "up", "right", ...Array(4).fill("up"), "left", "up"],
  }],
  ["textile-temple", {
    slot: "I", views: 14, patterns: 75,
    walk: ["right", "right", "up", "b", "left", "up", "left", "up", "b", "right", "up", "b", "left", "up", "up", "left", "up", "enter", "enter"],
  }],
  ["graveyard-south", { slot: "A", area: 10, views: 4, patterns: 67, walk: ["right", "up", "up"] }],
  ["graveyard-east", { slot: "A", area: 10, views: 8, patterns: 81, walk: Array(7).fill("up") }],
  ["graveyard-north", { slot: "A", area: 10, views: 7, patterns: 68, walk: ["up", "up", "up", "left", "up", "right"] }],
  ["north-gate-rampart", {
    slot: "A", area: 14, views: 19, patterns: 41,
    walk: ["up", "left", ...Array(11).fill("up"), "left", "up", "right", "right", "up"],
  }],
  ["north-gate-quarter", {
    slot: "A", area: 14, views: 18, patterns: 22,
    walk: ["up", "right", "up", "up", "left", ...Array(5).fill("up"), "left", "up", "right", "up", "up", "left", "up"],
  }],
  ["north-gate-houses", {
    slot: "A", area: 14, views: 12, patterns: 49,
    walk: ["up", "left", ...Array(6).fill("up"), "right", "up", "b", "up", "up", "right", "up", "left", "up"],
  }],
  ["stojanow-gate", {
    slot: "A", area: 9, views: 10, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left"],
  }],
  ["stojanow-west", {
    slot: "A", area: 9, views: 13, patterns: 43,
    walk: ["up", "up", "up", "enter", "enter", "up", "left", "up", "up", "up", "right", "up", "up", "right"],
  }],
  ["stojanow-east", {
    slot: "A", area: 9, views: 10, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "up"],
  }],
]);
const routes = ["kobolds", "orcs", "goblins", "armorer", "fighter-trainer", "sokal-smithy", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard", "podal-plaza", "podal-infirmary", "podal-shrine", "podal-shrine-return", "bane-gate", "bane-goblins", "bane-symbol", "bane-altar", "kobold-cave", "textile-altar", "textile-ogre", ...environmentRoutes.keys(), "graveyard-mystic", "graveyard-vampire", "graveyard-wolves", "stojanow-briefing", "stojanow-trader", "stojanow-bugbears", "zhentil-envoy", "zhentil-escape", "zhentil-reward", "zhentil-return", "river-approach", "river-passage", "river-fountain", "river-pumping", "river-exit", "river-return", "river-reward", "yarash-combat", "swamp-approach", "swamp-elder", "swamp-elder-decline", "swamp-reward", "bivant-reward", "bane-reward", "buccaneer-approach", "assault-briefing", "castle-halls", "castle-dragon", "castle-ending"];
assert.ok(checkpoint && chromePath, `Usage: node tools/verify-slums-presentation.mjs <checkpoint> <Chrome executable> [${routes.join("|")}] [--terrain-only|--manual-party]`);
assert.ok(routes.includes(routeName), "Unknown presentation replay route");
const ending = routeName === "castle-ending";
const dragon = routeName === "castle-dragon";
const halls = routeName === "castle-halls";
const assault = routeName === "assault-briefing";
const mystic = routeName === "graveyard-mystic";
const vampire = routeName === "graveyard-vampire";
const wolves = routeName === "graveyard-wolves";
const envoy = routeName === "zhentil-envoy";
const envoyEscape = routeName === "zhentil-escape";
const councilReward = {
  "zhentil-reward": ["commission-zhentil", /CADORNAWASWAGERINGYOURRETURN/i],
  "river-reward": ["commission-river", /CLEARINGOFTHESTOJONOWRIVER/i],
  "swamp-reward": ["commission-lizardmen", /LIZARDMENMENACEHASGREATLYIMPROVED/i],
  "bivant-reward": ["commission-rescue", /BIVANTWASDELIGHTEDWITHTHECHILD.SRESCUE/i],
  "bane-reward": ["commission-bane", /YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE/i],
}[routeName];
const envoyReturn = routeName === "zhentil-return";
const riverApproach = routeName === "river-approach";
const riverPassage = routeName === "river-passage";
const riverFountain = routeName === "river-fountain";
const riverExit = routeName === "river-exit";
const riverReturn = routeName === "river-return";
const riverPumping = routeName === "river-pumping";
const stojanow = routeName === "stojanow-briefing";
const trader = routeName === "stojanow-trader";
const altar = routeName === "textile-altar";
const plaza = routeName === "podal-plaza";
const baneGate = routeName === "bane-gate";
const baneGoblins = routeName === "bane-goblins";
const baneSymbol = routeName === "bane-symbol";
const baneAltar = routeName === "bane-altar";
const koboldCave = routeName === "kobold-cave";
const infirmary = routeName === "podal-infirmary";
const shrine = routeName === "podal-shrine";
const shrineReturn = routeName === "podal-shrine-return";
const trainer = routeName === "fighter-trainer";
const environment = environmentRoutes.get(routeName);
const ogre = routeName === "textile-ogre";
const goblins = routeName === "goblins";
const smithy = routeName === "sokal-smithy";
const orcs = routeName === "orcs";
const armory = routeName === "sokal-armory";
const patrolCombat = routeName === "sokal-patrol-combat";
const courtyard = routeName === "sokal-courtyard";
const terrainOnly = option === "--terrain-only";
const manualParty = option === "--manual-party";
const repeatStampede = option === "--repeat-stampede" && routeName === "buccaneer-pens";
const classicPortrait = option === "--classic-portrait" && routeName === "buccaneer-approach";
assert.ok(!option || (courtyard && (terrainOnly || manualParty)) || repeatStampede || classicPortrait, "Option does not apply to this route");
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const slot = environment?.slot ?? (landing ? "J" : armory ? "D" : altar || plaza || infirmary || shrine || shrineReturn ? "I" : ogre ? "H" : dragon || halls || assault || mystic || stojanow || trader || koboldCave ? "B" : orcs || ending || smithy ? "C" : "A");
const boot = { A: "1e61", B: "3062", C: "2e63", D: "2064", H: "2368", I: "1769", J: "246a" }[slot];
const saved = resolve(directory, slot + ".json");
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
if (terrainOnly || classicPortrait) {
  const pack = resolve(directory, "test-art");
  mkdirSync(pack);
  const combined = { version: 1, assets: {}, encounters: {} };
  for (const source of ["upgrades/slums", "upgrades"]) {
    const manifest = JSON.parse(readFileSync(resolve(source, "manifest.json")));
    for (const [id, file] of Object.entries(manifest.assets)) {
      if ((terrainOnly && id.startsWith("combat:")) || (classicPortrait && id === "portrait:PIC6.DAX:39:0:0")) continue;
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
    POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:" + boot,
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
    const displayGeometry = () => run(`(() => {
      const display = document.querySelector("#screen");
      const { width, height } = display.getBoundingClientRect();
      return { width, height, native: [display.naturalWidth, display.naturalHeight] };
    })()`);
    const before = await latest();
    await run('document.querySelector("#presentation").click()');
    await waitFor("classic presentation", () => run('document.querySelector("#game-text").hidden && document.querySelector("#tile-art").hidden'));
    const classic = await displayGeometry();
    assert.deepEqual(classic.native, [320, 200]);
    assert.ok(Math.abs(classic.height - classic.width * 5 / 8) < 1, "Classic should render at 8:5");
    assert.deepEqual(await latest(), before);
    await run('window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }))');
    await waitFor("enhanced text", () => run('!document.querySelector("#game-text").hidden'));
    const enhanced = await displayGeometry();
    assert.ok(Math.abs(enhanced.height - enhanced.width * 3 / 4) < 1, "Enhanced should render at 4:3");
    assert.deepEqual(await latest(), before);
    assert.deepEqual(readFileSync(saved), originalSave);
  }

  await run('document.querySelector("#presentation").click()');
  async function verifyTiledView(area, patterns) {
    if (!frame.tileInventory?.length) return 0;
    const expected = frame.tileInventory.map(([x, y, id]) => [x, y, id]);
    assert.equal(expected.length, 121);
    assert.deepEqual(frame.tiles, expected);
    for (const [, , id] of expected) {
      assert.ok(id.startsWith(`tile:${area}:`), id);
      patterns.add(id);
    }
    await waitFor("121 individually anchored 4× tiles", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelectorAll("#tile-art img:not(.encounter-sprite)").length === 121 &&
      [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
    return 1;
  }

  if (environment) {
    const area = environment.area ?? 2;
    const actor = area === 10 ? "encounter:area:10:SPRIT4.DAX:34:0:0"
      : area === 9 ? "encounter:area:9:SPRIT2.DAX:63:0:0" : undefined;
    const patterns = new Set();
    let views = await verifyTiledView(area, patterns);
    for (const key of environment.walk) {
      const previousTiles = frame.tiles;
      await advance(key);
      if (actor && frame.encounter) assert.deepEqual(frame.tiles, previousTiles);
      views += await verifyTiledView(area, patterns);
    }
    if (routeName === "buccaneer-pens") {
      assert.equal(frame.perspective, true, "The animal-pen menu should keep the first-person picture");
      await waitFor("outer picture panel at the animal pens", () => run('Boolean(document.querySelector(".perspective-backdrop"))'));
      await waitFor("the Enhanced menu font", () => run(`[...document.fonts]
        .some(font => font.family.includes("Game Web Font") && font.status === "loaded")`));
      assert.ok(await run(`(() => {
        const glyphs = [...document.querySelectorAll("#game-text span")];
        const menu = glyphs.filter(glyph => parseFloat(glyph.style.top) >= 96)
          .sort((left, right) => parseFloat(left.style.left) - parseFloat(right.style.left));
        const twoColors = new Set(menu.map(glyph => getComputedStyle(glyph).color)).size >= 2;
        const context = document.createElement("canvas").getContext("2d");
        return menu.map(glyph => glyph.textContent).join("").includes("ReleaseanimalsLeave") &&
          twoColors && glyphs.every(glyph => {
            const style = getComputedStyle(glyph);
            context.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
            return style.textTransform === "none" &&
              context.measureText(glyph.textContent).width <= glyph.getBoundingClientRect().width;
          });
      })()`), "The larger web font should fit the original cells and keep menu shortcuts highlighted");
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "buccaneer-animal-pens.png"), Buffer.from(capture.data, "base64"));
      const hasLead = (id) => frame.journal?.leads.some((lead) => lead.id === id);
      await advance("j");
      assert.ok(hasLead("rescue-animal-pens"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /release them again if offered/);
      else assert.ok(!hasLead("rescue-stampede"));
      await advance("j");
      const pensScenery = frame.tiles;
      await advance("r");
      assert.equal(frame.perspective, true, "The release acknowledgement should retain the full scenery");
      assert.deepEqual(frame.tiles, pensScenery);
      await switchBothWays();
      for (const key of ["enter", "j"]) await advance(key);
      assert.ok(hasLead("rescue-stampede"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /while the guards are rounding up/);
      assert.ok(!hasLead("rescue-inside-pen"));
      await advance("j");
      for (const key of ["right", "right", "up", "left", ...Array(4).fill("up"),
        "left", "up"]) await advance(key);
      const approachTiles = frame.tiles;
      await advance("up");
      assert.equal(frame.perspective, true, "The locked-gate prompt should keep the first-person picture");
      assert.deepEqual(frame.tiles, approachTiles, "Opening the locked-gate prompt should keep the scenery tiles");
      await switchBothWays();
      await waitFor("outer picture panel at the locked gate", () => run('Boolean(document.querySelector(".perspective-backdrop"))'));
      for (const key of ["b", "enter", "j"]) await advance(key);
      assert.ok(hasLead("rescue-inside-pen"));
      assert.ok(!hasLead("rescue-heir-freed"));
      for (const key of ["j", "g", "j"]) await advance(key);
      assert.ok(hasLead("rescue-heir-freed"));
      await advance("j");
      for (const key of ["right", "up", "right", ...Array(6).fill("up"), "j"]) await advance(key);
      assert.ok(hasLead("rescue-escape-guards"));
      assert.ok(!hasLead("rescue-escape-alarm"));
      await advance("j");
    }
    assert.equal(views, environment.views);
    assert.equal(patterns.size, environment.patterns);
    if (actor) {
      assert.ok(frame.encounter, "The encounter actor must be drawn separately from the scenery");
      const [, , id, width, height] = frame.encounter;
      assert.equal(id, actor);
      await waitFor("the enhanced actor over the scenery", () => run(`state.sequence === ${frame.sequence} &&
        [...document.querySelectorAll(".encounter-sprite")].some(img =>
          img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === ${width * 4} && img.naturalHeight === ${height * 4})`));
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, routeName + ".png"), Buffer.from(capture.data, "base64"));
    }
    if (routeName === "textile-temple") {
      assert.equal(frame.portrait, "portrait:PIC4.DAX:9:0:0");
      await waitFor("Grishnak's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    }
    await switchBothWays();
    console.log(`Verified ${routeName}: ${views} views, ${patterns.size} tile patterns and state-preserving switches.`);
  } else if (koboldCave) {
    for (const key of ["down", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:27:0:0");
    const menu = frame.text.filter(([cell]) => cell >= 960).sort(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(menu, /Large.*Small.*Exit/i);
    await waitFor("the kobold cave fork illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "kobold-cave-fork.png"), Buffer.from(capture.data, "base64"));
    console.log("Verified the illustrated cave choice in Chrome.", directory);
  } else if (baneAltar) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.ok(knows("bane-temple-admitted") && !knows("bane-defiled-altar"));
    await advance("j");
    const altarPatterns = new Set();
    assert.equal(await verifyTiledView(24, altarPatterns), 1);
    for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
      await advance(key);
      assert.equal(await verifyTiledView(24, altarPatterns), 1);
    }
    assert.equal(altarPatterns.size, 44);
    await switchBothWays();
    const altar = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-decision.png"), Buffer.from(altar.data, "base64"));
    await advance("j");
    assert.ok(knows("bane-defiled-altar") && !knows("bane-altar-ambush"));
    assert.match(frame.journal.objective.nextStep, /Choose Destroy Altar/);
    for (const key of ["j", "d", "j"]) await advance(key);
    assert.ok(knows("bane-altar-ambush") && !knows("bane-cleric-dispatch"));
    assert.match(frame.journal.objective.nextStep, /Defeat the half-orc cleric/);
    assert.notEqual(frame.journal.leads.find(({ id }) => id === "commission-bane")?.status, "ready-to-report");
    for (const key of ["j", "enter", "enter", "enter", "enter", "q"]) await advance(key);
    const cleric = "combat:area:24:CPIC1.DAX:33";
    assert.ok(frame.combatArt.some(([, , id]) => id === cleric));
    await waitFor("the half-orc cleric in combat", () => run(`[...document.querySelectorAll(".combat-sprite")].some(img =>
      img.src.endsWith(${JSON.stringify(cleric)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`));
    await switchBothWays();
    const combat = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-combat.png"), Buffer.from(combat.data, "base64"));
    console.log("Verified the altar decision, journal guidance, and the cleric's Enhanced combat stance.");
  } else if (baneGate || baneGoblins || baneSymbol) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-bane");
    assert.equal(knows("bane-temple-symbol"), baneSymbol);
    assert.equal(knows("bane-temple-symbol-carried"), baneSymbol);
    assert.ok(!knows("bane-temple-guard-check"));
    await advance("j");
    const interiorPatterns = new Set();
    if (baneSymbol) {
      const patterns = new Set();
      let views = await verifyTiledView(24, patterns);
      for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
        await advance(key);
        views += await verifyTiledView(24, patterns);
      }
      assert.equal(views, 8);
      assert.equal(patterns.size, 49);
      const approach = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-temple-approach.png"), Buffer.from(approach.data, "base64"));
      const scenery = frame.tiles;
      await advance("enter");
      assert.deepEqual(frame.encounter, [48, 32, "encounter:area:24:SPRIT1.DAX:4:0:0", 40, 80]);
      assert.deepEqual(frame.tiles, scenery, "The guard must sit over the same gate scenery");
      await verifyTiledView(24, patterns);
      await waitFor("the gatekeeper in the approach view", () => run(`(() => {
        const image = document.querySelector(".encounter-sprite");
        return image?.naturalWidth === 160 && image?.naturalHeight === 320;
      })()`));
      await switchBothWays();
      const encounter = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-gatekeeper-approach.png"), Buffer.from(encounter.data, "base64"));
      await advance("enter");
    } else if (baneGoblins) {
      assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      }
      const corridor = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-interior-corridor.png"), Buffer.from(corridor.data, "base64"));
      for (const key of ["enter", "enter"]) await advance(key);
    } else {
      for (const key of ["up", "enter", "enter"]) await advance(key);
    }
    if (baneGoblins) {
      assert.equal(frame.portrait, "portrait:area:31:PIC1.DAX:2:0:0");
      await waitFor("the captive goblins illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-captive-goblins.png"), Buffer.from(capture.data, "base64"));
    } else if (baneGate || baneSymbol) {
      assert.equal(frame.portrait, "portrait:area:24:PIC1.DAX:4:0:0");
      await waitFor("the temple gatekeeper portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-temple-gate.png"), Buffer.from(capture.data, "base64"));
    }
    await advance("j");
    assert.equal(knows("bane-temple-symbol"), baneSymbol);
    if (baneGate || baneSymbol) {
      assert.ok(knows("bane-temple-guard-check"));
      assert.match(frame.journal.objective.nextStep, baneSymbol ? /Let Him Touch You/ : /let the blind guard check/i);
    }
    for (const key of ["j", "l", "j"]) await advance(key);
    if (baneGate) {
      assert.ok(knows("bane-temple-guards-hostile"));
      assert.ok(!knows("bane-temple-symbol") && !knows("bane-temple-admitted"));
      assert.match(frame.journal.objective.nextStep, /get past the temple guards/i);
    } else if (baneSymbol) {
      assert.ok(knows("bane-temple-admitted"));
      assert.ok(!knows("bane-temple-guards-hostile") && !knows("bane-temple-symbol-carried"));
      assert.match(frame.journal.objective.nextStep, /continue into the Temple of Bane/i);
    } else {
      assert.ok(knows("bane-temple-symbol"));
      assert.match(frame.journal.objective.nextStep, /bring a holy symbol of bane/i);
      await advance("j");
      assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      for (const key of ["right", "right", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      }
      assert.equal(interiorPatterns.size, 25);
    }
    console.log(`Verified witnessed Temple of Bane guidance on the ${routeName} route.`);
  } else if (shrineReturn) {
    const meeting = () => frame.journal?.leads.find(({ id }) => id === "podal-shrine-meeting");
    await advance("j");
    assert.equal(meeting()?.status, "accepted");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "podal-shrine-ambush"));
    for (const key of ["j", "up", "enter", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-shrine-ambush"));
    assert.equal(meeting()?.status, "turned-in");
    assert.doesNotMatch(frame.journal.objective.nextStep, /return to the bane shrine/i);
    console.log("Verified the delayed shrine meeting and journal closure after reload.");
  } else if (shrine) {
    await advance("j");
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-bane-temple-location"));
    await advance("j");
    for (const key of ["up", "up", "enter", "enter", "g"]) await advance(key);
    const prompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(prompt, /GREETINGSFROMBANE/i);
    assert.equal(frame.portrait, "portrait:area:18:PIC1.DAX:4:0:0");
    await waitFor("the shrine recruiter portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    const screenshot = resolve(directory, "podal-shrine.png");
    writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-bane-temple-location"));
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-shrine-meeting" || id === "podal-shrine-ambush"));
    for (const key of ["j", "y", "j"]) await advance(key);
    const meeting = frame.journal?.leads.find(({ id }) => id === "podal-shrine-meeting");
    assert.match(meeting?.detail ?? "", /return .* in two hours/i);
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-shrine-declined" || id === "podal-shrine-ambush"));
    console.log("Verified the shrine recruiter portrait and mode switches in Chrome.", screenshot);
  } else if (infirmary) {
    for (const key of ["up", "enter"]) await advance(key);
    const prompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(prompt, /AREYOUINNEEDOFHEALING/i);
    assert.equal(frame.portrait, "portrait:HEAD1.DAX:48:BODY1.DAX:25");
    await waitFor("the infirmary portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    const screenshot = resolve(directory, "podal-infirmary.png");
    writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-ilmater-infirmary"));
    await advance("j");
    await advance("n");
    assert.equal(frame.portrait, undefined);
    console.log("Verified the infirmary portrait, mode switches, and dialogue exit in Chrome.", screenshot);
  } else if (plaza) {
    let views = 0;
    const patterns = new Set();
    const route = [
      "right", "right", ...Array(7).fill("up"), "right", "up", "up", "enter",
      "enter", "enter", "enter", "enter", "end", "enter", "enter",
    ];
    for (const key of route) {
      await advance(key);
      views += await verifyTiledView(18, patterns);
    }
    assert.equal(views, 12);
    assert.equal(patterns.size, 48);
    assert.equal(frame.portrait, "portrait:PIC1.DAX:16:0:0");
    await waitFor("the auctioneer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified 48 Podal Plaza tiles across 12 views and the auctioneer portrait in Chrome.");
  } else if (smithy) {
    const route = ["up", "up", "up", "right", "up", "up", "up", "b", "y", "up", "left", "up", "right", "up", "left", "w", "enter"];
    for (const key of route) await advance(key);
    const crouch = "combat:CPIC4.DAX:37";
    const lunge = "combat:CPIC4.DAX:165";
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    assert.ok(frame.combatArt.some(([, , id]) => id === crouch));
    await waitFor("the crouching frog", () => displayed(crouch));
    await switchBothWays();
    const lunged = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === lunge));
    for (let turn = 0; turn < 6 && !lunged(); turn++) await advance("q");
    assert.ok(lunged());
    await waitFor("the lunging frog", () => displayed(lunge));
    console.log("Verified the enhanced poison frog crouch and attack in Sokal Keep.");
  } else if (goblins) {
    const route = [
      "right", "right", "up", "right", "up", "right", ...Array(4).fill("up"),
      "right", "up", "b", "enter", "enter", "enter", "enter", "enter",
    ];
    for (const key of route) await advance(key);
    const guard = "combat:area:20:CPIC2.DAX:2";
    const leader = "combat:area:20:CPIC2.DAX:3";
    const strike = "combat:area:20:CPIC2.DAX:130";
    const present = id => frame.combatArt.some(placement => placement[2] === id);
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    assert.ok(present(guard));
    await waitFor("the goblin infantry sprite", () => displayed(guard));
    for (let turn = 0; turn < 8 && !present(leader); turn++) await advance("q");
    assert.ok(present(leader));
    await waitFor("the goblin veteran sprite", () => displayed(leader));
    await switchBothWays();
    const swung = () => frame.animation?.some(shot => shot.combatArt?.some(placement => placement[2] === strike));
    for (let turn = 0; turn < 14 && !swung(); turn++) await advance("q");
    assert.ok(swung(), "The infantry strike must appear in a guest animation");
    await waitFor("the goblin infantry strike sprite", () => displayed(strike));
    console.log("Verified the goblin infantry and veteran sprites and infantry strike in the Slums.");
  } else if (trainer) {
    const arenaRoute = [
      "right", "right", "up", "up", "right", "up", "up", "enter", "enter", "up", "up",
      "right", "up", "up", "up", "up", "enter", "enter", "up", "up", "enter", "enter",
    ];
    for (const key of arenaRoute) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:9:BODY3.DAX:1");
    await waitFor("the arena master portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["n", "n", "up", "enter", "enter", "left", "up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:1");
    await waitFor("the fighter trainer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the arena master and fighter trainer portraits with state-preserving mode switches.");
  } else if (ogre) {
    const idle = "combat:area:2:CPIC2.DAX:8";
    const attack = "combat:area:2:CPIC2.DAX:136";
    const route = ["enter", "right", "right", "up", "right", "up", "left", "up", "b", "right", "up", "b",
      ...Array(5).fill("up"), "right", "up", "left", "up", "up", "enter", "s", "up", "enter", ...Array(5).fill("enter")];
    for (const key of route) await advance(key);
    const standing = () => frame.combatArt.find(([, , id]) => id === idle);
    for (let turn = 0; turn < 8 && !standing(); turn++) await advance("q");
    assert.deepEqual(standing()?.slice(5), [24, 48]);
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")].some(img => img.src.endsWith(${JSON.stringify(id)}) &&
      img.naturalWidth === 96 && img.naturalHeight === 192 &&
      parseFloat(img.style.width) === 7.5 && parseFloat(img.style.height) === 24)`);
    await waitFor("the rectangular ogre standing sprite", () => displayed(idle));
    await switchBothWays();
    const swung = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 70 && !swung(); turn++) await advance("q");
    assert.ok(swung());
    await waitFor("the rectangular ogre attack sprite", () => displayed(attack));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified 96×192 standing and attack sprites in the Textile House ogre fight.");
  } else if (altar) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC4.DAX:9:0:0");
    await waitFor("the altar portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "enter"]) await advance(key);
    const captain = "combat:CPIC2.DAX:7";
    const priestess = "combat:area:2:CPIC2.DAX:2";
    const strike = "combat:CPIC2.DAX:135";
    const positions = () => frame.combatArt.filter(([, , id]) => id === captain).map(([x, y]) => `${x},${y}`).sort();
    const initialPositions = positions();
    assert.ok(initialPositions.length >= 2);
    let moved = false;
    let priestessSelected = false;
    let swing = false;
    for (let turn = 0; turn < 250 && !(moved && priestessSelected && swing); turn++) {
      await advance("q");
      moved ||= positions().length >= 2 && initialPositions.join(";") !== positions().join(";");
      if (!swing && frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === strike))) {
        await waitFor("the captain swing in Chrome", () => run(`[...document.querySelectorAll(".combat-sprite")]
          .some(img => img.src.endsWith("CPIC2.DAX:135") && img.naturalWidth === 96)`));
        swing = true;
      }
      if (!priestessSelected && frame.combatArt.some(([, , id, , selected]) => id === priestess && selected)) {
        await waitFor("the selected priestess in Chrome", () => run(`state.sequence === ${frame.sequence} && !animationFrame &&
          [...document.querySelectorAll(".combat-sprite")].some(img => img.src.endsWith("CPIC2.DAX:2") && img.naturalWidth === 96)`));
        await switchBothWays();
        priestessSelected = true;
      }
    }
    assert.deepEqual({ moved, priestessSelected, swing }, { moved: true, priestessSelected: true, swing: true });
    console.log("Verified the Textile House altar portrait, selected priestess, moving captains, and captain strike.");
  } else if (routeName === "armorer") {
    const route = ["right", "right", "up", "up", "up", "enter", "right", ...Array(7).fill("up"), "left", ...Array(5).fill("up"), "enter"];
    for (const key of route) await advance(key);
    const portrait = "portrait:HEAD3.DAX:42:BODY3.DAX:9";
    assert.equal(frame.portrait, portrait);
    await waitFor("the New Phlan armorer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("y");
    assert.equal(frame.portrait, portrait);
    await waitFor("the armorer in the shop menu", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    console.log("Verified the armorer portrait in dialogue and the shop menu.");
  } else if (routeName === "stojanow-bugbears") {
    const route = ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left", "up", "a", "enter", "enter"];
    for (const key of route) await advance(key);
    const standing = "combat:area:9:CPIC2.DAX:63";
    const attack = "combat:area:9:CPIC2.DAX:191";
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")].filter(img =>
      img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96).length`);
    assert.ok(frame.combatArt.some(([, , id, , selected]) => id === standing && selected));
    await waitFor("the bugbear guards", async () => await displayed(standing) >= 5);
    await switchBothWays();
    await advance("enter");
    const swung = () => frame.animation?.some(shot => shot.combatArt.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 4 && !swung(); turn++) await advance("q");
    assert.ok(swung());
    await waitFor("the bugbear sword strike", () => displayed(attack));
    console.log("Verified the bugbear guards and their sword strike in Stojanow Gate.");
  } else if (trader) {
    for (const key of ["up", "enter", "enter", "p"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD2.DAX:5:BODY2.DAX:9");
    await waitFor("the wagon trader portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the wagon trader portrait and state-preserving switches.");
  } else if (stojanow) {
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:7");
    await waitFor("Urslingen's Stojanow Gate briefing portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified Urslingen's Stojanow Gate briefing portrait and state-preserving switches.");
  } else if (routeName === "swamp-elder" || routeName === "swamp-elder-decline") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    const terrain = new Set();
    for (const key of ["up", "b"]) await advance(key);
    assert.deepEqual(frame.encounter, [48, 32, "encounter:area:16:SPRIT8.DAX:57:0:0", 48, 80]);
    assert.equal(await verifyTiledView(16, terrain), 1);
    await waitFor("the enhanced swamp elder", () => run(`(() => {
      const image = document.querySelector(".encounter-sprite");
      return image?.naturalWidth === 192 && image?.naturalHeight === 320;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("swamp-peaceful-elder") && !knows("swamp-friend-word"));
    assert.match(frame.journal.objective.nextStep, /Parlay with the elder/);
    for (const key of ["j", "p"]) await advance(key);
    assert.equal(await verifyTiledView(16, terrain), 1);
    await waitFor("the elder above the Parlay terrain", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "swamp-elder-parlay.png"), Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(knows("swamp-friend-word") && !knows("swamp-elder-story"));
    assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
    for (const key of ["j", "enter", ..."savior", "enter", "y", "j"]) await advance(key);
    assert.ok(knows("swamp-elder-story") && knows("journal-entry-31"));
    assert.ok(!knows("swamp-champion-requested"));
    for (const key of ["j", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("swamp-champion-requested") && !knows("swamp-alliance-averted"));
    assert.match(frame.journal.objective.nextStep, /choose a party member/);
    if (routeName === "swamp-elder-decline") {
      for (const key of ["j", "n", "j"]) await advance(key);
      assert.ok(knows("swamp-challenge-hostile") && !knows("swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /peaceful meeting ended/);
    } else {
      for (const key of ["j", "y"]) await advance(key);
      const selectionPrompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(selectionPrompt, /WHOWILLBEMYCHAMPION/i);
      await advance("j");
      assert.ok(knows("swamp-champion-requested") && !knows("swamp-challenge-hostile"));
      for (const key of ["j", "down", "s", "enter"]) await advance(key);
      const battleMenu = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(battleMenu, /ALDAHITPOINTS\d+AC\d+.*MOVEVIEWAIMUSEQUICKDONE/i);
      await switchBothWays();
      const standing = "combat:area:16:CPIC8.DAX:57";
      const strike = "combat:area:16:CPIC8.DAX:185";
      await advance("enter");
      assert.ok(frame.combatArt.some(([, , id]) => id === standing));
      const loaded = (id) => run(`[...document.querySelectorAll(".combat-sprite")].some(image =>
        image.src.endsWith(${JSON.stringify(id)}) && image.naturalWidth === 96 && image.naturalHeight === 96)`);
      await waitFor("the swamp lizardfolk stance", () => loaded(standing));
      const duel = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "swamp-duel.png"), Buffer.from(duel.data, "base64"));
      const struck = () => frame.animation?.some((shot) => shot.combatArt?.some(([, , id]) => id === strike));
      for (let action = 0; action < 5 && !struck(); action++) await advance("q");
      assert.ok(struck(), "The lizardfolk strike should appear in the original duel");
      await waitFor("the swamp lizardfolk strike", () => loaded(strike));
    }
    console.log("Verified the swamp elder's layered terrain and journal updates in Chrome. Capture:", directory);
  } else if (routeName === "buccaneer-approach") {
    const base = "rescue-buccaneer-base";
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-rescue");
    assert.ok(!frame.journal.leads.some(({ id }) => id === base));
    for (const key of ["j", "down", "enter"]) await advance(key);
    if (classicPortrait) {
      assert.equal(frame.classicPortrait, true);
      assert.equal(frame.portrait, undefined);
      await waitFor("classic portrait filling the Enhanced panel", () => run(`(() => {
        const layer = document.querySelector("#tile-art").getBoundingClientRect();
        const portrait = document.querySelector(".perspective-backdrop")?.getBoundingClientRect();
        return portrait && Math.abs(portrait.width - layer.width * 120 / 320) < 1 &&
          Math.abs(portrait.height - layer.height * 120 / 200) < 1;
      })()`));
    } else {
      assert.equal(frame.portrait, "portrait:PIC6.DAX:39:0:0");
      await waitFor("the mounted escort illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    }
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === base));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Enter the Buccaneer Base/);
    for (const key of ["j", "e", "e"]) await advance(key);
    const entrance = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(entrance, /8,10S/i);
    for (const key of ["right", "up", "right", "up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC6.DAX:42:0:0");
    await waitFor("the Bivant pen illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Choose Rescue Boy/);
    for (const key of ["j", "enter", "enter", "end", "end", "end", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-pen-options"));
    assert.match(frame.journal.objective.nextStep, /Choose Sneak Into Pen/);
    for (const key of ["j", "enter", "enter", "j"]) await advance(key);
    assert.match(frame.journal.objective.nextStep, /Try to Sneak By/);
    for (const key of ["j", "t", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-sneak-blocked"));
    assert.match(frame.journal.objective.nextStep, /Attack Guards or Leave/);
    console.log("Verified the Buccaneer Base approach and rescue journal in Chrome.");
  } else if (routeName === "swamp-approach") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-lizardmen");
    assert.ok(!knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    for (const key of ["j", ...Array(11).fill("right"), "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:24:0:0");
    await waitFor("the enhanced swamp drawbridge", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    assert.match(frame.journal.objective.nextStep, /cross the drawbridge/);
    for (const key of ["j", "e", "enter", "j"]) await advance(key);
    assert.ok(knows("swamp-anti-magic") && !knows("swamp-peaceful-elder"));
    assert.match(frame.journal.objective.nextStep, /anti-magic shell/);
    for (const key of ["j", "enter", "up", "e", "s", "s", "a"]) await advance(key);
    const entered = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(entered.leads.some(({ id }) => id === "swamp-anti-magic"));
    console.log("Verified the swamp drawbridge and anti-magic shell in Chrome. Saved:", saved);
  } else if (routeName === "yarash-combat") {
    const mage = "combat:area:23:CPIC7.DAX:14";
    const guard = "combat:area:23:CPIC7.DAX:57";
    const strike = "combat:area:23:CPIC7.DAX:185";
    const visible = (id) => run(`[...document.querySelectorAll(".combat-sprite")].filter(image =>
      image.src.endsWith(${JSON.stringify(id)}) && image.naturalWidth === 96 && image.naturalHeight === 96).length`);
    for (const key of ["up", "up", "b", "up", "enter", "f", "enter"]) await advance(key);
    assert.ok(frame.combatArt.some(([, , id, , selected]) => id === mage && selected));
    await waitFor("Yarash and his guards", async () => await visible(mage) === 1 && await visible(guard) >= 3);
    await switchBothWays();
    await waitFor("the enhanced combat sprites", async () => await visible(mage) === 1 && await visible(guard) >= 3);
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "yarash-combat.png"), Buffer.from(capture.data, "base64"));
    await advance("enter");
    const swung = () => frame.animation?.some((shot) => shot.combatArt?.some(([, , id]) => id === strike));
    for (let turn = 0; turn < 20 && !swung(); turn++) await advance("q");
    assert.ok(swung(), "A mutant guard must strike during the replay");
    await waitFor("the mutant guard strike", () => visible(strike));
    console.log("Verified the Yarash combat sprites and guard strike in Chrome. Capture:", directory);
  } else if (riverPumping) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    for (const key of ["up", "j"]) await advance(key);
    assert.ok(knows("river-pump-prisoners") && !knows("river-pump-prisoners-freed"));
    assert.match(frame.journal.objective.nextStep, /Advance until Parlay appears/);
    for (const key of ["j", "enter", "enter", "enter", "a", "a", "p", "n", "j"]) await advance(key);
    assert.ok(knows("river-pump-prisoners-freed") && knows("journal-entry-35"));
    assert.ok(!knows("river-pump-prisoners-hostile"));
    assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
    console.log("Verified the pumping-room parlay and its journal clues in Chrome.");
  } else if (riverExit) {
    const knowsRecovery = () => frame.journal?.leads.some(({ id }) => id === "river-recovery");
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-equipment-destroyed"));
    assert.equal(knowsRecovery(), false);
    for (const key of ["j", "right", "right", "up", "enter", "j"]) await advance(key);
    assert.ok(knowsRecovery());
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "enter", "enter", "g", "enter", "e", "s", "s", "a"]) await advance(key);
    const exited = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(exited.leads.some(({ id }) => id === "river-recovery"));
    console.log("Verified the original pyramid exit and saved the witnessed river recovery. Saved:", saved);
  } else if (riverFountain) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.ok(!knows("river-fountain") && !knows("river-equipment-destroyed"));
    for (const key of ["j", "up", "b"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC7.DAX:45:0:0");
    await waitFor("the fountain illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("river-fountain") && !knows("river-equipment-destroyed"));
    assert.match(frame.journal.objective.nextStep, /Destroy the Equipment/);
    for (const key of ["j", "enter", "enter", "d", "j"]) await advance(key);
    assert.ok(knows("river-equipment-destroyed") && !knows("river-recovery"));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    const completed = JSON.parse(readFileSync(saved, "utf8"));
    assert.equal(completed.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.ok(completed.leads.some(({ id }) => id === "river-equipment-destroyed"));
    console.log("Verified the river fountain discovery and machinery shutdown in Chrome. Saved:", saved);
  } else if (riverPassage) {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.match(frame.journal.objective.nextStep, /Explore the passage ahead/);
    const halls = () => frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    for (const key of ["j", ...Array(15).fill("up")]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDINFRONTOFYOU/i);
    for (const key of ["enter", "right", "up"]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDTOYOURLEFT/i);
    for (const key of ["enter", "right", "up", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-entrance-inside"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "river-fountain"));
    console.log("Verified the reloaded pyramid entrance and the first two hidden doors in Chrome.");
  } else if (riverApproach) {
    const boat = "river-rowboat";
    const door = "river-secret-door";
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.ok(!knows(boat) && !knows(door));
    for (const key of ["j", "down", "j"]) await advance(key);
    assert.ok(knows(boat) && !knows(door));
    assert.match(frame.journal.objective.nextStep, /Take the rowboat/);
    for (const key of ["j", "y", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC7.DAX:36:0:0");
    await waitFor("the pyramid exterior illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows(door) && !knows("river-fountain"));
    assert.match(frame.journal.objective.nextStep, /through the secret door/);
    for (const key of ["j", "e", "enter", "enter"]) await advance(key);
    await waitFor("the pyramid entrance view", () => run(`state.sequence === ${frame.sequence}`));
    const screenshot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "pyramid-entrance.png"), Buffer.from(screenshot.data, "base64"));
    await advance("j");
    assert.ok(knows("river-entrance-inside") && !knows("river-fountain"));
    assert.match(frame.journal.objective.nextStep, /Explore the passage ahead/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    assert.ok(JSON.parse(readFileSync(saved, "utf8")).leads.some(({ id }) => id === "river-entrance-inside"));
    console.log("Verified the river rowboat and secret entrance in Chrome. Saved:", saved);
  } else if (envoyReturn || riverReturn) {
    const commission = riverReturn ? "commission-river" : "commission-zhentil";
    const discovery = riverReturn ? "river-recovery" : "zhentil-envoy-left";
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    assert.ok(frame.journal.leads.some(({ id }) => id === discovery));
    const toLanding = riverReturn
      ? ["right", "right", "right", ...Array(15).fill("down"), "left", "left"]
      : [...Array(5).fill("up"), ...Array(18).fill("right"), "down", "down"];
    for (const key of ["j", ...toLanding, "enter",
      "t", "enter", "enter", "enter", ...Array(4).fill("up"),
      "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
      "left", "up", "up", "left", "up", "left", "up", "up", "enter", "j"]) await advance(key);
    assert.equal(journalStatus(), "ready-to-report");
    // This checkpoint still has its earlier Podal Plaza reward to collect.
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(journalStatus(), "reward-pending");
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(journalStatus(), "turned-in");
    console.log(`Verified ${commission} after reload, the return boat, and council turn-in in Chrome.`);
  } else if (councilReward) {
    const [commission, originalDialogue] = councilReward;
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    if (routeName === "swamp-reward") {
      assert.ok(frame.journal.leads.some(({ id }) => id === "swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /elder's pledge/);
    }
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /journal entry 25/);
    for (const key of ["j", "right", "right", "up", "right", "right", "up", "enter", "enter", "j"]) await advance(key);
    assert.equal(journalStatus(), "reward-pending");
    const clerkDialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(clerkDialogue, originalDialogue);
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /keep the temple treasure.*Press Enter/);
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    if (routeName === "bivant-reward") {
      assert.equal(journalStatus(), "reward-pending");
      for (const key of ["j", "y", "t"]) await advance(key);
      const loot = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(loot, /Two-HandedSword.*ClericalScroll/i);
      for (const key of [...Array(5).fill("t"), "e", "e", "j"]) await advance(key);
    }
    assert.equal(journalStatus(), "turned-in");
    if (routeName === "bane-reward") {
      assert.match(frame.journal.leads.find(({ id }) => id === commission).detail, /keep what it found/);
      for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpoint.leads.find(({ id }) => id === commission)?.status, "turned-in");
    }
    if (routeName === "bivant-reward") {
      for (const key of ["j", "enter", "e", "s", "s", "a"]) await advance(key);
      const checkpointAfterReward = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpointAfterReward.leads.find(({ id }) => id === commission)?.status, "turned-in");
    }
    console.log(`Verified that ${commission} is turned in only after the council reward menu closes.`);
  } else if (envoyEscape) {
    for (const key of ["right", "right", "up", "left", "up", "up", "right", "up", "up", "up", "left",
      "up", "up", "up", "up", "up"]) await advance(key);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "zhentil-climbable-wall"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "zhentil-envoy-left"));
    const commission = "commission-zhentil";
    await waitFor("the Zhentil track button", () => run(`Boolean(document.querySelector('[data-lead-id="${commission}"]'))`));
    await run(`document.querySelector('[data-lead-id="${commission}"]').click()`);
    frame = await waitFor("the tracked Zhentil commission", async () => {
      const next = await latest();
      return next.ready && next.journal?.trackedId === commission && next;
    });
    assert.match(frame.journal.objective.nextStep, /Climb Over Wall/);
    for (const key of ["j", "c", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "zhentil-envoy-left"));
    assert.equal(frame.journal.leads.find(({ id }) => id === commission)?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    const checkpointAfterEscape = JSON.parse(readFileSync(saved, "utf8"));
    assert.equal(checkpointAfterEscape.leads.find(({ id }) => id === commission)?.status, "ready-to-report");
    assert.ok(checkpointAfterEscape.leads.some(({ id }) => id === "zhentil-envoy-left"));
    console.log("Verified the Zhentil wall escape and the resulting council report objective in Chrome. Saved:", saved);
  } else if (envoy) {
    const checkJournal = async (present, hidden) => {
      await advance("j");
      assert.ok(frame.journal, "The journal should open during the envoy route");
      const hasLead = (id) => frame.journal.leads.some((lead) => lead.id === `zhentil-${id}`);
      for (const id of present) assert.ok(hasLead(id), `Missing Zhentil discovery ${id}`);
      for (const id of hidden) assert.ok(!hasLead(id), `Revealed Zhentil discovery early: ${id}`);
      await advance("j");
    };
    await checkJournal([], ["envoy-challenge", "packet-delivered", "quarters"]);
    for (const key of ["down", "enter"]) await advance(key);
    await checkJournal(["envoy-challenge"], ["packet-delivered", "quarters"]);
    await advance("y");
    for (let line = 0; line < 6; line++) await advance("enter");
    assert.equal(frame.portrait, "portrait:PIC6.DAX:50:0:0");
    await waitFor("the Zhentil commandant portrait", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    assert.ok(await run(`(() => {
      const layer = document.querySelector("#tile-art").getBoundingClientRect();
      const portrait = document.querySelector(".encounter-portrait").getBoundingClientRect();
      return Math.abs(portrait.left - layer.left - layer.width * 8 / 320) < 1 &&
        Math.abs(portrait.top - layer.top - layer.height * 8 / 200) < 1 &&
        Math.abs(portrait.width - layer.width * 120 / 320) < 1 &&
        Math.abs(portrait.height - layer.height * 120 / 200) < 1;
    })()`), "Enhanced portrait should fill the outer picture panel");
    await switchBothWays();
    await checkJournal(["envoy-challenge", "packet-delivered"], ["quarters"]);
    for (let line = 0; line < 6; line++) await advance("enter");
    await checkJournal(["envoy-challenge", "packet-delivered", "quarters"], ["quarters-attacked", "envoy-left"]);
    await switchBothWays();
    for (const key of ["up", "right", "up", "right", "up", "right", "up"]) await advance(key);
    await checkJournal(["relax"], ["dinner", "night", "quarters-attacked"]);
    for (const key of ["r", "enter"]) await advance(key);
    await checkJournal(["dinner"], ["night", "quarters-attacked"]);
    for (const key of ["enter", "n", "s"]) await advance(key);
    await checkJournal(["night"], ["quarters-attacked"]);
    await advance("enter");
    await checkJournal(["quarters-attacked"], ["climbable-wall", "envoy-left"]);
    console.log("Verified the Zhentil patrol, delivery, dinner, and quarters ambush journal discoveries in Chrome.");
  } else if (wolves) {
    const standing = "combat:area:10:CPIC4.DAX:106";
    const attack = "combat:area:10:CPIC4.DAX:234";
    await run(`window.wolfBiteLoaded = false;
      new MutationObserver(() => {
        for (const image of document.querySelectorAll(".combat-sprite")) {
          if (!image.src.endsWith(${JSON.stringify(attack)})) continue;
          const record = () => {
            if (image.naturalWidth === 192 && image.naturalHeight === 96) window.wolfBiteLoaded = true;
          };
          record();
          image.addEventListener("load", record, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });`);
    for (const key of ["up", "enter", "y", "enter", "enter", "enter", "q", "q", "q"]) await advance(key);
    const hasFootprint = (placement, id) => placement[2] === id && placement[5] === 48 && placement[6] === 24;
    assert.ok(frame.combatArt.filter((placement) => hasFootprint(placement, standing)).length >= 2);
    assert.ok(frame.animation?.some((shot) => shot.combatArt?.some((placement) => hasFootprint(placement, attack))));
    await waitFor("the wolf bite sprite", () => run("window.wolfBiteLoaded"));
    await waitFor("two standing wolves", () => run(`!animationFrame &&
      [...document.querySelectorAll(".combat-sprite")].filter(image =>
        image.src.endsWith(${JSON.stringify(standing)}) && image.naturalWidth === 192 && image.naturalHeight === 96).length >= 2`));
    await switchBothWays();
    console.log("Verified the Valhingen wolf stance and bite in live Chrome combat.");
  } else if (vampire) {
    const stairs = "graveyard-vampire-stairs";
    await advance("j");
    assert.ok(frame.journal);
    assert.ok(!frame.journal.leads.some(({ id }) => id === stairs));
    for (const key of ["j", "up", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === stairs));
    for (const key of ["j", "y", "enter"]) await advance(key);
    const encounter = "encounter:area:10:SPRIT4.DAX:23:0:0";
    assert.deepEqual(frame.encounter, [56, 32, encounter, 32, 80]);
    await waitFor("the vampire at the crypt threshold", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:PIC4.DAX:23:0:0");
    await waitFor("the vampire dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "q", "q"]) await advance(key);
    const standing = "combat:area:10:CPIC4.DAX:23";
    assert.ok(frame.combatArt.some(([, , id]) => id === standing));
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    await waitFor("the vampire combat sprite", () => displayed(standing));
    await switchBothWays();
    const attack = "combat:area:10:CPIC4.DAX:151";
    const struck = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 15 && !struck(); turn++) await advance("q");
    assert.ok(struck(), "The vampire strike must occur during the replay");
    await waitFor("the vampire strike sprite", () => displayed(attack));
    console.log("Verified the Valhingen vampire in approach, dialogue, stance, and strike.");
  } else if (mystic) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD4.DAX:0:BODY4.DAX:2");
    await waitFor("the Valhingen mystic portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Valhingen mystic portrait and state-preserving switches.");
  } else if (assault) {
    const route = ["left", "left", "up", "right", "right", "up", "enter", "enter", "enter", "enter",
      "s", "e", "n", "enter", "enter", "enter", "enter", "right", "up", "left", "up", "right", "up", "enter"];
    for (const key of route.slice(0, 15)) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:57:BODY3.DAX:1");
    await waitFor("the council escort portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of route.slice(15)) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:2");
    await waitFor("Ulrich's assault briefing portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified Ulrich's assault briefing portrait and state-preserving switches.");
  } else if (dragon || halls) {
    const route = halls ? ["up", "up", ...Array(3).fill("enter")] : ["right", ...Array(4).fill("up"), ...Array(3).fill("enter")];
    const patterns = new Set();
    let views = await verifyTiledView(20, patterns);
    for (const key of route) {
      await advance(key);
      views += await verifyTiledView(20, patterns);
    }
    assert.equal(views, halls ? 2 : 3);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:66:0:0");
    await waitFor("the dragon dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    if (halls) {
      console.log("Verified enhanced Valjevo hall views and the dragon dialogue.");
    } else {
      for (const key of ["enter", "enter", ...Array(6).fill("a"), "enter", "enter", "q"]) await advance(key);
      const sprite = frame.combatArt.find(([, , id]) => id === "combat:CPIC5.DAX:66");
      assert.ok(sprite);
      const [x, y, , reflected, highlighted, width, height] = sprite;
      assert.equal(highlighted, true);
      assert.equal(width, 48);
      assert.equal(height, 48);
      await waitFor("the selected 4× dragon sprite", () => run(`(() => {
        const img = [...document.querySelectorAll(".combat-sprite")].find(img => img.src.endsWith("CPIC5.DAX:66"));
        return state.sequence === ${frame.sequence} && img?.naturalWidth === 192 && img.naturalHeight === 192 &&
          parseFloat(img.style.left) === ${x / 3.2} && parseFloat(img.style.top) === ${y / 2} &&
          parseFloat(img.style.width) === 15 && parseFloat(img.style.height) === 24 &&
          img.style.transform === ${JSON.stringify(reflected ? "scaleX(-1)" : "")};
      })()`));
      await switchBothWays();
      console.log("Verified the castle dragon in dialogue and selected combat, with state-preserving mode switches.");
    }
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
