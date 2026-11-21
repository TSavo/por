import { readFileSync, writeFileSync } from "node:fs";

type Part = { operandIndex: number; kind: string; rawText?: string; address?: string };
type Event = {
  id: string;
  source: { archive: string; block: number; address: string; instruction: string };
  outputParts: Part[];
  rawLiteralText: string;
  sourceDigest: string;
};
type Extraction = { events: Event[] };
type Unit = {
  id: string;
  block: number;
  triggerSourceId: string;
  coveredSourceIds: string[];
  sourceTextParts: Array<{ sourceId: string; operandIndex?: number; rawText: string }>;
  spokenText: string;
  excludedInterfaceText?: string;
  status: "ready" | "unresolved-dynamic";
  characterId: string | null;
  direction: string;
  variant?: string;
};

const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as Extraction;
const events = extraction.events.filter(event => event.source.archive === "ECL2.DAX");
const byKey = new Map(events.map(event => [`${event.source.block}:${event.source.address}`, event]));
const eventUnits = new Map<string, string[]>();
const units: Unit[] = [];
const key = (block: number, address: string) => {
  const event = byKey.get(`${block}:${address}`);
  if (!event) throw new Error(`Missing ECL2 block ${block} event ${address}`);
  return event;
};
const unitName = (block: number, addresses: string[], variant?: string) =>
  `ecl2-b${block}-${addresses.map(address => address.slice(2)).join("-")}${variant ? `-${variant}` : ""}`;
const characterFor = (block: number, address: string): string | null => {
  const value = Number.parseInt(address.slice(2), 16);
  if (block === 9 && value >= 0xadd9 && value <= 0xb021) return "stojanow-wagon-trader";
  if (block === 15 && value >= 0xa7b8 && value <= 0xaac3) return "library-mad-fighter";
  if (block === 15 && value >= 0xad9b && value <= 0xadfe) return "library-kobold-spokesperson";
  if (block === 20 && value >= 0x9f46 && value <= 0xa323) return "ohlo";
  if (block === 20 && value >= 0xa651 && value <= 0xa953) return "slums-fortune-teller";
  if (block === 20 && value >= 0xae3e && value <= 0xafeb) return "rope-guild-booth-man";
  return null;
};
const directionFor = (text: string, characterId: string | null) => {
  if (characterId === "ohlo") return "perform Ohlo consistently: controlled, superior, and calculating; keep narrator identity for attribution";
  if (characterId === "slums-fortune-teller") return text.includes("BLOOD AND VIOLENCE") || text.includes("POWERFUL ONE") || text.includes("TIME IS NIGH")
    ? "same fortune teller in her transformed prophetic voice: uncanny, resonant, and deliberate"
    : "perform the ragged fortune teller consistently; shift only where the source explicitly describes her transformation";
  if (characterId === "library-mad-fighter") return "perform the same terrified, unstable fighter with abrupt emotional turns; retain narrator identity for attribution";
  if (characterId) return `consistent narrator-performed character: ${characterId}; retain narrator identity for attribution`;
  if (text.includes("'") || text.includes('"')) return "expressive fantasy narration; perform quoted dialogue distinctly while remaining the same narrator";
  return "measured, expressive fantasy narration appropriate to the scene";
};
const addUnit = (block: number, addresses: string[], options: { variant?: string; texts?: string[]; status?: Unit["status"] } = {}) => {
  const selected = addresses.map(address => key(block, address));
  const texts = options.texts ?? selected.map(event => event.rawLiteralText);
  const raw = texts.join("");
  const suffix = raw.match(/\s*\(WHAT DO YOU DO\?\)\s*$/)?.[0];
  const spokenText = suffix ? raw.slice(0, -suffix.length) : raw;
  const id = unitName(block, addresses, options.variant);
  const characterId = characterFor(block, addresses[0]!);
  const unit: Unit = {
    id,
    block,
    triggerSourceId: selected[0]!.id,
    coveredSourceIds: selected.map(event => event.id),
    sourceTextParts: selected.map((event, index) => ({ sourceId: event.id, rawText: texts[index] ?? "" })),
    spokenText,
    ...(suffix ? { excludedInterfaceText: suffix } : {}),
    status: options.status ?? "ready",
    characterId,
    direction: directionFor(spokenText, characterId),
    ...(options.variant ? { variant: options.variant } : {})
  };
  units.push(unit);
  for (const event of selected) eventUnits.set(event.id, [...(eventUnits.get(event.id) ?? []), id]);
};

// Manually approved genuine split passages.
addUnit(9, ["0x9de5", "0x9def", "0x9e01"], { status: "unresolved-dynamic" });
addUnit(9, ["0x9f31", "0x9f4f"]);
addUnit(15, ["0x9c4a", "0x9c7a"]);
addUnit(20, ["0x9c2a", "0x9c43", "0x9c5c"], { status: "unresolved-dynamic" });
addUnit(20, ["0xb25a", "0xb276", "0xb286", "0xb292"], { status: "unresolved-dynamic" });
addUnit(20, ["0xb65b", "0xb66d", "0xb671"], { status: "unresolved-dynamic" });

