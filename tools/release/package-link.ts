// Electron's Mac frameworks use relocatable links. Resolve the whole chain while the image is mounted.
import { readlinkSync, realpathSync } from "node:fs";
import { isAbsolute, relative, sep } from "node:path";

export function packageLinkTarget(root: string, file: string): string {
  if (isAbsolute(readlinkSync(file))) throw new Error(`${file} is an absolute link`);
  const target = relative(realpathSync(root), realpathSync(file));
  if (!target || target === ".." || target.startsWith(".." + sep) || isAbsolute(target)) {
    throw new Error(`${file} links outside the package or to its root`);
  }
  return target.split(sep).join("/");
}
