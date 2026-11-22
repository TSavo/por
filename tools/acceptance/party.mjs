// The party the walkthrough tells a player to make, built through the game's own menus.
//
// Sources (qa/research/party.md has the quotations):
//   [P] Stephen S. Lee's guide v2.00: §3.2 (the party), §3.1 and §4.1.1 (Modify), §4.1.1 (what to
//       buy), §5.1 (marching order), §6.2.1 (buy, then an inn to memorise spells).
//   The SSI rule book, p.6 to 7 (Create New Character, Modify Character) and the IBM data card
//   (the arms shop at 8,11, the inn at 4,12, one platinum piece for the inn).
//
// Every step reads the screen and presses the key a player would press there. Nothing is a fixed
// key tape: a menu row is chosen by moving the highlight to the row with the wanted words, a
// score is raised until the game shows the wanted value, a purchase is made from the shop's own
// list. No developer command, no memory edit and no edited save is used.

import { cpSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { beginAdventuring, exploring, highlighted, screenRows, startGame } from "./harness.mjs";
import { campMenu, chooseSpells, inMemory, pool, restForSpells } from "./party-care.mjs";

/**
 * [P] §3.2, "I think the best party is": three male elf lawful good fighter/magic-users, one male
 * half-elf lawful good cleric/fighter/magic-user, one female human cleric, one male elf
 * fighter/magic-user/thief. The guide names no alignment for the last two: a thief cannot be
 * lawful good or chaotic good (the game offers him neither), and §3.1 says to avoid evil, so the
 * cleric is lawful good and the thief neutral good. The names are ours.
 *
 * The order is [P] §5.1: the fighters with the most hit points in the top half, the primary cleric
 * third from last.
 */
const elfFighterMage = { race: "Elf", gender: "Male", classes: "Fighter/Magic-User", alignment: "Lawful Good" };
export const guideParty = [
  { name: "AELAR", ...elfFighterMage },
  { name: "BRENNAN", ...elfFighterMage },
  { name: "CAELUM", ...elfFighterMage },
  { name: "ELSPETH", race: "Human", gender: "Female", classes: "Cleric", alignment: "Lawful Good" },
  { name: "DORIAN", race: "Half-Elf", gender: "Male", classes: "Cleric/Fighter/Magic-User", alignment: "Lawful Good" },
  { name: "FINN", race: "Elf", gender: "Male", classes: "Fighter/Magic-User/Thief", alignment: "Neutral Good" },
];

/**
 * What Modify leaves each of them with: [P] §3.1, "You should maximize all relevant statistics",
 * and the rule book p.7, Modify adjusts "ability scores and HP". The numbers are the game's own
 * ceilings for the race, the sex and the classes ([P] §7.6, as the digest's table of racial
 * ranges gives them): a male elf's Strength stops at 18(75) and his Dexterity at 19, a male
 * half-elf's Strength at 18(90), and a woman who is no fighter has no exceptional Strength. The
 * hit points are where the game's Modify stopped on 2026-11-21: they equal the classes' dice
 * averaged (fighter 10, magic-user 4, cleric 8, thief 6) plus 2, rounded down.
 * None of these fields depends on the dice.
 */
const elfScores = { STR: "18(75)", INT: "18", WIS: "18", DEX: "19", CON: "18", CHA: "18" };
export const guideSheets = {
  AELAR: { ...elfScores, hp: 9 },
  BRENNAN: { ...elfScores, hp: 9 },
  CAELUM: { ...elfScores, hp: 9 },
  ELSPETH: { STR: "18", INT: "18", WIS: "18", DEX: "18", CON: "18", CHA: "18", hp: 10 },
  DORIAN: { STR: "18(90)", INT: "18", WIS: "18", DEX: "18", CON: "18", CHA: "18", hp: 9 },
  FINN: { ...elfScores, hp: 8 },
};
/** The fields of a sheet that the menus and Modify fix: who the character is, the six scores, the hit points. */
export const fixedFields = ["name", "gender", "race", "alignment", "classes", "STR", "INT", "WIS", "DEX", "CON", "CHA", "hp", "level", "exp", "status"];

/**
 * Require `sheets` (from `partySheets`) to be the guide's party: the six characters in marching
 * order, each with the race, sex, classes and alignment chosen, the scores and hit points of
 * `guideSheets`, level 1 with no experience, and on their feet. Throws an Error that names the
 * first field that differs.
 */
export function requireGuideParty(sheets, party = guideParty) {
  const names = sheets.map(({ name }) => name).join(", ");
  if (names !== party.map(({ name }) => name).join(", ")) throw new Error(`The party is ${names}, not ${party.map(({ name }) => name).join(", ")}.`);
  for (const [index, who] of party.entries()) {
    const wanted = { ...who, ...guideSheets[who.name], level: who.classes.split("/").map(() => 1).join("/"), exp: 0, status: "Okay" };
    for (const field of fixedFields) {
      if (String(sheets[index][field]) !== String(wanted[field])) throw new Error(`${who.name}'s sheet shows ${field} ${sheets[index][field]}, not ${wanted[field]}.`);
    }
  }
}

const firstMenu = /Create New Character/;
const partyMenu = /BEGIN Adventuring/;
const abilities = ["STR", "INT", "WIS", "DEX", "CON", "CHA"];
/** The fields Modify Character lets a player change: the six ability scores and the hit points (rule book p.7). */
export const modifiable = [...abilities, "HP"];
const literally = (text) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`);

/**
 * Everything a character sheet says about who the character is, from a frame that shows one (View,
 * Modify, or the roll): { name, gender, race, age, alignment, classes, STR, INT, WIS, DEX, CON,
 * CHA, level, exp, ac, thac0, hp, damage, movement, status }. Scores are the game's own text, so
 * an exceptional Strength reads "18(75)". Undefined when no sheet is up.
 */
export function fullSheet(frame) {
  const rows = screenRows(frame).map((row) => row.trim());
  const text = rows.join("\n");
  const who = /^(Male|Female) (Dwarf|Elf|Gnome|Half-Elf|Halfling|Human) Age (\d+)$/m.exec(text);
  const hp = /^HP (-?\d+)\b/m.exec(text);
  if (!who || !hp) return undefined;
  const at = rows.findIndex((row) => row === who[0]);
  const found = {
    // A sheet under View or Modify is headed by the name; the roll, before the name is given, is not.
    name: rows.slice(0, at).filter(Boolean).at(-1), gender: who[1], race: who[2], age: +who[3],
    alignment: rows[at + 1], classes: rows[at + 2],
  };
  for (const ability of abilities) found[ability] = new RegExp(`^${ability} (\\d+(?:\\(\\d+\\))?)`, "m").exec(text)?.[1];
  const level = /^Level ([\d/]+)\s+Exp (\d+)/m.exec(text);
  return {
    ...found, level: level?.[1], exp: level ? +level[2] : undefined,
    ac: +(/^AC (-?\d+)/m.exec(text)?.[1] ?? NaN), thac0: +(/THAC0 (-?\d+)/.exec(text)?.[1] ?? NaN), hp: +hp[1],
    damage: /Damage (\S+)/.exec(text)?.[1], movement: +(/Movement (\d+)/.exec(text)?.[1] ?? NaN),
    status: /^Status (.+)$/m.exec(text)?.[1].trim(),
  };
}

/** In a menu of rows (race, gender, class, alignment): move the highlight to the row that reads `words` and choose it with Enter. */
async function chooseRow(game, words) {
  if (!game.rows().some((row) => row.trim() === words)) game.fail(`The game does not offer "${words}" here.`);
  await game.selectLine(literally(words));
  await game.press("enter");
}

/**
 * From the game's first menu or the party menu: Create New Character, and answer each question
 * the game asks from `who` ({ name, race, gender, classes, alignment }): race, gender, class,
 * alignment, the roll (kept as it falls: Modify sets the scores afterwards), the name, the
 * portrait and the combat icon (both kept as the game offers them). Returns the sheet the game
 * rolled. Leaves the game on the menu it started from; the character is on the save disk and not
 * yet in the party.
 */
export async function createCharacter(game, who) {
  game.expect(firstMenu, "Create New Character is on the game's first menu and on the party menu.");
  await game.press("c");
  if (!game.rows().some((row) => row.trim() === "Half-Elf")) game.fail("Create New Character did not list the races.");
  await chooseRow(game, who.race);
  await chooseRow(game, who.gender);
  await chooseRow(game, who.classes);
  await chooseRow(game, who.alignment);
  game.expect(/Keep this character\? Yes No\s*$/, "After the alignment the game shows the roll and asks whether to keep it.");
  const rolled = fullSheet(game.frame);
  for (const [field, wanted] of [["race", who.race], ["gender", who.gender], ["classes", who.classes], ["alignment", who.alignment]]) {
    if (rolled?.[field] !== wanted) game.fail(`The rolled character's ${field} is ${rolled?.[field]}, not ${wanted}.`);
  }
  await game.press("y", /Character name:/, "Yes keeps the roll, and the game asks for a name.");
  for (const letter of who.name) await game.press(letter);
  if (!new RegExp(`Character name:\\s+${who.name}\\s*$`, "i").test(game.menu())) game.fail(`The name on the bottom line is not ${who.name}.`);
  await game.press("enter", /Head Body Keep\s*$/, "After the name the game offers the portrait's head and body.");
  await game.press("k", /Parts color-1 color-2 Size Exit\s*$/, "Keep takes the portrait; the combat icon follows.");
  await game.press("e", /Is this icon ok\? Yes No\s*$/, "Exit leaves the icon as it is, and the game asks.");
  await game.press("y", firstMenu, "Yes ends the creation: the game is back on its menu.");
  return rolled;
}

