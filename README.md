# Pool of Radiance

A browser port of SSI's 1988 Turbo Pascal game. Game procedures are translated instruction by instruction from `START.EXE` and `GAME.OVR`. The player supports Classic EGA and Enhanced artwork, with an illustrated atlas and a journal that tracks the party's discoveries. See [docs/PORT.md](docs/PORT.md) and [docs/COVERAGE.md](docs/COVERAGE.md).

The original DOS game files are optional. With none supplied, the port runs
from its own data in `game/` and always starts in Enhanced display; the
player's own files only unlock the Classic display. To use original files,
unpack them so `START.EXE`, `GAME.OVR`, and the `*.DAX` files are in the same
folder. `gamedata/` is gitignored.

The port targets version 1.3, the one GOG sells: use its `POOLRAD` folder.
It also runs the first release, which shows no version on its credits
screen, and picks the right translation from `GAME.OVR`. Saved
games, artwork, narration and the journal work on both.

## Run it

Use Node.js 22 or newer. Run `npm ci` followed by `npm run play` from the
repository root. Unpacked original files in `gamedata/pool/` are used when
present (they win over `game/`); to keep them elsewhere, set `POR_GAMEDATA`
first. `POR_GAME_SOURCE=port` forces the port's own data and
`POR_GAME_SOURCE=original` never falls back to it.
`npm run release:pack` builds the installers a player downloads, which need no checkout and no files from the player: see [docs/RELEASE.md](docs/RELEASE.md).

```bash
export POR_GAMEDATA=/path/to/pool
```

In PowerShell:

```powershell
$env:POR_GAMEDATA = 'C:\Games\pool'
```

