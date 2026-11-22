// npm run verify:port-parity
//
// The shipped game runs from the port's own data in game/, which holds no original pixels
// (docs/GAME-DATA.md). Every Enhanced picture the player sees there has to be found from the game's
// own draw calls and data, because there is nothing on screen to match. This check drives the same
// keys through the game twice, once from the version 1.3 files (POR_GAME_SOURCE=original) and once
// from game/ (POR_GAME_SOURCE=port), with the artwork keys the browser server gives the runner
// (tools/enhanced-runner.ts) and the tiles it places from the packaged terrain, and compares the
// Enhanced artwork of every frame the runner sends: scene, portrait, the Classic fallback, the
// character sheet pieces, encounter, first-person tiles and scenery, combat art, selections,
// effects, battle tiles and props, panel frame, runes, and the same in each animation frame.
//
// What it walks, from a fresh start: the publisher and title screens; adding SSI's ready-made
// party; creating a character through race, sex, class, alignment, the roll, the name, the portrait
// (head and body) and the combat icon editor (parts, both colours, size); a character sheet; the
// New Phlan opening (Rolf's tour) to the first exploration menu; the Temple of Sune; the arms shop;
// camp. Then, from the committed fixture (qa/fixtures/guide-party-new-phlan/), the guide's party
// from the inn to the Slums and the orcs' fight at (13,1), fought on Quick. Then, with the
// ready-made party after Rolf's tour: City Hall and the clerk's commissions, the passenger dock, the
// boat and the arrival at Sokal Keep, looking round in all four directions (the route of
// acceptance.new-phlan.dock-before-sokal, tools/acceptance/new-phlan.mjs); then into the keep by the
// campaign's keys: the gates, the reeds and the parchment, and the undead patrol with its password.
//
// The two runs see the same text on every frame (npm run verify:game-data proves the play is the
// same), so frame n of one is frame n of the other. Each screen where the artwork differs is
// reported with its frame number, its bottom line, and what one run has that the other lacks; the
// first such frame of each is written to out/port-parity/ as PNG (Classic from the original files,
// Enhanced underlay from both). The whole report is out/port-parity.json. Exit 1 while any differs.
//
// POR_PARITY_ONLY=start, =slums or =sokal runs one of the walks. POR_GAMEDATA names the 1.3 files.
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tsImport } from "tsx/esm/api";
import { addReadyMadeParty, beginAdventuring, exploring, menuLine, pressReturn, screenText, startGame } from "./acceptance/harness.mjs";
import { innToSlums, loadParty } from "./acceptance/party.mjs";

const originalFiles = process.env.POR_GAMEDATA ?? "/Users/tsavo/por-assets/gog-1.3/POOLRAD";
const { loadUpgradeArt, loadCombatMaterialMasks } = await tsImport("./upgrade-art.ts", import.meta.url);
const { portGameRoot, readGameFile } = await tsImport("./gamedata.ts", import.meta.url);
const { enhancedArtEnv, packagedTerrain, packagedTiles } = await tsImport("./enhanced-runner.ts", import.meta.url);
const { detectGameVersion, useGameVersion } = await tsImport("../src/runtime/bindings.ts", import.meta.url);

const outDirectory = join("out", "port-parity");
const progress = (line) => console.error(`[port-parity] ${line}`);

/** Each data source as the browser server would run it: the runner's environment and the tile placement it adds. */
function source(name, root, env) {
  useGameVersion(detectGameVersion(readGameFile(root, "GAME.OVR")));
  const artwork = loadUpgradeArt(undefined, root);
  const terrain = packagedTerrain(root);
  return { name, env: { ...env, ...enhancedArtEnv(artwork, loadCombatMaterialMasks(artwork)) }, terrain, artwork };
}
const sources = [
  source("original", originalFiles, { POR_GAME_SOURCE: "original", POR_GAMEDATA: originalFiles }),
  source("port", portGameRoot, { POR_GAME_SOURCE: "port" }),
];

const sorted = (list) => list === undefined ? undefined : list.map((item) => JSON.stringify(item)).sort();
/** A combat placement with its defaults spelled out: a 24 by 24 sprite that is not selected. */
const actor = ([x, y, key, reflected, highlighted, width = 24, height = 24]) => [x, y, key, Boolean(reflected), Boolean(highlighted), width, height];
const scenery = (native) => native && (({ area, mapId, x, y, facing, walls, areaView }) => ({ area, mapId, x, y, facing, walls, areaView }))(native);

/**
 * Whether the page draws the 3D exploration view (WebGL) for this frame, and of what: the rule of
 * explorationSurface in tools/play.js, from the fields the server sends (`art` is the scene's
 * artwork, `scenery` the native scenery's position).
 */
