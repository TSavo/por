"""Make the Enhanced code wheel's rune tiles from the original runes.

    python tools/build-code-wheel-runes.py [reference-directory]

Each rune of the physical wheel is a 16 by 8 pixel glyph, kept at four times that size in
por-assets/codewheel/runes (one PNG per rune, light on dark, named `<alphabet>-pieceNN-….png`).
This enlarges each one to 256 by 128 with smoothed edges and colours it like the wheel's gold
lettering, and writes `upgrades/codewheel/<alphabet>-NN.png`. The shape is the original's and
nothing is redrawn, so every tile is the rune the game shows. Needs Pillow.
"""
import re, sys
from pathlib import Path
from PIL import Image, ImageChops, ImageFilter

root = Path(__file__).resolve().parents[1]
references = Path(sys.argv[1]) if len(sys.argv) > 1 else root.parent / "por-assets" / "codewheel" / "runes"
output = root / "upgrades" / "codewheel"
SIZE = (256, 128)
GOLD, EDGE = (246, 200, 120), (92, 52, 20)

made = 0
for file in sorted(references.glob("*.png")):
    match = re.fullmatch(r"(espruar|dethek)-piece(\d\d)-.*\.png", file.name)
    if not match:
        raise SystemExit(f"unexpected reference file {file.name}")
    lit = Image.open(file).convert("L").point(lambda value: 255 if value > 128 else 0)
    # Enlarge the hard-edged glyph, then round the stair-steps: blur and cut back at half.
    shape = lit.resize(SIZE, Image.NEAREST).filter(ImageFilter.GaussianBlur(3.2))
    shape = shape.point(lambda value: 0 if value < 96 else 255 if value > 160 else int((value - 96) * 255 / 64))
    # A dark rim around the stroke keeps it readable on a light or a dark disc.
    rim = shape.filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1))
    tile = Image.new("RGBA", SIZE, (0, 0, 0, 0))
    tile.paste(Image.new("RGBA", SIZE, EDGE + (255,)), mask=ImageChops.subtract(rim, shape))
    tile.paste(Image.new("RGBA", SIZE, GOLD + (255,)), mask=shape)
    tile.save(output / f"{match.group(1)}-{match.group(2)}.png")
    made += 1
if made != 70:
    raise SystemExit(f"expected 70 runes in {references}, found {made}")
print(f"wrote {made} rune tiles to {output.relative_to(root)}")
