# East Wilderness encounters

Slot G is the party at (32,9) facing east, in ECL8.DAX block 27. To recreate it, replay the committed wilderness-walk fixture with its boot and prompt schedule. At its last screen choose Encamp, Save, G, No. The game writes G at its ordinary save prompt.

Each row in scenes.json gives the initial fixed clock and the number of alternating Up and Down movements, starting with Up. The script rolls the encounter and chooses its creature. The selected variant identifies both its opening line and creature. Run a row with:

    node tools/acceptance/narration-wilderness-approach.mjs eastern <clock> <new-output-directory>
