# Classic feature surface, from the original binaries and data

_Research pass on 2026-11-21. Read-only. Line numbers refer to the tree at that time._

# Pool of Radiance (Classic) feature inventory, built from the code and data files

I verified everything below by reading the files in `/Users/tsavo/por` and parsing `/Users/tsavo/por-assets/pool` with inline read-only Python. I created or modified no files. **[V]** means verified directly, **[I]** means inferred, with confidence noted. Binary evidence is given as `FILE@offset`. Files in `src/translated/` are cited by the original instruction address that appears in their comments (`// 32df: …`).

Biggest findings for the fidelity checks:
- **ECL opcodes:** PoR's real interpreter handles opcodes 0x00–0x3D except 0x1F. 0x1F and 0x3E–0x40 have no handler. The 0x00–0x40 table in the docs and `ecl.ts` is the Azure Bonds set.
- **Shops and temples** have no ECL opcode of their own. They run through the COMBAT opcode when no monsters are loaded and an area flag is set.
- **Palette and page calls are no-ops:** `video.ts` silently ignores palette changes (int 10h AH=10h) and display-page selection (AH=05h).
- **No hardware interrupts:** the sound driver's timer handler never runs in the emulator.
- **Unhandled DOS calls:** Set Date, Set Time and Rename (int 21h AH=2Bh/2Dh/56h) exist in the translated code but `dos.ts` would throw on them.

---

## 1. ECL opcodes

**What the docs say** (`docs/ecl.md:40-101`, `src/lib/ecl.ts:42-108`): a 0x00–0x40 table taken from Curse of the Azure Bonds (CotAB). `ecl.ts:1-4` labels itself scaffolding, and its `effect` column only describes an old stepper, not the game.

**The real PoR dispatch [V]** is a compare chain at `ovl03:32df`, called from the interpreter loop `ovl03_35db` (`tools/tp_translate.py:767-771`).

| Op | Name (CotAB) | PoR handler (ovl03) | Calls into slice [V] | Scripts using it [V] |
|---|---|---|---|---|
| 00 | EXIT | 0001 | – | 1114 / all 29 blocks |
| 01 / 02 | GOTO / GOSUB | 00ed / 010c | s7 | 1871 / 926 |
| 03 | COMPARE | 0123 | s7 | 1511 |
| 04–07 | ADD / SUB / DIV / MUL (one shared handler) | 01a0 | s7 | 318 / 78 / 30 / 12 |
| 08 | RANDOM (adds 1 to N, then System.Random → 0..N) | 0237 | System Random | 144 |
| 09 | SAVE | 0295 | s7 | 2338 |
| 0A | LOAD CHARACTER | 02e3 | s16, s25 | 36 |
| 0B | LOAD MONSTER | 044d | s33 | 329 |
| 0C | SETUP MONSTER | 03b1 | s7 | 187 |
| 0D | APPROACH | 07e1 | s7 | 99 |
| 0E | PICTURE | 0822 | s29, s27 | 135 |
| 0F / 10 | INPUT NUMBER / INPUT STRING | 091d / 0960 | s37 | 2 / 20 |
| 11 / 12 | PRINT / PRINTCLEAR (shared) | 09d5 | s37, s25 | 291 / 1400 |
| 13 | RETURN | 0a6b | – | 440 |
| 14 | COMPARE AND | 0ab5 | – | 66 |
| 15 | VERTICAL MENU | 0fee | s26, s37 | 15 |
| 16–1B | IF = <> < > <= >= (shared) | 0c5a | – | 688 / 635 / 181 / 282 / 25 / 128 |
| 1C | CLEAR MONSTERS | 133d | – | 251 |
| 1D | PARTY STRENGTH | 13a0 | s7 | 18 |
| 1E | CHECK PARTY | 1512 | s25 | 4 |
| **1F** | **no handler** | default branch | – | 0 |
| 20 | NEW ECL | 0cdd | s17 | 79 |
| 21 / 37 | LOAD FILES / LOAD PIECES (shared) | 0d80 | s30, s33 | 61 / 35 |
| 22 / 23 | PARTY SURPRISE / SURPRISE | 16fc / 1798 | s24 | 22 / 22 |
| 24 | COMBAT | 186c | s8, s5, s4 (temple), s6 (shop) | 244 |
| 25 / 26 | ON GOTO / ON GOSUB (shared) | 19c9 | s7 | 427 / 37 |
| 27 | TREASURE | 1a81 | s21, s24 | 77 |
| 28 | ROB | 1ea4 | s7 | 14 |
| 29 | ENCOUNTER MENU | 20b1 | s37 | 94 |
| 2A | GET TABLE | 0f44 | s7 | 271 |
| 2B | HORIZONTAL MENU | 11b1 | s37 | 205 |
| 2C | PARLAY | 27a8 | – | 41 |
| 2D | CALL (built-ins selected by address; one plays a sound through `27f:0`) | 3026 | s30, s27 | 178 |
| 2E | DAMAGE | 2ae2 | s24, s37 | 48 |
| 2F / 30 | AND / OR (shared) | 0ed5 | s7 | 356 / 207 |
| 31 | SPRITE OFF | 2df9 | s27 | 56 |
| 32 | FIND ITEM | 2847 | – | 7 |
| 33 | PRINT RETURN | 2e44 | – | 20 |
| 34 | ECL CLOCK | 2e1a | s20 | 1 |
| 35 | SAVE TABLE | 0fa2 | s7 | 17 |
| 36 | ADD NPC | 2edb | s17 | 8 |
| 38 | PROGRAM: 0 → party menu (s16), 8 → finale (s18), 9 → camp (s15, via 312a) then EXIT | 3167 | s16, s18, s15 | 4 |
| 39 | WHO | 2e90 | s37 | 11 |
| 3A | DELAY | 28f3 | s37 | 187 |
| 3B | SPELL | 2f64 | s7 | 1 |
| 3C | PROTECTION | 31d8 | s37 | 12 |
| 3D | CLEAR BOX | 2e6f | s37 | 27 |
| **3E / 3F / 40** | DUMP / FIND SPECIAL / DESTROY ITEMS | **none in PoR** | – | 0 |

