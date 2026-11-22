import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { delimiter, dirname, join, resolve } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { detectGameVersion } from "../src/runtime/bindings.js";
import { buildExplorationMaterials } from "./exploration-materials.js";
import { loadUpgradeArt } from "./upgrade-art.js";
import type { NativeExploration } from "./native-exploration.js";

// How far the port is from running with no original file, measured.
//
//   npm run qa:standalone
//
// The release shape (ROADMAP.md): the shipped game is version 1.3, it runs in Enhanced with no file
// from the player, and everything it needs besides the original pictures is converted from the 1.3
// files into the port's own data. This report counts what stands between today and that, part by
// part, and fails while anything is left. docs/STANDALONE.md says how to read it.
//
// Every number comes from the files or from playing the game now. The report plays the game itself
// (about a quarter of an hour) with POR_TRACE_STANDALONE set, which makes the runner record every
// file read, every byte of the program it reads as data, and what each Enhanced frame is made of.
//
//   npm run qa:standalone -- --trace DIR   read an earlier run's trace instead of playing
//   npm run qa:standalone -- --skip-play   the parts measured from files only; the others say "not measured"
//   npm run qa:standalone -- --list        also list every file, block, picture and byte range behind the counts
//
// It needs POR_GAMEDATA pointing at version 1.3 (default ../por-assets/gog-1.3/POOLRAD), POR_PYTHON
// with capstone for the translator, and POR_CHROME for the campaign opening.

const root = resolve(process.env.POR_GAMEDATA_1_3 ?? process.env.POR_GAMEDATA ?? "../por-assets/gog-1.3/POOLRAD");
if (!existsSync(join(root, "GAME.OVR"))) throw new Error(`Version 1.3 was not found at ${root}`);
const bytesOf = (name: string) => new Uint8Array(readFileSync(join(root, name)));
if (detectGameVersion(bytesOf("GAME.OVR")) !== "1.3") throw new Error(`${root} is not version 1.3. The shipped game is 1.3.`);
const option = (name: string) => process.argv.includes(name);
const optionValue = (name: string) => process.argv.includes(name) ? process.argv[process.argv.indexOf(name) + 1] : undefined;
const list = option("--list");
const output = resolve("out", "qa-standalone");
mkdirSync(output, { recursive: true });
const python = process.env.POR_PYTHON ?? (process.platform === "win32" ? "python" : "python3");
const chrome = process.env.POR_CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const audio = process.env.POR_AUDIO_DIR ?? resolve("..", "por-assets", "original");
const progress = (text: string) => process.stderr.write(text);
const count = (n: number) => n.toLocaleString("en-US");

type Row = [part: string, done: number | undefined, total: number | undefined, note: string];
const rows: Row[] = [];
const details: string[] = [];
const unmeasured: string[] = [];

