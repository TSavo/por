// Keeping a party alive with what the game itself offers, for the acceptance tests.
//
// Every helper here presses the keys a player would press and reads the answer from the screen.
// None uses the developer victory command and none writes to the game's memory.
//
// What version 1.3 offers, as seen on its own screens on 2026-11-21:
//   - Camp ("Camp: Save View Magic Rest Alter Exit") has no Fix command. Healing in camp is rest
//     (the manual, p.14: one hit point for every 24 uninterrupted hours) and spells: a cleric casts
//     Cure Light Wounds from memory (Magic, Cast), memorises it again (Magic, Memorize) and rests
//     the time the game sets for that (4 hours 15 minutes for one first-level spell).
//   - The temples of New Phlan sell cures ("Heal View Pool Appraise Exit"); Cure Light Wounds
//     costs 100 gold pieces and the temple answers "Not enough money." to a party that has less.
//   - The training hall's trainers open the party menu with "Train Character"; training costs
//     1000 gold pieces and the trainer says so ("Training costs 1000 gp.") to a poorer character.
//   - Shops sell from pooled money ("Buy View Pool Appraise Exit"; Pool adds Take and Share).
//
// The hit points in the party list are drawn in yellow for a character who is hurt (see `party`
// in harness.mjs), so `hurt` below is what a player sees, not a number kept by the test.

import { exploring } from "./harness.mjs";

export const campMenu = /Camp: Save View Magic Rest Alter Exit\s*$/;
export const magicMenu = /Cast Memorize Scribe Display Rest Exit\s*$/;
export const restMenu = /Rest\s+daYs Hours Mins\s+Inc Dec\s+Exit\s*$/;
export const cureLightWounds = /^Cure Light Wounds$/;

/** The members whose hit points the game shows as hurt, most hurt (fewest hit points) first. */
export function hurt(game) {
  return game.party().filter((member) => member.hurt).sort((a, b) => a.hp - b.hp);
}

/**
 * In a menu beside the party list, make `name` the game's current character. After a "whom?"
 * question the list can still show the name chosen there in white although the current character
 * is another, so this first moves on by one, which makes the game redraw the list.
 */
async function choose(game, name) {
  await game.press("end");
  await game.highlight(name);
}

/** From the exploration menu, make camp. Fails unless the Camp menu comes up. */
export async function makeCamp(game) {
  await game.press("e", campMenu, "E makes camp.");
}

/** From the Camp menu, break camp. */
export async function breakCamp(game) {
  await game.press("e", exploring, "E breaks camp.");
}

/** The spell names on a spell list the game is showing (in memory, in the book, on a scroll). */
export function spellsShown(game) {
  const rows = game.rows().map((row) => row.trim()).filter(Boolean);
  if (!/Spells (?:in Memory|in Spell Book|on Scroll|to be memorized)$/.test(rows[0] ?? "")) return undefined;
  return rows.slice(1, -1).filter((row) => !/^\d(?:st|nd|rd|th) Level$/.test(row) && !/can memorize:|Spells: \d+$/.test(row) && row !== rows[0].split("'")[0])
    .map((row) => row.replace(/^\*/, ""));
}

/**
 * In camp: the spells `caster` has in memory, as Magic, Cast lists them. An empty list when the
 * game shows no list (a character with nothing memorised). Leaves the game on the Camp menu.
 */
export async function inMemory(game, caster) {
  game.expect(campMenu, "Spells are read from the Camp menu.");
  await choose(game, caster);
  await game.press("m", magicMenu, "Magic opens the spell menu.");
  await game.press("c");
  const spells = spellsShown(game) ?? [];
  if (!magicMenu.test(game.menu())) await game.press("e", magicMenu, "Exit leaves the list of spells in memory.");
  await game.press("e", campMenu, "Exit leaves the spell menu.");
  return spells;
}

/**
 * In camp: `caster` casts one memorised spell that matches `spell` on `target` (a name, or
 * undefined for a spell that asks for no target). Returns true when the spell was cast, false
 * when the caster has no such spell in memory. Leaves the game on the Camp menu.
 */
