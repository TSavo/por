# Recruit Dirten and take the Bay ferry toward the Temple of Bane

The walk loads [the earned lizardfolk council-reward slot B](../walk-lizardfolk-pledge/README.md)
at City Hall (5,5 E). The starting journal already records the Bishop of Tyr’s summons.
The party travels by the original menus with developer combat disabled.

Visit the harbor master, decline passage for now, and proceed through Tyr’s healing entrance
to Bishop Braccio’s study (10,5 W). Hear the invitation and choose Yes. The original game adds
Dirten to the party and writes `0x4a9c = 255`. The journal advances commission #6 to accepted.

Return to the harbor master (11,1 N), choose Bay, and pay for the passage. Walk to the end of the
pier and board. At the eastern landing, choose South to enter the wealthy district rampart
(script area 24, map 31, 15,4 W). The Temple of Bane itself is farther west on map 24.

The party writes native slot C at input 69. It retains Dirten, the accepted commission, and the
previous council rewards. The original menu resumes after the last two inputs, for 71 in all.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-braccio-bane-ferry npm run verify:port-parity
```
