import { appendFileSync, readSync, writeFileSync } from "node:fs";
import { captureNativeExploration, type NativeExploration } from "./native-exploration.js";
import { captureOverlandTravel, identifyPhlanPrompt, type TravelState } from "./overland-travel.js";
import { createHash } from "node:crypto";
import { Frame } from "../src/lib/ega.js";
import type { EncounterAnchor } from "../src/lib/assets.js";
import type { Cpu } from "../src/cpu/machine.js";
import { currentObjective, isOpenObjective, kovelJournalTransition, type JournalLead } from "../src/runtime/adventure-log.js";
import type { BiosKey } from "../src/runtime/dos.js";
import { journalFrame, screen, visibleGameText } from "../src/runtime/video.js";
import { encodePng } from "./png.js";
import { combatHighlightPixel, loadCombatArtMatcher, monsterCombatKey, partyCombatKey, type CombatArtPlacement } from "./combat-art.js";
import { loadCharacterSheetArt, loadPortraitArt } from "./portrait-art.js";
import { loadEncounterArt, type EncounterPlacement } from "./encounter-art.js";

const controls: Record<string, number> = {
  enter: 0x1c0d, escape: 0x011b, up: 0x4800, down: 0x5000, left: 0x4b00, right: 0x4d00,
  home: 0x4700, pageup: 0x4900, end: 0x4f00, pagedown: 0x5100,
  space: 0x3920, tab: 0x0f09, backspace: 0x0e08,
  "alt-q": 0x1000,
};
const scanRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const firstScans = [2, 16, 30, 44];
const liveIdleBudget = 150_000_000;
const phlanArrivalAreas = new Set([0, 2, 10, 14, 18, 24, 31]);
export interface PresentationAnimationFrame {
  frame: string;
  enhancedFrame: string;
  combatArt: CombatArtPlacement[];
  battleTiles: TilePlacement[];
  panelFrame?: PanelFrameStamp[];
  text: [number, number, number][];
  perspective?: boolean;
  nativeScenery?: NativeExploration & { area: number };
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

function hasBattlefieldBorder(frame: Frame): boolean {
  // The original combat panel has gold corner studs at x=176 and y=176.
  // Exploration divides the screen at x=128 instead and ends at y=184.
  const pixel = (x: number, y: number) => frame.pixels[y * frame.width + x];
  return pixel(176, 0) === 14 && pixel(176, 176) === 14 && pixel(0, 176) === 14 &&
    pixel(177, 88) === 12 && pixel(178, 88) === 4;
}

/** Terminal control for the translated runner. Journal input stays on the host. */
export function liveInput(startAt: number, journal: () => JournalLead[], recording?: string) {
  let nextPrompt = startAt;
  let trackedId: string | undefined;
  let scene: string | undefined;
  let area: number | undefined;
  let travelPosition: TravelState | undefined;
  let nonblockingPoll = false;
  let overlandScript = false;
  let explorationPosition: { area: number; x: number; y: number; facing: number; cameraX?: number; cameraY?: number } | undefined;
  let battleCursor: number | undefined;
  let drawnPerspective: { pixels: Buffer; localEcl?: number; native?: NativeExploration } | undefined;
  let priorPerspectiveDraw: Buffer | undefined;
  let previousPerspective: { area: number; pixels: Buffer } | undefined;
  const browser = process.env.POR_BROWSER_PLAY === "1";
  const tileKeys = new Set((process.env.POR_TILE_ART_KEYS ?? "").split(",").filter(Boolean));
  const battleTileKeys = new Set((process.env.POR_BATTLE_TILE_KEYS ?? "").split(",").filter(Boolean));
  const traceBattleDraw = process.env.POR_TRACE_BATTLE_DRAW === "1";
  const battleTerrain = browser && (battleTileKeys.size || traceBattleDraw) ? new Frame(screen.width, screen.height) : undefined;
  const tracedBattleTerrain = new Set<string>();
  const combatArt = loadCombatArtMatcher((process.env.POR_COMBAT_ART_KEYS ?? "").split(",").filter(Boolean));
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
  const encounterArt = loadEncounterArt(encounterPlacements);
  const traceTiles = process.env.POR_TRACE_TILES === "1";
  const traceBattleTiles = process.env.POR_TRACE_BATTLE_TILES === "1";
  function perspectivePixels() {
    const pixels = Buffer.alloc(88 * 88);
    for (let row = 0; row < 88; row++) {
      const start = (24 + row) * screen.width + 24;
      pixels.set(screen.pixels.subarray(start, start + 88), row * 88);
    }
    return pixels;
  }
  const showFrame = (leads?: JournalLead[], attack?: CombatArtPlacement[], captureApproach = false, automaticCombat = false, durationMs?: number) => {
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
      const picture = !scene ? portraitArt(screen, area, battleCursor) : undefined;
      const portrait = typeof picture === "string" ? picture : undefined;
      const characterSheet = !scene && !picture ? characterSheetArt(screen) : undefined;
      const enhanced = new Frame(screen.width, screen.height);
      enhanced.pixels.set(screen.pixels);
      for (const [x, y, , width, height] of characterSheet ?? []) {
        for (let row = y; row < y + height; row++) {
          const start = row * screen.width + x;
          enhanced.pixels.fill(0, start, start + width);
        }
      }
      const encounter = encounterArt(screen, enhanced, !scene && picture === undefined ? area : undefined,
        !captureApproach, battleCursor, [drawnPerspective?.pixels, priorPerspectiveDraw]);
      if (captureApproach) {
        if (!encounter || encounter[2] === lastApproach) return;
        lastApproach = encounter[2];
      }
      const tiles: [number, number, string][] = [];
      const tileInventory: TileInventoryCell[] | undefined = traceTiles ? [] : undefined;
      const menu = menuText(text);
      const phlanArrival = overlandScript ? identifyPhlanPrompt(dialogue, menu) : undefined;
      // The overland map shares the native viewport blit with first-person
      // scenes. Its exploration menu omits Area, even during the cave exit
      // when the area record still names the dungeon.
      const overlandMap = menu === "CASTVIEWENCAMPSEARCHLOOK";
      const battlefield = hasBattlefieldBorder(screen);
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
        const native = nativeDraw ?? (drawnPerspective?.localEcl === tileArea ? drawnPerspective : undefined);
        if (perspective && native?.native) {
          const { localEcl } = native;
          // The first destination view can precede the update to the party's area record.
          if ((area === 26 || area === 27) && localEcl !== undefined && phlanArrivalAreas.has(localEcl)) {
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
              const start = (y + row) * screen.width + x;
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
        const offset = Math.floor(cell / 40) * 8 * screen.width + x;
        for (let y = 0; y < 8; y++) enhanced.pixels.fill(0, offset + y * screen.width, offset + y * screen.width + 8);
      }
      const combat = attack || (!scene && !perspective)
        ? combatArt(screen, enhanced, area, battleCursor, battlefield ? battleTerrain : undefined, iconEditor) : [];
      const battleTiles: TilePlacement[] = [];
      const battleTileInventory: TileInventoryCell[] | undefined = traceBattleTiles && !attack ? [] : undefined;
      if ((battleTileKeys.size || battleTileInventory) && !scene && battlefield) {
        const pixels = Buffer.alloc(64);
        const selectedActors = battleTileInventory ? combat.filter(([, , , , highlighted]) => highlighted) : [];
        const selectionCells = new Set<number>();
        // Combat terrain appears within the guest's left-hand battle panel.
        for (let y = 8; y < 176; y += 8) {
          for (let x = 8; x < 176; x += 8) {
            if (battleTileInventory && x <= 152 && y <= 152 && screen.get(x, y) === 15) {
              let borderMatches = true;
              for (let offset = 0; offset < 24 && borderMatches; offset++) {
                borderMatches = screen.get(x + offset, y) === combatHighlightPixel(offset, 0) &&
                  screen.get(x + offset, y + 23) === combatHighlightPixel(offset, 23) &&
                  screen.get(x, y + offset) === combatHighlightPixel(0, offset) &&
                  screen.get(x + 23, y + offset) === combatHighlightPixel(23, offset);
              }
              if (borderMatches) {
                for (let row = 0; row < 24; row += 8) {
                  for (let column = 0; column < 24; column += 8) selectionCells.add((y + row) * screen.width + x + column);
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
            if (battleTileInventory && !selectionCells.has(y * screen.width + x) && !selectedActors.some(([left, top, , , , width = 24, height = 24]) =>
              x < left + width && x + 8 > left && y < top + height && y + 8 > top)) {
              battleTileInventory.push([x, y, key, pixels.toString("hex")]);
            }
            if (battleTileKeys.has(key)) battleTiles.push([x, y, key]);
          }
        }
      }
      const state = {
        frame: Buffer.from(encodePng(screen)).toString("base64"),
        enhancedFrame: Buffer.from(encodePng(enhanced, enhancedPalette)).toString("base64"),
        scene,
        text,
        portrait,
        characterSheet,
        classicPortrait: Array.isArray(picture),
        classicPortraitSources: Array.isArray(picture) && picture.length ? picture : undefined,
        classicPortraitArea: Array.isArray(picture) ? area : undefined,
        classicPortraitCursor: Array.isArray(picture) ? battleCursor : undefined,
        perspective,
        overlandMap: overlandMap && !scene && picture === undefined && !characterSheet && !battlefield || undefined,
        travelPosition: overlandMap && !scene && picture === undefined && !characterSheet && !battlefield && !leads && !attack
          ? travelPosition : undefined,
        phlanArrival: !scene && !battlefield && !leads && !attack ? phlanArrival : undefined,
        travelPolling: nonblockingPoll && !menu && !scene && picture === undefined && !battlefield && !leads && !attack &&
          ((overlandScript && !dialogue) || identifyPhlanPrompt(dialogue) !== undefined) || undefined,
        nativeScenery,
        exploration: arrivalPosition ?? (perspective && explorationPosition?.area === tileArea
          ? explorationPosition : undefined),
        encounter,
        tiles,
        combatArt: combat,
        battleTiles,
        battleTileInventory,
        panelFrame: scene ? undefined : matchPanelFrame(screen),
        tileInventory,
        textColors: enhancedPalette,
        automaticCombat: automaticCombat || undefined,
        journal: leads && { objective: currentObjective(leads, trackedId), leads,
          trackedId: leads.find((lead) => lead.id === trackedId && isOpenObjective(lead))?.id },
      };
      if (attack || captureApproach) {
        animation.push({ frame: state.frame, enhancedFrame: state.enhancedFrame,
          text: state.text, combatArt: attack ?? [], battleTiles, panelFrame: state.panelFrame, perspective,
          nativeScenery: state.nativeScenery, overlandMap: state.overlandMap, encounter, tiles, durationMs });
      } else {
        console.log(`POR_FRAME ${JSON.stringify({ ...state,
          animation: animation.length ? animation.splice(0) : undefined })}`);
        lastAttack = "";
        lastCombatReport = "";
        lastApproach = undefined;
      }
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
  let inCampMenu = false;
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
  const requestKey = (cpu: Cpu, keys: BiosKey[], blocking: boolean): void => {
    if (cpu.steps < startAt || keys.length || (!blocking && cpu.steps < nextPrompt)) return;
    const kovelTransition = kovelJournalTransition(cpu, 0x740);
    if (kovelTransition !== undefined && kovelTransition !== previousKovelTransition) journal();
    previousKovelTransition = kovelTransition;
    let automaticCombat = false;
    if (browser) {
      const segment = cpu.read16(0x740, 0x4935);
      const offset = cpu.read16(0x740, 0x4933);
      travelPosition = captureOverlandTravel(cpu, segment, offset);
      const ecl = cpu.read8(0x740, 0x82a2);
      // Map and sector loads can yield before the next menu is drawn.
      nonblockingPoll = !blocking && cpu.cs === 0x512 && cpu.ip === 0x5423;
      overlandScript = ecl >= 25 && ecl <= 27;
      area = segment || offset ? cpu.read16(segment, offset + 0x1e4) : undefined;
      // Valjevo draws the dungeon hedge before copying the selected ECL
      // back to the area record. Other transition art uses the record's scope.
      if (area === 5 && cpu.read8(0x740, 0x82a2) === 3) area = 3;
      const positionArea = area;
      explorationPosition = (segment || offset) && positionArea !== undefined ? {
        area: positionArea,
        x: cpu.read16(segment, offset + 0x1e0),
        y: cpu.read16(segment, offset + 0x1e2),
        facing: cpu.read8(cpu.ds, 0x6a0d) & 7,
        // The native viewport reads these camera bytes during movement and
        // load. The area record can lag behind on the first frame of a save.
        ...(positionArea === 0 ? { cameraX: cpu.read8(cpu.ds, 0x6a0b), cameraY: cpu.read8(cpu.ds, 0x6a0c) } : {}),
      } : undefined;
      // The ECL interpreter suspends at this cursor while the battle runs.
      battleCursor = cpu.read16(0x740, 0x494e);
      if (!blocking && cpu.cs === 0x512 && cpu.ip === 0x5423 && hasBattlefieldBorder(screen)) {
        // Original combat turn code (ovl08:0252, 02a0) stores the active actor and tests its Quick flag.
        const actorOffset = cpu.read16(0x740, 0x5cf0);
        const actorSegment = cpu.read16(0x740, 0x5cf2);
        const menu = menuText(visibleGameText());
        automaticCombat = (!menu || menu.startsWith("MOVE/ATTACK,")) &&
          (actorOffset !== 0 || actorSegment !== 0) &&
          cpu.read8(actorSegment, (actorOffset + 0x10f) & 0xffff) !== 0;
      }
    }
    showFrame(undefined, undefined, false, automaticCombat);
    while (true) {
      if (!browser) process.stdout.write("Game [J journal, :quit, key]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command === ":poll" && automaticCombat || command === ":travel-poll" && nonblockingPoll) {
        nextPrompt = cpu.steps + 1_000_000;
        return;
      }
      if (!inCampMenu && diskMenuDepth === 0 && command.toLowerCase() === "j") {
        // The original appraisal menu uses J for Jewelry.
        if (!/^APPRAISE:.*JEWELRY/.test(menuText(visibleGameText()))) {
          openJournal();
          showFrame(undefined, undefined, false, automaticCombat);
          continue;
        }
      }
      const key = getKey(command === "" ? "enter" : command.startsWith("key ") ? command.slice(4) : command);
      if (key === undefined) {
        console.log("Enter a letter, digit, arrow name, home, pageup, end, pagedown, enter, space, escape, tab, or backspace.");
        continue;
      }
      if (recording) appendFileSync(recording, `${cpu.steps}:${key.toString(16).padStart(4, "0")}\n`);
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
    captureEncounterDraw: browser && Object.keys(encounterPlacements).length ? (cpu: Cpu) => {
      if (scene || area === undefined || animation.length >= 12) return;
      battleCursor = cpu.read16(0x740, 0x494e);
      showFrame(undefined, undefined, true);
    } : undefined,
    captureBattleTerrain: battleTerrain ? (cpu: Cpu, column: number, row: number, picture: number) => {
      if (column > 18 || row > 18 || column % 3 || row % 3) return;
      const x = 8 + column * 8;
      const y = 8 + row * 8;
      // Overlay 36's blitter and viewport copy use a far pointer to the
      // offscreen picture. Each eight-pixel group stores four plane bytes.
      const offset = cpu.read16(cpu.ds, 0x4980);
      const segment = cpu.read16(cpu.ds, 0x4982);
      const width = cpu.read16(segment, offset + 2);
      if (width < column + 3 || cpu.read16(segment, offset) < row * 8 + 24) return;
      const stride = width * 4;
      const planeMasks = Array.from({ length: 4 }, (_, plane) => cpu.read8(cpu.ds, 0x260a + plane) & 15);
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
      drawnPerspective = { pixels, localEcl: localScenery ? cpu.read8(0x740, 0x82a2) : undefined,
        native: localScenery ? captureNativeExploration(cpu) : undefined };
    } : undefined,
    capturePresentationDelay: browser ? (cpu: Cpu) => {
      if (scene || animation.length >= 12) return;
      battleCursor = cpu.read16(0x740, 0x494e);
      const battlefield = hasBattlefieldBorder(screen);
      const placements = combatArt(screen, undefined, area, battleCursor, battlefield ? battleTerrain : undefined);
      const attacks = placements.filter(([, , key]) => attackKeys.has(key));
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
    setCampMenu: (active: boolean) => { inCampMenu = active; },
    enterDiskMenu: () => { diskMenuDepth++; },
    leaveDiskMenu: () => { diskMenuDepth--; },
    setScene: (id: string | undefined) => { scene = id; },
    tracked: () => trackedId,
    restoreTracked: (id: string | undefined) => { trackedId = id; },
  };
}
