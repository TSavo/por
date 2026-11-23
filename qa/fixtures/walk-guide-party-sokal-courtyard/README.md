# Win the Sokal courtyard fight with the prepared guide party

The walk loads [the earned rest checkpoint](../walk-guide-party-sokal-rest/README.md), slot B at
the New Phlan inn. The party has prepared spells and keeps its Curate. The replay uses the
recorded native inputs with developer combat disabled.

Take the boat to Thorn Island, recover the parchment, and pass the undead patrol. The party
casts Bless before entering the courtyard, then fights the ambush using native Quick combat.
The battle goes past the poll that previously stopped the live runner (#254). The party wins
and each character receives 281 experience points.

The party copies the dispatch as Journal Entry 57 and resumes exploration at (8,5 W).
Aelar, Finn, and the Curate are at 0 HP. The original save command writes slot D at input 891.
The save retains the courtyard victory, the journal entry, and the active Sokal commission.
It is the checkpoint for continuing to Ferran.

GOG 1.3 and bundled runs on `e2abdc2b` produced byte-identical inputs, prompt schedules, visit
traces, battle and aftermath snapshots, and slot D. There are 893 commands, including the
polls while the guest plays Quick combat. The D SHA-256 is
`e4172fbf8c3f147f4e08166b30cde96568741c406dc7593ac1d833e100c8ee6d`.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-sokal-courtyard npm run verify:port-parity
```
