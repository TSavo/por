// node:url in the browser bundle (#225).
export const fileURLToPath = (url: string | URL) => new URL(String(url)).pathname;
export const pathToFileURL = (path: string) => new URL(`file://${path}`);
