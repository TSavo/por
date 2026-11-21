import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createInterface } from "node:readline";
import { tsImport } from "tsx/esm/api";
import { copyCampaignSaves, openChromeCampaignLeg } from "./chrome-campaign-replay.mjs";

const names = ["alda", "brin", "cora", "dorn", "enna", "fenn"];
const createCharacterFromBoot = ["enter", "enter", "enter", "c"];
const campaignOpening = process.argv[2] === "--campaign-opening";
const campaign = process.argv[2] === "--campaign";
const campaignChrome = campaignOpening || campaign;
const chromePath = process.argv[3];
const [campaignOption, campaignInput, extraArgument] = process.argv.slice(4);
if (campaignChrome) {
  assert.ok(chromePath, "Pass the path to Chrome.");
  assert.ok(!campaignOption || campaign && ["--from-slums", "--from-sokal", "--replay-leg"].includes(campaignOption) && campaignInput && !extraArgument,
    "Expected --from-slums with slot D, --from-sokal with slot A, or --replay-leg with a recorded leg directory.");
}
mkdirSync("out", { recursive: true });
const saveDir = mkdtempSync(join("out", campaignChrome ? "campaign-" : "fresh-party-"));
const tileTrace = process.env.POR_TRACE_TILES === "1" ? resolve(saveDir, "tile-inventory.jsonl") : undefined;
const tileFrames = tileTrace && join(saveDir, "tile-frames");
if (tileFrames) mkdirSync(tileFrames);
let tracedFrames = 0;
let campaignLeg = 0;

async function replay(bootKeys, startAt, actions, checkpointDir = saveDir, stopAt) {
  if (campaignChrome) {
    const directory = resolve(saveDir, `leg-${++campaignLeg}`);
    const chrome = await openChromeCampaignLeg({ chromePath, directory, checkpointDir: resolve(checkpointDir), bootKeys, startAt });
    try {
      const initial = await chrome.nextFrame();
      const finalFrame = await replayActions(initial, actions, stopAt, async (command) => {
        await chrome.send(command);
        return chrome.nextFrame();
      });
      writeFileSync(join(directory, "end-frame.json"), JSON.stringify(finalFrame) + "\n");
      return finalFrame;
    } catch (error) {
      throw new Error(`Chrome campaign leg ${campaignLeg} failed. Diagnostics in ${directory}`, { cause: error });
    } finally {
      await chrome.close();
    }
  }
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
      if (value.startsWith("POR_FRAME ")) {
        const frame = JSON.parse(value.slice(10));
        lastText = visibleText(frame);
        if (tileTrace && tileFrames && frame.tileInventory?.length) {
          writeFileSync(join(tileFrames, `${tracedFrames}.png`), Buffer.from(frame.frame, "base64"));
          appendFileSync(tileTrace, JSON.stringify(frame.tileInventory) + "\n");
          tracedFrames++;
        }
        return frame;
      }
    }
  }
  try {
    return await replayActions(await nextFrame(), actions, stopAt, (command) => {
      lastKey = command;
      actionNumber++;
      runner.stdin.write(command + "\n");
      return nextFrame();
    });
  } finally {
    clearTimeout(timer);
    lines.close();
    runner.kill();
  }
}

async function replayActions(frame, actions, stopAt, send) {
  for (const action of actions) {
    if (Array.isArray(action)) {
      const [command, until, limit] = action;
      for (let attempt = 0; attempt < limit && !until.test(visibleText(frame)); attempt++) {
        frame = await send(command);
      }
      assert.match(visibleText(frame), until);
      continue;
    }
    const key = typeof action === "function" ? action(visibleText(frame), frame) : action;
    if (typeof key !== "string") continue;
    frame = await send(key);
    if (stopAt?.test(visibleText(frame))) break;
  }
  return frame;
}

if (campaign && campaignOption === "--replay-leg") {
  const { bootKeys, startAt } = JSON.parse(readFileSync(join(campaignInput, "boot.json"), "utf8"));
  const commands = readFileSync(join(campaignInput, "commands.jsonl"), "utf8").trim().split(/\r?\n/)
    .filter(Boolean).map((line) => JSON.parse(line));
  copyCampaignSaves(campaignInput, saveDir);
  const actual = await replay(bootKeys, startAt, commands);
  const expectedPath = join(campaignInput, "end-frame.json");
  if (existsSync(expectedPath)) {
    const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
    assert.deepEqual(actual, expected);
    console.log("Recorded Chrome leg reproduced the original final frame and journal.");
  } else console.log("Replayed the recorded input prefix. The source leg has no verified final frame.");
  console.log("Replay artifacts:", resolve(saveDir));
  process.exit(0);
}

