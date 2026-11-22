import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { Cpu } from "../src/cpu/machine.ts";
import { code, codeSegment, data, segment, useGameVersion } from "../src/runtime/bindings.ts";
import { attachPlanarVideo, biosVideo, screen, stampPanelFrame } from "../src/runtime/video.ts";
import { liveInput } from "./live-input.ts";

const reportCell = 11 * 40 + 23;
const bottomCell = 24 * 40;
const reports = ["KOBOLD ATTACKS", "KOBOLD MISSES"];
const source = process.argv[2];

if (source) {
  useGameVersion("1.3");
  const bundled = source === "port";
  const cpu = new Cpu();
  cpu.ss = 0x1000;
  cpu.bp = 0x100;
  cpu.ax = 0x000d;
  attachPlanarVideo(cpu);
  biosVideo(cpu);
  cpu.write8(segment.data, data.gameState, 5);
  if (bundled) {
    stampPanelFrame(22, 0, "stud");
    stampPanelFrame(22, 22, "stud");
    stampPanelFrame(0, 22, "stud");
    stampPanelFrame(22, 11, "rail-y");
  } else {
    screen.set(176, 0, 14);
    screen.set(176, 176, 14);
    screen.set(0, 176, 14);
    screen.set(177, 88, 12);
    screen.set(178, 88, 4);
  }
  cpu.write8(cpu.ss, cpu.bp - 0xf, 7);
  cpu.write8(cpu.ss, cpu.bp - 0xc, 3);
  cpu.write8(cpu.ss, cpu.bp + 6, 1);
  cpu.write8(cpu.ss, cpu.bp + 0xc, 15);
  const draw = (cell, text) => {
    cpu.cs = codeSegment(code.glyphStoreA);
    cpu.ip = code.glyphStoreA.at;
    for (const char of text) {
      cpu.write8(cpu.ss, cpu.bp + 8, char.charCodeAt(0));
      cpu.write8(0xa000, Math.floor(cell / 40) * 320 + cell++ % 40, 0xff);
    }
  };
  const input = liveInput(0, () => [], undefined, undefined, bundled);
  draw(bottomCell, "GUARDING");
  // Fill the cosmetic queue to its limit with timed messages. These must stay
  // ahead of subsequent action reports in the emitted browser frame.
  for (let i = 0; i < 12; i++) input.capturePresentationDelay(cpu, false, 100);
  draw(bottomCell, " ".repeat(8));
  for (const report of reports) {
    draw(reportCell, report.padEnd(16));
    input.capturePresentationDelay(cpu);
    input.capturePresentationDelay(cpu); // A pause can be observed more than once.
  }
  draw(reportCell, " ".repeat(16));
  input.requestKey(cpu, [], true);
} else {
  for (const dataSource of ["original", "port"]) {
    const run = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), dataSource], {
      env: { ...process.env, POR_BROWSER_PLAY: "1" }, input: "enter\n", encoding: "utf8",
    });
    assert.ifError(run.error);
    assert.equal(run.status, 0, run.stderr);
    const record = run.stdout.split(/\r?\n/).find((line) => line.startsWith("POR_FRAME "));
    assert.ok(record, `No browser frame for ${dataSource}`);
    const frame = JSON.parse(record.slice("POR_FRAME ".length));
    const textAt = (text, cell) => text.filter(([at]) => at >= cell && at < cell + 16)
      .map(([, char]) => String.fromCharCode(char)).join("");
    const status = frame.animation.filter(({ statusMessage }) => statusMessage);
    assert.equal(status.length, 12, dataSource);
    assert.ok(status.every(({ text, durationMs }) => textAt(text, bottomCell) === "GUARDING" && durationMs === 100), dataSource);
    assert.deepEqual(frame.animation.slice(status.length).map(({ text, durationMs }) =>
      [textAt(text, reportCell), durationMs]), [["KOBOLDATTACKS", 1000], ["KOBOLDMISSES", 1000]], dataSource);
    assert.equal(textAt(frame.text, reportCell), "", dataSource);
  }
  console.log("Timed combat reports survive a full presentation queue in both data modes.");
}
