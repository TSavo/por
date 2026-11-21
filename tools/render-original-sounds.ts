import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { originalDriverLayout, renderOriginalSoundDriver, type OriginalSoundHardware } from "../src/audio/original-driver.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { encodePcSpeakerWav, encodeTandyVgm } from "../src/audio/original-formats.js";
import { findGameRoot } from "./gamedata.js";

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const { image } = loadExecutable(new Uint8Array(readFileSync(join(root, "START.EXE"))));
const { events } = originalDriverLayout(image);
const output = resolve(process.argv[2] ?? "out/original-sound-traces");
mkdirSync(output, { recursive: true });

const summary: Array<{ hardware: OriginalSoundHardware; event: number; ticks: number;
  durationSeconds: number; stopped: boolean; writes: number }> = [];
for (const hardware of ["pc-speaker", "tandy"] as const) {
  for (let event = 1; event <= events; event++) {
    const render = renderOriginalSoundDriver(image, hardware, event);
    const name = `${hardware}-${String(event).padStart(2, "0")}.json`;
    writeFileSync(join(output, name), `${JSON.stringify(render)}\n`);
    const stem = name.slice(0, -5);
    if (hardware === "pc-speaker") writeFileSync(join(output, `${stem}.wav`), encodePcSpeakerWav(render));
    else writeFileSync(join(output, `${stem}.vgm`), encodeTandyVgm(render));
    summary.push({ hardware, event, ticks: render.ticks,
      durationSeconds: render.ticks / render.interruptHz,
      stopped: render.stopped, writes: render.writes.length });
  }
}
writeFileSync(join(output, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
for (const item of summary) {
  console.log(`${item.hardware.padEnd(10)} ${String(item.event).padStart(2)} ` +
    `${item.durationSeconds.toFixed(3).padStart(8)}s ${String(item.writes).padStart(7)} writes ` +
    `${item.stopped ? "stopped" : "LIMIT"}`);
}
