# A walk into Mendor's Library (area 15)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-mendors-library`:
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
  middle wilderness (ECL7.DAX block 26), the Textile House (ECL4.DAX block 2) and the library
  (ECL2.DAX block 15).
- `last-screen.txt`: the screen the walk ends on.

The walk takes the Textile House walk's way in (`qa/fixtures/visit-textile-house`: the Bay, Leave,
the wilderness map to the city's western edge at (24,28), South), crosses the Textile House by its
row 5 corridor (scorpions approach at (8,5): Combat, won with the developer's command, nothing to
take) and leaves by its east door at (15,4) into Mendor's Library at (0,4), entered from the west,
without the locked door. There it looks round in all four directions, walks north to (0,1) and east
along the north corridor to (3,1).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-mendors-library npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
