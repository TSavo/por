# Translation coverage

A procedure counts as found when it starts with `push bp; mov bp, sp` (`55 89 E5` or `55 8B EC`).
Translated means `tools/tp_translate.py` emitted it with no unsupported instruction.
Verified means a test ran it and checked a result. The entry point at image `0x6` is translated in addition to the prologue count.

| Unit | Procedures | Translated | Verified |
| --- | ---: | ---: | ---: |
| START.EXE resident prologues | 211 | 212 (includes entry) | 1 (FillChar, `sys5bb_16b5`) |
| GAME.OVR slices | 758 | 758 | 1 (`ovl07_0000`, ECL operand fetch) |
| System unit, non-prologue | 12 | 12 | 1 (FillChar) |
| **Total prologues** | **969** | **969** | **2** |

| Slice | File offset | Found | Translated |
| --- | --- | ---: | ---: |
| 0 | 0x4 | 2 | 2 |
| 1 | 0x7b | 4 | 4 |
| 2 | 0x95d | 2 | 2 |
| 3 | 0xcf9 | 59 | 59 |
| 4 | 0x49ec | 12 | 12 |
| 5 | 0x59d0 | 12 | 12 |
| 6 | 0x70c6 | 5 | 5 |
| 7 | 0x78b0 | 30 | 30 |
| 8 | 0x9872 | 14 | 14 |
| 9 | 0xac12 | 15 | 15 |
| 10 | 0xc61d | 23 | 23 |
| 11 | 0xe6d4 | 2 | 2 |
| 12 | 0xee9e | 127 | 127 |
| 13 | 0x12a4e | 39 | 39 |
| 14 | 0x168e5 | 14 | 14 |
| 15 | 0x17aae | 23 | 23 |
| 16 | 0x19bd4 | 19 | 19 |
| 17 | 0x1e202 | 14 | 14 |
| 18 | 0x2084b | 4 | 4 |
| 19 | 0x211e9 | 21 | 21 |
| 20 | 0x23f65 | 15 | 15 |
| 21 | 0x24dce | 22 | 22 |
| 22 | 0x271ac | 74 | 74 |
| 23 | 0x2abd0 | 5 | 5 |
| 24 | 0x2b028 | 24 | 24 |
| 25 | 0x2ca0f | 52 | 52 |
| 26 | 0x2fc66 | 16 | 16 |
| 27 | 0x3094b | 6 | 6 |
| 28 | 0x30c19 | 3 | 3 |
| 29 | 0x30eb9 | 10 | 10 |
| 30 | 0x316af | 13 | 13 |
| 31 | 0x3292e | 8 | 8 |
| 32 | 0x3351e | 23 | 23 |
| 33 | 0x34838 | 6 | 6 |
| 34 | 0x34ef0 | 1 | 1 |
| 35 | 0x34ef7 | 3 | 3 |
| 36 | 0x351dd | 20 | 20 |
| 37 | 0x37cd8 | 16 | 16 |

`src/runtime/overlay.ts` is the int 3Fh behaviour: the word after `CD 3F` is the procedure offset, the header at that segment names the slice, and the procedure runs with CS equal to the segment the slice's code was copied into. `src/runtime/dos.ts` answers the System unit's int 21h calls.

The translated entry draws the title through planar EGA, creates a dwarf fighter, saves and adds him to the party, and reaches Phlan via Begin Adventuring. The fresh start loads `ECL3.DAX`, `GEO3.DAX`, `WALLDEF3.DAX`, `8X8D3.DAX`, and `SPRIT3.DAX`. The opening council greeting names Phlan on screen. A separate smoke run with the supplied `SAVGAMA.DAT` loaded slot A and moved west from (15,4) to (14,4). These manual checks are separate from the procedure counts above.

To replay the fresh start with the original game data:

```powershell
$env:POR_BOOT_STEPS = '122000000'
$env:POR_BOOT_KEYS = '31000000:1c0d,45000000:2e63,52000000:1c0d,56000000:1c0d,58000000:1c0d,60000000:1c0d,62000000:1c0d,64000000:1579,69000000:2d58,69100000:1245,69200000:1f53,69300000:1454,69400000:1c0d,72000000:256b,75000000:1265,78000000:1579,82000000:1e61,86000000:1c0d,90000000:1265,93000000:3062,115000000:1c0d,118000000:1c0d'
npx tsx tools/boot-translated.ts
```