- **Unknown opcodes [V]:** they fall to `ovl03:356d`, which writes `codeop = `, ` last = `, `string = ` (GAME.OVR slice 3, +0x32c2..0x32d5).
- **How COMBAT reaches shops and temples [V]** (`ovl03:1876-18c0`): if no monsters are loaded ([82ad]=0, [829a]=0), the handler checks area flags. Area `+0x6d8 == 1` runs the shop (s6), `+0x5c4 == 1` runs the temple (s4), otherwise it runs s5 (outcome and treasure). With monsters it runs combat (s8), then s5.
- **Usage counts [V]** come from a flow-following scan of all 29 blocks, base 0x9900. The scan hit 74 decode boundaries, so the counts are lower bounds.

**Where the docs say PoR may differ from CotAB [V]** (`docs/ecl.md:121-137`):
- Opcodes that "may be CotAB additions or renumbered": SPELL, PARLAY, ENCOUNTER MENU, CALL. All four exist in PoR at the same numbers, as the table above shows.
- Block ids, wall-slot rectangles, title composition, and the memory addresses scripts write to.
- Skip-size disagreements the docs record (`ecl.md:89,105`): menus and ON GOTO/GOSUB are registered with skip 0 but read a header plus N operands; ECL CLOCK is registered with skip 1 but reads 2.
- 0x1F is "no CotAB implementation" (`ecl.md:68`).

**Stale documentation [V]:** `ecl.ts:9` says scripts load at 0x8000, but `ECL_BASE = 0x9900` (`ecl.ts:32`, `ecl.md:3`). `ecl.md:107-119` and `docs/game-ovr.md` describe an earlier "phase 1".

## 2. Menus and player commands, quoted from the binaries [V]

**Title.** Credits in GAME.OVR slice 1 @0xc8–0x253: "scenario created by:", "tsr, inc.", …, "testing:"; picture "title" @0x675. Boot goes from title straight to the party menu (`docs/COVERAGE.md:93`).

**Copy protection** (slice 2 @0x95e–0xa41):
- Prompts: "USE THE TRANSLATION WHEEL TO DECIPHER", "MATCH THE ESPRUAR RUNE (OUTER RING)", "WITH THE DETHEK RUNE (INNER RING)", "INPUT THE CODE WORD: ", "Sorry, that's incorrect."
- Code words in START.EXE@0x77b0–0x78ac: BEWARE ZOMBIE NOTNOW COPPER DRAGON EFREET FRIEND JUNGLE KNIGHT SAVIOR TEMPLE VULCAN WYVERN.

