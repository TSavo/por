import { readFileSync, writeFileSync } from "node:fs";

type Part = { operandIndex: number; kind: string; rawText?: string; address?: string };
type Event = { id: string; source: { archive: string; block: number; address: string; instruction: string }; outputParts: Part[]; rawLiteralText: string; sourceDigest: string };
type Unit = { id: string; block: number; triggerSourceId: string; coveredSourceIds: string[]; sourceTextParts: Array<{ sourceId: string; rawText: string }>; spokenText: string; status: "ready" | "unresolved-dynamic"; characterId: string | null; direction: string; variant?: string };
const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as { events: Event[] };
const events = extraction.events.filter(event => event.source.archive === "ECL6.DAX");
const byKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const eventUnits = new Map<string, string[]>();
const units: Unit[] = [];
const get = (block: number, address: string) => { const event = byKey.get(`${block}:${address}`); if (!event) throw new Error(`Missing ECL6 block ${block} ${address}`); return event; };
const joinText = (texts: string[]) => texts.reduce((all, text) => !all ? text : `${all}${/\s$/.test(all) || /^\s/.test(text) ? "" : " "}${text}`, "").replace(/\s+/g, " ").trim();
const characterFor = (block: number, address: string): string | null => {
  const value = Number.parseInt(address.slice(2), 16);
  if (block === 1 && value >= 0x9dcb && value <= 0xa1ef) return "sleazy-slave-merchant";
  if (block === 1 && ((value >= 0xa562 && value <= 0xa75d) || (value >= 0xac44 && value <= 0xaf52))) return "buccaneer-captain";
  if (block === 19 && value >= 0x999c) return "diogenes";
  if (block === 28 && value >= 0x9a85 && value <= 0x9e57) return value >= 0x9ce0 ? "zhentil-tour-guard" : "zhentil-commandant";
  if (block === 28 && value >= 0xa6eb && value <= 0xb3db) return "zhentil-commandant";
  return null;
};
const directionFor = (text: string, characterId: string | null) => {
  if (characterId === "diogenes") return "perform Diogenes consistently as a huge noble silver dragon with a deep, resonant, booming voice; retain narrator identity for attribution and action";
  if (characterId === "buccaneer-captain") return "perform the Buccaneer Captain consistently: large, commanding, battle-hardened, and confident; retain narrator identity for attribution";
  if (characterId === "sleazy-slave-merchant") return "perform the slave merchant consistently: oily, avaricious, cowardly, and unpleasant; retain narrator identity for narration";
  if (characterId === "zhentil-tour-guard") return "perform the Zhentil tour guard consistently: proud, officious, and rehearsed; retain narrator identity for narration";
  if (characterId === "zhentil-commandant") return "perform the Zhentil commandant consistently: controlled, cordial, probing, and politically calculating; retain narrator identity for narration";
  if (text.includes("'") || text.includes('"')) return "expressive fantasy narration; perform quoted dialogue distinctly while remaining the same narrator";
  return "measured, expressive fantasy narration appropriate to the scene";
};
const addUnit = (block: number, addresses: string[], options: { variant?: string; texts?: string[]; status?: Unit["status"] } = {}) => {
  const selected = addresses.map(address => get(block, address));
  const texts = options.texts ?? selected.map(event => event.rawLiteralText);
  const spokenText = joinText(texts);
  const id = `ecl6-b${block}-${addresses.map(address => address.slice(2)).join("-")}${options.variant ? `-${options.variant}` : ""}`;
  const characterId = characterFor(block, addresses[0]!);
  units.push({ id, block, triggerSourceId: selected[0]!.id, coveredSourceIds: selected.map(event => event.id), sourceTextParts: selected.map((event, index) => ({ sourceId: event.id, rawText: texts[index] ?? "" })), spokenText, status: options.status ?? "ready", characterId, direction: directionFor(spokenText, characterId), ...(options.variant ? { variant: options.variant } : {}) });
  for (const event of selected) eventUnits.set(event.id, [...(eventUnits.get(event.id) ?? []), id]);
};

// Manually traced, unconditional print sequences and explicit state/branch variants.
addUnit(1, ["0x9dcb", "0x9e66", "0x9eda"]);
addUnit(1, ["0xa00d", "0xa0a0"]);
addUnit(1, ["0xa562", "0xa5fb"]);
addUnit(1, ["0xac44", "0xacca"]);
addUnit(1, ["0xaedf", "0xaf52"]);
addUnit(1, ["0xb39c", "0xb3f6"], { variant: "first-release" });
addUnit(1, ["0xb39c"], { variant: "already-released" });

