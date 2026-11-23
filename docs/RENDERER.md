# Enhanced WebGL look

Make the existing Enhanced renderer look as good as Saltline's lighting,
without changing the game or replacing the painted art. The engine already
works; this is only the look.

Tracked under #194 in the Later milestone so it does not block the release
candidate or 1.0. The owner's standing decisions in
[AGENTS.md](../AGENTS.md) still apply: Enhanced never falls back to an
original picture in the shipped game, and Classic is the original game
exactly.

## Today

One shipping module, `tools/new-phlan-webgl.js`, loaded by `tools/play.js`
for first-person exploration and the overland map.

Exploration (`createNewPhlanViewport`) is a WebGL 1 context, one shader,
and a painted atlas. It multiplies the art by a fixed per-face brightness
plus a little noise, and fades toward a beige haze. There is no lighting
model, shadow map, normal or roughness map, sky in the shader (the sky is
a CSS `--sky-texture`), or post-process. Canvas size is 480×576.

Overland (`createOverlandViewport`) pastes the illustrated Moonsea (or a
local 5×5 sheet during encounters) onto a 352×352 quad.

The renderer only reads game state and draws
([ARCHITECTURE.md](ARCHITECTURE.md)). Keep `preserveDrawingBuffer: true`;
existing capture tools depend on it.

## What must not change

- Game rules, movement, combat, the wall grid, camera, and field of view.
- Painted Enhanced PNGs stay the albedo. No new original-art assets, and
  no falling back to the player's DAX pictures in Enhanced.
- Classic mode (F10). No WebGL path runs there.

## The look

Each of these becomes the renderer's normal behavior. No toggles,
settings, or quality presets.

**Derived normal, roughness, and height.** Build them in the browser from
the painted atlas (luminance slope, contrast). No new PNGs in
`upgrades/`. Cap strength so busy wall paintings do not wrinkle.

**Lighting.** A directional sun and sky ambient outdoors, a weaker fill
plus a camera-local torch or lantern indoors. Today's per-face brightness
can stay as a starting term. Do not invent a day/night cycle or weather
the game does not already have.

**Scene-captured reflections.** Capture the built scene and sky once and
use that environment for ambient and specular on materials (Saltline's
PMREM-from-scene approach). Recapture when the area changes.

**Soft shadows.** One sun or torch shadow map of the 16×16 grid. Watch
bias on gates and pilings.

**Ambient occlusion.** Darken concave edges and wall/floor meets from the
wall grid. A small SSAO pass is fine if it helps and does not shimmer.

**Sky and height fog.** Replace the beige haze and the CSS sky with a
shader sky and height-aware fog (stronger over water and distance, weaker
indoors).

**Tone map, bloom, vignette, and grade.** Draw to an off-screen target,
then a small post stack. Skip auto-exposure if it pulses when the party
turns.

**Overland.** A lighter touch on the same module: a mild grade and maybe
horizon fog. Do not wrinkle the illustrated map with dungeon-style
normals or shadow maps. Sprite anchors and travel stay as they are.
(#193 is separate.)

Today's context is WebGL 1. Newer APIs are fine where they exist; never
leave a black view if they do not.

Work lands in `tools/new-phlan-webgl.js` (and light wiring in
`tools/play.js` if the CSS sky moves). Do not put shaders in `src/`.

## Before and after

Capture today's look, then the same views after the work, using the
existing Chrome replay path (`docs/REPLAYS.md`,
`tools/release/capture-release.mjs`, `tools/acceptance/new-phlan.mjs`).
Include New Phlan harbor, gate, and a civic street; one indoor or dungeon
view; the overland travel plate; and one encounter-local sheet.

The after shots should show the new look with the same walls, camera, and
framing. Classic frames from the same replay stay unchanged.
`npm run acceptance:new-phlan` still passes.
