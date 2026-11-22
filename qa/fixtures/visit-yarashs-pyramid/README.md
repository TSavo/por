# A walk into Yarash's Pyramid, Level 1 (area 22) and Level 2 (area 23)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs qa/fixtures/campaign-castle-approach-leg F
qa/fixtures/visit-yarashs-pyramid`: everything the `leg` walk of `npm run verify:port-parity` needs to
play it again, and nothing of the original game.

- `F.json`: slot F, the save the walk loads: the campaign's party in City Hall at (5,5) facing east.
  `A.json` to `E.json` and `roster.json` are the other saves of that leg's directory.
- `boot.json`: the boot keys that load slot F, the step the walk starts at, the developer's
  win-combat command on (the walk does not use it), and normal input (`"inputCompat": ""`:
  docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory and the commissions, as the runner's visit trace saw them
  while the walk was recorded, for `npm run qa:visits`: City Hall, New Phlan, the middle wilderness
  (ECL7.DAX block 26), the pyramid's Level 1 (ECL7.DAX block 22) and Levels 2 and 3 (ECL7.DAX
  block 23).
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk leaves City Hall, crosses New Phlan to the harbor master at (11,1), buys passage west (the
first member pays), boards at the end of the pier and stays on the west shore (20,29). Overland it
goes north and west, flees the merchants at (16,15) and the driders at (18,14), and steps onto the
hidden rowboat at (19,14): Yes to the pyramid (19,16), Enter. On Level 1 it walks from (15,0) south
down the main corridor to (15,7) and west into the first alcove, teleporter TA (14,7): "YOU SEE ROCKS
SCATTERED ABOUT THE SMOOTH FLAGSTONES." and "AS YOU MOVE THROUGH THE ROOM THERE IS A FLASH", which
puts the party on Level 2 at (4,15) facing north. It walks north to (4,12).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-yarashs-pyramid npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
