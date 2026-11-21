// Self-test of the acceptance harness: what the runner reports and the harness relies on.
//
//   npm run acceptance:harness
//
// 1. Each frame says what kind of prompt produced it and whether the game waits for a key there.
// 2. The dice trace gives the number drawn, not only the range.
// 3. The position the frame reports is the square the status line shows, with no lag.
//    A frame can also report script variables the test asks to watch.
// 4. A fight can be driven with the game's own commands: Aim lists the combatants, Quick plays a
//    turn, and the end of the fight is read from the screen.
//
// Runs on GOG version 1.3 with the six ready-made characters and the fixed dice of a replay.
// Expected values come from the game's own screen; where one comes from a script or a scenario,
// the comment names it.

import assert from "node:assert/strict";
import { addReadyMadeParty, beginAdventuring, combatMenu, exploring, pressReturn, startGame } from "./harness.mjs";

// 0x49f2 is the script variable that holds the number of the area the party is in.
const areaVariable = 0x49f2;
const game = await startGame({ seconds: 300, env: { POR_TRACE_DICE: "1" }, watch: [areaVariable] });
// Every frame the runner sends: its prompt kind, whether the game waits there, and the line it answered.
const frames = [];
const send = game.send;
game.send = async (command) => {
  const went = await send(command);
  if (went) frames.push({ prompt: game.frame.prompt, awaitsKey: game.frame.awaitsKey === true, command });
  return went;
};
const flat = (text) => text.replace(/\s+/g, " ").trim();

