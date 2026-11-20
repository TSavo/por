import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { parseDax } from "../src/lib/dax.js";
import { readInstruction, scriptFromBlock } from "../src/lib/ecl.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

type Part = { kind?: string; address?: string; value?: number; rawText?: string };
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
  "0x6b00": { meaning: "selected party-member name", resolution: "recorded-replacement", strategy: "Show the original name and use generic recorded narration." },
  "0x6e79": { meaning: "typed password or computed enemy count, depending on the ECL instruction", resolution: "recorded-replacement", strategy: "Preserve the original password or count on screen. Speak a generic confirmation or a creature-specific encounter line." },
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
const tracedSlots: Record<string, string[]> = {};
const tracedUnits = new Set<string>();
const audio = new URL("../src/audio/", import.meta.url);
const staticallyQueued = new Set(readdirSync(audio).filter(name => /^static-resolved-generation-queue.*\.json$/i.test(name))
  .flatMap(name => (JSON.parse(readFileSync(new URL(name, audio), "utf8")) as { items: Array<{ id?: string; unitId?: string; sharedWith?: string[] }> }).items
    .flatMap(item => [item.id ?? item.unitId, ...(item.sharedWith ?? [])])));

const gameRoot = findGameRoot(process.argv[2]);
if (!gameRoot) throw new Error("Supply the original game files or set POR_GAMEDATA");
const archives = new Map(listGameFiles(gameRoot).filter(name => /^ECL\d+\.DAX$/i.test(name)).map(name => [
  name.toUpperCase(), parseDax(name, readGameFile(gameRoot, name)).entries
]));
const script = (archive: number, block: number) => {
  const entry = archives.get(`ECL${archive}.DAX`)?.find(entry => entry.id === block);
  if (!entry) throw new Error(`ECL${archive}.DAX is missing block ${block}`);
  return scriptFromBlock(entry.data);
};
const savedStrings = (archive: number, block: number, slot: number, addresses: number[]) => {
  const data = script(archive, block);
  return [...new Set(addresses.map(address => {
    const instruction = readInstruction(data, address);
    const [value, destination] = instruction.operands;
    if (instruction.name !== "SAVE" || value?.text == null || destination?.code !== 0x81 || destination.word !== slot)
      throw new Error(`Expected a string assignment at ECL${archive} block ${block} address 0x${address.toString(16)}`);
    return value.text;
  }))];
};

tracedSlots["ECL1.DAX:block-18:0x9800"] = savedStrings(1, 18, 0x9800, [0x9fd1, 0x9fe1, 0x9fef, 0xa002]);
tracedSlots["ECL1.DAX:block-24:0x9800"] = savedStrings(1, 24, 0x9800, [0xb454, 0xb46a, 0xb483, 0xb496, 0xb4ae]);
tracedSlots["ECL8.DAX:block-29:0x982c"] = savedStrings(8, 29, 0x982c, [0x9c79, 0x9c8c]);

// The patrol's SAVE writes a zero-terminated string. The PRINT at $980f
// skips the first letter because the opening PRINTCLEAR already supplies it.
for (const [archive, block, assignment] of [[2, 9, 0x9db4], [5, 3, 0x9c7c], [5, 4, 0x9bd1], [5, 6, 0xa8d1]] as const) {
  const [patrol] = savedStrings(archive, block, 0x980e, [assignment]);
  if (!patrol?.startsWith("A ")) throw new Error(`Unexpected patrol prefix in ECL${archive} block ${block}`);
  tracedSlots[`ECL${archive}.DAX:block-${block}:0x980f`] = [patrol.slice(1)];
}

// Each menu uses the complete string produced by a literal SAVE followed by
// a SAVE of the selected group at the end of the prefix.
for (const { archive, block, sourceSlot, targetSlot, groups, menus } of [
  { archive: 2, block: 20, sourceSlot: 0x9890, targetSlot: 0x982c, groups: [0x9b9f, 0x9bb1, 0x9bc3], menus: [0x9c9b, 0x9d01, 0x9d58, 0x9dba] },
  { archive: 4, block: 10, sourceSlot: 0x982c, targetSlot: 0x9890, groups: [0x9cb7, 0x9eed, 0xa0d4], menus: [0xb4c0] },
  { archive: 8, block: 29, sourceSlot: 0x9890, targetSlot: 0x982c, groups: [0xa4a3, 0xa4b0, 0xa4be], menus: [0xa4df, 0xa53f, 0xa5a0, 0xa603] }
]) {
  const data = script(archive, block);
  const groupTexts = savedStrings(archive, block, sourceSlot, groups);
  for (const prefixAddress of menus) {
    const [prefix] = savedStrings(archive, block, targetSlot, [prefixAddress]);
    const append = readInstruction(data, readInstruction(data, prefixAddress).next);
    const [source, destination] = append.operands;
    const menu = readInstruction(data, append.next);
    const offset = (destination?.word ?? 0) - targetSlot;
    if (prefix === undefined || append.name !== "SAVE" || source?.code !== 0x81 || source.word !== sourceSlot ||
        destination?.code !== 0x81 || offset < prefix.trimEnd().length || offset > prefix.length ||
        menu.name !== "ENCOUNTER MENU" || menu.operands[9]?.code !== 0x81 || menu.operands[9].word !== targetSlot)
      throw new Error(`Unexpected string assembly before ECL${archive} block ${block} menu at 0x${menu.address.toString(16)}`);
    const address = menu.address.toString(16);
    const unitId = `ecl${archive}-b${block}-${address}-runtime-text`;
    if (!unitById.has(unitId)) throw new Error(`Missing reviewed menu ${unitId}`);
    tracedUnits.add(unitId);
    const values = groupTexts.map(group => prefix.slice(0, offset) + group);
    valuesByUnit[unitId] = values.map(value => ({
      value, condition: `rendered encounter operand 9 at 0x${address} == ${JSON.stringify(value)}`,
      text: value.replace(/\s+/g, " ").trim()
    }));
  }
}
Object.assign(finiteSlotValuesByScope, tracedSlots);

