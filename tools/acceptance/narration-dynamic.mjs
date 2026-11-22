// Acceptance test for the dynamic narration: passages whose words change at run time.
//
//   npm run acceptance:narration-dynamic              every family
//   npm run acceptance:narration-dynamic -- tales     named families, one after another
//
// 69 narrated passages have text that changes while the game runs: which monsters turned up, the
// tavern tale rolled, the class a hall trains. Each case has its own recording, chosen by a
// condition on the game's state. A condition that matches nothing is silence where the narrator
// should say what happened. This test drives the game itself (GOG version 1.3, SSI's ready-made
// party, fixed dice) so that three families of different kinds fire several times each, and
// requires that every time one fires a variant is selected:
//
//   tales      enumerated: the tavern tale number (ECL3.DAX block 0, slot 0x6e7e)
//   halls      context-dependent: "'WE TRAIN ONLY <class> HERE.'" in the four training halls
//              (ECL3.DAX block 11, slot 0x982c)
//   encounters encounter table: the random encounters of the Slums, whose monsters are drawn from
//              the script's table (ECL2.DAX block 20, slots 0x9890 and 0x982c)
//
// What was selected is read from the narration ledger the runner writes (POR_NARRATION_LEDGER,
// tools/narration-ledger.ts): the passage firing is taken from the game's own printed text, the
// selection from the ledger. The ledger of this run is left in
// out/narration-ledgers/acceptance-narration-dynamic.jsonl for `npm run qa:narration -- --merge`.
// A firing with no variant is a defect: the test prints the slot's value against the family's
// conditions and fails. docs/NARRATION-QA.md says what to do with it.

import assert from "node:assert/strict";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { addReadyMadeParty, beginAdventuring, exploring, pressReturn, startGame } from "./harness.mjs";

const ledger = resolve(process.env.POR_NARRATION_LEDGER ?? "out/narration-ledgers/acceptance-narration-dynamic.jsonl");
mkdirSync(dirname(ledger), { recursive: true });
rmSync(ledger, { force: true });
const manifest = JSON.parse(readFileSync(new URL("../../src/audio/voice-master-manifest.json", import.meta.url), "utf8"));
const families = new Map(manifest.units.filter((unit) => unit.runtimeVariants?.length).map((unit) => [unit.id, unit]));
const flat = (text) => text.replace(/\s+/g, " ").trim();

/** The narration lines of the ledger so far. The runner writes each one before the frame that follows it. */
const narrationLines = () => readFileSync(ledger, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line)).filter((line) => line.t === "n");

const treasureMenu = /View Take Pool Share Exit\s*$/;
const report = [];
const defects = [];
/**
 * One firing of a passage: `since` is the number of ledger lines before it. Requires a variant of
 * one of `units` to have been selected, and records which. Without one, records the defect with
 * everything the ledger says about those passages.
 */
function selected(family, what, since, units) {
  const lines = narrationLines().slice(since);
  const heard = lines.filter((line) => line.outcome === "heard" && line.variantId && units.includes(line.unitId));
  if (heard.length) {
    for (const line of heard) report.push({ family, what, variant: line.variantId, slot: line.slot, value: line.value });
    return heard;
  }
  const about = lines.filter((line) => line.outcome === "silent" || units.includes(line.unitId) ||
    units.some((unit) => families.get(unit).coveredSourceIds.includes(line.sourceId)));
  defects.push({ family, what, ledger: about, conditions: units.map((unit) => `${unit}: ${families.get(unit).runtimeVariants.map(({ condition }) => condition).join("; ")}`) });
  return [];
}