function webgl(view, from) {
  if ((view.scene && from.artwork.has(view.scene)) || view.portrait || view.classicPortrait || view.characterSheet ||
    view.combatArt?.length || view.battleTiles?.length || view.battleProps?.length) return undefined;
  if (view.overlandMap) return "overland";
  if (!view.perspective || view.nativeScenery?.areaView) return undefined;
  if (view.nativeScenery) return `scenery ${JSON.stringify(scenery(view.nativeScenery))}`;
  const pose = view.exploration;
  if (pose?.area === 0 && [pose.cameraX, pose.cameraY].every(value => Number.isInteger(value) && value >= 0 && value < 16)) {
    return `phlan ${pose.cameraX},${pose.cameraY} facing ${pose.facing}`;
  }
}

/** The Enhanced artwork of one frame (or animation frame), each kind as a comparable value. */
function artwork(view, from) {
  // The server replaces the tiles of a first-person view with the packaged terrain's (browser-play prepareScenery).
  const tiles = from.terrain && view.nativeScenery ? packagedTiles(from.terrain, from.artwork, view.nativeScenery) : view.tiles;
  return {
    webgl: webgl(view, from),
    scene: view.scene,
    portrait: view.portrait,
    classicPortrait: view.classicPortrait || undefined,
    characterSheet: sorted(view.characterSheet),
    encounter: view.encounter && JSON.stringify(view.encounter),
    perspective: view.perspective || undefined,
    scenery: scenery(view.nativeScenery) && JSON.stringify(scenery(view.nativeScenery)),
    exploration: view.exploration && JSON.stringify((({ area, x, y, facing }) => ({ area, x, y, facing }))(view.exploration)),
    overlandMap: view.overlandMap || undefined,
    tiles: tiles?.length ? sorted(tiles) : undefined,
    combatArt: view.combatArt?.length ? sorted(view.combatArt.map(actor)) : undefined,
    combatSelections: view.combatSelections?.length ? sorted(view.combatSelections) : undefined,
    combatEffect: view.combatEffect && JSON.stringify(view.combatEffect),
    battleTiles: view.battleTiles?.length ? sorted(view.battleTiles) : undefined,
    battleProps: view.battleProps?.length ? sorted(view.battleProps.map(actor)) : undefined,
    panelFrame: view.panelFrame?.length ? sorted(view.panelFrame) : undefined,
    runes: view.runes?.length ? sorted(view.runes) : undefined,
    codeWheel: view.codeWheelQuestion,
  };
}

/** Every frame the runner sends while `walk` drives the game, with the Enhanced artwork it carries. */
async function record(from, start, walk) {
  const frames = [];
  let screen = "start";
  const game = await start({ env: from.env });
  const keep = () => {
    const frame = game.frame;
    frames.push({
      screen, text: screenText(frame), menu: menuLine(frame), art: artwork(frame, from),
      animation: (frame.animation ?? []).map((shown) => artwork(shown, from)),
      picture: { classic: frame.frame, enhanced: frame.enhancedFrame },
    });
  };
  keep();
  const send = game.send;
  game.send = async (command) => {
    const went = await send(command);
    if (went) keep();
    return went;
  };
  try {
    await walk(game, (name) => { screen = name; progress(`${from.name}: ${name}`); });
  } finally {
    game.close();
  }
  return frames;
}

// ---- What is walked ------------------------------------------------------------------------

/** The icon editor's keys: each part, both colours and the size, as a player tries them. */
const iconEditorKeys = ["p", "h", "n", "n", "k", "w", "n", "k", "e", "1", "b", "n", "n", "k", "e", "2", "b", "n", "k", "e", "s", "l", "k", "e"];

