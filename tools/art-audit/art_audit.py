#!/usr/bin/env python3
"""Art-style audit for upgrades/.

Measures every PNG under upgrades/ and flags art that is flat (few colours,
large flat fills) or that does not match its siblings (pose-set mismatch,
e.g. a painted ready pose next to a flat strike pose). Builds contact sheets
of only the flagged images, each next to its siblings.

Usage:
  python3 tools/art-audit/art_audit.py --all --out art-audit-out
  python3 tools/art-audit/art_audit.py --changed-from <git-ref> --out art-audit-out

Exit status: 1 if any checked image is flagged, or if any sprite from
issue #207 (tools/art-audit/issue-207.txt) is missing or flat again; else 0.
Every image is measured either way, because sibling checks need the whole set.

Thresholds (calibrated on the issue #207 inventory, Nov 22 2026: the 32 flat
sprites had 6..37 unique opaque colours and >=0.77 flat-fill share; painted
sprites start at 215 colours and <=0.2 flat-fill share):
  FLAT_MAX_COLORS     unique opaque RGB colours <= 48. Not 64: a posterized
                      but painted 64-colour portrait (slums/kobold-portrait)
                      sits at 64 and is not flat art.
  FLAT_FILL_SHARE     share of neighbouring opaque pixel pairs with identical
                      luminance >= 0.5 AND mean luminance gradient < 5
                      (catches large low-detail placeholders with >48 colours).
  SIBLING_RICHNESS    colours-per-opaque-pixel < 0.15 x the sibling median.
  SIBLING_FLAT_FILL   flat-fill share > 0.3 while the sibling median < 0.1.
Siblings: same directory, same first two name tokens (e.g. stojanow-bugbear-*),
same format class (combat 96x96, encounter tall, scene square >=256, other);
a sibling check needs at least two siblings.
Out of scope: images under 64 px on a side (8x8 EGA tile upgrades),
*-materials.png and *-wet.png data maps, codewheel glyph sheets,
combat-selection-* UI cursors, and mask/data maps: images whose opaque
pixels are >=60% pure-channel colours (each channel <16 or >239), or >=75%
single-primary colours (top channel beats the next by >120, e.g. the red/blue
overland-terrain-243/244-detail material masks).
"""
import argparse, json, os, statistics, subprocess, sys
from concurrent.futures import ProcessPoolExecutor
import numpy as np
from PIL import Image, ImageDraw

FLAT_MAX_COLORS = 48
FLAT_FILL_SHARE = 0.5
FLAT_FILL_MAX_GRADIENT = 5.0
SIBLING_RICHNESS = 0.15
SIBLING_FLAT_FILL = 0.3
SIBLING_FLAT_FILL_MEDIAN = 0.1
MIN_SIDE = 64
MASK_SHARE = 0.6
PRIMARY_SHARE = 0.75
HERE = os.path.dirname(os.path.abspath(__file__))


def measure(args):
    root, rel = args
    path = os.path.join(root, rel)
    im = Image.open(path)
    w, h = im.size
    m = dict(path=rel, w=w, h=h, bytes=os.path.getsize(path))
    m['bytes_per_pixel'] = round(m['bytes'] / (w * h), 4)
    if w < MIN_SIDE or h < MIN_SIDE:
        m['skip'] = 'small'
        return m
    a = np.asarray(im.convert('RGBA'))
    op = a[..., 3] >= 128
    n = int(op.sum())
    m['opaque'] = n
    if n == 0:
        m['skip'] = 'empty'
        return m
    rgb = a[..., :3].astype(np.int32)
    px = rgb[op]
    m['colors'] = int(np.unique((px[:, 0] << 16) | (px[:, 1] << 8) | px[:, 2]).size)
    m['mask_share'] = round(float(((px < 16) | (px > 239)).all(axis=1).mean()), 4)
    srt = np.sort(px, axis=1)
    m['primary_share'] = round(float(((srt[:, 2] - srt[:, 1]) > 120).mean()), 4)
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    gx = np.abs(np.diff(lum, axis=1)); gy = np.abs(np.diff(lum, axis=0))
    mx = op[:, 1:] & op[:, :-1]; my = op[1:, :] & op[:-1, :]
    pairs = max(1, int(mx.sum() + my.sum()))
    m['gradient'] = round(float((gx[mx].sum() + gy[my].sum()) / pairs), 3)
    m['flat_fill'] = round(float(((gx[mx] == 0).sum() + (gy[my] == 0).sum()) / pairs), 4)
    m['richness'] = round(m['colors'] / n, 5)
    pl = lum[op]
    m['mean_luminance'] = round(float(pl.mean()), 2)
    m['warmth'] = round(float((px[:, 0] - px[:, 2]).mean()), 2)
    mx_, mn_ = px.max(axis=1), px.min(axis=1)
    m['saturation'] = round(float(((mx_ - mn_) / np.maximum(mx_, 1)).mean()), 4)
    return m


