import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const sampleRate = 48_000;
type Synth = (time: number, noise: number) => number;
interface EffectSpec { file: string; seconds: number; seed: number; synth: Synth }
const tone = (t: number, hz: number) => Math.sin(2 * Math.PI * hz * t);
const decay = (t: number, rate: number) => Math.exp(-t * rate);
const attack = (t: number, seconds: number) => Math.min(1, t / seconds);
const chirp = (t: number, from: number, to: number, seconds: number) =>
  Math.sin(2 * Math.PI * (from * t + (to - from) * t * t / (2 * seconds)));

const effects: EffectSpec[] = [
  { file: "por-spell-cast.wav", seconds: 1.15, seed: 0x51f15e, synth: (t, n) => attack(t, .018) * decay(t, 3.7) * (tone(t, 220 + 720 * decay(t, 5.2)) * .42 + tone(t, (220 + 720 * decay(t, 5.2)) * 1.502) * .19 + n * decay(t, 18) * .35) },
  { file: "por-damage.wav", seconds: .34, seed: 0xd4a6e, synth: (t, n) => attack(t, .003) * (n * .8 + tone(t, 92) * .45) * decay(t, 13) },
  { file: "por-status-effect.wav", seconds: 1.12, seed: 0x57a705, synth: (t, n) => attack(t, .012) * decay(t, 2.6) * (tone(t, 523 + 110 * t) * .34 + tone(t, 659 + 140 * t) * .28 + tone(t, 784 + 170 * t) * .22 + n * .035) },
  { file: "por-downed.wav", seconds: 1.55, seed: 0xd09ed, synth: (t, n) => attack(t, .008) * decay(t, 2.2) * (chirp(t, 310, 58, 1.55) * .52 + tone(t, 55) * .22 + n * decay(t, 5) * .16) },
  { file: "por-ranged-start.wav", seconds: .62, seed: 0xb0a57, synth: (t, n) => attack(t, .002) * (chirp(t, 980, 150, .62) * decay(t, 8) * .36 + n * decay(t, 14) * .58 + tone(t, 118) * decay(t, 6) * .18) },
  { file: "por-impact.wav", seconds: .38, seed: 0x1a9ac7, synth: (t, n) => attack(t, .002) * (n * decay(t, 18) * .6 + tone(t, 72) * decay(t, 10) * .55) },
  { file: "por-lightning.wav", seconds: 2.62, seed: 0x11a6e7, synth: (t, n) => attack(t, .001) * (n * (.24 + .76 * Math.max(0, Math.sin(t * 79) ** 12)) * decay(t, .65) * .72 + tone(t, 48 + 11 * Math.sin(t * 7)) * decay(t, 1.2) * .28) },
  { file: "por-miss.wav", seconds: .42, seed: 0xa1155, synth: (t, n) => attack(t, .015) * n * Math.sin(Math.PI * Math.min(1, t / .42)) * .54 + chirp(t, 540, 140, .42) * decay(t, 7) * .15 },
  { file: "por-step.wav", seconds: .16, seed: 0x57e9, synth: (t, n) => attack(t, .002) * (n * .34 + tone(t, 83) * .42) * decay(t, 26) },
  { file: "por-fireball-cue.wav", seconds: 1.86, seed: 0xf1e6a11, synth: (t, n) => attack(t, .012) * (n * (.18 + .38 * decay(t, 2.5)) + chirp(t, 120, 620, 1.86) * .28 + tone(t, 61) * .3) * decay(t, 1.35) },
  { file: "por-ranged-end.wav", seconds: .3, seed: 0xa221a1, synth: (t, n) => attack(t, .002) * (n * decay(t, 22) * .42 + tone(t, 135) * decay(t, 15) * .46) },
];

function encodeWave(spec: EffectSpec) {
  const count = Math.round(sampleRate * spec.seconds);
  const values = new Float64Array(count);
  let state = spec.seed >>> 0;
  let peak = 0;
  for (let i = 0; i < count; i++) {
    state ^= state << 13; state ^= state >>> 17; state ^= state << 5;
    const noise = (state >>> 0) / 0xffffffff * 2 - 1;
    values[i] = Math.tanh(spec.synth(i / sampleRate, noise));
    peak = Math.max(peak, Math.abs(values[i]!));
  }
  const gain = peak ? .82 / peak : 0;
  const bytes = new Uint8Array(44 + count * 2);
  const view = new DataView(bytes.buffer);
  const ascii = (offset: number, value: string) => { for (let i = 0; i < value.length; i++) bytes[offset + i] = value.charCodeAt(i); };
  ascii(0, "RIFF"); view.setUint32(4, bytes.length - 8, true); ascii(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true); ascii(36, "data"); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) view.setInt16(44 + i * 2, Math.round(values[i]! * gain * 32767), true);
  return bytes;
}

const output = resolve(process.argv[2] ?? "../por-assets/enhanced");
mkdirSync(output, { recursive: true });
for (const effect of effects) {
  const path = join(output, effect.file);
  writeFileSync(path, encodeWave(effect));
  console.log(`wrote ${path}`);
}
