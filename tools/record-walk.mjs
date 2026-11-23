// node tools/record-walk.mjs <saves directory> <slot letter> <fixture directory> [port]
// node tools/record-walk.mjs --replay <fixture directory>
//
// Records a new walk for npm run verify:port-parity's `leg` walk (POR_PARITY_ONLY=leg
// POR_PARITY_LEG=<fixture directory>), for an area the campaign never enters (#130). It loads the save
// in <slot letter> from a copy of <saves directory> (A.json to J.json and roster.json, for example a
// campaign run's directory), runs the shipped game (game/, POR_GAME_SOURCE=port) as the parity check
// runs it, and holds it open on 127.0.0.1:<port> (default 8791) while a player's keys are sent:
//
//   curl -s localhost:8791 -d '["up", "walk:NNE", "settle", ":win-combat"]'
//
// Each key is sent as it is, then the game is let run (":travel-poll") until it waits for the player,
// as the acceptance harness does; a fight the game plays out by itself is won with ":win-combat". "walk:<NESW...>" walks squares with the harness's own step; "settle"
// only lets the game run. The answer is the screen, the party's square and the area. GET shows the
// screen; POST "[\"quit\"]" closes the game.
//
// The fixture directory gets what the `leg` walk plays: the saves as they were when the walk began,
// boot.json (normal input, no legacy presses: docs/REPLAYS.md), commands.jsonl (every line the runner
// accepted, in order), prompts.jsonl (when the game asked for each, POR_PROMPT_SCHEDULE_OUT), and
// visits.jsonl (POR_TRACE_VISITS, for npm run qa:visits -- --record). The recording also keeps the
// screen the walk ended on (last-screen.txt).
//
// --replay plays a fixture's commands from game/ as the `leg` walk plays them (its saves, boot keys and
// prompt record), writes its visits.jsonl afresh, and fails unless every command is taken and the
// game ends on the recorded last screen.
//
// A walk played in sections saves the game in its last commands (Encamp, Save, a slot). The game
// writes that slot into the walk's own copy of the saves, so the recording and --replay both keep the
// saves as the walk left them in <fixture>/after/ whenever one changed: the next section records
// from there (`node tools/record-walk.mjs <fixture>/after G <next fixture>`). The `leg` walk reads
// only the fixture's top-level saves.
//
// POR_DEV_COMBAT=0 records stock play and leaves battle outcomes to ordinary game commands.
// POR_RECORD_WATCH=4a45,4ab2 adds those script variables (hex) to each answer, as the game holds them.
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { tsImport } from "tsx/esm/api";
import { screenRows, startGame } from "./acceptance/harness.mjs";

const replaying = process.argv[2] === "--replay";
const [from, letter, fixture, port = "8791"] = replaying ? [undefined, "A", process.argv[3]] : process.argv.slice(2);
if (replaying ? !fixture : !from || !/^[A-J]$/.test(letter ?? "") || !fixture) throw new Error("usage: node tools/record-walk.mjs <saves directory> <slot letter A-J> <fixture directory> [port]");

const { loadUpgradeArt, loadCombatMaterialMasks } = await tsImport("./upgrade-art.ts", import.meta.url);
const { portGameRoot, readGameFile } = await tsImport("./gamedata.ts", import.meta.url);
const { enhancedArtEnv } = await tsImport("./enhanced-runner.ts", import.meta.url);
const { detectGameVersion, useGameVersion } = await tsImport("../src/runtime/bindings.ts", import.meta.url);
useGameVersion(detectGameVersion(readGameFile(portGameRoot, "GAME.OVR")));
const artwork = loadUpgradeArt(undefined, portGameRoot);
const portEnv = { POR_GAME_SOURCE: "port", ...enhancedArtEnv(artwork, loadCombatMaterialMasks(artwork)) };
const lastScreen = (frame) => screenRows(frame).map((row) => row.trimEnd()).join("\n").trimEnd() + "\n";
const watch = (process.env.POR_RECORD_WATCH ?? "").split(",").filter(Boolean).map((address) => Number.parseInt(address, 16));
const slotFile = /^(?:[A-J]|roster)\.json$/;
/** When the walk wrote a save, keep every slot as the walk left it in <fixture>/after/. */
function keepSaves(saves, startingSaves = fixture) {
  const changed = readdirSync(saves).filter((name) => slotFile.test(name) &&
    (!existsSync(join(startingSaves, name)) || readFileSync(join(saves, name), "utf8") !== readFileSync(join(startingSaves, name), "utf8")));
  if (!changed.length) return;
  const after = join(fixture, "after");
  rmSync(after, { recursive: true, force: true });
  mkdirSync(after);
  for (const name of readdirSync(saves).filter((name) => slotFile.test(name))) cpSync(join(saves, name), join(after, name));
  console.error(`[record-walk] the walk saved ${changed.join(", ")}; all slots kept in ${after}`);
}

