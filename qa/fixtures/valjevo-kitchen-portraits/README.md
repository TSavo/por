# Valjevo kitchen portraits

Slot B starts outside the kitchen in Valjevo Castle area 4. `Up` opens the
smoky entrance prompt. Two Enter presses take the first menu choice and show
the gnoll fleeing. The following Enter clears the portrait as the captives
leave and one approaches the party.
On the choice menu, two End presses highlight **Talk to the overseer**.
Enter shows the warning, then another Enter returns to the choice menu.
Choosing **Talk to the overseer** again triggers the oil throw and an Enter
press advances to the damage notice.

The GOG 1.3 trace identifies ECL5.DAX block 4 producer `a728` and PIC5.DAX
block 73 at `9a5a/a7a7`, `9a5a/a862`, `9a5a/aa89`, and `9a5a/aad4`.
All four prompts repeat members 0 and 1,
holding them for 1510 ms and 510 ms respectively.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/valjevo-kitchen-portraits/B.json <chrome> <route>`
with `POR_GAME_SOURCE=original` and `POR_GAME_SOURCE=port`. Use the routes
`valjevo-dungeon-kitchen-entry-loop`, `valjevo-dungeon-kitchen-rescue-loop`,
`valjevo-dungeon-kitchen-warning-loop`, and `valjevo-dungeon-kitchen-oil-loop`.
Set `POR_HELD_PORTRAIT_CHROME_TRACE` to capture the painted sequences.
