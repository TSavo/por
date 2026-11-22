/**
 * Every message the game shows through its pause routine, and whether it reaches the page (#81).
 *
 *   npm run qa:pause-callers
 *
 * The pause routine (version 1.3 resident 0x709:0xdbe; bindings `pauseResumes`) waits the game
 * speed times 225 ms through Crt.Delay and asks for no key. Whatever its caller drew just before
 * is on screen only for that long. Three of its callers are message routines, which print the text
 * their own caller hands them and clear it after the pause: `messageResumes` (0xba:0x1693, the
 * bottom line in green), `colouredMessageResumes` (0x709:0xd68) and `panelMessageResumes`
 * (0xba:0x16ec, the combat panel, which pauses only when its last argument is not 0). So the
 * population is every direct call to the pause routine other than those three's own, and every
 * direct call to the three that can pause (a panel call whose last argument is a constant 0 cannot):
 * a scan of the translated program (src/translated-1.3) for them.
 *
 * A call is verified when qa/pause-callers.json holds, for both sources (the 1.3 files and
 * `game/`), a replayed pause from it that put text on screen the page was not already showing, and
 * that text reached the page: every glyph of it is in a frame the runner sent before the game next
 * asked for a key (tools/acceptance/harness.mjs, `pauseMessage` and `pauseShown`). The evidence is
 * written by tools/record-pause-callers.mjs. Red while any call is not verified.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { code, useGameVersion, type Where } from "../src/runtime/bindings.js";
import { readTranslation, type Procedure, type Step } from "./dos-calls.js";
import { fromPortRoot } from "./port-root.js";

export type PauseVia = "pause" | "message" | "coloured message" | "panel message";
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
  /** When not: the glyphs the frame that showed most of it lacked, and what that frame had there. */
  missing?: string[];
  pageHad?: string[];
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

/**
 * The byte a call passes last (its argument at [bp + 6]) when the instructions just before it
 * make it a constant: `mov al, 1; push ax`. Undefined when they do not.
 */
function lastByteArgument(procedure: Procedure, call: Step): number | undefined {
  const before = (at: number) => {
    const from = [...procedure.before.get(at) ?? []];
    return from.length === 1 ? procedure.steps.get(from[0]!) : undefined;
  };
  let step = before(call.at);
  // A near call to a far procedure pushes CS first.
  if (!call.calls?.far && step?.text === "push cs") step = before(step.at);
  if (!step || step.mnemonic !== "push") return undefined;
  const pushed = step.operands[0]!;
  if (/^(0x[0-9a-f]+|\d+)$/.test(pushed)) return Number(pushed) & 0xff;
  if (pushed !== "ax") return undefined;
  for (step = before(step.at); step; step = before(step.at)) {
    const [first, second] = step.operands;
    if (step.mnemonic === "mov" && (first === "al" || first === "ax") && /^(0x[0-9a-f]+|\d+)$/.test(second ?? "")) return Number(second) & 0xff;
    if (step.mnemonic === "xor" && (first === "al" || first === "ax") && first === second) return 0;
    if (first === "al" || first === "ax" || /^l?call$/.test(step.mnemonic) || /^(lods|cbw|cwde|mul|div|imul|idiv|in|xchg|pop)/.test(step.mnemonic)) return undefined;
  }
  return undefined;
}

export function pauseCallers(): PauseCaller[] {
  useGameVersion("1.3");
  const procedures = readTranslation(fromPortRoot("src", "translated-1.3"));
  const pause = residentProcedure(procedures, code.pauseResumes);
  const message = residentProcedure(procedures, code.messageResumes);
  const coloured = residentProcedure(procedures, code.colouredMessageResumes);
  const panel = residentProcedure(procedures, code.panelMessageResumes!);
  const routines = new Map<number, PauseVia>([[pause.entry, "pause"], [message.entry, "message"],
    [coloured.entry, "coloured message"], [panel.entry, "panel message"]]);
  const callers: PauseCaller[] = [];
  for (const procedure of procedures) {
    // The message routines' own calls to the pause routine are how their callers' messages pause.
    if (procedure === message || procedure === coloured || procedure === panel) continue;
    for (const step of procedure.steps.values()) {
      const via = step.calls?.module === "exe" ? routines.get(step.calls.entry) : undefined;
      if (!via) continue;
      // The panel routine pauses only when its last argument is not 0.
      if (via === "panel message" && lastByteArgument(procedure, step) === 0) continue;
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
      hidden.push(`${line}: ${JSON.stringify(record.text.join(" / "))} in ${record.walk}; the page lacked ` +
        JSON.stringify((record.missing ?? []).map((row) => row.trim()).join(" / ")) +
        (record.pageHad ? `, showing ${JSON.stringify(record.pageHad.map((row) => row.trim()).join(" / "))} there` : ""));
    } else if (sources.every((record) => record?.shown)) {
      const text = sources[0]!.text.map((row) => row.trim()).join(" ");
      verified.push(`${line}: ${JSON.stringify(text.length > 70 ? `${text.slice(0, 70)}...` : text)} (${sources[0]!.walk})`);
    }
    else unreached.push(`${line}: ${sources.map((r, i) => r ? "" : ["the 1.3 files", "game/"][i]).filter(Boolean).join(" and ")} not replayed`);
  }
  const by = (via: PauseVia) => callers.filter((caller) => caller.via === via).length;
  console.log(`Pause routine callers verified: ${verified.length} / ${callers.length} ` +
    `(${by("pause")} direct calls to the pause routine, ${by("message")} to the green message routine, ` +
    `${by("coloured message")} to the coloured one, ${by("panel message")} to the combat panel's that can pause).`);
  for (const line of verified) console.log(`  ${line}`);
  if (hidden.length) console.log(`Shown in a replay and never on the page: ${hidden.length}`);
  for (const line of hidden) console.log(`  ${line}`);
  if (unreached.length) console.log(`Not yet replayed from both sources: ${unreached.length}`);
  for (const line of unreached) console.log(`  ${line}`);
  if (verified.length < callers.length) process.exitCode = 1;
}
