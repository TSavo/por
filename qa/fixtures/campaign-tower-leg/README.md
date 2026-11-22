# The campaign's hedge maze and tower leg

Leg 9 of the full campaign replay (`npm run verify:campaign -- <chrome> --full`), as QA's run
`campaign-ScWmSI` recorded it on 2026-11-22 from `game/` (version 1.3's game, the port's own data),
in the run that passed end to end: everything the leg needs to be played again, and nothing of the
original game.

- `G.json`: slot G, the save the leg loads (Valjevo Castle). `A.json` to `F.json` and `roster.json`
  are the other saves on the disk when the leg began.
- `boot.json`: the boot keys that load slot G, the step the leg starts at, and that the developer's
  win-combat command was on (the leg does not send it).
- `commands.jsonl`: the 96 commands the leg sent, one per line, in order.
- `prompts.jsonl`: when the game asked for each key, in game progress (docs/REPLAYS.md).

The leg enters the hedge maze through its west gate with the password RHODIA, cuts a hedge and
reaches the stairs to Tyranthraxus's audience hall, where it saves in slot H
(`verifyCampaignTower` in tools/verify-fresh-party.mjs).
`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/campaign-tower-leg npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
