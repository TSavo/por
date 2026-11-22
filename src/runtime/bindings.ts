import type { Cpu } from "../cpu/machine.js";
import { exeByImage, type FarFn } from "./far.js";
import { loadedSlices } from "./overlay.js";

// Every address in the original program that the host reads, watches or calls.
//
// The port runs two builds of the program: the first release, which shows no
// version number, and version 1.3. The compiler placed code and data
// differently in each, so each name has one address per build. Host code uses
// the names and never a raw address.
//
// The 1.3 column was found with tools/locate-in-version.py, which aligns each
// procedure of the earlier build with its counterpart in 1.3, and by reading
// the disassembly where the two differ.

export type GameVersion = "1.0" | "1.3";
type PerVersion<T> = Record<GameVersion, T>;

let version: GameVersion = "1.0";
export function useGameVersion(next: GameVersion): void { version = next; }
export function gameVersion(): GameVersion { return version; }

/** The overlay file's first four bytes name the overlay manager, which differs between the builds. */
export function detectGameVersion(overlayFile: Uint8Array): GameVersion {
  const magic = String.fromCharCode(...overlayFile.subarray(0, 4));
  if (magic === "TPOV") return "1.0";
  if (magic === "FBOV") return "1.3";
  throw new Error(`GAME.OVR starts with ${JSON.stringify(magic)}; expected TPOV (first release) or FBOV (version 1.3)`);
}

function resolve<T extends Record<string, PerVersion<unknown>>>(table: T): { readonly [K in keyof T]: T[K][GameVersion] } {
  const names = {};
  for (const name of Object.keys(table)) {
    Object.defineProperty(names, name, { enumerable: true, get: () => table[name]![version] });
  }
  return names as { readonly [K in keyof T]: T[K][GameVersion] };
}

/** Segments of the resident program. */
export const segment = resolve({
  /** The program's data segment. */
  data: { "1.0": 0x740, "1.3": 0xc7c },
  /** Turbo Pascal's Crt unit: Delay, KeyPressed, ReadKey. */
  crt: { "1.0": 0x512, "1.3": 0xa40 },
  /** The game's keyboard unit. */
  keyboard: { "1.0": 0x26b, "1.3": 0x899 },
  /** The game's text unit. */
  text: { "1.0": 0x198, "1.3": 0x709 },
  /** The game's picture unit. */
  picture: { "1.0": 0x18e, "1.3": 0x464 },
});

