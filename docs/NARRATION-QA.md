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
npm run qa:narration -- --merge <ledgers...>   fold new runs into qa/narration-coverage.json
npm run acceptance:narration-dynamic           three dynamic families, driven until they fire
```

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
| `{"t":"f", "key", "portrait", "encounter", "scene", "classic"}` | a frame's artwork. `portrait` is an Enhanced portrait or scene illustration and `encounter` an Enhanced encounter picture: both are keys of the artwork manifests, and are only present when that artwork is installed. `classic` means an original picture is showing with no Enhanced artwork for it. `key` marks a frame on which the game waits for the player. Written while a narration is waiting for its frame, and whenever the artwork changes |
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
not prove that the browser played the file: `tools/play.js` queueing and key handling are not
measured here.

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

`qa/narration-coverage.json` holds what has been heard and the run it was heard in. A unit,
variant or selector that is not listed has not been heard.

Rows that come from play:

- **Units heard at their passage** (of 1,432): a run chose the unit at its trigger.
- **Dynamic variants selected** (of 392): the variant's condition matched the game's state.
- **Deferred selectors resolved** (of 43): play reached the selector's passage and it chose a unit
  (or its silent case).
- **Silent cases found in play** (must be 0).
- **Heard passages with their artwork showing**: of the units heard, those where an Enhanced
  portrait, scene illustration or encounter picture was on screen between the narration starting
  and the game next waiting for a key. A passage that was heard once without artwork counts as
  without, and `--list` names it with what was showing instead: the original picture, or no
  picture (the view of the area). This row says whether artwork was there. It does not compare the
  artwork's variant with the narration's variant.

Rows that need no play, and must be zero:

- **Recordings missing under `audio/`**: every unit and variant asset file.
- **Variant conditions that overlap**: within a family every condition and every selecting value
  is distinct, so no two variants can match at once.
- **Variant families the observer cannot select**: the observer reads one slot per family. Where
  it finds no single slot, or a slot other than the one the family's conditions name, no variant
  can ever be chosen.
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
  walk is made to the trigger and the two lists must agree.

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

The ledger path must be absolute when a check starts the runner from another directory. Give each
kind of run its own file name: the name is the run recorded in the coverage file. Start from an
empty file: a ledger appends, and merging a file that holds two plays of the same run counts the
silent cases of both. Commit `qa/narration-coverage.json`; the ledgers stay in `out/`.

Play with the browser (`npm run play`) works the same way: start it with `POR_NARRATION_LEDGER`
set and merge the file afterwards. Dice are real there, so it reaches variants a fixed replay
never rolls.

`--list` groups what is unheard by script (archive and block, with the area's name), so it reads
as a to-do list by area.
