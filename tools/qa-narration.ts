import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { disassemble, readEntryVector, scriptFromBlock, type Instruction } from "../src/lib/ecl.js";
import { runningScriptAddress } from "../src/runtime/bindings.js";
import { EclNarrationObserver, type ObserverManifest } from "../src/runtime/ecl-narration-observer.js";
import type { LedgerFrame, LedgerNarration } from "./narration-ledger.js";

// The narration, measured.
//
//   npm run qa:narration                           the table; exit 1 while anything is left
//   npm run qa:narration -- --list                 what is still unheard, by script, and every listed case
//   npm run qa:narration -- --merge <ledgers...>   fold narration ledgers into qa/narration-coverage.json
//
// The requirement: every narrated passage is narrated audibly at its moment in play, the dynamic
// ones above all, with its picture showing. The other narration checks prove that the recordings
// exist and say the right words. This one counts what play has actually reached: a unit counts
// when a run of the game chose it at its passage, a variant when its condition matched the game's
// state, a selector when it resolved. qa/narration-coverage.json holds what has been heard and
// the run it was heard in. A ledger comes from a run with POR_NARRATION_LEDGER set
// (tools/narration-ledger.ts). docs/NARRATION-QA.md explains every row.

interface Variant { id: string; condition: string; dynamicValue: string; text: string; asset: string }
interface Unit {
  id: string; archive: string; triggerSourceId: string; coveredSourceIds: string[]; spokenText: string;
  asset: string | null; runtimeVariants?: Variant[];
}
interface Manifest extends Omit<ObserverManifest, "units" | "events"> {
  events: (ObserverManifest["events"][number] & { normalizedText: string })[];
  units: Unit[];
  dynamicResolution: { slotSemantics: Record<string, { meaning: string; resolution: string; values?: string[] }> };
}
const root = new URL("../", import.meta.url);
const manifest = JSON.parse(readFileSync(new URL("src/audio/voice-master-manifest.json", root), "utf8")) as Manifest;
const units = manifest.units;
const unitById = new Map(units.map(unit => [unit.id, unit]));
const eventById = new Map(manifest.events.map(event => [event.sourceId, event]));
const variantOwner = new Map(units.flatMap(unit => (unit.runtimeVariants ?? []).map(variant => [variant.id, unit] as const)));
const variantTotal = variantOwner.size;
const selectors = manifest.staticSelectors ?? [];

type Art = { kind: "portrait" | "encounter" | "scene"; key: string };
interface Coverage {
  schema: 1;
  about: string;
  /** Every merged run: the ledger it came from and what it held. */
  runs: Record<string, { ledger: string; games: number; decisions: number; heard: number }>;
  /** Units heard at their passage. A unit not listed has not been heard. */
  units: Record<string, { run: string; step: number; art?: Art;
    /** A hearing with no Enhanced artwork on screen before the game next waited for a key. */
    withoutArt?: { run: string; step: number; showing: string } }>;
  /** Variants whose condition matched in play, with the slot read and the value it held. */
  variants: Record<string, { run: string; step: number; slot?: string; value?: string | number }>;
  /** Selectors that resolved in play, by trigger. `unitId` is null where the manifest marks the case silent. */
  selectors: Record<string, { run: string; step: number; unitId: string | null; value?: string | number }>;
  /** Moments where narration belonged and none was chosen. Must be empty. */
  silent: Record<string, { kind: string; sourceId: string; archive: string; block: number; slot?: string;
    value?: string | number; status?: string; selector?: string; runs: Record<string, { count: number; step: number }> }>;
}
const coveragePath = new URL("qa/narration-coverage.json", root);
const coverage: Coverage = existsSync(coveragePath) ? JSON.parse(readFileSync(coveragePath, "utf8")) as Coverage : {
  schema: 1,
  about: "What play has heard of the narration. Written by `npm run qa:narration -- --merge <ledgers>`; see docs/NARRATION-QA.md.",
  runs: {}, units: {}, variants: {}, selectors: {}, silent: {},
};

