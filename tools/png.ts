import { deflateSync } from "node:zlib";
import { EGA_RGB, type Frame } from "../src/lib/ega.js";

const signature = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      const mask = -(crc & 1);
      crc = (crc >>> 1) ^ (0xedb88320 & mask);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out[4] = type.charCodeAt(0);
  out[5] = type.charCodeAt(1);
  out[6] = type.charCodeAt(2);
  out[7] = type.charCodeAt(3);
  out.set(data, 8);
  const crcInput = out.subarray(4, 8 + data.length);
  view.setUint32(8 + data.length, crc32(crcInput));
  return out;
}

export function encodePng(frame: Frame, palette = EGA_RGB): Uint8Array {
  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, frame.width);
  view.setUint32(4, frame.height);
  ihdr[8] = 8;
  ihdr[9] = 2;
  const raw = new Uint8Array((frame.width * 3 + 1) * frame.height);
  let offset = 0;
  for (let y = 0; y < frame.height; y++) {
    raw[offset++] = 0;
    for (let x = 0; x < frame.width; x++) {
      const color = frame.pixels[y * frame.width + x] ?? 0;
      const rgb = palette[color] ?? EGA_RGB[0];
      raw[offset++] = rgb[0];
      raw[offset++] = rgb[1];
      raw[offset++] = rgb[2];
    }
  }
  const compressed = deflateSync(raw);
  const parts = [signature, chunk("IHDR", ihdr), chunk("IDAT", compressed), chunk("IEND", new Uint8Array())];
  const size = parts.reduce((sum, part) => sum + part.length, 0);
  const png = new Uint8Array(size);
  let cursor = 0;
  for (const part of parts) {
    png.set(part, cursor);
    cursor += part.length;
  }
  return png;
}

/** Read dimensions only from a complete PNG with intact chunks. */
export function pngDimensions(png: Buffer) {
  if (png.length < 33 || !png.subarray(0, 8).equals(signature) ||
      png.readUInt32BE(8) !== 13 || png.toString("ascii", 12, 16) !== "IHDR") return;
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  if (!width || !height) return;

  let hasImageData = false;
  for (let offset = 8; offset + 12 <= png.length;) {
    const length = png.readUInt32BE(offset);
    const dataEnd = offset + 8 + length;
    if (dataEnd + 4 > png.length ||
        crc32(png.subarray(offset + 4, dataEnd)) !== png.readUInt32BE(dataEnd)) return;
    const type = png.toString("ascii", offset + 4, offset + 8);
    offset = dataEnd + 4;
    if (type === "IDAT" && length > 0) hasImageData = true;
    if (type === "IEND") return hasImageData && length === 0 && offset === png.length ? { width, height } : undefined;
  }
}