/**
 * From the first menu or the party menu: Add Character to Party, for each of `names` in that
 * order (the order in which they are added is the marching order). The Add list marks an added
 * character with "*". Leaves the game on the party menu.
 */
export async function addToParty(game, names) {
  game.expect(/Add Character to Party/, "Add Character to Party is on the menu.");
  await game.press("a", /Add a character: Add Exit\s*$/, "A opens the list of characters to add.");
  const listOpen = () => /Add a character: Add Exit\s*$/.test(game.menu());
  for (const name of names) {
    if (!listOpen()) game.fail(`The Add list closed before ${name} was added.`);
    await game.selectLine(new RegExp(`^${name}$`));
    await game.press("a");
    // The list closes by itself when its last character has been added.
    if (listOpen() && !game.rows().some((row) => row.trim() === `* ${name}`)) game.fail(`A did not mark ${name} as added.`);
  }
  if (listOpen()) await game.press("e");
  game.expect(partyMenu, "The party menu follows the Add list.");
  const listed = game.party().map(({ name }) => name);
  if (listed.join() !== names.join()) game.fail(`The party list reads ${listed.join(", ")}, not ${names.join(", ")}.`);
}

/** On the Modify screen: the field the game has selected, the one whose value it draws in its highlight colour (13). */
function modifying(frame) {
  const rows = screenRows(frame);
  for (const field of modifiable) {
    const row = rows.findIndex((text) => new RegExp(`^\\s*${field} \\d`).test(text));
    if (row < 0) continue;
    const value = row * 40 + rows[row].indexOf(field) + field.length + 1;
    if (frame.text.find(([cell]) => cell === value)?.[2] === 13) return field;
  }
}

