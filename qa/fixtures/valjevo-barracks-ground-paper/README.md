# Valjevo barracks ground paper

Slot C starts on (8,1), facing north with Search active, after the barracks intruder battle
in Valjevo Castle area 4. The party won via the developer victory option, exited the treasure
menu, then saved through Camp. Walking north onto (8,0) finds the paper. Enter reveals the
passwords. Both prompts keep the room view.

The original script loads PIC5.DAX block 56 at producer `a609` during the intruder
encounter. The ground-paper branch starts separately at `a640`, through the room
dispatch at `9b0e`, and reaches the continuation at `9a5a/a442` without drawing
a portrait. The Parlay password handoff reaches the same continuation with a
portrait from a different producer, `a339`.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-barracks-ground-paper/C.json <chrome> valjevo-barracks-ground-paper`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Set
`POR_HELD_PORTRAIT_CHROME_TRACE` to record the room-view evidence.
