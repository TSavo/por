# A walk into the Temple of Bane's district (area 24)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs qa/fixtures/campaign-castle-approach-leg F
qa/fixtures/visit-temple-of-bane`: everything the `leg` walk of `npm run verify:port-parity` needs to
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
  (ECL7.DAX block 26, the landing) and the Temple of Bane (ECL1.DAX block 24).
- `last-screen.txt`: the screen the walk ends on; the replay must end on it.

The walk leaves City Hall, crosses New Phlan to the harbor master at (11,1), buys passage to the
north side of the Bay (`Bay`, the first member pays) and boards at the end of the pier. At the
landing ("YOU ARE ON THE EASTERN EDGE OF THE CITY", North South Boat Leave) it takes the south
entrance, which puts the party in area 24 at (15,4) facing west. It walks west along the street to
(5,4), then west and south to (2,7), the square where the campaign replay of
`tools/verify-fresh-party.mjs --from-bane-preparation` is let into the temple. In this save (no
Commission #6, no black-hand patrol met) the square prints nothing: Look shows nothing and the way
south is shut.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-temple-of-bane npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
