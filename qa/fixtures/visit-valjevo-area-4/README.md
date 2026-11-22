# A walk into Valjevo Castle's area 4

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> G qa/fixtures/visit-valjevo-area-4`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `G.json`: slot G, the save the walk loads: the campaign's party in Valjevo Castle's area 6 at
  (4,14) facing north, just past Stojanow Gate. `A.json` to `F.json`, `H.json`, `I.json` and
  `roster.json` are the other saves of QA's campaign run `campaign-ScWmSI`.
- `boot.json`: the boot keys that load slot G, the step the walk starts at, the developer's
  win-combat command on, and normal input (`"inputCompat": ""`: docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order: keys, `:travel-poll` where the game carried
  on by itself, and `:win-combat` where it offered the developer's win.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory and the commissions, as the runner's visit trace saw them
  while the walk was recorded, for `npm run qa:visits`: ECL5.DAX blocks 6, 3 and 4.
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk goes north up area 6's column 3 and through its north door into area 3 (ECL5.DAX block 3),
north up the same column to the row 3 corridor, and east along it. At (6,3) a patrol of giants led by
a human fighter surprises the party: Combat, won with the developer's command, no treasure taken. On
east through the door at (15,3) into area 4 (ECL5.DAX block 4) at (0,3), where a second patrol of
giants surprises the party at (3,3) and is fought the same way. Then the party looks round in all
four directions and walks on east to (4,3), where a third patrol sees it and is fought the same way.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-valjevo-area-4 npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
