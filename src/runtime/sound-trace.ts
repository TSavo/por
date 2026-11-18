import type { Cpu } from "../cpu/machine.js";
import { originalSoundCallObservers, type OriginalSoundCall } from "./far.js";

export const ORIGINAL_AUDIO_PORTS = new Set([0x40, 0x42, 0x43, 0x61, 0xc0]);

export interface OriginalSoundPortWrite {
  step: number;
  port: number;
  value: number;
}

export interface OriginalSoundTrace {
  schema: 1;
  calls: OriginalSoundCall[];
  writes: OriginalSoundPortWrite[];
}

/**
 * Records the translated game's original sound requests and hardware writes.
 * Steps are the runtime's deterministic execution timestamps. Conversion tools
 * map them to the original timer cadence before producing VGM or PCM assets.
 */
export class OriginalSoundTraceRecorder {
  readonly trace: OriginalSoundTrace = { schema: 1, calls: [], writes: [] };
  private readonly detachPortObserver: () => void;

  constructor(private readonly cpu: Cpu) {
    if (originalSoundCallObservers.has(cpu)) throw new Error("a sound trace recorder is already attached");
    originalSoundCallObservers.set(cpu, (call) => this.trace.calls.push(call));
    this.detachPortObserver = cpu.addPortOutObserver((port, value) => {
      if (ORIGINAL_AUDIO_PORTS.has(port)) this.trace.writes.push({ step: cpu.steps, port, value });
    });
  }

  snapshot(): OriginalSoundTrace {
    return {
      schema: 1,
      calls: this.trace.calls.map((call) => ({ ...call })),
      writes: this.trace.writes.map((write) => ({ ...write })),
    };
  }

  detach(): void {
    originalSoundCallObservers.delete(this.cpu);
    this.detachPortObserver();
  }
}
