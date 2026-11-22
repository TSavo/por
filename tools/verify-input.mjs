// One key press is one input.
//
//   npm run verify:input
//
// The game empties its keyboard buffer before it draws a new screen. On DOS
// that takes no time and the player is never asked for a key there. This
// check drives the translated game from a fresh start, presses each key
// once, and requires the screen the original shows next. It needs the
// original game files and no saved game or browser.
//
// Set POR_INPUT_COMPAT=discard-poll-prompt to see it fail on the old
// behaviour, where a press was spent on each of those moments, and
// POR_SWALLOW_KEY=n to see it fail when the n-th key is swallowed: no key
// here is pressed again until the screen changes (#76).

import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const saves = mkdtempSync(join(tmpdir(), "por-input-"));
const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
  env: {
    ...process.env, POR_PREGEN_PARTY: "1", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: saves, POR_TRACE_KEYS: "1",
    POR_JOURNAL_PROFILE: "", POR_BOOT_KEY_FILE: "", POR_BOOT_KEYS: "31000000:1c0d", POR_LIVE_AT: "50000000",
    POR_BOOT_STEPS: "450000000",
  },
  stdio: ["pipe", "pipe", "pipe"],
});
let discarded = 0;
let errors = "";
createInterface({ input: runner.stderr }).on("line", (line) => {
  if (/^POR_KEY .* discarded$/.test(line)) discarded++;
  else if (!line.startsWith("POR_KEY ")) errors += line + "\n";
});
const frames = createInterface({ input: runner.stdout })[Symbol.asyncIterator]();
const timer = setTimeout(() => runner.kill(), 240_000);

async function nextFrame() {
  for (;;) {
    const { value, done } = await frames.next();
    if (done) throw new Error(`The game stopped.\n${errors}`);
    if (value.startsWith("POR_FRAME ")) return JSON.parse(value.slice("POR_FRAME ".length));
  }
}
function text(frame) {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return cells.join("").replace(/ +/g, " ").trim();
}
let frame;
/** Press a key once and require what the screen shows next. */
async function press(key, expected, why) {
  runner.stdin.write(key + "\n");
  frame = await nextFrame();
  assert.match(text(frame), expected, `${why}\nAfter one press of ${key} the screen shows:\n${text(frame)}`);
}

try {
  frame = await nextFrame();
  assert.match(text(frame), /Create New Character/, text(frame));
  // Add the first ready-made character to the party, then leave the list.
  await press("a", /Add a character: Add Exit/, "A opens the list of characters to add.");
  await press("a", /\* \w+.*Add a character: Add Exit/s, "A adds the highlighted character and marks it.");
  await press("e", /Create New Character/, "E leaves the list and returns to the party menu.");
  // Begin Adventuring: one press leaves the party menu, and Rolf's tour follows. Each Enter brings
  // up the next stop of the tour: a press the game swallowed would leave the stop on screen (#76).
  await press("b", /15,1 W .*I AM ROLF.*Press <enter>\/<return> to continue$/, "B begins the adventure with one press.");
  const tour = [
    /11,2 S .*TEMPLE OF TYR/, /11,2 N .*PASSENGER DOCK/, /5,2 E .*SPECIAL TRAINING SCHOOLS/, /4,3 S .*CITY HALL/,
    /1,4 W .*SUNE'S TEMPLE/, /0,4 W .*MONSTER- RIDDEN AREAS/, /0,4 W .*OUR TOUR IS ENDED/,
  ];
  for (const stop of tour) {
    await press("enter", new RegExp(`${stop.source}.*Press <enter>/<return> to continue$`), "Enter goes on to the next stop of the tour.");
  }
  await press("enter", /OUR TOUR IS ENDED.*Area Cast View Encamp Search Look$/, "Enter after the last stop leaves the party free to walk.");
  // Each of these is one press in the original.
  await press("e", /Camp: Save View Magic Rest Alter Exit/, "E opens the Camp menu with one press.");
  await press("s", /Save Which Game: A B C D E F G H I J/, "S opens the save menu with one press.");
  await press("a", /Quit TO DOS Yes No/, "A saves to slot A, and the game asks whether to quit.");
  await press("n", /Camp: Save View Magic Rest Alter Exit/, "N returns to the Camp menu.");
  await press("e", /Area Cast View Encamp Search Look/, "E leaves camp with one press.");
  await press("s", /search.*Area Cast View Encamp Search Look/s, "S turns on search with one press.");
  assert.equal(discarded, 0, "No key press may be given to the game at a moment when it only discards keys.");
  console.log("verified one press is one input from the party menu through Begin Adventuring, Rolf's tour, Camp, Save, and Search");
} finally {
  clearTimeout(timer);
  runner.kill();
  rmSync(saves, { recursive: true, force: true });
}
