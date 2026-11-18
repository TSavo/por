import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const sampleRate = 48_000;
const duration = 1.15;
const samples = Math.round(sampleRate * duration);
const bytes = new Uint8Array(44 + samples * 2);
const view = new DataView(bytes.buffer);
const ascii = (offset: number, value: string) => {
  for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i);
};
ascii(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); ascii(8, "WAVEfmt ");
view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, "data");
view.setUint32(40, samples * 2, true);
let noise = 0x51f15e;
for (let i = 0; i < samples; i++) {
  const time = i / sampleRate;
  const attack = Math.min(1, time / 0.018);
  const decay = Math.exp(-time * 3.7);
  const sweep = 220 + 720 * Math.exp(-time * 5.2);
  const shimmer = Math.sin(2 * Math.PI * sweep * time) + 0.45 * Math.sin(2 * Math.PI * sweep * 1.502 * time);
  noise ^= noise << 13; noise ^= noise >>> 17; noise ^= noise << 5;
  const grit = ((noise >>> 0) / 0xffffffff * 2 - 1) * Math.exp(-time * 18);
  const value = Math.tanh((shimmer * 0.42 + grit * 0.35) * attack * decay) * 0.72;
  view.setInt16(44 + i * 2, Math.round(value * 32767), true);
}
const output = resolve(process.argv[2] ?? "../por-assets/enhanced");
mkdirSync(output, { recursive: true });
writeFileSync(join(output, "por-original-effect-02.wav"), bytes);
console.log(`wrote ${join(output, "por-original-effect-02.wav")}`);
