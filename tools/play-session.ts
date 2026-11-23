/**
 * The game page's side of a running game (#228): what the runner's lines mean for the page, and which
 * keys and commands the page may give. The Node server (tools/browser-play.ts) runs it beside its
 * runner process; the browser build (tools/web/play-page.ts) runs it in the page beside the engine's
 * worker. Either way the page sees the same state and is held to the same keys.
 *
 * It reads the game's data through the resource layer (#224): the active root's files for the
 * packaged terrain, the overland routes and New Phlan's street, and the narration manifests.
 */
import { createHash } from "node:crypto";
import { isOpenObjective, type JournalLead, type JournalObjective } from "../src/runtime/adventure-log.js";
import { exactTextNarrations as exactTextUnits, NarrationCatalog, normalizeSpeech, type RuntimeNarrationManifest } from "../src/runtime/narration.js";
import type { EclNarrationEvent } from "../src/runtime/ecl-narration-observer.js";
import { readJsonNow, resources } from "../src/resources/provider.js";
import type { CharacterSheetPart } from "./portrait-art.js";
import type { CombatArtPlacement } from "./combat-art.js";
import { developerVictoryCommand } from "./developer-combat.js";
import type { EncounterPlacement } from "./encounter-art.js";
import { packagedTerrain as packagedTerrainFor, packagedTiles } from "./enhanced-runner.js";
import { buildExplorationMaterials, explorationMaterialArea } from "./exploration-materials.js";
import type { ResourceRoot } from "./gamedata.js";
import { getKey, type CodeWheelQuestion, type OverlandTerrainFrame, type PanelFrameStamp, type PresentationAnimationFrame, type TileInventoryCell } from "./live-input.js";
import type { NativeExploration } from "./native-exploration.js";
import { buildNewPhlanMaterials } from "./new-phlan-3d-materials.js";
import { loadOverlandTravel, overlandLandmarkSlots, type PhlanApproach, type SokalPrompt, type SokalQuay, type TravelState } from "./overland-travel.js";
import { phlanHarborLayout } from "./renderer.js";
import type { loadUpgradeArt } from "./upgrade-art.js";

/** What the session needs of each artwork entry: the server's loaded art, or the browser build's index of it. */
export type SessionArtwork = ReadonlyMap<string, Pick<ReturnType<typeof loadUpgradeArt> extends Map<string, infer A> ? A : never,
  "file" | "path" | "reflected" | "screenCellOnly" | "encounter" | "width" | "height">>;

export type ExplorationFrame = {
  nativeScenery?: NativeExploration & { area: number };
  scenery?: Pick<NativeExploration, "x" | "y" | "facing" | "walls" | "mapId" | "roofed" | "skyColor"> & { materialId: string; area: number };
  overlandMap?: boolean;
  overlandTerrain?: OverlandTerrainFrame;
  areaView?: boolean;
  tiles?: [number, number, string][];
  tileInventory?: TileInventoryCell[];
};

type PendingNarration = {
  step: number; unitId: string; variantId?: string;
  sourceId: string; coveredSourceIds: string[]; asset: string; text: string;
  captionSelection?: EclNarrationEvent["captionSelection"];
};
type FrameNarrations = { narrations?: (PendingNarration & { id: number })[] };

