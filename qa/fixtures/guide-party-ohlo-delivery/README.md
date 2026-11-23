# Ohlo's potion delivery

Slot E was written by the game's Save command after the `ohlo` stage of
`tools/acceptance/slums.mjs guide`, starting from the earned
`qa/fixtures/guide-party-slums-eight-set-fights/D.json` checkpoint. The party
accepted Ohlo's errand and won seven more random fights while walking to the
merchant. It saved at (14,12) with 21 Slums clear points and 13 random wins.

The `potion` stage speaks OHLO to the merchant, returns to Ohlo, and chooses
Give. Both data modes awarded one jewelry, 150 platinum, and a Magic User
Scroll, then wrote identical slot F saves at (13,10). The saved flags `4a04`
and `4a81` are both 255. Clear points rose to 24 after two random wins and
one point for giving Ohlo the potion. The two runs sent 1,969 matching BIOS
key codes and recorded identical native visit traces. This is a Slums errand
completed by the party, with the City Hall commission still outstanding.

Run each mode on an independent copy of E.json and roster.json:

```sh
POR_GAME_SOURCE=original POR_GAMEDATA=/path/to/gog-1.3/POOLRAD \
POR_AUDIO_DIR=/path/to/original-audio POR_CLOCK=fixed \
POR_SLUMS_GUIDE_FROM=potion POR_SLUMS_GUIDE_UNTIL=potion \
POR_SLUMS_GUIDE_SAVES=/path/to/copy POR_SLUMS_GUIDE_KEEP=/path/to/after \
POR_TRACE_VISITS=/path/to/visits.jsonl node tools/acceptance/slums.mjs guide
```

Use `POR_GAME_SOURCE=port` to use the bundled data. The starting checkpoint
can be recorded by setting `POR_SLUMS_GUIDE_FROM=ohlo` and
`POR_SLUMS_GUIDE_UNTIL=ohlo` with a copy of the eight-fight fixture.
