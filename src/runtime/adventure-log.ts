import type { Cpu } from "../cpu/machine.js";
import { farCallObservers } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { commissions } from "./commission-journal.js";

/** Observe the Pascal strings actually sent to the guest's text display. */
export function observeAdventureLog(cpu: Cpu, slice: LoadedSlice, trainer?: LoadedSlice): () => string {
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
    if (message.trim()) chunks.push(message);
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
}

export interface JournalObjective {
  title: string;
  nextStep: string;
}

/** Pick the first unresolved commission the party has heard about. */
export function currentObjective(leads: readonly JournalLead[], trackedId?: string): JournalObjective {
  const unresolved = leads.filter(isOpenObjective);
  const selected = unresolved.find((lead) => lead.id === trackedId);
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
  const commission = commissions.find(({ id }) => tracked?.id === `commission-${id}`);
  if (commission) {
    const knows = (id: string) => leads.some((lead) => lead.id === id);
    if (tracked?.status === "ready-to-report" || tracked?.status === "reward-pending") {
      if (commission.id === "sokal" && tracked.status === "ready-to-report" && knows("sokal-departure")) {
        return { title: commission.title, nextStep: "Use Ferran's password, SAMOSUD, if the undead stop you. Leave through the south gate, take the boat to New Phlan, and report to the council clerk." };
      }
      if (commission.id === "castle" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Return to City Hall and report Tyranthraxus's defeat to the council clerk." };
      }
      if (commission.id === "ohlo" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Take the package back to Ohlo and choose Give when he asks for the potion." };
      }
      if (commission.id === "auction" && tracked.status === "ready-to-report") {
        const result = knows("auction-cancelled") ? "Report that the auction was cancelled"
          : knows("auction-wand-of-fear") ? "Report that the weapon was a Wand of Fear"
          : knows("auction-exchange") ? "Report that a man and an ogre exchanged the wand for a large bag"
          : "Report what the party saw at the auction";
        return { title: commission.title, nextStep: `${result} to the council clerk at City Hall.` };
      }
      return { title: commission.title, nextStep: tracked.detail };
    }
    let nextStep = tracked?.status === "accepted" ? commission.afterAcceptance ?? commission.next : commission.next;
    if (commission.id === "slums" && tracked?.clearedEncounters !== undefined) nextStep = tracked.detail;
    if (commission.id === "textile") {
      const carriedKey = leads.find(({ id }) => id === "textile-prison-key-carried");
      if (tracked?.textileBox) nextStep = tracked.detail;
      else if (knows("textile-iron-box")) nextStep = "Choose Take It Unopened to preserve Cadorna's family seal, or Open It to see what's inside.";
      else if (knows("textile-ogre-chief")) nextStep = "Defeat the ogre chief and search his room for Cadorna's treasure.";
      else if (knows("textile-east-wall")) nextStep = "Turn east where Skullcrusher pointed out the secret door. Use Search and move through the wall.";
      else if (knows("textile-secret-door")) nextStep = "Follow Skullcrusher's clue and search southeast for the secret door to the hobgoblin leader.";
      else if (knows("textile-prisoner-killed")) nextStep = "Search the remaining rooms of the western textile building for Cadorna's treasure.";
      else if (knows("textile-prisoner-left")) nextStep = "Continue searching the western textile building for Cadorna's treasure.";
      else if (knows("textile-prisoner-freed")) nextStep = "Parlay with the freed prisoner. Make room in the party if you want him to join.";
      else if (carriedKey) nextStep = carriedKey.detail;
      else if (knows("textile-grishnak") && (knows("textile-prison-key-needed") || knows("textile-padlocks-resisted"))) nextStep = "Overcome Grishnak at the bone altar and check the battle loot for a key. Return to the chained prisoner and choose Unlock.";
      else if (knows("textile-prison-key-needed") || knows("textile-padlocks-resisted")) nextStep = "From the chained prisoner, head north through the guards' room and search the adjoining rooms for a key. Return to the prisoner and choose Unlock.";
      else if (knows("textile-prisoner")) nextStep = "Speak with the prisoner in the western building and find a way to open his padlocks. Read journal entry 47.";
      else if (knows("textile-skullcrusher-mark")) nextStep = "Search the rooms near Skullcrusher's mark for whoever left it.";
      else if (knows("textile-courtyard-cleared")) nextStep = "Cross the quiet courtyard and search the western textile building for Cadorna's treasure.";
      else if (knows("textile-courtyard-ambush")) nextStep = "Prepare for the hobgoblin ambush before crossing the courtyard toward the western textile building.";
      else if (tracked?.status === "accepted") nextStep = tracked.detail;
    }
    if (commission.id === "ohlo" && tracked?.status === "accepted") {
      if (knows("ohlo-booth")) nextStep = "At the booth, choose Speak and enter OHLO. Bring the package back to him.";
      else if (knows("ohlo-rope-guild")) nextStep = "Look for the booth on the east side of the Rope Guild. Approach it from the west, then give Ohlo's name.";
      else if (knows("ohlo-rope-guild-entry")) nextStep = "From the spot marked by the Rope Guild notice, go south into the building and look for the booth.";
    }
    if (commission.id === "sokal") {
      if (knows("sokal-ferran-lie")) nextStep = "Ferran rejected the lie. Step away from the altar and return. Speak the same word, then tell him the truth about Phlan.";
      else if (knows("sokal-pale-form-wrong-word")) {
        nextStep = "The pale figure vanished after hearing the word. Reload a save from before the encounter to try again.";
        if (knows("sokal-parchment")) nextStep += " Check the parchment for another word.";
      }
      else if (knows("sokal-ferran")) nextStep = "Hear Ferran out and answer him truthfully about Phlan.";
      else if (knows("sokal-pale-form") && knows("sokal-parchment")) nextStep = "Talk to the pale form. When asked for a word, try one from the parchment.";
      else if (knows("sokal-chapel")) nextStep = "Head south from the chapel entrance. At the blocked passage, go around it to the east, then turn back west and approach the altar on the south wall.";
      else if (knows("sokal-courtyard-note")) nextStep = "Read journal entry 57 and continue exploring the keep beyond the courtyard.";
      else if (knows("sokal-ambush")) {
        nextStep = "Heal the party and ready weapons and spells before returning to the courtyard.";
        if (knows("phlan-temple-healing")) nextStep += " The Temple of Tyr in New Phlan offers paid healing.";
        if (knows("sokal-arrival")) {
          nextStep += " At the landing, choose Encamp, then Magic and Memorize. Rest there to replenish spent spells before heading back to the courtyard.";
        }
        if (knows("phlan-arena-recruits")) {
          nextStep += " Ask the arena master for reinforcements if needed. Arena recruits act on their own in battle. Prepare spells on a character you control to choose their targets.";
        }
      }
      else if (knows("sokal-armory-stands")) nextStep = "Check the gear on the stands if you left it behind, then continue exploring Sokal Keep.";
      else if (knows("sokal-hidden-armory")) nextStep = "Follow the glow to the northwest corner of the hidden armory.";
      else if (knows("sokal-patrol-passed")) nextStep = "Explore the keep. If another undead patrol asks whether to give the password, choose Yes.";
      else if (knows("sokal-patrol-rejected-word") && knows("sokal-parchment")) {
        nextStep = "The patrol rejected the word. If you meet another patrol, try a different word from the parchment.";
      }
      else if (knows("sokal-parchment")) nextStep = "Keep exploring. If you speak to an undead patrol, try a word from the parchment.";
      else if (knows("sokal-reeds")) nextStep = "Look through the mound of reeds west of the gates before entering the keep.";
      else if (knows("sokal-arrival")) nextStep = "Scout the keep and look for clues to the haunting.";
      else if (knows("passage-sokal")) nextStep = "Catch the boat to Sokal Keep at the end of the pier.";
    }
    if (commission.id === "bottle" && knows("bottle-recovered")) {
      nextStep = "Return to Diogenes with the bottle so he can explain how to use it.";
    }
    if (commission.id === "bane" && knows("bane-dirten")) {
      nextStep = "Decide whether to accompany Dirten. If you agree, cross the river with him and cleanse the desecrated temple.";
    }
    if (commission.id === "records" && knows("sokal-mendor")) {
      nextStep = "Search Mendor's overrun library for records of old Phlan. Bring worthwhile finds to the council clerk.";
    }
    if (commission.id === "bottle-vampire" && knows("graveyard-vampire-location")) {
      nextStep = "Go to the northeast corner of Valhingen Graveyard. Use the bottle when you confront the vampire.";
    }
    if (commission.id === "castle") {
      if (knows("castle-vote")) nextStep = "Choose Attack when each party member is asked to vote. Then defeat Tyranthraxus.";
      else if (knows("castle-audience")) nextStep = "Get past the guards in the audience hall and confront the bronze dragon.";
      else if (knows("castle-impostor")) nextStep = "Continue searching the castle for the real Tyranthraxus.";
      else if (knows("castle-disguise")) nextStep = "Use the clothes offered by the resistance to move through the castle and find Tyranthraxus.";
    }
    if (commission.id === "gate" && knows("gate-garrison-defeated")) {
      nextStep = "Defeat the outside guards before reinforcements arrive, then report to the clerk.";
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

/** Refine already disclosed objectives using the translated VM's state. */
/** Live possession is checked again when the journal opens and after a reload. */
export function textileKeyLead(cpu: Cpu, known: readonly JournalLead[], dataSegment: number): JournalLead | undefined {
  if (!known.some(({ id }) => id === "textile-prisoner") ||
      known.some(({ id }) => id === "textile-prisoner-freed" || id === "textile-prisoner-killed")) return;
  // The prison script uses FIND ITEM 75. Overlay 3 at 287A walks
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
      if (cpu.read8(itemSegment, itemOffset + 0x2e) === 75) {
        return { id: "textile-prison-key-carried", title: "Brass key in the party's pack",
          detail: "Bring the brass key to the chained prisoner and choose Free, then Unlock." };
      }
      item = pointer(itemSegment, itemOffset + 0x2a);
    }
    actor = pointer(segment, offset + 0x104);
  }
}

export function questProgress(cpu: Cpu, known: readonly JournalLead[], dataSegment: number): JournalLead[] {
  // ovl07:0E4C–0E57 resolves global ECL addresses through DS:4933.
  const base = cpu.read16(dataSegment, 0x4933);
  const segment = cpu.read16(dataSegment, 0x4935);
  if ((base | segment) === 0) return [];
  const global = (address: number) => cpu.read16(segment, base + 0x6e00 + address * 2);
  const progress: JournalLead[] = [];
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
    if (commission.id === "textile" && value === 255 && known.some((lead) => lead.id === "textile-confrontation")) {
      progress.push({ id, title: `${commission.title} - closed without payment`,
        detail: "Cadorna confronted the party over the opened box and left without paying.",
        status: "turned-in", rewardOutcome: "unpaid" });
      continue;
    }
    if (commission.id === "textile" && value < 254) {
      const box = global(0x4ac8);
      if (box === 1 || box === 128) {
        progress.push({
          id, title: `${commission.title} - ${box === 1 ? "recovered" : "seal broken"}`,
          detail: box === 1 ? "Bring the sealed box back to New Phlan, then visit the council clerk."
            : "Return to City Hall. The box was opened and its family seal is broken.",
          status: "accepted",
          textileBox: box === 1 ? "sealed" : "opened",
        });
        continue;
      }
    }
    if (commission.id === "slums" && value > 0 && value < 25) {
      const encounters = value === 1 ? "1 encounter cleared." : `${value} encounters cleared.`;
      progress.push({
        id, title: `${commission.title} - in progress`,
        detail: `Keep clearing encounters in the Slums until the district is secure. ${encounters}`,
        status: "accepted", clearedEncounters: value,
      });
    }
    const accepted = (commission.id === "graveyard" && global(0x4a96) === 255) ||
      (commission.id === "auction" && value === 1) ||
      (commission.id === "textile" && global(0x4a97) === 255) ||
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
      detail: value === 254 ? "Return to the council clerk at City Hall to report your success."
        : commission.id === "textile" ? "Cadorna's treasure affair is settled." : "The council acknowledged the result.",
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
  }
  if (text.includes("AN ANCIENT BRONZE DRAGON, SURROUNDED BY A FIERY AURA")) {
    leads.push({ id: "castle-audience", title: "The audience hall", detail: "The party saw a bronze dragon rise next to the glowing pool." });
  }
  if (text.includes("IF YOU JOIN ME I WILL MAKE YOU THE COMMANDERS OF THE ARMIES")) {
    leads.push({ id: "castle-vote", title: "Tyranthraxus's offer", detail: "Tyranthraxus offered command of his armies in exchange for joining him." });
  }
  if (text.includes("GO WITH HIM ACROSS THE RIVER AND HELP HIM TO CLEANSE THE TEMPLE")) {
    leads.push({ id: "bane-dirten", title: "Dirten's mission", detail: "Bishop Braccio asked the party to help Dirten cleanse the temple across the river." });
  }
  if (text.includes("THE CITY WATCH STOPS YOU AND REMOVES CADORNA'S TREASURE")) {
    leads.push({ id: "textile-handoff", title: "The Watch took Cadorna's treasure", detail: "The Watch sent the party to the city clerk to collect its reward." });
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
  if (text.includes("IT'S ONLY A WAND OF FEAR")) {
    leads.push({ id: "auction-wand-of-fear", title: "The auction weapon",
      detail: "A closer look revealed a Wand of Fear at the Podal Plaza auction." });
  }
  if (text.includes("THE AUCTION IS CANCELLED!")) {
    leads.push({ id: "auction-cancelled", title: "The auction was cancelled",
      detail: "The auctioneer called off the sale and fled when the crowd turned on the party." });
  }
  if (text.includes("A MAN AND OGRE EXCHANGE THE WAND AND A LARGE BAG")) {
    leads.push({ id: "auction-exchange", title: "The auction exchange",
      detail: "The party saw a man and an ogre exchange the wand and a large bag before disappearing into the crowd." });
  }
  if (text.includes("OPENING THE BOX WILL DAMAGE THE SEAL BEYOND REPAIR")) {
    leads.push({ id: "textile-iron-box", title: "Cadorna's sealed iron box",
      detail: "The family seal across the lock will break if the party opens the box." });
  }
  if (text.includes("COUNCILMAN CADORNA CONFRONTS YOU. 'YOU HAVE TAKEN MY FAMILY TREASURE")) {
    leads.push({ id: "textile-confrontation", title: "Cadorna confronted the party", detail: "Cadorna accused the party of taking his family treasure and left without paying." });
  }
  if (["WE FIND THESE DISCOURSES VALUABLE", "THESE MAPS SHOULD HELP US TO LOCATE",
    "THESE HISTORIES CONTAIN MUCH USEFUL INFORMATION", "THE RECORDS PROVIDE INSIGHTS"].some((line) => text.includes(line))) {
    leads.push({ id: "records-submitted", title: "Records delivered", detail: "The clerk acknowledged records the party recovered. Additional finds can still be brought to City Hall." });
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
        : pendingReward ? (commission.id === "ohlo" ? "Finish collecting Ohlo's reward." : "Finish collecting the council reward.")
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
  for (const number of new Set([...text.matchAll(/\bJOURNAL ENTRY (\d{1,2})\b/g)].map((match) => match[1]))) {
    leads.push({
      id: `journal-entry-${number}`,
      title: `Journal entry ${number}`,
      detail: `The party encountered a reference to entry ${number} in the Adventurer's Journal.`,
    });
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
