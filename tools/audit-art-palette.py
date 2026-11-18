"""Count visible RGB colors in the replacement PNGs exported by the HTML inventory."""

import argparse
import json
from collections import defaultdict
from pathlib import Path

from PIL import Image


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("inventory", nargs="?", type=Path, default=Path("out/art-inventory/inventory.json"))
    path = parser.parse_args().inventory
    replacements = json.loads(path.read_text(encoding="utf-8"))["replacements"]
    if not replacements:
        parser.error("the inventory contains no replacement PNGs")

    shared = set()
    families = defaultdict(set)
    for replacement in replacements:
        with Image.open(path.parent / replacement["preview"]) as source:
            rgba = source.convert("RGBA")
            colors = {
                (red, green, blue)
                for _, (red, green, blue, alpha) in rgba.getcolors(rgba.width * rgba.height)
                if alpha
            }
        shared.update(colors)
        families[replacement["id"].partition(":")[0]].update(colors)

    for family, colors in sorted(families.items()):
        print(f"{family}: {len(colors)} colors")
    print(f"{len(replacements)} replacement PNGs use {len(shared)} visible RGB colors together.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
