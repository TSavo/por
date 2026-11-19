import { writeFileSync } from "node:fs";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, scriptFromBlock } from "../src/lib/ecl.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const gameData = findGameRoot(process.argv[2]);
if (!gameData) throw new Error("Supply the path to the original game files or set POR_GAMEDATA");
const output = process.argv[3] ?? "src/audio/voice-inventory.json";

function suggestClassification(text: string) {
  const quotePositions = [...text].flatMap((character, index) => {
    if (character !== "'") return [];
    const before = text[index - 1] ?? "";
    const after = text[index + 1] ?? "";
    return /[A-Z]/.test(before) && /[A-Z]/.test(after) ? [] : [index];
  });
  if (quotePositions.length < 2) return { suggestedDelivery: "narrator-prose", deliveryConfidence: "medium" };
  const first = quotePositions[0]!;
  const last = quotePositions.at(-1)!;
  const before = text.slice(0, first).trim();
  const after = text.slice(last + 1).replace(/^[\s.!?,;:-]+/, "").trim();
  if (!before && !after) return { suggestedDelivery: "narrator-performed-quotation", deliveryConfidence: "medium" };
  return { suggestedDelivery: "narrator-with-quoted-character", deliveryConfidence: "medium" };
}

const lines = listGameFiles(gameData).filter((name) => /^ECL\d+\.DAX$/i.test(name)).sort().flatMap((name) => {
  const archive = name.toUpperCase();
  return parseDax(name, readGameFile(gameData, name)).entries.flatMap((entry) => {
    const decoded = disassemble(scriptFromBlock(entry.data));
    return decoded.instructions.flatMap((instruction) => {
      if (instruction.name !== "PRINT" && instruction.name !== "PRINTCLEAR") return [];
      return instruction.operands.flatMap((operand, operandIndex) => {
        const text = operand.text?.replace(/\s+/g, " ").trim();
        if (!text) return [];
        const address = instruction.address.toString(16).padStart(4, "0");
        return [{
          id: `por.voice.ecl-${archive.slice(3, -4)}.block-${entry.id}.at-${address}.operand-${operandIndex}`,
          enhancedOnly: true,
          source: { archive, block: entry.id, address: `0x${address}`, instruction: instruction.name, operand: operandIndex },
          text,
          classification: "unclassified",
          ...suggestClassification(text),
          speaker: null,
          conversation: null,
          reviewStatus: "needs-editorial-review",
          assetStatus: "not-requested"
        }];
      });
    });
  });
});

const manifest = {
  schema: 1,
  enhancedOnly: true,
  generatedFrom: "original ECL PRINT and PRINTCLEAR operands",
  generationPolicy: "Inventory and runtime preparation only. Character voice generation is handled separately by the project owner.",
  lineCount: lines.length,
  lines
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${lines.length} source-derived text entries to ${output}`);
