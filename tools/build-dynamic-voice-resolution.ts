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
const unitById = new Map(reviews.flatMap(({ units }) => units.map(unit => [String(unit.id ?? unit.unitId), unit])));
const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const valuesByUnit: Record<string, Array<{ value: string; condition: string; text: string }>> = {
  "por.voice.ecl3.b0-a413-a438": (resolvedUnitVariants["por.voice.ecl3.b0-a413-a438"] ?? []).map((text, index) => ({ value: String(index + 1), condition: `0x6e7e == ${index + 1}`, text })),
  "por.voice.ecl3.b0-ac22-ac8a-ac96": (resolvedUnitVariants["por.voice.ecl3.b0-ac22-ac8a-ac96"] ?? []).map((text, index) => ({ value: ["CI.", "CXXVI AND CX.", "CXXXIV.", "CLIV.", "CXIV.", "CCIV.", "CXXIX.", "CCI."][index]!, condition: `0x985e == ${JSON.stringify(["CI.", "CXXVI AND CX.", "CXXXIV.", "CLIV.", "CXIV.", "CCIV.", "CXXIX.", "CCI."][index])}`, text })),
  "por.voice.ecl3.b8-9e4a-9e68": (resolvedUnitVariants["por.voice.ecl3.b8-9e4a-9e68"] ?? []).map((text, index) => ({ value: ["LIBRARY.'", "PODAL PLAZA.'", "CADORNA TEXTILE HOUSE.'"][index]!, condition: `0x9890 == ${JSON.stringify(["LIBRARY.'", "PODAL PLAZA.'", "CADORNA TEXTILE HOUSE.'"][index])}`, text })),
  "por.voice.ecl3.b11-a00e-a021": (resolvedUnitVariants["por.voice.ecl3.b11-a00e-a021"] ?? []).map((text, index) => ({ value: ["FIGHTERS ", "THIEVES "][index]!, condition: `0x982c == ${JSON.stringify(["FIGHTERS ", "THIEVES "][index])}`, text })),
  "por.voice.ecl3.b11-9eab-9ed8": (resolvedUnitVariants["por.voice.ecl3.b11-9eab-9ed8"] ?? []).map((text, index) => ({ value: ["ACOLYTE", "WARRIOR", "EVOKER", "SWORDSMAN", "ROBBER", "CURATE", "HERO", "THEURGIST"][index]!, condition: `companion candidate index 0x6e7a == ${index}`, text }))
};

const finiteSlotValuesByScope: Record<string, string[]> = {
  "ECL2.DAX:block-20:0x9890": [" KOBOLDS. ", " GOBLINS. ", " ORCS. "],
  "ECL4.DAX:block-10:0x982c": ["THE SPECTRE HAS NOTICED YOU.", " SKELETONS.", " ZOMBIES.", " WIGHTS."],
  "ECL5.DAX:block-3:0x980e": ["A PATROL OF GIANTS LED BY A HUMAN FIGHTER"],
  "ECL5.DAX:block-4:0x980e": ["A PATROL OF GIANTS LED BY A HUMAN FIGHTER"],
  "ECL5.DAX:block-6:0x980e": ["A PATROL OF GIANTS LED BY A HUMAN FIGHTER"],
  "ECL6.DAX:block-25:0x982c": ["QUICKLINGS", "WILD BOARS", "GIANT MANTIS", "TIGERS", "THRI-KREENS", "ANHKHEG", "CENTAURS", "SOLDIERS", "THIEVES", "BUCCANEERS", "GIANT SNAKES"],
  "ECL7.DAX:block-22:0x9809": [" A BAND OF HUMAN FIGHTERS.", " DISPLACER BEASTS.", " DWARVEN FIGHTERS.", " A TRIO OF LIZARD MEN.", " VISCIOUS LOOKING DRIDERS.", " SOME GAUNT MEN IN POORLY FITTING LEATHER.", " LARGE INSECTS WITH RUSTY RED FEATHERS.", " SOME LARGE BULL HEADED MEN.", " A GROUP OF EMACIATED ELVES.", " SOME HUNGRY LOOKING KOBOLDS."],
  "ECL7.DAX:block-26:0x982c": ["KOBOLDS", "DISPLACER BEASTS", "DRIDERS", "STIRGES", "LIZARD MEN", "BANDITS", "NOMADS", "MERCHANTS"],
  "ECL8.DAX:block-27:0x982c": ["KOBOLDS", "GNOLLS", "LIZARD MEN", "GIANT LIZARDS", "HIPPOGRIFFS", "WYVERNS", "TROLLS", "PHASE SPIDERS", "MINOTAURS"],
  "ECL8.DAX:block-29:0x9890": ["GNOLLS ", "KOBOLDS. ", "LIZARDMEN. "]
};

