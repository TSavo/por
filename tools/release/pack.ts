/**
 * npm run release:pack [-- mac windows linux]: build the installers into dist/ from the committed port.
 * Run after npm run release:build (the npm script does both). The Mac app needs macOS for its tools:
 * osacompile, hdiutil, sips, iconutil and codesign come with it. makensis builds the Windows installer: here
 * when it is installed, else on the machine POR_NSIS_HOST names over ssh (apt-get install nsis there);
 * with neither, the installer is skipped with a message.
 *
 *   dist/Pool-of-Radiance-<version>-mac-arm64.dmg       Pool of Radiance.app for Apple silicon, to drag to Applications
 *   dist/Pool-of-Radiance-<version>-mac-x64.dmg         the same for Intel Macs
 *   dist/Pool-of-Radiance-<version>-windows-setup.exe   NSIS installer to Program Files
 *   dist/pool-of-radiance-<version>-linux-x64.tar.gz    a folder with a start script
 *
 * Every package holds the same files (docs/RELEASE.md lists them), the compiled app from dist/app and
 * the official Node runtime for its platform, checked against nodejs.org's SHASUMS256.txt.
 *
 * Packing is where nothing of por-assets may go in. The build fails if:
 *   1. a file in a package is an original game file (START.EXE, GAME.OVR, *.DAX, POOL.CFG and the other
 *      kinds .gitignore keeps out), a link, or a path naming por-assets; or a Classic sound
 *      (pc-speaker-NN.wav, tandy-NN.wav) or, where a por-assets directory sits beside the checkout, a file
 *      with the bytes of any file in it, unless it is the committed file at its own path in audio/classic
 *      (the port's own renders of the Classic sounds, which ship);
 *   2. game/ in a package is not byte for byte the committed game/ (the same files, the same git blobs);
 *   3. the compiled server, runner or launcher contains the string por-assets.
 *
 * `npx tsx tools/release/pack.ts --check <directory>` runs checks 1 and 2 alone on an unpacked package
 * or an install, such as the Contents of an installed Mac app.
 */
import { execFileSync, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync, constants, copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync,
  statSync, symlinkSync, writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative } from "node:path";
import { fromPortRoot } from "../port-root.js";

const nodeVersion = "v26.13.1";
const version = (JSON.parse(readFileSync(fromPortRoot("package.json"), "utf8")) as { version: string }).version;
const dist = fromPortRoot("dist");
const app = join(dist, "app");
const stages = join(dist, "stage");
const cache = join(dist, "cache");
const requested = process.argv.slice(2);
const platforms = requested[0] === "--check" ? [] : requested.length ? requested : ["mac", "windows", "linux"];
for (const platform of platforms) {
  if (!["mac", "windows", "linux"].includes(platform)) throw new Error(`Unknown platform ${platform}: use mac, windows or linux`);
}
const onMac = process.platform === "darwin";
// The Mac app needs macOS's own tools (hdiutil, osacompile, sips, iconutil, codesign). The Windows installer
// and the Linux archive can be packed elsewhere: their icon is cut with python3 and Pillow, and makensis
// builds the installer where it is installed (apt-get install nsis).
if (!onMac && platforms.includes("mac")) throw new Error("release:pack for mac uses macOS's own tools; on this machine pack windows or linux");

const started = Date.now();
const log = (message: string) => console.log(`[${((Date.now() - started) / 1000).toFixed(0).padStart(4)}s] ${message}`);
const run = (command: string, args: string[], options: { cwd?: string } = {}) =>
  execFileSync(command, args, { stdio: ["ignore", "pipe", "inherit"], maxBuffer: 1 << 28, ...options }).toString("utf8");
const git = (...args: string[]) => run("git", ["-C", fromPortRoot(), ...args]);

