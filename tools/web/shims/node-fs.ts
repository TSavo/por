// node:fs in the browser bundle (#225). The play path reads through the resource layer; only the
// tools' path-based and diagnostic branches use fs, and those never run in the page.
const unavailable = (name: string) => () => { throw new Error(`fs.${name} is not available in the browser`); };
export const readFileSync = unavailable("readFileSync");
export const writeFileSync = unavailable("writeFileSync");
export const appendFileSync = unavailable("appendFileSync");
export const mkdirSync = unavailable("mkdirSync");
export const mkdtempSync = unavailable("mkdtempSync");
export const readdirSync = unavailable("readdirSync");
export const renameSync = unavailable("renameSync");
export const rmSync = unavailable("rmSync");
export const openSync = unavailable("openSync");
export const closeSync = unavailable("closeSync");
export const readSync = unavailable("readSync");
export const realpathSync = unavailable("realpathSync");
export const copyFileSync = unavailable("copyFileSync");
export const createWriteStream = unavailable("createWriteStream");
export const existsSync = () => false;
export const statSync = (_path: string, options?: { throwIfNoEntry?: boolean }) => {
  if (options?.throwIfNoEntry === false) return undefined;
  throw new Error("fs.statSync is not available in the browser");
};
export default { readFileSync, writeFileSync, appendFileSync, mkdirSync, mkdtempSync, readdirSync, renameSync, rmSync,
  openSync, closeSync, readSync, realpathSync, copyFileSync, createWriteStream, existsSync, statSync };
