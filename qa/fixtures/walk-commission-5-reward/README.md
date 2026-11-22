# The Zhentil route, section 3: Cadorna's box returned and the #5 reward

The third section of the walk toward the Zhentil Keep Outpost (#130). Recorded on 2026-11-22 from
`game/` (version 1.3's game, the port's own data) with `node tools/record-walk.mjs <section 2's
saves> H qa/fixtures/walk-commission-5-reward`: everything the `leg` walk of
`npm run verify:port-parity` needs to play it again, and nothing of the original game.

- `H.json`: slot H, the save the walk loads, written at the end of section 2
  (qa/fixtures/walk-textile-house-cleared): the party in the ogre chief's room of the Textile House
  (12,14) with Cadorna's iron box, unopened. `A.json` to `G.json` and `roster.json` are the other
  saves on that disk.
- `after/`: the saves as the walk left them, with slot I written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk.

The walk goes back west out of the ogre's room, north through the door at (8,9) to row 5, west to
(2,5) and out of the Textile House at (0,4): Leave, west to the boat (20,29), Take boat. One step
off the pier and on to (11,2): a Press Enter prompt with an empty text window, then "THE CITY WATCH
STOPS YOU AND REMOVES CADORNA'S TREASURE FROM YOUR KEEPING. THEY TELL YOU YOUR REWARD WAITS WITH THE
CITY CLERK." Through New Phlan to the clerk: "COUNCILMAN CADORNA LEFT THIS PAYMENT FOR SOME SERVICE
YOU HAD RENDERED. HERE IS YOUR REWARD." (833 experience each, Share, Exit). She then offers #1 (the
Slums), #3 (the records) and #6 (the Bishop of Tyr). Encamp, Save in slot I (No to Quit to DOS),
Exit. 95 commands. Commission #5 turned in.

#13 is not offered here. The clerk names only the first three unresolved commissions whose
conditions hold (her count 0x4a05 stops the list at three; a resolved or ineligible entry is skipped
at a89e), and #13 is entry 13 of ECL3.DAX block 8 (ad01 to ae24): it comes only once all but two of
the eligible commissions before it (#1, #3, #6 to #12) are resolved.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-commission-5-reward npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
