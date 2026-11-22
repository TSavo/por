// The guide's party, made from nothing through the game's own menus, and its saved game.
//
//   npm run acceptance:guide-party              make the party from nothing and compare it with the fixture
//   npm run acceptance:guide-party -- --write   make it and replace qa/fixtures/guide-party-new-phlan
//
// GOG version 1.3, a new game with no characters, normal input, the fixed dice of a replay. The
// steps are tools/acceptance/party.mjs: Create New Character six times, Add Character to Party,
// Modify Character, BEGIN Adventuring and Rolf's tour, the arms shop at (8,11), the inn at (4,12),
// spells memorised, and the game's own Save in slot A. qa/research/party.md says where each choice
// comes from.
//
// The check then loads both saved games, the one just made and the fixture, with the game's Load
// Saved Game, reads every character sheet with View, and requires:
//   - both to be the guide's party (`requireGuideParty`): the six characters in marching order,
//     race, sex, classes, alignment, the six ability scores and the hit points. Create and Modify
//     fix every one of those fields; none depends on the dice;
//   - the fields the dice do reach (age, and through the starting gold what the shop sold, so the
//     armor class, the damage and the movement; the items; the spells in memory) to be equal too,
//     because a replay's dice are fixed. Should the dice ever differ, this second comparison is
//     the one that fails, and it says which field.

import assert from "node:assert/strict";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startGame } from "./harness.mjs";
import { breakCamp, inMemory, makeCamp } from "./party-care.mjs";
import { fixedFields, guideParty, guidePartyFixture, guideSpells, loadParty, partyItems, partySheets, prepareParty, requireGuideParty, saveGame } from "./party.mjs";

const started = Date.now();
const progress = (line) => console.error(`[${Math.round((Date.now() - started) / 1000)}s] ${line}`);
const write = process.argv.includes("--write");

/** Make the party from nothing and save it in slot A of `saves`. Returns what the steps reported. */
async function make(saves) {
  const game = await startGame({ pregen: false, saves, seconds: 900 });
  try {
    game.expect(/Create New Character/, "A new game with no characters starts on the first menu.");
    assert.equal(game.party().length, 0, "No character is in the party yet.");
    const made = await prepareParty(game, guideParty, progress);

    // The roll is the dice's; Modify must have changed it (a roll of six 18s is not a roll).
    for (const [index, rolled] of made.rolled.entries()) {
      assert.notDeepEqual(["STR", "INT", "WIS", "DEX", "CON", "CHA"].map((score) => rolled[score]), ["STR", "INT", "WIS", "DEX", "CON", "CHA"].map((score) => made.modified[index][score]),
        `${rolled.name} was rolled with the scores Modify was to give: the roll proves nothing.`);
    }
    requireGuideParty(made.sheets);

    // The purchases: what [P] §4.1.1 lists, as far as the starting gold reached (party.mjs, shoppingList).
    const bought = (member) => made.shop.purchases.filter((purchase) => purchase.member === member).map(({ item }) => item).sort();
    for (const { name, classes } of guideParty) {
      const got = bought(name);
      assert.ok(got.includes(classes === "Cleric" ? "Flail" : "Long Sword"), `${name} bought a melee weapon: ${got.join(", ")}.`);
      if (/Thief/.test(classes)) assert.ok(got.includes("Leather Armor"), `${name}, a thief, bought leather armor: ${got.join(", ")}.`);
      else assert.ok(got.includes("Shield") && got.some((item) => / Mail$| Armor$/.test(item)), `${name} bought a shield and body armor: ${got.join(", ")}.`);
    }
    const spent = made.shop.purchases.reduce((sum, { price }) => sum + price, 0);
    assert.equal(made.shop.left, made.shop.gold - spent, "The pool went down by exactly the prices on the shop's list.");
    assert.ok((made.purse.Platinum ?? 0) >= 1, `A platinum piece is left for the inn: ${JSON.stringify(made.purse)}.`);
    // Every purchase is ready (outfit fails otherwise); the sheets name the weapon in hand.
    for (const sheet of made.sheets) assert.ok(sheet.status === "Okay" && sheet.ac < 10, `${sheet.name}'s armor class shows the armor: ${sheet.ac}.`);

    // The spells: every cleric place a Cure Light Wounds, every magic-user place a Sleep.
    for (const { name, classes } of guideParty) {
      const memory = made.inn.memory[name];
      assert.ok(memory.length > 0 && memory.every((spell) => guideSpells.some((wanted) => wanted.test(spell))), `${name} has only the guide's spells in memory: ${memory.join(", ")}.`);
      assert.equal(memory.includes("Sleep"), /Magic-User/.test(classes), `${name} has Sleep in memory exactly if a magic-user: ${memory.join(", ")}.`);
      assert.equal(memory.includes("Cure Light Wounds"), /Cleric/.test(classes), `${name} has Cure Light Wounds in memory exactly if a cleric: ${memory.join(", ")}.`);
    }
    await saveGame(game, "A");
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    return made;
  } finally {
    game.close();
  }
}

