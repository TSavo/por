import { readFileSync, writeFileSync } from "node:fs";

type Part = { operandIndex: number; kind: string; rawText?: string; address?: string };
type Event = { id: string; source: { archive: string; block: number; address: string; instruction: string }; outputParts: Part[]; rawLiteralText: string; sourceDigest: string };
type Unit = { id: string; block: number; triggerSourceId: string; coveredSourceIds: string[]; sourceTextParts: Array<{ sourceId: string; rawText: string }>; spokenText: string; status: "ready" | "unresolved-dynamic"; characterId: string | null; direction: string; variant?: string };
const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as { events: Event[] };
const events = extraction.events.filter(event => event.source.archive === "ECL8.DAX");
const byKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const eventUnits = new Map<string, string[]>();
const units: Unit[] = [];
const get = (block: number, address: string) => { const event = byKey.get(`${block}:${address}`); if (!event) throw new Error(`Missing ECL8 block ${block} ${address}`); return event; };
const joinText = (texts: string[]) => texts.reduce((all, text) => !all ? text : `${all}${/\s$/.test(all) || /^\s/.test(text) ? "" : " "}${text}`, "").replace(/\s+/g, " ").trim();
const characterFor = (block: number, address: string): string | null => {
  const value = Number.parseInt(address.slice(2), 16);
  if (block === 13 && value >= 0xa570 && value <= 0xa69a) return "samir-ahwahl";
  if (block === 13 && ((value >= 0xa733 && value <= 0xa894) || value === 0x9a39 || value === 0xb294)) return "princess-fatima";
  if (block === 13 && ((value >= 0x9b90 && value <= 0x9d05) || (value >= 0xaf93 && value <= 0xb16b))) return "kobold-guide";
  if (block === 16 && value >= 0x9f0f && value <= 0xa3f6) return "old-lizardman";
  if (block === 29 && value >= 0xa773 && value <= 0xa972) return "sickly-kobold-scouts";
  if (block === 29 && value >= 0xaaff && value <= 0xab8a) return "prophetic-woman";
  return null;
};
const directionFor = (text: string, characterId: string | null) => {
  if (characterId === "samir-ahwahl") return "perform Samir Ahwahl consistently as a proud, powerful efreeti with fiery authority; retain narrator identity for attribution";
  if (characterId === "princess-fatima") return "perform Princess Fatima consistently as a fierce, confident young barbarian noblewoman; retain narrator identity for narration";
  if (characterId === "kobold-guide") return "perform the kobold guide consistently as nervous, deferential, and cunning; retain narrator identity for narration";
  if (characterId === "old-lizardman") return "perform the old lizardman consistently as aged, deliberate, dignified, and tribal; retain narrator identity for narration";
  if (characterId === "sickly-kobold-scouts") return "perform the sickly kobold scouts as a frightened, pleading group; retain narrator identity for narration";
  if (characterId === "prophetic-woman") return "perform the prophetic woman as solemn, urgent, and otherworldly; retain narrator identity for narration";
  if (text.includes("'") || text.includes('"')) return "expressive fantasy narration; perform quoted dialogue distinctly while remaining the same narrator";
  return "measured, expressive fantasy narration appropriate to the scene";
};
const addUnit = (block: number, addresses: string[], options: { variant?: string; texts?: string[]; status?: Unit["status"] } = {}) => {
  const selected = addresses.map(address => get(block, address));
  const texts = options.texts ?? selected.map(event => event.rawLiteralText);
  const spokenText = joinText(texts);
  const id = `ecl8-b${block}-${addresses.map(address => address.slice(2)).join("-")}${options.variant ? `-${options.variant}` : ""}`;
  const characterId = characterFor(block, addresses[0]!);
  units.push({ id, block, triggerSourceId: selected[0]!.id, coveredSourceIds: selected.map(event => event.id), sourceTextParts: selected.map((event, index) => ({ sourceId: event.id, rawText: texts[index] ?? "" })), spokenText, status: options.status ?? "ready", characterId, direction: directionFor(spokenText, characterId), ...(options.variant ? { variant: options.variant } : {}) });
  for (const event of selected) eventUnits.set(event.id, [...(eventUnits.get(event.id) ?? []), id]);
};

// Manually traced, unconditional print sequences and explicit branch/state variants.
addUnit(13, ["0x9ab7", "0x9abb"], { status: "unresolved-dynamic" });
addUnit(13, ["0x9ad7", "0x9af2"], { status: "unresolved-dynamic" });
addUnit(13, ["0x9b26", "0x9b50", "0x9b71"]);
// 9c70, 9c9f and 9cca can reach the roof collapse at 9ce1 (#172).
// The damage acknowledgement separates the collapse from the arrival at 9d05 (#241).
addUnit(13, ["0x9ce1"]);
addUnit(13, ["0x9d05"]);
addUnit(13, ["0xa570", "0xa5c5"]);
addUnit(13, ["0xa733", "0xa775", "0xa7cd", "0xa7f8", "0xa802"]);
addUnit(13, ["0xab75", "0xabaa", "0xabb4"]);
addUnit(13, ["0xaf93", "0xafc3"]);
addUnit(13, ["0xb028", "0xb04b", "0xb07b", "0xb0b0"]);
// b467 ends at b49d EXIT. b49e " WHAT DO YOU DO?" is a subroutine thirteen passages call: alone (#173).
addUnit(13, ["0xb512"], { status: "unresolved-dynamic" });

