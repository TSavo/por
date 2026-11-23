# Sneaking past a Podol patrol

`I.json` differs from `../podal-patrol-portraits/I.json` only at byte 619
of the decoded DOS save. It sets ECL global `4a35` to 2, the value written
when selecting **Sneak, Remaining Unseen** at the plaza entrance.

At fixed clock 4320000, thirteen alternating Up and Down inputs from
(10, 10) trigger the goblin patrol's acknowledgment at (11, 10).
The middle-distance sprite remains visible through the acknowledgment.
