# A walk into the Kobold Caves (area 13)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-kobold-caves`:
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
  east wilderness (ECL8.DAX block 27) and the Kobold Caves (ECL8.DAX block 13).
- `last-screen.txt`: the screen the walk ends on.

The walk leaves City Hall, crosses New Phlan to the harbor master, buys passage East, boards at the
end of the pier and lands at (35,29) on the wilderness map, where it stays rather than take the boat
back. It walks north to (35,15) and west; at (33,15) "A SCREAMING HORDE OF KOBOLDS ATTACKS THE PARTY.":
the fight is won with the developer's command, nothing taken. At (32,15) the game shows the kobolds
entering a small, concealed cave with a
larger one just east (Large Small Exit); the party takes the Large cave, answers No to "DO YOU WANT
TO LEAVE?", steps north to (10,14) and looks round in all four directions.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-kobold-caves npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