async function newParty(options) {
  const game = await startGame({ seconds: 600, env: { POR_NARRATION_LEDGER: ledger, POR_NARRATION_RUN: "acceptance-narration-dynamic" }, ...options });
  try {
    await addReadyMadeParty(game);
    await beginAdventuring(game);
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

/** Read on, refusing every offer, until the party is free to walk. A fight on the way is fought and must be won. */
async function walkOn(game, why) {
  for (let presses = 0; !exploring.test(game.menu()); presses++) {
    if (presses >= 20) game.fail(why);
    if (game.inFight()) await game.win();
    else if (treasureMenu.test(game.menu())) await game.press("e");
    else if (/^(?:Take: (?:Money )?(?:Items )?Exit|Items: Take Exit)$/.test(game.menu())) await game.press("e");
    else if (/Yes No\s*$/.test(game.text())) await game.press("n");
    else if (/press <enter>\/<return> to continue\s*$/i.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu())) await game.press("enter");
    else game.fail(`${why}\nThe game shows something this test does not know.`);
  }
}

/** Walk into the tavern at (10,8) from the square north of it and go on to the gambling question. A pickpocket may strike first. */
async function enterTavern(game) {
  assert.deepEqual([game.here().x, game.here().y], [10, 7], "The party stands north of the tavern door, at (10,7).");
  await game.walk("S");
  for (let screens = 0; !/DOES ANYONE WANT TO GAMBLE\? Yes No\s*$/.test(game.text()); screens++) {
    if (screens >= 6) game.fail("The tavern did not come to its gambling question.");
    if (/Ignore Grab\s*$/.test(game.text())) await game.press("i");
    else if (pressReturn.test(game.text())) await game.press("enter");
    else game.fail("The tavern showed something this test does not know.");
  }
}

/**
 * Enumerated: the tavern at (10,8) tells a tale, numbered 1 to 23, each time the party declines to
 * gamble. One visit in four ends in a brawl, which ends that game's visits: the test does not
 * fight. The dice of a replay are fixed, so each game first spins the gambling top a different
 * number of times, which moves the dice on and brings other tales.
 */
async function tales() {
  const unit = "por.voice.ecl3.b0-a413-a438";
  let fired = 0;
  for (const spins of [2, 3, 5, 7]) {
    if (fired >= 5) break;
    const game = await newParty();
    try {
      await game.walk("EENNEEESEESSSSEEE");
      await enterTavern(game);
      await game.press("y");
      await game.press("enter", /WHO WILL GAMBLE\? Select\s*$/, "The game asks who will gamble.");
      await game.highlight("THRENDER");
      await game.press("s");
      for (let round = 1; ; round++) {
        game.expect(/YOU HAVE \d+ PP\./, "Each round starts by showing the gambler's platinum.");
        await game.press("enter");
        await game.press("1");
        await game.press("enter");
        await game.press("enter", /WILL YOU GO AGAIN\? Yes No\s*$/, "After the result the game asks whether to go again.");
        await game.press(round >= spins ? "n" : "y");
        if (round >= spins) break;
      }
      game.expect(exploring, "Declining another spin ends the tavern visit.");
      for (let visit = 0; visit < 8; visit++) {
        await game.walk("N");
        await enterTavern(game);
        const mark = game.printed.length, since = narrationLines().length;
        await game.press("n");
        const [lead, number] = game.printed.slice(mark);
        assert.equal(lead, "YOU OVERHEAR TAVERN TALE ", "Declining to gamble, the party overhears a tale.");
        fired++;
        const heard = selected("tales", `tale ${number}`, since, [unit]);
        // The variant must be the one for the number on screen.
        if (heard.length && String(heard[0].value) !== number) defects.push({ family: "tales", what: `tale ${number}`, ledger: heard,
          conditions: [`the screen shows tale ${number} and the variant selected is for ${heard[0].value}`] });
        await game.press("enter");
        if (/A DRUNKEN BRAWL BREAKS OUT/.test(game.text())) break;
        game.expect(exploring, "After the tale the party is free to walk.");
      }
    } finally {
      game.close();
    }
  }
  assert.ok(fired >= 3, `At least three tales must be heard; heard ${fired}.`);
}

/**
 * Context-dependent: the four training halls. The party enters the training block at (6,2). The
 * halls are at (5,0) clerics, (7,0) magic users, (8,0) fighters and (9,0) thieves
 * (qa/acceptance/00-new-phlan.json, acceptance.new-phlan.training-halls). Each trainer says
 * "'WE TRAIN ONLY <class> HERE. DO YOU WANT TO TRAIN?'"; the class is a string the script saved.
 */
async function halls() {
  const unit = "por.voice.ecl3.b11-a00e-a021";
  const game = await newParty();
  try {
    await game.walk("EENNEEEE");
    for (let presses = 0; !exploring.test(game.text()); presses++) {
      if (presses >= 6 || !pressReturn.test(game.text())) game.fail("The training block did not let the party walk.");
      await game.press("enter");
    }
    assert.deepEqual([game.here().x, game.here().y], [6, 2], "The party enters the training block at (6,2).");
    // To each hall and back to (6,2). The last step of each route enters the hall; NO leaves it.
    for (const [trained, route, back] of [["FIGHTERS", "NEEN", "SWWS"], ["THIEVES", "NEEEN", "SWWWS"], ["CLERICS", "NNW", "ESS"], ["MAGIC USERS", "NNE", "WSS"]]) {
      // The way passes the duelling room at (7,1), whose arena master offers a duel: NO.
      for (const heading of route.slice(0, -1)) {
        await game.step(heading);
        await walkOn(game, "The training block did not let the party walk on.");
      }
      const mark = game.printed.length, since = narrationLines().length;
      await game.face(route.at(-1));
      await game.press("up");
      const said = flat(game.printed.slice(mark).join(""));
      assert.equal(said, `'WE TRAIN ONLY ${trained} HERE. DO YOU WANT TO TRAIN?'`, `The ${trained.toLowerCase()} hall's trainer speaks.`);
      selected("halls", `the hall for ${trained.toLowerCase()}`, since, [unit]);
      await walkOn(game, "NO did not leave the training hall.");
      // NO can leave the party in the doorway or outside it: walk back from wherever it stands.
      const at = game.here();
      const home = route.slice(0, -1).split("").reduce(([x, y], heading) =>
        heading === "N" ? [x, y - 1] : heading === "S" ? [x, y + 1] : heading === "E" ? [x + 1, y] : [x - 1, y], [6, 2]);
      const way = at.x === home[0] && at.y === home[1] ? back.slice(1) : back;
      for (const heading of way) {
        await game.step(heading);
        await walkOn(game, "The training block did not let the party walk back.");
      }
      assert.deepEqual([game.here().x, game.here().y], [6, 2], "The party is back at (6,2).");
    }
  } finally {
    game.close();
  }
}

/** The menu of a random encounter: Advance when the monsters are far, Parlay when they are near. */
const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
/**
 * Encounter table: the Slums' random encounters. A step outside a room can be met by one (one draw
 * from 14 numbers, the script at 9b3a); the script then draws the monsters from its table and
 * saves their name into the slot the passage prints. The party walks to and fro between (15,4) and
 * (14,4), fights each encounter and wins, until three have been met.
 */
async function encounters() {
  const units = [...families.keys()].filter((id) => id.startsWith("ecl2-b20-"));
  const game = await startGame({ seconds: 900, env: { POR_NARRATION_LEDGER: ledger, POR_NARRATION_RUN: "acceptance-narration-dynamic" } });
  try {
    await addReadyMadeParty(game);
    await beginAdventuring(game);
    await game.face("W");
    await game.press("up");
    assert.equal(game.square()?.area, 20, "One step west of the New Phlan gate is the Slums.");
    let met = 0;
    for (let steps = 0; met < 3; steps++) {
      if (steps >= 120) game.fail(`120 steps in the open Slums met ${met} random encounters, not 3.`);
      const mark = game.printed.length, since = narrationLines().length;
      await game.face(game.here().x === 15 ? "W" : "E");
      await game.press("up");
      const printed = flat(game.printed.slice(mark).join(" "));
      if (!encounterMenu.test(game.menu()) && !/YOU ARE SURPRISED BY/.test(printed) && !game.inFight()) {
        game.expect(exploring, "A step with no encounter leaves the party free to walk.");
        continue;
      }
      met++;
      selected("encounters", flat(printed) || game.menu(), since, units);
      for (let screens = 0; pressReturn.test(game.menu()) && !game.inFight(); screens++) {
        if (screens >= 4) game.fail("The surprise did not lead to a fight.");
        await game.press("enter");
      }
      if (encounterMenu.test(game.menu())) await game.startFight("c");
      if (game.inFight()) await game.win();
      for (let presses = 0; !exploring.test(game.menu()); presses++) {
        if (presses >= 14) game.fail("The end of the fight did not lead back to the exploration menu.");
        if (treasureMenu.test(game.menu())) await game.press("e");
        else if (/^(?:Take: (?:Money )?(?:Items )?Exit|Items: Take Exit)$/.test(game.menu())) await game.press("e");
        else if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
        else if (/press <enter>\/<return> to continue\s*$/i.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu())) await game.press("enter");
        else game.fail("After the fight the game shows something this test does not know.");
      }
      // A fight can end on another square: walk on from wherever the party stands, along row 4.
      if (game.here().y !== 4 || game.here().x < 14) game.fail(`The fight left the party at ${game.here().x},${game.here().y}, off the two squares this test walks.`);
    }
  } finally {
    game.close();
  }
}

