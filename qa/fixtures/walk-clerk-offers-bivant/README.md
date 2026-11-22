# The commission chain, section 11: the clerk pays the library and the river, and offers #12

The eleventh section of the walk through the council's commissions in the clerk's order (#111, #130).
Recorded on 2026-11-22 from `game/` (version 1.3's game, the port's own data) with
`node tools/record-walk.mjs qa/fixtures/walk-yarash-pyramid/after E
qa/fixtures/walk-clerk-offers-bivant`: everything the `leg` walk of `npm run verify:port-parity`
needs to play it again, and nothing of the original game.

- `E.json`: slot E, the save the walk loads, written at the end of section 10
  (qa/fixtures/walk-yarash-pyramid): the party on the wilderness map at the hidden rowboat (19,14),
  with #3 (the library) and #10 (the river) due. `A.json` to `D.json`, `F.json` to `J.json` and
  `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot D written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk.

Back the way section 10 came, west and south to the west boat (20,29): "THERE IS A BOAT HERE THAT
WILL TAKE YOU BACK TO THE CIVILISED SECTION OF PHLAN." Take boat. From the pier (15,1) west and
south to City Hall's door (4,3) at 18:05: "THE DOOR IS LOCKED. DO YOU WANT TO BREAK IN?" No. South
to the inn (4,12): "'IT WILL COST YOU 1 PLATINUM PIECE TO REST HERE. DO YOU WANT TO STAY?'" Yes, the
first member pays. In the inn's camp the theurgist memorises Knock again (Magic, Memorize, one row
up from where the highlight starts, Yes) and the party rests until 10:46. Back north; City Hall is
entered from the west at (4,4) (the party turns to face south), south and east to the clerk (5,5):

- "'THERE IS A REWARD FOR CLEARING THE LIBRARY.' HERE IS YOUR REWARD.'", "THEURGIST takes and hides
  his share.", 178 experience each, Share, Exit.
- "THE CLERK SPEAKS. 'WE FIND THESE DISCOURSES VALUABLE. HERE IS YOUR REWARD.'" (Fyerdetha's book),
  57 each, Share, Exit.
- "THE CLERK SPEAKS. 'WITH THE CLEARING OF THE STOJONOW RIVER, WE CAN OPEN UP THE HINTERLANDS FOR
  TRADE. HERE IS YOUR REWARD.'", 4892 each, Share, Exit.

Then the offers: #1 ("THE SLUMS IMMEDIATELY TO OUR WEST NEED TO BE CLEARED OF MONSTERS."), #11 ("A
TRIBE OF LIZARDMEN IS PREPARING TO JOIN THE ENEMY. PREVENT THIS.") and **#12**: "THE HEIR TO THE
HOUSE OF BIVANT MUST BE RESCUED. WE WILL PAY GENEROUSLY FOR HIS SAFE RETURN." The offer itself sets
0x4a8c to 255 (ECL3.DAX block 8 at acfa), which puts the Buccaneer Base on the wilderness map.
0x4ac2 (#3) and 0x4ab3 (#10) are 255: paid. Encamp, Save in slot D (No to Quit to DOS), Exit. 148
commands.

Slot D, written by this walk, is the save the next section (the Buccaneer Base) loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-clerk-offers-bivant npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
