"""Check the code wheel layout in src/codewheel/wheel.json.

    python tools/verify-code-wheel.py           check the layout
    python tools/verify-code-wheel.py --words   also print the word at every position of every path

The layout is the physical wheel: 36 positions on each disc, six rings of letters on the outer
disc, three paths of six windows on the inner disc. To read it, turn the inner disc until the
Dethek rune sits against the Espruar rune; the letter in a window at inner position w of ring r is
the outer disc's ring r at position (w - dethek + espruar) mod 36. Read from the inside out.

The 13 questions are the ones in the version 1.3 program (qa/research/code-wheel.md). Every one
must read the word the program expects.
"""
import json, sys
from pathlib import Path

wheel = json.loads((Path(__file__).resolve().parents[1] / "src" / "codewheel" / "wheel.json").read_text())
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
if problems:
    raise SystemExit("\n".join(problems))
if "--words" in sys.argv:
    for path in PATHS:
        print(f"{path}: {' '.join(words[path])}")
print(f"verified the code wheel: all {len(GAME)} of the game's questions read their word, and each path gives the same {N} words")