/** Offsets in the data segment. A pointer is an offset word followed by a segment word. */
export const data = resolve({
  /** Pointer to the ECL global variables, which hold the party's position and the quest flags. */
  eclGlobals: { "1.0": 0x4933, "1.3": 0x49d2 },
  /** Pointer to the ECL string variables. */
  eclStrings: { "1.0": 0x4937, "1.3": 0x49d6 },
  /** Pointer to the ECL local variables. */
  eclLocals: { "1.0": 0x493b, "1.3": 0x49da },
  /** Pointer to the loaded ECL script. */
  eclCode: { "1.0": 0x493f, "1.3": 0x49de },
  /** The script address of the ECL instruction being run. */
  eclCursor: { "1.0": 0x494e, "1.3": 0x49ed },
  /** The game state. 5 is combat. */
  gameState: { "1.0": 0x4954, "1.3": 0x49f3 },
  /** The overland sector, plus 2. */
  sector: { "1.0": 0x495b, "1.3": 0x49fa },
  /** 1 while the battlefield is being drawn to the offscreen picture. */
  offscreenDraw: { "1.0": 0x497e, "1.3": 0x4a1e },
  /** Archive number appended when the combat picture loader opens CPIC. */
  combatPictureBank: { "1.0": 0x52d4, "1.3": 0x5376 },
  /** Ready and strike far pointers indexed by combat picture slot. */
  combatPictureSlots: { "1.0": 0x5db8, "1.3": 0x5e5a },
  /** Icon-size suffix and EGA indices for the party icon palette pairs. */
  partyIconSizeSuffix: { "1.0": 0x08d9, "1.3": 0x08c5 },
  partyIconPaletteIndices: { "1.0": 0x3c6e, "1.3": 0x3cf6 },
  /** Pointer to the offscreen picture. */
  offscreen: { "1.0": 0x4980, "1.3": 0x4a20 },
  /** Far pointers to the loaded pieces of a composed portrait. */
  portraitHead: { "1.0": 0x6a5f, "1.3": 0x6b01 },
  portraitBody: { "1.0": 0x6a64, "1.3": 0x6b06 },
  /** Sound hardware: 0 is Tandy, 1 is the PC speaker, 2 is silent. */
  soundMode: { "1.0": 0x52d2, "1.3": 0x5372 },
  /** The number in the name of the loaded ECL archive. */
  eclArchive: { "1.0": 0x52d4, "1.3": 0x5376 },
  /** Pointer to the combatant whose turn it is. */
  actor: { "1.0": 0x5cf0, "1.3": 0x5d92 },
  /** Pointer to the first combatant. */
  combatRoster: { "1.0": 0x5cf4, "1.3": 0x5d96 },
  /** Four pointers to the wall glyph banks. */
  glyphBanks: { "1.0": 0x5d98, "1.3": 0x5e3a },
  /** The number of hostile combatants still in the fight. */
  hostileCount: { "1.0": 0x6773, "1.3": 0x6815 },
  /** Pointer to the wall definitions of the map being shown. */
  walls: { "1.0": 0x69b6, "1.3": 0x6a58 },
  /** Pointer to the map being shown. */
  geo: { "1.0": 0x69ba, "1.3": 0x6a5c },
  /** The colour drawn above the horizon. */
  skyColor: { "1.0": 0x69be, "1.3": 0x6a60 },
  /** The colour drawn below the horizon. */
  groundColor: { "1.0": 0x69c1, "1.3": 0x6a63 },
  /** Whether the native local Area viewport is active. */
  areaViewActive: { "1.0": 0x6a0a, "1.3": 0x6aac },
  /** The party's column on the map being shown. The row and the facing follow it. */
  cameraX: { "1.0": 0x6a0b, "1.3": 0x6aad },
  cameraY: { "1.0": 0x6a0c, "1.3": 0x6aae },
  facing: { "1.0": 0x6a0d, "1.3": 0x6aaf },
  /** The script address the ECL interpreter returns to after a call. */
  eclReturn: { "1.0": 0x6d36, "1.3": 0x6f70 },
  /** The opcode of the ECL instruction being run. */
  eclOpcode: { "1.0": 0x6d45, "1.3": 0x6f7f },
  /** The block of the loaded ECL archive. */
  eclBlock: { "1.0": 0x82a2, "1.3": 0x84dc },
  /** The EGA plane each of the four bytes of a glyph row belongs to. */
  planeMasks: { "1.0": 0x260a, "1.3": 0x25f6 },
  /** The first symbol of each of the four wall glyph banks. */
  glyphBase: { "1.0": 0x2736, "1.3": 0x2722 },
  /** The overland terrain table, 44 by 36 bytes, initialized in the program file. */
  overlandTerrain: { "1.0": 0x35e2, "1.3": 0x3648 },
  /** The arrays the script interpreter's operand fetch fills: each operand's code, and its low byte. */
  eclOperandCode: { "1.0": 0x6dcb, "1.3": 0x7005 },
  eclOperandLow: { "1.0": 0x6e4b, "1.3": 0x7085 },
  /** Crt's CheckSnow and TextAttr. */
  crtCheckSnow: { "1.0": 0x82bb, "1.3": 0x84f3 },
  crtTextAttr: { "1.0": 0x82be, "1.3": 0x84f6 },
  /** Version 1.3 only: the time, as a 32-bit count, after which an open menu answers by itself. Zero is no limit. */
  menuTimeLimit: { "1.0": undefined, "1.3": 0x6b2e },
  /** The random number seed. Randomize stores the DOS time here. */
  randSeed: { "1.0": 0x438a, "1.3": 0x4428 },
});

/**
 * Where ECL global variable `address` (0x4900 to 0x4cff) sits in the area `data.eclGlobals` points to.
 * The scripts name these variables, and the scripts are the same in both builds.
 */
export function eclGlobalOffset(address: number): number {
  return ((address - 0x4900) * 2) & 0xffff;
}

