import { readFileSync, renameSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { discoveredLeads, type JournalLead } from "../src/runtime/adventure-log.js";

const statusRank = { offered: 1, accepted: 2, "ready-to-report": 3, "reward-pending": 4, "turned-in": 5 };

/** An explicitly selected party's journal, stored outside DOS guest memory. */
export function openJournalProfile(path?: string) {
  const leads = new Map<string, JournalLead>();
  if (path) {
    let raw: string | undefined;
    try {
      raw = readFileSync(path, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
    if (raw !== undefined) {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Array.isArray(data.leads)) throw new Error("Invalid journal profile");
      for (const lead of data.leads) {
        if (typeof lead?.id !== "string" || typeof lead.title !== "string" || typeof lead.detail !== "string") {
          throw new Error("Invalid lead in journal profile");
        }
        leads.set(lead.id, lead);
      }
    }
  }
  const update = (transcript: string, readProgress?: (known: JournalLead[]) => JournalLead[]): JournalLead[] => {
    let changed = false;
    const observed = discoveredLeads(transcript);
    const reported = readProgress?.([...leads.values(), ...observed]) ?? [];
    for (const lead of [...observed, ...reported]) {
      const prior = leads.get(lead.id);
      const advancingCount = lead.clearedEncounters !== undefined &&
        lead.clearedEncounters > (prior?.clearedEncounters ?? 0);
      const changedBox = lead.textileBox !== undefined && lead.textileBox !== prior?.textileBox;
      const learnedRewardOutcome = lead.rewardOutcome !== undefined && lead.rewardOutcome !== prior?.rewardOutcome;
      // The rescue flag can mean "escort in progress", "ready to report", or
      // "report a failed rescue". The current guest state resolves these cases.
      const rescueChanged = lead.id === "commission-rescue" && prior?.status === "ready-to-report" &&
        (lead.status === "accepted" || (lead.status === "ready-to-report" && lead.detail !== prior.detail));
      if (prior && !rescueChanged && (!lead.status || (prior.status && (statusRank[prior.status] > statusRank[lead.status] ||
        (statusRank[prior.status] === statusRank[lead.status] && !advancingCount && !changedBox && !learnedRewardOutcome))))) continue;
      leads.set(lead.id, lead);
      changed = true;
    }
    const result = [...leads.values()];
    if (path && changed) {
      const pending = `${path}.${randomUUID()}.tmp`;
      writeFileSync(pending, JSON.stringify({ version: 1, leads: result }, null, 2) + "\n", { flag: "wx" });
      renameSync(pending, path);
    }
    return result;
  };
  return Object.assign(update, {
    restore(saved: readonly JournalLead[]) {
      leads.clear();
      for (const lead of saved) leads.set(lead.id, lead);
      path = undefined;
    },
  });
}
