# Textile House return saves

`D.json`: the walkthrough's six dwarves in the ogre chief's room of the Textile House (area 2, 12,14
facing south) with Cadorna's iron box taken unopened and the courtyard cleared. It is
`qa/fixtures/walk-commission-5-reward/H.json` (the end of qa/fixtures/walk-textile-house-cleared)
saved again in slot D, the save
`node tools/verify-fresh-party.mjs --textile-sealed-return-checkpoint qa/fixtures/textile-return/D.json [--train-after-reward]`
starts from (#151, #167): the west ferry home, the City Watch's handoff, the council's reward, and with
`--train-after-reward` Alda's gems and jewel sold at the Temple of Tyr and his training to level 2.

Made on 2026-11-22 with `node tools/record-walk.mjs qa/fixtures/walk-commission-5-reward H <dir>` from
`game/`: Encamp, Save, then D (the second `s` reaches the slot menu, which ignores it).
