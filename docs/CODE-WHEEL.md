# The Enhanced code wheel

The original game shipped with a cardboard translation wheel. At start-up the game shows an
Espruar rune, a Dethek rune and a path, and asks for the word found on the wheel. The version 1.3
program GOG sells accepts any answer. Classic keeps that. Enhanced shows the whole wheel on screen
as part of the game and requires the right word.

This page is the brief for the wheel's artwork and the description of how the wheel is laid out.
The facts about the original are in [qa/research/code-wheel.md](../qa/research/code-wheel.md).

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

Questions 2 and 12 use the same Espruar rune. The Enhanced challenge prompt uses the same rune
tiles as the wheel so players can match them reliably. Classic keeps the game's own glyphs.

## Artwork to make

All pieces are PNG with transparency, drawn in the Enhanced style used for the rest of the port.
They go in `upgrades/codewheel/`, named by slot.

### Runes: 70 pieces

One picture per rune, 32 by 32, the rune centred with clear
space around it, transparent background, upright. The page turns each to sit on its rim.

- **35 Espruar runes:** `espruar-00.png` to `espruar-35.png`, without 26, which is the tab.
- **35 Dethek runes:** `dethek-00.png` to `dethek-35.png`, without 04, which is the tab.

Each Enhanced tile uses the corresponding physical slot from `por-assets/codewheel/runes/`.
Use flowing, curved forms for Espruar and straight, cut strokes for Dethek. The Enhanced challenge
prompt and the wheel rim use the same tile for a given slot so the player can match the pair.

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
