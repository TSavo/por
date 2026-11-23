/**
 * Bundle the browser build (#225): the engine core (src/cpu, src/runtime, src/translated-1.3 and the
 * engine's tools) for a Web Worker, and the page's own modules. The output is out/web/, rebuilt on
 * every `npm run web:build` (and by the servers when it is missing).
 *
 * Node's modules are replaced by tools/web/shims/: the play path reads through the resource layer and
 * never reaches them, and the tools' path and diagnostic branches that do are Node-only.
 */
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const here = fileURLToPath(new URL(".", import.meta.url));
export const webOutput = fileURLToPath(new URL("../../out/web/", import.meta.url));
const shim = (name: string) => join(here, "shims", `${name}.ts`);

export async function buildWeb(entries: string[] = ["engine-worker.ts", "boot-check.ts", "play-page.ts"], { quiet = false } = {}) {
  const started = Date.now();
  const result = await build({
    entryPoints: entries.map((entry) => join(here, entry)),
    outdir: webOutput,
    bundle: true,
    splitting: true,
    format: "esm",
    platform: "browser",
    target: "es2022",
    sourcemap: false,
    minify: false,
    logLevel: quiet ? "error" : "warning",
    metafile: true,
    alias: {
      "node:fs": shim("node-fs"),
      "node:path": shim("node-path"),
      "node:crypto": shim("node-crypto"),
      "node:zlib": shim("node-zlib"),
      "node:url": shim("node-url"),
      "node:os": shim("node-os"),
    },
    inject: [shim("buffer-global")],
  });
  const bytes = Object.values(result.metafile.outputs).reduce((total, { bytes }) => total + bytes, 0);
  if (!quiet) console.log(`web build: ${Object.keys(result.metafile.outputs).length} files, ${(bytes / 1e6).toFixed(1)} MB, ${Date.now() - started} ms -> ${webOutput}`);
  return result;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildWeb();
