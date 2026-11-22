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

## When the player needs the wheel

Read on 2026-11-21 from the SSI documents GOG ships (`por-assets/gog-1.3/`) and from the version
1.3 scripts. "PDF page" is the page of the file; "printed" is the number printed on the paper.

### What the documents say

- **Manual, printed pages 1 and 2 (PDF pages 3 and 4), "The Translation Wheel".** "As your
  characters progress through the Forgotten Realms, they will occasionally find Dethek (Dwarvish)
  and Espruar (Elvish) runes. The wheel is a method of translating those runes into English
  words." It gives four uses:
  1. *Five or six letter code words.* The computer shows two runes and a path; match the runes
     and read rings 1 to 6 along the path. This is the start-up question.
  2. *Three letter code words.* The computer shows two runes and a ring number; match the runes
     and read three letters round that ring, clockwise from the dotted path. The example's word
     is LUX. No prompt of this kind is in the version 1.3 scripts: there LUX is written out in
     Espruar runes (below).
  3. *Translate Elvish (Espruar).* The computer shows a list of Elvish runes. Put the Translate
     Espruar tab at each rune, one at a time, and read the letter in ring 1 of the dotted path.
  4. *Translate Dwarvish (Dethek).* The same with the Translate Dethek tab. "Some Dethek runes
     have more than one translation; try each when translating words."
- **Quick Reference Card, PDF page 1, "To Load the Game".** The start-up question only, with the
  example ZOMBIE.
- **Cluebook, printed page 56 (PDF page 30), "Translation Wheel".** "The wheel is used several
  ways during the game. To begin the game match the symbols on screen and read the password
  from inside to outside under the indicated line. During the game match the symbol to the
  appropriate translation tab and read the letter under the ..... path in ring 1." Its example:
  with the two tabs matched, ring 1 under the dotted path shows 0; one space clockwise it shows
  A, the Dethek A is under the Translate Dethek tab and the Espruar A is over the Translate
  Espruar tab.
- **Cluebook, printed page 57 (PDF page 31).** "In Sokal Keep, a dead elf carries a scroll with
  Elvish or Espruar writing. Turn the Translate Espruar tab under each symbol one at a time.
  Read the English letter in ring 1 under the ..... path." It prints three "Espruar Runes
  (Displayed On Screen)" and their translation, L U X.
- **Cluebook, printed page 8 (PDF page 6), Sokal Keep.** The scroll's three words are LUX,
  SHESTNI and SAMOSUD. **Printed page 34 (PDF page 19), Yarash's pyramid, level 3.** "The
  password over door is written in Dethek. It reads NOTNOW (C64 Version 1.0) or NOKNOK (other
  versions)."
- **Adventurers Journal, Journal Entry 35, printed page 24 (PDF page 13).** The one place the
  wheel is needed for something printed on paper. A lizard man "scratches marks into the dirt.
  You recognize the marks as two runes and a path symbol", and the entry prints an Espruar rune,
  a Dethek rune and the dashes path: a code word read like the start-up question. "They represent
  the friend word used between lizard men of different tribes." No other journal entry, tavern
  tale or proclamation (PDF pages 8 to 17) prints a rune.

### What the game shows on screen after start-up

Script opcode 3C (PROTECTION) prints a string in the rune font, after `LOAD FILES 255, 16, 255`.
The string is stored as glyph code plus 0x3f. Espruar letters are two glyphs each, in alphabetical
order (A is 01 02, B is 03 04, with 1f to 21 skipped); Dethek letters are one glyph each (A is
3a, B is 3b and so on). Read from the version 1.3 `ECL*.DAX`:

| Script | Where | Alphabet | Reads |
| --- | --- | --- | --- |
| ECL4 block 21, 9bd8 to 9be2 | Sokal Keep, the parchment scroll on the remains | Espruar | LUX, SAMOSUD, SHESTNI |
| ECL5 block 3, aa28 | "Cadorna hands you a slip of paper … today's gate password" | Dethek | RHODIA |
| ECL5 block 4, a478 and a490 | The guards' list: "Today's password is", "The gate password is" | Espruar, Dethek | HARASH, RHODIA |
| ECL5 block 4, a964 | The freed slave's slip of paper, "You look at the writing…" | Dethek | RHODIA |
| ECL7 block 23, a46a | Yarash's pyramid, the sign over the door, "six Dwarvish runes" | Dethek | NOKNOK |

