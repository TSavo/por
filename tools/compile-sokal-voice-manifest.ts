import { readFileSync, writeFileSync } from "node:fs";
import { basename } from "node:path";

interface ExtractionEvent { id: string; source: { archive: string; block: number; address: string; instruction: string } }
interface Extraction { events: ExtractionEvent[] }
interface QueueItem { output: string; text: string; direction: string }
interface Queue { model: string; items: QueueItem[] }
const extraction = JSON.parse(readFileSync(new URL("../src/audio/voice-review-extraction.json", import.meta.url), "utf8")) as Extraction;
const byAddress = new Map(extraction.events
  .filter(event => event.source.archive === "ECL4.DAX" && event.source.block === 21)
  .map(event => [event.source.address.slice(2), event]));
const initial: QueueItem[] = [
  { output: "audio/voices/narration/sokal-keep/ecl4-b21-9cf0.mp3", text: "YOU STAND BELOW THE ROTTING REMAINS OF THE ONCE-MIGHTY GATES OF SOKAL KEEP.", direction: "ominous, measured fantasy narration" },
  { output: "audio/voices/narration/sokal-keep/ecl4-b21-9d3a.mp3", text: "ECHOING FOOTSTEPS ARE DIMLY HEARD WITHIN THE KEEP. TO THE WEST RISES A MOUND OF REEDS.", direction: "quiet, ominous fantasy narration" },
  { output: "audio/voices/narration/sokal-keep/ecl4-b21-9dc9.mp3", text: "AN UNDEAD PATROL CONFRONTS YOU. DO YOU GIVE THE PASSWORD?", direction: "tense, ominous fantasy narration" },
  { output: "audio/voices/narration/sokal-keep/ecl4-b21-9eb8.mp3", text: "THE UNDEAD LEAVE.", direction: "brief, measured fantasy narration" },
  { output: "audio/voices/narration/sokal-keep/ecl4-b21-9ecc.mp3", text: "THEY DIDN'T LIKE THAT WORD.", direction: "dry, ominous fantasy narration" }
];
const queued = [1, 2, 3, 4].flatMap(index => {
  const queue = JSON.parse(readFileSync(new URL(`../src/audio/sokal-generation-queue-0${index}.json`, import.meta.url), "utf8")) as Queue;
  return queue.items;
});
const units = [...initial, ...queued].map(item => {
  const file = basename(item.output);
  const addresses = [...file.matchAll(/(?:^|-)([0-9a-f]{4})(?=-|\.|-menu)/g)].map(match => match[1]!);
  const sources = addresses.map(address => byAddress.get(address) ?? (() => { throw new Error(`Missing source ${address} for ${file}`); })());
  return {
    id: `por.narration.sokal.${file.replace(/\.mp3$/, "")}`,
    triggerSourceId: sources[0]!.id,
    coveredSourceIds: sources.map(source => source.id),
    asset: `voices/narration/sokal-keep/${file}`,
    text: item.text,
    direction: item.direction,
    model: "eleven_v4",
    playback: { attachOnlyToTrigger: true, queueAfterCurrentNarration: true },
    reviewStatus: "manually-reviewed"
  };
});
writeFileSync(new URL("../src/audio/sokal-voice-manifest.json", import.meta.url), `${JSON.stringify({
  schema: 1,
  area: "Sokal Keep",
  enhancedOnly: true,
  narratorVoiceId: "9UwacDmdjpXy5tUGJhDA",
  unitCount: units.length,
  units
}, null, 2)}\n`);
console.log(`wrote ${units.length} Sokal narration units`);
