import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, readEntryVector, scriptFromBlock, type Instruction, type Operand } from "../src/lib/ecl.js";
import { authoredScriptAddress } from "../src/runtime/bindings.js";
import { contentBytes, readGameData, type PictureRecord } from "../src/runtime/game-data.js";
import { findGameRoot, isPortGameRoot, portGameRoot, readGameFile } from "./gamedata.js";
import { fromPortRoot } from "./port-root.js";

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
// These instructions can prepare a fight without a new picture or player input.
const combatPrelude = new Set([0x01, 0x02, 0x03, 0x04, 0x08, 0x09, 0x0b, 0x0d, 0x12, 0x13, 0x16, 0x17, 0x18, 0x1b, 0x1c, 0x22, 0x23, 0x27, 0x2f, 0x3a, 0x3d]);
const valjevoPatrolDispatch = new Map<string, readonly number[]>([
  ["3:9d91", [0x9ddc, 0x9bf2, 0x9e79, 0x9c28, 0x9e79]],
  ["4:9ce6", [0x9d31, 0x9b5d, 0x9dd1, 0x9b7d, 0x9dd1]],
  ["6:a9e6", [0xaa31, 0x9c3e, 0xabd4, 0xa87d, 0xabd4]],
]);

interface UnreachablePromptProof {
  producer: string;
  prompt: string;
  scriptSha256: string;
  reason: string;
}

const lizardFaceToFaceProof = JSON.parse(readFileSync(fromPortRoot("qa", "held-portrait-unreachable.json"), "utf8")) as UnreachablePromptProof & {
  gogStartSha256: string;
  gogOverlaySha256: string;
  translatedRoutines: Record<string, string>;
  slums: {
    scriptSha256: string;
    bothSurprised: Omit<UnreachablePromptProof, "scriptSha256">;
    angryParlay: { producer: string; entry: string; reason: string };
  };
};
const slumsProof = lizardFaceToFaceProof.slums;
const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function lizardFaceToFaceUnreachable(script: Uint8Array, instructions: ReadonlyMap<number, Instruction>): boolean {
  const proof = lizardFaceToFaceProof;
  if (proof.producer !== "ECL7.DAX:26:a26c" || proof.prompt !== "a28c" || digest(script) !== proof.scriptSha256) return false;

  // ovl03:175f assigns 3, then 1769 repeats the unchanged comparison and 1778 replaces it with 2.
  // PARTY SURPRISE initializes the encounter result to 0 or 1. ENCOUNTER MENU only writes 0–3,
  // so the preceding a230 dispatch cannot fall through. The other entry is a14a's fourth branch.
  const dispatch = instructions.get(0xa14a);
  const preceding = instructions.get(0xa230);
  if (dispatch?.opcode !== 0x25 || memory(dispatch.operands[0]!) !== 0x6dcb || dispatch.operands[5]?.word !== 0xa242 ||
      preceding?.opcode !== 0x25 || memory(preceding.operands[0]!) !== 0x6e79 || literal(preceding.operands[1]!) !== 4) return false;

  return matchesSurpriseProof("ECL7.DAX", 26, proof.scriptSha256);
}

function slumsAngryMenuProven(instructions: ReadonlyMap<number, Instruction>): boolean {
  const menu = instructions.get(0x9cc5);
  const preceding = instructions.get(0x9cef);
  return menu?.opcode === 0x29 && memory(menu.operands[3]!) === 0x9802 &&
    [0, 0, 0, 1, 0].every((action, index) => literal(menu.operands[index + 4]!) === action) &&
    preceding?.opcode === 0x25 && memory(preceding.operands[0]!) === 0x9802 && literal(preceding.operands[1]!) === 4 &&
    [0xb250, 0xb157, 0xb225, 0xb254].every((target, index) => preceding.operands[index + 2]?.word === target);
}

function slumsBothSurprisedUnreachable(instructions: ReadonlyMap<number, Instruction>): boolean {
  const proof = slumsProof.bothSurprised;
  const surprise = instructions.get(0x9c08);
  const comparison = instructions.get(0x9c74);
  const branch = instructions.get(0x9c7b);
  const encounter = instructions.get(0x9d1d);
  // The pinned script enters 9d01 only when the result of SURPRISE is 3. The four
  // jump-table targets consume every result from the preceding encounter menu.
  return proof.producer === "ECL2.DAX:20:9d1d" && proof.prompt === "9d40" &&
    surprise?.opcode === 0x23 &&
    comparison?.opcode === 0x03 && memory(comparison.operands[0]!) === 0x6dcb && literal(comparison.operands[1]!) === 3 &&
    instructions.get(0x9c7a)?.opcode === 0x16 && branch?.opcode === 0x01 && branch.operands[0]?.word === 0x9d01 &&
    encounter?.opcode === 0x29 && encounter.next === 0x9d40;
}

function matchesSurpriseProof(file: string, blockId: number, scriptSha256: string): boolean {
  const proof = lizardFaceToFaceProof;
  const source = readFileSync(fromPortRoot("src", "translated-1.3", "ovl03.ts"), "utf8").replace(/\r\n/g, "\n");
  for (const offset of ["0e5e", "1629", "16c9", "18f8", "1ef8", "2f2d"]) {
    const routine = source.split("export function ovl03_" + offset + "(")[1]?.split("\n}\n")[0];
    if (!routine || digest(routine) !== proof.translatedRoutines[offset]) return false;
  }

  // The record pins the original release. Where external game files are selected, check those too.
  const original = findGameRoot();
  if (!original) return false;
  if (isPortGameRoot(original)) return true;
  try {
    const block = parseDax(file, readGameFile(original, file)).entries.find(entry => entry.id === blockId);
    return block !== undefined && digest(scriptFromBlock(block.data).bytes) === scriptSha256 &&
      digest(readGameFile(original, "START.EXE")) === proof.gogStartSha256 &&
      digest(readGameFile(original, "GAME.OVR")) === proof.gogOverlaySha256;
  } catch {
    return false;
  }
}

