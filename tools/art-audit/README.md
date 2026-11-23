# Art-style audit

`python3 tools/art-audit/art_audit.py --all` measures every PNG under `upgrades/`
(unique opaque colours, bytes per pixel, luminance gradient, flat-fill share,
palette luminance/warmth/saturation, dimensions) and flags:

- **flat art**: 48 or fewer unique opaque colours, or a flat-fill share of 0.5+
  with a mean gradient under 5 (large low-detail placeholders);
- **sibling outliers**: an image whose colours-per-pixel is under 15% of its
  siblings' median, or whose flat-fill share is over 0.3 while its siblings'
  median is under 0.1 (a flat strike pose next to painted ready poses).
  Siblings share a directory, the first two name tokens and a format class.

It writes `findings.json`, `metrics.json`, `report.md` and `sheets/` (one
contact sheet per flagged image, next to its siblings) to `--out`.

`--changed-from REF` fails only on images added or changed since REF (PRs and
pushes); `--all` fails on anything flagged (weekly run). Either way it fails if
any of the 32 sprites from issue #207 (`issue-207.txt`) goes missing or flat again.

Calibration (Nov 22 2026): run on the pre-repaint versions of the #207 sprites it
flags all 32 (6 to 37 colours, flat-fill 0.77+); painted art starts at 215
colours with flat-fill 0.2 or less. On main at 9561960e it flags 3 new images:
`kobold-throne-before-battle.png`, `stojanow-bugbear-mid.png` and
`stojanow-bugbear-far.png`.

CI: `.github/workflows/art-audit.yml` runs on the self-hosted Battleaxe runner
(labels `self-hosted, por, battleaxe`), uploads the `art-audit` artifact, and the
weekly run opens or updates an "Art-style audit" issue.
