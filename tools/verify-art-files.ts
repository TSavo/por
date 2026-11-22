import { execFileSync } from "node:child_process";
import { posix } from "node:path";

const revision = process.argv[2] ?? "HEAD";
const commit = execFileSync("git", ["rev-parse", "--verify", "--end-of-options", revision + "^{commit}"], {
  encoding: "utf8",
}).trim();
const tracked = new Set(execFileSync("git", ["ls-tree", "-r", "--name-only", "-z", commit, "--", "upgrades/"], {
  encoding: "utf8",
  maxBuffer: 8 * 1024 * 1024,
}).split("\0"));

let count = 0;
const missing = new Map<string, string[]>();
for (const path of ["upgrades/manifest.json", "upgrades/slums/manifest.json"]) {
  const { assets } = JSON.parse(execFileSync("git", ["show", `${commit}:${path}`], {
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024,
  })) as { assets: Record<string, string> };
  for (const [key, filename] of Object.entries(assets)) {
    count++;
    const assetPath = posix.join(posix.dirname(path), filename.replaceAll("\\", "/"));
    if (tracked.has(assetPath)) continue;
    const references = missing.get(assetPath) ?? [];
    references.push(`${path} ${key}`);
    missing.set(assetPath, references);
  }
}

if (missing.size) {
  for (const [path, references] of missing) {
    console.error(`${path} is absent from ${commit.slice(0, 8)}\n  ${references.join("\n  ")}`);
  }
  process.exitCode = 1;
} else {
  console.log(`All ${count} Enhanced asset references are present in ${commit.slice(0, 8)}.`);
}