/**
 * From the party menu: Modify Character for `name`, and raise each field of `fields` as far as the
 * game lets it go: Right is pressed until a press no longer changes the value on screen. That is
 * [P] §3.1, "You should maximize all relevant statistics before setting out (Modify character)";
 * the rule book (p.7) says Modify adjusts "ability scores and HP", and the game itself sets the
 * ceiling for the character's race, sex and classes. Returns the sheet as kept.
 */
export async function modifyToMaximum(game, name, fields = modifiable) {
  game.expect(/Modify Character/, "Modify Character is on the party menu.");
  await selectMember(game, name);
  await game.press("m", /Modify character: Keep Exit\s*$/, "M opens the character for Modify.");
  if (fullSheet(game.frame)?.name !== name) game.fail(`Modify opened ${fullSheet(game.frame)?.name}, not ${name}.`);
  const value = (field) => fullSheet(game.frame)[field === "HP" ? "hp" : field];
  for (const field of fields) {
    for (let moves = 0; modifying(game.frame) !== field; moves++) {
      if (moves >= modifiable.length + 1) game.fail(`Down did not bring the Modify highlight to ${field}.`);
      await game.press("down");
    }
    for (let presses = 0; ; presses++) {
      if (presses >= 140) game.fail(`${field} was still rising after 140 presses.`);
      const before = String(value(field));
      await game.press("right");
      if (String(value(field)) === before) break;
    }
  }
  const kept = fullSheet(game.frame);
  await game.press("k", partyMenu, "Keep saves the modified character and returns to the party menu.");
  return kept;
}

