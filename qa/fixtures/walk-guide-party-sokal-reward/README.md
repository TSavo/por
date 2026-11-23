# Free Ferran and collect the guide party's Sokal reward

Load slot D written after the original courtyard battle. Enter the chapel,
go around the east side of the altar, and speak kindly to the pale figure.
Use LUX from the parchment and tell Ferran the truth about Phlan. The native
completion flag 0x4aa7 becomes 254 when Ferran releases the spirits.

Use SAMOSUD on the way back through the keep. Cross the south boundary at
the pier and take the ferry home. The clerk awards 1,962 XP per character
before class splits. Share the reward, close the treasure screen and read
the next offers. The native paid flag becomes 255.

Slot E preserves the turned-in Sokal journal and the party's native state at
the clerk, including the three companions who reached 0 HP in the courtyard.
The replay uses 128 ordinary inputs.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-sokal-reward npm run verify:port-parity
```
