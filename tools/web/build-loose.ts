/**
 * The packaged game's loose files (#229), in out/loose/: the port's layout (src/resources/layout.ts)
 * with what the local server computes written under web/. This is what a packaged app carries beside
 * its window, read through tools/web/loose-files.ts. The big folders (game/, upgrades/, audio/) are
 * linked rather than copied here; a package copies them.
 *
 *   npm run web:build-loose
 */
import { copyFileSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { manifestFiles } from "../../src/resources/layout.js";
import { useNodeResources } from "../resources/node-play.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "../upgrade-art.js";
import { fromPortRoot } from "../port-root.js";
import { buildWeb, webOutput } from "./build.js";
import { loosePageFiles } from "./loose-files.js";
import { resourceIndex } from "./resource-index.js";
import { pageFiles, pageSources, playPage, soundManifest } from "./static-files.js";

export const looseOutput = fileURLToPath(new URL("../../out/loose/", import.meta.url));

/** The computed page, bundles, resource index, sound manifest and party recolour masks, under `webDir`. */
export async function writeLooseWeb(webDir: string) {
  const bundle = await buildWeb(undefined, { quiet: true });
  rmSync(webDir, { recursive: true, force: true });
  const write = (relative: string, data: string | Uint8Array) => {
    mkdirSync(dirname(join(webDir, relative)), { recursive: true });
    writeFileSync(join(webDir, relative), data);
  };
  const { resources } = useNodeResources(fromPortRoot("game"), { pages: pageSources(), artFile: (id) => artwork.get(id)?.path });
  const artwork = loadUpgradeArt(undefined, "res:game");
  const masks = loadCombatMaterialMasks(artwork);
  write("resource-index.json", JSON.stringify(resourceIndex(resources, artwork, masks)));
  write("sound-manifest.json", soundManifest(resources));
  write("play.html", playPage(resources));
  for (const [base, mask] of masks) {
    const png = mask.png;
    if (png) write(`art-materials/${base}.png`, png);
  }
  const sources = pageFiles();
  for (const [url, relative] of loosePageFiles()) {
    const source = sources.get(url === "/" ? "" : url);
    if (!source) continue;
    const dest = relative.startsWith("web/") ? relative.slice("web/".length) : relative;
    mkdirSync(dirname(join(webDir, dest)), { recursive: true });
    copyFileSync(source, join(webDir, dest));
  }
  for (const file of Object.keys(bundle.metafile.outputs)) {
    const name = file.split("/").at(-1)!;
    copyFileSync(join(webOutput, name), join(webDir, name));
  }
}

export async function buildLoose(output = looseOutput) {
  const started = Date.now();
  rmSync(output, { recursive: true, force: true });
  await writeLooseWeb(join(output, "web"));
  // The port's own files, in its layout.
  for (const folder of ["game", "upgrades", "audio", join("src", "maps")]) {
    mkdirSync(dirname(join(output, folder)), { recursive: true });
    symlinkSync(fromPortRoot(folder), join(output, folder), "dir");
  }
  for (const file of manifestFiles) {
    mkdirSync(dirname(join(output, file)), { recursive: true });
    copyFileSync(fromPortRoot(file), join(output, file));
  }
  console.log(`loose files: ${output} in ${Date.now() - started} ms`);
  return output;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await buildLoose();
