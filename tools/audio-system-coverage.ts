import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

interface OriginalEvent {
  id: string; index: number; reachable?: boolean; enhancedFile?: string;
}
interface QueueItem { id?: string; output: string; text: string }

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const audio = join(root, "src", "audio");
const assets = resolve(root, "../por-assets");
const original = JSON.parse(readFileSync(join(audio, "original-sounds.json"), "utf8"));
const master = JSON.parse(readFileSync(join(audio, "voice-master-manifest.json"), "utf8"));
const voices = JSON.parse(readFileSync(join(audio, "voices.json"), "utf8"));
const events = original.events as OriginalEvent[];
const reachable = events.filter(event => event.reachable !== false && event.index >= 2 && event.index <= 14);

const originalRows = events.map(event => ({
  id: event.id,
  index: event.index,
  reachable: reachable.includes(event),
  pcSpeakerWav: existsSync(join(assets, "original", `pc-speaker-${String(event.index).padStart(2, "0")}.wav`)),
  tandyVgm: existsSync(join(assets, "original", `tandy-${String(event.index).padStart(2, "0")}.vgm`)),
  tandyWav: existsSync(join(assets, "original", `tandy-${String(event.index).padStart(2, "0")}.wav`)),
  enhancedReplacement: event.enhancedFile ? existsSync(join(assets, "enhanced", event.enhancedFile)) : false,
  enhancedFallback: !event.enhancedFile,
}));

const queueNames = readdirSync(audio).filter(name => /generation-queue.*\.json$/i.test(name)).sort();
const queued = queueNames.flatMap(manifest => {
  const document = JSON.parse(readFileSync(join(audio, manifest), "utf8"));
  return (document.items as QueueItem[]).map((item, index) => {
    const output = resolve(root, item.output);
    const transcript = output.replace(/\.mp3$/i, ".txt");
    const mp3 = existsSync(output) && statSync(output).size > 0;
    const exactTranscript = existsSync(transcript) && readFileSync(transcript, "utf8") === `${item.text}\n`;
    return { id: item.id ?? `${manifest}#${index}`, manifest, output: relative(assets, output), mp3, exactTranscript };
  });
});

const unresolved = master.units.filter((unit: any) => !unit.generationEligible).map((unit: any) => ({
  id: unit.id,
  triggerSourceId: unit.triggerSourceId,
  spokenText: unit.spokenText,
  resolution: unit.resolution,
}));
const missingClassic = originalRows.filter(row => !row.pcSpeakerWav || !row.tandyVgm || !row.tandyWav);
const missingEnhanced = originalRows.filter(row => events.find(event => event.id === row.id)?.enhancedFile && !row.enhancedReplacement);
const missingNarration = queued.filter(item => !item.mp3 || !item.exactTranscript);
const dialogue = (voices.lines as any[]).map(line => ({
  id: line.id, file: line.file, status: line.status,
  exists: existsSync(join(assets, "voices", line.file)),
}));

const report = {
  schema: 1,
  generatedAt: new Date().toISOString(),
  classic: {
    events: events.length,
    reachableEvents: reachable.length,
    pcSpeakerAssets: originalRows.filter(row => row.pcSpeakerWav).length,
    tandyVgmAssets: originalRows.filter(row => row.tandyVgm).length,
    tandyWavAssets: originalRows.filter(row => row.tandyWav).length,
    missing: missingClassic,
  },
  enhancedEffects: {
    approvedReplacements: originalRows.filter(row => row.enhancedReplacement).length,
    faithfulFallbacks: originalRows.filter(row => row.reachable && row.enhancedFallback).map(row => row.id),
    missing: missingEnhanced,
  },
  narration: {
    sourceEvents: master.counts.sourceEvents,
    reviewedUnits: master.counts.narrationUnits,
    queuedRecordings: queued.length,
    completeRecordings: queued.filter(item => item.mp3 && item.exactTranscript).length,
    finiteVariantFamilies: master.counts.finiteRuntimeVariantFamilies,
    finiteVariantRecordings: master.counts.finiteRuntimeVariantAssets,
    staticSharedTriggerSelectors: master.staticSelectors.length,
    runtimeOnlyTextFallbacks: unresolved,
    missing: missingNarration,
  },
  dialogue: {
    generationOwner: "project-owner",
    authoredLines: dialogue.length,
    completeAssets: dialogue.filter(line => line.exists && line.status === "approved").length,
    missing: dialogue.filter(line => !line.exists),
  },
  originalEvents: originalRows,
};

const outputArgument = process.argv.find(argument => argument.startsWith("--output="))?.slice("--output=".length);
const json = `${JSON.stringify(report, null, 2)}\n`;
if (outputArgument) writeFileSync(resolve(outputArgument), json);
else process.stdout.write(json);
if (missingClassic.length || missingEnhanced.length || missingNarration.length) process.exitCode = 1;
