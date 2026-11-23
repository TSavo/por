// npm run verify:developer-combat
//
// The developer's win (":win-combat", tools/developer-combat.ts) must win a fight whose monsters come
// in more than one group, and the game must go on (#136). The walk qa/fixtures/visit-textile-house
// ends in the Textile House courtyard: "A DRUM BEGINS TO BEAT AND HOBGOBLINS ATTACK." Its last
// commands win the fight during a hobgoblin's own turn; the party, on Quick, then strikes hobgoblins
// the win removed, and the game's count of hostiles goes below zero (255, 254) until it recounts. The
// runner offered the win again on that count, and a second win stopped it. This plays the walk from
// game/ as the `leg` walk of verify:port-parity plays it, wins whenever the game offers it, and
// requires the fight to come to its end with the runner still going.
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { screenText, startGame } from "./acceptance/harness.mjs";

const fixture = join("qa", "fixtures", "visit-textile-house");
const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
const saves = mkdtempSync(join(tmpdir(), "por-developer-combat-"));
for (const name of readdirSync(fixture).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name))) cpSync(join(fixture, name), join(saves, name));
const game = await startGame({ pregen: false, saves, seconds: 1200, env: {
  POR_GAME_SOURCE: process.env.POR_GAME_SOURCE ?? "port",
  POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_DEV_COMBAT: "0", POR_INPUT_COMPAT: boot.inputCompat ?? "",
  POR_PROMPT_SCHEDULE_IN: resolve(fixture, "prompts.jsonl"),
} });
try {
  // The walk's commands up to its first developer's win in the courtyard fight; the walk may go on
  // past the fight, and the rest is this check's own.
  const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  if (game.frame.developerVictoryAvailable || await game.send(":win-combat")) game.fail("Victory was unlocked at startup.");
  if (!await game.send(":idspispopd")) game.fail("The session refused the combat unlock.");
  let courtyard = false;
  for (const [index, command] of commands.entries()) {
    if (!await game.send(command)) game.fail(`The runner refused the walk's command ${index}, ${JSON.stringify(command)}.`);
    courtyard ||= /A DRUM BEGINS TO BEAT/.test(game.text());
    if (courtyard && command === ":win-combat") break;
    if (index === commands.length - 1) game.fail("The walk has no developer's win in the courtyard fight.");
  }
  let wins = 0;
  for (let polls = 0; !/Continue Battle:Yes No\s*$|The party has won/.test(game.text()); polls++) {
    if (polls >= 3000) game.fail("The courtyard fight did not end after 3000 polls.");
    const command = game.frame.developerVictoryAvailable ? ":win-combat" : ":travel-poll";
    if (command === ":win-combat") wins++;
    // The harness throws "The game stopped" if the runner dies here: the failure #136 reported.
    if (!await game.send(command)) game.fail(`The runner refused ${command}.`);
  }
  console.log(`The courtyard fight came to its end after ${wins} more developer's wins: ${screenText(game.frame).slice(-60)}`);
} finally {
  game.close();
  rmSync(saves, { recursive: true, force: true });
}
