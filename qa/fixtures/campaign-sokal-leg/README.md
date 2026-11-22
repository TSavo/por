# The campaign's Sokal Keep leg

Leg 7 of the full campaign replay (`npm run verify:campaign -- <chrome> --full`), as QA's run
`campaign-dHcEGh` recorded it on 2026-11-22 from `game/` (version 1.3's game, the port's own data):
everything the leg needs to be played again, and nothing of the original game.

- `D.json`: slot D, the save the leg loads (the campaign's party in the Slums by the gate to New Phlan, 14,4 facing west).
  `A.json` to `C.json` and `roster.json` are the other saves on the disk when the leg began.
- `boot.json`: the boot keys that load slot D, the step the leg starts at, and that it used the
  developer's win-combat command (`:win-combat`) once.
- `commands.jsonl`: the 272 commands the leg sent, one per line, in order.
- `prompts.jsonl`: when the game asked for each key, in game progress (docs/REPLAYS.md), so a replay
  asks at the same moments.

The leg takes the boat from New Phlan to Sokal Keep, searches the reeds and reads the parchment,
answers the patrols with SHESTNI, fights in the courtyard, meets Ferran and learns SAMOSUD, leaves
with it and collects the clerk's reward (`verifyCampaignSokal` in tools/verify-fresh-party.mjs).
`npm run verify:port-parity` (walk `leg`) plays it from these files, once from the 1.3 files and
once from `game/`, and compares the Enhanced artwork of every frame.