export interface FrameState extends ExplorationFrame, FrameNarrations {
  travelPosition?: TravelState;
  travelPolling?: boolean;
  phlanArrival?: PhlanApproach;
  sokalPrompt?: SokalPrompt;
  sokalQuay?: SokalQuay;
  districtRoad?: boolean;
  travel?: Pick<TravelState, "x" | "y" | "sector"> & { routes: ReturnType<ReturnType<typeof loadOverlandTravel>> };
  frame?: string;
  enhancedFrame?: string;
  scene?: string;
  codeWheelQuestion?: number;
  codeWheelAttempt?: number;
  codeWheel?: CodeWheelQuestion;
  portrait?: string;
  characterSheet?: CharacterSheetPart[];
  classicPortrait?: boolean;
  classicPortraitSources?: string[];
  classicPortraitArea?: number;
  classicPortraitCursor?: number;
  classicPortraitCaller?: number;
  perspective?: boolean;
  prompt?: "read" | "poll";
  awaitsKey?: boolean;
  exploration?: { area: number; mapId?: number; x: number; y: number; facing: number; cameraX?: number; cameraY?: number;
    walls?: [number, number, number, number] };
  encounter?: EncounterPlacement;
  tiles?: [number, number, string][];
  combatArt?: CombatArtPlacement[];
  combatSelections?: [number, number, string][];
  combatEffect?: [number, number, string];
  battleTiles?: [number, number, string][];
  battleProps?: CombatArtPlacement[];
  animation?: (PresentationAnimationFrame & ExplorationFrame & FrameNarrations)[];
  automaticCombat?: boolean;
  battleEntryPolling?: boolean;
  presentationPolling?: number;
  developerVictoryAvailable?: boolean;
  tileInventory?: TileInventoryCell[];
  battleTileInventory?: TileInventoryCell[];
  panelFrame?: PanelFrameStamp[];
  text?: [number, number, number][];
  runes?: [number, number, number][];
  textColors?: [number, number, number][];
  journal?: { objective: JournalObjective; leads: JournalLead[]; trackedId?: string };
}

export interface PlaySessionOptions {
  root: ResourceRoot;
  artwork: SessionArtwork;
  /** One command to the game, as the runner reads a line of its input. */
  write(command: string): void;
  classicAvailable: boolean;
  codeWheelAvailable: boolean;
  buildVersion: unknown;
  /** Recorded walks also keep the nonblocking polls sent by the pipe harness outside travel (POR_PROMPT_SCHEDULE_IN). */
  recordedPolls?: boolean;
  /** Each frame once the session has prepared it: the Node server's tile and portrait traces. */
  onFrame?(frame: FrameState, sequence: number): void;
  /** The session's state numbers continue from an earlier game's, so a page that keeps polling sees a new frame. */
  firstSequence?: number;
  log?(line: string): void;
}

export interface KeyRequest { expected?: string; page?: string; codeWheel?: boolean }

export class PlaySession {
  frame: FrameState = {};
  sequence: number;
  ready = false;
  stopped: string | undefined;
  private notice: string | undefined;
  private saveSlot: string | undefined;
  private saveSlotEvent = 0;
  private saveSlotAction: "load" | "save" | undefined;
  private lastDiagnostic = "";
  private soundId = 0;
  private readonly sounds: Array<{ id: number; index: number; mode: number; step: number; enhancedOnly?: boolean }> = [];
  private textId = 0;
  private readonly messages: Array<{ id: number; step: number; message: string }> = [];
  private automap = '{"revision":-1,"maps":{}}';
  private automapRevision = -1;
  /** The page that plays the game: the newest window to start (see state()). */
  private activePage: string | undefined;
  private narrationId = 0;
  // Narration arrives before its picture. The guest step identifies a narrated
  // transient illustration within the batch. Other lines belong to the settled frame.
  private readonly heldNarrations: PendingNarration[] = [];
  private readonly packagedTerrain: ReturnType<typeof packagedTerrainFor>;
  private readonly planTravel: ReturnType<typeof loadOverlandTravel>;
  private readonly narrationCatalog: NarrationCatalog;
  private readonly explicitVoiceMatches: string[];
  private readonly exactTextNarrations: ReturnType<typeof exactTextUnits>;
  private readonly reflectedTiles: string[];
  private readonly portraitAssetKeys: Map<string, string>;
  private streetMaterials: ReturnType<typeof buildNewPhlanMaterials> | undefined;
  private readonly localMaterialSets = new Map<string, string>();

  constructor(private readonly options: PlaySessionOptions) {
    const { root, artwork } = options;
    this.sequence = options.firstSequence ?? 0;
    this.packagedTerrain = packagedTerrainFor(root);
    this.planTravel = loadOverlandTravel(root);
    const voices = readJsonNow<{ lines: { file: string; match?: string }[] }>(resources(), "manifest:src/audio/voices.json")!;
    const narration = readJsonNow<RuntimeNarrationManifest & { events: { sourceId: string; normalizedText: string }[] }>(resources(), "manifest:src/audio/voice-master-manifest.json")!;
    this.narrationCatalog = new NarrationCatalog(narration);
    this.explicitVoiceMatches = voices.lines.flatMap(line => line.match ? [normalizeSpeech(line.match)] : []);
    this.exactTextNarrations = exactTextUnits(narration);
    this.reflectedTiles = [...artwork].filter(([, art]) => art.reflected).map(([id]) => id);
    this.portraitAssetKeys = new Map([...artwork].filter(([id]) => id.startsWith("portrait:")).map(([id, art]) => [art.path, id]));
  }

