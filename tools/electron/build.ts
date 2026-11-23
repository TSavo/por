/**
 * Compile the Electron main process (#108) to dist/electron/main.js, bundled so a packaged app has
 * no node_modules of its own. electron stays external: the packaged runtime provides it.
 *
 *   tsx tools/electron/build.ts
 */
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { fromPortRoot } from "../port-root.js";

export const electronOutput = fromPortRoot("dist", "electron");
const here = fileURLToPath(new URL(".", import.meta.url));
const version = (JSON.parse(readFileSync(fromPortRoot("package.json"), "utf8")) as { version: string }).version;

export async function buildElectron() {
  rmSync(electronOutput, { recursive: true, force: true });
  mkdirSync(electronOutput, { recursive: true });
  const common = {
    absWorkingDir: fromPortRoot(),
    bundle: true,
    platform: "node" as const,
    target: "es2022",
    minifySyntax: true,
    legalComments: "none" as const,
    logLevel: "warning" as const,
    external: ["electron"],
  };
  await build({ ...common, entryPoints: [join(here, "main.ts")], outfile: join(electronOutput, "main.js"), format: "esm" });
  await build({ ...common, entryPoints: [join(here, "preload.ts")], outfile: join(electronOutput, "preload.cjs"), format: "cjs" });
  for (const name of ["main.js", "preload.cjs"]) {
    const file = join(electronOutput, name);
    if (readFileSync(file, "utf8").includes("por-assets")) throw new Error(`${file} names por-assets`);
  }
  writeFileSync(join(electronOutput, "package.json"), JSON.stringify({
    name: "pool-of-radiance",
    version,
    private: true,
    type: "module",
    main: "main.js",
    productName: "Pool of Radiance",
  }, null, 2) + "\n");
  console.log(`Compiled the Electron main process to ${electronOutput}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildElectron();
