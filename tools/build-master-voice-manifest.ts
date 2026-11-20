import { readdirSync, readFileSync, writeFileSync } from "node:fs";

interface SourceEvent {
  id: string;
  source: { archive: string; block: number; address: string; instruction: string; instructionIndex: number };
  outputParts: unknown[];
  rawLiteralText: string;
  normalizedText: string;
  sourceDigest: string;
}
interface QueueItem {
  id?: string;
  unitId?: string;
  triggerSourceId?: string;
  coveredSourceIds?: string[];
  sourceIds?: string[];
  output: string;
  text: string;
  direction: string;
  sourceUnitId?: string;
  condition?: string;
  dynamicValue?: string;
  aliases?: Array<{ id: string; sourceUnitId: string; condition: string; dynamicValue: string }>;
}
interface ReviewUnit {
  id: string;
  triggerSourceId: string;
  coveredSourceIds: string[];
  spokenText?: string;
  text?: string;
  direction?: string;
  variant?: string | null;
  characterId?: string | null;
  performedCharacterId?: string | null;
  status?: string;
  reviewStatus?: string;
  generationEligible?: boolean;
  sourceTexts?: unknown[];
  sourceTextParts?: unknown[];
  rawSourceTexts?: unknown[];
  asset?: string;
  model?: string;
}

const audio = new URL("../src/audio/", import.meta.url);
const extraction = JSON.parse(readFileSync(new URL("voice-review-extraction.json", audio), "utf8")) as { events: SourceEvent[] };
const extractionById = new Map(extraction.events.map(event => [event.id, event]));
const queueFiles = readdirSync(audio).filter(name => /^(?:ecl\d+|static-resolved)-generation-queue.*\.json$/i.test(name)).sort();
const queuedById = new Map<string, QueueItem>();
const queuedBySources = new Map<string, QueueItem>();
const sourceKey = (trigger: string, covered: string[]) => `${trigger}|${covered.join("|")}`;
for (const name of queueFiles) {
  const queue = JSON.parse(readFileSync(new URL(name, audio), "utf8")) as { items: QueueItem[] };
  for (const item of queue.items) {
    const id = item.id ?? item.unitId;
    if (!id) throw new Error(`${name} has a queue item without an id`);
    const covered = item.coveredSourceIds ?? item.sourceIds;
    const trigger = item.triggerSourceId ?? covered?.[0];
    if (!covered?.length || !trigger) throw new Error(`${name} item ${id} has no sources`);
    item.coveredSourceIds = covered;
    item.triggerSourceId = trigger;
    if (queuedById.has(id)) throw new Error(`duplicate queued unit ${id}`);
    queuedById.set(id, item);
    queuedBySources.set(sourceKey(trigger, covered), item);
  }
}

const reviews: Array<{ archive: string; events: any[]; units: ReviewUnit[] }> = [];
for (let number = 1; number <= 8; number++) {
  const review = JSON.parse(readFileSync(new URL(`ecl${number}-voice-review.json`, audio), "utf8"));
  reviews.push({ archive: `ECL${number}.DAX`, events: review.events, units: review.units ?? review.narrationUnits });
}
const sokal = JSON.parse(readFileSync(new URL("sokal-voice-manifest.json", audio), "utf8")) as { units: ReviewUnit[] };
const dynamicResolution = JSON.parse(readFileSync(new URL("dynamic-voice-resolution.json", audio), "utf8"));
const staticSelectorSources = [
  "static-narration-selectors-ecl1-3.json",
  "static-narration-selectors-ecl4-6.json",
  "static-narration-selectors-ecl7-8.json"
];
const staticSelectors = staticSelectorSources.flatMap(source => {
  const document = JSON.parse(readFileSync(new URL(source, audio), "utf8"));
  return (document.triggers ?? document.selectors).map((selector: any) => ({ ...selector, source }));
});
const dynamicQueue = JSON.parse(readFileSync(new URL("dynamic-resolved-generation-queue.json", audio), "utf8")) as { items: QueueItem[] };
const dynamicVariantsByUnit = new Map<string, QueueItem[]>();
const dynamicIds = new Set<string>();
for (const item of dynamicQueue.items) {
  for (const binding of [item, ...(item.aliases ?? [])]) {
    const { id, sourceUnitId, condition, dynamicValue } = binding;
    if (!id || !sourceUnitId || !condition || dynamicValue === undefined || dynamicIds.has(id))
      throw new Error(`invalid or duplicate dynamic queue item ${id}`);
    dynamicIds.add(id);
    const variants = dynamicVariantsByUnit.get(sourceUnitId) ?? [];
    if (variants.some(variant => variant.dynamicValue === dynamicValue))
      throw new Error(`duplicate dynamic selector for ${sourceUnitId}: ${JSON.stringify(dynamicValue)}`);
    variants.push({ ...item, id, sourceUnitId, condition, dynamicValue });
    dynamicVariantsByUnit.set(sourceUnitId, variants);
  }
}
if (dynamicVariantsByUnit.size !== dynamicResolution.unitsResolvedToFiniteVariants)
  throw new Error(`finite dynamic family mismatch: ${dynamicVariantsByUnit.size} queued, ${dynamicResolution.unitsResolvedToFiniteVariants} resolved`);
