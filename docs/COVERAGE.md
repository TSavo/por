# Translation coverage

Combat verification on the current runtime runs every translated turn.
Commit `4fcc70e` removed the earlier Quick rollback and turn skipping.
References below to the former watchdog and its environment variables
describe historical replay diagnostics. Current replays use the standard
runtime and verify the guest's battle outcome directly.

A procedure counts as found when it starts with `push bp; mov bp, sp`, or when a translated procedure calls it directly.
Compiled Pascal encodes the prologue as `55 89 E5`. The assembler-written library units encode it as `55 8B EC`.
Translated means `tools/tp_translate.py` emitted it with no unsupported instruction.
Verified means a test ran it alone and checked the bytes it wrote. The entry point at image `0x6` is translated in addition to the procedure count.

| Unit | Procedures | Translated | Verified |
| --- | ---: | ---: | ---: |
| START.EXE resident procedures | 230 | 231 (includes entry) | 1 (FillChar, `sys5bb_16b5`) |
| GAME.OVR slices | 758 | 758 | 1 (`ovl07_0000`, ECL operand fetch) |
| System unit, non-prologue | 12 | 12 | 1 (FillChar) |
| **Total procedures** | **988** | **988** | **2** |

Two checks keep this table true. `npm run verify` fails while any prologue in
`START.EXE` or `GAME.OVR` lacks a translated procedure. It finds 831
prologues: 73 resident and 758 in the overlays.
`npm run verify:translation-reproducible` regenerates the translation and
fails if `src/translated` differs from the generator. It needs Python with
capstone. Change the generator and run `npm run translate`. Do not edit
`src/translated`.

Translated instructions cover 212,293 of the 223,317 code bytes in the
overlay slices. The rest is string and set constants, apart from two
unreachable two-byte jumps. In `START.EXE`, the resident code runs from image
`0x1a10` to the data segment at `0x7400`. Its untranslated bytes are the
sound driver's tables and timer interrupt handler, which
`src/audio/original-driver.ts` decodes, and library routines that have no
prologue and no direct caller.

The generator keeps one deliberate deviation. `dec dx` at image `0x53d8`
counts milliseconds in `Crt.Delay`, and it is emitted without flags, so a
delay ends after one pass. The emulated BIOS tick is too fast for Crt's
calibration, which stores zero. With the flags restored, each millisecond
becomes a 65,536-pass loop and the recorded input tapes lose their timing.
The exception is named `CRT_DELAY_DEC_DX` in the generator.

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

The journal is drawn by the host. The original Camp menu is unchanged, and
the runner never writes the journal into the guest. Press `j` to open it, in
camp or while exploring. In the browser the page sends `j` as a journal
command only in Enhanced display. In Classic it sends the key to the game.
Closing the journal returns to the same game screen. The runner prints its
leads and updates `out/por-live.png` with the current game or journal frame.
While the journal is open, type `track N` to follow a numbered objective.
The original save and load menus accept `j` for slot J. Chrome verified
saving to J with the ordinary key, and the fresh-party replay verified
the saved journal and reward after reload. Use `key j` to send J to DOS
when the journal shortcut is active elsewhere. Type `:quit` to end
the session. Clear `POR_LIVE_AT` to return to replay-only mode.

Set `POR_RECORD_KEYS` to a new file path before a live run to capture its
scheduled and live BIOS keys with their guest instruction counts. Journal
commands stay on the host. Replay with `POR_BOOT_KEY_FILE` set to that file
and the same game data and initial save state. For a live replay, put
`POR_LIVE_AT` after the recorded keys to resume interactive input.

Live runs persist the DOS save bytes, discovered leads, and tracked quest
together for each slot AÃ¢â‚¬â€œJ. Loading one switches journal state to that slot.
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

Run `node tools/verify-fresh-party.mjs` with the original game data to
verify a six-character start from an empty host save directory. The replay
creates six dwarf fighters through the guest menus, adds them to the party,
completes Rolf's tour, and saves to slot A at the west gate. It checks the six
character companion files, starts a new runner, reloads the same slot, and
checks that all six arrive in the Slums at (15,4). The script prints the save
directory so campaign play can resume there. A second branch from slot A
walks from the west gate to the arms shop at (8,11), buys a hand axe and
chain mail for each fighter, readies both through View and Items, and saves
to slot B. A fresh runner loads B and verifies both items are still ready
in every character's inventory. The equipped party then walks back through
the west gate and saves in the Slums at (15,4), in slot C.
The replay reloads C, wins the kobold encounter through the original combat
menus, shares the coins, and saves to slot D. After reloading D it checks
that all six fighters are present and that Alda retained 5 XP and 11 copper.
The `kobolds` Chrome presentation replay checks the New Phlan gate and Slums
walk in WebGL, with the original tile inventory checked independently.
It measures the viewport and web fonts at narrow and wide browser sizes,
then checks the encounter art, combat sprite facings, and original menu colors.

Run `npm run verify:campaign-opening -- "PATH_TO_CHROME"` to exercise that
opening in Enhanced mode in headless Chrome. It starts with an empty save
directory and carries the guest-created saves between runner restarts. The
output directory contains the saves, guest input logs, and server output for
each leg. This route stops after the kobold victory and slot D reload.

A separate route from the Slums gate reaches the orc outpost at (13,1)
and wins through Quick without watchdog recovery. The treasure screen
awards 154 XP, and reloading confirms Enna has 169 total XP and the
two-spell clerical scroll. Three fighters are down at the end of this
replay. Run `node tools/verify-fresh-party.mjs --slums-orcs-checkpoint PATH_TO_SLOT_C`
with the six-fighter gate save.
From slot D, the fresh party walks around the blocked passages to Ohlo's
door, leaves two wandering encounters through the original Flee option,
bashes the lock, and accepts the commission through Talk and Nice. Slot E
reloads outside Ohlo's door with the journal still directing the party to
give his name at the Rope Guild booth. This route uses normal movement and
guest dialogue choices.
From E, the same party takes the street route to (6,10), hears the entrance
clue, and saves to F. Reloading F preserves the journal's direction to go
south. Entering the Guild adds the discovery and changes the active guidance
to approaching the booth on the east side from the west.
The party walks through the Guild maze, saves in slot G, then reloads and
reaches the booth through its west entrance. It chooses Speak and enters
OHLO to collect the package. Reloading slot H confirms that the journal
marks the potion ready to report and directs the party to return and choose
Give. The checkpoint reloads use the locations reached in normal play.
The party retraces the Guild maze and the streets from slots H and I,
re-enters Ohlo's room, and gives him the potion. The journal shows the reward
pending while the original treasure screen awards 691 XP per character.
After sharing the coins and closing the treasure menu, the party saves in
slot J. A fresh runner confirms the journal marks the commission turned in,
records what happened when Ohlo drank the potion, and shows Alda at 696 XP.
From that reward save, `node tools/verify-fresh-party.mjs --ohlo-armor-checkpoint PATH_TO_SLOT_J`
walks back to New Phlan, spends the earned money on banded mail and shields
for all six fighters, and reloads their improved Armor Class in slot B.
The tested checkpoint has a hand axe on Brin and chain mail on the full party.
Run `node tools/verify-fresh-party.mjs --slums-armored-patrols-checkpoint PATH_TO_SLOT_B`
using the upgraded save. The party reenters the Slums and wins two kobold
patrols and one orc patrol. With strict combat verification enabled no
watchdog intervenes. Reloading at (13,3) confirms Brin has 718 XP and Fenn
is down. From that save, the party wins the fixed orc outpost at (13,1)
with five fighters still standing and collects the scroll. Eight days of
rest in the cleared room restore all six fighters to full HP, including
Fenn. Reloading slot A verifies their HP and Enna's scroll and 889 XP.
Use `node tools/verify-fresh-party.mjs --fresh-armored-slums` with
`POR_REQUIRE_UNINTERRUPTED_COMBAT=1` to run those segments as one
playthrough from character creation. It uses one save directory for
the Ohlo reward, the armor purchases, and the Slums victories.
On the November 20 replay at `d76b56e5`, all six fighters equipped banded
mail and shields bought with Ohlo's reward. The replay then won three
Slums patrols and the fixed orc outpost through the original combat menus,
rested, and reloaded the same party in slot A.
Use `--fresh-sokal-reinforced` with the same strict setting to continue
with this party through the goblin room, sale of its enchanted armor,
recruitment at the arena, and the boat to Sokal Keep. The replay checks
manual sword and bow attacks in the courtyard, then reloads the landing
save and verifies the recruits' improved armor and prepared Hold Person.
From that equipped save, the same replay gives the wrong word, wins
the patrol fight, and gives the correct word to a later patrol. It then
wins the smithy fight, collects the hidden armory gear, and reloads.
The November 20 replay verified this path again from character creation
after restoring the campaign verifier's original startup input timing.
It reached the courtyard, verified Brin's manual mace attack, and reloaded
the landing after the party's defeat.
The same fresh-party run readies the recovered sword
on Alda, sails back to New Phlan, sells the armory jewel, and pays the
Temple of Tyr to raise and heal Brin. Slot G reloads with Brin at 6 HP
and the recovered mace readied. The party hears the council commission, reloads with
it tracked, returns to Thorn Island, and reaches the courtyard ambush.
At City Hall, the journal shows seven cleared Slums encounters for this
party. The replay tracks the Slums to verify that the objective shows the
count, then switches to Sokal. Reloading retains both the Slums count and
the selected Sokal objective.
The replay confirms the journal advances from the armory to battle
preparation, then uses the recovered mace against an adjacent orc.
After the party discovers the ambush, the tracked objective names the
landing and the Encamp menu commands for replenishing spent spells.
After the Curate's first automatic move, the replay continues to the
original defeat screen. It verifies that the landing save is byte-for-byte
identical and reloads with Brin alive and the council commission still
tracked. The unsaved ambush discovery and its preparation advice are
absent after reload.
In a separate trial from the same landing save, the Curate cast Bless
outside the courtyard and the spell appeared in the party's active magic
list. The blessed party still lost with Quick combat.
The `--sokal-tracked-ambush-checkpoint PATH_TO_SLOT_J --replenish-curate`
replay prepares two Hold Person spells by resting five hours at the
landing. The later departure moves the password prompts to `10,9 N`
and `10,6 N`. The watchdog previously interrupted this version at
overlay 31, `0x09ca`, during a call from overlay 25, `0x25e8`.
The watchdog now gives that attack-effect table loop a bounded allowance.
With `POR_REQUIRE_UNINTERRUPTED_COMBAT=1` and the default turn budget,
the party reaches defeat without intervention and reloads its unchanged
landing save.
To repeat only the continuation, use
`node tools/verify-fresh-party.mjs --sokal-armory-reinforcement-checkpoint PATH_TO_SLOT_E --equipped --return-to-courtyard`
with the original run's equipped armory save.
The resulting landing checkpoint also passed `sokal-courtyard --manual-party`
in the Chrome presentation verifier. It checked 56 patterns across 25 views,
the hobgoblin approach sprite, and Brin's selected combat icon and the
encounter-specific orc under the Aim cursor in both display modes.
The full `sokal-courtyard` replay also verifies all three standing and
strike poses, scrolling terrain, and switching modes during an attack.
The leader uses the existing enhanced Slums pair because both native
source records match byte for byte.
Run `node tools/verify-fresh-party.mjs --slums-goblin-checkpoint PATH_TO_SLOT_A`
from that rested save. The party bashes into the goblin training room at
(10,1), wins for 181 XP without watchdog recovery, and takes leather
armor and two short swords. Rest restores Brin. Cora and Dorn are dead
on their character sheets after the battle. Alda has 991 XP and keeps
one short sword readied after reloading slot C.
From slot C, `node tools/verify-fresh-party.mjs --slums-goblin-sale-checkpoint PATH_TO_SLOT_C`
trades and readies the second sword on Fenn and returns to New Phlan.
The party pools its money to identify the armor for 200 gold, sells the
Leather Armor +1 for 1,000 gold, and shares the proceeds. Slot D reloads
at the armorer with Alda holding 39 platinum and both swords readied.
Run `node tools/verify-fresh-party.mjs --sokal-reinforce-from-slums PATH_TO_SLOT_D`
from the armorer save. Enna buys and readies a long bow and arrows. The
party hires the Swordsman and Curate, sails to Sokal Keep, and reloads at
the landing. It then reads the parchment, passes the undead patrol, and
casts Bless before the eastern approach to the courtyard. Space interrupts
Quick on Alda's first manual turn. Alda targets an adjacent orc with his
sword and Enna targets a helpless hobgoblin three squares away with her
longbow. Strict verification reaches both attacks without intervention.
Add `--fight-to-end` to continue to the original defeat screen. This
replay previously exhausted the watchdog at overlay 31, `0x099c`, in
the same attack-effect routine as the prepared courtyard replay. The
bounded allowance now covers that routine for the same verified caller,
and the extended replay finishes without an intervention.
Alt+Q forwards the original DOS shortcut to resume automatic combat for
the party. The Sokal replay exercises it from Brin's manual menu, and the
Chrome replay verifies that the browser forwards the key in combat.
Space clears Quick for player characters. The translated loop at
`ovl08:04F3` skips actors whose type is at least 128. The hired Swordsman
and Curate have types 160 and 165 in the tested party, and the Curate
continues to take automatic turns after Brin clears Quick. The Sokal
journal explains this after the party learns about arena recruits and
witnesses the ambush. Prepare spells on a player character to choose
their targets in combat.
Continuing with Quick after either that shot or a shot at an orc archer
ended in defeat. The Quick-only opening and the two tested Curate
placements at the head of the party also ended in defeat.
Run `node tools/verify-fresh-party.mjs --sokal-equip-recruits-checkpoint PATH_TO_SLOT_J`
with the reinforced party's landing save. The party uses the original
inventory menus to trade Cora's banded mail and Dorn's shield to the
Swordsman and Cora's shield to the Curate. Reloading slot A verifies
the Swordsman at AC 3, the Curate at AC 2, and both of the Curate's
prepared Hold Person spells. Quick combat ended in defeat with either the
Swordsman alone or both recruits re-equipped. Neither replay logged a
watchdog intervention.
From J, the party walks back to New Phlan, hears the first council commissions
at City Hall, and follows the harbor master's directions to the pier. The
original boat transition lands all six on Thorn Island at (8,14). The replay
reuses slot A for this arrival and verifies that the council offer, island
arrival, and completed Ohlo commission survive reload.
At the gates, the party finds the clue pointing west to the reeds and
searches the elf's remains at (6,13). Reloading slot B retains the parchment
entry. The replay checks that the parchment appears after the search
and the pale figure stays hidden at this checkpoint. Chrome verified that
enhanced mode retains the original parchment rune shapes in the picture
area while rendering the instructions and party text with the web font.
From B, the party enters the keep, chooses Parlay and Nice when an undead
patrol approaches, and enters the word from the parchment. The patrol lets
the party pass. Slot C reloads at (10,10) with the new patrol note, and the
pale figure remains undisclosed at this checkpoint.
The objective remembers SHESTNI after the first patrol accepts it and
explains how to repeat it at later patrols. The journal verification
checks that it remains hidden while the party has only the parchment
or is still answering the patrol.

The reinforced party can also choose Combat at the first patrol. Run
`node tools/verify-fresh-party.mjs --sokal-patrol-victory-checkpoint PATH_TO_SLOT_J`
with `POR_REQUIRE_UNINTERRUPTED_COMBAT=1` from its Thorn Island landing save.
The original fight awards 40 XP each. Slot C reloads at (10,10) with the
parchment discovery and no password-passage entry. At the second patrol
the party must choose Parlay and say SHESTNI in full. The same party then
wins the smithy fight for 31 XP each, saves in the armory, and recovers
the equipment for 400 XP each. Reloading slot E retains the hidden armory
discoveries. This branch uses a landing save without a tracked Sokal
commission. The separate armory replay checks the tracked objective.

The November 20 strict replay continued the party created for the rested
Slums checkpoint. It cleared the goblin room,
sold the armor, recruited and sailed, then won the first island patrol
and the smithy before reloading with the hidden armory gear. Every
checkpoint in that chain was written by the original save menus.

Run `node tools/verify-fresh-party.mjs --sokal-armory-reinforcement-checkpoint PATH_TO_SLOT_E`
to continue with that party. Brin fell in the smithy. Alda takes and
readies the recovered longsword, and the fallen fighters' armor goes
to the Swordsman and Curate. The replay confirms those loadouts survive
reload, follows the original boat back to New Phlan, and checks the
Temple of Tyr's services. Alda sells a piece of jewelry for 5,279 gold
and pools the party's remaining coins. Brin receives Raise Dead for 5,500
gold and Cure Light Wounds for 100 gold. The party divides the remaining
coins, and Brin readies the recovered mace. Reloading slot G verifies his
6 HP, AC 1, constitution 11, mace, and 26 platinum. The replay presses the
original J key for Jewelry in the appraisal menu, where it now takes
precedence over the journal shortcut.

Run `node tools/verify-fresh-party.mjs --sokal-restored-council-checkpoint PATH_TO_SLOT_G`
to take the restored party from the temple to City Hall. The party hears
the Sokal commission from the clerk and selects it in the journal. Slot I
retains the tracked commission at the clerk. The original boat returns the
party to Thorn Island, and slot J retains the commission and the armory
discovery. Ferran remains undisclosed.
The November 20 run continued the same party through both of these
replays, including Brin's resurrection, the council briefing, and the
return to Thorn Island with the Sokal objective tracked.

Run `node tools/verify-fresh-party.mjs --sokal-tracked-ambush-checkpoint PATH_TO_SLOT_J`
with a landing save produced by that replay after the party has heard the
Temple of Tyr's offer. The verifier checks that the ambush stays hidden
at the landing, passes the undead, and opens the journal as the courtyard
force appears. The tracked objective then gives preparation advice and
points to the known temple for paid healing. Ferran remains undisclosed.
With `POR_REQUIRE_UNINTERRUPTED_COMBAT=1`, the same replay uses Space to
reach Brin's manual turn. Aim shows a wounded orc at range three, outside
the mace's reach. Brin moves east and southeast, then uses Aim and Target
at range one. The original combat hands the turn to the Curate without
watchdog intervention.
The November 20 continuation from the same fresh party passed those
checks. That courtyard attempt ended in a native defeat, and the landing
save still reloaded with the tracked commission and restored party.

Run `node tools/verify-fresh-party.mjs --sokal-recovered-courtyard-checkpoint PATH_TO_SLOT_G`
with `POR_REQUIRE_UNINTERRUPTED_COMBAT=1` to continue from the temple. The
party makes room for the Evoker using the original Encamp menu, hires him
at the arena, and reloads slot H with two Sleep spells in memory. It returns
to Thorn Island by boat, passes the patrols with the parchment word, and
reaches the Evoker's first turn in the courtyard with Brin in the roster. A
separate Quick-only run with that roster ended at the party-destroyed screen.

The same verifier accepts `--warrior-and-theurgist` after the slot G path.
This branch removes both fallen fighters through Encamp and recruits a
Warrior for one share and a Theurgist for four. Slot H reloads with the
Theurgist's two Sleep spells, Knock, and Stinking Cloud. The strict
replay reaches both recruits' opening turns and plays the courtyard
battle through to the original party-defeat screen. A previous replay
timed out at `05BB:16AB` in Turbo Pascal's Move, called by overlay 36
during a battlefield redraw. The watchdog now recognizes the drawing
overlay on the helper's far return stack and applies the same bounded
redraw allowance. The full replay completes without recovery.
From C, the party answers Yes when a second patrol asks for the password,
then explores the ruined smithy. It wins the frog encounter for 31 XP per
character. Alda falls to 0 HP during the fight. The party enters the old
armory and saves there at (14,5) in slot D. Reloading preserves the armory
discovery without revealing Ferran's clue about the hidden wall.
The party reloads D and walks through the apparent wall north of (15,2).
It follows the glow to the equipment stands at (12,0), earns 400 XP per
character, and takes the four items into Brin's inventory. Slot E reloads
at the stands with the journal discovery and the recovered equipment.
Run `node tools/verify-fresh-party.mjs --sokal-armory-checkpoint PATH_TO_SLOT_D`
to replay this route. The journal directs the party toward the observed
glow after crossing the wall. It adds the equipment lead when the party
sees the stands. Reloading E preserves the lead and the tracked Sokal
commission, with Ferran's identity still hidden.
The journal checks the original treasure flag before recording the cache
as opened. After it opens, the objective tells the party where to ready
any gear it took. The council replay also checks this guidance when
loading an older New Phlan save made after the armory visit.
The party then readies the shield and longsword on Brin and trades the
mace to Cora through the original inventory menu. The character sheets
show Brin at AC 1 with 1d8+1 weapon damage and Cora with 1d6+3 weapon
damage. Slot F reloads with those weapons and the shield still readied.
From F, the party retraces its route through Sokal Keep and takes the original
boat back to New Phlan. At the Temple of Tyr it pays 100 gold for Brin's
Cure Light Wounds. Reloading slot G verifies his 6 HP, the resulting
platinum balance, and his readied longsword.
From G, the party boards the boat back to Sokal Keep, gives the parchment
password to the undead patrol, and triggers the courtyard
ambush. The replay checks that Brin enters combat with his healed HP and
readied longsword. The original combat runs to the party-destroyed screen
after 302 inputs. Reloading G restores the party at the temple and Sokal
Keep remains outstanding in the journal.
From G, a separate branch visits the New Phlan arena, declines the duel,
and hires an evoker for two shares. The party saves at the arena and
reloading slot H verifies all seven party members and the evoker's two
memorized Sleep spells. The replay declines to lose a combat-only spell
outside battle and checks that both spells remain available. A separate
run from H returns to Sokal Keep and reaches the evoker's first turn in
the courtyard fight.

A fresh mixed-party replay creates five fighters and a human magic-user.
At the Slums gate, the magic-user selects Sleep from her spell book and
rests for four hours and fifteen minutes. The replay saves and reloads,
casts Sleep at a kobold through the combat targeting menu, and verifies
the party's victory and experience award. A second save and reload
preserves the experience and the spent spell slot. The magic-user then
memorizes Sleep again and rests to make it available for the next fight.
From the post-battle save, the same party buys and readies an axe and
chain mail for each fighter, hears the Sokal commission, and takes the
boat to Thorn Island. At the landing, the magic-user rests to prepare
Sleep. Reloading verifies the spell and the journal's commission and
arrival entries.
The mixed party then finds the parchment, passes an undead patrol with
its password, and enters the courtyard ambush. Pressing Space during
combat clears Quick for player characters. Mira's manual Cast menu
appears, and the replay selects Sleep and targets an orc. The battle
continues after the cast. Cora opens Done and chooses Bandage. Tracing
the translated action verified that it changes Alda's combat status
from dying to stable before the enemy turn resumes.
Chrome also verified that the physical keypad works with Num Lock on.
In the Textile House Move/Attack menu, Numpad 9 reached the original
diagonal attack prompt for an adjacent ally.
An alternate replay from the same island save passes a second patrol,
wins the smithy frog fight for 31 XP per character, and goes around the
east side of the keep to trigger the courtyard ambush from the north.
Alda reaches that entrance at 0 HP after the frog fight.

Set `POR_PREGEN_PARTY=1` to list the six characters supplied with the DOS
release in Add Character to Party. The runner stages their original character,
item, and spell records in guest memory. Add them from the original menu before
selecting Begin Adventuring. In Add Character, **End** moves down a name,
**Home** moves up, and **A** adds the highlighted character. A live run added
all six, completed Rolf's tour, saved from Encamp, and loaded all six in a new
process before entering the Slums through the west gate.
From that save, the party reached the original kobold encounter and entered
combat with all six characters. A replay used Quick and manual Move/Attack
to beat the kobolds. After the long-division fix, a replay from the same
six-character save reached the fight through the west gate again. The guest
displayed 8 experience points and shared 16 copper with each character.
The saved XP gains reflected the characters' class splits. All six reloaded
from slot B in the Slums. The earlier 480 XP result was from the faulty
division routine. The journal transcript captured the Slums
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
The controlled Chrome replays check that the 352×352 coffer illustration
fills the picture panel during the original choice and clears when either
option is selected. The battle bypass is local to the fixture.
Both outcomes were saved and reloaded. Controlled transitions bypassed the
return trip. In the sealed-box branch, the Watch took the box and the party
walked from the gate to the clerk to collect the reward. In the opened-box
branch, Cadorna confronted the party at City Hall and the journal closed
the quest without payment.

