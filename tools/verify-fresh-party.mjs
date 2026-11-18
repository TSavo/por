import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const names = ["alda", "brin", "cora", "dorn", "enna", "fenn"];
mkdirSync("out", { recursive: true });
const saveDir = mkdtempSync(join("out", "fresh-party-"));

async function replay(bootKeys, startAt, actions) {
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: {
      ...process.env, POR_PREGEN_PARTY: "0", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: saveDir,
      POR_BOOT_KEY_FILE: "", POR_BOOT_KEYS: bootKeys, POR_LIVE_AT: startAt, POR_BOOT_STEPS: "450000000",
    },
    stdio: ["pipe", "pipe", "inherit"],
  });
  const lines = createInterface({ input: runner.stdout });
  const iterator = lines[Symbol.asyncIterator]();
  let lastKey = "(boot)";
  const timer = setTimeout(() => runner.kill(), 90_000);
  async function nextFrame() {
    for (;;) {
      const { value, done } = await iterator.next();
      if (done) throw new Error("Runner stopped after " + lastKey);
      if (value.startsWith("entry:")) throw new Error(value);
      if (value.startsWith("POR_FRAME ")) return JSON.parse(value.slice(10));
    }
  }
  try {
    let frame = await nextFrame();
    for (const key of actions) {
      if (typeof key === "function") {
        key(visibleText(frame), frame);
        continue;
      }
      lastKey = key;
      runner.stdin.write(key + "\n");
      frame = await nextFrame();
    }
    return frame;
  } finally {
    clearTimeout(timer);
    lines.close();
    runner.kill();
  }
}

function visibleText(frame) {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return cells.join("").toLowerCase().replace(/ +/g, " ");
}

function expectParty(text) {
  for (const name of names) assert.match(text, new RegExp("\\b" + name + "\\b"));
}

const creation = names.flatMap((name, index) => [
  ...(index ? ["c"] : []),
  "enter", "enter", "enter", "enter", "enter", "y", ...name, "enter", "k", "e", "y",
]);
const added = ["a", "a", ...names.slice(1).flatMap(() => ["end", "a"])];
const tour = ["b", "enter", "enter", "enter", "y", ...Array(8).fill("enter")];
const camp = ["e", "s", "s", "a"];
const saved = await replay("31000000:1c0d,45000000:2e63", "50000000", [...creation, ...added, ...tour, ...camp]);
const savedText = visibleText(saved);
expectParty(savedText);
assert.match(savedText, /quit to dos/);
const slot = JSON.parse(readFileSync(join(saveDir, "A.json"), "utf8"));
assert.equal(Object.keys(slot.party).filter((name) => /\.SAV$/.test(name)).length, names.length);

const loadSlotA = "31000000:1c0d,45000000:266c,52000000:1e61";
const reloaded = await replay(loadSlotA, "85000000", ["up", "enter", "enter"]);
const reloadedText = visibleText(reloaded);
expectParty(reloadedText);
assert.match(reloadedText, /15,4 w/);
assert.match(reloadedText, /slums of phlan/);
const shopRoute = [
  "right", "right", "up", "up", "up", "enter", "right", ...Array(7).fill("up"),
  "left", ...Array(5).fill("up"), "y", "y",
];
const checkGear = (name) => (text) => {
  assert.ok(text.includes(`${name}'s items`), `Expected inventory for ${name}: ${text}`);
  assert.match(text, /yes hand axe.*yes chain mail/);
};
const shopForFighter = (index) => [
  // After the first purchase, the last shop page starts one row later.
  "b", "b", "n", "n", ...Array(index ? 13 : 14).fill("end"), "b", "e",
  "v", "i", "i", "r", "end", "r",
];
const closeInventory = ["e", "e", "e"];
const equipParty = names.flatMap((name, index) => [
  ...(index ? ["end"] : []),
  ...shopForFighter(index), checkGear(name), ...closeInventory,
]);
const saveEquipment = ["e", "e", "s", "s", "b"];
const equippedSave = await replay(loadSlotA, "85000000", [...shopRoute, ...equipParty, ...saveEquipment]);
assert.match(visibleText(equippedSave), /quit to dos/);
const equippedSlot = JSON.parse(readFileSync(join(saveDir, "B.json"), "utf8"));
for (const index of names.keys()) assert.ok(equippedSlot.party[`SAVE\\CHRDATB${index + 1}.ITM`]);