if (dynamicQueue.items.length !== dynamicResolution.newlyQueueableVariantCount)
  throw new Error(`finite dynamic variant mismatch: ${dynamicQueue.items.length} queued, ${dynamicResolution.newlyQueueableVariantCount} resolved`);

const normalizedUnits: any[] = [];
const unitIds = new Set<string>();
const sourceToUnits = new Map<string, string[]>();
const addUnit = (archive: string, unit: ReviewUnit) => {
  if (unitIds.has(unit.id)) throw new Error(`duplicate narration unit ${unit.id}`);
  unitIds.add(unit.id);
  if (!extractionById.has(unit.triggerSourceId)) throw new Error(`${unit.id} has unknown trigger ${unit.triggerSourceId}`);
  for (const sourceId of unit.coveredSourceIds) {
    if (!extractionById.has(sourceId)) throw new Error(`${unit.id} covers unknown source ${sourceId}`);
    const ids = sourceToUnits.get(sourceId) ?? [];
    ids.push(unit.id);
    sourceToUnits.set(sourceId, ids);
  }
  const queued = queuedById.get(unit.id) ?? queuedBySources.get(sourceKey(unit.triggerSourceId, unit.coveredSourceIds));
  const runtimeVariants = (dynamicVariantsByUnit.get(unit.id) ?? []).map(item => ({
    id: item.id,
    condition: item.condition,
    dynamicValue: item.dynamicValue,
    text: item.text,
    direction: item.direction,
    model: "eleven_v4",
    asset: item.output.replace(/^\.\.\/por-assets\//, "")
  }));
  const asset = unit.asset ?? queued?.output.replace(/^\.\.\/por-assets\//, "");
  const sourceParts = unit.rawSourceTexts ?? unit.sourceTextParts ?? unit.sourceTexts ?? unit.coveredSourceIds.map(sourceId => {
    const event = extractionById.get(sourceId)!;
    return { sourceId, rawText: event.rawLiteralText, outputParts: event.outputParts, sourceDigest: event.sourceDigest };
  });
  normalizedUnits.push({
    id: unit.id,
    archive,
    triggerSourceId: unit.triggerSourceId,
    coveredSourceIds: unit.coveredSourceIds,
    variant: unit.variant ?? null,
    spokenText: unit.spokenText ?? unit.text ?? queued?.text ?? "",
    direction: unit.direction ?? queued?.direction ?? "measured, expressive fantasy narration",
    characterId: unit.characterId ?? unit.performedCharacterId ?? null,
    sourceParts,
    resolution: asset ? "resolved" : runtimeVariants.length ? "finite-runtime-variants" : "unresolved-dynamic",
    generationEligible: Boolean(asset || runtimeVariants.length),
    model: unit.model ?? (asset || runtimeVariants.length ? "eleven_v4" : null),
    asset: asset ?? null,
    runtimeVariants,
    playback: { attachOnlyToTrigger: true, queueAfterCurrentNarration: true }
  });
};
for (const review of reviews) for (const unit of review.units) addUnit(review.archive, unit);
for (const unit of sokal.units) addUnit("ECL4.DAX", unit);
for (const id of dynamicVariantsByUnit.keys()) if (!unitIds.has(id)) throw new Error(`unknown dynamic unit ${id}`);

const reviewedEventIds = new Set<string>();
for (const review of reviews) {
  for (const event of review.events) {
    if (reviewedEventIds.has(event.sourceId)) throw new Error(`event reviewed more than once: ${event.sourceId}`);
    reviewedEventIds.add(event.sourceId);
  }
}
const sokalEvents = extraction.events.filter(event => event.source.archive === "ECL4.DAX" && event.source.block === 21);
for (const event of sokalEvents) {
  if (reviewedEventIds.has(event.id)) throw new Error(`Sokal event reviewed more than once: ${event.id}`);
  reviewedEventIds.add(event.id);
}
const missing = extraction.events.filter(event => !reviewedEventIds.has(event.id));
const extra = [...reviewedEventIds].filter(id => !extractionById.has(id));
if (missing.length || extra.length) throw new Error(`review coverage mismatch: ${missing.length} missing, ${extra.length} extra`);

const events = extraction.events.map(event => ({
  sourceId: event.id,
  source: event.source,
  outputParts: event.outputParts,
  rawText: event.rawLiteralText,
  normalizedText: event.normalizedText,
  sourceDigest: event.sourceDigest,
  classification: sourceToUnits.has(event.id) ? "voiced-source" : "unvoiced-interface-layout",
  narrationUnitIds: sourceToUnits.get(event.id) ?? []
}));
normalizedUnits.sort((a, b) => a.archive.localeCompare(b.archive) || a.triggerSourceId.localeCompare(b.triggerSourceId) || a.id.localeCompare(b.id));
for (const selector of staticSelectors) {
  if (!extractionById.has(selector.triggerSourceId)) throw new Error(`static selector has unknown trigger ${selector.triggerSourceId}`);
  const entries = selector.selector?.cases ?? selector.cases ?? selector.variants ?? [];
  for (const entry of entries) {
    if (entry.sourceId && !extractionById.has(entry.sourceId)) throw new Error(`static selector has unknown covered source ${entry.sourceId}`);
    if (entry.action === "none") {
      if (entry.unitId !== null) throw new Error(`action:none must have a null unit at ${selector.triggerSourceId}`);
    } else if (!entry.unitId || !unitIds.has(entry.unitId)) {
      throw new Error(`static selector has unknown unit ${entry.unitId} at ${selector.triggerSourceId}`);
    }
  }
}
const resolved = normalizedUnits.filter(unit => unit.generationEligible).length;
const manifest = {
  schema: 1,
  enhancedOnly: true,
  sourceExtraction: "src/audio/voice-review-extraction.json",
  narratorVoiceId: "9UwacDmdjpXy5tUGJhDA",
  model: "eleven_v4",
  policy: {
    manualSequenceReviewRequired: true,
    audioAttachesOnlyToTrigger: true,
    coveredPrintsDoNotRetrigger: true,
    subsequentNarrationQueuesAfterCurrent: true,
    exactSourceTextPreservedInSourceParts: true
  },
  counts: {
    sourceEvents: events.length,
    classifiedEvents: reviewedEventIds.size,
    voicedSourceEvents: events.filter(event => event.classification === "voiced-source").length,
    unvoicedEvents: events.filter(event => event.classification === "unvoiced-interface-layout").length,
    narrationUnits: normalizedUnits.length,
    resolvedUnits: resolved,
    unresolvedDynamicUnits: normalizedUnits.length - resolved,
    finiteRuntimeVariantFamilies: dynamicVariantsByUnit.size,
    finiteRuntimeVariantAssets: dynamicQueue.items.length
  },
  dynamicResolution: {
    source: "src/audio/dynamic-voice-resolution.json",
    queue: "src/audio/dynamic-resolved-generation-queue.json",
    slotSemantics: dynamicResolution.slotSemantics,
    finiteSlotValuesByScope: dynamicResolution.finiteSlotValuesByScope
  },
  staticSelectorSources: staticSelectorSources.map(source => `src/audio/${source}`),
  staticSelectors,
  events,
  units: normalizedUnits
};
writeFileSync(new URL("voice-master-manifest.json", audio), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${events.length} classified events and ${normalizedUnits.length} narration units (${resolved} resolved)`);

