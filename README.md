# Pool of Radiance

A port of SSI's 1988 Turbo Pascal game. Game procedures are translated instruction by instruction from `START.EXE` and `GAME.OVR` (`TPOV` overlays). The browser player displays the translated game's EGA output and includes the party journal. See [docs/PORT.md](docs/PORT.md) and [docs/COVERAGE.md](docs/COVERAGE.md).

The game files are copyrighted. They are not in this repository. Put them in a directory and point the tools at it. `gamedata/` is gitignored.

## Run it

```bash
npm install
export POR_GAMEDATA=/path/to/pool    # the folder that contains START.EXE, ECL1.DAX, GEO*.DAX, ...
npm run play
```

Open [the local game](http://127.0.0.1:43124) to play the translated game. In the game screen, choose **Encamp → Journal** to see what the party knows. **J** also opens the journal during play. Select **Track** next to a quest to make it the current objective. Press **J** or **Escape** to return to play.

Use **Encamp → Save** and **Load Saved Game** to save and restore the party and its journal in the same slot. The runner stores slots under `out/saves/` for each game-data directory. Set `POR_SAVE_DIR` to select a different folder.

In combat, **Home**, **Page Up**, **End**, and **Page Down** move or aim diagonally. The numeric keypad provides these keys with Num Lock off.

Press **F10** or select **Enhanced display** for a 4:3 view with a softer color grade and a different journal theme. Both views use the running game's framebuffer. The display switch leaves play and saves alone.

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

After generating the inventory, run `python tools/audit-art-palette.py` with Pillow installed to count visible RGB colors across the artwork and by asset family. The audit exits with status 1 when the combined artwork exceeds 256 colors.

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
