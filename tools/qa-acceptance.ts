import { readdirSync, readFileSync } from "node:fs";

// The walkthrough acceptance scenarios, counted.
//
//   npm run qa:acceptance             the count for each area, and the total still without a check
//   npm run qa:acceptance -- --list   also name every scenario without a check
//
// qa/acceptance holds one scenario for each thing the walkthroughs, the SSI Clue Book and the
// Adventurer's Journal say the game does. A scenario is done when a check that runs the game
// proves it: its `check` field names an entry in qa/checks.json. `coveredBy` only records that
// an existing replay walks through the same place, which is where to start, not proof.
// The report fails while any scenario has no check.

interface Scenario { id: string; title: string; kind: "main" | "optional" | "quirk" | "rule"; coveredBy?: string[]; check?: string }
const folder = new URL("../qa/acceptance/", import.meta.url);
const checks = new Set((JSON.parse(readFileSync(new URL("../qa/checks.json", import.meta.url), "utf8")) as
  { checks: { id: string }[] }).checks.map(({ id }) => id));
const problems: string[] = [];
const seen = new Set<string>();
const open: string[] = [];
const totals = { scenarios: 0, checked: 0, walked: 0 };
console.log(`${"area".padEnd(40)} ${"scenarios".padStart(9)} ${"checked".padStart(8)} ${"walked".padStart(7)} ${"open".padStart(5)}`);
for (const file of readdirSync(folder).filter(name => name.endsWith(".json")).sort()) {
  const area = JSON.parse(readFileSync(new URL(file, folder), "utf8")) as { title: string; scenarios: Scenario[] };
  let checked = 0, walked = 0;
  for (const scenario of area.scenarios) {
    if (seen.has(scenario.id)) problems.push(`duplicate scenario id ${scenario.id}`);
    seen.add(scenario.id);
    if (scenario.check !== undefined) {
      if (checks.has(scenario.check)) checked++;
      else problems.push(`${scenario.id} names an unknown check: ${scenario.check}`);
    } else {
      if (scenario.coveredBy?.length) walked++;
      open.push(`${scenario.id}  [${scenario.kind}]  ${scenario.title}`);
    }
  }
  totals.scenarios += area.scenarios.length;
  totals.checked += checked;
  totals.walked += walked;
  console.log(`${area.title.slice(0, 40).padEnd(40)} ${String(area.scenarios.length).padStart(9)} ${String(checked).padStart(8)} ` +
    `${String(walked).padStart(7)} ${String(area.scenarios.length - checked).padStart(5)}`);
}
console.log(`\n${totals.scenarios} scenarios: ${totals.checked} proved by a check, ${totals.scenarios - totals.checked} open ` +
  `(${totals.walked} of those are in places an existing replay already walks)`);
if (process.argv.includes("--list")) console.log(`\nOpen scenarios:\n  ${open.join("\n  ")}`);
if (problems.length) console.error(`\nProblems:\n  ${problems.join("\n  ")}`);
if (problems.length || totals.checked < totals.scenarios) process.exit(1);
