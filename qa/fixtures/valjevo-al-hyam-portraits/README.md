# Al-Hyam portrait replay

Slot B starts one step before the Al-Hyam encounter in Valjevo Castle.
Walk forward, advance twice, and choose Parlay. Choose Attack on the first
offer, then Let him go to see the notes. Enter returns to exploration.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-al-hyam-portraits/B.json <chrome> valjevo-al-hyam`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Set
`POR_HELD_PORTRAIT_CHROME_TRACE` in each run to record the four holds.