const loadSlotB = "31000000:1c0d,45000000:266c,52000000:3062";
const verifyReloadedGear = [
  "v", ...names.flatMap((name, index) => [
    ...(index ? ["end"] : []),
    "v", "i", "i", checkGear(name), "e", "e",
  ]),
];
const returnToSlums = [
  "right", "right", ...Array(5).fill("up"), "right", ...Array(7).fill("up"),
  "left", ...Array(4).fill("up"), "enter", "enter",
  (text) => {
    expectParty(text);
    assert.match(text, /15,4 w.*slums of phlan/);
  },
];
const slumsSave = await replay(loadSlotB, "85000000", [
  ...verifyReloadedGear, ...returnToSlums, "e", "s", "s", "c",
]);
assert.match(visibleText(slumsSave), /quit to dos/);
const slumsSlot = JSON.parse(readFileSync(join(saveDir, "C.json"), "utf8"));
for (const index of names.keys()) assert.ok(slumsSlot.party[`SAVE\\CHRDATC${index + 1}.ITM`]);
console.log("Created six characters, completed Rolf's tour, saved and reloaded, and entered the Slums.");
console.log("Bought and readied hand axes and chain mail for all six fighters, then verified the gear after reloading slot B.");
console.log("Returned to the Slums with the equipped party and saved at the gate in slot C.");

const loadSlotC = "31000000:1c0d,45000000:266c,52000000:2e63";
const battleSave = await replay(loadSlotC, "85000000", [
  ...Array(24).fill("up"),
  (text) => assert.match(text, /surprised a party of kobolds/),
  "c", "enter",
  (text) => assert.match(text, /hand axe.*move view aim use quick done/),
  ...Array(13).fill("q"),
  (text) => assert.match(text, /continue battle/),
  "n",
  (text) => assert.match(text, /the party has won.*receives 5 experience points/),
  "enter", "enter", "s", "e", "n", "e", "s", "s", "d",
]);
assert.match(visibleText(battleSave), /quit to dos/);
const loadSlotD = "31000000:1c0d,45000000:266c,52000000:2064";
const battleReload = await replay(loadSlotD, "85000000", [
  (text) => expectParty(text),
  "v", "v",
]);
assert.match(visibleText(battleReload), /alda.*copper 11.*exp 5.*armor chain mail/);
console.log("Won the kobold encounter and verified Alda's 5 XP and 11 copper after reloading slot D.");

const toOhlo = [
  "left", "up", "up", "up", "right", "up", "right", ...Array(5).fill("up"),
  "left", "up", "up", "up", "left", "up", "up", "right", "up", "left",
  ...Array(4).fill("up"), "left", "f", "left", ...Array(5).fill("up"),
  "right", "up", "up", "right", "up", "f", "right", "up",
  (text) => assert.match(text, /14,10 w.*locked.*bash/),
];
const acceptOhlo = [
  "b", "t", "t", "n", "a", "enter", "enter",
  (text) => assert.match(text, /14,10 e/),
];
const checkOhlo = (_text, frame) => {
  const quest = frame.journal?.leads.find((lead) => lead.id === "commission-ohlo");
  assert.equal(quest?.status, "accepted");
  assert.match(frame.journal.objective.nextStep, /rope guild.*ohlo/i);
};
const ohloSave = await replay(loadSlotD, "85000000", [
  ...toOhlo, ...acceptOhlo, "j", checkOhlo, "j", "e", "s", "s", "e",
]);
assert.match(visibleText(ohloSave), /quit to dos/);
const loadSlotE = "31000000:1c0d,45000000:266c,52000000:1265";
await replay(loadSlotE, "85000000", ["j", checkOhlo]);
console.log("Walked to Ohlo, accepted his commission and verified the journal directions after reloading slot E.");

const toRopeGuild = [
  "left", "up", "up", "left", ...Array(5).fill("up"), "right", ...Array(5).fill("up"),
  "right", "up", "left", "up", "left", "up", "up", "b", "left",
  "up", "up", "up", "up", "f", "up", "b", "up", "up", "right", "up", "up", "up",
  "left", "up", "left", "up", "right", "up", "f", "right", "up", "up",
  (text) => assert.match(text, /6,10 s.*north of the entry.*rope guild/),
];
const ropeGuildSave = await replay(loadSlotE, "85000000", [
  ...toRopeGuild, "e", "s", "s", "f",
]);
assert.match(visibleText(ropeGuildSave), /quit to dos/);
const loadSlotF = "31000000:1c0d,45000000:266c,52000000:2166";
await replay(loadSlotF, "85000000", [
  (text) => assert.match(text, /6,10 s/),
  "j",
  (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "ohlo-rope-guild-entry"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "ohlo-rope-guild"));
    assert.match(frame.journal.objective.nextStep, /go south into the building/i);
  },
  "j",
  "up", "j",
  (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "ohlo-rope-guild"));
    assert.match(frame.journal.objective.nextStep, /east side.*approach it from the west/i);
  },
]);
console.log("Reached the Rope Guild entrance, saved in slot F, and verified the journal update on entry.");
console.log("Replay save:", saveDir);
