# The campaign's last leg: the finished game reloaded

Leg 11 of the full campaign replay (`npm run verify:campaign -- <chrome> --full`), as QA's run
`campaign-ScWmSI` recorded it on 2026-11-22 from `game/` (version 1.3's game, the port's own data),
in the run that passed end to end: everything the leg needs to be played again, and nothing of the
original game.

- `I.json`: slot I, the save the leg loads, which the ending leg (qa/fixtures/campaign-ending-leg)
  wrote at the end of the game. `A.json` to `H.json` and `roster.json` are the other saves on the disk
  when the leg began.
- `boot.json`: the boot keys that load slot I and the step the leg starts at.
- `commands.jsonl`: the one command the leg sent, `j`, which opens the journal.
- `prompts.jsonl`: when the game asked for each key, in game progress (docs/REPLAYS.md).

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/campaign-end-leg npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
