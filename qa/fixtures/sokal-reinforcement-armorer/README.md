# Sokal courtyard reinforcement replay

Slot D was earned by six characters created by the bundled game's fresh-party replay. They completed Ohlo's errand, cleared the Slums goblin room, readied Fenn's short sword and sold the identified armor at the New Phlan armorer. The replay reloaded the slot and checked Alda's 39 platinum before these bytes were copied.

Run from the repository root:

    node tools/verify-fresh-party.mjs --sokal-reinforce-from-slums qa/fixtures/sokal-reinforcement-armorer/D.json --fight-to-end

The route buys Enna's bow, hires the swordsman and curate, sails to Sokal and checks the manual sword and bow attacks. After the player resumes automatic combat, the replay advances the original battle one page poll at a time until the defeat screen. To reproduce the starting save, run the bundled game with `--fresh-sokal-reinforced` and take slot D when the replay reports the proceeds of the goblin armor sale.
