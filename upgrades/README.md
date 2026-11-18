# Enhanced display artwork

Place a PNG alongside a manifest and list its filename under `scene:title`.

```json
{"version":1,"assets":{"scene:title":"my-title.png"}}
```

Run `npm run play` and press **F10** on the first startup card. Enhanced mode
shows the supplied picture on that card. It draws the credits and gameplay
using an enhanced palette. Press F10 again to restore the original EGA colors.

To replace the illustration inside a gameplay frame, read the `viewport`
value from the local runner's `/state` endpoint while the view is visible.
Add that value as a key in `assets` and supply a PNG for the 112 × 120 pixel
viewport. The browser scales it to the viewport and keeps the guest menus,
text, and party panel visible. Each key matches an exact view, so frames with
different positions or animation poses can use their own images.

Enhanced gameplay uses Geist Mono for text captured from the game's EGA
character renderer. Use a local `font.woff2` in your upgrades directory to
choose a different font. Letters remain in the game's original cells and
retain their menu highlight colors. Text embedded in art stays part of that
image. The bundled font's license is in [Geist-OFL.txt](Geist-OFL.txt).

The default manifest is in this directory. Use `POR_UPGRADES_DIR` to load the
manifest and PNG from a different directory. Restart the browser runner after
changing either file.