process.on("exit", () => {
  if (tracedFrames) console.log(`Artwork trace (${tracedFrames} frames):`, tileTrace);
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

if (campaign && campaignOption === "--from-sokal") {
  copyFileSync(campaignInput, join(saveDir, "A.json"));
  await verifySokalArrival();
  await verifySokalKeep();
  console.log("Enhanced Chrome campaign verified through the Sokal Keep armory:", resolve(saveDir, "F.json"));
  process.exit(0);
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

async function verifySokalArmory(directory, trackCommission = true) {
  const { isOpenObjective } = await tsImport("../src/runtime/adventure-log.ts", import.meta.url);
  const trackSokal = (_text, frame) => {
    if (!trackCommission) return;
    const index = frame.journal.leads.filter(isOpenObjective).findIndex(({ id }) => id === "commission-sokal");
    assert.ok(index >= 0, "Sokal Keep should be trackable");
    return `track ${index + 1}`;
  };
  const equipmentSave = await replay(loadSlot("2064"), "85000000", [
    "up", "up", "up", "right", "up", "left", "up",
    (text) => assert.match(text, /passing through an illusionary wall.*glow in the northwestern corner/),
    "j", trackSokal, (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-hidden-armory"));
      if (trackCommission) {
        assert.equal(frame.journal.objective.nextStep, "Follow the glow to the northwest corner of the hidden armory.");
      }
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-armory-stands"));
    }, "j",
    "left", "up", "up", "up", "right", "up",
    (text) => assert.match(text, /on stands are a shield, a mace, a sword.*do you take it/),
    "j", (_text, frame) => {
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-armory-opened"));
      if (trackCommission) assert.match(frame.journal.objective.nextStep, /take the gear on the stands/);
    }, "j",
    "y", (text) => assert.match(text, /receives 400 experience points/),
    "enter", "enter", "end", "t",
    (text) => assert.match(text, /loot shield long sword chain mail mace/),
    "t", "t", "t", "t",
    (text) => assert.match(text, /view pool exit/),
    "e", "e", "enter", "s", "e",
  ], directory);
  assert.match(visibleText(equipmentSave), /quit to dos/);
  await replay(loadSlot("1265"), "85000000", [
    (text) => assert.match(text, /12,0 n/),
    "j", (_text, frame) => {
      if (trackCommission) assert.equal(frame.journal.trackedId, "commission-sokal");
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-armory-stands"));
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-armory-opened"));
      if (trackCommission) assert.match(frame.journal.objective.nextStep, /ready any gear you took/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-ferran"));
    },
    "j", "end", "v", "i",
    (text) => assert.match(text, /brin's items.*no shield no long sword no chain mail no mace/),
  ], directory);
}

const courtyardOpening = [
  "right", "right", "up", "up", "right", "up", "left", "up", "up", "right", ...Array(4).fill("up"),
  ...Array(7).fill("end"), "c",
  (text) => assert.match(text, /curate's spells in memory.*bless bless/),
  ...Array(8).fill("home"), "enter", "e", "e", "enter", "m", "d",
  (text) => assert.match(text, /alda bless brin bless cora bless dorn bless enna bless mira bless/),
  "enter", "e", "e", "up", "left", "enter", "enter",
];

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

async function verifyUninterruptedCourtyard() {
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
      assert.match(frame.journal.objective.nextStep, /overcome grishnak.*choose free, then unlock/i);
    }, "j",
  ]);
  console.log("Won the courtyard and prison, then reached Grishnak's temple:", saveDir);
}

const arenaRoute = [
  "right", "right", "up", "up", "right", "up", "up", "enter", "enter", "up", "up",
  "right", "up", "up", "up", "up", "enter", "enter", "up", "up", "enter", "enter",
];

async function verifyFighterTrainingJournal() {
  const trainingLead = "phlan-training-fighters";
  await replay(loadSlot("1e61"), "85000000", [
    ...arenaRoute,
    (text) => assert.match(text, /7,1 e.*arena master asks if you wish to duel/),
    "n", "n", "up", "enter", "enter", "left",
    (text) => assert.match(text, /8,1 n.*north door reads 'fighters'/),
    "j", (_text, frame) => assert.ok(!frame.journal?.leads.some(({ id }) => id === trainingLead)), "j",
    "up", "enter", "enter",
    (text) => assert.match(text, /8,0 n.*we train only fighters here/),
    "n", "j", (_text, frame) => assert.match(
      frame.journal?.leads.find(({ id }) => id === trainingLead)?.detail ?? "",
      /east past the arena.*north door.*train character/i,
    ), "j", "e", "s", "s", "h",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2368"), "85000000", [
    "j", (_text, frame) => assert.ok(frame.journal?.leads.some(({ id }) => id === trainingLead)),
  ]);
  console.log("Verified the fighter trainer's directions are discovered in play and retained after reloading slot H.");
}

async function verifyPodalFromCouncil(continuation) {
  const load = loadSlot;
  const checkAuction = (status) => (_text, frame) =>
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-auction")?.status, status);
  const checkExchange = (_text, frame) => {
    assert.ok(frame.journal.leads.some(({ id }) => id === "auction-exchange"));
    assert.match(frame.journal.objective.nextStep, /exchanged the wand for a large bag.*council clerk/i);
  };
  const sailWest = (payerSelection = [], verifyAuction = false) => [
    (text) => assert.match(text, /sokal east west bay none/),
    ...(verifyAuction ? ["j", (_text, frame) => {
      assert.match(frame.journal.objective.nextStep, /choose west.*ferry menu/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-plaza-entry"));
    }, "j"] : []),
    "w", ...payerSelection, "enter", "enter", "right", ...Array(4).fill("up"), "enter", "enter", "enter", "s",
    (text) => assert.match(text, /20,29 e/),
    "enter", "enter", "up", ...Array(4).fill("right"), "enter",
    (text) => assert.match(text, /western edge of the city.*north south leave/),
  ];
  const westboundFromJunction = (verifyAuction = false) => [
    "left", "up", "right", "up", "left", "up", "enter", "enter", ...sailWest([], verifyAuction),
  ];
  const westboundToGate = (verifyAuction = false) => [
    "right", "up", "up", "enter", "enter", "right", ...Array(6).fill("up"),
    ...westboundFromJunction(verifyAuction),
  ];
  const arrival = await replay(load("2368"), "85000000", [
    (text) => assert.match(text, /5,5 e/),
    "j", checkAuction("accepted"), (_text, frame) => {
      assert.ok(!frame.journal.leads.some(({ id }) => id.startsWith("auction-")));
      const index = frame.journal.leads.filter(({ status }) => status && status !== "turned-in")
        .findIndex(({ id }) => id === "commission-auction");
      assert.ok(index >= 0);
      return `track ${index + 1}`;
    }, "j",
    "right", "right", "up", ...westboundToGate(true),
    "n", "enter", "enter",
    (text) => assert.match(text, /the plaza ahead is crowded with monsters.*disguise/),
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "auction-plaza-entry"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-plaza-approach-chosen"));
      assert.match(frame.journal.objective.nextStep, /disguise the party or sneak/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-exchange"));
    }, "j",
    "end", "enter", "enter", "enter", "e", "s", "s", "i",
  ]);
  assert.match(visibleText(arrival), /0,4 w.*quit to dos/);
  const reachAuction = [
    "right", "right", ...Array(7).fill("up"), "right", "up", "up", "enter",
    (text) => assert.match(text, /the auctioneer cries/),
  ];
  const plazaSave = readFileSync(join(saveDir, "I.json"));
  await replay(load("1769"), "85000000", [
    "j", checkAuction("accepted"), (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "auction-plaza-approach-chosen"));
      assert.match(frame.journal.objective.nextStep, /head east.*then turn south toward the auctioneer/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-started"));
    }, "j",
    ...reachAuction, "enter", "enter",
    (text) => assert.match(text, /stand and listen move in closer listen to comments leave/),
    "j", (_text, frame) => {
      assert.match(frame.journal.objective.nextStep, /Stand and Listen.*Listen to Comments.*Move In Closer/);
    }, "j",
    "end", "end", "enter",
    (text) => assert.match(text, /wand of illumination/),
    "j", checkAuction("accepted"), (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "auction-wand-of-illumination"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-wand-of-fear" || id === "auction-exchange"));
    }, "j", "enter", "enter", "end", "enter", "enter", "enter",
    "j", checkAuction("ready-to-report"), checkExchange, (_text, frame) => {
      assert.match(frame.journal.objective.nextStep, /an onlooker called it a Wand of Illumination/i);
      assert.doesNotMatch(frame.journal.objective.nextStep, /Wand of Fear/i);
    },
  ]);
  await replay(load("1769"), "85000000", [
    ...reachAuction, ...Array(4).fill("enter"),
    (text) => assert.match(text, /make a bid wait for winner try to leave/),
    "end", "end", "enter", "enter",
    (text) => assert.match(text, /the auction is cancelled/),
    "enter", "j", checkAuction("ready-to-report"), (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "auction-cancelled"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-exchange" || id === "auction-buyer-unseen"));
      assert.match(frame.journal.objective.nextStep, /report that the auction was cancelled.*council clerk/i);
    },
  ]);
  assert.deepEqual(readFileSync(join(saveDir, "I.json")), plazaSave);
  const result = await replay(load("1769"), "85000000", [
    ...reachAuction,
    "j", (_text, frame) => {
      assert.match(frame.journal.objective.nextStep, /watch the bidding/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-bidding" || id === "auction-exchange"));
    }, "j",
    "enter", "enter", "enter",
    (text) => assert.match(text, /the bidding escalates to 5,000 gold pieces/),
    "j", checkAuction("accepted"), (_text, frame) => {
      const bid = frame.journal.leads.find(({ id }) => id === "auction-bidding");
      assert.match(bid?.detail ?? "", /5,000 gold pieces/);
      assert.match(frame.journal.objective.nextStep, /see who wins/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-exchange"));
    }, "j", "enter", "end", "enter", "enter",
    (text) => assert.match(text, /a man and ogre exchange the wand/),
    "enter", "j", checkAuction("ready-to-report"), checkExchange, "j", "e", "s", "s", "j",
  ]);
  assert.match(visibleText(result), /quit to dos/);
  const cadornaSave = await replay(load("246a"), "85000000", [
    "j", checkAuction("ready-to-report"), checkExchange, "j",
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
  if (continuation === "--auction-only") {
    await replay(load("1e61"), "85000000", [
      "j", checkAuction("turned-in"), (_text, frame) => {
        assert.ok(frame.journal.leads.some(({ id, status }) => id === "commission-sokal" && status === "turned-in"));
        assert.ok(frame.journal.leads.some(({ id, status }) => id === "commission-textile" && status === "accepted"));
        assert.ok(frame.journal.leads.some(({ id }) => id === "auction-exchange"));
        assert.ok(frame.journal.leads.some(({ id }) => id === "auction-bidding"));
      },
    ]);
    console.log("Verified the Podal Plaza exchange, council reward, and Textile House commission after reload.");
    return;
  }
  const textileArrival = await replay(load("1e61"), "85000000", [
    "j", (_text, frame) => {
      const textile = frame.journal?.leads.find(({ id }) => id === "commission-textile");
      assert.equal(textile?.status, "accepted");
      assert.match(textile.detail, /south of Podal Plaza/);
    }, "j",
    "right", "right", "up", "up", ...westboundToGate(),
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
    ...arenaRoute,
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
    ...westboundFromJunction(),
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
  if (continuation === "--through-textile-prison") {
    await verifyUninterruptedCourtyard();
    return;
  }
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
      assert.match(frame.journal.objective.nextStep, /north through the guards' room.*choose free, then unlock/i);
    }, "j", "e", "s", "s", "e",
  ]);
  await replay(load("1265"), "85000000", [
    (text) => assert.match(text, /2,15 s/),
    "j", (_text, frame) => {
      assert.equal(frame.journal?.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /north through the guards' room.*choose free, then unlock/i);
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

async function verifySkullcrusherRecruitment(load, checkpoint, verifyOgreRoute = true) {
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
  const originalCheckpoint = readFileSync(checkpoint);
  const slot = JSON.parse(originalCheckpoint.toString("utf8"));
  const inventory = "SAVE\\CHRDATE2.ITM";
  slot.party[inventory] = Buffer.concat([Buffer.from(slot.party[inventory], "base64"), key]).toString("base64");
  writeFileSync(join(directory, "E.json"), JSON.stringify(slot));
  const trackTextile = (_text, frame) => {
    const objectives = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
    const index = objectives.findIndex(({ id }) => id === "commission-textile");
    assert.ok(index >= 0);
    return `track ${index + 1}`;
  };
  await replay(load("1265"), "85000000", [
    "j", (_text, frame) => assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-prison-key-carried")),
  ], saveDir);
  await replay(load("1265"), "85000000", [
    "j", trackTextile, (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-textile");
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prison-key-carried"));
      assert.match(frame.journal.objective.nextStep, /brass key.*choose free, then unlock/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    },
  ], directory);
  const freePrisoner = ["right", "right", "up", "right", "right", "up", "b", "enter", "enter",
    "f", "u", (text) => assert.match(text, /brass key you found opens all of the padlocks/),
    "enter", "p", "n", "enter"];
  const declined = await replay(load("1265"), "85000000", [
    "j", trackTextile, "j", "enter", ...freePrisoner, "n",
    (text) => assert.match(text, /oh well.*he leaves/),
    "e", "s", "s", "i",
  ], directory);
  assert.match(visibleText(declined), /2,15 s.*quit to dos/);
  await replay(load("1769"), "85000000", [
    "j", (_text, frame) => {
      assert.ok(frame.journal?.leads.some(({ id }) => id === "textile-prisoner-left"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-prison-key-carried"));
      assert.equal(frame.journal.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /continue searching the western textile building/i);
    }, "j",
  ], directory);
  const recruited = await replay(load("1265"), "85000000", [
    "j", trackTextile, "j", "e", "a", "a", ...Array(7).fill("end"), "d",
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
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-prison-key-carried"));
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.equal(frame.journal.trackedId, "commission-textile");
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
  assert.deepEqual(readFileSync(checkpoint), originalCheckpoint);
  if (!verifyOgreRoute) {
    console.log("Verified the inventory-aware key objective, both recruitment choices, and the journal after reload.");
    return;
  }
  let coraHitPoints;
  const equippedParty = /brin 1 6.*cora 5 (\d+).*enna 2 5.*mira 10 5.*skullcrusher 1 39/;
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
    (text) => {
      assert.match(text, equippedParty);
      coraHitPoints = Number(equippedParty.exec(text)[1]);
      assert.ok(coraHitPoints > 0);
    },
    "s", "s", "h",
  ], directory);
  await replay(load("2368"), "85000000", [
    (text) => {
      assert.match(text, equippedParty);
      assert.equal(Number(equippedParty.exec(text)[1]), coraHitPoints);
    },
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

const backToNewPhlan = [
  "left", "up", "up", "left", ...Array(5).fill("up"), "right", ...Array(5).fill("up"),
  "right", "up", "left", "up", "right", "up", "up", "up", "right", ...Array(4).fill("up"),
  "f", "up", "up", "up", "left", "up", "left", "up", "up", "up", "right", "right", "f", "right", "up",
  "up", "enter", "enter",
  (text) => assert.match(text, /0,4 e/),
];
const returnToSlums = [
  "right", "right", ...Array(5).fill("up"), "right", ...Array(7).fill("up"),
  "left", ...Array(4).fill("up"), "enter", "enter",
  (text) => {
    expectParty(text);
    assert.match(text, /15,4 w.*slums of phlan/);
  },
];

async function verifyArmoredPatrols() {
  const win = (turns, experience) => [
    ...Array(turns).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", (text) => assert.match(text, new RegExp(`the party has won.*receives ${experience} experience points`)),
    "enter", "enter", "s", "e", "n",
  ];
  await replay(loadSlot("3062"), "85000000", [
    ...returnToSlums, "up", "left", "up", "up", "up",
    (text) => assert.match(text, /14,6 s.*surprised a party of kobolds/),
    "c", "enter", ...win(29, 5),
    "up", "right", "up", "right", ...Array(4).fill("up"),
    (text) => assert.match(text, /13,5 n.*surprised by kobolds/),
    "enter", "enter", ...win(33, 5),
    "up", "up", "up",
    (text) => assert.match(text, /13,3 n.*surprised a party of orcs/),
    "c", "enter", ...win(103, 12),
    "e", "enter", "s", "s", "d",
  ]);
  await replay(loadSlot("2064"), "85000000", [
    (text) => assert.match(text, /alda 3 4.*brin 1 6.*fenn 2 0.*13,3 n/),
    "end", "v",
    (text) => assert.match(text, /brin.*exp 718/),
  ]);
  const fullyRested = /alda 3 6.*brin 1 6.*cora 3 6.*dorn 3 8.*enna 2 6.*fenn 2 8.*13,1 w/;
  await replay(loadSlot("2064"), "85000000", [
    "up", "right", "up", "left", "up", "left", "up", "enter", "enter",
    (text) => assert.match(text, /13,1 w.*orcs are arguing over some papers/),
    "enter", "enter", "enter", ...Array(32).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", (text) => assert.match(text, /the party has won.*receives 92 experience points/),
    "enter", "enter",
    (text) => assert.match(text, /alda 3 4.*brin 1 4.*cora 3 6.*dorn 3 8.*enna 2 6.*fenn 2 0/),
    "s", ...Array(4).fill("end"), "t",
    (text) => assert.match(text, /loot clerical scroll with 2 spells/),
    "t", "e", "e", "enter", "r", "y", ...Array(8).fill("i"), "r", ...Array(35).fill("n"),
    (text) => assert.match(text, fullyRested),
    "s", "s", "a",
  ]);
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, fullyRested),
    ...Array(4).fill("end"), "v",
    (text) => assert.match(text, /enna.*exp 889.*hp 6/),
    "i", (text) => assert.match(text, /enna's items.*clerical scroll with 2 spells/),
  ]);
  console.log("Won three Slums patrols and the fixed orc outpost, then reloaded the fully rested party:", join(saveDir, "A.json"));
}

if (process.argv[2] === "--slums-armored-patrols-checkpoint") {
  assert.ok(process.argv[3], "Pass slot B from the replay that buys armor with Ohlo's reward.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  await verifyArmoredPatrols();
  process.exit(0);
}

async function verifySokalRecruitEquipment() {
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /cora 3 0 dorn 3 0.*swordsman 5 18.*curate 3 26.*8,14 n/),
    // Trade Cora's banded mail to the Swordsman and her shield to the Curate.
    "end", "end", "v", "i", "end", "r", "t", ...Array(4).fill("end"), "enter", "r", "t", "end", "enter", "e", "e",
    "end", "v", "i", "end", "end", "r", "t", ...Array(3).fill("end"), "enter", "e", "e",
    ...Array(3).fill("end"), "v", "i", "end", "end", "r", "end", "end", "r", "end", "r",
    (text) => assert.match(text, /swordsman's items.*no chain mail yes long sword yes banded mail yes shield/),
    "e", "e", "end", "v", "i", "end", "end", "r",
    (text) => assert.match(text, /curate's items.*yes mace yes plate mail yes shield/),
    "e", "e", "e", "s", "s", "a",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /swordsman 3 18.*curate 2 26.*8,14 n/),
    ...Array(6).fill("end"), "v", "i",
    (text) => assert.match(text, /swordsman's items.*yes banded mail yes shield/),
    "e", "e", "end", "v", "i",
    (text) => assert.match(text, /curate's items.*yes plate mail yes shield/),
    "e", "e", "c",
    (text) => assert.match(text, /curate's spells in memory.*bless bless.*hold person hold person/),
  ]);
  console.log("Reloaded the Swordsman at AC 3 and the Curate at AC 2 with Hold Person prepared:", join(saveDir, "A.json"));
}

if (process.argv[2] === "--sokal-equip-recruits-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot J landing save from the reinforced Slums party.");
  copyFileSync(process.argv[3], join(saveDir, "J.json"));
  await verifySokalRecruitEquipment();
  process.exit(0);
}

async function verifySokalReinforcement(fightToEnd = false) {
  const recruits = /swordsman 5 18.*curate 3 26/;
  await replay(loadSlot("2064"), "85000000", [
    "left", "left", "up", "left", "left", "up", "enter", "enter", "y", "y", ...Array(4).fill("end"),
    "b", "n", "n", ...Array(4).fill("end"), "b", ...Array(4).fill("end"), "b", "e", "v", "i", "i",
    "end", "end", "r", "end", "end", "r", "end", "r",
    (text) => assert.match(text, /enna's items.*no shield.*yes long bow yes 10 arrows/),
    "e", "e", "e", "e", "right", "right", "up", "right", ...Array(8).fill("up"),
    "left", "up", "up", "right", "up", "up", "right", "up", "up", "enter", "up", "enter", "enter", "n", "y",
    "n", "y", (text) => assert.match(text, /fine swordsman.*3 shares/),
    "y", "y", "n", "y", "n", "y", (text) => assert.match(text, /fine curate.*3 shares/),
    "y", "n", "right", "right", "e", "s", "s", "i",
  ]);
  await replay(loadSlot("1769"), "85000000", [
    (text) => assert.match(text, recruits),
    "right", "right", "up", "up", "left", "up", "enter", "enter", "enter", "n", "right", "up", "enter", "enter",
    "right", "up", "up", "left", "up", "left", "up", "enter", "enter", "right", ...Array(4).fill("up"),
    ...Array(5).fill("enter"), "e", "s", "s", "j",
  ]);
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /swordsman 5 18.*curate 3 26.*8,14 n/),
    "up", "left", "up", "up", "enter", "enter", "end", "enter",
    (text) => assert.match(text, /crumbling parchment scroll/),
    "enter", "enter", "enter", "right", "right", "up", "up", "left", "up", "up", "right", "up", "up",
    "left", "up", "up", "left", "enter", "p", "n", ..."shestni", "enter",
    (text) => assert.match(text, /the undead leave/),
    ...Array(5).fill("up"), ...Array(7).fill("end"), "c", ...Array(8).fill("home"), "enter",
    (text) => assert.match(text, /curate's spells in memory.*bless cure light wounds/),
    "e", "left", "up", "up", "enter",
    (text) => assert.match(text, /8,5 w.*a large force of orcs and hobgoblins rushes you/),
    "enter", "enter", "enter", ...Array(38).fill("q"), "space",
    (text) => assert.match(text, /alda hitpoints 6 ac 3 short sword.*move view aim/),
    "a", "n", "n",
    (text) => assert.match(text, /orc hitpoints 5 ac 6 range = 1.*manual target/),
    "t",
    (text) => assert.match(text, /enna hitpoints 3 ac 3 long bow.*move view aim/),
    "a", ...Array(6).fill("n"),
    (text) => assert.match(text, /hobgoblin hitpoints 6 ac 5 long sword \(helpless\) range = 3.*manual target/),
    "t", "q",
    (text) => assert.match(text, /orc hitpoints 5 ac 6 move\/attack/),
    ...Array(9).fill("q"),
    (text) => assert.match(text, /brin hitpoints 6 ac 1.*move view aim use quick done/),
    "alt-q", "z",
    (text) => assert.match(text, /hobgoblin hitpoints 6 ac 5.*move\/attack/),
    ...(fightToEnd ? [["q", /the monsters rejoice for the party has been destroyed/, 1400]] : []),
  ]);
  console.log("Equipped and recruited the party, then verified manual sword and bow attacks at Sokal:", join(saveDir, "J.json"));
  if (fightToEnd) console.log("The first courtyard fight reached the original defeat screen.");
}

if (process.argv[2] === "--sokal-reinforce-from-slums") {
  assert.ok(process.argv[3], "Pass the slot D from the goblin loot sale at the armorer.");
  assert.ok(!process.argv[4] || process.argv[4] === "--fight-to-end", "Expected --fight-to-end after the checkpoint");
  copyFileSync(process.argv[3], join(saveDir, "D.json"));
  await verifySokalReinforcement(process.argv[4] === "--fight-to-end");
  process.exit(0);
}

async function verifyGoblinLootSale() {
  await replay(loadSlot("2e63"), "85000000", [
    "v", "i", ...Array(5).fill("end"), "t", ...Array(5).fill("end"), "enter", "e", "e",
    ...Array(5).fill("end"), "v", "i", ...Array(3).fill("end"), "r",
    (text) => assert.match(text, /fenn's items.*yes short sword/),
    "e", "e", "end",
    "right", "right", "up", "left", ...Array(3).fill("up"), "right", ...Array(5).fill("up"),
    "left", "up", "left", ...Array(3).fill("up"), "right", "up", "up", "enter", "enter",
    (text) => assert.match(text, /0,4 e.*gateway to the unsettled areas/),
    "up", "up", "up", "enter", "right", ...Array(7).fill("up"), "left", ...Array(5).fill("up"),
    "y", "y", "p", "v", "i", "i", ...Array(3).fill("end"), "i",
    (text) => assert.match(text, /200 gold pieces.*identify your leather armor/),
    "y", "s",
    (text) => assert.match(text, /1000 gold pieces for your leather armor \+1/),
    "y", "e", "e", "e", "p", "s", "e", "e", "s", "s", "d",
  ]);
  await replay(loadSlot("2064"), "85000000", [
    (text) => assert.match(text, /8,11 e/),
    "v", "v", (text) => assert.match(text, /alda.*platinum 39.*weapon short sword/),
    "e", ...Array(5).fill("end"), "v", "i",
    (text) => assert.match(text, /fenn's items.*yes short sword/),
  ]);
  console.log("Readied Fenn's sword and reloaded the shared proceeds of the goblin armor sale:", join(saveDir, "D.json"));
}

if (process.argv[2] === "--slums-goblin-sale-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot C with the swords and leather armor from the goblin room.");
  copyFileSync(process.argv[3], join(saveDir, "C.json"));
  await verifyGoblinLootSale();
  process.exit(0);
}

async function verifyGoblinRoom() {
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /13,1 w/),
    "right", "right", "up", "right", "up", "right", ...Array(4).fill("up"), "right", "up",
    (text) => assert.match(text, /10,2 n.*locked.*bash exit/),
    "b", "enter", "enter",
    (text) => assert.match(text, /10,1 n.*healthy-looking goblin.*young warriors/),
    "enter", "enter", "enter", ...Array(207).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", (text) => assert.match(text, /the party has won.*receives 181 experience points/),
    "enter", "enter", "s", "t",
    (text) => assert.match(text, /loot leather armor short sword short sword/),
    "t", "t", "t", "e", "e", "n", "e", "enter", "r", "y", ...Array(8).fill("i"), "r", ...Array(35).fill("n"),
    (text) => assert.match(text, /alda 3 6.*brin 1 6.*cora 3 0.*dorn 3 0.*enna 2 6.*fenn 2 8.*10,1 n/),
    "s", "s", "b",
  ]);
  await replay(loadSlot("3062"), "85000000", [
    "v", "i", ...Array(4).fill("end"), "r", "e",
    (text) => assert.match(text, /alda.*exp 991.*damage 1d6.*weapon short sword/),
    "e", "end", "end", "v", (text) => assert.match(text, /cora.*status dead/),
    "e", "end", "v", (text) => assert.match(text, /dorn.*status dead/),
    "e", "e", "enter", "s", "s", "c",
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    "v", "i", (text) => assert.match(text, /alda's items.*leather armor yes short sword no short sword/),
  ]);
  console.log("Cleared the Slums goblin room and reloaded the salvaged gear:", join(saveDir, "C.json"));
}

if (process.argv[2] === "--slums-goblin-checkpoint") {
  assert.ok(process.argv[3], "Pass the rested slot A from the armored orc outpost replay.");
  copyFileSync(process.argv[3], join(saveDir, "A.json"));
  await verifyGoblinRoom();
  process.exit(0);
}

async function verifyOhloArmor() {
  const armorClass = /alda 3 6.*brin 1 6.*cora 3 6.*dorn 3 8.*enna 2 6.*fenn 2 8/;
  await replay(loadSlot("246a"), "85000000", [
    ...backToNewPhlan, "up", "up", "up", "enter", "right", ...Array(7).fill("up"),
    "left", ...Array(5).fill("up"), "y", "y",
    ...names.flatMap((name, index) => [
      ...(index ? ["end"] : []),
      "b", "n", "n", ...Array(index ? 15 : 16).fill("end"), "b", "end", "end", "b", "e", "v", "i", "i",
      ...(name === "brin" ? ["end"] : []), "r", "end", "r", "end", "r",
      (text) => assert.match(text, new RegExp(`${name}'s items.*no chain mail.*yes banded mail.*yes shield`)),
      "e", "e", "e",
    ]),
    "e", "e", "s", "s", "b",
  ]);
  await replay(loadSlot("3062"), "85000000", [(text) => assert.match(text, armorClass)]);
  console.log("Bought banded mail and shields for all six fighters with Ohlo's reward and reloaded their improved armor class.");
  console.log("Armored party save:", join(saveDir, "B.json"));
}

if (process.argv[2] === "--ohlo-armor-checkpoint") {
  assert.ok(process.argv[3], "Pass a six-fighter save outside Ohlo's door after collecting his reward.");
  copyFileSync(process.argv[3], join(saveDir, "J.json"));
  await verifyOhloArmor();
  process.exit(0);
}

if (process.argv[2] === "--slums-orcs-checkpoint") {
  assert.ok(process.argv[3], "Pass a six-fighter save just inside the Slums gate.");
  copyFileSync(process.argv[3], join(saveDir, "C.json"));
  await replay(loadSlot("2e63"), "85000000", [
    (text) => assert.match(text, /15,4 w/),
    "up", "left", "up", "up", "up", "right", "up", "right", ...Array(5).fill("up"),
    "right", "up", "left", "up", "left", "up", "enter", "enter",
    (text) => assert.match(text, /13,1 w.*orcs are arguing over some papers/),
    "enter", "enter", "enter", ...Array(47).fill("q"),
    (text) => assert.match(text, /continue battle:yes no/),
    "n", (text) => assert.match(text, /the party has won.*receives 154 experience points/),
    "enter", "enter", "s", ...Array(4).fill("end"), "t", "i",
    (text) => assert.match(text, /loot clerical scroll with 2 spells/),
    "t", "e", "e", "e", "n", "e", "e", "s", "s", "a",
  ]);
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /13,1 w/),
    ...Array(4).fill("end"), "v",
    (text) => assert.match(text, /enna.*exp 169.*hp 6/),
    "i", (text) => assert.match(text, /enna's items.*clerical scroll with 2 spells/),
  ]);
  console.log("Won the Slums orc outpost fight and reloaded Enna with the earned XP and clerical scroll.");
  process.exit(0);
}

async function verifySokalPatrolVictory({ rejectedWord = false, equipped = false } = {}) {
  const patrolSurvivors = equipped
    ? /brin 1 5.*swordsman 4 18.*curate 2 26.*10,10 n/
    : /brin 1 5.*swordsman 5 18.*curate 3 26.*10,10 n/;
  await replay(loadSlot(equipped ? "1e61" : "246a"), "85000000", [
    "up", "left", "up", "up", "enter", "enter", "end", "enter",
    (text) => assert.match(text, /crumbling parchment scroll/),
    "enter", "enter", "enter", "right", "right", "up", "up", "left", "up", "up",
    "right", "up", "up", "left", "up", "up", "left", "enter",
    (text) => assert.match(text, /pack of undead suddenly appears.*combat wait flee parlay/),
    ...(rejectedWord ? ["p", "n", ..."zzz", "enter",
      (text) => assert.match(text, /they didn't like that word/)] : ["c"]),
    "enter", "enter", "enter", ["q", /continue battle|party has been destroyed/, 650],
    (text) => assert.match(text, /continue battle/),
    "n", (text) => assert.match(text, /the party has won.*receives 40 experience points/),
    "enter", "enter", "e",
    (text) => assert.match(text, patrolSurvivors),
    "e", "s", "s", "c",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    (text) => assert.match(text, patrolSurvivors),
    "j", (_text, frame) => {
      const leads = frame.journal.leads;
      assert.ok(leads.some(({ id }) => id === "sokal-parchment"));
      assert.equal(leads.some(({ id }) => id === "sokal-patrol-rejected-word"), rejectedWord);
      assert.ok(!leads.some(({ id }) => id === "sokal-patrol-passed"));
      assert.ok(!leads.some(({ id }) => id === "sokal-ferran"));
    }, "j", "v",
    (text) => assert.match(text, /alda.*exp 1031/),
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    "up", "up", "up", "right", "up", "up", "up", "b",
    (text) => assert.match(text, /12,7 e.*a pack of undead suddenly appears.*parlay/),
    "p", "n", ..."shestni", "enter",
    (text) => assert.match(text, /the undead leave/),
    "j", (_text, frame) => assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-patrol-passed")), "j",
    "up", "left", "up", "right", "up", "left",
    (text) => assert.match(text, /croaking rises in volume/),
    "w", "enter", ["q", /continue battle|party has been destroyed/, 350],
    (text) => assert.match(text, /continue battle/),
    "n", (text) => assert.match(text, /the party has won.*receives 31 experience points/),
    "enter", "enter", "e", "left", "up",
    (text) => assert.match(text, /14,5 n.*keep's old armory/),
    "enter", "enter", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await verifySokalArmory(saveDir, false);
  console.log("Won the first patrol and the smithy fight, then recovered the hidden equipment:", join(saveDir, "E.json"));
}

if (process.argv[2] === "--sokal-patrol-victory-checkpoint") {
  assert.ok(process.argv[3], "Pass the reinforced party's landing save.");
  const options = process.argv.slice(4);
  assert.ok(options.every((option) => ["--reject-word", "--equipped"].includes(option)), "Expected --reject-word or --equipped");
  const equipped = options.includes("--equipped");
  copyFileSync(process.argv[3], join(saveDir, equipped ? "A.json" : "J.json"));
  await verifySokalPatrolVictory({ rejectedWord: options.includes("--reject-word"), equipped });
  process.exit(0);
}

const armoryToTemple = [
  "right", "right", "up", "left", "up", "up", "up", "right", "up", "right", "up", "left",
  ...Array(4).fill("up"), "right", "up", "left", "up", "right", "up", "up", "up", "left",
  ...Array(4).fill("up"), "y", "up", "up", "right", "up", "up", "left", ...Array(5).fill("up"),
  (text) => assert.match(text, /take a boat back to phlan/),
  "y", "y", "enter", "enter", "enter",
  (text) => assert.match(text, /15,1 w/),
  ...Array(4).fill("up"), "left", "up", "up", "y", "y",
  (text) => assert.match(text, /heal view pool appraise exit/),
];

async function verifySokalTempleRecovery(equipped) {
  const armoryParty = equipped
    ? /brin 1 0.*swordsman 3 17.*curate 2 25.*12,0 n/
    : /brin 1 0.*swordsman 5 17.*curate 3 25.*12,0 n/;
  await replay(loadSlot("1265"), "85000000", [
    (text) => assert.match(text, armoryParty),
    // Brin collected the longsword, so trade it to Alda before readying it.
    "end", "v", "i", ...Array(4).fill("end"), "t", "home", "enter", "e", "e", "home", "v", "i",
    "end", "end", "end", "r", "end", "r", "e",
    (text) => assert.match(text, /alda.*exp 1462.*damage 1d8\+1.*weapon long sword/),
    "e",
    // Move the fallen fighters' armor and shields to the two recruits.
    ...(equipped ? [] : [
      "end", "end", "v", "i", "end", "r", "t", ...Array(4).fill("end"), "enter", "r", "t", "end", "enter", "e", "e",
      "end", "v", "i", "end", "end", "r", "t", ...Array(3).fill("end"), "enter", "e", "e",
      ...Array(3).fill("end"), "v", "i", "end", "r", "end", "end", "r", "end", "r",
      (text) => assert.match(text, /swordsman's items.*no chain mail yes long sword yes banded mail yes shield/),
      "e", "e", "end", "v", "i", "end", "end", "r",
      (text) => assert.match(text, /curate's items.*yes plate mail yes shield/),
      "e", "e",
    ]),
    "e", "s", "s", "f",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2166"), "85000000", [
    (text) => assert.match(text, /swordsman 3 17.*curate 2 25.*12,0 n/),
    ...armoryToTemple, "end", "a",
    (text) => assert.match(text, /alda.*1 piece of jewelry.*appraise/),
    "j", (text, frame) => {
      assert.match(text, /the jewel is valued at 5279 gp.*sell keep/);
      assert.equal(frame.journal, undefined);
    },
    "s", "p", "end", "h",
    (text) => assert.match(text, /brin, how can we help you.*raise dead/),
    ...Array(6).fill("end"), "h",
    (text) => assert.match(text, /raise dead will only cost 5500 gold pieces/),
    "y", "e",
    (text) => assert.match(text, /brin 1 1.*heal view take pool share appraise exit/),
    "h", "end", "end", "h",
    (text) => assert.match(text, /cure light wounds will only cost 100 gold pieces/),
    "y", "e", "s", "e",
    (text) => assert.match(text, /brin 1 6.*11,3 s/),
    "end", "v", "i", "i", ...Array(5).fill("end"), "r", "e",
    (text) => assert.match(text, /brin.*thac0 18.*hp 6.*damage 1d6\+3.*weapon mace/),
    "e", "e", "s", "s", "g",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2267"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*swordsman 3 17.*curate 2 25.*11,3 s/),
    "v", (text) => assert.match(text, /alda.*exp 1462.*weapon long sword/),
    "e", "e", "end", "v",
    (text) => assert.match(text, /brin.*platinum 26.*con 11.*hp 6.*weapon mace.*status okay/),
  ]);
  console.log("Raised and healed Brin, readied his mace, and reloaded at the Temple of Tyr:", join(saveDir, "G.json"));
}

const takeBoat = [
  "right", "right", "up", "right", "up", "up", "enter", "enter", "right",
  ...Array(6).fill("up"), "left", "up", "right", "up", "left", "up", "enter", "enter",
  (text) => assert.match(text, /only boat.*sokal keep.*end of the pier/),
  "right", ...Array(4).fill("up"), "enter", "enter", "enter",
  (text) => assert.match(text, /boat disembarks you at sokal keep/),
  "enter", "enter",
];
async function verifySokalRestoredCouncil() {
  const checkSlumsProgress = (_text, frame) => {
    const slums = frame.journal.leads.find(({ id }) => id === "commission-slums");
    assert.equal(slums?.status, "accepted");
    assert.equal(slums.clearedEncounters, 7);
    assert.match(slums.detail, /7 of 25 encounters cleared/);
  };
  const trackCommission = (commissionId) => (_text, frame) => {
    const open = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
    const index = open.findIndex(({ id }) => id === commissionId);
    assert.ok(index >= 0, `Expected an open commission for ${commissionId}`);
    return `track ${index + 1}`;
  };
  await replay(loadSlot("2267"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*11,3 s/),
    "right", "right", "up", "left", "up", "left", "up", "right", "up", "up", "up",
    "left", "up", "right", "up", "up", "enter", "up", "enter", "enter", "up", "left", "up",
    "enter", "enter", "enter", "enter",
    (text) => assert.match(text, /sokal keep on thorn island must be cleared/),
    "enter", "enter",
    "j", checkSlumsProgress, trackCommission("commission-slums"), (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-slums");
      assert.match(frame.journal.objective.nextStep, /keep clearing encounters.*7 of 25 encounters cleared/i);
    }, trackCommission("commission-sokal"), (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-sokal");
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-armory-stands"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-ferran"));
      assert.match(frame.journal.objective.nextStep, /ready any gear you took/i);
    }, "j", "e", "s", "s", "i",
    (text) => assert.match(text, /5,5 e.*quit to dos/),
  ]);
  await replay(loadSlot("1769"), "85000000", [
    "j", checkSlumsProgress, (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-sokal");
      assert.ok(frame.journal.leads.some(({ id, status }) => id === "commission-sokal" && status === "offered"));
    }, "j",
    ...takeBoat,
    (text) => assert.match(text, /brin 1 6.*8,14 n/),
    "j", (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-sokal");
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-arrival"));
    }, "j", "e", "s", "s", "j",
    (text) => assert.match(text, /8,14 n.*quit to dos/),
  ]);
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*8,14 n/),
    "j", (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-sokal");
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-armory-stands"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-ferran"));
    },
  ]);
  console.log("Heard and tracked the Sokal commission, then returned to Thorn Island:", join(saveDir, "J.json"));
}

if (process.argv[2] === "--sokal-restored-council-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot G temple save after raising Brin.");
  copyFileSync(process.argv[3], join(saveDir, "G.json"));
  await verifySokalRestoredCouncil();
  process.exit(0);
}

const firstSokalPatrol = [
  "up", "left", "up", "up", "enter", "enter", "end", "enter",
  (text) => assert.match(text, /crumbling parchment scroll/),
  "enter", "enter", "enter",
  "right", "right", "up", "up", "left", "up", "up", "right", "up", "up",
  "left", "up", "up", "left",
  (text) => assert.match(text, /pack of undead suddenly appears.*parlay/),
];

if (process.argv[2] === "--sokal-patrol-word-checkpoint") {
  assert.ok(process.argv[3], "Pass slot F at the Thorn Island landing with the Sokal commission.");
  copyFileSync(process.argv[3], join(saveDir, "F.json"));
  const trackSokal = (_text, frame) => {
    const objectives = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
    const index = objectives.findIndex(({ id }) => id === "commission-sokal");
    assert.ok(index >= 0);
    return `track ${index + 1}`;
  };
  await replay(loadSlot("2166"), "85000000", [
    ...firstSokalPatrol, "p", "n", ..."shestni", "enter",
    (text) => assert.match(text, /the undead leave/),
    "j", trackSokal, (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-patrol-passed"));
      assert.match(frame.journal.objective.nextStep, /SHESTNI again/);
      assert.doesNotMatch(frame.journal.objective.nextStep, /SAMOSUD/);
    },
  ]);
  await replay(loadSlot("2166"), "85000000", [
    ...firstSokalPatrol, "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-parchment"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-patrol-rejected-word"));
    }, "j", "p", "n", ..."zzz", "enter",
    (text) => assert.match(text, /they didn't like that word/),
    "j", trackSokal, (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-patrol-rejected-word"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-patrol-passed" || id === "sokal-ferran"));
      assert.match(frame.journal.objective.nextStep, /different word from the parchment/);
    }, "j", "enter",
    (text) => assert.match(text, /a battle begins/),
  ]);
  console.log("Verified both patrol word outcomes and their journal guidance.");
  process.exit(0);
}

async function verifySokalTrackedAmbush(replenishCurate = false) {
  const landingSave = join(saveDir, "J.json");
  const savedLanding = readFileSync(landingSave);
  const checkAmbush = (seen) => (_text, frame) => {
    const journal = frame.journal;
    assert.equal(journal.trackedId, "commission-sokal");
    assert.equal(journal.leads.some(({ id }) => id === "sokal-ambush"), seen);
    assert.ok(!journal.leads.some(({ id }) => id === "sokal-ferran"));
    if (seen) {
      assert.ok(journal.leads.some(({ id }) => id === "phlan-temple-healing"));
      assert.match(journal.objective.nextStep, /ready weapons and spells.*Temple of Tyr/);
      assert.match(journal.objective.nextStep, /at the landing.*encamp.*magic and memorize.*replenish spent spells/i);
      if (journal.leads.some(({ id }) => id === "phlan-arena-recruits")) {
        assert.match(journal.objective.nextStep, /arena recruits act on their own.*choose their targets/i);
      }
    } else {
      assert.match(journal.objective.nextStep, /ready any gear you took/i);
      assert.doesNotMatch(journal.objective.nextStep, /replenish spent spells/i);
    }
  };
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*8,14 n/),
    ...(replenishCurate ? [
      ...Array(7).fill("end"), "e", "m", "m", "m", "n", ...Array(7).fill("home"),
      "end", "end", "m", "m", "e", "enter",
      (text) => assert.match(text, /memorized.*\*hold person \*hold person.*memorize these spells/),
      "y", "r", "r", "c",
      (text) => assert.match(text, /curate's spells in memory.*hold person hold person/),
      "e", "e", "e", "home",
    ] : []),
    "j", checkAmbush(false), "j",
    "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
    "p", "n", ..."shestni", "enter",
    (text) => assert.match(text, /10,10 n.*the undead leave/),
    ...(replenishCurate ? [
      "up", "up", "up", (text) => assert.match(text, /10,9 n.*do you give the password/), "y",
      "up", "up", "up", "up", "left",
      (text) => assert.match(text, /10,6 n.*do you give the password/), "y", "up", "left", "up",
      (text) => assert.match(text, /9,5 w.*area cast view/),
    ] : [
      ...Array(5).fill("up"), "enter", "y", "up", "left", "up", "y", "left",
      (text) => assert.match(text, /9,5 w.*do you give the password/),
      "y", (text) => assert.match(text, /the undead leave/),
    ]),
    "up", "enter",
    (text) => assert.match(text, /8,5 w.*a large force of orcs and hobgoblins rushes you/),
    "j", checkAmbush(true), "j",
    "enter", "enter", "enter",
    ...(replenishCurate ? [] : [
      ["space", /brin hitpoints 6 ac 1 mace move view aim use quick done/, 20],
      "space", (text) => assert.match(text, /brin hitpoints 6 ac 1 mace move view aim use quick done/),
      "a", "n", "n", "n",
      (text) => {
        assert.match(text, /orc hitpoints 2 ac 6 range = 3.*aim:next/);
        assert.doesNotMatch(text, /manual target/);
      },
      "e", "m",
      (text) => assert.match(text, /brin hitpoints.*move\/attack, move left = 3/),
      "right",
      (text) => assert.match(text, /brin hitpoints.*move\/attack, move left = 2/),
      "pagedown", "a", "n", "n", "n",
      (text) => assert.match(text, /orc hitpoints 2 ac 6 range = 1.*manual target/),
      "t",
      (text) => assert.match(text, /curate hitpoints 25 ac 2 mace/),
      "space",
      (text) => assert.match(text, /curate hitpoints 25 ac 2 mace move\/attack/),
    ]),
    ["q", /the monsters rejoice for the party has been destroyed/, 1400],
  ]);
  assert.deepEqual(readFileSync(landingSave), savedLanding);
  await replay(loadSlot("246a"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*8,14 n/),
    "j", checkAmbush(false),
  ]);
  console.log(replenishCurate
    ? "Replenished Hold Person at the Sokal landing and reloaded after the courtyard defeat."
    : "Verified Brin's manual mace attack, then reloaded the unchanged Sokal landing after the courtyard defeat.");
}

if (process.argv[2] === "--sokal-tracked-ambush-checkpoint") {
  assert.ok(process.argv[3], "Pass slot J after the restored party hears the Sokal commission.");
  assert.ok(!process.argv[4] || process.argv[4] === "--replenish-curate", "Expected --replenish-curate after the checkpoint");
  copyFileSync(process.argv[3], join(saveDir, "J.json"));
  await verifySokalTrackedAmbush(process.argv[4] === "--replenish-curate");
  process.exit(0);
}

if (process.argv[2] === "--sokal-armory-reinforcement-checkpoint") {
  assert.ok(process.argv[3], "Pass slot E from the reinforced party's hidden armory recovery.");
  const options = process.argv.slice(4);
  assert.ok(options.every((option) => ["--equipped", "--return-to-courtyard"].includes(option)),
    "Expected --equipped or --return-to-courtyard");
  copyFileSync(process.argv[3], join(saveDir, "E.json"));
  await verifySokalTempleRecovery(options.includes("--equipped"));
  if (options.includes("--return-to-courtyard")) {
    await verifySokalRestoredCouncil();
    await verifySokalTrackedAmbush();
  }
  console.log("Campaign checkpoint directory:", saveDir);
  process.exit(0);
}

if (process.argv[2] === "--sokal-recovered-courtyard-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot G temple save after raising Brin.");
  const hireTwo = process.argv[4] === "--warrior-and-theurgist";
  const finishEvokerFight = process.argv[4] === "--evoker-fight-to-end";
  assert.ok(!process.argv[4] || hireTwo || finishEvokerFight,
    "Expected --warrior-and-theurgist or --evoker-fight-to-end after the checkpoint");
  copyFileSync(process.argv[3], join(saveDir, "G.json"));
  await replay(loadSlot("2267"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*cora 10 0.*swordsman 3 17.*curate 2 25.*11,3 s/),
    "e", "a", "a", "end", "end", "d",
    (text) => assert.match(text, /cora will be gone.*drop from party/),
    "y", ...(hireTwo ? [
      "end", "d", (text) => assert.match(text, /dorn will be gone.*drop from party/), "y",
    ] : []), "e", "e",
    "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
    "enter", "enter", "enter", "n", "left", "up", "right", "up", "up", "up", "enter", "enter", "n",
    (text) => assert.match(text, /do you seek a partner for your adventuring/),
    "y", ...(hireTwo ? [
      "n", "y", "n", "y",
      (text) => assert.match(text, /fine warrior who will join you for 1 share/),
      "y", "y", "n", "y", "n", "y",
      (text) => assert.match(text, /fine theurgist who will join you for 4 shares/),
    ] : [
      ...Array(5).fill(["n", "y"]).flat(),
      (text) => assert.match(text, /fine evoker who will join you for 2 shares/),
    ]),
    "y", "n", "e", "s", "s", "h",
    (text) => assert.match(text, hireTwo
      ? /warrior 3 13 theurgist 8 13.*7,1 w.*quit to dos/
      : /evoker 9 6.*7,1 w.*quit to dos/),
  ]);
  await replay(loadSlot("2368"), "85000000", [
    ...Array(7).fill("end"), "c",
    (text) => assert.match(text, hireTwo
      ? /theurgist's spells in memory.*knock.*sleep sleep.*stinking cloud/
      : /evoker's spells in memory.*sleep sleep/),
  ]);
  await replay(loadSlot("2368"), "85000000", [
    "right", "right", "up", "up", "left", "up", "enter", "enter", "enter", "n",
    "right", "up", "enter", "enter", "right", "up", "up", "left", "up", "left", "up",
    "enter", "enter", "right", ...Array(4).fill("up"), ...Array(5).fill("enter"),
    (text) => assert.match(text, hireTwo ? /brin 1 6.*warrior 3 13 theurgist 8 13.*8,14 n/ : /brin 1 6.*evoker 9 6.*8,14 n/),
    "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
    "p", "n", ..."shestni", "enter",
    (text) => assert.match(text, /9,11 e.*the undead leave/),
    "up", "left", "up", ...Array(5).fill("up"), "enter", "y", "up", "left", "up", "y",
    "left", "up", "up", "y", "y", "up", "enter",
    (text) => assert.match(text, /8,5 w.*large force of orcs and hobgoblins rushes you/),
    "enter", "enter", "enter", ...(hireTwo ? [
      ["q", /theurgist hitpoints 13 ac 8 dagger/, 100],
      ["q", /warrior hitpoints 13 ac 3 silver battle axe/, 40],
      ["q", /party has been destroyed/, 1400],
    ] : [["q", /evoker hitpoints 6 ac 9/, 100]]),
    ...(finishEvokerFight ? [["q", /the monsters rejoice for the party has been destroyed/, 1400]] : []),
  ]);
  if (finishEvokerFight) {
    await replay(loadSlot("2368"), "85000000", [
      (text) => assert.match(text, /brin 1 6.*evoker 9 6.*7,1 w/),
      ...Array(7).fill("end"), "c",
      (text) => assert.match(text, /evoker's spells in memory.*sleep sleep/),
    ]);
    console.log("Finished the Evoker's courtyard attempt and reloaded the recruited party after defeat.");
  }
  console.log(hireTwo ? "Recruited the Warrior and Theurgist and verified the full courtyard combat replay:"
    : "Recruited the Evoker and reached his first courtyard turn with Brin restored:", join(saveDir, "H.json"));
  process.exit(0);
}

if (process.argv[2] === "--sokal-armory-checkpoint") {
  assert.ok(process.argv[3], "Pass a save in Sokal's old armory after defeating the smithy frogs.");
  copyFileSync(process.argv[3], join(saveDir, "D.json"));
  await verifySokalArmory(saveDir);
  console.log("Followed the hidden-armory clue, took the equipment and verified the updated journal after reload.");
  process.exit(0);
}

if (process.argv[2] === "--sokal-smithy-checkpoint") {
  assert.ok(process.argv[3], "Pass a save in Sokal's old armory after defeating the smithy frogs.");
  await verifySokalSmithy(process.argv[3]);
  process.exit(0);
}

if (process.argv[2] === "--sokal-funded-training-checkpoint") {
  assert.ok(process.argv[3], "Pass slot F from the hidden armory after reading Alda's recovered sword.");
  copyFileSync(process.argv[3], join(saveDir, "F.json"));
  const checkExperience = (_text, frame) => {
    assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-training-experience"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "phlan-training-fee"));
  };
  await replay(loadSlot("2166"), "85000000", [
    ...armoryToTemple, "end", "a", "j", "s", "p", "t", "end", "enter", "2", "0", "0", "enter",
    (text) => assert.match(text, /platinum 1076.*select type of coin/),
    "e", "v",
    (text) => assert.match(text, /alda.*platinum 200.*level 1 exp 1462/),
  ]);
  await replay(loadSlot("2166"), "85000000", [
    ...armoryToTemple, "end", "a", "j",
    (text) => assert.match(text, /the jewel is valued at 5279 gp.*sell keep/),
    "s", "p", "s", "e", "v", "v",
    (text) => assert.match(text, /alda.*platinum 213.*level 1 exp 1462/),
    "e",
    "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
    "enter", "enter", "enter", "n", "left", "up", "right", "up", "right", "up", "enter", "enter",
    (text) => assert.match(text, /8,0 n.*we train only fighters here/),
    "y", "t", "v",
    (text) => assert.match(text, /alda.*platinum 213.*level 1 exp 1462/),
    "escape", "b", "j", checkExperience, "j", "e", "s", "s", "i",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("1769"), "85000000", ["j", checkExperience]);
  console.log("Funded training from the armory jewel and verified the original experience refusal after reload.");
  process.exit(0);
}

if (process.argv[2] === "--sokal-restored-arena-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot G temple save after raising Brin.");
  copyFileSync(process.argv[3], join(saveDir, "G.json"));
  await replay(loadSlot("2267"), "85000000", [
    (text) => assert.match(text, /brin 1 6.*11,3 s/),
    "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
    "enter", "enter", "enter", "n", "left", "up", "right", "up", "up", "enter", "enter",
    (text) => assert.match(text, /7,1 w.*arena master asks if you wish to duel/),
    "y", (text) => assert.match(text, /who will duel/),
    ...Array(7).fill("home"), "enter", "enter", "enter", ["q", /continue battle:yes no/, 100],
    "n", (text) => assert.match(text, /you have won the duel.*duelist receives 100 experience points/),
    "enter", "enter", "s", "e", "n", "e", "s", "s", "h",
    (text) => assert.match(text, /7,1 w.*quit to dos/),
  ]);
  await replay(loadSlot("2368"), "85000000", [
    "v", "v", (text) => assert.match(text, /alda.*level 1 exp 1562/),
    "e", "left", "left", "up", "left", "up", "enter", "enter",
    (text) => assert.match(text, /8,0 n.*we train only fighters here/),
    "j", (_text, frame) => assert.ok(!frame.journal.leads.some(({ id }) => id === "phlan-training-fee")), "j",
    "y", "t", "v", (text) => assert.match(text, /alda.*platinum 27.*level 1 exp 1562/),
    "escape", "b", "j", (_text, frame) => {
      const outcome = frame.journal.leads.find(({ id }) => id === "phlan-training-fee");
      assert.match(outcome?.detail ?? "", /1,000 gold.*view character/i);
    }, "j", "e", "s", "s", "i",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("1769"), "85000000", [
    "j", (_text, frame) => assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-training-fee")),
  ]);
  console.log("Won an arena duel with the recovered party and reloaded Alda's earned 100 XP.");
  process.exit(0);
}

if (process.argv[2] === "--fighter-training-journal-checkpoint") {
  assert.ok(process.argv[3], "Pass slot A from the New Phlan Cadorna commission replay.");
  copyFileSync(process.argv[3], join(saveDir, "A.json"));
  await verifyFighterTrainingJournal();
  process.exit(0);
}

if (process.argv[2] === "--mage-training-checkpoint") {
  assert.ok(process.argv[3], "Pass the eligible Darkstar save in the Slums at (14,7), facing south.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  const trained = /darkstar.*magic-user.*platinum 50.*level 2 exp 5000.*hp 7/;
  const checkMageSchool = (_text, frame) => {
    const school = frame.journal.leads.find(({ id }) => id === "phlan-training-magic-users");
    assert.match(school?.detail ?? "", /east door at the northern training school.*train character/i);
  };
  await replay(loadSlot("3062"), "85000000", [
    (text) => assert.match(text, /darkstar 7 5.*14,7 s/),
    "left", "left", "up", ...Array(4).fill("enter"),
    (text) => assert.match(text, /magic users and clerics to go north/),
    "up", "up", (text) => assert.match(text, /magic users to go through the east door/),
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-training-north"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "phlan-training-magic-users"));
    }, "j",
    "right", "up", "enter", (text) => assert.match(text, /7,0 e.*we train only magic users here/),
    "j", checkMageSchool, "j",
    "y", ...Array(4).fill("end"), "t",
    (text) => assert.match(text, /darkstar will become: a level 2 magic-user/),
    "y", (text) => assert.match(text, /darkstar's spells to choose from.*magic missile.*choose spell: learn/),
    ...Array(6).fill("end"), "enter", "v", "v", (text) => assert.match(text, trained),
    "e", "s", "s", "c",
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    ...Array(4).fill("end"), "v", "v", (text) => assert.match(text, trained),
    "e", "b", "enter", "e", "m", "m", "m",
    (text) => assert.match(text, /darkstar's spells in spell book.*magic missile/),
    "e", "e", "e", "j", checkMageSchool, "j",
    "right", "right", "up", "left", "up", "up", "right", "up", "enter", "enter",
    "left", "up", "left", "up", "up", "right", ...Array(9).fill("up"), "right", "up", "enter",
    (text) => assert.match(text, /6,12 w.*1 platinum piece to rest here/),
    "y", "enter", "enter", "m", "m",
    "end", "end", "m", "e", "enter",
    (text) => assert.match(text, /spells to be memorized.*\*magic missile/),
    "y", "r", (text) => assert.match(text, /rest time: 00:04:15/), "r", "c",
    (text) => assert.match(text, /darkstar's spells in memory.*magic missile/),
    "e", "e", "v", "v", (text) => assert.match(text, /darkstar.*platinum 49.*level 2/),
    "e", "j", (_text, frame) => assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-paid-rest")),
    "j", "s", "s", "d",
  ]);
  await replay(loadSlot("2064"), "85000000", [
    ...Array(4).fill("end"), "v", "v", (text) => assert.match(text, /darkstar.*platinum 49.*level 2/),
    "s", (text) => assert.match(text, /darkstar's spells in memory.*magic missile/),
  ]);
  console.log("Trained Darkstar to level 2, paid for lodging, and reloaded Magic Missile memorized.");
  process.exit(0);
}

if (process.argv[2] === "--valjevo-forge-checkpoint") {
  assert.ok(process.argv[3], "Pass slot B just outside the Valjevo forge.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  function checkForge(discovered, authorization) {
    return (_text, frame) => {
      assert.equal(frame.journal.leads.some(({ id }) => id === "castle-forge"), discovered);
      assert.equal(frame.journal.leads.some(({ id }) => id === "castle-forge-authorization"), authorization);
    };
  }
  await replay(loadSlot("3062"), "85000000", [
    "j", checkForge(false, false), "j", "up", "enter", "a",
    "j", checkForge(true, false), "j", "p", "h",
    (text) => assert.match(text, /if it's important get authorization/),
    "j", checkForge(true, true), "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkForge(true, true)]);
  await replay(loadSlot("3062"), "85000000", ["j", checkForge(false, false)]);
  console.log("Verified the Valjevo forge and authorization clues across save slots.");
  process.exit(0);
}

if (process.argv[2] === "--genheeris-deal-checkpoint") {
  assert.ok(process.argv[3], "Pass slot B outside Genheeris's room in Valjevo Castle.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  const offer = ["up", "enter", "enter", "a", "a", "p", "h", "enter"];
  const checkDeal = accepted => (_text, frame) => {
    assert.ok(frame.journal.leads.some(({ id }) => id === "castle-genheeris-offer"));
    assert.equal(frame.journal.leads.some(({ id }) => id === "castle-genheeris-deal"), accepted);
  };
  await replay(loadSlot("3062"), "85000000", [
    ...offer, "j", checkDeal(false), "j", "n",
    (text) => assert.match(text, /a battle begins/),
    "j", checkDeal(false),
  ]);
  await replay(loadSlot("3062"), "85000000", [
    ...offer, "y", "enter",
    (text) => assert.match(text, /genheeris 9 22/),
    "j", checkDeal(true), "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkDeal(true)]);
  console.log("Verified Genheeris's recruitment and refusal, then reloaded the accepted bargain.");
  process.exit(0);
}

if (process.argv[2] === "--restal-seal-checkpoint") {
  assert.ok(process.argv[3], "Pass a slot C at Restal's well with a broken seal and Textile House commission.");
  copyFileSync(process.argv[3], join(saveDir, "C.json"));
  const meeting = ["up", "c", ...Array(5).fill("end"), ...Array(4).fill("enter")];
  const checkSeal = (resealed) => (_text, frame) => {
    assert.ok(frame.journal.leads.some(({ id }) => id === "textile-restal-seal-offer"));
    assert.equal(frame.journal.leads.some(({ id }) => id === "textile-restal-seal-replaced"), resealed);
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-textile")?.textileBox,
      resealed ? "sealed" : "opened");
  };
  await replay(loadSlot("2e63"), "85000000", [
    ...meeting, "j", checkSeal(false), "j", "n", "j", checkSeal(false),
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    ...meeting, "y", (text) => assert.match(text, /receives 1200 experience points/),
    "enter", "enter", "e", "n", "j", checkSeal(true), "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkSeal(true)]);
  console.log("Verified Restal's reseal offer, accept and decline, and reloaded the resealed chest clue.");
  process.exit(0);
}

if (process.argv[2] === "--restal-route-checkpoint") {
  assert.ok(process.argv[3], "Pass the slot C checkpoint outside Restal's well.");
  copyFileSync(process.argv[3], join(saveDir, "C.json"));
  const meeting = ["up", "c", ...Array(5).fill("end"), ...Array(4).fill("enter")];
  const knows = (frame, clue) => frame.journal.leads.some(({ id }) => id === `textile-restal-${clue}`);
  const checkRoute = (_text, frame) => {
    assert.ok(knows(frame, "route"));
    assert.ok(!knows(frame, "dismissed"));
  };
  await replay(loadSlot("2e63"), "85000000", [
    ...meeting, "y",
    (text) => assert.match(text, /our rules require you to be blindfolded/),
    "j", (_text, frame) => {
      assert.ok(knows(frame, "blindfold"));
      assert.ok(!knows(frame, "route"));
    }, "j", "n", "j", (_text, frame) => {
      assert.ok(knows(frame, "dismissed"));
      assert.ok(!knows(frame, "route"));
    },
  ]);
  await replay(loadSlot("2e63"), "85000000", [
    ...meeting, "y", "y",
    (text) => assert.match(text, /6,11 n.*only meet us at the main well/),
    "j", checkRoute, "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkRoute]);
  console.log("Verified Restal's two blindfold outcomes and reloaded the party's hidden route clue.");
  process.exit(0);
}

if (process.argv[2] === "--slums-fortune-checkpoint") {
  const [, , , checkpoint, outcome] = process.argv;
  assert.ok(checkpoint && ["warning", "power", "riddle"].includes(outcome),
    "Pass slot B outside the fortune teller's shop and specify warning, power, or riddle.");
  copyFileSync(checkpoint, join(saveDir, "B.json"));
  const fortunes = frame => frame.journal.leads
    .filter(({ id }) => id.startsWith("slums-fortune-")).map(({ id }) => id);
  const checkReading = (_text, frame) => assert.deepEqual(fortunes(frame), [`slums-fortune-${outcome}`]);
  const noReading = (_text, frame) => assert.deepEqual(fortunes(frame), []);
  await replay(loadSlot("3062"), "85000000", [
    "up", "enter",
    (text) => assert.match(text, /i will tell your fortune/),
    "j", noReading, "j", "p",
    (text) => assert.match(text, /her voice undergoes a strange transformation/),
    "j", noReading, "j", "enter", "j", checkReading, "j",
    "enter", "l", "enter", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkReading]);
  await replay(loadSlot("3062"), "85000000", ["j", noReading]);
  console.log(`Verified the ${outcome} fortune only appears after its reading and survives reload in the correct slot.`);
  process.exit(0);
}

if (process.argv[2] === "--kovel-files-checkpoint") {
  assert.ok(process.argv[3], "Pass slot A from outside the Kovel Mansion room with guild papers.");
  copyFileSync(process.argv[3], join(saveDir, "A.json"));
  const guildFiles = frame => frame.journal.leads.filter(({ id }) => id === "kovel-guild-files");
  const checkDiscovery = (_text, frame) => {
    const entries = guildFiles(frame);
    assert.equal(entries.length, 1);
    assert.match(entries[0].detail, /entries 38 and 51/);
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.match(frame.journal.objective.nextStep, /Read journal entries 38 and 51/);
  };
  const beforeDiscovery = (_text, frame) => assert.equal(guildFiles(frame).length, 0);
  await replay(loadSlot("1e61"), "85000000", [
    "j", beforeDiscovery, "j", "up",
    (text) => assert.match(text, /you stuff the files into your journal under entries 38 and 51/),
    "j", checkDiscovery, "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkDiscovery]);
  await replay(loadSlot("1e61"), "85000000", ["j", beforeDiscovery]);
  console.log("Verified Kovel files Entries 38 and 51 survive reload and stay with the slot that found them.");
  process.exit(0);
}

if (process.argv[2] === "--zhentil-tour-checkpoint") {
  assert.ok(process.argv[3], "Pass slot A outside Zhentil Outpost at (3,31), facing west.");
  copyFileSync(process.argv[3], join(saveDir, "A.json"));
  const checkStops = count => (_text, frame) => {
    const known = frame.journal.leads.filter(({ id }) => id.startsWith("zhentil-tour-")).map(({ id }) => id);
    assert.deepEqual(known, ["zhentil-tour-barracks", "zhentil-tour-watchtowers", "zhentil-tour-outer-wall"].slice(0, count));
  };
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /3,31 w/),
    "j", checkStops(0), "j",
    "down", "enter", "y", ...Array(8).fill("enter"),
    (text) => assert.match(text, /fine barracks/),
    "j", checkStops(1), "j", "enter",
    (text) => assert.match(text, /fine watch towers/),
    "j", checkStops(2), "j", "enter",
    (text) => assert.match(text, /wall has survived many attacks/),
    "j", checkStops(3), "j", "enter", "enter",
    (text) => assert.match(text, /here are your quarters/),
    "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", ["j", checkStops(3)]);
  console.log("Verified the three Zhentil tour discoveries in order and after reloading.");
  process.exit(0);
}

if (process.argv[2] === "--bane-entry53-checkpoint") {
  assert.ok(process.argv[3], "Pass a durable slot A from (6,9), facing north inside the Temple of Bane.");
  copyFileSync(process.argv[3], join(saveDir, "A.json"));
  const learned = frame => frame.journal.leads.find(({ id }) => id === "journal-entry-53");
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /6,9 n/),
    "j", (_text, frame) => assert.equal(learned(frame), undefined), "j",
    "right", "up", "up", "left", "up", "up", "up", "up", "left", "up", "up", "right", "up",
    ...Array(8).fill("enter"),
    ["q", /continue battle/, 160], "n",
    (text) => assert.match(text, /the party has won/),
    "enter", "enter", "e", "n",
    (text) => assert.match(text, /find a piece of paper.*journal under entry 53/),
    "j", (_text, frame) => assert.match(learned(frame)?.detail ?? "", /paper on the floor.*entry 53/),
    "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", [
    (text) => assert.match(text, /6,8 w/),
    "j", (_text, frame) => assert.match(learned(frame)?.detail ?? "", /paper on the floor.*entry 53/),
  ]);
  await replay(loadSlot("1e61"), "85000000", [
    (text) => assert.match(text, /6,9 n/),
    "j", (_text, frame) => assert.equal(learned(frame), undefined),
  ]);
  console.log("Verified Entry 53 after the Temple of Bane escort fight, after reload, and across save slots.");
  process.exit(0);
}

if (process.argv[2] === "--textile-diary-checkpoint") {
  assert.ok(process.argv[3], "Pass slot B from (6,6), facing east in the Textile House before finding the diary.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  const diaryLead = "textile-diary-page";
  await replay(loadSlot("3062"), "85000000", [
    (text) => assert.match(text, /6,6 e/),
    "j", (_text, frame) => {
      assert.ok(!frame.journal.leads.some(({ id }) => id === diaryLead));
    }, "j", "up",
    (text) => assert.match(text, /find a page from a diary.*journal under entry 11/),
    "j", (_text, frame) => {
      assert.equal(frame.journal.leads.filter(({ id }) => id === diaryLead).length, 1);
    }, "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", [
    (text) => assert.match(text, /7,6 e/),
    "j", (_text, frame) => {
      const entries = frame.journal.leads.filter(({ id }) => id === diaryLead);
      assert.equal(entries.length, 1);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "journal-entry-11"));
      assert.match(entries[0].detail, /journal entry 11/);
    },
  ]);
  await replay(loadSlot("3062"), "85000000", [
    (text) => assert.match(text, /6,6 e/),
    "j", (_text, frame) => {
      assert.ok(!frame.journal.leads.some(({ id }) => id === diaryLead));
    },
  ]);
  console.log("Verified the diary persists once in slot D and remains undiscovered in slot B.");
  process.exit(0);
}

if (process.argv[2] === "--textile-prison-alternates-checkpoint") {
  assert.ok(process.argv[3], "Pass slot E from the captive's key-search replay.");
  copyFileSync(process.argv[3], join(saveDir, "E.json"));
  await replay(loadSlot("1265"), "85000000", [
    "enter", "right", "right", "up", "right", "right", "up", "b", "enter", "enter",
    "j", "track 3", (_text, frame) => {
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-prisoner-fought-leader"));
    }, "j", "p", "n",
    (text) => assert.match(text, /i almost killed the leader/),
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prisoner-fought-leader"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.match(frame.journal.objective.nextStep, /north through the guards' room.*choose free, then unlock/i);
    }, "j", "enter", "f", "p",
    (text) => assert.match(text, /no one is able to pick all the padlocks/),
    "enter", "f", "b",
    (text) => assert.match(text, /despite great effort.*the chains hold/),
    "enter", "j", "track 3", (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-textile");
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-padlocks-resisted"));
      assert.match(frame.journal.objective.nextStep, /search the adjoining rooms for a key/i);
    }, "j",
    "a",
    (text) => assert.match(text, /the man dies a cruel death/),
    "enter", "enter", "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prisoner-killed"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.match(frame.journal.objective.nextStep, /search the remaining rooms.*cadorna's treasure/i);
    }, "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", [
    "j", (_text, frame) => {
      assert.equal(frame.journal.trackedId, "commission-textile");
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prisoner-killed"));
      assert.ok(frame.journal.leads.some(({ id }) => id === "textile-prisoner-fought-leader"));
      assert.match(frame.journal.objective.nextStep, /search the remaining rooms/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
    },
  ]);
  console.log("Verified the lock-picking, chain-breaking, and attack outcomes and the journal after reload.");
  process.exit(0);
}

if (process.argv[2] === "--textile-prison-key-checkpoint") {
  assert.ok(process.argv[3], "Pass slot E from the captive's key-search replay.");
  const throughOgre = process.argv[4] === "--through-ogre";
  assert.ok(!process.argv[4] || throughOgre, "Expected --through-ogre after the checkpoint");
  const checkpoint = join(saveDir, "E.json");
  copyFileSync(process.argv[3], checkpoint);
  await verifySkullcrusherRecruitment(loadSlot, checkpoint, throughOgre);
  process.exit(0);
}

if (process.argv[2] === "--textile-grishnak-checkpoint") {
  assert.ok(process.argv[3], "Pass slot I from outside Grishnak's temple at (2,13), facing north.");
  const healedSleep = process.argv[4] === "--healed-sleep";
  assert.ok(!process.argv[4] || healedSleep, "Expected --healed-sleep after the checkpoint");
  copyFileSync(process.argv[3], join(saveDir, "I.json"));
  await replay("31000000:1c0d,45000000:266c,52000000:1769", "85000000", [
    ...(healedSleep ? templePreparation : [
      "e", "m", "m", ...Array(6).fill("end"), "m", ...Array(4).fill("end"), "m", "e", "enter",
      (text) => assert.match(text, /mira's spells to be memorized.*\*sleep/),
      "y", "r", "r", "n", "e", "e",
      (text) => assert.match(text, /2,13 n.*area cast view encamp/),
    ]),
    "j", "track 3", (_text, frame) => {
      assert.equal(frame.journal?.trackedId, "commission-textile");
      assert.match(frame.journal.objective.nextStep, /north through the guards' room.*choose free, then unlock/i);
      assert.doesNotMatch(frame.journal.objective.nextStep, /grishnak/i);
    }, "j",
    "up", "enter", "enter",
    (text) => assert.match(text, /2,12 n.*i am the mighty grishnak/),
    "j", (_text, frame) => {
      assert.match(frame.journal?.objective.nextStep ?? "", /grishnak at the bone altar.*battle loot.*choose free, then unlock/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-secret-door"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-grishnak-defeated"));
    }, "j",
    "enter", "enter",
    ...(healedSleep ? [
      ...Array(6).fill("q"), "space", "space",
      (text) => assert.match(text, /mira hitpoints 5.*move view aim cast/),
      "c", "enter", ...Array(5).fill("n"),
      (text) => assert.match(text, /grishnak hitpoints 24 ac 5 spell:sleep.*target/),
      "t", (text) => assert.match(text, /grishnak hitpoints 24 ac 5 aim:next/),
      "e",
    ] : [["q", /grishnak hitpoints 24 ac 5/, 60]]),
    ["q", /party has been destroyed/, 300],
  ]);
  console.log(healedSleep ? "Healed the party, cast Sleep on Grishnak, and reached the original defeat screen."
    : "Replayed Grishnak's full Quick battle through the original defeat screen.");
  process.exit(0);
}

if (process.argv[2] === "--textile-courtyard-checkpoint") {
  assert.ok(process.argv[3], "Pass a save with the armored and reinforced party at the Textile House entrance.");
  copyFileSync(process.argv[3], join(saveDir, "F.json"));
  await verifyUninterruptedCourtyard();
  process.exit(0);
}

if (["--sokal-ferran-checkpoint", "--sokal-altar-checkpoint"].includes(process.argv[2])) {
  const beforeFerran = process.argv[2] === "--sokal-ferran-checkpoint";
  const continuation = process.argv[4];
  assert.ok(!continuation || ["--continue-to-auction", "--through-textile-prison"].includes(continuation),
    "Expected --continue-to-auction or --through-textile-prison after the checkpoint");
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
    const trackSokal = (_text, frame) => {
      const open = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
      const index = open.findIndex(({ id }) => id === "commission-sokal");
      assert.ok(index >= 0);
      return `track ${index + 1}`;
    };
    await replay(loadSlot("2166"), "85000000", [
      "left", "up", "left", "up", "left", "up", "right", "up", "up",
      (text) => assert.match(text, /8,6 n.*once the chapel.*altar dominates the southern wall/),
      "j", trackSokal, (_text, frame) => {
        assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-chapel"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-pale-form"));
        assert.match(frame.journal.objective.nextStep, /go around it to the east.*altar on the south wall/i);
      }, "j", "e", "s", "s", "c",
      (text) => assert.match(text, /quit to dos/),
    ]);
    await replay(loadSlot("2e63"), "85000000", [
      (text) => assert.match(text, /8,6 n/),
      "j", (_text, frame) => {
        assert.equal(frame.journal.trackedId, "commission-sokal");
        assert.match(frame.journal.objective.nextStep, /go around it to the east.*altar on the south wall/i);
      }, "j",
      "left", "left", "up", "up", "up",
      (text) => assert.match(text, /8,8 s/),
      "left", "up", "right", "up", "right", "up", "left", "up", "enter",
      (text) => assert.match(text, /8,10 s.*a pale form rises before you/),
      "j", (_text, frame) => {
        assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-pale-form"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-ferran" || id === "sokal-departure"));
      },
    ]);
    const checkWrongWord = (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-pale-form-wrong-word"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-ferran" || id === "sokal-departure"));
      assert.match(frame.journal.objective.nextStep, /reload a save from before the encounter/i);
      assert.doesNotMatch(frame.journal.objective.nextStep, /samosud|ferran/i);
    };
    await replay(loadSlot("2166"), "85000000", [
      "up", "enter", "p", "n", ..."zzz", "enter",
      (text) => assert.match(text, /the outline of a sad-faced man wavers and fades away/),
      "j", trackSokal, checkWrongWord, "j", "enter", "e", "s", "s", "e",
      (text) => assert.match(text, /quit to dos/),
    ]);
    await replay(loadSlot("1265"), "85000000", [
      (text) => assert.match(text, /8,10 s/),
      "j", checkWrongWord, "j", "left", "left", "up", "left", "left", "up", "enter",
      (text) => {
        assert.match(text, /8,10 s.*area cast view encamp/);
        assert.doesNotMatch(text, /a pale form rises before you/);
      },
    ]);
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
      }, "j", "enter", "e", "s", "s", "d",
      (text) => assert.match(text, /quit to dos/),
    ]);
    // Recoverable lie followed by the separate wrong-word outcome.
    await replay(loadSlot("2064"), "85000000", [
      "left", "left", "up", "left", "left", "up", "enter",
      "p", "n", ..."zzz", "enter",
      (text) => assert.match(text, /the outline of a sad-faced man wavers and fades away/),
      "j", trackSokal, (_text, frame) => {
        for (const id of ["sokal-ferran-lie", "sokal-pale-form-wrong-word"]) {
          assert.ok(frame.journal.leads.some(lead => lead.id === id));
        }
        assert.match(frame.journal.objective.nextStep, /reload a save from before the encounter/i);
      },
    ]);
    await replay(loadSlot("2064"), "85000000", [
      (text) => assert.match(text, /8,10 s/),
      "j", (_text, frame) => {
        assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-ferran-lie"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-departure"));
      }, trackSokal, (_text, frame) => {
        assert.match(frame.journal.objective.nextStep, /step away from the altar and return.*same word.*truth about phlan/i);
        assert.doesNotMatch(frame.journal.objective.nextStep, /samosud/i);
      }, "j", "left", "left", "up", "left", "left",
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
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-return-pier"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-back-in-phlan"));
      assert.match(frame.journal.objective.nextStep, /SAMOSUD.*south gate/i);
      assert.match(frame.journal.objective.nextStep, /choose Yes at the south pier/i);
    }, "j",
    "enter", "y", ...Array(4).fill("enter"),
    (text) => assert.match(text, /15,1 w/),
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "sokal-back-in-phlan"));
      assert.match(frame.journal.objective.nextStep, /follow the waterfront west toward City Hall/i);
    }, "j",
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
  if (continuation) await verifyPodalFromCouncil(continuation === "--continue-to-auction" ? "--auction-only" : continuation);
  process.exit(0);
}

if (["--textile-sealed-return-checkpoint", "--textile-opened-return-checkpoint"].includes(process.argv[2])) {
  const opened = process.argv[2] === "--textile-opened-return-checkpoint";
  const trainAfterReward = process.argv[4] === "--train-after-reward";
  assert.ok(!process.argv[4] || (!opened && trainAfterReward), "Training continuation requires the sealed-box route.");
  const slot = opened ? "E" : "D";
  assert.ok(process.argv[3], `Pass slot ${slot} with the box at the chief's room and the courtyard already cleared.`);
  copyFileSync(process.argv[3], join(saveDir, `${slot}.json`));
  const textile = frame => frame.journal.leads.find(({ id }) => id === "commission-textile");
  const checkUnpaid = (_text, frame) => {
    assert.equal(textile(frame)?.status, "turned-in");
    assert.equal(textile(frame)?.rewardOutcome, "unpaid");
    assert.ok(frame.journal.leads.some(({ id }) => id === "textile-confrontation"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-handoff"));
  };
  const trained = /thrender grone.*fighter.*platinum 14.*level 2 exp 2388.*hp 23/;
  await replay(loadSlot(opened ? "1265" : "2064"), "85000000", [
    (text) => assert.match(text, /12,14 s/),
    "j", (_text, frame) => {
      const index = frame.journal.leads.filter(({ status }) => status && status !== "turned-in")
        .findIndex(({ id }) => id === "commission-textile");
      assert.ok(index >= 0);
      return `track ${index + 1}`;
    }, (_text, frame) => {
      assert.equal(textile(frame)?.textileBox, opened ? "opened" : "sealed");
      assert.match(frame.journal.objective.nextStep, /west gate.*return boat southwest/i);
      if (frame.journal.leads.some(({ id }) => id === "phlan-return-ferry")) {
        assert.match(frame.journal.objective.nextStep, /choose Take Boat/i);
      }
    }, "j",
    "right", "up", "up", "up", "right", "up", "left", "up", "right", ...Array(8).fill("up"),
    "left", ...Array(6).fill("up"), "right", "up", "left", "up", "up", "up", "enter", "enter",
    (text) => assert.match(text, /western edge of the city.*north south leave/),
    "l", ...Array(4).fill("left"), "down", "enter",
    (text) => assert.match(text, /20,29 s.*take boat stay/),
    "j", (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-return-ferry"));
      assert.match(frame.journal.objective.nextStep, /west gate.*return boat southwest/i);
      assert.match(frame.journal.objective.nextStep, /choose Take Boat/i);
    }, "j", "t", ...Array(3).fill("enter"),
    (text) => assert.match(text, /15,1 w/),
    ...Array(4).fill("up"), "left", "up",
    ...(opened ? [] : [
      "enter", (text) => assert.match(text, /the city watch stops you and removes cadorna's treasure/),
      "j", (_text, frame) => {
        assert.equal(textile(frame)?.status, "ready-to-report");
        assert.ok(frame.journal.leads.some(({ id }) => id === "textile-handoff"));
        assert.match(frame.journal.objective.nextStep, /council clerk at City Hall/i);
      }, "j",
    ]),
    "right", "up", "left", "up", "right", ...Array(6).fill("up"), "left", "up", "up",
    "left", "up",
    ...(opened ? [
      (text) => assert.match(text, /councilman cadorna confronts you/),
      "j", checkUnpaid, "j",
      ["enter", /area cast view encamp/, 6], "e", "s", "s", "f",
    ] : [
      "left", "up", "up", ["enter", /view take pool share exit/, 10],
      "j", (_text, frame) => assert.equal(textile(frame)?.status, "reward-pending"), "j",
      "s", "e", "enter", "j", (_text, frame) => assert.equal(textile(frame)?.status, "turned-in"),
    ]),
    ...(trainAfterReward ? [
      "j", ["enter", /area cast view encamp/, 14],
      "v", "v", (text) => assert.match(text, /thrender grone.*level 1 exp 2388/), "e",
      // Walk from the council clerk to the Temple of Tyr and sell gems.
      "right", "right", "up", "right", "up", "up", "enter", "enter", "right", ...Array(6).fill("up"),
      "left", "up", "right", "up", "right", "up", "enter", "enter", "y",
      ...Array(5).fill("home"), "a", ...Array(4).fill(["g", "s"]).flat(),
      "p", "t", "end", "end", "end", "enter",
      (text) => assert.match(text, /how much gems will you take/),
      "4", "enter", "e", "a", ...Array(4).fill(["g", "s"]).flat(), "p", "t", "end", "end", "enter",
      (text) => assert.match(text, /platinum 283.*how much platinum will you take/),
      "2", "0", "0", "enter", "e", "s", "e",
      // The first school is for rogues. The fighter school is one door west.
      "right", "right", "up", "left", "up", "right", "up", "up", "left", "up",
      "enter", "enter", "enter", "n", "left", "up", "right", "up", "right", "up", "enter", "enter",
      (text) => assert.match(text, /we train only fighters here/),
      "y", "t", (text) => assert.match(text, /thrender grone will become: a level 2 fighter/),
      "y", "v", "v", (text) => assert.match(text, trained), "e", "s", "s", "f",
    ] : opened ? [] : ["j", ["enter", /area cast view encamp/, 14], "e", "s", "s", "f"]),
  ]);
  if (opened) {
    await replay(loadSlot("2166"), "85000000", ["j", checkUnpaid]);
    await replay(loadSlot("1265"), "85000000", ["j", (_text, frame) => {
      assert.equal(textile(frame)?.textileBox, "opened");
      assert.equal(textile(frame)?.status, "accepted");
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-confrontation"));
    }]);
    console.log("Returned with the opened box and reloaded Cadorna's unpaid outcome.");
  } else {
    console.log("Returned from the Textile House via the west ferry, handed off the sealed box, and collected the council reward.");
    if (!trainAfterReward) {
      await replay(loadSlot("2166"), "85000000", ["j", (_text, frame) => {
        assert.equal(textile(frame)?.status, "turned-in");
        assert.ok(frame.journal.leads.some(({ id }) => id === "textile-handoff"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-confrontation"));
      }]);
    }
    if (trainAfterReward) {
      const trainedSlot = join(saveDir, "F.json");
      assert.equal(JSON.parse(readFileSync(trainedSlot, "utf8")).tracked, undefined,
        "The completed Textile House objective should no longer be tracked in the saved slot.");
      await replay(loadSlot("2166"), "85000000", [
        "v", "v", (text) => assert.match(text, trained), "e", "j", (_text, frame) => {
          assert.equal(textile(frame)?.status, "turned-in");
          assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-training-fighters"));
          assert.ok(frame.journal.leads.some(({ id }) => id === "phlan-training-thieves"));
        },
      ]);
      await replay(loadSlot("2064"), "85000000", [
        "j", (_text, frame) => {
          assert.equal(textile(frame)?.status, "accepted");
          assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-handoff"));
        },
      ]);
      console.log("Sold gems, paid for Thrender Grone's level-two training, and reloaded the result:", trainedSlot);
    }
  }
  process.exit(0);
}

if (process.argv[2] === "--castle-ending-checkpoint") {
  const saveAtWestGate = process.argv[4] === "--save-at-west-gate";
  assert.ok(!process.argv[4] || saveAtWestGate, "Expected --save-at-west-gate.");
  assert.ok(process.argv[3], "Pass a save outside Tyranthraxus's audience hall with the assault assigned.");
  copyFileSync(process.argv[3], join(saveDir, "B.json"));
  const checkCastle = (status) => (_text, frame) => {
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-castle")?.status, status);
  };
  const victoryLead = "castle-tyranthraxus-defeated";
  await replay(loadSlot("3062"), "85000000", [
    "j", (_text, frame) => assert.ok(!frame.journal.leads.some(({ id }) => id === victoryLead)), "j",
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
    "j", checkCastle("ready-to-report"), (_text, frame) => {
      assert.ok(frame.journal.leads.some(({ id }) => id === victoryLead));
      assert.match(frame.journal.objective.nextStep, /east from the west gate.*south into City Hall.*council clerk/i);
    }, "j",
    ...(saveAtWestGate ? ["e", "s", "s", "d"] : [
      "up", "up", "up", "enter", "up", "right", "up", "enter", "enter", "enter",
      "up", "left", "up", "up", "enter",
      (text) => assert.match(text, /your quest is over.*tyranthraxus is defeated.*phlan is free/),
      "enter", (text) => assert.match(text, /receives 67500 experience points/),
      "enter", "enter", "j", checkCastle("reward-pending"), "j", "s", "e",
      ...Array(4).fill("enter"), "j", checkCastle("turned-in"), "j",
      "e", "s", "s", "c",
    ]),
  ]);
  if (saveAtWestGate) {
    console.log("Saved after defeating Tyranthraxus and returning to New Phlan:", join(saveDir, "D.json"));
    process.exit(0);
  }
  const completedSave = join(saveDir, "C.json");
  const completedSnapshot = readFileSync(completedSave);
  let trackedAfterEnding;
  await replay(loadSlot("2e63"), "85000000", [
    "j", checkCastle("turned-in"),
    (_text, frame) => {
      assert.equal(frame.journal.objective.title, "Phlan is free");
      assert.ok(frame.journal.leads.some(({ id }) => id === victoryLead));
    },
    (_text, frame) => {
      const open = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
      const index = open.findIndex(({ id }) => id !== frame.journal.trackedId);
      if (index < 0) return "track auto";
      trackedAfterEnding = open[index].id;
      return `track ${index + 1}`;
    },
    (_text, frame) => assert.equal(frame.journal.trackedId, trackedAfterEnding),
    "j", "e", "s", "s", "d",
    (text) => assert.match(text, /quit to dos/),
  ]);
  await replay(loadSlot("2064"), "85000000", [
    "j", checkCastle("turned-in"),
    (_text, frame) => assert.equal(frame.journal.trackedId, trackedAfterEnding),
    "track auto", checkCastle("turned-in"), (_text, frame) => {
      assert.equal(frame.journal.trackedId, undefined);
      assert.equal(frame.journal.objective.title, "Phlan is free");
    },
  ]);
  assert.deepEqual(readFileSync(completedSave), completedSnapshot);
  console.log("Defeated the original Tyranthraxus, collected the council reward, and reloaded the completed campaign.");
  console.log(`Verified the journal saved to slot D with ${trackedAfterEnding ?? "automatic tracking"} selected.`);
  process.exit(0);
}

if (process.argv[2] === "--podal-checkpoint") {
  assert.ok(process.argv[3], "Pass a save at the clerk with Sokal turned in and the auction accepted.");
  const continuation = process.argv[4];
  assert.ok(!continuation || ["--auction-only", "--through-textile-prison"].includes(continuation),
    "Expected --auction-only or --through-textile-prison after the checkpoint");
  copyFileSync(process.argv[3], join(saveDir, "H.json"));
  await verifyPodalFromCouncil(continuation);
  process.exit(0);
}

if (process.argv[2] === "--startup-scenes") {
  const checkScene = (scene) => (_text, frame) => assert.equal(frame.scene, scene);
  await replay("", "24000000", [
    checkScene("scene:publisher"), "enter",
    checkScene("scene:title"), "enter",
    checkScene(undefined),
  ]);
  console.log("Verified publisher splash, title, and credits on a fresh boot.");
  process.exit(0);
}

if (process.argv[2] === "--character-sheet") {
  const { loadUpgradeArt } = await tsImport("./upgrade-art.ts", import.meta.url);
  process.env.POR_CHARACTER_SHEET_ART_KEYS = [...loadUpgradeArt().keys()].filter(key => key.startsWith("character-sheet:")).join(",");
  const checkPortrait = (head, body) => (text, frame) => {
    assert.match(text, /male dwarf.*fighter.*head body keep/);
    assert.deepEqual(frame.characterSheet, [
      [224, 8, `character-sheet:HEAD3.DAX:${head}`, 88, 40],
      [224, 48, `character-sheet:BODY3.DAX:${body}`, 88, 48],
    ]);
  };
  await replay("", "24000000", [
    ...createCharacterFromBoot,
    ...Array(5).fill("enter"), "y", ..."test", "enter", checkPortrait(0, 1),
    ...[8, 9, 13, 16, 18, 22, 34, 45, 51, 53, 57, 67, 68, 0].flatMap(head => ["h", checkPortrait(head, 1)]),
    ...[2, 3, 4, 7, 8, 18, 24, 26, 33, 35, 37, 1].flatMap(body => ["b", checkPortrait(0, body)]),
    "h", checkPortrait(8, 1), "b", checkPortrait(8, 2),
  ]);
  console.log("Verified the enhanced character sheet tracks native head and body choices.");
  process.exit(0);
}

if (process.argv[2] === "--character-icon-editor") {
  const { loadUpgradeArt } = await tsImport("./upgrade-art.ts", import.meta.url);
  process.env.POR_COMBAT_ART_KEYS = [...loadUpgradeArt().keys()].filter(key => key.startsWith("combat:")).join(",");
  const checkEditor = (text, frame) => {
    assert.match(text, /old ready action new ready action/);
    assert.equal(frame.perspective, false);
    assert.deepEqual(frame.tiles, []);
    assert.equal(frame.exploration, undefined);
  };
  const editorKeys = ["k", "p", "h", "n", "e", "w", "n", "e", "e", "1", "n", "e", "2", "n", "e", "s", "n", "e"];
  await replay("", "24000000", [
    ...createCharacterFromBoot, ...Array(5).fill("enter"), "y", ..."test", "enter",
    ...editorKeys.flatMap((key, index) => [key, (text, frame) => {
      checkEditor(text, frame);
      if (index === 0 || index === 6) {
        const weapon = index === 0 ? 0 : 1;
        assert.deepEqual(frame.combatArt?.map(placement => placement.slice(0, 3)), [
          [32, 56, "combat:party:0:0"], [104, 56, "combat:party:0:128"],
          [32, 104, `combat:party:0:${weapon}`], [104, 104, `combat:party:0:${128 + weapon}`],
        ]);
      }
    }]),
  ]);
  console.log("Verified 18 native character icon editor frames stay out of the perspective renderer.");
  process.exit(0);
}

const createFighters = (roster) => roster.flatMap((name, index) => [
  ...(index ? ["c"] : []),
  "enter", "enter", "enter", "enter", "enter", "y", ...name, "enter", "k", "e", "y",
]);
const added = ["a", "a", ...names.slice(1).flatMap(() => ["end", "a"])];
const tour = ["b", "enter", "enter", "enter", "y", ...Array(8).fill("enter")];
const camp = ["e", "s", "s", "a"];
const loadSlotA = "31000000:1c0d,45000000:266c,52000000:1e61";
const loadSlotB = "31000000:1c0d,45000000:266c,52000000:3062";
const loadSlotC = "31000000:1c0d,45000000:266c,52000000:2e63";
const loadSlotD = "31000000:1c0d,45000000:266c,52000000:2064";
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

async function verifyFreshSlumsVictory() {
  // The campaign replay checks exact native rolls and combat outcomes.
  const saved = await replay("31000000:1c0d,45000000:2e63", "50000000", [...createFighters(names), ...added, ...tour, ...camp]);
  const savedText = visibleText(saved);
  expectParty(savedText);
  assert.match(savedText, /quit to dos/);
  const slot = JSON.parse(readFileSync(join(saveDir, "A.json"), "utf8"));
  assert.equal(Object.keys(slot.party).filter((name) => /\.SAV$/.test(name)).length, names.length);

  const reloaded = await replay(loadSlotA, "85000000", ["up", "enter", "enter"]);
  const reloadedText = visibleText(reloaded);
  expectParty(reloadedText);
  assert.match(reloadedText, /15,4 w/);
  assert.match(reloadedText, /slums of phlan/);

  const saveEquipment = ["e", "e", "s", "s", "b"];
  const equippedSave = await replay(loadSlotA, "85000000", [...shopRoute, ...equipFighters(names), ...saveEquipment]);
  assert.match(visibleText(equippedSave), /quit to dos/);
  const equippedSlot = JSON.parse(readFileSync(join(saveDir, "B.json"), "utf8"));
  for (const index of names.keys()) assert.ok(equippedSlot.party[`SAVE\\CHRDATB${index + 1}.ITM`]);

  const verifyReloadedGear = [
    "v", ...names.flatMap((name, index) => [
      ...(index ? ["end"] : []),
      "v", "i", "i", checkGear(name), "e", "e",
    ]),
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
}

if (campaign && campaignOption === "--from-slums") copyFileSync(campaignInput, join(saveDir, "D.json"));
else await verifyFreshSlumsVictory();

const battleReload = await replay(loadSlotD, "85000000", [
  (text) => expectParty(text),
  "v", "v",
]);
assert.match(visibleText(battleReload), /alda.*copper 11.*exp 5.*armor chain mail/);
console.log("Won the kobold encounter and verified Alda's 5 XP and 11 copper after reloading slot D.");
if (campaignOpening) {
  console.log("Enhanced Chrome campaign opening complete:", resolve(saveDir));
  process.exit(0);
}

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

if (["--fresh-armored-slums", "--fresh-sokal-reinforced"].includes(process.argv[2])) {
  await verifyOhloArmor();
  await verifyArmoredPatrols();
  if (process.argv[2] === "--fresh-sokal-reinforced") {
    await verifyGoblinRoom();
    await verifyGoblinLootSale();
    await verifySokalReinforcement();
    await verifySokalRecruitEquipment();
    await verifySokalPatrolVictory({ rejectedWord: true, equipped: true });
    await verifySokalTempleRecovery(true);
    await verifySokalRestoredCouncil();
    await verifySokalTrackedAmbush();
  }
  process.exit(0);
}

const hearCouncil = [
  "up", "up", "up", "enter", "up", "up", "up", "up", "left", "up", "up",
  "enter", "enter", "enter",
  (text) => assert.match(text, /sokal keep on thorn island must be cleared/),
  "enter", "enter",
];
function checkSokal(_text, frame) {
  const leads = frame.journal?.leads ?? [];
  assert.ok(leads.some((lead) => lead.id === "commission-sokal"));
  assert.ok(leads.some((lead) => lead.id === "sokal-arrival"));
  assert.ok(leads.some((lead) => lead.id === "commission-ohlo" && lead.status === "turned-in"));
}

async function verifySokalArrival() {
  await replay(loadSlot("1e61"), "85000000", [
    (text) => {
      expectParty(text);
      assert.match(text, /8,14 n/);
    },
    "j", checkSokal,
  ]);
}

const sokalSave = await replay(loadSlotJ, "85000000", [
  ...backToNewPhlan, ...hearCouncil, ...takeBoat,
  "j", checkSokal, "j", "e", "s", "s", "a",
]);
assert.match(visibleText(sokalSave), /quit to dos/);
await verifySokalArrival();
console.log("Heard the council's commissions, took the boat to Sokal Keep and reloaded the arrival in slot A.");
async function verifySokalKeep() {
  const loadSlotA = loadSlot("1e61");
  const loadSlotB = loadSlot("3062");
  const loadSlotC = loadSlot("2e63");
  const loadSlotD = loadSlot("2064");
  const loadSlotE = loadSlot("1265");
  const loadSlotF = loadSlot("2166");

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
  if (!campaign) await verifySokalSmithy(join(saveDir, "D.json"));
  await verifySokalArmory(saveDir);
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
}

await verifySokalKeep();
if (campaign) {
  console.log("Enhanced Chrome campaign verified through the Sokal Keep armory:", resolve(saveDir, "F.json"));
  process.exit(0);
}

const templeSave = await replay(loadSlotF, "85000000", [
  ...armoryToTemple,
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
  ...firstSokalPatrol,
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
