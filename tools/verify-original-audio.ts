import { readFileSync } from "node:fs";
import { join } from "node:path";
import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { originalDriverLayout, renderOriginalSoundDriver } from "../src/audio/original-driver.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { encodePcSpeakerWav, encodeTandyVgm } from "../src/audio/original-formats.js";
import { findGameRoot } from "./gamedata.js";

const manifest = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as {
  events: Array<{ index: number; reachable?: boolean; reachableHardware?: Array<"pc-speaker" | "tandy"> }>;
};

const root = findGameRoot();
assert(root, "Pool of Radiance game data not found");
const { image } = loadExecutable(new Uint8Array(readFileSync(join(root, "START.EXE"))));
const layout = originalDriverLayout(image);
const driverMemory = image.subarray(layout.base);
const driverView = new DataView(driverMemory.buffer, driverMemory.byteOffset, driverMemory.byteLength);
// Version 1.3 never asks for an event above 12: its game code and its scripts request 2 to 12,
// and the calls that start the Tandy title theme and battle music are gone.
const called = (index: number) => layout.version === "1.0" || index <= 12;

// A browser asset may replace the current asset exactly when every reachable
// event replaces all four original driver channel records on that hardware path.
for (const event of manifest.events.filter(({ reachable, index }) => reachable !== false && called(index))) {
  const hardwareModes = event.reachableHardware ?? ["pc-speaker", "tandy"] as const;
  for (const hardware of hardwareModes) {
    const table = layout.eventTable[hardware];
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
  for (let event = 1; event <= layout.events; event++) {
    const render = renderOriginalSoundDriver(image, hardware, event);
    assert(render.writes.length > 0, `${hardware} event ${event} produced no hardware writes`);
    assert(render.stopped || (layout.version === "1.0" && [13, 14, 15].includes(event)),
      `${hardware} event ${event} unexpectedly exceeded the one-minute render limit`);
  }
}
console.log(`verified all ${layout.events} original events of version ${layout.version} through PC-speaker and Tandy driver rendering`);

// The Classic sound files were rendered from a driver trace that sits beside each of them.
// Every event this build can play must render to exactly that trace, or the files are for another build.
const assets = process.env.POR_AUDIO_DIR;
if (assets && existsSync(join(assets, "pc-speaker-02.json"))) {
  let compared = 0;
  for (const hardware of ["pc-speaker", "tandy"] as const) {
    for (const { index } of manifest.events.filter(({ index }) => index >= 2 && called(index))) {
      const recorded = JSON.parse(readFileSync(join(assets, `${hardware}-${String(index).padStart(2, "0")}.json`), "utf8")) as
        { ticks: number; writes: unknown[] };
      const render = renderOriginalSoundDriver(image, hardware, index);
      assert.equal(render.ticks, recorded.ticks, `${hardware} event ${index} runs for a different time than its sound file`);
      assert.deepEqual(render.writes, recorded.writes, `${hardware} event ${index} differs from the trace its sound file was rendered from`);
      compared++;
    }
  }
  console.log(`verified the ${compared} Classic sound files version ${layout.version} can play were rendered from this build's driver output`);
} else {
  console.log("skipped the Classic sound file comparison: POR_AUDIO_DIR does not hold the rendered traces");
}
