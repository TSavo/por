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

The corresponding `slums-roaming-*-spotted-loop` routes check the
close portrait and combat notice after spotting a roaming party.

Use `orc-B.json` for the spotted-party and surprised-party Parlay replays.
Each checks the street portrait at the tone menu and the pose order and
holds after the selected response. The route names are
`slums-roaming-<creature>-<outcome>-parlay-loop` for a spotted group and
`slums-roaming-surprised-<creature>-<outcome>-parlay-loop` when the party
surprises the monsters. The creatures are `kobold`, `goblin`, and `orc`.
The outcomes are `demand`, `surrender`, `leave`, `advice`, `stop`, and
`rebuke`. In the advice and stop replays, Brother Sean leads the party
before Parlay. The other replays use the checkpoint's starting order.

On Linux, set `POR_PRESENTATION_OUTPUT_DIR` to a short writable path such
as `/tmp/por-slums` if headless Chrome exits before its debug port opens. The
verifier creates its Chrome profile inside that directory.

The `slums-roaming-goblin-party-surprised-loop` and
`slums-roaming-orc-party-surprised-loop` routes check the portrait when
the party surprises the monsters and its last pose at the battle notice.
