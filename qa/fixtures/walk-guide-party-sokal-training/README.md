# Training and recruitment before a second Sokal attempt

The walkthrough starts from the earned Slums reward in slot I, kept in
`qa/fixtures/guide-party-slums-closure/after`. The party has 2,560 gold
pieces' worth of gold and platinum. It pools the money normally, pays for
Elspeth to train to Cleric 3, and pays for Brennan to train to Fighter 2.
Elspeth reaches 26 HP and Brennan reaches 13 HP. The native hall offers a
Curate who joins the party with 26 HP. This pool offers no Theurgist.

The 278 recorded inputs include loading I and saving the trained party to
slot A at New Phlan's west gate. The party earns and spends its own money,
uses the original trainer and hiring menus, and fights no battle here.
Slot A is the only save stored for this leg.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-sokal-training \
  npm run verify:port-parity
```
