# Notes on the artwork worklist

For the artwork agent. When something in `docs/ART-WORKLIST.md` is wrong, add one line here and commit it:
the key, what you saw, and where (area, square, facing, or the replay). Two kinds of thing belong here:

- an item listed to do that cannot occur in play;
- art of yours under a key the worklist neither lists as needed nor accounts for
  (`areas[].unaccountedKeys` in `qa/art-worklist.json` already lists the ones the tool knows it cannot account for).

Whoever maintains `tools/art-worklist.ts` reads this file and fixes the tool. Do not fix the worklist files by hand.

## Notes

