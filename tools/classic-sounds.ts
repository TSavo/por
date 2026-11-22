import { join } from "node:path";

/**
 * Where a checkout finds the Classic sounds rendered from the original game. A release has none:
 * `npm run release:build` compiles the server with tools/release/no-classic-sounds.ts in place of
 * this file, so nothing in a release names por-assets.
 */
export const classicSoundDirectory: string | undefined = join("..", "por-assets", "original");
