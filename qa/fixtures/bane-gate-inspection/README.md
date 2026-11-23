# Bane temple gate inspection

This focused slot is the established controlled Bane gate checkpoint,
resaved using the bundled 1.3 game through Encamp at (1,7) east, area 24.
The guard's test remains open. The replay uses the original script and
ordinary input, with developer combat disabled.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/bane-gate-inspection/A.json /usr/bin/google-chrome bane-gate-inspection-holds`
with each data source. Up brings up the guard's first question at a4f3.
Back Off brings up his next question at a586. Each wait draws members
0, 1, 2, 3 for 1510, 20, 710, and 20 ms. Member 3 repeats member 1.
