# Ohlo's study dialogue

Slot D starts from the Campaign Full party's recorded Slums save. Only the coordinates and facing bytes were changed to start the party at Ohlo's closed door (14,10), facing west. The quest flags are from the original checkpoint.

Run `slums-ohlo-accept-holds` and `slums-ohlo-dismissal-hold` with this slot. The reward-request replay, `slums-ohlo-reward-request-hold`, uses the existing [Ohlo loot checkpoint](../ohlo-loot-view-restore/H.json). All three routes use `tools/verify-slums-presentation.mjs`. Set `POR_GAME_SOURCE` and `POR_HELD_PORTRAIT_CHROME_TRACE` for each original and bundled run.
