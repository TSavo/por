# Running with no original file: the measurement

`npm run qa:standalone` measures how far the port is from the release shape in
`ROADMAP.md`: version 1.3, in Enhanced, with no file from the player. It prints a
table of parts with done, of and left, and exits 1 while anything is left or not
measured. It converts nothing. It only counts, and it needs the original 1.3
files to count against.

```
POR_GAMEDATA=../por-assets/gog-1.3/POOLRAD POR_AUDIO_DIR=../por-assets/original \
POR_PYTHON=<python with capstone> npm run qa:standalone
```

| Option | Effect |
| --- | --- |
| `--list` | Also list every file with its class and evidence, every picture shown from the original files, and every instruction byte read as data. |
| `--trace DIR` | Read the trace of an earlier run instead of playing again. |
| `--skip-play` | Only the parts measured from the files. The run-time parts print `?` and count as not measured. |

The report writes its working files to `out/qa-standalone`: the trace, a log per
play, the art inventory and the translator's data map.

## Where the numbers come from

Two kinds of number appear, and each row says which it is.

**From the files.** The art inventory (`tools/art-inventory.ts`) decodes every
block of every archive and names its format. The translator
(`tools/tp_translate.py --data-map`) says which bytes of the unpacked
`START.EXE` and of each overlay slice it emitted as instructions. The sound
table and the artwork manifests are read as they are.

**From play.** The report plays the game with `POR_TRACE_STANDALONE=<directory>`
set. That makes the runner write, for each runner process:

| File | Content |
| --- | --- |
| `<pid>.files.json` | Every DOS open, read, write and delete by file name, and the byte ranges read. |
| `<pid>.memory.bin` | One byte for each address of the guest's first megabyte: 0 never read, 3 read before anything was written there, 1 first read after a write. |
| `<pid>.memory.json` | Where the data segment, the stack and each overlay slice sit. |
| `<pid>.enhanced.json` | Each Enhanced frame by kind, the original pixels left in it, the pictures and scenes shown, the wall sets of the 3D view, every character drawn with the game's font, every sound requested. |

The trace only observes. It is observer lists in `src/runtime/dos.ts` and
`src/runtime/video.ts`, calls in `tools/live-input.ts` and
`tools/boot-translated.ts`, and a wrapper around the guest memory accessors, all
gathered in `tools/standalone-trace.ts`. Without the variable the lists are
empty and the wrapper is not installed. The runner is killed while it waits for
a command, so the files are rewritten before every wait.

There are two kinds of play. The acceptance tests drive the runner over a pipe,
without the server; they feed the files, program bytes, font and sound parts.
It is the server that tells the runner which artwork exists, so only the plays
that go through the server and Chrome feed part 3. A runner that was not told
the artwork is left out of part 3: it would report every picture as original.

The run-time numbers cover exactly the play the report lists under the table,
and nothing else. A file, a block, a program byte or a picture the game would
touch in some other part of the game is not in them. They are lower bounds on
what the game uses, never totals.

## The parts

The converted data is `game/` ([GAME-DATA.md](GAME-DATA.md)). The report reads it
through the runner's own reader and compares it with the 1.3 files, so "done"
means the game is handed the same thing from `game/` as from the original.

**1. Content files the converted data reproduces.** Every file of the 1.3
directory is put in one of three classes. *Picture*: every block is picture
data, which Enhanced replaces with artwork. A block counts as a picture when
the art inventory decodes it as one, or when it starts with a picture header
whose shape accounts for its size. *Content*: scripts, maps, wall definitions,
monsters, items, ready-made characters, the saved games shipped with the
release and the configuration file, which the game cannot run without.
*Program*: `START.EXE` and `GAME.OVR`. A file whose name says content but which
holds picture blocks is *unclassified* and counts as left. A content file is
done when the file the reader builds from `game/` has the same records with the
same bytes.

**2. Program bytes that are not instructions.** The translated code replaces
the program's instructions, but it still reads text and tables from the loaded
image, from the overlay slices and from the data segment. Of is every byte of
the image and the slices that the translator did not emit as an instruction.
Done is how many of them `game/` keeps with their original value. The note
gives how many of those bytes the traced play read with the value the file gave
them, and how many of the bytes `game/` does not keep the play read: that last
number has to be 0. A byte the game wrote before it first read it is not
counted as read, because its value did not come from the file. Reads the host
makes through the guest's memory (the journal, the overlay call tables) are
counted with the game's own. The second row checks the claim that no
instruction is needed as data: left there is the number of instruction bytes
the play read as data. The port loads the image at address 0, so a read through
segment 0 (an empty pointer, an interrupt vector) lands on the program's first
bytes; the detail line names each such byte and the code that read it.

**3. Places Enhanced shows an original picture.** Two rows from the files: the
frames of the scene, encounter and combat archives that have artwork, and the
host modules that decide which artwork to show by decoding the pixels of the
original pictures. `game/` holds each picture's shape and hashes and no pixels,
so until those modules work from identities, Enhanced finds no artwork without
the original files. Four rows from play: title scenes with artwork, pictures in
the picture panel with artwork, the 8 by 8 wall textures of the 3D view with
artwork, and Enhanced frames with no original pixel. For the last, the runner
takes the frame it hands to the page (the game's drawing with every part the
page draws itself blanked out), removes what the page's layers cover, and
counts the pixels of the game's own drawing that are still visible. The
breakdown under the table gives those frames by what they showed.

