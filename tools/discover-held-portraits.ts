import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { disassemble, readEntryVector, scriptFromBlock, type Instruction, type Operand } from "../src/lib/ecl.js";
import { authoredScriptAddress } from "../src/runtime/bindings.js";
import { contentBytes, readGameData, type PictureRecord } from "../src/runtime/game-data.js";
import { portGameRoot } from "./gamedata.js";

const read = (path: string) => readFileSync(join(portGameRoot, path));
const data = readGameData(read);
if (data.manifest.gameVersion !== "1.3") throw new Error("This audit expects the bundled 1.3 scripts.");

const hex = (value: number) => value.toString(16).padStart(4, "0");
const literal = (op: Operand) => op.code === 0 ? op.low : op.code === 2 ? op.word : null;
const memory = (op: Operand) => op.code === 1 || op.code === 3 ? op.word : null;
const operand = (op: Operand) => ({ encoding: op.code, literal: literal(op), address: memory(op) });

const describePicture = (record: PictureRecord) => ({
  file: record.file,
  block: record.block,
  members: record.pictures.map(({ selector }, member) => ({ member, selector })),
});
const animated = data.pictures.filter(record => record.pictures.length > 1 && record.block !== undefined);

interface State {
  address: number;
  returns: readonly number[];
}

const stateKey = ({ address, returns }: State) => [address, ...returns].join(":");

function successors(state: State, instructions: ReadonlyMap<number, Instruction>): State[] {
  const { opcode, operands, next } = instructions.get(state.address)!;
  const { returns } = state;
  switch (opcode) {
    case 0x00: return []; // EXIT
    case 0x01: // GOTO
    case 0x02: // GOSUB
      return targets([operands[0]?.word], opcode === 0x02);
    case 0x13: { // RETURN
      const address = returns.at(-1);
      return address === undefined ? [] : [{ address, returns: returns.slice(0, -1) }];
    }
    case 0x25: // ON GOTO
    case 0x26: { // ON GOSUB
      const index = literal(operands[0]!);
      const options = operands.slice(2);
      if (index === null) return [...targets(options.map(op => op.word), opcode === 0x26), { address: next, returns }];
      const selected = options[index & 255];
      return selected ? targets([selected.word], opcode === 0x26) : [{ address: next, returns }];
    }
    default: {
      const following = instructions.get(next);
      // An IF either executes the next instruction or skips that instruction in full.
      if (opcode >= 0x16 && opcode <= 0x1b && following) {
        return [{ address: next, returns }, { address: following.next, returns }];
      }
      return [{ address: next, returns }];
    }
  }

  function targets(addresses: (number | null | undefined)[], call: boolean): State[] {
    // Re-entering the same call cannot establish a new return site. Do not unroll recursion.
    if (call && returns.includes(next)) return [];
    const stack = call ? [...returns, next] : returns;
    return addresses.flatMap(address => address == null ? [] : [{ address, returns: stack }]);
  }
}

function walk(
  roots: State[], instructions: ReadonlyMap<number, Instruction>,
  visit: (state: State, instruction: Instruction) => boolean,
) {
  const queue = [...roots];
  const seen = new Set<string>();
  while (queue.length) {
    const state = queue.pop()!;
    const instruction = instructions.get(state.address);
    const key = stateKey(state);
    if (!instruction || seen.has(key)) continue;
    seen.add(key);
    if (visit(state, instruction)) queue.push(...successors(state, instructions));
  }
}

const promptOperands = new Map([[0x15, 3], [0x2b, 2]]);
// These instructions can clear the panel, replace the picture, start combat, or leave the script.
const pictureBoundaries = new Set([0x0c, 0x0e, 0x20, 0x21, 0x24, 0x29, 0x2d, 0x31, 0x37, 0x38]);
const writers = new Set([0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x2a, 0x2f, 0x30]);
// These straight-line instructions can prepare a fight without choosing a new picture.
const combatPrelude = new Set([0x03, 0x04, 0x08, 0x09, 0x0b, 0x0d, 0x12, 0x17, 0x1b, 0x1c]);

