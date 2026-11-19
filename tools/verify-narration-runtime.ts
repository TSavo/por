import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Cpu } from "../src/cpu/machine.js";
import { EclNarrationObserver, type ObserverManifest } from "../src/runtime/ecl-narration-observer.js";
import { NarrationCatalog, NarrationQueue, type RuntimeNarrationManifest } from "../src/runtime/narration.js";

const manifest: RuntimeNarrationManifest = { enhancedOnly: true, units: [
  { id: "single", triggerSourceId: "print-1", coveredSourceIds: ["print-1", "print-2"], spokenText: "One two.",
    asset: "one.mp3", generationEligible: true, resolution: "resolved", runtimeVariants: [] },
  { id: "branch-a", triggerSourceId: "branch", coveredSourceIds: ["branch", "a"], spokenText: "A.",
    asset: "a.mp3", generationEligible: true, resolution: "resolved", variant: "a", runtimeVariants: [] },
  { id: "branch-b", triggerSourceId: "branch", coveredSourceIds: ["branch", "b"], spokenText: "B.",
    asset: "b.mp3", generationEligible: true, resolution: "resolved", variant: "b", runtimeVariants: [] },
  { id: "dynamic", triggerSourceId: "dynamic-print", coveredSourceIds: ["dynamic-print"], spokenText: "",
    asset: null, generationEligible: true, resolution: "finite-runtime-variants", runtimeVariants: [
      { id: "dynamic.kobolds", dynamicValue: " KOBOLDS. ", text: "Kobolds.", asset: "kobolds.mp3" },
      { id: "dynamic.orcs", dynamicValue: " ORCS. ", text: "Orcs.", asset: "orcs.mp3" }
    ] }
] };
const catalog = new NarrationCatalog(manifest);
assert.equal(catalog.resolve({ sourceId: "print-1" }).status, "resolved");
assert.equal(catalog.resolve({ sourceId: "print-2" }).status, "continuation", "covered prints must not retrigger");
assert.equal(catalog.resolve({ sourceId: "branch" }).status, "ambiguous", "branching triggers must never be guessed");
assert.deepEqual(catalog.resolve({ sourceId: "branch", unitId: "branch-b" }), { status: "resolved", narration: {
  unitId: "branch-b", triggerSourceId: "branch", coveredSourceIds: ["branch", "b"], asset: "b.mp3", text: "B."
} });
assert.equal(catalog.resolve({ sourceId: "dynamic-print" }).status, "selector-required");
const dynamic = catalog.resolve({ sourceId: "dynamic-print", dynamicValue: " ORCS. " });
assert.equal(dynamic.status, "resolved");
if (dynamic.status === "resolved") assert.equal(dynamic.narration.asset, "orcs.mp3");
assert.equal(catalog.resolve({ sourceId: "dynamic-print", dynamicValue: " GOBLINS. " }).status, "not-found");
assert.deepEqual([...catalog.assetFiles()].sort(), ["a.mp3", "b.mp3", "kobolds.mp3", "one.mp3", "orcs.mp3"]);

const queue = new NarrationQueue<string>();
assert.equal(queue.enqueue("one"), "one");
assert.equal(queue.enqueue("two"), undefined);
assert.equal(queue.pendingCount, 1);
assert.equal(queue.complete(), "two", "consecutive narration must start only after current narration ends");
queue.enqueue("three");
queue.interrupt();
assert.equal(queue.current, undefined);
assert.equal(queue.pendingCount, 0);
console.log("verified narration trigger selection, coverage, finite variants, queueing, and interruption");

