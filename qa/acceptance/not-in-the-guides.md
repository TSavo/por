# Things the game has that the guides omit

A first list of candidate additions to the guide. Every item is grounded in a file in this repository or in an SSI document. Nothing here comes from memory of the game.

## What was compared

The digest of the walkthroughs, `qa/research/guides-digest.md` (called "the digest" below), was compared against:

- `qa/inventory/classic.json`, groups Areas, Commissions, Content tables, Script opcodes, Menus and commands.
- `src/runtime/commission-journal.ts`.
- `src/maps/area-catalog.json`.
- The game's own screen text per script block, taken from `src/audio/voice-master-manifest.json` (`events`). Citations read "ECLn.DAX block B at 0xADDR"; the block number is the area id.
- The SSI Clue Book (GOG 1.3 PDF text layer), printed page numbers. The OCR is noisy.
- The Adventurer's Journal (GOG PDF, image only), using the facts transcribed for this work: 58 journal entries (pp.16-32), 23 tavern tales (pp.33-34), 18 proclamations (pp.13-15), appendices (pp.35-38).
- `qa/findings.json` and `qa/research/version-1.3-differences.md`.

**Manual.pdf was not read.** It has no text layer. Anything only the manual says is missing from this list.

Method for the game text: every line of screen text was checked for words that appear nowhere in the digest, and each candidate was then searched for in the digest by hand. "The digest omits" means a search of the digest found no mention. It does not mean the Lee guide itself omits it; the digest is a summary, and its author says parts of the guide's technical section were not read. Pure room descriptions with no choice or consequence are left out.

Quotes are short and keep the game's spelling.

---

## New Phlan (area 0, ECL3.DAX block 0)

