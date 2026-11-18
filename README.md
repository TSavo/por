# Pool of Radiance

A port of SSI's 1988 Turbo Pascal game. Game procedures are translated instruction by instruction from `START.EXE` and `GAME.OVR` (`TPOV` overlays). The hand-written pieces are the 8086/DOS stand-in and the two presentations (classic EGA and the upgraded chrome). See [docs/PORT.md](docs/PORT.md) and [docs/COVERAGE.md](docs/COVERAGE.md).

The game files are copyrighted. They are not in this repository. Put them in a directory and point the tools at it. `gamedata/` is gitignored.

This is phase 1: the DAX and ECL formats, a disassembler, image export, and a browser shell that shows the title page and one 3D area. The rules and the pixels are already separate, so a later upgraded presentation can replace art by id without a second copy of the game. See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md).

## Run it

```bash
npm install
export POR_GAMEDATA=/path/to/pool    # the folder that contains START.EXE, ECL1.DAX, GEO*.DAX, ...
npm run play
```

Open [the local game](http://127.0.0.1:43124) to play the translated game. In the game screen, choose **Encamp → Journal** to see what the party knows. **J** also opens the journal during play. Select **Track** next to a quest to make it the current objective. Press **J** or **Escape** to return to play. The journal persists in a separate party profile. Set `POR_JOURNAL_PROFILE` to select a different profile.

## Presentation prototype

```bash
npm run dev
```

The dev server listens on port **43123**. Open the URL it prints. If `POR_GAMEDATA` is unset, `./gamedata` is used, including one nested folder such as `gamedata/pool`.

Keys:

| Key | Action |
| --- | --- |
| F10 | Classic presentation / upgraded presentation. Same party, same square. |
| Arrows | Turn and step. A wall blocks the step. |
| T | Title page |
| N | One ECL instruction |

Upgraded mode reads `upgrades/manifest.json`. The file ships empty, so every picture falls back to the decoded EGA asset. Drop a PNG in `upgrades/` and name its asset id in the manifest to override just that picture. See [upgrades/README.md](upgrades/README.md).

## Tools

```bash
npm run translate        # tools/tp_translate.py -> src/translated/
npm run verify           # run FillChar and the ECL operand fetch
npm run selftest
npm run tools -- list
npm run tools -- extract          # out/dax/<file>/<id>.bin
npm run tools -- disasm           # out/ecl.txt
npm run tools -- images           # out/images/*.png
npm run tools -- exe              # MZ header, packer signature, overlay stubs
```

You can pass the game directory as the last argument instead of `POR_GAMEDATA`.

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
