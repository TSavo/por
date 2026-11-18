import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";
import { isPartyFile, openSaveSlots, saveSlotLetter } from "./save-slots.js";

const [directory, selection] = process.argv.slice(2);
const letter = selection?.toUpperCase();
if (!directory || !letter || !/^[A-J]$/.test(letter)) {
  throw new Error("Usage: npx tsx tools/export-dos-save.ts <save-directory> <slot A–J>");
}

const saves = openSaveSlots(directory);
const slot = saves.files.find(({ name }) => saveSlotLetter(name) === letter);
if (!slot?.data.length) throw new Error(`Save slot ${letter} has no DOS save data`);
const party = saves.partyFiles(slot.name);
if (!party?.some(({ name, data }) => isPartyFile(name, letter) && name.endsWith(".SAV") && data.length)) {
  throw new Error(`Save slot ${letter} has no DOS character files`);
}

mkdirSync("out", { recursive: true });
const output = mkdtempSync(resolve("out", `dos-slot-${letter}-`));
const save = join(output, "SAVE");
mkdirSync(save);
for (const { name, data } of [slot, ...party]) {
  writeFileSync(join(save, basename(name.replaceAll("\\", "/"))), data, { flag: "wx" });
}
console.log(`Exported slot ${letter} and ${party.length} companion files to ${save}`);
