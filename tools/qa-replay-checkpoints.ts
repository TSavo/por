// Which presentation replays run from a clean checkout (#90).
//
// tools/verify-slums-presentation.mjs <checkpoint> <chrome> <route> [option] plays one route from a saved
// game. Only new-phlan-rolf-approach starts a fresh game. Every other route needs a checkpoint save, and no
// code said which one. This reads the verifier's route tables and the registry qa/replay-checkpoints.json
// (plus the run lines in qa/fixtures/*/README.md) and counts the routes whose checkpoint is in the repository.
//
//   npm run qa:replay-checkpoints            the count, by table; exit 1 while any route has no committed checkpoint
//   npm run qa:replay-checkpoints -- --list  every route with its table, slot, checkpoint and status
//
// A route is runnable from a clean checkout when
//   - it starts a fresh game (registry "fresh"), or
//   - the registry (or a fixture README run line) names a checkpoint file that exists under qa/fixtures, or
//   - it is a chained route ("chains": it consumes the native save another route writes) whose first route is runnable.
// "proved" is separate: the registry's "proved" list holds routes that were run in Chrome from the named file.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const verifier = "tools/verify-slums-presentation.mjs";
const registryPath = "qa/replay-checkpoints.json";

interface Registry {
  fresh: string[];
  checkpoints: Record<string, string>;
  chains: Record<string, string>;
  proved: string[];
}
interface Route { name: string; table: string; slot?: string; text?: string }

const source = readFileSync(verifier, "utf8");
const lines = source.split("\n");
const routes = new Map<string, Route>();
const add = (name: string, table: string, slot?: string) => {
  const known = routes.get(name);
  if (!known) routes.set(name, { name, table, slot });
  else if (!known.slot && slot) known.slot = slot;
};

