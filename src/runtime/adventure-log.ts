import type { Cpu } from "../cpu/machine.js";
import { farCallObservers } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { commissions } from "./commission-journal.js";

const libraryRecords = [
  { entry: 7, title: "Fyerdetha's Discourses on Power", rewardFlag: 0x4aaa, reportCue: "WE FIND THESE DISCOURSES VALUABLE" },
  { entry: 19, title: "Urgund's Description of Darkness", rewardFlag: 0x4aab, reportCue: "THE COUNCIL WILL BE AMUSED BY THE DESCRIPTIONS" },
  { entry: 37, title: "Lex Geographica", rewardFlag: 0x4aac, reportCue: "THESE MAPS SHOULD HELP US TO LOCATE SEVERAL LEGENDARY BUILDINGS" },
  { entry: 8, title: "The History of the North", rewardFlag: 0x4aad, reportCue: "THESE HISTORIES CONTAIN MUCH USEFUL INFORMATION" },
  { entry: 21, title: "The Grand Historian's Records of the Arts of War", rewardFlag: 0x4aae, reportCue: "THE RECORDS PROVIDE INSIGHTS INTO MUCH THAT WAS PUZZLING" },
] as const;

const yarashPapers = [
  { entry: 33, cue: "TELLING YARASH TO JOIN OR DIE", title: "The Boss's ultimatum",
    detail: "The Boss ordered Yarash to join or die." },
  { entry: 49, cue: "AN UNSENT REPLY TO THIS LETTER", title: "Yarash's unsent reply",
    detail: "Yarash left an unsent reply on his desk." },
  { entry: 27, cue: "OFFERING A BOUNTY FOR A REAL SAHUAGIN", title: "The buccaneers' bounty",
    detail: "Yarash offered the buccaneers a bounty for a sahuagin." },
  { entry: 56, cue: "DANGERS IN THE MOUNTAINS TO THE NORTHWEST", title: "Warning about the northwest",
    detail: "Yarash warned an agent about dangers in the mountains to the northwest." },
  { entry: 40, cue: "A NOTE TO A TRAPPER ABOUT KOBOLDS AND HOBGOBLINS", title: "A note to a trapper",
    detail: "Yarash left a note about kobolds and hobgoblins." },
];

const kovelClues = [
  { id: "kovel-chase", trigger: "RUN OUT THE EAST DOOR. WILL YOU CHASE THEM?",
    title: "Thieves in Kovel Mansion", detail: "Two thieves fled through the east door after their attack failed.",
    nextStep: "Choose Yes to chase the thieves through the east door, or continue searching the mansion." },
  { id: "kovel-thieves-split", trigger: "THE TWO THIEVES SPLIT; ONE GOING THROUGH THE EAST DOOR",
    title: "The thieves split up", detail: "One ran east and the other ran south.",
    nextStep: "Follow the thieves through the south or east door, or resume searching the mansion." },
  { id: "kovel-guildmaster", trigger: "I AM THE GUILD MASTER. IF YOU RELEASE ME",
    title: "The guildmaster asks for mercy", detail: "He claims his thieves will stop attacking if the party releases him.",
    nextStep: "Choose Attack to confront the guildmaster, or Release to take him at his word." },
  { id: "kovel-guildmaster-escaped", trigger: "AFTER YOU RELEASE HIM THE THIEF SLOWLY WALKS TOWARD THE FAR DOOR",
    title: "The guildmaster escaped", detail: "The thief taunted the party and ran away after being released.",
    nextStep: "The guildmaster fled after being released. Search the remaining rooms for the thieves." },
  { id: "kovel-thief-ambush", trigger: "AS YOU ENTER THE ROOM YOU ARE AMBUSHED BY SOME THIEVES",
    title: "Mansion ambush", detail: "Thieves attacked the party inside the mansion.",
    nextStep: "Fight off the ambush and continue searching Kovel Mansion for the thieves." },
  { id: "kovel-guild-files", trigger: "YOU STUFF THE FILES INTO YOUR JOURNAL UNDER ENTRIES 38 AND 51",
    title: "Files found in the mansion", detail: "Read journal entries 38 and 51 for the papers found on the floor.",
    nextStep: "Read journal entries 38 and 51, then continue searching the mansion for the thieves." },
  { id: "kovel-prisoner-papers", trigger: "YOU COPY THE PAPERS INTO YOUR JOURNAL UNDER JOURNAL ENTRY 48",
    title: "The jailed thief's papers", detail: "The dying thief warned that his boss had allies everywhere and gave the party some papers.",
    nextStep: "Read journal entry 48 for the jailed thief's papers, then continue searching Kovel Mansion." },
];
const kovelObjectives = new Map(kovelClues.map(({ id, nextStep }) => [id, nextStep]));
kovelObjectives.set("kovel-guildmaster-confronted", "After the fight with the guildmaster, continue searching Kovel Mansion for the thieves.");
kovelObjectives.set("kovel-chase-ended", "Continue searching Kovel Mansion for the thieves.");
kovelObjectives.set("kovel-thief-ambush-cleared", "Continue searching the mansion for the remaining thieves.");

/** Observe the Pascal strings actually sent to the guest's text display. */
export function observeAdventureLog(cpu: Cpu, slice: LoadedSlice, trainer?: LoadedSlice,
  onMessage?: (message: string) => void): () => string {
  if (slice.index !== 3) throw new Error("The PoR adventure log requires overlay slice 3");
  const chunks: string[] = [];
  farCallObservers.set(cpu, (seg, off) => {
    if (seg !== 0x198) return;
    const adventureMessage = off === 0x39 && cpu.cs === slice.loadPara;
    // The trainer reports fee and experience refusals through the colored text entry.
    const trainingMessage = off === 0x5c && cpu.cs === trainer?.loadPara &&
      [0x2a02, 0x2ce1].includes(cpu.read16(cpu.ss, cpu.sp));
    if (!adventureMessage && !trainingMessage) return;
    const argument = cpu.sp + (trainingMessage ? 6 : 4);
    const offset = cpu.read16(cpu.ss, argument);
    const segment = cpu.read16(cpu.ss, argument + 2);
    const length = cpu.read8(segment, offset);
    let message = "";
    for (let i = 1; i <= length; i++) {
      const char = cpu.read8(segment, offset + i);
      if (char === 13) message += "\n";
      else if (char >= 32 && char <= 126) message += String.fromCharCode(char);
    }
    if (message.trim()) {
      chunks.push(message);
      onMessage?.(message);
    }
  });
  return () => chunks.join("\n").trim();
}

export interface JournalLead {
  id: string;
  title: string;
  detail: string;
  status?: "offered" | "accepted" | "ready-to-report" | "reward-pending" | "turned-in";
  clearedEncounters?: number;
  textileBox?: "sealed" | "opened";
  rewardOutcome?: "unpaid";
  rescueDistractionActive?: boolean;
}

export interface JournalObjective {
  title: string;
  nextStep: string;
}