// The recorded passage deliberately omits the displayed count. The same
// creature assignment drives both the counted and uncounted encounter prints.
const countedEncounter = "ecl1-b18-a0ab-a0af-a0b3";
tracedUnits.add(countedEncounter);
valuesByUnit[countedEncounter] = tracedSlots["ECL1.DAX:block-18:0x9800"]!.map(value => ({
  value,
  condition: `0x9800 == ${JSON.stringify(value)}`,
  text: `Some ${value.trim().toLowerCase()} rush to attack.`
}));

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
  if (valuesByUnit[dynamic.unitId] || staticallyQueued.has(dynamic.unitId)) continue;
  const unit = unitById.get(dynamic.unitId);
  if (!unit) continue;
  const dynamicParts = sourceParts(unit).flat().filter(part => part.kind !== "literal");
  if (dynamicParts.length < 1 || !dynamicParts[0]?.address || dynamicParts.some(part => part.address !== dynamicParts[0]!.address)) continue;
  const scope = `${dynamic.archive}:block-${unitBlock(unit)}:${dynamicParts[0].address}`;
  const values = finiteSlotValuesByScope[scope];
  if (!values) continue;
  if (tracedSlots[scope]) tracedUnits.add(dynamic.unitId);
  valuesByUnit[dynamic.unitId] = values.map(value => {
    const segments = sourceParts(unit).flatMap(parts => parts.map(part => part.kind === "literal" ? part.rawText ?? "" : value));
    let text = "";
    for (const segment of segments) {
      if (text && segment && /[A-Za-z0-9.!?,;:'\"]$/.test(text) && /^[A-Za-z0-9'\"]/.test(segment)) text += " ";
      text += segment;
    }
    text = text.replace(/\s+/g, " ").trim();
    return { value, condition: `${dynamicParts[0]!.address} == ${JSON.stringify(value)}`, text };
  });
}
type Binding = { id: string; sourceUnitId: string; condition: string; dynamicValue: string };
const sharedRecordings = new Map<string, Binding[]>();
const variantFamilies = Object.entries(valuesByUnit).sort(([left], [right]) => Number(tracedUnits.has(left)) - Number(tracedUnits.has(right)));
const generationItems = variantFamilies.flatMap(([unitId, variants]) => {
  const source = unitById.get(unitId);
  if (!source) throw new Error(`Missing reviewed unit ${unitId}`);
  const triggerSourceId = String(source.triggerSourceId);
  const coveredSourceIds = (source.coveredSourceIds ?? []).map(String);
  const direction = String(source.direction ?? "measured, expressive fantasy narration appropriate to the scene");
  return variants.flatMap(({ value, condition, text }, index) => {
    const suffix = `${String(index + 1).padStart(2, "0")}-${slug(value)}`;
    const id = `${unitId}.variant-${suffix}`;
    const key = JSON.stringify([text, direction]);
    const alreadyQueued = tracedUnits.has(unitId) ? sharedRecordings.get(key) : undefined;
    if (alreadyQueued) {
      alreadyQueued.push({ id, sourceUnitId: unitId, condition, dynamicValue: value });
      return [];
    }
    const aliases: Binding[] = [];
    if (tracedUnits.has(unitId)) sharedRecordings.set(key, aliases);
    return [{
      id,
      sourceUnitId: unitId,
      triggerSourceId,
      coveredSourceIds,
      condition,
      dynamicValue: value,
      output: `../por-assets/voices/narration/dynamic-resolved/${unitId.replace(/^por\.voice\./, "").replace(/\./g, "-")}-v${suffix}.mp3`,
      text,
      direction,
      aliases
    }];
  });
});
const manifest = {
  schema: 1,
  policy: "No dynamic value is guessed. Values are either proven from local ECL assignments, runtime-only, or left for encounter-table tracing.",
  unresolvedUnitCountBeforeTrace: unresolved.length,
  unitsResolvedToFiniteVariants: Object.keys(valuesByUnit).length,
  unitsStillRuntimeDependent: unresolved.filter(unit => !valuesByUnit[unit.unitId] && !staticallyQueued.has(unit.unitId)).length,
  slotSemantics,
  resolvedUnitVariants,
  resolvedVariantRecords: valuesByUnit,
  newlyQueueableVariantCount: generationItems.length,
  finiteSlotValuesByScope,
  units: unresolved.map(unit => ({ ...unit, resolution: valuesByUnit[unit.unitId] ? "finite-variants-proven" :
    staticallyQueued.has(unit.unitId) ? "static-recording" : "withheld-pending-runtime-resolution" }))
};
writeFileSync(new URL("../src/audio/dynamic-voice-resolution.json", import.meta.url), `${JSON.stringify(manifest, null, 2)}\n`);
writeFileSync(new URL("../src/audio/dynamic-resolved-generation-queue.json", import.meta.url), `${JSON.stringify({
  schema: 1,
  model: "eleven_v4",
  sourceResolution: "src/audio/dynamic-voice-resolution.json",
  itemCount: generationItems.length,
  items: generationItems.map(({ aliases, ...item }) => aliases.length ? { ...item, aliases } : item)
}, null, 2)}\n`);
console.log(`traced ${unresolved.length} dynamic units; resolved ${Object.keys(valuesByUnit).length} families to ${generationItems.length} finite variants`);
