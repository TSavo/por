# Releases

A release is the game as a player installs it: version 1.3, in Enhanced, from the port's own data in
`game/`, with the new artwork in `upgrades/` and the narration in `audio/`. It needs no files from the
player, no checkout, no npm and no tsx. It runs the same server and runner as `npm run play`, compiled
to JavaScript, under the Node runtime it carries, and the player plays it in their browser (Chrome is
recommended; it is opened where it is installed).

## Build

On a Mac, from a checkout with `npm ci` done:

```bash
POR_NSIS_HOST=battleaxe npm run release:pack    # all three; or: npm run release:pack -- mac
```

The Windows installer needs makensis. Where it is installed (`brew install makensis`, which on an
Intel Mac builds a dozen formulae from source for over half an hour) it runs here; otherwise
`POR_NSIS_HOST` names a machine reached by `ssh` that has it (`sudo apt-get install -y nsis` on Ubuntu,
makensis 3.09): the staged install goes to that machine's `/dev/shm`, makensis runs there, and the
installer comes back into `dist/`. With neither, the Windows installer is skipped with a message.

`npm run release:build` alone compiles `tools/browser-play.ts`, `tools/boot-translated.ts` and
`tools/release/launch.ts` with esbuild into `dist/app/server.mjs`, `runner.mjs` and `launch.mjs`.
`release:pack` runs it, then builds, into `dist/`:

| File | What it is |
| --- | --- |
| `Pool-of-Radiance-<version>-mac.dmg` | `Pool of Radiance.app` beside an Applications link, to drag across |
| `Pool-of-Radiance-<version>-windows-setup.exe` | An NSIS installer to Program Files (skipped when makensis is not installed) |
| `pool-of-radiance-<version>-linux-x64.tar.gz` | A folder with a start script (an AppImage later) |

The packages are built from the commit checked out (`git archive HEAD`), not from the working tree.
Node is the official build of the version pinned in `tools/release/pack.ts`, downloaded from nodejs.org
into `dist/cache/` and checked against its `SHASUMS256.txt`; the Mac app carries one universal binary
(Apple silicon and Intel, joined with `lipo`). Packing needs macOS's own tools (osacompile, hdiutil,
lipo, sips, iconutil, codesign). `dist/` is not committed.

## What the package contains

Every package holds the same files. In the Mac app they are under `Contents/Resources`, beside the
applet's own `Scripts/main.scpt`, `applet.rsrc` and icon, with Node in `Contents/MacOS/node`.

