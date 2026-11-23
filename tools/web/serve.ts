/**
 * The browser build's local server (#225, #228): static files and the resource layer, and nothing
 * else. The game runs in the page, its engine in a Web Worker (tools/web/play-page.ts); this only
 * answers the page's requests for its files, through the Node disk backend (tools/resources/node-disk.ts),
 * by the same URLs the Node game server serves.
 *
 *   npm run play:web        (POR_PLAY_PORT, default 43125)
 *
 * Every response is cross-origin isolated (COOP and COEP), which the engine's worker needs for its
 * shared command buffer (tools/web/command-channel.ts). The settings the launcher passes to its runner
 * (POR_CLOCK, POR_PREGEN_PARTY, POR_TRACE_KEYS) are passed to the page's engine in the resource index.
 */
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { serverId } from "../../src/resources/urls.js";
import { partyRecolorKey } from "../combat-art.js";
import { useNodeResources } from "../resources/node-play.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "../upgrade-art.js";
import { fromPortRoot } from "../port-root.js";
import { buildWeb, webOutput } from "./build.js";
import { codeWheelRunes, resourceIndex } from "./resource-index.js";
import { pageFiles, playPage, soundManifest, wheelArt } from "./static-files.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43125);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
const origin = `http://127.0.0.1:${port}`;

await buildWeb(undefined, { quiet: true });
const { resources } = useNodeResources(fromPortRoot("game"), { artFile: (id) => artwork.get(id)?.path });
const artwork = loadUpgradeArt(undefined, "res:game");
const materialMasks = loadCombatMaterialMasks(artwork);
const passed = Object.fromEntries(["POR_CLOCK", "POR_PREGEN_PARTY", "POR_TRACE_KEYS"]
  .flatMap((name) => process.env[name] ? [[name, process.env[name]!]] : []));
const built = resourceIndex(resources, artwork, materialMasks);
const index = JSON.stringify({ ...built, engineEnv: { ...built.engineEnv, ...passed } });
const sounds = soundManifest(resources);
const runes = codeWheelRunes(resources);

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".wav": "audio/wav", ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};
const files = pageFiles();

/** A piece of art's PNG: the art itself, or for a party recolour the base art or its material mask. */
function art(path: string): Uint8Array | undefined {
  if (path.startsWith("/art-materials/")) {
    const id = path.slice("/art-materials/".length);
    const base = partyRecolorKey.exec(id)?.[1];
    return base && !artwork.has(id) ? materialMasks.get(base) : undefined;
  }
  const id = path.slice("/art/".length);
  const base = partyRecolorKey.exec(id)?.[1];
  return artwork.get(id)?.png ?? (base && materialMasks.has(base) ? artwork.get(base)?.png : undefined);
}

const server = createServer((req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-embedder-policy", "require-corp");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  if (req.headers.host !== `127.0.0.1:${port}` || req.method !== "GET") { res.writeHead(403).end(); return; }
  const path = decodeURI((req.url ?? "/").split("?")[0]!);
  const send = (bytes: Uint8Array | string, type: string) => res.writeHead(200, { "content-type": type }).end(bytes);
  try {
    if (path === "/" || path === "/play.html") {
      res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'");
      send(playPage(), types[".html"]!);
      return;
    }
    if (path === "/resource-index.json") { send(index, types[".json"]!); return; }
    if (path === "/sound-manifest.json") { send(sounds, types[".json"]!); return; }
    const file = files.get(path);
    if (file) { send(readFileSync(file), types[extname(file)] ?? "text/plain"); return; }
    if (/^\/web\/[\w.-]+\.js$/.test(path)) {
      const bundle = join(webOutput, path.slice(5));
      if (statSync(bundle, { throwIfNoEntry: false })?.isFile()) { send(readFileSync(bundle), types[".js"]!); return; }
    }
    if (path.startsWith("/art/") || path.startsWith("/art-materials/")) {
      const png = art(path);
      if (png) send(png, types[".png"]!);
      else res.writeHead(path.startsWith("/art-materials/") ? 204 : 404).end();
      return;
    }
    const rune = /^\/code-wheel\/([a-z0-9-]+)\.png$/.exec(path)?.[1];
    const id = rune ? runes.get(rune) ?? (wheelArt.has(rune) ? `codewheel:${rune}.png` : undefined) : serverId(path);
    const bytes = id && resources.readNow(id);
    if (bytes) { send(bytes, types[extname(path)] ?? (path === "/code-wheel/layout" ? types[".json"]! : "application/octet-stream")); return; }
  } catch (error) {
    console.error(`${path}: ${(error as Error).message}`);
  }
  res.writeHead(404).end();
});
server.listen(port, "127.0.0.1", () => console.log(`Pool of Radiance browser build at ${origin}/`));