/** In the party menu or another menu beside the party list: make `name` the highlighted member. */
async function selectMember(game, name) {
  for (let moves = 0; !highlighted(game.frame)?.startsWith(name); moves++) {
    if (moves >= 9) game.fail(`Could not highlight ${name} in the party list.`);
    await game.press("end");
  }
}

/**
 * From a menu that has View: every member's whole sheet (see `fullSheet`), in party order. This is
 * the proof of what was built: race, sex, classes, alignment, the six scores, the hit points.
 */
export async function partySheets(game) {
  const menu = game.menu();
  const names = game.party().map(({ name }) => name);
  const found = new Map();
  for (let views = 0; found.size < names.length; views++) {
    if (views >= names.length * 2) game.fail(`Could not read the sheets of ${names.filter((name) => !found.has(name)).join(", ")}.`);
    await game.press("v", /View: ?[A-Z][a-z]+ .*Exit\s*$/, "V shows a character sheet.");
    const shown = fullSheet(game.frame);
    if (!shown || !names.includes(shown.name)) game.fail("V showed a sheet that is not a party member's.");
    found.set(shown.name, shown);
    await game.press("e");
    if (game.menu() !== menu) game.fail(`Leaving ${shown.name}'s character sheet did not return to "${menu}".`);
    await game.press("end");
  }
  return names.map((name) => found.get(name));
}

/**
 * From a menu that has View: what each member carries, { NAME: ["Long Sword (ready)", "Shield (ready)", ...] },
 * read from each character's Items screen. Leaves the game on the same menu.
 */
export async function partyItems(game) {
  const menu = game.menu();
  const carried = {};
  for (const { name } of game.party()) {
    await game.viewSheet(name);
    // A character who carries nothing has no Items command on the sheet.
    if (/\bItems\b/.test(game.menu())) {
      await game.press("i", itemsMenu, "Items lists what the character carries.");
      carried[name] = game.items().map((item) => `${item.name}${item.ready ? " (ready)" : ""}`);
      await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
    } else carried[name] = [];
    await game.press("e");
    if (game.menu() !== menu) game.fail(`Leaving ${name}'s character sheet did not return to "${menu}".`);
  }
  return carried;
}

/**
 * From the game's first menu, with no characters yet: create each character of `party`, add them
 * in order, and Modify each to the game's maximum. Returns { rolled, modified }: the sheets as
 * rolled and as kept after Modify. Leaves the game on the party menu, ready for BEGIN Adventuring.
 */
export async function buildParty(game, party = guideParty, log = () => {}) {
  const rolled = [];
  for (const who of party) {
    rolled.push({ name: who.name, ...await createCharacter(game, who) });
    log(`created ${who.name}`);
  }
  await addToParty(game, party.map(({ name }) => name));
  const modified = [];
  for (const { name } of party) {
    modified.push(await modifyToMaximum(game, name));
    log(`modified ${name}`);
  }
  return { rolled, modified };
}

// ---- The opening purchases -------------------------------------------------------------------

/** A shop's menu, or a temple's, which has Heal where a shop has Buy: both pool, take and share money the same way. */
const shopMenu = /(?:Buy|Heal) View (?:Take )?Pool (?:Share )?Appraise Exit\s*$/;
const stockMenu = /Items: Buy (?:Next )?(?:Prev )?Exit\s*$/;
/** The Items menu: Use is offered outside a shop, Sell and Id inside one. */
const itemsMenu = /Ready (?:Use )?Trade Drop Halve Join (?:Sell Id )?Exit\s*$/;
/** Gold pieces to one coin of each kind (200 cp = 20 sp = 2 ep = 1 gp = 1/5 pp). */
const goldValue = { Copper: 1 / 200, Silver: 1 / 20, Electrum: 1 / 2, Gold: 1, Platinum: 5 };
const inGold = (held) => Object.entries(held).reduce((sum, [kind, count]) => sum + (goldValue[kind] ?? 0) * count, 0);
/** The route from the gate where Rolf's tour ends, (0,4), to the square west of the arms shop, (7,11), and the step in. */
const toArmsShop = ["EENNEEESEESSSSSSSS", "E"];

