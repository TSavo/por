# Asset overrides

Drop a PNG next to this file and name it in `manifest.json`.

Ids look like `pic:TITLE.DAX:1` or `scene:viewport`. The value is a file name in this directory. Upgraded presentation uses the PNG when the id is listed. Classic presentation ignores the manifest. A missing file, or an id that is not listed, falls back to the EGA picture decoded from the game data.

The manifest ships empty. Nothing in this folder replaces SSI's art until you add it.