// Integration against the normalized real manifest and original ECL memory
// layout: Sokal chapel PRINTCLEAR 0xa972 must resolve to its reviewed asset.
const realManifest = JSON.parse(readFileSync(new URL("../src/audio/voice-master-manifest.json", import.meta.url), "utf8")) as ObserverManifest;
const realCatalog = new NarrationCatalog(realManifest);
const observer = new EclNarrationObserver(realManifest);
const cpu = new Cpu();
cpu.ds = 0x0740;
cpu.ss = 0x0800;
cpu.sp = 0x0200;
cpu.write16(cpu.ss, cpu.sp + 4, 4);
cpu.write8(cpu.ds, 0x52d4, 21);
assert.equal(observer.observe(cpu, 7, 0x0353), undefined);
const bufferSegment = 0x0900;
const bufferOffset = 0x0100;
cpu.write16(cpu.ds, 0x493f, bufferOffset);
cpu.write16(cpu.ds, 0x4941, bufferSegment);
cpu.write16(cpu.ds, 0x494e, 0xa973);
cpu.write8(bufferSegment, (bufferOffset + 0xa972 + 0x6700) & 0xffff, 0x12);
const sokalEvent = observer.observe(cpu, 7, 0x0423);
assert.equal(sokalEvent?.sourceId, "por.review.ecl-4.block-21.at-a972");
assert.equal(sokalEvent?.archive, "ECL4.DAX");
assert.equal(sokalEvent?.block, 21);
const sokalResolution = realCatalog.resolve(sokalEvent!);
assert.equal(sokalResolution.status, "resolved");
if (sokalResolution.status === "resolved") {
  const narration = sokalResolution.narration;
  assert.equal(narration.asset, "voices/narration/sokal-keep/ecl4-b21-a972.mp3");
  const enhancedQueue = new NarrationQueue<typeof narration>();
  enhancedQueue.enqueue(narration);
  assert.equal(enhancedQueue.current?.unitId, "por.narration.sokal.ecl4-b21-a972");
  const classicQueue = new NarrationQueue<typeof narration>();
  assert.equal(classicQueue.current, undefined, "classic presentation must not enqueue narration");
}
console.log("verified real Sokal ECL observation and enhanced-only narration queueing");

// Authored menu text is observed at its exact operand and resolves normally.
cpu.write16(cpu.ds, 0x494e, 0xaa0b);
cpu.write8(bufferSegment, (bufferOffset + 0xaa0a + 0x6700) & 0xffff, 0x29);
const menuEvent = observer.observe(cpu, 7, 0x0423);
assert.equal(menuEvent?.sourceId, "por.review.ecl-4.block-21.at-aa0a");
assert.equal(menuEvent?.operand, 9);
assert.equal(menuEvent?.sourceOperandId, "por.review.ecl-4.block-21.at-aa0a.operand-9");
assert.equal(realCatalog.resolve(menuEvent!).status, "resolved");

// A later print covered by an earlier joined narration unit is identified but
// suppressed by the catalog instead of attaching a second audio clip.
cpu.write16(cpu.ds, 0x494e, 0xa17b);
cpu.write8(bufferSegment, (bufferOffset + 0xa17a + 0x6700) & 0xffff, 0x11);
const continuationEvent = observer.observe(cpu, 7, 0x0423);
assert.equal(continuationEvent?.sourceId, "por.review.ecl-4.block-21.at-a17a");
assert.equal(realCatalog.resolve(continuationEvent!).status, "continuation");

// Finite dynamic selectors are read from the original ECL Pascal-string slot.
cpu.write16(cpu.ss, cpu.sp + 4, 2);
cpu.write8(cpu.ds, 0x52d4, 20);
observer.observe(cpu, 7, 0x0353);
cpu.write16(cpu.ds, 0x494e, 0x9c2b);
cpu.write8(bufferSegment, (bufferOffset + 0x9c2a + 0x6700) & 0xffff, 0x12);
const dynamicOffset = (bufferOffset + 0x9890 + 0x6700) & 0xffff;
const orcs = " ORCS. ";
cpu.write8(bufferSegment, dynamicOffset, orcs.length);
for (let index = 0; index < orcs.length; index++) cpu.write8(bufferSegment, dynamicOffset + 1 + index, orcs.charCodeAt(index));
const realDynamicEvent = observer.observe(cpu, 7, 0x0423);
assert.equal(realDynamicEvent?.dynamicValue, orcs);
const realDynamicResolution = realCatalog.resolve(realDynamicEvent!);
assert.equal(realDynamicResolution.status, "resolved");
if (realDynamicResolution.status === "resolved") assert.match(realDynamicResolution.narration.asset, /-orcs\.mp3$/);
console.log("verified authored-menu operands, continuation suppression, and real dynamic variant selection");
