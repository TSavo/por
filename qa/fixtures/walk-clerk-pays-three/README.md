# The commission chain, section 6: back to the clerk, who pays Kovel, the kobolds and the nomads

The sixth section of the walk through the council's commissions in the clerk's order (#111, #130).
Recorded on 2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-kobold-king/after I qa/fixtures/walk-clerk-pays-three`:
everything the `leg` walk of `npm run verify:port-parity` needs to play it again, and nothing of the
original game.

- `I.json`: slot I, the save the walk loads, written at the end of section 5
  (qa/fixtures/walk-kobold-king): the party at the king's pit (10,1) in the Kobold Caves, BRIN, CORA
  and ENNA at 0 hit points, with #7, #8 and #9 due at the clerk. `A.json` to `H.json`, `J.json` and
  `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot J written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

A first try from this save went on to the lizardman keep (37,8) instead, and lost the party there:
at (8,9), the central keep's "SUDDENLY LIZARD MEN JUMP UP FROM WHERE THEY WERE HIDING AND THROW
JAVELINS AT YOU" killed the three still standing before the fight ("The entire party is killed!").
That recording was not kept; this walk takes the rewards and the money first.

Out of the caves the way the party came in: west along row 1, south past the throne room, (5,7)
"HERE CRUDE TABLES, LITTERED WITH BONES", (5,8) "RATS ARE HUNG HERE TO AGE", east and south; at
(8,12) the white flag's trap: "THE ROOF COLLAPSES." (BRIN, DORN and ENNA hit for 2) and "BEFORE YOU
RECOVER, KOBOLDS ARRIVE" (won, 53 experience each, the treasure left). Out at (6,15): Yes to "DO YOU
WANT TO LEAVE?", Exit at the two caves. East to (35,15), south to (35,29): "THERE IS A BOAT DOCKED
HERE THAT WILL RETURN YOU TO THE CIVILIZED SECTION OF PHLAN." Take boat: New Phlan's pier (15,1).
West to (11,1), south, west, south to (10,3), west to (4,3), south into City Hall to (4,5), east to
the clerk (5,5): "BEFORE I CAN OFFER ANY COMMISSIONS, I MUST SEE IF YOU ARE DUE A CURRENT REWARD."

- "THE COUNCIL WAS PLEASED BY THE ELIMINATION OF THE THIEVES IN KOVEL MANSION. HERE IS YOUR REWARD."
  (383 experience each, Share, Exit)
- "THIS LOSS OF THE KOBOLD FORCES WILL BE A MAJOR BLOW TO THE ENEMY. HERE IS YOUR REWARD." (2083
  each, Share, Exit)
- "WE WERE MUCH RELIEVED BY THE NEWS YOU BRING FROM THE NOMAD CAMP. HERE IS YOUR REWARD." (1966 each,
  Share, Exit)

She then offers #1 ("THE SLUMS IMMEDIATELY TO OUR WEST NEED TO BE CLEARED OF MONSTERS."), #3 (the
books, maps and tomes) and #10 ("FIND THE SOURCE OF THE RIVER'S POLLUTION AND END IT."), "THESE ARE
ALL OF THE COMMISSIONS CURRENTLY AVAILABLE." View shows ALDA, a level 1 fighter with 12413 experience
points (the party has never trained). Encamp, Save in slot J (No to Quit to DOS), Exit. 113 commands.

Commissions #7, #8 and #9 are turned in. #12 comes once two of #1, #3, #10 and #11 are.

Slot J, written by this walk, is the save the next section loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-clerk-pays-three npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
