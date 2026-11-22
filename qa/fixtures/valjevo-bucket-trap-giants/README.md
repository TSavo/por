# Valjevo bucket-trap giants

Slot B starts north of the trapped barracks door in Valjevo Castle area 3.
The `valjevo-bucket-trap-giant-loops` route enters the room, clears the
falling-sand and damage notices, and reaches the charge menu. **Combat**
continues to the second pause with the same charge caption.

The GOG 1.3 trace identifies ECL5.DAX block 3 producer `a621` and PIC5.DAX
block 56 at `a662` and `9a5a/a732`. The two prompts both draw four 210 ms
holds. Members 0 and 2 show the same pixels, so the visible order is 0, 1, 0, 3.
The waking-giant caption shares the second pause address and uses its own art.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-bucket-trap-giants/B.json <chrome> valjevo-bucket-trap-giant-loops`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Set
`POR_HELD_PORTRAIT_CHROME_TRACE` to capture the two sequences.
