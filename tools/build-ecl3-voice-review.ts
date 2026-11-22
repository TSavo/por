import { readFileSync, writeFileSync } from "node:fs";

interface Event {
  id: string;
  source: { archive: string; block: number; address: string; instruction: string };
  outputParts: Array<{ kind: string; rawText?: string; address?: string }>;
  rawLiteralText: string;
  sourceDigest: string;
}
interface Extraction { events: Event[] }
interface UnitSpec { key: string; members: string[]; variant?: string; unresolved?: boolean; direction?: string }

const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as Extraction;
const events = extraction.events.filter(event => event.source.archive === "ECL3.DAX");
const eventByKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const get = (key: string) => {
  const event = eventByKey.get(key);
  if (!event) throw new Error(`Missing ECL3 event ${key}`);
  return event;
};
const composites: UnitSpec[] = [
  { key: "b0-9eba-9f1e", members: ["0:0x9eba", "0:0x9f1e"], direction: "Bishop Braccio speaks with formal clerical authority; Dirten is introduced but does not speak" },
  { key: "b0-a0f7-a113", members: ["0:0xa0f7", "0:0xa113"], variant: "poisonous-barren-river" },
  { key: "b0-a0f7-a129", members: ["0:0xa0f7", "0:0xa129"], variant: "beautiful-stojanow-river" },
  { key: "b0-a413-a438", members: ["0:0xa413", "0:0xa438"], unresolved: true, variant: "runtime-tavern-tale-number" },
  // All three temples greet the party and then print the same question at aa13.
  { key: "b0-a078-aa13", members: ["0:0xa078", "0:0xaa13"], direction: "The narrator performs the priests' welcoming question with warm religious formality" },
  { key: "b0-a0d0-aa13", members: ["0:0xa0d0", "0:0xaa13"], direction: "The narrator performs the priestess's welcoming question with warm religious formality" },
  { key: "b0-a9ef-aa13", members: ["0:0xa9ef", "0:0xaa13"], direction: "The narrator performs the priests' welcoming question with warm religious formality" },
  { key: "b0-ac22-ac8a-ac96", members: ["0:0xac22", "0:0xac8a", "0:0xac96"], unresolved: true, variant: "single-runtime-proclamation-number" },
  { key: "b0-ac22-ac9b", members: ["0:0xac22", "0:0xac9b"], variant: "fixed-multiple-proclamations" },
  { key: "b0-ad29-ad6c", members: ["0:0xad29", "0:0xad6c"], direction: "Skullcrusher speaks with firm loyalty before the narrator states his departure" },
  { key: "b8-9e4a-9e68", members: ["8:0x9e4a", "8:0x9e68"], unresolved: true, variant: "runtime-cleared-area-name" },
  { key: "b8-a5c2-a62a", members: ["8:0xa5c2", "8:0xa62a"], direction: "The council clerk shifts from administrative preface into a grave urgent warning" },
  { key: "b8-af96-afec", members: ["8:0xaf96", "8:0xafec"], direction: "Cadorna gives a confidential commission with controlled self-interest" },
  { key: "b8-b088-b0ea", members: ["8:0xb088", "8:0xb0ea"], direction: "Cadorna gives a formal diplomatic order with an explicit warning" },
  { key: "b8-b169-b1fa", members: ["8:0xb169", "8:0xb1fa"], direction: "Urslingen speaks urgently and with solemn confidence in the party" },
  { key: "b8-b2aa-b335", members: ["8:0xb2aa", "8:0xb335"], direction: "The mayor speaks ceremonially on behalf of the full council, building to an earnest appeal" },
  { key: "b11-9eab-9ed8", members: ["11:0x9eab", "11:0x9ebb", "11:0x9ebf", "11:0x9ed4", "11:0x9ed8"], unresolved: true, variant: "runtime-companion-class-and-price" },
  { key: "b11-a00e-a021", members: ["11:0xa00e", "11:0xa01d", "11:0xa021"], unresolved: true, variant: "runtime-training-class" },
  { key: "b14-9b70-9bc4", members: ["14:0x9b70", "14:0x9bc4"], variant: "attack-stopped" },
  { key: "b14-9b70-9c20", members: ["14:0x9b70", "14:0x9c20"], variant: "backstab-and-escape" },
  { key: "b14-9f26-9f2a", members: ["14:0x9f26", "14:0x9f2a"], unresolved: true, variant: "runtime-party-member-name" }
];