/** The port's own files the server and runner read, as committed. */
const payloadPaths = [
  "game", "upgrades", "audio", "qa/art-worklist-cells.json",
  "src/audio/voices.json", "src/audio/voice-master-manifest.json", "src/audio/original-sounds.json",
  "src/maps/geography-model.json", "src/maps/atlas.json", "src/codewheel/wheel.json",
  "tools/play.html", "tools/play.js", "tools/loading.html", "tools/new-phlan-webgl.js",
  "tools/held-portrait-loops.mjs",
  "tools/code-wheel.html", "tools/code-wheel.js", "tools/code-wheel-draw.js", "tools/rune-glyphs.js",
];
const compiled = ["launch.mjs", "server.mjs", "runner.mjs"];

function files(directory: string, base = directory): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path, base);
    return [relative(base, path)];
  });
}

/** A copy that shares the blocks of the original on APFS, so a stage costs no disk. */
function cloneInto(from: string, to: string): void {
  mkdirSync(to, { recursive: true });
  for (const entry of readdirSync(from, { withFileTypes: true })) {
    const source = join(from, entry.name), target = join(to, entry.name);
    if (entry.isDirectory()) cloneInto(source, target);
    else if (entry.isFile()) copyFileSync(source, target, constants.COPYFILE_FICLONE);
    else throw new Error(`${source} is not a plain file`);
  }
}

const sha256 = (data: Uint8Array) => createHash("sha256").update(data).digest("hex");

/** The git blob of each file the commit holds under `directory`, by path. */
function committedBlobs(directory: string): Map<string, string> {
  return new Map(git("ls-tree", "-r", "HEAD", "--", directory).trim().split("\n").filter(Boolean).map((line) => {
    const [meta, path] = line.split("\t") as [string, string];
    return [path, meta.split(" ")[2]!];
  }));
}
function gitBlob(file: string): string {
  const data = readFileSync(file);
  return createHash("sha1").update(`blob ${data.length}\0`).update(data).digest("hex");
}

// ---- Check 2: game/ is the committed game/. ----
const committedGame = committedBlobs("game");
function checkGame(root: string, label: string): void {
  const packaged = files(join(root, "game")).map((path) => join("game", path));
  const extra = packaged.filter((path) => !committedGame.has(path));
  const missing = [...committedGame.keys()].filter((path) => !packaged.includes(path));
  const changed = packaged.filter((path) => committedGame.has(path) && committedGame.get(path) !== gitBlob(join(root, path)));
  if (extra.length || missing.length || changed.length) {
    throw new Error(`Check 2 failed in ${label}: game/ differs from the commit (extra ${extra.join(", ") || "none"}; ` +
      `missing ${missing.join(", ") || "none"}; changed ${changed.join(", ") || "none"})`);
  }
  log(`check 2 passed in ${label}: game/ is the committed ${committedGame.size} files, blob for blob`);
}