// Route tables: `const <table> = new Map([` ... `]);` with entries `  ["<name>", {`.
let table: string | undefined;
let current: Route | undefined;
for (const line of lines) {
  const open = /^const (\w+) = new Map\(\[/.exec(line);
  if (open) { table = open[1]; current = undefined; continue; }
  if (table && /^\]\)/.test(line)) { table = undefined; current = undefined; continue; }
  if (!table) continue;
  const entry = /^  \["([a-z0-9][a-z0-9.-]*)", /.exec(line);
  if (entry) { add(entry[1]!, table); current = routes.get(entry[1]!); continue; }
  if (current) current.text = (current.text ?? "") + line + "\n";
  const slot = /^\s{4}slot: "([A-J])"/.exec(line);
  if (slot && current && !current.slot) current.slot = slot[1];
}
// Tables that are not route tables: the Mendor reward table and the controlled battle table hold routes too, but
// mendorCouncilRewards keys are reward ids; keep only names the verifier also tests against routeName.
const tested = new Set<string>();
for (const m of source.matchAll(/routeName === "([a-z0-9][a-z0-9-]*)"/g)) tested.add(m[1]!);
for (const m of source.matchAll(/\[((?:"[a-z0-9-]+",?\s*)+)\]\.includes\(routeName\)/g))
  for (const n of m[1]!.matchAll(/"([a-z0-9-]+)"/g)) tested.add(n[1]!);
for (const name of tested) add(name, "explicit");
for (const [name, route] of [...routes]) if (route.table === "mendorCouncilRewards" && !tested.has(name)) routes.delete(name);

const registry: Registry = existsSync(registryPath)
  ? JSON.parse(readFileSync(registryPath, "utf8")) as Registry
  : { fresh: ["new-phlan-rolf-approach"], checkpoints: {}, chains: {}, proved: [] };

// Fixture README run lines: `verify-slums-presentation.mjs qa/fixtures/<dir>/<slot>.json "<Chrome>" <route>`.
const fromReadme = new Map<string, string>();
for (const dir of readdirSync("qa/fixtures")) {
  const readme = join("qa/fixtures", dir, "README.md");
  if (!existsSync(readme)) continue;
  for (const m of readFileSync(readme, "utf8").matchAll(/verify-slums-presentation\.mjs\s+(qa\/fixtures\/\S+\.json)\s+"?<?[^">]*>?"?\s+([a-z0-9-]+)/g))
    fromReadme.set(m[2]!, m[1]!);
}

function checkpoint(name: string, seen = new Set<string>()): { file?: string; status: "fresh" | "committed" | "chained" | "missing" } {
  if (registry.fresh.includes(name)) return { status: "fresh" };
  const file = registry.checkpoints[name] ?? fromReadme.get(name);
  if (file && existsSync(file)) return { file, status: "committed" };
  const first = registry.chains[name];
  if (first && !seen.has(first)) {
    const base = checkpoint(first, new Set([...seen, name]));
    if (base.status !== "missing") return { file: base.file, status: "chained" };
  }
  return { status: "missing" };
}

const rows = [...routes.values()].sort((a, b) => a.name.localeCompare(b.name)).map(route => ({ ...route, ...checkpoint(route.name) }));
const total = rows.length;
const runnable = rows.filter(row => row.status !== "missing").length;
const proved = rows.filter(row => registry.proved.includes(row.name) && row.status !== "missing").length;

if (process.argv.includes("--json")) {
  console.log(JSON.stringify(rows));
  process.exit(0);
}
if (process.argv.includes("--group")) {
  // The start state a red route needs, as far as its table entry says: slot, area, first script cursor, first picture.
  const state = (row: (typeof rows)[number]) => {
    const text = (row as { text?: string }).text ?? "";
    const area = /area:(\d+)/.exec(text)?.[1];
    const cursor = /ecl:([a-f0-9]{4})/.exec(text)?.[1];
    const scene = /"((?:portrait|encounter|combat|scene|tile)[:\w.-]*)"/.exec(text)?.[1]?.replace(/^(\w+):area:\d+:(?:ecl:[a-f0-9]{4}:)?/, "$1:");
    if (!text) return `${row.slot ?? "?"} | area ? | explicit route: ${row.name.split("-").slice(0, 2).join("-")}-*`;
    return `${row.slot ?? "?"} | area ${area ?? "?"} | cursor ${cursor ?? "?"} | ${scene ?? "no picture key"}`;
  };
  const groups = new Map<string, string[]>();
  for (const row of rows.filter(r => r.status === "missing")) {
    const key = state(row);
    groups.set(key, [...(groups.get(key) ?? []), row.name]);
  }
  const ordered = [...groups].sort((a, b) => b[1].length - a[1].length);
  console.log(`${ordered.length} distinct start states serve ${rows.filter(r => r.status === "missing").length} red routes (slot | area | script cursor | first picture), largest first:`);
  for (const [key, names] of ordered) console.log(`${String(names.length).padStart(4)}  ${key}  e.g. ${names.slice(0, 3).join(", ")}`);
  process.exit(0);
}
if (process.argv.includes("--list")) {
  for (const row of rows) console.log(`${row.status.padEnd(9)} ${row.table.padEnd(18)} ${(row.slot ?? "?").padEnd(2)} ${row.name}${row.file ? `  ${row.file}` : ""}`);
}
const tables = new Map<string, { total: number; runnable: number }>();
for (const row of rows) {
  const entry = tables.get(row.table) ?? { total: 0, runnable: 0 };
  entry.total++;
  if (row.status !== "missing") entry.runnable++;
  tables.set(row.table, entry);
}
console.log("table               runnable   total   left");
for (const [name, entry] of [...tables].sort()) console.log(`${name.padEnd(18)} ${String(entry.runnable).padStart(9)} ${String(entry.total).padStart(7)} ${String(entry.total - entry.runnable).padStart(6)}`);
console.log(`\nPresentation replays runnable from a clean checkout: ${runnable} / ${total} (R = ${total - runnable}); proved in Chrome from the named file: ${proved}.`);
console.log("Fresh start: " + rows.filter(row => row.status === "fresh").map(row => row.name).join(", "));
console.log(`Registry: ${registryPath}; checkpoint files live in qa/fixtures/<name>/<slot>.json. Replacement shape: add the route to "checkpoints" (or "chains", or "fresh").`);
process.exit(runnable === total ? 0 : 1);
