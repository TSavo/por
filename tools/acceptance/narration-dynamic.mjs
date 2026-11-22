// Acceptance test for the dynamic narration: passages whose words change at run time.
//
//   npm run acceptance:narration-dynamic              every family
//   npm run acceptance:narration-dynamic -- tales     named families, one after another
//
// 69 narrated passages have text that changes while the game runs: which monsters turned up, the
// tavern tale rolled, the class a hall trains. Each case has its own recording, chosen by a
// condition on the game's state. A condition that matches nothing is silence where the narrator
// should say what happened. This test drives the game itself (GOG version 1.3, SSI's ready-made
// party, fixed dice) so that five families of different kinds fire several times each, and
// requires that every time one fires a variant is selected:
//
//   tales      enumerated: the tavern tale number (ECL3.DAX block 0, slot 0x6e7e)
//   halls      context-dependent: "'WE TRAIN ONLY <class> HERE.'" in the four training halls
//              (ECL3.DAX block 11, slot 0x982c)
//   encounters encounter table: the random encounters of the Slums, whose monsters are drawn from
//              the script's table (ECL2.DAX block 20, slots 0x9890 and 0x982c)
//   hirelings  two slots: "'THERE IS A FINE <title> WHO WILL JOIN YOU FOR <price>.'" in the hiring
//              hall (ECL3.DAX block 11, slots 0x982c and 0x9890), chosen by the whole sentence
//   proclamations chosen by a count before the script fills the slot: the City Hall wall
//              (ECL3.DAX block 0, count 0x4ac1, slot 0x985e)
//
// For hirelings and proclamations the recording chosen must also say the sentence on the screen.
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

/** Answer the arena master at (7,1): NO to the duel, YES to a partner. Leaves the game on the first offer or on "NO ONE". */
async function askForPartner(game) {
  for (let screens = 0; !/DO YOU SEEK A PARTNER FOR YOUR ADVENTURING\?/.test(flat(game.text())); screens++) {
    if (screens >= 6) game.fail("The hiring hall did not come to its question about a partner.");
    if (/Yes No\s*$/.test(game.text())) await game.press("n");
    else if (pressReturn.test(game.text()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu())) await game.press("enter");
    else game.fail("The hiring hall showed something this test does not know.");
  }
}

/**
 * The three offers the game makes that nobody has recorded (qa/findings.json,
 * narration-dynamic-variants-not-proved). The script saves "3 SHARES " or "4 SHARES " over the
 * price after " PLUS A PICK OF SPECIAL ITEMS" (9e67, 9e7b, 9e9e), which cuts the pick of items off
 * for these three titles. The recordings made for them say "PLUS A PICK OF SPECIAL ITEMS", which
 * the screen does not, and must not be played. Until the three sentences are recorded the test
 * requires these offers to be silent, with the ledger showing the sentence, and lists them. Take a
 * sentence out of this list when its recording exists: the offer must then be heard.
 */
const unrecordedOffers = [
  "'THERE IS A FINE SWORDSMAN WHO WILL JOIN YOU FOR 3 SHARES . IS THIS ACCEPTABLE?'",
  "'THERE IS A FINE HERO WHO WILL JOIN YOU FOR 4 SHARES . IS THIS ACCEPTABLE?'",
  "'THERE IS A FINE THEURGIST WHO WILL JOIN YOU FOR 4 SHARES . IS THIS ACCEPTABLE?'",
];
/** Firings that were rightly silent because the sentence has no recording yet: { family, what, said }. */
const awaited = [];

/**
 * Two changing slots: the hiring hall at (7,1) of the training block (ECL3.DAX block 11). The
 * arena master offers a duel, then a partner: "'THERE IS A FINE <title> WHO WILL JOIN YOU FOR
 * <price>. IS THIS ACCEPTABLE?'". The title is a string in slot 0x982c and the price a string in
 * slot 0x9890; the script rolls one of eight titles (RANDOM 250 at 9d03) and sets the price from
 * the title (9e3a to 9e9e). Refusing brings "'WOULD YOU LIKE TO CONSIDER SOMEONE ELSE?'", and YES
 * rolls again, eight times in a stay. The party leaves the block and comes back for more.
 * Every offer must be narrated, and by the recording of the sentence on the screen.
 */
