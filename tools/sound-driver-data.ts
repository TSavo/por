import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { findGameRoot } from "./gamedata.js";

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const file = new Uint8Array(readFileSync(resolve(root, "START.EXE")));
const header = new DataView(file.buffer, file.byteOffset, file.byteLength);
if (header.getUint16(0, true) !== 0x5a4d) throw new Error("START.EXE is not an MZ executable");
const image = file.subarray(header.getUint16(8, true) * 16);
const view = new DataView(image.buffer, image.byteOffset, image.byteLength);
const word = (offset: number) => view.getUint16(offset, true);
const byte = (offset: number) => view.getUint8(offset);
const residentImageBase = 0x27f0;
const resident = (offset: number) => residentImageBase + offset;

function eventTable(imageOffset: number) {
  return Array.from({ length: 20 }, (_, id) => ({
    id: id + 1,
    channels: Array.from({ length: 4 }, (__, channel) => word(imageOffset + id * 8 + channel * 2)),
  }));
}

const result = {
  schema: "por-original-sound-driver-v1",
  source: "START.EXE resident sound driver",
  timing: {
    pitInputHz: 1_193_182,
    timerDivisor: 0x13b1,
    interruptHz: 1_193_182 / 0x13b1,
    biosChainEveryInterrupts: 13,
  },
  format: {
    sequenceAddressing: "16-bit offsets relative to resident segment 0x027f",
    note: "bytes below 0xfa encode channel/duration; the following byte encodes note/rest and continuation",
    commands: {
      "0xfa": "clear-channel-modulation",
      "0xfb": "return-from-sequence",
      "0xfc": "call-sequence",
      "0xfd": "select-and-clear-channel",
      "0xfe": "counted-loop",
      "0xff": "set-channel-word",
    },
  },
  durationMultipliers: Array.from({ length: 32 }, (_, index) => byte(resident(0xba + index))),
  pcSpeaker: {
    stateBase: 0x00d9,
    frequencyTable: Array.from({ length: 12 }, (_, index) => word(resident(0x259 + index * 2))),
    events: eventTable(resident(0x40b)),
  },
  tandyPsg: {
    stateBase: 0x0273,
    frequencyTable: Array.from({ length: 12 }, (_, index) => word(resident(0x3f3 + index * 2))),
    events: eventTable(resident(0x4ab)),
  },
};

const json = `${JSON.stringify(result, null, 2)}\n`;
const output = process.argv[2];
if (output) writeFileSync(resolve(output), json);
else process.stdout.write(json);
