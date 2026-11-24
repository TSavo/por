# Journal entry 53 in the Wealthy Area

The party starts at the east gate of the Wealthy Area (15,4 W) in the
[Braccio ferry walk's earned slot C](../walk-braccio-bane-ferry/README.md).
Dirten is in the party and the Temple of Bane commission is accepted. The
escort room belongs to the Wealthy Area (GEO1 map 31, ECL1 block 24).
Crossing west into the Temple proper takes the party away from this room.

The recorded walk follows WSSWWWWWNWWWSS. Entering the mansion at (14,5)
starts an orc fight. The party wins with native combat, closes the loot
menu, continues north of the escort room and saves A at (6,7 S). The
109 recorded inputs include the polls for the computer's turns. Developer
combat is disabled throughout the walk.

Run the gameplay check from this directory's slot with
`node tools/verify-fresh-party.mjs --bane-entry53-checkpoint` at the
repository root. One step south brings up the six orcs and their ogre
leader. After 48 Quick inputs the party can end the battle. The Theurgist
takes his share and each character receives 49 XP. Leaving the remaining
treasure brings up the paper. The journal retains entry 53 after saving
and reloading D. Reloading the original slot A keeps the discovery hidden.

To compare the recorded approach on the original and bundled 1.3 data,
set `POR_GAMEDATA` to the original folder and run
`POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-bane-entry53 npm run verify:port-parity`.

The paired approach check matched all 110 frames, including Enhanced artwork.