/** In a shop whose money is pooled: the pool in gold pieces, as the Take command lists it. */
export async function pooledGold(game) {
  game.expect(shopMenu, "The pool is read from the shop menu.");
  if (!/\bTake\b/.test(game.menu())) return 0;
  await game.press("t", /Select type of coin Exit\s*$/, "Take lists the pooled coins.");
  const held = {};
  for (const [, kind, count] of game.rows().join("\n").matchAll(/\b(Copper|Silver|Electrum|Gold|Platinum) +(\d+)/g)) held[kind] = +count;
  await game.press("e", shopMenu, "Exit leaves the coins in the pool.");
  return inGold(held);
}

/** With a shop's stock list open: every page of it, as a Map from the item's name to its price. Leaves the list on its first page. */
async function readStock(game) {
  const stock = new Map();
  let pages = 0;
  for (;; pages++) {
    if (pages >= 12) game.fail("The shop's list did not come to an end.");
    for (const row of game.rows().slice(2, 24)) {
      const match = /^\s*(\S.*?)\s+(\d+)\s*$/.exec(row);
      if (match) stock.set(match[1], +match[2]);
    }
    if (!/\bNext\b/.test(game.menu())) break;
    await game.press("n", stockMenu, "Next shows the next page of the stock.");
  }
  for (; pages > 0; pages--) await game.press("p", stockMenu, "Prev shows the page before.");
  return stock;
}

/** The stock of the shop whose menu is up: Map of name to price in gold pieces. Leaves the game on the shop menu. */
export async function shopStock(game) {
  game.expect(shopMenu, "The stock is read from the shop menu.");
  await game.press("b", stockMenu, "Buy lists the stock.");
  const stock = await readStock(game);
  await game.press("e", shopMenu, "Exit leaves the stock list.");
  return stock;
}

/**
 * In a shop's menu: `member` buys the item named `item`. The list is paged with Next until the
 * item is on screen. Returns { bought, said }: whether the shop sold it, and what it flashed on
 * the bottom line if it refused ("Not enough Money."). Leaves the game on the shop menu.
 */
export async function buyItem(game, member, item) {
  game.expect(shopMenu, "Goods are bought from the shop menu.");
  await game.press("end");
  await selectMember(game, member);
  await game.press("b", stockMenu, "Buy lists the stock.");
  const row = new RegExp(`^${item.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+\\d+$`);
  const listed = () => game.rows().slice(2, 24).some((text) => row.test(text.trim()));
  for (let pages = 0; !listed(); pages++) {
    if (pages >= 12 || !/\bNext\b/.test(game.menu())) game.fail(`The shop does not list ${item}.`);
    await game.press("n", stockMenu, "Next shows the next page of the stock.");
  }
  await game.selectLine(row);
  const shown = game.flashed.length;
  await game.press("b");
  const said = game.flashed.slice(shown).map(({ text }) => text).join(" ");
  if (stockMenu.test(game.menu())) await game.press("e", shopMenu, "Exit leaves the stock list.");
  return { bought: !said, said };
}

const coinMenu = /Select type of coin Exit\s*$/;
/** The pooled coins as the Take list shows them: { Gold: 3, Platinum: 1 }. */
const coinsListed = (game) => Object.fromEntries([...game.rows().join("\n").matchAll(/^\s*(Copper|Silver|Electrum|Gold|Platinum|Gems|Jewelry) +(\d+)\s*$/gm)].map(([, kind, count]) => [kind, +count]));

