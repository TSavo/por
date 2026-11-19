import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, formatInstruction, scriptFromBlock, type Instruction, type Operand } from "../src/lib/ecl.js";
import { findGameRoot, listGameFiles, readGameFile } from "./gamedata.js";

const gameData = findGameRoot(process.argv[2]);
if (!gameData) throw new Error("Supply the original game files or set POR_GAMEDATA");
const output = process.argv[3] ?? "src/audio/voice-review-extraction.json";
const textInstructions = new Set(["PRINT", "PRINTCLEAR", "PRINT RETURN", "ENCOUNTER MENU", "VERTICAL MENU", "HORIZONTAL MENU"]);
const hex = (value: number) => `0x${value.toString(16).padStart(4, "0")}`;
const operandPart = (instruction: Instruction, operand: Operand, operandIndex: number) => {
  if (operand.text !== null) return { operandIndex, kind: "literal", rawText: operand.text };
  if (operand.code === 0x81 && operand.word !== null) return { operandIndex, kind: "dynamic-string", address: hex(operand.word) };
  if (instruction.name === "PRINT" || instruction.name === "PRINTCLEAR") {
    if ((operand.code === 0x01 || operand.code === 0x03) && operand.word !== null)
      return { operandIndex, kind: "dynamic-value", address: hex(operand.word) };
    if (operand.code === 0x00) return { operandIndex, kind: "immediate-value", value: operand.low };
    if (operand.code === 0x02 && operand.word !== null) return { operandIndex, kind: "immediate-value", value: operand.word };
    return { operandIndex, kind: "unresolved-value", code: operand.code, word: operand.word };
  }
  return null;
};
const targets = (instruction: Instruction) => {
  if (instruction.name === "GOTO" || instruction.name === "GOSUB") return instruction.operands.slice(0, 1);
  if (instruction.name === "ON GOTO" || instruction.name === "ON GOSUB") return instruction.operands.slice(2);
  return [];
};

const events: unknown[] = [];
const blocks: unknown[] = [];
for (const name of listGameFiles(gameData).filter(name => /^ECL\d+\.DAX$/i.test(name)).sort()) {
  const archive = name.toUpperCase();
  for (const entry of parseDax(name, readGameFile(gameData, name)).entries) {
    const decoded = disassemble(scriptFromBlock(entry.data));
    const instructions = decoded.instructions;
    blocks.push({ archive, block: entry.id, instructionCount: instructions.length, decodeStop: decoded.stop });
    for (const [instructionIndex, instruction] of instructions.entries()) {
      if (!textInstructions.has(instruction.name)) continue;
      const parts = instruction.operands.map((operand, operandIndex) => operandPart(instruction, operand, operandIndex)).filter(part => part !== null);
      const address = hex(instruction.address);
      const id = `por.review.ecl-${archive.slice(3, -4)}.block-${entry.id}.at-${address.slice(2)}`;
      const rawLiteralText = parts.filter(part => part.kind === "literal").map(part => part.rawText).join("");
      const physicalPrevious = instructions[instructionIndex - 1];
      const physicalNext = instructions[instructionIndex + 1];
      const explicitTargets = targets(instruction).flatMap(operand => operand.word === null ? [] : [hex(operand.word)]);
      const sourceDigest = createHash("sha256").update(JSON.stringify({ archive, block: entry.id, address, name: instruction.name, parts })).digest("hex");
      events.push({
        id,
        source: { archive, block: entry.id, address, instruction: instruction.name, instructionIndex },
        outputParts: parts,
        rawLiteralText,
        normalizedText: rawLiteralText.replace(/\s+/g, " ").trim(),
        layout: {
          clearsTextBox: instruction.name === "PRINTCLEAR",
          appendsToExistingText: instruction.name === "PRINT",
          insertsReturn: instruction.name === "PRINT RETURN",
          leadingWhitespace: /^\s/.test(rawLiteralText),
          trailingWhitespace: /\s$/.test(rawLiteralText)
        },
        context: {
          physicalPrevious: physicalPrevious ? hex(physicalPrevious.address) : null,
          physicalNext: physicalNext ? hex(physicalNext.address) : null,
          fallthroughCandidate: instruction.next ? hex(instruction.next) : null,
          explicitTargets,
          nearbyInstructions: instructions.slice(Math.max(0, instructionIndex - 3), instructionIndex + 4).map(formatInstruction)
        },
        editorial: { sequenceId: null, boundaryDecision: "unreviewed", speakerId: null, characterId: null, notes: null },
        sourceDigest
      });
    }
  }
}

const manifest = {
  schema: 2,
  generatedFrom: "Original ECL text-producing instructions",
  policy: {
    extractionOnly: true,
    automatedJoinsForbidden: true,
    manualReviewRequired: true,
    physicalAdjacencyDoesNotImplyRuntimeOrder: true,
    rawTextIsAuthoritative: true
  },
  playbackContract: {
    audioAttachesOnlyToApprovedSequenceTrigger: true,
    coveredContinuationPrintsHaveNoAudioAttachment: true,
    audioContinuesWhilePlayerAdvancesCoveredPrints: true
  },
  blockCount: blocks.length,
  eventCount: events.length,
  blocks,
  events
};
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`wrote ${events.length} review events to ${output}`);

