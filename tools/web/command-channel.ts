/**
 * The player's commands from the page to the engine's worker (#225, #228). The engine waits for its
 * next command synchronously, deep inside the translated program, so the worker cannot wait for a
 * message: it waits on a SharedArrayBuffer with Atomics.wait while the page appends lines to it.
 * The page therefore runs cross-origin isolated (COOP same-origin, COEP require-corp).
 *
 * Layout: three Int32 counters (bytes written, bytes read, closed) and a ring of bytes after them.
 * Each command is one line of UTF-8 ending in "\n".
 */
const WRITTEN = 0, READ = 1, CLOSED = 2;
const HEADER = 16;

export function createCommandBuffer(size = 4 * 1024 * 1024): SharedArrayBuffer {
  return new SharedArrayBuffer(HEADER + size);
}

export class CommandWriter {
  private readonly control: Int32Array;
  private readonly ring: Uint8Array;
  private readonly encoder = new TextEncoder();
  constructor(buffer: SharedArrayBuffer) {
    this.control = new Int32Array(buffer, 0, 4);
    this.ring = new Uint8Array(buffer, HEADER);
  }
  /** Append one command. False when the ring has no room for it now. */
  write(command: string): boolean {
    const bytes = this.encoder.encode(command.replace(/\n/g, " ") + "\n");
    const written = Atomics.load(this.control, WRITTEN), read = Atomics.load(this.control, READ);
    if (bytes.length > this.ring.length - (written - read)) return false;
    for (let i = 0; i < bytes.length; i++) this.ring[(written + i) % this.ring.length] = bytes[i]!;
    Atomics.store(this.control, WRITTEN, written + bytes.length);
    Atomics.notify(this.control, WRITTEN);
    return true;
  }
  close(): void {
    Atomics.store(this.control, CLOSED, 1);
    Atomics.add(this.control, WRITTEN, 0);
    Atomics.notify(this.control, WRITTEN);
  }
}

export class CommandReader {
  private readonly control: Int32Array;
  private readonly ring: Uint8Array;
  private readonly decoder = new TextDecoder();
  constructor(buffer: SharedArrayBuffer) {
    this.control = new Int32Array(buffer, 0, 4);
    this.ring = new Uint8Array(buffer, HEADER);
  }
  /** The next command, waiting for it; undefined once the page has closed the channel. */
  read(): string | undefined {
    const bytes: number[] = [];
    let read = Atomics.load(this.control, READ);
    while (true) {
      const written = Atomics.load(this.control, WRITTEN);
      if (read === written) {
        if (Atomics.load(this.control, CLOSED)) return undefined;
        Atomics.wait(this.control, WRITTEN, written);
        continue;
      }
      const byte = this.ring[read % this.ring.length]!;
      read++;
      if (byte === 10) {
        Atomics.store(this.control, READ, read);
        return this.decoder.decode(Uint8Array.from(bytes)).trim();
      }
      bytes.push(byte);
    }
  }
}
