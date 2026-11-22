# Castle guards save

`B.json` is the full campaign's slot H (`qa/fixtures/campaign-full/H.json`: the party one step from the
stairs down to Tyranthraxus's audience hall, area 7, 3,6 S) saved again in slot B. It is the save
`npm run verify:campaign -- <chrome> --from-castle-guards qa/fixtures/castle-guards/B.json` starts from
(#151): the bronze dragon guards and Tyranthraxus won with developer victory, the council reward, and
the journal saved to slot D.

Made on 2026-11-22 with `node tools/record-walk.mjs qa/fixtures/campaign-full H <dir>` from `game/`:
Encamp, Save, then B (`commands.jsonl`; the second `s` reaches the slot menu, which ignores it).
`boot.json`, `prompts.jsonl` and `last-screen.txt` are that recording's. To play it again, copy
`qa/fixtures/campaign-full/{A..I,roster}.json` into a copy of this folder and run
`node tools/record-walk.mjs --replay <copy>`.
