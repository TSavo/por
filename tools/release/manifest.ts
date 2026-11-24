/**
 * The Mac disk images are built on a GitHub-hosted Mac, where there is no por-assets to compare bytes with.
 * The release workflow lists every file of each mounted image there and checks the list on Battleaxe, where
 * por-assets is (docs/RELEASE.md, "Releases from GitHub Actions"):
 *
 *   npx tsx tools/release/manifest.ts list <directory> > <manifest.json>
 *     every file under <directory>: its path, size, sha256 and git blob; a link is listed as a link.
 *   POR_ASSETS_DIR=<por-assets> npx tsx tools/release/manifest.ts check <manifest.json>...
 *     fails, like release:pack's check 1, if a link lacks a verified internal target, a path names por-assets, is an original game
 *     file, a program, a Classic sound that is not the committed audio/classic file at its own path, or has
 *     the bytes of any file in POR_ASSETS_DIR (which must exist), unless it is that committed file.
 */
import { missingClassicRecordings } from "../classic-sounds.js";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync } from "node:fs";
import { basename, join, relative } from "node:path";
import { packageLinkTarget } from "./package-link.js";
import { fromPortRoot } from "../port-root.js";

interface Entry { path: string; link?: true; target?: string; size?: number; sha256?: string; blob?: string }

function walk(directory: string, base = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path, base) : [relative(base, path)];
  });
}
const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");
const gitBlob = (data: Uint8Array) => createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");

const [mode, ...args] = process.argv.slice(2);
if (mode === "list") {
  const root = args[0];
  if (!root) throw new Error("list needs the directory to list");
  const entries: Entry[] = walk(root).map((path) => {
    const full = join(root, path);
    if (lstatSync(full).isSymbolicLink()) return { path, link: true, target: packageLinkTarget(root, full) };
    const data = readFileSync(full);
    return { path, size: data.length, sha256: sha256(data), blob: gitBlob(data) };
  });
  process.stdout.write(JSON.stringify(entries) + "\n");
} else if (mode === "check") {
  if (!args.length) throw new Error("check needs one or more manifests");
  const porAssets = process.env.POR_ASSETS_DIR;
  if (!porAssets || !existsSync(porAssets)) throw new Error(`POR_ASSETS_DIR ${porAssets ?? "(unset)"} does not exist`);
  const assets = new Map<string, string>();
  let assetFiles = 0;
  for (const path of walk(porAssets)) {
    const full = join(porAssets, path);
    if (!lstatSync(full).isFile()) continue;
    assets.set(sha256(readFileSync(full)), full);
    assetFiles++;
  }
  const committedClassic = new Map(execFileSync("git", ["-C", fromPortRoot(), "ls-tree", "-r", "HEAD", "--", "audio/classic"])
    .toString("utf8").trim().split("\n").filter(Boolean).map((line) => {
      const [meta, path] = line.split("\t") as [string, string];
      return [path, meta.split(" ")[2]!];
    }));
  const originalName = /^(?:start\.exe|game\.ovr|pool\.cfg)$|\.(?:dax|ovr|ex_|pic|cmp)$/i;
  const classicSound = /^(?:pc-speaker|tandy)-\d\d\.mp3$/i;
  let failed = false;
  for (const manifest of args) {
    const entries = JSON.parse(readFileSync(manifest, "utf8")) as Entry[];
    const problems: string[] = [];
    const destinations = new Set<string>();
    for (const entry of entries) {
      if (entry.link) continue;
      const parts = entry.path.split("/");
      while (parts.length) {
        destinations.add(parts.join("/"));
        parts.pop();
      }
    }
    const classic = new Set<string>();
    for (const entry of entries) {
      const name = basename(entry.path);
      const payloadPath = entry.path.startsWith("Resources/") ? entry.path.slice("Resources/".length) : entry.path;
      const committedClassicSound = !entry.link && committedClassic.get(payloadPath) === entry.blob;
      if (committedClassicSound) classic.add(payloadPath);
      if (entry.link && (!entry.target || entry.target.split("/").some(part => !part || part === ".." || part === ".") ||
          !destinations.has(entry.target))) problems.push(`${entry.path} has no verified target inside the package`);
      if (/por-assets/i.test(entry.path)) problems.push(`${entry.path} names por-assets`);
      if (originalName.test(name)) problems.push(`${entry.path} is an original game file`);
      if (/\.exe$/i.test(name)) problems.push(`${entry.path} is a program`);
      if (classicSound.test(name) && !committedClassicSound) problems.push(`${entry.path} is a Classic sound that is not the committed audio/classic file`);
      const asset = entry.sha256 && assets.get(entry.sha256);
      if (asset && !committedClassicSound) problems.push(`${entry.path} is ${asset}`);
    }
    problems.push(...missingClassicRecordings(classic));
    if (problems.length) {
      failed = true;
      console.error(`${manifest}: ${problems.length} problems:\n  ${problems.join("\n  ")}`);
    } else {
      console.log(`${manifest}: ${entries.length} files, none an original game file, external link, program or por-assets path; ` +
        `${classic.size} are the committed audio/classic; none has the bytes of any of the ${assetFiles} files in ${porAssets}`);
    }
  }
  if (failed) process.exit(1);
} else {
  throw new Error("usage: manifest.ts list <directory> | manifest.ts check <manifest.json>...");
}
