# Zhentil wall escape

Slot A is a controlled checkpoint recovered from the earlier artwork
review. It starts at (5,0) east inside Zhentil Outpost with the envoy
mission active and the assigned quarters recorded in the journal.

Run `node tools/verify-slums-presentation.mjs qa/fixtures/zhentil-wall-escape/A.json <chrome> zhentil-escape`
with either GOG 1.3 or bundled data. The replay tracks the mission
while the picture decodes, climbs the wall, and saves the journal
with the commission ready to report.

Run `zhentil-return` with the slot A file printed by `zhentil-escape`.
The paired Chrome replay checks the reloaded journal, return boat,
Zhentil reward caption and portrait, 2,125 XP for each character, and
the turned-in journal after acknowledging the reward. Each data mode
writes the final journal and reward screenshot to its output directory.
The two native visit traces cover the escape and return.
