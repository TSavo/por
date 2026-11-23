/**
 * The packaged game's resource backend (#229): the game's files as loose local files, in the port's
 * own layout (src/resources/layout.ts), answered by the same URLs the page fetches from the Node
 * servers (src/resources/urls.ts). A packaged app registers `looseResponse` as its custom protocol's
 * handler; tools/web/serve-loose.ts serves it over local HTTP for the checks.
 *
 * Art, audio, the atlas, voices and narration stay files read when the page asks for one. The page
 * still preloads `game:` and the player's original files into memory (tools/web/play-page.ts). What
 * Node computes for the local server is written beside them by tools/web/build-loose.ts, under web/:
 * the page and its bundle, the resource index, the sound manifest and the party recolour masks.
 */
import { readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { layoutPath } from "../../src/resources/layout.js";
import { serverId } from "../../src/resources/urls.js";
import { partyRecolorKey } from "../combat-art.js";
import type { ResourceIndex } from "./resource-index.js";
import { pageFiles, wheelArt } from "./static-files.js";

export const looseTypes: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".wav": "audio/wav", ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};

/** The page's own files under web/, by the URL the page asks for them. */
export const loosePageFiles = (): Map<string, string> => new Map([
  ["/", "web/play.html"], ["/play.html", "web/play.html"],
  ["/resource-index.json", "web/resource-index.json"], ["/sound-manifest.json", "web/sound-manifest.json"],
  ...[...pageFiles().keys()].map((url): [string, string] => [url, `web/${url === "/code-wheel" ? "code-wheel.html" : url.slice(1)}`]),
]);

export interface LooseFiles {
  /** The folder of loose files. */
  root: string;
  index: ResourceIndex;
  pages: Map<string, string>;
}

export function openLooseFiles(root: string): LooseFiles {
  return { root, index: JSON.parse(readFileSync(join(root, "web", "resource-index.json"), "utf8")) as ResourceIndex, pages: loosePageFiles() };
}

/** The file a URL path names among the loose files, or the status to answer. */
export function looseResponse({ root, index, pages }: LooseFiles, path: string): { file: string; type: string } | { status: number } {
  const found = (relative: string | undefined) => {
    if (!relative) return;
    const file = join(root, relative);
    return statSync(file, { throwIfNoEntry: false })?.isFile() ? { file, type: looseTypes[extname(file)] ?? "application/octet-stream" } : undefined;
  };
  const page = pages.get(path) ?? (/^\/web\/[\w.-]+\.js$/.test(path) ? path.slice(1) : undefined);
  if (page) return found(page) ?? { status: 404 };
  const artFile = (id: string) => index.artwork[id]?.path;
  if (path.startsWith("/art-materials/")) {
    // A party recolour's mask: none for art drawn as it is.
    const id = path.slice("/art-materials/".length);
    const base = partyRecolorKey.exec(id)?.[1];
    return (base && !index.artwork[id] && found(`web/art-materials/${base}.png`)) || { status: 204 };
  }
  if (path.startsWith("/art/")) {
    const id = path.slice("/art/".length);
    const base = partyRecolorKey.exec(id)?.[1];
    const own = artFile(id) ?? (base && found(`web/art-materials/${base}.png`) ? artFile(base) : undefined);
    return found(own && layoutPath(own)) ?? { status: 404 };
  }
  const rune = /^\/code-wheel\/([a-z0-9-]+)\.png$/.exec(path)?.[1];
  if (rune) {
    return (/^(espruar|dethek)-\d{2}$/.test(rune) || wheelArt.has(rune) ? found(layoutPath(`codewheel:${rune}.png`)) : undefined) ?? { status: 404 };
  }
  const id = serverId(path);
  const hit = id && !id.startsWith("save:") && !id.startsWith("setting:") && !id.startsWith("journal:") ? found(layoutPath(id, artFile)) : undefined;
  if (!hit) return { status: 404 };
  return path === "/code-wheel/layout" ? { ...hit, type: looseTypes[".json"]! } : hit;
}
