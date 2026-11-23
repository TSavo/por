# Sokal Keep smithy frog checkpoint

`C.json` is a save made in `game/`. The party is at (13,6) facing east in the Sokal Keep smithy
after entering the southern door and crossing to the next square. The game's smithy counter
has advanced to two. Up triggers the frog encounter at (14,6). The original options are Combat,
Wait, Flee, and Advance.

The save starts from `qa/fixtures/campaign-sokal-leg` and replays its first 87 recorded commands,
ending at (7,11) facing west with the undead password accepted. From there, these commands
reach the smithy, pass the patrols with Yes, and save through Encamp, Save, and slot C.
The recorded leg's legacy keyboard polling applies to the sequence.

```text
right right up up up left up up up up up y up right right
y right up up up left up right e s s c
```

The focused frog replay loads slot C with normal input. Up displays the existing Enhanced frog
sprite. Advance and Wait each reach the native battle notice with the same sprite, and Enter
starts combat.
