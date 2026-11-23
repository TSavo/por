# Restore the guide party after Sokal Keep

Load native slot E from Sokal's paid council reward. Leave City Hall for the
Temple of Tyr and accept healing. Pool the party's money and buy one Cure
Light Wounds each for the Curate, Finn and Aelar. The Curate's sheet shows
Unconscious before treatment, and each of the three cures costs 100 gold.

Slot F keeps the turned-in Sokal commission and all seven companions standing
at the temple. The party still has injuries and keeps its original roster and
equipment. The replay uses 63 ordinary inputs.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-sokal-healing npm run verify:port-parity
```
