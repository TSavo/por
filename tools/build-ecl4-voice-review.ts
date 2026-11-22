import { readFileSync, writeFileSync } from "node:fs";

type Part = { operandIndex: number; kind: string; rawText?: string; address?: string };
type Event = { id: string; source: { archive: string; block: number; address: string; instruction: string }; outputParts: Part[]; rawLiteralText: string; sourceDigest: string };
type Unit = { id: string; block: number; triggerSourceId: string; coveredSourceIds: string[]; sourceTextParts: Array<{ sourceId: string; operandIndex?: number; rawText: string }>; spokenText: string; status: "ready" | "unresolved-dynamic"; characterId: string | null; direction: string; variant?: string };
const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as { events: Event[] };
const events = extraction.events.filter(event => event.source.archive === "ECL4.DAX" && event.source.block !== 21);
const byKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const eventUnits = new Map<string, string[]>();
const units: Unit[] = [];
const key = (block: number, address: string) => { const event = byKey.get(`${block}:${address}`); if (!event) throw new Error(`Missing ECL4 block ${block} ${address}`); return event; };
const characterFor = (block: number, address: string): string | null => {
  const value = Number.parseInt(address.slice(2), 16);
  if (block === 2 && value >= 0xa109 && value <= 0xa5f2) return "skullcrusher";
  if (block === 2 && value >= 0xadfa && value <= 0xb0e6) return "restal";
  if (block === 10 && value >= 0xad54 && value <= 0xaeb5) return "graveyard-mystic-man";
  if (block === 10 && value >= 0xb3df && value <= 0xb41f) return "graveyard-mystic-man";
  return null;
};
const joinText = (texts: string[]) => texts.reduce((all, text) => !all ? text : `${all}${/\s$/.test(all) || /^\s/.test(text) ? "" : " "}${text}`, "").replace(/\s+/g, " ").trim();
const directionFor = (text: string, characterId: string | null) => {
  if (characterId === "skullcrusher") return "perform Skullcrusher consistently: muscular, blunt, impatient, and rough; retain narrator identity for attribution";
  if (characterId === "restal") return "perform Restal consistently: an older, amused, confident thieves' guild master; retain narrator identity for attribution";
  if (characterId === "graveyard-mystic-man") return "perform the mystic man consistently: grave, urgent, and controlled; retain narrator identity for attribution";
  if (text.includes("'") || text.includes('"')) return "expressive fantasy narration; perform quoted dialogue distinctly while remaining the same narrator";
  return "measured, expressive fantasy narration appropriate to the scene";
};
const addUnit = (block: number, addresses: string[], options: { variant?: string; texts?: string[]; status?: Unit["status"] } = {}) => {
  const selected = addresses.map(address => key(block, address));
  const texts = options.texts ?? selected.map(event => event.rawLiteralText);
  const spokenText = joinText(texts);
  const id = `ecl4-b${block}-${addresses.map(address => address.slice(2)).join("-")}${options.variant ? `-${options.variant}` : ""}`;
  const characterId = characterFor(block, addresses[0]!);
  units.push({ id, block, triggerSourceId: selected[0]!.id, coveredSourceIds: selected.map(event => event.id), sourceTextParts: selected.map((event, index) => ({ sourceId: event.id, rawText: texts[index] ?? "" })), spokenText, status: options.status ?? "ready", characterId, direction: directionFor(spokenText, characterId), ...(options.variant ? { variant: options.variant } : {}) });
  for (const event of selected) eventUnits.set(event.id, [...(eventUnits.get(event.id) ?? []), id]);
};

// Manually reviewed unconditional display/narration sequences and state variants.
addUnit(2, ["0x9e30", "0x9e61"]);
addUnit(2, ["0x9f6a", "0x9fca", "0x9ff2"], { variant: "skullcrusher-present" });
addUnit(2, ["0x9f6a", "0x9ff2"], { variant: "skullcrusher-absent" });
addUnit(2, ["0xa109", "0xa147", "0xa19f"], { variant: "prisoner-chained" });
addUnit(2, ["0xa109", "0xa3fc"], { variant: "prisoner-free" });
addUnit(2, ["0xa109"], { variant: "prisoner-gone" });
addUnit(2, ["0xa4d2", "0xa500"]);
addUnit(2, ["0xa7e2", "0xa80f", "0xa887"]);
addUnit(2, ["0xb049", "0xb0e6"]);
// 9ba5 "THE SKY DARKENS." is skipped when 0x49c9 is 14 or more (9ba4 IF <): 9bbf is reached alone
// as often as after it, so each is its own unit (#174).
addUnit(10, ["0x9df8", "0x9e19"]);
addUnit(10, ["0xac5a", "0xacbc"]);
addUnit(10, ["0xad54", "0xad80", "0xadcd"]);
addUnit(10, ["0xaf0e", "0xaf92"]);
addUnit(10, ["0xafb7", "0xafe3"], { variant: "scroll-read" });
addUnit(10, ["0xafe3"], { variant: "scroll-not-read" });