**4. Characters the page draws.** Enhanced draws game text itself, in the web
font, from the characters the host captured as the game drew them. A character
the host did not capture stays on the frame as pixels of the original font.
Left is the number of such draws; the note lists their character codes. Spaces
and draws in colour 0 are left out: the game uses them to erase, and they put no
pixel on the screen.

**5. Sound.** Events Enhanced plays from `audio/enhanced` in the repository,
against events it would fetch as a WAV rendered from the original driver, which
lives in `por-assets`.

**6. Original material in the repository.** A list, with sizes, of the paths
that hold original game content or material derived from it. It has no left.

**7. Plays that pass from the converted data alone.** The input check and the
New Phlan and Slums acceptance tests, run with `POR_GAMEDATA` naming `game/` and
no original directory. They show that the game itself runs. They are driven
over a pipe and read text, so they say nothing about pictures.

## What it cannot see

The page's own fallbacks happen in the browser, after the frame has left the
runner: a picture that fails to load is replaced by the original pixels, and a
browser without WebGL shows the original first-person view. They are not
counted.

## Port parity: the same play, the same Enhanced pictures

`npm run verify:port-parity` (`tools/verify-port-parity.mjs`) asks whether the
shipped game shows what the original files show. It drives the same keys
through the game twice with the acceptance harness: once from the version 1.3
files (`POR_GAME_SOURCE=original`, `POR_GAMEDATA`, by default
`/Users/tsavo/por-assets/gog-1.3/POOLRAD`) and once from `game/`
(`POR_GAME_SOURCE=port`). Both runs get the artwork keys the browser server
gives the runner and the tiles it places from the packaged terrain
(`tools/enhanced-runner.ts`, shared with `tools/browser-play.ts`). The original
files' run is the reference: every difference is a fault of the `game/` run
until shown otherwise.

On every frame the runner sends, and on every animation frame in it, it
compares the Enhanced artwork: whether the page would draw the 3D view
(`webgl`, the rule of `explorationSurface` in `tools/play.js`), scene,
portrait, the Classic fallback, character sheet pieces, encounter,
perspective, scenery, exploration, tiles, combat art, combat selections and
effects, battle tiles and props, panel frame and runes. The two runs see the
same text on every frame (`npm run verify:game-data`), so frame n of one is
frame n of the other. If the text ever differs, the walk stops there and says
so.

Four walks:

- `start`: the publisher and title screens; adding SSI's ready-made party;
  creating a character through race, sex, class, alignment, the roll, the
  name, the portrait's head and body, and the combat icon editor (parts, both
  colours, size); a character sheet; the New Phlan opening (Rolf's tour) to the
  first exploration menu; the Temple of Sune; the arms shop; camp.
- `slums`: from the guide party's fixture (`qa/fixtures/guide-party-new-phlan/`),
  the inn to the Slums, the random fights on the way, fought on Quick, and the
  orcs' fight at (13,1).
- `sokal`: the ready-made party after Rolf's tour, City Hall and the clerk, the
  passenger dock, the boat, and the arrival at Sokal Keep, looking round in all
  four directions (81 frames; all agreed on 2026-11-22).

- `leg`: a recorded walk from its own saves and keys, by default the campaign's
  Sokal leg (`qa/fixtures/campaign-sokal-leg/`); `POR_PARITY_LEG=<directory>`
  plays another. The campaign's legs are in `qa/fixtures/campaign-*-leg/`. Walks
  to the areas the campaign never enters (#130) are in `qa/fixtures/visit-*/`,
  recorded from `game/` with `node tools/record-walk.mjs <saves> <slot>
  <directory>`, which holds the game open on a local port while a player's keys
  are sent, with normal input; `node tools/record-walk.mjs --replay <directory>`
  plays one back and writes its visit trace for `npm run qa:visits`.

`POR_PARITY_ONLY=start`, `=slums`, `=sokal` or `=leg` before `npm run verify:port-parity`
runs one walk. Each took about four to six
minutes on the Intel Mac on 2026-11-22; both together took about nine. Each
walk plays one game at a time, first from the original files, then from
`game/`.

The report: each screen and kind of artwork that differs is printed as `DIFFERS
<walk> / <screen> / <kind>`, with how many frames differ, the first frame's
number and bottom line, and what only one side has. `out/port-parity.json`
holds every finding with all its frame numbers, the merged lists of what is
missing from `game/` and what is extra, and, under `first`, the whole value of
that kind from each source (`original`, `port`) at the first frame that
differs. `out/port-parity/` holds that frame as PNG: Classic and Enhanced from
the original files, and Enhanced from `game/`. The check exits 1 while
anything differs. Its open findings are in `qa/findings.json` (class
`enhanced`, check `port-parity`).
