/**
 * The packaged game's loose files over local HTTP (#229), as a packaged app's custom protocol answers
 * them (tools/web/loose-files.ts): for checking the packaged backend in a browser. Builds out/loose/
 * first unless POR_LOOSE_DIR names one.
 *
 *   npm run play:loose        (POR_PLAY_PORT, default 43126)
 */
import { createReadStream, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { buildLoose } from "./build-loose.js";
import { looseResponse, openLooseFiles } from "./loose-files.js";

const port = Number(process.env.POR_PLAY_PORT ?? 43126);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("POR_PLAY_PORT must be a TCP port between 1 and 65535");
const loose = openLooseFiles(process.env.POR_LOOSE_DIR || await buildLoose());
// The settings a launcher passes to the game (POR_CLOCK, POR_PREGEN_PARTY, POR_TRACE_KEYS), as
// tools/web/serve.ts passes them, so the checks run the same game here.
const passed = Object.fromEntries(["POR_CLOCK", "POR_PREGEN_PARTY", "POR_TRACE_KEYS"]
  .flatMap((name) => process.env[name] ? [[name, process.env[name]!]] : []));
const written = JSON.parse(readFileSync(`${loose.root}/web/resource-index.json`, "utf8")) as { engineEnv: Record<string, string> };
const index = JSON.stringify({ ...written, engineEnv: { ...written.engineEnv, ...passed } });

createServer((req, res) => {
  res.setHeader("cache-control", "no-store");
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-embedder-policy", "require-corp");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  if (req.headers.host !== `127.0.0.1:${port}` || req.method !== "GET") { res.writeHead(403).end(); return; }
  let path: string;
  try { path = decodeURI((req.url ?? "/").split("?")[0]!); } catch { res.writeHead(400).end(); return; }
  if (path === "/resource-index.json") { res.writeHead(200, { "content-type": "application/json; charset=utf-8" }).end(index); return; }
  const answer = looseResponse(loose, path);
  if ("status" in answer) { res.writeHead(answer.status).end(); return; }
  if (path === "/" || path === "/play.html") res.setHeader("content-security-policy", "default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'");
  res.writeHead(200, { "content-type": answer.type });
  createReadStream(answer.file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`Pool of Radiance packaged files at http://127.0.0.1:${port}/`));
