# The Enhanced code wheel

The browser's `/code-wheel` page uses the packaged images of the original runes and the recovered
layout. The standalone page lets players turn the wheel and read the letters. The game page shows the same wheel at the start-up
prompt in Enhanced display, and keeps it to hand for the rest of the game: see "The wheel at
start-up" and "In the game" below.

The original game shipped with a cardboard translation wheel. At start-up the game shows an
Espruar rune, a Dethek rune and a path, and asks for the word found on the wheel. The version 1.3
program GOG sells accepts any answer. Classic keeps that. Enhanced shows the whole wheel on screen
as part of the game and requires the right word.

This page is the brief for the wheel's artwork and the description of how the wheel is laid out.
The facts about the original are in [qa/research/code-wheel.md](../qa/research/code-wheel.md).

## Status of the artwork (2026-11-21)

| Pieces | Status |
| --- | --- |
| The 70 runes, `espruar-NN.png` and `dethek-NN.png` | In place: the original runes, enlarged. `python tools/build-code-wheel-runes.py` makes them from the pictures in `por-assets/codewheel/runes`: each 16 by 8 pixel glyph enlarged to 256 by 128 with smoothed edges and coloured gold. Nothing is redrawn, so every tile is the rune the game shows. |
| `path-dashes.png`, `path-dash-dot-dot.png`, `path-dots.png` | Accepted. |
| `background.png`, `outer-disc.png`, `inner-disc.png` | Accepted. |
| `espruar-translate-tab.png`, `dethek-translate-tab.png` | Redone as a matching pair. |

A first set of rune tiles was hand-drawn as new shapes and was rejected: the player answers the
game's question by finding on the wheel the runes the game shows, so the wheel's runes have to be
the real ones. `npm run verify:code-wheel` tests that: each tile must overlap its own reference by
at least 0.70 and no other rune of its alphabet clearly more. If the runes are ever restyled, they
must still pass it, and the test's threshold is not to be lowered to fit new art.

## How the wheel works

Two discs, one on top of the other, each with 36 positions, 10 degrees apart.

- **Outer disc.** 35 Espruar runes and a translate tab around its rim. Inside the rim, six rings of 36 letters.
- **Inner disc.** Smaller, turns on the same centre. 35 Dethek runes, a translate tab, and three
  paths. A path is a line of six windows running from the centre outward, one window over each
  letter ring. The three paths are marked the way the game draws them: dashes, dash-dot-dot, dots.

To answer a question, turn the inner disc until the Dethek rune sits against the Espruar rune,
find the path, and read the six letters in its windows from the inside to the outside.

## Where the layout comes from

The layout is the real wheel. `src/codewheel/wheel.json` holds it: the rune at each of the 36
positions of each disc, the six letter rings, each path's six windows, and the 13 questions the
game asks. It was transcribed from a scan of the physical wheel (the source is named in the file)
and checked against the game: the rune pictures match the game's own prompt pixel for pixel, and
`npm run verify:code-wheel` confirms that all 13 questions read the word the version 1.3 program
expects. Each path gives the same 36 words, BEWARE, COPPER, DRAGON and so on in alphabetical
order, one for each turn of the inner disc.

Each disc has 35 runes and one tab marked "TRANSLATE FROM". The tabs translate a rune to a letter
or digit: bring the rune to its tab and read the innermost letter ring under the dotted path. With
the two tabs lined up that ring shows 0, and each position clockwise brings the next rune of each
alphabet to the tabs: A, B, C and so on. The game's runic messages are read that way.

## Reference material

In `por-assets/codewheel/`:

- `wheel_back.png` and `wheel_front.png`: scans of the two real discs. The back disc carries the
  Espruar runes and the letters; the front disc carries the Dethek runes and the windows.
- `runes/`: all 70 runes, 64 by 32 pixels, named by disc and position:
  `espruar-pieceNN-….png` is the rune for slot `espruar-NN`, and `dethek-pieceNN-….png` for
  `dethek-NN`.
- `scan-weekendwastemonster.jpg`: another scan, of the assembled wheel.

