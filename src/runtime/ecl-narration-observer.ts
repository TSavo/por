import type { Cpu } from "../cpu/machine.js";
import type { NarrationTrigger, RuntimeNarrationManifest } from "./narration.js";

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

const opcodeForInstruction: Record<string, number> = {
  PRINT: 0x11,
  PRINTCLEAR: 0x12,
  "VERTICAL MENU": 0x15,
  "ENCOUNTER MENU": 0x29,
  "HORIZONTAL MENU": 0x2b,
  "PRINT RETURN": 0x33
};

/**
 * Observes the translated overlay dispatcher. Slice 7 procedure 0x0353 is the
 * original ECL loader: its word argument is the ECL archive number, and it
 * passes DS:52d4 as the DAX block number. DS:494e is the interpreter PC and
 * DS:493f is the loaded ECL buffer pointer (the original maps ECL 0x9900 to
 * buffer offset zero with the 0x6700 wraparound used by ovl07_0000).
 */
export class EclNarrationObserver {
  private archive: string | undefined;
  private block: number | undefined;
  private lastDetectedKey: string | undefined;
  private readonly eventsByLocation = new Map<string, SourceEvent>();
  private readonly eventsById = new Map<string, SourceEvent>();
  private readonly unitsByTrigger = new Map<string, ObserverManifest["units"]>();
  private readonly selectorsByTrigger = new Map<string, StaticSelector>();
  private readonly deferred: StaticSelector[] = [];
  private pendingMenu: { selector: StaticSelector; event: SourceEvent } | undefined;

  constructor(readonly manifest: ObserverManifest) {
    for (const event of manifest.events) {
      this.eventsByLocation.set(`${event.source.archive}:${event.source.block}:${event.source.address.toLowerCase()}`, event);
      this.eventsById.set(event.sourceId, event);
    }
    for (const unit of manifest.units)
      this.unitsByTrigger.set(unit.triggerSourceId, [...(this.unitsByTrigger.get(unit.triggerSourceId) ?? []), unit]);
    for (const selector of manifest.staticSelectors ?? []) this.selectorsByTrigger.set(selector.triggerSourceId, selector);
  }

