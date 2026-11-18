import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strict as assert } from "node:assert";
import { renderOriginalSoundDriver } from "../src/audio/original-driver.js";
import { encodePcSpeakerWav, encodeTandyVgm } from "../src/audio/original-formats.js";
import { findGameRoot } from "./gamedata.js";

const root = findGameRoot();
assert(root, "Pool of Radiance game data not found");
const executable = new Uint8Array(readFileSync(join(root, "START.EXE")));
const header = new DataView(executable.buffer, executable.byteOffset, executable.byteLength);
const image = executable.subarray(header.getUint16(8, true) * 16);

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
console.log("verified all 20 original events through PC-speaker and Tandy driver rendering");
