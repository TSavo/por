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
const combatPrelude = new Set([0x01, 0x02, 0x03, 0x04, 0x08, 0x09, 0x0b, 0x0d, 0x12, 0x13, 0x16, 0x17, 0x18, 0x1b, 0x1c, 0x27, 0x3a, 0x3d]);
const valjevoPatrolDispatch = new Map<string, readonly number[]>([
  ["3:9d91", [0x9ddc, 0x9bf2, 0x9e79, 0x9c28, 0x9e79]],
  ["4:9ce6", [0x9d31, 0x9b5d, 0x9dd1, 0x9b7d, 0x9dd1]],
  ["6:a9e6", [0xaa31, 0x9c3e, 0xabd4, 0xa87d, 0xabd4]],
]);

const lizardFaceToFaceProof = JSON.parse(readFileSync(fromPortRoot("qa", "held-portrait-unreachable.json"), "utf8")) as {
  producer: string;
  prompt: string;
  scriptSha256: string;
  gogStartSha256: string;
  gogOverlaySha256: string;
  translatedRoutines: Record<string, string>;
  reason: string;
};

function lizardFaceToFaceUnreachable(script: Uint8Array, instructions: ReadonlyMap<number, Instruction>): boolean {
  const proof = lizardFaceToFaceProof;
  const digest = (bytes: string | Uint8Array) => createHash("sha256").update(bytes).digest("hex");
  if (proof.producer !== "ECL7.DAX:26:a26c" || proof.prompt !== "a28c" || digest(script) !== proof.scriptSha256) return false;

  // ovl03:175f assigns 3, then 1769 repeats the unchanged comparison and 1778 replaces it with 2.
  // PARTY SURPRISE initializes the encounter result to 0 or 1. ENCOUNTER MENU only writes 0–3,
  // so the preceding a230 dispatch cannot fall through. The other entry is a14a's fourth branch.
  const dispatch = instructions.get(0xa14a);
  const preceding = instructions.get(0xa230);
  if (dispatch?.opcode !== 0x25 || memory(dispatch.operands[0]!) !== 0x6dcb || dispatch.operands[5]?.word !== 0xa242 ||
      preceding?.opcode !== 0x25 || memory(preceding.operands[0]!) !== 0x6e79 || literal(preceding.operands[1]!) !== 4) return false;

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
    const file = "ECL7.DAX";
    const block = parseDax(file, readGameFile(original, file)).entries.find(entry => entry.id === 26);
    return block !== undefined && digest(scriptFromBlock(block.data).bytes) === proof.scriptSha256 &&
      digest(readGameFile(original, "START.EXE")) === proof.gogStartSha256 &&
      digest(readGameFile(original, "GAME.OVR")) === proof.gogOverlaySha256;
  } catch {
    return false;
  }
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
  const contexts = new Map<number, State[]>();
  walk(readEntryVector(script).map(address => ({ address, returns: [] })), instructions, state => {
    const states = contexts.get(state.address) ?? [];
    states.push(state);
    contexts.set(state.address, states);
    return true;
  });

  function immediateCombatAfter(load: Instruction) {
    const results = new Map<string, number | null>();
    function fightFrom(state: State): number | null {
      const key = stateKey(state);
      const cached = results.get(key);
      if (cached !== undefined) return cached;
      const current = instructions.get(state.address);
      if (current?.opcode === 0x24) return current.address;
      if (!current || !combatPrelude.has(current.opcode)) return null;
      // Re-entering an active state leaves an unproven route to the fight.
      results.set(key, null);
      const [next, ...alternatives] = successors(state, instructions);
      const fight = next ? fightFrom(next) : null;
      if (fight === null || !alternatives.every(branch => fightFrom(branch) === fight)) return null;
      results.set(key, fight);
      return fight;
    }
    const fight = fightFrom({ address: load.next, returns: [] });
    return fight === null ? null : authored(fight);
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

  return decoded.flatMap(load => {
    const { opcode, operands } = load;
    if (opcode !== 0x0e && opcode !== 0x0c && opcode !== 0x29) return [];
    const direct = opcode === 0x0e;
    const portrait = selector(operands[direct ? 0 : 2]!);
    const block = portrait.literal === null ? null : portrait.literal & 255;
    const tyrmorPictures = tyrmorPrisonPictures(load.address, portrait);
    const boundedBlocks = podalPatrolPictureBlocks(load.address, portrait) ?? valhingenPatrolPictureBlocks(load.address, portrait) ??
      tyrmorPictures?.blocks;
    const pictureBlocks = block === null ? boundedBlocks ?? [] : [block];
    const possiblePictures = animated.filter(picture => picture.file === pictureArchive &&
      picture.block !== undefined && pictureBlocks.includes(picture.block)).map(describePicture);
    if (block !== null && !possiblePictures.length) return [];

    const scope = (contexts.get(load.address) ?? []).filter(state =>
      !valhingenReturnsBeforePatrolMenu(load.address, state.returns.at(-1)));
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
    walk(scope.flatMap(state => successors(state, instructions)), instructions, (state, instruction) => {
      if (state.address === disguiseEntry || pictureBoundaries.has(instruction.opcode)) return false;
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
    let composedPortrait = tyrmorPictures?.compositions.length === 1 ? tyrmorPictures.compositions[0] : undefined;
    const address = authored(load.address);
    const falseThrone = scriptBlock === 5 && address === "a98a";
    const forgePatrol = scriptBlock === 6 && ["a9e6", "aa49"].includes(address);
    const mazePatrol = scriptBlock === 4 && ["9ce6", "9d49"].includes(address);
    const outerPatrol = scriptBlock === 3 && ["9d91", "9df1"].includes(address);
    const sentinel = opcode === 0x0c && (scriptBlock === 4 && address === "9f0c" || scriptBlock === 3 && address === "9fb6");
    const mazeWatch = scriptBlock === 4 && opcode === 0x29 && address === "9ffa";
    const outerWatch = scriptBlock === 3 && opcode === 0x29 && address === "a09e";
    const genheerisOffer = scriptBlock === 7 && opcode === 0x0c && address === "a255";
    const stojanowBarracks = archive === 2 && scriptBlock === 9 && opcode === 0x29 && ["a23f", "a372"].includes(address);
    const nomadHeadman = archive === 7 && scriptBlock === 17 && opcode === 0x0c && address === "a39c";
    const yarashStudy = archive === 7 && scriptBlock === 23 && opcode === 0x29 && address === "abd5";
    if (nomadHeadman || stojanowBarracks || yarashStudy || archive === 5 && (sentinel || mazeWatch || outerWatch || genheerisOffer || opcode === 0x29 &&
        (scriptBlock === 7 && ["a184", "a56c"].includes(address) ||
         scriptBlock === 5 && address === "a256" || falseThrone || forgePatrol || mazePatrol || outerPatrol))) {
      const before = (at: number) => decoded.find(instruction => instruction.next === at);
      // The false throne, Yarash, and these patrols reuse the head selected by their approach setup.
      const setupAddress = yarashStudy ? "ab61" : falseThrone ? "a953" : forgePatrol ? "a8fc" :
        mazePatrol ? "9bfc" : outerPatrol ? "9ca7" : undefined;
      const setup = setupAddress ? decoded.find(instruction => authored(instruction.address) === setupAddress) : undefined;
      // At the Stojanow barracks the quoted dialogue and its acknowledgement
      // keep the selected head before either encounter menu.
      const acknowledgement = stojanowBarracks || mazeWatch ? before(load.address) : undefined;
      const acknowledgementTarget = acknowledgement?.operands[0]?.word;
      const dialogue = acknowledgement?.opcode === 0x02 && acknowledgementTarget != null &&
        authored(acknowledgementTarget) === (mazeWatch ? "9a37" : "9c40") ? before(acknowledgement.address) : undefined;
      // The Nomad headman retains the composition drawn immediately before its setup.
      const picture = nomadHeadman ? before(load.address) : undefined;
      const headmanPrelude = picture?.opcode === 0x0e && literal(picture.operands[0]!) === portrait.literal ? picture : undefined;
      const prelude = nomadHeadman ? headmanPrelude : mazeWatch ? dialogue && acknowledgement :
        stojanowBarracks ? dialogue : outerWatch ? before(load.address) : setup ?? load;
      const headWrite = prelude && (!stojanowBarracks || prelude.opcode === 0x12) ? before(prelude.address) : undefined;
      // Both versions of the bargain reset the head when the Yes/No helper returns.
      const resetAddresses = genheerisOffer ? ["a30f", "a345"] : [authored(load.next)];
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

    return [{
      kind: "ecl", status: "candidate", scriptArchive: record.file, scriptBlock, address: authored(load.address),
      next: authored(load.next), opcode, name: load.name, pictureArchive, block, selector: portrait, possiblePictures,
      boundedBlocks,
      composedPortrait,
      ...(tyrmorPictures && tyrmorPictures.compositions.length > 1 ? { composedPortraitVariants: tyrmorPictures.compositions } : {}),
      ...(faceToFaceUnreachable && authored(load.address) === "a26c" && authored(load.next) === lizardFaceToFaceProof.prompt
        ? { unreachableOriginal: lizardFaceToFaceProof.reason } : {}),
      ...(direct ? {} : { approachSelectors: { sprite: selector(operands[0]!), distance: selector(operands[1]!) } }),
      approachSites: [...approaches].sort(),
      approachHandoff,
      immediateCombat: scope.length && opcode === 0x0c ? immediateCombatAfter(load) : null,
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
