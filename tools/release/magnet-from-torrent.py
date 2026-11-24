#!/usr/bin/env python3
"""Print a magnet URI for a single-file .torrent (infohash + dn + the POR trackers + GitHub web seed)."""
from __future__ import annotations

import hashlib
import pathlib
import sys
import urllib.parse


TRACKERS = [
    "udp://tracker.opentrackr.org:1337/announce",
    "udp://open.stealth.si:80/announce",
    "udp://tracker.torrent.eu.org:451/announce",
    "udp://exodus.desync.com:6969/announce",
]


def infohash(raw: bytes) -> str:
    key = b"4:info"
    i = raw.find(key)
    if i < 0:
        raise SystemExit("torrent has no info dict")
    start = i + len(key)

    class Parser:
        def __init__(self, buf: bytes, pos: int) -> None:
            self.b = buf
            self.i = pos

        def parse(self) -> None:
            kind = self.b[self.i : self.i + 1]
            if kind == b"i":
                self.i = self.b.index(b"e", self.i) + 1
                return
            if kind in (b"l", b"d"):
                self.i += 1
                while self.b[self.i : self.i + 1] != b"e":
                    self.parse()
                    if kind == b"d":
                        self.parse()
                self.i += 1
                return
            colon = self.b.index(b":", self.i)
            n = int(self.b[self.i : colon])
            self.i = colon + 1 + n

    parser = Parser(raw, start)
    parser.parse()
    return hashlib.sha1(raw[start : parser.i]).hexdigest()


def magnet(path: pathlib.Path, repo: str, tag: str) -> str:
    digest = infohash(path.read_bytes())
    name = path.name[: -len(".torrent")] if path.name.endswith(".torrent") else path.name
    encoded = urllib.parse.quote(name, safe="")
    parts = [f"magnet:?xt=urn:btih:{digest}", f"dn={encoded}"]
    parts.extend("tr=" + urllib.parse.quote(tr, safe="") for tr in TRACKERS)
    parts.append("ws=" + urllib.parse.quote(f"https://github.com/{repo}/releases/download/{tag}/{name}", safe=""))
    return "&".join(parts)


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit(f"usage: {sys.argv[0]} <file.torrent> <owner/repo> <tag>")
    print(magnet(pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]))


if __name__ == "__main__":
    main()