// ---------------------------------------------------------------------------------------------
// The play. One trace directory; every runner process the plays start writes into it.
// ---------------------------------------------------------------------------------------------
const artwork = loadUpgradeArt(undefined, root);
// Two kinds of play. The acceptance tests drive the runner over a pipe, with no server: they cover
// the files, the program bytes, the font and the sound. The server is what tells the runner which
// artwork exists, so only the plays that go through the server and Chrome say what Enhanced shows.
// (Handing the artwork list to the piped runners makes each take minutes to start, and the tests
// give a game 240 seconds.)
let openingDirectory: string | undefined;
const plays: { name: string; covers: string; command: () => string[]; needsChrome?: boolean }[] = [
  { name: "start-up", covers: "the program's start-up to the title screens, 30 million instructions, then the script loader on its own",
    command: () => [process.execPath, "--import", "tsx", "tools/boot-translated.ts"] },
  { name: "verify:input", covers: "the ready-made party added and the first steps into New Phlan (tools/verify-input.mjs)",
    command: () => ["npm", "run", "-s", "verify:input"] },
  { name: "acceptance:new-phlan", covers: "the New Phlan acceptance tests: Rolf's tour, City Hall and the clerk, the dock, the temples, the shops, the tavern, the city watch",
    command: () => ["npm", "run", "-s", "acceptance:new-phlan"] },
  { name: "acceptance:slums", covers: "the Slums acceptance tests: the entry from New Phlan, the fight with the orcs, the flee squares",
    command: () => ["npm", "run", "-s", "acceptance:slums"] },
  { name: "verify:campaign-opening", covers: "the campaign opening in Chrome through the real server and page: six characters created, trained, equipped and walked to the Slums gate",
    command: () => ["npm", "run", "-s", "verify:campaign-opening", "--", chrome], needsChrome: true },
  { name: "verify:map-journal", covers: "from that opening's save, in Chrome: the Slums gate, the map, the journal, a camp, and both display modes",
    command: () => ["npm", "run", "-s", "verify:map-journal", "--", chrome, openingDirectory ?? "missing"], needsChrome: true },
];
let traceDirectory = optionValue("--trace");
const played: { name: string; covers: string; result: string; seconds: number }[] = [];
if (!traceDirectory && !option("--skip-play")) {
  traceDirectory = join(output, "trace");
  rmSync(traceDirectory, { recursive: true, force: true });
  mkdirSync(traceDirectory, { recursive: true });
  const npmEntry = process.platform === "win32" ? process.env.npm_execpath ??
    join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js") : undefined;
  const environment = { ...process.env, POR_GAMEDATA: root, POR_AUDIO_DIR: audio,
    POR_CAMPAIGN_OUTPUT_DIR: output, POR_TRACE_STANDALONE: traceDirectory,
    PATH: dirname(python) !== "." ? `${dirname(python)}${delimiter}${process.env.PATH ?? ""}` : process.env.PATH };
  for (const [index, play] of plays.entries()) {
    if (play.needsChrome && !existsSync(chrome)) {
      played.push({ name: play.name, covers: play.covers, result: "not run: Chrome not found (POR_CHROME)", seconds: 0 });
      continue;
    }
    const started = Date.now();
    progress(`play ${index + 1}/${plays.length}: ${play.name} ... `);
    const [program, ...parameters] = play.command();
    const command = program === "npm" && npmEntry ? [process.execPath, npmEntry, ...parameters] : [program!, ...parameters];
    const run = spawnSync(command[0]!, command.slice(1), { encoding: "utf8", env: environment, maxBuffer: 256 * 1024 * 1024 });
    const log = join(output, `${play.name.replace(/[^a-z0-9.]+/gi, "-")}.log`);
    writeFileSync(log, `${run.stdout ?? ""}\n${run.stderr ?? ""}${run.error ? `\n${run.error.message}\n` : ""}`);
    // The start-up run ends by reporting where its instruction budget ran out. That is its normal end.
    const result = run.status === 0 ? "ran to its end" : `stopped early, exit ${run.status} (${log})`;
    if (play.name === "verify:campaign-opening") openingDirectory = /campaign opening complete: (.+)$/m.exec(run.stdout ?? "")?.[1]?.trim();
    const seconds = Math.round((Date.now() - started) / 1000);
    played.push({ name: play.name, covers: play.covers, result, seconds });
    progress(`${result} in ${seconds} s\n`);
  }
  writeFileSync(join(traceDirectory, "plays.json"), JSON.stringify(played, null, 2) + "\n");
} else if (traceDirectory && existsSync(join(traceDirectory, "plays.json"))) {
  played.push(...JSON.parse(readFileSync(join(traceDirectory, "plays.json"), "utf8")) as typeof played);
}
const traceFiles = (suffix: string) => traceDirectory && existsSync(traceDirectory)
  ? readdirSync(traceDirectory).filter(name => name.endsWith(suffix)).map(name => join(traceDirectory!, name)) : [];
const traced = traceFiles(".files.json").length > 0;
const playNote = traced ? `in the traced play (${traceFiles(".memory.json").length} runner processes)` : "not measured: no traced play";

// ---------------------------------------------------------------------------------------------
// Part 1. The original files the game opens.
// ---------------------------------------------------------------------------------------------
// The format of every DAX block comes from the art inventory, which decodes each block the way the
// game's loaders do. It also counts the artwork linked to each original picture frame.
progress("art inventory ... ");
const inventoryDirectory = join(output, "art-inventory");
const inventoryRun = spawnSync(process.execPath, ["--import", "tsx", "tools/art-inventory.ts", root, inventoryDirectory],
  { encoding: "utf8", env: { ...process.env, POR_GAMEDATA: root }, maxBuffer: 256 * 1024 * 1024 });
if (inventoryRun.status !== 0) throw new Error(`tools/art-inventory.ts failed:\n${inventoryRun.stderr}`);
progress("done\n");
const inventory = JSON.parse(readFileSync(join(inventoryDirectory, "inventory.json"), "utf8")) as {
  archives: { file: string; category: string; entries: { id: number; format: string }[] }[];
  encounterTotals: { frames: number; remaining: number };
  encounterFamilies: { label: string; frames: number; unlinked: number }[];
  encounterCoverage: { file: string; unlinkedFrames: unknown[] }[];
};
const pictureFormats = new Set(["picture", "EGA font"]);
type FileClass = "picture" | "content" | "program" | "unclassified";
interface GameFile { name: string; bytes: number; kind: FileClass; what: string; evidence: string;
  blocks?: { id: number; start: number; end: number }[] }