def excluded(m):
    b = os.path.basename(m['path'])
    if m.get('skip'):
        return m['skip']
    if b.endswith('-materials.png') or b.endswith('-wet.png'):
        return 'data-map'
    if '/codewheel/' in m['path']:
        return 'codewheel'
    if b.startswith('combat-selection-'):
        return 'ui-cursor'
    if m['mask_share'] >= MASK_SHARE or m['primary_share'] >= PRIMARY_SHARE:
        return 'mask'
    return None


def fmt_class(m):
    w, h = m['w'], m['h']
    if w == 96 and h == 96:
        return 'combat'
    if h > w:
        return 'encounter'
    if w == h and w >= 256:
        return 'scene'
    return 'other'


def family(m):
    d = os.path.dirname(m['path'])
    t = os.path.basename(m['path'])[:-4].split('-')
    return f"{d}/{'-'.join(t[:2])}|{fmt_class(m)}"


def judge(images):
    fams = {}
    for m in images:
        fams.setdefault(family(m), []).append(m)
    for m in images:
        reasons = []
        if m['colors'] <= FLAT_MAX_COLORS:
            reasons.append(f"flat: {m['colors']} colours (<= {FLAT_MAX_COLORS})")
        if m['flat_fill'] >= FLAT_FILL_SHARE and m['gradient'] < FLAT_FILL_MAX_GRADIENT:
            reasons.append(f"flat: {m['flat_fill']:.2f} flat-fill share, gradient {m['gradient']:.1f}")
        sibs = [s for s in fams[family(m)] if s is not m]
        m['siblings'] = [s['path'] for s in sibs]
        if len(sibs) >= 2:
            mr = statistics.median(s['richness'] for s in sibs)
            mf = statistics.median(s['flat_fill'] for s in sibs)
            if m['richness'] < SIBLING_RICHNESS * mr:
                reasons.append(f"sibling outlier: {m['richness']:.3f} colours/pixel vs sibling median {mr:.3f}")
            if m['flat_fill'] > SIBLING_FLAT_FILL and mf < SIBLING_FLAT_FILL_MEDIAN:
                reasons.append(f"sibling outlier: flat-fill {m['flat_fill']:.2f} vs sibling median {mf:.2f}")
        m['reasons'] = reasons


