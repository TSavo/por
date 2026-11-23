/**
 * The label on the title screen: package version plus the short commit, for example
 * `v0.1.0 (0c83fe2)`. A release build injects the string (esbuild define of
 * POR_BUILD_VERSION in tools/release/build.ts) because a packaged game has no .git.
 * The dev and browser-play path reads package.json and git at runtime, and marks
 * the result `-dev`, plus `-dirty` when the tree has uncommitted changes.
 */
import { execFileSync } from "node:child_process";
import { readJsonNow } from "../src/resources/provider.js";
import { NodeDiskResources } from "./resources/node-disk.js";
import { fromPortRoot } from "./port-root.js";

export type BuildVersionParts = {
  version: string;
  sha: string;
  dirty?: boolean;
  release?: boolean;
};

export function formatBuildVersion({ version, sha, dirty = false, release = false }: BuildVersionParts): string {
  const prerelease = /^v?(\d+\.\d+)\.(\d+)-(alpha|beta)\.(\d+)$/.exec(version);
  const tag = prerelease ? `v${prerelease[1]}${prerelease[2] === "0" ? "" : "." + prerelease[2]} ${prerelease[3] === "alpha" ? "Alpha" : "Beta"} ${prerelease[4]}`
    : version.startsWith("v") ? version : `v${version}`;
  const kind = release ? "" : "-dev";
  const commit = dirty ? `${sha}-dirty` : sha;
  return `${tag}${kind} (${commit})`;
}

function git(repo: string, ...args: string[]): string | undefined {
  try {
    return execFileSync("git", ["-C", repo, ...args], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim() || undefined;
  } catch {
    return undefined;
  }
}

/** package.json plus git, as a checkout reports it. Used by the release build and by the dev fallback. */
export function checkoutBuildVersion(options: { release?: boolean } = {}): string {
  const root = fromPortRoot();
  const build = readJsonNow<{ version: string }>(new NodeDiskResources(), "config:build");
  if (!build) throw new Error("Missing package.json for checkout build version");
  const { version } = build;
  const sha = git(root, "rev-parse", "--short=7", "HEAD") ?? "unknown";
  const dirty = Boolean(git(root, "status", "--porcelain"));
  return formatBuildVersion({ version, sha, dirty, release: options.release });
}

/**
 * What the title screen should show. A release server has POR_BUILD_VERSION compiled
 * in; otherwise this reads the checkout.
 */
export function readBuildVersion(): string {
  const injected = process.env.POR_BUILD_VERSION;
  if (injected) return injected;
  return checkoutBuildVersion();
}
