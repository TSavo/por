# The commission chain, section 8: New Phlan, to train, hire a theurgist and buy arms

The eighth section of the walk through the council's commissions in the clerk's order (#111, #130):
a stop in New Phlan before the next area. The party had never trained (six dwarf fighters at level 1
with 5,000 to 14,000 experience points each, 6 to 8 hit points, fighting with their fists), and
Mendor's Library needs Knock ([P] via qa/acceptance/05-mendors-library.json,
acceptance.mendors-library.open-the-locked-door-with-knock: "Knock always opens the door. A thief
never opens it."; the guide's preparation: "You can hire a THEURGIST for Knock"). Recorded on
2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-library-locked-temple/after H
qa/fixtures/walk-new-phlan-training`: everything the `leg` walk of `npm run verify:port-parity`
needs to play it again, and nothing of the original game.

- `H.json`: slot H, the save the walk loads, written at the end of section 7
  (qa/fixtures/walk-library-locked-temple): the party, whole again, at the Temple of Tyr (11,3).
  `A.json` to `G.json`, `I.json`, `J.json` and `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot G written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk.

**Money.** Out of the Temple of Tyr and in again: Yes, Pool, Share, and Appraise for every member:
each gem and jewel is valued (10 to 5000 gold pieces a gem, 626 to 1382 a jewel) and sold. Pooled,
the party holds 4507 platinum and 3 gold, about 22,500 gold pieces. Share, Exit.

**Training.** North to (11,2), west, north to (10,0), west into the training block at (9,0): "'WE
TRAIN ONLY THIEVES HERE. DO YOU WANT TO TRAIN?'" No. South, west and north to (8,0): "'WE TRAIN ONLY
FIGHTERS HERE.'" Yes, and Train Character for each of the six ("ALDA will become: a level 2
Fighter", Yes): all six are level 2 fighters, 11, 16, 16, 12, 13 and 12 hit points. BEGIN
Adventuring. (The first recording of this section stopped with the runner gone, no message, at
CORA's Yes. Its 310 commands, replayed from the same save, came to the same screen, and that Yes then
trained her. This fixture is the second recording.)

**A theurgist for Knock.** West to the duelling room (7,1): "THE ROOM IS FILLED WITH DUELING
PAIRS.", No to the duel, Yes to "'DO YOU SEEK A PARTNER FOR YOUR ADVENTURING?'": "'THERE IS NO ONE
WHO WILL GO WITH YOU.'" The list is rolled again each time the party comes back into the training
block, so the walk goes out to the street at (10,1) and back: the next lists offer acolytes,
warriors, swordsmen, heroes, evokers and robbers (No, and Yes to "'WOULD YOU LIKE TO CONSIDER
SOMEONE ELSE?'"), and the fourth "'THERE IS A FINE THEURGIST WHO WILL JOIN YOU FOR 4 SHARES.'": Yes.
Her spells in memory: Read Magic, Sleep, Sleep, Knock, Stinking Cloud.

**Arms.** South and east to the arms shop (8,11): "THE SHOP SPECIALIZES IN ARMS AND ARMOR." Yes,
Pool. For each fighter a Short Sword (8) and Plate Mail (400); on his Items screen the chain mail
off, the sword and the plate readied, the chain mail sold ("I'll give you 37 gold pieces"). The
fighters' AC is now 1 to 3. Share, Exit.

Encamp and Rest: "YOU ARE ROUSTED BY THE CITY WATCH AND TOLD TO MOVE ALONG." Go. (No hit
points changed over the hour it rested; the temple made the party whole in section 7. Whether every
member is at full hit points after training is not shown on screen.)
Encamp, Save in slot G (No to Quit to DOS), Exit. 835 commands.

Slot G, written by this walk, is the save the next section (the library) loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-new-phlan-training npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
