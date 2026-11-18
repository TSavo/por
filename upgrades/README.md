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
no artwork yet. Capture it alongside the classic frame as the party moves.
Save one `tileInventory` array per line, then run
`npx tsx tools/route-art-coverage.ts <trace.jsonl> <manifest.json> <report.json>`.
The report puts missing replacements first and lists exact pixel matches
from the original tile archives. Ambiguous matches remain candidates until
the guest draw source is verified.

The experimental Slums doorway pack is in `upgrades/slums`. Set
`POR_UPGRADES_DIR=upgrades/slums` before starting the browser runner and use
F10 while exploring the Slums. The pack includes 59 individual replacements,
covering the doorway study and all 53 patterns observed on the recorded
Slums route to the kobold encounter. New or unmatched cells use the enhanced
palette.

Enhanced gameplay uses Geist Mono for text captured from the game's EGA
character renderer. Use a local `font.woff2` in your upgrades directory to
choose a different font. Letters remain in the game's original cells and
retain their menu highlight colors. Text embedded in art stays part of that
image. The bundled font's license is in [Geist-OFL.txt](Geist-OFL.txt).

The default manifest is in this directory. Use `POR_UPGRADES_DIR` to load the
manifest and PNG from a different directory. Restart the browser runner after
changing either file.
