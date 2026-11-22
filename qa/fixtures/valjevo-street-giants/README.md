# Valjevo street giants

Slot J starts at (4,3) facing east in Valjevo Castle area 4, with the alarm
already active. It was saved through Camp at the end of
`qa/fixtures/visit-valjevo-area-4`.

The `valjevo-street-giants-loop` route steps onto (5,3), advances twice, and
reaches the street charge. Its fixed test clock avoids the nearby random
patrol. ECL5.DAX block 4 producer `a255` draws PIC5.DAX block 56 at `a289`.
Native members 0 and 2 draw identical pixels. The Enhanced sequence uses
0, 1, 0, 3 with 210 ms holds. Combat keeps the visible street pose at the
battle notice.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-street-giants/J.json <chrome> valjevo-street-giants-loop`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`.
Set `POR_HELD_PORTRAIT_CHROME_TRACE` to capture the painted holds.
