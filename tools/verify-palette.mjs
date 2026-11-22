// npm run verify:palette
//
// The original sets its EGA palette registers through int 10h AH=10h (#82): the title flashes
// register 1 through light blue, light cyan and white (slice 1, 0765 to 07cf), and every fight shows
// pixel value 0 as dark grey and 8 as black from when it begins (slice 31 00e3, from START.EXE image
// 3728) to when it ends (slice 31 0105, from slice 8 0064). Classic must show each pixel in the colour
// its register gives it, for as long as the game holds it; Enhanced keeps its own colours.
//
// What the original sets is not taken from the translation: qa/fixtures/palette/original-1.3.json
// is the record of the original bytes of those routines run under Unicorn (tools/palette-unicorn.py).
// The colour a register shows is the 200-line monitor's: mode 0Dh is a 200-line mode, where bit 4 is
// intensity and bits 3 and 5 are not seen (the VGA BIOS loads its DAC to match).
//
// Two replays, from the files in POR_GAMEDATA (the GOG 1.3 files) with POR_GAME_SOURCE=original:
//   - the title, on a clock started at 23:59:50 (POR_FIXED_CLOCK_START=8639000). Its loop waits five
//     seconds by the DOS clock, and the flash needs some 33,000 passes of it; one pass reads the clock
//     once and the runner's clock moves one hundredth a reading, so on any other start the title ends
//     before it flashes. Across midnight the clock goes back to 0 and the title waits for a key, as
//     the original's does, and flashes.
//   - the first fight of SSI's six ready-made characters walking into the Slums, and the walk after it.
// Each frame and each picture held for the flash is checked pixel by pixel: the colour Classic shows
// against the colour the original's register gives that pixel's value (POR_FRAME_PIXELS=1 sends the
// values). With POR_GAME_SOURCE=port (game/, which has no Classic display) only Enhanced is recorded.
//
// Every Enhanced picture of both replays goes, hashed, to out/verify-palette/<source>.json. With
// POR_PALETTE_BASELINE=<such a file from another build> the two must be the same, picture for picture.
// The Classic pictures checked are saved beside it.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { inflateSync } from "node:zlib";
import { EGA_RGB } from "../src/lib/ega.ts";
import { addReadyMadeParty, beginAdventuring, startGame } from "./acceptance/harness.mjs";

const source = process.env.POR_GAME_SOURCE ?? "original";
const classic = source === "original";
const original = JSON.parse(readFileSync(join("qa", "fixtures", "palette", "original-1.3.json"), "utf8"));

/** The registers the BIOS loads for mode 0Dh: the sixteen CGA colours, 8 to 15 as 10h to 17h. */
const modeDefaults = Array.from({ length: 16 }, (_, value) => (value & 7) | (value & 8) << 1);
/** The colour a register's 6-bit value shows on a 200-line monitor. */
const shown = (value) => EGA_RGB[(value & 7) | (value & 0x10) >> 1];

/** Apply a routine's recorded calls to the registers: the registers at each Delay, and after the last call. */
function play(name, registers) {
  const holds = [];
  registers = [...registers];
  for (const event of original.routines[name].events) {
    if (event.delayMs !== undefined) holds.push({ registers: [...registers], ms: event.delayMs });
    else if (event.int10.ah === 0x10 && event.int10.al === 0) registers[event.int10.bl] = event.int10.bh;
  }
  return { holds, after: registers };
}
const flash = play("title", modeDefaults);
const battle = play("battle", modeDefaults).after;
const restored = play("restore", battle).after;
assert.deepEqual(flash.after, modeDefaults, "The title's flash puts register 1 back.");
assert.deepEqual(restored, modeDefaults, "The end of a fight puts registers 0 and 8 back.");

function decodePng(base64) {
  const png = Buffer.from(base64, "base64");
  const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
  const data = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset), type = png.toString("ascii", offset + 4, offset + 8);
    if (type === "IDAT") data.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const rgb = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    if (raw[y * (width * 3 + 1)] !== 0) throw new Error("The runner's pictures are written unfiltered.");
    raw.copy(rgb, y * width * 3, y * (width * 3 + 1) + 1, (y + 1) * (width * 3 + 1));
  }
  return { width, height, rgb };
}

const directory = join("out", "verify-palette");
mkdirSync(directory, { recursive: true });
let pictures = 0;
/** What the check found wrong, a sentence each. The run goes on past a wrong picture and fails at the end. */
const failures = [];
/**
 * Every pixel of a frame's Classic picture against the colour the registers give its value. Saves the
 * picture, and records a failure naming the first pixel in another colour. Returns how many pixels
 * hold each value, and whether every pixel was right.
 */
