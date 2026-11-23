# Stojanow gate ambush

This focused branch fixture derives from the tracked
`stojanow-mage-barracks-alarm/A.json` save. Its two SAVGAM edits set the
cleared-barracks flags in ECL variable 0x4a77 (0 to 12 at save offset 0x2ef)
and move the party's x coordinate from 4 to 7 (offset 0x3201). The party
starts at (7,8) facing north. The native script, map, party, and other save
bytes match the source fixture.

The `stojanow-bugbear-gate-ambush` presentation route uses ordinary Up to
reach ECL2:9:ad1f, checks the close approach and held loop, and uses Combat
then Enter to reach the original battlefield. The checkpoint SHA-256 is
`e775b4b0ee0c3077ce6782f0ae5bc0cf6ba141678487cfa82ce4138c941b998b`.
