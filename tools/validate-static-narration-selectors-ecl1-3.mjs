import fs from "node:fs";

const root = new URL("../", import.meta.url);
const manifest = JSON.parse(fs.readFileSync(new URL("src/audio/voice-master-manifest.json", root), "utf8"));
const selectors = JSON.parse(fs.readFileSync(new URL("src/audio/static-narration-selectors-ecl1-3.json", root), "utf8"));

const scopedUnits = manifest.units.filter((unit) => selectors.scope.includes(unit.archive));
const groups = new Map();
for (const unit of scopedUnits) {
  const group = groups.get(unit.triggerSourceId) ?? [];
  group.push(unit);
  groups.set(unit.triggerSourceId, group);
}
const shared = new Map([...groups].filter(([, units]) => units.length > 1));
const errors = [];
const seenTriggers = new Set();

for (const entry of selectors.triggers) {
  if (seenTriggers.has(entry.triggerSourceId)) errors.push(`duplicate trigger ${entry.triggerSourceId}`);
  seenTriggers.add(entry.triggerSourceId);
  const units = shared.get(entry.triggerSourceId);
  if (!units) {
    errors.push(`selector is not a shared scoped trigger: ${entry.triggerSourceId}`);
    continue;
  }
  const expected = new Set(units.map((unit) => unit.id));
  const actual = new Set(entry.selector.cases.map((item) => item.unitId));
  for (const id of expected) if (!actual.has(id)) errors.push(`${entry.triggerSourceId}: missing unit ${id}`);
  for (const id of actual) if (!expected.has(id)) errors.push(`${entry.triggerSourceId}: unknown unit ${id}`);
  if (entry.availableAtTrigger && entry.playback !== "at-trigger") errors.push(`${entry.triggerSourceId}: contradictory timing`);
  if (!entry.availableAtTrigger && entry.playback === "at-trigger") errors.push(`${entry.triggerSourceId}: unavailable selector marked at-trigger`);
  if (entry.selector.kind === "source-event") {
    const covered = new Set(units.flatMap((unit) => unit.coveredSourceIds));
    for (const item of entry.selector.cases) if (!covered.has(item.sourceId)) errors.push(`${entry.triggerSourceId}: uncovered deferred event ${item.sourceId}`);
  }
}

for (const trigger of shared.keys()) if (!seenTriggers.has(trigger)) errors.push(`missing shared trigger ${trigger}`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`validated ${selectors.triggers.length} ECL1-ECL3 shared trigger selectors (${selectors.triggers.filter((x) => x.availableAtTrigger).length} available at trigger)`);
