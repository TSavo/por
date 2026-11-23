# Enhanced WebGL look

Make the existing Enhanced renderer look as good as Saltline's lighting,
without changing the game or replacing the painted art. The engine already
works; this is only the look.

The shipping module is `tools/renderer.js`, loaded by `tools/play.js` for
first-person exploration (`createExplorationViewport`) and the overland map
(`createOverlandViewport`). New Phlan-specific mesh (harbor deck, pilings,
gates) is per-area config (`phlanHarborLayout`), not hard-coded into the
engine.

Tracked under #194 in the Later milestone so it does not block the release
candidate or 1.0. The owner's standing decisions in
[AGENTS.md](../AGENTS.md) still apply: Enhanced never falls back to an
original picture in the shipped game, and Classic is the original game
exactly.

## Today

Exploration is a WebGL 1 context and a painted atlas. The look comes from
normals, height and roughness derived in the browser from that atlas
(multi-scale Sobel per tile, with parallax and height self-shadowing so
mortar, brick edges, planks and ivy catch the light); a low warm
sun with cool sky fill, baked corner and wall-base ambient occlusion,
contact darkening, and soft sun shadows from the exploration mesh.
A shader draws the sky and sky-tinted height fog. The renderer has a
final pass: HDR target when available, a filmic curve that keeps blacks
and saturation, and bloom on the sun. Indoor views get a dimmer fill and
a warm light at the party. The camera, geometry and atlas packing are
unchanged.

Overland shows the illustrated Moonsea in the travel map's SVG image.
Encounters place a 352×352 WebGL view of the local 5×5 terrain behind
the creature sprite.

The renderer only reads game state and draws
([ARCHITECTURE.md](ARCHITECTURE.md)). Keep `preserveDrawingBuffer: true`;
existing capture tools depend on it.

## What must not change

- Game rules, movement, combat, the wall grid, camera, and field of view.
- Painted Enhanced PNGs stay the albedo. No new original-art assets, and
  no falling back to the player's DAX pictures in Enhanced.
- Classic mode (F10). No WebGL path runs there.

## The look

Each of these is the renderer's normal behavior. No toggles, settings, or
quality presets.

**Derived normal, roughness, and height.** Build them in the browser from
the painted atlas (luminance slope, contrast). No new PNGs in
`upgrades/`. Cap strength so busy wall paintings do not wrinkle.

**Lighting.** A directional sun and sky/ground ambient outdoors, a weaker
fill plus a camera-local torch or lantern indoors. The game already marks
which square is under a roof (bit 7 of the GEO flag byte); those views
drop the sun disc and its shadows and use a dark void above the walls.
Open views use the native backdrop selected by the script. A black
backdrop mutes the sun and its bloom and gives the walls a dim, cool
ambient fill. The game already sets this backdrop at its own times.

**Soft shadows.** One sun shadow map covers the 16×16 exploration grid
and its layout geometry in daylight. The renderer stores packed depth in
an RGBA8 texture with a standard depth renderbuffer. A filtered comparison
casts shadows onto walls, floor, and the harbor surface. If the shadow
framebuffer is unavailable, the floor uses the baked sunlight channel.

**Ambient occlusion.** Darken concave edges and wall/floor meets from the
wall grid. A small SSAO pass is fine if it helps and does not shimmer.

**Sky and height fog.** A shader sky and height-aware fog (stronger over
water and distance, weaker indoors), tinted by the sky.

**Tone map, bloom, vignette, and grade.** Draw to an off-screen target,
then a small post stack. Skip auto-exposure if it pulses when the party
turns.

**Scene-captured reflections.** Capture the built scene and sky once and
use that environment for ambient and specular on materials (Saltline's
PMREM-from-scene approach). Recapture when the area changes.

