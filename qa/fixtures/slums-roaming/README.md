# Slums roaming encounters

Use `kobold-B.json` with `slums-roaming-kobold-loop` in
`tools/verify-slums-presentation.mjs`. The replay walks between two
Slums squares until it reaches the stock kobold surprise encounter.
It checks the portrait cycle with GOG 1.3 and bundled data.

Use `orc-B.json` with `slums-roaming-orc-surprise-loop` to check the
orc surprise, its portrait timing, and the handoff to combat in both modes.
The same checkpoint with `slums-roaming-goblin-surprise-loop` reaches the
goblin branch with its own fixed replay clock.
Use `slums-roaming-kobold-surprise-loop` with that checkpoint for the
kobold branch of the same party-surprise prompt.

The `slums-roaming-kobold-advance-loop`, `slums-roaming-goblin-advance-loop`,
and `slums-roaming-orc-advance-loop` routes use the same checkpoint to
check the approaching sprite, the portrait after Advance, and the start
of combat at each angry-party selection.