The `--textile-sealed-return-checkpoint` replay instead walks the complete
return route from slot D at (12,14) south. Its controlled checkpoint holds
the sealed box and has the courtyard victory flag set. The party leaves
through the west gate, takes the ferry at (20,29), hands the box to the
City Watch, and collects the council reward. The journal follows the
route from the gate to the boat offer, handoff, and turn-in.
Add `--train-after-reward` to continue from this controlled checkpoint
through the Temple of Tyr and the fighter school. The original menus sell
gems, pay the training fee, and advance Thrender Grone from level 1 to
level 2. Reloading slot F verifies 2,388 XP, 23 HP, 14 platinum, and the
journal entries for the Textile House turn-in and both eastern training
doors. The Chrome cleric and thief trainer replays check that each door's
directions appear only after the party hears that trainer's offer.
The training replay also checks that slot F drops the finished objective
from tracking and that reloading slot D still shows the accepted quest
before the City Watch handoff.
The `--textile-opened-return-checkpoint` variant starts from the equivalent
slot E with the broken seal. The same ferry route reaches City Hall, where
Cadorna confronts the party. Reloading slot F verifies that the commission
closed without payment and that no Watch handoff was recorded.

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
Hall. After the long-division fix, that same checkpoint beat the original
enemy again and the battle screen displayed 917 XP per character. The
party collected the final council reward and saved in slot C. Reloading
the slot and opening the journal still showed Phlan is free. This verifies
the fight and ending with the original enemy and the edited checkpoint
party. A party trained by playing the campaign through from a fresh
start remains to be verified.
Run `node tools/verify-fresh-party.mjs --castle-ending-checkpoint PATH_TO_SLOT_B`
with the prepared party outside the audience hall at `14,7 S`. The
replay verifies the original 80 HP opponent, the journal's directions
from New Phlan's west gate to City Hall, and the 67,500 XP council award.
It checks the journal's ready-to-report, reward-pending, and turned-in
states and the ending objective after reloading slot C. The defeat
entry appears only after the party witnesses the castle departure text
and remains in the journal after the final reward and reload.
The controlled replay then changes the tracked objective, saves through
Encamp to slot D, and reloads that slot. The journal retains both the
selection and the castle turn-in, and slot C remains byte-for-byte intact.
Switching slot D back to automatic tracking restores the **Phlan is free**
objective while retaining the castle turn-in.
Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_C PATH_TO_CHROME castle-ending`
with that completed save. Chrome reloads slot C, checks that the journal
displays **Phlan is free**, switches both presentation modes while the
journal is open, and returns to play with the save bytes unchanged.
The replay checks that focus enters the journal on Return to game and
returns to the game screen on close. With a remaining commission, it
also verifies that tracking the commission keeps focus on its button.
Resuming automatic tracking restores **Phlan is free**, preserves the
castle turn-in, and moves focus to Return to game.
Add `--save-at-west-gate` to the native ending replay to save slot D just
after the battle and return to New Phlan. Pass that slot to the Chrome
replay with `castle-ending --council-finale` to walk the journal's route,
verify the posted proclamations illustration and 1,573 enhanced tile
placements across 13 WebGL views, see the dedicated Phlan victory
illustration during the ending, and switch display modes. Chrome also
checks the 67,500 XP reward in the Enhanced web font, with a dedicated
4× illustration underneath the original reward text. Switching presentation
preserves the prompt. The journal directs the party to Share and Exit
while the reward is pending. The replay saves the turn-in
to slot C through the original menus. Reloading that browser-produced slot
C with `castle-ending` restores the completed journal objective.
The GOG 1.3 Chrome finale replay from the controlled west-gate fixture
also verifies the proclamation art at its 1.3 script cursor, the Council
speech and reward illustrations, and the saved turn-in. The initial
and later proclamation routes verify the same artwork and their own
journal entries on both DOS editions.
After the XP notice, the Council's final treasure menu shows a separate
gems and jewelry illustration. The shared Council routine selects it
only for the castle reward and the native treasure actions. Both DOS
editions passed the Chrome finale through Share, Exit, and the slot C
save, and GOG 1.3 reloaded that save with the completed objective.
The controlled west-gate fixture `out/fresh-party-lYc83O/D.json` also
passed both Chrome replays at `eb75918c`. Use the slot C path printed by
the finale replay for the cold reload.

A controlled training replay sent the six-character party to the schools
from a Slums save. It followed the posted directions north and entered the
east door for magic users. Darkstar had 5,000 XP and 250 platinum in the
checkpoint. The guest training menu raised her to level 2 and opened the
spell-learning menu. The character sheet still showed level 2 after saving
to slot C and reloading. The replay initially showed a spurious platinum
balance. Correcting the translated long-division loop restored the fee
calculation. The same checkpoint left Darkstar with 50 platinum plus
change, and the translated quotient now has a regression check.
Run `node tools/verify-fresh-party.mjs --mage-training-checkpoint PATH_TO_SLOT_B`
from the eligible Darkstar save at `14,7 S`. The replay selects Magic
Missile in the training menu and verifies it in Encamp's spell book
after saving and reloading slot C.
The replay verifies that the journal records the posted east-door clue
first, then adds the exact Train Character action after meeting the
magic-user trainer. The latter entry survives the slot C reload. The
replay walks south to the lodging at `6,12 W`, pays one platinum, and
rests for four hours and fifteen minutes. Slot D reloads with Magic
Missile in memory and Darkstar at 49 platinum. The journal records the
lodging after the party hears the offer.

The fighter school replay follows the posted directions east past the
arena, reads the sign on the north door, and hears the fighter trainer's
offer at `8,0 N`. The journal adds the exact route and menu action after
the offer. Saving in slot H and reloading preserves that discovery.
Run `node tools/verify-fresh-party.mjs --fighter-training-journal-checkpoint PATH_TO_SLOT_A`
with the New Phlan save from the Cadorna commission replay.

The Podal checkpoint replay also takes Alda through the New Phlan arena
duel. The original reward screen awards the duelist 100 XP, and reloading
shows Alda at 1,621 XP and 1 HP. This duel used normal game inputs and
finished without watchdog recovery.

Run `node tools/verify-fresh-party.mjs --sokal-restored-arena-checkpoint PATH_TO_SLOT_G`
to take the recovered Sokal party from the Temple of Tyr to the arena.
The selection initially rests on the Curate, whom the arena master will
refuse. Select Alda, fight with the recovered longsword, and decline to
continue when the duel ends. Reloading slot H confirms Alda at level 1
with 1,562 earned XP. Returning to the arena from the west after that
reload did not offer another duel in the tested route.
The fighter trainer checks the selected character's funds before
checking experience. The replay attempts to train Alda with 27 platinum
and one gold and verifies that his level, XP, and coins are unchanged.
The journal captures the original 1,000 gold quote even though the
trainer clears it before the next input prompt. Slot I reloads with
the learned fee.

The compiled runtime now updates the arithmetic flags for 333 more
register `INC` and `DEC` instructions while preserving carry. The
resident `DEC DX` at image `0x53d8` still uses the existing delay
behavior. Restoring its flags in isolation shifts startup input timing
enough that the fresh-character replay selects Exit to DOS.
Use `npm run translate -- --output out/translation-check` to inspect
the generator output while the runtime and replay timing are reconciled.
An isolated replay with only the resident `DEC DX` flag update found a
blank frame at the old 24-million-instruction startup gate and the
publisher splash at 32 million. Advancing at 32 million still produced
another publisher frame before the title. The shipped runtime passed the
publisher, title, and credits replay and the character creation portrait
replay with their current timing.
The failure after character creation with the isolated flag correction
reached `0512:53E1` in the calibrated delay loop. A direct run of the
translated calibration loop at 16 instructions per BIOS tick counted
five iterations. The original division by 55 gives zero, so the later
`LOOP` instruction with CX initially zero wraps to 65,535. In an
isolated run at 256 instructions per BIOS tick, calibration counted
85 iterations and stored one. With the corrected flags, that cadence
allowed character creation, the Phlan tour, and the first save. The
Diogenes Chrome replay timed out after Enter with the experimental cadence.
With the flag changes, the strict fresh-party replay won the Slums and
Sokal patrol fights and recovered the hidden equipment. The strict
controlled castle replay still defeated the original Tyranthraxus and
reloaded the council ending. The funded-training checkpoint also passed.

The separate `--sokal-funded-training-checkpoint PATH_TO_SLOT_F` replay
takes the armed party back from the hidden armory and sells its jewel.
Withdrawing 200 platinum gives Alda exactly 200 and leaves 1,076 in
the pool. The translated Turbo Pascal `Val` now updates the zero flag
on `DEC SI`, so the sign check reads the sign marker correctly.
Pooling and sharing gives Alda 213 platinum. With that amount the
original trainer rejects the 1,462-XP fighter for insufficient
experience. The replay verifies that he keeps the coins, and slot I
reloads with the experience refusal recorded in the journal.

The fresh-party verifier stops feeding Quick inputs when the Sokal
courtyard defeat screen appears, so it can reload the earlier save
instead of acknowledging the defeat and exiting to DOS. The resumed
replay hires an Evoker, confirms his two Sleep spells after reload, and
reaches his first courtyard combat turn without watchdog recovery.
With `--evoker-fight-to-end`, the recovered-courtyard checkpoint continues
that party's attempt to defeat. A strict run reaches the original defeat
screen and reloads Brin and the Evoker with both Sleep spells restored.
For comparison with the DOS executable, `npx tsx tools/export-dos-save.ts
PATH_TO_BROWSER_SAVE_DIRECTORY J` emits the main save and its party files
to a new `SAVE` folder under `out`. The Sokal landing export verified all
23 files byte-for-byte. Loading those raw files in the translated runner
with an empty host save directory restored the expected party at the
landing. A matching run in the original executable is still pending.
In a separate branch from the same temple save, the party hires the
Curate and Theurgist and reloads with both recruits. They take the boat
to Sokal Keep, pass the undead patrol using the parchment password, and
reach the eastern hall at `10,6`. The Curate casts Bless there, and the
original Magic display confirms the buff on the fighters. Alda remains dead
in this branch.
Reloading the reinforced landing also lets the party pass the second
patrol, win the smithy frog fight, and reach the northern courtyard at
`8,4` after casting Bless one square before the entrance. The strict
checkpoint replay verifies that approach. The original Quick watchdog
interrupted two redraws in overlay 36 at `14BE` and `154E`. The default
watchdog now extends its deadline during redraws in overlays 36 and 37,
up to the same hard cap as the calibrated delay. With that change, the
replay matched the frames from the explicit 20-million-instruction
diagnostic through 700 Quick inputs. Continuing with Quick reaches the
game's party-defeat screen without watchdog recovery. The fresh-party
verification checks that outcome for the northern approach with both
recruits and Bless.
From slot D after defeating the smithy frogs, a separate replay searches
the ruined smithy at (15,6), takes the hammer for 80 XP per character,
and readies it on Fenn. Reloading verifies his readied hammer and the
journal discovery, which was hidden before the search. Run
`node tools/verify-fresh-party.mjs --sokal-smithy-checkpoint PATH_TO_SLOT_D`
to repeat the detour without replacing the main route's saves.
On the mixed-party route through the smithy, Mira enters the courtyard
from the north. The replay verifies that Aim lets her cycle to a
hobgoblin without offering Target. Trying Target there leaves Sleep
selected. Cycling back to the preceding orc restores Target and casts
the spell. The tested northern openings have yet to produce a victory.
The arena replay also verifies that the offer of adventuring partners
stays in the journal after reloading. The courtyard guidance names the
arena master once the party has heard that offer. A separate approach
with the Swordsman and Warrior from the arena reached the courtyard at
`8,5 W` and ended in defeat on Quick.

The Podal Plaza approach from the disguised slot I checkpoint displayed
48 individual 32×32 tiles in 1,452 placements across 12 walk and turn views.
The same Chrome replay checked the auction portrait and save preservation
when switching modes. Separate Chrome replays checked the fighter trainer's
352×352 dialogue portrait and both 96×96 Slums goblin standing poses.
Repeat the plaza check with `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_I PATH_TO_CHROME podal-plaza`
from the disguised party at `0,4 W`. The `fighter-trainer` route starts at the
New Phlan west gate in slot A and checks both the arena master's duel prompt
and the fighter trainer's dialogue, including switches at both prompts.

The `podal-infirmary` Chrome replay uses a controlled slot I at `0,15 E`.
It walks into the hidden infirmary and identifies the original picture from
the exact `HEAD1.DAX:48` and `BODY1.DAX:25` pixels. It verifies the new
352×352 healer portrait, mode switching at the healing question, and the
portrait closing on No. The `podal-infirmary-heal` replay chooses Yes and
checks that the same Enhanced portrait stays visible on the service menu
and returns after switching through Classic. Both replays check that the
journal records the infirmary only once the party hears the offer of healing.

A separate Chrome replay took the Podal auction branch that follows the
plainclothes man. The journal only recorded Garwin's escape after the
auctioneer named him. Saving through the original Encamp menu after
the crowd dispersed and loading that slot in a new browser session
preserved the lead.

The `podal-shrine` Chrome replay starts from a controlled slot I at
`12,8 E` and greets the recruiter at `14,8 E`. It checks the
352×352 recruiter portrait and switches modes during the invitation.
It checks that the temple direction appears only after the recruiter
mentions it, and that the two-hour meeting appears only after accepting.
The replacement is scoped to area 18 because the original orc picture
also appears in another archive with identical pixels.
The `podal-shrine-return` replay loads a save made after accepting, with
only the saved hour advanced from 18 to 21 to reach the meeting window.
It verifies that an older journal entry can be tracked on reload and
closes when the party witnesses the ambush.

The `bane-gate` and `bane-goblins` Chrome replays use controlled
positions from the temple-district save. At the gate the journal records
the inspection, then the guards turning hostile when the party submits
without a symbol. Inside, choosing Let Them Go reveals the holy-symbol
requirement and updates the tracked Temple of Tyr objective.
Once the party also hears the Podal shrine recruiter's directions, the
Temple of Tyr objective names the entrance northeast of Podal Plaza.
The entrance direction stays hidden until the recruiter gives it.
The goblin dialogue also checks the separate 352×352 captive scene and
switches modes at the original Kill Them / Let Them Go prompt. The
replacement uses the shared source picture only in the temple interior.
The same replay checks 25 individual 32×32 tiles over 13 views near the
captive room, including the slate ceiling, masonry joints, and oak door.
At the encounter, it verifies that the enhanced goblin sprite draws
over the same 121 tiles as the preceding view.
It turns through all four directions, reaches the room, and walks back
into the corridor after releasing the captives.
The `bane-symbol` replay loads a controlled gate save carrying the
original leather symbol item record and the witnessed goblin clue. The
journal sees the symbol in the live inventory, recommends Let Him Touch
You during the inspection, and switches to entering the temple after the
guard admits the party.
The gate replays also verify the original 352×352 gatekeeper illustration
and switch modes during the inspection. The shared source picture
selects separate Enhanced art in the temple district and in Podal Plaza.
The `bane-symbol` replay also turns through all four directions at
`1,7 E` and walks up to the gate. Chrome verifies 49 individual 32×32
replacements across eight views, with all 121 cells covered in each.
The gatekeeper's separate 160×320 approach sprite uses the original
`SPRIT1.DAX:4:0:0` anchor. Chrome checks that all 121 scenery placements
stay identical when the sprite appears, and switches modes before the
inspection opens.
The `bane-altar` replay starts from an admitted party moved to the
adjacent aisle. It walks up to the altar, chooses Destroy Altar, and
checks that the journal points to the half-orc cleric as the fight
begins. It verifies all 121 tiles through eight views, including the
Destroy Altar prompt, with 30 new patterns and 14 shared with the gate
approach. A translation check covers the original victory flag and the
dispatch for journal entry 25. The Chrome replay continues into combat
and switches modes with the cleric's original 96×96 ready stance on the
grid. The separately exported strike is verified through the combat
matcher, with its live animation still to be captured.
From the same checkpoint, `bane-sanctuary` checks the side-hall route in
Chrome. Its 23 views cover 2,783 placements across 69 patterns, including
31 new 32×32 tiles. Switching presentation preserves the save.
The `bane-north-court` replay walks the exterior courtyard from the gate
checkpoint in slot A. Chrome checks all 2,904 placements across 24 views,
including 19 new 32×32 tiles and openings that show the dynamic sky.
The separate `bane-reward` replay loads a controlled City Hall checkpoint
with the victory flag and dispatch recorded. It verifies the clerk's
permission to keep the temple treasure, the journal transition after
acknowledging the report, and the saved completion state. A fresh browser
session reloaded that save and confirmed the settled commission and
journal entry 25.
The Slums infantry and Textile House priestess share a guest image pattern.
Area-scoped overrides keep their new artwork distinct, verified live in both fights.

The enhanced Textile House environment has 166 individual 32×32 PNGs
for the traced courtyard approach, west wing, and temple corridors.
From the native slot I save, the east approach checks 2,299 placements
across 19 views. Both temple entrances show the same script-scoped
Grishnak sprite and enhanced portrait.
Run the browser verifier with `textile-approach` (slot B inside the entrance),
`textile-wing` (slot J after the courtyard fight), or `textile-temple`
(slot I outside Grishnak's temple at `2,13 N`).

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_I PATH_TO_CHROME textile-altar`
with a checkpoint outside Grishnak's temple at `2,13 N`. The replay checks
the 352×352 altar portrait, the selected 96×96 priestess sprite, the captains'
movement, and the captain's strike during browser animation playback. It
also switches presentation in the dialogue and combat.

Stojanow Gate has 47 individual 32×32 terrain replacements. Chrome checked
4,719 placements across 39 views from slot A at `4,15 N`, reached by
ordinary travel from Podal Plaza. The three route endings check a
separate 96×292 bugbear sprite over the same 121 placements as the preceding
clean view. A separate replay from the same save verified the enhanced bugbear
standing and sword strike poses. The New Phlan armorer portrait appeared at
the shop greeting and Buy menu. Both replays checked presentation switches.
The browser verifier exposes `stojanow-gate`, `stojanow-west`,
`stojanow-east`, and `stojanow-bugbears` for the gate entrance save.
The `stojanow-wall-warning` replay from that save verifies the tower
warning, the bugbear confrontation, and the decision to take the punch.
The 352×352 warning illustration shows the tower guard above the gate.
Chrome checks that it clears on the next step and that all three bugbear
approach distances play over WebGL.
The journal records each event only after the party sees it. The route
checks the confrontation portrait and the separate dismissal illustration,
then confirms the return to WebGL scenery and the original 121-tile
inventory when the party moves away and after a cold reload. The Attack
replay takes the party into combat instead.
The original approach draws far, middle, and near bugbear sprites in
that order. Chrome checks all three Enhanced assets at (56,32), each
over the complete scenery layer, before the confrontation portrait.
It saves the outcome to slot B through Encamp. Use the printed slot B
path with `stojanow-wall-warning-reload` to verify that all three clues
and the Enhanced view return after loading. The original slot A remains
byte-for-byte intact.
The `stojanow-trader` route uses a controlled daylight slot B at `4,15 N`.
GOG 1.3 Chrome checks the passing wagon, the trader's first 250-gold offer
and its picture, then the final offer and the return to exploration after
leaving the deal. Use `armorer` with slot A at the New Phlan west gate
(`0,4 W`).


The Zhentil journal follows the packet seal instructions, mounted patrol,
commandant handoff, quarters, ambush, and escape. The translation verifier
uses the original ECL text for each discovery and exercises acceptance
through the translated setter. The `zhentil-envoy` Chrome replay uses
controlled slot A in the western overland sector with the commission
acceptance flag set and the party positioned near the mounted patrol.
It follows the original escort, paper handoff, tour, dinner, and nighttime
ambush. It checks that the journal unlocks each discovery in order and the
new 352×352 commandant portrait survives mode switching during the handoff.
The assigned-quarters illustration appears when the escort dismisses the
party at its room. The replay checks that it fills the picture panel,
clears on the first step, and leaves the original dinner and ambush
sequence playable.
The `zhentil-envoy` replay also checks the mounted patrol illustration at the
initial diplomatic challenge. `zhentil-trespass` uses a controlled slot A with
the envoy flag cleared and checks the same illustration at the Stay / Leave
warning. Both replays check mode switching in the patrol scene.
The translation verifier checks that escape flag 253 leaves the commission
accepted. The western overland script advances it to 254, the value the
council reward scan is looking for. The
`zhentil-escape` Chrome replay uses the yard fixture with an accepted
commission journal entry. It walks to the climbable wall at `1,7 S`,
tracks the commission, climbs the wall, and checks that the journal
records the escape and directs the party to the clerk after the original
overland transition. It also saves in slot A and checks that the escape
discovery and report objective were written. The separate
`zhentil-return` replay loads the slot A save printed by `zhentil-escape`.
It crosses the western overland sectors, takes the boat at `20,29 S`,
walks to City Hall, and collects the earlier Podal Plaza reward followed
by the Zhentil reward in the same clerk visit. Chrome verified the
reloaded escape discovery and the final turned-in status.
The isolated
`zhentil-reward` Chrome replay starts
from controlled slot A at the clerk with flag 254 and the accepted journal
entry. The live clerk script awards 12,750 XP per character. The replay
checks that the journal goes from ready to report to reward pending and
marks the commission turned in after closing the reward menu.

Zhentil's quarters and outer yard have 51 individual 32×32 terrain
replacements. The `zhentil-quarter` replay starts from a save made after
the original escort. The `zhentil-yard` replay uses a copy with the guest
restriction flag changed to allow movement into the outer yard. Chrome
checked 2,783 tile placements across 23 frames using the default upgrade
pack and verified that both presentation switches preserved the save.
Visual review of the Chrome captures also checked the ceiling, masonry,
door edges, yard path, palisade and sky across the two routes. The review
caught a repeating ceiling stripe and inconsistent masonry where indoor
tiles met shared tiles. The replacement PNGs were revised and recaptured
at the game's displayed size.
The presentation switch checks measure the rendered game in Chrome.
Classic uses its native 320×200 image at 8:5 and Enhanced displays at
4:3. The quarter, commandant, and wolf replays cover the switch in
exploration, dialogue, and combat.

The Valhingen journal now uses witnessed clues for the lair, stairs, vampire
escape, and northern wall. The original ECL text and completion flag are
covered by the translation verifier. The vampire browser replay verifies
that the stairs clue appears only after the party sees the stairs.
The `valhingen-crypt-scroll` replay approaches the black marble crypt at
`12,4 E` from slot A. Chrome checks the full-panel illustration at discovery,
at the reading prompt, and at the Entry 43 confirmation when the party
reads the scroll. The default and `--decline` variants both sanctify the
coffin and save through Encamp. Use the printed save path with
`valhingen-crypt-scroll-reload` and the same option. Chrome verifies that
both saves retain sanctification and only the Read save retains Entry 43.

Old Phlan's northern gate has 56 individual 32×32 terrain assets. The
`north-gate-rampart`, `north-gate-quarter`, and `north-gate-houses` routes use
slot A at `4,0 S`, reached by ordinary overland travel. Chrome verified 5,929
placements in 49 frames, including opening and crossing a house doorway.
The `stojanow-briefing` browser route uses a controlled slot B at `5,8 N`
to verify Urslingen's 352×352 mission portrait and a state-preserving switch.
The `stojanow-riverwalk` replay starts from the native entrance save at
`4,15 N`. Chrome checks 1,573 placements across 13 views, including 20
new 32×32 tiles for the river rails, stonework, and covered doorway.
The `stojanow-tower-ettin` replay starts at `4,8 N` in controlled slot A.
Chrome checks both 96×192 combat frames and the reflected club swing.
The `stojanow-trader-no-money` Chrome replay on GOG 1.3 starts from the
wagon checkpoint in slot B at `4,15 N` with the party's coins set to zero.
The party tries to buy the wagon and sees the original insufficient-funds
notice. It then sees the merchant drive off with his wagon. The separate
`stojanow-wagon-handover` replay checks the successful purchase artwork.
The `stojanow-merchant-gate` Chrome replay starts from a controlled slot A
at `4,13 N` before 05:00. On GOG 1.3 it verifies the two original approach
illustrations, then uses Look to see the merchant hand something to the
bugbears as the gate opens. Dismissing the scene returns to exploration.
The `stojanow-imposters` Chrome replay on GOG 1.3 starts from the wagon
checkpoint in slot B at `4,15 N` with the gate already suspicious. It
verifies the guards detecting the wagon disguise and demanding surrender,
then checks the separate confiscation scene and the party's relocation.
The `stojanow-toll-refused` Chrome replay starts from the controlled wagon
checkpoint in slot B at `4,15 N`. The party buys the wagon and declines
the bugbear's 15-gold toll. GOG 1.3 shows the guard turning the party away
at the closed gate and returns to WebGL when the party walks on.
The `stojanow-tower-arrow-volley` Chrome replay on GOG 1.3 starts from the
controlled wagon checkpoint in slot B at `4,15 N` with the tower on alert.
It shows the two arrows from the slits, then checks the native damage
report and return to WebGL exploration along the approach road.
The `stojanow-gate-rocks` Chrome replay starts from a controlled slot A at
`8,8 N` near the closed gate. On GOG 1.3 it checks the falling-rock
illustration and original prompt, followed by damage reports and the
return to WebGL exploration outside the closed gate.
The `stojanow-gate-reward` replay starts in the City Hall district with
Stojanow Gate ready to report. GOG 1.3 Chrome checks the clerk's illustrated
assault directions, the 22,000 XP award, and the turned-in state saved
after Share and Exit.
The harbor master shares his original composite. `phlan-harbor-sokal` and
`phlan-harbor-routes` verify New Phlan's area-scoped portrait with the initial
Sokal passage and the later ferry menu. The Urslingen replay still verifies
his portrait at Stojanow Gate with both images installed.
The `phlan-priestess-joy` replay starts from controlled slot A at the
Temple of Sune. It checks her 352×352 portrait through the healing menu
and verifies that the journal learns about the service after her greeting.

Valhingen Graveyard now has 108 individual 32×32 scenery tiles for its
entrance routes. The slot A checkpoint at `0,4 E` was reached by traveling
overland after Podal Plaza. Three Chrome replays walked south, east, and north
from that checkpoint and verified 1,936 placements in 16 static views and
state-preserving mode switches. The `graveyard-south`, `graveyard-east`, and `graveyard-north` browser replays
now check all 19 views, including one skeleton approach per route. The
160×320 skeleton PNG is drawn over the underlying tiles as a separate actor.
The `graveyard-mystic` replay starts at `8,10 N` in controlled slot B with
the graveyard encounter counter set to 3 and verifies the mystic portrait
and a state-preserving switch in dialogue.
The `graveyard-mystic-combat` replay uses the same controlled slot B, takes
the hostile branch, and checks the 96×96 ready pose and reflected strike.
The `graveyard-crypt-path` replay starts in controlled slot A at `10,3 E`.
It checks 3,146 tile placements across 26 views of the crypt paths, including
96 new 32×32 tiles among 146 patterns, and preserves the save when switching modes.
Set `POR_WRITE_ENVIRONMENT_TRACE=1` on any presentation replay that walks an
environment route to export `environment-tiles.jsonl` in its output directory.
Pass that file to `tools/art-inventory.ts` to link the captured tile patterns
to the classic and enhanced previews.
The `graveyard-giant-skeleton` replay starts at `7,7 N` in controlled slot A.
Chrome checks both 96×192 poses over the original 24×48 footprint, including
the animated strike, and verifies that changing presentation preserves the save.
The `graveyard-wraith` replay starts at `14,8 E` in controlled slot A and
checks the 96×96 standing and reflected strike frames in the Paladin Crypt.
The `graveyard-wight` replay starts in controlled slot A at `15,7 S` and
checks the 96×96 standing pose and animated claw strike in the tower fight.
The `graveyard-ghoul` replay loads the Valhingen entrance save in slot A.
It camps until the original ambush and checks the Ghoul's 96×96 ready pose,
reflected strike animation, and state-preserving presentation switch.
The `graveyard-spectre` replay starts at `8,1 E` in controlled slot A. It
checks the Spectre's 96×96 hovering pose and reflected strike during the
brass-door encounter.
The `graveyard-mummy` replay starts at `9,10 S` in controlled slot A. It
checks supported 96×96 ready and punch frames during the sarcophagus fight.
The `overland-graveyard-arrival` and `overland-north-gate-arrival` replays
start from controlled slot A at the river fork. Chrome verifies all 605
placements across five views. The arrival frames reuse 46 same-hash tiles
from the destination packs while the guest still reports the overland area.
The `graveyard-vampire` replay uses controlled slot A at `14,0 E` to check the
128×320 threshold sprite, 352×352 dialogue portrait, and both 96×96 combat
poses. It verifies presentation switches in approach, dialogue, and combat.
The `graveyard-wolves` Chrome replay from the western vampire approach verified two
192×96 wolf poses from the default upgrade pack. It observed two wolves
standing on their original 48×24 footprints and the bite frame during combat,
then switched both ways and checked that the live frame and save were preserved.

The `swamp-giant-lizard` replay uses the controlled Swamp Elder checkpoint in
slot A. It checks the selected Giant Lizard and its animated bite at 192×96,
including state preservation when switching the combat presentation.

The river pollution journal records the rowboat, secret entrance, fountain
machinery, and damage only after the party sees the corresponding ECL dialogue.
The translation verifier also checks the chamber explosion and the land's
recovery using the original dialogue. After a witnessed blast, the journal
reminds the party to check for injuries until they have left the pyramid.
The `river-approach` Chrome replay uses controlled slot A at `19,13 E`
with the river offer tracked. It moves south to discover the rowboat, takes
it to the pyramid, and enters through the secret door. The journal changes
from boarding the boat to entering the door and then exploring the passage
with the exit behind the party. The fountain remains undisclosed at that point.
The replay checks the new 352×352 exterior illustration
(`portrait:PIC7.DAX:36:0:0`) in the secret-door decision and verifies
both presentation switches. The recessed doorway and reeds were reviewed
at native size and in the live Chrome view.
The same approach replay observes both original water phases while the
Enter or Go Back menu stays open. Chrome checks each Enhanced frame,
then takes the original entrance and saves the discovery.
The `river-passage` replay loads the slot A save printed by
`river-approach` and verifies both the journal's retained entrance clue
and the first two original hidden-door discoveries in the passage.
Both doors have separate illustrations. Pass the slot A saved after the
second door into `river-passage-reload` to check that the journal retains
one inner-passage clue and still tracks the River Commission.
The `river-fountain` replay starts from a controlled lower-pyramid save
at `1,1 E`, just outside the chamber. It enters through the original door,
checks the witnessed fountain clue, selects Destroy the Equipment, and
verifies that the journal switches to ready to report and saves that status.
This covers the direct shutdown outcome in Chrome.
The fountain replay checks the base illustration and both 352×352
water-flow frames. The two archive changes reconstruct complete pictures
by XORing pixels into the base. Chrome checks their display through the
original equipment decision, and the separate illustration after shutdown.
The `pyramid-entrance` route checks 22 individual 32×32 sandstone,
plaster, and floor tiles across 20 Chrome frames. Visual review across
nine distinct views led to a quieter floor and ceiling and brighter
doorway edges before the default pack was retested.
The fountain approach and lower corridors use 35 individual 32×32 tiles
for cooler masonry and damp stone. Chrome verified 2,057 placements.
Visual review caught thin lines of the classic framebuffer between tiles;
terrain edges now overlap by half a CSS pixel to cover those gaps.
The `river-pumping` replay enters at controlled slot A near `4,4 E`,
advances twice to Parlay, and chooses Nice. It checks that the liberated
prisoners' advice and entry 35 appear only after that choice. The
translation checks also cover the hostile outcome.
The lizardfolk commission now uses the pumping-room clue when the party
knows it. The translation verifier checks the elder's approach, friend-word
prompt, story, champion request, pledge, and hostile turns against the
original swamp script. It verifies that the instructions change only
after the corresponding dialogue is witnessed.
The `swamp-approach` Chrome replay starts from a controlled overland
save with the commission tracked. It verifies the drawbridge discovery,
crosses it, and saves the anti-magic shell clue. The `swamp-elder`
replay starts from a controlled save near the elder with the witnessed
entry 35 clue carried forward from the pumping room. It verifies Parlay,
the friend-word challenge, entry 31, and the request for a champion.
Both branches check the elder's full-panel illustration when entry 31
is recorded and its handoff to Drythh's challenge artwork.
`river-pumping` saves through Encamp after the release illustration
clears. `river-pumping-reload` verifies that the release clue, entry 35,
and the tracked river objective survive a fresh Chrome reload.
`river-pumping-hostile` chooses Haughty and verifies that the journal
records the thrown contaminant, directs the party to get clear of the
room, and keeps the peaceful release and entry 35 hidden.
The same replay checks that the 352×352 barrel-attack illustration fills
the Enhanced picture panel for the narration and clears at the damage prompt.
The two Chrome branches verify that accepting opens the original chooser
and declining records Drythh's reaction, replacing the champion prompt
with guidance for a hostile encounter.
The acceptance replay selects Alda and reaches the original duel controls,
then verifies that display switching preserves the opening combat state.
Chrome also checks the two new 96×96 sprites for the swamp lizardfolk
stance and spear thrust. Drythh and the other area-16 lizardfolk use the
same original combat records. The drawbridge replay checks its new
352×352 exterior illustration and the display switch before entering.
The duel also uses a separate 32×32 broken wall cap. The trace identified
an original wall fragment with the same pixels as a combat sprite fragment,
so that hash still uses the original renderer.