// ---- merge ----------------------------------------------------------------------------------------------------------
const mergeAt = process.argv.indexOf("--merge");
if (mergeAt >= 0) {
  const ledgers = process.argv.slice(mergeAt + 1).filter(argument => !argument.startsWith("--"));
  if (!ledgers.length) throw new Error("--merge needs one or more ledger files");
  for (const ledger of ledgers) mergeLedger(ledger);
  const sorted = <T>(record: Record<string, T>) => Object.fromEntries(Object.entries(record).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
  writeFileSync(coveragePath, JSON.stringify({ ...coverage, runs: sorted(coverage.runs), units: sorted(coverage.units),
    variants: sorted(coverage.variants), selectors: sorted(coverage.selectors), silent: sorted(coverage.silent) }, null, 1) + "\n");
}

function mergeLedger(path: string): void {
  type Line = LedgerNarration | LedgerFrame | { t: "run"; s: number; run: string } | { t: "end"; s: number; waiting: { trigger: string; since?: number }[] };
  const lines = readFileSync(path, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line) as Line);
  const header = lines.find((line): line is Extract<Line, { t: "run" }> => line.t === "run");
  if (!header) throw new Error(`${path} has no run line: not a narration ledger`);
  const run = header.run;
  // A run merged again replaces what it said before about silent cases, so a fixed defect clears.
  for (const [key, entry] of Object.entries(coverage.silent)) {
    delete entry.runs[run];
    if (!Object.keys(entry.runs).length) delete coverage.silent[key];
  }
  let decisions = 0, heard = 0;
  const games = new Set<number>();
  // Heard narrations whose frames have not yet reached a key wait, by game.
  const open = new Map<number, { unitId: string; step: number; art?: Art; classic?: boolean; frames: number }[]>();
  const close = (session: number) => {
    for (const waiting of open.get(session) ?? []) {
      const entry = coverage.units[waiting.unitId]!;
      if (waiting.art) entry.art ??= waiting.art;
      else entry.withoutArt ??= { run, step: waiting.step,
        showing: !waiting.frames ? "not observed: the run ended first" : waiting.classic ? "the original picture" : "no picture" };
    }
    open.delete(session);
  };
  for (const line of lines) {
    games.add(line.s);
    if (line.t === "f") {
      const art: Art | undefined = line.portrait ? { kind: "portrait", key: line.portrait }
        : line.encounter ? { kind: "encounter", key: line.encounter } : line.scene ? { kind: "scene", key: line.scene } : undefined;
      for (const waiting of open.get(line.s) ?? []) {
        waiting.frames++;
        waiting.art ??= art;
        if (line.classic) waiting.classic = true;
      }
      if (line.key) close(line.s);
    } else if (line.t === "end") {
      close(line.s);
    } else if (line.t === "n") {
      decisions++;
      if (line.outcome === "heard" && line.unitId) {
        heard++;
        coverage.units[line.unitId] ??= { run, step: line.step };
        if (line.variantId) coverage.variants[line.variantId] ??= { run, step: line.step,
          ...(line.slot ? { slot: line.slot } : {}), ...(line.value === undefined ? {} : { value: line.value }) };
        if (line.selector) coverage.selectors[line.selector] ??= { run, step: line.step, unitId: line.unitId,
          ...(line.value === undefined ? {} : { value: line.value }) };
        open.set(line.s, [...(open.get(line.s) ?? []), { unitId: line.unitId, step: line.step, frames: 0 }]);
      } else if (line.outcome === "silent-by-design" && line.selector) {
        coverage.selectors[line.selector] ??= { run, step: line.step, unitId: null, ...(line.value === undefined ? {} : { value: line.value }) };
      } else if (line.outcome === "silent") {
        const key = [line.silent, line.sourceId, line.value ?? ""].join(" | ");
        const entry = coverage.silent[key] ??= { kind: line.silent!, sourceId: line.sourceId, archive: line.archive, block: line.block,
          ...(line.slot ? { slot: line.slot } : {}), ...(line.value === undefined ? {} : { value: line.value }),
          ...(line.status ? { status: line.status } : {}), ...(line.selector ? { selector: line.selector } : {}), runs: {} };
        const seen = entry.runs[run] ??= { count: 0, step: line.step };
        seen.count++;
      }
    }
  }
  for (const session of [...open.keys()]) close(session);
  coverage.runs[run] = { ledger: path.replaceAll("\\", "/").split("/").at(-1)!, games: games.size, decisions, heard };
  console.log(`merged ${path}: run ${run}, ${games.size} games, ${decisions} decisions, ${heard} narrations heard`);
}