**Party menu** (START.EXE@0x7db4–0x7f81). Hotkey line "C D M T V A R L S B E J", then: "Create New Character", "Drop Character", "Modify Character", "Train Character", "View Character", "Add Character to Party", "Remove Character from Party", "Load Saved Game", "Save Current Game", "BEGIN Adventuring", "Exit to DOS". I found no item for hotkey J.

Slice 16 strings:
- Frame: "Choose a function ", "Quit to DOS ".
- Unknown purpose: "STING", "I Understand, master..."; "STING" also appears in START.EXE@0x3b0/0x2aa2 and slice 13 [I: possibly a debug code].

**Character creation** (slice 16 @0x4de–0x548): "Pick Race", "Pick Gender", "Pick Class", "Pick Alignment", "Keep this character? ", "Character name: ". There is no "reroll" string anywhere.
- Races (START.EXE@0x86d1): Dwarf, Elf, Gnome, Half-Elf, Halfling, Half-Orc, Human, plus "Monster".
- Classes (@0x84fc): Cleric, Druid, Fighter, Paladin, Ranger, Magic-User, Thief, Monk, and the multiclasses Cleric/Fighter, Cleric/Fighter/Magic-User, Cleric/Ranger, Cleric/Magic-User, Cleric/Thief, Fighter/Magic-User, Fighter/Thief, Fighter/Magic-User/Thief, Magic-User/Thief.
- Alignments (@0x8717): the 9 AD&D alignments. Genders: Male, Female.

**Icon editor:**
- START.EXE@0x7fac–0x8050: "Parts color-1 color-2 Size Exit", "Head Weapon Exit", "Weapon Body xxxx Shield Arm Leg Exit", " Keep Exit", "Next Prev Keep Exit".
- Slice 16: "Head Body Keep", "Small"/"Large", "Hair"/"Face", "Is this icon ok? ".

**Drop / Modify / Add / Train** (slice 16):
- Drop: "Drop … forever? ", "Are you sure? ", "You dump … out back.", " bids you farewell.", " breathes a sigh of relief."
- Modify: "Modify character: ", "Keep Exit", " can't be modified."
- Add: "Add a character: ", "Add Exit".
- Train: "Training costs 1000 gp.", "We don't train that class here", "Not Enough Experience", "we only train conscious people", "Do you wish to train? ", "Congratulations...". Script side: ECL3 block 11 "'WE TRAIN ONLY … HERE. DO YOU WANT TO TRAIN?'".

**Exploration** (START.EXE@0x7c79 / 0x7ca3):
- "Area Cast View Encamp Search Look"
- "Cast View Encamp Search Look" (the variant without Area is used on the overland map, per `tools/live-input.ts:313-315`).
- Doors (slice 14): "Locked. ", "Bash", " Pick", " Knock", " Exit", "Not Here", "The river's stench drives you back."

**Encamp** (START.EXE@0x7ccc): "Save View Magic Rest Alter Exit".
- Magic: "Cast Memorize Scribe Display Rest Exit" (@0x7cf5); slice 22 also has "Cast", "Memorize", "Scribe", "Learn", "Choose Spell: ", "Cast Spell on whom".
- Rest (slice 20): "Rest   daYs Hours Mins   Inc Dec   Exit", "The Whole Party Is Healed", "Stop Resting? ", "The Party is rudely interrupted!"
- Alter: "Order Drop Speed Icon Pics Exit" (@0x7d1e), "Select Exit", "Place Exit".
- Slice 15 extras:
  - Order and drop: "Party Order: ", "Drop from party? ", "is dumped in a ditch".
  - Speed: "Game Speed = ", " (0=fastest 9=slowest)", " Faster", " Slower".
  - Display toggles: "Alter: ", "Monsters on/off  ", "Portraits on/off  ".
  - Camp and exit: "The party makes camp...", "Camp: ", "Quit TO DOS ".
  - Memorize and scribe: "Memorize These Spells? ", "Scribe These Spells? ", "You are already scibing that spell" [sic].
  - Spell-effect display ("Display"): "Feather Fall" … "Displaced", " <No Spell Effects>".

