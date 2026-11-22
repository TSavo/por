/**
 * Prove that the port's own game data under `game/` stands in for the version 1.3 files.
 *
 *   npm run verify:game-data
 *
 * It needs the 1.3 files (POR_GAMEDATA_1_3, else POR_GAMEDATA, else ../por-assets/gog-1.3/POOLRAD)
 * and the translator's Python (POR_PYTHON, else `python`).
 *
 * 1. game/ is exactly what tools/build-game-data.ts writes from those files.
 * 2. No instruction: every byte the translator lists as an instruction is zero in the memory
 *    image and in the overlay file built from game/, and every other byte is the original's,
 *    apart from the unreached library code the converter names. Prints how many bytes remain.
 * 3. Equivalence: one play, run from the 1.3 files and again from game/, must show the same text
 *    on every frame, print the same texts, draw the same dice and write the same saved game.
 *    The play: the six ready-made characters, Begin Adventuring and Rolf's tour of New Phlan
 *    (the opening of tools/acceptance/new-phlan.mjs), west into the Slums and the walk to the
 *    orcs' room with every random encounter fought (the route of tools/acceptance/slums.mjs),
 *    the set fight with the four orcs played by Quick, then Encamp and Save to slot A.
 * 4. The comparison is shown to fail: the same play from a copy of game/ in which one byte of
 *    one record, the first ready-made character's name, is changed.
 */
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadExecutable } from "../src/lib/exepack.js";
import { loadPortGame, type ContentFile } from "../src/runtime/game-data.js";
import { buildGameData, compareGameData, gameDataDirectory, instructionMap, repository, UNREACHED_CODE, type InstructionMap } from "./build-game-data.js";

const original = resolve(process.env.POR_GAMEDATA_1_3 ?? process.env.POR_GAMEDATA ?? join(repository, "..", "por-assets", "gog-1.3", "POOLRAD"));
if (!existsSync(join(original, "START.EXE"))) throw new Error(`The version 1.3 files were not found in ${original}. Set POR_GAMEDATA_1_3.`);
const failures: string[] = [];
const fail = (message: string) => { failures.push(message); console.error(`FAIL ${message}`); };
const step = (message: string) => console.log(`[${new Date().toISOString().slice(11, 19)}] ${message}`);

// 1. The committed files are the converter's output.
step("1/4 converting the 1.3 files and comparing with game/ (the translator lists its instructions: about a minute)");
const map = instructionMap(original);
const built = buildGameData(original, map);
const differences = compareGameData(built.files);
if (differences.length) fail(`game/ differs from what the converter writes: ${differences.join("; ")}`);
else console.log(`  game/ matches the converter (${built.files.size} files)`);

// 2. No instruction byte, and nothing else changed.
step("2/4 checking that game/ holds no instruction byte");
function checkBlank(label: string, held: Uint8Array, source: Uint8Array, procedures: InstructionMap["units"][string], offset = 0,
  length = source.length, alsoBlank: [number, number][] = []): { instructions: number; kept: number } {
  const instruction = new Uint8Array(length), blank = new Uint8Array(length);
  for (const { ranges } of procedures) for (const [start, end] of ranges) instruction.fill(1, start, end);
  for (const [start, bytes] of alsoBlank) blank.fill(1, start, start + bytes);
  let instructions = 0, kept = 0, leaked = 0, changed = 0;
  for (let at = 0; at < length; at++) {
    const byte = held[offset + at]!;
    if (instruction[at]) { instructions++; if (byte) leaked++; }
    else if (blank[at]) { if (byte) leaked++; }
    else { if (byte !== source[offset + at]) changed++; if (byte) kept++; }
  }
  if (leaked) fail(`${label}: ${leaked} bytes of instructions are not blank in game/`);
  if (changed) fail(`${label}: ${changed} bytes that are not instructions differ from the original`);
  return { instructions, kept };
}
const port = loadPortGame((path) => new Uint8Array(readFileSync(join(gameDataDirectory, path))));
const exe = loadExecutable(new Uint8Array(readFileSync(join(original, "START.EXE"))));
const overlaySource = new Uint8Array(readFileSync(join(original, "GAME.OVR")));
const overlayHeld = port.files.find(({ name }) => name === "GAME.OVR")!.data;
if (port.program.image.length !== exe.image.length) fail("The memory image has a different size");
if (overlayHeld.length !== overlaySource.length) fail("The overlay file has a different size");
// The image is compared as the runner gets it, with the overlay table written back from program.json.
const image = checkBlank("memory image", port.program.image, exe.image, map.units.exe ?? [], 0, exe.image.length, UNREACHED_CODE);
let overlayInstructions = 0, overlayKept = 0;
for (const overlay of port.data.program.overlays) {
  const result = checkBlank(`overlay ${overlay.index}`, overlayHeld, overlaySource,
    map.units[`ovl${String(overlay.index).padStart(2, "0")}`] ?? [], overlay.fileOffset, overlay.codeBytes);
  overlayInstructions += result.instructions;
  overlayKept += result.kept;
}
const unreached = UNREACHED_CODE.reduce((sum, [, bytes]) => sum + bytes, 0);
console.log(`  memory image: ${exe.image.length} bytes; ${image.instructions} instruction bytes blank, ${unreached} bytes of unreached library code blank, ${image.kept} non-zero bytes remain (data segment, text, tables, overlay table)`);
console.log(`  overlays: ${port.data.program.overlays.reduce((sum, { codeBytes }) => sum + codeBytes, 0)} bytes; ${overlayInstructions} instruction bytes blank, ${overlayKept} non-zero bytes remain (text and constants)`);
for (const [name, value] of Object.entries(built.measured)) console.log(`  ${name}: ${value}`);

