# Original DOS art inventory

Run `npx tsx tools/art-inventory.ts` with the original game files installed.
The command accepts an optional game-data directory and output directory. It
writes `index.html`, `inventory.json`, and a `sheets/` directory to
`out/art-inventory` by default. The previews are generated locally from the
player's files. The gallery also copies the replacement PNGs accepted by
the browser into `enhanced/`. Select **Has linked artwork** to review
those replacements beside their original blocks. The **Runtime artwork**
category groups tile IDs and other replacements that have no single archive
block. The JSON lists the replacement IDs, PNG dimensions, and any
configured encounter anchors.

Pass captured route traces after the output directory to include placements
and unmatched patterns. Environment routes in the Chrome verifier write a
trace when `POR_WRITE_ENVIRONMENT_TRACE=1` is set. The path is printed after
the run. For example:

```powershell
node --import tsx tools/art-inventory.ts gamedata out/art-inventory PATH_TO_ENVIRONMENT_TILES_JSONL
```

The captured gaps show coordinates, trace frame, and matching 8×8 atlas
frames where available. Identical atlas pixels can occur in several banks
and areas. Use the captured area-scoped ID to assign an in-game replacement.
Open **Exploration coverage by area** to see the distinct captured patterns,
loaded replacements, and remaining gaps. These counts reflect the supplied
traces. Areas and viewpoints outside those traces still need live coverage.
**Encounter artwork coverage by archive** counts source frames in picture,
encounter sprite, and combat picture archives. It counts each frame once
even when several areas have their own replacement. The table inventories
archive contents. The live routes establish which frames are drawn.
The browser and inventory validate approach sprites against their original
archive member and frame, including the dimensions in the placement record.
The report skips cleared all-black views between scenes. When auditing older
traces, review encounter frames for actors drawn over the terrain before
using their unmatched patterns as a redraw checklist.

| Category | Archives | Blocks | Preview sheets | Frames or glyphs |
| --- | ---: | ---: | ---: | ---: |
| Title and ending | 2 | 10 | 23 | 23 |
| Scene illustrations | 8 | 92 | 325 | 325 |
| Encounter sprites | 8 | 88 | 258 | 258 |
| Character portrait parts | 18 | 293 | 293 | 293 |
| Combat images and icons | 10 | 250 | 250 | 250 |
| Tiles, interface graphics, and EGA font | 10 | 48 | 48 | 3,489 |
| Wall composition | 8 | 38 | | |
| Map geometry | 8 | 29 | | |
| Gameplay data | 41 | 397 | | |
| Total | 113 | 1,245 | 1,197 | 4,638 |

The catalog identifies each block by file, directory index, block ID, and
SHA-256. For multi-record pictures it includes each selector, source dimensions,
frame count, offsets, and preview path. Wall definitions and map geometry
build views from the tiles, so the catalog lists those records as composition
data. The font sheet contains 177 original 8×8 glyphs.

Picture records show the 4× target width and height per frame. The source
offsets are preserved in the catalog as stored in the archive. The browser
handles text through the web font, so the font sheet has no raster target.

The archive inventory accounts for all DAX blocks in the supplied DOS set.
It keeps executable and overlay visuals flagged for a separate audit, including
interface drawing and any embedded graphics. The gallery supports category
filters, text search, and full-size sheets. It also lists 68 literal `PICTURE`
requests found in the ECL scripts. Of those, 43 have a candidate in the
matching picture bank. The JSON retains all candidate banks and nearby script
dialogue for each request. These are static references. Runtime bank changes,
computed picture IDs, and embedded visuals still need tracing.

The gallery includes 78 creature name matches between character records and
same-bank combat pictures with matching IDs. The catalog preserves both file
names. Tyranthraxus is also searchable by his dialogue spelling, which differs
from the original combat record.

Set `POR_TRACE_ART=1` to record original art archive reads in the translated
runner's DOS report. A live Slums replay into the kobold fight confirmed these
records by their payload offsets in the archives.