const interfaceOnly = new Set(["2:0x9ff2", "2:0xa19f", "2:0xa3fc", "2:0xa500"]);
const memberIds = new Set(eventUnits.keys());
for (const event of events) {
  if (memberIds.has(event.id)) continue;
  const eventKey = `${event.source.block}:${event.source.address}`;
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "PRINT RETURN" || interfaceOnly.has(eventKey)) continue;
  const literals = event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim());
  const dynamics = event.outputParts.filter(part => part.kind !== "literal");
  if (event.source.instruction === "ENCOUNTER MENU") {
    if (dynamics.length) { addUnit(event.source.block, [event.source.address], { variant: "runtime-text", status: "unresolved-dynamic" }); continue; }
    for (const part of literals) addUnit(event.source.block, [event.source.address], { variant: `operand-${part.operandIndex}`, texts: [part.rawText!] });
    continue;
  }
  if (!event.rawLiteralText.trim() && dynamics.length) { addUnit(event.source.block, [event.source.address], { status: "unresolved-dynamic" }); continue; }
  if (!event.rawLiteralText.trim()) continue;
  addUnit(event.source.block, [event.source.address]);
}

const classifications = events.map(event => {
  const eventKey = `${event.source.block}:${event.source.address}`;
  const unitIds = eventUnits.get(event.id) ?? [];
  let classification = "voiced-narration", reason = "manually reviewed narration source";
  if (event.source.instruction === "HORIZONTAL MENU") { classification = "unvoiced-interface"; reason = "choice labels or continue control"; }
  else if (event.source.instruction === "PRINT RETURN" || (!event.rawLiteralText.trim() && !event.outputParts.some(part => part.kind !== "literal"))) { classification = "unvoiced-layout"; reason = "blank/spacing/return control"; }
  else if (interfaceOnly.has(eventKey) && !unitIds.length) { classification = "unvoiced-interface"; reason = "generic interaction prompt"; }
  else if (unitIds.some(id => units.find(unit => unit.id === id)?.status === "unresolved-dynamic")) { classification = "unresolved-dynamic"; reason = "runtime text must be resolved before generation"; }
  else if (unitIds.length > 1) { classification = "voiced-context-dependent"; reason = "source participates in reviewed state variants"; }
  else if (!unitIds.length) { classification = "unvoiced-layout"; reason = "no spoken content"; }
  return { sourceId: event.id, source: event.source, rawLiteralText: event.rawLiteralText, outputParts: event.outputParts, sourceDigest: event.sourceDigest, classification, reason, narrationUnitIds: unitIds };
});
const review = { schema: 1, archive: "ECL4.DAX", excludedAlreadyReviewedBlocks: [21], reviewMethod: "manual prose and unconditional control-flow sequence review", playback: { trigger: "first covered source event only", continuation: "audio continues across later covered events", queue: "newly reached standalone unit plays after current narration" }, eventCount: classifications.length, narrationUnitCount: units.length, readyUnitCount: units.filter(unit => unit.status === "ready").length, unresolvedUnitCount: units.filter(unit => unit.status === "unresolved-dynamic").length, events: classifications, narrationUnits: units };
writeFileSync(new URL("../src/audio/ecl4-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
for (const block of [2, 10]) {
  const items = units.filter(unit => unit.block === block && unit.status === "ready").map(unit => ({ id: unit.id, triggerSourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds, output: `audio/voices/narration/ecl4/block-${block}/${unit.id}.mp3`, text: unit.spokenText, direction: unit.direction }));
  writeFileSync(new URL(`../src/audio/ecl4-generation-queue-block-${block}.json`, import.meta.url), `${JSON.stringify({ schema: 1, model: "eleven_v4", archive: "ECL4.DAX", block, items }, null, 2)}\n`);
}
console.log(JSON.stringify({ events: classifications.length, units: units.length, ready: units.filter(unit => unit.status === "ready").length, unresolved: units.filter(unit => unit.status === "unresolved-dynamic").length }, null, 2));