In the controlled defeat branch, the combat screen reports that Alda
lost the duel, but the elder's original script then announces a victory
and pledges to keep his people out of the alliance. Reproduce from the
Alda selection with Enter, Enter, Quick, Quick, Enter, Enter, Exit.
The runtime trace saw overlay 5 at `14d6` write zero to the combat
result. The original `GAME.OVR` bytes at that offset encode the same
write. After the loss screen the ECL interpreter read zero from
`6DC7`. The original swamp script at `A350` branches to the hostile
outcome only on 129, so zero falls through to the pledge and awards flag
254. The route has no runtime correction for that mismatch.
Chrome verifies the separate pledge and farewell illustrations, the
restoration of first-person scenery afterward, and the journal's return
directions after the elder makes his pledge.

The `swamp-reward` replay uses a controlled City Hall save carrying flag
254 and the witnessed pledge from the duel result save. Chrome checks the
clerk's original lizardfolk reward dialogue and verifies the transition
from ready to report through reward pending to turned in.
The pending objective tells the party how to share the reward.
`swamp-reward-reload` reads the original save made at City Hall and
verifies that the pledge and completed commission survive a cold load.
`swamp-elder` writes the post-duel save through Encamp after the farewell.
`swamp-return` loads that save, follows the south drawbridge, takes the East Overland ferry at
`35,29`, and brings the same party to City Hall. Chrome verifies the
lizardfolk reward after the clerk settles two earlier commissions and
writes the resulting save for `swamp-reward-reload`.

The `buccaneer-approach` Chrome replay starts from a controlled
overland save with the Bivant commission tracked. It verifies the new
352×352 mounted escort scene at the Enter/Leave decision, mode switching,
and the transition into the base. It checks that the journal records the
base before showing any clue about the heir. The translation verifier
covers the pen search and the separate unpaid outcome after a failed rescue.
The Chrome replay checks that the merchants' camp announcement changes the
objective to following the fence. The first slave-pen description changes it
to looking among the prisoners. The boy's birthmark stays hidden until the
party sees it in the next dialogue. Chrome verifies four enhanced
animation poses at each of three pauses: the captive-pen overview, the
birthmark identification, and the merchant's offer. The original
caption stays visible during each sequence, and the scene returns to its
opening pose before the replay continues.

The translation verifier checks the Kovel Mansion journal against the
original chase, split, guildmaster, release, and ambush dialogue. It also
checks that the mansion's local victory flag updates the objective and
that the same flag in another area has no effect. The `kovel-guild-files`
Chrome replay starts inside the mansion at (7,14) east with the commission
tracked. It checks that entries 38 and 51 are only suggested after the party
finds the files on the floor. The `kovel-chase` replay starts at (5,5)
facing east with the same commission tracked. The journal first points to
the east door when the chase is offered. After the party chooses Yes and
sees the thieves split, it gives both routes. Chrome checks that neither
clue appears before the corresponding prompt.
The opening chase and the fork have separate illustrations. Chrome
checks both picture-panel placements and the return to the original
exploration and combat views when the party chooses a branch.
The south route reaches the ambush and changes the objective to fighting
off the thieves. `kovel-chase-east` reaches the guildmaster, checks that
the journal explains the Attack and Release choices, then verifies the
new search objective after the party releases him and he escapes.
The east route saves to slot B through Encamp. `kovel-chase-east-reload`
loads that save through the native menu and checks the tracked commission,
the four witnessed clues, and the objective to resume searching.
The cornered guildmaster illustration fills the enhanced picture panel
while the Attack and Release menu is open. Release shows a separate
illustration as he bolts through the doorway. Chrome checks both panels
and verifies that the release journal entry survives a cold reload.
The escape, guild files, and both castle maps share an original script
exit. Replaying those discoveries after adding the escape illustration
confirmed each still shows its own artwork. Both map clues also survived
cold reloads of the saves made after the discoveries.
`kovel-chase-attack` checks that choosing Attack records the confrontation
when the native battle starts, clears the cornered guildmaster illustration,
and replaces the Attack or Release objective.
`kovel-chase-decline` chooses Don't Follow at the fork and checks that the
journal returns to searching without revealing either branch's outcome.
`kovel-chase-no` declines at the initial prompt and checks that the journal
resumes the search without revealing the fork or either encounter.
The translation verifier also checks the file discovery and chase in both
orders, including with the first clue restored from a save. The tracked
objective uses the most recent discovery in each case.
The jailed thief's papers add entry 48 once the party copies them.
The translation verifier checks that this clue updates the objective
even when entries 38 and 51 were already recorded in a save.
The `kovel-jail-enemy-turn` Chrome replay starts from slot A at (10,13)
facing north. It enters the jail fight and confirms that the original
enemy turns advance to the party's manual menu without a Quick keypress.
The lone thief at (12,7) has separate artwork when caught and when he
escapes. `kovel-lone-thief` and `kovel-lone-thief-attack` check the two
choices after catching him. A controlled GOG 1.3 Chrome replay from
(12,8 N) used a DOS clock one second after noon to draw the escape
branch. It checked the original backstab and escape caption, panel fit,
display switching, and the return to exploration with the save intact.
`kovel-castle-map-nw` starts at (6,14) west and `kovel-castle-map-ne`
starts at (3,5) east with the Valjevo assault tracked. Each checks that
only the map found by the party guides the assault, then saves in slot A
through Encamp. The `-reload` variants use those resulting saves and
verify that the corresponding entry 41 or 29 still guides the assault.
Chrome also checks all 121 enhanced tiles on approach, on entering the
room, and through a full turn before saving. The northwest route uses 26
tile patterns, and the northeast route uses 18. Each reload checks the
complete enhanced view at the saved position.
The `--classic-portrait` variant removes the mounted escort replacement
from the test art pack. Chrome verifies that the original picture fills
the Enhanced panel, switches back to native Classic geometry, and still
loads the enhanced pen illustration later in the same session.
The approach replay continues into the camp and follows the pen fence to
the first witness of the boy's birthmark at `7,9 N`. The separate
`buccaneer-approach` checks the painted pen scene in both modes and uses
End three times to select Rescue Boy in the original vertical menu. It
tries to sneak past the guards and verifies the journal's updated choices
when they block the attempt. The separate
`buccaneer-pens` terrain replay starts from the merchants' camp at
`8,11 S` and reaches the animal pens. Chrome checks 49 individual 32×32
tiles over 15 views, including palisades, cage bars, and the night sky.
The Release Animals prompt uses the same full picture panel and all 121 scenery cells.
Chrome also checks the acknowledgement after releasing the animals and
the locked gate prompt. Both retain the Enhanced scenery because the
original first-person picture remains the same across those prompts.
The replay releases the animals, crosses to the slave pen, bashes open
the locked gate and takes the boy. The journal reveals each discovery
as it happens, including the guards leaving their posts and the boy
leaving with the party.
The same replay with `--repeat-stampede` uses a controlled merchants' camp
save whose journal records a prior release and recapture. It verifies that
the original Release Animals choice changes the journal back to the active
distraction and opens the route to the boy.
The Chrome replay continues toward the front gate through the first
guard interception. It verifies that the tracked objective first directs
the party to escort the boy out, then calls for fighting off the guards
when they spot him. This route leaves the merchant alarm clue hidden.
The controlled `buccaneer-bivant-escort-combat` Chrome replay verifies all
19 visible Buccaneers after the opening camera pan, including the guard
against the diagonal wall, then checks an animated reflected strike.
The translation verifier checks that the journal keeps
the escort active inside the base and asks the party to report to the
council once it is outside. The `bivant-reward` Chrome replay starts from
a controlled City Hall save with the rescue flag at 254. It verifies the
clerk's dialogue, claiming the sword and scrolls, and the turned-in
journal entry in the resulting save. The gate escape through the council
reward still needs a continuous replay.
The current Chrome replay also checks the intermediate reward-pending
state before the reward menu closes and reads the turned-in state from
the resulting save.
The swamp replay checks the 192×320 elder sprite at the original 48×80 placement
and verifies presentation switches in the encounter. The `swamp-ruins`
replay loads the save made inside the ruins and checks 51 individual
32×32 tiles across 12 views. Visual review led to a continuous misty sky
behind the ruin tiles.
The elder's restored background also supplies tile placements during
Parlay. Twenty additional 32×32 tiles cover the approach and the ruins
behind him. The replay checks all 121 terrain cells under the separately
anchored sprite, including after opening and closing the journal.
The `yarash-combat` replay starts from the live fountain shutdown save
and enters Yarash's room through the locked door. Chrome checks Yarash's
selected stance, the mutant guard stance, and a guard strike during
animation. All three are original 96×96 PNGs using the original combat
anchors. Visual review covered the stance and strike at gameplay size.
The `river-exit` replay uses the upper-pyramid entrance save with the
river completion flag and journal clues from the fountain save. It walks
out through the original secret door and verifies that the recovery clue
first appears in the exit dialogue and is retained in the save made after
returning to the reeds.
The `river-return` replay loads that exact save, skirts the river to the
east, heads south to the landing at `20,29`, and takes the original boat
to New Phlan. It verifies that the recovery clue survives the reload and
that the clerk's river reward moves the journal from ready to report
through reward pending to turned in.
`river-return-reload` opens the save made after the council reward
and checks that both the river recovery clue and the turned-in status persist.
The `phlan-ferry-river` and `phlan-ferry-east` presentation replays start at
the river and East Overland docks using controlled slots A and B. Both check
the original Take Boat / Stay prompt, its shared 352×352 illustration, and
state preservation across presentation switches. Each takes the boat and
checks all 121 New Phlan tiles in both landing frames. The renderer uses
the destination scenery draw while the area record still names overland.
The `phlan-outskirts-north`, `phlan-outskirts-east`, and `phlan-outskirts-west`
replays use separate controlled slot A checkpoints. Chrome verifies the
shared crossroads illustration at each original travel menu.
The `diogenes-cave` replay checks the 352×352 mountain cave illustration at
the initial sighting and on a later approach from separate controlled slot A
checkpoints. It verifies the picture clears as the party enters and Diogenes's
magic mouth starts the dialogue.
The `diogenes-advice` replay continues from the initial sighting through
Ask Dragon for Advice. Chrome verifies the 352×352 silver dragon portrait
when Diogenes appears and through the Silver Bottle quest briefing.
The `old-phlan-seer` replay starts in controlled slot B just before the
hidden seer. It verifies her new 352×352 portrait in Chrome and checks it
clears as she departs after giving her prophecy. It verifies the clue is
hidden before the prophecy and saves it to slot B after the party hears it.
`old-phlan-seer-reload` boots that save and checks the clue in the journal.
The `diogenes-advice` replay also checks that the Silver Bottle quest is only
offered in the journal after the briefing.
The pledged return was replayed in Chrome from a controlled checkpoint
carrying the bottle with its recovery objective tracked. Diogenes acknowledged
the recovery, then his instructions moved tracking to the vampire objective.
After his departure, choosing Ignore Cave returned the party to the overland
menu. A native Encamp save and a fresh Chrome reload preserved the tracked
objective and its Valhingen Graveyard direction.

The `nomad-camp-approach` replay checks the overland camp illustration at
the Enter / Leave choice and the full approach to the sentries. The first
view uses the camp's art before the guest updates the area record. Chrome
verifies all 847 placements across seven views, including 19 new 32×32
sky, canopy, and horizon tiles, then verifies the sentries' portrait.
`nomad-tent-lane` and `nomad-camp-rim` start at
`2,14 E` in a native save made after entering the camp. Chrome verifies
1,694 placements across both branches, using 49 new 32×32 tiles. The
rim route ends at the sword-ready encounter. The browser draws the Nomad
sentry in quilted armor and a russet scarf over all 121 terrain tiles.
The journal records that the camp is on guard after the warning appears.
It leaves the headman's account and the kobold warning hidden. The
replay follows the new prompt guidance through Enter and Parlay and
verifies the enhanced headman portrait.
The `nomad-headman` and `nomad-headman-stay` replays start from the overland
camp checkpoint. They verify the headman's portrait, the journal's feast
invitation, entry 55, kobold warning, and overnight decision. Each replay
selects a different response and checks that the journal records only the
response witnessed by the party. On the Stay and Fight branch, the next
Enter reveals the headman's permission to rest and study. The journal
then directs the party to prepare through Encamp.
The `nomad-feast-arrival` replay checks the separate daytime contest and
nighttime campfire illustrations, then verifies the handoff to Hassad's
portrait as the party records his account in entry 55.
The `nomad-feast-decline` replay checks Hassad's dismissal portrait and
the peaceful exit. The `--refuse-to-leave` branch checks that the journal
records the hostile response after the party refuses to go.
The Stay and Fight replay writes a native slot A after that offer.
`nomad-headman-rest-reload` loads it in a new Chrome session, checks
that the offer survives, and rests eight hours through Encamp. The
clock advances from 00:29 to 08:29 without revealing the raid.
`nomad-headman-raid` starts from the same save and rests until 18:29.
It verifies that the journal first records the war cries, then identifies
the attackers only after the original script reveals them. Choosing
Combat opens the original raid battle. At the attack prompt, Chrome
checks the new 96×260 kobold raider and all 121 underlying terrain tiles.
Controlled Chrome runs also verify the 160×320 near and 96×228 far raider
sprites from `SPRIT7.DAX` block 0 at their native anchors. Each run
selects a distance in the original draw call and continues into combat.
The renderer restores the native scenery draw captured just before the
actor was painted, even when both draws occur between input frames.
The replay continues to Alda's first manual combat turn and verifies
all 66 battlefield placements, including three new 32×32 wall pieces.
Both presentation modes preserve that turn.
The preceding enemy view uses the Nomad raid's own 96×96 kobold poses,
selected by the original combat script position. Chrome verifies the
standing pose and six enhanced wall tiles underneath it. The renderer reads
the terrain from the native offscreen surface before the actor draws and
checks the visible pixels before restoring the covered wall. The replay
also checks a second kobold standing over the loose-stone sprite. Both
enhanced assets load at (80,152), with the stones beneath the kobold.
The replay advances Alda's Quick turn and verifies the distinct 96×96 kobold strike at
(80,80) in Chrome, then checks that the animation clears from the live view.
The native terrain draws sampled in the Nomad raid, Sokal patrol,
lizardfolk battle, and dragon fight now have 78 of 78 tile patterns
linked. The 19 new tiles cover slate and quartz fragments and marsh
clutter and were reviewed in assembled battlefield views.
`nomad-shaman-ready` checks the scoped 96×96 ready sprite in the separate
headman rally battle and checks that switching modes preserves the save.
The `kuto-well-approach` replay uses slot J saved after the original cross-
district transition. Chrome verifies 1,936 placements across 16 views on
the walk to the well, using 89 distinct 32×32 tiles. The final view checks
the enhanced kobold scout sprite separately from the terrain underneath it.
The `slums-textile-threshold` replay starts from slot B at (15,11) facing
east. Chrome verifies all 605 placements across five views, including two
wall-edge patterns that reuse matching 32×32 masonry tiles on the Slums side.
The `textile-fountain-turn` replay walks from a position-only slot H at
(4,10) facing south. Chrome checks 605 placements across five views,
including the mirrored masonry edge when turning toward the fountain.
The `kuto-south-court` replay starts from the same slot J entrance. It checks
2,057 placements across 17 views and verifies the reused gnoll approach sprite
over the full terrain grid at (4,13) facing east.
The `old-phlan-east-jail` replay starts from a position-only slot A
checkpoint at (11,13) facing west. Chrome checks all 605 placements over
five street views and then the enhanced jail portrait at the original
dialogue break. Earlier pixel traces counted the native portrait as 82
unmatched terrain patterns.
The `kuto-north-guard-approach` and `kuto-north-rubble-loop` replays branch
from the same native entry save. Chrome verifies 3,388 placements across
28 views, including 23 new 32×32 tiles for the northern ruins.
The `kuto-norris-surrender` replay uses a controlled slot J beneath the well.
It verifies that the journal learns of the ambush, then independently records
surrender only after the party sees the outcome. A native save above the
Catacombs retains both clues, verified with `kuto-norris-surrender-reload`.
`kuto-norris-combat` uses
an extra-health party to capture both 96×96 combat poses. Kuto's scoped
bindings take precedence over the byte-identical global pose in the CPIC2
archive, which remains available in other districts.
The `mendor-library-exterior` replay uses slot B saved after the original
Textile House crossing. `mendor-library-vestibule` positions the party inside
the locked entrance. Chrome checks 3,630 placements across 30 views using
61 new 32×32 tiles across the two routes.
The `mendor-library-basilisk` replay uses controlled slot B outside the
Rhetoric stacks. Chrome checks the 192×96 ready pose and animated strike.
The `mendor-rhetoric-stacks` and `mendor-history-stacks` replays check
2,420 placements across 20 views, including 50 new 32×32 tiles. The
`mendor-library-stacks` replay verifies that the stacks clue appears when
the party sees the shelves. The translation verifier checks that only the
book actually read appears in the journal for entries 7, 8, 19, 21, and 37.
The verifier also checks each record's original report and acknowledgment
flags independently. `mendor-records-reward` uses controlled slot A at
City Hall to report Lex Geographica. Chrome verifies that the atlas is
pending when the clerk acknowledges it. Closing the treasure menu
completes the handoff and returns tracking to the standing records offer.
The translation verifier checks the clerk's distinct acknowledgment for
all five records.
`mendor-records-reward-reload` checks the completed atlas entry and
tracked search objective after reloading the native save.
The `mendor-library-fighter` replay uses controlled slot B and checks the
fighter's 96×96 ready pose and reflected sword strike in Chrome.
The `mendor-library-spectre` replay sets the book flag in controlled slot B
to trigger the guardian. It checks both 96×96 poses and the witnessed clue.
The `kobold-cave-escort` replay uses controlled slot B with the kobold
commission tracked. Chrome checks the offer, the accepted escort, and
the guide's announcement outside the throne room. It then follows the
journal's route from (7,5) north to (5,1) and verifies that the envoys
remain hidden until the first meeting. The separate rematch replay
also checks the envoy clue.
The escort replay checks 121 individually positioned tiles in each of 12
exploration views. Two separate 352×352 illustrations show the guide
tapping the cave wall and stopping outside the throne room. The arrival
illustration uses the dialogue cue because its cursor is also used by the
surrender branch. Seventeen 32×32 tiles cover doorway jambs, cave wall ribs,
and floor joins.
The replay then checks the 352×352 king-and-envoys illustration at the
battle prompt. The guide and king share the original `PIC8.DAX` block 0.
The throne-specific ECL cursor selects the new illustration and the
guide still uses his own portrait earlier in the same replay.
The translation verifier checks the later escape and quarters guidance
against the original dialogue.
The `kobold-king-door` replay starts from a controlled post-escape slot B at
(5,2) north. It uses Search and steps into the throne room. Only after the
original game reports the secret door does the journal direct the party
through it. The `kobold-king-door-reload` replay loads the resulting save
and follows the journal north through the door and two squares east to
the guard encounter at (7,0). It verifies the 484 enhanced tile placements
along the passage, including the new wooden-door lintel, and checks the
objective change when the guards appear.
The `kobold-king-fall` replay starts from a controlled post-guard slot B
at (10,2) north and witnesses the king's fall. It saves the report objective
through Encamp, and `kobold-king-fall-reload` verifies that it survives
reloading. The separate `kobold-king-reward` City Hall checkpoint uses
the observed result. Chrome checks the clerk's dialogue, the intermediate
reward-pending status, and the turned-in result in the resulting save.
The reload replay also turns and walks beyond the pit. Chrome checks all
484 tile placements across four views, including nine new 32×32 wall
and floor pieces. The `kobold-king-return-throne` replay follows the new
journal directions from the pit back to the throne room. It verifies all
1,331 tile placements across eleven views, including four new door jamb
and sill tiles, and saves at (5,1) facing south with the report pending.
The `kobold-king-leave-caves` replay loads that throne-room save and follows
the southern route past the tables and pool. Chrome checks 3,993 tile
placements across 33 views, including 15 new 32×32 pieces. It exits at
overland (32,15) south, checks the journal's New Phlan report objective,
and saves the witnessed cave exit in slot B.
The replay also checks that the cave-selection prompt uses the overland
map before the player chooses Exit, and switches modes at that prompt.
It also tests the surrender demand, restores the prison escort clue from a
saved journal, and checks the separate cell and Fatima outcomes against
their original dialogue. The surrender branch still needs a live replay.
The translation verifier also checks the original retreat dialogue. The
journal distinguishes the party's escape from capture and from the king
escaping the party, and points the party back to the throne after regrouping.

The `kobold-princess-fatima` replay uses controlled slot B to check her
portrait and journal entry 16. It checks the illustrated offer and its
journal clue before verifying that Yes adds her to the roster. With
`--decline`, the replay checks her illustrated farewell and departure
clue. Both branches save through Encamp. `kobold-princess-fatima-reload`
checks the roster and journal in the resulting slot B, using the same
`--decline` option for the departure branch.
The `kobold-cave-guide` replay checks the area-scoped guard portrait and
the escort clue when the party wakes the guide. With `--decline`, it
verifies that the guide returns to sleep and the journal directs the
party to find another route to the king. `kobold-small-cave-pool`
and `kobold-large-cave-loop` start from slot B saves made through the
original cave entrances and check 2,541 placements across 21 views,
including 43 new individual tiles.
The `kuto-catacomb-service-loop` replay uses controlled slot J below the
well and turns away from Norris's ambush. Chrome checks 2,057 individual
placements across 17 views, including 32 new 32×32 tiles.
The `diogenes-advice` replay checks the 352×352 magic mouth through the
intent menu, between the exterior illustration and the silver dragon portrait.
The `textile-restal` replay uses a controlled slot C. Chrome checks the well
illustration and warning, Restal's portrait, and the blindfold illustration
while switching display modes. Run it with `--decline` to verify that turning
down the blindfold records the dismissal. The default replay accepts it and
records the shortcut after the party reaches the main well.
Both routes verify their own outcome illustration. With Cadorna's
commission tracked, the journal points to the western building after
acceptance and tells the party to find another entrance after dismissal.
The `cadorna-envoy-briefing` replay uses controlled slot A at City Hall.
It verifies Cadorna's 352×352 portrait and checks that the sealed-packet
journal clue appears after his instructions.
The `braccio-dirten-briefing` replay uses controlled slot A and checks the
portrait handoff from Bishop Braccio to Dirten. Chrome verifies the journal
learns about the Temple of Bane invitation after it is spoken.
The `nomad-reward` replay loads controlled slot A at City Hall with the
original completion flag and the witnessed departure clue. It verifies that
the journal asks the party to report what happened, becomes reward pending
when the clerk responds, and marks the commission turned in after the reward
menu closes. A translated-setter check covers the same flag without exposing
the commission when the party has never heard the offer.
A controlled Chrome replay jumped to the original shaman reward branch
after the war cries, leaving the treasure and departure instructions
intact. It verified the tracked reward objective at the treasure
prompt, then the instruction to leave and report to the council after
the party shared the coins and heard the shaman ask for privacy.
The `podal-west-gate` replay starts in slot J at `7,6 S` and walks to the
western arch. Chrome checks 1,573 placements across 13 views, using 17 new
32×32 tiles among 61 patterns, and preserves the save when switching modes.
From the western boundary in slot J, `podal-west-gate-north-reentry`
checks Podal tiles on the first arch frame, before the area record updates.
`podal-west-gate-south-reentry` checks 363 placements across three scenery
views, including 26 new arch tiles. Both Chrome replays verify that mode
switches preserve the save.
The `podal-north-lane` replay leaves that gate and crosses into Stojanow.
Chrome verifies 1,936 placements across 16 views. Eight new ivy tiles cover
the lane and nine existing Stojanow tiles carry through the crossing.
The `phlan-city-hall-approach` replay starts from slot B inside New Phlan's
original gateway at `1,4 E`. Chrome checks 1,815 placements across 15 views
on the City Hall approach and adjacent streets. The route uses 83 patterns,
including 65 new 32×32 tiles, and preserves the save through mode switches.
The `river-reward` replay uses a controlled City Hall save with the
completion flag and witnessed clues from the fountain save. It checks the
clerk's original river dialogue and verifies that the journal stays reward
pending until the player closes the reward menu.
The translation verifier checks that the next step changes at each discovery
and points back to New Phlan after destruction. It also checks the original
council reward dispatch and progress flag. These checks use original ECL
fixtures and the translated setter.


The `valjevo-tower-halls` replay starts from the controlled Valjevo Castle
slot B. Chrome checks the transition from the outer castle to the tower and
verifies 1,573 tile placements across 13 views before the dragon entrance.
The route uses 114 keys, including 65 new bindings to 59 new 32×32 paintings.
The save is preserved when switching presentation.
The `valjevo-west-gallery` replay takes the other tower branch from the same
slot B and checks 1,815 placements across 15 views. It adds 11 original
32×32 tiles and five bindings to existing tower art during the transition.
Use `valjevo-tower-save` with the same slot B checkpoint to enter area 7
and write a native save through Encamp at `4,8 W`. Use the resulting `B.json`
with `valjevo-tower-reload`. Chrome checks all 121 original tiles and the
party and menu against the scene recorded immediately before saving. It also
checks that switching presentation preserves that state and the save bytes.
The tower inherits wall pieces 2 and 4 from the approach. A cold load asks
for them in `WALLDEF5.DAX` and `8X8D5.DAX`, where the original archives lack
those entries. The mounted copies expose the original compressed records
from archive 2, and the guest uses those records through its own DAX loader.
The original dungeon transition also asks for wall set 25 by itself. Its
780-byte table is the second half of wall record 24, with the original tile
atlas at 242. The mounted archives expose both under 25 and account for the
guest adding 70 to standalone slot 2 tile indices. Two shared references
are swapped with other slot 1 indices in both the table and its atlas so
they survive the guest's rebasing. The translation verifier compares all
2,340 grouped and standalone wall-cell references against the supplied
tiles. `valjevo-dungeon-save` crosses the lower-wing
threshold from controlled slot B and saves in Encamp. `valjevo-dungeon-reload`
compares all 121 native tile placements and pixels, party, and menu after
cold loading. The original renderer draws the dungeon hedge before the
area record catches up with the ECL selection. The browser uses the
destination's tile keys for that transition, and Chrome verifies all 121
enhanced placements on the first interactive dungeon view.
Replacing the older capture with a replay of the same inputs moves 21
previously unmatched hedge patterns out of area 5. All 29 captured area 3
patterns are covered. Six new threshold tiles close the lower-wing
doorway gaps. Chrome checks all 242 placements across both sides of the
transition, including each 32×32 PNG's source ID and screen coordinates.

`bane-south-colonnade` verifies 20 new 32×32 tiles across 16 views
and 1,936 placements, including awnings, columns, and ivy. The area 24
terrain inventory omits one older frame with an actor composited over it.
`nomad-camp-sentries` verifies the 352×352 sentry illustration at the
standoff and the portrait change to the headman after Parlay.