async function freshStart(game, screen) {
  screen("publisher and title");
  await game.pressUntil("enter", /Create New Character/, 6);
  screen("adding the ready-made party");
  await addReadyMadeParty(game);
  screen("creating a character: race, sex, class, alignment, roll");
  await game.press("c");
  for (let rows = 0; !/Keep this character\? Yes No\s*$/.test(game.text()); rows++) {
    if (rows >= 6) game.fail("Enter on each list did not come to the roll.");
    await game.press("enter");
  }
  await game.press("y", /Character name:/, "Yes keeps the roll.");
  screen("creating a character: name");
  for (const letter of "PARITY") await game.press(letter);
  await game.press("enter", /Head Body Keep\s*$/, "After the name the game offers the portrait's head and body.");
  screen("creating a character: portrait head and body");
  for (const key of ["h", "h", "b", "b"]) await game.press(key, /Head Body Keep\s*$/);
  await game.press("k", /Parts color-1 color-2 Size Exit\s*$/, "Keep takes the portrait; the icon editor follows.");
  screen("creating a character: icon editor");
  for (const key of iconEditorKeys) await game.press(key);
  game.expect(/Is this icon ok\? Yes No\s*$/, "Exit from the icon editor asks whether the icon is ok.");
  await game.press("y", /BEGIN Adventuring/, "Yes ends the creation.");
  screen("character sheet");
  await game.press("v");
  if (!/\bHP\b/.test(game.text())) game.fail("V on the party menu did not show a character sheet.");
  await game.pressUntil("e", /BEGIN Adventuring/, 3);
  screen("New Phlan opening");
  await beginAdventuring(game);
  screen("Temple of Sune");
  await game.walk("E");
  await game.walk("N");
  await game.press("y", /Heal View Pool Appraise Exit\s*$/, "YES opens the temple services menu.");
  await game.press("h", /how can we help you\?/, "Heal lists the cures.");
  await game.press("e", /Heal View Pool Appraise Exit\s*$/);
  await game.press("e", exploring, "Exit leaves the temple.");
  await game.walk("S");
  screen("arms shop");
  await game.walk("ENNEEESEESSSSSSSS");
  await game.walk("E");
  await game.press("y", /Buy View (?:Take )?Pool (?:Share )?Appraise Exit\s*$/, "YES opens the shop menu.");
  await game.press("b", /Items: Buy (?:Next )?(?:Prev )?Exit\s*$/, "Buy lists the stock.");
  await game.press("e");
  await game.press("e", exploring, "Exit leaves the shop.");
  screen("camp");
  await game.press("e", /Camp: Save View Magic Rest Alter Exit/, "E makes camp.");
  await game.press("v", /View: ?[A-Z][a-z]+ .*Exit\s*$/, "View shows a character sheet in camp.");
  await game.press("e", /Camp:/);
  await game.press("e", exploring, "Exit breaks camp.");
}

const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
/** After a fight: through the treasure menu, taking nothing, back to walking. */
async function leaveFight(game) {
  for (let presses = 0; !exploring.test(game.menu()); presses++) {
    if (presses >= 12) game.fail("The end of the fight did not lead back to the exploration menu.");
    if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
    else if (/\bExit$/.test(game.menu())) await game.press("e");
    else await game.press("enter");
  }
}
/** Walk a route in the Slums; a random encounter on the way is fought on Quick. */
async function walkFighting(game, route) {
  for (const heading of route) {
    for (let tries = 0; ; tries++) {
      if (tries >= 4) game.fail(`Four tries did not take the party one step ${heading}.`);
      await game.face(heading);
      const from = game.here();
      await game.press("up");
      while (pressReturn.test(game.menu()) && /YOU ARE SURPRISED BY/.test(game.text())) await game.press("enter");
      if (encounterMenu.test(game.menu())) await game.startFight("c");
      if (game.inFight()) {
        await game.win();
        await leaveFight(game);
      }
      const to = game.here();
      if (to && (to.x !== from.x || to.y !== from.y)) break;
    }
  }
}

async function slumsFight(game, screen) {
  screen("from the inn to the Slums");
  await innToSlums(game);
  screen("the Slums");
  await walkFighting(game, "WSSSWNNNNNEN");
  await game.face("W");
  await game.press("up", pressReturn, "The orcs' room at (13,1) waits for return before the fight.");
  screen("the orcs' fight");
  await game.startFight("enter");
  await game.win();
  screen("after the orcs' fight");
  await leaveFight(game);
}

/** Answer every "press return" until the party can walk again. */
async function readOn(game, limit = 12) {
  for (let presses = 0; !exploring.test(game.text()); presses++) {
    if (presses >= limit || !pressReturn.test(game.text())) game.fail("The game did not return to the exploration menu.");
    await game.press("enter");
  }
}

async function sokalKeep(game, screen) {
  screen("adding the ready-made party and the New Phlan opening");
  await addReadyMadeParty(game);
  await beginAdventuring(game);
  screen("City Hall and the clerk");
  await game.walk("EEE");
  await game.press("enter");
  await game.walk("E");
  await game.walk("S");
  await game.walk("E");
  await readOn(game);
  await game.walk("WE");
  await readOn(game);
  await game.walk("WNN");
  screen("the passenger dock and the boat");
  await game.walk("EEEEEENE");
  await game.walk("N");
  await readOn(game);
  await game.walk("EEE");
  await game.walk("E");
  await readOn(game);
  screen("Sokal Keep arrival");
  for (let turn = 0; turn < 4; turn++) await game.press("right");
  // Into the keep by the campaign's own keys (verifySokalKeep in tools/verify-fresh-party.mjs): the
  // gates, the reeds and the parchment in runes, then the undead patrol, answered with its password.
  screen("Sokal Keep: the gates, the reeds and the parchment");
  for (const key of ["up", "left", "up", "up", "enter", "enter", "end", "enter", "enter", "enter", "enter"]) await game.press(key);
  screen("Sokal Keep: the undead patrol");
  for (const key of ["right", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "left"]) await game.press(key);
  if (/parlay/i.test(game.text())) {
    await game.press("p");
    await game.press("n");
    for (const letter of "shestni") await game.press(letter);
    await game.press("enter");
  }
}

