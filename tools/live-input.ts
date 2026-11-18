import { readSync, writeFileSync } from "node:fs";
import type { Cpu } from "../src/cpu/machine.js";
import { currentObjective, isOpenObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { BiosKey } from "../src/runtime/dos.js";
import { journalFrame, screen } from "../src/runtime/video.js";
import { encodePng } from "./png.js";

const controls: Record<string, number> = {
  enter: 0x1c0d, escape: 0x011b, up: 0x4800, down: 0x5000, left: 0x4b00, right: 0x4d00,
  space: 0x3920, tab: 0x0f09, backspace: 0x0e08,
};
const scanRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const firstScans = [2, 16, 30, 44];

function getKey(command: string): number | undefined {
  if (Object.hasOwn(controls, command)) return controls[command];
  if (command.length !== 1) return;
  for (let row = 0; row < scanRows.length; row++) {
    const column = scanRows[row]!.indexOf(command.toLowerCase());
    if (column !== -1) return ((firstScans[row]! + column) << 8) | command.charCodeAt(0);
  }
}

function readCommand(): string | undefined {
  const byte = Buffer.alloc(1);
  let line = "";
  while (readSync(0, byte, 0, 1, null) === 1) {
    if (byte[0] === 10) return line.trim();
    if (byte[0] !== 13) line += String.fromCharCode(byte[0]!);
  }
  return line.length ? line.trim() : undefined;
}

/** Terminal control for the translated runner. Journal input stays on the host. */
export function liveInput(startAt: number, journal: () => JournalLead[]) {
  let nextPrompt = startAt;
  let trackedId: string | undefined;
  const showJournal = (leads: JournalLead[]) => {
    writeFileSync("out/por-live.png", encodePng(journalFrame(leads, trackedId)));
    const objective = currentObjective(leads, trackedId);
    console.log(`Adventure Journal\nCurrent objective: ${objective.title}\n  ${objective.nextStep}`);
    const available = leads.filter(isOpenObjective);
    for (const lead of leads) {
      const index = available.indexOf(lead);
      const number = index < 0 ? "" : `[${index + 1}] `;
      console.log(`${number}${lead.title}\n  ${lead.detail}`);
    }
  };
  return (cpu: Cpu, keys: BiosKey[], blocking: boolean): void => {
    if (cpu.steps < startAt || keys.length || (!blocking && cpu.steps < nextPrompt)) return;
    let journalOpen = false;
    writeFileSync("out/por-live.png", encodePng(screen));
    while (true) {
      process.stdout.write(journalOpen ? "Journal [J to close, track N]> " : "Game [J journal, :quit, key]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command.toLowerCase() === "j") {
        journalOpen = !journalOpen;
        if (journalOpen) showJournal(journal());
        else writeFileSync("out/por-live.png", encodePng(screen));
        continue;
      }
      if (journalOpen) {
        const match = /^track (\d+)$/i.exec(command);
        if (match) {
          const leads = journal();
          const available = leads.filter(isOpenObjective);
          const lead = available[Number(match[1]) - 1];
          if (lead) {
            trackedId = lead.id;
            showJournal(leads);
          } else console.log("Choose a number from the journal's active objectives.");
        }
        continue;
      }
      const key = getKey(command === "" ? "enter" : command.startsWith("key ") ? command.slice(4) : command);
      if (key === undefined) {
        console.log("Enter a letter, digit, arrow name, Enter, Space, Escape, Tab, or Backspace.");
        continue;
      }
      keys.push({ step: cpu.steps, word: key });
      // Let menu transitions and the scrolling dialogue draw before prompting again.
      nextPrompt = cpu.steps + 1_000_000;
      return;
    }
  };
}
