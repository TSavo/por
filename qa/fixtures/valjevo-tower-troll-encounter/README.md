# Valjevo tower troll encounter

Slot B starts in Valjevo Castle area 5 at (0,4), facing south. The first
step enters the ruined tower. The replay clock starts at 4320100 centiseconds
for the ordinary encounter at `ECL5.DAX:5:9f71` and at 4322783 for the
ambush at `ECL5.DAX:5:a00b`. Both paths use unmodified guest scripts.

The original draws PIC5.DAX block 31 at `9fa2` and at `9a5a/a042`, with the
same eight holds and viewport pixels as the unaware troll branch. Enhanced
uses the ordinary tower paintings for `9fa2` and the charging trolls for
`9a5a/a042`. The five visible paintings appear in order 0, 1, 2, 3, 4, 3, 2, 1.
The battle notice holds the displayed pose until Enter opens the fight.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-tower-troll-encounter/B.json <chrome> valjevo-tower-troll-encounter-loop`
or pass `valjevo-tower-troll-ambush-loop` for the ambush. Run each route with
`POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Set
`POR_HELD_PORTRAIT_CHROME_TRACE` to capture the painted holds.
