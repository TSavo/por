# Valjevo's waking fire giants

Slot B is the checkpoint before the sleeping-giants encounter in Valjevo Castle, area 3. The
`valjevo-waking-fire-giants-loop` route selects **Attack as they sleep** and reaches the creaking-board
caption. GOG 1.3 draws PIC5.DAX block 56 from ECL5 block 3 producer `a671` at `9a5a/a732`.
Members 0 and 2 show the same pixels. The Enhanced cycle uses 0, 1, 0, 3, each held for 210 ms.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-waking-fire-giants/B.json <chrome> valjevo-waking-fire-giants-loop`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Set `POR_HELD_PORTRAIT_CHROME_TRACE` to capture
the painted sequence. Enter advances from the waking caption to the battle notice.