In each case the game then asks for the word to be typed, or a later encounter does. So the
player translates rune by rune with the tabs, during play, at moments the game chooses.

Where each word is asked for, from the same scripts:

| Word | Asked for | Script |
| --- | --- | --- |
| SHESTNI | The undead patrol in Sokal Keep's courtyard, "WHAT DO YOU SAY? (TYPE A SINGLE WORD)", until Ferran is met | ECL4 block 21, 9e80 |
| SAMOSUD | The same patrol afterwards. Ferran also says the word in plain letters when he is freed (ad42) | ECL4 block 21, 9e80 |
| LUX | Deeper in Sokal Keep, twice, by the same question: at a382 and by the pale form (Ferran's spirit) at aa7e | ECL4 block 21, a382 and aa7e |
| NOKNOK | At the sign itself: "YOU QUICKLY TRANSLATE THEM AND SAY...?" A wrong word springs the trap | ECL7 block 23, a4a1 |
| RHODIA | The hedge gate of Valjevo Castle, "WHAT PASSWORD DO YOU GIVE?" | ECL5 block 3, aa56 |
| HARASH | The castle's patrols and posts, when the party is disguised | ECL5 block 3, 9ef1 and ac65; block 4, 9e48 |

### Where on the screen, and what the text routine is given (measured 2026-11-21)

Played on version 1.3 and read from the running game:

- The Sokal parchment is the only place that puts its runes in the picture box: the script clears
  the box (`CLEAR BOX`, 9bd7) and prints the three words there, at text cells 202, 281 and 361
  (row 5 column 2, row 7 column 1, row 9 column 1). The other four print the runes in the text
  window, on the line after the sentence that introduces them (the guards' list on the same line):
  HARASH at row 17 column 22 and RHODIA at row 19 column 22; the slave's RHODIA at row 18 column 1;
  Cadorna's RHODIA at row 20 column 1; NOKNOK at row 21 column 1.
- The game's text routine (the one `glyphStoreA` and `glyphStoreB` in `src/runtime/bindings.ts`
  belong to) takes the font as its first argument, at `[bp+6]`: 1 for letters, 0 for the rune
  font. For a rune the character it is given is the glyph code plus 0x40 (the stored byte plus 1):
  LUX arrives as 57 58, 6c 6d, 72 73; NOKNOK as 87 88 84 87 88 84. Between a new game and the
  Sokal parchment the only calls with font 0 are the start-up question's four glyphs and opcode
  3C's strings.
- So every Espruar glyph (41 to 77) and the Dethek glyphs for A to E (7a to 7e) have the code of a
  printable letter, and the Dethek glyphs from F on (7f to 93) do not.

### What Enhanced display did with the runes, and does now

Enhanced draws the game's text itself: the host lists each character the game draws in a text
cell, blanks that cell in the Enhanced picture, and the page draws the letter in its own font
(`src/runtime/video.ts`, `tools/live-input.ts`, `tools/play.js`). Until 2026-11-21 the host did
not look at the font, so a rune whose code is a printable letter was listed as that letter:

| Place | Classic | Enhanced before | Enhanced now |
| --- | --- | --- | --- |
| Sokal parchment | the three words in runes | the same runes: this one screen had its own rule keeping the picture box out of the text | the same runes |
| Guards' list | HARASH and RHODIA in runes | `OPABfgABhiOP` in letters for HARASH; RHODIA with its fourth and sixth runes replaced by `}` and `z` | the same runes |
| Slave's slip | RHODIA in runes | four runes, `}` and `z` | the same runes |
| Cadorna's slip | RHODIA in runes | four runes, `}` and `z` | the same runes |
| Pyramid sign | NOKNOK in runes | the same runes (N, O and K are past F) | the same runes |

Now the host asks the font. A glyph drawn with the rune font is never text: it stays in both
pictures as the game drew it, and the frame lists it apart (`runes`: cell, glyph code, colour).
The page shows the Enhanced picture under its own lettering, so the runes appear at the game's
positions, the game's shapes, enlarged without smoothing. The Sokal rule is gone; the general one
covers it. Classic was never affected: it shows the game's picture.

That left the shipped game without runes: it runs from the port's own data, whose font (8X8D1
block 201) is 1,416 zero bytes, so its picture has none. Since 2026-11-22 the page draws each rune
the frame names from the wheel's picture of it (`tools/rune-glyphs.js`), in the game's colour, in
both the shipped game and with original files, where it covers the game's own glyph.

