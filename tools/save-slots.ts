import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { JournalLead } from "../src/runtime/adventure-log.js";
import type { DosFile } from "../src/runtime/dos.js";

interface Slot {
  version: 1;
  name: string;
  data: string;
  leads: JournalLead[];
  tracked?: string;
}

export function saveSlotLetter(name: string): string | undefined {
  return /^(?:SAVE\\)?SAVGAM([A-J])\.DAT$/.exec(name)?.[1];
}

export function openSaveSlots(directory: string) {
  const slots = new Map<string, Slot>();
  const files: DosFile[] = [];
  for (const letter of "ABCDEFGHIJ") {
    let raw: string;
    try {
      raw = readFileSync(join(directory, letter + ".json"), "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
      throw error;
    }
    const slot = JSON.parse(raw) as Slot;
    if (slot.version !== 1 || saveSlotLetter(slot.name) !== letter ||
        typeof slot.data !== "string" || !Array.isArray(slot.leads)) {
      throw new Error(`Invalid Pool of Radiance save slot ${letter}`);
    }
    slots.set(letter, slot);
    files.push({ name: slot.name, data: Buffer.from(slot.data, "base64") });
  }
  return {
    files,
    get(name: string) {
      const slot = slots.get(saveSlotLetter(name) ?? "");
      return slot?.name === name ? slot : undefined;
    },
    save(name: string, data: Uint8Array, leads: JournalLead[], tracked: string | undefined) {
      const letter = saveSlotLetter(name);
      if (!letter) throw new Error(`Invalid Pool of Radiance save filename ${name}`);
      const slot: Slot = { version: 1, name, data: Buffer.from(data).toString("base64"), leads, tracked };
      mkdirSync(directory, { recursive: true });
      const pending = join(directory, `${letter}.${randomUUID()}.tmp`);
      try {
        writeFileSync(pending, JSON.stringify(slot), { flag: "wx" });
        renameSync(pending, join(directory, letter + ".json"));
      } finally {
        rmSync(pending, { force: true });
      }
      slots.set(letter, slot);
    },
  };
}
