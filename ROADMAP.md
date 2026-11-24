# Roadmap

## Goal

Release this repository on its own. It holds the translated runtime and
everything authored for the port: Enhanced artwork, atlas plates, effects,
music cues, narration, the journal, and the tools. The player supplies the
original DOS files. `TSavo/por-assets` keeps those files and the audio
rendered from them, and is not part of the release.

## Where the port stands

Measured on November 22, 2026 on Battleaxe (`npm run verify` and the
artwork inventory on the 1.3 files, `por-assets/gog-1.3/POOLRAD`). Each
row names its check or source.

| System | State | Check |
| --- | --- | --- |
| Translation | All 846 procedures of version 1.3 (171 resident, 675 in 35 overlay slices) and all 836 of the first release (78 resident, 758 in 38 slices) have a translated procedure, and the translation matches the generator. The first release's coverage table counts 988 translated procedures, which adds the routines reached only by a direct call. | `npm run verify`, `npm run verify:translation-reproducible` |
| Campaign | Character creation through the final council reward replays in Chrome from an empty save directory, on the regenerated translation. Three battles use the developer victory command. | `npm run verify:campaign -- <chrome-executable> --full` |
| Journal | 20 journal definitions match the original ECL dialogue, and 16 progress flags are checked through the translated setter. Leads and the tracked quest save with each slot. | `npm run verify` |
| Atlas and travel | 19 illustrated plates load. The Moonsea plate works as the overland travel map. | `npm run verify`, [Map concepts](docs/MAP-CONCEPTS.md) |
| Enhanced exploration | WebGL exploration reads the camera and walls from the active game map. Making that view look better is planned in [RENDERER.md](docs/RENDERER.md). | [New Phlan 3D prototype](docs/NEW-PHLAN-3D-PROTOTYPE.md), [Renderer](docs/RENDERER.md) |
| Enhanced artwork | 13,245 validated replacement mappings from 10,545 PNG files. Of 833 picture, sprite, and combat source frames, 700 are linked, 22 resolve through exact pixel matches, 70 through composed portrait matches, and 41 remain. All 448 tall and 352 small party icon combinations have both poses. | `npx tsx tools/art-inventory.ts` |
| Classic audio | All 21 original sound events of version 1.3 render through the decoded driver for PC speaker and Tandy. | `npx tsx tools/verify-original-audio.ts` |
| Enhanced effects and music | 11 approved effects and 2 approved music cues cover every reachable original event. | `npx tsx tools/verify-enhanced-audio.ts` |
| Narration | All 2,025 text-producing ECL events are classified into 1,432 narration units. All 1,751 queued recordings are complete, with none pending (the units and variants reference 1,745 of them, by `npm run qa:narration`). | `npm run verify-voice-master`, `npm run verify-narration-generation` |

[Coverage](docs/COVERAGE.md) records which checks use ordinary play and
which start from controlled saves. [Audio](docs/AUDIO.md) and the
[art inventory](docs/ART-INVENTORY.md) describe their pipelines.

## Campaign verification

- `npm run verify:campaign -- <chrome-executable> --full` starts in an empty
  save directory and carries the six original characters through Sokal Keep,
  Stojanow Gate, and Valjevo Castle. It uses the explicitly enabled developer
  victory command for the courtyard, castle guards, and Tyranthraxus. The
  original City Hall script awards the final reward, and slot I reloads with
  “Phlan is free” in the journal. Resume with `--finish-from-slums <slot-D>`,
  `--finish-from-sokal <slot-F>`, or `--finish-from-tower <slot-H>`. Each leg
  keeps its starting saves and input tape under `out/campaign-*` for
  `--replay-leg <directory>`. Set `POR_CAMPAIGN_OUTPUT_DIR` to store the run
  on another drive.
- The unedited party replay creates six characters, participates in Rolf's
  tour, equips the party in New Phlan, completes Ohlo's commission, and
  plays through the Slums and Sokal Keep's hidden armory. The verified
  route uses the original menus and saves. The full unedited campaign
  through the final council reward still needs a continuous replay.
- The original Tyranthraxus fight and City Hall finale have been replayed
  in Enhanced Chrome from a controlled party. With the prepared party outside
  the audience hall, use `--from-castle-ending <slot-B>` to replay the fight,
  collect the council reward, and reload the journal ending.
- The campaign party reached Tyranthraxus's tower through Stojanow Gate
  and the hedge maze with developer combat enabled. From the save at the
  stairs to the audience hall, `--from-castle-guards <slot-B>` replays both
  victories, the council reward, and the reload with “Phlan is free.”
- `npm run verify:campaign-opening -- <chrome-executable>` runs the opening
  in Enhanced Chrome from an empty save directory through the first Slums
  victory and reload. Each leg carries forward the party earned in play and
  keeps its input saves and key recording under `out/campaign-*`.