// ---- Check 1: nothing from por-assets, nothing of the original game. ----
const originalName = /^(?:start\.exe|game\.ovr|pool\.cfg)$|\.(?:dax|ovr|ex_|pic|cmp)$/i;
const classicSound = /^(?:pc-speaker|tandy)-\d\d\.wav$/i;
// Beside the checkout, as the owner keeps it. Read only to prove that no packaged file is one of its files.
const commonDir = run("git", ["-C", fromPortRoot(), "rev-parse", "--path-format=absolute", "--git-common-dir"]).trim();
const porAssets = join(dirname(commonDir), "..", "por-assets");
const assetsBySize = new Map<number, string[]>();
if (existsSync(porAssets)) {
  for (const path of files(porAssets)) {
    const full = join(porAssets, path);
    if (!lstatSync(full).isFile()) continue;
    const size = statSync(full).size;
    assetsBySize.set(size, [...(assetsBySize.get(size) ?? []), full]);
  }
}
const assetHashes = new Map<string, string>();
// The Classic sounds are the port's own renders and ship in audio/classic. A packaged file passes as one
// only when it is the committed file at its own path, blob for blob; the same sound anywhere else, or
// changed, is refused.
const committedClassic = committedBlobs("audio/classic");
function checkNothingOriginal(root: string, label: string, executables: string[]): void {
  const problems: string[] = [];
  let compared = 0, classic = 0;
  for (const path of files(root)) {
    const full = join(root, path);
    const name = basename(path);
    // Inside the Mac app the port's files are under Resources.
    const payloadPath = path.startsWith("Resources/") ? path.slice("Resources/".length) : path;
    const committedClassicSound = committedClassic.has(payloadPath) && committedClassic.get(payloadPath) === gitBlob(full);
    if (committedClassicSound) classic++;
    if (lstatSync(full).isSymbolicLink()) problems.push(`${path} is a link`);
    if (/por-assets/i.test(path)) problems.push(`${path} names por-assets`);
    if (originalName.test(name)) problems.push(`${path} is an original game file`);
    if (/\.exe$/i.test(name) && !executables.includes(path)) problems.push(`${path} is a program`);
    if (classicSound.test(name) && !committedClassicSound) problems.push(`${path} is a Classic sound that is not the committed audio/classic file`);
    const candidates = assetsBySize.get(statSync(full).size);
    if (candidates && !committedClassicSound) {
      const hash = sha256(readFileSync(full));
      for (const candidate of candidates) {
        compared++;
        if (!assetHashes.has(candidate)) assetHashes.set(candidate, sha256(readFileSync(candidate)));
        if (assetHashes.get(candidate) === hash) problems.push(`${path} is ${candidate}`);
      }
    }
  }
  if (problems.length) throw new Error(`Check 1 failed in ${label}:\n  ${problems.join("\n  ")}`);
  const against = existsSync(porAssets)
    ? `; no other file has the bytes of any of por-assets' files (${compared} same-size comparisons)`
    : "; no por-assets beside the checkout to compare bytes with";
  log(`check 1 passed in ${label}: no original game file, link or por-assets path; ${classic} files are the committed ` +
    `audio/classic, and no other is a Classic sound${against}`);
}

// --check <directory>: checks 1 and 2 on an unpacked package or an install.
if (requested[0] === "--check") {
  const directory = requested[1];
  if (!directory) throw new Error("--check needs the directory to check");
  checkNothingOriginal(directory, directory, ["node/node.exe", "Uninstall.exe"]);
  checkGame(existsSync(join(directory, "game")) ? directory : join(directory, "Resources"), directory);
  process.exit(0);
}

// ---- The payload: the committed files, the compiled app, the icons. ----
for (const name of compiled) if (!existsSync(join(app, name))) throw new Error(`${join(app, name)} is missing: run npm run release:build`);
// Check 3: nothing compiled names por-assets.
for (const name of compiled) {
  if (readFileSync(join(app, name), "utf8").includes("por-assets")) throw new Error(`Check 3 failed: dist/app/${name} names por-assets`);
}
log(`check 3 passed: ${compiled.join(", ")} do not name por-assets`);

rmSync(stages, { recursive: true, force: true });
const payload = join(stages, "payload");
mkdirSync(payload, { recursive: true });
const commit = git("rev-parse", "--short", "HEAD").trim();
log(`extracting the committed port at ${commit}`);
execSync(`git -C '${fromPortRoot()}' archive --format=tar HEAD -- ${payloadPaths.map((path) => `'${path}'`).join(" ")} | tar -xf - -C '${payload}'`,
  { stdio: ["ignore", "inherit", "inherit"] });
cloneInto(app, join(payload, "app"));
for (const path of payloadPaths) if (!existsSync(join(payload, path))) throw new Error(`${path} is not in the commit`);

