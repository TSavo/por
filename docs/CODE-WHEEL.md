# The Enhanced code wheel

The original game shipped with a cardboard translation wheel. At start-up the game shows an
Espruar rune, a Dethek rune and a path, and asks for the word found on the wheel. The version 1.3
program GOG sells accepts any answer. Classic keeps that. Enhanced shows the whole wheel on screen
as part of the game and requires the right word.

This page is the brief for the wheel's artwork and the description of how the wheel is laid out.
The facts about the original are in [qa/research/code-wheel.md](../qa/research/code-wheel.md).

## Status of the artwork (2026-11-21): the 70 runes must be redone

A first set of artwork is in `upgrades/codewheel/`. Reviewed against the references:

| Pieces | Verdict |
| --- | --- |
| `path-dashes.png`, `path-dash-dot-dot.png`, `path-dots.png` | Accepted. They are the game's three marks in the new style. |
| `background.png` | Accepted. |
| `outer-disc.png`, `inner-disc.png` | Accepted as blanks for the page to draw on. |
| `espruar-translate-tab.png`, `dethek-translate-tab.png` | Redo as a pair: the two are in different styles (a serif face on brown, a pixel face on purple). Follow the tabs on the scans. |
| The 70 runes, `espruar-NN.png` and `dethek-NN.png` | **Rejected. Redo all 70.** |

**What is wrong with the runes.** They are new shapes, not the wheel's runes. Slot `espruar-05`
is an oval with a squiggle inside on the real wheel, and the tile drawn for it is a single looped
stroke. Slot `dethek-05` is a comb shape, and its tile is a Y on a base line. The same holds
across the set: measured against its own reference, a tile scores no better than against a rune
picked at random.

**Why it matters.** This is the real translation wheel. A player answers the game's question by
finding on the wheel the two runes the game shows. Classic shows the original runes. If the
wheel's runes are other shapes, the wheel cannot be used with what the game shows, and it is not
the wheel that shipped with the game.

**What to do.**

1. Redraw each of the 70 runes from its reference picture in `por-assets/codewheel/runes/`:
   `espruar-pieceNN-….png` is the reference for `espruar-NN.png`, and `dethek-pieceNN-….png` for
   `dethek-NN.png`. Keep every stroke, loop, dot and crossing of the reference, in the same
   places and proportions. Change the rendering only: line quality, colour, edge, material.
   Do not simplify, do not swap in a similar-looking glyph, do not design a new one.
2. Draw them at 256 by 128, transparent background, the rune filling the picture the way it fills
   its reference (the references are 64 by 32). The first set was 32 by 32, which is too coarse:
   a rune's place on the 2048-pixel disc is about 170 pixels wide.
3. Run `npm run verify:code-wheel` with `por-assets` beside this repository and Pillow installed.
   It now tests likeness: each tile must overlap its own reference by at least 0.70, and must not
   overlap any other rune of its alphabet more. Today 69 of the 70 tiles fail. A reference
   enlarged and thickened scores 0.89 to 0.96 on the same test, so a faithful redraw passes with
   room to spare. Do not lower the threshold and do not edit the test to pass: if a faithful
   redraw fails it, say so and show the tile.
4. Do not edit the requirements in this file to match what was drawn. The line "redrawn, not
   reinvented" was removed from this brief by the commit that added the first runes. It is back,
   and it is the requirement.

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

Each disc has 35 runes and one tab marked "TRANSLATE FROM". With the two tabs lined up, the
innermost letter ring under the dotted path translates a rune to a letter or digit; the manual's
runic messages are read that way.

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

## Artwork to make

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

## Not built yet

The page that shows the wheel, turning it, and refusing a wrong word in Enhanced. Until the new
artwork exists the page will use the game's own runes enlarged.
