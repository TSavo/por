# Ohlo's loot portrait restoration

Slot H comes from the Fresh Party walkthrough after taking the pouch from the Rope Guild merchant. The control places the party outside Ohlo's study at (14,10) facing west. Only those three position bytes were changed.

Enter the study, choose Give, and continue to the loot menu. View the selected party member, then Exit back to the loot menu. The resident redraw restores the same treasure portrait.

The focused Chrome route is `loot-view-portrait-restore` with this checkpoint. The corresponding camp route is `camp-view-portrait-restore` with [the Guide Party checkpoint](../guide-party-new-phlan/A.json). Both use `tools/verify-slums-presentation.mjs`. Set `POR_GAME_SOURCE` to `original` or `port` and `POR_HELD_PORTRAIT_CHROME_TRACE` to a separate output file for each run.
