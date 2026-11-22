// npm run verify:title-flash
//
// The title's lightning (#152). The title loop (GAME.OVR slice 1, 070e to 07f9) runs until a key or
// until the DOS clock passes its start plus 500 hundredths, five seconds. Each pass draws Random(4)
// (the call returns to 0721) and adds it to a counter; past 50,000, about 33,000 passes, it flashes:
// Random(3) (returning to 074f) picks how many times, and register 1 goes to light blue, light cyan,
// white and back (#82). On the original under DOSBox the loop makes thousands of passes a second and
// flashes every second or two. The check boots the game with no key at all, so the title can end only
// by its own clock, and requires at least one flash before it ends, as the original's five seconds give.
//
// From the files in POR_GAMEDATA with POR_GAME_SOURCE=original, or from game/ with POR_GAME_SOURCE=port.
// It reads the runner's dice trace (POR_TRACE_DICE) and palette trace (POR_TRACE_PALETTE); it presses
// nothing and changes nothing.
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const steps = process.env.POR_TITLE_STEPS ?? "90000000";
const directory = mkdtempSync(join(tmpdir(), "por-title-flash-"));
const palette = join(directory, "palette.jsonl");
const env = { ...process.env, POR_TRACE_DICE: "1", POR_TRACE_PALETTE: palette, POR_BOOT_KEYS: "", POR_BOOT_KEY_FILE: "",
  POR_BOOT_STEPS: steps, POR_BROWSER_PLAY: "" };
// No live session: the runner plays the boot by itself, and a read with no key gets Enter.
delete env.POR_LIVE_AT;
const run = spawnSync(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], { env, encoding: "utf8", maxBuffer: 1 << 30 });
if (run.error) throw run.error;
const draws = run.stderr.split("\n").map((line) => /^POR_DICE (\d+) (.+) range (\d+)/.exec(line)).filter(Boolean)
  .map(([, step, caller, range]) => ({ step: +step, caller, range: +range }));
let changes = [];
try {
  changes = readFileSync(palette, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line));
} catch { /* No change to the palette: no file. */ }
rmSync(directory, { recursive: true, force: true });

const passes = draws.filter(({ caller, range }) => caller === "slice 1+721" && range === 4);
const flashes = draws.filter(({ caller, range }) => caller === "slice 1+74f" && range === 3);
const white = changes.filter(({ registers, callers }) => registers[1] === 0x17 && callers[0]?.startsWith("slice 1+"));
const last = passes.at(-1);
const after = last && draws.find(({ step }) => step > last.step);
const source = process.env.POR_GAME_SOURCE ?? "original";
console.log(`${source}: the title loop made ${passes.length} passes` +
  (passes.length ? ` (steps ${passes[0].step} to ${last.step})` : "") +
  `, ${flashes.length} times decided to flash, and showed white on register 1 ${white.length} times` +
  (after ? `; then the game went on (${after.caller} drew at step ${after.step}).` : "; it had not ended by step " + steps + "."));
const failures = [];
if (!passes.length) failures.push("The title loop never ran: no Random(4) returned to slice 1 0721.");
if (passes.length && !after) failures.push(`The title had not ended by its own clock in ${steps} steps.`);
if (passes.length && !white.length) {
  failures.push(`The title ended after ${passes.length} passes without a flash: the original's five seconds give it some ` +
    `33,000 passes, and a flash every second or two.`);
}
if (failures.length) {
  console.log(failures.join("\n"));
  process.exitCode = 1;
}
