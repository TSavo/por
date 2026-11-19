import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

interface Annotation { text: string; direction: string }
interface Selection { id: string; type: string; speaker: string; sourceId: string; text: string;
  annotations: Annotation[]; status: string }
interface Plan { schema: number; provider: string; model: string;
  promptPolicy: { defaultSpeakerTag: string }; selections: Selection[] }

const plan = JSON.parse(readFileSync(new URL("../src/audio/voice-plan.json", import.meta.url), "utf8")) as Plan;
const output = process.argv[2] ?? "src/audio/fish-prompts.json";
const prompts = plan.selections.map((selection) => {
  const annotatedText = selection.annotations.map(({ text }) => text).join("");
  if (annotatedText !== selection.text) throw new Error(`${selection.id}: annotations do not reproduce the original text exactly`);
  for (const annotation of selection.annotations) {
    if (!annotation.text || !annotation.direction || /[\[\]]/.test(annotation.direction))
      throw new Error(`${selection.id}: invalid annotation`);
  }
  const prompt = `${plan.promptPolicy.defaultSpeakerTag}${selection.annotations
    .map(({ text, direction }) => `[${direction}] ${text}`).join("")}`;
  return {
    id: selection.id,
    type: selection.type,
    speaker: selection.speaker,
    sourceId: selection.sourceId,
    model: plan.model,
    prompt,
    spokenText: selection.text,
    spokenTextSha256: createHash("sha256").update(selection.text).digest("hex"),
    status: selection.status
  };
});
writeFileSync(output, `${JSON.stringify({ schema: 1, provider: plan.provider, model: plan.model,
  generatedFrom: "src/audio/voice-plan.json annotations", promptCount: prompts.length, prompts }, null, 2)}\n`);
console.log(`compiled ${prompts.length} annotated ${plan.model} prompts to ${output}`);
