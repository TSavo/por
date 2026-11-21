import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { originalDriverLayout } from "../src/audio/original-driver.js";
import { loadExecutable } from "../src/lib/exepack.js";
import { findGameRoot } from "./gamedata.js";

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const { image } = loadExecutable(new Uint8Array(readFileSync(resolve(root, "START.EXE"))));
const layout = originalDriverLayout(image);
const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
const word = (offset: number) => view.getUint16(offset, true);
const byte = (offset: number) => view.getUint8(offset);
const residentImageBase = layout.base;
const resident = (offset: number) => residentImageBase + offset;

function eventTable(imageOffset: number) {
  return Array.from({ length: layout.events }, (_, id) => ({
    id: id + 1,
    channels: Array.from({ length: 4 }, (__, channel) => word(imageOffset + id * 8 + channel * 2)),
  }));
}

const result = {
  schema: "por-original-sound-driver-v1",
  source: `START.EXE resident sound driver, version ${layout.version}`,
  timing: {
    pitInputHz: 1_193_182,
    timerDivisor: 0x13b1,
    interruptHz: 1_193_182 / 0x13b1,
    biosChainEveryInterrupts: 13,
  },
  format: {
    sequenceAddressing: `16-bit offsets relative to resident segment 0x${(layout.base >> 4).toString(16).padStart(4, "0")}`,
    note: layout.durationTable === undefined
      ? "bytes below 0xfa encode the channel; the next byte encodes note/rest and continuation, and the third the length"
      : "bytes below 0xfa encode channel/duration; the following byte encodes note/rest and continuation",
    commands: {
      "0xfa": "clear-channel-modulation",
      "0xfb": "return-from-sequence",
      "0xfc": "call-sequence",
      "0xfd": "select-and-clear-channel",
      "0xfe": "counted-loop",
      "0xff": "set-channel-word",
    },
  },
  durationMultipliers: layout.durationTable === undefined ? []
    : Array.from({ length: 32 }, (_, index) => byte(resident(layout.durationTable! + index))),
  pcSpeaker: {
    stateBase: layout.stateBase["pc-speaker"],
    frequencyTable: Array.from({ length: 12 }, (_, index) => word(resident(layout.frequencyTable["pc-speaker"] + index * 2))),
    events: eventTable(resident(layout.eventTable["pc-speaker"])),
  },
  tandyPsg: {
    stateBase: layout.stateBase.tandy,
    frequencyTable: Array.from({ length: 12 }, (_, index) => word(resident(layout.frequencyTable.tandy + index * 2))),
    events: eventTable(resident(layout.eventTable.tandy)),
  },
};

const json = `${JSON.stringify(result, null, 2)}\n`;
const output = process.argv[2];
if (output) writeFileSync(resolve(output), json);
else process.stdout.write(json);