In `por-assets/gog-1.3/codewheel-art/`: GOG's 70 redrawn rune tiles and their contact sheet, and
`questions-cut-sheet.png`, the 13 questions as the game draws them.

## The 13 questions

| # | Word | Espruar slot | Dethek slot | Path |
| ---: | --- | --- | --- | --- |
| 0 | BEWARE | `espruar-05` | `dethek-05` | dashes |
| 1 | ZOMBIE | `espruar-20` | `dethek-20` | dash-dot-dot |
| 2 | NOTNOW | `espruar-11` | `dethek-11` | dots |
| 3 | COPPER | `espruar-31` | `dethek-30` | dashes |
| 4 | DRAGON | `espruar-27` | `dethek-13` | dash-dot-dot |
| 5 | EFREET | `espruar-35` | `dethek-08` | dots |
| 6 | FRIEND | `espruar-02` | `dethek-34` | dashes |
| 7 | JUNGLE | `espruar-03` | `dethek-19` | dash-dot-dot |
| 8 | KNIGHT | `espruar-06` | `dethek-09` | dots |
| 9 | SAVIOR | `espruar-12` | `dethek-31` | dashes |
| 10 | TEMPLE | `espruar-16` | `dethek-22` | dash-dot-dot |
| 11 | VULCAN | `espruar-15` | `dethek-07` | dots |
| 12 | WYVERN | `espruar-11` | `dethek-26` | dashes |

Questions 2 and 12 use the same Espruar rune. The player matches the wheel against the runes the
game's prompt shows, so every rune on the wheel must be recognisably the real one.

## Artwork brief (all 70 runes, 2 tabs, 3 path marks, background and 2 discs are in `upgrades/codewheel/`)

All pieces are PNG with transparency, drawn in the Enhanced style used for the rest of the port.
They go in `upgrades/codewheel/`, named by slot.

### Runes: 70 pieces

One picture per rune, 256 by 128 (the runes are wider than tall), transparent background,
upright, the rune filling the picture the way it fills its reference. The page turns each to sit
on its rim.

- **35 Espruar runes:** `espruar-00.png` to `espruar-35.png`, without 26, which is the tab.
- **35 Dethek runes:** `dethek-00.png` to `dethek-35.png`, without 04, which is the tab.

Each must be the rune in its reference picture in `por-assets/codewheel/runes/`, redrawn, not
reinvented: the same strokes in the same places, rendered in the Enhanced style. Espruar is the
Elvish script, flowing and curved; Dethek is the Dwarvish one, cut in straight strokes. The
Enhanced prompt and the wheel use the same tile for a slot, and because each tile is the real
rune, it also matches what Classic shows.

### Tabs and path marks: 5 pieces

- `espruar-translate-tab.png` and `dethek-translate-tab.png`, 512 by 256: the "TRANSLATE FROM"
  tab of each disc, as on the scans.
- `path-dashes.png`, `path-dash-dot-dot.png`, `path-dots.png`, 512 by 64: the mark that labels
  each path. References: `questions/q00-path.png`, `q01-path.png` and `q02-path.png` in
  `por-assets/gog-1.3/codewheel-art/`.

### The discs: 3 pieces

- `outer-disc.png`, 2048 by 2048: the back disc with no runes and no letters on it. The page
  draws the Espruar runes on its rim and the letters in its rings.
- `inner-disc.png`, 2048 by 2048, transparent outside the disc: the front disc with no runes, no
  windows and no path marks. The page cuts the 18 windows, draws the Dethek runes and places the
  path marks.
- `background.png`, 2048 by 1280: what the wheel sits on. GOG's program used a faded Moonsea map
  (`background-1.png` in `por-assets/gog-1.3/codewheel-art/`).

Follow the scans for the look of the discs: printed card, two discs joined at the centre.

## Geometry the page uses

Fractions of the outer disc's radius, measured from the centre of the 822 × 822 scans. Position 0
is at the top and positions run clockwise. The outer scan has a radius of about 410 pixels and the
inner disc has a radius of about 356 pixels on the same scan scale.