try {
  // 1. The kind of prompt.
  // The first menu is up and the game does nothing more until a key arrives.
  assert.ok(["read", "poll"].includes(game.frame.prompt), `The first frame names no kind of prompt: ${game.frame.prompt}`);
  assert.equal(game.frame.awaitsKey, true, "At its first menu the game waits for a key.");
  await addReadyMadeParty(game);
  await beginAdventuring(game);
  assert.ok(frames.length > 0 && frames.every(({ prompt }) => prompt === "read" || prompt === "poll"),
    "Every frame must say whether it came from a blocking read or from a poll.");
  // `press` returns only when the game waits for a key, whatever happened on the way.
  assert.equal(game.frame.awaitsKey, true, "After the opening the game waits at the exploration menu.");

  // 3. The position, checked on every step of a walk. The third step east puts the City Hall
  // notice on screen (a move's event still showing): the frame must name the new square there too.
  let withEvent = 0;
  for (const heading of ["E", "E", "E", "W", "W"]) {
    if (pressReturn.test(game.text())) await game.press("enter");
    await game.step(heading);
    const shown = game.position();
    assert.ok(game.frame.exploration, "The frame must report a position while the party walks.");
    assert.deepEqual(game.square(), { area: 0, x: shown.x, y: shown.y, facing: shown.facing },
      `The frame's position must be the square in the status line (${shown.x},${shown.y} ${shown.facing}), in New Phlan (area 0).`);
    if (!exploring.test(game.text())) withEvent++;
    assert.equal(game.variable(areaVariable), 0, "The watched script variable holds the area number: New Phlan is 0.");
  }
  assert.ok(withEvent >= 1, "The walk must include a step whose event text is still on screen.");

  // 2. The dice: the number drawn. In the tavern at (10,8) one spin of the top is one draw from
  // ten numbers, and the script (ECL3.DAX block 0 at a58d) makes 8 and 9 green, 3 to 7 blue and
  // 0 to 2 red. The colour the game announces must be the one the traced number gives.
  await game.walk("ENNEEESEESSSSEEES");
  for (let screens = 0; !/DOES ANYONE WANT TO GAMBLE\? Yes No\s*$/.test(game.text()); screens++) {
    // A pickpocket may strike first; let it pass.
    if (screens >= 6) game.fail("The tavern did not come to its gambling question.");
    await game.press(/Ignore Grab\s*$/.test(game.text()) ? "i" : "enter");
  }
  await game.press("y");
  await game.press("enter", /WHO WILL GAMBLE\? Select\s*$/, "The game asks who will gamble.");
  await game.press("s");
  await game.press("enter", /HOW MANY PLATINUM PIECES WILL YOU WAGER\?/, "The game asks for a wager.");
  const before = (await game.dice()).length;
  const printed = game.printed.length;
  await game.press("1");
  await game.press("enter");
  const spin = (await game.dice()).slice(before);
  assert.deepEqual(spin.map(({ range }) => range), [10], "A spin is one draw from ten numbers.");
  const colour = spin[0].value >= 8 ? /^IT'S GREEN\./ : spin[0].value >= 3 ? /^IT'S BLUE\./ : /^RED\./;
  assert.match(flat(game.printed[printed] ?? ""), colour, `The top must show the colour of the number drawn, ${spin[0].value}.`);
  await game.press("enter", /WILL YOU GO AGAIN\? Yes No\s*$/);
  await game.press("n", exploring, "Declining another spin ends the visit.");
  // Every draw so far carries its number, inside the range asked for.
  const draws = await game.dice();
  for (const { caller, range, value } of draws) {
    assert.ok(Number.isInteger(value), `The draw by ${caller} from ${range} numbers has no value.`);
    assert.ok(range === 0 ? value === 0 : value >= 0 && value < range, `The draw by ${caller} gave ${value}, outside 0 to ${range - 1}.`);
  }

  // Back to the west gate and through it into the Slums. The status line still shows the New
  // Phlan square until the game redraws it, and the frame already names the new area and square:
  // the Slums are script 20 and the party arrives at (15,4) (qa/acceptance/01-slums.json).
  await game.walk("NWWWNNNNWWNWWWSSWW");
  await game.face("W");
  await game.press("up");
  assert.deepEqual(game.square(), { area: 20, x: 15, y: 4, facing: "W" }, "One step west of the gate the frame reports the Slums square.");
  // The game writes its area variable later than it moves the party: on arrival it still holds New Phlan.
  assert.equal(game.variable(areaVariable), 0, "On arrival the game's area variable still names New Phlan.");

  // 4 and the rest of 1: a fight. Rest in the Slums, eight hours at a time, until monsters interrupt.
  const party = game.party();
  const encounter = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
  for (let rests = 0; !encounter.test(game.menu()); rests++) {
    if (rests >= 12) game.fail("Twelve rests of eight hours in the Slums were not interrupted.");
    if (!/Camp: Save View Magic Rest Alter Exit\s*$/.test(game.menu())) await game.press("e", /Camp: Save View Magic Rest Alter Exit\s*$/, "E makes camp.");
    await game.press("r", /Rest Time: 00:00:00/, "Rest asks how long.");
    await game.press("h");
    for (let hours = 1; hours <= 8; hours++) await game.press("i", new RegExp(`Rest Time: 00:0${hours}:00`), "Hours, Inc adds one hour.");
    await game.press("r");
  }
  assert.equal(game.variable(areaVariable), 20, "After a command in the Slums the watched script variable names the Slums.");
  await game.startFight("c");
  assert.match(game.menu(), combatMenu, "The fight opens on a character's menu.");
  // Aim goes round every combatant in sight. All six characters are among them, each with the
  // hit points and armor class the party list showed before the fight, and the first is the
  // character whose turn it is, at range 0.
  const active = game.combatant();
  const listed = await game.combatants();
  assert.deepEqual({ name: listed[0].name, hp: listed[0].hp, range: listed[0].range }, { name: active.name, hp: active.hp, range: 0 },
    "Aim starts on the combatant whose turn it is.");
  for (const member of party) {
    assert.ok(listed.some(({ name, hp, ac }) => name === member.name && hp === member.hp && ac === member.ac),
      `Aim must list ${member.name} with ${member.hp} hit points and armor class ${member.ac}; it listed ${JSON.stringify(listed)}.`);
  }
  assert.match(game.menu(), combatMenu, "Listing the combatants leaves the character's menu up.");
  // Quick for everyone: from the last character's Quick on, the game plays the fight by itself and
  // only polls the keyboard. Those frames must say so: prompt "poll" and no awaitsKey.
  const start = frames.length;
  const { outcome, xp } = await game.win();
  const fought = frames.slice(start);
  const running = fought.filter(({ awaitsKey }) => !awaitsKey);
  assert.ok(running.length >= 1, "While the game plays the fight by itself at least one frame must not wait for a key.");
  assert.ok(running.every(({ prompt }) => prompt === "poll"), "A frame that does not wait for a key comes from a poll.");
  assert.equal(game.frame.awaitsKey, true, "The end of the fight waits for the player.");
  assert.equal(outcome, "won");
  assert.ok(Number.isInteger(xp) && xp > 0, `A won fight names the experience each character receives; it named ${xp}.`);

  console.log(`harness self-test passed: ${frames.length} frames (${frames.filter(({ awaitsKey }) => !awaitsKey).length} not waiting for a key), ${draws.length} draws checked, fight ${outcome} for ${xp} XP each`);
  assert.equal(game.discarded, 0, "No key press may be thrown away.");
} finally {
  game.close();
}