**Overland.** A mild grade lifts dark terrain details and slightly softens
saturation on the Moonsea image and the local WebGL terrain canvas.
The browser composites the grade on those two painted layers. Destination
markers, creatures, menus and Classic display retain their original colors.
The grade uses the existing WebGL terrain and allocates no shadow resources.
See the [paired Moonsea and Buccaneer captures](screenshots/renderer-look/moonsea-grade.png).

Today's context is WebGL 1. Newer APIs are fine where they exist; never
leave a black view if they do not.

Work lands in `tools/renderer.js` (and light wiring in `tools/play.js`
and `tools/browser-play.ts` for layout config). Do not put shaders in
`src/`.

## Before and after

The first-person comparisons show the earlier renderer on the left and
Enhanced lighting on the right. The gate and barracks were captured from
the live WebGL canvas with matching camera, wall grid, and guest time in
pre-lighting `3c29ba82` and lit `c3f4496b`.

| View | Chrome capture | Replay |
| --- | --- | --- |
| New Phlan harbor | [Dock comparison](screenshots/renderer-look/harbor-dock.png) | Original lighting review at `518647f4` |
| New Phlan civic street | [Street comparison](screenshots/renderer-look/civic-street.png) | Original lighting review at `518647f4` |
| New Phlan gate | [City side comparison](screenshots/renderer-look/new-phlan-gate.png) | Load `guide-party-slums-first-training/H.json`. Area 0, (0,4) west, 08:39. |
| Valjevo Barracks | [Roofed interior comparison](screenshots/renderer-look/valjevo-barracks.png) | Load `valjevo-barracks-ground-paper/C.json`. Area 4, (8,1) north, 00:21. |
| Moonsea travel | [Atlas capture](screenshots/renderer-look/moonsea-atlas.png) | Load `western-ankheg-eruption/A.json`. (8,23) west, 10:12. |
| Buccaneer Base encounter | [Tiger encounter capture](screenshots/renderer-look/buccaneer-tigers.png) | From the atlas, three Rights, seven Downs, then Enter. (11,30) south, 10:12. |

The gate's decoded Classic framebuffer is byte-identical in both
builds. In those historical captures, taken before the overland grade,
both overland art panels match pixel for pixel, including the tiger
overlay. The local encounter's 352×352 WebGL terrain PNG also matches
byte for byte. The atlas uses the authored map image.

For the overland captures, use the existing verifier with the GOG 1.3
data outside the repository. It loads the above fixture, applies the
same DOS clock, checks the local terrain and creature overlay, and
captures the Combat transition.

```sh
POR_GAME_SOURCE=original POR_GAMEDATA=/path/to/POOLRAD \
  node tools/verify-overland-encounter-sprite.mjs /usr/bin/google-chrome landmark-buccaneer-tigers /tmp/por-overland
```

`npm run acceptance:new-phlan` passed all eight New Phlan scenarios on
Battleaxe with GOG 1.3.

### Painted material reloads

The renderer derives a 2048×1024 material-detail texture from the painted
atlas. The scene shader reads the two normal channels, height, and
roughness from that texture. The [New Phlan gate](screenshots/renderer-look/new-phlan-gate.png)
and [Valjevo Barracks](screenshots/renderer-look/valjevo-barracks.png)
comparisons preserve the native wall grids, camera positions, and guest
times. The masonry and paving remain readable at gameplay size.

The tracked `visit-training-hall` Chrome replay enters the hall from New
Phlan on input 16 and returns to the street on input 76. An instrumented
run in each data mode observed four detail-texture uploads, each sampled
during a live draw. Each run released all 18 displaced texture handles
on the same WebGL context and retained the six textures for its current
view. Both matched the recorded final screen.

### Outdoor sun shadows

