import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

interface EventEntry { id: string; index: number; kind: string; loop: boolean }
const manifest = JSON.parse(readFileSync(new URL("../src/audio/original-sounds.json", import.meta.url), "utf8")) as
  { events: EventEntry[]; verification: Record<string, string> };
const assets = resolve(process.env.POR_AUDIO_DIR ?? "../por-assets/original");
const rows = manifest.events.map((event) => ({
  ...event,
  pcWav: existsSync(resolve(assets, `pc-speaker-${String(event.index).padStart(2, "0")}.wav`)),
  tandyVgm: existsSync(resolve(assets, `tandy-${String(event.index).padStart(2, "0")}.vgm`)),
  tandyWav: existsSync(resolve(assets, `tandy-${String(event.index).padStart(2, "0")}.wav`)),
  enhancedReplacement: false,
  enhancedFallback: true,
}));
const report = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  totals: {
    events: rows.length,
    pcWav: rows.filter((row) => row.pcWav).length,
    tandyVgm: rows.filter((row) => row.tandyVgm).length,
    tandyWav: rows.filter((row) => row.tandyWav).length,
    enhancedReplacements: rows.filter((row) => row.enhancedReplacement).length,
    enhancedFallbacks: rows.filter((row) => row.enhancedFallback).length,
  },
  verification: manifest.verification,
  events: rows,
};
const json = `${JSON.stringify(report, null, 2)}\n`;
if (process.argv[2]) writeFileSync(resolve(process.argv[2]), json);
else process.stdout.write(json);
if (rows.some((row) => !row.pcWav || !row.tandyVgm || !row.tandyWav)) process.exitCode = 1;
