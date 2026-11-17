# REA evidence

REA is `rea-agents` 6.9.0 from the npm package, repository `git+https://github.com/morluto/rea.git`, MIT. Ghidra is 12.1.4 (`ghidra_12.1.4_PUBLIC`), SHA-256 of the zip `ddac49f903da9d5bac833e5cc79395098b9c33cfd3279be5f31bd00387d2d4db`, JDK 21.0.13. The CLI is what this session used. The process cannot register a new MCP server into its own tool list, so there is no live REA MCP connection here. A later desktop session can run `npx rea-agents setup` and point it at Cursor.

`doctor.json` is `rea doctor --provider ghidra --json`. Ghidra, the headless launcher, and the linux x64 decompiler all report healthy.

`tiny-mz-summary.json` is the trimmed result of `rea inspect` on a 33-byte MZ (`RET` at the entry). REA classified it `dos-mz` / `x86` and named Ghidra 12.1.4 as the upstream provider. The full JSON is large and was not committed; the summary keeps the subject, the confidence, and the limitations REA printed.

## What the real files showed

`POR.zip` sha256 `6950e9ca62e8a034ecd300e2233a81135c52872bf3c564f74dd99edba004346b` is on disk. `START.EXE` sha256 `14ecf7584a43bd1ab36e04af12d9e9a3a00c5899533c853304e1e0e8af164fa2`. It is an unpacked MZ: no `Packed file is corrupt`, 228 relocations, entry `0:6`. `GAME.OVR` starts with `TPOV`.

`rea search START.EXE . --kind procedures --mode regex --provider ghidra` returned 175 procedures. Addresses are in `start-procedures.json`. `rea search` for the literal `GAME.OVR` returned an empty string list: Ghidra had not defined that string. `rea decompile` of `entry` (`0x10006`) produced one enormous function that walks the `int 3Fh` stub table, with a warning that control flow hit bad instruction data. `ram:0x10248` is not a procedure, so the handler the vector installer names is not a Ghidra function boundary.

`decompile-all` refused to start into an existing directory, and a full pseudocode dump of the overlays is the wrong object anyway: they are not in the MZ. Slice 7 was translated from 16-bit disassembly instead. See `docs/PORT.md`.

## Earlier note, before the archive was available

```
export GHIDRA_INSTALL_DIR=/home/ubuntu/ghidra_12.1.4_PUBLIC
export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH="$HOME/.local/node_modules/.bin:$PATH"
rea inspect "$POR_GAMEDATA/START.EXE" --provider ghidra --json
rea search  "$POR_GAMEDATA/START.EXE" "Packed file is corrupt" --provider ghidra --json
```

If the search hits, the file is still packed and REA is looking at the expander. Unpack it, then search for the byte sequence `CD 3F` and for the string patterns the DAX reader uses when it opens `ECL` and `GEO`.

## Where REA stops on this format

REA will load a real-mode MZ and decompile it. It will not:

- expand EXEPACK (its own guide says to analyze an unpacked copy)
- parse `_stub_descr` or slice `GAME.OVR` (that file is not an MZ)
- understand DAX, ECL, GEO, or WALLDEF

Those last formats are data, handled by `src/lib` and checked against CotAB bytes because that tree was available and uses the same containers. See `docs/dax.md` and `docs/ecl.md`.
