import type { Cpu } from "../cpu/machine.js";
import type { NarrationTrigger, RuntimeNarrationManifest } from "./narration.js";
import { authoredScriptPosition, data, runningScriptPosition } from "./bindings.js";

interface SourcePart { operandIndex: number; kind: string; rawText?: string; address?: string }
interface SourceEvent {
  sourceId: string;
  source: { archive: string; block: number; address: string; instruction: string };
  outputParts: SourcePart[];
}
interface StaticSelector { triggerSourceId: string; resolution?: string; playback?: string; selector?: any; discriminator?: any; cases?: any[]; variants?: any[] }
export interface ObserverManifest extends RuntimeNarrationManifest { events: SourceEvent[]; staticSelectors?: StaticSelector[] }
export interface EclNarrationEvent extends NarrationTrigger {
  archive: string;
  block: number;
  address: string;
  operand?: number;
  sourceOperandId?: string;
  step: number;
}

/**
 * One decision of the observer, reported to `onDecision` when a listener is attached.
 * It describes what the observer did and changes none of it. tools/narration-ledger.ts
 * writes these to the narration ledger (docs/NARRATION-QA.md).
 */
export interface NarrationDecision {
  kind:
    /** The script reached a text instruction of the manifest; `event` is what the observer returned. */
    | "event"
    /** The script reached a manifest position but the instruction there is not the one the manifest names. */
    | "opcode-mismatch"
    /** A selector's passage printed and its narration waits for a later print to show the branch. */
    | "selector-deferred"
    /** A selector waits for the menu instruction it belongs to to draw one of its texts. */
    | "selector-awaits-render"
    /** A selector chose a unit; `event` is the narration. */
    | "selector-resolved"
    /** A selector chose a case the manifest marks as silent. */
    | "selector-silent-by-design"
    /** A selector read its value and no case matched it. */
    | "selector-unmatched"
    /** A selector that waited for a menu text was still waiting when the next instruction began. */
    | "selector-unrendered"
    /** A deferred selector was still waiting when the script block changed. */
    | "selector-dropped"
    /** An encounter menu with variants waits for the game to draw its text. */
    | "variant-awaits-render"
    /** An encounter menu with variants: the slot's value is not one of the variants. */
    | "variant-unmatched"
    /** An encounter menu with variants drew the expected text; `event` is the narration. */
    | "variant-rendered"
    /** An encounter menu with variants was still waiting for its text when the next instruction began. */
    | "variant-unrendered";
  /** The source event the script reached, or the selector's trigger when the selector is the subject. */
  sourceId: string;
  archive: string;
  block: number;
  step: number;
  event?: EclNarrationEvent;
  /** The selector's trigger source event. */
  trigger?: string;
  /** The step at which the selector began to wait. */
  since?: number;
  /** The slot a variant condition or a selector tested, and the value read from it. */
  slot?: string;
  value?: string | number;
}

const opcodeForInstruction: Record<string, number> = {
  PRINT: 0x11,
  PRINTCLEAR: 0x12,
  "VERTICAL MENU": 0x15,
  "ENCOUNTER MENU": 0x29,
  "HORIZONTAL MENU": 0x2b,
  "PRINT RETURN": 0x33
};
export const eclTextOpcodes: ReadonlySet<number> = new Set(Object.values(opcodeForInstruction));

/**
 * Observes the ECL interpreter before the opcode handler runs. DS:52d4 and
 * DS:82a2 identify the current ECL archive and block. DS:494e points to the
 * opcode in the loaded buffer at DS:493f, with ECL address 0x9900 at offset 0.
 */
export class EclNarrationObserver {
  private archive: string | undefined;
  private block: number | undefined;
  private readonly eventsByLocation = new Map<string, SourceEvent>();
  private readonly eventsById = new Map<string, SourceEvent>();
  private readonly unitsByTrigger = new Map<string, ObserverManifest["units"]>();
  private readonly selectorsByTrigger = new Map<string, StaticSelector>();
  private readonly deferred: StaticSelector[] = [];
  private pendingMenu: { selector: StaticSelector; event: SourceEvent } | undefined;
  private pendingDynamicMenu: { event: EclNarrationEvent; text: string } | undefined;
  private readonly deferredSince = new Map<string, number>();
  private selectorValue: string | number | undefined;
  /** Receives every decision. Observes only: nothing the observer returns depends on it. */
  onDecision: ((decision: NarrationDecision) => void) | undefined;

