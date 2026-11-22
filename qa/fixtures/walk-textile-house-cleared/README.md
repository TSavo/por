# The Zhentil route, section 2: the Textile House to Cadorna's box

The second section of the walk to the Zhentil Keep Outpost (#130). Recorded on 2026-11-22 from
`game/` (version 1.3's game, the port's own data) with `node tools/record-walk.mjs <section 1's saves>
G qa/fixtures/walk-textile-house-cleared`: everything the `leg` walk of `npm run verify:port-parity`
needs to play it again, and nothing of the original game.

- `G.json`: slot G, the save the walk loads, written at the end of section 1
  (qa/fixtures/walk-commission-5-taken): the party in Cadorna's chambers at (6,5) facing east, with
  Commission #5 accepted. `A.json` to `F.json` and `roster.json` are the other saves on that disk.
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk (tools/record-walk.mjs). Every fight is won with the developer's command (the
  recorder sends `:win-combat` when the game offers it); the party has 6 to 8 hit points.

The walk leaves City Hall, buys passage west, Stays on the west shore and goes to the city's western
edge (24,28): South, into the Textile House at (0,4). East and south to (4,5) and down the corridor:
"SCORPIONS APPROACH HUNGRILY." at (4,7) (won, Continue Battle No, 64 experience each, nothing taken).
South to the courtyard (4,10): "A DRUM BEGINS TO BEAT AND HOBGOBLINS ATTACK." (won, 63 each, the
treasure left: "THE DRUM HAS FADED TO SILENCE."). Then east to (8,10), south to (8,13), east, through
the door south to (9,14), east to location 20 (11,14) and through the secret door in its east wall
into location 21 (12,14): the ogre chief, "PUNY CREATURES," (won, 132 each, the treasure left), and
"YOU FIND AN IRON BOX, ACROSS THE LOCK IS THE SEAL OF THE FAMILY OF CADORNA": Take it unopened.
Encamp, Save in slot H (No to Quit to DOS), Exit. 134 commands.

Slot H, written by this walk, is the save section 3 (the box returned and the #5 reward) loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-textile-house-cleared npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
