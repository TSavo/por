# Narration QA: what play has heard

The narration is one narrator reading the game's own text as a dungeon master does, in step with
the screen, with the new artwork showing what is described. The requirement is that every narrated
passage is narrated audibly at its moment in play, the dynamic ones above all, with its picture
there.

`npm run verify-voice-master`, `verify-narration-generation` and `verify-narration-runtime` prove
that the recordings exist, say the right words and that the selection code is well formed. They do
not play the game. This measure does:

```
npm run qa:narration                           the table; exit 1 while anything is left
npm run qa:narration -- --list                 what is still unheard, by script, and every listed case
npm run qa:narration -- --merge <files...>     fold new runs into qa/narration-coverage.json: ledgers and playback logs
npm run acceptance:narration-dynamic           five dynamic families, driven until they fire
npm run verify:narration-playback -- <chrome>  Rolf's tour in Chrome: every line played to its end, once, with its picture
```

It counts in two steps, and only the second counts toward what is left:

- **Selected.** The runner chose the unit at its passage and the page was told which recording to
  play. This is the narration ledger. It proves the choice. It does not prove a sound.
- **Played.** Chrome's audio element loaded that recording, started it, and reported its end at
  its full length. This is the page's playback log. It also says what stopped a line that did not
  end, whether another voice was sounding when it started, and what artwork was drawn while it
  played.

## The ledger

A run started with `POR_NARRATION_LEDGER=<file>` appends one line to that file for every decision
the narration observer (`src/runtime/ecl-narration-observer.ts`) makes, and one line for the
artwork the Enhanced display resolved on the frames that follow. It observes only: the observer
reports each decision it has already taken, and `tools/narration-ledger.ts` writes it down. The
game, the keys and the dice are untouched. Only the runner (`tools/boot-translated.ts`) opens the
ledger; the play server passes the setting through to it. `POR_NARRATION_RUN` names the run; by default the name
is the file's name.

Lines are JSON, one per line. `s` is the runner process, because one file can hold several games.

| line | meaning |
| --- | --- |
| `{"t":"run", "run", "artwork"}` | a game started. `artwork` says whether the play server gave the runner the artwork list or the ledger loaded it (the acceptance harness has no play server) |
| `{"t":"n", ...}` | a narration decision: see below |
| `{"t":"f", "key", "portrait", "encounter", "scene", "classic", "view", "runes"}` | a frame's artwork. `portrait` is an Enhanced portrait or scene illustration and `encounter` an Enhanced encounter picture: both are keys of the artwork manifests, and are only present when that artwork is installed. `classic` means an original picture is showing with no Enhanced artwork for it. `view` means the first-person view of the party's square is on screen, and `runes` that the game has written a page in runes in the picture window (a scroll, a journal entry). `key` marks a frame on which the game waits for the player. Written while a narration is waiting for its frame, and whenever the artwork changes |
| `{"t":"end", "waiting"}` | the run ended; selectors still waiting |

A narration line carries the source event reached (`sourceId`, `archive`, `block`), the `step`,
how the unit was chosen (`via`: `script`, `selector`, `menu-text`, or `exact-text` for text drawn
outside the scripts, which the play server matches by its exact words) and an `outcome`:

| outcome | meaning |
| --- | --- |
| `heard` | a unit started at its trigger. `unitId`, `asset`, and for a variant `variantId`, the `slot` read and the `value` it held |
| `covered` | a print the started unit covers. It starts nothing, as the playback policy requires. `heardAt` is the step its unit started |
| `waiting` | a selector's passage printed and its narration waits for a later print, or for its menu to draw |
| `silent-by-design` | a selector chose a case the manifest marks silent |
| `unvoiced` | a text instruction with no narration in the manifest (337 of the 2,025 source events: choice lists and the like) |
| `silent` | narration belonged here and none was chosen. `silent` names the kind |

Whether a line is `heard` is decided by the same catalogue the play server uses
(`NarrationCatalog.resolve`), so the ledger records what the page would be told to play. It does
not prove that the browser played the file. The playback log does.

## The playback log