/** Pick the first unresolved commission the party has heard about. */
export function currentObjective(leads: readonly JournalLead[], trackedId?: string): JournalObjective {
  const unresolved = leads.filter(isOpenObjective);
  const selected = unresolved.find((lead) => lead.id === trackedJournalObjective(leads, trackedId));
  if (!selected && leads.some((lead) => lead.id === "gate-reward-direction" || lead.id === "gate-assault-handoff") &&
      leads.some((lead) => lead.id === "commission-gate" && lead.status === "turned-in") &&
      !leads.some((lead) => lead.id === "commission-castle")) {
    const summoned = leads.some((lead) => lead.id === "gate-assault-handoff");
    const escorted = leads.some((lead) => lead.id === "gate-council-escort");
    return { title: "Prepare the assault on Valjevo Castle", nextStep: summoned
      ? escorted ? "From the guard captain's hallway, go south, east, then south through the door to the council chambers."
        : "Follow the City Hall guards to the council chambers for the assault briefing."
      : "Return to the stronghold to lead the attack, as the clerk requested." };
  }
  if (!selected && leads.some((lead) => lead.id === "commission-castle" && lead.status === "turned-in")) {
    return { title: "Phlan is free", nextStep: "Explore any remaining uncleared areas if you wish." };
  }
  const tracked = selected
    ?? unresolved.find((lead) => lead.status === "ready-to-report" || lead.status === "reward-pending")
    ?? unresolved.find((lead) => lead.status === "accepted")
    ?? unresolved.find((lead) => lead.id !== "commission-records")
    ?? unresolved[0];
  if (tracked?.id === "podal-shrine-meeting") {
    return { title: tracked.title, nextStep: tracked.detail };
  }
  if (tracked?.id.startsWith("mendor-book-")) return { title: tracked.title, nextStep: tracked.detail };
  const commission = commissions.find(({ id }) => tracked?.id === `commission-${id}`);
  if (commission) {
    const knows = (id: string) => leads.some((lead) => lead.id === id);
    if (tracked?.status === "ready-to-report" || tracked?.status === "reward-pending") {
      if (commission.id === "sokal" && tracked.status === "ready-to-report" && knows("sokal-departure")) {
        if (knows("sokal-back-in-phlan")) {
          return { title: commission.title, nextStep: "From the New Phlan pier, follow the waterfront west toward City Hall. Enter and report to the council clerk that Sokal Keep is secured." };
        }
        const ferry = knows("sokal-return-pier") ? "Choose Yes at the south pier to take the boat to New Phlan." : "Take the boat to New Phlan.";
        return { title: commission.title, nextStep: `Use Ferran's password, SAMOSUD, if the undead stop you. Leave through the south gate. ${ferry} Report to the council clerk at City Hall.` };
      }
      if (commission.id === "castle" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Back in New Phlan, head east from the west gate, then turn south into City Hall. Report Tyranthraxus's defeat to the council clerk." };
      }
      if (commission.id === "castle" && tracked.status === "reward-pending") {
        return { title: commission.title, nextStep: "Finish collecting the final council reward. Choose Share to divide the coins, then Exit." };
      }
      if (commission.id === "kobolds" && tracked.status === "ready-to-report" && knows("kobold-king-fell")) {
        if (knows("kobold-caves-left")) {
          const route = knows("phlan-return-ferry")
            ? "If you're still outside New Phlan, choose Take Boat at the return dock."
            : "Head back to New Phlan.";
          return { title: commission.title, nextStep: `${route} Tell the council clerk at City Hall that the king fell into his own pit.` };
        }
        const report = "Leave the kobold caves and tell the council clerk at City Hall that the king fell into his own pit.";
        const passage = "If you're still at the pit, retrace the secret passage: one square west, one north, four west, then south into the throne room.";
        const exit = "From the throne, go south five squares, west one, south one, then west to the tables. From the tables, go south two, east one, south two, west one, south one, east three, then south to the exit.";
        return { title: commission.title, nextStep: knows("kobold-king-secret-door") ? `${passage} ${exit} ${report}` : report };
      }
      if (commission.id === "ohlo" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Take the package back to Ohlo and choose Give when he asks for the potion." };
      }
      if (commission.id === "rescue" && tracked.status === "reward-pending") {
        return { title: commission.title, nextStep: "Accept the council reward. In the treasure menu, choose Take for the items you want, then Exit." };
      }
      if (commission.id === "nomads" && tracked.status === "ready-to-report" && knows("nomad-shaman-reward")) {
        const report = "Report what happened at the Nomad Camp to the council clerk in New Phlan.";
        return { title: commission.title, nextStep: knows("nomad-mourning")
          ? `Leave the camp as the shaman requested. ${report}`
          : "Collect the shaman's reward. Choose Share to divide the coins, then Exit to continue." };
      }
      if (commission.id === "river" && tracked.status === "ready-to-report") {
        if (knows("river-recovery")) {
          return { title: commission.title, nextStep: "If you're still by the Barren River, skirt it to the east and head south to the landing. Choose Take Boat to New Phlan, then report to the council clerk at City Hall." };
        }
        if (knows("river-fountain-blast")) {
          return { title: commission.title, nextStep: "Check the party after the blast, then leave the pyramid and report to the council clerk in New Phlan." };
        }
      }
      if (commission.id === "lizardmen" && tracked.status === "ready-to-report" && knows("swamp-alliance-averted")) {
        return { title: commission.title, nextStep: "If you're still at Lizardman Keep, leave through the south drawbridge. From the keep's overland entrance, head two squares west, then south to the East Overland ferry. Back in New Phlan, report the elder's pledge to the council clerk." };
      }
      if (commission.id === "lizardmen" && tracked.status === "reward-pending") {
        return { title: commission.title, nextStep: "Finish accepting the council reward. In the treasure menu, choose Share to divide the coins, then Exit." };
      }
      if (commission.id === "bane" && tracked.status === "ready-to-report" && knows("bane-cleric-dispatch")) {
        return { title: commission.title, nextStep: "Read journal entry 25, then tell the council clerk at City Hall that the temple was recovered." };
      }
      if (commission.id === "textile" && tracked.status === "ready-to-report" && knows("textile-handoff")) {
        return { title: commission.title, nextStep: "The City Watch took the treasure. Go to the council clerk at City Hall to collect the reward they mentioned." };
      }
      if (commission.id === "auction" && tracked.status === "ready-to-report") {
        const outcome = knows("auction-cancelled")
          ? (knows("auction-ogre-searched") ? "that the auction was cancelled and the ogre had no item" : "that the auction was cancelled")
          : knows("auction-garwin-escaped") ? "that the auctioneer called the fleeing man Garwin"
          : knows("auction-exchange") ? "that a man and an ogre exchanged the wand for a large bag"
          : knows("auction-buyer-unseen") ? "that the auction ended before the party could identify the buyer"
          : undefined;
        const item = knows("auction-wand-of-fear") ? "that the weapon was a Wand of Fear"
          : knows("auction-wand-of-illumination") && knows("auction-staff-of-command")
            ? "that onlookers disagreed, calling it a Wand of Illumination or a Staff of Command"
          : knows("auction-wand-of-illumination") ? "that an onlooker called it a Wand of Illumination"
          : knows("auction-staff-of-command") ? "that an onlooker called it a Staff of Command"
          : undefined;
        const nextStep = `Report ${outcome ?? item ?? "what the party saw at the auction"} to the council clerk at City Hall.`;
        return { title: commission.title, nextStep: outcome && item ? `${nextStep} Also report ${item}.` : nextStep };
      }
      return { title: commission.title, nextStep: tracked.detail };
    }
    let nextStep = tracked?.status === "accepted" ? commission.afterAcceptance ?? commission.next : commission.next;
    if (commission.id === "auction" && tracked?.status === "accepted") {
      if (knows("auction-bidding")) nextStep = "Stay to see who wins the bidding. Report what you witness to the council clerk.";
      else if (knows("auction-started")) nextStep = "Stay and watch the bidding. Choose Stand and Listen to follow the sale, Listen to Comments to hear the crowd, or Move In Closer to try to identify the item.";
      else if (knows("auction-plaza-approach-chosen")) nextStep = "From the plaza entrance, head east along the lane, then turn south toward the auctioneer.";
      else if (knows("auction-plaza-entry")) nextStep = "Disguise the party or sneak past the crowd. Find the auctioneer in Podal Plaza and observe the sale.";
      else if (knows("harbor-routes-reopened")) nextStep = "Choose West at the harbor master's ferry menu, then look for Podal Plaza.";
    }
    if (commission.id === "slums" && tracked?.clearedEncounters !== undefined) nextStep = tracked.detail;
    if (commission.id === "textile") {
      const carriedKey = leads.find(({ id }) => id === "textile-prison-key-carried");
      if (tracked?.textileBox) {
        nextStep = tracked.detail;
        if (knows("phlan-return-ferry")) nextStep += " At the return dock, choose Take Boat.";
      }
      else if (knows("textile-iron-box")) nextStep = "Choose Take It Unopened to preserve Cadorna's family seal, or Open It to see what's inside.";
      else if (knows("textile-ogre-chief")) nextStep = "Defeat the ogre chief to recover Cadorna's treasure.";
      else if (knows("textile-east-wall")) nextStep = "Turn east where Skullcrusher pointed out the secret door. Use Search and move through the wall.";
      else if (knows("textile-secret-door")) nextStep = "Follow Skullcrusher's clue and search southeast for the secret door to the hobgoblin leader.";
      else if (knows("textile-prisoner-killed")) nextStep = "Search the remaining rooms of the western textile building for Cadorna's treasure.";
      else if (knows("textile-prisoner-left")) nextStep = "Continue searching the western textile building for Cadorna's treasure.";
      else if (knows("textile-prisoner-freed")) nextStep = "Parlay with the freed prisoner. Make room in the party if you want him to join.";
      else if (carriedKey) nextStep = carriedKey.detail;
      else if (knows("textile-grishnak-defeated") && (knows("textile-prison-key-needed") || knows("textile-padlocks-resisted"))) nextStep = "Check the loot from Grishnak's fight for the brass key. Take it back to the prisoner and choose Free, then Unlock.";
      else if (knows("textile-grishnak") && (knows("textile-prison-key-needed") || knows("textile-padlocks-resisted"))) nextStep = "Overcome Grishnak at the bone altar and check the battle loot for a key. Return to the chained prisoner and choose Free, then Unlock.";
      else if (knows("textile-prison-key-needed") || knows("textile-padlocks-resisted")) nextStep = "From the chained prisoner, head north through the guards' room and search the adjoining rooms for a key. Return to the prisoner and choose Free, then Unlock.";
      else if (knows("textile-prisoner-fought-leader")) nextStep = "Choose Free and try to open the prisoner's padlocks. He fought the hobgoblin leader and may know how to reach him.";
      else if (knows("textile-prisoner")) nextStep = "Speak with the prisoner in the western building and find a way to open his padlocks. Read journal entry 47.";
      else if (knows("textile-skullcrusher-mark")) nextStep = "Search the rooms near Skullcrusher's mark for whoever left it.";
      else if (knows("textile-courtyard-cleared")) nextStep = "Cross the quiet courtyard and search the western textile building for Cadorna's treasure.";
      else if (knows("textile-courtyard-ambush")) nextStep = "Prepare for the hobgoblin ambush before crossing the courtyard toward the western textile building.";
      else if (knows("textile-restal-route")) nextStep = "From the main well where Restal left you, search the western textile building for Cadorna's treasure.";
      else if (knows("textile-restal-dismissed")) nextStep = "Restal sent you back up the well. Look for another way into the Textile House, then search the western building for Cadorna's treasure.";
      else if (knows("textile-restal-blindfold")) nextStep = "Choose Yes to let Restal guide you blindfolded, or No to return to the well.";
      else if (tracked?.status === "accepted") nextStep = tracked.detail;
    }
    if (commission.id === "ohlo" && tracked?.status === "accepted") {
      if (knows("ohlo-booth")) nextStep = "At the booth, choose Speak and enter OHLO. Bring the package back to him.";
      else if (knows("ohlo-rope-guild")) nextStep = "Look for the booth on the east side of the Rope Guild. Approach it from the west, then give Ohlo's name.";
      else if (knows("ohlo-rope-guild-entry")) nextStep = "From the spot marked by the Rope Guild notice, go south into the building and look for the booth.";
    }
    if (commission.id === "sokal") {
      if (knows("sokal-pale-form-wrong-word")) {
        nextStep = "The pale figure vanished after hearing the word. Reload a save from before the encounter to try again.";
        if (knows("sokal-parchment")) nextStep += " Check the parchment for another word.";
      }
      else if (knows("sokal-ferran-lie")) nextStep = "Ferran rejected the lie. Step away from the altar and return. Speak the same word, then tell him the truth about Phlan.";
      else if (knows("sokal-ferran")) nextStep = "Hear Ferran out and answer him truthfully about Phlan.";
      else if (knows("sokal-pale-form") && knows("sokal-parchment")) nextStep = "Talk to the pale form. When asked for a word, try one from the parchment.";
      else if (knows("sokal-chapel")) nextStep = "Head south from the chapel entrance. At the blocked passage, go around it to the east, then turn back west and approach the altar on the south wall.";
      else if (knows("sokal-courtyard-note")) nextStep = "Read journal entry 57, then search the doors on the south side of the courtyard.";
      else if (knows("sokal-ambush")) {
        nextStep = "Heal the party and ready weapons and spells before returning to the courtyard.";
        if (knows("phlan-temple-healing")) nextStep += " The Temple of Tyr in New Phlan offers paid healing.";
        else if (knows("phlan-sune-healing")) nextStep += " Priestess Joy of Sune offers healing in New Phlan.";
        if (knows("sokal-arrival")) {
          nextStep += " At the landing, choose Encamp, then Magic and Memorize. Rest there to replenish spent spells before heading back to the courtyard.";
        }
        if (knows("phlan-arena-recruits")) {
          nextStep += " Ask the arena master for reinforcements if needed. Arena recruits act on their own in battle. Prepare spells on a character you control to choose their targets.";
        }
      }
      else if (knows("sokal-armory-opened")) nextStep = "Ready any gear you took under View and Items, then explore beyond the armory.";
      else if (knows("sokal-armory-stands")) nextStep = "Decide whether to take the gear on the stands, then continue exploring Sokal Keep.";
      else if (knows("sokal-hidden-armory")) nextStep = "Follow the glow to the northwest corner of the hidden armory.";
      else if (knows("sokal-haunt-diary")) nextStep = "Read journal entry 3, then continue searching the keep.";
      else if (knows("sokal-haunt-floorboard")) nextStep = "Check the floorboard the spirit pointed out for the defenders' diary.";
      else if (knows("sokal-patrol-passed") && !knows("sokal-departure")) {
        const password = knows("sokal-parchment") ? "SHESTNI" : "the word the patrol accepted";
        nextStep = `Explore the keep. Give the patrols ${password} again when they ask for a word, or choose Yes if they offer to repeat the password.`;
      }
      else if (knows("sokal-patrol-rejected-word") && knows("sokal-parchment")) {
        nextStep = "The patrol rejected the word. If you meet another patrol, try a different word from the parchment.";
      }
      else if (knows("sokal-parchment")) nextStep = "Keep exploring. If you speak to an undead patrol, try a word from the parchment.";
      else if (knows("sokal-reeds")) nextStep = "Look through the mound of reeds west of the gates before entering the keep.";
      else if (knows("sokal-arrival")) nextStep = "Scout the keep and look for clues to the haunting.";
      else if (knows("passage-sokal")) nextStep = "Catch the boat to Sokal Keep at the end of the pier.";
    }
    if (commission.id === "bottle") {
      if (knows("bottle-recovered")) nextStep = "Return to Diogenes with the bottle so he can explain how to use it.";
      else if (knows("kobold-cave-fork")) nextStep = "Choose Large or Small at the kobold caves. Search inside for the silver bottle, then bring it back to Diogenes.";
    }
    if (commission.id === "kobolds") {
      if (knows("kobold-king-quarters")) nextStep = "Defeat the king's guards and find him in his quarters.";
      else if (knows("kobold-king-secret-door")) nextStep = "Go through the secret door in the north wall. On the other side, turn east and go two squares to the king's quarters.";
      else if (knows("kobold-king-escaped")) nextStep = "Use Search in the throne room to look for the route the king took.";
      else if (knows("kobold-party-escaped")) nextStep = "Regroup if needed, then confront the king at the throne.";
      else if (knows("kobold-fatima-intervened")) nextStep = "Help Princess Fatima fight the kobolds who took the party prisoner.";
      else if (knows("kobold-prison-cell")) nextStep = "Look for a way out of the cell. Check the party's equipment before returning to the throne.";
      else if (knows("kobold-prison-escort")) nextStep = "See where the kobolds take the party and watch for a chance to escape.";
      else if (knows("kobold-surrender-offer")) nextStep = "Choose Surrender to lay down your arms, or Fight to face the king's forces again.";
      else if (knows("kobold-throne-envoys")) nextStep = "Confront the king and the envoys at the throne.";
      else if (knows("kobold-guide-arrived")) nextStep = "From where the guide stopped, go one square north, two squares west, then north to the throne room.";
      else if (knows("kobold-guide-follow")) nextStep = "Follow the kobold guide to the king.";
      else if (knows("kobold-guide-asleep")) nextStep = "The guide went back to sleep. Explore the caves for another way to the king.";
      else if (knows("kobold-guide-offer")) nextStep = "Choose Yes if you want the guide to escort you to the king.";
      else if (knows("kobold-cave-fork")) nextStep = "Explore the caves and look for the tribe that the enemy is recruiting.";
    }
    if (commission.id === "bane") {
      const templeEntrance = knows("podal-bane-temple-location")
        ? "the temple entrance northeast of Podal Plaza"
        : "the Temple of Bane entrance";
      if (knows("bane-altar-ambush")) nextStep = "Defeat the half-orc cleric and the orcs who attacked when you destroyed the altar.";
      else if (knows("bane-defiled-altar")) nextStep = "Choose Destroy Altar at the desecrated altar when the party is ready.";
      else if (knows("bane-temple-admitted")) nextStep = "Continue into the Temple of Bane and look for a way to cleanse it.";
      else if (knows("bane-temple-guards-hostile")) nextStep = "Get past the temple guards or withdraw and look for another way in.";
      else if (knows("bane-temple-symbol-carried")) nextStep = knows("bane-temple-guard-check")
        ? "Choose Let Him Touch You so the guard can find the holy symbol the party is carrying."
        : `Take the holy symbol the party is carrying to ${templeEntrance}.`;
      else if (knows("bane-temple-symbol")) nextStep = `Bring a holy symbol of Bane to ${templeEntrance}.`;
      else if (knows("bane-temple-guard-check")) nextStep = "At the entrance, decide whether to let the blind guard check the party.";
      else if (knows("bane-dirten")) nextStep = `Decide whether to accompany Dirten. If you agree, cross the river with him and head to ${templeEntrance}.`;
    }
    if (commission.id === "records") {
      if (leads.some(({ id, status }) => /^mendor-book-\d+$/.test(id) && status === "ready-to-report")) {
        nextStep = "Bring the recovered records to the council clerk at City Hall. You can return to the stacks for more.";
      } else if (leads.some(({ id }) => /^mendor-book-\d+$/.test(id))) {
        nextStep = "Read the passages you copied from Mendor's books. Search the other stacks for more accounts of old Phlan.";
      } else if (knows("mendor-library-stacks")) {
        nextStep = "Use Search in the library stacks and examine the books for accounts of old Phlan.";
      } else if (knows("mendor-storeroom-map")) {
        nextStep = "Use the kobolds' map in journal entry 10 to find the library stacks. Search the shelves for records of old Phlan.";
      } else if (knows("sokal-mendor")) {
        nextStep = "Search Mendor's overrun library for records of old Phlan. Bring worthwhile finds to the council clerk.";
      }
    }
    if (commission.id === "kovel") {
      for (const { id } of leads) nextStep = kovelObjectives.get(id) ?? nextStep;
    }
    if (commission.id === "graveyard" || commission.id === "bottle-vampire") {
      if (knows("graveyard-vampire-north-wall")) nextStep = "Search the northern wall the mystic pointed out, then confront the vampire.";
      else if (knows("graveyard-vampire-escaped")) nextStep = "The vampire escaped as vapor. Search the crypts for where it fled.";
      else if (knows("graveyard-vampire-stairs")) nextStep = "Return to the wooden stairs in the graveyard and choose Yes to descend into the pit.";
      else if (commission.id === "bottle-vampire" && knows("graveyard-vampire-location")) nextStep = "Go to the northeast corner of Valhingen Graveyard. Use the bottle when you confront the vampire.";
      else if (knows("graveyard-vampire-location")) nextStep = "Search the northeast corner of Valhingen Graveyard for the vampire's lair.";
    }
    if (commission.id === "river") {
      if (knows("river-equipment-destroyed")) nextStep = "Leave the pyramid and report the end of the river pollution to the council clerk in New Phlan.";
      else if (knows("river-equipment-damaged")) nextStep = "The damaged pipes are whining and the liquid is bubbling. Continue destroying the equipment or choose Move Quickly Away to retreat.";
      else if (knows("river-fountain")) nextStep = "At the fountain, choose Destroy the Equipment to shut down the machinery pumping the foul liquid.";
      else if (knows("river-pump-prisoners-freed")) nextStep = "Read journal entry 35 for what the prisoners told you about Yarash. Continue looking for the source of the foul water.";
      else if (knows("river-pump-prisoners-hostile")) nextStep = "Get clear of the hostile pumping room, then continue searching the pyramid for the source of the foul water.";
      else if (knows("river-pump-prisoners")) nextStep = "Advance until Parlay appears, then try speaking kindly to the shackled workers about the pollution.";
      else if (knows("river-inner-doors")) nextStep = "Follow the hidden passages inside the pyramid and look for the source of the foul water.";
      else if (knows("river-entrance-inside")) nextStep = "Explore the passage ahead from the entrance. Follow the directions the game gives when it reveals a hidden door. The secret door behind the entrance marks the way back.";
      else if (knows("river-secret-door")) nextStep = "Choose Enter to go through the secret door and look for the source of the foul water.";
      else if (knows("river-rowboat")) nextStep = "Take the rowboat to the pyramid by choosing Yes at the boat prompt.";
    }
    if (commission.id === "rescue") {
      if (knows("rescue-heir-left-behind")) nextStep = "Return to the council clerk and report what happened to the boy.";
      else if (knows("rescue-heir-purchased") || knows("rescue-heir-freed") || tracked?.status === "accepted") {
        nextStep = knows("rescue-escape-alarm")
          ? "Head straight for the front gate with the boy."
          : knows("rescue-escape-guards")
            ? "Fight off the guards, then escort the boy out through the front gate."
            : "Escort the boy out through the base gate and return him to New Phlan.";
      }
      else if (knows("rescue-captain-price")) nextStep = "Choose Buy the Boy if you accept the captain's price, or prepare to fight.";
      else if (knows("rescue-animals-recaptured") && !leads.some((lead) => lead.id === "rescue-stampede" && lead.rescueDistractionActive)) {
        nextStep = "The animals were recaptured. Return to the animal pens and release them again if offered, or try the guarded slave pen.";
      }
      else if (knows("rescue-inside-pen")) nextStep = "Choose Get Him and escort the boy out of the base.";
      else if (knows("rescue-stampede")) nextStep = "Head to the slave pen while the guards are rounding up the animals.";
      else if (knows("rescue-animal-pens")) nextStep = "Choose Release Animals at the animal pens to draw the guards away from the slave pen.";
      else if (knows("rescue-sneak-blocked")) nextStep = "The guards spotted your approach. Choose Attack Guards or Leave to try another route.";
      else if (knows("rescue-pen-gate")) nextStep = "At the gate, choose Try to Sneak By or Attack.";
      else if (knows("rescue-merchant-alarm")) nextStep = "The merchant called his guards. Once clear of them, return to the slave pen to reach the boy.";
      else if (knows("rescue-pen-options")) nextStep = "Choose Sneak Into Pen or Attack Guards to reach the boy.";
      else if (knows("rescue-identified-heir")) nextStep = "The boy with the heart-shaped birthmark is in the pen. Choose Rescue Boy when the merchant approaches.";
      else if (knows("rescue-slave-pen")) nextStep = "Look among the prisoners in the slave pen for the missing heir.";
      else if (knows("rescue-base-entered")) nextStep = "Follow the fence inside the Buccaneer Base and look for the slave pen.";
      else if (knows("rescue-buccaneer-base")) nextStep = "Enter the Buccaneer Base and find the pen where the slavers are holding prisoners.";
      else if (knows("rescue-slaver-trail")) nextStep = "Follow the slavers toward the Buccaneer Base.";
    }
    if (commission.id === "lizardmen") {
      if (knows("swamp-alliance-averted")) nextStep = "Leave the swamp as the elder requested and report his pledge to the council clerk.";
      else if (knows("swamp-challenge-hostile") || knows("swamp-friend-word-rejected") || knows("swamp-elder-attacked")) nextStep = "The peaceful meeting ended. Withdraw if necessary and look for another way to prevent the alliance.";
      else if (knows("swamp-champion-requested")) nextStep = "If you agree to champion the elder, choose a party member to face the challenger.";
      else if (knows("swamp-elder-story")) nextStep = "Read journal entry 31 for the elder's story and hear out the challenge.";
      else if (knows("swamp-friend-word")) nextStep = knows("river-pump-prisoners-freed")
        ? "Read journal entry 35 and give the tribal friend-word the freed prisoners taught you."
        : "The elder asks for a tribal friend-word. Find the people he says were rescued or ask the tribe about the alliance another way.";
      else if (knows("swamp-peaceful-elder")) nextStep = "Parlay with the elder who raised his hand in peace.";
      else if (knows("swamp-anti-magic")) nextStep = "Search the ruined castle for the tribe and keep the anti-magic shell in mind.";
      else if (knows("swamp-drawbridge")) nextStep = "Use Enter to cross the drawbridge into the ruined castle. The surrounding quicksand makes the bridge the safe crossing.";
      else if (knows("river-pump-prisoners-freed")) nextStep = "Read journal entry 35 for the freed prisoners' advice on getting help from their tribe in the swamp.";
    }
    if (commission.id === "nomads") {
      if (knows("nomad-mourning")) nextStep = "Leave the camp as the shaman requested, then report what happened to the council clerk.";
      else if (knows("nomad-shaman-reward")) nextStep = "Collect the shaman's reward. Choose Share to divide the coins, then Exit to continue.";
      else if (knows("nomad-fled-finale")) nextStep = "The headman went to finish the fight with his surviving guards. Continue to hear what happened.";
      else if (knows("nomad-kobold-attack")) nextStep = "The kobolds are attacking the camp. Choose Combat when prompted to help the nomads repel them.";
      else if (knows("nomad-war-cries")) nextStep = "Press Enter to continue and see what is happening outside the hut.";
      else if (knows("nomad-declined-aid")) nextStep = "The party declined to defend the camp. Check with the council clerk about the commission.";
      else if (knows("nomad-rest-offer")) nextStep = "Stay in the camp. Use Encamp to memorize spells, then rest to prepare for the possible attack.";
      else if (knows("nomad-promised-aid")) nextStep = "Press Enter to hear the headman's instructions before you prepare to defend the camp.";
      else if (knows("nomad-stay-or-leave")) nextStep = "Choose Stay and Fight if you will defend the camp, or Leave if you decline.";
      else if (knows("nomad-kobold-warning")) nextStep = "Hear out the headman and decide whether to stay and help against the kobolds.";
      else if (knows("nomad-feast-attended") || knows("nomad-headman-talk")) nextStep = "Continue through the feast and hear what Hassad Ahwal has to say.";
      else if (knows("nomad-refused-to-leave")) nextStep = "The nomads turned hostile after the party refused to leave. Get clear of the camp.";
      else if (knows("nomad-feast-declined")) nextStep = "The headman asked the party to leave. Leave peacefully and check with the council clerk about the commission.";
      else if (knows("nomad-feast-invitation")) nextStep = "Accept the headman's feast invitation to speak with him further.";
      else if (knows("nomad-sentries")) nextStep = "Parlay with the nomads at the camp so you can speak with their headman.";
      else if (knows("nomad-swords-ready")) nextStep = "Press Enter to continue through the camp's warning, then choose Parlay when the nomads wait for your response.";
      else if (knows("nomad-camp-found")) nextStep = "Choose Enter at the camp and approach the nomads to speak with them.";
    }
    if (commission.id === "zhentil") {
      if (knows("zhentil-envoy-left") && knows("zhentil-packet-delivered")) nextStep = "Return to the council clerk in New Phlan and report the delivery.";
      else if (knows("zhentil-climbable-wall")) nextStep = "Choose Climb Over Wall to leave the outpost.";
      else if (knows("zhentil-quarters-attacked")) nextStep = "Get past the guards and look for a way out of the outpost.";
      else if (knows("zhentil-night")) nextStep = "Choose Goto Sleep or Sleep With a Watch in your quarters.";
      else if (knows("zhentil-dinner")) nextStep = "Speak with the commandant over dinner and follow the guard back to your quarters.";
      else if (knows("zhentil-relax")) nextStep = "Choose Relax in your quarters to wait for dinner.";
      else if (knows("zhentil-quarters")) nextStep = "Return to the entrance of your assigned quarters for the choice to wait or walk around.";
      else if (knows("zhentil-packet-delivered")) nextStep = "Follow the guard on the commandant's tour of the outpost.";
      else if (knows("zhentil-envoy-challenge")) nextStep = "Answer Yes when asked if you are the diplomatic envoys. Present the sealed packet to the commandant.";
      else if (knows("zhentil-sealed-packet")) nextStep = "Travel west to Zhentil Outpost and present the packet to its commandant with the seals intact.";
    }
    if (commission.id === "castle") {
      if (knows("castle-vote")) nextStep = "Choose Attack when each party member is asked to vote. Then defeat Tyranthraxus.";
      else if (knows("castle-dragon-interested")) nextStep = "Hear out the dragon before deciding how to answer him.";
      else if (knows("castle-audience-guards")) nextStep = "Defeat the two guards blocking the path to the dragon.";
      else if (knows("castle-audience")) nextStep = "Get past the guards in the audience hall and confront the bronze dragon.";
      else if (knows("castle-impostor")) nextStep = knows("castle-flaming-aura")
        ? "Continue searching the castle for the real Tyranthraxus. His own note says to recognize him by his flaming aura."
        : "Continue searching the castle for the real Tyranthraxus.";
      else if (knows("castle-giant-sentries-passed")) nextStep = "Continue past the giant sentries and search the castle for Tyranthraxus.";
      else if (knows("castle-giant-sentries")) nextStep = "The giant sentries demand a password. Give it if you know it, or withdraw and look for a way around them.";
      else if (knows("castle-cadorna-alarm") && knows("castle-cadorna-hedge")) {
        nextStep = "Cadorna raised the alarm. Once clear of the guards, ";
        if (knows("castle-hedge-gate-password")) nextStep += "use the password from the kitchen at the main gate, then ";
        nextStep += "take Cadorna's route through the hedge: left, right, right.";
      }
      else if (knows("castle-hedge-gate-password") && knows("castle-cadorna-hedge")) nextStep = "Use the password from the kitchen at the main gate, then take Cadorna's route through the hedge: left, right, right.";
      else if (knows("castle-hedge-gate-password")) nextStep = "Use the password from the kitchen at the main gate into the hedge maze.";
      else if (knows("castle-kitchen-slip")) nextStep = "Press Enter to read the slip the freed captive took from the overseer's pouch.";
      else if (knows("castle-cadorna-hedge")) nextStep = "Follow Cadorna's directions through the hedge: left, right, right.";
      else if (knows("castle-kitchen-oil") && !knows("castle-kitchen-captives-freed")) nextStep = "Choose Kill the Overseer and Free the Slaves, or Go Back Outside to regroup.";
      else if (knows("castle-kitchen-warning") && !knows("castle-kitchen-captives-freed")) nextStep = "The overseer threatened to throw boiling oil. Choose Kill the Overseer and Free the Slaves, or Go Back Outside.";
      else if (knows("castle-disguise")) nextStep = "Use the clothes offered by the resistance to move through the castle and find Tyranthraxus.";
      else if (knows("castle-genheeris-deal")) nextStep = "Continue to Tyranthraxus's audience hall. Genheeris agreed to help the party turn against him.";
      else if (knows("castle-al-hyam-notes")) nextStep = "Review Al-Hyam Dhazid's notes on the Pool of Radiance in journal entry 30, then continue searching Valjevo Castle for Tyranthraxus.";
      else if (knows("castle-records-thay") && !knows("castle-records-moonsea")) nextStep = "Continue reading the Valjevo records to learn more about Tyranthraxus's plans, or resume searching the castle.";
      else if (knows("kovel-castle-map-nw") && knows("kovel-castle-map-ne")) nextStep = "Review the northwest and northeast castle maps in journal entries 41 and 29, then return to Valjevo Castle.";
      else if (knows("kovel-castle-map-nw")) nextStep = "Review the northwest castle map in journal entry 41, then return to Valjevo Castle.";
      else if (knows("kovel-castle-map-ne")) nextStep = "Review the northeast castle map in journal entry 29, then return to Valjevo Castle.";
    }
    if (commission.id === "gate") {
      if (knows("gate-garrison-defeated")) nextStep = "Defeat the outside guards before reinforcements arrive, then report to the clerk.";
      else if (knows("stojanow-medusa-trapdoor")) nextStep = "Look for the garrison deeper in Stojanow Gate. Watch for the trapdoor the guards said leads to a medusa.";
      else if (knows("stojanow-assault-plans")) nextStep = "Find the garrison inside Stojanow Gate. The mage you overheard said they are preparing to attack Phlan.";
      else if (knows("gate-bugbear-ambush")) nextStep = "Get past the bugbears waiting just inside the gate, then look for the garrison.";
      else if (knows("gate-toll-paid")) nextStep = "Continue through the gate and look for the garrison inside.";
      else if (knows("gate-imposters")) nextStep = "The guards have challenged you. The encounter offers Flee, Surrender, or Attack.";
      else if (knows("gate-toll-refused")) nextStep = "The bugbear turned you away. Prepare for a fight before trying the gate again.";
      else if (knows("gate-toll-demand")) nextStep = "The bugbear asked for 15 gold. If you can pay, choose Yes at the gate.";
      else if (knows("gate-bugbears-let-go")) nextStep = "The bugbears let you go. Back away from the wall and try the main gate.";
      else if (knows("gate-tower-warning")) nextStep = "The tower guard warned you away from the wall. Return to the main entrance to look for a way in.";
      else if (knows("gate-wagon-entry")) nextStep = "Approach the entrance where the wagon got through. Watch for an opportunity to get past the bugbear guards.";
    }
    return { title: commission.title, nextStep };
  }
  return leads.some((lead) => lead.id === "council-commissions")
    ? { title: "Find a commission", nextStep: "Visit City Hall and ask the council clerk about available work." }
    : { title: "Explore New Phlan", nextStep: "Speak with people in town to learn about available work." };
}

