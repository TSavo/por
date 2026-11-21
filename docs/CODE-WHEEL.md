# The Enhanced code wheel

The original game shipped with a cardboard translation wheel. At start-up the game shows an
Espruar rune, a Dethek rune and a path, and asks for the word found on the wheel. The version 1.3
program GOG sells accepts any answer. Classic keeps that. Enhanced shows the whole wheel on screen
as part of the game and requires the right word.

This page is the brief for the wheel's artwork and the description of how the wheel is laid out.
The facts about the original are in [qa/research/code-wheel.md](../qa/research/code-wheel.md).

## How the wheel works

Two discs, one on top of the other, each with 36 positions, 10 degrees apart.

- **Outer disc.** 36 Espruar runes around its rim. Inside the rim, six rings of 36 letters.
- **Inner disc.** Smaller, turns on the same centre. 36 Dethek runes around its rim, and three
  paths. A path is a line of six windows running from the centre outward, one window over each
  letter ring. The three paths are marked the way the game draws them: dashes, dash-dot-dot, dots.

To answer a question, turn the inner disc until the Dethek rune sits against the Espruar rune,
find the path, and read the six letters in its windows from the inside to the outside.

## Where the layout comes from

The program holds only the 13 questions the game can ask. No source for the rest of the physical
wheel has been found yet, so the layout is built: `python tools/build-code-wheel.py` places the
runes the game uses, sets the letters those 13 questions need, and fills every other position
from a fixed random seed. It writes `src/codewheel/wheel.json` and checks that all 13 questions
read their word. `--check` fails if the file and the script disagree. If the real wheel's layout
turns up, it replaces the generated one and the artwork slots stay the same.

`wheel.json` holds, for each disc, the rune at each of the 36 positions; the six letter rings;
each path's six window positions; and the 13 questions.

## The 13 questions

Reference pictures are in `por-assets/gog-1.3/codewheel-art/`, captured from the game's own
prompt at its native size (16 by 8 pixels for a rune). `questions-cut-sheet.png` there shows all
13 enlarged on one sheet.

| # | Word | Espruar slot | Reference | Dethek slot | Reference | Path |
| ---: | --- | --- | --- | --- | --- | --- |
| 0 | BEWARE | `espruar-1d1e` | `questions/q00-espruar.png` | `dethek-6c70` | `questions/q00-dethek.png` | dashes |
| 1 | ZOMBIE | `espruar-5b5c` | `questions/q01-espruar.png` | `dethek-4d` | `questions/q01-dethek.png` | dash-dot-dot |
| 2 | NOTNOW | `espruar-2c2d` | `questions/q02-espruar.png` | `dethek-6a` | `questions/q02-dethek.png` | dots |
| 3 | COPPER | `espruar-090a` | `questions/q03-espruar.png` | `dethek-43` | `questions/q03-dethek.png` | dashes |
| 4 | DRAGON | `espruar-0102` | `questions/q04-espruar.png` | `dethek-68` | `questions/q04-dethek.png` | dash-dot-dot |
| 5 | EFREET | `espruar-1112` | `questions/q05-espruar.png` | `dethek-6d` | `questions/q05-dethek.png` | dots |
| 6 | FRIEND | `espruar-1718` | `questions/q06-espruar.png` | `dethek-3f` | `questions/q06-dethek.png` | dashes |
| 7 | JUNGLE | `espruar-191a` | `questions/q07-espruar.png` | `dethek-4e` | `questions/q07-dethek.png` | dash-dot-dot |
| 8 | KNIGHT | `espruar-2223` | `questions/q08-espruar.png` | `dethek-6c` | `questions/q08-dethek.png` | dots |
| 9 | SAVIOR | `espruar-2e2f` | `questions/q09-espruar.png` | `dethek-42` | `questions/q09-dethek.png` | dashes |
| 10 | TEMPLE | `espruar-3637` | `questions/q10-espruar.png` | `dethek-4b` | `questions/q10-dethek.png` | dash-dot-dot |
| 11 | VULCAN | `espruar-3435` | `questions/q11-espruar.png` | `dethek-6e` | `questions/q11-dethek.png` | dots |
| 12 | WYVERN | `espruar-2c2d` | `questions/q12-espruar.png` | `dethek-47` | `questions/q12-dethek.png` | dashes |

Questions 2 and 12 use the same Espruar rune.

## Artwork to make

All pieces are PNG with transparency, drawn in the Enhanced style used for the rest of the port.
They go in `upgrades/codewheel/`, named by slot.

### Runes: 72 pieces

Each rune is one square picture, 256 by 256, the rune centred with clear space around it,
transparent background, upright (the page turns it to sit on the rim).

- **12 Espruar runes the game uses:** the slots in the table above (`espruar-1d1e.png`,
  `espruar-5b5c.png`, and so on). Each must be recognisably the rune in its reference picture,
  because the player matches the wheel against what the game's prompt shows.
- **13 Dethek runes the game uses:** `dethek-6c70.png`, `dethek-4d.png`, and so on, likewise.
- **24 more Espruar runes:** `espruar-spare-01.png` to `espruar-spare-24.png`.
- **23 more Dethek runes:** `dethek-spare-01.png` to `dethek-spare-23.png`.

The spare runes fill the rest of each rim. They must look like they belong to the same alphabet
and must not be mistakable for any of the runes the game uses. GOG's 70 redrawn rune tiles are in
`por-assets/gog-1.3/codewheel-art/` (`rune-NN.png`, and `contact-sheet.png` for all of them): the
flowing, curved ones are Espruar and the angular ones are Dethek. Use them as models for the
spare runes. Which GOG tile is which of the game's runes has not been matched yet, so do not rely
on a tile for a rune in the table: use the reference picture.

Espruar is the Elvish script and Dethek the Dwarvish one, which is why the first is curved and
the second is cut in straight strokes.

### Path marks: 3 pieces

`path-dashes.png`, `path-dash-dot-dot.png`, `path-dots.png`: a short horizontal strip, 512 by 64,
showing the mark that labels the path. References: `questions/q00-path.png` (dashes),
`q01-path.png` (dash-dot-dot), `q02-path.png` (dots).

### The discs: 3 pieces

- `outer-disc.png`, 2048 by 2048: the outer disc with nothing on it. The page draws the runes on
  its rim and the letters in its rings, so leave the rim band and the ring area free of marks
  that would fight with them.
- `inner-disc.png`, 2048 by 2048, transparent outside the disc: the inner disc with nothing on
  it. Its radius is 62 percent of the outer disc's. The page cuts the 18 windows, draws the
  Dethek runes on its rim and places the path marks.
- `background.png`, 2048 by 1280: what the wheel sits on. GOG's program used a faded Moonsea map
  (`background-1.png` in the reference folder).

The original was printed cardboard: two card discs joined by a rivet at the centre. A rivet or
pin at the centre of the inner disc is welcome.

## Geometry the page uses

Fractions of the outer disc's radius, measured from the centre. Position 0 is at the top and
positions run clockwise.

| Part | From | To |
| --- | ---: | ---: |
| Letter rings 1 (innermost) to 6 | 0.20 | 0.56, six equal bands |
| Inner disc edge | | 0.62 |
| Dethek runes, on the inner disc | 0.56 | 0.62 |
| Espruar runes, on the outer disc | 0.86 | 0.98 |

The letter rings lie under the inner disc and show only through its windows. The band from 0.62
to 0.86 of the outer disc is visible and free for decoration.

## Not built yet

The page that shows the wheel, turning it, and refusing a wrong word in Enhanced. Until the new
artwork exists the page will use the game's own runes enlarged.