1. **The gambling game has a third result, blue.** Text at 0xa45b: "IF A BLUE SIDE COMES UP, YOU GET YOUR MONEY BACK", and at 0xa5d5: "IT'S BLUE. YOU WIN." The digest gives only "30% red (lose the wager), 20% green". The remaining 50% is unexplained there.
2. **House limit of 1000 platinum.** 0xa532: "HOW MANY PLATINUM PIECES WILL YOU WAGER? (HOUSE LIMIT IS 1000)". The game also shows the character's platinum first (0xa51a, "YOU HAVE ... PP."). Digest: no limit, no currency stated.
3. **Two gambling refusals.** 0xa647: "NO ONE IS WILLING TO GAMBLE WITH SOMEONE WHO LOOKS THAT BAD." 0xa67b: "I CAN'T ACCEPT THAT WAGER." The digest has neither; the condition for the first is not established.
4. **The tavern asks to go again.** 0xa60d: "WILL YOU GO AGAIN?" follows a spin. Digest: not mentioned.
5. **"Priestess Joy of Sune".** 0xa0d0: "YOU ARE WELCOMED BY PRIESTESS JOY OF SUNE." The digest lists the Sune temple with no name. Tyr's greeting is "THE PRIESTS OF TYR WELCOME YOU TO THE TEMPLE." (0xa078) and Tempus's is "THE PRIESTS OF TEMPUS BID YOU WELCOME." (0xa9ef).
6. **The aged priest who takes the mad man.** 0xaf9b: "THE MAD MAN SUDDENLY BEGINS TO SCREAM AND ATTACK EVERYONE WITHIN ARM'S REACH." 0xafe0: "AN AGED PRIEST APPROACHES ... 'DROP HIM FROM YOUR PARTY OR HE WILL BRING YOU TO GRIEF. WE WILL CARE FOR HIM.'" The digest says only that the MAD MAN "causes trouble in town" and is a city-guard trigger. The priest is not in it.
7. **The city watch takes Cadorna's treasure at the gate.** 0xab27: "THE CITY WATCH STOPS YOU AND REMOVES CADORNA'S TREASURE FROM YOUR KEEPING. THEY TELL YOU YOUR REWARD WAITS WITH THE CITY CLERK." `src/runtime/commission-journal.ts` uses this line as an alternate trigger for commission "textile". The digest describes returning the treasure but not this hand-over.
8. **Gate text.** 0xaad5: "YOU ARE BY THE GATEWAY TO THE UNSETTLED AREAS. THE CITY WATCH EYES YOU SUSPICIOUSLY." Not in the digest.
9. **Inn refusals.** 0xa1cc: "THAT PERSON WON'T PAY." 0xa20d: "YOU DON'T HAVE ENOUGH PLATINUM." The digest gives the price (1 platinum) but not what happens when the payer cannot or will not pay.
10. **Harbor master's wording.** 0x9c67: "'ROUND TRIP PASSAGE IS 1 PLATINUM PIECE.'" The digest says "each trip costs 1 platinum". Before Sokal Keep is cleared (0x9d54): "'BY ORDER OF THE CITY COUNCIL,' ... 'THE ONLY BOAT OUT IS GOING TO SOKAL KEEP.'"
11. **Dirten is "priest of Ilmar", and there is a second visit.** 0x9eba: "ALLOW ME TO INTRODUCE DIRTEN, PRIEST OF ILMAR." 0x9fb8: "YOU ARE USHERED INTO THE STUDY WHERE DIRTEN WAITS. 'I AM ABOUT TO JOURNEY TO THE TEMPLE, WILL YOU COME WITH ME?'" and 0xa014: "'WILL YOU ACCOMPANY DIRTEN?'" The digest names Dirten but not his god, and does not describe refusing him and coming back. Braccio also states the payment: "YOU MAY KEEP THE HIDDEN TREASURES."
12. **Forcing the bishop's door is a menu.** 0x9e2e: "THE TEMPLE GUARDS INFORM YOU THAT THE BISHOP IS NOT RECEIVING VISITORS AT THIS TIME." with choices LEAVE / FORCE YOUR WAY PAST. The digest lists forcing the door as a guard trigger but not the prompt.
13. **Full party message.** 0xaeb0: "'YOUR PARTY IS TOO LARGE TO JOIN AT THIS TIME. RETURN WHEN IT IS SMALLER.'" (also in block 11 at 0xa0d5). Not in the digest.
14. **Rolf's tour, stop by stop.** 0xb0b6 to 0xb51c: Temple of Tyr, the passenger dock, the training schools, City Hall, Sune's temple and "AN ENTRANCE TO THE CITY PARK", the gate, then "(YOU ARE ON YOUR OWN NOW)". The digest says only that Rolf gives a tour ending at (0,4). A city park is mentioned nowhere in the digest.
15. **The opening proclamation line.** 0xac9b: "PROCLAMATIONS LXIV, LXXVIII, CIX, AND LIX." and 0xac22: "IN YOUR JOURNAL YOU NOTE" followed by "PROCLAMATION" and a number. The digest's table matches this for 0 quests.

## City Hall (area 8, ECL3.DAX block 8)

`src/maps/area-catalog.json` lists area 8 "Phlan City Hall" as its own script with no map of its own (region "interior", exit to area 0). The digest folds it into New Phlan as "ECL scripts 0/8/11" and treats its rooms as New Phlan locations 26-34.

