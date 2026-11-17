import { TRANSPARENT } from "./ega.js";

/**
 * SCAFFOLDING picture decoder. Not translated from the game. The presentation
 * layer may keep using it until the translated blit routines replace it.
 *
 * Picture stored inside a decompressed DAX block (the on-disk header, not the
 * in-memory dax_block struct, which replaces the pixels with a pointer).
 *
 *   int16 height          pixels
 *   int16 widthUnits      pixel width is widthUnits * 8
 *   int16 x
 *   int16 y
 *   uint8 itemCount
 *   uint8 field9[8]
 *   then itemCount images of packed 4-bit pixels, high nibble first,
 *   widthUnits * 4 bytes per row.
 */
export interface Picture {
  height: number;
  width: number;
  x: number;
  y: number;
  /** Indexed pixels, one image after another. 16 means transparent. */
  pixels: Uint8Array;
  itemCount: number;
}

export function isPicture(block: Uint8Array): boolean {
  if (block.length < 17) return false;
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
  const height = view.getInt16(0, true);
  const widthUnits = view.getInt16(2, true);
  const count = block[8] ?? 0;
  if (height <= 0 || height > 400 || widthUnits <= 0 || widthUnits > 80 || count <= 0) return false;
  const pixels = count * height * widthUnits * 4;
  return block.length >= 17 + pixels;
}

export function decodePicture(block: Uint8Array, maskColor: number | null = null): Picture {
  const view = new DataView(block.buffer, block.byteOffset, block.byteLength);
  const height = view.getInt16(0, true);
  const widthUnits = view.getInt16(2, true);
  const x = view.getInt16(4, true);
  const y = view.getInt16(6, true);
  const itemCount = block[8] ?? 0;
  const width = widthUnits * 8;
  if (!isPicture(block)) {
    throw new Error(`not a picture (h=${height} wUnits=${widthUnits} count=${itemCount} len=${block.length})`);
  }
  const pixels = new Uint8Array(itemCount * width * height);
  let src = 17;
  let dst = 0;
  for (let item = 0; item < itemCount; item++) {
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < widthUnits * 4; col++) {
        const byte = block[src++] ?? 0;
        const hi = byte >> 4;
        const lo = byte & 0x0f;
        pixels[dst++] = maskColor !== null && hi === maskColor ? TRANSPARENT : hi;
        pixels[dst++] = maskColor !== null && lo === maskColor ? TRANSPARENT : lo;
      }
    }
  }
  return { height, width, x, y, pixels, itemCount };
}

export function frameSlice(picture: Picture, index: number): Uint8Array {
  const n = picture.width * picture.height;
  const start = index * n;
  return picture.pixels.subarray(start, start + n);
}
