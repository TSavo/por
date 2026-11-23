# Bane mansion captive goblins

Slot A was saved from the bundled 1.3 game at map 31, (14,7) south, with
ECL1 block 24 active. The preceding mansion warband was cleared with the
developer victory command to stage the checkpoint. The party then walked
two tiles south and used the normal Encamp save menu. The replay itself
has developer combat disabled.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/bane-captive-goblin-held/A.json /usr/bin/google-chrome bane-captive-goblin-held`
with each data source. Up opens the captive goblins' decision at `a076`.
The original guest draws two distinct poses for 310 ms each. Let Them Go
releases the hold and shows the temple-symbol clue.

The party’s saved area ID is 24 even though its map ID is 31. The replay
checks the art bindings for area 24 at the held menu and release.