const families: [RegExp, FileClass, string, string][] = [
  [/^(START\.EXE|GAME\.OVR)$/, "program", "the program",
    "MZ executable and its FBOV overlay file; loaded by src/runtime/overlay.ts, replaced instruction for instruction by src/translated-1.3"],
  [/^ECL\d\.DAX$/, "content", "scripts", "ECL script blocks; the game's script interpreter loads and runs them"],
  [/^GEO\d\.DAX$/, "content", "maps", "map blocks of wall and event bytes per square; the game loads one per area"],
  [/^WALLDEF\d\.DAX$/, "content", "wall definitions", "tables of tile numbers that compose each wall face from the 8X8D tiles; no pixels"],
  [/^MON\d(CHA|ITM|SPC)\.DAX$/, "content", "monsters", "monster character records, their items and special abilities, in the saved-character layout"],
  [/^ITEM\d\.DAX$/, "content", "items", "item records the scripts hand out"],
  [/^ITEMS$/, "content", "item table", "the item name and property table; not a DAX archive"],
  [/^(DUNGCOM|WILDCOM)\.DAX$/, "content", "battle maps", "the tile layout of each battlefield; tile numbers, no pixels"],
  [/^CHRDAT[A-Z]\d\.(SAV|ITM|SPC)$/, "content", "ready-made characters", "character records with their items and abilities, in the saved-character layout"],
  [/^SAVGAM[A-Z]\.DAT$/, "content", "saved-game templates", "saved games shipped with the release, in the game's own save layout"],
  [/^POOL\.CFG$/, "content", "configuration", "four text lines: sound, display, data path, save path"],
];
const formatsByFile = new Map(inventory.archives.map(({ file, entries }) => [file.toUpperCase(), entries.map(({ format }) => format)]));
const gameFiles: GameFile[] = readdirSync(root).filter(name => statSync(join(root, name)).isFile() && !name.startsWith(".")).sort()
  .map((file): GameFile => {
    const name = file.toUpperCase(), data = bytesOf(file);
    const formats = formatsByFile.get(name);
    let blocks: GameFile["blocks"];
    if (name.endsWith(".DAX")) {
      const base = 2 + new DataView(data.buffer, data.byteOffset).getUint16(0, true);
      blocks = parseDax(name, data).entries.map(({ id, offset, compSize }) => ({ id, start: base + offset, end: base + offset + compSize }));
    }
    const family = families.find(([pattern]) => pattern.test(name));
    const tally = formats && [...new Set(formats)].map(format => `${formats.filter(other => other === format).length} ${format}`).join(", ");
    if (formats?.length && formats.every(format => pictureFormats.has(format))) {
      return { name, bytes: data.length, kind: "picture", what: "pictures", blocks,
        evidence: `every block decodes as picture data (${tally})` };
    }
    if (family) {
      // A file the name calls content must not hold blocks that decode as pictures, and the other way round.
      const mixed = formats?.some(format => pictureFormats.has(format));
      return { name, bytes: data.length, kind: mixed ? "unclassified" : family[1], what: family[2], blocks,
        evidence: `${family[3]}${tally ? ` (blocks: ${tally})` : ""}${mixed ? "; but some blocks decode as pictures" : ""}` };
    }
    return { name, bytes: data.length, kind: "unclassified", what: "unknown", blocks, evidence: tally ? `blocks: ${tally}` : "no rule matches this name" };
  });
// What the traced play read of each file.
interface FileTrace { opens: number; misses: number; creates: number; reads: number; bytesRead: number; writes: number; read: [number, number][] }
const fileReads = new Map<string, { opens: number; reads: number; seen: Uint8Array; writes: number; misses: number }>();
for (const path of traceFiles(".files.json")) {
  for (const [name, entry] of Object.entries(JSON.parse(readFileSync(path, "utf8")) as Record<string, FileTrace>)) {
    let total = fileReads.get(name);
    if (!total) fileReads.set(name, total = { opens: 0, reads: 0, seen: new Uint8Array(0), writes: 0, misses: 0 });
    total.opens += entry.opens;
    total.reads += entry.reads;
    total.writes += entry.writes + entry.creates;
    total.misses += entry.misses;
    for (const [start, end] of entry.read) {
      if (end > total.seen.length) { const grown = new Uint8Array(end); grown.set(total.seen); total.seen = grown; }
      total.seen.fill(1, start, end);
    }
  }
}
const seenBytes = (name: string, start = 0, end = Infinity) => {
  const seen = fileReads.get(name)?.seen;
  let total = 0;
  if (seen) for (let at = start; at < Math.min(end, seen.length); at++) total += seen[at]!;
  return total;
};
const ofClass = (kind: FileClass) => gameFiles.filter(file => file.kind === kind);
const sum = (files: GameFile[]) => files.reduce((total, { bytes }) => total + bytes, 0);
const content = ofClass("content"), pictures = ofClass("picture"), program = ofClass("program"), unknown = ofClass("unclassified");
const openedContent = content.filter(({ name }) => (fileReads.get(name)?.reads ?? 0) > 0);
rows.push(["1. Content files converted to the port's own data", 0, content.length + unknown.length,
  `${count(sum(content) + sum(unknown))} bytes of scripts, maps, wall definitions, monsters, items, characters, saves and configuration; ` +
  `none is converted. ${traced ? `The traced play read ${openedContent.length} of them` : playNote}`]);
