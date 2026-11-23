// npm runs this from the package root. Let npm update the manifest and lockfile together.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync("package.json", "utf8"));
const match = /^(\d+\.\d+\.\d+)(?:-beta\.(\d+))?$/.exec(version);
if (!match) throw new Error(`Expected a stable or numbered beta version, found ${version}`);
const next = `${match[1]}-beta.${BigInt(match[2] ?? 0) + 1n}`;
execFileSync(process.execPath, [process.env.npm_execpath, "version", next, "--no-git-tag-version"], { stdio: "inherit" });