**View / items** (slice 19):
- "View:" with "Items ", "Spells ", "Trade ", "Drop ", "Exit".
- Item commands: "Ready", " Use", " Trade", " Drop", " Halve", " Join", " Sell", " Id".
- Messages: "It's Cursed", "Wrong Class", "Your hands are full!", "Trade with Whom?", "Can't halve that".
- Selling: "I'll give you … gold pieces for your … Is It a Deal? ". Identifying: "For 200 gold pieces I'll identify your ".
- Coins: "Select type of coin", "will you trade? " / "will you drop? ".
- Sheet labels: "Age STR INT WIS DEX CON CHA Level Exp Weapon Armor Status THAC0 Encumbrance Movement".

**Combat** (slice 8):
- Page 1: "Move ", "View Aim ", "Use ", "Cast ", "Turn ", "Quick Done".
- Page 2: "Guard ", "Delay Quit ", "Bandage ", "Speed Exit".
- Speed: "GameSpeed (", "Slower ", "Faster ".
- Other: "Magic On"/"Magic Off", "Move/Attack, Move Left = ", "Flee:", "Blocked", "Your Teammate is Dying".
- Aim (slice 13): "Target ", "Next Prev Manual ", "Center Exit", "Aim:", "(Use Cursor keys) ", "Range = ".
- Quick-combat shortcut: Alt+Q (`COVERAGE.md:326-328`).

**Encounter and parley** (slice 3):
- "~COMBAT ~WAIT ~FLEE ~PARLAY", "~COMBAT ~WAIT ~FLEE ~ADVANCE", "Both sides wait.", "The monsters flee."
- Parley attitudes: "~HAUGHTY ~SLY ~NICE ~MEEK ~ABUSIVE".

**Temple** (slice 4):
- "Heal Exit", "Heal View Take Pool Share Appraise Exit", "Heal View Pool Appraise Exit", "cast cure anyway: ", " will only cost … gold pieces."
- Cure list (START.EXE@0x78c8): Cure Blindness, Cure Disease, Cure Light/Serious/Critical Wounds, Neutralize Poison, Raise Dead, Remove Curse, Stone to Flesh, Exit.

**Shop** (slice 6): "Buy View Take Pool Share Appraise Exit", "Buy View Pool Appraise Exit", "OverLoaded", "Not enough money."

**After combat / treasure** (slice 5):
- "You have lost/won the duel.", "The party has won/fled.", "The party has found treasure!", "Each character receives … experience points."
- Menus: "Money Items Exit", "View Pool Exit", " Detect Exit", "View Take Pool Share", "View Take Pool".
- Slice 21: "Appraise : ", "The gem is valued at ", "Sell Keep", "You have a fine collection of:".

**Save / load** (slice 17): "Load Which Game: ", "Save Which Game: ", "A B C D E F G H I J" (10 slots, files `savgam?.dat`), "Put save disk in ", "Save and exit  Insert disk #". Party files use the extensions `.cha/.sav/.itm/.spc` and `charlist.txt`.

**Other system text:**
- Slice 0: "Time to save your game.  [return]".
- Death and ending: slice 3 "The END!", "The entire party is killed!"; slice 5 "The monsters rejoice for the party has been destroyed".
- Finale (slice 18): the Tyranthraxus speech.

**Scripted menus [V]:** the ECL scripts contain 125 distinct HORIZONTAL MENU item sets (e.g. "YES / NO" ×32, "COMBAT / WAIT / FLEE / PARLAY / IGNORE", "ACCEPT THE COMMISSION / REJECT IT", "SOKAL / EAST / WEST / BAY / NONE") and 14 VERTICAL MENU sets (e.g. "MAKE A BID / WAIT FOR WINNER / TRY TO LEAVE", "GOTO SLEEP / SLEEP WITH A WATCH").

**Not present [V]:** no "Bank", "Vault" or "Tavern" string in GAME.OVR or START.EXE, and no bank or vault in any ECL text. Taverns exist only as script text (ECL3 block 0: "YOU ARE IN A TAVERN…").

## 3. Content tables [V]

**Areas** (`src/maps/area-catalog.json` counts): 29 areas, 29 maps, 3 areas without maps (8 City Hall, 11 Training Hall, 19 Cave of Diogenes), id 12 missing, 58 static transition pairs, 6 dynamic exit sites.

