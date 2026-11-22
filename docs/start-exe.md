# START.EXE

`START.EXE` is the Gold Box loader. `START.EX_` is the same program in the form the 1988 installer shipped: the last character of the extension replaced, which is how that installer marked a file it would expand. `SETUP.EXE` is the installer. None of these files are in the repo. `tools/exe.ts` reads them from the game directory at runtime.

## Packing

The Gold Box line from Pool of Radiance through Dark Queen of Krynn was packed with Microsoft EXEPACK. Simeon Pilgrim's Pools of Darkness notes record the confirmation: the stub contains the text `Packed file is corrupt`, which is EXEPACK and not a custom cipher. PKLITE shows up on some later reissues; LZEXE shows `LZ91`. A comment on those notes also says the copies of Pool of Radiance that circulated with the password check removed are often already unpacked, so a given tree might be either.

`npm run tools -- exe` parses the MZ header and searches the whole file for those three signatures.

What an unpacked header tells you:

- `e_cparhdr` paragraphs of header, relocation count, and the entry `CS:IP`
- Image size from the page count, and how many bytes sit after the image

EXEPACK's stub is what runs if you load the packed file. The game code is not visible as instructions until the stub has expanded it. REA's own DOS guide says the same thing: importing a packed executable analyzes the unpacker, and a separately unpacked image is what you inspect for the game. This repo contains an EXEPACK expander: `src/lib/exepack.ts` (`loadExecutable`) unpacks the load image for the runtime, and `tools/exepack.py` is the same routine in Python. Version 1.3's `START.EXE` ships packed and the first release's does not. `npm run tools -- exe` itself still only reports the packer signature and does not scan a packed file for overlay stubs, so analyze an unpacked copy with REA.

## What REA did here

REA `rea-agents` 6.9.0 (MIT, `github.com/morluto/rea`) is installed for this machine, with Ghidra 12.1.4 and JDK 21. `docs/rea/doctor.json` is the doctor output: Ghidra is healthy, the native decompiler matches linux x64, and the DOS path is the one REA documents (`x86:LE:16:Real Mode`, load segment `0x1000`).

The uploaded `POR` archive was not on the VM. `uploads/POR_63d1.zip` was named in the task and `/workspace/uploads` was empty, so `rea inspect` was never pointed at `START.EXE` or `GAME.OVR`. That is a missing input, not a REA failure.

To show the DOS loader actually runs, `rea inspect` was pointed at a 33-byte MZ whose only instruction is `RET`. REA reported `format: dos-mz`, `architecture: x86`, provider Ghidra 12.1.4, confidence `derived`. The trimmed result is `docs/rea/tiny-mz-summary.json`. Limitations REA stated, and that will apply to the real executable:

- Addresses are linear (`segment * 16 + offset`), not a unique segment:offset alias.
- The session does not model DOS interrupts, the PSP, or self-modifying code.
- A packed image is the unpacker until you give it the expanded bytes.
- Appended bytes past the MZ image are reported as an overlay tail and are not decoded as code.

## Overlay stubs live in the EXE

Once the image is unpacked, overlay stubs are visible. Each one starts with `CD 3F` (`int 3Fh`). Thirty-two bytes later the byte `EA` begins a table of far jumps, one every five bytes. The 32-byte header is the descriptor the CotAB IDC file names `_stub_descr`:

| Offset | Size | Meaning |
| --- | --- | --- |
| 0 | 2 | `CD 3F` |
| 2 | 2 | Paragraph where the overlay is swapped in |
| 4 | 4 | Offset of this overlay's code in `GAME.OVR` |
| 8 | 2 | Code size |
| 10 | 2 | Relocation-area size |
| 12 | 2 | Number of far-jump entries |
| 14 | 2 | Previous stub |
| 16 | 16 | Scratch |

`findOverlayStubs` in `tools/exe.ts` collects those descriptors. It refuses a hit whose jump table does not start with `EA`, so a random `CD 3F` in compressed bytes does not count. On a packed file the scan is skipped on purpose: the compressed image will not contain a trustworthy table.

## PoR versus later games

Simeon's 2010 note treats the `int 3Fh` stub and the rewritten far jump as the scheme for the DOS Gold Box games, not only for Azure Bonds. PoR is the first of them, and the descriptor he published was recovered while porting Azure Bonds. Expect the same interrupt and the same jump opcode. Do not assume the 16-byte scratch area or the previous-stub link are identical until the unpacked PoR image is scanned. The tool prints every field it reads so a mismatch is obvious.

The ECL interpreter and the DAX loader are inside these overlays (in CotAB they ended up in the segments he numbered around the script runner and the file reader). Finding them is a search for the opcode dispatch: a jump table or a chain of comparisons on a byte just read from the script pointer at `DS:offset+8000h`. That search is the next REA session, and it wants the unpacked EXE plus `GAME.OVR` sliced by the stub table.

## STING mode is not supported

The original's debug start-up mode is selected by the command-line argument `STING`: the code compares `ParamStr(1)` with the string at `0899:0053`, and only on a match does it act on Ctrl-D (key 0x04, flips the debug flag at `0x49f7`; hit-point debug) and Ctrl-C (key 0x03, calls `0x8990`, quit). Guide research also credits it with Alt-X (win combat), J to train for free, and skipping the intro and copy protection.

The port never passes `STING`: it starts the original with an empty command tail (settled on issue #77). So the port ignores Ctrl-D and Ctrl-C exactly as the original does without the argument, and STING is not exposed in any mode. The J in the party menu's key set belongs to this mode and does nothing without it. Do not add a STING switch; `POR_DEV_COMBAT` (README) is the port's separate, local-testing aid.