To replay the save-based smoke run, use a disposable copy of the game data with the supplied `SAVGAMA.DAT` placed in its `SAVE` directory. Point `POR_GAMEDATA` to that copy and run:

```powershell
$env:POR_BOOT_STEPS = '65000000'
$env:POR_BOOT_KEYS = '31000000:1c0d,45000000:266c,52000000:1e61,62000000:4800'
npx tsx tools/boot-translated.ts
```

The harness writes the entry-point capture to `out/por-boot.png`. Replay-only runs keep save writes in memory.

Set `POR_ADVENTURE_LOG=1` to export observed ECL dialogue and discovered leads to
`out/adventure-log.txt` and `out/adventure-journal.json`. The runner also
composes the journal panel over the final game frame in
`out/adventure-journal.png`. The fresh-start replay
shows zero leads at the initial greeting. To witness both leads during Rolf's
tour, extend that replay:

```powershell
$env:POR_ADVENTURE_LOG = '1'
$env:POR_BOOT_STEPS = '500000000'
$env:POR_BOOT_KEYS += ',180000000:1c0d,260000000:1579,350000000:1c0d,430000000:1c0d'
npx tsx tools/boot-translated.ts
```

For live control after that replay, keep the keys above and raise the
instruction budget. The first eligible BIOS keyboard call at or after
`POR_LIVE_AT` pauses the guest and prompts for a command:

```powershell
$env:POR_BOOT_STEPS = '530000000'
$env:POR_LIVE_AT = '500000000'
npx tsx tools/boot-translated.ts
```

The translated Encamp menu includes **Journal**. Press `j` while camped to
select it through the guest menu. Closing the journal returns to the camp menu.
Outside camp, `j` opens it as a shortcut. The runner prints its
leads and updates `out/por-live.png` with the current game or journal frame.
While the journal is open, type `track N` to follow a numbered objective.
Enter a game key by name or use `key j` to send J to DOS. Type `:quit` to end
the session. Clear `POR_LIVE_AT` to return to replay-only mode.

Live runs persist the DOS save bytes, discovered leads, and tracked quest
together for each slot A–J. Loading one switches journal state to that slot.
Set `POR_SAVE_DIR` to select the save directory. An existing
`POR_JOURNAL_PROFILE` can seed the initial journal before any slot is loaded.

### First council briefing replay

After setting the original fresh-start keys above, append the following
sequence instead of the shorter tour extension. The replay walks from the tour
to City Hall, records the posted proclamations, and hears the first three
commissions.

```powershell
$env:POR_ADVENTURE_LOG = '1'
$env:POR_BOOT_STEPS = '1600000000'
$env:POR_BOOT_KEYS += ',180000000:1c0d,260000000:1579,350000000:1c0d,430000000:1c0d,530000000:1c0d,610000000:1c0d,690000000:1c0d,750000000:1c0d,805000000:4d00,810000000:4d00,815000000:4800,820000000:4800,825000000:4800,830000000:4800,855000000:1c0d,875000000:4800,905000000:1c0d,940000000:4800,970000000:1c0d,1010000000:4800,1070000000:1c0d,1140000000:1c0d,1200000000:1579,1240000000:5000,1270000000:4b00,1300000000:4800,1350000000:1c0d,1390000000:1c0d,1460000000:1c0d,1530000000:1c0d'
npx tsx tools/boot-translated.ts
```

The journal should show Clear the Slums as the current objective, with Sokal
Keep and the recovery of historical records also offered.

Set `POR_PREGEN_PARTY=1` to list the six characters supplied with the DOS
release in Add Character to Party. The runner stages their original character,
item, and spell records in guest memory. Add them from the original menu before
selecting Begin Adventuring.

In live mode, a stalled player Quick action falls back to the original manual
combat menu. The runner restores the pre-Quick guest state and turns off Quick
for that character. If a hostile actor stalls, the runner restores its state
and returns through the original turn cleanup. The Sokal Keep courtyard replay
verified both paths, including control returning to a party member after an
enemy stall. The automated check also runs the original translated ECL global
setter to verify how the journal interprets the keep-clear and reward flags.

A controlled Sokal Keep test set only the keep-clear flag using the original
ECL setter. From there, play through the original runner verified that the
harbor master offers new destinations as soon as the keep is cleared, and
that the journal waits for the clerk's reward flow to finish before marking
the commission turned in. This test bypassed the courtyard battle.