/**
 * In a shop or temple whose money is pooled: `member` takes `wanted` ({ Platinum: 100, Gold: 500 })
 * from the pool with the game's Take command, one kind of coin at a time, and the list must show
 * the pool that much smaller each time (a character can carry only so much: a take the game
 * refuses fails with the screen). Leaves the game on the shop menu.
 */
export async function takeCoins(game, member, wanted) {
  game.expect(shopMenu, "Coins are taken from the shop menu.");
  await game.press("end");
  await selectMember(game, member);
  for (const [kind, count] of Object.entries(wanted)) {
    if (!coinMenu.test(game.menu())) await game.press("t", coinMenu, "Take lists the pooled coins.");
    const before = coinsListed(game)[kind] ?? 0;
    if (before < count) game.fail(`The pool holds ${before} ${kind}, not the ${count} to take.`);
    await game.selectLine(new RegExp(`^${kind} +\\d+$`));
    // The game writes some kinds in small letters here ("How much silver will you take?").
    await game.press("enter", new RegExp(`How much ${kind} will you take\\?\\s*$`, "i"), "Choosing a kind of coin asks how much.");
    for (const digit of String(count)) await game.press(digit);
    await game.press("enter");
    // With the pool emptied the list closes; otherwise it shows what is left.
    const left = coinMenu.test(game.menu()) ? coinsListed(game)[kind] ?? 0 : 0;
    if (left !== before - count) game.fail(`${member} asked for ${count} ${kind} and the pool went from ${before} to ${left}.`);
  }
  if (coinMenu.test(game.menu())) await game.press("e", shopMenu, "Exit leaves the rest in the pool.");
  game.expect(shopMenu, "Taking leads back to the shop menu.");
}

/**
 * In a shop whose money is pooled: `member` takes every coin of the pool (the data card: "Use the
 * Take command and have one character pick up all the money"). Returns what was taken,
 * { Platinum: 1, Gold: 3 }. Leaves the game on the shop menu, which no longer offers Take.
 */
export async function takePool(game, member) {
  game.expect(shopMenu, "The pool is taken from the shop menu.");
  if (!/\bTake\b/.test(game.menu())) return {};
  await game.press("t", coinMenu, "Take lists the pooled coins.");
  const pool = coinsListed(game);
  await game.press("e", shopMenu, "Exit leaves the list.");
  await takeCoins(game, member, pool);
  if (/\bTake\b/.test(game.menu())) game.fail("The shop menu still offers Take: the pool is not empty.");
  return pool;
}

/** From the arms shop at (8,11) to the square north of the inn at (4,12), and the step in (the data card: "the inn at 4,12"). */
const toInn = ["WWWW", "S"];
/**
 * What the party memorises: [P] §5.2, "The strongest combat spell in the early game is Sleep, by
 * far", and of Cure Light Wounds, "you always want multiple copies of this spell prepared". Every
 * cleric place takes a cure and every magic-user place a Sleep.
 */
export const guideSpells = [/^Cure Light Wounds$/, /^Sleep$/];

/**
 * From the exploration menu outside the arms shop: walk to the inn at (4,12), pay its platinum
 * piece from `payer`'s purse, have every character choose the guide's spells, rest the time the
 * game sets for them, and read back what each has in memory. Returns { chosen, memory }: how many
 * spells each chose, and each character's spells in memory after the rest. Leaves the game in the
 * inn's camp, on the Camp menu.
 */
export async function restAtInn(game, payer, party = guideParty, log = () => {}) {
  await game.walk(toInn[0]);
  await game.walk(toInn[1]);
  game.expect(/'IT WILL COST YOU 1 PLATINUM PIECE TO REST HERE\. DO YOU WANT TO STAY\?' Yes No\s*$/, "The inn at (4,12) names its price.");
  await game.press("y", /WHO WILL PAY\? Select\s*$/, "YES asks who pays.");
  await game.highlight(payer);
  await game.press("s", campMenu, "The payer's platinum piece buys a camp in the inn.");
  const chosen = {};
  for (const { name } of party) {
    chosen[name] = await chooseSpells(game, name, guideSpells);
    log(`${name} chose ${chosen[name]} spells`);
    // The last caster stays on the spell menu: its Rest sets the time for everything chosen.
    if (name !== party.at(-1).name) await game.press("e", campMenu, "Exit leaves the spell menu.");
  }
  if (!await restForSpells(game)) game.fail("The rest in the inn was interrupted.");
  const memory = {};
  for (const { name } of party) memory[name] = await inMemory(game, name);
  return { chosen, memory };
}

