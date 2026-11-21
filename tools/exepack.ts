/**
 * Unpack a Microsoft EXEPACK executable into its load image.
 * Version 1.3 of START.EXE ships packed. The earlier build does not.
 */
export interface LoadImage { image: Uint8Array; relocations: number[]; cs: number; ip: number; ss: number; sp: number; packed: boolean }

export function loadExecutable(exe: Uint8Array): LoadImage {
  const word = (offset: number) => exe[offset]! | (exe[offset + 1]! << 8);
  if (word(0) !== 0x5a4d) throw new Error("Not an MZ executable");
  const header = word(8) * 16;
  const last = word(2), pages = word(4);
  const size = last ? (pages - 1) * 512 + last : pages * 512;
  const body = exe.subarray(header, size);
  const cs = word(0x16), ip = word(0x14);
  const marker = new TextEncoder().encode("Packed file is corrupt");
  let message = -1;
  for (let i = cs * 16; i + marker.length <= body.length && message < 0; i++) {
    if (marker.every((byte, j) => body[i + j] === byte)) message = i;
  }
  if (message < 0) {
    const relocations: number[] = [];
    for (let i = 0, at = word(0x18); i < word(6); i++, at += 4) relocations.push(word(at + 2) * 16 + word(at));
    return { image: body, relocations, cs, ip, ss: word(0x0e), sp: word(0x10), packed: false };
  }
  // The unpacker's variables sit at CS:0, and the packed data fills the image below them.
  const variables = cs * 16;
  const at = (offset: number) => body[variables + offset]! | (body[variables + offset + 1]! << 8);
  const realIp = at(0), realCs = at(2), realSp = at(8), realSs = at(10), destination = at(12);
  let skip = 1;
  if (!(body[variables + ip - 2] === 0x52 && body[variables + ip - 1] === 0x42)) skip = at(14);
  const image = new Uint8Array(destination * 16);
  image.set(body.subarray(0, variables));
  let source = variables - (skip - 1) * 16;
  while (image[source - 1] === 0xff) source--;
  let target = destination * 16;
  for (;;) {
    const command = image[--source]!;
    source -= 2;
    const count = image[source]! | (image[source + 1]! << 8);
    if ((command & 0xfe) === 0xb0) {
      const fill = image[--source]!;
      target -= count;
      image.fill(fill, target, target + count);
    } else if ((command & 0xfe) === 0xb2) {
      target -= count;
      source -= count;
      image.copyWithin(target, source, source + count);
    } else throw new Error(`Unknown EXEPACK command ${command.toString(16)}`);
    if (command & 1) break;
  }
  const relocations: number[] = [];
  let table = message + marker.length;
  for (let segment = 0; segment < 16; segment++) {
    const count = body[table]! | (body[table + 1]! << 8);
    table += 2;
    for (let i = 0; i < count; i++, table += 2) relocations.push(segment * 0x10000 + (body[table]! | (body[table + 1]! << 8)));
  }
  return { image, relocations, cs: realCs, ip: realIp, ss: realSs, sp: realSp, packed: true };
}
