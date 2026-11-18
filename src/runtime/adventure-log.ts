import type { Cpu } from "../cpu/machine.js";
import { farCallObservers } from "./far.js";
import type { LoadedSlice } from "./overlay.js";
import { commissions } from "./commission-journal.js";

/**
 * Observe text the original PoR ECL interpreter emits. Slice 7 adds the
 * character at [BP-7] to the message at 129E through System's Char-to-string
 * helper. At the far-call boundary the character is the first stack argument.
 */
export function observeAdventureLog(cpu: Cpu, slice: LoadedSlice): () => string {
  if (slice.index !== 7) throw new Error("The PoR adventure log requires overlay slice 7");
  const chunks: string[] = [];
  let lastStep = 0;
  farCallObservers.set(cpu, (seg, off) => {
    if (seg !== 0x5bb || off !== 0x74f || cpu.cs !== slice.loadPara ||
        cpu.read16(cpu.ss, cpu.sp) !== 0x12a3) return;
    const char = cpu.read8(cpu.ss, cpu.sp + 4);
    if (cpu.steps - lastStep > 100_000 && chunks.length) chunks.push("\n\n");
    lastStep = cpu.steps;
    if (char === 13) chunks.push("\n");
    else if (char >= 32 && char <= 126) chunks.push(String.fromCharCode(char));
  });
  return () => chunks.join("").trim();
}

export interface JournalLead {
  id: string;
  title: string;
  detail: string;
  status?: "offered" | "accepted" | "ready-to-report" | "reward-pending" | "turned-in";
}

export interface JournalObjective {
  title: string;
  nextStep: string;
}

/** Pick the first unresolved commission the party has heard about. */
export function currentObjective(leads: readonly JournalLead[], trackedId?: string): JournalObjective {
  const unresolved = leads.filter(isOpenObjective);
  const tracked = unresolved.find((lead) => lead.id === trackedId)
    ?? unresolved.find((lead) => lead.status === "ready-to-report" || lead.status === "reward-pending")
    ?? unresolved.find((lead) => lead.status === "accepted")
    ?? unresolved.find((lead) => lead.id !== "commission-records")
    ?? unresolved[0];
  const commission = commissions.find(({ id }) => tracked?.id === `commission-${id}`);
  if (commission) {
    if (tracked?.status === "ready-to-report" || tracked?.status === "reward-pending") {
      return { title: commission.title, nextStep: tracked.detail };
    }
    let nextStep = tracked?.status === "accepted" ? commission.afterAcceptance ?? commission.next : commission.next;
    if (commission.id === "sokal") {
      const knows = (id: string) => leads.some((lead) => lead.id === id);
      if (knows("sokal-ferran")) nextStep = "Hear Ferran out and answer him truthfully about Phlan.";
      else if (knows("sokal-parchment")) nextStep = "Use the parchment to make sense of the keep's undead patrols.";
      else if (knows("sokal-arrival")) nextStep = "Scout the keep and look for clues to the haunting.";
      else if (knows("passage-sokal")) nextStep = "Catch the boat to Sokal Keep at the end of the pier.";
    }
    return { title: commission.title, nextStep };
  }
  if (leads.some((lead) => lead.id === "commission-castle" && lead.status === "turned-in")) {
    return { title: "Phlan is free", nextStep: "Explore any remaining uncleared areas if you wish." };
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
const progressAddresses: Record<string, number> = {
  slums: 0x4abb,
  sokal: 0x4aa7,
  auction: 0x4ab0,
  kovel: 0x4ab2,
  kobolds: 0x4ab6,
};

/** Refine already disclosed objectives using the translated VM's state. */
export function questProgress(cpu: Cpu, known: readonly JournalLead[], dataSegment: number): JournalLead[] {
  // ovl07:0E4C–0E57 resolves global ECL addresses through DS:4933.
  const base = cpu.read16(dataSegment, 0x4933);
  const segment = cpu.read16(dataSegment, 0x4935);
  if ((base | segment) === 0) return [];
  const progress: JournalLead[] = [];
  for (const commission of commissions) {
    const id = `commission-${commission.id}`;
    const address = progressAddresses[commission.id];
    if (address === undefined || !known.some((lead) => lead.id === id)) continue;
    const value = cpu.read16(segment, base + 0x6e00 + address * 2);
    if (value !== 254 && value !== 255) continue;
    progress.push({
      id,
      title: `${commission.title} - ${value === 254 ? "ready to report" : "turned in"}`,
      detail: value === 254 ? "Return to the council clerk at City Hall to report your success." : "The council acknowledged the result.",
      status: value === 254 ? "ready-to-report" : "turned-in",
    });
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
  for (const commission of commissions) {
    const reported = commission.report !== undefined && text.includes(commission.report);
    const pendingReward = reported && progressAddresses[commission.id] !== undefined;
    const complete = reported && !pendingReward;
    const accepted = commission.accepted !== undefined && text.includes(commission.accepted);
    if (!reported && !accepted && !text.includes(commission.offer)) continue;
    leads.push({
      id: `commission-${commission.id}`,
      title: `${commission.title} - ${complete ? "turned in" : pendingReward ? "reward pending" : accepted ? "accepted" : "offered"}`,
      detail: complete ? "The result was acknowledged."
        : pendingReward ? "Finish collecting the council reward."
        : accepted ? commission.afterAcceptance ?? commission.next : commission.next,
      status: complete ? "turned-in" : pendingReward ? "reward-pending" : accepted ? "accepted" : "offered",
    });
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
