# Running with no original file: the measurement

`npm run qa:standalone` measures how far the port is from the release shape in
`ROADMAP.md`: version 1.3, in Enhanced, with no file from the player. It prints a
table of parts with done, of and left, and exits 1 while anything is left or not
measured. It converts nothing. It only counts.

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

**1. Content files converted.** Every file of the 1.3 directory is put in one of
three classes. *Picture*: every block decodes as picture data, which Enhanced
replaces with artwork. *Content*: scripts, maps, wall definitions, monsters,
items, combat data, ready-made characters, saved games shipped with the release and the
configuration file, which the game cannot run without and which must become the
port's own data. *Program*: `START.EXE` and `GAME.OVR`. A file whose name says
content but which holds picture blocks is *unclassified* and counts as left.
Left is every content file not yet available from converted data. The second
row counts the host modules that open the game directory themselves, outside
the game's DOS calls: the art matchers compare what the game drew against the
original pictures, so today Enhanced needs the picture files even where it
shows none of their pixels.

**2. Program bytes that are not instructions.** The translated code replaces
the program's instructions, but it still reads text and tables from the loaded
image, from the overlay slices and from the data segment. Of is every byte of
the image and the slices that the translator did not emit as an instruction:
that is what must ship as converted data. The note gives how many of those
bytes the traced play read with the value the file gave them. A byte the game
wrote before it first read it is not counted, because its value did not come
from the file. Reads the host makes through the guest's memory (the journal,
the overlay call tables) are counted with the game's own. The second row
checks the claim that no instruction is needed as data: left there is the
number of instruction bytes the play read as data.

**3. Places Enhanced shows an original picture.** One row from the files: the
frames of the scene, encounter and combat archives that have artwork. Four rows
from play: title scenes with artwork, pictures in the picture panel with
artwork, the 8 by 8 wall textures of the 3D view with artwork, and Enhanced
frames with no original pixel. For the last, the runner takes the frame it
hands to the page (the game's drawing with every part the page draws itself
blanked out), removes what the page's layers cover, and counts the pixels of
the game's own drawing that are still visible. The breakdown under the table
gives those frames by what they showed.

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

## What it cannot see

The page's own fallbacks happen in the browser, after the frame has left the
runner: a picture that fails to load is replaced by the original pixels, and a
browser without WebGL shows the original first-person view. They are not
counted.
