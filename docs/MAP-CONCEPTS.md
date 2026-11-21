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
stops at encounters and story prompts. **Sokal Keep** takes the original
ferry via the New Phlan harbor and hands control back on Thorn Island. If
the harbor master charges a fare, choose a party member to pay the one
platinum in the original game menu. Press Escape to stop a route.
**Map** enlarges the illustration and **Travel art**
switches between the illustration and the overhead terrain view.

**Valjevo Castle** enters Podol Plaza from the western crossroads and
follows the road through Stojanow Gate to the castle approach. The native
gate encounters and prompts hand control back to the player.

Chrome verification loaded every current atlas plate, selected New Phlan
and Phlan, switched between Atlas, Local and Region, and checked that
Classic closes the map without sending a game input. The
`kuto-catacombs-atlas` and `bane-interior-atlas` routes in
`tools/verify-slums-presentation.mjs` use local checkpoints in slot J
and slot A respectively. They verify automatic selection of the map 32
and map 31 illustrations, the party marker in Local, and unchanged
game state and save after switching displays. The
`moonsea-lizardman-travel` route starts from a slot A overland
checkpoint at (27, 8). Chrome forces a WebGL context loss and verifies the
overland view rebuilds without advancing the game. It then starts travel
with Enter on the Lizardman Keep
landmark and cancels with Escape while the first step is in progress.
It then clicks the landmark and walks across a sector
boundary, and stopped at the native drawbridge prompt. Accepting the
entry and dismissing the anti-magic warning restored Enhanced WebGL
exploration.

Select **Phlan** on the Moonsea map to choose a district. A named route
selects the matching option at the original crossroads or ferry menu.
**Entrances and ferry docks** brings you to those menus for manual selection.

| Destination | Original route |
| --- | --- |
| New Phlan | Return ferry or the boat at the eastern crossroads |
| City Hall | New Phlan harbor and the City Hall entrance |
| Training Hall | New Phlan harbor and the training entrance by the north street |
| The Slums | New Phlan harbor and the western city gate |
| Kovel Mansion | Northern city gate or the northern entrance at the eastern crossroads |
| Temple of Bane | Southern entrance at the eastern crossroads |
| Podol Plaza | Northern entrance at the western crossroads |
| Kuto’s Well | Podol Plaza and its eastern road |
| Stojanow Gate | Podol Plaza and its northern road |
| Cadorna Textile House | Southern entrance at the western crossroads |
| Mendor’s Library | Cadorna Textile House and its eastern road |
| Valhingen Graveyard | Graveyard option at the northern city gate |

The regional entrances come from the wilderness event tables in the
original game data. The coordinates below use the combined Moonsea grid.

| Moonsea landmark | Arrival or handoff |
| --- | --- |
| Cave of Diogenes | Cave at (10, 9), with the native choice to enter or ignore it |
| Zhentil Keep Outpost | Envoy challenge at (3, 32), while the diplomatic commission allows entry |
| Buccaneer Base | Escort at (12, 31), while the rescue commission allows entry |
| Nomad Camp | Camp entrance at (25, 11), while the camp is open |
| Kobold Caves | Choice of cave at (32, 15) |
| Lizardman Keep | Drawbridge at (37, 8) |
| Sorcerer’s Island | Rowboat from the Barren River reeds at (19, 14) to the pyramid entrance at (19, 16) |
| Sokal Keep | New Phlan harbor, with passage arranged through the original harbor master |
| Valjevo Castle | Western crossroads, Podol Plaza, and Stojanow Gate |
| Valhingen Graveyard | Same route as the Phlan menu |
| Phlan | Opens the district chooser |

Locked doors, combat, and decisions hand control back to the player.
The atlas shows interior and underground plates as the party discovers
them during play.

To replay Valhingen's first arrival from the North Gate checkpoint at
`4,0 S`, turn north with Down and move through the gate with Up. Press
Enter twice to reach the outskirts menu, select Graveyard, then press
Enter for the thunder scene at `0,4 E`. The next Enter reveals the
graveyard in a flash of lightning. The `valhingen-storm-entrance` Chrome
replay uses the unmodified North Gate save to check both illustrations,
display switching, and their removal on the first step into the graveyard.
The `valhingen-first-arrival-reload` replay starts from a native slot B save
after the lightning and verifies that returning to the entrance tile
does not repeat the storm.

Run the `phlan-outskirts-*` Chrome replays with `--map-destination` to check
named arrivals or with `--map-travel` to check the approach menus.
The `moonsea-sokal-free`, `moonsea-sokal-fare`, and `moonsea-sokal-decline`
Chrome replays cover free passage, paying for passage, and stopping at the
fare prompt without spending any platinum.
The `moonsea-valjevo-arrival` and `moonsea-valjevo-gate-warning` replays
cover castle arrival through the secured gate and stopping at the defended
gate's introduction.
The `moonsea-stojanow`, `moonsea-kuto-well`, `moonsea-slums`, and
`moonsea-pyramid` replays cover the city roads and the Barren River crossing.
The `moonsea-city-hall`, `moonsea-city-hall-locked`, `moonsea-training-hall`,
and `moonsea-mendor-library` replays verify the city entrances and the locked
City Hall decision. The regional landmark replays verify their native menus.
`moonsea-quest-locked` covers disabled controls and switching to Classic,
and `moonsea-combat-handoff` checks that travel stops at the kobold ambush
and the player can advance to the original battle opening.
`lizardfolk-battle-wall` checks the enhanced battlefield across four live
combat turns, including the absence of the exploration viewports.


The Valhingen Graveyard marker on the Moonsea travel map uses a folded
parchment label. The `phlan-outskirts-north --map-destination` Chrome replay
activates the marker with Enter and verifies arrival via the native north gate.