  /** New Phlan's street materials (/exploration-materials/phlan). */
  newPhlanMaterials() {
    return this.streetMaterials ??= buildNewPhlanMaterials(this.options.root, new Map(
      [...this.options.artwork].filter(([, art]) => !art.screenCellOnly)
        .map(([key, art]) => [key, { file: art.path, reflected: Boolean(art.reflected) }])));
  }

  /** A material set a frame named (/exploration-materials/<id>), as JSON. */
  materials(id: string): string | undefined { return this.localMaterialSets.get(id); }

  private prepareScenery(view: ExplorationFrame) {
    const { artwork } = this.options;
    const packagedTerrain = this.packagedTerrain;
    // Keep the current travel surface until every slot in the local composition has artwork.
    const terrain = view.overlandTerrain;
    if (terrain) {
      const slots = [...new Set(terrain.slots)];
      const landmarks = slots.filter(slot => overlandLandmarkSlots.has(slot));
      if (!artwork.has("overland-materials") || slots.some(slot => !artwork.has(`overland-tile:${slot}`)) ||
          landmarks.some(slot => !artwork.has(`overland-landmark:${slot}`))) {
        delete view.overlandTerrain;
      } else {
        const details = slots.filter(slot => artwork.has(`overland-detail:${slot}`));
        view.overlandTerrain = {
          ...terrain, detailSlots: details.length ? details : undefined,
          landmarkSlots: landmarks.length ? landmarks : undefined,
        };
      }
    }
    const native = view.nativeScenery;
    if (!native) return;
    delete view.nativeScenery;
    const { x, y, facing, walls, area, mapId, roofed, skyColor } = native;
    if (packagedTerrain && !native.viewportCleared) {
      const cells: TileInventoryCell[] = [];
      view.tiles = packagedTiles(packagedTerrain, artwork, native, cells);
      if (view.tileInventory) view.tileInventory = cells;
    }
    if (native.areaView) {
      view.areaView = true;
      return;
    }
    const materialArea = explorationMaterialArea(native);
    const harbor = materialArea === 0 && mapId === 0;
    const materialId = createHash("sha256")
      .update(JSON.stringify([area,materialArea,harbor,native.frontSlots,native.glyphs,skyColor,native.groundColor,
        ...(packagedTerrain ? [mapId, native.cellGeometry?.wallSymbols] : [])])).digest("hex");
    if (!this.localMaterialSets.has(materialId)) {
      if (this.localMaterialSets.size >= 32) this.localMaterialSets.delete(this.localMaterialSets.keys().next().value!);
      const materials = buildExplorationMaterials(native, artwork as Parameters<typeof buildExplorationMaterials>[1], packagedTerrain?.glyphs(native));
      if (harbor) {
        const { water, dockPiling } = this.newPhlanMaterials();
        this.localMaterialSets.set(materialId, JSON.stringify({ ...materials, water, dockPiling, layout: phlanHarborLayout }));
      } else this.localMaterialSets.set(materialId, JSON.stringify(materials));
    }
    view.scenery = { x, y, facing, walls, materialId, area, mapId, roofed, skyColor };
  }

