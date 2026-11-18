/**
 * SCAFFOLDING. Opcode names and the stepper were inferred by watching the
 * bytes, not translated from Pool of Radiance. The translated operand fetch
 * is ovl07_0000 in src/translated/ovl07.ts. Replace this file with that path.
 *
 * Event Control Language.
 *
 * A decompressed ECL block begins with a uint16 the original loader skips.
 * The remaining bytes are placed at address 0x8000. The first five instructions
 * are an entry vector consumed by vm_init (not executed): each is parsed as one
 * operand, and the fifth word is the initial program counter.
 *
 * Operand byte:
 *   0x00        immediate byte (the following byte)
 *   0x01        memory word (following uint16 is an address)
 *   0x02        immediate word
 *   0x03        memory word, same encoding as 0x01
 *   0x80        packed string; the following byte is the packed length
 *   0x81        string copied from a memory address
 *
 * Packed strings are 6-bit characters. Values 1..0x1F are stored biased by
 * 0x40, so the printable range is space through underscore plus lowercase-less
 * ASCII. A zero code ends a character early.
 *
 * The opcode table is the CotAB command set (0x00-0x40). Operand counts follow
 * the implementation of each command, which in a few cases differs from the
 * skip-size stored beside the name (ECL CLOCK, menus, ON GOTO). Pool of
 * Radiance is the earlier game; opcodes past the ones its scripts actually use
 * still need to be checked against its interpreter in GAME.OVR.
 */

export const ECL_BASE = 0x9900;

export interface OpcodeInfo {
  name: string;
  /** Fixed operand count, or a variable form. */
  form: number | "vert-menu" | "horiz-menu" | "on-branch";
  /** What the phase-1 stepper does with it. */
  effect: "flow" | "print" | "halt" | "nop";
}

export const OPCODES: Record<number, OpcodeInfo> = {
  0x00: { name: "EXIT", form: 0, effect: "halt" },
  0x01: { name: "GOTO", form: 1, effect: "flow" },
  0x02: { name: "GOSUB", form: 1, effect: "flow" },
  0x03: { name: "COMPARE", form: 2, effect: "flow" },
  0x04: { name: "ADD", form: 3, effect: "flow" },
  0x05: { name: "SUBTRACT", form: 3, effect: "flow" },
  0x06: { name: "DIVIDE", form: 3, effect: "flow" },
  0x07: { name: "MULTIPLY", form: 3, effect: "flow" },
  0x08: { name: "RANDOM", form: 2, effect: "halt" },
  0x09: { name: "SAVE", form: 2, effect: "flow" },
  0x0a: { name: "LOAD CHARACTER", form: 1, effect: "halt" },
  0x0b: { name: "LOAD MONSTER", form: 3, effect: "halt" },
  0x0c: { name: "SETUP MONSTER", form: 3, effect: "halt" },
  0x0d: { name: "APPROACH", form: 0, effect: "nop" },
  0x0e: { name: "PICTURE", form: 1, effect: "halt" },
  0x0f: { name: "INPUT NUMBER", form: 2, effect: "halt" },
  0x10: { name: "INPUT STRING", form: 2, effect: "halt" },
  0x11: { name: "PRINT", form: 1, effect: "print" },
  0x12: { name: "PRINTCLEAR", form: 1, effect: "print" },
  0x13: { name: "RETURN", form: 0, effect: "flow" },
  0x14: { name: "COMPARE AND", form: 4, effect: "flow" },
  0x15: { name: "VERTICAL MENU", form: "vert-menu", effect: "halt" },
  0x16: { name: "IF =", form: 0, effect: "flow" },
  0x17: { name: "IF <>", form: 0, effect: "flow" },
  0x18: { name: "IF <", form: 0, effect: "flow" },
  0x19: { name: "IF >", form: 0, effect: "flow" },
  0x1a: { name: "IF <=", form: 0, effect: "flow" },
  0x1b: { name: "IF >=", form: 0, effect: "flow" },
  0x1c: { name: "CLEAR MONSTERS", form: 0, effect: "nop" },
  0x1d: { name: "PARTY STRENGTH", form: 1, effect: "halt" },
  0x1e: { name: "CHECK PARTY", form: 6, effect: "halt" },
  0x1f: { name: "UNKNOWN 1F", form: 2, effect: "halt" },
  0x20: { name: "NEW ECL", form: 1, effect: "halt" },
  0x21: { name: "LOAD FILES", form: 3, effect: "halt" },
  0x22: { name: "PARTY SURPRISE", form: 2, effect: "halt" },
  0x23: { name: "SURPRISE", form: 4, effect: "halt" },
  0x24: { name: "COMBAT", form: 0, effect: "halt" },
  0x25: { name: "ON GOTO", form: "on-branch", effect: "halt" },
  0x26: { name: "ON GOSUB", form: "on-branch", effect: "halt" },
  0x27: { name: "TREASURE", form: 8, effect: "halt" },
  0x28: { name: "ROB", form: 3, effect: "halt" },
  0x29: { name: "ENCOUNTER MENU", form: 14, effect: "halt" },
  0x2a: { name: "GET TABLE", form: 3, effect: "halt" },
  0x2b: { name: "HORIZONTAL MENU", form: "horiz-menu", effect: "halt" },
  0x2c: { name: "PARLAY", form: 6, effect: "halt" },
  0x2d: { name: "CALL", form: 1, effect: "halt" },
  0x2e: { name: "DAMAGE", form: 5, effect: "halt" },
  0x2f: { name: "AND", form: 3, effect: "halt" },
  0x30: { name: "OR", form: 3, effect: "halt" },
  0x31: { name: "SPRITE OFF", form: 0, effect: "nop" },
  0x32: { name: "FIND ITEM", form: 1, effect: "halt" },
  0x33: { name: "PRINT RETURN", form: 0, effect: "print" },
  0x34: { name: "ECL CLOCK", form: 2, effect: "halt" },
  0x35: { name: "SAVE TABLE", form: 3, effect: "halt" },
  0x36: { name: "ADD NPC", form: 1, effect: "halt" },
  0x37: { name: "LOAD PIECES", form: 3, effect: "halt" },
  0x38: { name: "PROGRAM", form: 1, effect: "halt" },
  0x39: { name: "WHO", form: 1, effect: "halt" },
  0x3a: { name: "DELAY", form: 0, effect: "nop" },
  0x3b: { name: "SPELL", form: 3, effect: "halt" },
  0x3c: { name: "PROTECTION", form: 1, effect: "halt" },
  0x3d: { name: "CLEAR BOX", form: 0, effect: "nop" },
  0x3e: { name: "DUMP", form: 0, effect: "halt" },
  0x3f: { name: "FIND SPECIAL", form: 1, effect: "halt" },
  0x40: { name: "DESTROY ITEMS", form: 1, effect: "halt" },
};