- `npm run verify:campaign -- <chrome-executable>` continues the party through
  Ohlo’s commission, the voyage to Sokal Keep, and the hidden armory. It reloads
  the earned equipment in slot F and speaks with the barracks spirits to recover
  the defenders’ diary and five gems. The party returns to New Phlan to
  restore the six fighters, replace their spent weapons, and hire an evoker.
  Slot J reloads the rearmed party beyond Sokal Keep’s undead patrol. The
  party takes the west passage and reloads outside the courtyard in slot I.
  The replay then verifies the witnessed ambush and Brin’s opening combat
  turn with the longsword and shield earned in play.
  Resume with
  `--from-slums <slot-D>`, `--from-sokal <slot-A>`, `--from-sokal-armory <slot-F>`,
  `--from-temple <slot-G>`, `--from-evoker <slot-H>`, or
  `--from-sokal-patrol <slot-J>`. Use `--replay-leg <directory>`
  to rerun a recorded leg independently in Chrome and compare its final frame.
- `--from-sokal-trained <slot-J>` resumes with the six trained fighters and
  their two recruits beyond the Sokal patrol. The [six-fighter checkpoints](qa/fixtures/sokal-six-fighters/README.md) supply J, C, H and E. The party wins the courtyard
  battle with the original Quick combat and reloads the courtyard note in
  slot C. Use `--from-sokal-courtyard <slot-C>` to continue from that save.
  The party speaks to Ferran, returns by boat, and claims the Sokal Keep
  commission reward at City Hall. Slot H preserves the reward and the journal
  turn-in. The party sells the reward jewelry to pay for healing and two
  resurrections, then rests at the New Phlan lodging. Use
  `--from-sokal-council <slot-H>` to replay recovery and reload all six
  original fighters in slot E. Use `--from-sokal-lodging <slot-E>` to
  replay the Podal Plaza auction, report the exchange to City Hall, and
  reload Cadorna's Textile House commission in slot A.
- `--from-textile-commission <slot-A>` resumes that party, wins the scorpion
  and hobgoblin courtyard battles with original combat, and reloads the
  cleared courtyard in slot D.
- `--from-bane-preparation <slot-A>` takes the same party through the eastern
  city gate, parleys with the orc patrol, and opens the temple's hidden
  cache. Slot D reloads with the Dust of Disappearance and the other items
  from that cache in Alda's inventory.
- The journal tracks witnessed clues and the selected commission in the
  active save slot. The slot also holds the party's discovered map.

## Open work

### Release

- **`.gitignore` still ignores `upgrades/*.png`.** New artwork reaches the
  repository only when it is added with force. Two strike sprites were
  listed in the manifest without their files until `5a0af5d6`. Remove the
  rule so a missing file shows up in `git status`.
- **Classic sound needs the player's own renders.** Classic plays WAV
  files from `por-assets/original`. A player with only the DOS files has
  none. `npm run render-original-sounds` writes the PC-speaker WAV files
  from their `START.EXE`. The Tandy WAV files also need the libvgm
  renderer. Decide how the release produces both, and add the step to the
  README.
- **Decide what derived text ships.** The narration transcripts and
  `src/audio/voice-review-extraction.json` contain the game's script text.
- **Check the release from a clean checkout** with no `por-assets`
  directory beside it, in both display modes.

### The release shape (decided 2026-11-21)

- **The shipped game is always version 1.3, and it needs no files from the
  player.** It runs in Enhanced.
- **Classic is unlocked by the player's own files.** If the player supplies
  the original game, from the first release or from 1.3, the Classic switch
  is enabled. Their files supply the original pictures, font and sound; the
  game that runs is still 1.3.
- **Everything the game needs besides the original pictures is extracted
  from the 1.3 files and converted** into the port's own data: the text, the
  scripts, the maps, the tables.

What that takes:

- Convert the 1.3 program's data and the non-art `.DAX` content, and run the
  game from the converted data with no original file present.
- Every picture Enhanced shows has its own artwork: nowhere may Enhanced fall
  back to an original picture.
- Enhanced draws all text itself, without the original font.
- A start-up path that detects the player's files, enables or hides the
  Classic switch, and says what supplying files unlocks.
- A check for each state: no files, 1.3 files, first-release files.
- Retire the first-release translation: with the game always 1.3, nothing
  runs it.

`npm run qa:standalone` measures how far the port is from running with no
original file: every original file and byte the game reads, sorted into
picture and non-picture, and every place Enhanced still shows an original
picture. [How to read it](docs/STANDALONE.md).

### Version 1.3

The port now runs two builds of the program: the first release, which shows
no version on its credits screen, and version 1.3, which is what GOG sells
and what the Stephen S. Lee walkthrough documents. The runner picks the
translation from the overlay file, so pointing `POR_GAMEDATA` at a copy of
1.3 runs the port, and every check, on 1.3.
[The measured differences](qa/research/version-1.3-differences.md).