function checkClassic(view, registers, what) {
  writeFileSync(join(directory, `${String(++pictures).padStart(2, "0")}-${what.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}.png`),
    Buffer.from(view.frame, "base64"));
  assert.ok(view.pixels, `${what}: the frame carries no pixel values (POR_FRAME_PIXELS=1).`);
  const values = Buffer.from(view.pixels, "base64");
  const { rgb } = decodePng(view.frame);
  const counts = new Map();
  let wrong = 0, first;
  for (let pixel = 0; pixel < values.length; pixel++) {
    const value = values[pixel], want = shown(registers[value]);
    const got = [rgb[pixel * 3], rgb[pixel * 3 + 1], rgb[pixel * 3 + 2]];
    if (got.some((channel, index) => channel !== want[index])) {
      wrong++;
      first ??= `the pixel at ${pixel % 320},${Math.floor(pixel / 320)} has the value ${value}, which the original shows as ` +
        `${want.join(",")} (register ${value} = ${registers[value].toString(16)}h); Classic shows ${got.join(",")}`;
    }
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  if (wrong) failures.push(`${what}: ${wrong} of ${values.length} pixels are not in the original's colours; ${first}.`);
  return { counts, right: !wrong };
}

const enhanced = { title: [], fight: [] };
const hash = (png) => createHash("sha256").update(png).digest("hex").slice(0, 16);
/** The frame's Enhanced picture and those of the clips Enhanced plays, hashed. */
function recordEnhanced(list, view) {
  list.push([hash(view.enhancedFrame), ...(view.animation ?? []).filter((clip) => !clip.classicOnly).map((clip) => hash(clip.enhancedFrame))]);
}

// ---- The title ------------------------------------------------------------------------------
const title = await startGame({ seconds: 600, env: {
  POR_BOOT_KEYS: "", POR_LIVE_AT: "33000000", POR_FIXED_CLOCK_START: "8639000", POR_FRAME_PIXELS: "1",
} });
try {
  recordEnhanced(enhanced.title, title.frame);
  // The game flashes once its loop has made some 33,000 passes; the runner asks at a poll every
  // million instructions, so the flash comes with one of the first few frames.
  const flashed = [];
  for (let polls = 0; polls < 8; polls++) {
    if (!await title.send(":travel-poll")) title.fail("The runner refused to go on at the title.");
    recordEnhanced(enhanced.title, title.frame);
    if (title.frame.scene !== "scene:title") title.fail("The replay left the title.");
    if (classic && title.frame.animation?.some((clip) => clip.classicOnly)) flashed.push(title.frame);
  }
  if (classic && !flashed.length) {
    failures.push(`In 8 frames of the title no Classic picture held the flash: the original holds register 1 at ` +
      `${flash.holds.map(({ registers, ms }) => `${registers[1].toString(16)}h for ${ms} ms`).join(", ")}.`);
    checkClassic(title.frame, modeDefaults, "The title");
  }
  for (const [frame, view] of flashed.entries()) {
    // One flash or several, one after another: a flash ends on the colour the next begins on, which is
    // then held for both pauses.
    const clips = view.animation.filter((clip) => clip.classicOnly);
    const flashes = (clips.length - 1) / 4;
    assert.ok(Number.isInteger(flashes) && flashes >= 1, `The flash was held in ${clips.length} pictures, not 4n + 1 for n flashes.`);
    const expected = [];
    for (let time = 0; time < flashes; time++) {
      for (const hold of flash.holds) {
        const last = expected.at(-1);
        if (last && last.registers.join() === hold.registers.join()) last.ms += hold.ms;
        else expected.push({ registers: hold.registers, ms: hold.ms });
      }
    }
    clips.forEach((clip, index) => {
      const what = `The title's flash ${frame + 1}, picture ${index + 1} of ${clips.length}`;
      if (clip.durationMs !== expected[index].ms) failures.push(`${what} is held ${clip.durationMs} ms; the original holds it ${expected[index].ms} ms.`);
      const { counts } = checkClassic(clip, expected[index].registers, what);
      assert.ok((counts.get(1) ?? 0) > 0, `${what} has no pixel of value 1, the one that flashes.`);
    });
    checkClassic(view, flash.after, `The title after flash ${frame + 1}`);
    console.log(`Title: ${flashes} flash${flashes === 1 ? "" : "es"} held in ${clips.length} Classic pictures ` +
      `(${expected.map(({ registers, ms }) => `${registers[1].toString(16)}h ${ms} ms`).join(", ")}).`);
  }
} finally {
  title.close();
}

// ---- A fight --------------------------------------------------------------------------------
const exploring = /Area Cast View Encamp Search Look\s*$/;
const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
const pressReturn = /Press <enter>\/<return> to continue\s*$/i;
const game = await startGame({ seconds: 900, env: { POR_FRAME_PIXELS: "1" } });
try {
  await addReadyMadeParty(game);
  await beginAdventuring(game);
  recordEnhanced(enhanced.fight, game.frame);
  if (classic) checkClassic(game.frame, modeDefaults, "New Phlan before any fight");
  // West into the Slums and on the way to the orcs (tools/acceptance/slums.mjs), until a fight begins.
  await game.face("W");
  for (const heading of "WWSSSWNNNNNENW") {
    if (game.inFight()) break;
    await game.face(heading);
    await game.press("up");
    for (let bashes = 0; /Locked\. Bash Pick Exit\s*$/.test(game.menu()); bashes++) {
      if (bashes >= 12) game.fail("Twelve tries did not open the locked door.");
      await game.press("b");
    }
    for (let presses = 0; pressReturn.test(game.menu()) && !game.inFight(); presses++) {
      if (presses >= 4) game.fail("The game kept asking for return.");
      await game.press("enter");
    }
    if (encounterMenu.test(game.menu())) await game.startFight("c");
    recordEnhanced(enhanced.fight, game.frame);
  }
  if (!game.inFight()) game.fail("The walk into the Slums met no fight.");
  if (classic) {
    const { counts, right } = checkClassic(game.frame, battle, "The fight's first frame");
    assert.ok((counts.get(0) ?? 0) > 0 && (counts.get(8) ?? 0) > 0, "The fight's first frame has pixels of both swapped values, 0 and 8.");
    console.log(`Fight: ${counts.get(0)} pixels of value 0, which the original shows dark grey, and ${counts.get(8)} of value 8, ` +
      `which it shows black: Classic ${right ? "shows them so" : "does not"}.`);
  }
  let fightFrames = 0, rightFrames = 0;
  for (let frames = 0; !game.fightEnded(); frames++) {
    if (frames >= 400) game.fail("The fight did not end.");
    await game.press(game.fighting() ? "q" : "n");
    recordEnhanced(enhanced.fight, game.frame);
    if (classic && !game.fightEnded()) {
      fightFrames++;
      if (checkClassic(game.frame, battle, `The fight, frame ${frames + 1}`).right) rightFrames++;
    }
  }
  if (classic) console.log(`Fight: ${rightFrames} of ${fightFrames} later frames of the fight in the original's colours.`);
  if (game.fightEnded() !== "won") game.fail("The ready-made party lost its first fight.");
  for (let presses = 0; !exploring.test(game.menu()); presses++) {
    if (presses >= 12) game.fail("The end of the fight did not lead back to the exploration menu.");
    await game.press(/View (?:Take )?Pool (?:Share )?Exit\s*$|^(?:Take: (?:Money )?(?:Items )?Exit|Items: Take Exit)$/.test(game.menu()) ? "e"
      : /claim your treasure\? Yes No\s*$/.test(game.text()) ? "n" : "enter");
    recordEnhanced(enhanced.fight, game.frame);
  }
  if (classic) {
    const { right } = checkClassic(game.frame, restored, "The walk after the fight");
    console.log(`After the fight: ${right ? "every pixel in the colours of the BIOS's mode 0Dh palette again" : "not in the original's colours"}.`);
  }
} finally {
  game.close();
}

writeFileSync(join(directory, `${source}.json`), JSON.stringify(enhanced) + "\n");
const count = (list) => list.flat().length;
console.log(`Enhanced: ${count(enhanced.title)} title and ${count(enhanced.fight)} fight pictures recorded in ${join(directory, `${source}.json`)}.`);
if (process.env.POR_PALETTE_BASELINE) {
  const baseline = JSON.parse(readFileSync(process.env.POR_PALETTE_BASELINE, "utf8"));
  for (const part of ["title", "fight"]) {
    const here = enhanced[part].flat(), there = baseline[part].flat();
    const same = here.filter((picture, index) => picture === there[index]).length;
    const message = `Enhanced ${part}: ${same} of ${here.length} pictures are the baseline's (${there.length} there, frame by frame ` +
      `${JSON.stringify(enhanced[part]) === JSON.stringify(baseline[part]) ? "the same" : "not the same"}).`;
    if (same === here.length && JSON.stringify(enhanced[part]) === JSON.stringify(baseline[part])) console.log(message);
    else failures.push(message);
  }
}
if (failures.length) {
  console.log(`\n${failures.length} failure${failures.length === 1 ? "" : "s"}:\n${failures.join("\n")}`);
  process.exitCode = 1;
}
