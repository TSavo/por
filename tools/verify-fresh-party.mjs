import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createInterface } from "node:readline";
import { tsImport } from "tsx/esm/api";

const names = ["alda", "brin", "cora", "dorn", "enna", "fenn"];
mkdirSync("out", { recursive: true });
const saveDir = mkdtempSync(join("out", "fresh-party-"));
const strictCombat = process.env.POR_REQUIRE_UNINTERRUPTED_COMBAT === "1";
const recoveryCounts = new Map();

async function replay(bootKeys, startAt, actions, checkpointDir = saveDir, stopAt) {
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
  let lastText = "";
  let actionNumber = 0;
  const timer = setTimeout(() => runner.kill(), 90_000);
  async function nextFrame() {
    for (;;) {
      const { value, done } = await iterator.next();
      if (done || value.startsWith("entry:")) {
        throw new Error(`${done ? "Runner stopped" : value} after input ${actionNumber} (${lastKey})\n${lastText.trim()}`);
      }
      if (value.startsWith("POR_NOTICE ")) {
        const notice = value.slice("POR_NOTICE ".length);
        recoveryCounts.set(notice, (recoveryCounts.get(notice) ?? 0) + 1);
        if (strictCombat) {
          throw new Error(`Combat watchdog intervened after input ${actionNumber} (${lastKey}): ${notice}\n${lastText.trim()}`);
        }
      }
      if (value.startsWith("POR_FRAME ")) {
        const frame = JSON.parse(value.slice(10));
        lastText = visibleText(frame);
        return frame;
      }
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
      actionNumber++;
      runner.stdin.write(key + "\n");
      frame = await nextFrame();
      if (stopAt?.test(lastText)) break;
    }
    return frame;
  } finally {
    clearTimeout(timer);
    lines.close();
    runner.kill();
  }
}

process.on("exit", () => {
  for (const [notice, count] of recoveryCounts) {
    console.warn(`Combat watchdog interventions (${count}): ${notice}`);
  }
});

function visibleText(frame) {
  const cells = Array(1000).fill(" ");
  for (const [cell, character] of frame.text) cells[cell] = String.fromCharCode(character);
  return cells.join("").toLowerCase().replace(/ +/g, " ");
}

function expectParty(text) {
  for (const name of names) assert.match(text, new RegExp("\\b" + name + "\\b"));
}

function loadSlot(key) {
  return `31000000:1c0d,45000000:266c,52000000:${key}`;
}