| Part | From | To |
| --- | ---: | ---: |
| Letter ring centres 1 (innermost) to 6 | 0.36 | 0.69, at roughly 0.065 intervals |
| Inner disc edge | | 0.87 |
| Dethek rim band | 0.73 | 0.87 |
| Espruar rim band | 0.82 | 1.00 |

The letter rings lie under the inner disc and show only through its windows. The inner disc
overlaps the inside of the Espruar rim band, so centre the Espruar marks near 0.94 and the Dethek
marks near 0.80.

## The wheel at start-up

While the game asks its question, the runner's frame state carries `codeWheel`: the question's
number and its Espruar slot, Dethek slot and path. The runner learns the number from the
`Random(13)` call the game's code-wheel routine makes, and writes nothing to the game.

- **Classic** shows the game's own prompt and the game takes any word.
- **Enhanced** covers the prompt with the wheel, drawn by the same code as the `/code-wheel`
  page (`tools/code-wheel-draw.js`), beside the question's two runes and its path mark. Left and
  Right, the mouse wheel or a drag turn the inner disc one position at a time. Typed letters
  enter the word and Enter submits it. The right word is passed to the game as typed keys. A
  wrong word shows "Sorry, that's incorrect." and a new question, as the first release's program
  does, and the third wrong word ends the session until the page is reloaded. The game itself
  still holds the one question it drew: the new question lives on the page.

`npm run verify:code-wheel-screen -- <chrome-executable>` checks all of this on version 1.3.

## In the game

The wheel is meant to behave like the cardboard one a player kept beside the keyboard: there when
the game asks for it, put aside and picked up again at will. The original player needed it at
start-up and again during play, to translate runes the game shows on screen and to read Journal
Entry 35 (the sources are in the research note, "When the player needs the wheel").

### At the start-up question

In Enhanced display the wheel appears over the play area by itself when the game asks its
question. The player turns the inner disc by dragging, with the mouse wheel, or with the Left and
Right arrow keys, types the word and presses Enter. A wrong word is refused with "Sorry, that's
incorrect." and a new question is asked; the third wrong word ends the session until the page is
reloaded. That is what the unpatched game does (see the research note). The page does the
refusing: the game's code and its dice are the same in both displays.

**Put the wheel away**, **Escape** or the **Code wheel** control beside Journal and Map puts the
wheel away. The game's own question screen is then in view, in Enhanced display, with a card in
its empty lower part that carries the question's two runes, its path, the word typed so far, any
refusal and a **Show the wheel** control. Escape, that control or **Code wheel** brings the wheel
back. The disc's turn and the typed letters are kept either way, and typing the word and
pressing Enter works the same whether the wheel is showing or put away: the same refusal, the
same three tries, the same ending. After a wrong word the card shows the new question; the
game's screen above it still shows the one question the game drew.

### When the game shows runes

