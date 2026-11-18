# Enhanced display artwork

Place a PNG alongside a manifest and list its filename under `scene:title`.

```json
{"version":1,"assets":{"scene:title":"my-title.png"}}
```

Run `npm run play` and press **F10** on the first startup card. Enhanced mode
shows the supplied picture on that card. It draws the credits and gameplay
using an enhanced palette. Press F10 again to restore the original EGA colors.

The default manifest is in this directory. Use `POR_UPGRADES_DIR` to load the
manifest and PNG from a different directory. Restart the browser runner after
changing either file.
