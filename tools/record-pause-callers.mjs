// The evidence behind npm run qa:pause-callers (#81).
//
//   node tools/record-pause-callers.mjs <out.jsonl> <fixture directory>...
//       Replays each recorded walk (boot.json, commands.jsonl, prompts.jsonl and its saves, as
//       tools/record-walk.mjs writes them) from the 1.3 files and from game/, side by side, with
//       POR_PAUSE_LOG=<out.jsonl> (tools/acceptance/harness.mjs), which appends one line for every
//       pause through the pause routine that had text on screen: the walk, the source, where the call
//       returns to, the text, and whether that text reached the page. Any harness run (the acceptance
//       tests) can add to such a log the same way.
//   node tools/record-pause-callers.mjs --merge <out.jsonl>...
//       Keeps in qa/pause-callers.json, for each call and source, a pause whose text did not reach
//       the page if there is one, and otherwise one that did. A walk replayed again replaces what it
//       recorded before.
//
// POR_GAMEDATA_1_3 names the 1.3 files (default ~/por-assets/gog-1.3/POOLRAD).
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import { tsImport } from "tsx/esm/api";
import { startGame } from "./acceptance/harness.mjs";

const { pauseCallers, readEvidence, evidencePath } = await tsImport("./qa-pause-callers.ts", import.meta.url);
const callers = pauseCallers();
const hex = (n) => n.toString(16);
const byReturn = new Map(callers.map((caller) => [
  caller.module === "exe" ? `exe ${hex(caller.at + caller.length)}` : `slice ${Number(caller.module.slice(3))} +${hex(caller.at + caller.length)}`,
  caller.id,
]));

if (process.argv[2] === "--merge") {
  const evidence = readEvidence();
  for (const file of process.argv.slice(3)) {
    const lines = readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line))
      .map((line) => ({ ...line, id: byReturn.get(line.returns) })).filter((line) => line.id);
    // What each walk found, by call and source: a pause that did not reach the page wins.
    const found = new Map();
    for (const line of lines) {
      const key = `${line.id}\n${line.walk}\n${line.source}`;
      const before = found.get(key);
      if (!before || (before.shown && !line.shown)) found.set(key, line);
    }
    for (const { id, source, walk, text, shown } of found.values()) {
      const kept = (evidence[id] ??= {})[source];
      if (!kept || kept.walk === walk || (kept.shown && !shown)) evidence[id][source] = { walk, text, shown };
    }
  }
  const sorted = Object.fromEntries(callers.filter(({ id }) => evidence[id]).map(({ id }) => [id, evidence[id]]));
  writeFileSync(evidencePath, JSON.stringify({
    about: "Evidence for npm run qa:pause-callers (#81): for each call that pauses through the game's pause routine, " +
      "a replayed pause from the 1.3 files (original) and from game/ (port), its text, and whether that text reached the page. " +
      "Written by node tools/record-pause-callers.mjs --merge.",
    calls: sorted,
  }, null, 1) + "\n");
  console.log(`kept evidence for ${Object.keys(sorted).length} of ${callers.length} calls in ${evidencePath}`);
  process.exit(0);
}

const [out, ...fixtures] = process.argv.slice(2);
if (!out || !fixtures.length) throw new Error("usage: node tools/record-pause-callers.mjs <out.jsonl> <fixture directory>... | --merge <out.jsonl>...");

const { loadUpgradeArt, loadCombatMaterialMasks } = await tsImport("./upgrade-art.ts", import.meta.url);
const { portGameRoot, readGameFile } = await tsImport("./gamedata.ts", import.meta.url);
const { enhancedArtEnv } = await tsImport("./enhanced-runner.ts", import.meta.url);
const { detectGameVersion, useGameVersion } = await tsImport("../src/runtime/bindings.ts", import.meta.url);
useGameVersion(detectGameVersion(readGameFile(portGameRoot, "GAME.OVR")));
const artwork = loadUpgradeArt(undefined, portGameRoot);
const sources = {
  original: { POR_GAMEDATA: resolve(process.env.POR_GAMEDATA_1_3 ?? join(homedir(), "por-assets/gog-1.3/POOLRAD")), POR_GAME_SOURCE: "original" },
  port: { POR_GAME_SOURCE: "port", ...enhancedArtEnv(artwork, loadCombatMaterialMasks(artwork)) },
};

async function replay(fixture, source) {
  const walk = relative(process.cwd(), resolve(fixture));
  const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
  const saves = mkdtempSync(join(tmpdir(), "por-pause-callers-"));
  for (const name of readdirSync(fixture).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name))) cpSync(join(fixture, name), join(saves, name));
  const game = await startGame({ pregen: false, saves, seconds: 3600, env: { ...sources[source],
    POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_DEV_COMBAT: boot.developerCombat ? "1" : "0",
    POR_INPUT_COMPAT: boot.inputCompat ?? "discard-poll-prompt", POR_PROMPT_SCHEDULE_IN: resolve(fixture, "prompts.jsonl"),
    POR_PROMPT_SCHEDULE_OUT: "", POR_PAUSE_LOG: resolve(out), POR_PAUSE_WALK: walk } });
  const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  let taken = 0;
  try {
    for (const command of commands) {
      if (!await game.send(command)) break;
      taken++;
    }
  } finally {
    game.close();
    rmSync(saves, { recursive: true, force: true });
  }
  // The harness wrote the pauses with text to `out` when the game closed.
  const withText = game.pauses.filter((pause) => pause.text.some(([, character]) => character > 32));
  const unknown = new Set(withText.map((pause) => pause.returns).filter((returns) => !byReturn.has(returns)));
  console.log(`${walk} from ${source}: ${taken} / ${commands.length} commands, ${game.pauses.length} pauses, ` +
    `${withText.length} with text, ${withText.filter((pause) => !pause.shown).length} of them not on the page` +
    (unknown.size ? `; returns the scan does not list: ${[...unknown].join(", ")}` : ""));
}

if (!existsSync(out)) writeFileSync(out, "");
// One game at a time: the machine is shared.
for (const fixture of fixtures) for (const source of ["original", "port"]) await replay(fixture, source);
process.exit(0);
