# A walk through the Training Hall (area 11)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> A qa/fixtures/visit-training-hall`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `A.json`: slot A, the save the walk loads: the campaign's six fighters in New Phlan after Rolf's
  tour, at (0,4) facing west. `B.json` to `I.json` and `roster.json` are the other saves of QA's
  campaign run `campaign-ScWmSI`.
- `boot.json`: the boot keys that load slot A, the step the walk starts at, the developer's
  win-combat command on (the walk does not send it), and normal input (`"inputCompat": ""`, no
  legacy presses: docs/REPLAYS.md).
- `commands.jsonl`: every line the runner took, in order: keys, and `:travel-poll` where the game
  carried on by itself.
- `prompts.jsonl`: when the game asked for each, in game progress (docs/REPLAYS.md).
- `visits.jsonl`: the script in memory and the commissions, as the runner's visit trace saw them on
  a replay from `game/` (`node tools/record-walk.mjs --replay`), for `npm run qa:visits`.
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk goes east and north to the training block (ECL3.DAX block 11) at (6,2) and reads the
notices; north and east to the duelling room at (7,1), where it declines the duel, asks the hiring
hall for a partner and declines the swordsman; then to each hall in turn, the fighters' at (8,0)
(Yes: the party menu, a character sheet, Begin Adventuring), the thieves' at (9,0), the clerics' at
(5,0) and the magic users' at (7,0), declining each; and back out west and south to New Phlan's
street outside City Hall at (3,4).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-training-hall npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
