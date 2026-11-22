/**
 * SCAFFOLDING. Hand-written from the container layout, not a translation of
 * Pool of Radiance. The port of this behavior is tools/tp_translate.py and
 * src/translated/. Keep this only until those procedures replace it.
 *
 * Gold Box .DAX container.
 *
 * Layout (little-endian), confirmed against Curse of the Azure Bonds files
 * which share this container with Pool of Radiance:
 *
 *   uint16 directoryBytes
 *   directoryBytes/9 entries of:
 *     uint8  id
 *     uint32 offset          relative to the first payload byte
 *     uint16 rawSize         decompressed length
 *     uint16 compSize
 *   payload begins at directoryBytes + 2
 *
 * Each payload is a byte-oriented run stream:
 *   int8 n
 *   n >= 0  copy the next n+1 bytes literally
 *   n <  0  repeat the next byte -n times
 */

export interface DaxEntry {
  id: number;
  offset: number;
  rawSize: number;
  compSize: number;
  data: Uint8Array;
}

export interface DaxFile {
  name: string;
  entries: DaxEntry[];
}

export function decodeRuns(comp: Uint8Array, rawSize: number): Uint8Array {
  const out = new Uint8Array(rawSize);
  let ip = 0;
  let op = 0;
  while (ip < comp.length && op < rawSize) {
    let n = comp[ip];
    if (n >= 128) n -= 256;
    if (n >= 0) {
      const count = n + 1;
      for (let i = 0; i < count && op < rawSize; i++) {
        out[op++] = comp[ip + 1 + i] ?? 0;
      }
      ip += count + 1;
    } else {
      const count = -n;
      const value = comp[ip + 1] ?? 0;
      for (let i = 0; i < count && op < rawSize; i++) out[op++] = value;
      ip += 2;
    }
  }
  return out;
}