export interface Operand {
  code: number;
  low: number;
  high: number | null;
  /** Immediate or address word, when the operand has one. */
  word: number | null;
  text: string | null;
}

export interface Instruction {
  address: number;
  opcode: number;
  name: string;
  operands: Operand[];
  next: number;
}

export function inflateChar(code: number): string {
  if (code === 0) return "";
  const c = code <= 0x1f ? code + 0x40 : code;
  return String.fromCharCode(c);
}

export function unpackString(packed: Uint8Array): string {
  let state = 1;
  let last = 0;
  let text = "";
  for (const byte of packed) {
    if (state === 1) {
      text += inflateChar((byte >> 2) & 0x3f);
      state = 2;
    } else if (state === 2) {
      text += inflateChar(((last << 4) | (byte >> 4)) & 0x3f);
      state = 3;
    } else {
      text += inflateChar(((last << 2) | (byte >> 6)) & 0x3f);
      text += inflateChar(byte & 0x3f);
      state = 1;
    }
    last = byte;
  }
  return text;
}

export class Script {
  constructor(readonly bytes: Uint8Array, readonly base = ECL_BASE) {}

  get length(): number {
    return this.bytes.length;
  }

  byte(address: number): number {
    const i = address - this.base;
    if (i < 0 || i >= this.bytes.length) {
      throw new RangeError(`ECL address ${hex(address)} is outside the script`);
    }
    return this.bytes[i] ?? 0;
  }

  inRange(address: number): boolean {
    const i = address - this.base;
    return i >= 0 && i < this.bytes.length;
  }
}

function hex(n: number): string {
  return `0x${n.toString(16)}`;
}

function immediate(op: Operand): number | null {
  if (op.code === 0x00) return op.low;
  if (op.code === 0x02 && op.word !== null) return op.word;
  return null;
}

