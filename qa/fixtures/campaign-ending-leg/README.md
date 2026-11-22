# The campaign's climax and ending leg

Leg 10 of the full campaign replay (`npm run verify:campaign -- <chrome> --full`), as QA's run
`campaign-ScWmSI` recorded it on 2026-11-22 from `game/` (version 1.3's game, the port's own data),
in the run that passed end to end: everything the leg needs to be played again, and nothing of the
original game.

- `H.json`: slot H, the save the leg loads (the stairs to Tyranthraxus's audience hall).
  `A.json` to `G.json` and `roster.json` are the other saves on the disk when the leg began.
- `boot.json`: the boot keys that load slot H, the step the leg starts at, and that the developer's
  win-combat command was on (the leg sends it twice).
- `commands.jsonl`: the 78 commands the leg sent, one per line, in order.
- `prompts.jsonl`: when the game asked for each key, in game progress (docs/REPLAYS.md).

The leg goes down to the audience hall, where the bronze dragon rises, wins its first fight, votes
to attack, defeats Tyranthraxus (both fights ended with win-combat), returns through the west gate to
City Hall and hears the clerk say the quest is over (`verifyCastleEnding` in tools/verify-fresh-party.mjs, played continuously).
`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/campaign-ending-leg npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
