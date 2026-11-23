import { trackedJournalObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { DosFile } from "../src/runtime/dos.js";
import { readTextNow, type ResidentResources } from "../src/resources/provider.js";
import type { AutomapData } from "./automap.js";
import { NodeDiskResources } from "./resources/node-disk.js";

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

/** A slot's record, `save:A`..`save:J` or `save:roster`: today's `<name>.json` files on disk. */
function readRecord(store: ResidentResources, name: string): string | undefined {
  return readTextNow(store, `save:${name}`);
}

function writeRecord(store: ResidentResources, name: string, data: unknown): void {
  store.putNow(`save:${name}`, JSON.stringify(data));
}

const rosterName = /^SAVE\\(?:CHARLIST\.TXT|[A-Z0-9_]{1,8}\.(?:CHA|ITM|SPC))$/;
export function isPartyFile(name: string, slot?: string): boolean {
  const letter = /^(?:SAVE\\)?CHRDAT([A-J])[1-8]\.(?:SAV|ITM|SPC)$/.exec(name)?.[1];
  return letter !== undefined && (slot === undefined || letter === slot);
}
const canonicalName = (name: string) => name.replaceAll("/", "\\").toUpperCase();
const savePath = (name: string) => name.startsWith("SAVE\\") ? name : `SAVE\\${name}`;

/** The save slots and roster, from a directory of them or from the resource layer's `save:` ids (#224). */
export function openSaveSlots(directory: string | ResidentResources) {
  const store = typeof directory === "string" ? new NodeDiskResources({ saves: directory }) : directory;
  const slots = new Map<string, Slot>();
  const files: DosFile[] = [];
  for (const letter of "ABCDEFGHIJ") {
    const raw = readRecord(store, letter);
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
  const savedRoster = readRecord(store, "roster");
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
      writeRecord(store, "roster", { version: 1, files: Object.fromEntries(next) });
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
      writeRecord(store, letter, slot);
      slots.set(letter, slot);
    },
  };
}