details.push(`Part 1. The ${gameFiles.length} files of version 1.3 (${count(sum(gameFiles))} bytes), by what they hold:`,
  ...([["picture", pictures], ["content", content], ["program", program], ["unclassified", unknown]] as const).map(([kind, files]) => {
    const read = files.filter(({ name }) => (fileReads.get(name)?.reads ?? 0) > 0);
    const blocks = files.flatMap(file => (file.blocks ?? []).map(block => ({ file, block })));
    const blocksRead = blocks.filter(({ file, block }) => seenBytes(file.name, block.start, block.end) > 0).length;
    return `  ${kind.padEnd(12)} ${String(files.length).padStart(3)} files ${count(sum(files)).padStart(9)} bytes` +
      (traced ? `; the game read ${read.length} of them, ${count(read.reduce((total, { name }) => total + seenBytes(name), 0))} distinct bytes` +
        (blocks.length ? `, ${blocksRead} of ${blocks.length} blocks` : "") : "");
  }),
  ...[...new Set(content.map(({ what }) => what))].map(what => {
    const files = content.filter(file => file.what === what);
    return `    ${what.padEnd(22)} ${String(files.length).padStart(3)} files ${count(sum(files)).padStart(8)} bytes   ${files[0]!.evidence.replace(/ \(blocks:.*$/, "")}`;
  }));
if (traced) {
  const names = new Set(gameFiles.map(({ name }) => name));
  const others = [...fileReads].filter(([name]) => !names.has(name));
  details.push(`  The game also opened ${others.length} names that are not files of the release (its save directory, made by play): ` +
    `${others.filter(([, { opens }]) => opens).length} found, ${others.filter(([, { opens, writes }]) => !opens && !writes).length} looked for and missing.`);
}
if (list) {
  details.push("  Every file: class, bytes, what the traced play read, evidence.",
    ...gameFiles.map(file => {
      const blocksRead = (file.blocks ?? []).filter(block => seenBytes(file.name, block.start, block.end) > 0).map(({ id }) => id);
      return `    ${file.name.padEnd(13)} ${file.kind.padEnd(12)} ${String(file.bytes).padStart(6)}  read ${String(seenBytes(file.name)).padStart(6)} bytes` +
        `${file.blocks ? `, blocks ${blocksRead.length}/${file.blocks.length}${blocksRead.length ? ` (${blocksRead.join(" ")})` : ""}` : ""}  ${file.what}: ${file.evidence}`;
    }));
}

