# Disguised Podol patrols

`I.json` uses the party and position from `../podal-patrol-portraits/I.json`
at (10, 10) facing east. The only change is byte 619 of the decoded DOS save.
It sets ECL global `4a35` to 1, the value written when the party chooses
**Disguise Party as Monsters** at the plaza entrance. The source checkpoint's
value of 255 sends the same movement into the hostile encounter menu.

Use this save for the three patrol walk-on routes, the ogre identity demand,
and the four overheard patrol routes. Use the source checkpoint for the
rest ambush.
