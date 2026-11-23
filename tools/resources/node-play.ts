import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { join } from "node:path";
import { findGameRoot, isPortGameRoot, useGameRoot, type ResourceRoot } from "../gamedata.js";
import { useResources } from "../../src/resources/provider.js";
import { NodeDiskResources, type NodeDiskOptions } from "./node-disk.js";

/**
 * Put the Node disk backend in front of a game directory for this process (#224): the port's own data
 * becomes `game:` and the player's own files `original:`, and the play path runs from the resource
 * root that names them. `classicPictures` is a first-release folder whose pictures the Classic display
 * shows under the port's 1.3 data (#74); it is read where it is.
 */
export function useNodeResources(gameRoot: string, options: Omit<NodeDiskOptions, "game" | "original"> & { classicPictures?: string } = {}) {
  const { classicPictures, ...rest } = options;
  const port = isPortGameRoot(gameRoot);
  const disk = new NodeDiskResources({ ...rest, ...(port ? { game: gameRoot, original: classicPictures } : { original: gameRoot }) });
  const root: ResourceRoot = port ? "res:game" : "res:original";
  useResources(disk);
  useGameRoot(root);
  return { root, resources: disk };
}

/**
 * The pipe runner's game under Node (tools/boot-translated.ts): the directory POR_GAMEDATA or the
 * search finds, its saves in POR_SAVE_DIR or under out/saves/ by the directory's real path, and the
 * optional POR_JOURNAL_PROFILE.
 */
export function nodeGame(env: Record<string, string | undefined> = process.env) {
  const directory = findGameRoot();
  if (!directory) throw new Error("Pool of Radiance game data not found");
  // The browser server reads frames from this process's stdout pipe. Node writes
  // to a pipe asynchronously on macOS and Linux, and this process blocks reading
  // the next key before a large frame is flushed. Blocking writes keep each
  // frame ahead of the read that waits for its answer.
  (process.stdout as unknown as { _handle?: { setBlocking?: (blocking: boolean) => void } })
    ._handle?.setBlocking?.(true);
  const { root, resources } = useNodeResources(directory, {
    classicPictures: env.POR_CLASSIC_PICTURES || undefined,
    saves: env.POR_SAVE_DIR ?? join("out", "saves", createHash("sha256").update(realpathSync(directory)).digest("hex").slice(0, 16)),
    journalProfile: env.POR_JOURNAL_PROFILE || undefined,
  });
  return { root, resources, directory };
}
