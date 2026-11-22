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
cpu.write8(cpu.ds, 0x52d4, 4);
cpu.write8(cpu.ds, 0x82a2, 21);
const bufferSegment = 0x0900;
const bufferOffset = 0x0100;
const variableSegment = 0x2000;
const variableOffset = (address: number) => (address * 2 - 0x2e00) & 0xffff;
cpu.write16(cpu.ds, 0x493f, bufferOffset);
cpu.write16(cpu.ds, 0x4941, bufferSegment);
cpu.write16(cpu.ds, 0x493d, variableSegment);
cpu.write16(cpu.ds, 0x494e, 0xa972);
cpu.write8(bufferSegment, (bufferOffset + 0xa972 + 0x6700) & 0xffff, 0x12);
const sokalEvent = observer.observe(cpu);
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
cpu.write16(cpu.ds, 0x494e, 0xaa0a);
cpu.write8(bufferSegment, (bufferOffset + 0xaa0a + 0x6700) & 0xffff, 0x29);
const menuEvent = observer.observe(cpu);
assert.equal(menuEvent?.sourceId, "por.review.ecl-4.block-21.at-aa0a");
assert.equal(menuEvent?.operand, 9);
assert.equal(menuEvent?.sourceOperandId, "por.review.ecl-4.block-21.at-aa0a.operand-9");
assert.equal(realCatalog.resolve(menuEvent!).status, "resolved");

// A later print covered by an earlier joined narration unit is identified but
// suppressed by the catalog instead of attaching a second audio clip.
cpu.write16(cpu.ds, 0x494e, 0xa17a);
cpu.write8(bufferSegment, (bufferOffset + 0xa17a + 0x6700) & 0xffff, 0x11);
const continuationEvent = observer.observe(cpu);
assert.equal(continuationEvent?.sourceId, "por.review.ecl-4.block-21.at-a17a");
assert.equal(realCatalog.resolve(continuationEvent!).status, "continuation");

// ECL SAVE writes zero-terminated bytes. The display converts them to a Pascal string.
cpu.write8(cpu.ds, 0x52d4, 2);
cpu.write8(cpu.ds, 0x82a2, 20);
cpu.write16(cpu.ds, 0x494e, 0x9c2a);
cpu.write8(bufferSegment, (bufferOffset + 0x9c2a + 0x6700) & 0xffff, 0x12);
const orcs = " ORCS. ";
for (const [index, byte] of Buffer.from(`${orcs}\0`, "ascii").entries()) cpu.write16(variableSegment, variableOffset(0x9890 + index), byte);
const realDynamicEvent = observer.observe(cpu);
assert.equal(realDynamicEvent?.dynamicValue, orcs);
const realDynamicResolution = realCatalog.resolve(realDynamicEvent!);
assert.equal(realDynamicResolution.status, "resolved");
if (realDynamicResolution.status === "resolved") assert.match(realDynamicResolution.narration.asset, /-orcs\.mp3$/);
console.log("verified authored-menu operands, continuation suppression, and real dynamic variant selection");

// Static branch selectors use the VM state at the exact trigger, including
// explicit silent paths, menu output operands, and decisions only known later.
const selectObserver = new EclNarrationObserver(realManifest);
const selectCpu = new Cpu();
selectCpu.ds = 0x0740;
selectCpu.write16(selectCpu.ds, 0x493f, bufferOffset);
selectCpu.write16(selectCpu.ds, 0x4941, bufferSegment);
selectCpu.write16(selectCpu.ds, 0x493d, variableSegment);
const globalSegment = 0x3000;
const localSegment = 0x4000;
selectCpu.write16(selectCpu.ds, 0x4935, globalSegment);
selectCpu.write16(selectCpu.ds, 0x4939, localSegment);
const storeGlobal = (address: number, value: number) => selectCpu.write16(globalSegment, (0x6e00 + address * 2) & 0xffff, value);
const loadBlock = (archive: number, block: number) => {
  selectCpu.write8(selectCpu.ds, 0x52d4, archive);
  selectCpu.write8(selectCpu.ds, 0x82a2, block);
};
const reach = (address: number, opcode: number) => {
  selectCpu.write16(selectCpu.ds, 0x494e, address);
  selectCpu.write8(bufferSegment, (bufferOffset + address + 0x6700) & 0xffff, opcode);
  return selectObserver.observe(selectCpu);
};
const storeEclString = (address: number, value: string) => {
  for (const [index, byte] of Buffer.from(`${value}\0`, "ascii").entries()) selectCpu.write16(variableSegment, variableOffset(address + index), byte);
};
loadBlock(4, 2);
selectCpu.write16(localSegment, (0x6e7b * 2 + 0x2a00) & 0xffff, 255);
assert.equal(reach(0x9f6a, 0x12)?.unitId, "ecl4-b2-9f6a-9fca-9ff2-skullcrusher-present", "at-trigger memory selector");