  private decide(cpu: Cpu, kind: NarrationDecision["kind"], sourceId: string, detail: Partial<NarrationDecision> = {}): void {
    this.onDecision?.({ kind, sourceId, archive: this.archive ?? "", block: this.block ?? -1, step: cpu.steps, ...detail });
  }

  /** The selectors still waiting, for a ledger written when the run ends. */
  waiting(): { trigger: string; since: number | undefined }[] {
    return this.deferred.map(({ triggerSourceId }) => ({ trigger: triggerSourceId, since: this.deferredSince.get(triggerSourceId) }));
  }

  /** The slot whose value selects among a unit's variants, as the observer reads it. */
  variantSlot(unitId: string): string | undefined {
    return this.unitDynamicPart(this.manifest.units.find(unit => unit.id === unitId))?.address;
  }

  constructor(readonly manifest: ObserverManifest) {
    for (const event of manifest.events) {
      this.eventsByLocation.set(`${event.source.archive}:${event.source.block}:${event.source.address.toLowerCase()}`, event);
      this.eventsById.set(event.sourceId, event);
    }
    for (const unit of manifest.units)
      this.unitsByTrigger.set(unit.triggerSourceId, [...(this.unitsByTrigger.get(unit.triggerSourceId) ?? []), unit]);
    for (const selector of manifest.staticSelectors ?? []) this.selectorsByTrigger.set(selector.triggerSourceId, selector);
  }