// ---- the played rows ------------------------------------------------------------------------------------------------
type Row = { part: string; done?: number; total?: number; left: number; note: string; list?: string[] };
const rows: Row[] = [];
const address = (sourceId: string) => /at-([0-9a-f]{4})/.exec(sourceId)?.[1] ?? "?";
const scriptOf = (sourceId: string) => {
  const match = /ecl-(\d+)\.block-(\d+)/.exec(sourceId);
  return match ? `ECL${match[1]}.DAX block ${match[2]}` : "outside the scripts";
};
const catalog = JSON.parse(readFileSync(new URL("src/maps/area-catalog.json", root), "utf8")) as
  { areas: { id: number; name: string; scriptArchive: string }[] };
const areaName = (script: string) => {
  const match = /ECL(\d+)\.DAX block (\d+)/.exec(script);
  const area = match && catalog.areas.find(({ id, scriptArchive }) => id === Number(match[2]) && scriptArchive === `ECL${match[1]}.DAX`);
  return area ? ` (${area.name})` : "";
};
const say = (text: string) => JSON.stringify(text.replace(/\s+/g, " ").trim().slice(0, 64));

const stale = [...Object.keys(coverage.units).filter(id => !unitById.has(id)), ...Object.keys(coverage.variants).filter(id => !variantOwner.has(id)),
  ...Object.keys(coverage.selectors).filter(id => !selectors.some(({ triggerSourceId }) => triggerSourceId === id))];
const heardUnits = units.filter(unit => coverage.units[unit.id]);
const unheard = units.filter(unit => !coverage.units[unit.id]);
const byScript = new Map<string, string[]>();
for (const unit of units) {
  const script = scriptOf(unit.triggerSourceId);
  const variants = unit.runtimeVariants ?? [];
  const missing = variants.filter(variant => !coverage.variants[variant.id]);
  if (coverage.units[unit.id] && !missing.length) continue;
  const lines = byScript.get(script) ?? [];
  lines.push(`${address(unit.triggerSourceId)} ${coverage.units[unit.id] ? "heard, variants missing" : "unheard"} ${say(unit.spokenText || variants[0]?.text || "")}` +
    (missing.length ? `\n        variants not selected (${missing.length} of ${variants.length}): ${missing.map(variant => JSON.stringify(variant.dynamicValue)).join(", ")}` : ""));
  byScript.set(script, lines);
}
const scriptOrder = [...byScript.keys()].sort((a, b) => a.localeCompare(b, "en", { numeric: true }));
const runNames = Object.keys(coverage.runs);
rows.push({ part: "Units heard at their passage", done: heardUnits.length, total: units.length, left: unheard.length,
  note: `from ${runNames.length} runs: ${runNames.join(", ") || "none"}; unheard units are in ${new Set(unheard.map(unit => scriptOf(unit.triggerSourceId))).size} scripts`,
  list: scriptOrder.flatMap(script => {
    const all = units.filter(unit => scriptOf(unit.triggerSourceId) === script);
    return [`${script}${areaName(script)}: ${all.filter(unit => coverage.units[unit.id]).length} of ${all.length} units heard`,
      ...byScript.get(script)!.map(line => `    ${line}`)];
  }) });
