import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { basename, dirname } from "node:path";
import type { EclNarrationObserver, NarrationDecision, ObserverManifest } from "../src/runtime/ecl-narration-observer.js";
import { exactTextNarrations, NarrationCatalog, normalizeSpeech } from "../src/runtime/narration.js";
import { portraitKey, scriptIllustrations } from "./portrait-art.js";
import { loadUpgradeArt } from "./upgrade-art.js";
import { fromPortRoot } from "./port-root.js";

// The narration ledger: what the narrator was asked to say during a run, and what was on screen.
//
//   POR_NARRATION_LEDGER=out/narration-ledgers/<run>.jsonl
//
// The runner appends one line for every decision the narration observer makes, and one line for
// the artwork the Enhanced display resolved on the frames that follow. The ledger observes only:
// it reads the decisions and the frame state and writes a file. `npm run qa:narration -- --merge`
// folds ledgers into qa/narration-coverage.json. docs/NARRATION-QA.md describes the lines.

/** What a narration line says happened at a source event. */
export type LedgerOutcome =
  /** A unit started: this is its trigger, at its passage. */
  | "heard"
  /** A print that an already started unit covers. It correctly starts nothing. */
  | "covered"
  /** A text instruction that carries no narration in the manifest (menu choices and the like). */
  | "unvoiced"
  /** The passage waits for a later print, or for its menu to draw, before it can be narrated. */
  | "waiting"
  /** The manifest marks this case as silent. */
  | "silent-by-design"
  /** Nothing was narrated where narration belongs. `silent` names the kind. */
  | "silent";

export type SilentKind =
  /** A voiced source event was reached and no unit could be chosen for it. */
  | "no-unit"
  /** The unit has variants and the slot's value matches none of them. */
  | "no-variant"
  /** A selector's value matched no case, or the menu text it waited for was never drawn. */
  | "selector-unresolved"
  /** A deferred selector was dropped when the script block changed before any of its cases printed. */
  | "selector-dropped"
  /** A covered print was reached and none of the units that cover it had started in this visit to the script. */
  | "covered-without-trigger"
  /** The script reached a narrated position and the instruction there is not the one the manifest names. */
  | "opcode-mismatch";

export interface LedgerNarration {
  t: "n";
  /** The runner process. One ledger file can hold several games. */
  s: number;
  step: number;
  outcome: LedgerOutcome;
  silent?: SilentKind;
  /** How the unit was chosen: by script position, by a selector, by a menu's drawn text, or by exact text outside the scripts. */
  via: "script" | "selector" | "menu-text" | "exact-text";
  sourceId: string;
  archive: string;
  block: number;
  unitId?: string;
  variantId?: string;
  asset?: string;
  slot?: string;
  value?: string | number;
  /** The selector's trigger, and the step at which it began to wait. */
  selector?: string;
  since?: number;
  /** For a covered print: the units that cover it, and the step at which one of them last started in this visit. */
  units?: string[];
  heardAt?: number | null;
  /** The catalogue's answer when it was not "resolved". */
  status?: string;
}

export interface LedgerFrame {
  t: "f";
  s: number;
  /** The game is waiting for a key on this frame. */
  key?: true;
  scene?: string;
  /** An Enhanced portrait or scene illustration: a key of the artwork manifests. */
  portrait?: string;
  /** An original picture is showing and no Enhanced artwork replaces it. */
  classic?: { area: number | undefined; cursor: number | undefined; caller: number | undefined };
  /** An Enhanced encounter picture: a key of the artwork manifests. */
  encounter?: string;
  /** The first-person view of where the party stands is on screen (the Enhanced page draws it as the street view). */
  view?: true;
}

export interface FrameArt {
  awaitsKey: boolean;
  scene: string | undefined;
  portrait: string | undefined;
  classicPortrait: { area: number | undefined; cursor: number | undefined; caller: number | undefined } | undefined;
  encounter: string | undefined;
  view?: boolean;
}