// Icons from the title picture: the middle of the harbour, square.
const icons = join(stages, "icons");
mkdirSync(icons, { recursive: true });
const square = join(icons, "square.png");
if (onMac) run("sips", ["-c", "800", "800", fromPortRoot("upgrades", "harbor-title.png"), "--out", square]);
const iconset = join(icons, "AppIcon.iconset");
mkdirSync(iconset);
if (onMac) {
  for (const size of [16, 32, 128, 256, 512]) {
    run("sips", ["-z", String(size), String(size), square, "--out", join(iconset, `icon_${size}x${size}.png`)]);
    run("sips", ["-z", String(size * 2), String(size * 2), square, "--out", join(iconset, `icon_${size}x${size}@2x.png`)]);
  }
} else {
  run("python3", ["-c", "import sys\nfrom PIL import Image\nim=Image.open(sys.argv[1]).convert('RGBA')\nw,h=im.size\n" +
    "l,t=(w-800)//2,(h-800)//2\nim.crop((l,t,l+800,t+800)).resize((256,256),Image.LANCZOS).save(sys.argv[2])",
    fromPortRoot("upgrades", "harbor-title.png"), join(iconset, "icon_256x256.png")]);
}
const icns = join(icons, "AppIcon.icns");
if (onMac) run("iconutil", ["-c", "icns", iconset, "-o", icns]);
// A Windows icon holding one 256-pixel PNG.
const png256 = readFileSync(join(iconset, "icon_256x256.png"));
const ico = Buffer.alloc(22);
ico.writeUInt16LE(1, 2);
ico.writeUInt16LE(1, 4);
ico.writeUInt16LE(1, 10);
ico.writeUInt16LE(32, 12);
ico.writeUInt32LE(png256.length, 14);
ico.writeUInt32LE(22, 18);
writeFileSync(join(icons, "pool-of-radiance.ico"), Buffer.concat([ico, png256]));
copyFileSync(join(iconset, "icon_256x256.png"), join(icons, "pool-of-radiance.png"));

