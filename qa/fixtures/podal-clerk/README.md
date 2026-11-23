# Podal clerk save

`H.json` is the full campaign's slot F (`qa/fixtures/campaign-full/F.json`: the City Hall clerk, area 8,
5,5 E, with Sokal Keep turned in and the Podal Plaza auction accepted) saved again in slot H. It is the
save `node tools/verify-fresh-party.mjs --podal-checkpoint qa/fixtures/podal-clerk/H.json --auction-only`
starts from (#151, #167): the west ferry, the walk to Podal Plaza, the auction, the council's reward and
the Textile House commission, with the campaign's six fighters.

Made on 2026-11-22 with `node tools/record-walk.mjs qa/fixtures/campaign-full F <dir>` from `game/`:
Encamp, Save, then H (`commands.jsonl`; the second `s` reaches the slot menu, which ignores it).
`boot.json`, `prompts.jsonl` and `last-screen.txt` are that recording's. The replay uses the full campaign's starting saves through `checkpointSource` in `boot.json`.
Run `node tools/record-walk.mjs --replay qa/fixtures/podal-clerk` to replay the recording.