/** Far entry points the host recognises when the game calls them. */
export const far = resolve({
  /** Print a string in the text window. */
  print: { "1.0": [0x198, 0x39], "1.3": [0x709, 0x768] },
  /** Print a string in a given colour. */
  printColoured: { "1.0": [0x198, 0x5c], "1.3": [0x709, 0xd68] },
  /** Clear the text window. */
  clearText: { "1.0": [0x198, 0x2f], "1.3": [0x709, 0x626] },
  /** Show a picture from an archive. */
  showPicture: { "1.0": [0x18e, 0x5c], "1.3": [0x464, 0x1951] },
  /** Empty the keyboard buffer. */
  flushKeys: { "1.0": [0x26b, 0xf6], "1.3": [0x899, 0x104] },
  /** Turbo Pascal's Random(n), which every dice roll goes through. */
  random: { "1.0": [0x5bb, 0xc94], "1.3": [0xaf8, 0x11c0] },
  /** Play a sound event. */
  sound: { "1.0": [0x27f, 0x0], "1.3": [0x8ae, 0xdc] },
});

/**
 * Script positions.
 *
 * Artwork, narration and the journal are keyed by positions in the game's ECL scripts, as the
 * first release numbers them. One script differs in version 1.3: New Phlan (ECL3.DAX block 0)
 * ends its tavern's refused wager with `GOTO a609` where the first release has `EXIT` at a692. The
 * instruction is three bytes longer, so every later instruction of that script sits three
 * bytes further on, and nothing else changed. (The other difference in that script, the
 * number of tavern tales at a429, changes an operand and no position.)
 *
 * The host converts a position it reads from the running game to the first release's
 * numbering once, where it reads it. Everything keyed by script position then works unchanged.
 *
 * Which numbering applies is a fact about the script in memory, not about the program. A saved
 * game holds a copy of the current area's script (the whole block, at offset 0x1401 of SAVGAM),
 * and loading it puts that copy back. So a game saved in New Phlan by the first release and
 * loaded on 1.3 runs the first release's script, in the first release's numbering, and the
 * other way round, until the party next enters that area and the game reads the script from its
 * files again. The host therefore reads the edited instruction in memory to learn which
 * release's script is loaded (`npm run verify:script-positions` plays all three cases).
 *
 * The table below carries, for each script that differs, the byte to compare. Today that is one
 * script, and one byte at its one edit tells the two copies apart. The other 28 scripts are byte
 * for byte the same in both releases, so for them it does not matter which copy is loaded. A
 * further script that differs needs an entry in each column here; `npm run qa:version-1.3` counts
 * the scripts that differ.
 */
const movedScripts: PerVersion<{ archive: number; block: number; from: number; by: number; edit: number; opcode: number }[]> = {
  // `edit` is the instruction the releases disagree on, and `opcode` what this release has there:
  // EXIT in the first release, GOTO in 1.3.
  "1.0": [{ archive: 3, block: 0, from: 0xa693, by: 0, edit: 0xa692, opcode: 0x00 }],
  "1.3": [{ archive: 3, block: 0, from: 0xa693, by: 3, edit: 0xa692, opcode: 0x01 }],
};

/** The first release's number for a script position given in `build`'s numbering. */
export function authoredScriptAddress(archive: number, block: number, address: number, build: GameVersion = version): number {
  const moved = movedScripts[build].find((entry) => entry.archive === archive && entry.block === block);
  return moved && address >= moved.from + moved.by ? address - moved.by : address;
}

/** Where `build`'s script keeps a position given in the first release's numbering. */
export function runningScriptAddress(archive: number, block: number, address: number, build: GameVersion = version): number {
  const moved = movedScripts[build].find((entry) => entry.archive === archive && entry.block === block);
  return moved && address >= moved.from ? address + moved.by : address;
}

/**
 * Which release's copy of the current script is in memory. It is the running build's own, except
 * after loading a game the other release saved in an area whose script differs.
 */
export function loadedScriptRelease(cpu: Cpu, dataSegment: number = segment.data): GameVersion {
  const archive = cpu.read8(dataSegment, data.eclArchive), block = cpu.read8(dataSegment, data.eclBlock);
  const offset = cpu.read16(dataSegment, data.eclCode), codeSegment = cpu.read16(dataSegment, data.eclCode + 2);
  for (const build of Object.keys(movedScripts) as GameVersion[]) {
    const moved = movedScripts[build].find((entry) => entry.archive === archive && entry.block === block);
    // Script address `a` is the byte at a + 0x6700 from the script buffer's pointer.
    if (moved && cpu.read8(codeSegment, (offset + moved.edit + 0x6700) & 0xffff) === moved.opcode) return build;
  }
  return version;
}

