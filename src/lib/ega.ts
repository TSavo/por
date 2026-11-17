/** Standard 16-color EGA palette, RGB 0-255. Index 16 is transparent. */
export const EGA_RGB: readonly (readonly [number, number, number])[] = [
  [0x00, 0x00, 0x00],
  [0x00, 0x00, 0xaa],
  [0x00, 0xaa, 0x00],
  [0x00, 0xaa, 0xaa],
  [0xaa, 0x00, 0x00],
  [0xaa, 0x00, 0xaa],
  [0xaa, 0x55, 0x00],
  [0xaa, 0xaa, 0xaa],
  [0x55, 0x55, 0x55],
  [0x55, 0x55, 0xff],
  [0x55, 0xff, 0x55],
  [0x55, 0xff, 0xff],
  [0xff, 0x55, 0x55],
  [0xff, 0x55, 0xff],
  [0xff, 0xff, 0x55],
  [0xff, 0xff, 0xff],
];

export const TRANSPARENT = 16;

export class Frame {
  readonly pixels: Uint8Array;

  constructor(
    readonly width: number,
    readonly height: number,
    fill = 0,
  ) {
    this.pixels = new Uint8Array(width * height);
    if (fill !== 0) this.pixels.fill(fill);
  }

  get(x: number, y: number): number {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return TRANSPARENT;
    return this.pixels[y * this.width + x];
  }

  set(x: number, y: number, color: number): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    if (color === TRANSPARENT) return;
    this.pixels[y * this.width + x] = color & 15;
  }

  fillRect(x: number, y: number, w: number, h: number, color: number): void {
    for (let yy = 0; yy < h; yy++) {
      for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, color);
    }
  }

  /** Blit an indexed sprite. Source value 16 is skipped. */
  blit(src: Uint8Array, sw: number, sh: number, dx: number, dy: number, frame = 0): void {
    const base = frame * sw * sh;
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const c = src[base + y * sw + x];
        if (c !== undefined && c !== TRANSPARENT) this.set(dx + x, dy + y, c);
      }
    }
  }

  toRgba(): Uint8ClampedArray {
    const out = new Uint8ClampedArray(new ArrayBuffer(this.width * this.height * 4));
    for (let i = 0; i < this.pixels.length; i++) {
      const c = this.pixels[i] ?? 0;
      const rgb = EGA_RGB[c] ?? EGA_RGB[0];
      out[i * 4] = rgb[0];
      out[i * 4 + 1] = rgb[1];
      out[i * 4 + 2] = rgb[2];
      out[i * 4 + 3] = 255;
    }
    return out;
  }
}