The [New Phlan gate comparison](screenshots/renderer-look/new-phlan-gate-sun-shadows.png)
uses slot H of `qa/fixtures/guide-party-slums-first-training` at (0,4) west,
08:39. The shade crosses the gate face and recess while the opening retains
the same sky. The approach shot at (1,4) west follows Right, Right, Up,
Right, Right from that save. The [harbor piling comparison](screenshots/renderer-look/harbor-piling-sun-shadows.png)
uses (15,1) west after the first 43 inputs of
`qa/fixtures/walk-commission-5-reward`. Piling shadows meet their bases and
the masonry behind the deck also receives the sun's shadows.

GOG 1.3 and bundled Chrome produced identical daylight comparison frames
at the matched native cameras and wall grids. A material mask measured
2,723 harbor wall pixels, 73,014 near-gate wall pixels, and 24,451
approach wall pixels darkening by more than five luma levels. Every sky
pixel in those views matched. With float extensions
masked, the sun pass still rendered to RGBA8. Forcing its framebuffer to
be incomplete reproduced the earlier baked view byte for byte. The
roofed Valjevo Barracks and Kuto's Well night controls kept their previous
pixels. All paths drew an opaque WebGL view with zero errors.

### Harbor sky and distance fog

The [matched New Phlan harbor pair](screenshots/renderer-look/harbor-water-fog.png)
shows (15,1) west after the first 43 inputs of
`qa/fixtures/walk-commission-5-reward`. Both GOG 1.3 and bundled Chrome
preserve the camera and walls between `cd03785b` and `a80c66a1`.
Distant water gains more haze than foreground water. The sampled sky,
masonry, pilings, and dry deck match byte for byte. The final WebGL
canvas is opaque and supplies its own sky.

The roofed Valjevo Barracks camera matches pixel for pixel in the fog
comparison. The GOG Classic frames also match on both
routes. The open-night Kuto's Well replay below passed in both data modes.

### Corner contact shading

The [matched Valjevo Barracks captures](screenshots/renderer-look/barracks-corner-shading.png)
show the left wall-floor junction at (8,1) north. The perpendicular wall
adds a small amount of occlusion to the existing single-wall bake. At one
contact pixel the RGB channels drop from (59, 38, 25) to (54, 34, 22).
Samples on the straight wall and open floor match. GOG 1.3 and bundled
Chrome each keep the recorded camera and wall grid at the barracks and
harbor. In a direct bake check, a straight wall, duplicate shared edges,
and the sunlight channel each produce the same values as their controls.
The renderer uses the wall grid for this effect.

### Harbor post-processing

The [matched harbor post-processing captures](screenshots/renderer-look/harbor-post-processing.png)
face east at (15,1), after two Left inputs from the recorded west-facing
harbor pose. Exposure is fixed. Both GOG 1.3 and bundled Chrome matched the
HDR render byte for byte across the fix. With half-float extensions
masked, the revised highlight threshold affected 5,441 pixels confined
to the sun. The water, piers, and other sky pixels matched the baseline.
Forcing the half-float probe framebuffer to be incomplete produced the
same RGBA8 capture as masking the extensions. All paths rendered 276,480
opaque, nonblack pixels and reported zero WebGL errors.

### Open sky at night

[Kuto's Well at 22:08](screenshots/renderer-look/kuto-open-shaft-night.png)
uses its native black sky at the open ladder on map 32, (7,7) north.
At the same camera the earlier lit renderer returned RGBA
`[122,187,255,255]` at the center of the opening. The fixed renderer
returned `[2,3,5,255]` in GOG 1.3 and bundled Chrome replays. The daylit
New Phlan gate was pixel-identical across the fix. Its native sky was
palette index 11.

```sh
POR_GAME_SOURCE=original POR_GAMEDATA=/path/to/POOLRAD \
  node tools/verify-slums-presentation.mjs qa/fixtures/kuto-well-catacombs/J.json /usr/bin/google-chrome kuto-open-shaft-night
```

Use `POR_GAME_SOURCE=port` to repeat the check with bundled data. The GOG
replay also switches to Classic and back, checking the captured guest
frame, browser state, and saved file. New Phlan acceptance passed all
eight scenarios with each data source.