/** The first release's number for a position read from the script in memory. */
export function authoredScriptPosition(cpu: Cpu, address: number, dataSegment: number = segment.data): number {
  return authoredScriptAddress(cpu.read8(dataSegment, data.eclArchive), cpu.read8(dataSegment, data.eclBlock), address, loadedScriptRelease(cpu, dataSegment));
}

/** Where the script in memory keeps a position given in the first release's numbering. */
export function runningScriptPosition(cpu: Cpu, address: number, dataSegment: number = segment.data): number {
  return runningScriptAddress(cpu.read8(dataSegment, data.eclArchive), cpu.read8(dataSegment, data.eclBlock), address, loadedScriptRelease(cpu, dataSegment));
}

/** What the game itself does, where the builds differ in behaviour. */
export const behaviour = resolve({
  /**
   * The first release starts battle music (sound event 14) on Tandy hardware.
   * Version 1.3 never asks for it, on any hardware.
   */
  startsBattleMusicOnTandy: { "1.0": true, "1.3": false },
  /**
   * The first release's FlushKeys reads and drops every waiting key before a new screen.
   * In version 1.3 the routine returns at once: its first instruction jumps over the loop.
   */
  flushKeysDiscardsTypeAhead: { "1.0": true, "1.3": false },
  /**
   * Random numbers the program draws at start-up that the first release does not.
   * Version 1.3 draws one, after the title, to pick its code-wheel question.
   * That one draw is the whole difference between the two builds' dice.
   */
  extraStartupDraws: { "1.0": 0, "1.3": 1 },
});

/** The seed that comes before `seed` in Turbo Pascal's generator, whose step is seed * 0x08088405 + 1. */
export function previousRandomSeed(seed: number): number {
  // 0xd94fa8cd is the inverse of 0x08088405 modulo 2^32.
  return Math.imul((seed - 1) | 0, 0xd94fa8cd | 0) >>> 0;
}

/** A position in the program's code: in an overlay slice, or in the resident program by image offset. */
export type Where = { slice: number; at: number } | { segment: number; at: number };

