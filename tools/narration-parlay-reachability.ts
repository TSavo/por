// #99. These are the three original 1.3 wilderness encounter scripts and their four voiced
// parlay outcomes. A reviewed script digest binds the control-flow proof to the actual program.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, readInstruction, scriptFromBlock } from "../src/lib/ecl.js";

const scripts = [
  { file: "ECL6.DAX", block: 25, gate: 0xa2ab, prints: [0xa2fe, 0xa34e, 0xa391, 0xa3d0], originalSha: "4dd2edbcda7346b8882c92ad773a55ad26d74ab9582d558ba898576fc769726e" },
  { file: "ECL7.DAX", block: 26, gate: 0xa2d3, prints: [0xa326, 0xa376, 0xa3b9, 0xa3f8], originalSha: "7aa5b5a25d98b6e89df0f01ccabe34171a1bae35930aef3b25db8444eb87f02c" },
  { file: "ECL8.DAX", block: 27, gate: 0xa093, prints: [0xa0e6, 0xa136, 0xa179, 0xa1b8], originalSha: "ef2fb536a18367c1db062a2212733a0149c5fa89051cce3c53dc2730d8f1fbe4" },
];
type Unit = { triggerSourceId: string; runtimeVariants?: { id: string; dynamicValue: string }[] };

export function unreachableParlayVariants(root: URL, units: Unit[], originalDirectory?: string) {
  const excluded = new Map<string, string>();
  const index = JSON.parse(readFileSync(new URL("game/content/scripts.json", root), "utf8")) as {
    records: {file: string; block: number; blob: {file: string; offset: number; length: number}}[];
  };
  for (const { file, block, gate, prints, originalSha } of scripts) {
    const record = index.records.find(entry => entry.file === file && entry.block === block);
    assert.ok(record);
    const { blob } = record;
    const bundled = readFileSync(new URL("game/" + blob.file, root)).subarray(blob.offset, blob.offset + blob.length);
    let bytes: Uint8Array = bundled;
    if (originalDirectory) {
      const original = parseDax(file, readFileSync(join(originalDirectory, file))).entries.find(entry => entry.id === block);
      assert.ok(original, `Original ${file} block ${block} is missing`);
      assert.ok(bundled.equals(original.data), `${file}:${block} differs between the original and bundled sources`);
      bytes = original.data;
    }
    assert.equal(createHash("sha256").update(bytes).digest("hex"), originalSha, `Review ${file}:${block} parlay control flow`);
    const script = scriptFromBlock(bytes);
    const { instructions } = disassemble(script);
    const at = (address: number) => readInstruction(script, address);
    const readFlag = instructions.filter(ins => ins.name === "GET TABLE" &&
      ins.operands[1]?.word === 0x4a00 && ins.operands[2]?.word === 0x9802);
    assert.equal(readFlag.length, 1);
    const table = readFlag[0]!.operands[0]!.word!;
    // If flag==0, go to battle; if flag==50, go directly to the greeting; otherwise PARLAY
    // and the roll choose one of the three scored replies. The greeting has one branch in.
    const start = instructions.findIndex(ins => ins.address === gate);
    assert.deepEqual(instructions.slice(start, start + 7).map(ins => ins.name), ["COMPARE", "IF =", "GOTO", "COMPARE", "IF =", "GOTO", "PARLAY"]);
    assert.deepEqual(instructions[start]!.operands.map(op => op.word ?? op.low), [0x9802, 0]);
    assert.deepEqual(instructions[start + 3]!.operands.map(op => op.word ?? op.low), [0x9802, 50]);
    assert.equal(instructions[start + 5]!.operands[0]!.word, prints[3]);
    assert.ok(instructions[start + 2]!.operands[0]!.word! < gate);
    assert.equal(instructions[start - 1]!.name, "EXIT");
    const greeting = prints[3]!;
    // Exclude an alternate script jump into a response past the flag test. The greeting
    // follows the attack branch's unconditional GOTO, so it cannot be reached by falling through.
    const greetingIndex = instructions.findIndex(ins => ins.address === greeting);
    assert.equal(instructions[greetingIndex - 1]!.name, "GOTO");
    for (const ins of instructions.filter(op => /^(ON )?GO(TO|SUB)$/.test(op.name))) {
      const destinations = ins.name.startsWith("ON ") ? ins.operands.slice(2) : ins.operands;
      for (const destination of destinations) {
        const target = destination.word!;
        if (target === greeting) assert.equal(ins.address, instructions[start + 5]!.address);
        if (target > gate && target <= greeting) assert.ok(ins.address >= gate && ins.address < greeting);
      }
    }
    for (const ins of instructions) {
      if (ins.name !== "SAVE" || !ins.operands[0]?.text || ins.operands[1]?.word !== 0x982c) continue;
      const actor = ins.operands[0].text;
      const setIndex = at(ins.next);
      assert.equal(setIndex.name, "SAVE");
      assert.equal(setIndex.operands[1]!.word, 0x4a00);
      const flag = script.byte(table + setIndex.operands[0]!.low);
      for (const [outcome, print] of prints.entries()) {
        const unit = units.find(u => u.triggerSourceId === `por.review.ecl-${file[3]}.block-${block}.at-${print.toString(16)}`);
        const variant = unit?.runtimeVariants?.find(v => v.dynamicValue === actor);
        if (!variant) continue;
        if (flag === 0 || (flag === 50) !== (outcome === 3)) {
          excluded.set(variant.id, `${file}:${block} actor "${actor}", table 0x${table.toString(16)} index ${setIndex.operands[0]!.low} = ${flag}, split at 0x${gate.toString(16)}`);
        }
      }
    }
  }
  return excluded;
}