// Shared subroutine text is mapped by call context, not globally by address.
for (const [address, label] of [["0x9e38", "rhetoric"], ["0x9e43", "philosophy"], ["0x9e50", "mathematics"], ["0x9e5d", "history"]] as const) {
  addUnit(15, ["0x9d77", address], { variant: `sign-${label}` });
  addUnit(15, ["0x9dfd", address], { variant: `search-${label}` });
}
for (const [address, label] of [["0xa116", "meditations"], ["0xa123", "harmony-of-the-rock"], ["0xa139", "strom-poetics"], ["0xa155", "chronicles-of-arram"], ["0xa168", "nature-of-writing"]] as const)
  addUnit(15, ["0xa0c7", address], { variant: label });
for (const [address, label] of [["0xaa3e", "wrapped-in-fire"], ["0xaa5e", "castle-of-flowers"], ["0xaaa1", "dont-go-there"], ["0xaac3", "not-human"]] as const)
  addUnit(15, ["0xa9fd", address], { variant: label });

const interfaceOnly = new Set([
  "9:0x9c40", "15:0x9992", "20:0xaeb8", "20:0xaf7f", "20:0xb39f", "20:0xb6bc"
]);
const memberIds = new Set(eventUnits.keys());
for (const event of events) {
  if (memberIds.has(event.id)) continue;
  const eventKey = `${event.source.block}:${event.source.address}`;
  if (event.source.instruction === "HORIZONTAL MENU" || event.source.instruction === "PRINT RETURN" || interfaceOnly.has(eventKey)) continue;
  const literalParts = event.outputParts.filter(part => part.kind === "literal" && part.rawText?.trim());
  const dynamicParts = event.outputParts.filter(part => part.kind === "dynamic-string");
  if (event.source.instruction === "ENCOUNTER MENU") {
    if (dynamicParts.length) {
      addUnit(event.source.block, [event.source.address], { variant: "runtime-text", status: "unresolved-dynamic" });
      continue;
    }
    for (const part of literalParts)
      addUnit(event.source.block, [event.source.address], { variant: `operand-${part.operandIndex}`, texts: [part.rawText!] });
    continue;
  }
  if (!event.rawLiteralText.trim() && !dynamicParts.length) continue;
  addUnit(event.source.block, [event.source.address]);
}

const classifications = events.map(event => {
  const eventKey = `${event.source.block}:${event.source.address}`;
  const unitIds = eventUnits.get(event.id) ?? [];
  let classification = "voiced-narration";
  let reason = "manually reviewed narration source";
  if (event.source.instruction === "HORIZONTAL MENU") { classification = "unvoiced-interface"; reason = "choice labels"; }
  else if (event.source.instruction === "PRINT RETURN" || (!event.rawLiteralText.trim() && !event.outputParts.some(part => part.kind === "dynamic-string"))) {
    classification = "unvoiced-layout"; reason = "blank/spacing/return control";
  } else if (interfaceOnly.has(eventKey)) { classification = "unvoiced-interface"; reason = "generic input or continue instruction"; }
  else if (unitIds.some(id => units.find(unit => unit.id === id)?.status === "unresolved-dynamic")) {
    classification = "unresolved-dynamic"; reason = "runtime text value must be resolved before generation";
  } else if (unitIds.length > 1) { classification = "voiced-context-dependent"; reason = "shared source participates in call-context variants"; }
  else if (unitIds.length === 0) { classification = "unvoiced-layout"; reason = "no spoken content"; }
  return {
    sourceId: event.id,
    source: event.source,
    rawLiteralText: event.rawLiteralText,
    outputParts: event.outputParts,
    sourceDigest: event.sourceDigest,
    classification,
    reason,
    narrationUnitIds: unitIds
  };
});

const review = {
  schema: 1,
  archive: "ECL2.DAX",
  reviewMethod: "manual block-by-block prose, control-flow, branch, interface, and character-continuity review",
  playback: {
    trigger: "first covered source event only",
    continuation: "audio continues while later covered print events advance",
    queue: "a newly reached standalone unit plays after current narration"
  },
  eventCount: classifications.length,
  narrationUnitCount: units.length,
  readyUnitCount: units.filter(unit => unit.status === "ready").length,
  unresolvedUnitCount: units.filter(unit => unit.status === "unresolved-dynamic").length,
  events: classifications,
  narrationUnits: units
};
writeFileSync(new URL("../src/audio/ecl2-voice-review.json", import.meta.url), `${JSON.stringify(review, null, 2)}\n`);

for (const block of [9, 15, 20]) {
  const items = units.filter(unit => unit.block === block && unit.status === "ready").map(unit => ({
    id: unit.id,
    triggerSourceId: unit.triggerSourceId,
    coveredSourceIds: unit.coveredSourceIds,
    output: `audio/voices/narration/ecl2/block-${block}/${unit.id}.mp3`,
    text: unit.spokenText,
    direction: unit.direction
  }));
  writeFileSync(new URL(`../src/audio/ecl2-generation-queue-block-${block}.json`, import.meta.url), `${JSON.stringify({ schema: 1, model: "eleven_v4", archive: "ECL2.DAX", block, items }, null, 2)}\n`);
}

console.log(JSON.stringify({ events: classifications.length, units: units.length,
  ready: units.filter(unit => unit.status === "ready").length,
  unresolved: units.filter(unit => unit.status === "unresolved-dynamic").length }, null, 2));
