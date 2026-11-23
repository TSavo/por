/**
 * The browser build's page files (#228): the game page and the scripts it loads, as the Node game
 * server (tools/browser-play.ts) serves them, for the local server (tools/web/serve.ts) and the loose
 * files of a packaged game (tools/web/build-loose.ts).
 */
import { readJsonNow, readTextNow, type ResidentResources } from "../../src/resources/provider.js";
import { fromPortRoot } from "../port-root.js";

/** The page's own files by URL: the game page's scripts, the code wheel's page, and the boot check. */
export function pageFiles(): Map<string, string> {
  return new Map([
    ["/play.js", fromPortRoot("tools", "play.js")],
    ["/held-portrait-loops.mjs", fromPortRoot("tools", "held-portrait-loops.mjs")],
    ["/renderer.js", fromPortRoot("tools", "renderer.js")],
    ["/code-wheel", fromPortRoot("tools", "code-wheel.html")],
    ["/code-wheel.js", fromPortRoot("tools", "code-wheel.js")],
    ["/code-wheel-draw.js", fromPortRoot("tools", "code-wheel-draw.js")],
    ["/rune-glyphs.js", fromPortRoot("tools", "rune-glyphs.js")],
    ["/boot.html", fromPortRoot("tools", "web", "boot.html")],
  ]);
}

/** Include the HTML template when serving source files through the Node provider. */
export function pageSources() {
  return pageFiles().set("/play.html", fromPortRoot("tools", "play.html"));
}

/** tools/play.html with the browser build's page module, which play.js asks before anything else. */
export function playPage(resources: ResidentResources): string {
  const page = readTextNow(resources, "page:play.html");
  const script = '<script src="/play.js" defer></script>';
  if (!page?.includes(script)) throw new Error("tools/play.html no longer loads /play.js as the browser build expects");
  return page.replace(script, `<script type="module" src="/web/play-page.js"></script>\n  ${script}`);
}

/** The code wheel's own art besides its runes, as the Node server allows it. */
export const wheelArt = new Set([
  "background", "outer-disc", "inner-disc", "espruar-translate-tab", "dethek-translate-tab",
  "path-dashes", "path-dash-dot-dot", "path-dots",
]);

/**
 * /sound-manifest.json. The manifest lists the sound events of the first release. Version 1.3, which
 * the game always is, replaced the driver's events above 12 with other sounds and never asks for
 * them, so the rendered Classic files for those events do not belong to it.
 */
export function soundManifest(resources: ResidentResources): string {
  const manifest = readJsonNow<{ events: { index: number; classic?: boolean }[] }>(resources, "manifest:src/audio/original-sounds.json")!;
  for (const event of manifest.events) if (event.index > 12) event.classic = false;
  return JSON.stringify(manifest);
}
