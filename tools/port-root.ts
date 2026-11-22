import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The directory that holds the port's own files: game/, upgrades/, audio/, qa/, the data under src/
 * and the page files under tools/. A release names it in POR_ROOT, because its compiled server and
 * runner are not in tools/ of a checkout. Unset, it is the checkout this file is in.
 */
export const releaseRoot = process.env.POR_ROOT ? resolve(process.env.POR_ROOT) : undefined;
export const portRoot = releaseRoot ?? fileURLToPath(new URL("..", import.meta.url));

/** A file of the port, such as `fromPortRoot("src", "maps", "atlas.json")`. */
export function fromPortRoot(...parts: string[]): string {
  return join(portRoot, ...parts);
}

/**
 * A directory a checkout names relative to where it is run (`upgrades`, `audio`). In a release it is
 * under POR_ROOT, wherever the release is run from.
 */
export function fromWorkingRoot(...parts: string[]): string {
  return releaseRoot ? join(releaseRoot, ...parts) : join(...parts);
}