addUnit(16, ["0x9ceb", "0x9e8c", "0x9d14"], { variant: "rubble" });
addUnit(16, ["0x9ceb", "0x9e95", "0x9d14"], { variant: "swamp" });
addUnit(16, ["0xa0cf", "0xa0e1", "0xa0e5"], { status: "unresolved-dynamic" });
addUnit(16, ["0xa217", "0xa287"]);
addUnit(16, ["0xa368", "0xa3f6"]);
addUnit(16, ["0xa7bd", "0xa805"]);
addUnit(16, ["0xa9f2", "0xaa0c"]);
// a9d0 goes on to aa0c too (a9ee GOTO): "DO YOU GO UP?" (#174).
addUnit(16, ["0xa9d0", "0xaa0c"]);

for (const addresses of [
  ["0x9f1c", "0x9f2e"], ["0x9f66", "0x9f81"], ["0x9fb7", "0x9fcc"], ["0xa002", "0xa028"],
  ["0xa0e6", "0xa0ec", "0xa0f0"], ["0xa136", "0xa146", "0xa14a"],
  ["0xa179", "0xa18d", "0xa191", "0xa195", "0xa19b", "0xa19f"],
  ["0xa1b8", "0xa1be", "0xa1c2", "0xa1e9", "0xa1ed"]
]) addUnit(27, addresses, { status: "unresolved-dynamic" });

for (const [direction, address] of [["south", "0x9b07"], ["west", "0x9b0f"], ["north", "0x9b16"], ["east", "0x9b1e"]])
  addUnit(29, ["0x9b25", address, "0x9b44"], { variant: direction });
addUnit(29, ["0x9cf6", "0x9d10"], { status: "unresolved-dynamic" });
addUnit(29, ["0x9e54", "0x9eb2"]);
addUnit(29, ["0xa47a", "0xa48d"], { status: "unresolved-dynamic" });
addUnit(29, ["0xa773", "0xa80e"], { texts: [get(29, "0xa773").rawLiteralText, get(29, "0xa80e").rawLiteralText.replace(/\s*\(WHAT DO YOU DO\?\)\s*$/i, "")] });
addUnit(29, ["0xa8be"], { texts: [get(29, "0xa8be").rawLiteralText.replace(/\s*\(WHAT DO YOU DO\?\)\s*$/i, "")] });
addUnit(29, ["0xaaff", "0xab8a"]);
addUnit(29, ["0xae15", "0xae29", "0xae2d"], { status: "unresolved-dynamic" });

const explicitlyUnvoiced = new Set(["29:0x9da1"]);
const memberIds = new Set(eventUnits.keys());
for (const event of events) {
  if (memberIds.has(event.id) || explicitlyUnvoiced.has(`${event.source.block}:${event.source.address}`)) continue;
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
  if (explicitlyUnvoiced.has(`${event.source.block}:${event.source.address}`)) { classification = "unvoiced-interface"; reason = "generic choice prompt"; }
  else if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "VERTICAL MENU") { classification = "unvoiced-interface"; reason = "choice labels or continue control"; }
  else if (event.source.instruction === "PRINT RETURN" || (!event.rawLiteralText.trim() && !event.outputParts.some(part => part.kind !== "literal"))) { classification = "unvoiced-layout"; reason = "blank/spacing/return control"; }
  else if (unitIds.some(id => units.find(unit => unit.id === id)?.status === "unresolved-dynamic")) { classification = "unresolved-dynamic"; reason = "runtime text must be resolved before generation"; }
  else if (unitIds.length > 1) { classification = "voiced-context-dependent"; reason = "source participates in manually traced variants"; }
  else if (!unitIds.length) { classification = "unvoiced-layout"; reason = "no spoken content"; }
  return { sourceId: event.id, source: event.source, rawLiteralText: event.rawLiteralText, outputParts: event.outputParts, sourceDigest: event.sourceDigest, classification, reason, narrationUnitIds: unitIds };
});
const ready = units.filter(unit => unit.status === "ready");
const unresolved = units.filter(unit => unit.status === "unresolved-dynamic");
const review = { schema: 1, archive: "ECL8.DAX", reviewMethod: "manual prose, display-continuation, and unconditional control-flow sequence review", playback: { trigger: "first covered source event only", continuation: "audio continues across later covered events", queue: "newly reached standalone unit plays after current narration" }, eventCount: classifications.length, narrationUnitCount: units.length, readyUnitCount: ready.length, unresolvedUnitCount: unresolved.length, characters: [
  { id: "kobold-guide", aliases: ["white-flag kobold", "escort kobold"] },
  { id: "samir-ahwahl", aliases: ["efreeti"] },
  { id: "princess-fatima", aliases: ["young woman in barbarian finery", "princess"] },
  { id: "old-lizardman", aliases: ["old lizard man"] },
  { id: "sickly-kobold-scouts", aliases: ["small band of sickly kobolds"] },
  { id: "prophetic-woman", aliases: ["wide-eyed woman"] }
], events: classifications, narrationUnits: units };
writeFileSync(new URL("../src/audio/ecl8-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
for (const block of [13, 16, 27, 29]) {
  const items = ready.filter(unit => unit.block === block).map(unit => ({ id: unit.id, triggerSourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds, output: `audio/voices/narration/ecl8/block-${block}/${unit.id}.mp3`, text: unit.spokenText, direction: unit.direction }));
  writeFileSync(new URL(`../src/audio/ecl8-generation-queue-block-${block}.json`, import.meta.url), `${JSON.stringify({ schema: 1, model: "eleven_v4", archive: "ECL8.DAX", block, items }, null, 2)}\n`);
}
const allClassified = classifications.every(event => event.classification);
if (!allClassified) throw new Error("Unclassified ECL8 event");
console.log(JSON.stringify({ events: classifications.length, units: units.length, ready: ready.length, unresolved: unresolved.length, unvoiced: classifications.filter(event => event.classification.startsWith("unvoiced")).length }, null, 2));