if (replaying) {
  const boot = JSON.parse(readFileSync(join(fixture, "boot.json"), "utf8"));
  const saves = mkdtempSync(join(tmpdir(), "por-replay-walk-"));
  const checkpoints = resolve(fixture, boot.checkpointSource ?? ".");
  for (const name of readdirSync(checkpoints).filter((name) => slotFile.test(name))) cpSync(join(checkpoints, name), join(saves, name));
  writeFileSync(join(fixture, "visits.jsonl"), "");
  const game = await startGame({ pregen: false, saves, seconds: 3600, env: { ...portEnv,
    POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_DEV_COMBAT: boot.developerCombat ? "1" : "0",
    POR_INPUT_COMPAT: boot.inputCompat ?? "discard-poll-prompt", POR_PROMPT_SCHEDULE_IN: resolve(fixture, "prompts.jsonl"),
    POR_PROMPT_SCHEDULE_OUT: "", POR_TRACE_VISITS: resolve(fixture, "visits.jsonl") } });
  const commands = readFileSync(join(fixture, "commands.jsonl"), "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
  try {
    for (const [index, command] of commands.entries()) {
      if (!await game.send(command)) game.fail(`The runner refused command ${index}, ${JSON.stringify(command)}.`);
    }
    const recorded = join(fixture, "last-screen.txt");
    if (!existsSync(recorded)) {
      writeFileSync(recorded, lastScreen(game.frame));
      console.log(`Replayed ${commands.length} commands from game/. The recording kept no last screen: this replay's is in ${recorded}.`);
    } else if (lastScreen(game.frame) !== readFileSync(recorded, "utf8")) {
      game.fail(`After ${commands.length} commands the screen is not the recorded last screen:\n${readFileSync(recorded, "utf8")}`);
    } else console.log(`Replayed ${commands.length} commands from game/ to the recorded last screen.`);
    console.log(`Visits: ${join(fixture, "visits.jsonl")}`);
  } finally {
    game.close();
    keepSaves(saves, checkpoints);
    rmSync(saves, { recursive: true, force: true });
  }
  process.exit(0);
}

// The load key: L on the first menu, then the slot's letter (its scan code and character).
const scanCodes = { A: 0x1e, B: 0x30, C: 0x2e, D: 0x20, E: 0x12, F: 0x21, G: 0x22, H: 0x23, I: 0x17, J: 0x24 };
const slotKey = ((scanCodes[letter] << 8) | letter.toLowerCase().charCodeAt(0)).toString(16).padStart(4, "0");
const boot = {
  bootKeys: `31000000:1c0d,45000000:266c,52000000:${slotKey}`,
  startAt: "85000000",
  developerCombat: process.env.POR_DEV_COMBAT !== "0",
  inputCompat: "",
};

mkdirSync(fixture, { recursive: true });
for (const name of readdirSync(fixture).filter((name) => /^(?:[A-J]|roster)\.json$|\.jsonl$/.test(name))) rmSync(join(fixture, name));
const saves = mkdtempSync(join(tmpdir(), "por-record-walk-"));
for (const name of readdirSync(from).filter((name) => /^(?:[A-J]|roster)\.json$/.test(name))) {
  cpSync(join(from, name), join(fixture, name));
  cpSync(join(from, name), join(saves, name));
}
writeFileSync(join(fixture, "boot.json"), JSON.stringify(boot) + "\n");
const commandsFile = join(fixture, "commands.jsonl");
writeFileSync(commandsFile, "");

const game = await startGame({ pregen: false, saves, seconds: 4 * 3600, watch, env: { ...portEnv,
  POR_BOOT_KEYS: boot.bootKeys, POR_LIVE_AT: boot.startAt, POR_DEV_COMBAT: boot.developerCombat ? "1" : "0", POR_INPUT_COMPAT: boot.inputCompat,
  POR_PROMPT_SCHEDULE_IN: "", POR_PROMPT_SCHEDULE_OUT: resolve(fixture, "prompts.jsonl"),
  POR_TRACE_VISITS: resolve(fixture, "visits.jsonl"),
} });
const send = game.send;
game.send = async (command) => {
  const went = await send(command);
  if (went && command !== undefined) appendFileSync(commandsFile, JSON.stringify(command) + "\n");
  return went;
};
// As the harness settles, but a fight the game would play out by itself is won with the developer's
// command (":win-combat") at the first poll that offers it, as the campaign wins its fights: a party
// on Quick from an earlier fight would otherwise fight on unasked, and can die there.
game.settle = async () => {
  for (let polls = 0; !game.frame.awaitsKey; polls++) {
    if (polls >= 3000) game.fail("The game was still running by itself after 3000 keyboard polls.");
    const command = boot.developerCombat && game.frame.developerVictoryAvailable ? ":win-combat" : ":travel-poll";
    if (!await game.send(command)) game.fail(`The runner refused ${command} at a frame that does not wait for a key.`);
  }
  return game.frame;
};

const report = (notes) => {
  const rows = screenRows(game.frame).map((row) => row.trimEnd());
  return JSON.stringify({ notes, area: game.frame.exploration?.area, here: game.here(), awaitsKey: game.frame.awaitsKey,
    developerVictory: game.frame.developerVictoryAvailable, variables: game.frame.scriptVariables,
    menu: game.menu(), screen: rows.filter((row, index) => row || rows.slice(index).some(Boolean)) }, null, 1) + "\n";
};

const server = createServer(async (request, response) => {
  let body = "";
  for await (const chunk of request) body += chunk;
  const notes = [];
  try {
    for (const command of body ? JSON.parse(body) : []) {
      if (command === "quit") {
        writeFileSync(join(fixture, "last-screen.txt"), lastScreen(game.frame));
        response.end(report(["closed"]));
        game.close();
        keepSaves(saves);
        rmSync(saves, { recursive: true, force: true });
        server.close();
        return;
      }
      if (command === "settle") await game.settle();
      else if (command.startsWith("walk:")) await game.walk(command.slice(5));
      else {
        if (!await game.send(command)) { notes.push(`refused ${command}`); break; }
        await game.settle();
      }
    }
  } catch (error) {
    notes.push(String(error.message ?? error).split("\n").slice(0, 3).join(" / "));
  }
  response.end(report(notes));
});
server.listen(Number(port), "127.0.0.1", () => console.error(`[record-walk] slot ${letter} from ${from}, recording into ${fixture}, on 127.0.0.1:${port}`));
