"""Check the Enhanced character editor's visible material coverage against the game's native palette."""
import hashlib
import json
from functools import cache
from pathlib import Path
from struct import iter_unpack

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SIZE = (96, 96)
# Six color pairs in the original character record, with a dark/bright material in each.
EDITABLE = {1, 2, 3, 4, 6, 7, 9, 10, 11, 12, 14, 15}


@cache
def image_materials(file):
    with Image.open(file) as source, Image.open(file.with_name(file.stem + "-materials.png")) as companion:
        if source.size != SIZE or companion.size != SIZE:
            raise ValueError(f"{file.name} and its mask must both be 96 by 96")
        rgba = source.convert("RGBA")
        mask = companion.convert("RGBA")
        # Canvas recoloring preserves alpha and scales the original brightness. An invisible or black
        # pixel can't demonstrate that this material actually changes color on screen.
        pixels = iter_unpack("4B", rgba.tobytes())
        tags = iter_unpack("4B", mask.tobytes())
        visible = {tag[0] for pixel, tag in zip(pixels, tags)
                   if pixel[3] and max(pixel[:3]) and tag[3]}
        # Canvas ignores RGB hidden behind zero alpha.
        rendered = Image.alpha_composite(Image.new("RGBA", SIZE), rgba).tobytes()
        return visible, hashlib.sha256(rendered).digest()


def main():
    files = {}
    for directory in (ROOT / "upgrades/slums", ROOT / "upgrades"):
        manifest = json.loads((directory / "manifest.json").read_text())
        files.update({key: directory / name for key, name in manifest["assets"].items()
                      if key.startswith("combat:party:")})
    source = json.loads((ROOT / "game/pictures.json").read_text())["partyIconColours"]
    failures = []
    owners = {}
    drawings = {}
    native_absent = present = intersections = poses = 0
    for size in (0, 64):
        for head in range(size, size + 14):
            for weapon in range(size, size + 32):
                for body in (weapon, weapon + 128):
                    poses += 1
                    key = f"combat:party:{head}:{body}"
                    if key not in files:
                        failures.append(f"{key}: no base art")
                        continue
                    try:
                        visible, digest = image_materials(files[key])
                    except (OSError, ValueError) as error:
                        failures.append(f"{key}: {error}")
                        continue
                    # The game's framebuffer cannot distinguish these three pairs of small heads.
                    source_head = {11: 0, 12: 1, 13: 2}.get(head, head)
                    canonical = (source_head, body)
                    if owners.setdefault(digest, canonical) != canonical:
                        failures.append(f"{key}: same drawing as different native combination {owners[digest]}")
                    if drawings.setdefault(canonical, digest) != digest:
                        failures.append(f"{key}: drawing differs from equivalent native head {source_head}")
                    bitset = int(source[f"{head}:{body}"], 16)
                    drawn = {index for index in EDITABLE if bitset & (1 << index)}
                    native_absent += len(EDITABLE - drawn)
                    # GOG CHEAD and CBODY use a bitwise OR. Two robe head/arm boundaries create
                    # a single 4|10 pixel, at (6,8) for head 3 and (7,9) for head 7. Neither part
                    # contains material 14. The painted hair and sleeve have distinct contours.
                    if head in (3, 7) and body in (156, 157, 158) and 14 in drawn and 14 not in visible:
                        drawn.remove(14)
                        intersections += 1
                    present += len(drawn & visible)
                    if missing := drawn - visible:
                        failures.append(f"{key}: missing visible material(s) {sorted(missing)}")
    print(f"{poses} poses, {len(owners)} distinct drawings, {present} visible native color channels, "
          f"{native_absent} absent in the original, {intersections} native single-pixel overlaps.")
    for failure in failures:
        print(failure)
    return bool(failures)


if __name__ == "__main__":
    raise SystemExit(main())
