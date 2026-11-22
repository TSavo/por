# A wilderness walk: the Nomad Camp, the Cave of Diogenes and the west and east windows

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs qa/fixtures/campaign-castle-approach-leg F
qa/fixtures/wilderness-walk`: everything the `leg` walk of `npm run verify:port-parity` needs to play
it again, and nothing of the original game.

- `F.json`: slot F, the save the walk loads: the campaign's party in City Hall at (5,5) facing east.
  `A.json` to `E.json` and `roster.json` are the other saves of that leg's directory.
- `boot.json`: the boot keys that load slot F, the step the walk starts at, the developer's
  win-combat command on (the walk does not use it), and normal input (`"inputCompat": ""`:
  docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order: keys, and `:travel-poll` where the game
  carried on by itself.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory and the commissions, as the runner's visit trace saw them
  while the walk was recorded, for `npm run qa:visits`: City Hall, New Phlan, the middle wilderness
  (ECL7.DAX block 26), the Nomad Camp (ECL7.DAX block 17), the west wilderness (ECL6.DAX block 25),
  the Cave of Diogenes (ECL6.DAX block 19) and the east wilderness (ECL8.DAX block 27).
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk leaves City Hall, crosses New Phlan to the harbor master at (11,1), buys passage west (the
first member pays), boards at the end of the pier and stays on the west shore (20,29). Overland it
goes north and west, flees the merchants and the driders, and goes east to the Nomad Camp (25,11):
Enter, a few steps west to the camp's west edge, Yes to the wilderness, Leave. Then west to the Cave
of Diogenes (10,9): Enter cave, State name and intent, Ask dragon for advice (the silver dragon sends
the party for the kobolds' silver bottle), Ignore cave. Then east: at (20,9) the stirges; Flee gives
`Continue Battle: Yes No`, and No `The party has won` (7 experience each). It ends at (32,9), in the
east window.

The Zhentil Keep Outpost (3,32) is not on the map in this save: the overland offers it only once
global 0x4a98 is 255 (tools/overland-travel.ts).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/wilderness-walk npm run verify:port-parity` plays it
once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
