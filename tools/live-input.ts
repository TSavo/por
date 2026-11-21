import { appendFileSync, mkdtempSync, readFileSync, readSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { captureNativeExploration, type NativeExploration } from "./native-exploration.js";
import { captureOverlandTravel, identifyPhlanPrompt, identifySokalPrompt, isQuayDialogue, isSokalBoatHandoff,
  type SokalQuay, type TravelState } from "./overland-travel.js";
import { createHash } from "node:crypto";
import { Frame } from "../src/lib/ega.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Cpu } from "../src/cpu/machine.js";
import { currentObjective, isOpenObjective, kovelJournalTransition, trackedJournalObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { BiosKey } from "../src/runtime/dos.js";
import { gameProgress } from "../src/runtime/far.js";
import { journalFrame, screen, visibleGameText } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { combatEffectFlightFamily, loadCombatEffects, combatHighlightPixel, loadCombatArtMatcher, monsterCombatKey, partyCombatKey, partyRecolorKey, type CombatArtPlacement } from "./combat-art.js";
import { loadCharacterSheetArt, loadPortraitArt, matchScriptIllustration } from "./portrait-art.js";
import { loadEncounterArt, type EncounterPlacement } from "./encounter-art.js";
import { canWinDeveloperCombat, developerVictoryCommand, winDeveloperCombat } from "./developer-combat.js";
import type { Automap, ExploredPosition } from "./automap.js";
import { authoredScriptAddress, code, data, eclGlobalOffset, isAt, returnsTo, segment as unit } from "../src/runtime/bindings.js";

const controls: Record<string, number> = {
  enter: 0x1c0d, escape: 0x011b, up: 0x4800, down: 0x5000, left: 0x4b00, right: 0x4d00,
  home: 0x4700, pageup: 0x4900, end: 0x4f00, pagedown: 0x5100,
  space: 0x3920, tab: 0x0f09, backspace: 0x0e08,
  "alt-q": 0x1000, "alt-m": 0x3200,
};
const scanRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const firstScans = [2, 16, 30, 44];
const liveIdleBudget = 150_000_000;
const overlandArrivalAreas = new Set([0, 2, 10, 14, 18, 24, 31]);
const travelRoadAreas = new Set([0, 2, 9, 18]);
const travelRoadArrivals = new Map([[0, [8, 11, 20, 21]], [2, [15]], [9, [6]], [18, [9, 29]]]);
const travelRoadScripts = new Set([...travelRoadAreas, ...[...travelRoadArrivals.values()].flat()]);
export interface PresentationAnimationFrame {
  frame: string;
  enhancedFrame: string;
  combatArt: CombatArtPlacement[];
  combatSelections?: TilePlacement[];
  combatEffect?: TilePlacement;
  battleTiles: TilePlacement[];
  panelFrame?: PanelFrameStamp[];
  text: [number, number, number][];
  perspective?: boolean;
  nativeScenery?: NativeExploration & { area: number };
  exploration?: ExploredPosition;
  overlandMap?: boolean;
  encounter?: EncounterPlacement;
  tiles?: TilePlacement[];
  durationMs?: number;
}
type TilePlacement = [x: number, y: number, key: string];
export type PanelFrameStamp = [x: number, y: number, kind: "rail-x" | "rail-y" | "stud"];
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

/** Terminal control for the translated runner. Journal input stays on the host. */
export function liveInput(startAt: number, journal: () => JournalLead[], recording?: string, automap?: Automap) {
  let nextPrompt = startAt;
  let trackedId: string | undefined;
  let scene: string | undefined;
  let area: number | undefined;
  let travelPosition: TravelState | undefined;
  let nonblockingPoll = false;
  let developerVictoryAvailable = false;
  let activeEcl: number;
  let harborTicket: SokalQuay["ticket"] = "none";
  let explorationPosition: PresentationAnimationFrame["exploration"];
  let mappedPosition: ExploredPosition | undefined;
  let sentAutomap = -1;
  let battleCursor: number | undefined;
  let portraitCaller: number | undefined;

  function captureEclContext(cpu: Cpu) {
    const dataSegment = unit.data;
    // Artwork is keyed by script positions in the first release's numbering.
    const archive = cpu.read8(dataSegment, data.eclArchive), block = cpu.read8(dataSegment, data.eclBlock);
    battleCursor = authoredScriptAddress(archive, block, cpu.read16(dataSegment, data.eclCursor));
    // The original ECL interpreter stores its active return word through a pointer in its data.
    const offset = cpu.read16(dataSegment, data.eclReturn);
    const segment = cpu.read16(dataSegment, data.eclReturn + 2);
    portraitCaller = segment === 0 ? undefined : authoredScriptAddress(archive, block, cpu.read16(segment, offset));
  }
  let drawnPerspective: { pixels: Buffer; localEcl?: number; native?: NativeExploration } | undefined;
  let lastLocalPerspective: typeof drawnPerspective;
  let priorPerspectiveDraw: Buffer | undefined;
  let previousPerspective: { area: number; pixels: Buffer } | undefined;
  const browser = process.env.POR_BROWSER_PLAY === "1";
  const developerCombat = process.env.POR_DEV_COMBAT === "1";
  // Replays recorded before 2026-11-21 answered the game's discard polls with a key press.
  // They set this until each is re-recorded with one press per input.
  const promptAtDiscardPolls = process.env.POR_INPUT_COMPAT === "discard-poll-prompt";
  const traceKeys = process.env.POR_TRACE_KEYS === "1";
  const tileKeys = new Set((process.env.POR_TILE_ART_KEYS ?? "").split(",").filter(Boolean));
  const battleTileKeys = new Set((process.env.POR_BATTLE_TILE_KEYS ?? "").split(",").filter(Boolean));
  const traceBattleDraw = process.env.POR_TRACE_BATTLE_DRAW === "1";
  const battleTerrain = browser && (battleTileKeys.size || traceBattleDraw) ? new Frame(screen.width, screen.height) : undefined;
  const tracedBattleTerrain = new Set<string>();
  const selectionKeys = new Set((process.env.POR_COMBAT_SELECTION_KEYS ?? "").split(",").filter(Boolean));
  const effectKeys = (process.env.POR_COMBAT_EFFECT_KEYS ?? "").split(",").filter(Boolean);
  const matchCombatEffect = loadCombatEffects(effectKeys);
  const isHoldEffect = (key: string) => /:(?:9|137)(?::flip-x)?$/.test(key);
  const isImpact = (key: string) => isHoldEffect(key) || /:(?:10|138)(?::flip-x)?$/.test(key) || /:(?:11|139)$/.test(key);
  const flightFrame = (frame: PresentationAnimationFrame) => frame.combatEffect && !isImpact(frame.combatEffect[2]);
  let pendingEffect: { x: number; y: number; background: Uint8Array } | undefined;
  const materialKeys = new Set((process.env.POR_COMBAT_MATERIAL_KEYS ?? "").split(",").filter(Boolean));
  const combatArt = loadCombatArtMatcher((process.env.POR_COMBAT_ART_KEYS ?? "").split(",").filter(Boolean), undefined, materialKeys);
  const attackKeys = new Set((process.env.POR_COMBAT_ART_KEYS ?? "").split(",")
    .filter((key) => Number(monsterCombatKey.exec(key)?.[3] ?? partyCombatKey.exec(key)?.[2]) >= 128));
  const animation: PresentationAnimationFrame[] = [];
  let lastAttack = "";
  let lastCombatReport = "";
  let lastApproach: string | undefined;
  const portraitKeys = (process.env.POR_PORTRAIT_ART_KEYS ?? "").split(",").filter(Boolean);
  const portraitArt = loadPortraitArt(portraitKeys, browser);
  const characterSheetArt = loadCharacterSheetArt((process.env.POR_CHARACTER_SHEET_ART_KEYS ?? "").split(",").filter(Boolean));
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
  const showFrame = (leads?: JournalLead[], attack?: CombatArtPlacement[], captureApproach = false, automaticCombat = false,
    durationMs?: number, effect?: { placement: TilePlacement; clean: Frame }) => {
    const native = screen;
    const presentation = effect?.clean ?? native;
    if (browser) {
      const glyphs = visibleGameText();
      const dialogue = glyphs.filter(([cell]) => cell >= 640 && cell < 960).sort(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("").toUpperCase();
      // The parchment uses the original rune font inside the picture while
      // the surrounding dialogue and party list use the normal game font.
      const text = dialogue.includes("THELASTPARTISEATENAWAY") ? glyphs.filter(([cell]) => {
        const column = cell % 40;
        const row = Math.floor(cell / 40);
        return column < 1 || column >= 16 || row < 1 || row >= 16;
      }) : glyphs;
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
      // Bane's treasure and exit ambushes converge on the same battle setup.
      const treasureAmbush = area === 24 && (battleCursor === 0xaba7 || battleCursor === 0xabbd) &&
        dialogue.startsWith("THEMINUTEYOUFINDTHETREASURE");
      const portraitCursor = cadornaGatePlea ? 0xb110 : cadornaAftermath ? 0xb15c : caveRevisit || captivePlea || cadornaSharedPause
        ? undefined : treasureAmbush ? 0xab06 : battleCursor;
      // The dragon's arrival is narrated over the room before its native portrait is drawn.
      const dragonArrival = "portrait:area:7:ecl:995f:caller:a54b:PIC5.DAX:66:0:0";
      const arrivalPicture = area === 7 && battleCursor === 0x995f && portraitCaller === 0xa54b &&
        dialogue.includes("ANANCIENTBRONZEDRAGON,SURROUNDEDBYAFIERYAURA,RISES") && portraitKeys.includes(dragonArrival)
        ? dragonArrival : undefined;
      const scriptKey = `scene-illustration:area:${area}:ecl:${battleCursor?.toString(16)}${portraitCaller === undefined ? "" : `:caller:${portraitCaller.toString(16)}`}`;
      // The final reward uses the treasure screen's upper rows for its text.
      const illustrationText = scriptKey === "scene-illustration:area:8:ecl:9f3f:caller:9a4a"
        ? glyphs.filter(([cell]) => cell < 640).sort(([a], [b]) => a - b)
          .map(([, character]) => String.fromCharCode(character)).join("").toUpperCase()
        : dialogue;
      // The maze watch and Scriptorium guards finish the nod at the same ECL cursor.
      let illustrationScope = scriptKey;
      if (area === 4 && battleCursor === 0x9b63 && explorationPosition) {
        const { x, y } = explorationPosition;
        if (x === 4 && y === 2) illustrationScope = "scene-illustration:area:4:ecl:9ed5:caller:a08a";
        else if (x === 13 && y === 12) illustrationScope = "scene-illustration:area:4:ecl:9ed5:caller:ac70";
      }
      const illustration = scene ? undefined : matchScriptIllustration(illustrationScope, illustrationText, portraitKeys);
      let picture = scene ? undefined : illustration ??
        arrivalPicture ?? portraitArt(screen, area, portraitCursor, pictureCaller);
      const characterSheet = !scene && !picture ? characterSheetArt(screen) : undefined;
      const enhanced = new Frame(presentation.width, presentation.height);
      enhanced.pixels.set(presentation.pixels);
      for (const [x, y, , width, height] of characterSheet ?? []) {
        for (let row = y; row < y + height; row++) {
          const start = row * presentation.width + x;
          enhanced.pixels.fill(0, start, start + width);
        }
      }
      // The next encounter can be drawn while the guest still shows the room description.
      const entranceIllustration = /:cue:(?:roofless-ruin|l-shaped-ruin)$/.test(illustration ?? "");
      const encounter = encounterArt(presentation, enhanced, !scene && (picture === undefined || entranceIllustration) ? area : undefined,
        !captureApproach, battleCursor, [drawnPerspective?.pixels, priorPerspectiveDraw], portraitCaller);
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
      const menu = menuText(text);
      const overlandScript = activeEcl >= 25 && activeEcl <= 27;
      const phlanArrival = overlandScript ? identifyPhlanPrompt(dialogue, menu) : undefined;
      const sokalPrompt = activeEcl === 0 ? identifySokalPrompt(dialogue, menu, harborTicket) : undefined;
      // The overland map shares the native viewport blit with first-person
      // scenes. Its exploration menu omits Area, even during the cave exit
      // when the area record still names the dungeon.
      const overlandMap = menu === "CASTVIEWENCAMPSEARCHLOOK";
      const battlefield = hasBattlefieldBorder(presentation);
      // The icon editor also uses the viewport blit. Its two preview labels
      // stay in place while the player changes parts, palette, and size.
      const iconEditor = text.filter(([cell]) =>
        (cell >= 248 && cell <= 250) || (cell >= 488 && cell <= 490))
        .sort(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("") === "oldnew";
      const exploration = menu.startsWith("AREACASTVIEWENCAMP") ||
        (area === 1 && menu === "RELEASEANIMALSLEAVE") ||
        (area === 24 && menu === "DESTROYALTARLEAVEIT");
      let perspective = false;
      let tileArea = area;
      let nativeScenery: PresentationAnimationFrame["nativeScenery"];
      let arrivalPosition: typeof explorationPosition;
      if (area !== undefined && !scene && !overlandMap && !iconEditor && picture === undefined && !battlefield) {
        const pixels = perspectivePixels();
        // The original game can redraw scenery while the menu is hidden,
        // including mid-transition at a doorway.
        const nativeDraw = drawnPerspective?.pixels.equals(pixels) ? drawnPerspective : undefined;
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
          (previousPerspective?.area === area && previousPerspective.pixels.equals(pixels)));
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
          }
          nativeScenery = { ...native.native, area: arrivalPosition?.area ?? tileArea ?? area };
        }
        if (!leads) previousPerspective = perspective ? { area, pixels } : undefined;
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
      const aimCell = battlefield && menu.replace(/\s/g, "").startsWith("(USECURSORKEYS)")
        ? manualAimCell(presentation) : undefined;
      const combat = attack || (!scene && !perspective)
        ? combatArt(presentation, enhanced, area, battleCursor, battlefield ? battleTerrain : undefined, iconEditor, aimCell) : [];
      const combatSelections: TilePlacement[] = [];
      for (const [x, y, , , highlighted, width = 24, height = 24] of attack ?? combat) {
        if (!highlighted || width % 24 || height % 24) continue;
        const corner = presentation.get(x, y);
        const block = corner === 15 ? 25 : iconEditor && corner === 7 ? 153 : undefined;
        const key = `combat-selection:COMSPR.DAX:${block}`;
        if (!selectionKeys.has(key)) continue;
        for (let dy = 0; dy < height; dy += 24) {
          for (let dx = 0; dx < width; dx += 24) combatSelections.push([x + dx, y + dy, key]);
        }
      }
      const activeSelection = "combat-selection:COMSPR.DAX:25";
      if (aimCell && !combatSelections.length && selectionKeys.has(activeSelection)) {
        const [x, y] = aimCell;
        const largeActor = combat.some(([left, top, , , , width = 24, height = 24]) =>
          (width > 24 || height > 24) && x >= left && x + 24 <= left + width && y >= top && y + 24 <= top + height);
        if (largeActor || isEmptyAimCell(presentation, x, y)) {
          combatSelections.push([x, y, activeSelection]);
          // Manual Aim can place the native bevel where there is no unit.
          for (let row = 0; row < 24; row++) {
            const start = (y + row) * enhanced.width + x;
            if (battleTerrain) enhanced.pixels.set(battleTerrain.pixels.subarray(start, start + 24), start);
            else enhanced.pixels.fill(0, start, start + 24);
          }
        }
      }
      const battleTiles: TilePlacement[] = [];
      const battleTileInventory: TileInventoryCell[] | undefined = traceBattleTiles && !attack ? [] : undefined;
      if ((battleTileKeys.size || battleTileInventory) && !scene && battlefield) {
        const pixels = Buffer.alloc(64);
        const selectedActors = battleTileInventory ? combat.filter(([, , , , highlighted]) => highlighted) : [];
        const selectionCells = new Set<number>();
        // Combat terrain appears within the guest's left-hand battle panel.
        for (let y = 8; y < 176; y += 8) {
          for (let x = 8; x < 176; x += 8) {
            if (battleTileInventory && x <= 152 && y <= 152 && presentation.get(x, y) === 15) {
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
            if (!pixels.some(Boolean)) continue;
            const key = `battle-tile:${createHash("sha256").update(pixels).digest("hex")}`;
            // The selection bevel is drawn into the guest cell. It remains
            // on screen, but its pixels cannot identify the terrain below it.
            if (battleTileInventory && !selectionCells.has(y * presentation.width + x) && !selectedActors.some(([left, top, , , , width = 24, height = 24]) =>
              x < left + width && x + 8 > left && y < top + height && y + 8 > top)) {
              battleTileInventory.push([x, y, key, pixels.toString("hex")]);
            }
            if (battleTileKeys.has(key)) battleTiles.push([x, y, key]);
          }
        }
      }
      const travelFrame = !scene && !battlefield && !leads && !attack;
      const harborRoadSign = activeEcl === 0 && (
        dialogue === "YOUAREOUTSIDETHECITYHALL.THECITYCLERKWAITSINSIDETOAWARDCOMMISSIONS." ||
        dialogue === "YOUAREBYTHEGATEWAYTOTHEUNSETTLEDAREAS.THECITYWATCHEYESYOUSUSPICIOUSLY.");
      const districtRoad = travelFrame && (!dialogue || harborRoadSign) && !encounter && menu === "AREACASTVIEWENCAMPSEARCHLOOK" &&
        travelRoadAreas.has(activeEcl) && nativeScenery?.mapId === activeEcl;
      const quay = activeEcl === 0 && nativeScenery?.mapId === 0 && nativeScenery.y === 1 &&
        nativeScenery.x >= 11 && nativeScenery.x <= 15 && menu === "AREACASTVIEWENCAMPSEARCHLOOK" && isQuayDialogue(dialogue)
        ? { x: nativeScenery.x, facing: nativeScenery.facing, ticket: harborTicket } : undefined;
      const explored = arrivalPosition ?? (perspective && explorationPosition?.area === tileArea
        ? explorationPosition : undefined);
      // The map id and walls come from the map the guest drew, as the journal comes from its text.
      const mapped = explored && automap ? automap.locate(explored, nativeScenery) : explored;
      const state = {
        frame: Buffer.from(encodePng(native)).toString("base64"),
        enhancedFrame: Buffer.from(encodePng(enhanced, enhancedPalette)).toString("base64"),
        scene,
        text,
        portrait,
        characterSheet,
        classicPortrait: Array.isArray(picture),
        classicPortraitSources: Array.isArray(picture) && picture.length ? picture : undefined,
        classicPortraitArea: Array.isArray(picture) ? area : undefined,
        classicPortraitCursor: Array.isArray(picture) ? portraitCursor : undefined,
        classicPortraitCaller: Array.isArray(picture) ? pictureCaller : undefined,
        perspective,
        overlandMap: overlandMap && !scene && picture === undefined && !characterSheet && !battlefield || undefined,
        travelPosition: overlandMap && !dialogue && !encounter && !scene && picture === undefined && !characterSheet && !battlefield && !leads && !attack
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
        combatArt: combat,
        combatSelections: combatSelections.length ? combatSelections : undefined,
        combatEffect: effect?.placement,
        battleTiles,
        battleTileInventory,
        panelFrame: scene ? undefined : matchPanelFrame(screen),
        tileInventory,
        textColors: enhancedPalette,
        automaticCombat: automaticCombat || undefined,
        developerVictoryAvailable: !leads && developerVictoryAvailable || undefined,
        journal: leads && { objective: currentObjective(leads, trackedId), leads,
          trackedId: trackedJournalObjective(leads, trackedId) },
      };
      if (attack || captureApproach || effect) {
        if (animation.length >= 12) {
          const flight = animation.findIndex(flightFrame);
          if (flight < 0) return;
          animation.splice(flight, 1);
        }
        animation.push({ frame: state.frame, enhancedFrame: state.enhancedFrame,
          text: state.text, combatArt: effect ? combat : attack ?? [], combatSelections: state.combatSelections,
          combatEffect: state.combatEffect,
          battleTiles, panelFrame: state.panelFrame, perspective,
          nativeScenery: state.nativeScenery, exploration: state.exploration,
          overlandMap: state.overlandMap, encounter, tiles, durationMs });
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
        lastAttack = "";
        lastCombatReport = "";
        lastApproach = undefined;
      }
      if (captureApproach) return encounter;
    } else {
      writeFileSync("out/por-live.png", encodePng(leads ? journalFrame(leads, trackedId) : screen));
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
    const battlePoll = !blocking && isAt(cpu, cpu.ip, code.keyPressedPoll) && hasBattlefieldBorder(screen);
    const combatMenu = developerCombat ? menuText(visibleGameText()) : "";
    // Combat can pause on a hostile's first turn before the party gets a menu.
    developerVictoryAvailable = developerCombat && canWinDeveloperCombat(cpu) &&
      ((battlePoll && combatMenu === "") || (combatMenu.startsWith("MOVEVIEWAIM") && hasBattlefieldBorder(screen)));
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
      // Valjevo draws the dungeon hedge before copying the selected ECL
      // back to the area record. Other transition art uses the record's scope.
      if (area === 5 && activeEcl === 3) area = 3;
      const positionArea = area;
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
      const gameCommand = developerVictory ? "alt-q" : command.startsWith("key ") ? command.slice(4) : command || "enter";
      const key = getKey(gameCommand);
      if (key === undefined) {
        console.log("Enter a letter, digit, arrow name, home, pageup, end, pagedown, enter, space, escape, tab, or backspace.");
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
      const captureAnimation = hasEncounterArtwork && animation.length < 12;
      if (scene || area === undefined || (!nativeEncounterDirectory && !captureAnimation)) return;
      captureEclContext(cpu);
      const replacement = captureAnimation ? showFrame(undefined, undefined, true)?.[2] : undefined;
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
    captureBattleTerrain: battleTerrain ? (cpu: Cpu, column: number, row: number, picture: number) => {
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
      if (traceBattleDraw) {
        const cells: TileInventoryCell[] = [];
        const pixels = Buffer.alloc(64);
        for (let dy = 0; dy < 24; dy += 8) for (let dx = 0; dx < 24; dx += 8) {
          for (let scan = 0; scan < 8; scan++) {
            const start = (y + dy + scan) * screen.width + x + dx;
            pixels.set(battleTerrain.pixels.subarray(start, start + 8), scan * 8);
          }
          if (pixels.some(Boolean)) cells.push([dx, dy, `battle-tile:${createHash("sha256").update(pixels).digest("hex")}`, pixels.toString("hex")]);
        }
        const draw = JSON.stringify({ picture, cells });
        if (cells.length && !tracedBattleTerrain.has(draw)) {
          tracedBattleTerrain.add(draw);
          console.error(`POR_BATTLE_TERRAIN ${draw}`);
        }
      }
    } : undefined,
    capturePerspective: browser ? (cpu: Cpu, localScenery: boolean) => {
      const pixels = perspectivePixels();
      if (drawnPerspective && !drawnPerspective.pixels.equals(pixels)) priorPerspectiveDraw = drawnPerspective.pixels;
      drawnPerspective = { pixels, localEcl: localScenery ? cpu.read8(unit.data, data.eclBlock) : undefined,
        native: localScenery ? captureNativeExploration(cpu) : undefined };
      if (drawnPerspective.native) lastLocalPerspective = drawnPerspective;
    } : undefined,
    captureCombatEffectUnderlay: browser && effectKeys.length ? (cpu: Cpu) => {
      pendingEffect = undefined;
      // At the native call site the far destination pointer precedes the
      // source pointer, flags, picture index, row and column.
      const argument = (offset: number) => cpu.read16(cpu.ss, (cpu.sp + offset) & 0xffff);
      const offset = argument(0), segment = argument(2), row = argument(12), column = argument(14);
      const width = cpu.read16(segment, offset + 2);
      if (argument(8) !== 5 || row > 18 || column > 18 || width < column + 3 ||
          cpu.read16(segment, offset) < row * 8 + 24) return;
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
      pendingEffect = { x: 8 + column * 8, y: 8 + row * 8, background };
    } : undefined,
    capturePresentationDelay: browser ? (cpu: Cpu, effectDelay = false) => {
      const draw = effectDelay ? pendingEffect : undefined;
      pendingEffect = undefined;
      if (scene) return;
      if (draw) {
        const { x, y, background } = draw;
        const key = matchCombatEffect(screen, x, y, background);
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
      if (animation.length >= 12 && !animation.some(flightFrame)) return;
      captureEclContext(cpu);
      const battlefield = hasBattlefieldBorder(screen);
      const placements = combatArt(screen, undefined, area, battleCursor, battlefield ? battleTerrain : undefined);
      const attacks = placements.filter(([, , key]) => attackKeys.has(key) || attackKeys.has(partyRecolorKey.exec(key)?.[1] ?? ""));
      const signature = attacks.length ? JSON.stringify(attacks) : "";
      // Combat prints action and result text below the actor's stats in
      // the right-hand panel. The guest clears it before the next key read.
      const battleGlyphs = battlefield ? visibleGameText() : [];
      const reportGlyphs = battleGlyphs
        .filter(([cell, char]) => cell >= 423 && cell < 860 && cell % 40 >= 23 && char > 32)
        .sort(([a], [b]) => a - b);
      const report = reportGlyphs.map(([cell, char]) => `${cell}:${char}`).join(",");
      if (report && report !== lastCombatReport) {
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
        showFrame(undefined, actionArt, false, false, 1000);
      } else if (signature && signature !== lastAttack) {
        showFrame(undefined, placements);
      } else if (!signature && !report && area !== undefined) {
        showFrame(undefined, undefined, true);
      }
      lastCombatReport = report;
      lastAttack = signature;
    } : undefined,
    openJournal,
    enterDiskMenu: () => { diskMenuDepth++; },
    leaveDiskMenu: () => { diskMenuDepth--; },
    setScene: (id: string | undefined) => { scene = id; },
    tracked: () => trackedId,
    restoreTracked: (id: string | undefined) => { trackedId = id; },
  };
}
