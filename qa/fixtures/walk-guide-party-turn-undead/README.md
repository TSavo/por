# Dorian turns the Graveyard skeletons

Load the guide party’s earned Graveyard entrance save in slot A. Walk east to the claws at (6,4), take back manual control, and guard with Finn, Caelum, Aelar and Brennan. On Dorian’s turn press T. The game reports that Dorian turns undead and that a skeleton is forced to flee. The remaining inputs are polls as the game resolves the round and returns control to Aelar. Developer combat is disabled.

Run `node tools/verify-combat-reports.mjs /usr/bin/google-chrome turning` with `POR_GAME_SOURCE=port`, or with `POR_GAME_SOURCE=original` and `POR_GAMEDATA` pointing to the GOG 1.3 files. The check reads the visible Enhanced text panel and requires the turning announcement before the forced flight.