`phlan-city-hall-interior` covers 80 new terrain tiles across 16 native views.
`valjevo-elite-guard` checks the original standing and two-handed strike
placements with two 96×96 replacement sprites. The controlled
`valjevo-cadorna-captive` and `valjevo-cadorna-hedge` replays check the 352×352
portrait, release dialogue, and that the journal only adds Cadorna's hedge
directions on a branch where he says them. All four Chrome checks switch
presentation while preserving the authoritative game frame and save.

`valjevo-dungeon-briars` covers 29 individual terrain replacements across
16 live views of the repaired hedge route. `valjevo-dungeon-kitchen` verifies
the kitchen illustration, freeing the captives, and the hedge-gate password
lead. The journal withholds that lead before the party hears what the slip
is for. `valjevo-cadorna-killed` and `valjevo-cadorna-alarm` replay those
alternate outcomes and check that the journal records the actual choice.
The alarm replay checks the scoped 352×352 illustration when Cadorna
calls out from his cell, its picture panel fit, and both display modes.
The tracked castle objective warns the party about the alarm and retains
the hedge directions Cadorna already gave. `valjevo-cadorna-alarm-reload`
checks the warning and directions after a cold load of the original save.
The death outcome uses a separate aftermath illustration. The killed
replay verifies the native confirmation text, panel fit, mode switching,
and the corresponding journal entry.
The alarm and death replays also check Cadorna's earlier offer to guide
the party through the main gates, with its own full-panel illustration.
`valjevo-cadorna-hedge` also writes a native slot B with the learned
directions. `valjevo-cadorna-reload` checks that the captive, directions, and
release entries survive a cold load of that save.

`valjevo-kitchen-corridor` checks 40 individual tiles across 17 views of
the service route, including the arched doors and both stone wall families.
`valjevo-scriptorium-password` and `valjevo-scriptorium-authority` start
from controlled slot B in disguise and exercise the officer's two peaceful
dialogue branches. Chrome checks the 352×352 portrait during each challenge
and verifies it clears after the guard lets the party pass.
`valjevo-scriptorium-west` and `valjevo-scriptorium-east` together verify
12 new individual tiles in 30 live views. The kitchen slot B copies vary
only in starting coordinates and facing. `valjevo-maze-watch` verifies
the watch fighter's 4× approach sprite and 352×352 portrait at his
password challenge, switching at both frames and its removal when
the party passes peacefully.
Both Scriptorium parlay replays also check the officer's middle and near
approach sprites at their original anchors and switch presentation at
each distance before answering the guard.
`valjevo-scriptorium-combat` takes the officer's combat branch. Chrome
checks the selected 96×96 ready pose and the reflected sword strike in
the animation stream. `valjevo-records` starts at the adjoining records
building. It checks the Thay alliance and Moonsea plans appear separately
as the party reads them.
`valjevo-records-decline` verifies the room stays in the journal as a
place to revisit while the unread reports stay hidden.
`valjevo-records-revisit` declines, leaves, and returns. It checks that
both reports are still hidden when the party reenters and that each
illustration and journal entry appears when the party reads that report.
The resulting slot C passes the same reload check as the direct route.
`valjevo-scriptorium-reports` searches the room on a controlled copy
with the officer fight marked cleared. The Raven Clan report and the
flaming-aura clue appear separately as their text is shown. The translation
verifier checks that the aura clue changes the journal directions after
the party discovers the impostor.
`valjevo-scriptorium-reports` writes slot B through Encamp after both
discoveries. `valjevo-scriptorium-reports-reload` starts a fresh Chrome
session from that save and checks both reports are restored, while the
unread Thay alliance entry from the separate records building stays hidden.
`valjevo-dungeon-sentry` checks the custom portrait when the original
sentry sounds the alarm. `valjevo-outer-service` uses controlled slot B
staged at the area's original arrival coordinates. Chrome checks all
2,057 placements across 17 views. Four new boundary tiles join limestone,
hedge, and path, and 30 pixel-identical patterns use existing artwork.
`valjevo-fire-giant` enters the maze watch battle from controlled slot B.
Chrome checks the selected 96×192 ready pose and the reflected strike,
including the rendered horizontal flip. Switching modes preserves the
combat frame and the save.
`valjevo-hill-giant` checks the distinct Valjevo Hill Giant's 96×192
ready pose and reflected club strike from controlled slot B.
`valjevo-bane-chaplain` checks the 352×352 portrait on the Talk branch,
and confirms the chapel lead appears after the priest explains who
established it. Both Chrome replays verify state-preserving mode switches.
`valjevo-bane-cleric-combat` takes the chapel fight branch and checks
the ready stance and reflected mace strike at 96×96. The forge replays
`valjevo-forge-smith` and `valjevo-forge-authorization` check the 352×352
portrait and its removal when each peaceful dialogue returns to exploration.
The authorization replay leaves the encounter through Flee and saves
through Encamp. `valjevo-forge-authorization-reload` loads the resulting slot B
and checks that both the initial forge clue and the authorization advice
survive reloading and switching display modes.
`valjevo-genheeris-bargain` and `valjevo-genheeris-orders` verify the
middle and near approach sprites, the 352×352 illustration, mode
switching, and the distinct journal lead
from each choice of parlay tone. Accepting the bargain adds Genheeris
to the party roster and unlocks the Encamp journal's next step to
continue to Tyranthraxus's audience hall. The replay checks that the
accepted bargain survives switching between Classic and Enhanced.
`valjevo-genheeris-combat` declines his offer and verifies the 96×96
ready pose in the resulting battle. Chrome also decodes the 96×96
strike asset from the art endpoint. The live replay has yet to show
that strike because Genheeris casts spells and moves.

`phlan-training-hall` starts from a controlled slot I outside the training
rooms. It declines the duel and recruit offers and continues into the rogues'
hall. Chrome verifies all 1,452 placements of 24 individual 32×32 tiles
across 12 views, and checks that presentation switches preserve state and saves.
`phlan-training-civic` follows the western exit to Civic Square. Chrome
verifies 1,815 tile placements across 15 views on both sides of the
transition. The route adds 14 original tiles and 25 area-specific aliases
for matching civic artwork.
`phlan-south-market` starts from a controlled New Phlan slot B. Chrome
checks all 1,936 placements of 66 tile patterns across 16 views, including
45 new 32×32 tiles for market awnings, bay windows, shopfronts, and lanes.
Switching presentation preserves the guest frame and save.
The visual review caught three shared tiles with sky seams at the roofline.
Their corrected versions preserve the masonry and match the surrounding
sky. Both `phlan-south-market` and `phlan-training-civic` passed again
with the corrected shared tiles.

`mendor-library-south` and `mendor-library-north-corner` verify the ten
new 32×32 rubble-gallery tiles across 19 views and 2,299 placements. The
local inventory uses terrain-only copies of two older traces, omitting
the frames with fighters and spectres composited over the scenery. All
118 distinct area 20 terrain patterns in the audited traces now resolve.
The Sokal Keep area 21 audit reviewed four legacy terrain frames with
visible skeletons and one cleared view between scenes. With those frames
excluded from the terrain checklist, all 85 captured terrain patterns in
the remaining area 21 views have replacements.
The Stojanow terrain audit identified 19 unmatched patterns from two old
frames with bugbears drawn over the scenery. Replaying `stojanow-west`
with the current art pack verifies the bugbear separately and checks the
terrain underneath. The audited area 9 traces now resolve all 67 distinct
terrain patterns.
`textile-ivy-lane` reproduces all nine Textile House terrain gaps from
controlled slot H. Chrome checks the original 32×32 replacements against
their placement in all ten views, with 1,210 verified placements.
`valjevo-giant-patrol` checks the captain's area-scoped portrait
at the password challenge and confirms it clears after peaceful passage.
`kobold-cave-boar` uses a controlled rematch checkpoint to verify the
192×96 ready frame and reflected charge. Both replays switch presentation
and verify the save remains unchanged.
`phlan-priest-tempus` keeps the Temple of Tempus portrait visible through
the healing menu. The area-specific mapping uses the same source portrait
as the council escort. Chrome checks both scenes independently, along with
the Temple of Tyr regression. `kobold-cave-efreeti` verifies the 96×192
ready pose and strike from a controlled bottle encounter.
`buccaneer-north-palisade` covers 27 new original tiles on the northern
route from a controlled slot A with a staged start time. Chrome checks
2,057 placements across 17 views as the sky changes from night to dawn.
`yarash-upper-pyramid` checks 22 new upper-gallery tiles and 1,815
placements across 15 views. The terrain checkpoint sets the area's
wandering encounters to cleared. `bane-hidden-treasure` opens the hidden
loot chamber and verifies the treasure illustration through the original
loot menu, with state and save preserved during presentation switches.
`zhentil-east-yard` verifies 13 new terrain tiles, 17 views and 2,057
placements from a position-only copy of the quarters checkpoint.
`nomad-central-grove` verifies 21 new tiles across 16 views and
1,936 placements from a position-only copy of the camp entry save.
`valjevo-troll-approach` verifies the original near-distance frame and
the 160×320 replacement at the guest's screen anchor. This replay does
not present the middle or far frames.
`kobold-cave-efreeti-approach` verifies the 160×320 close-distance
replacement at its native anchor and 26 scenery patterns across five
views, with 121 enhanced terrain tiles in each view.
`kobold-cave-wyvern-approach` verifies
the native far, middle, and near draws in order, with 128×196, 224×260,
and 352×320 replacements at their original anchors. The wyvern approach
uses 12 scenery patterns across three views, with 121 enhanced terrain
tiles per view. Both replays switch presentation on the same game state.
`kobold-cave-efreeti-dialogue` verifies Samir's custom illustration and
checks that his warning is learned only after the party hears it.
`valjevo-hill-giant-dialogue` checks the hill giant illustration at the
ready-weapons choice. `lizardfolk-east-bank` checks seven new tiles across
16 views and 1,936 placements from a position-only copy of the ruin route.
`podal-south-arcade` checks 12 new night-time arcade tiles and 1,452
placements across 12 views. The last view verifies the goblin approach
sprite at its original position over all 121 enhanced terrain tiles.
`bane-inner-court` and `bane-inner-sanctuary` cover the court and
red-ceiling sanctuary routes. Chrome verifies 14 new tiles across
16 live views and 1,936 placements. The court starts from the goblin-clue
save and the sanctuary uses a copy with only position and facing changed.
`kobold-cave-east-tunnels` checks 10 new rubble and timber-edge tiles
across nine live views, with all 1,089 placements verified. The route
uses a position-only copy of the large-cave entry save.
`stojanow-upper-road` checks 15 new stair and tower tiles, with 1,936
placements across 16 views from a position-only copy of the entrance save.
`valhingen-spectre-approach` and `valhingen-spectre-approach-near` verify
the middle and near poses at their original anchors in separate encounters.
`valhingen-mummy-approach`, `valhingen-mummy-sarcophagi`, and
`kobold-cave-wyvern-dialogue` verify the Mummy approach sprite and two
pre-combat illustrations. Chrome checks the artwork and state-preserving
mode switches on all five encounter replays.
`north-gate-weapon-cache-ambush` checks the weapon cache illustration
at the original gas cloud prompt and during presentation switches.
`stojanow-patrol-leader-dialogue` checks the portrait at the patrol
challenge, including panel fit and state-preserving mode switches.
`zhentil-guard-combat` checks the ready and animated attack poses
in the original nighttime outpost battle.
`stojanow-plotting-mage` and `stojanow-plotting-fighter` verify both
portraits and prove the journal gains each lead only after hearing it.
The Stojanow tower charge replays use controlled wall-walk checkpoints.
The two-tower, far-only, and near-only routes vary the original tower
clearance flags and verify distinct 352×352 illustrations. All three
return to the original encounter menu and preserve state and save bytes
while switching display modes.
`nomad-warrior-combat` checks the ready pose and reflected sword strike.
`bane-ogre-led-guards` checks the ogre and orcs illustration at the
original temple interior prompt, including panel fit and mode switching.
`slums-grain-sack-ambush` checks the illustration at the original
grain sack prompt with the same panel and presentation switch checks.
`kobold-fatima-combat` verifies Fatima’s ready and strike poses. The
renderer uses the suspended ECL cursor to distinguish her fight from
the throne rematch, where the envoys reuse the original CPIC poses.
The `kobold-cave-boar` replay checks that the rematch excludes Fatima’s art.
`kobold-envoy-ready` checks the rematch's own 96×96 standing pose.
`nomad-south-trail` checks 18 redrawn fence, vegetation, and trail
tiles across 16 live views from the original camp entry save.
`lizardfolk-north-canal` checks five redrawn reed and ruin tiles across
11 live views from the post-duel save.
`textile-skullcrusher-chained` checks the captive's portrait and verifies
that the journal records the encounter after the party discovers him.
`textile-skullcrusher-combat` verifies his ready and strike poses
in the released-prisoner branch from a controlled checkpoint.
`bane-orc-combat` checks the temple orc's ready and animated strike poses.
`bane-orc-leader-combat` checks both poses for the temple orc leader
from a checkpoint positioned one step before that encounter.
`wild-cave-thri-kreen-dialogue` and `wild-cave-gnoll-dialogue` check
the enhanced cave illustrations at the original encounter prompts.
`lizard-wilds-stirge-dialogue` and `wild-cave-giant-lizard-dialogue`
check the full-panel swarm and giant lizard illustrations.
`wild-cave-giant-snake-dialogue` and `wild-cave-boar-dialogue` check
the falling-snake ambush and boar charge at their original prompts.
`wild-cave-boar-approach` and `wild-cave-thri-kreen-approach` check the
4× approach sprites at their native anchors through the transition to
dialogue. `bane-ivy-loop` checks three ivy, masonry, and doorway tiles
across 19 views and 2,299 placements. All three replays verify that
switching presentation preserves game state and save data.
`wild-cave-snake-combat` checks the giant snake's 192×96 ready and
animated strike poses from a controlled pre-encounter checkpoint.
`wild-cave-boar-combat` checks the boar's ready pose and reflected
charge from a controlled pre-encounter checkpoint.
`wild-cave-wyvern-combat` checks the wyvern's 192×192 ready pose and
reflected lunge from a controlled area 27 checkpoint.
`wild-cave-lizard-combat` checks the giant lizard's 192×96 ready pose
and reflected strike from a controlled area 27 checkpoint.
`wild-cave-troll-combat` checks the troll's 96×192 ready pose and
animated strike in the area 27 gnoll-room encounter.
`wild-cave-gnoll-approach` and `wild-cave-giant-lizard-approach` check
the native placements and transitions to dialogue in the gnoll and
minotaur encounters, including presentation switching.
The giant lizard route additionally verifies 15 cave terrain patterns
across three views. Controlled replays check its middle and far cave
sprites at (48,32) over the same 121 enhanced tiles and continue to the
minotaur encounter dialogue.
The separate `wild-cave-lizard-charge` replay uses `combat-agent-area27-lizard-B.json`
from the local replay workspace. In this encounter the original game draws
far, middle, and near between inputs. The browser captures each completed
draw and displays the three Enhanced poses in order over all 121 terrain
tiles before the dialogue portrait.
The gnoll and wyvern routes each verify 17 cave terrain patterns across
three views. Together with the minotaur chamber, the nine views use 19
distinct 32×32 tiles, including the added wall and floor junctions.
Controlled wyvern replays also check the 224×260 middle and 128×196 far
sprites from `SPRIT8.DAX` block 121 at their guest anchors. Each pose
loads above the same complete cave scenery and leads into the portrait.
The ordinary wyvern replay now checks far, middle, and near in order.
Controlled gnoll replays verify the 160×292 and 96×228 middle and far
sprites from `SPRIT8.DAX` block 73 above all 121 tiles before dialogue.
`stojanow-patrol-fighter-approach` checks the far and middle patrol
sprites through the transition to dialogue. `pyramid-vats-lizard-approach`
checks the vat ambush's approach sprite and dialogue portrait. Both
Chrome replays verify original anchoring and presentation switching.
`kuto-lizardman-combat` and `kuto-kobold-leader-combat` check the 96×96
ready and strike poses for both opponents in Norris's native fight.
Both replays use the same slot J checkpoint and verify mode switching.
`kuto-giant-lizard-combat` verifies the 192×96 ready and strike poses
in Kuto's patrol fight from a controlled checkpoint with original party HP.
`bane-treasure-walk` checks 12 redrawn Temple of Bane tiles across 16 views
and 1,936 placements. Both replays verify presentation switching and
save preservation.
`bane-altar-approach` checks seven redrawn tiles across 23 views and
2,783 placements through the original altar prompt.
`bane-altar-return` checks two more stair and threshold tiles across
28 views and 3,388 placements after choosing Leave It.
`pyramid-cross-gallery` checks five new sandstone and plaster tiles
across 11 views and 1,331 placements from a controlled upper-pyramid
checkpoint. Switching presentation preserves game state and the save.
`pyramid-inner-angles` extends that route with four new tiles and
checks 3,025 placements across 25 views.
`kuto-norris-approach` verifies the anchored approach sprite through the
surrender-or-fight prompt. `slums-troll-combat` and `slums-ogre-combat`
verify the 96×192 ready and reflected strike poses in the grain-sack
ambush. These Chrome replays check presentation switching.
`slums-council-gnoll-combat` checks the 96×192 ready and reflected
strike poses in the monster council fight from a controlled checkpoint.
The replay switches presentation and verifies the save is unchanged.
`slums-kobold-captain-combat` checks the 96×96 ready and reflected
strike poses in the Slums feeding room from a controlled checkpoint.
`valjevo-hedge-approach` checks 12 new limestone, paving, and trim
tiles across three views and 363 placements before the snake encounter.
Both replays verify presentation switching and save preservation.
`mendor-fighter-approach` checks the anchored approach and the transition
to the battered fighter's portrait. Both replays verify presentation switching.
`kuto-inner-lane` checks ten redrawn rubble, doorstep, and wall-edge
tiles across 19 views and 2,299 placements from the slot J entry
checkpoint. Presentation switching preserves game state and the save.
`podal-gate-fountain` checks 30 new terrain tiles across 11 views and
1,331 placements, including the transition from Podal Plaza into Kuto.
`zhentil-dwarf-combat` checks the 96×96 longsword fighter poses in
the native alarm encounter from a controlled checkpoint with original
party HP. Both replays check presentation switching and save preservation.
`valhingen-zombie-approach` and `valhingen-ghoul-approach` check the
stairway and rest ambush sprites at their native anchors, followed by
their dialogue portraits. Both replays switch presentation in each view.
`bane-ogre-approach` and `old-phlan-lizard-patrol-approach` verify the
4× approach sprites at their original anchors and their transitions to
the corresponding dialogue portraits, with presentation switching.
`lizard-wilds-displacer-approach` and `lizard-wilds-stirge-approach`
check both wilderness sprites at their original anchors and through the
transition to dialogue. `mendor-locked-wing` checks 12 new plank, door,
and sky junction tiles across 16 views and 1,936 placements, including
passage through the locked door after Bash. These Chrome replays check
that switching presentations preserves game state and save data.
`textile-hobgoblin-approach` and `wild-cave-ankheg-approach` check
standalone 4× encounter sprites at their original screen anchors.
`kobold-cave-approach` checks the native throne approach from a controlled
slot A checkpoint. Enter advances from the middle to the near frame. The
Chrome replay checks source IDs, placement, unchanged terrain between frames,
and classic/enhanced switching at each distance.

`valjevo-fire-giant-approach` checks both approach distances and
the transition to the close-up, with the same terrain behind both poses.
`new-phlan-east-ward` checks six additional mappings across 16 live
views and 1,936 placements, including three redrawn ceiling tiles.
`new-phlan-covered-market` checks six redrawn cap and doorway
transitions across 15 live views and 1,815 placements.
`new-phlan-market-stalls` checks nine additional tile mappings,
including two redrawn stall tiles, across 27 views and 3,267 placements.
`new-phlan-east-terrace` checks 17 redrawn waterfront and doorway tiles
across 20 views and 2,420 placements. `new-phlan-commission-lane` checks
seven additional mappings to existing civic tiles across 24 views and
2,904 placements. Both Chrome replays check that switching presentations
preserves game state and the save.
`new-phlan-wharf-return` checks three additional dock and building
tiles across 23 views and 2,783 placements with the same switch checks.
`new-phlan-warehouse-square` checks one new tile and one mapping to
existing market art across 20 views and 2,420 placements.
`new-phlan-civic-square` checks nine City Hall facade tile mappings
across 13 views and 1,573 placements. `lizard-wilds-kobold-prisoners`
and `lizard-wilds-pool-dialogue` verify both grove scenes in Chrome.
The captive replay checks that the mutant lizardfolk warning appears
in the journal only after the party releases the kobolds and hears it.
`wild-grove-captive-kobold-approach` and `wild-grove-pool-lizard-approach`
verify the anchored approach sprites and transitions to both grove
illustrations. `kuto-south-passage` checks 16 terrain replacements
across 18 views and 2,178 placements, including the crossing from Podal
into Kuto. All three replays check presentation switching.
`kuto-south-lane` extends that crossing to the approach before the
gnoll encounter, checking three new ivy and doorway tiles across 21
views and 2,541 placements with state and save preservation.
`textile-wight-combat` checks the Wight's ready and animated strike
poses from a controlled wandering encounter checkpoint.
`textile-ghoul-combat` checks the Ghoul's ready and strike poses
from the same checkpoint.
`bane-ogre-combat` checks the ogre's 96×192 ready and animated strike
poses from a checkpoint with increased party HP to reach the strike.
`lizardfolk-east-ruins` checks five redrawn tiles across 16 live views
from the post-duel save, with state-preserving presentation switches.
`lizardfolk-south-gate` checks ten redrawn tiles across 16 live views
from the same save, including 1,936 placements and mode switching.
`old-phlan-lizard-patrol` checks the new full-panel illustration at
the original boarded-door encounter and verifies presentation switching.
`lizardfolk-west-turn` and `lizardfolk-west-turn-short` check two
redrawn ruins tiles across 21 live views and 2,541 placements.
`lizardfolk-outer-yard` checks nine redrawn courtyard tiles across
19 views and 2,299 placements, with state-preserving mode switches.
`lizardfolk-reed-breach` checks three new tiles across 21 live
views and 2,541 placements along the outer yard and reed breach.
`kuto-norris-dialogue` and `lizard-wilds-displacer-dialogue` verify
the new full-panel illustrations at their original encounter prompts.
`kobold-rematch-infantry` checks the 96×96 kobold ready and animated
strike poses during that same battle. `kobold-cave-envoys-rematch` and
`valjevo-messenger-dialogue` verify the new illustrations at the
original rematch and friendly parlay prompts.
`valhingen-zombie-stairs` checks the staircase illustration and all four
idle poses at the original zombie prompt. It verifies the panel fit and
checks that switching display modes preserves the prompt.
`sokal-undead-patrol-dialogue` checks the patrol illustration at its
original prompt. The landing and courtyard replays exercise the mixed
skeleton and zombie patrol across its six original cursor and distance
combinations. Chrome verifies the sprite placement and the return to the
original patrol dialogue. `new-phlan-proclamation-walk` checks six redrawn City
Hall and garden tiles across 15 live views and 1,815 placements.
`new-phlan-north-avenue` checks 20 redrawn shrine and street tiles across
15 live views. `valhingen-grave-claws` checks five distinct poses during
the original grave prompt. That route and `valhingen-skeleton-enclave`
check panel fit and state-preserving display switches.
`valjevo-medusa-dialogue` verifies the charging Medusa at the original
precombat prompt, with full panel fit and mode switching.
`sokal-ceiling-insects` checks the swarm illustration at the original
ceiling encounter, including panel fit and mode switching.
`valjevo-south-service-lane` checks 11 new limestone, rubble, and sky
transition tiles across 16 live views and 1,936 placements.
`zhentil-north-lanes` checks eight new 32×32 tiles and the sky joins
across 17 live views. The two `podal-pitt-*` routes verify the drunken
buccaneer and monster patrons at their original tavern prompts.
The `podal-pitt-monster-patrons` replay also checks the 192×320 goblin
approach sprite at its original anchor. Enter advances to the patrons'
dialogue illustration, and both frames support state-preserving mode switches.
The `podal-pitt-duel-aftermath` replay starts with a controlled veteran
party. It verifies the new aftermath illustration and that the journal
records the fight ending only once the patrons return to drinking.
`mendor-east-court` and `valjevo-dungeon-east-yard` check five new
scenery bindings across 33 live views.
`nomad-veteran-ready` verifies the 96×96 ready pose in the Headman
battle and a state-preserving presentation switch.
`valjevo-south-kitchen-yard` checks six rubble and doorway tiles across
17 live views and 2,057 placements from the existing courtyard save.
`valjevo-west-chapel-corridors` checks 16 redrawn plaster, limestone,
and trim tiles across 16 live frames from the existing checkpoint.
`valjevo-eastern-hedges` checks 11 new tile bindings, including three
redrawn hedge and limestone transitions, across 17 live views.
`bane-east-ramparts` checks 15 new gate, wall, and ivy tiles across
17 live views and 2,057 placements from the temple entrance save.
`valhingen-central-courts` checks 32 new fence, tomb, and masonry
tiles across 28 live views from the native save.
`north-gate-jail-thugs` and `north-gate-thieves-guild` verify both
illustrations at their original prompts and at full panel size.
`old-phlan-south-jail-approach` starts from slot A at (11,13) facing west.
Chrome checks 605 terrain placements across five views and the transition
to the enhanced jail portrait at (10,12), including panel fit and mode switching.
`phlan-ruins-scorpion` checks the ready and reflected strike poses in
the original area 2 fight.
`new-phlan-harbor-lanes` checks 16 individually redrawn water, piling,
and quay tiles across 16 live views and 1,936 placements.
`lizard-wilds-stirge` verifies the ready and reflected strike poses
in the original swarm ambush.
`new-phlan-temple-guard` checks the guard portrait when the temple
turns visitors away, including full panel fit and mode switching.
`new-phlan-jeweler` checks the jewelry merchant at the original shop
prompt. `new-phlan-silver-shop` checks the same merchant presenting
silverware in a dedicated illustration, from the greeting through the
Buy, View, Pool, Appraise, and Exit menu. Both Chrome replays check panel
fit and display switching.
`new-phlan-cleric-trainer` and `new-phlan-thieves-trainer` verify the
class-specific training prompts, distinct portraits, and panel fit.
`valjevo-fire-giant-dialogue` checks the barracks portrait at the
original encounter and through the password dialogue after Parlay.
`zhentil-quarters-guard-dialogue` checks the portrait at the guards’
quarters restriction, including panel fit and mode switching.
`lizardfolk-battle-wall` starts from the Lizardfolk ruin trail slot A
checkpoint (`out/lizard-ruin-route-A.json` in the local replay workspace).
Chrome checks all 45 observed battlefield tile patterns across four
giant-lizard combat turns, including two independent wall tiles outside
the live actor bounds. The check verifies asset URLs, 32×32 dimensions,
and positions on the live battlefield.
`lizardfolk-southwest-trail` checks six new masonry and reed junction
tiles across 15 live views from the unchanged ruin-route save. The final
view verifies the giant lizard sprite separately over all 121 terrain tiles.
`new-phlan-west-garden-lanes` checks 13 new ivy, courtyard, and standard
tiles across 17 live views and 2,057 placements.
`valhingen-tower-wight-dialogue` checks the tower ambush illustration,
original dialogue, edge-to-edge panel fit, and mode switching.
`valhingen-ghoul-ambush` checks the resting ambush illustration and
its original prompt with the same panel and mode switch checks.
`lizard-wilds-displacer-beast` verifies the 192×96 ready and animated
strike poses in the native area 26 battle.
`wild-cave-ankheg` checks the 192×96 ready and reflected strike poses.
The original attack overlaps the selection bevel, which remains visible
through the transparent pixels of the replacement.
`wild-cave-thri-kreen` checks the 96×96 ready and native-facing
strike poses in the original area 25 battle.
`wild-cave-minotaur` and `wild-cave-gnoll` verify the original area 27
battles, separate 96×192 ready and attack frames, and mode switching.
`new-phlan-west-covered-lanes` checks 13 new ceiling, doorway, and
street tiles with 1,936 placements across 16 views.
`buccaneer-captain-dialogue` checks the captain's greeting, original
portrait source and 352×352 replacement, and state-preserving switches.
`buccaneer-guardroom-dialogue` verifies the guards' illustration on the
way to the captain.
`buccaneer-pen-guard-gate` starts from the controlled slot A checkpoint
outside the slave pen. It verifies the brief 160×320 approach at its
native anchor, then the full-panel 352×352 portrait at the challenge and
failed sneak prompts. The replay verifies both display modes and an
unchanged save. The separate `buccaneer-pen-guard-combat` replay verifies
the existing ready and reflected strike artwork on the attack branch.
With the scoped pen bindings loaded, `buccaneer-guardroom-dialogue` and
`buccaneer-captain-dialogue` pass from the captain-side slot A checkpoint
at (8, 12), facing west. The guardroom still selects its chain-mail
portrait, and the captain still selects his approach and greeting art.
`buccaneer-pass-seller` verifies the pass offer and its distinct portrait.
`valhingen-paladin-wraith-dialogue` verifies the paladin's guardian
portrait, the original dialogue, and state-preserving mode switches.
`kuto-west-arcade` follows the original arrival save to the well basin,
checking 35 new arch, rubble, and basin tiles with 1,936 placements
across 16 views and state-preserving mode switches.
`kuto-east-rubble-lanes` checks 29 new rubble, masonry, and doorway
tiles across 10 views, and `textile-north-yard` checks 16 new wall,
ivy, and doorway tiles across 16 views.
`sokal-poison-frog-approach` checks the middle-distance frog sprite.
`valhingen-wight-approach` and `valhingen-wight-tower-approach` check the
near Wight sprite in the crypt and tower. Both sprites use the original
screen anchors. All five replays verify state-preserving mode switches.
`old-phlan-east-lanes` checks six new door and junction details,
with 2,057 placements across 17 views from a position-only copy of
the north-gate entrance save.
`valjevo-giant-snake-approach` checks the middle and near sprites, their
original screen anchors, and all 121 terrain cells across the approach.
`mendor-fighter-dialogue` and `mendor-spectre-dialogue` check the 352×352
illustrations, original dialogue prompts, and state-preserving switches.
`mendor-basilisk-approach` checks the Basilisk's near sprite.
Both replays continue to the new 352×352 dialogue scenes, assert the
original encounter text, and verify that the approach sprite clears to
make way for the illustration.
`pyramid-lizardfolk-vats` checks the area-scoped illustration at the
Yarash vat ambush. All three replays verify state-preserving switches.

