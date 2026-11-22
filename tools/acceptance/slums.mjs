// Acceptance tests for the Slums, from qa/acceptance/01-slums.json.
//
//   npm run acceptance:slums            every test
//   npm run acceptance:slums -- orcs    named tests, one after another
//
// Each block proves one scenario of that file on the game itself: GOG version 1.3, with SSI's six
// ready-made characters as they come (armed and armored), normal input and the fixed dice of a
// replay. Fights are fought with the game's own commands and real dice: a test reacts to what the
// screen shows and never counts presses, and a lost fight fails the test with the screen.
//
// Where an expectation is not the scenario's own, the comment says where it comes from. "The
// script" is the Slums script, ECL2.DAX block 20, read with src/lib/ecl.ts
// (`npx tsx tools/cli.ts disasm` writes it to out/ecl.txt); addresses are the script's.
//
// Squares are (x,y) on the Slums map as the game prints them. Routes are spelled as headings and
// every square of a route must be reached. A random encounter can turn up on any step outside a
// room (one draw from 14 numbers, the script at 9b3a), so a walk goes through `walkFighting`.

import assert from "node:assert/strict";
import { addReadyMadeParty, beginAdventuring, exploring, pressReturn, startGame } from "./harness.mjs";

const proved = [];
const flat = (text) => text.replace(/\s+/g, " ").trim();

// Script variables (the script keeps its lasting state in them; none of it is on screen).
/** Clear points: one for each fight the script credits, 254 once the block is cleared (b69c). */
const clearPoints = 0x4abb;
/** 255 once the fight with the orcs at (13,1) has been fought (9e6d). */
const orcsFought = 0x4aca;
/** Random encounters beaten (b12a). */
const randomFights = 0x4a80;

const entryText = "YOU HAVE ENTERED THE MONSTER-CRAWLING SLUMS OF PHLAN. SMALL, UGLY THINGS SCURRY FROM BENEATH YOUR FEET. IN THE DISTANCE, AN ALARM SOUNDS.";
/** The menu of a random encounter: Advance when the monsters are far, Parlay when they are near. */
const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
/** The treasure menu after a won fight. */
const treasureMenu = /View Take Pool Share Exit\s*$/;
// The five squares a flight ends on, in the order of the script's tables at b6f2 (x) and b6f7 (y).
// The scenario acceptance.slums.flee-squares gives the same five.
const fleeSquares = [[15, 4], [14, 6], [11, 5], [11, 2], [9, 2]];

function at(game, x, y, why) {
  const where = game.here();
  if (!where || where.x !== x || where.y !== y) game.fail(`${why}\nThe party is not at ${x},${y}.`);
}
/** Require the game to have printed exactly these texts, in this order, since `from`. */
function printedInOrder(game, from, expected, why) {
  const got = game.printed.slice(from).map(flat);
  assert.deepEqual(got, expected.map(flat), `${why}\nThe game printed:\n${got.join("\n")}`);
}

