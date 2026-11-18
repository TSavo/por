import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";

const names = ["alda", "brin", "cora", "dorn", "enna", "fenn"];
mkdirSync("out", { recursive: true });
const saveDir = mkdtempSync(join("out", "fresh-party-"));

async function replay(bootKeys, startAt, actions, checkpointDir = saveDir) {
  const runner = spawn(process.execPath, ["--import", "tsx", "tools/boot-translated.ts"], {
    env: {
      ...process.env, POR_PREGEN_PARTY: "0", POR_BROWSER_PLAY: "1", POR_SAVE_DIR: checkpointDir,
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

const createFighters = (roster) => roster.flatMap((name, index) => [
  ...(index ? ["c"] : []),
  "enter", "enter", "enter", "enter", "enter", "y", ...name, "enter", "k", "e", "y",
]);
const added = ["a", "a", ...names.slice(1).flatMap(() => ["end", "a"])];
const tour = ["b", "enter", "enter", "enter", "y", ...Array(8).fill("enter")];
const camp = ["e", "s", "s", "a"];
const saved = await replay("31000000:1c0d,45000000:2e63", "50000000", [...createFighters(names), ...added, ...tour, ...camp]);
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
const equipFighters = (roster) => roster.flatMap((name, index) => [
  ...(index ? ["end"] : []),
  ...shopForFighter(index), checkGear(name), ...closeInventory,
]);
const saveEquipment = ["e", "e", "s", "s", "b"];
const equippedSave = await replay(loadSlotA, "85000000", [...shopRoute, ...equipFighters(names), ...saveEquipment]);
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
const insideGuild = await replay(loadSlotF, "85000000", [
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
  "j", "up", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up",
  "right", "up", "up", "left", "up", "left", "up", "up",
  (text) => assert.match(text, /surprised a party of kobolds/),
  "f", "up", "e", "s", "s", "g",
]);
assert.match(visibleText(insideGuild), /quit to dos/);

const checkPotion = (_text, frame) => {
  const quest = frame.journal?.leads.find((lead) => lead.id === "commission-ohlo");
  assert.equal(quest?.status, "ready-to-report");
  assert.match(frame.journal.objective.nextStep, /take the package back to ohlo.*give/i);
};
const loadSlotG = "31000000:1c0d,45000000:266c,52000000:2267";
const potionSave = await replay(loadSlotG, "85000000", [
  "right", "up", "up", "left", "up", "right", "up", "up", "right", "up", "left", "up",
  "s", "s", "o", "h", "l", "o", "enter",
  (text) => assert.match(text, /returns with a package/),
  "j", checkPotion, "j", "enter", "e", "s", "s", "h",
]);
assert.match(visibleText(potionSave), /quit to dos/);
const loadSlotH = "31000000:1c0d,45000000:266c,52000000:2368";
const leaveBooth = await replay(loadSlotH, "85000000", [
  "j", checkPotion, "j",
  "right", "right", "up", "right", "up", "left", "up", "up", "left", "up",
  "right", "up", "up", "left", "up", "up", "right", "up", "right", "up", "up",
  "left", "up", "left", "f", "e", "s", "s", "i",
]);
assert.match(visibleText(leaveBooth), /quit to dos/);
console.log("Walked to the Rope Guild booth, picked up Ohlo's potion and verified the return objective after reloading slot H.");

function checkOhloStatus(frame, status) {
  const quest = frame.journal?.leads.find((lead) => lead.id === "commission-ohlo");
  assert.equal(quest?.status, status);
}
const loadSlotI = "31000000:1c0d,45000000:266c,52000000:1769";
const rewardSave = await replay(loadSlotI, "85000000", [
  "left", "up", "up", "right", "up", "up", "right", ...Array(6).fill("up"),
  "left", "up", "right", "up", "right", "up", "b", "up", "up", "left",
  ...Array(5).fill("up"), "right", "up", "up", "right", "right", "f",
  "right", "up", "right", "up", "left", ...Array(5).fill("up"), "left", "f",
  "right", "right", "right", ...Array(5).fill("up"), "right", "up", "up", "right", "up", "b",
  "g", (text) => assert.match(text, /give me the potion/),
  "g", (text) => assert.match(text, /receives 691 experience points/),
  "j", (_text, frame) => checkOhloStatus(frame, "reward-pending"), "j",
  "enter", "enter", "s", "e", "n", "e", "f", "e", "s", "s", "j",
]);
assert.match(visibleText(rewardSave), /quit to dos/);
const loadSlotJ = "31000000:1c0d,45000000:266c,52000000:246a";
await replay(loadSlotJ, "85000000", [
  "j",
  (_text, frame) => {
    checkOhloStatus(frame, "turned-in");
    assert.ok(frame.journal.leads.some((lead) => lead.id === "ohlo-delivered"));
  },
  "j", "v", "v",
  (text) => assert.match(text, /alda.*exp 696/),
]);
console.log("Returned the potion, collected Ohlo's reward and verified the journal and XP after reloading slot J.");

const backToNewPhlan = [
  "left", "up", "up", "left", ...Array(5).fill("up"), "right", ...Array(5).fill("up"),
  "right", "up", "left", "up", "right", "up", "up", "up", "right", ...Array(4).fill("up"),
  "f", "up", "up", "up", "left", "up", "left", "up", "up", "up", "right", "right", "f", "right", "up",
  "up", "enter", "enter",
  (text) => assert.match(text, /0,4 e/),
];
const hearCouncil = [
  "up", "up", "up", "enter", "up", "up", "up", "up", "left", "up", "up",
  "enter", "enter", "enter",
  (text) => assert.match(text, /sokal keep on thorn island must be cleared/),
  "enter", "enter",
];
const takeBoat = [
  "right", "right", "up", "right", "up", "up", "enter", "enter", "right",
  ...Array(6).fill("up"), "left", "up", "right", "up", "left", "up", "enter", "enter",
  (text) => assert.match(text, /only boat.*sokal keep.*end of the pier/),
  "right", ...Array(4).fill("up"), "enter", "enter", "enter",
  (text) => assert.match(text, /boat disembarks you at sokal keep/),
  "enter", "enter",
];
const checkSokal = (_text, frame) => {
  const leads = frame.journal?.leads ?? [];
  assert.ok(leads.some((lead) => lead.id === "commission-sokal"));
  assert.ok(leads.some((lead) => lead.id === "sokal-arrival"));
  assert.ok(leads.some((lead) => lead.id === "commission-ohlo" && lead.status === "turned-in"));
};
const sokalSave = await replay(loadSlotJ, "85000000", [
  ...backToNewPhlan, ...hearCouncil, ...takeBoat,
  "j", checkSokal, "j", "e", "s", "s", "a",
]);
assert.match(visibleText(sokalSave), /quit to dos/);
await replay(loadSlotA, "85000000", [
  (text) => {
    expectParty(text);
    assert.match(text, /8,14 n/);
  },
  "j", checkSokal,
]);
console.log("Heard the council's commissions, took the boat to Sokal Keep and reloaded the arrival in slot A.");

const parchmentSave = await replay(loadSlotA, "85000000", [
  "up", (text) => assert.match(text, /gates of sokal keep.*west rises a mound of reeds/),
  "j", (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "sokal-reeds"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "sokal-parchment"));
  }, "j",
  "left", "up", "up", "enter", "enter",
  (text) => assert.match(text, /what do you do\?.*leave search attack talk/),
  "end", "enter",
  (text) => assert.match(text, /crumbling parchment scroll/),
  "enter",
  (text, frame) => {
    assert.match(text, /last part is eaten away/);
    assert.ok(!frame.text.some(([cell]) => cell % 40 >= 1 && cell % 40 < 16 &&
      Math.floor(cell / 40) >= 1 && Math.floor(cell / 40) < 16));
  },
  "enter", "enter",
  "e", "s", "s", "b",
]);
assert.match(visibleText(parchmentSave), /quit to dos/);
await replay(loadSlotB, "85000000", [
  (text) => assert.match(text, /6,13 w/),
  "j", (_text, frame) => {
    checkSokal("", frame);
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "sokal-parchment"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "sokal-pale-form"));
  },
]);
console.log("Searched the reeds, found the parchment and verified its journal entry after reloading slot B.");
const patrolSave = await replay(loadSlotB, "85000000", [
  "right", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "left",
  (text) => assert.match(text, /pack of undead suddenly appears.*parlay/),
  "p", "n", ..."shestni", "enter",
  (text) => assert.match(text, /the undead leave/),
  "e", "s", "s", "c",
]);
assert.match(visibleText(patrolSave), /quit to dos/);
await replay(loadSlotC, "85000000", [
  (text) => assert.match(text, /10,10 n/),
  "j", (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "sokal-parchment"));
    assert.ok(frame.journal.leads.some((lead) => lead.id === "sokal-patrol-passed"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "sokal-pale-form"));
  },
]);
console.log("Passed the undead patrol in Sokal Keep and verified the journal after reloading slot C.");
const armorySave = await replay(loadSlotC, "85000000", [
  "up", "up", "up", "right", "up", "up", "up", "b",
  (text) => assert.match(text, /do you give the password/),
  "y", (text) => assert.match(text, /the undead leave/),
  "up", "left", "up", "right", "up", "left",
  (text) => assert.match(text, /croaking rises in volume/),
  "w", "enter", ...Array(81).fill("q"),
  (text) => assert.match(text, /continue battle/),
  "n", (text) => assert.match(text, /party has won.*receives 31 experience points/),
  "enter", "enter", "e", "n", "left", "up",
  (text) => assert.match(text, /14,5 n.*keep's old armory/),
  "enter", "enter", "e", "s", "s", "d",
]);
assert.match(visibleText(armorySave), /quit to dos/);
await replay(loadSlotD, "85000000", [
  (text) => {
    expectParty(text);
    assert.match(text, /14,5 n/);
  },
  "j", (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "sokal-old-armory"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "sokal-armory"));
  },
]);
console.log("Passed a second undead patrol, won the frog encounter and reloaded in Sokal's old armory.");
const equipmentSave = await replay(loadSlotD, "85000000", [
  "up", "up", "up", "right", "up", "left", "up",
  (text) => assert.match(text, /passing through an illusionary wall.*glow in the northwestern corner/),
  "left", "up", "up", "up", "right", "up",
  (text) => assert.match(text, /on stands are a shield, a mace, a sword.*do you take it/),
  "y", (text) => assert.match(text, /receives 400 experience points/),
  "enter", "enter", "end", "t", "t", "t", "t", "t", "e", "e", "enter", "s", "e",
]);
assert.match(visibleText(equipmentSave), /quit to dos/);
const readiedArmoryGear = await replay(loadSlotE, "85000000", [
  (text) => assert.match(text, /12,0 n/),
  "j", (_text, frame) => {
    assert.ok(frame.journal?.leads.some((lead) => lead.id === "sokal-hidden-armory"));
    assert.ok(!frame.journal.leads.some((lead) => lead.id === "sokal-ferran"));
  }, "j",
  "end", "v", "i", "i",
  (text) => assert.match(text, /brin's items.*shield.*long sword.*mace/),
  "end", "r", "end", "r", "end", "end", "t", "end", "enter",
  "e",
  (text) => assert.match(text, /brin.*ac 1.*thac0 19.*damage 1d8\+1.*weapon long sword/),
  "e", "end", "v", "i", "end", "r", "e",
  (text) => assert.match(text, /cora.*thac0 18.*damage 1d6\+3.*weapon mace/),
  "e", "e", "s", "s", "f",
]);
assert.match(visibleText(readiedArmoryGear), /quit to dos/);
await replay(loadSlotF, "85000000", [
  "end", "v", "i",
  (text) => assert.match(text, /brin's items.*yes shield.*yes long sword/),
  "e", "e", "end", "v", "i",
  (text) => assert.match(text, /cora's items.*yes mace/),
]);
console.log("Found the hidden armory, collected its equipment, and verified Brin's inventory after reloading slot E.");
console.log("Readied Brin's sword and shield, traded the mace to Cora, and verified both loadouts after reloading slot F.");
const templeSave = await replay(loadSlotF, "85000000", [
  "right", "right", "up", "left", "up", "up", "up", "right", "up", "right", "up", "left",
  ...Array(4).fill("up"), "right", "up", "left", "up", "right", "up", "up", "up", "left",
  ...Array(4).fill("up"), "y", "up", "up", "right", "up", "up", "left", ...Array(5).fill("up"),
  (text) => assert.match(text, /take a boat back to phlan/),
  "y", "y", "enter", "enter", "enter",
  (text) => assert.match(text, /15,1 w/),
  ...Array(4).fill("up"), "left", "up", "up", "y", "y",
  (text) => assert.match(text, /heal view pool appraise exit/),
  ...Array(4).fill("home"), "h", "end", "end", "h",
  (text) => assert.match(text, /cure light wounds will only cost 100 gold pieces/),
  "y", "e", "e", "e", "s", "s", "g",
]);
assert.match(visibleText(templeSave), /quit to dos/);
await replay(loadSlotG, "85000000", [
  (text) => {
    assert.match(text, /11,3 s/);
    assert.match(text, /brin 1 6/);
  },
  "end", "v",
  (text) => assert.match(text, /brin.*platinum 7.*hp 6.*weapon long sword/),
]);
console.log("Returned to New Phlan and verified Brin's paid temple healing after reloading slot G.");
const courtyardDefeat = await replay(loadSlotG, "85000000", [
  "right", "right", "up", "up", "enter", "enter", "right", ...Array(4).fill("up"),
  ...Array(5).fill("enter"),
  (text) => assert.match(text, /8,14 n/),
  "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
  (text) => assert.match(text, /pack of undead suddenly appears.*parlay/),
  "p", "n", ..."shestni", "enter",
  (text) => assert.match(text, /the undead leave/),
  ...Array(4).fill("up"), "left", "up", "up", "enter",
  (text) => assert.match(text, /large force of orcs and hobgoblins rushes you/),
  "enter", "enter", "enter", "q",
  (text) => assert.match(text, /brin hitpoints 6 ac 1 long sword/),
  ...Array(301).fill("q"),
]);
assert.match(visibleText(courtyardDefeat), /the monsters rejoice for the party has been destroyed/);
await replay(loadSlotG, "85000000", [
  (text) => assert.match(text, /brin 1 6.*11,3 s/),
  "j", (_text, frame) => {
    checkSokal("", frame);
    assert.ok(frame.journal.leads.some((lead) => lead.id === "commission-sokal" && lead.status === "offered"));
  },
]);
console.log("Replayed the Sokal courtyard defeat and reloaded the party and outstanding commission from slot G.");

const recruitSave = await replay(loadSlotG, "85000000", [
  "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
  "enter", "enter", "enter", "n",
  "left", "up", "right", "up", "up", "up", "enter", "enter", "n",
  (text) => assert.match(text, /do you seek a partner for your adventuring/),
  "y", ...Array(5).fill(["n", "y"]).flat(),
  (text) => assert.match(text, /a fine evoker who will join you for 2 shares/),
  "y", "n",
  (text) => assert.match(text, /evoker 9 6.*7,1 w/),
  // Slot H's earlier checkpoint has already been verified.
  "e", "s", "s", "h",
]);
assert.match(visibleText(recruitSave), /quit to dos/);
await replay(loadSlotH, "85000000", [
  (text) => {
    expectParty(text);
    assert.match(text, /evoker 9 6.*7,1 w/);
  },
  ...Array(6).fill("end"), "c",
  (text) => assert.match(text, /evoker's spells in memory.*sleep sleep/),
  "enter",
  (text) => assert.match(text, /sleep is a combat-only spell.*lose it/),
  "n",
  (text) => assert.match(text, /evoker's spells in memory.*sleep sleep/),
]);
console.log("Hired an evoker and verified his two memorized Sleep spells after reloading slot H.");
const evokerTurn = await replay(loadSlotH, "85000000", [
  "right", "right", "up", "up", "left", "up", "enter", "enter", "enter", "n",
  "right", "up", "enter", "enter", "right", "up", "up", "left", "up", "left", "up",
  "enter", "enter", "right", ...Array(4).fill("up"), ...Array(5).fill("enter"),
  (text) => assert.match(text, /evoker 9 6.*8,14 n/),
  "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
  "p", "n", ..."shestni", "enter",
  (text) => assert.match(text, /the undead leave/),
  "up", "left", ...Array(6).fill("up"), "enter", "y",
  "up", "enter", "enter", "y", "left", "up", "up", "enter", "y", "up", "enter",
  (text) => assert.match(text, /large force of orcs and hobgoblins rushes you/),
  ...Array(4).fill("enter"), ...Array(117).fill("d"),
]);
assert.match(visibleText(evokerTurn), /evoker hitpoints 6 ac 9/);
console.log("Returned to Sokal Keep with the evoker and reached his first courtyard combat turn.");

const spellSaveDir = mkdtempSync(join("out", "fresh-spell-party-"));
const mageCreation = [
  "c", ...Array(5).fill("end"), "enter", "enter", "end", "end",
  "enter", "enter", "enter", "y", ..."mira", "enter", "k", "e", "y",
];
const mixedParty = await replay("31000000:1c0d,45000000:2e63", "50000000", [
  ...createFighters(names.slice(0, -1)), ...mageCreation, ...added, ...tour, ...camp,
], spellSaveDir);
assert.match(visibleText(mixedParty), /alda.*brin.*cora.*dorn.*enna.*mira.*quit to dos/);
const memorizeSleep = [
  "m", "m",
  (text) => assert.match(text, /mira's spells in spell book.*sleep.*can memorize: magic-user spells: 1/),
  ...Array(4).fill("end"), "m", "e", "enter",
  (text) => assert.match(text, /\*sleep.*memorize these spells/),
  "y", "r", "r",
];
const readySpell = await replay(loadSlotA, "85000000", [
  "up", "enter", "enter", "enter", "e", "enter", ...Array(5).fill("end"), ...memorizeSleep,
  (text) => assert.match(text, /15,4 w 04:15/),
  "e", "s", "s", "b",
], spellSaveDir);
assert.match(visibleText(readySpell), /quit to dos/);
const afterSpell = await replay(loadSlotB, "85000000", [
  ...Array(24).fill("up"), "c", "enter", "d", "d", "c",
  (text) => assert.match(text, /mira's spells in memory.*sleep/),
  "enter", ...Array(5).fill("n"),
  (text) => assert.match(text, /kobold hitpoints.*spell:sleep.*target/),
  "t", ...Array(8).fill("q"), "n",
  (text) => assert.match(text, /the party has won.*receives 5 experience points/),
  "enter", "enter", "s", "e", "n", "e", "s", "s", "c",
], spellSaveDir);
assert.match(visibleText(afterSpell), /quit to dos/);
await replay(loadSlotC, "85000000", [
  ...Array(5).fill("end"), "v",
  (text) => assert.match(text, /mira.*exp 5.*view:trade drop exit/),
  "e", "e", "enter", ...memorizeSleep,
  (text) => assert.match(text, /14,4 w 08:33/),
  "c",
  (text) => assert.match(text, /mira's spells in memory.*sleep/),
], spellSaveDir);
console.log("Cast Sleep at a kobold, won the encounter, and verified that reloading kept Sleep spent until the magic-user memorized it and rested again.");

const mixedEquipment = await replay(loadSlotC, "85000000", [
  "right", "right", "up", "up", "enter", "enter",
  (text) => assert.match(text, /0,4 e/),
  ...shopRoute.slice(2), ...equipFighters(names.slice(0, -1)),
  "e", "e", "s", "s", "d",
], spellSaveDir);
assert.match(visibleText(mixedEquipment), /quit to dos/);
const mixedArrival = await replay(loadSlotD, "85000000", [
  (text) => assert.match(text, /alda 5 6.*brin 3 6.*cora 5 6.*dorn 5 8.*enna 4 6.*mira 10 5.*8,11 e/),
  "right", "right", ...Array(5).fill("up"), "right", ...Array(7).fill("up"),
  "right", ...hearCouncil.slice(3), ...takeBoat, "e", "s", "s", "e",
], spellSaveDir);
assert.match(visibleText(mixedArrival), /8,14 n.*quit to dos/);
const islandCamp = await replay(loadSlotE, "85000000", [
  ...Array(5).fill("end"), "e", "enter", ...memorizeSleep,
  (text) => assert.match(text, /8,14 n 09:20/),
  "e", "s", "s", "f",
], spellSaveDir);
assert.match(visibleText(islandCamp), /quit to dos/);
await replay(loadSlotF, "85000000", [
  "j", (_text, frame) => {
    assert.ok(frame.journal?.leads.some(({ id }) => id === "commission-sokal"));
    assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-arrival"));
  }, "j",
  ...Array(5).fill("end"), "c",
  (text) => assert.match(text, /mira's spells in memory.*sleep/),
], spellSaveDir);
console.log("Equipped the mixed party, sailed to Sokal Keep, and reloaded at the landing with Sleep prepared.");
const mixedParchmentRoute = [
  "up", "left", "up", "up", "enter", "enter", "end", "enter",
  (text) => assert.match(text, /crumbling parchment scroll/),
  "enter", "enter", "enter",
  "right", "right", "up", "up", "left", "up", "up", "right", "up", "up",
  "left", "up", "up", "left",
  (text) => assert.match(text, /pack of undead suddenly appears.*parlay/),
  "p", "n", ..."shestni", "enter",
  (text) => assert.match(text, /the undead leave/),
  ...Array(5).fill("up"),
];
await replay(loadSlotF, "85000000", [
  ...mixedParchmentRoute, "left", "up", "up", "enter",
  (text) => assert.match(text, /large force of orcs and hobgoblins rushes you/),
  ...Array(5).fill("enter"), ...Array(12).fill("space"),
  (text) => assert.match(text, /mira hitpoints 5 ac 10.*cast quick done/),
  "c",
  (text) => assert.match(text, /mira's spells in memory.*sleep/),
  "enter", ...Array(5).fill("n"),
  (text) => assert.match(text, /orc hitpoints.*spell:sleep.*target/),
  "t",
  (text) => assert.match(text, /orc leader hitpoints.*aim:next/),
  ...Array(11).fill("q"),
  (text) => assert.match(text, /cora hitpoints 6 ac 5.*hand axe.*quick done/),
  "d",
  (text) => assert.match(text, /cora hitpoints.*guard delay quit bandage speed exit/),
  "b",
  (text) => assert.match(text, /orc leader hitpoints/),
  "enter",
  (text) => assert.match(text, /orc hitpoints/),
], spellSaveDir);
console.log("Cleared Quick, cast Sleep, and used Cora's Bandage action in the Sokal courtyard.");
await replay(loadSlotF, "85000000", [
  ...mixedParchmentRoute, "right", "up", "right", "up", "enter", "enter",
  (text) => assert.match(text, /11,6 s.*do you give the password/),
  "y", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up", "left",
  (text) => assert.match(text, /the croaking rises in volume/),
  "w", "enter", ...Array(51).fill("q"),
  (text) => assert.match(text, /continue battle/),
  "n",
  (text) => assert.match(text, /the party has won.*receives 31 experience points/),
  "enter", "enter", "s", "e", "n", "left", ...Array(4).fill("up"),
  "left", ...Array(6).fill("up"), "left", "up", "up", "enter",
  (text) => assert.match(text, /8,4 s.*large force of orcs and hobgoblins rushes you/),
], spellSaveDir);
console.log("Won the smithy frog fight and triggered the courtyard ambush from the north.");
console.log("Replay save:", saveDir);
console.log("Mixed-party save:", spellSaveDir);