| Record | Role | 4× dimensions |
| --- | --- | --- |
| `SPRIT2.DAX` block 0 | Three kobold encounter distances | 160×320, 96×260, 96×228 |
| `PIC2.DAX` block 0, member 0, frame 0 | Kobold encounter portrait at (24,24) | 352×352 |
| `CPIC2.DAX` blocks 0 and 128 | Two combat sprites | 96×96 each |
| `MON2CHA.DAX` block 0 | Kobold character record | |

In six captured combat frames, matching all 146 foreground pixels of
`CPIC2.DAX` block 0 identified both horizontal facings. In one frame the five
24×24 sprite origins were (80,104) and (80,128) facing one way, and
(104,104), (104,128), and (128,128) reflected horizontally. Coordinates are
in the original 320×200 framebuffer. Later frames retain exact matches as
the combat layout changes. The transparent black pixels were excluded from
matching to allow the sprite to overlap background tiles.

Run `node --import tsx tools/route-art-coverage.ts PATH_TO_SLUMS_TILES_JSONL --browser out/slums-coverage.json`
to produce the route checklist against the browser's active art packs.
The 22-view kobold trace has 34 distinct environment patterns and a
valid 32×32 replacement for each. The HTML report links to the resolved
asset even when a route uses both packs. Pass a manifest path to check
one pack in isolation.

The Chrome kobold route now checks every visible guard sprite at 430px
and 1100px. Each 96×96 PNG must occupy the original 24×24 guest cell
at the correct scaled position and facing. The replay switches modes
at both widths and compares the guest state and save bytes.

Block 128 was loaded. The alternate VGA pose resolves in both facings in a
controlled framebuffer check using the original block. Sampling during the
recorded Slums fight yielded no exact 24×24 match for this block. Its draw
trigger remains unverified.

The near approach frame matches `SPRIT2.DAX` block 0, member 0, frame 0 at
(48,32). Index zero is skipped and index 13 is drawn black. The browser replay
displayed the 160×320 transparent replacement over the individually enhanced
tiles, then replaced the approach view with the dialogue portrait.
The near sprite also rendered with a standalone manifest containing no tile
replacements. For the middle and far checks, a controlled replay changed only
the distance argument to overlay 29's original draw procedure at `06d5`.
The matching original sprites appeared at (56,32), and Chrome drew the
96×260 and 96×228 replacements there over the restored environment tiles.
Both runs reached the portrait and original combat menus. This verifies
placement in the renderer. The natural Slums replay selects the near frame.

The portrait matched every pixel in the 88×88 image area across 17 successive
encounter captures. The enhanced browser replay showed the replacement in
those 17 frames and removed it on entry to combat. Switching to classic and
back during dialogue preserved the same guest frame.

The fixed Slums orc outpost uses `CPIC2.DAX` block 4 for the 24×24 guard
sprite. The enhanced renderer matches the original footprint and displays
the 96×96 replacement. Chrome observed it in 12 distinct positions across
the first 15 combat frames. Block 132 has a separate swing PNG. A controlled
framebuffer check verified its placement in both facings. The original attack
pose appears during a calibrated delay between keyboard prompts. The browser
now plays the captured delay frames before showing the next prompt. In the
natural outpost replay, Chrome loaded the 96×96 swing at four separate guest
positions and returned to the stable combat screen after each sequence.

The fixed outpost's natural approach matches `SPRIT2.DAX` block 4,
member 0, frame 0 at (48,32). Its 160×320 transparent replacement uses
the same rust tunic, copper brow, and shield as the combat art, with a
lowered blade for the approach. Chrome verified the sprite over the
individually rendered corridor tiles, then verified its removal on entry
to combat. A controlled replay passed the middle and far distance arguments to the original draw procedure. Chrome displayed the independently drawn 128×260 middle pose at (56,32) and the 64×196 far pose at (64,32), over the same corridor tiles. Both runs reached the original combat menus.