const variantsHeard = [...variantOwner.keys()].filter(id => coverage.variants[id]);
const families = units.filter(unit => unit.runtimeVariants?.length);
rows.push({ part: "Dynamic variants selected", done: variantsHeard.length, total: variantTotal, left: variantTotal - variantsHeard.length,
  note: `${families.filter(unit => unit.runtimeVariants!.some(variant => coverage.variants[variant.id])).length} of ${families.length} families have fired; ` +
    `${families.filter(unit => unit.runtimeVariants!.every(variant => coverage.variants[variant.id])).length} have every variant heard`,
  list: variantsHeard.map(id => `heard ${id}: ${coverage.variants[id]!.slot ?? "slot ?"} held ${JSON.stringify(coverage.variants[id]!.value)} (${coverage.variants[id]!.run})`) });
const selectorsResolved = selectors.filter(({ triggerSourceId }) => coverage.selectors[triggerSourceId]);
rows.push({ part: "Deferred selectors resolved", done: selectorsResolved.length, total: selectors.length, left: selectors.length - selectorsResolved.length,
  note: "a selector counts when play reached its passage and it chose a unit, or the case the manifest marks silent",
  list: selectors.filter(({ triggerSourceId }) => !coverage.selectors[triggerSourceId])
    .map(({ triggerSourceId, playback, resolution }) => `unresolved ${scriptOf(triggerSourceId)} ${address(triggerSourceId)} (${playback ?? resolution})`) });
const silent = Object.values(coverage.silent);
rows.push({ part: "Silent cases found in play (must be 0)", left: silent.length,
  note: silent.length ? [...new Set(silent.map(({ kind }) => kind))].map(kind => `${silent.filter(entry => entry.kind === kind).length} ${kind}`).join(", ")
    : "no moment where narration belonged and none was chosen",
  list: silent.map(entry => `${entry.kind}: ${scriptOf(entry.sourceId)} ${address(entry.sourceId)} ${say(eventById.get(entry.sourceId)?.normalizedText ?? "")}` +
    `${entry.slot ? ` slot ${entry.slot}` : ""}${entry.value === undefined ? "" : ` held ${JSON.stringify(entry.value)}`}` +
    `${entry.status ? ` (${entry.status})` : ""}; ${Object.entries(entry.runs).map(([run, { count, step }]) => `${count} times in ${run}, first at step ${step}`).join("; ")}` +
    conditionsFor(entry.sourceId)) });
function conditionsFor(sourceId: string): string {
  const family = units.filter(unit => unit.triggerSourceId === sourceId && unit.runtimeVariants?.length);
  return family.map(unit => `\n        ${unit.id} conditions: ${unit.runtimeVariants!.map(({ condition }) => condition).join("; ")}`).join("");
}
const withArt = heardUnits.filter(unit => coverage.units[unit.id]!.art && !coverage.units[unit.id]!.withoutArt);
const withoutArt = heardUnits.filter(unit => !withArt.includes(unit));
rows.push({ part: "Heard passages with their artwork showing", done: withArt.length, total: heardUnits.length, left: withoutArt.length,
  note: `artwork is an Enhanced portrait, scene illustration or encounter picture on screen before the game next waits for a key; ` +
    `${withoutArt.filter(unit => coverage.units[unit.id]!.withoutArt?.showing === "the original picture").length} showed only the original picture, ` +
    `${withoutArt.filter(unit => coverage.units[unit.id]!.withoutArt?.showing === "no picture").length} no picture`,
  list: withoutArt.map(unit => {
    const entry = coverage.units[unit.id]!;
    return `${scriptOf(unit.triggerSourceId)} ${address(unit.triggerSourceId)} ${say(unit.spokenText || unit.runtimeVariants?.[0]?.text || "")}: ` +
      `${entry.withoutArt?.showing ?? "not observed"} (${entry.withoutArt?.run ?? entry.run})${entry.art ? `; another hearing showed ${entry.art.key}` : ""}`;
  }) });
if (stale.length) rows.push({ part: "Coverage entries the manifest no longer has", left: stale.length, note: "remove them from qa/narration-coverage.json", list: stale });

