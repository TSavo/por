import { readFileSync, writeFileSync } from "node:fs";

interface Event {
  id: string;
  source: { archive: string; block: number; address: string; instruction: string };
  outputParts: Array<{ operandIndex: number; kind: string; rawText?: string; address?: string }>;
  rawLiteralText: string;
  sourceDigest: string;
}
interface Extraction { events: Event[] }
interface UnitSpec { key: string; members: string[]; variant?: string; unresolved?: boolean; direction?: string; spokenText?: string }

const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as Extraction;
const events = extraction.events.filter(event => event.source.archive === "ECL5.DAX");
const eventByKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const get = (key: string) => {
  const event = eventByKey.get(key);
  if (!event) throw new Error(`Missing ECL5 event ${key}`);
  return event;
};
const composites: UnitSpec[] = [
  { key: "b3-9cb7-9cbb", members: ["3:0x9cb7", "3:0x9cbb"], unresolved: true, variant: "runtime-surprising-actor" },
  { key: "b3-9d1f-9d3b", members: ["3:0x9d1f", "3:0x9d29", "3:0x9d3b"], unresolved: true, variant: "runtime-group-sacrilegious-scum" },
  { key: "b3-9d1f-9d6e", members: ["3:0x9d1f", "3:0x9d29", "3:0x9d6e"], unresolved: true, variant: "runtime-group-intruders" },
  { key: "b3-9de2-9dec", members: ["3:0x9de2", "3:0x9dec"], unresolved: true, variant: "runtime-group-sighting" },
  { key: "b3-9f06-9f24", members: ["3:0x9f06", "3:0x9f24"], direction: "The same guard speaks both halves with formal suspicion" },
  { key: "b3-ae2b-ae5b", members: ["3:0xae2b", "3:0xae5b"], direction: "Underwater discovery, building from strained searching to sudden triumph" },
  { key: "b3-af19-af40", members: ["3:0xaf19", "3:0xaf40"], variant: "surface-gasping", direction: "Urgent breathless narration, resolving in relief" },
  { key: "b3-af19-af65", members: ["3:0xaf19", "3:0xaf65"], variant: "surface-swallowing-water", direction: "Urgent breathless narration, ending in choking danger" },

  { key: "b4-9c0c-9c10", members: ["4:0x9c0c", "4:0x9c10"], unresolved: true, variant: "runtime-surprising-actor" },
  { key: "b4-9c74-9c90", members: ["4:0x9c74", "4:0x9c7e", "4:0x9c90"], unresolved: true, variant: "runtime-group-sacrilegious-scum" },
  { key: "b4-9c74-9cc3", members: ["4:0x9c74", "4:0x9c7e", "4:0x9cc3"], unresolved: true, variant: "runtime-group-intruders" },
  { key: "b4-9d37-9d41", members: ["4:0x9d37", "4:0x9d41"], unresolved: true, variant: "runtime-group-sighting" },
  { key: "b4-9e5d-9e7b", members: ["4:0x9e5d", "4:0x9e7b"], direction: "The same guard speaks both halves with formal suspicion" },
  { key: "b4-a2b5-a304", members: ["4:0xa2b5", "4:0xa304"], direction: "Disgusted room description continuing into the giants' reveal" },
  { key: "b4-a547-a559", members: ["4:0xa547", "4:0xa559"], direction: "The giant's angry warning flows directly into the narrator's combat movement" },
  { key: "b4-a866-a8d3", members: ["4:0xa866", "4:0xa8d3"], direction: "The freed slave speaks with tearful gratitude across the page break; same character throughout" },
  { key: "b4-ae2a-ae7f", members: ["4:0xae2a", "4:0xae7f"], direction: "Measured discovery followed by the ominous Tyranthraxus signature" },
  { key: "b4-af30-af51", members: ["4:0xaf30", "4:0xaf51"], direction: "Measured room description ending with a direct question" },
  { key: "b4-b014-b087", members: ["4:0xb014", "4:0xb087"], direction: "Continuous analytical narration, growing in alarm at Tyranthraxus's expanding power" },

  { key: "b5-a4be-a540", members: ["5:0xa4be", "5:0xa540"], direction: "Comic giant argument; keep the largest giant's blunt, confused character consistent" },

  { key: "b6-9e28-9e4f", members: ["6:0x9e28", "6:0x9e4f"], direction: "The half-orc woman reassures the party softly while the disguise is fitted" },
  { key: "b6-9fce-9ff9", members: ["6:0x9fce", "6:0x9ff9"], direction: "One continuous smithy description" },
  { key: "b6-a558-a55c", members: ["6:0xa558", "6:0xa55c"], unresolved: true, variant: "runtime-party-member-doubles-in-agony" },
  { key: "b6-a758-a77d", members: ["6:0xa758", "6:0xa77d"], direction: "One continuous ominous altar description" },
  { key: "b6-a90c-a910", members: ["6:0xa90c", "6:0xa910"], unresolved: true, variant: "runtime-surprising-actor" },
  { key: "b6-a974-a990", members: ["6:0xa974", "6:0xa97e", "6:0xa990"], unresolved: true, variant: "runtime-group-sacrilegious-scum" },
  { key: "b6-a974-a9c3", members: ["6:0xa974", "6:0xa97e", "6:0xa9c3"], unresolved: true, variant: "runtime-group-intruders" },
  { key: "b6-aa37-aa41", members: ["6:0xaa37", "6:0xaa41"], unresolved: true, variant: "runtime-group-sighting" },

  { key: "b7-9b74-9ba0", members: ["7:0x9b74", "7:0x9ba0"], variant: "secret-door-ahead" },
  { key: "b7-9b74-9bb0", members: ["7:0x9b74", "7:0x9bb0"], variant: "secret-door-left" },
  { key: "b7-9b74-9bbe", members: ["7:0x9b74", "7:0x9bbe"], variant: "secret-door-behind" },
  { key: "b7-9b74-9bcb", members: ["7:0x9b74", "7:0x9bcb"], variant: "secret-door-right" },
  { key: "b7-9c69-9c81", members: ["7:0x9c69", "7:0x9c7d", "7:0x9c81"], unresolved: true, variant: "runtime-party-member-warns-of-statues" },
  { key: "b7-9cd0-9cfc", members: ["7:0x9cd0", "7:0x9ce5", "7:0x9ce9", "7:0x9cfc"], unresolved: true, variant: "runtime-party-member-petrified-and-trapdoor-question" },
  { key: "b7-9e74-9eed", members: ["7:0x9e74", "7:0x9eba", "7:0x9eed"], direction: "One continuous room and messenger introduction" },
  { key: "b7-a0e9-a144", members: ["7:0xa0e9", "7:0xa144"], direction: "One continuous wealthy apartment and robed man introduction" },
  { key: "b7-a25c-a2ea", members: ["7:0xa25c", "7:0xa2ea"], direction: "The frightened robed man continues the same desperate bargain across the page break" },
  { key: "b7-a463-a4dd", members: ["7:0xa463", "7:0xa4dd"], direction: "Grand ominous throne-room reveal, building from ruined hall to fiery dragon" },
  { key: "b7-a63a-a6a7", members: ["7:0xa63a", "7:0xa6a7"], direction: "Tyranthraxus speaks with ancient, controlled menace and seductive authority throughout" },
  { key: "b7-a738-a73c", members: ["7:0xa738", "7:0xa73c"], unresolved: true, variant: "runtime-party-member-vote" },
  { key: "b7-a82d-a8b2", members: ["7:0xa82d", "7:0xa8b2"], direction: "Concluding narration moving from wary escape into relief" }
];

