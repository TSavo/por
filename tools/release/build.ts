/**
 * npm run release:build: compile the Electron main process and the packaged page's loose web files,
 * with no tsx and no node_modules in the package. Writes:
 *
 *   dist/electron/   main.js and package.json (tools/electron/build.ts)
 *   dist/web/        the page, its bundles, the resource index, the sound manifest and the
 *                    party recolour masks (tools/web/build-loose.ts)
 *
 * The title screen's label (v0.1.0 (0c83fe2), for example) is written into the resource index,
 * because a packaged game has no .git.
 */
import { checkoutBuildVersion } from "../build-version.js";
import { buildElectron } from "../electron/build.js";
import { fromPortRoot } from "../port-root.js";
import { writeLooseWeb } from "../web/build-loose.js";

const buildVersion = checkoutBuildVersion({ release: true });
process.env.POR_BUILD_VERSION = buildVersion;
await buildElectron();
await writeLooseWeb(fromPortRoot("dist", "web"));
console.log(`Built the Electron app and packaged web files (${buildVersion})`);
