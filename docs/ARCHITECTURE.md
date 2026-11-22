# Architecture

Pool of Radiance is one game. The rules, the script, and the save file do not know which way the screen is drawn. Classic and Enhanced are two presentations of the same running game, and the player can swap them at any moment, including mid-combat (F10), without the party, the map, or the script noticing.

## Two layers

```
keyboard / mouse events
    |
    v
translated DOS runtime (src/cpu, src/runtime, src/translated)
    owns position, facing, ECL execution, party, combat, clock
    |
    |  read-only: the EGA framebuffer and observed guest state
    v
presentation (tools/browser-play.ts, tools/play.html, tools/play.js)
    Classic: the framebuffer as the original drew it
    Enhanced: replacement art, WebGL exploration, narration, journal
    |
    v
pixels, sound, widgets
```

There is no separate game-state object. The translated guest is the only place that changes state. The browser feeds game keys to it as BIOS keyboard input, and the presentation reads guest memory and framebuffer writes (addresses in `src/runtime/bindings.ts`) to decide what to show. A presentation may not keep a second copy of those facts or rewrite the game's text.

## Enhanced art

An Enhanced picture is a PNG in `upgrades/` listed in a manifest under a key that names the guest's own draw: `tile:<area>:<hash>`, `encounter:`, `portrait:`, `combat:` and the other kinds listed in [upgrades/README.md](../upgrades/README.md). `tools/upgrade-art.ts` loads and validates the manifests (`upgrades/slums/manifest.json`, then `upgrades/manifest.json`, or the single directory in `POR_UPGRADES_DIR`). The lookup is:

1. In Classic, ignore the manifests; the original pixels are shown.
2. In Enhanced, draw the PNG when a manifest names the key.
3. Otherwise, in the shipped game, show a blank view: Enhanced never falls back to an original picture.

The `pic:`/`glyph:`/`walldef:`/`geo:` id helpers in `src/lib/assets.ts` serve the asset-inspection tools only; the runtime does not use them.

## What is allowed to know about pixels

| Module | Knows pixels? | Knows rules? |
| --- | --- | --- |
| `src/lib/ecl.ts` | No | Script analysis only |
| `src/lib/world.ts` `canStep`, `wallType`, `parseGeo` | No | Map |
| `src/lib/world.ts` `renderViewport` | Yes | Reads the map, does not change it |
| `src/lib/picture.ts`, `dax.ts` | Yes | No |

## Input

The browser turns keys into the guest's keyboard input: arrows and the numeric keypad (read by physical key) move and turn, letters and Enter drive the menus, and F10 swaps the presentation. The code wheel and the journal are browser overlays (see the README).

## Sound and text

Sound and narration are described in [AUDIO.md](AUDIO.md). Story text comes from the script. The presentation chooses the font and the box. It does not rewrite the string.

## Save files

A save is the guest's party, journal and map written to a slot under `out/saves/` (or `POR_SAVE_DIR`). It does not store the presentation mode as part of the story, so loading a game in the other mode shows the same party in the same square.

## Where a new campaign plugs in

A campaign is data: DAX files, ECL scripts, and an optional `upgrades/` set. The engine finds `ECL*.DAX`, `GEO*.DAX`, `WALLDEF*.DAX`, and `8X8D*.DAX` by name. That split is why the file loader takes a directory instead of a compiled-in asset list.