const unvoicedKeys = new Set([
  "0:0xa51a", "0:0xa524", "0:0xa528", "0:0xa532"
]);
for (const event of events) {
  if (event.source.instruction.includes("MENU") || !event.rawLiteralText.trim())
    unvoicedKeys.add(`${event.source.block}:${event.source.address}`);
}
const compositeMembership = new Map<string, UnitSpec[]>();
for (const spec of composites) for (const member of spec.members) {
  const list = compositeMembership.get(member) ?? [];
  list.push(spec);
  compositeMembership.set(member, list);
}
const normalize = (text: string) => text.replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
const defaultDirection = (text: string, block: number) => {
  if (block === 8) return "Measured civic fantasy narration; perform quoted council speech with formal authority while preserving the narrator identity";
  if (/['"]|\bSPEAKS\b|\bSAYS\b|\bTELLS\b/.test(text)) return "Measured fantasy narration with a clear same-narrator character performance for quoted speech";
  if (/ATTACK|AMBUSH|POISON|TRAP|GAS|DAMAGE|BRAWL|BLADE|DART|NEEDLE/.test(text)) return "Urgent dramatic fantasy narration with clear action and danger";
  if (/DO YOU|WHAT DO|WHICH|WILL YOU|WOULD YOU|HOW WILL/.test(text)) return "Clear measured fantasy narration, ending with a direct question";
  return "Measured expressive fantasy narration appropriate to the scene";
};

const units: Array<Record<string, unknown>> = [];
for (const spec of composites) {
  const sourceEvents = spec.members.map(get);
  const rawSourceTexts = sourceEvents.map(event => ({ sourceId: event.id, rawText: event.rawLiteralText, outputParts: event.outputParts }));
  const literalText = normalize(sourceEvents.map(event => event.rawLiteralText).join(""));
  units.push({
    id: `por.voice.ecl3.${spec.key}`,
    triggerSourceId: sourceEvents[0]!.id,
    coveredSourceIds: sourceEvents.map(event => event.id),
    variant: spec.variant ?? null,
    rawSourceTexts,
    spokenText: literalText,
    direction: spec.direction ?? defaultDirection(literalText, sourceEvents[0]!.source.block),
    status: spec.unresolved ? "unresolved-dynamic-template" : "qa-resolved",
    generationEligible: !spec.unresolved
  });
}
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  if (unvoicedKeys.has(key) || compositeMembership.has(key)) continue;
  const hasDynamic = event.outputParts.some(part => part.kind !== "literal");
  const text = normalize(event.rawLiteralText);
  units.push({
    id: `por.voice.ecl3.b${event.source.block}-${event.source.address.slice(2)}`,
    triggerSourceId: event.id,
    coveredSourceIds: [event.id],
    variant: null,
    rawSourceTexts: [{ sourceId: event.id, rawText: event.rawLiteralText, outputParts: event.outputParts }],
    spokenText: text,
    direction: defaultDirection(text, event.source.block),
    status: hasDynamic ? "unresolved-dynamic-template" : "qa-resolved",
    generationEligible: !hasDynamic
  });
}
const unitsBySource = new Map<string, Array<Record<string, unknown>>>();
for (const unit of units) for (const sourceId of unit.coveredSourceIds as string[]) {
  const list = unitsBySource.get(sourceId) ?? [];
  list.push(unit);
  unitsBySource.set(sourceId, list);
}
const eventReviews = events.map(event => {
  const key = `${event.source.block}:${event.source.address}`;
  const memberships = unitsBySource.get(event.id) ?? [];
  let classification = "voiced-standalone";
  if (unvoicedKeys.has(key)) classification = event.source.instruction.includes("MENU") ? "unvoiced-interface" : !event.rawLiteralText.trim() ? "unvoiced-layout" : "unvoiced-routine-interface";
  else if (memberships.length > 0) {
    const unresolvedCount = memberships.filter(unit => unit.status === "unresolved-dynamic-template").length;
    classification = unresolvedCount === memberships.length ? "unresolved-dynamic-template" :
      unresolvedCount > 0 ? "mixed-resolved-and-dynamic-variant-member" :
      memberships.length > 1 ? "voiced-variant-member" :
      (unitTrigger(memberships[0]!, event.id) ? "voiced-unit-trigger" : "voiced-unit-continuation");
  }
  return { sourceId: event.id, source: event.source, rawText: event.rawLiteralText, outputParts: event.outputParts,
    classification, unitIds: memberships.map(unit => unit.id), sourceDigest: event.sourceDigest };
});
function unitTrigger(unit: Record<string, unknown>, sourceId: string) { return unit.triggerSourceId === sourceId; }

const review = {
  schema: 1,
  scope: { archive: "ECL3.DAX", extractedEventCount: events.length },
  policy: { manuallyQaReviewed: true, adjacencyNeverImpliesCombination: true, exactSourceTextPreserved: true,
    dynamicTemplatesExcludedFromGeneration: true, audioAttachesToTriggerOnly: true },
  counts: {
    events: events.length,
    units: units.length,
    generationEligibleUnits: units.filter(unit => unit.generationEligible).length,
    unresolvedUnits: units.filter(unit => !unit.generationEligible).length,
    unvoicedEvents: eventReviews.filter(event => event.classification.startsWith("unvoiced-")).length
  },
  events: eventReviews,
  units
};
writeFileSync(new URL("../src/audio/ecl3-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);

const eligible = units.filter(unit => unit.generationEligible) as Array<Record<string, unknown>>;
const chunkSize = 40;
for (let index = 0; index < eligible.length; index += chunkSize) {
  const chunk = eligible.slice(index, index + chunkSize);
  const number = String(index / chunkSize + 1).padStart(2, "0");
  const queue = { model: "eleven_v4", sourceReview: "src/audio/ecl3-voice-review.json", items: chunk.map(unit => ({
    unitId: unit.id,
    triggerSourceId: unit.triggerSourceId,
    coveredSourceIds: unit.coveredSourceIds,
    output: `audio/voices/narration/ecl3/${String(unit.id).replace("por.voice.ecl3.", "")}.mp3`,
    text: unit.spokenText,
    direction: unit.direction
  })) };
  writeFileSync(new URL(`../src/audio/ecl3-generation-queue-${number}.json`, import.meta.url), `${JSON.stringify(queue, null, 2)}\n`);
}
console.log(JSON.stringify(review.counts));