| Areas | Script archive |
|---|---|
| 0 New Phlan, 8 City Hall, 11 Training Hall, 14 Kovel Mansion | ECL3 |
| 1 Buccaneer Base, 19 Cave of Diogenes, 25 Wilderness West, 28 Zhentil Outpost | ECL6 |
| 2 Cadorna Textile, 10 Valhingen Graveyard, 21 Sokal Keep | ECL4 |
| 3–7 Valjevo Castle | ECL5 |
| 9 Stojanow Gate, 15 Mendor's Library, 20 Slums | ECL2 |
| 13 Kobold Caves, 16 Lizardman Keep, 27 Wilderness East, 29 Kuto's Well | ECL8 |
| 17 Nomad Camp, 22–23 Yarash's Pyramid, 26 Wilderness Middle | ECL7 |
| 18 Podol Plaza, 24 Temple of Bane | ECL1 |

**DAX block counts per archive:**
- ECL1–8: 2, 3, 4, 3, 5, 4, 4, 4 = 29 scripts (ids 0–29 except 12).
- GEO: 29 maps. WALLDEF: 38. 8X8D: 45. PIC: 92. SPRIT: 88. HEAD: 63. BODY: 46. CPIC: 218.
- CBODY 128, CHEAD 56, COMSPR 26, ICON 6. FINAL5 has 8 endgame pictures.
- DUNGCOM, WILDCOM, RANDCOM: 1 block each (combat backgrounds).
- TITLE: 2. SQRPACI: 2 (battle terrain).

**Monsters:** 172 records of 285 bytes across MON1–8CHA (15, 28, 20, 26, 19, 22, 24, 18), with 116 distinct ids and 103 distinct names.
- Named NPCs: FERRAN MARTINEZ, SKULLCRUSHER, GRISHNAK, PRINCESS FATIMA, TYRANITHRAXUS (×2 ids), AL-HYAM DAZID, GENHEERIS, NORRIS THE GRAY, YARASH, DIANE, HASSAD, DRYTHH, DIRTEN, MACE.
- Hirelings: SWORDSMAN, WARRIOR, HERO, ROBBER, CURATE, THEURGIST, EVOKER, ACOLYTE.
- MON*ITM records are 63 bytes, MON*SPC records 9 bytes, matching the CHRDATA party files.

**Items:**
- The `ITEMS` file is 2050 bytes = 2 + 128×16 [I: 128 item-type records].
- The item-name word table is at START.EXE@0x8880 (21-byte stride, 257 slots, about 250 non-empty), from "Battle Axe" to "Cursed".
- Character statuses (@0x880b): Okay, Animated, tempgone, Running, Unconscious, Dying, Dead, Stoned, Gone. Coin types (@0x87be): Copper, Silver, Electrum, Gold, Platinum, Gems, Jewelry.

**Spells:** 56 names at START.EXE@0xa05c (41-byte stride), from "Bless" to "Restoration".
- [I] Grouping: cleric L1 ×8, magic-user L1 ×13, cleric L2 ×7, magic-user L2 ×7, cleric L3 ×9, magic-user L3 ×11, plus Restoration.
- Spell-level labels "1st Level".."9th Level" are at @0x8266.

**Commissions:** 20 in `src/runtime/commission-journal.ts:14-58`: slums, sokal, records, auction, textile, bane, kovel, nomads, kobolds, river, lizardmen, rescue, zhentil, graveyard, gate, castle, cadorna, ohlo, bottle, bottle-vampire. These are written by the port; the trigger fragments are quoted from the original ECL.

**Journal entries:** ECL text references 26 entry numbers: 3, 7, 8, 11, 14, 19, 21, 23, 26, 27, 29, 30, 31, 33, 35, 37, 38, 40, 43, 46, 49, 50, 51, 55, 56, 57. The entry texts themselves are not in any game file [I: they were in the printed journal].

**Tavern tales:** ECL3 block 0 @0xa413 prints "YOU OVERHEAR TAVERN TALE ", then `RANDOM 23`, `ADD 1`, and prints the number. [I: tales 1–24, based on the RANDOM handler; the tale text is not in the data.]

**Sounds:** `src/audio/original-sounds.json`
- Event indexes 1–20. Index 1 is a driver-special control (unreachable). 2–12 are effects. 13–14 are scores reachable only on Tandy. 15–20 are scores with no call sites.
- Controls: 0 = initialize, 255 = stop.

