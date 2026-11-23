# Rescue Bivant’s heir from the Buccaneer Base

The walk starts from the native slot D produced by [the prior clerk walk](../walk-clerk-offers-bivant/README.md).
The party has the rescue commission, and the boy is still in the pen. The replay uses ordinary
inputs with developer combat disabled.

Buy west passage at New Phlan’s harbor and choose Stay at the western landing. Walk to the
Buccaneer Base at world square (12,31) and accept its mounted escort. At the slave pen, recognize
the boy by his birthmark. Choose Rescue Boy, try to sneak past the guards, and leave when they
block the attempt. Release the animals, bash the pen lock and choose Get Him.

The 95 commands free the boy, save through Encamp in slot B, and resume at (7,6 N) in the
Buccaneer Base. The native save in `after/B.json` was written by the game with rescue flag
`0x4aa9 = 254`. The boy still needs to be escorted out and the party still needs to report to
the clerk.

Run `node tools/record-walk.mjs --replay qa/fixtures/walk-buccaneer-bivant-rescue` to regenerate
the visit trace. Use `POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-buccaneer-bivant-rescue
npm run verify:port-parity` for the paired native replay.