  observe(cpu: Cpu, sliceIndex: number, procedure: number): EclNarrationEvent | undefined {
    if (sliceIndex !== 7) { this.lastDetectedKey = undefined; return undefined; }
    if (procedure === 0x0353) {
      const archiveNumber = cpu.read16(cpu.ss, cpu.sp + 4) & 0xff;
      const block = cpu.read8(cpu.ds, 0x52d4);
      this.archive = `ECL${archiveNumber}.DAX`;
      this.block = block;
      this.lastDetectedKey = undefined;
      this.deferred.length = 0;
      this.pendingMenu = undefined;
      return undefined;
    }
    if (!this.archive || this.block === undefined) return undefined;
    const pc = cpu.read16(cpu.ds, 0x494e);
    const addressNumber = (pc - 1) & 0xffff;
    const address = `0x${addressNumber.toString(16).padStart(4, "0")}`;
    const event = this.eventsByLocation.get(`${this.archive}:${this.block}:${address}`);
    if (!event) { this.lastDetectedKey = undefined; return undefined; }
    const expectedOpcode = opcodeForInstruction[event.source.instruction];
    if (expectedOpcode === undefined) return undefined;
    const bufferOffset = cpu.read16(cpu.ds, 0x493f);
    const bufferSegment = cpu.read16(cpu.ds, 0x4941);
    const opcodeOffset = (bufferOffset + addressNumber + 0x6700) & 0xffff;
    if (cpu.read8(bufferSegment, opcodeOffset) !== expectedOpcode) return undefined;
    const detectedKey = `${event.sourceId}:${pc}`;
    if (detectedKey === this.lastDetectedKey) return undefined;
    this.lastDetectedKey = detectedKey;

    // An opening print whose branch is not yet knowable is deliberately silent.
    // The first mapped covered source resolves and consumes it exactly once.
    for (let index = 0; index < this.deferred.length; index++) {
      const pending = this.deferred[index]!;
      const selected = this.selectBySource(pending, event.sourceId);
      if (selected) {
        this.deferred.splice(index, 1);
        return this.makeEvent(cpu, this.eventsById.get(pending.triggerSourceId)!, selected);
      }
    }

    const staticSelector = this.selectorsByTrigger.get(event.sourceId);
    if (staticSelector) {
      const mode = staticSelector.playback ?? staticSelector.resolution;
      if (mode === "defer-until-covered-source" || mode === "deferred-covered-source") {
        if (!this.deferred.some(item => item.triggerSourceId === staticSelector.triggerSourceId)) this.deferred.push(staticSelector);
        return undefined;
      }
      if (mode === "defer-until-command-render" || mode === "during-trigger" || mode === "during-instruction") {
        this.pendingMenu = { selector: staticSelector, event };
        return undefined;
      }
      const selected = this.selectFromCpu(cpu, staticSelector);
      if (!selected || selected.action === "none") return undefined;
      return this.makeEvent(cpu, event, selected);
    }

    const candidates = this.unitsByTrigger.get(event.sourceId) ?? [];
    const coveredIds = new Set(candidates.flatMap(unit => unit.coveredSourceIds));
    const dynamicAddresses = new Set<string>();
    for (const coveredId of coveredIds) {
      const covered = this.eventsById.get(coveredId);
      for (const part of covered?.outputParts ?? []) if (part.kind === "dynamic-string" && part.address) dynamicAddresses.add(part.address);
    }
    let dynamicValue: string | undefined;
    if (dynamicAddresses.size === 1) dynamicValue = this.readEclString(cpu, [...dynamicAddresses][0]!);
    const literalOperands = event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim());
    const spoken = candidates.length === 1 ? candidates[0]!.spokenText.trim() : "";
    const matchingOperands = literalOperands.filter(part => spoken && part.rawText?.trim() === spoken);
    const operand = matchingOperands.length === 1 ? matchingOperands[0]!.operandIndex : undefined;
    return {
      sourceId: event.sourceId,
      ...(candidates.length === 1 ? { unitId: candidates[0]!.id } : {}),
      ...(dynamicValue !== undefined ? { dynamicValue } : {}),
      archive: this.archive,
      block: this.block,
      address,
      ...(operand !== undefined ? { operand, sourceOperandId: `${event.sourceId}.operand-${operand}` } : {}),
      step: cpu.steps
    };
  }

  /** Called by ENCOUNTER MENU when it emits one of its decoded literal operands. */
  observeMenuOperand(cpu: Cpu, operandIndex: number): EclNarrationEvent | undefined {
    const pending = this.pendingMenu;
    if (!pending) return undefined;
    const selected = this.selectByValue(pending.selector, operandIndex);
    if (!selected) return undefined;
    this.pendingMenu = undefined;
    if (selected.action === "none") return undefined;
    return this.makeEvent(cpu, pending.event, selected, operandIndex);
  }

  /** Resolve an ENCOUNTER MENU from the literal the original game actually drew. */
  observeRenderedText(cpu: Cpu, message: string): EclNarrationEvent | undefined {
    const pending = this.pendingMenu;
    if (!pending) return undefined;
    const normalize = (text: string) => text.replace(/\s+/g, " ").trim().toUpperCase();
    const rendered = normalize(message);
    const part = pending.event.outputParts.find(candidate =>
      candidate.operandIndex !== undefined && normalize(candidate.rawText ?? "") === rendered);
    return part?.operandIndex === undefined ? undefined : this.observeMenuOperand(cpu, part.operandIndex);
  }

  private makeEvent(cpu: Cpu, event: SourceEvent, selected: any, operand?: number): EclNarrationEvent {
    return { sourceId: event.sourceId, unitId: selected.unitId,
      ...(selected.runtimeDynamicValue === undefined ? {} : { dynamicValue: selected.runtimeDynamicValue }),
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
      value = cpu.read8(cpu.ds, this.hex(address));
    else if (descriptor.kind === "ecl-string") {
      value = this.readDsString(cpu, this.hex(address));
      if (descriptor.normalization === "trim-uppercase") value = value.trim().toUpperCase();
    } else if (descriptor.kind === "memoryComparison") {
      const left = cpu.read8(cpu.ds, this.hex(descriptor.leftAddress));
      const right = cpu.read8(cpu.ds, this.hex(descriptor.rightAddress));
      return entries.find((entry: any) => entry.when?.operator === "<=" ? left <= right : entry.when?.operator === ">" ? left > right : false);
    }
    return entries.find((entry: any) => this.conditionMatches(cpu, entry.when ?? entry, value));
  }

  private conditionMatches(cpu: Cpu | undefined, condition: any, value: any): boolean {
    if (condition.all) return condition.all.every((part: any) => this.conditionMatches(cpu, part, value));
    if (condition.bitAnd) {
      if (!cpu) return false;
      const part = condition.bitAnd;
      return this.conditionMatches(cpu, part, cpu.read8(cpu.ds, this.hex(part.address)) & part.mask);
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

  private readDsString(cpu: Cpu, address: number): string {
    const length = Math.min(cpu.read8(cpu.ds, address), 255);
    let text = "";
    for (let index = 0; index < length; index++) text += String.fromCharCode(cpu.read8(cpu.ds, address + 1 + index));
    return text;
  }

  private readEclString(cpu: Cpu, address: string): string {
    const eclAddress = Number.parseInt(address.slice(2), 16);
    const bufferOffset = cpu.read16(cpu.ds, 0x493f);
    const bufferSegment = cpu.read16(cpu.ds, 0x4941);
    const offset = (bufferOffset + eclAddress + 0x6700) & 0xffff;
    const length = Math.min(cpu.read8(bufferSegment, offset), 255);
    let text = "";
    for (let index = 0; index < length; index++) text += String.fromCharCode(cpu.read8(bufferSegment, offset + 1 + index));
    return text;
  }
}
