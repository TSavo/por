# Secure the lizardfolk elder’s pledge and collect the reward

The walk loads [slot J outside the L-shaped ruin](../lizardman-keep-elder/README.md) at (4,8 N).
The party reached the keep from the earned river checkpoint through ordinary travel and has
Journal Entry 35. The river reward is due, and this branch reached the elder before the clerk offered the lizardfolk commission.

Step north, choose Parlay, and answer the original friend-word challenge using Entry 35. Hear
the elder’s story and accept his request for a champion. Alda ends the native duel at 0 HP.
The original game still has the elder pledge to keep his people out of Tyranthraxus’s alliance.
The recording preserves that result and disables developer combat.

Native slot A is written at command 26 just after the farewell. Lizardfolk completion flag
`0x4ab5` is 254 and the journal records the elder’s pledge. Leave by the south drawbridge, flee the wild
kobolds at (35,10), and take the ferry at (35,29) to New Phlan. Decline to break into City Hall
after closing and rest 15 hours at the inn.

The clerk first settles the library, the book of discourses, and the river. She then rewards
the party for averting the lizardfolk alliance. Share and Exit, then finish the new offers.
Native slot B is written at command 201 with `0x4ab5` set to 255. It keeps the elder’s pledge
and the journal’s `commission-lizardmen` turned-in status. The complete recording has 203
commands, including three waits for the stock game to finish advancing.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-lizardfolk-pledge npm run verify:port-parity
```