// ---- the static rows: no play needed --------------------------------------------------------------------------------
const assets = [...units.flatMap(unit => unit.asset ? [unit.asset] : []), ...units.flatMap(unit => (unit.runtimeVariants ?? []).map(({ asset }) => asset))];
const audio = new URL("audio/", root);
const missingAssets = [...new Set(assets)].filter(asset => !existsSync(new URL(asset, audio)));
const unvoicedUnits = units.filter(unit => !unit.asset && !unit.runtimeVariants?.length);
rows.push({ part: "Recordings missing under audio/", done: new Set(assets).size - missingAssets.length, total: new Set(assets).size,
  left: missingAssets.length + unvoicedUnits.length, note: `${assets.length} references from ${units.length} units and ${variantTotal} variants` +
    (unvoicedUnits.length ? `; ${unvoicedUnits.length} units have neither a recording nor variants` : ""),
  list: [...missingAssets, ...unvoicedUnits.map(({ id }) => `${id}: no recording and no variants`)] });

// A family is told apart at run time by the value in one slot: the play server picks the variant whose
// dynamicValue equals it. Two variants with one value, or two with one condition, can never both be chosen.
const overlapping: string[] = [];
for (const unit of families) {
  const seenValue = new Map<string, string>(), seenCondition = new Map<string, string>();
  for (const variant of unit.runtimeVariants!) {
    if (seenValue.has(variant.dynamicValue)) overlapping.push(`${unit.id}: ${variant.id} and ${seenValue.get(variant.dynamicValue)} both select on ${JSON.stringify(variant.dynamicValue)}`);
    if (seenCondition.has(variant.condition)) overlapping.push(`${unit.id}: ${variant.id} and ${seenCondition.get(variant.condition)} share the condition ${variant.condition}`);
    seenValue.set(variant.dynamicValue, variant.id);
    seenCondition.set(variant.condition, variant.id);
  }
}
rows.push({ part: "Variant conditions that overlap", done: families.length - new Set(overlapping.map(line => line.split(":")[0])).size, total: families.length,
  left: overlapping.length, note: "within a family every condition and every selecting value must be distinct", list: overlapping });

// The observer reads one slot per family (EclNarrationObserver.variantSlot). The manifest's condition names
// the slot the recordings were made for. Where the two differ, or the observer finds no single slot, the
// family cannot be selected: the play server answers "selector-required" and the passage is silent.
const observer = new EclNarrationObserver(manifest as unknown as ObserverManifest);
const unselectable: string[] = [];
const familySlot = new Map<string, string>();
for (const unit of families) {
  const read = observer.variantSlot(unit.id);
  const named = /^(0x[0-9a-f]{4}) == /.exec(unit.runtimeVariants![0]!.condition)?.[1];
  const menuText = /^rendered encounter operand/.test(unit.runtimeVariants![0]!.condition);
  if (read) familySlot.set(unit.id, read);
  if (!read) unselectable.push(`${unit.id} (${scriptOf(unit.triggerSourceId)} ${address(unit.triggerSourceId)}): the observer finds no single slot; ` +
    `the manifest selects on ${JSON.stringify(unit.runtimeVariants![0]!.condition)}`);
  else if (!menuText && named !== read) unselectable.push(`${unit.id}: the observer reads ${read}, the manifest selects on ${JSON.stringify(unit.runtimeVariants![0]!.condition)}`);
}
rows.push({ part: "Variant families the observer cannot select", done: families.length - unselectable.length, total: families.length,
  left: unselectable.length, note: "the observer must read the slot the family's conditions name", list: unselectable });