/** Code positions the host watches or calls. */
export const code = resolve({
  /** The first-person draw has finished writing the viewport. */
  viewportDrawn: { "1.0": { slice: 0x24, at: 0x1eb9 }, "1.3": { segment: 0x464, at: 0x649b } },
  /** Where the local-scenery routine resumes after it calls the first-person draw. */
  localSceneryResumes: { "1.0": { slice: 0x1e, at: 0x610 }, "1.3": { slice: 0x1d, at: 0x5fb } },
  /** A projectile or impact is in the offscreen picture and about to be shown. Three places. */
  effectShownA: { "1.0": { slice: 0x19, at: 0x1d27 }, "1.3": { segment: 0xba, at: 0x2874 } },
  effectShownB: { "1.0": { slice: 0x19, at: 0x1fea }, "1.3": { segment: 0xba, at: 0x2b34 } },
  effectShownC: { "1.0": { slice: 0x19, at: 0x2169 }, "1.3": { segment: 0xba, at: 0x2cbd } },
  /** Copies an effect slot and pose into a frame of the projectile scratch picture. */
  combatEffectCompose: { "1.0": { slice: 0x19, at: 0x18e1 }, "1.3": { segment: 0xba, at: 0x2432 } },
  /** Where each of those three resumes after the pause that follows. */
  effectPausedA: { "1.0": { slice: 0x19, at: 0x1d3c }, "1.3": { segment: 0xba, at: 0x2889 } },
  effectPausedB: { "1.0": { slice: 0x19, at: 0x2005 }, "1.3": { segment: 0xba, at: 0x2b4f } },
  effectPausedC: { "1.0": { slice: 0x19, at: 0x217c }, "1.3": { segment: 0xba, at: 0x2cd0 } },
  /** A defeated combatant's marker is in the offscreen picture and about to be shown. */
  deathShown: { "1.0": { slice: 0x20, at: 0xf33 }, "1.3": { slice: 0x1f, at: 0xf3f } },
  /** Where the death routine resumes after its pause. */
  deathResumes: { "1.0": { slice: 0x20, at: 0x100b }, "1.3": { slice: 0x1f, at: 0x1018 } },
  /** Where the pause routine resumes after Crt.Delay. */
  pauseResumes: { "1.0": { slice: 0x25, at: 0xc96 }, "1.3": { segment: 0x709, at: 0x7e61 } },
  /**
   * Where the two routines that show a message on the bottom line resume after their pause. Each
   * prints the message, pauses, and clears the line again without asking for a key. The first
   * prints in green ("Must be Readied"); the second, in the text unit, takes the colour from its
   * caller (the trainer's "Training costs 1000 gp.").
   */
  messageResumes: { "1.0": { slice: 0x19, at: 0x1721 }, "1.3": { segment: 0xba, at: 0x2275 } },
  colouredMessageResumes: { "1.0": { slice: 0x25, at: 0xc6d }, "1.3": { segment: 0x709, at: 0x7e38 } },
  /** The top of Crt.Delay's loop, once per millisecond asked for. */
  delayLoop: { "1.0": { segment: 0x512, at: 0x53d3 }, "1.3": { segment: 0xa40, at: 0xa6b0 } },
  /** The BIOS keyboard poll inside Crt.KeyPressed. */
  keyPressedPoll: { "1.0": { segment: 0x512, at: 0x5423 }, "1.3": { segment: 0xa40, at: 0xa706 } },
  /**
   * Where the menu routine resumes after its keyboard poll. The routine loops on this poll,
   * animating the picture beside the menu, until a key arrives: the one place where the game
   * waits for the player with a poll.
   */
  menuPollResumes: { "1.0": { slice: 0x1a, at: 0x2cd }, "1.3": { slice: 0x19, at: 0x56b } },
  /** Where FlushKeys and GetKey resume after a poll whose only purpose is to discard keys. */
  flushPollResumes: { "1.0": { segment: 0x26b, at: 0x27b1 }, "1.3": { segment: 0x899, at: 0x8aa1 } },
  drainPollResumes: { "1.0": { segment: 0x26b, at: 0x278b }, "1.3": { segment: 0x899, at: 0x8a79 } },
  /** The encounter routine calls the masked blitter for its selected member. */
  encounterPictureDraw: { "1.0": { slice: 0x1d, at: 0x779 }, "1.3": { slice: 0x1c, at: 0x7ac } },
  /** The encounter member has been copied to the displayed viewport. */
  encounterDrawn: { "1.0": { slice: 0x1d, at: 0x78a }, "1.3": { slice: 0x1c, at: 0x7bd } },
  /** The battlefield terrain routine: its entry, and the point where a tile is in the offscreen picture. */
  terrainEntry: { "1.0": { slice: 0x21, at: 0xf1 }, "1.3": { slice: 0x20, at: 0xf1 } },
  terrainDrawn: { "1.0": { slice: 0x21, at: 0x14d }, "1.3": { slice: 0x20, at: 0x14b } },
  /** The battlefield loader has copied a replacement sheet into SQRPACI block 1. */
  battleTerrainSheetCopied: { "1.0": { slice: 0x21, at: 0xdb }, "1.3": { slice: 0x20, at: 0xdb } },
  /** The animation loader has allocated and initialized a native picture member. */
  pictureMember: { "1.0": { slice: 0x1d, at: 0x3dc }, "1.3": { slice: 0x1c, at: 0x400 } },
  /** The picture animation loader releases one member's native allocation. */
  pictureMemberRelease: { "1.0": { slice: 0x1d, at: 0x495 }, "1.3": { slice: 0x1c, at: 0x4ca } },
  /** The animated picture helper returns after presenting one selected member. */
  pictureMemberPresented: { "1.0": { slice: 0x1d, at: 0x4c }, "1.3": { slice: 0x1c, at: 0x4c } },
  /** The composed portrait loader records the loaded piece's block ID. */
  portraitHeadLoaded: { "1.0": { slice: 0x1d, at: 0x60b }, "1.3": { slice: 0x1c, at: 0x640 } },
  portraitBodyLoaded: { "1.0": { slice: 0x1d, at: 0x654 }, "1.3": { slice: 0x1c, at: 0x689 } },
  /** The guest has drawn the head and, when requested, its body. */
  composedPortraitPresented: { "1.0": { slice: 0x1d, at: 0x6b0 }, "1.3": { slice: 0x1c, at: 0x6e5 } },
  /** The loader assigns a ready block and its strike block to a combat picture slot. */
  combatPictureLoad: { "1.0": { slice: 0x21, at: 0x1ca }, "1.3": { slice: 0x20, at: 0x1c8 } },
  /** The compositor draws a selected picture slot and pose into the battlefield. */
  combatPictureDraw: { "1.0": { slice: 0x21, at: 0x4fe }, "1.3": { slice: 0x20, at: 0x4fc } },
  /** Where the battlefield cursor renderer resumes after drawing the COMSPR selection bevel. */
  combatSelectionDrawResumes: { "1.0": undefined, "1.3": { slice: 0x1f, at: 0x23e } },
  /** The disk overlay: load a game, save a game, save and leave. */
  loadGame: { "1.0": { slice: 0x11, at: 0x159d }, "1.3": { slice: 0x11, at: 0x1602 } },
  saveGame: { "1.0": { slice: 0x11, at: 0x1ced }, "1.3": { slice: 0x11, at: 0x1d58 } },
  saveAndLeave: { "1.0": { slice: 0x11, at: 0x2265 }, "1.3": { slice: 0x11, at: 0x22d5 } },
  /** The title sequence: the calls that show the publisher and title pictures, and the flush after them. */
  titlePublisher: { "1.0": { slice: 0x1, at: 0x675 }, "1.3": { slice: 0x1, at: 0x683 } },
  titleTitle: { "1.0": { slice: 0x1, at: 0x6e9 }, "1.3": { slice: 0x1, at: 0x6ee } },
  titleDone: { "1.0": { slice: 0x1, at: 0x7f7 }, "1.3": { slice: 0x1, at: 0x7fc } },
  /** The call that clears the text window before the battle music starts. */
  battleBegins: { "1.0": { slice: 0xa, at: 0x1f26 }, "1.3": { slice: 0xa, at: 0x1e81 } },
  /** Where the trainer resumes after printing a refusal. Two places. */
  trainerRefusedA: { "1.0": { slice: 0x10, at: 0x2a02 }, "1.3": { slice: 0x10, at: 0x2a19 } },
  trainerRefusedB: { "1.0": { slice: 0x10, at: 0x2ce1 }, "1.3": { slice: 0x10, at: 0x2d05 } },
  /** The two stores in the text routine that put a glyph row on the screen. */
  glyphStoreA: { "1.0": { slice: 0x25, at: 0x2aa }, "1.3": { segment: 0x709, at: 0x74a2 } },
  glyphStoreB: { "1.0": { slice: 0x25, at: 0x2dd }, "1.3": { segment: 0x709, at: 0x74d5 } },
  /**
   * The same two stores repeated for the second display page. The first release keeps that page
   * apart from the visible one. Version 1.3 points both at the visible page, so each row lands twice.
   */
  glyphRepeatA: { "1.0": { slice: 0x25, at: 0x2d0 }, "1.3": { segment: 0x709, at: 0x74c8 } },
  glyphRepeatB: { "1.0": { slice: 0x25, at: 0x2e9 }, "1.3": { segment: 0x709, at: 0x74e1 } },
  /** The script interpreter's loop, and the routines that fetch an operand and store a result. */
  eclLoop: { "1.0": { slice: 0x3, at: 0x35db }, "1.3": { slice: 0x3, at: 0x3171 } },
  eclOperand: { "1.0": { slice: 0x7, at: 0x0 }, "1.3": { slice: 0x7, at: 0x0 } },
  eclStore: { "1.0": { slice: 0x7, at: 0xc93 }, "1.3": { slice: 0x7, at: 0xc77 } },
  eclLoad: { "1.0": { slice: 0x7, at: 0x353 }, "1.3": { slice: 0x7, at: 0x341 } },
  /** Apply damage to a combatant. */
  damageCombatant: { "1.0": { slice: 0x19, at: 0x2266 }, "1.3": { segment: 0xba, at: 0x2dc8 } },
  /** Turbo Pascal's FillChar, Val, long division, and Crt's screen write. */
  fillChar: { "1.0": { segment: 0x5bb, at: 0x7265 }, "1.3": { segment: 0xaf8, at: 0xc628 } },
  val: { "1.0": { segment: 0x5bb, at: 0x6a35 }, "1.3": { segment: 0xaf8, at: 0xc331 } },
  longDivide: { "1.0": { segment: 0x5bb, at: 0x5e44 }, "1.3": { segment: 0xaf8, at: 0xb9f6 } },
  crtWrite: { "1.0": { segment: 0x512, at: 0x56c0 }, "1.3": { segment: 0xa40, at: 0xa9a3 } },
  /** The step of Turbo Pascal's random number generator, which Random calls for every number drawn. */
  nextRandom: { "1.0": { segment: 0x5bb, at: 0x6893 }, "1.3": { segment: 0xaf8, at: 0xc18f } },
  /** Turbo Pascal's Randomize. */
  randomize: { "1.0": { segment: 0x5bb, at: 0x68cb }, "1.3": { segment: 0xaf8, at: 0xc1c7 } },
  /** Turbo Pascal's Random(n) as a procedure: the same entry as `far.random`. */
  random: { "1.0": { segment: 0x5bb, at: 0x6844 }, "1.3": { segment: 0xaf8, at: 0xc140 } },
  /**
   * The code-wheel routine, which both builds keep at the same place in overlay slice 2: its
   * entry, and where it resumes after Random(13) with the question's number in AL. A wrong
   * answer in the first release jumps back to before that call, so it draws again.
   */
  codeWheel: { "1.0": { slice: 0x2, at: 0xfd }, "1.3": { slice: 0x2, at: 0xfd } },
  codeWheelQuestionDrawn: { "1.0": { slice: 0x2, at: 0x116 }, "1.3": { slice: 0x2, at: 0x116 } },
});

