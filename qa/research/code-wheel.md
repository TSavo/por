# The code wheel

Read from the version 1.3 program on 2026-11-21.

## What the game does

At start-up, overlay slice 2 draws one random number (`Random(13)`) to pick a question, shows an
Espruar rune, a Dethek rune and a path, and asks for the word under them on the wheel. It then
compares what was typed with the expected word. In the program GOG sells, the branch after that
comparison is replaced with `nop; nop; jmp` to the routine's exit, so every answer is accepted.

Ruling (owner, 2026-11-21): Classic does what the GOG game does. Enhanced shows the wheel on
screen as part of the game and enforces the answer.

## The game's own question table

The table is at the start of the data segment: 13 entries of 21 bytes.

| Bytes | Meaning |
| --- | --- |
| 2 to 8 | The expected word, a Pascal string of six letters |
| 9, 10 | Two glyph codes drawn side by side for the Espruar rune |
| 11 | One glyph code for the Dethek rune |
| 12 | A second glyph code for the Dethek rune, or 0xff for none |
| 13 to 20 | The path, as a Pascal string: `- - - - -`, `-..-..-..` or `.........` |

| # | Word | Espruar glyphs | Dethek glyphs | Path |
| ---: | --- | --- | --- | --- |
| 0 | BEWARE | 1d 1e | 6c 70 | `- - - - -` |
| 1 | ZOMBIE | 5b 5c | 4d | `-..-..-..` |
| 2 | NOTNOW | 2c 2d | 6a | `.........` |
| 3 | COPPER | 09 0a | 43 | `- - - - -` |
| 4 | DRAGON | 01 02 | 68 | `-..-..-..` |
| 5 | EFREET | 11 12 | 6d | `.........` |
| 6 | FRIEND | 17 18 | 3f | `- - - - -` |
| 7 | JUNGLE | 19 1a | 4e | `-..-..-..` |
| 8 | KNIGHT | 22 23 | 6c | `.........` |
| 9 | SAVIOR | 2e 2f | 42 | `- - - - -` |
| 10 | TEMPLE | 36 37 | 4b | `-..-..-..` |
| 11 | VULCAN | 34 35 | 6e | `.........` |
| 12 | WYVERN | 2c 2d | 47 | `- - - - -` |

So the game can ask 13 questions, and the answers are in the program. Enforcing the answer in
Enhanced needs nothing from outside the game.

## GOG's codewheel.exe

A 3 MB Windows program built with Qt and packed with UPX. It is GOG's on-screen replacement for
the cardboard wheel. It holds no picture of a whole wheel: it builds its window from tiles. The
tiles are extracted to `por-assets/gog-1.3/codewheel-art/`: 70 rune tiles (40 by 40), 3 path
styles (160 by 8), 3 window backgrounds (650 by 510), a contact sheet and a manifest.

## Not yet established

- Which rune tile corresponds to which glyph code in the game's table, and which tile set
  belongs to which ring of the wheel.
- The full contents of the physical wheel. The game asks 13 questions; the wheel has more
  positions than that.
- What the unpatched game does after a wrong answer.
- Why the first release also accepts any answer in the port.
