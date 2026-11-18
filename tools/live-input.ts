import { appendFileSync, readSync, writeFileSync } from "node:fs";
import type { Cpu } from "../src/cpu/machine.js";
import { currentObjective, isOpenObjective, type JournalLead } from "../src/runtime/adventure-log.js";
import type { BiosKey } from "../src/runtime/dos.js";
import { journalFrame, screen } from "../src/runtime/video.js";
import { encodePng } from "./png.js";

const controls: Record<string, number> = {
  enter: 0x1c0d, escape: 0x011b, up: 0x4800, down: 0x5000, left: 0x4b00, right: 0x4d00,
  home: 0x4700, pageup: 0x4900, end: 0x4f00, pagedown: 0x5100,
  space: 0x3920, tab: 0x0f09, backspace: 0x0e08,
};
const scanRows = ["1234567890", "qwertyuiop", "asdfghjkl", "zxcvbnm"];
const firstScans = [2, 16, 30, 44];
const liveIdleBudget = 150_000_000;

export function getKey(command: string): number | undefined {
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
export function liveInput(startAt: number, journal: () => JournalLead[], recording?: string) {
  let nextPrompt = startAt;
  let trackedId: string | undefined;
  let scene: string | undefined;
  const browser = process.env.POR_BROWSER_PLAY === "1";
  const showFrame = (leads?: JournalLead[]) => {
    if (browser) {
      const state = {
        frame: Buffer.from(encodePng(screen)).toString("base64"),
        scene,
        journal: leads && { objective: currentObjective(leads, trackedId), leads },
      };
      console.log(`POR_FRAME ${JSON.stringify(state)}`);
    } else {
      writeFileSync("out/por-live.png", encodePng(leads ? journalFrame(leads, trackedId) : screen));
    }
  };
  const showJournal = (leads: JournalLead[]) => {
    showFrame(leads);
    if (browser) return;
    const objective = currentObjective(leads, trackedId);
    console.log(`Adventure Journal\nCurrent objective: ${objective.title}\n  ${objective.nextStep}`);
    const available = leads.filter(isOpenObjective);
    for (const lead of leads) {
      const index = available.indexOf(lead);
      const number = index < 0 ? "" : `[${index + 1}] `;
      console.log(`${number}${lead.title}\n  ${lead.detail}`);
    }
  };
  let inCampMenu = false;
  const openJournal = () => {
    showJournal(journal());
    while (true) {
      if (!browser) process.stdout.write("Journal [J to close, track N]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (command.toLowerCase() === "j" || command === "escape") return;
      const match = /^track (\d+)$/i.exec(command);
      if (!match) continue;
      const leads = journal();
      const lead = leads.filter(isOpenObjective)[Number(match[1]) - 1];
      if (lead) {
        trackedId = lead.id;
        showJournal(leads);
      } else console.log("Choose a number from the journal's active objectives.");
    }
  };
  const requestKey = (cpu: Cpu, keys: BiosKey[], blocking: boolean): void => {
    if (cpu.steps < startAt || keys.length || (!blocking && cpu.steps < nextPrompt)) return;
    showFrame();
    while (true) {
      if (!browser) process.stdout.write("Game [J journal, :quit, key]> ");
      const command = readCommand();
      if (command === undefined || command === ":quit") throw new Error("Live session closed");
      if (!inCampMenu && command.toLowerCase() === "j") {
        openJournal();
        showFrame();
        continue;
      }
      const key = getKey(command === "" ? "enter" : command.startsWith("key ") ? command.slice(4) : command);
      if (key === undefined) {
        console.log("Enter a letter, digit, arrow name, home, pageup, end, pagedown, enter, space, escape, tab, or backspace.");
        continue;
      }
      if (recording) appendFileSync(recording, `${cpu.steps}:${key.toString(16).padStart(4, "0")}\n`);
      keys.push({ step: cpu.steps, word: key });
      // Animated travel on Rolf's tour can exceed 30 million instructions
      // between keyboard reads. Quick combat has its own shorter watchdog.
      cpu.stepBudget = Math.max(cpu.stepBudget, cpu.steps + liveIdleBudget);
      // Let menu transitions and the scrolling dialogue draw before prompting again.
      nextPrompt = cpu.steps + 1_000_000;
      return;
    }
  };
  return {
    requestKey,
    openJournal,
    setCampMenu: (active: boolean) => { inCampMenu = active; },
    setScene: (id: string | undefined) => { scene = id; },
    tracked: () => trackedId,
    restoreTracked: (id: string | undefined) => { trackedId = id; },
  };
}
