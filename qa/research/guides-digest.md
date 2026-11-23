# Digest of the walkthroughs and the SSI Clue Book

_Research pass on 2026-11-21. Read-only. Line numbers refer to the tree at that time._

_Sources: Stephen S. Lee (ssjlee9), "Pool of Radiance - Exhaustive Game Information" v2.00, 2026-04-02, GameFAQs, licensed CC BY-NC 4.0; GameBanshee; the-spoiler.com; the SSI Clue Book (George MacDonald, 1988); Doommaster1994's NES walkthrough for platform differences. This digest is working notes for building acceptance tests. Check the licences before any public release of this file._

# Pool of Radiance walkthrough research report

The primary guide is a newer version than the one you linked on Neoseeker. GameFAQs served **v2.00, dated April 2, 2026**, which confirms your owner's recollection. The guide is written for **IBM v1.3**, not v1.1. It also says outright that "there were some game script changes between v1.1 and v1.2" without listing them, and the author has no v1.0 or v1.1 copy (§15.4). Treat every scripted behaviour below as v1.3 unless you can verify it against a v1.1 install.

Source tags: **[P]** primary ssjlee9 v2.00 · **[P1.10]** Neoseeker mirror v1.10 · **[GB]** GameBanshee · **[SP]** the-spoiler · **[CB]** SSI Clue Book · **[NES]** the dosdays PDF.

---

## 1. Source status

| Source | Fetched? | Version / date | Size | Platform described |
|---|---|---|---|---|
| **[P]** GameFAQs 73869, "AD&D Forgotten Realms Vol. I: Pool of Radiance – Exhaustive Game Information", Stephen S. Lee | Yes, in full | Header: "Version 2.00 - April 2, 2026". Changelog: "v2.00 (2026-04-02)". Licensed CC BY-NC 4.0. | About 1.08 million characters, about 22,800 lines | "written for PC version 1.3"; GOG also uses v1.3. "All known differences between that and v1.2 are technical; there were some game script changes between v1.1 and v1.2." NES is called "significantly easier". |
| **[P1.10]** Neoseeker mirror | Yes; header checked only | "Version 1.10 - April 7, 2019" | About 100K+ characters | PC v1.3. It says "All known differences between [v1.3] and previous versions are technical", which v2.00 retracts. Superseded, so not used beyond this. |
| **[NES]** dosdays.co.uk PDF | Yes; text extracted locally with pdftotext | **This is not ssjlee9.** It is "ADVANCED DUNGEONS & DRAGONS: POOL OF RADIANCE (NES) WALKTHROUGH, Version 1.0, Walkthrough By Doommaster1994", "Updated on Jun 13, 2014". The PDF itself was made by Chromium print-to-PDF on 2021-08-28. | 371.6 KB, about 6,000 text lines | **NES only**. I used only its "Computer and NES Version Differences", "Errors" and "Tavern Rumors" sections. |
| **[SP]** the-spoiler.com pool.of.radiance.1.html | Yes, in full | Undated, no version | About 25K characters | The author "played version 1.0 on a Commodore 64". A part-2 URL returns 404. |
| **[GB]** GameBanshee gameplaytips.php plus siblings | Yes. The walkthrough index URL returned **403**, but I fetched all 26 pages from its side menu: tips, troubleshooting, character creation, 12 city areas, wilderness overview, 6 wilderness sites, 4 castle quadrants, and upper/lower levels. | Undated; footer says ©2000-2021 | Short pages | "written using the version … included in the Forgotten Realms Archives (if there's an actual version number listed anywhere, we didn't see it)". [P] says any non-floppy copy is v1.3, so this is probably DOS v1.3 (my inference). |
| **[CB]** mocagh SSI Clue Book PDF | Yes. WebFetch refused it at 23.5 MB; I streamed it through pdftotext and read the whole OCR text layer. | "Clue Book, George MacDonald", "Copyright 1988 TSR, Inc."; server Last-Modified 2014-01-16 | 64 pages, 5,915 text lines; the OCR'd maps are unreadable | Multi-platform. It mentions "the joystick button" and "NOTNOW (C64 Version 1.0) or NOKNOK (other versions)". [P] says the clue book "appear[s] to better reflect the Apple II or Commodore 64 versions". |

**How much of [P] I actually read:**
- Read in full: §0–§9, §11, §13, §14, §15.
- §10.2 Bestiary (about 1,900 lines of stat blocks): I read only the headers, every "Special Abilities" and "Footnote" line, and a few full entries.
- §12 Technical Analysis (about 9,000 lines of formats, opcodes, the script flag list and disassembly): I read §12.1.1–12.1.2, §12.5 Save File Format, §12.6.5 Code Hacking and the heap-error note in §12.6.3, and grep-checked the rest for version notes. **I did not read the rest of §12 in full.** That includes §12.4.1 Script Flag List, which would be the place to look for internal quest-flag names.

---

## 2. Table of contents of [P], in order

- **0** Ten Most Frequently Asked Questions
- **1** Introduction: 1.1 About This Document · 1.2 Where To Get The Game
- **2** Technical Detail On Running The Game: 2.1 Emulators · 2.2 Installing · 2.3 Game Setup · 2.4 Copy Protection · 2.5 Gold Box Companion · 2.6 Interface Basics · 2.7 Restarting the Game · 2.8.1 Transfer to Curse of the Azure Bonds · 2.8.2 Transfer to Hillsfar
- **3** Party: 3.1 Before Creating · 3.2 This Game Only · 3.3 All Four Games · 3.4 Party for Hackers
- **4** Character Development: 4.1.1 Initial Equipment · 4.1.2 Upgrading Equipment · 4.2 NPCs · 4.3 Training · 4.4 Magic-User Spells to Learn
- **5** Combat Strategy: 5.1 Nonmagical · 5.2 Spell Strategy · 5.3 Other Magical · 5.4 Specific Enemies
- **6** Maps: 6.1 Introduction · 6.2 Civilized Area (New Phlan) · 6.3 Slums · 6.4 Sokal Keep · 6.5 Kuto's Well · 6.6 Kuto's Well Catacombs · 6.7 Mendor's Library · 6.8 Podal Plaza · 6.9 Cadorna Textile House · 6.10 Kovel Mansion · 6.11 Wealthy Area · 6.12 Temple of Bane · 6.13 Wilderness · 6.14 Wilderness Lairs · 6.15 Nomad Camp · 6.16 Kobold Caves · 6.17 Yarash's Pyramid (L1; L2–3) · 6.18 Lizardman Keep · 6.19 Buccaneer Base · 6.20 Zhentil Keep Outpost · 6.21 Valhingen Graveyard · 6.22 Stojanow Gate · 6.23 Valjevo Castle · 6.24 Hedge Maze · 6.25 Inner Tower. Each map has an "Overview" and a "Details" subsection.
- **7** Game Mechanics: 7.1 Intro · 7.2 HP and Status · 7.3 Time · 7.4 XP and Levels · 7.5.1–6 Str/Int/Wis/Dex/Con/Cha · 7.6.1–6 Human/Dwarf/Elf/Gnome/Half-Elf/Halfling · 7.7.1–4 Cleric/Fighter/Magic-User/Thief · 7.8.1–4 THAC0/AC/To-Hit/Damage · 7.9.1–3 Resisting Magic/Magic Resistance/Saving Throw · 7.10 Encumbrance and Movement · 7.11.1–3 Arena/Surprise/Initiative · 7.12 Turning Undead · 7.13 Morale · 7.14 Party Strength
- **8** Spellbooks: 8.1 Notes · 8.2.1–4 Cleric levels 1/2/3/7 · 8.3.1–3 Magic-User levels 1/2/3 · 8.4 Summary · 8.5 Temple Spells
- **9** Items: 9.1 Basics · 9.2.1 Weapons · 9.2.2 Armor · 9.2.3 Other · 9.3 Magic Items · 9.4 Random Magic Items · 9.5 Magic Item Locations
- **10** Creatures: 10.1 Notes · 10.2 Bestiary
- **11** Interface and Bug Abuse: 11.1 Cheat Mode · 11.2 Raising Dead with Damage Spells · 11.3 Duplicating Items · 11.4 Abnormal Constitution
- **12** Technical Analysis (DAX, creature, effect, item, map, combat, spell and string formats; the ECL script format, variables, opcodes and flag list; save file format; executable and overlay code; code hacking)
- **13** Bug List: 13.1 Technical · 13.2 Scripting · 13.3 Adaptational · 13.4 Strange Programming Decisions
- **14** Fluff: 14.1 Journal Entries · 14.2 Novelization · 14.3 Historical Accuracy · 14.4 Criticism
- **15** Appendix: References · Version History · Acknowledgments · Things I Want · Legal

---

## 3. The campaign as ordered, testable steps

[P] §6.1 says the maps are listed "in a suggested order of difficulty". The council "will suggest missions as you solve them, but most missions can be done even if not suggested, and you will still be fully rewarded". "No mission is absolutely necessary … except for defeating Tyranthraxus." Valhingen Graveyard "should be one of the last quests you undertake" because it scales with Party Strength (PS).

**Conventions that apply throughout:**
- XP figures are per character and assume a party of exactly six, unless a section says otherwise.
- Enemies start adjacent unless a Distance of 1 or 2 is given.
- The encounter menu offers "C"ombat / "W"ait / "F"lee / "A"dvance or "P"arley.
- Parley attitudes are "H"aughty / "S"ly / "N"ice / "M"eek / "A"busive.

### 3.0 Start of game: New Phlan (Civilized Area, ECL scripts 0/8/11)

**Opening sequence**
- Copy protection runs first (code wheel; GOG accepts anything).
- The party appears at **E1 (15,1)**. "Rolf will give you a brief guided tour, which will end at E2" **(0,4)**.
- The guide's suggested order: buy melee weapons, armor and shields → stay at an inn to memorize spells → visit the clerk.
- At first only the Slums and Sokal Keep commissions are mentioned and reachable. Taverns are dangerous for new characters.

**Fixed locations [P]**
- **Training halls:** HC cleric (5,0), HM magic-user (7,0), HF fighter (8,0), HT thief (9,0). Each costs **1000 gold**.
- **Inns (IN):** 1 platinum to "rest as long as you wish without interruption". If the town is angry you are told you are denied service, but you can still rest (a bug).
- **SA** arms/armor shop. The door at **(9,14) works at night** (a bug).
- **SG** general store: mirrors, holy symbols, flasks of oil, vials of holy water.
- **SJ** jeweler at (8,10).
- **SS** silver weapons and armor, and Fine Composite Long Bows (25000 gold).
- **Temples:** Tyr (6), Sune (7), Tempus (24).
- **Dock (2) at (11,1):**
  - Before Sokal Keep is cleared, the only destination is Sokal Keep, and it is free.
  - Afterwards each trip costs 1 platinum. Destinations: "S"okal Keep (8,14); "E"ast to Wilderness (35,29); "W"est to Wilderness (20,29); North side of the "B"ay (26,27). Boat trips take no game time.
