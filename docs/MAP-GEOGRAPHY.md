# Enhanced map geography

The enhanced map is an illustrated geographic model, not a mosaic of the
game's 16×16 GEO blocks. `src/maps/geography-model.json` is the working spatial
model. It separates three kinds of evidence:

- original ECL transitions establish reachability;
- original GEO blocks establish internal scale and the side used by an exit;
- the official overview maps and clue-book descriptions establish geography,
  terrain, containment, and travel mode.

The three wilderness scripts are view windows over one continuous landscape.
Likewise, New Phlan, the Slums, Kuto's Well, Podol Plaza, the textile district,
the library, the wealthy quarter, Stojanow Gate, and Valjevo Castle are composed
as adjoining parts of Phlan rather than separate square maps. City Hall and the
Training Hall are buildings inside New Phlan. Sokal Keep and Sorcerer's Island
are water-separated destinations; a script transition to them is not a shared
border.

## Current geographic reading

The urban progression is broadly southeast-to-northwest: reclaimed New Phlan
opens into the ruined districts, the districts converge on Podol Plaza and the
Stojanow river defense, and Stojanow Gate controls the approach to Valjevo
Castle. The castle itself is a multi-block compound surrounding a hedge maze,
inner tower, and the Pool.

Outside the city, the Barren River and Moonsea shoreline anchor the
composition. The western window contains the route toward Zhentil Keep and the
buccaneer and Diogenes sites. The central window contains Phlan, the Nomad Camp,
and the river/swamp route to Sorcerer's Island. The eastern window contains the
Kobold Caves and the Lizardman Keep in the eastern hills and swamp. Sokal Keep
stands on Thorn Island in the navigable passage by Phlan and is reached by boat.

Positions in the JSON are normalized composition coordinates. They are
deliberately editable and carry confidence labels. They must not be interpreted
as measured distance, exact bearing, or a replacement for the official map.

## Rendering constraints

### Phlan city plate

The city illustration can use these district relationships as compositional
anchors. An arrow records a static script transition and does not establish a
shared border or a compass bearing on its own.

| Relationship | Layout constraint |
| --- | --- |
| New Phlan ↔ Slums; Slums → Kuto’s Well; Podol Plaza → Kuto’s Well | Keep the reclaimed southeast waterfront next to the ruined city. Group the Slums, the well district, and Podol Plaza as a connected urban cluster. |
| Podol Plaza → Cadorna Textile House → Mendor’s Library | Keep the textile district and library accessible from the plaza side of the city. The street alignment is open. |
| Podol Plaza → Stojanow Gate → Valjevo Castle | Place the fortified gate on the approach from the plaza to the castle. The clue book places the gate on an earthen dam that diverts the river around the castle. |
| Kovel Mansion → Temple of Bane | Group the mansion and temple precinct in the wealthy quarter. The link does not establish which direction to draw the entrance. |
| New Phlan ↔ City Hall and Training Hall | Show both as buildings within New Phlan. |
| New Phlan ↔ Sokal Keep | Keep the harbor and offshore island separated by water. The boat passage is documented. |
| Valhingen Graveyard ↔ central wilderness | Keep the graveyard outside the main district chain. The clue book describes the undead crossing the river into the city. |

Sources are the [extracted area catalog](../src/maps/area-catalog.json) and
the [SSI Clue Book](https://www.mocagh.org/ssi/pool-hintbook.pdf), especially
printed pages 3–8, 41–46. Exact district bearings and footprints remain open.

1. Regions receive irregular footprints based on their narrative character.
2. Terrain continues underneath labels and across implementation boundaries.
3. Connections are styled by travel mode: street, gate, road, trail, boat,
   stairs, or interior passage.
4. Underground levels and contained buildings use insets or drill-downs rather
   than competing for surface geography.
5. The automap reveals these regions from actual player movement; it does not
   reveal the complete illustration at the beginning of the game.

## Remaining evidence work

The six computed `NEW ECL` sites in `area-catalog.json` must be resolved to
their possible destinations. The official City of Phlan and Area Near Phlan
overview maps should then be traced into coarse coast, river, road, forest,
swamp, hill, and mountain shapes. That pass should adjust only the schematic
positions and confidence labels; the extracted area identities remain stable.
