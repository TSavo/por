# Zhentil envoy delivery and the unguarded night

This walk starts from the earned slot D saved at the end of
`qa/fixtures/walk-cadorna-briefing`. The boot metadata loads that directory,
so the starting save is stored only once. The party already has Cadorna's
sealed packet. It takes the West Overland boat, survives the wilderness
encounter, reaches the mounted riders at (3,32), and answers Yes to their
question about being New Phlan's diplomatic envoys.

The riders escort the party inside and the commandant receives the sealed
packet. The party takes the barracks, watchtower and wall tour and saves
slot B in its assigned quarters at (5,0) facing east, in native
ECL6.DAX block 28. This is the continuing checkpoint. It predates the
dinner and night choices.

The walk then attends the commandant's dinner and hears his Pool of
Radiance story, which records Journal Entry 46. The party chooses Go to
Sleep without a watch. Four guards attack, BRIN dies, and the recording
ends at the native continue prompt. Slot B retains the state before that
branch, including BRIN alive. This leg delivers the packet and reaches
the ambush. Turning in the commission is outside the recorded walk.

The recording contains 156 ordinary game inputs, without developer
combat commands. The prompt schedule records when the game requested
each input. `visits.jsonl` records the native areas traversed.

```sh
POR_PARITY_ONLY=leg POR_PARITY_LEG=qa/fixtures/walk-zhentil-envoy \
  npm run verify:port-parity
```

The return from dinner queues several walking frames before the night menu. On both data sources, `node tools/verify-combat-reports.mjs /usr/bin/google-chrome quarters` checks that Enhanced Chrome paints “You arrive back at your quarters” followed by “It is night and you are in your quarters” before moving on.
