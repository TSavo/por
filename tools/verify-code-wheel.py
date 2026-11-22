"""Check the code wheel layout and Enhanced PNGs.

    python tools/verify-code-wheel.py           check the layout
    python tools/verify-code-wheel.py --words   also print the word at every position of every path

The layout is the physical wheel: 36 positions on each disc, six rings of letters on the outer
disc, three paths of six windows on the inner disc. To read it, turn the inner disc until the
Dethek rune sits against the Espruar rune; the letter in a window at inner position w of ring r is
the outer disc's ring r at position (w - dethek + espruar) mod 36. Read from the inside out.

The 13 questions are the ones in the version 1.3 program (qa/research/code-wheel.md). Every one
must read the word the program expects.
"""
import json
import os
import struct
import sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
wheel = json.loads((root / "src" / "codewheel" / "wheel.json").read_text())
N = wheel["positions"]
# The words in the game's own table, in the order the game numbers them.
GAME = ["BEWARE", "ZOMBIE", "NOTNOW", "COPPER", "DRAGON", "EFREET", "FRIEND", "JUNGLE", "KNIGHT", "SAVIOR",
        "TEMPLE", "VULCAN", "WYVERN"]
PATHS = ["dashes", "dash-dot-dot", "dots"]


def read(espruar: int, dethek: int, path: str) -> str:
    windows = next(entry["windows"] for entry in wheel["inner"]["paths"] if entry["id"] == path)
    return "".join(wheel["outer"]["rings"][ring][(window - dethek + espruar) % N] for ring, window in enumerate(windows))


problems = []
for disc in ("outer", "inner"):
    runes = wheel[disc]["runes"]
    if len(runes) != N or len(set(runes)) != N or runes.count("translate-tab") != 1:
        problems.append(f"the {disc} disc needs {N} different positions, one of them the translate tab")
if [len(ring) for ring in wheel["outer"]["rings"]] != [N] * 6:
    problems.append("the outer disc needs six rings of 36 letters")
if [entry["id"] for entry in wheel["inner"]["paths"]] != PATHS:
    problems.append(f"the paths must be {PATHS}")
for question in wheel["questions"]:
    number = question["number"]
    shown = read(wheel["outer"]["runes"].index(question["espruar"]), wheel["inner"]["runes"].index(question["dethek"]),
                 question["path"])
    if question["word"] != GAME[number] or question["path"] != PATHS[number % 3]:
        problems.append(f"question {number} does not match the game's table")
    if shown != question["word"]:
        problems.append(f"question {number} reads {shown}, and the game expects {question['word']}")
if len(wheel["questions"]) != len(GAME):
    problems.append("the game asks 13 questions")
# Every path gives the same 36 words, one for each turn of the inner disc.
words = {path: [read(turn, 0, path) for turn in range(N)] for path in PATHS}
if len({frozenset(found) for found in words.values()}) != 1 or len(set(words[PATHS[0]])) != N:
    problems.append("the three paths should give the same 36 different words")
else:
    first_path = words[PATHS[0]]
    for path in PATHS[1:]:
        start = words[path].index(first_path[0])
        if words[path][start:] + words[path][:start] != first_path:
            problems.append(f"{path} does not read the words in the same cyclic order")

art = {
    "outer-disc": (2048, 2048),
    "inner-disc": (2048, 2048),
    "background": (2048, 1280),
    **{f"path-{path}": (512, 64) for path in PATHS},
}
for disc, alphabet in (("outer", "espruar"), ("inner", "dethek")):
    art[f"{alphabet}-translate-tab"] = (512, 256)
    art.update({id: (256, 128) for id in wheel[disc]["runes"] if id != "translate-tab"})
art_dir = root / "upgrades" / "codewheel"
for unexpected in sorted({file.stem for file in art_dir.glob("*.png")} - art.keys()):
    problems.append(f"unexpected code wheel PNG: {unexpected}.png")
for id, size in art.items():
    file = art_dir / f"{id}.png"
    if not file.is_file():
        problems.append(f"missing code wheel PNG: {file.name}")
        continue
    with file.open("rb") as stream:
        header = stream.read(29)
    if (len(header) != 29 or header[:16] != b"\x89PNG\r\n\x1a\n\x00\x00\x00\x0dIHDR"
            or struct.unpack(">II", header[16:24]) != size or header[25] != 6):
        problems.append(f"{file.name} must be a {size[0]}×{size[1]} RGBA PNG")


