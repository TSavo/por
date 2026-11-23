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

On a busy machine Chrome can take a long time to answer the harness
(#176). The harness waits for an answer and fails only when Chrome is:
- dead: it exited, its page crashed, or its debug connection closed. This
  fails at once.
- hung: in the last 300 s (`POR_CHROME_STALL_SECONDS`), Chrome's renderers and
  the game server, with its runner, used under 0.5 s of CPU between them; the
  game server read and wrote nothing on storage; and none of them waited on the
  disk.
- slow past 900 s (`POR_CHROME_LONGEST_SECONDS`).

The error starts with "Chrome is dead", "Chrome is hung" or "Chrome is slow
past the limit". An answer that took more than 10 s is logged in the leg's
`runner.log`, with what the harness saw while it waited.
`POR_CHROME_HARNESS_TRACE=1` logs every look. `npm run verify:chrome-harness --
<chrome>` checks the three cases against a real Chrome on Linux: a page busy
for 25 s, stopped renderers, and a killed Chrome. `-- --load N <chrome>`
instead opens a leg while N CPU burners run, and stops them when it is done.

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

## One key, one input (#76)

A replay presses each key once and checks the screen that key should
produce. It never presses a key again until the screen changes: a key the
game swallowed would leave the screen as it was, and pressing again would
hide it.

- In `tools/verify-fresh-party.mjs` a step that presses one key several
  times says how many: `presses(key, count, until)`. Before each press the
  screen must not yet show `until`, and after the last press it must. The
  older form `[key, until, limit]` is refused. `acceptSokalPatrol` takes the
  number of keys its walk needs in the same way.
- `POR_REPLAY_RECOUNT=1` measures those counts: each counted step presses
  until `until` and prints `POR_REPLAY_COUNT leg <n> <step>: <count>`,
  with the count written in the source when it differs. Use it to write a
  count after the game or a route changes; a run in that mode checks
  nothing about swallowed keys. The counts in the full campaign were
  measured on 2026-11-22 from `game/` in Chrome with the committed prompt
  records. They are counts of inputs, and include the legacy presses that
  `POR_INPUT_COMPAT=discard-poll-prompt` drops. A count depends on the mode
  that runs the step: the Chrome legs follow the recorded prompts and the
  pipe runs do not (Quick in the first Slums fight takes 13 presses in
  Chrome and 10 in the pipe), and a step shared by several variants of a
  check is measured in each (`verifySokalPatrolVictory`'s four variants all
  take 134 and 22). A mode whose count is not measured has none, and fails
  at the step. The Sokal checkpoint modes' counts were measured from a save
  chain in the pipe (#151); the courtyard fight of #166 is recorded again as
  the page plays it (below), and #167 waits on saves no mode produces. Each step
  of an automatic combat turn asks for a key, so Quick to a defeat can take
  over 1,000 inputs: a pipe replay gives up when its runner shows nothing
  for 90 seconds, not after 90 seconds in all.
- A pipe replay given `{ pagePolls: true }` (the Sokal courtyard fight in
  `verifySokalReinforcement`, #166) answers every frame the
  page answers by itself, a step of a fight the computer plays
  (`automaticCombat`) or of an animation the game plays by itself
  (`presentationPolling`), with `:poll`, as `tools/play.js` does; its keys
  are then the player's only, and count as they do on the page.
  `hold(key)` presses a key and leaves the next frame for the next step even
  where the page would poll it: Space at the computer's first step of a
  fight takes a party on Quick back by hand. The older pipe replays answer
  the computer's steps with their keys, and their counts are written so.
- The acceptance harness (`tools/acceptance/harness.mjs`) fails a press
  after which the game shows exactly what it showed before: the same frame
  (text and colours, both pictures and the artwork placed on them, the
  square), and nothing printed, narrated or flashed on the way. Its loops
  press through it, so none of them can make up for a swallowed key.
- `POR_SWALLOW_KEY=n` makes the runner swallow the n-th key it is given (in
  each runner it starts), as if the game had read it and done nothing: the
  runner shows the same screen again and asks again at the same moment.
  This is how a replay is shown to fail on a swallowed key.
- `npm run qa:repeat-presses` counts the replay steps that still press a key
  until the screen changes, by file and line, and exits 1 while any is
  left. It also counts a `presses` or `acceptSokalPatrol` whose count can be
  `undefined` in some mode (`continuous ? 7 : undefined`): that mode fails at
  the step until its count is measured and written (#151).

## Character icon editor

Run `node tools/verify-character-icon-editor.mjs <Chrome executable>`
with `POR_GAME_SOURCE=original` and `POR_GAMEDATA` set to the GOG 1.3 files,
or with `POR_GAME_SOURCE=port` for the bundled data. The replay uses
Chrome's keyboard input and checks the painted ready and action icons
as the player changes head, weapon, both colours and size. It keeps the
new icon and checks its ready pixels in the first Slums fight.

## Dice

`POR_CLOCK=fixed` starts a replay on fixed dice. Version 1.3 draws one
random number after the title that the first release does not, to pick its
code-wheel question, so a replay starts 1.3's seed one step earlier and
play begins on the same dice in both builds. `POR_TRACE_DICE=1` logs every
draw: who asked, the range, and the number drawn
(`POR_DICE <step> <caller> range <n> value <v>`).

## Palette (#82)

The game sets its EGA palette registers through int 10h AH=10h, and Classic
shows each pixel in its register's colour. `POR_TRACE_PALETTE=<file>` writes
one JSON line per change: the step, the sixteen registers and the callers.
Where the game changes only colours and pauses (the title's flash), the
screen is held in them as a frame's `animation` entry marked `classicOnly`,
which Enhanced does not play. `POR_FRAME_PIXELS=1` adds each frame's pixel
values (`pixels`, one byte each, base64). `npm run verify:palette` replays the
title and a fight and checks every Classic pixel against the original's code
run under Unicorn (`tools/palette-unicorn.py`,
`qa/fixtures/palette/original-1.3.json`). Its title replay starts the clock at
23:59:50 (`POR_FIXED_CLOCK_START=8639000`): on any other start the runner's
clock ends the title before it flashes (#152).

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

### Lizardman Keep western approach

Run `node tools/verify-slums-presentation.mjs <checkpoint> <chrome> lizardman-keep-west-approach` with the local GOG 1.3 `parallel-lizard-lower-43421-A.json` checkpoint. Despite its filename, the party starts on the surface, map 16.

The route walks and turns through ten distinct surface views. Chrome checked all 121 fallback cell bindings per sampled frame, the live WebGL viewport, and display switching against both bundled 1.3 data and the original GOG 1.3 files. The final exploration viewport matched pixel for pixel. The catacomb descent and map 30 require a separate replay.

## Held portrait timing

Run `npm run verify:held-portraits -- --summary` for the live portrait
acceptance counts in #80 and #131. The census tracks captured prompts
and reachable sites independently. Held animation replays check the
native member order, timing and wrap. Static portraits and one-shot
transitions have individual evidence for their native dwell and handoff.
See [Verified census](HELD-PORTRAIT-DISCOVERY.md#verified-census).

Set `POR_HELD_PORTRAIT_TRACE` to a new JSONL path before running a GOG 1.3
checkpoint replay. At a held menu the runner waits for the next command.
Send `:travel-poll` to the runner pipe to let the native menu poll
without a key. The trace records each completed member, its guest clock,
the area and script position, and a hash of the visible viewport.
Use `node --import tsx tools/read-held-portrait-trace.ts <trace.jsonl>`
to extract cycles seen twice. The trace contains hashes and timing only.
Add `--with-producers` to include the ECL instruction that loaded each
cycle's picture members. Record that producer with the poses when multiple
instructions can reach the same prompt with the same picture.

Run the corresponding presentation replay with
`POR_HELD_PORTRAIT_CHROME_TRACE` set to an output JSON path. Run once
with `POR_GAME_SOURCE=original` and the GOG 1.3 files, and once with
`POR_GAME_SOURCE=port`. A passing replay records two decoded cycles
sampled at browser refreshes during the same guest input wait. Save
the native cycle output as JSON and compare the three files with
`node --import tsx tools/verify-held-portrait-paint.ts <native cycles.json> <scene> <original Chrome.json> <port Chrome.json>`.
For a direct battle notice, set `POR_PORTRAIT_DRAW_TRACE` to a fresh
JSONL path alongside the replay. It records every completed native
portrait member, including the one-shot draws that have no held timer.
Count the draws at the script cursor before the battle begins.

The two held-menu traces are independent of the Enhanced timing table.
The worklist checks the renderer, the bindings that can select a loop for
the opening portrait, and the served art hashes against each Chrome
capture. Editing a binding for a different portrait keeps that capture valid.
The reviewed narration-log edit in `3e497fec` accepts the preceding renderer's
capture hashes for that exact script. The original capture hashes are retained.
The exact wilderness renderer revision also accepts those two capture hashes.
Its changes are confined to the travel map layer and the status text it shows.
The reviewed original-files settings revision also preserves these captures.
It changes the settings panel and its key handling.

The Valhingen wight caller checks take their checkpoints from
`qa/fixtures/valhingen-wight-ambush/A.json` and
`qa/fixtures/valhingen-spirits-tower-wights/A.json`. Pass each to
`tools/verify-slums-presentation.mjs` with the Chrome executable and
`valhingen-wight-ambush-loop` or `valhingen-spirits-tower-wight-loop`,
respectively. Set `POR_FIXED_CLOCK_START=4320042` for the ambush only.
That starts the guest clock at 12:00:00.42 so the original dice choose
the roaming wights. Use the default fixed clock for the tower route.
The roaming skeleton ambush uses the same fixed clock as the wight ambush.
Its saved slot is `qa/fixtures/valhingen-skeleton-roaming-ambush/A.json`.
Run `valhingen-skeleton-roaming-ambush-loop` to check the six native beats and
the selected pose at the battle notice.

The Valhingen giant skeleton alone, giant with retainers, and skeleton tower
rush use the routes `valhingen-giant-skeleton-alone`,
`valhingen-giant-skeleton-retainers`, and `valhingen-skeleton-tower-bones`.
Each route takes `qa/fixtures/<route>/A.json` at the default fixed clock.
Native member 0 stays visible for all 120 idle polls and through the battle
notice in each scene. The Chrome replays hold their individual captions
for 3.65 seconds before advancing to the battle notice. Set
`POR_HELD_PORTRAIT_CHROME_TRACE` to save the held evidence for the census.

The `valhingen-zombie-roam-animation` replay loads its own checkpoint at
the default fixed clock. The game holds five members for 110 ms each on
“Lumbering figures reach for you.” Enter releases the loop to the battle
notice. The `valhingen-zombie-tower` replay loads its separate checkpoint.
There, the hair and fur caption holds only the opening portrait until
Enter. Each route takes `qa/fixtures/<route>/A.json`.

The `valhingen-grave-claws` replay starts at
`qa/fixtures/valhingen-grave-claws/A.json`. Up opens the held claws caption.
The native loop has eight timed members. Members 1, 5 and 6 share the
same pixels, so the visible return to member 1 lasts 230 ms. Member 2
has a distinct 20 ms pose. Enter advances to the attack illustration.

## Enhanced artwork fallbacks

Set `POR_TRACE_ENHANCED_FALLBACKS=1` and run
`npm run verify:campaign -- <chrome> --replay-leg qa/fixtures/wilderness-walk`.
The Chrome replay saves `enhanced-fallbacks.json` in its leg directory.
It records the art keys from committed picture layers and counts each
displayed view once, including the views within an animation. Observer
version 2 also counts uncovered cells when a first-person view draws
over the native framebuffer. Area maps use their own tile layout. The
ledger keeps earlier receipts for reference and counts current-version
receipts in the worklist.

On the old Yarash replay (`d4a3ba5f`), both data sources painted every
announced tile at the south-facing pumping-room prompt. GOG painted 113
cells and bundled data painted 83, out of a full 121. Observer v2 reports
`surface:area:23:first-person` at command 269 in each. The native actor
is the distant `encounter:area:23:ecl:aa03:SPRIT7.DAX:57:2:0` cel.
After #181, the same input in both data modes shows that sprite and the
active WebGL room with zero findings in the entire captured prefix.

Use GOG 1.3 for the census and rerun with `POR_GAME_SOURCE=port` to check the
bundled display. Run `npm run verify:enhanced-fallbacks -- --record wilderness-walk <chrome-leg>`
on the completed GOG replay and refresh the evidence in the worklist with
`npm run art:worklist -- --coverage-only`. Run the full `npm run art:worklist`
after changing art or its bindings.
The verifier reports the measured walks, their fallback frames and their
distinct keys. It exits with status 1 while a recorded walk needs a
capture or a captured fallback remains.

The wilderness walk ends at the same recorded screen in both data modes.
Chrome displayed 163 views per run. The original-data baseline recorded
15 overland background fallbacks and one Nomad Camp portrait fallback.
The atlas and scoped portrait fixes brought that count to zero in both
data modes. The separate runner parity check matched all 152 frames.

## Display switching and the Buccaneer captive pen

With GOG 1.3 files installed, Chrome switched display modes on the City
Hall exit, during Cadorna's briefing, and during Rhiannon's Orc Surprise
combat turn. The guest state and save matched before and after the
switch. The briefing kept its caption and 28 journal leads. In combat
the two Classic screenshots matched byte for byte. Enhanced showed
18 decoded combat sprites on the same turn.

The arena duel showed all 16 attack reports in order in Chrome with
both data sources. Two attacks used manual controls. One Quick press
produced the other 14 reports and reached the native loss prompt.

The paired Buccaneer captive pen check starts from the controlled
`qa/fixtures/buccaneer-captive-pen/A.json` checkpoint. Run
`node tools/verify-slums-presentation.mjs qa/fixtures/buccaneer-captive-pen/A.json <chrome> buccaneer-captive-pen-overview-loop`
in both data modes with `POR_TRACE_VISITS` set to capture the runner visit.
The same pen caption and five artwork poses appeared in both. The visit
traces match and establish area 1 coverage in `npm run qa:visits`. No
commission was earned during this check.

The Zhentil quarters guard check starts from
`qa/fixtures/zhentil-quarters-guards/A.json`, recovered from the earlier
artwork review. Up and Enter reach the Return, Attack, and Bribe prompt.
GOG and bundled Chrome record the same native text cells, Enhanced
portrait, and visit to area 28. The controlled save has already
delivered the diplomatic packet. This check covers the outpost
display and menu.

## Checkpoints for the presentation replays

Use `POR_DEV_COMBAT=0` with `tools/record-walk.mjs` to record ordinary
combat. The recorded boot settings retain this mode for replay.

`node tools/verify-slums-presentation.mjs <checkpoint> <chrome> <route> [option]` plays one of about 1,250
routes from a saved game. The checkpoint is a slot file whose `name` and party files carry the slot letter the
route loads (the route's table says which; a save of another letter is relabelled, see below). Only
`new-phlan-rolf-approach` starts a fresh game (pass `-`).

`npm run qa:replay-checkpoints` counts the routes that run from a clean checkout: the route is listed in
`qa/replay-checkpoints.json` (`fresh`, `checkpoints` with the committed save to pass, or `chains` for a route that
reloads the save another route writes) or a `qa/fixtures/*/README.md` run line names its save. `-- --list` prints
every route with its table, slot and save. It exits 1 while any route has none. `proved` in the registry lists the
routes that were run in Chrome from the named file.

`node tools/sweep-replay-checkpoints.mjs <chrome> <results.jsonl>` finds saves: it tries each distinct saved game
under `qa/fixtures` against each missing route (relabelled to the route's slot letter) and logs every try;
`--adopt <results.jsonl>` copies each pass into `qa/fixtures/replay-checkpoints/<save id>/<slot>.json` and
registers it. Run it on Battleaxe with `POR_GAME_SOURCE=port`.


Use `--record-leg <new-directory>` on `tools/acceptance/narration-walk.mjs`
to keep a replay for each load of the saved slot. Run `verify:campaign`
against each numbered leg, then record its Chrome fallbacks as above.
The leg includes the initial saves, the runner commands, the prompt schedule
and the last screen.
When the recording stays outside the repository, pass its numbered source
directory after the Chrome capture in `verify:enhanced-fallbacks -- --record NAME CHROME_LEG SOURCE_LEG`.
The importer checks its commands and final screen before adding it to the census.
