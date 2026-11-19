# New Phlan 3D prototype

Enhanced browser play uses WebGL by default for exploration. The 3D view
reads the camera and wall layout from the active game map, including level
changes and walls changed by scripts. It uses existing enhanced textures
where they match and the native wall art on individual surfaces without a
match. New Phlan retains its harbor and gate details. Overland travel uses
the [interactive Moonsea illustration](MAP-CONCEPTS.md) and shows the
overhead WebGL view during movement. Encounter sprites remain
over the scenery, and portraits, combat, the journal, and Classic retain
their existing presentation.

The **3D view** button switches back to the enhanced tile view for the
current tab. The browser also uses that view if WebGL or an asset fails.

## Compare the renderers

From the repository root, use a browser save exported from New Phlan on its
normal exploration screen. The original DOS data must be available to the
existing game-data loader.

```sh
npm run preview:new-phlan -- path/to/new-phlan-save.json
```

Open `out/new-phlan-3d-comparison.html` in Chrome. The page contains the
harbor, west gate, and civic lanes. Each scene shows the WebGL prototype
above a capture composed from the current enhanced framebuffer and its
terrain tile placements. The script stages three copies of the save in
temporary directories. The capture validates 121 enhanced tile placements
per view and checks that all three sets of placements differ.

The prototype builds wall faces from the original wall definitions and uses
the same enhanced asset manifests as the browser game. The harbor deck
uses the enhanced paving tile. The water and pilings use documented crops
from the existing harbor art. The gate recess and piling shapes are 3D
estimates based on the scene. Turn on **Highlight adapted textures** to
see where the prototype reuses masonry or harbor swatches instead of
projecting the original tile composition. The source audit records the
actual manifest keys, source filenames, and adaptation details in
`out/new-phlan-3d-texture-sources.json`.

Extra captured tile traces may be passed after the save path. A trace with
more views may allow the renderer to resolve additional composited tile
matches. The output HTML embeds its textures for local review. Keep the
generated HTML and captured game data under `out/`.
