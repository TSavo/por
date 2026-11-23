// Verifies that a script illustration leaves with the pose it was shown at.
//
//   npm run verify:illustration-left-behind
//
// A script illustration is the Enhanced picture for a passage the game prints over the view it drew. When
// the script ends, the original leaves the passage in the text box, and the party can turn or step where
// no event runs: the game draws the new view and writes nothing in the box. Before the fix the runner
// matched the illustration by the script position and the text alone, so it stayed over the walking view
// after any turn ("stuck on a portrait"). It must go once the player's key moves the party, and stay gone
// if the party turns back, while the script's own move (the inn turns the party out) keeps it.
//
// The guide's party is in New Phlan (qa/fixtures/guide-party-new-phlan, slot A). It walks to the inn
// south of 4,11, declines the room, and turns. No Chrome is used: the game server's /state is checked.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const directory = mkdtempSync(join(tmpdir(), "por-illustration-left-behind-"));
const saves = join(directory, "saves");
mkdirSync(saves);
copyFileSync("qa/fixtures/guide-party-new-phlan/A.json", join(saves, "A.json"));
const port = process.env.POR_PLAY_PORT ?? "43217";
const origin = `http://127.0.0.1:${port}`;
const environment = { ...process.env };
delete environment.POR_UPGRADES_DIR;
delete environment.POR_GAMEDATA;
const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...environment, POR_PLAY_PORT: port, POR_SAVE_DIR: saves, POR_GAME_SOURCE: "port",
    POR_PREGEN_PARTY: "0", POR_BOOT_KEY_FILE: "", POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:1e61",
    POR_LIVE_AT: "85000000", POR_BOOT_STEPS: "450000000", POR_CLOCK: "fixed", POR_INPUT_COMPAT: "",
  },
  stdio: ["ignore", "ignore", "inherit"],
});

async function latest() {
  const state = await (await fetch(origin + "/state")).json();
  if (state.stopped) throw new Error(`The game stopped: ${state.stopped}`);
  return state;
}
async function waitFor(description, read, timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const found = await read();
      if (found) return found;
    } catch (error) {
      if (error.message?.startsWith("The game stopped")) throw error;
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${description}`);
    await delay(50);
  }
}
const dialogue = state => {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of state.text ?? []) cells[cell] = String.fromCharCode(character);
  return cells.slice(640, 960).join("").replace(/\s+/g, " ").trim();
};
const pose = state => state.exploration && [state.exploration.x, state.exploration.y, state.exploration.facing].join(",");
let frame;
async function press(key) {
  const sequence = frame.sequence;
  const response = await fetch(origin + "/key", {
    method: "POST", headers: { Origin: origin, "X-POR-Frame": String(sequence) }, body: key,
  });
  assert.equal(response.status, 204, `Input rejected: ${key}`);
  frame = await waitFor(`the frame after ${key}`, async () => {
    const state = await latest();
    return state.ready && state.sequence > sequence && state;
  });
  return frame;
}

const innIllustration = "scene-illustration:area:0:ecl:aa63";
try {
  frame = await waitFor("the loaded game", async () => {
    const state = await latest();
    return state.ready && state.exploration && state;
  }, 300_000);
  assert.equal(pose(frame), "4,12,4", "The guide's party starts at 4,12 facing south");
  for (const key of ["up", "down", "up", "up", "down"]) await press(key);
  assert.equal(pose(frame), "4,11,4");
  await press("up");
  assert.match(dialogue(frame), /COST YOU 1 PLATINUM PIECE TO REST HERE/);
  // The innkeeper turns the party out: the script moves it, and the passage keeps its illustration.
  await press("n");
  assert.equal(dialogue(frame), "THEN YOU MUST LEAVE.");
  assert.equal(frame.portrait, innIllustration, "The inn's refusal shows its illustration");
  const shownAt = pose(frame);
  // The player turns. The caption stays in the text box, as in the original, but the view is the new one.
  await press("right");
  assert.notEqual(pose(frame), shownAt);
  assert.equal(dialogue(frame), "THEN YOU MUST LEAVE.", "The original leaves the caption after a turn");
  assert.equal(frame.portrait, undefined, `The illustration stayed over the walking view: ${frame.portrait}`);
  assert.ok(frame.perspective, "The first-person view is shown after the turn");
  // Turning back to where it was shown does not bring it back.
  await press("left");
  assert.equal(pose(frame), shownAt);
  assert.equal(frame.portrait, undefined, "The illustration came back when the party turned back");
  // The same passage printed again is a new passage, with its illustration.
  await press("up");
  assert.match(dialogue(frame), /COST YOU 1 PLATINUM PIECE TO REST HERE/);
  await press("n");
  assert.equal(frame.portrait, innIllustration, "The inn's refusal shows its illustration the second time");
  await press("down");
  assert.equal(frame.portrait, undefined, "The second illustration left with the turn");
  console.log("Verified that a script illustration leaves with the pose it was shown at.");
} finally {
  server.kill();
  await once(server);
  await rm(directory, { recursive: true, force: true });
}
function once(child) {
  return child.exitCode !== null ? Promise.resolve() : new Promise(resolve => child.once("exit", resolve));
}