`graveyard-northeast-west` and `graveyard-northeast-east` verify 14 new
Valhingen tiles with 1,694 placements across 14 views. The terrain audit
excludes three older frames with skeletons composited over the scene.
The three `valhingen-conjurer-*` routes verify the same 352×352 portrait
on the skeleton, zombie, and wight branches of the original script.
`valjevo-messenger` checks the 96×96 ready and reflected strike poses,
using Aim to select the messenger. The art depicts the dagger from his
introduction. The combat status displays Long Sword.

`valjevo-records-scribe` replays the original chance encounter in the
records building. It checks the scribe artwork at the ambush decision and
compares state and save bytes through both presentation switches.
`valjevo-tower-troll` exercises the ruined tower fight from controlled slot
B. Chrome checks the 96×192 ready pose and reflected claw strike and
verifies the save bytes stay unchanged.
The separate Valjevo tower ambush replay uses a controlled branch fixture
to select the trolls' surprise encounter. Chrome verifies the 352×352
portrait when the trolls charge, preserves the guest state during display
switching, and shows the same illustration at battle entry. The opener
uses caller `a042` of the shared `9a5a` routine, and the battle hold uses
`a052`.
`valjevo-giant-snake` uses controlled slot B on the Valjevo approach with
the alarm running. It verifies both 192×96 snake poses at the guest's actual
combat placements, including the animated lunge and state-preserving mode
switches.
The `valjevo-south-gallery` replay starts from that native tower save.
`valjevo-covered-gallery` and `valjevo-statue-approach` use copies with only
the party's position and facing changed. Chrome checks 4,114 placements
across 34 views, including 12 new tiles for the gallery and window profiles.
The `valjevo-medusa` replay starts just before the trapdoor in controlled
slot B. It checks both 96×96 poses and that the journal records the broken
statues after the party sees them.
The `valjevo-false-throne` replay uses controlled slot B at the false
throne. Chrome checks the 4× approach sprite and 352×352 portrait through
the parlay, including mode switching. It verifies
the impostor clue appears only after his confession. Letting him go adds
the witnessed outcome without marking the final commission complete.
The `valjevo-al-hyam` replay checks both approach distances, mode
switching, the area-scoped portrait, and the entry 30 discovery after
the mage hands over his notes.
`valjevo-al-hyam-release` chooses Let Him Go immediately. Chrome checks
the dedicated 352×352 departure illustration and records that he left.
Both branches save to slot C and have separate reload checks for their
respective journal discoveries.
The `valjevo-tyranthraxus-strike` replay reopens a tower slot B, votes to
attack, and checks the 192×192 ready pose and animated bite in Chrome.
The `valjevo-lower-wing` route uses an area-5 save made after using the
western stairs. Chrome checks 2,057 placements across 17 views and all
46 new 32×32 half-timber and lane tiles.
The `valjevo-north-lane` replay checks 2,299 placements across 19 views,
including 30 new 32×32 tiles. The `phlan-priest-tyr` replay checks the new
portrait through the healing menu. `stojanow-hill-giant` uses a controlled
patrol alarm checkpoint and checks the ready pose and reflected attack.

The `sokal-northeast-keep` replay loads slot D at `14,5 N` and walks the
northeast halls. Chrome checks 3,025 placements across 25 views, using eight
new 32×32 fragments among 31 patterns, and verifies state-preserving mode switches.
The `sokal-smithy-edge` replay uses a controlled slot C at `12,7 E`.
Chrome checks 726 placements across six views, including the new skyline
and ashlar transition tile, and preserves the save through mode switches.

Two Valjevo Castle threshold routes from the controlled slot B checkpoint
displayed the new 32×32 assets across five views and 605 placements, then
entered Tyranthraxus's dialogue. A separate controlled City Hall checkpoint
verified Ulrich's 352×352 portrait during the assault briefing. These Chrome
replays checked that presentation switches preserve the live frame and save.

The `assault-summons` route checks the special Council summons in Chrome
on DOS 1.0 and GOG 1.3. It starts from a controlled slot A at `5,5 E` with
the gate reward and earlier commissions already collected. It verifies
the clerk's dispatch
illustration, switches display modes without advancing the dialogue, and
follows the guard captain back to the WebGL view outside the chamber.

The `assault-briefing` route also checks the escort captain's 352×352 portrait
before Ulrich appears. From a controlled slot A at `5,10 N` with the
native castle summons set, `assault-council-chamber` checks the assembled
Council artwork at the first briefing page, then Ulrich's portrait as he
asks the party to lead the attack. Chrome verified both DOS editions,
including display switching, the return to exploration, and the
accepted commission in the journal. The `castle-halls` and `castle-dragon` routes check
individual threshold tiles before the dragon dialogue. Run `castle-halls`
with a controlled slot B checkpoint at `13,7 W`. Chrome checks all 605
placements across five views, including three in the final audience area,
then checks the enhanced portrait and switching presentation both ways.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_H PATH_TO_CHROME textile-ogre`
from the controlled prison-key checkpoint at `2,15 S`. Chrome verifies the
ogre chief's 96×192 standing and mace-strike sprites, their rectangular
placement, and a state-preserving presentation switch.
The full replay passed from the checkpoint with Alda at 5 HP and Cora at
3 HP. A later checkpoint with both at 1 HP reached the same encounter and
standing sprite, but did not produce an observed strike within the replay.

The `sokal-smithy` browser route loads a party at `10,10 N` in slot C and
checks the 96×96 poison frog crouch and lunge in live combat. It switches
presentation before the attack and checks that the selected save stays intact.

The Sokal landing, armory, patrol, and courtyard Chrome replays require
the live WebGL viewport wherever they compare the native scenery tile
inventory. They cover 18 landing views, 10 armory views, 18 patrol views,
and 23 courtyard views.

The `sokal-patrol-combat` Chrome replay checks the two diagonal wall tips
and the chipped sill return where the diagonal meets the lower wall. All
three 32×32 masonry PNGs load at their guest coordinates as the battlefield
scrolls. The same replay passed the skeleton and zombie guard and strike checks.
It also checks the 96×96 fallen combatant and loose stones at their guest
positions and facings. The artwork inventory links them to `RANDCOM.DAX`,
block 1, frames 5 and 1. The patrol trace no longer counts their visible
fragments among the missing terrain tiles.
The same replay also requests an unavailable combat sprite. Chrome uses
the original pixels in that actor's rectangle and keeps the surrounding
enhanced terrain, other sprites, and combat text visible.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_B PATH_TO_CHROME castle-dragon`
with a castle checkpoint outside the audience hall at `14,7 S`. Chrome checks
seven enhanced approach views, including the audience hall's timber and
window tiles, and the illustration of Tyranthraxus rising from the Pool. It then checks
the 352×352 dialogue portrait and 192×192 combat sprite, including the sprite's
position, facing, and four-cell selection. The test toggles classic and
enhanced in both scenes and checks the guest frame and save stay the same.
The controlled fixture `out/castle-hall-approach-B.json` passed the replay
at `937b969a`, including 30 Enhanced battlefield tile patterns.

Chrome presentation replays leave WebGL enabled during Enhanced play.
Exploration checks require the WebGL canvas when camera data is available
and continue to validate the guest's tile inventory independently. Classic
display switches and original fallback presentations still have checks.
The same replay checks the 192×192 bite at its position in the live
combat animation and confirms that the enhanced combat panel shows the hit
and then the fire damage as separate reports. With
`POR_TRACE_BATTLE_TILES=1`, it captured 22 frames. The replay checks that
all 30 observed terrain patterns resolve to enhanced tiles and that the
tiles around the selected dragon load in Chrome at their guest positions.
The native draw report traced those 30 patterns to the original terrain
blits.
The combat sequence also verifies six 96×96 standing party poses at
their native positions and facings. The `CHEAD.DAX` and `CBODY.DAX`
combinations are 73/93, 73/81, 69/90, 0/3, 2/5, and 74/88. The matcher
preserves weapon pixels behind transparent portions of the head overlay.
For sprites overlapping scenery, it checks the visible background against
the original offscreen terrain before replacing the sprite.
Each of those six combinations also has separate 96×96 action art.
Chrome verifies four brief party strike frames before the dragon's bite,
checking the asset, original position, and facing of each. The flail and
teal-robed action poses passed native bitmap matching in both facings.
With `POR_WRITE_ENVIRONMENT_TRACE=1`, it exports all eight approach views
for the art inventory, including the positions of the six new hall tiles.

Chrome checked the complete guest board, menu row, and browser status
at 754×480, 960×540, 390×620, and 1366×768 in both display modes.
Switching at these sizes preserved the same guest frame and save.

