# Rest and spell preparation before Sokal

The walkthrough loads the earned slot A written by
`qa/fixtures/walk-guide-party-sokal-training`. At the native hiring hall,
the party checks one more offer pool. The hall offers Evokers, Swordsmen,
a Warrior, a Curate, and a Robber. No Theurgist is offered. The party
declines the offers and keeps its existing Curate.

The party pays for two hours of rest at the inn. It checks the spell
lists through Magic and Cast, then saves slot B at (4,12) facing south,
08:07. Aelar, Brennan, Caelum, Dorian, and Finn each have one Sleep
memorized. Elspeth has four Cure Light Wounds. The Curate has two Bless,
two Hold Person, three Cure Light Wounds, Slow Poison, and Spiritual
Hammer. The 198 inputs include load and save. No battle is fought.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-sokal-rest \
  npm run verify:port-parity
```
