import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const directory = process.argv[2] ?? join("out", "campaigns", "watchtower");
const base = 0x9900;
const word = (value: number) => [value & 0xff, value >> 8];
const memory = (address: number) => [1, ...word(address)];
const byte = (value: number) => [0, value];
const text = (message: string) => {
  const symbols = Array.from(message, (char) => char.charCodeAt(0) & 63);
  while (symbols.length % 4) symbols.push(0);
  const packed: number[] = [];
  for (let i = 0; i < symbols.length; i += 4) {
    const [a, b, c, d] = symbols.slice(i, i + 4) as [number, number, number, number];
    packed.push((a << 2) | (b >> 4), ((b & 15) << 4) | (c >> 2), ((c & 3) << 6) | d);
  }
  return [0x80, packed.length, ...packed];
};
const choice = 0x6e79;
const done = 0x4a00;
const script = Array.from({ length: 5 }, () => [1, ...memory(base + 20)]).flat();
script.push(3, ...memory(done), ...byte(1), 0x16, 0);
script.push(0x12, ...text("A FLOOD HAS CUT OFF THE WATCHTOWER. THE KEEPER ASKS FOR A SIGNAL."));
script.push(0x2b, ...memory(choice), ...byte(2), ...text("LIGHT THE BEACON"), ...text("RING THE BELL"));
const branch = script.length;
script.push(0x25, ...memory(choice), ...byte(2), ...memory(0), ...memory(0));
const beacon = base + script.length;
script.push(0x12, ...text("THE BEACON SHINES. A FERRY TURNS TOWARD THE WATCHTOWER."),
  9, ...byte(1), ...memory(done), 0);
const bell = base + script.length;
script.push(0x12, ...text("THE BELL CARRIES OVER THE WATER. A FERRY ANSWERS."),
  9, ...byte(1), ...memory(done), 0);
script.splice(branch + 7, 2, ...word(beacon));
script.splice(branch + 10, 2, ...word(bell));

const raw = Uint8Array.from([...word(5000), ...script]);
const packed: number[] = [];
// The original DOS decoder accepts literal run controls from 0 through 126.
for (let offset = 0; offset < raw.length; offset += 127) {
  const chunk = raw.subarray(offset, offset + 127);
  packed.push(chunk.length - 1, ...chunk);
}
const header = Buffer.alloc(11);
header.writeUInt16LE(9, 0);
header[2] = 0;
header.writeUInt16LE(raw.length, 7);
header.writeUInt16LE(packed.length, 9);
mkdirSync(directory, { recursive: true });
writeFileSync(join(directory, "ECL3.DAX"), Buffer.concat([header, Buffer.from(packed)]), { flag: "wx" });
console.log(`Wrote the Watchtower scenario to ${directory}`);