Headless Chrome verified the presentation button and F10 against the live
browser runner. A reloaded City Hall save displayed both palettes and let
the journal remain open during a switch. A separate run switched palettes
during the original Tyranthraxus fight. Each switch retained the same guest
frame sequence and left the save file byte-for-byte identical.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_A PATH_TO_CHROME`
with a party saved at New Phlan's west gate before the kobold encounter.
The test uses the browser's default artwork configuration.
The shared artwork loader requires exact 4× source dimensions. The
title canvas is 1280 by 800 and a prototype viewport is 448 by 480.
Synthetic PNGs verified that original-size versions are rejected and
the exact 4× versions load.
The artwork palette audit counted 618 visible RGB colors across the
241 loaded replacement PNGs. The count is informational. The enhanced mode targets a VGA pixel-art style.
For every kobold-route exploration view, Chrome checks each tile's source
ID, 32-by-32 PNG dimensions, and position against the guest tile trace.
The browser assembles those views from individual replacements. The prototype full-viewport overlay was removed. The combat check
requires both facings of the kobold's own sprite and verifies their
placement at both browser widths.
The combat menu check compares each web-font glyph and color against the
guest menu cells after switching back to enhanced mode at both widths.
The Chrome replay injects a prototype viewport image into the live
battle frame and verifies that individual sprites take precedence.
A frame with no individual replacements can use a prototype viewport
image. The replay checks fallback from a failed viewport image and from
a failed sprite, and verifies that the next frame can display enhanced
artwork again.
The replay verifies 22 Slums views assembled from 121 individual 32Ãƒâ€”32
PNGs per view. It checks alignment, pixelated scaling, and the loaded web
font at 430px and 1100px. The button and F10 preserve the complete guest
frame and save bytes during exploration, in the journal, at the kobold
dialogue, and in combat. The journal retains focus on Return to game.
The verifier exports the 22 Slums views as a local tile trace. Feeding
that trace into the route artwork tool accounted for all 2,662 placements
and found a 32Ãƒâ€”32 replacement for all 34 distinct patterns on this replay.
The report also exports all 34 original 8Ãƒâ€”8 references from the live
framebuffer, including 11 patterns with no exact match in the tile archives.
Older hash-only traces still show references when an archive match exists.
The orc outpost replay produced 28 captures. Inspecting the original frames
identified an orc overlay in frame 20 and a blank transition in frame 22.
Omitting those two frames leaves 68 environment patterns, of which 40 have
replacements. The HTML checklist links each pattern to its full guest frame.
The new soffit and two sloped wall junctions bring the outpost route to
43 of 68 patterns. Chrome loaded all three 32Ãƒâ€”32 PNGs as individual tiles
while walking from the Slums gate to the outpost. The sloped joins and
ceiling were inspected together in the assembled corridor view.
The remaining 25 doorway, rubble, and material junction tiles bring the
recorded outpost environment to 68 of 68 patterns. Six earlier rubble
tiles were redrawn to match the new stonework. Chrome found all 25 new
PNGs in 19 movement frames, each assembled from 121 individual tiles.
The 22-view kobold presentation and switching replay also passed.
The `kobold-cave` replay uses a separate controlled slot B at the cave fork.
It verifies the 352×352 illustration through the Large / Small / Exit decision
and checks that switching presentation preserves the save. The fork appears
in the journal only after the party finds it.
The `kobold-cave-wyvern` replay uses controlled slot A inside the large cave.
Chrome checks both 192×192 combat poses, including the animated strike, and
verifies that switching presentation preserves the game state and save.
The `kobold-cave-troll` replay uses a controlled slot A near the throne room
and checks the 96×192 ready pose and reflected strike during combat.
The `kobold-cave-royal-guard` replay starts from the same throne-room
checkpoint and checks the Kobold Leader's 96×96 ready and strike poses.
The `slums-fortune` replay uses controlled slot B, checks the fortune teller's
352×352 portrait, and reveals her journal clue only after the party pays for
and hears the reading.
The `slums-potion-booth` replay from controlled slot B verifies the merchant
portrait and journal discovery. The package handoff has a dedicated
illustration that fills the picture panel and clears when the party moves.
`slums-potion-booth-reload` opens the save made after the handoff and checks
that the package discovery survives without marking it delivered.
The merchant's area-scoped composite also lets the Stojanow wagon
trader keep his own portrait.
The `buccaneer-captain-combat` replay uses controlled slot A at `8,12 W`
and checks both 96×96 sword poses in the captain's quarters fight.
The `buccaneer-guard-combat` replay uses the same checkpoint and checks
the guards' 96×96 ready stance and sword thrust alongside the captain.
The `sokal-elven-scout` and `sokal-elven-scout-search` replays use controlled
slot C with the parchment clue absent from the journal. Chrome checks the
scout illustration, the two paths, and that the parchment clue appears
only after the search reveals it. The search replay also switches modes
while the parchment is open and verifies that the web-font layer leaves
the runes inside the picture untouched.
The `pyramid-cistern-loop` replay starts in the lower Pyramid in slot A.
Chrome checks 2,541 placements across 21 views, including three new cistern
tiles, and verifies that the presentation switch preserves the save.
The same Chrome replay passed with encounter anchors read from the Slums
manifest. A framebuffer check moved the middle kobold pose to a different
anchor and area, confirmed the old area's background was discarded, and
verified restoration from a clean view in the new area.

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

Run `node tools/verify-fresh-party.mjs --sokal-patrol-word-checkpoint PATH_TO_SLOT_F`
from the fresh mixed party's Thorn Island landing. The party finds the
parchment and tries either its password or an unrelated word at the
first undead patrol. The journal records passage only after acceptance.
On rejection, it points back to the parchment and the script starts
combat. Without a witnessed parchment, the journal refers to the accepted
word without spelling it out.

Append `--reject-word` to
`node tools/verify-fresh-party.mjs --sokal-patrol-victory-checkpoint PATH_TO_SLOT_J`
to continue beyond the rejection with the reinforced party. The strict
replay wins that patrol for 40 XP per character, saves and reloads with
the rejection recorded, then gives the correct word to a later patrol.
It wins the smithy battle for 31 XP per character and recovers the hidden
armory equipment. Both patrol outcomes come from the original script.
Pass `--equipped` with the slot A landing save to run the same route
after trading armor to the recruits.

A controlled checkpoint placed the mixed party one step from Ferran's altar.
From that save, the chapel replay walks back to the entrance at `8,6`,
triggers the chapel description, tracks the Sokal objective, and
saves. After reloading, it confirms that a direct step south from
`8,8` is blocked, then follows the journal's eastern detour to
the altar. The pale figure appears at `8,10`. Its identity and
the departure word stay hidden until the party learns them.
Ordinary input triggered the pale form, used Parlay and LUX, and chose to
tell the truth. The original script taught SAMOSUD and completed the
commission. Saving at the altar and reloading in the normal runner verified
the ready-to-report status and the journal's password and return guidance.
The lie branch verifies that Ferran fades without teaching the departure
password or completing the commission. After saving and reloading, the
party steps away and returns to the altar, speaks the same word, and
answers truthfully. This recovery leads to the normal council reward.
The wrong-word branch answers with
an unrelated word. It saves and reloads the vanished figure outcome,
then leaves and reenters the altar square to verify that the encounter
stays closed. The journal points to an earlier save and keeps Ferran's
identity and the departure word hidden. The checkpoint bypassed the
route to the altar.
The replay also reloads after a lie and gives the wrong word on the next
visit. The journal remembers both events and advises restoring a save
from before the failed attempt.
On the successful branch, the objective changes at the south pier when
the party sees the boat offer. It changes again after landing in New Phlan
and directs the party west toward City Hall.
Run `node tools/verify-fresh-party.mjs --sokal-ferran-checkpoint PATH_TO_SLOT_F`
from one step north of the altar, facing south. The verifier plays the
wrong-word and lie branches from the same checkpoint, then follows the
recovered truthful branch through the council reward and reload.
The journal checks against the original script also cover the spirit's
floorboard clue and the separate discovery of the defenders' diary.
The objective points to journal entry 3 only after the party finds it.

From the truthful altar save, the party walks through the chapel and
past the undead using SAMOSUD, exits through the southern gate, and
takes the boat to New Phlan. The clerk awards 1,308 XP per character.
The journal shows reward pending during treasure distribution and turned
in after leaving it. Reloading slot H at the clerk verifies Alda's 1,313
total XP and 46 platinum and the turned-in Sokal commission.
Run `node tools/verify-fresh-party.mjs --sokal-altar-checkpoint PATH_TO_SLOT_G`
with the truthful altar save.
Add `--continue-to-auction` to either Ferran or altar checkpoint command
to continue in the same scratch save directory. The replay uses the
newly earned Sokal turn-in save, completes Podal Plaza, and reloads with
both commissions turned in and the Textile House commission accepted.
Use `--through-textile-prison` on the Ferran, altar, or Podal checkpoint
to continue through the Textile House with the same party. This route
uses manual Sleep targeting to win the courtyard and prison fights.
It reloads the party's recovery and equipment before reaching Grishnak's
temple. The prisoner objective matches the original menu sequence:
choose **Free**, then **Unlock**.
Pass the emitted slot I to the Chrome `textile-temple-native` replay.
It verifies 363 terrain placements across three views, Grishnak's
approach sprite and portrait, and the live quest guidance at the altar.
Grishnak's white-haired, staff-bearing approach sprite is selected by
the original script position. The ordinary Textile House hobgoblin
replay still uses its separate sprite from the shared original frame.
It continues into combat and checks the two 96×96 blue and ochre
swordsmen at their original grid positions. With both sprites separated
from the terrain, the opening combat trace matches all 93 captured
battlefield terrain cells.
The replay also checks the ochre swordsman's enhanced strike during
the battle. The blue, ochre, and plum strike images match their original
attack pixels in either facing, including when the actor is selected.
Grishnak's 96×96 raised-staff pose matches CPIC2 block 130 in both
facings in the Textile House. The opening battle replay verified her
standing pose and did not reach a frame using the raised-staff pose.

The Podal Plaza replay starts from that post-Sokal save at the clerk.
It buys westbound passage, walks from the landing to the north entrance
at the western edge of Phlan, and enters Podal Plaza in disguise. After
the entrance choice, reloading verifies that the journal directs the
party east along the entrance lane and south toward the auctioneer.
After the party observes the wand exchange, it saves and reloads with the
commission ready to report. It walks back to the landing, takes the
return boat, and collects the clerk's reward. The journal then marks
the commission turned in. Run this segment with
`node tools/verify-fresh-party.mjs --podal-checkpoint PATH_TO_SAVE_JSON`
with `POR_QUICK_STEPS=5000000` to reproduce the historical courtyard win
and check its downstream branches. The default watchdog no longer produces
that assisted win (see below).
The journal check against the original auction dialogue also verifies the
onlooker's Wand of Illumination claim and the ending where the buyer goes
unseen. The completion flag alone leaves the report directions general.
Use a save at the clerk with Sokal turned in and the auction accepted.
The replay copies that save to a scratch directory.
Use `--auction-only` with `POR_REQUIRE_UNINTERRUPTED_COMBAT=1` and the
default budget to verify the westbound trip, witnessed exchange, council
reward, and next commission. The replay verifies that the exchange is
hidden before it happens, appears in the report directions, and is still
in the journal after collecting the reward and reloading. It also checks
the tracked objective at the ferry menu and at the plaza entrance, where
the journal first records the options to disguise the party or sneak in.
From the same plaza checkpoint, the replay tries to leave during the sale.
It verifies that the cancellation is ready to report before combat starts
and that the saved checkpoint can still be used for the witnessed exchange.
The replay also chooses Listen to Comments and waits for the winner. The
journal attributes the Wand of Illumination claim to an onlooker and adds
the witnessed exchange without claiming a positive item identification.
After the auction turn-in, the replay takes the east door to Cadorna,
hears where his family's treasure was hidden, and reloads with the
Textile House commission accepted. The party takes the westbound
boat again, uses the south entrance, and reaches the scorpion
encounter inside the Textile House district.
Saving at the south entrance and reloading changes the encounter
sequence in the tested run. The party reaches the drum ambush at
(4,10), clears Quick, and casts Sleep at a hobgoblin before the
party-defeat screen. The ambush dialogue gives the journal a warning
for the courtyard. Recovering the treasure through ordinary play
still needs verification.
After the defeat, the replay reloads at Cadorna's office, buys banded
mail and shields with the party's rewards, and readies the new gear on
all five fighters. It verifies each inventory at the shop and each
fighter's two-point Armor Class improvement after reloading back at
the Textile House entrance.

The replay also hires a Theurgist and a Curate at the arena, returns
with both recruits, and uses the Curate's Bless before the courtyard.
The guest's spell display confirms the buff. The fight ends in
victory for 94 XP each, with four fighters at 0 HP. Reloading slot J
preserves the courtyard discovery and the journal directs the party
toward the western building.
The Curate casts Cure Light Wounds on Alda after the fight, raising him
from 0 to 5 HP. The party crosses the courtyard and finds Skullcrusher's
inscription on a north wall. Reloading slot G verifies Alda's HP and the
inscription in the journal. Skullcrusher's secret-door clue stays hidden
until the party learns it.
At the next locked door, the Theurgist casts Knock and the party saves
past the door in slot B. Reloading confirms Knock is spent and the
second locked door offers Bash. Bashing it opens the way to the next
hobgoblin encounter.
An alternate branch from B uses the Curate's two remaining Cure Light
Wounds spells to bring Brin and Cora from 0 to 5 HP. It saves outside the
second door and confirms that both fighters retain the healing on reload.
That branch continues through five hours of rest at the door after the
Curate selects Bless and three Cure Light Wounds spells. The Curate
then casts Bless and heals Enna from 0 to 5 HP and Mira from 3 to 5 HP.
Reloading slot D verifies their HP. Choosing Parlay at the prison door
draws a battle cry and starts combat. A separate reload puts the Curate
first through Encamp Ã¢â€ â€™ Alter Ã¢â€ â€™ Order, then wins the prison fight for
63 XP each and takes a long sword from the loot. The party bashes the cell door, finds the captive and entry
47, and speaks with him. Tracking Cadorna's commission in the journal
directs the party to the captive's padlocks, with the secret-door clue
still hidden. Trying Unlock without a key adds a search objective, and
reloading slot E preserves it. From the cell, the party returns north
through the guards' room and a locked door to reach Grishnak's temple.
The encounter starts through original play. The original treasure table
for that fight contains the brass key, and victory remains unverified.
The journal now checks the party's live inventory using the item code
from the original prison script. Once the party has met the prisoner,
carrying the key changes the objective to Free, then Unlock. The
objective is recalculated on reload and the key prompt clears once the
prisoner is freed. Run
`node tools/verify-fresh-party.mjs --textile-prison-key-checkpoint PATH_TO_SLOT_E`
to compare the original keyless slot with the controlled copy.
Append `--through-ogre` to equip Skullcrusher, reload his clue, and follow
it through the secret door. The replay verifies that the journal switches
to the ogre chief objective only after the party encounters him.
With the resulting controlled slot H, `textile-ogre --approach-only` checks
the 96×260 approach sprite over all 121 enhanced tiles in Chrome.

The same keyless slot can replay the original Pick Lock, Break Chains,
and Attack choices with
`node tools/verify-fresh-party.mjs --textile-prison-alternates-checkpoint PATH_TO_SLOT_E`.
The first two choices leave a key-search objective. Attack records the
prisoner's death and directs the party to search the western textile
building for Cadorna's treasure. Reloading slot D preserves that outcome
and keeps the secret-door clue hidden.

To verify the downstream branch, the replay makes a separate copy of slot E
and supplies only the brass key from the local DOS treasure table. The party
dismisses the Theurgist to open a slot, frees the captive, and chooses Parlay
and Nice before recruiting Skullcrusher. Reloading that copy's slot F verifies
his place in the party and the newly learned secret-door direction.
Declining recruitment in a separate replay records that the freed prisoner
left and keeps his clue hidden after reload. The translated ECL checks also
verify that the choice prompt stops being the journal objective once either
box outcome is recorded, even when the original discovery is still in the log.
Alda trades the looted sword to Skullcrusher, and Cora trades him banded
mail and a shield. Readying them gives Skullcrusher AC 1 and a long sword.
Reloading the controlled copy's slot G verifies the armor and HP.
The Curate then memorizes Bless, four Cure Light Wounds spells, and two
Hold Person spells in the cell. After resting, the Curate blesses the party
and heals Brin, Cora, Enna, and Mira. The replay checks the remaining Hold
Person spells and reloads the recovered party from slot H.
The party then follows his directions to the east wall, enters with
Search active, and reaches the ogre chief. The tracked objective advances
at each discovery. In this fight, the five-million-instruction Quick
watchdog interrupted two enemy turns in battlefield redraws. Replaying
the same inputs with `POR_QUICK_STEPS=20000000` let those turns finish
without recovery. The party still lost. The courtyard replay also ended
in defeat with this diagnostic override, so its existing victory does
not establish a win without watchdog intervention.
The party replay now summarizes watchdog interventions. Set
`POR_REQUIRE_UNINTERRUPTED_COMBAT=1` for a run that fails on the first
intervention and reports the preceding input and displayed combat state.
With an explicit `POR_QUICK_STEPS=5000000`, the strict Podal checkpoint
run stops on input 53 (`q`) of the courtyard replay. The default watchdog
now gives the original calibrated delay bounded extra time. The same
courtyard inputs end in defeat with no watchdog intervention.
`POR_TRACE_QUICK=1` logs the guest budget location and translated call
stack before rollback. The courtyard trace expires at `0512:53E1`, in
the executable's calibrated delay loop called by overlay 25 at `2000`.
That trace is distinct from the ogre-room expirations in the redraw code.
The reinforced party has since won an uninterrupted courtyard replay.
After Bless, switch Mira to manual control on her first turn and target
the hobgoblin leader with Sleep. The battle awards 54 XP per character,
and slot J reloads with the drum silenced and the discovery in the journal.
Run `node tools/verify-fresh-party.mjs --textile-courtyard-checkpoint PATH_TO_SLOT_F`
with a reinforced party save at the district entrance. The same run now
heals Mira, Brin, and Cora after the victory, rests to prepare Sleep again,
and records Skullcrusher's mark. The Theurgist opens the first lock with
Knock, and slot B reloads outside the prison with Mira's Sleep ready.
The party blesses again, moves the Curate to the front, and has Mira cast
Sleep on the leader with a long bow. The prison battle awards 94 XP each.
The party takes five long swords, reaches the prisoner, and tries the padlocks.
Reloading slot E confirms the key-search lead with the secret-door clue
still hidden. From slot E the Curate rests, heals four characters, and
prepares Hold Person. Alda, Brin, Cora, Dorn, and Enna ready the looted
swords and verify that all five remain readied after reloading outside the
temple. Mira then prepares Sleep while the Curate
prepares Bless and four cures in the same rest. The second healing round
raises Alda and Cora to 6 HP and the Curate to 15 HP before the party
reaches Grishnak. The replay also approaches through the east entrance at
`3,11` and verifies that the tracked journal names Grishnak after the
party encounters her. Quick combat with alternate formations and the
tested manual Sleep openings still ended in defeat. The southern entrance
replay also verifies Enna's manual Aim and Guard commands. Grishnak is
three squares away, so Aim offers no Target command for Enna's sword.
Moving north prompts Enna to confirm an attack on an ally. Declining
preserves all nine movement points. Moving south to a free square costs
one point, and Guard then hands control to Brin. In a separate replay,
Alda and Brin took the prison guards' long bows and readied them. Brin
could aim at Grishnak from one square away, but Aim offered no Target
command with that loadout. The Podal checkpoint replay now verifies Brin
can buy and ready a long bow and ten arrows in New Phlan and retain both
after reloading. In a diagnostic copy of the temple save, the shop-bought
loadout and the looted bow with those arrows both left Target unavailable
in the tested opening. Attempts to reposition with the looted bow did
not open a shot. The checkpoint check
fails if the watchdog intervenes. The recruitment
checks still use the historical checkpoint and the supplied brass key.

Run `node tools/verify-fresh-party.mjs --textile-grishnak-checkpoint PATH_TO_SLOT_I`
with the party outside the southern temple door at `2,13 N`. This
replay prepares Mira's Sleep and checks that the tracked commission
directs the party north through the guards' room. After hearing Grishnak
at the altar, the objective switches to checking the battle loot and
returning to Unlock the padlocks. Skullcrusher's later clue stays hidden.
The replay verifies Grishnak starts at 24 HP and AC 5 and runs Quick to
the defeat screen.
At input 76 a fixed 20-million-instruction limit still interrupts an
enemy turn in the original calibrated delay at `0512:53E3`. The default
watchdog now budgets calibrated delays separately from battlefield
redraws. The same replay finishes with zero interventions. Winning the
battle and acquiring the brass key through this route remain open.
With `--healed-sleep`, the temple checkpoint first heals the party and
prepares Mira's Sleep. The replay takes manual control of Mira, targets
Grishnak, and verifies that the cast leaves her at 24 HP without a
helpless marker. The fight still ends in defeat without watchdog recovery.
The journal's post-victory objective was checked with the translated ECL
setter and the original temple script. The battle points to treasure block
38, which contains the brass key. The verified victory flag shifts the
objective from fighting Grishnak to checking that loot and returning to
the prisoner. The live encounter check keeps the victory hidden before
combat. Claiming the key in a live victory remains open.

The translated ECL setter check also passes the sealed and opened box
states through the same journal profile used by the browser. The
objective updates when the box state changes during an accepted
commission. Restoring the earlier snapshot restores the sealed-box
directions.
The same profile check verifies that seeing Cadorna's confrontation
refines an already closed commission to show that he left without paying.

The Stojanow Gate profile check uses the original wagon, toll demand,
payment, and garrison dialogue in order. Each discovery updates the
tracked objective. Setting the original gate capture flag through the
translated ECL setter advances the objective to the council clerk.
The profile check also covers being turned away, being exposed before
entry, and encountering the bugbears waiting inside after payment.

A separate controlled Sokal Keep test set only the keep-clear flag using the original
ECL setter. From there, play through the original runner verified that the
harbor master offers new destinations as soon as the keep is cleared, and
that the journal waits for the clerk's reward flow to finish before marking
the commission turned in. This test bypassed the courtyard battle.

### Combat replay after removing turn recovery

The browser runner now lets the translated combat routine finish each turn.
The earlier per-turn budget, memory rollback, and enemy-turn skip were
removed. The replay that targeted the tenth aim selection with Mira's Sleep
from the mixed party's unedited Sokal landing save previously tripped that
budget in overlay 31 at 05C7. The same inputs reached the ordinary party
defeat screen after removal. That run verifies turn progression and does
not establish a courtyard victory.

The local HTML inventory was regenerated with classic comparisons for all
914 shipped tile overrides, including 56 battlefield tiles. The audit
combined exact archive pixel matches, runtime tile traces, and two classic
screenshots. Every imported tile matched the
SHA-256 hash in its runtime key, and every classic preview measured 8×8.
This measures comparison coverage for the shipped override set.

Valjevo terrain replays check the new hall threshold, upper hall turn,
and hedge corner across 15 views and 1,815 placements. The merchant wing,
merchant branch, and merchant west routes cover 30 views and 3,630
placements. The kitchen jamb and lower gallery add five and ten views
respectively. Each replay checks presentation switching and save preservation.

The Valjevo chaplain and forge smith replays check their new approach
sprites at the native anchors before continuing into dialogue.
`bane-captive-goblin-approach` checks the transition to the captive
illustration, and `bane-orc-guardroom-approach` verifies the guardroom
sprite before combat.

`old-phlan-mutant-lizardfolk-combat` and `old-phlan-lizardfolk-combat`
check separately scoped ready and strike poses for the mutated and
regular lizardfolk. `slums-mage-combat` verifies the ready pose in the
potion-commission encounter and checks that it never uses the Valhingen
mystic strike override. In 183 captured combat frames, two tile fragments
matched parts of the mage strike record, but no full pose matched.
`slums-mage-wand` uses the durable slot B checkpoint and verifies the
96×96 enhanced wand pose during the guest's original wand-use report.
The guest still draws the standing pose during that report. Enhanced mode
uses the companion pose for that action frame, then returns to ready art.

`buccaneer-pen-loop` checks 11 picket, railing, and timber tiles across
16 views as the native clock crosses midnight. `stojanow-west-rampart`
checks nine wall and coping tiles across ten views before the upstairs
decision. Both replays verify state and save preservation.

`valhingen-efreeti-combat` uses a controlled checkpoint with the native
bottle in the party inventory. It checks the summoned efreeti's ready
pose and reflected strike in the vampire fight, using the same art as
the Kobold Cave encounter. Both presentation modes preserve the save.

`new-phlan-arena-rolf` verifies Rolf's 96×96 ready pose and animated
axe strike in the native duel from a fresh-party checkpoint.
`valhingen-crossway` checks two new graveyard tiles across five views
and 605 placements before the skeleton encounter. Both replays check
that switching presentation preserves live state and the save.

`valhingen-grave-rows-north` and `valhingen-grave-rows-south` together
check four new graveyard tiles across eight views and 968 placements.
Both routes end before the skeleton encounter and check save
preservation when switching presentation.

Valhingen's west arch, north and south gravestones, east memorial,
north and south memorial turns, and south memorial replays cover 48
views and 5,808 placements before the encounters. The Lizardfolk bank
arch and keep rubble replays cover 22 views and 2,662 placements.
`stojanow-gate-coping` checks 484 placements across four views.

`new-phlan-arena-master-approach` and `new-phlan-city-watch-approach`
check the original encounter anchors. `new-phlan-harbor-city-watch`
checks the Go/Stay portrait. The arena and harbor Watch combat replays
check the fighter, aide, and auxiliary ready and strike poses. Both
encounters use the same artwork with mappings for their own sprite IDs.

`new-phlan-rolf-tour` checks the opening portrait and its removal
at the Temple of Tyr stop. `new-phlan-outbound-ferry` checks boarding
in New Phlan on both DOS editions. Start from slot A at `11,2 N`
before speaking to the harbor master. The replay gets the free Sokal
ticket, walks to the pier, observes both Enhanced animation phases,
and continues to the Sokal landing caption.
`sokal-keep-departure-ferry-phases` checks boarding at the keep, the two
Enhanced animation phases as they appear, and the return to New Phlan.
It passed on both DOS editions using the same slot C fixture. These
replays check presentation switching and save preservation.

`buccaneer-east-run` checks five new fence and corner tiles across
21 views and 2,541 placements. `nomad-inner-tent-lane` checks 11 new
canvas, foliage, and doorway tiles across 13 views and 1,573 placements.
`stojanow-tower-aide-combat` checks the 96×96 ready and longsword
strike poses. `textile-ogre-war-chief-approach` checks the sprite at
its original anchor on both dialogue pages.

`new-phlan-tavern-spinner` and `new-phlan-tavern-brawl` check both new
illustrations at their original prompts. The brawl replay checks the
portrait through the introductory prompts, then verifies the enhanced
battlefield and five visible attack reports, including misses and damage.
With portrait decoding held in Chrome, Enter leaves the pending prompt
in place until the portrait is visible and the player presses Enter again.
The arena and harbor Watch mage
replays check the shared ready sprite. Neither replay observed a native
mage strike. `stojanow-west-watch` and `buccaneer-stockade` check 12 new
tiles across 19 views and 2,299 placements. All six replays verify
presentation switching and save preservation.

`yarash-study` verifies the far, middle, and near approach sprites
at their native anchors, then the parlay portrait from the fountain
shutdown save. `podal-robed-orc-combat` and `podal-pitt-duelist`
check both ready and strike poses in the native shrine fight and duel.
The Buccaneer captain's hall, pen spur, and east and south pen court
routes verify 5,203 placements across 43 views. The pen routes cover
day and night. These replays check presentation switching and saves.

`slums-ohlo-study-approach` checks the writing-stand sprite through
the potion directions and verifies that the journal records acceptance.
`new-phlan-innkeeper` checks the lodging portrait and its removal when
the party declines. The Podal recruit replays check both orc and ogre
combat poses. The ogre checkpoint uses higher party HP to reach the strike.
The Buccaneer guard approach and side gate replays cover 40 views
and 4,840 tile placements. These replays check presentation switching
and save preservation.

The Pyramid side-cell, back-cell, and braced-passage replays check
eight new tiles across 55 views and 6,655 placements.
`mendor-storeroom-kobold` and `valjevo-outer-sentinel` check the
native combat poses and strikes. The sentinel replay starts from a
checkpoint staged one tile before the encounter.
The Slums ringleader replay checks both the gold dispute and leaders'
gathering. The Sokal courtyard replay checks the raider at its original
anchor. `wild-cave-wyvern-approach` checks the approach and close-up.
All of these replays verify presentation switching and save preservation.

The Pyramid inner-court and inner-return routes check seven new tiles
across 68 views. The Old Phlan locked lane and the Textile House
passage into Mendor's Library check nine new tiles across 22 views.
`swamp-giant-lizard-approach` checks the approach and charge
illustration at their native prompts. The false throne thief and
impersonator replays check their own ready and strike poses within
the same battle. The Slums goblin lesson and feeding-room kobold
replays check the instructor sprite and the meal illustration.

The Mendor waterfront routes check 22 new tiles across 44 views.
The ruin doors and east and south ruin crossings check seven more
tiles across 36 views. The Slums orc clash uses the same close-up in
the papers dispute, home confrontation, and guard interception.
The goblin lesson and both hobgoblin ringleader replays check the
transition from approach to close-up. The Valjevo outer patrol replays
check the hill giant's club and captain's longsword strikes in the
same fight. These replays preserve game state and save data during
presentation switches.

The Slums trade-row, shop-frontage, and side-arcade replays check 47
new tiles across 52 views, including doorways and covered passages.
`valjevo-forge-smith-combat` and `valjevo-forge-fire-giant` check both
combatants' ready poses and reflected sword strikes in the same forge
fight. All of these replays check game state and save preservation
when switching presentation.

`slums-guild-corners-potion` and `slums-guild-corners-grain` check
two new tiles across 20 views. The Stojanow tower warning, tower lanes,
and guard wing replays check 13 new tiles across 56 views, including
the tower warning acknowledgements. `textile-hobgoblin-line` and
`sokal-hobgoblin-line` check each area's 96×96 infantry ready and
reflected strike poses in its native fight. The Podal recruit leader
replay checks the longbow ready pose from the increased-HP checkpoint.

The New Phlan landmark, pier, south market, and envoy replays check
47 views around the inn, tavern, waterfront, market, and gate.
The Valhingen Juju, staircase zombie, and enclave skeleton replays
check their own ready and strike poses. The Sokal courtyard orc and
Slums papers-dispute orc replays check both combat poses in each fight.
The Podal shrine recruiter replay verifies the approach and transition
to the recruiter portrait. The Phlan Ruins scorpion replay checks the
sprite at the original encounter anchor.

### New Phlan presentation regressions

Run the opening from character creation with the original game data installed.

```powershell
node tools/verify-slums-presentation.mjs - PATH_TO_CHROME new-phlan-rolf-approach
```

The verifier checks all 121 dock tile placements, the three approach sprites
in order, and the close-up filling the portrait panel. The same fresh game
continues through seven tour stops, the City Hall approach and entry, and
the council guard's dedicated halt portrait. At each tour stop it checks all 121 enhanced
tile placements before pressing Enter. After accepting the guard's request
to leave, it checks the enhanced hallway on the first frame at (4,5) facing
north and verifies a state-preserving mode switch there.
When the close approach PNG is unavailable, the replay checks that the
original sprite rectangle fills the same position and size over all 121
enhanced scenery tiles, with the web font still visible.

`new-phlan-council-entry` uses a controlled slot A with Sokal complete.
The journal gains the Sokal entry after the clerk announces the reward.
It shows reward pending in the treasure menu and turned in after sharing
and exiting. The replay checks that the checkpoint stays unchanged until
the party saves through Encamp. Pass the emitted slot A to
`new-phlan-council-reward-reload` to verify the Sokal turn-in, the Slums
and records offers, and the accepted Podal auction commission after load.

Pass a slot A checkpoint in the dueling room at (7,2) facing west to
`new-phlan-building-exit`. The replay verifies the enhanced street at (5,1)
while the exploration menu is absent and before the next Enter, then checks
the same tile placement after advancing through the transition. The browser
recognizes the output of the original scenery draw routine during this pause.
The replay starts with a separate journal profile, loads slot A through
the native menu, and opens Journal from Encamp. It checks that the loaded
slot's clues are present and that the prior profile's clue is absent.
The replay opens the journal before Enter, checks the 121 enhanced tiles
behind it, and switches display modes. Closing the journal restores the
same guest frame, text, and tile placements.
It also adjusts the Audio slider while the doorway is paused, closes the
panel, and presses Enter through Chrome to advance the original prompt.

The `new-phlan-south-shop-exit` replay starts from slot A at (9,11)
facing west. Chrome verifies the shopkeeper portrait at the offer and all
121 enhanced street tiles immediately after declining, before pressing Enter.
The replay checks 29 tile patterns across six views and preserves the save
through mode switches. A separate check at the offer requests an unavailable
portrait PNG and verifies that the original picture still fills the enhanced
picture panel while the web font remains visible.
The default pack emits no shopkeeper fallback. With the replacement
deliberately omitted, the trace records the matching source candidates
and the shopkeeper's offer. Both replays verify the scenery at the exit.
`new-phlan-south-shop-menu-exit` accepts the offer, then uses Exit from
the shop menu. It verifies the same 121-tile Enhanced street immediately
at the doorway pause and after Enter.

Three more slot A replays exercise building exits with the browser's
default art packs. `new-phlan-west-shop-exit` starts at (12,8) east,
`new-phlan-training-exit` at (5,1) west, and
`new-phlan-tavern-back-exit` at (14,9) south. Chrome verified all 121
individual enhanced tiles in each of nine frames per route, including
the prompts before the exploration menu returns. Each replay also
checked that switching presentation preserved state and save bytes.

The `new-phlan-canal-room` replay starts from slot A at (6,1) facing
north. Chrome checks all 2,904 placements across 24 first-person frames
using 63 tile patterns. The route turns inside the room, walks out, checks
both ends of the north passage, and returns to (6,1) facing south.
Switching modes preserves the save.

The canal-room replay also measures the WebGL viewport in Chrome at
375, 768, and 1100 pixels wide. It checks the 4:3 display ratio and that
the canvas fills all four edges of the picture opening. The 2,904 tile
placements are checked separately against the native inventory.
Routes using the shared scenery verifier require a live WebGL viewport
for each counted scenery view. The native inventory check still compares
all tile IDs and positions.

The `new-phlan-arena-quick` route starts from the council checkpoint at
(6,5) facing east and uses Alda for the arena duel. Chrome checks the attack
and damage report before choosing Quick, then verifies that one Q displays
subsequent misses and damage and stops at the original Continue Battle
choice. The test simulates an interrupted poll and a client reconnect.
Chrome retries, renders the choice, and keeps the same prompt and save
bytes when switching between Classic and Enhanced.
The replay allows up to 90 seconds for this sequence because it shows the
combat reports for their full display durations.

The `new-phlan-arena-manual-report` replay uses the same checkpoint. It
delays the browser's image decode for Alda's next miss beyond the report's
display time and checks that the combat panel still shows the report.
It also switches to Classic and back during that report. The animation
timer starts after the frame renders and restarts after the selected
presentation renders, so decoding cannot consume the display time.
Quick waits for the report
animation to finish before polling the guest for the next turn.

The `kobold-king-return-council` replay starts from the slot B emitted by
`kobold-king-leave-caves`. It walks to the East Overland dock at (35,29),
takes the original ferry, and walks from the New Phlan pier to the council
clerk through ordinary game inputs. The clerk pays the outstanding Podal
Plaza and envoy rewards first. The replay checks that the kobold commission
stays ready to report until the clerk announces the kobold reward, then
moves from reward pending to turned in after the treasure menu closes.

The same replay checks that the journal records the return ferry when the
party reads the dock's offer, then directs the party to choose Take Boat
before reporting to City Hall.

For the save/reload check, run `kobold-king-return-council-save-pier` on the
same cave-exit slot B. It emits a native save made through Encamp at the
New Phlan pier. Pass that save to `kobold-king-return-council-reload` to
check that the journal remembers the ferry across a fresh browser session
and that the party can still collect the council reward.

The `new-phlan-canal-west-bank`, `new-phlan-canal-east-bank`, and
`new-phlan-canal-south-bank` replays use slot A in area 8. Start the west
route at (7,0) facing west, the east route at (8,0) facing west, or the
south route at (6,1) facing south. Chrome loaded all 3,630 enhanced
placements across the three walks using the default art packs. Each replay
also checked that toggling presentation preserved the save.
The canal-bank and canal-room replays save Chrome captures at the start
and end for visual review.
The stone reveal update replaces the teal edges with subdued stone shadows
on nine tile bindings across the canal room, civic district, and training
hall. The east-bank, canal-room, training-exit, and dueling-room replays
passed with the updated art.

`old-phlan-sword-thief-approach` checks the far, middle, and near frames
over 121 terrain tiles each, then the existing dialogue portrait.
`tempus-temple-watch-combat` checks the shared Watch ready sprite and the
cleric's mace strike in the Tempus temple reinforcement battle.
`tempus-temple-captain-ready` checks the captain's ready pose and loads
his two-handed sword strike separately. A controlled combat replay with
Cora positioned within his reach observed the reflected strike at its
native anchor, the hit report, and the return to the ready pose.
`new-phlan-tavern-cutpurse-combat` verifies the ready pose and reflected
longsword strike in the tavern brawl.
`new-phlan-tavern-nomad-patron-combat` verifies a separate ready pose and
unreflected short-sword strike for the nomad patron in that same fight.
`valhingen-vampire-return-approach` checks the middle and near frames
over 121 terrain tiles in the crypt, followed by the vampire portrait.
`stojanow-barracks-side` verifies 1,210 tile placements across ten views,
including two new lintel and sill tiles.
`stojanow-coping-reveal` verifies the sandstone doorway join on a
16-view walk through the side courts. `stojanow-bugbear-approach` checks
the far, middle, and near sprites over 121 tiles per frame before the
warning portrait.
`node tools/verify-fresh-party.mjs --bane-entry53-checkpoint PATH_TO_SLOT_A`
uses a controlled party at (6,9), facing north in the Temple of Bane. It
checks that Entry 53 is absent before the encounter, earned after the native
ogre escort battle and loot prompt, and retained after saving and reloading.
Use the same checkpoint with `node tools/verify-slums-presentation.mjs
PATH_TO_SLOT_A PATH_TO_CHROME bane-entry53-art` to check the illustration,
journal discovery, and Classic/Enhanced toggle in Chrome. The illustration
clears when the party resumes exploring.
`bane-orc-guardroom-approach` verifies the middle and near warband frames
over 121 terrain tiles before the existing ambush portrait.
`new-phlan-tavern-aides-combat` verifies all seven Aides use the enhanced
ready pose, including the selected Aide. The first strike uses the matching
reflected sprite while the guest reports that the Aide missed Enna.
`lizard-wilds-caravan-merchant-combat` verifies the ready sprite and
short-sword strike in the original caravan battle.
`buccaneer-palisade-day` and `buccaneer-palisade-night` verify the
wood-and-horizon junction in both lighting conditions, with 2,541
enhanced tile placements across 21 views.
`nomad-east-rail` verifies two rail and soil junction tiles across 11 views.
`valjevo-bane-chaplain-approach` checks three approach distances before the
chaplain's portrait. `valhingen-mummy-approach` checks the middle and near
poses before the sarcophagi illustration. `zhentil-trespass-patrol-combat`
checks the ready pose and reflected strike in the overland patrol battle.
`valhingen-ghoul-approach` verifies the far, middle, and near sprites in
order before the ghoul portrait. The three `zhentil-east-passage` replays
verify four new timber and masonry joins across 4,114 placements in
34 views.
The floor revision replaces five Zhentil tile bindings with worn
flagstones, continuous wall joins, and matching threshold and door-foot
pieces. The north-passage replay captures the corrected view at (15,5)
facing north. The three outer-courts and three east-passage routes verify
8,470 placements across 70 views with the revised floor.
`kuto-norris-approach` now verifies the far, middle, and near poses before
the surrender prompt. `new-phlan-tavern-corporal-ready` verifies the
scoped 96×96 ready sprite in the brawl.
The `mendor-annex-floor` and `mendor-west-floor` replays verify the cool
slate floor and matching thresholds and wall joins across 6,171 tile
placements in 51 views. The small west route also checks the transition
into Textile House. The large annex route captures the west-facing
vestibule for visual review.
`valhingen-paladin-wraith-dialogue` checks the animated wraith approach
over all 121 crypt tiles before the portrait. The Tempus line-fighter
and captain replays verify their distinct ready poses in the same
reinforcement battle as the existing cleric strike.
The Tempus line fighter also has a 96×96 longsword strike. A controlled
replay placed Cora adjacent before the original combat code built the
occupancy grid. Chrome showed the strike at (80,128) alongside the original
report that the fighter attacks Cora and misses. Display switching kept
the battle state and save intact.
`valhingen-wight-tower-approach` checks the far, middle, and near sprites
before the tower portrait. `valjevo-floor-reveals` checks five doorstep
and floor-to-timber joins across eight live views. The Valjevo hall and
merchant wing use fired-clay octagons with ochre insets on the floor,
vertical timber on the walls, and gray masonry on the ceiling. The
floor update covers 14 tile bindings checked across both Chrome routes.
`valjevo-dungeon-doorways` walks the separate dungeon area and verifies
all 1,210 placements across ten views, including 35 new wall, door, and
threshold tiles.
The Valjevo transition hall and stone chamber add 14 oak and ashlar
tiles. Their Chrome replays check 1,331 placements across 11 views,
including the hall's area 5 to area 3 transition.
The alternate east walk checks the blue-window edge across 12 views
and 1,452 placements.
Two lower-wing routes check ten new wall, doorway, and window tiles
across 14 Chrome views.
The Valjevo bucket-trap battle uses scoped 4× fire giant ready and attack
sprites. Its Chrome replay checks the attack during the original combat report.
The Valjevo kitchen corridor, jamb, and south yard now use tamped-clay
floor tiles. Three Chrome walks checked their wall and doorway joins
across 39 views.
The Textile north yard uses damp earth beneath the brick walls. Its
Chrome walk checks 30 revised tiles across 16 views.
The ivy lane, library link, and fountain turn carry the same earth
through 26 additional wall and threshold joins. Their Chrome walks
verified all 2,662 placements across 22 views.
The fortune-teller and potion-shop courtyards in the Slums use worn
earth beneath the masonry. Four Chrome routes check all 16 revised
floor tiles across 33 views.
Four neighboring Slums routes check another 14 courtyard joins across
52 views, including the guild corners and side arcades.
Two Valhingen graveyard walks check 52 new slate path tiles across 13
views. The eastern walk ends before the encounter overlay.
Three adjoining graveyard walks check 162 slate joins through the north
gravestones and south and west vaults, with 3,267 placements in Chrome.
The central courts, memorial turns, and ossuary entrance add 81 slate
joins checked across 39 Chrome views. The ossuary walk ends before the
encounter overlay.
Four crypt approaches extend the slate surface through 25 additional
tiles. Chrome checks 3,146 placements across 26 views. The stairs and
grave-claw walks end before their encounter overlays.
The deep crypt, memorial routes, and north vault add 24 slate joins
checked across 50 Chrome views and 6,050 placements.
Eight more routes check the last 21 old-gravel tiles identified in the
archived clean scenery, across 36 Chrome views and 4,356 placements.
The vault and ossuary walks end before the encounter overlays.
The Buccaneer stockade and pens use packed sand with shell fragments.
Three Chrome routes check 89 tiles across 35 views.
Five adjoining Buccaneer walks check 21 more packed-sand joins across
78 views and 9,438 placements.
The quay adds five more packed-sand transitions, checked across 18
Chrome views and 2,178 placements.
Sokal Keep's gallery and smithy now use broad worn flagstones.
The two walks check 11 revised tiles across 31 views. A west-reeds
walk checks the matching edge tile through 16 more views.
The Kobold Cave pool passage, west gallery, and south loop now use
brushed silt under the basalt walls. Three Chrome walks check all 25
revised tiles across 52 views and 6,292 placements.
Four short cave walks verify 16 additional silt joins at the cave
thresholds, turn, and east tunnels across 15 views.
The upper Pyramid floor uses irregular weathered sandstone slabs.
Four Chrome walks check 19 revised tiles across 90 views, and the
entrance walk checks two matching edges across 22 more views.
The Bane ramparts, ivy loop, and north court use wide sandstone paving.
Three Chrome walks checked all 40 revised tiles across 60 views.
Five related altar, crypt, and treasure walks check another 17 paving
joins across 98 Chrome views.
Old Phlan's east street and locked lane use broad worn flagstones
distinct from the walls. Two Chrome walks check 18 tiles across 32
views and 3,872 placements.
The controlled northern loop checks four additional flagstone edge
tiles in Chrome across 16 views and 1,936 placements.
The Textile waterfront and approach extend the damp-earth floor through
18 more joins. Four waterfront Chrome routes checked 74 views. The
approach scenery was checked through the last view before the hobgoblin
appears.
The Lizardfolk outer yard uses wet peat and subdued puddles under the
reeds and masonry. `lizard-outer-yard` checks 38 revised tiles across
19 live views and verifies that switching presentation preserves the save.
Six additional Chrome walks check 38 wet-ground joins at the banks,
ruins, lower approaches, Sunken Keep, and reed breach. Two Sunken Keep
walks end before the turn that draws a composite frame.
`wilderness-waystone` checks 80 patterns across ten views, including
77 new foliage and palisade tiles. The route uses the existing area 26
ground, which it shares with the north gate.
The north and ridge branches add five missing scenery tiles. Their
Chrome replays check all 1,089 placements across nine views before
the departure prompts.
Four boundary replays check another seven foliage, rail, and ground
tiles across 23 views, including the first departure prompt where visible.
The Temple of Bane side galleries and eastern outer courts use angled
olive-slate paving beneath the gray masonry. Four Chrome walks checked
the 12 revised tile bindings across 43 views, including the arches and
wall-to-floor joins, with state and saves preserved when switching modes.
Podal uses rounded buff limestone setts beneath blue-gray masonry and
reddish overhead plaster. Four Chrome walks checked 17 floor and
junction bindings across 36 views.
Kuto's well, northern lane, border, and eastern lane now use packed
earth with worn limestone chips beneath the turquoise masonry. Four
Chrome walks checked 24 floor and edge bindings across 48 live views.
Four connected Kuto walks check another 61 packed-earth transitions
through the west chambers, catacombs, fountain, and border crossing.
Chrome verified all 6,413 tile placements across 53 views.
The Pyramid cistern passages use stained limestone underfoot, with
mineral veins distinct from the dark teal walls. Three Chrome walks
exercised all five revised bindings across 58 live views.
The upper cistern route also checks the new outer doorway footing,
with all 121 tiles rendered in each of 21 Chrome views.
Stojanow's barracks and coping routes use weathered oak boards beneath
the sandstone walls. Two Chrome walks checked 12 revised tile bindings
across 26 views.
The Stojanow plotting fighter replay also checks his brief 4× approach
sprite before the existing close-up and dialogue. The binding is scoped
to the fighter's script so Ohlo keeps his own art.
The plotting mage has his own 4× approach keyed to his script. The
Chrome replay checks the approach before the mage's portrait and dialogue.
The patrol leader replay checks the 4× near pose on the second Advance
before the password dialogue.
Both Stojanow tower charge branches show the new 4× charge before the
fighter portrait and original encounter menu. Both passed the Chrome
presentation switch and save checks.
The Stojanow wall ambush uses that same charge sprite at its own script
cursor. Chrome verifies the charge before the fighter's close-up.

`bane-altar` checks the three orc approach distances before combat. The
near pose is scoped to the altar script, and `bane-gate` verifies the
gatekeeper still uses his own art.

`nomad-camp-rim` checks all three enhanced sentry distances in order
before the swords-ready prompt. `buccaneer-captain-dialogue` checks the
enhanced approach sprite before the captain's portrait.

The three Tyrmor Prison combat replays check 4× ready and strike sprites in
live battles, including the reflected lizardman and thief strikes. The human and
dwarven fighters share the original frame IDs and use the same prison
fighter art. The lizardman and thief checkpoints isolate their native
encounters by marking the other wandering encounters defeated.
The displacer beast and drider replays use the same checkpoint technique.
They check the 192×96 ready and strike poses and the drider's reflected
bow attack in the live Chrome renderer.
The Tyrmor minotaur replay verifies the 96×192 ready pose and reflected
charge at the native combat anchor from an isolated prison checkpoint.
The elf and stirge replays likewise use isolated checkpoints and check
both 96×96 poses, including the elf's reflected strike.
The Tyrmor kobold replay checks three ready-pose placements from an
isolated wandering encounter. A Guard/Done replay also checks the
weapon-neutral lunge shared by the sword and bow attacks.
`tyrmor-prison-kobold-combat` exercises the ready pose and reflected bow
attack with the installed pack and checks that display switching leaves
the selected save intact.
The Tyrmor prison priest replay checks the middle and near approach
sprites at each stop and the portrait at his benediction.
The Tyrmor prison lizardfolk use a separate approach and group
illustration, verified through the original Parlay prompt in Chrome.
The hungry kobolds have their own approach and group illustration,
also checked through Parlay on the isolated encounter checkpoint.
The isolated displacer beast encounter checks its approach pose and
corridor illustration before the original Parlay prompt.
The Tyrmor drider replay checks its own approach and dialogue artwork
through the original Parlay prompt on an isolated encounter checkpoint.
The minotaur's isolated encounter also checks the new approach and
illustration before the original Parlay prompt.
The Tyrmor stirge replay checks the approach sprite and swarm
illustration through the original flight dialogue.
The Tyrmor elf replay checks the brief approach animation before the
group portrait and native Parlay prompt.
The Tyrmor dwarven fighters also have their own approach sprite and
group portrait, checked in Chrome before Parlay.
The Tyrmor thieves replay checks their brief approach animation
and group portrait through the original Parlay prompt.
The Tyrmor human fighters replay checks the new approach and group
portrait before their original Parlay prompt.
The north-wing fighters share the approach sprite and have a distinct
group portrait, verified through their own Parlay prompt in Chrome.
The Kobold King's first horde has its own 4× infantry ready and strike
sprites. Chrome checks the strike during the original report of Brin
taking damage from a controlled throne checkpoint.
The second-wave siege checkpoint also checks the boars' new ready and
reflected charge sprites during the original damage report.
The swamp ruin defenders have their own ready and claw-strike sprites.
The controlled Chrome replay verifies the reflected strike during the
original report of the defender hitting Brin.
The Old Phlan nailed-door patrol replays check the leader and giant
lizard ready poses, the bite, and the claw strike with their combat reports.
The sickly Old Phlan kobold scouts have a separate ready and attack
pair. Chrome checks the short-sword strike during the original report
of Alda taking damage.
The scout leader has distinct ready and shortbow attack sprites.
Chrome verifies the bow pose with the original combat text.
The Valhingen conjurer has distinct ready and draining-touch sprites
in its skeleton, zombie, and wight summoning branches. Chrome checks
each against the original attack report.
The Wild Cave kobold replay checks the new middle-distance sprite
before the existing close approach and ambush illustration.
The Princess Fatima replay checks the new approach before the existing
portrait, journal account, and recruitment.
The white-flag envoy replay checks all four approach frames and the
portrait in both the truce and escort dialogue.
The Temple of Bane gate's Attack branch uses its own guard ready and
cleaver-strike sprites. Chrome checks the reflected hit on Alda.
The Bane barracks guard replay checks the uniformed orc ready sprites
and the hatchet strike during the original attack report against Cora.
The Textile House poison frog replay checks the crouch and reflected
lunge beside the original attack report against Alda.
The Textile chief's hobgoblin archers use distinct ready and longbow
sprites. Chrome checks the bow frame with the guest's weapon readout.
The Giant Skeleton's retainers have a separate ready and sword-strike
pair. Chrome checks the native attack on Cora from a controlled
checkpoint for the retinue branch.

`valhingen-spectre-approach` checks the new far pose before the middle
pose, including frame dimensions, screen placement, and mode switching.
`graveyard-mystic` checks all three lantern-bearing approach poses in
order over the enhanced terrain before the mystic's portrait appears.
The Valhingen skeleton enclave replay checks the new middle pose before
the close approach and portrait. The New Phlan tavern corporal replay
checks his enhanced attack animation alongside the existing ready pose.
The replay pairs the attack frame with the original report of the
corporal hitting Enna. The `river-pumping` replay checks the middle and
close bound lizardfolk sprites, then the pumping-room illustration
before parlay and the journal update.
The hostile pumping-room branch checks the prisoners' ready and
reflected attack poses during the original combat report.
The Pyramid patrol has a separate scout sprite and group illustration.
The Chrome replay checks the approach and the original wary dialogue.
The Old Phlan hut replay checks the four lizardfolk's own approach and
group illustration before the original attack prompt.
The larger Old Phlan lizardfolk in the hall use a separate approach and
illustration. The Chrome replay checks the scoped sprite before the
portrait, and the hut replay still checks its own artwork.
The hall approach also checks all 121 enhanced terrain tiles after
restoring the missing palisade square. The mutant hut has its own
approach and flooded-hut illustration, both checked in Chrome.
The Zhentil east yard replay checks 12 refined floor joins across 17
views, including the wall bases, rails, and door feet.
The Nomad inner trail uses wind-scoured sand across 38 revised tiles.
The extended Chrome walk checks 16 views, and the standard inner-lane
replay checks 13 views with the default pack.
Four Nomad routes check 43 additional sand joins across 42 live views.
The Al-Hyam Dazid combat replay checks his new ready sprite, including
its reuse during the original wand report.
The Slums potion-lab replay verifies the scoped orc ready sprite. It
steps combat pauses explicitly to keep the replay deterministic.
The matching potion-lab orc leader replay checks the 4× ready and
longbow attack frames in the same encounter.

The kobold cave exit replay also checks the first overland frame. The
guest still reports the cave's area when it draws the overland map.
The browser uses the overland menu to keep that frame out of the
first-person tile renderer and exploration tile inventory.

The Old Phlan jail thugs now use enhanced ready and strike sprites. The
Chrome replay verifies both poses during the longsword exchange.

The Kobold throne rematch uses separate middle and near approach art.
The Chrome replay checks both placements, portrait panel fit, and mode switching.

Kuto's perimeter and western inner lane use 18 additional packed-earth
joins. The western Chrome replay checks 12 views across 48 distinct tile
patterns, including the floor edge, and verifies state-preserving mode switches.

The first Kobold throne audience uses far and middle horde artwork. The
Chrome replay verifies the three approach frames and the throne portrait.

New Phlan's training, dueling, and canal rooms use 49 diagonal terracotta
floor tiles. Four production Chrome routes cover 36 views, including the
dueling interior transition, with state-preserving presentation switches.

The Old Phlan thieves' guild ambush uses distinct ready and strike poses.
The Chrome replay checks the longsword strike alongside its damage report.

The Kobold throne ballista ambush uses middle and close charge art. The
Chrome replay checks the animated anchors, mode switching, and battle start.

The Old Phlan Sword Thief has distinct standing and reflected longsword
poses. The Chrome replay checks the strike and the report that it misses Brin.

New Phlan terracotta continues through five building exits, the harbor and
middle lanes, and the pier alley. Eight Chrome routes on the production
pack checked 87 views, 10,527 tile placements, and mode switching.

The Kobold King's quarters use a shield guard approach and a distinct
room illustration. The Chrome replay verifies the guard anchor, dialogue
transition, and state-preserving presentation switches.

New Phlan's eastern ward, avenues, warehouse square, and south market
use 13 additional paving joins, verified over 83 Chrome views. The
Buccaneer stockade guards use 4x ready and punch sprites. Chrome verifies
the reflected punch and the attack report that it misses Cora.

The Kobold truce-refusal cave-in uses a distinct approach sprite and
illustration. The Chrome replay checks both and the portrait at battle entry.

Slums orc household leaders use distinct ready and broadsword art. Chrome
verified the reflected swing and the combat report that it misses Thrend'r Grone.

The Kobold net ambush has a rope-puller sprite and a net-trap illustration.
Chrome verifies the approach anchor and rendered illustration at battle entry.

The Slums orc household defenders have matching ready and hatchet sprites.
Chrome verifies the reflected strike and its eight-point damage report.

The swamp ruin defenders use a charging lizardfolk sprite and a group
illustration. Chrome verifies the anchor and the transition into parlay.
The roofless ruin illustration follows the entrance narration. When the
native approach sprite appears while the same caption is still visible,
the sprite takes over the viewport at its original position.
The surprise-attack replay selects the original surprise branch in a
controlled test and shows an illustration of the attack from the rubble.
The normal charge and surprise presentations carry their own art through
battle entry. Both clear the illustration when combat starts.
The fresh-party icon editor regression covers 18 native editor frames.

Drythh and his followers use a distinct approach sprite and group
illustration. Chrome verifies both after declining the elder's request.

The first player bow icon has separate ready and action art. A Chrome
replay starts from a save made through the native icon editor and verifies
both sprites and Alda's two-point hit report.

The Podal recruitment assembly has an animated orc approach and a shrine
assembly illustration. Chrome verifies both and state-preserving mode switches.

The character sheet draws enhanced dwarf head and body choices separately.
Chrome verifies the default, independent choices, and native fallback.
The player axe icon passed the Chrome ready and action replay.

The gold-shield icon uses the guest's bitwise head/body blend. Chrome
verifies its ready pose and animated action after loading an editor-created save.

The wandering Podal Plaza goblin uses three distance sprites across five
observed approach frames. Chrome verifies their order, anchors, and
state-preserving presentation switches.

Four more dwarf portrait parts extend the enhanced character sheet to the
first four heads and bodies. Chrome checks seven live combinations and
falling back to the guest portrait when the selected head lacks a redraw.

The male dwarf fighter's character sheet covers all 14 head and 12 body
choices. Chrome checks both menu cycles and a mixed head/body choice.

The overheard Podal Plaza patrols use three approach distances for both
goblins and hobgoblins. The production Chrome replay verifies all twelve
scoped bindings, both original dialogues, and state-preserving mode switches.

Paired blades, greatsword, and crossbow player icons have 4x ready and
action sprites. Three production Chrome replays check the original
combat actions from saves made through the native icon editor.

The wandering Podal Plaza orc uses a dedicated close approach sprite.
Chrome verifies placement, the original walk-on dialogue, and mode switching.

Character-sheet heads overlap collars as transparent layers, offset six
guest pixels below the original head anchor. Body 3 keeps its broad torso,
with a localized change to the neck and upper shoulders. Body 4 uses its
earlier artwork. Production Chrome verified 34 frames, including both
chooser cycles and six heads paired with Body 3.

All 18 weapons for the default player icon head have ready and action
sprites. The editor sweep covers all choices, and production Chrome combat
replays verify the ten new pairs from native editor saves.

The undisguised Podal Plaza goblin challenge has a dedicated illustration.
Chrome checks the approach, encounter menu, and state-preserving mode switches.

The Podal Plaza orc uses far, middle, and near artwork for the auction
clue and parlay approaches. Chrome verifies both branches and mode switching.

Plumed, braided, and bald dwarf combat icon heads have separate ready
and attack sprites for the default body. Chrome verifies each pair from
a save made through the original icon editor.

All distinct dwarf combat heads have ready and attack art with the
default body. Chrome verifies the original editor's fourteen choices,
including three aliases, and both combat poses for each distinct head.

The plumed and bald dwarf combat heads each have ready and strike art
for all 18 weapon choices. Chrome verified both poses across both
18-choice icon editor sweeps. Production-pack combat replays checked
plumed flail and spear and bald shield and double axe. The editor and
battle checks use the original icon or combat menus. The battle replays
use controlled saves to select the party icon.

The braided-head and four other distinct dwarf head axe and crossbow
pairs have dedicated ready and strike art. The ten
`party-dwarf-{4,5,7,8,10}-{axe,crossbow}-icon-combat` Chrome replays
check the selected ready frame, the animated strike, and the combat
report using controlled copies of the Slums checkpoint. These replays
step automatic combat explicitly so the browser cannot advance the
battle during the state-preservation assertion.

The crested dwarf now has both combat poses for all 18 weapon choices.
Chrome checked each ready and strike image in the original icon editor.
The flail, greatsword, and sabre checks load saves made with those editor
selections and exercise Alda's attack and Classic switching in combat.
The HTML and JSON artwork inventories list both sprite bindings for
each distinct dwarf head and body, with identical source heads shown
as aliases.

The braided dwarf now also has ready and strike art for all 18 weapon
choices. The original icon editor sweep loaded both 96×96 frames for
each choice. Production combat replays use saves from the editor for
paired blades, spear, and double axe, then check Alda's attack and
preservation of the battle state when switching display modes.

The hooded dwarf has ready and strike art for all 18 weapon choices.
Chrome checked the full original icon editor sweep. The
`party-dwarf-5-{bow,spiked-club,war-hammer}-icon-combat` replays start
from slot B saves made with the corresponding editor selections and
exercise the named attack, the animated strike, and display switching.

The spiky dwarf has ready and strike art for all 18 weapon choices.
The fresh-party Chrome icon editor run selects head 4 and steps through
the full weapon list, checking all 36 placements and loaded 96×96 images.

The cloth-cap dwarf (head 7) has both poses for all 18 weapon choices.
The production Chrome replay checks the exact head and body placements
and both 96×96 images for every choice in the original icon editor.

The ponytail dwarf (head 3) also has both poses for all 18 choices.
Chrome checked all poses in the editor. The
`party-dwarf-3-{gold-shield,crook,morningstar}-icon-combat` routes start
from the corresponding original editor saves and replay the combat
report, enhanced strike, and preservation of state across both displays.

The parted-haired dwarf (head 1) has both poses for all 18 choices.
Chrome stepped through all ready and strike previews in the original
icon editor and verified that each preview loaded its 96×96 artwork.

The helmeted dwarf (head 2) completes the default-palette dwarf set.
Chrome checked both previews for all 18 weapons in the original icon
editor. The inventory now links all 396 ready and strike entries for
the 198 distinct head and body combinations.

The Nomad Camp guest tent uses a dedicated 352×352 rest illustration.
The `nomad-headman-rest-reload` and `nomad-headman-rest-portrait` Chrome
replays check the illustration in Encamp after reloading the headman's
rest permission. They check full-panel fit and mode switching. The
portrait replay also checks that the image stays through the rest prompt
and clears when the camp hears war cries.

The Zhentil Commandant has a ready and longsword strike pair scoped to
the reinforcement battle. Chrome checks both poses and the attack
report at the native anchor. The local fixtures bypass the earlier
dwarf battle. The shorter fixture also reduces the two surrounding
enemy groups to reach the Commandant sooner.

The Podal Pitt tavern hobgoblin has ready and strike sprites scoped to
the brawl. Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_I CHROME_PATH podal-pitt-hobgoblin-combat`.
It starts outside the drunken buccaneer's encounter and checks the
ready and reflected strike placements at (56, 56), the loaded 96×96
images, the native attack report, and state preservation across displays.
The same slot I brawl also draws an original ready and strike pair for
the orc. It reuses the duelist's two sprites for the drunken buccaneer.
The Chrome replay checks the orc's reflected attack and the buccaneer's
unreflected attack against their native combat reports.

