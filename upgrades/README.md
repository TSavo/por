# Enhanced display artwork

Place a PNG alongside a manifest and list its filename under `scene:title`.
The enhanced art target is 4× the original pixel dimensions. Use 1280 × 800
for a replacement title card.

```json
{"version":1,"assets":{"scene:title":"my-title.png"}}
```

Run `npm run play` and press **F10** on the first startup card. Enhanced mode
shows the supplied picture on that card. It draws the credits and gameplay
using an enhanced palette. Press F10 again to restore the original EGA colors.

To replace the illustration inside a gameplay frame, read the `viewport`
value from the local runner's `/state` endpoint while the view is visible.
Add that value as a key in `assets` and supply a 448 × 480 PNG for the original
112 × 120 viewport. The browser scales it to the viewport and keeps the guest menus,
text, and party panel visible. Each key matches an exact view, so frames with
different positions or animation poses can use their own images.

To replace individual exploration tiles, use manifest keys in the form
`tile:<area>:<sha256>`. The hash covers the 64 original EGA palette indices
in row order for one 8×8 cell. Each file must be a 32×32 PNG. The game places
matching tiles independently as the party moves. Matches are scoped to the
area and use the rendered tile pattern. Two source assets with identical
rendered pixels in the same area share a replacement. Classic mode keeps the
original pixels.

Set `POR_TRACE_TILES=1` when collecting references for a new route. The
local runner's `/state` includes `tileInventory` with each exploration
cell's x and y coordinates and replacement key, including cells that have
no artwork yet. Each cell also contains the 64 rendered palette indices as
hex, so the report can show tiles whose pixels have no exact archive match.
Save one `tileInventory` array per line, then run
`npx tsx tools/route-art-coverage.ts <trace.jsonl> <manifest.json> <report.json>`.
The report puts missing replacements first, checks that each replacement is
a 32×32 PNG, and writes a companion HTML checklist with previews. It lists
exact pixel matches from the original tile archives. Ambiguous matches remain
candidates until the guest draw source is verified.
Click an original preview to download its individual 8×8 PNG. The previews
and traces are local reference exports under `out/`.
The Chrome Slums verifier prints the path to its `slums-tiles.jsonl`
capture. The report includes each pattern's target dimensions and the
frequency of every observed framebuffer position.

The browser loads the bundled Slums artwork in `upgrades/slums` by default.
Press F10 while exploring the Slums to see it. The pack includes 59 individual tile replacements,
covering the doorway study and all 53 patterns observed on the recorded
Slums route to the kobold encounter. New or unmatched cells use the enhanced
palette.

A Chrome replay from a six-character New Phlan save walked through the west
gate and into the Slums kobold encounter. All 22 Slums exploration frames
drew 121 replacement PNGs at the recorded positions. Combat displayed six
instances of the new kobold sprite, including both facings. Switching back
to classic display preserved the frame sequence and the loaded save file.

Combat replacements use keys such as `combat:CPIC2.DAX:0` and 96×96
PNGs. Enhanced mode draws them over the game's 24×24 footprints and mirrors
them when the original sprite faces the opposite direction. Use the enhanced
background color (`#0f0e12`) for opaque background pixels. Cells that differ
from the source footprint, including cells affected by some combat highlights,
retain the game's sprite.

The Slums pack ships `kobold-combat-0.png` for archive block 0, frame 0.
The art sits on the native 24×24 anchor, with the feet just above the bottom
row. The sprite uses a rust and slate palette and a compact silhouette so
the head, knife, and stance read in the combat grid.
`kobold-combat-attack.png` provides the raised-blade pose for
`combat:CPIC2.DAX:128`, with both facings using the same 96×96 image.

Encounter portraits use `portrait:archive:block:member:frame` keys. The
browser currently supports 352×352 replacements for 88×88 guest portraits
at (24,24), inside the original frame. The Slums portrait is
`portrait:PIC2.DAX:0:0:0`.

Encounter replacements use `encounter:archive:block:member:frame` keys.
Add the key to `assets` and give it an entry under `encounters` with
`area`, `x`, `y`, `width`, and `height` in original framebuffer units.
The PNG must use four times the given width and height. The renderer
matches the corresponding guest frame in that area before showing it.

The kobold approach uses `encounter:SPRIT2.DAX:0:0:0`,
`encounter:SPRIT2.DAX:0:1:0`, and `encounter:SPRIT2.DAX:0:2:0`.
These transparent PNGs are 160×320, 96×260, and 96×228. Their native
anchors are (48,32), (56,32), and (56,32). The runner restores the previous view's
background when the source sprite and surrounding pixels match. Tile
selection then uses the restored view, so the enhanced sprite draws over
the enhanced masonry without retaining pixels from the original figure.

Enhanced gameplay uses Geist Mono for text captured from the game's EGA
character renderer. Use a local `font.woff2` in your upgrades directory to
choose a different font. Letters remain in the game's original cells and
retain their menu highlight colors. Text embedded in art stays part of that
image. The bundled font's license is in [Geist-OFL.txt](Geist-OFL.txt).

Entries in this directory's manifest take precedence over the bundled Slums
entries. Set `POR_UPGRADES_DIR` to use a single custom artwork directory.
Restart the browser runner after changing manifests or PNGs.
