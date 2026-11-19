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
const alHyam = routeName === "valjevo-al-hyam";
const captiveHedge = routeName === "valjevo-cadorna-hedge";
const captiveReload = routeName === "valjevo-cadorna-reload";
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
const harborWatchApproach = ["e", "e", "r", "h", ...Array(8).fill("i"), "r", "enter"];
const harborWatchBattle = [...harborWatchApproach, "s", "enter", "enter"];
const encounterRoutes = new Map([
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
    dialogue: { key: "enter", portrait: "portrait:area:20:PIC2.DAX:6:0:0", prompt: /SOMEHOBGOBLINSAREARGUINGOVERAPILEOFGOLD|YOUINTRUDEONAGATHERINGOFMONSTERLEADERS/i },
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
      inputs: ["t", "n", "a"], placement: [56, 32, "encounter:area:20:SPRIT2.DAX:24:1:0", 24, 65],
    }],
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
    placement: [48, 32, "encounter:area:11:SPRIT3.DAX:15:0:0", 40, 73],
  }],
  ["new-phlan-arena-master-approach", {
    slot: "A",
    inputs: arenaApproach,
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
    placement: [48, 32, "encounter:area:23:SPRIT7.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:23:PIC7.DAX:57:0:0", prompt: /POKINGAROUNDINTHEVATS/i },
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
    placement: [32, 32, "encounter:area:27:SPRIT8.DAX:59:0:0", 80, 80],
    terrain: { area: 27, views: 3, patterns: 15 },
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:59:0:0", prompt: /FOURGIANTLIZARDSANDTWOMINOTAURS/i },
  }],
  ["wild-cave-lizard-charge", {
    slot: "B", inputs: ["up", "enter"],
    placement: [32, 32, "encounter:area:27:SPRIT8.DAX:59:0:0", 80, 80],
    terrain: { area: 27, views: 3, patterns: 17 },
    approachSequence: [
      [48, 32, "encounter:area:27:SPRIT8.DAX:59:2:0", 40, 57],
      [48, 32, "encounter:area:27:SPRIT8.DAX:59:1:0", 48, 65],
      [32, 32, "encounter:area:27:SPRIT8.DAX:59:0:0", 80, 80],
    ],
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:59:0:0", prompt: /FOURGIANTLIZARDSRUNUPANDATTACKTHEPARTY/i },
  }],
  ["wild-cave-gnoll-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [40, 32, "encounter:area:27:SPRIT8.DAX:73:0:0", 56, 80],
    terrain: { area: 27, views: 3, patterns: 17 },
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:73:0:0", prompt: /SOMEGNOLLSANDTROLLS/i },
  }],
  ["wild-cave-thri-kreen-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:25:SPRIT6.DAX:118:0:0", 32, 73],
    dialogue: { key: "enter", portrait: "portrait:area:25:PIC6.DAX:118:0:0", prompt: /FOURTHRI.KREENWARRIORS/i },
  }],
  ["wild-cave-boar-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:25:SPRIT6.DAX:120:0:0", 40, 80],
    dialogue: { key: "enter", portrait: "portrait:area:25:PIC6.DAX:120:0:0", prompt: /THREELARGEWILDBOARS/i },
  }],
  ["lizard-wilds-displacer-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [40, 32, "encounter:area:26:SPRIT7.DAX:68:0:0", 64, 80],
    dialogue: { key: "enter", portrait: "portrait:area:26:PIC7.DAX:68:0:0", prompt: /AMBUSHEDBYTWODISPLACERBEASTS/i },
  }],
  ["lizard-wilds-stirge-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:26:SPRIT7.DAX:61:0:0", 40, 73],
    dialogue: { key: "enter", portrait: "portrait:area:26:PIC7.DAX:61:0:0", prompt: /ASWARMOFSTIRGESSWOOPSDOWN/i },
  }],
  ["old-phlan-lizard-patrol-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:29:SPRIT8.DAX:57:0:0", 48, 80],
    dialogue: { key: "enter", portrait: "portrait:area:29:PIC8.DAX:57:0:0", prompt: /ALIZARDMANLEADSAPACKOFGIANTLIZARDS/i },
  }],
  ["bane-ogre-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:31:SPRIT1.DAX:8:0:0", 40, 73],
    dialogue: { key: "enter", portrait: "portrait:area:31:PIC1.DAX:8:0:0", prompt: /SIXORCSLEDBYALARGEOGRE/i },
  }],
  ["valhingen-zombie-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:35:0:0", 32, 80],
    dialogue: { key: "enter", portrait: "portrait:area:10:PIC4.DAX:35:0:0", prompt: /ZOMBIESSHUFFLEDOWNTHESTAIRS/i },
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
    placement: [48, 32, "encounter:area:2:SPRIT4.DAX:6:0:0", 48, 80],
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
const illustrationRoutes = new Map([
  ["slums-feeding-kobolds", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:20:PIC2.DAX:0:0:0", prompt: /YOUINTERRUPTSOMEFEEDINGKOBOLDS/i,
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
    continuation: { inputs: ["enter"], prompt: /TEMPLEOFTYR/i, clearsPortrait: true },
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
    portrait: "portrait:area:0:HEAD3.DAX:9:BODY3.DAX:7", prompt: /GO.*STAY/i,
  }],
  ["lizard-wilds-kobold-prisoners", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:0:0:0", prompt: /RELEASEUS/i,
    continuation: { inputs: ["r"], prompt: /WATCHOUTFORTHEMUTANTLIZARDMEN/i, clearsPortrait: true },
    journalLead: "lizard-wilds-mutant-warning",
  }],
  ["lizard-wilds-pool-dialogue", {
    slot: "A", inputs: ["up", "a", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:57:0:0", prompt: /LIZARDMENSWIMMINGINTHEPOOL/i,
  }],
  ["wild-cave-giant-snake-dialogue", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:25:PIC6.DAX:60:0:0", prompt: /AGIANTSNAKEFALLSONTOPOFTHEPARTY/i,
  }],
  ["wild-cave-boar-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:25:PIC6.DAX:120:0:0", prompt: /THREELARGEWILDBOARS/i,
  }],
  ["wild-cave-giant-lizard-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:27:PIC8.DAX:59:0:0", prompt: /FOURGIANTLIZARDSANDTWOMINOTAURS/i,
  }],
  ["lizard-wilds-stirge-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:61:0:0", prompt: /ASWARMOFSTIRGESSWOOPSDOWN/i,
  }],
  ["wild-cave-thri-kreen-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:25:PIC6.DAX:118:0:0", prompt: /FOURTHRI.KREENWARRIORS/i,
  }],
  ["wild-cave-gnoll-dialogue", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:27:PIC8.DAX:73:0:0", prompt: /SOMEGNOLLSANDTROLLS/i,
  }],
  ["kuto-norris-dialogue", {
    slot: "J", inputs: ["up", "enter", "enter", "enter"],
    portrait: "portrait:HEAD8.DAX:10:BODY8.DAX:6", prompt: /SURRENDER.*FIGHT/i,
  }],
  ["lizard-wilds-displacer-dialogue", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:26:PIC7.DAX:68:0:0", prompt: /AMBUSHEDBYTWODISPLACERBEASTS/i,
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
  ["valjevo-messenger-dialogue", {
    slot: "B", inputs: ["up", "b", "up", "enter", "enter", "p", "n"],
    portrait: "portrait:HEAD5.DAX:70:BODY5.DAX:8", prompt: /IJUSTGOTBACKFROMTHENORTH/i,
  }],
  ["sokal-undead-patrol-dialogue", {
    slot: "C", inputs: [...Array(5).fill("up"), "enter", "enter"],
    portrait: "portrait:area:21:PIC4.DAX:34:0:0", prompt: /APACKOFUNDEADSUDDENLYAPPEARS/i,
  }],
  ["valhingen-zombie-stairs", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:10:PIC4.DAX:35:0:0", prompt: /ZOMBIESSHUFFLEDOWNTHESTAIRS/i,
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
  ["slums-grain-sack-ambush", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:20:PIC2.DAX:31:0:0", prompt: /SOMEMONSTERSARETOSSINGASACKOFGRAIN/i,
  }],
  ["bane-ogre-led-guards", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:31:PIC1.DAX:8:0:0", prompt: /SIXORCSLEDBYALARGEOGRE/i,
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
    portrait: "portrait:HEAD3.DAX:71:BODY3.DAX:8", prompt: /ANAWFULSMELLINGCLOUDOFGASFORMS/i,
  }],
  ["north-gate-jail-thugs", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:area:14:HEAD3.DAX:32:BODY3.DAX:8", prompt: /CONVERTEDTOAJAIL/i,
  }],
  ["north-gate-thieves-guild", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:44:BODY3.DAX:8", prompt: /AMBUSHEDBYSOMETHIEVES/i,
  }],
  ["new-phlan-jeweler", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:63:BODY3.DAX:34", prompt: /SHOPKEEPEROFFERSJEWELRYFORSALE/i,
  }],
  ["new-phlan-silver-shop", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:63:BODY3.DAX:34", prompt: /THESHOPSELLSSILVERITEMS/i,
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
  ["zhentil-quarters-guard-dialogue", {
    slot: "A", inputs: ["up", "enter"],
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
const castleRecords = routeName === "valjevo-records" || castleRecordsDecline;
const castleScribe = routeName === "valjevo-records-scribe";
const castleReports = routeName === "valjevo-scriptorium-reports";
const castleReportsReload = routeName === "valjevo-scriptorium-reports-reload";
const genheerisOrders = routeName === "valjevo-genheeris-orders";
const genheeris = routeName === "valjevo-genheeris-bargain" || genheerisOrders;
const norrisSurrender = routeName === "kuto-norris-surrender";
const mendorStacks = routeName === "mendor-library-stacks";
const princessFatima = routeName === "kobold-princess-fatima";
const koboldEscort = routeName === "kobold-cave-escort";
const koboldGuide = routeName === "kobold-cave-guide" || koboldEscort;
const restalGuide = routeName === "textile-restal";
const sokalScout = routeName === "sokal-elven-scout" || routeName === "sokal-elven-scout-search";
const combatPoseRoutes = new Map([
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
  ["buccaneer-pen-guard-combat", {
    slot: "A", stand: "combat:area:1:CPIC6.DAX:11:ecl:a391", strike: "combat:area:1:CPIC6.DAX:139:ecl:a391",
    width: 96, height: 96, readyPrompt: /HITPOINTS4AC10/i, strikeReflected: true,
    strikeReport: /ATTACKSCORAANDMISSES/i,
    inputs: ["up", "up", "enter", "enter", "a", "enter", "enter"], strikeInputs: ["enter"],
  }],
  ["slums-orc-home-leader-combat", {
    slot: "B", stand: "combat:area:20:CPIC2.DAX:5:ecl:aa02", strike: "combat:area:20:CPIC2.DAX:133:ecl:aa02",
    width: 96, height: 96, readyPrompt: /THRENDERGRONEHITPOINTS11AC1FLAIL/i, strikeReflected: true,
    strikeReport: /ORCLEADERATTACKSTHRENDERGRONEANDMISSES/i,
    inputs: ["up", ...Array(5).fill("enter")],
    strikeInputs: [...Array(4).fill("enter"), ...Array(27).fill("q")],
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
    slot: "A", stand: "combat:area:0:CPIC3.DAX:16:ecl:aac7", width: 96, height: 96,
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
    slot: "B", stand: "combat:area:7:CPIC5.DAX:11", strike: "combat:area:7:CPIC5.DAX:139", width: 96, height: 96,
    inputs: ["up", ...Array(4).fill("enter"), "c", ...Array(3).fill("enter"), ...Array(3).fill("q")],
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
  ["phlan-outskirts-north", { direction: "down", prompt: /NORTHEDGEOFTHECITY/i, menu: /CITY.*GRAVEYARD.*LEAVE/i }],
  ["phlan-outskirts-east", { direction: "up", prompt: /EASTERNEDGEOFTHECITY/i, menu: /NORTH.*SOUTH.*BOAT.*LEAVE/i }],
  ["phlan-outskirts-west", { direction: "down", prompt: /WESTERNEDGEOFTHECITY/i, menu: /NORTH.*SOUTH.*LEAVE/i }],
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
      [56, 32, "encounter:area:17:SPRIT7.DAX:11:1:0", 24, 65],
      [40, 32, "encounter:area:17:SPRIT7.DAX:11:0:0", 48, 80],
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
const routes = ["new-phlan-building-exit", "new-phlan-arena-manual-report", "new-phlan-arena-quick", "new-phlan-rolf-approach", "lizardfolk-battle-wall", "kobolds", "orcs", "goblins", "armorer", "fighter-trainer", "phlan-harbor-sokal", "phlan-harbor-routes", "phlan-priestess-joy", "phlan-priest-tyr", "phlan-priest-tempus", "sokal-smithy", "sokal-elven-scout", "sokal-elven-scout-search", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard", "podal-plaza", "podal-infirmary", "podal-shrine", "podal-shrine-return", "braccio-dirten-briefing", "bane-gate", "bane-goblins", "bane-symbol", "bane-altar", "bane-hidden-treasure", "kobold-cave", "kobold-cave-efreeti-dialogue", "kobold-cave-wyvern-dialogue", "kobold-cave-guide", "kobold-princess-fatima", "kuto-norris-surrender", "mendor-library-stacks", "slums-fortune", "slums-potion-booth", "old-phlan-seer", "old-phlan-seer-reload", "nomad-camp-approach", "nomad-camp-sentries", "nomad-headman", "nomad-headman-stay", "diogenes-cave", "diogenes-advice", "textile-altar", "textile-ogre", "textile-restal", ...environmentRoutes.keys(), ...ferryRoutes.keys(), ...outskirtsRoutes.keys(), ...conjurerPrompts.keys(), ...encounterRoutes.keys(), ...illustrationRoutes.keys(), "graveyard-mystic", ...combatPoseRoutes.keys(), "graveyard-vampire", "graveyard-wolves", "valhingen-mummy-sarcophagi", "stojanow-briefing", "stojanow-trader", "stojanow-bugbears", "cadorna-envoy-briefing", "zhentil-envoy", "zhentil-trespass", "zhentil-escape", "zhentil-reward", "zhentil-return", "river-approach", "river-passage", "river-fountain", "pyramid-lizardfolk-vats", "river-pumping", "river-exit", "river-return", "river-reward", "yarash-combat", "swamp-approach", "swamp-elder", "swamp-elder-decline", "swamp-reward", "bivant-reward", "mendor-records-reward", "nomad-reward", "bane-reward", "buccaneer-approach", "assault-briefing", "castle-halls", "valjevo-tower-save", "valjevo-tower-reload", "valjevo-dungeon-save", "valjevo-dungeon-reload", "valjevo-false-throne", "valjevo-al-hyam", "valjevo-cadorna-captive", "valjevo-cadorna-hedge", "valjevo-cadorna-reload", "valjevo-cadorna-killed", "valjevo-cadorna-alarm", "valjevo-dungeon-kitchen", "valjevo-scriptorium-password", "valjevo-scriptorium-authority", "valjevo-maze-watch", "valjevo-giant-patrol", "valjevo-hill-giant-dialogue", "valjevo-dungeon-sentry", "valjevo-bane-chaplain", "valjevo-forge-smith", "valjevo-forge-authorization", "valjevo-records", "valjevo-records-decline", "valjevo-records-scribe", "valjevo-scriptorium-reports", "valjevo-scriptorium-reports-reload", "valjevo-genheeris-bargain", "valjevo-genheeris-orders", "castle-dragon", "castle-ending"];
routes.push("new-phlan-council-reward-reload", "slums-mage-wand", "nomad-headman-rest-reload", "nomad-headman-raid");
routes.push("textile-return-art");
routes.push("stojanow-wall-warning", "stojanow-wall-warning-reload");
routes.push("kobold-cave-escort", "kobold-king-door", "kobold-king-door-reload");
routes.push("kobold-king-fall", "kobold-king-fall-reload", "kobold-king-return-throne", "kobold-king-leave-caves", "kobold-king-reward");
routes.push("kobold-king-return-council", "kobold-king-return-council-save-pier", "kobold-king-return-council-reload");
routes.push("kovel-guild-files", "kovel-jail-enemy-turn", "kovel-castle-map-nw", "kovel-castle-map-ne", "kovel-castle-map-nw-reload", "kovel-castle-map-ne-reload");
routes.push("kovel-chase", "kovel-chase-east", "kovel-chase-east-reload", "kovel-chase-attack", "kovel-chase-decline");
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
const councilReward = {
  "zhentil-reward": ["commission-zhentil", /CADORNAWASWAGERINGYOURRETURN/i],
  "river-reward": ["commission-river", /CLEARINGOFTHESTOJONOWRIVER/i],
  "swamp-reward": ["commission-lizardmen", /LIZARDMENMENACEHASGREATLYIMPROVED/i],
  "bivant-reward": ["commission-rescue", /BIVANTWASDELIGHTEDWITHTHECHILD.SRESCUE/i],
  "kobold-king-reward": ["commission-kobolds", /THISLOSSOFTHEKOBOLDFORCESWILLBEAMAJORBLOW/i],
  "nomad-reward": ["commission-nomads", /WEWEREMUCHRELIEVEDBYTHENEWSYOUBRINGFROMTHENOMADCAMP/i],
  "bane-reward": ["commission-bane", /YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE/i],
}[routeName];
const envoyReturn = routeName === "zhentil-return";
const riverApproach = routeName === "river-approach";
const riverPassage = routeName === "river-passage";
const riverFountain = routeName === "river-fountain";
const riverExit = routeName === "river-exit";
const riverReturn = routeName === "river-return";
const koboldReturn = routeName.startsWith("kobold-king-return-council");
const koboldFerrySave = routeName === "kobold-king-return-council-save-pier";
const koboldFerryReload = routeName === "kobold-king-return-council-reload";
const riverPumping = routeName === "river-pumping";
const stojanow = routeName === "stojanow-briefing";
const trader = routeName === "stojanow-trader";
const altar = routeName === "textile-altar";
const plaza = routeName === "podal-plaza";
const baneGate = routeName === "bane-gate";
const baneGoblins = routeName === "bane-goblins";
const baneSymbol = routeName === "bane-symbol";
const baneAltar = routeName === "bane-altar";
const koboldCave = routeName === "kobold-cave";
const infirmary = routeName === "podal-infirmary";
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
assert.ok(!option || (courtyard && (terrainOnly || manualParty)) || repeatStampede || classicPortrait || ogreApproachOnly || councilFinale, "Option does not apply to this route");
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const slot = environment?.slot ?? ferry?.slot ?? encounterRoute?.slot ?? illustration?.slot ?? combatPose?.slot ?? (landing || norrisSurrender ? "J" : armory ? "D" : altar || plaza || infirmary || shrine || shrineReturn ? "I" : ogre ? "H" : dragon || halls || towerReload || dungeonSave || dungeonReload || falseTyranthraxus || alHyam || captiveCadorna || captiveReload || dungeonKitchen || scriptorium || mazeWatch || giantPatrol || routeName === "valjevo-hill-giant-dialogue" || dungeonSentry || castleChaplain || forgeSmith || castleRecords || castleScribe || castleReports || castleReportsReload || genheeris || assault || mystic || stojanow || trader || koboldCave || koboldGuide || princessFatima || mendorStacks || routeName === "slums-fortune" || routeName === "slums-potion-booth" || routeName.startsWith("old-phlan-seer") ? "B" : orcs || ending || smithy || sokalScout || restalGuide ? "C" : "A");
const koboldKingDoor = routeName.startsWith("kobold-king-door");
const koboldThroneReturn = routeName === "kobold-king-return-throne";
const koboldCaveExit = routeName === "kobold-king-leave-caves";
const koboldKingFall = routeName.startsWith("kobold-king-fall") || koboldThroneReturn || koboldCaveExit;
const saveSlot = routeName === "textile-return-art" || councilFinale ? "D" :
  mageWand || koboldKingDoor || koboldKingFall || koboldReturn ||
    ["stojanow-wall-warning-reload", "kovel-chase-east-reload"].includes(routeName) ? "B" : slot;
const boot = { A: "1e61", B: "3062", C: "2e63", D: "2064", H: "2368", I: "1769", J: "246a" }[saveSlot];
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

async function waitFor(description, read, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  do {
    try {
      const value = await read();
      if (value) return value;
    } catch (error) {
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
  const latest = () => fetch(origin + "/state").then((response) => response.json());
  let frame = await waitFor("the loaded party", async () => {
    const state = await latest();
    return state.ready && state;
  });
  await command("Page.navigate", { url: origin });
  await waitFor("the game display", () => run('document.querySelector("#screen")?.naturalWidth === 320'));
  if (routeName === "slums-mage-orc-ready" || routeName === "slums-mage-orc-leader") {
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

  async function verifyPortraitPanel() {
    assert.ok(await run(`(() => {
      const layer = document.querySelector("#tile-art").getBoundingClientRect();
      const portrait = document.querySelector(".encounter-portrait").getBoundingClientRect();
      return Math.abs(portrait.left - layer.left - layer.width * 8 / 320) < 1 &&
        Math.abs(portrait.top - layer.top - layer.height * 8 / 200) < 1 &&
        Math.abs(portrait.width - layer.width * 120 / 320) < 1 &&
        Math.abs(portrait.height - layer.height * 120 / 200) < 1;
    })()`), "Enhanced portrait should fill the outer picture panel");
  }

  async function switchBothWays() {
    const displayGeometry = () => run(`(() => {
      const display = document.querySelector("#screen");
      const { width, height } = display.getBoundingClientRect();
      return { width, height, native: [display.naturalWidth, display.naturalHeight] };
    })()`);
    const before = await latest();
    await run('document.querySelector("#presentation").click()');
    await waitFor("classic presentation", () => run('document.querySelector("#game-text").hidden && document.querySelector("#tile-art").hidden'));
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
  function observeApproach(approachSequence) {
    return run(`(() => {
      window.observedApproach = new Set();
      const layer = document.querySelector("#tile-art");
      function recordApproach() {
        const img = layer.querySelector(".encounter-sprite");
        if (!img || layer.querySelectorAll(".terrain-tile").length !== 121) return;
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

  if (routeName === "new-phlan-council-reward-reload") {
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
    for (let stop = 0; stop < 7; stop++) {
      await advance("enter");
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
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:57:BODY3.DAX:1");
    assert.equal(frame.classicPortrait, false);
    await waitFor("the enhanced council guard", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
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
      assert.deepEqual(readFileSync(saved), originalSave);
      console.log("Verified the player-directed combat report in Chrome.");
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
    const phlanExit = /^new-phlan-(?:south-shop|west-shop|training|tavern-back)-exit$/.test(routeName);
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
      if (phlanExit && (key === "n" || exitPauseTiles)) {
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
      await advance("j");
      for (const key of ["right", "up", "right", ...Array(6).fill("up"), "j"]) await advance(key);
      assert.ok(hasLead("rescue-escape-guards"));
      assert.ok(!hasLead("rescue-escape-alarm"));
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
      assert.deepEqual(await run("[...window.observedApproach]"), environment.approachSequence.map(([, , id]) => id));
      const sentry = "encounter:area:17:SPRIT7.DAX:11:0:0";
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
      assert.equal(frame.portrait, "portrait:HEAD7.DAX:74:BODY7.DAX:30");
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
    const approachSequence = encounterRoute.approachSequence;
    if (approachSequence) await observeApproach(approachSequence);
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
    await verifyApproach(encounterRoute.placement);
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
    if (encounterRoute.dialogue) {
      const { key, keys = [key], portrait, prompt } = encounterRoute.dialogue;
      for (const input of keys) await advance(input);
      assert.equal(frame.encounter, undefined);
      assert.equal(frame.portrait, portrait);
      const text = frame.text.toSorted(([left], [right]) => left - right)
        .map(([, character]) => String.fromCharCode(character)).join("");
      assert.match(text, prompt);
      await waitFor("the enhanced encounter dialogue", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
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
    }
    console.log(`Verified ${routeName} source frame, screen anchor, and mode switching in Chrome.`);
  } else if (routeName === "lizardfolk-battle-wall") {
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
      journalLead, excluded, readyPrompt } = combatPose;
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
    if (strikeInputs.length) await run(`window.strikeLoaded = false;
      new MutationObserver(() => {
        for (const image of document.querySelectorAll(".combat-sprite")) {
          if (!image.src.endsWith(${JSON.stringify(strike)})) continue;
          const check = () => {
            if (image.naturalWidth === ${width} && image.naturalHeight === ${height} &&
                (${strikeReflected === undefined} || (image.style.transform === "scaleX(-1)") === ${strikeReflected ?? false})) {
              window.strikeLoaded = true;
            }
          };
          check();
          image.addEventListener("load", check, { once: true });
        }
      }).observe(document.querySelector("#tile-art"), { childList: true });`);
    for (const key of inputs) {
      await advance(key);
      verifyCombatScope();
    }
    if (readyPrompt) assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), readyPrompt);
    assert.ok(frame.combatArt?.some(([, , id, , selected]) => id === stand && (selected || readyPrompt !== undefined)),
      `Expected selected ${stand}. Combat placements: ${JSON.stringify(frame.combatArt)}. ` +
      `Guest text: ${frame.text.map(([, character]) => String.fromCharCode(character)).join("")}`);
    await waitFor("the selected combat sprite", () => run(`state.sequence === ${frame.sequence} &&
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
      assert.ok(frame.animation?.some(({ combatArt, text }) =>
        combatArt?.some(([, , id, reflected]) =>
          id === strike && (strikeReflected === undefined || reflected === strikeReflected)) &&
        (!strikeReport || strikeReport.test(text.map(([, char]) => String.fromCharCode(char)).join("")))));
      await waitFor("the enhanced combat strike", () => run("window.strikeLoaded"));
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
    for (const key of [outskirts.direction, "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.equal(frame.portrait, "portrait:PIC7.DAX:40:0:0");
    assert.match(text, outskirts.prompt);
    assert.match(text, outskirts.menu);
    await waitFor("the Phlan outskirts illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log(`Verified the crossroads illustration at ${routeName} in Chrome.`);
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
  } else if (routeName === "nomad-headman-rest-reload" || routeName === "nomad-headman-raid") {
    const visibleText = () => frame.text.toSorted(([a], [b]) => a - b).map(([, char]) => String.fromCharCode(char)).join("");
    const raid = routeName === "nomad-headman-raid";
    assert.match(visibleText(), /00:29/);
    await advance("j");
    const known = new Set(frame.journal?.leads.map(({ id }) => id));
    assert.ok(known.has("nomad-promised-aid") && known.has("nomad-rest-offer"));
    assert.ok(!known.has("nomad-declined-aid") && !known.has("nomad-kobold-attack") && !known.has("nomad-war-cries"));
    await switchBothWays();
    for (const key of ["j", "e", "enter", "r", "h", ...Array(raid ? 18 : 8).fill("i"), "r"]) await advance(key);
    if (raid) {
      for (const key of ["space", "n"]) await advance(key);
      assert.match(visibleText(), /18:29.*THESOUNDOFWARCRIES/i);
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "nomad-war-cries"));
      assert.ok(!frame.journal.leads.some(({ id }) => id === "nomad-kobold-attack"));
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
    } else {
      await advance("e");
      assert.match(visibleText(), /08:29.*AREACASTVIEWENCAMP/i);
      console.log("Verified the Nomad rest permission after reload and rested eight hours through Encamp in Chrome.");
    }
    assert.deepEqual(readFileSync(saved), originalSave);
  } else if (routeName === "nomad-headman" || routeName === "nomad-headman-stay") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    for (const key of ["up", "enter", "e", "e", "enter", ...Array(6).fill("up"), ...Array(3).fill("enter"), "j"]) await advance(key);
    assert.ok(knows("nomad-camp-found") && knows("nomad-sentries"));
    assert.ok(!knows("nomad-feast-invitation") && !knows("nomad-kobold-warning"));
    for (const key of ["j", "p", "enter"]) await advance(key);
    const chief = "portrait:HEAD7.DAX:74:BODY7.DAX:30";
    assert.equal(frame.portrait, chief);
    await waitFor("the Nomad headman portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("nomad-feast-invitation") && !knows("nomad-headman-talk"));
    for (const key of ["j", "y", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("nomad-headman-talk") && !knows("nomad-kobold-warning"));
    for (const key of ["j", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, chief);
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
      for (const key of ["j", "e", "enter", "s", "s", "a"]) await advance(key);
      const savedJournal = JSON.parse(readFileSync(saved, "utf8")).leads;
      assert.ok(savedJournal.some(({ id }) => id === "nomad-rest-offer"));
      console.log("Native save after the Nomad rest offer:", saved);
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
      assert.equal(frame.portrait, scout);
      await advance("enter");
      assert.notEqual(frame.portrait, scout);
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
    assert.equal(frame.portrait, dirten);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, /WILLYOUACCOMPANYDIRTEN/i);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "bane-dirten"));
    console.log("Verified the Braccio-to-Dirten portrait transition and quest invitation in Chrome.");
  } else if (routeName === "cadorna-envoy-briefing") {
    for (const key of ["up", "enter"]) await advance(key);
    const cadorna = "portrait:HEAD3.DAX:55:BODY3.DAX:1";
    assert.equal(frame.portrait, cadorna);
    await waitFor("Cadorna's envoy portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "zhentil-sealed-packet"));
    for (const key of ["j", "enter"]) await advance(key);
    assert.equal(frame.portrait, cadorna);
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
  } else if (illustration) {
    const { inputs, portrait, prompt, continuation, journalLead, approachSequence } = illustration;
    if (approachSequence) await observeApproach(approachSequence);
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
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
    if (continuation) {
      if (journalLead) {
        await advance("j");
        assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
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
    }
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === journalLead), "Expected witnessed dialogue lead");
      if (routeName === "kobold-cave-envoys-rematch" && frame.journal.trackedId === "commission-kobolds") {
        assert.match(frame.journal.objective.nextStep, /confront the king.*at the throne/i);
      }
      await advance("j");
    }
    console.log(`Verified ${routeName} illustration, panel fit, and mode switching in Chrome.`);
  } else if (routeName === "pyramid-lizardfolk-vats") {
    for (const key of ["s", "up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:area:23:PIC7.DAX:57:0:0");
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /POKINGAROUNDINTHEVATS/i);
    await waitFor("the vat ambush illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Yarash vat ambush illustration in Chrome.");
  } else if (routeName === "valjevo-hill-giant-dialogue") {
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:55:0:0");
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), /THEYHOLDTHEIRWEAPONSREADY/i);
    await waitFor("the hill giant illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Valjevo hill giant dialogue illustration in Chrome.");
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
    await waitFor("Priestess Joy's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "phlan-sune-healing"));
    await advance("j");
    await advance("y");
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:22:BODY3.DAX:24");
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
    await advance("j");
    for (const key of ["s", "o", "h", "l", "o", "enter"]) await advance(key);
    const text = frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join("");
    assert.match(text, /RETURNSWITHAPACKAGE/i);
    assert.notEqual(frame.portrait, merchant);
    console.log("Verified the Slums potion booth portrait and package dialogue in Chrome.");
  } else if (routeName === "slums-fortune") {
    const portrait = "portrait:HEAD2.DAX:25:BODY2.DAX:13";
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    await waitFor("the Slums fortune teller portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal);
    assert.ok(!frame.journal.leads.some(({ id }) => id === "slums-fortune-warning"));
    for (const key of ["j", "p", "enter"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "slums-fortune-warning"));
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
  } else if (koboldGuide) {
    const guide = "portrait:area:13:PIC8.DAX:0:0:0";
    const knowsOffer = () => frame.journal?.leads.some(({ id }) => id === "kobold-guide-offer");
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, guide);
    await waitFor("the kobold guide portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal && !knowsOffer());
    for (const key of ["j", "w"]) await advance(key);
    assert.equal(frame.portrait, guide);
    await advance("j");
    assert.ok(knowsOffer());
    if (koboldEscort) {
      assert.equal(frame.journal.trackedId, "commission-kobolds");
      assert.match(frame.journal.objective.nextStep, /Choose Yes.*escort/);
      assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-guide-arrived" || id === "kobold-throne-envoys"));
      for (const key of ["j", "y", "j"]) await advance(key);
      assert.ok(frame.journal.leads.some(({ id }) => id === "kobold-guide-follow"));
      assert.match(frame.journal.objective.nextStep, /Follow the kobold guide/);
      await advance("j");
      const atThrone = () => /THEENVOYSAREHEREGREATKING|SENDTHEMFORWARD/i.test(
        frame.text.map(([, c]) => String.fromCharCode(c)).join("").replace(/[^a-z]/gi, ""));
      for (let stop = 0; stop < 20 && !atThrone(); stop++) await advance("enter");
      assert.ok(atThrone(), "The guide should announce the party at the throne");
      await advance("j");
      assert.ok(frame.journal.leads.some(({ id }) => id === "kobold-guide-arrived"));
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
      assert.equal(escortViews, 17);
      assert.equal(escortTilePatterns.size, 69);
    }
    console.log(koboldEscort ? `Verified ${escortViews} enhanced views, the guided walk, journal directions, and first meeting at the kobold throne.`
      : "Verified the kobold guide portrait and witnessed escort offer in Chrome.");
  } else if (princessFatima) {
    const fatima = "portrait:HEAD8.DAX:67:BODY8.DAX:37";
    const approach = "encounter:area:13:ecl:a775:SPRIT8.DAX:16:0:0";
    await observeApproach([[48, 32, approach, 40, 80]]);
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "kobold-fatima-account"));
    for (const key of ["j", "up", "enter"]) await advance(key);
    await waitFor("Fatima’s enhanced approach", () => run(`window.observedApproach.has(${JSON.stringify(approach)})`));
    await advance("enter");
    assert.equal(frame.portrait, fatima);
    await waitFor("Princess Fatima's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "kobold-fatima-account"));
    for (const key of ["j", "enter", "y"]) await advance(key);
    assert.notEqual(frame.portrait, fatima);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /PRINCESSFATIMA/i);
    console.log("Verified Princess Fatima's portrait, journal account, and recruitment in Chrome.");
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
  } else if (forgeSmith) {
    for (const key of ["up", "enter"]) await advance(key);
    assert.deepEqual(frame.encounter, [56, 32, "encounter:area:6:SPRIT5.DAX:12:1:0", 24, 65]);
    await waitFor("the forge smith approach", () => run('document.querySelector(".encounter-sprite")?.naturalWidth === 96'));
    await switchBothWays();
    await advance("a");
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:13:BODY5.DAX:9");
    await waitFor("the Valjevo forge smith portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["p", forgeAuthorization ? "h" : "n"]) await advance(key);
    const dialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(dialogue, forgeAuthorization ? /IFIT'SIMPORTANTGETAUTHORIZATION/i : /YOUNEVERGETTOTALLYUSEDTOTHEHEAT/i);
    assert.equal(frame.portrait, undefined);
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified the forge smith portrait and ${routeName} dialogue in Chrome.`);
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
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:12:BODY5.DAX:1");
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ANALARMSTARTSRINGING/i);
    await waitFor("the dungeon sentry portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Valjevo dungeon sentry portrait in Chrome.");
  } else if (genheeris) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
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
    assert.equal(frame.portrait, "portrait:HEAD5.DAX:59:BODY5.DAX:31");
    await waitFor("Genheeris's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    assert.equal(knows("castle-genheeris-orders"), genheerisOrders);
    assert.equal(knows("castle-genheeris-offer"), !genheerisOrders);
    if (!genheerisOrders) {
      for (const key of ["j", "enter", "y", "enter"]) await advance(key);
      assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /GENHEERIS/i);
      assert.equal(frame.portrait, undefined);
    }
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log(`Verified the Genheeris portrait and earned journal lead on ${routeName} in Chrome.`);
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
    await advance("j");
    assert.ok(frame.journal && !knows("castle-raven-clan") && !knows("castle-flaming-aura"));
    for (const key of ["j", "up", "enter", "s", "up", "right", "up", "right", "up", "j"]) await advance(key);
    assert.ok(knows("castle-raven-clan") && !knows("castle-flaming-aura"));
    for (const key of ["j", "enter", "left", "up", "left", "up", "right", "up", "enter", "left", "up", "left", "up", "right", "up", "enter", "left", "up", "left", "up", "j"]) await advance(key);
    assert.ok(knows("castle-raven-clan") && knows("castle-flaming-aura"));
    await switchBothWays();
    for (const key of ["j", "enter", "e", "s", "s", "b"]) await advance(key);
    assert.notDeepEqual(readFileSync(saved), originalSave);
    console.log("Native save:", saved);
    console.log("Verified separately earned scriptorium reports in Chrome.");
  } else if (castleScribe) {
    const portrait = "portrait:HEAD5.DAX:72:BODY5.DAX:30";
    for (const key of ["right", "right", "up", "y", ...Array(5).fill("enter")]) await advance(key);
    for (let attempt = 0; attempt < 24 && frame.portrait !== portrait; attempt++) {
      for (const key of ["up", "y", "enter", "enter", "enter", "right"]) {
        await advance(key);
        if (frame.portrait === portrait) break;
      }
    }
    assert.equal(frame.portrait, portrait);
    assert.match(frame.text.map(([, character]) => String.fromCharCode(character)).join(""), /ASCRIBECOMINGTOWARDTHEBUILDING/i);
    await waitFor("the records scribe portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the Valjevo records scribe portrait in Chrome.");
  } else if (castleRecords) {
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    await advance("up");
    await advance("j");
    assert.ok(knows("castle-records-room") && !knows("castle-records-thay") && !knows("castle-records-moonsea"));
    if (castleRecordsDecline) {
      for (const key of ["j", "n", "j"]) await advance(key);
      assert.ok(knows("castle-records-room") && !knows("castle-records-thay") && !knows("castle-records-moonsea"));
    } else {
      for (const key of ["j", "y", "j"]) await advance(key);
      assert.ok(knows("castle-records-thay") && !knows("castle-records-moonsea"));
      for (const key of ["j", "enter", "enter", "j"]) await advance(key);
      assert.ok(knows("castle-records-thay") && knows("castle-records-moonsea"));
    }
    await switchBothWays();
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
    if (giantPatrol) for (const key of ["a", "a"]) await advance(key);
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
    for (let index = 0; index < 8; index++) await advance("enter");
    await advance("j");
    assert.ok(knows("castle-kitchen-captives-freed"));
    assert.ok(knows("castle-hedge-gate-password"));
    console.log("Verified the Valjevo kitchen illustration and earned password lead in Chrome.");
  } else if (captiveReload) {
    await advance("j");
    for (const id of ["castle-cadorna-captive", "castle-cadorna-hedge", "castle-cadorna-released"]) {
      assert.ok(frame.journal?.leads.some(lead => lead.id === id), `Restored Cadorna lead: ${id}`);
    }
    await switchBothWays();
    console.log("Verified Cadorna's discoveries after cold loading the guest save.");
  } else if (captiveCadorna) {
    for (const key of ["up", "enter", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:7:0:0");
    await waitFor("Cadorna's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const heardHedge = captiveHedge || captiveAlarm;
    if (heardHedge) for (const key of ["l", "enter", "l", "enter", "l", "enter"]) await advance(key);
    if (captiveKilled) for (const key of ["k", "enter", "k"]) await advance(key);
    else await advance(captiveAlarm ? "l" : "r");
    await advance("j");
    const knows = id => frame.journal?.leads.some(lead => lead.id === id);
    assert.ok(knows("castle-cadorna-captive"));
    assert.equal(knows("castle-cadorna-released"), !captiveKilled && !captiveAlarm);
    assert.equal(knows("castle-cadorna-hedge"), heardHedge);
    assert.equal(knows("castle-cadorna-killed"), captiveKilled);
    assert.equal(knows("castle-cadorna-alarm"), captiveAlarm);
    if (captiveHedge) {
      for (const key of ["j", "n", "e", "s", "s", "b"]) await advance(key);
      assert.notDeepEqual(readFileSync(saved), originalSave);
      console.log("Native save:", saved);
    }
    console.log("Verified Cadorna's portrait and witnessed journal entries in Chrome.");
  } else if (alHyam) {
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
    for (const key of ["a", "p"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    await waitFor("Al-Hyam's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["a", "j"]) await advance(key);
    assert.ok(frame.journal && !knows());
    for (const key of ["j", "l"]) await advance(key);
    assert.equal(frame.portrait, portrait);
    await advance("j");
    assert.ok(knows());
    console.log("Verified Al-Hyam's portrait and witnessed notes in Chrome.");
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
    assert.equal(frame.portrait, portrait);
    await advance("j");
    assert.ok(knows());
    for (const key of ["j", "enter"]) await advance(key);
    assert.match(frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /JUSTLETMEGO/i);
    const released = () => frame.journal?.leads.some(({ id }) => id === "castle-impostor-released");
    await advance("j");
    assert.ok(frame.journal && !released());
    for (const key of ["j", "y", "j"]) await advance(key);
    assert.ok(released());
    assert.ok(!frame.journal.leads.some(({ id, status }) => id === "commission-castle" &&
      ["ready-to-report", "reward-pending", "turned-in"].includes(status)));
    console.log("Verified the false throne portrait and witnessed confession and release in Chrome.");
  } else if (restalGuide) {
    const restal = "portrait:HEAD4.DAX:52:BODY4.DAX:8";
    const knowsOffer = () => frame.journal?.leads.some(({ id }) => id === "textile-restal-offer");
    for (const key of ["up", "c", ...Array(5).fill("end"), ...Array(3).fill("enter")]) await advance(key);
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
    console.log("Verified Restal's illustration and the witnessed Textile House shortcut in Chrome.");
  } else if (norrisSurrender) {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.ok(frame.journal && !knows("kuto-norris-ambush"));
    for (const key of ["j", "up", "enter", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("kuto-norris-ambush") && !knows("kuto-norris-surrender"));
    for (const key of ["j", "s", "j"]) await advance(key);
    assert.ok(knows("kuto-norris-surrender"));
    console.log("Verified Norris's ambush and surrender journal discoveries in Chrome.");
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
    assert.notEqual(frame.portrait, "portrait:PIC8.DAX:5:0:0");
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
    assert.equal(frame.portrait, "portrait:PIC6.DAX:32:0:0");
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
      assert.equal(frame.portrait, dragonPortrait);
      assert.match(text(), /THEREISASILVERBOTTLEOFGREATPOWERTHERE.*RETRIEVETHATBOTTLETHENRETURN/i);
      await waitFor("the portrait through the bottle briefing", () => run(`state.sequence === ${frame.sequence} &&
        document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
      await advance("j");
      const bottle = frame.journal?.leads.find(({ id }) => id === "commission-bottle");
      assert.equal(bottle?.status, "offered");
    }
    console.log(`Verified ${routeName} artwork and dialogue in Chrome.`);
  } else if (koboldCave) {
    await advance("j");
    assert.ok(frame.journal, "The journal should open before finding the caves");
    assert.ok(!frame.journal.leads.some(({ id }) => id === "kobold-cave-fork"));
    await advance("j");
    for (const key of ["down", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:27:0:0");
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
    for (const key of ["left", "right", "right", "right", "right", "right", "up"]) {
      await advance(key);
      assert.equal(await verifyTiledView(24, altarPatterns), 1);
    }
    assert.equal(altarPatterns.size, 44);
    await switchBothWays();
    const altar = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-decision.png"), Buffer.from(altar.data, "base64"));
    await advance("j");
    assert.ok(knows("bane-defiled-altar") && !knows("bane-altar-ambush"));
    assert.match(frame.journal.objective.nextStep, /Choose Destroy Altar/);
    for (const key of ["j", "d", "j"]) await advance(key);
    assert.ok(knows("bane-altar-ambush") && !knows("bane-cleric-dispatch"));
    assert.match(frame.journal.objective.nextStep, /Defeat the half-orc cleric/);
    assert.notEqual(frame.journal.leads.find(({ id }) => id === "commission-bane")?.status, "ready-to-report");
    for (const key of ["j", "enter"]) await advance(key);
    await waitFor("all three altar ambush poses", () => run("window.observedApproach.size === 3"));
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
    for (const key of ["up", "enter"]) await advance(key);
    const prompt = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(prompt, /AREYOUINNEEDOFHEALING/i);
    assert.equal(frame.portrait, "portrait:HEAD1.DAX:48:BODY1.DAX:25");
    await waitFor("the infirmary portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    const capture = await command("Page.captureScreenshot", { format: "png" });
    const screenshot = resolve(directory, "podal-infirmary.png");
    writeFileSync(screenshot, Buffer.from(capture.data, "base64"));
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "podal-ilmater-infirmary"));
    await advance("j");
    await advance("n");
    assert.equal(frame.portrait, undefined);
    console.log("Verified the infirmary portrait, mode switches, and dialogue exit in Chrome.", screenshot);
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
    for (const key of ["j", "up", "up", "up", "enter", "enter", "up", "right", "up", "up", "j"]) await advance(key);
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
    for (const key of ["j", "up", "left"]) await advance(key);
    await waitFor("all three bugbear approach distances", () => run("window.bugbearDistances.size === 3"));
    assert.deepEqual(await run("[...window.bugbearDistances]"), ["2", "1", "0"]);
    await advance("up");
    assert.equal(frame.portrait, "portrait:area:9:PIC2.DAX:63:0:0");
    await waitFor("the enhanced bugbear warning portrait", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await verifyPortraitPanel();
    await advance("j");
    assert.ok(known(punch) && !known(released));
    await switchBothWays();
    for (const key of ["j", "t", "enter"]) await advance(key);
    assert.equal(await verifyTiledView(9, new Set()), 1);
    await advance("j");
    assert.ok(known(warning) && known(punch) && known(released));
    for (const key of ["j", "e", "s", "s", "b"]) await advance(key);
    const outcome = resolve(directory, "B.json");
    const leads = new Set(JSON.parse(readFileSync(outcome, "utf8")).leads?.map(({ id }) => id));
    assert.ok([warning, punch, released].every(id => leads.has(id)));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified and saved the Stojanow wall warning and bugbear confrontation in Chrome:", outcome);
  } else if (routeName === "stojanow-bugbears") {
    const route = ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left", "up", "a", "enter", "enter"];
    for (const key of route) await advance(key);
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
    for (const key of ["up", "enter", "enter", "p"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD2.DAX:5:BODY2.DAX:9");
    await waitFor("the wagon trader portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    console.log("Verified the wagon trader portrait and state-preserving switches.");
  } else if (stojanow) {
    for (const key of ["up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:16:BODY3.DAX:7");
    await waitFor("Urslingen's Stojanow Gate briefing portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
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
    for (const key of ["j", "enter", ..."savior", "enter", "y", "j"]) await advance(key);
    assert.ok(knows("swamp-elder-story") && knows("journal-entry-31"));
    assert.ok(!knows("swamp-champion-requested"));
    for (const key of ["j", "enter", "enter", "j"]) await advance(key);
    assert.ok(knows("swamp-champion-requested") && !knows("swamp-alliance-averted"));
    assert.match(frame.journal.objective.nextStep, /choose a party member/);
    if (routeName === "swamp-elder-decline") {
      for (const key of ["j", "n", "j"]) await advance(key);
      assert.ok(knows("swamp-challenge-hostile") && !knows("swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /peaceful meeting ended/);
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
      for (let action = 0; action < 5 && !struck(); action++) await advance("q");
      assert.ok(struck(), "The lizardfolk strike should appear in the original duel");
      await waitFor("the swamp lizardfolk strike", () => loaded(strike));
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
      assert.equal(await verifyTiledView(14, tilePatterns), 1);
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
  } else if (routeName.startsWith("kovel-chase")) {
    const chase = "kovel-chase";
    const split = "kovel-thieves-split";
    const ambush = "kovel-thief-ambush";
    const knows = id => frame.journal.leads.some(lead => lead.id === id);
    const textOf = ({ text }) => text.toSorted(([a], [b]) => a - b)
      .map(([, char]) => String.fromCharCode(char)).join("");
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kovel");
    assert.ok(!knows(chase) && !knows(split));
    for (const key of ["j", "up", "up"]) await advance(key);
    assert.match(textOf(frame), /WILLYOUCHASETHEM/i);
    await advance("j");
    assert.ok(knows(chase) && !knows(split));
    assert.match(frame.journal.objective.nextStep, /chase the thieves through the east door/i);
    for (const key of ["j", "y"]) await advance(key);
    assert.match(textOf(frame), /WHICHPATHWILLYOUTAKE/i);
    await advance("j");
    assert.ok(knows(chase) && knows(split) && !knows(ambush));
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.match(frame.journal.objective.nextStep, /south or east door/i);
    await switchBothWays();
    if (routeName === "kovel-chase-decline") {
      assert.ok(!knows("kovel-chase-ended"));
      for (const key of ["j", "d"]) await advance(key);
      assert.match(textOf(frame), /AREACASTVIEWENCAMP/i);
      await advance("j");
      assert.ok(knows("kovel-chase-ended") && !knows(ambush) && !knows("kovel-guildmaster"));
      assert.match(frame.journal.objective.nextStep, /^Continue searching Kovel Mansion/i);
    } else if (routeName !== "kovel-chase") {
      for (const key of ["j", "e"]) await advance(key);
      assert.match(textOf(frame), /IAMTHEGUILDMASTER.*ATTACKRELEASE/i);
      await advance("j");
      assert.ok(knows("kovel-guildmaster") && !knows("kovel-guildmaster-escaped"));
      assert.match(frame.journal.objective.nextStep, /Choose Attack.*or Release/i);
      if (routeName === "kovel-chase-attack") {
        assert.ok(!knows("kovel-guildmaster-confronted"));
        for (const key of ["j", "a"]) await advance(key);
        assert.match(textOf(frame), /ABATTLEBEGINS/i);
        await advance("j");
        assert.ok(knows("kovel-guildmaster-confronted") && !knows("kovel-guildmaster-escaped"));
        assert.match(frame.journal.objective.nextStep, /after the fight with the guildmaster.*continue searching/i);
      } else {
        for (const key of ["j", "r", "j"]) await advance(key);
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
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-kovel");
    assert.ok(!frame.journal.leads.some(({ id }) => id === files));
    for (const key of ["j", "up", "j"]) await advance(key);
    assert.match(frame.journal.leads.find(({ id }) => id === files)?.detail ?? "", /entries 38 and 51/);
    assert.equal(frame.journal.trackedId, "commission-kovel");
    assert.match(frame.journal.objective.nextStep, /Read journal entries 38 and 51/);
    await advance("j");
    await switchBothWays();
    console.log("Verified the Kovel Mansion file discovery and objective in Chrome.");
  } else if (routeName === "buccaneer-approach") {
    const base = "rescue-buccaneer-base";
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
    assert.equal(frame.portrait, "portrait:PIC6.DAX:42:0:0");
    await waitFor("the Bivant pen illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    await advance("j");
    assert.ok(frame.journal.leads.some(({ id }) => id === "rescue-slave-pen"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Look among the prisoners/);
    for (const key of ["j", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-identified-heir"));
    assert.match(frame.journal.objective.nextStep, /Choose Rescue Boy/);
    for (const key of ["j", "enter", "enter", "end", "end", "end", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-pen-options"));
    assert.match(frame.journal.objective.nextStep, /Choose Sneak Into Pen/);
    for (const key of ["j", "enter", "enter", "j"]) await advance(key);
    assert.match(frame.journal.objective.nextStep, /Try to Sneak By/);
    for (const key of ["j", "t", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "rescue-sneak-blocked"));
    assert.match(frame.journal.objective.nextStep, /Attack Guards or Leave/);
    console.log("Verified the Buccaneer Base approach and rescue journal in Chrome.");
  } else if (routeName === "swamp-approach") {
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-lizardmen");
    assert.ok(!knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    for (const key of ["j", ...Array(11).fill("right"), "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC8.DAX:24:0:0");
    await waitFor("the enhanced swamp drawbridge", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.naturalWidth === 352 && image?.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await advance("j");
    assert.ok(knows("swamp-drawbridge") && !knows("swamp-anti-magic"));
    assert.match(frame.journal.objective.nextStep, /cross the drawbridge/);
    for (const key of ["j", "e", "enter", "j"]) await advance(key);
    assert.ok(knows("swamp-anti-magic") && !knows("swamp-peaceful-elder"));
    assert.match(frame.journal.objective.nextStep, /anti-magic shell/);
    for (const key of ["j", "enter", "up", "e", "s", "s", "a"]) await advance(key);
    const entered = JSON.parse(readFileSync(saved, "utf8"));
    assert.ok(entered.leads.some(({ id }) => id === "swamp-anti-magic"));
    console.log("Verified the swamp drawbridge and anti-magic shell in Chrome. Saved:", saved);
  } else if (routeName === "yarash-combat") {
    const mage = "combat:area:23:CPIC7.DAX:14";
    const guard = "combat:area:23:CPIC7.DAX:57";
    const strike = "combat:area:23:CPIC7.DAX:185";
    const visible = (id) => run(`[...document.querySelectorAll(".combat-sprite")].filter(image =>
      image.src.endsWith(${JSON.stringify(id)}) && image.naturalWidth === 96 && image.naturalHeight === 96).length`);
    for (const key of ["up", "up", "b", "up", "enter", "f", "enter"]) await advance(key);
    assert.ok(frame.combatArt.some(([, , id, , selected]) => id === mage && selected));
    await waitFor("Yarash and his guards", async () => await visible(mage) === 1 && await visible(guard) >= 3);
    await switchBothWays();
    await waitFor("the enhanced combat sprites", async () => await visible(mage) === 1 && await visible(guard) >= 3);
    const capture = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "yarash-combat.png"), Buffer.from(capture.data, "base64"));
    await advance("enter");
    const swung = () => frame.animation?.some((shot) => shot.combatArt?.some(([, , id]) => id === strike));
    for (let turn = 0; turn < 20 && !swung(); turn++) await advance("q");
    assert.ok(swung(), "A mutant guard must strike during the replay");
    await waitFor("the mutant guard strike", () => visible(strike));
    console.log("Verified the Yarash combat sprites and guard strike in Chrome. Capture:", directory);
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
    for (const key of ["p", "n", "j"]) await advance(key);
    assert.ok(knows("river-pump-prisoners-freed") && knows("journal-entry-35"));
    assert.ok(!knows("river-pump-prisoners-hostile"));
    assert.match(frame.journal.objective.nextStep, /Read journal entry 35/);
    console.log("Verified the pumping-room parlay and its journal clues in Chrome.");
  } else if (riverExit) {
    const knowsRecovery = () => frame.journal?.leads.some(({ id }) => id === "river-recovery");
    await advance("j");
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-equipment-destroyed"));
    assert.equal(knowsRecovery(), false);
    for (const key of ["j", "right", "right", "up", "enter", "j"]) await advance(key);
    assert.ok(knowsRecovery());
    assert.match(frame.journal.objective.nextStep, /council clerk/);
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
    for (const key of ["j", "enter", "enter", "d", "j"]) await advance(key);
    assert.ok(knows("river-equipment-destroyed") && !knows("river-recovery"));
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk/);
    for (const key of ["j", "e", "s", "s", "a"]) await advance(key);
    const completed = JSON.parse(readFileSync(saved, "utf8"));
    assert.equal(completed.leads.find(({ id }) => id === "commission-river")?.status, "ready-to-report");
    assert.ok(completed.leads.some(({ id }) => id === "river-equipment-destroyed"));
    console.log("Verified the river fountain discovery and machinery shutdown in Chrome. Saved:", saved);
  } else if (riverPassage) {
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.match(frame.journal.objective.nextStep, /Explore the passage ahead/);
    const halls = () => frame.text.map(([, character]) => String.fromCharCode(character)).join("");
    for (const key of ["j", ...Array(15).fill("up")]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDINFRONTOFYOU/i);
    for (const key of ["enter", "right", "up"]) await advance(key);
    assert.match(halls(), /ASECRETDOORISFOUNDTOYOURLEFT/i);
    for (const key of ["enter", "right", "up", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === "river-entrance-inside"));
    assert.ok(!frame.journal.leads.some(({ id }) => id === "river-fountain"));
    console.log("Verified the reloaded pyramid entrance and the first two hidden doors in Chrome.");
  } else if (riverApproach) {
    const boat = "river-rowboat";
    const door = "river-secret-door";
    const knows = (id) => frame.journal?.leads.some((lead) => lead.id === id);
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-river");
    assert.ok(!knows(boat) && !knows(door));
    for (const key of ["j", "down", "j"]) await advance(key);
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
      if (koboldFerryReload) {
        console.log("Verified the ferry discovery after reloading at the New Phlan pier and collected the kobold reward.");
      } else {
        console.log(`Verified ${commission} after reload, the return boat, and council turn-in in Chrome.`);
      }
    }
  } else if (routeName === "mendor-records-reward") {
    const record = () => frame.journal?.leads.find(({ id }) => id === "mendor-book-37");
    await advance("j");
    assert.equal(record()?.status, "ready-to-report");
    assert.match(frame.journal.objective.nextStep, /council clerk at City Hall/);
    for (const key of ["j", "right", "right", "up", "right", "right", "up", "enter", "enter"]) await advance(key);
    assert.match(frame.text.toSorted(([left], [right]) => left - right)
      .map(([, character]) => String.fromCharCode(character)).join(""), /THESEMAPSSHOULDHELPUSLOCATE|THESEMAPSSHOULDHELPUSTOLOCATE/i);
    for (const key of ["enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(record()?.status, "turned-in");
    assert.equal(frame.journal.leads.find(({ id }) => id === "commission-records")?.status, "offered");
    console.log("Verified the clerk acknowledgment for Lex Geographica in Chrome.");
  } else if (councilReward) {
    const [commission, originalDialogue] = councilReward;
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    if (routeName === "swamp-reward") {
      assert.ok(frame.journal.leads.some(({ id }) => id === "swamp-alliance-averted"));
      assert.match(frame.journal.objective.nextStep, /elder's pledge/);
    }
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /journal entry 25/);
    if (routeName === "kobold-king-reward") assert.match(frame.journal.objective.nextStep, /tell the council clerk at City Hall that the king fell/);
    if (routeName === "nomad-reward") assert.match(frame.journal.objective.nextStep, /report what happened at the Nomad Camp/);
    for (const key of ["j", "right", "right", "up", "right", "right", "up", "enter", "enter", "j"]) await advance(key);
    assert.equal(journalStatus(), "reward-pending");
    const clerkDialogue = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(clerkDialogue, originalDialogue);
    if (routeName === "bane-reward") assert.match(frame.journal.objective.nextStep, /keep the temple treasure.*Press Enter/);
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    if (routeName === "bivant-reward") {
      assert.equal(journalStatus(), "reward-pending");
      for (const key of ["j", "y", "t"]) await advance(key);
      const loot = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
      assert.match(loot, /Two-HandedSword.*ClericalScroll/i);
      for (const key of [...Array(5).fill("t"), "e", "e", "j"]) await advance(key);
    }
    assert.equal(journalStatus(), "turned-in");
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
    for (let line = 0; line < 6; line++) await advance("enter");
    await checkJournal(["envoy-challenge", "packet-delivered", "quarters"], ["quarters-attacked", "envoy-left"]);
    await switchBothWays();
    for (const key of ["up", "right", "up", "right", "up", "right", "up"]) await advance(key);
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
    assert.ok(!frame.journal.leads.some(({ id }) => id === stairs));
    for (const key of ["j", "up", "enter", "j"]) await advance(key);
    assert.ok(frame.journal?.leads.some(({ id }) => id === stairs));
    for (const key of ["j", "y", "enter"]) await advance(key);
    const encounter = "encounter:area:10:SPRIT4.DAX:23:0:0";
    assert.deepEqual(frame.encounter, [56, 32, encounter, 32, 80]);
    await waitFor("the vampire at the crypt threshold", () => run('document.querySelector(".encounter-sprite")?.naturalHeight === 320'));
    await switchBothWays();
    await advance("enter");
    assert.equal(frame.portrait, "portrait:PIC4.DAX:23:0:0");
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
    console.log("Verified the Valhingen mystic portrait and state-preserving switches.");
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
    let views = await verifyTiledView(20, patterns);
    for (const key of route) {
      await advance(key);
      // The final audience draws area 7 before the dialogue portrait appears.
      views += await verifyTiledView(views >= (halls ? 2 : 3) ? 7 : 20, patterns);
    }
    assert.equal(views, halls ? 5 : 8);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:66:0:0");
    await waitFor("the dragon dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await verifyPortraitPanel();
    await switchBothWays();
    if (halls) {
      console.log("Verified enhanced Valjevo hall views and the dragon dialogue.");
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
    assert.equal(frame.portrait, "portrait:HEAD3.DAX:24:BODY3.DAX:32");
    await waitFor("enhanced clerk at the campaign finale", () => run(`state.sequence === ${frame.sequence} &&
      document.querySelector(".encounter-portrait")?.naturalWidth === 352`));
    await verifyPortraitPanel();
    const clerk = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "council-finale.png"), Buffer.from(clerk.data, "base64"));
    await switchBothWays();
    await advance("enter");
    assert.match(text(), /RECEIVES67500EXPERIENCEPOINTS/i);
    await waitFor("the council reward in the Enhanced web font", () => run(`(() => {
      if (state.sequence !== ${frame.sequence}) return false;
      const text = document.querySelector("#game-text");
      return !text.hidden && /receives67500experiencepoints/i.test(text.textContent.replace(/\\s+/g, "")) &&
        !document.querySelector(".encounter-portrait, .terrain-tile") &&
        [...document.fonts].some(font => font.family.includes("Game Web Font") && font.status === "loaded");
    })()`));
    const reward = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "council-reward.png"), Buffer.from(reward.data, "base64"));
    await switchBothWays();
    for (const key of ["enter", "enter", "j"]) await advance(key);
    assert.equal(castleStatus(), "reward-pending");
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
    for (const [step, key] of route.entries()) {
      if (key) await advance(key);
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
    assert.equal(views, courtyard ? 25 : patrolCombat ? 18 : landing ? 19 : 12);
    assert.equal(seen.size, courtyard ? 56 : landing ? 49 : 13);
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
      await waitFor("the enhanced orc and preserved Aim cursor", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll(${JSON.stringify(`.combat-sprite[src="/art/${orc}"]`)})]
          .find(image => image.style.left === "40%" && image.style.top === "64%");
        const image = document.querySelector("#screen");
        if (sprite?.naturalWidth !== 96 || !image.complete) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.drawImage(image, 131, 136, 1, 1, 0, 0, 1, 1);
        return [...context.getImageData(0, 0, 1, 1).data].join(",") === "254,245,221,255";
      })()`));
      await switchBothWays();
      const aimShot = await command("Page.captureScreenshot", { format: "png" });
      writeFileSync(resolve(directory, "sokal-orc-aimed.png"), Buffer.from(aimShot.data, "base64"));
      console.log("Verified Brin's selected combat icon and the orc under the original Aim cursor in both modes.");
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