export async function castInCamp(game, caster, spell, target) {
  game.expect(campMenu, "Spells are cast from the Camp menu.");
  await choose(game, caster);
  await game.press("m", magicMenu, "Magic opens the spell menu.");
  await game.press("c");
  const known = spellsShown(game) ?? [];
  let cast = false;
  if (known.some((name) => spell.test(name))) {
    await game.selectLine(spell);
    await game.press("c");
    if (/Cast Spell on whom Select Exit\s*$/.test(game.menu())) {
      if (target === undefined) game.fail("The spell asks whom to cast it on and the test named nobody.");
      await game.highlight(target);
      await game.press("s");
    }
    cast = true;
  }
  for (let presses = 0; !campMenu.test(game.menu()); presses++) {
    if (presses >= 4) game.fail("Casting did not lead back to the Camp menu.");
    await game.press("e");
  }
  return cast;
}

/**
 * In camp: `caster` chooses `spell` to memorise as often as the game allows ("can memorize: N"),
 * confirms, and rests the time the game sets for it with the spell menu's own Rest. Returns
 * { chosen, rested }: how many were chosen, and whether the rest ran to its end (false when
 * something interrupted it: the screen is then whatever interrupted, for the caller to deal with).
 */
export async function memorizeAndRest(game, caster, spell) {
  game.expect(campMenu, "Spells are memorised from the Camp menu.");
  await choose(game, caster);
  await game.press("m", magicMenu, "Magic opens the spell menu.");
  await game.press("m");
  let chosen = 0;
  if (/Choose Spell: Memorize Exit\s*$/.test(game.menu())) {
    const free = () => +(/Spells: (\d+)/.exec(game.text())?.[1] ?? 0);
    for (let left = free(); left > 0; left = free()) {
      if (chosen >= 12) game.fail("The game kept offering to memorise more spells.");
      await game.selectLine(spell);
      await game.press("m");
      if (free() !== left - 1) game.fail("Memorize did not take up one of the spells the caster can memorise.");
      chosen++;
    }
    await game.press("e");
    // The game lists what is to be memorised, then asks.
    for (let screens = 0; !/Memorize these spells\? Yes No\s*$/.test(game.menu()) && !magicMenu.test(game.menu()); screens++) {
      if (screens >= 3) game.fail("Leaving the spell book did not come to the question whether to memorise.");
      await game.press("e");
    }
    if (/Memorize these spells\? Yes No\s*$/.test(game.menu())) await game.press("y", magicMenu, "Yes confirms the spells to memorise.");
  }
  if (!magicMenu.test(game.menu())) game.fail("Memorising did not lead back to the spell menu.");
  if (!chosen) {
    await game.press("e", campMenu, "Exit leaves the spell menu.");
    return { chosen, rested: true };
  }
  await game.press("r", restMenu, "The spell menu's Rest asks how long, with the time the spells need already set.");
  const time = /Rest Time: (\d\d):(\d\d):(\d\d)/.exec(game.text());
  if (!time || !(+time[1] || +time[2] || +time[3])) game.fail("The game set no rest time for the spells to memorise.");
  await game.press("r");
  const rested = magicMenu.test(game.menu());
  if (rested) await game.press("e", campMenu, "Exit leaves the spell menu.");
  return { chosen, rested };
}

/** In camp: rest so many days, hours and minutes with the Camp menu's Rest. Returns true when the rest ran to its end. */
export async function rest(game, { days = 0, hours = 0 } = {}) {
  game.expect(campMenu, "Rest is on the Camp menu.");
  await game.press("r", restMenu, "Rest asks how long.");
  for (const [unit, count] of [["y", days], ["h", hours]]) {
    if (!count) continue;
    await game.press(unit);
    for (let added = 0; added < count; added++) await game.press("i");
  }
  const set = /Rest Time: (\d\d):(\d\d):(\d\d)/.exec(game.text());
  if (!set || +set[1] !== days || +set[2] !== hours) game.fail(`The rest time is not ${days} days and ${hours} hours.`);
  await game.press("r");
  return campMenu.test(game.menu());
}

/**
 * In camp, in a place where rest is safe: heal the party with the casters' own Cure Light Wounds
 * until the game shows nobody as hurt. Each round casts every memorised cure on whoever is most
 * hurt, then memorises cures again and rests for them. Returns { cures, rests, healed }; `healed`
 * is false when a rest was interrupted (the screen then shows what interrupted it) or when
 * `rounds` rounds did not heal everyone.
 */
