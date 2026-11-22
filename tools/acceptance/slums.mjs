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
import { breakCamp, cureLightWounds, healInCamp, hurt, makeCamp, pool, templeCure } from "./party-care.mjs";

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
    if (treasureMenu.test(game.menu()) || emptiedTreasureMenu.test(game.menu())) { treasure = true; await game.press("e"); }
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

const tests = { entry, orcs, flee, goblins };
const wanted = process.argv.slice(2);
for (const name of wanted) if (!(name in tests)) throw new Error(`No test named ${name}. The tests are: ${Object.keys(tests).join(", ")}.`);
if (wanted.length) {
  for (const name of wanted) console.log(name, (await tests[name]()) ?? "");
} else {
  // Each test has its own game, so they run side by side.
  await Promise.all(Object.values(tests).map((test) => test()));
}
console.log(`proved ${proved.length} Slums scenarios:\n  ${proved.sort().join("\n  ")}`);