export function readOperand(script: Script, address: number): { operand: Operand; next: number } {
  const code = script.byte(address);
  const low = script.byte(address + 1);
  let next = address + 2;
  let high: number | null = null;
  let text: string | null = null;
  if (code === 0x01 || code === 0x02 || code === 0x03 || code === 0x81) {
    high = script.byte(next);
    next += 1;
  } else if (code === 0x80) {
    const packed = new Uint8Array(low);
    for (let i = 0; i < low; i++) packed[i] = script.byte(next + i);
    text = unpackString(packed);
    next += low;
  } else if (code !== 0x00) {
    throw new Error(`operand code ${hex(code)} at ${hex(address)} is not one of 00/01/02/03/80/81`);
  }
  const word = high === null ? null : low | (high << 8);
  return { operand: { code, low, high, word, text }, next };
}

function readOperands(script: Script, address: number, count: number): { operands: Operand[]; next: number } {
  const operands: Operand[] = [];
  let cursor = address;
  for (let i = 0; i < count; i++) {
    const read = readOperand(script, cursor);
    operands.push(read.operand);
    cursor = read.next;
  }
  return { operands, next: cursor };
}

export function readInstruction(script: Script, address: number): Instruction {
  const opcode = script.byte(address);
  const info = OPCODES[opcode];
  if (!info) throw new Error(`unknown opcode ${hex(opcode)} at ${hex(address)}`);
  let cursor = address + 1;
  let operands: Operand[] = [];
  if (typeof info.form === "number") {
    const read = readOperands(script, cursor, info.form);
    operands = read.operands;
    cursor = read.next;
  } else if (info.form === "vert-menu") {
    const head = readOperands(script, cursor, 3);
    const count = immediate(head.operands[2]!);
    if (count === null) throw new Error(`vertical menu count is not immediate at ${hex(address)}`);
    const rest = readOperands(script, head.next, count);
    operands = [...head.operands, ...rest.operands];
    cursor = rest.next;
  } else if (info.form === "horiz-menu") {
    const head = readOperands(script, cursor, 2);
    const count = immediate(head.operands[1]!);
    if (count === null) throw new Error(`horizontal menu count is not immediate at ${hex(address)}`);
    const rest = readOperands(script, head.next, count);
    operands = [...head.operands, ...rest.operands];
    cursor = rest.next;
  } else {
    const head = readOperands(script, cursor, 2);
    const count = immediate(head.operands[1]!);
    if (count === null) throw new Error(`on-branch count is not immediate at ${hex(address)}`);
    const rest = readOperands(script, head.next, count);
    operands = [...head.operands, ...rest.operands];
    cursor = rest.next;
  }
  return { address, opcode, name: info.name, operands, next: cursor };
}

export interface Disassembly {
  lines: string[];
  instructions: Instruction[];
  /** Address where a linear walk stopped, and why, if it did not reach the end. */
  stop: string | null;
}

function jumpTargets(inst: Instruction): number[] {
  const take = (op: Operand | undefined): number | null => (op?.word == null ? null : op.word);
  if (inst.opcode === 0x01 || inst.opcode === 0x02) {
    const word = take(inst.operands[0]);
    return word === null ? [] : [word];
  }
  if (inst.opcode === 0x25 || inst.opcode === 0x26) {
    return inst.operands.slice(2).map((op) => op.word).filter((word): word is number => word !== null);
  }
  return [];
}

/** Five words the init routine parses before the first executed instruction. */
export function readEntryVector(script: Script): number[] {
  let address = script.base;
  const words: number[] = [];
  for (let n = 0; n < 5; n++) {
    const code = script.byte(address + 1);
    const low = script.byte(address + 2);
    address += 2;
    let high = 0;
    if (code === 1 || code === 2 || code === 3 || code === 0x81) {
      address += 1;
      high = script.byte(address);
    }
    address += 1;
    words.push(low | (high << 8));
  }
  return words;
}

