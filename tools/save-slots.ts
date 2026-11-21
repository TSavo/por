import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { trackedJournalObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { DosFile } from "../src/runtime/dos.js";
import type { AutomapData } from "./automap.js";

interface Slot {
  version: 1;
  name: string;
  data: string;
  leads: JournalLead[];
  tracked?: string;
  party?: Record<string, string>;
  /** The tiles the party had discovered when it saved. */
  automap?: AutomapData;
}

export function saveSlotLetter(name: string): string | undefined {
  return /^(?:SAVE\\)?SAVGAM([A-J])\.DAT$/.exec(name)?.[1];
}

function readRecord(directory: string, name: string): string | undefined {
  try {
    return readFileSync(join(directory, name + ".json"), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

function writeRecord(directory: string, name: string, data: unknown): void {
  mkdirSync(directory, { recursive: true });
  const pending = join(directory, `${name}.${randomUUID()}.tmp`);
  try {
    writeFileSync(pending, JSON.stringify(data), { flag: "wx" });
    renameSync(pending, join(directory, name + ".json"));
  } finally {
    rmSync(pending, { force: true });
  }
}

const rosterName = /^SAVE\\(?:CHARLIST\.TXT|[A-Z0-9_]{1,8}\.(?:CHA|ITM|SPC))$/;
export function isPartyFile(name: string, slot?: string): boolean {
  const letter = /^(?:SAVE\\)?CHRDAT([A-J])[1-8]\.(?:SAV|ITM|SPC)$/.exec(name)?.[1];
  return letter !== undefined && (slot === undefined || letter === slot);
}
const canonicalName = (name: string) => name.replaceAll("/", "\\").toUpperCase();
const savePath = (name: string) => name.startsWith("SAVE\\") ? name : `SAVE\\${name}`;

export function openSaveSlots(directory: string) {
  const slots = new Map<string, Slot>();
  const files: DosFile[] = [];
  for (const letter of "ABCDEFGHIJ") {
    const raw = readRecord(directory, letter);
    if (raw === undefined) continue;
    const slot = JSON.parse(raw) as Slot;
    if (slot.version !== 1 || saveSlotLetter(slot.name) !== letter ||
        typeof slot.data !== "string" || !Array.isArray(slot.leads) ||
        (slot.party !== undefined && (!slot.party || typeof slot.party !== "object" ||
          Object.entries(slot.party).some(([name, bytes]) => !isPartyFile(name, letter) || typeof bytes !== "string")))) {
      throw new Error(`Invalid Pool of Radiance save slot ${letter}`);
    }
    slots.set(letter, slot);
    files.push({ name: savePath(slot.name), data: Buffer.from(slot.data, "base64") });
  }
  const roster = new Map<string, string | null>();
  const savedRoster = readRecord(directory, "roster");
  if (savedRoster !== undefined) {
    const data = JSON.parse(savedRoster);
    if (data.version !== 1 || !data.files || typeof data.files !== "object") throw new Error("Invalid saved character roster");
    for (const [name, bytes] of Object.entries(data.files)) {
      if (!rosterName.test(name) || (bytes !== null && typeof bytes !== "string")) throw new Error("Invalid saved roster file");
      roster.set(name, bytes);
    }
  }
  return {
    files,
    mountRoster(base: DosFile[]): DosFile[] {
      const mounted = new Map(base.map((file) => [canonicalName(file.name), file]));
      for (const [name, data] of roster) {
        if (data === null) mounted.delete(name);
        else mounted.set(name, { name, data: Buffer.from(data, "base64") });
      }
      return [...mounted.values()];
    },
    saveRoster(name: string, bytes?: Uint8Array) {
      if (!rosterName.test(name)) return;
      const data = bytes === undefined ? null : Buffer.from(bytes).toString("base64");
      if (roster.get(name) === data) return;
      const next = new Map(roster).set(name, data);
      writeRecord(directory, "roster", { version: 1, files: Object.fromEntries(next) });
      roster.set(name, data);
    },
    get(name: string) {
      return slots.get(saveSlotLetter(name) ?? "");
    },
    partyFiles(name: string): DosFile[] | undefined {
      const slot = slots.get(saveSlotLetter(name) ?? "");
      if (!slot?.party) return;
      return Object.entries(slot.party).map(([filename, data]) => ({ name: savePath(filename), data: Buffer.from(data, "base64") }));
    },
    save(name: string, data: Uint8Array, leads: JournalLead[], tracked: string | undefined, party: DosFile[],
      automap?: AutomapData) {
      const letter = saveSlotLetter(name);
      if (!letter) throw new Error(`Invalid Pool of Radiance save filename ${name}`);
      const slot: Slot = {
        version: 1, name, data: Buffer.from(data).toString("base64"), leads,
        tracked: trackedJournalObjective(leads, tracked),
        party: Object.fromEntries(party.filter((file) => isPartyFile(file.name, letter))
          .map((file) => [file.name, Buffer.from(file.data).toString("base64")])),
        ...(automap ? { automap } : {}),
      };
      writeRecord(directory, letter, slot);
      slots.set(letter, slot);
    },
  };
}
