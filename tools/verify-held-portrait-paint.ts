import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export interface Pose { member: number; durationMs: number; viewport: string }
interface Paint { key: string; atMs: number }
export interface ChromeProof {
  route: string;
  data: "original" | "port";
  rendererSha256: string;
  portrait?: string;
  bindingSha256?: string;
  paints: Paint[];
  sha256: Record<string, string>;
}

export function verifyHeldPortraitPaint(scene: string, cycle: Pose[], original: ChromeProof, port: ChromeProof) {
  const source = scene.split(":").slice(-2).join(":");

  // The guest can draw the same pixels from different native members. Adjacent
  // repeats extend the visible hold. Other repeats use the first member's art.
  const visual: Pose[] = [];
  const firstMember = new Map<string, number>();
  for (const pose of cycle) {
    const member = firstMember.get(pose.viewport) ?? pose.member;
    firstMember.set(pose.viewport, member);
    const previous = visual.at(-1);
    if (previous?.viewport === pose.viewport) previous.durationMs += pose.durationMs;
    else visual.push({ ...pose, member });
  }
  if (visual[0]!.viewport === visual.at(-1)?.viewport) visual[0]!.durationMs += visual.pop()!.durationMs;

  function check(proof: ChromeProof, data: ChromeProof["data"]) {
    assert.equal(proof.data, data);
    // The first paint may have been sampled partway through its hold. The
    // remaining trace has at least two full cycles and one concluding paint.
    const paints = proof.paints.slice(1);
    assert.ok(paints.length >= 2 * visual.length + 1, `Incomplete visible cycles in ${data}`);
    const memberOf = ({ key }: Paint) => {
      assert.match(key, /^portrait:/);
      const area = /^portrait:area:(\d+):/.exec(key)?.[1];
      if (area !== undefined) assert.equal(area, scene.split(":")[1]);
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

  const route = check(original, "original");
  assert.equal(check(port, "port"), route, "Evidence must be from the same scene replay");
  return { route, visual };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [nativePath, scene, originalPath, portPath] = process.argv.slice(2);
  if (!nativePath || !scene || !originalPath || !portPath) {
    throw new Error("Usage: node --import tsx tools/verify-held-portrait-paint.ts <native cycles.json> <scene> <original Chrome.json> <port Chrome.json>");
  }
  const cycles = (JSON.parse(readFileSync(nativePath, "utf8")) as Record<string, Pose[][]>)[scene];
  assert.ok(cycles?.length, `No native cycle recorded for ${scene}`);
  assert.equal(cycles.length, 1, `Specify evidence for one native cycle of ${scene} at a time`);
  const original = JSON.parse(readFileSync(originalPath, "utf8")) as ChromeProof[];
  const port = JSON.parse(readFileSync(portPath, "utf8")) as ChromeProof[];
  assert.equal(original.length, 1, "Specify one original Chrome loop");
  assert.equal(port.length, 1, "Specify one bundled Chrome loop");
  const { route, visual } = verifyHeldPortraitPaint(scene, cycles[0]!, original[0]!, port[0]!);
  console.log(`${scene}: verified ${visual.map(({ member, durationMs }) => `${member} for ${durationMs} ms`).join(", ")} from both data sources in Chrome (${route}).`);
}