// 3 and 4. The same play from each source.
interface Play { frames: string[]; printed: string[]; dice: string[]; saves: Record<string, string>; stopped?: string }
const harnessModule = "./acceptance/harness.mjs";
const harness = await import(harnessModule);
const encounterMenu = /Combat Wait Flee (?:Advance|Parlay)\s*$/;
const treasureMenu = /View Take Pool Share Exit\s*$/;

async function play(label: string, env: Record<string, string>): Promise<Play> {
  const record: Play = { frames: [], printed: [], dice: [], saves: {} };
  const game = await harness.startGame({ seconds: 900, env: { ...env, POR_CLOCK: "fixed", POR_TRACE_DICE: "1" } });
  // Every frame the runner sends is recorded, whoever asked for it.
  const send = game.send;
  const note = () => record.frames.push(JSON.stringify(game.frame.text));
  note();
  game.send = async (command: string | undefined) => {
    const before = game.frame;
    const answered = await send(command);
    if (game.frame !== before) note();
    return answered;
  };
  const leaveFight = async () => {
    for (let presses = 0; !harness.exploring.test(game.menu()); presses++) {
      if (presses >= 12) game.fail("The end of the fight did not lead back to the exploration menu.");
      if (treasureMenu.test(game.menu())) await game.press("e");
      else if (/^(?:Take: (?:Money )?(?:Items )?Exit|Items: Take Exit)$/.test(game.menu())) await game.press("e");
      else if (/claim your treasure\? Yes No\s*$/.test(game.text())) await game.press("n");
      else if (/press <enter>\/<return> to continue\s*$/i.test(game.menu()) || /PRESS <RETURN> OR BUTTON TO CONTINUE\s*$/.test(game.menu())) await game.press("enter");
      else game.fail("After the fight the game shows something this check does not know.");
    }
  };
  try {
    await harness.addReadyMadeParty(game);
    await harness.beginAdventuring(game);
    console.log(`  ${label}: opening done, ${record.frames.length} frames`);
    await game.face("W");
    await game.press("up");
    let fights = 0;
    for (const heading of "WSSSWNNNNNEN") {
      for (let tries = 0; ; tries++) {
        if (tries >= 4) game.fail(`Four tries did not take the party one step ${heading}.`);
        await game.face(heading);
        const from = game.here();
        await game.press("up");
        for (let screens = 0; harness.pressReturn.test(game.menu()) && /YOU ARE SURPRISED BY/.test(game.text()); screens++) {
          if (screens >= 3) game.fail("The surprise did not lead to a fight.");
          await game.press("enter");
        }
        if (encounterMenu.test(game.menu())) await game.startFight("c");
        if (game.inFight()) { await game.win(); await leaveFight(); fights++; }
        const to = game.here();
        if (to && (to.x !== from.x || to.y !== from.y)) break;
      }
    }
    console.log(`  ${label}: walked to the orcs' room with ${fights} random fights, ${record.frames.length} frames`);
    await game.face("W");
    await game.press("up");
    await game.startFight("enter");
    const { outcome, xp } = await game.fight();
    await game.press("enter");
    if (outcome === "won") await leaveFight();
    console.log(`  ${label}: the orcs' fight was ${outcome}${xp === undefined ? "" : `, ${xp} experience each`}, ${record.frames.length} frames`);
    if (outcome === "won") {
      await game.press("e", /Camp: Save View Magic Rest Alter Exit/, "E opens the Camp menu.");
      await game.press("s", /Save Which Game: A B C D E F G H I J/, "S opens the save menu.");
      await game.press("a", /Quit TO DOS Yes No/, "A saves to slot A.");
      await game.press("n", /Camp: Save View Magic Rest Alter Exit/, "N returns to the Camp menu.");
    }
  } catch (error) {
    record.stopped = error instanceof Error ? error.message.split("\n")[0]! : String(error);
    console.log(`  ${label}: the play stopped: ${record.stopped}`);
  }
  record.printed = [...game.printed];
  record.dice = (await game.dice() as { caller: string; range: number; value?: number }[])
    .map(({ caller, range, value }) => `${caller} range ${range} value ${value}`);
  for (const name of readdirSync(game.saves).sort()) record.saves[name] = readFileSync(join(game.saves, name), "base64");
  game.close();
  console.log(`  ${label}: ${record.frames.length} frames, ${record.printed.length} printed texts, ${record.dice.length} dice, ${Object.keys(record.saves).length} saved files`);
  return record;
}

