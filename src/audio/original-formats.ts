import type { OriginalSoundRender } from "./original-driver.js";

const SAMPLE_RATE = 44_100;
const PIT_INPUT_HZ = 1_193_182;

function setAscii(bytes: Uint8Array, offset: number, text: string) {
  for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
}

/** Encode a Tandy SN76489 port-write render as a VGM 1.50 command stream. */
export function encodeTandyVgm(render: OriginalSoundRender): Uint8Array {
  if (render.hardware !== "tandy") throw new Error("Tandy VGM requires a Tandy render");
  const commands: number[] = [];
  let cursorTick = 0;
  let emittedSamples = 0;
  const waitThrough = (targetTick: number) => {
    const targetSamples = Math.round(targetTick * SAMPLE_RATE / render.interruptHz);
    let wait = targetSamples - emittedSamples;
    while (wait > 0) {
      const chunk = Math.min(wait, 0xffff);
      commands.push(0x61, chunk & 0xff, chunk >>> 8);
      wait -= chunk;
    }
    emittedSamples = targetSamples;
  };
  for (const write of render.writes) {
    if (write.tick !== cursorTick) {
      waitThrough(write.tick);
      cursorTick = write.tick;
    }
    if (write.port === 0xc0) commands.push(0x50, write.value);
  }
  waitThrough(render.ticks);
  commands.push(0x66);
  const bytes = new Uint8Array(0x100 + commands.length);
  const view = new DataView(bytes.buffer);
  setAscii(bytes, 0, "Vgm ");
  view.setUint32(0x04, bytes.length - 4, true);
  view.setUint32(0x08, 0x00000150, true);
  view.setUint32(0x0c, 3_579_545, true);
  view.setUint32(0x18, emittedSamples, true);
  view.setUint32(0x24, 60, true);
  view.setUint32(0x34, 0xcc, true);
  bytes.set(commands, 0x100);
  return bytes;
}

/** Render the original PC PIT divisor and gate stream to signed 16-bit mono WAV. */
export function encodePcSpeakerWav(render: OriginalSoundRender): Uint8Array {
  if (render.hardware !== "pc-speaker") throw new Error("PC WAV requires a PC-speaker render");
  const sampleCount = Math.max(1, Math.round(render.ticks * SAMPLE_RATE / render.interruptHz));
  const pcmBytes = sampleCount * 2;
  const bytes = new Uint8Array(44 + pcmBytes);
  const view = new DataView(bytes.buffer);
  setAscii(bytes, 0, "RIFF");
  view.setUint32(4, bytes.length - 8, true);
  setAscii(bytes, 8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, SAMPLE_RATE * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  setAscii(bytes, 36, "data");
  view.setUint32(40, pcmBytes, true);
  let writeIndex = 0;
  let divisorLow = 0;
  let divisor = 0;
  let expectingHigh = false;
  let gate = false;
  let phase = 0;
  for (let sample = 0; sample < sampleCount; sample++) {
    const tick = Math.floor(sample * render.interruptHz / SAMPLE_RATE);
    while (writeIndex < render.writes.length && render.writes[writeIndex]!.tick <= tick) {
      const write = render.writes[writeIndex++]!;
      if (write.port === 0x42) {
        if (!expectingHigh) { divisorLow = write.value; expectingHigh = true; }
        else { divisor = divisorLow | (write.value << 8); expectingHigh = false; }
      } else if (write.port === 0x61) gate = (write.value & 3) === 3;
    }
    let value = 0;
    if (gate && divisor) {
      phase += PIT_INPUT_HZ / divisor / SAMPLE_RATE;
      phase -= Math.floor(phase);
      value = phase < 0.5 ? 8_192 : -8_192;
    }
    view.setInt16(44 + sample * 2, value, true);
  }
  return bytes;
}