/**
 * The whole preparation, from the game's first menu with no characters to a party in the inn's
 * camp with its spells in memory: create, add, Modify, BEGIN Adventuring and Rolf's tour, the
 * arms shop, the inn. `party[0]` carries the money. Returns everything the steps returned, and
 * `sheets`: each character's sheet as View shows it at the end.
 */
export async function prepareParty(game, party = guideParty, log = () => {}) {
  const built = await buildParty(game, party, log);
  await beginAdventuring(game);
  const shop = await outfit(game, party, log);
  const purse = await takePool(game, party[0].name);
  await game.press("e", exploring, "Exit leaves the shop.");
  const inn = await restAtInn(game, party[0].name, party, log);
  const sheets = await partySheets(game);
  return { ...built, shop, purse, inn, sheets };
}

/** The saved game `npm run acceptance:guide-party -- --write` leaves: the guide's party in the inn at (4,12), equipped, spells in memory. */
export const guidePartyFixture = process.env.POR_GUIDE_PARTY_FIXTURE ?? fileURLToPath(new URL("../../qa/fixtures/guide-party-new-phlan/", import.meta.url));
/** From the inn at (4,12) to the gate where the Slums begin, (0,4): through the inn's door, east along the street, north past the park, west. */
const innToGate = "NEEENNNNNNNNWWNWWWSSWW";

/**
 * Start the game on a copy of a save directory (by default the guide party's fixture) and load
 * `slot` (by default A) with the game's own Load Saved Game. The party stands where it saved, on the exploration
 * menu. `options` are `startGame`'s. close() also deletes the copy.
 */
export async function loadParty(options = {}, saves = guidePartyFixture, slot = "A") {
  const copy = mkdtempSync(join(tmpdir(), "por-acceptance-party-"));
  for (const file of readdirSync(saves).filter((name) => name.endsWith(".json"))) cpSync(join(saves, file), join(copy, file));
  const game = await startGame({ seconds: 500, ...options, pregen: false, saves: copy });
  const close = game.close;
  game.close = () => { close(); rmSync(copy, { recursive: true, force: true }); };
  try {
    game.expect(/Load Saved Game/, "The first menu offers to load a saved game.");
    await game.press("l", /Load Which Game: [A-J]/, "L asks which saved game to load.");
    await game.press(slot.toLowerCase(), exploring, `${slot} loads that slot and puts the party on the map.`);
    return game;
  } catch (error) {
    game.close();
    throw error;
  }
}

/** From the inn at (4,12), where the fixture was saved: walk to the gate at (0,4) and step west into the Slums. */
export async function innToSlums(game) {
  await game.walk(innToGate);
  await game.face("W");
  await game.press("up");
}

/** From the Camp menu: save the game in `slot` (a letter A to J) with the game's own Save, and stay in the game. */
export async function saveGame(game, slot = "A") {
  await game.press("s", /Save Which Game: A B C D E F G H I J\s*$/, "Save asks for a slot.");
  await game.press(slot.toLowerCase(), /Quit TO DOS Yes No\s*$/, "The slot's letter saves the game.");
  await game.press("n", campMenu, "No stays in the game.");
}

/** The body armor the shop sells below banded mail, heaviest first: what a party short of money falls back on. */
const lesserArmor = ["Splint Mail", "Chain Mail", "Scale Mail", "Ring Mail", "Studded Leather Armor", "Leather Armor", "Padded Armor"];

/**
 * What [P] §4.1.1 tells each character to buy, and the order in which the money is spent when it
 * does not reach (the guide's list can cost more than six new characters carry):
 *   1. a melee weapon for everyone: a flail for a pure cleric, a quarter staff for a pure
 *      magic-user, a long sword for anyone else;
 *   2. leather armor for anyone with thief among the classes, "even if they can equip something better";
 *   3. a shield for each fighter and cleric who is not a thief;
 *   4. banded mail, "not plate mail", for each of those, in marching order;
 *   5. for those the banded mail did not reach, the heaviest lesser armor the rest of the money buys;
 *   6. last, a shield for the thief (he is a fighter too; the guide names only his armor).
 * `reserve` gold pieces stay in the pool: the inn costs one platinum piece (the data card: "Make
 * sure you have at least one platinum piece left").
 * Returns the purchases in order, [{ member, item, price }], decided from the shop's own prices.
 */