| Folder | Contents |
| --- | --- |
| `app/` | `launch.mjs`, `server.mjs` and `runner.mjs`: the launcher, the game server and the runner, compiled. The runner holds the translated game program. |
| `game/` | The port's own game data (16 files): the program image and overlays with every instruction blank, the scripts, maps, monsters, items, characters, saved-game templates, walls, tiles and picture shapes, converted from version 1.3 by `npm run build:game-data`. The game's text is in it. |
| `upgrades/` | The Enhanced artwork: 13,454 PNGs, `manifest.json` and `slums/manifest.json` that bind them, the code wheel (`codewheel/`), the atlas plates (`maps/`), the Geist font (`font.woff2`) and its licence (`Geist-OFL.txt`), and `README.md`. |
| `audio/` | `voices/`: the narration, 1,755 MP3s, with 1,748 transcript `.txt` files, 849 `.json` records, one WAV and a README. `enhanced/`: the Enhanced score and sounds, 38 WAVs, 2 MP3s and 19 `.json` records. `classic/`: the Classic sounds, the game's 20 sound events for the PC speaker and for the Tandy chip (40 WAVs, 91 MB), the port's own renders of the original driver, with a README on how each was made. |
| `src/` | The data the server and runner read: `audio/voices.json`, `audio/voice-master-manifest.json` (the narration's text), `audio/original-sounds.json`, `maps/atlas.json`, `maps/geography-model.json`, `codewheel/wheel.json`. |
| `qa/` | `art-worklist-cells.json`, the exploration cells the server draws from the port's own data. |
| `tools/` | The game page: `play.html`, `play.js`, `new-phlan-webgl.js`, `code-wheel.html`, `code-wheel.js`, `code-wheel-draw.js`, `rune-glyphs.js`. |
| Node | `Contents/MacOS/node` on the Mac, `node/node.exe` on Windows, `node/bin/node` on Linux, with Node's `LICENSE`. |
| Start | Mac: the app itself. Windows: Start Menu and desktop shortcuts to `node\node.exe app\launch.mjs`, `pool-of-radiance.ico`, `Uninstall.exe`. Linux: `pool-of-radiance` (the start script), `pool-of-radiance.png`, `README.txt`. |

## What packing refuses

Packing is where nothing of `por-assets` may go in. `release:pack` fails if:

1. A file in a package is an original game file (`START.EXE`, `GAME.OVR`, `POOL.CFG`, `*.DAX`,
   `*.OVR`, `*.EX_`, `*.PIC`, `*.CMP`, or any `.exe` but Node's), a link, or a path naming
   `por-assets`. Or it is a Classic sound (`pc-speaker-NN.wav`, `tandy-NN.wav`) or, where a
   `por-assets` directory sits beside the checkout, has the same bytes as any file in it, and is not
   the committed file at its own path in `audio/classic/`, blob for blob. The Classic sounds ship as the
   committed `audio/classic/`; the same WAV taken from `por-assets/original` and put anywhere else, or
   changed, is refused.
2. `game/` in a package is not the committed `game/`: the same 16 files, each the same git blob. What
   `game/` holds is checked by `npm run verify:game-data`: no instruction bytes and no original pixels.
3. The compiled `server.mjs`, `runner.mjs` or `launch.mjs` contains the string `por-assets`
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

- **Mac:** open the disk image and drag **Pool of Radiance** to Applications. Opening the app starts the
  game and opens it in Chrome (or the default browser). The app sits in the Dock while the game runs:
  **Cmd-Q**, or **Quit** from its Dock menu, stops the server and the runner. Clicking its Dock icon
  opens the game in the browser again. The launcher's output is in `~/Library/Logs/Pool of Radiance.log`.
- **Windows:** run the installer; choose whether to add a desktop shortcut. **Pool of Radiance** in the
  Start Menu opens a console window, starts the game and opens the browser. Closing that window, or
  Ctrl-C in it, stops the game. Uninstall from Settings or the Start Menu.
- **Linux:** unpack the archive and run `./pool-of-radiance`. Ctrl-C or closing the terminal stops it.

The launcher (`tools/release/launch.ts`) serves the game on `http://127.0.0.1:43124/` when that port is
free, so the page keeps its browser storage from one launch to the next, and on any free port when it
is not. It prints the address in case no browser opens. Launched again while the game runs, it opens the
browser on the running game. It sets `POR_ROOT` to the install, `POR_RUNNER` to the compiled runner
and `POR_GAME_SOURCE=port`, and drops every other `POR_` setting it inherits except `POR_CLOCK`,
`POR_PREGEN_PARTY`, `POR_TRACE_KEYS`, `POR_SAVE_DIR` and `POR_OPEN_BROWSER` (`0`: print the address
only). The runner names the data it chose when it starts: `POR_GAME_DATA port <install>/game`.

## Where saves go

In the player's own directory, which the launcher creates; the runner's other writes (`out/`) go there
too, never into the install:

| | Directory | Saves |
| --- | --- | --- |
| Mac | `~/Library/Application Support/Pool of Radiance` | `saves/` |
| Windows | `%APPDATA%\Pool of Radiance` | `saves\` |
| Linux | `$XDG_DATA_HOME/pool-of-radiance`, else `~/.local/share/pool-of-radiance` | `saves/` |

Uninstalling leaves them.

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

## Known gaps

- Windows, not yet run: an elevated install to Program Files, the Start Menu and desktop shortcuts and
  the uninstall entry (the unelevated run cannot write the all-users places, so none were made),
  SmartScreen's prompt, the finish page's Play (through the shortcut and Explorer), and closing the
  console window (its SIGHUP path is checked on the Mac). The Linux archive has not been run on Linux.
- The Mac app holds a universal Node (297 MB); one disk image per architecture would be about 150 MB
  smaller each.