// Encounter tables. A family's slot is filled by the script itself: a SAVE of a literal string into the
// slot, chosen by the script's own table (an ON GOTO or ON GOSUB over the monsters that can appear). The
// values that can appear are therefore the literal strings whose SAVE can reach the passage's print of the
// slot with no other SAVE into the slot between. They are found here by following the converted 1.3 script
// in game/content/scripts from every SAVE into the slot: GOTO and GOSUB to their targets, ON GOTO and
// ON GOSUB to every target, an IF to both the next instruction and the one after, a RETURN to the
// instruction after each GOSUB that can have called its routine. The values are compared, exactly as the play server compares them,
// with the family's selecting values. A table is not established, and is listed as such, when a value
// that is not a literal string can reach the print, or when the print can be reached from the block's
// entry points with no SAVE into the slot at all (the slot was filled somewhere else). Menu families
// select on a whole drawn sentence and are not attempted. The observer reads the slot when the unit's
// trigger runs, which can be before the print: the same walk is made to the trigger, and a family whose
// trigger can see other values than its print is listed, because the narrator would then name what the
// slot held before.
const scriptIndex = JSON.parse(readFileSync(new URL("game/content/scripts.json", root), "utf8")) as
  { records: { file: string; block: number; blob: { file: string; offset: number; length: number } }[] };