const unvoiced = new Set<string>();
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "PRINT RETURN" || !event.rawLiteralText.trim()) unvoiced.add(key);
}
unvoiced.add("4:0xa7a7");

const partialMenuSpecs: UnitSpec[] = [];
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  if (event.source.instruction === "ENCOUNTER MENU") {
    for (const part of event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim())) {
      partialMenuSpecs.push({ key: `b${event.source.block}-${event.source.address.slice(2)}-operand-${part.operandIndex}`,
        members: [key], variant: `menu-operand-${part.operandIndex}`, spokenText: part.rawText });
    }
    if (!event.outputParts.some(part => part.rawText?.trim())) unvoiced.add(key);
  }
}
for (const key of ["3:0xa8d0", "5:0xa098", "4:0xb1cf"]) {
  const event = get(key);
  const prompt = event.outputParts.find(part => part.operandIndex === 1)?.rawText;
  if (!prompt) throw new Error(`Missing narrative vertical-menu prompt ${key}`);
  partialMenuSpecs.push({ key: `b${event.source.block}-${event.source.address.slice(2)}-prompt`, members: [key], variant: "narrative-menu-prompt", spokenText: prompt });
}

const allSpecs = [...composites, ...partialMenuSpecs];
const membership = new Map<string, UnitSpec[]>();
for (const spec of allSpecs) for (const member of spec.members) {
  const list = membership.get(member) ?? [];
  list.push(spec);
  membership.set(member, list);
}
const normalize = (text: string) => text.replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
const defaultDirection = (text: string) => {
  if (/['"]|\bSAYS\b|\bYELLS\b|\bSHOUTS\b|\bWHISPERS\b/.test(text)) return "Expressive fantasy narration with a clear same-narrator character performance for quoted speech";
  if (/ATTACK|CHARGE|KILL|ALARM|FIREBALL|BOULDER|DIE|DANGER/.test(text)) return "Urgent dramatic fantasy narration with clear danger and action";
  if (/DO YOU|WHAT DO|WILL YOU|WHO SENT|PASSWORD|HOW DO YOU/.test(text)) return "Clear measured fantasy narration ending with a direct question";
  return "Measured expressive fantasy narration appropriate to the scene";
};
const units: Array<Record<string, unknown>> = [];
for (const spec of allSpecs) {
  const sourceEvents = spec.members.map(get);
  const text = normalize(spec.spokenText ?? sourceEvents.map(event => event.rawLiteralText).join(""));
  units.push({ id: `por.voice.ecl5.${spec.key}`, triggerSourceId: sourceEvents[0]!.id,
    coveredSourceIds: sourceEvents.map(event => event.id), variant: spec.variant ?? null,
    rawSourceTexts: sourceEvents.map(event => ({ sourceId: event.id, rawText: event.rawLiteralText, outputParts: event.outputParts })),
    spokenText: text, direction: spec.direction ?? defaultDirection(text),
    status: spec.unresolved ? "unresolved-dynamic-template" : "qa-resolved", generationEligible: !spec.unresolved });
}
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  if (unvoiced.has(key) || membership.has(key) || event.source.instruction.includes("MENU")) continue;
  const dynamic = event.outputParts.some(part => part.kind !== "literal");
  const text = normalize(event.rawLiteralText);
  units.push({ id: `por.voice.ecl5.b${event.source.block}-${event.source.address.slice(2)}`, triggerSourceId: event.id,
    coveredSourceIds: [event.id], variant: null,
    rawSourceTexts: [{ sourceId: event.id, rawText: event.rawLiteralText, outputParts: event.outputParts }],
    spokenText: text, direction: defaultDirection(text), status: dynamic ? "unresolved-dynamic-template" : "qa-resolved", generationEligible: !dynamic });
}
const unitsBySource = new Map<string, Array<Record<string, unknown>>>();
for (const unit of units) for (const sourceId of unit.coveredSourceIds as string[]) {
  const list = unitsBySource.get(sourceId) ?? []; list.push(unit); unitsBySource.set(sourceId, list);
}
const reviews = events.map(event => {
  const key = `${event.source.block}:${event.source.address}`;
  const linked = unitsBySource.get(event.id) ?? [];
  let classification = "voiced-standalone";
  if (unvoiced.has(key)) classification = !event.rawLiteralText.trim() ? "unvoiced-layout" : "unvoiced-interface";
  else if (linked.length) {
    const unresolvedCount = linked.filter(unit => unit.status === "unresolved-dynamic-template").length;
    classification = unresolvedCount === linked.length ? "unresolved-dynamic-template" : unresolvedCount ? "mixed-resolved-and-dynamic-variant-member" :
      linked.length > 1 ? "voiced-variant-member" : linked[0]!.triggerSourceId === event.id ? "voiced-unit-trigger" : "voiced-unit-continuation";
  }
  return { sourceId: event.id, source: event.source, rawText: event.rawLiteralText, outputParts: event.outputParts,
    classification, unitIds: linked.map(unit => unit.id), sourceDigest: event.sourceDigest };
});
const review = { schema: 1, scope: { archive: "ECL5.DAX", extractedEventCount: events.length },
  policy: { manuallyQaReviewed: true, unconditionalDisplaySequencesJoined: true, adjacencyNeverImpliesCombination: true,
    exactSourceTextPreserved: true, dynamicTemplatesExcludedFromGeneration: true, audioAttachesToTriggerOnly: true },
  counts: { events: events.length, units: units.length, generationEligibleUnits: units.filter(unit => unit.generationEligible).length,
    unresolvedUnits: units.filter(unit => !unit.generationEligible).length,
    unvoicedEvents: reviews.filter(event => event.classification.startsWith("unvoiced-")).length },
  events: reviews, units };
writeFileSync(new URL("../src/audio/ecl5-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
const eligible = units.filter(unit => unit.generationEligible) as Array<Record<string, unknown>>;
for (let index = 0; index < eligible.length; index += 40) {
  const number = String(index / 40 + 1).padStart(2, "0");
  const queue = { model: "eleven_v4", sourceReview: "src/audio/ecl5-voice-review.json", items: eligible.slice(index, index + 40).map(unit => ({
    unitId: unit.id, triggerSourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds,
    output: `audio/voices/narration/ecl5/${String(unit.id).replace("por.voice.ecl5.", "")}.mp3`, text: unit.spokenText, direction: unit.direction })) };
  writeFileSync(new URL(`../src/audio/ecl5-generation-queue-${number}.json`, import.meta.url), `${JSON.stringify(queue, null, 2)}\n`);
}
console.log(JSON.stringify(review.counts));
