# Lizard Wilds stirge surprise

Slot A is the historical local overland save from `lizard-overland-fixture-A.json`. The copied save has SHA-256 `d709fa5ab1e237336ae216e8ed21c761ef6342cea8f221387a401fcb34174d6b`.

Load Slot A at fixed DOS clock 4320307, then press Up, Down, Up, Down, Up. At (27,8) the original ECL7.DAX block 26 encounter shows “YOU ARE SURPRISED BY A GROUP OF STIRGES.” Its middle cel is SPRIT7.DAX block 61 member 1 at (56,32) with size 24×57. Wait leads to the original battle notice and clears the sprite.

`node tools/verify-overland-encounter-sprite.mjs <chrome> surprise` checks the held sprite and Wait. Switch the last argument to `spotted` to check the sighting and Flee using the tracked wilderness walk. Both tests check the authored local terrain and the original choice handoff. The remaining overland terrain is tracked in #193.
