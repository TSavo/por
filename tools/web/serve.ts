/**
 * The browser build's local server (#225): static files and the resource layer, and nothing else. The
 * game runs in the page; this only answers the page's requests for its files, through the Node disk
 * backend (tools/resources/node-disk.ts), by the same URLs `npm run play` serves.
 *
 *   npx tsx tools/web/serve.ts        (POR_PLAY_PORT, default 43125)
 *
 * Every response is cross-origin isolated (COOP and COEP), which the engine's worker needs for its
 * shared command buffer (tools/web/command-channel.ts).
 */
import { readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { serverId } from "../../src/resources/urls.js";
import { useNodeResources } from "../resources/node-play.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "../upgrade-art.js";
import { fromPortRoot } from "../port-root.js";
import { buildWeb, webOutput } from "./build.js";
import { resourceIndex } from "./resource-index.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43125);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
const origin = `http://127.0.0.1:${port}`;

await buildWeb(undefined, { quiet: true });
const { resources } = useNodeResources(fromPortRoot("game"), { artFile: (id) => artwork.get(id)?.path });
const artwork = loadUpgradeArt(undefined, "res:game");
const materialMasks = loadCombatMaterialMasks(artwork);
const index = JSON.stringify(resourceIndex(resources, artwork, materialMasks));

const types: Record<string, string> = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".png": "image/png", ".wav": "audio/wav", ".mp3": "audio/mpeg",
  ".woff2": "font/woff2",
};
/** The page files: tools/web/*.html and the bundle in out/web/. */
const pages: Record<string, string> = { "/boot.html": join(fromPortRoot("tools", "web"), "boot.html") };

const server = createServer((req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-embedder-policy", "require-corp");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  if (req.headers.host !== `127.0.0.1:${port}` || req.method !== "GET") { res.writeHead(403).end(); return; }
  const path = decodeURI((req.url ?? "/").split("?")[0]!);
  const send = (bytes: Uint8Array | string, type: string) => res.writeHead(200, { "content-type": type }).end(bytes);
  if (path === "/resource-index.json") { send(index, types[".json"]!); return; }
  const page = pages[path === "/" ? "/boot.html" : path];
  if (page) { send(readFileSync(page), types[".html"]!); return; }
  if (/^\/web\/[\w.-]+\.js$/.test(path)) {
    const file = join(webOutput, path.slice(5));
    if (statSync(file, { throwIfNoEntry: false })?.isFile()) { send(readFileSync(file), types[".js"]!); return; }
  }
  const id = serverId(path);
  const bytes = id && (() => { try { return resources.readNow(id); } catch { return undefined; } })();
  if (bytes) { send(bytes, types[extname(path)] ?? "application/octet-stream"); return; }
  res.writeHead(404).end();
});
server.listen(port, "127.0.0.1", () => console.log(`Pool of Radiance browser build at ${origin}/`));
