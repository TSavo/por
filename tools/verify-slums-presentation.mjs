import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { appendFileSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
  ["wild-cave-wyvern-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [24, 32, "encounter:area:27:SPRIT8.DAX:121:0:0", 88, 80],
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:121:0:0", prompt: /FEROCIOUSWYVERN/i },
  }],
  ["slums-hobgoblin-ringleader-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:20:SPRIT2.DAX:6:0:0", 48, 80],
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
  ["kuto-norris-approach", {
    slot: "J", inputs: ["up", "enter"],
    placement: [48, 32, "encounter:area:29:SPRIT8.DAX:16:0:0", 40, 80],
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
    dialogue: { key: "enter", portrait: "portrait:area:27:PIC8.DAX:59:0:0", prompt: /FOURGIANTLIZARDSANDTWOMINOTAURS/i },
  }],
  ["wild-cave-gnoll-approach", {
    slot: "B", inputs: ["up", "enter"],
    placement: [40, 32, "encounter:area:27:SPRIT8.DAX:73:0:0", 56, 80],
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
  }],
  ["valhingen-spectre-approach-near", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:17:0:0", 32, 80],
  }],
  ["valhingen-spectre-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [56, 32, "encounter:area:10:SPRIT4.DAX:17:1:0", 24, 65],
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
  }],
  ["kobold-cave-wyvern-approach", {
    slot: "A", inputs: ["up", "enter"],
    placement: [24, 32, "encounter:area:13:SPRIT8.DAX:121:0:0", 88, 80],
  }],
  ["valjevo-troll-approach", {
    slot: "B", inputs: ["up", "b"],
    placement: [48, 32, "encounter:area:5:SPRIT5.DAX:31:0:0", 40, 80],
  }],
]);
const encounterRoute = encounterRoutes.get(routeName);
const illustrationRoutes = new Map([
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
  ["valhingen-skeleton-enclave", {
    slot: "A", inputs: ["up", "enter", "enter"],
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
  ["podal-pitt-monster-patrons", {
    slot: "I", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:18:PIC1.DAX:2:0:0", prompt: /THECREATURESIGNOREYOUFORTHEMOMENT/i,
  }],
  ["slums-grain-sack-ambush", {
    slot: "B", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:20:PIC2.DAX:31:0:0", prompt: /SOMEMONSTERSARETOSSINGASACKOFGRAIN/i,
  }],
  ["bane-ogre-led-guards", {
    slot: "A", inputs: ["up", "enter", "enter"],
    portrait: "portrait:area:31:PIC1.DAX:8:0:0", prompt: /SIXORCSLEDBYALARGEOGRE/i,
  }],
  ["stojanow-plotting-mage", {
    slot: "A", inputs: ["up", "enter", "enter", "enter", "enter"],
    portrait: "portrait:HEAD2.DAX:52:BODY2.DAX:31", prompt: /THEYSEEMUNAWAREOFYOU/i, journalLead: "stojanow-assault-plans",
  }],
  ["stojanow-plotting-fighter", {
    slot: "A", inputs: ["up", "enter", "enter", "enter", "enter"],
    portrait: "portrait:HEAD2.DAX:11:BODY2.DAX:2", prompt: /THEYSEEMUNAWAREOFYOU/i, journalLead: "stojanow-medusa-trapdoor",
  }],
  ["stojanow-patrol-leader-dialogue", {
    slot: "A", inputs: ["up", "enter", "a", "a"],
    portrait: "portrait:HEAD2.DAX:8:BODY2.DAX:5", prompt: /WHATAREYOUDOINGHERE/i,
  }],
  ["north-gate-weapon-cache-ambush", {
    slot: "A", inputs: ["up", "enter", "t", "enter"],
    portrait: "portrait:HEAD3.DAX:71:BODY3.DAX:8", prompt: /ANAWFULSMELLINGCLOUDOFGASFORMS/i,
  }],
  ["north-gate-jail-thugs", {
    slot: "A", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:32:BODY3.DAX:8", prompt: /CONVERTEDTOAJAIL/i,
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
  }],
  ["new-phlan-thieves-trainer", {
    slot: "I", inputs: ["up", "enter"],
    portrait: "portrait:HEAD3.DAX:16:BODY3.DAX:8", prompt: /WETRAINONLYTHIEVESHERE/i,
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
const koboldGuide = routeName === "kobold-cave-guide";
const restalGuide = routeName === "textile-restal";
const sokalScout = routeName === "sokal-elven-scout" || routeName === "sokal-elven-scout-search";
const combatPoseRoutes = new Map([
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
const environmentRoutes = new Map([
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
    slot: "A", area: 16, views: 14, patterns: 51, sceneryOnly: true,
    walk: ["left", "up", "up", "up", "up", "right", "up", "up", "left", "up", "up", "right", "up"],
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
    slot: "I", area: 18, views: 11, patterns: 53,
    walk: ["up", "up", "right", "up", "up", "right", "up", "up", "right", "up"],
  }],
  ["lizardfolk-east-bank", {
    slot: "A", area: 16, views: 16, patterns: 52,
    walk: ["up", "up", "left", "up", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["nomad-central-grove", {
    slot: "A", area: 17, views: 16, patterns: 43,
    walk: ["right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "up", "right", "up", "up"],
  }],
  ["zhentil-east-yard", {
    slot: "A", area: 28, views: 17, patterns: 46,
    walk: ["up", "up", "up", "right", "up", "up", "left", "up", "up", "left", "up", "up", "right", "up", "right", "up"],
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
    slot: "J", area: 29, views: 15, patterns: 89,
    walk: ["up", "up", "up", "right", "up", "left", "up", "right", "up", "left", "up", "right", "up", "left"],
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
  ["nomad-tent-lane", {
    slot: "A", area: 17, views: 6, patterns: 39,
    walk: Array(5).fill("up"),
  }],
  ["nomad-camp-rim", {
    slot: "A", area: 17, views: 7, patterns: 47,
    walk: [...Array(4).fill("up"), "left", "up"],
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
    slot: "I", views: 14, patterns: 75,
    walk: ["right", "right", "up", "b", "left", "up", "left", "up", "b", "right", "up", "b", "left", "up", "up", "left", "up", "enter", "enter"],
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
    slot: "A", area: 9, views: 10, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "left"],
  }],
  ["stojanow-west", {
    slot: "A", area: 9, views: 13, patterns: 43,
    walk: ["up", "up", "up", "enter", "enter", "up", "left", "up", "up", "up", "right", "up", "up", "right"],
  }],
  ["stojanow-east", {
    slot: "A", area: 9, views: 10, patterns: 40,
    walk: ["up", "up", "up", "enter", "enter", "up", "right", "up", "up", "up", "up"],
  }],
]);
const routes = ["lizardfolk-battle-wall", "kobolds", "orcs", "goblins", "armorer", "fighter-trainer", "phlan-harbor-sokal", "phlan-harbor-routes", "phlan-priestess-joy", "phlan-priest-tyr", "phlan-priest-tempus", "sokal-smithy", "sokal-elven-scout", "sokal-elven-scout-search", "sokal-armory", "sokal-landing", "sokal-patrol-combat", "sokal-courtyard", "podal-plaza", "podal-infirmary", "podal-shrine", "podal-shrine-return", "braccio-dirten-briefing", "bane-gate", "bane-goblins", "bane-symbol", "bane-altar", "bane-hidden-treasure", "kobold-cave", "kobold-cave-efreeti-dialogue", "kobold-cave-wyvern-dialogue", "kobold-cave-guide", "kobold-princess-fatima", "kuto-norris-surrender", "mendor-library-stacks", "slums-fortune", "slums-potion-booth", "old-phlan-seer", "old-phlan-seer-reload", "nomad-camp-approach", "nomad-camp-sentries", "nomad-headman", "nomad-headman-stay", "diogenes-cave", "diogenes-advice", "textile-altar", "textile-ogre", "textile-restal", ...environmentRoutes.keys(), ...ferryRoutes.keys(), ...outskirtsRoutes.keys(), ...conjurerPrompts.keys(), ...encounterRoutes.keys(), ...illustrationRoutes.keys(), "graveyard-mystic", ...combatPoseRoutes.keys(), "graveyard-vampire", "graveyard-wolves", "valhingen-mummy-sarcophagi", "stojanow-briefing", "stojanow-trader", "stojanow-bugbears", "cadorna-envoy-briefing", "zhentil-envoy", "zhentil-trespass", "zhentil-escape", "zhentil-reward", "zhentil-return", "river-approach", "river-passage", "river-fountain", "pyramid-lizardfolk-vats", "river-pumping", "river-exit", "river-return", "river-reward", "yarash-combat", "swamp-approach", "swamp-elder", "swamp-elder-decline", "swamp-reward", "bivant-reward", "mendor-records-reward", "nomad-reward", "bane-reward", "buccaneer-approach", "assault-briefing", "castle-halls", "valjevo-tower-save", "valjevo-tower-reload", "valjevo-dungeon-save", "valjevo-dungeon-reload", "valjevo-false-throne", "valjevo-al-hyam", "valjevo-cadorna-captive", "valjevo-cadorna-hedge", "valjevo-cadorna-reload", "valjevo-cadorna-killed", "valjevo-cadorna-alarm", "valjevo-dungeon-kitchen", "valjevo-scriptorium-password", "valjevo-scriptorium-authority", "valjevo-maze-watch", "valjevo-giant-patrol", "valjevo-hill-giant-dialogue", "valjevo-dungeon-sentry", "valjevo-bane-chaplain", "valjevo-forge-smith", "valjevo-forge-authorization", "valjevo-records", "valjevo-records-decline", "valjevo-records-scribe", "valjevo-scriptorium-reports", "valjevo-scriptorium-reports-reload", "valjevo-genheeris-bargain", "valjevo-genheeris-orders", "castle-dragon", "castle-ending"];
assert.ok(checkpoint && chromePath, `Usage: node tools/verify-slums-presentation.mjs <checkpoint> <Chrome executable> [${routes.join("|")}] [--terrain-only|--manual-party]`);
assert.ok(routes.includes(routeName), "Unknown presentation replay route");
const ending = routeName === "castle-ending";
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
  "nomad-reward": ["commission-nomads", /WEWEREMUCHRELIEVEDBYTHENEWSYOUBRINGFROMTHENOMADCAMP/i],
  "bane-reward": ["commission-bane", /YOUMAYKEEPALLYOUFOUNDINTHETEMPLEOFBANE/i],
}[routeName];
const envoyReturn = routeName === "zhentil-return";
const riverApproach = routeName === "river-approach";
const riverPassage = routeName === "river-passage";
const riverFountain = routeName === "river-fountain";
const riverExit = routeName === "river-exit";
const riverReturn = routeName === "river-return";
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
const classicPortrait = option === "--classic-portrait" && routeName === "buccaneer-approach";
assert.ok(!option || (courtyard && (terrainOnly || manualParty)) || repeatStampede || classicPortrait, "Option does not apply to this route");
const landing = routeName === "sokal-landing" || patrolCombat || courtyard;
mkdirSync("out", { recursive: true });
const directory = mkdtempSync(resolve("out", "slums-presentation-"));
const slot = environment?.slot ?? ferry?.slot ?? encounterRoute?.slot ?? illustration?.slot ?? combatPose?.slot ?? (landing || norrisSurrender ? "J" : armory ? "D" : altar || plaza || infirmary || shrine || shrineReturn ? "I" : ogre ? "H" : dragon || halls || towerReload || dungeonSave || dungeonReload || falseTyranthraxus || alHyam || captiveCadorna || captiveReload || dungeonKitchen || scriptorium || mazeWatch || giantPatrol || routeName === "valjevo-hill-giant-dialogue" || dungeonSentry || castleChaplain || forgeSmith || castleRecords || castleScribe || castleReports || castleReportsReload || genheeris || assault || mystic || stojanow || trader || koboldCave || koboldGuide || princessFatima || mendorStacks || routeName === "slums-fortune" || routeName === "slums-potion-booth" || routeName.startsWith("old-phlan-seer") ? "B" : orcs || ending || smithy || sokalScout || restalGuide ? "C" : "A");
const boot = { A: "1e61", B: "3062", C: "2e63", D: "2064", H: "2368", I: "1769", J: "246a" }[slot];
const saved = resolve(directory, slot + ".json");
const battleTrace = courtyard && process.env.POR_TRACE_BATTLE_TILES === "1"
  ? resolve(directory, "battle-tiles.jsonl") : undefined;
const environmentTrace = environment && process.env.POR_WRITE_ENVIRONMENT_TRACE === "1"
  ? resolve(directory, "environment-tiles.jsonl") : undefined;
const frameDirectory = resolve(directory, "tile-frames");
let battleFrame = 0;
if (battleTrace) mkdirSync(frameDirectory);
const profile = resolve(directory, "chrome");
copyFileSync(checkpoint, saved);
const originalSave = readFileSync(saved);
const port = process.env.POR_PLAY_PORT ?? "43212";
const origin = `http://127.0.0.1:${port}`;
const browserEnvironment = { ...process.env };
delete browserEnvironment.POR_UPGRADES_DIR;
if (terrainOnly || classicPortrait) {
  const pack = resolve(directory, "test-art");
  mkdirSync(pack);
  const combined = { version: 1, assets: {}, encounters: {} };
  for (const source of ["upgrades/slums", "upgrades"]) {
    const manifest = JSON.parse(readFileSync(resolve(source, "manifest.json")));
    for (const [id, file] of Object.entries(manifest.assets)) {
      if ((terrainOnly && id.startsWith("combat:")) || (classicPortrait && id === "portrait:PIC6.DAX:39:0:0")) continue;
      copyFileSync(resolve(source, file), resolve(pack, file));
      combined.assets[id] = file;
    }
    Object.assign(combined.encounters, manifest.encounters);
  }
  writeFileSync(resolve(pack, "manifest.json"), JSON.stringify(combined));
  browserEnvironment.POR_UPGRADES_DIR = pack;
}

const server = spawn(process.execPath, ["--import", "tsx", "tools/browser-play.ts"], {
  env: {
    ...browserEnvironment, POR_PLAY_PORT: port, POR_SAVE_DIR: directory,
    POR_PREGEN_PARTY: "0", POR_TRACE_TILES: "1", POR_BOOT_KEY_FILE: "",
    POR_BOOT_KEYS: "31000000:1c0d,45000000:266c,52000000:" + boot,
    POR_LIVE_AT: "85000000", POR_BOOT_STEPS: "450000000",
  },
  stdio: ["ignore", "ignore", "inherit"],
});
const chrome = spawn(chromePath, [
  "--headless", "--no-first-run", "--disable-gpu", "--remote-debugging-port=0",
  `--user-data-dir=${profile}`, "about:blank",
], { stdio: "ignore" });

async function waitFor(description, read) {
  const deadline = Date.now() + 30_000;
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
    assert.deepEqual(readFileSync(saved), originalSave);
  }

  await run('document.querySelector("#presentation").click()');
  async function verifyTiledView(area, patterns) {
    if (!frame.tileInventory?.length) return 0;
    if (environmentTrace) appendFileSync(environmentTrace, JSON.stringify(frame.tileInventory) + "\n");
    const expected = frame.tileInventory.map(([x, y, id]) => [x, y, id]);
    assert.equal(expected.length, 121);
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

  if (towerReload || dungeonReload) {
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
    for (const key of environment.walk) {
      const previousTiles = frame.tiles;
      await advance(key);
      if (actor && frame.encounter) assert.deepEqual(frame.tiles, previousTiles);
      const viewArea = transition && views >= transition.afterViews ? transition.area : area;
      views += await verifyTiledView(viewArea, patterns);
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
    if (routeName === "textile-temple") {
      assert.equal(frame.portrait, "portrait:PIC4.DAX:9:0:0");
      await waitFor("Grishnak's portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    }
    await switchBothWays();
    console.log(`Verified ${routeName}: ${views} views, ${patterns.size} tile patterns and state-preserving switches.`);
    if (environmentTrace) console.log("Environment tile trace:", environmentTrace);
    if (towerSave) {
      const expected = { tiles: frame.tileInventory, text: frame.text.toSorted(([left], [right]) => left - right) };
      for (const key of ["e", "s", "s", "b"]) await advance(key);
      assert.notDeepEqual(readFileSync(saved), originalSave);
      writeFileSync(resolve(directory, "valjevo-save-scene.json"), JSON.stringify(expected));
      console.log("Native save:", saved);
    }
  } else if (encounterRoute) {
    for (const key of encounterRoute.inputs) await advance(key);
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
    for (let turn = 0; turn < 4; turn++) {
      await advance("q");
      for (const tile of walls) assert.ok(frame.battleTiles.some(placement => placement.every((part, index) => part === tile[index])));
      assert.ok(walls.every(([x, y]) => frame.combatArt.every(([ax, ay, , , , width = 24, height = 24]) =>
        x >= ax + width || x + 8 <= ax || y >= ay + height || y + 8 <= ay)));
      await waitFor("both battlefield wall tiles", () => run(`state.sequence === ${frame.sequence} &&
        ${JSON.stringify(walls.map(([, , id]) => id))}.every(id =>
          [...document.querySelectorAll(".battle-tile")].some(image =>
            image.getAttribute("src") === "/art/" + id && image.naturalWidth === 32 && image.naturalHeight === 32))`));
    }
    await switchBothWays();
    console.log("Verified both wall tiles across four live giant-lizard combat turns.");
  } else if (combatPose) {
    const { stand, strike, width, height, inputs, strikeInputs = ["q"], strikeReflected, journalLead, excluded, readyPrompt } = combatPose;
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
      assert.ok(frame.animation?.some(({ combatArt }) => combatArt?.some(([, , id, reflected]) =>
        id === strike && (strikeReflected === undefined || reflected === strikeReflected))));
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
    console.log(`Verified the return ferry artwork at ${routeName} in Chrome.`);
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
    console.log("Verified the Nomad Camp approach illustration and witnessed journal entry in Chrome.");
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
    const { inputs, portrait, prompt, continuation, journalLead } = illustration;
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
      await advance("j");
    }
    for (const key of inputs) await advance(key);
    assert.equal(frame.portrait, portrait);
    assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), prompt);
    await waitFor("the enhanced dialogue illustration", () => run(`(() => {
      const image = document.querySelector(".encounter-portrait");
      return image?.getAttribute("src") === ${JSON.stringify("/art/" + portrait)} &&
        image.naturalWidth === 352 && image.naturalHeight === 352;
    })()`));
    await switchBothWays();
    await verifyPortraitPanel();
    if (continuation) {
      if (journalLead) {
        await advance("j");
        assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === journalLead));
        await advance("j");
      }
      for (const key of continuation.inputs) await advance(key);
      assert.equal(frame.portrait, continuation.clearsPortrait ? undefined : portrait);
      assert.match(frame.text.map(([, char]) => String.fromCharCode(char)).join(""), continuation.prompt);
      if (!continuation.clearsPortrait) await verifyPortraitPanel();
    }
    if (journalLead) {
      await advance("j");
      assert.ok(frame.journal?.leads.some(({ id }) => id === journalLead), "Expected witnessed dialogue lead");
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
    console.log("Verified the kobold guide portrait and witnessed escort offer in Chrome.");
  } else if (princessFatima) {
    const fatima = "portrait:HEAD8.DAX:67:BODY8.DAX:37";
    await advance("j");
    assert.ok(frame.journal && !frame.journal.leads.some(({ id }) => id === "kobold-fatima-account"));
    for (const key of ["j", "up", "enter", "enter"]) await advance(key);
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
    for (const key of ["j", "enter", "enter", "enter", "enter", "q"]) await advance(key);
    const cleric = "combat:area:24:CPIC1.DAX:33";
    assert.ok(frame.combatArt.some(([, , id]) => id === cleric));
    await waitFor("the half-orc cleric in combat", () => run(`[...document.querySelectorAll(".combat-sprite")].some(img =>
      img.src.endsWith(${JSON.stringify(cleric)}) && img.naturalWidth === 96 && img.naturalHeight === 96)`));
    await switchBothWays();
    const combat = await command("Page.captureScreenshot", { format: "png" });
    writeFileSync(resolve(directory, "bane-altar-combat.png"), Buffer.from(combat.data, "base64"));
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
      for (const key of ["enter", "enter"]) await advance(key);
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
      ...Array(5).fill("up"), "right", "up", "left", "up", "up", "enter", "s", "up", "enter", ...Array(5).fill("enter")];
    for (const key of route) await advance(key);
    const standing = () => frame.combatArt.find(([, , id]) => id === idle);
    for (let turn = 0; turn < 8 && !standing(); turn++) await advance("q");
    assert.deepEqual(standing()?.slice(5), [24, 48]);
    const displayed = id => run(`[...document.querySelectorAll(".combat-sprite")].some(img => img.src.endsWith(${JSON.stringify(id)}) &&
      img.naturalWidth === 96 && img.naturalHeight === 192 &&
      parseFloat(img.style.width) === 7.5 && parseFloat(img.style.height) === 24)`);
    await waitFor("the rectangular ogre standing sprite", () => displayed(idle));
    await switchBothWays();
    const swung = () => frame.animation?.some(shot => shot.combatArt?.some(([, , id]) => id === attack));
    for (let turn = 0; turn < 70 && !swung(); turn++) await advance("q");
    assert.ok(swung());
    await waitFor("the rectangular ogre attack sprite", () => displayed(attack));
    assert.deepEqual(readFileSync(saved), originalSave);
    console.log("Verified 96×192 standing and attack sprites in the Textile House ogre fight.");
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
  } else if (routeName === "buccaneer-approach") {
    const base = "rescue-buccaneer-base";
    await advance("j");
    assert.equal(frame.journal?.trackedId, "commission-rescue");
    assert.ok(!frame.journal.leads.some(({ id }) => id === base));
    for (const key of ["j", "down", "enter"]) await advance(key);
    if (classicPortrait) {
      assert.equal(frame.classicPortrait, true);
      assert.equal(frame.portrait, undefined);
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
    assert.match(frame.journal.objective.nextStep, /Enter the Buccaneer Base/);
    for (const key of ["j", "e", "e"]) await advance(key);
    const entrance = frame.text.map(([, character]) => String.fromCharCode(character)).join("").replace(/\s/g, "");
    assert.match(entrance, /8,10S/i);
    for (const key of ["right", "up", "right", "up", "enter"]) await advance(key);
    assert.equal(frame.portrait, "portrait:PIC6.DAX:42:0:0");
    await waitFor("the Bivant pen illustration", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    for (const key of ["enter", "j"]) await advance(key);
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
    for (const key of ["j", "enter", "enter", "enter", "a", "a", "p", "n", "j"]) await advance(key);
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
  } else if (envoyReturn || riverReturn) {
    const commission = riverReturn ? "commission-river" : "commission-zhentil";
    const discovery = riverReturn ? "river-recovery" : "zhentil-envoy-left";
    const journalStatus = () => frame.journal?.leads.find(({ id }) => id === commission)?.status;
    await advance("j");
    assert.equal(journalStatus(), "ready-to-report");
    assert.ok(frame.journal.leads.some(({ id }) => id === discovery));
    const toLanding = riverReturn
      ? ["right", "right", "right", ...Array(15).fill("down"), "left", "left"]
      : [...Array(5).fill("up"), ...Array(18).fill("right"), "down", "down"];
    for (const key of ["j", ...toLanding, "enter",
      "t", "enter", "enter", "enter", ...Array(4).fill("up"),
      "left", "up", "right", "up", "left", "up", "right", ...Array(6).fill("up"),
      "left", "up", "up", "left", "up", "left", "up", "up", "enter", "j"]) await advance(key);
    assert.equal(journalStatus(), "ready-to-report");
    // This checkpoint still has its earlier Podal Plaza reward to collect.
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(journalStatus(), "reward-pending");
    for (const key of ["j", "enter", "enter", "enter", "s", "e", "j"]) await advance(key);
    assert.equal(journalStatus(), "turned-in");
    console.log(`Verified ${commission} after reload, the return boat, and council turn-in in Chrome.`);
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
    for (const key of ["up", "enter", "enter"]) await advance(key);
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
      views += await verifyTiledView(20, patterns);
    }
    assert.equal(views, halls ? 2 : 3);
    assert.equal(frame.portrait, "portrait:PIC5.DAX:66:0:0");
    await waitFor("the dragon dialogue portrait", () => run('document.querySelector(".encounter-portrait")?.naturalWidth === 352'));
    await switchBothWays();
    if (halls) {
      console.log("Verified enhanced Valjevo hall views and the dragon dialogue.");
    } else {
      for (const key of ["enter", "enter", ...Array(6).fill("a"), "enter", "enter", "q"]) await advance(key);
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
      await switchBothWays();
      console.log("Verified the castle dragon in dialogue and selected combat, with state-preserving mode switches.");
    }
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
      assert.equal(frame.tiles.length, 121, `Step ${step} (${key})`);
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
      if (!patrolCombat) assert.equal(frame.encounter, undefined);
    }
    assert.equal(views, courtyard ? 24 : patrolCombat ? 18 : landing ? 19 : 12);
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
      const target = frame.combatArt.find(([, , id, , highlight]) => id === "combat:CPIC2.DAX:4" && highlight);
      assert.deepEqual(target, [128, 128, "combat:CPIC2.DAX:4", false, true]);
      await waitFor("the enhanced orc and preserved Aim cursor", () => run(`(() => {
        if (state.sequence !== ${frame.sequence}) return false;
        const sprite = [...document.querySelectorAll('.combat-sprite[src="/art/combat:CPIC2.DAX:4"]')]
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
      const bank = courtyard ? "CPIC2.DAX" : "CPIC4.DAX";
      const guards = courtyard ? ["4", "5", "6"] : ["34", "35"];
      const attackIds = new Set(guards.map((id) => String(Number(id) + 128)));
      await run(`(() => {
        window.combatSprites = new Set();
        window.partySpriteSeen = false;
        window.attackSwitch = null;
        new MutationObserver(() => {
          if (${courtyard} && animationFrame?.battleTiles.length && animationFrame.combatArt.length && !attackSwitch) {
            const attack = animationFrame;
            const sequence = state.sequence;
            const layer = document.querySelector("#tile-art");
            const screen = document.querySelector("#screen");
            const oldFrame = screen.getAttribute("src");
            document.querySelector("#presentation").click();
            const classic = layer.hidden && document.querySelector("#game-text").hidden &&
              screen.getAttribute("src") === "data:image/png;base64," + attack.frame;
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
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
          for (const image of document.querySelectorAll('.combat-sprite[src^="/art/combat:${bank}:"]')) {
            const record = () => {
              if (image.naturalWidth === 96 && image.naturalHeight === 96) {
                window.combatSprites.add(image.getAttribute("src").split(":").at(-1));
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
        if (guards.every(id => visible.has(`combat:${bank}:${id}`))) break;
        await advance("q");
      }
      await waitFor("all guard sprites", () => run(
        `${JSON.stringify(guards)}.every(id => combatSprites.has(id))`));
      const [x, y] = frame.combatArt.find(([, , id]) => id === `combat:${bank}:${guards[0]}`);
      await waitFor("transparent artwork over a cleared guest cell", () => run(`(() => {
        const image = document.querySelector("#screen");
        if (!image.complete || image.naturalWidth !== 320) return false;
        const context = document.createElement("canvas").getContext("2d");
        context.canvas.width = context.canvas.height = 24;
        context.drawImage(image, ${x}, ${y}, 24, 24, 0, 0, 24, 24);
        return [...context.getImageData(0, 0, 24, 24).data].every(
          (value, index) => value === [15, 14, 18, 255][index % 4]);
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
            const prefix = `combat:${bank}:`;
            if (id.startsWith(prefix) && attackIds.has(id.slice(prefix.length))) strikes.add(id);
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
        await waitFor("the battle layers to use only the animation frame", () => run(`(() => {
          const next = state;
          try {
            // The next input frame can already be back in exploration or dialogue.
            state = { ...next,
              portrait: "portrait:PIC2.DAX:0:0:0", tiles: [[24, 24, "tile:unused-during-attack"]] };
            animationFrame = ${JSON.stringify(layeredAttack)};
            showScreen();
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
      assert.deepEqual(await run("[...combatSprites].sort()"), [...guards, ...attackIds].sort());
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
  if (battleFrame) console.log(`Battlefield artwork trace (${battleFrame} frames):`, battleTrace);
} finally {
  socket?.close();
  chrome.kill();
  server.kill();
}