export function parseDax(name: string, bytes: Uint8Array): DaxFile {
  if (bytes.length < 11) {
    throw new Error(`${name}: too small to be a DAX container (${bytes.length} bytes)`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const directoryBytes = view.getUint16(0, true);
  const dataOffset = directoryBytes + 2;
  if (dataOffset > bytes.length || directoryBytes < 9 || (directoryBytes % 9) !== 0) {
    throw new Error(
      `${name}: directory length ${directoryBytes} is not a positive multiple of 9, or it runs past the file`,
    );
  }
  const count = directoryBytes / 9;
  const entries: DaxEntry[] = [];
  for (let i = 0; i < count; i++) {
    const at = 2 + i * 9;
    const id = bytes[at] ?? 0;
    const offset = view.getUint32(at + 1, true);
    const rawSize = view.getUint16(at + 5, true);
    const compSize = view.getUint16(at + 7, true);
    const start = dataOffset + offset;
    const end = start + compSize;
    if (end > bytes.length) {
      throw new Error(
        `${name}: entry id ${id} points outside the file (offset ${offset}, compressed ${compSize}, raw ${rawSize})`,
      );
    }
    const comp = bytes.subarray(start, end);
    entries.push({
      id,
      offset,
      rawSize,
      compSize,
      data: decodeRuns(comp, rawSize),
    });
  }
  return { name, entries };
}

export function entryById(file: DaxFile, id: number): DaxEntry | undefined {
  return file.entries.find((e) => e.id === id);
}

interface Run { repeat: boolean; start: number; length: number }

/** The fewest runs: three or more equal bytes repeat, anything else is literal. */
function shortestRuns(data: Uint8Array): Run[] {
  const runs: Run[] = [];
  let at = 0;
  while (at < data.length) {
    let run = 1;
    while (run < 127 && at + run < data.length && data[at + run] === data[at]) run++;
    const last = runs.at(-1);
    if (run >= 3) {
      runs.push({ repeat: true, start: at, length: run });
      at += run;
    } else if (last && !last.repeat && last.length < 64) {
      last.length++;
      at++;
    } else {
      runs.push({ repeat: false, start: at++, length: 1 });
    }
  }
  return runs;
}

const packedSize = (runs: readonly Run[]): number => runs.reduce((size, { repeat, length }) => size + (repeat ? 2 : length + 1), 0);

/**
 * Pack bytes as a run stream the game's own loader reads. Literal runs stop at 64 bytes and
 * repeats at 127, which the guest's signed-byte counter holds.
 *
 * With `length`, the stream is exactly that many bytes long: runs are split into shorter ones,
 * which decode to the same bytes, until it is. The game allocates its read buffer from the packed
 * size, so an archive re-packed to the original sizes leaves the game's heap as the original does.
 */
export function encodeRuns(data: Uint8Array, length?: number): Uint8Array {
  let runs = shortestRuns(data);
  if (length !== undefined) {
    let pad = length - packedSize(runs);
    if (pad < 0) throw new Error(`${data.length} bytes cannot be packed into ${length}`);
    const single = (start: number): Run => ({ repeat: false, start, length: 1 });
    const capacity = runs.reduce((sum, { repeat, length }) => sum + (repeat ? 0 : length - 1), 0);
    // Splitting one byte off a literal run adds one byte. Taking one byte off a repeat adds two.
    let splits = Math.min(pad, capacity);
    if (pad > capacity && (pad - splits) % 2) {
      if (splits) splits--;
      else {
        // No literal to split and an odd number to add: two bytes of a repeat become a literal, which adds three.
        const at = runs.findIndex(({ repeat, length }) => repeat && length >= 3);
        if (at < 0 || pad < 3) throw new Error(`${data.length} bytes cannot be packed into exactly ${length}`);
        const { start, length: count } = runs[at]!;
        runs.splice(at, 1, { repeat: false, start, length: 2 }, { repeat: true, start: start + 2, length: count - 2 });
        pad -= 3;
      }
    }
    let peels = (pad - splits) / 2;
    const padded: Run[] = [];
    for (const run of runs) {
      const take = run.repeat ? Math.min(peels, run.length - 1) : Math.min(splits, run.length - 1);
      if (!take) { padded.push(run); continue; }
      if (run.repeat) peels -= take; else splits -= take;
      for (let i = 0; i < take; i++) padded.push(single(run.start + i));
      padded.push({ repeat: run.repeat, start: run.start + take, length: run.length - take });
    }
    if (peels || splits) throw new Error(`${data.length} bytes cannot be packed into as many as ${length}`);
    runs = padded;
  }
  const out = new Uint8Array(packedSize(runs));
  let at = 0;
  for (const { repeat, start, length } of runs) {
    if (repeat) {
      out[at++] = 256 - length;
      out[at++] = data[start]!;
    } else {
      out[at++] = length - 1;
      out.set(data.subarray(start, start + length), at);
      at += length;
    }
  }
  return out;
}

/** Build a DAX container from records, in the order given. `packedBytes` fixes a record's packed size. */
export function buildDax(records: readonly { id: number; data: Uint8Array; packedBytes?: number }[]): Uint8Array {
  const packed = records.map(({ id, data, packedBytes }) => ({ id, rawSize: data.length, compressed: encodeRuns(data, packedBytes) }));
  const directorySize = packed.length * 9;
  const bytes = new Uint8Array(2 + directorySize + packed.reduce((size, { compressed }) => size + compressed.length, 0));
  const view = new DataView(bytes.buffer);
  view.setUint16(0, directorySize, true);
  let offset = 0;
  for (const [index, { id, rawSize, compressed }] of packed.entries()) {
    const at = 2 + index * 9;
    if (rawSize > 0xffff || compressed.length > 0xffff) throw new Error(`DAX record ${id} is too large to pack`);
    view.setUint8(at, id);
    view.setUint32(at + 1, offset, true);
    view.setUint16(at + 5, rawSize, true);
    view.setUint16(at + 7, compressed.length, true);
    bytes.set(compressed, 2 + directorySize + offset);
    offset += compressed.length;
  }
  return bytes;
}