export async function healInCamp(game, casters, { rounds = 12 } = {}) {
  let cures = 0, rests = 0;
  for (let round = 0; round < rounds; round++) {
    for (const caster of casters) {
      // A caster who is down cannot cast: the game takes him off the list of who can act.
      for (let casts = 0; hurt(game).length && casts < 6; casts++) {
        const [target] = hurt(game);
        if (!await castInCamp(game, caster, cureLightWounds, target.name)) break;
        cures++;
      }
    }
    if (!hurt(game).length) return { cures, rests, healed: true };
    let anyone = false;
    for (const caster of casters) {
      const { chosen, rested } = await memorizeAndRest(game, caster, cureLightWounds);
      if (!rested) return { cures, rests, healed: false };
      if (chosen) { anyone = true; rests++; }
    }
    if (!anyone) game.fail("Nobody could memorise a cure, and the party is still hurt.");
  }
  return { cures, rests, healed: !hurt(game).length };
}

/**
 * At a trainer's party menu ("Train Character"), ask to train `member`. Returns what the game
 * answered: { refused: "Training costs 1000 gp." } and the like when it flashes a refusal, or
 * { trained: true, text } when it offers the new level and the test accepts it.
 */
export async function train(game, member) {
  game.expect(/Train Character/, "Training is on the trainer's party menu.");
  await choose(game, member);
  const shown = game.flashed.length;
  await game.press("t");
  const said = game.flashed.slice(shown).map(({ text }) => text);
  if (said.length) return { refused: said.join(" ") };
  if (/Do you wish to train\?/.test(game.text())) {
    const text = game.text();
    await game.press("y");
    for (let presses = 0; !/Choose a function\s*$/.test(game.menu()); presses++) {
      if (presses >= 8) game.fail("Training did not lead back to the trainer's menu.");
      await game.press("enter");
    }
    return { trained: true, text };
  }
  game.fail("Train Character answered with something this helper does not know.");
}

/**
 * In a temple's menu ("Heal View ... Exit"): ask for `cure` for `member` and pay. Returns
 * { price, paid, said }: the price the temple named in gold pieces, whether it took the money,
 * and what it flashed if it refused ("Not enough money."). Leaves the game on the temple menu.
 */
export async function templeCure(game, member, cure) {
  const templeMenu = /Heal View (?:Take )?Pool (?:Share )?Appraise Exit\s*$/;
  game.expect(templeMenu, "Cures are bought from the temple menu.");
  await choose(game, member);
  await game.press("h", /how can we help you\?/, "Heal lists the cures.");
  await game.selectLine(cure);
  await game.press("h");
  for (let asked = 0; !/pay for cure Yes No\s*$/.test(game.text()); asked++) {
    if (asked >= 3 || !/anyway: Yes No\s*$/.test(game.text())) game.fail("The cure did not come to its price.");
    await game.press("y");
  }
  const price = /will only cost (\d+) gold pieces\./.exec(game.text().replace(/\s+/g, " "));
  if (!price) game.fail("The temple did not name a price.");
  const shown = game.flashed.length;
  await game.press("y");
  const said = game.flashed.slice(shown).map(({ text }) => text);
  for (let presses = 0; !/Heal Exit\s*$/.test(game.menu()); presses++) {
    if (presses >= 4) game.fail("Paying did not lead back to the list of cures.");
    await game.press("enter");
  }
  await game.press("e", templeMenu, "Exit leaves the list of cures.");
  return { price: +price[1], paid: !said.length, said: said.join(" ") };
}

/** In a shop or temple menu: pool the party's money with the game's Pool command. */
export async function pool(game) {
  if (!/\bPool\b/.test(game.menu())) game.fail("This menu has no Pool.");
  await game.press("p", /\bTake Pool Share\b/, "Pool puts the party's money together: the menu gains Take and Share.");
}

/**
 * In a shop's menu ("Buy View ... Exit"): buy the first item whose row matches `item` for
 * `member`. Returns { price, bought, said }: the price on the list, whether the member now
 * carries it, and what the shop flashed if it refused. Leaves the game on the shop menu.
 */
export async function buy(game, member, item) {
  const shopMenu = /Buy View (?:Take )?Pool (?:Share )?Appraise Exit\s*$/;
  game.expect(shopMenu, "Goods are bought from the shop menu.");
  await choose(game, member);
  await game.press("b", /Items: Buy Exit\s*$/, "Buy lists the stock.");
  const row = await game.selectLine(item);
  const price = /\s(\d+)$/.exec(row);
  const shown = game.flashed.length;
  await game.press("b");
  const said = game.flashed.slice(shown).map(({ text }) => text);
  if (/Items: Buy Exit\s*$/.test(game.menu())) await game.press("e", shopMenu, "Exit leaves the stock list.");
  return { price: price ? +price[1] : undefined, bought: !said.length, said: said.join(" ") };
}
