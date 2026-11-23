# Middle Wilderness roaming encounter replays

Slot A is the checkpoint used for the GOG patrol traces near (23,7) and (23,8). The 19 records in `scenes.json` retain the shortest observed input sequence, fixed DOS clock, native script producer, settled caption, sprite placement, and trace directory name. The two terrain windows were recorded from the local terrain frame at the held prompt.

Run each route with both `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. For original data, set `POR_GAMEDATA` to the GOG 1.3 game files. For example, `node tools/verify-overland-encounter-sprite.mjs /usr/bin/google-chrome middle-wilderness-a230-kobolds out` verifies the settled caption, the exact sprite and served PNG, the local WebGL terrain, and the transition into battle. The replay writes the held screenshot, terrain screenshot, battle notice, and receipt to a new output directory.
