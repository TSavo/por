# A walk into Valhingen Graveyard (area 10)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-valhingen-graveyard`:
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
  middle wilderness (ECL7.DAX block 26) and the graveyard (ECL4.DAX block 10).
- `last-screen.txt`: the screen the walk ends on.

The walk takes the Kovel walk's way to the north side of the Bay (`qa/fixtures/visit-kovel-mansion`),
chooses Leave at the landing's menu, steps north on the wilderness map from (26,27) to the city's
north edge at (26,26) ("WILL YOU ENTER THE NORTHERN CITY GATES OR ENTER THE GRAVEYARD?", City
Graveyard Leave), and enters the graveyard at (0,4) through its opening (the gusts of wind, the
thunder, the lightning). There it walks east, looks round in all four directions at (3,4) and walks
on east to (6,4), where "CLAWS RISE FROM THE SOIL AND ATTEMPT TO DRAG YOU DOWN.": the fight is won
with the developer's command, and the walk ends back on the exploration menu at (6,4) with nothing
taken.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-valhingen-graveyard npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