The wheel is there only when the game needs it. When the game puts runic writing on screen (the
Sokal Keep parchment, the password papers, the sign in Yarash's pyramid), the wheel comes up by
itself, as the player of the original would reach for the cardboard. **Escape**, **Put the wheel
away** or **Code wheel** puts it away and brings it back while the runes are on screen. When the
runes leave the screen the wheel goes with them. At any other time there is no Code wheel control
and no shortcut: every key goes to the game. (Until 2026-11-22 a Code wheel control and a W
shortcut opened the wheel at any time. The owner had asked for the wheel at the right time, not
always, and they were removed.)

- Up, the wheel takes **Left** and **Right** (turn), **T** (translate position) and **Escape** (put
  away). Every other key is dropped while it is up, as the Journal drops them. F10 still changes
  the display.
- **Translate**, or **T**, turns the inner disc until the two TRANSLATE FROM tabs meet, the
  position the Cluebook starts from. From there each position clockwise brings the next rune to
  the tabs. The player reads the letter in ring 1 under the dotted path. The page does not read
  it out or type it: translating is the player's to do, as with the cardboard.
- With no question to answer no path is picked out. Journal Entry 35's two runes and path are
  read as at start-up: match the runes and read the path from the inside out.

The disc stays where it was left: between the question and the tool, between openings, and
across a reload on the same browser (the page keeps the position in its own storage and works
without it).

### The runes the game writes during play

After start-up the game writes words in runes at five places, for the player to translate with
the wheel and type back: the parchment at Sokal Keep (LUX, SAMOSUD, SHESTNI in Espruar), the
guards' list in Valjevo Castle (HARASH in Espruar, RHODIA in Dethek), the freed slave's slip and
Cadorna's slip (RHODIA), and the sign in Yarash's pyramid (NOKNOK in Dethek). The research note
has the scripts, the screen positions and where each word is asked for.

Enhanced draws those runes from the wheel's own rune pictures, at the game's positions, so the
runes on screen are the pictures the player turns the wheel to. The shipped game runs from the
port's own data, whose 8 by 8 font has no pixels, so the game's picture has no runes of its own
there. The rule has no list of places: a glyph the game draws with its rune font is not text
(`visibleGameRunes` in `src/runtime/video.ts`), and the frame names it (`runes`: cell, glyph
code, colour). The page (`gameRunes` in `tools/play.js`) looks the codes up in
`tools/rune-glyphs.js`: an Espruar letter, two glyphs side by side, is one picture over its two
cells; a Dethek letter, one glyph, is the middle of its picture in its one cell. The picture's
gold stroke is drawn in the game's colour for the cell and its dark outline is kept, so the rune
is the wheel's shape in the game's colour. With the player's original files the game's own rune
is in the picture under the drawing, whose outline covers it, and Enhanced looks the same;
Classic shows the game's picture. Where runes are written in the picture box (the Sokal
parchment, after the script's CLEAR BOX) the host drops a held portrait, which in the shipped
game would otherwise stay over them: its blank pixels still match the cleared box. Before
2026-11-21 only the Sokal parchment was handled, and the guards' list and both slips came out
partly or wholly as letters (`OPABfgABhiOP` for HARASH). Until 2026-11-22 Enhanced showed the
game's glyphs only, so the shipped game showed no runes at all.

`npm run verify:rune-glyphs` proves the table: every one of the wheel's 70 pictures is named
once and reads as its letter at the translate position; the game's 13 start-up questions, read
from the program's own table, draw the pictures the wheel's questions show; the strings of the
eight rune instructions in the scripts read LUX, SAMOSUD, SHESTNI, RHODIA, HARASH, RHODIA,
RHODIA and NOKNOK; and, with the original files, each of the 106 glyphs of the game's rune font
is its picture's cell pixel for pixel. Dethek W, X and Z are one glyph in the game's font and
one rune on the wheel: "some Dethek runes have more than one translation".
The page does not translate, and the narrator does not say the word: no recording covers a rune
instruction.

What a later change must keep: nothing but the rune's own picture may be drawn over a rune cell,
an illustration at one of these places must not show the word in letters, and a narration line
for one of these passages must not speak it. `npm run verify:runes-readable -- <chrome>` checks
the five places in Chrome in both displays and types SHESTNI, NOKNOK and RHODIA where the game
asks. It reaches Sokal Keep by play and the other four by developer travel, which its header
explains. With `POR_GAME_SOURCE=port` it runs the shipped game from `game/` and requires the
wheel's picture of each rune in its cells.

### Classic

Classic shows the game's own prompt and accepts any word, as the program GOG sells does. It has
no wheel, no Code wheel control and no W shortcut: every key goes to the game. Switching display
at the prompt works both ways, and switching to Classic closes the tool.

`npm run verify:code-wheel-screen -- <chrome>` runs 18 checks in Chrome.
All 18 passed with the mounted GOG 1.3 data on 2026-11-22. For a checkout
without a sibling `por-assets` repository, set `POR_CODEWHEEL_REFERENCE`
to that repository's `codewheel/runes` directory before running
`npm run verify:code-wheel`. The comparison passed for all 70 rune tiles.