export function isOpenObjective(lead: JournalLead): boolean {
  return lead.status !== undefined && lead.status !== "turned-in";
}

export function trackedJournalObjective(leads: readonly JournalLead[], trackedId?: string): string | undefined {
  if (trackedId && leads.some(lead => lead.id === trackedId && lead.status === "turned-in")) {
    if (trackedId === "commission-bottle") trackedId = "commission-bottle-vampire";
    else if (/^mendor-book-\d+$/.test(trackedId)) trackedId = "commission-records";
  }
  return leads.find(lead => lead.id === trackedId && isOpenObjective(lead))?.id;
}

// The council reward table starts at ECL address 4AA6. The encounter scripts
// write FE on success and the clerk changes that entry to FF after the reward.
// City Hall's reward dispatch indexes its ECL table at 0x4aa6. Only
// commissions with a dedicated completion entry belong here.
export const progressAddresses: Readonly<Record<string, number>> = {
  slums: 0x4abb,
  sokal: 0x4aa7,
  rescue: 0x4aa9,
  auction: 0x4ab0,
  graveyard: 0x4ab1,
  kovel: 0x4ab2,
  river: 0x4ab3,
  zhentil: 0x4ab4,
  lizardmen: 0x4ab5,
  kobolds: 0x4ab6,
  nomads: 0x4ab7,
  textile: 0x4ab8,
  gate: 0x4ab9,
  castle: 0x4aba,
  bane: 0x4abd,
  cadorna: 0x4abf,
};

/** Live possession is checked again when the journal opens and after a reload. */
export function journalInventoryLeads(cpu: Cpu, known: readonly JournalLead[], dataSegment: number): JournalLead[] {
  const wanted = new Map<number, JournalLead>();
  const knows = (id: string) => known.some((lead) => lead.id === id);
  if (knows("textile-prisoner") && !["textile-prisoner-freed", "textile-prisoner-left", "textile-prisoner-killed"].some(knows)) {
    wanted.set(75, { id: "textile-prison-key-carried", title: "Brass key in the party's pack",
      detail: "Bring the brass key to the chained prisoner and choose Free, then Unlock." });
  }
  if (knows("bane-temple-symbol") && !knows("bane-temple-admitted")) {
    wanted.set(74, { id: "bane-temple-symbol-carried", title: "The party has the holy symbol",
      detail: "The party is carrying the leather holy symbol needed at the Temple of Bane." });
  }
  if (!wanted.size) return [];
  const leads: JournalLead[] = [];
  // Overlay 3 at 287A implements FIND ITEM by walking
  // DS:5CF4 and the character +104 links, then +C8 inventories and item +2A links.
  const pointer = (segment: number, offset: number): number =>
    (cpu.read16(segment, offset + 2) << 16) | cpu.read16(segment, offset);
  const visited = new Set<number>();
  for (let actor = pointer(dataSegment, 0x5cf4); actor && !visited.has(actor);) {
    visited.add(actor);
    const segment = actor >>> 16;
    const offset = actor & 0xffff;
    for (let item = pointer(segment, offset + 0xc8); item && !visited.has(item);) {
      visited.add(item);
      const itemSegment = item >>> 16;
      const itemOffset = item & 0xffff;
      const type = cpu.read8(itemSegment, itemOffset + 0x2e);
      const lead = wanted.get(type);
      if (lead) {
        leads.push(lead);
        wanted.delete(type);
        if (!wanted.size) return leads;
      }
      item = pointer(itemSegment, itemOffset + 0x2a);
    }
    actor = pointer(segment, offset + 0x104);
  }
  return leads;
}

export function kovelJournalTransition(cpu: Cpu, dataSegment: number): number | undefined {
  if (cpu.read8(dataSegment, 0x82a2) !== 14) return;
  const cursor = cpu.read16(dataSegment, 0x494e);
  // The original COMBAT and EXIT instructions leave the cursor at these addresses.
  if (cursor === 0x9c92 || cursor === 0xb359) return cursor;
}

