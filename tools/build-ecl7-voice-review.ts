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
const events = extraction.events.filter(event => event.source.archive === "ECL7.DAX");
const eventByKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const get = (key: string) => {
  const event = eventByKey.get(key);
  if (!event) throw new Error(`Missing ECL7 event ${key}`);
  return event;
};

const composites: UnitSpec[] = [
  { key: "b17-9c26-9c8d", members: ["17:0x9c26", "17:0x9c8d", "17:0x9c66"], variant: "war-cries-left",
    spokenText: "YOU HEAR WAR CRIES AND THE CLANG OF METAL TO YOUR LEFT. YOU SPIN TO FACE THE SOUND." },
  { key: "b17-9c26-9c9b", members: ["17:0x9c26", "17:0x9c9b", "17:0x9c66"], variant: "war-cries-behind",
    spokenText: "YOU HEAR WAR CRIES AND THE CLANG OF METAL BEHIND YOU. YOU SPIN TO FACE THE SOUND." },
  { key: "b17-9c26-9ca8", members: ["17:0x9c26", "17:0x9ca8", "17:0x9c66"], variant: "war-cries-right",
    spokenText: "YOU HEAR WAR CRIES AND THE CLANG OF METAL TO YOUR RIGHT. YOU SPIN TO FACE THE SOUND." },
  { key: "b17-9c26-9cb7", members: ["17:0x9c26", "17:0x9cb7"], variant: "war-cries-front",
    spokenText: "YOU HEAR WAR CRIES AND THE CLANG OF METAL IN FRONT OF YOU." },
  { key: "b17-a21a-a2e8", members: ["17:0xa21a", "17:0xa289", "17:0xa2e8"], direction: "One continuous wary approach to the nomad camp, building tension across page advances" },
  { key: "b17-a435-a494-tonight", members: ["17:0xa435", "17:0xa490", "17:0xa494"], variant: "feast-tonight",
    spokenText: "THE BIGGEST NOMAD, APPARENTLY THE CHIEF OR HEADMAN, ACKNOWLEDGES YOU WITH A NOD, 'WE WILL GIVE A FEAST IN YOUR HONOR TONIGHT. WILL YOU JOIN US?'",
    direction: "The headman speaks with rough dignity and guarded hospitality" },
  { key: "b17-a435-a494-tomorrow", members: ["17:0xa435", "17:0xa490", "17:0xa494"], variant: "feast-tomorrow",
    spokenText: "THE BIGGEST NOMAD, APPARENTLY THE CHIEF OR HEADMAN, ACKNOWLEDGES YOU WITH A NOD, 'WE WILL GIVE A FEAST IN YOUR HONOR TOMORROW. WILL YOU JOIN US?'",
    direction: "The headman speaks with rough dignity and guarded hospitality" },
  { key: "b17-a53e-a5c0", members: ["17:0xa53e", "17:0xa5c0"], direction: "The headman offers lodging with practical hospitality; one continuous arrival at the hut" },
  { key: "b17-a609-a928", members: ["17:0xa609", "17:0xa660", "17:0xa6b4", "17:0xa71b", "17:0xa7b1", "17:0xa82f", "17:0xa8ac", "17:0xa928"],
    direction: "A continuous day-and-night nomad sequence; keep Headman Hassad Ahwal consistent, shifting from festive warmth to drunken unease and earnest pleading" },
  { key: "b17-aa07-aa6d", members: ["17:0xaa07", "17:0xaa6d"], direction: "A continuous treacherous murder and immediate discovery, escalating rapidly into alarm" },
  { key: "b17-b08a-b0fb", members: ["17:0xb08a", "17:0xb0fb"], direction: "Battlefield narration flowing directly into the headman's vigorous invitation" },
  { key: "b17-b146-b2e7", members: ["17:0xb146", "17:0xb1b6", "17:0xb245", "17:0xb2e7"],
    direction: "One continuous heroic but condemning battle sequence; keep the headman proud, bitter, and physically exhausted" },
  { key: "b17-b3d4-b43c", members: ["17:0xb3d4", "17:0xb43c"], direction: "The shaman speaks with solemn gratitude and grief throughout" },

  { key: "b22-9a81-9ade", members: ["22:0x9a81", "22:0x9ade"], variant: "secret-door-front" },
  { key: "b22-9a81-9aef", members: ["22:0x9a81", "22:0x9aef"], variant: "secret-door-right" },
  { key: "b22-9a81-9aff", members: ["22:0x9a81", "22:0x9aff"], variant: "secret-door-behind" },
  { key: "b22-9a81-9b0c", members: ["22:0x9a81", "22:0x9b0c"], variant: "secret-door-left" },
  { key: "b22-9efa-9f61", members: ["22:0x9efa", "22:0x9f61"], direction: "Continuous corpse search and discovery of Tyrmor's journal" },
  { key: "b22-9fe7-a05e", members: ["22:0x9fe7", "22:0xa05e"], direction: "Continuous room search, moving from scattered rocks to an uncanny magical sensation" },
  { key: "b22-a222-a20b", members: ["22:0xa222", "22:0xa20b"], variant: "runtime-group-seen", unresolved: true },
  { key: "b22-a22c-a20b", members: ["22:0xa22c", "22:0xa20b"], variant: "runtime-group-surprises-party", unresolved: true },
  { key: "b22-a24e-a20b", members: ["22:0xa24e", "22:0xa20b"], variant: "runtime-party-surprises-group", unresolved: true },

  { key: "b23-9a70-9ace", members: ["23:0x9a70", "23:0x9ace"], variant: "secret-door-front" },
  { key: "b23-9a70-9ade", members: ["23:0x9a70", "23:0x9ade"], variant: "secret-door-right" },
  { key: "b23-9a70-9aed", members: ["23:0x9a70", "23:0x9aed"], variant: "secret-door-behind" },
  { key: "b23-9a70-9afa", members: ["23:0x9a70", "23:0x9afa"], variant: "secret-door-left" },
  { key: "b23-9c54-9ced", members: ["23:0x9c54", "23:0x9ced"], direction: "Continuous room search, moving from scattered rocks to an uncanny magical sensation" },
  { key: "b23-a344-a38f", members: ["23:0xa344", "23:0xa38f"], direction: "Continuous storeroom description resolving in the discovery of treasure" },
  { key: "b23-a4a7-a4bd", members: ["23:0xa4a7", "23:0xa4b9", "23:0xa4bd"], variant: "runtime-password-confirmation", unresolved: true },
  { key: "b23-a58f-a5ff", members: ["23:0xa58f", "23:0xa5ff"], direction: "One continuous, foul and mechanical fountain-chamber description" },
  { key: "b23-a773-a7a9", members: ["23:0xa773", "23:0xa7a9"], direction: "Continuous destruction result, moving from final impact into released pressure" },
  { key: "b23-a8fa-a97b", members: ["23:0xa8fa", "23:0xa97b"], direction: "Continuous pumping-room reveal, emphasizing the enslaved lizard men and their labor" },
  { key: "b23-ac5a-ad1b-acc3", members: ["23:0xac5a", "23:0xad1b", "23:0xacc3"], variant: "dial-blue",
    spokenText: "YOU SEE A DIAL THAT CAN BE SET TO FOUR DIFFERENT COLORS: BLUE, COPPER, SILVER, AND GOLD. IT IS CURRENTLY SET TO BLUE. DO YOU WISH TO CHANGE THE SETTING?" },
  { key: "b23-ac5a-ad23-acc3", members: ["23:0xac5a", "23:0xad23", "23:0xacc3"], variant: "dial-copper",
    spokenText: "YOU SEE A DIAL THAT CAN BE SET TO FOUR DIFFERENT COLORS: BLUE, COPPER, SILVER, AND GOLD. IT IS CURRENTLY SET TO COPPER. DO YOU WISH TO CHANGE THE SETTING?" },
  { key: "b23-ac5a-ad2d-acc3", members: ["23:0xac5a", "23:0xad2d", "23:0xacc3"], variant: "dial-silver",
    spokenText: "YOU SEE A DIAL THAT CAN BE SET TO FOUR DIFFERENT COLORS: BLUE, COPPER, SILVER, AND GOLD. IT IS CURRENTLY SET TO SILVER. DO YOU WISH TO CHANGE THE SETTING?" },
  { key: "b23-ac5a-ad37-acc3", members: ["23:0xac5a", "23:0xad37", "23:0xacc3"], variant: "dial-gold",
    spokenText: "YOU SEE A DIAL THAT CAN BE SET TO FOUR DIFFERENT COLORS: BLUE, COPPER, SILVER, AND GOLD. IT IS CURRENTLY SET TO GOLD. DO YOU WISH TO CHANGE THE SETTING?" },
  { key: "b23-ad4d-aed0", members: ["23:0xad4d", "23:0xada3", "23:0xade9", "23:0xae21", "23:0xae48", "23:0xae89", "23:0xaed0"],
    direction: "One continuous examination of Yarash's desk and papers, clearly enumerating each discovered document" },

  { key: "b26-a15c-a16e", members: ["26:0xa15c", "26:0xa16e"], variant: "runtime-group-spotted", unresolved: true },
  { key: "b26-a1a6-a1c1", members: ["26:0xa1a6", "26:0xa1c1"], variant: "runtime-group-surprises-party", unresolved: true },
  { key: "b26-a1f7-a20c", members: ["26:0xa1f7", "26:0xa20c"], variant: "runtime-party-surprises-group", unresolved: true },
  { key: "b26-a242-a268", members: ["26:0xa242", "26:0xa268"], variant: "runtime-face-to-face-group", unresolved: true },
  { key: "b26-a326-a330", members: ["26:0xa326", "26:0xa32c", "26:0xa330"], variant: "runtime-group-charmed", unresolved: true },
  { key: "b26-a376-a38a", members: ["26:0xa376", "26:0xa386", "26:0xa38a"], variant: "runtime-group-convinced", unresolved: true },
  { key: "b26-a3b9-a3df", members: ["26:0xa3b9", "26:0xa3cd", "26:0xa3d1", "26:0xa3d5", "26:0xa3db", "26:0xa3df"], variant: "runtime-group-insulted", unresolved: true },
  { key: "b26-a3f8-a42c", members: ["26:0xa3f8", "26:0xa3fe", "26:0xa402", "26:0xa428", "26:0xa42c"], variant: "runtime-groups-exchange-pleasantries", unresolved: true }
];

