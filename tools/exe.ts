/**
 * MZ / EXEPACK / overlay-stub scan.
 *
 * Gold Box executables from Pool of Radiance through Dark Queen of Krynn were
 * packed with Microsoft EXEPACK (the stub prints "Packed file is corrupt").
 * Some later copies were unpacked by crackers. REA's DOS loader analyzes an
 * MZ image; a packed file should be unpacked first, then handed to
 * `rea inspect --provider ghidra`.
 *
 * Overlay stubs in the unpacked image begin with CD 3F (int 3Fh). The 32-byte
 * descriptor that follows is the one Simeon Pilgrim recorded as _stub_descr:
 * file offset, code size, relocation size, entry count. Those file offsets
 * index GAME.OVR. REA does not itself split that overlay file; this scanner
 * does, once the stubs are visible.
 */

export interface MzInfo {
  bytes: number;
  headerParagraphs: number;
  headerBytes: number;
  relocCount: number;
  pages: number;
  lastPageBytes: number;
  imageBytes: number;
  entryCs: number;
  entryIp: number;
  extraBytes: number;
  packed: boolean;
  packer: string | null;
  strings: string[];
}

export interface OverlayStub {
  offset: number;
  fileOffset: number;
  codeSize: number;
  relocSize: number;
  entries: number;
  previous: number;
  memswap: number;
}

const PACKERS: { name: string; needle: string }[] = [
  { name: "EXEPACK", needle: "Packed file is corrupt" },
  { name: "PKLITE", needle: "PKLITE" },
  { name: "LZEXE", needle: "LZ91" },
  { name: "WWPACK", needle: "WWP" },
];

function findAscii(bytes: Uint8Array, text: string): boolean {
  const needle = new TextEncoder().encode(text);
  outer: for (let i = 0; i + needle.length <= bytes.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (bytes[i + j] !== needle[j]) continue outer;
    }
    return true;
  }
  return false;
}

export function inspectMz(bytes: Uint8Array): MzInfo {
  if (bytes.length < 0x40 || bytes[0] !== 0x4d || bytes[1] !== 0x5a) {
    throw new Error("not an MZ executable");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const lastPageBytes = view.getUint16(2, true);
  const pages = view.getUint16(4, true);
  const relocCount = view.getUint16(6, true);
  const headerParagraphs = view.getUint16(8, true);
  const entryIp = view.getUint16(0x14, true);
  const entryCs = view.getUint16(0x16, true);
  const headerBytes = headerParagraphs * 16;
  const imageBytes = pages === 0 ? 0 : pages * 512 - (lastPageBytes === 0 ? 0 : 512 - lastPageBytes);
  const packer = PACKERS.find((item) => findAscii(bytes, item.needle)) ?? null;
  return {
    bytes: bytes.length,
    headerParagraphs,
    headerBytes,
    relocCount,
    pages,
    lastPageBytes,
    imageBytes,
    entryCs,
    entryIp,
    extraBytes: Math.max(0, bytes.length - imageBytes),
    packed: packer !== null,
    packer: packer?.name ?? null,
    strings: PACKERS.filter((item) => findAscii(bytes, item.needle)).map((item) => item.name),
  };
}

/**
 * On disk, Pool of Radiance stores the 32-byte descriptor and not the
 * rewritten far-jump table. CotAB's in-memory image has `EA` at +0x20.
 * A descriptor counts when either that jump is present, or `ovrLength` is
 * given and the file offset plus code and relocation sizes land inside it.
 */
export function findOverlayStubs(bytes: Uint8Array, ovrLength?: number): OverlayStub[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const stubs: OverlayStub[] = [];
  const seen = new Set<number>();
  for (let i = 0; i + 0x20 < bytes.length; i++) {
    if (bytes[i] !== 0xcd || bytes[i + 1] !== 0x3f) continue;
    const fileOffset = view.getUint32(i + 4, true);
    const codeSize = view.getUint16(i + 8, true);
    const relocSize = view.getUint16(i + 0x0a, true);
    const entries = view.getUint16(i + 0x0c, true);
    const previous = view.getUint16(i + 0x0e, true);
    const memswap = view.getUint16(i + 2, true);
    if (entries === 0 || entries > 512) continue;
    if (codeSize === 0 || codeSize > 0xfff0) continue;
    const hasJump = bytes[i + 0x20] === 0xea;
    const inside =
      ovrLength !== undefined &&
      fileOffset >= 0 &&
      fileOffset + codeSize + relocSize <= ovrLength;
    if (!hasJump && !inside) continue;
    if (seen.has(fileOffset)) continue;
    seen.add(fileOffset);
    stubs.push({ offset: i, fileOffset, codeSize, relocSize, entries, previous, memswap });
  }
  stubs.sort((a, b) => a.fileOffset - b.fileOffset);
  return stubs;
}

export function overlayMagic(bytes: Uint8Array): string | null {
  const head = String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0);
  return head === "TPOV" ? head : null;
}

export function formatExeReport(info: MzInfo, stubs: OverlayStub[]): string {
  const lines = [
    `bytes ${info.bytes}`,
    `header ${info.headerBytes} (${info.headerParagraphs} paragraphs), relocations ${info.relocCount}`,
    `image ${info.imageBytes}, bytes after the image ${info.extraBytes}`,
    `entry ${info.entryCs.toString(16)}:${info.entryIp.toString(16)}`,
    info.packer
      ? `packer signature: ${info.packer}. Analyze an unpacked copy with REA; the packed stub is the decompressor, not the game.`
      : "no EXEPACK / PKLITE / LZEXE signature in the file",
    `overlay stubs: ${stubs.length}`,
  ];
  for (const stub of stubs.slice(0, 40)) {
    lines.push(
      `  file+0x${stub.offset.toString(16)} ovr+0x${stub.fileOffset.toString(16)} code ${stub.codeSize} reloc ${stub.relocSize} entries ${stub.entries}`,
    );
  }
  if (stubs.length > 40) lines.push(`  … ${stubs.length - 40} more`);
  return lines.join("\n");
}