export function questProgress(cpu: Cpu, known: readonly JournalLead[], dataSegment: number): JournalLead[] {
  // ovl07:0E4C–0E57 resolves global ECL addresses through DS:4933.
  const base = cpu.read16(dataSegment, 0x4933);
  const segment = cpu.read16(dataSegment, 0x4935);
  if ((base | segment) === 0) return [];
  const global = (address: number) => cpu.read16(segment, base + 0x6e00 + address * 2);
  const progress: JournalLead[] = [];
  const kovelTransition = kovelJournalTransition(cpu, dataSegment);
  // Podal's entry menu stores the chosen approach in the local crowd state.
  if (cpu.read8(dataSegment, 0x82a2) === 18 && global(0x4a35) !== 0 &&
      known.some(({ id }) => id === "auction-plaza-entry")) {
    progress.push({ id: "auction-plaza-approach-chosen", title: "An approach to the auction",
      detail: "The party chose how to cross the crowd at Podal Plaza." });
  }
  if (global(progressAddresses.sokal!) === 254 && cpu.read8(dataSegment, 0x82a2) === 0 &&
      known.some(({ id }) => id === "sokal-return-pier")) {
    progress.push({ id: "sokal-back-in-phlan", title: "Back in New Phlan",
      detail: "The party returned to New Phlan with the Sokal Keep report." });
  }
  // ECL7 block 22 tracks the entrance separately from the interior doors.
  if ((global(0x4a4b) & 0x7e) && known.some(({ id }) => id === "river-entrance-inside")) {
    progress.push({ id: "river-inner-doors", title: "Hidden passages inside the pyramid",
      detail: "The party discovered a concealed door inside the pyramid. Check the direction given when each door is revealed." });
  }
  // The Sokal equipment script sets this flag after the treasure menu.
  if (global(0x4a21) === 255 && known.some(({ id }) => id === "sokal-armory-stands")) {
    progress.push({ id: "sokal-armory-opened", title: "Hidden armory treasure opened",
      detail: "The party opened the equipment cache in the hidden armory." });
  }
  if (cpu.read8(dataSegment, 0x82a2) === 27 && known.some(({ id }) => id === "kobold-king-fell")) {
    progress.push({ id: "kobold-caves-left", title: "Out of the kobold caves",
      detail: "The party returned to the overland route after the king fell." });
  }
  if (cpu.read8(dataSegment, 0x82a2) === 13 && global(0x4a0b) === 2 && known.some(({ id }) => id === "kobold-king-escaped")) {
    progress.push({ id: "kobold-king-secret-door", title: "Secret door in the north wall",
      detail: "The party found a hidden door in the kobold caves after the king escaped." });
  }
  if (kovelTransition === 0x9c92 &&
      known.some(({ id }) => id === "kovel-guildmaster") && !known.some(({ id }) => id === "kovel-guildmaster-escaped")) {
    progress.push({ id: "kovel-guildmaster-confronted", title: "Guildmaster confronted",
      detail: "The party chose to fight the guildmaster." });
  }
  if (kovelTransition === 0xb359) {
    const lastClue = known.filter(({ id }) => kovelObjectives.has(id)).at(-1);
    if (lastClue?.id === "kovel-chase" || lastClue?.id === "kovel-thieves-split") {
      progress.push({ id: "kovel-chase-ended", title: "Chase ended",
        detail: "The party stopped pursuing the fleeing thieves." });
    }
  }
  // Other ECL scripts reuse this variable for unrelated local events.
  if (cpu.read8(dataSegment, 0x82a2) === 14 && global(0x4a19) === 1 && known.some(({ id }) => id === "kovel-thief-ambush")) {
    progress.push({ id: "kovel-thief-ambush-cleared", title: "Mansion ambush cleared",
      detail: "The party defeated the thieves who set the ambush." });
  }
  for (const { entry, rewardFlag } of libraryRecords) {
    const record = known.find(({ id }) => id === `mendor-book-${entry}`);
    if (!record) continue;
    const state = global(rewardFlag);
    if (state === 254) progress.push({ ...record, status: "ready-to-report",
      detail: `Bring the record copied as journal entry ${entry} to the council clerk at City Hall.` });
    else if (state === 255) progress.push({ ...record, status: "turned-in",
      detail: `The council clerk acknowledged the record copied as journal entry ${entry}.` });
  }
  const stampede = known.find((lead) => lead.id === "rescue-stampede");
  if (stampede && global(0x49f2) === 1) {
    // This local flag is shared with other scripts and only identifies the
    // distraction while the party is inside Buccaneer Base.
    progress.push({ ...stampede, rescueDistractionActive: global(0x4a04) === 255 });
  }
  const shrineMeeting = known.find((lead) => lead.id === "podal-shrine-meeting");
  if (shrineMeeting) {
    if (known.some((lead) => lead.id === "podal-shrine-ambush")) {
      progress.push({ ...shrineMeeting, status: "turned-in", title: "Shrine meeting ended in an ambush",
        detail: "The recruiter turned the gathered creatures against the party." });
    } else if (!shrineMeeting.status) {
      progress.push({ ...shrineMeeting, status: "accepted" });
    }
  }
  // The Textile House script sets this state after the temple encounter returns successfully.
  if (global(0x4a74) === 2 && known.some(({ id }) => id === "textile-grishnak")) {
    progress.push({ id: "textile-grishnak-defeated", title: "Grishnak defeated",
      detail: "The fight at the bone altar is over. Check the battle loot for the key to the prisoner's padlocks." });
  }
  for (const commission of commissions) {
    const id = `commission-${commission.id}`;
    if (!known.some((lead) => lead.id === id)) continue;
    if (commission.id === "ohlo") {
      const potion = global(0x4a81);
      const request = global(0x4a04);
      if (potion === 250 && request === 250) {
        progress.push({ id, title: `${commission.title} - potion found`,
          detail: "Return to Ohlo with the potion.", status: "ready-to-report" });
      } else if (potion === 255 && request === 255 && known.some((lead) => lead.id === "ohlo-delivered")) {
        progress.push({ id, title: `${commission.title} - turned in`,
          detail: "Ohlo drank his potion and settled the reward.", status: "turned-in" });
      }
      continue;
    }
    const address = progressAddresses[commission.id];
    if (address === undefined) continue;
    const value = global(address);
    // The script can set 254 inside the base, before the party reaches the front gate.
    if (commission.id === "rescue" && (value === 1 || value === 254) && global(0x49f2) === 1) {
      progress.push({ id, title: "Escort the Bivant heir out", detail: "Take the boy out through the front gate.", status: "accepted" });
      continue;
    }
    if (commission.id === "rescue" && (value === 128 || value === 255) &&
        known.some(({ id }) => id === "rescue-heir-left-behind" || id === "rescue-reprimand")) {
      progress.push({
        id, title: value === 128 ? "Report the failed rescue" : "Rescue closed without payment",
        detail: value === 128 ? "Return to the council clerk and report what happened to the boy."
          : "The clerk acknowledged the failed rescue.",
        status: value === 128 ? "ready-to-report" : "turned-in",
        ...(value === 255 && { rewardOutcome: "unpaid" }),
      });
      continue;
    }
    if (commission.id === "textile" && value === 255 && known.some((lead) => lead.id === "textile-confrontation")) {
      progress.push({ id, title: `${commission.title} - closed without payment`,
        detail: "Cadorna confronted the party over the opened box and left without paying.",
        status: "turned-in", rewardOutcome: "unpaid" });
      continue;
    }
    if (commission.id === "textile" && value < 254) {
      const box = global(0x4ac8);
      if (box === 1 && cpu.read8(dataSegment, 0x82a2) === 2 &&
          known.some(lead => lead.id === id && lead.textileBox === "opened") &&
          known.some(lead => lead.id === "textile-restal-seal-offer")) {
        progress.push({ id: "textile-restal-seal-replaced", title: "Restal replaced Cadorna's seal",
          detail: "Restal replaced the broken seal on Cadorna's box after the party accepted his bargain." });
      }
      if (box === 1 || box === 128) {
        progress.push({
          id, title: `${commission.title} - ${box === 1 ? "recovered" : "seal broken"}`,
          detail: box === 1 ? "Bring the sealed box back to New Phlan. Leave by the west gate and look for the return boat southwest of the entrance."
            : "Return to City Hall. The box was opened and its family seal is broken. Leave by the west gate and look for the return boat southwest of the entrance.",
          status: "accepted",
          textileBox: box === 1 ? "sealed" : "opened",
        });
        continue;
      }
    }
    if (commission.id === "slums" && value > 0 && value < 25) {
      progress.push({
        id, title: `${commission.title} - in progress`,
        detail: `Keep clearing encounters in the Slums until the district is secure. ${value} of 25 encounters cleared.`,
        status: "accepted", clearedEncounters: value,
      });
    }
    const accepted = (commission.id === "graveyard" && global(0x4a96) === 255) ||
      (commission.id === "auction" && value === 1) ||
      (commission.id === "textile" && global(0x4a97) === 255) ||
      (commission.id === "zhentil" && global(0x4a98) === 255) ||
      (commission.id === "gate" && global(0x4a99) === 255) ||
      (commission.id === "castle" && global(0x4a9a) === 255);
    if (accepted && value !== 254 && value !== 255) {
      progress.push({
        id, title: `${commission.title} - accepted`,
        detail: commission.afterAcceptance ?? commission.next, status: "accepted",
      });
    }
    if (value !== 254 && value !== 255) continue;
    progress.push({
      id,
      title: `${commission.title} - ${value === 254 ? "ready to report" : "turned in"}`,
      detail: value === 254 ? commission.id === "river" ? "Report the end of the river pollution to the council clerk in New Phlan."
        : commission.id === "nomads" ? "Return to the council clerk at City Hall and report what happened at the Nomad Camp."
        : "Return to the council clerk at City Hall to report your success."
        : commission.id === "textile" ? "Cadorna's treasure affair is settled."
        : commission.id === "bane" ? "The council let the party keep what it found in the Temple of Bane."
        : "The council acknowledged the result.",
      status: value === 254 ? "ready-to-report" : "turned-in",
    });
  }
  if (known.some(({ id }) => id === "commission-bottle-vampire")) {
    const graveyard = global(progressAddresses.graveyard!);
    if (graveyard === 254 || graveyard === 255) {
      progress.push({
        id: "commission-bottle-vampire",
        title: "Vampire threat resolved",
        detail: "The party ended the graveyard menace.",
        status: "turned-in",
      });
    }
  }
  return progress;
}