async function verifySokalSmithy(checkpoint) {
  const directory = mkdtempSync(join("out", "sokal-smithy-"));
  copyFileSync(checkpoint, join(directory, "D.json"));
  await replay(loadSlot("2064"), "85000000", [
    (text) => assert.match(text, /14,5 n/),
    "j", (_text, frame) => assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-smithy-hammer")), "j",
    "right", "right", "up", "left", "up", "s", "l",
    (text) => assert.match(text, /15,6 e.*one old hammer.*do you take it/),
    "y", (text) => assert.match(text, /receives 80 experience points/),
    "enter", "enter", ...Array(5).fill("end"), "t",
    (text) => assert.match(text, /loot hammer/),
    "t", "e", "s", ...Array(6).fill("end"), "v", "i", "end", "r", "e",
    (text) => assert.match(text, /fenn.*thac0 19.*damage 1d4\+2.*weapon hammer/),
    "e", "e", "s", "s", "e",
  ], directory);
  await replay(loadSlot("1265"), "85000000", [
    "j", (_text, frame) => assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-smithy-hammer")), "j",
    ...Array(5).fill("end"), "v", "i",
    (text) => assert.match(text, /fenn's items.*yes hammer/),
  ], directory);
  console.log("Found and readied the smithy hammer, then reloaded its journal entry and Fenn's inventory.");
}

const courtyardOpening = [
  "right", "right", "up", "up", "right", "up", "left", "up", "up", "right", ...Array(4).fill("up"),
  ...Array(7).fill("end"), "c",
  (text) => assert.match(text, /curate's spells in memory.*bless bless/),
  ...Array(8).fill("home"), "enter", "e", "e", "enter", "m", "d",
  (text) => assert.match(text, /alda bless brin bless cora bless dorn bless enna bless mira bless/),
  "enter", "e", "e", "up", "left", "enter", "enter",
];

async function verifyUninterruptedCourtyard(checkpoint) {
  copyFileSync(checkpoint, join(saveDir, "F.json"));
  const recoveries = [...recoveryCounts.values()].reduce((sum, count) => sum + count, 0);
  const victory = await replay(loadSlot("2166"), "85000000", [
    ...courtyardOpening, ...Array(8).fill("q"), "space",
    (text) => assert.match(text, /mira hitpoints 5.*move view aim cast/),
    "c", "enter", ...Array(11).fill("n"),
    (text) => assert.match(text, /hobgoblin ldr hitpoints.*spell:sleep.*target/),
    "t", ...Array(67).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", "enter",
    (text) => assert.match(text, /the party has won.*receives 54 experience points/),
    "enter", "s", "e", "n",
    (text) => assert.match(text, /drum has faded to silence/),
    "e", "s", "s", "j",
  ]);
  assert.match(visibleText(victory), /quit to dos/);
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /alda 3 6.*brin 1 1.*mira 10 0.*4,10 s/),
    "j", (_text, frame) => assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-courtyard-cleared")), "j",
    ...Array(7).fill("end"), "c",
    (text) => assert.match(text, /curate's spells in memory.*bless(?: cure light wounds){3}/),
    ...Array(4).fill("home"), "enter", "home", "home", "enter", // Mira
    "home", "home", "enter", ...Array(4).fill("home"), "enter", // Brin
    "home", "home", "enter", "end", "enter", "e", // Cora
    (text) => assert.match(text, /brin 1 6.*cora 3 6.*mira 10 5/),
    "e", "m", "m", "home", "home", "m", ...Array(4).fill("end"), "m", "e", "enter",
    (text) => assert.match(text, /mira's spells to be memorized.*\*sleep/),
    "y", "r", "r", "e", "e",
    "left", "up", "right", ...Array(4).fill("up"), "left", "up",
    (text) => assert.match(text, /6,14 e.*skullcrusher was here.*north wall/),
    "e", "s", "s", "g",
  ]);
  const opened = await replay(loadSlot("2267"), "85000000", [
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-skullcrusher-mark"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    }, "j",
    "right", "right", "up", "right", "up", "left", "up", "up",
    (text) => assert.match(text, /4,13 w.*locked.*bash knock exit/),
    "k",
    (text) => assert.match(text, /3,13 w/),
    "e", "s", "s", "b",
  ]);
  assert.match(visibleText(opened), /quit to dos/);
  await replay(loadSlot("3062"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*cora 3 6.*mira 10 5.*3,13 w/),
    ...Array(5).fill("end"), "c",
    (text) => assert.match(text, /mira's spells in memory.*sleep/),
    "e",
  ]);
  const prisoner = await replay(loadSlot("3062"), "85000000", [
    ...Array(7).fill("end"), "c", "home", "home", "enter", "e",
    "e", "a", "a", "o", "enter", ...Array(7).fill("home"), "enter",
    (text) => assert.match(text, /name ac hp curate 3 21 alda/),
    "e", "e", "e", "left", "up", "b", "enter", "c", "enter", "enter",
    ...Array(10).fill("q"),
    (text) => assert.match(text, /mira hitpoints 5.*move view aim cast/),
    "c", "enter", ...Array(20).fill("n"),
    (text) => assert.match(text, /hobgoblin ldr hitpoints.*long bow spell:sleep.*target/),
    "t", ...Array(85).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", "enter",
    (text) => assert.match(text, /the party has won.*receives 94 experience points/),
    "enter", "enter", "end", "t", "i",
    (text) => assert.match(text, /loot long sword.*items: take exit/),
    "t", "e", "e",
    // The first two entries left in the loot list are bows.
    ...Array.from({ length: 4 }, () => ["end", "t", "i", "end", "end", "t", "e", "e"]).flat(),
    "e", "n", "right", "up", "left", "up", "b", "enter",
    (text) => assert.match(text, /2,15 s.*muscular man locked in chains.*entry 47/),
    "enter", "f", "u",
    (text) => assert.match(text, /you have no key to unlock the padlocks/),
    "enter", "l", "e", "s", "s", "e",
  ]);
  assert.match(visibleText(prisoner), /2,15 s.*quit to dos/);
  await replay(loadSlot("1265"), "85000000", [
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-prison-key-needed"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    }, "j",
  ]);
  const templeSave = await replay(loadSlot("1265"), "85000000", [
    "e", "m", "m", "m", "n", ...Array(12).fill("end"), ...Array(7).fill("home"), "m", "m", "p",
    ...Array(15).fill("home"), "end", "end", "m", "end", "end", "m", "m", "m", "m", "e", "enter",
    (text) => assert.match(text, /memorized.*\*bless(?: \*cure light wounds){4}.*\*hold person \*hold person/),
    "y", "r", "r", "n", "n", "c",
    "end", "enter", // Bless
    "end", "enter", "end", "end", "enter", // Brin
    "end", "enter", "end", "enter", // Cora
    "end", "enter", "end", "end", "enter", // Enna
    "end", "enter", "end", "enter", // Mira
    "e", "e", "e",
    (text) => assert.match(text, /brin 1 6.*cora 3 1.*enna 2 5.*mira 10 5/),
    ...names.slice(0, 5).flatMap((name) => [
      "end", "v", "i", "end", "end", "end", "r",
      (text) => assert.match(text, new RegExp(`${name}'s items.*yes long sword`)),
      "e", "e",
    ]),
    "right", "right", "up", "up", "b",
    (text) => assert.match(text, /2,13 n.*blood smeared/),
    "e", "s", "s", "i",
  ]);
  assert.match(visibleText(templeSave), /quit to dos/);
  await replay(loadSlot("1769"), "85000000", names.slice(0, 5).flatMap((name) => [
    "end", "v", "i",
    (text) => assert.match(text, new RegExp(`${name}'s items.*yes long sword`)),
    "e", "e",
  ]));
  const templePreparation = [
    "e", "m", "m", "m", "end", "m", "end", "end", "m", "m", "m", "m", "e", "enter",
    (text) => assert.match(text, /memorized.*\*bless(?: \*cure light wounds){4}/),
    "y", ...Array(6).fill("end"), "m", ...Array(4).fill("end"), "m", "e", "enter",
    (text) => assert.match(text, /mira's spells to be memorized.*\*sleep/),
    "y", "r", "r", "n", "n", "end", "end", "c",
    "end", "enter", // Bless
    "end", "enter", "end", "enter", // Alda
    "end", "enter", "end", "end", "enter", // Cora
    "end", "enter", "end", "enter", // Dorn
    "end", "enter", ...Array(4).fill("home"), "enter", // Curate
    "e", "e", "e",
    (text) => assert.match(text, /curate 3 15.*alda 3 6.*brin 1 6.*cora 3 6.*dorn 3 5.*2,13 n/),
  ];
  await replay(loadSlot("1769"), "85000000", [
    ...templePreparation,
    "up", "enter", "enter",
    (text) => assert.match(text, /2,12 n.*i am the mighty grishnak/),
    "enter", "enter", "space",
    (text) => assert.match(text, /enna hitpoints 5.*long sword.*move view aim/),
    "a", ...Array(11).fill("n"), "t",
    (text) => {
      assert.match(text, /grishnak hitpoints 24.*range = 3.*aim:next/);
      assert.doesNotMatch(text, /manual target/);
    },
    "e", "m",
    (text) => assert.match(text, /enna hitpoints.*move\/attack, move left = 9/),
    "up",
    (text) => assert.match(text, /attack ally: yes no/),
    "n",
    (text) => assert.match(text, /enna hitpoints.*move\/attack, move left = 9/),
    "down",
    (text) => assert.match(text, /enna hitpoints.*move\/attack, move left = 8/),
    "escape", "d",
    (text) => assert.match(text, /enna hitpoints.*guard delay quit/),
    "g",
    (text) => assert.match(text, /brin hitpoints 6.*long sword.*move view aim/),
  ]);
  await replay(loadSlot("1769"), "85000000", [
    ...templePreparation,
    "right", "right", "up", "b", "left", "up", "left", "up", "b", "right", "up", "b",
    "left", "up", "up", "left", "up", "enter", "enter",
    (text) => assert.match(text, /3,11 w.*i am the mighty grishnak/),
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-grishnak"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    }, "track 3", (_text, frame) => {
      assert.equal(frame.journal?.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /overcome grishnak/i);
    }, "j",
  ]);
  assert.equal([...recoveryCounts.values()].reduce((sum, count) => sum + count, 0), recoveries);
  console.log("Won the courtyard and prison without watchdog intervention, then reached Grishnak's temple:", saveDir);
}

async function verifyPodalFromCouncil(checkpoint) {
  copyFileSync(checkpoint, join(saveDir, "H.json"));
  const load = loadSlot;
  const checkAuction = (status) => (_text, frame) =>
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-auction")?.status, status);
  const sailWest = (payerSelection = []) => [
    (text) => assert.match(text, /sokal east west bay none/),
    "w", ...payerSelection, "enter", "enter", "right", ...Array(4).fill("up"), "enter", "enter", "enter", "s",
    (text) => assert.match(text, /20,29 e/),
    "enter", "enter", "up", ...Array(4).fill("right"), "enter",
    (text) => assert.match(text, /western edge of the city.*north south leave/),
  ];
  const westboundFromJunction = [
    "left", "up", "right", "up", "left", "up", "enter", "enter", ...sailWest(),
  ];
  const westboundToGate = [
    "right", "up", "up", "enter", "enter", "right", ...Array(6).fill("up"),
    ...westboundFromJunction,
  ];
  const arrival = await replay(load("2368"), "85000000", [
    (text) => assert.match(text, /5,5 e/),
    "j", checkAuction("accepted"), "j",
    "right", "right", "up", ...westboundToGate,
    "n", "enter", "enter",
    (text) => assert.match(text, /the plaza ahead is crowded with monsters.*disguise/),
    "end", "enter", "enter", "enter", "e", "s", "s", "i",
  ]);
  assert.match(visibleText(arrival), /0,4 w.*quit to dos/);
  const result = await replay(load("1769"), "85000000", [
    "right", "right", ...Array(7).fill("up"), "right", "up", "up", "enter",
    (text) => assert.match(text, /the auctioneer cries/),
    "enter", "enter", "enter", "enter", "end", "enter", "enter",
    (text) => assert.match(text, /a man and ogre exchange the wand/),
    "enter", "j", checkAuction("ready-to-report"), "j", "e", "s", "s", "j",
  ]);
  assert.match(visibleText(result), /quit to dos/);
  const cadornaSave = await replay(load("246a"), "85000000", [
    "j", checkAuction("ready-to-report"), "j",
    "right", "right", "up", "up", "left", ...Array(8).fill("up"), "enter", "enter",
    "l", ...Array(4).fill("left"), "down", "enter",
    (text) => assert.match(text, /take boat stay/),
    "t", "enter", "enter", "enter", ...Array(4).fill("up"),
    "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
    "left", "up", "up", "left", "up", "left", "up", "up", "enter",
    (text) => assert.match(text, /your success at podal plaza is noted/),
    "enter",
    (text) => assert.match(text, /each character receives \d+ experience points/),
    "enter", "enter", "s", "e", "n", ...Array(8).fill("enter"), "j", checkAuction("turned-in"), "j",
    "up", "up",
    (text) => assert.match(text, /family treasure was hidden in the western building/),
    "enter", "enter", "e", "s", "s", "a",
  ]);
  assert.match(visibleText(cadornaSave), /6,5 e.*quit to dos/);
  const textileArrival = await replay(load("1e61"), "85000000", [
    "j", (_text, frame) => {
      const textile = frame.journal?.leads.find(({ id }) => id === "commission-textile");
      assert.equal(textile?.status, "accepted");
      assert.match(textile.detail, /south of Podal Plaza/);
    }, "j",
    "right", "right", "up", "up", ...westboundToGate,
    "s", ...Array(4).fill("enter"),
    (text) => assert.match(text, /0,4 w/),
    "e", "s", "s", "b",
  ]);
  assert.match(visibleText(textileArrival), /quit to dos/);
  await replay(load("3062"), "85000000", [
    "right", "right", "up", "up", "right", "up", "left", "up", "up", "right", ...Array(5).fill("up"),
    "left",
    (text) => assert.match(text, /4,10 s.*a drum begins to beat and hobgoblins attack/),
    "enter", "enter", "d", "d", "space", "d", "d", "c",
    (text) => assert.match(text, /mira's spells in memory.*sleep/),
    "enter", ...Array(5).fill("n"),
    (text) => assert.match(text, /hobgoblin hitpoints.*spell:sleep.*target/),
    "t", ...Array(35).fill("q"),
    (text) => assert.match(text, /the monsters rejoice for the party has been destroyed/),
  ]);
  console.log("Verified the Podal Plaza turn-in, Cadorna's commission, and the Textile House courtyard defeat.");
  const duelSave = await replay(load("1e61"), "85000000", [
    "right", "right", "up", "up", "right", "up", "up", "enter", "enter", "up", "up",
    "right", "up", "up", "up", "up", "enter", "enter", "up", "up", "enter", "enter",
    (text) => assert.match(text, /7,1 e.*arena master asks if you wish to duel/),
    "left", "up", "enter", "enter", "y",
    (text) => assert.match(text, /who will duel\?/),
    "enter", "enter", "enter", ...Array(22).fill("q"),
    (text) => assert.match(text, /alda hitpoints 1.*continue battle:yes no/),
    "n",
    (text) => assert.match(text, /you have won the duel.*duelist receives 100 experience points/),
    "enter", "enter", "s", "e", "n", "e", "s", "s", "g",
  ]);
  assert.match(visibleText(duelSave), /7,1 e.*quit to dos/);
  await replay(load("2267"), "85000000", [
    "v", "v",
    (text) => assert.match(text, /alda.*level 1 exp 1621.*hp 1/),
  ]);
  console.log("Won a New Phlan arena duel and reloaded Alda with the earned 100 XP.");
  const equipmentShop = [
    "right", "right", "up", "up", "right", "up", "right", "up", "enter", "enter", "up", "up",
    "right", ...Array(7).fill("up"), "left", "up", "y", "y",
  ];
  const archerySave = await replay(load("1e61"), "85000000", [
    ...equipmentShop, "end", "b", "n", "n", ...Array(4).fill("end"), "b",
    ...Array(4).fill("end"), "b", "e", "v", "i", "i",
    (text) => assert.match(text, /brin's items.*no long bow no 10 arrows/),
    "r", "end", "end", "r", "end", "r",
    (text) => assert.match(text, /brin's items.*no hand axe.*yes long bow yes 10 arrows/),
    "e", "e", "e", "e", "e", "s", "s", "i",
  ]);
  assert.match(visibleText(archerySave), /quit to dos/);
  await replay(load("1769"), "85000000", [
    "end", "v", "i", "i",
    (text) => assert.match(text, /brin's items.*yes long bow yes 10 arrows/),
  ]);
  console.log("Bought and readied a long bow and arrows in New Phlan, then verified both after reload.");
  const armorSave = await replay(load("1e61"), "85000000", [
    ...equipmentShop,
    ...names.slice(0, 5).flatMap((name, index) => [
      ...(index ? ["end"] : []),
      "b", "n", "n", ...Array(index ? 15 : 16).fill("end"), "b", "end", "end", "b",
      "e", "v", "i", "i", "end", "r", "end", "r", "end", "r",
      (text) => assert.match(text, new RegExp(`${name}'s items.*yes hand axe.*no chain mail.*yes banded mail.*yes shield`)),
      "e", "e", "e",
    ]),
    "e", "e", "s", "s", "d",
  ]);
  assert.match(visibleText(armorSave), /quit to dos/);
  const armoredParty = /alda 3 6.*brin 1 6.*cora 3 6.*dorn 3 8.*enna 2 6.*mira 10 5/;
  const armoredArrival = await replay(load("2064"), "85000000", [
    (text) => assert.match(text, armoredParty),
    "right", "right", "up", "right", ...Array(8).fill("up"), "right", ...Array(3).fill("up"),
    ...westboundFromJunction,
    "s", ...Array(4).fill("enter"),
    (text) => assert.match(text, /0,4 w/),
    "e", "s", "s", "e",
  ]);
  assert.match(visibleText(armoredArrival), /quit to dos/);
  await replay(load("1265"), "85000000", [(text) => assert.match(text, armoredParty)]);
  console.log("Readied banded mail and shields on all five fighters and reloaded at the Textile House entrance.");
  const hired = await replay(load("2064"), "85000000", [
    "right", "right", "up", "right", ...Array(8).fill("up"), "right", ...Array(3).fill("up"),
    "left", ...Array(3).fill("up"), "left", "up", "enter", "enter", "enter", "n",
    "left", "up", "right", "up", "up", "up", "enter", "enter", "n", "y",
    ...Array(3).fill(["n", "y"]).flat(),
    (text) => assert.match(text, /a fine theurgist who will join you for 4 shares/),
    "y", "y",
    (text) => assert.match(text, /a fine curate who will join you for 3 shares/),
    "y", "n", "e", "s", "s", "c",
  ]);
  assert.match(visibleText(hired), /theurgist 8 13.*curate 3 26.*quit to dos/);
  const reinforced = await replay(load("2e63"), "85000000", [
    "right", "right", "up", "up", "left", "up", "enter", "enter", "enter", "n",
    "right", "up", "enter", "enter", "right", "up", "up", "left", "up", "left", "up", "enter", "enter",
    ...sailWest(Array(7).fill("home")),
    "s", ...Array(4).fill("enter"), "e", "s", "s", "f",
  ]);
  assert.match(visibleText(reinforced), /theurgist 8 13.*curate 3 26.*0,4 w.*quit to dos/);
  const quietCourtyard = await replay(load("2166"), "85000000", [
    ...courtyardOpening, ...Array(118).fill("q"),
    (text) => assert.match(text, /continue battle/),
    "n", "enter",
    (text) => assert.match(text, /the party has won.*receives 94 experience points/),
    "enter", "s", "e", "n",
    (text) => assert.match(text, /the drum has faded to silence/),
    "e", "s", "s", "j",
  ]);
  assert.match(visibleText(quietCourtyard), /quit to dos/);
  await replay(load("246a"), "85000000", [
    (text) => assert.match(text, /4,10 s/),
    "j", (_text, frame) =>
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-courtyard-cleared")),
  ]);
  console.log("Hired a Theurgist and Curate, blessed the party, won the courtyard fight, and reloaded with the drum silenced.");
  const westernBuilding = await replay(load("246a"), "85000000", [
    (text) => assert.match(text, /alda 3 0.*4,10 s/),
    ...Array(7).fill("end"), "c", ...Array(4).fill("home"), "enter",
    (text) => assert.match(text, /cast spell on whom/),
    ...Array(7).fill("home"), "enter", "e",
    (text) => assert.match(text, /alda 3 5/),
    "left", "up", "right", ...Array(4).fill("up"), "left", "up",
    (text) => assert.match(text, /6,14 e.*skullcrusher was here.*north wall/),
    "e", "s", "s", "g",
  ]);
  assert.match(visibleText(westernBuilding), /quit to dos/);
  await replay(load("2267"), "85000000", [
    (text) => assert.match(text, /alda 3 5.*6,14 e/),
    "j", (_text, frame) => {
      const leads = frame.journal?.leads ?? [];
      assert.ok(leads.some(({ id }) => id === "textile-skullcrusher-mark"));
      assert.ok(!leads.some(({ id }) => id === "textile-secret-door"));
    },
  ]);
  console.log("Healed Alda, found Skullcrusher's mark, and verified both after reloading.");
  const openedLock = await replay(load("2267"), "85000000", [
    "right", "right", "up", "right", "up", "left", "up", "up",
    (text) => assert.match(text, /4,13 w.*locked.*bash knock exit/),
    "k",
    (text) => assert.match(text, /3,13 w/),
    "e", "s", "s", "b",
  ]);
  assert.match(visibleText(openedLock), /quit to dos/);
  await replay(load("3062"), "85000000", [
    ...Array(6).fill("end"), "c",
    (text) => {
      assert.match(text, /theurgist's spells in memory.*stinking cloud/);
      assert.doesNotMatch(text, /\bknock\b/);
    },
    "e", "left", "up",
    (text) => assert.match(text, /3,13 s.*locked.*bash exit/),
    "b",
    (text) => assert.match(text, /3,14 s.*graffiti covers the walls/),
    "enter",
    (text) => assert.match(text, /you encounter hobgoblins/),
  ]);
  console.log("Used Knock at the first lock, reloaded with the spell spent, and bashed the next door open.");
  const healedBeforePrison = await replay(load("3062"), "85000000", [
    ...Array(7).fill("end"), "c",
    (text) => assert.match(text, /curate's spells in memory.*cure light wounds cure light wounds/),
    ...Array(3).fill("home"), "enter", ...Array(6).fill("home"), "enter",
    "home", "home", "enter", "end", "enter",
    (text) => {
      assert.match(text, /curate's spells in memory.*slow poison spiritual hammer/);
      assert.doesNotMatch(text, /cure light wounds/);
    },
    "e",
    (text) => assert.match(text, /brin 1 5.*cora 3 5.*3,13 w/),
    "e", "s", "s", "c",
  ]);
  assert.match(visibleText(healedBeforePrison), /quit to dos/);
  await replay(load("2e63"), "85000000", [
    (text) => assert.match(text, /brin 1 5.*cora 3 5.*3,13 w/),
  ]);
  console.log("Healed Brin and Cora before the prison fight and reloaded with both fighters at 5 HP.");
  const restedBeforePrison = await replay(load("2e63"), "85000000", [
    ...Array(7).fill("end"), "e", "enter", "m",
    "m", "end", "end", "end", "m", "m", "m", "home", "home", "m", "e", "enter",
    (text) => assert.match(text, /memorized.*\*bless \*cure light wounds \*cure light wounds \*cure light wounds/),
    "y", "r", "r", "n", "c",
    (text) => assert.match(text, /spells in memory.*bless cure light wounds cure light wounds cure light wounds/),
    ...Array(7).fill("end"), "c", "end", "enter",
    (text) => assert.match(text, /cast spell on whom/),
    "home", "home", "home", "enter",
    "end", "enter", "end", "enter", "e", "e",
    (text) => assert.match(text, /enna 2 5.*mira 10 5.*3,13 w 04:42/),
    "s", "d",
  ]);
  assert.match(visibleText(restedBeforePrison), /quit to dos/);
  await replay(load("2064"), "85000000", [
    (text) => assert.match(text, /brin 1 5.*cora 3 5.*enna 2 5.*mira 10 5.*3,13 w/),
    "enter", "left", "up", "b", "enter", "p",
    (text) => assert.match(text, /hobgoblins respond with a piercing battle cry/),
    "enter",
    (text) => assert.match(text, /a battle begins/),
  ]);
  console.log("Rested, cast Bless, and reloaded with Enna and Mira at 5 HP. Parlay led to combat.");
  await replay(load("2064"), "85000000", [
    "e", "a", "a", "o", ...Array(7).fill("end"), "enter",
    ...Array(7).fill("home"), "enter",
    (text) => assert.match(text, /name ac hp curate 3 14 alda/),
    "e", "e", "e", "left", "up", "b", "enter", "c", "enter", "enter",
    ...Array(101).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", "enter",
    (text) => assert.match(text, /the party has won.*63 experience points/),
    "enter", "enter", "end", "t", "i",
    (text) => assert.match(text, /loot long sword.*items: take exit/),
    "t", "e", "e", "e", "n", "right", "up", "left", "up", "b", "enter",
    (text) => assert.match(text, /2,15 s.*muscular man locked in chains.*entry 47/),
    "enter", "p", "n",
    (text) => assert.match(text, /i almost killed the leader/),
    "enter", "f", "u",
    (text) => assert.match(text, /you have no key to unlock the padlocks/),
    "enter", "l", "enter", "j",
    (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-prisoner"));
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prison-key-needed"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    }, "track 3", (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /look for a key/i);
    }, "j", "e", "s", "s", "e",
  ]);
  await replay(load("1265"), "85000000", [
    (text) => assert.match(text, /2,15 s/),
    "j", (_text, frame) => {
      assert.equal(frame.journal?.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /look for a key/i);
    }, "j",
    "enter", "right", "right", "up", "up", "b", "enter", "up",
    (text) => assert.match(text, /2,12 n.*crude temple/),
    "enter", "enter",
    (text) => assert.match(text, /i am the mighty grishnak/),
  ]);
  console.log("Won the prison fight, reloaded the captive's key objective, and reached Grishnak's temple.");
  await verifySkullcrusherRecruitment(load, join(saveDir, "E.json"));
  console.log("Checkpoint replay saves:", saveDir);
}

async function verifySkullcrusherRecruitment(load, checkpoint) {
  const { parseDax } = await tsImport("../src/lib/dax.ts", import.meta.url);
  const { findGameRoot, readGameFile } = await tsImport("./gamedata.ts", import.meta.url);
  const gameRoot = findGameRoot();
  assert.ok(gameRoot);
  const treasure = parseDax("ITEM4.DAX", readGameFile(gameRoot, "ITEM4.DAX"))
    .entries.find(({ id }) => id === 38);
  assert.ok(treasure);
  const key = treasure.data.subarray(6 * 63, 7 * 63);
  assert.equal(Buffer.from(key.subarray(1, 10)).toString("ascii"), "Brass Key");

  // Supply only the key in a copy of slot E to exercise the post-battle branch.
  const directory = join(saveDir, "controlled-prison-key");
  mkdirSync(directory);
  const slot = JSON.parse(readFileSync(checkpoint, "utf8"));
  const inventory = "SAVE\\CHRDATE2.ITM";
  slot.party[inventory] = Buffer.concat([Buffer.from(slot.party[inventory], "base64"), key]).toString("base64");
  writeFileSync(join(directory, "E.json"), JSON.stringify(slot));
  const freePrisoner = ["right", "right", "up", "right", "right", "up", "b", "enter", "enter",
    "f", "u", (text) => assert.match(text, /brass key you found opens all of the padlocks/),
    "enter", "p", "n", "enter"];
  const declined = await replay(load("1265"), "85000000", [
    "enter", ...freePrisoner, "n",
    (text) => assert.match(text, /oh well.*he leaves/),
    "e", "s", "s", "i",
  ], directory);
  assert.match(visibleText(declined), /2,15 s.*quit to dos/);
  await replay(load("1769"), "85000000", [
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-prisoner-left"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.match(frame.journal.objective.nextStep, /continue searching the western textile building/i);
    }, "j",
  ], directory);
  const recruited = await replay(load("1265"), "85000000", [
    "e", "a", "a", ...Array(7).fill("end"), "d",
    (text) => assert.match(text, /theurgist will be gone/),
    "y", "e", "e", ...freePrisoner, "y",
    (text) => assert.match(text, /my name is skullcrusher.*secret door to the southeast/),
    "enter", "enter", "e", "s", "s", "f",
  ], directory);
  assert.match(visibleText(recruited), /skullcrusher 8 39.*quit to dos/);
  await replay(load("2166"), "85000000", [
    (text) => assert.match(text, /skullcrusher 8 39.*2,15 s/),
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-prisoner-freed"));
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.match(frame.journal.objective.nextStep, /search southeast/);
    }, "j",
    "end", "v", "i",
    (text) => assert.match(text, /alda's items.*long sword/),
    "end", "end", "end", "t", ...Array(6).fill("end"), "enter", "e", "e",
    "end", "end", "v", "i", "end", "r", "t", ...Array(4).fill("end"), "enter",
    "r", "t", "enter", "home", "r", "e", "e",
    ...Array(4).fill("end"), "v", "i", "r", "end", "r", "end", "r",
    (text) => assert.match(text, /skullcrusher's items.*yes long sword yes banded mail yes shield/),
    "e",
    (text) => assert.match(text, /skullcrusher.*ac 1.*hp 39.*weapon long sword/),
    "e", "e", "s", "s", "g",
  ], directory);
  await replay(load("2267"), "85000000", [
    (text) => assert.match(text, /skullcrusher 1 39.*2,15 s/),
    "e", "m", "m", "m", "n", ...Array(12).fill("end"), ...Array(7).fill("home"), "m", "m", "p",
    ...Array(15).fill("home"), "end", "end", "m", "end", "end", "m", "m", "m", "m", "e", "enter",
    (text) => assert.match(text, /memorized.*\*bless(?: \*cure light wounds){4}.*\*hold person \*hold person/),
    "y", "r", "r", "n", "n", "c",
    (text) => assert.match(text, /spells in memory.*bless(?: cure light wounds){4}.*hold person hold person/),
    "end", "enter", // Bless
    "end", "enter", "end", "end", "enter", // Brin
    "end", "enter", "end", "enter", // Cora
    "end", "enter", "end", "end", "enter", // Enna
    "end", "enter", "end", "enter", // Mira
    (text) => {
      assert.match(text, /spells in memory.*hold person hold person/);
      assert.doesNotMatch(text, /cure light wounds/);
    },
    "e", "e",
    (text) => assert.match(text, /brin 1 6.*cora 5 3.*enna 2 5.*mira 10 5.*skullcrusher 1 39/),
    "s", "s", "h",
  ], directory);
  await replay(load("2368"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*cora 5 3.*enna 2 5.*mira 10 5.*skullcrusher 1 39/),
    "enter", "right", "right", "up", "right", "up", "left", "up", "b", "right", "up", "b",
    ...Array(5).fill("up"), "right", "up", "left", "up", "up",
    (text) => assert.match(text, /11,14 e.*in the east wall is the secret door/),
    "enter", "j", (_text, frame) => {
      assert.match(frame.journal?.objective.nextStep, /use search.*through the wall/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-ogre-chief"));
    }, "j", "s", "up", "enter",
    (text) => assert.match(text, /12,14 s.*chief of the hobgoblins, a huge ogre/),
    "j", (_text, frame) => assert.match(frame.journal?.objective.nextStep, /defeat the ogre chief/i), "j",
  ], directory);
  console.log("With the key supplied in a controlled copy, recruited Skullcrusher, reloaded his clue, and reached the ogre chief.");
}

if (process.argv[2] === "--sokal-smithy-checkpoint") {
  assert.ok(process.argv[3], "Pass a save in Sokal's old armory after defeating the smithy frogs.");
  await verifySokalSmithy(process.argv[3]);
  process.exit(0);
}

if (process.argv[2] === "--textile-courtyard-checkpoint") {
  assert.ok(process.argv[3], "Pass a save with the armored and reinforced party at the Textile House entrance.");
  await verifyUninterruptedCourtyard(process.argv[3]);
  process.exit(0);
}

if (["--sokal-ferran-checkpoint", "--sokal-altar-checkpoint"].includes(process.argv[2])) {
  const beforeFerran = process.argv[2] === "--sokal-ferran-checkpoint";
  assert.ok(process.argv[3], beforeFerran ? "Pass a save one step before meeting Ferran."
    : "Pass a save at Ferran's altar after learning his password.");
  const checkSokal = (status) => (_text, frame) => {
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-sokal")?.status, status);
  };
  if (beforeFerran) {
    copyFileSync(process.argv[3], join(saveDir, "F.json"));
    const speakToFerran = [
      "up", "enter", (text) => assert.match(text, /a pale form rises before you/),
      "p", "n", ..."lux", "enter", (text) => assert.match(text, /ferran martinez.*tell the truth.*lie/),
    ];
    let statusBeforeParlay;
    await replay(loadSlot("2166"), "85000000", [
      "j", (_text, frame) => {
        const lead = frame.journal.leads.find(({ id }) => id === "commission-sokal");
        assert.match(lead?.status, /^(offered|accepted)$/);
        statusBeforeParlay = lead.status;
        assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-departure"));
      }, "j",
      ...speakToFerran, "l", (text) => assert.match(text, /you lie.*fades away/),
      "j", (_text, frame) => {
        const leads = frame.journal.leads;
        assert.equal(leads.find(({ id }) => id === "commission-sokal")?.status, statusBeforeParlay);
        assert.ok(leads.some(({ id }) => id === "sokal-ferran-lie"));
        assert.ok(!leads.some(({ id }) => id === "sokal-departure"));
      },
    ]);
    await replay(loadSlot("2166"), "85000000", [
      ...speakToFerran, "t", "enter", "enter", "enter",
      (text) => assert.match(text, /samosud/),
      "e", "s", "s", "g",
    ]);
  } else {
    copyFileSync(process.argv[3], join(saveDir, "G.json"));
  }
  await replay(loadSlot("2267"), "85000000", [
    (text) => assert.match(text, /8,10 s/),
    "j", checkSokal("ready-to-report"),
    (_text, frame) => assert.match(frame.journal?.objective.nextStep, /SAMOSUD.*south gate.*boat to New Phlan/), "j",
    "left", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up", "up", "up",
    "right", "up", "up", "right", ...Array(5).fill("up"),
    (text) => assert.match(text, /10,8 s.*pack of undead/),
    "p", "n", ..."samosud", "enter",
    (text) => assert.match(text, /the undead leave/),
    "up", "up", "enter", "enter", "y", "up", "up", "right", "up", "up", "left",
    "up", "up", "enter", "enter", "y", ...Array(4).fill("up"),
    (text) => assert.match(text, /8,15 s.*take a boat back to phlan/),
    "enter", "y", ...Array(4).fill("enter"),
    (text) => assert.match(text, /15,1 w/),
    ...Array(4).fill("up"), "left", "up", "right", "up", "left", "up", "right",
    ...Array(6).fill("up"), "left", "up", "up", "left", "up", "left", "up", "up", "enter", "enter",
    (text) => assert.match(text, /receives 1308 experience points/),
    "enter", "enter", "j", checkSokal("reward-pending"), "j", "s", "e",
    ...Array(4).fill("enter"), "j", checkSokal("turned-in"), "j",
    "e", "s", "s", "h",
  ]);
  await replay(loadSlot("2368"), "85000000", [
    (text) => assert.match(text, /5,5 e/),
    "j", checkSokal("turned-in"), "j", "v",
    (text) => assert.match(text, /alda.*platinum 46.*exp 1313/),
  ]);
  console.log("Walked from Ferran's altar to the pier, took the boat, and reloaded the Sokal reward at the clerk.");
  process.exit(0);
}

if (process.argv[2] === "--castle-ending-checkpoint") {
  assert.ok(process.argv[3], "Pass a save outside Tyranthraxus's audience hall with the assault assigned.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  const checkCastle = (status) => (_text, frame) => {
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-castle")?.status, status);
  };
  await replay(loadSlot("3062"), "85000000", [
    "right", ...Array(4).fill("up"),
    (text) => assert.match(text, /audience hall of tyranthraxus/),
    ...Array(5).fill("enter"),
    (text) => assert.match(text, /how do you vote.*attack join tyranthraxus/),
    ...Array(6).fill("a"), "enter", "enter", "q",
    (text) => assert.match(text, /tyrani?thraxus hitpoints 80 ac -4/),
    ...Array(32).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", (text) => assert.match(text, /the party has won.*receives 917 experience points/),
    "enter", "enter", "e", ...Array(9).fill("enter"),
    (text) => assert.match(text, /0,4 e.*gateway to the unsettled areas/),
    "j", checkCastle("ready-to-report"), "j",
    "up", "up", "up", "enter", "up", "right", "up", "enter", "enter", "enter",
    "up", "left", "up", "up", "enter",
    (text) => assert.match(text, /your quest is over.*tyranthraxus is defeated.*phlan is free/),
    "enter", (text) => assert.match(text, /receives 67500 experience points/),
    "enter", "enter", "j", checkCastle("reward-pending"), "j", "s", "e",
    ...Array(4).fill("enter"), "j", checkCastle("turned-in"), "j",
    "e", "s", "s", "c",
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    "j", checkCastle("turned-in"),
    (_text, frame) => assert.equal(frame.journal.objective.title, "Phlan is free"),
  ]);
  console.log("Defeated the original Tyranthraxus, collected the council reward, and reloaded the completed campaign.");
  process.exit(0);
}

if (process.argv[2] === "--podal-checkpoint") {
  assert.ok(process.argv[3], "Pass a save at the clerk with Sokal turned in and the auction accepted.");
  await verifyPodalFromCouncil(process.argv[3]);
  process.exit(0);
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
await verifySokalSmithy(join(saveDir, "D.json"));
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
], saveDir, /the monsters rejoice for the party has been destroyed/);
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

const twoRecruits = await replay(loadSlotG, "85000000", [
  "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
  "enter", "enter", "enter", "n", "left", "up", "right", "up", "up", "up", "enter", "enter", "n",
  "y", ...Array(4).fill(["n", "y"]).flat(),
  (text) => assert.match(text, /a fine curate who will join you for 3 shares/),
  "y", "y",
  (text) => assert.match(text, /a fine theurgist who will join you for 4 shares/),
  "y", "n", "e", "s", "s", "i",
]);
assert.match(visibleText(twoRecruits), /curate 3 26.*theurgist 8 13.*quit to dos/);
const reinforcedLanding = await replay(loadSlotI, "85000000", [
  "j", (_text, frame) => assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-arena-recruits")), "j",
  "right", "right", "up", "up", "left", "up", "enter", "enter", "enter", "n",
  "right", "up", "enter", "enter", "right", "up", "up", "left", "up", "left", "up",
  "enter", "enter", "right", ...Array(4).fill("up"), ...Array(5).fill("enter"),
  (text) => assert.match(text, /curate 3 26.*theurgist 8 13.*8,14 n/),
  "e", "s", "s", "j",
]);
assert.match(visibleText(reinforcedLanding), /quit to dos/);
await replay(loadSlotJ, "85000000", [
  "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
  (text) => assert.match(text, /pack of undead suddenly appears.*parlay/),
  "p", "n", ..."shestni", "enter",
  (text) => assert.match(text, /the undead leave/),
  ...Array(4).fill("up"), ...Array(6).fill("end"), "c", ...Array(8).fill("home"), "enter", "e",
  (text) => assert.match(text, /10,6 n/),
  "e", "enter", "m", "d",
  (text) => assert.match(text, /brin bless cora bless dorn bless enna bless fenn bless/),
]);
console.log("Returned to Sokal Keep with the Curate and Theurgist, passed the patrol, and verified Bless.");
const northCourtyardDefeat = /the monsters rejoice for the party has been destroyed/;
const northCourtyardBattle = await replay(loadSlotJ, "85000000", [
  "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
  "p", "n", ..."shestni", "enter", ...Array(5).fill("up"),
  "right", "up", "right", "up", "enter", "enter",
  (text) => assert.match(text, /11,6 s.*do you give the password/),
  "y", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up", "left",
  (text) => assert.match(text, /the croaking rises in volume/),
  "w", "enter", ...Array(32).fill("q"),
  (text) => assert.match(text, /continue battle:yes no/),
  "n",
  (text) => assert.match(text, /the party has won.*receives \d+ experience points/),
  "enter", "enter", "s", "e", "n", "left", ...Array(4).fill("up"),
  "left", ...Array(6).fill("up"), "left", "up",
  (text) => assert.match(text, /curate 3 26.*theurgist 8 13.*8,3 s/),
  ...Array(6).fill("end"), "c", ...Array(8).fill("home"), "enter", "e", "up", "enter",
  (text) => assert.match(text, /8,4 s.*large force of orcs and hobgoblins rushes you/),
  "enter", "enter", "enter", ...Array(800).fill("q"),
], saveDir, northCourtyardDefeat);
assert.match(visibleText(northCourtyardBattle), northCourtyardDefeat);
console.log("Won the smithy fight with both recruits and reproduced the north courtyard defeat with Bless and Quick.");

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
  "enter", "enter", "enter", ...Array(16).fill("q"), "space",
  (text) => assert.match(text, /mira hitpoints 5.*move view aim cast/),
  "c", "enter", ...Array(6).fill("n"), "t",
  (text) => {
    assert.match(text, /hobgoblin hitpoints.*spell:sleep.*aim:next/);
    assert.doesNotMatch(text, /manual target/);
  },
  "p",
  (text) => assert.match(text, /orc hitpoints.*spell:sleep.*manual target/),
  "t",
  (text) => assert.doesNotMatch(text, /spell:sleep/),
], spellSaveDir);
console.log("Won the smithy frog fight and verified Sleep targeting in the courtyard from the north.");
console.log("Replay save:", saveDir);
console.log("Mixed-party save:", spellSaveDir);
