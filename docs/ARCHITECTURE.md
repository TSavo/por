# Architecture

Pool of Radiance is one game. The rules, the script, and the save file do not know which way the screen is drawn. Classic mode and the later upgraded mode are two presentations of that same state, and the player can swap them at any moment, including mid-combat, without the party, the map, or the script noticing.

This is the same idea as Secret of Monkey Island: Special Edition's F10 switch. Phase 1 builds the seam and the classic side. It does not ship new art.

## Two layers

```
input events
    |
    v
GameSession          position, facing, ECL machine, party, combat, clock
    |
    |  read-only snapshot
    v
Presentation         classic  or  upgraded
    |
    v
pixels, sound, widgets
```

`GameSession` is the only place that changes state. A presentation may ask it to move, turn, or step the script. It may not keep a second copy of those facts. F10 flips `mode` and redraws. The session object is the same object.

The browser shell in `src/main.ts` is the host. It owns the key bindings. Arrow keys call `canStep` and then update `x`, `y`, and `dir` on the session. F10 only assigns `mode`. The ECL stepper calls `EclMachine.step` and does not look at which chrome is on screen.

## Asset ids

Every picture the classic renderer can show has an id that does not depend on pixels:

| Id | What it names |
| --- | --- |
| `pic:<FILE>:<block>` | One decoded DAX picture block |
| `glyph:<FILE>:<block>:<index>` | One 8×8 tile inside a symbol set |
| `walldef:<FILE>:<block>` | One 780-byte wall-slot table |
| `geo:<FILE>:<block>` | One 16×16 map |
| `scene:title` | The composed title screen |
| `scene:viewport` | The 88×88 3D window |

`src/lib/assets.ts` builds these ids. `upgrades/manifest.json` maps an id to a PNG in `upgrades/`. The lookup is:

1. If mode is classic, ignore the manifest and decode the game file.
2. If mode is upgraded and the manifest names that id, draw the PNG.
3. Otherwise decode the game file.

A missing upgrade is not an error. The town still renders. New campaigns add art by dropping files into `upgrades/` and listing ids. They do not fork the renderer.

Phase 1 wires the manifest and the lookup. The manifest ships empty, so upgraded mode is the same pixels inside different chrome. That is deliberate: the chrome swap is the proof that presentation can change while the viewport state stays put.

## What is allowed to know about pixels

| Module | Knows pixels? | Knows rules? |
| --- | --- | --- |
| `src/lib/ecl.ts` | No | Script only |
| `src/lib/world.ts` `canStep`, `wallType`, `parseGeo` | No | Map |
| `src/lib/world.ts` `renderViewport` | Yes | Reads the map, does not change it |
| `src/lib/picture.ts`, `dax.ts` | Yes | No |
| `src/main.ts` classic / upgraded class on `<body>` | Chrome only | Calls into the session |

`renderViewport` is classic output. An upgraded viewport, when someone draws one, must call the same `wallType` queries and the same party position. It may replace glyphs via the asset id. It may not invent a different wall.

## Input

Keys become intents, not scan codes baked into the rules:

- Arrow up / down: step if `canStep` allows it
- Arrow left / right: turn by two compass points (the Gold Box even directions 0, 2, 4, 6)
- N: step the ECL machine once
- F10: swap presentation

A future upgraded UI can send the same intents from buttons. Combat clicks will be intents too (`select-target`, `cast`, `guard`), resolved by the combat system, then drawn by whichever presentation is active.

## Sound and text

Sound ids will follow the same rule (`sound:<id>`), with classic PC-speaker or ADL data as the fallback and a replacement file as the override. Phase 1 does not play audio.

Story text comes from the script. The presentation chooses the font and the box. It does not rewrite the string.

## Save files

A save is a snapshot of `GameSession` plus the campaign id. It does not store the presentation mode as part of the story. Remembering the player's last mode is a preference, stored beside the save, and loading a game in the other mode must show the same party in the same square.

## Where a new campaign plugs in

A campaign is data: DAX files, ECL scripts, and an optional `upgrades/` set. The engine finds `ECL*.DAX`, `GEO*.DAX`, `WALLDEF*.DAX`, and `8X8D*.DAX` by name. It does not embed Phlan. That split is why the file loader takes a directory instead of a compiled-in asset list.