const walks = [
  { name: "start", start: (options) => startGame({ ...options, seconds: 600,
    env: { ...options.env, POR_BOOT_KEYS: "", POR_LIVE_AT: "24000000" } }), walk: freshStart },
  { name: "slums", start: (options) => loadParty({ ...options, seconds: 900 }), walk: slumsFight },
  { name: "sokal", start: (options) => startGame({ ...options, seconds: 600 }), walk: sokalKeep },
];

// ---- Comparison ----------------------------------------------------------------------------

const differences = [];
const findings = new Map();
let compared = 0;
rmSync(outDirectory, { recursive: true, force: true });
for (const { name, start, walk } of walks) {
  if (process.env.POR_PARITY_ONLY && process.env.POR_PARITY_ONLY !== name) continue;
  const runs = [];
  for (const from of sources) runs.push(await record(from, start, walk));
  const [a, b] = runs;
  if (a.length !== b.length) differences.push({ walk: name, kind: "frames", detail: `${a.length} frames from the original files, ${b.length} from game/` });
  for (let index = 0; index < Math.min(a.length, b.length); index++) {
    const left = a[index], right = b[index];
    if (left.text !== right.text) {
      differences.push({ walk: name, screen: left.screen, frame: index, kind: "text", detail: "the runs diverged: the screens' text differs", original: left.text, port: right.text });
      break;
    }
    compared++;
    const views = [["", left.art, right.art], ...Array.from({ length: Math.max(left.animation.length, right.animation.length) },
      (_, step) => [`animation ${step} `, left.animation[step] ?? {}, right.animation[step] ?? {}])];
    for (const [prefix, x, y] of views) {
      for (const kind of new Set([...Object.keys(x), ...Object.keys(y)])) {
        const was = x[kind], is = y[kind];
        if (JSON.stringify(was) === JSON.stringify(is)) continue;
        const list = (value) => Array.isArray(value) ? value : value === undefined ? [] : [String(value)];
        const missing = list(was).filter((item) => !list(is).includes(item));
        const extra = list(is).filter((item) => !list(was).includes(item));
        const id = `${name} | ${left.screen} | ${prefix}${kind}`;
        const finding = findings.get(id) ?? { walk: name, screen: left.screen, kind: `${prefix}${kind}`, frames: [], missing: new Set(), extra: new Set() };
        if (!finding.frames.length) {
          // The whole value of that kind on the first frame from each source, for reading the difference in place.
          finding.first = { frame: index, menu: left.menu, original: was, port: is };
          mkdirSync(outDirectory, { recursive: true });
          const stem = join(outDirectory, `${name}-${index}`);
          writeFileSync(`${stem}-original-classic.png`, Buffer.from(left.picture.classic, "base64"));
          writeFileSync(`${stem}-original-enhanced.png`, Buffer.from(left.picture.enhanced, "base64"));
          writeFileSync(`${stem}-port-enhanced.png`, Buffer.from(right.picture.enhanced, "base64"));
        }
        finding.frames.push(index);
        for (const item of missing) finding.missing.add(item);
        for (const item of extra) finding.extra.add(item);
        findings.set(id, finding);
      }
    }
  }
}

const report = [...findings.values()].map((finding) => ({ ...finding, missing: [...finding.missing], extra: [...finding.extra] }));
mkdirSync("out", { recursive: true });
writeFileSync(join("out", "port-parity.json"), JSON.stringify({ compared, differences, findings: report }, null, 1) + "\n");
for (const { walk, screen, kind, frames, first, missing, extra } of report) {
  console.log(`DIFFERS ${walk} / ${screen} / ${kind}: ${frames.length} frames from frame ${first.frame} ("${first.menu}")`);
  if (missing.length) console.log(`  only from the original files: ${missing.slice(0, 6).join("  ")}${missing.length > 6 ? `  (+${missing.length - 6} more)` : ""}`);
  if (extra.length) console.log(`  only from game/: ${extra.slice(0, 6).join("  ")}${extra.length > 6 ? `  (+${extra.length - 6} more)` : ""}`);
}
for (const { walk, screen, frame, kind, detail } of differences) console.log(`DIFFERS ${walk}${screen ? ` / ${screen}` : ""}${frame === undefined ? "" : ` at frame ${frame}`}: ${kind}: ${detail}`);
const failing = report.length + differences.length;
console.log(`${compared} frames compared; ${report.length} screen and artwork kinds differ${differences.length ? `, ${differences.length} runs diverged` : ""}. Report: out/port-parity.json`);
process.exit(failing ? 1 : 0);
