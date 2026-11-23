// For the browser checks only (#226): serves a folder of original files the way a picked folder is
// read, so headless Chrome, which has no folder picker, goes through the same inspection and preload.
// GET <base>/ lists the files (and those one folder down) as JSON; GET <base>/<path> is a file.
// The bytes are read from where they are, for the check's page, and never written anywhere.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { basename, join } from "node:path";

export async function serveOriginalFolder(folder, { lowercaseFiles = false } = {}) {
  const name = basename(folder);
  const list = [];
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    if (entry.isFile()) list.push(entry.name);
    else if (entry.isDirectory()) for (const inner of readdirSync(join(folder, entry.name), { withFileTypes: true })) if (inner.isFile()) list.push(`${entry.name}/${inner.name}`);
  }
  const paths = new Map(list.map((path) => [
    lowercaseFiles ? path.replace(/[^/]+$/, (name) => name.toLowerCase()) : path, path,
  ]));
  const server = createServer((req, res) => {
    const headers = { "access-control-allow-origin": "*", "cross-origin-resource-policy": "cross-origin" };
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname).replace(`/${name}/`, "");
    if (path === "") { res.writeHead(200, { ...headers, "content-type": "application/json" }).end(JSON.stringify([...paths.keys()])); return; }
    const file = paths.get(path);
    if (!file || !statSync(join(folder, file)).isFile()) { res.writeHead(404, headers).end(); return; }
    res.writeHead(200, { ...headers, "content-type": "application/octet-stream" }).end(readFileSync(join(folder, file)));
  });
  await new Promise((done) => server.listen(0, "127.0.0.1", done));
  return { url: `http://127.0.0.1:${server.address().port}/${encodeURIComponent(name)}/`, close: () => server.close() };
}
