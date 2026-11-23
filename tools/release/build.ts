/**
 * npm run release:build: compile the game server, the runner and the release launcher to JavaScript
 * that the release's own Node runs, with no tsx and no node_modules. Writes dist/app/:
 *
 *   server.mjs   tools/browser-play.ts
 *   runner.mjs   tools/boot-translated.ts
 *   launch.mjs   tools/release/launch.ts
 *
 * The build fails if any output names por-assets.
 */
import { build } from "esbuild";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { checkoutBuildVersion } from "../build-version.js";
import { fromPortRoot } from "../port-root.js";

const appOutput = fromPortRoot("dist", "app");

rmSync(appOutput, { recursive: true, force: true });
const entries = { server: "tools/browser-play.ts", runner: "tools/boot-translated.ts", launch: "tools/release/launch.ts" };
// The title-screen label. A packaged game has no .git, so this string is compiled in.
const buildVersion = checkoutBuildVersion({ release: true });
await build({
  absWorkingDir: fromPortRoot(),
  entryPoints: Object.entries(entries).map(([out, input]) => ({ in: input, out })),
  outdir: appOutput,
  outExtension: { ".js": ".mjs" },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "node22",
  // Constant branches are dropped; names are kept as written.
  minifySyntax: true,
  legalComments: "none",
  logLevel: "warning",
  define: { "process.env.POR_BUILD_VERSION": JSON.stringify(buildVersion) },
});
for (const name of Object.keys(entries)) {
  const file = join(appOutput, `${name}.mjs`);
  if (readFileSync(file, "utf8").includes("por-assets")) throw new Error(`${file} names por-assets`);
}
console.log(`Compiled the server, runner and launcher to ${appOutput} (${buildVersion})`);