def thumb(root, rel, size=160):
    im = Image.open(os.path.join(root, rel)).convert('RGBA')
    s = min(size / im.width, size / im.height)
    resample = Image.NEAREST if s >= 1 else Image.LANCZOS
    im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), resample)
    tile = Image.new('RGBA', (size, size), (48, 48, 52, 255))
    tile.alpha_composite(im, ((size - im.width) // 2, (size - im.height) // 2))
    return tile


def contact_sheets(root, flagged, outdir, max_sibs=7):
    os.makedirs(outdir, exist_ok=True)
    size, pad, label = 160, 8, 28
    written = []
    for i, m in enumerate(flagged):
        row = [m['path']] + [s for s in m['siblings'] if s != m['path']][:max_sibs]
        W = len(row) * (size + pad) + pad
        sheet = Image.new('RGBA', (W, size + label + 2 * pad + 18), (24, 24, 28, 255))
        d = ImageDraw.Draw(sheet)
        d.text((pad, 2), ('FLAGGED: ' + '; '.join(m['reasons']))[:W // 6], fill=(255, 120, 120, 255))
        for j, rel in enumerate(row):
            x = pad + j * (size + pad)
            sheet.alpha_composite(thumb(root, rel, size), (x, 18 + pad))
            if j == 0:
                d.rectangle([x - 2, 16 + pad, x + size + 1, 18 + pad + size + 1], outline=(255, 60, 60, 255), width=2)
            d.text((x, 20 + pad + size), os.path.basename(rel)[:26], fill=(220, 220, 220, 255))
        name = f"{i:03d}-{os.path.basename(m['path'])}"
        sheet.convert('RGB').save(os.path.join(outdir, name))
        written.append(name)
    return written


def changed_pngs(root, ref):
    out = subprocess.run(['git', '-C', root, 'diff', '--name-only', '--diff-filter=AMR', f'{ref}', 'HEAD', '--', 'upgrades/'],
                         check=True, capture_output=True, text=True).stdout.split()
    return {p for p in out if p.endswith('.png')}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--root', default=os.path.abspath(os.path.join(HERE, '..', '..')))
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument('--all', action='store_true', help='fail on any flagged image')
    g.add_argument('--changed-from', metavar='REF', help='fail only on images added/changed since REF')
    ap.add_argument('--out', default='art-audit-out')
    ap.add_argument('--no-sheets', action='store_true')
    a = ap.parse_args()
    root = a.root
    files = []
    for d, _, fs in os.walk(os.path.join(root, 'upgrades')):
        files += [os.path.relpath(os.path.join(d, f), root) for f in fs if f.lower().endswith('.png')]
    files.sort()
    with ProcessPoolExecutor() as ex:
        ms = list(ex.map(measure, [(root, f) for f in files], chunksize=64))
    for m in ms:
        m['excluded'] = excluded(m)
    images = [m for m in ms if not m['excluded']]
    judge(images)
    flagged = [m for m in images if m['reasons']]
    checked = None if a.all else changed_pngs(root, a.changed_from)
    failing = [m for m in flagged if checked is None or m['path'] in checked]

    regressions = []
    for p in open(os.path.join(HERE, 'issue-207.txt')).read().splitlines():
        p = p.strip()
        if not p or p.startswith('#'):
            continue
        hit = next((m for m in ms if m['path'] == p), None)
        if hit is None:
            regressions.append(f'{p}: missing')
        elif hit.get('reasons'):
            regressions.append(f"{p}: flat again ({'; '.join(hit['reasons'])})")

    os.makedirs(a.out, exist_ok=True)
    sheets = [] if a.no_sheets else contact_sheets(root, flagged, os.path.join(a.out, 'sheets'))
    summary = dict(mode='all' if a.all else f'changed-from {a.changed_from}', measured=len(ms), in_scope=len(images),
                   checked=len(images) if checked is None else len(checked), flagged=len(flagged),
                   failing=len(failing), issue_207_regressions=regressions,
                   thresholds=dict(FLAT_MAX_COLORS=FLAT_MAX_COLORS, FLAT_FILL_SHARE=FLAT_FILL_SHARE,
                                   FLAT_FILL_MAX_GRADIENT=FLAT_FILL_MAX_GRADIENT, SIBLING_RICHNESS=SIBLING_RICHNESS,
                                   SIBLING_FLAT_FILL=SIBLING_FLAT_FILL, SIBLING_FLAT_FILL_MEDIAN=SIBLING_FLAT_FILL_MEDIAN))
    json.dump(dict(summary=summary, flagged=[{k: m[k] for k in ('path', 'w', 'h', 'colors', 'flat_fill', 'gradient', 'reasons', 'siblings')} for m in flagged]),
              open(os.path.join(a.out, 'findings.json'), 'w'), indent=1)
    json.dump(ms, open(os.path.join(a.out, 'metrics.json'), 'w'))
    lines = ['## Art-style audit', '',
             f"Mode: {summary['mode']}. Measured {len(ms)} PNGs, {len(images)} in scope, "
             f"{summary['checked']} checked. Flagged in whole set: {len(flagged)}. Failing: {len(failing)}.", '']
    if failing:
        lines += ['| Image | Size | Colours | Why |', '|---|---|---|---|']
        lines += [f"| `{m['path']}` | {m['w']}x{m['h']} | {m['colors']} | {'; '.join(m['reasons'])} |" for m in failing]
        lines.append('')
    others = [m for m in flagged if m not in failing]
    if others:
        lines.append(f'Flagged but not touched by this change ({len(others)}): ' + ', '.join(f"`{m['path']}`" for m in others))
        lines.append('')
    lines.append('Issue #207 sprites: ' + ('all 32 present and passing.' if not regressions else 'REGRESSED: ' + '; '.join(regressions)))
    lines.append('')
    lines.append('Contact sheets of flagged images (each next to its siblings) are in the `art-audit` workflow artifact.')
    report = '\n'.join(lines) + '\n'
    open(os.path.join(a.out, 'report.md'), 'w').write(report)
    print(report)
    sys.exit(1 if failing or regressions else 0)


if __name__ == '__main__':
    main()
