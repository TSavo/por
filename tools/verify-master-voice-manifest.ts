import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (name: string) => JSON.parse(readFileSync(new URL(`../src/audio/${name}`, import.meta.url), "utf8"));
const extraction = read("voice-review-extraction.json");
const master = read("voice-master-manifest.json");
assert.equal(master.counts.sourceEvents, extraction.eventCount);
assert.equal(master.counts.classifiedEvents, extraction.eventCount);
assert.equal(master.events.length, extraction.eventCount);
assert.equal(new Set(master.events.map((event: any) => event.sourceId)).size, extraction.eventCount);
const sourceIds = new Set(extraction.events.map((event: any) => event.id));
const unitIds = new Set<string>();
let resolved = 0;
for (const unit of master.units) {
  assert(!unitIds.has(unit.id), `duplicate unit ${unit.id}`);
  unitIds.add(unit.id);
  assert(sourceIds.has(unit.triggerSourceId), `${unit.id} trigger does not exist`);
  assert(unit.coveredSourceIds.includes(unit.triggerSourceId), `${unit.id} does not cover its trigger`);
  for (const sourceId of unit.coveredSourceIds) assert(sourceIds.has(sourceId), `${unit.id} source does not exist: ${sourceId}`);
  assert(unit.spokenText || !unit.generationEligible, `${unit.id} has no spoken text`);
  if (unit.generationEligible) {
    resolved++;
    assert.equal(unit.model, "eleven_v4");
    assert.match(unit.asset, /^voices\/narration\/.+\.mp3$/);
  } else {
    assert.equal(unit.asset, null);
  }
}
assert.equal(master.counts.narrationUnits, master.units.length);
assert.equal(master.counts.resolvedUnits, resolved);
assert.equal(master.counts.unresolvedDynamicUnits, master.units.length - resolved);
for (const event of master.events) {
  assert(["voiced-source", "unvoiced-interface-layout"].includes(event.classification));
  for (const id of event.narrationUnitIds) assert(unitIds.has(id), `${event.sourceId} references unknown unit ${id}`);
  assert.equal(event.classification === "voiced-source", event.narrationUnitIds.length > 0);
}
console.log(`verified ${master.events.length} classified events and ${master.units.length} normalized narration units`);
