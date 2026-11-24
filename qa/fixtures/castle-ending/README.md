# Tyranthraxus and the council ending

Slot B contains the historical QA party at (14,7 S), outside Tyranthraxus's audience hall. The party has edited stats, including 127 maximum HP. The original dragon has 80 HP and AC −4. This fixture is for the ending, journal, and save/reload checks. It matches the B saves from the two original Windows Chrome runs, campaign-5VtVfH and campaign-G8itj5, byte for byte.

    node tools/verify-fresh-party.mjs --castle-ending-checkpoint qa/fixtures/castle-ending/B.json
    npm run verify:campaign -- /usr/bin/google-chrome --from-castle-ending qa/fixtures/castle-ending/B.json

Both entry points use the game's Quick combat to defeat Tyranthraxus. The fight awards 917 XP and the council awards 67,500 XP. Reloading C shows Phlan is free; D retains the manually tracked commission, and C is checked for byte-for-byte preservation. Chrome's three prompt schedules are under qa/replay-schedules/castle-ending.

The separate [castle guard checkpoint](../castle-guards/README.md) starts from the campaign party at the stairs and covers the guards with developer combat enabled.
