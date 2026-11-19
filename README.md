# Pool of Radiance

A port of SSI's 1988 Turbo Pascal game. Game procedures are translated instruction by instruction from `START.EXE` and `GAME.OVR` (`TPOV` overlays). The browser player displays the translated game's EGA output and includes the party journal. See [docs/PORT.md](docs/PORT.md) and [docs/COVERAGE.md](docs/COVERAGE.md).

Supply your own complete set of original DOS game files. Unpack them so
`START.EXE`, `GAME.OVR`, and the `*.DAX` files are in the same folder.
`gamedata/` is gitignored.

## Run it

Use Node.js 22 or newer. With the unpacked files in `gamedata/pool/`,
run `npm ci` followed by `npm run play` from the repository root.
To keep the files elsewhere, set `POR_GAMEDATA` first.

```bash
export POR_GAMEDATA=/path/to/pool
```

In PowerShell:

```powershell
$env:POR_GAMEDATA = 'C:\Games\pool'
```

Open [the local game](http://127.0.0.1:43124) to play the translated game. In the game screen, choose **Encamp → Journal** to see what the party knows. **J** also opens the journal during play. Select **Track** next to a quest to make it the current objective. Press **J** or **Escape** to return to play.

Use **Encamp → Save** and **Load Saved Game** to save and restore the party and its journal in the same slot. The runner stores slots under `out/saves/` for each game-data directory. Set `POR_SAVE_DIR` to select a different folder.

In combat, **Home**, **Page Up**, **End**, and **Page Down** move or aim diagonally. The numeric keypad provides these keys with Num Lock off.

Press **F10** or select **Enhanced display** to use replacement art where
available and the web font for game text. Both display modes share the
running game and save slots.

`npm run dev` launches the same game. If `POR_GAMEDATA` is unset, the runner checks `./gamedata`, including one nested folder such as `gamedata/pool`.

## Tools

```bash
npm run translate -- --output out/translated  # requires Python and capstone
npm run verify           # run FillChar and the ECL operand fetch
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

Pass local gameplay traces after the game directory and output directory to add classic comparisons from captured exploration and battle tiles. For example, run `npx tsx tools/art-inventory.ts gamedata/pool out/art-inventory out/run/tile-inventory.jsonl`. The inventory checks each captured tile against its runtime hash and records its position and frame. Select **Captured tiles without replacements** to review unmatched patterns by area. A pattern can contain part of a moving sprite or another overlay, so check its source frame before assigning it as a terrain tile. Keep the traces and generated previews outside version control.

After generating the inventory, run `python tools/audit-art-palette.py` with Pillow installed to count visible RGB colors across the artwork and by asset family. Use these counts to review color ramps. VGA is the visual style and the artwork can use any number of colors.

Use `--output` to inspect a fresh translation alongside the checked-in runtime files. The translator writes its generated coverage report alongside that output. With the default TypeScript destination, the report goes to `out/translation-coverage.md`.

`extract` and `images` write the original art into `out/`. That directory is gitignored. Do not commit it.

## Formats

- [docs/dax.md](docs/dax.md) — container, runs, pictures, maps, wall tables
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
