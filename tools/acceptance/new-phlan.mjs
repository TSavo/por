// Acceptance tests for New Phlan, from qa/acceptance/00-new-phlan.json.
//
//   npm run acceptance:new-phlan
//
// Each block proves one scenario of that file on the game itself: GOG version 1.3, with SSI's six
// ready-made characters, normal input and the fixed dice of a replay. A test does what the
// scenario's `steps` say and requires what its `expect` says, reading the screen text, the texts
// the game printed and the party's position. Quoted game texts below are the scenario's own, which
// were checked against the script (ECL3.DAX blocks 0, 8 and 11, read with src/lib/ecl.ts). Where a
// value comes only from what the game showed, the comment says so.
//
// Squares are (x,y) on the New Phlan map as the game prints them. Routes are spelled as headings
// and every square of a route must be reached, so a wall or an unexpected event fails the test.

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addReadyMadeParty, beginAdventuring, exploring, pressReturn, startGame } from "./harness.mjs";

const proved = [];
const flat = (text) => text.replace(/\s+/g, " ").trim();

/** Require the game to have printed exactly these texts, in this order, since `from`. */
function printedInOrder(game, from, expected, why) {
  const got = game.printed.slice(from).map(flat);
  assert.deepEqual(got, expected.map(flat), `${why}\nThe game printed:\n${got.join("\n")}`);
}
/** Require the newest text the game printed. */
function lastPrinted(game, expected, why) {
  const got = flat(game.printed.at(-1) ?? "");
  if (got !== flat(expected)) game.fail(`${why}\nThe game last printed: ${got}\nExpected: ${flat(expected)}`);
}
function at(game, x, y, why) {
  const where = game.position();
  if (!where || where.x !== x || where.y !== y) game.fail(`${why}\nThe party is not at ${x},${y}.`);
}
/** Answer every "press return" until the party can walk again. Nothing else is pressed. */
async function readOn(game, limit = 12) {
  for (let presses = 0; !exploring.test(game.text()); presses++) {
    if (presses >= limit || !pressReturn.test(game.text())) game.fail("The game did not return to the exploration menu.");
    await game.press("enter");
  }
}
/** Start a game with the six ready-made characters and go through the opening. */
async function newParty(options) {
  const game = await startGame({ seconds: 420, ...options });
  try {
    await addReadyMadeParty(game);
    await beginAdventuring(game);
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

const tour = [
  "'GREETINGS, COURAGEOUS ONES, I AM ROLF, APPOINTED BY THE COUNCIL TO INTRODUCE NEWCOMERS TO THE FAIR CITY OF PHLAN. IF YOU WILL ACCOMPANY ME, I WILL START THE TOUR.'",
  "'YOU NOW FACE AN ENTRANCE TO THE TEMPLE OF TYR. THERE ARE THREE TEMPLES IN PHLAN: TYR'S, SUNE'S, AND TEMPUS. TYR'S IS THE LARGEST AND HOUSES BISHOP BRACCIO. IF YOU WILL TURN AROUND NOW, '",
  "'YOU WILL SEE THE ENTRANCE TO THE PASSENGER DOCK AREA WE JUST DEPARTED. FEW SHIPS DARE THE PERILOUS PASSAGE HERE, BUT THE COUNCIL IS DEVELOPING A PLAN TO OPEN UP THE SEA LANES. PLEASE FOLLOW ME.'",
  "'BEHIND THESE DOORS ARE THE SPECIAL TRAINING SCHOOLS WHERE ADVENTURERS INCREASE THEIR SKILLS. LET US NOW GO TO THE CITY'S MOST IMPORTANT BUILDING.'",
  "'WE ARE JUST OUTSIDE THE CITY HALL. PROCLAMATIONS ARE POSTED ON THESE WALLS. INSIDE, THE CITY CLERK AWARDS THE COUNCIL'S COMMISSIONS. COMMISSIONS ARE THE QUICKEST WAY TO FAME AND FORTUNE.'",
  "'ON YOUR RIGHT IS ONE OF THE ENTRANCE'S TO SUNE'S TEMPLE. AS WITH ALL PHLAN'S TEMPLES, VARIOUS CLERICAL SERVICES ARE OFFERED INSIDE. ON YOUR LEFT IS AN ENTRANCE TO THE CITY PARK.'",
  "'BEYOND THIS GATE ARE THE MONSTER-RIDDEN AREAS OF THE OLD CITY WE ARE SLOWLY PREPARING FOR SETTLEMENT. THE COUNCIL OFFERS A GENEROUS REWARD TO THOSE WHO CLEAR AREAS OF MONSTERS.",
  "'OUR TOUR IS ENDED. AGAIN, LET ME URGE YOU TO APPLY TO THE CITY CLERK FOR A COMMISSION. GOOD-BYE AND GOOD FORTUNE.' (YOU ARE ON YOUR OWN NOW)",
];
const outsideCityHall = "YOU ARE OUTSIDE THE CITY HALL. THE CITY CLERK WAITS INSIDE TO AWARD COMMISSIONS.";
const proclamationsLead = "PROCLAMATIONS ARE POSTED ON THE WALLS, IN YOUR JOURNAL YOU NOTE";

/**
 * The first walk: Rolf's tour, City Hall and the clerk, the dock and the boat to Sokal Keep.
 * Saves the game in slot A of `saves` right after the tour, for the later tests to load.
 */
async function tourCityHallAndDock(saves) {
  const game = await startGame({ saves, seconds: 420 });
  try {
    await addReadyMadeParty(game);

    // acceptance.new-phlan.rolfs-tour, first part: the start square, the eight texts, the end square.
    await game.press("b");
    at(game, 15, 1, "A new game starts the party at E1 (15,1).");
    game.expect(/GREETINGS, COURAGEOUS ONES, I AM ROLF/, "Rolf greets the party on the start square.");
    await readOn(game, 20);
    printedInOrder(game, 0, tour, "Rolf's tour prints its eight texts in order and nothing else.");
    at(game, 0, 4, "The tour ends at E2 (0,4), the gate to the Slums.");

    // Save in slot A. The screens are the ones tools/verify-input.mjs requires.
    await game.press("e", /Camp: Save View Magic Rest Alter Exit/, "E makes camp.");
    await game.press("s", /Save Which Game: A B C D E F G H I J/, "S asks for a save slot.");
    await game.press("a", /Quit TO DOS Yes No/, "A saves to slot A.");
    await game.press("n", /Camp: Save View Magic Rest Alter Exit/, "N stays in the game.");
    await game.press("e", exploring, "E breaks camp.");

    // The City Hall entrance (location 26). The first row of the proclamation table is the only
    // one a new party can read, so acceptance.new-phlan.proclamations-by-tracker stays open.
    let mark = game.printed.length;
    await game.walk("EEE");
    lastPrinted(game, outsideCityHall, "The square west of the City Hall door describes the hall.");
    await game.press("enter");
    printedInOrder(game, mark, [outsideCityHall, proclamationsLead, "PROCLAMATIONS LXIV, LXXVIII, CIX, AND LIX."],
      "With no tracker quest done the wall shows proclamations LXIV, LXXVIII, CIX and LIX.");
    game.expect(exploring);

    // acceptance.new-phlan.city-hall-entry-hall: both texts print on the way to the clerk at (5,5).
    mark = game.printed.length;
    await game.walk("E");
    printedInOrder(game, mark, ["YOU ENTER THE CITY HALL. AS YOU FACE DOWN THE HALLWAY, YOU SEE A GUARDED DOOR."],
      "Entering City Hall by day prints the hallway text.");
    at(game, 4, 4, "The City Hall door is at (4,4).");
    mark = game.printed.length;
    await game.walk("S");
    printedInOrder(game, mark, ["YOU ARE OUTSIDE THE CLERK'S OFFICE. GUARDS POSTED AROUND A DOOR IN THE SOUTH WALL WATCH YOU CLOSELY."],
      "The square before the clerk's door prints the guarded-door text.");
    proved.push("acceptance.new-phlan.city-hall-entry-hall");

    // acceptance.new-phlan.first-commissions-reachable, the clerk: on the first visit she offers the
    // Slums, Sokal Keep, and third the reward for books.
    mark = game.printed.length;
    await game.walk("E");
    at(game, 5, 5, "The clerk is at location 29 (5,5).");
    await readOn(game);
    printedInOrder(game, mark, [
      "AT YOUR ENTRY, THE COUNCIL CLERK BEGINS LOOKING THROUGH A STACK OF PAPERS. 'BEFORE I CAN OFFER ANY COMMISSIONS, I MUST SEE IF YOU ARE DUE A CURRENT REWARD.",
      "THE CLERK SHUFFLES THROUGH HER PAPERS. 'ON THE MATTER OF COMMISSION,' SHE SAYS, 'I CAN OFFER THE FOLLOWING: '",
      "THE SLUMS IMMEDIATELY TO OUR WEST NEED TO BE CLEARED OF MONSTERS.'",
      "SOKAL KEEP ON THORN ISLAND MUST BE CLEARED.'",
      "THE COUNCIL IS OFFERING A REWARD FOR BOOKS, MAPS, TOMES, ETC. WHICH PROVIDE USEFUL INFORMATION ABOUT PHLAN BEFORE THE FALL. THE REWARD IS TIED TO THE VALUE OF THE INFORMATION.'",
      "'THESE ARE ALL OF THE COMMISSIONS CURRENTLY AVAILABLE.'",
    ], "The clerk checks for rewards, then offers the Slums, Sokal Keep and the books, and nothing else.");

    // Part of acceptance.new-phlan.clerk-offers-three (left open: rewards need finished missions).
    // Leaving the office and coming straight back: she says she can only repeat, and repeats nothing.
    mark = game.printed.length;
    await game.walk("WE");
    await readOn(game);
    printedInOrder(game, mark, [
      "YOU ARE OUTSIDE THE CLERK'S OFFICE. GUARDS POSTED AROUND A DOOR IN THE SOUTH WALL WATCH YOU CLOSELY.",
      "'BACK SO SOON? I CAN ONLY REPEAT THE EARLIER OFFERS: '",
      "'THESE ARE ALL OF THE COMMISSIONS CURRENTLY AVAILABLE.'",
    ], "On a second visit in the same stay the clerk names no commission again.");

    // acceptance.new-phlan.rolfs-tour, second part: leaving City Hall loads the New Phlan script
    // again (City Hall is its own script), and the tour does not start a second time.
    mark = game.printed.length;
    await game.walk("WNN");
    at(game, 4, 3, "The north door of City Hall leads back to the street.");
    game.expect(exploring, "Back in the street the party is free to walk: Rolf does not return.");
    assert.ok(!game.printed.slice(mark).some((text) => /ROLF|TOUR/.test(text)), "No tour text may print on re-entering New Phlan.");

    // acceptance.new-phlan.dock-before-sokal and the dock half of first-commissions-reachable.
    mark = game.printed.length;
    await game.walk("EEEEEENE");
    printedInOrder(game, mark, ["TO THE NORTH IS THE PASSENGER DOCK."], "The square south of the dock points to it.");
    mark = game.printed.length;
    await game.walk("N");
    at(game, 11, 1, "The harbor master is at location 2 (11,1).");
    await readOn(game);
    printedInOrder(game, mark, ["'BY ORDER OF THE CITY COUNCIL,' THE HARBOR MASTER SAYS, 'THE ONLY BOAT OUT IS GOING TO SOKAL KEEP. YOU CAN CATCH IT AT THE END OF THE PIER.'"],
      "Before Sokal Keep is cleared the harbor master offers one boat and no menu of destinations.");
    assert.ok(!/SOKAL EAST WEST BAY NONE/i.test(game.text()), "No destination menu may be shown.");
    await game.walk("EEE");
    const before = { purses: await game.purses(), clock: game.position() };
    mark = game.printed.length;
    await game.walk("E");
    at(game, 15, 1, "The boat is at the end of the pier, (15,1).");
    lastPrinted(game, "YOU BOARD A BOAT.", "Stepping onto the end of the pier boards the boat.");
    await readOn(game);
    // "THE BOAT DISEMBARKS YOU AT SOKAL KEEP." is what the game showed on arrival (Sokal Keep's script).
    printedInOrder(game, mark, ["YOU BOARD A BOAT.", "THE BOAT DISEMBARKS YOU AT SOKAL KEEP."], "The boat goes to Sokal Keep and nowhere else.");
    const after = { purses: await game.purses(), clock: game.position() };
    assert.deepEqual(after.purses, before.purses, "The boat to Sokal Keep is free: no character's coins change.");
    assert.equal(after.clock.hour * 60 + after.clock.minute, before.clock.hour * 60 + before.clock.minute + 1,
      "The crossing takes no game time: the clock shows only the one minute of the step onto the boat.");
    proved.push("acceptance.new-phlan.dock-before-sokal");
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
  } finally {
    game.close();
  }
}

/** Start the game on a copy of the saved directory and load slot A: the party stands at the gate, after the tour. */
async function loadAfterTour(saves, env) {
  const copy = mkdtempSync(join(tmpdir(), "por-acceptance-load-"));
  cpSync(saves, copy, { recursive: true });
  const game = await startGame({ saves: copy, env, seconds: 420 });
  const close = game.close;
  game.close = () => { close(); rmSync(copy, { recursive: true, force: true }); };
  try {
    game.expect(/Load Saved Game/, "The first menu offers to load a saved game.");
    await game.press("l", /Load Which Game: A/, "L asks which saved game to load.");
    const mark = game.printed.length;
    // acceptance.new-phlan.rolfs-tour, third part: a loaded game enters New Phlan again without the tour.
    // The game showed that loading goes straight to the map, with no party menu between.
    await game.press("a", exploring, "A loads slot A and puts the party straight into New Phlan: the tour does not repeat.");
    assert.equal(game.party().length, 6, "The saved party of six is back.");
    at(game, 0, 4, "The party is where it saved, at the gate (0,4).");
    assert.ok(!game.printed.slice(mark).some((text) => /ROLF|TOUR/.test(text)), "No tour text may print after loading.");
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

const temples = [
  // name, greeting, the route from the previous stop to the square before the door, the step through the door
  { name: "Sune", greeting: "YOU ARE WELCOMED BY PRIESTESS JOY OF SUNE.", route: "E", door: "N", at: [1, 3] },
  { name: "Tyr", greeting: "THE PRIESTS OF TYR WELCOME YOU TO THE TEMPLE.", route: "ENNEEESEEEEENE", door: "S", at: [11, 3] },
  { name: "Tempus", greeting: "THE PRIESTS OF TEMPUS BID YOU WELCOME.", route: "WSWWWSSSSSSSSWWWWWWW", door: "S", at: [0, 12] },
];
// The nine services and their prices in gold, from acceptance.mechanics.temple.services ([P] §4).
const services = [
  ["Cure Blindness", 1000], ["Cure Disease", 1000], ["Cure Light Wounds", 100], ["Cure Serious Wounds", 350],
  ["Cure Critical Wounds", 600], ["Neutralize Poison", 1000], ["Raise Dead", 5500], ["Remove Curse", 3500], ["Stone to Flesh", 2000],
];

/** acceptance.new-phlan.temples: the three temples greet, ask, send away on NO, and sell the same nine cures. */
async function threeTemples() {
  const game = await newParty();
  try {
    const offered = {};
    for (const temple of temples) {
      await game.walk(temple.route);
      const outside = game.position();
      let mark = game.printed.length;
      await game.walk(temple.door);
      at(game, ...temple.at, `The Temple of ${temple.name} is entered at (${temple.at}).`);
      printedInOrder(game, mark, [temple.greeting, "' DO YOU SEEK HEALING?'"], `The Temple of ${temple.name} greets the party and asks.`);
      game.expect(/Yes No\s*$/, "The question is a Yes/No menu.");
      // NO: the priests send the party back out of the door.
      await game.press("n");
      lastPrinted(game, "THEN YOU MUST LEAVE.", "NO is answered with 'THEN YOU MUST LEAVE.'");
      at(game, outside.x, outside.y, "NO puts the party back outside the temple door.");
      // YES: the temple services menu, then the list of cures and what each costs.
      await game.walk(temple.door);
      await game.press("y", /Heal View Pool Appraise Exit\s*$/, "YES opens the temple services menu.");
      await game.press("h", /how can we help you\?/, "Heal lists the cures.");
      const list = game.rows().map((row) => row.trim()).filter(Boolean);
      const names = list.slice(list.findIndex((row) => /how can we help you/.test(row)) + 1, list.indexOf("Exit"));
      assert.deepEqual(names, services.map(([name]) => name), `The Temple of ${temple.name} lists the nine cures.`);
      const prices = [];
      for (const [name] of services) {
        await game.press("h");
        // A healthy character is told so and asked whether to cast anyway; then the price is named.
        for (let asked = 0; !/pay for cure Yes No\s*$/.test(game.text()); asked++) {
          if (asked >= 3 || !/anyway: Yes No\s*$/.test(game.text())) game.fail(`${name} did not come to its price.`);
          await game.press("y");
        }
        const price = new RegExp(`${name} will only cost (\\d+) gold pieces\\.`).exec(flat(game.text()));
        if (!price) game.fail(`The temple did not name the price of ${name}.`);
        prices.push([name, +price[1]]);
        await game.press("n", /Heal Exit\s*$/, "NO declines the cure.");
        await game.press("end");
      }
      offered[temple.name] = prices;
      await game.press("e", /Heal View Pool Appraise Exit\s*$/, "Exit leaves the list of cures.");
      await game.press("e", exploring, "Exit leaves the temple services.");
      await game.walk({ N: "S", S: "N" }[temple.door]);
    }
    assert.deepEqual(offered.Sune, services, "The prices are the ones the scenario for temple services gives.");
    assert.deepEqual(offered.Tyr, offered.Sune, "Tyr and Sune offer the same services at the same prices.");
    assert.deepEqual(offered.Tempus, offered.Sune, "Tempus and Sune offer the same services at the same prices.");
    proved.push("acceptance.new-phlan.temples");
  } finally {
    game.close();
  }
}

/** Make camp where the party stands and rest one hour. Returns when the game stops the rest or it ends. */
async function campAndRestAnHour(game) {
  await game.press("e", /Camp: Save View Magic Rest Alter Exit\s*$/, "E makes camp.");
  await game.press("r", /Rest Time: 00:00:00/, "Rest asks how long.");
  await game.press("h");
  await game.press("i", /Rest Time: 00:01:00/, "Hours, Inc sets one hour.");
  await game.press("r");
}
const rousted = "YOU ARE ROUSTED BY THE CITY WATCH AND TOLD TO MOVE ALONG. WHAT DO YOU DO?";
/** A fight has begun when the game shows a character's combat menu (Cast is there only for a spell caster). */
const fighting = (game) => /Hitpoints \d+ AC -?\d+ .*Move View Aim Use .*Quick Done\s*$/.test(game.text());

/**
 * acceptance.new-phlan.guard-trigger-resting-outside. `route` leads from the gate to the square to
 * camp on; `refuse` is the menu word that refuses to move along (STAY in the streets, FIGHT in the
 * training block, which is its own script).
 */
async function rousting(saves, { route, enter = [], menu, refuse }) {
  const game = await loadAfterTour(saves);
  try {
    await game.walk(route);
    for (const text of enter) lastPrinted(game, text, "Entering the block prints its notice.");
    const where = game.position();
    const hp = game.party().map(({ hp }) => hp);
    let mark = game.printed.length;
    await campAndRestAnHour(game);
    printedInOrder(game, mark, [rousted], "Resting outside an inn brings the city watch.");
    if (game.menu() !== menu) game.fail(`The watch's menu is not "${menu}".`);
    // GO: the party moves on with no fight. It is awake on the same square, unhurt.
    await game.press("g", exploring, "GO ends the encounter.");
    at(game, where.x, where.y, "GO leaves the party where it camped.");
    assert.deepEqual(game.party().map(({ hp }) => hp), hp, "GO costs no hit points: there was no fight.");
    assert.ok(game.position().hour * 60 + game.position().minute < where.hour * 60 + where.minute + 60, "The hour of rest was cut short.");
    // Refusing: the city guard fight starts. The test stops there; the fight is guard-fight's.
    mark = game.printed.length;
    await campAndRestAnHour(game);
    printedInOrder(game, mark, [rousted], "A second rest brings the watch again.");
    await game.press(refuse[0].toLowerCase());
    if (!fighting(game)) game.fail(`${refuse} did not start a fight.`);
  } finally {
    game.close();
  }
}

const tavernIntro = "YOU ARE IN A TAVERN. THE AIR IS FILLED WITH SMOKE AND GOSSIP. PEOPLE ARE GAMBLING AT THE TABLES.";
const gambleRules = "'THE GAME WORKS LIKE THIS. WE SPIN THIS TOP. IF THE GREEN SIDE COMES UP, YOU GET DOUBLE YOUR MONEY BACK. IF A BLUE SIDE COMES UP, YOU GET YOUR MONEY BACK. IF A RED SIDE COMES UP, YOU LOSE.'";
const wagerPrompt = "HOW MANY PLATINUM PIECES WILL YOU WAGER? (HOUSE LIMIT IS 1000)";
// What each result line does to the gambler's platinum, per wager (the scenario's `expect`).
const spins = { "IT'S GREEN. YOU GET DOUBLE YOUR MONEY BACK.": 1, "IT'S BLUE. YOU WIN.": 0, "RED. SORRY, YOU LOSE.": -1 };

/**
 * Walk into the tavern at (10,8) from the square north of it and go on to the gambling question.
 * A pickpocket may strike first (26 in 256); the test lets it pass and says so in the result.
 */
async function enterTavern(game) {
  const mark = game.printed.length;
  await game.walk("S");
  at(game, 10, 8, "The tavern is entered at (10,8).");
  let pickpocket = false;
  for (let screens = 0; !/DOES ANYONE WANT TO GAMBLE\? Yes No\s*$/.test(game.text()); screens++) {
    if (screens >= 6) game.fail("The tavern did not come to its gambling question.");
    if (/Ignore Grab\s*$/.test(game.text())) { pickpocket = true; await game.press("i"); }
    else if (pressReturn.test(game.text())) { pickpocket ||= /PICKPOCKET/.test(game.text()); await game.press("enter"); }
    else game.fail("The tavern showed something this test does not know.");
  }
  assert.equal(flat(game.printed[mark]), tavernIntro, "Entering the tavern prints its description first.");
  return { pickpocket };
}

/** Type a number at the game's number prompt and confirm it. */
async function typeNumber(game, number) {
  for (const digit of String(number)) await game.press(digit);
  await game.press("enter");
}

/**
 * acceptance.new-phlan.tavern-gamble and acceptance.new-phlan.tavern-tales, in the tavern at (10,8).
 * Runs with the dice trace on: the trace names the range of every draw.
 */
async function tavern() {
  const game = await newParty({ env: { POR_TRACE_DICE: "1" } });
  try {
    await game.walk("EENNEEESEESSSSEEE");
    const gambler = "THRENDER";

    // Gamble. THRENDER GRONE pays; the test reads his platinum from his sheet before and after.
    let purse = (await game.purses())[`${gambler} GRONE`].Platinum ?? 0;
    assert.ok(purse >= 2, `${gambler} needs platinum to gamble; his sheet shows ${purse}.`);
    await enterTavern(game);
    let mark = game.printed.length;
    await game.press("y");
    printedInOrder(game, mark, [gambleRules], "YES explains the game with the top.");
    await game.press("enter", /WHO WILL GAMBLE\? Select\s*$/, "The game asks who will gamble.");
    await game.highlight(gambler);
    await game.press("s");
    const outcomes = new Set();
    // Three refused wagers, then wagers of 1 platinum until all three colours have come up.
    const wagers = [0, purse + 1, 1001];
    for (let round = 0; round < 40; round++) {
      game.expect(new RegExp(`YOU HAVE ${purse} PP\\.`), "Each round starts by showing the gambler's platinum.");
      await game.press("enter");
      lastPrinted(game, wagerPrompt, "The game asks for a wager and names the house limit.");
      const wager = wagers[round] ?? 1;
      const draws = (await game.dice()).length;
      mark = game.printed.length;
      await typeNumber(game, wager);
      const result = flat(game.printed[mark] ?? "");
      if (round < 3) {
        // No wager, more than he holds, more than the house limit of 1000.
        assert.equal(result, "I CAN'T ACCEPT THAT WAGER.", `A wager of ${wager} with ${purse} platinum must be refused.`);
        assert.equal((await game.dice()).length, draws, "A refused wager spins nothing.");
      } else {
        if (!(result in spins)) game.fail(`The spin gave a result this test does not know: ${result}`);
        // The spin is one draw from ten numbers. The script (ECL3.DAX block 0 at a58d) makes 8 and 9
        // green, 3 to 7 blue and 0 to 2 red: 20%, 50% and 30%.
        assert.deepEqual((await game.dice()).slice(draws).map(({ range }) => range), [10], "A spin is one draw from ten numbers.");
        purse += spins[result] * wager;
        outcomes.add(result);
      }
      // Version 1.3 goes on to "WILL YOU GO AGAIN?" after a refused wager as after a spin.
      await game.press("enter", /WILL YOU GO AGAIN\? Yes No\s*$/, "After the result the game asks whether to go again.");
      const done = round >= 3 && (outcomes.size === 3 || purse === 0);
      mark = game.printed.length;
      await game.press(done ? "n" : "y");
      if (done) break;
    }
    assert.equal(outcomes.size, 3, `Green, blue and red must each come up; the spins gave ${[...outcomes].join(" / ")}`);
    // NO ends the visit: no tale, no brawl.
    game.expect(exploring, "Declining another spin ends the tavern visit.");
    assert.deepEqual(game.printed.slice(mark), [], "A visit where someone gambled prints nothing more: no tale and no brawl.");
    assert.equal((await game.purses())[`${gambler} GRONE`].Platinum ?? 0, purse, "The gambler's sheet shows the platinum the spins left him.");
    proved.push("acceptance.new-phlan.tavern-gamble");

    // Tales. Leave and come back, decline to gamble, read the number. A visit can end in a brawl
    // (1 in 4 after a tale); the test stops visiting there and does not fight.
    const tales = [];
    for (let visit = 0; visit < 12; visit++) {
      await game.walk("N");
      await enterTavern(game);
      const draws = (await game.dice()).length;
      mark = game.printed.length;
      await game.press("n");
      const [lead, number] = game.printed.slice(mark);
      assert.equal(lead, "YOU OVERHEAR TAVERN TALE ", "Declining to gamble, the party overhears a tale.");
      // Only the number is shown: the dialogue area holds this one line.
      const shown = game.rows().slice(game.rows().findIndex((row) => /^\s*\d+,\d+ [NESW] \d\d:\d\d/.test(row)) + 1, 24).map(flat).filter(Boolean);
      assert.deepEqual(shown, [`YOU OVERHEAR TAVERN TALE ${number}`], "The game shows the tale's number and no text of the tale.");
      assert.ok(/^\d+$/.test(number) && +number >= 1 && +number <= 23, `Tavern tale ${number} is not one of the 23 in the Adventurer's Journal.`);
      // The tale is the first draw after the answer, from 23 numbers (0 to 22), plus one: never 24.
      assert.equal((await game.dice())[draws]?.range, 23, "The tale number is drawn from 23 numbers.");
      tales.push(+number);
      await game.press("enter");
      if (/A DRUNKEN BRAWL BREAKS OUT/.test(game.text())) break;
      game.expect(exploring, "After the tale the party is free to walk.");
    }
    assert.ok(tales.length >= 3, `At least three tales must be heard before a brawl; heard ${tales.join(", ")}.`);
    console.log(`tavern tales heard: ${tales.join(", ")}`);
    proved.push("acceptance.new-phlan.tavern-tales");
  } finally {
    game.close();
  }
}

/**
 * The west gate half of acceptance.new-phlan.first-commissions-reachable: walking west out of the
 * gate at (0,4) puts the party in the Slums, with no other block between.
 */
async function westGate(saves) {
  const game = await loadAfterTour(saves);
  try {
    await game.face("W");
    const mark = game.printed.length;
    await game.press("up");
    await readOn(game);
    // The arrival text is what the game showed (the Slums' own script); the scenario only names the area.
    printedInOrder(game, mark, ["YOU HAVE ENTERED THE MONSTER-CRAWLING SLUMS OF PHLAN. SMALL, UGLY THINGS SCURRY FROM BENEATH YOUR FEET. IN THE DISTANCE, AN ALARM SOUNDS."],
      "One step west from the gate enters the Slums.");
  } finally {
    game.close();
  }
}

/** Walk into a shop, accept the offer and return the Buy list as [[item, price in gold]]. Leaves the shop. */
async function shopList(game, door, greeting) {
  const mark = game.printed.length;
  await game.walk(door);
  printedInOrder(game, mark, [greeting], "The shopkeeper greets the party.");
  await game.press("y", /Buy View Pool Appraise Exit\s*$/, "YES opens the shop menu.");
  await game.press("b", /Items: Buy Exit\s*$/, "Buy lists the stock.");
  const rows = game.rows().map((row) => row.trim());
  const stock = rows.slice(rows.indexOf("Shop") + 1, 24).filter(Boolean).map((row) => {
    const item = /^(.*\S)\s+(\d+)$/.exec(row);
    if (!item) game.fail(`The stock list has a row that is not an item and a price: ${row}`);
    return [item[1], +item[2]];
  });
  await game.press("e", /Buy View Pool Appraise Exit\s*$/, "Exit leaves the list.");
  await game.press("e", exploring, "Exit leaves the shop.");
  return stock;
}

/**
 * Part of acceptance.new-phlan.shops, which stays open (buying, selling and identifying need money
 * and goods): by day the general store and the silver shop greet the party and show their stock.
 */
async function shopStock() {
  // A new party, not the loaded game: in a loaded game the first Buy list opens scrolled down by
  // one item (reported as a finding; the original has not been checked for it).
  const game = await newParty();
  try {
    await game.walk("EENNEEESEESSSSSSSSSEEENN");
    const general = await shopList(game, "W", "THE SHOPKEEPER GREETS YOU AND OFFERS YOU ITEMS FOR SALE. 'CAN I SHOW YOU SOMETHING?'");
    at(game, 9, 10, "This general store is entered at (9,10).");
    // General store stock: mirrors, holy symbols, flasks of oil, vials of holy water.
    for (const [item] of general) assert.match(item, /Mirror$|Holy Symbol Of (Tyr|Tempus|Sune)$|Flask of Oil$|Holy Water vial$/, `The general store sells something else: ${item}`);
    for (const kind of [/Mirror$/, /Holy Symbol/, /Flask of Oil$/, /Holy Water vial$/]) assert.ok(general.some(([item]) => kind.test(item)), `The general store has no ${kind}.`);
    await game.walk("ENE");
    const silver = await shopList(game, "S", "THE SHOP SELLS SILVER ITEMS. 'WOULD YOU LIKE TO SEE OUR SELECTION?'");
    at(game, 11, 10, "This silver shop is entered at (11,10).");
    // Silver shop stock: silver weapons and armor, and the Fine Composite Long Bow at 25000 gold.
    assert.deepEqual(silver.find(([item]) => item === "Fine Composite Long Bow"), ["Fine Composite Long Bow", 25000], "The silver shop sells the Fine Composite Long Bow for 25000 gold.");
    for (const [item] of silver) assert.match(item, /^(\d+ )?Silver |^Fine Composite Long Bow$/, `The silver shop sells something that is neither silver nor the bow: ${item}`);
    // The game showed a Silver Ring in this list: the one piece of silver jewelry the Clue Book speaks of.
    assert.ok(silver.some(([item]) => item === "Silver Ring"), "The silver shop sells a Silver Ring.");
    return { general, silver };
  } finally {
    game.close();
  }
}

const tests = {
  shops: shopStock,
  // The first walk also makes the saved game the later tests load.
  walk: () => tourCityHallAndDock(saves),
  temples: threeTemples,
  tavern,
  street: () => rousting(saves, { route: "E", menu: "Go Stay", refuse: "Stay" }),
  training: () => rousting(saves, {
    route: "EENNEEEE", menu: "Go Fight", refuse: "Fight",
    enter: ["NOTICES FOR TEACHERS AND STUDENTS ARE POSTED ON THE WALLS. A NOTE DIRECTS MAGIC USERS AND CLERICS TO GO NORTH AND FIGHTERS AND 'ROGUES' TO GO EAST."],
  }),
  gate: () => westGate(saves),
  // Only the opening and the save, for working on one test that loads it: "save street".
  save: async () => {
    const game = await newParty({ saves });
    try {
      await game.press("e"); await game.press("s"); await game.press("a", /Quit TO DOS Yes No/); await game.press("n");
    } finally { game.close(); }
  },
};
// Scenarios that take more than one of the tests above.
const combined = {
  // The tour, then no tour on coming back out of City Hall (walk) and none after loading (street).
  "acceptance.new-phlan.rolfs-tour": ["walk", "street"],
  // The clerk's first offers and the one boat (walk), and the gate into the Slums (gate).
  "acceptance.new-phlan.first-commissions-reachable": ["walk", "gate"],
  // GO / STAY in the streets and GO / FIGHT in the training block.
  "acceptance.new-phlan.guard-trigger-resting-outside": ["street", "training"],
};
const wanted = process.argv.slice(2);
const saves = mkdtempSync(join(tmpdir(), "por-acceptance-new-phlan-"));
const passed = new Set();
const run = async (name) => { const result = await tests[name](); passed.add(name); return result; };
try {
  if (wanted.length) {
    // Named tests, one after another, for working on one of them.
    for (const name of wanted) console.log(name, (await run(name)) ?? "");
  } else {
    // Each test has its own game, so they run side by side. The ones that load wait for the save.
    const saved = run("walk");
    saved.catch(() => {});
    await Promise.all([saved, run("temples"), run("tavern"), run("shops"),
      ...["street", "training", "gate"].map((name) => saved.then(() => run(name)))]);
  }
  for (const [scenario, needs] of Object.entries(combined)) if (needs.every((name) => passed.has(name))) proved.push(scenario);
  console.log(`proved ${proved.length} New Phlan scenarios:\n  ${proved.sort().join("\n  ")}`);
} finally {
  rmSync(saves, { recursive: true, force: true });
}