16. **"Back so soon?"** 0xa80f: "'BACK SO SOON? I CAN ONLY REPEAT THE EARLIER OFFERS: '". The clerk has a separate line for a repeat visit. Also 0xaf4b: "'THESE ARE ALL OF THE COMMISSIONS CURRENTLY AVAILABLE.'" Neither is in the digest.
17. **A separate line per book handed in.** 0xa06d "WE FIND THESE DISCOURSES VALUABLE."; 0xa08b "THE COUNCIL WILL BE AMUSED BY THE DESCRIPTIONS."; 0xa0b3 "THESE MAPS SHOULD HELP US TO LOCATE SEVERAL LEGENDARY BUILDINGS."; 0xa0e7 "THESE HISTORIES CONTAIN MUCH USEFUL INFORMATION."; 0xa10f "THE RECORDS PROVIDE INSIGHTS INTO MUCH THAT WAS PUZZLING."; 0xa13e "THIS MATERIAL IS OF SMALL VALUE." The digest gives the five bounties and "1 gold for the first other book" but none of the lines, so it does not say which line goes with which book.
18. **The clerk checks rewards before offers.** 0x9bb8: "'BEFORE I CAN OFFER ANY COMMISSIONS, I MUST SEE IF YOU ARE DUE A CURRENT REWARD.'" and for the graveyard 0x9cc7: "'WE HAVE BEEN INFORMED YOU HAVE ELIMINATED SOME UNDEAD FROM THE GRAVEYARD.'" The digest gives the kill-score payouts without the order of business.
19. **The Cadorna bounty and its report.** 0xa520: "PORPHYRYS CADORNA IS A TRAITOR TO THE CITY. IF YOU FIND HIM, KILL HIM.'" 0xa55e: "THE COUNCIL HAS NOTED THE PASSING OF THE TRAITOR CADORNA.'" `src/runtime/commission-journal.ts` has a commission "cadorna" ("Find the fugitive Cadorna") with these as offer and report; `qa/inventory/classic.json` lists `classic.commission.cadorna`; `qa/findings.json` (commissions-never-asserted) names it. The digest says only that a bounty is "mentioned but none is actually paid" and never gives the report line or says where Cadorna's fate is decided.
20. **A different Zhentil offer once Cadorna is known to be a traitor.** 0xada6: "BE CAREFUL, THE TRAITOR CADORNA MAY HAVE TAMPERED WITH THE MESSAGE PACKET BEFORE HE FLED." And the Urslingen summons at 0xae3b: "GO THROUGH THE SOUTH DOOR OF THE TRAITOR CADORNA'S OLD QUARTERS." The digest says the mission is "given directly" in that case but has neither text.
21. **The Podal Plaza clearing line.** 0x9ffd: "YOU HAVE CLEARED THE AREA NEXT TO THE EVIL TEMPLE." The other clearing rewards use "'THERE IS A REWARD FOR CLEARING THE ..." (0x9e4a). The digest lists the rewards without text.
22. **Council guard wording.** 0xb3e1: "'HALT. YOUR PRESENCE IS NOT AUTHORIZED. LEAVE.' DO YOU LEAVE?"; 0xb496: "THE REMAINING GUARDS DECIDE TO LEAVE YOU ALONE."; 0xb4c7: "THE GUARD CAPTAIN STEPS FORWARD. 'PLEASE LET US SHOW YOU THE WAY.'" The digest has the guard fight but not that surviving guards stand down, nor the escort to the council chamber.
23. **Two graveyard notices.** 0xa62a ("THE UNDEAD ARE CROSSING THE RIVER IN HORDES ...") and 0xa6ac ("UNDEAD FROM THE GRAVEYARD HAVE GROWN MORE DANGEROUS ..."). The digest gives the Party Strength thresholds (19 and 37) but not which text goes with which.
24. **Spellings on screen.** "STOJONOW RIVER" (0xa20b), "ZHENTIAL KEEP" (0xb0ea), "PODOL PLAZA" in Cadorna's speech (0xafec) and "PODAL PLAZA" in the clerk's lines. The digest normalises all three.

## Training Hall (area 11, ECL3.DAX block 11)

`src/maps/area-catalog.json` lists area 11 "The Training Hall" as its own mapless script. The digest gives four hall coordinates and "Hall 14" and nothing about the inside.

