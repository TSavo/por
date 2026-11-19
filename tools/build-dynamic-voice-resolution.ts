import { readFileSync, writeFileSync } from "node:fs";

type Part = { kind?: string; address?: string; value?: number };
type Unit = Record<string, unknown> & { id?: string; unitId?: string; status?: string; reviewStatus?: string; rawSourceTexts?: Array<{ outputParts?: Part[] }>; sourceTextParts?: Array<{ outputParts?: Part[] }>; sourceTexts?: Array<{ outputParts?: Part[] }>; coveredSourceIds?: string[] };
const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as { events: Array<{ id: string; outputParts: Part[] }> };
const extracted = new Map(extraction.events.map(event => [event.id, event.outputParts]));
const reviews = Array.from({ length: 8 }, (_, index) => {
  const archive = index + 1;
  const review = JSON.parse(readFileSync(new URL(`../src/audio/ecl${archive}-voice-review.json`, import.meta.url), "utf8")) as { units?: Unit[]; narrationUnits?: Unit[] };
  return { archive, units: review.units ?? review.narrationUnits ?? [] };
});
const unresolved = reviews.flatMap(({ archive, units }) => units.flatMap(unit => {
  const status = String(unit.status ?? unit.reviewStatus ?? "");
  if (!/(unresolved|runtime-template|requires-runtime)/.test(status)) return [];
  const embedded = (unit.rawSourceTexts ?? unit.sourceTextParts ?? unit.sourceTexts ?? []).flatMap(source => source.outputParts ?? []);
  const fallback = (unit.coveredSourceIds ?? []).flatMap(id => extracted.get(id) ?? []);
  const slots = [...embedded, ...fallback].filter((part, index, all) => part.kind !== "literal" && all.findIndex(other => JSON.stringify(other) === JSON.stringify(part)) === index);
  return [{ archive: `ECL${archive}.DAX`, unitId: String(unit.id ?? unit.unitId), status, variant: unit.variant ?? null, slots }];
}));

const slotSemantics = {
  "0x6b00": { meaning: "selected party-member name", resolution: "runtime-only", reason: "Value comes from the player's save roster; the possible spelling is not bounded by original game data.", strategy: "Keep withheld unless runtime synthesis or recorded generic fallback is explicitly approved." },
  "0x6e79": { meaning: "player-entered input string in the unresolved voice unit", resolution: "runtime-only", reason: "For the affected unit it is the six-character password just typed by the player.", strategy: "Keep confirmation unvoiced or use runtime synthesis; never pre-render guessed inputs." },
  "0x6e7e": { meaning: "random tavern-tale number", resolution: "enumerated", values: Array.from({ length: 24 }, (_, index) => String(index + 1)), evidence: "RANDOM 23 followed by ADD 1 before PRINT." },
  "0x985e": { meaning: "single proclamation number text", resolution: "enumerated", values: ["CI.", "CXXVI AND CX.", "CXXXIV.", "CLIV.", "CXIV.", "CCIV.", "CXXIX.", "CCI."], evidence: "Nine ON GOSUB targets assign these strings; CXIV occurs twice." },
  "0x980e": { meaning: "runtime encounter actor name", resolution: "encounter-table-dependent", strategy: "Enumerate from the encounter's monster table and grammatical-number metadata before rendering." },
  "0x980f": { meaning: "runtime encounter group name", resolution: "encounter-table-dependent", strategy: "Enumerate from the encounter's monster table before rendering." },
  "0x9809": { meaning: "runtime encounter group name", resolution: "encounter-table-dependent", strategy: "Enumerate from the block's wilderness encounter table before rendering." },
  "0x982c": { meaning: "context-dependent composed string, commonly monster/group/class text", resolution: "context-dependent", strategy: "Trace the local SAVE/GET TABLE chain per unit; do not apply one global value list." },
  "0x9890": { meaning: "context-dependent composed string, commonly area/group/reward text", resolution: "context-dependent", strategy: "Trace the local SAVE chain per unit; do not apply one global value list." }
};

const resolvedUnitVariants = {
  "por.voice.ecl3.b0-a413-a438": Array.from({ length: 24 }, (_, index) => `YOU OVERHEAR TAVERN TALE ${index + 1}`),
  "por.voice.ecl3.b0-ac22-ac8a-ac96": ["CI.", "CXXVI AND CX.", "CXXXIV.", "CLIV.", "CXIV.", "CCIV.", "CXXIX.", "CCI."].map(value => `PROCLAMATIONS ARE POSTED ON THE WALLS, IN YOUR JOURNAL YOU NOTE PROCLAMATION${value}`),
  "por.voice.ecl3.b8-9e4a-9e68": ["LIBRARY.'", "PODAL PLAZA.'", "CADORNA TEXTILE HOUSE.'"].map(value => `'THERE IS A REWARD FOR CLEARING THE ${value}`),
  "por.voice.ecl3.b11-a00e-a021": ["'WE TRAIN ONLY FIGHTERS HERE. DO YOU WANT TO TRAIN?'", "'WE TRAIN ONLY THIEVES HERE. DO YOU WANT TO TRAIN?'"],
  "por.voice.ecl3.b11-9eab-9ed8": [
    "'THERE IS A FINE ACOLYTE WHO WILL JOIN YOU FOR 1 SHARE. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE WARRIOR WHO WILL JOIN YOU FOR 1 SHARE. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE EVOKER WHO WILL JOIN YOU FOR 2 SHARES. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE SWORDSMAN WHO WILL JOIN YOU FOR 3 SHARES PLUS A PICK OF SPECIAL ITEMS. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE ROBBER WHO WILL JOIN YOU FOR 3 SHARES PLUS A PICK OF SPECIAL ITEMS. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE CURATE WHO WILL JOIN YOU FOR 3 SHARES PLUS A PICK OF SPECIAL ITEMS. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE HERO WHO WILL JOIN YOU FOR 4 SHARES PLUS A PICK OF SPECIAL ITEMS. IS THIS ACCEPTABLE?'",
    "'THERE IS A FINE THEURGIST WHO WILL JOIN YOU FOR 4 SHARES PLUS A PICK OF SPECIAL ITEMS. IS THIS ACCEPTABLE?'"
  ]
};

const resolvedIds = new Set(Object.keys(resolvedUnitVariants));
const manifest = {
  schema: 1,
  policy: "No dynamic value is guessed. Values are either proven from local ECL assignments, runtime-only, or left for encounter-table tracing.",
  unresolvedUnitCountBeforeTrace: unresolved.length,
  unitsResolvedToFiniteVariants: resolvedIds.size,
  unitsStillRuntimeDependent: unresolved.filter(unit => !resolvedIds.has(unit.unitId)).length,
  slotSemantics,
  resolvedUnitVariants,
  units: unresolved.map(unit => ({ ...unit, resolution: resolvedIds.has(unit.unitId) ? "finite-variants-proven" : "withheld-pending-runtime-resolution" }))
};
writeFileSync(new URL("../src/audio/dynamic-voice-resolution.json", import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`traced ${unresolved.length} dynamic units; resolved ${resolvedIds.size} to finite variants`);
