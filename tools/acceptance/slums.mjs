// Acceptance tests for the Slums, from qa/acceptance/01-slums.json.
//
//   npm run acceptance:slums            every test
//   npm run acceptance:slums -- orcs    named tests, one after another
//
// Each block proves one scenario of that file on the game itself: GOG version 1.3, normal input
// and the fixed dice of a replay. Fights are fought with the game's own commands and real dice: a
// test reacts to what the screen shows and never counts presses, and a lost fight fails the test
// with the screen.
//
// The first four tests (entry, orcs, flee, goblins) play SSI's six ready-made characters as they
// come, armed and armored. The test `guide` plays the party the Lee guide tells a player to make,
// loaded from the saved game in qa/fixtures/guide-party-new-phlan (tools/acceptance/party.mjs),
// and walks it through the Slums in stages: the orcs, the goblin armsmaster, the stable, the
// secret treasure room, the kobolds, the hobgoblins and their gold, and the cleric's training.
//
// Where an expectation is not the scenario's own, the comment says where it comes from. "The
// script" is the Slums script, ECL2.DAX block 20, read with src/lib/ecl.ts
// (`npx tsx tools/cli.ts disasm` writes it to out/ecl.txt); addresses are the script's.
//
// Squares are (x,y) on the Slums map as the game prints them. Routes are spelled as headings and
// every square of a route must be reached. A random encounter can turn up on any step outside a
// room (one draw from 14 numbers, the script at 9b3a), so a walk goes through `walkFighting`.

import assert from "node:assert/strict";
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { addReadyMadeParty, aimMenu, beginAdventuring, combatMenu, exploring, pressReturn, sheet, startGame } from "./harness.mjs";
import { breakCamp, campMenu, castInCamp, chooseSpells, cureLightWounds, healInCamp, hurt, magicMenu, makeCamp, pool, rest, restForSpells, templeCure, train } from "./party-care.mjs";
import { guideParty, guideSpells, innToSlums, loadParty, partyItems, saveGame, takeCoins } from "./party.mjs";

const proved = [];
const started = Date.now();
/** A line of progress on the error stream, with the seconds since the script began: the long tests say where they are. */
const progress = (line) => console.error(`[${Math.round((Date.now() - started) / 1000)}s] ${line}`);
const flat = (text) => text.replace(/\s+/g, " ").trim();

// Script variables (the script keeps its lasting state in them; none of it is on screen).
/** Clear points: one for each fight the script credits, 254 once the block is cleared (b69c). */
const clearPoints = 0x4abb;
/** 255 once the fight with the orcs at (13,1) has been fought (9e6d). */
const orcsFought = 0x4aca;
/** Random encounters beaten (b12a). */
const randomFights = 0x4a80;
/** 255 once the fight with the goblins at (10,1) has been fought (9f0c). */
const goblinsFought = 0x4acb;

const entryText = "YOU HAVE ENTERED THE MONSTER-CRAWLING SLUMS OF PHLAN. SMALL, UGLY THINGS SCURRY FROM BENEATH YOUR FEET. IN THE DISTANCE, AN ALARM SOUNDS.";
/** The menu of a random encounter: Advance when the monsters are far, Parlay when they are near. */
const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
/** The treasure menu after a won fight. */
const treasureMenu = /View Take Pool Share Exit\s*$/;
/** The same menu once everything has been taken or shared out: Take and Share are gone. */
const emptiedTreasureMenu = /^View Pool Exit$/;
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
  const game = await startGame({ seconds: 500, watch: [clearPoints, orcsFought, randomFights, goblinsFought], ...options });
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
    if (treasureMenu.test(game.menu()) || /^View (?:Take )?Pool (?:Share )?Exit$/.test(game.menu())) { treasure = true; await game.press("e"); }
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
 * game left it on. Returns how many encounters were fought. `fightIt`, when given, fights the
 * encounter in place of Quick: it is called with the fight begun and must leave it won.
 */