25. **Notices and signs.** 0x9a74: "NOTICES FOR TEACHERS AND STUDENTS ARE POSTED ON THE WALLS. A NOTE DIRECTS MAGIC USERS AND CLERICS TO GO NORTH AND FIGHTERS AND 'ROGUES' TO GO EAST." 0x9af8: magic users east door, clerics west door. 0x9f66 / 0x9fe5: signs reading 'FIGHTERS' and 'ROGUES'. Not in the digest. The game calls thieves "rogues" here.
26. **Trainer's line.** 0xa00e: "'WE TRAIN ONLY ... HERE. DO YOU WANT TO TRAIN?'" Not in the digest.
27. **Arena master.** 0x9bbe: "THE ROOM IS FILLED WITH DUELING PAIRS."; 0x9c05: "'THE DUELS ARE EVENLY MATCHED AND NORMALLY NOT TO THE DEATH. DO YOU DUEL?'"; 0x9c8b: "I CANNOT ARRANGE SUCH A DUEL." The digest has the duel rule but none of the text and no case where a duel is refused.
28. **Hiring dialogue.** 0x9cba: "'DO YOU SEEK A PARTNER FOR YOUR ADVENTURING?'"; 0x9eab: "'THERE IS A FINE ... WHO WILL JOIN YOU FOR ... . IS THIS ACCEPTABLE?'", 0x9f23: "'WOULD YOU LIKE TO CONSIDER SOMEONE ELSE?'"; 0x9d61: "'THERE IS NO ONE WHO WILL GO WITH YOU.'" The digest has the table of NPCs but not the flow of one candidate at a time.
29. **The city watch can roust you here too.** 0x99c2: "YOU ARE ROUSTED BY THE CITY WATCH AND TOLD TO MOVE ALONG." with choices GO / FIGHT (block 0 has GO / STAY). The digest's list of guard triggers does not mention the training hall.

## Slums and Kuto's Well

30. **Ohlo's errand is a potion in the game's words.** ECL2.DAX block 20 at 0xa12f: "I ORDERED A SPECIAL POTION"; 0xa323: "THE MAN TAKES THE POTION AND GULPS IT GREEDILY. AS YOU WATCH, HE SEEMS TO GROW YOUNGER AND STRONGER." `src/runtime/commission-journal.ts` has it as commission "ohlo" ("Fetch Ohlo's potion"). The digest calls it "a package (not an inventory item)" and has no account of what Ohlo does with it. The Clue Book (p.6) says "a potion".
31. **Norris's hideout line.** ECL8.DAX block 29 at 0x9eb2: "YOU HAVE ALSO TAKEN POSSESSION OF A HIDEOUT IN WHICH YOU MAY REST UNDISTURBED". The digest reports [P] saying rest is still unsafe, against the Clue Book, but does not note that the game's own text promises safe rest.

## Kovel Mansion (area 14, ECL3.DAX block 14)

32. **The thief who claims to be guild master.** 0xadd4: "'I AM THE GUILD MASTER. IF YOU RELEASE ME, MY THIEVES WILL NO LONGER ATTACK YOU!'" with ATTACK / RELEASE, and on release 0xae7a: "HE SAYS, 'SUCKERS', THEN SPRINTS AWAY." The digest says the thief at C2 is "handled like a B" and has neither the claim nor the reply.

## Cadorna Textile House (area 2, ECL4.DAX block 2)

33. **Skullcrusher's graffiti.** 0x9e8c: "'SKULLCRUSHER WAS HERE' IS CARVED INTO THE NORTH WALL."; 0x9ec4: "SKULLCRUSHER PROUDLY POINTS OUT HIS HANDIWORK."; 0x9f6a: a dead hobgoblin with the same message in blood; 0x9fca: "SKULLCRUSHER LAUGHS AND CRACKS HIS KNUCKLES." The text changes when he is in the party. Not in the digest.

## Valhingen Graveyard (area 10, ECL4.DAX block 10)

34. **"The mystic man".** 0xb3eb: "THE MYSTIC MAN SPEAKS, 'THE VAMPIRE IS BEHIND THE NORTHERN WALL.'" The digest quotes the LEVEL 6 MU as saying the vampire "lurks in the northeast corner" and never uses this line or the name "mystic man". 0xae8d: "YOUR PARTY IS TOO LARGE FOR ME TO JOIN." is also absent.

## West wilderness (area 25, ECL6.DAX block 25)