const tests = { tales, halls, encounters };
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(tests);
const failures = [];
// One game at a time: the families share one ledger file, read by line count.
for (const name of wanted) {
  try {
    await tests[name]();
  } catch (error) {
    failures.push(`${name}: ${error.message}`);
  }
}
for (const name of wanted) {
  const fired = report.filter(({ family }) => family === name);
  const silent = defects.filter(({ family }) => family === name);
  console.log(`${name}: fired ${fired.length + silent.length} times, a variant was selected ${fired.length} times`);
  for (const { what, variant, slot, value } of fired) console.log(`  heard   ${what}: ${variant} (${slot ?? "slot ?"} held ${JSON.stringify(value)})`);
  for (const { what, ledger: lines, conditions } of silent) {
    console.log(`  SILENT  ${what}: no variant was selected`);
    for (const line of lines) console.log(`            ledger: ${JSON.stringify(line)}`);
    for (const line of conditions) console.log(`            ${line}`);
  }
}
console.log(`ledger: ${ledger}`);
for (const failure of failures) console.error(`FAILED ${failure}`);
if (defects.length) console.error(`${defects.length} firings of a dynamic passage selected no variant`);
if (failures.length || defects.length) process.exit(1);
console.log(`proved: ${wanted.join(", ")} select a variant every time they fire`);
