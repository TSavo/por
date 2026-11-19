# Enhanced regional map concepts

- `upgrades/maps/phlan-region-concept-v1.png` is the first illustrated concept.
  Preserve it unchanged as the preferred broad visual direction.
- Later variants must use separate versioned filenames so this concept is never
  overwritten.
- `upgrades/maps/phlan-region-concept-v2-geography.png` is the stricter
  geography variant. It retains the first concept's visual direction while
  limiting depicted destinations to places present in the game.

In the enhanced browser game, open **Map → Atlas** to see the illustrated
plates for areas reached by the current party. Select a plate or click the
image to open it at full size. The Local view tracks explored tiles and
player landmarks.

The Atlas includes New Phlan, Phlan, Valjevo Castle, and the approved Moonsea
regional illustration. Four additional plates use ImageGen with the regional
illustration as the ink, watercolor, and palette reference:

- **Sokal Keep:** Thorn Island, the sheltered landing, and the uphill approach.
- **Sorcerer’s Island:** wooded island, marsh backwaters, and Yarash’s pyramid.
- **Lizardman Keep:** a woodland ruin and its approach through the swamp.
- **Valhingen Graveyard:** riverside grounds, paths, mausoleums, and old towers.

The illustrations use artist-designed footprints and paths. The Atlas does
not show a tile-level party position on the artwork.

The district and destination plates also cover Buccaneer Base, Zhentil Keep
Outpost, Nomad Camp, Podol Plaza, Mendor’s Library, the Cadorna Textile House,
Kuto’s Well, the Temple of Bane, and the Kobold Caves. The atlas defaults to
the most specific illustration for the party’s current location.

Kuto’s Catacombs and the Temple of Bane Interior appear in the atlas after
the party reaches their respective maps. The Local view remembers their
explored tiles and markings separately from the surface. The Kobold Caves
plate shows the hillside approaches, with the Local view recording the
tunnels as the party explores them.

In Enhanced overland play, the Moonsea plate also serves as the travel map.
Available destinations glow on hover or keyboard focus. Click one or press
Enter while focused to walk there using the original game controls. Travel
stops at encounters and story prompts. Sokal Keep points to a dock
for New Phlan, where the harbor master can arrange onward passage. Press
Escape to stop a route. **Map** enlarges the illustration and **Travel art**
switches between the illustration and the overhead terrain view.

Chrome verification loaded every current atlas plate, selected New Phlan
and Phlan, switched between Atlas, Local and Region, and checked that
Classic closes the map without sending a game input. The
`kuto-catacombs-atlas` and `bane-interior-atlas` routes in
`tools/verify-slums-presentation.mjs` use local checkpoints in slot J
and slot A respectively. They verify automatic selection of the map 32
and map 31 illustrations, the party marker in Local, and unchanged
game state and save after switching displays. The
`moonsea-lizardman-travel` route starts from a slot A overland
checkpoint at (27, 8). It starts travel with Enter on the Lizardman Keep
landmark and cancels with Escape while the first step is in progress.
It then clicks the landmark and walks across a sector
boundary, and stopped at the native drawbridge prompt. Accepting the
entry and dismissing the anti-magic warning restored Enhanced WebGL
exploration.

Select **Phlan** on the Moonsea map to choose New Phlan, Kovel Mansion, the
Temple of Bane, Podol Plaza, the Cadorna Textile House, or Valhingen Graveyard.
The graveyard also has its own landmark. A named route selects the matching
option at the original crossroads or ferry menu. **Entrances and ferry docks**
contains routes that hand control back at those menus.
Run the `phlan-outskirts-*` Chrome replays with `--map-destination` to check
named arrivals or with `--map-travel` to check the approach menus.

