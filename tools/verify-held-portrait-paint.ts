import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

interface Pose { member: number; durationMs: number; viewport: string }
interface Paint { key: string; atMs: number }
interface ChromeProof { route: string; data: "original" | "port"; paints: Paint[]; sha256: Record<string, string> }

const [nativePath, scene, originalPath, portPath] = process.argv.slice(2);
if (!nativePath || !scene || !originalPath || !portPath) {
  throw new Error("Usage: node --import tsx tools/verify-held-portrait-paint.ts <native cycles.json> <scene> <original Chrome.json> <port Chrome.json>");
}
const cycles = (JSON.parse(readFileSync(nativePath, "utf8")) as Record<string, Pose[][]>)[scene];
assert.ok(cycles?.length, `No native cycle recorded for ${scene}`);
assert.equal(cycles.length, 1, `Specify evidence for one native cycle of ${scene} at a time`);
const source = scene.split(":").slice(-2).join(":");

// The guest can draw the same pixels from different native members. Adjacent
// repeats extend the visible hold. Other repeats use the first member's art.
const visual: Pose[] = [];
const firstMember = new Map<string, number>();
for (const pose of cycles[0]!) {
  const member = firstMember.get(pose.viewport) ?? pose.member;
  firstMember.set(pose.viewport, member);
  const previous = visual.at(-1);
  if (previous?.viewport === pose.viewport) previous.durationMs += pose.durationMs;
  else visual.push({ ...pose, member });
}
if (visual[0]!.viewport === visual.at(-1)?.viewport) visual[0]!.durationMs += visual.pop()!.durationMs;

function check(path: string, data: ChromeProof["data"]) {
  const proofs = JSON.parse(readFileSync(path, "utf8")) as ChromeProof[];
  assert.equal(proofs.length, 1, `Specify one Chrome loop per data source: ${path}`);
  const proof = proofs[0]!;
  assert.equal(proof.data, data);
  // The first paint may have been sampled partway through its hold. The
  // remaining trace has at least two full cycles and one concluding paint.
  const paints = proof.paints.slice(1);
  assert.ok(paints.length >= 2 * visual.length + 1, `Incomplete visible cycles in ${data}`);
  const memberOf = ({ key }: Paint) => {
    assert.match(key, /^portrait:/);
    assert.match(proof.sha256[key] ?? "", /^[a-f0-9]{64}$/);
    const [archive, block, member, frame] = key.split(":").slice(-4);
    assert.equal(`${archive}:${block}`, source);
    assert.equal(frame, "0");
    return Number(member);
  };
  const members = paints.map(memberOf);
  const start = visual.findIndex((_, offset) => members.every((member, index) =>
    member === visual[(offset + index) % visual.length]!.member));
  assert.ok(start >= 0, `${data} visible member order differs from the native cycle: ${members.join(",")}`);
  const expectedCycleMs = visual.reduce((sum, pose) => sum + pose.durationMs, 0);
  const actualHolds = paints.slice(0, -1).map(({ atMs }, i) => paints[i + 1]!.atMs - atMs);
  for (let i = 0; i < actualHolds.length; i++) {
    const expectedMs = visual[(start + i) % visual.length]!.durationMs;
    // A paint's observed onset can be quantized at both ends of the hold.
    const actualMs = actualHolds[i]!;
    assert.ok(actualMs > 0 && Math.abs(actualMs - expectedMs) <= 34,
      `${data} member ${members[i]}: held ${Math.round(actualMs)} ms, expected ${expectedMs} ms`);
  }
  for (const index of [0, visual.length]) {
    const cycleMs = paints[index + visual.length]!.atMs - paints[index]!.atMs;
    assert.ok(Math.abs(cycleMs - expectedCycleMs) <= Math.max(34, visual.length * 10),
      `${data} visible cycle took ${Math.round(cycleMs)} ms, expected ${expectedCycleMs} ms`);
  }
  return proof.route;
}

const original = check(originalPath, "original");
assert.equal(check(portPath, "port"), original, "Evidence must be from the same scene replay");
console.log(`${scene}: verified ${visual.map(({ member, durationMs }) => `${member} for ${durationMs} ms`).join(", ")} from both data sources in Chrome (${original}).`);