Reproduce the natural orc outpost art check with
`node tools/verify-slums-presentation.mjs PATH_TO_SLOT_C PATH_TO_CHROME orcs`.
Use the fresh party's Slums entrance save at (15,4). The replay verifies all
121 tile images per corridor view, door and rubble junction coverage, the
near approach sprite, and guard artwork across moving combat units. It also
switches presentation in the corridor and in combat and compares both the
guest frame and the save bytes across each switch.

## Sokal Keep old armory

The route from the old armory into the hidden equipment room uses 13
distinct environment patterns. Each has its own 32×32 PNG, including ashlar
walls, vault courses, worn floor flags, diagonal junctions, and three gate
pieces. The route report excludes the all-black transition during the
treasure sequence.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_D PATH_TO_CHROME sokal-armory`
with the save at (14,5) after the smithy fight. Chrome verified all 121
individual tiles in each of 12 views, including turns and the passage
through the hidden wall. It also verified the original equipment prompt
and that switching presentation preserved the guest frame and save bytes.

## Thorn Island landing

The landing and the first step toward Sokal Keep use 19 environment
patterns. Fourteen new 32×32 PNGs cover the overcast sky, stone parapet,
angled and straight lintel pieces, weathered portal planks, and hardware.
Five existing armory patterns also appear in these views.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_J PATH_TO_CHROME sokal-landing`
with the reinforced party at (8,14). The replay now turns west at the
gate, walks to the reeds, and searches the elf's remains for the parchment.
Twelve new tiles cover the gate viewed from the side, its hinges and
sloping joins, and the angled parapet that frames the shore. Chrome loaded
all 121 individual tiles in each of five views, covering 31 distinct
patterns, verified the parchment dialogue, and compared the guest frame
and save bytes across a display switch. The route onward to the undead
patrol has additional patterns.

The same replay continues from the reeds through the gate and into the open
court. Seventeen more 32×32 pieces add the opposite eave, raking lintels,
weathered hinge caps, gate sills, and the distant postern. Chrome verified
all 49 environment patterns across 19 views and used the parchment word
to pass the undead patrol. The all-black parchment transition is excluded
from tile coverage.

The near patrol is `SPRIT4.DAX` block 34, member 0, frame 0, rendered at
(48,32) in area 21. The browser restores the terrain behind the original
sprite and places the 160×320 transparent replacement at the same anchor.
Chrome verified the sprite, all 121 environment tiles in the approach
view, and both display switches before the patrol departed.

The middle and far patrol poses use members 1 and 2 of the same block,
both at (56,32). Their transparent PNGs measure 96×260 and 96×196.
Controlled Chrome replays passed each distance to the guest draw routine
and verified the original anchor, the 121 restored terrain tiles, and
the display switches. Both runs passed the patrol using the parchment
word. The regular route selects the near pose.

