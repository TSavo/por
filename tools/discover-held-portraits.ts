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
// These instructions can prepare a fight without a new picture or player input.
const combatPrelude = new Set([0x01, 0x02, 0x03, 0x04, 0x08, 0x09, 0x0b, 0x0d, 0x12, 0x13, 0x17, 0x1b, 0x1c, 0x3a]);

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

  return decoded.flatMap(load => {
    const { opcode, operands } = load;
    if (opcode !== 0x0e && opcode !== 0x0c && opcode !== 0x29) return [];
    const direct = opcode === 0x0e;
    const portrait = selector(operands[direct ? 0 : 2]!);
    const block = portrait.literal === null ? null : portrait.literal & 255;
    const boundedBlocks = podalPatrolPictureBlocks(load.address, portrait) ?? valhingenPatrolPictureBlocks(load.address, portrait);
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
    let composedPortrait;
    const address = authored(load.address);
    const falseThrone = scriptBlock === 5 && address === "a98a";
    const forgePatrol = scriptBlock === 6 && ["a9e6", "aa49"].includes(address);
    const genheerisOffer = scriptBlock === 7 && opcode === 0x0c && address === "a255";
    const stojanowBarracks = archive === 2 && scriptBlock === 9 && opcode === 0x29 && ["a23f", "a372"].includes(address);
    if (stojanowBarracks || archive === 5 && (genheerisOffer || opcode === 0x29 &&
        (scriptBlock === 7 && ["a184", "a56c"].includes(address) ||
         scriptBlock === 5 && address === "a256" || falseThrone || forgePatrol))) {
      const before = (at: number) => decoded.find(instruction => instruction.next === at);
      // The false throne and forge patrol reuse the head selected by their approach setup.
      const setupAddress = falseThrone ? "a953" : forgePatrol ? "a8fc" : undefined;
      const setup = setupAddress ? decoded.find(instruction => authored(instruction.address) === setupAddress) : undefined;
      // At the Stojanow barracks the quoted dialogue and its acknowledgement
      // keep the selected head before either encounter menu.
      const acknowledgement = stojanowBarracks ? before(load.address) : undefined;
      const acknowledgementTarget = acknowledgement?.operands[0]?.word;
      const dialogue = acknowledgement?.opcode === 0x02 && acknowledgementTarget != null &&
        authored(acknowledgementTarget) === "9c40" ? before(acknowledgement.address) : undefined;
      const prelude = stojanowBarracks ? dialogue : setup ?? load;
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
      ...(direct ? {} : { approachSelectors: { sprite: selector(operands[0]!), distance: selector(operands[1]!) } }),
      approachSites: [...approaches].sort(),
      approachHandoff,
      immediateCombat: scope.length && opcode === 0x0c ? immediateCombatAfter(load) : null,
      promptCandidates: [...prompts.values()].sort((a, b) => a.address.localeCompare(b.address) || (a.caller ?? "").localeCompare(b.caller ?? "")),
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
