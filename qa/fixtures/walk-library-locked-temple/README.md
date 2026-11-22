# The commission chain, section 7: Mendor's Library locked, and the Temple of Tyr

The seventh section of the walk through the council's commissions in the clerk's order (#111, #130).
Recorded on 2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-clerk-pays-three/after J
qa/fixtures/walk-library-locked-temple`: everything the `leg` walk of `npm run verify:port-parity`
needs to play it again, and nothing of the original game.

- `J.json`: slot J, the save the walk loads, written at the end of section 6
  (qa/fixtures/walk-clerk-pays-three): the party at the clerk (5,5) after she paid #7, #8 and #9 and
  offered #1, #3 and #10. BRIN, CORA and ENNA are at 0 hit points. `A.json` to `I.json` and
  `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot H written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

**To the library (#3, the books).** The harbor master's Bay passage, the landing, Leave, west to the
city's western edge (24,28), South into the Textile House at (0,4). East along row 5: "SCORPIONS
APPROACH HUNGRILY." at (8,5) (won, 128 experience each). North at (13,4), east out at (15,4) into
Mendor's Library at (0,4). North to (0,1), east along the north corridor to (8,1): the door south to
(8,2) is "Locked." (Bash Exit). Ten Bash attempts fail, some after stepping away and back. Round by
the west corridor and the south corridor to (9,14): the door north to (9,13) is locked too. One Bash
fails, and after that the door no longer asks: "up" against it changes nothing, even after a step
off to (9,15) and back. The rooms behind these two doors (the stacks, the basilisk, the books) are
reached only through them (GEO2.DAX block 15). With three of the six unconscious, no one offers to
pick a lock.

**To the temple.** West along the south corridor, north up the west corridor, out at (0,4) into the
Textile House at (15,4). West along row 5: "SOME GHOULS DECIDE TO ADD YOU TO THEIR MENU." at (10,5)
(won, 360 each). Out at (0,4), Leave. South and west: at (21,29) "YOU SURPRISE A GROUP OF LIZARD
MEN" (Combat, won, 32 each); at (20,29) "THERE IS A BOAT HERE THAT WILL TAKE YOU BACK TO THE
CIVILISED SECTION OF PHLAN": Take boat. From the pier (15,1) west to (11,1), south to (11,2), and
south to the Temple of Tyr (11,3): "THE PRIESTS OF TYR WELCOME YOU TO THE TEMPLE.' DO YOU SEEK
HEALING?'" Yes, Pool. Cure Light Wounds (100 gold pieces) for BRIN (0 to 2) and CORA (0 to 1); Cure
Critical Wounds (600) for ENNA, FENN, CORA, ALDA (already whole) and BRIN. Everyone is whole again:
6, 6, 6, 6, 6 and 8 hit points. Share, Exit. Encamp, Save in slot H (No to Quit to DOS), Exit. 372
commands.

Slot H, written by this walk, is the save the next section loads: the whole party at the Temple of
Tyr (11,3), the library still to do.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-library-locked-temple npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
