import { readFileSync, writeFileSync } from "node:fs";

interface SourceLine { id: string; text: string }
interface Selection { id: string; sourceId: string }
interface Rule { id: string; pattern: string; disposition: string; reason: string }

const inventory = JSON.parse(readFileSync(new URL("../src/audio/voice-inventory.json", import.meta.url), "utf8")) as
  { lines: SourceLine[] };
const plan = JSON.parse(readFileSync(new URL("../src/audio/voice-plan.json", import.meta.url), "utf8")) as
  { selections: Selection[] };
const exclusions = JSON.parse(readFileSync(new URL("../src/audio/voice-exclusions.json", import.meta.url), "utf8")) as
  { policy: string; rules: Rule[] };
const output = process.argv[2] ?? "src/audio/voice-dispositions.json";
const selected = new Map(plan.selections.map((selection) => [selection.sourceId, selection]));
const rules = exclusions.rules.map((rule) => ({ ...rule, regex: new RegExp(rule.pattern) }));

const entries = inventory.lines.map((line) => {
  const selection = selected.get(line.id);
  if (selection) return { sourceId: line.id, disposition: "selected", selectionId: selection.id, ruleId: null, reason: null };
  const rule = rules.find(({ regex }) => regex.test(line.text));
  if (rule) return { sourceId: line.id, disposition: rule.disposition, selectionId: null,
    ruleId: rule.id, reason: rule.reason };
  return { sourceId: line.id, disposition: "pending-editorial-review", selectionId: null, ruleId: null, reason: null };
});
const counts = Object.fromEntries([...new Set(entries.map(({ disposition }) => disposition))].sort()
  .map((disposition) => [disposition, entries.filter((entry) => entry.disposition === disposition).length]));
writeFileSync(output, `${JSON.stringify({ schema: 1, enhancedOnly: true, policy: exclusions.policy,
  sourceEntries: inventory.lines.length, counts, entries }, null, 2)}\n`);
console.log(`wrote ${entries.length} voice dispositions: ${JSON.stringify(counts)}`);
