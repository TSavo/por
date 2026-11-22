# Kobold Caves wyvern at the rubble slope

Slot A places the party at (14,9), facing west. The checkpoint comes from the existing wyvern encounter save with only the party's position and heading changed. Walk west onto the steep rubble slope and choose Yes. The noise draws the wyvern to the party, which triggers the ambush at `ECL8.DAX:13:aa66` and the held prompt at `b511/aa75`.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/kobold-caves-wyvern-slope/A.json "<Chrome executable>" kobold-cave-wyvern-ambush-loop` in both `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port` modes. For the original run, set `POR_GAMEDATA` to the GOG 1.3 files.
