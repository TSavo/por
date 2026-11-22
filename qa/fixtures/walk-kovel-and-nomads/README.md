# The commission chain, section 4: Kovel Mansion cleared and the nomads joined

The fourth section of the walk through the council's commissions in the clerk's order (#111, #130),
from the Zhentil route's third section. Recorded on 2026-11-22 from `game/` (version 1.3's game, the
port's own data) with `node tools/record-walk.mjs qa/fixtures/walk-commission-5-reward/after I
qa/fixtures/walk-kovel-and-nomads`: everything the `leg` walk of `npm run verify:port-parity` needs
to play it again, and nothing of the original game.

- `I.json`: slot I, the save the walk loads, written at the end of section 3
  (qa/fixtures/walk-commission-5-reward): the party at the clerk (5,5) in City Hall, #5 turned in,
  the clerk having just offered #1, #3 and #6 (the Bishop's summons, offered once: 0x4a9b = 254).
  `A.json` to `H.json` and `roster.json` are the other saves on that disk.
- `after/`: the saves as the walk left them, with slot J written at its end (tools/record-walk.mjs).
- `boot.json`, `commands.jsonl`, `prompts.jsonl`, `visits.jsonl`, `last-screen.txt`: as for every
  recorded walk. Every fight is won with the developer's command.

**Kovel Mansion (#7).** Through New Phlan to the harbor master (11,1), passage to the Bay (the first
member pays), the boat at the end of the pier, and at the landing ("YOU ARE ON THE EASTERN EDGE OF
THE CITY") North into Kovel Mansion at (15,4). North and west along row 1 to (10,1); the locked door
south bashed to (10,2); south to (10,3) and west. The locked door west of (9,3) bashed: "A THIEF
WITH A SWORD COMES OUT OF NOWHERE" at (8,3), Attack him (won, 2 experience each, the treasure left).
The locked door west of (7,3) bashed: the second thief at (6,3), the same. At (4,3) "A SCYTHING
BLADE DROPS ACROSS THE DOORWAY" (FENN hit for 6). South to (4,4), west to the pile of weapons at
(3,4): Take some, the ambush (won, 611 each). Back to (6,3), the locked door south bashed, (6,4),
and location 15 at (6,5): "TWO THIEVES COME OUT OF NOWHERE ... WILL YOU CHASE THEM?" Yes; at (9,8)
they split: South, the big ambush (won, 263 each). The party stands at (8,13) with the script's kill
count 0x4a45 at 22 and Kovel's reward flag 0x4ab2 at 254 (the clerk pays at 21 kills: ECL3.DAX
block 14). Out the way it came: north to (8,8), east, north through the doors at (9,3) and (9,1)
(both bashed open), east along row 1, south to (15,4) and east to the landing.

**The nomad camp (#8).** Leave the landing for the wilderness at (26,27); north (the north edge of
the city: Leave) and on north to (26,11), west to the camp at (25,11): Enter. Into the camp at
(2,14), east, north: "YOU TRIP ON A WIRE TO THE ACCOMPANIMENT OF BELLS TINKLING" (it is after 14:00:
ECL7.DAX block 17 at 9f15), Advance cautiously, the crowd, "THE NOMADS WAIT FOR YOU TO MAKE THE
FIRST MOVE": Parlay. The headman: "WE WILL GIVE A FEAST IN YOUR HONOR TOMORROW. WILL YOU JOIN US?"
Yes (0x4a7c bit 1, a52a): lodging in a hut at (9,12) and the camp menu. A rest of six days is broken
by the next morning's script: the games, the feast, Hassad Ahwal's talk (journal entry 55), the
headman's worry about kobolds and "PLEASE THINK ABOUT IT OVERNIGHT". Back in the hut, a rest of one
day: "ABOUT MY REQUEST OF LAST NIGHT, WHAT IS YOUR DECISION?" Leave: the party joined the feast and
leaves, so the script stores 254 in the nomads' reward flag 0x4ab7 (a1ef). Leave the camp at
(25,11), Encamp, Save in slot J (No to Quit to DOS), Exit. 207 commands.

Both commissions are now due at the clerk (her reward flags at 254); neither was offered by her, so
the journal (src/runtime/commission-journal.ts) names them only when she reports them.

Slot J, written by this walk, is the save the next section loads.

`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-kovel-and-nomads npm run verify:port-parity`
plays it once from the 1.3 files and once from `game/` and compares the Enhanced artwork of every frame.