/** Direct draws from the resident panel rectangle routine using 8X8D1 block 202. */
export const panelFrameDraw = resolve({
  stamp: {
    "1.0": undefined,
    "1.3": { callerSegment: 0x3f1, sites: [0x3f48, 0x3f62, 0x3f7c, 0x3f96, 0x3fc9, 0x3fe2, 0x401c, 0x4034] },
  },
});

/** Version 1.3 passes the selected question into its native line input. */
export const startupInput = resolve({
  codeWheel: {
    "1.0": undefined,
    "1.3": {
      beforeRead: { slice: 2, at: 0x2fd }, afterRead: { slice: 2, at: 0x302 },
      questionOffset: -0x2a, attemptOffset: -0x2b,
    },
  },
});

/** The segment a code position runs in, or undefined while its overlay slice is not loaded. */
export function codeSegment(where: Where): number | undefined {
  return "segment" in where ? where.segment : loadedSlices.find(({ index }) => index === where.slice)?.loadPara;
}

/** True when the CPU is in `where`'s segment and `at` is its position. */
export function isAt(cpu: Cpu, at: number, where: Where): boolean {
  return at === where.at && cpu.cs === codeSegment(where);
}

/** True when the far return address `depth` bytes up the stack is `where`. */
export function returnsTo(cpu: Cpu, depth: number, where: Where): boolean {
  return cpu.read16(cpu.ss, (cpu.sp + depth) & 0xffff) === where.at &&
    cpu.read16(cpu.ss, (cpu.sp + depth + 2) & 0xffff) === codeSegment(where);
}

/** True when a far call to `segment`:`offset` is a call to `entry`. */
export function isFar(segment: number, offset: number, entry: readonly number[]): boolean {
  return segment === entry[0] && offset === entry[1];
}

/** The translated procedure that starts at `where`. */
export function procedure(where: Where): FarFn {
  const found = "segment" in where ? exeByImage.get(where.at)
    : loadedSlices.find(({ index }) => index === where.slice)?.procs.get(where.at);
  if (!found) throw new Error(`No translated procedure at ${JSON.stringify(where)} in version ${version}`);
  return found;
}

/** Register the translation of the build that `overlayFile` belongs to, and bind the host to it. */
export async function loadTranslation(overlayFile: Uint8Array): Promise<GameVersion> {
  const found = detectGameVersion(overlayFile);
  const { registerTranslated } = found === "1.3"
    ? await import("../translated-1.3/register.js") : await import("../translated/register.js");
  registerTranslated();
  useGameVersion(found);
  return found;
}
