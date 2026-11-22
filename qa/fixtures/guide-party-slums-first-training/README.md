# The guide's party after six Slums locations and the cleric's training

A saved game of GOG version 1.3 (`H.json` is slot H, `roster.json` the characters on the save
disk), written by the game's own Save command. It holds a saved game and nothing else: no file of
the original game is in this folder.

## What it holds

The party of `qa/fixtures/guide-party-new-phlan`, standing at the New Phlan gate to the Slums,
(0,4), after:

- the orcs at (13,1), the goblin armsmaster at (10,1), the kobolds at (7,0) and the hobgoblins at
  (0,2), each won with all six standing (4 of the block's clear points), and the random fights
  met on the way;
- the stable's leather bag, the secret treasure room at (0,0) and the hobgoblins' valuables;
- ELSPETH's training to a level 2 cleric for 1000 gold pieces.

The others are level 1. FINN wears the Bracers AC 6 and carries the goblins' Leather Armor +1;
ELSPETH wears the Ring of Protection +1.

## How it was produced

By `tools/acceptance/slums.mjs`, test `guide`, stages `orcs` to `train`, pressing the keys a
player presses and reading each screen; no developer command, no memory edit, no edited save:

    POR_GAMEDATA=/Users/tsavo/por-assets/gog-1.3/POOLRAD POR_AUDIO_DIR=/Users/tsavo/por-assets/original \
    POR_CLOCK=fixed POR_SLUMS_GUIDE_KEEP=<dir> POR_SLUMS_GUIDE_UNTIL=train node tools/acceptance/slums.mjs guide

`H.json` and `roster.json` are the files that run left in `<dir>` on 2026-11-21. The run starts
from `qa/fixtures/guide-party-new-phlan` and takes about 25 minutes.

## How to start from it

    POR_SLUMS_GUIDE_FROM=orchome POR_SLUMS_GUIDE_SAVES=qa/fixtures/guide-party-slums-first-training \
    node tools/acceptance/slums.mjs guide

or, in a test, `loadParty(options, "qa/fixtures/guide-party-slums-first-training", "H")`.