- **Location 8 (1,0)** shows "You walk near the poisonous barren river." After Yarash is defeated it shows "You walk near the beautiful Stojanow River."
- **Hall 14** (adventurers' hall): duel a clone of the chosen character, and hire NPCs (see §4).
- **Fleeing** puts the party at one of (3,11), (10,10), (2,0), (12,3).

**City guard**
- **Triggers:** (1) resting outside an inn; (2) forcing your way into Bishop Braccio's office; (3) entering a shop or city hall building that is closed for the night; (4) tavern brawling; (5) the MAD MAN randomly attacking citizens. Triggers (1)–(3) may be tolerated after you have won the game.
- **Choice offered:** "R"un to a random location, or "S"tay and fight: 2 LEVEL 3 MU (#94), 12 6TH LEVEL FIGHTER (#84), 12 AIDES (#53), 12 NOMAD (#40); Morale 50; 5609 XP.
- **Consequence:** after fighting the guard, **all shops and temples refuse service until you are rewarded for a commission**.
- **City Hall guards:** 3 LEVEL 3 MU (#94), 6 AIDES (#53), 5 8TH LVL FIGHTER (#85), [PS] CORPORAL (#54); Morale 99. They respawn.
- **Temple of Tempus while you are unforgiven:** 'You attacked the city watch, you won't beat us so easily!' Then 12 7TH LVL CLERIC (#83), 20 4TH LVL FIGHTER (#41) and 20 8TH LVL FIGHTER (#85) attack, Morale 99. This repeats on every return.
- **Exploit:** the guards carry good loot (the 8TH LVL FIGHTER has a Ring of Protection +3, for example). Kill them, then collect any commission reward to clear the anger.

**Tavern (TA)** [P]
1. **Pickpocket** (chance 26/256): the whole party loses 20% of its money and 5% of light items. You catch the thief 1 time in 2; "G"rab → tavern brawl.
2. **Gamble:** 30% red (lose the wager), 20% green (profit equal to the wager). No brawl can happen if you gamble.
3. **Tavern tales:** any of the **23 tales in the Adventurer's Journal**. The useful ones are "**#1, #3, #8, and #23**", plus #9 "if you are a fan of shattering the fourth wall". [CB] says **Tavern Tale 23** is the silver dragon. None of the sources reproduce the tale texts; they are printed only in the Journal.
4. **Brawl** (1 in 4 if you did not gamble), Morale 50:
   - Roll 1d2; add +1 if PS ≥25 or +2 if PS ≥51.
   - Fight 11 of each of three consecutive groups, starting at that number, from: 1 NOMAD (#40), 2 1ST LVL THIEF (#45), 3 CORPORAL (#54), 4 AIDES (#53), 5 4TH LVL FIGHTER (#41), 6 6TH LVL THIEF (#51).
   - 13 allies join you (1d4 picks their type).
   - If you win you get no items, and then the city guard confront you.

**Story-gated rooms in City Hall** (location 26 is the entrance; Skullcrusher leaves you here: 'I must go to my master now.')

- **27 (4,4):** if you opened the Cadorna treasure in an obvious way: "Councilman Cadorna confronts you. 'You have taken my family treasure. I don't forget such things.' He strides off."
- **29 (5,5) council clerk** (named Sasha in later games).
  - She offers **the first three unresolved commissions** on her list.
  - "In most cases, you do not actually need to be told of the mission to perform and be rewarded for it."
  - A reward from her usually cancels city-guard anger. Braccio's commission is the exception.
- **30 (6,5) Junior Councilman's office:** a guard bars entry until commission #5 is offered. Then Porphyrys Cadorna says: 'When old Phlan was overrun, a family treasure was hidden in the western building of the textile complex. The faithful servant sent to fetch it never returned. The complex is just south of Podal Plaza. Bring the treasure to me and you will be well rewarded.'
- **31 (5,6) Senior Councilman's office:** barred until commission #13 is offered. Then: 'It is imperative that a message be delivered to the Zhentil outpost to the west. I am sending you as diplomatic envoys. When you get to Zhentil Keep, present this packet to its commandant. Do not break the seals or you will be seized as spies.' You cannot open the packet.
- **32 Head Councilman (Werner von Urslingen):** available only after the #13 reward. '…we must first secure Stojanow Gate. The gate is too strong to be taken by storm. A small band must slip inside and hold until relieved…'
- **33 Council chambers:** available only after the #14 reward. The Lord High Mayor, Ulrich Eberhard: 'Our forces are marshalled for the assault on Valjevo Castle. It is the unanimous request of the council that you lead the attack…'
- **34 (4,6):** City Hall guards bar the way.
- **5 (10,5) Bishop Braccio:** the guard bars entry until commission #6. Braccio then introduces **DIRTEN (#107) (Morale 99)**, who joins as an NPC.

**Proclamations posted at 26, by number of quests completed on the quest tracker**

| Quests completed | Proclamations |
|---|---|
| 0 | LXIV, LXXVIII, CIX, LIX |
| 1 | CI |
| 2 | CXXVI, CX |
| 3 | CXXXIV |
| 4 | CLIV |
| 5 | CXIV |
| 6 | CCIV |
| 7 | CXXIX |
| 8 | CCI |
| 9 | CXIV |
| 10 | LIX |

**Clerk commission list, in order, with rewards [P]**

| # | Commission | Reward (XP per character) |
|---|---|---|
| 1 | Clear the Slums | 1 jewelry, 50 platinum, 250 gold (450 XP) |
| 2 | Clear Sokal Keep "of its spectral guardians" | 3 jewelry, 250 pp (1308 XP) |
| 3 | Return books, maps and tomes. Resolved by clearing Mendor's Library (basilisk + spectre). "In some versions … never resolve this … [problem] with v1.0." | 200 pp, 250 gold (208 XP) |
| 4 | Discover the Podal Plaza auction item. Must be offered first. "If you make a mistake, this mission may be permanently unresolvable." | 200 pp, 250 gold (208 XP) |
| 5 | Speak to Junior Councilman Porphyrys Cadorna. Requires #2. | 20 gems (833 XP) |
| 6 | Speak to Bishop Braccio (asked only once) | Praise only; you keep the temple items. Does **not** cancel guard anger. |
| 7 | Clear Kovel Mansion. Requires #2. | 3 gems, 80 pp (191 XP) |
| 8 | Nomads | 2 jewelry, 6 gems (983 XP) |
| 9 | Kobolds | 25 gems (1041 XP) |
| 10 | Stojanow River pollution | 15 jewelry, 250 pp (5708 XP) |
| 11 | Lizardmen | 5 jewelry, 15 gems, 50 gold (2466 XP) |
| 12 | Rescue the heir of Bivant. Must be offered; needs #2. | 5 jewelry, 25 gems, Two-Handed Sword +1, +3 Vs. Undead, 4 Clerical Scroll (Restoration, Restoration) (3208 XP). On failure: 'By the way, your bungling the Bivant rescue has cost us.' |
| 13 | Zhentil Keep diplomatic mission. Needs #5. You are either sent through the south door to Senior Councilman Cadorna, or given it directly if you learned at Valjevo Castle location 26 that Cadorna is a traitor. | 5 jewelry, 7 gems (2125 XP). You are told Cadorna is a traitor; a bounty is "mentioned but none is actually paid". |
| 14 | Needs #13: Urslingen asks you to capture Stojanow Gate | 10 jewelry (3666 XP) |
| 15 | Needs #14: council chambers ask you to assault Valjevo Castle and defeat Tyranthraxus | 100 jewelry, 200 gems (45000 XP) |

**Special Valhingen commission.** Requires **PS ≥19 and at least 4 tracker quests**.
- PS 19–36: you are only asked.
- PS ≥37: a formal offer. Accepting gives a Two-Handed Sword +1, +3 Vs. Undead and 4 Clerical Scroll (Restoration, Restoration) (333 XP).
- Kill-score payouts: 1 gold per new Skeleton point, 1 platinum per Zombie point, 1 gem per Wight point, 1 jewelry per Spectre point.
- Final reward: 25 jewelry, 15 gems (9791 XP).

**Other clerk rewards**

| Task | Reward |
|---|---|
| Defeat Norris the Gray | 200 pp, 250 gold (208 XP) |
| Book: Fyerdetha's Discourses on Power | 80 pp (66 XP) |
| Book: Urgund's Description of Darkness | 90 pp (75 XP) |
| Book: The Grand Historian's Records of the Arts of War | 120 pp (100 XP) |
| Book: The History of the North | 110 pp (91 XP) |
| Book: Lex Geographica | 100 pp (83 XP) |
| The first of any other library book | 1 gold (0 XP) |
| Clear Podal Plaza (not possible while #4 is offered but unresolved) | 200 pp, 250 gold (208 XP) |
| Clear the Textile House | 200 pp, 250 gold (208 XP) |
| Clear the Wealthy Area | 3 gems, 99 pp, 250 gold (249 XP) |

**The ten quests that advance the tracker:** #1, #2, #4, #7, #8, #9, #10, #11, Valhingen, Norris.

### 3.1 Slums (ECL 20). Commission #1.

**Getting there:** Civilized E2 (0,4) → Slums E1 (15,4). Other exits: E2 → Kuto's Well; E3 (6,10) Old Rope Guild (no automap inside, harder random encounters).

**Random encounters**
- There are exactly **15**. "There is no way around fighting 15 random combats."
- Chance outside the Rope Guild: 1 in 14 (+4/14 in search mode, +5/14 if the gypsy is dead). Inside the guild: 2 in 11 (+2/11 search, +3/11 gypsy dead).
- Size: PS×2/3 outside, PS inside; +5 or +10 if the gypsy is dead.
- Monster type (equal odds): KOBOLD (#0) (3 KOBOLD LEADER at ≥8); GOBLIN GUARD (#2) (4 GOBLIN LEADER at ≥8); ORC (#4) (4 ORC LEADER at ≥14). A BUGBEAR (#63) leads at ≥19.
- Surprise outcomes:
  - Neither side surprised: 50% "angry" (Morale 60; Wait or Parley → combat) or 50% "seedy-looking" (Morale 40; Wait → they flee).
  - Party surprised only: they attack (Morale 70).
  - Monsters surprised only: Wait → they flee (Morale 30).
  - Both surprised: "You bump into" them; Wait → they flee (Morale 50).
- Parley score = base + 1d31 + Charisma reaction modifier. Base by monster count:

  | Monsters | Haughty | Sly | Nice | Meek | Abusive |
  |---|---|---|---|---|---|
  | ≤8 | 9 | 19 | 19 | 19 | 29 |
  | 9–15 | 4 | 14 | 14 | 9 | 24 |
  | ≥16 | −1 | 9 | 9 | −1 | 14 |

- Parley results:
  - ≤65: they attack at +20 Morale.
  - 65–74: they attack.
  - 75–85: 'Da boss don't like youse guys. Give us sumptin an maybe we'll ferget we seen yas.' Options: "P"ay (works only if the gold offered ≥ the encounter's strength, and you still lose half your remaining money); "S"urrender (lose all money and light items, plus some heavy ones); "R"un; "F"ight.
  - 86–95: 'The boss don't allow your kind in his territory. Leave now or we'll have to run you in.' "F"ight/"S"tay → combat; "L"eave or "R"un always work.
  - ≥96: 'Stay away from the textile house. The undead are going crazy up there.' "L"et them go or "S"top them.

**Fleeing:** (15,4), (14,6), (11,5), (11,2), (9,2).

**Resting:** safe in a room whose set encounter you have beaten, or anywhere once the block is cleared. Never safe if the gypsy is dead. Interruption chance is 24% per 2 hours.

**Clear condition:** 25 clear points = 15 random fights + 9 set fights (locations 1, 2, 6, 9, 10, 13, 14, 15, 20) + dealing with Ohlo (doing his quest or killing him). Returning through E1 and hearing "an alarm" means the block is not cleared yet.

**Locations**

| Loc | Coords | What happens | Reward |
|---|---|---|---|
| 1 | (13,1) | "Several orcs are arguing over some papers." 1 ORC (#13) + 3 ORC (#4), Morale 99 | 77 XP; Clerical Scroll (Cure Light Wounds ×2) |
| 2 | (10,1) | "A healthy-looking goblin is instructing…" 1 GOBLIN LEADER (#12) + 8 GOBLIN GUARD (#2), Morale 60 | 90 XP; Leather Armor +1 |
| 3 | (13,10) | Ohlo; see the quest steps below | — |
| 5 | stable | Search → leather bag | 2 gems, 100 gold, 20 Arrows +1, Short Bow +1 (233 XP) |
| 6 | (7,0) | "You interrupt some feeding kobolds." 1 KOBOLD LEADER (#11) + 15 KOBOLD (#0), Morale 60 | 289 XP; the leader carries Bracers AC 6 |
| 7 | — | Overheard hints until the block is cleared: '… the gang is operating from the catacombs by the well …' / '… the temple over the river is run by some hot-shot orc …' / '… there is a secret treasure room in the NW corner …' | — |
| 8 | (3,5) | Gypsy fortune, chosen by game progress: 'Blood and violence are writ boldly in your future. Look for friends where you expect enemies and enemies where you expect allies.' / 'A powerful one becomes aware of your deeds and seeks to destroy you. A weak one sees you as a path to power.' / 'The time is nigh when the paths you have trod will empty and you must seek new ways. The riddle's answer is great evil using great good for great evil.' Attacking kills her automatically for 3 copper and toughens all random encounters. | — |
| 9 | (3,3) | 1 ORC LEADER (#15), 3 ORC LEADER (#14), 16 ORC (#4), Morale 70 | 412 XP; 3 Broad Swords +1, Chain Mail +1, Flail +1 |
| 10 | (0,2) | 5 HOBGOBLIN (#6), Morale 75; then search | 50 pp, 500 gold, Ring of Protection +1, Short Bow +1 (258 XP) |
| 12 | (0,0) | Secret room; search | 2 jewelry, 4 gems, 50 pp, 92 gold, 1000 electrum, 20 Arrows +1, Short Bow +1 (1173 XP) |
| 13 | (0,7) | 2 ORC LEADER (#5) + 30 ORC (#4), Morale 60 | 99 XP |
| 14 | (1,5) | 1 OGRE (#8), 2 GNOLL (#73), 2 HOBGOBLIN LDR (#7), Morale 80, Distance 1 | 63 XP |
| 15 | (3,11) | "You have alerted the guards." 11 GOBLIN LEADER (#3) + 12 GOBLIN GUARD (#2), Morale 60 | 65 XP |
| 16 | — | "This large room is apparently empty." Search. | 2 gems, 200 pp, Shield +1, Magic-User Scroll (Magic Missile) (383 XP) |
| 19 | (15,12) | Merchant; see Ohlo steps | — |
| 20 | (0,14) | Sack-of-grain scene. 4 TROLL (#31) + 2 OGRE (#8), Morale 75 | 1222–2222 XP; 1 jewelry, 50 pp, 40 gold, **3 random magic items** (re-rollable by reloading) |

**Ohlo quest at 3 (13,10)**
1. "'Well?', he demands."
2. "A"ttack, or parley "H"aughty / "A"busive → 'You presume too much' and a fight with 1 LEVEL 3 MU (#94), 2 ORC LEADER (#5), 8 ORC (#4), 25 HOBGOBLIN (#6), Morale 99, Distance 1.
3. Parley "N"ice / "M"eek → offer → "A"ccept → '…in a booth in the old rope guild … Speak my name, Ohlo.'
4. Go to 19 (15,12). "S"peak "**OHLO**" → you get a package (not an inventory item). Attacking the merchant instead → 8 HOBGOBLIN (#6); the merchant disappears, but this still counts as dealing with Ohlo.
5. Return to Ohlo. "A"sk for more or "R"efuse → he attacks. "G"ive → reward **1 jewelry, 150 pp, 1 random magic item (558–891 XP)**.

**Strategy at 20 [P]:** cast Bless. Sleep both ogres; the sleeping ogres block the trolls. Kill the front troll and stand on its body. Shoot the rear trolls without concentrating fire on one. Bug alternatives: rest-disturb clear points, or run away, since the script does not check whether you fled before crediting victory.

### 3.2 Sokal Keep (ECL 21). Commission #2.

**Getting there:** boat from the dock (free before it is cleared). E1 returns to Civilized (15,1).

**Undead patrols** (courtyard, 1 in 6, no surprise)
- "P"arley with any attitude and say '**SHESTNI**' before the mission is done, or '**SAMOSUD**' after.
- A wrong word or "C"ombat → 6 SKELETON (#34) + 6 ZOMBIE (#35), Morale 99, 59 XP.
- After 4 patrols are beaten, no more appear this visit. They return at full strength whenever you re-enter.

**Resting:** safe after 4 patrols; otherwise 1% per 10 minutes.

**Fleeing:** (4,11), (7,14), (8,11), (8,13).

**Clear condition:** Ferran Martinez at 12 is told the truth **or** beaten in combat. The patrols are never permanently removed.

**Steps**
1. **1 (6,13):** dead elf. "S"earch → parchment in Espruar: '**LUX**', '**SHESTNI**', '**SAMOSUD**'. Nothing in game says which word is which.
2. **7** (barracks haunts, cannot be attacked): Parley '**LUX**' → '…An account of our trials is within the diary.' He points to a floorboard.
3. **16\* (4,4):** search → defenders' diary (**Journal Entry 3**) + 5 gems (208 XP). Only 10% success unless the haunts told you.
4. **15\* (15,6):** search the smithy → **Hammer +1** (66 XP).
5. **13 (15,1):** "Passing through an illusionary wall…". **17\* (12,0):** Shield +1, Long Sword +1, Chain Mail +1, Mace +2 (333 XP).
6. **9\*** (any of four squares, first entry): "A loud commotion rises from the courtyard…" Fight 4 ORC LEADER (#5), 15 HOBGOBLIN (#6), 31 ORC (#4), Morale 50, Distance 1, 187 XP. A note on a hobgoblin is **Journal Entry 57**. Tactics: enter by the SE door, fall back to the 3-square choke point; the orc leaders run out of arrows after 4 rounds. You can hire 2 HEROes for this fight.
7. **12** (altar):
   - Fight FERRAN MARTINEZ (#19), Morale 99, 338 XP, level drain; **or**
   - "P"arley, say '**LUX**', then "**T**"ell the truth → 'The city fell long ago to the unblessed creatures imbued with the might of a magical pool. Chief among these were Tyranthraxus, Edranka, and Torath…' He mentions treasure 17 if you have not taken it. 'To pass my guards on the way out, speak the word 'SAMOSUD'. Now we are freed, our duty done!' The mission is complete.
   - A wrong word can be reset by leaving and re-entering.
8. Other set fights: **6** = 4 POISONOUS FROG (#38), Morale 50, Distance 2, 26 XP; lethal poison, saves at +4. **8 (2,11)** = 2 HUGE SCORPION (#39), Morale 99, 63 XP, lethal poison.
9. Flavor-only rooms: **5 (2,8)** fungus; **4, 10, 11**.

**After completion:** boat destinations unlock, and commissions #5 and #7 become possible.

### 3.3 Kuto's Well (ECL 29). Optional; no commission.

**Exits:** E1 → Slums; E2 → Podal Plaza; E3 → Mendor's Library; **E4 (7,7)** the well → Catacombs (7,7).

**Random encounters**
- 10 in total; chance 1 in 11, or 3 in 11 in search mode.
- Base count = PS. KOBOLD (#0) +3 KOBOLD LEADER (Morale 50); LIZARDMAN (#57) count ÷8 (Morale 90); GNOLL (#73) count ÷6 (Morale 75).
- Parley = 9 Haughty / 19 Sly, Nice or Meek / 29 Abusive, + 1d31 + Charisma modifier. ≥95: 'We have to keep this area free of intruders -- Boss's orders. We'll let you go this time…'

**Resting:** unsafe until all 10 random encounters are beaten. Beating Norris does **not** make it safe, "contrary to what the clue book claims". When unsafe, 12% per hour, and the monsters arrive surprised (a bug).

**Clearing:** no reward. **Fleeing:** (13,12), (2,9), (11,3), (1,1), (13,7), (1,14), (10,13), (6,5).

**Locations**
- **2/3/4** Norris's kobold patrols. Attack is automatic if you try to enter the well, likely at 3, sometimes at 2/4, and always if you search. 6 KOBOLD (#0) + 3 KOBOLD LEADER (#1), Morale 67, 16 XP, then an identical second wave.
- **20:** sickly kobolds (1 in 21). "C"ombat → 2 KOBOLD + 4 KOBOLD LEADER, Morale 25. "P"arley → 'Please, oh please noble ones, don't hurt us…'
- **21 (7,13):** 1 LIZARDMAN (#57) + 4 GIANT LIZARD (#59), Morale 75, 99 XP.
- **22 (7,14):** the woman: '…An evil spirit from an unholy pool guides your enemies. It hides behind a fair countenance. Be not deceived.' Then search → **Banded Mail +1, Quarter Staff +1, Bracers AC 4** (533 XP).

### 3.4 Kuto's Well Catacombs (ECL 29). Norris reward.

**Getting there:** enter by E4 → catacombs E1 (7,7). No random encounters. **Location 6** is a secret door, usable only once detected.

**Steps**
1. **9/10/11:** while Norris lives, kobolds shoot arrows: THAC0 21, 1d6 each; 4 attacks at 9, 1 each at 10 and 11.
2. **12** (Norris meets you at whichever of these you reach first):
   - "S"urrender → lose all money and light items plus some heavy ones; you are moved above ground.
   - "F"ight → NORRIS THE GRAY (#32), 5 LIZARDMAN (#57), 9 KOBOLD LEADER (#1), Morale 70, 208 XP. Norris carries a Long Sword +1 and "a curious message" (**Journal Entry 50**): "You have defeated the dreaded bandit gang and rid Phlan of a great evil…"
3. **13 (13,1):** hoard of 20 gems, 92 gold, 2300 silver (867 XP). **It vanishes if you leave the Kuto's Well area unclaimed after beating Norris.**

**Resting:** always safe once Norris is dead; before that, he ambushes you as at 12.

**Reward:** the clerk's "Defeat Norris the Gray" (above).

### 3.5 Mendor's Library (ECL 15). Commission #3 plus book bounties.

**Preparation:** magical weapons, mirrors, and Knock. You can hire a THEURGIST for Knock, but "Be wary of dismissing the NPC within the library … possible to lock yourself inside".

**Getting in:** **E3** is a locked door. Knock is reliable; a Str 18/00 bash is unreliable; a thief has no chance. Other exits: E1 → Kuto's Well; E2 → Textile House.

**Exit trigger:** the first time you leave carrying at least one book, **SPECTRE (#17)** attacks (Morale 100, 338 XP; you cannot surprise it). [GB] quotes it: "Thief! I defended these books in life and I will defend them in death!"

**Locations**
- **1** Garden. Green slime, 7 in 26 chance per move, resolved by a surprise roll (−2 to the slime in search mode). If you avoid it: 'You see a strange green plant growth which you recognize as green slime. You carefully move around it.' Otherwise a random character takes 1d4. Avoidance becomes automatic after 7 encounters.
- **2** Philosophy. Each search has a 1 in 12 chance for each of three categories:
  - (1) *Fyerdetha's Discourses on Power* (**JE 7**)
  - (2) *Urgund's Description of Darkness* (**JE 19**)
  - (3) marginal books, always in this order: *Meditations*, *The Harmony of the Rock*, *Strom's Discussions of Poetics*, *Chronicles of Arram*, *Discourse on the Nature of Writing*
  - Miss text: "You find works on natural philosophy… It is very boring."
- **3** Mathematics: nothing.
- **4** History. 1 in 18 each: *The History of the North* (**JE 8**), *Lex Geographica* (**JE 37**), *The Grand Historian's Records of the Arts of War* (**JE 21**).
- **5** Rhetoric: BASILISK (#26), Morale 100, 541 XP; parley does nothing. Treasure: Potion of Giant Strength, Potion of Healing, Cloak of Displacement, Clerical Scroll (Restoration, Restoration). Equip mirrors first.
- **8 (8,11):** search → jar with **3 Potions of Extra Healing** (200 XP).
- **11 (11,12):** MAD MAN (#25). Parley → one of: 'He is wrapped in fire and so cruel!' / 'The big one, the evil one in the castle of flowers -- he is coming! It is coming!' / 'Don't go there! Don't go on the hill!' / 'He is not human I tell you! Not at all!' He can join with Morale 0 and causes trouble in town.
- **13 (13,13):** search → **Manual of Bodily Health** (800 XP).
- **14/15/16:** 3 Sheets of Gold (worthless).
- **18 (12,10):** 5 KOBOLD (#0), Morale 10, who surrender. Accept → map (**JE 10**).

**Resting:** always safe. **Fleeing:** (7,9), (5,5), (9,9), (9,11).

**Clear condition:** basilisk **and** spectre defeated. The books do not matter.

### 3.6 Podal Plaza (ECL 18). Commission #4; also block clearing.

**Exits:** E1 → Kuto's Well; E2 → Textile House; E3 → Wilderness (24,28); E4 → Stojanow Gate; **E5** → hidden temple of Ilmater (hard lock: Knock always works, bash unreliable, a thief never succeeds).

**Entry choice** (only while you hold commission #4): "**Stride boldly forward**" / "**Disguise party as monsters**" / "**Sneak, remaining unseen**". The guide recommends the disguise.

**Random encounters** happen only on the open squares marked P. Surprise never occurs. Base count = PS/divisor → random X..2X → ×2 if you strode boldly or lost stealth → clamped to 2..50.

| Chance | Divisor | Monster | Morale | Parley mod | Leaders at | Leaders | Move |
|---|---|---|---|---|---|---|---|
| 2/9 | PS/3 | GOBLIN GUARD | 30 | 30 | 40 | 5 GOBLIN LEADER | 6 |
| 2/9 | PS/3 | GOBLIN GUARD | 35 | 20 | 40 | 5 GOBLIN LEADER | 6 |
| 2/9 | PS/3 | ORC | 40 | 20 | 30 | 4 ORC LEADER | 9 |
| 1/9 | PS/3 | ORC | 45 | 10 | 30 | 4 ORC LEADER | 9 |
| 1/9 | PS/6 | HOBGOBLIN | 45 | 0 | 20 | 3 HOBGOBLIN LDR | 9 |
| 1/9 | PS/12 | OGRE | 50 | 0 | — | — | 9 |

**While on the mission**
- 3 in 26 chance of gossip, cycling in order: 'Do you think he'll really show up -- the Boss I mean?' / 'More ogres on the street, since the giants took over the castle.' / 'He melted into a puddle of lard when he touched the thing!' / 'The Boss will be the guy bidding up the price.' / 'The plaza's Bane temple is recruiting for Mace again. Grishnak won't be happy.'
- Confrontations: 4 in 26, or 9 in 26 in search mode.
- If you strode boldly, any parley → combat.
- If disguised, (6 + 5 per non-human) in 101 chance of 'Who are you?':
  - Haughty/Abusive: safe if PS ≥ 1d51.
  - Sly: safe if Charisma modifier ≥ 1d31 → 'Oh, you're here for the Boss.'
  - Nice/Meek: combat.
- If sneaking: 1/6 the same demand; 2/6 "You stop, and they move on."; 3/6 "Your party slips past them."

**Not on the mission**
- Encounter chance 1 in 26 (8 in 26 in search mode).
- Parley = 9/19/29 + 1d51 + 2×Charisma modifier + group modifier.
  - <90: 'We're going to have to teach you a lesson!'
  - 90–111: 'Move it, troll-bait!'
  - ≥112: 'We'll let you off this time.'
- Charisma ≥16 always avoids combat.

**Clearing:** 10 random fights while **not** on the mission. If the commission is received but not done, the counter resets on every entry. The block becomes permanently unclearable if you strode boldly or lost stealth.

**Resting:** safe in the Ilmater temple or after clearing; otherwise 16% per 10 minutes. **Fleeing:** (4,0), (5,1), (6,2), (7,3), (9,4), (10,5), (11,6), (12,7).

**Auction steps (location 1)**
1. Step on a "1" square without having strode boldly or lost stealth → "The auctioneer cries 'Creatures of all ages, welcome to this auction for an item both magical and powerful!'"
2. Detection: when checked, a disguise evades 5 in 6; sneaking is always detected.
3. Choose one:
   - Stand and listen (safe).
   - Move in closer (detection roll; success → "You now see the wand isn't a major artifact, it's only a Wand of Fear!").
   - Listen to comments (safe): 'It's a Wand of Illumination. Who cares, I see in the dark anyway!' or 'It's a Staff of Command. I could have my own army!'
   - Leave (detection roll).
4. The high bidder at 5000 gold is the magic-user **Garwin** with the ogre **Buldwar**. Choose:
   - Make a bid (no gold needed; detection roll) → darkness → then "Follow the ogre" (you search Buldwar, no wand, detection roll), "Move quietly away" (detection roll), or "Look for the man in plain clothes" (safe, he is not found).
   - Wait for winner → 'Going ... going ... gone!'
   - Leave (detection roll).
5. **Any outcome completes the mission.** You cannot win the auction.

**Other locations**
- **2 (4,8) The Pitt.** First entry: "You opened the door into a drunk buccaneer…"
  - "C"hallenge → one-on-one with 1 4TH LVL FIGHTER (#41); keep his **Long Sword +1, Chain Mail +1**. Sleep usually works.
  - "A"ttack → 1 4TH LVL FIGHTER, 4 HOBGOBLIN, 12 GOBLIN GUARD, 8 ORC, Morale 30, 234 XP.
  - "F"lee → lose stealth.
  - "B"ribe → 10% of money and light items.
  - In the bar afterwards:
    - "Mix with monsters": undisguised → patrons attack. Disguised → "Monsters insult your abilities and parentage." Your responses: Attack or Insult back → brawl (25 GOBLIN GUARD, 20 HOBGOBLIN, 5 OGRE, Morale 50, up to 21 non-ogres on your side); Try to leave → patrons attack; Join the drinking → same as "Drink heavily".
    - "Drink heavily": lose all money and 50% of light items, and lose stealth.
    - "Attack": same as attacking the buccaneer.
    - Any fight with the patrons abandons the bar.
- **4 (1,15)** "This is a hidden temple of Ilmater. You feel safe here." Normal temple services.
- **5 (13,8)** shrine text.
- **6 (14,8)** orc priest of Bane:
  - "A"ttack → 1 ORC LEADER (#5), Morale 90, Distance 1.
  - "G"reet → combat if you are on the mission and not disguised; otherwise a recruiting pitch ('…our temple to the northeast…' or '…to recover our temple…') and you are told to return in 2 hours. On return: 'First, to show your loyalties, kill the unbelievers.' → 8 ORC, 3 OGRE, 1 ORC LEADER, Morale 50, Distance 1.
  - Either fight drops **6 Leather Holy Symbols**.

### 3.7 Cadorna Textile House (ECL 2). Commission #5.

**Exits:** E1 → Mendor's Library; E2 → Podal Plaza; E3 → Wilderness (24,28).

**Random encounters**
- Chance 1 in 31, or 1 in 6 in search mode.
- In the south-central hobgoblin zone, until the ogre at 21 is dead, you always meet 8 HOBGOBLIN + 1 HOBGOBLIN LDR (Morale 60, Distance 2, 40 XP). These do not count.
- Elsewhere there are 10 fixed random encounters, chosen by 1d11 + number already fought. The 10th appears only after the ogre is dead.

  | Roll | Encounter |
  |---|---|
  | 1–4 | 8 POISONOUS FROG (52 XP) |
  | 5–8 | 3 LARGE SCORPION + 1 HUGE SCORPION (64 XP) |
  | 9–13 | 5 GHOUL + 1 WIGHT (180 XP) |
  | 14–18 | 10 SKELETON + 8 ZOMBIE + 1 WIGHT (200 XP) |
  | 19+ | the hobgoblin group |

**Fleeing:** from hobgoblins to (4,11), (8,8), (4,14) or (12,13); otherwise to (4,2) or (12,2).

**Resting:** 6% per hour until safe. Safe rest can still be "disturbed by nothing" (a bug).

**Clear condition:** all 10 non-hobgoblin encounters **and** the ogre at 21, and then you must wander until a random-encounter roll occurs before the script notices.

**Recommended steps**
1. **24 (1,3)** well: "'Thieves only.'"
   - A non-thief falls for **15d6**; a Ring of Feather Falling does not help (a bug).
   - A thief makes a Climb Walls roll.
   - Restal expels you unless you climbed down successfully **and** hold Cadorna's mission.
   - Offer: 'You are seeking the textile house. We can get you in unseen and possibly help you with the treasure.' Accepting moves you to **24a (6,11)** ("You are blindfolded… 'Only meet us at the main well.'") and skips the courtyard fight at 1.
2. **18** Grishnak: 'I am the mighty Grishnak!…' Fight GRISHNAK (#28), 12 HOBGOBLIN, 3 HOBGOBLIN LDR, Morale 100, 353 XP. Loot: Cursed Necklace, **Brass Key**, Potion of Healing, MU Scroll (Reduce, Detect Invisibility, Fireball), MU Scroll (Burning Hands, Mirror Image, Blink), and a useless Stone Statuette.
3. **17 (2,15)** Skullcrusher in chains, with a page (**JE 47**). Only the Brass Key frees him. Then parley with anything but Abusive → 'Thanks for freeing me. I'm Lord Cadorna's servant.' He joins as SKULLCRUSHER (#28 [sic]), Morale 100: '…There's a secret door to the southeast…'
4. **20 (11,14):** with Skullcrusher present: "'In the east wall is the secret door,' says Skullcrusher."
5. **21 (12,14)** ogre chief: 'Puny creatures…' Fight 1 OGRE, 18 HOBGOBLIN, 4 HOBGOBLIN LDR, Morale 100, Distance 1, 132 XP. Then the sealed treasure:
   - "**T**"ake unopened, or
   - "**O**"pen immediately → 1943 XP, 4 jewelry, 8 gems, 400 pp, 20 sp, 450 cp, four pieces of item jewelry, **Gauntlets of Ogre Power**, and Cadorna's wrath.
6. Take it back to Restal: 'We can duplicate the seal on that chest -- for half the treasure -- no one will ever know.' Accept → **2 jewelry, 4 gems, 200 pp, four item jewelry, Gauntlets of Ogre Power (1200 XP)**. Then return the box to the clerk for #5 (20 gems).
7. **Branches:**
   - Carry the unopened box out through Civilized E2 → the watch takes it and tells you to collect from the clerk.
   - Open it yourself → Cadorna's confrontation at Civilized 27.
   - **Exploit:** leave the map and come straight back; the opened flag resets, and Restal will open it again. Only returning to New Phlan sets the quest as complete.

**Other set fights**
- **1** (first courtyard entry, unless the thieves snuck you in): "A drum begins to beat and hobgoblins attack." 12 HOBGOBLIN + 2 HOBGOBLIN LDR, 63 XP.
- **2** barracks: 14 HOBGOBLIN + 3 LDR (76 XP); they attack unless you "F"lee.
- **5 (2,8):** 10 HOBGOBLIN + 2 LDR (54 XP); **respawns**.
- **8:** 12 HOBGOBLIN + 2 LDR (63 XP).
- **23:** a diary page (**JE 11**) at the first such square you enter.
- **6, 7, 12, 13, 14, 15, 16, 19:** flavor text.

### 3.8 Kovel Mansion (ECL 14). Commission #7.

**Getting there:** dock → "B"ay → "N"orth. Exits: E1 → Wilderness (26,27); E2 → Wilderness (26,26); E3 → Wealthy Area.

**No random encounters.** Resting before the block is cleared → three sling bullets (THAC0 10, 1d4+1).

**Clear condition:** kill at least **21 thieves** in combats that count: the B ambushes, location 14, C2 (via 15), and 16.

**Recommended order:** 14 → 16 → one more thief fight.

**B squares (ambushes)**
- 30% chance (35% once kills ≥12) of a backstab: THAC0 −10, 2d8 (3d8 once kills ≥12). No retaliation possible.
- Otherwise you catch the thief and choose to attack or let him go. Attacking → 1 1ST LVL THIEF (#45), or a 6TH LVL THIEF (#51) once kills ≥18; Morale 30; +1 kill.
- A backstab cannot come from the same-numbered B as the previous backstab.

**Traps**
- **T3, T5, T6, T8:** scything blade, THAC0 0, 1d6.
- **T4:** gas, 1d3, save vs poison negates.
- **T7:** bladed net, 1d6, save vs spell negates.

**Locations**
- **9 (10,9):** 400 XP; Short Sword +2, Leather Armor +4.
- **10 (14,10):** three locked cabinets. A = papers (**JE 23**, **JE 14**); B = 1500 silver (12 XP); C = 1800 gold (300 XP), with a needle trap (THAC0 −20, 1d8).
- **11 (14,14):** 26 huge and 2 fine tapestries.
- **12 (3,13):** trapped cabinet (save vs poison or 2d6 to everyone). 666 XP: MU (Fireball, Haste, Hold Person); MU (Blink, Ray of Enfeeblement, Slow); Cleric (Hold Person, Cure Blindness, Bestow Curse); Cleric (Prayer, Remove Curse, Animate Dead); MU (Reduce, Detect Invisibility, Fireball); MU (Burning Hands, Mirror Image, Blink).
- **13 (6,7):** four trapped, locked caskets:
  - A: 12 gems (500 XP); needle 1d4, save vs poison.
  - B: 1 jewelry (366 XP); dart 1d3.
  - C: 3 gems (125 XP); powder 1d6 to everyone, save vs poison.
  - D: 20 gems (833 XP); 12 darts (THAC0 10, 1d4).
- **14 (3,4):** pile of arms. Detect the trap with Find/Remove Traps or the Detect Traps spell, then disarm. If the disarm fails or you just take the pile, the ambush depends on kills so far:
  - 0–7 kills: 5 6TH LVL THIEF.
  - 8–12 kills: (kills−7) 1ST LVL + (12−kills) 6TH LVL.
  - 13–17 kills: undefined behaviour (underflow or stale pointer).
  - 18+ kills: no ambush.
  - +5 kills if you started the fight with 0–15 kills.
  - Loot in every case (600 XP): 2 Daggers +1, Hammer +1, Morning Star +1, Scimitar +1, Short Sword +1, Shield +2, Chain Mail +1, Broad Sword −2.
- **15 (6,5):** two thieves attack, fail, and flee east. Chase → they split at **C1 (9,8)**. "E"ast → **C2 (13,5)**, a single thief handled like a B. "S"outh → the ambush at 16.
- **16:** 15 1ST LVL THIEF + 3 6TH LVL THIEF, Morale 60, 263 XP. Counts as **15** kills, not 18. It persists even after the block is cleared.
- **17 (8,14):** files (**JE 38**, **JE 51**).
- **18 (10,12):** jail. 10 1ST LVL THIEF (23 XP); the dying old thief hands over papers (**JE 48**). This fight does **not** count.
- **19 (5,14):** slate 'NW Castle' (**JE 41**). **20 (4,5):** floor map 'NE Castle' (**JE 29**).

### 3.9 Wealthy Area (ECL 24). Clearance reward.

**Getting there:** dock → "B"ay → "S"outh. Exits: E1 → Wilderness (26,27); E2 → Kovel Mansion; E3 → Temple of Bane. Listed XP assumes 7 characters (Dirten in the party).

**Random encounters:** 1 in 20, or 1 in 6 in search mode, until **both** this block and the Temple of Bane are cleared.

- **40% are a special patrol:** "You see a group of four orcs whose shields bear a black hand on a red field." No surprise roll. Parley:
  - Haughty/Abusive: 'You moles better watch your step or you shall feel the wrath of Bane!'
  - Nice/Meek: '…youse guys look harmless enough.'
  - Sly: 'Oh, yeah youse them guys who know where de treasure is. We not supposed to kill you yet.'
  - They fight only if forced. If killed they carry **6 Leather Holy Symbol**. Doing anything other than fighting them counts as "encountered non-violently" (from the v1.40 changelog).
- **Otherwise, this table:**

  | Odds | Divisor | Monster | Morale | Parley mod | Leaders at | Leader multiple |
  |---|---|---|---|---|---|---|
  | 20% | 1 | GOBLIN GUARD | 50 | 20 | 40 | 5 |
  | 20% | 1 | ORC | 55 | 10 | 30 | 4 |
  | 10% | 2 | HOBGOBLIN | 60 | 10 | 20 | 3 |
  | 10% | 6 | OGRE | 80 | 0 | 11 | 1 (OGRE LEADER) |

  - Count = PS÷divisor (minimum 4), then 60% ÷3, 30% ÷2, 10% unchanged; capped at 56 minus leaders.
  - Parley = 4 Meek / 29 Haughty, Sly or Nice / 59 Abusive, + 1d31 + Charisma + group modifier:
    - ≤74: attack.
    - 75–99: 'Get outa here before we make you leave'.
    - 100–139: 'We gotta keep all you nonbelievers outa here'.
    - ≥140: "You intimidate the monsters so much they run away!"

**Resting:** unsafe until both blocks are cleared; 50% per 20 minutes → 10 ORC (23 XP).

**Clear condition:** fight the combat in any mansion square marked M.

**Locations**
- **M:** 20 ORC if you met the four-orc patrol and let it live, otherwise 10; Morale 99; 46 or 23 XP. They attack at once if you carry no Leather Holy Symbol; with one they act surprised, but anything except running away still ends in combat.
- Search mode on **entering**:
  - **1** tapestry.
  - **2** 3 jewelry (942 XP).
  - **3** trap door: Clerical Scroll (Animate Dead, Cure Blindness), Potion of Extra Healing, Ring of Feather Falling (285 XP).
  - **4** 3 jewelry (942 XP), **first entry only**.
- **6 (6,8):** 6 ORC + 1 OGRE, Morale 80, 42 XP; they carry **JE 53**.
- **7 (14,8):** goblin slaves. "L"et go → 'To enter the temple you need a holy symbol of Bane.'
- **9 (8,12):** 6 ORC + 2 ORC LEADER (29 XP).
- **10:** search the beds → 8 ORC (18 XP).
- **12 (5,15):** 'North wall. Ri  t front glas . Se' (meaningless, per the clue book).
- **Crash bug:** moving south from **(4,15)** crashes the game.

### 3.10 Temple of Bane (ECL 24). Commission #6 (Braccio/Dirten).

**Getting there:** Wealthy E3 → Temple. **E2 [location 4]**: "an old blind decrepit orc stands outside with eight orc guards".
- If you met a four-orc patrol non-violently → admitted automatically. This is a trap: Mace wants you to find his treasure.
- Otherwise the blind orc checks for a Leather Holy Symbol and lets you in if you allow him to search you.
- Otherwise you fight 8 ORC (#4), Morale 99, 18 XP.

**Inside**
- Search for the hidden trap doors at **1, 2, 3**. [SP] places them at 5-5, 9-12 and 12-9.
  - **1** (342 XP): Clerical (Animate Dead, Cause Disease, Prayer); Clerical (Snake Charm, Silence 15' Radius, Bless); MU (Fireball, Ray of Enfeeblement, Stinking Cloud).
  - **2** (800 XP): Potion of Giant Strength, Potion of Healing, Potion of Speed, **Wand of Magic Missiles (20 charges)**, **Dust of Disappearance** (save it for Tyranthraxus).
  - **3** (457 XP): Hand Axe +1, Dagger +1, Hammer +1, Mace +1, Morning Star +1, Scimitar +1, Spear +1, Short Sword +1.
- **The third find**, **or** trying to leave, **or** "D"estroying the altar at **7** triggers: MACE (#33), 30 ORC (#4), 20 ORC (#44, elite archers), 5 ORC LEADER, Morale 99, 256 XP. Mace carries a **Mace +1** and **JE 25**. **Dirten leaves after this battle.** The altar gives the orcs no extra morale, despite the clue book.

**Clear condition:** Mace is defeated, with or without Dirten. Random encounters are as in the Wealthy Area, except none occur in the central temple while Mace is letting you search.

**Exploit:** you can keep Dirten permanently by not having him in the party when the temple is cleared.

### 3.11 Wilderness (ECL 25/26/27) and fixed points

**Rules**
- Moving one square takes **12 hours**.
- The random-encounter set is chosen by X coordinate: **West X=2–15; Central X=16–28; East X=29–41**.
- Encounter chance is 5% per move: 20/21 a monster group, 1/21 a lair entrance.
- "W"ait avoids combat only if the party is unsurprised and the monsters are surprised.
- "F"lee works only if neither side is surprised.
- Parley = receptiveness + attitude modifier + Charisma modifier + 1d31. ≤99: attack. 100–139: "You convince the <monsters> that combat is not necessary…" ≥140: "The <monsters> fall for your sparkling personality and wander away without a fight." Receptiveness 0 means always hostile; 50 means always friendly.
- Group size = PS ÷ divisor, then 1/6 none, 3/6 ÷2, 2/6 ÷3 (minimum 1).
- Resting: 10% chance per 8 hours of a non-lair encounter.

**Region tables**

| Region | Monsters (frequency, divisor, morale, parley, move) | Parley modifiers H/S/N/M/A |
|---|---|---|
| West (out of 19) | QUICKLINGS 2,4,60,10,96 · WILD BOAR 3,4,60,0,15 · GIANT MANTIS 1,10,60,0,12 · TIGER 3,6,60,0,12 · THRI-KREEN 2,10,60,30,18 · AHNKHEG 1,8,60,0,12 · CENTAUR 2,4,60,50,18 · CORPORAL 2,2,80,10,6 (reduction 10 → extra CORPORAL) · 1ST LVL THIEF 1,2,40,10,12 (40 → 6TH LVL THIEF) · GIANT SNAKE 2,8,60,0,15 | 19/9/**49**/−1/29 |
| Central (out of 18) | KOBOLD #123 4,1,40,30,6 (40 → KOBOLD LEADER) · DISPLACER BEAST 2,6,60,0,15 · DRIDER 1,7,60,1,12 · STIRGE 3,2,60,0,18 · LIZARDMAN 3,3,50,20,6 · BANDIT 1,2,60,20,9 (20 → AIDES) · NOMAD 2,1,60,50,9 (30 → AIDES) · MERCHANT 2,1,0,50,9 (30 → AIDES) | 29/29/29/4/**59** |
| East (out of 20) | KOBOLD 4,1,40,30,6 · GNOLL 3,2,50,20,9 · LIZARDMAN 3,3,60,20,6 · GIANT LIZARD 2,4,50,0,15 · HIPPOGRIFF 2,4,70,0,18 · WYVERN 1,8,70,0,24 · TROLL 2,7,60,10,12 · PHASE SPIDER 1,6,70,0,31 · MINOTAUR 2,7,70,10,12 | 19/19/4/4/**29** |

West quirks: quicklings cannot be surprised; a giant mantis surprises the party on 1–5; tigers and corporals are surprised only on a 1.

**Fixed points**

| Point | Coords | What it does |
|---|---|---|
| a | (25,27) | Phlan; walk over freely |
| b | (26,27) | "N"orth → Kovel Mansion (15,4); "S"outh → Wealthy Area (15,4); "B"oat → Civilized (15,1) |
| c | (25,26), (26,26) | "C"ity gates → Kovel (4,0); "G"raveyard → Valhingen (0,4) |
| d | (24,28) | "N"orth → Podal Plaza (0,4); "S"outh → Textile House (0,4) |
| e | (20,29), (35,29) | Boat back to Civilized (15,1) |
| f | (19,14) | Hidden rowboat → island |
| g | (19,16) | Pyramid: "E"nter → Level 1 (15,0), or "G"o back |
| h | (25,11) | Nomad Camp (1,14) |
| i | (3,32) | Zhentil Outpost (7,0); entry only with the diplomatic mission. Otherwise guards tell you to leave; refusing → 12 CORPORAL (#54), 92 XP. |
| j | (8,24) | First visit: 2 AHNKHEG, Morale 90, Distance 1, 143 XP |
| k | (10,9) | Silver dragon (ECL 19); see below |
| l | (32,15) | Kobold Caves. Every approach before they are cleared: 25 KOBOLD + 5 KOBOLD LEADER, Morale 50. "L"arge → (10,0); "S"mall → (6,0). |
| m | (37,8) | Lizardman Keep (8,14) |
| n | (12,31) | Buccaneer Base (0,8). Not shown on the map until you accept #12; no re-entry once resolved. |

**Silver dragon at k (10,9)**
1. "E"nter the cave. Diogenes asks you to "S"tate name and intent, or leave.
2. "Ask dragon for advice", "Pledge party to dragon's service" or "Offer gift" → he asks you to retrieve a **silver bottle** from the kobold complex to the east and come back for another quest.
3. "Challenge evil leader of old Phlan" → he is offended.
   - "A"pologize → same as asking for advice.
   - "S"lay → he leaves. "F"ollow, then "A"ttack → everyone saves vs breath or takes **11d6**.

### 3.12 Wilderness lairs (optional; regenerate every time you re-enter; no automap, no random encounters, always safe to rest)

| Lair | Contents |
|---|---|
| **Wild Boar** (W) | 1 (0,0) 2 WILD BOAR (52 XP) · 2 (5,2) sow: "A"pproach → 1 boar at −4 to hit (26 XP) · 3 (0,4) 3 boars (78 XP) |
| **Anhkheg** (W) | 6 (4,1) 1 gem, 500 ep, 2000 sp, 5000 cp (104 XP) · 7 (6,3) 1 AHNKHEG, Distance 1 (71 XP) |
| **Thri-Kreen** (W) | 11 (5,7) "A"ttack → 2 THRI-KREEN (604 XP) · 12 (6,11) 3 (907 XP) · 13 (2,8) 4 (1951–2284 XP): 1 jewelry, 3 gems, 1000 gold, 2000 silver, **1 random magic item** |
| **Giant Snake** (W) | 9 (13,14) 1 GIANT SNAKE (43 XP) · 10 (15,14) surprise snake (43 XP) |
| **Grove with Pool** (C) | 2 "A"pproach → 6 LIZARDMAN (98 XP) · 3 (2,6) ambush by 2 DISPLACER BEAST (238 XP) |
| **Ruined Huts** (C) | 4 (8,14) chained kobolds: "R"elease ('Watch out for the mutant lizard men…') or "A"ttack · 6 (9,11) 2 MUTANT LIZ-MAN (44 XP) · 7 (2,11) and 8 (2,15) 4 LIZARDMAN each (65 XP) |
| **Grove with Stirges** (C) | 9: on the 1st, 5th, 9th… entry, −1+1d31 STIRGE (minimum 6; 46–230 XP) |
| **Wyvern** (E) | 2 (0,2) 3 jewelry, 3 gems, 1000 gold, 2000 ep, 6000 sp, 5000 cp, **1 random magic item** (1679–2012 XP) · 3 (first entered) and 4 (4,1): 1 WYVERN each at −2 to hit (224 XP) |
| **Giant Lizard** (E) | 5 (5,12) 4 GIANT LIZARD (82 XP) · 7 (0,9) 4 lizards + 2 MINOTAUR (304 XP) · 8 (2,11) 3000 ep, 4000 sp, 6000 cp, **1 random magic item** (355–688 XP) · 9 (1,15) 2 lizards (41 XP) |
| **Gnoll** (E) | G squares: 1 in 8 → 3+1d31 GNOLL · 13: 4 TROLL + 12 GNOLL (666 XP) |
| **Kobold** (E) | K squares: 1 in 8 → 9+1d41 KOBOLD (+3 leaders if ≥40) |

These three lair magic items are "the only repeatably lootable random magical items in the game".

### 3.13 Nomad Camp (ECL 17). Commission #8.

**Getting there:** h (25,11) → camp (1,14). Crossing the tripwire perimeter makes the nomads approach.

**Branch A: attack**
- 14 NOMAD (Morale 100, 37 XP), then two more such fights; parley stops working.
- The 4th fight: HASSAD (#42), 1 SHAMAN (#43), 5 4TH LVL FIGHTER, 49 NOMAD (2817 XP). The nomads fight at −2 to hit. Treasure 5000 gold.
- Hassad carries Long Sword +2, Shield +1, Scale Mail +2. The shaman carries Dagger +2, "Bracers AC 2" (really AC 4) and a Wand of Magic Missiles (50 charges). Each fighter carries Long Sword +1 and Chain Mail +1.

**Branch B: parley**
1. The chief invites you to a feast. Refusing → asked to leave; staying → the same fights as Branch A. Up to this point you can leave and the map resets.
2. Accept → Hassad's warnings (**JE 55**) and his fear of a kobold attack. You are shown to a hut.
3. If you leave now, the kobolds kill the nomads. The mission still completes, with a small reward.
4. Stay → kobold wave 1: (56 − nomads)÷2 each of KOBOLD (#0) and KOBOLD (#123), Morale 80. If you are inside the tripwire and never attacked the nomads, 2d7 NOMAD fight beside you. Fleeing only delays it.
5. Wave 2 follows a few minutes later. If you attacked nomads in wave 1, the kobolds and nomads ally against you.
6. Wave 3:
   - If you backstabbed the nomads: 49 KOBOLD (#123) plus Hassad, the shaman and 5 fighters, at −1 to hit; 8000 gold plus the same items.
   - If you did not: 'Well done! What say we finish this together?'
     - Agree → with Hassad and 2 fighters, fight 27 KOBOLD (#0) + 26 KOBOLD (#123), Distance 2, 3000 gold. Win → 'You fought as the heroes of legend…' → **5000 gold, Two-Handed Sword +2, Wand of Magic Missiles (35 charges) (6133 XP)**.
     - Decline → 'Cowards!' … 'For Hyrnka!' … '…Equal to your honor.' → **500 gold (83 XP)**.

**Completion:** Hassad is killed **or** Hassad rewards you.

### 3.14 Kobold Caves (ECL 13). Commission #9; dragon side quest.

**Getting there:** l (32,15). [P] recommends the "L"arge entrance (it avoids the trap at location 1).

**Penalties:** in fights against only kobolds and kobold leaders, the party takes −2 THAC0 and −2 movement, and the kobolds get +2 to hit.

**Traps:** bypassed automatically if a kobold is escorting you. Otherwise found with Detect Traps, or in search mode with a thief's Find/Remove Traps roll, then bypassed with another roll.

**Random encounters:** 1 in X, where X = 21, +40 if not in search mode, +100 after the throne fight at 9. 15 KOBOLD + 3 KOBOLD LEADER, Morale 30.

**Resting:** in the large cavern until the wyvern is fought; afterwards only after the throne waves are beaten, and then 5% per 8 hours: 7 rock attacks (THAC0 10, 1d4+1).

**Fleeing:** (0,12), (6,12), (1,14), (9,11), (7,10), (6,11).

**Clear condition:** **visit location 11**.

**Steps**
1. Enter the Large cave. **16 (13,9)** is a climb: if the wyvern is still alive it surprises you here. **17:** 1 WYVERN, Morale 100, 224 XP.
2. **26 (14,6):** 2 jewelry, 2 gems, 1000 gold, 500 electrum, 1000 silver, **2 random magic items** (1166–1833 XP).
3. **6 (12,9)** (Large-entrance route only): "A drunken kobold lies here." Wake it → it leads you to **6a (7,5)** as guests of the king.
4. **9** throne room: "…'These men are enemies…' … 'Kill them!'" Three waves with no rest:
   - Wave 1: 4 TROLL, 35 KOBOLD, 11 KOBOLD LEADER, Morale 70, 618 XP.
   - Wave 2: 5 WILD BOAR, 45 KOBOLD, 8 KOBOLD LEADER, Morale 60, 212 XP.
   - Wave 3: 2 ENVOY (#87), 2 TROLL, 2 WILD BOAR, 8 KOBOLD, Morale 100, 767 XP. Each Envoy carries a **Two-Handed Sword +2**.
   - Ballista volleys between waves: 7 attacks, THAC0 3, 2d6.
   - Win all three and the king flees.
5. **20:** king's guards: "3 TROLL (#1) [sic]", 3 WILD BOAR, 20 KOBOLD, 4 KOBOLD LEADER, Morale 100, 522 XP.
6. **11 (10,1):** "The king, panicked, has fallen into his own spiked pit and died." **The area is cleared.**
7. **27 (13,1):** 2 jewelry, 6 gems, 50000 copper, MU Scroll (Charm Person, Protection from Evil, Strength), MU Scroll (Friends, Invisibility, Protection from Normal Missiles) (1158 XP).
8. **12 (12,0)** brass bottle. Search, then "P"ull: 'I am the efreeti Samir Ahwahl… Are you, perchance, vampires?'
   - "Y"es → fight 1 EFREETI (#124), Morale 100, 454 XP.
   - "N"o → 'Fools, summon me only when a vampire is near…' and you can take the **Efreeti Bottle** (666 XP).

**Other locations**
- **1 (6,13):** pit trap; one character falls into water and the party loses 20% of money and light items.
- **2 (6,11):** search the tailings → **JE 42**.
- **3 (8,12):** truce kobold: 'You are quite dangerous, we will pay for a truce.' Agree → led to 6. Refuse → deadfall 2d6 to anyone failing a save vs petrification, then 20 KOBOLD surprise you (Morale 25).
- **4 (10,9):** net trap → 20 KOBOLD surprise you.
- **5 (11,9):** spikes, 2d4 to one character (save vs death).
- **13:** wall map (**JE 28**).
- **14 (1,3):** Princess Fatima (**JE 16**). Accept or attack PRINCESS FATIMA (#104), Morale 100. She leaves when you leave the map. **15 (0,0)** is her cell.
- **18 (15,3):** search → crippled kobold. "G"ive water → **JE 20**.
- **19, 21, 22:** flavor.

### 3.15 Yarash's Pyramid (ECL 22/23). Commission #10.

**Getting there:** f (19,14) rowboat → g (19,16) → "E"nter → Level 1 (15,0). Exit E → Wilderness (19,16).

**Level 1**
- The starting corridor is safe. The maze has random encounters at 1 in 21 (1 in 3 in search mode), always hostile, Morale 100. **Each of 12 occurs only once.**
  - North half: 20 STIRGE · 3 DRIDER · 3 MINOTAUR · 3 DIANE (#79) · 3 KOBOLD (#123) · 3 7TH LVL FIGHTER (#80).
  - South half: 3 6TH LVL FIGHTER (#75) · 3 DISPLACER BEAST · 3 7TH LVL DW FIGH (#76) · 3 LIZARDMAN · 3 7TH LVL THIEF (#77) · 3 DRIDER.
  - Flee succeeds by movement comparison, +3 if you surprised them, −3 if they surprised you.
- Resting: safe in the corridor or in a half whose six encounters are cleared; otherwise 33% per 10 minutes.
- **Teleporters:** TA (14,7) → Ta, Level 2 (4,15); throwing a rock toggles it to Tb, Level 1 (5,11). TB (14,8) → Tb (5,11). TC (14,9) → Tc (0,0). TD (6,1) → Td, Level 2 (0,12).
- **12 (13,15)** priest: attack (2ND LVL CLERIC #78), or repeatedly parley Nice/Meek (1 in 3 each time) → 'I have a secret. I have chiseled almost all the way through to the outside…' "Y"es → a **permanent exit** in the south wall.
- **13 (13,4):** corpse; search → Tyrmor's journal (**JE 26**).

**Levels 2 and 3** (no random encounters; always safe to rest; flee goes to L2 (3,8) or to Tk on L3 (0,0))
- **Teleporters:**
  - TE (15,12) → Te, L2 (11,3); a rock toggles it to Tf, L1 (15,7). Game check: TA sets the shared direction bit, so on arrival via TA the no-rock destination is Tf and one rock selects Te.
  - TG (12,3) → Tg, L2 (14,12); toggles to Th, L3 (0,4).
  - TI (15,8) → Ti, L2 (3,13).
  - TJ (0,2) → Tj, L2 (13,3); toggles to **Tk, L3 (0,0)**.
  - TL (6,0), destination set by the dial at 26: Blue → L1 (15,8); Copper → Tm L3 (4,9); Silver → Tn L3 (7,0); Gold → To L3 (14,13). Each of the last three has a return teleporter.
- **[CB] step list** (a cross-check, not from [P]): "Move down the main corridor to the first alcove, turn right… teleport. Move down the hall, turn right at the intersection… end of the hall. Throw a stone and then teleport. Follow the corridor… Throw a stone and then teleport. Move down the hall. Throw a stone and then teleport. You are now on the third level at A7." [GB]: "#2 to #2a, #8 (throw rock) to #8b, #12 (throw rock) to #12b, and #13 (throw rock) to #13b."
- **6 (13,3):** 5 LIZARDMAN (81 XP). Parley score = 0 Abusive / 15 Haughty or Sly / 30 Nice / 50 Meek, + Charisma modifier.
  - <75: 'Mutilating scum!…'
  - ≥75: '…The enemy of my enemy is not my enemy!'
- **17:** search → 3 MUTANT LIZ-MAN (66 XP); the party is always surprised. **18:** search → notebook text. **1, 8, 10:** flavor.
- **19/20/21:** "magical junk"; search each → 400 gold, 1200 silver, **3 random magic items** (276–1277 XP).
- **22 (1,1):** door sign 'Don't forget the password', six Dethek runes. Answer '**NOKNOK**'. Anything else → every character takes **201** damage.
- **23 (2,1):** destroy the machinery.
  - Mechanism: roll d10 up to 10 times. Any 1 destabilises it ("You hear a whining from the pipes…"), and you then have at most 2 more safe rolls. Failure chance about 34.9%.
  - The explosion does 3d10 to everyone.
  - Destroying it flags the area, though the Yarash fight flags it too.
- **24 (5,4):** three shackled lizardmen.
  - Attack, or parley Haughty/Sly/Abusive → 2 random characters take 201 damage, then 3 LIZARDMAN (49 XP).
  - Parley **Nice/Meek** → freed; they explain Yarash (**JE 35**, which carries the friend-word).
- **25 (4,1):** Yarash. Every option → combat with 1 YARASH (#81) + 6 MUTANT LIZ-MAN, Morale 100, 959 XP. He carries Bracers AC 4, a **Wand of Paralyzation (23 charges)**, 2 Potions of Healing and 1 Potion of Speed.
- **27 (6,1)** desk: search → **JE 33** (the Boss's demand), **JE 49** (unsent reply), **JE 27** (sahuagin bounty), **JE 56** (northwest mountains warning), **JE 40** (trapper note).

**Rules:** you **cannot leave Level 3 without defeating Yarash**. Defeating him clears the area.

**Bug:** completing and leaving the pyramid "can incorrectly flag the endgame scripts".

### 3.16 Lizardman Keep (ECL 16). Commission #11.

**Getting there:** m (37,8) → (8,14); E1 [location 15] is the exit.

**Rules**
- **Anti-magic over the whole area:** no spells, not even from items.
- **First entry to the catacombs:** 10 GIANT LIZARD attack (Morale 100, 206 XP); the party has −4 to hit and damage, and humans, half-elves and elves have −2 movement. The intended reduction for lizards killed on the surface does not happen.
- Entering the catacombs also marks locations 1, 3 and 10 as visited, so visit those first.
- Passages Ea–Eg link surface and catacombs; on the surface you may need to search for them.
- Resting is always safe.
- **Clear condition:** win the duel against Drythh, **or** kill at least 40 of the 50 lizardmen. Only catacomb fights and the 20-lizardman fight at 10 count.

**Steps (friend-word route)**
1. Complete the Pyramid step at Level 3 location 24 first.
2. The first of **1 (4,3)**, **3** or **10** you enter: "An old lizardman appears before you, hand raised in a gesture of peace."
   - "C"ombat → he dies and the location's fight follows.
   - "P"arley → '…If you are they you will have been shown our tribal friend-word.'
3. Answer '**SAVIOR**' → his story (**JE 31**).
   - A wrong answer: 'You are not they who rescued my children, but are murderous pirates!…' → 2 LIZARDMAN + 1 GIANT LIZARD (53 XP). This location-1 fight occurs even at 3 and 10 (a bug).
4. Drythh challenges him and you are asked for a champion.
   - "N"o → 'Then I must fight him myself.' → DRYTHH (#95) + 12 LIZARDMAN (218 XP).
   - "Y"es → one-on-one with DRYTHH. Lose → same as "N"o. Win → '…Rest assured that my people will not join Tyranthraxus…' **Mission complete.** You may still loot the catacombs, fighting as normal.

**Without the friend-word**
- **1:** 2 LIZARDMAN + 1 GIANT LIZARD (53 XP).
- **3:** 3 GIANT LIZARD (62 XP).
- **10:** javelin ambush (THAC0 18, 1d6), then 20 LIZARDMAN + 4 GIANT LIZARD (Morale 60, 409 XP) at −3 to hit and −2 movement.

**Pools P1–P8**
- While lizardmen remain, 5 LIZARDMAN emerge and throw javelins (THAC0 16, 1d6). The first time at each pool they automatically surprise you.
- You fight at −4 to hit and −2 movement.
- If you enter a pool without beating its lizardmen: 5 attacks (THAC0 12, 2d2) and then 5 more (THAC0 12, 1d8).
- Treasure: P1/P2/P3/P7/P8 = 216 XP, 1 gem, 1000 gold, 1000 silver. **P4/P5/P6** add a **Shield +2** (350 XP).
- **16 (3,8):** search (before the duel) → 1 jewelry, 1 gem, 1000 gold (575 XP).

### 3.17 Buccaneer Base (ECL 1). Commission #12.

**Getting there:** n (12,31) → (0,8). It appears only after you accept #12, and you cannot re-enter once the quest is resolved. On entry you are led to the merchants' camp (location 2).

**Recommended steps**
1. **6 (2,11):** 'Pssst, buddy. Want to buy a pass to see the captain?' The pass is an inventory item costing **25% of the current character's money**.
2. **4 (7,11):** two large guards. "S"how pass. Bribes fail. "A"ttack → 2 4TH LVL FIGHTER (327 XP), then waves:
   - Wave 2: 1 3RD LVL FIGHTER + 20 BUCCANEER.
   - Wave 3: 1 5TH LVL + 1 3RD LVL + 50 BUCCANEER.
   - Wave 4: 1 5TH + 2 3RD + 53 BUCCANEER.
   - The captain then offers surrender: accepting → lose 75% of money and 50% of light items, expulsion, mission failed.
   - Wave 5: CAPTAIN (#102) + 15 4TH LVL FIGHTER + 40 BUCCANEER (3561 XP if the captain is alive). Victory captures the base and frees the heir.
3. **5 (7,12)** with the pass, the captain greets you.
   - "M"ention the boy → "B"uy him for **75% of the party's money and 10% of light items** (no money actually required).
   - "A"ttack → CAPTAIN + 4 4TH LVL FIGHTER (1669 XP), loot **Long Sword +4, Shield +2, Plate Mail +3**. This does not alert the base. Running away does.
4. **10 (11,6):** release the animals; this distracts the guards for **60 minutes**.
5. **11 (7,6)** slave-pen entrance: guards are absent while the animals are loose. Sneaking past never works. Attacking → 4 BUCCANEER (9 XP).
6. **12:** "Get" the heir. This frees every slave and works even if you already have him (a bug).
7. Leave promptly.

**Other locations**
- **3:** 'That young boy will bring a good price at Zhentil Keep…' Options: Punch merchant (6 BUCCANEER); Agree / Say nothing; Rescue boy → Sneak into pen (→ 11), Attack guards, or Do not rescue now.
- **7** towers: 4 BUCCANEER (9 XP). **8** barracks: 5 waves starting with 20 BUCCANEER.
- **E** gate: 8 BUCCANEER if the base is on alert and the animals are penned.

**Alert random encounters:** (fights + 1) in 12, or in 13 while the animals are free. Wave 1: 20 BUCCANEER. Wave 2: 4 3RD LVL + 30 BUCCANEER. Wave 3: 4 3RD LVL + 40 BUCCANEER. Wave 4: as wave 5 at location 4.

**Resting:** safe at the merchants' camp. Elsewhere you are rousted. Once you hold the boy, rest is interrupted at once.

**Outcomes**
- Success: buy the boy (no money needed), free him by force, or capture the base.
- Failure: surrender, or abandon the boy by fleeing combat (you may get a warning first).

### 3.18 Zhentil Keep Outpost (ECL 28). Commission #13.

**Getting there:** i (3,32) → (7,0). E1 is the exit; **E2** climbs the wall (also to (3,32)); **E3** is the keep gate, passable only when you are being led.

**Steps**
1. You meet the Commandant, get a tour, and are taken to **3 (5,0)**: 'Here are your quarters. Do not leave this area.'
2. Relax or rest until **14:00**, when you are led to dinner at **6 (6,8)**: 'So, how's everything in Phlan?'
   - Discuss "**M**"agic → "**M**"ention Pool of Radiance → **JE 46**.
   - Discuss the "**C**"ity of "**O**"ld Phlan → 'I know a legend about a fire being called Tirantikus. I believe that Tirantikus and Tyranthraxus are one and the same.'
3. Back in your quarters: sleep **with a watch**. Without one, a THAC0 7 attack does 8d4+8 first. Then two waves (Morale 70 with a watch, 80 without): Wave 1 = 4 AIDES; Wave 2 = 5 CORPORAL + 6 AIDES.
4. Wander. The random chance is (fights + 1) in 15, each fight being (5×fights + 5) GUARD + (fights + 2) CORPORAL. The second "combat" is replaced by "There is great confusion as the guards run to their posts." After six "combats" comes the two-wave fight at location 5.
5. **5 (4,1)** (or the step-4 trigger):
   - Wave 1: DWARVEN FIGHTER (#48) [Gauntlets of Ogre Power, Long Sword +1, Chain Mail +1], 10 AIDES, 12 CORPORAL, 25 GUARD (710 XP).
   - Wave 2: COMMANDANT (#50) [Long Sword +1, Plate Mail +2, Shield +1, Ring of Fire Resistance, 3 Potion of Extra Healing, Javelin of Lightning] + AL-HYAM DAZID (#86) [Bracers AC 3, Ring of Fire Resistance, Wand of Lightning (20)] + 20 AIDES + 24 CORPORAL (2879 XP).
   - "After killing the commandant the rest of the outpost either surrenders or runs away."
6. Near the exit after dinner: 75% chance of 11 GUARD.

**Branch: leaving your quarters before dinner** → guards demand you return; bribes are refused. Attacking → 4 GUARD, then a surrender offer:
- "S"urrender → lose all money and items, placed outside, mission **not** complete.
- "A"ttack → two waves of 4 CORPORAL + 16 GUARD. You can then go back as if nothing happened, or leave (which completes the mission).

**Completion:** you were taken to your room, then left by any means other than surrender.

**Resting:** before dinner, rest eventually leads you to dinner. After dinner it triggers the next garrison encounter.

**IBM-specific note [P]:** the barracks (B) "may get attacked by guards in other versions of the game, though nothing happens in the IBM version."

### 3.19 Valhingen Graveyard (ECL 10). Special commission. [P] says do it late.

**Getting there:** c (25,26)/(26,26) → "G"raveyard → (0,4). E [location 1] is the exit to (26,26). All monsters have Morale 101.

**Scaling by Party Strength** (mostly computed on entry; you can lower it by unequipping gear before entering)

| Count | Formula | Kill score sources (each capped at 254) |
|---|---|---|
| Skeleton | PS/2 − previous skeleton score | 1 per random skeleton; 5 for spectre 15; 5 for the vampire |
| Zombie | PS/4 − score | 1 per random zombie; 5 for spectre 18; 5 for the vampire |
| Wight | PS/8 − score | 1 per random wight; 1 per wight at 20; 5 for spectre 22; 5 for the vampire |
| Spectre | — | 1 each at 15, 18, 22, 23; 5 for the vampire |

**Random encounters**
- Skeleton zone: 20%.
- Zombie zone: 20%, or 40% in search mode.
- Wight zone: 20% / 40%. Up to 4 WIGHT, plus 4×wights ZOMBIE, plus one of: 40% 2 JUJU ZOMBIE, 40% 2 GHOUL, 20% 1 MUMMY.
- "F"lee: the undead flee first if you "managed to sneak up on" them; otherwise movement vs 6 (zombies) or 12.
- "P"arley loses your surprise or starts combat.

**Resting:** unsafe until cleared; 4% per 5 minutes → PS÷1d3 GHOUL. **Fleeing:** (1,6), (1,9), (7,4), (14,6), (14,9).

**Recommended order**

*Skeleton zone*
- **3 (6,4):** "Claws rise from the soil…" → a skeleton random combat.
- **4\* (5,6):** 15 SKELETON (47 XP).
- **5\* (7,6):** GIANT SKELETON (#22) + skeletons if the count is ≥17. Search → marble chest: 12 jewelry, 10 gems, 69 gold, 28 silver, **4 Clerical Scrolls (Restoration, Restoration)** (5095 XP).
- **13\* (1,12):** 30 SKELETON (95 XP).
- **14 (1,13):** everyone saves vs poison or takes 10.
- **15 (0,15):** SPECTRE (2234 XP): 3 jewelry, 555 pp, 2000 gold. It respawns while the skeleton count is nonzero.

*Zombie zone*
- **7\* (10,15):** 25 ZOMBIE (166 XP).
- **8\* (9,15):** "A zombie with gray, leathery-hard skin…" JUJU ZOMBIE (#29) (+15 zombies if the count is ≥16). Loot: 110 gold, 290 silver, Wand of Lightning Bolt (3 charges), Potion of Healing, 2 Clerical Scrolls (Restoration, Restoration) (1020 XP).
- **16\* (5,9):** 15 ZOMBIE (100 XP).
- **18 (4,10):** SPECTRE (1516 XP): 13 gems, 542 pp, 1111 gold. Respawns while the zombie count is nonzero.

*Wight zone*
- **Do not leave the graveyard between your first wight fight and spectre 22, or 22 may never trigger (a bug).**
- **20\* (9,5):** "The air around the tower is charged with static electricity…" [Wight Count] WIGHT; "a late-game party may find 15+".
- **21 (9,6):** everyone saves vs rod/staff/wand or takes 4.
- **22 (9,7):** SPECTRE (2234 XP): 3 jewelry, 555 pp, 2000 gold.
- **12\* (15,8):** wraith: 'I am the protector of the paladin…' Stay → WRAITH (#21) (119 XP). Loot: Hammer +3, Sling of Seeking +2, Potion of Extra Healing, Clerical Scroll (Restoration ×2), MU Scroll (Slow, Hold Person, Invisibility 10' Radius) (600 XP).
- **10\* (15,6):** 'We are the spirits of those who fought the dragons. Leave us or die.' Staying → a 4-wight random combat.
- **19 (9,11):** PS÷16 (minimum 1) MUMMY; no treasure; avoid.

*Final zone (no random encounters)*
1. **23 (9,1):** 2 SPECTRE (676 XP).
2. **24\* (8,2):** "…lay weapons before the party." **Plate Mail +2, Long Sword +2** (lawful good only; anyone else equipping it takes 15), Ring of Fire Resistance, Shield +1, 4 Clerical Scrolls (Restoration ×2) (800 XP).
3. **25 (12,4):** coffin and scroll (**JE 43**). "Sanctify" (or "overturn", which does nothing).
4. **26\* (8,9)** (after spectres 22 and 23, before the vampire): LEVEL 6 MU (#24): 'Hail, noble adventurers…'
   - "L"et him join → 'The undead are controlled by a vampire who lurks in the northeast corner…' He betrays you in the next fight. Charm Person makes him truly friendly.
   - "S"end him away → he attacks (181 XP). He carries a Ring of Protection +2.
5. **29 (15,1):** walk through the north wall (requires spectres 22 and 23 beaten).
6. **28\* (14,0):** VAMPIRE (#23) + 3 WOLF (763 XP).
   - An Efreeti Bottle that was never opened releases EFREETI (#70) on your side. This does not consume the bottle, and he appears only once.
   - Equipped mirrors or a Wooden Holy Symbol of Tyr block the charming gaze.
   - The vampire flees to 25 in gaseous form. Search → 12 gems, 9000 gold, Wand of Magic Missiles (33), 3 Potion of Healing, Shield +1, **5 Clerical Scrolls (Restoration ×2)** (3133 XP).
7. **Back to 25:**
   - If you sanctified the coffin **or** never left the graveyard: VAMPIRE (#105) alone at 1/3 HP (663 XP).
   - Otherwise: VAMPIRE (#23) + 15 WOLF (941 XP).
   - The efreeti still helps if not yet used.
   - **Second defeat = cleared.** The graveyard is emptied of all remaining undead and treasure.

### 3.20 Stojanow Gate (ECL 9). Commission #14.

**Getting there:** Podal Plaza E4. E1 → Podal Plaza; E2 → Valjevo Castle SW quadrant.

**Rules**
- No random encounters unless the Valjevo alarm is active; then patrols appear north of the gate.
- Setting off the alarm **here** does nothing (a bug).
- Resting is safe anywhere unless the Valjevo alarm is active (then 17% per 5 minutes north of the gate).
- Fleeing moves you to (current X, 14).
- **Clear condition:** the bugbear patrol (15 BUGBEAR, Morale 60, 533 XP) **and** both towers' guards. Then: "You have taken the gate! You open the great portals as 20 human and demi-human guards immediately take possession of the guard towers."
- Bugbear attitude has four states: not suspicious, less suspicious, more suspicious, hostile.

**Steps**
1. **9** (daytime only, once per visit): wagon driver. Buy for **250 gold** (no haggling): 'Oh, by the way. Better beware of the guards… afraid of them ettin…' Or kill him for the wagon, with no penalty.
2. **5** (near the gate, with the wagon and live bugbears): pass roll succeeds 0% if hostile or coming from the north, 70% if more suspicious, 80% if less, 90% if not suspicious.
   - Success → 'Okay, lets have the 15 gold.' Pay → moved to **5a (8,5)**, north of the gate.
   - Don't pay → reroll; success → '…Come back when you've learned the rules.' and the bugbears turn hostile.
   - Failure → 'Hey, wait a minute. They are impostors!…' This acts as hostile, but their state does not actually change; you can "F"lee and retry.
3. **1 (4,7)** west tower: "'How much longer must we wait before assaulting Phlan. I am eager to become a baron.'" "F"lee or "A"dvance. "C"ombat or "P"arley → alarm, and your party surprise-attacks 1 5TH LVL MU (#89), 1 AIDES, 3 ETTIN (1371 XP).
4. **2 (11,7)** east tower: "'…thrown through the trapdoor to the medusa!'" Same choices → LEVEL 6 MU (#24) [Ring of Protection +2], 1 AIDES, 3 ETTIN (1521 XP).
5. **8** from the north, with both towers dead and the bugbears alive → they confront you. **"F"lee crashes the game.** Any other choice → fight; winning clears the block.

**Alternatives**
- **13:** with the bugbears dead and towers alive → combined fight with 2 LEVEL 6 MU, 2 AIDES, 6 ETTIN (3042 XP), even if one tower is already dead (a bug). Winning clears the block.
- **3** (wall), escalating by bugbear state: 'Stay away from the wall!' → 'We said stay away from the wall. That includes the tower!' → "A"ttack or "T"ake the punch (1d3) → hostile: 'Throw down your weapons!' with "F"lee / "S"urrender (lose all money and 20% of light items) / "A"ttack. With the bugbears dead and towers alive: 2 arrows (THAC0 16, 1d6).
- **4:** gate text. Visiting it reduces "more suspicious" to "less suspicious" silently.
- **7:** gate, hard to bash, cannot be picked, Knock always works. Unopened gate with towers alive → 16 rock attacks (THAC0 17, 1d6). **12:** easy from the north side.

### 3.21 Valjevo Castle outer quadrants (ECL 3/4/6)

**Alarm:** lasts 60–120 minutes. Safe spots: locations 3, 4, 10–12, 17, 23. Patrols during an alarm: 1 in 21 (1 in 3 in search mode; halved indoors). A patrol is 1 6TH LVL FIGHTER (#75) + 5 HILL GIANT, Morale 60, 3380 XP.

**Patrol parley rules**
- If you stole from the altar → they may attack at once.
- Undisguised → combat.
- Sly or Nice → combat.
- **Meek → password '**HARASH**'.**
- **Haughty or Abusive → authority '**TYRANTHRAXUS**'.**
- A wrong answer → combat.

**Resting:** safe anywhere unless the alarm is on (then 17% per 5 minutes).

**Steps**
1. **1 SW (12,13)** washerwomen: '…they must have come to kill Tyranthraxus.' They offer a disguise "regardless of attitude"; take it. Then:
   - "T"ie them up → avoids Haughty/Abusive repercussions.
   - "K"ill → 20% noise (alarm plus lost disguise). "Heroes! Hah!"
   - "L"eave → Haughty means the disguise won't work; Abusive sets off the alarm.
2. **10 SW (1,2)** Bane priest:
   - "A"ccept blessing → every non-evil character takes 2d10+2 (the last character may be hit twice more); if anyone was hurt, this counts as "L"eave.
   - "T"alk → he insists.
   - "L"eave → 'What's this? You aren't worshipers of Lord Bane! Die impostors!' Necklace fireball: everyone saves vs spell or takes 15, then everyone takes 15. Then the fight.
   - "K"ill → LEVEL 5 CLERIC (#91) + 2 1ST LVL CLERIC (#90) (450 XP). Loot: **Mace +3, Plate Mail +1, Necklace of Missiles (6)**.
3. **Do not touch 11 SW (1,0)** (altar). The offering box gives 37 silver but everyone takes 2d10+2. The crossed swords (2 Long Swords +3, lawful evil only, 5 damage to anyone else; 400 XP) cancel your disguise and make the guards hostile on sight.
4. **14 SE (15,10)** well: dive in (Constitution ≥12 needed for any chance) → **Long Sword +2 Flame Tongue** (133 XP). A second check against Con + movement, or 1d6 damage.
5. Get the gate password '**RHODIA**' (Dethek). Any of:
   - **22 NE (8,0)** search: the list with 'HARASH' in Espruar and 'RHODIA' in Dethek.
   - **21 NE (9,1)** fire giants: Parley Haughty or Sly → they show you the list. "C"ombat → 4 FIRE GIANT (5136 XP). Nice/Meek → told to get lost; Abusive → combat.
   - **24** kitchen: kill the gnoll and free the slaves → slip reading 'RHODIA'. 'Talk to the overseer' a second time → boiling oil (THAC0 10, 2d6).
   - Free Cadorna at 13 SE.
6. **E6** hedge gate. Tower guards ask for the password.
   - 'RHODIA' → free passage.
   - A wrong password is not suspicious and lets you "B"ash / "P"ick / "K"nock.
   - "Force the gate open" → boulders (12 attacks, THAC0 12, 2d6) and the alarm (your disguise survives).
   - If you ever forced the gate or stole from the altar, the guards are suspicious and act as if you had forced it.

**Other locations**
- **2** smithy (0:00–14:59): "C"ombat → surprise 1 4TH LVL FIGHTER + 3 FIRE GIANT (4018 XP). Parley: Haughty → 'get authorization'; Sly/Abusive → 'Hey, you don't belong here!' and a fight; Nice/Meek → small talk. After 15:00, or after killing them, take one of each common item.
- **3** coal store and **4** smokehouse: always safe to rest.
- **5** barracks (day): "F"lee → alarm and lost disguise. Wait/Parley → 8 HILL GIANT (5191 XP), with you at +2 or +5 if you catch them putting on armor or struggling out of bed.
- **6:** search → 11 gold (1 XP).
- **7** hill giants: pass 7b in disguise, not 7a. Haughty + 'TYRANTHRAXUS', or 'HARASH' with any other attitude. If you stole from the altar → 2 HILL GIANT and the alarm.
- **8/9** 6TH LVL FIGHTER posts (#75 carries Long Sword +1; #84 can be joined by the fire giants from 21). Passing 8a disguised → confrontation. "C"ombat → he pushes a button and a patrol comes. "F"lee → alarm and lost disguise. Meek + 'HARASH', or Haughty/Abusive + 'TYRANTHRAXUS' → you pass.
- **12 SE (10,14):** ceiling collapses (THAC0 10, 2d6); safe afterwards.
- **13 SE (14,10):** only after the #13 reward. Cadorna: 'In the name of Chantua, help me…'
  - "R"elease → he may follow you.
  - "L"eave → 'If you do I'll raise the alarm.' → 'I know how to get through the main gates.' → 'I know the way through the hedge ... left right right ...' → the alarm sounds and your disguise is lost.
  - "K"ill → recognised by the clerk only. "The sequels behave as if Porphyrys Cadorna dies here."
- **15 SE (14,3):** 5 GIANT SNAKE (216 XP), unavoidable.
- **16 NW (1,7):** sleeping fire giants (4 by day, 2 at night). Bucket trap unless spotted in search mode (THAC0 10, 1d4).
- **17 NW (1,3):** 2 HILL GIANT. Parley with any attitude → they leave you alone; safe afterwards.
- **18 NW (0,2):** search → 200 gold and a Potion of Speed.
- **23:** armory, unlimited common items, safe.
- **25** records: 50% patrol if the alarm is on; 15% scribe between 0:00 and 17:59. Findings: the Red Wizards of Thay are allied to Tyranthraxus; "…conquer all lands south of the Moonsea."
- **26** scribes (0:00–17:59): 2 ENVOY (433 XP), each with a Two-Handed Sword +2. Meek + 'HARASH' or Haughty/Abusive + 'TYRANTHRAXUS' avoids the fight. After beating them, search → proof that Cadorna is a traitor; "'Do not be fooled by outward forms for you shall know me by my flaming aura. --Tyranthraxus'"; and the Raven Clan report.
- **27 SE (12,14):** cobwebs.

### 3.22 Hedge Maze (ECL 5)

**Rules**
- Each step through a hedge: a random character saves vs poison or takes **201** damage. This is not treated as poison for Slow Poison or Neutralize Poison.
- During the alarm (outside locations 1, 2, 5): 1 in 21 (1 in 3 in search mode) → 4 GIANT SNAKE. Parley → combat.
- Resting: safe at 1, 2, 5; elsewhere 17% per 5 minutes while the alarm is on.
- **TP:** each teleporter sends you to one of the other three at random.
- **Fastest route [P]:** enter by the NW entrance and risk cutting through the eastern hedge wall at **(10,14)**.

**Locations**
- **1 NW (5,4)** Al-Hyam Dazid. Threaten him **twice** → his notes (**JE 30**). Attack → AL-HYAM DAZID (#86) (1423 XP): Bracers AC 3, Ring of Fire Resistance, Wand of Lightning (20).
- **2 SE (10,11)** giants avoiding work. If you stole from the altar, or the alarm is on and you are undisguised → immediate attack. Otherwise they ask whether frogs and toads are the same thing:
  - "A"ttack → 4 FIRE GIANT (5136 XP).
  - "Y"es → they fight you.
  - "N"o → "You lie!…" and the others say 'You better go little men.' "L"eave, or "S"tay → fight ('Can't let Herdrek have all fun.').
- **3** 3 HILL GIANT. Haughty/Abusive + 'TYRANTHRAXUS' → 'Oh, we sorry! Just doing job!…'
- **5 SE (3,1)** false Tyranthraxus:
  - "C"ombat or "W"ait → TYRANITHRAXUS [sic] (#92) + 2 6TH LVL THIEF (#93) (1701 XP). Loot: **Long Sword +5, Ring of Protection +3, Gauntlets of Ogre Power**, 1 jewelry, 8 gems. Alarm, and your disguise is lost.
  - "F"lee → alarm.
  - Haughty ('Arrogant knave…') or Sly ('Boy, this crown is heavy…') → combat without losing the disguise.
  - Nice/Meek → 'Begone…'; leaving sets off the alarm.
  - Abusive → compare PS + Charisma modifier to 85. **Less than 85** → he confesses ('I'm not Tyranthraxus. He just hired me…'); letting him go gives you his treasure. **85 or more** → same as Haughty. [P] notes the logic is backwards.
- **6 NE (10,4):** 8 TROLL (1084 XP) unless you "F"lee.

### 3.23 Inner Tower (ECL 7) and the final battle

**Rules:** no random encounters; resting is safe. **E1** → Hedge Maze; **E2** stairs up; **E3** stairs down.

**Locations**
- **4 (8,5)** trap door: opening it while the medusa lives → save vs petrification or be stoned. Jumping through → everyone takes 3d6 and lands at 5.
- **5** medusa: 1 MEDUSA (#49) (150 XP). "F"lee is possible; Parley = Combat. Mirrors protect you.
- **6 (2,6)** messenger: 1 1ST LVL THIEF (#45) (2 XP).
  - If you stole from the altar → 'Blasphemers!' and he attacks.
  - Parley Abusive → he attacks.
  - Any other parley → '…could you keep quiet? I just got back from the north…' and he is called away.
- **7 (2,5)** Genheeris:
  - If the messenger was killed, or you choose Combat, Haughty, Sly or Abusive, or you "S"tay after his order → frightened: '…If you kill him instead of me I will make you all generals!' He joins as GENHEERIS (#88) if you have room (he cannot re-memorize spells). Refusing → he attacks; 756 XP and a **Wand of Lightning (56 charges)**.
  - Nice or Meek → 'Tell Al-Hyam Dhazid to execute Phase 2 of Plan A. Dismissed.'
- **10 (4,6):** Genheeris silently leaves the party here.

**8 (3,8) Final confrontation**
1. "…An ancient bronze dragon, surrounded by a fiery aura… 'Guards, kill these pests.'"
2. Anything other than "F"lee → **12 8TH LVL FIGHTER (#85)** (8390 XP). Each carries a Two-Handed Sword +2, Plate Mail +2 and a Ring of Protection +3.
3. After the guards fall: '…If you join me I will make you the commanders of the armies that will sweep the Moonsea. I can not be defeated, you know. Will you join me?' **Each party member decides.**
   - Good and neutral NPCs always fight.
   - Genheeris has scripted logic to fight.
   - Other evil NPCs join him.
   - **If everyone joins, the game ends.**
4. Otherwise → **TYRANITHRAXUS (#66)**: 80 HP, AC −4, THAC0 5, movement 24, **85% magic resistance**, 2d10 fire aura, displaced, dragon fear aura, electric breath (length 10; 100% in round 1, then 50%; maximum 3 uses), Lawful Good (the possessed body); 611 XP.
5. Victory → the spirit leaves the dragon and threatens to possess someone. **Bane pulls Tyranthraxus into the pool.** The graphics vary for 1, 2, 3 or 4+ party members. The party "returns to New Phlan victoriously".

**Tactics [P]**
- Dust of Disappearance makes both fights much easier.
- Enlarge and Resist Fire last long enough to cast before the guards. Bless, Protection from Good, Mirror Image, Blink, Haste and Prayer can be cast after the guards by continuing combat.
- Wands are level 12 and get through his resistance. Animate Dead works on the slain fighters.

**Bug:** you can return and defeat him repeatedly, because the "defeated" flag is written to the wrong location.

---

## 4. Mechanics stated as rules [P unless tagged]

### Character creation and stats

**Starting gold:** cleric 3d6×10, fighter 5d4×10, magic-user 2d4×10, thief 2d6×10, averaged across classes for multi-class characters.

**Level 1 HP:** the minimum roll is 2/3 of the die's sides.

**"M"odify:** allowed while the character has 0 XP. [CB]: "not after he has gone up a level". Stats can be lowered below the defined minima (a bug). Class minima are enforced only when you first roll a character.

**Racial ranges and modifiers**

| Race | Strength (male / female) | Other ranges | Roll modifiers |
|---|---|---|---|
| Human | 3–18(00) / 3–18(50) | all others 3–18 | — |
| Dwarf | 8–18(99) / 8–17 | Int 3–18, Wis 3–18, Dex 3–17, Con 12–19, Cha 3–16 | Con +1, Cha −1 |
| Elf | 3–18(75) / 3–16 | Int 8–18, Wis 3–18, Dex 7–19, Con 6–18, Cha 8–18 | Dex +1, Con −1 (you can still Modify Con to 18) |
| Gnome | 6–18(50) / 6–15 | Int 7–18, Wis 3–18, Dex 3–18, Con 8–18, Cha 3–18 | — |
| Half-Elf | 3–18(90) / 3–17 | Int 4–18, Wis 3–18, Dex 6–18, Con 6–18, Cha 3–18 | — |
| Halfling | 6–17 / 6–14 | Int 6–18, Wis 3–17, Dex 8–18, Con 10–18, Cha 3–18 | Str −1, Dex +1 |

**Allowed classes**
- Human: any single class (cleric, fighter, magic-user, thief). No multi-class. Dual-class is not implemented.
- Dwarf: fighter, thief, fighter/thief. Only NPC dwarves can be clerics.
- Elf: fighter, magic-user, thief, and any combination of those three. Only NPC elves can be clerics.
- Gnome: fighter, thief, fighter/thief.
- Half-elf: cleric, fighter, magic-user, thief, plus C/F, C/MU, F/MU, F/T, MU/T, C/F/MU, F/MU/T.
- Halfling: fighter, thief, fighter/thief.
- Thieves cannot be lawful good or chaotic good. Paladins and rangers cannot be created.

**Level caps in this game:** cleric 6, fighter 8, magic-user 6, thief 9.

**Racial level limits**

| Race | Fighter (by Strength: ≤16 / 17 / 18) | Magic-user (by Int: ≤16 / 17 / 18) | Cleric |
|---|---|---|---|
| Dwarf | 7 / 8 / 9 | — | — |
| Elf | 5 / 6 / 7 | 9 / 10 / 11 | — |
| Gnome | 5 (Str ≤17) / 6 (Str 18) | — | — |
| Half-Elf | 6 / 7 / 8 | 6 / 7 / 8 | max 5 |
| Halfling | 4 / 5 / 6 | — | — |

Strength buffs can be used to get around these limits. Thieves have no racial limit.

**Racial abilities**
- Elves: 90% resistance to Sleep and Charm (the saving throw still applies); immune to ghoul paralysis; +1 to hit with short sword, long sword and bows, but not the Fine Composite Long Bow (a bug).
- Half-elves: 30% resistance to Sleep and Charm.
- Elves and half-elves: find secret doors 1 in 3 when searching, 1 in 6 otherwise.
- Dwarves, gnomes and halflings: save bonus of Con/3.5.
- Dwarves: +1 to hit orcs and goblins (fails against #2, #7 and #28).
- Gnomes: +1 to hit kobolds and goblins (fails against #2).
- Dwarves and gnomes: −4 AC against large melee foes.
- Thief skill adjustments by race (§7.7.4 table):

  | Race | Pick Pockets | Open Locks | Find/Remove Traps | Move Silently | Hide in Shadows | Hear Noise | Climb Walls | Read Languages |
  |---|---|---|---|---|---|---|---|---|
  | Dwarf | — | +10% | +15% | — | — | — | −10% | −5% |
  | Elf | +5% | −5% | — | +5% | +10% | +5% | — | — |
  | Gnome | — | +5% | +10% | +5% | +5% | +10% | −15% | — |
  | Half-Elf | +10% | — | — | — | +5% | — | — | — |
  | Halfling | +5% | +5% | +5% | +10% | +15% | +5% | −15% | −5% |

**Stat tables**
- **Strength** (to hit / damage / carrying capacity in coins): 3 = −3/−1/162; 8–11 = 0/0/512; 16 = 0/+1/862; 17 = +1/+1/1012; 18 = +1/+2/1262; 18/01-50 = +1/+3/1512; 18/51-75 = +2/+3/1762; 18/76-90 = +2/+4/2012; 18/91-99 = +2/+5/2512; 18/00 = +3/+6/3512; 19–25 up to +7/+14/15512.
  - Door bashing chances are on the same table. **Strength 19–25 cannot bash an easy door** (a bug).
  - Exceptional Strength rolls are for fighters only.
- **Wisdom** bonus cleric spells: 13–14 → +1 L1; 15–16 → +1 L2; 17 → +1 L3; 18 → +1 L4.
- **Dexterity** (reaction/missile adjustment and AC adjustment): 15 = 0/−1; 16 = +1/−2; 17 = +2/−3; 18 = +3/−4. Thief adjustments are as tabled; the game actually uses **−19%** Pick Pockets at Dex 10 and **−5%** Open Locks at Dex 16.
- **Constitution** HP bonus per level: 15 +1, 16 +2, 17 +3, 18 +4. Warriors do not get +5 at 19–20. Con 22 gives +7 (warrior) or +5 (others); Con 0 gives +8. Only 4–18 behaves correctly. Con 20 regenerates 1 HP per hour per point over 19.
- **Charisma** reaction adjustment: 3 = 0, 8–12 = 25, 13 = 30, 15 = 40, 16 = 50, 17 = 55, 18–25 = 60.
- **XP bonus:** a single-classed character with **≥16 in the prime requisite** gets +10% XP.

### Training and XP thresholds

**Training:** 1000 gold (200 platinum), class-specific, New Phlan only. You can only gain one level at a time; excess XP is cut to 1 below the next level.

**Multi-class XP** is split evenly and rounded down. Multi-class level-up HP = (die + all classes' Con modifiers) ÷ number of classes, rounded down, minimum 1.

**XP needed**

| Level | Cleric | Fighter | Magic-user | Thief |
|---|---|---|---|---|
| 2 | 1,501 | 2,001 | 2,501 | 1,251 |
| 3 | 3,001 | 4,001 | 5,001 | 2,501 |
| 4 | 6,001 | 8,001 | 10,001 | 5,001 |
| 5 | 13,001 | 18,001 | 22,501 | 10,001 |
| 6 | 27,501 | 35,001 | 40,001 | 20,001 |
| 7 | — | 70,001 | — | 42,501 |
| 8 | — | 125,001 | — | 70,001 |
| 9 | — | — | — | 110,001 |

**Hit dice:** cleric d8, fighter d10, magic-user d4, thief d6.

**Spells per day**
- Cleric L1–6: 1, 2, 2/1, 3/2, 3/3/1, 3/3/2.
- Magic-user L1–6: 1, 2, 2/1, 3/2, 4/2/1, 4/2/2.

**Other XP rules**
- A fighter gets 2 melee attacks every other round from level 7, and can sweep 0-HD foes from level 2 (PC races only).
- Characters must be "Okay" at the end of a battle to receive XP.
- A duel is worth 100 XP per hit die.
- Magic items are worth 400 XP per plus.
- Coin XP: copper 0.005, silver 0.05, electrum 0.5, gold 1, platinum 5, gem 250, jewelry 2200. This is divided by party size and rounded down.

### Combat formulas

**THAC0 by level**

| Class | Level 1–9 |
|---|---|
| Cleric | 20 20 20 18 18 18 16 16 16 |
| Warrior | 20 19 18 17 16 15 14 13 12 |
| Magic-user | 20 ×5, then 19 |
| Thief | 20 ×4, then 19 ×4, then 16 |

**THAC0 modifiers**
- Magic launcher and ammunition bonuses stack.
- Medium range +2, long range +5. Invisible target +4.
- Backstab −2.
- Bless −1; Curse +1; Prayer ±1; Cause Blindness and Bestow Curse +4.

**AC order of calculation:** 10 → armor → magic armor plus → Ring of Protection (only if no magic armor) → shield (1 + its plus) → Shield spell (sets AC 3) → Cloak of Displacement −2 → Cursed Necklace +5 → Dexterity → dwarf/gnome −4 → from behind +2 → blind +4 → Protection from Evil −2 → Stinking Cloud coughing +4.

**To hit:** d20 ≥ THAC0 − AC. A 1 always misses and a 20 always hits. Helpless targets are hit automatically and set to −5 HP. A displaced target makes the first attack of the combat miss. There are no critical hits.

**Saving throws** (paralysis/poison/death, petrification, rod/staff/wand, breath, spell)

| Class and level | P/P/D | Petrify | RSW | Breath | Spell |
|---|---|---|---|---|---|
| Cleric 1–3 | 10 | 13 | 14 | 16 | 15 |
| Cleric 4–6 | 9 | 12 | 13 | 15 | 14 |
| Fighter 0 | 16 | 17 | 18 | 20 | 19 |
| Fighter 1–2 | 14 | 15 | 16 | 17 | 17 |
| Fighter 3–4 | 13 | 14 | 15 | 16 | 16 |
| Fighter 5–6 | 11 | 12 | 13 | 13 | 14 |
| Fighter 7–8 | 10 | 11 | 12 | 12 | 13 |
| Magic-user 1–5 | 14 | 13 | 11 | 15 | 12 |
| Magic-user 6–10 | 13 | 11 | 9 | 13 | 10 |
| Thief 1–4 | 13 | 12 | 14 | 16 | 15 |
| Thief 5–8 | 12 | 11 | 12 | 15 | 13 |

A natural 1 always fails and a natural 20 always succeeds.

**Hit points and death**
- 0 HP or less = unconscious. From −1 to −9 the character loses 1 HP per round until Bandaged, cured, or the fight is won. −10 = dead.
- Fleeing a battle permanently loses any disabled characters left behind.

**Surprise:** each side rolls d6; 1–2 surprises the other. The surprised side loses 6 initiative.

**Initiative:** d6 + Dexterity modifier (minimum 1). 0 means no action. Ties are broken with d100, and monsters win remaining ties. "D"elay sets your initiative to 1.

**Spellcasting time:** (tabletop segments) ÷ 3, rounded down. One point of damage interrupts the spell.

**Morale:** monsters break when they have lost that percentage of their total HP (checked between rounds). Bless +5, Curse −5, charmed = 100. They surrender only if Intelligence ≥6. An undefined morale value reuses the previous encounter's value.

**Turning undead:** once per combat; d20 vs the table; turns 1d12 undead. "D" means destroyed; "D*" means 6+1d6 destroyed.

| Undead | Cleric level 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| Skeleton | 10 | 7 | 4 | T | T | D |
| Zombie | 13 | 10 | 7 | T | T | D |
| Ghoul | 16 | 13 | 10 | 4 | T | T |
| Wight | 20 | 19 | 16 | 10 | 7 | 4 |
| Spectre | — | — | — | — | 20 | 16 |
| Vampire | — | — | — | — | — | 20 |

Turned undead run away rather than vanishing.

**Party Strength (PS)** per character = 0.4×cleric level + 0.8×magic-user level + 0.5 per point of AC below 0 + 0.5 per point of THAC0 below 21 + 0.1×current HP, rounded down, then summed over the party. A new level 1 party is about 15; a strong late party is 120+.

**Combat arena:** 25×50 squares with a 7×7 view. Maximum 72 combatants (8 characters + 64 monsters); scripts never send more than 56 monsters. Foes always spawn in front, and any that do not fit are dropped. The round counter is an 8-bit value, so bugs can appear from round 257.

**Movement:** a diagonal step costs 1.5. Each square is 10 ft.

**Fleeing:** if no enemy is in sight, flight succeeds automatically. Otherwise it is 100% if you are faster than every enemy, 50% on a tie, and 0% if any enemy is faster. Encounter-menu "F"lee compares your slowest member to a per-monster constant, with no 50% roll.

### Spells

**Memorising:** 15 minutes per spell level, plus a base of 4 hours (spell levels 1–2) or 6 hours (3–4). Must be done while Encamped. Casting outside combat takes no time.

**Magic-users** start knowing Detect Magic, Read Magic, Shield and Sleep. They pick one new spell per level gained; scrolls can also be scribed.

**Full spell lists:** cleric levels 1, 2, 3 and 7 (Restoration, scroll only) and magic-user levels 1, 2, 3, with range, area, duration, casting time and AI priority, are in [P] §8. Key effects:
- **Sleep:** 4d4 HD-points; diameter 3 (at most 9 targets); no save. 6+ HD is never affected; 5 HD costs 10 points (monster race) or 20.
- **Hold Person:** cleric version 3 targets, saves at −1/−2; magic-user version 4 targets, saves at −1/−3. Saves are vs spell (a bug).
- **Stinking Cloud:** 2×2, range 3, failed save = helpless for 1d4+1 rounds.
- **Fireball:** (level)d6; diameter 5 outdoors, 7 indoors.
- **Lightning Bolt:** 8 squares, rebounds toward the caster.
- **Enlarge:** Strength 18 at caster level 1 up to 18(00) at level 6.
- **Haste:** ages each target 1 year.
- **Knock:** "if you have this option and you actually have the spell memorized, it always works".
- **Animate Dead:** exists only in this game.
- **Mirror Image:** does not work against physical attacks (a bug).

**Temple services (gold)**

| Service | Cost |
|---|---|
| Cure Blindness | 1000 |
| Cure Disease | 1000 |
| Cure Light Wounds | 100 |
| Cure Serious Wounds | 350 |
| Cure Critical Wounds | 600 |
| Neutralize Poison | 1000 |
| Raise Dead | 5500 (never fails, works on elves, always costs 1 Con, can lower max HP) |
| Remove Curse | 3500 |
| Stone to Flesh | 2000 |

Heal, Restoration and Resurrection are not available.

### Time and resting
- Day/night: dawn at 00:00, dusk at 14:00 (permanent equinox). Shops and City Hall are open by day only.
- One square forward = 1 minute. "L"ook = 10 minutes. Turning is free. Overland = 12 hours per square.
- Natural healing is 1 HP per 24 hours.
- The engine tracks 256 years; after that, characters age 1 year per minute.
- The game is set early in 1358 DR.

### Money, encumbrance and shops
- **Coins:** 10 cp = 1 sp; 20 sp = 1 gp; 2 ep = 1 gp; 1 pp = 5 gp. Platinum is accepted wherever gold is asked.
- **Weight:** 10 coins, gems or jewelry = 1 lb.
- **Over the carrying limit:** 1–256 extra coins → movement 9; 257–512 → 6; 513–988 → 3. Actual movement is the better of this and the armor's limit.
- **Inventory:** 16 slots per character; at most 2 magic rings.
- **Selling:** shops pay half of value; arrows and bolts sell for 5%. Sales are converted to platinum and the gold remainder is lost.
- **Identification:** 200 gold.
- **Gems** (d100): 1–25 → 10; 26–50 → 50; 51–70 → 100; 71–90 → 500; 91–99 → 1000; 100 → 5000. Sell gems and jewelry right after appraisal, or they become ordinary items that sell at half value.
- **Jewelry** (d100): 1–10 → 100–999; 11–20 → 200–1199; 21–40 → 300–1799; 41–50 → 500–2999; 51–70 → 1000–5999; 71–90 → 2000–7999; 91–100 → 2000–11999.
- **Base item prices, weights and damage:** full weapon and armor tables are in §9.2. Examples: Long Sword weighs 60 coins, worth 15, 1d8/1d12. Fine Composite Long Bow is worth 25000 and adds Strength to arrow damage. Banded Mail AC 6, movement 9. Plate Mail AC 7, movement 6. Padded armor allows movement 12 (it should be 9).
- **Random magic item generation (v1.3):** documented in full in §9.4. It is "known to work differently in v1.0".

### NPCs (hall 14)
- 0–7 NPCs are available, refreshed every time you re-enter the map.
- The clue book says they require level 2. [P] says that is false.

| Odds (of 48) | NPC | Class | Alignment | Morale | Share claimed (items*) | Share actually taken | Gear |
|---|---|---|---|---|---|---|---|
| 6 | SWORDSMAN (#36) | L3 Fighter | LE | 65 | 3 | 3 | — |
| 10 | WARRIOR (#103) | L2 Fighter | LE | 55 | 1 | 1 | — |
| 4 | ACOLYTE (#108) | L1 Cleric | NG | 50 | 1 | 1 | — |
| 5 | HERO (#109) | L4 Fighter | LE | 80 | 4* | 4 | Plate Mail +1 |
| 4 | THEURGIST (#110) | L4 Magic-User | TN | 85 | 4* | 7 | Ring of Protection +1 (the only ring whose save bonus works) |
| 6 | ROBBER (#111) | L4 Thief | CN | 70 | 3* | 7 | Leather Armor +1 |
| 5 | CURATE (#112) | L4 Cleric | LG | 75 | 3* | 7 | — |
| 8 | EVOKER (#122) | L2 Magic-User | TN | 60 | 2 | 7 | — |

- NPCs never actually take items.
- You cannot control them, take items from them unless they are down, or transfer them to later games.
- They raise Party Strength and check morale.
- Evil NPCs betray you at the end.

### Random encounters
- Area clearing counts and probabilities are given per area in §3 above (15 in the Slums, 10 at Kuto's Well, 10 at Podal Plaza, and so on).
- Generic trick: an encounter is forced by holding Up against a wall, or Down into the Moonsea on the wilderness map. A dead end with the exit behind you limits how many monsters can spawn.

### UI and files
- "A"rea map (unreliable); "S"earch toggle; Encamp → "S"ave (slots A–J).
- Loading is only possible from the main menu, or after dropping everyone at a training hall.
- Loading a save deletes any characters previously "R"emoved.
- Space = manual control; Alt-Q = auto-combat for all; "G"uard; "Q"uit forfeits the turn.
- POOL.CFG: line 1 graphics C/E/T; line 2 sound P/T/S; lines 3–4 game and save directories (drive letter and trailing backslash required); line 5 intro F/N.
- Save files: CHRDAT?#.SAV (285-byte character record), .ITM (63-byte item records), .SPC (9-byte effect records); SAVGAM?.DAT is 13,137 bytes and includes the entire current ECL script; barred-door state is not saved.
- **Copy protection:** a code wheel. The 13 six-letter words in START.EXE run from "BEWARE" to "WYVERN".
- **Cheat:** launch with "start STING" → Ctrl-C quits, Ctrl-D toggles HP debug, Alt-X wins the combat, "J" trains for free in a hall; it skips the intro and copy protection.
- **Version check:** the version is shown under "Game Created By: SSI Special Projects" on the credits screen; no version shown means v1.0.

---

## 5. Known bugs and quirks of the original (to reproduce)

### Exploits (§11)
1. **Raising the dead with damage spells.** A dead character is a valid target. A targeted damage spell doing under 10 leaves them "dying", so they can be bandaged. **Burning Hands always works**; Cause Light Wounds needs a touch roll.
2. **Duplicating items:**
   1. Go to a training hall.
   2. "R"emove one character.
   3. "S"ave.
   4. Create a dummy character.
   5. Trade the items to the dummy.
   6. "R"emove the dummy.
   7. "D"rop everyone else.
   8. "L"oad the save.
   9. "A"dd the dummy back. You now have two copies. Repeat by removing the dummy, saving, adding it back, and returning to step 5.
3. **Abnormal Constitution:** use several Manuals of Bodily Health (copies via restarts or duplication) to reach exactly Con 22, or drain to Con 0 with repeated Raise Dead. Either gives oversized HP gains.
4. **Restart with your characters:** at a training hall "R"emove everyone, "Q"uit, restart, "A"dd. You keep XP, items and money.
5. **Re-rolling hit points** at a training hall: "S"ave → train → "D"rop everyone → "L"oad.
6. **Dummy characters for gold** works but is not worth the time.
7. **Theft protection:** putting your heaviest items (body armor) at the top of the inventory sharply reduces the chance of item theft.

### Technical (§13.1)
- Real-time midnight rollover breaks timers.
- Quitting character creation part-way leaks memory.
- Names with too many DOS-invalid characters crash the game.
- Stats can be lowered below minimum.
- Strength 19–25 cannot bash easy doors.
- Constitution is defined only for 3–20 and correct only for 4–18.
- Multi-class Constitution HP bonus is wrong after level 1.
- The Con poison-save bonus also applies to paralysis and death.
- Haste and Slow show movement adjusted the wrong way on the character screen (actual movement is correct).
- No aging until 256 years.
- Racial to-hit bonuses fail against #2, #7 and #28; no elf bonus with the Fine Composite Long Bow.
- Single-target damage spells raise the dead.
- Thief skills do not update promptly.
- Removing a charm may not restore a hired NPC.
- Dispel Magic cannot check the caster level for effects that do not store it.
- The Shield spell does not stop the Wand of Magic Missiles.
- Mirror Image works only against targeted spells.
- Coin totals over 65535 gold (13107 pp) can be lost in a transaction; sale remainders are lost.
- A Bag of Holding may need several pick-up attempts.
- The Flame Tongue has no special effect.
- Keoghtum's Ointment turns poisoned characters into dead ones.
- The Manual of Bodily Health applies its HP adjustment wrongly.
- A random Sling weighs 8 lb.
- The Wands of Fireball and Lightning Bolt allow a save vs spell.
- The AHNKHEG's acid is not typed as acid.
- GENHEERIS cannot memorize spells.
- The ACOLYTE's race is "Monster" and he has 0 XP, so he can be "M"odified (array out of bounds).
- Mummy fire vulnerability is coded as "magical OR fire".
- ECL opcode 22 (PARTY SURPRISE) and 23 (SURPRISE) apply the wrong modifiers.
- ECL opcode 28 (ROB) handles the item chance incorrectly during iteration.
- ECL opcode 3B (SPELL) is a no-op.
- **Version-specific:** the heap error shows "TIME TO SAVE YOUR GAME" only in v1.2 and earlier, so v1.1 should show it.

### Scripting (§13.2 plus area notes)
- **Civilized:** you can rest at an inn while "denied"; the shop door at (9,14) works at night.
- **Slums:** rest-interrupt encounters grant clear points even when no random encounters remain; set fights credit victory even if you fled.
- **Kuto's Well:** rest interruptions arrive with the monsters surprised.
- **Podal Plaza:**
  - The rest rules are clobbered.
  - Flight is checked after victory is credited.
  - The buccaneer can be beaten and looted twice.
- **Textile House:**
  - Flight is checked after victory is credited.
  - Safe rest can still be interrupted.
  - The Ring of Feather Falling fails in the well.
  - Restal can open the box more than once.
  - The block counter is only checked when a random-encounter roll occurs.
- **Kovel Mansion:** the location-14 ambush size is miscalculated at 13–17 kills (underflow or stale pointer).
- **Wealthy Area:** only one chance at the treasure at 4; moving south from (4,15) crashes.
- **Pyramid:** can wrongly set the endgame flags.
- **Nomads:** the shaman's "Bracers AC 2" are really AC 4.
- **Lizardman Keep:** a wrong friend-word gives the location-1 fight at 3 and 10; the giant-lizard count never decreases.
- **Buccaneer Base:** you can "Get" the heir again.
- **Zhentil Keep:** dinner still happens after fighting guards; you can leave your room before dinner; Al-Hyam Dazid appears here, which he should not.
- **Valhingen:** the treasures at 12 and 24 are swapped; spectre 22 may never trigger if you leave after the first wight fight.
- **Stojanow Gate:**
  - Refusing to pay makes the bugbears outright hostile.
  - Being caught as impostors does not change their state.
  - The gate alarm is inert.
  - Tower-guard fight at 13 includes both towers.
  - **Fleeing the bugbears at 8 crashes the game.**
- **Hedge Maze:** the false Tyranthraxus Abusive check is inverted.
- **Inner Tower:** Tyranthraxus is never flagged as defeated, so he can be fought again.
- **Mendor's Library** (v1.0): commission #3 may be unresolvable.
- **Kuto's Catacombs:** Norris's hoard vanishes if not claimed promptly.
- **Valjevo Castle:** Al-Hyam Dazid is also fought at Zhentil Keep.

### Adaptational (§13.3)
- Class minimum stats are not enforced. No aging penalties or death from old age.
- No Intelligence roll to learn spells. No cleric spell failure below Wisdom 13.
- Dex 10 Pick Pockets −19% and Dex 16 Open Locks −5% are typos in the game's table.
- Losing the Dexterity AC bonus also removes Dexterity penalties.
- True-neutral clerics are allowed. Thieves may use shields. Blindness does not make enemies invisible.
- Hold Person saves vs spell. Spiritual Hammer has a flat +1.
- Animate Dead raises with full HP at any range.
- Cause Disease lasts 1d6×10 minutes.
- Raise Dead never fails and works on elves.
- Enlarge is slightly strong at caster levels 1–2. Reduce only dispels Enlarge. The Shield spell gives a fixed AC 3.
- Ray of Enfeeblement is a flat −25%. Haste and Slow do not affect initiative.
- Protection from Normal Missiles does nothing against magical missiles.
- Damage types are wrong for the bec de corbin, military fork, ranseur and trident.
- Non-random Cloaks of Displacement give no save bonus. The Cloak of Elvenkind works indoors.
- Magic armor never gives a save bonus. Rings of Protection rarely do.
- The Wand of Paralyzation saves vs paralyzation.
- Monster gear grants no effects and armor does not slow monsters.
- Scorpions count as snakes.
- Trolls stay down only if **all** damage dealt to them was fire or acid; they start regenerating 3 minutes after damage.
- Displacer beasts are not displaced and are Lawful Good.
- Driders do not penalise the save.
- Efreeti cannot cast spells.
- The mummy fear aura ignores the opponent ratio (+1 save bonus with a party of 6+).

### Other documented quirks
- Charmed enemies vanish after combat with their treasure, and killing a charmed ("blue") monster gives no XP.
- The Sleep spell's range is 3+4 per level, not 3+1.
- Elves keep their sleep and charm resistance against a duel clone's spells, but the clone does not get them.
- NPC magic-users fireballing your own party is "more likely in v1.0 than in v1.3".
- Random-item glitches produce nameless items (weapon/armor rolls 48–49, Javelin type 5, potion type 11, wand type 4). The Wand of Lightning cannot be rolled.
- Raise Dead can drive Constitution down to 0.
- Item theft comes only from tavern pickpockets, the Kobold Caves, bribes and surrenders.
- Seven [P] patches are optional fixes and should **not** be applied for a faithful port: copy protection removal, paralysis save fixes, the ECL 23 fix, the ECL 34 fix, the ECL 3B fix, the Mirror Image fix, and the random-item fixes.

---

## 6. Endgame and victory conditions; transfer to Curse of the Azure Bonds

### Victory
- **Win:** defeat the 12 guards, refuse to join, and defeat TYRANITHRAXUS (#66) at Inner Tower 8. Bane drags him into the pool.
- **Losing ending:** if every party member chooses to join, the game ends.
- **After victory:**
  - The party returns to New Phlan.
  - The clerk pays commission #15: **100 jewelry, 200 gems (45000 XP)**.
  - [CB]: "you receive the recently recovered Crown Jewels of Ancient Phlan."
  - [GB]: "over 250,000 experience points", which is consistent with 45000×6.
- **Play can continue afterwards.** Resting outside inns, forcing Braccio's office and entering closed shops may be tolerated. The proclamation after 10 quests is LIX.
- **Win from the start:** [P] says "there's nothing actually stopping you from going straight to the final confrontation right from game start."

### Transfer to Curse of the Azure Bonds (§2.8.1)
**Steps**
1. Ideally have enough XP for a level-up in Curse if you plan the paladin/ranger hack.
2. Make sure no character is under a Potion of Giant Strength. Effects that set Strength to 18(00) are fine, and the transfer **makes them permanent**.
3. "R"emove the characters at a training hall.
4. Run COPYCURS.EXE, selecting "Other" as the source and destination.
5. Start Curse and "A"dd the characters from "P"ool.
6. "R"emove them again immediately.
7. If hacking a paladin or ranger, create a brand-new one in Curse.
8. Exit Curse.
9. In a hex editor, set each *.GUY file's offset 0x10 equal to 0x11. Otherwise Enlarge fails on transferred characters.
10. For the hack: set offset 0x75 to 3 (paladin) or 4 (ranger); set 0x10B to 0; put the old fighter level at 0x10C (paladin) or 0x10D (ranger); copy the *.FX file from the new paladin or ranger under your character's name.
11. Restart Curse and "A"dd the fixed characters from "C"urse. A hacked paladin or ranger must gain a level to behave normally.

**What carries over**
- Curse-created characters start at 25,000 XP, so a transfer is worthwhile above that.
- Stats of 19+ are rounded down to **18**; Strength 19+ becomes 18, not 18(00).
- Strength 18(00) from Gauntlets or Enlarge is kept, as are Dex 19 and Con 19.
- Extra HP (from abnormal Con or the multi-class HP bug) is kept. Multi-class characters may gain no HP the first time they train in Curse.
- **No items or money carry over.** Everyone starts with 300 platinum.
- Magic-users keep their spells. Clerics lose Animate Dead.
- NPCs cannot transfer.
- The sequel treats Porphyrys Cadorna as dead.

**Hillsfar route (§2.8.2):** Pool → Hillsfar → Curse keeps high stats and avoids the Enlarge bug. Levels gained in Hillsfar give no HP.

**Other sources**
- [CB]: "Keep your party together… through the next … Curse of the Azure Bonds."
- [NES]: the NES version gives "Character Sheets" passwords at the end, which are useless because Curse never came to consoles.

---

## 7. Contradictions between sources

1. **Was v1.1 different from later versions?** [P1.10]: "All known differences between that [v1.3] and previous versions are technical". [P] v2.00: "there were some game script changes between v1.1 and v1.2". The file manifest notes "substantial differences between v1.1 and v1.2".
2. **The dosdays PDF.** You listed it as a 2014 copy of ssjlee9's guide. It is actually Doommaster1994's **NES** walkthrough, v1.0, updated Jun 13 2014.
3. **Pyramid password.** [P], [GB], [CB] (other versions) and [SP] (non-C64): 'NOKNOK'. [SP] and [CB] for **C64 v1.0**: 'NOTNOW'.
4. **Dirten.** [P]: DIRTEN (#107), Lawful Good **Human** Cleric, who leaves after the Mace battle. [CB]: "Dirtan, a 6th-level gnome cleric", who "will remain at the temple to begin the rebuilding". [SP]: "Dristan, a 6th level gnome cleric… If Dristan lives, he will remain at the Temple." [NES]: "Level 5 Cleric", human.
5. **NPC hiring and level 2.** [GB]: "You won't be able to hire henchmen until you hit level 2." [P]: "You are not required to reach level 2 before they appear, which the clue book claims." I did not find that claim in the [CB] OCR text.
6. **Ohlo's reward.** [P]: 1 jewelry, 150 platinum, 1 random magic item. [GB]: "experience, money, and 10 quarrels +1" (probably their random roll). [CB]: "rewards you with a magic item".
7. **Slums location 20 loot.** [P]: 3 random magic items. [GB]: "ranseur +2, light crossbow +1, MU scroll (lightning bolt, detect invisibility, protection from evil)" (one random outcome).
8. **Slums clear condition.** [P]: 25 points (15 random + 9 set + Ohlo). [CB]: "15 random encounters and dealt with all the set encounters". [SP]: "mapped this block completely, and have had 15 random encounters".
9. **Library rewards.** [P]: specific bounties (80/90/120/110/100 platinum; 1 gold for the first other book). [GB]: "9 books… each… around 500 total experience and 100 platinum".
10. **Manual of Bodily Health.** [P]: +1 Constitution after a month. [GB]: "doesn't seem to do anything here". [SP]: "worth 25,000 gold… we sold it".
11. **Library and Ilmater temple locks.** [P] v2.00: a thief **can never** pick them; Knock always works. [GB]: thieves "have to be higher than level 4". [SP]: "opened with bashing, picking, or knock". [CB]: "wizard-locked doors". [CB] also says Dispel Magic removes locking spells; [P] does not say this.
12. **The auction item.** [P]: a **Wand of Fear**; the "Staff of Command" is only a rumour. [GB]: "the man in plain clothes will end up with the item, a staff of command."
13. **Kuto's Well resting.** [P]: unsafe until the 10 random encounters are beaten, "contrary to what the clue book claims". [CB]: "After Norris has been defeated, you can rest in the catacombs".
14. **Clearing Kuto's Well.** [P]: no reward for clearing; the Norris reward is separate. [CB]: "the standard reward for clearing the block" after Norris. [SP]: "Defeating Norris clears the block."
15. **Opening the Cadorna box yourself.** [GB]: "you won't get a reward", though you keep the contents. [P]: you get the contents, 1943 XP, and Cadorna's anger; the #5 reward is not explicitly denied. [CB]: the clerk pays only if the box was not "obviously" opened.
16. **Order of the clerk's offers.** [GB]: after 2 quests → Cadorna, after 3 → Braccio, about a dozen → Cadorna's chambers. [P]: the first three unresolved commissions from a fixed list; #5 needs #2.
17. **Vampire-repelling holy symbol.** [P]: the Wooden Holy Symbol of **Tyr** (or a mirror); "The holy symbols of Sune and Tempus have no function." [CB]: "The wooden holy symbol of **Tempus** is a good buy because Tempus is a lawful good god and his symbol will repel vampires."
18. **Jewelry value range.** [P]: 100–11999 gold. [CB]: "75-50,000 gold pieces".
19. **Sleep immunity.** [P]: creatures of 6+ HD or level are immune; 5 HD can be affected. [CB]: "Once your heroes reach 5th level, they are immune to sleep."
20. **Sanctifying the coffin.** [P]: it matters; the vampire returns alone at 1/3 HP if sanctified or if you never left. [GB]: "this doesn't seem to do anything."
21. **Graveyard magic-user.** [P]: LEVEL 6 MU (#24) at Valhingen 26 in the DOS version. [NES]: "This NPC is an NES exclusive, as he is not in the other ports."
22. **Getting into the Temple of Bane.** [P]: automatic entry if you met a four-orc patrol non-violently; otherwise a symbol search or fight. [GB]: "The orcs always let us through, whether we had the symbols or not." [CB]: "If you don't [have the symbol], he calls the temple guards."
23. **Buccaneer pass price.** [P]: 25% of the current character's money. [GB]: "125 platinum pieces". **Price of the boy.** [P]/[GB]: 75% of money (and 10% of light items per [P]). [NES]: "35000 GP".
24. **Truce kobold (Kobold Caves location 3).** [P]: leads you to location 6. [GB]/[CB]: leads you to the wyvern ("wyvern cave").
25. **Recommended Kobold Caves entrance.** [P]: Large (avoids trap 1). [GB] and [SP]: Small. [CB]: the small cave is the kobold warren and the large leads to the wyvern lair.
26. **Kobold Caves location 26/15 treasure.** [P]: 2 random magic items. [GB]: "military fork +1 and a short sword +1".
27. **Wilderness lairs.** [P]: "always regenerates encounters and treasure any time you re-enter". [GB]: "once you've left them … they'll disappear forever."
28. **Challenging the silver dragon.** [P]: Slay → Follow → Attack → save vs breath or 11d6. [GB]: "you'll just get hit by a fireball and then have to leave". [CB]: "Do not attack him twice."
29. **When the Buccaneer Base appears.** [P]: only after you accept #12. [GB]: possibly after reading the notice on Yarash's desk, or after receiving the quest.
30. **Which pyramid level holds the slaves.** [P]: the freed lizardmen are on Level 3 (location 24). [CB]'s Lizard Men Keep page: "freed the lizard men on the **second** level", while its pyramid page puts them on Level 3 and has a separate Level-2 cell.
31. **Pyramid clear condition.** [P]: defeating Yarash clears it; you cannot leave Level 3 otherwise. [SP] and [CB]: destroying the machinery **and** defeating Yarash.
32. **Al-Hyam Dazid's notes.** [P]: threaten him twice. [GB]: "If you attack him but then decide to let him go, he'll give you his notes".
33. **Genheeris.** [P]: he leaves silently at Inner Tower 10 (4,6). [CB]: "If you don't go straight through the door into Tyranthraxus' lair, he will slip away." [GB]: "level 7 magic user… useful to have in your party for the final battle."
34. **Duels.** [P]: 100 XP per hit die, against a clone. [GB]: "100X the character level… you'll have to leave the building and then return" to duel again. These agree for player characters, since HD equals level.
35. **Nomad treasures.** [GB] lists killing the nomads as giving "bracers of AC 2" and helping as giving "about 8000 gold". [P]: the bracers are really AC 4 (a bug); 8000 gold comes from the betrayal branch, while the heroic branch gives 5000 gold plus 3000 carried by the kobolds.
36. **Fighter/cleric eligibility.** [CB]: "Only two races can add clerical abilities to your party, humans and half-elves." [P] agrees for player characters (NPC dwarves, elves and gnomes can be clerics).
37. **Wilderness coordinates.** [CB] uses per-region coordinates: Nomad Camp 12,11; Sorcerer's Island 6,16; Phlan 12,27; Kobold Caves 6,15; Lizard Keep 11,8. [P] uses global X: (25,11), (19,16), (25,27), (32,15), (37,8). They are consistent once you add **+13** (Central) or **+26** (East). The Western points match exactly: dragon (10,9), Buccaneer Base (12,31), Zhentil (3,32).

### Platform-specific statements to keep out of a DOS port ([NES] unless noted)
- NES has only gold and gems as currency.
- Arrows are infinite.
- There are no Knock-required doors.
- The party is 5 player characters + 1 NPC.
- There is no gambling, and "Bless" is renamed "Empower".
- Journal text is shown in game.
- There is a single save slot.
- The inn costs 5 GP.
- Resting asks for 24 hours or until morning (5 AM).
- There are no wilderness lairs or groves.
- Tavern gossip is a different, unnumbered list.
- A Character Sheet password is given at the end.

**C64 v1.0** uses the password 'NOTNOW' ([SP], [CB]). **IBM-only behaviour:** nothing happens at the Zhentil barracks, and Stinking Cloud "may work on undead in some non-IBM versions" ([P]).
