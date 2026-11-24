import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// The QA inventory lists every feature of the game in both display modes and
// the checks that cover each one. A feature with no check is open. This
// report prints the open count and fails while it is above zero.
//
//   npm run qa:inventory            report and fail on open features
//   npm run qa:inventory -- --list  also list every open feature

interface Check {
  id: string;
  title: string;
  command: string;
  /** What the check compares against. "original" means the DOS program or its bytes. */
  reference: "original" | "game-data" | "recorded-play" | "self";
  needs: string[];
}
interface Feature {
  id: string;
  title: string;
  /** Where the feature comes from: a file, a data table, or a guide. */
  evidence: string[];
  checks: string[];
  /** Why a listed check does not yet fully cover the feature. */
  gap?: string;
}
interface Inventory { schema: 1; mode: "classic" | "enhanced" | "guides"; groups: { name: string; features: Feature[] }[] }

const root = new URL("../qa/", import.meta.url);
const read = <T>(path: URL): T => JSON.parse(readFileSync(path, "utf8")) as T;
const checks = read<{ schema: 1; checks: Check[] }>(new URL("checks.json", root)).checks;
const checkIds = new Set(checks.map(({ id }) => id));
const problems: string[] = [];
if (checkIds.size !== checks.length) problems.push("qa/checks.json has duplicate check ids");
for (const check of checks) {
  const script = /^npm run ([^\s]+)/.exec(check.command)?.[1];
  const scripts = read<{ scripts: Record<string, string> }>(new URL("../package.json", import.meta.url)).scripts;
  if (script && !scripts[script]) problems.push(`check ${check.id} names a missing npm script: ${script}`);
  const tool = /(?:tsx|node|python) (tools\/[\w./-]+)/.exec(check.command)?.[1];
  if (tool && !existsSync(new URL(`../${tool}`, import.meta.url))) problems.push(`check ${check.id} names a missing file: ${tool}`);
}

const listOpen = process.argv.includes("--list");
const directory = new URL("inventory/", root);
const seen = new Set<string>();
const used = new Set<string>();
let total = 0;
let open = 0;
let partial = 0;
const openIds: string[] = [];
const rows: string[] = [];
for (const file of readdirSync(directory).filter(name => name.endsWith(".json")).sort()) {
  const inventory = read<Inventory>(new URL(file, directory));
  for (const group of inventory.groups) {
    let groupOpen = 0;
    let groupPartial = 0;
    for (const feature of group.features) {
      total++;
      if (seen.has(feature.id)) problems.push(`duplicate feature id ${feature.id}`);
      seen.add(feature.id);
      if (!feature.evidence?.length) problems.push(`feature ${feature.id} names no evidence`);
      for (const id of feature.checks) {
        if (!checkIds.has(id)) problems.push(`feature ${feature.id} names an unknown check: ${id}`);
        used.add(id);
      }
      if (!feature.checks.length) {
        groupOpen++;
        openIds.push(`${feature.id}  ${feature.title}`);
      } else if (feature.gap) groupPartial++;
    }
    open += groupOpen;
    partial += groupPartial;
    rows.push(`${inventory.mode.padEnd(9)} ${group.name.padEnd(34)} ${String(group.features.length).padStart(5)} ` +
      `${String(group.features.length - groupOpen - groupPartial).padStart(8)} ${String(groupPartial).padStart(8)} ${String(groupOpen).padStart(6)}`);
  }
}
for (const { id } of checks) if (!used.has(id)) problems.push(`check ${id} covers no feature`);

console.log(`${"mode".padEnd(9)} ${"group".padEnd(34)} ${"total".padStart(5)} ${"covered".padStart(8)} ${"partial".padStart(8)} ${"open".padStart(6)}`);
for (const row of rows) console.log(row);
console.log(`\n${total} features: ${total - open - partial} covered, ${partial} partly covered, ${open} open`);
const original = checks.filter(({ reference }) => reference === "original").length;
console.log(`${checks.length} checks, ${original} of them compare against the original program`);
const findings = read<{ findings: { id: string; title: string; status: string; check?: string }[] }>(new URL("findings.json", root)).findings;
for (const finding of findings) {
  if (finding.status === "fixed" && !checkIds.has(finding.check ?? "")) problems.push(`finding ${finding.id} is marked fixed without a known check`);
}
const openFindings = findings.filter(({ status }) => status === "open");
console.log(`${findings.length} findings: ${openFindings.length} open`);
if (listOpen) console.log(`\nOpen findings:\n  ${openFindings.map(({ id, title }) => `${id}  ${title}`).join("\n  ")}`);
if (listOpen && openIds.length) console.log(`\nOpen features:\n  ${openIds.join("\n  ")}`);
if (problems.length) console.error(`\nInventory problems:\n  ${problems.join("\n  ")}`);
if (problems.length || open || partial || openFindings.length) process.exit(1);