addUnit(19, ["0x9aef", "0x9b70", "0x9c11"], { variant: "pledge" });
addUnit(19, ["0x9c80", "0x9d07"]);
addUnit(19, ["0x9da0", "0x9e28", "0x9c11"], { variant: "apology" });
addUnit(19, ["0x9ec4", "0x9f43"]);
addUnit(19, ["0xa145", "0xa1e5", "0x9c11"], { variant: "ask-advice" });
addUnit(19, ["0xa288", "0xa2f6", "0xa378", "0x9c11"], { variant: "offer-gift" });
addUnit(19, ["0xa3c7", "0xa44c", "0xa4cc"]);

addUnit(25, ["0x9c3e", "0x9c6b"]);
// The dragon passage goes on to 9c6b too (9c3a GOTO): "WHAT WILL YOU DO?" (#174).
addUnit(25, ["0x9bbf", "0x9c6b"]);
for (const addresses of [
  ["0xa128", "0xa13a"], ["0xa172", "0xa18d", "0xa191"], ["0xa1c7", "0xa1dc", "0xa1e0"],
  ["0xa216", "0xa23c", "0xa240"], ["0xa2fe", "0xa304", "0xa308"], ["0xa34e", "0xa35e", "0xa362"],
  ["0xa391", "0xa3a5", "0xa3a9", "0xa3ad", "0xa3b3", "0xa3b7"], ["0xa3d0", "0xa3d6", "0xa3da", "0xa401", "0xa405"]
]) addUnit(25, addresses, { status: "unresolved-dynamic" });

addUnit(28, ["0x9a85", "0x9b78", "0x9bda", "0x9c00", "0x9c46", "0x9ce0", "0x9d55", "0x9da7", "0x9e0e", "0x9e57"], { variant: "escorted-tour" });
addUnit(28, ["0xa6eb", "0xa74e", "0xa7c2"]);
addUnit(28, ["0xad53", "0xade4"]);

const memberIds = new Set(eventUnits.keys());
for (const event of events) {
  if (memberIds.has(event.id)) continue;
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "VERTICAL MENU" || event.source.instruction === "PRINT RETURN") continue;
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
  const unitIds = eventUnits.get(event.id) ?? [];
  let classification = "voiced-narration", reason = "manually reviewed narration source";
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "VERTICAL MENU") { classification = "unvoiced-interface"; reason = "choice labels, typed response options, or continue control"; }
  else if (event.source.instruction === "PRINT RETURN" || (!event.rawLiteralText.trim() && !event.outputParts.some(part => part.kind !== "literal"))) { classification = "unvoiced-layout"; reason = "blank/spacing/return control"; }
  else if (unitIds.some(id => units.find(unit => unit.id === id)?.status === "unresolved-dynamic")) { classification = "unresolved-dynamic"; reason = "runtime text must be resolved before generation"; }
  else if (unitIds.length > 1) { classification = "voiced-context-dependent"; reason = "source participates in manually traced branch variants"; }
  else if (!unitIds.length) { classification = "unvoiced-layout"; reason = "no spoken content"; }
  return { sourceId: event.id, source: event.source, rawLiteralText: event.rawLiteralText, outputParts: event.outputParts, sourceDigest: event.sourceDigest, classification, reason, narrationUnitIds: unitIds };
});
const ready = units.filter(unit => unit.status === "ready");
const unresolved = units.filter(unit => unit.status === "unresolved-dynamic");
const review = { schema: 1, archive: "ECL6.DAX", reviewMethod: "manual prose, display-continuation, and unconditional control-flow sequence review", playback: { trigger: "first covered source event only", continuation: "audio continues across later covered events", queue: "newly reached standalone unit plays after current narration" }, eventCount: classifications.length, narrationUnitCount: units.length, readyUnitCount: ready.length, unresolvedUnitCount: unresolved.length, characters: [
  { id: "sleazy-slave-merchant", aliases: ["sleazy fat merchant", "sleazy merchant"] },
  { id: "buccaneer-captain", aliases: ["captain", "large man in gleaming chain mail"] },
  { id: "diogenes", aliases: ["magic mouth", "large silver dragon", "silver dragon"] },
  { id: "zhentil-tour-guard", aliases: ["guard giving the tour"] },
  { id: "zhentil-commandant", aliases: ["commandant"] }
], events: classifications, narrationUnits: units };
writeFileSync(new URL("../src/audio/ecl6-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
for (const block of [1, 19, 25, 28]) {
  const items = ready.filter(unit => unit.block === block).map(unit => ({ id: unit.id, triggerSourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds, output: `audio/voices/narration/ecl6/block-${block}/${unit.id}.mp3`, text: unit.spokenText, direction: unit.direction }));
  writeFileSync(new URL(`../src/audio/ecl6-generation-queue-block-${block}.json`, import.meta.url), `${JSON.stringify({ schema: 1, model: "eleven_v4", archive: "ECL6.DAX", block, items }, null, 2)}\n`);
}
console.log(JSON.stringify({ events: classifications.length, units: units.length, ready: ready.length, unresolved: unresolved.length, unclassified: classifications.filter(event => !event.classification).length }, null, 2));