loadBlock(1, 18);
storeGlobal(0x4a36, 0);
const staticRecording = reach(0xa14a, 0x12);
assert.equal(staticRecording?.unitId, "ecl1-b18-a14a-a165-a169-a197");
const staticResolution = realCatalog.resolve(staticRecording!);
assert.equal(staticResolution.status, "resolved", "a statically selected passage must have a complete recording");
if (staticResolution.status === "resolved") assert.match(staticResolution.narration.asset, /static-resolved\/ecl1-b18-a14a/);

loadBlock(5, 3);
storeEclString(0x980e, "A PATROL OF GIANTS LED BY A HUMAN FIGHTER");
storeGlobal(0x4a6a, 1);
const patrol = realCatalog.resolve(reach(0x9d1f, 0x12)!);
assert.equal(patrol.status, "resolved");
if (patrol.status === "resolved") {
  assert.match(patrol.narration.text, /^YOU SEE A PATROL /);
  assert.match(patrol.narration.text, /SACRILEGIOUS SCUM/);
}
storeGlobal(0x4a6a, 0);
storeGlobal(0x4a65, 1);
assert.equal(reach(0x9d1f, 0x12), undefined, "action:none must be explicitly silent");
assert.equal(reach(0x9df1, 0x29), undefined, "menu narration waits for the rendered operand");
assert.equal(selectObserver.observeMenuOperand(selectCpu, 10)?.unitId, "por.voice.ecl5.b3-9df1-operand-10");

loadBlock(1, 18);
assert.equal(reach(0x9d86, 0x29), undefined, "encounter menu narration waits for rendered text");
assert.equal(selectObserver.observeRenderedText(selectCpu, "THE MONSTERS PREPARE")?.unitId,
  "ecl1-b18-9d86-prepare", "rendered encounter-menu literal selects its complete recording");

loadBlock(7, 22);
assert.equal(reach(0x9a81, 0x12), undefined, "deferred opening must not play early");
const deferredEvent = reach(0x9aef, 0x11);
assert.equal(deferredEvent?.sourceId, "por.review.ecl-7.block-22.at-9a81");
assert.equal(deferredEvent?.unitId, "por.voice.ecl7.b22-9a81-9aef");
assert.equal(realCatalog.resolve(reach(0x9aef, 0x11)!).status, "continuation", "deferred passage must queue exactly once");
console.log("verified real immediate, explicit-none, selected-menu-operand, and deferred selectors");

loadBlock(3, 0);
assert.equal(reach(0xa413, 0x12), undefined, "the tavern tale number is rolled after the opening print");
selectCpu.write16(localSegment, (0x6e7e * 2 + 0x2a00) & 0xffff, 17);
const tale = realCatalog.resolve(reach(0xa438, 0x11)!);
assert.equal(tale.status, "resolved");
if (tale.status === "resolved") assert.match(tale.narration.text, /TAVERN TALE 17$/);

for (const [archive, block, slot, menuAddresses] of [
  [2, 20, 0x982c, [0x9cc5, 0x9d1d, 0x9d7e, 0x9dde]],
  [4, 10, 0x9890, [0xb4e9]],
  [8, 29, 0x982c, [0xa500, 0xa56b, 0xa5c4, 0xa627]]
] as const) {
  for (const address of menuAddresses) {
    const trigger = `por.review.ecl-${archive}.block-${block}.at-${address.toString(16)}`;
    const variants = realManifest.units.find(unit => unit.triggerSourceId === trigger)?.runtimeVariants;
    assert.equal(variants?.length, 3);
    for (const variant of variants!) {
      loadBlock(archive, block);
      storeEclString(slot, variant.dynamicValue);
      assert.equal(reach(address, 0x29), undefined, "do not speak until the menu draws the authored message");
      assert.equal(selectObserver.observeRenderedText(selectCpu, "THE MONSTERS PREPARE"), undefined);
      const event = selectObserver.observeRenderedText(selectCpu, variant.text);
      assert.equal(event?.operand, 9);
      assert.deepEqual(realCatalog.resolve(event!), { status: "resolved", narration: {
        unitId: event!.unitId, variantId: variant.id, triggerSourceId: trigger,
        coveredSourceIds: [trigger], asset: variant.asset, text: variant.text
      } });
      assert.equal(selectObserver.observeRenderedText(selectCpu, variant.text), undefined, "rendering twice must not repeat narration");
    }
  }
}
console.log("verified all 27 assembled encounter menu variants wait for actual rendered text");

for (const [entryAddress, number] of [[0x9b71, 42], [0xa713, 28], [0xa7f8, 16], [0xabaa, 20]] as const) {
  loadBlock(8, 13);
  const entrySource = `por.review.ecl-8.block-13.at-${entryAddress.toString(16)}`;
  const unit = realManifest.units.find(unit => unit.coveredSourceIds.includes(entrySource))!;
  assert.match(unit.spokenText, new RegExp(`UNDER ENTRY ${number}\\.`));
  assert.equal(reach(0xb512, 0x11), undefined, "shared journal prefix cannot select an entry by itself");
  const event = reach(entryAddress, 0x11);
  if (number === 28) assert.equal(realCatalog.resolve(event!).status, "resolved");
  else assert.equal(realCatalog.resolve(event!).status, "continuation", "already covered by the opening recording");
}