# Likeness. Each rune tile must be the real rune, redrawn: the player matches the wheel against
# the runes the game shows. The references are the scan's runes in por-assets/codewheel/runes.
# A tile passes when its shape overlaps its own reference by at least 0.70 and overlaps no other
# rune of the same alphabet clearly more. Measured on 2026-11-21: a reference against a thickened
# enlargement of itself scores 0.89 to 0.96; against a different rune, 0.42 at the median.
def likeness():
    requested_reference = os.environ.get("POR_CODEWHEEL_REFERENCE")
    references = Path(requested_reference or root.parent / "por-assets" / "codewheel" / "runes")
    if not references.is_dir():
        if requested_reference:
            problems.append(f"POR_CODEWHEEL_REFERENCE does not name a directory: {references}")
        return "likeness not checked: the reference runes are not at " + str(references)
    try:
        from PIL import Image
    except ImportError:
        if requested_reference:
            problems.append("Pillow is required to check POR_CODEWHEEL_REFERENCE")
        return "likeness not checked: Pillow is not installed"
    grid = (64, 32)

    def shape(file, lit):
        image = Image.open(file).convert("RGBA")
        mask = Image.new("L", image.size, 0)
        mask.putdata([255 if lit(pixel) else 0 for pixel in image.get_flattened_data()]
                     if hasattr(image, "get_flattened_data") else [255 if lit(pixel) else 0 for pixel in image.getdata()])
        if mask.getbbox() is None:
            return None
        # The whole picture is compared, not the glyph cut out and stretched: a tile frames its
        # rune the way the reference does. Stretching a narrow rune to fill the grid made two
        # different upright strokes look alike.
        small = mask.resize(grid, Image.BILINEAR).point(lambda value: 255 if value > 100 else 0)
        # Thicken by one cell, so the weight of a stroke counts for little.
        cells = small.load()
        return frozenset((x, y) for y in range(grid[1]) for x in range(grid[0])
                         if any(0 <= x + dx < grid[0] and 0 <= y + dy < grid[1] and cells[x + dx, y + dy]
                                for dx in (-1, 0, 1) for dy in (-1, 0, 1)))

    def overlap(a, b):
        return len(a & b) / len(a | b) if a and b else 0.0

    failures = 0
    for disc, alphabet in (("outer", "espruar"), ("inner", "dethek")):
        ids = [id for id in wheel[disc]["runes"] if id != "translate-tab"]
        real = {}
        for id in ids:
            found = sorted(references.glob(f"{alphabet}-piece{id.split('-')[1]}-*.png"))
            if len(found) != 1:
                problems.append(f"expected one reference picture for {id}")
                continue
            real[id] = shape(found[0], lambda pixel: sum(pixel[:3]) > 384)
        for id in ids:
            file = art_dir / f"{id}.png"
            if id not in real or not file.is_file():
                continue
            drawn = shape(file, lambda pixel: pixel[3] > 96)
            scores = {other: overlap(real[other], drawn) for other in real}
            nearest = max(scores, key=scores.get)
            # Some of the wheel's runes differ by a few pixels, so a tie with a near twin is allowed.
            closer = nearest != id and scores[nearest] > scores[id] + 0.02
            if scores[id] < 0.70 or closer:
                failures += 1
                problems.append(f"{file.name} is not its reference rune: likeness {scores[id]:.2f}, needs 0.70"
                                + (f"; it is closer to {nearest} ({scores[nearest]:.2f})" if closer else ""))
    return f"{len(art) - 8 - failures} of {len(art) - 8} rune tiles are their reference rune"


likeness_report = likeness()
if problems:
    raise SystemExit("\n".join(problems))
if "--words" in sys.argv:
    for path in PATHS:
        print(f"{path}: {' '.join(words[path])}")
print(f"verified the code wheel: {len(GAME)} questions, {N} words in the same order on all paths, {len(art)} PNGs; {likeness_report}")
