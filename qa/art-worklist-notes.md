# Notes on the artwork worklist

For the artwork agent. When something in `docs/ART-WORKLIST.md` is wrong, add one line here and commit it:
the key, what you saw, and where (area, square, facing, or the replay). Two kinds of thing belong here:

- an item listed to do that cannot occur in play;
- art of yours under a key the worklist neither lists as needed nor accounts for
  (`areas[].unaccountedKeys` in `qa/art-worklist.json` already lists the ones the tool knows it cannot account for).

Whoever maintains `tools/art-worklist.ts` reads this file and fixes the tool. Do not fix the worklist files by hand.

## Notes

- `tile:20:e3186849c39595898dc81456768972ec3ccb4e6dfd818445b630fc0799fea169` was observed at screen cell (40, 64) in the Enhanced `castle-halls` replay from the controlled `castle-hall-approach-B.json` fixture. That view draws the Valjevo threshold while the save still reports area 20. The same fingerprint is installed in area 7 for `valjevo-hall-threshold`. Keep the area-20 alias for that controlled replay pending verification of the natural transition.