The patrol fight uses `CPIC4.DAX` blocks 34 and 162 for the skeleton,
and 35 and 163 for the zombie. Each guard and strike pose has a separate
96×96 PNG. In enhanced combat, the renderer clears each exact sprite
match before layering its replacement so the original outline stays
hidden through the transparent edges.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_J PATH_TO_CHROME sokal-patrol-combat`
to choose Combat at the first patrol. Chrome verified both guard poses
and both strike poses during ordinary combat, checked the cleared guest
sprite cell, and verified that switching preserved the guest frame and save.

## Sokal courtyard approach

The route from the restored party's Thorn Island landing save to the
courtyard ambush uses 56 distinct environment patterns. Twenty new
32×32 tiles cover the arched door, ring hardware, weathered timber screen
and posts, floor joints, and skyline details.

Run `node tools/verify-slums-presentation.mjs PATH_TO_SLOT_J PATH_TO_CHROME sokal-courtyard`
with the landing save from the restored council replay. Chrome loaded all
121 individual environment tiles in 24 views, including during the undead
patrol approaches, and verified the original courtyard ambush prompt.

The courtyard uses `CPIC4.DAX` blocks 4–6 and 132–134 for its orc,
orc leader, and hobgoblin. These six records decode to the same pixels as
their `CPIC2.DAX` counterparts, so the framebuffer matcher uses one
replacement per pose across both banks. The leader carries an axe and
wears a red sash. The hobgoblin carries a sword and wears a teal coat
with mail.

The courtyard Chrome replay now enters the fight. It checks that all
three guard sprites and all three strike sprites render at 96×96, checks
the cleared guest sprite cell, and switches both display modes in combat.

The enhanced combat renderer now supports individual 32×32 terrain
tiles keyed by `battle-tile:<sha256>`, using the 64 original palette
indices of an 8×8 battlefield cell. The courtyard includes 55 ashlar
courses, coping pieces, and slope joints. The renderer matches within
the left panel when the original combat border is present. It draws
terrain beneath the units in steady and attack frames, including when
the visible units have no replacement sprites. Other
terrain patterns continue to use the guest artwork.

The courtyard Chrome replay verified the matched 32×32 terrain tiles
alongside the six guard and strike poses and switched both displays
without changing the guest frame or save bytes.
The replay also renders a captured attack against a simulated next prompt
with exploration artwork. The attack uses its own terrain, actors, and
text until the browser advances to the next prompt.
During live playback the replay also switches to classic with the
presentation button and back with F10. It checks the same animation
frame and guest sequence in both modes, confirms that the enhanced
terrain and actor layers return, and compares the save bytes.

Twenty additional corner and coping fragments cover the wall as it rakes
away from the party. The replay verifies the terrain layer in at least
four battlefield layouts as the camera follows different turns.

Seven more 32×32 masonry pieces cover two raking wall junctions, a wall
foot, and four pieces of the straight wall joint. Each is registered
against one distinct observed 8×8 pattern. The browser replay loaded
the enlarged art pack through the shifting courtyard views. The
46-frame historical trace contains those 53 masonry patterns. Two more
pieces redraw the coping and foot where the raking wall meets the
bottom-right edge of the battlefield. A new Chrome replay captured
both pieces at two positions each.

Append `--terrain-only` to the courtyard Chrome replay to build a local
test pack without replacement combat sprites. The replay verified 76
individual masonry placements during combat and checked that the ambush
dialogue had no battlefield terrain overlays.

Set `POR_TRACE_BATTLE_TILES=1` for a courtyard Chrome replay to export
`battle-tiles.jsonl` and the numbered guest screenshots beside it.
Pass that trace and `upgrades/manifest.json` to
`tools/route-art-coverage.ts` to generate the same JSON and HTML
checklist used for exploration. It lists positions, downloadable 8×8
references, and 32×32 replacements. The 46-frame courtyard run observed
all 55 masonry replacements among 209 distinct nonblank framebuffer
patterns. The remaining patterns can include party sprites, effects,
and overlaps, so review them against the linked frames.

The battlefield report also checks 8×8 fragments of the original 24×24
terrain and combat archives. It records the block, frame, fragment origin,
and reflection where applicable. The courtyard trace has 46 patterns
with sprite candidates, including 11 matches wholly within party heads
or bodies and two mixed cells. The report checks the top row against
`CHEAD.DAX`, the bottom row against `CBODY.DAX`, and the middle row
against the two head rows and six body rows the guest combines. A mixed
candidate records both source blocks when both contribute visible pixels.
No patterns exactly match terrain fragments
in `BACPAC.DAX` or `SQRPACI.DAX`. Use **Hide actor and effect candidates**
in the HTML checklist to set those matches aside while reviewing terrain.
The report labels `COMSPR.DAX` fragments as effects, including the
selection frame, which uses block 25 in the Sokal patrol capture.
Unmatched cells still need visual review.

Set `POR_TRACE_BATTLE_DRAW=1` to log the original combat map picture
calls separately from the final framebuffer trace. Each
`POR_BATTLE_DRAW` line reports the archive, block, frame, coordinates,
and flags passed to the guest draw routine. Coordinates are signed and
use the guest's drawing units. Overlay 11 loads `SQRPACI.DAX` blocks
1 and 2, and the terrain draw entry at overlay 33 `00F1` uses the high
bit of the picture number to select the block and the low seven bits
to select the zero-based frame. The manual courtyard replay recorded
201 distinct draw tuples spanning 20 frames of block 1. These calls
identify source artwork even when clipping, overdraw, and actors keep
the finished cells from matching archive fragments.

The Chrome verifier captures battlefield cells from any replay with
`POR_TRACE_BATTLE_TILES=1`. The Sokal undead patrol replay captured 23
combat frames and verified its two standing poses and two strikes. After
matching the loose stones, fallen combatants, and two recolored party
icons as sprites, all 39 terrain patterns in that trace have replacements.

Enable both trace variables on the same replay and redirect its output
to a UTF-8 log. Add `--battle-draws=PATH_TO_LOG` to the report command
alongside that replay's `battle-tiles.jsonl`. The JSON includes each
observed source ID, guest draw coordinates and flags, and a 32×32 target
for each of the nine 8×8 source pieces. The HTML assembles the pieces
in order and lets you download each original PNG individually. The
manual courtyard replay produced 20 source frames and 180 downloadable
pieces, including blank cells used to preserve their placement.

The courtyard also shows a composed party icon. Its source is
`CHEAD.DAX` block 0 on `CBODY.DAX` block 0. Other head records contain
identical pixels, so the manifest uses one key, `combat:party:0:0`, for
that composition. The matcher assembles and checks the original 24×24
pixels in both facings. Chrome observed the 96×96 replacement in real
courtyard combat. The patrol also uses an eight-row head from `CHEAD.DAX`
block 64 on `CBODY.DAX` block 64. The manifest's `:palette:` suffix gives
the 16 guest color indices in order. Chrome verified both recolors at the
original battlefield positions and facings. Other combinations and poses
can still use the guest artwork.

The composed icon also renders when the party member is selected.
The matcher checks the full highlighted cell and restores its bright
rim, dark edge, and interior beneath the transparent replacement.
Append `--manual-party` to the courtyard Chrome replay to verify Brin's
selected icon, sample the restored colors, and switch display modes
during his manual turn. The replay also targets the wounded orc at range
three and verifies that its replacement sprite stays aligned and the
original white Aim cursor remains visible in the selection frame.

### Phlan Ruins approaches and Kobold Cave west turn

The Phlan Ruins replacements cover the ghoul, skeleton, and hobgoblin
approaches in area 2. They use `SPRIT4.DAX` blocks 72, 34, and 6
respectively, member 2 and frame 0. Each appears at guest coordinates
(56,32). Native Chrome checkpoint replays confirmed each replacement in
its encounter and checked that switching modes preserved state and saves.

The Kobold Cave west turn adds two 32×32 floor junction tiles in area 13.
A native Chrome checkpoint replay checked 242 tile placements across the
entry view and the west-facing view and compared state across the mode
switch. Both checks used the browser's default art packs.

### Slums orc sentry combat

The intercepting sentries in area 20 use `CPIC2.DAX` blocks 4 and 132
for the ready and sword-strike poses. The ECL-scoped replacements
distinguish this encounter from other fights that reuse the same blocks.
With the default art packs, a live Chrome replay from slot B confirmed
the ready pose and the following animated strike and checked that
switching presentation preserved the combat state and checkpoint.

### Mendor Library, Textile Waterfront, and Bane route coverage

The Mendor Library annex replay checked 26 new 32×32 tiles and all 3,630
placements across the entry and vestibule routes. The west-room replay checked
30 additional tiles and 2,541 placements, including the area 15 exit into
area 2.

In area 2, Chrome checked 13 Textile Waterfront crossing tiles across four
branches (8,954 placements). The side-lane replay checked four more tiles and
4,235 placements across routes that crossed the Mendor boundary in both
directions. Three routes through the Textile House rubble interior checked 12
new tiles across 5,445 placements.

The Temple of Bane outer courts and side galleries use individual 32×32
tiles for ashlar, ivy, lintels, and floor joins. The outer-courts routes checked
18 new tiles and 3,630 placements across 30 views. The side-gallery routes
checked 20 new tiles and 3,993 placements across 33 views. Switching art modes
preserved game state and save bytes in the Chrome replays.