  observe(cpu: Cpu): EclNarrationEvent | undefined {
    const archive = `ECL${cpu.read8(cpu.ds, data.eclArchive)}.DAX`;
    const block = cpu.read8(cpu.ds, data.eclBlock);
    if (this.archive !== archive || this.block !== block) {
      for (const { triggerSourceId } of this.deferred)
        this.decide(cpu, "selector-dropped", triggerSourceId, { trigger: triggerSourceId, since: this.deferredSince.get(triggerSourceId) });
      this.archive = archive;
      this.block = block;
      this.deferred.length = 0;
    }
    if (this.pendingMenu) this.decide(cpu, "selector-unrendered", this.pendingMenu.event.sourceId, { trigger: this.pendingMenu.selector.triggerSourceId });
    if (this.pendingDynamicMenu) {
      const { event: waiting, text } = this.pendingDynamicMenu;
      const slot = waiting.unitId ? this.variantSlot(waiting.unitId) : undefined;
      this.decide(cpu, "variant-unrendered", waiting.sourceId, { value: text, ...(slot ? { slot } : {}) });
    }
    this.pendingMenu = undefined;
    this.pendingDynamicMenu = undefined;
    const addressNumber = cpu.read16(cpu.ds, data.eclCursor);
    // Narration is keyed by script positions in the first release's numbering.
    const address = `0x${authoredScriptPosition(cpu, addressNumber, cpu.ds).toString(16).padStart(4, "0")}`;
    const event = this.eventsByLocation.get(`${archive}:${block}:${address}`);
    if (!event) return undefined;
    const expectedOpcode = opcodeForInstruction[event.source.instruction];
    if (expectedOpcode === undefined) return undefined;
    const bufferOffset = cpu.read16(cpu.ds, data.eclCode);
    const bufferSegment = cpu.read16(cpu.ds, data.eclCode + 2);
    const opcodeOffset = (bufferOffset + addressNumber + 0x6700) & 0xffff;
    if (cpu.read8(bufferSegment, opcodeOffset) !== expectedOpcode) {
      this.decide(cpu, "opcode-mismatch", event.sourceId, { value: cpu.read8(bufferSegment, opcodeOffset) });
      return undefined;
    }

    // An opening print whose branch is not yet knowable is deliberately silent.
    // The first mapped covered source resolves and consumes it exactly once.
    for (let index = 0; index < this.deferred.length; index++) {
      const pending = this.deferred[index]!;
      const selected = this.selectBySource(pending, event.sourceId);
      if (selected) {
        this.deferred.splice(index, 1);
        const resolved = this.makeEvent(cpu, this.eventsById.get(pending.triggerSourceId)!, selected);
        const since = this.deferredSince.get(pending.triggerSourceId);
        const slot = resolved.unitId ? this.variantSlot(resolved.unitId) : undefined;
        this.decide(cpu, "selector-resolved", event.sourceId, { event: resolved, trigger: pending.triggerSourceId,
          ...(since === undefined ? {} : { since }), ...(slot ? { slot } : {}) });
        return resolved;
      }
    }

    const staticSelector = this.selectorsByTrigger.get(event.sourceId);
    if (staticSelector) {
      const mode = staticSelector.playback ?? staticSelector.resolution;
      if (mode === "defer-until-covered-source" || mode === "deferred-covered-source") {
        if (!this.deferred.some(item => item.triggerSourceId === staticSelector.triggerSourceId)) {
          this.deferred.push(staticSelector);
          this.deferredSince.set(staticSelector.triggerSourceId, cpu.steps);
        }
        const since = this.deferredSince.get(staticSelector.triggerSourceId);
        this.decide(cpu, "selector-deferred", event.sourceId, { trigger: staticSelector.triggerSourceId,
          ...(since === undefined ? {} : { since }) });
        return undefined;
      }
      if (mode === "defer-until-command-render" || mode === "during-trigger" || mode === "during-instruction") {
        this.pendingMenu = { selector: staticSelector, event };
        this.decide(cpu, "selector-awaits-render", event.sourceId, { trigger: staticSelector.triggerSourceId });
        return undefined;
      }
      this.selectorValue = undefined;
      const selected = this.selectFromCpu(cpu, staticSelector);
      const tested = this.selectorValue === undefined ? {} : { value: this.selectorValue };
      if (!selected || selected.action === "none") {
        this.decide(cpu, selected ? "selector-silent-by-design" : "selector-unmatched", event.sourceId,
          { trigger: staticSelector.triggerSourceId, ...tested });
        return undefined;
      }
      const chosen = this.makeEvent(cpu, event, selected);
      const slot = chosen.unitId ? this.variantSlot(chosen.unitId) : undefined;
      this.decide(cpu, "selector-resolved", event.sourceId, { event: chosen, trigger: staticSelector.triggerSourceId, ...tested,
        ...(slot ? { slot } : {}) });
      return chosen;
    }

    const candidates = this.unitsByTrigger.get(event.sourceId) ?? [];
    const [candidate] = candidates.length === 1 ? candidates : [];
    const dynamicValue = this.readUnitDynamicValue(cpu, candidate);
    if (event.source.instruction === "ENCOUNTER MENU" && candidate?.runtimeVariants?.length) {
      const part = event.outputParts.find(part => part.kind === "dynamic-string");
      if (part && dynamicValue !== undefined && candidate.runtimeVariants.some(variant => variant.dynamicValue === dynamicValue)) {
        this.pendingDynamicMenu = {
          event: this.makeEvent(cpu, event, { unitId: candidate.id, runtimeDynamicValue: dynamicValue }, part.operandIndex),
          text: this.normalizeMenuText(dynamicValue)
        };
      }
      this.decide(cpu, this.pendingDynamicMenu ? "variant-awaits-render" : "variant-unmatched", event.sourceId,
        { ...(part?.address ? { slot: part.address } : {}), ...(dynamicValue === undefined ? {} : { value: dynamicValue }) });
      return undefined;
    }
    const literalOperands = event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim());
    const spoken = candidates.length === 1 ? candidates[0]!.spokenText.trim() : "";
    const matchingOperands = literalOperands.filter(part => spoken && part.rawText?.trim() === spoken);
    const operand = matchingOperands.length === 1 ? matchingOperands[0]!.operandIndex : undefined;
    const reached: EclNarrationEvent = {
      sourceId: event.sourceId,
      ...(candidates.length === 1 ? { unitId: candidates[0]!.id } : {}),
      ...(dynamicValue !== undefined ? { dynamicValue } : {}),
      archive: this.archive,
      block: this.block,
      address,
      ...(operand !== undefined ? { operand, sourceOperandId: `${event.sourceId}.operand-${operand}` } : {}),
      step: cpu.steps
    };
    if (this.onDecision) {
      const slot = candidate ? this.variantSlot(candidate.id) : undefined;
      this.decide(cpu, "event", event.sourceId, { event: reached, ...(slot ? { slot } : {}),
        ...(dynamicValue === undefined ? {} : { value: dynamicValue }) });
    }
    return reached;
  }

  /** Called by ENCOUNTER MENU when it emits one of its decoded literal operands. */
  observeMenuOperand(cpu: Cpu, operandIndex: number): EclNarrationEvent | undefined {
    const pending = this.pendingMenu;
    if (!pending) return undefined;
    const selected = this.selectByValue(pending.selector, operandIndex);
    if (!selected) return undefined;
    this.pendingMenu = undefined;
    if (selected.action === "none") {
      this.decide(cpu, "selector-silent-by-design", pending.event.sourceId, { trigger: pending.selector.triggerSourceId, value: operandIndex });
      return undefined;
    }
    const chosen = this.makeEvent(cpu, pending.event, selected, operandIndex);
    this.decide(cpu, "selector-resolved", pending.event.sourceId, { event: chosen, trigger: pending.selector.triggerSourceId, value: operandIndex });
    return chosen;
  }

  /** Resolve an ENCOUNTER MENU from the message the original game actually drew. */
  observeRenderedText(cpu: Cpu, message: string): EclNarrationEvent | undefined {
    const rendered = this.normalizeMenuText(message);
    if (this.pendingDynamicMenu?.text === rendered) {
      const { event } = this.pendingDynamicMenu;
      this.pendingDynamicMenu = undefined;
      const drawn = { ...event, step: cpu.steps };
      const slot = event.unitId ? this.variantSlot(event.unitId) : undefined;
      this.decide(cpu, "variant-rendered", event.sourceId, { event: drawn, ...(slot ? { slot } : {}),
        ...(event.dynamicValue === undefined ? {} : { value: event.dynamicValue }) });
      return drawn;
    }
    const pending = this.pendingMenu;
    if (!pending) return undefined;
    const part = pending.event.outputParts.find(candidate =>
      candidate.kind === "literal" && this.normalizeMenuText(candidate.rawText ?? "") === rendered);
    return part?.operandIndex === undefined ? undefined : this.observeMenuOperand(cpu, part.operandIndex);
  }

  private normalizeMenuText(text: string): string { return text.replace(/\s+/g, " ").trim().toUpperCase(); }

  private makeEvent(cpu: Cpu, event: SourceEvent, selected: any, operand?: number): EclNarrationEvent {
    const unit = this.unitsByTrigger.get(event.sourceId)?.find(unit => unit.id === selected.unitId);
    const dynamicValue = selected.runtimeDynamicValue ?? this.readUnitDynamicValue(cpu, unit);
    return { sourceId: event.sourceId, unitId: selected.unitId,
      ...(dynamicValue === undefined ? {} : { dynamicValue }),
      archive: this.archive!, block: this.block!, address: event.source.address,
      ...(operand === undefined ? {} : { operand, sourceOperandId: `${event.sourceId}.operand-${operand}` }), step: cpu.steps };
  }

  private selectBySource(selector: StaticSelector, sourceId: string): any | undefined {
    return (selector.selector?.cases ?? selector.cases ?? []).find((entry: any) => entry.sourceId === sourceId);
  }

  private selectByValue(selector: StaticSelector, value: number | string): any | undefined {
    const entries = selector.selector?.cases ?? selector.cases ?? selector.variants ?? [];
    return entries.find((entry: any) => entry.operandIndex === value ||
      this.conditionMatches(undefined, entry.when ?? entry, value));
  }

  private selectFromCpu(cpu: Cpu, selector: StaticSelector): any | undefined {
    const descriptor = selector.selector ?? selector.discriminator ?? {};
    const entries = selector.selector?.cases ?? selector.cases ?? selector.variants ?? [];
    let value: number | string | undefined;
    const address = descriptor.address ?? descriptor.memoryAddress;
    if (["memory-u8", "memoryByte", "onGosubIndex", "ecl-memory-byte"].includes(descriptor.kind))
      value = this.readEclValue(cpu, this.hex(address));
    else if (descriptor.kind === "ecl-string") {
      value = this.readEclString(cpu, address);
      if (descriptor.normalization === "trim-uppercase") value = value.trim().toUpperCase();
    } else if (descriptor.kind === "memoryComparison") {
      const left = this.readEclValue(cpu, this.hex(descriptor.leftAddress));
      const right = this.readEclValue(cpu, this.hex(descriptor.rightAddress));
      this.selectorValue = `${left} against ${right}`;
      return entries.find((entry: any) => entry.when?.operator === "<=" ? left <= right : entry.when?.operator === ">" ? left > right : false);
    }
    this.selectorValue = value;
    return entries.find((entry: any) => this.conditionMatches(cpu, entry.when ?? entry, value));
  }

  private conditionMatches(cpu: Cpu | undefined, condition: any, value: any): boolean {
    if (condition.all) return condition.all.every((part: any) => this.conditionMatches(cpu, part, value));
    if (condition.bitAnd) {
      if (!cpu) return false;
      const part = condition.bitAnd;
      return this.conditionMatches(cpu, part, this.readEclValue(cpu, this.hex(part.address)) & part.mask);
    }
    if (condition.equals !== undefined) return value === condition.equals;
    if (condition.notEquals !== undefined) return value !== condition.notEquals;
    if (condition.in) return condition.in.includes(value);
    if (condition.notIn) return !condition.notIn.includes(value);
    if (condition.lessThan !== undefined) return value < condition.lessThan;
    if (condition.greaterThanOrEqual !== undefined) return value >= condition.greaterThanOrEqual;
    return false;
  }

  private hex(value: string): number { return Number.parseInt(value.slice(2), 16); }

  // ECL variable addresses index words, while scripts index bytes.
  private eclStorage(cpu: Cpu, address: number): { segment: number; offset: number; stride: number } {
    const region: [number, number, number] | undefined = address >= 0x4900 && address <= 0x4cff ? [data.eclGlobals, 0x6e00, 2]
      : address >= 0x6b00 && address <= 0x6eff ? [data.eclStrings, 0x2a00, 2]
      : address >= 0x9700 && address <= 0x98ff ? [data.eclLocals, -0x2e00, 2]
      : address >= 0x9900 && address <= 0xb6ff ? [data.eclCode, 0x6700, 1]
      : undefined;
    if (!region) return { segment: cpu.ds, offset: address, stride: 1 };
    const [pointer, bias, stride] = region;
    // A manifest address inside the script itself is in the first release's numbering.
    if (pointer === data.eclCode) {
      address = runningScriptPosition(cpu, address, cpu.ds);
    }
    return {
      segment: cpu.read16(cpu.ds, pointer + 2),
      offset: (cpu.read16(cpu.ds, pointer) + bias + address * stride) & 0xffff,
      stride
    };
  }

  private readEclValue(cpu: Cpu, address: number): number {
    if (address >= 0xc04b && address <= 0xc04d) return cpu.read8(cpu.ds, data.cameraX + address - 0xc04b);
    const { segment, offset, stride } = this.eclStorage(cpu, address);
    return stride === 2 ? cpu.read16(segment, offset) : cpu.read8(segment, offset);
  }

  private readUnitDynamicValue(cpu: Cpu, unit: ObserverManifest["units"][number] | undefined): string | undefined {
    const part = this.unitDynamicPart(unit);
    if (!part?.address) return undefined;
    return part.kind === "dynamic-string" ? this.readEclString(cpu, part.address) : String(this.readEclValue(cpu, this.hex(part.address)));
  }

  /** The one changing output part that tells a unit's variants apart, when there is exactly one such slot. */
  private unitDynamicPart(unit: ObserverManifest["units"][number] | undefined): SourcePart | undefined {
    if (!unit?.runtimeVariants?.length) return undefined;
    const parts = unit.coveredSourceIds.flatMap(id => (this.eventsById.get(id)?.outputParts ?? [])
      .filter(part => part.kind === "dynamic-string" || part.kind === "dynamic-value"));
    // An authored recording can replace a count while still varying by the displayed noun.
    const strings = parts.filter(part => part.kind === "dynamic-string");
    const selectors = strings.length ? strings : parts;
    const [part] = selectors;
    if (!part?.address || selectors.some(other => other.address !== part.address)) return undefined;
    return part;
  }

  private readEclString(cpu: Cpu, address: string): string {
    const { segment, offset, stride } = this.eclStorage(cpu, this.hex(address));
    // ECL SAVE writes zero-terminated characters, one per addressable slot.
    let text = "";
    for (let index = 0; index < 255; index++) {
      const byte = cpu.read8(segment, (offset + index * stride) & 0xffff);
      if (byte === 0) break;
      text += String.fromCharCode(byte);
    }
    return text;
  }
}
