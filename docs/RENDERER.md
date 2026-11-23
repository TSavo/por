# Enhanced WebGL look

Additive lighting and post-processing for Enhanced exploration and overland,
inspired by the look of Saltline's computed lighting, without changing the
game or replacing the painted art.

The renderer already works. This plan layers optional visual enhancements on
top of it. The current look is the **Off** (Classic-3D) baseline and must stay
pixel-identical when the preset is Off. Gameplay, geometry, Classic mode, and
the shipped-game art rules do not change.

The owner's standing decisions in [AGENTS.md](../AGENTS.md) still apply:
Enhanced never falls back to an original picture in the shipped game, and
Classic is the original game exactly.

## Current pipeline

Checked on `main` (`tools/new-phlan-webgl.js`, loaded by `tools/play.js`).

There is one shipping WebGL module, despite the New Phlan name and the
prototype notes in [NEW-PHLAN-3D-PROTOTYPE.md](NEW-PHLAN-3D-PROTOTYPE.md).
`play.js` imports `/new-phlan-webgl.js` for both first-person exploration and
the overland map.

**Exploration** (`createNewPhlanViewport`): one WebGL 1 context
(`antialias: true`, `preserveDrawingBuffer: true`), one program, one atlas
texture, `DEPTH_TEST`, a static vertex buffer of wall and floor quads built
from the current 16×16 wall grid. The vertex shader is a narrow first-person
projection (`focalLength = 0.60`, eye height `0.69`) that fits the encounter
panel. The fragment shader samples the painted atlas, multiplies by a fixed
per-face brightness plus a little hash noise, and fades toward a beige haze
(`vec3(0.72, 0.68, 0.56)`). There is no lighting model, no shadow map, no
normal or roughness map, no sky in the shader (the sky is a CSS
`--sky-texture` on the canvas), and no post-process. Draw throws if the
context is lost; `play.js` then disables the street preview. Canvas size is
480×576.

**Atlas** (`createNewPhlanAtlas`): a 2048×1024 canvas, 8×4 cells of 256 px.
Wall faces are packed from Enhanced PNGs (or native 8×8 pixels when a
material has no match). Special cells hold ground, water, and dock piling.

**Overland** (`createOverlandViewport`): a second WebGL 1 context
(`preserveDrawingBuffer: true`, no antialias) that pastes the illustrated
Moonsea (or a local 5×5 terrain sheet during encounters) onto a 352×352
quad. It is a textured 2D pass, not the first-person shader.

**Presentation contract** ([ARCHITECTURE.md](ARCHITECTURE.md)): the
translated runtime owns position, facing, walls, combat, and the clock. The
renderer only reads that state and draws. It must not keep a second copy of
the rules or rewrite game text.

`preserveDrawingBuffer: true` is already set so Chrome captures and
`canvas.toDataURL()` in `play.js` can read the back buffer. Keep it. The cost
is extra GPU memory; do not turn it off to chase performance, because the
replay and release screenshot tools depend on it
(`tools/release/capture-release.mjs`, port-parity PNGs).

## What must not change

- Game rules, scripts, saves, movement, combat, and the wall grid.
- Geometry while Off is selected: the same quads, atlas packing, camera,
  facing, and field of view as today. Screenshot parity against a frozen
  Off baseline proves this.
- Classic mode (F10). No WebGL path runs there.
- Enhanced art policy: painted PNGs in `upgrades/` stay the albedo. The
  shipped game never falls back to an original picture. Derived maps
  (normals, roughness, height) are generated in the browser from those
  painted texels, not shipped as new original-art assets and not decoded
  from the player's DAX in Enhanced.
- Default shipping look: Off until the owner later decides to raise the
  default preset.

## New Phlan-specific notes (not a prerequisite)

The module is named for one town because that is where it started, then it
was used everywhere. The engine works. This audit is for implementers; it
does not have to be cleaned up before lighting work. A small optional
rename/config issue exists and does not block anything else.

Hard-coded today, when `layout === "phlan"` (the default, also applied by
`play.js` when `materials.layout` is missing and `materialId === "phlan"`):

- Harbor deck, lowered water, dock edge, and `piling()` posts for `x ≥ 13`.
- Wall type 14 skipped in the harbor quadrant (`x ≥ 12`, `z < 8`).
- Gate cut-outs: wall type 1 on `ax === 0` or `13`, taller walls (1.52), a
  fragment `discard` that punches an arch, and atlas tile 2 for the jambs.
- Atlas tiles 16 / 17 / 18 for ground, water, and pilings.
- Beige haze color and the CSS sky, not a sky shader.

Other areas already pass `layout: "local"` (or anything other than
`"phlan"`) and get a flat ground quad with no harbor mesh. Overland is a
separate function in the same file. `play.js` also special-cases area 0
poses as `materialId: "phlan"`.