const unvoiced = new Set<string>();
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  const hasDynamicOutput = event.outputParts.some(part => part.kind !== "literal");
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "PRINT RETURN" || (!event.rawLiteralText.trim() && !hasDynamicOutput)) unvoiced.add(key);
}
unvoiced.add("23:0xa689");

const partialMenuSpecs: UnitSpec[] = [];
for (const event of events) {
  const key = `${event.source.block}:${event.source.address}`;
  if (event.source.instruction !== "ENCOUNTER MENU") continue;
  for (const part of event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim())) {
    partialMenuSpecs.push({ key: `b${event.source.block}-${event.source.address.slice(2)}-operand-${part.operandIndex}`,
      members: [key], variant: `menu-operand-${part.operandIndex}`, spokenText: part.rawText });
  }
  if (!event.outputParts.some(part => part.rawText?.trim())) unvoiced.add(key);
}

const allSpecs = [...composites, ...partialMenuSpecs];
const membership = new Map<string, UnitSpec[]>();
for (const spec of allSpecs) for (const member of spec.members) {
  const list = membership.get(member) ?? []; list.push(spec); membership.set(member, list);
}
const normalize = (text: string) => text.replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
const defaultDirection = (text: string) => {
  if (/['"]|\bSAYS\b|\bYELLS\b|\bSHOUTS\b|\bBEGS\b/.test(text)) return "Expressive fantasy narration with a distinct same-narrator character performance for quoted speech";
  if (/ATTACK|CHARGE|KILL|EXPLOSION|DANGER|AMBUSH|WAR CRIES/.test(text)) return "Urgent dramatic fantasy narration with clear danger and action";
  if (/DO YOU|WHAT DO|WILL YOU|WHICH|WHAT IS YOUR DECISION/.test(text)) return "Clear measured fantasy narration ending with a direct question";
  return "Measured expressive fantasy narration appropriate to the scene";
};
const units: Array<Record<string, unknown>> = [];
for (const spec of allSpecs) {
  const sourceEvents = spec.members.map(get);
  let text = normalize(spec.spokenText ?? sourceEvents.map(event => event.rawLiteralText).join(" "));
  if (spec.key === "b17-a609-a928") text = text.replace("APPRECIATE IT. 'PLEASE", "APPRECIATE IT.' 'PLEASE");
  units.push({ id: `por.voice.ecl7.${spec.key}`, triggerSourceId: sourceEvents[0]!.id,
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
  units.push({ id: `por.voice.ecl7.b${event.source.block}-${event.source.address.slice(2)}`, triggerSourceId: event.id,
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
const characterContinuity = [
  { characterId: "hassad-ahwal", aliases: ["headman", "chief", "biggest nomad"], scope: "ECL7 block 17", notes: "Keep rough dignity, hospitality, anxiety, courage, and grief recognizably one performed character." },
  { characterId: "samir", aliases: ["guard"], scope: "ECL7 block 17", notes: "Named only when his murder is discovered; do not merge with other guards." },
  { characterId: "nomad-shaman", aliases: ["shaman"], scope: "ECL7 block 17", notes: "Solemn communal authority distinct from Hassad Ahwal." },
  { characterId: "tyrmor-priest", aliases: ["human priest"], scope: "ECL7 block 22", notes: "Weak, devout prisoner; not Tyrmor himself." },
  { characterId: "yarash", aliases: ["ancient mage"], scope: "ECL7 block 23", notes: "Cold, clinical experimenter; distinct from text quoted in his papers." },
  { characterId: "freed-lizard-men", aliases: ["lizard men slaves"], scope: "ECL7 block 23", notes: "Encounter-scoped group performance." }
];
const review = { schema: 1, scope: { archive: "ECL7.DAX", extractedEventCount: events.length },
  policy: { manuallyQaReviewed: true, unconditionalDisplaySequencesJoined: true, adjacencyNeverImpliesCombination: true,
    exactSourceTextPreserved: true, dynamicTemplatesExcludedFromGeneration: true, audioAttachesToTriggerOnly: true },
  counts: { events: events.length, units: units.length, generationEligibleUnits: units.filter(unit => unit.generationEligible).length,
    unresolvedUnits: units.filter(unit => !unit.generationEligible).length,
    unvoicedEvents: reviews.filter(event => event.classification.startsWith("unvoiced-")).length },
  characterContinuity, events: reviews, units };
writeFileSync(new URL("../src/audio/ecl7-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);
const eligible = units.filter(unit => unit.generationEligible) as Array<Record<string, unknown>>;
for (let index = 0; index < eligible.length; index += 40) {
  const number = String(index / 40 + 1).padStart(2, "0");
  const queue = { model: "eleven_v4", sourceReview: "src/audio/ecl7-voice-review.json", items: eligible.slice(index, index + 40).map(unit => ({
    unitId: unit.id, triggerSourceId: unit.triggerSourceId, coveredSourceIds: unit.coveredSourceIds,
    output: `audio/voices/narration/ecl7/${String(unit.id).replace("por.voice.ecl7.", "")}.mp3`, text: unit.spokenText, direction: unit.direction })) };
  writeFileSync(new URL(`../src/audio/ecl7-generation-queue-${number}.json`, import.meta.url), `${JSON.stringify(queue, null, 2)}\n`);
}
console.log(JSON.stringify(review.counts));
