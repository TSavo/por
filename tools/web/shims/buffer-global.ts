// The Buffer the engine's art matchers and frames use, in the browser bundle (#225).
import { Buffer } from "buffer";
(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;
export { Buffer };