Optional later cleanup: rename exports and the file to place-agnostic names,
and move the harbor/gate mesh into the materials/layout config, without
changing the generated geometry. Do not treat that as a rewrite of the
engine.

## Target pipeline

Additive, behind a preset. Off uses the current single-pass WebGL 1 path to
the default framebuffer, bit-identical to today's shader. Any other preset
may allocate off-screen targets and extra passes, then present to the same
canvas.

```
painted atlas (unchanged)
    |
    +-- optional: derive normal / roughness / height in-browser
    v
existing mesh + camera (unchanged)
    |
    v
Off: current shader → canvas
On:  lit shader (sun / sky / optional torch, shadows, AO, sky, height fog)
     → HDR (or HDR-like) color target
     → tone map, bloom, vignette, grade
     → canvas
```

### WebGL 1 vs WebGL 2

Stay compatible with today's WebGL 1 context. Off must keep creating
`getContext("webgl", { antialias: true, preserveDrawingBuffer: true })` so
its pixels can be compared to the baseline.

When the preset is not Off, the enhancement path may request `webgl2` first
and fall back to `webgl1`. WebGL 2 is preferred for a float or half-float
color target, compare-mode shadow sampling, and multiple render targets.
On WebGL 1, use `EXT_color_buffer_half_float` / `OES_texture_half_float`
when present; otherwise keep an LDR color target and a cheaper bloom. Never
require WebGL 2 to play, and never leave a lost or failed enhancement
context as a black view: fall back to Off for that session and log why.

### Quality presets

Store them next to the audio prefs, in `localStorage` key `por.display.v1`
(same try/catch pattern as `por.audio.v1` in `tools/play.js`). Add a
fieldset in the existing Settings panel in `tools/play.html`.

| Preset | Intent |
| --- | --- |
| Off (Classic-3D) | Current shader, current framebuffer. Pixel-identical to today's build. |
| Low | Derived maps optional or cheap; no shadows, no SSAO, no bloom; simple height fog; 30 fps budget on low-end and phone. |
| Medium | Lighting + soft shadows (small map) + baked/cheap AO + sky/fog + tone map; bloom off or very light. |
| High | Full set: shadows, SSAO or better corner AO, bloom, vignette, grade. |
| Ultra | Higher shadow resolution, more AO taps, stronger post. Still the same geometry. |

Default is Off. Individual feature flags may exist for development, but the
player-facing control is the preset.

## Features

Each feature is a layer, borrowed from a Saltline technique, applied to
painted PoR art instead of procedural materials. Each is toggleable and is
off in the Off preset.

### Derived normal, roughness, and height

**Saltline:** surfaces get bump and roughness from generated material
functions. **Here:** sobel / luminance slope of the painted atlas texel,
plus a roughness guess from contrast and saturation, written into extra
atlas textures the first time a material loads. No new PNGs in `upgrades/`.
Regenerate on atlas rebuild. Risk: busy wall paintings become noisy bumps;
keep a strength cap and a way to disable per material if a plate looks
wrong.

### Lighting (sun, sky, torches)

**Saltline:** a directional sun, horizon color, and IBL-style ambient.
**Here:** a directional sun and a sky ambient for outdoor layouts (those
with a sky texture), and a weaker fill plus a camera-local torch or lantern
for interiors. Face brightness that is hard-coded today (`material.w`)
becomes a starting term, not the only term.

The guest owns a clock ([ARCHITECTURE.md](ARCHITECTURE.md)). The
presentation may *read* it if bindings already expose a time of day, and
must not invent a day/night cycle the scripts do not have. If no reliable
hour is available, use a stable outdoor daylight and a stable interior
fill. Do not invent weather.

### Shadow maps with soft filtering

**Saltline:** a patched soft shadow filter (PCSS-style taps on the sun
shadow map). **Here:** one sun (or torch) shadow map of the same 16×16
grid, PCF on Low/Medium, a slightly softer filter on High/Ultra. The level
is tiny, so a 512–2048 map is enough. Risk: peter-panning or acne on thin
gate recesses and pilings; tune bias per layout, and keep an Off path that
never allocates a shadow map.

### Ambient occlusion

**Saltline:** a depth-based SSAO pass in the post stack. **Here:** prefer
cheap *corner AO* from the wall grid (darken concave edges and wall/floor
meets) because the geometry is a regular grid and does not need a full
screen-space hemisphere on Low/Medium. High/Ultra may add a small SSAO
pass on the depth target. Risk: SSAO shimmer at 480×576; stabilize or skip
it on Low.

### Sky shader and height fog

**Saltline:** a custom sky shader and distance fog instead of a flat fade.
**Here:** replace the beige haze and, when enabled, the CSS sky quad with a
shader sky (horizon band, simple sun disc) and height-aware fog (stronger
over water and distance, weaker indoors). Off keeps the current haze and
CSS sky. Risk: overland and first-person must not suddenly share one
horizon color that fights the illustrated Moonsea plate; overland gets a
lighter touch (see below).

