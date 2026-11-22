import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { heldPortraitDiscovery } from "./discover-held-portraits.js";
import { verifyHeldPortraitPaint, type ChromeProof, type Pose } from "./verify-held-portrait-paint.js";

interface HeldPortraitInventory {
  enumerationComplete: boolean;
  scenes: { id: string; poses: Pose[]; chrome?: { original: ChromeProof; port: ChromeProof } }[];
}

export function heldPortraitCoverage(root = fileURLToPath(new URL("../", import.meta.url))) {
  const path = (...parts: string[]) => join(root, ...parts);
  const digest = (value: string | Buffer) => createHash("sha256").update(value).digest("hex");
  const renderer = digest(readFileSync(path("tools", "play.js"), "utf8").replace(/\r\n/g, "\n"));
  const inventory = JSON.parse(readFileSync(path("qa", "held-portraits.json"), "utf8")) as HeldPortraitInventory;
  const assets = new Map<string, string>();
  for (const name of ["upgrades/slums/manifest.json", "upgrades/manifest.json"]) {
    const manifest = JSON.parse(readFileSync(path(name), "utf8")) as { assets: Record<string, string> };
    for (const [id, file] of Object.entries(manifest.assets)) {
      if (id.startsWith("portrait:")) assets.set(id, path(dirname(name), file));
    }
  }
  const remaining = inventory.scenes.flatMap(({ id, poses, chrome }) => {
    const open = (reason: string) => [{ id, reason }];
    if (!chrome) return open("paired Chrome evidence is missing");
    try {
      for (const proof of [chrome.original, chrome.port]) {
        if (proof.rendererSha256 !== renderer) return open(`${proof.data} Chrome evidence predates the current renderer`);
        for (const [key, hash] of Object.entries(proof.sha256)) {
          const file = assets.get(key);
          if (!file || digest(readFileSync(file)) !== hash) return open(`the current art differs for ${key}`);
        }
      }
      verifyHeldPortraitPaint(id, poses, chrome.original, chrome.port);
    } catch (error) {
      return open(error instanceof Error ? error.message : String(error));
    }
    return [];
  });
  const total = inventory.scenes.length;
  return {
    verified: total - remaining.length, total, remaining, enumerationComplete: inventory.enumerationComplete,
    discovery: heldPortraitDiscovery.counts,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { verified, total, remaining, enumerationComplete, discovery } = heldPortraitCoverage();
  console.log(`Held portraits: ${verified} / ${total} measured scenes verified, R = ${remaining.length}.`);
  if (!enumerationComplete) {
    console.log(`The full native scene count is still open. Static discovery has ${discovery.eclCandidates} script candidates and ${discovery.nativeCandidates} native candidates.`);
  }
  for (const { id, reason } of remaining) console.log(`  ${id} — ${reason}`);
  if (process.argv.includes("--candidates")) {
    const { eclCandidates, nativeCandidates } = heldPortraitDiscovery;
    for (const row of eclCandidates) {
      const block = row.block ?? `selector ${row.selector.address?.toString(16) ?? "unknown"}`;
      const prompts = row.promptCandidates.map(({ next, caller }) => caller ? `${next}/${caller}` : next);
      console.log(`  ${row.scriptArchive}:${row.scriptBlock}:${row.address} ${row.pictureArchive}:${block}` +
        (prompts.length ? `  prompt leads ${prompts.join(", ")}` : "  prompt pending"));
    }
    for (const row of nativeCandidates.filter(({ status }) => status === "candidate")) {
      console.log(`  ${row.unit}:${row.address} ${row.pictureArchive}:${row.block}`);
    }
  }
  if (!enumerationComplete || remaining.length) process.exitCode = 1;
}
