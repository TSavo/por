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
Use `--fresh-sokal-reinforced` with the same strict setting to continue
with this party through the goblin room, sale of its enchanted armor,
recruitment at the arena, and the boat to Sokal Keep. The replay checks
manual sword and bow attacks in the courtyard, then reloads the landing
save and verifies the recruits' improved armor and prepared Hold Person.
From that equipped save, the same replay gives the wrong word, wins
the patrol fight, and gives the correct word to a later patrol. It then
wins the smithy fight, collects the hidden armory gear, and reloads.
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
in the Chrome presentation verifier. It checked 56 patterns across 24 views
and verified Brin's selected combat icon and the orc under the Aim cursor
in both display modes.
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
Hall. After the long-division fix, that same checkpoint beat the original
enemy again and the battle screen displayed 917 XP per character. The
party collected the final council reward and saved in slot C. Reloading
the slot and opening the journal still showed Phlan is free. This verifies
the fight and ending with the original enemy and the edited checkpoint
party. A party trained by playing the campaign through from a fresh
start remains to be verified.
Run `node tools/verify-fresh-party.mjs --castle-ending-checkpoint PATH_TO_SLOT_B`
with the prepared party outside the audience hall at `14,7 S`. With
`POR_REQUIRE_UNINTERRUPTED_COMBAT=1`, the replay verifies the original
80 HP opponent and that Quick completes the fight without watchdog
intervention. It also checks the 67,500 XP council award, the journal's
ready-to-report, reward-pending, and turned-in states, and the ending
objective after reloading slot C.
The controlled replay then changes the tracked objective, saves through
Encamp to slot D, and reloads that slot. The journal retains both the
selection and the castle turn-in, and slot C remains byte-for-byte intact.
Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_C PATH_TO_CHROME castle-ending`
with that completed save. Chrome reloads slot C, checks that the journal
displays **Phlan is free**, switches both presentation modes while the
journal is open, and returns to play with the save bytes unchanged.
The replay checks that focus enters the journal on Return to game and
returns to the game screen on close. With a remaining commission, it
also verifies that tracking the commission keeps focus on its button.

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
portrait closing on No.
The journal records the infirmary once the party hears the offer of healing.

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
The Slums infantry and Textile House priestess share a guest image pattern.
Area-scoped overrides keep their new artwork distinct, verified live in both fights.

The enhanced Textile House environment has 166 individual 32×32 PNGs
for the traced courtyard approach, west wing, and temple corridors. Chrome
checked the merged pack in 40 live views (4,840 placements) across three
checkpoint replays and verified state-preserving presentation switches.
The temple approach also displayed the enhanced Grishnak portrait.
Run the browser verifier with `textile-approach` (slot B inside the entrance),
`textile-wing` (slot J after the courtyard fight), or `textile-temple`
(slot I outside Grishnak's temple at `2,13 N`).

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_I PATH_TO_CHROME textile-altar`
with a checkpoint outside Grishnak's temple at `2,13 N`. The replay checks
the 352×352 altar portrait, the selected 96×96 priestess sprite, the captains'
movement, and the captain's strike during browser animation playback. It
also switches presentation in the dialogue and combat.

Stojanow Gate has 47 individual 32×32 terrain replacements. Chrome checked
3,630 placements across 30 clean views from slot A at `4,15 N`, reached by
ordinary travel from Podal Plaza. The three approach views now check a
separate 96×292 bugbear sprite over the same 121 placements as the preceding
clean view. A separate replay from the same save verified the enhanced bugbear
standing and sword strike poses. The New Phlan armorer portrait appeared at
the shop greeting and Buy menu. Both replays checked presentation switches.
The browser verifier exposes `stojanow-gate`, `stojanow-west`,
`stojanow-east`, and `stojanow-bugbears` for the gate entrance save.
The `stojanow-trader` route uses a controlled daylight slot B at `4,15 N`
and verifies the new wagon trader portrait in the parley. Use `armorer` with slot A
at the New Phlan west gate (`0,4 W`).


The Zhentil journal follows the packet seal instructions, mounted patrol,
commandant handoff, quarters, ambush, and escape. The translation verifier
uses the original ECL text for each discovery and exercises acceptance
through the translated setter. The `zhentil-envoy` Chrome replay uses
controlled slot A in the western overland sector with the commission
acceptance flag set and the party positioned near the mounted patrol.
It follows the original escort, paper handoff, tour, dinner, and nighttime
ambush. It checks that the journal unlocks each discovery in order and the
new 352×352 commandant portrait survives mode switching during the handoff.
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

