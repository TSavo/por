/**
 * Every message the game shows through its pause routine, and whether it reaches the page (#81).
 *
 *   npm run qa:pause-callers
 *
 * The pause routine (version 1.3 resident 0x709:0xdbe; bindings `pauseResumes`) waits the game
 * speed times 225 ms through Crt.Delay and asks for no key. Whatever its caller drew just before
 * is on screen only for that long. Two of its callers are the message routines (`messageResumes`,
 * 0xba:0x1693, which prints in green, and `colouredMessageResumes`, 0x709:0xd68), which print
 * the text their own caller hands them and clear it after the pause. So the population is every
 * direct call to the pause routine other than those two, and every direct call to the two message
 * routines: a scan of the translated program (src/translated-1.3) for them.
 *
 * A call is verified when qa/pause-callers.json holds, for both sources (the 1.3 files and
 * `game/`), a replayed pause from it with text on screen, and that text reached the page: every
 * glyph of it is in a frame the runner sent before the game next asked for a key. Red while any
 * call is not verified.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { code, useGameVersion, type Where } from "../src/runtime/bindings.js";
import { readTranslation, type Procedure } from "./dos-calls.js";
import { fromPortRoot } from "./port-root.js";

export type PauseVia = "pause" | "message" | "coloured message";
export interface PauseCaller {
  /** `exe 2d17` (START.EXE image offset) or `slice 19 +1bb8` (GAME.OVR slice and offset). */
  id: string;
  module: string;
  procedure: string;
  /** Address of the call instruction, as the module numbers it. */
  at: number;
  /** The call's length: where the routine returns to is `at + length`. */
  length: number;
  via: PauseVia;
}
export interface PauseEvidence {
  /** The recorded walk the pause was replayed in. */
  walk: string;
  /** The text on screen during the pause (rows, blank ones left out). */
  text: string[];
  /** Whether every glyph of it was in a frame the page received. */
  shown: boolean;
}
export type PauseSource = "original" | "port";
export const evidencePath = fromPortRoot("qa", "pause-callers.json");

export const siteId = (module: string, at: number) =>
  module === "exe" ? `exe ${at.toString(16)}` : `slice ${Number(module.slice(3))} +${at.toString(16)}`;

/** The procedure of a translation's `exe` module that holds `where`, a resident position. */
function residentProcedure(procedures: Procedure[], where: Where): Procedure {
  const holding = procedures.filter((p) => p.module === "exe" && p.steps.has(where.at) && p.entry <= where.at);
  const found = holding.sort((a, b) => b.entry - a.entry)[0];
  if (!found) throw new Error(`No translated procedure holds ${where.at.toString(16)}`);
  return found;
}

export function pauseCallers(): PauseCaller[] {
  useGameVersion("1.3");
  const procedures = readTranslation(fromPortRoot("src", "translated-1.3"));
  const pause = residentProcedure(procedures, code.pauseResumes);
  const message = residentProcedure(procedures, code.messageResumes);
  const coloured = residentProcedure(procedures, code.colouredMessageResumes);
  const routines = new Map<number, PauseVia>([[pause.entry, "pause"], [message.entry, "message"], [coloured.entry, "coloured message"]]);
  const callers: PauseCaller[] = [];
  for (const procedure of procedures) {
    // The message routines' own calls to the pause routine are how their callers' messages pause.
    if (procedure === message || procedure === coloured) continue;
    for (const step of procedure.steps.values()) {
      const via = step.calls?.module === "exe" ? routines.get(step.calls.entry) : undefined;
      if (!via) continue;
      callers.push({
        id: siteId(procedure.module, step.at), module: procedure.module, procedure: procedure.name, at: step.at,
        length: step.calls!.far ? 5 : 3, via,
      });
    }
  }
  return callers;
}

export function readEvidence(): Record<string, Partial<Record<PauseSource, PauseEvidence>>> {
  return existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, "utf8")).calls ?? {} : {};
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const callers = pauseCallers();
  const evidence = readEvidence();
  const verified: string[] = [], hidden: string[] = [], unreached: string[] = [];
  for (const caller of callers) {
    const seen = evidence[caller.id] ?? {};
    const sources = (["original", "port"] as const).map((source) => seen[source]);
    const line = `${caller.id} (${caller.procedure}, through the ${caller.via} routine)`;
    if (sources.some((record) => record && !record.shown)) {
      const record = sources.find((r) => r && !r.shown)!;
      hidden.push(`${line}: ${JSON.stringify(record.text.join(" / "))} never reached the page in ${record.walk}`);
    } else if (sources.every((record) => record?.shown)) verified.push(line);
    else unreached.push(`${line}: ${sources.map((r, i) => r ? "" : ["the 1.3 files", "game/"][i]).filter(Boolean).join(" and ")} not replayed`);
  }
  const by = (via: PauseVia) => callers.filter((caller) => caller.via === via).length;
  console.log(`Pause routine callers verified: ${verified.length} / ${callers.length} ` +
    `(${by("pause")} direct calls to the pause routine, ${by("message")} to the green message routine, ` +
    `${by("coloured message")} to the coloured one).`);
  if (hidden.length) console.log(`Shown in a replay and never on the page: ${hidden.length}`);
  for (const line of hidden) console.log(`  ${line}`);
  if (unreached.length) console.log(`Not yet replayed from both sources: ${unreached.length}`);
  for (const line of unreached) console.log(`  ${line}`);
  if (verified.length < callers.length) process.exitCode = 1;
}
