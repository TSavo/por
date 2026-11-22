/**
 * npm run qa:visits
 *
 * Which areas of the game (src/maps/area-catalog.json) and which of the council's commissions
 * (src/runtime/commission-journal.ts) the shipped-game comparison (npm run verify:port-parity) and
 * the campaign replay reach (#130). A gap in the shipped game's data can only be found where a
 * walk goes, so this counts what the walks have reached and names the rest.
 *
 * qa/visit-coverage.json holds, for each walk, what the runner's visit trace saw on a run of it:
 * POR_TRACE_VISITS=<file> makes the runner write the script in memory (its ECLn.DAX archive and block,
 * which name the area) and the journal's commissions with their status each time either changes.
 *
 *   tsx tools/visit-coverage.ts --record <walk> <trace.jsonl>...   adds a walk (or replaces it)
 *   tsx tools/visit-coverage.ts                                     reports; exit 1 while any is unvisited
 *
 * An area counts once a walk has stood in it. A commission counts once a walk has seen it done
 * (ready to report, reward pending or turned in): accepted is not enough, its place may be unvisited.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { commissions } from "../src/runtime/commission-journal.js";
import { fromPortRoot } from "./port-root.js";

interface Walk { areas: number[]; commissions: string[]; traces: string[] }
interface Coverage { schema: 1; note: string; walks: Record<string, Walk> }

const coveragePath = fromPortRoot("qa", "visit-coverage.json");
const catalog = JSON.parse(readFileSync(fromPortRoot("src", "maps", "area-catalog.json"), "utf8")) as { areas: { id: number; name: string; scriptArchive: string }[] };
const done = new Set(["ready-to-report", "reward-pending", "turned-in"]);
const read = (): Coverage => existsSync(coveragePath) ? JSON.parse(readFileSync(coveragePath, "utf8")) as Coverage
  : { schema: 1, note: "What each walk's runner visit trace (POR_TRACE_VISITS) saw. Written by tsx tools/visit-coverage.ts --record. Read by npm run qa:visits.", walks: {} };

const [flag, walkName, ...traces] = process.argv.slice(2);
if (flag === "--record") {
  if (!walkName || !traces.length) throw new Error("usage: tsx tools/visit-coverage.ts --record <walk> <trace.jsonl>...");
  const areas = new Set<number>(), finished = new Set<string>();
  for (const trace of traces) {
    for (const line of readFileSync(trace, "utf8").split("\n").filter(Boolean)) {
      // An area is its script: the catalog's id is the block, in the archive the catalog names. The
      // menus before a game is loaded leave a script of another archive in memory, which counts for none.
      const visit = JSON.parse(line) as { archive: number; block: number; commissions: string[] };
      const area = catalog.areas.find(({ id, scriptArchive }) => id === visit.block && scriptArchive === `ECL${visit.archive}.DAX`);
      if (area) areas.add(area.id);
      for (const entry of visit.commissions) {
        const [id, status] = entry.split(":");
        if (done.has(status ?? "")) finished.add(id!.replace(/^commission-/, ""));
      }
    }
  }
  const coverage = read();
  coverage.walks[walkName] = { areas: [...areas].sort((a, b) => a - b), commissions: [...finished].sort(), traces: traces.map((path) => path.replace(/^.*\//, "")) };
  writeFileSync(coveragePath, JSON.stringify(coverage, null, 1) + "\n");
  console.log(`Recorded ${walkName}: ${areas.size} areas, ${finished.size} commissions done.`);
  process.exit(0);
}

const coverage = read();
const reachedBy = (test: (walk: Walk) => boolean) => Object.entries(coverage.walks).filter(([, walk]) => test(walk)).map(([name]) => name);
const areaRows = catalog.areas.map(({ id, name }) => ({ id, name, walks: reachedBy((walk) => walk.areas.includes(id)) }));
const commissionRows = commissions.map(({ id, title }) => ({ id, title, walks: reachedBy((walk) => walk.commissions.includes(id)) }));
const unseenAreas = areaRows.filter(({ walks }) => !walks.length);
const unseenCommissions = commissionRows.filter(({ walks }) => !walks.length);
console.log(`Areas visited: ${areaRows.length - unseenAreas.length} / ${areaRows.length}`);
for (const { id, name, walks } of areaRows) console.log(`  ${walks.length ? "visited  " : "UNVISITED"} ${String(id).padStart(2)} ${name}${walks.length ? `  (${walks.join(", ")})` : ""}`);
console.log(`Commissions done in a walk: ${commissionRows.length - unseenCommissions.length} / ${commissionRows.length}`);
for (const { id, title, walks } of commissionRows) console.log(`  ${walks.length ? "done     " : "NOT DONE "} ${id.padEnd(10)} ${title}${walks.length ? `  (${walks.join(", ")})` : ""}`);
const missing = unseenAreas.length + unseenCommissions.length;
console.log(missing ? `${unseenAreas.length} areas and ${unseenCommissions.length} commissions no walk reaches.` : "Every area and commission is reached by a walk.");
process.exit(missing ? 1 : 0);
