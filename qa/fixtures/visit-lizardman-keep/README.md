# A walk into the Lizardman Keep (area 16)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-lizardman-keep`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `F.json`: slot F, the save the walk loads: the campaign's party in City Hall at (5,5) facing east,
  with the council's reward for Sokal Keep collected. `A.json` to `E.json`, `G.json` to `I.json` and
  `roster.json` are the other saves of QA's campaign run `campaign-ScWmSI`.
- `boot.json`: the boot keys that load slot F, the step the walk starts at, the developer's
  win-combat command on, and normal input (`"inputCompat": ""`: docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order: keys, `:travel-poll` where the game carried
  on by itself, and `:win-combat` where it offered the developer's win.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory, the game state and the commissions, as the runner's visit
  trace saw them while the walk was recorded, for `npm run qa:visits`: City Hall, New Phlan, the
  east wilderness (ECL8.DAX block 27) and the Lizardman Keep (ECL8.DAX block 16).
- `last-screen.txt`: the screen the walk ends on.

The walk takes the Kobold Caves walk's way to the east landing at (35,29) (`qa/fixtures/visit-kobold-caves`),
stays, tries east twice into the boat's square and its question again (Stay), then walks north and
east on the wilderness map. At (36,13) it surprises a group of trolls: Combat, won with the
developer's command, nothing to take. At (37,8) the game shows the ruined castle in the quicksand
(Enter Leave); the party enters ("YOU SENSE AN ANTI-MAGIC SHELL AROUND YOU."), arrives at (8,14)
facing north, looks round in all four directions and walks north to (8,11).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-lizardman-keep npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
