# A walk into the Cadorna Textile House (area 2)

A walk the campaign never takes (#130), recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs <campaign-ScWmSI> F qa/fixtures/visit-textile-house`:
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
  middle wilderness (ECL7.DAX block 26) and the Textile House (ECL4.DAX block 2).
- `last-screen.txt`: the screen the walk ends on.

The walk takes the Kovel walk's way to the north side of the Bay (`qa/fixtures/visit-kovel-mansion`),
chooses Leave at the landing's menu, and walks the wilderness map west and south from (26,27) over
Phlan at (25,27) to the city's western edge at (24,28), where it takes the South entrance into the
Textile House at (0,4). There it turns east, looks round in all four directions at (4,4), walks round
to the corridor at (4,5), where scorpions approach (Combat, won with the developer's command, CORA
left with 2 hit points, nothing to take), and walks south to the courtyard at (4,10), where a drum
beats and the hobgoblins attack. The fight is won with the developer's command (during a hobgoblin's
own turn); the party plays on until Continue Battle (No), views a sheet at the treasure, takes nothing,
and looks round in all four directions at (4,10): "THINGS SEEM STRANGELY QUIET. THE DRUM HAS FADED TO
SILENCE." 93 commands. After that win the runner used to offer the win a second time and stop when it
was taken (#136); `npm run verify:developer-combat` plays this walk to that win and requires the fight
to come to its end with the runner still going.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/visit-textile-house npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
