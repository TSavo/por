# A walk into Kovel Mansion (area 14)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-kovel-mansion`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `F.json`: slot F, the save the walk loads: the campaign's party in City Hall at (5,5) facing east,
  with the council's reward for Sokal Keep collected. `A.json` to `E.json`, `G.json` to `I.json` and
  `roster.json` are the other saves of QA's campaign run `campaign-ScWmSI`.
- `boot.json`: the boot keys that load slot F, the step the walk starts at, the developer's
  win-combat command on (the walk does not need it), and normal input (`"inputCompat": ""`:
  docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order: keys, and `:travel-poll` where the game
  carried on by itself.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory and the commissions, as the runner's visit trace saw them
  while the walk was recorded, for
  `npm run qa:visits`: City Hall, New Phlan, the middle wilderness (ECL7.DAX block 26) and Kovel
  Mansion (ECL3.DAX block 14).
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk leaves City Hall, crosses New Phlan to the harbor master at (11,1), buys passage to the
north side of the Bay (`Bay`, the first member pays), boards at the end of the pier, and at the
landing ("YOU ARE ON THE EASTERN EDGE OF THE CITY", North South Boat Leave) takes the north entrance
into Kovel Mansion at (15,4). There it walks north and along the north corridor west to (10,1),
bashes the locked door south to (10,2), looks round in all four directions, bashes the next locked
door to (10,4), steps on to (10,5) and looks round again.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-kovel-mansion npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