Old Phlan's northern gate has 56 individual 32×32 terrain assets. The
`north-gate-rampart`, `north-gate-quarter`, and `north-gate-houses` routes use
slot A at `4,0 S`, reached by ordinary overland travel. Chrome verified 5,929
placements in 49 frames, including opening and crossing a house doorway.
The `stojanow-briefing` browser route uses a controlled slot B at `5,8 N`
to verify Urslingen's 352×352 mission portrait and a state-preserving switch.

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
The `graveyard-vampire` replay uses controlled slot A at `14,0 E` to check the
128×320 threshold sprite, 352×352 dialogue portrait, and both 96×96 combat
poses. It verifies presentation switches in approach, dialogue, and combat.
The `graveyard-wolves` Chrome replay from the western vampire approach verified two
192×96 wolf poses from the default upgrade pack. It observed two wolves
standing on their original 48×24 footprints and the bite frame during combat,
then switched both ways and checked that the live frame and save were preserved.

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
The `river-passage` replay loads the slot A save printed by
`river-approach` and verifies both the journal's retained entrance clue
and the first two original hidden-door discoveries in the passage.
The `river-fountain` replay starts from a controlled lower-pyramid save
at `1,1 E`, just outside the chamber. It enters through the original door,
checks the witnessed fountain clue, selects Destroy the Equipment, and
verifies that the journal switches to ready to report and saves that status.
This covers the direct shutdown outcome in Chrome.
The fountain replay also checks the new 352×352 illustration
(`portrait:PIC7.DAX:45:0:0`) and both display switches during the encounter.
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

The `swamp-reward` replay uses a controlled City Hall save carrying flag
254 and the witnessed pledge from the duel result save. Chrome checks the
clerk's original lizardfolk reward dialogue and verifies the transition
from ready to report through reward pending to turned in.

The `buccaneer-approach` Chrome replay starts from a controlled
overland save with the Bivant commission tracked. It verifies the new
352×352 mounted escort scene at the Enter/Leave decision, mode switching,
and the transition into the base. It checks that the journal records the
base before showing any clue about the heir. The translation verifier
covers the pen search and the separate unpaid outcome after a failed rescue.
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
The replay releases the animals, crosses to the slave pen, bashes open
the locked gate and takes the boy. The journal reveals each discovery
as it happens, including the guards leaving their posts and the boy
leaving with the party.
The same replay with `--repeat-stampede` uses a controlled merchants' camp
save whose journal records a prior release and recapture. It verifies that
the original Release Animals choice changes the journal back to the active
distraction and opens the route to the boy.
The Chrome replay continues toward the front gate through the first
guard interception. The translation verifier checks that the journal keeps
the escort active inside the base and asks the party to report to the
council once it is outside. The `bivant-reward` Chrome replay starts from
a controlled City Hall save with the rescue flag at 254. It verifies the
clerk's dialogue, claiming the sword and scrolls, and the turned-in
journal entry in the resulting save. The gate escape through the council
reward still needs a continuous replay.
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
The `river-reward` replay uses a controlled City Hall save with the
completion flag and witnessed clues from the fountain save. It checks the
clerk's original river dialogue and verifies that the journal stays reward
pending until the player closes the reward menu.
The translation verifier checks that the next step changes at each discovery
and points back to New Phlan after destruction. It also checks the original
council reward dispatch and progress flag. These checks use original ECL
fixtures and the translated setter.


Two Valjevo Castle threshold routes from the controlled slot B checkpoint
displayed the new 32×32 assets across five views and 605 placements, then
entered Tyranthraxus's dialogue. A separate controlled City Hall checkpoint
verified Ulrich's 352×352 portrait during the assault briefing. These Chrome
replays checked that presentation switches preserve the live frame and save.

The `assault-briefing` route also checks the escort captain's 352×352 portrait
before Ulrich appears. The `castle-halls` and `castle-dragon` routes check
individual threshold tiles before the dragon dialogue.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_H PATH_TO_CHROME textile-ogre`
from the controlled prison-key checkpoint at `2,15 S`. Chrome verifies the
ogre chief's 96×192 standing and mace-strike sprites, their rectangular
placement, and a state-preserving presentation switch.

The `sokal-smithy` browser route loads a party at `10,10 N` in slot C and
checks the 96×96 poison frog crouch and lunge in live combat. It switches
presentation before the attack and checks that the selected save stays intact.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_B PATH_TO_CHROME castle-dragon`
with a castle checkpoint outside the audience hall at `14,7 S`. Chrome checks
the 352×352 dialogue portrait and 192×192 combat sprite, including the sprite's
position, facing, and four-cell selection. The test toggles classic and
enhanced in both scenes and checks the guest frame and save stay the same.

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
parchment and tries an unrelated word at the first undead patrol. The
original script rejects it and starts combat. The journal points back to
the parchment and keeps the successful passage and altar discoveries hidden.

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
uses manual Sleep targeting to win the courtyard and prison fights with
the default watchdog. It reloads the party's recovery and equipment
before reaching Grishnak's temple.

The Podal Plaza replay starts from that post-Sokal save at the clerk.
It buys westbound passage, walks from the landing to the north entrance
at the western edge of Phlan, and enters Podal Plaza in disguise. After
the party observes the wand exchange, it saves and reloads with the
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
in the journal after collecting the reward and reloading.
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
