# The commission chain, section 9: Mendor's Library, Knock, the basilisk and the spectre

The ninth section of the walk through the council's commissions in the clerk's order (#111, #130):
commission #3, Mendor's Library, the way the guide prepares it (qa/acceptance/05-mendors-library.json:
Knock for the locked door, the basilisk in Rhetoric, a book, and the spectre on the way out). Recorded
on 2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-new-phlan-training/after G
qa/fixtures/walk-library-cleared`: everything the `leg` walk of `npm run verify:port-parity` needs to
play it again, and nothing of the original game.

- `G.json`: slot G, the save the walk loads, written at the end of section 8
  (qa/fixtures/walk-new-phlan-training): six level 2 fighters in plate mail with short swords and a
  hired THEURGIST (Knock in memory), at New Phlan's arms shop (8,11). `A.json` to `F.json`, `H.json`
  to `J.json` and `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot F written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

North through New Phlan to the harbor master (11,1): Bay, the boat, Leave, west to the city's western
edge (24,28), South into the Textile House. East along row 5: "SOME GHOULS DECIDE TO ADD YOU TO
THEIR MENU." at (3,5) (won); north at (13,4), east into Mendor's Library at (0,4). North to (0,1),
east to (8,1), south: "Locked. Bash Knock Exit" (in section 7, with no Knock in memory, it offered
only Bash). Knock: the party stands in (8,2), "YOU SEE AN EMPTY ROOM. THE ONLY FEATURE IS A SERIES
OF FRESCOES".

South to the corridor (8,5), west to (5,5), north into the Rhetoric stacks (5,4): "A SIGN OVER THE
ENTRANCE READS RHETORIC.", "IT HISSES AT YOU." Combat: the basilisk (won, 464 experience each, its
treasure left); 0x4a31 = 64. East along the corridor to (13,5), Search on, south into the Philosophy
stacks (13,6): "YOU FIND FYERDETHA'S DISCOURSES ON POWER ... AS ENTRY 7.", "DO YOU TAKE IT?" Yes
(0x4a2f = 1). Search off.

The theurgist's one Knock is spent, and the door locks again behind the party (the guide's warning:
"possible to lock yourself inside"). Encamp, Rest one day: her spells come back without Knock. Magic,
Memorize: the first choice queued Stinking Cloud ("Memorize these spells?" No); again, one row up,
Knock: Yes, and Rest the 4 hours 30 it needs. Exit camp.

North by (13,5), west along the corridor to (8,5) and north to (8,2) facing north; a step north starts
the spectre's fight (the recorder settles through its text; won, 290 each), and 0x4a31 becomes 96:
both halves of the clear. "Locked. Bash Knock Exit": Knock, and the party stands at (8,1) outside the inner rooms.
Encamp, Save in slot F (No to Quit to DOS), Exit. 189 commands.

Commission #3 is due at the clerk. Slot F, written by this walk, is the save the next section loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-library-cleared npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