async function hirelings() {
  const unit = "por.voice.ecl3.b11-9eab-9ed8";
  const game = await newParty({ seconds: 900 });
  const offer = /^'THERE IS A FINE (.+) WHO WILL JOIN YOU FOR (.+)\. IS THIS ACCEPTABLE\?'$/;
  let offers = 0;
  try {
    await game.walk("EENNEEEE");
    for (let stay = 0; stay < 3; stay++) {
      await walkOn(game, "The training block did not let the party walk.");
      assert.deepEqual([game.here().x, game.here().y], [6, 2], "The party enters the training block at (6,2).");
      await game.step("N");
      await walkOn(game, "The training block did not let the party walk on.");
      let mark = game.printed.length, since = narrationLines().length;
      await game.face("E");
      await game.press("up");
      await askForPartner(game);
      mark = game.printed.length, since = narrationLines().length;
      await game.press("y");
      for (let asked = 0; asked < 10; asked++) {
        const said = flat(game.printed.slice(mark).join(""));
        if (said === "'THERE IS NO ONE WHO WILL GO WITH YOU.'") break;
        const [, title, price] = offer.exec(said) ?? game.fail(`The hiring hall said something that is not an offer: ${said}`);
        offers++;
        const what = `${title} for ${price}`;
        const about = narrationLines().slice(since).filter((line) => line.unitId === unit);
        const heard = about.filter((line) => line.outcome === "heard" && line.variantId);
        const recorded = heard.map((line) => flat(families.get(unit).runtimeVariants.find(({ id }) => id === line.variantId).text));
        // The narrator reads the game's own text: the recording must be of the sentence on the screen.
        if (heard.length === 1 && recorded[0] === said) report.push({ family: "hirelings", what, variant: heard[0].variantId, slot: heard[0].slot, value: heard[0].value });
        else if (!heard.length && unrecordedOffers.includes(said) && about.some((line) => line.outcome === "silent" && flat(String(line.value)).toUpperCase() === said.toUpperCase()))
          awaited.push({ family: "hirelings", what, said });
        else defects.push({ family: "hirelings", what, ledger: about, conditions: heard.length
          ? [`the screen shows ${said} and the recording selected says ${recorded.join(" and ")}`]
          : [`the screen shows ${said}`, ...families.get(unit).runtimeVariants.map(({ text }) => `recorded: ${text}`)] });
        await game.press("n");
        if (!/WOULD YOU LIKE TO CONSIDER SOMEONE ELSE\?/.test(flat(game.text()))) game.fail("Refusing an offer did not bring the question about someone else.");
        mark = game.printed.length, since = narrationLines().length;
        await game.press("y");
      }
      await walkOn(game, "The hiring hall did not let the party walk on.");
      // Out of the training block by its west door and in again: the hall asks afresh.
      const at = game.here();
      for (const heading of at.x === 7 && at.y === 1 ? "WSW" : "SW") {
        await game.step(heading);
        await walkOn(game, "The training block did not let the party walk back.");
      }
      assert.deepEqual([game.here().x, game.here().y], [5, 2], "The party is back in the street, at (5,2).");
      await game.step("E");
    }
  } finally {
    game.close();
  }
  assert.ok(offers >= 8, `At least eight offers must be made; ${offers} were.`);
}

/**
 * Chosen by a count: the proclamations on the City Hall wall (ECL3.DAX block 0 at ac22), read on
 * arriving at (3,4) from the west. The number of rewards the clerk has paid (0x4ac1) decides the
 * text: none, "PROCLAMATIONS LXIV, LXXVIII, CIX, AND LIX." (a fixed recording); one to nine,
 * "PROCLAMATION <number>", whose number the script saves into slot 0x985e only after the opening
 * print that starts the narration. The narration must be the recording of what the screen shows.
 * The wall is read once per stay in New Phlan: the party goes to the training block and back to
 * read it again. A new party has no rewards, so play here reaches only the fixed text; the nine
 * numbers, with another number left in the slot, are proved by `npm run verify-narration-runtime`.
 */
async function proclamations() {
  const single = "por.voice.ecl3.b0-ac22-ac8a-ac96", several = "por.voice.ecl3.b0-ac22-ac9b";
  const lead = "PROCLAMATIONS ARE POSTED ON THE WALLS, IN YOUR JOURNAL YOU NOTE";
  const tight = (text) => text.replace(/\s+/g, "");
  const game = await newParty({ watch: [0x4ac1] });
  try {
    await game.walk("EE");
    for (let visit = 0; visit < 3; visit++) {
      const mark = game.printed.length, since = narrationLines().length;
      await game.step("E");
      await walkOn(game, "The City Hall entrance did not let the party walk on.");
      const printed = game.printed.slice(mark).map(flat);
      assert.equal(printed[1], lead, "Arriving at (3,4) from the west, the party reads the proclamations.");
      const posted = printed.slice(2).join(""), rewards = game.variable(0x4ac1);
      const what = `after ${rewards} rewards: ${posted}`;
      const about = narrationLines().slice(since).filter((line) => line.sourceId === "por.review.ecl-3.block-0.at-ac22");
      const heard = about.filter((line) => line.outcome === "heard");
      const unit = heard[0] && manifest.units.find(({ id }) => id === heard[0].unitId);
      const recorded = heard[0]?.variantId ? unit.runtimeVariants.find(({ id }) => id === heard[0].variantId).text : unit?.spokenText;
      if (heard.length === 1 && tight(recorded) === tight(`${lead} ${posted}`) && heard[0].unitId === (/^PROCLAMATIONS /.test(posted) ? several : single))
        report.push({ family: "proclamations", what, variant: heard[0].variantId ?? heard[0].unitId, slot: "0x4ac1", value: rewards });
      else defects.push({ family: "proclamations", what, ledger: about, conditions: [`the screen shows ${lead} ${posted}`, `the recording selected says ${recorded}`] });
      // To the training block and back: the wall is read once in a stay.
      for (const heading of "WNNEEEEWWWWSS") {
        await game.step(heading);
        await walkOn(game, "New Phlan did not let the party walk to the training block and back.");
      }
    }
  } finally {
    game.close();
  }
}

const tests = { tales, halls, encounters, hirelings, proclamations };
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
  const unrecorded = awaited.filter(({ family }) => family === name);
  console.log(`${name}: fired ${fired.length + silent.length + unrecorded.length} times, a variant was selected ${fired.length} times` +
    (unrecorded.length ? `, ${unrecorded.length} times the sentence has no recording yet` : ""));
  for (const { what, variant, slot, value } of fired) console.log(`  heard   ${what}: ${variant} (${slot ?? "slot ?"} held ${JSON.stringify(value)})`);
  for (const { what, said } of unrecorded) console.log(`  NO RECORDING  ${what}: silent, as it must be until this is recorded: ${said}`);
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
console.log(`proved: ${wanted.join(", ")} select a variant every time they fire` +
  (awaited.length ? `, except ${new Set(awaited.map(({ said }) => said)).size} sentences that have no recording yet` : ""));
