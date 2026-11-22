export interface RuntimeNarrationVariant {
  id: string;
  dynamicValue: string;
  text: string;
  asset: string;
}

export interface RuntimeNarrationUnit {
  id: string;
  triggerSourceId: string;
  coveredSourceIds: string[];
  spokenText: string;
  asset: string | null;
  generationEligible: boolean;
  resolution: string;
  variant?: string | null;
  runtimeVariants?: RuntimeNarrationVariant[];
  /**
   * The slot whose value is a variant's `dynamicValue`, when it is not a slot the unit prints: the
   * vote at Tyranthraxus prints the voter's typed name and is told apart by the voter's place in
   * the party. Without it the observer selects on the one changing slot the unit prints.
   */
  selector?: { kind: "dynamic-value" | "dynamic-string"; address: string };
}

export interface RuntimeNarrationManifest {
  enhancedOnly: boolean;
  units: RuntimeNarrationUnit[];
}

export interface NarrationTrigger {
  sourceId: string;
  /** Selects a finite control-flow unit when multiple reviewed units share a trigger. */
  unitId?: string;
  /** Selects a named static variant when the producer has that selector rather than a unit ID. */
  variant?: string;
  /** Selects a generated finite runtime variant containing a dynamic ECL string. */
  dynamicValue?: string;
}

export interface ResolvedNarration {
  unitId: string;
  variantId?: string;
  triggerSourceId: string;
  coveredSourceIds: string[];
  asset: string;
  text: string;
}

export type NarrationResolution =
  | { status: "resolved"; narration: ResolvedNarration }
  | { status: "continuation" | "not-found" | "ambiguous" | "selector-required" | "unavailable" };

/**
 * Source-ID index over the manually reviewed master manifest. It deliberately
 * refuses to guess when branches share a trigger: the ECL observer must supply
 * a unit/variant selector derived from the branch it is actually executing.
 */
export class NarrationCatalog {
  readonly enhancedOnly: boolean;
  private readonly byTrigger = new Map<string, RuntimeNarrationUnit[]>();
  private readonly covered = new Map<string, Set<string>>();

  constructor(readonly manifest: RuntimeNarrationManifest) {
    this.enhancedOnly = manifest.enhancedOnly;
    for (const unit of manifest.units) {
      this.byTrigger.set(unit.triggerSourceId, [...(this.byTrigger.get(unit.triggerSourceId) ?? []), unit]);
      for (const sourceId of unit.coveredSourceIds) {
        const unitIds = this.covered.get(sourceId) ?? new Set<string>();
        unitIds.add(unit.id);
        this.covered.set(sourceId, unitIds);
      }
    }
  }

  resolve(trigger: NarrationTrigger): NarrationResolution {
    let candidates = this.byTrigger.get(trigger.sourceId) ?? [];
    if (candidates.length === 0) return this.covered.has(trigger.sourceId) ? { status: "continuation" } : { status: "not-found" };
    if (trigger.unitId) candidates = candidates.filter(unit => unit.id === trigger.unitId);
    if (trigger.variant !== undefined) candidates = candidates.filter(unit => unit.variant === trigger.variant);
    if (candidates.length === 0) return { status: "not-found" };
    if (candidates.length > 1) return { status: "ambiguous" };
    const unit = candidates[0]!;
    if (!unit.generationEligible) return { status: "unavailable" };
    const variants = unit.runtimeVariants ?? [];
    if (variants.length > 0) {
      if (trigger.dynamicValue === undefined) return { status: "selector-required" };
      const matches = variants.filter(variant => variant.dynamicValue === trigger.dynamicValue);
      if (matches.length !== 1) return { status: "not-found" };
      const variant = matches[0]!;
      return { status: "resolved", narration: {
        unitId: unit.id, variantId: variant.id, triggerSourceId: unit.triggerSourceId,
        coveredSourceIds: unit.coveredSourceIds, asset: variant.asset, text: variant.text
      } };
    }
    if (!unit.asset) return { status: "unavailable" };
    return { status: "resolved", narration: {
      unitId: unit.id, triggerSourceId: unit.triggerSourceId,
      coveredSourceIds: unit.coveredSourceIds, asset: unit.asset, text: unit.spokenText
    } };
  }

  assetFiles(): Set<string> {
    return new Set(this.manifest.units.flatMap(unit => [
      ...(unit.asset ? [unit.asset] : []),
      ...(unit.runtimeVariants ?? []).map(variant => variant.asset)
    ]));
  }
}

/** Text as the play server compares it: runs of white space collapsed, upper case. */
export const normalizeSpeech = (text: string): string => text.replace(/\s+/g, " ").trim().toUpperCase();

/**
 * Units that text drawn outside the scripts can start, by that text. Only a unit with one
 * recording qualifies, and the caller narrates only when exactly one unit has the text.
 */
export function exactTextNarrations<Unit extends RuntimeNarrationUnit>(manifest: {
  units: Unit[]; events: { sourceId: string; normalizedText: string }[];
}): Map<string, Unit[]> {
  const unitsByTrigger = new Map<string, Unit[]>();
  for (const unit of manifest.units)
    unitsByTrigger.set(unit.triggerSourceId, [...(unitsByTrigger.get(unit.triggerSourceId) ?? []), unit]);
  const byText = new Map<string, Unit[]>();
  for (const event of manifest.events) {
    const text = normalizeSpeech(event.normalizedText);
    if (!text) continue;
    for (const unit of unitsByTrigger.get(event.sourceId) ?? []) {
      if (!unit.asset || (unit.runtimeVariants?.length ?? 0) > 0) continue;
      byText.set(text, [...(byText.get(text) ?? []), unit]);
    }
  }
  return byText;
}

/** Small deterministic queue used by adapters that play one narration clip at a time. */
export class NarrationQueue<T> {
  private pending: T[] = [];
  current: T | undefined;

  enqueue(item: T): T | undefined {
    this.pending.push(item);
    return this.advance();
  }

  complete(): T | undefined {
    this.current = undefined;
    return this.advance();
  }

  interrupt(): void {
    this.current = undefined;
    this.pending = [];
  }

  get pendingCount(): number { return this.pending.length; }

  private advance(): T | undefined {
    if (this.current !== undefined) return undefined;
    this.current = this.pending.shift();
    return this.current;
  }
}
