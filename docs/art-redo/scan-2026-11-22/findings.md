# Art style scan — TSavo/por main @ e2bb1d53

**Date:** 22 November 2026, America/Los_Angeles
**Scan revision:** [e2bb1d53](https://github.com/TSavo/por/commit/e2bb1d532880ade22ff04965db45fa8aa8cb9011) (13,933 PNGs under `upgrades/`). While this pass was in review, `main` moved to [4f2416bb](https://github.com/TSavo/por/commit/4f2416bb4065e668b8e0e7eb741fc55a31a1fe22) (six commits: art-audit CI in #208, a before/after sheet, and a few new portraits). The four confirmed files below are bit-identical on that tip. The five new PNGs added after the scan (`kobold-cave-guide-phase-{1,2}.png`, `kobold-cave-sleeping-guide-phase-{1,2}.png`, `stojanow-charging-officer.png`) were not on the contact sheets.
**Scope:** every PNG under `upgrades/` at the scan revision. Original EGA / classic tiles were not judged. Only upgrade replacements.
**Prior issue:** [#207](https://github.com/TSavo/por/issues/207) — already closed after the 32 sprites were repainted. An independent remeasure on e2bb1d53 confirms all 32 still pass (916–14,194 unique colors, 0.25–1.83 bytes/pixel).

This document is the art-agent brief. Contact sheets of the confirmed findings live in `/workspace/por-art-scan/flagged/` (and, once committed, in `docs/art-redo/scan-2026-11-22/`). Full-coverage 10×10 sheets of every upgrade image are in `/workspace/por-art-scan/all/` (145 sheets) and were not committed.

---

## Totals

| Category | Files | Median colors | p5 colors | Median bpp | Notes |
|---|---:|---:|---:|---:|---|
| portraits | 747 | 79,649 | 52,899 | 2.31 | All 352×352. Two outliers below 200 colors (both confirmed below). |
| combat | 2,109 display + 1,600 materials | 2,424 (display only) | 1,406 (display only) | 0.97 | Materials (`*-materials.png`) are 3–16 color recolor index maps, not display art. 116 “odd” sizes (96×192, 192×96, 192×192) are intentional large-creature icons. |
| encounter | 414 | 4,892 | 707 | 0.53 | Far poses legitimately have fewer colors (smaller on-canvas figure). |
| scenes | 517 | 75,866 | 37,321 | 2.26 | Mostly 352×352. Four 1280×800 title boards. Low-color title typography overlays are intentional. |
| tiles | 8,110 display + ~310 materials/wet | 76 | 15 | 0.78 | 32×32 enhanced dungeon/overland tiles. Simple sky and fill cells are intentional. |
| ui | 28 | 10,799 | 6,918 | 0.88 | Character-sheet heads/bodies, all painted. |
| codewheel | 78 | 121 | 71 | 0.15 | Glyph tiles. `dethek-04` and `espruar-26` are omitted by design (tabs; see `docs/CODE-WHEEL.md`). |
| maps | 20 | 414,974 | 219,687 | 2.78 | All richly painted 1536×1024 concept maps (193k–766k colors). |
| **total** | **13,933** |  |  |  | 0 missing manifest file references. |

Heuristic first pass (color, detail, sibling mismatch, size, transparency) produced 2,058 raw candidates, almost all materials maps, wet RGB masks, solid sky tiles, or mixed-category families. After excluding those classes and a visual pass of every full-coverage contact sheet, **four files remain as confirmed findings**.

---

## Confirmed findings

Paint order is the order below.

### 1. High — in-game placeholder: Kobold throne, before battle

| | |
|---|---|
| File | `upgrades/kobold-throne-before-battle.png` |
| Category | portraits |
| Manifest | `portrait:area:13:ecl:a14b:PIC8.DAX:0:0:0` |
| Size | 352×352, 8,447 bytes |
| Metrics | **112 unique colors, 0.068 bpp**, gradient 2.45 |
| In game? | Yes — this is the before-battle portrait for the Kobold Caves throne (area 13, ECL a14b, PIC8.DAX record 0). |
| Painted reference | `upgrades/kobold-throne-ballista-volley.png` (51,722 colors, 2.627 bpp, already used as a scene-illustration of the same room) |

Two faceless hooded figures stand beside a simple crowned kobold in a flat brick alcove. No lighting, no throne dressing, no floor pattern. This was already called out in the #207-era pass as “nearly a placeholder” and was **not** in the 32-sprite list, so it was never repainted.

**Ask:** Repaint this frame in the same painted-pixel throne-room style as `kobold-throne-ballista-volley.png`. Keep the composition (two attendants, crowned kobold in the alcove / on the throne) so it still reads as the “before battle” beat, not the ballista-volley beat. 352×352 PNG, target ~50k–75k colors and 1.7–2.1 bpp, warm torchlight, no blank backdrop.

### 2. Medium — in-game style mismatch: Slums kobold portrait

| | |
|---|---|
| File | `upgrades/slums/kobold-portrait.png` |
| Category | portraits |
| Manifest | `upgrades/slums/manifest.json` → `portrait:PIC2.DAX:0:0:0` |
| Size | 352×352, 50,740 bytes |
| Metrics | **64 unique colors, 0.410 bpp**, gradient 8.42 |
| In game? | Yes — this is the only kobold portrait in the Slums pack. |
| Painted reference | Any current 352×352 portrait; `upgrades/altar-priestess-portrait.png` (59,720 colors, 1.84 bpp) is on the contact sheet. Portrait median is 79,649 colors; p5 is 52,899. This is the only portrait under 16,000 colors besides the throne placeholder. |

This is finished limited-palette pixel art, not a crude 12-color redraw: a torchlit kobold in a blue vest, dagger in hand, stone hall behind. It simply was not brought up to the painted portrait standard the rest of the set uses.

**Ask:** Repaint the same character and pose (torchlit kobold, dagger, stone hall) at the painted portrait standard. 352×352, ~50k–75k colors, 1.7–2.1 bpp, warm torchlight, the figure sitting in a real place. Keep it clearly a kobold so it still keys to PIC2.DAX:0.

### 3–4. Low — unused leftover flats: Stojanow bugbear mid and far

| | Mid | Far |
|---|---|---|
| File | `upgrades/stojanow-bugbear-mid.png` | `upgrades/stojanow-bugbear-far.png` |
| Category | encounter | encounter |
| Manifest | **not referenced** (`n_keys=0`) | **not referenced** |
| Size | 96×260, 1,654 bytes | 96×228, 1,316 bytes |
| Metrics | 32 colors, 0.066 bpp | 32 colors, 0.060 bpp |
| In game? | No | No |
| Painted replacement already in use | `upgrades/stojanow-bugbear-approach-middle.png` (3,238 colors, `encounter:area:9:SPRIT2.DAX:63:1:0`) | `upgrades/stojanow-bugbear-approach-far.png` (1,474 colors, `encounter:area:9:SPRIT2.DAX:63:2:0`) |

These are leftover chunky 32-color sprites from the same pipeline as the #207 hobgoblins. The game already uses painted `approach-middle` / `approach-far` files. The near pose (`stojanow-bugbear-approach.png`, 5,896 colors) is fine.

**Ask:** Do not repaint these two files. Delete them once you confirm they are unused (they are not in `upgrades/manifest.json` or `upgrades/slums/manifest.json`). Do not point any manifest key back at them.

---

## Borderline / cleanup, not art defects

These are recorded so they are not rediscovered as “misses.” They should not go to the art agent as paint work.

- **Three fully transparent unused terrain tiles**, all 32×32, 0 opaque pixels, 83 bytes, hash `7885d9787cff` in the filename:
  - `upgrades/bane-gate-terrain-7885d9787cff.png`
  - `upgrades/lizard-swamp-ruin-terrain-7885d9787cff.png`
  - `upgrades/zhentil-outpost-terrain-7885d9787cff.png`
  None are in a manifest (`n_keys=0`). Other files sharing that hash suffix are real solid-sky tiles (for example `upgrades/zhentil-webgl-daylight-sky-7885d9787cff.png`, 472 colors, in use). These three look like failed copies and can be deleted as cleanup. Visible on the full-coverage tile sheets as black/empty cells (e.g. tiles-002).
- **`upgrades/overland-terrain-077-wet.png`, `078-wet.png`, `108-wet.png`** are solid red/green/blue shader masks, not display art.
- **`*-materials.png`** (1,811 files) are recolor index maps, typically 3–16 colors. Loaded by filename convention, not always by manifest key.
- **Title typography overlays** (`title-edition`, `title-name`) are sparse lettering on a transparent field and look empty on a contact sheet; that is intended.
- **Combat-selection frames** and the sling-shot projectile are simple 11-color UI / VFX, not character art.
- **`upgrades/phlan-ruins-skeleton-approach.png`** is unreferenced and only 619 colors, but it is a small painted far figure, not a flat redraw. Cleanup candidate, not a paint job.
- **`upgrades/typmor-prison-dwarves-far.png`** (223 colors) is a tiny painted far figure; expected for that distance.
- **Large-creature combat icons** at 96×192, 192×96, or 192×192 (ogres, centaurs, wyverns, dragons, tigers) are intentional, not wrong-sized.
- **Solid / near-solid sky and floor tiles** are intentional fills in the 32×32 terrain sets.
- **Codewheel:** `dethek-04` and `espruar-26` are omitted by design (tabs).
- **Unreferenced files:** 2,951 PNGs are not keyed in the gameplay manifests. Most are materials, leftover terrain variants, codewheel, and maps loaded by other paths. This is not automatically a defect.
- **Suspicious manifest reuse (34):** almost all are a legitimate share of one painted file between a portrait key and a scene-illustration key, or the same DAX record under different ECL cues.

`valhingen-wight-conjuration-fading.png` (16,594 colors) and `…-vanished.png` (16,169 colors) are the next-lowest portraits after the two findings; they are painted frames of a figure fading out, so the lower color count is expected.

---

## Recheck of the 32 sprites from #207

All 32 files listed in `/workspace/por-art-redo/flat-sprites.csv` are still on disk and now **PASS**. Color counts range from 916 to 14,194. The hobgoblin, orc, orc leader, kobold, Sokal skeletons, priestess strike, goblin veteran, Nomad near approach, Slums goblin, wyvern, both giant lizards, and gnoll all read as painted on the combat and encounter contact sheets. Issue #207 is already closed; this remeasure agrees.

---

## Full-coverage contact sheets

145 sheets, 100 images each (10×10), grouped by category, sorted by sibling set, filename under each tile:

| Category | Sheets |
|---|---:|
| portraits | 8 |
| combat | 38 |
| encounter | 5 |
| scenes | 6 |
| maps | 1 |
| tiles | 85 |
| ui | 1 |
| codewheel | 1 |
| **total** | **145** |

Output: `/workspace/por-art-scan/all/<category>-NNN.png` plus `all/index.md`. These were visually reviewed. They are **not** committed to the repo.

Confirmed-finding sheets (the ones to commit):

- `flagged/confirmed-findings-compare.png` — four pairs, flagged left, painted reference right
- `flagged/confirmed-findings.png` — compact 4×2 of the same eight images
- `findings.csv` — machine-readable copy of the four rows

---

## Visual pass notes

Portraits 1–8, scenes 1–6, maps 1, ui 1, codewheel 1, encounter 1–5, and combat 1–38 are consistent painted-pixel work aside from the four findings above. All 85 tile sheets were reviewed. They show a coherent 32×32 enhanced-dungeon/terrain style — stone, wood, paving, cave earth, vegetation, wilderness props, sky fills — not raw EGA and not full painted portraits. Overland `*-materials.png` and `*-wet.png` appear as magenta/blue/red/green index and mask maps (tiles-041–043); that is intended. The only obviously broken tile cells are the three unused fully-transparent leftovers listed under cleanup.