  /** One line the game printed. */
  line(line: string) {
    if (line.startsWith("POR_FRAME ")) {
      const frame = this.frame = JSON.parse(line.slice("POR_FRAME ".length)) as FrameState;
      for (const narration of this.heldNarrations.splice(0)) {
        const clip = frame.animation?.find(({ textSteps }) => textSteps &&
          narration.step >= textSteps[0] && narration.step <= textSteps[1]);
        const target = clip ?? frame;
        (target.narrations ??= []).push({ id: ++this.narrationId, ...narration });
      }
      if (frame.travelPosition) {
        const { x, y, sector } = frame.travelPosition;
        frame.travel = { x, y, sector, routes: this.planTravel(frame.travelPosition) };
        delete frame.travelPosition;
      }
      this.prepareScenery(frame);
      frame.animation?.forEach((view) => this.prepareScenery(view));
      this.sequence++;
      this.options.onFrame?.(frame, this.sequence);
      this.ready = true;
    } else if (line.startsWith("POR_AUTOMAP ")) {
      // The runner owns the discovered map and stores it in the save slot.
      this.automap = line.slice("POR_AUTOMAP ".length);
      this.automapRevision = (JSON.parse(this.automap) as { revision: number }).revision;
    } else if (line.startsWith("POR_NOTICE ")) {
      this.notice = line.slice("POR_NOTICE ".length);
    } else if (line.startsWith("POR_SAVE_SLOT ")) {
      const match = /^(load|save) ([A-J])$/.exec(line.slice("POR_SAVE_SLOT ".length));
      if (match) {
        this.saveSlotAction = match[1] as "load" | "save";
        this.saveSlot = match[2];
        this.saveSlotEvent++;
      }
    } else if (line.startsWith("POR_SOUND ")) {
      const sound = JSON.parse(line.slice("POR_SOUND ".length)) as { index: number; mode: number; step: number; enhancedOnly?: boolean };
      this.sounds.push({ id: ++this.soundId, index: sound.index, mode: sound.mode, step: sound.step,
        ...(sound.enhancedOnly ? { enhancedOnly: true } : {}) });
      if (this.sounds.length > 64) this.sounds.shift();
    } else if (line.startsWith("POR_TEXT ")) {
      const text = JSON.parse(line.slice("POR_TEXT ".length)) as { step: number; message: string; fromEclText?: boolean };
      this.messages.push({ id: ++this.textId, step: text.step, message: text.message });
      if (this.messages.length > 64) this.messages.shift();
      const normalized = normalizeSpeech(text.message);
      const handledByExplicitVoice = this.explicitVoiceMatches.some(match => normalized.includes(match));
      const exact = [...new Map((this.exactTextNarrations.get(normalized) ?? []).map(unit => [unit.id, unit])).values()];
      if (!text.fromEclText && !handledByExplicitVoice && exact.length === 1) {
        const unit = exact[0]!;
        this.heldNarrations.push({ step: text.step, unitId: unit.id,
          sourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds,
          asset: unit.asset!, text: unit.spokenText });
      }
    } else if (line.startsWith("POR_NARRATION ")) {
      const event = JSON.parse(line.slice("POR_NARRATION ".length)) as EclNarrationEvent;
      const resolved = this.narrationCatalog.resolve(event);
      if (resolved.status === "resolved") {
        const narration = resolved.narration;
        this.heldNarrations.push({ step: event.step ?? 0, unitId: narration.unitId,
          ...(narration.variantId ? { variantId: narration.variantId } : {}), sourceId: narration.triggerSourceId,
          coveredSourceIds: narration.coveredSourceIds, asset: narration.asset, text: narration.text,
          ...(event.captionSelection ? { captionSelection: event.captionSelection } : {}) });
      } else if (resolved.status === "ambiguous" || resolved.status === "selector-required") {
        this.options.log?.(`Narration ${event.sourceId}: ${resolved.status}`);
      }
    } else if (line.startsWith("entry:")) {
      this.lastDiagnostic = line;
    }
  }

  /** The game has stopped: `reason` unless it said why itself. */
  closed(reason: string) {
    this.stopped ??= this.lastDiagnostic || reason;
    if (this.frame.codeWheelQuestion !== undefined) {
      delete this.frame.codeWheelQuestion;
      delete this.frame.codeWheelAttempt;
      this.sequence++;
    }
  }

  /** The game could not be given a command, or failed to start. */
  failed(message: string) { this.stopped ??= message; }

