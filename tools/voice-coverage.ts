import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

interface InventoryLine { id: string; text: string; classification: string; suggestedDelivery: string; speaker: string | null;
  reviewStatus: string; assetStatus: string }
interface Selection { id: string; type: "dialogue" | "narration"; speaker: string; sourceId: string; status: string }
interface AssetLine { id: string; type: "dialogue" | "narration"; speaker: string; file: string; status: string }

const inventory = JSON.parse(readFileSync(new URL("../src/audio/voice-inventory.json", import.meta.url), "utf8")) as
  { lines: InventoryLine[] };
const plan = JSON.parse(readFileSync(new URL("../src/audio/voice-plan.json", import.meta.url), "utf8")) as
  { generationOwner: string; selections: Selection[] };
const manifest = JSON.parse(readFileSync(new URL("../src/audio/voices.json", import.meta.url), "utf8")) as
  { lines: AssetLine[] };
const dispositions = JSON.parse(readFileSync(new URL("../src/audio/voice-dispositions.json", import.meta.url), "utf8")) as
  { counts: Record<string, number> };
const voiceDirectory = resolve(process.env.POR_VOICE_DIR ?? "audio/voices");
const output = resolve(process.argv[2] ?? "out/voice-coverage.json");
mkdirSync(dirname(output), { recursive: true });

const assets = manifest.lines.map((line) => {
  const path = resolve(voiceDirectory, line.file);
  const exists = existsSync(path);
  const bytes = exists ? readFileSync(path) : undefined;
  return { ...line, exists, bytes: exists ? statSync(path).size : 0,
    sha256: bytes ? createHash("sha256").update(bytes).digest("hex") : null };
});
const selectedIds = new Set(plan.selections.map(({ sourceId }) => sourceId));
const classifications = Object.fromEntries([...new Set(inventory.lines.map(({ classification }) => classification))]
  .sort().map((classification) => [classification, inventory.lines.filter((line) => line.classification === classification).length]));
const suggestedDelivery = Object.fromEntries([...new Set(inventory.lines.map(({ suggestedDelivery }) => suggestedDelivery))]
  .sort().map((delivery) => [delivery, inventory.lines.filter((line) => line.suggestedDelivery === delivery).length]));
const speakers = Object.fromEntries([...new Set(plan.selections.map(({ speaker }) => speaker))].sort()
  .map((speaker) => [speaker, plan.selections.filter((line) => line.speaker === speaker).length]));
const types = Object.fromEntries(["dialogue", "narration"].map((type) =>
  [type, plan.selections.filter((line) => line.type === type).length]));

const report = {
  schema: 1,
  enhancedOnly: true,
  generationOwner: plan.generationOwner,
  sourceEntries: inventory.lines.length,
  selectedEntries: selectedIds.size,
  unselectedEntries: inventory.lines.length - selectedIds.size,
  dispositions: dispositions.counts,
  classifications,
  suggestedDelivery,
  selectedByType: types,
  selectedBySpeaker: speakers,
  finalAssets: assets.filter(({ status }) => status === "approved").length,
  prototypeAssets: assets.filter(({ status }) => status.startsWith("prototype-")).length,
  missingManifestAssets: assets.filter(({ exists }) => !exists).map(({ id, file }) => ({ id, file })),
  selections: plan.selections.map((selection) => ({ ...selection,
    manifestStatus: manifest.lines.find(({ id }) => id === selection.id)?.status ?? "not-recorded" })),
  assets
};
writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
console.log(`wrote voice coverage: ${report.selectedEntries}/${report.sourceEntries} selected, ` +
  `${report.finalAssets} final, ${report.prototypeAssets} prototype`);
