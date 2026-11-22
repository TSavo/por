# How a replay decides when to press a key

A replay is a list of key presses and assertions. The game does not block on
most of them: it polls the keyboard while it draws, animates and waits. So a
replay has to decide at which poll each press arrives, and the same list
must arrive at the same moments every time or a fight goes differently.

## Game progress

The runner counts how far the game has got in two things that both builds
of the game do identically:

- dice drawn (calls to Turbo Pascal's `Random`);
- the game's calls to print a string, print one in colour, or clear the
  text window.

A count of executed instructions is not usable for this. The first release
and version 1.3 execute different numbers of instructions for the same
work. Sound requests are not usable either: the builds differ in them.

## Recording and following

- `POR_PROMPT_SCHEDULE_OUT=<file>` writes one line for each moment the
  runner asked for a key: the kind of moment (`read` for a blocking read,
  `poll` for a keyboard poll, `flush` and `drain` for the two places where
  the game only discards keys) and the progress at that moment.
- `POR_PROMPT_SCHEDULE_IN=<file>` asks at the recorded moments: at the same
  kind of moment, once the game has got at least as far.

The Chrome campaign harness records every leg into its leg directory as
`prompts.jsonl`. A leg with a record in `qa/replay-schedules/campaign/`
follows it. `POR_REPLAY_SCHEDULES=off` ignores the committed records and
falls back to the old rule, which asks at a poll once a million
instructions have passed since the last key.

## Where the committed records came from

The campaign key lists were written against the first release under the
old rule. To move them to version 1.3, the campaign was run once on the
first release with recording, and then on 1.3 following that record. The
records now in the repository are the ones the 1.3 run itself wrote: 11
legs, 1,003 prompts. On 2026-11-21 the two builds produced identical
records for 10 of the 11 legs. In the first leg, 1.3 makes one more print
call during character creation, so its counts run one ahead from there.

## The legacy extra presses

The key lists also hold presses that the first release's `FlushKeys`
swallowed under `POR_INPUT_COMPAT=discard-poll-prompt`. Version 1.3's
`FlushKeys` discards nothing, so on 1.3 the runner drops such a press where
the game calls `FlushKeys`. New replays should use normal input and hold no
extra presses.

## Dice

`POR_CLOCK=fixed` starts a replay on fixed dice. Version 1.3 draws one
random number after the title that the first release does not, to pick its
code-wheel question, so a replay starts 1.3's seed one step earlier and
play begins on the same dice in both builds. `POR_TRACE_DICE=1` logs every
draw: who asked, the range, and the number drawn
(`POR_DICE <step> <caller> range <n> value <v>`).

## What a frame says about the prompt

Each frame the runner sends carries `prompt`, `"read"` or `"poll"`: whether
the game asked with a blocking read or only looked whether a key is down.
In play nearly every prompt is a poll, because the game's menu routine
itself waits by polling. So the frame also carries `awaitsKey`, true at a
blocking read and at the poll inside that menu routine: there the game goes
no further until a key arrives. Any other poll comes from code that carries
on by itself (a fight being played out, a rest, a pause), and
`:travel-poll` answers it with no key. `tools/acceptance/harness.mjs` waits
on `awaitsKey` and compares no screens.

The game also shows messages that it clears by itself: "Must be Readied",
"Your hands are full!", the trainer's "Training costs 1000 gp.". Two routines
print such a message on the bottom line, pause for 225 ms times the speed
setting, and clear the line, all without asking for a key, so no frame the
game waits on has the message. The runner sends the screen as it stands
during that pause as an entry of the next frame's `animation`, marked
`statusMessage`, with the pause as `durationMs`: the page holds it that
long, and the acceptance harness collects the texts as `game.flashed`.

A frame's `exploration` gives the square the game has the party on, the
one its status line prints. `POR_WATCH_ECL=4abb,4a80` adds the values of
those script variables to each frame as `scriptVariables`.

## Script positions on GOG 1.3 (2026-11-21)

A saved game holds a copy of its area's script. A checkpoint the first release saved, loaded on 1.3, runs the first release's script for that area, so the positions there are not moved. Only New Phlan's script differs between the releases (three bytes longer in 1.3 from `a692` on).

The canonical `new-phlan-outbound-ferry` replay passes on GOG 1.3 with the local
`parallel-harbor-master-south-A.json` checkpoint. It checks the harbor master's
portrait, both ferry art phases, and arrival at Sokal Keep. The similarly named
harbor checkpoints start from different positions or quest states. The canonical
`phlan-priest-tempus` replay also passes on 1.3 with `parallel-priest-tempus-A.json`
and verifies that the portrait persists through the healing menu.

The canonical New Phlan replays below also passed in GOG 1.3 Chrome at
`6f6aaa26`. These checkpoint files are local test data.

| Replay coverage | Checkpoint |
| --- | --- |
| Harbor City Watch portrait, fighter, auxiliary, and aide standing and strike poses | `combat-agent-watch-mage-durable-A.json` |
| Tempus line fighter standing pose | `combat-agent-tempus-watch-A.json` |
| Tavern brawl illustration and approach | `parallel-portrait-phlan-tavern-A.json` |
| Tavern Watch arrival and Stay branch after controlled victory | `combat-agent-tavern-deep-durable-A.json` |

The harbor aide strike replay checks the Aides' longsword turn, then
verifies the canonical `ae09` strike frame in Chrome.

For the Kovel caskets and tapestries, start from a copy of the local
`kovel-loot-A.json` save in area 14. The three position bytes start at
`0x3201` in its decoded native save. Set them to `07 07 06` (7,7 west)
for a one-step approach to the caskets, or `0e 0d 04` (14,13 south)
for the tapestries. The GOG 1.3 Chrome replays passed the needle and all
four casket rewards, plus the separate tapestry reward, using these
position-only fixtures.

With `POR_NARRATION_LEDGER` enabled on GOG 1.3 at `3f2de014`,
the Kovel casket D and Yarash laboratory replays both passed. The ledger
records the casket-dart unit `ECL3.DAX:14:a86f` followed by the dart
illustration at `a8df`. It records Yarash's torture-room unit
`ECL7.DAX:23:a01e` followed by the torture panel at `9a04:caller:a08a`,
then the laboratory unit `a08a` followed by the laboratory panel at
`a0fd`. The pearl unit `ECL3.DAX:14:a82f` originally preceded an unillustrated
frame. The replay now verifies the transient pearl caption illustration
at `a84f` before the three pearl menu phases at `a862`.
The other three casket replays likewise verify their discovery frames
(`a585`, `a6a5`, and `a779`) before the animated treasure menus.
The tapestry unit `ECL3.DAX:14:a282` is followed by the discovery
illustration at `a2d9`; the Chrome replay also verifies the later
animated menu at `a2ec`. The ledger establishes
selection order and does not measure when audio was heard in Chrome.



The `valhingen-brass-doors-look` replay uses the staged local
`valhingen-brass-doors-A.json` save. The same canonical Look artwork,
panel fit, and mode switch passed in Chrome with both DOS 1.0 and
GOG 1.3.

The `kuto-bandit-cache-treasure-phases` replay uses
`parallel-kuto-bandit-cache-east-J.json`. DOS 1.0 and GOG 1.3 Chrome
both verified the same Kuto cache illustration when the party discovers
it and again at the View/Take/Pool/Share menu. The GOG 1.3 decline route
verified that leaving the treasure still returns to exploration.


The host reads which release's script is in memory and reports the first release's numbering in both cases. Use that numbering for New Phlan artwork and narration keys. The artwork replays use the same route names on both editions.

Saves from the first release are not a supported player feature. A replay for 1.3 should make its checkpoint on 1.3.

`npm run verify:script-positions` checks this on whichever build `POR_GAMEDATA` holds: it plays to New Phlan's silver shop from a new game and from a New Phlan save of each release, and requires the first release's portrait keys and narration event.