function lizardPoolRetainedMenu(instructions: ReadonlyMap<number, Instruction>, roots: State[]) {
  // The pool's javelin setup draws PIC8:57. The damage and surprise checks
  // either leave for ab3a or reach aaf5 with that same close picture.
  const route = [
    [0xaa75, 0x0c], [0xaa7c, 0x12], [0xaab7, 0x3a], [0xaab8, 0x2e],
    [0xaac4, 0x2f], [0xaacd, 0x16], [0xaace, 0x01], [0xaad2, 0x22],
    [0xaad9, 0x23], [0xaae4, 0x03], [0xaaea, 0x16], [0xaaeb, 0x01],
    [0xaaef, 0x09], [0xaaf5, 0x29], [0xab2e, 0x25],
  ] as const;
  if (!route.every(([address, opcode], index) => {
    const step = instructions.get(address);
    const next = route[index + 1]?.[0];
    return step?.opcode === opcode && (next === undefined || step.next === next);
  })) return undefined;

  const setup = instructions.get(0xaa75)!;
  const menu = instructions.get(0xaaf5)!;
  const preserveState = instructions.get(0xaaef)!;
  if (![57, 0, 57].every((value, index) =>
    literal(setup.operands[index]!) === value && literal(menu.operands[index]!) === value) ||
    [0xaace, 0xaaeb].some(address => instructions.get(address)?.operands[0]?.word !== 0xab3a) ||
    literal(preserveState.operands[0]!) !== 2 || memory(preserveState.operands[1]!) !== 0x6dcb ||
    memory(menu.operands[3]!) !== 0x6e82 ||
    !menu.operands.slice(4, 9).every(op => literal(op) === 2) ||
    menu.operands[9]?.text !== "THEY TURN TO DIVE BACK IN THE WATER." ||
    !menu.operands.slice(10, 12).every(op => op.text === "") ||
    !menu.operands.slice(12).every(op => literal(op) === 0)) return undefined;

  // Keep the menu as a separate candidate if any entry reaches it without the setup.
  let bypassesSetup = false;
  walk(roots, instructions, state => {
    if (state.address === menu.address) bypassesSetup = true;
    return !bypassesSetup && state.address !== setup.address;
  });
  return bypassesSetup ? undefined : menu;
}

