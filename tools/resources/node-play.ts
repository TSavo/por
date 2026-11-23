import { isPortGameRoot, useGameRoot, type ResourceRoot } from "../gamedata.js";
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

