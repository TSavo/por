# Enhanced display artwork

Place a PNG alongside a manifest and list its filename under `scene:title`.

```json
{"version":1,"assets":{"scene:title":"my-title.png"}}
```

Run `npm run play` and press **F10** on the first startup card. Enhanced mode
shows the supplied picture on that card and returns to the game framebuffer
for the credits and gameplay. The original framebuffer also serves as the
fallback when the picture is unavailable.

The default manifest is in this directory. Use `POR_UPGRADES_DIR` to load the
manifest and PNG from a different directory. Restart the browser runner after
changing either file.