## 4. Overlay slice → system map

Columns:
- **Off / code+reloc / entries:** from `docs/overlays.json`.
- **Procs:** from the "Found" column of `docs/COVERAGE.md:45-82`.
- **Callers:** from my scan of `farCall`s, using stub paragraph = (exeOffset − 0x3b0) >> 4.

| # | Off | code+reloc | Procs / entries | Evidence | System (confidence) |
|---|---|---|---|---|---|
| 0 | 0x4 | 109+10 | 2/2 | "Time to save your game. [return]"; calls s17 | Save reminder (med) |
| 1 | 0x7b | 2068+206 | 4/4 | Credits, "title"; scene hooks in `boot-translated.ts:300-305` | Title and credits (high) |
| 2 | 0x95d | 864+60 | 2/2 | Translation-wheel text | Copy protection (high) |
| 3 | 0xcf9 | 14745+858 | 59/59 | Dispatch at 32df; encounter and parley menus; "codeop ="; CPIC/PIC/BACPAC/ICON/ITEM loads; main loop 377f calls s14 | ECL interpreter, encounters, exploration loop (high) |
| 4 | 0x49ec | 3860+208 | 12/12 | Cure and heal strings | Temple (high) |
| 5 | 0x59d0 | 5654+224 | 12/12 | Duel, won/fled, XP, Loot/Take/Pool/Share | Combat outcome and treasure (high) |
| 6 | 0x70c6 | 1928+98 | 5/31? no: 5/5 | Buy/View/Pool/Appraise | Shop (high) |
| 7 | 0x78b0 | 7886+244 | 30/31 | `ovl07_0000` operand fetch, `_0353` loader, `_0c93` variable setter (`PORT.md:30`, `verify-translation.ts:3,615-623`); "Loading...", ECL/SPRIT/PIC/cpic/ROLF | ECL loader and variables (high) |
| 8 | 0x9872 | 4710+314 | 14/14 | Combat menus; Quick test at 0252/02a0 (`live-input.ts:619`), 04F3 (`COVERAGE.md:328`) | Player combat turn (high) |
| 9 | 0xac12 | 6433+234 | 15/15 | "flees in panic", "Surrenders"; calls s13 21× | Monster and Quick combat AI (med-high) |
| 10 | 0xc61d | 8261+114 | 23/23 | DungCom/WildCom/RandCom, "A battle begins..."; music branch at 1f26 | Battle setup (high) |
| 11 | 0xe6d4 | 1870+124 | 2/2 | sqrpaci/COMSPR/ITEMS (`ART-INVENTORY.md:552`) | Resource loading at startup (high) |
| 12 | 0xee9e | 14530+750 | 127/127 | "Sucks some Blood", "gazes...", "is drained", "Spits Acid"… | Special attacks and effect handlers (high) |
| 13 | 0x12a4e | 15421+602 | 39/39 | "-Backstabs-", "turns undead...", Aim/Target, "Begins Casting" | Attack resolution and targeting (high) |
| 14 | 0x168e5 | 4363+190 | 14/14 | Bash/Pick/Knock, "Locked.", "Not Here", river stench | Movement and doors (med) |
| 15 | 0x17aae | 8118+368 | 23/23 | Camp, memorize, scribe, effect display, Alter | Encamp (high) |
| 16 | 0x19bd4 | 17440+526 | 19/19 | Pick Race…, training, Add, icon editor; trainer text (`adventure-log.ts:63-65`) | Party menu, creation, training (high) |
| 17 | 0x1e202 | 9079+722 | 14/14 | Save/load slots, MON CHA load; entries 159d/1ced/2265 (`boot-translated.ts:230-231`) | Disk I/O (high) |
| 18 | 0x2084b | 2300+162 | 4/4 | FINAL, Tyranthraxus speech | Endgame (high) |
| 19 | 0x211e9 | 11004+640 | 21/21 | View and item commands, sell, identify | Character sheet and items (high) |
| 20 | 0x23f65 | 3601+88 | 15/16 | Rest strings; called by ECL CLOCK | Rest and time (high) |
| 21 | 0x24dce | 8874+308 | 22/22 | Coin names, gem and jewel appraisal | Money and treasure take (high) |
| 22 | 0x271ac | 14194+690 | 74/74 | Cast/Memorize/Scribe/Learn, about 60 effect messages | Spellcasting (high) |
| 23 | 0x2abd0 | 1112+0 | 5/6 | No strings; reads DS tables 3c16/3c6b/3cb3/4034/414c/41e6 and writes character fields; called by s12/16/17/22 | Derived stats from tables (low) |
| 24 | 0x2b028 | 6457+174 | 24/24 | "takes N points of damage from Fire/Cold/…", "gets back up"; called by almost every slice | Damage and HP status (med) |
| 25 | 0x2ca0f | 12481+406 | 52/53 | Name/AC/HP/"(Helpless)", item-lose errors, "Guarding", " camping"/" search"; 2266 applies damage (`developer-combat.ts:39`); projectile drawing (`boot-translated.ts:87`) | Shared party and combat utilities (med) |
| 26 | 0x2fc66 | 3219+82 | 16/16 | " Next"/" Prev"/" Exit", "Yes No" | Generic list and Yes/No menus (med-high) |
| 27 | 0x3094b | 706+12 | 6/6 | Reads camera 6a0b-6a0d, sector 495b, sky/ground 69be-69c1; calls s28/30/33/36 | View redraw dispatcher (med) |
| 28 | 0x30c19 | 658+14 | 3/3 | No strings; calls `150:310` and s33; called by s18/25/27 | Overland or area-map draw (low) |
| 29 | 0x30eb9 | 1940+98 | 10/11 | PIC/FINAL/HEAD/BODY, "Illegal range in Show3DSprite."; draw at 06d5 (`ART-INVENTORY.md:257`) | Encounter sprites and portraits (high) |
| 30 | 0x316af | 4655+80 | 13/15 | "Unable to load wallset in LoadWallSet.", "…geo in Load3DMap."; backdrop colors (`native-exploration.ts:64`) | 3D map and walls (high) |
| 31 | 0x3292e | 3046+10 | 8/8 | No strings; "attack-effect table loop" (`COVERAGE.md:284-287,320-322`) | Attack-effect iteration (med) |
| 32 | 0x3351e | 4844+46 | 23/24 | "!Start range erro"; defeated-unit marker (`boot-translated.ts:97`) | Combat visual effects (med) |
| 33 | 0x34838 | 1610+110 | 6/7 | CHEAD/CBODY/COMSPR/ICON; terrain entry 00F1 (`ART-INVENTORY.md:553`) | Combat map and icon draw (high) |
| 34 | 0x34ef0 | 7+0 | 1/2 | Empty unit (`PORT.md:30`) | None (verified) |
| 35 | 0x34ef7 | 692+50 | 3/4 | "Unable to load 8x8D", "Bad symbol number in Put8x8Symbol." | 8×8 tile sets (high) |
| 36 | 0x351dd | 10873+130 | 20/24 | Blitter and viewport copy (`live-input.ts:711`, `native-exploration.ts:53`); viewport done at 1eb9 | EGA blitter and presentation (high) |
| 37 | 0x37cd8 | 3705+106 | 16/17 | "Press any key to continue"; text entries 198:39/198:5c (`adventure-log.ts:60-66`); glyph writes at 2aa/2dd (`video.ts:107`); font block 201 (`art-inventory.ts:60`) | Text, font, key wait (high) |

