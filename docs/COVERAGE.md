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

Set `POR_RECORD_KEYS` to a new file path before a live run to capture its
scheduled and live BIOS keys with their guest instruction counts. Journal
commands stay on the host. Replay with `POR_BOOT_KEY_FILE` set to that file
and the same game data and initial save state. For a live replay, put
`POR_LIVE_AT` after the recorded keys to resume interactive input.

Live runs persist the DOS save bytes, discovered leads, and tracked quest
together for each slot A–J. Loading one switches journal state to that slot.
Each new save also includes the character, item, and spell companion files
written by DOS for that party. Older browser saves may lack these files.
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
selecting Begin Adventuring. In Add Character, **End** moves down a name,
**Home** moves up, and **A** adds the highlighted character. A live run added
all six, completed Rolf's tour, saved from Encamp, and loaded all six in a new
process before entering the Slums through the west gate.
From that save, the party reached the original kobold encounter and entered
combat with all six characters. A replay used Quick and manual Move/Attack
to beat the kobolds. The guest awarded 480 experience points per character.
After sharing the spoils, the party saved in slot B and all six characters
reloaded in the Slums. The journal transcript captured the Slums
greeting once, even when the interpreter decoded it again to skip the
conditional print. The council briefing still recorded the visible offers.

A controlled Slums replay loaded the six-character slot B and positioned the
party outside Ohlo's door at (14, 10), facing west. In the guest menus, the
party bashed the locked door, chose Talk, used the Nice approach, and accepted
the commission. No quest flags were seeded for Ohlo. The live journal showed
Fetch Ohlo's potion as accepted and directed the party to give Ohlo's name at
the Old Rope Guild booth. The party saved the accepted commission in slot C.

A second replay loaded slot C and began inside the Rope Guild at (15, 11),
facing south. The party reached the booth at (15, 12) via (14, 11) and
(14, 12), chose Speak, and entered Ohlo's name in the guest prompt. The
journal made returning the package and choosing Give the current objective.
The party saved the pickup in slot D. A third replay loaded slot D, started at
Ohlo's door, and chose Give in the original menu. The journal showed the
reward as pending while the guest treasure screen awarded 6,700 XP per
character. After the party shared the reward and exited the treasure menu,
the journal marked the quest turned in and recorded what happened when Ohlo
drank the potion. Checkpoint placement bypassed travel between the two
locations. The guest scripts set the quest flags in all three replays.

A controlled Podal Plaza replay seeded the auction commission in a copy of
the Slums save and redirected one saved movement event to the original area
transition. The game loaded Podal Plaza from its original DAX files. The
party disguised itself, walked into the auction, chose Stand and Listen, and
then Wait for Winner. The original script completed the investigation, and
the journal marked it ready to report with the witnessed wand exchange as
the detail to tell the council clerk. The party saved in slot C. A replay
loaded a copy of that slot with a redirected movement event to bring the
same party and auction result back to New Phlan. The party walked into the
clerk's office, received 2,500 experience points per character, and shared
the reward. The journal marked the commission turned in after the treasure
menu closed and kept the witnessed exchange in its notes. The controlled
transitions bypassed travel to and from Podal Plaza.

Two controlled Textile House replays used the same six-character save outside
the hobgoblin chief's room. The saved event skipped the fight after the
chief's dialogue and resumed at the iron box. The party chose Take It
Unopened in one replay and Open It in the other. The original script set
the resulting box state, and the live journal gave distinct directions for
bringing back the sealed box or returning to City Hall with the seal broken.
Both outcomes were saved and reloaded. Controlled transitions bypassed the
return trip. In the sealed-box branch, the Watch took the box and the party
walked from the gate to the clerk to collect the reward. In the opened-box
branch, Cadorna confronted the party at City Hall and the journal closed
the quest without payment.

A controlled Valjevo Castle replay used the original map and audience-hall
script with the assault already assigned and the two audience guards marked
defeated. The party stepped into the hall, heard Tyranthraxus's offer, and
selected Attack for all six votes. The translated combat opened against
Tyranthraxus at 80 HP and AC -4. The replay exercised combat input and enemy
turns through the original fight. An unmodified enemy defeated the
low-level party. A follow-up replay gave the party 100 HP per character,
raised its strength, and reduced Tyranthraxus to 1 HP in a disposable data
copy. The party won through the translated combat menus and received
7,340 experience points per character. The original script brought the
party back to New Phlan and the journal made reporting to the clerk the
current objective. The party walked to City Hall, collected its reward,
and saw the original campaign ending. The journal then read Phlan is free.
A second victory used the original Tyranthraxus record (80 HP, AC -4) and
a checkpoint party with edited character stats, including 127 HP per
character. The translated combat ran to victory, returned the party to
New Phlan, and played the clerk's ending after the party walked to City
Hall. The journal again read Phlan is free. This verifies the fight and
ending with the original enemy. A party trained by playing the campaign
through from a fresh start remains to be verified.

In live mode, a stalled player Quick action falls back to the original manual
combat menu. The runner restores the pre-Quick guest state and turns off Quick
for that character. If a hostile actor stalls, the runner restores its state
and returns through the original turn cleanup. The Sokal Keep courtyard replay
verified both paths, including control returning to a party member after an
enemy stall. With the original DAX files available, `npm run verify` checks all
20 journal definitions against dialogue extracted from the supplied ECL
scripts. It runs the translated ECL global setter to check the ready-to-report
and rewarded states for 15 objectives. These checks exercise the journal
against original script evidence. They do not run the quest scenarios.

A controlled Sokal Keep test set only the keep-clear flag using the original
ECL setter. From there, play through the original runner verified that the
harbor master offers new destinations as soon as the keep is cleared, and
that the journal waits for the clerk's reward flow to finish before marking
the commission turned in. This test bypassed the courtyard battle.

## Watchtower campaign-data proof

The original Watchtower scenario replaces ECL3 block 0 through
`POR_CAMPAIGN_DIR`. The translated runner mounted its DAX, executed the
opening script, displayed both choices in the guest menu, and produced the
distinct ferry response for each choice. To reproduce it, build the scenario
with `npm run campaign:watchtower`, use the fresh-party replay above with
`POR_CAMPAIGN_DIR=out/campaigns/watchtower` and `POR_ADVENTURE_LOG=1`, and
set `POR_LIVE_AT` to 160000000 and `POR_BOOT_STEPS` to 250000000. Enter
`l` or `r` at the live prompt. The guest dialogue appears in
`out/adventure-log.txt` when the run ends.