The table from glyph code to picture, read from the font against the wheel's runes (the glyph
drawn is font entry code + 0x40):

| Runes | Glyph codes | Wheel pictures |
| --- | --- | --- |
| Espruar A to O | 01 02 to 1d 1e | `espruar-27` to `espruar-35`, `espruar-00` to `espruar-05` |
| Espruar P to Z | 22 23 to 36 37 | `espruar-06` to `espruar-16` |
| Espruar 1 to 9 | 55 56 to 65 66 | `espruar-17` to `espruar-25` |
| Dethek A to Z | 3a to 53 | `dethek-03` down to `dethek-00`, then `dethek-35` down to `dethek-14` |
| Dethek 1 to 8 | 68 to 6f | `dethek-13` down to `dethek-06` |
| Dethek 9 | 6c 70 | `dethek-05` |

Each Espruar picture is its two glyphs side by side; each Dethek picture holds its one glyph in
its middle eight columns, except the 9, which is two glyphs and fills the picture. Dethek W, X and
Z (50, 51, 53) are the same glyph in the font, and `dethek-17`, `dethek-16` and `dethek-14` are
the same rune on the wheel. `npm run verify:rune-glyphs` proves the table against the 13
questions and the eight rune strings, and with the original files checks all 106 glyphs against
their pictures pixel for pixel.

The new illustrations at these places do not carry the word. The pyramid's sign is painted with
its English line only, the two Valjevo papers with scribbles, and each is in the picture box
while the runes are in the text window below it. At Sokal no picture is shown with the runes.

The narration does not give a word away. The manifest (`src/audio/voice-master-manifest.json`)
has no entry for any of the eight rune instructions, and the units either side of them say only
what the screen says in letters ("TODAY'S PASSWORD IS", "YOU LOOK AT THE WRITING...", "THIS IS
FOLLOWED BY SIX DWARVISH RUNES..."). The one unit that speaks a rune word is Ferran's, which the
game itself prints in letters.

`npm run verify:runes-readable -- <chrome>` stands at all five places in Chrome, photographs both
displays, compares every rune cell, requires the frame's glyph codes to spell the word, and types
SHESTNI to the patrol, NOKNOK at the door and RHODIA at the hedge gate. Sokal Keep is walked to
from a new game. The other four are reached by developer travel: the check rewrites the copy of
New Phlan's script inside a saved game so that the party's next step runs `NEW ECL` to the
place, and sets one script variable where the place needs an earlier deed (the giants dead for
the list on the ground, Cadorna released for his slip). The party is six level 1 characters who
have not played their way there.

### The translate position, on the transcribed wheel

`src/codewheel/wheel.json` agrees with the Cluebook's example. The Espruar disc's tab is at
position 26 and the Dethek disc's at position 4, so the tabs meet with the inner disc turned 22
positions. The dotted path's ring 1 window is then over position 25 of ring 1, which is `0`. One
position clockwise it is over `A`, with `espruar-27` at the inner disc's tab and `dethek-03` at
the outer disc's tab; `espruar-27` is glyph 01 02, the game's Espruar A.

In general, with the inner disc turned `t` positions the rune at the tabs is the Espruar rune at
position `4 + t` and the Dethek rune at position `26 - t`, and ring 1 under the dotted path shows
ring 1's letter at position `3 + t`.

### What this means for the port

The wheel is needed at start-up and again during play, whenever runes are on screen or Journal
Entry 35 is read. Enhanced therefore keeps the wheel available for the whole game, with a control
that lines up the two tabs. It does not translate for the player.

## Not yet established

- Whether the game takes HARASH where it asks for it. The word is asked for by Valjevo Castle's
  patrols and posts once the party is disguised; `npm run verify:runes-readable` shows the runes
  at the guards' list and does not go on to a patrol. LUX is likewise shown and not typed: the
  check types SHESTNI, the word the first patrol takes.
- The five places on the first release. The check runs version 1.3. The font argument is read at
  the same place in both releases' text routine, but only 1.3 was played.
- The four places beyond Sokal Keep as a player reaches them. The check arrives by developer
  travel with a level 1 party, so it shows what the screen does there, and not that a played
  game's state (other pictures held, a disguise, an alarm) leaves the runes alone.

- Which of GOG's redrawn tiles is which rune. Not needed now: the scan's runes are named by position.
- Why the first release never calls the code-wheel routine at start-up: whether that copy was
  altered, and where the call was.
