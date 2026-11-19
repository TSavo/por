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
Switching slot D back to automatic tracking restores the **Phlan is free**
objective while retaining the castle turn-in.
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
The goblin dialogue also checks the separate 352×352 captive scene and
switches modes at the original Kill Them / Let Them Go prompt. The
replacement uses the shared source picture only in the temple interior.
The same replay checks 25 individual 32×32 tiles over 12 views near the
captive room, including the slate ceiling, masonry joints, and oak door.
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
The Chrome replay checks that the merchants' camp announcement changes the
objective to following the fence. The first slave-pen description changes it
to looking among the prisoners. The boy's birthmark stays hidden until the
party sees it in the next dialogue.

The translation verifier checks the Kovel Mansion journal against the
original chase, split, guildmaster, release, and ambush dialogue. It also
checks that the mansion's local victory flag updates the objective and
that the same flag in another area has no effect. The `kovel-guild-files`
Chrome replay starts inside the mansion at (7,14) east with the commission
tracked. It checks that entries 38 and 51 are only suggested after the party
finds the files on the floor. The chase branch still needs a live replay.
The translation verifier also checks the file discovery and chase in both
orders, including with the first clue restored from a save. The tracked
objective uses the most recent discovery in each case.
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
guard interception. The translation verifier checks that the journal keeps
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
The `phlan-ferry-river` and `phlan-ferry-east` presentation replays start at
the river and East Overland docks using controlled slots A and B. Both check
the original Take Boat / Stay prompt, its shared 352×352 illustration, and
state preservation across presentation switches.
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

The `nomad-camp-approach` replay checks the overland camp illustration at
the Enter / Leave choice. `nomad-tent-lane` and `nomad-camp-rim` start at
`2,14 E` in a native save made after entering the camp. Chrome verifies
1,573 placements across both branches, using 49 new 32×32 tiles.
The `nomad-headman` and `nomad-headman-stay` replays start from the overland
camp checkpoint. They verify the headman's portrait, the journal's feast
invitation, entry 55, kobold warning, and overnight decision. Each replay
selects a different response and checks that the journal records only the
response witnessed by the party.
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
The `kuto-north-guard-approach` and `kuto-north-rubble-loop` replays branch
from the same native entry save. Chrome verifies 3,388 placements across
28 views, including 23 new 32×32 tiles for the northern ruins.
The `kuto-norris-surrender` replay uses a controlled slot J beneath the well.
It verifies that the journal learns of the ambush, then independently records
surrender only after the party sees the outcome. `kuto-norris-combat` uses
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
turned in and the council's standing records offer remains available.
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
The escort replay checks 121 individually positioned tiles in each of 17
views, including the prompt when the guide taps the cave wall. Seventeen
new 32×32 tiles cover the doorway jambs, cave wall ribs, and floor joins.
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
and verifies that moving north through the door reaches (5,0).
It also tests the surrender demand, restores the prison escort clue from a
saved journal, and checks the separate cell and Fatima outcomes against
their original dialogue. The surrender branch still needs a live replay.

The `kobold-princess-fatima` replay uses controlled slot B to check her
portrait and journal entry 16, then verifies that she joins the roster.
The `kobold-cave-guide` replay checks the area-scoped guard portrait and
the escort clue when the party wakes the guide. `kobold-small-cave-pool`
and `kobold-large-cave-loop` start from slot B saves made through the
original cave entrances and check 2,541 placements across 21 views,
including 43 new individual tiles.
The `kobold-cave-guide` replay verifies the scoped portrait and confirms
that the journal learns about the escort only after the offer.
The `kuto-catacomb-service-loop` replay uses controlled slot J below the
well and turns away from Norris's ambush. Chrome checks 2,057 individual
placements across 17 views, including 32 new 32×32 tiles.
The `diogenes-advice` replay checks the 352×352 magic mouth through the
intent menu, between the exterior illustration and the silver dragon portrait.
The `textile-restal` replay uses a controlled slot C. It verifies Restal's
352×352 portrait and that the Textile House shortcut appears in the journal
after he offers it.
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
`valjevo-genheeris-bargain` and `valjevo-genheeris-orders` verify the
middle and near approach sprites, the 352×352 illustration, mode
switching, and the distinct journal lead
from each choice of parlay tone. The bargain replay also confirms
that accepting the offer adds Genheeris to the original party roster.
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
`kobold-cave-efreeti-approach` and `kobold-cave-wyvern-approach` verify
the close-distance replacements at 160×320 and 352×320 respectively.
Chrome checks the exact source ID and screen anchor for each and switches
presentation with the same frame and save. These inputs reach the close
pose for each creature.
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
`valhingen-zombie-stairs` checks the staircase illustration at the
original zombie prompt, including panel fit and mode switching.
`sokal-undead-patrol-dialogue` checks the patrol illustration at its
original prompt. `new-phlan-proclamation-walk` checks six redrawn City
Hall and garden tiles across 15 live views and 1,815 placements.
`new-phlan-north-avenue` checks 20 redrawn shrine and street tiles across
15 live views. `valhingen-grave-claws` and `valhingen-skeleton-enclave`
check original prompts, panel fit, and state-preserving switches.
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
`new-phlan-jeweler` and `new-phlan-silver-shop` check that the shared
merchant portrait fills the panel at both original shop prompts.
`new-phlan-cleric-trainer` and `new-phlan-thieves-trainer` verify the
class-specific training prompts, distinct portraits, and panel fit.
`valjevo-fire-giant-dialogue` checks the barracks portrait at the
original encounter and through the password dialogue after Parlay.
`zhentil-quarters-guard-dialogue` checks the portrait at the guards’
quarters restriction, including panel fit and mode switching.
`lizardfolk-battle-wall` checks two independent wall tiles across four
giant-lizard combat turns, outside the live actor bounds.
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

