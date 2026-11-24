# Releases

A release is the game as a player installs it: version 1.3, in Enhanced, from the port's own data in
`game/`, with the new artwork in `upgrades/` and the narration in `audio/`. It needs no files from the
player, no checkout, no npm and no tsx. It is an Electron app: the main process serves the packaged
loose files (#229) to the window, and the game runs in that window as the browser build does
(`npm run play`, the engine in a Web Worker).

## Build

On a Mac, from a checkout with `npm ci` done:

```bash
POR_NSIS_HOST=battleaxe npm run release:pack    # all three; or: npm run release:pack -- mac
npm run release:pack -- mac-x64                  # one disk image (mac-arm64, mac-x64)
```

On Linux with makensis and python3 with Pillow (Battleaxe): `npm run release:pack -- windows linux`.

The Windows installer needs makensis. Where it is installed (`brew install makensis`, which on an
Intel Mac builds a dozen formulae from source for over half an hour) it runs here; otherwise
`POR_NSIS_HOST` names a machine reached by `ssh` that has it (`sudo apt-get install -y nsis` on Ubuntu,
makensis 3.09): the staged install goes to that machine's `/dev/shm`, makensis runs there, and the
installer comes back into `dist/`. With neither, the Windows installer is skipped with a message.

`npm run release:build` alone compiles the Electron main process (`tools/electron/main.ts`) to
`dist/electron/` and the packaged page's loose web files to `dist/web/`. The title screen's lower-right
label (`v0.1.0 (0c83fe2)`, for example) is written into the resource index, because a packaged game has
no `.git`. A checkout of `npm run play` reads the same value from package.json and git and marks it `-dev`
(and `-dirty` when the tree is unclean).
`release:pack` runs it, then builds, into `dist/`:

| File | What it is |
| --- | --- |
| `Pool-of-Radiance-<version>-mac-arm64.dmg`, `-mac-x64.dmg` | `Pool of Radiance.app` beside an Applications link, to drag across: one image for Apple silicon, one for Intel |
| `Pool-of-Radiance-<version>-windows-setup.exe` | An NSIS installer to Program Files (skipped when makensis is not installed) |
| `pool-of-radiance-<version>-linux-x64.tar.gz` | A folder with the Electron app (run `./pool-of-radiance`) |

The packages are built from the commit checked out (`git archive HEAD`), not from the working tree,
plus the compiled Electron main process and the packaged web files. Electron is the official build of
the version pinned in `package.json`, downloaded from its GitHub releases into `dist/cache/` and checked
against its `SHASUMS256.txt`; each Mac image carries the Electron of its own architecture (arm64 or x64).
The Mac images need macOS's own tools (hdiutil, sips, iconutil, codesign); the Windows installer and the
Linux archive pack on Linux too (python3 with Pillow cuts their icon). `dist/` is not committed.

The current internal test build is **0.1 Alpha 1** (`0.1.0-alpha.1`). Build it from the checkout for internal testing.

## Numbered betas

Run `npm run release:next-beta` to prepare the next beta on the current major, minor and patch.
For example, `0.1.0` becomes `0.1.0-beta.1`, then `0.1.0-beta.2`. This updates the package
manifest and lockfile together. Commit the change. When ready to publish, tag that commit with
the full version (for example, `v0.1.0-beta.2`) and push the tag. GitHub publishes it as a prerelease.
The title screen shows `v0.1 Beta 2` followed by the build commit.

## Releases from GitHub Actions

`.github/workflows/release.yml` builds all four packages and publishes them as a GitHub release.

- **Cut a release:** set `version` in `package.json` (say `0.2.0`), commit and push it to main, then
  `git tag v0.2.0 && git push origin v0.2.0`. The tag must be `v` plus the `package.json` version, or the
  run fails at once and says so. A version with a hyphen (`0.2.0-rc.1`) is published as a prerelease. The
  release is created for the tag (or updated, its files replaced, when it exists), with the four packages
  and `SHA256SUMS`.
- **Dry run:** Actions, *release*, *Run workflow* on main with *dry_run* checked (the default), or
  `gh workflow run release.yml -R TSavo/por --ref main -f dry_run=true`. It builds everything and keeps the
  packages (`package-windows`, `package-linux`, `package-mac`) and `SHA256SUMS` as workflow artifacts for
  7 days; nothing is published. Unchecked, it publishes only when run on a tag.

The jobs: `app` checks the version and compiles `dist/electron` and `dist/web` once on Battleaxe (the self-hosted runner);
`windows-linux` packs the installer and the Linux archive there with `POR_ASSETS_DIR=$HOME/por-assets`, so
check 1 below compares every packaged file's bytes with por-assets; `mac` packs both disk images from
the same compiled app on a GitHub-hosted Mac, which has no por-assets, mounts each image and lists every
file of the app with its sha256 (`tools/release/manifest.ts list`); `mac-check` checks those lists
against por-assets on Battleaxe (`tools/release/manifest.ts check`, check 1's rules); `release` writes
`SHA256SUMS` and publishes. Nothing of por-assets leaves Battleaxe: only hashes are compared there.

## What the package contains

Every package holds the same game files. In the Mac app they are under `Contents/Resources`, with
Electron's own frameworks beside them and the app binary in `Contents/MacOS`. On Windows and Linux they
sit in `resources/`, beside Electron's runtime.

| Folder | Contents |
| --- | --- |
| `resources/app/` | `main.js` and `package.json`: the Electron main process, compiled. It registers the packaged files as the `por:` protocol and opens the window. |
| `resources/web/` | The game page and its bundles, the resource index, the sound manifest and the party recolour masks, as `npm run web:build-loose` writes them. |
| `resources/game/` | The port's own game data (16 files): the program image and overlays with every instruction blank, the scripts, maps, monsters, items, characters, saved-game templates, walls, tiles and picture shapes, converted from version 1.3 by `npm run build:game-data`. The game's text is in it. |
| `resources/upgrades/` | The Enhanced artwork: 13,494 PNGs, `manifest.json` and `slums/manifest.json` that bind them, the code wheel (`codewheel/`), the atlas plates (`maps/`), the Alegreya SC Bold font (`font.woff2`) and its licence (`AlegreyaSC-OFL.txt`), and `README.md`. |
| `resources/audio/` | `voices/`: the narration, 1,759 MP3s, with 1,752 transcript `.txt` files, 854 `.json` records, one WAV and a README. `enhanced/`: the Enhanced score and sounds, 38 WAVs, 2 MP3s and 19 `.json` records. `classic/`: the Classic sounds, the game's sound events for the PC speaker and for the Tandy chip (40 WAVs, 95 MB), the port's own renders of the original driver, with a README on how each was made. |
| `resources/src/` | The data the page reads: `audio/voices.json`, `audio/voice-master-manifest.json` (the narration's text), `audio/original-sounds.json`, `maps/atlas.json`, `maps/geography-model.json`, `codewheel/wheel.json`. |
| `resources/qa/` | `art-worklist-cells.json`, the exploration cells drawn from the port's own data. |
| Electron | The official Electron runtime of the version pinned in `package.json`, with its Chromium licences. On the Mac it is the app itself; on Windows, `Pool of Radiance.exe`; on Linux, `pool-of-radiance`. |
| Start | Mac: the app itself. Windows: Start Menu and desktop shortcuts to `Pool of Radiance.exe`, `pool-of-radiance.ico`, `Uninstall.exe`. Linux: `pool-of-radiance`, `pool-of-radiance.png`, `README.txt`. |

## What packing refuses

Packing is where nothing of `por-assets` may go in. `release:pack` fails if:

1. A file in a package is an original game file (`START.EXE`, `GAME.OVR`, `POOL.CFG`, `*.DAX`,
   `*.OVR`, `*.EX_`, `*.PIC`, `*.CMP`, or any `.exe` in the game's own folders), a link that points
   outside the package, or a path naming
   `por-assets`. Or it is a Classic sound (`pc-speaker-NN.wav`, `tandy-NN.wav`) or, where a
   `por-assets` directory sits beside the checkout (or `POR_ASSETS_DIR` names one), has the same bytes as any file in it, and is not
   the committed file at its own path in `audio/classic/`, blob for blob. The Classic sounds ship as the
   committed `audio/classic/`; the same WAV taken from `por-assets/original` and put anywhere else, or
   changed, is refused.
2. `game/` in a package is not the committed `game/`: the same 16 files, each the same git blob. What
   `game/` holds is checked by `npm run verify:game-data`: no instruction bytes and no original pixels.
3. The compiled Electron main process (`dist/electron/main.js`) contains the string `por-assets`
   (`npm run release:build` fails the same way).

`src/audio/original-sounds.json` mentions `por-assets` in a note on how the Classic sounds were rendered;
nothing reads it as a path.

`npx tsx tools/release/pack.ts --check <directory>` runs checks 1 and 2 alone on an unpacked package or
an install (for the Mac app, its `Contents`). Checked against copies of the Linux folder with one thing
planted in each, it refused all five: a WAV from `por-assets/original` under another name ("is
/Users/…/por-assets/original/pc-speaker-01.wav"), an `ECL1.DAX`, a `tandy-03.wav`, one byte added to
`game/tiles.json`, and an extra file in `game/`; the unchanged copy passed. With `audio/classic/`
committed, `git archive HEAD -- game audio` passed (41 files the committed `audio/classic`), and three
copies were refused: `por-assets/original/tandy-05.wav` put in `audio/enhanced/`, the same WAV renamed
there, and `audio/classic/pc-speaker-02.wav` with a byte added.

## How a player starts it

- **Mac:** open the disk image and drag **Pool of Radiance** to Applications. Opening the app opens the
  game in its own window. **Cmd-Q**, or **Quit** from the menu, closes it. Opening the app again while it
  is already running brings that window forward.
- **Windows:** run the installer; choose whether to add a desktop shortcut. **Pool of Radiance** in the
  Start Menu opens the game in its own window. Closing the window stops the game. Uninstall from Settings
  or the Start Menu.
- **Linux:** unpack the archive and run `./pool-of-radiance`. Closing the window stops the game.

The window is 1280×880, with a standard application menu (Quit, and Edit so paste works in the page).
The main process registers the packaged loose files as the `por:` protocol, with the COOP/COEP headers
the engine's worker needs, and loads the page at `por://localhost/`. A second launch focuses the running
window. Saves, the roster, the journal and the original-files folder handle live in the app's Chromium
profile (IndexedDB), not in a sidecar `saves/` folder.

A checkout starts the same window with `npm run play:electron`, against `out/loose/`.

## Classic from the player's own files

The shipped game always starts in Enhanced and has no Classic display: it holds no original picture.
The player's own Pool of Radiance from GOG unlocks it (#74).

**Choosing the folder in the game:** **Settings** (the button beside Journal and Map, which also holds
the sound) has **Use my original files**: the player picks the folder of their own Pool of Radiance
(#226). The page inspects it for START.EXE, GAME.OVR and ECL1.DAX, in it or in one folder directly
inside it (GOG keeps them in `POOLRAD` inside the game's folder), and GAME.OVR starting `FBOV`
(version 1.3) or `TPOV` (the first release). A folder that passes is kept as a handle in the app's
IndexedDB and the game starts again with it; one that does not is not kept, and the page says why.
**Stop using them** forgets the handle. Nothing of the folder is copied: the game reads its files
where they are, and they never enter the install.

- Version 1.3: Classic is available and the game can run from those files.
- The first release: Classic is available with that folder's pictures under the version 1.3 game
  from `game/` (docs/GAME-DATA.md).

`node tools/release/check-original-files.mjs <release root> <1.3 folder> <first-release folder> [chrome]`
checks all of this on a built release: four starts of its launcher (`POR_OPEN_BROWSER=0`, a throwaway
HOME, the fixed clock), choosing the folders through the page's requests in between; with a Chrome
executable, the first choice and **Stop using them** are made in the page itself, headless and muted.

Checked on 2026-11-22 on Battleaxe (Linux), with `npm run release:build` and `dist/app` laid out beside
the port's folders, the GOG 1.3 files (`por-assets/gog-1.3/POOLRAD`) and the first release
(`por-assets/pool`), HOME in `/dev/shm`, and the page in headless Chrome (`/usr/bin/google-chrome
--headless --mute-audio`): all 30 checks passed. Start 1 (nothing named): no Classic; the server
refused another origin (403), the port's own `game/` and a missing folder, writing nothing. In the page,
Settings started closed; *Use my original files* said *Not in use: the game runs from its own data, and
the Classic display is not available.*; `game/` typed into the field and Enter gave *Not saved: …/game
has no START.EXE, GAME.OVR, ECL1.DAX.*; `gog-1.3` typed and Enter gave *Saved: …/gog-1.3/POOLRAD
(version 1.3). It takes effect the next time the game starts: close the game and start it again.*, the
status added *From the next start: …/POOLRAD.*, and none of the keys typed reached the game (its frame
sequence unchanged). Start 2 printed `Original files:
…/POOLRAD (version 1.3; Classic available)` and `POR_GAME_DATA original …/POOLRAD`, with Classic. Start 3,
the first release: `POR_GAME_DATA port <root>/game`, `POR_CLASSIC_PICTURES …/pool 784/784`, Classic,
and its first Classic frame (the title) the same PNG as start 2's (sha256 `859db41f…`), where the
shipped game's is blank (`04e64636…`); the page said *In use: …/pool (the first release). The Classic
display is available (F10), with its pictures; the game is version 1.3.*, and **Stop using them** gave
*Saved: no original files…* and removed `original-files.json`. Start 4: no Classic and no
`Original files:` line. No game file was under the player's directory; every start stopped on SIGTERM.
The first run took 776 of the 784 pictures: for 8 blocks the port's packer could not reach the
original packed size, so the player's own packing is now kept where it has that size.

**Windows** (#150), 2026-11-22, on Battleaxe: the installer of `c9d42f49` packed there
(`npm run release:pack -- windows`, makensis 3.09; 694 MB, sha256 `57a9479e…bcdc9f3`), installed
silently and unelevated (`__COMPAT_LAYER=RunAsInvoker`, `/S /D=E:\por-release-test\install`): exit 0 in
97 seconds, 18,007 files. Copies of the GOG 1.3 folder and the first release were put at
`E:\por-release-test\gog-1.3\POOLRAD` and `E:\por-release-test\pool`. The check ran with the installed
`node\node.exe` starting `app\launch.mjs` as the shortcut does, homes under `E:\por-release-test\tmp`,
and Windows Chrome 157 headless: all 33 checks passed. In the page, `E:\por-release-test\install\game`
typed into the field gave *Not saved: E:\por-release-test\install\game has no START.EXE, GAME.OVR,
ECL1.DAX.*, and `E:\por-release-test\gog-1.3` gave *Saved: E:\por-release-test\gog-1.3\POOLRAD (version
1.3). It takes effect the next time the game starts…*; the setting's empty field showed
`C:\GOG Games\Pool of Radiance`. The next start printed `Original files: E:\por-release-test\gog-1.3\POOLRAD
(version 1.3; Classic available)` and `POR_GAME_DATA original …`; the page started in Enhanced with the
display switch, and Classic showed the original title, the same frame as on Linux (`859db41f…`). The
first release: `POR_CLASSIC_PICTURES E:\por-release-test\pool 784/784`, the same title. Every start
stopped when its launcher was ended, leaving no node.exe of the install and nothing listening. 43124 was
not free during these runs, so each start took another free port, as the launcher does (what held it was
not established; other games run on the machine's Linux side, whose ports WSL can relay to Windows). The first run stopped at start 3: on Windows Chrome's helpers hold its
profile for a moment after it exits, so removing the profile failed (EPERM) and left that start's game
running; the check now retries removal, stops any launcher it started, and reports an error as a failure.
`Uninstall.exe /S` exited 0 in 20.5 seconds and the install folder was gone a minute later. The
screenshot of Classic at the title also showed the Enhanced publisher splash faintly over it (#153).

**Mac** (#150), 2026-11-22, on the Intel Mac, once: `npm run release:pack -- mac-x64` (720 MB, sha256
`f5192a06…d3374cf`), the app copied out of the mounted image (944 MB, `codesign --verify --strict`
valid) and opened with `open -n -g --env HOME=<scratch> --env POR_OPEN_BROWSER=0 --env POR_CLOCK=fixed`.
Start 1: the game answered in 21 seconds, no Classic, the blank title (`04e64636…`); the setting's
request with `/Users/tsavo/por-assets/gog-1.3` saved `…/gog-1.3/POOLRAD` (version 1.3) in
`<scratch>/Library/Application Support/Pool of Radiance/original-files.json`. Quit (the quit Apple event)
stopped everything in 0.9 seconds. Start 2: the log had `Original files: /Users/tsavo/por-assets/gog-1.3/POOLRAD
(version 1.3; Classic available)` and `POR_GAME_DATA original …/POOLRAD`, the game answered in 9 seconds
with Classic available and the original title (`859db41f…`, as on Linux and Windows). The setting was
cleared and the app quit again; the data directory held only `out` and `saves`, and no game file. Opened
straight from the read-only disk image the first time, the game took 118 seconds to answer (the
compressed image); and `tell application id …` could not quit it, because the bundle id named the
packing stage's copy, which was not running: quitting by the app's path did.

## Where saves go

In the player's own directory, which the launcher creates; the runner's other writes (`out/`) go there
too, never into the install:

| | Directory | Saves |
| --- | --- | --- |
| Mac | `~/Library/Application Support/Pool of Radiance` | `saves/` |
| Windows | `%APPDATA%\Pool of Radiance` | `saves\` |
| Linux | `$XDG_DATA_HOME/pool-of-radiance`, else `~/.local/share/pool-of-radiance` | `saves/` |

Uninstalling leaves them.

### Saves from the first release

Not supported, by the owner's ruling of 2026-11-21 (#95): there are no legacy saves to support, and no check
loads one. What is known: SAVGAM is 13,137 bytes and character, item and effect records are 285, 63 and 9
bytes in both releases, and a slot saved by the first release at the Slums gate
(`qa/fixtures/first-release-slums-gate`) loaded on 1.3 on 2026-11-21 (party walked, labelled a tile, saved,
reloaded). A save also carries a copy of the current area's script, so an area saved on the first release
holds the first release's script; that case was not compared byte by byte.

## Signing

None of the packages is signed by a developer yet.

**Mac.** The app is sealed with an ad-hoc signature (`codesign --sign -`), so it is intact but from no
identified developer. Downloaded, it is quarantined, and opening it shows *"Pool of Radiance" Not
Opened: Apple could not verify "Pool of Radiance" is free of malware that may harm your Mac or
compromise your privacy*, with **Done** and **Move to Trash**. A tester gets past it once: open
**System Settings → Privacy & Security**, scroll to *"Pool of Radiance" was blocked to protect your Mac*,
choose **Open Anyway** and confirm with their password; after that it opens normally. (On macOS 14 and
earlier, Control-click the app, choose **Open**, then **Open** again.) Or, from Terminal:
`xattr -dr com.apple.quarantine "/Applications/Pool of Radiance.app"`. Copied without quarantine, as
in the check below, it opens with no prompt.

To ship it without that, the owner needs an **Apple Developer Program** membership (USD 99 a year) and:

- a **Developer ID Application** certificate, to sign `Contents/MacOS/node` (with the hardened runtime
  and the JIT entitlements V8 needs: `com.apple.security.cs.allow-jit`,
  `com.apple.security.cs.allow-unsigned-executable-memory`), then the app, in that order, with
  `codesign --options runtime --timestamp`;
- **notarization**: an app-specific password or App Store Connect API key for `xcrun notarytool submit
  --wait` on the signed disk image (or a zip of the app), then `xcrun stapler staple` on the app and the
  disk image, so Gatekeeper accepts it offline;
- a bundle identifier of the owner's own (the package uses the placeholder
  `io.github.tsavo.pool-of-radiance`), and the disk image itself signed with the same certificate.

**Windows.** Unsigned, the installer shows SmartScreen's *Windows protected your PC*; **More info →
Run anyway** passes it. Signing needs a code-signing certificate (an OV or EV certificate from a
certificate authority, or Azure Trusted Signing) and `signtool` (or `osslsigncode` on the Mac) run on
the installer and, through NSIS's `!uninstfinalize`, on `Uninstall.exe`; an OV certificate's
reputation with SmartScreen builds over time.

## Checking a package

`tools/release/capture-release.mjs <url> <directory>` plays the opening of a running release in
headless Chrome with its own profile: the publisher screen, the title with its faded-in name, the code
wheel question, the word read off the wheel, the ready-made party (start the release with
`POR_PREGEN_PARTY=1`), and the first-person view of New Phlan, reporting whether the page drew it with
WebGL or fell back. It saves a screenshot of each and `report.json`.

`node tools/release/check-display-switch.mjs <release root> <original folder> <chrome>` checks the
display switch with the player's own files (#153): it starts the release's launcher with
`POR_ORIGINAL_FILES` naming the folder and switches to Classic and back at each place of the opening:
the page's publisher splash at full strength and while it fades, the title with its name faded in, the
code-wheel question and the main menu. In Classic only `#screen` may be visible over the game, showing
the game's own frame, at the switch and two seconds on; back in Enhanced, `#screen` must show
Enhanced's picture again. On Battleaxe (2026-11-22, `npm run release:build`, the GOG 1.3 files and the
first release) it failed 3 of 16 in each before `c62a164a`: the splash stayed over the Classic title
at opacity 1 (full strength, at the switch and two seconds on) and 0.909 or 0.954 (switched while
fading), until its own timer and fade ended it. Switching to Classic now ends the splash at once: 16 of
16 in each.

Whether the shipped data shows the same Enhanced pictures as the original files, frame by frame, is
`npm run verify:port-parity`: see docs/STANDALONE.md, "Port parity".

Checked on 2026-11-22 on an Intel Mac (macOS 26.3), last with the packages of `05f97892` (disk image
749 MB, Windows installer 680 MB, Linux archive 694 MB, all three packed in 291 seconds): the disk image
mounted with `hdiutil attach`, the app (1.0 GB) copied to a scratch Applications folder outside the
checkout, opened with `open --env POR_OPEN_BROWSER=0 --env POR_PREGEN_PARTY=1` and nothing set that
names `por-assets`:

- `codesign --verify --strict`: valid; `spctl --assess`: rejected (no Developer ID, as above).
- Its log: `POR_GAME_DATA port <app>/Contents/Resources/game`; saves in
  `~/Library/Application Support/Pool of Radiance/saves` (created by the launch, `roster.json` in it).
- The server answered 15 to 23 seconds after the app opened, most of it loading the artwork.
- The page opened in Enhanced, with the display switch hidden (no original files); the publisher
  screen, which the page shows before the title; the title with POOL OF RADIANCE and SPECIAL EDITION
  faded in; the code wheel's question (2, 3, 5, 7 and 8 in different runs: the dice roll on the real
  clock); its word, read off `src/codewheel/wheel.json`, reached the main menu; the six ready-made
  characters (Thrender Grone, Bakshi, Rhiannon, Brother Sean, Darkstar, Phineas) added from Add
  Character; the tour to the first exploration menu in New Phlan, drawn with WebGL (ANGLE Metal on the
  Intel UHD 630), with no "WebGL exploration is unavailable" in the console.
- Quit (the quit Apple event Cmd-Q sends) left no launcher, runner or listener on the port, and removed
  `running.json`.
- The launcher run from a shell, as the Windows shortcut and the Linux script run it, stopped the server
  and the runner within 1.3 seconds of SIGINT (Ctrl-C) and of SIGHUP (the terminal closing; Windows
  sends it when the console window closes).

The Windows installer of `05f97892` was run on Battleaxe (Windows under its WSL), from PowerShell,
without elevation: the installer asks for administrator, so it ran as the user (`__COMPAT_LAYER=RunAsInvoker`)
with `/S /D=D:\por-release-test\install` (C: had too little space; a first try there stopped at 599 MB
with exit 2 when the disk filled):

- Installed in 22 seconds, exit 0: 17,949 files, 824 MB, with `node\node.exe` (v26.13.1), `app\`,
  `game\`, `upgrades\`, `audio\classic\`, `tools\`, the icon and `Uninstall.exe`.
- The installed game, started as its shortcut starts it (`node.exe app\launch.mjs` in a console of its
  own): `POR_GAME_DATA port D:\por-release-test\install\game`; the page answered 200 at
  `http://127.0.0.1:43124/`; saves in `%APPDATA%\Pool of Radiance\saves`.
- Ctrl-C sent to that console stopped both Node processes (launcher and runner) and freed the port.
- `Uninstall.exe /S` exited 0 and removed everything but itself (run in place with `_?=`, as a test
  must); the saves stayed.

The installer of `da37658c` (680 MB, sha256 `ce8fb431…09b6f3`), with the launcher that opens the game's
own Chrome window, was run on Battleaxe again on 2026-11-22, installing to E: (a USB disk, which also
holds the Ubuntu that WSL runs; 3.4 TB free) while C: had 829 MB free. `%APPDATA%\Pool of Radiance` did
not exist before the run.

- Silent and unelevated (`__COMPAT_LAYER=RunAsInvoker`, `/S /D=E:\por-release-test\install`): exit 0 in
  60 seconds (22 on D:): 17,951 files, 864,573,666 bytes.
- With its own pages (unelevated, driven through UI Automation): the first page is **Choose Install
  Location**, on `C:\Program Files\Pool of Radiance`, with *Space required: 833.3 MB* and *Space
  available: 829.2 MB*, and **Next** greyed out, though the page says "Click Next to continue" and
  nothing says why. Typed in the folder box, `E:\por-release-test\install-gui` (3428.2 GB available)
  and `D:\Pool of Radiance` (132.5 GB) turned **Next** on; `E:\` (a drive's root) kept it off. Next led
  to **Choose Components** (the game, and the desktop shortcut) with **Install**; Cancel closed it.
  So the player can choose the drive, but NSIS refuses a drive only when the files alone do not fit:
  with 834 MB free C: would have been accepted and filled (#94).
- Fixed in `windows-installer.nsi` (#94): Next stays on, and leaving the directory page for a drive
  with less free space than the game's files and 256 MB more (`SPARE_MB`) shows *Pool of Radiance
  needs N MB free on C:, and C: has M MB* and stays on the page; a silent install to such a drive exits
  2 before writing anything. Checked on Battleaxe with a small stage built with `-DSPARE_MB=1000`:
  with its pages, Next on C: (784 MB free) showed "needs 1000 MB free on C:, and C: has 784 MB", OK
  returned to the page, and `E:\por-release-test\room-check-gui` went on to *Choose Components*;
  silent, `/D=C:\por-room-check` exited 2 in a second and left no folder, `/D=E:\…` exited 0.
- Started as its shortcut starts it (`node\node.exe app\launch.mjs`, from Windows, in a console of its
  own): Chrome opened at once in app mode on the game's own profile
  (`--user-data-dir=%APPDATA%\Pool of Radiance\browser --app=file:///E:/…/tools/loading.html?game=…`).
  Right after installing, the window was on the game by 5 seconds; started cold later, it showed
  *POOL OF RADIANCE / Loading…* for 76 seconds before the server answered (the artwork read from the
  USB disk). The console read `POR_GAME_DATA port E:\por-release-test\install\game`.
- Closing the game's window stopped Chrome, the launcher and the runner within 4 seconds, freed port
  43124 and removed `running.json`; Ctrl-C in the launcher's console did the same in 3 seconds.
- A second launch while the game ran printed *already running* and exited, but opened no window: on
  Windows libuv kills a child that is not detached when Node exits, so the Chrome it spawned died
  before reaching the running browser (#114). With the Chrome detached (`launch.ts`), a second app
  window on the game came up within 2.5 seconds.
- The opening in that Chrome (Chrome 157, driven over DevTools; with the display asleep Chrome counts
  the window as hidden and refuses screenshots, so that run added
  `--disable-backgrounding-occluded-windows --disable-features=CalculateNativeWinOcclusion`): the
  loading page, the publisher splash, the title with both names faded in and the title music playing
  (`por-title-theme.mp3`, not paused or blocked, 5.2 then 8.2 seconds in), code wheel question 9 read
  as SAVIOR, the main menu, a new character (dwarf fighter) through the character sheet's Head and Body
  and the icon editor (*old ready action new ready action*, Parts, colours, Size) to the roster, the
  six ready-made characters, and the tour to New Phlan's first menu, drawn with WebGL on the RTX 3070
  (`ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Direct3D11 vs_5_0 ps_5_0, D3D11)`), no fallback, no
  console errors.
- The game's Chrome profile, on C: in `%APPDATA%`, was 181 MB after two starts and 188 MB after the
  opening, of which Chrome's HTTP cache was 1.6 MB: the rest was what Chrome downloads into any new
  profile (its components and the optimization guide's models). With `--disable-component-update` and
  the optimization guide's downloads switched off (#116), a fresh profile was 18.7 MB a minute after
  a start and 41.4 MB after three (18.6 MB of it Safe Browsing's lists).
  C: itself was falling (871 MB free at 05:31, 455 MB at 05:50) from Docker Desktop's disk image and
  Google Drive's cache, both on C: (#116, for the owner).
- `Uninstall.exe /S`, run as Settings runs it (it copies itself to `%TEMP%` and returns), with the game
  stopped: exit 0, the install folder gone entirely 14.5 seconds later; the saves stayed.

The installer of `7a9f667e` (sha256 `f3a0886e…c465223`), the same way: installed in 54 seconds; on the
game page 4.1 seconds after the shortcut's command; the opening as above (code wheel question 11,
VULCAN), and the icon editor with its four icons drawn (`combat:party:0:0` and `:0:128`, old and new,
each loaded at 96 pixels) after the character sheet's head and body pictures. A second window opened
on the game in the same Chrome took it over within 1.5 seconds; the older one then read *Pool of
Radiance is open in another window* and its sound stopped.

The installer of `d7e87953` (sha256 `0c8e8fff…a2d8a`, with #94 and #114), the same way: with its pages,
Next on C: (861.9 MB free, enough for the old check) showed *Pool of Radiance needs 1089 MB free on C:,
and C: has 861 MB*, and `E:\Pool of Radiance` went on to the components; silent, installed in 45
seconds; on the game page 6.3 seconds after the shortcut's command; a second launch opened a second
window on the game; closing the windows stopped everything in 7 seconds; the opening as above
(question 1, ZOMBIE), with one start waiting 75 seconds on *Loading* for the USB disk; uninstalled in
13.4 seconds. Characters made in earlier sessions were in `roster.json` but not on Add Character to
Party in a new one, with `SAVE\CHARLIST.TXT` saved empty (#119). After the run `%APPDATA%\Pool of
Radiance`, which had not existed, was removed again.

The Linux archive of `00e281a2` (`pool-of-radiance-0.1.0-linux-x64.tar.gz`, 706 MB) was packed on Battleaxe
(`npm run release:pack -- linux`, 24 seconds in /dev/shm; checks 1 to 3 passed, Node v26.13.1 checked against
SHASUMS256.txt; packing off macOS needed #107's change: the icon cut with python3 Pillow, GNU tar flags: a
first run failed with `tar: unrecognized option '--no-mac-metadata'`), unpacked under /dev/shm and started as a player
starts it: `./pool-of-radiance` with `env -i`, only HOME, PATH, `POR_OPEN_BROWSER=0` and `POR_PREGEN_PARTY=1`.

- It printed `POR_GAME_DATA port <folder>/game`, listened on 127.0.0.1:43124, and made
  `~/.local/share/pool-of-radiance/{saves,out,running.json}`.
- `capture-release.mjs` with `/usr/bin/google-chrome` (headless, muted) saw the publisher splash, the title with
  both names, code wheel question 7 (JUNGLE), the main menu, the six ready-made characters added, and then New
  Phlan's first-person view (Rolf's greeting, 15,1 W); it opened in Enhanced with the display switch hidden and no console
  errors. The script itself reported FAILED, having pressed Enter 80 times without reaching the first exploration
  menu while Rolf's tour was still talking (the Mac run got through): the view was reached, the menu was not.
- SIGINT (Ctrl-C) to the start script: the launcher and runner were gone and the port free in 1.0 second,
  `running.json` removed, `roster.json` left in `saves/`.

The Mac images of `da41aabb` (one run of `npm run release:pack -- mac` on the Intel Mac, 359 seconds; checks 1
to 3 passed for both): `Pool-of-Radiance-0.1.0-mac-arm64.dmg` 717 MB and `-mac-x64.dmg` 719 MB (the universal
image was 749 MB: the images are compressed, so the saving is about 30 MB each, not the 150 MB of the Node
binary, which is 147 MB per architecture against 297 MB joined). `lipo -info` on `Contents/MacOS/node`: arm64
in the arm64 image, x86_64 in the x64 one. The x64 image was mounted, its app copied to a scratch folder
outside the checkout, `codesign --verify --strict` valid, opened with `open --env POR_OPEN_BROWSER=0`: the
log read `POR_GAME_DATA port <app>/Contents/Resources/game`, the server answered 200 on 127.0.0.1:43124
within about 20 seconds, and the quit Apple event left no process and no listener. The arm64 image was
checked by its binaries only (it cannot run on this Intel Mac).

## Known gaps

- The internal Alpha 1 Windows installer registered version `0.1.0-alpha.1` and its chosen destination on a clean Windows Server 2022 runner. Its Start Menu shortcut opened the game window in 1.81 seconds. Manual checks remain for the default Program Files destination, desktop shortcut, SmartScreen prompt, and finish page Play action. [Windows installation test](https://github.com/TSavo/por/actions/runs/45293360307)
- The historical notes above describe the earlier Node launcher, which opened the game in a browser.
  The current packages are the Electron app.

### Mac time to first visible window

The internal Alpha 1 Electron disk images were opened three times each on fresh native GitHub-hosted Macs. Each time starts at Launch Services invocation and ends when WindowServer reports the first on-screen, normal-layer window belonging to the app, at least 320 by 200 points. Between launches the app quit and kept the same profile.

| Runner | First launch | Second launch | Third launch |
| --- | ---: | ---: | ---: |
| Intel, macOS 15.7.9 | 10.136 s | 2.952 s | 3.134 s |
| Apple Silicon, macOS 15.8.2 | 0.779 s | 0.541 s | 0.561 s |

On the first Intel launch, Launch Services registered the app at 0.973 s. Another 9.163 s elapsed before the window appeared. The first Apple Silicon registration came at 0.068 s. The disk images, copied apps and main executables all lacked a quarantine attribute. These measurements leave the cause of the Intel delay and the experience opening a browser-downloaded copy in Finder unresolved. The older 30–40 s observation used the legacy Node launcher. [Packaged images](https://github.com/TSavo/por/actions/runs/45289483504) · [Native launch measurements](https://github.com/TSavo/por/actions/runs/45291537972) · [Issue #184](https://github.com/TSavo/por/issues/184)

To repeat, dispatch the **Mac packaged first launch** workflow with the internal packaging run ID while its **package-mac** artifact is available.

On a physical Intel Mac running macOS 26.3.1(a), the browser-downloaded Alpha 1 retained quarantine through installation. The owner approved Open Anyway and saw the game open. A warm launch showed the `v0.1 Alpha 1 (1f44fc3)` title and main menu. The native folder picker accepted the GOG 1.3 and first-release folders, retained each selection across a full quit and relaunch, and rejected an invalid folder. The tester then restored bundled-data mode. The first visible window was not timed in this run. [Physical Mac test report](https://github.com/TSavo/por/issues/103#issuecomment-7118303350)

Two subsequent launches on that physical Mac were timed using the same window criteria, with process lookup by bundle identifier because App Translocation changes the running bundle's path. The first registered at **61.747 s** and showed a window at **78.257 s**; the second registered at **0.201 s** and showed a window at **3.955 s**. Both followed Open Anyway and earlier successful launches; neither measures a pristine first launch. The long registration delay is observed, but this probe does not establish its cause. The initial quarantined launch was blocked before approval, with a `syspolicyd` assessment error; signing and notarization remain tracked in [#105](https://github.com/TSavo/por/issues/105). [Physical Mac timing evidence](https://github.com/TSavo/por/issues/184#issuecomment-7118462449)

The installed Intel Alpha 1 also completed Rolf's tour with all **8/8 narration clips** playing once to full length, in order, without overlap and with the expected artwork throughout. Queue-to-start latency was 11–34 ms. This measures playback events, not subjective listening. From the tracked Training Hall save, normal manual combat followed by one Quick command displayed **15/15 bundled-data** and **13/13 GOG 1.3** combat-report frames in order, including the final dying message and loss/zero-XP prompt. The independent runs had different combat rolls; each panel was compared with its own native frames. Counts include the repeated final attack with the dying message. The actual inputs and playback/panel evidence are retained in [qa/mac-alpha1-runtime.json](../qa/mac-alpha1-runtime.json). These focused checks do not close the global narration or combat-message coverage issues.
