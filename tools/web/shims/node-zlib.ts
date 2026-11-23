// node:zlib in the browser bundle (#225): the frames' PNGs are deflated with fflate.
import { zlibSync } from "fflate";
export const deflateSync = (data: Uint8Array) => zlibSync(data, { level: 1 });