Podal Plaza's goblin, hobgoblin, orc, and ogre patrols have dedicated ready and strike
sprites. Chrome replays with the production artwork checked the original
combat roll for each patrol, the orientation of the ready pose, the strike at the
same position, and state preservation across display modes.

The Valjevo barracks waking giants use an encounter-specific approach
sprite at (48, 32) and a dialogue illustration. Chrome verified the
production replacements in both frames and preserved the party state
and save across the display toggle.

The lower-keep giant checkpoint has two dedicated illustrations across
the password and parlay prompts. Chrome verified the production artwork,
Classic and Enhanced toggles, and passage after the accepted password.
The journal records the giant's demand and advances when the sentries
grant passage. The translation verifier checks both transitions against
the original ECL dialogue.

The Buccaneer Base guards who intercept Bivant's escort use a dedicated
approach sprite and dialogue illustration. A Chrome replay freed the
animals, rescued Bivant, and followed the original route to the guard
interception. It checked both production replacements and verified that
the display toggle preserved the game state and save.

The Textile House drum courtyard has dedicated ready and attack sprites
for the longbow leader and longsword guard. Chrome replays verified both
poses against the native attack reports, checked the bow shot's fixed
position and the guard's moving strike, and preserved the save through
Classic and Enhanced toggles.

Sokal Keep's courtyard orc leader has ready and firing sprites that
depict the longbow named in the original combat report. A Chrome replay
with the production artwork verified both poses at (80, 56), including
the reflected ready pose and the unreflected shot, and preserved the
save across display modes.

The roaming lizardfolk in the Lizard Wilderness have a dedicated
middle-distance approach sprite. A Chrome replay selected the original
encounter table's lizardfolk roll and verified the production sprite at
(56, 32), the transition into combat, and save preservation across modes.
The frontier bandit approach replay checks its sprite at the same
position and confirms the original Nice parlay clears it on return to
exploration. The Kuto Ruins roaming gnoll replay checks its ready and
attack poses at their native positions and the original combat report.
Both replays select the encounter with a controlled roll.

Separate Chrome replays check the Lizard Wilderness kobold archer's
approach and the Kuto Ruins kobold's short-sword ready and attack poses.
The former returns to exploration after Nice parlay. The latter displays
the attack at (80, 104) alongside the original combat report.
The Lizard Wilderness Nomad scout replay verifies the approach art at
(56, 32), the original combat transition, and display switching after
selecting the Nomads from the native encounter table.

The Zhentil officers' dinner has a dedicated illustration across nine
dinner-specific prompts. Five Chrome routes verified the staged art,
and the production replay checked the Old Phlan story branch. The
shared narration cursor uses the native return address to select the
dinner illustration on arrival and story pauses. The office retains its
own portrait at the same cursor. Production Chrome replays checked both.

Chrome verified Valjevo's maze watch fighter wielding his two-handed
sword during the native combat turn. Separate Lizard Wilderness replays
verified the Stirge and displacer beast approaches and the transition
from each native encounter prompt into combat.

The Buccaneer Wilderness centaur replay follows ordinary exploration to
the original encounter and checks the new approach sprite at (48, 32),
display switching, and the transition into combat.
The quickling replay independently follows ordinary wilderness travel
and verifies its approach at (48, 32) before entering combat.

Chrome checked the Lizard Wilderness river ferry's original Take Boat
and Stay choices with its new illustration. The eastern ferry kept its
own portrait in the control replay. A Valjevo maze patrol replay also
verified the hill giant's ready and boulder-throwing poses with the
native boulder attack report.
The same maze patrol uses the existing outer-patrol captain sprites for
its longsword fighter. Chrome verified the reflected ready pose and
strike at their native positions and checked the combat report.
The Forge patrol uses the same captain and boulder-throwing giant.
Separate Chrome replays verified both fighters' ready and attack poses
and the original combat reports in the Forge encounter.

North Phlan's crossroads has a dedicated illustration for the City,
Graveyard, and Leave prompt. Chrome verified each route and the display
toggle. A control replay checked the separate western entrance portrait.

Chrome verified the Buccaneer Wilderness patrol corporal's approach
and the native transition into combat using a controlled Soldiers roll.
The Stojanow tower relief aide replay verified the ready pose and the
shared attack pose during both native longsword and longbow actions.
The battle mage replay verified its new sprite at (80, 80) both while
ready and when the original game casts Magic Missile.

East Phlan's shoreline crossroads has a dedicated illustration of the
two entrances and boat landing. Production Chrome replays verified
North, South, Boat, and Leave, plus the separate western control.
Two further replays verified the Buccaneer Wilderness tiger and giant
mantis approach sprites and both transitions into native combat.

West Phlan's crossroads shows the paths to Podal Plaza and the Textile
Complex. Chrome verified both entrances and Leave, with a control replay
confirming that the northern crossroads uses its own illustration.

The roaming boar approach was verified in Chrome using a controlled
native encounter roll. The Stojanow wall ambush also uses the tower
reinforcement sprites for the same aides and mage. Its Chrome replay
verified longsword, longbow, and Magic Missile actions.

The Buccaneer Wilderness thri-kreen and thief approaches passed Chrome
replays using controlled original encounter rolls. The Buccaneer Base
rescue has a dedicated illustration inside the pen. Chrome verified
Get Him and Leave from a controlled checkpoint and checked the separate
outside-the-fence portrait from the original approach.

The Buccaneer pen merchant has a dedicated illustration for his
approach, offer, and decision menu. Chrome checked the portrait changes
on the original route and the separate Bivant portraits both inside
and outside the pen. An Eastern Marches replay verified the phase spider
approach at (40, 32) and the transition into native combat.

Additional Eastern Marches replays verified the hippogriff, troll, and
minotaur approaches and the transitions into combat. The Textile House
roaming ambush uses the existing drum courtyard art for the same two
hobgoblins. Chrome verified both ready and attack poses in the ambush.

The Eastern Marches ridge lizardfolk approach passed a production
Chrome replay through the original combat transition. The Nomad feast
illustration appears during four outdoor dialogue pauses with Hassad.
Chrome checked those pauses and the surrounding tent portraits.

Hassad's daytime greeting now has its own illustration. Chrome verified
acceptance into the existing outdoor feast scene and decline back to
the overland prompt. Separate replays verified the Kuto Ruins gnoll
approach and all three restored Council Guard ready poses.
Additional Kuto Ruins replays verified the kobold and lizardfolk patrol
approaches at (56, 32), Classic and Enhanced switching, and the original
transition to combat using controlled encounter rolls.

At the Podal auction, Wait for Winner now shows the bidder and ogre
exchanging the wand and sack. Production Chrome replays verified that
branch and the existing auctioneer and ogre escape illustrations.
Make a Bid, Wait for Winner, and Leave share portions of the original
auction script. Chrome verified that the exchange only appears when
the dialogue describes the transaction, including after the high bid.

The first Kobold Cave fork visit shows kobolds entering the small cave.
Return visits show the existing landscape. Chrome verified both choices
of artwork and the save across display modes. The original menu cursor
is shared, so the renderer uses the first-visit dialogue to select the
illustration.

Controlled Chrome replays verified the Zhentil commandant's charge art
through the battle introduction and the Podal recruit leader's new strike
sprite during both longbow and battle-axe attacks.

A Chrome replay through the stock browser runtime verified the sleeping
and waking fire giant illustrations and the transition into combat. The
checkpoint selects the original sleeping branch by setting its alarm
state. The replay checked that switching display modes preserved the
game state and save.

Production Chrome replays verified Restal's blindfold and seal offers
through acceptance and refusal, and Cadorna's released portrait through
both responses to his request to join. The Valjevo kitchen replay checks
the warning, oil damage, and rescue illustration at their own prompts.
The armoring giants replay checks both approach distances and the battle
introduction. A separate waking giants replay checks the new near sprite
between the existing middle pose and dialogue illustration.

The `north-gate-jail-thugs` replay checks that the Old Phlan jail draws
its dedicated thug approach at (40, 32) before showing the gang's
portrait. The approach binding is scoped to the jail script so the
sword-thief encounter keeps its own artwork.
After the jail binding was added, `old-phlan-sword-thief-approach`
passed from the east-street slot A checkpoint, including all three
distances and the existing dialogue portrait.

The `north-gate-weapon-cache-ambush` Chrome replay checks the dedicated
olive-hooded approach sprite before the original gas-trap portrait.
The `eastern-marches-kobold-leader-combat` replay checks the scoped
leader's ready and reflected shortbow strike, the native attack report,
and state preservation across displays. Its slot B checkpoint is staged
one square west of the fixed horde encounter.
`sokal-ferran-combat` uses a controlled slot C chapel checkpoint
and verifies his new ready and strike sprites at (80, 104) during the
original attack on Alda.
`sokal-armory-scorpion-combat` loads the slot C insects checkpoint.
Chrome verifies the 192×96 scorpion ready at (56, 32) and reflected
sting at (80, 56), the attack report, and display switching.

`bane-ogre-escort-combat` verifies the escort orc's ready pose and
reflected strike at (56, 56), the native attack on Cora, and display
switching from the local slot A ogre checkpoint.

`bane-temple-exit-retaliation` verifies the half-orc cleric's approach,
the full-panel counterattack illustration, and its persistence into the
battle prompt. The controlled slot A checkpoint starts inside the temple.

The Nomad shaman's reward scene has a dedicated 352×352 portrait.
Chrome verified the original line, the portrait's panel fit, and
display switching in a controlled replay that bypasses battle and
holds the brief shaman dialogue for inspection. The journal records
the shaman's confirmation when the dialogue is witnessed. A translation
check verifies the earlier promise alone does not reveal that entry.

The Temple of Bane rampart hobgoblin has ready and longsword strike
sprites for the outside patrol. Chrome checked the reflected strike at
(128, 104) and the original attack on Brin. The local fixture raises
party HP and selects the original patrol roll.

The exterior rampart ogre patrol has dedicated 96×192 ready and
cudgel strike sprites. Chrome checks both mirrored poses at (128, 104)
and the original attack on Brin from a controlled patrol roll.

The rampart goblin and orc patrols also have separate ready and strike
pairs. Chrome checks their mirrored poses at (128, 104), the original
attacks on Brin, and display switching. Each replay uses a controlled
roll to select its patrol.

The Textile House skeleton ambush has a dedicated ready and strike
pair. The controlled slot B fixture selects the original skeletal
ambush branch. Chrome verifies the mirrored ready pose at (8, 128)
and the mirrored strike on Brin at (104, 104).