const scriptBytes = new Map<string, Buffer>();
const flows = new Map<string, ReturnType<typeof flow>>();
function flow(archive: string, block: number) {
  const record = scriptIndex.records.find(entry => entry.file === archive && entry.block === block);
  if (!record) return undefined;
  const file = record.blob.file;
  if (!scriptBytes.has(file)) scriptBytes.set(file, readFileSync(new URL(join("game", file).replaceAll("\\", "/"), root)));
  const script = scriptFromBlock(new Uint8Array(scriptBytes.get(file)!.subarray(record.blob.offset, record.blob.offset + record.blob.length)));
  const instructions = disassemble(script).instructions;
  const at = new Map(instructions.map(instruction => [instruction.address, instruction]));
  const targets = (instruction: Instruction): number[] => (instruction.name === "GOTO" || instruction.name === "GOSUB"
    ? instruction.operands.slice(0, 1) : instruction.operands.slice(2)).map(({ word }) => word).filter((word): word is number => word !== null);
  const calls = (instruction: Instruction) => instruction.name === "GOSUB" || instruction.name === "ON GOSUB";
  // A RETURN goes back to the instruction after each GOSUB that can have called the routine it ends.
  // The routine of a GOSUB target is walked with every inner GOSUB taken as returning.
  const returnsTo = new Map<number, Set<number>>();
  for (const call of instructions.filter(calls)) {
    const seen = new Set<number>(), queue = targets(call);
    while (queue.length) {
      const address = queue.pop()!;
      if (seen.has(address)) continue;
      seen.add(address);
      const instruction = at.get(address);
      if (!instruction || instruction.name === "EXIT" || instruction.name === "NEW ECL") continue;
      if (instruction.name === "RETURN") returnsTo.set(address, (returnsTo.get(address) ?? new Set()).add(call.next));
      else if (calls(instruction)) queue.push(instruction.next);
      else if (instruction.name === "GOTO" || instruction.name === "ON GOTO") queue.push(...targets(instruction));
      else queue.push(instruction.next, ...(/^IF /.test(instruction.name) ? [at.get(instruction.next)?.next ?? instruction.next] : []));
    }
  }
  const next = (instruction: Instruction): number[] => {
    switch (instruction.name) {
      case "EXIT": case "NEW ECL": return [];
      case "RETURN": return [...(returnsTo.get(instruction.address) ?? [])];
      case "GOTO": case "GOSUB": case "ON GOTO": case "ON GOSUB": return targets(instruction);
      default: return /^IF /.test(instruction.name) ? [instruction.next, at.get(instruction.next)?.next ?? instruction.next] : [instruction.next];
    }
  };
  let entries: number[] = [];
  try { entries = readEntryVector(script).filter(word => script.inRange(word)); } catch { /* a block with no entry vector */ }
  /** What the slot can hold when the script reaches `target`: literal strings, and whether anything else can. */
  const reaching = (slot: number, target: number) => {
    const writes = (instruction: Instruction) => instruction.name === "SAVE" && instruction.operands[1]?.word === slot;
    const reaches = (start: number[]) => {
      const seen = new Set<number>(), queue = [...start];
      while (queue.length) {
        const address = queue.pop()!;
        if (seen.has(address)) continue;
        seen.add(address);
        if (address === target) return true;
        const instruction = at.get(address);
        if (!instruction || writes(instruction)) continue;
        queue.push(...next(instruction));
      }
      return false;
    };
    const literal = new Set<string>();
    let other = false;
    for (const instruction of instructions) {
      if (!writes(instruction) || !reaches(next(instruction))) continue;
      const text = instruction.operands[0]?.text;
      if (typeof text === "string") literal.add(text); else other = true;
    }
    return { literal, other, outside: reaches(entries) };
  };
  return { reaching, known: (address: number) => at.has(address) };
}
const blockOf = (unit: Unit) => {
  const match = /ecl-(\d+)\.block-(\d+)/.exec(unit.triggerSourceId)!;
  return { archive: `ECL${match[1]}.DAX`, archiveNumber: Number(match[1]), block: Number(match[2]) };
};
const tableFamilies = families.filter(unit => /^0x[0-9a-f]{4} == "/.test(unit.runtimeVariants![0]!.condition));
const noVariant: string[] = [], cannotAppear: string[] = [], notEstablished: string[] = [], readEarly: string[] = [];
let established = 0;
for (const unit of tableFamilies) {
  const slotText = /^(0x[0-9a-f]{4})/.exec(unit.runtimeVariants![0]!.condition)![1]!;
  const slot = Number.parseInt(slotText, 16);
  const { archive, archiveNumber, block } = blockOf(unit);
  const label = `${unit.id} (${archive} block ${block}, slot ${slotText}, ${say(unit.spokenText)})`;
  const key = `${archive}:${block}`;
  if (!flows.has(key)) flows.set(key, flow(archive, block));
  const script = flows.get(key);
  // Manifest positions are in the first release's numbering; game/ holds version 1.3.
  const running = (sourceId: string) => runningScriptAddress(archiveNumber, block, Number.parseInt(address(sourceId), 16), "1.3");
  const prints = unit.coveredSourceIds.filter(id => eventById.get(id)?.outputParts.some(part => part.address === slotText)).map(running);
  const values = new Set(unit.runtimeVariants!.map(({ dynamicValue }) => dynamicValue));
  if (!script) { notEstablished.push(`${label}: the script block is not in game/`); continue; }
  if (!prints.length || prints.some(print => !script.known(print)) || !script.known(running(unit.triggerSourceId))) {
    notEstablished.push(`${label}: the passage's instructions were not found in the game/ script`); continue;
  }
  const shown = prints.map(print => script.reaching(slot, print));
  if (shown.some(({ other }) => other)) { notEstablished.push(`${label}: a value that is not a literal string can reach the print`); continue; }
  if (shown.some(({ outside }) => outside)) { notEstablished.push(`${label}: the print can be reached with no SAVE into the slot in this block; the slot is filled elsewhere`); continue; }
  const table = new Set(shown.flatMap(({ literal }) => [...literal]));
  if (!table.size) { notEstablished.push(`${label}: no SAVE into the slot reaches the print`); continue; }
  established++;
  for (const text of table) if (!values.has(text)) noVariant.push(`${label}: the script can show ${JSON.stringify(text)} and no variant selects on it`);
  for (const value of values) if (!table.has(value)) cannotAppear.push(`${label}: variant ${JSON.stringify(value)}: no SAVE of it reaches the print`);
  const atTrigger = script.reaching(slot, running(unit.triggerSourceId));
  const early = [...atTrigger.literal].filter(text => !table.has(text));
  const late = [...table].filter(text => !atTrigger.literal.has(text));
  if (atTrigger.outside || atTrigger.other || early.length || late.length) readEarly.push(`${label}: the observer reads the slot at the trigger ${address(unit.triggerSourceId)}, where it can hold ` +
    `${[...atTrigger.literal].map(text => JSON.stringify(text)).join(", ") || "no value saved in this block"}${atTrigger.outside ? " or whatever it held on entry" : ""}; ` +
    `the print shows ${[...table].map(text => JSON.stringify(text)).join(", ")}`);
}
rows.push({ part: "Encounter tables established from the script", done: established, total: tableFamilies.length, left: notEstablished.length,
  note: `families that select on a string slot; the table is the literal strings whose SAVE reaches the passage's print in the 1.3 script (game/content/scripts). ` +
    `${families.length - tableFamilies.length} other families select on a number or a drawn menu sentence`, list: notEstablished });
rows.push({ part: "Monsters that can appear with no variant", left: noVariant.length, note: `in the ${established} established tables`, list: noVariant });
rows.push({ part: "Variants for monsters that cannot appear", left: cannotAppear.length, note: `in the ${established} established tables`, list: cannotAppear });
rows.push({ part: "Slots read before the script fills them", left: readEarly.length,
  note: `in the ${established} established tables: the trigger, where the observer reads the slot, must see the values the print shows`, list: readEarly });

// The tavern tales: reported, not counted. The roll in the script the port runs decides how many are used.
const notes: string[] = [];
const tales = units.find(unit => unit.runtimeVariants?.some(({ condition }) => condition.startsWith("0x6e7e ==")));
if (tales) {
  const { archive, block } = blockOf(tales);
  const record = scriptIndex.records.find(entry => entry.file === archive && entry.block === block)!;
  const bytes = new Uint8Array(readFileSync(new URL(`game/${record.blob.file}`, root)).subarray(record.blob.offset, record.blob.offset + record.blob.length));
  const rolls = disassemble(scriptFromBlock(bytes)).instructions.filter(({ name, operands }) => name === "RANDOM" && operands.some(({ word }) => word === 0x6e7e));
  const highest = rolls.map(({ operands }) => operands.find(({ word }) => word !== 0x6e7e)?.low ?? operands[0]!.low);
  const recorded = tales.runtimeVariants!.map(({ dynamicValue }) => Number(dynamicValue));
  // RANDOM n yields 0 to n and the script adds 1 (the manifest's evidence: "RANDOM 23 followed by ADD 1" for 24 tales).
  const rolled = highest.length === 1 ? highest[0]! + 1 : undefined;
  notes.push(rolled === undefined ? `Tavern tales: ${recorded.length} recorded; the roll in ${archive} block ${block} was not established (${rolls.length} RANDOM instructions write 0x6e7e)`
    : `Tavern tales: ${recorded.length} recorded (1 to ${Math.max(...recorded)}); the game/ script rolls RANDOM ${highest[0]} then adds 1, so tales 1 to ${rolled} can be told. ` +
      (recorded.filter(tale => tale > rolled).length ? `Unused recording${recorded.filter(tale => tale > rolled).length > 1 ? "s" : ""}: tale ${recorded.filter(tale => tale > rolled).join(", ")}. ` : "") +
      (Array.from({ length: rolled }, (_, index) => index + 1).filter(tale => !recorded.includes(tale)).length ? "TALES WITHOUT A RECORDING EXIST. " : "No tale lacks a recording. ") +
      `Heard in play: ${tales.runtimeVariants!.filter(({ id }) => coverage.variants[id]).map(({ dynamicValue }) => dynamicValue).join(", ") || "none"}.`);
}

// ---- report ---------------------------------------------------------------------------------------------------------
let left = 0;
const cell = (value: number | undefined) => String(value ?? "").padStart(6);
console.log(`${"part".padEnd(46)} ${"done".padStart(6)} ${"of".padStart(6)} ${"left".padStart(6)}`);
for (const { part, done, total, left: rowLeft, note } of rows) {
  left += rowLeft;
  console.log(`${part.padEnd(46)} ${cell(done)} ${cell(total)} ${cell(rowLeft)}   ${note}`);
}
for (const note of notes) console.log(`\n${note}`);
console.log(`\n${left} left before every narrated passage is proved heard in play, with its picture`);
if (process.argv.includes("--list")) {
  for (const { part, list } of rows) {
    if (!list?.length) continue;
    console.log(`\n${part}:`);
    for (const line of list) console.log(`  ${line}`);
  }
}
if (left) process.exit(1);