// ---- Node, from nodejs.org, checked against its published sums. ----
mkdirSync(cache, { recursive: true });
async function download(file: string): Promise<string> {
  const target = join(cache, file);
  if (existsSync(target)) return target;
  const url = `https://nodejs.org/dist/${nodeVersion}/${file}`;
  log(`downloading ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  writeFileSync(`${target}.part`, Buffer.from(await response.arrayBuffer()));
  renameSync(`${target}.part`, target);
  return target;
}
const sums = new Map(readFileSync(await download("SHASUMS256.txt"), "utf8").trim().split("\n")
  .map((line) => line.split(/\s+/)).map(([sum, file]) => [file!, sum!]));
/** bin/node or node.exe, and LICENSE, of one Node build, in their own directory. */
async function nodeBuild(build: string, kind: "tar.gz" | "tar.xz" | "zip"): Promise<string> {
  const file = `node-${nodeVersion}-${build}.${kind}`;
  const archive = await download(file);
  if (sha256(readFileSync(archive)) !== sums.get(file)) throw new Error(`${file} does not match nodejs.org's SHASUMS256.txt`);
  const out = join(cache, `node-${nodeVersion}-${build}`);
  if (existsSync(join(out, "LICENSE"))) return out;
  mkdirSync(out, { recursive: true });
  const prefix = `node-${nodeVersion}-${build}`;
  if (kind === "zip") run("unzip", ["-q", "-o", "-j", archive, `${prefix}/node.exe`, `${prefix}/LICENSE`, "-d", out]);
  else run("tar", [kind === "tar.gz" ? "-xzf" : "-xJf", archive, "-C", out, "--strip-components", "1", `${prefix}/bin/node`, `${prefix}/LICENSE`]);
  return out;
}

const outputs: string[] = [];
const size = (path: string) => `${(statSync(path).size / 1e6).toFixed(0)} MB`;

// One disk image per architecture: each holds a single Node, not the two joined with lipo (150 MB less each).
for (const arch of platforms.includes("mac") ? ["arm64", "x64"] : []) {
  const nodeDir = await nodeBuild(`darwin-${arch}`, "tar.gz");
  const dmgFolder = join(stages, `mac-${arch}`);
  const bundle = join(dmgFolder, "Pool of Radiance.app");
  mkdirSync(dmgFolder, { recursive: true });
  log(`compiling the Mac app (${arch})`);
  run("osacompile", ["-s", "-o", bundle, fromPortRoot("tools", "release", "mac-app.applescript")]);
  const contents = join(bundle, "Contents");
  cloneInto(payload, join(contents, "Resources"));
  copyFileSync(join(nodeDir, "bin", "node"), join(contents, "MacOS", "node"));
  chmodSync(join(contents, "MacOS", "node"), 0o755);
  mkdirSync(join(contents, "Resources", "licenses"), { recursive: true });
  copyFileSync(join(nodeDir, "LICENSE"), join(contents, "Resources", "licenses", "node-LICENSE"));
  copyFileSync(icns, join(contents, "Resources", "applet.icns"));
  rmSync(join(contents, "Resources", "Assets.car"), { force: true });
  const plist = join(contents, "Info.plist");
  try { run("plutil", ["-remove", "CFBundleIconName", plist]); } catch { /* osacompile did not set one */ }
  for (const [key, value] of [
    ["CFBundleIdentifier", "io.github.tsavo.pool-of-radiance"], ["CFBundleName", "Pool of Radiance"],
    ["CFBundleDisplayName", "Pool of Radiance"], ["CFBundleShortVersionString", version], ["CFBundleVersion", version],
    ["LSMinimumSystemVersion", "13.5"], ["CFBundleIconFile", "applet"],
  ]) run("plutil", ["-replace", key!, "-string", value!, plist]);
  checkNothingOriginal(contents, `the Mac app (${arch})`, []);
  checkGame(join(contents, "Resources"), `the Mac app (${arch})`);
  // The app is changed after osacompile signed it. An ad-hoc signature seals it again; a Developer ID replaces it.
  log("sealing the app with an ad-hoc signature");
  run("codesign", ["--force", "--sign", "-", bundle]);
  run("codesign", ["--verify", "--strict", bundle]);
  symlinkSync("/Applications", join(dmgFolder, "Applications"));
  const dmg = join(dist, `Pool-of-Radiance-${version}-mac-${arch}.dmg`);
  rmSync(dmg, { force: true });
  log("building the disk image");
  run("hdiutil", ["create", "-quiet", "-volname", "Pool of Radiance", "-srcfolder", dmgFolder, "-fs", "HFS+", "-format", "ULFO", "-ov", dmg]);
  log(`${dmg} (${size(dmg)})`);
  outputs.push(dmg);
}

if (platforms.includes("windows")) {
  const node = await nodeBuild("win-x64", "zip");
  const stage = join(stages, "windows");
  cloneInto(payload, stage);
  mkdirSync(join(stage, "node"), { recursive: true });
  copyFileSync(join(node, "node.exe"), join(stage, "node", "node.exe"));
  copyFileSync(join(node, "LICENSE"), join(stage, "node", "LICENSE"));
  copyFileSync(join(icons, "pool-of-radiance.ico"), join(stage, "pool-of-radiance.ico"));
  checkNothingOriginal(stage, "the Windows install", ["node/node.exe"]);
  checkGame(stage, "the Windows install");
  let makensis: string | undefined;
  try { makensis = run("sh", ["-c", "command -v makensis"]).trim(); } catch { makensis = undefined; }
  const nsisHost = process.env.POR_NSIS_HOST;
  const script = fromPortRoot("tools", "release", "windows-installer.nsi");
  const setup = join(dist, `Pool-of-Radiance-${version}-windows-setup.exe`);
  if (makensis) {
    log("building the Windows installer");
    run(makensis, ["-V2", `-DSTAGE=${stage}`, `-DOUTFILE=${setup}`, `-DVERSION=${version}`, script]);
  } else if (nsisHost) {
    // makensis on another machine (apt-get install nsis): the stage goes to its /dev/shm, the installer comes back.
    if (!/^[\w.@-]+$/.test(nsisHost)) throw new Error(`POR_NSIS_HOST ${nsisHost} is not a host name`);
    const remote = `/dev/shm/por-nsis-${process.pid}`;
    log(`building the Windows installer on ${nsisHost}`);
    execSync(`tar --no-xattrs --no-mac-metadata -cf - -C '${stage}' . | ssh -o BatchMode=yes ${nsisHost} ` +
      `'rm -rf ${remote} && mkdir -p ${remote}/stage && tar -xf - -C ${remote}/stage'`, { stdio: ["ignore", "inherit", "inherit"] });
    run("scp", ["-q", "-o", "BatchMode=yes", script, `${nsisHost}:${remote}/windows-installer.nsi`]);
    try {
      run("ssh", ["-n", "-o", "BatchMode=yes", nsisHost,
        `makensis -V2 -DSTAGE=${remote}/stage -DOUTFILE=${remote}/setup.exe -DVERSION=${version} ${remote}/windows-installer.nsi`]);
      run("scp", ["-q", "-o", "BatchMode=yes", `${nsisHost}:${remote}/setup.exe`, setup]);
    } finally {
      run("ssh", ["-n", "-o", "BatchMode=yes", nsisHost, `rm -rf ${remote}`]);
    }
  }
  if (makensis || nsisHost) {
    log(`${setup} (${size(setup)})`);
    outputs.push(setup);
  } else log("makensis is not installed and POR_NSIS_HOST is not set: the Windows installer was not built");
}

if (platforms.includes("linux")) {
  const node = await nodeBuild("linux-x64", "tar.xz");
  const name = `pool-of-radiance-${version}`;
  const stage = join(stages, "linux", name);
  cloneInto(payload, stage);
  mkdirSync(join(stage, "node", "bin"), { recursive: true });
  copyFileSync(join(node, "bin", "node"), join(stage, "node", "bin", "node"));
  chmodSync(join(stage, "node", "bin", "node"), 0o755);
  copyFileSync(join(node, "LICENSE"), join(stage, "node", "LICENSE"));
  copyFileSync(join(icons, "pool-of-radiance.png"), join(stage, "pool-of-radiance.png"));
  writeFileSync(join(stage, "pool-of-radiance"), [
    "#!/bin/sh",
    "# Starts Pool of Radiance and opens it in the browser. Ctrl-C or closing the terminal stops it.",
    'here=$(dirname "$(readlink -f "$0")")',
    'exec "$here/node/bin/node" "$here/app/launch.mjs" "$@"',
    "",
  ].join("\n"), { mode: 0o755 });
  writeFileSync(join(stage, "README.txt"), [
    "Pool of Radiance",
    "",
    "Run ./pool-of-radiance from this folder (or double-click it, if your file manager runs scripts).",
    "It starts the game and opens it in your browser; Chrome is recommended. If no browser opens, open",
    "the address it prints. Press Ctrl-C or close the terminal to stop the game.",
    "Saves are kept in ~/.local/share/pool-of-radiance/saves.",
    "",
  ].join("\n"));
  checkNothingOriginal(stage, "the Linux folder", []);
  checkGame(stage, "the Linux folder");
  const archive = join(dist, `${name}-linux-x64.tar.gz`);
  log("building the Linux archive");
  // No macOS extended attributes or AppleDouble files, which tar on Linux warns about.
  run("tar", [...(onMac ? ["--no-xattrs", "--no-mac-metadata"] : []), "-czf", archive, "-C", dirname(stage), name]);
  log(`${archive} (${size(archive)})`);
  outputs.push(archive);
}

log(`packed ${commit}:\n  ${outputs.join("\n  ")}`);
