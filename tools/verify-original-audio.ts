import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { strict as assert } from "node:assert";
import { renderOriginalSoundDriver } from "../src/audio/original-driver.js";
import { encodePcSpeakerWav, encodeTandyVgm } from "../src/audio/original-formats.js";
import { findGameRoot } from "./gamedata.js";

const manifest = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as {
  events: Array<{ index: number; kind: string; reachable?: boolean;
    reachableHardware?: Array<"pc-speaker" | "tandy">; enhancedFile?: string }>;
};

const root = findGameRoot();
assert(root, "Pool of Radiance game data not found");
const executable = new Uint8Array(readFileSync(join(root, "START.EXE")));
const header = new DataView(executable.buffer, executable.byteOffset, executable.byteLength);
const image = executable.subarray(header.getUint16(8, true) * 16);
const driverMemory = image.subarray(0x27f0);
const driverView = new DataView(driverMemory.buffer, driverMemory.byteOffset, driverMemory.byteLength);

// A browser asset may replace the current asset exactly when every reachable
// event replaces all four original driver channel records on that hardware path.
for (const event of manifest.events.filter(({ reachable }) => reachable !== false)) {
  const hardwareModes = event.reachableHardware ?? ["pc-speaker", "tandy"] as const;
  for (const hardware of hardwareModes) {
    const table = hardware === "pc-speaker" ? 0x040b : 0x04ab;
    const entries = Array.from({ length: 4 }, (_, channel) =>
      driverView.getUint16(table + (event.index - 1) * 8 + channel * 2, true));
    assert(entries.every(Boolean), `${hardware} event ${event.index} does not replace every channel`);
  }
}

const pc = renderOriginalSoundDriver(image, "pc-speaker", 2);
assert.equal(pc.stopped, true);
assert.equal(pc.ticks, 242);
assert(pc.writes.some(({ port }) => port === 0x42));
assert(pc.writes.some(({ port, value }) => port === 0x61 && (value & 3) === 3));
const wav = encodePcSpeakerWav(pc);
assert.equal(new TextDecoder().decode(wav.subarray(0, 4)), "RIFF");
assert.equal(new DataView(wav.buffer).getUint32(24, true), 44_100);
assert(wav.subarray(44).some((value) => value !== 0));

const tandy = renderOriginalSoundDriver(image, "tandy", 2);
assert.equal(tandy.stopped, true);
assert.equal(tandy.ticks, 194);
assert.equal(tandy.writes.length, 2_134);
assert(tandy.writes.every(({ port }) => port === 0xc0));
assert.equal(tandy.writes.filter(({ tick }) => tick === tandy.ticks - 1).length, 11);
const vgm = encodeTandyVgm(tandy);
assert.equal(new TextDecoder().decode(vgm.subarray(0, 4)), "Vgm ");
assert.equal(new DataView(vgm.buffer).getUint32(0x0c, true), 3_579_545);
assert.equal(vgm[0x100], 0x50);
assert.equal(vgm.at(-1), 0x66);

for (const hardware of ["pc-speaker", "tandy"] as const) {
  for (let event = 1; event <= 20; event++) {
    const render = renderOriginalSoundDriver(image, hardware, event);
    assert(render.writes.length > 0, `${hardware} event ${event} produced no hardware writes`);
    assert(render.stopped || [13, 14, 15].includes(event),
      `${hardware} event ${event} unexpectedly exceeded the one-minute render limit`);
  }
}
const enhancedDirectory = resolve(process.env.POR_ENHANCED_AUDIO_DIR ?? "../por-assets/enhanced");
const reachableEffects = manifest.events.filter(({ kind, reachable }) => kind === "effect" && reachable !== false);
for (const event of reachableEffects) {
  assert(event.enhancedFile, `reachable effect ${event.index} has no Enhanced replacement`);
  const wave = readFileSync(resolve(enhancedDirectory, event.enhancedFile));
  const waveView = new DataView(wave.buffer, wave.byteOffset, wave.byteLength);
  assert.equal(wave.subarray(0, 4).toString("ascii"), "RIFF");
  assert.equal(wave.subarray(8, 12).toString("ascii"), "WAVE");
  assert.equal(waveView.getUint16(20, true), 1, `${event.enhancedFile} must be PCM`);
  assert.equal(waveView.getUint16(22, true), 1, `${event.enhancedFile} must be mono`);
  assert.equal(waveView.getUint32(24, true), 48_000, `${event.enhancedFile} must be 48 kHz`);
  assert.equal(waveView.getUint16(34, true), 16, `${event.enhancedFile} must be 16-bit`);
  let peak = 0;
  for (let offset = 44; offset + 1 < wave.length; offset += 2)
    peak = Math.max(peak, Math.abs(waveView.getInt16(offset, true)));
  assert(peak > 1_000, `${event.enhancedFile} is silent`);
  assert(peak <= Math.ceil(32_767 * .83), `${event.enhancedFile} exceeds prototype peak target`);
}
console.log(`verified all 20 original hardware renders and ${reachableEffects.length} Enhanced effect replacements`);