35. **The slaver caravan.** 0x9d49: "A SMALL CARAVAN OF SLAVERS RIDE BY YOU TOWARD THE BUCCANEER BASE." Followed in the script by 0x9e27: "A GROUP OF ARMED GUARDS RIDE BY." Neither is in the digest. The Clue Book (p.21) lists buccaneers and Zhentarim patrols among west-map encounters; the digest's table has CORPORAL and 1ST LVL THIEF instead.
36. **The Zhentil riders' question.** 0x9e7d: "THEIR LEADER SAYS, 'ARE YOU THE DIPLOMATIC ENVOYS FROM NEW PHLAN?'" with YES / NO. NO gives 0x9f02: "'YOU ARE TRESSPASSING ON PRIVATE LAND. I ADVISE YOU TO LEAVE.'"; YES gives 0x9f7a: "THE RIDERS ESCORT YOU INTO THE OUTPOST." Without the mission, 0x9fb6: "LEAVE NOW OR FACE THE CONSQUENCES!" with STAY / LEAVE. The digest says only "entry only with the diplomatic mission. Otherwise guards tell you to leave". The player's own YES/NO answer is not in it.
37. **Buccaneer Base arrival prompt.** 0x9da5: "A BAND OF BUCCANEERS RIDE OUT TO ESCORT YOU IN. WHAT WILL YOU DO?" with ENTER / LEAVE. The digest goes straight to being led to the merchants' camp.

## Cave of Diogenes (area 19, ECL6.DAX block 19)

`src/maps/area-catalog.json` lists area 19 "Cave of Diogenes" as its own mapless script reached from area 25. The digest treats it as wilderness point k and mentions the name Diogenes once.

38. **The dragon's speech after the bottle is recovered.** 0xa3c7: "'I SEE YOU HAVE RECOVERED THE SILVER BOTTLE FROM THE KOBOLD CAVES. I CONGRADULATE YOU.'"; 0xa44c: "'THAT BOTTLE CONTAINS A POWERFUL EFREET WHO WAS SUMMONED TO KILL VAMPIRES. ... IN VALHINGEN GRAVEYARD THERE IS A VAMPIRE.'"; 0xa4cc: "'WHEN YOU MEET THE VAMPIRE USE THE BOTTLE ...'". `src/runtime/commission-journal.ts` carries two commissions built on this, "bottle" and "bottle-vampire"; `qa/inventory/classic.json` lists both. The digest stops at "come back for another quest" and never describes the return visit.
39. **Each approach has its own speech.** Pledge (0x9b70: "'I ACCEPT YOUR PLEDGE. FOR YOUR FIRST DUTY, I COMMAND YOU ...'"), advice (0xa145, 0xa1e5), apology (0x9da0, 0x9e28) and gift (0xa2f6: "'YOU HAVE NOTHING THAT INTRESTS ME. IF YOU WISH TO APEASE ME THEN GO EAST AND DESTROY THE KOBOLD COMMUNITY THERE.'"). The digest says all of them lead to the same request for the bottle. The gift branch asks for the kobolds to be destroyed, not only for the bottle.
40. **The magic mouth.** 0x999c: "A MAGIC MOUTH APPEARS ON ONE OF THE WALLS. ... 'WHO ENTERS THE HOME OF DIOGENES?'" The digest has "Diogenes asks you to 'S'tate name and intent"; the mouth is not mentioned.
41. **The dragon's own explanation, and the empty cave.** 0x9d07: "'I AM A GOOD SILVER DRAGON NOT THE EVIL LEADER OF PHLAN.'" 0x992c: "YOU ENTER THE ENORMOUS CAVE, SEARCH IT AND FIND NOTHING OF INTREST. YOU THEN LEAVE." The digest does not say when the cave is empty.
42. **The attack text disagrees with the digest's mechanics.** 0xa046: "YOU TRY TO ATTACK THE DRAGON BUT SEEM TO BE FROZEN IN TIME. THE DRAGON THROWS A FIREBALL IN THE MIDDLE OF THE PARTY AND THEN DISAPPEARS." The digest ([P]): "save vs breath or 11d6". Digest §7 item 28 records the disagreement between guides but not the game's own wording.