The page (`tools/play.js`) keeps one entry for every narration it is told to play, always, in
Enhanced mode. `window.porNarrationPlayback()` returns `{ at, frame, queued, sounding, lines }`:
the page's clock in seconds, the frame on screen, how many lines wait in the queue, how many
voices are sounding, and the entries (the last 2,048). The log listens to the audio element and is
told by the player when it stops a voice. It starts, stops and queues nothing.

| field | meaning |
| --- | --- |
| `id`, `unitId`, `variantId`, `asset` | the narration, as the play server sent it |
| `queuedAt`, `queuedFrame` | when the page was told, and the frame then on screen |
| `ahead` | lines sounding or waiting when this one was queued. Absent when it could start at once |
| `behindVoiceLine` | a recording from `src/audio/voices.json` was speaking when this was queued: the page had matched it to the same text |
| `refused` | `play()` was rejected (Chrome's autoplay rule, with no click on the page yet). The player retries on the next key or click |
| `startedAt`, `startFrame`, `duration` | the audio element's `playing` event, and the recording's length as Chrome decoded it |
| `artAtStart`, `artSeen`, `artAtEnd` | the Enhanced artwork key drawn (`portrait`, encounter picture or scene); with none, `"runes in the picture window"` or `"the first-person view"` where the frame shows them (the names the ledger uses), else `null`: at the start, each change while the line sounded, and at the end. `artTimes` gives the seconds into the line of each entry of `artSeen` |
| `startedOver` | voices still sounding when this one started. Must never appear |
| `talkedOverBy` | a voice that started while this one was sounding. Must never appear |
| `pauses` | times the element was paused without being stopped (the tab was hidden) |
| `outcome` | `ended`: the element's `ended` event. `stopped`: the player stopped it. `never-started`: it was dropped before any sound. Absent: still playing or queued |
| `reason` | for `stopped` and `never-started`: `key <key>`, `a voice line replaced it`, `switched to Classic`, `load error`, `queue cleared: <why>`, or `play() was refused ..., then <why>` |
| `endedAt`, `endFrame`, `position` | when it ended or stopped, and the audio element's `currentTime` then |
| `behind` | for a line dropped from the queue: the line that was playing |

The Chrome harness (`tools/chrome-campaign-replay.mjs`) reads the log when a leg closes and writes
it as `narration-playback.jsonl` in the leg's directory. When `POR_NARRATION_LEDGER` is set it also
appends it beside the ledger as `<ledger>.playback.jsonl`: a `{"t":"playback","run","leg"}` line
and one `{"t":"p", ...}` line per entry. `--merge` takes both kinds of file.

Headless Chrome refuses `audio.play()` on a page nobody has clicked, and the harness sends keys
through the page's `send()`, which is not a click. Until the harness passed
`--autoplay-policy=no-user-gesture-required` every narration in every Chrome check was refused and
none played (measured: `NotAllowedError`, `currentTime` 0 after three seconds). `--mute-audio`
stays: it silences the output device only. The recording is still fetched, decoded and run at
real speed, and `verify:narration-playback` requires the time from `playing` to `ended` to equal
the recording's length.

### What cut off means

The owner's design, from the manifest's policy and the page's key handling:

- Audio attaches only to the trigger, covered prints do not retrigger, and the next narration
  queues after the current one (`policy` in `src/audio/voice-master-manifest.json`).
- Enter or Space while a narration unit is sounding leaves it sounding: the press moves to the
  next print, which is usually one the unit covers. Any recording that has yet to start
  stays eligible while its native frame and Enhanced artwork remain visible. If a key
  moves past that picture first, the log records the skip.
- Any other key ends the line only if the game acts on it. The page notes the screen when the key
  goes to the game and ends the voice when the game's next frame differs (`keydown`, `send` and
  `poll` in `tools/play.js`); the lines that were waiting at the key press go with it, and a
  narration the game sends for the new screen plays next. A key that is never sent to the game
  (Shift, the page's own M for the map) or that the game ignores (an arrow at "Press
  <enter>/<return> to continue") leaves the narration and its queue alone. Until 2026-11-21 any
  such key stopped the voice and emptied the queue.

So the measure reads a line's end like this:

| the log says | verdict | why |
| --- | --- | --- |
| `ended` within 0.25s of `duration` | played to the end | |
| `stopped`, reason `key ...` or `switched to Classic` | ended by the player | the player moved on, and the game with them. Legitimate, and not proof that the line can be heard whole |
| `never-started`, reason beginning with `key ...` | ended by the player | the next picture replaced the cue before its sound started |
| `stopped` for any other reason (`a voice line replaced it`, `load error`) | **cut off** | nothing the player pressed ended it |
| `ended` short of `duration` | **cut off** | the element gave up early |
| `never-started` with `queue cleared: ...` | **never started** | the line waited behind another and was thrown away. The player never heard a word of it, whichever key cleared the queue |
| `refused` and never started | **never started** | Chrome would not play it and nothing resumed it |
| no outcome | unfinished | the run closed the page first. Not evidence either way |

A cut-off or never-started line is a defect: record it in `qa/findings.json` with the unit, what
interrupted it and the seconds lost.

A replay is weak evidence here. The harness presses through `send()`, so a replay's keys never
reach the page's key handling: no line is ever ended by a replay's key, and the lines pile up in
the queue and play one after another, long after their passage has left the screen. A replay shows
that a recording loads and runs to its end. It does not show that it was heard at its passage.
The rows say which: a line that started more than a second after it was queued is counted in the
note of the played row and listed, and the artwork row fails a line whose picture changed under it.
Proof that a passage is heard whole, at its moment, needs a run that waits for each line, as
`verify:narration-playback` does. A Chrome campaign replay does that with
`POR_REPLAY_WAIT_NARRATION=1` (#102): before each key it waits until every line the page was told
to play has ended and none is queued, so each line plays whole on the frame that printed its
passage. The keys still go through `send()`, so the run says nothing about what a key does to a
line; `verify:narration-playback` pass 2 measures that.

### Waiting for the picture to paint

The runner publishes narration with the view that owns it. A completed
script print can attach its recording to a transient illustration in an
animation batch. The page queues the recording after that view and its
text have finished decoding and have been put on screen. The playback
ledger reports the decoded layers, including the first-person view or
runes when they supply the picture.

On Rolf's tour, holding the greeting portrait request for 2.4 seconds
made the earlier page start audio about 2.38 seconds before the portrait.
In GOG 1.3 and bundled Chrome, the updated page starts 33–35 milliseconds
after the portrait and greeting text paint. The Valjevo scribe's timed
illustration also stayed on screen for its entire 7.28-second recording
in both data modes. The alarm appeared after the recording finished.

Automatic transitions keep the current illustrated passage while its
recording plays. In the Lizardman Keep pool, the illustration formerly
cleared after 1.2 seconds, leaving 3.78 seconds of narration over the
damage prompt. Both Chrome data modes now show the illustration through
all 4.8 seconds. The damage prompt follows without another key. With the
audio request forced to fail, the original illustration timer still runs
and the damage prompt appears.

The tracked Rolf tour verifier waits for the last movement clip to paint
before it tests whether audio has finished. GOG 1.3 and bundled Chrome
both played all eight tour lines over their owning artwork for their
full lengths. The ignored arrow, Enter, and active arrow controls also
passed in each mode. The coverage ledger includes the verified tour,
pool ambush, and Valjevo scribe playback.

A deliberate key can leave a passage while its audio is queued or loading.
Such an unheard recording is logged as skipped. A recording the player
has already started can still finish after Enter or Space.

## The silent cases

Each is a moment where the narrator should have spoken and nothing was chosen. The table requires
zero. `--list` prints each with its script position, the slot's actual value and the family's
conditions.

| kind | meaning | usual cause |
| --- | --- | --- |
| `no-variant` | the unit has variants and the slot's value matches none | the manifest's list is missing a value the game can produce, or the observer reads a different slot from the one the conditions name |
| `no-unit` | a voiced source event was reached and no unit could be chosen (`status`: `ambiguous`, `unavailable`) | several units share the trigger and no selector tells them apart |
| `selector-unresolved` | a selector's value matched no case, or the menu text it waited for was never drawn | a case missing from the selector |
| `selector-dropped` | a deferred selector was still waiting when the script block changed | the passage ended on a branch that prints none of the selector's cases |
| `covered-without-trigger` | a covered print was reached and none of the units covering it had started since the script block was entered | two passages share a line and only one of them owns it: the other reaches the line from its own opening and the line is never spoken |
| `opcode-mismatch` | the script reached a narrated position and the instruction there is not the one the manifest names | the script-position mapping for this version of the game is wrong at that position |

A silent case is a defect. Record it in `qa/findings.json` with the ledger line as evidence. Do not
remove it from the coverage file by hand: fix it, play the same run again and merge. A run merged
again replaces what that run said about silent cases, so a fixed defect clears.

## The table

`qa/narration-coverage.json` holds what has been selected and played, and the run. A unit,
variant or selector that is not listed has not been.

Rows that come from play:

- **Units selected at their passage** (of 1,432): a run chose the unit at its trigger and the page
  was told to play it. It proves the script position, the selector and the variant. It does not
  prove that anything sounded. Its `left` is shown in brackets and is not counted in the total.
- **Units played to the end in Chrome** (of 1,432): in some Chrome run the audio element started
  the unit's recording and reported `ended` within 0.25s of its length. This row drives the total.
  It proves the file loads and runs to its end in the page. It does not prove the line was in step
  with the screen: its note counts the lines that started more than a second after they were
  queued, and `--list` names them. It does not prove the words (that is
  `verify-narration-generation`) or that a speaker was on (`--mute-audio`).
- **Units cut off or never started** (must be 0): every line in a playback log that stopped early
  or was dropped with no key from the player to explain it, by the table above. `--list` gives the
  unit, the reason, where it stopped and the seconds lost. It counts lines, so one unit can be
  listed more than once.
- **Lines that started while another was still playing** (must be 0): a line whose `playing` event
  came while another voice element was neither paused nor ended. This is observed on the audio
  elements themselves, not read from the player's own bookkeeping.
- **Played with their artwork on screen from start to end**: of the units played to the end, those
  where the passage's own artwork was drawn when the line started and no other frame replaced it
  before the line ended. The passage's own artwork is what the runner's ledger saw on the frame
  that printed it. One picture throughout is not enough: a line sent before its frame is drawn
  plays under the previous passage's picture, and does not count. It does not compare the
  picture's variant with the narration's variant. `--list` gives what was on screen instead.
- **Dynamic variants selected** (of 402): the variant's condition matched the game's state.
- **Deferred selectors resolved** (of 43): play reached the selector's passage and it chose a unit
  (or its silent case).
- **Silent cases found in play** (must be 0).
- **Selected passages with their artwork showing**: of the units selected, those where an Enhanced
  portrait, scene illustration or encounter picture was on screen between the unit being selected
  and the game next waiting for a key, or the first-person view of the square the party stands on,
  or a page the game writes in runes in the picture window.
  Where the game prints a passage over that view it draws no picture of its own, and the Enhanced
  page draws its street view of the square; the note counts these. Until 2026-11-22 the ledger did
  not record the view, so such passages were listed as "no picture" (#100). This is the runner's
  view of the frame, not the page's, and says nothing about how long the picture stayed. A passage
  that was selected once without artwork counts as without, and `--list` names it with what was
  showing instead: the original picture, or no picture at all. This row says whether artwork was
  there. It does not compare the artwork's variant with the narration's variant.

Rows that need no play, and must be zero:

- **Recordings missing under `audio/`**: every unit and variant asset file.
- **Units that a voices.json recording also speaks** (must be 0): narration has one source, the
  script units. `src/audio/voices.json` was an earlier, text-matched source: the page plays a
  line listed there when its phrase appears in printed text. Its nine lines (Rolf's eight tour
  passages and the temple question) were all script units as well, so both fired on one print and
  the passage was read twice, or the second recording cut the first off. The list was emptied on
  2026-11-21. The row guards that: a line added there whose phrase is in a unit's text counts
  here. In play the playback log marks such a unit `behindVoiceLine`.
- **Variant conditions that overlap**: within a family every condition and every selecting value
  is distinct, so no two variants can match at once.
- **Variant families the observer cannot select**: the observer reads one slot per family. Where
  it finds no single slot, or a slot other than the one the family's conditions name, no variant
  can ever be chosen. A family whose passage prints several string slots (the hirelings: a title
  and a price) is selected on the whole sentence instead: the observer puts the passage's literal
  texts and the slots together when the trigger runs and takes the variant recorded with exactly
  that sentence. Such a family counts as selectable when every variant's text is a sentence the
  passage can print and no two are alike. A sentence nobody recorded stays silent, and its ledger
  line carries the sentence as `value`. A unit whose printed slot cannot tell its variants apart
  names the slot that can as its `selector` (from `unitSelectors` in
  `src/audio/dynamic-voice-resolution.json`), and the observer reads that one: the vote at
  Tyranthraxus prints the voter's name and is selected by the voter's place in the party, 0x9800.
- **Encounter tables established from the script**, **Monsters that can appear with no variant**,
  **Variants for monsters that cannot appear**: a family's slot is filled by the script with a
  SAVE of a literal string, chosen by the script's own table of what can turn up. The values that
  can appear are the literal strings whose SAVE can reach the passage's print of the slot with no
  other SAVE into the slot between. The measure finds them by following the converted 1.3 script
  in `game/content/scripts.*` forward from every SAVE into the slot (GOTO and GOSUB to their
  targets, ON GOTO and ON GOSUB to every target, an IF to both outcomes, a RETURN to the
  instruction after each GOSUB that can have called its routine), and compares them exactly with
  the family's selecting values. A table is *not established*, and is listed as such rather than
  guessed, when a value that is not a literal string can reach the print, or when the print can be
  reached from the script's entry points with no SAVE into the slot (the slot was filled in an
  earlier run of the script, or in another script). Families that select on a whole drawn menu
  sentence or on a number are not attempted. Most random-encounter families are not established:
  their script fills the slot in one run and prints it in a later one.
- **Slots read before the script fills them**: the observer reads a family's slot when the unit's
  trigger runs. Where the script saves the value between the trigger and the print, the observer
  sees what the slot held before, and the narrator names the wrong thing or nothing. The same
  walk is made to the trigger and the two lists must agree. The slot is not read at all where a
  selector at the trigger names the value itself from a count the script has already made (the
  single proclamation at City Hall: the rewards collected, 0x4ac1, give the number before the
  script saves it into 0x985e). There the values the selector can name must be exactly the ones
  the print can show.

The tavern tales are reported under the table and not counted: the manifest has 24 recordings from
the first release and the script in `game/` decides how many can be rolled.

## Adding coverage from a new run

Any run of the game can add coverage. Set the ledger, play, merge:

```
export POR_GAMEDATA=../por-assets/gog-1.3/POOLRAD POR_AUDIO_DIR=../por-assets/original
POR_NARRATION_LEDGER=$PWD/out/narration-ledgers/acceptance-slums.jsonl npm run acceptance:slums
POR_NARRATION_LEDGER=$PWD/out/narration-ledgers/campaign-opening.jsonl \
  npm run verify:campaign-opening -- "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npm run qa:narration -- --merge out/narration-ledgers/*.jsonl
```

A Chrome run leaves `<run>.playback.jsonl` beside its ledger, so the same glob merges both. A run
with no Chrome (the acceptance harness) selects units and plays none.

The ledger path must be absolute when a check starts the runner from another directory. Give each
kind of run its own file name: the name is the run recorded in the coverage file. Start from an
empty file: a ledger appends, and merging a file that holds two plays of the same run counts the
silent cases of both. Commit `qa/narration-coverage.json`; the ledgers stay in `out/`.

Play with the browser (`npm run play`) works the same way: start it with `POR_NARRATION_LEDGER`
set and merge the file afterwards. Dice are real there, so it reaches variants a fixed replay
never rolls.

`--list` groups what is unheard by script (archive and block, with the area's name), so it reads
as a to-do list by area.