The Lizard Wilds nomad scout uses a ready and longbow strike pair in
the nomad encounter. Chrome verifies the loaded frames at (80, 152)
and the native attack on Enna. The scratch fixture selects the
original nomad encounter deterministically and preserves the save.

The Lizard Wilds frontier fighter has a ready and longbow strike
pair for the source pose drawn by the bandit encounter. Chrome
verified the reflected attack on Brin at (80, 128), display changes,
and an unchanged save. The scratch fixture selects the original
bandit roll.

`lizard-wilds-merchant-approach` verifies the middle-distance merchant
sprite from a local slot A start and follows the original choice into
combat. The Buccaneer Wilds patrol corporal uses a dedicated ready
and sword strike pair. Chrome verified the reflected attack on Alda
and display switching from a checkpoint with a controlled patrol roll.

`lizard-wilds-drider-approach` passes the merchants and verifies the
drider sprite at (48, 32), display switching, and the original battle
prompt. The Lizard Wilds kobold archer uses a dedicated ready and
shortbow strike pair. From a fixture that selects the native kobold
roll, Chrome verifies the strike at (80, 152) and the attack on Enna.

The roaming Lizard Wilds lizardfolk have their own ready and claw
strike sprites. Chrome verifies the reflected strike at (56, 56),
the native attack on Cora, and display switching. The local fixture
selects the original lizardfolk roll.

Eastern Marches ridge lizardfolk have their own ready and claw strike
sprites. Chrome verified the reflected ready pose at (80, 128), the
strike at (56, 104), and the native two-point hit on Brin. The local
fixture selects the original lizardfolk encounter roll.

`valjevo-inner-armed-guard-combat` loads the local slot B guard
checkpoint. It checks the reflected ready pose and unreflected sword
strike at (80, 104), the native attack on Phineas, and display switching.

`valjevo-lower-snake-combat` verifies the 192×96 giant snake sprites
from a controlled slot B checkpoint near the encounter. Chrome checks
the reflected ready pose, the unreflected lunge at (104, 104), and
the native attack on Rhiannon.

`valjevo-lower-snake-dialogue` uses the same controlled checkpoint and
verifies the lower keep's dedicated 352×352 confrontation illustration,
panel fit, and display switching before combat.

`valjevo-audience-bodyguards` verifies the two-guard illustration
at the first Tyranthraxus audience and checks the full picture panel
and display switching. The controlled slot B fixture resets the guard
encounter flag. The original audience script draws the scene.

Valjevo's barracks hill giants use dedicated 96×192 ready and strike
sprites. `valjevo-barracks-hill-giant-combat` checks the mirrored ready pose
in a native animation frame at (56, 80) and the
mirrored attack on Bakshi at (128, 80). The controlled slot B fixture
starts outside the barracks with the lower-wing encounters reset.

`kuto-sickly-kobold-scouts` replays the middle-distance scouts at
both native script positions, then the close approach and dialogue.
It checks the individual sprite anchors in Chrome and display switching
from the local slot B checkpoint.

`stojanow-trap-aide-combat` replays the trapdoor guardroom from a
controlled slot A checkpoint. It verifies the aide's ready pose and
reflected longbow shot at (80, 80), the native longbow HUD, and display
switching without changing the save.

`podal-auction-ogre-escape` starts outside the auction in slot I.
Chrome verifies the auctioneer at the opening, then the distinct
ogre escape illustration at the original three-choice pursuit prompt.

The `new-phlan-council-archer-combat` Chrome replay refuses the
Council guard's order to leave. It verifies the ready archer at
(80, 80), his longbow strike at the same anchor, and the damage
report in the next animation frame. The local slot A fixture raises
party HP to reach the attack. The encounter script and enemy stay native.

The combat matcher checks one opaque foreground pixel before comparing
the full sprite and its background. A before-and-after check on
synthetic battlefield and editor frames built from guest combat parts
matched all placements and output pixels. The same local benchmark
reduced 30 grayscale battlefield matches from about 34 seconds to
under 0.3 seconds. The full Nomad raid replay reached combat and
verified the kobold strike with the production matcher.

The `wild-cave-boar-sow` route verifies the sow's approach, her warning
while feeding her piglets, and her charge through the battle prompt.
Chrome checks the original anchor, full-panel art, and mode switching
from a controlled slot A checkpoint. The separate
`wild-cave-boar-approach` route verifies that the three-adult ambush
retains its own sprite and portrait.

The `textile-skullcrusher-approach` Chrome replay uses the Textile
House slot B checkpoint. It checks the chained prisoner's 96×320
approach sprite at the guest anchor during the brief animation, then
presses Enter and checks that the portrait fills the outer picture
panel during the original choice prompt. It also checks that changing
display modes preserves the encounter and the saved slot.

The Council restricted-wing guard has a dedicated halt sprite and
portrait. Chrome verifies the challenge and return after agreeing to leave.

The overland thieves use scoped ready and longsword attack sprites.
Chrome verified five ready placements and the reflected attack. The
local test fixture selects the thieves roll deterministically.

The tavern veteran has ready and longsword attack sprites. Chrome verified
both in a local fixture that selects the highest encounter roll and
reduces other group sizes so the veteran enters the fight.

The Enhanced combat icon editor uses 16 material masks for the default
small and tall sword, axe, crossbow, and unarmed robe. Chrome exercised
every available color control in all eight configurations, both poses,
the Prev action, and Classic and Enhanced switching. Four representative
battles loaded a saved green color and showed it in both the ready and
strike poses.
The small and Human bow masks cover both ready and strike poses. Chrome
verified that Body and Hair changes keep both previews Enhanced. The
small bow's saved green color also appeared in both live combat poses.
The art inventory uses the browser's mask loader and lists color-mask
coverage for each pose.
Paired blades, greatsword, and sabre add twelve masks for the default
small and Human ready and strike poses. Chrome verified both Body color
channels and Hair in every editor combination, plus the recolored Human
greatsword in combat.
Bearded axe, spear, flanged mace, war hammer, and shield longsword add
twenty masks across both player sizes. The ten Chrome editor replays
check both Body color channels and Hair. The shield variants also check
both Shield channels. Saved small spear and Human shield longsword
colors appeared in both ready and strike poses in combat.

The inventory decoded 113 archives without unresolved blocks or artwork
load errors. Of 833 source frames, 462 have direct links and 22 have
exact pixel matches to linked art.

| Art family | Source frames | Direct links | Exact matches | Unlinked |
| --- | ---: | ---: | ---: | ---: |
| Scene illustrations | 325 | 72 | 14 | 239 |
| Encounter sprites | 258 | 157 | 0 | 101 |
| Combat poses | 218 | 203 | 8 | 7 |
| Battlefield props | 6 | 4 | 0 | 2 |
| Combat effects and selection frames | 26 | 26 | 0 | 0 |

The 349 unlinked frames include 11 uniform frames. Archive linkage counts
measure source coverage. Use runtime traces to confirm which unlinked frames
appear during play.

The inventory also shows the number of reflected combat effect replacements.
The Council and Textile House Chrome replays verify the leftward diagonal
arrows and both reflected Magic Missile impact frames in live combat,
including effect timing, cleanup, and display switching.

The Valhingen roaming zombie uses its Enhanced illustration during the
encounter and parlay menus. The matcher recognizes the original base
portrait with its XOR animation deltas at both script cursors. Chrome
verified both menus and display switching from a controlled checkpoint
that selects the neutral roaming zombie branch.
The attack-warning pause has four separately illustrated moon-and-cloud
phases. Chrome matches each of the five original viewport states to its
own Enhanced frame and verifies display switching without save changes.
The same Parlay menu retains the Enhanced wight and skeleton portraits.
Chrome verified the stance choices and display switching for both
from controlled roaming checkpoints.

At the Temple of Bane, the patrol Parlay menu keeps the Enhanced outdoor
portrait for goblins, orcs, hobgoblins, and ogres. Chrome verified the
original stance choices, the loaded portrait, and mode switching for
each species through the patrol's spotted branch in controlled replays.
The separate Black Hand orc encounter uses a dedicated illustration
during the opening dialogue and Parlay. The controlled Chrome replay
checks the original Nice response, which dismisses all four orcs.

Enhanced mode draws separate 96×96 selection frames behind standard-size
combat sprites and the icon editor previews. The combat and inactive
editor frames link to COMSPR.DAX blocks 25 and 153. Chrome verified the
active frame behind a selected Sokal orc and both frame states across the
editor's four previews, along with the Classic switch. The Sokal
courtyard manual replay also checks the Aim reticle above the Enhanced
selection frame and below the targeted orc sprite at its guest position.
Larger units use one frame per native 24×24 cell. Chrome verified the
vertical pair behind the Slums ogre, the horizontal pair behind the Wild
Cave lizard, and all four cells behind Tyranthraxus.
The art inventory lists all 26 COMSPR.DAX frames. Twenty have direct
links, including two thrown-axe frames. Two more axe orientations are
derived from block 3 by a horizontal reflection and a transpose. The
inventory records those transforms with their source previews.

The `new-phlan-council-magic-effects` replay uses a controlled slot A
checkpoint to reach the level-three mage's wand volley. Both flight orientations and both
impact phases render over the battlefield and actor layers. Each effect
matches the native draw and placement. Classic uses the captured guest
frame, and the effect layer clears when the animation finishes.
The replay holds a captured effect frame during a display switch and
checks that Classic displays the exact guest PNG.
The same replay checks the Council arrow's original launch at (80, 80)
and arrival at (56, 32) through the six-frame presentation cap. Separate
Chrome replays of the Council reserves and tavern brawl verify the other
three arrow directions, their native anchors, and display switching.
The Textile House hobgoblin replay checks the lower-right arrow from
(80, 32) to (152, 104) and its cleanup after the shot.
Long flights spread the sampled positions across the path. The tavern
replay's longest shot kept its six displayed positions and reduced the
largest gap between them from 112 to 32 native pixels.
The Council reserves replay checks all four thrown-axe orientations in
Chrome. The flight sampler favors keeping a copy of each orientation
while preserving launch at (80, 80) and arrival at (128, 104).
The Tempus fight replay verifies the reflected flight cels and all four
Hold Person phases at seven native targets, including two targets in a
single input. Enhanced playback shows one four-phase cycle per target.
Chrome checks native outcome text, effect cleanup, and mode switching.
Tyranthraxus's lightning uses four orientations and both existing impact
phases. The hill giant's boulder uses two orientations. The Chrome combat
replays check the native launch and arrival positions and the outcome text.
The `buccaneer-pen-defeat-effect` Chrome replay starts from slot A
outside the pens and checks the Enhanced skull marker at
(104, 104), the damage and defeat reports, and removal at the next
settled frame. The renderer captures the original defeat draw at its pause.
The replay checks Dorn's hit and the buccaneer going down without tying
the marker to one damage roll or the optional dying suffix.
The `valjevo-party-defeat-effect` replay starts at the hill giant's room
in slot B. It verifies the same marker and the original dying report
when Rhiannon falls at (8, 80).
The source matcher also verifies the brighter COMSPR 139 skull frame.
It reuses the Enhanced skull drawing and brightens it for that native
phase. The above live replays observe COMSPR 11.

Kuto's roaming lizardfolk use a dedicated 352×352 ruins illustration
at four script positions. Chrome exercised the approach, Advance and
surprise dialogue, and mode switching using controlled native encounter
rolls. The separate giant-lizard escort has its own area portrait.
The armed kobold watch uses its own 352×352 illustration in those same
four roaming branches. Chrome verified its approach and dialogue in
both display modes. The sickly kobold scouts have a separate portrait.

The Valjevo Maze captain retains his Enhanced illustration in Parlay and
in the password and authority challenges. Chrome verified all three
prompts in both display modes from the Maze patrol slot B checkpoint.

The Valjevo records replay checks the Enhanced illustration when the
party finds evidence of the Red Wizards' alliance. It also checks that
the image clears on the next page and that accepting or declining the
read prompt governs which discoveries the journal records. Switching
to Classic at the discovery displays the exact guest room frame.

The `swamp-elder` and `swamp-elder-decline` Chrome replays verify the
illustration of Drythh confronting the elder at his arrival and the
champion request. Classic displays the exact guest frame at both pauses.
The journal learns of the challenge when it happens and retains the
corresponding branch when the party accepts or declines.
On the decline branch, the replay verifies the separate illustration of
Drythh ordering his followers to attack and its removal on the next
Enter press.

The Yarash fountain escape has a dedicated illustration at the native
explosion prompt. A controlled Chrome replay selects that branch, checks
the illustration and display switching, and verifies that Enter clears
it. The regular `river-fountain` replay checks the dismantle branch and
its journal changes.

The `valjevo-tower-fire-giants-refuted` replay follows the original No
branch from slot B. Chrome checks the fire giant's outburst illustration
and the separate image of his companions restraining him at Stay/Leave.
The `valjevo-tower-fire-giants-agree` replay uses the same slot B and
checks the original Yes branch. It verifies the illustration of the
giants reaching for their clubs and the next image as they turn on the
party.

After the bronze dragon falls in Valjevo Castle, Enhanced shows a
dedicated illustration through Tyranthraxus's spirit dialogue. A Chrome
replay from the controlled slot B checkpoint with boosted party HP
verified the decoded illustration, clearance at the departure prompt,
and preservation of guest state and save bytes across display switches.

The `valjevo-dragon-loot` Chrome route checks the hoard illustration beside
the Pool of Radiance at the original treasure menu. Exiting treasure
advances to the separate spirit illustration.

The same controlled replay verifies the separate Old Phlan street
illustration on departure from Valjevo. Chrome decodes the 4× art on the
departure narration, preserves the frame and save across display modes,
and clears the illustration on arrival in civilized Phlan. The follow-up
City Hall replay saves the final council turn-in and reloads the
completed campaign journal.

During the Valhingen vampire's retreat, Enhanced replaces the original
standing picture with the vampire dissolving into vapor. The binding
follows the native PIC frame so movement clears it even if the old
dialogue is still visible. Chrome verified the artwork, clearance on
turning, and save and state preservation across display switches. The
local replay selected the original victory branch at the battle prompt
to reach the transformation.

The Small flail uses original 96×96 ready and strike sprites with material
masks for both Body colors and Hair. Chrome checked each color control in
the native editor and both saved green poses in live combat. Switching
display modes preserved the game state and the combat fixture save.

The Human flail now keeps its Enhanced ready and strike sprites when
recolored. Chrome verified both Body channels, Hair and dark Weapon in
the icon editor, and both saved green poses in a controlled combat replay.

The river commission journal now records Tyrmor's book and entry 26
when the party reads the discovery text under the body. A Chrome replay
from a local pyramid approach checkpoint checked that the lead is absent
before searching and present when the player opens the journal afterward.

Poleaxe and glaive color changes retain both Enhanced poses for the
Small and Human defaults. Chrome checked both Body channels, Hair and
dark Weapon in all four editor configurations, and both recolored Human
glaive frames in a controlled live battle.

The `tyrmor-journal-discovery` Chrome route verifies that the illustration
appears after the corpse prompt, fills the picture panel, and clears
on Continue. Its slot B fixture places the party next to the corpse
with the discovery flag clear. The replay uses the original Search
action and verifies that display switching preserves state and the save.

The `tyrmor-journal-discovery` route uses Encamp to save the new clue in
slot B. The `tyrmor-journal-reload` Chrome route loads that save, opens the
journal, and verifies the clue and display switching.

The first Tyrmor prompt now shows the stripped body by itself. Chrome
verified that searching then swaps to the book illustration, and that
walking in without Search shows the body without revealing the book
or adding its clue. The replay uses the local slot B approach fixture.

Shield-and-dagger and shield-and-mace keep both Enhanced poses in Small
and Human sizes when recolored. Chrome verified both Body and Shield
channels and Hair in the native editor, plus the saved Human mace poses
in a controlled combat replay.

Run `tyrmor-corpse-without-search` with the same slot B fixture to verify
that the body illustration clears when the party continues and that the
Encamp journal has no entry 26 clue.

Shield combinations with flail, bearded axe, war pick and hammer retain
Enhanced artwork when recolored in both default sizes. Chrome verified
both poses and the Body, Hair and Shield changes in all eight editor
configurations.

Ferran's farewell at Sokal Keep uses a dedicated portrait while he fades.
The `sokal-ferran-farewell` Chrome route uses a local slot F checkpoint,
keeps the existing portrait during the parley, and verifies the new art,
clearance on Continue, and state preservation across display switches.

The Ferran farewell replay also opens the journal before and after the
parley and confirms that the departure clue appears only after the party
hears it.

The default Small and Human combat appearances now have recolorable
Enhanced artwork for all 32 ready-and-strike pairs per size. Chrome
checked the final 18 editor combinations and both recolored Human
robed-wand poses in a controlled battle. The inventory confirmed both
masks for all 64 default combinations.

The `sokal-password-patrol-departure` Chrome route follows Ferran's parley
from a local slot F checkpoint, walks back to the patrol, and speaks
Samosud. The standing guard portrait stays visible during the password
prompt. Enhanced shows the undead retreat when they accept the word,
then clears the art on the next step. Display switching preserves state.

The `sokal-password-patrol-arrival` route uses a local slot C patrol
checkpoint and verifies the same retreat illustration on Shestni.
The art clears on the next step and display switching preserves state.

The swept-auburn Human head has material masks for all 32 native weapon
choices. Chrome checked both ready and strike poses with Body dark,
Body light, Hair and Face changes. A controlled battle also verified
the saved bow colors in both poses and Classic/Enhanced switching.

The Sokal reward and campaign finale share the council clerk's native
portrait pause. Enhanced now checks the finale dialogue before choosing
the victory artwork. Chrome verified the ordinary clerk during Sokal's
reward and the victory artwork at the final council reward. These replays
started from local Sokal and post-victory checkpoints.

The Sokal Keep turn-in now shows the clerk tracing the boat route on a
chart. A Chrome replay walked from the local Ferran checkpoint to City
Hall, verified the illustration and the original 1,308 XP award, and
checked display switching. The final council replay still shows the
victory artwork and saves the final turn-in.

The black-sideburns, wavy-beard, and gray-temples Human heads now have
recolor masks for both poses of all 32 weapon choices. The inventory
confirmed all 96 pairs. Chrome checked representative editor choices
and controlled live bow, sabre, and robed-wand battles, one for each head.

The `sokal-council-turn-in` Chrome route now repeats this check from
the Ferran checkpoint. It verifies the ordinary clerk at entry, the
boat-route artwork at the reward, and the XP screen after Continue.

The `bivant-reward-illustration` Chrome route verifies the clerk's
ordinary introduction, the dedicated Bivant coffer illustration, and
the 19,250 XP reward from a local City Hall checkpoint. The illustration
has a dialogue cue because it shares the native portrait pause with Sokal.

The spiky and bald Small heads now retain Enhanced color changes for both
poses of all 32 weapon choices. Chrome verified representative editor
choices and the recolored shield and crossbow in separate controlled
combat replays. The bald head's native Hair control leaves it unchanged.

The `bivant-reward` Chrome replay keeps the rescue commission pending
while the party claims the reward items, then saves the turn-in to slot A.
The `bivant-reward-reload` replay opens that save and checks the completed
commission and display switching.
The `buccaneer-bivant-purchase` replay starts from slot A outside the
captain's room. It checks that the offer records the price, the handoff
illustration and purchase clue appear only after buying the boy, and the
illustration clears when the party is escorted outside. It then saves
through Encamp. Pass that printed save to `buccaneer-bivant-purchase-reload`
to check that the price and purchase persist without clues from the
separate pen escape or failed escort branches.

The plumed, plum cap, wine pennant, and jade helm Human appearances
now have recolor masks for both poses of all 32 weapon choices. Chrome
verified representative editor choices and controlled live axe and
longsword-and-shield replays. Hair follows each head's native behavior.

The `mendor-records-reward` Chrome route checks the Lex Geographica
illustration at its specific City Hall dialogue, clearance before the
original 500 XP reward, and the book's journal turn-in. The replay uses
a local checkpoint with the atlas ready to report.

All 448 distinct Human combat icon combinations now have recolor masks
for both poses. Chrome checked five representative editor bands and
controlled flail, robed gesture, and robed rod battles. The shaven-scar
head follows the original Hair control, which leaves it unchanged.

The `bane-reward-illustration` Chrome route checks the clerk's ordinary
portrait before and after the dedicated illustration for keeping the
temple treasure. A local City Hall checkpoint verifies the journal moves
from ready-to-report to turned-in.

The combat recolor matcher skips windows identical to their backdrop.
A local benchmark using 12 empty 320×200 frames and the full art pack
measured 644 ms per frame before this change and 11 ms afterward.
A controlled Chrome combat replay still verified both recolored flail
poses and display switching.

The `river-reward` Chrome route checks the restored Stojonow trade route
illustration, the original 34,250 XP reward, and the commission turn-in.
It uses a local City Hall checkpoint with the river ready to report.

All 352 distinct Small and 448 distinct Human head-and-weapon pairs now
have both Enhanced recolor masks. For the final Small batch, Chrome
checked eight representative editor bands and controlled combat with
Azure Skirmisher, plumed crossbow and crested robed rod appearances.

Recolor matching uses sampled silhouette pixels to reject impossible
candidates before checking the exact palette mapping. In the controlled
Azure Skirmisher Chrome replay, the first 100 terrain-backed matcher calls
had a median of 39.7 ms, down from 133.8 ms with the same 3,200 candidates.
Chrome verified both combat poses and representative bald Small editor
choices after the optimization.

The `nomad-reward` Chrome route checks the clerk receiving the Nomad
Camp report, the original 5,900 XP reward, and the journal turn-in.
The route starts from a local City Hall checkpoint ready to report.

The `zhentil-reward` route checks the clerk's illustration for the swift
envoy return, clearance before the original 12,750 XP award, and the
journal turn-in from a local City Hall checkpoint.

The `swamp-reward` route verifies the Lizardman commission strategy-table
illustration, the original 14,800 XP award, and the journal turn-in from
a local City Hall checkpoint.

Oil flasks and sling shots use six Enhanced projectile frames between
them. Controlled Buccaneer fights used original readied item records.
Chrome verified both flights at the native endpoints, their damage and
casualty reports, removal after flight, and state-preserving mode switches.

The `buccaneer-oil-flask` and `buccaneer-sling-shot` Chrome routes take
their respective controlled Buccaneer pen slot A saves and check all
projectile phases, native endpoints, render order, damage, aftermath,
and save preservation across display switches.

The `kobold-king-reward` route checks the empty throne illustration in the
clerk's reward dialogue, follows the original 6,250 XP award, and saves
the journal turn-in from a local City Hall checkpoint.

The `buccaneer-arrow-down` route checks a manually aimed downward longbow
shot from a controlled slot A checkpoint. Enhanced uses the vertically
reflected arrow artwork for COMSPR block 128, with the original flight
endpoints, three-damage report, cleanup and save preservation.

The Lex Geographica discovery now shows the atlas being pulled from the
library shelf. The Chrome replay used a local fixture and a test-only
selector for the original random atlas branch. It checked the discovery
art and the return to the original item choice.

The current runner replayed from the local Ferran checkpoint through the
Sokal and Podal rewards, outfitted the party, and reached Grishnak's temple
after winning the Textile House courtyard and prison fights.

The default verification suite checks eight reward cues that share the
same council portrait pause. Each selects its own installed illustration
and falls back when that art is unavailable. The finale cue is tested
separately from the ordinary reward variants.

The `council-slums-offer` Chrome replay starts from controlled slot A at
`5,5 E` outside the clerk's office with the Slums and Sokal work available.
On GOG 1.3 the clerk points out the western slums on a city model, then
the original Sokal Keep offer follows on the next page.

The `stojanow-gate-reward` Chrome replay on GOG 1.3 checks the Council
clerk's artwork as she checks for a reward, sorts the remaining
commissions, and recognizes the returning party on a second visit.
Each picture matches the original dialogue and fills the picture panel.
Closing the last prompt returns the party to exploration. On the way
back into the office, the replay also checks the guards posted at the
clerk's door. Turning away brings back the WebGL view even while the
old room description remains in the text box.

The Grand Historian's Records discovery at Mendor's Library uses its
own illustration. Chrome ran the original search from a local Library
checkpoint, confirmed the art cleared at Take It, and checked entry 21
became ready to report when accepted.

Stinking Cloud uses a 96×96 replacement matching RANDCOM frame 4.
A controlled Textile House replay prepared the original spell for Mira.
Chrome verified all four tiles, the actor overlay, the cast and choking
reports, and spell cleanup with the save preserved across display modes.

From the local Mendor checkpoint, the History of the North route reaches
entry 8 through ordinary search inputs. Both book discovery routes verify
their own illustration, the original Take It prompt, and the journal entry
after accepting. The `textile-stinking-cloud` route repeats the controlled
cloud placement, layering, report and cleanup checks.

Enhanced Manual Aim shows the selection artwork over empty squares.
The `buccaneer-empty-manual-aim` Chrome route verifies four native cursor
positions, Escape cleanup, and the original frame and save across
display switches from a controlled Buccaneer checkpoint.
The `kuto-wide-manual-aim` replay moves the single-cell cursor across
both halves of a giant lizard while the full Enhanced sprite stays
visible. The source matcher test checks both native-pixel placements,
restores the underlying terrain, and rejects a cursor reported on the
wrong half.
The same Chrome replay checks the lizard whose native origin lies left
of the battlefield. Its Enhanced artwork is cropped at the same edge.
The matcher tests cover both horizontal edges, including a reflected
pose, and confirm that restoring the terrain leaves pixels outside
the battlefield untouched. They also place the native single-cell
Manual Aim bevel on the visible half at each edge.

The `sokal-floorboard-diary` Chrome route checks the ghost pointing to
the board, the distinct diary and gems discovery illustration, and the
return to the original gems choice. A companion replay declines the
gems and confirms that entry 3 stays in the journal.

The Sokal floorboard replay now declines the gems, saves through the
original Encamp menu, and verifies the entry 3 discovery in slot C.
The `sokal-floorboard-diary-reload` route reads the slot from the
checkpoint. A Chrome replay loaded the fresh party’s slot I, verified
the retained clue across both display modes, and compared the save
byte for byte after switching.

The Sokal courtyard Chrome replay also checks the empty hall artwork
from a controlled checkpoint with the courtyard battle flag set. The
illustration stays visible while turning in the hall and clears to
WebGL exploration on leaving at (8,4) facing north.

The `sokal-courtyard-note` replay uses the opt-in developer victory
command on a copy of the fresh party’s slot I. The original combat
cleanup and treasure menus lead to the Entry 57 discovery. Chrome checks
the note illustration, the journal entry, and that the art clears when
the party moves on.

Enhanced Manual Aim shows its targeting reticle over occupied squares.
A controlled Buccaneer Chrome replay checked ordinary Aim and moving
Manual Aim between allies and enemies, followed by Escape cleanup.
Classic frames and save data remained intact across display switches.

The `yarash-desk-papers` route searches the desk from a local pyramid
checkpoint. Chrome confirms the papers illustration starts after the
initial desk prompt, persists through the five document pages, and
clears for exploration. The journal records entries 33, 49, 27, 56 and
40 from their individual disclosure lines.

The desk route saves through Encamp after reading all five documents.
The `yarash-desk-papers-reload` Chrome route opens that slot A save and
verifies all five entries in the journal and display switching.

An empty Manual Aim square now gets the targeting corners over its
Enhanced selection art. A controlled Textile House Chrome replay targeted
an empty square with Stinking Cloud and verified the original cast,
reticle cleanup, and state preservation across display switches.

The `sokal-armory` route checks 12 tile patterns across ten approach views,
the illusory-wall illustration while its narration remains visible, and
the separate hidden cache artwork at the native equipment choice. Chrome verified
both branches from a local armory checkpoint. Declining leaves the
equipment in place. Accepting clears the artwork and awards 400 XP.

The `textile-diary-discovery` Chrome route checks the new Textile House
illustration and Entry 11 journal lead when the party steps onto the diary
square. The art follows the original narration through a turn and clears
when exploration resumes. Display switching preserves the game and save.

The `textile-cadorna-confrontation` Chrome route starts with the opened box
checkpoint, takes the original ferry, and verifies Cadorna's City Hall
confrontation illustration and journal lead. The illustration clears as
the party walks on to the clerk's office.
