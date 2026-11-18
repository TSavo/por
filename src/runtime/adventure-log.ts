import type { Cpu } from "../cpu/machine.js";
import { farCallObservers } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { commissions } from "./commission-journal.js";

/** Observe the Pascal strings actually sent to the guest's text display. */
export function observeAdventureLog(cpu: Cpu, slice: LoadedSlice): () => string {
  if (slice.index !== 3) throw new Error("The PoR adventure log requires overlay slice 3");
  const chunks: string[] = [];
  farCallObservers.set(cpu, (seg, off) => {
    if (seg !== 0x198 || off !== 0x39 || cpu.cs !== slice.loadPara) return;
    const offset = cpu.read16(cpu.ss, cpu.sp + 4);
    const segment = cpu.read16(cpu.ss, cpu.sp + 6);
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
}

export interface JournalObjective {
  title: string;
  nextStep: string;
}

/** Pick the first unresolved commission the party has heard about. */
export function currentObjective(leads: readonly JournalLead[], trackedId?: string): JournalObjective {
  const unresolved = leads.filter(isOpenObjective);
  const selected = unresolved.find((lead) => lead.id === trackedId);
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
        return { title: commission.title, nextStep: "If the guards stop you on the way out, use Ferran's password. Take the boat back and report to the council clerk." };
      }
      if (commission.id === "castle" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Return to City Hall and report Tyranthraxus's defeat to the council clerk." };
      }
      if (commission.id === "ohlo" && tracked.status === "ready-to-report") {
        return { title: commission.title, nextStep: "Take the package back to Ohlo and choose Give when he asks for the potion." };
      }
      return { title: commission.title, nextStep: tracked.detail };
    }
    let nextStep = tracked?.status === "accepted" ? commission.afterAcceptance ?? commission.next : commission.next;
    if (commission.id === "slums" && tracked?.clearedEncounters !== undefined) nextStep = tracked.detail;
    if (commission.id === "textile" && tracked?.status === "accepted") nextStep = tracked.detail;
    if (commission.id === "ohlo" && tracked?.status === "accepted" && knows("ohlo-rope-guild")) {
      nextStep = knows("ohlo-booth")
        ? "At the booth, choose Speak and enter OHLO. Bring the package back to him."
        : "Look for the booth on the east side of the Rope Guild. Approach it from the west, then give Ohlo's name.";
    }
    if (commission.id === "sokal") {
      if (knows("sokal-ferran")) nextStep = "Hear Ferran out and answer him truthfully about Phlan.";
      else if (knows("sokal-pale-form") && knows("sokal-parchment")) nextStep = "Talk to the pale form. When asked for a word, try one from the parchment.";
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
    if (commission.id === "textile" && value < 254) {
      const box = global(0x4ac8);
      if (box === 1 || box === 128) {
        progress.push({
          id, title: `${commission.title} - ${box === 1 ? "recovered" : "seal broken"}`,
          detail: box === 1 ? "Bring the sealed box back to New Phlan, then visit the council clerk."
            : "Return to City Hall. The box was opened and its family seal is broken.",
          status: "accepted",
        });
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
      (commission.id === "auction" && value === 1);
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
  if (text.includes("I AM THE LIFE FORM OF FERRAN MARTINEZ")) {
    leads.push({
      id: "sokal-ferran", title: "Ferran Martinez",
      detail: "Ferran is bound to guard the keep and asks whether Phlan has been freed.",
    });
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
  if (text.includes("TO PASS MY GUARDS ON THE WAY OUT, SPEAK THE WORD 'SAMOSUD'")) {
    leads.push({ id: "sokal-departure", title: "Ferran's password", detail: "Ferran told the party to say SAMOSUD to his guards on the way out." });
  }
  if (text.includes("USE THESE CLOTHES AS A DISGUISE AND YOU WILL ESCAPE NOTICE")) {
    leads.push({ id: "castle-disguise", title: "Help inside Valjevo Castle", detail: "Rebels offered the party clothes to pass as castle inhabitants." });
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
