// Script positions, checked on the running game.
//
//   npm run verify:script-positions
//
// Artwork and narration are keyed by positions in the game's scripts as the first release numbers
// them. New Phlan's script (ECL3.DAX block 0) is three bytes longer in version 1.3 from a692 on, and
// the host converts what it reads (src/runtime/bindings.ts, "Script positions"). This check plays
// the game on whichever build POR_GAMEDATA holds and requires, at two New Phlan moments after a692,
// the artwork key and the narration event the first release reports:
//
//   the silver shop's greeting   portrait ...ecl:ae69:caller:a99e..., narration at a964
//   the silver shop's menu       portrait ...ecl:a9cf...
//
// It does so from three starts, because the numbering belongs to the script in memory and a saved
// game holds a copy of its area's script: a new game, a game the first release saved in New Phlan,
// and a game version 1.3 saved in New Phlan (qa/fixtures). Before the host read which release's
// script is loaded, a save from the other release reported every later position three off
// (ae66, a99b, a9cc on 1.3; ae6c, a9a1, a9d2 on the first release).

import assert from "node:assert/strict";
import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { addReadyMadeParty, beginAdventuring, exploring, startGame } from "./acceptance/harness.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { assets } = JSON.parse(readFileSync(join(root, "upgrades", "manifest.json"), "utf8"));
const greeting = "portrait:area:0:ecl:ae69:caller:a99e:HEAD3.DAX:63:BODY3.DAX:34";
const menu = "portrait:area:0:ecl:a9cf:HEAD3.DAX:63:BODY3.DAX:34";
const greetingNarration = "por.review.ecl-3.block-0.at-a964";
for (const key of [greeting, menu]) assert.ok(key in assets, `upgrades/manifest.json no longer holds ${key}`);
const voice = JSON.parse(readFileSync(join(root, "src", "audio", "voice-master-manifest.json"), "utf8"));
assert.ok(voice.events.some(({ sourceId }) => sourceId === greetingNarration), `The narration manifest no longer holds ${greetingNarration}`);
const portraitKeys = Object.keys(assets).filter((key) => key.startsWith("portrait:")).join(",");

const starts = [
  { name: "a new game" },
  { name: "a game the first release saved in New Phlan", fixture: "new-phlan-first-release" },
  { name: "a game version 1.3 saved in New Phlan", fixture: "new-phlan-version-1.3" },
];

async function silverShop({ name, fixture }) {
  const saves = fixture && mkdtempSync(join(tmpdir(), "por-script-positions-"));
  if (fixture) cpSync(join(root, "qa", "fixtures", fixture), saves, { recursive: true });
  const game = await startGame({ saves, seconds: 420, env: { POR_PORTRAIT_ART_KEYS: portraitKeys } });
  try {
    if (fixture) {
      await game.press("l", /Load Which Game: A/, "L asks which saved game to load.");
      await game.press("a", exploring, "A loads slot A.");
    } else {
      await addReadyMadeParty(game);
      await beginAdventuring(game);
    }
    // From the gate at (0,4) to the square north of the silver shop, then in through its door.
    await game.walk("EENNEEESEESSSSSSSSSEEENNNE");
    const mark = game.narrated.length;
    await game.walk("S");
    game.expect(/THE SHOP SELLS SILVER ITEMS/, "The silver shop greets the party at (11,10).");
    const narrated = game.narrated.slice(mark).map(({ sourceId }) => sourceId);
    const seen = { greeting: game.frame.portrait, narrated };
    await game.press("y", /Buy View Pool Appraise Exit\s*$/, "YES opens the shop menu.");
    seen.menu = game.frame.portrait;
    return { name, ...seen };
  } finally {
    game.close();
    if (saves) rmSync(saves, { recursive: true, force: true });
  }
}

const results = await Promise.all(starts.map(silverShop));
const problems = [];
for (const { name, greeting: shownGreeting, menu: shownMenu, narrated } of results) {
  if (shownGreeting !== greeting) problems.push(`${name}: the silver shop's greeting reported ${shownGreeting}, not ${greeting}`);
  if (shownMenu !== menu) problems.push(`${name}: the silver shop's menu reported ${shownMenu}, not ${menu}`);
  if (!narrated.includes(greetingNarration)) problems.push(`${name}: the greeting narrated ${narrated.join(", ") || "nothing"}, not ${greetingNarration}`);
}
if (problems.length) {
  console.error(`script positions: ${problems.length} wrong\n  ${problems.join("\n  ")}`);
  process.exit(1);
}
console.log(`script positions: the silver shop's greeting (ae69, caller a99e, narration a964) and menu (a9cf) report the first release's keys from ${starts.map(({ name }) => name).join("; ")}`);