const sourceParts = (unit: Unit) => {
  const embedded = unit.rawSourceTexts ?? unit.sourceTextParts ?? unit.sourceTexts ?? [];
  return (unit.coveredSourceIds ?? []).map(sourceId => {
    const match = embedded.find(source => String((source as Record<string, unknown>).sourceId) === sourceId);
    const parts = match?.outputParts ?? extracted.get(sourceId) ?? [];
    return parts;
  });
};
const unitBlock = (unit: Unit) => /\.block-(\d+)\./.exec(String(unit.triggerSourceId))?.[1] ?? /\.b(\d+)-/.exec(String(unit.id ?? unit.unitId))?.[1] ?? "unknown";
for (const dynamic of unresolved) {
  if (valuesByUnit[dynamic.unitId]) continue;
  const unit = unitById.get(dynamic.unitId);
  if (!unit) continue;
  const dynamicParts = sourceParts(unit).flat().filter(part => part.kind !== "literal");
  if (dynamicParts.length < 1 || !dynamicParts[0]?.address || dynamicParts.some(part => part.address !== dynamicParts[0]!.address)) continue;
  const values = finiteSlotValuesByScope[`${dynamic.archive}:block-${unitBlock(unit)}:${dynamicParts[0].address}`];
  if (!values) continue;
  valuesByUnit[dynamic.unitId] = values.map(value => {
    const segments = sourceParts(unit).flatMap(parts => parts.map(part => part.kind === "literal" ? String((part as Part & { rawText?: string }).rawText ?? "") : value));
    let text = "";
    for (const segment of segments) {
      if (text && segment && /[A-Za-z0-9.!?,;:'\"]$/.test(text) && /^[A-Za-z0-9'\"]/.test(segment)) text += " ";
      text += segment;
    }
    text = text.replace(/\s+/g, " ").trim();
    return { value, condition: `${dynamicParts[0]!.address} == ${JSON.stringify(value)}`, text };
  });
}
const generationItems = Object.entries(valuesByUnit).flatMap(([unitId, variants]) => {
  const source = unitById.get(unitId);
  if (!source) throw new Error(`Missing reviewed unit ${unitId}`);
  const triggerSourceId = String(source.triggerSourceId);
  const coveredSourceIds = (source.coveredSourceIds ?? []).map(String);
  const direction = String(source.direction ?? "measured, expressive fantasy narration appropriate to the scene");
  return variants.map(({ value, condition, text }, index) => ({
    id: `${unitId}.variant-${String(index + 1).padStart(2, "0")}-${slug(value)}`,
    sourceUnitId: unitId,
    triggerSourceId,
    coveredSourceIds,
    condition,
    dynamicValue: value,
    output: `../por-assets/voices/narration/dynamic-resolved/${unitId.replace(/^por\.voice\./, "").replace(/\./g, "-")}-v${String(index + 1).padStart(2, "0")}-${slug(value)}.mp3`,
    text,
    direction
  }));
});
const manifest = {
  schema: 1,
  policy: "No dynamic value is guessed. Values are either proven from local ECL assignments, runtime-only, or left for encounter-table tracing.",
  unresolvedUnitCountBeforeTrace: unresolved.length,
  unitsResolvedToFiniteVariants: Object.keys(valuesByUnit).length,
  unitsStillRuntimeDependent: unresolved.filter(unit => !valuesByUnit[unit.unitId]).length,
  slotSemantics,
  resolvedUnitVariants,
  resolvedVariantRecords: valuesByUnit,
  newlyQueueableVariantCount: generationItems.length,
  finiteSlotValuesByScope,
  units: unresolved.map(unit => ({ ...unit, resolution: valuesByUnit[unit.unitId] ? "finite-variants-proven" : "withheld-pending-runtime-resolution" }))
};
writeFileSync(new URL("../src/audio/dynamic-voice-resolution.json", import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(new URL("../src/audio/dynamic-resolved-generation-queue.json", import.meta.url), `${JSON.stringify({
  schema: 1,
  model: "eleven_v4",
  sourceResolution: "src/audio/dynamic-voice-resolution.json",
  itemCount: generationItems.length,
  items: generationItems
}, null, 2)}\n`);
console.log(`traced ${unresolved.length} dynamic units; resolved ${Object.keys(valuesByUnit).length} families to ${generationItems.length} finite variants`);
