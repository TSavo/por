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

## The physical wheel

Found on 2026-11-21: scans of both discs and a full transcription, at
https://www.oldgames.sk/en/copy-protection/pool-of-radiance-translation-wheel, now in
`por-assets/codewheel/` and, restructured, in `src/codewheel/wheel.json`.

- 36 positions on each disc: 35 runes and one "TRANSLATE FROM" tab. That is why GOG ships 70 rune tiles.
- Six rings of 36 letters on the back (Espruar) disc. The innermost ring is the alphabet and the digits.
- Three paths of six windows on the front (Dethek) disc, each a spiral: the window over each ring
  is two positions further round than the one inside it.
- Each path gives the same 36 words, in alphabetical order by first character: AXEIAX, BEWARE,
  COPPER, DRAGON, EFREET, FRIEND, GOOGLE, HARASH and so on to 0SOMAS. The game asks 13 of them.
- Checked: the page's rune pictures match the game's 13 prompt glyph pairs pixel for pixel, and
  `npm run verify:code-wheel` reads the game's word for all 13 questions.
- Two transcriptions disagree on two words the game never asks: OPTAWA and 8OASIS here, OTTAWA
  and 80ASIS in Andrew Schultz's replica. The enlarged scan shows a P in the first.
- Fan sources say the unpatched game allows three tries and then exits to DOS with "Sorry, that's
  incorrect", and that `START STING` skips the check. Not tested against the game.

## What the unpatched game does with a wrong answer

Read from the first release's program on 2026-11-21 (overlay slice 2). Both builds carry the same
routine and the same strings; they differ in one instruction.

- After the comparison at +0x327, the first release has `jne 0x330`. Version 1.3 has
  `nop; nop; jmp 0x355` in its place, which is why 1.3 accepts anything.
- At +0x330 the routine prints the string at +0xe4, "Sorry, that's incorrect.", in colour 14.
- It then tests its count of tries. On the third wrong answer it calls the program's exit
  routine (26b:0). Otherwise it jumps back to +0x10a and asks again. +0x10a is before the
  `Random(13)` call, so each try draws a new question.

So the fan sources are right: three tries, then the game ends. This settles how Enhanced refuses
a wrong word.

The first release in the port never reaches this routine at start-up: a dice trace of its boot
shows no `Random(13)` call from slice 2, and the game goes from the title to the party menu. The
check is in the code but nothing calls it on that path. Where the call was, and whether the copy
of the first release we have was altered to skip it, is not established.

## Not yet established

- Which of GOG's redrawn tiles is which rune. Not needed now: the scan's runes are named by position.
- Why the first release never calls the code-wheel routine at start-up: whether that copy was
  altered, and where the call was.