(Correction to row 6: procs/entries are 5/5.)

## 5. Platform services the original uses [V]

These are the call sites found in the translated code, with AH taken from the preceding `mov`.

**int 21h** (handled in `src/runtime/dos.ts`):

| AH | Purpose | Emulation | Caveat |
|---|---|---|---|
| 02, 06, 09 | Console output | Collected into `consoleText` (`dos.ts:178-201`) | – |
| 0E, 19 | Select / get drive | 0E is a no-op and returns no drive count; 19 returns C: | Approximated |
| 1A, 33 | Set DTA, Ctrl-Break | No-op | – |
| 25, 35 | Set / get vector | 25 does nothing; 35 returns 0000:0000 (`dos.ts:132-139`) | Vectors 00, 08, 1B, 23, 24, 3F are installed but nothing is installed |
| 2A | Get date | Fixed 1988-06-01 | Stubbed |
| 2C | Get time | Starts at 12:00:00.00 and advances 1/100 s per call (`dos.ts:147-157`) | Deterministic |
| 30 | DOS version | Returns 5.0 | – |
| 39, 3B, 47 | mkdir / chdir / getcwd | Virtual directories (`dos.ts:208-222`) | – |
| 3C–42 | File create, open, close, read, write, delete, seek | In-memory files (`dos.ts:223-322`) | – |
| 44 | IOCTL | Always DX=0 | Approximated |
| 48 / 49 / 4A | Memory allocate / free / resize | 48 is a bump allocator from 0x5000; 49 and 4A are no-ops | Memory is never freed |
| 4C | Exit | Throws `dos exit N` (`dos.ts:323`) | – |
| **2B, 2D, 56** | Set date, set time, rename | Present at `exe:50dc`, `5118`, `721e`; I found no far callers | **Unhandled: throws at `dos.ts:324`** |