// Host code that opens the original files itself, without going through the game's DOS calls.
// Everything the runner and the server import is followed from their two entry points.
const reachable = new Set<string>();
const follow = (file: string) => {
  if (reachable.has(file) || !existsSync(file)) return;
  reachable.add(file);
  for (const [, target] of readFileSync(file, "utf8").matchAll(/from "(\.[^"]+)"/g)) {
    const path = join(dirname(file), target!);
    follow(path.replace(/\.js$/, ".ts"));
    follow(path);
  }
};
for (const entry of ["tools/boot-translated.ts", "tools/browser-play.ts"]) follow(entry);
// The three files that define the readers are left out; a module counts when it calls one.
const definitions = new Set(["tools/gamedata.ts", "src/lib/dax.ts", "src/lib/exepack.ts"]);
const directReaders = [...reachable].filter(file => !/^src\/translated/.test(file) && !definitions.has(file) &&
  /\b(?:parseDax|loadExecutable|readGameFile|findGameRoot|requireBrowserGameRoot)\(/.test(readFileSync(file, "utf8"))).sort();
rows.push(["1. Host modules that no longer open original files", 0, directReaders.length,
  `of the ${reachable.size} modules the runner and the server load, these parse the program or an archive from the game directory themselves, ` +
  "outside the game's DOS calls: " + directReaders.join(", ")]);

// ---------------------------------------------------------------------------------------------
// Part 2. Program bytes the game reads as data.
// ---------------------------------------------------------------------------------------------
progress("translator data map ... ");
const mapPath = join(output, "data-map.json");
rmSync(mapPath, { force: true });
const translator = spawnSync(python, ["tools/tp_translate.py", root, "--game-version", "1.3", "--output", join(output, "translated"),
  "--data-map", mapPath], { encoding: "utf8" });
progress(translator.status === 0 ? "done\n" : "failed\n");
interface DataMap { image: { bytes: number; dataSegment: number; instructions: [number, number][] }; overlayFileBytes: number;
  slices: { index: number; fileOffset: number; codeBytes: number; relocationBytes: number; stubImageOffset: number; stubEntries: number;
    instructions: [number, number][] }[] }
if (!existsSync(mapPath)) {
  unmeasured.push(`Part 2: the translator did not run (${(translator.error?.message ?? translator.stderr ?? "").trim().split("\n").at(-1)}). Set POR_PYTHON to a Python with capstone.`);
  rows.push(["2. Program bytes that are not instructions, converted", undefined, undefined, "not measured: the translator did not run"]);
} else {
  const map = JSON.parse(readFileSync(mapPath, "utf8")) as DataMap;
  const image = loadExecutable(bytesOf("START.EXE")).image;
  if (image.length !== map.image.bytes) throw new Error("The translator and the runner unpack START.EXE to different sizes");
  // One class per byte of the image: 1 instruction, 2 overlay stub table, 3 other resident bytes, 4 initialised data.
  const dataStart = map.image.dataSegment * 16;
  const imageClass = new Uint8Array(image.length).fill(3);
  imageClass.fill(4, dataStart);
  for (const { stubImageOffset, stubEntries } of map.slices) imageClass.fill(2, stubImageOffset, stubImageOffset + 32 + 5 * stubEntries);
  for (const [at, size] of map.image.instructions) imageClass.fill(1, at, at + size);
  const sliceClass = map.slices.map(({ codeBytes, instructions }) => {
    const bytes = new Uint8Array(codeBytes);
    for (const [at, size] of instructions) bytes.fill(1, at, at + size);
    return bytes;
  });
  const tally = (bytes: Uint8Array, value: number) => bytes.reduce((total, byte) => total + Number(byte === value), 0);
  const imageInstructions = tally(imageClass, 1), stubBytes = tally(imageClass, 2), residentOther = tally(imageClass, 3), dataBytes = tally(imageClass, 4);
  const sliceBytes = map.slices.reduce((total, { codeBytes }) => total + codeBytes, 0);
  const sliceInstructions = sliceClass.reduce((total, bytes) => total + tally(bytes, 1), 0);
  const notInstructions = image.length - imageInstructions + sliceBytes - sliceInstructions;

  // The traced reads. 3 marks a byte read before anything was written to it: its value came from the file.
  const memory = new Uint8Array(0x100000);
  let layout: { stackSegment: number; stackPointer: number; slices: { index: number; fileOffset: number; loadPara: number; codeBytes: number }[] } | undefined;
  for (const path of traceFiles(".memory.bin")) {
    const bytes = readFileSync(path);
    for (let at = 0; at < memory.length; at++) memory[at]! |= bytes[at]!;
    layout ??= JSON.parse(readFileSync(path.replace(/\.bin$/, ".json"), "utf8"));
  }
  let note = `image ${count(image.length)} bytes: ${count(imageInstructions)} instructions, ${count(stubBytes)} overlay call tables, ` +
    `${count(residentOther)} other resident bytes, ${count(dataBytes)} data segment. ` +
    `${map.slices.length} overlay slices ${count(sliceBytes)} bytes: ${count(sliceInstructions)} instructions, ${count(sliceBytes - sliceInstructions)} other`;
  if (layout) {
    const original = (at: number) => memory[at] === 3;
    const readOf = (value: number) => imageClass.reduce((total, byte, at) => total + Number(byte === value && original(at)), 0);
    const loaded = new Map(layout.slices.map(slice => [slice.fileOffset, slice]));
    let sliceRead = 0, sliceInstructionRead = 0;
    const instructionReads: string[] = [];
    for (const [index, slice] of map.slices.entries()) {
      const where = loaded.get(slice.fileOffset);
      if (!where) continue;
      for (let at = 0; at < slice.codeBytes; at++) {
        if (!original(where.loadPara * 16 + at)) continue;
        if (sliceClass[index]![at] === 1) { sliceInstructionRead++; instructionReads.push(`slice ${slice.index}+${at.toString(16)}`); }
        else sliceRead++;
      }
    }
    const imageInstructionRead = readOf(1);
    imageClass.forEach((byte, at) => { if (byte === 1 && original(at)) instructionReads.push(`image ${at.toString(16)}`); });
    const observed = readOf(2) + readOf(3) + readOf(4) + sliceRead;
    note += `. Read as data ${playNote}, with the value the file gave them: ${count(observed)} of these bytes ` +
      `(${count(readOf(2))} call tables, ${count(readOf(3))} other resident, ${count(readOf(4))} data segment, ${count(sliceRead)} in slices)`;
    rows.push(["2. Program bytes that are not instructions, converted", 0, notInstructions, note]);
    rows.push(["2. Bytes read as data that are not instructions", observed, observed + imageInstructionRead + sliceInstructionRead,
      `${count(imageInstructionRead)} image bytes and ${count(sliceInstructionRead)} slice bytes the translator emitted as instructions were also read as data ${playNote}`]);
    // Between the image and the stack lie the program's uninitialised variables. They start as zeros.
    let blank = 0;
    for (let at = image.length; at < layout.stackSegment * 16; at++) blank += Number(original(at));
    details.push(`Part 2. The stack (${(layout.stackSegment * 16).toString(16)} to ${(layout.stackSegment * 16 + layout.stackPointer).toString(16)}) and everything above it ` +
      `(heap, video) are left out. Between the image and the stack are ${count(layout.stackSegment * 16 - image.length)} bytes of variables no file fills; ` +
      `${count(blank)} were read before the game wrote them, and need only be zero.`,
      `  GAME.OVR is ${count(map.overlayFileBytes)} bytes: ${count(sliceBytes)} slice code, ` +
      `${count(map.slices.reduce((total, { relocationBytes }) => total + relocationBytes, 0))} relocation tables the port does not use, the rest headers.`);
    if (list && instructionReads.length) details.push(`  Instruction bytes read as data: ${instructionReads.join(" ")}`);
  } else {
    rows.push(["2. Program bytes that are not instructions, converted", 0, notInstructions, `${note}. Bytes read as data: ${playNote}`]);
    rows.push(["2. Bytes read as data that are not instructions", undefined, undefined, playNote]);
    unmeasured.push("Part 2: which program bytes the game reads as data needs the traced play.");
  }
}

// ---------------------------------------------------------------------------------------------
// Part 3. Places Enhanced shows an original picture.
// ---------------------------------------------------------------------------------------------
const linked = inventory.encounterTotals.frames - inventory.encounterTotals.remaining;
rows.push(["3. Original picture frames with artwork", linked, inventory.encounterTotals.frames,
  "every frame of the scene, encounter and combat picture archives (tools/art-inventory.ts): " +
  inventory.encounterFamilies.map(({ label, frames, unlinked }) => `${label} ${frames - unlinked}/${frames}`).join(", ")]);
interface Kind { frames: number; framesWithOriginalPixels: number; originalPixels: number; inPanel: number; elsewhere: number }
interface EnhancedTrace { artworkKnown: boolean; frames: number; kinds: Record<string, Kind>; scenes: Record<string, number>;
  pictureArt: Record<string, number>; pictureFallbacks: Record<string, number>; encounters: Record<string, number>;
  scenery: { frames: number; scenery: NativeExploration & { area: number } }[];
  glyphs: Record<string, { drawn: number; captured: number; black: number }>; sounds: Record<string, number> }
const everyRunner = traceFiles(".enhanced.json").map(path => JSON.parse(readFileSync(path, "utf8")) as EnhancedTrace);
// What Enhanced shows is counted only where the runner knew the artwork: the plays through the server.
const enhanced = everyRunner.filter(({ artworkKnown, frames }) => artworkKnown && frames);
const serverNote = `in the ${enhanced.length} runner processes the server started (the Chrome plays)`;
const merged = <T>(pick: (trace: EnhancedTrace) => Record<string, T>, add: (a: T, b: T) => T, from = enhanced) => {
  const total = new Map<string, T>();
  for (const trace of from) for (const [key, value] of Object.entries(pick(trace) ?? {})) total.set(key, total.has(key) ? add(total.get(key)!, value) : value);
  return total;
};
const plus = (a: number, b: number) => a + b;
const glyphs = merged(trace => trace.glyphs, (a, b) => ({ drawn: a.drawn + b.drawn, captured: a.captured + b.captured, black: a.black + b.black }), everyRunner);
const sounds = merged(trace => trace.sounds, plus, everyRunner);
if (!enhanced.length) {
  for (const part of ["3. Scenes shown in play with artwork", "3. Pictures shown in play with artwork", "3. Wall textures shown in play with artwork",
    "3. Enhanced frames in play with no original pixel"]) rows.push([part, undefined, undefined, "not measured: no traced play went through the server"]);
  unmeasured.push("Part 3: how often Enhanced fell back to an original picture needs a traced play through the server and Chrome (POR_CHROME).");
} else {
  const scenes = merged(trace => trace.scenes, plus);
  const scenesWithArt = [...scenes.keys()].filter(scene => artwork.has(scene));
  rows.push(["3. Scenes shown in play with artwork", scenesWithArt.length, scenes.size,
    `title screens shown ${serverNote}: ${[...scenes.keys()].map(scene => `${scene}${artwork.has(scene) ? "" : " (original)"}`).join(", ") || "none"}`]);
  const pictureArt = merged(trace => trace.pictureArt, plus), fallbacks = merged(trace => trace.pictureFallbacks, plus);
  rows.push(["3. Pictures shown in play with artwork", pictureArt.size, pictureArt.size + fallbacks.size,
    `distinct pictures in the picture panel; ${fallbacks.size} had no artwork and showed the original (${[...fallbacks.values()].reduce(plus, 0)} frames)`]);
  if (list) details.push("  Pictures shown from the original files:", ...[...fallbacks].map(([key, frames]) => `    ${frames} frames ${key}`));
  // The 3D view builds each wall from the tiles the game composed. A tile with no artwork is sent as original pixels.
  const withArt = new Set<string>(), original = new Set<string>();
  const seenScenery = new Set<string>();
  for (const trace of enhanced) {
    for (const { scenery } of trace.scenery) {
      const key = JSON.stringify([scenery.area, scenery.frontSlots, scenery.glyphs, scenery.skyColor, scenery.groundColor]);
      if (seenScenery.has(key)) continue;
      seenScenery.add(key);
      const materials = buildExplorationMaterials(scenery, artwork);
      for (const material of [materials.ground, materials.sky, ...materials.wallFaces.flatMap(({ parts }) => parts.map(({ art }) => art))]) {
        if (!material) continue;
        (material.pixels ? original : withArt).add(material.pixels ? `${scenery.area}:${material.key}` : material.key);
      }
    }
  }
  rows.push(["3. Wall textures shown in play with artwork", withArt.size, withArt.size + original.size,
    `distinct 8 by 8 textures of the 3D first-person view, sky and ground included, in ${seenScenery.size} wall sets; the rest are sent to the page as original pixels`]);
  const kinds = merged(trace => trace.kinds, (a, b) => ({ frames: a.frames + b.frames,
    framesWithOriginalPixels: a.framesWithOriginalPixels + b.framesWithOriginalPixels, originalPixels: a.originalPixels + b.originalPixels,
    inPanel: a.inPanel + b.inPanel, elsewhere: a.elsewhere + b.elsewhere }));
  const frames = [...kinds.values()].reduce((total, kind) => total + kind.frames, 0);
  const dirty = [...kinds.values()].reduce((total, kind) => total + kind.framesWithOriginalPixels, 0);
  rows.push(["3. Enhanced frames in play with no original pixel", frames - dirty, frames,
    `frames built for Enhanced ${serverNote}; a frame counts as left when a pixel of the game's own drawing is still visible under the page's layers`]);
  details.push("Part 3. Enhanced frames in the traced play, by what they showed (frames, frames with original pixels left, pixels left inside the picture or battle panel, elsewhere):",
    ...[...kinds].sort(([, a], [, b]) => b.frames - a.frames).map(([kind, { frames, framesWithOriginalPixels, inPanel, elsewhere }]) =>
      `  ${kind.padEnd(30)} ${String(frames).padStart(6)} ${String(framesWithOriginalPixels).padStart(6)} ${count(inPanel).padStart(12)} ${count(elsewhere).padStart(12)}`),
    "  A scene with artwork is drawn from the artwork alone; its row counts the original frame under it.");
}

// ---------------------------------------------------------------------------------------------
// Part 4. Text drawn with the original font in Enhanced.
// ---------------------------------------------------------------------------------------------
if (!glyphs.size) {
  rows.push(["4. Characters drawn in play that the page draws", undefined, undefined, playNote]);
  unmeasured.push("Part 4: which characters the game draws with its own font needs the traced play.");
} else {
  // A space, and any character drawn in colour 0, puts no visible pixel on the screen: the game uses both to erase.
  const visible = [...glyphs].filter(([code]) => code !== "32").map(([code, { drawn, captured, black }]) => ({ code, drawn: drawn - black, captured }));
  const drawn = visible.reduce((total, { drawn }) => total + drawn, 0);
  const captured = visible.reduce((total, { captured }) => total + captured, 0);
  const lost = visible.filter(({ drawn, captured }) => captured < drawn).sort((a, b) => Number(a.code) - Number(b.code));
  const erasing = [...glyphs].reduce((total, [code, { drawn, black }]) => total + (code === "32" ? drawn : black), 0);
  rows.push(["4. Characters drawn in play that the page draws", captured, drawn,
    `visible characters the game drew with its font, ${visible.filter(({ drawn }) => drawn).length} distinct codes; the page redraws codes 33 to 126 in the web font (upgrades/font.woff2). ` +
    `Left on the frame as original font pixels: ${lost.map(({ code, drawn, captured }) => `code ${code} x${drawn - captured}`).join(", ") || "none"}. ` +
    `Not counted: ${count(erasing)} spaces and colour-0 draws, which erase`]);
}

// ---------------------------------------------------------------------------------------------
// Part 5. Sound.
// ---------------------------------------------------------------------------------------------
const soundEvents = (JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as
  { events: { index: number; id: string; enhancedFile?: string; reachable?: boolean }[] }).events;
// As tools/browser-play.ts serves it for 1.3: the Classic files of events above 12 do not belong to this build.
const fromRepository = soundEvents.filter(({ enhancedFile }) => enhancedFile && existsSync(join("audio", "enhanced", enhancedFile)));
const fromAssets = soundEvents.filter(event => !fromRepository.includes(event) && event.index <= 12);
const silent = soundEvents.filter(event => !fromRepository.includes(event) && event.index > 12);
rows.push(["5. Sound events Enhanced plays from the repository", fromRepository.length, fromRepository.length + fromAssets.length,
  `from audio/enhanced: events ${fromRepository.map(({ index }) => index).join(" ")}. From por-assets (a WAV rendered from the original driver): ` +
  `${fromAssets.map(({ index, id, reachable }) => `event ${index} ${id}${reachable === false ? ", which the game never requests" : ""}`).join("; ") || "none"}. ` +
  `Silent on 1.3: events ${silent.map(({ index }) => index).join(" ")}. ` +
  (sounds.size ? `Requested ${playNote}: ${[...sounds].sort(([a], [b]) => Number(a) - Number(b)).map(([index, times]) => `${index} x${times}`).join(", ")}` : `Requests: ${playNote}`)]);

// ---------------------------------------------------------------------------------------------
// Part 6. Original material already in the repository. Facts only.
// ---------------------------------------------------------------------------------------------
const tracked = spawnSync("git", ["ls-files", "-z"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }).stdout.split("\0").filter(Boolean);
const committed: [pattern: RegExp, what: string][] = [
  [/^src\/translated-1\.3\//, "the 1.3 program, instruction for instruction (generated from START.EXE and GAME.OVR)"],
  [/^src\/translated\//, "the first-release program, instruction for instruction"],
  [/^src\/audio\/.*\.json$/, "narration manifests and queues that hold the game's script text, and the sound event table"],
  [/^src\/maps\//, "area catalogue, geography model and atlas index taken from the maps and scripts"],
  [/^src\/codewheel\//, "the code wheel's rune tables"],
  [/^src\/runtime\/(bindings|adventure-log|commission-journal)\.ts$/, "program addresses, and game text the journal matches on"],
  [/^tools\/live-input\.ts$/, "three 8 by 8 frame tiles of the original border as pixel values (panelStamps), and dialogue it matches on"],
  [/^qa\/fixtures\//, "a saved game made by play, in the port's save format"],
  [/^qa\/acceptance\//, "walkthrough expectations that quote the game's text"],
  [/^qa\/replay-schedules\//, "recorded key schedules"],
  [/^qa\/(research|evidence)\//, "notes that quote program bytes, addresses and text"],
  [/^upgrades\/.*manifest\.json$/, "artwork keys: hashes of original tiles and archive block numbers, no pixels"],
  [/^audio\//, "new recordings: narration that speaks the game's text, and the Enhanced sounds"],
  [/^upgrades\/.*\.(png|woff2)$/, "new artwork and the web font; not original"],
];
details.push("Part 6. Original game content, or material derived from it, already committed (files, bytes):",
  ...committed.map(([pattern, what]) => {
    const files = tracked.filter(file => pattern.test(file) && existsSync(file));
    return `  ${pattern.source.replace(/\\/g, "").padEnd(58)} ${String(files.length).padStart(5)} ${count(files.reduce((total, file) => total + statSync(file).size, 0)).padStart(13)}   ${what}`;
  }),
  "  This list is the paths this tool knows to hold such material; it does not search the repository for more.");

// ---------------------------------------------------------------------------------------------
// The report.
// ---------------------------------------------------------------------------------------------
let left = 0, notMeasured = 0;
console.log(`${"part".padEnd(52)} ${"done".padStart(7)} ${"of".padStart(7)} ${"left".padStart(7)}`);
for (const [part, done, total, note] of rows) {
  if (done === undefined || total === undefined) {
    notMeasured++;
    console.log(`${part.padEnd(52)} ${"?".padStart(7)} ${"?".padStart(7)} ${"?".padStart(7)}   ${note}`);
    continue;
  }
  left += total - done;
  console.log(`${part.padEnd(52)} ${String(done).padStart(7)} ${String(total).padStart(7)} ${String(total - done).padStart(7)}   ${note}`);
}
console.log(`\n${count(left)} left before the port runs with no original file${notMeasured ? `; ${notMeasured} parts not measured` : ""}`);
console.log(played.length
  ? `\nThe play behind the run-time numbers (${played.reduce((total, { seconds }) => total + seconds, 0)} s):\n` +
    played.map(({ name, covers, result, seconds }) => `  ${name}: ${covers}. ${result}${seconds ? `, ${seconds} s` : ""}`).join("\n")
  : `\nNo play was traced${traceDirectory ? ` (${traceDirectory} names none)` : ""}.`);
console.log(`\n${details.join("\n")}`);
console.log("\nNot measured:\n" + [...unmeasured,
  "What the page does after it has the frame: a picture that fails to load falls back to the original pixels, and a browser without WebGL shows the original first-person view. The runner cannot see either.",
  "Any play beyond the play listed above. Files, blocks, program bytes, pictures and characters the game would touch elsewhere are not in the run-time numbers.",
].map(line => `  ${line}`).join("\n"));
if (left || notMeasured) process.exit(1);