**Goal:** the port runs version 1.3, passes every check the first release
passes, and all authored work carries over intact: artwork, narration,
sound, the journal, fast travel and the maps. `npm run qa:version-1.3`
measures each part and runs every check on 1.3 itself. It fails while
anything is left.

Done, as measured on 2026-11-21:

- All 846 procedures of 1.3 are translated into `src/translated-1.3`, and
  `npm run verify:translation-reproducible:1.3` checks them against the
  generator.
- Every program address the host uses is named in
  `src/runtime/bindings.ts` with one value per build. No raw address is
  left in the host files.
- All 8,076 artwork keys and 1,432 narration units work on 1.3 without a
  rename. One script moved by three bytes, and the host converts positions
  where it reads them.
- The original sound: the renderer matches the 1.3 driver exactly, and the
  events 1.3 can play give the same output as before, so the Classic sound
  files are unchanged.
- `npm run verify`, `npm run verify:input`, the voice and narration checks,
  the campaign opening, the map and journal check, a load of a first-release
  save, and the full campaign replay all pass on 1.3.

On 2026-11-21 `npm run qa:version-1.3` exited 0 with nothing left: it ran
all ten checks on 1.3 itself, the full campaign replay in Chrome included
([the output](qa/evidence/version-1.3-measure-2026-11-21.txt)).
[How replays are driven](docs/REPLAYS.md) explains what changed to make the
campaign key lists work on both builds.

It passed a second time the same day, run in the main checkout at a later
commit ([the output](qa/evidence/version-1.3-measure-2026-11-21-second-run.txt)).
A third run, at commit `ee03d282` on a checkout that did not change during
the run, passed all 13 checks the measure now holds, the code wheel checks
and the New Phlan acceptance tests among them
([the output](qa/evidence/version-1.3-measure-2026-11-21-third-run.txt)).

**Version 1.3 is the version the port targets.** The port runs whichever
build is in the game directory, so there is no switch to flip: new checks
and the walkthrough acceptance tests are written against 1.3, and the first
release stays only as a second build to compare with.

Left:

- Retire the first release once nothing depends on it: the `src/translated`
  copy, its column in `src/runtime/bindings.ts`, and the checks' first-release
  paths.
- Check the whole game against 1.3 and the walkthrough. The differences in
  behaviour found so far are in the research note.

### Translation

- `Crt.Delay` ends after one pass. The generator leaves the flags off one
  `dec dx` because the emulated BIOS tick is too fast for Crt's delay
  calibration. Recalibrate the tick, restore the flags, and record the
  input tapes again. [Coverage](docs/COVERAGE.md) has the detail.
- The sound driver's timer interrupt handler is decoded by hand in
  `src/audio/original-driver.ts` and has no translation. Neither do the
  library routines that have no prologue and no direct caller.
- 11 indirect far calls resolve at run time. No static check covers
  their targets.
- Only two procedures have byte-level checks of their own. The rest are
  verified through play.

### Campaign

- Replay the full campaign in one continuous run with original combat in
  place of the developer victory command at the courtyard, the castle
  guards, and Tyranthraxus.
- The coverage log still lists these as open:
  - winning the Textile House ogre and Grishnak fights, claiming the
    brass key, and recovering the treasure through ordinary play;
  - the Buccaneer Base gate escape through the council reward as one
    continuous replay;
  - the Kobold Caves surrender branch;
  - loading an exported DOS save in the original executable.
- Kuto's Well, Kovel Mansion, Valhingen Graveyard, and Stojanow Gate are
  covered from prepared saves. The log records no commission completed
  there through ordinary play.
- The log records character creation for dwarf fighters and one human
  magic-user. The other races and classes have no recorded replay.

### Artwork

- 41 source frames remain unlinked after exact-pixel and composed-portrait
  matches (6 of them uniform, 35 distinct non-uniform pixel signatures).
  Many are animation members or share pixels with art bound elsewhere.
  Check the draw in Chrome before commissioning a replacement.
- No literal script picture reference points to an unlinked frame
  (`unlinkedScriptPictures` is empty in the inventory).
- Interface drawing and embedded graphics in `START.EXE` and `GAME.OVR`
  still need their own audit.

### Audio

- Separate character voices are the project owner's to cast. No dialogue
  lines are authored yet. The narrator performs quoted speech.
- `npm run voice-coverage` reports the earlier Drama 3 plan: 17 of 1,551
  entries selected and no final assets. Retire it, or point it at the
  master manifest.

### Documentation

- [PORT.md](docs/PORT.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md) were
  brought up to the code in #88.
- The procedure table in [COVERAGE.md](docs/COVERAGE.md) counts two
  procedures verified on their own; the rest are verified through play. The
  log also keeps superseded combat watchdog passages and some damaged
  characters.
- The README does not yet cover audio setup.

## Earlier plan

The first version of this file laid out ten phases, from mapping the
binary through a full campaign. The game systems in those phases are now
exercised in play. The second, data-only campaign from the last phase has
not been started. The phase descriptions remain in the history of this file.
