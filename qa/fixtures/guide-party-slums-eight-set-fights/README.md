# The guide's party after eight of the Slums' nine set fights

A saved game of GOG version 1.3 (`D.json` is slot D, `roster.json` the characters on the save
disk), written by the game's own Save command. It holds a saved game and nothing else: no file of
the original game is in this folder.

## What it holds

The party of `qa/fixtures/guide-party-slums-first-training`, standing in the Slums at (4,10), in
the room behind the goblin guards, rested, after four more set fights and one more treasure:

| Stage | Fight | Result on 2026-11-22 |
| --- | --- | --- |
| `orchome` | the orcs' home at (3,3): 16 ORC, 4 ORC LEADER | won; 2 of 6 standing, 4 Unconscious; 412 experience points for six |
| `guards` | the guards at (0,7): 30 ORC, 2 ORC LEADER | won; 4 of 6 standing, 2 Unconscious; 99 for six |
| `leaders` | the monster leaders at (1,5): 1 OGRE, 2 GNOLL, 2 HOBGOBLIN LDR | won; 5 of 6 standing, 1 Unconscious; 63 for six |
| `goblinguards` | the goblin guards at (3,11): 12 GOBLIN GUARD, 11 GOBLIN LEADER | won; 2 of 6 standing, 4 Unconscious; 65 for six |
| `chest` | the hidden chest at (4,10) | 383 experience points, 2 gems, 200 platinum, Shield +1, a magic-user scroll |

Nobody has died. Eight of the nine set fights are won (the trolls at (0,14) are not fought), Ohlo
has not been met, and the random fights met on the way are counted by the script. ELSPETH is a
level 2 cleric and wears the orcs' Chain Mail +1 with her Ring of Protection +1; the others are
level 1. FINN carries the chest's Shield +1 on his arm and its scroll.

## How it was produced

By `tools/acceptance/slums.mjs`, test `guide`, stages `orchome` to `chest`, from
`qa/fixtures/guide-party-slums-first-training`, pressing the keys a player presses and reading
each screen; no developer command, no memory edit, no edited save:

    POR_GAMEDATA=/Users/tsavo/por-assets/gog-1.3/POOLRAD POR_AUDIO_DIR=/Users/tsavo/por-assets/original \
    POR_CLOCK=fixed POR_SLUMS_GUIDE_SAVES=<dir> POR_SLUMS_GUIDE_KEEP=<dir> \
    POR_SLUMS_GUIDE_FROM=orchome POR_SLUMS_GUIDE_UNTIL=chest node tools/acceptance/slums.mjs guide

with `<dir>` a copy of that fixture. The stages were run one or two at a time, each from the slot
the one before had saved; a fight does not come out the same on every run.

## How to start from it

    POR_SLUMS_GUIDE_FROM=ohlo POR_SLUMS_GUIDE_SAVES=qa/fixtures/guide-party-slums-eight-set-fights \
    node tools/acceptance/slums.mjs guide