/** Start a game with the six ready-made characters, go through the opening and step west into the Slums. */
async function enterSlums(options) {
  const game = await startGame({ seconds: 500, watch: [clearPoints, orcsFought, randomFights], ...options });
  try {
    await addReadyMadeParty(game);
    await beginAdventuring(game);
    // The opening leaves the party at the west gate of New Phlan, (0,4), facing west.
    at(game, 0, 4, "Rolf's tour ends at the gate to the Slums.");
    await game.face("W");
    await game.press("up");
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

/**
 * After a won fight: read on to the treasure menu, if there is treasure, and leave it; then on to
 * the exploration menu. Takes nothing. Returns true when there was treasure.
 */
async function leaveFight(game) {
  let treasure = false;
  for (let presses = 0; !exploring.test(game.menu()); presses++) {
    if (presses >= 12) game.fail("The end of the fight did not lead back to the exploration menu.");
    if (treasureMenu.test(game.menu())) { treasure = true; await game.press("e"); }
    else if (/^(?:Take: (?:Money )?(?:Items )?Exit|Items: Take Exit)$/.test(game.menu())) await game.press("e");
    // "There is still treasure left. Do you want to go back and claim your treasure?"
    else if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
    else if (/press <enter>\/<return> to continue\s*$/i.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu())) await game.press("enter");
    else game.fail("After the fight the game shows something this test does not know.");
  }
  return treasure;
}

/**
 * Walk a route in the open Slums. A step can be met by a random encounter: the party fights it
 * (Combat, then Quick for everyone), must win, leaves the treasure and goes on from the square the
 * game left it on. Returns how many encounters were fought.
 */
async function walkFighting(game, route) {
  let fights = 0;
  for (const heading of route) {
    for (let tries = 0; ; tries++) {
      if (tries >= 4) game.fail(`Four tries did not take the party one step ${heading}.`);
      await game.face(heading);
      const from = game.here();
      await game.press("up");
      for (let screens = 0; pressReturn.test(game.menu()) && /YOU ARE SURPRISED BY/.test(game.text()); screens++) {
        if (screens >= 3) game.fail("The surprise did not lead to a fight.");
        await game.press("enter");
      }
      if (encounterMenu.test(game.menu())) await game.startFight("c");
      if (game.inFight()) {
        await game.win();
        await leaveFight(game);
        fights++;
      }
      const to = game.here();
      if (to && (to.x !== from.x || to.y !== from.y)) break;
    }
  }
  return fights;
}

/**
 * acceptance.slums.enter-from-new-phlan: one step west from the New Phlan gate at (0,4) puts the
 * party in the Slums (script 20) at (15,4), and while the block is not cleared the game prints
 * the entry text with the alarm.
 */
async function entry() {
  const game = await enterSlums();
  try {
    printedInOrder(game, game.printed.length - 1, [entryText], "Entering the uncleared Slums prints the entry text with the alarm.");
    assert.deepEqual(game.square(), { area: 20, x: 15, y: 4, facing: "W" }, "The party arrives in the Slums, area 20, at E1 (15,4).");
    game.expect(exploring, "The party is free to walk: the entry asks for nothing.");
    // The block is uncleared: the script's clear points are below 254, the value it stores when
    // the block is cleared (b6b5), and the entry text is printed only below it (9aa9).
    assert.equal(game.variable(clearPoints), 0, "A new game has no clear points in the Slums.");
    // Back through the gate and in again: the text is printed on every entry while the block is uncleared.
    await game.face("E");
    let mark = game.printed.length;
    await game.press("up");
    // The gate's notice is New Phlan's own text (what the game showed; ECL3.DAX block 0).
    printedInOrder(game, mark, ["YOU ARE BY THE GATEWAY TO THE UNSETTLED AREAS. THE CITY WATCH EYES YOU SUSPICIOUSLY."],
      "East from (15,4) leads back to the New Phlan gate.");
    at(game, 0, 4, "The party is back at the New Phlan gate, (0,4).");
    await game.face("W");
    mark = game.printed.length;
    await game.press("up");
    printedInOrder(game, mark, [entryText], "Entering the uncleared Slums a second time prints the entry text again.");
    assert.deepEqual(game.square(), { area: 20, x: 15, y: 4, facing: "W" });
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    proved.push("acceptance.slums.enter-from-new-phlan");
  } finally {
    game.close();
  }
}

/** Make camp where the party stands and rest `days` whole days. Returns when the rest ends or is interrupted. */
async function restDays(game, days) {
  await game.press("e", /Camp: Save View Magic Rest Alter Exit\s*$/, "E makes camp.");
  await game.press("r", /Rest Time: 00:00:00/, "Rest asks how long.");
  await game.press("y");
  for (let day = 1; day <= days; day++) await game.press("i", new RegExp(`Rest Time: 0${day}:00:00`), "daYs, Inc adds one day.");
  await game.press("r");
}

/**
 * acceptance.slums.orcs-arguing-over-papers: the set fight at location 1, (13,1), fought with the
 * game's own commands. The route from the entrance was read from the map (GEO block 20): south
 * through the door at (14,4), west through the door at (14,7), north up the lane at x=13, east
 * through the door at (13,2), north, and west through the door into the room.
 */
async function orcs() {
  const game = await enterSlums();
  try {
    await walkFighting(game, "WSSSWNNNNNEN");
    at(game, 14, 1, "The square east of the orcs' room is (14,1).");
    assert.equal(game.variable(orcsFought), 0, "The orcs have not been fought yet.");
    const before = { points: game.variable(clearPoints), party: game.party() };
    await game.face("W");
    let mark = game.printed.length;
    await game.press("up");
    at(game, 13, 1, "Location 1 is (13,1).");
    printedInOrder(game, mark, ["SEVERAL ORCS ARE ARGUING OVER SOME PAPERS."], "Entering the room prints the orcs' text.");
    game.expect(pressReturn, "The text waits for return before the fight.");

    // The fight: 1 ORC (#13) and 3 ORC (#4). Both kinds are named ORC on screen, so Aim must list
    // four combatants named ORC beside the six characters, and nobody else.
    await game.startFight("enter");
    const listed = await game.combatants();
    assert.equal(listed.filter(({ name }) => name === "ORC").length, 4, `The fight is against four orcs; Aim listed ${listed.map(({ name }) => name).join(", ")}.`);
    assert.deepEqual(listed.map(({ name }) => name).filter((name) => name !== "ORC").sort(), before.party.map(({ name }) => name).sort(),
      "Apart from the orcs, the combatants are the six characters.");
    // Each character attacks an orc it can reach with Aim and Target; one that can reach none is
    // left to Quick. Which orcs are in reach, and what the dice give, is the game's business.
    let aimed = 0;
    const { xp } = await game.win({
      turn: async (game) => {
        const target = await game.aim(({ name }) => name === "ORC");
        if (target) aimed++; else await game.press("q");
      },
    });
    assert.equal(xp, 77, "Each of the six characters gains 77 experience points.");
    console.log(`orcs: won with ${aimed} aimed attacks`);

    // The treasure: one item, the clerical scroll. The game names it by its number of spells.
    await game.press("enter", treasureMenu, "A won fight with loot leads to the treasure menu.");
    await game.press("t", /Take: (?:Money )?Items Exit\s*$/, "Take offers the items.");
    await game.press("i", /Items: Take Exit\s*$/, "Items lists the loot.");
    const loot = game.rows().map((row) => row.trim()).filter(Boolean);
    assert.deepEqual(loot.slice(loot.indexOf("Loot") + 1, -1), ["Clerical Scroll With 2 Spells"], "The loot is one clerical scroll with two spells.");
    await game.press("e");
    await leaveFight(game);
    at(game, 13, 1, "After the fight the party stands in the room.");

    // One clear point is credited, and the script marks the fight as fought (9e6d, b69c).
    assert.equal(game.variable(orcsFought), 255, "The script records the orcs' fight as fought.");
    assert.equal(game.variable(clearPoints), before.points + 1, "The fight credits exactly one clear point.");

    // Resting in this room is now safe. Outside a room each two hours of rest have a 24% chance of
    // an interruption (the scenario acceptance.slums.resting), so three whole days undisturbed,
    // 36 such chances, would happen by luck about once in 20,000 tries. The script gives the rule:
    // a rest is safe on a square that has an event of its own, as this room has (9a24).
    const clock = game.position();
    await restDays(game, 3);
    game.expect(/Camp: Save View Magic Rest Alter Exit\s*$/, "Three days of rest in the beaten room end in camp, undisturbed.");
    assert.deepEqual([game.position().hour, game.position().minute], [clock.hour, clock.minute], "Three whole days have passed: the clock shows the same time of day.");
    await game.press("e", exploring, "E breaks camp.");
    // Walking back in starts no second fight.
    await game.walk("E");
    mark = game.printed.length;
    await game.walk("W");
    printedInOrder(game, mark, [], "The beaten room is silent on a second visit.");
    game.expect(exploring);
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
  } finally {
    game.close();
  }
}

// From each flee square, a neighbouring square with no wall between (read from the map, GEO block 20).
const besideFleeSquare = { "15,4": "W", "14,6": "N", "11,5": "S", "11,2": "E", "9,2": "E" };
const opposite = { N: "S", E: "W", S: "N", W: "E" };

/**
 * acceptance.slums.flee-squares: fleeing a random encounter puts the party on one of five squares.
 * The test walks with Search on until encounters come, flees each one that offers Flee, and reads
 * where the party stands. With the dice trace it also checks which of the five: the script draws
 * a number from five (b22b) and takes the square from its tables.
 *
 * Most encounters do not end in a flight: the monsters run first, or the party is surprised and
 * must fight. Each forced fight costs the party hit points, so the test stops at two flights.
 */
async function flee() {
  const game = await enterSlums({ env: { POR_TRACE_DICE: "1" } });
  try {
    await game.press("s");
    assert.equal(game.position()?.mode, "search", "S turns Search on: the status line says so.");
    const flights = [];
    let steps = 0, encounters = 0, fights = 0, stayed = 0;
    // The party steps off a flee square onto the square beside it and back again, over and over.
    // `back` is the heading home while it stands on the square beside.
    let back;
    // POR_SLUMS_FLIGHTS asks for more flights than two, for looking at where they land.
    const wantedFlights = Number(process.env.POR_SLUMS_FLIGHTS ?? 2);
    while (flights.length < wantedFlights) {
      if (steps >= 200) game.fail(`200 steps with Search on gave only ${flights.length} flights.`);
      const here = game.here();
      const heading = back ?? besideFleeSquare[`${here.x},${here.y}`];
      if (!heading) game.fail(`The party stands on ${here.x},${here.y}, which is not one of the five flee squares.`);
      await game.face(heading);
      const draws = (await game.dice()).length;
      await game.press("up");
      steps++;
      back = back ? undefined : opposite[heading];
      const drawn = (await game.dice()).slice(draws);
      const met = encounterMenu.test(game.menu()) || /YOU ARE SURPRISED BY/.test(game.text());
      // The script's rule for a step on a square with no event of its own (9b3a to 9b67): one
      // draw from 14 numbers, plus 4 with Search on, and an encounter when the sum is over 12.
      if (drawn[0]?.range === 14) assert.equal(met, drawn[0].value + 4 > 12, `The step drew ${drawn[0].value} from 14 with Search on.`);
      else assert.equal(met, false, "A step that draws no encounter number meets no encounter.");
      if (!met) continue;
      encounters++;
      if (encounterMenu.test(game.menu())) {
        const before = (await game.dice()).length;
        const stood = game.here();
        await game.press("f");
        if (exploring.test(game.menu()) && (/The monsters flee\./.test(game.text()) || flat(game.printed.at(-1) ?? "") === "YOU HIDE.")) {
          // No flight of the party's: the monsters ran first ("The monsters flee."), or the party
          // had surprised them and Flee is answered with "YOU HIDE." (the script at 9e08 and
          // b21a). Either way the party stays where it is.
          at(game, stood.x, stood.y, "When the monsters flee or the party hides, the party stays on its square.");
          stayed++;
          continue;
        }
        // A flight draws the way the party will face, from four numbers, and then the square, from
        // five (b225, b22b). The square it lands on is then entered like any other (b24c), so the
        // draw for an encounter there follows, and an encounter can meet the party on arrival.
        const after = (await game.dice()).slice(before);
        const flight = after.findIndex(({ range }, index) => range === 4 && after[index + 1]?.range === 5);
        if (flight < 0 && exploring.test(game.menu())) game.fail("Flee ended the encounter with no flight, no hiding and no monsters fleeing.");
        if (flight >= 0) {
          const [facing, square] = after.slice(flight);
          if (process.env.POR_ACCEPTANCE_TRACE === "1") console.error(`flight draws: ${JSON.stringify(after)}`);
          const where = game.here();
          assert.deepEqual([where.x, where.y], fleeSquares[square.value], `The flight drew square ${square.value} of the script's table.`);
          assert.equal(where.facing, "NESW"[facing.value], `The flight drew facing ${facing.value}.`);
          flights.push([where.x, where.y, `from ${stood.x},${stood.y}, drew square ${square.value} and facing ${facing.value}`]);
          back = undefined;
          if (exploring.test(game.menu())) continue;
        }
      }
      // The party was surprised, or the monsters caught it: fight, and go on from where the fight ends.
      for (let screens = 0; pressReturn.test(game.menu()); screens++) {
        if (screens >= 3) game.fail("The encounter did not lead to a fight.");
        await game.press("enter");
      }
      if (encounterMenu.test(game.menu())) await game.startFight("c");
      if (!game.inFight()) game.fail("The encounter led neither to a flight nor to a fight.");
      const { outcome } = await game.fight();
      if (outcome === "lost") game.fail("The party lost a random fight.");
      await leaveFight(game);
      fights++;
    }
    if (process.env.POR_ACCEPTANCE_TRACE === "1") console.error(`all draws: ${JSON.stringify(await game.dice())}`);
    for (const [x, y] of flights) assert.ok(fleeSquares.some(([fx, fy]) => fx === x && fy === y), `The party fled to ${x},${y}, which is not one of the five squares.`);
    console.log(`flee: ${flights.length} flights to ${flights.map(([x, y, how]) => `(${x},${y}) ${how}`).join("; ")} in ${steps} steps, ${encounters} encounters, ${fights} fights, ${stayed} encounters where the monsters fled or the party hid`);
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    proved.push("acceptance.slums.flee-squares");
  } finally {
    game.close();
  }
}

const tests = { entry, orcs, flee };
const wanted = process.argv.slice(2);
for (const name of wanted) if (!(name in tests)) throw new Error(`No test named ${name}. The tests are: ${Object.keys(tests).join(", ")}.`);
if (wanted.length) {
  for (const name of wanted) console.log(name, (await tests[name]()) ?? "");
} else {
  // Each test has its own game, so they run side by side.
  await Promise.all(Object.values(tests).map((test) => test()));
}
console.log(`proved ${proved.length} Slums scenarios:\n  ${proved.sort().join("\n  ")}`);
