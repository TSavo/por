# The Zhentil route, section 1: the auction reported and Commission #5 taken

The first section of the walk to the Zhentil Keep Outpost (#130), played as a player would: the
clerk offers #13 only once #5 (Cadorna's family treasure) is resolved, and offers #5 only once one of
the three commissions before it is. Recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs qa/fixtures/campaign-castle-approach-leg F
qa/fixtures/walk-commission-5-taken`: everything the `leg` walk of `npm run verify:port-parity`
needs to play it again, and nothing of the original game.

- `F.json`: slot F, the save the walk loads: the campaign's party in City Hall at (5,5) facing east,
  with Commission #2 (Sokal Keep) turned in and #4 (the auction) accepted. `A.json` to `E.json` and
  `roster.json` are the other saves of that leg's directory.
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk (tools/record-walk.mjs).

At the clerk, stepping off (5,5) and back gives "BACK SO SOON?" and the same three offers (#1, #3,
#4). The walk leaves City Hall, buys passage west, Stays on the west shore and goes up and east to
the city's western edge (24,28): North, into Podol Plaza at (0,4), Sneak. East to (7,4) and south to
(7,6): the auction (Stand and listen, Wait for winner): "A MAN AND OGRE EXCHANGE THE WAND AND A
LARGE BAG". Back west out of the plaza, Leave, west past the merchants (Flee) to the boat (20,29),
Take boat, and through New Phlan back to the clerk: "YOUR SUCCESS AT PODAL PLAZA IS NOTED. HERE IS
YOUR REWARD." (208 experience each, Share, Exit). She now offers #1, #3 and #5: "JUNIOR COUNCILMAN
CADORNA HAS A SPECIAL COMMISSION FOR YOU." Through the east door to (6,5), Cadorna's speech: the
family treasure in the western building of the Textile complex. Encamp, Save in slot G (No to Quit
to DOS), Exit. 130 commands. Commission #4 turned in, #5 accepted.

Slot G, written by this walk, is the save section 2 (qa/fixtures/walk-textile-house-cleared) loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-commission-5-taken npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
