# Slums encounter portrait checkpoints

Each slot B is a controlled copy of [orc-guards-B.json](../slums-lesson-and-guards/orc-guards-B.json). Only the starting position and facing change. The party, door states and quest flags come from the original save.

| Checkpoint | Start | Normal input | Native hold |
| --- | --- | --- | --- |
| `feeding-B.json` | (6,0) east | Up | `b6df/a4f8`, `PIC2.DAX:0` |
| `guards-B.json` | (2,11) east | Up, Bash | `b6df/ac2f`, `PIC2.DAX:2` |
| `grain-B.json` | (0,13) south | Up | `b6df/b0ec`, `PIC2.DAX:31` |

Use `slums-feeding-kobolds-hold`, `slums-goblin-guard-alert-hold`, and `slums-grain-sack-hold` with `tools/verify-slums-presentation.mjs`. The original hold decides which picture appears before combat. The replays sample the hold without input.
