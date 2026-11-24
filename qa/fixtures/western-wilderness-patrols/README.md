# West Wilderness encounters

Slot G holds the campaign party at (12,9) facing east, in ECL6.DAX block 25. To reproduce the save, run the first 102 commands of the wilderness-walk fixture using its first 103 prompt records. The party leaves the Cave of Diogenes and takes two steps east. At that point choose Encamp, Save, G, No.

Each scenes.json row gives the clock at boot, the number of alternating Up and Down movements (start with Up), the voiced variant chosen by the script, and the expected Enhanced approach sprite. Run a row with:

    node tools/acceptance/narration-wilderness-approach.mjs western <clock> <new-output-directory>