const scripts = data.content.filter(record => /^ECL[1-8]\.DAX$/.test(record.file));
const eclCandidates = scripts.flatMap(record => {
  if (record.block === undefined) throw new Error(`Missing script block for ${record.file}`);
  const archive = Number(record.file[3]), scriptBlock = record.block;
  const pictureArchive = `PIC${archive}.DAX`;
  const authored = (address: number) => hex(authoredScriptAddress(archive, scriptBlock, address, "1.3"));
  const script = scriptFromBlock(contentBytes(record, read));
  const decoded = disassemble(script).instructions;
  const instructions = new Map(decoded.map(instruction => [instruction.address, instruction]));
  const faceToFaceUnreachable = archive === 7 && scriptBlock === 26 &&
    lizardFaceToFaceUnreachable(script.bytes, instructions);
  const slumsAngryDispatchProven = archive === 2 && scriptBlock === 20 &&
    digest(script.bytes) === slumsProof.scriptSha256 && slumsAngryMenuProven(instructions) &&
    matchesSurpriseProof("ECL2.DAX", 20, slumsProof.scriptSha256);
  const bothSurprisedUnreachable = slumsAngryDispatchProven && slumsBothSurprisedUnreachable(instructions);
  const roots = readEntryVector(script).map(address => ({ address, returns: [] }));
  const poolMenu = archive === 8 && scriptBlock === 16 ? lizardPoolRetainedMenu(instructions, roots) : undefined;
  const contexts = new Map<number, State[]>();
  walk(roots, instructions, state => {
    const states = contexts.get(state.address) ?? [];
    states.push(state);
    contexts.set(state.address, states);
    return true;
  });

  function immediateCombatAfter(load: Instruction) {
    // The first throne fight initializes four guest actors before COMBAT.
    // The counter starts at 6e3e, increments by one, and stops at 6e3e + 4.
    // Normal cycle rejection stays in place for every other script path.
    if (archive === 8 && scriptBlock === 13 && load.address === 0xa0f8) {
      const scopeHash = "819101ec8175ed0b41f31e856d00d553103434730bdaa3a48b3346decd521ad5";
      const signature = (candidate: typeof script) =>
        digest(candidate.bytes.subarray(0xa0f8 - candidate.base, 0xa14b - candidate.base));
      const original = findGameRoot();
      if (signature(script) === scopeHash && original) {
        if (isPortGameRoot(original)) return { address: "a14a", resume: "a14b" };
        try {
          const block = parseDax(record.file, readGameFile(original, record.file)).entries.find(entry => entry.id === scriptBlock);
          if (block && signature(scriptFromBlock(block.data)) === scopeHash) return { address: "a14a", resume: "a14b" };
        } catch {
          // An unavailable or different external block cannot establish this path.
        }
      }
    }
    const results = new Map<string, number | null>();
    function fightFrom(state: State): number | null {
      const key = stateKey(state);
      const cached = results.get(key);
      if (cached !== undefined) return cached;
      const current = instructions.get(state.address);
      if (current?.opcode === 0x24) return current.address;
      // Some pre-battle speeches repeat the same close encounter setup before
      // loading the combat roster. The paint trace still decides which picture drew.
      const sameCloseEncounter = current?.opcode === 0x0c && load.opcode === 0x0c &&
        literal(load.operands[0]!) !== null && literal(current.operands[0]!) === literal(load.operands[0]!) &&
        literal(load.operands[1]!) === 0 && literal(current.operands[1]!) === 0;
      if (!current || (!combatPrelude.has(current.opcode) && !sameCloseEncounter)) return null;
      // Re-entering an active state leaves an unproven route to the fight.
      results.set(key, null);
      const [next, ...alternatives] = successors(state, instructions);
      const fight = next ? fightFrom(next) : null;
      if (fight === null || !alternatives.every(branch => fightFrom(branch) === fight)) return null;
      results.set(key, fight);
      return fight;
    }
    const fight = fightFrom({ address: load.next, returns: [] });
    return fight === null ? undefined : { address: authored(fight), resume: authored(instructions.get(fight)!.next) };
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

  function podalPatrolPictureBlocks(address: number, portrait: ReturnType<typeof selector>) {
    if (archive !== 1 || scriptBlock !== 18 || address !== 0x9d86 || portrait.address !== 0x4a02 ||
        portrait.possibleWriters.length !== 1 || portrait.possibleWriters[0]?.address !== "9fa6") return undefined;

    // The patrol helper rolls 0 through 8, then reads the patrol type and picture block in order.
    const roll = instructions.get(0x9f86);
    const reset = roll && instructions.get(roll.next);
    const types = reset && instructions.get(reset.next);
    const names = types && instructions.get(types.next);
    const pictures = names && instructions.get(names.next);
    const tableIs = (instruction: Instruction | undefined, table: number, index: number, output: number) =>
      instruction?.opcode === 0x2a && memory(instruction.operands[0]!) === table &&
      memory(instruction.operands[1]!) === index && memory(instruction.operands[2]!) === output;
    if (roll?.opcode !== 0x08 || literal(roll.operands[0]!) !== 8 || memory(roll.operands[1]!) !== 0x6e79 ||
        reset?.opcode !== 0x09 || literal(reset.operands[0]!) !== 0 || memory(reset.operands[1]!) !== 0x4a03 ||
        !tableIs(types, 0xb260, 0x6e79, 0x4a04) || !tableIs(names, 0xb27b, 0x4a04, 0x4a0b) ||
        !tableIs(pictures, 0xb269, 0x4a04, 0x4a02) ||
        !script.inRange(0xb260 + 8)) return undefined;
    const indices = Array.from({ length: 9 }, (_, index) => script.byte(0xb260 + index));
    if (!indices.every(index => index < 0xb275 - 0xb269 && script.inRange(0xb269 + index))) return undefined;
    return [...new Set(indices.map(index => script.byte(0xb269 + index)))].sort((a, b) => a - b);
  }

  function slumsRoamingPictureBlocks(address: number, portrait: ReturnType<typeof selector>) {
    const menus = [0x9c1e, 0x9cc5, 0x9d1d, 0x9d7e, 0x9dde];
    if (archive !== 2 || scriptBlock !== 20 || !menus.includes(address) || portrait.address !== 0x6e80 ||
        portrait.possibleWriters.length !== 1 || portrait.possibleWriters[0]?.address !== "9bd9") return undefined;

    // The roaming party roll selects the caption, sprite and portrait from parallel tables.
    const index = 0x6e7f;
    const roll = instructions.get(0x9b8a);
    const dispatch = roll && instructions.get(roll.next);
    const read = instructions.get(0x9bd9);
    const table = 0xb6e6;
    const nameTargets = [0x9b9f, 0x9bb1, 0x9bc3];
    if (roll?.opcode !== 0x08 || literal(roll.operands[0]!) !== 2 || memory(roll.operands[1]!) !== index ||
        dispatch?.opcode !== 0x25 || memory(dispatch.operands[0]!) !== index ||
        literal(dispatch.operands[1]!) !== 3 ||
        !nameTargets.every((target, i) => dispatch.operands[i + 2]?.word === target) ||
        read?.opcode !== 0x2a || memory(read.operands[0]!) !== table || memory(read.operands[1]!) !== index ||
        memory(read.operands[2]!) !== portrait.address || !script.inRange(table + 2)) return undefined;

    const [kobolds, goblins, orcs] = nameTargets.map(target => instructions.get(target));
    if (kobolds?.opcode !== 0x09 || goblins?.opcode !== 0x09 || orcs?.opcode !== 0x09) return undefined;
    const returns = [instructions.get(kobolds.next), instructions.get(goblins.next)];
    if (returns.some(jump => jump?.opcode !== 0x01 || jump.operands[0]?.word !== 0x9bcf) ||
        orcs.next !== 0x9bcf || instructions.get(0x9bcf)?.next !== read.address) return undefined;
    const protectedEntries = new Set([dispatch.address, ...nameTargets, 0x9bcf, read.address]);
    if (readEntryVector(script).some(entry => protectedEntries.has(entry)) ||
        decoded.some(instruction => [0x01, 0x02, 0x25, 0x26].includes(instruction.opcode) &&
          instruction !== dispatch && !returns.includes(instruction) &&
          instruction.operands.slice(instruction.opcode <= 0x02 ? 0 : 2)
            .some(operand => operand.word != null && protectedEntries.has(operand.word)))) return undefined;

    return [...new Set([0, 1, 2].map(member => script.byte(table + member)))].sort((a, b) => a - b);
  }

  // Scripted encounters call the patrol helper only to fetch monster data. The
  // caller sets the return flag and the helper exits before either roaming menu.
  function valhingenReturnsBeforePatrolMenu(address: number, caller: number | undefined) {
    if (archive !== 4 || scriptBlock !== 10 || caller === undefined || ![0xb4e9, 0xb549].includes(address)) {
      return false;
    }
    const call = decoded.find(instruction => instruction.next === caller);
    if (call?.opcode !== 0x02 || call.operands[0]?.word !== 0xb420) return false;
    const flag = 0x6e7e;
    const setFlag = decoded.find(instruction => instruction.next === call.address);
    if (setFlag?.opcode !== 0x09 || literal(setFlag.operands[0]!) !== 1 || memory(setFlag.operands[1]!) !== flag) return false;

    let step = instructions.get(0xb420);
    while (step?.opcode === 0x2a && memory(step.operands[2]!) !== flag) step = instructions.get(step.next);
    if (step?.address !== 0xb448 || step.opcode !== 0x03 || memory(step.operands[0]!) !== flag ||
        literal(step.operands[1]!) !== 1) return false;
    const condition = instructions.get(step.next);
    return condition?.opcode === 0x16 && instructions.get(condition.next)?.opcode === 0x13;
  }

  function valhingenPatrolPictureBlocks(address: number, portrait: ReturnType<typeof selector>) {
    if (archive !== 4 || scriptBlock !== 10 || ![0xb4e9, 0xb549].includes(address) || portrait.address !== 0x6e7d) {
      return undefined;
    }
    const lookup = instructions.get(0xb43e);
    if (lookup?.opcode !== 0x2a || memory(lookup.operands[0]!) !== 0xb6e2 ||
        memory(lookup.operands[1]!) !== 0x6e81 || memory(lookup.operands[2]!) !== portrait.address ||
        readEntryVector(script).includes(0xb420) || instructions.get(0xb41f)?.opcode !== 0x00) return undefined;

    const entries = decoded.filter(instruction => [0x01, 0x02, 0x25, 0x26].includes(instruction.opcode) &&
      instruction.operands.slice(instruction.opcode <= 0x02 ? 0 : 2).some(operand => operand.word === 0xb420));
    const roaming = entries.filter(instruction => !valhingenReturnsBeforePatrolMenu(address, instruction.next));
    const indices: number[] = [];
    for (const entry of roaming) {
      const selection = decoded.find(instruction => instruction.next === entry.address);
      const index = selection && literal(selection.operands[0]!);
      if (entry.opcode !== 0x01 || selection?.opcode !== 0x09 || memory(selection.operands[1]!) !== 0x6e81 ||
          index == null || index < 0 || index > 2 || !script.inRange(0xb6e2 + index)) return undefined;
      indices.push(index);
    }
    if (indices.length !== 3 || new Set(indices).size !== 3) return undefined;
    return [...new Set(indices.map(index => script.byte(0xb6e2 + index)))].sort((a, b) => a - b);
  }

  function tyrmorPrisonPictures(address: number, portrait: ReturnType<typeof selector>) {
    const menus = [0xa264, 0xa2c7, 0xa2fd];
    if (archive !== 7 || scriptBlock !== 22 || address !== 0x9cf3 && !menus.includes(address) ||
        portrait.address !== 0x9800 || portrait.possibleWriters.length !== 1 ||
        portrait.possibleWriters[0]?.address !== "a3dd") return undefined;

    const indexSlot = 0x6e7f;
    const pictureTable = 0xa59a;
    const menuTable = 0xa5f5;
    const headTable = 0xa602;
    const tableIs = (at: number, table: number, slot: number) => {
      const read = instructions.get(at);
      return read?.opcode === 0x2a && memory(read.operands[0]!) === table &&
        memory(read.operands[1]!) === indexSlot && memory(read.operands[2]!) === slot;
    };
    if (!tableIs(0xa3dd, pictureTable, 0x9800) || !tableIs(0xa419, menuTable, 0x9806) ||
        !tableIs(0xa437, headTable, 0x6de1)) return undefined;

    // Guard the entries which carry a value into the selector or enter a menu with that value.
    const entrySources = new Map<number, number[]>([
      [0x9cef, []], [0x9cf3, []], [0xa1c4, [0xa3d9]], [0xa1cb, []], [0xa1db, []], [0xa213, []],
      [0xa264, [0xa213]], [0xa2c7, [0xa213]], [0xa2fd, [0xa213]], [0xa3dd, [0x9cef, 0xa1db]],
    ]);
    if (readEntryVector(script).some(entry => entrySources.has(entry))) return undefined;
    for (const [target, expected] of entrySources) {
      const incoming = decoded.filter(({ opcode, operands }) => [0x01, 0x02, 0x25, 0x26].includes(opcode) &&
        operands.slice(opcode <= 0x02 ? 0 : 2).some(operand => operand.word === target));
      if (incoming.length !== expected.length || incoming.some(entry => !expected.includes(entry.address))) return undefined;
    }

    const resetsHead = (at: number) => {
      const reset = instructions.get(at);
      return reset?.opcode === 0x09 && literal(reset.operands[0]!) === 0xff && memory(reset.operands[1]!) === 0x6de1;
    };
    const callsSelector = (at: number, next: number) => {
      const call = instructions.get(at);
      return call?.opcode === 0x02 && call.next === next && call.operands[0]?.word === 0xa3dd;
    };
    let indices: number[];
    let headReset: number;
    if (address === 0x9cf3) {
      // The scripted priest enters with index 6. He does not draw from the roaming pool.
      const priest = instructions.get(0x9ce9);
      if (priest?.opcode !== 0x09 || literal(priest.operands[0]!) !== 6 || memory(priest.operands[1]!) !== indexSlot ||
          priest.next !== 0x9cef || !callsSelector(0x9cef, address) || !resetsHead(0x9d3b)) return undefined;
      indices = [6];
      headReset = 0x9d3b;
    } else {
      const roamingRoll = (at: number) => {
        const roll = instructions.get(at);
        return roll?.opcode === 0x08 && literal(roll.operands[0]!) === 5 && memory(roll.operands[1]!) === indexSlot;
      };
      const move = instructions.get(0xa3d9);
      const zone = instructions.get(0xa1cb);
      const condition = instructions.get(0xa1d1);
      const bump = instructions.get(0xa1d2);
      const dispatch = instructions.get(0xa213);
      if (!roamingRoll(0xa1a8) || !roamingRoll(0xa3ba) || move?.opcode !== 0x01 || move.operands[0]?.word !== 0xa1c4 ||
          zone?.opcode !== 0x03 || memory(zone.operands[0]!) !== 0xc04c || literal(zone.operands[1]!) !== 8 ||
          condition?.name !== "IF <" || condition.next !== 0xa1d2 ||
          bump?.opcode !== 0x04 || literal(bump.operands[0]!) !== 7 || memory(bump.operands[1]!) !== indexSlot ||
          memory(bump.operands[2]!) !== indexSlot || bump.next !== 0xa1db || !callsSelector(0xa1db, 0xa1df) ||
          dispatch?.opcode !== 0x25 || memory(dispatch.operands[0]!) !== 0x9806 ||
          literal(dispatch.operands[1]!) !== menus.length ||
          !menus.every((menu, index) => dispatch.operands[index + 2]?.word === menu) || !resetsHead(0xa32f)) return undefined;

      // Both roaming rolls are inclusive 0–5. The northern half offsets that result by seven.
      // The menu class excludes the rows which select one of the two other roamer menus.
      const roaming = [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12];
      if (roaming.some(index => !script.inRange(menuTable + index))) return undefined;
      indices = roaming.filter(index => script.byte(menuTable + index) === menus.indexOf(address));
      headReset = 0xa32f;
    }

    if (!indices.length || indices.some(index => !script.inRange(pictureTable + index) || !script.inRange(headTable + index))) return undefined;
    const blocks = [...new Set(indices.map(index => script.byte(pictureTable + index)))].sort((a, b) => a - b);
    const compositions = indices.flatMap(index => {
      const head = script.byte(headTable + index);
      return head === 0xff ? [] : [{
        source: `HEAD7.DAX:${head}:BODY7.DAX:${script.byte(pictureTable + index)}`,
        headWrite: "a437", headSlot: "6de1", bodyOperand: 2, headReset: authored(headReset),
      }];
    });
    // These exact pools each use all plain PICs or all composed portraits.
    if (compositions.length && compositions.length !== indices.length) return undefined;
    return { blocks, compositions: [...new Map(compositions.map(entry => [entry.source, entry])).values()] };
  }

  function nomadComposition(address: number) {
    if (archive !== 7 || scriptBlock !== 17) return undefined;
    if (address === 0x9dce) {
      // Samir's SETUP MONSTER composes the guard before the first delay.
      const head = instructions.get(0x9dc8);
      const setup = instructions.get(address);
      const call = instructions.get(0xa98a);
      if (head?.opcode !== 0x09 || head.next !== address ||
          literal(head.operands[0]!) !== 61 || memory(head.operands[1]!) !== 0x6de1 ||
          setup?.opcode !== 0x0c || literal(setup.operands[2]!) !== 30 ||
          call?.opcode !== 0x02 || call.operands[0]?.word !== head.address) return undefined;
      return { source: "HEAD7.DAX:61:BODY7.DAX:30", headWrite: authored(head.address), headSlot: "6de1",
        bodyOperand: 2 };
    }
    if (address === 0xb23c) {
      // The headman addresses the party after the refused alliance and the fight.
      const head = instructions.get(0xb236);
      const picture = instructions.get(address);
      const reset = picture && instructions.get(picture.next);
      if (head?.opcode !== 0x09 || head.next !== address ||
          literal(head.operands[0]!) !== 74 || memory(head.operands[1]!) !== 0x6de1 ||
          picture?.opcode !== 0x0e || literal(picture.operands[0]!) !== 30 ||
          reset?.opcode !== 0x09 || literal(reset.operands[0]!) !== 0xff ||
          memory(reset.operands[1]!) !== 0x6de1) return undefined;
      return { source: "HEAD7.DAX:74:BODY7.DAX:30", headWrite: authored(head.address), headSlot: "6de1",
        bodyOperand: 0, headReset: authored(reset.address) };
    }
    if (address !== 0xa213 && address !== 0xa33c) return undefined;

    // The second APPROACH composes the sentry. The families passage and the
    // following zero-distance menu retain that composition.
    const route = [
      [0xa20d, 0x09], [0xa213, 0x0c], [0xa21a, 0x12], [0xa285, 0x02], [0xa289, 0x12],
      [0xa2e4, 0x02], [0xa2e8, 0x12], [0xa338, 0x02], [0xa33c, 0x29], [0xa37e, 0x09],
    ] as const;
    if (!route.every(([at, opcode], index) => {
      const instruction = instructions.get(at);
      const next = route[index + 1]?.[0];
      return instruction?.opcode === opcode && (next === undefined || instruction.next === next);
    })) return undefined;
    const head = instructions.get(0xa20d)!;
    const setup = instructions.get(0xa213)!;
    const menu = instructions.get(0xa33c)!;
    const reset = instructions.get(0xa37e)!;
    if (literal(head.operands[0]!) !== 61 || memory(head.operands[1]!) !== 0x6de1 ||
        literal(setup.operands[0]!) !== 11 || literal(setup.operands[1]!) !== 2 ||
        literal(setup.operands[2]!) !== 30 || literal(menu.operands[0]!) !== 11 ||
        literal(menu.operands[1]!) !== 0 || literal(menu.operands[2]!) !== 30 ||
        literal(reset.operands[0]!) !== 0xff || memory(reset.operands[1]!) !== 0x6de1 ||
        instructions.get(0xa285)?.operands[0]?.word !== 0x9dd5 ||
        instructions.get(0xa2e4)?.operands[0]?.word !== 0x9dd5 ||
        instructions.get(0xa338)?.operands[0]?.word !== 0x9d7f ||
        instructions.get(0x9dd5)?.opcode !== 0x3a || instructions.get(0x9dd6)?.opcode !== 0x0d ||
        instructions.get(0x9dd7)?.opcode !== 0x13 || instructions.get(0x9d7f)?.opcode !== 0x2b ||
        instructions.get(0x9da2)?.opcode !== 0x12 || instructions.get(0x9da6)?.opcode !== 0x13) return undefined;
    return { source: "HEAD7.DAX:61:BODY7.DAX:30", headWrite: authored(head.address), headSlot: "6de1",
      bodyOperand: 2, headReset: authored(reset.address) };
  }

  return decoded.flatMap(load => {
    if (load.address === poolMenu?.address) return [];
    const { opcode, operands } = load;
    if (opcode !== 0x0e && opcode !== 0x0c && opcode !== 0x29) return [];
    const direct = opcode === 0x0e;
    const portrait = selector(operands[direct ? 0 : 2]!);
    const block = portrait.literal === null ? null : portrait.literal & 255;
    const tyrmorPictures = tyrmorPrisonPictures(load.address, portrait);
    const boundedBlocks = podalPatrolPictureBlocks(load.address, portrait) ?? valhingenPatrolPictureBlocks(load.address, portrait) ??
      slumsRoamingPictureBlocks(load.address, portrait) ?? tyrmorPictures?.blocks;
    const pictureBlocks = block === null ? boundedBlocks ?? [] : [block];
    const possiblePictures = animated.filter(picture => picture.file === pictureArchive &&
      picture.block !== undefined && pictureBlocks.includes(picture.block)).map(describePicture);
    if (block !== null && !possiblePictures.length) return [];

    const scope = (contexts.get(load.address) ?? []).filter(state =>
      !valhingenReturnsBeforePatrolMenu(load.address, state.returns.at(-1)));
    const feastHead = instructions.get(0xa7a2);
    const feastReset = instructions.get(load.next);
    const nomadFeast = archive === 7 && scriptBlock === 17 && load.address === 0xa7a8 && direct && block === 30 &&
      feastHead?.opcode === 0x09 && feastHead.next === load.address &&
      literal(feastHead.operands[0]!) === 74 && memory(feastHead.operands[1]!) === 0x6de1 &&
      feastReset?.opcode === 0x09 && literal(feastReset.operands[0]!) === 0xff &&
      memory(feastReset.operands[1]!) === 0x6de1;
    // The guest resumes the feast after the timed camp and scripted relocation.
    // Start at the witnessed fixed composition to trace its local holds.
    if (nomadFeast && !scope.length) scope.push({ address: load.address, returns: [] });
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
    // This rest interruption acknowledges DAMAGE before the sprite is turned off.
    // Other DAMAGE instructions still need their own observed prompt evidence.
    if (archive === 8 && scriptBlock === 13 && load.address === 0xb460 && opcode === 0x0c) {
      const warning = instructions.get(load.next);
      const damage = warning && instructions.get(warning.next);
      if (warning?.opcode === 0x12 && warning.operands[0]?.text === "KOBOLDS APPEAR AND BOMBARD YOU WITH ROCKS." &&
          damage?.opcode === 0x2e && damage.next === 0xb495 && instructions.get(damage.next)?.opcode === 0x31 &&
          [7, 1, 4, 1, 50].every((value, index) => literal(damage.operands[index]!) === value)) {
        prompt({ address: damage.address, returns: [] }, damage, damage.operands.length);
      }
    }

    // The native encounter handler writes only 0–3. These patrols branch
    // on all four, so their hostile menus cannot fall into the disguise route.
    const patrolDispatch = archive === 5 && opcode === 0x29
      ? valjevoPatrolDispatch.get(`${scriptBlock}:${authored(load.address)}`) : undefined;
    const headReset = instructions.get(load.next);
    const resultBranch = headReset?.opcode === 0x09 && literal(headReset.operands[0]!) === 255 &&
      memory(headReset.operands[1]!) === 0x6de1 ? instructions.get(headReset.next) : undefined;
    const disguiseEntry = patrolDispatch &&
      resultBranch?.opcode === 0x25 && memory(resultBranch.operands[0]!) === memory(operands[3]!) &&
      memory(operands[3]!) === 0x6e82 && literal(resultBranch.operands[1]!) === 4 &&
      resultBranch.next === patrolDispatch[0] &&
      patrolDispatch.slice(1).every((target, index) => resultBranch.operands[index + 2]?.word === target)
      ? resultBranch.next : undefined;
    const angryParlay = slumsAngryDispatchProven && slumsProof.angryParlay.producer === "ECL2.DAX:20:9cc5" &&
      slumsProof.angryParlay.entry === "b254" && load.address === 0x9cc5 ? slumsProof.angryParlay : undefined;
    walk(scope.flatMap(state => successors(state, instructions)), instructions, (state, instruction) => {
      if (load.address === 0xaa75 && instruction.address === poolMenu?.address) {
        prompt(state, instruction, 9);
        return false;
      }
      if (state.address === disguiseEntry || pictureBoundaries.has(instruction.opcode) ||
          angryParlay && (state.address === 0xb254 || state.address === instructions.get(0x9cef)?.next)) return false;
      if (instruction.opcode === 0x0d) {
        if (direct) return false;
        approaches.add(authored(state.address));
      }
      const firstLabel = promptOperands.get(instruction.opcode);
      if (firstLabel !== undefined) prompt(state, instruction, firstLabel);
      return true;
    });

    const retainedVerticalMenus = new Map<string, string>();
    if (archive === 6 && scriptBlock === 1 && load.address === 0x9dc8) {
      // Rescue Boy leads through text into another vertical menu without drawing a new picture.
      const menu = instructions.get(0x9f20);
      const branch = menu && instructions.get(menu.next);
      const rescueIndex = menu?.operands.slice(3).findIndex(option => option.text === "RESCUE BOY") ?? -1;
      const target = rescueIndex === -1 ? undefined : branch?.operands[rescueIndex + 2]?.word;
      const reply = target == null ? undefined : instructions.get(target);
      const rescue = reply && instructions.get(reply.next);
      if (menu?.opcode === 0x15 && branch?.opcode === 0x25 &&
          memory(menu.operands[0]!) === memory(branch.operands[0]!) && reply?.opcode === 0x12 &&
          rescue?.opcode === 0x15 && rescue.operands[1]?.text === "HOW WILL YOU RESCUE THE BOY?") {
        retainedVerticalMenus.set(authored(rescue.next), authored(menu.address));
      }
    }

    // Parlay after sneaking up on a roaming patrol retains its original portrait.
    // The noticed menu also has direct entries that must keep their own producer.
    if (archive === 4 && scriptBlock === 10 && load.address === 0xb4e9 && opcode === 0x29) {
      const branch = instructions.get(load.next);
      const reset = instructions.get(0xb51d);
      const notice = reset && instructions.get(reset.next);
      const jump = notice && instructions.get(notice.next);
      const menu = instructions.get(0xb549);
      if (branch?.opcode === 0x25 && memory(branch.operands[0]!) === memory(operands[3]!) &&
          branch.operands[5]?.word === reset?.address && reset?.opcode === 0x09 &&
          literal(reset.operands[0]!) === 0 && memory(reset.operands[1]!) === 0x6dcb &&
          notice?.opcode === 0x12 && notice.operands[0]?.text === "YOU ARE NOTICED." &&
          jump?.opcode === 0x01 && jump.operands[0]?.word === menu?.address && menu?.opcode === 0x29 &&
          [0, 1, 2, 3].every(index => memory(operands[index]!) !== null &&
            memory(operands[index]!) === memory(menu.operands[index]!))) {
        for (const state of scope) prompt({ address: menu.address, returns: state.returns }, menu, 9);
      }
    }

    // Confirm the selected HEAD and BODY from each measured encounter's script.
    const nomadPortrait = nomadComposition(load.address);
    let composedPortrait = nomadFeast ? {
      source: "HEAD7.DAX:74:BODY7.DAX:30", headWrite: authored(feastHead.address), headSlot: "6de1",
      bodyOperand: 0, headReset: authored(feastReset.address),
    } : nomadPortrait ?? (tyrmorPictures?.compositions.length === 1 ? tyrmorPictures.compositions[0] : undefined);
    const address = authored(load.address);
    if (archive === 3 && scriptBlock === 0 && block === 1 && ["9eb7", "a9e1", "aa75"].includes(address)) {
      const at = (position: string) => decoded.find(instruction => authored(instruction.address) === position);
      const selectsHead = (instruction: Instruction | undefined, head: number) => instruction?.opcode === 0x09 &&
        literal(instruction.operands[0]!) === head && memory(instruction.operands[1]!) === 0x6de1;
      const braccio = address === "9eb7" && direct && prompts.has("af1c:9f15");
      const tempus = address === "a9e1" && direct && prompts.has("ae5a:aa2c");
      const watch = address === "aa75" && opcode === 0x0c && literal(operands[0]!) === 16 && literal(operands[1]!) === 0;
      const headWrite = at(braccio ? "9eb1" : "a9db");
      const head = braccio ? 13 : 57;
      if (headWrite && selectsHead(headWrite, head)) {
        const composition = {
          source: `HEAD3.DAX:${head}:BODY3.DAX:1`, headWrite: authored(headWrite.address), headSlot: "6de1",
        };
        if (braccio && headWrite.next === load.address && selectsHead(at("9f15"), 0)) {
          composedPortrait = { ...composition, bodyOperand: 0, headReset: "9f15" };
        }
        if (tempus && headWrite.next === load.address && selectsHead(at("aa58"), 255) && selectsHead(at("aa6b"), 255)) {
          composedPortrait = { ...composition, bodyOperand: 0, headReset: "aa58" };
        }
        if (watch) {
          // The hostility branch goes straight from the priest's PICTURE to the close combat setup.
          const priest = instructions.get(headWrite.next);
          const compare = priest && instructions.get(priest.next);
          const conditional = compare && instructions.get(compare.next);
          const jump = conditional && instructions.get(conditional.next);
          if (priest?.opcode === 0x0e && literal(priest.operands[0]!) === 1 && compare?.opcode === 0x03 &&
              memory(compare.operands[0]!) === 0x4ac0 && literal(compare.operands[1]!) === 0 &&
              conditional?.opcode === 0x19 && jump?.opcode === 0x01 && jump.operands[0]?.word === load.address) {
            composedPortrait = { ...composition, bodyOperand: 2 };
          }
        }
      }
    }

    // The City Hall pictures share body 1 but expressly select different heads.
    // At the restricted door, the composed draw follows APPROACH at b3e0.
    const council = archive === 3 && scriptBlock === 8 && block === 1
      ? new Map([
        ["b085", { head: 55, headWrite: 0xb07f, resetCall: 0x9a4a }],
        ["b3d9", { head: 57, headWrite: 0xb3d3, resetCall: undefined }],
        ["b4c4", { head: 57, headWrite: 0xb4be, resetCall: 0xb500 }],
      ]).get(address)
      : undefined;
    const councilHead = council && instructions.get(council.headWrite);
    const councilReset = council?.resetCall === undefined ? undefined : instructions.get(council.resetCall);
    const resetHead = instructions.get(0xb57f);
    const clearPicture = resetHead && instructions.get(resetHead.next);
    const councilComposition = council && councilHead?.opcode === 0x09 && councilHead.next === load.address &&
      literal(councilHead.operands[0]!) === council.head && memory(councilHead.operands[1]!) === 0x6de1 &&
      (councilReset
        ? direct && councilReset.opcode === 0x02 && councilReset.operands[0]?.word === resetHead?.address &&
          resetHead?.opcode === 0x09 && literal(resetHead.operands[0]!) === 255 && memory(resetHead.operands[1]!) === 0x6de1 &&
          clearPicture?.opcode === 0x0e && literal(clearPicture.operands[0]!) === 255
        : council.resetCall === undefined && opcode === 0x0c && literal(operands[0]!) === 27 &&
          literal(operands[1]!) === 1 && instructions.get(load.next)?.opcode === 0x0d)
      ? { source: `HEAD3.DAX:${council.head}:BODY3.DAX:1`, headWrite: authored(councilHead.address),
          headSlot: "6de1", bodyOperand: direct ? 0 : 2, ...(councilReset ? { headReset: "b57f" } : {}) }
      : undefined;
    // The envoy fight sets a composed head before the approach, then clears it
    // immediately after combat yields control to the script.
    if (archive === 8 && scriptBlock === 13 && load.address === 0xa278 && opcode === 0x0c) {
      const head = instructions.get(0xa272);
      const reset = instructions.get(0xa2a4);
      const fight = instructions.get(0xa2a3);
      if (head?.opcode === 0x09 && head.next === load.address &&
          literal(head.operands[0]!) === 69 && memory(head.operands[1]!) === 0x6de1 &&
          literal(operands[2]!) === 1 && instructions.get(load.next)?.opcode === 0x0d &&
          fight?.opcode === 0x24 && fight.next === reset?.address && reset?.opcode === 0x09 &&
          literal(reset.operands[0]!) === 255 && memory(reset.operands[1]!) === 0x6de1) {
        composedPortrait = { source: "HEAD8.DAX:69:BODY8.DAX:1", headWrite: "a272", headSlot: "6de1",
          bodyOperand: 2, headReset: "a2a4" };
      }
    }
    const falseThrone = scriptBlock === 5 && address === "a98a";
    const forgePatrol = scriptBlock === 6 && ["a9e6", "aa49"].includes(address);
    const mazePatrol = scriptBlock === 4 && ["9ce6", "9d49"].includes(address);
    const outerPatrol = scriptBlock === 3 && ["9d91", "9df1"].includes(address);
    const sentinel = opcode === 0x0c && (scriptBlock === 4 && address === "9f0c" || scriptBlock === 3 && address === "9fb6");
    const mazeWatch = scriptBlock === 4 && opcode === 0x29 && address === "9ffa";
    const outerWatch = scriptBlock === 3 && opcode === 0x29 && address === "a09e";
    const genheerisOffer = scriptBlock === 7 && opcode === 0x0c && address === "a255";
    const stojanowBarracks = archive === 2 && scriptBlock === 9 && opcode === 0x29 && ["a23f", "a372"].includes(address);
    const stojanowCharge = archive === 2 && scriptBlock === 9 && opcode === 0x29 && ["a558", "b0cc"].includes(address);
    const nomadHeadman = archive === 7 && scriptBlock === 17 && opcode === 0x0c && address === "a39c";
    const yarashStudy = archive === 7 && scriptBlock === 23 && opcode === 0x29 && address === "abd5";
    // The merchant's guards retain their selected head through both advances.
    const merchantGuards = archive === 6 && scriptBlock === 1 && opcode === 0x0c && address === "9fe8" &&
      literal(operands[1]!) === 2 && load.next === 0x9fef &&
      ([[0x9fef, 0x3a, 0x9ff0], [0x9ff0, 0x0d, 0x9ff1], [0x9ff1, 0x3a, 0x9ff2], [0x9ff2, 0x0d, 0x9ff3]] as const)
        .every(([at, operation, next]) => {
          const step = instructions.get(at);
          return step?.opcode === operation && step.next === next;
        });
    if (nomadHeadman || stojanowBarracks || stojanowCharge || yarashStudy || merchantGuards || archive === 5 && (sentinel || mazeWatch || outerWatch || genheerisOffer || opcode === 0x29 &&
        (scriptBlock === 7 && ["a184", "a56c"].includes(address) ||
         scriptBlock === 5 && address === "a256" || falseThrone || forgePatrol || mazePatrol || outerPatrol))) {
      const before = (at: number) => decoded.find(instruction => instruction.next === at);
      // The false throne, Yarash, and these patrols reuse the head selected by their approach setup.
      const setupAddress = yarashStudy ? "ab61" : falseThrone ? "a953" : forgePatrol ? "a8fc" :
        mazePatrol ? "9bfc" : outerPatrol ? "9ca7" : undefined;
      const setup = setupAddress ? decoded.find(instruction => authored(instruction.address) === setupAddress) : undefined;
      // At the Stojanow barracks the quoted dialogue and its acknowledgement
      // keep the selected head before either encounter menu.
      const acknowledgement = stojanowBarracks || stojanowCharge || mazeWatch ? before(load.address) : undefined;
      const acknowledgementTarget = acknowledgement?.operands[0]?.word;
      const acknowledged = acknowledgement?.opcode === 0x02 && acknowledgementTarget != null &&
        authored(acknowledgementTarget) === (mazeWatch ? "9a37" : "9c40") ? acknowledgement : undefined;
      const dialogue = acknowledged && before(acknowledged.address);
      // The Nomad headman retains the composition drawn immediately before its setup.
      const picture = nomadHeadman ? before(load.address) : undefined;
      const headmanPrelude = picture?.opcode === 0x0e && literal(picture.operands[0]!) === portrait.literal ? picture : undefined;
      const prelude = nomadHeadman ? headmanPrelude : mazeWatch ? dialogue && acknowledgement :
        stojanowBarracks ? dialogue : stojanowCharge ? acknowledged :
          outerWatch ? before(load.address) : setup ?? load;
      const headWrite = prelude && (!stojanowBarracks || prelude.opcode === 0x12) ? before(prelude.address) : undefined;
      // Both versions of the bargain reset the head when the Yes/No helper returns.
      const resetAddresses = genheerisOffer ? ["a30f", "a345"] : [merchantGuards ? "9ff3" : authored(load.next)];
      const headResets = resetAddresses.map(reset => decoded.find(instruction => authored(instruction.address) === reset));
      if ((!setupAddress || setup?.opcode === 0x0c && literal(setup.operands[2]!) === portrait.literal &&
            literal(setup.operands[0]!) === literal(operands[0]!)) &&
          headWrite?.opcode === 0x09 && memory(headWrite.operands[1]!) === 0x6de1 &&
          headResets.every(reset => reset?.opcode === 0x09 && memory(reset.operands[1]!) === 0x6de1 &&
            literal(reset.operands[0]!) === 0xff) && portrait.literal !== null) {
        const head = literal(headWrite.operands[0]!);
        if (head !== null && head >= 0 && head < 0xff && portrait.literal >= 0 && portrait.literal <= 0xff) {
          composedPortrait = {
            source: `HEAD${archive}.DAX:${head}:BODY${archive}.DAX:${portrait.literal}`,
            headWrite: authored(headWrite.address), headSlot: "6de1", bodyOperand: 2,
            headReset: resetAddresses[0]!,
          };
        }
      }
    }

    let approachHandoff;
    if (opcode === 0x0c && approaches.size === 1 && !prompts.size &&
        literal(operands[1]!) === 1 && literal(operands[0]!) !== null && block !== null) {
      let step = instructions.get(load.next);
      while (step && ["PRINTCLEAR", "APPROACH", "DELAY"].includes(step.name)) {
        step = instructions.get(step.next);
      }
      if (step?.opcode === 0x29 && literal(step.operands[1]!) === 0 &&
          literal(step.operands[0]!) === literal(operands[0]!) && literal(step.operands[2]!) === block) {
        approachHandoff = {
          menu: authored(step.address), prompt: authored(step.next),
          sprite: `encounter:area:${scriptBlock}:SPRIT${archive}.DAX:${literal(operands[0]!)}:0:0`,
        };
      }
    }

    const combat = scope.length && opcode === 0x0c ? immediateCombatAfter(load) : undefined;
    return [{
      kind: "ecl", status: "candidate", scriptArchive: record.file, scriptBlock, address: authored(load.address),
      next: authored(load.next), opcode, name: load.name, pictureArchive, block, selector: portrait, possiblePictures,
      boundedBlocks,
      composedPortrait: councilComposition ?? composedPortrait,
      ...(nomadPortrait && load.address === 0xa33c
        ? { retainedComposedDraw: { prompt: authored(load.next), cursor: authored(0x9dd6) } } : {}),
      ...(tyrmorPictures && tyrmorPictures.compositions.length > 1 ? { composedPortraitVariants: tyrmorPictures.compositions } : {}),
      ...(faceToFaceUnreachable && authored(load.address) === "a26c" && authored(load.next) === lizardFaceToFaceProof.prompt
        ? { unreachableOriginal: lizardFaceToFaceProof.reason } : {}),
      ...(bothSurprisedUnreachable && authored(load.address) === "9d1d" && authored(load.next) === slumsProof.bothSurprised.prompt
        ? { unreachableOriginal: slumsProof.bothSurprised.reason } : {}),
      ...(angryParlay ? { unreachableContinuation: angryParlay } : {}),
      ...(direct ? {} : { approachSelectors: { sprite: selector(operands[0]!), distance: selector(operands[1]!) } }),
      approachSites: [...approaches].sort(),
      approachHandoff,
      immediateCombat: combat?.address ?? null,
      immediateCombatResume: combat?.resume,
      promptCandidates: [...prompts.values()].sort((a, b) => a.address.localeCompare(b.address) || (a.caller ?? "").localeCompare(b.caller ?? "")),
      ...(retainedVerticalMenus.size ? { retainedVerticalMenus: Object.fromEntries(retainedVerticalMenus) } : {}),
      uncertainties: [
        "selected-head-may-use-composed-portrait",
        ...(direct ? [] : ["portrait-requires-zero-distance-and-viewport-state"]),
        ...(block === null && !boundedBlocks ? ["unresolved-picture-selector"] : []),
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
