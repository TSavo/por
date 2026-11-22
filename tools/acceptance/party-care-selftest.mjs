// Self-test of the party-care helpers (party-care.mjs): what the game offers a party for healing,
// training and buying, asked with the game's own commands in New Phlan.
//
//   npm run acceptance:harness     (runs this after the harness self-test)
//
// GOG version 1.3, the six ready-made characters, a new game. A new party has 2 platinum and 36
// silver each (their character sheets say so), which is under 72 gold pieces all together, so the
// temple and the trainer both refuse it: the test requires the refusals the game gives, and one
// purchase the party can afford. The words the game uses are the ones it showed on 2026-11-21;
// the prices are the game's own, read from its screens here (the temple's also stands in
// acceptance.mechanics.temple.services, and the trainer's is in GAME.OVR as "Training costs 1000 gp.").

import assert from "node:assert/strict";
import { addReadyMadeParty, beginAdventuring, exploring, startGame } from "./harness.mjs";
import { breakCamp, buy, campMenu, cureLightWounds, hurt, inMemory, makeCamp, pool, templeCure, train } from "./party-care.mjs";

const game = await startGame({ seconds: 300 });
try {
  await addReadyMadeParty(game);
  await beginAdventuring(game);

  // The party list marks nobody as hurt in a new game, and every sheet says Okay.
  assert.deepEqual(hurt(game), [], "A new party is unhurt: the game highlights nobody's hit points.");
  const sheets = await game.sheets();
  assert.deepEqual(sheets.map(({ name, hp, status }) => [name, hp, status]), game.party().map(({ name, hp }) => [name, hp, "Okay"]),
    "Each character sheet shows the hit points of the party list and the status Okay.");

  // Camp: the menu has no Fix command in this version. The cleric has his cures in memory.
  await makeCamp(game);
  assert.equal(game.menu(), "Camp: Save View Magic Rest Alter Exit", "The Camp menu offers Save, View, Magic, Rest, Alter and Exit, and no Fix.");
  const memory = await inMemory(game, "BROTHER SEAN");
  assert.deepEqual(memory, ["Bless", "Cure Light Wounds", "Cure Light Wounds"], "The ready-made cleric starts with Bless and two Cure Light Wounds in memory.");
  assert.deepEqual(await inMemory(game, "THRENDER GRONE"), [], "A fighter has no spells in memory.");
  game.expect(campMenu);
  await breakCamp(game);

  // The Temple of Sune, one step east of the gate and through the door to the north.
  await game.walk("EN");
  await game.press("y", /Heal View Pool Appraise Exit\s*$/, "YES opens the temple menu.");
  await pool(game);
  const cure = await templeCure(game, "PHINEAS", cureLightWounds);
  assert.deepEqual(cure, { price: 100, paid: false, said: "Not enough money." },
    "The temple asks 100 gold pieces for Cure Light Wounds and tells a party with less 'Not enough money.'");
  await game.press("s");
  await game.press("e", exploring, "Exit leaves the temple.");

  // The training hall: the magic-users' trainer at (7,0).
  await game.walk("SENNEEEENN");
  await game.walk("E");
  game.expect(/'WE TRAIN ONLY MAGIC USERS HERE\. DO YOU WANT TO TRAIN\?' Yes No\s*$/, "The trainer at (7,0) trains magic-users and asks.");
  await game.press("y", /Train Character/, "YES opens the trainer's party menu.");
  assert.deepEqual(await train(game, "DARKSTAR"), { refused: "Training costs 1000 gp." }, "A magic-user without 1000 gold pieces is told what training costs.");
  assert.deepEqual(await train(game, "THRENDER GRONE"), { refused: "Training costs 1000 gp." }, "The price is named before the class is looked at: the fighter gets the same answer.");
  await game.press("b", exploring, "BEGIN Adventuring leaves the trainer.");

  // The general store at (9,10): a flask of oil is within the party's means.
  await game.walk("WSSWSEESSSSSSSSSEEENN");
  await game.walk("W");
  await game.press("y", /Buy View Pool Appraise Exit\s*$/, "YES opens the shop menu.");
  await pool(game);
  const oil = await buy(game, "RHIANNON", /Flask of Oil/);
  assert.deepEqual(oil, { price: 1, bought: true, said: "" }, "The general store sells a flask of oil for 1 gold piece from the pooled money.");
  const bought = await game.viewSheet("RHIANNON");
  assert.equal(bought.name, "RHIANNON");
  await game.press("i", /Ready .*Exit\s*$/, "Items lists what she carries.");
  assert.ok(game.items().some(({ name }) => /Flask of Oil/.test(name)), `RHIANNON carries the flask: ${JSON.stringify(game.items())}`);
  // Six times 2 platinum and 36 silver is 70.8 gold pieces pooled: the silver holy symbol at 50
  // can be paid for once and not twice. The second time the store refuses on the bottom line.
  await game.press("e"); await game.press("e");
  const symbol = await buy(game, "RHIANNON", /Silver Holy Symbol Of Sune/);
  assert.deepEqual(symbol, { price: 50, bought: true, said: "" }, "The silver holy symbol costs 50 gold pieces, which the pool holds.");
  const second = await buy(game, "RHIANNON", /Silver Holy Symbol Of Sune/);
  assert.deepEqual(second, { price: 50, bought: false, said: "Not enough Money." }, "With under 50 gold pieces left the store says 'Not enough Money.'");
  console.log(`party-care self-test passed: temple ${JSON.stringify(cure)}, store ${JSON.stringify(oil)} and ${JSON.stringify(second)}`);
  assert.equal(game.discarded, 0, "No key press may be thrown away.");
} finally {
  game.close();
}