/** Leads sourced from witnessed dialogue, with no inferred quest state. */
export function discoveredLeads(transcript: string): JournalLead[] {
  const text = transcript.replace(/\s+/g, " ").toUpperCase();
  const leads: JournalLead[] = [];
  if (text.includes("WATCH OUT FOR THE MUTANT LIZARD MEN")) {
    leads.push({ id: "lizard-wilds-mutant-warning", title: "The freed kobolds' warning",
      detail: "The freed kobolds warned that the mutant lizardfolk are dangerous. Ready weapons and spells before exploring further in the grove." });
  }
  if (text.includes("HOW MUCH LONGER MUST WE WAIT BEFORE ASSAULTING PHLAN")) {
    leads.push({ id: "stojanow-assault-plans", title: "A planned assault on Phlan",
      detail: "At Stojanow Gate, the party overheard a mage asking how long the garrison must wait before attacking Phlan." });
  }
  if (text.includes("WAS THROWN THROUGH THE TRAPDOOR TO THE MEDUSA")) {
    leads.push({ id: "stojanow-medusa-trapdoor", title: "Stojanow's medusa trapdoor",
      detail: "The party overheard a fighter say that the garrison threw a man through a trapdoor to the medusa. Be careful around trapdoors in the fortress." });
  }
  if (text.includes("I AM THE EFREETI SAMIR AHWAHL")) {
    leads.push({ id: "kobold-efreeti", title: "Samir Ahwahl",
      detail: "The efreeti in the brass bottle asked whether the party were vampires." });
  }
  if (text.includes("SUMMON ME ONLY WHEN A VAMPIRE IS NEAR")) {
    leads.push({ id: "kobold-efreeti-warning", title: "When to summon Samir",
      detail: "Samir returned to the brass bottle and warned the party to summon him only when a vampire is near." });
  }
  if (text.includes("THE SMITH (A HUMAN) AND THREE FIRE GIANTS ARE WORKING ON A SUIT OF ARMOR")) {
    leads.push({ id: "castle-forge", title: "The castle forge",
      detail: "A human smith and three fire giants were making armor. The party saw weapons and armor piled nearby." });
  }
  if (text.includes("I CAN'T TAKE ANYMORE ORDERS JUST NOW. IF IT'S IMPORTANT GET AUTHORIZATION")) {
    leads.push({ id: "castle-forge-authorization", title: "The smith requires authorization",
      detail: "The smith told the party to get authorization for any urgent order." });
  }
  if (text.includes("HE SCRAMBLES OUT THE DOOR.")) {
    leads.push({ id: "castle-al-hyam-released", title: "Al-Hyam Dhazid left",
      detail: "The party let the mage go and he ran out the door." });
  }
  if (text.includes("YOU ARE LEFT WITH THE NOTES OF AL-HYAM DHAZID") &&
      text.includes("YOU COPY THEM INTO YOUR JOURNAL AS ENTRY 30")) {
    leads.push({ id: "castle-al-hyam-notes", title: "Al-Hyam Dhazid's notes",
      detail: "The mage left notes about the Pool of Radiance. The party copied them as journal entry 30." });
  }
  if (text.includes("YOU ARE IN A ROOM FILLED WITH BROKEN STATUES") ||
      text.includes("I SAW BROKEN REMAINS OF STATUES")) {
    leads.push({ id: "castle-medusa-statues", title: "Broken statues below the trapdoor",
      detail: "The party saw broken statues with faces frozen in terror below the tower's trapdoor." });
  }
  if (text.includes("THESE ARE THE LIBRARY STACKS. OLD AND MOLDERING BOOKS ARE STORED ON SHELVES")) {
    leads.push({ id: "mendor-library-stacks", title: "Mendor's library stacks",
      detail: "The party found rooms of books marked by subject. Use Search to examine the shelves." });
  }
  if (text.includes("THEY DESCRIBE THE SURROUNDING AREA TO YOU") &&
      text.includes("SKETCH A MAP INTO YOUR JOURNAL CALLING IT ENTRY 10")) {
    leads.push({ id: "mendor-storeroom-map", title: "The kobolds' map of the library",
      detail: "The party spared the storeroom kobolds and sketched their description of the surrounding area as journal entry 10." });
  }
  if (text.includes("I DEFENDED THESE BOOKS IN LIFE AND I WILL DEFEND THEM IN DEATH")) {
    leads.push({ id: "mendor-book-guardian", title: "The library's guardian",
      detail: "A spectre accused the party of taking the library's books and attacked it." });
  }
  for (const { entry, title, reportCue } of libraryRecords) {
    if (text.includes(reportCue)) {
      leads.push({ id: `mendor-book-${entry}`, title, status: "reward-pending",
        detail: "Finish collecting the council reward for this record." });
    } else if (text.includes(`YOU FIND ${title.toUpperCase()}`) &&
        (text.includes(`ENTRY ${entry} IN YOUR JOURNAL`) || text.includes(`JOURNAL AS ENTRY ${entry}`))) {
      leads.push({ id: `mendor-book-${entry}`, title, detail: `The party copied a passage into journal entry ${entry}.` });
    }
  }
  if (text.includes("THIEVES ONLY") && text.includes("THE WELL HAS NO RUNGS OR ROPE")) {
    leads.push({ id: "textile-thieves-well", title: "The well marked Thieves Only",
      detail: "The well is deep and has no rungs or rope. To investigate it, choose Climb Down and select a skilled climber." });
  }
  if (text.includes("YOU ARE SEEKING THE TEXTILE HOUSE. WE CAN GET YOU IN UNSEEN")) {
    leads.push({ id: "textile-restal-offer", title: "Restal's offer of a hidden route",
      detail: "Restal offered to get the party into the Textile House unseen." });
  }
  if (text.includes("OUR RULES REQUIRE YOU TO BE BLINDFOLDED IN OUR GUILD HOUSE")) {
    leads.push({ id: "textile-restal-blindfold", title: "Restal's terms",
      detail: "Restal asked the party to wear blindfolds before he showed them the hidden route." });
  }
  if (text.includes("YOU ARE BLINDFOLDED AND TAKEN ON A LONG, TWISTING WALK") &&
      text.includes("ONLY MEET US AT THE MAIN WELL")) {
    leads.push({ id: "textile-restal-route", title: "Restal's hidden route",
      detail: "Restal led the blindfolded party up a ladder and said to meet his guild at the main well." });
  }
  if (text.includes("THE OLD THIEF LAUGHS, 'PERHAPS WE SHALL MEET AGAIN")) {
    leads.push({ id: "textile-restal-dismissed", title: "Restal ended the meeting",
      detail: "Restal ended the meeting and sent the party back up the well." });
  }
  if (text.includes("WE CAN DUPLICATE THE SEAL ON THAT CHEST") && text.includes("FOR HALF THE TREASURE")) {
    leads.push({ id: "textile-restal-seal-offer", title: "Restal offered to duplicate the seal",
      detail: "Restal offered to duplicate the chest's seal in exchange for half the treasure." });
  }
  if (text.includes("YOU ARE SURROUNDED BY THE BANDIT BAND OF THE INFAMOUS NORRIS THE GRAY")) {
    leads.push({ id: "kuto-norris-ambush", title: "Norris the Gray's ambush",
      detail: "Norris and his bandits surrounded the party beneath Kuto's Well and demanded its surrender." });
  }
  if (text.includes("YOU ARE STRIPPED OF ALL VALUABLES AND BLINDFOLDED") &&
      text.includes("THE BANDITS RELEASE YOU SOMEWHERE ABOVE GROUND")) {
    leads.push({ id: "kuto-norris-surrender", title: "Released by the bandits",
      detail: "The party surrendered. The bandits took its valuables and released it above ground." });
  }
  if (text.includes("WHAT CAVE WILL YOU ENTER?")) {
    leads.push({ id: "kobold-cave-fork", title: "The kobold cave fork", detail: "The party found a concealed cave beside a larger entrance and can choose which to explore." });
  }
  if (text.includes("DO YOU WISH AN ESCORT TO THE KING?")) {
    leads.push({ id: "kobold-guide-offer", title: "An escort to the kobold king",
      detail: "When awakened, the kobold mistook the party for envoys and offered to take it to the king." });
    if (text.includes("'THEN FOLLOW ME.'")) {
      leads.push({ id: "kobold-guide-follow", title: "Following the kobold guide", detail: "The party accepted the guide's escort." });
    }
  }
  if (text.includes("THE KOBOLD PROMPTLY RETURNS TO SLEEP")) {
    leads.push({ id: "kobold-guide-asleep", title: "The guide went back to sleep", detail: "The kobold returned to sleep without escorting the party." });
  }
  if (text.includes("THE ENVOYS ARE HERE, GREAT KING")) {
    leads.push({ id: "kobold-guide-arrived", title: "The guide stopped outside the kobold throne room",
      detail: "The guide announced the party. The king told them to come forward, and the guide fell into a stupor." });
  }
  if (text.includes("TWO MEN AND AN ANCIENT KOBOLD ON A WOODEN THRONE") || text.includes("THE TWO ENVOYS WAIT AT THE THRONE")) {
    leads.push({ id: "kobold-throne-envoys", title: "Envoys at the throne", detail: "The party found two envoys at the kobold throne." });
  }
  if (text.includes("THE KING HAS ESCAPED DURING THE FIGHT")) {
    leads.push({ id: "kobold-king-escaped", title: "The king escaped", detail: "The kobold king slipped away during the fight at the throne." });
  }
  if (text.includes("YOU REACH THE KING'S QUARTERS AND CONFRONT HIS GUARDS")) {
    leads.push({ id: "kobold-king-quarters", title: "The king's quarters", detail: "The party reached the king's quarters and encountered his guards." });
  }
  if (text.includes("THE KING, PANICKED, HAS FALLEN INTO HIS OWN SPIKED PIT AND DIED")) {
    leads.push({ id: "kobold-king-fell", title: "The kobold king fell",
      detail: "The king panicked, fell into his own spiked pit, and died." });
  }
  if (text.includes("YOU SEEM VALUABLE. SURRENDER OR DIE") || text.includes("THE BALLISTA ARE RELOADED. THE KING CALLS OUT")) {
    leads.push({ id: "kobold-surrender-offer", title: "The king demands surrender",
      detail: "The kobold king offered the party a choice between surrendering and fighting again." });
  }
  if (text.includes("USE THE SECRET WEAPONS") && text.includes("BALLISTA APPEAR AND FIRE")) {
    leads.push({ id: "kobold-king-ballista", title: "The king's concealed ballistae",
      detail: "The kobold king ordered his guards to fire concealed ballistae in the throne room." });
  }
  if (text.includes("THE KOBOLDS CHASE FOR A WHILE, BUT YOU ESCAPE")) {
    leads.push({ id: "kobold-party-escaped", title: "The party escaped the kobolds",
      detail: "The party got away after the kobolds gave chase." });
  }
  if (text.includes("THE KOBOLDS HERD YOU TOWARD YOUR PRISON")) {
    leads.push({ id: "kobold-prison-escort", title: "Taken prisoner",
      detail: "The kobolds took some equipment while escorting the party to prison." });
  }
  if (text.includes("YOU ARE THROWN INTO A CELL BEREFT OF EQUIPMENT")) {
    leads.push({ id: "kobold-prison-cell", title: "Locked in a kobold cell",
      detail: "The kobolds stripped the party of its equipment and left it in a cell." });
  }
  if (text.includes("I AM THE PRINCESS FATIMA, AID ME IN THIS BATTLE")) {
    leads.push({ id: "kobold-fatima-intervened", title: "Fatima intervened",
      detail: "Princess Fatima appeared and asked the party to help her fight." });
  }
  if (text.includes("I AM PRINCESS FATIMA") && text.includes("RECORD IT IN YOUR JOURNAL UNDER ENTRY 16")) {
    leads.push({ id: "kobold-fatima-account", title: "Princess Fatima's account",
      detail: "The party met Princess Fatima in the kobold caves and recorded her account as journal entry 16." });
  }
  if (text.includes("SHE OFFERS TO JOIN YOUR BAND.")) {
    leads.push({ id: "kobold-fatima-join-offer", title: "Fatima offered to join",
      detail: "Princess Fatima offered to join the party after telling her story." });
  }
  if (text.includes("SO I SHALL CUT MY OWN WAY OUT. GOOD HUNTING.")) {
    leads.push({ id: "kobold-fatima-left", title: "Fatima left on her own",
      detail: "Princess Fatima said she would find her own way out of the caves and departed." });
  }
  if (text.includes("LOOK FOR FRIENDS WHERE YOU EXPECT ENEMIES AND ENEMIES WHERE YOU EXPECT ALLIES")) {
    leads.push({ id: "slums-fortune-warning", title: "The fortune teller's warning", detail: "The fortune teller warned that people the party expects to be enemies may help, and apparent allies may turn against it." });
  }
  if (text.includes("A POWERFUL ONE BECOMES AWARE OF YOUR DEEDS AND SEEKS TO DESTROY YOU")) {
    leads.push({ id: "slums-fortune-power", title: "The fortune teller's warning about power",
      detail: "The fortune teller warned that someone powerful seeks to destroy the party, while someone weaker sees it as a path to power." });
  }
  if (text.includes("THE RIDDLE'S ANSWER IS GREAT EVIL USING GREAT GOOD FOR GREAT EVIL")) {
    leads.push({ id: "slums-fortune-riddle", title: "The fortune teller's riddle",
      detail: "The fortune teller warned that familiar paths would close and the party must seek new ways. Her riddle's answer was great evil using great good for great evil." });
  }
  if (text.includes("YOU HAVE STUMBLED UPON A LARGE NOMAD CAMP")) {
    leads.push({ id: "nomad-camp-found", title: "The Nomad Camp", detail: "The party found a camp on the overland route and can choose Enter or Leave." });
  }
  if (text.includes("THE NOMADS WAIT FOR YOU TO MAKE THE FIRST MOVE")) {
    leads.push({ id: "nomad-sentries", title: "The nomads wait", detail: "The nomads are watching the party and waiting to see how it approaches them." });
  }
  if (text.includes("ALL THE NOMADS HOLD THEIR SWORDS AT THE READY")) {
    leads.push({ id: "nomad-swords-ready", title: "The camp is on guard",
      detail: "The nomads held their swords ready and watched the party. More emerged from the tents." });
  }
  if (text.includes("WE WILL GIVE A FEAST IN YOUR HONOR")) {
    leads.push({ id: "nomad-feast-invitation", title: "The headman's invitation", detail: "The headman invited the party to a feast in its honor." });
  }
  if (text.includes("YOU ARE TREATED AS HONORED GUESTS FOR THE REST OF THE DAY") &&
      text.includes("THERE ARE CONTESTS OF STRENGTH AND SKILL IN YOUR HONOR")) {
    leads.push({ id: "nomad-feast-attended", title: "Honored guests at the Nomad Camp",
      detail: "The party accepted the invitation and the nomads held contests of strength and skill in its honor." });
  }
  if (text.includes("THEN YOU MUST LEAVE US") && text.includes("DO YOU LEAVE?")) {
    leads.push({ id: "nomad-feast-declined", title: "The party declined the feast",
      detail: "After the party declined the invitation, Hassad asked it to leave the camp." });
  }
  if (text.includes("YOUR INSULTS ARE TOO MANY! KILL THEM!")) {
    leads.push({ id: "nomad-refused-to-leave", title: "The nomads turned hostile",
      detail: "The party refused to leave after declining the feast, and the headman ordered his people to attack." });
  }
  if (text.includes("YOU MAKE HASSAD AHWAL'S TALK ENTRY 55 IN YOUR JOURNAL")) {
    leads.push({ id: "nomad-headman-talk", title: "Hassad Ahwal's account", detail: "The headman described the region's dangers. The party recorded his account as journal entry 55." });
  }
  if (text.includes("MY SCOUTS HAVE SEEN EVIDENCE OF A LARGE BAND OF KOBOLDS")) {
    leads.push({ id: "nomad-kobold-warning", title: "The headman fears a raid", detail: "The headman's scouts found signs of kobolds nearby. He asked the party to stay until they pass." });
  }
  if (text.includes("ABOUT MY REQUEST OF LAST NIGHT, WHAT IS YOUR DECISION")) {
    leads.push({ id: "nomad-stay-or-leave", title: "Stay or leave the camp", detail: "The headman asked the party for its answer. The choices are Stay and Fight or Leave." });
  }
  if (text.includes("LOOKING DISAPPOINTED THE HEADMAN SAYS, 'GOOD LUCK IN YOUR TRAVELS")) {
    leads.push({ id: "nomad-declined-aid", title: "The party declined to stay", detail: "The headman wished the party well after it chose to leave." });
  }
  if (text.includes("YOU SHALL BE RICHLY REWARDED FOR YOUR GENEROUS AID")) {
    leads.push({ id: "nomad-promised-aid", title: "The party agreed to defend the camp", detail: "The headman thanked the party for staying and promised a reward." });
  }
  if (text.includes("YOU MAY WANDER AS YOU WILL OR YOU MAY STAY HERE AND REST AND STUDY")) {
    leads.push({ id: "nomad-rest-offer", title: "Permission to rest in camp",
      detail: "The headman said the party could wander the camp or stay to rest and study." });
  }
  if (text.includes("THE SOUND OF WAR CRIES DRAWS YOU OUT OF THE HUT")) {
    leads.push({ id: "nomad-war-cries", title: "War cries outside the hut",
      detail: "War cries drew the party out of its lodging in the Nomad Camp." });
  }
  if (text.includes("A HORDE OF KOBOLDS IS ATTACKING THE CAMP")) {
    leads.push({ id: "nomad-kobold-attack", title: "The kobold attack", detail: "A band of kobolds attacked the Nomad Camp." });
  }
  if (text.includes("THE SHAMAN WALKS UP TO YOU") && text.includes("A REWARD WAS PROMISED AND SO SHALL IT BE")) {
    leads.push({ id: "nomad-shaman-reward", title: "The shaman honors the promise",
      detail: "After the raid, the shaman praised the party and confirmed the reward for defending the camp." });
  }
  if (text.includes("PLEASE LEAVE US TO OUR MOURNING") && text.includes("IT IS A PERSONAL THING FOR OUR PEOPLE")) {
    leads.push({ id: "nomad-mourning", title: "The nomads ask for privacy",
      detail: "The shaman asked the party to leave the camp so the nomads could mourn." });
  }
  if (text.includes("THE HEADMAN SNEERS") && text.includes("FOR HYRNKA")) {
    leads.push({ id: "nomad-fled-finale", title: "The party left the final fight",
      detail: "The party fled the final fight. The headman rallied his two surviving guards and went to finish it." });
  }
  if (text.includes("AN ALTAR THAT IS SMEARED WITH BLOOD AND COVERED WITH CRUDE BLACK HAND PRINTS")) {
    leads.push({ id: "bane-defiled-altar", title: "The desecrated altar",
      detail: "The party reached the altar. The game offers Destroy Altar or Leave It." });
  }
  if (text.includes("AS YOU DESTROY THE ALTAR, THE TEMPLE DOORS FLY OPEN")) {
    leads.push({ id: "bane-altar-ambush", title: "The cleric attacked at the altar",
      detail: "A half-orc cleric led a group of orcs through the temple doors when the altar was destroyed." });
  }
  if (text.includes("ON THE DEAD BODY OF THE HALF-ORC CLERIC") && text.includes("YOU PUT THE PAPER IN YOUR JOURNAL UNDER ENTRY 25")) {
    leads.push({ id: "bane-cleric-dispatch", title: "The cleric's dispatch",
      detail: "The party recovered a paper from the defeated cleric and copied it as journal entry 25." });
  }
  if (text.includes("THIS IS A HIDDEN TEMPLE OF ILMATER") ||
      text.includes("WE PROVIDE HELP FOR THOSE WHO CAN REACH US. ARE YOU IN NEED OF HEALING")) {
    leads.push({ id: "podal-ilmater-infirmary", title: "Hidden infirmary in Podal Plaza",
      detail: "The healer offers help at the hidden Temple of Ilmater in Podal Plaza." });
  }
  if (text.includes("WE ARE RECRUITING CREATURES FOR OUR TEMPLE TO THE NORTHEAST")) {
    leads.push({ id: "podal-bane-temple-location", title: "Bane's temple is northeast of the plaza",
      detail: "The robed recruiter said his temple lies to the northeast." });
  }
  if (text.includes("MEET HERE IN TWO HOURS. YOU MAY MEET HIGH PRIEST MACE")) {
    leads.push({ id: "podal-shrine-meeting", title: "Meeting at the shrine",
      detail: "Return to the Bane shrine in Podal Plaza in two hours for the meeting.", status: "accepted" });
  }
  if (text.includes("IF YOU CHANGE YOUR MIND, RETURN IN TWO HOURS")) {
    leads.push({ id: "podal-shrine-declined", title: "Declined the recruiter's offer",
      detail: "The recruiter invited the party to return to the shrine in two hours if they change their minds." });
  }
  if (text.includes("TO SHOW YOUR LOYALTIES, KILL THE UNBELIEVERS")) {
    leads.push({ id: "podal-shrine-ambush", title: "The shrine meeting turned hostile",
      detail: "The recruiter ordered the gathered creatures to attack the party." });
  }
  if (text.includes("TO ENTER THE TEMPLE YOU NEED A HOLY SYMBOL OF BANE")) {
    leads.push({ id: "bane-temple-symbol", title: "A holy symbol for the temple gate",
      detail: "The departing goblin said a holy symbol of Bane is needed to enter the temple." });
  }
  if (text.includes("THE AGED ORC COMES GRASPING TOWARD YOU. WILL YOU LET HIM TOUCH YOU")) {
    leads.push({ id: "bane-temple-guard-check", title: "The blind guard's inspection",
      detail: "The blind orc at the temple entrance asked to check the party." });
  }
  if (text.includes("GUARDS, IN THE NAME OF BANE, KILL THESE UNBELIEVERS") ||
      text.includes("THE OLD BLIND ORC IS CONVINCED YOU ARE NOT WORSHIPPERS")) {
    leads.push({ id: "bane-temple-guards-hostile", title: "The temple guards turned hostile",
      detail: "The blind orc ordered the temple guards to attack." });
  }
  if (text.includes("FINDING THE LEATHER HOLY SYMBOL") && text.includes("WELCOME TO THE TEMPLE OF BANE")) {
    leads.push({ id: "bane-temple-admitted", title: "Admitted to the Temple of Bane",
      detail: "The temple guard found the leather holy symbol and let the party in." });
  }
  if (text.includes("A SMALL CARAVAN OF SLAVERS RIDE BY YOU TOWARD THE BUCCANEER BASE")) {
    leads.push({ id: "rescue-slaver-trail", title: "Slavers on the road", detail: "A caravan of slavers rode toward the Buccaneer Base." });
  }
  const witnessedKovelClues = kovelClues.flatMap(({ trigger, title, detail, id }) => {
    const position = text.indexOf(trigger);
    return position < 0 ? [] : [{ position, lead: { id, title, detail } }];
  });
  for (const { lead } of witnessedKovelClues.sort((a, b) => a.position - b.position)) leads.push(lead);
  if (text.includes("THE WORDS 'NW CASTLE' UNDER IT")) {
    leads.push({ id: "kovel-castle-map-nw", title: "Northwest castle map", detail: "The party copied the maze drawn on a slate into journal entry 41." });
  }
  if (text.includes("THE WORDS 'NE CASTLE' UNDER IT")) {
    leads.push({ id: "kovel-castle-map-ne", title: "Northeast castle map", detail: "The party recorded the maze drawn on the map in journal entry 29." });
  }
  if (text.includes("YOU HAVE REACHED THE BUCCANEER BASE")) {
    leads.push({ id: "rescue-buccaneer-base", title: "Buccaneer Base", detail: "A band of buccaneers rode out to escort the party inside." });
  }
  if (text.includes("YOU ARE IN THE MERCHANTS' CAMP AREA")) {
    leads.push({ id: "rescue-base-entered", title: "Inside the Buccaneer Base",
      detail: "The party reached the merchants' camp inside the base." });
  }
  if (text.includes("YOU ARE JUST OUTSIDE A PEN FOR HOLDING SLAVES")) {
    leads.push({ id: "rescue-slave-pen", title: "The slave pen", detail: "The party found the prisoners guarded inside the camp." });
  }
  if (/HEART- ?SHAPED BIRTHMARK/.test(text)) {
    leads.push({ id: "rescue-identified-heir", title: "The boy in the pen", detail: "The party saw a boy with a heart-shaped birthmark among the prisoners." });
  }
  if (text.includes("HOW WILL YOU RESCUE THE BOY") || text.includes("YOU IGNORE THE SLEAZY MERCHANT AND CONCENTRATE ON RESCUING THE BOY")) {
    leads.push({ id: "rescue-pen-options", title: "A way into the pen", detail: "The party can sneak in or attack the guards." });
  }
  if (text.includes("YOU PUNCH THE MERCHANT IN THE NOSE") && text.includes("THE MERCHANT YELLS FOR HIS GUARDS")) {
    leads.push({ id: "rescue-merchant-alarm", title: "The merchant called his guards",
      detail: "Guards rushed toward the pen after the party struck the merchant." });
  }
  if (text.includes("TWO GUARDS GUARD THE DOOR")) {
    leads.push({ id: "rescue-pen-gate", title: "The pen gate is guarded", detail: "Two guards are posted at the gate." });
  }
  if (text.includes("YOU CANNOT GET BY THE GUARDS INTO THE SLAVE PEN")) {
    leads.push({ id: "rescue-sneak-blocked", title: "The guards blocked the way", detail: "The guards were too alert for the party to sneak by." });
  }
  if (text.includes("YOU ARE AT THE GATE TO THE ANIMAL PENS")) {
    leads.push({ id: "rescue-animal-pens", title: "Restless animals", detail: "The party found restless animals behind a gate at the base." });
  }
  if (text.includes("GUARDS ARE LEAVING THEIR POSTS IN ORDER TO CONTROL THE ANIMALS")) {
    leads.push({ id: "rescue-stampede", title: "The guards left their posts", detail: "The animals stampeded through the compound and the guards went after them." });
  }
  if (text.includes("THE ANIMALS HAVE BEEN CAPTURED")) {
    leads.push({ id: "rescue-animals-recaptured", title: "The stampede ended", detail: "The animals have been captured." });
  }
  if (text.includes("YOU ARE IN THE SLAVE PEN. STANDING NEAR YOU IS THE YOUNG BOY")) {
    leads.push({ id: "rescue-inside-pen", title: "Inside the pen", detail: "The boy is within reach." });
  }
  if (text.includes("YOU TAKE THE YOUNG BOY AND LEAVE")) {
    leads.push({ id: "rescue-heir-freed", title: "The boy is out of the pen", detail: "The boy left with the party, and the other prisoners ran out of the pen." });
  }
  if (text.includes("SOME OF THE GUARDS SPOT YOU WITH THE BOY")) {
    leads.push({ id: "rescue-escape-guards", title: "Guards spotted the boy", detail: "Guards intercepted the party as it tried to leave with the boy." });
  }
  if (text.includes("YOUR ONLY HOPE IS TO RUN FOR THE FRONT GATE")) {
    leads.push({ id: "rescue-escape-alarm", title: "The alarm sounded", detail: "The front gate is the way out of the compound." });
  }
  if (text.includes("I CAN LET YOU BUY THE YOUNG BOY")) {
    leads.push({ id: "rescue-captain-price", title: "The captain named a price", detail: "The captain offered to sell the captive boy." });
  }
  if (text.includes("AFTER TALKING THE CAPTAIN MAKES A MOTION AND THE BOY IS BROUGHT TO YOU")) {
    leads.push({ id: "rescue-heir-purchased", title: "The boy is in the party's care", detail: "The captain brought him to the party after the deal." });
  }
  if (text.includes("THE YOUNG BOY COULD NOT KEEP UP AND WAS LEFT BEHIND")) {
    leads.push({ id: "rescue-heir-left-behind", title: "The boy was left behind", detail: "The party fled the fight, and the boy could not keep up." });
  }
  if (text.includes("YOUR BUNGLING THE BIVANT RESCUE HAS COST US")) {
    leads.push({ id: "rescue-reprimand", title: "The council reprimanded the party", detail: "The clerk said the failed rescue had cost the council." });
  }
  if (text.includes("THE CITY CLERK AWARDS THE COUNCIL'S COMMISSIONS")) {
    leads.push({
      id: "council-commissions",
      title: "Council commissions",
      detail: "Rolf says to read the proclamations at City Hall and ask the clerk about commissions.",
    });
  }
  if (text.includes("BEHIND THESE DOORS ARE THE SPECIAL TRAINING SCHOOLS")) {
    leads.push({ id: "phlan-training-schools", title: "Training in New Phlan",
      detail: "Rolf showed the party where adventurers train. Return to the training schools when a character is ready to advance." });
  }
  if (text.includes("MAGIC USERS AND CLERICS TO GO NORTH AND FIGHTERS AND 'ROGUES' TO GO EAST")) {
    leads.push({ id: "phlan-training-directions", title: "Training school directions",
      detail: "From the notices, go north to train magic users or clerics. Go east to train fighters or rogues." });
  }
  if (text.includes("MAGIC USERS TO GO THROUGH THE EAST DOOR AND CLERICS TO GO THROUGH THE WEST DOOR")) {
    leads.push({ id: "phlan-training-north", title: "Doors at the northern training school",
      detail: "From the sign, use the east door for magic users and the west door for clerics." });
  }
  if (text.includes("WE TRAIN ONLY FIGHTERS HERE. DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-fighters", title: "Fighter training door",
      detail: "Go east past the arena in New Phlan, then take the north door marked Fighters. Accept the trainer's offer and select Train Character." });
  }
  if (text.includes("WE TRAIN ONLY MAGIC USERS HERE. DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-magic-users", title: "Magic-user training door",
      detail: "Use the east door at the northern training school. Accept the trainer's offer, select the magic user, then choose Train Character." });
  }
  if (text.includes("WE TRAIN ONLY CLERICS HERE. DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-clerics", title: "Cleric training door",
      detail: "Use the west door at the northern training school. Accept the trainer's offer, select the cleric, then choose Train Character." });
  }
  if (text.includes("WE TRAIN ONLY THIEVES HERE. DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-thieves", title: "Thief training door",
      detail: "Go east past the arena to the north door marked Rogues, next to the fighter school. Accept the trainer's offer, select the thief, then choose Train Character." });
  }
  if (text.includes("IT WILL COST YOU 1 PLATINUM PIECE TO REST HERE")) {
    leads.push({ id: "phlan-paid-rest", title: "Paid lodging in New Phlan",
      detail: "The lodging on the south side of New Phlan costs one platinum. Pay for a stay to rest and memorize spells." });
  }
  if (text.includes("TRAINING COSTS 1000 GP") && text.includes("DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-fee", title: "Training costs 1,000 gold",
      detail: "The trainer quoted a fee of 1,000 gold. Check the selected character's coins and experience under View Character before returning." });
  }
  if (text.includes("NOT ENOUGH EXPERIENCE") && text.includes("DO YOU WANT TO TRAIN?")) {
    leads.push({ id: "phlan-training-experience", title: "More experience needed",
      detail: "The trainer refused advancement for lack of experience. Earn more XP and check the character's progress under View Character." });
  }
  if (text.includes("THE COUNCIL IS DEVELOPING A PLAN TO OPEN UP THE SEA LANES")) {
    leads.push({
      id: "harbor-trade",
      title: "The sea lanes",
      detail: "Rolf says few ships risk the passage and the council wants to reopen it.",
    });
  }
  if (text.includes("BOATS LEAVE FOR THE WEST, THE EAST, SOKAL KEEP") ||
      text.includes("THE ONLY BOAT OUT IS GOING TO SOKAL KEEP")) {
    leads.push({
      id: "passage-sokal",
      title: "Passage to Sokal Keep",
      detail: "The harbor master says you can reach the keep by boat.",
    });
  }
  if (text.includes("BOATS LEAVE FOR THE WEST, THE EAST, SOKAL KEEP, AND THE NORTH SIDE OF THE BAY")) {
    leads.push({
      id: "harbor-routes-reopened",
      title: "The harbor routes are open",
      detail: "The harbor master offers passage east, west, back to Sokal Keep, and to the north side of the bay.",
    });
  }
  if (text.includes("THE BOAT DISEMBARKS YOU AT SOKAL KEEP")) {
    leads.push({ id: "sokal-arrival", title: "Arrival at Sokal Keep", detail: "The party landed on Thorn Island." });
  }
  if (text.includes("THERE IS A BOAT DOCKED HERE THAT WILL RETURN YOU TO THE CIVILIZED SECTION OF PHLAN") ||
      text.includes("THERE IS A BOAT HERE THAT WILL TAKE YOU BACK TO THE CIVILISED SECTION OF PHLAN")) {
    leads.push({ id: "phlan-return-ferry", title: "Return ferry to New Phlan",
      detail: "Choose Take Boat at the dock to return to the civilized part of Phlan." });
  }
  if (text.includes("TO THE WEST RISES A MOUND OF REEDS")) {
    leads.push({ id: "sokal-reeds", title: "Reeds by the keep gate", detail: "The party saw a mound of reeds west of the gates." });
  }
  if (text.includes("IN A POUCH ON THE REMAINS IS A CRUMBLING PARCHMENT SCROLL")) {
    leads.push({
      id: "sokal-parchment", title: "The parchment at Sokal Keep",
      detail: "The party found a damaged scroll on a dead elf outside the keep.",
    });
  }
  if (text.includes("THE UNDEAD LEAVE") && text.includes("WHAT DO YOU SAY? (TYPE A SINGLE WORD)") &&
      text.includes("A PACK OF UNDEAD SUDDENLY APPEARS")) {
    leads.push({ id: "sokal-patrol-passed", title: "Sokal Keep patrol",
      detail: "The undead patrol accepted the word and let the party pass." });
  }
  if (text.includes("THE OUTLINE OF A SAD-FACED MAN WAVERS AND FADES AWAY")) {
    leads.push({ id: "sokal-pale-form-wrong-word", title: "The pale figure vanished",
      detail: "The figure faded after the party spoke a word at the altar." });
  }
  if (text.includes("THEY DIDN'T LIKE THAT WORD")) {
    leads.push({ id: "sokal-patrol-rejected-word", title: "The patrol rejected the word",
      detail: "The undead patrol took offense at the word the party spoke." });
  }
  if (text.includes("I AM THE LIFE FORM OF FERRAN MARTINEZ")) {
    leads.push({
      id: "sokal-ferran", title: "Ferran Martinez",
      detail: "Ferran is bound to guard the keep and asks whether Phlan has been freed.",
    });
  }
  if (text.includes("I AM THE LIFE FORM OF FERRAN MARTINEZ") &&
      text.includes("'YOU LIE,' THE SPIRIT MOANS AS IT FADES AWAY")) {
    leads.push({ id: "sokal-ferran-lie", title: "Ferran rejected the lie",
      detail: "Ferran saw through the party's answer and faded away." });
  }
  if (text.includes("A LOUD COMMOTION RISES FROM THE COURTYARD") &&
      text.includes("A LARGE FORCE OF ORCS AND HOBGOBLINS RUSHES YOU")) {
    leads.push({ id: "sokal-ambush", title: "Sokal courtyard ambush",
      detail: "A large force of orcs and hobgoblins rushed the party through the courtyard door." });
  }
  if (text.includes("YOU ARE WELCOMED BY PRIESTESS JOY OF SUNE") && text.includes("DO YOU SEEK HEALING?")) {
    leads.push({ id: "phlan-sune-healing", title: "Healing at the Temple of Sune",
      detail: "Priestess Joy of Sune offers healing in New Phlan." });
  }
  if (text.includes("THE PRIESTS OF TYR WELCOME YOU TO THE TEMPLE") && text.includes("DO YOU SEEK HEALING?")) {
    leads.push({ id: "phlan-temple-healing", title: "Healing at the Temple of Tyr",
      detail: "The priests at the Temple of Tyr in New Phlan offer healing." });
  }
  if (text.includes("DO YOU SEEK A PARTNER FOR YOUR ADVENTURING")) {
    leads.push({ id: "phlan-arena-recruits", title: "Adventuring partners in New Phlan",
      detail: "The arena master can introduce adventurers who take a share of the party's treasure." });
  }
  if (text.includes("ON A HOBGOBLIN BODY, YOU FIND A NOTE") && text.includes("AS ENTRY 57")) {
    leads.push({ id: "sokal-courtyard-note", title: "Note from the courtyard",
      detail: "The party found a note on a fallen hobgoblin and copied it as journal entry 57." });
  }
  if (text.includes("THIS WAS ONCE THE CHAPEL OF THE KEEP") &&
      text.includes("A LARGE ALTAR DOMINATES THE SOUTHERN WALL")) {
    leads.push({ id: "sokal-chapel", title: "Sokal Keep chapel",
      detail: "The party found the remains of two orcs in the doorway and a large altar against the south wall." });
  }
  if (text.includes("A PALE FORM RISES BEFORE YOU")) {
    leads.push({ id: "sokal-pale-form", title: "The keep's pale figure", detail: "A pale figure appeared inside the keep. The party can try speaking to it." });
  }
  if (text.includes("THE CITY FELL LONG AGO TO THE UNBLESSED CREATURES") &&
      text.includes("TYRANTHRAXUS, EDRANKA, AND TORATH")) {
    leads.push({ id: "sokal-phlan-fall", title: "Ferran's account of Phlan's fall",
      detail: "Ferran said creatures empowered by a magical pool overran Phlan. He named Tyranthraxus, Edranka, and Torath as their leaders." });
  }
  if (text.includes("MENDOR WORKED HARD TO GATHER RECORD OF ALL THESE THINGS")) {
    leads.push({ id: "sokal-mendor", title: "Mendor's lost histories", detail: "Ferran says Mendor gathered accounts of the powers that brought down Phlan. His library was overrun." });
  }
  if (text.includes("THE ILLUSIONARY WALL IN THE ARMORY OF THIS KEEP")) {
    leads.push({ id: "sokal-armory", title: "Sokal Keep armory", detail: "Ferran says help lies beyond an illusory wall in the armory." });
  }
  if (text.includes("YOU ENTER THE KEEP'S OLD ARMORY")) {
    leads.push({ id: "sokal-old-armory", title: "The old armory", detail: "The weapons and armor in the old armory have decayed." });
  }
  if (text.includes("AS YOU SEARCH THROUGH THE WRECKED SMITHY") && text.includes("WITH THE EXCEPTION OF ONE OLD HAMMER")) {
    leads.push({ id: "sokal-smithy-hammer", title: "The smithy's hammer",
      detail: "The party found an old hammer among the ruined tools in Sokal Keep's smithy." });
  }
  if (text.includes("AN ACCOUNT OF OUR TRIALS IS WITHIN THE DIARY") && text.includes("HE POINTS TO A FLOORBOARD")) {
    leads.push({ id: "sokal-haunt-floorboard", title: "A diary beneath the floorboard",
      detail: "A spirit pointed out the floorboard where the old defenders left their account." });
  }
  if (text.includes("BENEATH A FLOORBOARD YOU FIND SOME GEMS") && text.includes("AS ENTRY 3")) {
    leads.push({ id: "sokal-haunt-diary", title: "The defenders' diary",
      detail: "The party copied the recovered diary pages as journal entry 3 and found gems under the floorboard." });
  }
  if (text.includes("PASSING THROUGH AN ILLUSIONARY WALL, YOU ENTER A PORTION OF THE KEEP")) {
    leads.push({ id: "sokal-hidden-armory", title: "The hidden armory",
      detail: "The party passed through a wall in the northeastern armory and saw a glow in the northwest corner." });
  }
  if (text.includes("ON STANDS ARE A SHIELD, A MACE, A SWORD") && text.includes("DO YOU TAKE IT")) {
    leads.push({ id: "sokal-armory-stands", title: "Equipment in the hidden armory",
      detail: "The party found weapon and armor stands at the source of the glow." });
  }
  if (text.includes("TO PASS MY GUARDS ON THE WAY OUT, SPEAK THE WORD 'SAMOSUD'")) {
    leads.push({ id: "sokal-departure", title: "Ferran's password", detail: "Ferran told the party to say SAMOSUD to his guards on the way out." });
  }
  if (text.includes("DO YOU WANT TO TAKE A BOAT BACK TO PHLAN?")) {
    leads.push({ id: "sokal-return-pier", title: "Boat back from Thorn Island",
      detail: "The party found a boat returning to New Phlan at the south pier." });
  }
  if (text.includes("USE THESE CLOTHES AS A DISGUISE AND YOU WILL ESCAPE NOTICE")) {
    leads.push({ id: "castle-disguise", title: "Help inside Valjevo Castle", detail: "Rebels offered the party clothes to pass as castle inhabitants." });
  }
  if (text.includes("YOU HAVE SLAIN THE GARRISON. NOW IF YOU CAN BUT SLAY THE OUTSIDE GUARDS")) {
    leads.push({ id: "gate-garrison-defeated", title: "The gate garrison fell",
      detail: "The party defeated the garrison. The outside guards still have to be defeated before reinforcements arrive." });
  }
  if (text.includes("YOU ARE SUMMONED TO A SPECIAL COUNCIL MEETING")) {
    leads.push({ id: "gate-assault-handoff", title: "Summons to the council chambers",
      detail: "The city guards will show the party to a special council meeting." });
  }
  if (text.includes("THE GUARD CAPTAIN STEPS FORWARD. 'PLEASE LET US SHOW YOU THE WAY.'")) {
    leads.push({ id: "gate-council-escort", title: "The council escort",
      detail: "The guard captain escorted the party to the hall outside the council chambers." });
  }
  if (text.includes("YOUR TAKING THE GATE WILL ENABLE OUR FORCES TO ASSAULT THE ENEMY STRONGHOLD")) {
    leads.push({ id: "gate-reward-direction", title: "The council plans an assault",
      detail: "The clerk says securing the gate lets the council attack the stronghold and asks the party to lead the attack." });
  }
  if (text.includes("HE JUST HIRED ME TO IMPERSONATE HIM")) {
    leads.push({ id: "castle-impostor", title: "Tyranthraxus's impostor", detail: "The figure on the throne admitted he was hired to impersonate Tyranthraxus." });
    if (text.includes("HE RUNS OUT OF THE HALL. THERE IS TREASURE ALL ABOUT.")) {
      leads.push({ id: "castle-impostor-released", title: "The impostor fled",
        detail: "The party let the impostor go. He fled the throne room, leaving treasure behind." });
    }
  }
  if (text.includes("THE MAN IS PORPHYRYS CADORNA")) {
    leads.push({ id: "castle-cadorna-captive", title: "Cadorna in the dungeon",
      detail: "The party found Porphyrys Cadorna chained to a wall in Valjevo Castle." });
  }
  if (text.includes("I KNOW THE WAY THROUGH THE HEDGE") && text.includes("LEFT RIGHT RIGHT")) {
    leads.push({ id: "castle-cadorna-hedge", title: "Directions through the hedge",
      detail: "Cadorna said to take left, right, right through the hedge." });
  }
  if (text.includes("I JUST THOUGHT THAT THE POOL WAS HERE") && text.includes("TAKE ME WITH YOU")) {
    leads.push({ id: "castle-cadorna-released", title: "Cadorna freed",
      detail: "The party freed Cadorna. He said he thought the pool was here and asked to come with the party." });
  }
  if (text.includes("WITH A QUICK STROKE YOU RELEASE HIM FROM THIS PAIN")) {
    leads.push({ id: "castle-cadorna-killed", title: "Cadorna killed",
      detail: "The party killed Cadorna in his Valjevo Castle cell." });
  }
  if (text.includes("YOU LEAVE. BEHIND YOU ARE HIS SCREAMS") && text.includes("INTRUDERS! INTRUDERS!")) {
    leads.push({ id: "castle-cadorna-alarm", title: "Cadorna raised the alarm",
      detail: "The party left Cadorna chained in his cell. He screamed to warn the castle guards." });
  }
  if (text.includes("I THANK YOU FOR FREEING ME") && text.includes("THE THIRD APPROACHES YOU WITH TEARS OF GRATITUDE")) {
    leads.push({ id: "castle-kitchen-captives-freed", title: "Kitchen captives freed",
      detail: "The party defeated the gnoll overseer and freed the three people forced to work in the kitchen." });
  }
  if (text.includes("A SLIP OF PAPER FROM THE POUCH OF THE DEAD GNOLL") && text.includes("HERE, YOU WILL NEED THIS")) {
    leads.push({ id: "castle-kitchen-slip", title: "A slip from the overseer's pouch",
      detail: "A freed captive handed the party a slip taken from the gnoll overseer." });
  }
  if (text.includes("IT IS TODAY'S PASSWORD AT THE MAIN GATE INTO THE HEDGE MAZE")) {
    leads.push({ id: "castle-hedge-gate-password", title: "Password for the hedge gate",
      detail: "A freed captive gave the party a slip from the overseer's pouch with today's password for the main gate into the hedge maze." });
  }
  if (text.includes("GET OUT OF MY KITCHEN OR I'LL THROW BOILING OIL ON YOU")) {
    leads.push({ id: "castle-kitchen-warning", title: "The overseer threatened the party",
      detail: "The gnoll overseer ordered the party out of his kitchen and threatened to throw boiling oil." });
  }
  if (text.includes("THE GNOLL GRABS A POT FROM THE FIRE AND THROWS ITS CONTENTS AT YOU")) {
    leads.push({ id: "castle-kitchen-oil", title: "The overseer threw boiling oil",
      detail: "When the party tried talking again, the overseer threw the contents of a pot at them." });
  }
  if (text.includes("TELL ME PASSWORD OR I KILL YOU")) {
    leads.push({ id: "castle-giant-sentries", title: "The giant sentries demand a password",
      detail: "The giant blocking the way demanded that the party give a password." });
  }
  if (text.includes("OKAY, BUT NO HANGING AROUND") || text.includes("SORRY ME NOT KNOW! JUST DOING JOB! YOU GO NOW")) {
    leads.push({ id: "castle-giant-sentries-passed", title: "The giant sentries let you pass",
      detail: "The sentries agreed to let the party through." });
  }
  if (text.includes("YOU ARE IN A BUILDING FULL OF RECORDS") && text.includes("DO YOU WISH TO SPEND HOURS READING THE RECORDS")) {
    leads.push({ id: "castle-records-room", title: "Valjevo records room",
      detail: "The party found a records building. Choose Yes when prompted to spend time reading its records." });
  }
  if (text.includes("THE RED WIZARDS OF THAY ARE ALLIED TO TYRANTHRAXUS")) {
    leads.push({ id: "castle-records-thay", title: "The Red Wizards' alliance",
      detail: "Records in Valjevo Castle showed that the Red Wizards of Thay are allied to Tyranthraxus." });
  }
  if (text.includes("HIS ULTIMATE GOAL IS TO CONQUER ALL LANDS SOUTH OF THE MOONSEA")) {
    leads.push({ id: "castle-records-moonsea", title: "Tyranthraxus's plans for the Moonsea",
      detail: "The castle records show how Tyranthraxus built his following. He plans to conquer the lands south of the Moonsea." });
  }
  if (text.includes("DO NOT BE FOOLED BY OUTWARD FORMS FOR YOU SHALL KNOW ME BY MY FLAMING AURA")) {
    leads.push({ id: "castle-flaming-aura", title: "How to recognize Tyranthraxus",
      detail: "A note signed by Tyranthraxus says his form can deceive and that his flaming aura identifies him." });
  }
  if (text.includes("THE CHIEF OF THE RAVEN CLAN IS ALLIED TO TYRANTHRAXUS")) {
    leads.push({ id: "castle-raven-clan", title: "The Raven Clan alliance",
      detail: "A report says the Raven Clan chief is allied with Tyranthraxus and that the northern barbarians could follow a strong leader." });
  }
  if (text.includes("IF YOU KILL HIM INSTEAD OF ME I WILL MAKE YOU ALL GENERALS")) {
    leads.push({ id: "castle-genheeris-offer", title: "Genheeris's bargain",
      detail: "Genheeris offered to make the party generals if they killed Tyranthraxus instead of him." });
  }
  if (/IN FACT I WILL JOIN YOU\. IS IT A DEAL\?['"]? GOOD\./.test(text) ||
      text.includes("GOOD. I WILL NOTIFY SOME OTHERS. YOU GO KILL HIM")) {
    leads.push({ id: "castle-genheeris-deal", title: "The party accepted Genheeris's bargain",
      detail: "The party agreed to help Genheeris turn against Tyranthraxus." });
  }
  if (text.includes("TELL AL-HYAM DHAZID TO EXECUTE PHASE 2 OF PLAN A")) {
    // Al-Hyam's original encounter has no branch for delivering this message.
    leads.push({ id: "castle-genheeris-orders", title: "Orders for Al-Hyam Dhazid",
      detail: "Genheeris told the party to relay orders to Al-Hyam Dhazid to execute phase 2 of Plan A." });
  }
  if (text.includes("TYRANTHRAXUS, HAS SEEN FIT TO ESTABLISH THIS TEMPLE TO OUR LORD BANE")) {
    leads.push({ id: "castle-bane-chapel", title: "Valjevo's chapel of Bane",
      detail: "The priest said Tyranthraxus established the chapel and urged the party to accept Bane's blessing." });
  }
  if (text.includes("AN EVIL SPIRIT FROM AN UNHOLY POOL GUIDES YOUR ENEMIES")) {
    leads.push({ id: "phlan-seer-prophecy", title: "The Old Phlan seer's prophecy",
      detail: "The seer said an evil spirit from an unholy pool guides the party's enemies." });
  }
  if (text.includes("AN ANCIENT BRONZE DRAGON, SURROUNDED BY A FIERY AURA")) {
    leads.push({ id: "castle-audience", title: "The audience hall", detail: "The party saw a bronze dragon rise next to the glowing pool." });
  }
  if (text.includes("TWO GUARDS MOVE TO BAR YOUR PATH")) {
    leads.push({ id: "castle-audience-guards", title: "The dragon's bodyguards", detail: "Two guards blocked the party's path in the audience hall." });
  }
  if (text.includes("THE DRAGON LOOKS AT YOU WITH INTEREST") && text.includes("YOU ARE INDEED MIGHTY WARRIORS")) {
    leads.push({ id: "castle-dragon-interested", title: "The dragon acknowledges the party",
      detail: "The bronze dragon acknowledged the party's strength and continued speaking." });
  }
  if (text.includes("IF YOU JOIN ME I WILL MAKE YOU THE COMMANDERS OF THE ARMIES")) {
    leads.push({ id: "castle-vote", title: "Tyranthraxus's offer", detail: "Tyranthraxus offered command of his armies in exchange for joining him." });
  }
  if (text.includes("TYRANTHRAXUS HAS FINALLY BEEN DEFEATED") && text.includes("YOU LEAVE THE CASTLE")) {
    leads.push({ id: "castle-tyranthraxus-defeated", title: "Tyranthraxus defeated",
      detail: "The party left Valjevo Castle after defeating Tyranthraxus. The remaining monsters hid as the party passed through the streets." });
  }
  if (text.includes("GO WITH HIM ACROSS THE RIVER AND HELP HIM TO CLEANSE THE TEMPLE")) {
    leads.push({ id: "bane-dirten", title: "Dirten's mission", detail: "Bishop Braccio asked the party to help Dirten cleanse the temple across the river." });
  }
  if (text.includes("THE CITY WATCH STOPS YOU AND REMOVES CADORNA'S TREASURE")) {
    leads.push({ id: "textile-handoff", title: "The Watch took Cadorna's treasure", detail: "The Watch sent the party to the city clerk to collect its reward." });
  }
  if (text.includes("YOU FIND A PAGE FROM A DIARY AND PLACE IT IN YOUR JOURNAL UNDER ENTRY 11")) {
    leads.push({ id: "textile-diary-page", title: "Diary page in the Textile House",
      detail: "The party found a diary page in the Textile House. Read journal entry 11." });
  }
  if (text.includes("A DRUM BEGINS TO BEAT AND HOBGOBLINS ATTACK")) {
    leads.push({ id: "textile-courtyard-ambush", title: "Textile House courtyard ambush",
      detail: "A drum sounded as hobgoblins attacked the party in the courtyard." });
  }
  if (text.includes("THINGS SEEM STRANGELY QUIET. THE DRUM HAS FADED TO SILENCE")) {
    leads.push({ id: "textile-courtyard-cleared", title: "Textile House courtyard cleared",
      detail: "The drum fell silent after the party defeated the courtyard hobgoblins." });
  }
  if (text.includes("'SKULLCRUSHER WAS HERE' IS CARVED INTO THE NORTH WALL")) {
    leads.push({ id: "textile-skullcrusher-mark", title: "Skullcrusher's mark",
      detail: "The party found Skullcrusher's name carved into the north wall of a textile building." });
  }
  if (text.includes("MY NAME IS SKULLCRUSHER. THERE'S A SECRET DOOR TO THE SOUTHEAST")) {
    leads.push({ id: "textile-secret-door", title: "Skullcrusher's secret door",
      detail: "Skullcrusher says he met the hobgoblin leader beyond a secret door to the southeast." });
  }
  if (text.includes("A MUSCULAR MAN LOCKED IN CHAINS LIES HERE")) {
    leads.push({ id: "textile-prisoner", title: "Prisoner in the Textile House",
      detail: "The party found a man in chains and recovered the page recorded as journal entry 47." });
  }
  if (text.includes("I ALMOST KILLED THE LEADER OF THESE SCUMMY HOBGOBLINS")) {
    leads.push({ id: "textile-prisoner-fought-leader", title: "The prisoner fought the hobgoblin leader",
      detail: "The prisoner said he almost killed the hobgoblin leader before the other hobgoblins jumped him." });
  }
  if (text.includes("YOU HAVE NO KEY TO UNLOCK THE PADLOCKS")) {
    leads.push({ id: "textile-prison-key-needed", title: "The prisoner's padlocks",
      detail: "The party tried to unlock the prisoner's padlocks and needs a key." });
  }
  if (text.includes("NO ONE IS ABLE TO PICK ALL THE PADLOCKS") ||
      text.includes("DESPITE GREAT EFFORT, THE CHAINS HOLD")) {
    leads.push({ id: "textile-padlocks-resisted", title: "The prisoner is still chained",
      detail: "The attempt to free the prisoner failed. Search the adjoining rooms for a key." });
  }
  if (text.includes("THE MAN DIES A CRUEL DEATH")) {
    leads.push({ id: "textile-prisoner-killed", title: "The prisoner was killed",
      detail: "The party killed Cadorna's chained prisoner. Continue the search for Cadorna's treasure." });
  }
  if (text.includes("I AM THE MIGHTY GRISHNAK")) {
    leads.push({ id: "textile-grishnak", title: "Grishnak's temple",
      detail: "The party encountered Grishnak at a bone altar in the Textile House." });
  }
  if (text.includes("THE BRASS KEY YOU FOUND OPENS ALL OF THE PADLOCKS")) {
    leads.push({ id: "textile-prisoner-freed", title: "The prisoner is free",
      detail: "The party used a brass key to open the prisoner's padlocks." });
  }
  if (text.includes("'OH WELL.' HE LEAVES.")) {
    leads.push({ id: "textile-prisoner-left", title: "The freed prisoner left",
      detail: "Cadorna's servant went his own way after the party freed him." });
  }
  if (text.includes("IN THE EAST WALL IS THE SECRET DOOR")) {
    leads.push({ id: "textile-east-wall", title: "The secret door's entrance",
      detail: "Skullcrusher pointed out the hidden entrance in the east wall." });
  }
  if (text.includes("YOU SEE THE CHIEF OF THE HOBGOBLINS, A HUGE OGRE")) {
    leads.push({ id: "textile-ogre-chief", title: "The hobgoblins' chief",
      detail: "The party found the ogre chief in a torchlit room beyond the secret door." });
  }
  if (text.includes("THE PLAZA AHEAD IS CROWDED WITH MONSTERS")) {
    leads.push({ id: "auction-plaza-entry", title: "The crowd at Podal Plaza",
      detail: "The party can disguise itself as monsters or sneak past the crowd." });
  }
  if (text.includes("THE AUCTIONEER CRIES 'CREATURES OF ALL AGES")) {
    leads.push({ id: "auction-started", title: "The auction has begun",
      detail: "The auctioneer announced a powerful magical item to the crowd." });
  }
  if (text.includes("THE BIDDING ESCALATES TO 5,000 GOLD PIECES")) {
    leads.push({ id: "auction-bidding", title: "The high bid",
      detail: "A man in plain clothes standing next to an ogre bid 5,000 gold pieces." });
  }
  if (text.includes("IT'S ONLY A WAND OF FEAR")) {
    leads.push({ id: "auction-wand-of-fear", title: "The auction weapon",
      detail: "A closer look revealed a Wand of Fear at the Podal Plaza auction." });
  }
  if (text.includes("IT'S A WAND OF ILLUMINATION. WHO CARES")) {
    leads.push({ id: "auction-wand-of-illumination", title: "An onlooker identified the wand",
      detail: "Someone in the auction crowd called the item a Wand of Illumination." });
  }
  if (text.includes("IT'S A STAFF OF COMMAND. I COULD HAVE MY OWN ARMY")) {
    leads.push({ id: "auction-staff-of-command", title: "Another claim about the auction item",
      detail: "Someone in the auction crowd called the item a Staff of Command." });
  }
  if (text.includes("THE AUCTION ENDS. YOU DON'T SEE WHO BOUGHT THE ITEM")) {
    leads.push({ id: "auction-buyer-unseen", title: "The buyer went unseen",
      detail: "The auction ended without the party seeing who bought the item." });
  }
  if (text.includes("THE AUCTION IS CANCELLED!")) {
    leads.push({ id: "auction-cancelled", title: "The auction was cancelled",
      detail: "The auctioneer called off the sale and fled when the crowd turned on the party." });
  }
  if (text.includes("THE OGRE IS TACKLED AND SEARCHED") && text.includes("DOESN'T HAVE THE ITEM")) {
    leads.push({ id: "auction-ogre-searched", title: "The ogre had no item",
      detail: "The ogre was tackled and searched after fleeing the auction. He did not have the item." });
  }
  if (text.includes("A MAN AND OGRE EXCHANGE THE WAND AND A LARGE BAG")) {
    leads.push({ id: "auction-exchange", title: "The auction exchange",
      detail: "The party saw a man and an ogre exchange the wand and a large bag before disappearing into the crowd." });
  }
  if (text.includes("THE BATTLE IS OVER, THE PATRONS RETURN TO DRINKING.")) {
    leads.push({ id: "podal-pitt-fight-ended", title: "The fight at the Pitt ended",
      detail: "The Pitt's patrons returned to drinking after the fight." });
  }
  if (text.includes("GARWIN, I'LL GET YOU!") && text.includes("THE MAN HAS ESCAPED IN THE CONFUSION")) {
    leads.push({ id: "auction-garwin-escaped", title: "Garwin escaped the auction",
      detail: "The auctioneer shouted Garwin's name as the man escaped into the crowd." });
  }
  if (text.includes("OPENING THE BOX WILL DAMAGE THE SEAL BEYOND REPAIR")) {
    leads.push({ id: "textile-iron-box", title: "Cadorna's sealed iron box",
      detail: "The family seal across the lock will break if the party opens the box." });
  }
  if (text.includes("A MAN WITH A WAGON OF GOODS") && text.includes("THE GATES OPEN")) {
    leads.push({ id: "gate-wagon-entry", title: "A wagon entered Stojanow Gate",
      detail: "The wagon driver handed something to the bugbear guards, who opened the gate." });
  }
  if (text.includes("A BUGBEAR WALKS UP TO YOU") && text.includes("HAVE THE 15 GOLD")) {
    leads.push({ id: "gate-toll-demand", title: "The bugbear demanded a toll",
      detail: "The guard asked the party for 15 gold." });
  }
  if (text.includes("THE BUGBEAR TAKES THE MONEY AND THE GATE OPENS")) {
    leads.push({ id: "gate-toll-paid", title: "The bugbear opened the gate",
      detail: "The guard took the payment and let the party through." });
  }
  if (text.includes("ALL RIGHT, GET OUT OF HERE THEN. COME BACK WHEN YOU'VE LEARNED THE RULES")) {
    leads.push({ id: "gate-toll-refused", title: "Turned away from Stojanow Gate",
      detail: "The bugbear ordered the party to leave." });
  }
  if (text.includes("THEY ARE IMPOSTERS! ALL RIGHT, THROW DOWN YOUR WEAPONS")) {
    leads.push({ id: "gate-imposters", title: "Recognized at Stojanow Gate",
      detail: "The bugbear guards called the party imposters and demanded their surrender." });
  }
  if (text.includes("A VOICE FROM THE TOWER YELLS") && text.includes("STAY AWAY FROM THE WALL")) {
    leads.push({ id: "gate-tower-warning", title: "A warning from the tower",
      detail: "A guard at Stojanow Gate told the party to stay away from the wall." });
  }
  if (text.includes("THE GROUP OF BUGBEARS COME OVER") && text.includes("THE LEADER SWINGS AT YOU")) {
    leads.push({ id: "gate-bugbear-punch", title: "Confronted by the gate bugbears",
      detail: "The bugbear leader reminded the party of the warning and swung at them. The encounter offered Attack or Take the Punch." });
  }
  if (text.includes("NOW BEAT IT BEFORE WE GET SERIOUS")) {
    leads.push({ id: "gate-bugbears-let-go", title: "The bugbears let the party go",
      detail: "After the party took the punch, the bugbears warned them to leave." });
  }
  if (text.includes("BUGBEARS WERE WAITING ON THE OTHER SIDE OF THE GATE")) {
    leads.push({ id: "gate-bugbear-ambush", title: "Bugbears inside Stojanow Gate",
      detail: "Bugbears were waiting for the party inside the entrance." });
  }
  if (text.includes("COUNCILMAN CADORNA CONFRONTS YOU. 'YOU HAVE TAKEN MY FAMILY TREASURE")) {
    leads.push({ id: "textile-confrontation", title: "Cadorna confronted the party", detail: "Cadorna accused the party of taking his family treasure and left without paying." });
  }
  if (libraryRecords.some(({ reportCue }) => text.includes(reportCue))) {
    leads.push({ id: "records-submitted", title: "Records delivered", detail: "The clerk acknowledged records the party recovered. Additional finds can still be brought to City Hall." });
  }
  if (text.includes("YOU HAVE FOUND A ROWBOAT HIDDEN AMOUNGST THE REEDS")) {
    leads.push({ id: "river-rowboat", title: "A rowboat in the reeds", detail: "The party found a hidden boat that can reach the pyramid." });
  }
  if (text.includes("YOU HAVE FOUND A SECRET DOOR THAT LEADS INTO THE PYRAMID")) {
    leads.push({ id: "river-secret-door", title: "The pyramid's secret door", detail: "The party found a secret entrance at the front of the pyramid." });
  }
  if (text.includes("YOU HAVE FOUND A SECRET DOOR THAT LEADS INTO THE PYRAMID") &&
      text.includes("A SECRET DOOR IS FOUND BEHIND YOU")) {
    leads.push({ id: "river-entrance-inside", title: "Inside the pyramid", detail: "The secret entrance is behind the party." });
  }
  for (const { entry, cue, title, detail } of yarashPapers) {
    if (text.includes(cue)) {
      leads.push({ id: `river-yarash-paper-${entry}`, title, detail: `${detail} Read journal entry ${entry}.` });
    }
  }
  if (text.includes("IT IS THE JOURNAL OF TYRMOR")) {
    leads.push({ id: "river-tyrmor-journal", title: "Tyrmor's journal",
      detail: "The party found Tyrmor's journal beneath a body in the pyramid and copied its information into entry 26." });
  }
  if (text.includes("YOU HAVE ENTERED THE FOUNTAIN CHAMBER")) {
    leads.push({ id: "river-fountain", title: "The fountain chamber", detail: "Pipes in the fountain chamber pump foul black water." });
  }
  if (text.includes("YOU HAVE ENTERED A PUMPING ROOM") && text.includes("WHO ARE SHACKLED TO THE WALL BY LONG CHAINS")) {
    leads.push({ id: "river-pump-prisoners", title: "Prisoners at the pumps",
      detail: "Three shackled lizardfolk were forced to pump and pour the contaminant." });
  }
  if (text.includes("AS YOU FREE THEM THEY TELL YOU ALL ABOUT WHAT YARASH IS DOING")) {
    leads.push({ id: "river-pump-prisoners-freed", title: "The prisoners' advice",
      detail: "The freed prisoners told the party about Yarash and how to ask their tribe in the swamp for help. Read journal entry 35." });
  }
  if (text.includes("THEY THROW THEIR BARRELS OF CONTAMINANT ON THE PARTY")) {
    leads.push({ id: "river-pump-prisoners-hostile", title: "The pumping room turned hostile",
      detail: "The frightened prisoners turned on the party and threw barrels of contaminant." });
  }
  if (text.includes("NOT ALL THE EQUIPMENT IS YET DESTROYED")) {
    leads.push({ id: "river-equipment-damaged", title: "The pipes are under pressure", detail: "The damaged machinery started whining and the black liquid bubbled." });
  }
  const fountainBlast = text.includes("BITS OF PIPE AND OTHER PLUMBING FIXTURES FLY IN ALL DIRECTIONS");
  const riverRecovery = text.includes("THE LAND IS ALREADY BEGINNING TO RECOVER FROM THE ALCHEMICAL POLLUTION");
  if (fountainBlast) {
    leads.push({ id: "river-fountain-blast", title: "The pipes exploded",
      detail: "The machinery exploded inside the fountain chamber. Check the party before leaving." });
  }
  if (riverRecovery) {
    leads.push({ id: "river-recovery", title: "The land is recovering",
      detail: "On leaving the pyramid, the party saw the land beginning to recover." });
  }
  if (text.includes("YOU HAVE DESTROYED THE LAST PIECE OF EQUIPMENT") ||
      text.includes("THE EQUIPMENT IS NOW CERTAINLY DESTROYED") ||
      fountainBlast || riverRecovery) {
    leads.push({ id: "river-equipment-destroyed", title: "The river can recover", detail: "The party stopped the pyramid's pollution." });
  }
  for (const commission of commissions) {
    const reported = commission.report !== undefined && text.includes(commission.report);
    const pendingReward = reported && (progressAddresses[commission.id] !== undefined || commission.id === "ohlo");
    const complete = reported && !pendingReward;
    const accepted = commission.accepted !== undefined && text.includes(commission.accepted);
    if (!reported && !accepted && !text.includes(commission.offer) &&
        !commission.alternateOffers?.some((offer) => text.includes(offer))) continue;
    leads.push({
      id: `commission-${commission.id}`,
      title: `${commission.title} - ${complete ? "turned in" : pendingReward ? "reward pending" : accepted ? "accepted" : "offered"}`,
      detail: complete ? "The result was acknowledged."
        : pendingReward ? (commission.id === "ohlo" ? "Finish collecting Ohlo's reward."
          : commission.id === "bane" ? "The clerk says you may keep the temple treasure. Press Enter to acknowledge the report."
          : "Finish collecting the council reward.")
        : accepted ? commission.afterAcceptance ?? commission.next : commission.next,
      status: complete ? "turned-in" : pendingReward ? "reward-pending" : accepted ? "accepted" : "offered",
    });
  }
  if (text.includes("THE MAN TAKES THE POTION AND GULPS IT GREEDILY")) {
    leads.push({ id: "ohlo-delivered", title: "Ohlo drank the potion",
      detail: "Ohlo drank the potion, grew younger, and offered the promised reward." });
  }
  if (text.includes("YOU ARE JUST NORTH OF THE ENTRY TO THE OLD ROPE GUILD")) {
    leads.push({ id: "ohlo-rope-guild-entry", title: "The Rope Guild entrance",
      detail: "The party found the notice just north of the entrance to the Old Rope Guild." });
  }
  if (text.includes("YOU HAVE ENTERED THE MYSTERIOUS BUILDING THAT WAS ONCE THE ROPE GUILD")) {
    leads.push({ id: "ohlo-rope-guild", title: "The Old Rope Guild",
      detail: "The party entered the former Rope Guild in the Slums." });
  }
  if (text.includes("A MAN HURRIES FORWARD. 'I AM SORRY, NOBLE ONES, BUT I HAVE NOTHING TO SELL.'")) {
    leads.push({ id: "ohlo-booth", title: "The Rope Guild booth",
      detail: "The man in the booth says he has nothing to sell." });
  }
  if (text.includes("SUMMON ME ONLY WHEN A VAMPIRE IS NEAR")) {
    leads.push({ id: "bottle-recovered", title: "The bottle's warning", detail: "Samir warned the party to summon him in the presence of a vampire, then returned to the bottle." });
  }
  if (text.includes("A VAMPIRE WHO LURKS IN THE NORTHEAST CORNER OF THE GRAVEYARD")) {
    leads.push({ id: "graveyard-vampire-location", title: "The vampire's lair", detail: "The party learned the vampire lurks in the northeast corner of the graveyard." });
  }
  if (text.includes("WOODEN STAIRS LEAD INTO A PIT")) {
    leads.push({ id: "graveyard-vampire-stairs", title: "Stairs into the crypt",
      detail: "Wooden stairs lead down into a pit in the graveyard." });
  }
  if (text.includes("THE VAMPIRE TURNS INTO A VAPOR CLOUD AND FLOATS AWAY")) {
    leads.push({ id: "graveyard-vampire-escaped", title: "The vampire escaped",
      detail: "After the fight, the vampire turned into vapor and floated away." });
  }
  if (text.includes("YOU FIND THE VAMPIRE'S TREASURE TROVE")) {
    leads.push({ id: "graveyard-vampire-trove", title: "The vampire's treasure trove",
      detail: "The party found the vampire's treasure while searching the crypt." });
  }
  if (text.includes("THE VAMPIRE IS BEHIND THE NORTHERN WALL")) {
    leads.push({ id: "graveyard-vampire-north-wall", title: "Behind the northern wall",
      detail: "The mystic pointed out where the vampire is hiding." });
  }
  if (text.includes("PRESENT THIS PACKET TO ITS COMMANDANT") && text.includes("DO NOT BREAK THE SEALS")) {
    leads.push({ id: "zhentil-sealed-packet", title: "Keep the packet sealed",
      detail: "The council instructed the party to present the packet to the Zhentil commandant with its seals intact." });
  }
  if (text.includes("ARE YOU THE DIPLOMATIC ENVOYS FROM NEW PHLAN")) {
    leads.push({ id: "zhentil-envoy-challenge", title: "Zhentil's mounted patrol",
      detail: "The mounted patrol asked if the party was New Phlan's diplomatic delegation." });
  }
  if (text.includes("HE GREETS YOU AND YOU HAND HIM THE PAPERS")) {
    leads.push({ id: "zhentil-packet-delivered", title: "The commandant received the packet",
      detail: "The party handed the papers to the commandant inside his office." });
  }
  if (text.includes("HERE YOU SEE ONE OF OUR FINE BARRACKS") && text.includes("EACH CAN HOLD OVER A 100 MEN")) {
    leads.push({ id: "zhentil-tour-barracks", title: "Zhentil's barracks",
      detail: "The guide said the outpost has six barracks, each large enough for more than a hundred men." });
  }
  if (text.includes("HERE YOU SEE ONE OF OUR FINE WATCH TOWERS")) {
    leads.push({ id: "zhentil-tour-watchtowers", title: "The outpost's watchtowers",
      detail: "The guide showed the party one of the stone watchtowers." });
  }
  if (text.includes("THIS WALL HAS SURVIVED MANY ATTACKS, INCLUDING ONE FROM A DRAGON")) {
    leads.push({ id: "zhentil-tour-outer-wall", title: "A wall that survived a dragon",
      detail: "The guide claimed that Zhentil's outer wall had withstood a dragon attack." });
  }
  if (text.includes("HERE ARE YOUR QUARTERS. DO NOT LEAVE THIS AREA")) {
    leads.push({ id: "zhentil-quarters", title: "Quarters at Zhentil Outpost",
      detail: "The guard showed the party its assigned quarters and told it to stay there." });
  }
  if (text.includes("WILL YOU WALK AROUND OR WILL YOU JUST RELAX UNTIL DINNER")) {
    leads.push({ id: "zhentil-relax", title: "Waiting for dinner",
      detail: "The party can use Relax in its quarters to wait for the dinner escort." });
  }
  if (text.includes("YOU ARRIVE AT THE OFFICERS MESS AND ARE SEATED WITH THE COMMANDANT")) {
    leads.push({ id: "zhentil-dinner", title: "Dinner with the commandant",
      detail: "The commandant and his advisors hosted the party at dinner." });
  }
  if (text.includes("IT IS NIGHT AND YOU ARE IN YOUR QUARTERS")) {
    leads.push({ id: "zhentil-night", title: "Night at Zhentil Outpost",
      detail: "The party returned to its quarters and can decide how to spend the night." });
  }
  if (text.includes("YOU ARE ATTACKED BY FOUR GUARDS IN YOUR SLEEP") || text.includes("FOUR ARMED GUARDS BURST IN AND ATTACK YOU")) {
    leads.push({ id: "zhentil-quarters-attacked", title: "Guards attacked the party",
      detail: "The outpost guards attacked the party in its quarters." });
  }
  if (text.includes("THE WALL IS CLIMBABLE HERE, WILL YOU SCALE OVER IT")) {
    leads.push({ id: "zhentil-climbable-wall", title: "A way out over the wall",
      detail: "The party found a section of the outpost wall it can climb." });
  }
  if (text.includes("YOU CLIMB OVER THE WALL AND LEAVE THE OUTPOST") || text.includes("YOU ESCAPE FROM THE OUTPOST")) {
    leads.push({ id: "zhentil-envoy-left", title: "The party escaped Zhentil Outpost",
      detail: "The party made it out of the outpost." });
  }
  if (text.includes("YOU FIND A RUINED CASTLE SURROUNDED BY QUICKSAND")) {
    leads.push({ id: "swamp-drawbridge", title: "The castle drawbridge", detail: "An old drawbridge provides a safe crossing into the ruins." });
  }
  if (text.includes("YOU SENSE AN ANTI-MAGIC SHELL AROUND YOU")) {
    leads.push({ id: "swamp-anti-magic", title: "Anti-magic in the ruins", detail: "The party sensed an anti-magic shell on entering the ruined castle." });
  }
  if (text.includes("AN OLD LIZARDMAN APPEARS BEFORE YOU, HAND RAISED IN A GESTURE OF PEACE")) {
    leads.push({ id: "swamp-peaceful-elder", title: "A gesture of peace", detail: "A lizardfolk elder approached with his hand raised in peace." });
  }
  if (/YOU WILL HAVE BEEN SHOWN OUR TRIBAL FRIEND- ?WORD/.test(text)) {
    leads.push({ id: "swamp-friend-word", title: "The tribal friend-word", detail: "The elder asked for the word known to those who freed three of his people." });
  }
  if (text.includes("YOU ARE NOT THEY WHO RESCUED MY CHILDREN")) {
    leads.push({ id: "swamp-friend-word-rejected", title: "The elder rejected the word", detail: "The elder fled after rejecting the word the party gave." });
  }
  if (text.includes("THE OLD LIZARD MAN TOTTERS FOR A MOMENT WITH A SURPRISED LOOK ON HIS FACE")) {
    leads.push({ id: "swamp-elder-attacked", title: "The elder fell", detail: "The party struck down the elder during his approach." });
  }
  if (text.includes("THE OLD LIZARD MAN RECOGNIZES THE WORD")) {
    leads.push({ id: "swamp-elder-story", title: "The elder welcomed the party", detail: "The elder recognized the friend-word and shared his story. Read journal entry 31." });
  }
  if (text.includes("OUR CAUSE IS ONE. WILL YOU CHAMPION ME")) {
    leads.push({ id: "swamp-champion-requested", title: "A champion for the elder", detail: "The elder asked the party to champion him against his challenger." });
  }
  if (text.includes("DRYTHH TURNS TO HIS") && text.includes("'KILL THEM!'")) {
    leads.push({ id: "swamp-challenge-hostile", title: "Drythh turned on the party", detail: "Drythh called on his followers to kill the party after the challenge." });
  }
  if (text.includes("MY PEOPLE WILL NOT JOIN TYRANTHRAXUS")) {
    leads.push({ id: "swamp-alliance-averted", title: "The elder's pledge", detail: "The elder pledged that his people would stay out of Tyranthraxus's alliance." });
  }
  const citedEntries = text.matchAll(/\b(?:JOURNAL (?:(?:AS|UNDER) )?ENTRY (\d{1,2})\b|ENTRY (\d{1,2}) OF YOUR JOURNAL\b)/g);
  for (const number of new Set([...citedEntries].map((match) => match[1] ?? match[2]))) {
    if (number === "11" && leads.some(({ id }) => id === "textile-diary-page")) continue;
    let detail = `The party encountered a reference to entry ${number} in the Adventurer's Journal.`;
    if (number === "46" && text.includes("THE COMMANDANT TELLS YOU A STORY ABOUT THAT VERY POOL")) {
      detail = "The Commandant told the party a story about the Pool of Radiance. Read journal entry 46.";
    } else if (number === "53" && text.includes("YOU FIND A PIECE OF PAPER ON THE FLOOR IN THE ROOM")) {
      detail = "The party found a piece of paper on the floor. Read journal entry 53.";
    }
    leads.push({ id: `journal-entry-${number}`, title: `Journal entry ${number}`, detail });
  }
  const proclamations = new Set<string>();
  for (const match of text.matchAll(/\bPROCLAMATIONS? ([IVXLCDM]+\b(?:(?:,\s*(?:AND\s+)?|\s+AND\s+)[IVXLCDM]+\b)*)/g)) {
    for (const numeral of match[1]!.match(/\b[IVXLCDM]+\b/g) ?? []) proclamations.add(numeral);
  }
  for (const numeral of proclamations) {
    leads.push({
      id: `proclamation-${numeral.toLowerCase()}`,
      title: `Proclamation ${numeral}`,
      detail: "The party recorded this council proclamation. Its text is in the Adventurer's Journal.",
    });
  }
  return leads;
}