export function shoppingList(party, stock, gold, reserve = 5) {
  const purchases = [];
  let left = gold - reserve;
  const price = (item) => {
    if (!stock.has(item)) throw new Error(`The shop does not sell ${item}.`);
    return stock.get(item);
  };
  const take = (member, item) => {
    if (price(item) > left) return false;
    left -= price(item);
    purchases.push({ member, item, price: price(item) });
    return true;
  };
  const thief = ({ classes }) => /Thief/.test(classes);
  for (const who of party) take(who.name, who.classes === "Cleric" ? "Flail" : who.classes === "Magic-User" ? "Quarter Staff" : "Long Sword");
  for (const who of party.filter(thief)) take(who.name, "Leather Armor");
  const armored = party.filter((who) => !thief(who) && /Fighter|Cleric/.test(who.classes));
  for (const who of armored) take(who.name, "Shield");
  const unarmored = armored.filter((who) => !take(who.name, "Banded Mail"));
  for (const who of unarmored) for (const armor of lesserArmor) if (take(who.name, armor)) break;
  for (const who of party.filter(thief)) take(who.name, "Shield");
  return purchases;
}

/**
 * On a character's Items screen: make every item whose name is in `names` ready, with the game's
 * Ready command. Returns the Items list afterwards. A refusal ("Your hands are full!") fails.
 */
async function readyItems(game, names) {
  for (const name of names) {
    const item = game.items().find((entry) => entry.name === name);
    if (!item) game.fail(`The Items screen does not list ${name}.`);
    if (item.ready) continue;
    await game.selectItem(literally(name));
    const shown = game.flashed.length;
    await game.press("r");
    const said = game.flashed.slice(shown).map(({ text }) => text).join(" ");
    if (said || !game.items().find((entry) => entry.name === name)?.ready) game.fail(`Ready did not ready ${name}${said ? `: the game said "${said}"` : ""}.`);
  }
  return game.items();
}

/**
 * From the exploration menu at the gate where the tour ends, (0,4): walk to the arms shop at
 * (8,11), pool the money, buy the guide's opening purchases (see `shoppingList`), and make
 * everything bought ready on each character's Items screen. The pool stays pooled: the inn takes
 * its platinum piece from it. Returns { gold, purchases, left, carried }: the party's money in gold
 * pieces before and after, what was bought, and each member's Items list after readying.
 * Leaves the game on the shop menu.
 */
export async function outfit(game, party = guideParty, log = () => {}) {
  await game.walk(toArmsShop[0]);
  await game.walk(toArmsShop[1]);
  game.expect(/THE SHOP SPECIALIZES IN ARMS AND ARMOR\. 'CAN I SHOW YOU OUR WARES\?' Yes No\s*$/, "The arms shop is entered at (8,11).");
  await game.press("y", shopMenu, "YES opens the shop menu.");
  await pool(game);
  const gold = await pooledGold(game);
  const stock = await shopStock(game);
  const purchases = shoppingList(party, stock, gold);
  for (const { member, item, price } of purchases) {
    const { bought, said } = await buyItem(game, member, item);
    if (!bought) game.fail(`The shop did not sell ${item} to ${member} for ${price} gold pieces: "${said}".`);
    log(`${member} bought ${item} for ${price}`);
  }
  const left = await pooledGold(game);
  const carried = {};
  for (const { name } of party) {
    await game.viewSheet(name);
    await game.press("i", itemsMenu, "Items lists what the character carries.");
    carried[name] = await readyItems(game, purchases.filter(({ member }) => member === name).map(({ item }) => item));
    await game.press("e", /View: ?Items/, "Exit leaves the Items screen.");
    await game.press("e", shopMenu, "Exit leaves the character sheet.");
  }
  return { gold, purchases, left, carried };
}