function create(path: string) {
  mkdirSync(dirname(path), { recursive: true });
  const session = process.pid;
  const write = (line: object) => appendFileSync(path, JSON.stringify(line) + "\n");
  // The play server hands the runner the list of installed artwork. A runner started without it
  // (the acceptance harness) would match no artwork at all, so the ledger supplies the same list.
  let artwork = "given";
  if (!process.env.POR_PORTRAIT_ART_KEYS) {
    const installed = loadUpgradeArt();
    process.env.POR_PORTRAIT_ART_KEYS = [...installed.keys()].filter(key => portraitKey.test(key) || scriptIllustrations.has(key)).join(",");
    process.env.POR_ENCOUNTER_ART = JSON.stringify(Object.fromEntries([...installed].flatMap(([id, { encounter }]) =>
      encounter ? [[id, encounter]] : [])));
    artwork = "loaded by the ledger";
  }
  write({ t: "run", s: session, run: process.env.POR_NARRATION_RUN ?? basename(path).replace(/\.jsonl$/, ""), artwork,
    clock: process.env.POR_CLOCK ?? "fixed" });

  let catalog: NarrationCatalog | undefined;
  let exact: ReturnType<typeof exactTextNarrations> | undefined;
  let explicitVoice: string[] = [];
  const coveredBy = new Map<string, string[]>();
  const triggers = new Set<string>();
  let observer: EclNarrationObserver | undefined;
  // Units started since the script block last changed, and selectors now waiting.
  let visit = "";
  const started = new Map<string, number>();
  const waiting = new Set<string>();
  let owed = false;
  let lastArt = "";

  function narration(line: Omit<LedgerNarration, "t" | "s">) {
    write({ t: "n", s: session, ...line });
    if (line.outcome === "heard") owed = true;
  }

  function heard(decision: NarrationDecision, via: LedgerNarration["via"]): void {
    const event = decision.event!;
    const answer = catalog!.resolve(event);
    const base = { step: decision.step, via, sourceId: event.sourceId, archive: decision.archive, block: decision.block,
      ...(event.unitId ? { unitId: event.unitId } : {}),
      ...(decision.slot ? { slot: decision.slot } : {}), ...(decision.value === undefined ? {} : { value: decision.value }),
      ...(decision.trigger ? { selector: decision.trigger } : {}), ...(decision.since === undefined ? {} : { since: decision.since }) };
    if (answer.status === "resolved") {
      const { unitId, variantId, asset } = answer.narration;
      started.set(unitId, decision.step);
      narration({ ...base, outcome: "heard", unitId, ...(variantId ? { variantId } : {}), asset,
        ...(variantId && event.dynamicValue !== undefined ? { value: event.dynamicValue } : {}) });
    } else if (answer.status === "continuation") {
      const units = coveredBy.get(event.sourceId) ?? [];
      const steps = units.flatMap(unit => started.has(unit) ? [started.get(unit)!] : []);
      const pending = units.some(unit => waiting.has(unitTrigger.get(unit) ?? ""));
      const heardAt = steps.length ? Math.max(...steps) : null;
      narration({ ...base, outcome: heardAt === null && !pending ? "silent" : "covered",
        ...(heardAt === null && !pending ? { silent: "covered-without-trigger" as const } : {}), units, heardAt });
    } else if (answer.status === "not-found" && !triggers.has(event.sourceId) && !coveredBy.has(event.sourceId)) {
      narration({ ...base, outcome: "unvoiced" });
    } else {
      // ambiguous, selector-required, unavailable, or a variant family whose value matches no variant.
      const variants = event.unitId !== undefined && (answer.status === "not-found" || answer.status === "selector-required");
      narration({ ...base, outcome: "silent", silent: variants ? "no-variant" : "no-unit", status: answer.status,
        ...(event.dynamicValue === undefined ? {} : { value: event.dynamicValue }) });
    }
  }

  const unitTrigger = new Map<string, string>();

  return {
    /** Attach to the observer the runner created. */
    observe(narrationObserver: EclNarrationObserver, manifest: ObserverManifest): void {
      observer = narrationObserver;
      catalog = new NarrationCatalog(manifest);
      exact = exactTextNarrations(manifest as ObserverManifest & { events: { sourceId: string; normalizedText: string }[] });
      const voices = JSON.parse(readFileSync(fromPortRoot("src", "audio", "voices.json"), "utf8")) as { lines: { match?: string }[] };
      explicitVoice = voices.lines.flatMap(line => line.match ? [normalizeSpeech(line.match)] : []);
      for (const unit of manifest.units) {
        triggers.add(unit.triggerSourceId);
        unitTrigger.set(unit.id, unit.triggerSourceId);
        for (const id of unit.coveredSourceIds) coveredBy.set(id, [...(coveredBy.get(id) ?? []), unit.id]);
      }
      narrationObserver.onDecision = decision => {
        const place = `${decision.archive}:${decision.block}`;
        if (decision.kind !== "selector-dropped" && place !== visit) {
          visit = place;
          started.clear();
          waiting.clear();
        }
        const subject = { step: decision.step, sourceId: decision.sourceId, archive: decision.archive, block: decision.block,
          ...(decision.trigger ? { selector: decision.trigger } : {}), ...(decision.since === undefined ? {} : { since: decision.since }),
          ...(decision.slot ? { slot: decision.slot } : {}), ...(decision.value === undefined ? {} : { value: decision.value }) };
        switch (decision.kind) {
          case "event": heard(decision, "script"); break;
          case "selector-resolved":
            waiting.delete(decision.trigger ?? "");
            heard(decision, "selector");
            break;
          case "variant-rendered": heard(decision, "menu-text"); break;
          case "selector-deferred":
            waiting.add(decision.trigger ?? "");
            narration({ ...subject, via: "selector", outcome: "waiting" });
            break;
          case "selector-awaits-render": narration({ ...subject, via: "selector", outcome: "waiting" }); break;
          case "variant-awaits-render": narration({ ...subject, via: "menu-text", outcome: "waiting" }); break;
          case "selector-silent-by-design": narration({ ...subject, via: "selector", outcome: "silent-by-design" }); break;
          case "selector-unmatched":
          case "selector-unrendered": narration({ ...subject, via: "selector", outcome: "silent", silent: "selector-unresolved", status: decision.kind }); break;
          case "selector-dropped": narration({ ...subject, via: "selector", outcome: "silent", silent: "selector-dropped" }); break;
          case "variant-unmatched":
          case "variant-unrendered": narration({ ...subject, via: "menu-text", outcome: "silent", silent: "no-variant", status: decision.kind }); break;
          case "opcode-mismatch":
            // Only a position that carries narration is a silent case. A choice list is not.
            if (triggers.has(decision.sourceId) || coveredBy.has(decision.sourceId))
              narration({ ...subject, via: "script", outcome: "silent", silent: "opcode-mismatch" });
            break;
        }
      };
      process.once("exit", () => {
        const left = observer?.waiting() ?? [];
        write({ t: "end", s: session, waiting: left });
      });
    },

    /** Text the game drew outside the scripts. The play server narrates it when exactly one unit has that text. */
    text(step: number, message: string, fromEclText: boolean): void {
      if (fromEclText || !exact) return;
      const normalized = normalizeSpeech(message);
      if (explicitVoice.some(match => normalized.includes(match))) return;
      const units = [...new Map((exact.get(normalized) ?? []).map(unit => [unit.id, unit])).values()];
      if (units.length !== 1) return;
      const unit = units[0]!;
      const archive = /ecl-(\d+)\.block-(\d+)/.exec(unit.triggerSourceId);
      narration({ step, via: "exact-text", outcome: "heard", sourceId: unit.triggerSourceId,
        archive: archive ? `ECL${archive[1]}.DAX` : "", block: archive ? Number(archive[2]) : -1, unitId: unit.id, asset: unit.asset! });
    },

    /** The artwork the Enhanced display resolved for a frame. Written while a narration awaits its frame, and when it changes. */
    frame(art: FrameArt): void {
      const line: LedgerFrame = { t: "f", s: session, ...(art.awaitsKey ? { key: true as const } : {}),
        ...(art.scene ? { scene: art.scene } : {}), ...(art.portrait ? { portrait: art.portrait } : {}),
        ...(art.classicPortrait ? { classic: art.classicPortrait } : {}), ...(art.encounter ? { encounter: art.encounter } : {}),
        ...(art.view ? { view: true as const } : {}) };
      const shown = JSON.stringify([line.scene, line.portrait, line.classic, line.encounter, line.view]);
      if (!owed && shown === lastArt) return;
      lastArt = shown;
      write(line);
      if (art.awaitsKey) owed = false;
    },
  };
}

let opened: ReturnType<typeof create> | undefined;
const ledgerPath = process.env.POR_NARRATION_LEDGER;
/**
 * The ledger, when POR_NARRATION_LEDGER names a file. Undefined otherwise. Only the runner opens
 * it: the play server imports the display code too and must neither write a ledger nor load the
 * artwork a second time.
 */
export const narrationLedger = ledgerPath ? {
  open(): void { opened ??= create(ledgerPath); },
  observe(observer: EclNarrationObserver, manifest: ObserverManifest): void { (opened ??= create(ledgerPath)).observe(observer, manifest); },
  text(step: number, message: string, fromEclText: boolean): void { opened?.text(step, message, fromEclText); },
  frame(art: FrameArt): void { opened?.frame(art); },
} : undefined;
