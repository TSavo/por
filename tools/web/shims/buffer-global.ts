// The Buffer the engine's art matchers and frames use, in the browser bundle (#225).
import { Buffer } from "buffer";

// Node's Buffer takes any Uint8Array where it takes a Buffer: the engine compares pixels it holds as
// Buffers with views of the screen (live-input's perspective and picture checks). The browser
// package wants a Buffer there, so it is given one over the same bytes.
const asBuffer = (bytes: Uint8Array) => Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
const { equals, copy } = Buffer.prototype;
const compare = Buffer.compare;
Buffer.prototype.equals = function (this: Buffer, other: Uint8Array) { return equals.call(this, asBuffer(other)); };
Buffer.prototype.copy = function (this: Buffer, target: Uint8Array, ...rest: number[]) {
  return (copy as (...args: unknown[]) => number).call(this, asBuffer(target), ...rest);
};
Buffer.compare = (a: Uint8Array, b: Uint8Array) => compare(asBuffer(a), asBuffer(b));

(globalThis as unknown as { Buffer: typeof Buffer }).Buffer ??= Buffer;
export { Buffer };