## Zhentil Keep Outpost (area 28, ECL6.DAX block 28)

43. **More dinner topics than the two the digest lists.** Politics: 0xaf12 "'I'VE HEARD THAT PHLAN'S TOWN COUNCIL IS CORRUPT, SPECIFICALLY ULRICH EBERHARD. IS THIS TRUE?'" with replies at 0xafa5 and 0xb012. The real power in Phlan: 0xabdb "'PHLAN MUST BE A CITY OF FOOLS IF A BISHOP OF TYR HAS POWER!'". The city's forces, three answers: 0xb06a (strong), 0xb0e6 (capable), 0xb178 (weak). Magic: 0xb240 "YOU MAKE UP STORIES ABOUT WONDERFUL MAGICAL ITEMS AND PLACES." The digest gives only Magic → Pool of Radiance → entry 46 and City → Old Phlan → the Tirantikus legend.
44. **The dinner can end badly.** 0xa93b: "THE CONVERSATION COMPLETELY DIES ... THE COMMANDANT EXCUSES HIMSELF AND LEAVES." and 0xb37a: "THE CONVERSATION GOES STALE". The digest does not say what ends the dinner.
45. **The tour has lines.** 0x9d55: "'... ONE OF OUR FINE WATCH TOWERS ...'"; 0x9da7: "'THIS WALL HAS SURVIVED MANY ATTACKS, INCLUDING ONE FROM A DRAGON.'" The digest says "get a tour". `tools/verify-fresh-party.mjs` already has a "three Zhentil tour discoveries" milestone.

## East wilderness (area 27, ECL8.DAX block 27)

46. **Halfling remains.** 0xa341: "LYING HERE ARE THE PARTIALLY EATEN REMAINS OF A HALFING." No matching entry in the digest. Where it is shown (a lair or the map) is not established from the text file alone.

---

## General

### Commissions the game tracks that the digest does not treat as quests

47. `src/runtime/commission-journal.ts` and `qa/inventory/classic.json` list 20 commissions. Three have no numbered entry in the digest's clerk list: **"cadorna"** (item 19 above), **"bottle"** and **"bottle-vampire"** (item 38). "ohlo" is in the digest as a Slums side quest. Note that this file is the port's own journal built from the original dialogue, so the three are evidence of dialogue the digest under-describes, not of a quest list inside the original program.

### Areas

48. `src/maps/area-catalog.json` has 29 areas and says script id **12 is missing** (`missingScriptIds: [12]`). The digest never mentions that the numbering has a hole.
49. Three areas have **no map of their own**: 8 City Hall, 11 Training Hall, 19 Cave of Diogenes. The digest does not separate them.
50. Three areas have **two maps**: Lizardman Keep (maps 16 and 30), Temple of Bane (24 and 31), Kuto's Well (29 and 32). The digest splits ECL 24 into two sections, "Wealthy Area" and "Temple of Bane", and ECL 29 into "Kuto's Well" and its catacombs; the catalog has one area named "Temple of Bane" and no area named Wealthy Area. The digest does not say the Lizardman Keep has a second map.
51. The Valjevo Castle areas 3 to 7 are named only "probable" in the catalog (`nameConfidence`). The digest's assignment (ECL 3/4/6 outer quadrants, 5 Hedge Maze, 7 Inner Tower) is not confirmed by that file.

### Proclamations (Adventurer's Journal pp.13-15)

