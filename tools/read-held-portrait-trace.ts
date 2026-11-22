import { readFileSync } from "node:fs";

interface Draw {
  area: number;
  cursor: number;
  caller?: number;
  archive: string;
  block: number;
  member: number;
  finishedAtMs: number;
  viewport: string;
  producer?: string;
}

interface Pose {
  member: number;
  durationMs: number;
  viewport: string;
}

function sceneId({ area, cursor, caller, archive, block }: Draw) {
  const callerScope = caller === undefined ? "" : `:caller:${caller.toString(16)}`;
  return `area:${area}:ecl:${cursor.toString(16)}${callerScope}:${archive}:${block}`;
}

function findCycle(draws: Draw[]) {
  // A trace starts when a member finishes. Its first hold may have started
  // before the trace, so measure from successive finish times.
  const poses = draws.slice(1).map(({ member, finishedAtMs, viewport }, i): Pose => ({
    member, durationMs: finishedAtMs - draws[i]!.finishedAtMs, viewport,
  }));
  const equals = (a: Pose, b: Pose) => a.member === b.member && a.durationMs === b.durationMs && a.viewport === b.viewport;
  for (let start = 0; start + 3 < poses.length; start++) {
    for (let length = 2; start + 2 * length <= poses.length; length++) {
      if (!equals(poses[start]!, poses[start + length]!)) continue;
      const cycle = poses.slice(start, start + length);
      if (cycle.some(pose => pose.durationMs <= 0) || new Set(cycle.map(pose => pose.viewport)).size < 2) continue;
      if (!cycle.every((pose, i) => equals(pose, poses[start + length + i]!))) continue;
      // Store the cycle starting from the lowest native member.
      const origin = cycle.findIndex(pose => pose.member === Math.min(...cycle.map(item => item.member)));
      return [...cycle.slice(origin), ...cycle.slice(0, origin)];
    }
  }
}

const withProducers = process.argv.includes("--with-producers");
const paths = process.argv.slice(2).filter(arg => arg !== "--with-producers");
if (!paths.length) throw new Error("Usage: node --import tsx tools/read-held-portrait-trace.ts [--with-producers] <native trace.jsonl> [...]");
const scenes = new Map<string, { producer?: string; poses: Pose[] }[]>();
for (const path of paths) {
  const draws = readFileSync(path, "utf8").trim().split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as Draw);
  let run: Draw[] = [];
  for (const draw of draws) {
    if (run.length && (sceneId(draw) !== sceneId(run[0]!) || draw.producer !== run[0]!.producer)) {
      addRun(run);
      run = [];
    }
    run.push(draw);
  }
  if (run.length) addRun(run);
}

function addRun(run: Draw[]) {
  const poses = findCycle(run);
  if (!poses) return;
  const id = sceneId(run[0]!);
  const cycles = scenes.get(id) ?? [];
  const cycle = { producer: withProducers ? run[0]!.producer : undefined, poses };
  if (!cycles.some(existing => JSON.stringify(existing) === JSON.stringify(cycle))) cycles.push(cycle);
  scenes.set(id, cycles);
}

const entries = [...scenes].sort(([a], [b]) => a.localeCompare(b))
  .map(([id, cycles]) => [id, withProducers ? cycles : cycles.map(cycle => cycle.poses)]);
console.log(JSON.stringify(Object.fromEntries(entries), null, 2));
if (!scenes.size) process.exitCode = 1;
