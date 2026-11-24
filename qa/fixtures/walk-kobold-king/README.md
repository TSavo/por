# The commission chain, section 5: the Kobold Caves and the king's fall

The fifth section of the walk through the council's commissions in the clerk's order (#111, #130).
Recorded on 2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-kovel-and-nomads/after J qa/fixtures/walk-kobold-king`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `J.json`: slot J, the save the walk loads, written at the end of section 4
  (qa/fixtures/walk-kovel-and-nomads): the party on the wilderness map at the nomad camp (25,11), with
  Kovel (#7) and the nomads (#8) due at the clerk. `A.json` to `I.json` and `roster.json` are the
  other saves on that disk.
- `after/`: the saves as the walk left them, with slot I written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

**To the caves.** Encamp and rest six days: "YOU SURPRISE A GROUP OF STIRGES" breaks it (Combat,
won, 7 experience each); three more days: "YOU SPOT A GROUP OF DRIDERS" (won, 324 each, the treasure
left). FENN is back to 8 hit points. East to (32,11) and south; a fight at (32,14) (won, 47 each);
at (32,15) "YOU SEE A SMALL GROUP OF KOBOLDS ENTERING A SMALL, CONCEALED CAVE": Large, No to "DO YOU
WANT TO LEAVE?", north to (10,14), east to (14,14) and north to (14,9). West of it, (13,9): "THERE
IS A STEEP RUBBLED SLOPE. WILL YOU GO UP?" No, twice: the large cave's squares reach the rest of the
caves only over that slope (GEO8.DAX block 13). Back to (10,15), Yes, and the Small cave at (6,15),
No. The locked door north bashed; (6,13): "FENN FALLS INTO A POOL OF WATER", "SOME ITEMS WERE LOST
RECOVERING FENN".

**The white flag and the wyvern.** North to (6,12), east; at (8,12) "A KOBOLD APPROACHES WAVING A
WHITE FLAG ... WE WILL PAY FOR A TRUCE": Agree, "I AM TO ESCORT YOU TO OUR TREASURE": Follow (Refuse
and Kill it bring the roof down on the party, 2d6 each: ECL8.DAX block 13 at 9ce1). "THE KOBOLD
PAUSES, IDLY TAPS THE WALL", "A BOULDER BLOCKS OFF THE PASSAGE ... DO YOU?" Yes, and "THE NOISE HAS
DISTURBED SOMETHING ... A HUGE BEAST LANDS UPON YOU": the wyvern (won, 224 each). The escort leaves
the party at (13,9). West to (12,9): no drunken kobold (he lies there only while 0x4ac7 = 255,
9ea2). Search on; (11,9) "SPIKES SPRING OUT AND IMPALE YOU"; (10,9) the net trap's kobolds (won, 26
each); Search off.

**The throne room.** West to (9,9), north to (9,7), west to (7,7), north to (7,4), west and north to
(6,3): "BEFORE YOU IS A HORDE OF KOBOLDS. BEHIND THEM ARE TWO MEN AND AN ANCIENT KOBOLD ON A WOODEN
THRONE." (won, 618 each); "THE KING, FROTHING AT THE MOUTH, CRIES, 'USE THE SECRET WEAPONS.'
BALLISTA APPEAR AND FIRE." (BRIN, CORA and ENNA fall to 0 hit points; won, 425 each); the two envoys
(won, 1534 each); "THE KING HAS ESCAPED DURING THE FIGHT." (0x4a8d = 4). North to (6,2), west, Search
on, north to (5,1): "YOU FIND A SECRET DOOR IN THE NORTH WALL." Search off, north through it to
(5,0), east: at (7,0) the king's guards (won, 1045 each). East to (9,0), south to (9,1), the locked
door east bashed: (10,1) "THE KING, PANICKED, HAS FALLEN INTO HIS OWN SPIKED PIT AND DIED." The
script stores 254 in the kobolds' reward flag 0x4ab6 (a502). Encamp, Save in slot I (No to Quit to
DOS), Exit. 264 commands.

Kovel (#7), the nomads (#8) and the kobolds (#9) are now due at the clerk.

Slot I, written by this walk, is the save the next section loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-kobold-king npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.

**Combat messages (#81).** During the recorded fight with a wild boar, Alda hits it for one
point, it stands up and grins, Dorn hits for four, and it goes down dying. To check what the
player sees, run the following from the repository root with each 1.3 data source.

    POR_GAME_SOURCE=original POR_GAMEDATA=~/por-assets/gog-1.3/POOLRAD node tools/verify-combat-reports.mjs /usr/bin/google-chrome
    POR_GAME_SOURCE=port node tools/verify-combat-reports.mjs /usr/bin/google-chrome

The replay observes those four messages in order in the visible Enhanced text panel.
The standing-up message pauses at slice 24 +1915. Slice 13 +617 follows with only Alda's
combat stats visible. The actual dying report pauses at slice 31 +1013.