const scripts = data.content.filter(record => /^ECL[1-8]\.DAX$/.test(record.file));
const eclCandidates = scripts.flatMap(record => {
  if (record.block === undefined) throw new Error(`Missing script block for ${record.file}`);
  const archive = Number(record.file[3]), scriptBlock = record.block;
  const pictureArchive = `PIC${archive}.DAX`;
  const authored = (address: number) => hex(authoredScriptAddress(archive, scriptBlock, address, "1.3"));
  const script = scriptFromBlock(contentBytes(record, read));
  const decoded = disassemble(script).instructions;
  const instructions = new Map(decoded.map(instruction => [instruction.address, instruction]));
  const contexts = new Map<number, State[]>();
  walk(readEntryVector(script).map(address => ({ address, returns: [] })), instructions, state => {
    const states = contexts.get(state.address) ?? [];
    states.push(state);
    contexts.set(state.address, states);
    return true;
  });

  function immediateCombatAfter(load: Instruction) {
    let previous = load;
    let current = instructions.get(load.next);
    while (current && combatPrelude.has(current.opcode)) {
      previous = current;
      current = instructions.get(current.next);
    }
    // A conditional immediately before COMBAT can skip the fight.
    return current?.opcode === 0x24 && !(previous.opcode >= 0x16 && previous.opcode <= 0x1b)
      ? authored(current.address) : null;
  }

  function selector(op: Operand) {
    const address = memory(op);
    const possibleWriters = address === null ? [] : decoded.flatMap(instruction => {
      const { opcode, operands } = instruction;
      if (!writers.has(opcode) || memory(operands.at(-1)!) !== address) return [];
      return [{
        address: authored(instruction.address), opcode, name: instruction.name,
        ...(opcode === 0x2a
          ? { tableAddress: operands[0]!.word, index: operand(operands[1]!) }
          : { inputs: operands.slice(0, -1).map(operand) }),
      }];
    });
    return { ...operand(op), possibleWriters };
  }

  return decoded.flatMap(load => {
    const { opcode, operands } = load;
    if (opcode !== 0x0e && opcode !== 0x0c && opcode !== 0x29) return [];
    const direct = opcode === 0x0e;
    const portrait = selector(operands[direct ? 0 : 2]!);
    const block = portrait.literal === null ? null : portrait.literal & 255;
    const possiblePictures = (block === null ? [] : animated.filter(picture =>
      picture.file === pictureArchive && picture.block === block)).map(describePicture);
    if (block !== null && !possiblePictures.length) return [];

    const scope = contexts.get(load.address) ?? [];
    const prompts = new Map<string, {
      address: string; next: string; caller: string | null; opcode: number; name: string; labels: string[];
    }>();
    const approaches = new Set<string>();
    function prompt(state: State, instruction: Instruction, firstLabel: number) {
      const address = authored(state.address);
      const ret = state.returns.at(-1);
      const caller = ret === undefined ? null : authored(ret);
      const labels = instruction.operands.slice(firstLabel, instruction.opcode === 0x29 ? 12 : undefined)
        .flatMap(op => op.text ? [op.text] : []);
      prompts.set(`${address}:${caller}`, {
        address, next: authored(instruction.next), caller, opcode: instruction.opcode, name: instruction.name, labels,
      });
    }
    if (opcode === 0x29) for (const state of scope) prompt(state, load, 9);
    walk(scope.flatMap(state => successors(state, instructions)), instructions, (state, instruction) => {
      if (pictureBoundaries.has(instruction.opcode)) return false;
      if (instruction.opcode === 0x0d) {
        if (direct) return false;
        approaches.add(authored(state.address));
      }
      const firstLabel = promptOperands.get(instruction.opcode);
      if (firstLabel !== undefined) prompt(state, instruction, firstLabel);
      return true;
    });

    return [{
      kind: "ecl", status: "candidate", scriptArchive: record.file, scriptBlock, address: authored(load.address),
      next: authored(load.next), opcode, name: load.name, pictureArchive, block, selector: portrait, possiblePictures,
      ...(direct ? {} : { approachSelectors: { sprite: selector(operands[0]!), distance: selector(operands[1]!) } }),
      approachSites: [...approaches].sort(),
      immediateCombat: scope.length && opcode === 0x0c ? immediateCombatAfter(load) : null,
      promptCandidates: [...prompts.values()].sort((a, b) => a.address.localeCompare(b.address) || (a.caller ?? "").localeCompare(b.caller ?? "")),
      uncertainties: [
        "selected-head-may-use-composed-portrait",
        ...(direct ? [] : ["portrait-requires-zero-distance-and-viewport-state"]),
        ...(block === null ? ["unresolved-picture-selector"] : []),
        ...(scope.length ? [] : ["no-local-entry-path-found"]),
      ],
    }];
  });
});

// Resident restore branches load PIC from the active bank. FINAL uses an argument
// from its caller and advances in its own timed loop, outside a held menu.
const nativeCandidates = [
  ...[{ address: "33fd", block: 29 }, { address: "347d", block: 1 }].map(({ address, block }) => ({
    kind: "native", status: "candidate", unit: "START.EXE", address, pictureArchive: "PIC<active-bank>.DAX", block,
    possiblePictures: animated.filter(record => /^PIC[1-8]\.DAX$/.test(record.file) && record.block === block).map(describePicture),
    uncertainties: ["runtime-bank", "resident-restore-may-repaint-an-existing-scene"],
  })),
  {
    kind: "native", status: "outside-held-menu", unit: "ovl18", address: "0047", pictureArchive: "FINAL<active-bank>.DAX",
    block: null, selector: "caller argument at BP+08h", loopAddress: "008e",
    possiblePictures: animated.filter(record => /^FINAL[1-8]\.DAX$/.test(record.file)).map(describePicture),
    uncertainties: ["runtime-bank", "unresolved-picture-selector"],
  },
  {
    kind: "native", status: "composed-portrait", unit: "START.EXE", address: "33c2", pictureArchive: "HEAD/BODY<active-bank>.DAX",
    block: null, selector: "resident head at 49fdh and body at 49feh", possiblePictures: [],
    uncertainties: ["runtime-bank"],
  },
];

const counts = {
  scripts: scripts.length,
  eclCandidates: eclCandidates.length,
  unresolvedEclSelectors: eclCandidates.filter(row => row.block === null).length,
  eclCandidatesWithPrompts: eclCandidates.filter(row => row.promptCandidates.length).length,
  nativeCandidates: nativeCandidates.filter(row => row.status === "candidate").length,
  nativeSequencesOutsideHeldMenus: nativeCandidates.filter(row => row.status === "outside-held-menu").length,
};
export const heldPortraitDiscovery = { schemaVersion: 1, dataVersion: data.manifest.gameVersion, counts, eclCandidates, nativeCandidates };

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify(heldPortraitDiscovery, null, 2));
}