let confirmationAsset: string | undefined;
for (const [archive, block, address, expected] of [
  [3, 14, 0x9f26, /One of the party casts a Knock spell/],
  [5, 6, 0xa558, /One of the party doubles up in agony/],
  [5, 7, 0x9c69, /one of the party says/],
  [5, 7, 0x9cd0, /one of the party turns to stone/],
  [5, 7, 0xa738, /^How do you vote\?$/],
  [7, 23, 0xa4a7, /^Do you really mean that\?$/],
  [8, 13, 0x9ab7, /One of the party falls into a pool of water/],
  [8, 13, 0x9ad7, /Some items were lost while pulling them out/],
  [8, 16, 0xa0cf, /^Do you really mean that\?$/]
] as const) {
  loadBlock(archive, block);
  const narration = realCatalog.resolve(reach(address, 0x12)!);
  assert.equal(narration.status, "resolved");
  assert.match(narration.narration.text, expected);
  if (narration.narration.text === "Do you really mean that?") {
    confirmationAsset ??= narration.narration.asset;
    assert.equal(narration.narration.asset, confirmationAsset);
  }
}

loadBlock(1, 18);
for (const group of ["goblins", "orcs", "hobgoblins", "ogres"]) {
  storeEclString(0x9800, ` ${group.toUpperCase()}`);
  for (const count of [2, 19]) {
    selectCpu.write16(localSegment, (0x6e79 * 2 + 0x2a00) & 0xffff, count);
    const attack = realCatalog.resolve(reach(0xa0ab, 0x12)!);
    assert.equal(attack.status, "resolved");
    assert.equal(attack.narration.text, `Some ${group} rush to attack.`);
  }
  assert.equal(realCatalog.resolve(reach(0xa0af, 0x11)!).status, "continuation");
  assert.equal(realCatalog.resolve(reach(0xa0b3, 0x11)!).status, "continuation");
}
console.log("verified prerecorded replacements for party names, typed confirmations, and variable encounter counts");

// The proclamations at City Hall. The script prints the opening at ac22, and only then saves the
// one proclamation's number into 0x985e (ON GOSUB at ac69). The number of rewards collected,
// 0x4ac1, is known at the opening and decides both the branch and the number: the slot must not be
// read. It is left holding another passage's number here, as it would be in play.
loadBlock(3, 0);
const proclamationNumbers = ["CI.", "CXXVI AND CX.", "CXXXIV.", "CLIV.", "CXIV.", "CCIV.", "CXXIX.", "CCI.", "CXIV."];
for (const [rewards, number] of proclamationNumbers.entries()) {
  storeGlobal(0x4ac1, rewards + 1);
  storeEclString(0x985e, proclamationNumbers[(rewards + 4) % 8]!);
  const proclamation = realCatalog.resolve(reach(0xac22, 0x12)!);
  assert.equal(proclamation.status, "resolved", `the proclamation after ${rewards + 1} rewards has a recording`);
  if (proclamation.status === "resolved") assert.equal(proclamation.narration.text,
    `PROCLAMATIONS ARE POSTED ON THE WALLS, IN YOUR JOURNAL YOU NOTE PROCLAMATION${number}`, "the number comes from the rewards collected, not from the slot");
}
storeGlobal(0x4ac1, 0);
const proclamations = realCatalog.resolve(reach(0xac22, 0x12)!);
assert.equal(proclamations.status, "resolved");
if (proclamations.status === "resolved") assert.match(proclamations.narration.text, /PROCLAMATIONS LXIV, LXXVIII, CIX, AND LIX\.$/);
console.log("verified the proclamations are chosen by the rewards collected, with a stale number in the slot");

// The hirelings of the training block print two slots: the title and the price. The variant is the
// recording of the whole sentence the game prints. The prices are the ones the 1.3 script leaves in
// 0x9890 (9e3a to 9e9e): a SWORDSMAN, a HERO and a THEURGIST are offered with no pick of items,
// and their recordings say exactly that.
loadBlock(3, 11);
for (const [title, price, recorded] of [
  ["ACOLYTE", "1 SHARE", true], ["WARRIOR", "1 SHARE", true], ["EVOKER", "2 SHARES", true], ["SWORDSMAN", "3 SHARES ", true],
  ["ROBBER", "3 SHARES PLUS A PICK OF SPECIAL ITEMS", true], ["CURATE", "3 SHARES PLUS A PICK OF SPECIAL ITEMS", true],
  ["HERO", "4 SHARES ", true], ["THEURGIST", "4 SHARES ", true]
] as const) {
  storeEclString(0x982c, title);
  storeEclString(0x9890, price);
  const offer = realCatalog.resolve(reach(0x9eab, 0x12)!);
  if (!recorded) { assert.equal(offer.status, "not-found", `no recording says a ${title} joins for ${price.trim()} alone`); continue; }
  assert.equal(offer.status, "resolved", `the offer of a ${title} has a recording`);
  if (offer.status === "resolved") assert.equal(offer.narration.text, `'THERE IS A FINE ${title} WHO WILL JOIN YOU FOR ${price}. IS THIS ACCEPTABLE?'`);
}
console.log("verified the hireling offers are chosen by the whole sentence printed");
