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
draw.
