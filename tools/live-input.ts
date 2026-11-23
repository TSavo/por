import { appendFileSync, mkdtempSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { observeNativeEncounterArt } from "./native-encounter-art.js";
import { captureNativeExploration, type NativeExploration } from "./native-exploration.js";
import { observeNativeCombatArt } from "./native-combat-art.js";
import { nativeSelectionKey, observeNativeCombatSelection } from "./native-combat-selection.js";
import { observeNativeBattleTerrain } from "./native-battle-terrain.js";
import { observeNativeCombatEffects } from "./native-combat-effects.js";
import { captureOverlandTravel, identifyPhlanPrompt, identifySokalPrompt, isQuayDialogue, isSokalBoatHandoff,
  type SokalQuay, type TravelState } from "./overland-travel.js";
import { createHash } from "node:crypto";
import { Frame } from "../src/lib/ega.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Cpu } from "../src/cpu/machine.js";
import { currentObjective, isOpenObjective, kovelJournalTransition, trackedJournalObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { BiosKey } from "../src/runtime/dos.js";
import { gameProgress } from "../src/runtime/far.js";
import { cellWriteMark, displayPalette, journalFrame, paletteObservers, paletteState, screen, visibleGameRunes, visibleGameText, visiblePanelFrame, type PanelFrameStamp } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { combatEffectFlightFamily, loadCombatEffects, combatHighlightPixel, loadCombatArtMatcher, monsterCombatKey, partyCombatKey, partyRecolorKey, randomCombatKey, type CombatArtPlacement } from "./combat-art.js";
import { loadCharacterSheetArt, loadPortraitArt, matchScriptIllustration } from "./portrait-art.js";
import { observeNativePictureArt } from "./native-picture-art.js";
import type { PictureRecord } from "../src/runtime/game-data.js";
import { loadEncounterArt, type EncounterPlacement } from "./encounter-art.js";
import { canWinDeveloperCombat, developerVictoryCommand, winDeveloperCombat } from "./developer-combat.js";
import type { Automap, ExploredPosition } from "./automap.js";
import { authoredScriptPosition, code, data, eclGlobalOffset, isAt, returnsTo, segment as unit } from "../src/runtime/bindings.js";
import { standaloneTrace } from "./standalone-trace.js";
import { narrationLedger } from "./narration-ledger.js";

const controls: Record<string, number> = {
  enter: 0x1c0d, escape: 0x011b, up: 0x4800, down: 0x5000, left: 0x4b00, right: 0x4d00,
  home: 0x4700, pageup: 0x4900, end: 0x4f00, pagedown: 0x5100,
  space: 0x3920, tab: 0x0f09, backspace: 0x0e08,
  "alt-q": 0x1000, "alt-m": 0x3200,
};
const scanRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const firstScans = [2, 16, 30, 44];
const liveIdleBudget = 150_000_000;
/** The code-wheel question the game is asking: its number in the game's table, and its entry in wheel.json. */
export interface CodeWheelQuestion { number: number; espruar: string; dethek: string; path: string }
const overlandArrivalAreas = new Set([0, 2, 10, 14, 18, 24, 31]);
const travelRoadAreas = new Set([0, 2, 9, 18]);
const travelRoadArrivals = new Map([[0, [8, 11, 20, 21]], [2, [15]], [8, [0]], [9, [6]], [18, [9, 29]], [20, [0]]]);
const travelRoadScripts = new Set([...travelRoadAreas, ...[...travelRoadArrivals.values()].flat()]);
const kutoWellLookFacing = new Map([["7,8", 0], ["6,7", 2], ["7,6", 4], ["8,7", 6]]);
// The completed print cursors of captions the guest clears before its next usable prompt.
// Use the loaded script's area so the artwork follows the print during district transitions.
const transientScriptIllustrations = new Map([
  ["7:26:9be2", "scene-illustration:area:26:ecl:9be2"],
  ["8:13:ad39", "scene-illustration:area:13:ecl:ad39"],
  ["8:16:aab7", "scene-illustration:area:16:ecl:aab7"],
  ["8:27:9c50", "scene-illustration:area:27:ecl:9c50"],
  ["8:27:a1b4", "scene-illustration:area:27:ecl:a1b4:cue:trolls-insult"],
]);
export interface OverlandTerrainFrame {
  slots: readonly number[];
  center: readonly [number, number];
  detailSlots?: readonly number[];
  landmarkSlots?: readonly number[];
}
export interface PresentationAnimationFrame {
  portrait?: string;
  frame: string;
  enhancedFrame: string;
  combatArt: CombatArtPlacement[];
  combatSelections?: TilePlacement[];
  combatEffect?: TilePlacement;
  battleTiles: TilePlacement[];
  battleProps?: CombatArtPlacement[];
  panelFrame?: PanelFrameStamp[];
  text: [number, number, number][];
  perspective?: boolean;
  nativeScenery?: NativeExploration & { area: number };
  exploration?: ExploredPosition;
  overlandMap?: boolean;
  overlandTerrain?: OverlandTerrainFrame;
  encounter?: EncounterPlacement;
  tiles?: TilePlacement[];
  durationMs?: number;
  /** True for a message on the bottom line that the game shows for a moment and clears by itself. */
  statusMessage?: boolean;
  /** True for an encounter picture drawn as it approaches the party (SETUP MONSTER, APPROACH). */
  approach?: boolean;
  /** True for the screen held in colours the game set for a pause (the title's flash): Classic plays it, Enhanced does not (#82). */
  classicOnly?: boolean;
  enhancedOnly?: boolean;
}
type TilePlacement = [x: number, y: number, key: string];
export type { PanelFrameStamp } from "../src/runtime/video.js";
export type TileInventoryCell = [x: number, y: number, key: string, indices: string];

const panelStamps = {
  "rail-x": "00000000cc0000cc44cc0c44004cc0000004cc00c44004cc4000004400000000",
  "rail-y": "0c400c400c400c400c40c40000c0c400000c400000c4040000c40c400c400c40",
  stud: "eeeeeeeeefffff6eefeeee6eefef6e6eefe66e6eefeeee6ee666666eeeeeeeee",
} as const;
const panelStampPixels = Object.entries(panelStamps).map(([kind, pixels]) => ({
  kind: kind as PanelFrameStamp[2], pixels: [...pixels].map(pixel => parseInt(pixel, 16)),
}));

function matchPanelFrame(frame: Frame): PanelFrameStamp[] | undefined {
  const stamps: PanelFrameStamp[] = [];
  for (let y = 0; y + 8 <= frame.height; y += 8) {
    for (let x = 0; x + 8 <= frame.width; x += 8) {
      const stamp = panelStampPixels.find(({ pixels }) => pixels.every((color, i) =>
        frame.pixels[(y + (i >> 3)) * frame.width + x + (i & 7)] === color));
      if (stamp) stamps.push([x, y, stamp.kind]);
    }
  }
  return stamps.some(([, , kind]) => kind === "stud") ? stamps : undefined;
}
const enhancedPalette = [
  [15, 14, 18], [44, 59, 112], [49, 128, 74], [46, 133, 146],
  [150, 55, 55], [126, 65, 134], [160, 104, 55], [174, 166, 153],
  [87, 81, 82], [119, 153, 237], [136, 219, 138], [140, 224, 227],
  [255, 135, 121], [233, 162, 231], [255, 223, 127], [254, 245, 221],
] as const;

export function getKey(command: string): number | undefined {
  if (Object.hasOwn(controls, command)) return controls[command];
  if (command.length !== 1) return;
  for (let row = 0; row < scanRows.length; row++) {
    const column = scanRows[row]!.indexOf(command.toLowerCase());
    if (column !== -1) return ((firstScans[row]! + column) << 8) | command.charCodeAt(0);
  }
}

function readCommand(): string | undefined {
  // POR_TRACE_STANDALONE: the runner is killed while it waits here, so the trace is written before each wait.
  standaloneTrace?.flush();
  const byte = Buffer.alloc(1);
  let line = "";
  while (readSync(0, byte, 0, 1, null) === 1) {
    if (byte[0] === 10) return line.trim();
    if (byte[0] !== 13) line += String.fromCharCode(byte[0]!);
  }
  return line.length ? line.trim() : undefined;
}

function menuText(glyphs: ReturnType<typeof visibleGameText>) {
  return glyphs.filter(([cell]) => cell >= 960).sort(([a], [b]) => a - b)
    .map(([, character]) => String.fromCharCode(character)).join("").toUpperCase();
}

function manualAimCell(frame: Frame): [x: number, y: number] | undefined {
  let cell: [number, number] | undefined;
  let ambiguous = false;
  for (let y = 8; y <= 152; y += 8) {
    for (let x = 8; x <= 152; x += 8) {
      if (frame.get(x, y) !== 15 || frame.get(x + 23, y + 23) !== 8) continue;
      let edgesMatch = true;
      for (let column = 0; column < 24 && edgesMatch; column++) {
        edgesMatch = frame.get(x + column, y) === combatHighlightPixel(column, 0) &&
          frame.get(x + column, y + 23) === combatHighlightPixel(column, 23);
      }
      if (!edgesMatch) continue;
      if (isEmptyAimCell(frame, x, y)) return [x, y];
      ambiguous ||= cell !== undefined;
      cell = [x, y];
    }
  }
  return ambiguous ? undefined : cell;
}

function isEmptyAimCell(frame: Frame, x: number, y: number): boolean {
  for (let row = 0; row < 24; row++) {
    for (let column = 0; column < 24; column++) {
      if (frame.get(x + column, y + row) !== combatHighlightPixel(column, row)) return false;
    }
  }
  return true;
}

function hasBattlefieldBorder(frame: Frame): boolean {
  // The original combat panel has gold corner studs at x=176 and y=176.
  // Exploration divides the screen at x=128 instead and ends at y=184.
  const pixel = (x: number, y: number) => frame.pixels[y * frame.width + x];
  return pixel(176, 0) === 14 && pixel(176, 176) === 14 && pixel(0, 176) === 14 &&
    pixel(177, 88) === 12 && pixel(178, 88) === 4;
}

/**
 * The same border from the game's own frame-glyph draws, for the port's own data, where the screen
 * has no pixels: the studs at (176,0), (176,176) and (0,176) and the rail at (176,88).
 */
function hasBattlefieldFrame(stamps = visiblePanelFrame()): boolean {
  const at = (x: number, y: number, kind: string) => stamps?.some(([sx, sy, sk]) => sx === x && sy === y && sk === kind);
  return Boolean(at(176, 0, "stud") && at(176, 176, "stud") && at(0, 176, "stud") && at(176, 88, "rail-y"));
}

/**
 * True while the menu routine is counting down to a default answer. Version 1.3's menu routine
 * compares the time since it opened with a 32-bit limit and answers for the player once a
 * positive limit has passed; the first release has no such limit.
 */
function menuTimeLimit(cpu: Cpu): boolean {
  if (data.menuTimeLimit === undefined) return false;
  const limit = (cpu.read16(unit.data, data.menuTimeLimit + 2) << 16 | cpu.read16(unit.data, data.menuTimeLimit)) | 0;
  return limit > 0;
}

/** Terminal control for the translated runner. Journal input stays on the host. */
export function liveInput(startAt: number, journal: () => JournalLead[], recording?: string, automap?: Automap,
  standalone = false, pictures?: readonly PictureRecord[]) {
  let nextPrompt = startAt;
  let trackedId: string | undefined;
  let scene: string | undefined;
  let codeWheel: CodeWheelQuestion | undefined;
  let area: number | undefined;
  let travelPosition: TravelState | undefined;
  let nonblockingPoll = false;
  // What the game was doing when it asked for the key behind the frame being reported.
  let promptKind: "read" | "poll" | undefined;
  let awaitsKey = false;
  // Where the game itself has the party standing, when that is a square of a 16 by 16 map.
  let livePosition: { x: number; y: number } | undefined;
  let developerVictoryAvailable = false;
  let activeEcl: number;
  let nativeOverland: TravelState | undefined;
  let drawingOverlandTerrain: number[] = [];
  let drawingOverlandPosition: TravelState | undefined;
  let drawnOverlandTerrain: OverlandTerrainFrame | undefined;
  let harborTicket: SokalQuay["ticket"] = "none";
  let explorationPosition: PresentationAnimationFrame["exploration"];
  let mappedPosition: ExploredPosition | undefined;
  let sentAutomap = -1;
  let battleCursor: number | undefined;
  let portraitCaller: number | undefined;
  let finalCouncilReward = false;
  /** The old lizard man is asking for the tribal friend-word (ECL8 block 16, "WHAT IS IT?"): Journal Entry 35 spells it in runes. */
  let friendWordPrompt = false;
  let baneCacheCue: string | undefined;
  let nativeBattleActive = false;
  const baneCacheCues = new Map<number, string>([
    [4, "rubble-tapestry-reward"], [6, "great-hall-cache"], [8, "northern-cache"], [9, "southern-cache"], [17, "eastern-cache"],
  ]);

  function captureEclContext(cpu: Cpu) {
    const dataSegment = unit.data;
    const gameMode = cpu.read8(dataSegment, data.gameState);
    nativeBattleActive = standalone && gameMode === 5;
    // Artwork is keyed by script positions in the first release's numbering.
    // The numbering is that of the script in memory, which a loaded game can bring from the other release.
    battleCursor = authoredScriptPosition(cpu, cpu.read16(dataSegment, data.eclCursor));
    // The original ECL interpreter stores its active return word through a pointer in its data.
    const offset = cpu.read16(dataSegment, data.eclReturn);
    const segment = cpu.read16(dataSegment, data.eclReturn + 2);
    portraitCaller = segment === 0 ? undefined : authoredScriptPosition(cpu, cpu.read16(segment, offset));
    finalCouncilReward = false;
    baneCacheCue = undefined;
    const archive = cpu.read8(dataSegment, data.eclArchive), block = cpu.read8(dataSegment, data.eclBlock);
    // A pause can show the overland map before the next keyboard poll updates the
    // host's cached area and travel position. Read the same guest state as the draw.
    nativeOverland = gameMode === 3 && block >= 25 && block <= 27 ? captureOverlandTravel(cpu,
      cpu.read16(dataSegment, data.eclGlobals + 2), cpu.read16(dataSegment, data.eclGlobals)) : undefined;
    // The script waits for the typed word between "WHAT IS IT?" (a0bd) and "DO YOU REALLY MEAN" (a0cf).
    friendWordPrompt = archive === 8 && block === 16 && battleCursor > 0xa0bd && battleCursor <= 0xa0cf;
    const councilPayout = archive === 3 && block === 8 && battleCursor === 0x9f3f && portraitCaller === 0x9a4a;
    const baneTreasure = archive === 1 && (block === 24 || block === 31) && battleCursor === 0xaa47;
    if (councilPayout || baneTreasure) {
      // These treasure routines share their picture pauses. The ECL's 6E79
      // selector identifies the reward at each pause.
      const strings = cpu.read16(dataSegment, data.eclStrings + 2);
      const base = cpu.read16(dataSegment, data.eclStrings);
      const treasure = cpu.read16(strings, (base + (0x6e79 - 0x6b00) * 2) & 0xffff);
      finalCouncilReward = councilPayout && treasure === 20;
      if (baneTreasure) baneCacheCue = baneCacheCues.get(treasure);
    }
  }
  let drawnPerspective: { pixels: Buffer; mark: number; localEcl?: number; native?: NativeExploration } | undefined;
  let lastLocalPerspective: typeof drawnPerspective;
  let priorPerspectiveDraw: Buffer | undefined;
  let previousPerspective: { area: number; pixels: Buffer; mark: number } | undefined;
  // From the port's own data the scenery's pictures are blank, and so is a menu, a list or a sheet
  // the game draws over the viewport: equal pixels do not say the scenery is still there. In
  // standalone the viewport's cells must also be unwritten since (cellWriteMark).
  const viewportMark = () => cellWriteMark(3, 3, 11, 11);
  const viewportUntouched = (mark: number) => !standalone || mark === viewportMark();
  const browser = process.env.POR_BROWSER_PLAY === "1";
  const developerCombat = process.env.POR_DEV_COMBAT === "1";
  // Replays recorded before 2026-11-21 answered the game's discard polls with a key press.
  // They set this until each is re-recorded with one press per input.
  const promptAtDiscardPolls = process.env.POR_INPUT_COMPAT === "discard-poll-prompt";
  const traceKeys = process.env.POR_TRACE_KEYS === "1";
  // POR_SWALLOW_KEY=n, for testing the replays only: the n-th key this runner is given (counted
  // from 1, commands such as ":poll" and the journal's "j" not counted) is swallowed, as if the
  // game had read it and done nothing. The runner shows the same screen again and asks again at the
  // same moment. A replay that checks the screen each key should produce fails there (#76).
  const swallowKey = Number(process.env.POR_SWALLOW_KEY) || 0;
  let keysGiven = 0;
  // POR_WATCH_ECL=4abb,4a80 makes each frame report the value of those script variables. Only the
  // variables the scripts keep in the saved game (0x4900 to 0x4cff) can be watched. Read only.
  const watchedVariables = (process.env.POR_WATCH_ECL ?? "").split(",").filter(Boolean).map((text) => {
    const address = Number.parseInt(text, 16);
    if (!/^[0-9a-f]{4}$/i.test(text) || address < 0x4900 || address > 0x4cff) throw new Error(`POR_WATCH_ECL takes script variables from 4900 to 4cff, not ${text}`);
    return address;
  });
  let scriptVariables: Record<string, number> | undefined;
  // POR_WATCH_DS=6f68,6f69 makes each frame report those bytes of the program's data segment
  // (`dataBytes`): state the scripts set that is not a script variable, such as the ground and
  // horizon codes the first-person view is drawn with. Read only.
  const watchedData = (process.env.POR_WATCH_DS ?? "").split(",").filter(Boolean).map((text) => {
    if (!/^[0-9a-f]{1,4}$/i.test(text)) throw new Error(`POR_WATCH_DS takes data segment offsets in hexadecimal, not ${text}`);
    return Number.parseInt(text, 16);
  });
  let dataBytes: Record<string, number> | undefined;
  const tileKeys = new Set((process.env.POR_TILE_ART_KEYS ?? "").split(",").filter(Boolean));
  const battleTileKeys = new Set((process.env.POR_BATTLE_TILE_KEYS ?? "").split(",").filter(Boolean));
  const combatKeys = (process.env.POR_COMBAT_ART_KEYS ?? "").split(",").filter(Boolean);
  const combatKeySet = new Set(combatKeys);
  const nativeTerrainTiles = Boolean(pictures);
  const nativeBattleTerrain = browser && (battleTileKeys.size || combatKeys.length)
    ? observeNativeBattleTerrain(pictures ?? [], battleTileKeys, combatKeySet) : undefined;
  const traceBattleDraw = process.env.POR_TRACE_BATTLE_DRAW === "1";
  const battleTerrain = browser && (battleTileKeys.size || traceBattleDraw) ? new Frame(screen.width, screen.height) : undefined;
  const capturedTerrainKeys = new Map<number, string>();
  const tracedBattleTerrain = new Set<string>();
  const selectionKeys = new Set((process.env.POR_COMBAT_SELECTION_KEYS ?? "").split(",").filter(Boolean));
  const nativeSelection = browser && standalone && code.combatSelectionDrawResumes ? observeNativeCombatSelection() : undefined;
  const framePixels = process.env.POR_FRAME_PIXELS === "1";
  const effectKeys = (process.env.POR_COMBAT_EFFECT_KEYS ?? "").split(",").filter(Boolean);
  const nativeEffects = browser && standalone && effectKeys.length ? observeNativeCombatEffects(new Set(effectKeys)) : undefined;
  const matchCombatEffect = loadCombatEffects(effectKeys);
  const isHoldEffect = (key: string) => /:(?:9|137)(?::flip-x)?$/.test(key);
  const isImpact = (key: string) => isHoldEffect(key) || /:(?:10|138)(?::flip-x)?$/.test(key) || /:(?:11|139)$/.test(key);
  const flightFrame = (frame: PresentationAnimationFrame) => frame.combatEffect && !isImpact(frame.combatEffect[2]);
  let pendingEffect: { x: number; y: number; background: Uint8Array; key?: string } | undefined;
  const materialKeys = new Set((process.env.POR_COMBAT_MATERIAL_KEYS ?? "").split(",").filter(Boolean));
  const combatArt = loadCombatArtMatcher(combatKeys, undefined, materialKeys);
  const nativeCombat = browser && standalone && combatKeys.length ? observeNativeCombatArt(combatKeySet, materialKeys) : undefined;
  const attackKeys = new Set(combatKeys
    .filter((key) => Number(monsterCombatKey.exec(key)?.[3] ?? partyCombatKey.exec(key)?.[2]) >= 128));
  const animation: PresentationAnimationFrame[] = [];
  // A frame that hands the page pictures of an animation still running (#121): the page plays them
  // and asks for more with ":poll", as it does for a fight the computer plays. Its value is how many
  // pictures the next batch will hold, which the page uses to pace this one (#125).
  let presentationPolling: number | false = false;
  let pictureLoopShown: string | undefined;
  // How many pictures go to the page at a time. Each loop starts with two, so its first pose arrives
  // while the page still shows the last one before it, and doubles up to a dozen (#125).
  let pictureLoopBatch = 2;
  let pictureLoopPasses = 0;
  let pictureLoopClip: PresentationAnimationFrame | undefined;
  // The last encounter picture drawn as an approach clip, and the pauses that followed it (#129).
  let approachClip: PresentationAnimationFrame | undefined;
  let approachClipMs = 0;
  /** The text of the last frame put in the animation or sent to the page. */
  let presentedText = "";
  /** What capturePresentationDelay last did with a pause, for POR_TRACE_PAUSES (#81). */
  let pauseOutcome = "";
  let immediateStrike: { signature: string; clip: PresentationAnimationFrame } | undefined;
  // The palette registers as the last picture sent to the page showed them, the last picture held in
  // colours the game set for a pause, and the screen's write mark when the game last set a colour (#82).
  let shownPalette = paletteState().join();
  let paletteClip: PresentationAnimationFrame | undefined;
  let paletteMark = cellWriteMark(0, 0, 40, 25);
  paletteObservers.add(() => { paletteMark = cellWriteMark(0, 0, 40, 25); });
  /** Send the pictures captured so far in a frame the page plays, and wait until it asks for more. */
  const handOverPictureLoop = (next: number) => {
    presentationPolling = next;
    awaitsKey = false;
    showFrame();
    presentationPolling = false;
    pictureLoopClip = undefined;
    for (;;) {
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command === ":poll" || command === ":travel-poll") return;
      console.log("Enter a letter, digit, arrow name: the game is playing an animation and takes no key now.");
    }
  };
  let lastAttack = "";
  let lastCombatReport = "";
  /** The right-hand panel above the report (the actor's stats) when the last report was taken. */
  let lastCombatStats = "";
  let lastApproach: string | undefined;
  const portraitKeys = (process.env.POR_PORTRAIT_ART_KEYS ?? "").split(",").filter(Boolean);
  const portraitArt = loadPortraitArt(portraitKeys, browser);
  const characterSheetKeys = (process.env.POR_CHARACTER_SHEET_ART_KEYS ?? "").split(",").filter(Boolean);
  const characterSheetArt = loadCharacterSheetArt(characterSheetKeys);
  const encounterPlacements = JSON.parse(process.env.POR_ENCOUNTER_ART ?? "{}") as Record<string, EncounterAnchor>;
  const hasEncounterArtwork = Object.keys(encounterPlacements).length > 0;
  let encounterTrace = process.env.POR_ENCOUNTER_TRACE_FILE;
  let nativeEncounterDirectory = process.env.POR_NATIVE_ENCOUNTER_TRACE_DIR;
  let nativeEncounterSession: string | undefined;
  const tracedNativeEncounters = new Set<string>();
  const tracedEncounterScopes = new Set<string>();
  const encounterArt = loadEncounterArt(encounterPlacements, encounterTrace ? (key, anchor, cursor, caller) => {
    if (!encounterTrace) return;
    const scope = `${key}:${cursor}:${caller}`;
    if (tracedEncounterScopes.has(scope)) return;
    try {
      appendFileSync(encounterTrace, JSON.stringify({ type: "encounter-scope-fallback", key, anchor, cursor, caller }) + "\n");
      tracedEncounterScopes.add(scope);
    } catch (error) {
      console.error("Cannot write encounter scope trace", error);
      encounterTrace = undefined;
    }
  } : undefined);
  const traceTiles = process.env.POR_TRACE_TILES === "1";
  const traceBattleTiles = process.env.POR_TRACE_BATTLE_TILES === "1";
  function perspectivePixels(frame = screen) {
    const pixels = Buffer.alloc(88 * 88);
    for (let row = 0; row < 88; row++) {
      const start = (24 + row) * frame.width + 24;
      pixels.set(frame.pixels.subarray(start, start + 88), row * 88);
    }
    return pixels;
  }
  const nativePicture = browser && standalone && pictures && (portraitKeys.length || characterSheetKeys.length)
    ? observeNativePictureArt(new Set(portraitKeys), new Set(characterSheetKeys), pictures, perspectivePixels) : undefined;
  const heldPortraitTrace = browser ? process.env.POR_HELD_PORTRAIT_TRACE : undefined;
  const pictureObserver = nativePicture ?? (heldPortraitTrace
    ? observeNativePictureArt(new Set(), new Set(), pictures ?? [], perspectivePixels) : undefined);
  let lastPortraitDraw: ReturnType<NonNullable<typeof pictureObserver>["presented"]>;
  const nativeEncounter = browser && standalone && pictures && hasEncounterArtwork
    ? observeNativeEncounterArt(encounterPlacements, perspectivePixels, pictures, viewportMark) : undefined;
  let codeWheelQuestion: number | undefined;
  let codeWheelAttempt: number | undefined;
  const combatPlacements = (battlefield: boolean) => [
    ...combatArt(screen, undefined, area, battleCursor, battlefield ? battleTerrain : undefined),
    ...(battlefield ? nativeCombat?.placements(screen, area, battleCursor) ?? [] : []),
  ];
  function strikeSignature(placements: CombatArtPlacement[]) {
    const attacks = placements.filter(([, , key]) =>
      attackKeys.has(key) || attackKeys.has(partyRecolorKey.exec(key)?.[1] ?? ""));
    return attacks.length ? JSON.stringify(attacks) : "";
  }
  const showFrame = (leads?: JournalLead[], attack?: CombatArtPlacement[], captureApproach = false, automaticCombat = false,
    durationMs?: number, effect?: { placement: TilePlacement; clean: Frame }, captureIllustration: boolean | string = false,
    message?: "status" | "combat" | "picture" | "palette") => {
    const native = screen;
    const presentation = effect?.clean ?? native;
    if (browser) {
      const glyphs = visibleGameText();
      const dialogue = glyphs.filter(([cell]) => cell >= 640 && cell < 960).sort(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("").toUpperCase();
      // Runes are never text: every word the game writes in its rune font stays in the picture,
      // as the game drew it, for the player to translate with the wheel (visibleGameRunes).
      const text = glyphs;
      const runes = visibleGameRunes();
      // Several auction outcomes share the same pause and native return address.
      const otherAuctionOutcome = area === 18 && battleCursor === 0xb240 && portraitCaller === 0xa839 &&
        !dialogue.startsWith("AMANANDOGREEXCHANGETHEWANDANDALARGEBAG");
      // Other dinner topics can end at the same pause and caller as the Pool story.
      const otherZhentilDinnerTopic = area === 28 && battleCursor === 0xb624 && portraitCaller === 0xb317 &&
        !dialogue.includes("THECOMMANDANTTELLSYOUASTORYABOUTTHATVERYPOOL");
      // The clerk's ordinary rewards and the campaign finale share a portrait pause.
      const otherCouncilReward = area === 8 && battleCursor === 0x9f21 && portraitCaller === 0x9a4a &&
        !dialogue.includes("YOURQUESTISOVER");
      const pictureCaller = otherAuctionOutcome || otherCouncilReward ? undefined : otherZhentilDinnerTopic ? 0xa7c2 : portraitCaller;
      // Each cave's first sighting and return visit share the native menu cursor.
      const caveRevisit =
        (area === 25 && battleCursor === 0x9c97 && !dialogue.includes("ALARGEDRAGONFLYSABOVEYOU")) ||
        (area === 27 && battleCursor === 0x9d9c && !dialogue.includes("ASMALLGROUPOFKOBOLDSENTERING"));
      // Cadorna's pleas and his hedge directions share the release menu.
      const captivePlea = area === 3 && battleCursor === 0xb0f6 && !dialogue.includes("IKNOWTHEWAYTHROUGHTHEHEDGE");
      const cadornaGatePlea = captivePlea && dialogue.includes("IKNOWHOWTOGETTHROUGHTHEMAINGATES");
      // The dungeon script reuses the same picture pause after either outcome.
      const cadornaSharedPause = area === 3 && battleCursor === 0x9bf8 && !dialogue.includes("ANALARMSTARTSRINGING");
      const cadornaAftermath = cadornaSharedPause && dialogue.includes("WITHAQUICKSTROKEYOURELEASEHIMFROMTHISPAIN");
      // The treasury's dialogue is printed before it joins the exit ambush's battle setup.
      const treasureAmbush = area === 24 && battleCursor !== undefined && battleCursor >= 0xab99 && battleCursor <= 0xabbd &&
        dialogue.startsWith("THEMINUTEYOUFINDTHETREASURE");
      const exitAmbush = area === 24 && (battleCursor === 0xaafb || battleCursor === 0xabbc) &&
        dialogue.startsWith("ASYOUEXITTHETEMPLE");
      const baneAmbushCursor = treasureAmbush ? 0xab06 : exitAmbush ? 0xaba7 : battleCursor;
      const portraitCursor = cadornaGatePlea ? 0xb110 : cadornaAftermath ? 0xb15c : caveRevisit || captivePlea || cadornaSharedPause
        ? undefined : baneAmbushCursor;
      // The dragon's arrival is narrated over the room before its native portrait is drawn.
      const dragonArrival = "portrait:area:7:ecl:995f:caller:a54b:PIC5.DAX:66:0:0";
      const arrivalPicture = area === 7 && battleCursor === 0x995f && portraitCaller === 0xa54b &&
        dialogue.includes("ANANCIENTBRONZEDRAGON,SURROUNDEDBYAFIERYAURA,RISES") && portraitKeys.includes(dragonArrival)
        ? dragonArrival : undefined;
      const scriptKey = `scene-illustration:area:${area}:ecl:${battleCursor?.toString(16)}${portraitCaller === undefined ? "" : `:caller:${portraitCaller.toString(16)}`}`;
      // The final reward uses the upper rows for the XP notice and the
      // bottom row for treasure actions, like the Kuto cache and Valhingen tombs.
      const councilRewardScreen = scriptKey === "scene-illustration:area:8:ecl:9f3f:caller:9a4a";
      const illustrationText = councilRewardScreen && finalCouncilReward
        ? [...glyphs].sort(([a], [b]) => a - b)
          .map(([, character]) => String.fromCharCode(character)).join("").toUpperCase()
        : baneCacheCue || scriptKey === "scene-illustration:area:20:ecl:ab42" ||
          scriptKey === "scene-illustration:area:29:ecl:9ffb" || scriptKey === "scene-illustration:area:10:ecl:a3e4" ||
          scriptKey === "scene-illustration:area:10:ecl:ad29" || scriptKey === "scene-illustration:area:10:ecl:b373" ||
          scriptKey === "scene-illustration:area:10:ecl:a09f" || scriptKey === "scene-illustration:area:31:ecl:9eff" ||
          scriptKey === "scene-illustration:area:31:ecl:9d3b"
          ? [...glyphs].sort(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join("").toUpperCase()
          : dialogue;
      // Look leaves the well's caption on screen after the party turns away.
      const wellLookAway = scriptKey === "scene-illustration:area:29:ecl:afa1" &&
        kutoWellLookFacing.get(`${livePosition?.x},${livePosition?.y}`) !== (explorationPosition?.facing ?? -1);
      // The caption persists after the party turns away from the cleared tower.
      const towerLookAway = scriptKey === "scene-illustration:area:10:ecl:a672" &&
        (livePosition?.x !== 5 || livePosition.y !== 9 || explorationPosition?.facing !== 4);
      // The post-combat floor note shares the giants' Parlay password-reading routine.
      const barracksFloorNote = scriptKey === "scene-illustration:area:4:ecl:9a5a:caller:a49f" &&
        livePosition?.x === 8 && livePosition.y === 0;
      // The maze watch and Scriptorium guards finish the nod at the same ECL cursor.
      let illustrationScope = finalCouncilReward && illustrationText.includes("VIEWTAKEPOOLSHAREEXIT")
        ? `${scriptKey}:cue:council-victory-payout` : scriptKey;
      const wellDaylight = "scene-illustration:area:29:ecl:afa1:cue:daylight";
      if (scriptKey === "scene-illustration:area:29:ecl:afa1" &&
          drawnPerspective?.native?.skyColor === 11 && portraitKeys.includes(wellDaylight)) {
        illustrationScope = wellDaylight;
      }
      if (baneCacheCue) illustrationScope = `${scriptKey}:cue:${baneCacheCue}`;
      // The ankheg captions survive into COMBAT's pauses. Their illustrations
      // belong to those timed pictures, before the battle notice takes over.
      if (message === "picture") {
        if (scriptKey === "scene-illustration:area:25:ecl:9d1c") {
          illustrationScope = "scene-illustration:area:25:ecl:9d0c";
        } else if (scriptKey === "scene-illustration:area:25:ecl:a818") {
          illustrationScope = "scene-illustration:area:25:ecl:a80f";
        }
      }
      if (area === 4 && battleCursor === 0x9b63 && explorationPosition) {
        const { x, y } = explorationPosition;
        if (x === 4 && y === 2) illustrationScope = "scene-illustration:area:4:ecl:9ed5:caller:a08a";
        else if (x === 13 && y === 12) illustrationScope = "scene-illustration:area:4:ecl:9ed5:caller:ac70";
      }
      // The clerk's threshold caption can remain in the text box after the party turns away.
      // On the first visit the script can move the camera before updating the party pose.
      const clerkEntryTransition = explorationPosition?.x === 4 && explorationPosition.y === 4 && explorationPosition.facing === 4;
      const clerkThreshold = battleCursor === 0x9b8a && portraitCaller === 0x9a4a && activeEcl === 8;
      if (clerkThreshold || (area === 8 && battleCursor === 0x9a4f && livePosition?.x === 4 && livePosition.y === 5 &&
          (explorationPosition?.facing === 6 || clerkEntryTransition))) {
        illustrationScope = "scene-illustration:area:8:ecl:9b8a:caller:9a4a";
      }
      // Yarash's secret doors share a caption routine across rooms.
      if (area === 23 && explorationPosition?.y === 12) {
        const { x } = explorationPosition;
        if ((x === 9 && scriptKey === "scene-illustration:area:23:ecl:9add:caller:9ab5") ||
            (x === 11 && scriptKey === "scene-illustration:area:23:ecl:9b07:caller:9ab5") ||
            ((x === 9 || x === 10) && scriptKey === "scene-illustration:area:23:ecl:9a04:caller:9c23")) {
          illustrationScope = `${scriptKey}:cue:lab-door`;
        }
      }
      const illustration = scene || wellLookAway || towerLookAway || barracksFloorNote ||
        (councilRewardScreen && !finalCouncilReward)
        ? undefined : matchScriptIllustration(
          typeof captureIllustration === "string" ? captureIllustration : illustrationScope, illustrationText, portraitKeys);
      if (captureIllustration && (!illustration || animation.at(-1)?.portrait === illustration)) return;
      const menu = menuText(text);
      // The overland map shares the native viewport blit and omits Area.
      const overlandMenu = menu === "CASTVIEWENCAMPSEARCHLOOK";
      // Menu and battle-state changes can precede the actual viewport redraw.
      if (!captureApproach && !attack && !effect && !captureIllustration && !message &&
          overlandMenu) nativePicture?.clear();
      // Runes the game writes in the picture box (the Sokal parchment, after CLEAR BOX) take the
      // place of its picture. The shipped game's pictures and runes are blank, so the held
      // portrait's pixels still match the box and would otherwise stay over the runes.
      if (runes.some(([cell]) => cell % 40 < 16 && cell < 16 * 40)) nativePicture?.clear();
      // The camp's exit script reaches the same Enter/Leave prompt from inside the camp.
      // In bundled data, the terrain draw can clear its picture before the prompt is reported.
      const campReturnKey = "portrait:area:17:ecl:9c49:PIC7.DAX:30:0:0";
      const campReturnPicture = area === 17 && portraitCursor === 0x9c49 && pictureCaller === undefined &&
        menu === "ENTERLEAVE" && dialogue.includes("YOUHAVESTUMBLEDUPONALARGENOMADCAMP") &&
        portraitKeys.includes(campReturnKey) ? campReturnKey : undefined;
      let picture = scene ? undefined : illustration ?? arrivalPicture ?? campReturnPicture ??
        nativePicture?.match(area, portraitCursor, pictureCaller) ??
        portraitArt(screen, area, portraitCursor, pictureCaller);
      // The bucket charge and waking giants share the pause at 9a5a/a732.
      const bucketChargeBase = "portrait:area:3:PIC5.DAX:56:0:0";
      if (!scene && area === 3 && portraitCursor === 0x9a5a && pictureCaller === 0xa732 &&
          dialogue.includes("THEGIANTSWHOPLACEDTHEBUCKETTHERECHARGE") && portraitKeys.includes(bucketChargeBase) &&
          (!picture || picture === "portrait:area:3:ecl:9a5a:caller:a732:PIC5.DAX:56:0:0")) {
        picture = bucketChargeBase;
      }
      // The street charge shares the barracks fight's script from the battle notice onward.
      const streetGiants = "portrait:area:4:ecl:a289:PIC5.DAX:56:0:0";
      if (picture && area === 4 && portraitCursor === 0xa2a7 &&
          dialogue.includes("THEYCOMERUNNINGTOWARDYOU") && portraitKeys.includes(streetGiants)) {
        picture = streetGiants;
      }
      // Keep the tower's ordinary troll portrait at the shared battle notice.
      const towerTrolls = "portrait:area:5:ecl:9fa2:PIC5.DAX:31:0:0";
      if (picture && area === 5 && portraitCursor === 0xa052 && dialogue.includes("YOUSEEAPACKOFTROLLS") &&
          !dialogue.includes("THEYSEEMUNAWAREOFYOU") && portraitKeys.includes(towerTrolls)) {
        picture = towerTrolls;
      }
      // From the game's own data the sheet's head and body come from the game's portrait draws, for
      // as long as nothing is drawn over them (on the roll, the name, Head Body Keep and View).
      const characterSheet = !scene && !picture ?
        nativePicture?.matchSheet(screen) ?? characterSheetArt(screen) : undefined;
      const enhanced = new Frame(presentation.width, presentation.height);
      enhanced.pixels.set(presentation.pixels);
      for (const [x, y, , width, height] of characterSheet ?? []) {
        for (let row = y; row < y + height; row++) {
          const start = row * presentation.width + x;
          enhanced.pixels.fill(0, start, start + width);
        }
      }
      // The next encounter can be drawn while the guest still shows the room description.
      const entranceIllustration = /:cue:(?:roofless-ruin|l-shaped-ruin|charged-tower|zombie-tower-exterior)$/.test(illustration ?? "");
      const encounterArea = !scene && (picture === undefined || entranceIllustration) ? area : undefined;
      // From the game's own data the fight is on screen once the game has drawn its battle frame, as
      // from the original files: "A battle begins..." still shows the approach over the scenery.
      const nativeBattlefield = nativeBattleActive && hasBattlefieldFrame();
      // A script illustration is the Enhanced picture for a passage the game shows over the view it
      // already drew: the game draws nothing, so the approach it drew before is still on screen when the
      // passage ends. The Textile House drum (area 2, 9c81 and abd2 from 9c8b) is shown between the
      // hobgoblins' approach and "A battle begins...", where the 1.3 files find the hobgoblin again (#139).
      // A picture the game draws itself still clears it.
      if (nativeBattlefield || (picture !== undefined && picture !== illustration && !entranceIllustration)) nativeEncounter?.clear();
      const encounter = nativeEncounter?.match(encounterArea, battleCursor, portraitCaller) ??
        encounterArt(presentation, enhanced, encounterArea, !captureApproach, battleCursor,
          [drawnPerspective?.pixels, priorPerspectiveDraw], portraitCaller);
      if (entranceIllustration && encounter) picture = undefined;
      const portrait = typeof picture === "string" ? picture : undefined;
      if (captureApproach) {
        // The guest may change script scope while the same actor cel remains on screen.
        const unscopedApproach = lastApproach?.replace(/:ecl:[a-f0-9]{4}(?::caller:[a-f0-9]{4})?(?=:SPRIT)/, "");
        if (!encounter || encounter[2] === lastApproach || encounter[2] === unscopedApproach) return encounter;
        lastApproach = encounter[2];
      }
      const tiles: [number, number, string][] = [];
      const tileInventory: TileInventoryCell[] | undefined = traceTiles ? [] : undefined;
      const overlandScript = activeEcl >= 25 && activeEcl <= 27;
      // A wilderness approach keeps the map while the guest changes to the encounter menu.
      const overlandEncounter = nativeOverland &&
        (encounter !== undefined || menu === "COMBATWAITFLEEPARLAY");
      const phlanArrival = overlandScript ? identifyPhlanPrompt(dialogue, menu) : undefined;
      const sokalPrompt = activeEcl === 0 ? identifySokalPrompt(dialogue, menu, harborTicket) : undefined;
      const battlefield = nativeBattlefield || hasBattlefieldBorder(presentation);
      // The icon editor also uses the viewport blit. Its two preview labels
      // stay in place while the player changes parts, palette, and size.
      const iconEditor = text.filter(([cell]) =>
        (cell >= 248 && cell <= 250) || (cell >= 488 && cell <= 490))
        .sort(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("") === "oldnew";
      const exploration = menu.startsWith("AREACASTVIEWENCAMP") ||
        (area === 1 && menu === "RELEASEANIMALSLEAVE") ||
        (area === 24 && menu === "DESTROYALTARLEAVEIT");
      // A blocked step and the prompts of a wilderness landmark (the pyramid's door) keep the map too: the
      // guest is still on the overland screen, its menu hidden or replaced. Bundled data draws that screen
      // with blank pixels, which equal the blank scenery the guest drew last, so the pixels cannot tell
      // the map from a first-person view; the guest's own state can.
      const overlandPrompt = nativeOverland && !exploration && !iconEditor;
      const overlandMap = overlandMenu || overlandEncounter || overlandPrompt;
      let perspective = false;
      let tileArea = area;
      let nativeScenery: PresentationAnimationFrame["nativeScenery"];
      let arrivalPosition: typeof explorationPosition;
      const harborRoadSign = activeEcl === 0 && (
        dialogue === "YOUAREOUTSIDETHECITYHALL.THECITYCLERKWAITSINSIDETOAWARDCOMMISSIONS." ||
        dialogue === "YOUAREBYTHEGATEWAYTOTHEUNSETTLEDAREAS.THECITYWATCHEYESYOUSUSPICIOUSLY.");
      // Landmark and arrival illustrations can cover a native view used for navigation.
      const illustratedExploration = illustration !== undefined && (exploration || harborRoadSign ||
        illustration === "scene-illustration:area:0:ecl:9b68" ||
        illustration === "scene-illustration:area:0:ecl:9af0" ||
        illustration === "scene-illustration:area:0:ecl:ae31:caller:9ad2");
      if (area !== undefined && !scene && !overlandMap && !iconEditor && (picture === undefined || illustratedExploration) && !battlefield) {
        const pixels = perspectivePixels();
        // The original game can redraw scenery while the menu is hidden,
        // including mid-transition at a doorway.
        const nativeDraw = drawnPerspective?.pixels.equals(pixels) && viewportUntouched(drawnPerspective.mark) ? drawnPerspective : undefined;
        // At Podal's west boundary the destination ECL draws the scenery
        // before the guest copies that area's number into the area record.
        if ((area === 18 && nativeDraw?.localEcl === 26) || (area === 26 && nativeDraw?.localEcl === 18)) {
          tileArea = nativeDraw.localEcl;
        }
        // The Nomad Camp also draws its entrance before updating the area record.
        if (area === 26 && nativeDraw?.localEcl === 17) tileArea = 17;
        // The return ferry draws the New Phlan pier while the area record
        // still points to West or East Overland.
        if ((area === 26 || area === 27) && nativeDraw?.localEcl === 0) tileArea = 0;
        perspective = Boolean(encounter || exploration || nativeDraw ||
          (previousPerspective?.area === area && previousPerspective.pixels.equals(pixels) && viewportUntouched(previousPerspective.mark)));
        let native = nativeDraw ?? (drawnPerspective?.localEcl === tileArea ? drawnPerspective : undefined);
        // The actor blit replaces the viewport capture but does not carry camera metadata.
        // Reuse the camera only if removing the actor restores the entire native view.
        if (!native?.native && encounter && lastLocalPerspective && lastLocalPerspective.localEcl === tileArea &&
            lastLocalPerspective.pixels.equals(perspectivePixels(enhanced))) {
          native = lastLocalPerspective;
        }
        if (perspective && native?.native) {
          const { localEcl } = native;
          // The first destination view can precede the update to the party's area record.
          if (localEcl !== undefined && ((area === 26 || area === 27) && overlandArrivalAreas.has(localEcl) ||
              activeEcl === localEcl && travelRoadArrivals.get(area)?.includes(localEcl))) {
            const { x, y, facing } = native.native;
            arrivalPosition = { area: localEcl, x, y, facing };
            tileArea = localEcl;
          }
          // Encamp can clear the view before the next prompt replaces the exploration menu.
          // The bundled scenery's blank pixels only distinguish the clear by its extra writes.
          const viewportCleared = !encounter && !viewportUntouched(native.mark) && !pixels.some(Boolean);
          nativeScenery = { ...native.native, area: tileArea ?? area, viewportCleared: viewportCleared || undefined };
        }
        if (!leads) previousPerspective = perspective ? { area, pixels, mark: viewportMark() } : undefined;
      } else if (!leads) {
        previousPerspective = undefined;
      }
      if ((tileKeys.size || traceTiles) && tileArea !== undefined && perspective) {
        const pixels = Buffer.alloc(64);
        // The first-person view has an 11-by-11 interior with an eight-pixel border.
        for (let y = 24; y < 112; y += 8) {
          for (let x = 24; x < 112; x += 8) {
            for (let row = 0; row < 8; row++) {
              const start = (y + row) * presentation.width + x;
              pixels.set(enhanced.pixels.subarray(start, start + 8), row * 8);
            }
            const key = `tile:${tileArea}:${createHash("sha256").update(pixels).digest("hex")}`;
            if (tileInventory) tileInventory.push([x, y, key, pixels.toString("hex")]);
            if (tileKeys.has(key)) tiles.push([x, y, key]);
          }
        }
      }
      for (const [cell] of text) {
        const x = (cell % 40) * 8;
        const offset = Math.floor(cell / 40) * 8 * presentation.width + x;
        for (let y = 0; y < 8; y++) enhanced.pixels.fill(0, offset + y * presentation.width, offset + y * presentation.width + 8);
      }
      const nativeMarkers = battlefield && !scene ? nativeSelection?.placements() : undefined;
      let aimCell: [number, number] | undefined;
      if (battlefield && menu.replace(/\s/g, "").startsWith("(USECURSORKEYS)")) {
        const [marker] = nativeMarkers ?? [];
        aimCell = nativeSelection ? marker && [marker[0], marker[1]] : manualAimCell(presentation);
      }
      const combat = attack || (!scene && !perspective)
        ? [
          ...combatArt(presentation, enhanced, area, battleCursor, battlefield ? battleTerrain : undefined, iconEditor, aimCell),
          // From the game's own data the screen has no pixels to match: the editor's icons, like the
          // battlefield's, come from the composer and draw calls.
          ...(battlefield || iconEditor ? nativeCombat?.placements(presentation, area, battleCursor) ?? [] : []),
        ] : [];
      const combatSelections: TilePlacement[] = nativeMarkers && selectionKeys.has(nativeSelectionKey) ? nativeMarkers : [];
      let attackArt = attack;
      if (nativeMarkers) {
        const selected = ([left, top, , , , width = 24, height = 24]: CombatArtPlacement) =>
          // Manual Aim highlights a single cell even inside a large creature.
          !(aimCell && (width > 24 || height > 24)) &&
          nativeMarkers.some(([x, y]) => x >= left && x < left + width && y >= top && y < top + height);
        for (const actor of combat) actor[4] = selected(actor);
        if (attackArt) {
          attackArt = attackArt.map((actor): CombatArtPlacement => {
            const [x, y, key, reflected, , width, height] = actor;
            return [x, y, key, reflected, selected(actor), width, height];
          });
        }
      } else if (!nativeSelection || iconEditor) {
        for (const [x, y, , , highlighted, width = 24, height = 24] of attack ?? combat) {
          if (!highlighted || width % 24 || height % 24) continue;
          const corner = presentation.get(x, y);
          const block = nativeCombat?.bevel(x, y) ?? (corner === 15 ? 25 : iconEditor && corner === 7 ? 153 : undefined);
          const key = `combat-selection:COMSPR.DAX:${block}`;
          if (!selectionKeys.has(key)) continue;
          for (let dy = 0; dy < height; dy += 24) {
            for (let dx = 0; dx < width; dx += 24) combatSelections.push([x + dx, y + dy, key]);
          }
        }
      }
      if (!nativeSelection && aimCell && !combatSelections.length && selectionKeys.has(nativeSelectionKey)) {
        const [x, y] = aimCell;
        const largeActor = combat.some(([left, top, , , , width = 24, height = 24]) =>
          (width > 24 || height > 24) && x >= left && x + 24 <= left + width && y >= top && y + 24 <= top + height);
        if (largeActor || isEmptyAimCell(presentation, x, y)) {
          combatSelections.push([x, y, nativeSelectionKey]);
          // Manual Aim can place the native bevel where there is no unit.
          for (let row = 0; row < 24; row++) {
            const start = (y + row) * enhanced.width + x;
            if (battleTerrain) enhanced.pixels.set(battleTerrain.pixels.subarray(start, start + 24), start);
            else enhanced.pixels.fill(0, start, start + 24);
          }
        }
      }
      const battleTiles: TilePlacement[] = !scene && battlefield && nativeTerrainTiles
        ? nativeBattleTerrain?.placements() ?? [] : [];
      const animationCombat = effect ? combat : attackArt ?? [];
      const fallbackProps = !nativeTerrainTiles && !scene && battlefield
        ? (attack || effect ? animationCombat : combat).filter(([, , key]) => randomCombatKey.test(key))
        : [];
      const liveActors = (placements: CombatArtPlacement[]) => fallbackProps.length
        ? placements.filter(([, , key]) => !randomCombatKey.test(key)) : placements;
      const observedProps = !scene && battlefield ? nativeBattleTerrain?.propPlacements() ?? [] : undefined;
      const battleProps = observedProps && [...observedProps, ...fallbackProps.filter(([x, y]) =>
        !observedProps.some(([left, top]) => x === left && y === top))];
      const battleTileInventory: TileInventoryCell[] | undefined = traceBattleTiles && !attack ? [] : undefined;
      if (((!nativeTerrainTiles && battleTileKeys.size) || battleTileInventory) && !scene && battlefield) {
        const pixels = Buffer.alloc(64);
        const selectedActors = battleTileInventory ? combat.filter(([, , , , highlighted]) => highlighted) : [];
        const selectionCells = new Set<number>();
        for (const [x, y] of nativeMarkers ?? []) {
          for (let row = 0; row < 24; row += 8) {
            for (let column = 0; column < 24; column += 8) selectionCells.add((y + row) * presentation.width + x + column);
          }
        }
        // Combat terrain appears within the guest's left-hand battle panel.
        for (let y = 8; y < 176; y += 8) {
          for (let x = 8; x < 176; x += 8) {
            if (battleTileInventory && !nativeSelection && x <= 152 && y <= 152 && presentation.get(x, y) === 15) {
              let borderMatches = true;
              for (let offset = 0; offset < 24 && borderMatches; offset++) {
                borderMatches = presentation.get(x + offset, y) === combatHighlightPixel(offset, 0) &&
                  presentation.get(x + offset, y + 23) === combatHighlightPixel(offset, 23) &&
                  presentation.get(x, y + offset) === combatHighlightPixel(0, offset) &&
                  presentation.get(x + 23, y + offset) === combatHighlightPixel(23, offset);
              }
              if (borderMatches) {
                for (let row = 0; row < 24; row += 8) {
                  for (let column = 0; column < 24; column += 8) selectionCells.add((y + row) * presentation.width + x + column);
                }
              }
            }
            for (let row = 0; row < 8; row++) {
              const start = (y + row) * enhanced.width + x;
              pixels.set(enhanced.pixels.subarray(start, start + 8), row * 8);
            }
            const key = pixels.some(Boolean) ? `battle-tile:${createHash("sha256").update(pixels).digest("hex")}` : undefined;
            // The selection bevel is drawn into the guest cell. It remains
            // on screen, but its pixels cannot identify the terrain below it.
            if (key && battleTileInventory && !selectionCells.has(y * presentation.width + x) && !selectedActors.some(([left, top, , , , width = 24, height = 24]) =>
              x < left + width && x + 8 > left && y < top + height && y + 8 > top)) {
              battleTileInventory.push([x, y, key, pixels.toString("hex")]);
            }
            if (!nativeTerrainTiles) {
              // Prefer the guest terrain draw before a target marker or actor covers the cell.
              const terrainKey = capturedTerrainKeys.get(y * screen.width + x) ?? key;
              // The standalone prop replaces its underlying 3×3 RANDCOM
              // artwork, just as it does in the native terrain observer.
              if (terrainKey && battleTileKeys.has(terrainKey) && !battleProps?.some(([left, top]) =>
                x >= left && x < left + 24 && y >= top && y < top + 24)) battleTiles.push([x, y, terrainKey]);
            }
          }
        }
      }
      const travelFrame = !scene && !battlefield && !leads && !attack;
      const districtRoad = travelFrame && (!dialogue || harborRoadSign) && !encounter && menu === "AREACASTVIEWENCAMPSEARCHLOOK" &&
        travelRoadAreas.has(activeEcl) && nativeScenery?.mapId === activeEcl;
      const quay = activeEcl === 0 && nativeScenery?.mapId === 0 && nativeScenery.y === 1 &&
        nativeScenery.x >= 11 && nativeScenery.x <= 15 && menu === "AREACASTVIEWENCAMPSEARCHLOOK" && isQuayDialogue(dialogue)
        ? { x: nativeScenery.x, facing: nativeScenery.facing, ticket: harborTicket } : undefined;
      // Script variables 0x49f0 and 0x49f1 hold the square the party stood on before its last
      // command: the game's exploration loop copies the live position into them just before it
      // carries out each command, so that a script can send the party back. After a move they are
      // one square behind until the next command. The frame reports the live position, which is
      // also what the game draws from and prints in its status line.
      const explored = arrivalPosition ?? (perspective && explorationPosition && explorationPosition.area === tileArea
        ? { ...explorationPosition, ...livePosition } : undefined);
      // The map id and walls come from the map the guest drew, as the journal comes from its text.
      const mapped = explored && automap ? automap.locate(explored, nativeScenery) : explored;
      const state = {
        // Classic shows each pixel in the colour the game's palette registers give it (int 10h AH=10h, #82).
        frame: Buffer.from(encodePng(native, displayPalette())).toString("base64"),
        enhancedFrame: Buffer.from(encodePng(enhanced, enhancedPalette)).toString("base64"),
        // With POR_FRAME_PIXELS=1: the pixel values the game drew, one byte each, for checks that
        // compare them with the colours a picture shows (npm run verify:palette).
        pixels: framePixels ? Buffer.from(native.pixels).toString("base64") : undefined,
        scene,
        // Present while the game is inside its code-wheel routine, waiting for the word.
        codeWheel,
        // "read": the game has stopped in a blocking keyboard read and goes no further without a key.
        // "poll": the game only looked whether a key is down and carries on by itself if none is.
        prompt: promptKind,
        // True when the game goes no further until a key arrives: at a blocking read, and at the
        // poll inside its menu routine, which loops on that poll for as long as the menu is up.
        // Every other poll is one look at the keyboard from code that carries on without a key.
        awaitsKey: awaitsKey || undefined,
        // With POR_WATCH_ECL: the watched script variables, by address in hexadecimal.
        scriptVariables,
        // With POR_WATCH_DS: the watched bytes of the data segment, by offset in hexadecimal.
        dataBytes,
        text,
        // The rune glyphs on screen (cell, glyph code, colour). They are in both pictures.
        runes: runes.length ? runes : undefined,
        // The code-wheel question whose runes and path the game has the player translate from the printed
        // Journal: 9 (SAVIOR) is Journal Entry 35's, which the old lizard man asks for.
        codeWheelHint: friendWordPrompt ? 9 : undefined,
        portrait,
        characterSheet,
        classicPortrait: Array.isArray(picture),
        classicPortraitSources: Array.isArray(picture) && picture.length ? picture : undefined,
        classicPortraitArea: Array.isArray(picture) ? area : undefined,
        classicPortraitCursor: Array.isArray(picture) ? portraitCursor : undefined,
        classicPortraitCaller: Array.isArray(picture) ? pictureCaller : undefined,
        perspective,
        overlandMap: overlandMap && !scene && picture === undefined && !characterSheet && !battlefield || undefined,
        overlandTerrain: encounter && !scene && picture === undefined && !battlefield &&
          drawnOverlandTerrain?.center[0] === nativeOverland?.x && drawnOverlandTerrain?.center[1] === nativeOverland?.y
          ? drawnOverlandTerrain : undefined,
        travelPosition: overlandMenu && !dialogue && !encounter && !scene && picture === undefined && !characterSheet && !battlefield && !leads && !attack
          ? travelPosition : undefined,
        phlanArrival: travelFrame ? phlanArrival : undefined,
        sokalPrompt: travelFrame ? sokalPrompt : undefined,
        sokalQuay: travelFrame ? quay : undefined,
        districtRoad: districtRoad || undefined,
        travelPolling: nonblockingPoll && !menu && travelFrame && (
          picture === undefined && (
            (overlandScript || travelRoadScripts.has(activeEcl)) && !dialogue ||
            identifyPhlanPrompt(dialogue) !== undefined) ||
          isSokalBoatHandoff(dialogue, activeEcl, harborTicket)) || undefined,
        nativeScenery,
        exploration: mapped,
        encounter,
        tiles,
        combatArt: liveActors(combat),
        combatSelections: combatSelections.length ? combatSelections : undefined,
        combatEffect: effect?.placement,
        battleTiles,
        battleProps,
        battleTileInventory,
        panelFrame: scene ? undefined : standalone ? visiblePanelFrame() : matchPanelFrame(screen),
        tileInventory,
        textColors: enhancedPalette,
        codeWheelQuestion,
        codeWheelAttempt,
        automaticCombat: automaticCombat || undefined,
        presentationPolling: presentationPolling || undefined,
        developerVictoryAvailable: !leads && developerVictoryAvailable || undefined,
        journal: leads && { objective: currentObjective(leads, trackedId), leads,
          trackedId: trackedJournalObjective(leads, trackedId) },
      };
      // POR_TRACE_STANDALONE: count what this frame still shows of the original pictures. Observes only.
      standaloneTrace?.frame({
        enhanced, journal: Boolean(leads), codeWheelPrompt: codeWheelQuestion !== undefined, scene, battlefield, portrait,
        classicPortrait: Array.isArray(picture) ? { area, cursor: portraitCursor, caller: pictureCaller, sources: picture } : undefined,
        characterSheet: Boolean(characterSheet), overlandMap: Boolean(state.overlandMap),
        travelMap: Boolean(state.travelPosition) && !(attack || captureApproach || effect || captureIllustration || message),
        perspective, nativeScenery,
        encounter: encounter?.[2], combatArt: combat.length, battleTiles, combatSelections, panelFrame: state.panelFrame,
      });
      // POR_NARRATION_LEDGER: the artwork this frame resolved, for pairing with the narration. Observes only.
      narrationLedger?.frame({ awaitsKey: awaitsKey && !(attack || captureApproach || effect || captureIllustration || message), scene, portrait, encounter: encounter?.[2],
        classicPortrait: Array.isArray(picture) ? { area, cursor: portraitCursor, caller: pictureCaller } : undefined, view: perspective,
        runes: runes.some(([cell]) => cell % 40 < 16 && cell < 16 * 40) });
      shownPalette = paletteState().join();
      presentedText = JSON.stringify(text);
      if (message === "status") {
        // A message the game shows on the bottom line and clears by itself: the whole screen as it
        // stands during the pause, for as long as the game pauses.
        animation.push({ ...state, durationMs, statusMessage: true });
      } else if (message === "palette") {
        // The screen in colours the game set and holds through a pause without asking for a key (the
        // title's flash): Classic shows it for as long as the game pauses. Enhanced has its own colours.
        animation.push({ ...state, durationMs, classicOnly: true });
      } else if (message === "picture") {
        // One picture of an animation the game plays without asking for a key, for as long as the
        // game shows it.
        animation.push({ ...state, durationMs });
      } else if (attack || captureApproach || effect || captureIllustration) {
        // Reports and status lines can be the only visible record of a game action.
        if (message !== "combat" && animation.length >= 12) {
          const flight = animation.findIndex(flightFrame);
          if (flight < 0) return;
          animation.splice(flight, 1);
        }
        animation.push({ frame: state.frame, enhancedFrame: state.enhancedFrame, portrait: captureIllustration ? portrait : undefined,
          text: state.text, combatArt: liveActors(animationCombat),
          combatSelections: state.combatSelections,
          combatEffect: state.combatEffect,
          battleTiles, battleProps, panelFrame: state.panelFrame, perspective,
          nativeScenery: state.nativeScenery, exploration: state.exploration,
          overlandMap: state.overlandMap, overlandTerrain: state.overlandTerrain, encounter, tiles, durationMs,
          enhancedOnly: typeof captureIllustration === "string" || undefined });
      } else {
        mappedPosition = mapped;
        if (automap) {
          if (mapped) automap.record(mapped);
          if (automap.revision !== sentAutomap) {
            sentAutomap = automap.revision;
            console.log(`POR_AUTOMAP ${JSON.stringify({ revision: sentAutomap, maps: automap.snapshot() })}`);
          }
        }
        console.log(`POR_FRAME ${JSON.stringify({ ...state,
          animation: animation.length ? animation.splice(0) : undefined })}`);
        immediateStrike = undefined;
        lastAttack = "";
        lastCombatReport = "";
        lastCombatStats = "";
        lastApproach = undefined;
      }
      if (captureApproach) return encounter;
    } else {
      writeFileSync("out/por-live.png", leads ? encodePng(journalFrame(leads, trackedId)) : encodePng(screen, displayPalette()));
    }
  };
  const showJournal = (leads: JournalLead[]) => {
    showFrame(leads);
    if (browser) return;
    const objective = currentObjective(leads, trackedId);
    console.log(`Adventure Journal\nCurrent objective: ${objective.title}\n  ${objective.nextStep}`);
    const available = leads.filter(isOpenObjective);
    for (const lead of leads) {
      const index = available.indexOf(lead);
      const number = index < 0 ? "" : `[${index + 1}] `;
      console.log(`${number}${lead.title}\n  ${lead.detail}`);
    }
  };
  let diskMenuDepth = 0;
  let previousKovelTransition: number | undefined;
  const openJournal = () => {
    showJournal(journal());
    while (true) {
      if (!browser) process.stdout.write("Journal [J to close, track N, track auto]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command.toLowerCase() === "j" || command === "escape") return;
      if (command.toLowerCase() === "track auto") {
        trackedId = undefined;
        showJournal(journal());
        continue;
      }
      const match = /^track (\d+)$/i.exec(command);
      if (!match) continue;
      const leads = journal();
      const lead = leads.filter(isOpenObjective)[Number(match[1]) - 1];
      if (lead) {
        trackedId = lead.id;
        showJournal(leads);
      } else console.log("Choose a number from the journal's active objectives.");
    }
  };
  let keyQueue: BiosKey[] | undefined;
  // A replay can record when each prompt happened, in game progress, and a later replay can ask at
  // those same moments. POR_PROMPT_SCHEDULE_OUT writes the record; POR_PROMPT_SCHEDULE_IN follows one.
  type PromptKind = "read" | "poll" | "flush" | "drain";
  const scheduleOut = process.env.POR_PROMPT_SCHEDULE_OUT;
  const schedule: { kind: PromptKind; at: [number, number] }[] | undefined = process.env.POR_PROMPT_SCHEDULE_IN
    ? readFileSync(process.env.POR_PROMPT_SCHEDULE_IN, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line)) : undefined;
  let prompts = 0;
  let scheduleWaits = 0;
  let progressStart: [number, number] | undefined;
  const progress = (): [number, number] => {
    progressStart ??= [gameProgress.dice, gameProgress.text];
    return [gameProgress.dice - progressStart[0], gameProgress.text - progressStart[1]];
  };
  const requestKey = (cpu: Cpu, keys: BiosKey[], blocking: boolean, legacyFlush = false): void => {
    keyQueue = keys;
    if (cpu.steps < startAt || keys.length) return;
    // The page shows the publisher screen itself, over the game's title, and a key there brings the
    // title up (tools/play.js). The game's own publisher screen is passed without asking, as it is
    // before POR_LIVE_AT, however fast the runner got there: on version 1.3 a key that ends the
    // publisher screen ends the title too, so the player would never see it (#127).
    if (browser && !blocking && scene === "scene:publisher") return;
    const kind: PromptKind = legacyFlush || (!blocking && returnsTo(cpu, 0, code.flushPollResumes)) ? "flush"
      : !blocking && returnsTo(cpu, 0, code.drainPollResumes) ? "drain" : blocking ? "read" : "poll";
    const expected = schedule?.[prompts];
    if (expected) {
      // Ask where the recorded replay asked: at the same kind of moment, once the game has got as far.
      const now = progress();
      const reached = now.every((count, index) => count >= expected.at[index]!);
      if (kind !== "read" && (kind !== expected.kind || !reached)) {
        if (traceKeys && ++scheduleWaits % 25 === 0) {
          const words = Array.from({ length: 10 }, (_, index) => cpu.read16(cpu.ss, (cpu.sp + index * 2) & 0xffff).toString(16));
          console.error(`POR_SCHEDULE prompt ${prompts}: recorded ${expected.kind} at ${expected.at}, now ${kind} at ${now}; stack ${words.join(" ")}`);
        }
        return;
      }
      scheduleWaits = 0;
    } else if (!blocking && cpu.steps < nextPrompt) return;
    // The game empties its keyboard buffer before it draws a new screen (FlushKeys) and after
    // each key it reads (GetKey). Those polls only discard type-ahead. On DOS they find
    // nothing and return at once, so the player is never asked for a key there.
    const atDiscardPoll = legacyFlush || (!blocking &&
      (returnsTo(cpu, 0, code.flushPollResumes) || returnsTo(cpu, 0, code.drainPollResumes)));
    if (atDiscardPoll && !promptAtDiscardPolls) return;
    const battlefield = hasBattlefieldBorder(screen) ||
      (standalone && cpu.read8(unit.data, data.gameState) === 5 && hasBattlefieldFrame());
    const battlePoll = !blocking && isAt(cpu, cpu.ip, code.keyPressedPoll) && battlefield;
    const combatMenu = developerCombat ? menuText(visibleGameText()) : "";
    // Combat can pause on a hostile's first turn before the party gets a menu.
    developerVictoryAvailable = developerCombat && canWinDeveloperCombat(cpu) &&
      ((battlePoll && combatMenu === "") || (combatMenu.startsWith("MOVEVIEWAIM") && battlefield));
    const kovelTransition = kovelJournalTransition(cpu, unit.data);
    if (kovelTransition !== undefined && kovelTransition !== previousKovelTransition) journal();
    previousKovelTransition = kovelTransition;
    let automaticCombat = false;
    if (browser) {
      const segment = cpu.read16(unit.data, data.eclGlobals + 2);
      const offset = cpu.read16(unit.data, data.eclGlobals);
      travelPosition = captureOverlandTravel(cpu, segment, offset);
      activeEcl = cpu.read8(unit.data, data.eclBlock);
      // Map and sector loads can yield before the next menu is drawn.
      nonblockingPoll = !blocking && isAt(cpu, cpu.ip, code.keyPressedPoll);
      // ECL 0 sets a ticket flag and a separate boat destination.
      const harborFlag = (address: number) => cpu.read16(segment, offset + eclGlobalOffset(address));
      harborTicket = segment && harborFlag(0x4a01) === 1 ? harborFlag(0x4ac4) === 0 ? "sokal" : "other" : "none";
      area = segment || offset ? cpu.read16(segment, offset + eclGlobalOffset(0x49f2)) : undefined;
      scriptVariables = watchedVariables.length && (segment || offset)
        ? Object.fromEntries(watchedVariables.map((address) => [address.toString(16), cpu.read16(segment, offset + eclGlobalOffset(address))]))
        : undefined;
      dataBytes = watchedData.length ? Object.fromEntries(watchedData.map((offset) => [offset.toString(16), cpu.read8(unit.data, offset)])) : undefined;
      // Valjevo draws the dungeon hedge before copying the selected ECL
      // back to the area record. Other transition art uses the record's scope.
      if (area === 5 && activeEcl === 3) area = 3;
      const positionArea = area;
      const liveX = cpu.read8(cpu.ds, data.cameraX), liveY = cpu.read8(cpu.ds, data.cameraY);
      livePosition = liveX < 16 && liveY < 16 ? { x: liveX, y: liveY } : undefined;
      explorationPosition = (segment || offset) && positionArea !== undefined ? {
        area: positionArea,
        x: cpu.read16(segment, offset + eclGlobalOffset(0x49f0)),
        y: cpu.read16(segment, offset + eclGlobalOffset(0x49f1)),
        facing: cpu.read8(cpu.ds, data.facing) & 7,
        // The native viewport reads these camera bytes during movement and
        // load. The area record can lag behind on the first frame of a save.
        ...(positionArea === 0 ? { cameraX: cpu.read8(cpu.ds, data.cameraX), cameraY: cpu.read8(cpu.ds, data.cameraY) } : {}),
      } : undefined;
      // The ECL interpreter suspends at this cursor while the battle runs.
      captureEclContext(cpu);
      if (battlePoll) {
        // Original combat turn code (ovl08:0252, 02a0) stores the active actor and tests its Quick flag.
        const actorOffset = cpu.read16(unit.data, data.actor);
        const actorSegment = cpu.read16(unit.data, data.actor + 2);
        const menu = menuText(visibleGameText());
        automaticCombat = (!menu || menu.startsWith("MOVE/ATTACK,")) &&
          (actorOffset !== 0 || actorSegment !== 0) &&
          cpu.read8(actorSegment, (actorOffset + 0x10f) & 0xffff) !== 0;
      }
    }
    if (scheduleOut) appendFileSync(scheduleOut, JSON.stringify({ kind, at: progress() }) + "\n");
    prompts++;
    promptKind = kind === "read" ? "read" : "poll";
    awaitsKey = kind === "read" || (kind === "poll" && returnsTo(cpu, 0, code.menuPollResumes) && !menuTimeLimit(cpu));
    showFrame(undefined, undefined, false, automaticCombat);
    while (true) {
      if (!browser) process.stdout.write("Game [J journal, :quit, key]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command === ":poll" && automaticCombat || command === ":travel-poll" && nonblockingPoll) {
        nextPrompt = cpu.steps + 1_000_000;
        return;
      }
      if (command.startsWith(":map-label")) {
        if (mappedPosition) automap?.label(mappedPosition, command.slice(":map-label".length));
        showFrame(undefined, undefined, false, automaticCombat);
        continue;
      }
      if (command.startsWith(":automap-import ")) {
        try { automap?.adopt(JSON.parse(command.slice(":automap-import ".length))); }
        catch { /* An unreadable browser copy is ignored. */ }
        showFrame(undefined, undefined, false, automaticCombat);
        continue;
      }
      if (diskMenuDepth === 0 && command.toLowerCase() === "j") {
        const menu = menuText(visibleGameText());
        // These original menus already assign J to a game action.
        if (!/^APPRAISE:.*JEWELRY/.test(menu) && !menu.includes("JOINTYRANTHRAXUS")) {
          openJournal();
          showFrame(undefined, undefined, false, automaticCombat);
          continue;
        }
      }
      const developerVictory = command === developerVictoryCommand && developerVictoryAvailable;
      const enableCodeWheel = command === ":enable-code-wheel";
      const gameCommand = enableCodeWheel ? "backspace" : developerVictory ? "alt-q"
        : command.startsWith("key ") ? command.slice(4) : command || "enter";
      const key = getKey(gameCommand);
      if (key === undefined) {
        console.log("Enter a letter, digit, arrow name, home, pageup, end, pagedown, enter, space, escape, tab, or backspace.");
        continue;
      }
      if (!developerVictory && !enableCodeWheel && ++keysGiven === swallowKey) {
        console.error(`POR_KEY ${JSON.stringify(command)} swallowed (POR_SWALLOW_KEY=${swallowKey})`);
        showFrame(undefined, undefined, false, automaticCombat);
        continue;
      }
      if (developerVictory) {
        const defeated = winDeveloperCombat(cpu);
        console.error(`POR_DEVELOPER_VICTORY ${defeated} hostiles`);
      }
      // With POR_TRACE_KEYS=1, say where each key went. A key given at a discard poll is thrown away.
      if (traceKeys) console.error(`POR_KEY ${JSON.stringify(command)}${atDiscardPoll ? " discarded" : ""}`);
      if (recording) appendFileSync(recording, `${cpu.steps}:${key.toString(16).padStart(4, "0")}\n`);
      // The recorded replay gave this press at a moment when the game only discards keys, and this
      // build did not stop there. Drop the press and ask again for the one the game is waiting for.
      if (kind === "read" && (expected?.kind === "flush" || expected?.kind === "drain")) {
        if (traceKeys) console.error(`POR_KEY ${JSON.stringify(command)} dropped`);
        return requestKey(cpu, keys, blocking);
      }
      if (enableCodeWheel) cpu.enforceCodeWheel = true;
      keys.push({ step: cpu.steps, word: key });
      // Animated travel on Rolf's tour can exceed 30 million instructions
      // between keyboard reads.
      cpu.stepBudget = Math.max(cpu.stepBudget, cpu.steps + liveIdleBudget);
      // Let menu transitions and the scrolling dialogue draw before prompting again.
      nextPrompt = cpu.steps + 1_000_000;
      return;
    }
  };
  return {
    requestKey,
    /**
     * The legacy key lists hold presses that the first release's FlushKeys used to swallow under
     * POR_INPUT_COMPAT. Version 1.3's FlushKeys discards nothing, so the runner calls this where the
     * game calls FlushKeys, and the press that the first release would have dropped is dropped here.
     */
    legacyFlush(cpu: Cpu): void {
      if (!promptAtDiscardPolls || !keyQueue) return;
      const waiting = keyQueue.length;
      requestKey(cpu, keyQueue, false, true);
      keyQueue.length = waiting;
    },
    captureEncounterDraw: browser && (nativeEncounterDirectory || hasEncounterArtwork) ? (cpu: Cpu) => {
      nativePicture?.clear();
      nativeEncounter?.presented();
      const captureAnimation = hasEncounterArtwork && animation.length < 12;
      if (scene || area === undefined || (!nativeEncounterDirectory && !captureAnimation)) return;
      captureEclContext(cpu);
      const before = animation.length;
      const replacement = captureAnimation ? showFrame(undefined, undefined, true)?.[2] : undefined;
      if (animation.length > before) {
        approachClip = animation.at(-1)!;
        approachClip.approach = true;
        approachClipMs = 0;
      }
      if (nativeEncounterDirectory) {
        const cursor = battleCursor?.toString(16).padStart(4, "0") ?? "unknown";
        const digest = createHash("sha256").update(perspectivePixels()).digest("hex");
        const signature = `${area}-${cursor}-${portraitCaller}-${replacement}-${digest}`;
        if (!tracedNativeEncounters.has(signature)) {
          try {
            nativeEncounterSession ??= mkdtempSync(join(nativeEncounterDirectory, "encounters-"));
            const file = `${area}-${cursor}-${tracedNativeEncounters.size}.png`;
            writeFileSync(join(nativeEncounterSession, file), encodePng(screen));
            appendFileSync(join(nativeEncounterSession, "observations.jsonl"), JSON.stringify({
              type: "native-encounter-draw", file, area, cursor: battleCursor, caller: portraitCaller,
              viewportHash: digest,
              replacement: captureAnimation || !hasEncounterArtwork ? replacement ?? null : undefined,
            }) + "\n");
            tracedNativeEncounters.add(signature);
          } catch (error) {
            console.error("Cannot write the native encounter trace", error);
            nativeEncounterDirectory = undefined;
          }
        }
      }
    } : undefined,
    nativeCombat,
    nativeSelection,
    nativeBattleTerrain,
    nativePicture: pictureObserver,
    captureNativePicture: pictureObserver ? (cpu: Cpu) => {
      lastPortraitDraw = pictureObserver.presented(cpu);
    } : undefined,
    traceHeldPortrait: heldPortraitTrace ? (cpu: Cpu) => {
      if (!lastPortraitDraw) return;
      const segment = cpu.read16(unit.data, data.eclGlobals + 2);
      if (!segment) return;
      const offset = cpu.read16(unit.data, data.eclGlobals);
      const cursor = authoredScriptPosition(cpu, cpu.read16(unit.data, data.eclCursor));
      const callerSegment = cpu.read16(unit.data, data.eclReturn + 2);
      const caller = callerSegment ? authoredScriptPosition(cpu,
        cpu.read16(callerSegment, cpu.read16(unit.data, data.eclReturn))) : undefined;
      appendFileSync(heldPortraitTrace, JSON.stringify({
        area: cpu.read16(segment, offset + eclGlobalOffset(0x49f2)), cursor, caller,
        ...lastPortraitDraw, finishedAtMs: (cpu.dx * 65536 + cpu.ax) * 10,
        viewport: createHash("sha256").update(perspectivePixels()).digest("hex"),
      }) + "\n");
    } : undefined,
    nativeEncounter,
    nativeEffects,
    resetBattleTerrain() {
      capturedTerrainKeys.clear();
      battleTerrain?.pixels.fill(0);
    },
    captureOverlandTerrain: browser ? (cpu: Cpu, column: number, row: number, slot: number) => {
      // The native overland drawer fills a five by five sheet of 24px squares.
      if (column === 0 && row === 0) {
        drawingOverlandTerrain = [];
        drawingOverlandPosition = captureOverlandTravel(cpu, cpu.read16(unit.data, data.eclGlobals + 2),
          cpu.read16(unit.data, data.eclGlobals));
      }
      if (column !== (drawingOverlandTerrain.length % 5) * 3 || row !== Math.floor(drawingOverlandTerrain.length / 5) * 3) return;
      drawingOverlandTerrain.push(slot);
      if (drawingOverlandTerrain.length === 25) {
        const position = drawingOverlandPosition;
        drawnOverlandTerrain = position ? { slots: drawingOverlandTerrain.slice(), center: [position.x, position.y] } : undefined;
      }
    } : undefined,
    captureBattleTerrain: battleTerrain ? (cpu: Cpu, column: number, row: number, picture: number, surface: "overland" | "combat") => {
      if (column > 18 || row > 18 || column % 3 || row % 3) return;
      const x = 8 + column * 8;
      const y = 8 + row * 8;
      // Overlay 36's blitter and viewport copy use a far pointer to the
      // offscreen picture. Each eight-pixel group stores four plane bytes.
      const offset = cpu.read16(cpu.ds, data.offscreen);
      const segment = cpu.read16(cpu.ds, data.offscreen + 2);
      const width = cpu.read16(segment, offset + 2);
      if (width < column + 3 || cpu.read16(segment, offset) < row * 8 + 24) return;
      const stride = width * 4;
      const planeMasks = Array.from({ length: 4 }, (_, plane) => cpu.read8(cpu.ds, data.planeMasks + plane) & 15);
      for (let dy = 0; dy < 24; dy++) {
        const start = (y + dy) * screen.width + x;
        for (let group = 0; group < 3; group++) {
          const source = offset + 0x17 + (row * 8 + dy) * stride + (column + group) * 4;
          const planes = planeMasks.map((_, plane) => cpu.read8(segment, source + plane));
          for (let pixel = 0; pixel < 8; pixel++) {
            const bit = 0x80 >> pixel;
            battleTerrain.pixels[start + group * 8 + pixel] = planes.reduce((color, bits, plane) =>
              bits & bit ? color | planeMasks[plane]! : color, 0);
          }
        }
      }
      if (!nativeTerrainTiles || traceBattleDraw) {
        const cells: TileInventoryCell[] = [];
        const pixels = Buffer.alloc(64);
        for (let dy = 0; dy < 24; dy += 8) for (let dx = 0; dx < 24; dx += 8) {
          for (let scan = 0; scan < 8; scan++) {
            const start = (y + dy + scan) * screen.width + x + dx;
            pixels.set(battleTerrain.pixels.subarray(start, start + 8), scan * 8);
          }
          const key = `battle-tile:${createHash("sha256").update(pixels).digest("hex")}`;
          if (!nativeTerrainTiles) capturedTerrainKeys.set((y + dy) * screen.width + x + dx, key);
          if (traceBattleDraw && pixels.some(Boolean)) cells.push([dx, dy, key, pixels.toString("hex")]);
        }
        const draw = JSON.stringify({ picture, surface, cells });
        if (cells.length && !tracedBattleTerrain.has(draw)) {
          tracedBattleTerrain.add(draw);
          console.error(`POR_BATTLE_TERRAIN ${draw}`);
        }
      }
    } : undefined,
    capturePerspective: browser ? (cpu: Cpu, localScenery: boolean) => {
      nativePicture?.clear();
      nativeEncounter?.clear();
      const pixels = perspectivePixels();
      if (drawnPerspective && !drawnPerspective.pixels.equals(pixels)) priorPerspectiveDraw = drawnPerspective.pixels;
      drawnPerspective = { pixels, mark: viewportMark(), localEcl: localScenery ? cpu.read8(unit.data, data.eclBlock) : undefined,
        native: localScenery ? captureNativeExploration(cpu, standalone) : undefined };
      if (drawnPerspective.native && !drawnPerspective.native.areaView) lastLocalPerspective = drawnPerspective;
    } : undefined,
    captureCombatEffectUnderlay: browser && effectKeys.length ? (cpu: Cpu, scratchPicture: boolean) => {
      pendingEffect = undefined;
      // At the native call site the far destination pointer precedes the
      // source pointer, flags, picture index, row and column.
      const argument = (offset: number) => cpu.read16(cpu.ss, (cpu.sp + offset) & 0xffff);
      const offset = argument(0), segment = argument(2), row = argument(12), column = argument(14);
      const width = cpu.read16(segment, offset + 2);
      if (argument(8) !== 5 || row > 18 || column > 18 || width < column + 3 ||
          cpu.read16(segment, offset) < row * 8 + 24) return;
      const key = scratchPicture ? nativeEffects?.draw(argument(10))
        : nativeEffects?.drawDirect(cpu, argument(4), argument(6), argument(10));
      if (nativeEffects && !key) return;
      const planeMasks = Array.from({ length: 4 }, (_, plane) => cpu.read8(cpu.ds, data.planeMasks + plane) & 15);
      const background = new Uint8Array(24 * 24);
      for (let dy = 0; dy < 24; dy++) {
        for (let group = 0; group < 3; group++) {
          const source = offset + 0x17 + ((row * 8 + dy) * width + column + group) * 4;
          const planes = planeMasks.map((_, plane) => cpu.read8(segment, source + plane));
          for (let pixel = 0; pixel < 8; pixel++) {
            const bit = 0x80 >> pixel;
            background[dy * 24 + group * 8 + pixel] = planes.reduce((color, bits, plane) =>
              bits & bit ? color | planeMasks[plane]! : color, 0);
          }
        }
      }
      pendingEffect = { x: 8 + column * 8, y: 8 + row * 8, background, key };
    } : undefined,
    /**
     * The castle ending's animation loop has drawn a frame (#121). The loop runs by the DOS clock for
     * many seconds and reads no key, so without this the page shows one still picture throughout.
     * Each new picture becomes a clip lasting as long as the game showed it (one pass of the loop is
     * one DOS clock hundredth). A dozen clips go to the page in a frame it plays and then answers
     * with ":poll", as for a fight the computer plays; the game's own timing is untouched.
     */
    /**
     * The loop has played its last cycle (#125). The pictures still held here go to the page now,
     * not with the next prompt, which can come seconds later.
     */
    presentPictureLoopEnd: browser ? (cpu: Cpu) => {
      if (cpu.steps < startAt || !pictureLoopClip) return;
      pictureLoopClip.durationMs = Math.max(10, pictureLoopPasses * 10);
      pictureLoopPasses = 0;
      pictureLoopShown = undefined;
      captureEclContext(cpu);
      // What comes next is another loop, or none: the page paces these as the last batch came.
      handOverPictureLoop(animation.length);
    } : undefined,
    presentPictureLoop: browser ? (cpu: Cpu) => {
      if (cpu.steps < startAt) return;
      pictureLoopPasses++;
      // The helper's saved BP is the loop's frame: the loop keeps the picture block in [bp+8] and the
      // number of the member it draws, from 1, in [bp-0x41]. The member is known from any game data,
      // the port's own included, where the screen has no original pixels to compare.
      const loopBp = cpu.read16(cpu.ss, cpu.bp);
      const block = cpu.read8(cpu.ss, (loopBp + 8) & 0xffff);
      const member = cpu.read8(cpu.ss, (loopBp - 0x41) & 0xffff) - 1;
      if (`${block}:${member}` === pictureLoopShown) return;
      if (pictureLoopShown === undefined) pictureLoopBatch = 2;
      pictureLoopShown = `${block}:${member}`;
      if (pictureLoopClip) pictureLoopClip.durationMs = pictureLoopPasses * 10;
      pictureLoopPasses = 0;
      captureEclContext(cpu);
      if (animation.length >= pictureLoopBatch) {
        const next = Math.min(12, pictureLoopBatch * 2);
        handOverPictureLoop(next);
        pictureLoopBatch = next;
      }
      showFrame(undefined, undefined, false, false, 100, undefined, false, "picture");
      pictureLoopClip = animation.at(-1);
      // Enhanced shows the pose drawn for this member where there is one (tools/portrait-art.ts endingPortraitKey).
      const pose = `portrait:area:7:FINAL5.DAX:${block}:${member}:0`;
      if (pictureLoopClip && portraitKeys.includes(pose)) pictureLoopClip.portrait = pose;
    } : undefined,
    captureCombatStrike: browser && attackKeys.size > 0 ? (cpu: Cpu) => {
      if (scene) return;
      captureEclContext(cpu);
      if (!(nativeBattleActive && hasBattlefieldFrame()) && !hasBattlefieldBorder(screen)) return;
      const placements = combatPlacements(true);
      const signature = strikeSignature(placements);
      if (!signature || signature === lastAttack) return;
      // Keep the screen that was actually shown. A wand can restore the ready sprite
      // before the delay that normally captures an attack.
      showFrame(undefined, placements, false, false, undefined, undefined, false, "combat");
      const clip = animation.at(-1);
      if (clip) immediateStrike = { signature, clip };
      lastAttack = signature;
    } : undefined,
    /**
     * The game pauses (Delay, `ms` long) with palette registers no picture sent so far has shown: the
     * title's flash sets register 1 to light blue, light cyan and white, a pause each, and puts it back
     * before it next looks at the keyboard (slice 1, 0765 to 07cf). Classic holds the screen in those
     * colours as long as the game does (#82).
     */
    capturePaletteHold: browser ? (cpu: Cpu, ms: number) => {
      // Only where the game changed colours and nothing else: a picture still being drawn waits for its frame.
      if (cpu.steps < startAt || cellWriteMark(0, 0, 40, 25) !== paletteMark) return;
      if (paletteState().join() === shownPalette) {
        // The colours of the picture just held (one flash ends on light blue and the next begins on it):
        // that picture is held the longer.
        if (paletteClip && animation.at(-1) === paletteClip) paletteClip.durationMs = (paletteClip.durationMs ?? 0) + ms;
        return;
      }
      captureEclContext(cpu);
      showFrame(undefined, undefined, false, false, ms, undefined, false, "palette");
      paletteClip = animation.at(-1);
    } : undefined,
    captureCompletedScriptText: browser ? (cpu: Cpu) => {
      const archive = cpu.read8(unit.data, data.eclArchive);
      const block = cpu.read8(unit.data, data.eclBlock);
      const cursor = authoredScriptPosition(cpu, cpu.read16(unit.data, data.eclCursor), unit.data);
      const scope = transientScriptIllustrations.get(`${archive}:${block}:${cursor.toString(16)}`);
      if (scope && portraitKeys.includes(scope)) showFrame(undefined, undefined, false, false, 1200, undefined, scope);
    } : undefined,
    capturePresentationDelay: browser ? (cpu: Cpu, effectDelay = false, messageMs?: number, pauseMs?: number) => {
      // The game pauses on the encounter picture it just drew (DELAY between APPROACHes, Rolf's
      // three steps among them): the page holds that picture as long as the original pauses, the
      // game speed times 225 ms, where it held each for 120 ms (#129).
      // Only while the screen is still that picture: once the game has drawn something else, the
      // pause holds that (#164).
      pauseOutcome = "nothing";
      if (pauseMs !== undefined && approachClip && animation.at(-1) === approachClip && presentedText === JSON.stringify(visibleGameText())) {
        approachClipMs += pauseMs;
        approachClip.durationMs = approachClipMs;
        pauseOutcome = "held the last picture";
        return;
      }
      const draw = effectDelay ? pendingEffect : undefined;
      pendingEffect = undefined;
      if (messageMs !== undefined) {
        // "Must be Readied" and the like: on the bottom line for the length of the pause, then gone
        // before the game next asks for a key. Without this frame the player never sees it.
        captureEclContext(cpu);
        showFrame(undefined, undefined, false, false, messageMs, undefined, false, "status");
        pauseOutcome = "status";
        return;
      }
      if (scene) {
        pauseOutcome = "scene";
        return;
      }
      if (draw) pauseOutcome = "effect";
      if (draw) {
        const { x, y, background } = draw;
        const key = draw.key ?? matchCombatEffect(screen, x, y, background);
        if (key) {
          const previous = animation.at(-1)?.combatEffect;
          if (previous?.[0] === x && previous[1] === y && previous[2] === key) return;
          if (isHoldEffect(key)) {
            // The guest repeats the four phases at each target before reporting the result.
            for (let i = animation.length - 1; i >= 0; i--) {
              const phase = animation[i]!.combatEffect;
              if (!phase || phase[0] !== x || phase[1] !== y || !isHoldEffect(phase[2])) break;
              if (phase[2] === key) return;
            }
          }
          const impact = isImpact(key);
          const flightCount = animation.filter(flightFrame).length;
          if ((!impact && flightCount >= 6) || animation.length >= 12) {
            // Preserve a flight's launch and arrival when a long trajectory
            // fills the presentation queue with intermediate positions.
            const family = combatEffectFlightFamily(key);
            const continuesFlight = !impact && previous && combatEffectFlightFamily(previous[2]) === family &&
              Math.abs(previous[0] - x) <= 8 && Math.abs(previous[1] - y) <= 8;
            let replaceable = impact ? animation.findIndex(flightFrame)
              : continuesFlight ? animation.length - 1 : -1;
            if (replaceable < 0) return;
            if (continuesFlight) {
              // Remove the intermediate point that leaves the smallest gap.
              let next: TilePlacement = [x, y, key];
              let gap = Infinity;
              const visits = new Map([[key, 1]]);
              let start = animation.length;
              for (; start > 0; start--) {
                const point = animation[start - 1]!.combatEffect;
                if (!point || combatEffectFlightFamily(point[2]) !== family) break;
                const phase = point[2];
                visits.set(phase, (visits.get(phase) ?? 0) + 1);
              }
              let removesUniquePhase = true;
              for (let i = animation.length - 1; i > start; i--) {
                const point = animation[i]!.combatEffect!;
                const before = animation[i - 1]!.combatEffect!;
                const distance = Math.max(Math.abs(next[0] - before[0]), Math.abs(next[1] - before[1]));
                const uniquePhase = visits.get(point[2]) === 1;
                if ((!uniquePhase && removesUniquePhase) || (uniquePhase === removesUniquePhase && distance <= gap)) {
                  gap = distance;
                  replaceable = i;
                  removesUniquePhase = uniquePhase;
                }
                next = point;
              }
            }
            animation.splice(replaceable, 1);
          }
          const clean = new Frame(screen.width, screen.height);
          clean.pixels.set(screen.pixels);
          for (let row = 0; row < 24; row++) {
            clean.pixels.set(background.subarray(row * 24, row * 24 + 24), (y + row) * clean.width + x);
          }
          captureEclContext(cpu);
          showFrame(undefined, undefined, false, false, impact ? 110 : 55, { placement: [x, y, key], clean });
          return;
        }
      }
      captureEclContext(cpu);
      const queueFull = animation.length >= 12 && !animation.some(flightFrame);
      const battlefield = (nativeBattleActive && hasBattlefieldFrame()) || hasBattlefieldBorder(screen);
      // Combat prints action and result text below the actor's stats in
      // the right-hand panel. The guest clears it before the next key read.
      const battleGlyphs = battlefield ? visibleGameText() : [];
      const reportGlyphs = battleGlyphs
        .filter(([cell, char]) => cell >= 423 && cell < 860 && cell % 40 >= 23 && char > 32)
        .sort(([a], [b]) => a - b);
      const report = reportGlyphs.map(([cell, char]) => `${cell}:${char}`).join(",");
      // The actor's stats above it: the same report for another actor (a second orc that surrenders)
      // is a report of its own (#179).
      const stats = battleGlyphs.filter(([cell, char]) => cell < 423 && cell % 40 >= 23 && char > 32)
        .sort(([a], [b]) => a - b).map(([cell, char]) => `${cell}:${char}`).join(",");
      const newReport = report.length > 0 && (report !== lastCombatReport || stats !== lastCombatStats);
      if (queueFull && !newReport) {
        pauseOutcome = "queue full";
        return;
      }
      // These captions can clear within a single input.
      const kovelIllustration = area === 14 && (battleCursor === 0xa238 || battleCursor === 0x9e63 ||
        battleCursor === 0x9d52 || battleCursor === 0xa2d9 || battleCursor === 0xa585 || battleCursor === 0xa6a5 ||
        battleCursor === 0xa779 || battleCursor === 0xa84f || battleCursor === 0xac23 || battleCursor === 0xb566);
      const mendorReading = area === 15 && battleCursor === 0x9956 &&
        (portraitCaller === 0x9f03 || portraitCaller === 0x9f71 || portraitCaller === 0xa1e6);
      const koboldTruce = area === 13 && portraitCaller === 0xaf11 && (battleCursor === 0xb06f || battleCursor === 0xb0a5);
      const councilClosing = area === 8 && battleCursor === 0xaf78 &&
        (portraitCaller === 0xa891 || portraitCaller === 0x9a4a);
      if (!queueFull && (kovelIllustration || mendorReading || koboldTruce || councilClosing)) {
        showFrame(undefined, undefined, false, false, 1200, undefined, true);
        pauseOutcome = "illustration";
        return;
      }
      const placements = combatPlacements(battlefield);
      const signature = strikeSignature(placements);
      if (newReport) {
        // The report already includes this strike when the ready sprite has not yet returned.
        if (immediateStrike?.signature === signature) {
          const clipIndex = animation.indexOf(immediateStrike.clip);
          if (clipIndex >= 0) animation.splice(clipIndex, 1);
          immediateStrike = undefined;
        }
        const wandPose = "combat:area:20:CPIC2.DAX:222:ecl:a0b4";
        const reportText = battleGlyphs.filter(([, char]) => char > 32)
          .sort(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
        // The guest keeps the standing frame during the mage's wand action.
        const actionArt = attackKeys.has(wandPose) && /LEVEL3MUUSESANITEMITEM:WAND/i.test(reportText)
          ? placements.map((placement): CombatArtPlacement => {
            const [x, y, key, reflected, selected, width, height] = placement;
            return key === "combat:area:20:CPIC2.DAX:94:ecl:a0b4" && selected
              ? [x, y, wandPose, reflected, selected, width, height] : placement;
          }) : placements;
        showFrame(undefined, actionArt, false, false, 1000, undefined, false, "combat");
        pauseOutcome = "report";
      } else if (signature && signature !== lastAttack) {
        showFrame(undefined, placements);
        pauseOutcome = "strike";
      } else if (!signature && !report && area !== undefined) {
        pauseOutcome = "approach";
        const before = animation.length;
        showFrame(undefined, undefined, true);
        // Whatever else a pause outside a fight leaves on screen (the party walked on between the
        // script's DELAYs through the bugbear's gate, "The Whole Party Is Healed"): the screen as it
        // stands, for as long as the game pauses, unless the page has it already (#164, #81).
        if (animation.length === before && pauseMs !== undefined && !battlefield && presentedText !== JSON.stringify(visibleGameText())) {
          showFrame(undefined, undefined, false, false, pauseMs, undefined, false, "picture");
          pauseOutcome = "picture";
          // A further pause on the same screen holds it longer, as for an approach.
          approachClip = animation.at(-1);
          approachClipMs = pauseMs;
        }
      }
      lastCombatReport = report;
      lastCombatStats = stats;
      lastAttack = signature;
    } : undefined,
    /** What the last pause led to: a picture for the page, a held one, or nothing (POR_TRACE_PAUSES). */
    pauseOutcome: () => pauseOutcome,
    openJournal,
    enterDiskMenu: () => { diskMenuDepth++; },
    leaveDiskMenu: () => { diskMenuDepth--; },
    setScene: (id: string | undefined) => { scene = id; },
    setCodeWheelQuestion: (question: number | undefined, attempt?: number) => {
      codeWheelQuestion = question;
      codeWheelAttempt = attempt;
    },
    setCodeWheel: (question: CodeWheelQuestion | undefined) => { codeWheel = question; },
    tracked: () => trackedId,
    restoreTracked: (id: string | undefined) => { trackedId = id; },
  };
}