  /**
   * /state: everything the page shows, or with `after` the frame it already has, only what else changed.
   * One window plays the game. The page names itself and the newest one to start claims the game. Any
   * other window, such as a second window opened on the same game, is told it has been superseded and
   * stops, so nothing is heard twice. A request with no page name (a check reading the state from
   * outside a page) is answered in full.
   */
  state(after?: number, page?: string, claim = false): object {
    const { artwork } = this.options;
    if (page !== undefined && claim) this.activePage = page;
    if (this.activePage && page !== undefined && page !== this.activePage) return { superseded: true, sequence: this.sequence, ready: false };
    const frame = this.frame;
    const portraitAsset = frame.portrait ? artwork.get(frame.portrait) : undefined;
    const snapshot = after === this.sequence ? {} : {
      ...frame,
      reflectedTiles: this.reflectedTiles,
      portraitAssetKey: portraitAsset && this.portraitAssetKeys.get(portraitAsset.path),
      art: frame.scene && artwork.has(frame.scene) ? `/art/${frame.scene}` : undefined,
    };
    return {
      ...snapshot, sounds: this.sounds, soundId: this.soundId, messages: this.messages, textId: this.textId,
      narrationId: this.narrationId, automapRevision: this.automapRevision,
      sequence: this.sequence, ready: this.ready, codeWheelAvailable: this.options.codeWheelAvailable,
      classicAvailable: this.options.classicAvailable, buildVersion: this.options.buildVersion,
      saveSlot: this.saveSlot ?? null, saveSlotEvent: this.saveSlotEvent, saveSlotAction: this.saveSlotAction ?? null,
      stopped: this.stopped ?? null, notice: this.notice ?? null,
    };
  }

  /** /key: one key or command from the page, as an HTTP status (204 given, 400 refused, 409 not now). */
  key(command: string, { expected, page, codeWheel }: KeyRequest = {}): 204 | 400 | 409 {
    const frame = this.frame;
    const sequence = this.sequence;
    if (this.activePage && page !== undefined && page !== this.activePage) return 409;
    if (command.length > 64) return 400;
    if (!this.ready || this.stopped || (expected !== undefined && expected !== String(sequence))) return 409;
    const track = /^track ([1-9]\d{0,2})$/.exec(command);
    const validTrack = frame.journal && (command === "track auto" ||
      (track && Number(track[1]) <= frame.journal.leads.filter(isOpenObjective).length));
    const recordedPoll = this.options.recordedPolls && frame.prompt === "poll" && !frame.awaitsKey;
    const validPoll = expected === String(sequence) && (command === ":poll" && (frame.automaticCombat || frame.battleEntryPolling || frame.presentationPolling) ||
      command === ":travel-poll" && (frame.travelPolling || recordedPoll));
    // While the game plays an animation by itself it takes no key: the page only asks for more of it.
    if (frame.presentationPolling && !validPoll) return 409;
    const unlockCombat = command === ":idspispopd" && expected === String(sequence);
    const validDeveloperVictory = command === developerVictoryCommand && expected === String(sequence) &&
      frame.developerVictoryAvailable;
    const validLabel = /^:map-label(?: [\x20-\x7e]{0,40})?$/.test(command) && Boolean(frame.exploration);
    if (command.length > 16 && !validLabel) return 400;
    const gameKey = command.startsWith("key ") ? command.slice(4) : command;
    if ((!validTrack && !validPoll && !unlockCombat && !validDeveloperVictory && !validLabel && getKey(gameKey) === undefined) ||
        (frame.journal && command.toLowerCase() !== "j" && !validTrack)) return 400;
    const enableCodeWheel = codeWheel && this.options.codeWheelAvailable &&
      command === "backspace" && expected === String(sequence) &&
      (frame.scene === "scene:title" || frame.scene === "scene:publisher");
    this.ready = false;
    this.notice = undefined;
    this.options.write((enableCodeWheel ? ":enable-code-wheel" : track ? `track ${track[1]}` : command) + "\n");
    return 204;
  }

  /** /automap.json: the discovered map the game keeps in its save slot. */
  automapJson(): string { return this.automap; }

  /** POST /automap: a map kept by an older browser, offered once for the loaded slot. */
  importAutomap(maps: unknown): 204 | 409 {
    if (!this.ready || this.stopped || this.frame.journal || !maps || typeof maps !== "object") return 409;
    this.ready = false;
    this.options.write(`:automap-import ${JSON.stringify(maps)}\n`);
    return 204;
  }
}
