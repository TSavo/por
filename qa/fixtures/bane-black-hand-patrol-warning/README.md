# Temple of Bane Black Hand patrol warning

This historical entrance save starts on the rampart at (15,4), facing west.
It is the pre-combat entrance checkpoint, before the later diagnostic version
with increased party hit points. This replay uses ordinary Up and Down
keys, keeping the native timing and encounter rolls. On step 99 the Black Hand
patrol stops the party. The same schedule reaches the warning and the
following spear-ready menu in GOG 1.3 and bundled data.

Both native traces report ECL1 block 24 at ae96, map 31, and no portrait for the
warning. Enter continues to the original encounter menu at aeda.

The same slot also starts the outdoor camp ambush replay. At (15, 4),
Encamp, Rest, Hours, six Increases then Rest triggers the Orc attack at 03:03.
The active map is 31 and the square's native roof bit is clear. The camp
prompt timing is in `camp-prompts.jsonl`.

The three rampart patrol replays reuse this save. Fixed clock starts elicit
the Goblin, Orc and Ogre holds through the original encounter rolls. Their
individual prompt schedules record the ordinary walking and approach inputs.
