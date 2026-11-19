import type { Cpu } from "../cpu/machine.js";
import type { NarrationTrigger, RuntimeNarrationManifest } from "./narration.js";

interface SourcePart { operandIndex: number; kind: string; rawText?: string; address?: string }
interface SourceEvent {
  sourceId: string;
  source: { archive: string; block: number; address: string; instruction: string };
  outputParts: SourcePart[];
}
export interface ObserverManifest extends RuntimeNarrationManifest { events: SourceEvent[] }
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

  constructor(readonly manifest: ObserverManifest) {
    for (const event of manifest.events) {
      this.eventsByLocation.set(`${event.source.archive}:${event.source.block}:${event.source.address.toLowerCase()}`, event);
      this.eventsById.set(event.sourceId, event);
    }
    for (const unit of manifest.units)
      this.unitsByTrigger.set(unit.triggerSourceId, [...(this.unitsByTrigger.get(unit.triggerSourceId) ?? []), unit]);
  }

  observe(cpu: Cpu, sliceIndex: number, procedure: number): EclNarrationEvent | undefined {
    if (sliceIndex !== 7) { this.lastDetectedKey = undefined; return undefined; }
    if (procedure === 0x0353) {
      const archiveNumber = cpu.read16(cpu.ss, cpu.sp + 4) & 0xff;
      const block = cpu.read8(cpu.ds, 0x52d4);
      this.archive = `ECL${archiveNumber}.DAX`;
      this.block = block;
      this.lastDetectedKey = undefined;
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
