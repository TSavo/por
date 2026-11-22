# The commission chain, section 10: Yarash's Pyramid and the river

The tenth section of the walk through the council's commissions in the clerk's order (#111, #130):
commission #10, the river's pollution, by Yarash's Pyramid on the Clue Book's teleporter route
(qa/acceptance/15-yarashs-pyramid.json). Recorded on 2026-11-22 from `game/` (version 1.3's game,
the port's own data) with `node tools/record-walk.mjs qa/fixtures/walk-library-cleared/after F
qa/fixtures/walk-yarash-pyramid`: everything the `leg` walk of `npm run verify:port-parity` needs to
play it again, and nothing of the original game.

- `F.json`: slot F, the save the walk loads, written at the end of section 9
  (qa/fixtures/walk-library-cleared): the party and its theurgist outside the library's inner rooms
  at (8,1), with #3 due. `A.json` to `E.json`, `G.json` to `J.json` and `roster.json` are the other
  saves on that disk.
- `after/`: the saves as the walk left them, with slot E written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

**To the pyramid.** West along the library's north corridor, south and west out into the Textile
House at (15,4), west along row 5 and out at (0,4): Leave, on the wilderness map at (24,28). North is
blocked after (24,27) (the walk's presses north go nowhere until) "YOU SURPRISE A GROUP OF
MERCHANTS": Flee. West: at (21,27) "YOU SURPRISE A GROUP OF DRIDERS" (Combat, won, 556 experience
each). West to (20,27), north to (20,25), then the way of qa/fixtures/visit-yarashs-pyramid: (18,22)
"YOU SURPRISE A GROUP OF KOBOLDS" (won), north to (16,14), east: (18,14) "YOU SPOT A GROUP OF
KOBOLDS" (won), (19,14) "YOU HAVE FOUND A ROWBOAT HIDDEN AMOUNGST THE REEDS. WILL YOU TAKE IT TO
THE PYRAMID?" Yes, and Enter at the secret door.

**Teleporters.** Level 1 (15,0): south to (15,7), west into TA (14,7): "YOU SEE ROCKS SCATTERED ABOUT
THE SMOOTH FLAGSTONES.", "AS YOU MOVE THROUGH THE ROOM THERE IS A FLASH": level 2 at (4,15). North to
(4,12), east ("A SECRET DOOR IS FOUND TO YOUR RIGHT." at (9,12)) to TE (15,12): Go back / Move on /
Throw a rock. Move on puts the party at (15,7) on level 1. The claim
acceptance.yarashs-pyramid.teleporter-te says the default goes to Te, level 2 (11,3), and a rock to
(15,7); here it is the other way round. West into TA again (Move on) to (4,15), and east to TE: Throw
a rock ("YOU THROW A ROCK. SUDDENLY IT DISAPPEARS WITH A FLASH!"), Move on: Te (11,3). The long way
round to TG (12,3): Throw a rock, Move on: Th (0,4), level 3. North to TJ (0,2): Throw a rock, Move
on: Tk (0,0).

**Level 3.** East to (1,1): "YOU SEE A SIGN OVER THE DOOR IN FRONT OF YOU. IT SAYS, 'DON'T FORGET THE
PASSWORD'. THIS IS FOLLOWED BY SIX DWARVISH RUNES...", "YOU QUICKLY TRANSLATE THEM AND SAY...?"
NOKNOK, "DO YOU REALLY MEAN NOKNOK?" Yes. The fountain chamber (2,1) ("A COLUMN OF BLACK FOUL WATER
...", "WHAT DO YOU DO?"): Move quickly away. East, south and east to the pumping room (5,4): "THREE
LIZARD MEN WITH WHIP CUTS ACROSS THEIR BACK WHO ARE SHACKLED TO THE WALL", "THEY RECOIL IN FEAR":
Advance, Advance, Parlay, Nice: "AS YOU FREE THEM THEY TELL YOU ALL ABOUT WHAT YARASH IS DOING ... AS
ENTRY 35 OF YOUR JOURNAL." North and west to (3,1); the locked door east opens to Bash: (4,1) "AN
ANCIENT MAGE LOOKS UP FROM HIS STUDIES, 'AH, GOOD, I NEED MORE SPECIMENS AS CONTROLS.' HE TURNS TO
HIS MUTATED GUARDS, 'SUBDUE THEM!'" Combat: Yarash and his guards (won). The river's reward flag
0x4ab3 is 254.

**Out.** North to the dial (5,0): "IT IS CURRENTLY SET TO BLUE. DO YOU WISH TO CHANGE THE SETTING?"
No; east into TL (6,0): level 1 at (15,8). North to (15,0), east: "A SECRET DOOR IS FOUND TO YOUR
LEFT."; north: "AS YOU LEAVE THE SORCERER'S PYRAMID BEHIND YOU CAN SEE THAT THE LAND IS ALREADY
BEGINNING TO RECOVER FROM THE ALCHEMICAL POLLUTION CAUSED BY THE PYRAMID." At the pyramid's door, Go
back: the wilderness map at (19,14). Encamp, Save in slot E (No to Quit to DOS), Exit. 335 commands.

#3 and #10 are due at the clerk. Slot E, written by this walk, is the save the next section loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-yarash-pyramid npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