/** Load slot A of `saves` with the game's own Load and read the party from the screen: where it stands, the sheets, the items, the spells. */
async function read(saves) {
  const game = await loadParty({}, saves);
  try {
    const where = game.square();
    const sheets = await partySheets(game);
    const items = await partyItems(game);
    await makeCamp(game);
    const memory = {};
    for (const { name } of game.party()) memory[name] = await inMemory(game, name);
    await breakCamp(game);
    assert.equal(game.discarded, 0, "No key press may be thrown away.");
    return { where, sheets, items, memory };
  } finally {
    game.close();
  }
}

const saves = mkdtempSync(join(tmpdir(), "por-acceptance-guide-party-"));
try {
  const made = await make(saves);
  progress("the party is made and saved; loading it");
  const fresh = await read(saves);
  requireGuideParty(fresh.sheets);
  assert.deepEqual(fresh.where, { area: 0, x: 4, y: 12, facing: "S" }, "The saved game loads in New Phlan, in the inn at (4,12).");
  assert.deepEqual(fresh.sheets, made.sheets, "The loaded sheets are the sheets the game showed before the save.");

  if (write) {
    // Only the saved game is replaced: the folder's README stays.
    mkdirSync(guidePartyFixture, { recursive: true });
    for (const file of readdirSync(guidePartyFixture).filter((name) => name.endsWith(".json"))) rmSync(join(guidePartyFixture, file));
    for (const file of readdirSync(saves).filter((name) => name.endsWith(".json"))) cpSync(join(saves, file), join(guidePartyFixture, file));
    progress(`wrote ${guidePartyFixture}`);
  }
  if (!existsSync(join(guidePartyFixture, "A.json"))) throw new Error(`There is no fixture at ${guidePartyFixture}. Run: npm run acceptance:guide-party -- --write`);

  const fixture = await read(guidePartyFixture);
  requireGuideParty(fixture.sheets);
  for (const [index, sheet] of fixture.sheets.entries()) {
    for (const field of fixedFields) assert.equal(sheet[field], fresh.sheets[index][field], `${sheet.name}'s ${field} in the fixture differs from the party made now.`);
  }
  // With the fixed dice of a replay everything else is equal too.
  assert.deepEqual(fixture, fresh, "The fixture and the party made now differ in a field the dice reach (age, gold, purchases, spells).");
  const same = readdirSync(saves).filter((name) => name.endsWith(".json")).every((file) => readFileSync(join(saves, file), "utf8") === readFileSync(join(guidePartyFixture, file), "utf8"));

  console.log(`guide party: ${guideParty.length} characters made, modified, equipped and saved; the fixture holds the same party${same ? " and the same bytes" : " (the save files differ in bytes)"}`);
  for (const sheet of fresh.sheets) {
    console.log(`  ${sheet.name}: ${sheet.gender} ${sheet.race} ${sheet.classes}, ${sheet.alignment}; STR ${sheet.STR} INT ${sheet.INT} WIS ${sheet.WIS} DEX ${sheet.DEX} CON ${sheet.CON} CHA ${sheet.CHA}; HP ${sheet.hp}, AC ${sheet.ac}; ` +
      `${fresh.items[sheet.name].join(", ")}; ${fresh.memory[sheet.name].join(", ")}`);
  }
  console.log(`  bought for ${made.shop.gold - made.shop.left} of ${made.shop.gold} gold pieces: ${made.shop.purchases.map(({ member, item, price }) => `${member} ${item} ${price}`).join("; ")}`);
} finally {
  rmSync(saves, { recursive: true, force: true });
}