### HDR target, tone map, bloom, vignette, grade

**Saltline:** auto-exposure, ACES-style tone map, bloom, vignette, and a
color grade. **Here:** when not Off, draw lighting into an off-screen
color target (half-float if possible), then a small post stack: Reinhard or
ACES tone map, a threshold bloom, a mild vignette, and a very light grade.
No auto-exposure until it is proven not to pulse as the party turns. Off
draws to the default framebuffer with the current shader, no post.

### Wet / weather

Only if a guest signal already exists (a weather flag or a clearly wet
area). New Phlan's harbor water is already geometry, not weather. Do not
add a Saltline-style rain system the game does not have. If no signal is
found, close the weather issue as not applicable.

### Overland

Apply a much lighter subset: none of the first-person shadow map is
required. Allowed: a mild grade, a little bloom on the plate, optional
height fog at the horizon, and no derived world-space normals that wrinkle
the illustrated map. Encounter-local terrain (`createOverlandViewport`'s
5×5 sheet) may take a slightly stronger grade, but sprite anchors, menus,
and travel behavior stay as they are. Related gameplay issue #193 (local
wilderness under encounter sprites) is separate and is not this work.

## Performance, phones, and context loss

Budgets (measure in the harness, then tighten if needed):

- Off: no slower than today's build (same program).
- Low: stay at or above 30 fps on a low-end Intel / integrated GPU and on a
  phone-class budget, at the existing 480×576 and 352 canvases.
- High/Ultra: 60 fps on a discrete or modern integrated desktop GPU.

If a frame budget is missed, drop to the next lower preset automatically
for that session only; do not overwrite the saved preference without a
player action.

On `webglcontextlost`, dispose extra targets and maps, and on restore
rebuild them (atlas, derived textures, shadow map, HDR target, post).
Today a lost context throws and `play.js` disables the preview; keep that
as the last resort, but try a rebuild first so a tab sleep does not kill
Enhanced exploration for the rest of the session.

## Verification

A screenshot harness is the first implementation issue, not a visual
feature. It freezes an Off baseline from current `main` (or the commit
before lighting lands) and compares later Off frames to that baseline.

Reuse the existing Chrome headless replay path (`docs/REPLAYS.md`,
`tools/release/capture-release.mjs`, `tools/acceptance/new-phlan.mjs`,
`verify:port-parity`). Capture first-person New Phlan (harbor, gate, civic
street), at least one indoor/dungeon area, and overland (travel plate and
an encounter-local sheet). For each view:

- Off vs frozen baseline: must match (exact hash, or a documented 0
  pixel-diff tolerance).
- Each enhanced preset vs Off: geometry and camera match (the walls and
  horizon do not move); only lighting and post may change. Store both
  images and a small diff report.
- Classic frames from the same replay are unchanged.
- `npm run acceptance:new-phlan` and the port-parity walks still pass with
  the preset Off, and still pass with High enabled (they assert the game,
  not the beige haze).

## Files

| Area | Where it lands |
| --- | --- |
| Shaders, targets, derived maps, shadows, post | `tools/new-phlan-webgl.js` |
| Preset wiring, localStorage, context-loss rebuild, settings UI | `tools/play.js`, `tools/play.html` |
| Materials / layout flags if a feature needs them | exploration materials already served by `tools/browser-play.ts` |
| Harness | a new tool under `tools/` next to the existing Chrome capture/replay scripts; goldens under `out/` (gitignored) or a small committed manifest of hashes |
| This document | `docs/RENDERER.md` |

Do not put presentation shaders in `src/`. That tree is the translated
runtime and must stay rule-free of pixels ([ARCHITECTURE.md](ARCHITECTURE.md)).

## Risks

- Breaking Off parity by “tidying” the current shader while adding passes.
- Shadow acne on gates and pilings.
- Noisy derived normals on busy paintings.
- Bloom or auto-exposure pumping as the camera turns.
- Overland looking like a 3D dungeon, or fighting the illustrated plate.
- WebGL 2 assumptions that black-screen WebGL 1 machines.
- Turning off `preserveDrawingBuffer` and silently breaking captures.
- Shipping a new default look without the owner's say.

## Decisions

- The engine stays. Work is additive. No blocking refactor.
- Off is the default and the parity baseline.
- WebGL 1 remains required; WebGL 2 is an optional upgrade for the
  enhancement path.
- Day/night and weather only if the guest already exposes a signal.
- The New Phlan name and harbor special cases stay until an optional
  cleanup. They are documented above, not treated as defects that block
  lighting.
- This work sits in the **Later** milestone so it does not enlarge the
  release-candidate or 1.0 completion counts. The owner can move it.
