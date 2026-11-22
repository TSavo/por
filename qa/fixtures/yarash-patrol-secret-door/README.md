# Yarash's Pyramid patrol from the secret door

Slot A places the party at (3,12), facing south on the upper level of the pyramid. The checkpoint comes from the existing east-approach patrol save, with only the saved position and heading changed. The map, scripts, patrol state, and party are the same.

Walk south, acknowledge the secret-door discovery, and walk south into the patrol's square at (3,13). The encounter opens at distance 2 with “Foul servants of Yarash!” Advance once to distance 1 to hear “You must be the servants of Yarash!” and again to reach the existing close approach. The first two prompts draw approach sprites with the corridor still visible.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/yarash-patrol-secret-door/A.json "<Chrome executable>" pyramid-lizardfolk-patrol-from-secret-door` with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. For original data, set `POR_GAMEDATA` to the GOG 1.3 files.
