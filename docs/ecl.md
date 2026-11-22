# ECL bytecode

ECL is the script language for maps, encounters, and story. A block inside `ECLn.DAX` is one script. The disassembler skips the first uint16 of the decompressed block and uses Pool of Radiance's script load address, `0x9900`. The separate Curse of the Azure Bonds example below uses `0x8000`.

The opcode names and operand counts below are the Curse of the Azure Bonds interpreter, which is the public reconstruction of this engine. coab ships no license file (copyright 2013 Simeon Pilgrim), so this project reimplements the behavior and does not copy that source. Pool of Radiance is the earlier game. The two differ in the range of opcodes: Pool of Radiance's own interpreter (in `GAME.OVR`) dispatches `0x00` to `0x3D` except `0x1F`. The rows for `1F`, `3E`, `3F` and `40` below are CotAB's and are not PoR opcodes. Measured on the port's data: disassembling every script in every `ECLn.DAX` (`npm run tools -- disasm`, 16,571 lines) finds none of them (`UNKNOWN 1F`, `DUMP`, `FIND SPECIAL`, `DESTROY ITEMS`), and the table in `src/lib/ecl.ts` keeps them only so that CotAB scripts still decode.

## Entry vector

Init does not execute the first bytes as opcodes. It parses five operands, using the same reader as a one-operand instruction, and keeps the five words. The fifth word is the initial program counter.

On CotAB `ECL1.DAX` block 80 that vector is:

```
806a  806b  9bf4  9c01  8014
```

`0x8014` is the first real instruction, immediately after the vector. All five addresses sit inside the 7514-byte script. The disassembler follows the vector, sequential instructions, and branch targets at the specified load address. Unknown operands mark a decoding boundary.

## Operands

Each operand is a code byte and a payload.

| Code | Payload | Meaning |
| --- | --- | --- |
| `0x00` | one byte | Immediate byte |
| `0x01` | uint16 | Address. `GOTO` uses the word as the target. `COMPARE` reads the memory word. |
| `0x02` | uint16 | Immediate word |
| `0x03` | uint16 | Address, same encoding as `0x01` |
| `0x80` | one length byte, then that many bytes | Packed string |
| `0x81` | uint16 | String living at a memory address |

Anything else stops the disassembler. That is how a PoR-only operand form will show up.

Packed strings are 6-bit character codes. A code from 1 to 0x1F is stored as that value plus 0x40 when it is expanded, which is how spaces and letters survive. Zero emits nothing. CotAB block 80 decodes to lines such as `YOU ARE AT THE EDGE OF ` and `A GREY ROBED MAN SITS AGAINST A STONE, HIS FACE COVERED `. Those strings are the check that the packer is right.

## Opcodes

Counts are how many operands the command actually reads. A few CotAB skip-sizes disagree with the implementation; the disassembler follows the implementation. Variable forms read a count from an immediate operand and then that many further operands.

| Opcode | Name | Operands | Phase 1 stepper |
| --- | --- | --- | --- |
| `00` | EXIT | 0 | Halts |
| `01` | GOTO | 1 | Jumps to the word |
| `02` | GOSUB | 1 | Pushes the return address |
| `03` | COMPARE | 2 | Sets the six relation flags |
| `04` | ADD | 3 | `a + b` stored to the third operand |
| `05` | SUBTRACT | 3 | `b - a` |
| `06` | DIVIDE | 3 | Integer `a / b` (no remainder yet) |
| `07` | MULTIPLY | 3 | `a * b` |
| `08` | RANDOM | 2 | Halts |
| `09` | SAVE | 2 | Stores a number or a string |
| `0A` | LOAD CHARACTER | 1 | Halts |
| `0B` | LOAD MONSTER | 3 | Halts |
| `0C` | SETUP MONSTER | 3 | Halts |
| `0D` | APPROACH | 0 | No-op |
| `0E` | PICTURE | 1 | Halts |
| `0F` | INPUT NUMBER | 2 | Halts |
| `10` | INPUT STRING | 2 | Halts |
| `11` | PRINT | 1 | Appends the string |
| `12` | PRINTCLEAR | 1 | Appends the string |
| `13` | RETURN | 0 | Pops the call stack |
| `14` | COMPARE AND | 4 | Both pairs must be equal |
| `15` | VERTICAL MENU | 3 + N | Halts. N is the third immediate. |
| `16`..`1B` | IF = <> < > <= >= | 0 | Skips the next instruction when the flag is clear |
| `1C` | CLEAR MONSTERS | 0 | No-op |
| `1D` | PARTY STRENGTH | 1 | Halts |
| `1E` | CHECK PARTY | 6 | Halts |
| `1F` | unknown | 2 | Halts. CotAB's table has no implementation; PoR's dispatch does not handle it either. |
| `20` | NEW ECL | 1 | Halts |
| `21` | LOAD FILES | 3 | Halts. This is what loads GEO and WALLDEF. |
| `22` | PARTY SURPRISE | 2 | Halts |
| `23` | SURPRISE | 4 | Halts |
| `24` | COMBAT | 0 | Halts |
| `25` | ON GOTO | 2 + N | Halts |
| `26` | ON GOSUB | 2 + N | Halts |
| `27` | TREASURE | 8 | Halts |
| `28` | ROB | 3 | Halts |
| `29` | ENCOUNTER MENU | 14 | Halts |
| `2A` | GET TABLE | 3 | Halts |
| `2B` | HORIZONTAL MENU | 2 + N | Halts |
| `2C` | PARLAY | 6 | Halts |
| `2D` | CALL | 1 | Halts |
| `2E` | DAMAGE | 5 | Halts |
| `2F` | AND | 3 | Halts |
| `30` | OR | 3 | Halts |
| `31` | SPRITE OFF | 0 | No-op |
| `32` | FIND ITEM | 1 | Halts |
| `33` | PRINT RETURN | 0 | Blank line |
| `34` | ECL CLOCK | 2 | Halts. The CotAB skip-size says 1; the function reads 2. |
| `35` | SAVE TABLE | 3 | Halts |
| `36` | ADD NPC | 1 | Halts |
| `37` | LOAD PIECES | 3 | Halts |
| `38` | PROGRAM | 1 | Halts |
| `39` | WHO | 1 | Halts |
| `3A` | DELAY | 0 | No-op |
| `3B` | SPELL | 3 | Halts |
| `3C` | PROTECTION | 1 | Halts |
| `3D` | CLEAR BOX | 0 | No-op |
| `3E` | DUMP | 0 | Halts. CotAB only; not a PoR opcode. |
| `3F` | FIND SPECIAL | 1 | Halts. CotAB only; not a PoR opcode. |
| `40` | DESTROY ITEMS | 1 | Halts. CotAB only; not a PoR opcode. |

