import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const [checkpoint, chromePath, routeName = "kobolds", option] = process.argv.slice(2);
const towerSave = routeName === "valjevo-tower-save";
const towerReload = routeName === "valjevo-tower-reload";
const dungeonSave = routeName === "valjevo-dungeon-save";
const dungeonReload = routeName === "valjevo-dungeon-reload";
const falseTyranthraxus = routeName === "valjevo-false-throne";
const alHyamRelease = routeName === "valjevo-al-hyam-release";
const alHyam = routeName === "valjevo-al-hyam" || alHyamRelease;
const alHyamReleaseReload = routeName === "valjevo-al-hyam-release-reload";
const alHyamReload = routeName === "valjevo-al-hyam-reload" || alHyamReleaseReload;
const captiveHedge = routeName === "valjevo-cadorna-hedge";
const captiveAlarmReload = routeName === "valjevo-cadorna-alarm-reload";
const captiveReload = routeName === "valjevo-cadorna-reload" || captiveAlarmReload;
const captiveKilled = routeName === "valjevo-cadorna-killed";
const captiveAlarm = routeName === "valjevo-cadorna-alarm";
const captiveCadorna = routeName === "valjevo-cadorna-captive" || captiveHedge || captiveKilled || captiveAlarm;
const dungeonKitchen = routeName === "valjevo-dungeon-kitchen";
const scriptoriumAuthority = routeName === "valjevo-scriptorium-authority";
const scriptorium = routeName === "valjevo-scriptorium-password" || scriptoriumAuthority;
const mazeWatch = routeName === "valjevo-maze-watch";
const giantPatrol = routeName === "valjevo-giant-patrol";
const dungeonSentry = routeName === "valjevo-dungeon-sentry";
const castleChaplain = routeName === "valjevo-bane-chaplain";
const conjurerPrompts = new Map([
  ["valhingen-conjurer-skeleton", /CREATINGNEWSKELETONS/i],
  ["valhingen-conjurer-zombie", /CREATINGZOMBIES/i],
  ["valhingen-conjurer-wight", /SUMMONSAWIGHT/i],
]);
const conjurerPrompt = conjurerPrompts.get(routeName);
const arenaApproach = ["right", "right", "up", "up", "right", "up", "up", "enter", "enter",
  "up", "up", "right", "up", "up", "up", "up", "enter", "enter", "up", "up", "enter"];
const arenaWatchApproach = [...arenaApproach, "enter", "n", "n", "e", "e", "r", "h",
  ...Array(8).fill("i"), "r", "enter"];
const arenaWatchBattle = [...arenaWatchApproach, "enter", "f", "enter", "enter", "enter"];
const arenaMasterDistances = [
  [56, 32, "encounter:area:11:ecl:9bf5:SPRIT3.DAX:16:2:0", 16, 49],
  [56, 32, "encounter:area:11:ecl:9bf6:SPRIT3.DAX:16:2:0", 16, 49],
  [56, 32, "encounter:area:11:ecl:9bf6:SPRIT3.DAX:16:1:0", 24, 65],
  [56, 32, "encounter:area:11:ecl:9bf8:SPRIT3.DAX:16:1:0", 24, 65],
];
const harborWatchApproach = ["e", "e", "r", "h", ...Array(8).fill("i"), "r", "enter"];
const harborWatchBattle = [...harborWatchApproach, "s", "enter", "enter"];
const encounterRoutes = new Map([
  ["bane-temple-exit-retaliation", {
    slot: "A", inputs: ["up", "up", "enter"],
    placement: [48, 32, "encounter:area:24:ecl:aa6e:SPRIT1.DAX:4:0:0", 40, 80],
    dialogue: {
      key: "enter", portrait: "portrait:area:24:ecl:aba7:PIC1.DAX:4:0:0",
      prompt: /ASYOUEXITTHETEMPLEYOUAREATTACKED.*LEADINGTHEMISAHALF.ORC/i,
    },
    battleStart: {
      input: "enter", portrait: "portrait:area:24:ecl:abbd:PIC1.DAX:4:0:0",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["lizard-wilds-drider-approach", {
    slot: "A",
    inputs: [...Array.from({ length: 16 }, () => ["up", "down"]).flat(), "up", "p", "down", "up", "down", "up"],
    placement: [48, 32, "encounter:area:26:ecl:a230:SPRIT7.DAX:69:1:0", 40, 65],
    battleStart: { input: "c", prompt: /ABATTLEBEGINS/i },
  }],
  ["lizard-wilds-merchant-approach", {
    slot: "A",
    inputs: [...Array.from({ length: 16 }, () => ["up", "down"]).flat(), "up"],
    placement: [56, 32, "encounter:area:26:ecl:a230:SPRIT7.DAX:12:1:0", 24, 65],
    battleStart: { input: "c", prompt: /ABATTLEBEGINS/i },
  }],
  ["kuto-sickly-kobold-scouts", {
    slot: "B",
    requireTiledApproach: false,
    inputs: [...Array.from({ length: 3 }, () => ["up", "enter", "down", "up", "down"]).flat(), "up", "enter"],
    placement: [48, 32, "encounter:area:29:SPRIT8.DAX:0:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:29:ecl:a683:SPRIT8.DAX:0:1:0", 24, 65],
      [56, 32, "encounter:area:29:ecl:a684:SPRIT8.DAX:0:1:0", 24, 65],
      [48, 32, "encounter:area:29:SPRIT8.DAX:0:0:0", 40, 80],
    ],
    dialogue: {
      key: "down", portrait: "portrait:area:29:PIC8.DAX:0:0:0",
      prompt: /ASMALLBANDOFSICKLYKOBOLDS/i,
    },
  }],
  ["buccaneer-pen-guard-gate", {
    slot: "A", inputs: ["up", "up"],
    placement: [48, 32, "encounter:area:1:ecl:a2f2:SPRIT6.DAX:16:0:0", 40, 80],
    transient: true,
    dialogueSteps: [{
      keys: [], portrait: "portrait:area:1:ecl:a35b:HEAD6.DAX:6:BODY6.DAX:3",
      prompt: /TWOGUARDSGUARDTHEDOOR/i,
    }, {
      keys: ["t"], portrait: "portrait:area:1:ecl:a8ed:HEAD6.DAX:6:BODY6.DAX:3",
      prompt: /CANNOTGETBYTHEGUARDSINTOTHESLAVEPEN/i,
    }],
  }],
  ["textile-skullcrusher-approach", {
    slot: "B", inputs: ["up", "b", "up"],
    placement: [56, 32, "encounter:area:2:ecl:a147:SPRIT4.DAX:14:0:0", 24, 80],
    transient: true,
    dialogue: {
      key: "enter", portrait: "portrait:HEAD4.DAX:32:BODY4.DAX:3",
      prompt: /WHATDOYOUDOWITHTHEMAN/i,
    },
  }],
  ["textile-poison-frog-approach", {
    slot: "B", inputs: ["s", "up", "up", "down", "up", "down"],
    placement: [32, 32, "encounter:area:2:ecl:9abe:SPRIT4.DAX:37:0:0", 64, 80],
    dialogue: {
      key: "enter", portrait: "portrait:area:2:PIC4.DAX:37:0:0",
      prompt: /EVILLOOKINGFROGSBOILUPFROMBELOW/i,
    },
  }],
  ["valjevo-bucket-trap-giant", {
    slot: "B", inputs: ["up", "enter", "enter", "enter"],
    placement: [48, 32, "encounter:area:3:ecl:a662:SPRIT5.DAX:56:0:0", 48, 80],
    dialogue: {
      key: "enter", portrait: "portrait:area:3:PIC5.DAX:56:0:0",
      prompt: /THEGIANTSWHOPLACEDTHEBUCKETTHERECHARGE/i,
    },
  }],
  ["swamp-drythh-followers", {
    slot: "A", inputs: ["up", "b", "p", "enter", ..."savior", "enter", "y", "enter", "enter", "n", "enter", "enter"],
    placement: [48, 32, "encounter:area:16:ecl:a535:SPRIT8.DAX:57:0:0", 48, 80],
    approachSequence: [[48, 32, "encounter:area:16:ecl:a535:SPRIT8.DAX:57:0:0", 48, 80]],
    dialogue: { key: "enter", portrait: "portrait:area:16:ecl:a535:PIC8.DAX:57:0:0", prompt: /COMBATWAITFLEEPARLAY/i },
  }],
  ["swamp-ruin-defenders", {
    slot: "A", inputs: ["up", "up"],
    placement: [48, 32, "encounter:area:16:ecl:a65a:SPRIT8.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "scene-illustration:area:16:ecl:a65a", prompt: /2LIZARDMENANDAGIANTLIZARDCHARGEATYOU/i },
  }],
  ["kobold-net-trap", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:13:ecl:9dd4:SPRIT8.DAX:0:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "portrait:area:13:ecl:9e0c:PIC8.DAX:0:0:0", prompt: /ANETENTANGLESYOU/i },
    battleStart: { input: "enter", prompt: /ABATTLEBEGINS/i, portrait: "portrait:area:13:ecl:9e0d:PIC8.DAX:0:0:0" },
  }],
  ["kobold-roof-collapse", {
    slot: "B", inputs: ["up", "enter", "enter", "r", "enter", "enter"],
    placement: [48, 32, "encounter:area:13:ecl:9d05:SPRIT8.DAX:0:0:0", 40, 80],
    approachSequence: [[48, 32, "encounter:area:13:ecl:9d05:SPRIT8.DAX:0:0:0", 40, 80]],
    dialogue: { key: "enter", portrait: "portrait:area:13:ecl:9d49:PIC8.DAX:0:0:0", prompt: /BEFOREYOURECOVER.KOBOLDSARRIVE/i },
    battleStart: { input: "enter", prompt: /ABATTLEBEGINS/i, portrait: "portrait:area:13:ecl:9d4a:PIC8.DAX:0:0:0" },
  }],
  ["kobold-kings-quarters", {
    slot: "B", inputs: ["s", "up", "up", "right", "up", "up", "enter"],
    placement: [48, 32, "encounter:area:13:ecl:a496:SPRIT8.DAX:0:0:0", 40, 80],
    approachSequence: [[48, 32, "encounter:area:13:ecl:a496:SPRIT8.DAX:0:0:0", 40, 80]],
    dialogue: { key: "enter", portrait: "portrait:area:13:ecl:a4b9:PIC8.DAX:0:0:0", prompt: /CONFRONTHISGUARDS/i },
  }],
  ["kobold-throne-ballista", {
    slot: "A", inputs: ["up", "enter", "enter"],
    placement: [48, 32, "encounter:area:13:ecl:a1b6:SPRIT8.DAX:0:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:13:ecl:a1b6:SPRIT8.DAX:0:1:0", 24, 65],
      [48, 32, "encounter:area:13:ecl:a1b6:SPRIT8.DAX:0:0:0", 40, 80],
    ],
    battleStart: { input: "enter", prompt: /ABATTLEBEGINS/i },
  }],
  ["podal-pitt-monster-patrons", {
    slot: "I", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:18:SPRIT1.DAX:2:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:18:PIC1.DAX:2:0:0", prompt: /THECREATURESIGNOREYOUFORTHEMOMENT/i },
  }],
  ["wild-cave-rearing-snake-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:25:SPRIT6.DAX:60:1:0", 40, 65],
  }],
  ["phlan-ruins-scorpion-approach", {
    slot: "B", inputs: ["s", "up", "up", "down", "up", "down"],
    placement: [40, 32, "encounter:area:2:SPRIT4.DAX:18:1:0", 56, 73],
  }],
  ["podal-plaza-wandering-goblin", {
    slot: "I", inputs: ["up", "up", "up", "left", "up", "up", "left", "up", "up", "left", "up", "up"],
    placement: [48, 32, "encounter:area:18:ecl:9bce:SPRIT1.DAX:2:0:0", 48, 80],
    approachSequence: [
      [56, 32, "encounter:area:18:ecl:9b76:SPRIT1.DAX:2:2:0", 24, 49],
      [56, 32, "encounter:area:18:ecl:9b77:SPRIT1.DAX:2:2:0", 24, 49],
      [56, 32, "encounter:area:18:ecl:9b7b:SPRIT1.DAX:2:1:0", 32, 65],
      [56, 32, "encounter:area:18:ecl:9bce:SPRIT1.DAX:2:1:0", 32, 65],
      [48, 32, "encounter:area:18:ecl:9bce:SPRIT1.DAX:2:0:0", 48, 80],
    ],
  }],
  ["podal-recruit-assembly", {
    slot: "I", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:18:ecl:b0ce:SPRIT1.DAX:4:0:0", 40, 80],
    approachSequence: [[48, 32, "encounter:area:18:ecl:b0ce:SPRIT1.DAX:4:0:0", 40, 80]],
    dialogue: {
      keys: ["enter", "enter"], portrait: "portrait:area:18:ecl:b16f:PIC1.DAX:4:0:0",
      prompt: /MANYCREATURESHAVEGATHERED/i,
    },
  }],
  ["podal-shrine-recruiter-approach", {
    slot: "I", inputs: ["up", "up"],
    placement: [48, 32, "encounter:area:18:SPRIT1.DAX:4:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "portrait:area:18:PIC1.DAX:4:0:0", prompt: /AROBEDORCISSITTINGHERE/i },
  }],
  ["slums-orc-clash", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:SPRIT2.DAX:4:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "portrait:area:20:PIC2.DAX:4:0:0", prompt: /ORC|GUARDSRUNTOINTERCEPTYOU/i },
  }],
  ["slums-goblin-lesson-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:20:SPRIT2.DAX:2:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:20:PIC2.DAX:2:0:0", prompt: /GOBLINISINSTRUCTINGAGROUPOFYOUNGWARRIORS/i },
  }],
  ["swamp-giant-lizard-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [32, 32, "encounter:area:16:SPRIT8.DAX:59:0:0", 80, 80],
    dialogue: { key: "enter", portrait: "portrait:area:16:PIC8.DAX:59:0:0", prompt: /3GIANTLIZARDSCHARGETOWARDYOU/i },
  }],
  ["wild-cave-wyvern-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [24, 32, "encounter:area:27:SPRIT8.DAX:121:0:0", 88, 80],
    terrain: { area: 27, views: 3, patterns: 17 },
    approachSequence: [
      [56, 32, "encounter:area:27:SPRIT8.DAX:121:2:0", 32, 49],
      [40, 32, "encounter:area:27:SPRIT8.DAX:121:1:0", 56, 65],
      [24, 32, "encounter:area:27:SPRIT8.DAX:121:0:0", 88, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:121:0:0", prompt: /FEROCIOUSWYVERN/i },
  }],
  ["slums-hobgoblin-ringleader-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:20:SPRIT2.DAX:6:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:20:PIC2.DAX:6:0:0", prompt: /YOUINTRUDEONAGATHERINGOFMONSTERLEADERS/i },
  }],
  ["slums-hobgoblin-gold-room-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:20:ecl:aa1f:SPRIT2.DAX:6:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:20:PIC2.DAX:6:0:0", prompt: /SOMEHOBGOBLINSAREARGUINGOVERAPILEOFGOLD/i },
  }],
  ["sokal-courtyard-hobgoblin-approach", {
    slot: "C", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:21:SPRIT4.DAX:6:1:0", 24, 65],
  }],
  ["textile-ogre-war-chief-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:2:SPRIT4.DAX:6:1:0", 24, 65],
    closer: [56, 32, "encounter:area:2:SPRIT4.DAX:6:1:0", 24, 65], closerKey: "enter",
  }],
  ["slums-ohlo-study-approach", {
    slot: "B", inputs: ["up", "b", "b"],
    placement: [56, 32, "encounter:area:20:SPRIT2.DAX:24:1:0", 24, 65],
    approachSteps: [{
      inputs: ["t", "n"], placement: [56, 32, "encounter:area:20:SPRIT2.DAX:24:1:0", 24, 65],
    }],
    dialogue: { key: "a", portrait: "scene-illustration:area:20:ecl:b6df:caller:a251",
      prompt: /ITWAITSINABOOTHINTHEOLDROPEGUILD.*SPEAKMYNAME,OHLO/i },
    acceptedCommission: "commission-ohlo",
  }],
  ["yarash-study", {
    slot: "A", inputs: ["up", "up", "b", "up"],
    placement: [64, 24, "encounter:area:23:SPRIT7.DAX:24:2:0", 48, 57],
    approachSteps: [
      { inputs: ["enter", "a"], placement: [56, 32, "encounter:area:23:SPRIT7.DAX:24:1:0", 24, 65] },
      { inputs: ["a"], placement: [48, 32, "encounter:area:23:SPRIT7.DAX:24:0:0", 32, 73] },
    ],
    dialogue: { key: "p", portrait: "portrait:area:23:HEAD7.DAX:56:BODY7.DAX:30", prompt: /COMBATWAITFLEEPARLAY/i },
  }],
  ["new-phlan-city-watch-approach", {
    slot: "A",
    inputs: arenaWatchApproach,
    approachSequence: [...arenaMasterDistances,
      [56, 32, "encounter:area:11:ecl:99bd:SPRIT3.DAX:15:2:0", 16, 49],
      [56, 32, "encounter:area:11:ecl:99be:SPRIT3.DAX:15:2:0", 16, 49],
      [56, 32, "encounter:area:11:ecl:99be:SPRIT3.DAX:15:1:0", 24, 65],
      [56, 32, "encounter:area:11:ecl:99c0:SPRIT3.DAX:15:1:0", 24, 65],
    ],
    placement: [48, 32, "encounter:area:11:SPRIT3.DAX:15:0:0", 40, 73],
  }],
  ["new-phlan-arena-master-approach", {
    slot: "A",
    inputs: arenaApproach,
    approachSequence: arenaMasterDistances,
    placement: [48, 32, "encounter:area:11:SPRIT3.DAX:16:0:0", 40, 80],
  }],
  ["bane-captive-goblin-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:31:SPRIT1.DAX:2:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:31:PIC1.DAX:2:0:0", prompt: /GOBLIN/i },
  }],
  ["bane-orc-guardroom-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:31:SPRIT1.DAX:4:0:0", 40, 80],
  }],
  ["valjevo-bane-chaplain-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:6:SPRIT5.DAX:29:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:6:SPRIT5.DAX:29:2:0", 16, 49],
      [56, 32, "encounter:area:6:SPRIT5.DAX:29:1:0", 24, 65],
      [48, 32, "encounter:area:6:SPRIT5.DAX:29:0:0", 40, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:HEAD5.DAX:14:BODY5.DAX:7", prompt: /BANE/i },
  }],
  ["valhingen-mummy-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:10:SPRIT4.DAX:114:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:114:1:0", 24, 65],
      [48, 32, "encounter:area:10:SPRIT4.DAX:114:0:0", 40, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:PIC4.DAX:114:0:0", prompt: /MUMMIESOPENTHEIRSARCOPH/i },
  }],
  ["kuto-norris-approach", {
    slot: "J", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:29:SPRIT8.DAX:16:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:29:SPRIT8.DAX:16:2:0", 16, 49],
      [56, 32, "encounter:area:29:SPRIT8.DAX:16:1:0", 24, 65],
      [48, 32, "encounter:area:29:SPRIT8.DAX:16:0:0", 40, 80],
    ],
    dialogue: { keys: ["enter", "enter"], portrait: "portrait:HEAD8.DAX:10:BODY8.DAX:6", prompt: /SURRENDER.*FIGHT/i },
  }],
  ["mendor-fighter-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:15:SPRIT2.DAX:15:0:0", 40, 73],
    dialogue: { key: "enter", portrait: "portrait:area:15:PIC2.DAX:25:0:0", prompt: /YOUFINDAFIGHTERWITHBATTEREDARMOR/i },
  }],
  ["pyramid-vats-lizard-approach", {
    slot: "A", inputs: ["s", "up", "enter"],
    placement: [48, 32, "encounter:area:23:ecl:a1b9:SPRIT7.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:23:ecl:9a04:caller:a236:PIC7.DAX:57:0:0", prompt: /POKINGAROUNDINTHEVATS/i },
  }],
  ["stojanow-patrol-fighter-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:9:SPRIT2.DAX:16:2:0", 16, 49],
    closer: [56, 32, "encounter:area:9:SPRIT2.DAX:16:1:0", 24, 65],
    dialogue: { key: "a", portrait: "portrait:HEAD2.DAX:8:BODY2.DAX:5", prompt: /WHATAREYOUDOINGHERE/i },
  }],
  ["wild-grove-pool-lizard-approach", {
    slot: "A", inputs: ["up", "a"],
    placement: [48, 32, "encounter:area:26:SPRIT7.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:26:PIC7.DAX:57:0:0", prompt: /LIZARDMENSWIMMINGINTHEPOOL/i },
  }],
  ["wild-grove-captive-kobold-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:26:SPRIT7.DAX:0:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "portrait:area:26:PIC7.DAX:0:0:0", prompt: /RELEASEUS/i },
  }],
  ["wild-cave-giant-lizard-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [32, 32, "encounter:area:27:ecl:a549:SPRIT8.DAX:59:0:0", 80, 80],
    terrain: { area: 27, views: 3, patterns: 15 },
    dialogue: { key: "enter", portrait: "scene-illustration:area:27:ecl:a5aa", prompt: /FOURGIANTLIZARDSANDTWOMINOTAURS/i },
  }],
  ["wild-cave-lizard-charge", {
    slot: "B", inputs: ["up", "enter"],
    placement: [32, 32, "encounter:area:27:ecl:a4ca:SPRIT8.DAX:59:0:0", 80, 80],
    terrain: { area: 27, views: 3, patterns: 17 },
    approachSequence: [
      [48, 32, "encounter:area:27:ecl:a4c9:SPRIT8.DAX:59:2:0", 40, 57],
      [48, 32, "encounter:area:27:ecl:a4c9:SPRIT8.DAX:59:1:0", 48, 65],
      [32, 32, "encounter:area:27:ecl:a4ca:SPRIT8.DAX:59:0:0", 80, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:area:27:ecl:a500:PIC8.DAX:59:0:0", prompt: /FOURGIANTLIZARDSRUNUPANDATTACKTHEPARTY/i },
  }],
  ["wild-cave-gnoll-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [40, 32, "encounter:area:27:SPRIT8.DAX:73:0:0", 56, 80],
    terrain: { area: 27, views: 3, patterns: 17 },
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:73:0:0", prompt: /SOMEGNOLLSANDTROLLS/i },
  }],
  ["wild-cave-thri-kreen-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:25:ecl:aa36:SPRIT6.DAX:118:0:0", 32, 73],
    dialogue: { key: "enter", portrait: "portrait:area:25:ecl:aaa4:PIC6.DAX:118:0:0", prompt: /FOURTHRI.KREENWARRIORS.*ACHESTWITHTREASURE/i },
  }],
  ["wild-cave-thri-kreen-two-guards", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:25:SPRIT6.DAX:118:0:0", 32, 73],
    dialogue: { key: "enter", portrait: "portrait:area:25:PIC6.DAX:118:0:0", prompt: /THEREARETWOTHRI.KREENHERE/i },
  }],
  ["wild-cave-thri-kreen-three-warriors", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:25:SPRIT6.DAX:118:0:0", 32, 73],
    dialogue: { key: "enter", portrait: "portrait:area:25:PIC6.DAX:118:0:0", prompt: /BEFOREYOUARETHREETHRI.KREENWARRIORS/i },
  }],
  ["wild-cave-boar-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:25:SPRIT6.DAX:120:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "scene-illustration:area:25:ecl:a6e6", prompt: /THREELARGEWILDBOARS.*CHARGEATYOUANDATTACK/i },
  }],
  ["wild-cave-boar-sow", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:25:ecl:a5b1:SPRIT6.DAX:120:0:0", 40, 80],
    dialogueSteps: [{
      keys: ["enter"], portrait: "portrait:area:25:ecl:a622:PIC6.DAX:120:0:0",
      prompt: /WILDBOARSOWFEEDINGHERYOUNG/i,
    }, {
      keys: ["a"], portrait: "portrait:area:25:ecl:a66b:PIC6.DAX:120:0:0",
      prompt: /HAIRBRISTLESANDSHEATTACKS/i,
    }],
    battleStart: {
      input: "enter", portrait: "portrait:area:25:ecl:a66c:PIC6.DAX:120:0:0",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["lizard-wilds-displacer-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [40, 32, "encounter:area:26:ecl:a6c5:SPRIT7.DAX:68:0:0", 64, 80],
    dialogue: { key: "enter", portrait: "portrait:area:26:ecl:a70c:PIC7.DAX:68:0:0", prompt: /AMBUSHEDBYTWODISPLACERBEASTS/i },
  }],
  ["lizard-wilds-stirge-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:26:SPRIT7.DAX:61:0:0", 40, 73],
    dialogue: { key: "enter", portrait: "portrait:area:26:PIC7.DAX:61:0:0", prompt: /ASWARMOFSTIRGESSWOOPSDOWN/i },
  }],
  ["old-phlan-lizard-patrol-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:29:ecl:a9f7:SPRIT8.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:29:PIC8.DAX:57:0:0", prompt: /ALIZARDMANLEADSAPACKOFGIANTLIZARDS/i },
  }],
  ["bane-ogre-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:31:ecl:9f1e:SPRIT1.DAX:8:0:0", 40, 73],
    dialogue: { key: "enter", portrait: "portrait:area:31:ecl:9f6d:PIC1.DAX:8:0:0", prompt: /SIXORCSLEDBYALARGEOGRE/i },
  }],
  ["valhingen-zombie-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:ecl:b6a8:caller:9f5b:SPRIT4.DAX:35:0:0", 32, 80],
    dialogue: { key: "enter", portrait: "portrait:area:10:PIC4.DAX:35:0:0", prompt: /ZOMBIESSHUFFLEDOWNTHESTAIRS/i },
  }],
  ["valhingen-zombie-roam-dialogue", {
    slot: "A", inputs: ["up", "down", "up", "down"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:35:0:0", 32, 80],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:35:1:0", 24, 65],
      [56, 32, "encounter:area:10:SPRIT4.DAX:35:0:0", 32, 80],
    ],
    requireTiledApproach: false,
    dialogue: { key: "up", portrait: "portrait:area:10:ecl:b695:caller:9f43:PIC4.DAX:35:0:0",
      prompt: /LUMBERINGFIGURESREACHFORYOU/i },
  }],
  ["valhingen-ghoul-approach", {
    slot: "A", inputs: ["e", "enter", "r", "y", ...Array(10).fill("i"), "r", "enter"],
    placement: [48, 32, "encounter:area:10:SPRIT4.DAX:72:0:0", 40, 73],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:72:2:0", 24, 57],
      [56, 32, "encounter:area:10:SPRIT4.DAX:72:1:0", 24, 65],
      [48, 32, "encounter:area:10:SPRIT4.DAX:72:0:0", 40, 73],
    ],
    dialogue: { key: "enter", portrait: "portrait:PIC4.DAX:72:0:0", prompt: /APACKOFHUNGRYGHOULSLOPESTOWARDYOU/i },
  }],
  ["kobold-cave-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:13:SPRIT8.DAX:0:1:0", 24, 65],
    closer: [48, 32, "encounter:area:13:SPRIT8.DAX:0:0:0", 40, 80],
    closerKey: "enter",
  }],
  ["valjevo-medusa-approach", {
    slot: "B", inputs: ["up", "enter", "enter"],
    placement: [48, 32, "encounter:area:7:SPRIT5.DAX:49:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:7:PIC5.DAX:49:0:0", prompt: /AMEDUSACOMESRUNNINGTOWARDYOU/i },
  }],
  ["valjevo-fire-giant-approach", {
    slot: "B", inputs: ["up", "enter", "enter"],
    placement: [56, 32, "encounter:area:4:SPRIT5.DAX:56:1:0", 32, 73],
    closer: [48, 32, "encounter:area:4:SPRIT5.DAX:56:0:0", 48, 80],
    dialogue: { key: "a", portrait: "portrait:area:4:PIC5.DAX:56:0:0", prompt: /THEGIANTSLOOKUPATYOU/i },
  }],
  ["wild-cave-ankheg-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:25:SPRIT6.DAX:65:1:0", 48, 65],
  }],
  ["textile-hobgoblin-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:2:ecl:abd2:caller:9c8b:SPRIT4.DAX:6:0:0", 48, 80],
    approachSequence: [[48, 32, "encounter:area:2:ecl:9c36:SPRIT4.DAX:6:0:0", 48, 80]],
    battleStart: { input: "enter", prompt: /ADRUMBEGINSTOBEATANDHOBGOBLINSATTACK.*ABATTLEBEGINS/i },
  }],
  ["sokal-poison-frog-approach", {
    slot: "C", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:21:SPRIT4.DAX:37:1:0", 40, 57],
  }],
  ["valhingen-wight-approach", {
    slot: "A", inputs: ["up", "b"],
    placement: [48, 32, "encounter:area:10:SPRIT4.DAX:20:0:0", 40, 80],
  }],
  ["valhingen-wight-tower-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:10:SPRIT4.DAX:20:0:0", 40, 80],
    approachSequence: [
      [64, 32, "encounter:area:10:SPRIT4.DAX:20:2:0", 16, 49],
      [56, 32, "encounter:area:10:SPRIT4.DAX:20:1:0", 24, 65],
      [48, 32, "encounter:area:10:SPRIT4.DAX:20:0:0", 40, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:PIC4.DAX:20:0:0", prompt: /WIGHTSAPPEARFROMBEHINDTHETOWER/i },
  }],
  ["valhingen-spectre-approach-near", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:17:0:0", 32, 80],
  }],
  ["valhingen-spectre-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:17:1:0", 24, 65],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:17:2:0", 16, 49],
      [56, 32, "encounter:area:10:SPRIT4.DAX:17:1:0", 24, 65],
    ],
  }],
  ["valhingen-mummy-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:10:SPRIT4.DAX:114:0:0", 40, 80],
  }],
  ["valjevo-giant-snake-approach", {
    slot: "B", inputs: ["s", "up", "up", "y", "enter", "enter"],
    placement: [48, 32, "encounter:area:5:SPRIT5.DAX:60:1:0", 40, 65],
    closer: [40, 32, "encounter:area:5:SPRIT5.DAX:60:0:0", 64, 80],
    dialogue: { key: "a", portrait: "portrait:area:5:PIC5.DAX:60:0:0", prompt: /YOUSEEGIANTSNAKES/i },
  }],
  ["mendor-basilisk-approach", {
    slot: "B", inputs: ["up", "enter", "enter"],
    placement: [32, 32, "encounter:area:15:SPRIT2.DAX:26:0:0", 80, 80],
    dialogue: { key: "enter", portrait: "portrait:PIC2.DAX:26:0:0", prompt: /YOUSEEADULLBROWNREPTILIANMONSTER/i },
  }],
  ["kobold-cave-efreeti-approach", {
    slot: "A", inputs: ["s", "up", "p", "enter"],
    placement: [48, 32, "encounter:area:13:SPRIT8.DAX:70:0:0", 40, 80],
    terrain: { area: 13, views: 5, patterns: 26 },
  }],
  ["old-phlan-sword-thief-approach", {
    slot: "A", inputs: ["left", "up", "up", "right", "up", "left", "up", "up"],
    placement: [40, 32, "encounter:area:14:SPRIT3.DAX:11:0:0", 48, 80],
    approachSequence: [
      [56, 32, "encounter:area:14:SPRIT3.DAX:11:2:0", 16, 49],
      [56, 32, "encounter:area:14:SPRIT3.DAX:11:1:0", 24, 65],
      [40, 32, "encounter:area:14:SPRIT3.DAX:11:0:0", 48, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:area:14:HEAD3.DAX:32:BODY3.DAX:8", prompt: /ATHIEFWITHASWORDCOMESOUTOFNOWHERE/i },
  }],
  ["valhingen-vampire-return-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:23:0:0", 32, 80],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:23:1:0", 24, 65],
      [56, 32, "encounter:area:10:SPRIT4.DAX:23:0:0", 32, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:PIC4.DAX:23:0:0", prompt: /THEREISAVAMPIREHERE/i },
  }],
  ["stojanow-bugbear-approach", {
    slot: "A", inputs: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left"],
    placement: [56, 32, "encounter:area:9:SPRIT2.DAX:63:0:0", 24, 73],
    approachSequence: [
      [56, 32, "encounter:area:9:SPRIT2.DAX:63:2:0", 24, 57],
      [56, 32, "encounter:area:9:SPRIT2.DAX:63:1:0", 24, 65],
      [56, 32, "encounter:area:9:SPRIT2.DAX:63:0:0", 24, 73],
    ],
    dialogue: { key: "up", portrait: "portrait:area:9:PIC2.DAX:63:0:0", prompt: /THELEADERSWINGSATYOU/i },
  }],
  ["bane-orc-guardroom-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:31:SPRIT1.DAX:4:0:0", 40, 80],
    approachSequence: [
      [56, 32, "encounter:area:31:SPRIT1.DAX:4:1:0", 32, 65],
      [48, 32, "encounter:area:31:SPRIT1.DAX:4:0:0", 40, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:area:31:PIC1.DAX:4:0:0", prompt: /ALARGEGROUPOFFOULORCS/i },
  }],
  ["kobold-cave-wyvern-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [24, 32, "encounter:area:13:SPRIT8.DAX:121:0:0", 88, 80],
    terrain: { area: 13, views: 3, patterns: 12 },
    approachSequence: [
      [56, 32, "encounter:area:13:SPRIT8.DAX:121:2:0", 32, 49],
      [40, 32, "encounter:area:13:SPRIT8.DAX:121:1:0", 56, 65],
      [24, 32, "encounter:area:13:SPRIT8.DAX:121:0:0", 88, 80],
    ],
  }],
  ["valjevo-troll-approach", {
    slot: "B", inputs: ["up", "b"],
    placement: [48, 32, "encounter:area:5:SPRIT5.DAX:31:0:0", 40, 80],
  }],
]);
const encounterRoute = encounterRoutes.get(routeName);
const sokalPatrolDeparture = ["up", "enter", "p", "n", ..."lux", "enter", "t", "enter", "enter", "enter",
  "left", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up", "up", "up",
  "right", "up", "up", "right", ...Array(5).fill("up"), "p", "n", ..."samosud", "enter"];

const illustrationRoutes = new Map([
  ["swamp-friend-word-charge", {
    slot: "A", inputs: ["up", "b", "p", "enter", ..."wrong", "enter", "y"],
    portrait: "scene-illustration:area:16:ecl:a65a",
    prompt: /2LIZARDMENANDAGIANTLIZARDCHARGEATYOU.*COMBATWAITFLEEPARLAY/i,
    journalLead: "swamp-friend-word-charge", journalLeadAtDiscovery: true,
    continuation: { inputs: ["c"], prompt: /ABATTLEBEGINS/i, clearsPortrait: true },
  }],
  ["valjevo-altar-crossed-swords", {
    slot: "B", inputs: ["up", "n"],
    portraitStops: { 1: null },
    portrait: "scene-illustration:area:6:ecl:9ae6:caller:a855",
    prompt: /BEHINDTHEALTERARETWOCROSSEDSWORDS.*DOYOUTAKETHEM/i,
    continuation: { inputs: ["y"], prompt: /EACHCHARACTERRECEIVES400EXPERIENCEPOINTS/i, clearsPortrait: true },
  }],
  ["valjevo-dungeon-armory", {
    slot: "B", inputs: ["up", "enter"],
    portraitStops: { 1: "scene-illustration:area:4:ecl:9a5a:caller:a6de" },
    portrait: "scene-illustration:area:4:ecl:9a2c:caller:a704",
    prompt: /DOYOUWANTTOTAKEANYTHING/i,
    continuation: { inputs: ["y"], prompt: /THEPARTYHASFOUNDTREASURE/i, clearsPortrait: true },
  }],
  ["valjevo-giant-barracks-password-list", {
    slot: "B", inputs: ["up", "enter", "enter", "a", "a", "p", "h"],
    portraitStops: { 6: "portrait:area:4:PIC5.DAX:56:0:0" },
    portrait: "scene-illustration:area:4:ecl:9a5a:caller:a442",
    prompt: /THISPAPERHASTHEPASSWORDS/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:4:PIC5.DAX:56:0:0",
      prompt: /TODAY'SPASSWORDIS.*THEGATEPASSWORDIS/i,
    },
  }],
  ["valjevo-disguise-offer", {
    slot: "B", inputs: ["up", "enter", "n"],
    portraitStops: {
      1: "scene-illustration:area:6:ecl:9b14:caller:9ce3",
      2: "scene-illustration:area:6:ecl:9d68",
    },
    portrait: "scene-illustration:area:6:ecl:9b14:caller:9996",
    prompt: /USETHESECLOTHESASADISGUISEANDYOUWILLESCAPENOTICE/i,
    journalLead: "castle-disguise", journalLeadAtDiscovery: true,
    continuation: {
      inputs: ["enter"], portrait: "scene-illustration:area:6:ecl:9ae6:caller:99bb",
      prompt: /WILLYOUUSETHECLOTHINGASADISGUISE/i,
    },
  }],
  ["mendor-storeroom-kobold-map", {
    slot: "B", inputs: ["up", ...Array(4).fill("enter"), "p", "y"],
    portraitStops: { 6: "portrait:area:15:PIC2.DAX:0:0:0" },
    portrait: "scene-illustration:area:15:ecl:99b5:caller:ae7b",
    prompt: /SKETCHAMAPINTOYOURJOURNALCALLINGITENTRY10/i,
    journalLead: "mendor-storeroom-map", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["stojanow-bugbear-gate-payment", {
    slot: "B", inputs: [
      "up", "enter", "enter", "p", "n", "t", "enter", "enter", "enter",
      "up", "up", "enter", "enter", "up", "right", "up", "up", "enter", "y", "enter", "y",
    ],
    portraitStops: { 20: "portrait:area:9:PIC2.DAX:63:0:0" },
    portrait: "scene-illustration:area:9:ecl:acb7",
    prompt: /THEBUGBEARTAKESTHEMONEYANDTHEGATEOPENS.*YOUPROCEEDTHROUGH/i,
    continuation: { inputs: ["enter", "up"], prompt: /8,4N.*AREACASTVIEWENCAMP|AREACASTVIEWENCAMP.*8,4N/i, clearsPortrait: true },
  }],
  ["diogenes-upper-ledge-fireball", {
    slot: "A", inputs: [
      "up", "enter", "e", "enter", "s", "enter", "end", "enter", "enter", "enter", "s", "enter", "f", "a",
    ],
    portraitStops: { 13: "portrait:area:25:ecl:a03a:PIC6.DAX:117:0:0" },
    portrait: "scene-illustration:area:25:ecl:a0ea",
    prompt: /FROZENINTIME.*THEDRAGONTHROWSAFIREBALLINTHEMIDDLEOFTHEPARTY/i,
    journalLead: "diogenes-fireball", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], portrait: "portrait:PIC6.DAX:117:0:0", prompt: /DIES/i },
  }],
  ["diogenes-gift", {
    slot: "A", inputs: ["up", "enter", "e", "enter", "s", "enter", "end", "end", "end", ...Array(5).fill("enter")],
    portraitStops: {
      12: "portrait:area:25:ecl:a58b:caller:a378:PIC6.DAX:117:0:0",
      13: "portrait:area:25:ecl:a58b:caller:9c11:PIC6.DAX:117:0:0",
    },
    portrait: "scene-illustration:area:19:ecl:aeeb:cue:diogenes-advice-departure",
    prompt: /THEDRAGONFLYSTHROUGHANOPENNINGINTHECEILING/i,
    continuation: { inputs: ["enter"], clearsPortrait: true, prompt: /YOUEXITTHECAVETOCONTINUEYOURQUEST/i },
  }],
  ["diogenes-bottle-return", {
    slot: "A", inputs: ["up", "enter", "e", "enter", "enter", "enter"],
    portraitStops: {
      4: "scene-illustration:area:25:ecl:a58b:caller:a44c",
      5: "scene-illustration:area:25:ecl:a58b:caller:a4cc",
    },
    portrait: "scene-illustration:area:19:ecl:aeeb:cue:diogenes-bottle-departure",
    prompt: /WHENYOUMEETTHEVAMPIREUSETHEBOTTLE.*DIOGENESFLIESTHROUGHAHOLE/i,
    journalLead: "commission-bottle-vampire", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], clearsPortrait: true, prompt: /WHENYOUMEETTHEVAMPIREUSETHEBOTTLE/i },
  }],
  ["podal-auction-wand-exchange", {
    slot: "I", inputs: ["up", ...Array(5).fill("enter"), "end", "enter", "enter"],
    portrait: "portrait:area:18:ecl:b240:caller:a839:PIC1.DAX:16:0:0",
    prompt: /AMANANDOGREEXCHANGETHEWANDANDALARGEBAG/i,
  }],
  ["podal-auction-garwin-escaped", {
    slot: "I", inputs: ["up", ...Array(9).fill("enter"), "end", "end", "enter"],
    portraitStops: { 10: "portrait:area:18:ecl:a51e:PIC1.DAX:16:0:0" },
    portrait: "scene-illustration:area:18:ecl:b240:caller:a839",
    prompt: /GARWIN,I'LLGETYOU.*THEMANHASESCAPEDINTHECONFUSION/i,
    journalLead: "auction-garwin-escaped", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], portrait: "scene-illustration:area:18:ecl:9e23", prompt: /THEAUCTIONOVER,THEMONSTERSGRUMBLEANDTURNAWAY/i },
  }],
  ["podal-auction-ogre-searched", {
    slot: "I", inputs: ["up", ...Array(10).fill("enter")],
    portraitStops: { 10: "portrait:area:18:ecl:a51e:PIC1.DAX:16:0:0" },
    portrait: "portrait:area:18:ecl:b240:caller:a566:PIC1.DAX:16:0:0",
    prompt: /THEOGREISTACKLEDANDSEARCHED.*DOESN'THAVETHEITEM/i,
    journalLead: "auction-ogre-searched", journalLeadAtDiscovery: true,
    continuation: {
      inputs: ["enter", "enter"],
      portrait: "portrait:area:18:ecl:b240:caller:a825:PIC1.DAX:16:0:0",
      prompt: /THEAUCTIONISCANCELLED/i,
    },
  }],
  ["valhingen-storm-entrance", {
    slot: "A", inputs: ["down", "up", "enter", "enter", "g", "enter", "enter"],
    portraitStops: { 0: null, 6: "scene-illustration:area:26:ecl:b695:caller:9c27" },
    portrait: "scene-illustration:area:26:ecl:9c99",
    prompt: /EXPLOSIONOFLIGHTNINGREVEALS.*GRAVEYARDTURNEDUPSIDEDOWN/i,
    continuation: { inputs: ["up"], clearsPortrait: true, prompt: /AREACASTVIEWENCAMPSEARCHLOOK/i },
  }],
  ["nomad-feast-arrival", {
    slot: "A", inputs: ["up", ...Array(4).fill("enter"), "p", "enter", "enter", "y", "enter"],
    portraitStops: { 9: "scene-illustration:area:17:ecl:9da2:caller:a711" },
    portrait: "scene-illustration:area:17:ecl:9da2:caller:a7a2",
    prompt: /THENOMADSBUILDAHUGECAMPFIRE.*THEWHOLETRIBEGATHERSFORTHEFEAST/i,
    journalLead: "nomad-headman-talk",
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:17:ecl:9da2:caller:a82f:HEAD7.DAX:74:BODY7.DAX:30",
      prompt: /HASSADAHWAL.STALKENTRY55/i,
    },
  }],
  ["bane-entry53-art", {
    slot: "A", manualPolling: true,
    inputs: ["right", "up", "up", "left", "up", "up", "up", "up", "left", "up", "up", "right", "up",
      ...Array(8).fill("enter"), ...Array(95).fill("q"), "n", "enter", "enter", "e", "n"],
    portrait: "scene-illustration:area:31:ecl:b0b5",
    prompt: /YOUFINDAPIECEOFPAPERONTHEFLOORINTHEROOM.*JOURNALUNDERENTRY53/i,
    journalLead: "journal-entry-53", journalLeadAtDiscovery: true,
    continuation: { inputs: ["up"], prompt: /5,8W/i, clearsPortrait: true },
  }],
  ["textile-cadorna-confrontation", {
    slot: "E",
    inputs: ["right", "up", "up", "up", "right", "up", "left", "up", "right", ...Array(8).fill("up"),
      "left", ...Array(6).fill("up"), "right", "up", "left", "up", "up", "up", "enter", "enter",
      "l", ...Array(4).fill("left"), "down", "enter", "t", ...Array(3).fill("enter"),
      ...Array(4).fill("up"), "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
      "left", "up", "up", "left", "up"],
    portrait: "scene-illustration:area:0:ecl:9b38", prompt: /COUNCILMANCADORNACONFRONTSYOU.*HESTRIDESOFF/i,
    journalLead: "textile-confrontation", journalLeadAtDiscovery: true,
    continuation: { inputs: ["up"], prompt: /OUTSIDETHECLERK.SOFFICE/i, clearsPortrait: true },
  }],
  ["valjevo-dragon-loot", {
    slot: "B", manualPolling: true,
    inputs: ["right", ...Array(4).fill("up"), ...Array(5).fill("enter"), ...Array(6).fill("a"),
      "enter", "enter", ...Array(33).fill("q"), "n", "enter", "enter"],
    portrait: "portrait:area:7:ecl:a803:PIC1.DAX:1:0:0", prompt: /View.*Exit/i,
    continuation: { inputs: ["e"], portrait: "scene-illustration:area:7:ecl:a82d",
      prompt: /THESPIRITOFTYRANTHRAXUSFLARESUP/i },
  }],
  ["textile-diary-discovery", {
    slot: "B", inputs: ["up", "right"],
    portraitStops: { 1: "scene-illustration:area:2:ecl:abae" },
    portrait: "scene-illustration:area:2:ecl:abae", prompt: /YOUFINDAPAGEFROMADIARY.*ENTRY11/i,
    journalLead: "textile-diary-page", journalLeadAtDiscovery: true,
    continuation: { inputs: ["up"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["yarash-alchemical-laboratory", {
    slot: "A", inputs: ["up", "up", "enter", "left", "up", "enter", "right"],
    portraitStops: { 5: "scene-illustration:area:23:ecl:9a04:caller:a08a", 6: "scene-illustration:area:23:ecl:a0fd" },
    portrait: "scene-illustration:area:23:ecl:a0fd", prompt: /THEWALLSARELINEDWITHFLASKSANDBOTTLES.*ALCHEMICALNATURE/i,
    journalLead: "river-alchemical-laboratory", journalLeadAtDiscovery: true,
    continuation: { inputs: ["up"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["yarash-desk-papers", {
    slot: "A", inputs: ["s", "up", ...Array(6).fill("enter")],
    portraitStops: {
      2: null,
      3: "scene-illustration:area:23:ecl:9a04:caller:ade9",
      4: "scene-illustration:area:23:ecl:9a04:caller:ae21",
      5: "scene-illustration:area:23:ecl:9a04:caller:ae48",
      6: "scene-illustration:area:23:ecl:9a04:caller:ae89",
      7: "scene-illustration:area:23:ecl:9a04:caller:aed0",
    },
    portrait: "scene-illustration:area:23:ecl:9a04:caller:af04", prompt: /ANOTETOATRAPPER.*ENTRY40/i,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["mendor-rhetoric-stacks-arrival", {
    slot: "B", inputs: ["up", "up", "right", "up", "up", "up", "right", "up"],
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9de1:cue:rhetoric-stacks",
    prompt: /THESEARETHELIBRARYSTACKS.*ASIGNOVERTHEENTRANCEREADSRHETORIC/i,
    journalLead: "mendor-stacks-rhetoric", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /5,4N/, clearsPortrait: true },
  }],
  ["mendor-philosophy-stacks", {
    slot: "B", inputs: ["left", "up"],
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9de1",
    prompt: /THESEARETHELIBRARYSTACKS.*ASIGNOVERTHEENTRANCEREADSPHILOSOPHY/i,
    journalLead: "mendor-stacks-philosophy", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["mendor-history-stacks-arrival", {
    slot: "B", inputs: ["s", "up"],
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9de1:cue:history-stacks",
    prompt: /THESEARETHELIBRARYSTACKS.*ASIGNOVERTHEENTRANCEREADSHISTORY/i,
    journalLead: "mendor-stacks-history", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["mendor-mathematics-stacks-arrival", {
    slot: "B", inputs: ["up", "up", "right", ...Array(5).fill("up"), "left", "up"],
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9de1:cue:mathematics-stacks",
    prompt: /THESEARETHELIBRARYSTACKS.*ASIGNOVERTHEENTRANCEREADSMATHEMATICS/i,
    journalLead: "mendor-stacks-mathematics", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["mendor-history-of-the-north-discovery", {
    slot: "B", inputs: ["s", "up", "enter", "left", "up", "up"],
    portraitStops: { 2: "scene-illustration:area:15:ecl:99b5:caller:9de1:cue:history-stacks", 3: null },
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9962:cue:history-of-the-north", prompt: /YOUFINDTHEHISTORYOFTHENORTH.*ENTRY8/i,
    continuation: { inputs: ["enter"], prompt: /DOYOUTAKEIT/i, clearsPortrait: true },
    book: 8,
  }],
  ["mendor-grand-historian-discovery", {
    slot: "B",
    inputs: ["s", "up", "enter", "left", "up", "up", "enter", "n",
      ...Array.from({ length: 10 }, () => ["left", "up", "up"]).flat(), "left", "up"],
    portrait: "scene-illustration:area:15:ecl:99b5:caller:9962:cue:grand-historian",
    prompt: /RECORDSOFTHEARTSOFWAR.*ENTRY21/i,
    book: 21,
    continuation: { inputs: ["enter"], prompt: /DOYOUTAKEIT/i, clearsPortrait: true },
  }],
  ["bane-reward-illustration", {
    slot: "A", inputs: ["right", "right", "up", "right", "right", "up", "enter", "enter"],
    portraitStops: { 7: "portrait:HEAD3.DAX:24:BODY3.DAX:32" },
    portrait: "scene-illustration:area:8:ecl:b5c3:caller:a51f", prompt: /YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE/i,
    continuation: { inputs: ["enter"], portrait: "portrait:HEAD3.DAX:24:BODY3.DAX:32",
      prompt: /ONTHEMATTEROFCOMMISSION/i },
  }],
  ["bivant-reward-illustration", {
    slot: "A", inputs: ["right", "right", "up", "right", "right", "up", "enter", "enter"],
    portraitStops: { 7: "portrait:HEAD3.DAX:24:BODY3.DAX:32" },
    portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:bivant-rescue",
    prompt: /BIVANTWASDELIGHTEDWITHTHECHILD.SRESCUE/i,
    continuation: { inputs: ["enter"], prompt: /receives19250experiencepoints/i, clearsPortrait: true },
  }],
  ["sokal-council-turn-in", {
    slot: "F",
    inputs: [...sokalPatrolDeparture, "up", "up", "enter", "enter", "y",
      "up", "up", "right", "up", "up", "left", "up", "up", "enter", "enter", "y",
      ...Array(4).fill("up"), "enter", "y", ...Array(4).fill("enter"), ...Array(4).fill("up"),
      "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
      "left", "up", "up", "left", "up", "left", "up", "up", "enter"],
    portraitStops: { 95: "portrait:HEAD3.DAX:24:BODY3.DAX:32" },
    portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a",
    prompt: /WITHSOKALKEEPINOURHANDS/i,
    continuation: { inputs: ["enter"], prompt: /receives1308experiencepoints/i, clearsPortrait: true },
  }],
  ["sokal-password-patrol-arrival", {
    slot: "C", inputs: [...Array(5).fill("up"), "enter", "enter", "p", "n", ..."shestni", "enter"],
    portrait: "scene-illustration:area:21:ecl:9ecc", prompt: /THEUNDEADLEAVE/i,
    continuation: { inputs: ["up"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["sokal-password-patrol-departure", {
    slot: "F",
    inputs: sokalPatrolDeparture,
    portraitStops: { 43: "portrait:area:21:PIC4.DAX:34:0:0" },
    portrait: "scene-illustration:area:21:ecl:9ecc",
    prompt: /THEUNDEADLEAVE/i,
    continuation: { inputs: ["up"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["sokal-floorboard-diary", {
    slot: "C", inputs: ["up", "enter", "a", "a", "p", "n", ..."lux", "enter", "enter", "enter"],
    portraitStops: { 11: "portrait:area:21:ecl:ae31:caller:a4f3:PIC4.DAX:17:0:0" },
    portrait: "scene-illustration:area:21:ecl:ae31:caller:a573", prompt: /BENEATHAFLOORBOARD.*JOURNALASENTRY3/i,
    continuation: { inputs: ["enter"], prompt: /DOYOUTAKETHEGEMS.*YesNo/i, portrait: "scene-illustration:area:21:ecl:ae41:caller:a58a" },
  }],
  ["sokal-ferran-farewell", {
    slot: "F", inputs: ["up", "enter", "p", "n", "l", "u", "x", "enter", "t", "enter", "enter"],
    portraitStops: {
      9: "scene-illustration:area:21:ecl:ae31:caller:ac4a",
      10: "scene-illustration:area:21:ecl:ae31:caller:ace3",
    },
    portrait: "portrait:area:21:ecl:ae31:caller:ad9e:PIC4.DAX:19:0:0", prompt: /FERRANFADESAWAY/i,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["tyrmor-corpse-without-search", {
    slot: "B", inputs: ["up"],
    portrait: "scene-illustration:area:22:ecl:9a06:caller:9f51",
    prompt: /YOUFINDTHECORPSEOFAMAN/i,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["tyrmor-journal-discovery", {
    slot: "B", inputs: ["s", "up", "enter"], portraitStops: { 2: "scene-illustration:area:22:ecl:9a06:caller:9f51" },
    portrait: "scene-illustration:area:22:ecl:9a06:caller:9fe3",
    prompt: /ITISTHEJOURNALOFTYRMOR.*ENTRY26/i,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["valjevo-tower-fire-giants-agree", {
    slot: "B", inputs: ["up", "l", "enter", "enter", "y"],
    portrait: "portrait:area:5:ecl:9a5a:caller:a761:PIC5.DAX:56:0:0",
    prompt: /THEGIANTTURNSINTRIUMPHTOHISCOMPANIONS/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:5:ecl:9a5a:caller:a82a:PIC5.DAX:56:0:0",
      prompt: /THEYTURNANDATTACKYOU/i,
    },
  }],
  ["valjevo-tower-fire-giants-refuted", {
    slot: "B", inputs: ["up", "l", "enter", "enter", "n"],
    portrait: "portrait:area:5:ecl:9a5a:caller:a69a:PIC5.DAX:56:0:0",
    prompt: /YOULIE.*ISMASHYOU/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:5:ecl:a6e7:PIC5.DAX:56:0:0",
      prompt: /BEFOREHECANATTACKTHEOTHERSGRABHIM/i,
    },
  }],
  ["valhingen-wight-roam-dialogue", {
    slot: "A", inputs: ["up", "down", "up"],
    portrait: "portrait:area:10:ecl:b50b:PIC4.DAX:20:0:0",
    prompt: /YOUHAVEMANAGEDTOSNEAKUPONSOMEWIGHTS/i,
  }],
  ["valhingen-skeleton-roam-dialogue", {
    slot: "A", inputs: ["up", "down", "a", "a"],
    portrait: "portrait:area:10:ecl:b50b:PIC4.DAX:34:0:0",
    prompt: /YOUHAVEMANAGEDTOSNEAKUPONSOMESKELETONS/i,
  }],
  ["tyranthraxus-battle-opening", {
    slot: "B",
    inputs: ["up", "up", ...Array(5).fill("enter"), ...Array(6).fill("a")],
    portraitStops: {
      3: "portrait:area:7:ecl:995f:caller:a54b:PIC5.DAX:66:0:0",
      4: null,
      5: "portrait:area:7:ecl:995f:caller:a6a7:PIC5.DAX:66:0:0",
      ...Object.fromEntries(Array.from({ length: 6 }, (_, vote) =>
        [vote + 7, "portrait:area:7:ecl:a768:PIC5.DAX:66:0:0"])),
    },
    portrait: "portrait:area:7:ecl:a803:PIC5.DAX:66:0:0",
    prompt: /ABATTLEBEGINS/i,
    continuation: { inputs: ["enter"], prompt: /HITPOINTS.*MOVEVIEWAIMUSE/i, clearsPortrait: true },
  }],
  ["valjevo-genheeris-deal-refused", {
    slot: "B", inputs: ["up", "enter", "enter", "a", "a", "p", "h", "enter", "n"],
    portrait: "portrait:area:7:ecl:a3ba:HEAD5.DAX:59:BODY5.DAX:31",
    prompt: /ABATTLEBEGINS/i,
  }],
  ["zhentil-dinner-escort", {
    slot: "A", inputs: ["up", "enter", "r"],
    portrait: "scene-illustration:area:28:ecl:a74e",
    prompt: /ATDUSKAGUARDCOMESBYTOESCORTYOUTODINNER/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:28:ecl:b624:caller:a7c2:PIC6.DAX:50:0:0",
      prompt: /YOUARRIVEATTHEOFFICERSMESS.*ROASTBOAR/i,
    },
  }],
  ["zhentil-dinner-quarters-return", {
    slot: "A", inputs: ["up", "enter", "r", "enter", "enter", "n", "s"],
    portraitStops: {
      3: "scene-illustration:area:28:ecl:a74e",
      4: "portrait:area:28:ecl:b624:caller:a7c2:PIC6.DAX:50:0:0",
      6: "portrait:area:28:ecl:a92f:PIC6.DAX:50:0:0",
    },
    portrait: "scene-illustration:area:28:ecl:b5ec", prompt: /YOUARRIVEBACKATYOURQUARTERS/i,
    continuation: { inputs: ["up"], prompt: /6,0E/i, clearsPortrait: true },
  }],
  ["zhentil-dinner-advisor", {
    slot: "A", inputs: ["up", "enter", "r", "enter", "enter", "m"],
    portrait: "portrait:area:28:ecl:aef2:PIC6.DAX:50:0:0",
    prompt: /ONEOFTHECOMMANDANT.SADVISORSASKSYOU.*UNIQUEMAGICALITEMSORPLACES/i,
    continuation: {
      inputs: ["m"], portrait: "portrait:area:28:ecl:b624:caller:b317:PIC6.DAX:50:0:0",
      prompt: /COPYITINTOYOURJOURNALUNDERENTRY46/i,
    },
  }],
  ["zhentil-commandant-new-phlan-dinner", {
    slot: "A", inputs: ["up", "enter", "r", "enter", "enter", "c", "n", "y"],
    portrait: "portrait:area:28:ecl:b624:caller:a7c2:PIC6.DAX:50:0:0",
    prompt: /PHLANMUSTBEACITYOFFOOLSIFABISHOPOFTYRHASPOWER/i,
  }],
  ["zhentil-commandant-pool-story", {
    slot: "A", inputs: ["up", "enter", "r", "enter", "enter", "m", "m"],
    portrait: "portrait:area:28:ecl:b624:caller:b317:PIC6.DAX:50:0:0",
    prompt: /THECOMMANDANTTELLSYOUASTORYABOUTTHATVERYPOOL.*JOURNALUNDERENTRY46/i,
    journalLead: "journal-entry-46",
  }],
  ["zhentil-commandant-fire-legend", {
    slot: "A", inputs: ["up", "enter", "r", "enter", "enter", "c", "o"],
    portrait: "portrait:area:28:ecl:b624:caller:ade4:PIC6.DAX:50:0:0",
    prompt: /AFIREBEINGCALLEDTIRANTIKUS.*TIRANTIKUSANDTYRANTHRAXUSAREONEANDTHESAME/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:28:ecl:ae5e:PIC6.DAX:50:0:0",
      prompt: /HAVINGANYTROUBLEWITHTYRANTHRAXUS/i,
    },
  }],
  ["valjevo-false-throne-alarm", {
    slot: "B", inputs: ["up", "enter", "enter", "p", "a", "enter", "n"],
    portrait: "portrait:area:5:ecl:abc9:HEAD5.DAX:54:BODY5.DAX:1",
    prompt: /ANALARMSTARTSRINGING/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:5:ecl:abe2:HEAD5.DAX:54:BODY5.DAX:1",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["valjevo-maze-watch-alarm", {
    slot: "B", inputs: ["up", "enter", "enter", "p", "h", "enter"],
    portrait: "portrait:area:4:ecl:a123:HEAD5.DAX:52:BODY5.DAX:1",
    prompt: /LUNGESFORTHEDOORANDHITSABUTTON.*STAYANDFIGHTRUN/i,
    continuation: { inputs: ["r"], prompt: /ANALARMSTARTSRINGING/i, clearsPortrait: true },
  }],
  ["valjevo-maze-watch-reinforcements", {
    slot: "B", inputs: ["up", "enter", "enter", "p", "h", "enter", "s"],
    portrait: "portrait:area:4:ecl:a188:HEAD5.DAX:52:BODY5.DAX:1",
    prompt: /FOURGIANTSBURSTOUTOFANEARBYBUILDING/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:4:ecl:a197:HEAD5.DAX:52:BODY5.DAX:1",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["valjevo-scriptorium-officers-attack", {
    slot: "B", inputs: ["up", "enter", "enter", "a", "a", "c"],
    portrait: "portrait:area:4:ecl:acae:HEAD5.DAX:53:BODY5.DAX:7",
    prompt: /THESIXSCRIBESDIVEFORCOVERASTHETWOOFFICERSATTACK/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:4:ecl:acaf:HEAD5.DAX:53:BODY5.DAX:7",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["valjevo-forge-smith-defends", {
    slot: "B", inputs: ["up", "enter", "a", "c"],
    portrait: "portrait:area:6:ecl:a2b8:HEAD5.DAX:13:BODY5.DAX:9",
    prompt: /ABATTLEBEGINS/i,
    continuation: { inputs: ["enter"], prompt: /HITPOINTS.*MOVEVIEWAIMUSEQUICKDONE/i, clearsPortrait: true },
  }],
  ["valjevo-chaplain-fireball", {
    slot: "B", inputs: ["up", "enter", "enter", "l"],
    portrait: "portrait:area:6:ecl:9b14:caller:a62f:HEAD5.DAX:14:BODY5.DAX:7",
    prompt: /AFIREBALLEXPLODES/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:6:ecl:a63a:HEAD5.DAX:14:BODY5.DAX:7",
      prompt: /ISHITFOR15POINTSOFDAMAGE/i,
    },
  }],
  ["valjevo-chaplain-blessing", {
    slot: "B", inputs: ["up", "enter", "enter", "a"],
    portrait: "portrait:area:6:ecl:9b14:caller:a530:HEAD5.DAX:14:BODY5.DAX:7",
    prompt: /YOUGOFORWARDANDKNEEL/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:6:ecl:a584:HEAD5.DAX:14:BODY5.DAX:7",
      prompt: /DOUBLESUPINAGONY.*POINTSOFDAMAGE/i,
    },
  }],
  ["valjevo-maze-patrol-captain", {
    slot: "B", inputs: ["s", "enter", "up", "enter", "enter", "down", "up", "enter", "enter", "a"],
    requireTiledApproach: false,
    approachSequence: [
      [56, 32, "encounter:area:4:SPRIT5.DAX:16:1:0", 24, 65],
      [48, 32, "encounter:area:4:ecl:9d8a:SPRIT5.DAX:16:0:0", 40, 80],
    ],
    portrait: "portrait:area:4:ecl:9d8a:HEAD5.DAX:9:BODY5.DAX:1",
    prompt: /WHATAREYOUDOINGHERE/i,
  }],
  ["stojanow-bugbear-punch", {
    slot: "A", inputs: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left", "up", "t"],
    portrait: "portrait:area:9:ecl:a959:PIC2.DAX:63:0:0",
    prompt: /THELEADERSWINGSATYOU/i,
    continuation: { inputs: ["enter"], prompt: /NOWBEATITBEFOREWEGETSERIOUS/i, clearsPortrait: true },
  }],
  ["valjevo-lower-snake-approach", {
    slot: "B", inputs: ["up", "enter", "a", "enter"],
    requireTiledApproach: false,
    approachSequence: [
      [48, 32, "encounter:area:3:ecl:b35e:SPRIT5.DAX:60:1:0", 40, 65],
      [40, 32, "encounter:area:3:ecl:b35e:SPRIT5.DAX:60:0:0", 64, 80],
    ],
    portrait: "portrait:area:3:PIC5.DAX:60:0:0", prompt: /YOUSEEGIANTSNAKES/i,
    continuation: { inputs: ["c"], prompt: /ABATTLEBEGINS/i },
  }],
  ["stojanow-gate-first-sight", {
    slot: "A", inputs: ["up", "up", "up", "enter"],
    portraitStops: { 3: "scene-illustration:area:9:ecl:9c63:caller:aa57" },
    portrait: "scene-illustration:area:9:ecl:9c63:caller:aabb", prompt: /THEMAINWALLRISES30FEET.*BUGBEARS/i,
    journalLead: "gate-bugbear-lookouts", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["stojanow-wagon-final-offer", {
    slot: "B", inputs: ["up", "enter", "enter", "p", "n"],
    portrait: "portrait:area:9:ecl:aeef:HEAD2.DAX:5:BODY2.DAX:9",
    prompt: /MYFINALOFFER/i,
    continuation: { inputs: ["l"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["stojanow-wagon-handover", {
    slot: "B", inputs: ["up", "enter", "enter", "p", "n", "t"],
    portrait: "portrait:area:9:ecl:9c63:HEAD2.DAX:5:BODY2.DAX:9",
    prompt: /PLEASUREDOINGBUSINESSWITHYOU/i,
    journalLead: "gate-trader-guard-warning",
    continuation: { inputs: ["enter"], portrait: "scene-illustration:area:9:ecl:9c63:caller:afb8", prompt: /BUGBEARSHAVEBEENSTUCKGUARDINGTHEGATE/i },
  }],
  ["zhentil-dwarf-charge", {
    slot: "A", inputs: ["up", "enter"],
    requireTiledApproach: false,
    approachSequence: [[48, 32, "encounter:area:28:ecl:a210:SPRIT6.DAX:13:0:0", 40, 73]],
    portrait: "portrait:area:28:ecl:a21c:HEAD6.DAX:13:BODY6.DAX:6",
    prompt: /ALARGEGROUPOFMENLEDBYADWARFRUNSFOWARDTOATTACK/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:28:ecl:a232:HEAD6.DAX:13:BODY6.DAX:6",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["kuto-nailed-door-patrol", {
    slot: "J", inputs: ["s", "up", "enter", "enter"],
    portrait: "portrait:area:29:PIC8.DAX:57:0:0",
    prompt: /ALIZARDMANLEADSAPACKOFGIANTLIZARDSONPATROLBEFOREADOORTHATHASBEENNAILEDCLOSED/i,
    continuation: { inputs: ["enter"], prompt: /ABATTLEBEGINS/i },
  }],
  ["bane-gate-direct-attack", {
    slot: "A", inputs: ["up", "enter", "enter", "a"],
    portrait: "portrait:area:24:PIC1.DAX:4:0:0",
    prompt: /ABATTLEBEGINS/i,
  }],
  ["bane-gate-inspection-failure", {
    slot: "A", inputs: ["up", "enter", "enter", "b"],
    portrait: "portrait:area:24:ecl:a586:PIC1.DAX:4:0:0",
    prompt: /IMUSTCHECKIFYOUAREWORTHYTOENTERTHETEMPLEOFBANE/i,
    continuation: {
      inputs: ["l"], portrait: "portrait:area:24:ecl:a6b8:PIC1.DAX:4:0:0",
      prompt: /GUARDS,INTHENAMEOFBANE,KILLTHESEUNBELIEVERS/i,
    },
  }],
  ["bane-hay-bunk-ambush", {
    slot: "A", inputs: ["up", "enter", "s", "enter"],
    portrait: "portrait:area:31:ecl:a2b4:PIC1.DAX:4:0:0",
    prompt: /ASYOUSEARCHTHEBEDSAGROUPOFORCSCOMESINTOTHEROOM/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:31:ecl:a2bb:PIC1.DAX:4:0:0",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["bane-treasury-ambush", {
    slot: "A", inputs: ["s", "enter", "up", "o", "enter", "enter", "e", "n", "enter", "enter"],
    portrait: "portrait:area:24:ecl:ab06:PIC1.DAX:4:0:0",
    approachSequence: [[48, 32, "encounter:area:24:ecl:ab06:SPRIT1.DAX:4:0:0", 40, 80]],
    prompt: /THEMINUTEYOUFINDTHETREASURE.*STEALFROMOURTEMPLE/i,
    continuation: { inputs: ["enter"], prompt: /ABATTLEBEGINS/i },
  }],
  ["valjevo-lower-snake-dialogue", {
    slot: "B", inputs: ["up", "enter"],
    portrait: "portrait:area:3:PIC5.DAX:60:0:0", prompt: /YOUSEEGIANTSNAKES/i,
  }],
  ["valjevo-audience-bodyguards", {
    slot: "B", inputs: ["right", "up", "up", "enter", "enter", "enter"],
    requireTiledApproach: false,
    approachSequence: [[48, 32, "encounter:area:7:SPRIT5.DAX:16:0:0", 40, 80]],
    portrait: "portrait:area:7:ecl:a5d8:HEAD5.DAX:12:BODY5.DAX:1",
    prompt: /TWOGUARDSMOVETOBARYOURPATH.*GUARDS.KILLTHESEPESTS/i,
  }],
  ["slums-feeding-kobolds", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:20:PIC2.DAX:0:0:0", prompt: /YOUINTERRUPTSOMEFEEDINGKOBOLDS/i,
    approachSequence: [[48, 32, "encounter:area:20:ecl:a4d4:SPRIT2.DAX:0:0:0", 40, 80]],
  }],
  ["new-phlan-innkeeper", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:0:HEAD3.DAX:45:BODY3.DAX:24", prompt: /ITWILLCOSTYOU1PLATINUMPIECETORESTHERE/i,
    continuation: { inputs: ["n"], prompt: /THENYOUMUSTLEAVE/i, clearsPortrait: true },
  }],
  ["new-phlan-tavern-spinner", {
    slot: "A", inputs: ["up", "enter", "y"],
    portrait: "portrait:area:0:HEAD3.DAX:8:BODY3.DAX:7", prompt: /WESPINTHISTOP/i,
  }],
  ["new-phlan-tavern-brawl", {
    slot: "A", inputs: ["up", "enter", "enter", "n", "enter", "enter"],
    portrait: "portrait:area:0:HEAD3.DAX:53:BODY3.DAX:7", prompt: /ADRUNKENBRAWLBREAKSOUT/i,
    approach: [56, 32, "encounter:area:0:SPRIT3.DAX:7:0:0", 32, 80],
    verifyImageSwap: true,
  }],
  ["new-phlan-council-entry", {
    slot: "A", inputs: [...Array(8).fill("enter"), "right", "right", "up", "up", "up",
      "enter", "up", "up", "up", "up", "left", "up", "up"],
    portrait: "portrait:HEAD3.DAX:24:BODY3.DAX:32", prompt: /THECOUNCILCLERKBEGINS/i,
    verifyImageSwap: true,
  }],
  ["new-phlan-rolf-tour", {
    slot: "A", inputs: [],
    portrait: "portrait:area:0:HEAD3.DAX:8:BODY3.DAX:9", prompt: /IAMROLF/i,
    continuation: { inputs: ["enter"], prompt: /YOUNOWFACEANENTRANCETOTHETEMPLEOFTYR/i, portrait: "scene-illustration:area:0:ecl:af3f:caller:b256" },
  }],
  ["sokal-keep-departure-ferry", {
    slot: "C", inputs: ["up", "up", "enter", "y", "enter"],
    portrait: "portrait:area:21:PIC4.DAX:41:0:0", prompt: /YOUBOARDABOAT/i,
    continuation: { inputs: ["enter", "enter", "enter"], prompt: /15,1W/i, clearsPortrait: true },
  }],
  ["new-phlan-outbound-ferry", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:0:PIC3.DAX:41:0:0", prompt: /YOUBOARDABOAT/i,
  }],
  ["new-phlan-harbor-city-watch", {
    slot: "A", inputs: harborWatchApproach,
    requireTiledApproach: false,
    approachSequence: [[48, 32, "encounter:area:0:ecl:af4d:SPRIT3.DAX:27:0:0", 40, 80]],
    portrait: "portrait:area:0:HEAD3.DAX:9:BODY3.DAX:7", prompt: /GO.*STAY/i,
  }],
  ["lizard-wilds-kobold-prisoners", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:0:0:0", prompt: /RELEASEUS/i,
    continuation: { inputs: ["r"], prompt: /WATCHOUTFORTHEMUTANTLIZARDMEN.*THENRUNOUTTHEDOOR/i, portrait: "scene-illustration:area:26:ecl:a842" },
    journalLead: "lizard-wilds-mutant-warning",
  }],
  ["lizard-wilds-pool-dialogue", {
    slot: "A", inputs: ["up", "a", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:57:0:0", prompt: /LIZARDMENSWIMMINGINTHEPOOL/i,
  }],
  ["wild-cave-giant-snake-dialogue", {
    slot: "A", inputs: ["up", "enter"],
    requireTiledApproach: false,
    approachSequence: [[40, 32, "encounter:area:25:ecl:a8d0:SPRIT6.DAX:60:0:0", 64, 80]],
    portrait: "scene-illustration:area:25:ecl:a90e", prompt: /AGIANTSNAKEFALLSONTOPOFTHEPARTY/i,
    continuation: { inputs: ["enter"], portrait: "scene-illustration:area:25:ecl:a90f", prompt: /ABATTLEBEGINS/i },
  }],
  ["wild-cave-boar-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "scene-illustration:area:25:ecl:a6e6", prompt: /THREELARGEWILDBOARS.*CHARGEATYOUANDATTACK/i,
    continuation: { inputs: ["enter"], portrait: "scene-illustration:area:25:ecl:a6e7", prompt: /ABATTLEBEGINS/i },
  }],
  ["wild-cave-giant-lizard-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "scene-illustration:area:27:ecl:a5aa", prompt: /FOURGIANTLIZARDSANDTWOMINOTAURS.*ORDERTHELIZARDSTOATTACK/i,
    continuation: { inputs: ["enter"], portrait: "scene-illustration:area:27:ecl:a5b2", prompt: /ABATTLEBEGINS/i },
  }],
  ["lizard-wilds-stirge-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:61:0:0", prompt: /ASWARMOFSTIRGESSWOOPSDOWN/i,
  }],
  ["wild-cave-thri-kreen-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachStops: { 2: [56, 32, "encounter:area:25:ecl:aa36:SPRIT6.DAX:118:0:0", 32, 73] },
    portrait: "portrait:area:25:ecl:aaa4:PIC6.DAX:118:0:0", prompt: /FOURTHRI.KREENWARRIORS.*ACHESTWITHTREASURE/i,
    continuation: { inputs: ["enter"], prompt: /ABATTLEBEGINS/i, portrait: "portrait:area:25:ecl:aab8:PIC6.DAX:118:0:0" },
  }],
  ["wild-cave-gnoll-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:27:PIC8.DAX:73:0:0", prompt: /SOMEGNOLLSANDTROLLS/i,
  }],
  ["kuto-bandit-cache", {
    slot: "J", inputs: ["up"],
    portrait: "scene-illustration:area:29:ecl:af80:caller:9fd6",
    prompt: /YOUHAVEFOUNDTHEBANDIT.STREASURE.*DOYOUTAKEIT/i,
    journalLead: "kuto-bandit-treasure",
  }],
  ["kuto-well-waterline", {
    slot: "J", inputs: ["up", "y", "enter", "enter"],
    portraitStops: { 1: null, 2: null },
    portrait: "scene-illustration:area:29:ecl:af80:caller:a23f",
    prompt: /JUSTABOVETHEWATERLINE,ASECRETDOORHASBEENLEFTAJAR.*DOYOUWANTTOCLIMBUPTHERUNGS/i,
    journalLead: "kuto-well-waterline-door", journalLeadAtDiscovery: true,
    continuation: { inputs: ["n"], prompt: /AREACASTVIEWENCAMP/i, clearsPortrait: true },
  }],
  ["kuto-norris-dialogue", {
    slot: "J", inputs: ["up", "enter", "enter", "enter"],
    portrait: "portrait:area:29:ecl:9dc5:HEAD8.DAX:10:BODY8.DAX:6", prompt: /SURRENDER.*FIGHT/i,
    continuation: {
      inputs: ["f"], portrait: "portrait:area:29:ecl:9df1:HEAD8.DAX:10:BODY8.DAX:6",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["lizard-wilds-displacer-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachStops: { 2: [40, 32, "encounter:area:26:ecl:a6c5:SPRIT7.DAX:68:0:0", 64, 80] },
    portrait: "portrait:area:26:ecl:a70c:PIC7.DAX:68:0:0", prompt: /AMBUSHEDBYTWODISPLACERBEASTS/i,
    continuation: { inputs: ["enter"], prompt: /ABATTLEBEGINS/i, portrait: "portrait:area:26:ecl:a70d:PIC7.DAX:68:0:0" },
  }],
  ["old-phlan-lizard-patrol", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:29:PIC8.DAX:57:0:0", prompt: /ALIZARDMANLEADSAPACKOFGIANTLIZARDS/i,
  }],
  ["textile-skullcrusher-chained", {
    slot: "B", inputs: ["up", "b", "up", "enter"],
    portrait: "portrait:HEAD4.DAX:32:BODY4.DAX:3", prompt: /WHATDOYOUDOWITHTHEMAN/i,
    journalLead: "textile-prisoner",
  }],
  ["kobold-cave-envoys-rematch", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD8.DAX:69:BODY8.DAX:1", prompt: /AREMATCHTHEN\.PREPAREFORDEATH/i,
    journalLead: "kobold-throne-envoys",
  }],
  ["valjevo-apartment-sentry-approach", {
    slot: "B", inputs: ["up", "up"],
    portrait: "portrait:HEAD5.DAX:12:BODY5.DAX:1", prompt: /WHATAREYOUDOINGHERE/i,
    approachSequence: [[48, 32, "encounter:area:3:ecl:a0d0:SPRIT5.DAX:16:0:0", 40, 80]],
    requireTiledApproach: false,
  }],
  ["valjevo-apartment-giants-approach", {
    slot: "B", inputs: ["up", "up", "enter", "enter"],
    portrait: "portrait:PIC5.DAX:55:0:0", prompt: /THEGIANTSSTANDINFRONTOFYOULOOKINGSUSPICIOUS/i,
    approachSequence: [[40, 32, "encounter:area:3:ecl:a3d0:SPRIT5.DAX:55:0:0", 48, 80]],
    requireTiledApproach: false,
  }],
  ["valjevo-password-giants-approach", {
    slot: "B", inputs: ["up", "enter"],
    portrait: "portrait:area:3:ecl:ac1e:PIC5.DAX:55:0:0", prompt: /WHATPASSWORD/i,
    approachSequence: [[40, 32, "encounter:area:3:ecl:abe6:SPRIT5.DAX:55:0:0", 48, 80]],
    requireTiledApproach: false,
  }],
  ["valjevo-messenger-dialogue", {
    slot: "B", inputs: ["up", "b", "up", "enter", "enter", "p", "n"],
    portrait: "portrait:HEAD5.DAX:70:BODY5.DAX:8", prompt: /IJUSTGOTBACKFROMTHENORTH/i,
    approachSequence: [[40, 32, "encounter:area:7:ecl:9f47:SPRIT5.DAX:11:0:0", 48, 80]],
  }],
  ["sokal-undead-patrol-dialogue", {
    slot: "C", inputs: [...Array(5).fill("up"), "enter", "enter"],
    portrait: "portrait:area:21:PIC4.DAX:34:0:0", prompt: /APACKOFUNDEADSUDDENLYAPPEARS/i,
  }],
  ["valhingen-zombie-stairs", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:10:PIC4.DAX:35:0:0", prompt: /ZOMBIESSHUFFLEDOWNTHESTAIRS/i,
  }],
  ["valhingen-zombie-trap", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [[56, 32, "encounter:area:10:SPRIT4.DAX:35:0:0", 32, 80]],
    requireTiledApproach: false,
    portrait: "portrait:area:10:ecl:a022:PIC4.DAX:35:0:0", prompt: /AZOMBIEWITHGRAY,LEATHERY.HARDSKIN/i,
  }],
  ["valhingen-vampire-chamber", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:10:ecl:b695:caller:b23b:PIC4.DAX:23:0:0",
    prompt: /THECHAMBERLIGHTSUPTOREVEALATALL,PALEMAN/i,
  }],
  ["valhingen-vampire-trove", {
    slot: "A", inputs: ["s", "l", "n", "l"],
    portraitStops: { 2: "scene-illustration:area:10:ecl:b6c6:caller:b353", 3: null },
    portrait: "scene-illustration:area:10:ecl:b6c6:caller:b353",
    prompt: /YOUFINDTHEVAMPIRE'STREASURETROVE.*DOYOUTAKEIT/i,
    journalLead: "graveyard-vampire-trove", journalLeadAtDiscovery: true,
    continuation: { inputs: ["y"], prompt: /THEPARTYHASFOUNDTREASURE/i, clearsPortrait: true },
  }],
  ["valhingen-grave-claws", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:10:PIC4.DAX:11:0:0", prompt: /CLAWSRISEFROMTHESOIL/i,
  }],
  ["kobold-white-flag-envoy", {
    slot: "B", inputs: ["up", "enter", "enter"],
    approachSequence: [
      [56, 32, "encounter:area:13:ecl:9b8a:SPRIT8.DAX:0:1:0", 24, 65],
      [56, 32, "encounter:area:13:ecl:9bb1:SPRIT8.DAX:0:1:0", 24, 65],
      [56, 32, "encounter:area:13:ecl:9bb2:SPRIT8.DAX:0:1:0", 24, 65],
      [48, 32, "encounter:area:13:ecl:9bb2:SPRIT8.DAX:0:0:0", 40, 80],
    ],
    portrait: "portrait:area:13:ecl:9c10:PIC8.DAX:0:0:0", prompt: /WEWILLPAYFORATRUCE/i,
    continuation: { inputs: ["a"], portrait: "portrait:area:13:ecl:9c5e:PIC8.DAX:0:0:0", prompt: /IAMTOESCORTYOUTOOURTREASURE/i },
  }],
  ["kobold-throne-first-audience", {
    slot: "B", inputs: ["up", "enter", "enter", "enter"],
    approachSequence: [
      [56, 32, "encounter:area:13:ecl:a02c:SPRIT8.DAX:0:2:0", 24, 57],
      [56, 32, "encounter:area:13:ecl:a07a:SPRIT8.DAX:0:2:0", 24, 57],
      [56, 32, "encounter:area:13:ecl:a07a:SPRIT8.DAX:0:1:0", 24, 65],
    ],
    portrait: "portrait:area:13:ecl:a14b:PIC8.DAX:0:0:0", prompt: /THESEMENAREENEMIES/i,
  }],
  ["kobold-envoy-rematch", {
    slot: "B", inputs: ["up", "enter"],
    approachSequence: [
      [56, 32, "encounter:area:13:ecl:a27f:SPRIT8.DAX:16:1:0", 24, 65],
      [48, 32, "encounter:area:13:ecl:a27f:SPRIT8.DAX:16:0:0", 40, 80],
    ],
    portrait: "portrait:HEAD8.DAX:69:BODY8.DAX:1", prompt: /AREMATCHTHEN.PREPAREFORDEATH/i,
  }],
  ["wild-cave-feral-kobolds", {
    slot: "B", inputs: [...Array.from({ length: 7 }, () => ["up", "enter", "down", "up", "down"]).flat(),
      "up", "enter", "down"],
    approachSequence: [
      [56, 32, "encounter:area:27:SPRIT8.DAX:0:1:0", 24, 65],
      [48, 32, "encounter:area:27:SPRIT8.DAX:0:0:0", 40, 80],
    ],
    portrait: "portrait:area:27:PIC8.DAX:0:0:0", prompt: /YOUAREATTACKEDBYAGROUPOFMADKOBOLDS/i,
  }],
  ["tyrmor-prison-human-fighters-north-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 6 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down"],
    approachStops: { 22: [48, 32, "encounter:area:22:ecl:a2c3:SPRIT7.DAX:15:0:0", 40, 73] },
    portrait: "portrait:area:22:ecl:a2c3:HEAD7.DAX:57:BODY7.DAX:6", prompt: /THEYSMILEATYOU/i,
  }],
  ["tyrmor-prison-human-fighters-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 12 }, () => ["up", "down"]).flat(), "up", "enter", "down"],
    approachStops: { 27: [48, 32, "encounter:area:22:ecl:a2c3:SPRIT7.DAX:15:0:0", 40, 73] },
    portrait: "portrait:area:22:ecl:a2c3:HEAD7.DAX:54:BODY7.DAX:6", prompt: /THEYSMILEATYOU/i,
  }],
  ["tyrmor-prison-thieves-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 9 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down"],
    approachSequence: [[40, 32, "encounter:area:22:ecl:a2c3:SPRIT7.DAX:11:0:0", 48, 80]],
    portrait: "portrait:area:22:ecl:a2c3:HEAD7.DAX:6:BODY7.DAX:8", prompt: /THEYSMILEATYOU/i,
  }],
  ["tyrmor-prison-dwarves-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 5 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down"],
    approachStops: { 19: [48, 32, "encounter:area:22:ecl:a2c3:SPRIT7.DAX:13:0:0", 40, 73] },
    portrait: "portrait:area:22:ecl:a2c3:HEAD7.DAX:13:BODY7.DAX:6", prompt: /THEYSMILEATYOU/i,
  }],
  ["tyrmor-prison-elf-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 11 }, () => ["up", "down"]).flat(), "up", "enter", "down"],
    approachSequence: [[48, 32, "encounter:area:22:ecl:a2c3:SPRIT7.DAX:24:0:0", 32, 73]],
    portrait: "portrait:area:22:ecl:a2c3:HEAD7.DAX:11:BODY7.DAX:2", prompt: /THEYSMILEATYOU/i,
  }],
  ["tyrmor-prison-stirge-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 9 }, () => ["up", "down"]).flat(), "up", "enter", "down"],
    approachStops: { 21: [48, 32, "encounter:area:22:ecl:a32f:SPRIT7.DAX:61:0:0", 40, 73] },
    portrait: "portrait:area:22:ecl:a32f:PIC7.DAX:61:0:0", prompt: /THEYFLYTOWARDYOU/i,
  }],
  ["tyrmor-prison-minotaur-dialogue", {
    slot: "B", inputs: ["s", "up", "down", "up", "down", "up", "down", "up", "enter", "down", "up"],
    approachStops: { 10: [40, 32, "encounter:area:22:ecl:a2f9:SPRIT7.DAX:62:0:0", 56, 80] },
    portrait: "portrait:area:22:ecl:a2f9:PIC7.DAX:62:0:0", prompt: /ONELICKSITSLIPS/i,
  }],
  ["tyrmor-prison-drider-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 26 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up"],
    approachStops: { 83: [40, 32, "encounter:area:22:ecl:a2f9:SPRIT7.DAX:69:0:0", 56, 80] },
    portrait: "portrait:area:22:ecl:a2f9:PIC7.DAX:69:0:0", prompt: /ONELICKSITSLIPS/i,
  }],
  ["tyrmor-prison-displacer-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 27 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up"],
    approachStops: { 86: [40, 32, "encounter:area:22:ecl:a2f9:SPRIT7.DAX:68:0:0", 64, 80] },
    portrait: "portrait:area:22:ecl:a2f9:PIC7.DAX:68:0:0", prompt: /ONELICKSITSLIPS/i,
  }],
  ["tyrmor-prison-kobolds-dialogue", {
    slot: "B", inputs: ["s", ...Array.from({ length: 4 }, () => ["up", "down"]).flat(),
      "up", "enter", "down", "up"],
    approachStops: { 12: [48, 32, "encounter:area:22:ecl:a2f9:SPRIT7.DAX:0:0:0", 40, 80] },
    portrait: "portrait:area:22:ecl:a2f9:PIC7.DAX:0:0:0", prompt: /ONELICKSITSLIPS/i,
  }],
  ["tyrmor-prison-lizardfolk-dialogue", {
    slot: "B",
    inputs: ["s", ...Array.from({ length: 8 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up"],
    approachStops: { 29: [48, 32, "encounter:area:22:ecl:a2f9:SPRIT7.DAX:57:0:0", 48, 80] },
    portrait: "portrait:area:22:ecl:a2f9:PIC7.DAX:57:0:0", prompt: /ONELICKSITSLIPS/i,
  }],
  ["tyrmor-prison-priest", {
    slot: "B", inputs: ["up", "enter", "a", "a"],
    approachStops: {
      2: [56, 32, "encounter:area:22:ecl:9d3b:SPRIT7.DAX:12:1:0", 24, 65],
      3: [56, 32, "encounter:area:22:ecl:9d3b:SPRIT7.DAX:12:0:0", 24, 80],
    },
    portrait: "portrait:area:22:ecl:9d3b:HEAD7.DAX:16:BODY7.DAX:30", prompt: /RAISESHISHANDINBENEDICTION/i,
  }],
  ["old-phlan-mutant-hut", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachStops: { 2: [48, 32, "encounter:area:26:ecl:a8a0:SPRIT7.DAX:57:0:0", 48, 80] },
    portrait: "portrait:area:26:ecl:a91c:PIC7.DAX:57:0:0", prompt: /TWOHORRIBLYMUTATEDLIZARDMEN/i,
  }],
  ["old-phlan-large-lizardfolk", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachStops: { 2: [48, 32, "encounter:area:26:ecl:a9a9:SPRIT7.DAX:57:0:0", 48, 80] },
    approachTerrainArea: 26,
    portrait: "portrait:area:26:ecl:aa06:PIC7.DAX:57:0:0", prompt: /INTHISROOMTHEREAREFOURLARGELIZARDMEN/i,
  }],
  ["old-phlan-hut-lizardfolk", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:26:ecl:a944:SPRIT7.DAX:57:0:0", 48, 80]],
    portrait: "portrait:area:26:ecl:a981:PIC7.DAX:57:0:0", prompt: /INSIDETHISHUTAREFOURLIZARDMEN/i,
  }],
  ["pyramid-lizardfolk-patrol", {
    slot: "A", inputs: ["up", "enter", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:23:ecl:9f04:SPRIT7.DAX:57:0:0", 48, 80]],
    portrait: "portrait:area:23:ecl:9f04:PIC7.DAX:57:0:0", prompt: /THEYAREWARY,BUTNOTHOSTILE/i,
  }],
  ["valhingen-skeleton-enclave", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [
      [56, 32, "encounter:area:10:SPRIT4.DAX:34:1:0", 24, 65],
      [48, 32, "encounter:area:10:SPRIT4.DAX:34:0:0", 40, 80],
    ],
    portrait: "portrait:area:10:PIC4.DAX:34:0:0", prompt: /THEENCLAVEISGUARDEDBYASKELETONARMY/i,
  }],
  ["sokal-ceiling-insects", {
    slot: "C", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:21:PIC4.DAX:18:0:0", prompt: /THEINTERIORISOVERRUNWITHINSECTS/i,
  }],
  ["valjevo-medusa-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter", "enter"],
    portrait: "portrait:area:7:PIC5.DAX:49:0:0", prompt: /AMEDUSACOMESRUNNINGTOWARDYOU/i,
  }],
  ["podal-pitt-drunken-buccaneer", {
    slot: "I", inputs: ["up", "enter", "enter"],
    portrait: "portrait:HEAD1.DAX:6:BODY1.DAX:3", prompt: /ONEOFYOUSHALLPAYFORTHISINSULT/i,
  }],
  ["podal-pitt-duel-aftermath", {
    slot: "I", inputs: ["up", "enter", "enter", "enter", "c", "s", "enter", "enter",
      "m", "up", "m", "up", "n", "enter", "enter", "e", "n"],
    portrait: "scene-illustration:area:18:ecl:b240:caller:aa1e", prompt: /THEBATTLEISOVER,THEPATRONSRETURNTODRINKING/i,
    journalLead: "podal-pitt-fight-ended", journalLeadAtDiscovery: true,
    continuation: { inputs: ["enter", "enter"], prompt: /THECREATURESIGNOREYOUFORTHEMOMENT/i,
      portrait: "portrait:area:18:PIC1.DAX:2:0:0" },
  }],
  ["podal-auction-ogre-escape", {
    slot: "I", inputs: ["up", "enter"],
    portrait: "portrait:PIC1.DAX:16:0:0", prompt: /AUCTION/i,
    continuation: {
      inputs: Array(8).fill("enter"),
      portrait: "portrait:area:18:ecl:a51e:PIC1.DAX:16:0:0",
      prompt: /FOLLOWTHEOGRE.*MOVEQUIETLYAWAY.*LOOKFORTHEMANINPLAINCLOTHES/i,
    },
  }],
  ["slums-grain-sack-ambush", {
    slot: "B", inputs: ["up", "enter", "enter"], requireTiledApproach: false,
    approachSequence: [[48, 32, "encounter:area:20:ecl:b077:SPRIT2.DAX:31:0:0", 40, 80]],
    portrait: "portrait:area:20:PIC2.DAX:31:0:0", prompt: /SOMEMONSTERSARETOSSINGASACKOFGRAIN/i,
  }],
  ["valjevo-hill-giant-dialogue", {
    slot: "B", inputs: ["up", "enter"], requireTiledApproach: false,
    approachSequence: [[40, 32, "encounter:area:5:ecl:9dc0:SPRIT5.DAX:55:0:0", 48, 80]],
    portrait: "portrait:PIC5.DAX:55:0:0", prompt: /THEYHOLDTHEIRWEAPONSREADY/i,
  }],
  ["bane-ogre-led-guards", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachStops: { 2: [48, 32, "encounter:area:31:ecl:9f1e:SPRIT1.DAX:8:0:0", 40, 73] },
    portrait: "portrait:area:31:ecl:9f6d:PIC1.DAX:8:0:0", prompt: /SIXORCSLEDBYALARGEOGRE/i,
    continuation: { inputs: ["enter"], prompt: /ABATTLEBEGINS/i, portrait: "portrait:area:31:ecl:9f7b:PIC1.DAX:8:0:0" },
  }],
  ["stojanow-tower-charge", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:9:ecl:a577:SPRIT2.DAX:24:0:0", 32, 73]],
    portrait: "portrait:HEAD2.DAX:11:BODY2.DAX:2", prompt: /COMBATWAITFLEEPARLAY/i,
  }],
  ["stojanow-wall-ambush", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:9:ecl:b0f9:SPRIT2.DAX:24:0:0", 32, 73]],
    portrait: "portrait:HEAD2.DAX:11:BODY2.DAX:2", prompt: /THEYRUSHTOWARDYOU/i,
  }],
  ["stojanow-plotting-mage", {
    slot: "A", inputs: ["up", "enter", "enter", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:9:ecl:a270:SPRIT2.DAX:24:0:0", 32, 73]],
    portrait: "portrait:HEAD2.DAX:52:BODY2.DAX:31", prompt: /THEYSEEMUNAWAREOFYOU/i, journalLead: "stojanow-assault-plans",
  }],
  ["stojanow-plotting-fighter", {
    slot: "A", inputs: ["up", "enter", "enter", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:9:ecl:a3a3:SPRIT2.DAX:24:0:0", 32, 73]],
    portrait: "portrait:HEAD2.DAX:11:BODY2.DAX:2", prompt: /THEYSEEMUNAWAREOFYOU/i, journalLead: "stojanow-medusa-trapdoor",
  }],
  ["stojanow-patrol-leader-dialogue", {
    slot: "A", inputs: ["up", "enter", "a", "a"],
    approachSequence: [[48, 32, "encounter:area:9:SPRIT2.DAX:16:0:0", 40, 80]],
    portrait: "portrait:HEAD2.DAX:8:BODY2.DAX:5", prompt: /WHATAREYOUDOINGHERE/i,
  }],
  ["north-gate-weapon-cache-ambush", {
    slot: "A", inputs: ["up", "enter", "t", "enter"],
    approachSequence: [[40, 32, "encounter:area:14:ecl:aa2b:SPRIT3.DAX:11:0:0", 48, 80]],
    portrait: "portrait:HEAD3.DAX:71:BODY3.DAX:8", prompt: /ANAWFULSMELLINGCLOUDOFGASFORMS/i,
  }],
  ["north-gate-jail-thugs", {
    slot: "A", inputs: ["up", "enter"],
    approachSequence: [[40, 32, "encounter:area:14:ecl:b051:SPRIT3.DAX:11:0:0", 48, 80]],
    portrait: "portrait:area:14:HEAD3.DAX:32:BODY3.DAX:8", prompt: /CONVERTEDTOAJAIL/i,
  }],
  ["north-gate-thieves-guild", {
    slot: "A", inputs: ["up", "enter"],
    approachSequence: [[40, 32, "encounter:area:14:ecl:af19:SPRIT3.DAX:11:0:0", 48, 80]],
    portrait: "portrait:area:14:ecl:af5a:HEAD3.DAX:44:BODY3.DAX:8", prompt: /AMBUSHEDBYSOMETHIEVES/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:14:ecl:af62:HEAD3.DAX:44:BODY3.DAX:8",
      prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["new-phlan-jeweler", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:63:BODY3.DAX:34", prompt: /SHOPKEEPEROFFERSJEWELRYFORSALE/i,
  }],
  ["new-phlan-silver-shop", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:0:ecl:ae69:caller:a99e:HEAD3.DAX:63:BODY3.DAX:34", prompt: /THESHOPSELLSSILVERITEMS/i,
    continuation: {
      inputs: ["y"], portrait: "portrait:area:0:ecl:a9cf:HEAD3.DAX:63:BODY3.DAX:34",
      prompt: /BUYVIEWPOOLAPPRAISEEXIT/i,
    },
  }],
  ["new-phlan-temple-guard", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:8:BODY3.DAX:4", prompt: /THEBISHOPISNOTRECEIVINGVISITORS/i,
  }],
  ["new-phlan-cleric-trainer", {
    slot: "I", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:16:BODY3.DAX:4", prompt: /WETRAINONLYCLERICSHERE/i,
    journalLead: "phlan-training-clerics",
  }],
  ["new-phlan-thieves-trainer", {
    slot: "I", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:16:BODY3.DAX:8", prompt: /WETRAINONLYTHIEVESHERE/i,
    journalLead: "phlan-training-thieves",
  }],
  ["valjevo-sentinel-alarm", {
    slot: "B", inputs: ["up", "enter"],
    approachSequence: [[48, 32, "encounter:area:4:ecl:9f13:SPRIT5.DAX:16:0:0", 40, 80]],
    portrait: "portrait:area:4:ecl:9f57:HEAD5.DAX:52:BODY5.DAX:1", prompt: /ANALARMSTARTSRINGING/i,
    continuation: {
      inputs: ["enter"], portrait: "portrait:area:4:ecl:9f58:HEAD5.DAX:52:BODY5.DAX:1", prompt: /ABATTLEBEGINS/i,
    },
  }],
  ["valjevo-forge-patrol", {
    slot: "B", inputs: ["up", "enter", "enter", "a", "a"],
    approachSequence: [
      [56, 32, "encounter:area:6:SPRIT5.DAX:16:2:0", 16, 49],
      [56, 32, "encounter:area:6:SPRIT5.DAX:16:1:0", 24, 65],
      [48, 32, "encounter:area:6:ecl:aa19:SPRIT5.DAX:16:0:0", 40, 80],
    ],
    portrait: "portrait:area:6:HEAD5.DAX:9:BODY5.DAX:1", prompt: /THEYADVANCE,?WEAPONSREADY/i,
  }],
  ["zhentil-quarters-ambush", {
    slot: "A", inputs: ["up", "enter", "s", "enter"],
    approachSequence: [[48, 32, "encounter:area:28:ecl:a534:SPRIT5.DAX:16:0:0", 40, 80]],
    portrait: "portrait:area:28:ecl:a53d:HEAD6.DAX:57:BODY6.DAX:6", prompt: /ABATTLEBEGINS/i,
  }],
  ["zhentil-quarters-guard-dialogue", {
    slot: "A", inputs: ["up", "enter"],
    approachSequence: [[48, 32, "encounter:area:28:ecl:9ec8:SPRIT5.DAX:16:0:0", 40, 80]],
    portrait: "portrait:area:28:HEAD6.DAX:57:BODY6.DAX:6", prompt: /YOUARERESTRICTEDTOYOURQUARTERS/i,
  }],
  ["valjevo-fire-giant-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter", "a", "a"],
    portrait: "portrait:area:4:PIC5.DAX:56:0:0", prompt: /THEGIANTSLOOKUPATYOU/i,
    continuation: { inputs: ["p", "s", "enter"], prompt: /TODAY'SPASSWORDIS/i },
  }],
  ["valhingen-ghoul-ambush", {
    slot: "A", inputs: ["e", "enter", "r", "y", ...Array(10).fill("i"), "r", "enter", "enter"],
    portrait: "portrait:PIC4.DAX:72:0:0", prompt: /APACKOFHUNGRYGHOULSLOPESTOWARDYOU/i,
  }],
  ["valhingen-tower-wight-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:PIC4.DAX:20:0:0", prompt: /WIGHTSAPPEARFROMBEHINDTHETOWER/i,
  }],
  ["valhingen-paladin-wraith-dialogue", {
    slot: "A", inputs: ["up", "b"],
    portrait: "portrait:PIC4.DAX:21:0:0", prompt: /IAMTHEPROTECTOROFTHEPALADIN/i,
    approachSequence: [[56, 32, "encounter:area:10:SPRIT4.DAX:21:0:0", 32, 80]],
  }],
  ["buccaneer-guardroom-dialogue", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:1:HEAD6.DAX:6:BODY6.DAX:3", prompt: /FOURGUARDSINGLEAMINGCHAINMAIL/i,
  }],
  ["buccaneer-pass-seller", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:1:HEAD6.DAX:10:BODY6.DAX:9", prompt: /WANTTOBUYAPASSTOSEETHECAPTAIN/i,
  }],
  ["buccaneer-captain-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    approachSequence: [[48, 32, "encounter:area:1:SPRIT6.DAX:16:0:0", 40, 80]],
    portrait: "portrait:area:1:HEAD6.DAX:9:BODY6.DAX:5", prompt: /CAPTAINLOOKSYOUOVER/i,
  }],
  ["mendor-fighter-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:15:PIC2.DAX:25:0:0", prompt: /YOUFINDAFIGHTERWITHBATTEREDARMOR/i,
    continuation: { inputs: ["i"], portrait: "scene-illustration:area:15:ecl:9aeb", prompt: /HESCRAMBLESTOHISFEETANDFLEESTHEROOM/i },
  }],
  ["mendor-spectre-dialogue", {
    slot: "B", inputs: ["up", "up", "enter"],
    portrait: "portrait:area:15:PIC2.DAX:17:0:0", prompt: /IDEFENDEDTHESEBOOKSINLIFE/i,
  }],
]);
const illustration = illustrationRoutes.get(routeName);
const nomadSentries = routeName === "nomad-camp-sentries";
const forgeAuthorization = routeName === "valjevo-forge-authorization";
const forgeSmith = routeName === "valjevo-forge-smith" || forgeAuthorization;
const castleRecordsDecline = routeName === "valjevo-records-decline";
const castleRecordsRevisit = routeName === "valjevo-records-revisit";
const castleRecords = routeName === "valjevo-records" || castleRecordsDecline || castleRecordsRevisit;
const castleScribe = routeName === "valjevo-records-scribe";
const castleReports = routeName === "valjevo-scriptorium-reports";
const castleReportsReload = routeName === "valjevo-scriptorium-reports-reload";
const genheerisOrders = routeName === "valjevo-genheeris-orders";
const genheeris = routeName === "valjevo-genheeris-bargain" || genheerisOrders;
const norrisSurrender = routeName === "kuto-norris-surrender";
const norrisSurrenderReload = routeName === "kuto-norris-surrender-reload";
const mendorStacks = routeName === "mendor-library-stacks";
const fatimaReload = routeName === "kobold-princess-fatima-reload";
const princessFatima = routeName === "kobold-princess-fatima" || fatimaReload;
const koboldEscort = routeName === "kobold-cave-escort";
const koboldGuide = routeName === "kobold-cave-guide" || koboldEscort;
const restalGuide = routeName === "textile-restal";
const sokalScout = routeName === "sokal-elven-scout" || routeName === "sokal-elven-scout-search";
const combatPoseRoutes = new Map([
  ["new-phlan-tavern-aides-combat", {
    slot: "A", inputs: ["up", "enter", "enter", "n", ...Array(5).fill("enter")],
    stand: "combat:area:0:CPIC3.DAX:15:ecl:a7d3",
    strike: "combat:area:0:CPIC3.DAX:143:ecl:a7d3",
    width: 96, height: 96, standAnchor: [56, 80, true],
    readyPrompt: /AIDESHITPOINTS18AC5/i, standCount: 7, standSelected: true,
    strikeAnchor: [56, 80], strikeReflected: true, strikeReport: /AIDESATTACKSENNAANDMISSES/i,
  }],
  ["valjevo-apartment-armed-guard", {
    slot: "B", inputs: ["up", "up", "c", "s", "enter", "enter"],
    stand: "combat:area:3:CPIC5.DAX:11:ecl:a1e5",
    strike: "combat:area:3:CPIC5.DAX:139:ecl:a1e5",
    width: 96, height: 96, standAnchor: [128, 104, true],
    strikeInputs: Array(7).fill("q"), strikeAnchor: [128, 104], strikeReflected: true,
  }],
  ["valjevo-apartment-hill-giants", {
    slot: "B", inputs: ["up", "up", "enter", "enter", "c", "enter"],
    stand: "combat:area:3:CPIC5.DAX:55:ecl:a44a",
    strike: "combat:area:3:CPIC5.DAX:183:ecl:a44a",
    width: 96, height: 192, standAnchor: [128, 104, true],
    strikeInputs: ["enter", "enter", ...Array(8).fill("q")],
    strikeAnchor: [80, 104], strikeReflected: true,
  }],
  ["slums-roaming-bugbear", {
    slot: "B",
    inputs: [...Array.from({ length: 4 }, () => ["up", "enter", "enter", "down"]).flat(),
      "up", ...Array(6).fill("enter"), "c", "enter", "enter", ...Array(9).fill("q")],
    stand: "combat:area:20:CPIC2.DAX:63:ecl:b216",
    strike: "combat:area:20:CPIC2.DAX:191:ecl:b216",
    width: 96, height: 96, standAnchor: [80, 56, true],
    strikeAnchor: [80, 56], strikeReflected: false,
  }],
  ["valjevo-barracks-hill-giant-combat", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:55:ecl:a839", strike: "combat:area:3:CPIC5.DAX:183:ecl:a839",
    width: 96, height: 192, manualPolling: true, standInAnimation: true, standAnchor: [56, 80, true],
    strikeAnchor: [128, 80], strikeReflected: true, strikeReport: /HILLGIANTATTACKSBAKSHI/i,
    inputs: ["up", "enter", "enter", "enter", "c", "enter", "enter", "enter", ...Array(12).fill("q")],
    strikeInputs: Array(7).fill("q"),
  }],
  ["valjevo-lower-snake-combat", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:60:ecl:b37c", strike: "combat:area:3:CPIC5.DAX:188:ecl:b37c",
    width: 192, height: 96, manualPolling: true, standAnchor: [32, 104, true],
    strikeAnchor: [104, 104], strikeReflected: false, strikeReport: /GIANTSNAKEATTACKSRHIANNON/i,
    inputs: ["up", "enter", "enter", "enter", "c", "enter"], strikeInputs: ["enter", "enter", ...Array(7).fill("q")],
  }],
  ["valjevo-inner-armed-guard-combat", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:11:ecl:a002", strike: "combat:area:3:CPIC5.DAX:139:ecl:a002",
    width: 96, height: 96, manualPolling: true, standAnchor: [80, 104, true],
    strikeAnchor: [80, 104], strikeReflected: false, strikeReport: /6THLVLFIGHTERATTACKSPHINEAS/i,
    inputs: ["up", "enter", "enter", "enter"], strikeInputs: ["enter", "enter", ...Array(7).fill("q")],
  }],
  ["bane-ogre-escort-combat", {
    slot: "A", stand: "combat:area:31:CPIC1.DAX:4:ecl:9f7b", strike: "combat:area:31:CPIC1.DAX:132:ecl:9f7b",
    width: 96, height: 96, manualPolling: true, standAnchor: [56, 56, false],
    strikeAnchor: [56, 56], strikeReflected: true, strikeReport: /ORCATTACKSCORA/i,
    inputs: ["up", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["stojanow-trap-aide-combat", {
    slot: "A", stand: "combat:area:9:CPIC2.DAX:11:ecl:a3e7", strike: "combat:area:9:CPIC2.DAX:139:ecl:a3e7",
    width: 96, height: 96, manualPolling: true, standAnchor: [80, 80, true],
    strikeAnchor: [80, 80], strikeReflected: true, strikeReport: /AIDESHITPOINTS18AC5LONGBOW/i,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(9).fill("q")],
  }],
  ["sokal-ferran-combat", {
    slot: "C", stand: "combat:area:21:CPIC4.DAX:17:ecl:aed4", strike: "combat:area:21:CPIC4.DAX:145:ecl:aed4",
    width: 96, height: 96, manualPolling: true, standAnchor: [80, 104, true],
    strikeAnchor: [80, 104], strikeReflected: false, strikeReport: /FERRANMARTINEZATTACKSALDA/i,
    inputs: ["up", "enter", "c", "enter"], strikeInputs: ["enter", "enter"],
  }],
  ["sokal-armory-scorpion-combat", {
    slot: "C", stand: "combat:area:21:CPIC4.DAX:18:ecl:aed4", strike: "combat:area:21:CPIC4.DAX:146:ecl:aed4",
    width: 192, height: 96, manualPolling: true, standAnchor: [56, 32, false],
    strikeAnchor: [80, 56], strikeReflected: true, strikeReport: /HUGESCORPIONATTACKSALDA/i,
    inputs: ["up", "enter", "enter", "enter", "enter"], strikeInputs: Array(4).fill("q"),
  }],
  ["eastern-marches-kobold-leader-combat", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:1:ecl:9c61", strike: "combat:area:27:CPIC8.DAX:129:ecl:9c61",
    width: 96, height: 96, manualPolling: true, standAnchor: [80, 56, true],
    strikeAnchor: [80, 80], strikeReflected: true, followingStrikeReport: /KOBOLDLEADERATTACKSCORAANDMISSES/i,
    inputs: ["right", "enter", "enter", "enter", "q"], strikeInputs: Array(12).fill("q"),
  }],
  ["new-phlan-council-archer-combat", {
    slot: "A", stand: "combat:area:8:CPIC3.DAX:11:ecl:b48a", strike: "combat:area:8:CPIC3.DAX:139:ecl:b48a",
    width: 96, height: 96, manualPolling: true, standAnchor: [80, 80, true],
    strikeAnchor: [80, 80], strikeReflected: false,
    followingStrikeReport: /AIDESATTACKSXHITTINGFOR3POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "n", "enter", "enter", "enter", ...Array(22).fill("q")],
  }],
  ["old-phlan-guild-ambusher-combat", {
    slot: "A", stand: "combat:area:14:CPIC3.DAX:12:ecl:af62", strike: "combat:area:14:CPIC3.DAX:140:ecl:af62",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /1STLVLTHIEFATTACKSALDAHITTINGFOR7POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "enter"], strikeInputs: ["enter", "enter"],
  }],
  ["old-phlan-sword-thief-combat", {
    slot: "A", stand: "combat:area:14:CPIC3.DAX:12:ecl:9c92", strike: "combat:area:14:CPIC3.DAX:140:ecl:9c92",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: true,
    strikeReport: /ATTACKSBRIN.*MISS/i,
    inputs: ["up", "b", "b", "b", "up", "enter", "enter", "enter", "a", "enter"], strikeInputs: ["enter"],
  }],
  ["party-bow-icon-combat", {
    slot: "B", stand: "combat:party:0:1", strike: "combat:party:0:129",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-axe-icon-combat", {
    slot: "B", stand: "combat:party:0:2", strike: "combat:party:0:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-gold-shield-icon-combat", {
    slot: "B", stand: "combat:party:0:4", strike: "combat:party:0:132",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-plumed-dwarf-axe-icon-combat", {
    slot: "B", stand: "combat:party:6:2", strike: "combat:party:6:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-plumed-dwarf-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:6:16", strike: "combat:party:6:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-parted-dwarf-axe-icon-combat", {
    slot: "B", stand: "combat:party:1:2", strike: "combat:party:1:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-parted-dwarf-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:1:16", strike: "combat:party:1:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-helmet-dwarf-axe-icon-combat", {
    slot: "B", stand: "combat:party:2:2", strike: "combat:party:2:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-helmet-dwarf-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:2:16", strike: "combat:party:2:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-ponytail-dwarf-axe-icon-combat", {
    slot: "B", stand: "combat:party:3:2", strike: "combat:party:3:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-ponytail-dwarf-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:3:16", strike: "combat:party:3:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ...[["plumed", 6], ["bald", 9]].flatMap(([head, headIndex]) =>
    [["war-pick", 9], ["flanged-mace", 12], ["sabre", 17]].map(([weapon, body]) => [
      `party-${head}-dwarf-${weapon}-icon-combat`, {
        slot: "B", stand: `combat:party:${headIndex}:${body}`, strike: `combat:party:${headIndex}:${body + 128}`,
        width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
        strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
        inputs: ["up", ...Array(3).fill("enter")],
        strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
      },
    ])),
  ...[
    [3, [["gold-shield", 4], ["crook", 6], ["morningstar", 13]]],
    [5, [["bow", 1], ["spiked-club", 8], ["war-hammer", 15]]],
    ...[4, 5, 7, 8, 10].map(head => [head, [["axe", 2], ["crossbow", 16]]]),
  ].flatMap(([head, weapons]) => weapons.map(([weapon, body]) => [
      `party-dwarf-${head}-${weapon}-icon-combat`, {
        manualPolling: true,
        slot: "B", stand: `combat:party:${head}:${body}`, strike: `combat:party:${head}:${body + 128}`,
        width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
        strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
        inputs: ["up", ...Array(3).fill("enter")],
        strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
      },
    ])),
  ["party-bald-dwarf-axe-icon-combat", {
    slot: "B", stand: "combat:party:9:2", strike: "combat:party:9:130",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-bald-dwarf-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:9:16", strike: "combat:party:9:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-plumed-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:6:0", strike: "combat:party:6:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-parted-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:1:0", strike: "combat:party:1:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-helmet-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:2:0", strike: "combat:party:2:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-ponytail-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:3:0", strike: "combat:party:3:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-spiky-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:4:0", strike: "combat:party:4:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-hooded-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:5:0", strike: "combat:party:5:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-cloth-cap-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:7:0", strike: "combat:party:7:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-crested-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:10:0", strike: "combat:party:10:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-braided-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:8:0", strike: "combat:party:8:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-bald-dwarf-icon-combat", {
    slot: "B", stand: "combat:party:9:0", strike: "combat:party:9:128",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-crook-icon-combat", {
    slot: "B", stand: "combat:party:0:6", strike: "combat:party:0:134",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-spiked-club-icon-combat", {
    slot: "B", stand: "combat:party:0:8", strike: "combat:party:0:136",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-war-pick-icon-combat", {
    slot: "B", stand: "combat:party:0:9", strike: "combat:party:0:137",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-bearded-axe-icon-combat", {
    slot: "B", stand: "combat:party:0:10", strike: "combat:party:0:138",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-spear-icon-combat", {
    slot: "B", stand: "combat:party:0:11", strike: "combat:party:0:139",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-flanged-mace-icon-combat", {
    slot: "B", stand: "combat:party:0:12", strike: "combat:party:0:140",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-morningstar-icon-combat", {
    slot: "B", stand: "combat:party:0:13", strike: "combat:party:0:141",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-double-axe-icon-combat", {
    slot: "B", stand: "combat:party:0:14", strike: "combat:party:0:142",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-war-hammer-icon-combat", {
    slot: "B", stand: "combat:party:0:15", strike: "combat:party:0:143",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-sabre-icon-combat", {
    slot: "B", stand: "combat:party:0:17", strike: "combat:party:0:145",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-paired-blades-icon-combat", {
    slot: "B", stand: "combat:party:0:5", strike: "combat:party:0:133",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-greatsword-icon-combat", {
    slot: "B", stand: "combat:party:0:7", strike: "combat:party:0:135",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["party-crossbow-icon-combat", {
    slot: "B", stand: "combat:party:0:16", strike: "combat:party:0:144",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: false,
    strikeReport: /ALDAATTACKS1STLVLTHIEFHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(3).fill("enter")],
    strikeInputs: [...Array(7).fill("enter"), ...Array(14).fill("q")],
  }],
  ["buccaneer-pen-guard-combat", {
    slot: "A", stand: "combat:area:1:CPIC6.DAX:11:ecl:a391", strike: "combat:area:1:CPIC6.DAX:139:ecl:a391",
    width: 96, height: 96, readyPrompt: /HITPOINTS4AC10/i, strikeReflected: true,
    strikeReport: /ATTACKSCORAANDMISSES/i,
    inputs: ["up", "up", "enter", "enter", "a", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["slums-orc-home-defender-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:4:ecl:aa02", strike: "combat:area:20:CPIC2.DAX:132:ecl:aa02",
    width: 96, height: 96, readyPrompt: /THRENDERGRONEHITPOINTS11AC1FLAIL/i, strikeReflected: true,
    strikeReport: /ORCATTACKSTHRENDERGRONEHITTINGFOR8POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(5).fill("enter")],
    strikeInputs: [...Array(4).fill("enter"), ...Array(16).fill("q")],
  }],
  ["slums-orc-home-leader-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:5:ecl:aa02", strike: "combat:area:20:CPIC2.DAX:133:ecl:aa02",
    width: 96, height: 96, readyPrompt: /THRENDERGRONEHITPOINTS11AC1FLAIL/i, strikeReflected: true,
    strikeReport: /ORCLEADERATTACKSTHRENDERGRONEANDMISSES/i,
    inputs: ["up", ...Array(5).fill("enter")],
    strikeInputs: [...Array(4).fill("enter"), ...Array(27).fill("q")],
  }],
  ["tyrmor-prison-priest-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:13:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:141:ecl:a36f",
    width: 96, height: 96, readyPrompt: /ENNAHITPOINTS45AC9/i, strikeReflected: true,
    strikeReport: /2NDLVLCLERICATTACKSBRINHITTINGFOR4POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "a", "a", "c", "enter"], strikeInputs: ["d", "d", "d"],
  }],
  ["old-phlan-jail-thug-combat", {
    slot: "A", stand: "combat:area:14:CPIC3.DAX:12:ecl:b0d0", strike: "combat:area:14:CPIC3.DAX:140:ecl:b0d0",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEFHITPOINTS4AC4LONGSWORD/i, strikeReflected: true,
    strikeReport: /1STLVLTHIEFATTACKSALDAHITTINGFOR8POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["textile-hobgoblin-archer-combat", {
    slot: "B", stand: "combat:area:2:CPIC2.DAX:7:ecl:a900", strike: "combat:area:2:CPIC2.DAX:135:ecl:a900",
    width: 96, height: 96, readyPrompt: /HOBGOBLINLDRHITPOINTS6AC5/i, strikeReflected: false,
    strikeReport: /HOBGOBLINLDRHITPOINTS6AC5LONGBOW/i,
    inputs: ["up", ...Array(9).fill("enter"), ...Array(4).fill("q")],
  }],
  ["textile-poison-frog-combat", {
    slot: "B", stand: "combat:area:2:CPIC4.DAX:37:ecl:9aeb", strike: "combat:area:2:CPIC4.DAX:165:ecl:9aeb",
    width: 96, height: 96, readyPrompt: /POISONOUSFROGHITPOINTS4AC8/i, strikeReflected: true,
    strikeReport: /POISONOUSFROGATTACKSALDAANDMISSES/i,
    inputs: ["s", "up", "up", "down", "up", "down", ...Array(4).fill("enter")],
    strikeInputs: ["enter", "enter", "enter"],
  }],
  ["bane-barrack-guard-combat", {
    slot: "A", stand: "combat:area:31:CPIC1.DAX:4:ecl:a1c8", strike: "combat:area:31:CPIC1.DAX:132:ecl:a1c8",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5AC6/i, strikeReflected: false,
    strikeReport: /ORCATTACKSCORAANDMISSES/i,
    inputs: ["up", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["bane-door-guard-combat", {
    slot: "A", stand: "combat:area:24:CPIC1.DAX:4:ecl:a6bf", strike: "combat:area:24:CPIC1.DAX:132:ecl:a6bf",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5AC6/i, strikeReflected: true,
    strikeReport: /ORCATTACKSALDAHITTINGFOR4POINTSOFDAMAGE/i,
    inputs: ["left", ...Array(5).fill("right"), "up", "enter", "enter", "a", "enter"],
    strikeInputs: ["enter"],
  }],
  ["valhingen-skeleton-retainer-combat", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:34:ecl:9e52", strike: "combat:area:10:CPIC4.DAX:162:ecl:9e52",
    width: 96, height: 96, readyPrompt: /SKELETONHITPOINTS5AC7/i, strikeReflected: false,
    strikeReport: /SKELETONATTACKSCORAANDMISSES/i,
    inputs: ["up", "enter", "y", "enter", "enter", "enter"],
  }],
  ["valhingen-conjurer-skeleton-combat", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:17:ecl:a5f7", strike: "combat:area:10:CPIC4.DAX:145:ecl:a5f7",
    width: 96, height: 96, readyPrompt: /SPECTREHITPOINTS38AC2/i, strikeReflected: false,
    strikeReport: /SPECTREATTACKSBRINHITTINGFOR3POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["valhingen-conjurer-zombie-combat", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:17:ecl:a7f5", strike: "combat:area:10:CPIC4.DAX:145:ecl:a7f5",
    width: 96, height: 96, readyPrompt: /SPECTREHITPOINTS38AC2/i, strikeReflected: true,
    strikeReport: /SPECTREATTACKSALDAANDMISSES/i,
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "enter", ...Array(11).fill("q")],
  }],
  ["valhingen-conjurer-wight-combat", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:17:ecl:ab12", strike: "combat:area:10:CPIC4.DAX:145:ecl:ab12",
    width: 96, height: 96, readyPrompt: /SPECTREHITPOINTS38AC2/i, strikeReflected: true,
    strikeReport: /SPECTREATTACKSALDAHITTINGFOR7POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "enter", ...Array(8).fill("q")],
  }],
  ["old-phlan-kobold-scout-leader-combat", {
    slot: "B", stand: "combat:area:29:CPIC8.DAX:1:ecl:a75e", strike: "combat:area:29:CPIC8.DAX:129:ecl:a75e",
    width: 96, height: 96, readyPrompt: /KOBOLDLEADERHITPOINTS4AC6/i, strikeReflected: false,
    strikeReport: /KOBOLDLEADERHITPOINTS4AC7SHORTBOW/i,
    inputs: [...Array.from({ length: 3 }, () => ["up", "enter", "down", "up", "down"]).flat(),
      "up", "enter", "down", "enter", "c", "enter"],
    strikeInputs: ["enter"],
  }],
  ["old-phlan-kobold-scout-combat", {
    slot: "B", stand: "combat:area:29:CPIC8.DAX:0:ecl:a75e", strike: "combat:area:29:CPIC8.DAX:128:ecl:a75e",
    width: 96, height: 96, readyPrompt: /KOBOLDLEADERHITPOINTS4AC6/i, strikeReflected: false,
    strikeReport: /KOBOLDATTACKSALDAHITTINGFOR1POINTOFDAMAGE/i,
    inputs: [...Array.from({ length: 3 }, () => ["up", "enter", "down", "up", "down"]).flat(),
      "up", "enter", "down", "enter", "c", "enter"],
    strikeInputs: [...Array(4).fill("enter"), ...Array(10).fill("q")],
  }],
  ["old-phlan-lizard-patrol-beast-combat", {
    slot: "B", stand: "combat:area:29:CPIC8.DAX:59:ecl:aa7a", strike: "combat:area:29:CPIC8.DAX:187:ecl:aa7a",
    width: 192, height: 96, readyPrompt: /GIANTLIZARDHITPOINTS16AC5/i,
    strikeReport: /GIANTLIZARDATTACKSBRINANDMISSES/i,
    inputs: ["up", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["old-phlan-lizard-patrol-leader-combat", {
    slot: "B", stand: "combat:area:29:CPIC8.DAX:57:ecl:aa7a", strike: "combat:area:29:CPIC8.DAX:185:ecl:aa7a",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11AC4/i,
    strikeReport: /LIZARDMANATTACKSBRINHITTINGFOR2POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(7).fill("enter"), ...Array(6).fill("q")],
  }],
  ["swamp-ruin-defender-combat", {
    slot: "A", stand: "combat:area:16:CPIC8.DAX:57:ecl:a6ce", strike: "combat:area:16:CPIC8.DAX:185:ecl:a6ce",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11AC4/i, strikeReflected: true,
    strikeReport: /LIZARDMANATTACKSBRINHITTINGFOR4POINTSOFDAMAGE/i,
    inputs: ["up", "up", "enter", "enter", "enter", "c", "enter", "enter", "enter", ...Array(4).fill("q")],
  }],
  ["kobold-cave-siege-boar-combat", {
    slot: "A", stand: "combat:area:13:CPIC8.DAX:120:ecl:a1d4", strike: "combat:area:13:CPIC8.DAX:248:ecl:a1d4",
    width: 192, height: 96, readyPrompt: /WILDBOARHITPOINTS18AC7/i, strikeReflected: true,
    strikeReport: /WILDBOARATTACKSBRINHITTINGFOR9POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(6).fill("enter")],
    strikeInputs: [...Array(6).fill("enter"), ...Array(17).fill("q")],
  }],
  ["kobold-cave-first-horde-combat", {
    slot: "A", stand: "combat:area:13:CPIC2.DAX:0:ecl:a14b", strike: "combat:area:13:CPIC2.DAX:128:ecl:a14b",
    width: 96, height: 96, readyPrompt: /KOBOLDHITPOINTS3AC7/i, strikeReflected: false,
    strikeReport: /KOBOLDATTACKSBRINHITTINGFOR3POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(5).fill("enter")],
    strikeInputs: ["enter", "enter", ...Array(5).fill("q")],
  }],
  ["yarash-pump-prisoner-combat", {
    slot: "A", stand: "combat:area:23:CPIC7.DAX:57:ecl:ab35", strike: "combat:area:23:CPIC7.DAX:185:ecl:ab35",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11AC4/i, strikeReflected: true,
    strikeReport: /LIZARDMANATTACKSBRINHITTINGFOR6POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "enter", "a", "a", "c", "enter", "enter", "enter", "q", "q"],
  }],
  ["valjevo-bucket-giants-combat", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:56:ecl:a74e", strike: "combat:area:3:CPIC5.DAX:184:ecl:a74e",
    width: 96, height: 192, readyPrompt: /FIREGIANTHITPOINTS59AC3/i,
    strikeReport: /FIREGIANTATTACKSRHIANNONHITTINGFOR18POINTSOFDAMAGE/i,
    inputs: ["up", ...Array(4).fill("enter"), "c", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["valjevo-al-hyam-combat", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:14:ecl:a3a8", strike: "combat:area:5:CPIC5.DAX:14:ecl:a3a8",
    width: 96, height: 96, readyPrompt: /AL-HYAMDAZIDHITPOINTS16AC3/i,
    strikeReport: /AL-HYAMDAZIDUSESANITEMITEM:WAND/i,
    inputs: ["up", "a", "a", "p", "a", "a", "enter", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["tyrmor-prison-kobold-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:0:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:128:ecl:a36f",
    width: 96, height: 96, readyPrompt: /BRINHITPOINTS45AC3HANDAXE/i, strikeReflected: true,
    inputs: ["s", ...Array.from({ length: 4 }, () => ["up", "down"]).flat(),
      "up", "enter", "down", "up", "c", "enter", "d"],
    strikeInputs: ["d", "g", "d", "d", "d", "g", "d", "g", "d", "d", "d", "d", "d", "g", "d"],
  }],
  ["tyrmor-prison-elf-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:14:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:142:ecl:a36f",
    width: 96, height: 96, readyPrompt: /DIANEHITPOINTS20AC9/i, strikeReflected: true,
    inputs: ["s", ...Array.from({ length: 11 }, () => ["up", "down"]).flat(),
      "up", "enter", "down", "c", "enter", "q"],
    strikeInputs: Array(14).fill("q"),
  }],
  ["tyrmor-prison-stirge-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:61:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:189:ecl:a36f",
    width: 96, height: 96, readyPrompt: /STIRGEHITPOINTS5AC8/i, strikeReflected: false,
    inputs: ["s", ...Array.from({ length: 9 }, () => ["up", "down"]).flat(),
      "up", "enter", "down", "c", "enter", "enter", ...Array(6).fill("q")],
    strikeInputs: ["q", "q"],
  }],
  ["tyrmor-prison-minotaur-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:62:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:190:ecl:a36f",
    width: 96, height: 192, readyPrompt: /MINOTAURHITPOINTS33AC6/i, strikeReflected: true,
    inputs: ["s", "up", "down", "up", "down", "up", "down", "up", "enter", "down", "up", "c", "enter"],
  }],
  ["tyrmor-prison-displacer-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:68:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:196:ecl:a36f",
    width: 192, height: 96, readyPrompt: /DISPLACERBEASTHITPOINTS30AC2/i, strikeReflected: false,
    inputs: ["s", ...Array.from({ length: 27 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up", "c", "enter"],
  }],
  ["tyrmor-prison-drider-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:69:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:197:ecl:a36f",
    width: 192, height: 96, readyPrompt: /DRIDERHITPOINTS35AC2/i, strikeReflected: true,
    inputs: ["s", ...Array.from({ length: 26 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up", "c", "enter", ...Array(5).fill("q")],
    strikeInputs: Array(6).fill("q"),
  }],
  ["tyrmor-prison-thief-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:12:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:140:ecl:a36f",
    width: 96, height: 96, readyPrompt: /7THLVLTHIEFHITPOINTS28AC4/i, strikeReflected: true,
    inputs: ["s", ...Array.from({ length: 9 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "c", "enter"],
    strikeInputs: Array(4).fill("q"),
  }],
  ["tyrmor-prison-fighter-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:11:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:139:ecl:a36f",
    width: 96, height: 96, readyPrompt: /7THLVLDWFIGH/i, strikeReflected: false,
    inputs: ["s", ...Array.from({ length: 5 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "c", "enter", ...Array(6).fill("q")],
  }],
  ["tyrmor-prison-lizard-combat", {
    slot: "B", stand: "combat:area:22:CPIC7.DAX:57:ecl:a36f", strike: "combat:area:22:CPIC7.DAX:185:ecl:a36f",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11/i, strikeReflected: true,
    inputs: ["s", ...Array.from({ length: 8 }, () => ["up", "enter", "down"]).flat(),
      "up", "enter", "enter", "down", "up", "c", "enter", "q"],
  }],
  ["slums-orc-guard", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:4:ecl:ab91", strike: "combat:area:20:CPIC2.DAX:132:ecl:ab91",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5/i, strikeReflected: false,
    inputs: ["up", ...Array(9).fill("enter"), ...Array(13).fill("q")],
  }],
  ["slums-mage-orc-leader", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:5:ecl:a0b4", strike: "combat:area:20:CPIC2.DAX:133:ecl:a0b4",
    width: 96, height: 96, readyPrompt: /ORCLEADERHITPOINTS8AC5/i, strikeReflected: false,
    inputs: ["up", "b", "up", "enter", "enter", "a", ...Array(4).fill("enter"), "d", "g", ...Array(9).fill("q")],
  }],
  ["slums-mage-orc-ready", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:4:ecl:a0b4",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5AC6/i, strikeInputs: [],
    inputs: ["up", "b", "up", "enter", "enter", "a", ...Array(4).fill("enter"), ...Array(15).fill("q")],
  }],
  ["slums-mage-hobgoblin", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:6:ecl:a0b4", strike: "combat:area:20:CPIC2.DAX:134:ecl:a0b4",
    width: 96, height: 96, readyPrompt: /HOBGOBLINHITPOINTS6/i, strikeReflected: false,
    inputs: ["up", "b", "up", "enter", "enter", "a", ...Array(4).fill("enter"), ...Array(4).fill("q")],
    strikeInputs: ["q", "q"],
  }],
  ["slums-paper-orc", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:4:ecl:9e6d", strike: "combat:area:20:CPIC2.DAX:132:ecl:9e6d",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5/i, strikeReflected: true,
    inputs: ["up", ...Array(7).fill("enter")], strikeInputs: ["enter"],
  }],
  ["valhingen-enclave-skeleton", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:34:ecl:b5c7", strike: "combat:area:10:CPIC4.DAX:162:ecl:b5c7",
    width: 96, height: 96, readyPrompt: /SKELETONHITPOINTS5/i, strikeReflected: true,
    inputs: ["up", ...Array(9).fill("enter"), ...Array(5).fill("q")],
  }],
  ["valhingen-stair-zombie", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:35:ecl:b5c7", strike: "combat:area:10:CPIC4.DAX:163:ecl:b5c7",
    width: 96, height: 96, readyPrompt: /ZOMBIEHITPOINTS10/i, strikeReflected: false,
    inputs: ["up", ...Array(9).fill("enter"), ...Array(10).fill("q")],
  }],
  ["valhingen-juju-zombie", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:35:ecl:a022", strike: "combat:area:10:CPIC4.DAX:163:ecl:a022",
    width: 96, height: 96, readyPrompt: /JUJUZOMBIEHITPOINTS24/i, strikeReflected: true,
    inputs: ["up", ...Array(9).fill("enter"), ...Array(6).fill("q")],
  }],
  ["sokal-orc-line", {
    slot: "C", stand: "combat:area:21:CPIC4.DAX:4:ecl:aed4", strike: "combat:area:21:CPIC4.DAX:132:ecl:aed4",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5/i, strikeReflected: true,
    inputs: ["up", ...Array(9).fill("enter")], strikeInputs: Array(49).fill("q"),
  }],
  ["sokal-hobgoblin-line", {
    slot: "C", stand: "combat:area:21:CPIC4.DAX:6:ecl:aed4", strike: "combat:area:21:CPIC4.DAX:134:ecl:aed4",
    width: 96, height: 96, readyPrompt: /HOBGOBLINHITPOINTS6/i, strikeReflected: true,
    inputs: ["up", ...Array(5).fill("enter")], strikeInputs: Array(4).fill("enter"),
  }],
  ["textile-hobgoblin-line", {
    slot: "B", stand: "combat:area:2:CPIC2.DAX:6:ecl:a900", strike: "combat:area:2:CPIC2.DAX:134:ecl:a900",
    width: 96, height: 96, readyPrompt: /HOBGOBLINHITPOINTS6/i, strikeReflected: true,
    inputs: ["up", ...Array(5).fill("enter")],
    strikeInputs: [...Array(4).fill("enter"), ...Array(9).fill("q")],
  }],
  ["podal-recruit-leader", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:5:ecl:b16f",
    width: 96, height: 96, readyPrompt: /ORCLEADERHITPOINTS8/i,
    inputs: ["up", ...Array(6).fill("enter"), ...Array(20).fill("q")], strikeInputs: [],
  }],
  ["valjevo-forge-fire-giant", {
    slot: "B", stand: "combat:area:6:CPIC5.DAX:56:ecl:a2b8", strike: "combat:area:6:CPIC5.DAX:184:ecl:a2b8",
    width: 96, height: 192, readyPrompt: /FIREGIANTHITPOINTS54/i, strikeReflected: true,
    inputs: ["up", "enter", "enter", "c", ...Array(5).fill("enter"), ...Array(18).fill("q")],
  }],
  ["valjevo-forge-smith-combat", {
    slot: "B", stand: "combat:area:6:CPIC5.DAX:11:ecl:a2b8", strike: "combat:area:6:CPIC5.DAX:139:ecl:a2b8",
    width: 96, height: 96, readyPrompt: /4THLVLFIGHTERHITPOINTS30/i, strikeReflected: true,
    inputs: ["up", "enter", "enter", "c", ...Array(5).fill("enter"), ...Array(19).fill("q")],
  }],
  ["valjevo-outer-patrol-captain", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:11:ecl:9e98", strike: "combat:area:3:CPIC5.DAX:139:ecl:9e98",
    width: 96, height: 96, readyPrompt: /6THLVLFIGHTERHITPOINTS45/i, strikeReflected: true,
    inputs: ["s", "enter", "up", "enter", "enter", "up", "enter", "enter", "c", "enter", "enter", ...Array(6).fill("q")],
    strikeInputs: ["q", "q"],
  }],
  ["valjevo-outer-patrol-giant", {
    slot: "B", stand: "combat:area:3:CPIC5.DAX:55:ecl:9e98", strike: "combat:area:3:CPIC5.DAX:183:ecl:9e98",
    width: 96, height: 192, strikeReflected: true,
    inputs: ["s", "enter", "up", "enter", "enter", "up", "enter", "enter", "c", "enter", "enter", ...Array(15).fill("q")],
  }],
  ["false-throne-impersonator-combat", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:11:ecl:abe2", strike: "combat:area:5:CPIC5.DAX:139:ecl:abe2",
    width: 96, height: 96, readyPrompt: /TYRANITHRAXUSHITPOINTS40/i, strikeReflected: true,
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["false-throne-thief-combat", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:12:ecl:abe2", strike: "combat:area:5:CPIC5.DAX:140:ecl:abe2",
    width: 96, height: 96, readyPrompt: /6THLVLTHIEFHITPOINTS28/i, strikeReflected: false,
    inputs: ["up", "enter", "enter", "c", ...Array(5).fill("enter"), "q", "q", "q"],
  }],
  ["valjevo-outer-sentinel", {
    slot: "B", stand: "combat:area:4:CPIC5.DAX:11:ecl:9f58", strike: "combat:area:4:CPIC5.DAX:139:ecl:9f58",
    width: 96, height: 96, readyPrompt: /6THLVLFIGHTERHITPOINTS41/i, strikeReflected: true,
    inputs: ["up", ...Array(10).fill("enter"), ...Array(11).fill("q")],
  }],
  ["mendor-storeroom-kobold", {
    slot: "B", stand: "combat:area:15:CPIC2.DAX:0:ecl:ae94", strike: "combat:area:15:CPIC2.DAX:128:ecl:ae94",
    width: 96, height: 96, readyPrompt: /KOBOLDHITPOINTS3/i, strikeReflected: false,
    inputs: ["up", ...Array(4).fill("enter"), "c", "enter"], strikeInputs: ["enter"],
  }],
  ["stojanow-tower-aide-combat", {
    slot: "A", stand: "combat:area:9:CPIC2.DAX:11:ecl:a2b4", strike: "combat:area:9:CPIC2.DAX:139:ecl:a2b4",
    width: 96, height: 96, readyPrompt: /AIDESHITPOINTS18/i, strikeReflected: false,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(6).fill("q")],
  }],
  ["podal-recruit-orc", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:4:ecl:b16f", strike: "combat:area:18:CPIC1.DAX:132:ecl:b16f",
    width: 96, height: 96, readyPrompt: /ORCHITPOINTS5/i, strikeReflected: false,
    inputs: ["up", ...Array(6).fill("enter")],
  }],
  ["podal-recruit-ogre", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:8:ecl:b16f", strike: "combat:area:18:CPIC1.DAX:136:ecl:b16f",
    width: 96, height: 192, readyPrompt: /OGREHITPOINTS21/i, strikeReflected: false,
    inputs: ["up", ...Array(6).fill("enter"), ...Array(3).fill("q")], strikeInputs: Array(5).fill("q"),
  }],
  ["podal-pitt-duelist", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:16:ecl:a9df", strike: "combat:area:18:CPIC1.DAX:144:ecl:a9df",
    width: 96, height: 96, readyPrompt: /4THLVLFIGHTERHITPOINTS30/i, strikeReflected: true,
    inputs: ["up", "enter", "enter", "enter", "c", "s", "enter"], strikeInputs: ["enter"],
  }],
  ["podal-pitt-hobgoblin-combat", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:6:ecl:aab5", strike: "combat:area:18:CPIC1.DAX:134:ecl:aab5",
    width: 96, height: 96, manualPolling: true, standAnchor: [56, 56, false],
    strikeAnchor: [56, 56], strikeReflected: true, strikeReport: /HOBGOBLINATTACKSALDAANDMISSES/i,
    inputs: ["up", "enter", "enter", "enter", "a", "enter", "enter", "enter"],
    strikeInputs: ["enter", "enter", ...Array(15).fill("q")],
  }],
  ["podal-robed-orc-combat", {
    slot: "I", stand: "combat:area:18:CPIC1.DAX:5:ecl:b1a1", strike: "combat:area:18:CPIC1.DAX:133:ecl:b1a1",
    width: 96, height: 96, readyPrompt: /ORCLEADERHITPOINTS2/i, strikeReflected: false,
    inputs: ["up", "enter", "enter", "a", ...Array(6).fill("enter"), ...Array(3).fill("q")],
  }],
  ["new-phlan-watch-mage", {
    slot: "A", stand: "combat:area:11:CPIC3.DAX:14:ecl:a07a",
    width: 96, height: 96, readyPrompt: /LEVEL3MUHITPOINTS9/i,
    inputs: [...arenaWatchBattle, ...Array(17).fill("q")], strikeInputs: [],
  }],
  ["new-phlan-harbor-watch-mage", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:14:ecl:ae09",
    width: 96, height: 96, readyPrompt: /LEVEL3MUHITPOINTS9/i,
    inputs: [...harborWatchBattle, ...Array(17).fill("q")], strikeInputs: [],
  }],
  ["new-phlan-harbor-watch-fighter", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:16:ecl:ae09", strike: "combat:area:0:CPIC3.DAX:144:ecl:ae09",
    width: 96, height: 96, strikeReflected: false,
    inputs: harborWatchBattle,
  }],
  ["new-phlan-harbor-watch-aide", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:11:ecl:ae09", strike: "combat:area:0:CPIC3.DAX:139:ecl:ae09",
    width: 96, height: 96, strikeReflected: false,
    inputs: [...harborWatchBattle, ...Array(18).fill("q")],
  }],
  ["new-phlan-harbor-watch-auxiliary", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:15:ecl:ae09", strike: "combat:area:0:CPIC3.DAX:143:ecl:ae09",
    width: 96, height: 96, strikeReflected: false,
    inputs: [...harborWatchBattle, "q"],
  }],
  ["new-phlan-watch-fighter", {
    slot: "A", stand: "combat:area:11:CPIC3.DAX:11:ecl:a07a", strike: "combat:area:11:CPIC3.DAX:139:ecl:a07a",
    width: 96, height: 96, strikeReflected: true,
    inputs: [...arenaWatchBattle, ...Array(1).fill("q")],
  }],
  ["new-phlan-watch-aide", {
    slot: "A", stand: "combat:area:11:CPIC3.DAX:16:ecl:a07a", strike: "combat:area:11:CPIC3.DAX:144:ecl:a07a",
    width: 96, height: 96, strikeReflected: true,
    inputs: [...arenaWatchBattle, ...Array(2).fill("q")],
  }],
  ["new-phlan-watch-auxiliary", {
    slot: "A", stand: "combat:area:11:CPIC3.DAX:15:ecl:a07a", strike: "combat:area:11:CPIC3.DAX:143:ecl:a07a",
    width: 96, height: 96, strikeReflected: true,
    inputs: [...arenaWatchBattle, ...Array(6).fill("q")],
  }],
  ["valjevo-tower-fire-giant", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:56:ecl:a83f", strike: "combat:area:5:CPIC5.DAX:184:ecl:a83f",
    width: 96, height: 192, readyPrompt: /FIREGIANTHITPOINTS57/i, strikeReflected: false,
    inputs: ["up", "l", ...Array(3).fill("enter"), "a", ...Array(10).fill("enter"), ...Array(5).fill("q")],
    strikeInputs: ["q"],
  }],
  ["new-phlan-arena-rolf", {
    slot: "A", stand: "combat:area:11:CPIC3.DAX:11", strike: "combat:area:11:CPIC3.DAX:139",
    width: 96, height: 96, readyPrompt: /ROLFHITPOINTS6/i,
    inputs: [...arenaApproach, "enter", "left", "up", "enter", "enter", "y", "enter", "enter"],
    strikeInputs: ["enter"],
  }],
  ["valhingen-efreeti-combat", {
    slot: "A", stand: "combat:area:10:CPIC4.DAX:70:ecl:b271", strike: "combat:area:10:CPIC4.DAX:198:ecl:b271",
    width: 96, height: 192, readyPrompt: /EFREETIHITPOINTS55/i, strikeReflected: true,
    inputs: ["up", "enter", "y", ...Array(5).fill("enter"), "q"], strikeInputs: ["q"],
  }],
  ["old-phlan-lizardfolk-combat", {
    slot: "A", stand: "combat:area:26:CPIC7.DAX:57:ecl:a982", strike: "combat:area:26:CPIC7.DAX:185:ecl:a982",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11/i, strikeReflected: false,
    inputs: ["up", ...Array(10).fill("enter"), "q"], strikeInputs: ["q"],
  }],
  ["old-phlan-mutant-lizardfolk-combat", {
    slot: "A", stand: "combat:area:26:CPIC7.DAX:57:ecl:a91d", strike: "combat:area:26:CPIC7.DAX:185:ecl:a91d",
    width: 96, height: 96, readyPrompt: /MUTANTLIZ.MANHITPOINTS18/i, strikeReflected: false,
    inputs: ["up", ...Array(10).fill("enter"), "q"], strikeInputs: ["q"],
  }],
  ["slums-mage-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:94:ecl:a0b4",
    width: 96, height: 96, readyPrompt: /LEVEL3MUHITPOINTS9/i,
    excluded: ["combat:area:10:CPIC4.DAX:152"],
    inputs: ["up", "b", "up", "enter", "enter", "a", ...Array(4).fill("enter"), ...Array(181).fill("q")],
    strikeInputs: [],
  }],
  ["slums-kobold-captain-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:1:ecl:a514", strike: "combat:area:20:CPIC2.DAX:129:ecl:a514",
    width: 96, height: 96, readyPrompt: /KOBOLDLEADERHITPOINTS4/i, strikeReflected: true,
    inputs: ["up", ...Array(10).fill("enter"), ...Array(14).fill("q")], strikeInputs: ["q"],
  }],
  ["slums-council-gnoll-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:73:ecl:abf8", strike: "combat:area:20:CPIC2.DAX:201:ecl:abf8",
    width: 96, height: 192, readyPrompt: /GNOLLHITPOINTS5/i, strikeReflected: true,
    inputs: ["up", ...Array(6).fill("enter"), ...Array(4).fill("q")], strikeInputs: ["q"],
  }],
  ["slums-ogre-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:8:ecl:b10d", strike: "combat:area:20:CPIC2.DAX:136:ecl:b10d",
    width: 96, height: 192, readyPrompt: /OGREHITPOINTS21/i, strikeReflected: true,
    inputs: ["up", ...Array(6).fill("enter"), "q"], strikeInputs: ["q"],
  }],
  ["slums-troll-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:31:ecl:b10d", strike: "combat:area:20:CPIC2.DAX:159:ecl:b10d",
    width: 96, height: 192, readyPrompt: /TROLLHITPOINTS36/i, strikeReflected: true,
    inputs: ["up", ...Array(6).fill("enter"), "q", "q", "q"], strikeInputs: ["q", "q"],
  }],
  ["kuto-giant-lizard-combat", {
    slot: "J", stand: "combat:area:29:CPIC8.DAX:59", strike: "combat:area:29:CPIC8.DAX:187",
    width: 192, height: 96, readyPrompt: /GIANTLIZARDHITPOINTS16/i, strikeReflected: false,
    inputs: ["s", "up", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["zhentil-dwarf-combat", {
    slot: "A", stand: "combat:area:28:CPIC6.DAX:15:ecl:a232", strike: "combat:area:28:CPIC6.DAX:143:ecl:a232",
    width: 96, height: 96, readyPrompt: /DWARVENFIGHTERHITPOINTS50/i, strikeReflected: false,
    inputs: ["up", ...Array(10).fill("enter"), ...Array(6).fill("q")], strikeInputs: ["q"],
  }],
  ["kuto-kobold-leader-combat", {
    slot: "J", stand: "combat:area:29:CPIC8.DAX:1", strike: "combat:area:29:CPIC8.DAX:129",
    width: 96, height: 96, readyPrompt: /KOBOLDLEADERHITPOINTS4/i, strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", "f", "enter", "enter", "q", "q", "q"], strikeInputs: ["q"],
  }],
  ["kuto-lizardman-combat", {
    slot: "J", stand: "combat:area:29:CPIC8.DAX:57", strike: "combat:area:29:CPIC8.DAX:185",
    width: 96, height: 96, readyPrompt: /LIZARDMANHITPOINTS11/i, strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", "f", "enter"], strikeInputs: ["enter"],
  }],
  ["wild-cave-troll-combat", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:31", strike: "combat:area:27:CPIC8.DAX:159",
    width: 96, height: 192, readyPrompt: /TROLLHITPOINTS36/i, strikeReflected: false,
    inputs: ["up", ...Array(3).fill("enter"), ...Array(6).fill("q")],
    strikeInputs: Array(16).fill("q"),
  }],
  ["wild-cave-lizard-combat", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:59", strike: "combat:area:27:CPIC8.DAX:187",
    width: 192, height: 96, readyPrompt: /GIANTLIZARDHITPOINTS16/i, strikeReflected: true,
    inputs: ["up", ...Array(5).fill("enter")], strikeInputs: ["enter"],
  }],
  ["wild-cave-wyvern-combat", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:121", strike: "combat:area:27:CPIC8.DAX:249",
    width: 192, height: 192, readyPrompt: /WYVERNHITPOINTS40/i, strikeReflected: true,
    inputs: ["up", ...Array(10).fill("enter"), "q", "q"], strikeInputs: ["q"],
  }],
  ["wild-cave-boar-combat", {
    slot: "A", stand: "combat:area:25:CPIC6.DAX:120", strike: "combat:area:25:CPIC6.DAX:248",
    width: 192, height: 96, readyPrompt: /WILDBOARHITPOINTS18/i, strikeReflected: true,
    inputs: ["up", ...Array(4).fill("enter")], strikeInputs: ["enter", "enter"],
  }],
  ["wild-cave-snake-combat", {
    slot: "A", stand: "combat:area:25:CPIC6.DAX:60", strike: "combat:area:25:CPIC6.DAX:188",
    width: 192, height: 96, readyPrompt: /GIANTSNAKEHITPOINTS21/i,
    inputs: ["up", ...Array(10).fill("enter"), ...Array(7).fill("q")],
  }],
  ["textile-skullcrusher-combat", {
    slot: "B", stand: "combat:area:2:CPIC4.DAX:11:ecl:a466", strike: "combat:area:2:CPIC4.DAX:139:ecl:a466",
    width: 96, height: 96, readyPrompt: /SKULLCRUSHERHITPOINTS32/i,
    inputs: ["up", "b", "up", "enter", "a", ...Array(9).fill("enter")],
    strikeInputs: ["enter"],
  }],
  ["textile-ghoul-combat", {
    slot: "B", stand: "combat:area:2:CPIC4.DAX:72", strike: "combat:area:2:CPIC4.DAX:200",
    readyPrompt: /GHOULHITPOINTS10/i,
    width: 96, height: 96, inputs: ["s", "up", "up", "down", "up", "down", "enter", "enter"],
    strikeInputs: [...Array(8).fill("enter"), ...Array(15).fill("q")],
  }],
  ["textile-wight-combat", {
    slot: "B", stand: "combat:area:2:CPIC4.DAX:20", strike: "combat:area:2:CPIC4.DAX:148",
    readyPrompt: /WIGHTHITPOINTS23/i,
    width: 96, height: 96, inputs: ["s", "up", "up", "down", "up", "down", ...Array(6).fill("enter")],
    strikeInputs: [...Array(4).fill("enter"), ...Array(14).fill("q")],
  }],
  ["bane-orc-leader-combat", {
    slot: "A", stand: "combat:area:31:CPIC1.DAX:5", strike: "combat:area:31:CPIC1.DAX:133",
    width: 96, height: 96, inputs: ["up", ...Array(8).fill("enter"), ...Array(4).fill("q")],
  }],
  ["bane-ogre-combat", {
    slot: "A", stand: "combat:area:31:CPIC1.DAX:8", strike: "combat:area:31:CPIC1.DAX:136",
    width: 96, height: 192, inputs: ["up", ...Array(8).fill("enter"), ...Array(9).fill("q")],
    strikeInputs: Array(54).fill("q"),
  }],
  ["bane-orc-combat", {
    slot: "A", stand: "combat:area:31:CPIC1.DAX:4", strike: "combat:area:31:CPIC1.DAX:132",
    width: 96, height: 96, inputs: ["up", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["kobold-rematch-infantry", {
    slot: "A", stand: "combat:area:13:CPIC2.DAX:0:ecl:a2a4", strike: "combat:area:13:CPIC2.DAX:128:ecl:a2a4",
    width: 96, height: 96,
    inputs: ["up", ...Array(4).fill("enter")],
    strikeInputs: [...Array(3).fill("enter"), ...Array(16).fill("q")],
  }],
  ["kobold-envoy-ready", {
    slot: "A", stand: "combat:area:13:CPIC8.DAX:11:ecl:a2a4",
    excluded: ["combat:area:13:CPIC8.DAX:11:ecl:a856", "combat:area:13:CPIC8.DAX:139:ecl:a856"],
    width: 96, height: 96, strikeInputs: [],
    inputs: ["up", ...Array(7).fill("enter"), ...Array(11).fill("q")],
  }],
  ["kobold-fatima-combat", {
    excluded: ["combat:area:13:CPIC8.DAX:11:ecl:a2a4"],
    slot: "B", stand: "combat:area:13:CPIC8.DAX:11:ecl:a856", strike: "combat:area:13:CPIC8.DAX:139:ecl:a856",
    width: 96, height: 96, strikeReflected: true,
    inputs: ["up", "enter", "enter", "enter", "a", "enter", "enter", "enter", ...Array(3).fill("q")],
  }],
  ["nomad-veteran-ready", {
    slot: "A", stand: "combat:area:17:CPIC7.DAX:13", width: 96, height: 96, strikeInputs: [],
    inputs: ["up", "down", "enter", "enter", "c", ...Array(4).fill("enter"), ...Array(11).fill("q")],
  }],
  ["nomad-shaman-ready", {
    slot: "A", stand: "combat:area:17:CPIC7.DAX:14:ecl:a1a6", width: 96, height: 96,
    readyPrompt: /Hitpoints/i, strikeInputs: [],
    inputs: ["up", "down", "enter", "enter", "c", ...Array(4).fill("enter"), ...Array(4).fill("q")],
  }],
  ["tempus-temple-watch-combat", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:12:ecl:aac7", strike: "combat:area:0:CPIC3.DAX:140:ecl:aac7",
    width: 96, height: 96, readyPrompt: /7THLVLCLERIC/i,
    inputs: ["up", "enter", "enter", ...Array(19).fill("q")],
  }],
  ["tempus-temple-line-fighter-ready", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:11:ecl:aac7", width: 96, height: 96,
    readyPrompt: /4THLVLFIGHTER/i, strikeInputs: [],
    inputs: ["up", "enter", "enter", ...Array(4).fill("q")],
  }],
  ["tempus-temple-captain-ready", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:16:ecl:aac7", strike: "combat:area:0:CPIC3.DAX:144:ecl:aac7",
    width: 96, height: 96,
    readyPrompt: /8THLVLFIGHTER/i, strikeInputs: [],
    inputs: ["up", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["new-phlan-tavern-cutpurse-combat", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:13:ecl:a7d3", strike: "combat:area:0:CPIC3.DAX:141:ecl:a7d3",
    width: 96, height: 96, readyPrompt: /1STLVLTHIEF/i, strikeInputs: ["space"], strikeReflected: true,
    inputs: ["up", "enter", "enter", "n", ...Array(5).fill("enter")],
  }],
  ["new-phlan-tavern-nomad-patron-combat", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:11:ecl:a7d3", strike: "combat:area:0:CPIC3.DAX:139:ecl:a7d3",
    width: 96, height: 96, readyPrompt: /NOMAD.*ShortSword/i, strikeInputs: ["space"], strikeReflected: false,
    inputs: ["up", "enter", "enter", "n", ...Array(5).fill("enter"), ...Array(8).fill("space")],
  }],
  ["new-phlan-tavern-corporal-ready", {
    slot: "A", stand: "combat:area:0:CPIC3.DAX:16:ecl:a7d3", strike: "combat:area:0:CPIC3.DAX:144:ecl:a7d3",
    width: 96, height: 96, readyPrompt: /CORPORAL/i, strikeInputs: ["space"], strikeReflected: false,
    strikeReport: /CORPORALATTACKSENNAHITTINGFOR7POINTSOFDAMAGE/i,
    inputs: ["up", "enter", "enter", "n", ...Array(5).fill("enter"), ...Array(6).fill("space")],
  }],
  ["lizard-wilds-caravan-merchant-combat", {
    slot: "A", stand: "combat:area:26:CPIC7.DAX:14:ecl:a2c7", strike: "combat:area:26:CPIC7.DAX:142:ecl:a2c7",
    width: 96, height: 96, readyPrompt: /MERCHANT.*SHORTSWORD/i, strikeReflected: false,
    inputs: [...Array.from({ length: 16 }, () => ["up", "down"]).flat(), "up", "c", "enter", "enter", ...Array(21).fill("q")],
  }],
  ["zhentil-trespass-patrol-combat", {
    slot: "A", stand: "combat:area:25:CPIC6.DAX:11:ecl:a06b", strike: "combat:area:25:CPIC6.DAX:139:ecl:a06b",
    width: 96, height: 96, readyPrompt: /CORPORAL/i, strikeReflected: true,
    inputs: ["down", "enter", "s", "enter"], strikeInputs: ["enter", ...Array(46).fill("q")],
  }],
  ["nomad-warrior-combat", {
    slot: "A", stand: "combat:area:17:CPIC7.DAX:12", strike: "combat:area:17:CPIC7.DAX:140",
    width: 96, height: 96, strikeReflected: true,
    inputs: [...Array(6).fill("up"), "enter", "c", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["zhentil-guard-combat", {
    slot: "A", stand: "combat:area:28:CPIC6.DAX:11", strike: "combat:area:28:CPIC6.DAX:139",
    width: 96, height: 96, strikeReflected: false,
    inputs: ["up", "enter", "s", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["phlan-ruins-scorpion", {
    slot: "B", stand: "combat:area:2:CPIC4.DAX:18", strike: "combat:area:2:CPIC4.DAX:146",
    width: 192, height: 96, strikeReflected: true,
    inputs: ["s", "up", "up", "down", "up", "down", "enter", "enter"],
    strikeInputs: ["enter", "q"],
  }],
  ["lizard-wilds-stirge", {
    slot: "A", stand: "combat:area:26:CPIC7.DAX:61", strike: "combat:area:26:CPIC7.DAX:189",
    width: 96, height: 96, strikeReflected: true,
    inputs: ["up", "enter", "enter", "enter", "q"],
  }],
  ["lizard-wilds-displacer-beast", {
    slot: "A", stand: "combat:area:26:CPIC7.DAX:68", strike: "combat:area:26:CPIC7.DAX:196",
    width: 192, height: 96, strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", "q"],
  }],
  ["wild-cave-ankheg", {
    slot: "A", stand: "combat:area:25:CPIC6.DAX:65", strike: "combat:area:25:CPIC6.DAX:193",
    width: 192, height: 96, strikeReflected: true,
    inputs: ["up", "enter", "enter", "enter", ...Array(10).fill("q")],
  }],
  ["wild-cave-thri-kreen", {
    slot: "A", stand: "combat:area:25:CPIC6.DAX:118", strike: "combat:area:25:CPIC6.DAX:246",
    width: 96, height: 96, strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", "q"],
  }],
  ["wild-cave-minotaur", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:62", strike: "combat:area:27:CPIC8.DAX:190",
    width: 96, height: 192,
    inputs: ["up", "enter", "enter", "enter", ...Array(8).fill("q")],
  }],
  ["wild-cave-gnoll", {
    slot: "B", stand: "combat:area:27:CPIC8.DAX:73", strike: "combat:area:27:CPIC8.DAX:201",
    width: 96, height: 192, strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", ...Array(8).fill("q")],
  }],
  ["kobold-cave-efreeti", {
    stand: "combat:area:13:CPIC8.DAX:70", strike: "combat:area:13:CPIC8.DAX:198",
    width: 96, height: 192, strikeReflected: false,
    inputs: ["s", "up", "p", "enter", "enter", "enter", "a", "enter", "enter", "enter", ...Array(4).fill("q")],
  }],
  ["kobold-cave-boar", {
    excluded: ["combat:area:13:CPIC8.DAX:11:ecl:a856", "combat:area:13:CPIC8.DAX:139:ecl:a856"],
    stand: "combat:area:13:CPIC8.DAX:120", strike: "combat:area:13:CPIC8.DAX:248",
    width: 192, height: 96, strikeReflected: true,
    inputs: ["up", ...Array(6).fill("enter")], strikeInputs: ["enter"],
  }],
  ["valjevo-genheeris-combat", {
    slot: "B", stand: "combat:area:7:CPIC5.DAX:14", strike: "combat:area:7:CPIC5.DAX:142",
    width: 96, height: 96, strikeInputs: [],
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "n", "enter", "enter", "d", "d"],
  }],
  ["valjevo-messenger", {
    slot: "B", stand: "combat:area:7:CPIC5.DAX:12", strike: "combat:area:7:CPIC5.DAX:140",
    width: 96, height: 96, strikeReflected: true,
    inputs: ["up", "b", "up", "enter", "enter", "c", "enter", "enter", "d", "a", ...Array(6).fill("n")],
    strikeInputs: ["escape", "d", "d", "d", "d"],
  }],
  ["valjevo-bane-cleric-combat", {
    slot: "B", stand: "combat:area:6:CPIC5.DAX:13", strike: "combat:area:6:CPIC5.DAX:141",
    width: 96, height: 96, strikeReflected: true,
    inputs: ["up", "enter", "enter", "k", "enter", "enter", "enter", "q", "q", "q"],
  }],
  ["valjevo-hill-giant", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:55", strike: "combat:area:5:CPIC5.DAX:183",
    width: 96, height: 192, strikeReflected: true,
    inputs: ["up", "enter", "enter", "c", "enter", "enter", "enter", ...Array(12).fill("q")],
  }],
  ["valjevo-tower-troll", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:31", strike: "combat:area:5:CPIC5.DAX:159",
    width: 96, height: 192, strikeReflected: true,
    inputs: ["up", "b", "up", "enter", "enter", "c", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["valjevo-fire-giant", {
    slot: "B", stand: "combat:area:4:CPIC5.DAX:56", strike: "combat:area:4:CPIC5.DAX:184",
    width: 96, height: 192, strikeReflected: true,
    inputs: ["up", "enter", "enter", "c", "s", "enter", "enter", "enter"],
    strikeInputs: ["q", "q"],
  }],
  ["valjevo-scriptorium-combat", {
    slot: "B", stand: "combat:area:4:CPIC5.DAX:14", strike: "combat:area:4:CPIC5.DAX:142", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "a", "a", "c", "enter", "enter", "q", "q", "q"],
  }],
  ["valjevo-giant-snake", {
    slot: "B", stand: "combat:area:5:CPIC5.DAX:60", strike: "combat:area:5:CPIC5.DAX:188", width: 192, height: 96,
    inputs: ["s", "up", "up", "y", "enter", "enter", "c", ...Array(3).fill("enter"), ...Array(5).fill("q")],
  }],
  ["valjevo-elite-guard", {
    slot: "B", stand: "combat:area:7:CPIC5.DAX:11:ecl:a615", strike: "combat:area:7:CPIC5.DAX:139:ecl:a615", width: 96, height: 96,
    standCount: 9,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(3).fill("q")],
  }],
  ["valjevo-party-flail", {
    slot: "B", stand: "combat:party:0:3", strike: "combat:party:0:131",
    width: 96, height: 96, standAnchor: [80, 80, false], standSelected: true,
    strikeAnchor: [80, 80], strikeReflected: false,
    inputs: ["up", "enter", "enter", "enter", "enter", "c", "enter"],
    strikeInputs: ["m", "right"],
  }],
  ["stojanow-hill-giant", {
    stand: "combat:area:9:CPIC2.DAX:55", strike: "combat:area:9:CPIC2.DAX:183", width: 96, height: 192,
    inputs: ["s", "up", "up", ...Array(3).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(13).fill("q")],
  }],
  ["valjevo-tyranthraxus-strike", {
    slot: "B", stand: "combat:CPIC5.DAX:66", strike: "combat:area:7:CPIC5.DAX:194", width: 192, height: 192,
    inputs: ["up", ...Array(6).fill("enter"), ...Array(6).fill("a"), "enter", "enter", ...Array(6).fill("q")],
  }],
  ["valjevo-medusa", {
    slot: "B", stand: "combat:area:7:CPIC5.DAX:49", strike: "combat:area:7:CPIC5.DAX:177", width: 96, height: 96,
    journalLead: "castle-medusa-statues",
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), "q", "q"],
  }],
  ["mendor-library-fighter", {
    slot: "B", stand: "combat:area:15:CPIC2.DAX:11", strike: "combat:area:15:CPIC2.DAX:139", width: 96, height: 96,
    inputs: ["up", ...Array(3).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(4).fill("q")],
  }],
  ["mendor-library-spectre", {
    slot: "B", stand: "combat:area:15:CPIC2.DAX:17", strike: "combat:area:15:CPIC2.DAX:145", width: 96, height: 96,
    journalLead: "mendor-book-guardian",
    inputs: ["up", "up", ...Array(4).fill("enter"), "q", "q"],
  }],
  ["mendor-library-basilisk", {
    slot: "B", stand: "combat:area:15:CPIC2.DAX:26", strike: "combat:area:15:CPIC2.DAX:154", width: 192, height: 96,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(10).fill("q")],
  }],
  ["kuto-norris-combat", {
    slot: "J", stand: "combat:area:29:CPIC8.DAX:7", strike: "combat:area:29:CPIC8.DAX:135", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", "f", "enter", "enter", ...Array(9).fill("q")],
  }],
  ["stojanow-tower-ettin", {
    stand: "combat:area:9:CPIC2.DAX:71", strike: "combat:area:9:CPIC2.DAX:199", width: 96, height: 192,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(10).fill("q")],
  }],
  ["kobold-cave-royal-guard", {
    stand: "combat:area:13:CPIC8.DAX:1", strike: "combat:area:13:CPIC8.DAX:129", width: 96, height: 96,
    inputs: ["up", ...Array(7).fill("enter"), ...Array(8).fill("q")],
  }],
  ["buccaneer-guard-combat", {
    stand: "combat:area:1:CPIC6.DAX:11", strike: "combat:area:1:CPIC6.DAX:139", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", "a", "enter", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["buccaneer-captain-combat", {
    stand: "combat:area:1:CPIC6.DAX:16", strike: "combat:area:1:CPIC6.DAX:144", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", "a", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["graveyard-giant-skeleton", {
    stand: "combat:area:10:CPIC4.DAX:22", strike: "combat:area:10:CPIC4.DAX:150", width: 96, height: 192,
    inputs: ["up", "enter", "y", "enter", "enter", "enter", "q", "q"],
  }],
  ["graveyard-wraith", {
    stand: "combat:area:10:CPIC4.DAX:21", strike: "combat:area:10:CPIC4.DAX:149", width: 96, height: 96,
    inputs: ["up", "b", "enter", "enter", "s", "enter", "enter", "q", "q"],
  }],
  ["graveyard-wight", {
    stand: "combat:area:10:CPIC4.DAX:20", strike: "combat:area:10:CPIC4.DAX:148", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", "s", "enter", "enter"], strikeInputs: ["q", "q", "q"],
  }],
  ["graveyard-mystic-combat", {
    slot: "B", stand: "combat:area:10:CPIC4.DAX:24", strike: "combat:area:10:CPIC4.DAX:152", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", "enter", "s", "enter", "enter"],
  }],
  ["graveyard-ghoul", {
    stand: "combat:area:10:CPIC4.DAX:72", strike: "combat:area:10:CPIC4.DAX:200", width: 96, height: 96,
    inputs: ["e", "enter", "r", "y", ...Array(10).fill("i"), "r", ...Array(4).fill("enter")], strikeInputs: ["enter"],
  }],
  ["graveyard-mummy", {
    stand: "combat:area:10:CPIC4.DAX:114", strike: "combat:area:10:CPIC4.DAX:242", width: 96, height: 96,
    inputs: ["up", ...Array(5).fill("enter"), "q"],
  }],
  ["graveyard-spectre", {
    stand: "combat:area:10:CPIC4.DAX:17", strike: "combat:area:10:CPIC4.DAX:145", width: 96, height: 96,
    inputs: ["up", "enter", "enter", "enter", ...Array(6).fill("q")],
  }],
  ["swamp-giant-lizard", {
    stand: "combat:area:16:CPIC8.DAX:59", strike: "combat:area:16:CPIC8.DAX:187", width: 192, height: 96,
    inputs: ["up", "enter", "c", "c", "enter", "enter", "enter", "q", "q"],
  }],
  ["kobold-cave-wyvern", {
    stand: "combat:area:13:CPIC8.DAX:121", strike: "combat:area:13:CPIC8.DAX:249", width: 192, height: 192,
    inputs: ["up", ...Array(7).fill("enter"), "q"],
  }],
  ["kobold-cave-troll", {
    stand: "combat:area:13:CPIC8.DAX:31", strike: "combat:area:13:CPIC8.DAX:159", width: 96, height: 192,
    inputs: ["up", ...Array(7).fill("enter"), ...Array(49).fill("q")],
  }],
]);
const combatPose = combatPoseRoutes.get(routeName);
const ferryRoutes = new Map([
  ["phlan-ferry-east", { slot: "B", prompt: /BOATDOCKEDHERETHATWILLRETURNYOU/i }],
  ["phlan-ferry-river", { slot: "A", prompt: /BOATHERETHATWILLTAKEYOUBACK/i }],
]);
const ferry = ferryRoutes.get(routeName);
const outskirtsRoutes = new Map([
  ["phlan-outskirts-north", { approach: "northGate", destination: "graveyard", choice: "g", area: 10, map: 10,
    direction: "down", prompt: /NORTHEDGEOFTHECITY/i, menu: /CITY.*GRAVEYARD.*LEAVE/i }],
  ["phlan-outskirts-east", { approach: "eastApproach", destination: "templeOfBane", choice: "s", area: 24, map: 31,
    direction: "up", prompt: /EASTERNEDGEOFTHECITY/i, menu: /NORTH.*SOUTH.*BOAT.*LEAVE/i }],
  ["phlan-outskirts-west", { approach: "westApproach", destination: "podolPlaza", choice: "n", area: 18, map: 18,
    direction: "down", prompt: /WESTERNEDGEOFTHECITY/i, menu: /NORTH.*SOUTH.*LEAVE/i }],
]);
const outskirts = outskirtsRoutes.get(routeName);
const libraryWaterfrontEntry = ["up", "up", "up", "right", "up", "up"];
const environmentRoutes = new Map([
  ["textile-fountain-turn", {
    slot: "H", area: 2, views: 5, patterns: 53, sceneryOnly: true,
    walk: ["left", "up", "up", "right"],
  }],
  ["slums-textile-threshold", {
    slot: "B", area: 20, views: 5, patterns: 30, sceneryOnly: true,
    transition: { afterViews: 4, area: 2 },
    walk: ["up", "enter", "up", "up"],
  }],
  ["old-phlan-south-jail-approach", {
    slot: "A", area: 14, views: 5, patterns: 19, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "left"],
    finalPortrait: "portrait:area:14:HEAD3.DAX:32:BODY3.DAX:8",
  }],
  ["kobold-cave-thresholds-large", {
    slot: "B", area: 13, views: 2, patterns: 23, sceneryOnly: true, walk: ["right"],
  }],
  ["kobold-cave-thresholds-small", {
    slot: "B", area: 13, views: 2, patterns: 26, sceneryOnly: true, walk: ["right"],
  }],
  ["new-phlan-envoy-arcade", {
    slot: "A", area: 8, views: 5, patterns: 20, sceneryOnly: true,
    walk: ["right", "up", "up", "left"],
  }],
  ["new-phlan-envoy-gate", {
    slot: "B", area: 8, views: 5, patterns: 25, sceneryOnly: true,
    walk: ["right", "up", "up", "left"],
  }],
  ["new-phlan-market-turn", {
    slot: "B", area: 0, views: 13, patterns: 63, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["new-phlan-pier-alley", {
    slot: "A", area: 0, views: 14, patterns: 43, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "right"],
  }],
  ["new-phlan-pier-branch", {
    slot: "A", area: 0, views: 5, patterns: 41, sceneryOnly: true,
    walk: ["right", "right", "up", "up"],
  }],
  ["new-phlan-landmark-inn", {
    slot: "A", area: 0, views: 2, patterns: 16, sceneryOnly: true, walk: ["right"],
  }],
  ["new-phlan-landmark-tavern", {
    slot: "A", area: 0, views: 2, patterns: 20, sceneryOnly: true, walk: ["right"],
  }],
  ["new-phlan-landmark-pier", {
    slot: "A", area: 0, views: 1, patterns: 12, sceneryOnly: true, walk: [],
  }],
  ["stojanow-guard-wing-upper", {
    slot: "A", area: 9, views: 16, patterns: 54, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["stojanow-guard-wing-tower", {
    slot: "A", area: 9, views: 2, patterns: 33, sceneryOnly: true,
    walk: ["right"],
  }],
  ["stojanow-tower-lanes-upper", {
    slot: "A", area: 9, views: 13, patterns: 51, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["stojanow-tower-lanes-tower", {
    slot: "A", area: 9, views: 10, patterns: 21, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["stojanow-tower-warning", {
    slot: "A", area: 9, views: 15, patterns: 47, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "b", "up", "up", "enter", "enter", "up", "up", "up", "up", "left", "up", "up"],
  }],
  ["slums-guild-corners-potion", {
    slot: "B", area: 20, views: 15, patterns: 81, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right"],
  }],
  ["slums-guild-corners-grain", {
    slot: "B", area: 20, views: 5, patterns: 10, sceneryOnly: true,
    walk: ["right", "up", "up", "left"],
  }],
  ["slums-side-arcades-fortune", {
    slot: "B", area: 20, views: 13, patterns: 49, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "b", "up", "left", "up", "up", "right", "up"],
  }],
  ["slums-side-arcades-potion", {
    slot: "B", area: 20, views: 13, patterns: 80, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up"],
  }],
  ["slums-side-arcades-west", {
    slot: "B", area: 20, views: 11, patterns: 60, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "left"],
  }],
  ["slums-shop-frontage-fortune", {
    slot: "B", area: 20, views: 2, patterns: 35, sceneryOnly: true,
    walk: ["left"],
  }],
  ["slums-shop-frontage-potion", {
    slot: "B", area: 20, views: 5, patterns: 51, sceneryOnly: true,
    walk: ["left", "up", "up", "right"],
  }],
  ["slums-trade-row-fortune", {
    slot: "B", area: 20, views: 5, patterns: 37, sceneryOnly: true,
    walk: ["right", "up", "up", "left"],
  }],
  ["slums-trade-row-potion", {
    slot: "B", area: 20, views: 3, patterns: 59, sceneryOnly: true,
    walk: ["right", "up"],
  }],
  ["mendor-ruin-crossing-east", {
    slot: "A", area: 20, views: 13, patterns: 42, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["mendor-ruin-crossing-south", {
    slot: "A", area: 20, views: 13, patterns: 45, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "up", "up", "left"],
  }],
  ["mendor-ruin-doors", {
    slot: "A", area: 20, views: 10, patterns: 33, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["mendor-library-waterfront-east", {
    slot: "B", area: 2, views: 15, patterns: 54, sceneryOnly: true,
    transition: { afterViews: 3, area: 15 },
    walk: [...libraryWaterfrontEntry, "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["mendor-library-waterfront-west", {
    slot: "B", area: 2, views: 15, patterns: 56, sceneryOnly: true,
    transition: { afterViews: 3, area: 15 },
    walk: [...libraryWaterfrontEntry, "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["mendor-library-waterfront-south", {
    slot: "B", area: 2, views: 14, patterns: 54, sceneryOnly: true,
    transition: { afterViews: 3, area: 15 },
    walk: [...libraryWaterfrontEntry, "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["textile-library-link", {
    slot: "B", area: 2, views: 7, patterns: 39, sceneryOnly: true,
    transition: { afterViews: 3, area: 15 },
    walk: ["up", "up", "up", "right", "up", "up"],
  }],
  ["old-phlan-locked-lane", {
    slot: "A", area: 14, views: 15, patterns: 31, sceneryOnly: true,
    walk: ["right", "up", "right", "up", "b", "b", "up", "right", "up", "up", "left", "up", "up", "left"],
  }],
  ["pyramid-inner-return", {
    slot: "A", area: 22, views: 36, patterns: 61, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["pyramid-inner-court", {
    slot: "A", area: 22, views: 32, patterns: 58, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right"],
  }],
  ["pyramid-braced-passage", {
    slot: "A", area: 22, views: 28, patterns: 45, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["pyramid-back-cell", {
    slot: "A", area: 22, views: 16, patterns: 41, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "right", "up", "up", "left", "up"],
  }],
  ["pyramid-side-cell", {
    slot: "A", area: 22, views: 11, patterns: 39, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right"],
  }],
  ["nomad-inner-tent-lane", {
    slot: "A", area: 17, views: 13, patterns: 42, sceneryOnly: true,
    walk: ["right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["buccaneer-east-run", {
    slot: "A", area: 1, views: 21, patterns: 85, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up",
      "right", "up", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["buccaneer-side-gate", {
    slot: "A", area: 1, views: 22, patterns: 81, sceneryOnly: true,
    walk: ["left", "up", "right", "up", "up", "left", "left", "up", "up", "right", "up",
      "up", "left", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["buccaneer-guard-approach", {
    slot: "A", area: 1, views: 18, patterns: 77, sceneryOnly: true,
    walk: ["left", "up", "right", "up", "up", "left", "left", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up"],
  }],
  ["buccaneer-pen-courts-east", {
    slot: "A", area: 1, views: 15, patterns: 66, sceneryOnly: true,
    walk: ["left", "up", "right", "up", "up", "left", "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["buccaneer-pen-courts-south", {
    slot: "A", area: 1, views: 13, patterns: 72, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["buccaneer-pen-spur", {
    slot: "A", area: 1, views: 9, patterns: 36, sceneryOnly: true,
    walk: ["left", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["buccaneer-captains-hall", {
    slot: "A", area: 1, views: 6, patterns: 21, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up"],
  }],
  ["buccaneer-palisade-day", {
    slot: "A", area: 1, views: 10, patterns: 45, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["buccaneer-palisade-night", {
    slot: "A", area: 1, views: 11, patterns: 56, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["buccaneer-stockade", {
    slot: "A", area: 1, views: 7, patterns: 33, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up"],
  }],
  ["stojanow-west-watch", {
    slot: "A", area: 9, views: 12, patterns: 34, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["stojanow-gate-coping", {
    slot: "A", area: 9, views: 4, patterns: 20, sceneryOnly: true,
    walk: ["right", "up", "up"],
  }],
  ["lizard-keep-rubble", {
    slot: "A", area: 16, views: 12, patterns: 44, sceneryOnly: true,
    walk: ["left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["lizard-bank-arch", {
    slot: "A", area: 16, views: 10, patterns: 37, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["valhingen-south-memorial", {
    slot: "A", area: 10, views: 7, patterns: 72, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "up", "right"],
  }],
  ["valhingen-memorial-turns-north", {
    slot: "A", area: 10, views: 8, patterns: 91, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "up", "left", "up"],
  }],
  ["valhingen-memorial-turns-south", {
    slot: "A", area: 10, views: 7, patterns: 82, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "right", "up"],
  }],
  ["valhingen-east-memorial", {
    slot: "A", area: 10, views: 7, patterns: 77, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "left", "up"],
  }],
  ["valhingen-gravestones-north", {
    slot: "A", area: 10, views: 7, patterns: 98, sceneryOnly: true,
    walk: ["up", "up", "right", "right", "up", "right"],
  }],
  ["valhingen-gravestones-south", {
    slot: "A", area: 10, views: 6, patterns: 74, sceneryOnly: true,
    walk: ["up", "up", "up", "right", "up"],
  }],
  ["valhingen-west-arch", {
    slot: "A", area: 10, views: 6, patterns: 88, sceneryOnly: true,
    walk: ["up", "up", "right", "right", "up"],
  }],
  ["valhingen-grave-rows-north", {
    slot: "A", area: 10, views: 4, patterns: 63, sceneryOnly: true,
    walk: ["up", "up", "left"],
  }],
  ["valhingen-grave-rows-south", {
    slot: "A", area: 10, views: 4, patterns: 69, sceneryOnly: true,
    walk: ["up", "right", "up"],
  }],
  ["valhingen-crossway", {
    slot: "A", area: 10, views: 5, patterns: 66, sceneryOnly: true,
    walk: ["up", "up", "right", "up"],
  }],
  ["valhingen-west-wall", {
    slot: "A", area: 10, views: 3, patterns: 68, sceneryOnly: true,
    walk: ["left", "up"],
  }],
  ["stojanow-west-rampart", {
    slot: "A", area: 9, views: 10, patterns: 52, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["buccaneer-pen-loop", {
    slot: "A", area: 1, views: 16, patterns: 53, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["valjevo-lower-gallery", {
    slot: "B", area: 5, views: 10, patterns: 47, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["valjevo-kitchen-jamb", {
    slot: "B", area: 4, views: 5, patterns: 31, sceneryOnly: true,
    walk: ["left", "up", "up", "right"],
  }],
  ["valjevo-merchant-west", {
    slot: "B", area: 7, views: 12, patterns: 61, sceneryOnly: true,
    walk: ["right", "right", "up", "up", "right", "up", "up", "left", "up", "up", "left"],
  }],
  ["valjevo-merchant-branch", {
    slot: "B", area: 7, views: 13, patterns: 57, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["valjevo-merchant-wing", {
    slot: "B", area: 7, views: 5, patterns: 38, sceneryOnly: true,
    walk: ["right", "up", "up", "left"],
  }],
  ["valjevo-hall-threshold", {
    slot: "B", area: 7, views: 5, patterns: 27, sceneryOnly: true,
    walk: ["left", "up", "up", "right"],
  }],
  ["valjevo-hall-turn", {
    slot: "B", area: 7, views: 8, patterns: 37, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right"],
  }],
  ["valjevo-hedge-corner", {
    slot: "B", area: 5, views: 2, patterns: 17, sceneryOnly: true,
    walk: ["left"],
  }],
  ["valjevo-hedge-approach", {
    slot: "B", area: 5, views: 3, patterns: 14, sceneryOnly: true,
    walk: ["right", "up"],
  }],
  ["pyramid-inner-angles", {
    slot: "A", area: 22, views: 25, patterns: 28, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up"],
  }],
  ["pyramid-cross-gallery", {
    slot: "A", area: 22, views: 11, patterns: 24, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "up", "right", "up", "up", "right"],
  }],
  ["bane-altar-return", {
    slot: "A", area: 24, views: 28, patterns: 74, sceneryOnly: true,
    walk: ["right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "right", "up", "up", "right", "up", "l", "right", "up", "up", "right"],
  }],
  ["bane-altar-approach", {
    slot: "A", area: 24, views: 23, patterns: 64, sceneryOnly: true,
    walk: ["right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "right", "up", "up", "right", "up"],
  }],
  ["bane-treasure-walk", {
    slot: "A", area: 24, views: 16, patterns: 49, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["kuto-south-lane", {
    slot: "J", area: 18, views: 21, patterns: 121, sceneryOnly: true,
    transition: { afterViews: 6, area: 29 },
    walk: ["up", "up", "left", "right", "right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "up", "up", "left"],
  }],
  ["kuto-south-court", {
    slot: "J", area: 29, views: 17, patterns: 86,
    walk: ["up", "up", "up", "right", ...Array(9).fill("up"), "left", "up", "up"],
    finalEncounter: [40, 32, "encounter:area:29:SPRIT8.DAX:73:0:0", 56, 80],
  }],
  ["old-phlan-east-jail", {
    slot: "A", area: 14, views: 5, patterns: 19,
    walk: ["up", "up", "right", "up", "left"],
    finalPortrait: "portrait:area:14:HEAD3.DAX:32:BODY3.DAX:8",
  }],
  ["kuto-south-passage", {
    slot: "J", area: 18, views: 18, patterns: 107, sceneryOnly: true,
    transition: { afterViews: 6, area: 29 },
    walk: ["up", "up", "left", "right", "right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["podal-gate-fountain", {
    slot: "J", area: 18, views: 11, patterns: 89, sceneryOnly: true,
    transition: { afterViews: 8, area: 29 },
    walk: ["left", "up", "up", "right", "up", "up", "left", "up", "up", "right"],
  }],
  ["kuto-inner-western-edge", {
    slot: "J", area: 29, views: 12, patterns: 48, sceneryOnly: true,
    requiredTile: "tile:29:5745bb7f429a1afa52a11ab57f7148ee24f79b3805d2c6a95d8c1ee9e779be01",
    walk: ["up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["kuto-inner-lane", {
    slot: "J", area: 29, views: 19, patterns: 54, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["bane-ivy-loop", {
    slot: "A", area: 24, views: 19, patterns: 70, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["mendor-locked-wing", {
    slot: "A", area: 20, views: 16, patterns: 39, sceneryOnly: true,
    walk: ["up", "up", "up", "up", "up", "b", "b", "up", "left", "up", "up", "right", "up", "up", "right"],
  }],
  ["new-phlan-warehouse-square", {
    slot: "B", area: 0, views: 20, patterns: 35, sceneryOnly: true,
    walk: ["right", "up", "left", "up", "up", "left", "up", "up", "left", "right", "right", "up", "up", "right", "up", "up", "left", "left", "up"],
  }],
  ["new-phlan-wharf-return", {
    slot: "A", area: 8, views: 23, patterns: 96, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "right", "up"],
  }],
  ["new-phlan-south-shop-exit", {
    slot: "A", area: 0, views: 6, patterns: 29, sceneryOnly: true,
    walk: ["up", "enter", "n", "enter", "right", "up"],
  }],
  ["new-phlan-south-shop-menu-exit", {
    slot: "A", area: 0, views: 6, patterns: 29, sceneryOnly: true,
    walk: ["up", "enter", "y", "e", "enter", "right", "up"],
  }],
  ["new-phlan-west-shop-exit", {
    slot: "A", area: 0, views: 9, patterns: 54, sceneryOnly: true,
    walk: ["up", "enter", "n", "enter", "right", "up", "left", "up"],
  }],
  ["new-phlan-training-exit", {
    slot: "A", area: 0, views: 9, patterns: 59, sceneryOnly: true,
    walk: ["up", "enter", "n", "enter", "left", "up", "right", "up"],
  }],
  ["new-phlan-tavern-back-exit", {
    slot: "A", area: 0, views: 9, patterns: 49, sceneryOnly: true,
    walk: ["up", "enter", "n", "enter", "right", "up", "left", "up"],
  }],
  ["stojanow-barracks-side", {
    slot: "A", area: 9, views: 10, patterns: 29, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["nomad-east-rail", {
    slot: "A", area: 17, views: 11, patterns: 57, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["stojanow-coping-reveal", {
    slot: "A", area: 9, views: 16, patterns: 59, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "left", "up", "right", "up", "left", "up", "right", "up", "up"],
  }],
  ["new-phlan-paving-north-training", {
    slot: "A", area: 0, views: 9, patterns: 24, sceneryOnly: true,
    walk: ["left", "right", "up", "up", "right", "up", "left", "up"],
  }],
  ["new-phlan-paving-east-training", {
    slot: "A", area: 0, views: 9, patterns: 27, sceneryOnly: true,
    walk: ["left", "right", "up", "up", "right", "up", "left", "up"],
  }],
  ["new-phlan-paving-duel", {
    slot: "A", area: 0, views: 9, patterns: 79, sceneryOnly: true,
    transition: { afterViews: 6, area: 11 },
    walk: ["left", "right", "up", "up", "right", "up", "left", "up"],
  }],
  ["new-phlan-paving-canal-room", {
    slot: "A", area: 0, views: 9, patterns: 45, sceneryOnly: true,
    walk: ["left", "right", "up", "up", "right", "up", "left", "up"],
  }],
  ["new-phlan-canal-room", {
    slot: "A", area: 0, views: 24, patterns: 63, sceneryOnly: true,
    walk: ["left", "right", "up", "up", "right", "up", "left", "up", "right", "up", "right", "up", "left", "up",
      "right", "right", "up", "up", "left", "left", "up", "right", "up"],
  }],
  ["new-phlan-canal-west-bank", {
    slot: "A", area: 8, views: 12, patterns: 21, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "up", "right", "up", "left", "up", "right", "up"],
  }],
  ["new-phlan-canal-east-bank", {
    slot: "A", area: 8, views: 9, patterns: 23, sceneryOnly: true,
    walk: ["left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["new-phlan-canal-south-bank", {
    slot: "A", area: 8, views: 9, patterns: 48, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "right", "up", "right", "up"],
  }],
  ["new-phlan-east-terrace", {
    slot: "A", area: 8, views: 20, patterns: 92, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["new-phlan-commission-lane", {
    slot: "A", area: 8, views: 24, patterns: 95, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "up", "right", "up", "up", "up", "up", "up", "left", "up", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["new-phlan-civic-square", {
    slot: "A", area: 8, views: 13, patterns: 76, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "up", "up", "right", "up", "up", "up", "up", "up"],
  }],
  ["new-phlan-market-stalls", {
    slot: "A", area: 8, views: 27, patterns: 85, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["new-phlan-covered-market", {
    slot: "A", area: 8, views: 15, patterns: 59, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["new-phlan-east-ward", {
    slot: "A", area: 8, views: 16, patterns: 52, sceneryOnly: true,
    walk: ["left", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["lizardfolk-reed-breach", {
    slot: "A", area: 16, views: 21, patterns: 76, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "up", "left", "up", "up", "up", "up", "up", "left", "up", "up", "up", "up", "up", "right", "left", "left"],
  }],
  ["lizardfolk-outer-yard", {
    slot: "A", area: 16, views: 19, patterns: 72, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "up", "left", "up", "up", "up", "up", "up", "left", "up", "up", "up", "up", "up", "right"],
  }],
  ["lizardfolk-west-turn", {
    slot: "A", area: 16, views: 16, patterns: 63, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "up", "left", "up", "up", "up", "up", "up", "right", "up", "up", "left"],
  }],
  ["lizardfolk-west-turn-short", {
    slot: "A", area: 16, views: 5, patterns: 40, sceneryOnly: true,
    walk: ["left", "up", "up", "left"],
  }],
  ["lizardfolk-south-gate", {
    slot: "A", area: 16, views: 16, patterns: 69, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "right"],
  }],
  ["lizardfolk-east-ruins", {
    slot: "A", area: 16, views: 16, patterns: 47, sceneryOnly: true,
    walk: ["right", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "left"],
  }],
  ["lizardfolk-north-canal", {
    slot: "A", area: 16, views: 11, patterns: 38, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "up", "up", "right", "up", "up", "left"],
  }],
  ["nomad-south-trail", {
    slot: "A", area: 17, views: 16, patterns: 54, sceneryOnly: true,
    walk: ["up", "up", "up", "right", "up", "left", "up", "up", "up", "up", "up", "up", "up", "left", "up"],
  }],
  ["new-phlan-proclamation-walk", {
    slot: "B", area: 0, views: 15, patterns: 62, sceneryOnly: true,
    walk: ["up", "up", "enter", "right", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["new-phlan-north-avenue", {
    slot: "B", area: 0, views: 15, patterns: 96, sceneryOnly: true,
    walk: ["left", "up", "up", "n", "right", "up", "left", "up", "up", "right", "up", "up", "up", "left", "up"],
  }],
  ["valjevo-south-service-lane", {
    slot: "B", area: 6, views: 16, patterns: 36, sceneryOnly: true,
    walk: ["left", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["zhentil-north-lanes", {
    slot: "A", area: 28, views: 17, patterns: 57, sceneryOnly: true,
    walk: ["left", "up", "up", "left", "up", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["mendor-east-court", {
    slot: "D", area: 20, views: 17, patterns: 44, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["lizard-outer-yard", {
    slot: "A", area: 16, views: 19, patterns: 72, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "up", "left", "up", "up", "up", "up", "up", "left",
      "up", "up", "up", "up", "up", "right"],
  }],
  ["wilderness-waystone-boundary-east", {
    slot: "A", area: 26, views: 6, patterns: 58, sceneryOnly: true,
    walk: ["down", "up", "up", "left", "up"],
  }],
  ["wilderness-waystone-boundary-north", {
    slot: "A", area: 26, views: 10, patterns: 61, sceneryOnly: true,
    walk: ["left", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["wilderness-waystone-boundary-south", {
    slot: "A", area: 26, views: 3, patterns: 48, sceneryOnly: true,
    walk: ["right", "up"],
  }],
  ["wilderness-waystone-boundary-west", {
    slot: "A", area: 26, views: 4, patterns: 50, sceneryOnly: true,
    walk: ["down", "left", "up"],
  }],
  ["wilderness-waystone-north", {
    slot: "A", area: 26, views: 4, patterns: 43, sceneryOnly: true,
    walk: ["up", "up", "right"],
  }],
  ["wilderness-waystone-ridge", {
    slot: "A", area: 26, views: 5, patterns: 53, sceneryOnly: true,
    walk: ["right", "right", "up", "left"],
  }],
  ["wilderness-waystone", {
    slot: "A", area: 26, views: 10, patterns: 80, sceneryOnly: true, captureView: 5,
    walk: ["left", "up", "right", "up", "left", "up", "up", "right", "up"],
  }],
  ["graveyard-moon-path-west", {
    slot: "A", area: 10, views: 10, patterns: 54, sceneryOnly: true,
    walk: ["right", "up", "left", "up", "left", "up", "up", "left", "up"],
  }],
  ["graveyard-moon-path-east", {
    slot: "A", area: 10, views: 3, patterns: 20, sceneryOnly: true,
    walk: ["left", "up"],
  }],
  ["slums-courtyard-east", {
    slot: "B", area: 20, views: 9, patterns: 40, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "right", "up", "up"],
  }],
  ["slums-courtyard-north", {
    slot: "B", area: 20, views: 6, patterns: 40, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up"],
  }],
  ["slums-courtyard-south", {
    slot: "B", area: 20, views: 9, patterns: 60, sceneryOnly: true,
    walk: ["right", "up", "up", "right", "up", "left", "up", "up"],
  }],
  ["slums-courtyard-west", {
    slot: "B", area: 20, views: 9, patterns: 54, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "right", "up", "up"],
  }],
  ["valjevo-transition-east", {
    slot: "B", area: 5, views: 12, patterns: 67, sceneryOnly: true,
    transition: { afterViews: 4, area: 3 },
    walk: ["right", "up", "left", "up", "up", "right", "up", "left", "up", "left", "up"],
  }],
  ["valjevo-transition-hall", {
    slot: "B", area: 5, views: 4, patterns: 48, sceneryOnly: true,
    transition: { afterViews: 1, area: 3 },
    walk: ["up", "left", "up"],
  }],
  ["valjevo-transition-chamber", {
    slot: "B", area: 3, views: 7, patterns: 24, sceneryOnly: true,
    walk: ["left", "right", "up", "up", "left", "up"],
  }],
  ["valjevo-dungeon-doorways", {
    slot: "B", area: 3, views: 10, patterns: 38, sceneryOnly: true, captureView: 10,
    walk: ["left", "up", "up", "right", "up", "left", "up", "right", "up"],
  }],
  ["valjevo-dungeon-east-yard", {
    slot: "B", area: 3, views: 16, patterns: 31, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-south-kitchen-yard", {
    slot: "B", area: 4, views: 17, patterns: 48, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["valjevo-west-chapel-corridors", {
    slot: "B", area: 6, views: 16, patterns: 17, sceneryOnly: true,
    walk: ["right", "right", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["valjevo-eastern-hedges", {
    slot: "B", area: 6, views: 17, patterns: 42, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["bane-east-ramparts", {
    slot: "A", area: 24, views: 17, patterns: 62, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["valhingen-central-courts", {
    slot: "A", area: 10, views: 28, patterns: 140, sceneryOnly: true,
    walk: ["left", "up", "left", "up", "right", "up", "up", "up", "up", "left", "up", "left", "right", "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["new-phlan-harbor-lanes", {
    slot: "A", area: 0, views: 16, patterns: 72, sceneryOnly: true,
    walk: ["right", "up", "up", "up", "right", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up"],
  }],
  ["lizardfolk-southwest-trail", {
    slot: "A", area: 16, views: 15, patterns: 51, sceneryOnly: true,
    walk: ["left", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "right"],
    finalEncounter: [32, 32, "encounter:area:16:SPRIT8.DAX:59:0:0", 80, 80],
  }],
  ["new-phlan-west-garden-lanes", {
    slot: "B", area: 0, views: 17, patterns: 70, sceneryOnly: true,
    walk: ["right", "up", "up", "up", "up", "up", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["kuto-west-arcade", {
    slot: "J", area: 29, views: 16, patterns: 112, sceneryOnly: true,
    walk: ["up", "up", "up", "right", "up", "up", "up", "up", "up", "up", "left", "up", "up", "left", "up"],
  }],
  ["new-phlan-west-covered-lanes", {
    slot: "B", area: 0, views: 16, patterns: 32, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["textile-north-yard", {
    slot: "H", area: 2, views: 16, patterns: 71, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["kuto-east-rubble-lanes", {
    slot: "J", area: 29, views: 10, patterns: 46, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "up", "right", "up", "up", "right"],
  }],
  ["old-phlan-east-lanes", {
    slot: "A", area: 14, views: 17, patterns: 28, sceneryOnly: true,
    walk: ["up", "up", "right", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["stojanow-upper-road", {
    slot: "A", area: 9, views: 16, patterns: 40, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "up", "right", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["kobold-cave-east-tunnels", {
    slot: "B", area: 13, views: 9, patterns: 31, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["bane-inner-court", {
    slot: "A", area: 31, views: 10, patterns: 19,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["bane-inner-sanctuary", {
    slot: "A", area: 31, views: 6, patterns: 31,
    walk: ["up", "up", "right", "up", "up"],
  }],
  ["podal-south-arcade", {
    slot: "I", area: 18, views: 12, patterns: 53,
    walk: ["up", "up", "right", "up", "up", "right", "up", "up", "right", "up", "up"],
    finalEncounter: [48, 32, "encounter:area:18:SPRIT1.DAX:2:0:0", 48, 80],
  }],
  ["lizardfolk-east-bank", {
    slot: "A", area: 16, views: 16, patterns: 52,
    walk: ["up", "up", "left", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["nomad-central-grove", {
    slot: "A", area: 17, views: 16, patterns: 43,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["mendor-annex-floor-small", {
    slot: "B", area: 15, views: 15, patterns: 36, sceneryOnly: true,
    walk: ["right", "right", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-floor-reveals", {
    slot: "B", area: 7, views: 8, patterns: 37, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "up", "right"],
  }],
  ["mendor-annex-floor-large", {
    slot: "B", area: 15, views: 15, patterns: 28, sceneryOnly: true, captureView: 11,
    walk: ["right", "right", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["mendor-west-floor-small", {
    slot: "B", area: 15, views: 10, patterns: 86, sceneryOnly: true,
    transition: { afterViews: 5, area: 2 },
    walk: ["down", "up", "up", "left", "up", "right", "up", "left", "up"],
  }],
  ["mendor-west-floor-large", {
    slot: "B", area: 15, views: 11, patterns: 44, sceneryOnly: true,
    walk: ["up", "up", "left", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["zhentil-east-yard", {
    slot: "A", area: 28, views: 17, patterns: 46,
    walk: ["up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "right", "up"],
  }],
  ["zhentil-east-passage-outer", {
    slot: "A", area: 28, views: 14, patterns: 34, sceneryOnly: true,
    walk: ["left", "up", "up", "right", "up", "left", "up", "right", "up", "left", "up", "right", "up"],
  }],
  ["zhentil-east-passage-doors", {
    slot: "A", area: 28, views: 10, patterns: 26, sceneryOnly: true,
    walk: ["right", "up", "up", "left", "up", "right", "up", "left", "up"],
  }],
  ["zhentil-east-passage-north", {
    slot: "A", area: 28, views: 10, patterns: 32, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "left", "up", "right", "up", "up"],
  }],
  ["zhentil-outer-courts-hall", {
    slot: "A", area: 28, views: 14, patterns: 38, sceneryOnly: true,
    walk: ["up", "left", "up", "up", "left", "up", "right", "up", "up", "down", "up", "left", "up"],
  }],
  ["zhentil-outer-courts-north", {
    slot: "A", area: 28, views: 11, patterns: 38, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["zhentil-outer-courts-east", {
    slot: "A", area: 28, views: 11, patterns: 28, sceneryOnly: true,
    walk: ["up", "right", "up", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["yarash-upper-pyramid", {
    slot: "A", area: 22, views: 15, patterns: 31,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["buccaneer-north-palisade", {
    slot: "A", area: 1, views: 17, patterns: 46,
    walk: ["right", "up", "up", "left", "up", "up", "up", "right", "up", "left", "up", "up", "up", "left", "up", "up"],
  }],
  ["textile-ivy-lane", {
    slot: "H", area: 2, views: 10, patterns: 71,
    walk: ["up", "up", "up", "right", "up", "right", "up", "left", "up"],
  }],
  ["bane-south-colonnade", {
    slot: "A", area: 24, views: 16, patterns: 68,
    walk: ["up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["graveyard-northeast-west", {
    slot: "A", area: 10, views: 10, patterns: 54, sceneryOnly: true,
    walk: ["right", "up", "left", "up", "left", "up", "up", "left", "up"],
  }],
  ["graveyard-northeast-east", {
    slot: "A", area: 10, views: 4, patterns: 20, sceneryOnly: true,
    walk: ["left", "up", "right"],
  }],
  ["mendor-library-south", {
    slot: "D", area: 20, views: 12, patterns: 43,
    walk: ["up", "up", "up", "left", "up", "up", "up", "up", "up", "right", "up"],
  }],
  ["mendor-library-north-corner", {
    slot: "A", area: 20, views: 7, patterns: 23,
    walk: ["up", "up", "left", "up", "right", "up"],
  }],
  ["phlan-south-market", {
    slot: "B", area: 0, views: 16, patterns: 66,
    walk: ["up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["phlan-training-civic", {
    slot: "I", area: 11, views: 15, patterns: 104,
    transition: { afterViews: 6, area: 0 },
    walk: ["left", "up", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-outer-service", {
    slot: "B", area: 6, views: 17, patterns: 34,
    walk: ["up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "left", "up", "up", "right", "up"],
  }],
  ["phlan-training-hall", {
    slot: "I", area: 11, views: 12, patterns: 24,
    walk: ["left", "up", "enter", "enter", "n", "n", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up"],
  }],
  ["valjevo-scriptorium-west", {
    slot: "B", area: 4, views: 14, patterns: 35,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up", "left", "up", "up", "right"],
  }],
  ["valjevo-scriptorium-east", {
    slot: "B", area: 4, views: 16, patterns: 41,
    walk: ["left", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-kitchen-corridor", {
    slot: "B", area: 4, views: 17, patterns: 40,
    walk: ["left", "up", "up", "left", "up", "up", "left", "up", "right", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["valjevo-dungeon-briars", {
    slot: "B", area: 3, views: 16, patterns: 29,
    walk: ["left", "up", "right", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["phlan-city-hall-interior", {
    slot: "A", area: 8, views: 16, patterns: 80,
    walk: ["right", "up", "up", "left", "up", "up", "up", "left", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["valjevo-north-lane", {
    slot: "B", area: 5, views: 19, patterns: 64,
    walk: ["right", "up", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-lower-wing", {
    slot: "B", area: 5, views: 17, patterns: 46,
    walk: ["up", "up", "right", "up", "up", "up", "right", "up", "up", "left", "up", "left", "up", "up", "right", "up"],
  }],
  ["valjevo-covered-gallery", {
    slot: "B", area: 7, views: 22, patterns: 44,
    walk: ["up", "up", "left", "up", "left", "up", "right", "up", "left", "up", "right", "up", "right", "up", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["valjevo-statue-approach", {
    slot: "B", area: 7, views: 2, patterns: 27,
    walk: ["up", "up"],
  }],
  ["valjevo-south-gallery", {
    slot: "B", area: 7, views: 10, patterns: 68,
    walk: ["left", "up", "up", "right", "up", "up", "up", "right", "up", "up"],
  }],
  ["kobold-small-cave-pool", {
    slot: "B", area: 13, views: 7, patterns: 31,
    walk: ["up", "enter", "enter", "up", "right", "up", "up"],
  }],
  ["kobold-large-cave-loop", {
    slot: "B", area: 13, views: 14, patterns: 15,
    walk: ["up", "b", "up", "up", "left", "up", "right", "up", "right", "up", "up", "right", "up"],
  }],
  ["mendor-rhetoric-stacks", {
    slot: "B", area: 15, views: 8, patterns: 47,
    walk: ["up", "up", "right", "up", "up", "up", "right", "up"],
  }],
  ["mendor-history-stacks", {
    slot: "B", area: 15, views: 12, patterns: 80,
    walk: ["up", "up", "left", "up", "up", "up", "left", "up", "enter", "s", "right", "up"],
  }],
  ["kuto-catacomb-service-loop", {
    slot: "J", area: 29, views: 17, patterns: 34,
    walk: ["left", "up", "up", "right", "up", "right", "up", "right", "up", "right", "up", "left", "up", "up", "left", "up"],
  }],
  ["mendor-library-exterior", {
    slot: "B", area: 15, views: 14, patterns: 32,
    walk: ["left", "up", "up", "up", "right", "up", "up", "up", "up", "up", "up", "up", "right"],
  }],
  ["mendor-library-vestibule", {
    slot: "B", area: 15, views: 16, patterns: 38,
    walk: ["up", "left", "up", "right", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["kuto-north-guard-approach", {
    slot: "J", area: 29, views: 10, patterns: 47,
    walk: ["up", "up", "up", "left", "up", "up", "up", "right", "up"],
  }],
  ["kuto-north-rubble-loop", {
    slot: "J", area: 29, views: 18, patterns: 53,
    walk: ["up", "up", "up", "left", "up", "up", "up", "left", "up", "up", "right", "up", "right", "up", "up", "right", "up"],
  }],
  ["kuto-well-approach", {
    slot: "J", area: 29, views: 16, patterns: 89,
    walk: ["up", "up", "up", "right", "up", "left", "up", "right", "up", "left", "up", "right", "up", "left", "up"],
    finalEncounter: [48, 32, "encounter:area:29:SPRIT8.DAX:0:0:0", 40, 80],
  }],
  ["stojanow-riverwalk", {
    slot: "A", area: 9, views: 13, patterns: 50, sceneryOnly: true,
    walk: ["left", ...Array(4).fill("up"), "right", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["pyramid-cistern-loop", {
    slot: "A", area: 23, views: 21, patterns: 27,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up", "left", "left", "up", "right", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["podal-north-lane", {
    slot: "J", area: 18, views: 16, patterns: 97,
    transition: { afterViews: 15, area: 9 },
    walk: ["right", "right", ...Array(4).fill("up"), "left", ...Array(5).fill("up"), "enter", "enter", "up"],
  }],
  ["valjevo-west-gallery", {
    slot: "B", area: 20, views: 15, patterns: 110,
    transition: { afterViews: 4, area: 7 },
    walk: ["right", "up", "left", "up", "up", "left", "up", "up", "left", "up", "up", "left", "up", "up"],
  }],
  ["bane-north-court", {
    slot: "A", area: 24, views: 24, patterns: 55,
    walk: ["left", ...Array(3).fill("up"), "right", ...Array(3).fill("up"), "left", "up", "right", "up",
      "left", "up", "right", "up", "up", "right", "up", "left", "up", "right", "up"],
  }],
  ["podal-west-gate", {
    slot: "J", area: 18, views: 13, patterns: 61,
    walk: ["right", "right", "up", "up", "left", ...Array(7).fill("up")],
  }],
  ["podal-west-gate-north-reentry", {
    slot: "J", area: 18, views: 4, patterns: 17, sceneryOnly: true,
    walk: ["up", "up", "enter", "n", "enter", "up"],
  }],
  ["podal-west-gate-south-reentry", {
    slot: "J", area: 18, views: 3, patterns: 46, sceneryOnly: true,
    transition: { afterViews: 2, area: 26 },
    walk: ["up", "up", "up", "s", "up"],
  }],
  ["nomad-tent-lane", {
    slot: "A", area: 17, views: 6, patterns: 39,
    walk: Array(5).fill("up"),
  }],
  ["nomad-camp-rim", {
    slot: "A", area: 17, views: 8, patterns: 47,
    walk: [...Array(4).fill("up"), "left", "up", "up"],
    approachSequence: [
      [56, 32, "encounter:area:17:SPRIT7.DAX:11:2:0", 16, 49],
      [56, 32, "encounter:area:17:ecl:9dd6:caller:a289:SPRIT7.DAX:11:1:0", 24, 65],
      [40, 32, "encounter:area:17:ecl:9dd6:caller:a2e8:SPRIT7.DAX:11:0:0", 48, 80],
    ],
  }],
  ["overland-graveyard-arrival", {
    slot: "A", area: 26, views: 3, patterns: 74,
    transition: { afterViews: 2, area: 10 },
    walk: ["down", "enter", "g", "enter", "enter", "enter", "enter", "up"],
  }],
  ["overland-north-gate-arrival", {
    slot: "A", area: 26, views: 2, patterns: 16,
    transition: { afterViews: 1, area: 14 },
    walk: ["down", "enter", "c", "enter", "enter", "up"],
  }],
  ["sokal-smithy-edge", {
    slot: "C", area: 21, views: 6, patterns: 33,
    walk: ["up", "left", "up", "right", "up"],
  }],
  ["sokal-northeast-keep", {
    slot: "D", area: 21, views: 25, patterns: 31,
    walk: ["left", "up", "right", "up", "left", "up", "right", "up", "right", "up", "up", "up",
      "left", "up", "left", "up", "up", "left", "up", "left", "up", "right", "up", "right"],
  }],
  ["valjevo-tower-halls", {
    slot: "B", area: 20, views: 13, patterns: 114,
    transition: { afterViews: 4, area: 7 },
    walk: ["right", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "left"],
  }],
  ["graveyard-crypt-path", {
    slot: "A", area: 10, views: 26, patterns: 146, sceneryOnly: true,
    walk: ["up", "left", "up", "right", "up", "up", "up", "up", "right", "right", "up", "up", "up",
      "right", "up", "up", "right", "right", "up", "up", "right", "up", "up", "left", "up"],
  }],
  ["phlan-city-hall-approach", {
    slot: "B", area: 0, views: 15, patterns: 83,
    walk: ["up", "up", "enter", "left", "up", "up", "right", "up", "up", "right", "up", "left", "up", "right", "up"],
  }],
  ["bane-sanctuary", {
    slot: "A", area: 24, views: 23, patterns: 69,
    walk: ["left", "up", "up", "left", "up", "left", "up", "up", "left", "up",
      "right", "up", "up", "right", "up", "right", "up", "up", "up", "up", "right", "up"],
  }],
  ["buccaneer-pens", {
    slot: "A", area: 1, views: 15, patterns: 49,
    walk: ["left", "left", ...Array(6).fill("up"), "right", "up", "up", "up", "right", "up"],
  }],
  ["swamp-ruins", {
    slot: "A", area: 16, views: 12, patterns: 51,
    walk: ["up", "right", "up", "up", "left", "up", "up", "left", "up", "right", "up"],
  }],
  ["pyramid-fountain-approach", {
    slot: "A", area: 23, views: 2, patterns: 19,
    walk: ["up", "right", "up", "enter"],
  }],
  ["pyramid-lower-corridors", {
    slot: "A", area: 23, views: 15, patterns: 35,
    walk: ["up", "right", "up", "up", "left", "up", "right", "up", "left", "up", "left", "up", "right", "up"],
  }],
  ["pyramid-entrance", {
    slot: "A", area: 22, views: 20, patterns: 22,
    walk: [...Array(15).fill("up"), "enter", "right", "up", "enter", "right", "up"],
  }],
  ["zhentil-quarter", {
    slot: "A", area: 28, views: 7, patterns: 16,
    walk: ["up", "right", "up", "right", "up", "right", "up"],
  }],
  ["zhentil-yard", {
    slot: "A", area: 28, views: 16, patterns: 44,
    walk: ["right", "right", "up", "b", "left", "up", "b", "up", "up", "up", "left", "up", "up", "right", "up"],
  }],
  ["textile-approach", {
    slot: "B", views: 16, patterns: 135,
    walk: ["right", "right", "up", "up", "right", "up", "left", "up", "up", "right", ...Array(5).fill("up"), "left"],
  }],
  ["textile-wing", {
    slot: "J", views: 10, patterns: 82,
    walk: ["left", "up", "right", ...Array(4).fill("up"), "left", "up"],
  }],
  ["textile-temple", {
    slot: "I", views: 19, patterns: 78,
    walk: ["right", "right", "up", "b", "left", "up", "left", "up", "b", "right", "up", "b", "left", "up", "up", "left", "up", "enter", "enter"],
    finalPortrait: "portrait:PIC4.DAX:9:0:0",
  }],
  ["textile-temple-native", {
    slot: "I", views: 3, patterns: 22,
    walk: ["up", "enter", "enter"],
    finalPortrait: "portrait:PIC4.DAX:9:0:0",
  }],
  ["graveyard-south", { slot: "A", area: 10, views: 4, patterns: 67, walk: ["right", "up", "up"] }],
  ["graveyard-east", { slot: "A", area: 10, views: 8, patterns: 81, walk: Array(7).fill("up") }],
  ["graveyard-north", { slot: "A", area: 10, views: 7, patterns: 68, walk: ["up", "up", "up", "left", "up", "right"] }],
  ["north-gate-rampart", {
    slot: "A", area: 14, views: 19, patterns: 41,
    walk: ["up", "left", ...Array(11).fill("up"), "left", "up", "right", "right", "up"],
  }],
  ["north-gate-quarter", {
    slot: "A", area: 14, views: 18, patterns: 22,
    walk: ["up", "right", "up", "up", "left", ...Array(5).fill("up"), "left", "up", "right", "up", "up", "left", "up"],
  }],
  ["north-gate-houses", {
    slot: "A", area: 14, views: 12, patterns: 49,
    walk: ["up", "left", ...Array(6).fill("up"), "right", "up", "b", "up", "up", "right", "up", "left", "up"],
  }],
  ["stojanow-gate", {
    slot: "A", area: 9, views: 12, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left"],
    finalEncounter: [56, 32, "encounter:area:9:SPRIT2.DAX:63:0:0", 24, 73],
  }],
  ["stojanow-west", {
    slot: "A", area: 9, views: 15, patterns: 43,
    walk: ["up", "up", "up", "enter", "enter", "up", "left", "up", "up", "up", "right", "up", "up", "right"],
    finalEncounter: [56, 32, "encounter:area:9:SPRIT2.DAX:63:0:0", 24, 73],
  }],
  ["stojanow-east", {
    slot: "A", area: 9, views: 12, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "up"],
    finalEncounter: [56, 32, "encounter:area:9:SPRIT2.DAX:63:0:0", 24, 73],
  }],
]);
const freshRolf = routeName === "new-phlan-rolf-approach";
const routes = ["yarash-desk-papers-reload", "sokal-floorboard-diary-reload", "buccaneer-empty-manual-aim", "textile-stinking-cloud", "buccaneer-arrow-down", "buccaneer-oil-flask", "buccaneer-sling-shot", "bivant-reward-reload", "tyrmor-journal-reload", "new-phlan-building-exit", "new-phlan-arena-manual-report", "new-phlan-arena-quick", "new-phlan-rolf-approach", "lizardfolk-battle-wall", "kobolds", "orcs", "goblins", "armorer", "fighter-trainer", "phlan-harbor-sokal", "phlan-harbor-routes", "phlan-priestess-joy", "phlan-priest-tyr", "phlan-priest-tempus", "sokal-smithy", "sokal-elven-scout", "sokal-elven-scout-search", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard", "podal-plaza", "podal-infirmary", "podal-shrine", "podal-shrine-return", "braccio-dirten-briefing", "bane-gate", "bane-goblins", "bane-symbol", "bane-altar", "bane-hidden-treasure", "kobold-cave", "kobold-cave-efreeti-dialogue", "kobold-cave-wyvern-dialogue", "kobold-cave-guide", "kobold-princess-fatima", "kuto-norris-surrender", "mendor-library-stacks", "slums-fortune", "slums-potion-booth", "old-phlan-seer", "old-phlan-seer-reload", "nomad-camp-approach", "nomad-camp-sentries", "nomad-headman", "nomad-headman-stay", "diogenes-cave", "diogenes-advice", "textile-altar", "textile-ogre", "textile-restal", ...environmentRoutes.keys(), ...ferryRoutes.keys(), ...outskirtsRoutes.keys(), ...conjurerPrompts.keys(), ...encounterRoutes.keys(), ...illustrationRoutes.keys(), "graveyard-mystic", ...combatPoseRoutes.keys(), "graveyard-vampire", "graveyard-wolves", "valhingen-mummy-sarcophagi", "stojanow-briefing", "stojanow-trader", "stojanow-bugbears", "cadorna-envoy-briefing", "zhentil-envoy", "zhentil-trespass", "zhentil-escape", "zhentil-reward", "zhentil-return", "river-approach", "river-passage", "river-fountain", "pyramid-lizardfolk-vats", "river-pumping", "river-exit", "river-return", "river-reward", "yarash-combat", "swamp-approach", "swamp-elder", "swamp-elder-decline", "swamp-reward", "bivant-reward", "mendor-records-reward", "nomad-reward", "bane-reward", "buccaneer-approach", "assault-briefing", "castle-halls", "valjevo-tower-save", "valjevo-tower-reload", "valjevo-dungeon-save", "valjevo-dungeon-reload", "valjevo-false-throne", "valjevo-al-hyam", "valjevo-cadorna-captive", "valjevo-cadorna-hedge", "valjevo-cadorna-reload", "valjevo-cadorna-killed", "valjevo-cadorna-alarm", "valjevo-dungeon-kitchen", "valjevo-scriptorium-password", "valjevo-scriptorium-authority", "valjevo-maze-watch", "valjevo-giant-patrol", "valjevo-dungeon-sentry", "valjevo-bane-chaplain", "valjevo-forge-smith", "valjevo-forge-authorization", "valjevo-records", "valjevo-records-decline", "valjevo-records-scribe", "valjevo-scriptorium-reports", "valjevo-scriptorium-reports-reload", "valjevo-genheeris-bargain", "valjevo-genheeris-orders", "castle-dragon", "castle-ending"];
routes.push("river-passage-reload", "new-phlan-council-reward-reload", "slums-mage-wand", "nomad-headman-rest-reload", "nomad-headman-rest-portrait", "nomad-headman-raid");
routes.push("nomad-headman-decline-reload");
routes.push("podal-infirmary-heal");
routes.push("river-pumping-reload");
routes.push("kobold-princess-fatima-reload");
routes.push("kuto-norris-surrender-reload");
routes.push("valjevo-forge-authorization-reload");
routes.push("buccaneer-bivant-punch");
routes.push("buccaneer-bivant-escort-combat");
routes.push("buccaneer-bivant-purchase", "buccaneer-bivant-purchase-reload");
routes.push("stojanow-wagon-handover-reload");
routes.push("diogenes-upper-ledge-fireball-reload");
routes.push("kuto-well-waterline-reload");
routes.push("valhingen-crypt-scroll", "valhingen-crypt-scroll-reload");
routes.push("kuto-bandit-cache-reload");
routes.push("valjevo-al-hyam-release", "valjevo-al-hyam-release-reload");
routes.push("valjevo-cadorna-alarm-reload");
routes.push("valjevo-records-revisit");
routes.push("river-pumping-hostile");
routes.push("river-return-reload");
routes.push("swamp-return", "swamp-reward-reload");
routes.push("slums-potion-booth-reload");
routes.push("mendor-records-reward-reload");
const atlasRoutes = new Map([
  ["kuto-catacombs-atlas", { slot: "J", areas: [29], mapId: 32, file: "kutos-catacombs-concept-v1.png" }],
  ["bane-interior-atlas", { slot: "A", areas: [24, 31], mapId: 31, file: "temple-of-bane-interior-concept-v1.png" }],
]);
const atlasRoute = atlasRoutes.get(routeName);
const moonseaTravel = routeName === "moonsea-lizardman-travel";
const sokalTravel = routeName.startsWith("moonsea-sokal-");
const valjevoTravel = routeName.startsWith("moonsea-valjevo-");
const districtTravel = new Map([
  ["moonsea-stojanow", { id: "stojanow", area: 9, start: ["down", "enter", "n"] }],
  ["moonsea-kuto-well", { id: "kutoWell", area: 29, start: ["down", "enter", "n"] }],
  ["moonsea-slums", { id: "slums", area: 20, start: ["up", "enter", "b"] }],
  ["moonsea-city-hall", { id: "cityHall", area: 8, start: ["up", "enter", "b"] }],
  ["moonsea-city-hall-locked", { id: "cityHall", prompt: /THEDOORISLOCKED.*BREAKIN\?YESNO/i, start: ["up", "enter", "b"] }],
  ["moonsea-training-hall", { id: "trainingHall", area: 11, start: ["up", "enter", "b"] }],
  ["moonsea-mendor-library", { id: "mendorLibrary", area: 15, start: ["down", "enter", "s"] }],
  ["moonsea-new-phlan-east", { id: "newPhlan", area: 0, start: ["up", "enter", "b"] }],
  ["moonsea-new-phlan-dock", { id: "newPhlan", area: 0, start: ["down", "down", "enter", "t"] }],
  ["moonsea-new-phlan-east-dock", { id: "newPhlan", area: 0, start: ["down", "enter", "t"] }],
  ["moonsea-kovel-east", { id: "kovelMansion", area: 14, start: ["up", "enter", "n"] }],
  ["moonsea-kovel-north", { id: "kovelMansion", area: 14, start: ["down", "enter", "c"] }],
  ["moonsea-textile", { id: "textileHouse", area: 2, start: ["down", "enter", "s"] }],
  ["moonsea-graveyard-from-phlan", { id: "graveyard", area: 10, start: ["down", "enter", "g"] }],
  ["moonsea-north-approach", { id: "northGate", approach: true, prompt: /CITYGRAVEYARDLEAVE/i, start: ["down", "enter"] }],
  ["moonsea-east-approach", { id: "eastApproach", approach: true, prompt: /NORTHSOUTHBOATLEAVE/i, start: ["up", "enter"] }],
  ["moonsea-west-approach", { id: "westApproach", approach: true, prompt: /NORTHSOUTHLEAVE/i, start: ["down", "enter"] }],
  ["moonsea-docks", { id: "docks", approach: true, prompt: /TAKEBOATSTAY/i, start: ["down", "down", "enter"] }],
  ["moonsea-nearest-approach", { id: "phlan", approach: true, prompt: /NORTHSOUTHLEAVE/i, start: ["down", "enter"] }],
  ["moonsea-pyramid", { id: "island", world: true, prompt: /MAGNIFICENTPYRAMID.*ENTERGOBACK/i, start: ["down", "y"] }],
  ["moonsea-diogenes", { id: "diogenes", world: true, prompt: /ENTERCAVEIGNORECAVE/i, start: ["up", "enter"] }],
  ["moonsea-buccaneers", { id: "buccaneers", world: true, prompt: /YOUHAVEREACHEDTHEBUCCANEERBASE.*ENTERLEAVE/i, start: ["up", "enter"] }],
  ["moonsea-zhentil", { id: "zhentil", world: true, prompt: /AREYOUTHEDIPLOMATICENVOYSFROMNEWPHLAN.*YESNO/i, start: ["up", "enter"] }],
  ["moonsea-nomads", { id: "nomads", world: true, prompt: /ALARGENOMADCAMP.*ENTERLEAVE/i, start: ["up", "enter"] }],
  ["moonsea-kobolds", { id: "kobolds", world: true, prompt: /WHATCAVEWILLYOUENTER\?LARGESMALLEXIT/i, start: ["down", "enter"] }],
  ["moonsea-combat-handoff", { id: "kobolds", world: true, combat: true, start: ["down", "down"] }],
]);
const travelDestination = districtTravel.get(routeName);
const questLockedTravel = routeName === "moonsea-quest-locked";
routes.push("textile-return-art", "moonsea-lizardman-travel", "moonsea-sokal-free", "moonsea-sokal-fare",
  "moonsea-sokal-decline", "moonsea-valjevo-arrival", "moonsea-valjevo-gate-warning", "moonsea-quest-locked",
  ...districtTravel.keys(), ...atlasRoutes.keys());
routes.push("stojanow-wall-warning", "stojanow-wall-warning-reload");
routes.push("kobold-cave-escort", "kobold-king-door", "kobold-king-door-reload");
routes.push("kobold-king-fall", "kobold-king-fall-reload", "kobold-king-return-throne", "kobold-king-leave-caves", "kobold-king-reward");
routes.push("kobold-king-return-council", "kobold-king-return-council-save-pier", "kobold-king-return-council-reload");
routes.push("kovel-guild-files", "kovel-jail-enemy-turn", "kovel-castle-map-nw", "kovel-castle-map-ne", "kovel-castle-map-nw-reload", "kovel-castle-map-ne-reload");
routes.push("kovel-chase", "kovel-chase-east", "kovel-chase-east-reload", "kovel-chase-attack", "kovel-chase-decline", "valjevo-al-hyam-reload");
routes.push("kovel-chase-no", "valjevo-records-reload", "swamp-approach-reload", "nomad-feast-decline", "kobold-royal-ballista");
routes.push("valhingen-first-arrival-reload", "kobold-escort-arrival-reload");
routes.push("new-phlan-council-magic-effects", "buccaneer-pen-defeat-effect", "valjevo-party-defeat-effect");
routes.push("kuto-wide-manual-aim");
const wideManualAim = routeName === "kuto-wide-manual-aim";
const reflectedEffect = {
  "new-phlan-council-reflected-effects": {
    slot: "A", inputs: ["up", "enter", "n", "enter", "enter", "enter"],
    arrowTurn: 45, arrow: [1, [80, 80], [32, 32]], missileTurn: 31,
  },
  "textile-reflected-arrow": {
    slot: "B", inputs: ["up", "enter", "enter", "enter", "enter", "enter"],
    arrowTurn: 14, arrow: [129, [104, 56], [32, 128]],
  },
}[routeName];
routes.push("new-phlan-council-reflected-effects", "textile-reflected-arrow");
const partyDefeatEffect = routeName === "valjevo-party-defeat-effect";
const defeatEffect = partyDefeatEffect || routeName === "buccaneer-pen-defeat-effect";
const projectile = {
  "buccaneer-oil-flask": { phases: ["4", "4:flip-x", "4:transpose", "132"], damage: 10 },
  "buccaneer-sling-shot": { phases: ["8", "136"], damage: 5 },
  "buccaneer-arrow-down": { phases: ["128"], damage: 3, archer: "ALDA",
    inputs: ["m", "pageup", "right", "enter", "a", "n", "n", "t"], launch: [80, 56], landing: [80, 104] },
}[routeName];
const stinkingCloud = routeName === "textile-stinking-cloud";
const mageWand = routeName === "slums-mage-wand";
assert.ok(checkpoint && chromePath, `Usage: node tools/verify-slums-presentation.mjs <checkpoint> <Chrome executable> [${routes.join("|")}] [--terrain-only|--manual-party]`);
assert.ok(routes.includes(routeName), "Unknown presentation replay route");
const ending = routeName === "castle-ending";
const councilFinale = ending && option === "--council-finale";
const dragon = routeName === "castle-dragon";
const halls = routeName === "castle-halls";
const assault = routeName === "assault-briefing";
const mystic = routeName === "graveyard-mystic";
const vampire = routeName === "graveyard-vampire";
const wolves = routeName === "graveyard-wolves";
const envoy = routeName === "zhentil-envoy";
const envoyEscape = routeName === "zhentil-escape";
const swampReturn = routeName === "swamp-return";
const councilReward = {
  "zhentil-reward": ["commission-zhentil", /CADORNAWASWAGERINGYOURRETURN/i,
    { portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:zhentil-envoy", xp: 12750 }],
  "river-reward": ["commission-river", /CLEARINGOFTHESTOJONOWRIVER/i,
    { portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:stojonow-river", xp: 34250 }],
  "swamp-reward": ["commission-lizardmen", /LIZARDMENMENACEHASGREATLYIMPROVED/i,
    { portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:lizardmen", xp: 14800 }],
  "bivant-reward": ["commission-rescue", /BIVANTWASDELIGHTEDWITHTHECHILD.SRESCUE/i],
  "kobold-king-reward": ["commission-kobolds", /THISLOSSOFTHEKOBOLDFORCESWILLBEAMAJORBLOW/i,
    { portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:kobold-king", xp: 6250 }],
  "nomad-reward": ["commission-nomads", /WEWEREMUCHRELIEVEDBYTHENEWSYOUBRINGFROMTHENOMADCAMP/i,
    { portrait: "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:nomad-camp", xp: 5900 }],
  "bane-reward": ["commission-bane", /YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE/i],
}[swampReturn ? "swamp-reward" : routeName];
const envoyReturn = routeName === "zhentil-return";
const riverApproach = routeName === "river-approach";
const riverPassage = routeName === "river-passage";
const riverFountain = routeName === "river-fountain";
const riverExit = routeName === "river-exit";
const riverReturn = routeName === "river-return";
const koboldReturn = routeName.startsWith("kobold-king-return-council");
const koboldFerrySave = routeName === "kobold-king-return-council-save-pier";
const koboldFerryReload = routeName === "kobold-king-return-council-reload";
const riverPumpingHostile = routeName === "river-pumping-hostile";
const riverPumping = routeName === "river-pumping" || riverPumpingHostile;
const stojanow = routeName === "stojanow-briefing";
const trader = routeName === "stojanow-trader";
const traderReload = routeName === "stojanow-wagon-handover-reload";
const traderJournalLeads = ["gate-trader-deal", "gate-trader-guard-warning", "gate-trader-ettin-warning"];
const altar = routeName === "textile-altar";
const plaza = routeName === "podal-plaza";
const baneGate = routeName === "bane-gate";
const baneGoblins = routeName === "bane-goblins";
const baneSymbol = routeName === "bane-symbol";
const baneAltar = routeName === "bane-altar";
const koboldCave = routeName === "kobold-cave";
const infirmaryHeal = routeName === "podal-infirmary-heal";
const infirmary = routeName === "podal-infirmary" || infirmaryHeal;
const shrine = routeName === "podal-shrine";
const shrineReturn = routeName === "podal-shrine-return";
const trainer = routeName === "fighter-trainer";
const environment = environmentRoutes.get(towerSave ? "valjevo-tower-halls" : routeName);
const ogre = routeName === "textile-ogre";
const goblins = routeName === "goblins";
const smithy = routeName === "sokal-smithy";
const orcs = routeName === "orcs";
const armory = routeName === "sokal-armory";
const patrolCombat = routeName === "sokal-patrol-combat";
const courtyard = routeName === "sokal-courtyard";
const terrainOnly = option === "--terrain-only";
const manualParty = option === "--manual-party";
const repeatStampede = option === "--repeat-stampede" && routeName === "buccaneer-pens";
const classicPortrait = option === "--classic-portrait" &&
  ["buccaneer-approach", "new-phlan-south-shop-exit"].includes(routeName);
const southShopkeeper = "portrait:HEAD3.DAX:42:BODY3.DAX:9";
const ogreApproachOnly = ogre && option === "--approach-only";
const verifyHallsWebGL = halls && option === "--webgl";
const verifyApproachTravel = outskirts && option === "--map-travel";
const verifyDistrictTravel = outskirts && option === "--map-destination";
const declineValjevoDisguise = routeName === "valjevo-disguise-offer" && option === "--decline";
const declineDirten = routeName === "braccio-dirten-briefing" && option === "--decline";
const declineRestal = restalGuide && option === "--decline";
const declineKoboldGuide = routeName === "kobold-cave-guide" && option === "--decline";
const declineFatima = princessFatima && option === "--decline";
const declineKutoCache = routeName === "kuto-bandit-cache" && option === "--decline";
const declineCryptScroll = ["valhingen-crypt-scroll", "valhingen-crypt-scroll-reload"].includes(routeName) && option === "--decline";
const fightNorris = norrisSurrender && option === "--fight";
const refuseNomadDismissal = routeName === "nomad-feast-decline" && option === "--refuse-to-leave";
assert.ok(!option || (courtyard && (terrainOnly || manualParty)) || repeatStampede || classicPortrait ||
  ogreApproachOnly || councilFinale || verifyHallsWebGL || verifyApproachTravel || verifyDistrictTravel ||
  declineDirten || declineRestal || declineKoboldGuide || declineFatima || declineCryptScroll || declineKutoCache ||
  declineValjevoDisguise || fightNorris || refuseNomadDismissal, "Option does not apply to this route");
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const slot = (wideManualAim || norrisSurrenderReload ? "J" : routeName === "tyrmor-journal-reload" ? "B" : undefined) ?? atlasRoute?.slot ?? environment?.slot ?? ferry?.slot ?? encounterRoute?.slot ?? illustration?.slot ?? combatPose?.slot ?? reflectedEffect?.slot ?? (landing || norrisSurrender ? "J" : armory ? "D" : altar || plaza || infirmary || shrine || shrineReturn ? "I" : ogre ? "H" : dragon || halls || towerReload || dungeonSave || dungeonReload || falseTyranthraxus || alHyam || captiveCadorna || captiveReload || dungeonKitchen || scriptorium || mazeWatch || giantPatrol || dungeonSentry || castleChaplain || forgeSmith || castleRecords || castleScribe || castleReports || castleReportsReload || genheeris || assault || mystic || stojanow || trader || koboldCave || koboldGuide || princessFatima || mendorStacks || routeName === "slums-fortune" || routeName === "slums-potion-booth" || routeName.startsWith("old-phlan-seer") ? "B" : orcs || ending || smithy || sokalScout || restalGuide ? "C" : "A");
const koboldKingDoor = routeName.startsWith("kobold-king-door");
const koboldThroneReturn = routeName === "kobold-king-return-throne";
const koboldCaveExit = routeName === "kobold-king-leave-caves";
const koboldKingFall = routeName.startsWith("kobold-king-fall") || koboldThroneReturn || koboldCaveExit;
const saveSlot = routeName === "kuto-well-waterline-reload" ? "J" :
  alHyamReload || ["sokal-floorboard-diary-reload", "valjevo-records-reload", "kobold-escort-arrival-reload"].includes(routeName) ? "C" :
  routeName === "textile-return-art" || councilFinale ? "D" :
  partyDefeatEffect || mageWand || stinkingCloud || koboldKingDoor || koboldKingFall || koboldReturn || traderReload ||
    ["stojanow-wall-warning-reload", "kovel-chase-east-reload", "valhingen-first-arrival-reload", "valjevo-forge-authorization-reload", "slums-potion-booth-reload"].includes(routeName) ? "B" : slot;
const boot = { A: "1e61", B: "3062", C: "2e63", D: "2064", E: "1265", F: "2166", G: "2267", H: "2368", I: "1769", J: "246a" }[saveSlot];
assert.ok(boot, `No BIOS key for save slot ${saveSlot} on route ${routeName}`);
const saved = resolve(directory, saveSlot + ".json");
const battleTrace = process.env.POR_TRACE_BATTLE_TILES === "1"
  ? resolve(directory, "battle-tiles.jsonl") : undefined;
const kovelMap = routeName.startsWith("kovel-castle-map-");
const environmentTrace = (environment || dragon || halls || kovelMap || koboldEscort || routeName === "textile-return-art") && process.env.POR_WRITE_ENVIRONMENT_TRACE === "1"
  ? resolve(directory, "environment-tiles.jsonl") : undefined;
const frameDirectory = resolve(directory, "tile-frames");
let battleFrame = 0;
if (battleTrace) mkdirSync(frameDirectory);
const profile = resolve(directory, "chrome");
if (!freshRolf) copyFileSync(checkpoint, saved);
const originalSave = freshRolf ? undefined : readFileSync(saved);
const port = process.env.POR_PLAY_PORT ?? "43212";
const origin = `http://127.0.0.1:${port}`;
const browserEnvironment = { ...process.env };
delete browserEnvironment.POR_UPGRADES_DIR;
const shopPortraitTrace = routeName === "new-phlan-south-shop-exit" && !browserEnvironment.POR_PORTRAIT_TRACE_FILE
  ? resolve(directory, "shop-portrait-fallbacks.jsonl") : undefined;
if (shopPortraitTrace) browserEnvironment.POR_PORTRAIT_TRACE_FILE = shopPortraitTrace;
const priorPartyLead = "prior-party-fixture";
if (routeName === "new-phlan-building-exit") {
  const journalProfile = resolve(directory, "prior-party-journal.json");
  writeFileSync(journalProfile, JSON.stringify({ version: 1, leads: [
    { id: priorPartyLead, title: "Prior party clue", detail: "Known only by the prior party." },
  ] }));
  browserEnvironment.POR_JOURNAL_PROFILE = journalProfile;
}
if (terrainOnly || classicPortrait) {
  const pack = resolve(directory, "test-art");
  mkdirSync(pack);
  const combined = { version: 1, assets: {}, encounters: {}, reflectedTiles: [] };
  const missingPortrait = routeName === "new-phlan-south-shop-exit" ? southShopkeeper : "portrait:PIC6.DAX:39:0:0";
  for (const source of ["upgrades/slums", "upgrades"]) {
    const manifest = JSON.parse(readFileSync(resolve(source, "manifest.json")));
    for (const [id, file] of Object.entries(manifest.assets)) {
      if ((terrainOnly && id.startsWith("combat:")) || (classicPortrait && id === missingPortrait)) continue;
      copyFileSync(resolve(source, file), resolve(pack, file));
      combined.assets[id] = file;
    }
    Object.assign(combined.encounters, manifest.encounters);
    combined.reflectedTiles.push(...(manifest.reflectedTiles ?? []));
  }
  writeFileSync(resolve(pack, "manifest.json"), JSON.stringify(combined));
  browserEnvironment.POR_UPGRADES_DIR = pack;
}

const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...browserEnvironment, POR_PLAY_PORT: port, POR_SAVE_DIR: directory,
    POR_PREGEN_PARTY: "0", POR_TRACE_TILES: "1", POR_BOOT_KEY_FILE: "",
    POR_TRACE_BATTLE_TILES: dragon || routeName === "lizardfolk-battle-wall" ? "1" : browserEnvironment.POR_TRACE_BATTLE_TILES,
    POR_BOOT_KEYS: freshRolf ? "31000000:1c0d,45000000:2e63" : "31000000:1c0d,45000000:266c,52000000:" + boot,
    POR_LIVE_AT: freshRolf ? "50000000" : "85000000", POR_BOOT_STEPS: "450000000",
  },
  stdio: ["ignore", "ignore", "inherit"],
});
const chrome = spawn(chromePath, [
  "--headless", "--no-first-run", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

class GuestStopped extends Error {}

async function waitFor(description, read, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  do {
    for (const [name, child] of [["Game server", server], ["Chrome", chrome]]) {
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`${name} exited (${child.exitCode ?? child.signalCode}) while waiting for ${description}`);
      }
    }
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
      if (error instanceof GuestStopped) throw error;
      lastError = error;
    }
    await delay(75);
  } while (Date.now() < deadline);
  throw new Error(`Timed out waiting for ${description}`, { cause: lastError });
}

let socket;
try {
  const debugPort = await waitFor("Chrome's debug port", () =>
    readFileSync(resolve(profile, "DevToolsActivePort"), "utf8").split(/\r?\n/)[0]);
  const tab = await waitFor("Chrome tab", async () => {
    const tabs = await fetch(`http://127.0.0.1:${debugPort}/json/list`).then((response) => response.json());
    return tabs.find(({ type }) => type === "page");
  });
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let messageId = 0;
  function command(method, params) {
    const id = ++messageId;
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.removeEventListener("message", receive);
        reject(new Error(`Chrome did not answer ${method}`));
      }, 10_000);
      function receive(event) {
        const message = JSON.parse(event.data);
        if (message.id !== id) return;
        clearTimeout(timeout);
        socket.removeEventListener("message", receive);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result);
      }
      socket.addEventListener("message", receive);
      socket.send(JSON.stringify({ id, method, params }));
    });
  }
  async function run(expression) {
    const response = await command("Runtime.evaluate", { expression, returnByValue: true });
    assert.ok(!response.exceptionDetails, response.exceptionDetails?.text);
    return response.result.value;
  }
  const latest = async () => {
    const response = await fetch(origin + "/state");
    const state = await response.json();
    if (state.stopped) throw new GuestStopped(state.stopped);
    return state;
  };
  let frame = await waitFor("the loaded party", async () => {
    const state = await latest();
    return state.ready && state;
  });
  await command("Page.navigate", { url: origin });
  await waitFor("the game display", () => run('document.querySelector("#screen")?.naturalWidth === 320'));
  if (combatPose?.manualPolling || illustration?.manualPolling || routeName === "slums-mage-orc-ready" || routeName === "slums-mage-orc-leader") {
    // This replay steps every combat pause explicitly through advance().
    await run(`(() => {
      const fetchOriginal = window.fetch.bind(window);
      window.fetch = (url, options) => url === "/key" && options?.body === ":poll"
        ? Promise.resolve(new Response(null, { status: 409 }))
        : fetchOriginal(url, options);
    })()`);
  }

  const patrolWallTiles = new Set(patrolCombat ? [
    "battle-tile:40c40bfff532a623cbed6d12294d91c254cca2ef45f37aa2677314f4bea113ff",
    "battle-tile:238366db6f519d123c0368f079f5022ca613b098716521c63dba487382dfd706",
    "battle-tile:773ab665f6d64f65a695c511203ed333dab9170afb944b2159fe8deec7b592a7",
  ] : []);
  const patrolCombatSprites = new Set(patrolCombat ? [
    "combat:RANDCOM.DAX:1:0:5", "combat:RANDCOM.DAX:1:0:1",
    "combat:party:64:64:palette:044645678ccecdef", "combat:party:64:64:palette:065345678edbcdef",
  ] : []);
  const escortTilePatterns = new Set();
  let escortViews = 0;
  async function advance(key) {
    const sequence = frame.sequence;
    const response = await fetch(origin + "/key", {
      method: "POST", headers: { Origin: origin, "X-POR-Frame": String(sequence) }, body: key,
    });
    assert.equal(response.status, 204, `Input rejected: ${key}`);
    frame = await waitFor(`guest frame after ${key}`, async () => {
      const state = await latest();
      return state.ready && state.sequence > sequence && state;
    });
    if (battleTrace && frame.battleTileInventory?.length) {
      appendFileSync(battleTrace, JSON.stringify(frame.battleTileInventory) + "\n");
      writeFileSync(resolve(frameDirectory, `${battleFrame++}.png`), Buffer.from(frame.frame, "base64"));
    }
    if (koboldEscort && !frame.journal) escortViews += await verifyTiledView(13, escortTilePatterns);
    const wallTiles = (frame.battleTiles ?? []).filter(([, , id]) => patrolWallTiles.has(id));
    if (wallTiles.length) {
      await waitFor("the enhanced wall tiles at their battlefield positions", () => run(`
        state.sequence === ${frame.sequence} && !animationFrame &&
        ${JSON.stringify(wallTiles)}.every(([x, y, id]) => [...document.querySelectorAll(".battle-tile")].some(tile =>
          tile.getAttribute("src") === "/art/" + id && tile.naturalWidth === 32 && tile.naturalHeight === 32 &&
          parseFloat(tile.style.left) === x / 3.2 && parseFloat(tile.style.top) === y / 2))`));
      for (const [, , id] of wallTiles) patrolWallTiles.delete(id);
    }
    const sprites = (frame.combatArt ?? []).filter(([, , id]) => patrolCombatSprites.has(id));
    if (sprites.length) {
      await waitFor("the enhanced battlefield sprites", () => run(`state.sequence === ${frame.sequence} && !animationFrame &&
        ${JSON.stringify(sprites)}.every(([x, y, id, reflected]) => [...document.querySelectorAll(".combat-sprite")].some(sprite =>
          sprite.getAttribute("src") === "/art/" + id && sprite.naturalWidth === 96 && sprite.naturalHeight === 96 &&
          parseFloat(sprite.style.left) === x / 3.2 && parseFloat(sprite.style.top) === y / 2 &&
          sprite.style.transform === (reflected ? "scaleX(-1)" : "")))`));
      for (const [, , id] of sprites) patrolCombatSprites.delete(id);
    }
  }

  async function verifyRolfTrainingSchools() {
    const schools = "scene-illustration:area:0:ecl:af3f:caller:b369";
    assert.equal(frame.portrait, schools);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /BEHINDTHESEDOORSARETHESPECIALTRAININGSCHOOLS/i);
    await waitFor("Rolf's training schools illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${schools}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
  }

  async function verifyPortraitPanel() {
    assert.ok(await run(`(() => {
      const layer = document.querySelector("#tile-art").getBoundingClientRect();
      const portrait = document.querySelector(".encounter-portrait").getBoundingClientRect();
      const panel = document.querySelector("canvas.panel-frame");
      const interior = panel?.getContext("2d").getImageData(32, 32, 480, 480).data;
      const hasInnerFrame = interior?.some((value, index) => index % 4 === 3 && value !== 0);
      return !hasInnerFrame && Math.abs(portrait.left - layer.left - layer.width * 8 / 320) < 1 &&
        Math.abs(portrait.top - layer.top - layer.height * 8 / 200) < 1 &&
        Math.abs(portrait.width - layer.width * 120 / 320) < 1 &&
        Math.abs(portrait.height - layer.height * 120 / 200) < 1;
    })()`), "Enhanced portrait should fill the outer picture panel");
  }

  async function switchBothWays(classicFrame) {
    const displayGeometry = () => run(`(() => {
      const display = document.querySelector("#screen");
      const { width, height } = display.getBoundingClientRect();
      return { width, height, native: [display.naturalWidth, display.naturalHeight] };
    })()`);
    const before = await latest();
    await run('document.querySelector("#presentation").click()');
    await waitFor("classic presentation", () => run('document.querySelector("#game-text").hidden && document.querySelector("#tile-art").hidden'));
    if (classicFrame) {
      const nativePng = JSON.stringify(`data:image/png;base64,${classicFrame}`);
      await waitFor("the captured guest frame in Classic", () => run(`document.querySelector("#screen").src === ${nativePng}`));
    }
    const classic = await displayGeometry();
    assert.deepEqual(classic.native, [320, 200]);
    assert.ok(Math.abs(classic.height - classic.width * 5 / 8) < 1, "Classic should render at 8:5");
    assert.deepEqual(await latest(), before);
    await run('window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }))');
    await waitFor("enhanced text", () => run('!document.querySelector("#game-text").hidden'));
    const enhanced = await displayGeometry();
    assert.ok(Math.abs(enhanced.height - enhanced.width * 3 / 4) < 1, "Enhanced should render at 4:3");
    assert.deepEqual(await latest(), before);
    if (freshRolf) assert.equal(existsSync(saved), false);
    else assert.deepEqual(readFileSync(saved), originalSave);
  }

  await run('document.querySelector("#presentation").click()');
  const verifyDefaultWebGL = moonseaTravel || sokalTravel || valjevoTravel || travelDestination || questLockedTravel ||
    verifyHallsWebGL || verifyApproachTravel || verifyDistrictTravel ||
    ["new-phlan-rolf-tour", "lizardfolk-battle-wall"].includes(routeName);
  if (!verifyDefaultWebGL) {
    // The tile replays verify individual PNG placements.
    await run(`document.querySelector('#street-toggle[aria-pressed="true"]')?.click()`);
  }
  function waitForExplorationViewport() {
    const source = JSON.stringify(`data:image/png;base64,${frame.enhancedFrame}`);
    return waitFor("the default WebGL exploration viewport", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector("#screen").src === ${source} &&
      document.querySelector(".street-viewport")?.isConnected`));
  }
  function observeApproach(approachSequence, requireTiles = true) {
    return run(`(() => {
      window.observedApproach = new Set();
      const layer = document.querySelector("#tile-art");
      function recordApproach() {
        const img = layer.querySelector(".encounter-sprite");
        if (!img || (${requireTiles} && layer.querySelectorAll(".terrain-tile").length !== 121)) return;
        for (const [x, y, id, w, h] of ${JSON.stringify(approachSequence)}) {
          const left = (8 + (x - 24) * 120 / 88) / 3.2;
          const top = (8 + (y - 24) * 120 / 88) / 2;
          if (img.getAttribute("src") === "/art/" + id && img.naturalWidth === w * 4 && img.naturalHeight === h * 4 &&
              Math.abs(parseFloat(img.style.left) - left) < .001 && Math.abs(parseFloat(img.style.top) - top) < .001) {
            window.observedApproach.add(id);
          }
        }
      }
      new MutationObserver(recordApproach).observe(layer, { childList: true });
      layer.addEventListener("load", recordApproach, true);
    })()`);
  }

  async function verifyTiledView(area, patterns) {
    if (!frame.tileInventory?.length) return 0;
    if (environmentTrace) appendFileSync(environmentTrace, JSON.stringify(frame.tileInventory) + "\n");
    const expected = frame.tileInventory.map(([x, y, id]) => [x, y, id]);
    assert.equal(expected.length, 121);
    if (frame.tiles.length < expected.length) {
      const placed = new Set(frame.tiles.map(([x, y, id]) => `${x},${y},${id}`));
      const missing = expected.filter(([x, y, id]) => !placed.has(`${x},${y},${id}`));
      assert.fail(`Missing ${missing.length} tile placements in ${routeName}: ${missing.map(([x, y, id]) => `(${x},${y}) ${id}`).join(", ")}`);
    }
    assert.deepEqual(frame.tiles, expected);
    for (const [, , id] of expected) {
      assert.ok(id.startsWith(`tile:${area}:`), id);
      patterns.add(id);
    }
    await waitFor("121 individually anchored 4× tiles", () => run(`(() => {
      if (state.sequence !== ${frame.sequence}) return false;
      const tiles = [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")];
      const expected = ${JSON.stringify(expected)};
      return tiles.length === expected.length && expected.every(([x, y, id], index) => {
        const image = tiles[index];
        const left = (8 + (x - 24) * 120 / 88) / 3.2;
        const top = (8 + (y - 24) * 120 / 88) / 2;
        return image.getAttribute("src") === "/art/" + id &&
          image.naturalWidth === 32 && image.naturalHeight === 32 &&
          Math.abs(parseFloat(image.style.left) - left) < .001 &&
          Math.abs(parseFloat(image.style.top) - top) < .001;
      });
    })()`));
    return 1;
  }

  if (moonseaTravel) {
    assert.equal(frame.overlandMap, true);
    assert.deepEqual([frame.travel.x, frame.travel.y, frame.travel.sector], [27, 8, 1]);
    await command("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    const landmark = 'document.querySelector("[data-destination=lizardmen]")';
    await waitFor("the illustrated Moonsea map", () => run(`
      !document.querySelector("#travel-map").hidden && !document.querySelector("#map-toggle").disabled`));
    await run(`(() => {
      const marker = ${landmark};
      marker.focus();
      marker.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
      if (!activeTravel) throw new Error("Enter did not start Moonsea travel");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }));
      if (activeTravel) throw new Error("Escape did not cancel Moonsea travel");
    })()`);
    const stopped = await waitFor("the in-flight step after Escape", async () => {
      const current = await latest();
      return current.ready && current.sequence === frame.sequence + 1 && current;
    });
    assert.deepEqual([stopped.travel.x, stopped.travel.y, stopped.travel.sector], [27, 9, 1]);
    await waitFor("map controls returning after cancellation", () => run(`state.sequence === ${stopped.sequence} &&
      !activeTravel && !document.querySelector("#map-toggle").disabled`));
    await run('document.querySelector("#map-toggle").click()');
    const point = await waitFor("the expanded Lizardman Keep landmark", () => run(`(() => {
      const marker = ${landmark};
      if (!document.querySelector("#travel-map").classList.contains("expanded") ||
          marker.getAttribute("aria-disabled") !== "false") return;
      const { x, y, width, height } = marker.getBoundingClientRect();
      return { x: x + width / 2, y: y + height / 2 };
    })()`));
    await command("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
    await waitFor("the landmark hover glow", () => run(`getComputedStyle(${landmark}).filter.includes("drop-shadow")`));
    for (const type of ["mousePressed", "mouseReleased"]) {
      await command("Input.dispatchMouseEvent", { type, ...point, button: "left", clickCount: 1 });
    }
    frame = await waitFor("travel stopping at the native drawbridge", async () => {
      const current = await latest();
      return current.ready && current.portrait === "portrait:PIC8.DAX:24:0:0" &&
        /37,8.*WILLYOUENTERTHERUINEDCASTLE/i.test(current.text.map(([, char]) => String.fromCharCode(char)).join("")) && current;
    });
    await waitFor("the drawbridge illustration", () => run(`state.sequence === ${frame.sequence} &&
      !activeTravel && document.querySelector("#travel-map").hidden &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    for (const key of ["e", "enter"]) await advance(key);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /ANTI-MAGICSHELL/i);
    await advance("enter");
    assert.ok(frame.exploration && !frame.overlandMap);
    await waitForExplorationViewport();
    await switchBothWays();
    console.log("Verified Moonsea keyboard travel, Escape cancellation, click-to-travel, and the return to WebGL.");
  } else if (travelDestination) {
    const { id, area, prompt, start, world, combat, approach } = travelDestination;
    const marker = `document.querySelector('[data-destination="${world ? id : "phlan"}"]')`;
    await waitFor("the illustrated destination to become available", () => run(`${marker}.getAttribute("aria-disabled") === "false"`));
    await run(`(() => {
      window.destinationTravelKeys = [];
      const gameFetch = window.fetch.bind(window);
      window.fetch = (url, options) => {
        if (url === "/key") destinationTravelKeys.push(options.body);
        return gameFetch(url, options);
      };
      ${marker}.dispatchEvent(new MouseEvent("click"));
    })()`);
    if (!world) {
      if (approach) await run('document.querySelector("#phlan-approaches summary").click()');
      const button = `document.querySelector('[data-approach="${id}"]')`;
      assert.equal(await run(`${button}.disabled`), false);
      await run(`${button}.click()`);
    }
    await waitFor("the destination route to settle", () => run(`state.ready && state.sequence > ${frame.sequence} && !activeTravel`));
    frame = await latest();
    const glyphs = frame.text.toSorted(([left], [right]) => left - right);
    const message = glyphs.filter(([cell]) => cell >= 640 && cell < 960).map(([, char]) => String.fromCharCode(char)).join("");
    const menu = glyphs.filter(([cell]) => cell >= 960).map(([, char]) => String.fromCharCode(char)).join("");
    if (combat) {
      assert.match(message, /ASCREAMINGHORDEOFKOBOLDSATTACKSTHEPARTY/i);
      assert.equal(frame.travel, undefined);
      assert.equal(await run('document.querySelector("#travel-map").hidden'), true);
    } else if (prompt) assert.match(message + menu, prompt);
    else assert.equal(frame.exploration?.area, area, JSON.stringify({ message, menu, scenery: frame.scenery?.mapId,
      pose: frame.scenery && [frame.scenery.x, frame.scenery.y, frame.scenery.facing] }));
    const keys = await run("destinationTravelKeys.filter(key => key !== ':travel-poll')");
    assert.deepEqual(keys.slice(0, start.length), start);
    if (world || approach) assert.deepEqual(keys, start, "A Moonsea prompt or combat should stop further input");
    else assert.ok(keys.slice(start.length).every(key => ["up", "left", "right"].includes(key)));
    if (combat) {
      await advance("enter");
      const battleMenu = frame.text.filter(([cell]) => cell >= 960).toSorted(([left], [right]) => left - right)
        .map(([, char]) => String.fromCharCode(char)).join("");
      assert.match(battleMenu, /ABATTLEBEGINS/i);
      assert.ok(!frame.travel && !frame.overlandMap);
      assert.equal(await run("Boolean(activeTravel)"), false);
    }
    await switchBothWays();
    console.log(`Verified ${routeName} in Chrome.`);
  } else if (questLockedTravel) {
    const locked = ["nomads", "buccaneers", "zhentil"];
    for (const id of locked) assert.equal(frame.travel?.routes[id], undefined);
    await waitFor("the Moonsea map with locked destinations", () => run(`!document.querySelector("#travel-map").hidden &&
      !document.querySelector("#map-toggle").disabled`));
    const result = await run(`(() => {
      const locked = ${JSON.stringify(locked)};
      const markers = locked.map(id => {
        const marker = document.querySelector('[data-destination=' + id + ']');
        const attributes = [marker.getAttribute("aria-disabled"), marker.getAttribute("tabindex")];
        marker.dispatchEvent(new MouseEvent("click"));
        marker.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
        return attributes;
      });
      document.querySelector("#map-toggle").click();
      const expanded = document.querySelector("#travel-map").classList.contains("expanded");
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
      return {markers, expanded};
    })()`);
    assert.deepEqual(result.markers, locked.map(() => ["true", "-1"]));
    assert.equal(result.expanded, true);
    await waitFor("Classic with the illustrated map closed", () => run(`document.querySelector("#travel-map").hidden &&
      document.querySelector("#game-text").hidden && !activeTravel`));
    assert.deepEqual(await latest(), frame);
    console.log("Verified unavailable quest routes and Classic map isolation in Chrome.");
  } else if (valjevoTravel) {
    const landmark = 'document.querySelector("[data-destination=valjevo]")';
    await waitFor("the Valjevo Castle landmark", () => run(`${landmark}.getAttribute("aria-disabled") === "false"`));
    await run(`(() => {
      window.valjevoTravelKeys = [];
      const gameFetch = window.fetch.bind(window);
      window.fetch = (url, options) => {
        if (url === "/key") valjevoTravelKeys.push(options.body);
        return gameFetch(url, options);
      };
      ${landmark}.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    })()`);
    await waitFor("the Valjevo Castle route to settle", () => run(`state.ready && state.sequence > ${frame.sequence} && !activeTravel`));
    frame = await latest();
    const text = frame.text.toSorted(([left], [right]) => left - right).map(([, char]) => String.fromCharCode(char)).join("");
    const keys = await run("valjevoTravelKeys.filter(key => key !== ':travel-poll')");
    assert.deepEqual(keys.slice(0, 3), ["down", "enter", "n"], "Use the western crossroads and the original north entrance");
    assert.ok(keys.slice(3).every(key => ["up", "left", "right"].includes(key)), "Hand off any prompt after the crossroads");
    if (routeName === "moonsea-valjevo-gate-warning") {
      assert.equal(frame.scenery?.mapId, 9, text);
      assert.match(text, /BEFOREYOUISSTOJANOWGATE/i);
      assert.match(text, /PRESS.*CONTINUE/i);
    } else {
      assert.equal(frame.exploration?.area, 6, text);
      assert.deepEqual([frame.scenery.mapId, frame.scenery.x, frame.scenery.y, frame.scenery.facing], [6, 4, 15, 0]);
      await waitForExplorationViewport();
    }
    await switchBothWays();
    console.log(`Verified ${routeName} through Podol Plaza and Stojanow Gate in Chrome.`);
  } else if (sokalTravel) {
    const landmark = 'document.querySelector("[data-destination=sokal]")';
    await waitFor("the Sokal Keep landmark", () => run(`${landmark}.getAttribute("aria-disabled") === "false"`));
    await run(`(() => {
      window.sokalTravelKeys = [];
      const gameFetch = window.fetch.bind(window);
      window.fetch = (url, options) => {
        if (url === "/key") sokalTravelKeys.push(options.body);
        return gameFetch(url, options);
      };
      ${landmark}.dispatchEvent(new MouseEvent("click"));
    })()`);
    if (routeName !== "moonsea-sokal-free") {
      await waitFor("the native payer selection", () => run(`state.ready && !posting && !renderingSequence &&
        state.sokalPrompt === "payer" && activeTravel?.destination === "sokal"`));
      const payerFrame = await latest();
      assert.equal((await run("sokalTravelKeys")).at(-1), "s");
      if (routeName === "moonsea-sokal-decline") {
        await run(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }))`);
        assert.equal(await run("Boolean(activeTravel)"), false);
        assert.equal((await latest()).sequence, payerFrame.sequence);
      } else {
        await run(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", cancelable: true }))`);
      }
    }
    if (routeName !== "moonsea-sokal-decline") {
      await waitFor("the Sokal Keep route to settle", () => run(`state.ready && state.sequence > ${frame.sequence} && !activeTravel`));
      frame = await latest();
      const text = frame.text.map(([, char]) => String.fromCharCode(char)).join("");
      assert.equal(frame.exploration?.area, 21, text);
      assert.equal(frame.scenery?.mapId, 21, text);
      assert.deepEqual([frame.scenery.x, frame.scenery.y], [8, 14]);
      const keys = await run("sokalTravelKeys.filter(key => key !== ':travel-poll')");
      assert.equal(keys.at(-1), "enter", "The route should hand off after confirming boarding");
      assert.ok(["up", "enter"].includes(keys.at(-2)), "The original script can board on approach or Enter");
      if (routeName === "moonsea-sokal-free") assert.match(text, /THEBOATDISEMBARKSYOUATSOKALKEEP/i);
      await switchBothWays();
    }
    console.log(`Verified ${routeName} using the original New Phlan ferry in Chrome.`);
  } else if (atlasRoute) {
    const { areas, mapId, file } = atlasRoute;
    assert.ok(areas.includes(frame.exploration?.area));
    assert.equal(frame.exploration.mapId, mapId);
    const before = await latest();
    await waitFor("the map control", () => run('!document.querySelector("#map-toggle").disabled'));
    await run('document.querySelector("#map-toggle").click()');
    await waitFor("the Atlas tab", () => run('!document.querySelector("#atlas-map").hidden'));
    await run('document.querySelector("#atlas-map").click()');
    await waitFor("the current floor illustration", () => run(`
      document.querySelector("#atlas-sheet").value === ${JSON.stringify(file)} &&
      document.querySelector("#atlas-image").currentSrc.endsWith(${JSON.stringify("/atlas/" + file)}) &&
      document.querySelector("#atlas-image").naturalWidth > 0`));
    await run('document.querySelector("#local-map").click()');
    assert.equal(await run('document.querySelectorAll("#automap-svg .party").length'), 1);
    await switchBothWays();
    assert.ok(await run('document.querySelector("#automap").hidden'));
    assert.deepEqual(await latest(), before);
    console.log(`Verified automatic atlas selection for map ${mapId}, its Local view, and Classic isolation.`);
  } else if (routeName === "new-phlan-council-reward-reload") {
    await advance("j");
    assert.ok(frame.journal);
    const statuses = new Map(frame.journal.leads.map(({ id, status }) => [id, status]));
    assert.equal(statuses.get("commission-sokal"), "turned-in");
    assert.equal(statuses.get("commission-slums"), "offered");
    assert.equal(statuses.get("commission-records"), "offered");
    assert.equal(statuses.get("commission-auction"), "accepted");
    assert.ok(!frame.journal.leads.some(({ id }) => id.startsWith("auction-")));
    await waitFor("the Podal auction track button", () => run(`Boolean(document.querySelector('[data-lead-id="commission-auction"]'))`));
    await run(`document.querySelector('[data-lead-id="commission-auction"]').click()`);
    frame = await waitFor("the tracked Podal auction commission", async () => {
      const next = await latest();
      return next.ready && next.journal?.trackedId === "commission-auction" && next;
    });
    assert.match(frame.journal.objective.nextStep, /ask the harbor master.*podal plaza/i);
    assert.doesNotMatch(frame.journal.objective.nextStep, /wand|ogre|buyer/i);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Sokal reward and newly heard commissions after loading slot A.");
  } else if (freshRolf) {
    for (const key of ["enter", "enter", "enter", "enter", "enter", "y", "t", "s", "t",
      "enter", "k", "e", "y", "a", "a", "e", "b", "enter"]) await advance(key);
    assert.equal(await verifyTiledView(0, new Set()), 1);
    const approach = "encounter:area:0:SPRIT3.DAX:12:";
    await run(`
      window.rolfFrames = [];
      new MutationObserver(() => {
        const image = document.querySelector(".encounter-sprite");
        const id = image?.getAttribute("src");
        if (!id?.startsWith(${JSON.stringify("/art/" + approach)})) return;
        const frame = [id, image.naturalWidth, image.naturalHeight,
          document.querySelectorAll(".terrain-tile").length,
          Boolean(document.querySelector(".encounter-portrait"))];
        if (window.rolfFrames.at(-1)?.[0] !== id) window.rolfFrames.push(frame);
      }).observe(document.querySelector("#tile-art"), { childList: true });
    `);
    await advance("enter");
    assert.deepEqual(frame.encounter, [56, 32, approach + "0:0", 24, 80]);
    assert.deepEqual(frame.animation.map(({ encounter }) => encounter), [
      [64, 32, approach + "2:0", 8, 49],
      [56, 32, approach + "1:0", 24, 65],
      [56, 32, approach + "0:0", 24, 80],
    ]);
    const frames = [
      ["/art/" + approach + "2:0", 32, 196, 121, false],
      ["/art/" + approach + "1:0", 96, 260, 121, false],
      ["/art/" + approach + "0:0", 96, 320, 121, false],
    ];
    await waitFor("Rolf's three approach sprites", () => run("window.rolfFrames.length === 3"));
    assert.deepEqual(await run("window.rolfFrames"), frames);
    await waitFor("the completed approach at the input prompt", () => run("!animationFrame"));
    assert.equal(await verifyTiledView(0, new Set()), 1);
    const missingApproach = await command("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
      const original = state;
      const image = document.querySelector(".encounter-sprite");
      const geometry = node => [node.style.left, node.style.top, node.style.width, node.style.height].join(",");
      const [x, y, , width, height] = original.encounter;
      state = { ...original, encounter: [x, y, "encounter:missing-rolf-test", width, height] };
      try {
        await showScreen();
        const fallback = document.querySelector(".sprite-fallback");
        return fallback?.style.backgroundImage.includes(original.frame) && geometry(fallback) === geometry(image) &&
          document.querySelectorAll(".terrain-tile").length === 121 && !document.querySelector("#game-text").hidden;
      } finally {
        state = original;
        await showScreen();
      }
    })()` });
    assert.equal(missingApproach.result.value, true, missingApproach.exceptionDetails?.text ?? "A missing encounter sprite should preserve the enhanced scenery");
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:area:0:HEAD3.DAX:8:BODY3.DAX:9");
    await waitFor("Rolf portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await verifyPortraitPanel();
    const rolfDialogue = frame;
    await advance("j");
    assert.ok(frame.journal?.objective.nextStep);
    assert.equal(frame.portrait, rolfDialogue.portrait);
    await waitFor("Rolf's enhanced portrait behind the journal", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector("#journal").hidden && document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await advance("j");
    assert.equal(frame.journal, undefined);
    assert.equal(frame.frame, rolfDialogue.frame);
    assert.deepEqual(frame.text, rolfDialogue.text);
    const tourPatterns = new Set();
    await advance("enter");
    const templePortrait = "scene-illustration:area:0:ecl:af3f:caller:b256";
    assert.equal(frame.portrait, templePortrait);
    await waitFor("Rolf's Temple of Tyr illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${templePortrait}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    for (let stop = 1; stop < 7; stop++) {
      await advance("enter");
      if (stop === 2) {
        await verifyRolfTrainingSchools();
        continue;
      }
      assert.equal(frame.portrait, undefined);
      assert.equal(frame.perspective, true);
      assert.equal(await verifyTiledView(0, tourPatterns), 1);
    }
    for (const key of ["enter", "right", "right", "up", "up", "up"]) await advance(key);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /OUTSIDETHECITYHALL/i);
    assert.equal(await verifyTiledView(0, tourPatterns), 1);
    for (const key of ["up", "enter", "up"]) await advance(key);
    assert.equal(await verifyTiledView(0, tourPatterns), 1);
    await switchBothWays();
    for (const key of ["enter", "up", "enter", "up", "up", "enter"]) await advance(key);
    const councilGuard = "portrait:area:8:ecl:b564:HEAD3.DAX:57:BODY3.DAX:1";
    assert.equal(frame.portrait, councilGuard);
    assert.equal(frame.classicPortrait, false);
    await waitFor("the enhanced council guard", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${councilGuard}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await advance("y");
    assert.equal(frame.portrait, undefined);
    assert.equal(frame.classicPortrait, false);
    assert.equal(frame.perspective, true);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /4,5N.*AREACASTVIEWENCAMP/i);
    assert.equal(await verifyTiledView(8, tourPatterns), 1);
    await switchBothWays();
    console.log("Verified the enhanced dock, Rolf's approach, all seven tour stops, and the return to scenery after the City Hall guard in one fresh Chrome game.");
  } else if (routeName === "new-phlan-building-exit") {
    const patterns = new Set();
    for (const key of ["up", "right", "up", "right", "up", "left", "up"]) {
      await advance(key);
      assert.equal(await verifyTiledView(Number(frame.tiles[0][2].split(":")[1]), patterns), 1);
    }
    const textOf = ({ text }) => text.map(([, char]) => String.fromCharCode(char)).join("");
    assert.match(textOf(frame), /5,1W/i);
    assert.doesNotMatch(textOf(frame), /AREACASTVIEWENCAMP/i);
    assert.equal(frame.portrait, undefined);
    assert.equal(frame.classicPortrait, false);
    assert.equal(frame.perspective, true);
    const captureDoorway = async (name) => {
      await waitFor("the enhanced street without a portrait at the doorway", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll(".terrain-tile").length === 121 &&
        !document.querySelector(".encounter-portrait")`));
      assert.ok(await run(`(() => {
        const context = document.querySelector("canvas.panel-frame")?.getContext("2d");
        return context?.getImageData(16, 16, 1, 1).data[3] === 255 &&
          !context.getImageData(32, 32, 480, 480).data.some((value, index) => index % 4 === 3 && value !== 0);
      })()`), "The doorway should have an outer frame and a clear picture panel");
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, name), Buffer.from(shot.data, "base64"));
    };
    await captureDoorway("dueling-room-before-enter.png");
    const doorway = frame;
    await advance("j");
    assert.ok(frame.journal?.objective.nextStep);
    assert.deepEqual(frame.tiles, doorway.tiles);
    await waitFor("enhanced doorway behind the open journal", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector("#journal").hidden && document.querySelectorAll(".terrain-tile").length === 121`));
    await switchBothWays();
    await advance("j");
    assert.equal(frame.journal, undefined);
    assert.deepEqual(frame.text, doorway.text);
    assert.equal(frame.frame, doorway.frame);
    assert.deepEqual(frame.tiles, doorway.tiles);
    await waitFor("the closed journal", () => run(`state.sequence === ${frame.sequence} && document.querySelector("#journal").hidden`));
    const beforeAudio = await latest();
    await run('document.querySelector("#audio-toggle").click(); document.querySelector("#audio-master").focus()');
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
    await command("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 });
    await waitFor("keyboard adjustment of the audio slider", () => run('Number(document.querySelector("#audio-master").value) < 0.8'));
    assert.deepEqual(await latest(), beforeAudio);
    await run('document.querySelector("#audio-toggle").focus(); document.activeElement.click()');
    assert.equal(await run("document.activeElement.id"), "screen");
    await command("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await command("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    frame = await waitFor("Enter to advance the doorway after closing Audio", async () => {
      const next = await latest();
      return next.ready && next.sequence > beforeAudio.sequence && next;
    });
    assert.equal(await verifyTiledView(11, patterns), 1);
    await advance("enter");
    assert.match(textOf(frame), /AREACASTVIEWENCAMP/i);
    assert.equal(await verifyTiledView(11, patterns), 1);
    assert.equal(frame.classicPortrait, false);
    await captureDoorway("dueling-room-after-enter.png");
    await switchBothWays();
    const street = frame;
    await advance("e");
    if (/AREACASTVIEWENCAMP/i.test(textOf(frame))) await advance("e");
    const campMenu = ({ text }) => text.toSorted(([a], [b]) => a - b)
      .map(([, char]) => String.fromCharCode(char)).join("").replace(/\s/g, "");
    assert.match(campMenu(frame), /SAVEVIEWMAGICRESTALTEREXITJOURNAL/i);
    await advance("j");
    assert.ok(frame.journal?.objective.nextStep);
    await waitFor("the journal from the Encamp menu", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector("#journal").hidden`));
    assert.ok(!frame.journal.leads.some(({ id }) => id === priorPartyLead),
      "The loaded journal should replace the previous party's knowledge");
    for (const { id } of JSON.parse(originalSave).leads) {
      assert.ok(frame.journal.leads.some(lead => lead.id === id), `Expected saved journal lead ${id}`);
    }
    await advance("j");
    assert.equal(frame.journal, undefined);
    assert.match(campMenu(frame), /SAVEVIEWMAGICRESTALTEREXITJOURNAL/i);
    await advance("e");
    assert.match(textOf(frame), /AREACASTVIEWENCAMP/i);
    assert.equal(await verifyTiledView(0, patterns), 1);
    const scenery = ({ tiles }) => tiles.map(([x, y, id]) => [x, y, id.split(":")[2]]);
    assert.deepEqual(scenery(frame), scenery(street));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the enhanced street stays visible while exiting the New Phlan dueling room. Captures:", directory);
  } else if (wideManualAim) {
    const lizard = "combat:area:29:CPIC8.DAX:59:ecl:aa7a";
    const marker = "combat-selection:COMSPR.DAX:25";
    const fullSelection = [[56, 104, marker], [80, 104, marker]];
    for (const key of ["s", "up", ...Array(6).fill("enter"), "a", "n"]) await advance(key);
    assert.deepEqual(frame.combatSelections, fullSelection);
    for (const [key, x] of [["m", 56], ["right", 80]]) {
      await advance(key);
      assert.deepEqual(frame.combatSelections, [[x, 104, marker]]);
      assert.deepEqual(frame.combatArt.find(([left, top, id]) => left === 56 && top === 104 && id === lizard),
        [56, 104, lizard, false, false, 48, 24]);
      assert.deepEqual(frame.combatArt.find(([left, top, id]) => left === -16 && top === 56 && id === lizard),
        [-16, 56, lizard, false, false, 48, 24]);
      await waitFor("a single Manual Aim reticle under the enhanced giant lizard", () => run(`(() => {
        if (state.sequence !== ${frame.sequence} || animationFrame) return false;
        const layers = [...document.querySelector('#tile-art').children];
        const sprite = layers.find(layer => layer.getAttribute('src') === '/art/${lizard}' &&
          parseFloat(layer.style.left) === ${56 / 3.2} && parseFloat(layer.style.top) === ${104 / 2});
        const clipped = layers.find(layer => layer.getAttribute('src') === '/art/${lizard}' &&
          parseFloat(layer.style.left) === ${-16 / 3.2} && parseFloat(layer.style.top) === ${56 / 2});
        const reticles = layers.filter(layer => layer.matches('.combat-aim-reticle'));
        const reticle = reticles[0];
        return sprite?.naturalWidth === 192 && clipped?.naturalWidth === 192 && clipped.style.clipPath === 'inset(0% 0% 0% 50%)' &&
          reticles.length === 1 && layers.indexOf(reticle) < layers.indexOf(sprite) &&
          reticle.classList.contains('combat-aim-reticle-backed') && parseFloat(reticle.style.left) === ${x / 3.2} &&
          parseFloat(reticle.style.top) === ${104 / 2} && parseFloat(reticle.style.width) === 7.5;
      })()`));
    }
    const shot = await command("Page.captureScreenshot", { format: "png" });
    const proof = resolve(directory, "kuto-wide-manual-aim.png");
    writeFileSync(proof, Buffer.from(shot.data, "base64"));
    await switchBothWays(frame.frame);
    await advance("escape");
    assert.deepEqual(frame.combatSelections, fullSelection);
    assert.ok(frame.combatArt.some(([, , id, , highlighted]) => id === lizard && highlighted));
    for (const key of ["m", "left", "left", "up", "up"]) await advance(key);
    assert.deepEqual(frame.combatSelections, [[8, 56, marker]]);
    assert.deepEqual(frame.combatArt.find(([x, y, id]) => x === -16 && y === 56 && id === lizard),
      [-16, 56, lizard, false, false, 48, 24]);
    await waitFor("a backed Manual Aim reticle at the clipped giant lizard", () => run(`(() => {
      if (state.sequence !== ${frame.sequence} || animationFrame) return false;
      const layers = [...document.querySelector('#tile-art').children];
      const sprite = layers.find(layer => layer.getAttribute('src') === '/art/${lizard}' &&
        parseFloat(layer.style.left) === -5 && parseFloat(layer.style.top) === 28);
      const reticles = layers.filter(layer => layer.matches('.combat-aim-reticle'));
      const reticle = reticles[0];
      return sprite?.naturalWidth === 192 && sprite.style.clipPath === 'inset(0% 0% 0% 50%)' &&
        reticles.length === 1 && layers.indexOf(reticle) < layers.indexOf(sprite) &&
        reticle.classList.contains('combat-aim-reticle-backed') && parseFloat(reticle.style.left) === 2.5 &&
        parseFloat(reticle.style.top) === 28;
    })()`));
    const clippedShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "kuto-clipped-manual-aim.png"), Buffer.from(clippedShot.data, "base64"));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified both halves of the giant lizard in Manual Aim in Chrome:", proof);
  } else if (routeName === "buccaneer-empty-manual-aim") {
    const marker = "combat-selection:COMSPR.DAX:25";
    const inputs = ["up", "up", "enter", "enter", "a", "enter", "enter", "q", "q", "a", "m"];
    for (const key of inputs) await advance(key);
    for (const [key, x, y] of [["pageup", 104, 56], ["right", 128, 56], ["up", 128, 32], ["up", 128, 8]]) {
      await advance(key);
      assert.deepEqual(frame.combatSelections, [[x, y, marker]]);
      assert.ok(!frame.combatArt.some(([, , , , selected]) => selected));
      await waitFor("Enhanced empty aim marker", () => run(`
        state.sequence === ${frame.sequence} && !animationFrame &&
        [...document.querySelectorAll('.combat-selection[src="/art/${marker}"]')].some(image =>
          image.naturalWidth === 96 && Math.abs(parseFloat(image.style.left) - ${x / 3.2}) < 0.01 &&
          Math.abs(parseFloat(image.style.top) - ${y / 2}) < 0.01)`));
    }
    await switchBothWays(frame.frame);
    await advance("escape");
    assert.ok(!frame.combatSelections?.some(([x, y]) => x === 128 && y === 8));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Enhanced Manual Aim marker follows empty squares and clears on Escape.");
  } else if (stinkingCloud) {
    const cloud = "combat:RANDCOM.DAX:1:0:4";
    const cells = ({ combatArt }) => combatArt.filter(([, , id]) => id === cloud);
    for (const key of ["up", ...Array(5).fill("enter"), "space", "d", "g", "d", "g",
      ...Array(15).fill("enter"), "c", "enter", "n", "n", "t"]) await advance(key);
    const frames = [frame, ...(frame.animation ?? [])];
    for (const key of ["y", "enter", "enter"]) {
      await advance(key);
      frames.push(...(frame.animation ?? []), frame);
    }
    const drawn = frames.filter(candidate => cells(candidate).length);
    const textOf = ({ text }) => text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("").replace(/\s/g, "");
    assert.ok(drawn.some(candidate => /MIRACreatesanoxiouscloud/i.test(textOf(candidate))));
    const choking = drawn.find(candidate => /DORNchokesandgagsfromnausea/i.test(textOf(candidate)));
    assert.ok(choking);
    const placements = [[80, 80], [104, 80], [80, 104], [104, 104]];
    assert.deepEqual(cells(choking), placements.map(([x, y]) => [x, y, cloud, false]));
    const stack = choking.combatArt.filter(([x, y]) => x === 80 && y === 80);
    assert.equal(stack[0]?.[2], cloud);
    assert.match(stack[1]?.[2] ?? "", /^combat:party:/);
    assert.deepEqual(cells(frame), []);
    await run(`animationFrame = ${JSON.stringify(choking)}; showScreen();`);
    await waitFor("all four Enhanced cloud tiles", () => run(`${JSON.stringify(placements)}.every(([x, y]) =>
      [...document.querySelectorAll('.combat-sprite[src="/art/${cloud}"]')].some(image => image.naturalWidth === 96 &&
        Math.abs(parseFloat(image.style.left) - x / 3.2) < 0.01 && Math.abs(parseFloat(image.style.top) - y / 2) < 0.01))`));
    await switchBothWays(choking.frame);
    await run('finishAnimation(); showScreen();');
    await waitFor("the settled battlefield without cloud tiles", () => run(`
      !animationFrame && !document.querySelector('.combat-sprite[src="/art/${cloud}"]')`));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified Stinking Cloud placement, reports, and cleanup in Chrome.");
  } else if (routeName === "new-phlan-council-magic-effects" || defeatEffect || projectile || reflectedEffect) {
    await run(`window.observedEffects = [];
      const originalFetch = window.fetch.bind(window);
      window.fetch = (url, options) => url === "/key" && options?.body === ":poll"
        ? Promise.resolve(new Response(null, {status: 409})) : originalFetch(url, options);
      const art = document.querySelector("#tile-art");
      new MutationObserver(() => {
        const layers = [...art.children];
        for (const image of art.querySelectorAll(".combat-effect")) {
          if (image.naturalWidth !== 96 || image.naturalHeight !== 96) continue;
          window.observedEffects.push({ source: image.getAttribute("src"), left: parseFloat(image.style.left),
            top: parseFloat(image.style.top), aboveActors: !layers.slice(layers.indexOf(image) + 1)
              .some(layer => layer.matches(".combat-sprite")) });
        }
      }).observe(art, {childList: true});`);
    if (projectile) {
      for (const key of ["up", "up", "enter", "enter", "a", "enter", "enter", "q", "q", ...(projectile.inputs ?? [])]) {
        await advance(key);
      }
      const ids = projectile.phases.map(phase => `combat-effect:COMSPR.DAX:${phase}`);
      const flight = (frame.animation ?? []).filter(({ combatEffect }) => ids.includes(combatEffect?.[2]));
      const placements = flight.map(({ combatEffect }) => combatEffect);
      assert.equal(frame.combatEffect, undefined);
      assert.equal(placements.length, 6);
      assert.deepEqual(placements[0], [...(projectile.launch ?? [56, 56]), ids[0]]);
      assert.deepEqual(placements.at(-1), [...(projectile.landing ?? [104, 104]), ids.at(-1)]);
      assert.deepEqual([...new Set(placements.map(([, , id]) => id))].sort(), ids.toSorted());
      assert.ok(flight.every(({ durationMs }) => durationMs === 55));
      const reports = (frame.animation ?? []).map(({ text }) => text.toSorted(([a], [b]) => a - b)
        .map(([, char]) => String.fromCharCode(char)).join(""));
      const hit = new RegExp(`${projectile.archer ?? "DORN"}ATTACKSBUCCANEERHITTINGFOR${projectile.damage}POINTSOFDAMAGE`, "i");
      assert.ok(reports.some(text => hit.test(text)));
      if (!projectile.archer) assert.ok(reports.some(text => /BUCCANEERGOESDOWNANDISDYING/i.test(text)));
      await waitFor("the projectile playback and cleanup", () => run(`state.sequence === ${frame.sequence} &&
        !animationFrame && !document.querySelector(".combat-effect") &&
        ${JSON.stringify(placements)}.every(([x, y, id]) => window.observedEffects.some(effect =>
          effect.source === "/art/" + id && Math.abs(effect.left - x / 3.2) < 0.01 &&
          Math.abs(effect.top - y / 2) < 0.01 && effect.aboveActors))`));
      await switchBothWays(frame.frame);
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log(`Verified ${routeName} flight, combat reports and display switching in Chrome.`);
    } else if (reflectedEffect) {
      for (const key of reflectedEffect.inputs) await advance(key);
      const effectKey = (block) => `combat-effect:COMSPR.DAX:${block}:flip-x`;
      const [arrow, launch, landing] = reflectedEffect.arrow;
      const arrowKey = effectKey(arrow);
      for (let turn = 1; turn <= reflectedEffect.arrowTurn; turn++) {
        await advance("q");
        if (turn !== reflectedEffect.missileTurn && turn !== reflectedEffect.arrowTurn) continue;
        const missile = turn === reflectedEffect.missileTurn;
        const ids = missile ? [effectKey(10), effectKey(138)] : [arrowKey];
        const entries = (frame.animation ?? []).filter(({ combatEffect }) => ids.includes(combatEffect?.[2]));
        const placements = entries.map(({ combatEffect }) => combatEffect);
        assert.ok(entries.every(({ durationMs, frame, enhancedFrame }) =>
          durationMs === (missile ? 110 : 55) && frame !== enhancedFrame));
        if (missile) {
          assert.deepEqual(placements, ids.map(id => [56, 56, id]));
        } else {
          assert.equal(placements.length, 6);
          assert.deepEqual(placements[0], [...launch, arrowKey]);
          assert.deepEqual(placements.at(-1), [...landing, arrowKey]);
        }
        assert.equal(frame.combatEffect, undefined);
        await waitFor("the reflected effect and its cleanup", () => run(`state.sequence === ${frame.sequence} &&
          !animationFrame && !document.querySelector(".combat-effect") &&
          ${JSON.stringify(placements)}.every(([x, y, id]) => window.observedEffects.some(effect =>
            effect.source === "/art/" + id && Math.abs(effect.left - x / 3.2) < 0.01 &&
            Math.abs(effect.top - y / 2) < 0.01 && effect.aboveActors))`));
      }
      await switchBothWays(frame.frame);
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log(`Verified ${routeName} positions, layering and display switching in Chrome.`);
    } else if (defeatEffect) {
      const inputs = partyDefeatEffect
        ? ["up", "enter", "enter", "c", "enter", "enter", "enter", ...Array(13).fill("q")]
        : ["up", "up", "enter", "enter", "a", "enter", "enter", "q", "q"];
      for (const key of inputs) await advance(key);
      const [x, y] = partyDefeatEffect ? [8, 80] : [104, 104];
      const id = "combat-effect:COMSPR.DAX:11";
      const marker = frame.animation?.find(entry => entry.combatEffect?.[2] === id);
      assert.deepEqual(marker?.combatEffect, [x, y, id]);
      assert.equal(frame.combatEffect, undefined);
      const reports = [...frame.animation, frame].map(({ text }) => text.toSorted(([a], [b]) => a - b)
        .map(([, c]) => String.fromCharCode(c)).join(""));
      const hit = partyDefeatEffect ? /HILLGIANTATTACKSRHIANNONHITTINGFOR9POINTSOFDAMAGE/i
        : /DORNATTACKSBUCCANEERHITTINGFOR[1-9]\d*POINTSOFDAMAGE/i;
      const dying = partyDefeatEffect ? /RHIANNONGOESDOWNANDISDYING/i : /BUCCANEERGOESDOWN/i;
      assert.ok(reports.some(text => hit.test(text)));
      assert.ok(reports.some(text => dying.test(text)));
      await waitFor("the skull marker and its cleanup", () => run(`state.sequence === ${frame.sequence} &&
        !animationFrame && !document.querySelector(".combat-effect") && window.observedEffects.some(effect =>
          effect.source === "/art/${id}" && effect.left === ${x / 3.2} && effect.top === ${y / 2} && effect.aboveActors)`));
      await switchBothWays(frame.frame);
      console.log(`Verified ${routeName}, including the skull marker and native combat reports in Chrome.`);
    } else {
      for (const key of ["up", "enter", "n", "enter", "enter", "enter"]) await advance(key);
      const effects = new Map();
      let capturedEffect;
      const arrowId = "combat-effect:COMSPR.DAX:0";
      const arrowPath = [];
      for (let turn = 0; turn < 23 && !effects.has(arrowId); turn++) {
        await advance("q");
        assert.equal(frame.combatEffect, undefined);
        const rendered = (frame.animation ?? []).filter(entry => entry.combatEffect);
        if (!rendered.length) continue;
        for (const entry of rendered) {
          const [x, y, id] = entry.combatEffect;
          effects.set(id, [x, y]);
          capturedEffect ??= entry;
          if (id === arrowId) arrowPath.push([x, y]);
          assert.notEqual(entry.frame, entry.enhancedFrame);
        }
        await waitFor("native effect animation to finish", () => run(`state.sequence === ${frame.sequence} &&
          !animationFrame && !document.querySelector(".combat-effect")`));
      }
      const ids = [5, 133, 10, 138, 0].map(id => `combat-effect:COMSPR.DAX:${id}`);
      assert.ok(ids.every(id => effects.has(id)));
      assert.deepEqual([...effects.keys()].filter(id => id.endsWith(":10") || id.endsWith(":138")), ids.slice(2, 4));
      assert.deepEqual(arrowPath[0], [80, 80]);
      assert.deepEqual(arrowPath.at(-1), [56, 32]);
      const observed = await run("window.observedEffects");
      for (const [id, [x, y]] of effects) {
        assert.ok(observed.some(({ source, left, top, aboveActors }) => source === `/art/${id}` &&
          Math.abs(left - x / 3.2) < 0.01 && Math.abs(top - y / 2) < 0.01 && aboveActors));
      }
      // Hold one already observed animation frame while switching its presentation.
      await run(`animationFrame = ${JSON.stringify(capturedEffect)}; showScreen();`);
      await waitFor("the held Enhanced combat effect", () => run('document.querySelector(".combat-effect")?.naturalWidth === 96'));
      await switchBothWays(capturedEffect.frame);
      await run('finishAnimation(); showScreen();');
      await waitFor("the settled Enhanced battlefield", () => run('!animationFrame && !document.querySelector(".combat-effect")'));
      console.log("Verified Council magic and arrow effects, actor layering, and cleanup in Chrome.");
    }
  } else if (routeName === "new-phlan-arena-quick" || routeName === "new-phlan-arena-manual-report") {
    await run(`window.combatReports = [];
      new MutationObserver(() => {
        const text = document.querySelector("#game-text").textContent;
        if (/Attacks.*(?:damage|Misses)/i.test(text)) window.combatReports.push(text);
      }).observe(document.querySelector("#game-text"), { childList: true });`);
    const manualReports = [];
    for (const key of [...arenaApproach, "enter", "left", "up", "enter", "enter", "y", "enter", "enter", "enter"]) {
      await advance(key);
      manualReports.push(...(frame.animation ?? []).filter(({ durationMs }) => durationMs >= 1000));
    }
    const textOf = ({ text }) => text.toSorted(([left], [right]) => left - right)
      .map(([, char]) => String.fromCharCode(char)).join("");
    assert.ok(manualReports.some(report => /ROLF.*ATTACKS.*ALDA.*HITTINGFOR3.*DAMAGE/i.test(textOf(report))));
    await waitFor("Rolf's combat report in the original panel", () =>
      run('window.combatReports.some(text => /ROLF.*Attacks.*ALDA.*Hittingfor3.*damage/i.test(text))'));
    assert.match(textOf(frame), /HITPOINTS.*QUICKDONE/i);
    assert.equal(frame.automaticCombat, undefined);
    if (routeName === "new-phlan-arena-manual-report") {
      const miss = /ALDA.*ATTACKS.*ROLF.*ANDMISSES/i;
      await run(`window.reportSwitch = null;
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          const glyphs = animationFrame?.text.toSorted(([a], [b]) => a - b);
          const text = glyphs?.map(([, char]) => String.fromCharCode(char)).join("");
          if (!text || !${miss}.test(text)) return decode.call(this);
          HTMLImageElement.prototype.decode = decode;
          return new Promise(resolve => setTimeout(resolve, 1200)).then(() => decode.call(this));
        };
        const panel = document.querySelector("#game-text");
        const observer = new MutationObserver(async () => {
          if (!animationFrame || !${miss}.test(panel.textContent)) return;
          observer.disconnect();
          const report = animationFrame;
          document.querySelector("#presentation").click();
          const pausedDuringDecode = animationTimer === undefined;
          await showScreen();
          const classic = panel.hidden;
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
          await showScreen();
          window.reportSwitch = pausedDuringDecode && classic && animationFrame === report && !panel.hidden && ${miss}.test(panel.textContent);
        });
        observer.observe(panel, { childList: true });`);
      for (const key of ["m", "right", "right", "down"]) await advance(key);
      assert.ok(frame.animation?.some(report => report.durationMs >= 1000 && miss.test(textOf(report))));
      await waitFor("the player-directed miss in the original panel", () =>
        run(`window.combatReports.some(text => ${miss}.test(text))`));
      await waitFor("the same combat report after switching modes", () => run("window.reportSwitch === true"));
      const reportProof = await waitFor("a screenshot of Alda's combat report", async () => {
        const visible = () => run(`!document.querySelector("#game-text").hidden &&
          ${miss}.test(document.querySelector("#game-text").textContent)`);
        if (!await visible()) return;
        const shot = await command("Page.captureScreenshot", { format: "png" });
        return await visible() && shot;
      });
      const reportPath = resolve(directory, "arena-manual-report.png");
      writeFileSync(reportPath, Buffer.from(reportProof.data, "base64"));
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified the player-directed combat report in Chrome:", reportPath);
    } else {
      const manual = await fetch(origin + "/key", {
        method: "POST", headers: { Origin: origin, "X-POR-Frame": String(frame.sequence) }, body: ":poll",
      });
      assert.equal(manual.status, 400);
      await waitFor("the manual combat menu", () => run(`state.sequence === ${frame.sequence} && state.ready`));
      await run(`window.quickPollAttempts = 0;
        const fetchGame = window.fetch.bind(window);
        window.fetch = (url, options) => {
          if (url === "/key" && options?.body === ":poll") {
            const attempt = ++window.quickPollAttempts;
            if (attempt === 1) return Promise.reject(new TypeError("Simulated connection interruption"));
            if (attempt === 2) {
              // Model a newly attached browser while the guest is still waiting.
              state = { sequence: -1 };
              return Promise.reject(new TypeError("Simulated client reconnect"));
            }
          }
          return fetchGame(url, options);
        };`);
      await run('window.dispatchEvent(new KeyboardEvent("keydown", { key: "q", code: "KeyQ" }))');
      const automatic = await waitFor("native Quick poll", async () => {
        const state = await latest();
        return state.automaticCombat && state;
      });
      // This end-to-end wait includes the real display time of every combat report.
      const decision = await waitFor("the arena decision after one Quick key", async () => {
        const state = await latest();
        return state.sequence > automatic.sequence + 1 && !state.automaticCombat &&
          /CONTINUEBATTLE:YESNO/i.test(textOf(state)) && state;
      }, 90_000);
      assert.equal(decision.stopped, null);
      assert.ok(await run("window.quickPollAttempts > 2"));
      const reports = await run("window.combatReports");
      assert.ok(reports.some(text => /ALDA.*ATTACKS.*ROLF.*MISSES/i.test(text)));
      assert.ok(reports.some(text => /ALDA.*ATTACKS.*ROLF.*HITTINGFOR2.*DAMAGE/i.test(text)));
      frame = decision;
      await waitFor("the rendered Continue Battle prompt", () => run(`state.sequence === ${decision.sequence} &&
        state.ready && !animationFrame && !document.querySelector("#game-text").hidden &&
        /CONTINUEBATTLE:YESNO/i.test(document.querySelector("#game-text").textContent.replace(/\\s+/g, ""))`));
      await switchBothWays();
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified one Quick key advances native combat to the manual Continue Battle prompt.");
    }
  } else if (towerReload || dungeonReload) {
    const expected = JSON.parse(readFileSync(resolve(dirname(checkpoint), "valjevo-save-scene.json"), "utf8"));
    assert.deepEqual(frame.tileInventory, expected.tiles);
    assert.deepEqual(frame.text.toSorted(([left], [right]) => left - right), expected.text);
    if (towerReload) assert.equal(await verifyTiledView(7, new Set()), 1);
    await switchBothWays();
    console.log(`Verified the same scenery, party, and menu on ${routeName} in Chrome.`);
  } else if (dungeonSave) {
    assert.equal(await verifyTiledView(5, new Set()), 1);
    await switchBothWays();
    const wing = frame.tileInventory;
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.tileInventory?.length, 121);
    assert.notDeepEqual(frame.tileInventory, wing);
    assert.equal(await verifyTiledView(3, new Set()), 1);
    const expected = { tiles: frame.tileInventory, text: frame.text.toSorted(([left], [right]) => left - right) };
    for (const key of ["e", "s", "s", "b"]) await advance(key);
    assert.notDeepEqual(readFileSync(saved), originalSave);
    writeFileSync(resolve(directory, "valjevo-save-scene.json"), JSON.stringify(expected));
    console.log("Native save:", saved);
  } else if (environment) {
    const area = environment.area ?? 2;
    const actor = environment.sceneryOnly ? undefined
      : area === 10 ? "encounter:area:10:SPRIT4.DAX:34:0:0"
      : area === 9 ? "encounter:area:9:SPRIT2.DAX:63:0:0" : undefined;
    const patterns = new Set();
    const transition = environment.transition;
    let views = await verifyTiledView(area, patterns);
    const canalWalk = routeName.startsWith("new-phlan-canal-");
    async function captureCanalView(point) {
      const shot = await command("Page.captureScreenshot", { format: "png" });
      const screenshot = resolve(directory, `${routeName}-${point}.png`);
      writeFileSync(screenshot, Buffer.from(shot.data, "base64"));
      console.log("Canal capture:", screenshot);
    }
    if (canalWalk) await captureCanalView("start");
    if (routeName === "nomad-camp-rim") {
      await advance("j");
      assert.ok(!frame.journal.leads.some(({ id }) => id === "nomad-swords-ready"));
      await advance("j");
    }
    const grishnakTemple = routeName === "textile-temple" || routeName === "textile-temple-native";
    const southShopMenu = routeName === "new-phlan-south-shop-menu-exit";
    const phlanExit = southShopMenu || /^new-phlan-(?:south-shop|west-shop|training|tavern-back)-exit$/.test(routeName);
    let exitPauseTiles;
    let sawGrishnakApproach = false;
    if (environment.approachSequence) await observeApproach(environment.approachSequence);
    for (const key of environment.walk) {
      const previousTiles = frame.tiles;
      await advance(key);
      if (actor && frame.encounter) assert.deepEqual(frame.tiles, previousTiles);
      if (grishnakTemple && frame.encounter) {
        assert.deepEqual(frame.encounter, [48, 32, "encounter:area:2:ecl:a66a:SPRIT4.DAX:6:0:0", 48, 80]);
        assert.deepEqual(frame.tiles, previousTiles);
        await waitFor("enhanced Grishnak approach", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector(".encounter-sprite")?.naturalWidth === 192`));
        sawGrishnakApproach = true;
      }
      if (routeName === "new-phlan-south-shop-exit") {
        if (classicPortrait && key === "enter" && views === 2) {
          assert.equal(frame.perspective, false);
          assert.equal(frame.portrait, undefined);
          assert.equal(frame.classicPortrait, true);
          assert.ok(frame.classicPortraitSources?.includes(southShopkeeper));
          await waitFor("the classic shopkeeper in Enhanced layout", () => run(`state.sequence === ${frame.sequence} &&
            !document.querySelector("#game-text").hidden && Boolean(document.querySelector(".perspective-backdrop"))`));
        }
        if (!classicPortrait && key === "enter" && views === 2) {
          assert.equal(frame.perspective, false);
          assert.equal(frame.portrait, southShopkeeper);
          await waitFor("the enhanced shopkeeper", () => run(`state.sequence === ${frame.sequence} &&
            document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
          const result = await command("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
            const original = state;
            state = { ...original, portrait: "portrait:missing-shop-test" };
            try {
              await showScreen();
              const picture = document.querySelector(".perspective-backdrop");
              return !document.querySelector("#tile-art").hidden && !document.querySelector("#game-text").hidden &&
                picture?.style.backgroundImage.includes(original.enhancedFrame) &&
                !document.querySelector(".encounter-portrait");
            } finally {
              state = original;
              await showScreen();
            }
          })()` });
          assert.equal(result.result.value, true, result.exceptionDetails?.text ?? "A missing portrait should preserve the enhanced picture panel");
        }
      }
      const viewArea = transition && views >= transition.afterViews ? transition.area : area;
      const tiledView = await verifyTiledView(viewArea, patterns);
      views += tiledView;
      if (tiledView && views === environment.captureView) {
        const shot = await command("Page.captureScreenshot", { format: "png" });
        const screenshot = resolve(directory, `${routeName}.png`);
        writeFileSync(screenshot, Buffer.from(shot.data, "base64"));
        console.log("Scene capture:", screenshot);
      }
      if (routeName === "zhentil-east-passage-north" && views === 6 && tiledView) {
        assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /15,5N/i);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        const screenshot = resolve(directory, "zhentil-corridor-floor.png");
        writeFileSync(screenshot, Buffer.from(shot.data, "base64"));
        console.log("Zhentil corridor capture:", screenshot);
      }
      if (southShopMenu && key === "y") {
        assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /BUY.*EXIT/i);
        assert.equal(frame.portrait, southShopkeeper);
        await waitFor("the enhanced shopkeeper behind the shop menu", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
      }
      if (phlanExit && (key === (southShopMenu ? "e" : "n") || exitPauseTiles)) {
        assert.equal(tiledView, 1, "The doorway should render enhanced scenery on both sides of Enter");
        assert.equal(frame.portrait, undefined);
        assert.equal(frame.classicPortrait, false);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        const stage = exitPauseTiles ? "after-enter" : "before-enter";
        if (exitPauseTiles) {
          assert.equal(key, "enter");
          assert.deepEqual(frame.tiles, exitPauseTiles);
        }
        writeFileSync(resolve(directory, `${routeName}-${stage}.png`), Buffer.from(shot.data, "base64"));
        exitPauseTiles = exitPauseTiles ? undefined : frame.tiles;
      }
    }
    if (shopPortraitTrace) {
      const fallbacks = existsSync(shopPortraitTrace)
        ? readFileSync(shopPortraitTrace, "utf8").trim().split(/\r?\n/).map(line => JSON.parse(line)) : [];
      const shopFallback = fallbacks.find(({ area, sources }) => area === 0 && sources.includes(southShopkeeper));
      if (classicPortrait) {
        assert.match(shopFallback?.dialogue ?? "", /THE SHOPKEEPER GREETS YOU/i);
      } else {
        assert.equal(shopFallback, undefined, "The current shopkeeper replacement should avoid a portrait fallback");
      }
    }
    if (routeName === "buccaneer-pens") {
      assert.equal(frame.perspective, true, "The animal-pen menu should keep the first-person picture");
      await waitFor("outer picture panel at the animal pens", () => run('Boolean(document.querySelector(".perspective-backdrop"))'));
      await waitFor("the Enhanced menu font", () => run(`[...document.fonts]
        .some(font => font.family.includes("Game Web Font") && font.status === "loaded")`));
      assert.ok(await run(`(() => {
        const glyphs = [...document.querySelectorAll("#game-text span")];
        const menu = glyphs.filter(glyph => parseFloat(glyph.style.top) >= 96)
          .sort((left, right) => parseFloat(left.style.left) - parseFloat(right.style.left));
        const twoColors = new Set(menu.map(glyph => getComputedStyle(glyph).color)).size >= 2;
        const context = document.createElement("canvas").getContext("2d");
        return menu.map(glyph => glyph.textContent).join("").includes("ReleaseanimalsLeave") &&
          twoColors && glyphs.every(glyph => {
            const style = getComputedStyle(glyph);
            context.font = style.fontWeight + " " + style.fontSize + " " + style.fontFamily;
            return style.textTransform === "none" &&
              context.measureText(glyph.textContent).width <= glyph.getBoundingClientRect().width;
          });
      })()`), "The larger web font should fit the original cells and keep menu shortcuts highlighted");
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "buccaneer-animal-pens.png"), Buffer.from(capture.data, "base64"));
      const hasLead = (id) => frame.journal?.leads.some((lead) => lead.id === id);
      await advance("j");
      assert.ok(hasLead("rescue-animal-pens"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /release them again if offered/);
      else assert.ok(!hasLead("rescue-stampede"));
      await advance("j");
      const pensScenery = frame.tiles;
      await advance("r");
      assert.equal(frame.perspective, true, "The release acknowledgement should retain the full scenery");
      assert.deepEqual(frame.tiles, pensScenery);
      await switchBothWays();
      for (const key of ["enter", "j"]) await advance(key);
      assert.ok(hasLead("rescue-stampede"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /while the guards are rounding up/);
      assert.ok(!hasLead("rescue-inside-pen"));
      await advance("j");
      for (const key of ["right", "right", "up", "left", ...Array(4).fill("up"),
        "left", "up"]) await advance(key);
      const approachTiles = frame.tiles;
      await advance("up");
      assert.equal(frame.perspective, true, "The locked-gate prompt should keep the first-person picture");
      assert.deepEqual(frame.tiles, approachTiles, "Opening the locked-gate prompt should keep the scenery tiles");
      await switchBothWays();
      await waitFor("outer picture panel at the locked gate", () => run('Boolean(document.querySelector(".perspective-backdrop"))'));
      for (const key of ["b", "enter", "j"]) await advance(key);
      assert.ok(hasLead("rescue-inside-pen"));
      assert.ok(!hasLead("rescue-heir-freed"));
      for (const key of ["j", "g", "j"]) await advance(key);
      assert.ok(hasLead("rescue-heir-freed"));
      assert.ok(!hasLead("rescue-merchant-alarm"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /escort the boy out through the base gate/i);
      await advance("j");
      for (const key of ["right", "up", "right", ...Array(6).fill("up"), "j"]) await advance(key);
      assert.ok(hasLead("rescue-escape-guards"));
      assert.ok(!hasLead("rescue-escape-alarm"));
      if (repeatStampede) assert.match(frame.journal.objective.nextStep, /fight off the guards.*escort the boy/i);
      await advance("j");
    }
    assert.equal(views, environment.views);
    assert.equal(patterns.size, environment.patterns);
    if (environment.requiredTile) assert.ok(patterns.has(environment.requiredTile), environment.requiredTile);
    if (canalWalk) await captureCanalView("end");
    if (routeName === "new-phlan-canal-room") {
      const text = frame.text.map(([, char]) => String.fromCharCode(char)).join("");
      assert.match(text, /6,1S/i);
      const checkCanalGeometry = () => run(`(() => {
        const screen = document.querySelector("#screen").getBoundingClientRect();
        const panel = document.querySelector(".perspective-backdrop").getBoundingClientRect();
        const tiles = [...document.querySelectorAll(".terrain-tile")].map(tile => tile.getBoundingClientRect());
        const near = (a, b) => Math.abs(a - b) < 0.05;
        return near(screen.width, screen.height * 4 / 3) && tiles.length === 121 && tiles.every((tile, i) =>
          (i % 11 === 0 ? near(tile.left, panel.left) : tiles[i - 1].right >= tile.left) &&
          (i % 11 !== 10 || near(tile.right, panel.right)) &&
          (i < 11 ? near(tile.top, panel.top) : tiles[i - 11].bottom >= tile.top) &&
          (i < 110 || near(tile.bottom, panel.bottom)));
      })()`);
      assert.ok(await checkCanalGeometry(), "Tiles should cover internal seams and stop at the picture edge");
      for (const width of [375, 768, 1100]) {
        await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
        assert.ok(await checkCanalGeometry(), `Canal geometry and aspect ratio at ${width}px`);
      }
      await command("Emulation.clearDeviceMetricsOverride");
      // Simulate a single unavailable PNG in an otherwise valid live view.
      const result = await command("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
        const original = state;
        const missing = "tile:missing-canal-test";
        const [x, y] = original.tiles[0];
        state = { ...original, tiles: [[x, y, missing], ...original.tiles.slice(1)] };
        try {
          await showScreen();
          return !document.querySelector("#game-text").hidden && !document.querySelector("#tile-art").hidden &&
            Boolean(document.querySelector(".perspective-backdrop")) &&
            document.querySelectorAll(".terrain-tile").length === 120 &&
            !document.querySelector('img[src="/art/' + missing + '"]');
        } finally {
          state = original;
          await showScreen();
        }
      })()` });
      assert.equal(result.result.value, true, result.exceptionDetails?.text ?? "A missing tile should preserve the enhanced view");
    }
    if (routeName === "nomad-camp-rim") {
      await waitFor("all three enhanced Nomad sentry distances", () => run("window.observedApproach.size === 3"));
      assert.deepEqual(frame.animation?.flatMap(({ encounter }) => encounter ? [encounter] : []), environment.approachSequence);
      assert.deepEqual(await run("[...window.observedApproach]"), environment.approachSequence.map(([, , id]) => id));
      const sentry = "encounter:area:17:ecl:9dd6:caller:a2e8:SPRIT7.DAX:11:0:0";
      assert.deepEqual(frame.encounter, [40, 32, sentry, 48, 80]);
      const text = frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
      assert.match(text, /ALLTHENOMADSHOLDTHEIRSWORDSATTHEREADY/i);
      await waitFor("enhanced Nomad Camp perimeter sentry", () => run(`
        document.querySelector('.encounter-sprite[src="/art/${sentry}"]')?.naturalWidth === 192`));
      const capture = await command("Page.captureScreenshot", { format: "png" });
      const screenshot = resolve(directory, "nomad-sword-ready.png");
      writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
      console.log("Enhanced Nomad Camp perimeter sentry:", screenshot);
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "nomad-swords-ready"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "nomad-headman-talk" || id === "nomad-kobold-warning"));
      await advance("j");
      for (const key of ["enter", "enter"]) await advance(key);
      const choice = frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
      assert.match(choice, /THENOMADSWAITFORYOUTOMAKETHEFIRSTMOVE.*COMBATWAITFLEEPARLAY/i);
      await advance("p");
      assert.equal(frame.portrait, "portrait:area:17:ecl:9da2:caller:a416:HEAD7.DAX:74:BODY7.DAX:30");
      await waitFor("the enhanced Nomad headman after Parlay", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    }
    if (environment.finalPortrait) {
      assert.equal(frame.portrait, environment.finalPortrait);
      assert.equal(frame.perspective, false);
      await waitFor("the enhanced portrait after walking the route", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.getAttribute("src") === ${JSON.stringify("/art/" + environment.finalPortrait)} &&
        document.querySelector(".encounter-portrait").naturalWidth === 352`));
      await verifyPortraitPanel();
    }
    if (environment.finalEncounter) {
      assert.deepEqual(frame.encounter, environment.finalEncounter);
      const [, , id, width, height] = environment.finalEncounter;
      await waitFor("the enhanced encounter over the scenery", () => run(`state.sequence === ${frame.sequence} &&
        [...document.querySelectorAll(".encounter-sprite")].some(image =>
          image.getAttribute("src") === ${JSON.stringify("/art/" + id)} &&
          image.naturalWidth === ${width * 4} && image.naturalHeight === ${height * 4})`));
    }
    if (actor) {
      assert.ok(frame.encounter, "The encounter actor must be drawn separately from the scenery");
      const [, , id, width, height] = frame.encounter;
      assert.equal(id, actor);
      await waitFor("the enhanced actor over the scenery", () => run(`state.sequence === ${frame.sequence} &&
        [...document.querySelectorAll(".encounter-sprite")].some(img =>
          img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === ${width * 4} && img.naturalHeight === ${height * 4})`));
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, routeName + ".png"), Buffer.from(capture.data, "base64"));
    }
    if (grishnakTemple) assert.ok(sawGrishnakApproach);
    await switchBothWays();
    if (routeName === "textile-temple-native") {
      const screenshot = resolve(directory, "grishnak-temple.png");
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
      await advance("j");
      const open = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
      const index = open.findIndex(({ id }) => id === "commission-textile");
      assert.ok(index >= 0);
      await advance(`track ${index + 1}`);
      assert.match(frame.journal.objective.nextStep, /Grishnak.*battle loot.*Free, then Unlock/i);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "textile-grishnak-defeated"));
      await advance("j");
      console.log("Enhanced Grishnak dialogue:", screenshot);
      for (const key of ["enter", "enter", "space"]) await advance(key);
      const partySprites = [
        [80, 104, "combat:party:64:64"],
        [152, 104, "combat:party:64:64:palette:062645678eaecdef"],
      ];
      for (const [x, y, id] of partySprites) {
        assert.ok(frame.combatArt.some(([left, top, key]) => left === x && top === y && key === id));
      }
      await waitFor("both enhanced swordsmen in Grishnak's battle", () => run(`state.sequence === ${frame.sequence} &&
        ${JSON.stringify(partySprites.map(([, , id]) => "/art/" + id))}.every(src =>
          [...document.querySelectorAll(".combat-sprite")].some(img => img.getAttribute("src") === src && img.naturalWidth === 96))`));
      const battle = await command("Page.captureScreenshot", { format: "png" });
      const battleScreenshot = resolve(directory, "grishnak-combat.png");
      writeFileSync(battleScreenshot, Buffer.from(battle.data, "base64"));
      console.log("Enhanced Grishnak combat:", battleScreenshot);
      const ochreStrike = "combat:party:64:192:palette:062645678eaecdef";
      const showsStrike = () => frame.animation?.some(({ combatArt }) =>
        combatArt.some(([, , id]) => id === ochreStrike));
      for (let turn = 0; turn < 16 && !showsStrike(); turn++) await advance("q");
      assert.ok(showsStrike(), "Expected the original battle to draw the ochre swordsman's strike");
      await waitFor("ochre swordsman's enhanced strike", () => run(`
        [...document.querySelectorAll(".combat-sprite")].some(img =>
          img.getAttribute("src") === ${JSON.stringify("/art/" + ochreStrike)} && img.naturalWidth === 96)`));
    }
    console.log(`Verified ${routeName}: ${views} views, ${patterns.size} tile patterns and state-preserving switches.`);
    if (towerSave) {
      const expected = { tiles: frame.tileInventory, text: frame.text.toSorted(([left], [right]) => left - right) };
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      assert.notDeepEqual(readFileSync(saved), originalSave);
      writeFileSync(resolve(directory, "valjevo-save-scene.json"), JSON.stringify(expected));
      console.log("Native save:", saved);
    }
  } else if (encounterRoute) {
    const approachSequence = encounterRoute.transient ? [encounterRoute.placement] : encounterRoute.approachSequence;
    if (approachSequence) await observeApproach(approachSequence, encounterRoute.requireTiledApproach);
    const terrainPatterns = new Set();
    let terrainViews = 0;
    const terrain = encounterRoute.terrain;
    if (terrain) terrainViews += await verifyTiledView(terrain.area, terrainPatterns);
    for (const key of encounterRoute.inputs) {
      await advance(key);
      if (terrain) terrainViews += await verifyTiledView(terrain.area, terrainPatterns);
    }
    async function verifyApproach(placement) {
      assert.deepEqual(frame.encounter, placement);
      const [x, y, id, width, height] = placement;
      const scale = 120 / 88;
      await waitFor("the enhanced approach sprite at its guest anchor", () => run(`(() => {
        const image = document.querySelector(".encounter-sprite");
        return state.sequence === ${frame.sequence} &&
          image?.getAttribute("src") === ${JSON.stringify("/art/" + id)} &&
          image.naturalWidth === ${width * 4} && image.naturalHeight === ${height * 4} &&
          Math.abs(parseFloat(image.style.left) - ${(8 + (x - 24) * scale) / 3.2}) < .001 &&
          Math.abs(parseFloat(image.style.top) - ${(8 + (y - 24) * scale) / 2}) < .001;
      })()`));
      await switchBothWays();
    }
    if (encounterRoute.transient) {
      assert.deepEqual(frame.animation?.flatMap(({ encounter }) => encounter ? [encounter] : []),
        approachSequence);
      await switchBothWays();
    } else {
      await verifyApproach(encounterRoute.placement);
    }
    if (approachSequence) {
      assert.deepEqual(await run("[...window.observedApproach]"), approachSequence.map(([, , id]) => id));
    }
    if (terrain) {
      assert.equal(terrainViews, terrain.views);
      assert.equal(terrainPatterns.size, terrain.patterns);
      const capture = await command("Page.captureScreenshot", { format: "png" });
      const screenshot = resolve(directory, `${routeName}.png`);
      writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
      console.log(`Verified ${terrainPatterns.size} cave terrain patterns across ${terrainViews} views:`, screenshot);
    }
    const approachSteps = encounterRoute.approachSteps ?? (encounterRoute.closer
      ? [{ inputs: [encounterRoute.closerKey ?? "a"], placement: encounterRoute.closer }]
      : []);
    for (const { inputs, placement } of approachSteps) {
      const terrain = frame.tileInventory;
      assert.equal(terrain?.length, 121);
      for (const input of inputs) await advance(input);
      assert.deepEqual(frame.tileInventory, terrain);
      await verifyApproach(placement);
    }
    if (encounterRoute.acceptedCommission) {
      await advance("j");
      assert.notEqual(frame.journal?.leads.find(({ id }) => id === encounterRoute.acceptedCommission)?.status, "accepted");
      await advance("j");
    }
    const dialogueSteps = encounterRoute.dialogueSteps ?? (encounterRoute.dialogue ? [encounterRoute.dialogue] : []);
    for (const { key, keys = [key], portrait, prompt } of dialogueSteps) {
      for (const input of keys) await advance(input);
      assert.equal(frame.encounter, undefined);
      assert.equal(frame.portrait, portrait);
      const text = frame.text.toSorted(([left], [right]) => left - right)
        .map(([, character]) => String.fromCharCode(character)).join("");
      assert.match(text, prompt);
      await waitFor("the enhanced encounter dialogue", () => run(`(() => {
        const image = document.querySelector(".encounter-portrait");
        return state.sequence === ${frame.sequence} &&
          image?.getAttribute("src") === ${JSON.stringify("/art/" + portrait)} &&
          image.naturalWidth === 352 && image.naturalHeight === 352;
      })()`));
      await verifyPortraitPanel();
      await switchBothWays();
    }
    if (encounterRoute.battleStart) {
      const { input, prompt, portrait } = encounterRoute.battleStart;
      await advance(input);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), prompt);
      if (portrait) {
        assert.equal(frame.portrait, portrait);
        await waitFor("the battle opening illustration", () => run(`state.sequence === ${frame.sequence} &&
          [...document.querySelectorAll(".encounter-portrait")].some(image =>
            image.getAttribute("src") === ${JSON.stringify("/art/" + portrait)} &&
            image.naturalWidth === 352 && image.naturalHeight === 352 && image.getClientRects().length > 0)`));
      }
    }
    if (encounterRoute.acceptedCommission) {
      await advance("j");
      assert.equal(frame.journal?.leads.find(({ id }) => id === encounterRoute.acceptedCommission)?.status, "accepted");
      await advance("j");
      if (routeName === "slums-ohlo-study-approach") {
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /14,10E/i);
      }
    }
    console.log(`Verified ${routeName} source frame, screen anchor, and mode switching in Chrome.`);
  } else if (routeName === "lizardfolk-battle-wall") {
    await waitForExplorationViewport();
    for (const key of ["left", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up", "right", "up", "c"]) {
      await advance(key);
    }
    const walls = [
      [72,128,"battle-tile:7879edde6815d1ab90d632600724e52de5034dd5cc0d386ef1d35b2023fbe12f"],
      [72,160,"battle-tile:6a6b3a6a8bd1d15c819b33ac9f2fc99ad2d2e83e2c7b2ccf3fec96f24609b00c"],
    ];
    const terrainPatterns = new Set();
    for (let turn = 0; turn < 4; turn++) {
      await advance("q");
      const placements = new Map(frame.battleTiles.map(([x, y, id]) => [`${x},${y}`, id]));
      for (const [x, y, id] of walls) assert.equal(placements.get(`${x},${y}`), id);
      for (const [x, y, id] of frame.battleTileInventory) {
        assert.equal(placements.get(`${x},${y}`), id, `Missing enhanced tile at ${x},${y} in turn ${turn + 1}`);
        terrainPatterns.add(id);
      }
      assert.ok(walls.every(([x, y]) => frame.combatArt.every(([ax, ay, , , , width = 24, height = 24]) =>
        x >= ax + width || x + 8 <= ax || y >= ay + height || y + 8 <= ay)));
      await waitFor("the complete enhanced battlefield tile layer", () => run(`(() => {
        if (state.sequence !== ${frame.sequence} || animationFrame) return false;
        if (document.querySelector(".street-viewport, .overland-viewport")) return false;
        const tiles = new Map([...document.querySelectorAll(".battle-tile")].map(image =>
          [image.style.left + "," + image.style.top, image]));
        return ${JSON.stringify(frame.battleTiles)}.every(([x, y, id]) => {
          const tile = tiles.get(x / 3.2 + "%," + y / 2 + "%");
          return tile?.getAttribute("src") === "/art/" + id && tile.naturalWidth === 32 && tile.naturalHeight === 32;
        });
      })()`));
    }
    assert.ok(terrainPatterns.size >= 45, "Expected the giant-lizard route to exercise at least 45 battlefield patterns");
    await switchBothWays();
    console.log(`Verified ${terrainPatterns.size} battlefield patterns across four live giant-lizard combat turns.`);
  } else if (mageWand) {
    const wand = "combat:area:20:CPIC2.DAX:222:ecl:a0b4";
    const ready = "combat:area:20:CPIC2.DAX:94:ecl:a0b4";
    for (const key of ["up", "b", "up", "enter", "enter", "a", ...Array(4).fill("enter")]) await advance(key);
    const action = () => frame.animation?.find(shot => shot.combatArt.some(([, , id]) => id === wand));
    for (let turn = 0; turn < 75 && !action(); turn++) await advance("q");
    const shot = action();
    assert.ok(shot, "Expected the original mage wand-use report");
    const textOf = ({ text }) => text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
    assert.match(textOf(shot), /LEVEL3MUUSESANITEMITEM:WAND/i);
    assert.ok(frame.animation.some(report => /BAKSHITAKES8POINTSOFDAMAGEFROMMAGICITEM:WAND/i.test(textOf(report))));
    const [x, y, , , selected] = shot.combatArt.find(([, , id]) => id === wand);
    assert.ok(selected);
    assert.ok(frame.combatArt.some(([, , id]) => id === ready));
    await waitFor("the enhanced wand pose at the original actor position", () => run(`
      state.sequence === ${frame.sequence} && [...document.querySelectorAll(".combat-sprite")].some(image =>
        image.getAttribute("src") === ${JSON.stringify("/art/" + wand)} && image.naturalWidth === 96 && image.naturalHeight === 96 &&
        parseFloat(image.style.left) === ${x / 3.2} && parseFloat(image.style.top) === ${y / 2})`));
    assert.ok(await run(`(async () => {
      const report = animationFrame;
      const sequence = state.sequence;
      const panel = document.querySelector("#game-text");
      if (!report?.combatArt.some(([, , id]) => id === ${JSON.stringify(wand)})) return false;
      const reportText = panel.textContent;
      document.querySelector("#presentation").click();
      await showScreen();
      const classic = panel.hidden && document.querySelector("#screen").src === "data:image/png;base64," + report.frame;
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
      await showScreen();
      return classic && state.sequence === sequence && animationFrame === report && !panel.hidden && panel.textContent === reportText;
    })()`), "The same wand report should survive a presentation switch");
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the enhanced mage wand pose during the native report and the return to ready art.");
  } else if (combatPose) {
    const { stand, strike, width, height, inputs, strikeInputs = ["q"], strikeReflected, strikeReport,
      journalLead, excluded, readyPrompt, standAnchor, standCount, standSelected, strikeAnchor,
      followingStrikeReport, standInAnimation } = combatPose;
    function verifyCombatScope() {
      if (!excluded) return;
      for (const view of [frame, ...(frame.animation ?? [])]) {
        assert.ok(view.combatArt.every(([, , id]) => !excluded.includes(id)), "Unexpected art from a different battle");
      }
    }
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
      await advance("j");
    }
    if (strikeInputs.length) await run(`window.strikeLoaded = window.standLoaded = false;
      new MutationObserver(() => {
        for (const image of document.querySelectorAll(".combat-sprite")) {
          const isStrike = image.src.endsWith(${JSON.stringify(strike)});
          if (!isStrike && !(${Boolean(standInAnimation)} && image.src.endsWith(${JSON.stringify(stand)}))) continue;
          const check = () => {
            if (image.naturalWidth === ${width} && image.naturalHeight === ${height}) {
              if (!isStrike) window.standLoaded = true;
              else if (${strikeReflected === undefined} || (image.style.transform === "scaleX(-1)") === ${strikeReflected ?? false}) window.strikeLoaded = true;
            }
          };
          check();
          image.addEventListener("load", check, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });`);
    for (const [index, key] of inputs.entries()) {
      await advance(key);
      verifyCombatScope();
      if (routeName === "valjevo-elite-guard" && index === 6) {
        const guards = frame.combatArt.filter(([, , id]) => id === stand);
        assert.equal(guards.length, 8);
        assert.deepEqual(guards.filter(([x, y]) => y === 56 && (x === 80 || x === 104)),
          [[80, 56, stand, true], [104, 56, stand, true]]);
        await waitFor("all eight opening elite guards in Chrome", () => run(`state.sequence === ${frame.sequence} &&
          [...document.querySelectorAll('.combat-sprite[src="/art/${stand}"]')]
            .filter(sprite => sprite.naturalWidth === 96 && sprite.naturalHeight === 96).length === 8`));
        const flail = "combat:party:0:3";
        assert.deepEqual(frame.combatArt.find(([x, y]) => x === 80 && y === 80), [80, 80, flail, false, true]);
        await waitFor("Threndr's enhanced flail sprite", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.combat-sprite[src="/art/${flail}"]')?.naturalWidth === 96`));
        const opening = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "valjevo-elite-guard-opening.png"), Buffer.from(opening.data, "base64"));
      }
    }
    if (readyPrompt) assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), readyPrompt);
    const readyPlacements = standInAnimation ? frame.animation?.flatMap(({ combatArt }) => combatArt ?? []) : frame.combatArt;
    if (standCount !== undefined) {
      assert.equal(readyPlacements?.filter(([, , id]) => id === stand).length, standCount);
    }
    assert.ok(readyPlacements?.some(([x, y, id, reflected, selected]) => id === stand &&
      (standSelected === undefined || selected === standSelected) &&
      (standAnchor ? x === standAnchor[0] && y === standAnchor[1] && reflected === standAnchor[2]
        : selected || readyPrompt !== undefined)),
      `Expected ${stand}. Combat placements: ${JSON.stringify(frame.combatArt)}. ` +
      `Guest text: ${frame.text.map(([, character]) => String.fromCharCode(character)).join("")}`);
    await waitFor("the ready combat sprite", () => run(standInAnimation ? "window.standLoaded" : `state.sequence === ${frame.sequence} &&
      [...document.querySelectorAll(".combat-sprite")].some(image => image.src.endsWith(${JSON.stringify(stand)}) &&
        image.naturalWidth === ${width} && image.naturalHeight === ${height})`));
    await switchBothWays();
    if (routeName === "new-phlan-rolf-tour") {
      async function verifyScriptedView() {
        assert.equal(frame.portrait, undefined);
        assert.equal(frame.perspective, true);
        assert.equal(frame.tiles.length, 121);
        await waitFor("enhanced scripted scenery", () => run(`
          state.sequence === ${frame.sequence} &&
          [...document.querySelectorAll(".terrain-tile")].filter(image => image.naturalWidth === 32).length === 121
        `));
      }
      await verifyScriptedView();
      for (let stop = 0; stop < 6; stop++) {
        await advance("enter");
        await verifyScriptedView();
      }
      for (const key of ["enter", "right", "right", "up", "up", "up"]) await advance(key);
      assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /OUTSIDETHECITYHALL/i);
      await verifyScriptedView();
      for (const key of ["up", "enter", "up"]) await advance(key);
      await verifyScriptedView();
      await switchBothWays();
      for (const key of ["enter", "up", "enter", "up", "up"]) await advance(key);
      const guard = "portrait:HEAD3.DAX:57:BODY3.DAX:1";
      assert.equal(frame.portrait, guard);
      await waitFor("enhanced council guard", () => run(`
        state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.getAttribute("src") === ${JSON.stringify("/art/" + guard)} &&
        document.querySelector(".encounter-portrait").naturalWidth === 352
      `));
      await verifyPortraitPanel();
    }
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === journalLead));
      await advance("j");
    }
    if (strikeInputs.length) {
      for (const key of strikeInputs) {
        await advance(key);
        verifyCombatScope();
      }
      const strikeAnimation = frame.animation?.findIndex(({ combatArt, text }) =>
        combatArt?.some(([x, y, id, reflected]) =>
          id === strike && (strikeReflected === undefined || reflected === strikeReflected) &&
          (!strikeAnchor || (x === strikeAnchor[0] && y === strikeAnchor[1]))) &&
        (!strikeReport || strikeReport.test(text.map(([, char]) => String.fromCharCode(char)).join("")))) ?? -1;
      assert.ok(strikeAnimation >= 0, `Expected the native ${strike} strike animation`);
      if (followingStrikeReport) {
        assert.ok(frame.animation.slice(strikeAnimation + 1).some(({ text }) =>
          followingStrikeReport.test(text.map(([, char]) => String.fromCharCode(char)).join(""))));
      }
      await waitFor("the enhanced combat strike", () => run("window.strikeLoaded"));
      if (routeName === "valjevo-party-flail") {
        const paletteCheck = await command("Runtime.evaluate", {
          awaitPromise: true, returnByValue: true, expression: `(async () => {
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = 96;
            const context = canvas.getContext("2d");
            const image = async source => {
              const result = new Image();
              result.src = source;
              await result.decode();
              return result;
            };
            const pixels = bitmap => {
              context.clearRect(0, 0, 96, 96);
              context.drawImage(bitmap, 0, 0);
              return context.getImageData(0, 0, 96, 96).data;
            };
            for (const art of ${JSON.stringify([stand, strike])}) {
              const id = art + ":palette:0143456789abcdef";
              const original = await image("/art/" + id);
              const mask = pixels(await image("/art-materials/" + id));
              const before = pixels(original);
              const after = pixels(await image(await recolorPartySprite(original, id)));
              let tinted = false;
              for (let i = 0; i < before.length; i += 4) {
                if (before[i + 3] !== after[i + 3]) return false;
                const changed = [0, 1, 2].some(channel => before[i + channel] !== after[i + channel]);
                if (changed && (!mask[i + 3] || mask[i] !== 2)) return false;
                tinted ||= changed;
              }
              if (!tinted) return false;
            }
            return true;
          })()`,
        });
        assert.equal(paletteCheck.result?.value, true, "Both flail poses should recolor only the selected material");
      }
      console.log(`Verified ${routeName} standing and animated strike poses in Chrome.`);
    } else if (strike) {
      await run(`window.strikePreview = new Image();
        window.strikePreview.src = "/art/" + ${JSON.stringify(strike)};`);
      await waitFor("the loadable strike asset", () => run(
        `window.strikePreview.naturalWidth === ${width} && window.strikePreview.naturalHeight === ${height}`));
      console.log(`Verified ${routeName} standing pose in Chrome and decoded the strike asset separately.`);
    } else {
      console.log(`Verified ${routeName} standing pose in Chrome.`);
    }
    assert.deepEqual(readFileSync(saved), originalSave);
  } else if (ferry) {
    for (const key of ["down", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:41:0:0");
    const text = frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, ferry.prompt);
    assert.match(text, /TAKEBOAT.*STAY/i);
    await waitFor("the Phlan ferry illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("t");
    const patterns = new Set();
    let pierViews = 0;
    for (const key of ["enter", "enter", "enter"]) {
      await advance(key);
      if (frame.perspective) pierViews += await verifyTiledView(0, patterns);
    }
    assert.ok(pierViews > 0 && /15,1[SW]/i.test(frame.text.map(([, char]) => String.fromCharCode(char)).join("")));
    console.log(`Verified the return ferry artwork and ${pierViews} enhanced New Phlan landing views at ${routeName} in Chrome.`);
  } else if (outskirts) {
    if (verifyApproachTravel || verifyDistrictTravel) {
      const marker = 'document.querySelector("[data-destination=phlan]")';
      const target = verifyDistrictTravel ? outskirts.destination : outskirts.approach;
      const button = `document.querySelector('[data-approach="${target}"]')`;
      await waitFor("the Phlan landmark to become available", () => run(`${marker}.getAttribute("aria-disabled") === "false"`));
      await run(`${marker}.dispatchEvent(new MouseEvent("click"))`);
      assert.equal(await run(`document.querySelector("#phlan-approaches").hidden`), false);
      assert.equal(await run(`${button}.disabled`), false);
      assert.deepEqual(await latest(), frame, "Opening the chooser should preserve the current frame");
      await run(`(() => {
        window.phlanTravelKeys = [];
        const gameFetch = window.fetch.bind(window);
        window.fetch = (url, options) => {
          if (url === "/key") phlanTravelKeys.push(options.body);
          return gameFetch(url, options);
        };
      })()`);
      if (verifyDistrictTravel && target === "graveyard") {
        await run(`window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", cancelable: true }))`);
        assert.equal(await run(`document.querySelector("#phlan-approaches").hidden && document.activeElement === ${marker}`), true);
        const graveyard = 'document.querySelector("[data-destination=graveyard]")';
        assert.equal(await run(`${graveyard}.getAttribute("aria-disabled")`), "false");
        await run(`${graveyard}.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))`);
      } else {
        if (verifyApproachTravel) await run(`document.querySelector("#phlan-approaches summary").click()`);
        await run(`${button}.click()`);
      }
      const firstSequence = frame.sequence;
      frame = await waitFor("travel stopping at the native outskirts prompt", async () => {
        const current = await latest();
        const arrived = verifyDistrictTravel ? current.scenery?.mapId === outskirts.map
          : current.portrait === "portrait:PIC7.DAX:40:0:0";
        return current.ready && current.sequence > firstSequence && arrived && current;
      });
      await waitFor("travel handing control back at the crossroads", () => run(`state.sequence === ${frame.sequence} && !activeTravel`));
      const keys = await run("phlanTravelKeys.filter(key => key !== ':travel-poll')");
      assert.deepEqual(keys.slice(keys.indexOf("enter")), verifyDistrictTravel ? ["enter", outskirts.choice] : ["enter"]);
    } else {
      for (const key of [outskirts.direction, "enter"]) await advance(key);
    }
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    if (verifyDistrictTravel) {
      assert.equal(frame.exploration?.area, outskirts.area);
      if (outskirts.destination === "graveyard") assert.match(text, /PRESS.*TOCONTINUE/i);
    } else {
      assert.equal(frame.portrait, "portrait:PIC7.DAX:40:0:0");
      assert.match(text, outskirts.prompt);
      assert.match(text, outskirts.menu);
      await waitFor("the Phlan outskirts illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    }
    await switchBothWays();
    console.log(verifyDistrictTravel ? `Verified the native arrival for ${outskirts.destination} via the Moonsea map.`
      : `Verified the crossroads illustration at ${routeName} in Chrome${verifyApproachTravel ? " via the Moonsea map" : ""}.`);
  } else if (routeName === "nomad-camp-approach") {
    await advance("j");
    assert.ok(frame.journal, "The journal should open before finding the camp");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "nomad-camp-found"));
    await advance("j");
    for (const key of ["up", "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(frame.portrait, "portrait:area:26:PIC7.DAX:30:0:0");
    assert.match(text, /YOUHAVESTUMBLEDUPONALARGENOMADCAMP/i);
    assert.match(text, /ENTER.*LEAVE/i);
    await waitFor("the Nomad Camp approach illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "nomad-camp-found"));
    await advance("j");
    for (const key of ["e", "e", "enter"]) await advance(key);
    const campPatterns = new Set();
    assert.equal(await verifyTiledView(17, campPatterns), 1);
    for (let step = 0; step < 6; step++) {
      await advance("up");
      assert.equal(await verifyTiledView(17, campPatterns), 1);
    }
    for (const key of ["enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD7.DAX:61:BODY7.DAX:30");
    await waitFor("enhanced Nomad sentries after the entrance trail", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    console.log("Verified the Nomad Camp illustration, journal entry, and seven tiled views through to the sentries in Chrome.");
  } else if (["nomad-headman-rest-reload", "nomad-headman-rest-portrait", "nomad-headman-raid"].includes(routeName)) {
    const visibleText = () => frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
    const raid = routeName === "nomad-headman-raid";
    const restPortraitOnly = routeName === "nomad-headman-rest-portrait";
    assert.match(visibleText(), /00:29/);
    await advance("j");
    const known = new Set(frame.journal?.leads.map(({ id }) => id));
    assert.ok(known.has("nomad-promised-aid") && known.has("nomad-rest-offer"));
    assert.ok(!known.has("nomad-declined-aid") && !known.has("nomad-kobold-attack") && !known.has("nomad-war-cries"));
    await switchBothWays();
    for (const key of ["j", "e", "enter"]) await advance(key);
    const restPortrait = "portrait:area:17:ecl:9ed7:PIC7.DAX:29:0:0";
    assert.equal(frame.portrait, restPortrait);
    await waitFor("the headman's tent rest artwork", () => run(`
      state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${restPortrait}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    for (const key of ["r", "h", ...Array(raid || restPortraitOnly ? 18 : 8).fill("i"), "r"]) await advance(key);
    if (raid || restPortraitOnly) {
      await advance("space");
      assert.equal(frame.portrait, restPortrait);
      await advance("n");
      assert.equal(frame.portrait, undefined);
      assert.match(visibleText(), /18:29.*THESOUNDOFWARCRIES/i);
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "nomad-war-cries"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "nomad-kobold-attack"));
    }
    if (raid) {
      for (const key of ["j", "enter", "enter", "j"]) await advance(key);
      assert.ok(frame.journal.leads.some(({ id }) => id === "nomad-kobold-attack"));
      for (const key of ["j", "enter"]) await advance(key);
      assert.match(visibleText(), /COMBATWAITFLEEADVANCE/i);
      const kobold = "encounter:area:17:SPRIT7.DAX:0:1:0";
      assert.deepEqual(frame.encounter, [56, 32, kobold, 24, 65]);
      assert.equal(await verifyTiledView(17, new Set()), 1);
      await waitFor("the enhanced kobold raider", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-sprite[src="/art/${kobold}"]')?.naturalHeight === 260`));
      const shot = await command("Page.captureScreenshot", { format: "png" });
      const screenshot = resolve(directory, "nomad-raid-approach.png");
      writeFileSync(screenshot, Buffer.from(shot.data, "base64"));
      await advance("c");
      assert.match(visibleText(), /ABATTLEBEGINS/i);
      const manualTurn = /ALDAHITPOINTS.*MOVEVIEWAIMUSEQUICKDONE/i;
      const raider = "combat:area:17:CPIC2.DAX:0:ecl:afa3";
      let enemyScreenshot;
      for (let step = 0; step < 10 && !manualTurn.test(visibleText()); step++) {
        await advance("enter");
        if (enemyScreenshot || !frame.combatArt.some(([x, y, id]) => x === 8 && y === 104 && id === raider)) continue;
        const stones = frame.combatArt.findIndex(([x, y, id]) => x === 80 && y === 152 && /^combat:RANDCOM\.DAX:1:0:[01]$/.test(id));
        const raiderOverStones = frame.combatArt.findIndex(([x, y, id]) => x === 80 && y === 152 && id === raider);
        assert.ok(stones >= 0 && raiderOverStones > stones, "Expected the enhanced standing kobold over the loose stones");
        const overlappingSprites = [frame.combatArt[stones][2], raider].map(id => "/art/" + id);
        await waitFor("the enhanced stones beneath the raider", () => run(`state.sequence === ${frame.sequence} &&
          JSON.stringify([...document.querySelectorAll(".combat-sprite")].filter(img =>
            img.style.left === "25%" && img.style.top === "76%" && img.naturalWidth === 96 && img.naturalHeight === 96
          ).map(img => img.getAttribute("src"))) === JSON.stringify(${JSON.stringify(overlappingSprites)})`));
        const wallBehindRaider = frame.battleTiles.filter(([x, y]) => x < 32 && y >= 104 && y < 128);
        assert.deepEqual(wallBehindRaider.map(([x, y]) => [x, y]), [
          [8, 104], [16, 104], [24, 104], [8, 112], [16, 112], [24, 112],
        ]);
        await waitFor("the enhanced raider in front of the wall", () => run(`state.sequence === ${frame.sequence} &&
          ${JSON.stringify(wallBehindRaider.map(([x, y, id]) => [x / 3.2 + "%", y / 2 + "%", "/art/" + id]))}.every(([left, top, src]) =>
            [...document.querySelectorAll(".battle-tile")].some(img =>
              img.style.left === left && img.style.top === top && img.getAttribute("src") === src && img.naturalWidth === 32)) &&
          [...document.querySelectorAll(".combat-sprite")].some(img =>
            img.getAttribute("src") === ${JSON.stringify("/art/" + raider)} &&
            img.naturalWidth === 96 && img.naturalHeight === 96 && img.style.left === "2.5%" && img.style.top === "52%")`));
        const enemy = await command("Page.captureScreenshot", { format: "png" });
        enemyScreenshot = resolve(directory, "nomad-raid-enemy-view.png");
        writeFileSync(enemyScreenshot, Buffer.from(enemy.data, "base64"));
      }
      assert.ok(enemyScreenshot, "Expected the battlefield camera to show the raiders by the wall");
      assert.match(visibleText(), manualTurn);
      assert.equal(frame.battleTiles.length, 66);
      for (const [x, y] of [[32, 128], [40, 128], [40, 136]]) {
        assert.ok(frame.battleTiles.some(([left, top]) => x === left && y === top));
      }
      await waitFor("the enhanced opening raid battlefield", () => run(`state.sequence === ${frame.sequence} &&
        [...document.querySelectorAll(".battle-tile")].length === 66 &&
        [...document.querySelectorAll(".battle-tile")].every(img => img.naturalWidth === 32)`));
      await switchBothWays();
      const combat = await command("Page.captureScreenshot", { format: "png" });
      const combatScreenshot = resolve(directory, "nomad-raid-combat.png");
      writeFileSync(combatScreenshot, Buffer.from(combat.data, "base64"));
      const strike = "combat:area:17:CPIC2.DAX:128:ecl:afa3";
      for (const key of ["q", "enter", "enter"]) await advance(key);
      const strikeFrame = frame.animation?.find(shot => shot.combatArt.some(([, , id]) => id === strike));
      assert.ok(strikeFrame, "Expected the guest to draw the kobold's strike");
      assert.ok(strikeFrame.combatArt.some(([x, y, id]) => x === 80 && y === 80 && id === strike));
      await waitFor("the enhanced strike at the guest's combat anchor", () => run(`state.sequence === ${frame.sequence} &&
        [...document.querySelectorAll('.combat-sprite[src="/art/${strike}"]')].some(img =>
          img.naturalWidth === 96 && img.naturalHeight === 96 && img.style.left === "25%" && img.style.top === "40%")`));
      await waitFor("the strike animation to finish", () => run(`state.sequence === ${frame.sequence} &&
        animationFrame === undefined && !document.querySelector('.combat-sprite[src="/art/${strike}"]')`));
      console.log("Verified the enhanced Nomad Camp raid approach and journal in Chrome:", screenshot);
      console.log("Enhanced Nomad raiders at the wall:", enemyScreenshot);
      console.log("Enhanced opening raid battlefield:", combatScreenshot);
      console.log("Verified the enhanced kobold strike at (80,80) and its return to the live combat frame.");
    } else if (restPortraitOnly) {
      console.log("Verified the Nomad guest tent portrait, display switching, and the war-cries transition in Chrome.");
    } else {
      await advance("e");
      assert.match(visibleText(), /08:29.*AREACASTVIEWENCAMP/i);
      console.log("Verified the Nomad rest permission after reload and rested eight hours through Encamp in Chrome.");
    }
    assert.deepEqual(readFileSync(saved), originalSave);
  } else if (routeName === "nomad-feast-decline") {
    const knows = id => frame.journal.leads.some(lead => lead.id === id);
    const dismissal = "portrait:area:17:ecl:9d74:caller:a4fa:HEAD7.DAX:74:BODY7.DAX:30";
    for (const key of ["up", ...Array(4).fill("enter"), "p", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:17:ecl:9d74:caller:a4aa:HEAD7.DAX:74:BODY7.DAX:30");
    await advance("j");
    assert.ok(knows("nomad-feast-invitation") && !knows("nomad-feast-declined"));
    for (const key of ["j", "n"]) await advance(key);
    assert.equal(frame.portrait, dismissal);
    await waitFor("the Nomad headman's dismissal", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${dismissal}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${dismissal}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const dismissalShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "nomad-headman-feast-declined.png"), Buffer.from(dismissalShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("nomad-feast-declined") && !knows("nomad-feast-attended") && !knows("nomad-headman-talk"));
    assert.match(frame.journal.leads.find(({ id }) => id === "nomad-feast-declined").detail, /asked it to leave/i);
    assert.ok(!knows("nomad-refused-to-leave"));
    for (const key of ["j", refuseNomadDismissal ? "n" : "y", "j"]) await advance(key);
    assert.equal(knows("nomad-refused-to-leave"), refuseNomadDismissal);
    await advance("j");
    assert.notEqual(frame.portrait, dismissal);
    if (refuseNomadDismissal) {
      const attack = "scene-illustration:area:17:ecl:a011";
      assert.equal(frame.portrait, attack);
      await waitFor("the Nomad headman ordering the attack", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${attack}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join(""), /YOURINSULTSARETOOMANY|ABATTLEBEGINS/i);
    } else {
      assert.equal(frame.portrait, undefined);
    }
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified that declining the Nomad feast records only the witnessed outcome in Chrome.");
  } else if (routeName === "nomad-headman-decline-reload") {
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(known.has("nomad-declined-aid") && known.has("nomad-kobold-warning"));
    assert.ok(!known.has("nomad-promised-aid") && !known.has("nomad-rest-offer") && !known.has("nomad-kobold-attack"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Nomad decline and journal after reloading slot A in Chrome.");
  } else if (routeName === "nomad-headman" || routeName === "nomad-headman-stay") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    for (const key of ["up", "enter", "e", "e", "enter", ...Array(6).fill("up"), ...Array(3).fill("enter"), "j"]) await advance(key);
    assert.ok(knows("nomad-camp-found") && knows("nomad-sentries"));
    assert.ok(!knows("nomad-feast-invitation") && !knows("nomad-kobold-warning"));
    for (const key of ["j", "p", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:17:ecl:9d74:caller:a4aa:HEAD7.DAX:74:BODY7.DAX:30");
    await waitFor("the Nomad headman portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("nomad-feast-invitation") && !knows("nomad-headman-talk"));
    for (const key of ["j", "y", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("nomad-headman-talk") && !knows("nomad-kobold-warning"));
    for (const key of ["j", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:17:ecl:9da2:caller:a928:HEAD7.DAX:74:BODY7.DAX:30");
    await advance("j");
    assert.ok(knows("nomad-kobold-warning") && !knows("nomad-stay-or-leave"));
    for (const key of ["j", ...Array(4).fill("enter"), "r", "h", ...Array(8).fill("i"), "r", "e", "j"]) await advance(key);
    assert.ok(knows("nomad-stay-or-leave") && !knows("nomad-declined-aid") && !knows("nomad-kobold-attack"));
    const stays = routeName === "nomad-headman-stay";
    for (const key of ["j", stays ? "s" : "l", "j"]) await advance(key);
    assert.ok(knows(stays ? "nomad-promised-aid" : "nomad-declined-aid"));
    assert.ok(!knows(stays ? "nomad-declined-aid" : "nomad-promised-aid") && !knows("nomad-kobold-attack"));
    assert.ok(!knows("nomad-rest-offer"));
    if (stays) {
      for (const key of ["j", "enter", "j"]) await advance(key);
      assert.ok(knows("nomad-rest-offer") && !knows("nomad-kobold-attack"));
      await advance("j");
      const farewell = "scene-illustration:area:17:ecl:a5f3";
      assert.equal(frame.portrait, farewell);
      await waitFor("the Nomad rest farewell illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${farewell}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${farewell}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "nomad-headman-rest-farewell.png"), Buffer.from(shot.data, "base64"));
      await advance("e");
      assert.notEqual(frame.portrait, farewell);
      for (const key of ["enter", "s", "s", "a"]) await advance(key);
      const savedJournal = JSON.parse(readFileSync(saved, "utf8")).leads;
      assert.ok(savedJournal.some(({ id }) => id === "nomad-rest-offer"));
      console.log("Native save after the Nomad rest offer:", saved);
    } else {
      await advance("j");
      const departure = "scene-illustration:area:17:ecl:b130";
      assert.equal(frame.portrait, departure);
      await waitFor("the Nomad headman's parting illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${departure}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${departure}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "nomad-headman-declined-aid.png"), Buffer.from(shot.data, "base64"));
      await advance("enter");
      assert.notEqual(frame.portrait, departure);
      assert.deepEqual(readFileSync(saved), originalSave);
      for (const key of ["enter", "l", "e", "enter", "s", "s", "a"]) await advance(key);
      const savedJournal = JSON.parse(readFileSync(saved, "utf8")).leads;
      assert.ok(savedJournal.some(({ id }) => id === "nomad-declined-aid"));
      assert.ok(!savedJournal.some(({ id }) => id === "nomad-rest-offer"));
      console.log("Native save after declining the headman's request:", saved);
    }
    console.log(`Verified the Nomad headman portrait and journal on ${routeName} in Chrome.`);
  } else if (routeName === "phlan-harbor-sokal" || routeName === "phlan-harbor-routes") {
    for (const key of ["up", "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    const sokalOnly = routeName === "phlan-harbor-sokal";
    assert.match(text, sokalOnly ? /THEONLYBOATOUTISGOINGTOSOKALKEEP/i
      : /BOATSLEAVEFORTHEWEST,THEEAST,SOKALKEEP,ANDTHENORTHSIDEOFTHEBAY/i);
    assert.equal(frame.portrait, "portrait:area:0:HEAD3.DAX:16:BODY3.DAX:7");
    await waitFor("the New Phlan harbor master", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log(`Verified the harbor master on ${routeName} in Chrome.`);
  } else if (sokalScout) {
    const searching = routeName === "sokal-elven-scout-search";
    if (searching) for (const key of ["s", "enter"]) await advance(key);
    for (const key of ["up", "enter"]) await advance(key);
    const scout = "portrait:PIC4.DAX:3:0:0";
    assert.equal(frame.portrait, scout);
    await waitFor("the Sokal elven scout illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "sokal-parchment"));
    await advance("j");
    await advance("enter");
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    if (searching) {
      assert.match(text, /INAPOUCHONTHEREMAINSISACRUMBLINGPARCHMENTSCROLL/i);
      const parchment = "portrait:area:21:ecl:ae31:caller:9bd0:PIC4.DAX:3:0:0";
      assert.equal(frame.portrait, parchment);
      await advance("enter");
      assert.notEqual(frame.portrait, parchment);
      assert.match(frame.text.toSorted(([left], [right]) => left - right)
        .map(([, character]) => String.fromCharCode(character)).join(""), /THELASTPARTISEATENAWAY/i);
      assert.ok(frame.text.every(([cell]) => {
        const column = cell % 40;
        const row = Math.floor(cell / 40);
        return column < 1 || column >= 16 || row < 1 || row >= 16;
      }), "The parchment runes should remain in the illustration's native font");
      await switchBothWays();
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-parchment"));
    } else assert.match(text, /LEAVE.*SEARCH.*ATTACK.*TALK/i);
    console.log(`Verified ${routeName} artwork and journal in Chrome.`);
  } else if (routeName === "braccio-dirten-briefing") {
    const braccio = "portrait:HEAD3.DAX:13:BODY3.DAX:1";
    const dirten = "portrait:HEAD3.DAX:0:BODY3.DAX:4";
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, braccio);
    await waitFor("Bishop Braccio's introduction", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "bane-dirten"));
    await advance("j");
    await advance("enter");
    assert.equal(frame.portrait, dirten);
    await waitFor("Dirten's portrait", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await switchBothWays();
    await advance("enter");
    const invitation = "portrait:area:0:ecl:ae69:HEAD3.DAX:0:BODY3.DAX:4";
    assert.equal(frame.portrait, invitation);
    await waitFor("Dirten's invitation illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${invitation}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, /WILLYOUACCOMPANYDIRTEN/i);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "bane-dirten"));
    await advance("j");
    await advance(declineDirten ? "n" : "y");
    assert.equal(frame.portrait, undefined);
    assert.equal(frame.text.map(([, char]) => String.fromCharCode(char)).join("").includes("MIRA105DIRTEN"), !declineDirten);
    console.log("Verified the Braccio-to-Dirten portrait transition and quest invitation in Chrome.");
  } else if (routeName === "cadorna-envoy-briefing") {
    for (const key of ["up", "enter"]) await advance(key);
    const briefing = "portrait:area:8:ecl:b5c3:caller:b0ea:HEAD3.DAX:55:BODY3.DAX:1";
    const cadorna = "portrait:HEAD3.DAX:55:BODY3.DAX:1";
    assert.equal(frame.portrait, briefing);
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "zhentil-sealed-packet"));
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, cadorna);
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "zhentil-sealed-packet"));
    for (const key of ["j", "enter"]) await advance(key);
    assert.notEqual(frame.portrait, cadorna);
    console.log("Verified Cadorna's envoy portrait and sealed-packet clue in Chrome.");
  } else if (routeName === "valhingen-mummy-sarcophagi" || routeName === "kobold-cave-wyvern-dialogue") {
    const wyvernDialogue = routeName === "kobold-cave-wyvern-dialogue";
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, wyvernDialogue ? "portrait:PIC8.DAX:121:0:0" : "portrait:PIC4.DAX:114:0:0");
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""),
      wyvernDialogue ? /BEFOREYOULIESAHUGEWYVERN/i : /MUMMIESOPENTHEIRSARCOPHOGI/i);
    await waitFor("the enhanced encounter illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log(`Verified ${routeName} in Chrome.`);
  } else if (routeName === "yarash-desk-papers-reload") {
    await advance("j");
    const entries = frame.journal?.leads.filter(({ id }) => id.startsWith("river-yarash-paper-")).map(({ id }) => id);
    assert.deepEqual(entries?.toSorted(), [27, 33, 40, 49, 56].map(number => `river-yarash-paper-${number}`));
    await switchBothWays();
    console.log("Verified all five Yarash papers after reloading slot A.");
  } else if (routeName === "sokal-floorboard-diary-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-haunt-diary"));
    await switchBothWays();
    console.log("Verified the Sokal floorboard diary after reloading slot C.");
  } else if (routeName === "bivant-reward-reload") {
    await advance("j");
    const rescue = frame.journal?.leads.find(({ id }) => id === "commission-rescue");
    assert.equal(rescue?.status, "turned-in");
    await switchBothWays();
    console.log("Verified the completed Bivant rescue commission after reloading slot A.");
  } else if (routeName === "tyrmor-journal-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-tyrmor-journal"));
    await switchBothWays();
    console.log("Verified Tyrmor's journal discovery after reloading slot B.");
  } else if (routeName === "kuto-bandit-cache-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kuto-bandit-treasure"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the bandit cache discovery after reloading slot A in Chrome.");
  } else if (routeName === "valhingen-crypt-scroll-reload") {
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(known.has("graveyard-crypt-sanctified"));
    assert.equal(known.has("graveyard-crypt-scroll"), !declineCryptScroll);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Valhingen crypt discoveries after reloading slot A in Chrome.");
  } else if (routeName === "valhingen-crypt-scroll") {
    const scrollLead = "graveyard-crypt-scroll";
    async function checkScrollPortrait(cursor, prompt, earned, screenshot) {
      const picture = `scene-illustration:area:10:ecl:${cursor}`;
      assert.equal(frame.portrait, picture);
      assert.match(frame.text.toSorted(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join(""), prompt);
      await waitFor("the black marble crypt illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${picture}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${picture}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      if (screenshot) {
        await switchBothWays(frame.frame);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, screenshot), Buffer.from(shot.data, "base64"));
      }
      await advance("j");
      assert.ok(frame.journal);
      assert.equal(frame.journal.leads.some(({ id }) => id === scrollLead), earned);
      await advance("j");
    }
    for (const key of ["up", "down", "up"]) await advance(key);
    await checkScrollPortrait("b695:caller:af92", /INSIDETHERUINSOFABLACKMARBLECRYPT/i, false,
      "valhingen-black-marble-crypt.png");
    await advance("enter");
    await checkScrollPortrait("b6c6:caller:afab", /DOYOUREADTHESCROLL/i, false);
    await advance(declineCryptScroll ? "n" : "y");
    if (!declineCryptScroll) {
      await checkScrollPortrait("b695:caller:afe3", /THESCROLLISPLACEDINYOURJOURNALASENTRY43/i, true);
      await advance("enter");
    }
    assert.equal(frame.portrait, undefined);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /DOYOUWANTTODOANYTHINGWITHTHECOFFIN/i);
    await advance("j");
    assert.equal(frame.journal?.leads.some(({ id }) => id === scrollLead), !declineCryptScroll);
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "graveyard-crypt-sanctified"));
    for (const key of ["j", "y", "s"]) await advance(key);
    const sanctification = "scene-illustration:area:10:ecl:b0ab";
    assert.equal(frame.portrait, sanctification);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /YOUSCATTERTHEDUSTANDPLACEWHATHOLYITEMSYOUCANSPAREINSIDE/i);
    await waitFor("the crypt sanctification illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${sanctification}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "graveyard-crypt-sanctified"));
    assert.equal(frame.journal.leads.some(({ id }) => id === scrollLead), !declineCryptScroll);
    assert.deepEqual(readFileSync(saved), originalSave);
    for (const key of ["j", "e"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    for (const key of ["enter", "s", "s", "a"]) await advance(key);
    const known = new Set(JSON.parse(readFileSync(saved, "utf8")).leads.map(({ id }) => id));
    assert.ok(known.has("graveyard-crypt-sanctified"));
    assert.equal(known.has(scrollLead), !declineCryptScroll);
    console.log("Verified the Valhingen crypt illustration and scroll choice in Chrome. Native save:", saved);
  } else if (routeName === "kuto-well-waterline-reload") {
    assert.equal(frame.exploration?.mapId, 32);
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(known.has("kuto-well-waterline-door") && known.has("kuto-hidden-catacombs"));
    assert.ok(known.has("kuto-catacombs-arrow-volley"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Kuto well and hidden catacombs discoveries after reloading slot J in Chrome.");
  } else if (routeName === "diogenes-upper-ledge-fireball-reload") {
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(known.has("diogenes-fireball") && known.has("diogenes-lair-empty"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified Diogenes's fireball and empty lair after reloading slot A in Chrome.");
  } else if (traderReload) {
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(traderJournalLeads.every(id => known.has(id)));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the wagon deal and both warnings after reloading slot B in Chrome.");
  } else if (illustration) {
    const { inputs, portrait, prompt, continuation, journalLead, approachSequence } = illustration;
    if (approachSequence) await observeApproach(approachSequence, illustration.requireTiledApproach);
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
      await advance("j");
    }
    if (routeName === "sokal-ferran-farewell") {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) =>
        ["sokal-phlan-fall", "sokal-mendor", "sokal-departure"].includes(id)));
      await advance("j");
    }
    if (illustration.verifyImageSwap) {
      for (const key of inputs.slice(0, -1)) await advance(key);
      if (illustration.approach) {
        assert.deepEqual(frame.encounter, illustration.approach);
        const [, , encounter] = illustration.approach;
        await waitFor("enhanced approach sprite", () => run(`
          document.querySelector(".encounter-sprite")?.getAttribute("src") === ${JSON.stringify("/art/" + encounter)} &&
          document.querySelector(".encounter-sprite").naturalWidth === 128
        `));
      }
      const prior = "data:image/png;base64," + frame.enhancedFrame;
      await waitFor("the previous frame", () => run(`document.querySelector("#screen").src === ${JSON.stringify(prior)}`));
      await run(`(() => {
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          if (this.getAttribute("src") !== ${JSON.stringify("/art/" + portrait)}) return decode.call(this);
          return new Promise(resolve => {
            window.releasePortrait = () => {
              HTMLImageElement.prototype.decode = decode;
              resolve(decode.call(this));
            };
          });
        };
      })()`);
      await advance(inputs.at(-1));
      await waitFor("the portrait decode to be pending", () => run('Boolean(window.releasePortrait)'));
      assert.equal(await run('document.querySelector("#screen").src'), prior,
        "The previous frame should stay visible while the portrait loads");
      assert.equal(await run('Boolean(document.querySelector(".encounter-portrait"))'), false);
      assert.equal(await run(`(() => {
        const fetchGame = window.fetch;
        let submitted = false;
        window.fetch = (url, ...options) => {
          if (url === "/key") { submitted = true; return Promise.resolve({ ok: false }); }
          return fetchGame(url, ...options);
        };
        try {
          window.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter" }));
          return submitted;
        } finally {
          window.fetch = fetchGame;
        }
      })()`), false, "Enter should not advance a prompt whose portrait is still loading");
      await run('window.releasePortrait()');
    } else {
      for (const [index, key] of inputs.entries()) {
        const interimPortrait = illustration.portraitStops?.[index];
        if (interimPortrait !== undefined) {
          assert.equal(frame.portrait, interimPortrait ?? undefined);
          if (interimPortrait) {
            await waitFor("the current illustration", () => run(`state.sequence === ${frame.sequence} &&
              document.querySelector('.encounter-portrait[src="/art/${interimPortrait}"]')?.naturalWidth === 352`));
            await verifyPortraitPanel();
          }
        }
        if (routeName === "diogenes-upper-ledge-fireball" && interimPortrait) {
          await advance("j");
          assert.ok(frame.journal);
          assert.ok(!frame.journal.leads.some(({ id }) => id === "diogenes-fireball"));
          await advance("j");
        }
        if (routeName === "sokal-ferran-farewell" && interimPortrait) {
          await advance("j");
          assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-phlan-fall"));
          assert.equal(frame.journal.leads.some(({ id }) => id === "sokal-mendor"), interimPortrait.endsWith(":ace3"));
          assert.ok(!frame.journal.leads.some(({ id }) => id === "sokal-departure"));
          await advance("j");
        }
        if (routeName === "stojanow-gate-first-sight" && interimPortrait) {
          const establishing = await fetch(origin + "/art/" + interimPortrait);
          assert.ok(establishing.ok);
          assert.ok(Buffer.from(await establishing.arrayBuffer()).equals(readFileSync("upgrades/stojanow-gate-first-sight.png")));
          const gateShot = await command("Page.captureScreenshot", { format: "png" });
          writeFileSync(resolve(directory, "stojanow-gate-first-sight.png"), Buffer.from(gateShot.data, "base64"));
          await advance("j");
          assert.ok(frame.journal?.leads.some(({ id }) => id === "gate-spotted"));
          assert.ok(!frame.journal.leads.some(({ id }) => id === "gate-bugbear-lookouts"));
          await advance("j");
        }
        if (routeName === "yarash-alchemical-laboratory" && index === 5) {
          const text = frame.text.toSorted(([a], [b]) => a - b)
            .map(([, character]) => String.fromCharCode(character)).join("");
          assert.match(text, /ASSORTMENTOFTORTUREINSTR?UMENTS.*ALARGETABLEWITHMETALRESTRAINTS/i);
          const images = await Promise.all([interimPortrait, portrait].map(async id => {
            const response = await fetch(`${origin}/art/${id}`);
            assert.ok(response.ok);
            return Buffer.from(await response.arrayBuffer());
          }));
          assert.notDeepEqual(images[0], images[1], "The torture chamber and alchemy shelves need distinct illustrations");
        }
        if (routeName === "valhingen-vampire-trove" && interimPortrait === null) {
          await advance("j");
          assert.ok(frame.journal?.leads.some(({ id }) => id === journalLead));
          await advance("j");
        }
        if (routeName === "nomad-feast-arrival" && (key === "y" || interimPortrait)) {
          await advance("j");
          assert.ok(frame.journal);
          assert.equal(frame.journal.leads.some(({ id }) => id === "nomad-feast-attended"), Boolean(interimPortrait));
          await advance("j");
        }
        const placement = illustration.approachStops?.[index];
        if (placement) {
          const [, , id, width, height] = placement;
          assert.deepEqual(frame.encounter, placement);
          await waitFor("the enhanced approach before the portrait", () => run(`(() => {
            const image = document.querySelector(".encounter-sprite");
            return !animationFrame && image?.getAttribute("src") === ${JSON.stringify("/art/" + id)} &&
              image.naturalWidth === ${width * 4} && image.naturalHeight === ${height * 4};
          })()`));
          if (illustration.approachTerrainArea !== undefined) {
            assert.equal(await verifyTiledView(illustration.approachTerrainArea, new Set()), 1);
          }
        }
        await advance(key);
      }
    }
    assert.equal(frame.portrait, portrait);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), prompt);
    await waitFor("the enhanced dialogue illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.getAttribute("src") === ${JSON.stringify("/art/" + portrait)} &&
        image.naturalWidth === 352 && image.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await verifyPortraitPanel();
    if (approachSequence) {
      assert.deepEqual(await run("[...window.observedApproach]"), approachSequence.map(([, , id]) => id));
    }
    if (routeName === "new-phlan-tavern-brawl") {
      for (let page = 0; page < 2; page++) {
        await advance("enter");
        assert.equal(frame.portrait, portrait);
        await verifyPortraitPanel();
      }
      await advance("enter");
      assert.equal(frame.portrait, undefined);
      assert.equal(frame.classicPortrait, false);
      assert.equal(frame.perspective, false);
      await waitFor("enhanced battlefield after the tavern portrait", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".combat-sprite") && !document.querySelector(".encounter-portrait")`));
      await run(`(() => {
        window.brawlReports = [];
        const text = document.querySelector("#game-text");
        new MutationObserver(() => {
          if (text.hidden || !document.querySelector(".combat-sprite") || document.querySelector(".encounter-portrait")) return;
          const report = text.textContent.replace(/\\s+/g, "");
          if (/1STLVLTHIEFAttacks[A-Z]+(?:andMisses|Hittingfor)/i.test(report)) window.brawlReports.push(report);
        }).observe(text, { childList: true });
      })()`);
      for (let turn = 0; turn < 5; turn++) {
        const reportCount = await run("window.brawlReports.length");
        await advance("space");
        await waitFor("a visible tavern attack report", () => run(`window.brawlReports.length > ${reportCount}`));
      }
      const reports = (await run("window.brawlReports")).join("\n");
      assert.match(reports, /Attacks[A-Z]+andMisses/i);
      assert.match(reports, /Attacks[A-Z]+Hittingfor\d+points?ofdamage/i);
    }
    if (routeName === "new-phlan-council-entry") {
      const sokal = () => frame.journal?.leads.find(({ id }) => id === "commission-sokal");
      await advance("j");
      assert.ok(frame.journal);
      assert.equal(sokal(), undefined);
      await advance("j");
      for (let prompt = 0; prompt < 4; prompt++) await advance("enter");
      await advance("j");
      assert.equal(sokal()?.status, "reward-pending");
      await advance("j");
      await advance("s");
      await advance("e");
      await advance("j");
      assert.equal(sokal()?.status, "turned-in");
      await advance("j");
      assert.deepEqual(readFileSync(saved), originalSave);
      for (const key of ["enter", "enter", "enter", "enter", "e", "s", "s", "a"]) await advance(key);
      assert.notDeepEqual(readFileSync(saved), originalSave);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpoint.leads.find(({ id }) => id === "commission-sokal")?.status, "turned-in");
      console.log("Sokal reward checkpoint:", saved);
    }
    if (routeName === "stojanow-gate-first-sight") {
      const lookouts = await fetch(origin + "/art/" + portrait);
      assert.ok(lookouts.ok);
      assert.ok(Buffer.from(await lookouts.arrayBuffer()).equals(readFileSync("upgrades/stojanow-gate-bugbear-lookouts.png")));
      const lookoutsShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "stojanow-gate-bugbear-lookouts.png"), Buffer.from(lookoutsShot.data, "base64"));
    }
    if (continuation) {
      if (journalLead) {
        await advance("j");
        assert.ok(frame.journal);
        assert.equal(frame.journal.leads.some(({ id }) => id === journalLead), Boolean(illustration.journalLeadAtDiscovery));
        if (routeName === "stojanow-gate-first-sight") {
          assert.ok(frame.journal.leads.some(({ id }) => id === "gate-spotted"));
        }
        if (routeName === "kuto-well-waterline") {
          assert.ok(!frame.journal.leads.some(({ id }) => id === "kuto-hidden-catacombs"));
        }
        if (routeName === "stojanow-wagon-handover") {
          assert.ok(frame.journal.leads.some(({ id }) => id === "gate-trader-deal"));
          assert.ok(!frame.journal.leads.some(({ id }) => id === "gate-trader-ettin-warning"));
        }
        await advance("j");
      }
      for (const key of continuation.inputs) await advance(key);
      const nextPortrait = continuation.clearsPortrait ? undefined : continuation.portrait ?? portrait;
      assert.equal(frame.portrait, nextPortrait);
      if (continuation.portrait) await waitFor("the enhanced continuation portrait", () => run(`
        document.querySelector('.encounter-portrait[src="/art/${nextPortrait}"]')?.naturalWidth === 352
      `));
      assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), continuation.prompt);
      if (!continuation.clearsPortrait) await verifyPortraitPanel();
      if (routeName === "valjevo-disguise-offer") {
        const disguise = () => frame.journal?.leads.find(({ id }) => id === "castle-disguise");
        await advance("j");
        assert.equal(disguise()?.castleDisguiseActive, false);
        for (const key of ["j", declineValjevoDisguise ? "n" : "y"]) await advance(key);
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""),
          declineValjevoDisguise ? /THEYHELPYOUPUTONTHECLOTHES/i : /BESTYOULEAVEBEFOREYOUAREFOUNDHERE/i);
        await advance("j");
        assert.equal(disguise()?.castleDisguiseActive, !declineValjevoDisguise);
        for (const key of ["j", "l"]) await advance(key);
        assert.equal(frame.portrait, undefined);
      }
      if (routeName === "podal-auction-garwin-escaped") {
        await advance("left");
        assert.equal(frame.portrait, nextPortrait);
        await advance("up");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /7,5N/i);
      }
      if (routeName === "lizard-wilds-kobold-prisoners") {
        await advance("down");
        assert.equal(frame.portrait, nextPortrait);
        await advance("up");
        assert.equal(frame.portrait, undefined);
      }
      if (routeName === "wild-cave-boar-dialogue") {
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /WILDBOARHITPOINTS/i);
      }
      if (routeName === "wild-cave-giant-snake-dialogue") {
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /GIANTSNAKEHITPOINTS/i);
      }
      if (routeName === "wild-cave-giant-lizard-dialogue") {
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /MOVEVIEWAIMUSEQUICKDONE/i);
      }
      if (routeName === "mendor-fighter-dialogue") {
        await advance("right");
        assert.equal(frame.portrait, nextPortrait);
        await advance("up");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /10,12W/i);
      }
      if (routeName === "new-phlan-rolf-tour") {
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /ENTRANCETOTHEPASSENGERDOCKAREA/i);
        await waitForExplorationViewport();
        await advance("enter");
        await verifyRolfTrainingSchools();
        await advance("enter");
        assert.equal(frame.portrait, undefined);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /WEAREJUSTOUTSIDETHECITYHALL/i);
        await waitForExplorationViewport();
      }
      if (routeName === "kuto-well-waterline") {
        assert.equal(frame.exploration?.mapId, 32);
        for (const key of ["down", "up"]) await advance(key);
        const catacombs = "scene-illustration:area:29:ecl:af2f:caller:a08a";
        assert.equal(frame.portrait, catacombs);
        assert.match(frame.text.toSorted(([a], [b]) => a - b)
          .map(([, character]) => String.fromCharCode(character)).join(""), /YOUPASSINTOHIDDENCATACOMBS.*CURTAINSHUNGTOCOVERDOORWAYS/i);
        await waitFor("the hidden catacombs illustration", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${catacombs}"]')?.naturalWidth === 352 &&
          document.querySelector('.encounter-portrait[src="/art/${catacombs}"]')?.naturalHeight === 352`));
        await verifyPortraitPanel();
        await switchBothWays(frame.frame);
        await advance("j");
        assert.ok(frame.journal?.leads.some(({ id }) => id === "kuto-hidden-catacombs"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "kuto-catacombs-arrow-volley"));
        await advance("j");
        await advance("enter");
        const volley = "scene-illustration:area:29:ecl:a105";
        assert.deepEqual(frame.animation?.flatMap(({ encounter }) => encounter ? [encounter] : []),
          [[56, 32, "encounter:area:29:ecl:a0a4:SPRIT8.DAX:0:2:0", 24, 57]]);
        assert.equal(frame.encounter, undefined);
        assert.equal(frame.portrait, volley);
        assert.match(frame.text.toSorted(([a], [b]) => a - b)
          .map(([, character]) => String.fromCharCode(character)).join(""), /AVOLLEYOFARROWSTEARSINTOTHEGROUP/i);
        await waitFor("the catacombs arrow volley illustration", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${volley}"]')?.naturalWidth === 352`));
        await verifyPortraitPanel();
        await switchBothWays(frame.frame);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "kuto-catacombs-arrow-volley.png"), Buffer.from(shot.data, "base64"));
        await advance("enter");
        assert.equal(frame.portrait, "scene-illustration:area:29:ecl:af2f:caller:a10f");
        await advance("enter");
        assert.equal(frame.portrait, undefined);
      }
      if (routeName === "valhingen-storm-entrance") {
        await waitFor("the local map to become available after the storm", () => run(
          'document.querySelector("#travel-map").hidden && !document.querySelector("#map-toggle").disabled'));
        await run('document.querySelector("#map-toggle").click()');
        await waitFor("the graveyard automap", () => run('!document.querySelector("#automap").hidden'));
        await run('document.querySelector("#atlas-map").click()');
        await waitFor("Valhingen's illustrated map", () => run(`
          !document.querySelector("#atlas-view").hidden &&
          document.querySelector("#atlas-sheet").value === "valhingen-graveyard-concept-v1.png" &&
          document.querySelector("#atlas-image").naturalWidth > 0
        `));
        await run('document.querySelector("#close-map").click()');
        assert.equal((await latest()).sequence, frame.sequence);
      }
    }
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === journalLead), "Expected witnessed dialogue lead");
      if (routeName === "diogenes-upper-ledge-fireball") {
        assert.ok(!frame.journal.leads.some(({ id }) => id === "diogenes-lair-empty"));
        for (const key of ["j", "enter"]) await advance(key);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /AFTERRECOVERINGFROMTHEFIREBALLYOUSEARCHTHERESTOFTHELAIR/i);
        assert.notEqual(frame.portrait, portrait);
        await advance("j");
        assert.ok(frame.journal?.leads.some(({ id }) => id === "diogenes-lair-empty"));
      }
      if (routeName === "mendor-philosophy-stacks") {
        assert.ok(frame.journal.leads.some(({ id }) => id === "mendor-library-stacks"));
        assert.deepEqual(frame.journal.leads.filter(({ id }) => id.startsWith("mendor-stacks-")).map(({ id }) => id),
          ["mendor-stacks-philosophy"]);
      }
      if (routeName === "stojanow-wagon-handover") {
        assert.ok(!frame.journal.leads.some(({ id }) => id === "gate-trader-ettin-warning"));
        for (const key of ["j", "enter"]) await advance(key);
        const ettinWarning = "scene-illustration:area:9:ecl:9c63:caller:b014";
        assert.equal(frame.portrait, ettinWarning);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /THEY'REAFRAIDOFTHEMETTIN/i);
        await waitFor("the trader's warning about the ettin", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${ettinWarning}"]')?.naturalWidth === 352`));
        await verifyPortraitPanel();
        await advance("j");
        assert.ok(frame.journal?.leads.some(({ id }) => id === "gate-trader-ettin-warning"));
      }
      if (routeName === "podal-auction-ogre-searched") {
        assert.ok(frame.journal.leads.some(({ id }) => id === "auction-cancelled"));
        assert.ok(!frame.journal.leads.some(({ id }) => id === "auction-garwin-escaped"));
      }
      if (routeName === "nomad-feast-arrival") assert.ok(frame.journal.leads.some(({ id }) => id === "nomad-feast-attended"));
      if (routeName === "kobold-cave-envoys-rematch" && frame.journal.trackedId === "commission-kobolds") {
        assert.match(frame.journal.objective.nextStep, /confront the king.*at the throne/i);
      }
      await advance("j");
    }
    if (routeName === "kuto-bandit-cache") {
      assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join(""), /DOYOUTAKEIT\?YESNO/i);
      await advance(declineKutoCache ? "n" : "y");
      assert.equal(frame.portrait, undefined);
      assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""),
        declineKutoCache ? /AREACASTVIEWENCAMP/i : /THEPARTYHASFOUNDTREASURE.*RECEIVES867EXPERIENCEPOINTS/i);
      if (declineKutoCache) {
        for (const key of ["e", "s", "s", "a"]) await advance(key);
        const checkpoint = resolve(directory, "A.json");
        const { leads } = JSON.parse(readFileSync(checkpoint, "utf8"));
        assert.ok(leads.some(({ id }) => id === "kuto-bandit-treasure"));
        console.log("Native save after leaving the bandit's treasure:", checkpoint);
      }
    }
    if (routeName === "kuto-well-waterline") {
      assert.deepEqual(readFileSync(saved), originalSave);
      for (const key of ["e", "enter", "s", "s", "j"]) await advance(key);
      const known = new Set(JSON.parse(readFileSync(saved, "utf8")).leads.map(({ id }) => id));
      assert.ok(known.has("kuto-well-waterline-door") && known.has("kuto-hidden-catacombs"));
      assert.ok(known.has("kuto-catacombs-arrow-volley"));
      console.log("Native save after entering the Kuto catacombs:", saved);
    }
    if (routeName === "diogenes-upper-ledge-fireball") {
      assert.deepEqual(readFileSync(saved), originalSave);
      for (const key of ["enter", "enter", "i", "e", "enter", "s", "s", "a"]) await advance(key);
      const known = new Set(JSON.parse(readFileSync(saved, "utf8")).leads.map(({ id }) => id));
      assert.ok(known.has("diogenes-fireball") && known.has("diogenes-lair-empty"));
      console.log("Native save after searching Diogenes's lair:", saved);
    }
    if (routeName === "stojanow-wagon-handover") {
      assert.deepEqual(readFileSync(saved), originalSave);
      await advance("enter");
      assert.equal(frame.portrait, undefined);
      for (const key of ["e", "enter", "s", "s", "b"]) await advance(key);
      const known = new Set(JSON.parse(readFileSync(saved, "utf8")).leads.map(({ id }) => id));
      assert.ok(traderJournalLeads.every(id => known.has(id)));
      console.log("Native save after the wagon purchase:", saved);
    }
    if (routeName === "sokal-floorboard-diary") {
      await advance("n");
      assert.equal(frame.portrait, undefined);
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-haunt-diary"));
      for (const key of ["j", "e", "s", "s", "c"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(checkpoint.leads.some(({ id }) => id === "sokal-haunt-diary"));
      console.log("Sokal floorboard diary checkpoint:", saved);
    }
    if (routeName === "sokal-ferran-farewell") {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === "sokal-departure"));
      await advance("j");
    }
    if (routeName === "yarash-desk-papers") {
      await advance("j");
      for (const number of [33, 49, 27, 56, 40]) {
        assert.ok(frame.journal?.leads.some(({ id }) => id === `river-yarash-paper-${number}`));
      }
      for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpoint.leads.filter(({ id }) => id.startsWith("river-yarash-paper-")).length, 5);
      console.log("Yarash papers checkpoint:", saved);
    }
    if (illustration.book) {
      await advance("y");
      await advance("j");
      const book = frame.journal?.leads.find(({ id }) => id === `mendor-book-${illustration.book}`);
      assert.equal(book?.status, "ready-to-report");
      await advance("j");
    }
    if (routeName === "tyrmor-corpse-without-search") {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "river-tyrmor-journal"));
      await advance("j");
    }
    if (routeName === "tyrmor-journal-discovery") {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === "river-tyrmor-journal"));
      for (const key of ["j", "e", "s", "s", "b"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(checkpoint.leads.some(({ id }) => id === "river-tyrmor-journal"));
      console.log("Tyrmor journal checkpoint:", saved);
    }
    console.log(`Verified ${routeName} illustration, panel fit, and mode switching in Chrome.`);
  } else if (routeName === "pyramid-lizardfolk-vats") {
    for (const key of ["s", "up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:23:ecl:9a04:caller:a236:PIC7.DAX:57:0:0");
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /POKINGAROUNDINTHEVATS/i);
    await waitFor("the vat ambush illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:area:23:ecl:a23f:PIC7.DAX:57:0:0");
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    assert.equal(frame.combatArt.filter(([, , id]) => id === "combat:area:23:CPIC7.DAX:57:ecl:a23f").length, 3);
    console.log("Verified the Yarash vat ambush illustration and three combatants in Chrome.");
  } else if (routeName === "kobold-cave-efreeti-dialogue") {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    for (const key of ["s", "up", "p", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:70:0:0");
    await waitFor("the efreeti dialogue illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("kobold-efreeti") && !knows("kobold-efreeti-warning"));
    for (const key of ["j", "n", "j"]) await advance(key);
    assert.ok(knows("kobold-efreeti-warning"));
    console.log("Verified the efreeti portrait and witnessed warning in Chrome.");
  } else if (routeName === "bane-hidden-treasure") {
    for (const key of ["s", "enter", "up", "o", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC1.DAX:1:0:0");
    const menu = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, char]) => String.fromCharCode(char)).join("");
    assert.match(menu, /VIEW.*TAKE.*POOL.*EXIT/i);
    await waitFor("the enhanced treasure illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the hidden treasure illustration and loot menu in Chrome.");
  } else if (routeName === "phlan-priest-tyr" || routeName === "phlan-priest-tempus") {
    const temple = routeName === "phlan-priest-tempus" ? "Tempus" : "Tyr";
    const priest = temple === "Tempus" ? "portrait:area:0:HEAD3.DAX:57:BODY3.DAX:1" : "portrait:HEAD3.DAX:34:BODY3.DAX:2";
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, priest);
    await waitFor(`the priest of ${temple} portrait`, () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("y");
    assert.equal(frame.portrait, priest);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /HEAL/i);
    await switchBothWays();
    console.log(`Verified the Temple of ${temple} portrait through the healing menu in Chrome.`);
  } else if (routeName === "phlan-priestess-joy") {
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "phlan-sune-healing"));
    await advance("j");
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:22:BODY3.DAX:24");
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, /PRIESTESSJOYOFSUNE.*DOYOUSEEKHEALING/i);
    const joyPortraitLoaded = () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image.src.endsWith("/portrait:HEAD3.DAX:22:BODY3.DAX:24");
    })()`);
    await waitFor("Priestess Joy's Enhanced portrait", joyPortraitLoaded);
    await switchBothWays();
    await waitFor("Priestess Joy's portrait after switching back to Enhanced", joyPortraitLoaded);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "phlan-sune-healing"));
    await advance("j");
    await advance("y");
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:22:BODY3.DAX:24");
    await waitFor("Priestess Joy's Enhanced portrait in the healing menu", joyPortraitLoaded);
    assert.match(frame.text.filter(([cell]) => cell >= 960).toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /HEAL.*VIEW.*POOL.*APPRAISE.*EXIT/i);
    console.log("Verified Priestess Joy's healing prompt portrait in Chrome.");
  } else if (routeName === "slums-potion-booth") {
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "ohlo-booth"));
    await advance("j");
    for (const key of ["up", "enter"]) await advance(key);
    const merchant = "portrait:area:20:HEAD2.DAX:5:BODY2.DAX:9";
    assert.equal(frame.portrait, merchant);
    await waitFor("the Slums potion merchant portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "ohlo-booth"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "ohlo-package-received"));
    await advance("j");
    for (const key of ["s", "o", "h", "l", "o", "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, /RETURNSWITHAPACKAGE/i);
    const handoff = "scene-illustration:area:20:ecl:b05c";
    assert.equal(frame.portrait, handoff);
    await waitFor("the Rope Guild package illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${handoff}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    const shot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "ohlo-package-handoff.png"), Buffer.from(shot.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "ohlo-package-received"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "ohlo-delivered"));
    for (const key of ["j", "up"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    for (const key of ["e", "s", "s", "b"]) await advance(key);
    const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(checkpoint.leads?.some(({ id }) => id === "ohlo-package-received"));
    console.log("Rope Guild package checkpoint:", saved);
    console.log("Verified the Slums potion booth portrait and package handoff in Chrome. Capture:", directory);
  } else if (routeName === "slums-potion-booth-reload") {
    assert.equal(frame.portrait, undefined);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "ohlo-package-received"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "ohlo-delivered"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Rope Guild package discovery after reloading in Chrome.");
  } else if (routeName === "slums-fortune") {
    const portrait = "portrait:HEAD2.DAX:25:BODY2.DAX:13";
    const visions = [
      [/BLOODANDVIOLENCEAREWRITBOLDLY/i, "slums-fortune-warning"],
      [/APOWERFULONEBECOMESAWAREOFYOURDEEDS/i, "slums-fortune-power"],
      [/THETIMEISNIGHWHENTHEPATHSYOUHAVETRODWILLEMPTY/i, "slums-fortune-riddle"],
    ];
    const knownVisions = () => frame.journal?.leads.map(({ id }) => id)
      .filter((id) => visions.some(([, vision]) => id === vision));
    const reading = (caller) => `portrait:area:20:ecl:b6df:caller:${caller}:HEAD2.DAX:25:BODY2.DAX:13`;
    const verifyReading = async (caller, filename) => {
      assert.equal(frame.portrait, reading(caller));
      await waitFor("the fortune reading portrait", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
        document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, filename), Buffer.from(capture.data, "base64"));
      await switchBothWays();
    };
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    await waitFor("the Slums fortune teller portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal);
    assert.deepEqual(knownVisions(), []);
    for (const key of ["j", "p"]) await advance(key);
    await verifyReading("a7fd", "fortune-transformation.png");
    await advance("enter");
    await verifyReading("a953", "fortune-prophecy.png");
    const prophecy = frame.text.toSorted(([a], [b]) => a - b)
      .map(([, char]) => String.fromCharCode(char)).join("").replace(/s/g, "");
    const vision = visions.find(([cue]) => cue.test(prophecy))?.[1];
    assert.ok(vision, "Native dialogue should identify the paid prophecy");
    await advance("j");
    assert.deepEqual(knownVisions(), [vision]);
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    console.log("Verified the Slums fortune teller portrait and paid reading in Chrome.");
  } else if (koboldKingFall) {
    const reload = routeName.endsWith("-reload") || koboldThroneReturn || koboldCaveExit;
    const defeat = "kobold-king-fell";
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kobolds");
    if (!reload) {
      assert.ok(!frame.journal.leads.some(({ id }) => id === defeat));
      assert.match(frame.journal.objective.nextStep, /Defeat the king's guards/);
      for (const key of ["j", "up", "j"]) await advance(key);
    }
    assert.ok(frame.journal.leads.some(({ id }) => id === defeat));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-kobolds")?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /tell the council clerk at City Hall that the king fell/);
    if (koboldThroneReturn) assert.match(frame.journal.objective.nextStep, /one square west, one north, four west, then south/);
    await advance("j");
    if (koboldCaveExit) {
      const patterns = new Set();
      const route = [
        ...Array(5).fill("up"), "right", "up", "left", "up", "right", "up",
        "left", "up", "up", "left", "up", "right", "up", "up", "right", "up",
        "left", "up", "left", "up", "up", "up", "right", "up", "enter", "up", "up",
      ];
      for (const key of route) {
        await advance(key);
        assert.equal(await verifyTiledView(13, patterns), 1);
      }
      const text = () => frame.text.map(([, c]) => String.fromCharCode(c)).join("");
      assert.match(text(), /DOYOUWANTTOLEAVE/i);
      await advance("y");
      assert.equal(await verifyTiledView(13, patterns), 1);
      await advance("enter");
      assert.match(text(), /WHATCAVEWILLYOUENTER/i);
      assert.equal(frame.perspective, false, "The cave-selection prompt should show the overland map");
      assert.deepEqual(frame.tiles, []);
      await waitFor("the overland map at the cave-selection prompt", () => run(`state.sequence === ${frame.sequence} &&
        !document.querySelector("#tile-art .terrain-tile, #tile-art .perspective-backdrop")`));
      await switchBothWays();
      await advance("e");
      assert.match(text(), /32,15S/i);
      assert.equal(frame.perspective, false, "The overland map should not use the first-person tile renderer");
      assert.deepEqual(frame.tiles, []);
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-caves-left"));
      assert.match(frame.journal.objective.nextStep, /New Phlan.*tell the council clerk/i);
      await switchBothWays();
      for (const key of ["j", "e", "s", "s", "b"]) await advance(key);
      const escaped = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(escaped.leads.some(({ id }) => id === "kobold-caves-left"));
      assert.equal(escaped.leads.find(({ id }) => id === "commission-kobolds")?.status, "ready-to-report");
      console.log("Verified and saved the enhanced return from the kobold throne to the overland map:", saved);
    } else if (koboldThroneReturn) {
      const patterns = new Set();
      for (const key of ["left", "up", "right", "up", "left", ...Array(4).fill("up"), "left", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(13, patterns), 1);
      }
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      const returned = JSON.parse(readFileSync(saved, "utf8"));
      assert.deepEqual([...Buffer.from(returned.data, "base64").subarray(12801, 12804)], [5, 1, 4]);
      assert.equal(returned.leads.find(({ id }) => id === "commission-kobolds")?.status, "ready-to-report");
      console.log("Verified the enhanced return from the pit to the kobold throne room.");
    } else if (reload) {
      const patterns = new Set();
      for (const key of ["right", "up", "right", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(13, patterns), 1);
      }
      await advance("j");
      assert.match(frame.journal?.objective.nextStep ?? "", /tell the council clerk at City Hall that the king fell/);
      await advance("j");
      await switchBothWays();
      console.log("Verified the kobold report objective after reload and four enhanced views beyond the pit.");
    } else {
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      const savedResult = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(savedResult.tracked, "commission-kobolds");
      assert.ok(savedResult.leads.some(({ id }) => id === defeat));
      console.log("Verified the king's fall and saved the council report objective:", saved);
    }
  } else if (routeName === "kobold-royal-ballista") {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    const warning = /USESECRETWEAPONS|BALLISTAAPPEARANDFIRE/i;
    const seesBallista = () => warning.test(frame.text.map(([, char]) => String.fromCharCode(char)).join(""));
    await advance("j");
    assert.ok(frame.journal && !knows("kobold-king-ballista"));
    for (const key of ["j", "up"]) await advance(key);
    for (let i = 0; i < 6 && !seesBallista(); i++) await advance("enter");
    assert.ok(seesBallista());
    await advance("j");
    assert.ok(knows("kobold-king-ballista") && !knows("kobold-surrender-offer") && !knows("kobold-prison-escort"));
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the witnessed kobold ballista clue in Chrome.");
  } else if (koboldKingDoor) {
    const reload = routeName.endsWith("-reload");
    const door = "kobold-king-secret-door";
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kobolds");
    if (!reload) {
      assert.ok(!frame.journal.leads.some(({ id }) => id === door));
      assert.match(frame.journal.objective.nextStep, /Use Search in the throne room/);
      for (const key of ["j", "s", "up"]) await advance(key);
      assert.match(frame.text.map(([, c]) => String.fromCharCode(c)).join(""), /YOUFINDASECRETDOORINTHENORTHWALL/i);
      await advance("j");
    }
    assert.ok(frame.journal.leads.some(({ id }) => id === door));
    assert.match(frame.journal.objective.nextStep, /Go through the secret door in the north wall/);
    assert.match(frame.journal.objective.nextStep, /turn east and go two squares/);
    await advance("j");
    if (!reload) {
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      const savedDoor = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(savedDoor.leads.some(({ id }) => id === door));
      console.log("Verified and saved the original secret door discovery:", saved);
    } else {
      const patterns = new Set();
      for (const key of ["up", "right", "up", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(13, patterns), 1);
      }
      assert.match(frame.text.map(([, c]) => String.fromCharCode(c)).join(""), /YOUREACHTHEKING'SQUARTERSANDCONFRONTHISGUARDS/i);
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "kobold-king-quarters"));
      assert.match(frame.journal.objective.nextStep, /Defeat the king's guards/);
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified the route through the kobold secret door to the king's quarters after reload.");
    }
  } else if (routeName === "kobold-escort-arrival-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kobolds");
    const lead = id => frame.journal.leads.find(entry => entry.id === id);
    assert.match(lead("kobold-guide-arrived")?.detail ?? "", /guide fell into a stupor/i);
    assert.ok(!lead("kobold-throne-envoys"));
    assert.match(frame.journal.objective.nextStep, /one square north, two squares west, then north to the throne room/i);
    await switchBothWays();
    for (const key of ["j", "up", "left", "up", "up", "right", "up", "up", "up", "j"]) await advance(key);
    assert.ok(lead("kobold-throne-envoys"));
    assert.match(frame.journal.objective.nextStep, /Confront the king and the envoys/i);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Kobold guide's directions and the throne encounter after a cold reload.");
  } else if (koboldGuide) {
    const guide = "portrait:area:13:PIC8.DAX:0:0:0";
    const sleepingGuide = "portrait:area:13:ecl:9ef1:PIC8.DAX:0:0:0";
    const knowsOffer = () => frame.journal?.leads.some(({ id }) => id === "kobold-guide-offer");
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, sleepingGuide);
    await waitFor("the sleeping kobold guide portrait", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${sleepingGuide}"]')?.naturalWidth === 352`));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !knowsOffer());
    for (const key of ["j", "w"]) await advance(key);
    assert.equal(frame.portrait, guide);
    await advance("j");
    assert.ok(knowsOffer());
    if (declineKoboldGuide) {
      for (const key of ["j", "n", "j"]) await advance(key);
      const clues = new Set(frame.journal.leads.map(({ id }) => id));
      assert.ok(clues.has("kobold-guide-asleep") && !clues.has("kobold-guide-follow") && !clues.has("kobold-guide-arrived"));
      assert.match(frame.journal.objective.nextStep, /guide went back to sleep.*another way to the king/i);
      await switchBothWays();
      assert.deepEqual(readFileSync(saved), originalSave);
    }
    if (koboldEscort) {
      async function verifyGuideScene(id, filename) {
        assert.equal(frame.portrait, id);
        await waitFor("the guide's illustrated escort scene", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${id}"]')?.naturalWidth === 352`));
        await verifyPortraitPanel();
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, filename), Buffer.from(shot.data, "base64"));
        await switchBothWays();
      }
      assert.equal(frame.journal.trackedId, "commission-kobolds");
      assert.match(frame.journal.objective.nextStep, /Choose Yes.*escort/);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-guide-arrived" || id === "kobold-throne-envoys"));
      for (const key of ["j", "y"]) await advance(key);
      await verifyGuideScene("scene-illustration:area:13:ecl:b511:caller:afc2", "kobold-guide-wall-tap.png");
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "kobold-guide-follow"));
      assert.match(frame.journal.objective.nextStep, /Follow the kobold guide/);
      await advance("j");
      const atThrone = () => /THEENVOYSAREHEREGREATKING|SENDTHEMFORWARD/i.test(
        frame.text.map(([, c]) => String.fromCharCode(c)).join("").replace(/[^a-z]/gi, ""));
      for (let stop = 0; stop < 20 && !atThrone(); stop++) await advance("enter");
      assert.ok(atThrone(), "The guide should announce the party at the throne");
      await verifyGuideScene("scene-illustration:area:13:ecl:b1dc", "kobold-guide-throne-arrival.png");
      await advance("j");
      assert.match(frame.journal.leads.find(({ id }) => id === "kobold-guide-arrived")?.detail ?? "", /guide fell into a stupor/i);
      assert.match(frame.journal.objective.nextStep, /one square north, two squares west, then north to the throne room/);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-throne-envoys"));
      for (const key of ["j", "up", "left", "up", "up", "right", "up", "up", "up", "j"]) await advance(key);
      assert.ok(frame.journal.leads.some(({ id }) => id === "kobold-throne-envoys"));
      assert.match(frame.journal.objective.nextStep, /Confront the king and the envoys/);
      for (const key of ["j", "enter", "enter"]) await advance(key);
      const throne = "portrait:area:13:ecl:a14b:PIC8.DAX:0:0:0";
      assert.equal(frame.portrait, throne);
      await waitFor("the kobold king and the envoys", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${throne}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "kobold-throne-in-chrome.png"), Buffer.from(capture.data, "base64"));
    }
    if (koboldEscort) {
      assert.equal(escortViews, 12);
      assert.equal(escortTilePatterns.size, 53);
    }
    console.log(koboldEscort ? `Verified ${escortViews} enhanced views, the guided walk, journal directions, and first meeting at the kobold throne.`
      : "Verified the kobold guide portrait and witnessed escort offer in Chrome.");
  } else if (fatimaReload) {
    const roster = frame.text.filter(([cell]) => cell < 640).map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(/PRINCESSFATIMA/i.test(roster), !declineFatima);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-fatima-join-offer"));
    assert.equal(frame.journal.leads.some(({ id }) => id === "kobold-fatima-left"), declineFatima);
    await switchBothWays();
    console.log("Verified Fatima's roster and journal outcome after reloading slot B.");
  } else if (princessFatima) {
    const fatima = "portrait:HEAD8.DAX:67:BODY8.DAX:37";
    const approach = "encounter:area:13:ecl:a775:SPRIT8.DAX:16:0:0";
    await observeApproach([[48, 32, approach, 40, 80]]);
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "kobold-fatima-account"));
    for (const key of ["j", "up", "enter"]) await advance(key);
    await waitFor("Fatima’s enhanced approach", () => run(`window.observedApproach.has(${JSON.stringify(approach)})`));
    const firstMeeting = "portrait:area:13:ecl:b511:caller:a7cd:HEAD8.DAX:67:BODY8.DAX:37";
    assert.equal(frame.portrait, firstMeeting);
    await waitFor("Fatima's first meeting illustration", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${firstMeeting}"]')?.naturalWidth === 352`));
    await advance("enter");
    assert.equal(frame.portrait, fatima);
    await waitFor("Princess Fatima's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-fatima-account"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-fatima-join-offer"));
    for (const key of ["j", "enter"]) await advance(key);
    const offer = "scene-illustration:area:13:ecl:a838";
    assert.equal(frame.portrait, offer);
    await waitFor("Fatima's offer to join", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${offer}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${offer}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const offerShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "fatima-offers-to-join.png"), Buffer.from(offerShot.data, "base64"));
    await switchBothWays(frame.frame);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-fatima-join-offer"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-fatima-left"));
    for (const key of ["j", declineFatima ? "n" : "y"]) await advance(key);
    if (declineFatima) {
      const farewell = "scene-illustration:area:13:ecl:a8d8";
      assert.equal(frame.portrait, farewell);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /GOODHUNTING.*SHELEAVES/i);
      await waitFor("Fatima's farewell illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${farewell}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${farewell}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const farewellShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "fatima-farewell.png"), Buffer.from(farewellShot.data, "base64"));
      await switchBothWays(frame.frame);
    } else {
      assert.equal(frame.portrait, undefined);
      await waitFor("Fatima's offer to clear", () => run(`state.sequence === ${frame.sequence} &&
        !document.querySelector(".encounter-portrait")`));
    }
    const roster = frame.text.filter(([cell]) => cell < 640).map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(/PRINCESSFATIMA/i.test(roster), !declineFatima);
    await advance("j");
    assert.equal(frame.journal?.leads.some(({ id }) => id === "kobold-fatima-left"), declineFatima);
    if (declineFatima) {
      for (const key of ["j", "up"]) await advance(key);
      assert.equal(frame.portrait, undefined);
      await waitFor("Fatima's farewell to clear on movement", () => run(`state.sequence === ${frame.sequence} &&
        !document.querySelector('.encounter-portrait')`));
    }
    if (!declineFatima) await advance("j");
    for (const key of ["e", "s", "s", "b"]) await advance(key);
    const outcome = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(outcome.leads.some(({ id }) => id === "kobold-fatima-join-offer"));
    assert.equal(outcome.leads.some(({ id }) => id === "kobold-fatima-left"), declineFatima);
    console.log("Fatima outcome checkpoint:", saved);
    console.log(`Verified Princess Fatima's illustrated offer, journal, and ${declineFatima ? "departure" : "recruitment"} in Chrome. Capture:`, directory);
  } else if (mendorStacks) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.ok(frame.journal && !knows("mendor-library-stacks"));
    for (const key of ["j", "up", "up", "right", "up", "up", "up", "right", "up", "j"]) await advance(key);
    assert.ok(knows("mendor-library-stacks"));
    assert.ok(!frame.journal.leads.some(({ id }) => id.startsWith("mendor-book-")));
    await switchBothWays();
    console.log("Verified the witnessed library stacks clue in Chrome.");
  } else if (nomadSentries) {
    for (const key of ["up", "enter", "e", "e", "enter", ...Array(6).fill("up"), "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD7.DAX:61:BODY7.DAX:30");
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /THENOMADSWAITFORYOUTOMAKETHEFIRSTMOVE/i);
    await waitFor("the nomad sentries portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("p");
    assert.equal(frame.portrait, "portrait:HEAD7.DAX:74:BODY7.DAX:30");
    console.log("Verified the Nomad Camp sentries and handoff to the headman in Chrome.");
  } else if (conjurerPrompt) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC4.DAX:17:0:0");
    const dialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(dialogue, conjurerPrompt);
    await waitFor("the Valhingen conjurer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log(`Verified the Valhingen conjurer portrait on ${routeName} in Chrome.`);
  } else if (routeName === "valjevo-forge-authorization-reload") {
    assert.equal(frame.portrait, undefined);
    await advance("j");
    for (const id of ["castle-forge", "castle-forge-authorization"]) {
      assert.ok(frame.journal?.leads.some(lead => lead.id === id), `Missing saved clue: ${id}`);
    }
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified both forge clues after reloading in Chrome.");
  } else if (routeName === "buccaneer-bivant-purchase-reload") {
    await advance("j");
    const known = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(known.has("rescue-captain-price") && known.has("rescue-heir-purchased"));
    assert.ok(!known.has("rescue-heir-freed") && !known.has("rescue-heir-left-behind"));
    assert.match(frame.journal.leads.find(({ id }) => id === "rescue-heir-purchased").detail, /escort the boy out through the base gate/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the peaceful Bivant purchase after reloading slot A in Chrome.");
  } else if (routeName === "buccaneer-bivant-purchase") {
    const knows = (id) => frame.journal?.leads.some(lead => lead.id === id);
    const price = "rescue-captain-price";
    const purchase = "rescue-heir-purchased";
    for (const key of ["up", "enter", "enter", "j"]) await advance(key);
    assert.ok(!knows(price) && !knows(purchase));
    for (const key of ["j", "m"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:1:HEAD6.DAX:9:BODY6.DAX:5");
    await advance("j");
    assert.ok(knows(price) && !knows(purchase));
    assert.match(frame.journal.leads.find(({ id }) => id === price).detail, /choose buy the boy/i);
    for (const key of ["j", "b"]) await advance(key);
    const handoff = "scene-illustration:area:1:ecl:b5f7:caller:af4c";
    assert.equal(frame.portrait, handoff);
    await waitFor("the captain handing over Bivant's heir", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${handoff}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${handoff}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    const shot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "buccaneer-bivant-purchase.png"), Buffer.from(shot.data, "base64"));
    await advance("j");
    assert.ok(knows(purchase) && !knows("rescue-heir-left-behind"));
    assert.match(frame.journal.leads.find(({ id }) => id === purchase).detail, /escort the boy out through the base gate/i);
    for (const key of ["j", "enter"]) await advance(key);
    const escort = "scene-illustration:area:1:ecl:b5a5";
    assert.equal(frame.portrait, escort);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /THECAPTAINTHENLEAVESTHEROOMANDYOUAREESCORTEDBACKOUTSIDE/i);
    await waitFor("the escort outside the captain's room", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${escort}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    assert.deepEqual(readFileSync(saved), originalSave);
    await advance("e");
    assert.equal(frame.portrait, undefined);
    for (const key of ["enter", "s", "s", "a"]) await advance(key);
    const known = new Set(JSON.parse(readFileSync(saved, "utf8")).leads.map(({ id }) => id));
    assert.ok(known.has(price) && known.has(purchase));
    assert.ok(!known.has("rescue-heir-freed") && !known.has("rescue-heir-left-behind"));
    console.log("Verified the peaceful Bivant handoff and purchase clue in Chrome. Native save:", saved);
  } else if (routeName === "buccaneer-bivant-escort-combat") {
    for (const key of ["up", "enter", "g", "right", "up", "right", "up", "up", "up"]) await advance(key);
    const dialogue = frame.text.toSorted(([a], [b]) => a - b)
      .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(dialogue, /SOMEOFTHEGUARDSSPOTYOUWITHTHEBOY/i);
    for (const key of ["up", "up", "up", "enter", "enter", "enter"]) await advance(key);
    const ready = "combat:area:1:CPIC6.DAX:11:ecl:9b02";
    const guards = frame.combatArt.filter(([, , id]) => id === ready);
    assert.equal(guards.length, 19);
    assert.ok(guards.some(([x, y, , reflected]) => x === 128 && y === 80 && reflected),
      "The guard against the diagonal wall should use Enhanced art");
    await waitFor("all 19 visible escort guards in Enhanced", () => run(`state.sequence === ${frame.sequence} && !animationFrame &&
      [...document.querySelectorAll('.combat-sprite[src="/art/${ready}"]')]
        .filter(sprite => sprite.naturalWidth === 96 && sprite.naturalHeight === 96).length === 19`));
    await switchBothWays(frame.frame);
    const shot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bivant-escort-combat.png"), Buffer.from(shot.data, "base64"));
    for (let turn = 0; turn < 3; turn++) await advance("q");
    const strike = "combat:area:1:CPIC6.DAX:139:ecl:9b02";
    assert.ok(frame.animation?.some(({ combatArt }) => combatArt?.some(([x, y, id, reflected]) =>
      x === 104 && y === 32 && id === strike && reflected)),
      "The escort guard's reflected strike should use Enhanced art");
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the guard sprites during Bivant's escort in Chrome. Capture:", directory);
  } else if (routeName === "buccaneer-bivant-punch") {
    for (const key of ["down", "enter", "e", "e", "right", "up", "right", "up", "enter", "enter"]) {
      await advance(key);
    }
    assert.equal(frame.portrait, "portrait:area:1:ecl:b5f7:caller:9eda:PIC6.DAX:42:0:0");
    const alarm = "rescue-merchant-alarm";
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === alarm));
    const openObjectives = frame.journal.leads.filter(({ status }) => status && status !== "turned-in");
    const rescueIndex = openObjectives.findIndex(({ id }) => id === "commission-rescue");
    assert.ok(rescueIndex >= 0);
    await advance(`track ${rescueIndex + 1}`);
    assert.equal(frame.journal.trackedId, "commission-rescue");
    assert.doesNotMatch(frame.journal.objective.nextStep, /merchant called his guards/i);
    await advance("j");
    for (const key of ["enter", "enter", "y", "enter", "up"]) await advance(key);
    const dialogue = frame.text.toSorted(([a], [b]) => a - b)
      .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(dialogue, /MERCHANTYELLSFORHISGUARDSANDTHEYCOMERUNNING/i);
    const guards = "scene-illustration:area:1:ecl:a001";
    assert.equal(frame.portrait, guards, "The merchant's guards should use their own illustration");
    await waitFor("the merchant's guard illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${guards}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    const shot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bivant-punch-guards.png"), Buffer.from(shot.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === alarm));
    assert.match(frame.journal.objective.nextStep, /merchant called his guards.*return to the slave pen/i);
    await advance("j");
    for (const key of ["enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    const ready = "combat:area:1:CPIC6.DAX:11:ecl:a002";
    const strike = "combat:area:1:CPIC6.DAX:139:ecl:a002";
    assert.deepEqual(frame.combatArt.filter(([, , id]) => id === ready), [
      [32, 32, ready, false], [56, 32, ready, false], [80, 32, ready, false],
      [56, 56, ready, false], [80, 56, ready, false], [104, 56, ready, false, true],
    ]);
    await waitFor("the guards' combat sprites in place of the illustration", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector(".encounter-portrait") &&
      [...document.querySelectorAll('.combat-sprite[src="/art/${ready}"]')]
        .filter(sprite => sprite.naturalWidth === 96 && sprite.naturalHeight === 96).length === 6`));
    await advance("enter");
    assert.ok(frame.animation?.some(({ combatArt }) => combatArt?.some(([x, y, id, reflected]) =>
      x === 104 && y === 56 && id === strike && reflected) &&
      combatArt.filter(([, , id]) => id === ready).length === 5));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the merchant's guard illustration and combat sprites in Chrome. Capture:", directory);
  } else if (forgeSmith) {
    const close = "encounter:area:6:ecl:a0d8:SPRIT5.DAX:12:0:0";
    await observeApproach([[56, 32, close, 24, 80]], false);
    await advance("up");
    const forgeWorkshop = "scene-illustration:area:6:ecl:9b14:caller:a06e";
    assert.equal(frame.portrait, forgeWorkshop);
    assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join(""),
      /THREEFIREGIANTSAREWORKINGONASUITOFARMOR/i);
    await waitFor("the human smith and three fire giants at work", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${forgeWorkshop}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    assert.deepEqual(frame.encounter, [56, 32, "encounter:area:6:SPRIT5.DAX:12:1:0", 24, 65]);
    await waitFor("the forge smith approach", () => run('document.querySelector(".encounter-sprite")?.naturalWidth === 96'));
    await switchBothWays();
    await advance("a");
    await waitFor("the forge smith at close range", () => run(`window.observedApproach.has(${JSON.stringify(close)})`));
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:13:BODY5.DAX:9");
    await waitFor("the Valjevo forge smith portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    await advance("j");
    assert.ok(knows("castle-forge") && !knows("castle-forge-authorization"));
    for (const key of ["j", "p", forgeAuthorization ? "h" : "n"]) await advance(key);
    const dialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(dialogue, forgeAuthorization ? /IFIT'SIMPORTANTGETAUTHORIZATION/i : /YOUNEVERGETTOTALLYUSEDTOTHEHEAT/i);
    const authorization = "scene-illustration:area:6:ecl:9c44";
    assert.equal(frame.portrait, forgeAuthorization ? authorization : undefined);
    if (forgeAuthorization) {
      await waitFor("the smith's forge authorization illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${authorization}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${authorization}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const authorizationShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "valjevo-forge-authorization.png"), Buffer.from(authorizationShot.data, "base64"));
      await switchBothWays(frame.frame);
    }
    await advance("j");
    assert.equal(knows("castle-forge-authorization"), forgeAuthorization);
    await advance("j");
    if (forgeAuthorization) {
      await advance("up");
      assert.equal(frame.portrait, forgeWorkshop);
      await waitFor("the forge workshop to return after the authorization", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${forgeWorkshop}"]')?.naturalWidth === 352`));
    }
    assert.deepEqual(readFileSync(saved), originalSave);
    if (forgeAuthorization) {
      const visible = () => frame.text.toSorted(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("");
      for (let prompt = 0; prompt < 6 && !/AreaCastViewEncamp/i.test(visible()); prompt++) {
        await advance(/CombatWaitFleeParlay/i.test(visible()) ? "f" : "enter");
      }
      assert.match(visible(), /AreaCastViewEncamp/i);
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(checkpoint.leads?.some(lead => lead.id === "castle-forge-authorization"));
      console.log("Forge authorization checkpoint:", saved);
    }
    console.log(`Verified the forge smith portrait and ${routeName} dialogue in Chrome. Capture:`, directory);
  } else if (castleChaplain) {
    for (const key of ["up", "enter"]) await advance(key);
    assert.deepEqual(frame.encounter, [48, 32, "encounter:area:6:SPRIT5.DAX:29:0:0", 40, 80]);
    await waitFor("the chaplain approach", () => run('document.querySelector(".encounter-sprite")?.naturalWidth === 160'));
    await switchBothWays();
    for (const key of ["enter", "j"]) await advance(key);
    const knows = () => frame.journal?.leads.some(({ id }) => id === "castle-bane-chapel");
    assert.ok(frame.journal && !knows());
    for (const key of ["j", "t"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:14:BODY5.DAX:7");
    await waitFor("the Valjevo chaplain portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(knows());
    console.log("Verified the Valjevo chaplain portrait and witnessed chapel lead in Chrome.");
  } else if (dungeonSentry) {
    const approach = [48, 32, "encounter:area:3:ecl:9fbd:SPRIT5.DAX:16:0:0", 40, 80];
    await observeApproach([approach], false);
    for (const key of ["up", "enter"]) await advance(key);
    assert.deepEqual(frame.animation?.map(({ encounter }) => encounter).filter(Boolean), [approach]);
    await waitFor("the enhanced dungeon sentry approach", () => run("window.observedApproach.size === 1"));
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:12:BODY5.DAX:1");
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ANALARMSTARTSRINGING/i);
    await waitFor("the dungeon sentry portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:area:3:ecl:a002:HEAD5.DAX:12:BODY5.DAX:1");
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ABATTLEBEGINS/i);
    await verifyPortraitPanel();
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    console.log("Verified the Valjevo dungeon sentry portrait in Chrome.");
  } else if (genheeris) {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    await advance("j");
    assert.ok(frame.journal && !knows("castle-genheeris-orders"));
    assert.doesNotMatch(frame.journal.objective.nextStep, /phase 2 of Plan A/i);
    const castleObjective = frame.journal.objective.nextStep;
    for (const key of ["j", "up"]) await advance(key);
    const genheerisAtDesk = "scene-illustration:area:7:ecl:995f:caller:a170";
    assert.equal(frame.portrait, genheerisAtDesk);
    assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join(""),
      /ECCENTRICMERCHANT.*MANINROBESLOOKSUPFROMADESK/i);
    await waitFor("Genheeris looking up from his desk", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${genheerisAtDesk}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    for (const key of ["enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    for (const placement of [
      [56, 32, "encounter:area:7:SPRIT5.DAX:24:1:0", 24, 65],
      [48, 32, "encounter:area:7:SPRIT5.DAX:24:0:0", 32, 73],
    ]) {
      assert.deepEqual(frame.encounter, placement);
      const [, , , width, height] = placement;
      await waitFor("Genheeris's approach sprite", () => run(
        `document.querySelector(".encounter-sprite")?.naturalWidth === ${width * 4} && document.querySelector(".encounter-sprite")?.naturalHeight === ${height * 4}`));
      await switchBothWays();
      await advance("a");
    }
    for (const key of ["p", genheerisOrders ? "n" : "h"]) await advance(key);
    const portrait = genheerisOrders ? "portrait:area:7:ecl:a246:HEAD5.DAX:59:BODY5.DAX:31"
      : "portrait:area:7:ecl:995f:caller:a2df:HEAD5.DAX:59:BODY5.DAX:31";
    assert.equal(frame.portrait, portrait);
    await waitFor("Genheeris's portrait", () => run(`
      [...document.querySelectorAll(".encounter-portrait")].some(image =>
        image.naturalWidth === 352 && image.src.endsWith(${JSON.stringify(portrait)}))`));
    await switchBothWays();
    await advance("j");
    assert.equal(knows("castle-genheeris-orders"), genheerisOrders);
    assert.equal(knows("castle-genheeris-offer"), !genheerisOrders);
    assert.doesNotMatch(frame.journal.objective.nextStep, /phase 2 of Plan A/i);
    if (genheerisOrders) {
      assert.match(frame.journal.leads.find(({ id }) => id === "castle-genheeris-orders").detail,
        /relay orders to Al-Hyam Dhazid.*phase 2 of Plan A/i);
      assert.equal(frame.journal.objective.nextStep, castleObjective);
    } else {
      assert.ok(!knows("castle-genheeris-deal"));
      for (const key of ["j", "enter", "y", "enter"]) await advance(key);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /GENHEERIS/i);
      assert.equal(frame.portrait, undefined);
      await advance("j");
      assert.ok(knows("castle-genheeris-deal"));
      assert.match(frame.journal.objective.nextStep, /Tyranthraxus's audience hall.*Genheeris/i);
      await switchBothWays();
    }
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified the Genheeris portrait and earned journal lead on ${routeName} in Chrome.`);
  } else if (routeName === "valjevo-records-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-castle");
    const leads = new Set(frame.journal.leads.map(({ id }) => id));
    for (const id of ["castle-records-room", "castle-records-thay", "castle-records-moonsea"]) assert.ok(leads.has(id));
    assert.doesNotMatch(frame.journal.objective.nextStep, /continue reading the Valjevo records/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the Valjevo records and completed reading guidance after reloading in Chrome.");
  } else if (castleReportsReload) {
    await advance("j");
    const leads = frame.journal?.leads ?? [];
    assert.ok(leads.some(({ id }) => id === "castle-raven-clan"));
    assert.ok(leads.some(({ id }) => id === "castle-flaming-aura"));
    assert.ok(!leads.some(({ id }) => id === "castle-records-thay"));
    await switchBothWays();
    console.log("Verified the witnessed scriptorium reports after cold loading.");
  } else if (castleReports) {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    const verifyReport = async (caller, filename) => {
      assert.equal(frame.portrait, `scene-illustration:area:4:ecl:9a5a:caller:${caller}`);
      await waitFor("the illustrated scriptorium report", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
        document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const proof = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, filename), Buffer.from(proof.data, "base64"));
      await switchBothWays();
    };
    await advance("j");
    assert.ok(frame.journal && !knows("castle-raven-clan") && !knows("castle-flaming-aura"));
    for (const key of ["j", "up", "enter", "s", "up", "right", "up", "right", "up"]) await advance(key);
    await verifyReport("af2f", "valjevo-raven-clan-report.png");
    await advance("j");
    assert.ok(knows("castle-raven-clan") && !knows("castle-flaming-aura"));
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    for (const key of ["left", "up", "left", "up", "right", "up", "enter", "left", "up", "left", "up", "right", "up", "enter", "left", "up", "left", "up"]) await advance(key);
    await verifyReport("ae92", "valjevo-flaming-aura-note.png");
    await advance("j");
    assert.ok(knows("castle-raven-clan") && knows("castle-flaming-aura"));
    await switchBothWays();
    for (const key of ["j", "enter", "e", "s", "s", "b"]) await advance(key);
    assert.notDeepEqual(readFileSync(saved), originalSave);
    console.log("Native save:", saved);
    console.log("Verified separately earned scriptorium reports in Chrome.");
  } else if (castleScribe) {
    const portrait = "portrait:HEAD5.DAX:72:BODY5.DAX:30";
    const approach = "encounter:area:4:ecl:b167:SPRIT5.DAX:22:0:0";
    await observeApproach([[48, 32, approach, 32, 73]]);
    for (const key of ["right", "right", "up", "y", ...Array(5).fill("enter")]) await advance(key);
    for (let attempt = 0; attempt < 24 && frame.portrait !== portrait; attempt++) {
      for (const key of ["up", "y", "enter", "enter", "enter", "right"]) {
        await advance(key);
        if (frame.portrait === portrait) break;
      }
    }
    assert.equal(frame.portrait, portrait);
    await waitFor("the enhanced records scribe approach", () => run(
      `window.observedApproach.has(${JSON.stringify(approach)})`));
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ASCRIBECOMINGTOWARDTHEBUILDING/i);
    await waitFor("the records scribe portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Valjevo records scribe approach and portrait in Chrome.");
  } else if (castleRecords) {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    const evidence = "scene-illustration:area:4:ecl:9a5a:caller:b00a";
    const moonsea = "scene-illustration:area:4:ecl:9a5a:caller:b106";
    await advance("up");
    await advance("j");
    assert.ok(knows("castle-records-room") && !knows("castle-records-thay") && !knows("castle-records-moonsea"));
    if (castleRecordsDecline || castleRecordsRevisit) {
      for (const key of ["j", "n"]) await advance(key);
      assert.ok(![evidence, moonsea].includes(frame.portrait));
      await advance("j");
      assert.ok(knows("castle-records-room") && !knows("castle-records-thay") && !knows("castle-records-moonsea"));
      if (castleRecordsRevisit) {
        for (const key of ["j", "down", "up", "down", "up", "j"]) await advance(key);
        assert.ok(knows("castle-records-room") && !knows("castle-records-thay") && !knows("castle-records-moonsea"));
      }
    }
    if (!castleRecordsDecline) {
      for (const key of ["j", "y"]) await advance(key);
      assert.equal(frame.portrait, evidence);
      await waitFor("the Enhanced Red Wizards evidence", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${evidence}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      await advance("j");
      assert.ok(knows("castle-records-thay") && !knows("castle-records-moonsea"));
      assert.match(frame.journal.objective.nextStep, /continue reading the Valjevo records/i);
      for (const key of ["j", "enter"]) await advance(key);
      assert.ok(![evidence, moonsea].includes(frame.portrait));
      await advance("enter");
      assert.equal(frame.portrait, moonsea);
      await waitFor("the Moonsea conquest report", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${moonsea}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${moonsea}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const conquestShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "valjevo-moonsea-conquest-report.png"), Buffer.from(conquestShot.data, "base64"));
      await switchBothWays();
      await advance("j");
      assert.ok(knows("castle-records-thay") && knows("castle-records-moonsea"));
      assert.doesNotMatch(frame.journal.objective.nextStep, /continue reading the Valjevo records/i);
      for (const key of ["j", "enter"]) await advance(key);
      assert.notEqual(frame.portrait, moonsea);
      for (const key of ["e", "s", "s", "c"]) await advance(key);
      const checkpoint = resolve(directory, "C.json");
      assert.ok(JSON.parse(readFileSync(checkpoint, "utf8")).leads.some(({ id }) => id === "castle-records-moonsea"));
      console.log("Valjevo records save:", checkpoint);
    }
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified that Valjevo records enter the journal only when read.");
  } else if (scriptorium || mazeWatch || giantPatrol) {
    if (giantPatrol) for (const key of ["s", "enter", "up", "enter", "enter"]) await advance(key);
    for (const key of ["up", "enter"]) await advance(key);
    if (mazeWatch) {
      assert.deepEqual(frame.encounter, [48, 32, "encounter:area:4:SPRIT5.DAX:16:0:0", 40, 80]);
      await waitFor("the maze watch approach sprite", () => run(
        'document.querySelector(".encounter-sprite")?.naturalWidth === 160 && document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
      await switchBothWays();
    }
    await advance("enter");
    if (scriptorium) {
      for (const placement of [
        [56, 32, "encounter:area:4:SPRIT5.DAX:24:1:0", 24, 65],
        [48, 32, "encounter:area:4:SPRIT5.DAX:24:0:0", 32, 73],
      ]) {
        assert.deepEqual(frame.encounter, placement);
        const [, , , width, height] = placement;
        await waitFor("the Scriptorium officer's approach sprite", () => run(
          `document.querySelector(".encounter-sprite")?.naturalWidth === ${width * 4} && document.querySelector(".encounter-sprite")?.naturalHeight === ${height * 4}`));
        await switchBothWays();
        await advance("a");
      }
    }
    if (giantPatrol) {
      const close = [48, 32, "encounter:area:3:ecl:9e32:SPRIT5.DAX:16:0:0", 40, 80];
      await observeApproach([close]);
      await advance("a");
      assert.deepEqual(frame.encounter, [56, 32, "encounter:area:3:SPRIT5.DAX:16:1:0", 24, 65]);
      await advance("a");
      await waitFor("the Valjevo patrol captain's close approach", () => run(
        `window.observedApproach.has(${JSON.stringify(close[2])})`));
      await waitFor("the patrol captain's dialogue portrait", () => run(
        `state.sequence === ${frame.sequence} && document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
      await verifyPortraitPanel();
    }
    for (const key of ["p", scriptoriumAuthority ? "h" : "m"]) await advance(key);
    const portrait = mazeWatch ? "portrait:HEAD5.DAX:52:BODY5.DAX:1"
      : giantPatrol ? "portrait:area:3:HEAD5.DAX:9:BODY5.DAX:1" : "portrait:HEAD5.DAX:53:BODY5.DAX:7";
    const dialogue = () => frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.equal(frame.portrait, portrait, dialogue());
    assert.match(dialogue(), scriptoriumAuthority ? /ONWHOSEAUTHORITYAREYOUHERE/i : /WHATISTODAY'SPASSWORD/i);
    await waitFor("the Valjevo guard portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of scriptoriumAuthority ? "tyranthraxus" : "harash") await advance(key);
    await advance("enter");
    assert.match(dialogue(), /WITHANODOFTHEHEADYOUARELEFTALONE/i);
    assert.equal(frame.portrait, undefined);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified the guard portrait and peaceful passage on ${routeName} in Chrome.`);
  } else if (dungeonKitchen) {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    await advance("j");
    assert.ok(!knows("castle-hedge-gate-password"));
    for (const key of ["j", "up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:73:0:0");
    await waitFor("the kitchen portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("enter");
    const rescue = "portrait:area:4:ecl:9a5a:caller:a862:PIC5.DAX:73:0:0";
    assert.equal(frame.portrait, rescue);
    await waitFor("the kitchen rescue illustration", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${rescue}"]')?.naturalWidth === 352`));
    for (const key of ["enter", "enter"]) await advance(key);
    const handoff = "scene-illustration:area:4:ecl:9a5a:caller:a93e";
    assert.equal(frame.portrait, handoff);
    await waitFor("the kitchen captive handing over the slip", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${handoff}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${handoff}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const handoffShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "valjevo-kitchen-password-handoff.png"), Buffer.from(handoffShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("castle-kitchen-captives-freed") && !knows("castle-hedge-gate-password"));
    assert.ok(knows("castle-kitchen-slip"));
    assert.match(frame.journal.objective.nextStep, /press Enter to read the slip/i);
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /YOULOOKATTHEWRITING/i);
    for (let index = 0; index < 4; index++) await advance("enter");
    await advance("j");
    assert.ok(knows("castle-kitchen-captives-freed"));
    assert.ok(knows("castle-hedge-gate-password"));
    assert.match(frame.journal.objective.nextStep, /use the password.*main gate/i);
    console.log("Verified the Valjevo kitchen illustration and earned password lead in Chrome.");
  } else if (captiveReload) {
    await advance("j");
    const outcome = captiveAlarmReload ? "castle-cadorna-alarm" : "castle-cadorna-released";
    for (const id of ["castle-cadorna-captive", "castle-cadorna-hedge", outcome]) {
      assert.ok(frame.journal?.leads.some(lead => lead.id === id), `Restored Cadorna lead: ${id}`);
    }
    if (captiveAlarmReload) {
      assert.ok(!frame.journal.leads.some(({ id }) => id === "castle-cadorna-released"));
      assert.match(frame.journal.objective.nextStep, /raised the alarm.*left, right, right/i);
    }
    await switchBothWays();
    console.log("Verified Cadorna's discoveries after cold loading the guest save.");
  } else if (captiveCadorna) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:7:0:0");
    await waitFor("Cadorna's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    async function verifyCadornaGatePlea() {
      const plea = "portrait:area:3:ecl:b110:PIC5.DAX:7:0:0";
      assert.equal(frame.portrait, plea);
      await waitFor("Cadorna's main-gate offer", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${plea}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
    }
    const heardHedge = captiveHedge || captiveAlarm;
    if (heardHedge) {
      for (const key of ["l", "enter", "l"]) await advance(key);
      await verifyCadornaGatePlea();
      for (const key of ["enter", "l"]) await advance(key);
      const directions = "portrait:area:3:ecl:b0f6:PIC5.DAX:7:0:0";
      assert.equal(frame.portrait, directions);
      await waitFor("Cadorna's hedge directions illustration", () => run(
        `document.querySelector('.encounter-portrait[src="/art/${directions}"]')?.naturalWidth === 352`));
      await advance("enter");
    }
    if (captiveKilled) {
      await advance("k");
      await verifyCadornaGatePlea();
      for (const key of ["enter", "k"]) await advance(key);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /WITHAQUICKSTROKE/i);
      const aftermath = "portrait:area:3:ecl:b15c:PIC5.DAX:7:0:0";
      assert.equal(frame.portrait, aftermath);
      await waitFor("Cadorna's aftermath illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${aftermath}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays();
    } else await advance(captiveAlarm ? "l" : "r");
    if (captiveAlarm) {
      const alarm = "portrait:area:3:ecl:9bf8:PIC5.DAX:7:0:0";
      assert.equal(frame.portrait, alarm);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ANALARMSTARTSRINGING/i);
      await waitFor("Cadorna's alarm illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${alarm}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays();
    }
    await advance("j");
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    assert.ok(knows("castle-cadorna-captive"));
    assert.equal(knows("castle-cadorna-released"), !captiveKilled && !captiveAlarm);
    assert.equal(knows("castle-cadorna-hedge"), heardHedge);
    assert.equal(knows("castle-cadorna-killed"), captiveKilled);
    assert.equal(knows("castle-cadorna-alarm"), captiveAlarm);
    if (captiveAlarm) {
      assert.match(frame.journal.objective.nextStep, /raised the alarm.*left, right, right/i);
      for (const key of ["j", "enter", "e", "s", "s", "b"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(checkpoint.leads?.some(({ id }) => id === "castle-cadorna-alarm"));
      console.log("Cadorna alarm checkpoint:", saved);
    }
    if (captiveHedge) {
      for (const key of ["j", "n", "e", "s", "s", "b"]) await advance(key);
      assert.notDeepEqual(readFileSync(saved), originalSave);
      console.log("Native save:", saved);
    }
    console.log("Verified Cadorna's portrait and witnessed journal entries in Chrome.");
  } else if (alHyamReload) {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-castle");
    assert.equal(frame.journal.leads.some(({ id }) => id === "castle-al-hyam-notes"), !alHyamReleaseReload);
    assert.equal(frame.journal.leads.some(({ id }) => id === "castle-al-hyam-released"), alHyamReleaseReload);
    if (!alHyamReleaseReload) assert.match(frame.journal.objective.nextStep, /Al-Hyam Dhazid's notes.*journal entry 30/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified Al-Hyam's journal outcome after reloading in Chrome.");
  } else if (alHyam) {
    const close = "encounter:area:5:ecl:a28f:SPRIT5.DAX:12:0:0";
    await observeApproach([[56, 32, close, 24, 80]], false);
    const portrait = "portrait:area:5:HEAD5.DAX:55:BODY5.DAX:31";
    const knows = () => frame.journal?.leads.some(({ id }) => id === "castle-al-hyam-notes");
    for (const [key, placement] of [
      ["up", [64, 32, "encounter:area:5:SPRIT5.DAX:12:2:0", 8, 49]],
      ["a", [56, 32, "encounter:area:5:SPRIT5.DAX:12:1:0", 24, 65]],
    ]) {
      await advance(key);
      assert.deepEqual(frame.encounter, placement);
      const [, , , width, height] = placement;
      await waitFor("Al-Hyam's approach sprite", () => run(
        `document.querySelector(".encounter-sprite")?.naturalWidth === ${width * 4} && document.querySelector(".encounter-sprite")?.naturalHeight === ${height * 4}`));
      await switchBothWays();
    }
    await advance("a");
    await waitFor("Al-Hyam at close range", () => run(`window.observedApproach.has(${JSON.stringify(close)})`));
    await advance("p");
    assert.equal(frame.portrait, portrait);
    await waitFor("Al-Hyam's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    if (alHyamRelease) {
      const released = () => frame.journal?.leads.some(({ id }) => id === "castle-al-hyam-released");
      await advance("j");
      assert.ok(frame.journal && !released() && !knows());
      for (const key of ["j", "l"]) await advance(key);
      const departure = "scene-illustration:area:5:ecl:9c7f";
      assert.equal(frame.portrait, departure);
      await waitFor("Al-Hyam's departure illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${departure}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "al-hyam-departure.png"), Buffer.from(shot.data, "base64"));
      await advance("j");
      assert.ok(released() && !knows());
      for (const key of ["j", "e", "s", "s", "c"]) await advance(key);
      const releaseSave = resolve(directory, "C.json");
      const checkpoint = JSON.parse(readFileSync(releaseSave, "utf8"));
      assert.ok(checkpoint.leads?.some(({ id }) => id === "castle-al-hyam-released"));
      assert.ok(!checkpoint.leads?.some(({ id }) => id === "castle-al-hyam-notes"));
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified Al-Hyam's immediate departure and saved journal in Chrome. Saved:", releaseSave);
    } else {
      await advance("a");
      assert.equal(frame.portrait, "portrait:area:5:ecl:a38a:HEAD5.DAX:55:BODY5.DAX:31");
      await verifyPortraitPanel();
      await advance("j");
      assert.ok(frame.journal && !knows());
      for (const key of ["j", "l"]) await advance(key);
      assert.equal(frame.portrait, "portrait:area:5:ecl:9a5a:caller:a45a:HEAD5.DAX:55:BODY5.DAX:31");
      await verifyPortraitPanel();
      await switchBothWays();
      await advance("j");
      assert.ok(knows());
      assert.match(frame.journal.objective.nextStep, /Al-Hyam Dhazid's notes.*journal entry 30/i);
      for (const key of ["j", "enter", "e", "s", "s"]) await advance(key);
      assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join(""), /SAVEWHICHGAME/i);
      await advance("c");
      const notesSave = resolve(directory, "C.json");
      const savedJournal = JSON.parse(readFileSync(notesSave, "utf8"));
      assert.equal(savedJournal.tracked, "commission-castle");
      assert.ok(savedJournal.leads.some(({ id }) => id === "castle-al-hyam-notes"));
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Al-Hyam notes checkpoint:", notesSave);
      console.log("Verified Al-Hyam's portrait and witnessed notes in Chrome.");
    }
  } else if (falseTyranthraxus) {
    const portrait = "portrait:HEAD5.DAX:54:BODY5.DAX:1";
    const knows = () => frame.journal?.leads.some(({ id }) => id === "castle-impostor");
    for (const key of ["up", "enter"]) await advance(key);
    assert.deepEqual(frame.encounter, [48, 32, "encounter:area:5:SPRIT5.DAX:16:0:0", 40, 80]);
    await waitFor("the throne-room figure's approach", () => run(
      'document.querySelector(".encounter-sprite")?.naturalWidth === 160 && document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, portrait);
    await waitFor("the throne-room figure's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !knows());
    for (const key of ["j", "p", "a"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:5:ecl:9a5a:caller:aa76:HEAD5.DAX:54:BODY5.DAX:1");
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(knows());
    const readSignedNote = frame.journal.leads.some(({ id }) => id === "castle-flaming-aura");
    assert.match(frame.journal.objective.nextStep, /continue searching the castle for the real Tyranthraxus/i);
    assert.equal(/flaming aura/i.test(frame.journal.objective.nextStep), readSignedNote);
    for (const key of ["j", "enter"]) await advance(key);
    assert.match(frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /JUSTLETMEGO/i);
    assert.equal(frame.portrait, "portrait:area:5:ecl:9a2c:caller:aa8e:HEAD5.DAX:54:BODY5.DAX:1");
    await verifyPortraitPanel();
    const released = () => frame.journal?.leads.some(({ id }) => id === "castle-impostor-released");
    await advance("j");
    assert.ok(frame.journal && !released());
    for (const key of ["j", "y"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:5:ecl:9a2c:caller:aacc:HEAD5.DAX:54:BODY5.DAX:1");
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(released());
    assert.match(frame.journal.objective.nextStep, /continue searching the castle for the real Tyranthraxus/i);
    assert.equal(/flaming aura/i.test(frame.journal.objective.nextStep), readSignedNote);
    assert.ok(!frame.journal.leads.some(({ id, status }) => id === "commission-castle" &&
      ["ready-to-report", "reward-pending", "turned-in"].includes(status)));
    console.log("Verified the false throne portrait and witnessed confession and release in Chrome.");
  } else if (restalGuide) {
    const restal = "portrait:HEAD4.DAX:52:BODY4.DAX:8";
    const knowsOffer = () => frame.journal?.leads.some(({ id }) => id === "textile-restal-offer");
    const wellClue = () => frame.journal?.leads.find(({ id }) => id === "textile-thieves-well");
    await advance("j");
    assert.ok(frame.journal && !wellClue());
    await advance("j");
    await advance("up");
    assert.equal(frame.portrait, "scene-illustration:area:2:ecl:ac61");
    await waitFor("the Thieves Only well illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const wellShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "textile-thieves-well.png"), Buffer.from(wellShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.match(wellClue()?.detail ?? "", /Climb Down.*skilled climber/i);
    assert.ok(!knowsOffer());
    await advance("j");
    await advance("c");
    assert.equal(frame.portrait, undefined);
    for (const key of [...Array(5).fill("end"), ...Array(3).fill("enter")]) await advance(key);
    assert.equal(frame.portrait, restal);
    await waitFor("Restal's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !knowsOffer());
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, restal);
    assert.match(frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /WECANGETYOUINUNSEEN/i);
    await advance("j");
    assert.ok(knowsOffer());
    const knows = id => frame.journal.leads.some(lead => lead.id === `textile-restal-${id}`);
    assert.ok(!knows("blindfold") && !knows("route") && !knows("dismissed"));
    for (const key of ["j", "y"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:2:ecl:b03d:HEAD4.DAX:52:BODY4.DAX:8");
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("j");
    assert.ok(knows("blindfold") && !knows("route") && !knows("dismissed"));
    for (const key of ["j", declineRestal ? "n" : "y"]) await advance(key);
    const hiddenWay = "scene-illustration:area:2:ecl:b0be";
    const dismissal = "scene-illustration:area:2:ecl:af4b";
    const outcomeIllustration = declineRestal ? dismissal : hiddenWay;
    assert.equal(frame.portrait, outcomeIllustration);
    await waitFor("Restal's outcome illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${outcomeIllustration}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${outcomeIllustration}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const outcomeShot = await command("Page.captureScreenshot", { format: "png" });
    const captureName = declineRestal ? "textile-restal-dismissal.png" : "textile-restal-hidden-way.png";
    writeFileSync(resolve(directory, captureName), Buffer.from(outcomeShot.data, "base64"));
    await switchBothWays(frame.frame);
    await advance("j");
    assert.equal(knows("route"), !declineRestal);
    assert.equal(knows("dismissed"), declineRestal);
    if (frame.journal.trackedId === "commission-textile") {
      assert.match(frame.journal.objective.nextStep, declineRestal
        ? /back up the well.*another way into the Textile House/i
        : /From the main well.*western textile building/i);
    }
    assert.ok(wellClue());
    for (const key of ["j", "up"]) await advance(key);
    assert.equal(frame.portrait, declineRestal ? "scene-illustration:area:2:ecl:ac61" : undefined);
    await waitFor("Restal's outcome illustration to clear", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector('.encounter-portrait[src="/art/${outcomeIllustration}"]')`));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified Restal's illustration and the witnessed Textile House shortcut in Chrome. Capture:", directory);
  } else if (norrisSurrenderReload) {
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /6,5S/i);
    assert.equal(frame.portrait, undefined);
    await advance("j");
    for (const clue of ["kuto-norris-ambush", "kuto-norris-surrender"]) {
      assert.ok(frame.journal?.leads.some(({ id }) => id === clue));
    }
    await switchBothWays();
    console.log("Verified the surrender clues after reloading the party above the Catacombs.");
  } else if (norrisSurrender) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.ok(frame.journal && !knows("kuto-norris-ambush"));
    for (const key of ["j", "up", "enter", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("kuto-norris-ambush") && !knows("kuto-norris-surrender"));
    const release = "scene-illustration:area:29:ecl:9f9a";
    for (const key of ["j", fightNorris ? "f" : "s"]) await advance(key);
    if (fightNorris) {
      assert.notEqual(frame.portrait, release);
      for (const key of ["enter", "enter"]) await advance(key);
      assert.notEqual(frame.portrait, release);
      assert.ok(frame.combatArt?.length, "Fight should enter the original Norris battle.");
      console.log("Verified Norris's fight branch in Chrome.");
    } else {
      assert.equal(frame.portrait, release);
      await waitFor("the bandits' release illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${release}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${release}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const releaseShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "kuto-norris-surrender-release.png"), Buffer.from(releaseShot.data, "base64"));
      await switchBothWays(frame.frame);
      await advance("j");
      assert.ok(knows("kuto-norris-surrender"));
      for (const key of ["j", "enter", "up"]) await advance(key);
      assert.equal(frame.portrait, undefined);
      await waitFor("the bandits' release illustration to clear", () => run(`state.sequence === ${frame.sequence} &&
        !document.querySelector(".encounter-portrait")`));
      for (const key of ["e", "s", "s", "j"]) await advance(key);
      const released = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(released.leads.some(({ id }) => id === "kuto-norris-surrender"));
      console.log("Norris release checkpoint:", saved);
      console.log("Verified Norris's surrender illustration and journal in Chrome. Capture:", directory);
    }
  } else if (routeName === "old-phlan-seer") {
    for (const key of ["up", "enter"]) await advance(key);
    const text = () => frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(frame.portrait, "portrait:PIC8.DAX:5:0:0");
    assert.match(text(), /AWIDE.EYEDWOMANISSEATEDONARUG/i);
    await waitFor("the Old Phlan seer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal, "The journal should open before the prophecy");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "phlan-seer-prophecy"));
    await advance("j");
    await advance("enter");
    assert.match(text(), /ANEVILSPIRITFROMANUNHOLYPOOLGUIDESYOURENEMIES/i);
    const prophecy = "scene-illustration:area:29:ecl:ac03";
    assert.equal(frame.portrait, prophecy);
    await waitFor("the seer's vision", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${prophecy}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    const prophecyShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "old-phlan-seer-prophecy.png"), Buffer.from(prophecyShot.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "phlan-seer-prophecy"));
    for (const key of ["j", "enter", "e", "s", "s", "b"]) await advance(key);
    const checkpointWithProphecy = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(checkpointWithProphecy.leads.some(({ id }) => id === "phlan-seer-prophecy"));
    console.log("Verified the Old Phlan seer illustration and saved prophecy journal entry in Chrome. Saved:", saved);
  } else if (routeName === "old-phlan-seer-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "phlan-seer-prophecy"));
    await switchBothWays();
    console.log("Verified the seer's prophecy after reloading slot B in Chrome.");
  } else if (routeName === "diogenes-cave" || routeName === "diogenes-advice") {
    for (const key of ["up", "enter"]) await advance(key);
    const text = () => frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(frame.portrait, /ALARGEDRAGONFLYSABOVEYOU/i.test(text())
      ? "portrait:area:25:ecl:9c97:PIC6.DAX:32:0:0" : "portrait:PIC6.DAX:32:0:0");
    assert.match(text(), /ENTERCAVE.*IGNORECAVE/i);
    await waitFor("the Diogenes cave exterior", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["e", "enter"]) await advance(key);
    const magicMouth = "portrait:PIC6.DAX:12:0:0";
    assert.equal(frame.portrait, magicMouth);
    assert.match(text(), /AMAGICMOUTHAPPEARS.*WHOENTERSTHEHOMEOFDIOGENES/i);
    await waitFor("Diogenes's magic mouth", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await switchBothWays();
    if (routeName === "diogenes-advice") {
      for (const key of ["s", "enter"]) await advance(key);
      assert.equal(frame.portrait, magicMouth);
      for (const key of ["enter", "enter"]) await advance(key);
      const dragonPortrait = "portrait:PIC6.DAX:117:0:0";
      assert.equal(frame.portrait, dragonPortrait);
      assert.match(text(), /STANDINGBEFOREYOUNOWISAGREATSILVERDRAGON/i);
      await waitFor("the silver dragon portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      await advance("j");
      assert.ok(frame.journal, "The journal should open before the Silver Bottle briefing");
      assert.ok(!frame.journal.leads.some(({ id }) => id === "commission-bottle"));
      await advance("j");
      await advance("enter");
      assert.equal(frame.portrait, "portrait:area:25:ecl:a58b:caller:9c11:PIC6.DAX:117:0:0");
      assert.match(text(), /THEREISASILVERBOTTLEOFGREATPOWERTHERE.*RETRIEVETHATBOTTLETHENRETURN/i);
      await waitFor("the portrait through the bottle briefing", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
      await advance("j");
      const bottle = frame.journal?.leads.find(({ id }) => id === "commission-bottle");
      assert.equal(bottle?.status, "offered");
      for (const key of ["j", "enter"]) await advance(key);
      const departure = "scene-illustration:area:19:ecl:aeeb:cue:diogenes-advice-departure";
      assert.equal(frame.portrait, departure);
      await waitFor("Diogenes flying out of the cave", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${departure}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays();
      await advance("enter");
      assert.equal(frame.portrait, undefined);
    }
    console.log(`Verified ${routeName} artwork and dialogue in Chrome.`);
  } else if (koboldCave) {
    await advance("j");
    assert.ok(frame.journal, "The journal should open before finding the caves");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-cave-fork"));
    await advance("j");
    for (const key of ["down", "enter"]) await advance(key);
    const forkDialogue = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.equal(frame.portrait, /ASMALLGROUPOFKOBOLDSENTERING/i.test(forkDialogue)
      ? "portrait:area:27:ecl:9d9c:PIC8.DAX:27:0:0" : "portrait:PIC8.DAX:27:0:0");
    const menu = frame.text.filter(([cell]) => cell >= 960).sort(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(menu, /Large.*Small.*Exit/i);
    await waitFor("the kobold cave fork illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "kobold-cave-fork.png"), Buffer.from(capture.data, "base64"));
    const caveDialogue = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-cave-fork"), caveDialogue);
    console.log("Verified the illustrated cave choice in Chrome.", directory);
  } else if (baneAltar) {
    const approachSequence = [
      [64, 32, "encounter:area:24:SPRIT1.DAX:4:2:0", 16, 49],
      [56, 32, "encounter:area:24:SPRIT1.DAX:4:1:0", 32, 65],
      [48, 32, "encounter:area:24:ecl:b605:SPRIT1.DAX:4:0:0", 40, 80],
    ];
    await observeApproach(approachSequence);
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.ok(knows("bane-temple-admitted") && !knows("bane-defiled-altar"));
    await advance("j");
    const altarPatterns = new Set();
    assert.equal(await verifyTiledView(24, altarPatterns), 1);
    for (const key of ["left", "right", "right", "right", "right", "right"]) {
      await advance(key);
      assert.equal(await verifyTiledView(24, altarPatterns), 1);
    }
    assert.equal(altarPatterns.size, 35);
    await advance("up");
    const decision = "scene-illustration:area:24:ecl:a92f";
    assert.equal(frame.portrait, decision);
    await waitFor("the desecrated altar illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${decision}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${decision}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    const altar = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-decision.png"), Buffer.from(altar.data, "base64"));
    await advance("j");
    assert.ok(knows("bane-defiled-altar") && !knows("bane-altar-ambush"));
    assert.match(frame.journal.objective.nextStep, /Choose Destroy Altar/);
    for (const key of ["j", "d"]) await advance(key);
    const destruction = "scene-illustration:area:24:ecl:a9c2";
    assert.equal(frame.portrait, destruction);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""),
      /ASYOUDESTROYTHEALTAR,THETEMPLEDOORSFLYOPEN.*HALF-ORCCLERICATTACK/i);
    await waitFor("the shattered altar illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${destruction}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    await advance("j");
    assert.ok(knows("bane-altar-ambush") && !knows("bane-cleric-dispatch"));
    assert.match(frame.journal.objective.nextStep, /Defeat the half-orc cleric/);
    assert.notEqual(frame.journal.leads.find(({ id }) => id === "commission-bane")?.status, "ready-to-report");
    for (const key of ["j", "enter"]) await advance(key);
    await waitFor("all three altar ambush poses", () => run("window.observedApproach.size === 3"));
    assert.notEqual(frame.portrait, destruction);
    for (const key of ["enter", "enter", "enter", "q"]) await advance(key);
    const cleric = "combat:area:24:CPIC1.DAX:33";
    assert.ok(frame.combatArt.some(([, , id]) => id === cleric));
    await waitFor("the half-orc cleric in combat", () => run(`[...document.querySelectorAll(".combat-sprite")].some(img =>
      img.src.endsWith(${JSON.stringify(cleric)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`));
    await switchBothWays();
    const combat = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-combat.png"), Buffer.from(combat.data, "base64"));
    assert.deepEqual(await run("[...window.observedApproach]"), approachSequence.map(([, , id]) => id));
    console.log("Verified the altar decision, journal guidance, and the cleric's Enhanced combat stance.");
  } else if (baneGate || baneGoblins || baneSymbol) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-bane");
    assert.equal(knows("bane-temple-symbol"), baneSymbol);
    assert.equal(knows("bane-temple-symbol-carried"), baneSymbol);
    assert.ok(!knows("bane-temple-guard-check"));
    await advance("j");
    const interiorPatterns = new Set();
    if (baneSymbol) {
      const patterns = new Set();
      let views = await verifyTiledView(24, patterns);
      for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
        await advance(key);
        views += await verifyTiledView(24, patterns);
      }
      assert.equal(views, 8);
      assert.equal(patterns.size, 49);
      const approach = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-temple-approach.png"), Buffer.from(approach.data, "base64"));
      const scenery = frame.tiles;
      await advance("enter");
      assert.deepEqual(frame.encounter, [48, 32, "encounter:area:24:SPRIT1.DAX:4:0:0", 40, 80]);
      assert.deepEqual(frame.tiles, scenery, "The guard must sit over the same gate scenery");
      await verifyTiledView(24, patterns);
      await waitFor("the gatekeeper in the approach view", () => run(`(() => {
        const image = document.querySelector(".encounter-sprite");
        return image?.naturalWidth === 160 && image?.naturalHeight === 320;
      })()`));
      await switchBothWays();
      const encounter = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-gatekeeper-approach.png"), Buffer.from(encounter.data, "base64"));
      await advance("enter");
    } else if (baneGoblins) {
      assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      }
      const corridor = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-interior-corridor.png"), Buffer.from(corridor.data, "base64"));
      const scenery = frame.tiles;
      await advance("enter");
      const captive = "encounter:area:31:SPRIT1.DAX:2:0:0";
      assert.deepEqual(frame.encounter, [48, 32, captive, 48, 80]);
      assert.deepEqual(frame.tiles, scenery);
      assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      await waitFor("the captive goblin over the enhanced corridor", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-sprite[src="/art/${captive}"]')?.naturalWidth === 192`));
      await advance("enter");
    } else {
      for (const key of ["up", "enter", "enter"]) await advance(key);
    }
    if (baneGoblins) {
      assert.equal(frame.portrait, "portrait:area:31:PIC1.DAX:2:0:0");
      await waitFor("the captive goblins illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-captive-goblins.png"), Buffer.from(capture.data, "base64"));
    } else if (baneGate || baneSymbol) {
      assert.equal(frame.portrait, "portrait:area:24:PIC1.DAX:4:0:0");
      await waitFor("the temple gatekeeper portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
      await switchBothWays();
      const capture = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "bane-temple-gate.png"), Buffer.from(capture.data, "base64"));
    }
    await advance("j");
    assert.equal(knows("bane-temple-symbol"), baneSymbol);
    if (baneGate || baneSymbol) {
      assert.ok(knows("bane-temple-guard-check"));
      assert.match(frame.journal.objective.nextStep, baneSymbol ? /Let Him Touch You/ : /let the blind guard check/i);
    }
    for (const key of ["j", "l", "j"]) await advance(key);
    if (baneGate) {
      assert.ok(knows("bane-temple-guards-hostile"));
      assert.ok(!knows("bane-temple-symbol") && !knows("bane-temple-admitted"));
      assert.match(frame.journal.objective.nextStep, /get past the temple guards/i);
    } else if (baneSymbol) {
      assert.ok(knows("bane-temple-admitted"));
      assert.ok(!knows("bane-temple-guards-hostile") && !knows("bane-temple-symbol-carried"));
      assert.match(frame.journal.objective.nextStep, /continue into the Temple of Bane/i);
    } else {
      assert.ok(knows("bane-temple-symbol"));
      assert.match(frame.journal.objective.nextStep, /bring a holy symbol of bane/i);
      await advance("j");
      assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      for (const key of ["right", "right", "up"]) {
        await advance(key);
        assert.equal(await verifyTiledView(31, interiorPatterns), 1);
      }
      assert.equal(interiorPatterns.size, 25);
    }
    console.log(`Verified witnessed Temple of Bane guidance on the ${routeName} route.`);
  } else if (shrineReturn) {
    const meeting = () => frame.journal?.leads.find(({ id }) => id === "podal-shrine-meeting");
    await advance("j");
    assert.equal(meeting()?.status, "accepted");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "podal-shrine-ambush"));
    for (const key of ["j", "up", "enter", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-shrine-ambush"));
    assert.equal(meeting()?.status, "turned-in");
    assert.doesNotMatch(frame.journal.objective.nextStep, /return to the bane shrine/i);
    console.log("Verified the delayed shrine meeting and journal closure after reload.");
  } else if (shrine) {
    await advance("j");
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-bane-temple-location"));
    await advance("j");
    for (const key of ["up", "up", "enter", "enter", "g"]) await advance(key);
    const prompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(prompt, /GREETINGSFROMBANE/i);
    assert.equal(frame.portrait, "portrait:area:18:PIC1.DAX:4:0:0");
    await waitFor("the shrine recruiter portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    const screenshot = resolve(directory, "podal-shrine.png");
    writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-bane-temple-location"));
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-shrine-meeting" || id === "podal-shrine-ambush"));
    for (const key of ["j", "y", "j"]) await advance(key);
    const meeting = frame.journal?.leads.find(({ id }) => id === "podal-shrine-meeting");
    assert.match(meeting?.detail ?? "", /return .* in two hours/i);
    assert.ok(!frame.journal?.leads.some(({ id }) => id === "podal-shrine-declined" || id === "podal-shrine-ambush"));
    console.log("Verified the shrine recruiter portrait and mode switches in Chrome.", screenshot);
  } else if (infirmary) {
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "podal-ilmater-infirmary"));
    await advance("j");
    for (const key of ["up", "enter"]) await advance(key);
    const prompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(prompt, /AREYOUINNEEDOFHEALING/i);
    const healer = "portrait:HEAD1.DAX:48:BODY1.DAX:25";
    assert.equal(frame.portrait, healer);
    const healerLoaded = () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image.src.endsWith("/" + ${JSON.stringify(healer)});
    })()`);
    await waitFor("the infirmary portrait", healerLoaded);
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    const screenshot = resolve(directory, "podal-infirmary.png");
    writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-ilmater-infirmary"));
    await advance("j");
    await advance(infirmaryHeal ? "y" : "n");
    if (infirmaryHeal) {
      assert.equal(frame.portrait, healer);
      await waitFor("the infirmary portrait in the healing menu", healerLoaded);
      const menu = frame.text.filter(([cell]) => cell >= 960).toSorted(([left], [right]) => left - right)
        .map(([, character]) => String.fromCharCode(character)).join("");
      assert.match(menu, /HEAL.*VIEW.*POOL.*APPRAISE.*EXIT/i);
      await switchBothWays();
    } else {
      assert.equal(frame.portrait, undefined);
    }
    console.log("Verified the infirmary portrait, journal lead, and mode switches in Chrome.", screenshot);
  } else if (plaza) {
    let views = 0;
    const patterns = new Set();
    const route = [
      "right", "right", ...Array(7).fill("up"), "right", "up", "up", "enter",
      "enter", "enter", "enter", "enter", "end", "enter", "enter",
    ];
    for (const key of route) {
      await advance(key);
      views += await verifyTiledView(18, patterns);
    }
    assert.equal(views, 12);
    assert.equal(patterns.size, 48);
    assert.equal(frame.portrait, "portrait:PIC1.DAX:16:0:0");
    await waitFor("the auctioneer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified 48 Podal Plaza tiles across 12 views and the auctioneer portrait in Chrome.");
  } else if (smithy) {
    const route = ["up", "up", "up", "right", "up", "up", "up", "b", "y", "up", "left", "up", "right", "up", "left", "w", "enter"];
    for (const key of route) await advance(key);
    const crouch = "combat:CPIC4.DAX:37";
    const lunge = "combat:CPIC4.DAX:165";
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    assert.ok(frame.combatArt.some(([, , id]) => id === crouch));
    await waitFor("the crouching frog", () => displayed(crouch));
    await switchBothWays();
    const lunged = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === lunge));
    for (let turn = 0; turn < 6 && !lunged(); turn++) await advance("q");
    assert.ok(lunged());
    await waitFor("the lunging frog", () => displayed(lunge));
    console.log("Verified the enhanced poison frog crouch and attack in Sokal Keep.");
  } else if (goblins) {
    const route = [
      "right", "right", "up", "right", "up", "right", ...Array(4).fill("up"),
      "right", "up", "b", "enter", "enter", "enter", "enter", "enter",
    ];
    for (const key of route) await advance(key);
    const guard = "combat:area:20:CPIC2.DAX:2";
    const leader = "combat:area:20:CPIC2.DAX:3";
    const strike = "combat:area:20:CPIC2.DAX:130";
    const present = id => frame.combatArt.some(placement => placement[2] === id);
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    assert.ok(present(guard));
    await waitFor("the goblin infantry sprite", () => displayed(guard));
    for (let turn = 0; turn < 8 && !present(leader); turn++) await advance("q");
    assert.ok(present(leader));
    await waitFor("the goblin veteran sprite", () => displayed(leader));
    await switchBothWays();
    const swung = () => frame.animation?.some(shot => shot.combatArt?.some(placement => placement[2] === strike));
    for (let turn = 0; turn < 14 && !swung(); turn++) await advance("q");
    assert.ok(swung(), "The infantry strike must appear in a guest animation");
    await waitFor("the goblin infantry strike sprite", () => displayed(strike));
    console.log("Verified the goblin infantry and veteran sprites and infantry strike in the Slums.");
  } else if (trainer) {
    const arenaRoute = [
      "right", "right", "up", "up", "right", "up", "up", "enter", "enter", "up", "up",
      "right", "up", "up", "up", "up", "enter", "enter", "up", "up", "enter", "enter",
    ];
    for (const key of arenaRoute) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:9:BODY3.DAX:1");
    await waitFor("the arena master portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["n", "n", "up", "enter", "enter", "left", "up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:1");
    await waitFor("the fighter trainer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the arena master and fighter trainer portraits with state-preserving mode switches.");
  } else if (ogre) {
    const idle = "combat:area:2:CPIC2.DAX:8";
    const attack = "combat:area:2:CPIC2.DAX:136";
    const route = ["enter", "right", "right", "up", "right", "up", "left", "up", "b", "right", "up", "b",
      ...Array(5).fill("up"), "right", "up", "left", "up", "up", "enter", "s", "up", "enter"];
    for (const key of route) await advance(key);
    const approach = "encounter:area:2:SPRIT4.DAX:6:1:0";
    assert.deepEqual(frame.encounter, [56, 32, approach, 24, 65]);
    assert.equal(await verifyTiledView(2, new Set()), 1);
    await waitFor("the enhanced ogre chief approach", () => run(`state.sequence === ${frame.sequence} &&
      [...document.querySelectorAll(".encounter-sprite")].some(image =>
        image.getAttribute("src") === ${JSON.stringify("/art/" + approach)} &&
        image.naturalWidth === 96 && image.naturalHeight === 260)`));
    await switchBothWays();
    console.log("Verified the enhanced ogre chief over the Textile House scenery after the secret door.");
    if (!ogreApproachOnly) {
      for (let prompt = 0; prompt < 5; prompt++) await advance("enter");
      const standing = () => frame.combatArt.find(([, , id]) => id === idle);
      for (let turn = 0; turn < 8 && !standing(); turn++) await advance("q");
      assert.deepEqual(standing()?.slice(5), [24, 48]);
      const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")].some(img => img.src.endsWith(${JSON.stringify(id)}) &&
        img.naturalWidth === 96 && img.naturalHeight === 192 &&
        parseFloat(img.style.width) === 7.5 && parseFloat(img.style.height) === 24)`);
      await waitFor("the rectangular ogre standing sprite", () => displayed(idle));
      await switchBothWays();
      const strikePlacement = () => frame.animation?.flatMap(shot => shot.combatArt ?? []).find(([, , id]) => id === attack);
      for (let turn = 0; turn < 70 && !strikePlacement(); turn++) await advance("q");
      const strike = strikePlacement();
      assert.ok(strike, `No ogre strike observed from this checkpoint. Last guest text: ${frame.text.map(([, char]) => String.fromCharCode(char)).join("")}`);
      assert.deepEqual(strike.slice(5), [24, 48]);
      await waitFor("the rectangular ogre attack sprite", () => displayed(attack));
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified 96×192 standing and attack sprites in the Textile House ogre fight.");
    }
  } else if (altar) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC4.DAX:9:0:0");
    await waitFor("the altar portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "enter"]) await advance(key);
    const captain = "combat:CPIC2.DAX:7";
    const priestess = "combat:area:2:CPIC2.DAX:2";
    const strike = "combat:CPIC2.DAX:135";
    const positions = () => frame.combatArt.filter(([, , id]) => id === captain).map(([x, y]) => `${x},${y}`).sort();
    const initialPositions = positions();
    assert.ok(initialPositions.length >= 2);
    let moved = false;
    let priestessSelected = false;
    let swing = false;
    for (let turn = 0; turn < 250 && !(moved && priestessSelected && swing); turn++) {
      await advance("q");
      moved ||= positions().length >= 2 && initialPositions.join(";") !== positions().join(";");
      if (!swing && frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === strike))) {
        await waitFor("the captain swing in Chrome", () => run(`[...document.querySelectorAll(".combat-sprite")]
          .some(img => img.src.endsWith("CPIC2.DAX:135") && img.naturalWidth === 96)`));
        swing = true;
      }
      if (!priestessSelected && frame.combatArt.some(([, , id, , selected]) => id === priestess && selected)) {
        await waitFor("the selected priestess in Chrome", () => run(`state.sequence === ${frame.sequence} && !animationFrame &&
          [...document.querySelectorAll(".combat-sprite")].some(img => img.src.endsWith("CPIC2.DAX:2") && img.naturalWidth === 96)`));
        await switchBothWays();
        priestessSelected = true;
      }
    }
    assert.deepEqual({ moved, priestessSelected, swing }, { moved: true, priestessSelected: true, swing: true });
    console.log("Verified the Textile House altar portrait, selected priestess, moving captains, and captain strike.");
  } else if (routeName === "armorer") {
    const route = ["right", "right", "up", "up", "up", "enter", "right", ...Array(7).fill("up"), "left", ...Array(5).fill("up"), "enter"];
    for (const key of route) await advance(key);
    const portrait = "portrait:HEAD3.DAX:42:BODY3.DAX:9";
    assert.equal(frame.portrait, portrait);
    await waitFor("the New Phlan armorer portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("y");
    assert.equal(frame.portrait, portrait);
    await waitFor("the armorer in the shop menu", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    console.log("Verified the armorer portrait in dialogue and the shop menu.");
  } else if (routeName === "valhingen-first-arrival-reload") {
    const textOf = () => frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
    assert.match(textOf(), /0,4E.*AREACASTVIEWENCAMP/i);
    for (const key of ["up", "down", "up"]) await advance(key);
    assert.match(textOf(), /0,4W.*AREACASTVIEWENCAMP/i);
    assert.doesNotMatch(textOf(), /FIERCEGUSTS|EXPLOSIONOFLIGHTNING/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified that Valhingen's arrival storm does not repeat after a cold reload.");
  } else if (routeName === "stojanow-wall-warning-reload") {
    assert.equal(await verifyTiledView(9, new Set()), 1);
    await advance("j");
    const leads = new Set(frame.journal?.leads.map(({ id }) => id));
    assert.ok(["gate-tower-warning", "gate-bugbear-punch", "gate-bugbears-let-go"].every(id => leads.has(id)));
    assert.ok(!leads.has("gate-bugbear-ambush"), "The party has only seen the outside confrontation");
    await switchBothWays();
    await advance("j");
    assert.equal(await verifyTiledView(9, new Set()), 1);
    console.log("Verified the Stojanow clues and enhanced scenery after reloading the native save.");
  } else if (routeName === "stojanow-wall-warning") {
    const known = id => frame.journal?.leads.some(lead => lead.id === id);
    const warning = "gate-tower-warning", punch = "gate-bugbear-punch", released = "gate-bugbears-let-go";
    await advance("j");
    assert.ok(!known(warning) && !known(punch) && !known(released));
    for (const key of ["j", "up", "up", "up", "enter", "enter", "up", "right", "up", "up"]) await advance(key);
    const towerWarning = "scene-illustration:area:9:ecl:a863";
    assert.equal(frame.portrait, towerWarning);
    await waitFor("the Stojanow tower warning", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const towerShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "stojanow-tower-voice-warning.png"), Buffer.from(towerShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(known(warning) && !known(punch) && !known(released));
    await run(`window.bugbearDistances = new Set();
      const layer = document.querySelector("#tile-art");
      new MutationObserver(() => {
        const image = layer.querySelector(".encounter-sprite");
        const id = image?.getAttribute("src")?.match(/SPRIT2\\.DAX:63:([012]):0$/)?.[1];
        if (id !== undefined && image.naturalWidth === 96 && image.naturalHeight === [292, 260, 228][Number(id)] &&
            Math.abs(parseFloat(image.style.left) - ${(8 + (56 - 24) * 120 / 88) / 3.2}) < .001 &&
            Math.abs(parseFloat(image.style.top) - ${(8 + (32 - 24) * 120 / 88) / 2}) < .001 &&
            layer.querySelectorAll(".terrain-tile").length === 121) {
          window.bugbearDistances.add(id);
        }
      }).observe(layer, { childList: true });`);
    for (const key of ["j", "up"]) await advance(key);
    assert.notEqual(frame.portrait, towerWarning);
    await advance("left");
    await waitFor("all three bugbear approach distances", () => run("window.bugbearDistances.size === 3"));
    assert.deepEqual(await run("[...window.bugbearDistances]"), ["2", "1", "0"]);
    await advance("up");
    assert.equal(frame.portrait, "portrait:area:9:PIC2.DAX:63:0:0");
    await waitFor("the enhanced bugbear warning portrait", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(known(punch) && !known(released));
    assert.match(frame.journal.leads.find(({ id }) => id === punch).detail, /Attack or Take the Punch/i);
    await switchBothWays();
    for (const key of ["j", "t", "enter"]) await advance(key);
    const dismissal = "scene-illustration:area:9:ecl:a0a7:cue:bugbear-dismissal";
    assert.equal(frame.portrait, dismissal);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /NOWBEATITBEFOREWEGETSERIOUS/i);
    await waitFor("the guards' dismissal illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${dismissal}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    const dismissalShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "stojanow-bugbears-dismissal.png"), Buffer.from(dismissalShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(known(warning) && known(punch) && known(released));
    for (const key of ["j", "e"]) await advance(key);
    assert.notEqual(frame.portrait, dismissal);
    for (const key of ["s", "s", "b"]) await advance(key);
    const outcome = resolve(directory, "B.json");
    const leads = new Set(JSON.parse(readFileSync(outcome, "utf8")).leads?.map(({ id }) => id));
    assert.ok([warning, punch, released].every(id => leads.has(id)));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified and saved the Stojanow wall warning and bugbear confrontation in Chrome:", outcome);
  } else if (routeName === "stojanow-bugbears") {
    const route = ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left", "up", "a", "j"];
    for (const key of route) await advance(key);
    const clues = new Set(frame.journal?.leads.map(({ id }) => id));
    assert.ok(clues.has("gate-tower-warning") && clues.has("gate-bugbear-punch"));
    assert.ok(!clues.has("gate-bugbears-let-go") && !clues.has("gate-bugbear-ambush"));
    for (const key of ["j", "enter", "enter"]) await advance(key);
    const standing = "combat:area:9:CPIC2.DAX:63";
    const attack = "combat:area:9:CPIC2.DAX:191";
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")].filter(img =>
      img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96).length`);
    assert.ok(frame.combatArt.some(([, , id, , selected]) => id === standing && selected));
    await waitFor("the bugbear guards", async () => await displayed(standing) >= 5);
    await switchBothWays();
    await advance("enter");
    const swung = () => frame.animation?.some(shot => shot.combatArt.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 4 && !swung(); turn++) await advance("q");
    assert.ok(swung());
    await waitFor("the bugbear sword strike", () => displayed(attack));
    console.log("Verified the bugbear guards and their sword strike in Stojanow Gate.");
  } else if (trader) {
    await advance("up");
    const passingWagon = "scene-illustration:area:9:ecl:9c63:caller:ae22";
    assert.equal(frame.portrait, passingWagon);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /AMANDRIVINGAWAGONFULLOFFOODANDEQUIPMENT/i);
    await waitFor("the wagon passing on the road", () => run(
      `document.querySelector('.encounter-portrait[src="/art/${passingWagon}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    const passingWagonShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "stojanow-passing-wagon.png"), Buffer.from(passingWagonShot.data, "base64"));
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    for (const key of ["enter", "p"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD2.DAX:5:BODY2.DAX:9");
    await waitFor("the wagon trader portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the wagon trader portrait and state-preserving switches.");
  } else if (stojanow) {
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:7");
    await waitFor("Urslingen's Stojanow Gate briefing portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:area:8:ecl:b5c3:caller:b292:HEAD3.DAX:16:BODY3.DAX:7");
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /ASMALLBANDMUSTSLIPINSIDEANDHOLDUNTILRELIEVED/i);
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    console.log("Verified Urslingen's Stojanow Gate briefing portrait and state-preserving switches.");
  } else if (routeName === "swamp-elder" || routeName === "swamp-elder-decline") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    const terrain = new Set();
    for (const key of ["up", "b"]) await advance(key);
    assert.deepEqual(frame.encounter, [48, 32, "encounter:area:16:SPRIT8.DAX:57:0:0", 48, 80]);
    assert.equal(await verifyTiledView(16, terrain), 1);
    await waitFor("the enhanced swamp elder", () => run(`(() => {
      const image = document.querySelector(".encounter-sprite");
      return image?.naturalWidth === 192 && image?.naturalHeight === 320;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("swamp-peaceful-elder") && !knows("swamp-friend-word"));
    assert.match(frame.journal.objective.nextStep, /Parlay with the elder/);
    for (const key of ["j", "p"]) await advance(key);
    assert.equal(await verifyTiledView(16, terrain), 1);
    await waitFor("the elder above the Parlay terrain", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "swamp-elder-parlay.png"), Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(knows("swamp-friend-word") && !knows("swamp-elder-story"));
    assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
    for (const key of ["j", "enter", ..."savior", "enter", "y"]) await advance(key);
    const story = "scene-illustration:area:16:ecl:9a87:caller:a217";
    assert.equal(frame.portrait, story);
    await waitFor("the elder's story illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${story}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays(frame.frame);
    const storyShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "swamp-elder-entry31.png"), Buffer.from(storyShot.data, "base64"));
    await advance("j");
    assert.ok(knows("swamp-elder-story") && knows("journal-entry-31"));
    assert.ok(!knows("swamp-champion-requested"));
    await advance("j");
    for (const cue of ["9a87:caller:a287", "9a59:caller:a2ee"]) {
      await advance("enter");
      const illustration = `scene-illustration:area:16:ecl:${cue}`;
      assert.equal(frame.portrait, illustration);
      await waitFor("Drythh's challenge illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${illustration}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
    }
    await advance("j");
    assert.ok(knows("swamp-champion-requested") && !knows("swamp-alliance-averted"));
    assert.match(frame.journal.objective.nextStep, /choose a party member/);
    if (routeName === "swamp-elder-decline") {
      for (const key of ["j", "n"]) await advance(key);
      const aftermath = "scene-illustration:area:16:ecl:9a87:caller:a502";
      assert.equal(frame.portrait, aftermath);
      await waitFor("Drythh's order after the duel", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${aftermath}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      await advance("j");
      assert.ok(knows("swamp-challenge-hostile") && !knows("swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /peaceful meeting ended/);
      for (const key of ["j", "enter"]) await advance(key);
      assert.notEqual(frame.portrait, aftermath);
    } else {
      for (const key of ["j", "y"]) await advance(key);
      const selectionPrompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(selectionPrompt, /WHOWILLBEMYCHAMPION/i);
      await advance("j");
      assert.ok(knows("swamp-champion-requested") && !knows("swamp-challenge-hostile"));
      for (const key of ["j", "down", "s", "enter"]) await advance(key);
      const battleMenu = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(battleMenu, /ALDAHITPOINTS\d+AC\d+.*MOVEVIEWAIMUSEQUICKDONE/i);
      await switchBothWays();
      const standing = "combat:area:16:CPIC8.DAX:57";
      const strike = "combat:area:16:CPIC8.DAX:185";
      await advance("enter");
      assert.ok(frame.combatArt.some(([, , id]) => id === standing));
      const loaded = (id) => run(`[...document.querySelectorAll(".combat-sprite")].some(image =>
        image.src.endsWith(${JSON.stringify(id)}) && image.naturalWidth === 96 && image.naturalHeight === 96)`);
      await waitFor("the swamp lizardfolk stance", () => loaded(standing));
      const duel = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "swamp-duel.png"), Buffer.from(duel.data, "base64"));
      const struck = () => frame.animation?.some((shot) => shot.combatArt?.some(([, , id]) => id === strike));
      let sawStrike = false;
      for (let action = 0; action < 2; action++) {
        await advance("q");
        if (struck()) {
          sawStrike = true;
          await waitFor("the swamp lizardfolk strike", () => loaded(strike));
        }
      }
      assert.ok(sawStrike, "The lizardfolk strike should appear in the original duel");
      for (const key of ["enter", "enter", "e"]) await advance(key);
      for (const [caller, outcome] of [["a3f6", "pledge"], ["a45d", "farewell"]]) {
        const illustration = `scene-illustration:area:16:ecl:9a87:caller:${caller}`;
        assert.equal(frame.portrait, illustration);
        await waitFor(`the elder's ${outcome} illustration`, () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${illustration}"]')?.naturalWidth === 352`));
        await verifyPortraitPanel();
        await switchBothWays(frame.frame);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, `swamp-elder-${outcome}.png`), Buffer.from(shot.data, "base64"));
        await advance("enter");
      }
      assert.equal(frame.portrait, undefined);
      await advance("j");
      assert.ok(knows("swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /south drawbridge.*elder's pledge/i);
      for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.ok(checkpoint.leads?.some(({ id }) => id === "swamp-alliance-averted"));
      assert.equal(checkpoint.leads.find(({ id }) => id === "commission-lizardmen")?.status, "ready-to-report");
      console.log("Swamp duel checkpoint:", saved);
    }
    console.log("Verified the swamp elder's layered terrain and journal updates in Chrome. Capture:", directory);
  } else if (kovelMap) {
    const reload = routeName.endsWith("-reload");
    const map = routeName.replace(/-reload$/, "");
    const northwest = map.endsWith("-nw");
    const entry = northwest ? 41 : 29;
    const otherMap = northwest ? "kovel-castle-map-ne" : "kovel-castle-map-nw";
    const tilePatterns = new Set();
    assert.equal(await verifyTiledView(14, tilePatterns), 1);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-castle");
    if (!reload) {
      assert.ok(!frame.journal.leads.some(({ id }) => id === map || id === otherMap));
      assert.doesNotMatch(frame.journal.objective.nextStep, /journal entry/);
      for (const key of ["j", "up"]) await advance(key);
      const illustration = `scene-illustration:area:14:ecl:b359:cue:castle-map-${northwest ? "nw" : "ne"}`;
      assert.equal(frame.portrait, illustration);
      await waitFor("the castle map illustration", () => run(`(() => {
        const image = document.querySelector('.encounter-portrait[src="/art/${illustration}"]');
        return image?.naturalWidth === 352 && image.naturalHeight === 352;
      })()`));
      await verifyPortraitPanel();
      const screenshot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, `${map}-discovery.png`), Buffer.from(screenshot.data, "base64"));
      await advance("j");
    }
    assert.match(frame.journal.leads.find(({ id }) => id === map)?.detail ?? "", new RegExp(`journal entry ${entry}`));
    assert.ok(!frame.journal.leads.some(({ id }) => id === otherMap));
    assert.match(frame.journal.objective.nextStep, new RegExp(`journal entry ${entry}`));
    await advance("j");
    await switchBothWays();
    if (reload) {
      console.log(`Verified the Kovel castle map in journal entry ${entry} after reload.`);
    } else {
      if (!northwest) await advance("right");
      await advance("up");
      assert.equal(frame.portrait, undefined);
      assert.equal(await verifyTiledView(14, tilePatterns), 1);
      for (const key of ["right", "right", "right", "right"]) {
        await advance(key);
        assert.equal(await verifyTiledView(14, tilePatterns), 1);
      }
      for (const key of ["e", "s", "s", "a"]) await advance(key);
      const savedMap = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(savedMap.tracked, "commission-castle");
      assert.ok(savedMap.leads.some(({ id }) => id === map));
      assert.ok(!savedMap.leads.some(({ id }) => id === otherMap));
      console.log(`Verified discovery of the Kovel castle map in journal entry ${entry} in Chrome. Saved:`, saved);
    }
  } else if (routeName === "kovel-jail-enemy-turn") {
    const textOf = ({ text }) => text.toSorted(([a], [b]) => a - b)
      .map(([, char]) => String.fromCharCode(char)).join("");
    for (const key of ["up", "enter"]) await advance(key);
    assert.match(textOf(frame), /CONVERTEDTOAJAIL/i);
    for (const key of ["enter", "enter"]) await advance(key);
    assert.match(textOf(frame), /1STLVLTHIEF.*HITPOINTS/i);
    assert.equal(frame.automaticCombat, true);
    const manual = await waitFor("the party's first manual turn without pressing Q", async () => {
      const next = await latest();
      return next.sequence > frame.sequence && next.ready && !next.automaticCombat &&
        /HITPOINTS.*QUICKDONE/i.test(textOf(next)) && next;
    });
    assert.equal(manual.stopped, null);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified that Kovel jail enemy turns advance to the party's manual menu without pressing Q.");
  } else if (routeName === "textile-return-art") {
    const mirrors = new Set([
      "tile:2:62e2c42641f8f6fd55dd84978d2f0d201d8f2fed55123205f1c8cdb1dc4ddf68",
      "tile:2:e72fa1b970a7a57da4b47b9424a4bf6de3409c4e806938cf3902596d8e1159ea",
    ]);
    const observed = new Set();
    const patterns = new Set();
    let views = await verifyTiledView(2, patterns);
    for (const key of ["right", "up", "up", "up", "right", "up", "left", "up", "right", ...Array(8).fill("up"),
      "left", ...Array(6).fill("up"), "right", "up", "left", "up", "up"]) {
      await advance(key);
      if (frame.tileInventory?.some(([, , , indices]) => /[1-9a-f]/i.test(indices))) {
        views += await verifyTiledView(2, patterns);
        if (views === 9 || views === 27) {
          const shot = await command("Page.captureScreenshot", { format: "png" });
          writeFileSync(resolve(directory, `textile-return-view-${views}.png`), Buffer.from(shot.data, "base64"));
        }
      }
      for (const [x, y, id] of frame.tiles.filter(([, , id]) => mirrors.has(id))) {
        await waitFor("the reflected 32×32 Textile House tile", () => run(`
          state.sequence === ${frame.sequence} && [...document.querySelectorAll(".terrain-tile")].some(img =>
            img.getAttribute("src") === ${JSON.stringify("/art/" + id)} &&
            img.naturalWidth === 32 && img.naturalHeight === 32 && img.style.transform === "scaleX(-1)" &&
            Math.abs(parseFloat(img.style.left) - ${(8 + (x - 24) * 120 / 88) / 3.2}) < .001 &&
            Math.abs(parseFloat(img.style.top) - ${(8 + (y - 24) * 120 / 88) / 2}) < .001)`));
        observed.add(id);
      }
    }
    assert.deepEqual(observed, mirrors);
    assert.equal(patterns.size, 174);
    await switchBothWays();
    console.log(`Verified ${patterns.size} Textile House tile patterns across ${views} views, including both reflected tiles. Captures:`, directory);
  } else if (routeName === "kovel-chase-east-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kovel");
    for (const id of ["kovel-chase", "kovel-thieves-split", "kovel-guildmaster", "kovel-guildmaster-escaped"]) {
      assert.ok(frame.journal.leads.some(lead => lead.id === id), `Expected saved journal lead ${id}`);
    }
    assert.match(frame.journal.objective.nextStep, /guildmaster fled after being released/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the tracked Kovel Mansion journal after loading slot B.");
  } else if (routeName === "kovel-chase-no") {
    for (const key of ["up", "up", "j"]) await advance(key);
    const knows = id => frame.journal.leads.some(lead => lead.id === id);
    assert.ok(knows("kovel-chase") && !knows("kovel-chase-ended"));
    for (const key of ["j", "n", "j"]) await advance(key);
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.ok(knows("kovel-chase-ended"));
    for (const id of ["kovel-thieves-split", "kovel-guildmaster", "kovel-thief-ambush"]) assert.ok(!knows(id));
    assert.match(frame.journal.objective.nextStep, /^Continue searching Kovel Mansion/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified declining the initial Kovel Mansion chase in Chrome.");
  } else if (routeName.startsWith("kovel-chase")) {
    const chase = "kovel-chase";
    const split = "kovel-thieves-split";
    const ambush = "kovel-thief-ambush";
    async function verifyChaseIllustration(id, filename) {
      assert.equal(frame.portrait, id);
      await waitFor("Kovel chase illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${id}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, filename), Buffer.from(shot.data, "base64"));
    }
    const knows = id => frame.journal.leads.some(lead => lead.id === id);
    const textOf = ({ text }) => text.toSorted(([a], [b]) => a - b)
      .map(([, char]) => String.fromCharCode(char)).join("");
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kovel");
    assert.ok(!knows(chase) && !knows(split));
    const approach = [40, 32, "encounter:area:14:ecl:ac4c:SPRIT3.DAX:11:0:0", 48, 80];
    await observeApproach([approach], false);
    for (const key of ["j", "up", "up"]) await advance(key);
    assert.deepEqual(frame.animation?.map(({ encounter }) => encounter).filter(Boolean), [approach]);
    assert.equal(frame.encounter, undefined);
    await waitFor("the two Kovel thieves", () => run("window.observedApproach.size === 1"));
    assert.match(textOf(frame), /WILLYOUCHASETHEM/i);
    await verifyChaseIllustration("scene-illustration:area:14:ecl:accb", "kovel-thieves-flee-east.png");
    await advance("j");
    assert.ok(knows(chase) && !knows(split));
    assert.match(frame.journal.objective.nextStep, /chase the thieves through the east door/i);
    for (const key of ["j", "y"]) await advance(key);
    assert.match(textOf(frame), /WHICHPATHWILLYOUTAKE/i);
    await verifyChaseIllustration("scene-illustration:area:14:ecl:adab", "kovel-thieves-split.png");
    await advance("j");
    assert.ok(knows(chase) && knows(split) && !knows(ambush));
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.match(frame.journal.objective.nextStep, /south or east door/i);
    await switchBothWays();
    if (routeName === "kovel-chase-decline") {
      assert.ok(!knows("kovel-chase-ended"));
      for (const key of ["j", "d"]) await advance(key);
      assert.match(textOf(frame), /AREACASTVIEWENCAMP/i);
      assert.notEqual(frame.portrait, "scene-illustration:area:14:ecl:adab");
      await advance("j");
      assert.ok(knows("kovel-chase-ended") && !knows(ambush) && !knows("kovel-guildmaster"));
      assert.match(frame.journal.objective.nextStep, /^Continue searching Kovel Mansion/i);
    } else if (routeName !== "kovel-chase") {
      for (const key of ["j", "e"]) await advance(key);
      assert.match(textOf(frame), /IAMTHEGUILDMASTER.*ATTACKRELEASE/i);
      await verifyChaseIllustration("scene-illustration:area:14:ecl:ae6e", "kovel-guildmaster-cornered.png");
      await switchBothWays();
      await advance("j");
      assert.ok(knows("kovel-guildmaster") && !knows("kovel-guildmaster-escaped"));
      assert.match(frame.journal.objective.nextStep, /Choose Attack.*or Release/i);
      if (routeName === "kovel-chase-attack") {
        assert.ok(!knows("kovel-guildmaster-confronted"));
        for (const key of ["j", "a"]) await advance(key);
        assert.match(textOf(frame), /ABATTLEBEGINS/i);
        assert.notEqual(frame.portrait, "scene-illustration:area:14:ecl:ae6e");
        await advance("j");
        assert.ok(knows("kovel-guildmaster-confronted") && !knows("kovel-guildmaster-escaped"));
        assert.match(frame.journal.objective.nextStep, /after the fight with the guildmaster.*continue searching/i);
        await advance("j");
        await advance("enter");
        const ready = "combat:area:14:CPIC3.DAX:12:ecl:9c92";
        const strike = "combat:area:14:CPIC3.DAX:140:ecl:9c92";
        assert.ok(frame.combatArt.some(([x, y, id, , selected]) =>
          x === 80 && y === 56 && id === ready && selected));
        await waitFor("the guildmaster ready sprite", () => run(`
          document.querySelector('.combat-sprite[src="/art/${ready}"]')?.naturalWidth === 96`));
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "kovel-guildmaster-ready.png"), Buffer.from(shot.data, "base64"));
        await run(`window.guildmasterStrikeLoaded = false;
          new MutationObserver(() => {
            const image = document.querySelector('.combat-sprite[src="/art/${strike}"]');
            if (!image) return;
            const record = () => {
              window.guildmasterStrikeLoaded ||= image.naturalWidth === 96 && image.naturalHeight === 96;
            };
            record();
            image.addEventListener("load", record, { once: true });
          }).observe(document.querySelector("#tile-art"), { childList: true, subtree: true });`);
        await advance("enter");
        assert.ok(frame.animation?.some(view => view.combatArt.some(([x, y, id, reflected]) =>
          x === 80 && y === 56 && id === strike && reflected) && /1STLVLTHIEFAttacks/i.test(textOf(view))));
        await waitFor("the animated guildmaster strike", () => run("window.guildmasterStrikeLoaded"));
      } else {
        for (const key of ["j", "r"]) await advance(key);
        await verifyChaseIllustration("scene-illustration:area:14:ecl:b359:cue:guildmaster-escape", "kovel-guildmaster-escapes.png");
        await advance("j");
        assert.ok(knows("kovel-guildmaster-escaped") && !knows("kovel-guildmaster-confronted"));
        assert.match(frame.journal.objective.nextStep, /guildmaster fled after being released/i);
        for (const key of ["j", "enter", "e", "s", "s"]) await advance(key);
        assert.match(textOf(frame), /SAVEWHICHGAME/i);
        await advance("b");
        const eastSave = resolve(directory, "B.json");
        const escaped = JSON.parse(readFileSync(eastSave, "utf8"));
        assert.equal(escaped.tracked, "commission-kovel");
        assert.ok(escaped.leads.some(({ id }) => id === "kovel-guildmaster-escaped"));
        console.log("Kovel Mansion escape checkpoint:", eastSave);
      }
    } else {
      for (const key of ["j", "s"]) await advance(key);
      assert.match(textOf(frame), /8,13S.*AMBUSHEDBYSOMETHIEVES/i);
      await advance("j");
      assert.ok(knows(ambush));
      assert.match(frame.journal.objective.nextStep, /fight off the ambush/i);
      for (const key of ["j", "enter"]) await advance(key);
      assert.match(textOf(frame), /ABATTLEBEGINS/i);
    }
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified witnessed journal updates on ${routeName} in Chrome.`);
  } else if (routeName === "kovel-guild-files") {
    const files = "kovel-guild-files";
    const discovery = "scene-illustration:area:14:ecl:b359:cue:guild-files";
    assert.notEqual(frame.portrait, discovery);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kovel");
    assert.ok(!frame.journal.leads.some(({ id }) => id === files));
    for (const key of ["j", "up"]) await advance(key);
    assert.equal(frame.portrait, discovery);
    await waitFor("Kovel Mansion guild files", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const filesShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "kovel-guild-files-discovery.png"), Buffer.from(filesShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.match(frame.journal.leads.find(({ id }) => id === files)?.detail ?? "", /entries 38 and 51/);
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.match(frame.journal.objective.nextStep, /Read journal entries 38 and 51/);
    await advance("j");
    await advance("up");
    assert.notEqual(frame.portrait, discovery);
    console.log("Verified the Kovel Mansion file discovery and objective in Chrome.");
  } else if (routeName === "buccaneer-approach") {
    const base = "rescue-buccaneer-base";
    const verifyPenGuards = async (cursor) => {
      const portrait = `portrait:area:1:ecl:${cursor}:HEAD6.DAX:6:BODY6.DAX:3`;
      assert.equal(frame.portrait, portrait);
      await waitFor("the Buccaneer pen guards", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${portrait}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
    };
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-rescue");
    assert.ok(!frame.journal.leads.some(({ id }) => id === base));
    for (const key of ["j", "down", "enter"]) await advance(key);
    if (classicPortrait) {
      assert.equal(frame.classicPortrait, true);
      assert.equal(frame.portrait, undefined);
      assert.ok(frame.classicPortraitSources?.includes("portrait:PIC6.DAX:39:0:0"));
      await waitFor("classic portrait filling the Enhanced panel", () => run(`(() => {
        const layer = document.querySelector("#tile-art").getBoundingClientRect();
        const portrait = document.querySelector(".perspective-backdrop")?.getBoundingClientRect();
        return portrait && Math.abs(portrait.width - layer.width * 120 / 320) < 1 &&
          Math.abs(portrait.height - layer.height * 120 / 200) < 1;
      })()`));
    } else {
      assert.equal(frame.portrait, "portrait:PIC6.DAX:39:0:0");
      await waitFor("the mounted escort illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    }
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === base));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-base-entered"));
    assert.match(frame.journal.objective.nextStep, /Enter the Buccaneer Base/);
    for (const key of ["j", "e", "e"]) await advance(key);
    const entrance = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(entrance, /8,10S/i);
    await advance("j");
    assert.ok(frame.journal.leads.some(({ id }) => id === "rescue-base-entered"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-slave-pen" || id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Follow the fence inside/);
    for (const key of ["j", "right", "up", "right", "up", "enter"]) await advance(key);
    const overview = "portrait:area:1:ecl:b5f7:caller:9e66:PIC6.DAX:42:0:0";
    assert.equal(frame.portrait, overview);
    await waitFor("the captive pen overview", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${overview}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal.leads.some(({ id }) => id === "rescue-slave-pen"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Look among the prisoners/);
    for (const key of ["j", "enter"]) await advance(key);
    const identification = "portrait:area:1:ecl:b5f7:caller:9eda:PIC6.DAX:42:0:0";
    assert.equal(frame.portrait, identification);
    assert.match(frame.text.toSorted(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join(""),
      /HEART-SHAPEDBIRTHMARKONHISLEFTSHOULDER.*MERCHANTAPPROACHESYOU/i);
    await waitFor("the Bivant heir identification", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${identification}"]')?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Choose Rescue Boy/);
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:1:ecl:b5f7:caller:9f20:PIC6.DAX:42:0:0");
    for (const key of ["enter", "end", "end", "end", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-pen-options"));
    assert.match(frame.journal.objective.nextStep, /Choose Sneak Into Pen/);
    for (const key of ["j", "enter", "enter"]) await advance(key);
    await verifyPenGuards("a35b");
    await advance("j");
    assert.match(frame.journal.objective.nextStep, /Try to Sneak By/);
    for (const key of ["j", "t"]) await advance(key);
    await verifyPenGuards("a8ed");
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-sneak-blocked"));
    assert.match(frame.journal.objective.nextStep, /Attack Guards or Leave/);
    console.log("Verified the Buccaneer Base approach and rescue journal in Chrome.");
  } else if (routeName === "swamp-approach-reload") {
    assert.notEqual(frame.portrait, "portrait:PIC8.DAX:24:0:0");
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-lizardmen");
    const clues = new Set(frame.journal.leads.map(({ id }) => id));
    assert.ok(clues.has("swamp-drawbridge") && clues.has("swamp-anti-magic") && !clues.has("swamp-peaceful-elder"));
    assert.match(frame.journal.objective.nextStep, /search the ruined castle.*anti-magic shell/i);
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the swamp entry guidance after reloading in Chrome.");
  } else if (routeName === "swamp-approach") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-lizardmen");
    assert.ok(!knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    for (const key of ["j", ...Array(11).fill("right"), "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:24:0:0");
    const drawbridgeText = frame.text.toSorted(([a], [b]) => a - b)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(drawbridgeText, /RUINEDCASTLESURROUNDEDBYQUICKSAND.*ANOLDWORNDRAWBRIDGEISTHEONLYSAFEWAYACROSSTHEQUAGMIRE/i);
    await waitFor("the enhanced swamp drawbridge", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("j");
    assert.ok(knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    assert.match(frame.journal.objective.nextStep, /cross the drawbridge/);
    for (const key of ["j", "e", "enter"]) await advance(key);
    assert.equal(frame.portrait, undefined);
    await advance("j");
    assert.ok(knows("swamp-anti-magic") && !knows("swamp-peaceful-elder"));
    assert.match(frame.journal.objective.nextStep, /anti-magic shell/);
    for (const key of ["j", "enter", "up", "e", "s", "s", "a"]) await advance(key);
    const entered = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(entered.leads.some(({ id }) => id === "swamp-anti-magic"));
    console.log("Verified the swamp drawbridge and anti-magic shell in Chrome. Saved:", saved);
  } else if (routeName === "yarash-combat") {
    const mage = "combat:area:23:CPIC7.DAX:14";
    const guard = "combat:area:23:CPIC7.DAX:57:ecl:ac24";
    const strike = "combat:area:23:CPIC7.DAX:185:ecl:ac24";
    const visible = (id) => run(`[...document.querySelectorAll(".combat-sprite")].filter(image =>
      image.src.endsWith(${JSON.stringify(id)}) && image.naturalWidth === 96 && image.naturalHeight === 96).length`);
    for (const key of ["up", "up", "b", "up", "enter", "f", "enter"]) await advance(key);
    assert.ok(frame.combatArt.some(([, , id, , selected]) => id === mage && selected));
    assert.deepEqual(frame.combatArt.filter(([, , id]) => id === guard), [
      [32, 56, guard, true], [56, 80, guard, true], [80, 80, guard, true],
      [104, 104, guard, true], [104, 128, guard, true], [128, 128, guard, true],
    ]);
    await waitFor("Yarash and all six guards", async () => await visible(mage) === 1 && await visible(guard) === 6);
    await switchBothWays();
    await waitFor("the enhanced combat sprites", async () => await visible(mage) === 1 && await visible(guard) === 6);
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "yarash-combat.png"), Buffer.from(capture.data, "base64"));
    await advance("enter");
    const swung = () => frame.animation?.some((shot) => shot.combatArt?.some(([, , id]) => id === strike));
    for (let turn = 0; turn < 20 && !swung(); turn++) await advance("q");
    assert.ok(swung(), "A mutant guard must strike during the replay");
    await waitFor("the mutant guard strike", () => visible(strike));
    console.log("Verified the Yarash combat sprites and guard strike in Chrome. Capture:", directory);
  } else if (routeName === "river-pumping-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    for (const id of ["river-pump-prisoners-freed", "journal-entry-35"]) {
      assert.ok(frame.journal.leads.some(lead => lead.id === id));
    }
    assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
    await switchBothWays();
    console.log("Verified the prisoners' advice and tracked river objective after reload.");
  } else if (riverPumping) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    for (const key of ["up", "j"]) await advance(key);
    assert.ok(knows("river-pump-prisoners") && !knows("river-pump-prisoners-freed"));
    assert.match(frame.journal.objective.nextStep, /Advance until Parlay appears/);
    const prisoner = "encounter:area:23:ecl:aa03:SPRIT7.DAX:57:1:0";
    for (const key of ["j", "enter", "enter", "enter"]) await advance(key);
    assert.deepEqual(frame.encounter, [56, 32, prisoner, 32, 65]);
    await waitFor("the enhanced shackled lizardfolk", () => run(`
      document.querySelector('.encounter-sprite[src="/art/${prisoner}"]')?.naturalWidth === 128
    `));
    await switchBothWays();
    const close = "encounter:area:23:ecl:aa03:SPRIT7.DAX:57:0:0";
    await advance("a");
    assert.deepEqual(frame.encounter, [48, 32, close, 48, 80]);
    await waitFor("the enhanced close prisoner sprite", () => run(`
      document.querySelector('.encounter-sprite[src="/art/${close}"]')?.naturalWidth === 192
    `));
    await advance("a");
    const portrait = "portrait:area:23:ecl:aa03:PIC7.DAX:57:0:0";
    assert.equal(frame.portrait, portrait);
    await waitFor("the enhanced pumping room illustration", () => run(`
      document.querySelector('.encounter-portrait[src="/art/${portrait}"]')?.naturalWidth === 352
    `));
    await verifyPortraitPanel();
    await switchBothWays();
    await advance("p");
    assert.equal(frame.portrait, "portrait:area:23:PIC7.DAX:57:0:0");
    if (riverPumpingHostile) {
      await advance("h");
      const dialogue = frame.text.toSorted(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(dialogue, /THEYTHROWTHEIRBARRELSOFCONTAMINANTONTHEPARTY/i);
      const spill = "scene-illustration:area:23:ecl:9a04:caller:ab0a";
      assert.equal(frame.portrait, spill);
      await waitFor("the pumping-room contaminant illustration", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${spill}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays(frame.frame);
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "pumping-room-prisoners-hostile.png"), Buffer.from(shot.data, "base64"));
      await advance("j");
      assert.ok(knows("river-pump-prisoners-hostile"));
      assert.ok(!knows("river-pump-prisoners-freed") && !knows("journal-entry-35"));
      assert.match(frame.journal.objective.nextStep, /get clear of the hostile pumping room.*source of the foul water/i);
      for (const key of ["j", "enter"]) await advance(key);
      assert.notEqual(frame.portrait, spill, "The splash illustration should end with its narration");
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified the hostile pumping-room illustration and journal in Chrome. Capture:", directory);
    } else {
      await advance("n");
      const release = "scene-illustration:area:23:ecl:9a04:caller:aaae";
      assert.equal(frame.portrait, release);
      await waitFor("the freed pumping-room prisoners", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector('.encounter-portrait[src="/art/${release}"]')?.naturalWidth === 352 &&
        document.querySelector('.encounter-portrait[src="/art/${release}"]')?.naturalHeight === 352`));
      await verifyPortraitPanel();
      const releaseShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "pumping-room-prisoners-freed.png"), Buffer.from(releaseShot.data, "base64"));
      await switchBothWays(frame.frame);
      await advance("j");
      assert.ok(knows("river-pump-prisoners-freed") && knows("journal-entry-35"));
      assert.ok(!knows("river-pump-prisoners-hostile"));
      assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
      for (const key of ["j", "enter"]) await advance(key);
      assert.equal(frame.portrait, undefined);
      for (const key of ["e", "s", "s", "a"]) await advance(key);
      const released = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(released.tracked, "commission-river");
      assert.ok(released.leads.some(({ id }) => id === "journal-entry-35"));
      console.log("Prisoner release checkpoint:", saved);
      console.log("Verified the pumping-room parlay, release illustration, and journal clues in Chrome. Capture:", directory);
    }
  } else if (riverExit) {
    const knowsRecovery = () => frame.journal?.leads.some(({ id }) => id === "river-recovery");
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-equipment-destroyed"));
    assert.equal(knowsRecovery(), false);
    for (const key of ["j", "right", "right", "up", "enter", "j"]) await advance(key);
    assert.ok(knowsRecovery());
    assert.match(frame.journal.objective.nextStep, /Barren River.*east.*south.*landing.*Take Boat.*council clerk/i);
    for (const key of ["j", "enter", "enter", "g", "enter", "e", "s", "s", "a"]) await advance(key);
    const exited = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(exited.leads.some(({ id }) => id === "river-recovery"));
    console.log("Verified the original pyramid exit and saved the witnessed river recovery. Saved:", saved);
  } else if (riverFountain) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.ok(!knows("river-fountain") && !knows("river-equipment-destroyed"));
    for (const key of ["j", "up", "b"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC7.DAX:45:0:0");
    await waitFor("the fountain illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("river-fountain") && !knows("river-equipment-destroyed"));
    assert.match(frame.journal.objective.nextStep, /Destroy the Equipment/);
    for (const key of ["j", "enter", "enter", "d"]) await advance(key);
    assert.notEqual(frame.portrait, "scene-illustration:area:23:ecl:9a04:caller:a855");
    await advance("j");
    assert.ok(knows("river-equipment-destroyed") && !knows("river-recovery"));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    const completed = JSON.parse(readFileSync(saved, "utf8"));
    assert.equal(completed.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.ok(completed.leads.some(({ id }) => id === "river-equipment-destroyed"));
    console.log("Verified the river fountain discovery and machinery shutdown in Chrome. Saved:", saved);
  } else if (routeName === "river-passage-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.equal(frame.journal.leads.filter(({ id }) => id === "river-inner-doors").length, 1);
    assert.ok(!frame.journal.leads.some(({ id }) => id === "river-fountain"));
    assert.match(frame.journal.objective.nextStep, /Follow the hidden passages/);
    await switchBothWays();
    await advance("j");
    assert.equal(frame.journal, undefined);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the reloaded river passage journal and its tracked objective in Chrome.");
  } else if (riverPassage) {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.match(frame.journal.objective.nextStep, /Explore the passage ahead/);
    assert.ok(!frame.journal.leads.some(({ id }) => id === "river-inner-doors"));
    const halls = () => frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    for (const key of ["j", ...Array(15).fill("up")]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDINFRONTOFYOU/i);
    const doorIllustration = "scene-illustration:area:22:ecl:9a06:caller:9c5c";
    assert.equal(frame.portrait, doorIllustration);
    await waitFor("the pyramid inner secret door", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const innerDoorShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "pyramid-inner-secret-door.png"), Buffer.from(innerDoorShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-inner-doors"));
    assert.match(frame.journal.objective.nextStep, /Follow the hidden passages/);
    await advance("j");
    for (const key of ["enter", "right", "up"]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDTOYOURLEFT/i);
    assert.equal(frame.portrait, "scene-illustration:area:22:ecl:9a06:caller:9c5c:cue:left");
    await waitFor("the left-side pyramid secret door", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const leftDoorShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "pyramid-left-secret-door.png"), Buffer.from(leftDoorShot.data, "base64"));
    await switchBothWays();
    for (const key of ["enter", "right", "up", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-entrance-inside"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "river-fountain"));
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    assert.ok(JSON.parse(readFileSync(saved, "utf8")).leads.some(({ id }) => id === "river-inner-doors"));
    console.log("Verified the first two pyramid doors and saved their journal discovery in Chrome:", saved);
  } else if (riverApproach) {
    const boat = "river-rowboat";
    const door = "river-secret-door";
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.ok(!knows(boat) && !knows(door));
    for (const key of ["j", "down"]) await advance(key);
    assert.equal(frame.portrait, "scene-illustration:area:26:ecl:9f74");
    await waitFor("the rowboat in the reeds", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352 &&
      document.querySelector(".encounter-portrait")?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const rowboatShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "river-hidden-rowboat.png"), Buffer.from(rowboatShot.data, "base64"));
    await switchBothWays();
    await advance("j");
    assert.ok(knows(boat) && !knows(door));
    assert.match(frame.journal.objective.nextStep, /Take the rowboat/);
    for (const key of ["j", "y", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC7.DAX:36:0:0");
    await waitFor("the pyramid exterior illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows(door) && !knows("river-fountain"));
    assert.match(frame.journal.objective.nextStep, /through the secret door/);
    for (const key of ["j", "e", "enter", "enter"]) await advance(key);
    await waitFor("the pyramid entrance view", () => run(`state.sequence === ${frame.sequence}`));
    const screenshot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "pyramid-entrance.png"), Buffer.from(screenshot.data, "base64"));
    await advance("j");
    assert.ok(knows("river-entrance-inside") && !knows("river-fountain"));
    assert.match(frame.journal.objective.nextStep, /Explore the passage ahead/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    assert.ok(JSON.parse(readFileSync(saved, "utf8")).leads.some(({ id }) => id === "river-entrance-inside"));
    console.log("Verified the river rowboat and secret entrance in Chrome. Saved:", saved);
  } else if (routeName === "river-return-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-recovery"));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-river")?.status, "turned-in");
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the river recovery and council turn-in after reloading in Chrome.");
  } else if (envoyReturn || riverReturn || koboldReturn) {
    const commission = koboldReturn ? "commission-kobolds" : riverReturn ? "commission-river" : "commission-zhentil";
    const discovery = koboldReturn ? "kobold-caves-left" : riverReturn ? "river-recovery" : "zhentil-envoy-left";
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    assert.ok(frame.journal.leads.some(({ id }) => id === discovery));
    const knowsFerry = () => frame.journal?.leads.some(({ id }) => id === "phlan-return-ferry");
    if (koboldReturn) assert.equal(knowsFerry(), koboldFerryReload);
    const toLanding = koboldReturn
      ? [...Array(3).fill("right"), ...Array(14).fill("down")]
      : riverReturn
      ? ["right", "right", "right", ...Array(15).fill("down"), "left", "left"]
      : [...Array(5).fill("up"), ...Array(18).fill("right"), "down", "down"];
    await advance("j");
    if (!koboldFerryReload) {
      for (const key of [...toLanding, "enter"]) await advance(key);
      if (koboldReturn) {
        assert.equal(frame.portrait, "portrait:PIC8.DAX:41:0:0");
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /TAKEBOAT.*STAY/i);
        await advance("j");
        assert.ok(knowsFerry());
        assert.match(frame.journal.objective.nextStep, /choose Take Boat/i);
        await advance("j");
      }
      for (const key of ["t", "enter", "enter"]) await advance(key);
      if (koboldFerrySave) {
        for (const key of ["e", "s", "s", "b"]) await advance(key);
        const pierSave = JSON.parse(readFileSync(saved, "utf8"));
        assert.ok(pierSave.leads.some(({ id }) => id === "phlan-return-ferry"));
        console.log("New Phlan pier checkpoint:", saved);
      }
    }
    if (!koboldFerrySave) {
      for (const key of [koboldReturn ? "right" : "enter", ...Array(4).fill("up"),
        "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
        "left", "up", "up", "left", "up", "left", "up", "up", "enter", "j"]) await advance(key);
      assert.equal(journalStatus(), "ready-to-report");
      // This checkpoint still has its earlier Podal Plaza reward to collect.
      for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
      if (koboldReturn) {
        assert.equal(journalStatus(), "ready-to-report");
        // The clerk pays the earlier envoy reward before the kobold reward.
        for (const key of ["j", "enter", "enter", "enter", "s", "e", "enter", "j"]) await advance(key);
        assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join("").replace(/\s/g, ""),
          /THISLOSSOFTHEKOBOLDFORCESWILLBEAMAJORBLOW/i);
      }
      assert.equal(journalStatus(), "reward-pending");
      const rewardKeys = koboldReturn
        ? ["enter", "enter", "s", "e", "enter"]
        : ["enter", "enter", "enter", "s", "e"];
      for (const key of ["j", ...rewardKeys, "j"]) await advance(key);
      assert.equal(journalStatus(), "turned-in");
      if (riverReturn) {
        const visibleText = () => frame.text.toSorted(([a], [b]) => a - b)
          .map(([, character]) => String.fromCharCode(character)).join("");
        await advance("j");
        for (let prompt = 0; prompt < 20 && !/AreaCastViewEncamp/i.test(visibleText()); prompt++) {
          const dialogue = visibleText();
          if (/ViewTakePoolShareExit/i.test(dialogue)) await advance("e");
          else if (/gobackandclaimyourtreasure/i.test(dialogue)) await advance("n");
          else if (/press<enter>/i.test(dialogue)) await advance("enter");
          else break;
        }
        assert.match(visibleText(), /AreaCastViewEncamp/i);
        for (const key of ["e", "s", "s"]) await advance(key);
        assert.match(visibleText(), /SAVEWHICHGAME/i);
        await advance("a");
        const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
        assert.ok(checkpoint.leads?.some(({ id }) => id === "river-recovery"));
        assert.equal(checkpoint.leads.find(({ id }) => id === "commission-river")?.status, "turned-in");
        console.log("River return checkpoint:", saved);
      }
      if (koboldFerryReload) {
        console.log("Verified the ferry discovery after reloading at the New Phlan pier and collected the kobold reward.");
      } else {
        console.log(`Verified ${commission} after reload, the return boat, and council turn-in in Chrome.`);
      }
    }
  } else if (routeName === "mendor-records-reward-reload") {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-records");
    assert.equal(frame.journal.leads.find(({ id }) => id === "mendor-book-37")?.status, "turned-in");
    assert.match(frame.journal.objective.nextStep, /Search the other stacks/i);
    await switchBothWays();
    console.log("Verified the standing records objective and completed atlas handoff after reloading slot A.");
  } else if (routeName === "mendor-records-reward") {
    const record = () => frame.journal?.leads.find(({ id }) => id === "mendor-book-37");
    await advance("j");
    assert.equal(record()?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk at City Hall/);
    for (const key of ["j", "right", "right", "up", "right", "right", "up", "enter", "enter"]) await advance(key);
    assert.match(frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /THESEMAPSSHOULDHELPUSLOCATE|THESEMAPSSHOULDHELPUSTOLOCATE/i);
    const atlasPortrait = "scene-illustration:area:8:ecl:9f21:caller:9a4a:cue:lex-geographica";
    assert.equal(frame.portrait, atlasPortrait);
    await waitFor("the Lex Geographica illustration", () => run(`
      document.querySelector('.encounter-portrait[src="/art/${atlasPortrait}"]')?.naturalWidth === 352`));
    await switchBothWays();
    await verifyPortraitPanel();
    await advance("j");
    assert.equal(record()?.status, "reward-pending");
    assert.equal(frame.journal.trackedId, "mendor-book-37");
    assert.match(frame.journal.objective.nextStep, /Finish collecting the council reward/);
    await advance("j");
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /receives500experiencepoints/i);
    for (const key of ["enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(record()?.status, "turned-in");
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-records")?.status, "offered");
    assert.equal(frame.journal.trackedId, "commission-records");
    assert.match(frame.journal.objective.nextStep, /Search the other stacks/i);
    for (const key of ["j", "enter", "e", "s", "s", "a"]) await advance(key);
    assert.equal(JSON.parse(readFileSync(saved, "utf8")).tracked, "commission-records");
    console.log("Mendor records checkpoint:", saved);
    console.log("Verified the clerk acknowledgment for Lex Geographica in Chrome.");
  } else if (routeName === "swamp-reward-reload") {
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "swamp-alliance-averted"));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-lizardmen")?.status, "turned-in");
    await switchBothWays();
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the elder's pledge and the council turn-in after reloading in Chrome.");
  } else if (councilReward) {
    const [commission, originalDialogue, art] = councilReward;
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    if (commission === "commission-lizardmen") {
      assert.ok(frame.journal.leads.some(({ id }) => id === "swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /elder's pledge/);
    }
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /journal entry 25/);
    if (routeName === "kobold-king-reward") assert.match(frame.journal.objective.nextStep, /tell the council clerk at City Hall that the king fell/);
    if (routeName === "nomad-reward") assert.match(frame.journal.objective.nextStep, /report what happened at the Nomad Camp/);
    if (swampReturn) {
      assert.match(frame.journal.objective.nextStep, /south drawbridge.*East Overland ferry/i);
      const visibleText = () => frame.text.toSorted(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("");
      for (const key of ["j", "right", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
        "left", "up", "up", "up", "right", ...Array(6).fill("up"), "enter", "enter"]) await advance(key);
      assert.match(visibleText(), /WILLYOUENTERTHERUINEDCASTLE/i);
      for (const key of ["l", "enter", "enter"]) await advance(key);
      assert.match(visibleText(), /37,8S/i);
      for (const key of ["left", "left", ...Array(21).fill("down"), "enter"]) await advance(key);
      assert.match(visibleText(), /35,29S.*TakeboatStay/i);
      await switchBothWays();
      for (const key of ["t", "enter", "enter", "right", ...Array(4).fill("up"),
        "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
        "left", "up", "up", "left", "up", "left", "up", "up", "enter"]) await advance(key);
      for (const earlier of [/SUCCESSATPODALPLAZA/i, /CADORNAWASWAGERINGYOURRETURN/i]) {
        if (!earlier.test(visibleText())) await advance("enter");
        assert.match(visibleText(), earlier);
        for (const key of ["enter", "enter", "enter", "s", "e"]) await advance(key);
      }
      if (!originalDialogue.test(visibleText())) await advance("enter");
    } else {
      for (const key of ["j", "right", "right", "up", "right", "right", "up", "enter", "enter"]) await advance(key);
    }
    if (art) {
      assert.equal(frame.portrait, art.portrait);
      await waitFor("the council reward illustration", () => run(`
        document.querySelector('.encounter-portrait[src="/art/${art.portrait}"]')?.naturalWidth === 352`));
      await switchBothWays();
      await verifyPortraitPanel();
    }
    await advance("j");
    assert.equal(journalStatus(), "reward-pending");
    const clerkDialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(clerkDialogue, originalDialogue);
    if (commission === "commission-lizardmen") assert.match(frame.journal.objective.nextStep, /choose Share to divide the coins, then Exit/i);
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /keep the temple treasure.*Press Enter/);
    await advance("j");
    await advance("enter");
    if (art) {
      assert.equal(frame.portrait, undefined);
      const xp = swampReturn ? 2960 : art.xp;
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), new RegExp(`receives${xp}experiencepoints`, "i"));
    }
    for (const key of ["enter", "enter", "s", "e", "j"]) await advance(key);
    if (routeName === "bivant-reward") {
      assert.equal(journalStatus(), "reward-pending");
      assert.match(frame.journal.objective.nextStep, /choose Take.*then Exit/i);
      for (const key of ["j", "y", "t"]) await advance(key);
      const loot = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(loot, /Two-HandedSword.*ClericalScroll/i);
      for (const key of [...Array(5).fill("t"), "e", "e", "j"]) await advance(key);
    }
    assert.equal(journalStatus(), "turned-in");
    if (swampReturn) assert.deepEqual(readFileSync(saved), originalSave);
    if (commission === "commission-lizardmen") {
      await advance("j");
      const words = () => frame.text.toSorted(([a], [b]) => a - b)
        .map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      for (let prompt = 0; prompt < 20 && !/AreaCastViewEncamp/i.test(words()); prompt++) {
        const dialogue = words();
        if (/ViewTakePoolShareExit/i.test(dialogue)) await advance("e");
        else if (/gobackandclaimyourtreasure/i.test(dialogue)) await advance("n");
        else if (/press<enter>/i.test(dialogue)) await advance("enter");
        else break;
      }
      assert.match(words(), /AreaCastViewEncamp/i);
      for (const key of ["e", "s", "s", "a"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpoint.leads?.find(({ id }) => id === commission)?.status, "turned-in");
      assert.ok(checkpoint.leads.some(({ id }) => id === "swamp-alliance-averted"));
      console.log("Lizardfolk council reward checkpoint:", saved);
    }
    if (routeName === "bane-reward") {
      assert.match(frame.journal.leads.find(({ id }) => id === commission).detail, /keep what it found/);
      for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
      const checkpoint = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpoint.leads.find(({ id }) => id === commission)?.status, "turned-in");
    }
    if (routeName === "bivant-reward") {
      for (const key of ["j", "enter", "e", "s", "s", "a"]) await advance(key);
      const checkpointAfterReward = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpointAfterReward.leads.find(({ id }) => id === commission)?.status, "turned-in");
      console.log("Bivant reward checkpoint:", saved);
    }
    if (routeName === "kobold-king-reward") {
      for (const key of ["j", "enter", "e", "s", "s", "a"]) await advance(key);
      const checkpointAfterReward = JSON.parse(readFileSync(saved, "utf8"));
      assert.equal(checkpointAfterReward.leads.find(({ id }) => id === commission)?.status, "turned-in");
      assert.ok(checkpointAfterReward.leads.some(({ id }) => id === "kobold-king-fell"));
    }
    console.log(`Verified that ${commission} is turned in only after the council reward menu closes.`);
  } else if (envoyEscape) {
    for (const key of ["right", "right", "up", "left", "up", "up", "right", "up", "up", "up", "left",
      "up", "up", "up", "up", "up"]) await advance(key);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "zhentil-climbable-wall"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "zhentil-envoy-left"));
    const commission = "commission-zhentil";
    await waitFor("the Zhentil track button", () => run(`Boolean(document.querySelector('[data-lead-id="${commission}"]'))`));
    await run(`document.querySelector('[data-lead-id="${commission}"]').click()`);
    frame = await waitFor("the tracked Zhentil commission", async () => {
      const next = await latest();
      return next.ready && next.journal?.trackedId === commission && next;
    });
    assert.match(frame.journal.objective.nextStep, /Climb Over Wall/);
    for (const key of ["j", "c", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "zhentil-envoy-left"));
    assert.equal(frame.journal.leads.find(({ id }) => id === commission)?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    const checkpointAfterEscape = JSON.parse(readFileSync(saved, "utf8"));
    assert.equal(checkpointAfterEscape.leads.find(({ id }) => id === commission)?.status, "ready-to-report");
    assert.ok(checkpointAfterEscape.leads.some(({ id }) => id === "zhentil-envoy-left"));
    console.log("Verified the Zhentil wall escape and the resulting council report objective in Chrome. Saved:", saved);
  } else if (routeName === "zhentil-trespass") {
    for (const key of ["down", "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(frame.portrait, "portrait:PIC6.DAX:33:0:0");
    assert.match(text, /YOUARETRESSPASSINGONPRIVATELAND/i);
    assert.match(text, /STAY.*LEAVE/i);
    await waitFor("the mounted patrol at the trespass warning", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Zhentil mounted patrol during the trespass warning in Chrome.");
  } else if (envoy) {
    const checkJournal = async (present, hidden) => {
      await advance("j");
      assert.ok(frame.journal, "The journal should open during the envoy route");
      const hasLead = (id) => frame.journal.leads.some((lead) => lead.id === `zhentil-${id}`);
      for (const id of present) assert.ok(hasLead(id), `Missing Zhentil discovery ${id}`);
      for (const id of hidden) assert.ok(!hasLead(id), `Revealed Zhentil discovery early: ${id}`);
      await advance("j");
    };
    await checkJournal([], ["envoy-challenge", "packet-delivered", "quarters"]);
    for (const key of ["down", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC6.DAX:33:0:0");
    await waitFor("the Zhentil mounted patrol portrait", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await switchBothWays();
    await checkJournal(["envoy-challenge"], ["packet-delivered", "quarters"]);
    await advance("y");
    for (let line = 0; line < 6; line++) await advance("enter");
    assert.equal(frame.portrait, "portrait:PIC6.DAX:50:0:0");
    await waitFor("the Zhentil commandant portrait", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await verifyPortraitPanel();
    await switchBothWays();
    await checkJournal(["envoy-challenge", "packet-delivered"], ["quarters"]);
    for (let line = 0; line < 2; line++) await advance("enter");
    const barracks = "scene-illustration:area:25:ecl:b624:caller:9d4d";
    assert.equal(frame.portrait, barracks);
    await waitFor("Zhentil barracks tour illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return state.sequence === ${frame.sequence} && image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await verifyPortraitPanel();
    const barracksShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "zhentil-barracks-tour.png"), Buffer.from(barracksShot.data, "base64"));
    await switchBothWays();
    await checkJournal(["tour-barracks"], ["tour-watchtowers", "tour-outer-wall"]);
    await advance("enter");
    const watchtower = "scene-illustration:area:25:ecl:b624:caller:9da7";
    assert.equal(frame.portrait, watchtower);
    await waitFor("Zhentil watchtower tour illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return state.sequence === ${frame.sequence} && image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await verifyPortraitPanel();
    const watchtowerShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "zhentil-watchtower-tour.png"), Buffer.from(watchtowerShot.data, "base64"));
    await switchBothWays();
    await checkJournal(["tour-barracks", "tour-watchtowers"], ["tour-outer-wall"]);
    await advance("enter");
    const outerWall = "scene-illustration:area:25:ecl:b624:caller:9e0e";
    assert.equal(frame.portrait, outerWall);
    await waitFor("Zhentil outer wall tour illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return state.sequence === ${frame.sequence} && image?.getAttribute("src") === "/art/${outerWall}" &&
        image.naturalWidth === 352 && image.naturalHeight === 352;
    })()`));
    await verifyPortraitPanel();
    const wallShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "zhentil-outer-wall-tour.png"), Buffer.from(wallShot.data, "base64"));
    await switchBothWays();
    await checkJournal(["tour-barracks", "tour-watchtowers", "tour-outer-wall"], ["quarters"]);
    await advance("enter");
    assert.notEqual(frame.portrait, outerWall);
    await advance("enter");
    const assignedQuarters = "scene-illustration:area:25:ecl:b5ec";
    assert.equal(frame.portrait, assignedQuarters);
    await waitFor("Zhentil assigned quarters illustration", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector('.encounter-portrait[src="/art/${assignedQuarters}"]')?.naturalWidth === 352 &&
      document.querySelector('.encounter-portrait[src="/art/${assignedQuarters}"]')?.naturalHeight === 352`));
    await verifyPortraitPanel();
    const quartersShot = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "zhentil-assigned-quarters.png"), Buffer.from(quartersShot.data, "base64"));
    await checkJournal(["envoy-challenge", "packet-delivered", "tour-barracks", "tour-watchtowers", "tour-outer-wall", "quarters"], ["quarters-attacked", "envoy-left"]);
    await switchBothWays();
    await advance("up");
    assert.notEqual(frame.portrait, assignedQuarters);
    for (const key of ["right", "up", "right", "up", "right", "up"]) await advance(key);
    await checkJournal(["relax"], ["dinner", "night", "quarters-attacked"]);
    for (const key of ["r", "enter"]) await advance(key);
    await checkJournal(["dinner"], ["night", "quarters-attacked"]);
    for (const key of ["enter", "n", "s"]) await advance(key);
    await checkJournal(["night"], ["quarters-attacked"]);
    await advance("enter");
    await checkJournal(["quarters-attacked"], ["climbable-wall", "envoy-left"]);
    console.log("Verified the Zhentil patrol, delivery, dinner, and quarters ambush journal discoveries in Chrome.");
  } else if (wolves) {
    const standing = "combat:area:10:CPIC4.DAX:106";
    const attack = "combat:area:10:CPIC4.DAX:234";
    await run(`window.wolfBiteLoaded = false;
      new MutationObserver(() => {
        for (const image of document.querySelectorAll(".combat-sprite")) {
          if (!image.src.endsWith(${JSON.stringify(attack)})) continue;
          const record = () => {
            if (image.naturalWidth === 192 && image.naturalHeight === 96) window.wolfBiteLoaded = true;
          };
          record();
          image.addEventListener("load", record, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });`);
    for (const key of ["up", "enter", "y", "enter", "enter", "enter", "q", "q", "q"]) await advance(key);
    const hasFootprint = (placement, id) => placement[2] === id && placement[5] === 48 && placement[6] === 24;
    assert.ok(frame.combatArt.filter((placement) => hasFootprint(placement, standing)).length >= 2);
    assert.ok(frame.animation?.some((shot) => shot.combatArt?.some((placement) => hasFootprint(placement, attack))));
    await waitFor("the wolf bite sprite", () => run("window.wolfBiteLoaded"));
    await waitFor("two standing wolves", () => run(`!animationFrame &&
      [...document.querySelectorAll(".combat-sprite")].filter(image =>
        image.src.endsWith(${JSON.stringify(standing)}) && image.naturalWidth === 192 && image.naturalHeight === 96).length >= 2`));
    await switchBothWays();
    console.log("Verified the Valhingen wolf stance and bite in live Chrome combat.");
  } else if (vampire) {
    const stairs = "graveyard-vampire-stairs";
    await advance("j");
    assert.ok(frame.journal);
    const tracksBottle = frame.journal.trackedId === "commission-bottle-vampire";
    if (tracksBottle) assert.doesNotMatch(frame.journal.objective.nextStep, /wooden stairs/i);
    assert.ok(!frame.journal.leads.some(({ id }) => id === stairs));
    for (const key of ["j", "up", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === stairs));
    if (tracksBottle) assert.match(frame.journal.objective.nextStep, /wooden stairs.*choose Yes/i);
    for (const key of ["j", "y", "enter"]) await advance(key);
    const encounter = "encounter:area:10:SPRIT4.DAX:23:0:0";
    assert.deepEqual(frame.encounter, [56, 32, encounter, 32, 80]);
    await waitFor("the vampire at the crypt threshold", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:area:10:ecl:b695:caller:b23b:PIC4.DAX:23:0:0");
    await waitFor("the vampire dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "q", "q"]) await advance(key);
    const standing = "combat:area:10:CPIC4.DAX:23";
    assert.ok(frame.combatArt.some(([, , id]) => id === standing));
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")]
      .some(img => img.src.endsWith(${JSON.stringify(id)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`);
    await waitFor("the vampire combat sprite", () => displayed(standing));
    await switchBothWays();
    const attack = "combat:area:10:CPIC4.DAX:151";
    const struck = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 15 && !struck(); turn++) await advance("q");
    assert.ok(struck(), "The vampire strike must occur during the replay");
    await waitFor("the vampire strike sprite", () => displayed(attack));
    console.log("Verified the Valhingen vampire in approach, dialogue, stance, and strike.");
  } else if (mystic) {
    const approachSequence = [
      [64, 32, "encounter:area:10:SPRIT4.DAX:14:2:0", 8, 49],
      [56, 32, "encounter:area:10:SPRIT4.DAX:14:1:0", 24, 65],
      [56, 32, "encounter:area:10:SPRIT4.DAX:14:0:0", 24, 80],
    ];
    await observeApproach(approachSequence);
    for (const key of ["up", "enter"]) await advance(key);
    await waitFor("all three enhanced mystic distances", () => run("window.observedApproach.size === 3"));
    assert.deepEqual(await run("[...window.observedApproach]"), approachSequence.map(([, , id]) => id));
    await advance("enter");
    assert.equal(frame.portrait, "portrait:HEAD4.DAX:0:BODY4.DAX:2");
    await waitFor("the Valhingen mystic portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "enter", "l"]) await advance(key);
    const directions = "portrait:area:10:ecl:ae86:HEAD4.DAX:0:BODY4.DAX:2";
    assert.equal(frame.portrait, directions);
    await waitFor("the mystic directions illustration", () => run(`
      [...document.querySelectorAll(".encounter-portrait")].some(image =>
        image.naturalWidth === 352 && image.src.endsWith(${JSON.stringify(directions)}))`));
    await switchBothWays();
    await advance("enter");
    assert.notEqual(frame.portrait, directions);
    console.log("Verified the Valhingen mystic approach, directions illustration, and state-preserving switches.");
  } else if (assault) {
    const route = ["left", "left", "up", "right", "right", "up", "enter", "enter", "enter", "enter",
      "s", "e", "n", "enter", "enter", "enter", "enter", "right", "up", "left", "up", "right", "up", "enter"];
    for (const key of route.slice(0, 15)) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:57:BODY3.DAX:1");
    await waitFor("the council escort portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of route.slice(15)) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:2");
    await waitFor("Ulrich's assault briefing portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified Ulrich's assault briefing portrait and state-preserving switches.");
  } else if (dragon || halls) {
    const route = halls ? ["up", "up", ...Array(3).fill("enter")] : ["right", ...Array(4).fill("up"), ...Array(3).fill("enter")];
    const patterns = new Set();
    const sceneryAreas = new Set();
    async function verifyHallView(area) {
      if (!verifyHallsWebGL) return verifyTiledView(area, patterns);
      if (!frame.perspective) return 0;
      assert.equal(frame.scenery?.area, area);
      sceneryAreas.add(frame.scenery.area);
      await waitForExplorationViewport();
      return 1;
    }
    let views = await verifyHallView(20);
    const reveal = "portrait:area:7:ecl:995f:caller:a54b:PIC5.DAX:66:0:0";
    let sawReveal = false;
    for (const key of route) {
      await advance(key);
      if (frame.portrait === reveal) {
        await waitFor("Tyranthraxus rising from the Pool", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector('.encounter-portrait[src="/art/${reveal}"]')?.naturalWidth === 352`));
        await verifyPortraitPanel();
        sawReveal = true;
      }
      // The final audience draws area 7 before the dialogue portrait appears.
      views += await verifyHallView(views >= (halls ? 2 : 3) ? 7 : 20);
    }
    assert.ok(sawReveal);
    assert.equal(views, halls ? 4 : 7);
    if (verifyHallsWebGL) assert.deepEqual([...sceneryAreas], [20, 7]);
    assert.equal(frame.portrait, "portrait:area:7:ecl:995f:caller:a6a7:PIC5.DAX:66:0:0");
    await waitFor("the dragon dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await verifyPortraitPanel();
    await switchBothWays();
    if (halls) {
      console.log(`Verified enhanced Valjevo hall views and the dragon dialogue${verifyHallsWebGL ? " with default WebGL exploration" : ""}.`);
    } else {
      const partyArt = new Set(["combat:party:73:93", "combat:party:73:81", "combat:party:69:90", "combat:party:0:3",
        "combat:party:2:5", "combat:party:74:88"]);
      const battlefieldPatterns = new Set();
      function checkBattlefieldPatterns() {
        if (!frame.battleTileInventory?.length) return;
        const placements = new Map(frame.battleTiles.map(([x, y, id]) => [`${x},${y}`, id]));
        for (const [x, y, id] of frame.battleTileInventory) {
          assert.equal(placements.get(`${x},${y}`), id, `Missing enhanced dragon battlefield tile at ${x},${y}`);
          battlefieldPatterns.add(id);
        }
      }
      async function checkNewPartyPoses() {
        const placements = frame.combatArt?.filter(([, , id]) => partyArt.has(id)) ?? [];
        if (!placements.length) return;
        await waitFor("the enhanced party sprites in the dragon fight", () => run(`state.sequence === ${frame.sequence} &&
          ${JSON.stringify(placements)}.every(([left, top, id, reflected]) =>
            [...document.querySelectorAll(".combat-sprite")].some(img =>
              img.getAttribute("src") === "/art/" + id && img.naturalWidth === 96 && img.naturalHeight === 96 &&
              parseFloat(img.style.left) === left / 3.2 && parseFloat(img.style.top) === top / 2 &&
              img.style.transform === (reflected ? "scaleX(-1)" : "")))`));
        for (const [, , id] of placements) partyArt.delete(id);
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "dragon-fight-party.png"), Buffer.from(shot.data, "base64"));
      }
      for (const key of ["enter", "enter", ...Array(6).fill("a"), "enter", "enter", "q"]) {
        await advance(key);
        checkBattlefieldPatterns();
        await checkNewPartyPoses();
      }
      assert.deepEqual([...partyArt].filter(id => id !== "combat:party:2:5" && id !== "combat:party:74:88"), [],
        "Expected the four unoccluded enhanced party poses at the opening of the dragon fight");
      const sprite = frame.combatArt.find(([, , id]) => id === "combat:CPIC5.DAX:66");
      assert.ok(sprite);
      const [x, y, , reflected, highlighted, width, height] = sprite;
      assert.equal(highlighted, true);
      assert.equal(width, 48);
      assert.equal(height, 48);
      await waitFor("the selected 4× dragon sprite", () => run(`(() => {
        const img = [...document.querySelectorAll(".combat-sprite")].find(img => img.src.endsWith("CPIC5.DAX:66"));
        return state.sequence === ${frame.sequence} && img?.naturalWidth === 192 && img.naturalHeight === 192 &&
          parseFloat(img.style.left) === ${x / 3.2} && parseFloat(img.style.top) === ${y / 2} &&
          parseFloat(img.style.width) === 15 && parseFloat(img.style.height) === 24 &&
          img.style.transform === ${JSON.stringify(reflected ? "scaleX(-1)" : "")};
      })()`));
      // Hold this Quick Combat prompt while checking the settled art layer
      // and switching modes. The replay sends the next guest input itself.
      await run("quickPollAfter = Infinity");
      await waitFor("the enhanced tiles around the selected dragon", () => run(`(() => {
        if (state.sequence !== ${frame.sequence} || animationFrame) return false;
        const tiles = new Map([...document.querySelectorAll(".battle-tile")].map(img =>
          [img.style.left + "," + img.style.top, img]));
        return ${JSON.stringify(frame.battleTiles)}.every(([x, y, id]) => {
          const tile = tiles.get(x / 3.2 + "%," + y / 2 + "%");
          return tile?.getAttribute("src") === "/art/" + id && tile.naturalWidth === 32 && tile.naturalHeight === 32;
        });
      })()`));
      await switchBothWays();
      const bite = "combat:area:7:CPIC5.DAX:194";
      const partyStrikes = ["combat:party:2:133", "combat:party:69:218", "combat:party:73:209", "combat:party:74:216"];
      const checkedStrikes = new Set();
      await run(`window.dragonReports = [];
        window.dragonFightPartyStrikes = new Set();
        const panel = document.querySelector("#game-text");
        new MutationObserver(() => {
          if (animationFrame && !panel.hidden) window.dragonReports.push(panel.textContent);
          if (animationFrame && animationFrame.durationMs === undefined) {
            const sprites = [...document.querySelectorAll(".combat-sprite")];
            for (const [x, y, id, reflected] of animationFrame.combatArt) {
              if (!${JSON.stringify(partyStrikes)}.includes(id)) continue;
              const shown = sprites.some(img => img.getAttribute("src") === "/art/" + id &&
                img.naturalWidth === 96 && img.naturalHeight === 96 &&
                parseFloat(img.style.left) === x / 3.2 && parseFloat(img.style.top) === y / 2 &&
                img.style.transform === (reflected ? "scaleX(-1)" : ""));
              if (shown) window.dragonFightPartyStrikes.add(id);
            }
          }
        }).observe(panel, { childList: true });`);
      const bitePlacement = () => frame.animation?.flatMap(shot => shot.combatArt ?? []).find(([, , id]) => id === bite);
      for (let turn = 0; turn < 32 && !bitePlacement(); turn++) {
        await advance("q");
        checkBattlefieldPatterns();
        await checkNewPartyPoses();
        const briefPoses = (frame.animation ?? []).filter(shot => shot.durationMs === undefined)
          .flatMap(shot => shot.combatArt.map(([, , id]) => id));
        for (const id of partyStrikes) {
          if (!briefPoses.includes(id) || checkedStrikes.has(id)) continue;
          await waitFor(`the independent strike frame for ${id}`, () => run(`window.dragonFightPartyStrikes.has(${JSON.stringify(id)})`));
          checkedStrikes.add(id);
        }
      }
      assert.deepEqual([...partyArt], [], "Expected all six enhanced party poses during the dragon fight");
      assert.deepEqual([...checkedStrikes].sort(), partyStrikes.toSorted(), "Expected four independent party strike frames before the dragon's bite");
      assert.ok(battlefieldPatterns.size >= 30, "Expected the dragon fight to exercise at least 30 battlefield tile patterns");
      const strike = bitePlacement();
      assert.ok(strike, "Expected a Tyranthraxus bite in the original fight");
      assert.deepEqual(strike.slice(5), [48, 48]);
      await waitFor("the 4× dragon bite at its guest position", () => run(`
        state.sequence === ${frame.sequence} && [...document.querySelectorAll(".combat-sprite")].some(image =>
          image.getAttribute("src") === ${JSON.stringify("/art/" + bite)} && image.naturalWidth === 192 && image.naturalHeight === 192 &&
          parseFloat(image.style.left) === ${strike[0] / 3.2} && parseFloat(image.style.top) === ${strike[1] / 2})`));
      assert.deepEqual(readFileSync(saved), originalSave);
      await waitFor("the dragon's attack and fire damage in the combat panel", () => run(`
        window.dragonReports.some((text, index, reports) =>
          /TYRANITHRAXUSAttacksBAKSHIHittingfor[0-9]+points?ofdamage/i.test(text) &&
          reports.slice(index + 1).some(report => /BAKSHItakes[0-9]+points?ofdamagefromFire/i.test(report)))`));
      console.log("Verified the castle dragon portrait, combat placement, bite animation, and attack and fire damage reports. Captures:", directory);
      console.log(`Verified ${battlefieldPatterns.size} enhanced dragon battlefield tile patterns.`);
    }
  } else if (councilFinale) {
    const text = () => frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
    const castleStatus = () => frame.journal?.leads.find(({ id }) => id === "commission-castle")?.status;
    await advance("j");
    assert.equal(castleStatus(), "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /east from the west gate.*south into City Hall/i);
    await advance("j");
    const patterns = new Set();
    let views = await verifyTiledView(0, patterns);
    for (const key of ["up", "up", "up", "enter", "up", "right", "up", "enter", "enter", "enter",
      "up", "left", "up", "up", "enter"]) {
      await advance(key);
      if (!frame.tileInventory?.length) continue;
      const area = Number(frame.tileInventory[0][2].split(":")[1]);
      assert.ok(area === 0 || area === 8);
      views += await verifyTiledView(area, patterns);
    }
    assert.equal(views, 14);
    assert.ok([...patterns].some(id => id.startsWith("tile:8:")), "The route should reach the City Hall district");
    assert.match(text(), /YOURQUESTISOVER.*TYRANTHRAXUSISDEFEATED.*PHLANISFREE/i);
    const finalePortrait = "portrait:area:8:ecl:9f21:caller:9a4a:HEAD3.DAX:24:BODY3.DAX:32";
    assert.equal(frame.portrait, finalePortrait);
    await waitFor("dedicated Phlan victory illustration", () => run(`state.sequence === ${frame.sequence} &&
      [...document.querySelectorAll(".encounter-portrait")].some(image =>
        image.src.endsWith(${JSON.stringify(finalePortrait)}) && image.naturalWidth === 352 && image.naturalHeight === 352)`));
    await verifyPortraitPanel();
    const clerk = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "council-finale.png"), Buffer.from(clerk.data, "base64"));
    await switchBothWays();
    await advance("enter");
    assert.match(text(), /RECEIVES67500EXPERIENCEPOINTS/i);
    const awardIllustration = "scene-illustration:area:8:ecl:9f3f:caller:9a4a:cue:council-victory-award";
    assert.equal(frame.portrait, awardIllustration);
    await waitFor("the council reward in the Enhanced web font", () => run(`(() => {
      if (state.sequence !== ${frame.sequence}) return false;
      const text = document.querySelector("#game-text");
      return !text.hidden && /receives67500experiencepoints/i.test(text.textContent.replace(/\\s+/g, "")) &&
        [...document.querySelectorAll(".reward-illustration")].some(image =>
          image.getAttribute("src") === ${JSON.stringify("/art/" + awardIllustration)} &&
          image.naturalWidth === 352 && image.naturalHeight === 352 &&
          image.style.left === "31.25%" && image.style.top === "36%") &&
        !document.querySelector(".encounter-portrait, .terrain-tile") &&
        [...document.fonts].some(font => font.family.includes("Game Web Font") && font.status === "loaded");
    })()`));
    const reward = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "council-reward.png"), Buffer.from(reward.data, "base64"));
    await switchBothWays(frame.frame);
    await advance("enter");
    assert.equal(frame.portrait, undefined);
    await waitFor("the reward illustration to clear", () => run(`state.sequence === ${frame.sequence} &&
      !document.querySelector(".reward-illustration")`));
    for (const key of ["enter", "j"]) await advance(key);
    assert.equal(castleStatus(), "reward-pending");
    assert.match(frame.journal.objective.nextStep, /Choose Share.*then Exit/i);
    for (const key of ["j", "s", "e", "enter", "enter", "enter", "enter", "j"]) await advance(key);
    assert.equal(castleStatus(), "turned-in");
    assert.equal(frame.journal.objective.title, "Phlan is free");
    for (const key of ["j", "e", "s", "s", "c"]) await advance(key);
    const completed = resolve(directory, "C.json");
    const savedCastle = JSON.parse(readFileSync(completed, "utf8")).leads.find(({ id }) => id === "commission-castle");
    assert.equal(savedCastle?.status, "turned-in");
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified ${views} enhanced street and City Hall views and saved the council turn-in in Chrome:`, completed);
  } else if (ending) {
    await advance("j");
    assert.equal(frame.journal?.objective.title, "Phlan is free");
    assert.equal(frame.journal?.leads.find(({ id }) => id === "commission-castle")?.status, "turned-in");
    const endingVisible = () => run(`!document.querySelector("#journal").hidden &&
      document.querySelector("#objective strong")?.textContent === "Phlan is free"`);
    await waitFor("the saved campaign ending", endingVisible);
    assert.equal(await run("document.activeElement.id"), "close-journal");
    await switchBothWays();
    assert.ok(await endingVisible());
    const available = frame.journal.leads.find(({ id, status }) =>
      status && status !== "turned-in" && id !== frame.journal.trackedId);
    if (available) {
      const id = JSON.stringify(available.id);
      const sequenceBeforeTrack = frame.sequence;
      await run(`(() => {
        const track = [...document.querySelectorAll('[data-lead-id]')].find(button => button.dataset.leadId === ${id});
        track.focus();
        track.click();
      })()`);
      frame = await waitFor("the selected objective", async () => {
        const next = await latest();
        return next.ready && next.sequence > sequenceBeforeTrack && next.journal?.trackedId === available.id && next;
      });
      await waitFor("focus on the tracked commission", () => run(`document.activeElement.dataset.leadId === ${id} &&
        document.activeElement.getAttribute("aria-disabled") === "true"`));
      await run('document.activeElement.click()');
      assert.deepEqual(await latest(), frame);
      const selectedSequence = frame.sequence;
      await run(`(() => {
        const auto = document.querySelector("#auto-track");
        auto.focus();
        auto.click();
      })()`);
      frame = await waitFor("automatic tracking after the ending", async () => {
        const next = await latest();
        return next.ready && next.sequence > selectedSequence && next.journal &&
          !next.journal.trackedId && next.journal.objective.title === "Phlan is free" && next;
      });
      await waitFor("focus after automatic tracking resumes", () => run(
        'document.querySelector("#auto-track").hidden && document.activeElement.id === "close-journal"'));
      assert.equal(frame.journal.leads.find(({ id }) => id === "commission-castle")?.status, "turned-in");
    }
    await advance("j");
    await waitFor("return to the loaded game", () => run('document.querySelector("#journal").hidden'));
    assert.equal(await run("document.activeElement.id"), "screen");
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified the completed campaign journal and mode switching in Chrome after reloading slot C.");
  } else if (armory || landing) {
    const route = courtyard ? [
      null, "up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "enter",
      "p", "n", ..."shestni", "enter",
      ...Array(5).fill("up"), "enter", "y", "up", "left", "up", "y", "left", "y", "up", "enter",
    ] : landing ? [
      null, "up", "left", "up", "up", "enter", "enter", "end", "enter", "enter", "enter", "enter",
      "right", "right", "up", "up", "left", "up", "up", "right", "up", "up", "left", "up", "up",
      "left", "enter", ...(patrolCombat ? [] : ["p", "n", ..."shestni", "enter"]),
    ] :
      ["up", "up", "up", "right", "up", "left", "up", "left", "up", "up", "up", "right", "up"];
    const seen = new Set();
    let views = 0;
    let patrol = false;
    const crossing = "scene-illustration:area:21:ecl:a872";
    for (const [step, key] of route.entries()) {
      if (key) await advance(key);
      if (armory && step < route.length - 1) {
        if (step === 6 || step === 7) {
          assert.equal(frame.portrait, crossing);
          assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /PASSINGTHROUGHANILLUSIONARYWALL/i);
          await waitFor("the illusory wall illustration", () => run(`state.sequence === ${frame.sequence} &&
            document.querySelector('.encounter-portrait[src="/art/${crossing}"]')?.naturalWidth === 352`));
          await verifyPortraitPanel();
          if (step === 6) await switchBothWays();
        } else {
          assert.equal(frame.portrait, undefined);
        }
      }
      if (landing && !courtyard && step === 9) {
        const parchment = frame.text.map(([, character]) => String.fromCharCode(character)).join("");
        assert.match(parchment, /THELASTPARTISEATENAWAY/i);
      }
      if (landing && frame.encounter && !patrol) {
        assert.deepEqual(frame.encounter, [48, 32, "encounter:SPRIT4.DAX:34:0:0", 40, 80]);
        await waitFor("Sokal patrol artwork", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelector(".encounter-sprite")?.naturalWidth === 160 &&
          document.querySelector(".encounter-sprite")?.naturalHeight === 320`));
        await switchBothWays();
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, "sokal-undead-patrol.png"), Buffer.from(shot.data, "base64"));
        patrol = true;
      }
      if (!frame.tileInventory?.length) continue;
      if (landing && frame.tileInventory.every(([, , , indices]) => /^0+$/.test(indices))) continue;
      views++;
      assert.deepEqual(frame.tiles, frame.tileInventory.map(([x, y, id]) => [x, y, id]), `Step ${step} (${key})`);
      for (const [, , id] of frame.tiles) {
        assert.match(id, /^tile:21:/);
        seen.add(id);
      }
      await waitFor("121 assembled Sokal tiles", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll("#tile-art img:not(.encounter-sprite)").length === 121 &&
        [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      if ((courtyard && step === route.length - 2) ||
          (landing && !courtyard && (step === 0 || step === 21 || step === route.length - 1)) || (!landing && (step === 2 || step === 9))) {
        if (step === (landing ? 0 : 2)) await switchBothWays();
        const shot = await command("Page.captureScreenshot", { format: "png" });
        writeFileSync(resolve(directory, `${routeName}-${step}.png`), Buffer.from(shot.data, "base64"));
      }
    }
    const text = frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, patrolCombat ? /APACKOFUNDEADSUDDENLYAPPEARS/i :
      courtyard ? /ALARGEFORCEOFORCSANDHOBGOBLINSRUSHESYOU/i :
        landing ? /THEUNDEADLEAVE/i : /ONSTANDSAREASHIELD/i);
    if (landing) {
      assert.ok(patrol);
      if (courtyard) {
        const approach = "encounter:area:21:SPRIT4.DAX:6:1:0";
        assert.deepEqual(frame.encounter, [56, 32, approach, 24, 65]);
        await waitFor("the courtyard hobgoblin approach", () => run(`state.sequence === ${frame.sequence} &&
          [...document.querySelectorAll(".encounter-sprite")].some(image =>
            image.getAttribute("src") === ${JSON.stringify("/art/" + approach)} &&
            image.naturalWidth === 96 && image.naturalHeight === 260)`));
      } else if (!patrolCombat) assert.equal(frame.encounter, undefined);
    }
    if (armory) {
      const cache = "scene-illustration:area:21:ecl:ae41:caller:a92a";
      assert.equal(frame.portrait, cache);
      await waitFor("the hidden armory illustration", () => run(`
        document.querySelector('.encounter-portrait[src="/art/${cache}"]')?.naturalWidth === 352`));
      await verifyPortraitPanel();
      await switchBothWays();
      await advance("n");
      assert.notEqual(frame.portrait, cache);
    }
    assert.equal(views, courtyard ? 25 : patrolCombat ? 18 : landing ? 19 : 10);
    assert.equal(seen.size, courtyard ? 56 : landing ? 49 : 12);
    console.log(`Verified ${seen.size} ${routeName} patterns across ${views} views. Captures: ${directory}`);
    if (manualParty) {
      for (const key of ["enter", "enter", "enter"]) await advance(key);
      const brin = () => /BRINHITPOINTS6AC1MACEMOVEVIEWAIMUSEQUICKDONE/i.test(
        frame.text.map(([, character]) => String.fromCharCode(character)).join(""));
      for (let turn = 0; turn < 20 && !brin(); turn++) await advance("space");
      assert.ok(brin(), "Expected Brin's manual combat menu");
      const party = frame.combatArt.find(([, , id, , highlight]) => id === "combat:party:0:0" && highlight);
      assert.deepEqual(party, [80, 80, "combat:party:0:0", true, true]);
      await waitFor("Brin's rendered icon and restored selection frame", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll('.combat-sprite[src="/art/combat:party:0:0"]')]
          .find(image => image.style.left === "25%" && image.style.top === "40%");
        const image = document.querySelector("#screen");
        if (sprite?.naturalWidth !== 96 || !image.complete) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = context.canvas.height = 24;
        context.drawImage(image, 80, 80, 24, 24, 0, 0, 24, 24);
        const color = (x, y) => [...context.getImageData(x, y, 1, 1).data].slice(0, 3).join(",");
        return color(0, 0) === "254,245,221" && color(23, 23) === "87,81,82" &&
          color(10, 6) === "174,166,153";
      })()`));
      await switchBothWays();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "sokal-brin-selected.png"), Buffer.from(shot.data, "base64"));
      for (const key of ["a", "n", "n", "n"]) await advance(key);
      const aim = [...frame.text].sort(([a], [b]) => a - b).map(([, character]) => String.fromCharCode(character)).join("");
      assert.match(aim, /ORCHITPOINTS2AC6/i);
      assert.match(aim, /RANGE=3/i);
      const orc = "combat:area:21:CPIC4.DAX:4:ecl:aed4";
      const target = frame.combatArt.find(([, , id, , highlight]) => id === orc && highlight);
      assert.deepEqual(target, [128, 128, orc, false, true]);
      await waitFor("the enhanced orc and Aim reticle", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll(${JSON.stringify(`.combat-sprite[src="/art/${orc}"]`)})]
          .find(image => image.style.left === "40%" && image.style.top === "64%");
        const image = document.querySelector("#screen");
        if (sprite?.naturalWidth !== 96 || !image.complete) return false;
        const reticle = document.querySelector(".combat-aim-reticle");
        if (reticle?.style.left !== "40%" || reticle.style.top !== "64%" ||
            reticle.nextElementSibling !== sprite) return false;
        const backing = [...document.querySelectorAll(".combat-selection")].find(node =>
          node.style.left === reticle.style.left && node.style.top === reticle.style.top);
        if (backing?.naturalWidth !== 96 || !reticle.classList.contains("combat-aim-reticle-backed") ||
            !(backing.compareDocumentPosition(reticle) & Node.DOCUMENT_POSITION_FOLLOWING)) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.drawImage(image, 131, 136, 1, 1, 0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].join(",") === "254,245,221,255";
      })()`));
      await switchBothWays();
      const aimShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "sokal-orc-aimed.png"), Buffer.from(aimShot.data, "base64"));
      console.log("Verified Brin's selected combat icon and the orc in the Aim reticle in Chrome.");
    } else if (terrainOnly) {
      assert.equal(frame.battleTiles.length, 0);
      for (const key of ["enter", "enter", "enter"]) await advance(key);
      for (let turn = 0; turn < 20 && !frame.battleTiles.length; turn++) await advance("q");
      assert.equal(frame.combatArt.length, 0);
      assert.ok(frame.battleTiles.length > 0);
      await waitFor("masonry without combat sprite artwork", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll(".combat-sprite").length === 0 &&
        document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
        [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32)`));
      await switchBothWays();
      console.log(`Verified ${frame.battleTiles.length} masonry placements without combat sprite artwork.`);
    } else if (patrolCombat || courtyard) {
      const combatId = picture => courtyard ? `combat:area:21:CPIC4.DAX:${picture}:ecl:aed4` : `combat:CPIC4.DAX:${picture}`;
      const pictures = courtyard ? [4, 5, 6] : [34, 35];
      const guards = pictures.map(combatId);
      const attackIds = new Set(pictures.map(picture => combatId(picture + 128)));
      const partyAttacks = patrolCombat ? ["combat:party:0:128", "combat:party:64:192:palette:044645678ccecdef"] : [];
      await run(`(() => {
        window.combatSprites = new Set();
        window.partySpriteSeen = false;
        window.attackSwitch = null;
        let checkingAttack = false;
        new MutationObserver(async () => {
          if (${courtyard} && animationFrame?.battleTiles.length && animationFrame.combatArt.length && !attackSwitch && !checkingAttack) {
            checkingAttack = true;
            const attack = animationFrame;
            const sequence = state.sequence;
            const layer = document.querySelector("#tile-art");
            const screen = document.querySelector("#screen");
            const oldFrame = screen.getAttribute("src");
            document.querySelector("#presentation").click();
            await showScreen();
            const classic = layer.hidden && document.querySelector("#game-text").hidden &&
              screen.getAttribute("src") === "data:image/png;base64," + attack.frame;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
            await showScreen();
            window.attackSwitch = {
              classic,
              enhanced: !layer.hidden && screen.getAttribute("src") === oldFrame &&
                layer.querySelectorAll(".battle-tile").length === attack.battleTiles.length &&
                layer.querySelectorAll(".combat-sprite").length === attack.combatArt.length,
              sameAttack: animationFrame === attack && state.sequence === sequence,
            };
          }
          const party = document.querySelector('.combat-sprite[src="/art/combat:party:0:0"]');
          if (party) {
            const recordParty = () => {
              if (party.naturalWidth === 96 && party.naturalHeight === 96) window.partySpriteSeen = true;
            };
            if (party.complete) recordParty();
            else party.addEventListener("load", recordParty, { once: true });
          }
          for (const image of document.querySelectorAll('.combat-sprite')) {
            const id = image.getAttribute("src")?.slice(5);
            if (!${JSON.stringify([...guards, ...attackIds, ...partyAttacks])}.includes(id)) continue;
            if (${JSON.stringify(partyAttacks)}.includes(id) && !animationFrame?.combatArt.some(([x, y, key, reflected]) =>
              key === id && parseFloat(image.style.left) === x / 3.2 && parseFloat(image.style.top) === y / 2 &&
              image.style.transform === (reflected ? "scaleX(-1)" : ""))) continue;
            const record = () => {
              if (image.naturalWidth === 96 && image.naturalHeight === 96) {
                window.combatSprites.add(id);
              }
            };
            if (image.complete) record();
            else image.addEventListener("load", record, { once: true });
          }
        }).observe(document.querySelector("#tile-art"), { childList: true });
      })()`);
      for (const key of courtyard ? ["enter", "enter", "enter"] : ["c", "enter", "enter", "enter"]) await advance(key);
      for (let turn = 0; courtyard && turn < 20; turn++) {
        const visible = new Set(frame.combatArt.map(([, , id]) => id));
        if (guards.every(id => visible.has(id))) break;
        await advance("q");
      }
      await waitFor("all guard sprites", () => run(
        `${JSON.stringify(guards)}.every(id => combatSprites.has(id))`));
      const guardPositions = frame.combatArt.filter(([, , id]) => id === guards[0]).map(([x, y]) => [x, y]);
      await waitFor("transparent artwork over a cleared guest cell", () => run(`(() => {
        const image = document.querySelector("#screen");
        if (!image.complete || image.naturalWidth !== 320) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = context.canvas.height = 24;
        return ${JSON.stringify(guardPositions)}.some(([x, y]) => {
          context.drawImage(image, x, y, 24, 24, 0, 0, 24, 24);
          return [...context.getImageData(0, 0, 24, 24).data].every(
            (value, index) => value === [15, 14, 18, 255][index % 4]);
        });
      })()`));
      if (courtyard) {
        assert.ok(frame.battleTiles.length > 0);
        await waitFor("all matched 4× battle terrain tiles", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
          [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32 && tile.naturalHeight === 32)`));
      }
      await switchBothWays();
      const shot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, `${routeName}-battle.png`), Buffer.from(shot.data, "base64"));
      if (patrolCombat) {
        await waitFor("the combat frame after its reports", () => run(`state.sequence === ${frame.sequence} && !animationFrame`));
        assert.ok(frame.combatArt.length > 1 && frame.battleTiles.length > 0);
        const result = await command("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async () => {
          const original = state;
          const [x, y, , reflected, selected, width = 24, height = 24] = original.combatArt[0];
          state = { ...original, combatArt: [[x, y, "combat:missing-patrol-test", reflected, selected, width, height],
            ...original.combatArt.slice(1)] };
          try {
            await showScreen();
            const fallback = document.querySelector(".sprite-fallback");
            return fallback?.style.backgroundImage.includes(original.frame) &&
              parseFloat(fallback.style.left) === x / 3.2 && parseFloat(fallback.style.top) === y / 2 &&
              !document.querySelector("#game-text").hidden &&
              document.querySelectorAll(".combat-sprite").length === original.combatArt.length - 1 &&
              document.querySelectorAll(".battle-tile").length === original.battleTiles.length;
          } finally {
            state = original;
            await showScreen();
          }
        })()` });
        assert.equal(result.result.value, true, result.exceptionDetails?.text ?? "A missing combat sprite should preserve the other layers");
      }
      let layeredAttack;
      const strikes = new Set();
      const terrainLayouts = new Set();
      for (let turn = 0; turn < 180 && strikes.size < attackIds.size; turn++) {
        await advance("q");
        if (courtyard && frame.battleTiles.length) {
          terrainLayouts.add(JSON.stringify(frame.battleTiles));
          if (!frame.animation?.length && terrainLayouts.size <= 4) {
            await waitFor("masonry after the combat view changes", () => run(`state.sequence === ${frame.sequence} &&
              document.querySelectorAll(".battle-tile").length === ${frame.battleTiles.length} &&
              [...document.querySelectorAll(".battle-tile")].every(tile => tile.naturalWidth === 32)`));
          }
        }
        for (const view of frame.animation ?? []) {
          if (view.battleTiles.length && view.combatArt.length) layeredAttack ??= view;
          for (const [, , id] of view.combatArt) {
            if (attackIds.has(id)) strikes.add(id);
          }
        }
        if (frame.animation?.length) {
          await waitFor("the captured attack sequence", () => run(
            `state.sequence === ${frame.sequence} && !animationFrame`));
        }
      }
      if (courtyard) {
        assert.ok(terrainLayouts.size >= 4, "Expected the battlefield to scroll");
        assert.ok(await run("window.partySpriteSeen"), "Expected the composed party sprite to render");
        assert.deepEqual(await run("window.attackSwitch"), { classic: true, enhanced: true, sameAttack: true });
        assert.deepEqual(readFileSync(saved), originalSave);
        assert.ok(layeredAttack, "Expected a captured attack with terrain and actors");
        await waitFor("the battle layers to use only the animation frame", () => run(`(async () => {
          const next = state;
          try {
            // The next input frame can already be back in exploration or dialogue.
            state = { ...next,
              portrait: "portrait:PIC2.DAX:0:0:0", tiles: [[24, 24, "tile:unused-during-attack"]] };
            animationFrame = ${JSON.stringify(layeredAttack)};
            await showScreen();
            const layer = document.querySelector("#tile-art");
            const terrain = [...layer.querySelectorAll(".battle-tile")];
            const actors = [...layer.querySelectorAll(".combat-sprite")];
            return !layer.hidden && terrain.length === animationFrame.battleTiles.length &&
              actors.length === animationFrame.combatArt.length &&
              layer.children.length === terrain.length + actors.length &&
              !document.querySelector("#game-text").hidden &&
              terrain.at(-1).nextElementSibling === actors[0];
          } finally {
            state = next;
            animationFrame = undefined;
            showScreen();
          }
        })()`));
      }
      assert.equal(strikes.size, attackIds.size);
      assert.deepEqual([...patrolWallTiles], [], "Expected the Sokal masonry tiles in the scrolling battlefield");
      assert.deepEqual([...patrolCombatSprites], [], "Expected the Sokal battlefield sprites");
      assert.deepEqual(await run("[...combatSprites].sort()"), [...guards, ...attackIds, ...partyAttacks].sort());
      console.log(`Verified ${guards.length} guard and ${strikes.size} strike PNGs in live ${routeName} combat.`);
    }
  } else if (orcs) {
    const route = ["up", "left", "up", "up", "up", "right", "up", "right",
      ...Array(5).fill("up"), "right", "up", "left", "up", "left", "up"];
    const manifest = JSON.parse(readFileSync("upgrades/slums/manifest.json"));
    const junctions = new Set(Object.entries(manifest.assets)
      .filter(([, name]) => /^orc-(door|joint|rubble)-/.test(name)).map(([id]) => id));
    assert.ok(junctions.size > 0);
    for (const [step, key] of route.entries()) {
      await advance(key);
      assert.equal(frame.tiles.length, 121);
      await waitFor("all 121 corridor tiles", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelectorAll("#tile-art img").length === 121 &&
        [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      for (const [, , id] of frame.tiles) junctions.delete(id);
      if (step === 5) await switchBothWays();
    }
    assert.deepEqual([...junctions], []);
    let approach = false;
    for (let step = 0; step < 5; step++) {
      await advance("enter");
      if (!frame.encounter) continue;
      assert.deepEqual(frame.encounter, [48, 32, "encounter:SPRIT2.DAX:4:0:0", 40, 80]);
      await waitFor("the near orc", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-sprite")?.naturalWidth === 160 &&
        document.querySelector(".encounter-sprite")?.naturalHeight === 320`));
      approach = true;
    }
    assert.ok(approach);
    assert.equal(frame.encounter, undefined);
    const guard = "combat:CPIC2.DAX:4";
    assert.ok(frame.combatArt.filter(([, , id]) => id === guard).length >= 3);
    await waitFor("the combat orcs", () => run(`state.sequence === ${frame.sequence} &&
      [...document.querySelectorAll(".combat-sprite")].filter(img => img.naturalWidth === 96).length >= 3`));
    await switchBothWays();
    await run(`(() => {
      window.swingPlacements = [];
      new MutationObserver(() => {
        for (const image of document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:132"]')) {
          const remember = () => window.swingPlacements.push([
            Math.round(parseFloat(image.style.left) * 3.2),
            Math.round(parseFloat(image.style.top) * 2),
            image.naturalWidth, image.naturalHeight,
          ]);
          if (image.complete && image.naturalWidth) remember();
          else image.addEventListener("load", remember, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });
    })()`);
    const positions = new Set();
    const attacks = new Set();
    for (let turn = 0; turn < 15; turn++) {
      for (const [x, y, id] of frame.combatArt) {
        if (id === guard) positions.add(`${x},${y}`);
      }
      await advance("q");
      for (const view of frame.animation ?? []) {
        for (const [x, y, id] of view.combatArt) {
          if (id === "combat:CPIC2.DAX:132") attacks.add(`${x},${y}`);
        }
      }
      if (frame.animation?.length) {
        await waitFor("Chrome to finish the recorded attacks", () => run(
          `state.sequence === ${frame.sequence} && !animationFrame`));
      }
    }
    assert.ok(attacks.size >= 2, "Original combat must draw swings at multiple positions");
    const displayedSwings = await run("window.swingPlacements");
    const displayedPositions = new Set(displayedSwings
      .filter(([, , width, height]) => width === 96 && height === 96).map(([x, y]) => `${x},${y}`));
    assert.ok([...attacks].every((position) => displayedPositions.has(position)),
      "Chrome must display the 4× swing at each original position");
    assert.ok(positions.size > 4, "Guard artwork should follow moving units");
    console.log(`Verified ${route.length} Slums outpost views with guard sprites in ${positions.size} combat positions and swings in ${attacks.size}.`);
  } else {
    let views = 0;
    let cityTiles = 0;
    const tileLayouts = new Set();
    const routeTiles = [];
    let portrait = false;
    let encounter = false;
    const route = [
      "up", "up", "enter", "enter", "up", "up", "up", "up", "enter", "left",
      "up", "up", "up", "up", "up", "enter", ...Array(26).fill("up"), "c", "enter", "m", "down",
    ];
    assert.equal(frame.tiles.length, 121, "Every tile at the city gate needs a replacement");
    await waitFor("the assembled New Phlan gate", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelectorAll("#tile-art img").length === 121 &&
      [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
    const cityGate = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "new-phlan-gate.png"), Buffer.from(cityGate.data, "base64"));
    for (const key of route) {
      await advance(key);
      if (frame.encounter && !encounter) {
        assert.equal(frame.encounter[2], "encounter:SPRIT2.DAX:0:0:0");
        await waitFor("the near encounter sprite", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
        encounter = true;
      }
      if (frame.portrait && !portrait) {
        assert.equal(frame.portrait, "portrait:PIC2.DAX:0:0:0");
        assert.equal(frame.tiles.length, 0);
        await waitFor("the kobold portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
        await switchBothWays();
        portrait = true;
      }
      if (frame.tileInventory?.[0]?.[2].startsWith("tile:0:") && frame.tiles.length) {
        cityTiles += frame.tiles.length;
        await waitFor("New Phlan entrance tiles", () => run(`state.sequence === ${frame.sequence} &&
          document.querySelectorAll("#tile-art img").length === ${frame.tiles.length} &&
          [...document.querySelectorAll("#tile-art img")].every(img => img.naturalWidth === 32 && img.naturalHeight === 32)`));
      }
      if (!frame.tileInventory?.[0]?.[2].startsWith("tile:20:")) continue;
      routeTiles.push(frame.tileInventory);
      assert.equal(frame.tiles.length, 121);
      assert.deepEqual(frame.tiles, frame.tileInventory.map(([x, y, id]) => [x, y, id]));
      tileLayouts.add(JSON.stringify(frame.tiles));
      await waitFor("121 individual tiles", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const tiles = [...document.querySelectorAll("#tile-art img:not(.encounter-sprite)")];
        const expected = ${JSON.stringify(frame.tiles)};
        return tiles.length === expected.length && tiles.every((tile, index) => {
          const [x, y, id] = expected[index];
          return tile.naturalWidth === 32 && tile.naturalHeight === 32 &&
            tile.getAttribute("src") === "/art/" + id &&
            Math.abs(parseFloat(tile.style.left) - x / 3.2) < 0.001 &&
            Math.abs(parseFloat(tile.style.top) - y / 2) < 0.001;
        });
      })()`));
      if (++views !== 3) continue;

      await waitFor("the loaded web font", () => run(`Array.from(document.fonts)
        .some(font => font.family.includes("Game Web Font") && font.status === "loaded")`));
      for (const width of [430, 1100]) {
        await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
        assert.ok(await run(`(() => {
          const screen = document.querySelector("#screen").getBoundingClientRect();
          const tile = document.querySelector("#tile-art img");
          const rect = tile.getBoundingClientRect();
          const glyph = document.querySelector("#game-text span");
          return getComputedStyle(tile).imageRendering === "pixelated" &&
            Math.abs(rect.width - screen.width * .025) < 1 && Math.abs(rect.height - screen.height * .04) < 1 &&
            Math.abs(rect.left - screen.left - screen.width * .075) < 1 &&
            Math.abs(rect.top - screen.top - screen.height * .12) < 1 &&
            getComputedStyle(glyph).fontFamily.includes("Game Web Font");
        })()`), `Overlay alignment and web font at ${width}px`);
        await switchBothWays();
      }
      await advance("j");
      assert.ok(frame.journal);
      await waitFor("the journal", () => run('!document.querySelector("#journal").hidden'));
      await run('document.querySelector("#close-journal").focus()');
      await switchBothWays();
      assert.equal(await run("document.activeElement.id"), "close-journal");
      await advance("j");
    }

    assert.ok(encounter && portrait, "The kobold encounter and dialogue must both render");
    assert.ok(tileLayouts.size > 1, "Walking and turning must change the assembled view");
    assert.equal(frame.tiles.length, 0);
    const menu = frame.text.filter(([cell]) => cell >= 960).sort(([a], [b]) => a - b)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(menu, /move|attack|aim|quick/i);
    const menuCells = frame.text.filter(([cell]) => cell >= 960);
    const aim = menuCells.find(([, character]) => character === 65);
    assert.equal(aim?.[2], 15, "Aim must have its original highlighted shortcut");
    assert.deepEqual(menuCells.find(([cell]) => cell === aim[0] + 1), [aim[0] + 1, 105, 10],
      "Aim's other letters must use the original normal menu color");
    const menuColors = () => run(`(() => {
      if (state.sequence !== ${frame.sequence} || document.querySelector("#game-text").hidden) return false;
      const cells = [...document.querySelectorAll("#game-text span")].filter(glyph => parseFloat(glyph.style.top) === 96);
      return cells.length === ${menuCells.length} && ${JSON.stringify(menuCells)}.every(([cell, char, color]) => cells.some(glyph =>
        Math.abs(parseFloat(glyph.style.left) - (cell % 40) * 2.5) < 0.01 && glyph.textContent === String.fromCharCode(char) &&
        getComputedStyle(glyph).color === "rgb(" + state.textColors[color].join(", ") + ")"));
    })()`);
    const koboldPlacements = frame.combatArt.filter(([, , id]) => id === "combat:CPIC2.DAX:0");
    assert.ok(koboldPlacements.some((placement) => placement[3]) && koboldPlacements.some((placement) => !placement[3]));
    await waitFor("the mirrored 4× combat sprite", () => run(`[...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:0"]')]
      .some(image => image.naturalWidth === 96 && image.style.transform === "scaleX(-1)")`));
    for (const width of [430, 1100]) {
      await command("Emulation.setDeviceMetricsOverride", { width, height: 900, deviceScaleFactor: 1, mobile: false });
      await waitFor(`kobold combat artwork aligned at ${width}px`, () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const screen = document.querySelector("#screen").getBoundingClientRect();
        const sprites = [...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:0"]')];
        const placements = ${JSON.stringify(koboldPlacements)};
        return sprites.length === placements.length && placements.every(([x, y, , reflected]) => sprites.some(image => {
          const rect = image.getBoundingClientRect();
          return image.naturalWidth === 96 && image.naturalHeight === 96 &&
            Math.abs(rect.left - screen.left - x * screen.width / 320) < 1 &&
            Math.abs(rect.top - screen.top - y * screen.height / 200) < 1 &&
            Math.abs(rect.width - 24 * screen.width / 320) < 1 &&
            Math.abs(rect.height - 24 * screen.height / 200) < 1 &&
            (image.style.transform === "scaleX(-1)") === reflected;
        }));
      })()`));
      await switchBothWays();
      await waitFor(`original menu colors at ${width}px`, menuColors);
    }
    await waitFor("Chrome to display the final combat frame", () => run(`state.ready && state.sequence === ${frame.sequence}`));
    assert.deepEqual(await run(`(() => {
      const live = state;
      const screen = document.querySelector("#screen");
      const layer = document.querySelector("#tile-art");
      try {
        state = { ...live };
        showScreen();
        layer.querySelector(".combat-sprite").dispatchEvent(new Event("error"));
        const restoresGuest = layer.hidden && document.querySelector("#game-text").hidden &&
          screen.getAttribute("src") === "data:image/png;base64," + live.frame;
        state = { ...live };
        showScreen();
        return { restoresGuest, resumesEnhancements: !layer.hidden &&
          Boolean(layer.querySelector(".combat-sprite")) };
      } finally {
        state = live;
        showScreen();
      }
    })()`), { restoresGuest: true, resumesEnhancements: true });
    await command("Input.dispatchKeyEvent", { type: "keyDown", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await command("Input.dispatchKeyEvent", { type: "keyUp", modifiers: 1, code: "KeyQ", key: "q", windowsVirtualKeyCode: 81 });
    await waitFor("the guest frame after Alt+Q", async () => {
      const state = await latest();
      return state.ready && state.sequence > frame.sequence;
    });
    assert.ok(cityTiles > 0, "The New Phlan entrance must render enhanced tiles");
    console.log(`Verified ${cityTiles} New Phlan tile placements and ${views} Slums views and state-preserving switches in exploration, journal, dialogue, and combat.`);
    const trace = resolve(directory, "slums-tiles.jsonl");
    writeFileSync(trace, routeTiles.map((tiles) => JSON.stringify(tiles)).join("\n") + "\n");
    console.log("Slums artwork trace:", trace);
  }
  if (environmentTrace && existsSync(environmentTrace)) console.log("Environment tile trace:", environmentTrace);
  if (battleFrame) console.log(`Battlefield artwork trace (${battleFrame} frames):`, battleTrace);
} finally {
  socket?.close();
  chrome.kill();
  server.kill();
}
