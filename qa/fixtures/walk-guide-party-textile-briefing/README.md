# The guide party accepts Cadorna's textile commission

Load healed slot F at the Temple of Tyr. Return to the City Hall clerk
and read the available commissions. Use the east door from the clerk to
reach Junior Councilman Cadorna at (6,5). He requests the family treasure
hidden in the western building of the Textile Complex, south of Podol Plaza.

The native briefing flag 0x4a97 advances from 254 to 255. Slot G preserves
the accepted Textile House commission, the offered records reward, and the
earlier Podol auction assignment. The replay uses 41 ordinary inputs.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-guide-party-textile-briefing npm run verify:port-parity
```