`IF` tests flags left by the previous `COMPARE`: index 0 is equal, then not-equal, less, greater, less-or-equal, greater-or-equal.

CotAB registers `VERTICAL MENU`, `HORIZONTAL MENU`, and `ON GOTO` / `ON GOSUB` with a skip-size of 0, but the functions read a header and then N extra operands. A skip-size of 0 would desynchronize any `IF` that jumped over a menu. The disassembler uses the longer form. If PoR's menus are fixed-length, the linear walk will stop and the stop message names the address.

## What the stepper does in phase 1

`EclMachine` keeps a 64K memory image, a call stack, and the six compare flags. On the CotAB opening script the first real instruction is `SAVE`, which it performs, and the next is `LOAD FILES`, which it refuses. That is the edge of this phase: loading wall sets and starting a fight are later milestones. The disassembly of the whole block, including the story strings, is still written to `out/ecl.txt`.

`EclMachine` is an analysis tool: only `tools/cli.ts` (`npm run tools -- selftest`) uses it. The browser does not step ECL itself; the translated game's own interpreter runs every script (there is no N key or Step ECL button).

## 3D window, because the script points at it

`LOAD FILES` is what binds a GEO block and a WALLDEF block in the game. The stepper does not run it, so `npm run tools -- images` and `shots` (the only users of `renderViewport`) load the first area whose `GEOn.DAX` and `WALLDEFn.DAX` both decode. The playing game draws its own view from the guest.

The window is 11 by 11 glyphs, 88×88 pixels, which the original places at character cell (2, 2) of the 320×200 screen. Far, mid, and near slots are the CotAB table (`idxOffset`, `colCount`, `rowCount`, and the A–J origins). Wall type 0 draws nothing. Other types select a walldef set and a slice, then stamp 8×8 glyphs. Sky is EGA color 11 and the floor is color 6; the original also overlays `SKY.DAX` sprites, which phase 1 does not.

On CotAB area 2 this draws a doorway: cyan sky, brown floor, a barred gate, and a stone return. That is a real wall set, not a placeholder. PoR's slot table should be compared against this one once `WALLDEF` from that game is on disk. If the picture is scrambled, the slot numbers are the first place to look, not the DAX decoder.

## PoR versus CotAB

Believed shared, and checked on CotAB bytes:

- DAX directory and run encoding
- Picture header and 4-bit pixels
- GEO 1026-byte maps and 780-byte walldefs
- 6-bit ECL strings and the operand codes `00/01/02/03/80/81`
- The five-word entry vector and opcodes through the ones the opening script uses (`SAVE`, `LOAD FILES`, `PICTURE`, `COMPARE`, `IF`, `GOTO`, `GOSUB`, `PRINT`)

Not checked by this disassembler against PoR's interpreter (the port itself runs PoR's own interpreter, so none of this affects play), and likely to differ in details:

- Which opcodes exist. PoR's dispatch stops at `0x3D` and has no `0x1F`; see the top of this page. `SPELL`, `PARLAY`, `ENCOUNTER MENU`, and `CALL` are in the shared range.
- Block ids. CotAB's first ECL file starts at id 80, not 1.
- The exact wall-slot rectangles.
- Title-page composition. CotAB uses four blocks; PoR may use one.
- Memory addresses the script pokes (`0x4BE6`, `0x7F80`, and the rest). Those are CotAB's area structure. PoR's layout of that struct is its own.

The disassembler is the tool that will show a difference: it stops instead of skipping an unknown byte.
