export type OriginalSoundHardware = "pc-speaker" | "tandy";

export interface OriginalSoundPortWrite {
  tick: number;
  port: number;
  value: number;
}

export interface OriginalSoundRender {
  hardware: OriginalSoundHardware;
  event: number;
  interruptHz: number;
  ticks: number;
  stopped: boolean;
  writes: OriginalSoundPortWrite[];
}

/**
 * Where a build keeps its resident sound driver, as offsets in the driver's segment.
 * The first release reads a note's length from a table and stores two bytes per note.
 * Version 1.3 stores the length as a third byte, and only a note for channel 0 starts a tone.
 */
export interface OriginalDriverLayout {
  version: "1.0" | "1.3";
  /** Image offset of the driver's segment. */
  base: number;
  /** Offset of the routine the game calls to play an event. */
  entry: number;
  /** Events in each table. */
  events: number;
  stateBase: Record<OriginalSoundHardware, number>;
  eventTable: Record<OriginalSoundHardware, number>;
  frequencyTable: Record<OriginalSoundHardware, number>;
  /** The note length table of the first release. */
  durationTable?: number;
}

export const originalDriverLayouts: OriginalDriverLayout[] = [
  { version: "1.0", base: 0x27f0, entry: 0, events: 20, durationTable: 0x00ba,
    stateBase: { "pc-speaker": 0x00d9, tandy: 0x0273 }, eventTable: { "pc-speaker": 0x040b, tandy: 0x04ab },
    frequencyTable: { "pc-speaker": 0x0259, tandy: 0x03f3 } },
  { version: "1.3", base: 0x8ae0, entry: 0xdc, events: 21,
    stateBase: { "pc-speaker": 0x022d, tandy: 0x03c7 }, eventTable: { "pc-speaker": 0x055f, tandy: 0x0607 },
    frequencyTable: { "pc-speaker": 0x03ad, tandy: 0x0547 } },
];

/** The driver layout of a load image: the one whose entry routine is where the layout says. */
export function originalDriverLayout(image: Uint8Array): OriginalDriverLayout {
  // Both entry routines begin `push bp; mov bp, sp; cmp byte ptr [sound mode], 2`.
  const entry = [0x55, 0x89, 0xe5, 0x80, 0x3e];
  const found = originalDriverLayouts.find((layout) =>
    entry.every((value, index) => image[layout.base + layout.entry + index] === value));
  if (!found) throw new Error("START.EXE does not hold a sound driver this port knows");
  return found;
}

const RECORD_SIZE = 0x30;
const PIT_INPUT_HZ = 1_193_182;
const TIMER_DIVISOR = 0x13b1;

const u16 = (value: number) => value & 0xffff;
const s16 = (value: number) => (value << 16) >> 16;

