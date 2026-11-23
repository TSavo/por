# Pitt vertical-menu portrait replay

Slot I starts outside the Pitt in Podal Plaza. Open the patron portraits and
advance from either animation member to verify it remains visible while the
vertical menu waits. The second menu follows the insult prompt.

Run `node tools/verify-pitt-menu-poses.mjs <chrome> <output-dir> <member>`
for members 0 and 1, with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`.
Use a separate output directory for each run. The script saves the captures
and measured holds in that directory.