export function disassemble(script: Script): Disassembly {
  const lines: string[] = [];
  const instructions: Instruction[] = [];
  const queue: number[] = [script.base];
  const external: number[] = [];
  try {
    for (const word of readEntryVector(script)) {
      if (script.inRange(word)) queue.push(word);
      else external.push(word);
    }
  } catch {
    // The header is not five operands. The walk from the load address still runs.
  }
  const seen = new Set<number>();
  const boundaries: string[] = [];
  while (queue.length > 0) {
    const address = queue.pop()!;
    if (seen.has(address) || !script.inRange(address)) continue;
    seen.add(address);
    try {
      const inst = readInstruction(script, address);
      instructions.push(inst);
      if (inst.next > address) queue.push(inst.next);
      for (const target of jumpTargets(inst)) {
        if (script.inRange(target)) queue.push(target);
        else external.push(target);
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      boundaries.push(`${hex(address)}: ${reason}`);
    }
  }
  instructions.sort((a, b) => a.address - b.address);
  for (const inst of instructions) lines.push(formatInstruction(inst));
  const end = script.base + script.length;
  const covered = instructions.reduce((sum, inst) => sum + (inst.next - inst.address), 0);
  lines.push(`; ${instructions.length} instructions, ${covered} bytes of ${script.length} decoded`);
  if (external.length > 0) {
    const unique = [...new Set(external)].sort((a, b) => a - b);
    lines.push(`; targets outside this block: ${unique.map(hex).join(" ")}`);
  }
  if (boundaries.length > 0) {
    lines.push(`; ${boundaries.length} boundary (data or an operand this table does not describe)`);
    for (const boundary of boundaries.slice(0, 6)) lines.push(`; stop at ${boundary}`);
  }
  const stop = boundaries[0] ?? null;
  if (covered < script.length) {
    lines.push(`; ${script.length - covered} bytes not reached from 0x8000 or from a branch`);
  }
  void end;
  return { lines, instructions, stop };
}

export function formatInstruction(inst: Instruction): string {
  const ops = inst.operands.map(formatOperand).join(", ");
  const addr = inst.address.toString(16).padStart(4, "0");
  return `${addr}  ${inst.name.padEnd(16)} ${ops}`.trimEnd();
}

function formatOperand(op: Operand): string {
  if (op.text !== null) return JSON.stringify(op.text);
  if (op.code === 0x00) return `byte ${op.low}`;
  if (op.code === 0x02 && op.word !== null) return `word ${hex(op.word)}`;
  if ((op.code === 0x01 || op.code === 0x03) && op.word !== null) return `mem ${hex(op.word)}`;
  if (op.code === 0x81 && op.word !== null) return `strmem ${hex(op.word)}`;
  return `code ${hex(op.code)}`;
}

export interface StepResult {
  instruction: Instruction;
  halted: boolean;
  reason: string;
  printed: string | null;
}

/**
 * Phase-1 machine. It runs the entry vector, then steps control flow, arithmetic
 * on a 64K memory image, compare/if, and print. Everything else halts with the
 * instruction decoded, so the opening script can be walked until it needs a
 * system that is not in this phase (menus, combat, pictures, saves).
 */
export class EclMachine {
  readonly memory = new Uint16Array(0x10000);
  readonly compare = [false, false, false, false, false, false];
  pc: number;
  readonly stack: number[] = [];
  halted = false;
  haltReason = "";
  readonly log: string[] = [];
  entry: number;

  constructor(readonly script: Script) {
    this.pc = this.entry = script.base;
    for (let i = 0; i < script.bytes.length; i++) {
      this.memory[script.base + i] = script.bytes[i] ?? 0;
    }
  }

  /** Parse the five-word header the same way the original init routine does. */
  init(): number[] {
    let ecl = this.script.base;
    const words: number[] = [];
    for (let n = 0; n < 5; n++) {
      const code = this.script.byte(ecl + 1);
      const low = this.script.byte(ecl + 2);
      ecl += 2;
      let high = 0;
      if (code === 1 || code === 2 || code === 3 || code === 0x81) {
        ecl += 1;
        high = this.script.byte(ecl);
      }
      ecl += 1;
      words.push(low | (high << 8));
    }
    this.entry = words[4] ?? this.script.base;
    this.pc = this.entry;
    this.halted = false;
    this.haltReason = "";
    this.log.push(
      `entry vector ${words.map((w) => hex(w)).join(" ")} ; start ${hex(this.entry)}`,
    );
    return words;
  }

  wordValue(op: Operand): number {
    if (op.code === 0x00) return op.low;
    if (op.code === 0x02 && op.word !== null) return op.word;
    if ((op.code === 0x01 || op.code === 0x03) && op.word !== null) {
      return this.memory[op.word] & 0xffff;
    }
    return 0;
  }

  step(): StepResult {
    if (this.halted) {
      return {
        instruction: {
          address: this.pc,
          opcode: 0,
          name: "HALTED",
          operands: [],
          next: this.pc,
        },
        halted: true,
        reason: this.haltReason,
        printed: null,
      };
    }
    const inst = readInstruction(this.script, this.pc);
    const info = OPCODES[inst.opcode]!;
    let printed: string | null = null;
    let halted = false;
    let reason = "";

    const store = (op: Operand, value: number) => {
      if (op.word !== null) this.memory[op.word] = value & 0xffff;
    };

    if (info.effect === "halt") {
      halted = true;
      reason = `${inst.name} needs a system this phase does not run`;
      this.pc = inst.next;
    } else if (inst.opcode === 0x00) {
      halted = true;
      reason = "EXIT";
      this.pc = inst.next;
    } else if (inst.opcode === 0x01) {
      this.pc = inst.operands[0]?.word ?? inst.next;
    } else if (inst.opcode === 0x02) {
      this.stack.push(inst.next);
      this.pc = inst.operands[0]?.word ?? inst.next;
    } else if (inst.opcode === 0x13) {
      const ret = this.stack.pop();
      this.pc = ret ?? inst.next;
      if (ret === undefined) {
        halted = true;
        reason = "RETURN with an empty call stack";
      }
    } else if (inst.opcode === 0x03 || inst.opcode === 0x14) {
      const a = this.wordValue(inst.operands[0]!);
      const b = this.wordValue(inst.operands[1]!);
      this.compare.fill(false);
      if (inst.opcode === 0x03) {
        if (a === b) this.compare[0] = true;
        if (a !== b) this.compare[1] = true;
        if (a < b) this.compare[2] = true;
        if (a > b) this.compare[3] = true;
        if (a <= b) this.compare[4] = true;
        if (a >= b) this.compare[5] = true;
      } else {
        const c = this.wordValue(inst.operands[2]!);
        const d = this.wordValue(inst.operands[3]!);
        if (a === b && c === d) this.compare[0] = true;
        else this.compare[1] = true;
      }
      this.pc = inst.next;
    } else if (inst.opcode >= 0x16 && inst.opcode <= 0x1b) {
      const index = inst.opcode - 0x16;
      this.pc = inst.next;
      if (!this.compare[index]) {
        const skipped = readInstruction(this.script, this.pc);
        this.pc = skipped.next;
        reason = `skipped ${skipped.name}`;
      }
    } else if (inst.opcode === 0x09) {
      const source = inst.operands[0]!;
      const dest = inst.operands[1]!;
      if (source.text !== null && dest.word !== null) {
        for (let i = 0; i < source.text.length; i++) {
          this.memory[(dest.word + i) & 0xffff] = source.text.charCodeAt(i) & 0xff;
        }
        this.memory[(dest.word + source.text.length) & 0xffff] = 0;
      } else if (dest.word !== null) {
        this.memory[dest.word] = this.wordValue(source) & 0xffff;
      }
      this.pc = inst.next;
    } else if (inst.opcode >= 0x04 && inst.opcode <= 0x07) {
      const a = this.wordValue(inst.operands[0]!);
      const b = this.wordValue(inst.operands[1]!);
      let value = 0;
      if (inst.opcode === 0x04) value = a + b;
      else if (inst.opcode === 0x05) value = b - a;
      else if (inst.opcode === 0x06) value = b === 0 ? 0 : Math.floor(a / b);
      else value = a * b;
      store(inst.operands[2]!, value);
      this.pc = inst.next;
    } else if (inst.opcode === 0x11 || inst.opcode === 0x12) {
      const op = inst.operands[0]!;
      printed = op.text ?? String(this.wordValue(op));
      this.log.push(printed);
      if (inst.opcode === 0x12) this.log.push("");
      this.pc = inst.next;
    } else if (inst.opcode === 0x33) {
      printed = "\n";
      this.log.push("");
      this.pc = inst.next;
    } else {
      this.pc = inst.next;
    }

    if (halted) {
      this.halted = true;
      this.haltReason = reason;
    }
    return { instruction: inst, halted, reason, printed };
  }
}

/** Drop the leading uint16 the loader skips. */
export function scriptFromBlock(block: Uint8Array, base = ECL_BASE): Script {
  if (block.length < 2) throw new Error("ECL block is shorter than its length word");
  return new Script(block.subarray(2), base);
}