/** Execute the original resident sound bytecode directly from an unrelocated START.EXE load image. */
export function renderOriginalSoundDriver(image: Uint8Array, hardware: OriginalSoundHardware,
  event: number, maxTicks = 60 * 240): OriginalSoundRender {
  const layout = originalDriverLayout(image);
  if (!Number.isInteger(event) || event < 1 || event > layout.events) throw new Error(`Original sound event must be 1..${layout.events}`);
  const memory = new Uint8Array(0x10000);
  memory.set(image.subarray(layout.base, layout.base + memory.length));
  const view = new DataView(memory.buffer);
  const byte = (offset: number) => memory[u16(offset)]!;
  const setByte = (offset: number, value: number) => { memory[u16(offset)] = value & 0xff; };
  const word = (offset: number) => view.getUint16(u16(offset), true);
  const setWord = (offset: number, value: number) => view.setUint16(u16(offset), u16(value), true);
  const stateBase = layout.stateBase[hardware];
  const eventTable = layout.eventTable[hardware];
  const frequencyTable = layout.frequencyTable[hardware];
  const entries = Array.from({ length: 4 }, (_, channel) => word(eventTable + (event - 1) * 8 + channel * 2));
  for (let channel = 0; channel < 4; channel++) {
    const record = stateBase + channel * RECORD_SIZE;
    memory.fill(0, record, record + RECORD_SIZE);
    if (entries[channel]) {
      setWord(record, 1);
      setWord(record + 2, entries[channel]!);
    }
  }

  const writes: OriginalSoundPortWrite[] = [];
  let savedReturn = 0;
  let tick = 0;
  const writePort = (port: number, value: number) => writes.push({ tick, port, value: value & 0xff });

  function clearModulation(record: number) {
    for (let offset = 4; offset <= 0x24; offset += 2) setWord(record + offset, 0);
  }

  function parseSequence(originalRecord: number) {
    let record = originalRecord;
    let cursor = word(record + 2);
    if (!cursor) return;
    for (let guard = 0; guard < 4096; guard++) {
      const opcode = byte(cursor++);
      if (opcode < 0xfa) {
        const channel = opcode >>> 5;
        const target = stateBase + channel * RECORD_SIZE;
        const inlineLength = layout.durationTable === undefined;
        const tempo = byte(record + 0x0e);
        const duration = inlineLength
          ? (tempo > 1 ? tempo * byte(cursor + 1) : byte(cursor + 1))
          : (tempo || 1) * byte(layout.durationTable! + (opcode & 0x1f));
        setWord(record, duration);
        const noteByte = byte(cursor);
        let note = noteByte & 0x7f;
        if (note !== 0x7f && (!inlineLength || channel === 0)) {
          setWord(target, duration);
          setWord(target + 0x14, inlineLength ? duration : duration - word(target + 0x10));
          note = u16(note + word(target + 0x12));
          setWord(target + 0x18, 0);
          setWord(target + 0x1a, 1);
          let octave = 0;
          while (note >= 12) { octave++; note -= 12; }
          const divisor = word(frequencyTable + note * 2) >>> octave;
          setWord(target + 4, divisor);
          setWord(target + 8, divisor);
        }
        cursor += inlineLength ? 2 : 1;
        if ((noteByte & 0x80) === 0) continue;
        setWord(originalRecord + 2, cursor);
        return;
      }

      switch (opcode) {
        case 0xfa:
          clearModulation(record);
          break;
        case 0xfb:
          cursor = savedReturn;
          break;
        case 0xfc: {
          const target = word(cursor);
          savedReturn = u16(cursor + 2);
          cursor = target;
          break;
        }
        case 0xfd:
          record = stateBase + word(cursor);
          cursor = u16(cursor + 2);
          clearModulation(record);
          break;
        case 0xfe: {
          const field = byte(cursor++);
          const target = word(cursor);
          cursor = u16(cursor + 2);
          const count = word(record + field);
          if (count !== 0) {
            const next = u16(count - 1);
            setWord(record + field, next);
            if (next !== 0) cursor = target;
          }
          break;
        }
        case 0xff: {
          const field = byte(cursor++);
          const value = word(cursor);
          cursor = u16(cursor + 2);
          setWord(record + field, value);
          if (field === 0) {
            record = originalRecord;
            if (word(record) === 0) cursor = 0;
            setWord(record + 2, cursor);
            return;
          }
          break;
        }
      }
    }
    throw new Error(`Original sound event ${event} exceeded the sequence instruction guard`);
  }

  function updateRecord(record: number) {
    setWord(record + 0x0a, word(record + 0x0a) + word(record + 0x0c));
    setWord(record + 4, word(record + 4) + word(record + 6));
    let high = 0;
    let phase = u16(word(record + 0x1e) + word(record + 0x20));
    const period = word(record + 0x24);
    if (period && phase >= period) phase = u16(phase - period);
    setWord(record + 0x1e, phase);
    if (phase || word(record + 0x20)) {
      const sample = s16(byte(word(record + 0x1c) + (s16(phase) >> 4)) << 8);
      const product = sample * s16(word(record + 0x22));
      high = (product >> 16) & 0xffff;
    }
    setWord(record + 8, high + word(record + 4));
    if (word(record + 0x14)) {
      setWord(record + 0x14, word(record + 0x14) - 1);
      if (word(record + 0x14) === 0) {
        setWord(record + 0x18, 0x10);
        setWord(record + 0x1a, 1);
      }
    }
    setWord(record, word(record) - 1);
    if (word(record) === 0) parseSequence(record);
    if (word(record + 0x1a)) {
      setWord(record + 0x1a, word(record + 0x1a) - 1);
      if (word(record + 0x1a) === 0) {
        let envelope = word(record + 0x16) + word(record + 0x18);
        while (word(envelope + 2) === 0xffff) {
          const volume = word(envelope);
          setWord(record + 0x0a, volume);
          if (volume === 0) setWord(record + 0x0c, 0);
          envelope += 4;
          setWord(record + 0x18, word(record + 0x18) + 4);
        }
        setWord(record + 0x0c, word(envelope));
        setWord(record + 0x1a, word(envelope + 2));
        setWord(record + 0x18, word(record + 0x18) + 4);
      }
    }
  }

  for (tick = 0; tick < maxTicks; tick++) {
    let any = false;
    for (let channel = 0; channel < 4; channel++) {
      const record = stateBase + channel * RECORD_SIZE;
      if (word(record)) { any = true; updateRecord(record); }
    }
    if (hardware === "pc-speaker") {
      let selected = 0;
      for (let channel = 0; channel < 4; channel++) {
        const record = stateBase + channel * RECORD_SIZE;
        if (word(record) && word(record + 0x0a) && !selected) selected = record;
      }
      if (selected) {
        const divisor = word(selected + 8);
        writePort(0x42, divisor);
        writePort(0x42, divisor >>> 8);
      }
      writePort(0x61, selected ? word(selected + 0x0a) & 3 : 0);
    } else {
      let latch = 0x80;
      for (let channel = 0; channel < 4; channel++, latch += 0x20) {
        const record = stateBase + channel * RECORD_SIZE;
        const divisor = word(record + 8) >>> 6;
        writePort(0xc0, (divisor & 0x0f) ^ latch);
        if (channel !== 3) writePort(0xc0, divisor >>> 4);
        const volume = (0xffff - word(record + 0x0a)) >>> 12;
        writePort(0xc0, (volume & 0x0f) ^ latch ^ 0x10);
      }
    }
    if (!any) return { hardware, event, interruptHz: PIT_INPUT_HZ / TIMER_DIVISOR,
      ticks: tick + 1, stopped: true, writes };
  }
  return { hardware, event, interruptHz: PIT_INPUT_HZ / TIMER_DIVISOR,
    ticks: maxTicks, stopped: false, writes };
}