async function walkFighting(game, route, fightIt = (game) => game.win()) {
  let fights = 0;
  for (const heading of route) {
    for (let tries = 0; ; tries++) {
      if (tries >= 4) game.fail(`Four tries did not take the party one step ${heading}.`);
      await game.face(heading);
      const from = game.here();
      await game.press("up");
      // A locked door ("Locked. Bash Pick Exit"): bash it, as often as the game's roll needs.
      for (let bashes = 0; /Locked\. Bash Pick Exit\s*$/.test(game.menu()); bashes++) {
        if (bashes >= 12) game.fail("Twelve tries did not open the locked door.");
        await game.press("b");
        if (exploring.test(game.menu()) && game.here().x === from.x && game.here().y === from.y) await game.press("up");
      }
      for (let screens = 0; pressReturn.test(game.menu()) && /YOU ARE SURPRISED BY/.test(game.text()); screens++) {
        if (screens >= 3) game.fail("The surprise did not lead to a fight.");
        await game.press("enter");
      }
      if (encounterMenu.test(game.menu())) await game.startFight("c");
      if (game.inFight()) {
        await fightIt(game);
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
    // The cleric takes it: Take gives an item to the member highlighted in the party list.
    await game.press("enter", treasureMenu, "A won fight with loot leads to the treasure menu.");
    await game.highlight(cleric);
    await game.press("t", /Take: (?:Money )?Items Exit\s*$/, "Take offers the items.");
    await game.press("i", /Items: Take Exit\s*$/, "Items lists the loot.");
    const loot = game.rows().map((row) => row.trim()).filter(Boolean);
    assert.deepEqual(loot.slice(loot.indexOf("Loot") + 1, -1), ["Clerical Scroll With 2 Spells"], "The loot is one clerical scroll with two spells.");
    await game.press("t", treasureMenu, "Take gives the scroll to the cleric and returns to the treasure menu.");
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

    await readTheScroll(game);
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    proved.push("acceptance.slums.orcs-arguing-over-papers");
  } finally {
    game.close();
  }
}

/** The ready-made party's cleric, as his character sheet says. */
const cleric = "BROTHER SEAN";
const scroll = /^Clerical Scroll With \d Spells?$/;

/**
 * What the orcs' scroll holds, and how the game lets a character use it. From the exploration
 * menu, with the scroll among the cleric's items.
 *
 * The manual (p.9, Items): "An item that is not Ready cannot be used", and a character "cannot use
 * more than two hand-held items at once". The game's item table (the file ITEMS, 16 bytes for each
 * kind of item after a 2-byte header) gives kind 62, the clerical scroll, two hands and the mace
 * and the shield one each. So with mace and shield in hand the cleric can neither use nor ready
 * the scroll, and the game says so on the bottom line for a moment (225 ms times the game's speed
 * setting, which is 1 in a new game of version 1.3) and clears the line by itself: Use prints "Must be Readied" (GAME.OVR of version
 * 1.3, the Items routine at slice 19 offset 12ba), Ready prints "Your hands are full!".
 */
/** The texts the game has flashed on the bottom line since `from`. Each must have stayed for a whole number of the pause routine's 225 ms. */
function flashedSince(game, from) {
  const shown = game.flashed.slice(from);
  for (const { text, ms } of shown) assert.ok(ms > 0 && ms % 225 === 0, `"${text}" stayed ${ms} ms, which is not a whole number of 225 ms pauses.`);
  return shown.map(({ text }) => text);
}

async function readTheScroll(game) {
  const who = await game.viewSheet(cleric);
  assert.equal(who.classes, "Cleric", `${cleric}'s sheet says he is a cleric.`);
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the cleric carries.");
  const carried = game.items();
  assert.deepEqual(carried.filter(({ ready }) => ready).map(({ name }) => name).sort(), ["Mace", "Shield", "Splint Mail"], "The cleric has his mace, armor and shield ready.");
  assert.deepEqual(carried.filter(({ ready }) => !ready).map(({ name }) => name), ["Clerical Scroll With 2 Spells"], "The scroll is among his items, not ready.");

  // Use on the scroll while it is not ready: the game answers, and the answer is gone by the time
  // it asks for the next key.
  await game.selectItem(scroll);
  let shown = game.flashed.length;
  await game.press("u", /Ready Use Trade Drop Halve Join Exit\s*$/, "Use on an item that is not ready leaves the Items menu up.");
  assert.deepEqual(flashedSince(game, shown), ["Must be Readied"], "Use on the scroll while it is not ready says 'Must be Readied' on the bottom line.");
  // Ready with both hands full: mace and shield.
  shown = game.flashed.length;
  await game.press("r");
  assert.deepEqual(flashedSince(game, shown), ["Your hands are full!"], "Ready on the scroll with mace and shield in hand says 'Your hands are full!'.");
  assert.equal(game.items().find(({ name }) => scroll.test(name)).ready, false, "The scroll is still not ready.");
  // One free hand is not enough: the scroll takes two.
  await game.selectItem(/^Mace$/);
  await game.press("r");
  assert.equal(game.items().find(({ name }) => name === "Mace").ready, false, "Ready on the mace puts it away.");
  await game.selectItem(scroll);
  shown = game.flashed.length;
  await game.press("r");
  assert.deepEqual(flashedSince(game, shown), ["Your hands are full!"], "With only the mace put away the scroll still cannot be readied: it takes both hands.");
  await game.selectItem(/^Shield$/);
  await game.press("r");
  await game.selectItem(scroll);
  shown = game.flashed.length;
  await game.press("r");
  assert.deepEqual(flashedSince(game, shown), [], "With both hands free Ready says nothing.");
  assert.equal(game.items().find(({ name }) => scroll.test(name)).ready, true, "With both hands free the scroll is readied.");

  // Use on the readied scroll lists its spells: Cure Light Wounds, twice.
  await game.press("u", /Choose Spell: Cast Exit\s*$/, "Use on the readied scroll offers its spells to cast.");
  const listed = game.rows().map((row) => row.trim()).filter(Boolean);
  assert.deepEqual(listed.slice(0, -1), [`${cleric}'s Spells on Scroll`, "1st Level", "Cure Light Wounds", "Cure Light Wounds"],
    "The scroll holds Cure Light Wounds twice, both of the first level, and nothing else.");
  // Casting one uses it up: the scroll is left with one spell.
  await game.press("c", /Cast Spell on whom Select Exit\s*$/, "Cast asks whom to cast the spell on.");
  await game.press("s", /Ready Use Trade Drop Halve Join Exit\s*$/, "Select casts the spell and returns to the Items screen.");
  assert.deepEqual(game.items().filter(({ name }) => scroll.test(name)), [{ name: "Clerical Scroll With 1 Spell", ready: true, selected: true }],
    "After one casting the scroll holds one spell.");
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  await game.press("e", exploring, "Exit leaves the character sheet.");
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

/**
 * At the treasure menu after a won fight: `taker` takes each item of the loot that matches one of
 * `wanted` (the rest is left: a party cannot carry sixteen goblins' arms), the money is shared out
 * with the game's Share, and the party leaves. Returns the whole loot list as the game named it.
 */
async function collect(game, taker, wanted = [/./]) {
  game.expect(treasureMenu, "A won fight with loot leads to the treasure menu.");
  const lootMenu = /Items: Take (?:Next )?(?:Prev )?Exit\s*$/;
  const listed = () => {
    const rows = game.rows().map((row) => row.trim()).filter(Boolean);
    return rows.slice(rows.indexOf("Loot") + 1, -1);
  };
  const loot = [];
  await game.highlight(taker);
  await game.press("t", /Take: (?:Money )?(?:Items )?Exit\s*$/, "Take offers what there is.");
  const money = /\bMoney\b/.test(game.menu());
  if (/\bItems\b/.test(game.menu())) {
    await game.press("i", lootMenu, "Items lists the loot.");
    // Read the whole list, then come back to its top. Next moves the list up by one row.
    loot.push(...listed());
    let pages = 1;
    for (; /\bNext\b/.test(game.menu()); pages++) {
      if (pages >= 60) game.fail("The loot list is longer than this test expects.");
      await game.press("n", lootMenu, "Next moves the loot list on.");
      loot.push(listed().at(-1));
    }
    for (let back = 1; back < pages; back++) await game.press("p", lootMenu, "Prev moves the loot list back.");
    // Take what is wanted from the first page, one item at a time.
    for (let takes = 0; lootMenu.test(game.menu()); takes++) {
      if (takes >= 20) game.fail("The loot list did not come to an end.");
      const next = listed().find((name) => wanted.some((pattern) => pattern.test(name)));
      if (!next) break;
      await game.selectLine(new RegExp(`^${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      // The page fills up again from the next one, so its length says nothing: the caller looks
      // for the item among the taker's own.
      await game.press("t");
      if (takes >= wanted.length && wanted.every((pattern) => pattern.source !== ".")) break;
    }
  }
  const treasure = () => treasureMenu.test(game.menu()) || emptiedTreasureMenu.test(game.menu()) || /^View (?:Take )?Pool (?:Share )?Exit$/.test(game.menu());
  for (let presses = 0; !treasure(); presses++) {
    if (presses >= 4) game.fail("Taking the loot did not lead back to the treasure menu.");
    await game.press("e");
  }
  if (money) {
    await game.press("s");
    if (!treasure()) game.fail("Share did not lead back to the treasure menu.");
  }
  for (let presses = 0; !exploring.test(game.menu()); presses++) {
    if (presses >= 12) game.fail("Leaving the treasure did not lead back to the exploration menu.");
    if (treasure()) await game.press("e");
    else if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
    else if (pressReturn.test(game.menu())) await game.press("enter");
    else game.fail("Leaving the treasure, the game shows something this test does not know.");
  }
  return loot;
}

/** The members who are on their feet: the party list shows a character who is down with 0 hit points. */
const standing = (game) => game.party().filter(({ hp }) => hp > 0).length;

/**
 * In camp on a square where rest is safe: the cleric heals the party with his own cures until the
 * game shows nobody as hurt (party-care.mjs). Fails with the screen if a rest is interrupted.
 */
async function healHere(game) {
  if (!hurt(game).length) return { cures: 0, rests: 0, healed: true };
  await makeCamp(game);
  const healing = await healInCamp(game, [cleric]);
  if (!healing.healed) game.fail(`Healing in camp did not heal the party: ${JSON.stringify(healing)}.`);
  await breakCamp(game);
  return healing;
}

/**
 * Retreat from the Slums to New Phlan and come back. `route` leads from where the party stands to
 * the Slums entrance at (15,4); random fights on the way are left to Quick and must be won. In New
 * Phlan the party goes to the Temple of Sune, one step east of the gate and through the door to the
 * north, pools its money and asks for Cure Light Wounds for its most hurt member; then it walks
 * back through the gate. Returns what the temple said and how many fights the walk cost.
 *
 * What the game showed on 2026-11-21: the temple asks 100 gold pieces and answers "Not enough
 * money." to a party that has only its starting coins and the Slums' silver, so the retreat buys
 * nothing yet. The helper is how a test gets there and back; it does not assume the cure is paid.
 */
async function retreatAndReturn(game, route) {
  const fights = await walkFighting(game, route);
  at(game, 15, 4, "The Slums entrance is (15,4).");
  await game.face("E");
  await game.press("up");
  at(game, 0, 4, "East from the Slums entrance is the New Phlan gate.");
  const patient = hurt(game)[0];
  await game.walk("EN");
  await game.press("y", /Heal View Pool Appraise Exit\s*$/, "YES opens the temple menu.");
  await pool(game);
  const cure = patient ? await templeCure(game, patient.name, cureLightWounds) : undefined;
  // Share the pool out again, so that each character carries its part.
  await game.press("s");
  await game.press("e", exploring, "Exit leaves the temple.");
  await game.walk("SW");
  await game.face("W");
  const mark = game.printed.length;
  await game.press("up");
  printedInOrder(game, mark, [entryText], "Back through the gate the Slums print their entry text: the block is not cleared.");
  at(game, 15, 4, "The party is back at the Slums entrance.");
  return { fights, patient: patient?.name, cure };
}

/** The experience the goblins' fight is worth to the whole party (see the test). */
const goblinExperience = 545;
const goblinText = "A HEALTHY-LOOKING GOBLIN IS INSTRUCTING A GROUP OF YOUNG WARRIORS. HE SMILES AND SAYS, 'I SEE OUR OPPONENTS HAVE ARRIVED.'";

/**
 * acceptance.slums.goblin-armsmaster: the set fight at location 2, (10,1). The party first beats
 * the orcs at (13,1), every turn by hand so that nobody is left to Quick, and heals in their room,
 * where rest is safe. The goblins' room is entered from the south: the map (GEO block 20) has a
 * door of its second kind between (10,2) and (10,1), which the game shows as "Locked. Bash Pick Exit".
 */
async function goblins() {
  const game = await enterSlums();
  try {
    await walkFighting(game, "WSSSWNNNNNEN");
    await game.face("W");
    await game.press("up");
    at(game, 13, 1, "Location 1 is (13,1).");
    // The set fights are fought by hand. A random fight on the way is left to Quick, which stays
    // on from fight to fight, so the characters are taken back with Space when a set fight begins.
    game.byHand = true;
    await game.startFight("enter");
    await game.win({ turn: (game) => game.playTurn() });
    game.byHand = false;
    await game.press("enter", treasureMenu, "The orcs leave treasure.");
    assert.deepEqual(await collect(game, cleric), ["Clerical Scroll With 2 Spells"], "The cleric takes the orcs' scroll.");
    progress(`goblins: the orcs are beaten; the party list shows ${game.party().map(({ hp }) => hp).join(" ")}`);
    const healing = await healHere(game);
    progress(`goblins: healed with ${healing.cures} cures and ${healing.rests} rests; ${game.party().map(({ hp }) => hp).join(" ")}`);
    assert.deepEqual(hurt(game), [], "After healing in the orcs' room the game shows nobody as hurt.");

    // To the square south of the goblins' room. A random fight on the way is fought by hand; a
    // party that comes out of it hurt goes back to the orcs' room, heals and sets out again.
    let fights = 0, returns = 0;
    for (;;) {
      fights += await walkFighting(game, "ESWWWW");
      at(game, 10, 2, "The square south of the goblins' room is (10,2).");
      if (!hurt(game).length) break;
      if (++returns > 3) game.fail("Three returns to the orcs' room did not bring the party to the goblins unhurt.");
      fights += await walkFighting(game, "EEEENW");
      at(game, 13, 1, "The party is back in the orcs' room.");
      await healHere(game);
    }
    progress(`goblins: at the door after ${fights} random fights and ${returns} returns`);
    assert.equal(game.variable(goblinsFought), 0, "The goblins have not been fought yet.");
    const before = { points: game.variable(clearPoints) };

    // The door is locked: Bash until it gives. Each try is the game's own roll.
    await game.face("N");
    let mark = game.printed.length;
    let bashes = 0;
    for (; game.here().y !== 1; bashes++) {
      if (bashes >= 12) game.fail("Twelve tries did not open the door to the goblins' room.");
      if (!/Locked\. Bash Pick Exit\s*$/.test(game.menu())) await game.press("up", /Locked\. Bash Pick Exit\s*$/, "The door north of (10,2) is locked.");
      await game.press("b");
    }
    at(game, 10, 1, "Location 2 is (10,1).");
    printedInOrder(game, mark, [goblinText], "Entering the room prints the armsmaster's text.");
    game.expect(pressReturn, "The text waits for return before the fight.");

    // The fight: 8 GOBLIN GUARD (#2) and 1 GOBLIN LEADER (#12), and the six characters.
    game.byHand = true;
    await game.startFight("enter");
    const listed = await game.combatants();
    const count = (wanted) => listed.filter(({ name }) => name === wanted).length;
    assert.deepEqual([count("GOBLIN GUARD"), count("GOBLIN LEADER"), listed.length], [8, 1, 15],
      `The fight is against eight goblin guards and one goblin leader; Aim listed ${listed.map(({ name }) => name).join(", ")}.`);
    // The magic-users open with Sleep; everyone else attacks what is in reach or stands guard.
    const did = [];
    const { xp } = await game.win({
      turn: async (game) => {
        const who = game.combatant().name;
        const turn = await game.playTurn({ spells: [/^Sleep$/] });
        did.push(`${who} ${turn.cast ? `casts ${turn.cast}` : turn.attacked ? `attacks ${turn.attacked.name}` : "guards"}`);
        if (did.length % 12 === 0) progress(`goblins: ${did.length} turns fought`);
      },
    });
    console.log(`goblins: ${healing.cures} cures and ${healing.rests} rests after the orcs, ${fights} random fights and ${returns} returns on the way, ${bashes} bashes; ${did.length} turns, ${did.filter((turn) => /casts/.test(turn)).length} spells; ${xp} experience points`);
    await game.press("enter", treasureMenu, "A won fight with loot leads to the treasure menu.");
    game.byHand = false;
    // The experience of a fight is shared among the characters still on their feet, rounded down.
    // The scenario's 90 is for six. On 2026-11-21 the game awarded 109 with five standing (three
    // fights, different characters down) and 181 with three: 545 points in all is the one total
    // that gives all three figures (6 x 90 = 540 to 545, 5 x 109 = 545 to 549, 3 x 181 = 543 to 545).
    const up = standing(game);
    if (!up) game.fail("Nobody is standing after a fight the party won.");
    assert.equal(xp, Math.floor(goblinExperience / up), `With ${up} characters standing each receives ${Math.floor(goblinExperience / up)} experience points: ${goblinExperience} shared.`);
    // The loot is what nine goblins carried. One suit among it is plain "Leather Armor", where the
    // guards wore studded leather: the armsmaster's. The game names an unidentified magic item by
    // its plain name, so the "+1" of the scenario is not on this screen.
    const loot = await collect(game, cleric, [/^Leather Armor$/]);
    progress(`goblins: won with ${up} standing; loot ${JSON.stringify(loot)}`);
    assert.equal(loot.filter((name) => name === "Leather Armor").length, 1, `The treasure holds one suit of leather armor; the game listed ${JSON.stringify(loot)}.`);
    await game.viewSheet(cleric);
    await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the cleric carries.");
    assert.ok(game.items().some(({ name, ready }) => name === "Leather Armor" && !ready), `The cleric now carries the leather armor: ${JSON.stringify(game.items())}`);
    await game.press("e");
    await game.press("e", exploring, "Exit leaves the character sheet.");
    at(game, 10, 1, "After the fight the party stands in the room.");
    assert.equal(game.variable(goblinsFought), 255, "The script records the goblins' fight as fought.");
    assert.equal(game.variable(clearPoints), before.points + 1, "The fight credits exactly one clear point.");

    // The party is hurt and three are down. Retreat to New Phlan, ask the temple, come back.
    const retreat = await retreatAndReturn(game, "SEEESSSSSENNNE");
    progress(`goblins: retreated to New Phlan and came back; ${JSON.stringify(retreat)}`);
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    return loot;
  } finally {
    game.close();
  }
}

// ---- The guide's party ------------------------------------------------------------------------
//
// The tests above use SSI's six ready-made characters. From here on the party is the one the Lee
// guide tells a player to make (qa/research/party.md), loaded from the saved game in
// qa/fixtures/guide-party-new-phlan with the game's own Load: level 1, Modify's scores, the
// guide's opening purchases, a Sleep in every magic-user place and a cure in every cleric place.
//
// The tactics are the guide's too. [P] §5.2: "The strongest combat spell in the early game is
// Sleep, by far"; §6.3.1: "All but one set combat are easy to win with the help of Sleep spells
// cast in the midst of clumps of monsters"; §5.1: "Most of the enemies in this game have no ranged
// attacks. If there is space in between you and them, it is often better to ... let them close
// distance". §6.3.2: rest is safe "in a room where you have defeated a set encounter".

const sleep = /^Sleep$/;
/** The guide party's members who cast cures, the pure cleric first. */
const healers = guideParty.filter(({ classes }) => /Cleric/.test(classes)).map(({ name }) => name).sort((a, b) => (a === "ELSPETH" ? -1 : b === "ELSPETH" ? 1 : 0));
/** How many Sleeps the fixture's party has in memory after a rest: one for each character with magic-user among the classes. */
const sleepsAfterRest = guideParty.filter(({ classes }) => /Magic-User/.test(classes)).length;

/**
 * Cast Sleep where it cannot fall on the party. [P] §5.2: Sleep takes "its square and ... the
 * eight adjacent squares (including your own low-level characters, so aim properly)". The fight
 * screen gives no map to read, but Aim prints each combatant's range from the caster, friend and
 * foe, nearest first. A target whose range differs by two or more from every friend's range (and
 * from the caster's own square) is at least two squares from each of them, whatever the directions,
 * so the spell's nine squares hold no friend. The nearest such enemy is chosen, in the spell's own
 * Aim list, by its place in that order.
 * Returns the target, or undefined with the combatant's menu up again when the caster has no Sleep
 * in memory, no enemy stands clear, or the game does not let the spell reach it.
 */
async function castSleepClear(game, friends) {
  const list = await game.combatants();
  const mine = list.filter(({ name }, place) => place > 0 && friends.includes(name)).map(({ range }) => range);
  const place = list.findIndex(({ name, range }, index) => index > 0 && !friends.includes(name) && range >= 2 && mine.every((friend) => Math.abs(range - friend) >= 2));
  if (place < 0) return undefined;
  await game.press("c", /Choose Spell: Cast Exit\s*$/, "Cast lists the spells in memory.");
  let at;
  if (game.rows().some((row) => sleep.test(row.trim()))) {
    await game.selectLine(sleep);
    await game.press("c");
    if (aimMenu.test(game.menu())) at = await game.target((target, index) => index === place && target.name === list[place].name, (target, index) => index > place);
  }
  // Leaving the spell list, or Aim with a spell in hand ("Abort Spell?"), back to the combatant's menu.
  for (let presses = 0; !at && !combatMenu.test(game.menu()); presses++) {
    if (presses >= 3) game.fail("Leaving the spell did not return to the combatant's menu.");
    await game.press(/Abort Spell\? Yes No\s*$/.test(game.menu()) ? "y" : "e");
  }
  return at;
}

/** The menu behind Done. Bandage is on it only while a friend lies dying. */
const doneMenu = /Guard Delay Quit (?:Bandage )?(?:Speed )?Exit\s*$/;

/**
 * A character at -1 to -9 hit points loses one more each round "until Bandaged" and is dead at -10
 * (the rule book, Combat; the digest, section 4). The fight screen does not say who is down, but a
 * friend who has taken no turn for more than a round may be: then the character whose turn it is
 * opens Done, and bandages if the game offers Bandage. `acted` maps each name to its last turn.
 * Returns true when the turn was spent bandaging.
 */
async function bandageTheDying(game, acted, turns, friends) {
  const who = game.combatant().name;
  acted.set(who, turns);
  const missing = friends.filter((name) => name !== who && turns - (acted.get(name) ?? 0) > friends.length);
  if (!missing.length) return false;
  await game.press("d", doneMenu, "Done opens the menu that has Bandage while a friend is dying.");
  // Asked once for these: a friend who is asleep, unconscious or dead is not bandaged, and is not asked about every turn.
  for (const name of missing) acted.set(name, turns);
  if (!/\bBandage\b/.test(game.menu())) {
    // Nobody is dying: the friend acted late in the order, or sleeps, or is down at exactly 0.
    await game.press("e", combatMenu, "Exit returns to the combatant's menu.");
    return false;
  }
  await game.press("b");
  progress(`${who} bandages (no turn from ${missing.join(", ")} for more than a round)`);
  // If the game leaves the same combatant's menu up, the turn is still to be played.
  return !(game.fighting() && game.combatant()?.name === who);
}

/**
 * One fight by the guide's tactics, every turn with the game's own commands: in the first four
 * rounds a character who may still have Sleep in memory casts it at the nearest enemy that stands
 * clear of the party (`castSleepClear`), until `sleeps` have been cast; otherwise the character
 * attacks the nearest enemy in reach, or guards and lets the enemy come (`playTurn`). When nobody
 * has had anything to do for three whole rounds (the enemy left is asleep out of reach, or will
 * not come), the characters are handed to the game's Quick, which walks them to the enemy;
 * `game.byHand` takes them back when the next fight begins.
 * Returns { outcome, xp, rounds, cast, turns, quick }; a fight that is not won fails with the screen.
 */
async function fightByGuide(game, { sleeps = sleepsAfterRest, label = "fight" } = {}) {
  const friends = guideParty.map(({ name }) => name);
  // Who has no Sleep left to try: it was cast, or the spell list showed none.
  const spent = new Set();
  const acted = new Map();
  let cast = 0, idle = 0, turns = 0, quick = false;
  const result = await game.win({
    limit: 1500,
    turn: async (game) => {
      turns++;
      if (turns % 30 === 0) progress(`${label}: ${turns} turns, ${cast} Sleeps cast${quick ? ", on Quick" : ""}`);
      if (quick) return game.press("q");
      const who = game.combatant().name;
      if (await bandageTheDying(game, acted, turns, friends)) return;
      if (cast < sleeps && turns <= 4 * friends.length && /\bCast\b/.test(game.menu()) && !spent.has(who)) {
        const at = await castSleepClear(game, friends);
        if (at) {
          cast++;
          spent.add(who);
          idle = 0;
          return;
        }
      }
      const did = await game.playTurn();
      idle = did.guarded ? idle + 1 : 0;
      if (idle >= 3 * friends.length) {
        quick = true;
        game.byHand = false;
      }
    },
  });
  game.byHand = true;
  return { ...result, cast, turns, quick };
}

/**
 * Where the party cannot rest (a street of New Phlan, a lane of the Slums): make camp, let the
 * healers cast the cures they have in memory on whoever the game shows as hurt, and break camp.
 * Casting takes no rest. A character the sheet calls Dead fails with the screen: the party's
 * cures cannot help him. Returns how many cures were cast.
 */
async function tendTheHurt(game) {
  if (!hurt(game).length) return 0;
  if (standing(game) < game.party().length) {
    const dead = (await game.sheets()).filter(({ status }) => /dead/i.test(status)).map(({ name, status }) => `${name} is ${status}`);
    if (dead.length) game.fail(`${dead.join(", ")}: the party's cures cannot bring a dead character back.`);
  }
  await makeCamp(game);
  let cures = 0;
  for (const healer of healers.filter((name) => game.party().find((member) => member.name === name)?.hp > 0)) {
    for (let casts = 0; hurt(game).length && casts < 8; casts++) {
      if (!await castInCamp(game, healer, cureLightWounds, hurt(game)[0].name)) break;
      cures++;
    }
  }
  await breakCamp(game);
  return cures;
}

/**
 * In camp on a square where rest is safe: the healers cast their cures on whoever the game shows
 * as hurt, everyone chooses the guide's spells again, and the party rests the time the game sets;
 * until nobody is hurt and nobody has a spell left to choose. Returns { cures, rests }. A rest
 * that is interrupted fails with the screen.
 */
async function recover(game) {
  // A character the sheet calls Dead is beyond the party's cures: that is reported, not worked round.
  if (standing(game) < game.party().length) {
    const dead = (await game.sheets()).filter(({ status }) => /dead/i.test(status)).map(({ name, status }) => `${name} is ${status}`);
    if (dead.length) game.fail(`${dead.join(", ")}: the party's cures cannot bring a dead character back.`);
  }
  await makeCamp(game);
  let cures = 0, rests = 0;
  const up = (name) => game.party().find((member) => member.name === name)?.hp > 0;
  for (let round = 0; ; round++) {
    if (round >= 16) game.fail("Sixteen rests did not bring the party back to full strength.");
    for (const healer of healers.filter(up)) {
      for (let casts = 0; hurt(game).length && casts < 8; casts++) {
        if (!await castInCamp(game, healer, cureLightWounds, hurt(game)[0].name)) break;
        cures++;
      }
    }
    let chosen = 0;
    for (const { name } of guideParty.filter(({ name }) => up(name))) {
      chosen += await chooseSpells(game, name, guideSpells);
      // The last one to choose stays on the spell menu: its Rest sets the time for everything chosen.
      if (!chosen || name !== guideParty.filter(({ name }) => up(name)).at(-1).name) await game.press("e", campMenu, "Exit leaves the spell menu.");
    }
    if (!chosen) {
      if (hurt(game).length) game.fail("The party is still hurt and nobody can memorise a cure.");
      break;
    }
    if (!magicMenu.test(game.menu())) await game.press("m", magicMenu, "Magic opens the spell menu.");
    if (!await restForSpells(game)) game.fail("The rest for the chosen spells was interrupted on a square where rest is safe.");
    rests++;
  }
  await breakCamp(game);
  return { cures, rests };
}

/**
 * What a character sheet shows of `xp` experience points: a multi-classed character's sheet shows
 * the experience of one class, the award divided by the number of classes and rounded down (the
 * rule book p.4: "his XP are divided up among his classes"; seen on 2026-11-21: 233 points read
 * 116 on a fighter/magic-user's sheet).
 */
const perClass = (name, xp) => Math.floor(xp / guideParty.find((who) => who.name === name).classes.split("/").length);

/** Every member's experience points, { NAME: exp }, read from the character sheets. From a menu that has View. */
async function experience(game) {
  return Object.fromEntries((await game.sheets()).map(({ name, exp }) => [name, exp]));
}

/**
 * The experience the end of a fight shows, checked against the guide's figure. [P] §6.1:
 * "Experience awards listed are per character, and assume you have exactly six characters". The
 * game shares the fight's total among the characters standing at the end, rounded down (the
 * goblins' test above): so with six standing the screen shows the guide's figure, and with fewer
 * it shows the share of a total that gives the guide's figure for six.
 */
function requireListedExperience(shown, listed, up, what) {
  if (up === 6) return assert.equal(shown, listed, `${what}: with all six standing each receives the guide's ${listed} experience points.`);
  const fits = [0, 1, 2, 3, 4, 5].some((extra) => Math.floor((listed * 6 + extra) / up) === shown);
  assert.ok(fits, `${what}: with ${up} standing each received ${shown}, which is not the share of a total that gives ${listed} for six.`);
}

/** Load the guide's party from its fixture and walk it from the inn into the Slums. */
async function enterSlumsAsGuideParty(options = {}) {
  const game = await loadParty({ seconds: 3000, watch: [clearPoints, orcsFought, randomFights, goblinsFought], ...options });
  try {
    game.byHand = true;
    await innToSlums(game);
    at(game, 15, 4, "One step west of the New Phlan gate is the Slums entrance.");
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

/**
 * Walk `route` with the guide's party. A random encounter on the way is fought by the guide's
 * tactics with at most `sleeps` Sleeps. Returns { fights, cast }: how many encounters, and how
 * many Sleeps they took.
 */
async function walkAsGuideParty(game, route, state, label) {
  let cast = 0;
  const fights = await walkFighting(game, route, async (game) => {
    const fight = await fightByGuide(game, { sleeps: Math.min(2, state.sleeps), label: `${label}: random fight` });
    state.sleeps -= fight.cast;
    cast += fight.cast;
    state.random.push({ at: label, xp: fight.xp, turns: fight.turns, cast: fight.cast });
    progress(`${label}: random fight won in ${fight.turns} turns with ${fight.cast} Sleeps, ${fight.xp} experience points`);
  });
  // The fight screens have no party list: who is still standing shows once the party walks again,
  // and the sheet of anyone at 0 says how he is down.
  for (const fight of state.random.slice(-fights || state.random.length)) fight.standing ??= standing(game);
  if (fights) {
    const down = standing(game) < game.party().length ? (await game.sheets()).filter(({ hp }) => hp <= 0).map(({ name, status }) => `${name} is ${status}`) : [];
    if (down.length) state.random.at(-1).down = down;
    progress(`${label}: after ${fights} random fights the party list shows ${game.party().map(({ hp }) => hp).join(" ")}${down.length ? ` (${down.join(", ")})` : ""}`);
  }
  return { fights, cast };
}

/** A route walked backwards: the headings reversed and each turned round. */
const back = (route) => [...route].reverse().map((heading) => opposite[heading]).join("");

/**
 * Walk `route` from a room where rest is safe, as a player who has been told not to press on hurt
 * does (#118): a random fight that leaves anyone hurt or the party short of Sleeps ends the walk
 * for now; the party goes back the way it came, rests in the room it left, and sets out again.
 * The dice are not touched: each fight is fought as it comes. Returns { fights, cast, retreats }.
 */
async function walkRestingBetweenFights(game, route, state, label) {
  let fights = 0, cast = 0;
  for (let retreats = 0; ; retreats++) {
    if (retreats >= 8) game.fail(`Eight retreats to rest did not get the party to ${label}.`);
    let gone = 0, again = false;
    while (gone < route.length) {
      const step = await walkAsGuideParty(game, route[gone], state, label);
      fights += step.fights;
      cast += step.cast;
      gone++;
      if (step.fights && (hurt(game).length || state.sleeps < 2)) {
        progress(`${label}: after a fight ${hurt(game).length} hurt and ${state.sleeps} Sleeps; back to the room to rest`);
        const way = back(route.slice(0, gone));
        const homeward = await walkAsGuideParty(game, way, state, `back from ${label}`);
        fights += homeward.fights;
        cast += homeward.cast;
        const rest = await recover(game);
        state.sleeps = sleepsAfterRest;
        progress(`${label}: recovered with ${rest.cures} cures and ${rest.rests} rests`);
        again = true;
        break;
      }
    }
    if (!again) return { fights, cast, retreats };
  }
}

/**
 * Bring the guide's party from a room where rest is safe to the door of a set fight, fit for it:
 * nobody hurt and at least `sleeps` Sleeps in memory. A random fight on `route` can leave it less
 * than that; then it walks back, recovers in the safe room and sets out again.
 */
async function arriveFit(game, state, route, sleeps, label) {
  for (let tries = 0; ; tries++) {
    if (tries >= 6) game.fail(`Six tries did not bring the party to ${label} fit to fight.`);
    await walkAsGuideParty(game, route, state, `to ${label}`);
    if (!hurt(game).length && state.sleeps >= sleeps) return tries;
    progress(`${label}: the party arrived with ${state.sleeps} Sleeps and ${hurt(game).length} hurt; back to rest`);
    await walkAsGuideParty(game, back(route), state, `back from ${label}`);
    const rest = await recover(game);
    state.sleeps = sleepsAfterRest;
    progress(`${label}: recovered with ${rest.cures} cures and ${rest.rests} rests`);
  }
}

/**
 * A set fight of the guide's party, from the "press return" under the room's text to the screen
 * after the fight (the treasure menu, or the exploration menu when there is no treasure):
 * the combatants Aim lists must be exactly `foes` ({ NAME: count }) and the six characters; the
 * fight is fought by the guide's tactics with at most `sleeps` Sleeps and must be won; the
 * experience on screen must be the guide's `listed` figure (see `requireListedExperience`), where
 * the guide lists one for the fight. Returns { xp, up, turns, cast, party }.
 */
async function setFightAsGuideParty(game, state, { label, foes, sleeps, listed }) {
  game.expect(pressReturn, "The room's text waits for return before the fight.");
  const before = game.party();
  game.byHand = true;
  await game.startFight("enter");
  const listedFoes = await game.combatants();
  const counted = {};
  for (const { name } of listedFoes) if (!before.some((member) => member.name === name)) counted[name] = (counted[name] ?? 0) + 1;
  assert.deepEqual(counted, foes, `${label}: the fight is against ${JSON.stringify(foes)}; Aim listed ${JSON.stringify(counted)}.`);
  assert.equal(listedFoes.length - Object.values(counted).reduce((sum, count) => sum + count, 0), before.length, `${label}: apart from the monsters the combatants are the six characters.`);
  const fight = await fightByGuide(game, { sleeps: Math.min(sleeps, state.sleeps), label });
  state.sleeps -= fight.cast;
  await game.press("enter");
  const up = standing(game);
  if (!up) game.fail("Nobody is standing after a fight the party won.");
  // The party list shows 0 for anyone who is down; the sheet says how: Unconscious, Dying or Dead.
  const down = up < before.length ? (await game.sheets()).filter(({ hp }) => hp <= 0).map(({ name, status }) => `${name} is ${status}`) : [];
  const party = `${game.party().map(({ name, hp }) => `${name} ${hp}`).join(", ")}${down.length ? ` (${down.join(", ")})` : ""}`;
  state.losses.push({ fight: label, standing: up, turns: fight.turns, sleeps: fight.cast, xp: fight.xp, party, down });
  progress(`${label}: won in ${fight.turns} turns with ${fight.cast} Sleeps${fight.quick ? " (finished on Quick)" : ""}; ${up} standing; ${fight.xp} experience points each; ${party}`);
  if (listed !== undefined) requireListedExperience(fight.xp, listed, up, label);
  return { ...fight, up, party };
}

/** Stage: the orcs at (13,1), from the Slums entrance. Ends rested in their room. */
async function guideOrcs(game, state) {
  await walkAsGuideParty(game, "WSSSWNNNNNEN", state, "the orcs");
  at(game, 14, 1, "The square east of the orcs' room is (14,1).");
  const points = game.variable(clearPoints);
  await game.face("W");
  const mark = game.printed.length;
  await game.press("up");
  at(game, 13, 1, "Location 1 is (13,1).");
  printedInOrder(game, mark, ["SEVERAL ORCS ARE ARGUING OVER SOME PAPERS."], "Entering the room prints the orcs' text.");
  // [P] §6.3.2: 1 ORC (#13) and 3 ORC (#4), 77 XP. Four orcs need no Sleep from this party; one is allowed.
  await setFightAsGuideParty(game, state, { label: "the orcs", foes: { ORC: 4 }, sleeps: 1, listed: 77 });
  assert.deepEqual(await collect(game, "ELSPETH"), ["Clerical Scroll With 2 Spells"], "The cleric takes the orcs' scroll.");
  assert.equal(game.variable(orcsFought), 255, "The script records the orcs' fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");
  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the orcs: recovered in their room with ${rest.cures} cures and ${rest.rests} rests`);
}

/** On an Items screen: move the highlight to the item at `index` of the list. */
async function selectItemAt(game, index) {
  for (let moves = 0; !game.items()[index]?.selected; moves++) {
    if (moves > game.items().length + 1) game.fail(`Could not move the highlight to item ${index + 1}.`);
    await game.press("end");
  }
}

/**
 * Stage: the goblin armsmaster at (10,1), from the orcs' room. Proves
 * acceptance.slums.goblin-armsmaster in full: the text, the nine goblins, a win, the guide's 90
 * experience points on screen with all six standing, one clear point, and that the one plain
 * "Leather Armor" of the loot is Leather Armor +1. Ends rested in the goblins' room.
 */
async function guideGoblins(game, state) {
  at(game, 13, 1, "The stage starts in the orcs' room.");
  await arriveFit(game, state, "ESWWWW", 2, "the goblins' door");
  at(game, 10, 2, "The square south of the goblins' room is (10,2).");
  assert.equal(game.variable(goblinsFought), 0, "The goblins have not been fought yet.");
  const points = game.variable(clearPoints);
  await game.face("N");
  const mark = game.printed.length;
  let bashes = 0;
  for (; game.here().y !== 1; bashes++) {
    if (bashes >= 12) game.fail("Twelve tries did not open the door to the goblins' room.");
    if (!/Locked\. Bash Pick Exit\s*$/.test(game.menu())) await game.press("up", /Locked\. Bash Pick Exit\s*$/, "The door north of (10,2) is locked.");
    await game.press("b");
  }
  at(game, 10, 1, "Location 2 is (10,1).");
  printedInOrder(game, mark, [goblinText], "Entering the room prints the armsmaster's text.");
  // [P] §6.3.2: 1 GOBLIN LEADER (#12) and 8 GOBLIN GUARD (#2), Morale 60, 90 XP.
  const fight = await setFightAsGuideParty(game, state, { label: "the goblins", foes: { "GOBLIN GUARD": 8, "GOBLIN LEADER": 1 }, sleeps: 3, listed: 90 });
  // 545 in all, shared among those standing (the test `goblins` above found the total): 90 for six.
  assert.equal(fight.xp, Math.floor(goblinExperience / fight.up), `With ${fight.up} standing each receives ${Math.floor(goblinExperience / fight.up)}: ${goblinExperience} shared.`);
  assert.equal(fight.up, 6, `The guide's party comes through the goblins' fight with all six standing, so the screen shows the guide's 90: ${fight.party}.`);
  assert.equal(fight.xp, 90, "Each of six receives 90 experience points.");

  // The thief takes the one plain "Leather Armor" among the goblins' studded leather.
  const thief = "FINN";
  const loot = await collect(game, thief, [/^Leather Armor$/]);
  assert.equal(loot.filter((name) => name === "Leather Armor").length, 1, `The treasure holds one suit of leather armor; the game listed ${JSON.stringify(loot)}.`);
  assert.equal(game.variable(goblinsFought), 255, "The script records the goblins' fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");

  // It is Leather Armor +1 ([P] §6.3.2, "Among the loot is Leather Armor +1"). The game names an
  // unidentified item by its plain name, so the proof is what it does: the thief wears bought
  // leather armor, and with the goblins' suit in its place his armor class is one better.
  const wearing = await game.viewSheet(thief);
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the thief carries.");
  const suits = game.items().map((item, index) => ({ ...item, index })).filter(({ name }) => name === "Leather Armor");
  assert.deepEqual(suits.map(({ ready }) => ready), [true, false], `The thief carries his own leather armor, ready, and the goblins', not ready: ${JSON.stringify(game.items())}`);
  await selectItemAt(game, suits[0].index);
  await game.press("r");
  assert.equal(game.items()[suits[0].index].ready, false, "Ready on the armor he wears takes it off.");
  await selectItemAt(game, suits[1].index);
  await game.press("r");
  assert.equal(game.items()[suits[1].index].ready, true, "Ready on the goblins' leather armor puts it on.");
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  const now = sheet(game.frame);
  assert.equal(now.armor, "Leather Armor", "The sheet names leather armor as the armor worn.");
  assert.equal(now.ac, wearing.ac - 1, `With the goblins' leather armor in place of the bought one the thief's armor class is ${wearing.ac - 1}, one better than ${wearing.ac}: the suit is +1.`);
  await game.press("e", exploring, "Exit leaves the character sheet.");

  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the goblins: ${bashes} bashes; recovered in their room with ${rest.cures} cures and ${rest.rests} rests`);
}

/** The party's coins and gems, added up over the six character sheets: { Gold: n, Gems: n, ... }. From a menu that has View. */
async function partyMoney(game) {
  const total = {};
  for (const purse of Object.values(await game.purses())) for (const [kind, count] of Object.entries(purse)) total[kind] = (total[kind] ?? 0) + count;
  return total;
}

/**
 * A treasure found without a fight (the script's TREASURE, then its COMBAT with no monsters): the
 * game shows "The party has found Treasure! Each character receives N experience points." and
 * then the treasure menu. Requires `xp` on that screen and on every sheet, takes every item for
 * `taker`, shares the money, and requires the party's purses to have grown by exactly `money`
 * ({ Gold: 100, Gems: 2 }) and nothing else. Returns the names of the items as the game lists
 * them. Leaves the game on the exploration menu.
 */
async function claimTreasure(game, { taker, xp, money, label }) {
  game.expect(/The party has found Treasure! Each character receives (\d+) experience points\. press <enter>\/<return> to continue\s*$/, `${label}: the game announces the treasure and its experience.`);
  const shown = +/Each character receives (\d+) experience points/.exec(game.text())[1];
  // `xp` is the guide's figure, or its range [least, most] where the treasure holds a random magic item.
  if (Array.isArray(xp)) assert.ok(shown >= xp[0] && shown <= xp[1], `${label}: each character receives between ${xp[0]} and ${xp[1]} experience points, the guide's range; the game shows ${shown}.`);
  else assert.equal(shown, xp, `${label}: each character receives the guide's ${xp} experience points.`);
  await game.press("enter", treasureMenu, "Return leads to the treasure menu.");
  // The treasure menu has View: the sheets already show the new experience, and the purses do not yet hold the treasure.
  const before = { exp: await experience(game), money: await partyMoney(game) };
  const loot = await collect(game, taker);
  const after = { exp: await experience(game), money: await partyMoney(game) };
  const gained = {};
  for (const kind of new Set([...Object.keys(before.money), ...Object.keys(after.money)])) {
    const more = (after.money[kind] ?? 0) - (before.money[kind] ?? 0);
    if (more) gained[kind] = more;
  }
  assert.deepEqual(gained, money, `${label}: shared out, the treasure's money is exactly ${JSON.stringify(money)}.`);
  assert.deepEqual(after.exp, before.exp, `${label}: taking the treasure adds no experience beyond what the screen announced.`);
  return { loot, exp: after.exp };
}

/**
 * Stage: the stable (location 5), from the goblins' room. Proves acceptance.slums.stable-leather-bag:
 * the stable's text; with Search on, the leather bag and its question; YES; 233 experience points;
 * 100 gold pieces and 2 gems; a short bow and arrows. The script asks for Search to be on when the
 * square is entered (ECL2.DAX block 20 at a461: COMPARE 0x6dca, 1) and never offers the bag twice
 * (0x4acc). Ends rested in the stable.
 */
async function guideStable(game, state) {
  at(game, 10, 1, "The stage starts in the goblins' room.");
  const before = await experience(game);
  // South through the goblins' door, west, and into the dirty room south of the stable, (6,3).
  await walkRestingBetweenFights(game, "SWWSWW", state, "the stable");
  at(game, 6, 3, "The room south of the stable is (6,3).");
  await game.press("s");
  assert.equal(game.position()?.mode, "search", "S turns Search on: the status line says so.");
  await game.face("N");
  const mark = game.printed.length;
  await game.press("up");
  at(game, 6, 2, "The stable's east square is (6,2).");
  printedInOrder(game, mark, [
    "YOU HAVE ENTERED A VERY UNCLEAN STABLE. THERE IS EVIDENCE THAT A LARGE AND UNTIDY ANIMAL HAD LIVED HERE.",
    "YOU FIND A LONG LEATHER BAG. WILL YOU OPEN IT?",
  ], "With Search on, entering the stable prints its text and then finds the bag.");
  game.expect(/WILL YOU OPEN IT\? Yes No\s*$/, "The bag is offered with YES and NO.");
  await game.press("y");
  // [P] §6.3.2: "a leather bag containing 2 gems, 100 gold, 20 Arrows +1, and a Short Bow +1 (233 XP)".
  const { loot, exp } = await claimTreasure(game, { taker: "FINN", xp: 233, money: { Gold: 100, Gems: 2 }, label: "the stable" });
  assert.deepEqual([...loot].sort(), ["20 Arrows", "Short Bow"], `The bag holds twenty arrows and a short bow (the game names unidentified magic by its plain name); it listed ${JSON.stringify(loot)}.`);
  for (const [name, points] of Object.entries(exp)) assert.ok(points >= before[name] + perClass(name, 233), `${name}'s sheet shows at least ${perClass(name, 233)} experience points more than in the goblins' room: ${before[name]} then, ${points} now.`);
  // The bag is found once: leaving and coming back with Search still on finds nothing.
  await game.walk("S");
  const again = game.printed.length;
  await game.walk("N");
  printedInOrder(game, again, [], "A second visit with Search on prints nothing: the bag is gone and the stable's text is shown once.");
  game.expect(exploring);
  await game.press("s");
  assert.equal(game.position()?.mode, undefined, "S turns Search off again.");
  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the stable: loot ${JSON.stringify(loot)}; recovered with ${rest.cures} cures and ${rest.rests} rests`);
}

/**
 * Stage: the secret treasure room at (0,0) (location 12), from the stable. Proves
 * acceptance.slums.secret-treasure-room. The room is entered from (1,0) through what the guide's
 * map draws as an illusionary wall; the script hands out the treasure on entry, with no Search
 * (ECL2.DAX block 20 at ab0d to ab42), and only once (0x4ad6). Ends rested in the room.
 */
async function guideSecretRoom(game, state) {
  at(game, 6, 2, "The stage starts in the stable.");
  const before = await experience(game);
  // West out of the stable, along the lane at y=2, north through (2,1) and its door to (2,0), west to (1,0).
  await walkAsGuideParty(game, "WWWWNNW", state, "the secret room");
  at(game, 1, 0, "The square east of the secret room is (1,0).");
  await game.face("W");
  const mark = game.printed.length;
  await game.press("up");
  printedInOrder(game, mark, ["YOU HAVE STUMBLED INTO A TREASURE ROOM."], "Walking west from (1,0) prints the treasure room's text: the wall there is no wall.");
  // [P] §6.3.2: "2 jewelry, 4 gems, 50 platinum, 92 gold, 1000 electrum, 20 Arrows +1, and Short Bow +1 (1173 XP)".
  const { loot, exp } = await claimTreasure(game, {
    taker: "DORIAN", xp: 1173, money: { Jewelry: 2, Gems: 4, Platinum: 50, Gold: 92, Electrum: 1000 }, label: "the secret room",
  });
  at(game, 0, 0, "Location 12 is (0,0).");
  assert.deepEqual([...loot].sort(), ["20 Arrows", "Short Bow"], `The room holds twenty arrows and a short bow beside the money; the game listed ${JSON.stringify(loot)}.`);
  for (const [name, points] of Object.entries(exp)) assert.ok(points >= before[name] + perClass(name, 1173), `${name}'s sheet shows at least ${perClass(name, 1173)} experience points more than in the stable: ${before[name]} then, ${points} now.`);
  // The treasure is found once.
  await game.walk("E");
  const again = game.printed.length;
  await game.walk("W");
  printedInOrder(game, again, [], "A second visit prints nothing: the treasure is gone.");
  game.expect(exploring);
  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the secret room: loot ${JSON.stringify(loot)}; recovered with ${rest.cures} cures and ${rest.rests} rests`);
}

const koboldText = "YOU INTERRUPT SOME FEEDING KOBOLDS.";

/**
 * Stage: the feeding kobolds at (7,0) (location 6), from the secret room. Proves
 * acceptance.slums.feeding-kobolds: the text, sixteen kobolds, a win, the guide's 289 experience
 * points, one clear point, and the leader's Bracers AC 6 in the treasure. Ends rested in the room.
 */
async function guideKobolds(game, state) {
  at(game, 0, 0, "The stage starts in the secret room.");
  // Back east and south to the lane, east to (4,2), north through the room at (4,0) to (6,0).
  await arriveFit(game, state, "EESSEENNEE", 3, "the kobolds' door");
  at(game, 6, 0, "The square west of the kobolds' room is (6,0).");
  const points = game.variable(clearPoints);
  await game.face("E");
  const mark = game.printed.length;
  let bashes = 0;
  for (; game.here().x !== 7; bashes++) {
    if (bashes >= 12) game.fail("Twelve tries did not open the way into the kobolds' room.");
    if (/Locked\. Bash Pick Exit\s*$/.test(game.menu())) await game.press("b");
    else await game.press("up");
  }
  at(game, 7, 0, "Location 6 is (7,0).");
  printedInOrder(game, mark, [koboldText], "Entering the room prints the kobolds' text.");
  // [P] §6.3.2: 1 KOBOLD LEADER (#11) and 15 KOBOLD (#0), Morale 60, 289 XP; "The leader carries Bracers AC 6."
  await setFightAsGuideParty(game, state, { label: "the kobolds", foes: { KOBOLD: 15, "KOBOLD LEADER": 1 }, sleeps: 4, listed: 289 });
  const thief = "FINN";
  const loot = await collect(game, thief, [/^Bracers/]);
  assert.equal(loot.filter((name) => /^Bracers/.test(name)).length, 1, `The treasure holds one pair of bracers; the game listed ${JSON.stringify(loot)}.`);
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");

  // They are Bracers AC 6. [P] §4.1.2: "A thief should get magical leather armor, or better yet
  // Bracers of Defense". With his armor off and the bracers on, the thief's armor class is 6 less
  // the 4 his Dexterity of 19 gives: 2.
  await game.viewSheet(thief);
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the thief carries.");
  const carried = game.items().map((item, index) => ({ ...item, index }));
  for (const armor of carried.filter(({ name, ready }) => name === "Leather Armor" && ready)) {
    await selectItemAt(game, armor.index);
    await game.press("r");
    assert.equal(game.items()[armor.index].ready, false, "Ready on the armor he wears takes it off.");
  }
  const bracers = carried.find(({ name }) => /^Bracers/.test(name));
  assert.ok(bracers && !bracers.ready, `The thief carries the bracers, not yet ready: ${JSON.stringify(game.items())}`);
  await selectItemAt(game, bracers.index);
  await game.press("r");
  assert.equal(game.items()[bracers.index].ready, true, "Ready puts the bracers on.");
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  assert.equal(sheet(game.frame).ac, 2, "With the bracers and no armor the thief's armor class is 2: 6 from the bracers, less 4 for Dexterity 19.");
  await game.press("e", exploring, "Exit leaves the character sheet.");

  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the kobolds: ${bashes} tries at the door; loot ${JSON.stringify(loot)}; recovered with ${rest.cures} cures and ${rest.rests} rests`);
}

const hobgoblinText = "SOME HOBGOBLINS ARE ARGUING OVER A PILE OF GOLD. 'THIEVES!' THEY SCREAM WHEN THEY SEE YOU.";

/**
 * Stage: the hobgoblins at (0,2) (location 10) and their gold, from the kobolds' room. Proves
 * acceptance.slums.hobgoblins-gold: the text, five hobgoblins, a win, one clear point; then, with
 * Search on, "YOU FIND A LARGE NUMBER OF VALUABLES.", 258 experience points, 500 gold and 50
 * platinum pieces, a ring and a short bow; and that the ring is a Ring of Protection +1. The
 * script hands out the treasure when the room is entered with Search on after the fight
 * (ECL2.DAX block 20 at aa8c to aacf). Ends rested in the room.
 */
async function guideHobgoblins(game, state) {
  at(game, 7, 0, "The stage starts in the kobolds' room.");
  // West and south to the lane at y=2, west to (2,2), north through (2,1) and (2,0), west and south to (0,1).
  await arriveFit(game, state, "WSWWSWWNNWSW", 2, "the hobgoblins' door");
  at(game, 0, 1, "The square north of the hobgoblins' room is (0,1).");
  const points = game.variable(clearPoints);
  await game.face("S");
  const mark = game.printed.length;
  let bashes = 0;
  for (; game.here().y !== 2; bashes++) {
    if (bashes >= 12) game.fail("Twelve tries did not open the way into the hobgoblins' room.");
    if (/Locked\. Bash Pick Exit\s*$/.test(game.menu())) await game.press("b");
    else await game.press("up");
  }
  at(game, 0, 2, "Location 10 is (0,2).");
  printedInOrder(game, mark, [hobgoblinText], "Entering the room prints the hobgoblins' text.");
  // [P] §6.3.2: "Fight 5 HOBGOBLIN (#6) (Morale 75)". The guide lists no experience for the fight itself.
  const fight = await setFightAsGuideParty(game, state, { label: "the hobgoblins", foes: { HOBGOBLIN: 5 }, sleeps: 3 });
  await leaveFight(game);
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");

  // "After combat, you can search to find their treasure (258 XP): 50 platinum, 500 gold, Ring of Protection +1, Short Bow +1."
  await game.walk("N");
  await game.press("s");
  assert.equal(game.position()?.mode, "search", "S turns Search on: the status line says so.");
  await game.face("S");
  const search = game.printed.length;
  await game.press("up");
  printedInOrder(game, search, ["YOU FIND A LARGE NUMBER OF VALUABLES."], "Entering the beaten room with Search on finds the hobgoblins' valuables.");
  const wearer = "ELSPETH";
  const { loot } = await claimTreasure(game, { taker: wearer, xp: 258, money: { Gold: 500, Platinum: 50 }, label: "the hobgoblins' gold" });
  at(game, 0, 2, "The valuables are in the hobgoblins' room.");
  assert.equal(loot.length, 2, `The valuables hold two items beside the money; the game listed ${JSON.stringify(loot)}.`);
  assert.ok(loot.includes("Short Bow") && loot.some((name) => /^Ring/.test(name)), `The items are a ring and a short bow; the game listed ${JSON.stringify(loot)}.`);
  await game.press("s");
  assert.equal(game.position()?.mode, undefined, "S turns Search off again.");

  // The ring is a Ring of Protection +1: on the cleric's hand her armor class is one better.
  const without = await game.viewSheet(wearer);
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the cleric carries.");
  const ring = game.items().findIndex(({ name }) => /^Ring/.test(name));
  assert.ok(ring >= 0 && !game.items()[ring].ready, `The cleric carries the ring, not yet ready: ${JSON.stringify(game.items())}`);
  await selectItemAt(game, ring);
  await game.press("r");
  assert.equal(game.items()[ring].ready, true, "Ready puts the ring on.");
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  assert.equal(sheet(game.frame).ac, without.ac - 1, `With the ring on the cleric's armor class is ${without.ac - 1}, one better than ${without.ac}: a Ring of Protection +1.`);
  await game.press("e", exploring, "Exit leaves the character sheet.");

  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`the hobgoblins: ${bashes} tries at the door, ${fight.xp} experience points for the fight; loot ${JSON.stringify(loot)}; recovered with ${rest.cures} cures and ${rest.rests} rests`);
}

/** Gold pieces to one coin of each kind (200 cp = 20 sp = 2 ep = 1 gp = 1/5 pp); gems and jewelry are not money to a trainer. */
const goldValue = { Copper: 1 / 200, Silver: 1 / 20, Electrum: 1 / 2, Gold: 1, Platinum: 5 };
const inGold = (purse) => Math.round(Object.entries(purse).reduce((sum, [kind, count]) => sum + (goldValue[kind] ?? 0) * count, 0) * 200) / 200;
const templeMenu = /Heal View (?:Take )?Pool (?:Share )?Appraise Exit\s*$/;
const clericSign = "A SIGN ON THE WALL DIRECTS MAGIC USERS TO GO THROUGH THE EAST DOOR AND CLERICS TO GO THROUGH THE WEST DOOR.";
/** What the trainer flashes for a character without the price ("Training costs 1000 gp."), named before class or experience is looked at (party-care self-test). */
const trainingPrice = 1000;

/**
 * In New Phlan at the gate (0,4): put 1000 gold pieces' worth of platinum and gold in `member`'s
 * purse at the Temple of Sune (Pool, Take, then Share for the rest), walk to the clerics' trainer
 * at (5,0) and open his party menu. Returns the purses and sheets read on the way in.
 */
async function toClericTrainer(game, member) {
  at(game, 0, 4, "The trip to the trainer starts at the gate.");
  await game.walk("EN");
  await game.press("y", templeMenu, "YES opens the temple menu.");
  await pool(game);
  await game.press("t", /Select type of coin Exit\s*$/, "Take lists the pooled coins.");
  const pooled = Object.fromEntries([...game.rows().join("\n").matchAll(/^\s*(Copper|Silver|Electrum|Gold|Platinum|Gems|Jewelry) +(\d+)\s*$/gm)].map(([, kind, count]) => [kind, +count]));
  await game.press("e", templeMenu, "Exit leaves the list.");
  // Platinum first (it weighs a fifth of its worth in gold), then gold to make up the price.
  const platinum = Math.min(pooled.Platinum ?? 0, trainingPrice / 5);
  const gold = trainingPrice - platinum * 5;
  if ((pooled.Gold ?? 0) < gold) game.fail(`The party's pool does not hold ${trainingPrice} gold pieces in platinum and gold: ${JSON.stringify(pooled)}.`);
  await takeCoins(game, member, { ...(platinum ? { Platinum: platinum } : {}), ...(gold ? { Gold: gold } : {}) });
  // Share deals the rest out again; the coins just taken stay with the one who took them.
  await game.press("s", templeMenu, "Share deals out what is left of the pool.");
  await game.press("e", exploring, "Exit leaves the temple.");
  const purse = (await game.purses())[member];
  const before = await game.viewSheet(member);
  await game.press("e", exploring, "Exit leaves the character sheet.");
  const mark = game.printed.length;
  await game.walk("SENNEEEENN");
  assert.equal(flat(game.printed.slice(mark).at(-1) ?? ""), clericSign, "The square between the two halls, (6,0), has the sign for magic-users and clerics.");
  await game.walk("W");
  game.expect(/'WE TRAIN ONLY CLERICS HERE\. DO YOU WANT TO TRAIN\?' Yes No\s*$/, "The trainer at (5,0) trains clerics and asks.");
  await game.press("y", /Train Character/, "YES opens the trainer's party menu.");
  return { pooled, purse, before };
}

/** From the trainer's party menu: BEGIN Adventuring and walk back to the gate at (0,4). */
async function fromClericTrainer(game) {
  await game.press("b", exploring, "BEGIN Adventuring leaves the trainer.");
  at(game, 5, 0, "The clerics' hall is (5,0).");
  await game.walk("ESSWWWWSSWW");
  at(game, 0, 4, "The party is back at the gate.");
}

/**
 * Stage: training. From the hobgoblins' room the party walks out of the Slums, and the cleric,
 * who alone has the experience for a second level (a cleric needs 1,501; the others' awards are
 * divided among two or three classes), trains at the clerics' hall for 1000 gold pieces. [P] §4.3:
 * "Once a character has enough experience to gain a level, training costs 1000 gold at the
 * appropriate training hall in town"; the data card: "When your characters have enough experience
 * points and money, train in the training hall."
 *
 * Before she trains, two others carry the price to the same trainer and are refused: the
 * cleric/fighter/magic-user, who has the class and not the experience, and a fighter/magic-user,
 * who has not the class. And the trainer's menu has Modify Character: the game refuses it for a
 * character who has experience points, which settles when Modify stops (qa/disagreements.json).
 */
async function guideTrain(game, state) {
  at(game, 0, 2, "The stage starts in the hobgoblins' room.");
  // North out of the room, back to the lane at y=2, east along it and down the lane at x=13 to the entrance.
  await walkAsGuideParty(game, "NENESSEEEESENEEEEEESSSSSENNNE", state, "the way out");
  at(game, 15, 4, "The Slums entrance is (15,4).");
  await game.face("E");
  await game.press("up");
  at(game, 0, 4, "East from the Slums entrance is the New Phlan gate.");
  // The city's streets allow no rest, but the cures in memory can be cast.
  const tended = await tendTheHurt(game);
  progress(`training: back in New Phlan; ${tended} cures cast at the gate; the party list shows ${game.party().map(({ hp }) => hp).join(" ")}`);

  // What the clerics' trainer answers a character who has the price (the game's own words, seen on
  // 2026-11-21; the guides quote neither): a cleric short of experience, and a character of another class.
  const refusals = {};
  for (const [member, answer] of [["DORIAN", "Not Enough Experience"], ["AELAR", "We don't train that class here"]]) {
    const { before } = await toClericTrainer(game, member);
    assert.equal(before.level.replaceAll("1", "").replaceAll("/", ""), "", `${member} is still level 1 in every class: ${before.level}.`);
    assert.ok(before.exp < 1501, `${member}'s sheet shows less than the 1,501 experience points of a second-level cleric: ${before.exp}.`);
    refusals[member] = await train(game, member);
    progress(`training: ${member} (${before.classes}, ${before.exp} experience points on the sheet) with the price in hand: ${JSON.stringify(refusals[member])}`);
    assert.deepEqual(refusals[member], { refused: answer }, `${member}, ${before.classes}, has the price and is refused with "${answer}".`);
    await fromClericTrainer(game);
  }

  const cleric = "ELSPETH";
  const { purse, before } = await toClericTrainer(game, cleric);
  assert.equal(before.level, "1", "The cleric is level 1.");
  assert.ok(before.exp >= 1501 && before.exp < 3001, `The cleric has the experience for level 2 and not for level 3: ${before.exp}.`);
  // Modify Character is on this menu too. She has experience points and has not gone up a level.
  await game.press("end");
  await game.highlight(cleric);
  let shown = game.flashed.length;
  await game.press("m", /Choose a function\s*$/, "Modify is refused: the party menu stays up.");
  assert.deepEqual(flashedSince(game, shown), [`${cleric} can't be modified.`], "Modify Character on a level 1 character who has experience points is refused on the bottom line.");
  // A character without the price is told the price, whoever it is.
  assert.deepEqual(await train(game, "FINN"), { refused: `Training costs ${trainingPrice} gp.` }, "A character without 1000 gold pieces is told what training costs.");
  shown = game.flashed.length;
  const trained = await train(game, cleric);
  assert.ok(trained.trained && /ELSPETH will become: a level 2 Cleric Do you wish to train\? Yes No\s*$/.test(trained.text), `The trainer offers the cleric her second level: ${JSON.stringify(trained)}.`);
  assert.deepEqual(flashedSince(game, shown), ["Congratulations..."], "The trainer congratulates her on the bottom line.");
  await fromClericTrainer(game);
  const after = await game.viewSheet(cleric);
  await game.press("e", exploring, "Exit leaves the character sheet.");
  const purseAfter = (await game.purses())[cleric];
  assert.equal(after.level, "2", "She has gained exactly one level.");
  assert.equal(after.exp, before.exp, "Training leaves her experience points as they were.");
  // A cleric gains 1 to 8 hit points with a level (the rule book p.4), and 2 more for Constitution 18.
  assert.ok(after.hp - before.hp >= 3 && after.hp - before.hp <= 10, `She gained ${after.hp - before.hp} hit points: 1 to 8, and 2 for Constitution.`);
  assert.equal(inGold(purse) - inGold(purseAfter), trainingPrice, `Training took exactly 1000 gold pieces' worth of her coins: ${JSON.stringify(purse)} before, ${JSON.stringify(purseAfter)} after.`);
  state.training = { refusals, before: { hp: before.hp, exp: before.exp, purse }, after: { hp: after.hp, purse: purseAfter } };
  progress(`training: ${cleric} is level 2, hit points ${before.hp} to ${after.hp}; purse ${JSON.stringify(purse)} to ${JSON.stringify(purseAfter)}`);
}

// ---- After the first training: the rest of the block ------------------------------------------
//
// Squares, doors and routes below were read from the map (GEO2.DAX block 20): each square's event
// number is the low seven bits of its third byte, and the script's table at 99c9 sends event n to
// the n-th address after the first. Rest is safe on any square that has an event (9a24), which is
// every room named here.

/** At a door the party faces: go through, bashing while the game says it is locked. Returns how many bashes it took. */
async function throughDoor(game, heading, why) {
  await game.face(heading);
  const from = game.here();
  let bashes = 0;
  // Behind some doors the game shows a picture and a menu of its own, and no square: that is through, too.
  const stillThere = () => { const now = game.here(); return now && now.x === from.x && now.y === from.y; };
  for (let tries = 0; stillThere(); tries++) {
    if (tries >= 14) game.fail(`Fourteen tries did not open the way ${heading}: ${why}`);
    if (/Locked\. Bash Pick Exit\s*$/.test(game.menu())) { await game.press("b"); bashes++; }
    else await game.press("up");
  }
  return bashes;
}

/**
 * At the treasure menu: `taker` takes every item of the loot that matches one of `wanted`, looking
 * through the whole list with Next, and at most `most` of them. Returns the names taken. Leaves
 * the game on the treasure menu.
 */
async function takeFromLoot(game, taker, wanted, most = 8) {
  const lootMenu = /Items: Take (?:Next )?(?:Prev )?Exit\s*$/;
  const anyTreasure = () => treasureMenu.test(game.menu()) || emptiedTreasureMenu.test(game.menu()) || /^View (?:Take )?Pool (?:Share )?Exit$/.test(game.menu());
  const listed = () => {
    const rows = game.rows().map((row) => row.trim()).filter(Boolean);
    return rows.slice(rows.indexOf("Loot") + 1, -1);
  };
  const taken = [];
  await game.highlight(taker);
  for (let rounds = 0; taken.length < most; rounds++) {
    if (rounds >= 120) game.fail("The loot list did not come to an end.");
    if (anyTreasure()) {
      if (!/\bTake\b/.test(game.menu())) break;
      await game.press("t", /Take: (?:Money )?(?:Items )?Exit\s*$/, "Take offers what there is.");
      if (!/\bItems\b/.test(game.menu())) { await game.press("e"); break; }
      await game.press("i", lootMenu, "Items lists the loot.");
    }
    const next = listed().find((name) => wanted.some((pattern) => pattern.test(name)));
    if (next) {
      await game.selectLine(new RegExp(`^${next.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      const flashes = game.flashed.length;
      await game.press("t");
      // "Overloaded" and the like: the game says so on the bottom line and gives nothing.
      const said = game.flashed.slice(flashes).map(({ text }) => text);
      if (said.length) game.fail(`${taker} could not take ${next}: ${said.join(" ")}`);
      taken.push(next);
    } else if (/\bNext\b/.test(game.menu())) await game.press("n", lootMenu, "Next moves the loot list on.");
    else break;
  }
  for (let presses = 0; !anyTreasure(); presses++) {
    if (presses >= 4) game.fail("Taking the loot did not lead back to the treasure menu.");
    await game.press("e");
  }
  return taken;
}

/** At the treasure menu: share out the money, if there is any, and leave to the exploration menu. */
async function shareAndLeave(game) {
  if (/\bShare\b/.test(game.menu())) await game.press("s");
  await leaveFight(game);
}

/** The whole loot list of the treasure menu, as the game names it. Leaves the game on the treasure menu. */
async function readLoot(game) {
  const lootMenu = /Items: Take (?:Next )?(?:Prev )?Exit\s*$/;
  const listed = () => {
    const rows = game.rows().map((row) => row.trim()).filter(Boolean);
    return rows.slice(rows.indexOf("Loot") + 1, -1);
  };
  await game.press("t", /Take: (?:Money )?(?:Items )?Exit\s*$/, "Take offers what there is.");
  if (!/\bItems\b/.test(game.menu())) { await game.press("e"); return []; }
  await game.press("i", lootMenu, "Items lists the loot.");
  const loot = [...listed()];
  for (let pages = 0; /\bNext\b/.test(game.menu()); pages++) {
    if (pages >= 120) game.fail("The loot list is longer than this test expects.");
    await game.press("n", lootMenu, "Next moves the loot list on.");
    loot.push(listed().at(-1));
  }
  for (let presses = 0; !treasureMenu.test(game.menu()); presses++) {
    if (presses >= 4) game.fail("Reading the loot did not lead back to the treasure menu.");
    await game.press("e");
  }
  return loot;
}

const count = (list) => list.reduce((counted, name) => ({ ...counted, [name]: (counted[name] ?? 0) + 1 }), {});

/** Recover on a square where rest is safe and note it. */
async function recoverHere(game, state, label) {
  const rest = await recover(game);
  state.sleeps = sleepsAfterRest;
  progress(`${label}: recovered with ${rest.cures} cures and ${rest.rests} rests; the party list shows ${game.party().map(({ hp }) => hp).join(" ")}`);
}

const orcHomeText = "A LARGE ORC RAISES HIS HEAD AND SNARLS, 'HOW DARE YOU BREAK INTO OUR HOME?'";
const orcHomeFought = 0x4acd;

/**
 * Stage: the orcs' home at (3,3) (location 9), from the New Phlan gate after the cleric's training.
 * Proves acceptance.slums.orc-home. The party walks to the stable, rests there, and goes in by the
 * home's one door, the locked one north of (3,4).
 */
async function guideOrcHome(game, state) {
  at(game, 0, 4, "The stage starts at the New Phlan gate.");
  await game.face("W");
  await game.press("up");
  at(game, 15, 4, "One step west of the gate is the Slums entrance.");
  await walkAsGuideParty(game, "WSSSWNNNNNWWWWWSWWN", state, "to the stable");
  at(game, 6, 2, "The stable is (6,2).");
  await recoverHere(game, state, "the stable");
  await arriveFit(game, state, "SSWWW", 5, "the orcs' home");
  at(game, 3, 4, "The square south of the orcs' home is (3,4).");
  const points = game.variable(clearPoints);
  assert.equal(game.variable(orcHomeFought), 0, "The orcs' home has not been fought yet.");
  const mark = game.printed.length;
  const bashes = await throughDoor(game, "N", "the door north of (3,4)");
  at(game, 3, 3, "Location 9 is (3,3).");
  printedInOrder(game, mark, [orcHomeText], "Entering the home prints the large orc's words.");
  // [P] §6.3.2: 1 ORC LEADER (#15), 3 ORC LEADER (#14), 16 ORC (#4), Morale 70, 412 XP. The script
  // asks for 20 of monster 4 (a9fa); what the fight holds is what Aim lists.
  const fight = await setFightAsGuideParty(game, state, { label: "the orcs' home", foes: { ORC: 16, "ORC LEADER": 4 }, sleeps: 6, listed: 412 });
  // "3 Broad Swords +1, Chain Mail +1, Flail +1": the game names unidentified magic by its plain name.
  const loot = await readLoot(game);
  const listed = count(loot);
  progress(`the orcs' home: ${bashes} bashes; loot ${JSON.stringify(listed)}`);
  assert.equal(listed["Broad Sword"], 3, `The treasure holds three broad swords; the game listed ${JSON.stringify(listed)}.`);
  assert.equal(listed["Chain Mail"], 4, `The treasure holds four suits of chain mail, one from each leader; the game listed ${JSON.stringify(listed)}.`);
  assert.equal(listed.Flail, 1, `The treasure holds one flail; the game listed ${JSON.stringify(listed)}.`);
  // Whoever is on his feet takes them: a character who is down takes nothing. The first standing
  // member takes the swords and the flail, the last the mail.
  const up = game.party().filter(({ hp }) => hp > 0).map(({ name }) => name);
  // The mail goes to the last standing member who can wear it: a thief is held to leather (the
  // guide's FINN wears none of the chain mail's class and no armor at all in the fixture).
  const mailWearers = up.filter((name) => !/Thief/.test(guideParty.find((who) => who.name === name).classes));
  const [arms, armorer] = [up[0], (mailWearers.at(-1) ?? up.at(-1))];
  assert.equal((await takeFromLoot(game, arms, [/^Broad Sword$/, /^Flail$/], 4)).length, 4, `${arms} takes the three broad swords and the flail.`);
  assert.equal((await takeFromLoot(game, armorer, [/^Chain Mail$/], 4)).length, 4, `${armorer} takes the four suits of chain mail.`);
  await shareAndLeave(game);
  at(game, 3, 3, "After the fight the party stands in the home.");
  assert.equal(game.variable(orcHomeFought), 255, "The script records the fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");
  await recoverHere(game, state, "the orcs' home");

  // One of the four suits is Chain Mail +1 ([P] §6.3.2; the game names unidentified magic by its
  // plain name): worn in turn, three give the same armor class and one gives a class one better.
  const wearing = await game.viewSheet(armorer);
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what is carried.");
  const worn = game.items().findIndex(({ name, ready }) => name === wearing.armor && ready);
  const suits = game.items().map(({ name }, index) => (name === "Chain Mail" ? index : -1)).filter((index) => index >= 0);
  assert.ok(worn >= 0 && suits.length === 4, `${armorer} wears ${wearing.armor} and carries four suits of chain mail: ${JSON.stringify(game.items())}`);
  await selectItemAt(game, worn);
  await game.press("r");
  assert.equal(game.items()[worn].ready, false, "Ready on the armor worn takes it off.");
  /** The armor class the sheet shows in each of the four suits, worn in turn. */
  const inEachSuit = async () => {
    const classes = [];
    for (const suit of suits) {
      await selectItemAt(game, suit);
      await game.press("r");
      assert.equal(game.items()[suit].ready, true, "Ready puts the chain mail on.");
      await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
      classes.push(sheet(game.frame).ac);
      await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what is carried.");
      await selectItemAt(game, suit);
      await game.press("r");
      assert.equal(game.items()[suit].ready, false, "Ready takes it off again.");
    }
    return classes;
  };
  // A ring of protection comes off for the comparison. On 2026-11-22 the cleric, wearing her Ring
  // of Protection +1, had the same armor class in all four suits: what she read with the ring on
  // is kept beside what she reads with it off.
  const ring = game.items().findIndex(({ name, ready }) => /^Ring/.test(name) && ready);
  let withRing;
  if (ring >= 0) {
    withRing = await inEachSuit();
    await selectItemAt(game, ring);
    await game.press("r");
    assert.equal(game.items()[ring].ready, false, "Ready on the ring takes it off.");
  }
  const classes = await inEachSuit();
  const plain = Math.max(...classes);
  assert.deepEqual([...classes].sort((a, b) => a - b), [plain - 1, plain, plain, plain],
    `Three suits give ${armorer} armor class ${plain} and one gives ${plain - 1}: one suit is Chain Mail +1. The four gave ${classes.join(", ")}.`);
  // [P] §7 (the digest's order of armor class): "Ring of Protection (only if no magic armor)".
  // With the ring on, the three plain suits read one better and the +1 suit reads the same: all four alike.
  if (withRing) assert.deepEqual(withRing, [plain - 1, plain - 1, plain - 1, plain - 1],
    `With a Ring of Protection +1 on, all four suits give ${plain - 1}: the ring counts with the plain suits and not with the +1 suit. They gave ${withRing.join(", ")}.`);
  // The +1 suit stays on, and the ring goes back on.
  await selectItemAt(game, suits[classes.indexOf(plain - 1)]);
  await game.press("r");
  if (ring >= 0) {
    await selectItemAt(game, ring);
    await game.press("r");
    assert.equal(game.items()[ring].ready, true, "Ready puts the ring back on.");
  }
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  const now = sheet(game.frame).ac;
  await game.press("e", exploring, "Exit leaves the character sheet.");
  state.chainMail = { armorer, before: wearing.ac, armor: wearing.armor, classes, withRing, now };
  progress(`the orcs' home: ${arms} took the swords and the flail; ${armorer}'s armor class in each suit of chain mail ${classes.join(", ")}${withRing ? ` (with the ring on: ${withRing.join(", ")})` : ""}; ${wearing.ac} before in ${wearing.armor}, ${now} now in the +1 suit`);
  return fight;
}

const guardsText = "GUARDS RUN TO INTERCEPT YOU.";
const guardsFought = 0x4acf;

/**
 * Stage: the guards at (0,7) (location 13), from the orcs' home. Proves
 * acceptance.slums.guards-intercept. The guards' three squares, (0,5) to (0,7), are entered from
 * the south, through the door north of (0,8); the way there crosses the old hemp market.
 */
async function guideGuards(game, state) {
  at(game, 3, 3, "The stage starts in the orcs' home.");
  await arriveFit(game, state, "SESSWWSSWW", 5, "the guards' door");
  at(game, 0, 8, "The square south of the guards is (0,8).");
  const points = game.variable(clearPoints);
  assert.equal(game.variable(guardsFought), 0, "The guards have not been fought yet.");
  const mark = game.printed.length;
  const bashes = await throughDoor(game, "N", "the door north of (0,8)");
  at(game, 0, 7, "Location 13 is (0,7).");
  printedInOrder(game, mark, [guardsText], "Entering prints the guards' text.");
  // [P] §6.3.2: 2 ORC LEADER (#5) + 30 ORC (#4), Morale 60, 99 XP. The script asks for 4 of monster 5 (ab89).
  const fight = await setFightAsGuideParty(game, state, { label: "the guards", foes: { ORC: 30, "ORC LEADER": 2 }, sleeps: 6, listed: 99 });
  if (treasureMenu.test(game.menu())) await shareAndLeave(game); else await leaveFight(game);
  at(game, 0, 7, "After the fight the party stands where the guards were.");
  assert.equal(game.variable(guardsFought), 255, "The script records the fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");
  progress(`the guards: ${bashes} bashes`);
  await recoverHere(game, state, "the guards");
  return fight;
}

const leadersText = "YOU INTRUDE ON A GATHERING OF MONSTER LEADERS.";
const leadersFought = 0x4ad0;

/**
 * Stage: the monster leaders at (1,5) (location 14), from the guards' post. Proves
 * acceptance.slums.monster-leaders. The room has one door, in its west wall, from the guards' (0,5).
 */
async function guideLeaders(game, state) {
  at(game, 0, 7, "The stage starts where the guards were.");
  const before = game.printed.length;
  await game.walk("NN");
  printedInOrder(game, before, [], "The guards' other squares are silent once the guards are beaten.");
  at(game, 0, 5, "The square west of the leaders' room is (0,5).");
  if (hurt(game).length || state.sleeps < sleepsAfterRest) await recoverHere(game, state, "before the leaders");
  const points = game.variable(clearPoints);
  assert.equal(game.variable(leadersFought), 0, "The leaders have not been fought yet.");
  const mark = game.printed.length;
  const bashes = await throughDoor(game, "E", "the door east of (0,5)");
  at(game, 1, 5, "Location 14 is (1,5).");
  printedInOrder(game, mark, [leadersText], "Entering prints the leaders' text.");
  // [P] §6.3.2: 1 OGRE (#8), 2 GNOLL (#73), 2 HOBGOBLIN LDR (#7), Morale 80, Distance 1, 63 XP.
  const fight = await setFightAsGuideParty(game, state, { label: "the monster leaders", foes: { OGRE: 1, GNOLL: 2, "HOBGOBLIN LDR": 2 }, sleeps: 6, listed: 63 });
  if (treasureMenu.test(game.menu())) await shareAndLeave(game); else await leaveFight(game);
  at(game, 1, 5, "After the fight the party stands in the leaders' room.");
  assert.equal(game.variable(leadersFought), 255, "The script records the fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");
  progress(`the monster leaders: ${bashes} bashes`);
  await recoverHere(game, state, "the monster leaders");
  return fight;
}

const goblinGuardsText = "YOU HAVE ALERTED THE GUARDS.";
const goblinGuardsFought = 0x4ad8;
const emptyRoomText = "THIS LARGE ROOM IS APPARENTLY EMPTY.";
const chestText = "YOU FIND A LOOSE FLOORBOARD. PRYING IT UP, YOU FIND A CHEST HIDDEN BENEATH THE FLOOR. DO YOU TAKE IT?";

/**
 * Stage: the goblin guards at (3,11) (location 15), from the leaders' room, and the chest in the
 * room they guard (location 16). Proves acceptance.slums.goblin-guards-alerted and
 * acceptance.slums.empty-room-hidden-chest. The guards' two squares are entered from the west,
 * through the locked door east of (2,11); the empty room's only door is in the guards' east wall.
 */
async function guideGoblinGuards(game, state) {
  at(game, 1, 5, "The stage starts in the leaders' room.");
  await arriveFit(game, state, "WSSSEESSS", 5, "the goblin guards' door");
  at(game, 2, 11, "The square west of the goblin guards is (2,11).");
  const points = game.variable(clearPoints);
  assert.equal(game.variable(goblinGuardsFought), 0, "The goblin guards have not been fought yet.");
  let mark = game.printed.length;
  const bashes = await throughDoor(game, "E", "the door east of (2,11)");
  at(game, 3, 11, "Location 15 is (3,11).");
  printedInOrder(game, mark, [goblinGuardsText], "Entering prints the guards' text.");
  // [P] §6.3.2: 11 GOBLIN LEADER (#3) + 12 GOBLIN GUARD (#2), Morale 60, 65 XP. The script asks for 21 of monster 3 (ac43).
  const fight = await setFightAsGuideParty(game, state, { label: "the goblin guards", foes: { "GOBLIN GUARD": 12, "GOBLIN LEADER": 11 }, sleeps: 6, listed: 65 });
  if (treasureMenu.test(game.menu())) await shareAndLeave(game); else await leaveFight(game);
  at(game, 3, 11, "After the fight the party stands where the goblins were.");
  assert.equal(game.variable(goblinGuardsFought), 255, "The script records the fight as fought.");
  assert.equal(game.variable(clearPoints), points + 1, "The fight credits exactly one clear point.");
  progress(`the goblin guards: ${bashes} bashes`);
  await recoverHere(game, state, "the goblin guards");
  return fight;
}

/**
 * Stage: the chest in the room the goblin guards guarded (location 16), from their square.
 * Proves acceptance.slums.empty-room-hidden-chest. Without Search the room only says it is empty;
 * the chest is found with Search on (the script at ac8e) and offered once.
 */
async function guideChest(game) {
  at(game, 3, 11, "The stage starts where the goblin guards were.");
  const before = await experience(game);
  await game.walk("N");
  let mark = game.printed.length;
  await throughDoor(game, "E", "the door east of (3,10)");
  at(game, 4, 10, "The empty room's west square is (4,10).");
  printedInOrder(game, mark, [emptyRoomText], "Without Search the room prints only that it is empty.");
  game.expect(exploring, "Nothing is offered without Search.");
  await game.walk("W");
  await game.press("s");
  assert.equal(game.position()?.mode, "search", "S turns Search on: the status line says so.");
  mark = game.printed.length;
  await throughDoor(game, "E", "the door east of (3,10)");
  printedInOrder(game, mark, [chestText], "With Search on the room gives up its chest; its own text is shown once.");
  game.expect(/DO YOU TAKE IT\? Yes No\s*$/, "The chest is offered with YES and NO.");
  await game.press("y");
  // [P] §6.3.2: "2 gems, 200 platinum, Shield +1, Magic-User Scroll (Magic Missile) (383 XP)".
  const { loot, exp } = await claimTreasure(game, { taker: "FINN", xp: 383, money: { Gems: 2, Platinum: 200 }, label: "the hidden chest" });
  assert.deepEqual([...loot].sort(), ["Magic User Scroll With 1 Spell", "Shield"], `The chest holds a shield and a magic-user scroll with one spell; the game listed ${JSON.stringify(loot)}.`);
  for (const [name, points] of Object.entries(exp)) assert.ok(points >= before[name] + perClass(name, 383), `${name}'s sheet shows at least ${perClass(name, 383)} experience points more: ${before[name]} then, ${points} now.`);
  await game.walk("W");
  const again = game.printed.length;
  await game.walk("E");
  printedInOrder(game, again, [], "A second visit with Search on prints nothing: the chest is gone.");
  await game.press("s");
  assert.equal(game.position()?.mode, undefined, "S turns Search off again.");
  // The shield is +1: the thief has no shield, and with the chest's on his arm his armor class
  // is 2 better, a shield's 1 and its +1.
  const without = await game.viewSheet("FINN");
  await game.press("i", /Ready Use Trade Drop Halve Join Exit\s*$/, "Items lists what the thief carries.");
  const shield = game.items().findIndex(({ name }) => name === "Shield");
  assert.ok(shield >= 0 && !game.items()[shield].ready, `The thief carries the shield, not yet ready: ${JSON.stringify(game.items())}`);
  await selectItemAt(game, shield);
  await game.press("r");
  assert.equal(game.items()[shield].ready, true, "Ready puts the shield on his arm.");
  await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
  const withShield = sheet(game.frame).ac;
  await game.press("e", exploring, "Exit leaves the character sheet.");
  progress(`the hidden chest: loot ${JSON.stringify(loot)}; the thief's armor class ${without.ac} without the shield, ${withShield} with it`);
  assert.equal(withShield, without.ac - 2, `With the chest's shield the thief's armor class is ${without.ac - 2}, two better than ${without.ac}: a Shield +1.`);
}

const ohloText = "YOU BURST INTO AN ELEGANTLY PANELLED ROOM. A SMALL MAN SITS HUNCHED OVER A TABLE BY THE EAST WALL. HE SETS DOWN HIS PEN AND GAZES STERNLY AT YOU. 'WELL?', HE DEMANDS. (WHAT DO YOU DO?)";
const ohloOffer = "'I MAY HAVE A USE FOR YOU,' THE MAN SAYS. 'SOME TIME AGO, I ORDERED A SPECIAL POTION. THE POTION IS READY BUT I CAN'T LEAVE TO FETCH IT. BRING IT HERE, I PAY WELL.' (WHAT DO YOU DO?)";
const ohloWhere = "'IT WAITS IN A BOOTH IN THE OLD ROPE GUILD BUT A SHORT DISTANCE TO THE SOUTHEAST FROM WHERE YOU NOW STAND. SPEAK MY NAME, OHLO.'";
const ohloLeave = "YOU GO BACK OUT THE DOOR.";
const merchantText = "A MAN HURRIES FORWARD. 'I AM SORRY, NOBLE ONES, BUT I HAVE NOTHING TO SELL.'";
const merchantAsk = "WHAT DO YOU SAY? (TYPE A SINGLE WORD)";
const merchantPackage = "'WAIT A MOMENT,' THE MAN SAYS. HE HURRIES TO THE BACK OF THE BOOTH AND RETURNS WITH A PACKAGE. 'HERE,' HE SAYS.";
const ohloReturn = "'YOU HAVE DONE WELL. GIVE ME THE POTION AND YOU WILL BE REWARDED.' (WHAT DO YOU DO?)";
const ohloReward = "THE MAN TAKES THE POTION AND GULPS IT GREEDILY. AS YOU WATCH, HE SEEMS TO GROW YOUNGER AND STRONGER. 'EXCELLENT,' HE SMACKS, 'YOUR REWARD.'";
const guildNorth = "YOU ARE JUST NORTH OF THE ENTRY TO THE OLD ROPE GUILD.";
const guildText = "YOU HAVE ENTERED THE MYSTERIOUS BUILDING THAT WAS ONCE THE ROPE GUILD. MOST WHO VENTURE INTO ITS TWISTY HALLS NEVER RETURN.";
/** Ohlo's state (the script at 9f13 to a3b6): 250 once the errand is accepted, 255 when he is dealt with. */
const ohloState = 0x4a04;
/** The potion: 250 once the merchant has handed it over, 255 when Ohlo is dealt with. */
const potionState = 0x4a81;

/** Read on through "press return" lines until the game shows a menu of its own or lets the party walk. */
async function readOn(game, limit = 8) {
  for (let presses = 0; pressReturn.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu()); presses++) {
    if (presses >= limit) game.fail("The game kept asking for return.");
    await game.press("enter");
  }
}

/**
 * Stage: Ohlo's errand (locations 3 and 19), from the empty room behind the goblin guards. Proves
 * acceptance.slums.ohlo-fetch-the-potion: TALK and a Nice parley, ACCEPT, the merchant in the Rope
 * Guild and the word OHLO, the package that is no item, GIVE, and the reward. Ends rested in
 * Ohlo's room.
 */
async function guideOhlo(game, state) {
  at(game, 4, 10, "The stage starts in the empty room behind the goblin guards.");
  // Out through the goblin guards' squares, north up the lane at x=2, east along y=2 and down to Ohlo's door.
  await walkAsGuideParty(game, "WSW" + "NNNNNEENNENEENEEESSWSSSSEEEEEESS" + "W", state, "to Ohlo");
  at(game, 14, 10, "The square east of Ohlo's room is (14,10).");
  await tendTheHurt(game);
  assert.equal(game.variable(ohloState), 0, "Ohlo has not been met.");
  assert.equal(game.variable(potionState), 0, "The potion has not been fetched.");
  const points = game.variable(clearPoints);
  const randomsBefore = state.random.length;
  let mark = game.printed.length;
  const ohloBashes = await throughDoor(game, "W", "the door west of (14,10)");
  at(game, 13, 10, "Location 3 is (13,10).");
  if (!game.printed.slice(mark).length) game.fail(`After ${ohloBashes} bashes the party stands at ${JSON.stringify(game.here())} and the game printed nothing.`);
  printedInOrder(game, mark, [ohloText], "Entering prints Ohlo's room and his 'WELL?'.");
  game.expect(/LEAVE TALK ATTACK\s*$/i, "The menu is LEAVE, TALK, ATTACK.");
  await game.press("t");
  game.expect(/HAUGHTY SLY NICE MEEK ABUSIVE\s*$/i, `TALK asks for an attitude; the menu reads "${game.menu()}".`);
  mark = game.printed.length;
  await game.press("n");
  printedInOrder(game, mark, [ohloOffer], "A Nice parley brings his offer.");
  game.expect(/ACCEPT THE COMMISSION REJECT IT\s*$/i, "The menu is ACCEPT THE COMMISSION, REJECT IT.");
  mark = game.printed.length;
  await game.press("a");
  await readOn(game);
  printedInOrder(game, mark, [ohloWhere, ohloLeave], "ACCEPT brings the directions, and the party goes back out of the door.");
  game.expect(exploring, "The party is free to walk.");
  assert.equal(game.variable(ohloState), 250, "The script records the errand as accepted.");
  assert.equal(game.variable(clearPoints), points, "Accepting credits no clear point.");
  const outside = game.here();
  progress(`Ohlo: errand accepted; the party stands at ${outside.x},${outside.y} facing ${outside.facing}`);
  assert.deepEqual([outside.x, outside.y, outside.facing], [14, 10, "E"], "Going back out of the door puts the party on (14,10), east of his room, facing east (the script at a01b).");

  // To the Rope Guild's entry at (6,10): north, west along y=8, up the lane at x=9, west and down the lane at x=7.
  mark = game.printed.length;
  await walkAsGuideParty(game, "E" + "NNWWWWWWNNNNNENWWSSSSSWWWSESS", state, "to the Rope Guild");
  at(game, 6, 10, "The square north of the guild's door is (6,10).");
  assert.equal(flat(game.printed.slice(mark).at(-1) ?? ""), guildNorth, "The square north of the guild's door says so.");
  await tendTheHurt(game);
  // Inside, every square is the guild's (event 18): a rest there is safe by the script's rule
  // (9a24), and an encounter is likelier and larger (ade2: two numbers in eleven, the whole party strength).
  mark = game.printed.length;
  await throughDoor(game, "S", "the guild's door south of (6,10)");
  at(game, 6, 11, "The guild's first square is (6,11).");
  assert.equal(flat(game.printed[mark] ?? ""), guildText, "Entering the guild prints its warning.");
  await inGuild(game, state, "SSSEENNESSENNEENEES", "in the Rope Guild");
  at(game, 14, 12, "The square west of the booth is (14,12).");
  assert.equal(game.variable(clearPoints) - points, state.random.length - randomsBefore, "On the way only the random fights credited clear points, one each.");
}

/** Walk a route inside the Rope Guild, resting where the party stands after each random fight: every square there has the guild's event, so a rest is safe (the script at 9a24). */
async function inGuild(game, state, route, label) {
  for (const heading of route) {
    const before = state.random.length;
    await walkAsGuideParty(game, heading, state, label);
    if (state.random.length > before || hurt(game).length) await recoverHere(game, state, label);
  }
}

/**
 * Stage: the potion, from the square west of the merchant's booth in the Rope Guild. With the
 * stage before it, proves acceptance.slums.ohlo-fetch-the-potion: the merchant and the word OHLO,
 * the package that is no item, the way back, GIVE, and the reward. Ends rested in Ohlo's room.
 */
async function guidePotion(game, state) {
  at(game, 14, 12, "The stage starts west of the booth, at (14,12).");
  assert.equal(game.variable(ohloState), 250, "The errand is accepted.");
  const points = game.variable(clearPoints);
  const carried = await partyItems(game);
  let mark = game.printed.length;
  await throughDoor(game, "E", "the booth's door east of (14,12)");
  printedInOrder(game, mark, [merchantText, "(WHAT DO YOU DO?)"], "The merchant hurries forward and has nothing to sell.");
  game.expect(/LEAVE ATTACK SPEAK\s*$/i, "The menu is LEAVE, ATTACK, SPEAK.");
  mark = game.printed.length;
  await game.press("s");
  printedInOrder(game, mark, [merchantAsk], "SPEAK asks for a single word.");
  for (const letter of "OHLO") await game.press(letter);
  await game.press("enter");
  await readOn(game);
  printedInOrder(game, mark, [merchantAsk, merchantPackage], "The word OHLO brings the package.");
  game.expect(exploring, "The party is free to walk.");
  at(game, 15, 12, "Location 19, the booth, is (15,12).");
  assert.equal(game.variable(potionState), 250, "The script records the package as fetched.");
  assert.deepEqual(await partyItems(game), carried, "The package is no item: nobody carries anything new.");
  assert.equal(game.variable(clearPoints), points, "The package credits no clear point.");

  // Back to Ohlo the way the party came.
  await game.walk("W");
  await inGuild(game, state, back("SSSEENNESSENNEENEES"), "out of the Rope Guild");
  at(game, 6, 11, "The party is back at the guild's first square.");
  await walkAsGuideParty(game, "N" + "NNWNEEENNNNNEESSWSSSSEEEEEESS" + "W", state, "back to Ohlo");
  at(game, 14, 10, "The square east of Ohlo's room is (14,10).");
  await tendTheHurt(game);
  const before = { exp: await experience(game), points: game.variable(clearPoints) };
  mark = game.printed.length;
  await throughDoor(game, "W", "the door west of (14,10)");
  printedInOrder(game, mark, [ohloReturn], "With the package Ohlo asks for the potion.");
  game.expect(/GIVE ASK FOR MORE MONEY REFUSE TO GIVE\s*$/i, "The menu is GIVE, ASK FOR MORE MONEY, REFUSE TO GIVE.");
  mark = game.printed.length;
  await game.press("g");
  await readOn(game);
  printedInOrder(game, mark, [ohloReward], "GIVE: he drinks it and rewards the party.");
  // [P] §6.3.2: "1 jewelry, 150 pp, 1 random magic item (558-891 XP)".
  const { loot, exp } = await claimTreasure(game, { taker: "AELAR", xp: [558, 891], money: { Jewelry: 1, Platinum: 150 }, label: "Ohlo's reward" });
  assert.equal(loot.length, 1, `The reward holds one item beside the money; the game listed ${JSON.stringify(loot)}.`);
  const gained = Object.fromEntries(Object.entries(exp).map(([name, points]) => [name, points - before.exp[name]]));
  assert.equal(flat(game.printed.at(-1) ?? ""), ohloLeave, "After the reward the party goes back out of the door.");
  at(game, 14, 10, "The party stands east of Ohlo's room again.");
  assert.equal(game.variable(ohloState), 255, "The script records Ohlo as dealt with.");
  assert.equal(game.variable(potionState), 255, "The script records the potion as given.");
  assert.equal(game.variable(clearPoints), before.points + 1, "Dealing with Ohlo credits exactly one clear point.");
  // His room is silent now, and a rest there is safe.
  mark = game.printed.length;
  await throughDoor(game, "W", "the door west of (14,10)");
  at(game, 13, 10, "Ohlo's room, its east square, is (13,10).");
  printedInOrder(game, mark, [], "Ohlo's room is silent once he has been dealt with.");
  await recoverHere(game, state, "Ohlo's room");
  state.ohlo = { loot, gained };
  progress(`Ohlo: reward item ${JSON.stringify(loot)}; experience gained on the sheets ${JSON.stringify(gained)}`);
}

/**
 * Stage: the random encounters still to beat, from Ohlo's room: out of his door to (14,10) and to
 * and fro between it and (15,10) with Search on, until the script has counted fifteen (0x4a80).
 */
async function guideRandoms(game, state) {
  at(game, 13, 10, "The stage starts in Ohlo's room.");
  const before = { fights: game.variable(randomFights), points: game.variable(clearPoints) };
  const fights = await fightRandoms(game, state, { out: "E", pace: "E", wanted: 15, label: "random fights" });
  assert.equal(game.variable(randomFights), 15, "Fifteen random encounters are beaten.");
  // Each beaten encounter is one clear point (b12a to b134), until the block is cleared at 25.
  const points = before.points + (15 - before.fights);
  assert.equal(game.variable(clearPoints), points >= 25 ? 254 : points, "Each random fight beaten credits one clear point; at 25 the script stores 254.");
  at(game, 13, 10, "The party is back in Ohlo's room.");
  // No sixteenth: with Search on, to and fro outside meets nobody ([P]: "exactly 15").
  await game.walk("E");
  await game.press("s");
  for (let paces = 0; paces < 30; paces++) {
    await game.step(paces % 2 ? "W" : "E");
    game.expect(exploring, "No encounter meets the party once fifteen are beaten.");
  }
  await game.press("s");
  await throughDoor(game, "W", "the door west of (14,10)");
  state.randoms = fights;
  progress(`random fights: ${fights.length} fought here; ${JSON.stringify(fights)}`);
}

/**
 * Stage: a rest broken by monsters after the fifteen random encounters, from Ohlo's room. Proves
 * acceptance.slums.rest-interrupts-give-clear-points: [P] §12 (the digest, Scripting: Slums),
 * "rest-interrupt encounters grant clear points even when no random encounters remain", which
 * the guide gives as the way to clear the block without the trolls at location 20. The party
 * camps on (14,10), a square with no event of its own, where each two hours of rest have a 24%
 * chance of an interruption (the script at 9a3c), and rests a day at a time until monsters come.
 */
async function guideRestFight(game, state) {
  at(game, 13, 10, "The stage starts in Ohlo's room.");
  assert.equal(game.variable(randomFights), 15, "Fifteen random encounters are beaten: walking meets no more.");
  const before = { points: game.variable(clearPoints), fights: game.variable(randomFights) };
  assert.equal(before.points, 24, "The party has 24 clear points: every set fight but the trolls', Ohlo, and fifteen random fights.");
  await game.walk("E");
  at(game, 14, 10, "The square east of Ohlo's room is (14,10).");
  let days = 0, fight;
  for (; !fight; days++) {
    if (days >= 12) game.fail("Twelve days of rest on an unsafe square were never interrupted.");
    await makeCamp(game);
    const mark = game.printed.length;
    if (await rest(game, { days: 1 })) { await breakCamp(game); continue; }
    // The rest was broken. The interruption is the script's random encounter with the party
    // surprised or not (9a49 to 9b68): a text and return, or the encounter menu.
    const shown = flat(game.text());
    progress(`rest fight: the rest was broken on day ${days + 1}: ${shown.slice(0, 200)}`);
    for (let screens = 0; pressReturn.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu()); screens++) {
      if (screens >= 4) game.fail("The interruption did not lead to a fight.");
      await game.press("enter");
    }
    if (encounterMenu.test(game.menu())) await game.startFight("c");
    if (!game.inFight()) game.fail("The broken rest led neither to an encounter menu nor to a fight.");
    game.byHand = true;
    fight = await fightByGuide(game, { sleeps: state.sleeps, label: "rest fight" });
    state.sleeps -= fight.cast;
    await game.press("enter");
    if (treasureMenu.test(game.menu())) await shareAndLeave(game);
    for (let presses = 0; !exploring.test(game.menu()); presses++) {
      if (presses >= 8) game.fail("The fight after the broken rest did not lead back to the exploration menu.");
      if (campMenu.test(game.menu())) await game.press("e");
      else if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
      else await game.press("enter");
    }
    fight.printed = game.printed.slice(mark).map(flat);
  }
  const up = standing(game);
  progress(`rest fight: won in ${fight.turns} turns with ${fight.cast} Sleeps, ${fight.xp} experience points, ${up} standing; printed ${JSON.stringify(fight.printed)}`);
  assert.equal(game.variable(randomFights), before.fights + 1, "The script counts the fight as a sixteenth random encounter (b12a).");
  assert.equal(game.variable(clearPoints), 254, "The fight credits the twenty-fifth clear point, and the script marks the block cleared (b6b5): the trolls were never fought.");
  await throughDoor(game, "W", "the door west of (14,10)");
  await recoverHere(game, state, "Ohlo's room");
  state.restFight = { days, ...fight, up };
}

const clerkGreeting ="AT YOUR ENTRY, THE COUNCIL CLERK BEGINS LOOKING THROUGH A STACK OF PAPERS. 'BEFORE I CAN OFFER ANY COMMISSIONS, I MUST SEE IF YOU ARE DUE A CURRENT REWARD.";
const clerkSlums = "YOUR CLEARING OF THE SLUM AREAS PERMITS US TO EXPAND.";
const clerkReward = "HERE IS YOUR REWARD.'";

/**
 * Stage: the Council Clerk's reward for the cleared Slums, from Ohlo's room. Proves
 * acceptance.slums.clear-the-block: 25 clear points and the script's mark of a cleared block; the
 * entry without its text; the clerk's two sentences; 450 experience points; 1 jewelry, 50 platinum
 * and 250 gold pieces. Ends at the New Phlan gate.
 */
async function guideReward(game, state) {
  assert.equal(game.variable(clearPoints), 254, "The block is cleared: the script has stored 254 for its clear points (b6b5).");
  assert.ok(game.variable(randomFights) >= 15, "Fifteen random encounters have been beaten.");
  // Out of the Slums: north, west along y=8, up the lane at x=9, east along y=2, down the lane at x=13 to the entrance.
  const met = await walkFighting(game, "EE" + "NNWWWWWWNNNNNENEEESSSSSENNNE");
  assert.equal(met, 0, "No random encounter meets the party in the cleared block.");
  at(game, 15, 4, "The Slums entrance is (15,4).");
  await game.face("E");
  await game.press("up");
  at(game, 0, 4, "East from the Slums entrance is the New Phlan gate.");
  // In again: a cleared block prints no entry text, and so no alarm (the script at 9aa9).
  await game.face("W");
  let mark = game.printed.length;
  await game.press("up");
  at(game, 15, 4, "West of the gate is the Slums entrance.");
  printedInOrder(game, mark, [], "Entering the cleared Slums prints nothing: no alarm sounds.");
  await game.face("E");
  await game.press("up");
  at(game, 0, 4, "The party is back at the gate.");

  // To the clerk at City Hall (5,5): east to the hall's door, in, south, east.
  await game.walk("EEE");
  await readOn(game);
  await game.walk("ES");
  const before = { exp: await experience(game), money: await partyMoney(game) };
  mark = game.printed.length;
  await game.walk("E");
  at(game, 5, 5, "The clerk is at (5,5).");
  for (let presses = 0; !/The party has found Treasure!/.test(game.text()); presses++) {
    if (presses >= 8) game.fail("The clerk's words did not lead to a reward.");
    await game.press("enter");
  }
  const said = game.printed.slice(mark).map(flat);
  assert.deepEqual(said.slice(0, 3), [clerkGreeting, clerkSlums, clerkReward].map(flat), `The clerk looks for a reward due, names the Slums and hands it over. She said:\n${said.join("\n")}`);
  // [P] §6.2.2: "Clear the Slums: 1 jewelry, 50 platinum, 250 gold (450 XP)".
  const { loot, exp } = await claimTreasure(game, { taker: "AELAR", xp: 450, money: { Jewelry: 1, Platinum: 50, Gold: 250 }, label: "the clerk's reward" });
  assert.deepEqual(loot, [], "The reward holds no items.");
  for (const [name, points] of Object.entries(exp)) assert.ok(points >= before.exp[name] + perClass(name, 450), `${name}'s sheet shows at least ${perClass(name, 450)} experience points more: ${before.exp[name]} then, ${points} now.`);
  await readOn(game, 12);
  state.reward = { said: game.printed.slice(mark).map(flat), exp };
  progress(`the reward: the clerk said ${JSON.stringify(state.reward.said)}; experience ${JSON.stringify(exp)}`);
}

/**
 * Stage: training after the clerk's reward, from the New Phlan gate. The party's coins reach two
 * trainings at 1000 gold pieces each ([P] §4.3). Both go to the clerics' hall, whose trainer the
 * test already knows: the cleric, who has the experience for her third level, and the
 * cleric/fighter/magic-user, who now has it for his second as a cleric.
 */
async function guideTrainAgain(game, state) {
  at(game, 0, 4, "The stage starts at the New Phlan gate.");
  const trained = [];
  for (const [member, level, least] of [["ELSPETH", 3, 3001], ["DORIAN", 2, 1501]]) {
    const { pooled, purse, before } = await toClericTrainer(game, member);
    assert.ok(before.exp >= least, `${member}'s sheet shows the ${least} experience points a level ${level} cleric needs: ${before.exp}.`);
    const shown = game.flashed.length;
    const answer = await train(game, member);
    progress(`training again: ${member} (${before.classes}, level ${before.level}, ${before.exp} experience points; pool ${JSON.stringify(pooled)}): ${JSON.stringify(answer)}`);
    assert.ok(answer.trained && new RegExp(`${member} will become: a level ${level} Cleric Do you wish to train\\? Yes No\\s*$`).test(answer.text), `The trainer offers ${member} level ${level} as a cleric: ${JSON.stringify(answer)}.`);
    assert.deepEqual(flashedSince(game, shown), ["Congratulations..."], "The trainer congratulates on the bottom line.");
    await fromClericTrainer(game);
    const after = await game.viewSheet(member);
    await game.press("e", exploring, "Exit leaves the character sheet.");
    const purseAfter = (await game.purses())[member];
    assert.equal(after.exp, before.exp, "Training leaves the experience points as they were.");
    assert.ok(after.hp > before.hp, `${member} gained hit points with the level: ${before.hp} then, ${after.hp} now.`);
    assert.equal(inGold(purse) - inGold(purseAfter), trainingPrice, `Training took exactly 1000 gold pieces' worth of ${member}'s coins: ${JSON.stringify(purse)} before, ${JSON.stringify(purseAfter)} after.`);
    trained.push({ member, classes: before.classes, from: before.level, to: after.level, hp: [before.hp, after.hp], exp: before.exp });
    progress(`training again: ${member} is level ${after.level}, hit points ${before.hp} to ${after.hp}`);
  }
  assert.equal(trained[0].to, "3", "The cleric is level 3.");
  assert.deepEqual(trained[1].to.split("/").sort(), ["1", "1", "2"], `The cleric/fighter/magic-user has gained one level in one class: ${trained[1].from} then, ${trained[1].to} now.`);
  state.trainedAgain = trained;
}

/**
 * Walk back and forth between two neighbouring open squares with Search on until `wanted` random
 * encounters in all have been beaten (the script's count, 0x4a80). `out` leads from the safe room
 * the party stands in to the first of the two squares, `pace` from it to the second. After each
 * fight a party that is hurt or short of Sleeps goes back to the room and recovers.
 */
async function fightRandoms(game, state, { out, pace, wanted, label }) {
  const fights = [];
  for (let trips = 0; game.variable(randomFights) < wanted; trips++) {
    if (trips >= 40) game.fail(`Forty trips did not bring the random fights to ${wanted}.`);
    const before = state.random.length;
    await walkAsGuideParty(game, out, state, label);
    await game.press("s");
    assert.equal(game.position()?.mode, "search", "S turns Search on: the status line says so.");
    let onSecond = false;
    for (let paces = 0; state.random.length === before && game.variable(randomFights) < wanted; paces++) {
      if (paces >= 80) game.fail("Eighty steps with Search on met no random encounter.");
      await walkAsGuideParty(game, onSecond ? back(pace) : pace, state, label);
      onSecond = !onSecond;
    }
    await game.press("s");
    assert.equal(game.position()?.mode, undefined, "S turns Search off again.");
    const home = game.here();
    await walkAsGuideParty(game, (onSecond ? back(pace) : "") + back(out), state, label);
    fights.push(...state.random.slice(before));
    progress(`${label}: ${game.variable(randomFights)} random fights beaten (from ${home.x},${home.y}); clear points ${game.variable(clearPoints)}`);
    await recoverHere(game, state, label);
  }
  return fights;
}

/** The stages of the guide party's walk through the Slums, in the guide's order. Each ends rested on a square where rest is safe, and is saved there in its slot. */
const guideStages = [
  { name: "orcs", slot: "B", run: guideOrcs, proves: [] },
  { name: "goblins", slot: "C", run: guideGoblins, proves: ["acceptance.slums.goblin-armsmaster"] },
  { name: "stable", slot: "D", run: guideStable, proves: ["acceptance.slums.stable-leather-bag"] },
  { name: "secret", slot: "E", run: guideSecretRoom, proves: ["acceptance.slums.secret-treasure-room"] },
  { name: "kobolds", slot: "F", run: guideKobolds, proves: ["acceptance.slums.feeding-kobolds"] },
  { name: "hobgoblins", slot: "G", run: guideHobgoblins, proves: ["acceptance.slums.hobgoblins-gold"] },
  { name: "train", slot: "H", run: guideTrain, proves: [] },
  { name: "orchome", slot: "I", run: guideOrcHome, proves: ["acceptance.slums.orc-home"] },
  { name: "guards", slot: "J", run: guideGuards, proves: ["acceptance.slums.guards-intercept"] },
  { name: "leaders", slot: "B", run: guideLeaders, proves: ["acceptance.slums.monster-leaders"] },
  { name: "goblinguards", slot: "C", run: guideGoblinGuards, proves: ["acceptance.slums.goblin-guards-alerted"] },
  { name: "chest", slot: "D", run: guideChest, proves: ["acceptance.slums.empty-room-hidden-chest"] },
  { name: "ohlo", slot: "E", run: guideOhlo, proves: [] },
  { name: "potion", slot: "F", run: guidePotion, proves: ["acceptance.slums.ohlo-fetch-the-potion"] },
  { name: "randoms", slot: "G", run: guideRandoms, proves: [] },
  { name: "restfight", slot: "H", run: guideRestFight, proves: ["acceptance.slums.rest-interrupts-give-clear-points"] },
  { name: "reward", slot: "I", run: guideReward, proves: ["acceptance.slums.clear-the-block"] },
  { name: "trainagain", slot: "J", run: guideTrainAgain, proves: [] },
];
/** The script variables the guide party's games report. */
const guideWatch = [clearPoints, orcsFought, randomFights, goblinsFought, orcHomeFought, guardsFought, leadersFought, goblinGuardsFought, ohloState, potionState];

/**
 * The guide's party in the Slums. For working on one stage: POR_SLUMS_GUIDE_KEEP=<dir> copies the
 * saved games out after each stage, POR_SLUMS_GUIDE_FROM=<stage> with POR_SLUMS_GUIDE_SAVES=<dir>
 * starts at that stage from the slot the stage before saved, and POR_SLUMS_GUIDE_UNTIL=<stage>
 * stops after one.
 */
async function guide() {
  const { POR_SLUMS_GUIDE_FROM: from, POR_SLUMS_GUIDE_UNTIL: until, POR_SLUMS_GUIDE_KEEP: keep, POR_SLUMS_GUIDE_SAVES: saves } = process.env;
  const first = from ? guideStages.findIndex(({ name }) => name === from) : 0;
  if (first < 0) throw new Error(`No stage named ${from}. The stages are: ${guideStages.map(({ name }) => name).join(", ")}.`);
  const game = first
    ? await loadParty({ seconds: 3000, watch: guideWatch }, saves, guideStages[first - 1].slot)
    : await enterSlumsAsGuideParty({ watch: guideWatch });
  const state = { sleeps: sleepsAfterRest, random: [], losses: [] };
  try {
    game.byHand = true;
    for (const stage of guideStages.slice(first)) {
      progress(`guide: stage ${stage.name}`);
      await stage.run(game, state);
      await makeCamp(game);
      await saveGame(game, stage.slot);
      await breakCamp(game);
      if (keep) {
        mkdirSync(keep, { recursive: true });
        for (const file of readdirSync(game.saves).filter((name) => name.endsWith(".json"))) cpSync(join(game.saves, file), join(keep, file));
      }
      assert.equal(game.discarded, 0, "No key press may be thrown away.");
      proved.push(...stage.proves);
      if (stage.name === until) break;
    }
    console.log(`guide: set fights ${state.losses.map(({ fight, standing, turns, sleeps, xp }) => `${fight}: ${standing} of 6 standing, ${turns} turns, ${sleeps} Sleeps, ${xp} experience points`).join("; ")}`);
    console.log(`guide: ${state.random.length} random fights: ${state.random.map(({ at, xp, turns, cast, standing }) => `${at}: ${standing} standing, ${turns} turns, ${cast} Sleeps, ${xp} xp`).join("; ")}`);
  } finally {
    game.close();
  }
}

const tests = { entry, orcs, flee, goblins, guide };
const wanted = process.argv.slice(2);
for (const name of wanted) if (!(name in tests)) throw new Error(`No test named ${name}. The tests are: ${Object.keys(tests).join(", ")}.`);
if (wanted.length) {
  for (const name of wanted) console.log(name, (await tests[name]()) ?? "");
} else {
  // Each test has its own game, so they run side by side.
  await Promise.all(Object.values(tests).map((test) => test()));
}
console.log(`proved ${proved.length} Slums scenarios:\n  ${proved.sort().join("\n  ")}`);
