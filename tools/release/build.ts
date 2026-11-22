/**
 * npm run release:build: compile the game server, the runner and the release launcher to JavaScript
 * that the release's own Node runs, with no tsx and no node_modules. Writes dist/app/:
 *
 *   server.mjs   tools/browser-play.ts
 *   runner.mjs   tools/boot-translated.ts
 *   launch.mjs   tools/release/launch.ts
 *
 * tools/classic-sounds.ts, which names the checkout's por-assets, is replaced by
 * tools/release/no-classic-sounds.ts. The build fails if any output still names por-assets.
 */
import { build, type Plugin } from "esbuild";
import { readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fromPortRoot } from "../port-root.js";

const appOutput = fromPortRoot("dist", "app");

const noClassicSounds: Plugin = {
  name: "no-classic-sounds",
  setup(context) {
    context.onResolve({ filter: /\/classic-sounds\.js$/ }, () => ({ path: fromPortRoot("tools", "release", "no-classic-sounds.ts") }));
  },
};

rmSync(appOutput, { recursive: true, force: true });
const entries = { server: "tools/browser-play.ts", runner: "tools/boot-translated.ts", launch: "tools/release/launch.ts" };
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
  plugins: [noClassicSounds],
  logLevel: "warning",
});
for (const name of Object.keys(entries)) {
  const file = join(appOutput, `${name}.mjs`);
  if (readFileSync(file, "utf8").includes("por-assets")) throw new Error(`${file} names por-assets`);
}
console.log(`Compiled the server, runner and launcher to ${appOutput}`);