Open [the local game](http://127.0.0.1:43124) to play the translated game. In Enhanced display, press **J** or select **Journal** to see what the party knows. Select **Track** next to a quest to make it the current objective. Press **J** or **Escape** to return to play. Classic display leaves the original menus and the **J** key to the game.

At start-up the version 1.3 game asks for a word from its translation wheel. Enhanced display shows the wheel and requires the right word; **Escape** puts the wheel away and brings it back. When the game later shows runes to translate, the wheel comes up again by itself, and **Escape** or **Code wheel** puts it away and brings it back. At any other time there is no wheel. See [docs/CODE-WHEEL.md](docs/CODE-WHEEL.md). Classic display has no wheel and accepts any word, as the GOG program does.

Use **Encamp → Save** and **Load Saved Game** to save and restore the party, its journal, and its discovered map in the same slot. The runner stores slots under `out/saves/` for each game-data directory. Set `POR_SAVE_DIR` to select a different folder.

In combat, **Home**, **Page Up**, **End**, and **Page Down** move or aim diagonally. The numeric keypad's 7, 9, 1, and 3 provide them, with Num Lock on or off (the runner reads the physical key, not the character).

The game seeds its dice from the clock when it starts, as it did on DOS, so
each launch of `npm run play` rolls differently. Set `POR_CLOCK=fixed` to
start the clock at noon every time. Replays and checks use the fixed clock so
that the same keys give the same results.

For local testing, set `POR_DEV_COMBAT=1` before running `npm run play` and
use a separate `POR_SAVE_DIR` for test saves. Press **F9** when it appears
during combat, including on an enemy's opening turn. Choose **No** at
**Continue Battle** to collect the original encounter's rewards and continue.

Press **F10** or select **Enhanced display** to use replacement art where
available and the web font for game text. Both display modes share the
running game and save slots.

Enhanced exploration uses WebGL. Story illustrations and combat use
their own presentation. The local server loads the browser
code at startup. After updating the checkout, save through Encamp and
restart `npm run play` to serve the new code. Reloading Chrome alone
continues to use the code loaded by the running server.

Use **Map** to open the current area map. In Enhanced mode on the
Moonsea overland map, select an available landmark to follow its route.
Select **Phlan** to choose among available district approaches. Along the
way, game prompts such as ferry fares can require a party decision.

`npm run dev` launches the same game. The launcher checks the selected
directory and one level of subdirectories. If `POR_GAMEDATA` is unset
it checks `./gamedata`, including layouts such as `gamedata/pool`, and
otherwise uses `game/`.

## Tools

```bash
npm run translate -- --output out/translated  # requires Python and capstone
npm run verify           # verify translated routines, art assets, and audio
npm run verify:translation-reproducible  # src/translated matches the generator; requires Python and capstone
npm run selftest
npm run tools -- list
npm run tools -- extract          # out/dax/<file>/<id>.bin
npm run tools -- disasm           # out/ecl.txt
npm run tools -- images           # out/images/*.png
npx tsx tools/art-inventory.ts    # out/art-inventory/index.html and inventory.json
npx tsx tools/export-dos-save.ts path/to/browser/saves J  # export the DOS SAVE files for one slot
npm run tools -- exe              # MZ header, packer signature, overlay stubs
```

You can pass the game directory as the last argument instead of `POR_GAMEDATA`.

The HTML art inventory counts linked source frames per archive block. Use the replacement filter to find blocks with zero, some, or all frames linked. Runtime artwork such as viewport tiles has its own section.

Set `POR_PORTRAIT_TRACE_FILE` to a local JSONL path before starting the
browser runner to capture original portraits observed during play. Pass that
file to the art inventory after the output directory. The gallery shows the
area, ECL cursor, source candidates, and visible dialogue for each fallback.
Older tile traces can contain full-screen portrait crops. The inventory
recognizes exact source matches and lists those frames under **Portraits in
tile traces**, outside the terrain coverage counts.

Open **Illustrated atlas** in the inventory to review every atlas plate,
its dimensions, and the areas or floor where it appears. The previews
link directly to the artwork in the checkout.

Under **Unlinked source frames**, expandable combat rows list artwork
from encounters that use the exact same source pixels. These are leads
for checking the actor and scene in Chrome before binding the art.

Pass local gameplay traces after the game directory and output directory to add classic comparisons from captured exploration and battle tiles. For example, run `npx tsx tools/art-inventory.ts gamedata/pool out/art-inventory out/run/tile-inventory.jsonl`. The inventory checks each captured tile against its runtime hash and records its position and frame. Select **Captured tiles without replacements** to review unmatched patterns by area. A pattern can contain part of a moving sprite or another overlay, so check its source frame before assigning it as a terrain tile. Keep the traces and generated previews outside version control.

After generating the inventory, run `python tools/audit-art-palette.py` with Pillow installed to count visible RGB colors across the artwork and by asset family. Use these counts to review color ramps. VGA is the visual style and the artwork can use any number of colors.

Use `--output` to inspect a fresh translation alongside the checked-in runtime files. The translator writes its generated coverage report alongside that output. With the default TypeScript destination, the report goes to `out/translation-coverage.md`.

`extract` and `images` write the original art into `out/`. That directory is gitignored. Do not commit it.

## Formats

- [docs/dax.md](docs/dax.md) — container, runs, pictures, maps, wall tables
- [docs/MAP-GEOGRAPHY.md](docs/MAP-GEOGRAPHY.md) — enhanced illustrated-map geography and evidence model
- [docs/ecl.md](docs/ecl.md) — bytecode, the opcode table, what the stepper will and will not do
- [docs/start-exe.md](docs/start-exe.md) — EXEPACK and the overlay stubs
- [docs/game-ovr.md](docs/game-ovr.md) — the overlay file
- [docs/rea/NOTES.md](docs/rea/NOTES.md) — REA / Ghidra evidence

The opcode table and the wall-slot geometry were checked against Curse of the Azure Bonds, the next game on this engine, because that is the published reconstruction. coab has no license file; this tree does not copy it. Differences to expect on Pool of Radiance are listed in `docs/ecl.md`.

## REA

Native analysis uses [REA](https://github.com/morluto/rea) (`rea-agents` on npm) with Ghidra 12.1.x and JDK 21.

```bash
npm install --prefix "$HOME/.local" rea-agents
export PATH="$HOME/.local/node_modules/.bin:$PATH"
export GHIDRA_INSTALL_DIR=/path/to/ghidra_12.1.4_PUBLIC
export JAVA_HOME=/path/to/jdk-21
rea doctor --provider ghidra --json
```

A packed `START.EXE` has to be unpacked before REA will show the game rather than the EXEPACK stub. `GAME.OVR` is not an MZ; slice it from the stub table the `exe` command prints, then inspect the slices.