The `assault-briefing` route also checks the escort captain's 352×352 portrait
before Ulrich appears. The `castle-halls` and `castle-dragon` routes check
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
all 968 placements across eight approach views, including the six original
timber and window tiles in the audience hall. It then checks
the 352×352 dialogue portrait and 192×192 combat sprite, including the sprite's
position, facing, and four-cell selection. The test toggles classic and
enhanced in both scenes and checks the guest frame and save stay the same.
The same replay now checks the 192×192 bite at its position in the live
combat animation. With `POR_TRACE_BATTLE_TILES=1`, it captured 22 frames.
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
portrait, the journal discovery, and the picture clearing on Ohlo's package
handoff. The merchant's area-scoped composite also lets the Stojanow wagon
trader keep his own portrait.
The `buccaneer-captain-combat` replay uses controlled slot A at `8,12 W`
and checks both 96×96 sword poses in the captain's quarters fight.
The `buccaneer-guard-combat` replay uses the same checkpoint and checks
the guards' 96×96 ready stance and sword thrust alongside the captain.
The `sokal-elven-scout` and `sokal-elven-scout-search` replays use controlled
slot C with the parchment clue absent from the journal. Chrome checks the
scout illustration, the two paths, and that the parchment clue appears
only after the search reveals it.
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
in New Phlan, and `sokal-keep-departure-ferry` checks boarding at the keep
and the return to New Phlan. These replays check presentation switching
and save preservation.

`buccaneer-east-run` checks five new fence and corner tiles across
21 views and 2,541 placements. `nomad-inner-tent-lane` checks 11 new
canvas, foliage, and doorway tiles across 13 views and 1,573 placements.
`stojanow-tower-aide-combat` checks the 96×96 ready and longsword
strike poses. `textile-ogre-war-chief-approach` checks the sprite at
its original anchor on both dialogue pages.

`new-phlan-tavern-spinner` and `new-phlan-tavern-brawl` check both new
illustrations at their original prompts. The arena and harbor Watch mage
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
the council guard portrait. At each tour stop it checks all 121 enhanced
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

The `new-phlan-south-shop-exit` replay starts from slot A at (9,11)
facing west. Chrome verifies the shopkeeper portrait at the offer and all
121 enhanced street tiles immediately after declining, before pressing Enter.
The replay checks 29 tile patterns across six views and preserves the save
through mode switches. A separate check at the offer requests an unavailable
portrait PNG and verifies that the original picture still fills the enhanced
picture panel while the web font remains visible.

Three more slot A replays exercise building exits with the browser's
default art packs. `new-phlan-west-shop-exit` starts at (12,8) east,
`new-phlan-training-exit` at (5,1) west, and
`new-phlan-tavern-back-exit` at (14,9) south. Chrome verified all 121
individual enhanced tiles in each of nine frames per route, including
the prompts before the exploration menu returns. Each replay also
checked that switching presentation preserved state and save bytes.

The `new-phlan-canal-room` replay starts from slot A at (6,1) facing
north. Chrome checks all 1,815 placements across 15 first-person frames
using 45 tile patterns, including turns inside the room, the walk out, and
looking back toward the passage. Switching modes preserves the save.
The same replay requests one unavailable tile PNG on the last view.
Chrome keeps the other 120 enhanced tiles, the first-person panel, and
the enhanced font. The original pixels fill the affected tile position.

The `new-phlan-arena-quick` route starts from the council checkpoint at
(6,5) facing east and uses Alda for the arena duel. Chrome checks the attack
and damage report before choosing Quick, then verifies that one Q displays
subsequent misses and damage and stops at the original Continue Battle
choice. The test drops the first automatic poll request and checks that
Chrome retries, advances to the choice, and preserves the save bytes.