Interrupts other than 10h, 16h, 1Bh, 21h, 23h and 24h throw (`dos.ts:124-125`). int 23h is called directly at `exe:528b` and returns.

**int 10h** (handled in `src/runtime/video.ts`). It is called through Crt at `exe:572c` and through the Turbo Pascal `Intr` routine, which is replaced by a shim (`src/runtime/intr.ts:64`). AH values written to the register record at `DS:4963`:

| AH | Purpose | Emulation | Caveat |
|---|---|---|---|
| 00 | Set mode | Implemented (`video.ts:280-291`) | – |
| 02 | Set cursor | Implemented | – |
| 05 | Select display page | Ignored (`video.ts:305-308`) | Only A000 offsets below 8000 are rendered (`video.ts:105`), so other pages never show |
| 09 | Write character | Drawn with a placeholder 3×5 font (`video.ts:125-228`) | Approximated |
| 0F | Get mode | Implemented | – |
| **10** | Set palette register | **No case; falls through to a no-op (`video.ts:362`)** | Called from `exe:4f59` by slices 1 and 32, so original palette changes are lost |

The `Intr` shim's flags word records only CF, PF, ZF, SF and OF (`intr.ts:52-58`).

**int 16h** (Crt at `exe:5274/527a`; the game's own poll at `exe:5423/543a`):
- AH=1 polls and sets ZF when no key is waiting.
- AH=0 reads a key. With no key queued it returns Enter (0x1C0D) (`dos.ts:120`). This is an approximation.
- AH=2 always reports no shift state.

**Timer:**
- The BIOS tick at 0040:006C advances every 16 instructions (`machine.ts:51-57`).
- `Crt.Delay` runs one pass per call; this is a deliberate generator deviation (`COVERAGE.md:37-43`, `tp_translate.py:772-775`).
- The sound driver reprograms PIT channel 0 to divisor 13B1 and hooks int 08 (`exe:4946-496f`). The emulator delivers no hardware interrupts (`machine.ts:163-168` handles only software `int`), so the driver's timer handler never runs. Audio is replayed from the event index captured at entry `0x27f0` (`far.ts:67-75`, `sound-trace.ts`).

**Ports:**

| Port | Use | Emulation |
|---|---|---|
| 0x40, 0x42, 0x43, 0x61 | PIT and PC speaker | Observed and traced only |
| 0xC0 | Tandy sound chip | Observed and traced only |
| 0x3C4/5 | EGA sequencer | Only register 2 (map mask) is modeled |
| 0x3CE/F | EGA graphics controller | Registers 0–8 modeled (`video.ts:64-69`) |
| 0x3D4/5 | CRTC cursor (via BIOS word at 0040:0063) | Ignored |
| 0x3DA | Retrace status | Synthesized from the instruction count (`video.ts:56-63`) |
| Any other read | e.g. 0x61 | Returns 0xFF (`machine.ts:175-177`) |

**Overlay manager:** int 3Fh is never executed. `far.ts:172-174` and `overlay.ts:96-110` intercept the `CD 3F` stubs instead. Slices are loaded from paragraph 0xC000 upward with a relocation addend of 0 (`overlay.ts:12-13,59`). Untranslated far calls throw (`far.ts:175`).

**Other emulator setup:**
- The PSP is faked with ES=0x9FF0 (`boot-translated.ts:135-137`).
- The BIOS data area words at 0040:0049, 004A and 0063 are filled in (`video.ts:43-47`).
- The translator inserts hooks into the ECL loop for narration (`tp_translate.py:767-771`); these don't change behavior.
