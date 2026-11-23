# Cadorna's diplomatic briefing

The walk loads slot C from the completed Bivant purchase and council turn-in.
Turn south from the clerk and step through the door. Acknowledge Cadorna's
commission and his instruction to present the sealed packet to the Zhentil
commandant. The native referral flag (0x4a98) advances from 254 to 255.

Save the party in slot D. Its journal preserves the completed Bivant rescue
and records the diplomatic commission as accepted, with the instruction to
keep the seals intact.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-cadorna-briefing npm run verify:port-parity
```
