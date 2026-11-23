# Buy Bivant’s heir’s freedom and claim the council reward

The walk loads stock slot D produced by [the prior clerk walk](../walk-clerk-offers-bivant/README.md).
The party has the rescue commission and the boy is still in the pen. Developer combat is disabled.

Take west passage at New Phlan’s harbor and stay at the western landing. Walk to the Buccaneer Base
at world square (12,31) and follow the mounted escort inside. Recognize the boy by his birthmark
and choose Say Nothing. Buy the pass from the seedy man at (2,11) and take it from the treasure list.
Show the pass outside the captain’s quarters. Mention the young boy, buy his freedom, and accept the
handoff. Walk through the front gate to the same world square. The route out of the base starts no
fights.

Slot B is the native save written at command 112 after clearing the gate. Rescue flag `0x4aa9` is
254, and the journal records the commission as ready to report. On the way to the western boat the
party flees one wilderness boar encounter without losing HP. Take the boat back to the New Phlan
pier, then report to the City Hall clerk at (5,5 E).

Share the reward, return to the treasure when prompted, and take the Two-Handed Sword +1 (+3 versus
undead) and four clerical scrolls. The journal keeps the commission reward pending until the
treasure is claimed. The clerk then offers Lord Cadorna’s diplomatic commission and sends the party
to the south door.

The complete walk uses 180 keys. The native slot C in `after/C.json` was saved at key 178.
Rescue flag `0x4aa9` is 255, the journal shows `commission-rescue` turned in, and referral flag
`0x4a98` is 254. The party is in City Hall before visiting Lord Cadorna.

To compare the two 1.3 data modes, run

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-buccaneer-bivant-purchase npm run verify:port-parity
```