/** Where two saved slot files differ: which field, and for the game's bytes, how many and where. */
function describeSave(a?: string, b?: string): string {
  if (!a || !b) return " (present in one play only)";
  try {
    const x = JSON.parse(Buffer.from(a, "base64").toString("utf8")) as Record<string, unknown>;
    const y = JSON.parse(Buffer.from(b, "base64").toString("utf8")) as Record<string, unknown>;
    const bytes = (p: unknown, q: unknown): string => {
      const m = Buffer.from(String(p), "base64"), n = Buffer.from(String(q), "base64");
      const at: number[] = [];
      for (let i = 0; i < Math.max(m.length, n.length); i++) if (m[i] !== n[i]) at.push(i);
      return `${at.length} of ${m.length} bytes, at ${at.slice(0, 12).map((i) => `${i.toString(16)}:${m[i]?.toString(16)}/${n[i]?.toString(16)}`).join(" ")}`;
    };
    const parts: string[] = [];
    for (const field of new Set([...Object.keys(x), ...Object.keys(y)])) {
      if (JSON.stringify(x[field]) === JSON.stringify(y[field])) continue;
      if (field === "data") parts.push(`data: ${bytes(x.data, y.data)}`);
      else if (field === "party") {
        const p = x.party as Record<string, string> | undefined, q = y.party as Record<string, string> | undefined;
        for (const file of new Set([...Object.keys(p ?? {}), ...Object.keys(q ?? {})])) if (p?.[file] !== q?.[file]) parts.push(`party ${file}: ${bytes(p?.[file], q?.[file])}`);
      } else parts.push(field);
    }
    return ` (${parts.join("; ")})`;
  } catch {
    return "";
  }
}

/** What differs between two plays. Empty when they are the same. */
function compare(a: Play, b: Play): string[] {
  const found: string[] = [];
  const first = (x: string[], y: string[]) => x.findIndex((value, index) => value !== y[index]);
  for (const key of ["frames", "printed", "dice"] as const) {
    const at = a[key].length === b[key].length ? first(a[key], b[key]) : Math.min(a[key].length, b[key].length);
    if (a[key].length !== b[key].length) found.push(`${key}: ${a[key].length} against ${b[key].length}`);
    else if (at >= 0) found.push(`${key}: first difference at number ${at + 1} of ${a[key].length}`);
  }
  const names = new Set([...Object.keys(a.saves), ...Object.keys(b.saves)]);
  for (const name of names) if (a.saves[name] !== b.saves[name]) found.push(`saved file ${name} differs${describeSave(a.saves[name], b.saves[name])}`);
  if (a.stopped !== b.stopped) found.push(`one play stopped: ${a.stopped ?? b.stopped}`);
  return found;
}

step("3/4 playing from the 1.3 files");
const fromOriginal = await play("1.3 files", { POR_GAMEDATA: original, POR_GAME_SOURCE: "original" });
step("3/4 playing from game/");
const fromPort = await play("game/", { POR_GAMEDATA: "", POR_GAME_SOURCE: "port" });
if (fromOriginal.stopped) fail(`The play from the 1.3 files did not finish: ${fromOriginal.stopped}`);
if (!Object.keys(fromOriginal.saves).length) fail("The play from the 1.3 files wrote no saved game");
const equivalence = compare(fromOriginal, fromPort);
if (equivalence.length) fail(`The play from game/ differs from the play from the 1.3 files: ${equivalence.join("; ")}`);
else console.log(`  the same: ${fromPort.frames.length} frames of text, ${fromPort.printed.length} printed texts, ${fromPort.dice.length} dice, ${Object.keys(fromPort.saves).length} saved files`);

step("4/4 showing the comparison fail on a copy of game/ with one record changed");
const copy = mkdtempSync(join(tmpdir(), "por-game-data-"));
try {
  cpSync(gameDataDirectory, copy, { recursive: true });
  const path = join(copy, "content", "characters.json");
  const characters = JSON.parse(readFileSync(path, "utf8")) as ContentFile;
  const first = characters.records.find(({ file }) => file === "CHRDATA1.SAV");
  if (!first?.rows) throw new Error("The first ready-made character is not in game/content/characters.json");
  // The second byte of the record is the first letter of the character's name.
  const letter = Number.parseInt(first.rows[0]!.slice(2, 4), 16);
  first.rows[0] = first.rows[0]!.slice(0, 2) + (letter === 0x5a ? 0x41 : letter + 1).toString(16) + first.rows[0]!.slice(4);
  writeFileSync(path, JSON.stringify(characters));
  const fromChanged = await play("changed copy", { POR_GAMEDATA: copy, POR_GAME_SOURCE: "port" });
  const red = compare(fromOriginal, fromChanged);
  if (!red.length) fail("The comparison did not notice a changed record: it proves nothing");
  else console.log(`  the comparison fails, as it must: ${red.join("; ")}`);
} finally {
  rmSync(copy, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\nverify:game-data failed:\n${failures.map((failure) => `  ${failure}`).join("\n")}`);
  process.exit(1);
}
console.log("\nverified: game/ is the converter's output, holds no instruction byte, and plays the same game as the 1.3 files");
