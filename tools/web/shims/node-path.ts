// node:path in the browser bundle (#225): POSIX paths, enough for the names the game files carry.
export const sep = "/";
function normalize(path: string): string {
  const absolute = path.startsWith("/");
  const parts: string[] = [];
  for (const part of path.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") { if (parts.length && parts.at(-1) !== "..") parts.pop(); else if (!absolute) parts.push(".."); }
    else parts.push(part);
  }
  return (absolute ? "/" : "") + parts.join("/") || (absolute ? "/" : ".");
}
export const join = (...parts: string[]) => normalize(parts.filter(Boolean).join("/"));
export const resolve = (...parts: string[]) => {
  let path = "";
  for (const part of parts) path = part.startsWith("/") ? part : path ? `${path}/${part}` : part;
  return normalize(path.startsWith("/") ? path : `/${path}`);
};
export const dirname = (path: string) => { const at = path.lastIndexOf("/"); return at < 0 ? "." : at === 0 ? "/" : path.slice(0, at); };
export const basename = (path: string, ext?: string) => {
  const base = path.slice(path.lastIndexOf("/") + 1);
  return ext && base.endsWith(ext) ? base.slice(0, -ext.length) : base;
};
export const extname = (path: string) => { const base = basename(path); const at = base.lastIndexOf("."); return at <= 0 ? "" : base.slice(at); };
export const relative = (from: string, to: string) => {
  const a = resolve(from).split("/").filter(Boolean), b = resolve(to).split("/").filter(Boolean);
  let common = 0;
  while (common < a.length && common < b.length && a[common] === b[common]) common++;
  return [...Array(a.length - common).fill(".."), ...b.slice(common)].join("/");
};
export const isAbsolute = (path: string) => path.startsWith("/");
const path = { sep, join, resolve, dirname, basename, extname, relative, isAbsolute, normalize, posix: undefined as unknown };
path.posix = path;
export default path;
export { normalize };