52. The Journal prints 18 proclamations. Five never appear in the digest's table: **CXX** (pirates' stronghold in the Twilight Marsh), **CLVI** (rescue the Duchess of Melvaunt from ogres), **CLXX** (insect men west of New Phlan), **CXC** (hobgoblins gathering), **CCXIV** (nomads). The digest's table lists LIX and CXIV twice (0 and 10 quests; 5 and 9 quests). Whether the game ever posts the five, or whether two of the digest's rows are wrong, has to be read from block 0's proclamation table.
53. The digest gives proclamation numbers only. What each says is in the Journal: LIX clear any block; LXIV and LXXVIII Valhingen Graveyard; CI Sokal Keep; CIX rescue force for Taimalg-the-Invincible; CX special commission of "political sensitivity"; CXIV heir of House Bivant; CXXVI books and tomes; CXXIX Stojanow river poisoning; CXXXIV Kovel mansion thieves; CLIV bounty per undead; CCI lizard men; CCIV kobolds.

### Journal entries (Adventurer's Journal pp.16-32)

54. The Journal has 58 entries and warns that some are false. The digest cites 36. **22 are never cited**: 1 (Yarash's magic-mouth bounty for giant insects, p.16), 2 (kobold treasure whisper, p.16), 4 (cloth map with Sorcerer's Isle, p.17), 5 (treasure under Kuto's Well, lever and trap, p.17), 6 ("Show the Boss's Seal to the thri-kreen guards", p.17), 9 (rumours: Joran Alberach, Zhentil envoy, p.18), 12 (message over the pool, p.19), 13 (note signed Porphyrys Cadorna, p.19), 15 (clean maze map, p.19), 17 (note seeking allies for "my island", p.20), 18 (orders to hold Sokal Keep, p.20), 22 (cloth map, p.21), 24 ("Cursed is the child Porphyrys", p.21), 32 (Bane announcement ejecting Mace, p.23), 34 ("you are my prisoners" speech, p.24), 36 (note 4: the Boss is really Maram of the Great Spear, p.24), 39 (parchment signed Sorrassar, p.27), 44 (trader's letter about a castle in a swamp, p.28), 45 (thri-kreen speech, p.29), 52 (nomad witchdoctor's cry, p.31), 54 (diary page about a stolen map, p.31), 58 (map "4 days" to Phlan, p.32). The guide does not say which of these the game never refers to (the false ones) and which it does.
55. `qa/inventory/classic.json` (`classic.content.journal-entries`) counts **26** entry numbers referenced by the scripts; the digest cites 36. The two counts have not been reconciled.
56. Two digest descriptions do not match the Journal: entry 40 is called a "trapper note" (the Journal's 40 says kobolds and hobgoblins are poor breeding material), and "You have defeated the dreaded bandit gang..." is printed beside entry 50 (the Journal's 50 is the Boss's orders to Norris and his reply; the quoted line is screen text, ECL8.DAX block 29 at 0x9e54).

### Tavern tales (Adventurer's Journal pp.33-34)

57. The digest says no source reproduces the tales. The Journal prints all 23. Subjects: 1 wizard's castle ruins in a swamp to the northeast; 2 drunk bard; 3 wells lead to hidden dens and passages; 4 anglish lord; 5 castle of gold east of Phlan; 6 wizard in black; 7 treasures on the banks of the Barren River; 8 the graveyard is controlled by a powerful undead; 9 patron with a manuscript dated 1977 GUE; 10 insect-men to the west who give gifts; 11 evil dragons in the Dragonspine Mountains; 12 "a man called turtle"; 13 master thief training ground under the old city; 14 ogres to the east holding a princess; 15 Zhentil trading base far to the west; 16 buccaneer slave auction near Stormy Bay; 17 sage and dark wizard; 18 marauding nomads east of Phlan with an artifact; 19 wild dwarves; 20 "rabbits, hats, bowling balls"; 21 the monsters' general made himself immortal; 22 kobold fortress at the western tip of the great swamp; 23 silver dragon who helps travellers.
58. `qa/inventory/classic.json` records tales "1 to 24" for the earlier build; `qa/findings.json` (classic-tavern-tale-24) says 1.3 draws 1 to 23. The digest gives 23 and does not mention the earlier build's 24th number.

### Rules in the SSI documents that the digest's mechanics section lacks

59. **Backstab damage multipliers.** Clue Book p.59: thieves of level 1-4 double, 5-8 triple, 9+ quadruple. The digest has only "Backstab −2" to hit.
60. **Mixed-class thieves and armor.** Clue Book p.56: a mixed-class character must not wear armor heavier than leather to use thief abilities, and must unready heavy armor before a backstab or picking a lock. Not in the digest.
61. **Quick combat keys.** Clue Book p.55: 'Q' during any character's turn puts everyone in quick combat; 'M' toggles "Magic On" / "Magic Off"; Speed can be set to 0; characters with readied arrows stand and fire. The digest has Alt-Q and Space only.
62. **Level drain and Restoration.** Clue Book p.54-55: a drained character's XP falls to the minimum for the new level; a Restoration scroll restores one level and sets XP to that level's minimum. The digest's mechanics section has no drain rule (it mentions drain only per monster).
63. **Commissions need not be accepted.** Clue Book p.54: completing a mission before hearing of it still earns the reward. The digest says the same in §3 but lists exceptions (#4, #12 "must be offered") that the Clue Book does not.
64. **Strength spell.** Clue Book p.62: adds 1-8 points by class; each point over 18 adds 10% exceptional strength. Not in the digest's spell notes.
65. **Bless area and Protection from Evil.** Clue Book p.62: Bless affects heroes in a 5x5 area not adjacent to an enemy; Protection from Evil improves AC and saves by 2 against evil attackers. The digest has only the to-hit and AC numbers.
66. **Phase spiders.** Clue Book p.58: they cannot be affected by any attack until just as they move. Not in the digest.
67. **Turning minimums for wraith and mummy.** Journal appendix (p.35-36): wraith from 3rd level, mummy from 4th. The digest's turning table has no wraith or mummy row.
68. **The block coordinate display.** Clue Book p.54: X and Y are shown under the party list "unless the player is lost, or it is impossible to find one's way"; 0,0 is the north-west corner. The digest uses coordinates throughout without saying where the game shows them or when it does not.
69. **The wheel is used inside the game.** Clue Book p.56-57: besides the start-up password, the translation wheel decodes Espruar and Dethek runes shown on screen (the dead elf's scroll at Sokal Keep is its example). The digest covers the start-up check and individual passwords but does not state the general rule.

### Program features in the inventory with no digest coverage

All from `qa/inventory/classic.json`.

70. **Combat icon editor** (`classic.menu.icon-editor`: Parts, colours, Size, Head, Weapon, Body, Shield, Arm, Leg). The word "icon" does not occur in the digest.
71. **Camp Alter menu** (`classic.menu.camp-alter`: Order, Drop, Speed, Icon, Pics). Not in the digest.
72. **Item commands Halve and Join** (`classic.menu.items`), and the treasure commands Take, Pool, Share and Detect (`classic.menu.treasure`). Not in the digest.
73. **Ctrl-S sound toggle** (`classic.menu.ctrl-keys`; `qa/findings.json` input-original-control-keys-dropped). The digest lists Ctrl-C and Ctrl-D under STING only and never mentions Ctrl-S.
74. **Scripted menus.** 125 distinct horizontal menus and 14 vertical menus (`classic.menu.scripted-horizontal`, `-vertical`). The digest quotes choices area by area but gives no complete list.
75. **Script opcodes.** 61 opcodes are inventoried with use counts. The digest names five (22, 23, 28, 34, 3B) and only as bugs. It says the guide's opcode reference was not read in full.
76. **Content tables.** 172 monster records with 103 distinct names; 128 item types; 56 spells; 9 character statuses and 7 coin types; 20 sound events; 38 wall sets and 45 tile sets. The digest has no monster list, no item list, no status list and nothing on sound or wall sets. Its spell lists are by reference to the guide's §8.
77. **Seven races and eight classes in the program's strings** (`classic.menu.creation-race`, `-class`: "7 races", "8 classes and 9 multiclasses"). The digest describes six playable races and four classes and says paladins and rangers cannot be created. Which strings account for the difference was not checked.
