import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Every `int 21h` in a translated program and the DOS functions (AH) it can ask for (#83).
 *
 * The translated modules keep each original instruction as a comment above its case
 * (`// a3ba: mov ah, 0x2b`) and name the next instruction with `ip = ...`. From each `int 0x21`
 * this walks the instructions back, along every path that reaches it, to where AH got its value:
 * a constant, or another register or a pushed word that it then follows in turn. A walk that
 * reaches the start of a procedure goes on from each instruction that calls it; a call on the
 * way is stepped over when the procedure called is translated and leaves the register alone.
 * Whatever it cannot follow (memory, a call's result, an untranslated callee) is reported as
 * dynamic with the instruction, so nothing is assumed.
 */
export interface DosCallSite {
  module: string;
  procedure: string;
  /** Address of the `int 0x21`, as the module numbers it. */
  at: number;
  /** The constant AH values that reach it. */
  functions: number[];
  /** Where a path's AH could not be followed, as `module address: instruction`. */
  dynamic: string[];
  /** Procedures a path started in that no instruction of the program calls. */
  uncalled: string[];
}

type Half = "h" | "l" | "w";
type Want = { slot?: undefined; reg: string; half: Half } | { slot: number; half: Half };

interface Step {
  at: number;
  mnemonic: string;
  operands: string[];
  text: string;
  next: number[];
  /** The procedure a direct call enters: its module and entry. */
  calls?: { module: string; entry: number; far: boolean };
}

interface Procedure {
  module: string;
  name: string;
  entry: number;
  steps: Map<number, Step>;
  before: Map<number, number[]>;
}

const hex = (text: string) => parseInt(text, 16);
const reg8: Record<string, [string, Half]> = {
  ah: ["ax", "h"], al: ["ax", "l"], bh: ["bx", "h"], bl: ["bx", "l"],
  ch: ["cx", "h"], cl: ["cx", "l"], dh: ["dx", "h"], dl: ["dx", "l"],
};
const reg16 = new Set(["ax", "bx", "cx", "dx", "si", "di", "bp", "sp"]);
function register(operand: string | undefined): { reg: string; half: Half } | undefined {
  if (operand === undefined) return undefined;
  if (reg16.has(operand)) return { reg: operand, half: "w" };
  const byte = reg8[operand];
  return byte && { reg: byte[0], half: byte[1] };
}
const immediate = (operand: string | undefined) =>
  operand !== undefined && /^(0x[0-9a-f]+|\d+)$/.test(operand) ? Number(operand) : undefined;
const pick = (value: number, half: Half) => half === "h" ? (value >> 8) & 0xff : half === "l" ? value & 0xff : value & 0xffff;
const overlaps = (a: Half, b: Half) => a === "w" || b === "w" || a === b;

/** Instructions whose first operand is read, not written. */
const readsFirst = /^(cmp|test|push|out|j[a-z]*|ljmp|call|lcall|ret|retf|iret|int|loop[a-z]*|nop|cld|std|cli|sti|clc|stc|cmc|pushf|popf|stos[bw]|movs[bw]|cmps[bw]|scas[bw])$/;

/** The registers an instruction writes, other than through a call. `all` for an interrupt. */
function writes(step: Step): { reg: string; half: Half }[] | "all" {
  let { mnemonic, operands } = step;
  const out: { reg: string; half: Half }[] = [];
  if (mnemonic === "int") return "all";
  if (/^rep(n?e)?$/.test(mnemonic)) {
    out.push({ reg: "cx", half: "w" });
    const [inner = "", ...rest] = operands.join(", ").split(" ");
    mnemonic = inner;
    operands = rest.join(" ").split(", ");
  }
  const first = register(operands[0]);
  if (first && !readsFirst.test(mnemonic)) out.push(first);
  if (mnemonic === "xchg") {
    const second = register(operands[1]);
    if (second) out.push(second);
  }
  const byteOperand = /byte ptr/.test(operands[0] ?? "") || (register(operands[0])?.half ?? "w") !== "w";
  if (/^(mul|imul|div|idiv)$/.test(mnemonic) && operands.length === 1) {
    out.push({ reg: "ax", half: "w" });
    if (!byteOperand) out.push({ reg: "dx", half: "w" });
  }
  if (mnemonic === "cbw" || mnemonic === "cwde" || mnemonic === "lahf") out.push({ reg: "ax", half: "h" });
  if (mnemonic === "cwd" || mnemonic === "cdq") out.push({ reg: "dx", half: "w" });
  if (mnemonic === "lodsb") out.push({ reg: "ax", half: "l" }, { reg: "si", half: "w" });
  if (mnemonic === "lodsw") out.push({ reg: "ax", half: "w" }, { reg: "si", half: "w" });
  if (/^(stos|scas)[bw]$/.test(mnemonic)) out.push({ reg: "di", half: "w" });
  if (/^(movs|cmps)[bw]$/.test(mnemonic)) out.push({ reg: "si", half: "w" }, { reg: "di", half: "w" });
  if (/^loop/.test(mnemonic)) out.push({ reg: "cx", half: "w" });
  if (mnemonic === "pop" || mnemonic === "push" || mnemonic === "pushf" || mnemonic === "popf") {
    out.push({ reg: "sp", half: "w" });
  }
  return out;
}

function parseModule(module: string, source: string): Procedure[] {
  const procedures: Procedure[] = [];
  let current: Procedure | undefined;
  let step: Step | undefined;
  for (const line of source.split("\n")) {
    const header = /^export function (\w+)\(m: Cpu\): void \{/.exec(line);
    if (header) {
      current = { module, name: header[1]!, entry: -1, steps: new Map(), before: new Map() };
      procedures.push(current);
      step = undefined;
      continue;
    }
    if (!current) continue;
    const start = /^  let ip = 0x([0-9a-f]+);/.exec(line);
    if (start) {
      current.entry = hex(start[1]!);
      continue;
    }
    const comment = /^        \/\/ ([0-9a-f]+): (.*)$/.exec(line);
    if (comment) {
      const text = comment[2]!.trim();
      const [mnemonic = "", rest = ""] = text.split(/ (.*)/s);
      step = { at: hex(comment[1]!), mnemonic, operands: rest ? rest.split(", ").map((part) => part.trim()) : [], text, next: [] };
      current.steps.set(step.at, step);
      const far = /^lcall 0x([0-9a-f]+), 0x([0-9a-f]+)$/.exec(text);
      const near = /^call 0x([0-9a-f]+)$/.exec(text);
      // Far calls name START.EXE by paragraph and offset; the overlay slices are reached through stubs.
      if (far) step.calls = { module: "exe", entry: hex(far[1]!) * 16 + hex(far[2]!), far: true };
      else if (near) step.calls = { module, entry: hex(near[1]!), far: false };
      continue;
    }
    if (!step) continue;
    for (const target of line.matchAll(/ip = (?:[^;]*\? )?0x([0-9a-f]+)(?: : 0x([0-9a-f]+))?;/g)) {
      step.next.push(hex(target[1]!));
      if (target[2]) step.next.push(hex(target[2]));
    }
  }
  for (const procedure of procedures) {
    for (const s of procedure.steps.values()) {
      for (const n of s.next) {
        const list = procedure.before.get(n) ?? [];
        list.push(s.at);
        procedure.before.set(n, list);
      }
    }
  }
  return procedures;
}

interface Callee {
  /** Registers the procedure, or anything it calls, can write; `all` when that is not known. */
  writes: { reg: string; half: Half }[] | "all";
  /** Bytes its return takes off the stack, return address included; undefined when not one value. */
  pops: number | undefined;
}

export function dosCallSites(directory: string): DosCallSite[] {
  const procedures: Procedure[] = [];
  for (const file of readdirSync(directory).filter((name) => /^(exe|ovl\d+)\.ts$/.test(name)).sort()) {
    procedures.push(...parseModule(file.replace(/\.ts$/, ""), readFileSync(join(directory, file), "utf8")));
  }
  const byEntry = new Map(procedures.map((p) => [`${p.module}:${p.entry}`, p]));
  const callers = new Map<string, { procedure: Procedure; step: Step }[]>();
  for (const procedure of procedures) {
    for (const s of procedure.steps.values()) {
      if (!s.calls) continue;
      const key = `${s.calls.module}:${s.calls.entry}`;
      const list = callers.get(key) ?? [];
      list.push({ procedure, step: s });
      callers.set(key, list);
    }
  }

  // An entry nothing calls could still be reached through a pointer, and code builds a pointer
  // from the entry's offset in its segment as an immediate. START.EXE's segments are the
  // paragraphs far calls name.
  const immediates = new Set<number>();
  const segments = new Set<number>();
  for (const procedure of procedures) {
    for (const s of procedure.steps.values()) {
      const far = /^lcall 0x([0-9a-f]+), /.exec(s.text);
      if (far) segments.add(hex(far[1]!) * 16);
      // A branch's target is not a value the program keeps.
      if (/^(j[a-z]*|ljmp|call|lcall|loop[a-z]*)$/.test(s.mnemonic)) continue;
      for (const operand of s.operands) {
        const value = immediate(operand);
        if (value !== undefined) immediates.add(value);
      }
    }
  }
  const bases = [...segments].sort((a, b) => a - b);
  const offsetInSegment = (p: Procedure) => p.module !== "exe" ? p.entry
    : p.entry - (bases.filter((base) => base <= p.entry).at(-1) ?? 0);

  const summaries = new Map<string, Callee>();
  const summary = (module: string, entry: number): Callee => {
    const key = `${module}:${entry}`;
    const known = summaries.get(key);
    if (known) return known;
    const procedure = byEntry.get(key);
    const result: Callee = { writes: "all", pops: undefined };
    summaries.set(key, result);
    if (!procedure) return result;
    const written: { reg: string; half: Half }[] = [];
    const pops = new Set<number>();
    let all = false;
    for (const s of procedure.steps.values()) {
      const own = writes(s);
      if (own === "all") all = true;
      else written.push(...own);
      if (s.mnemonic === "ret" || s.mnemonic === "retf") pops.add((s.mnemonic === "ret" ? 2 : 4) + (immediate(s.operands[0]) ?? 0));
      if (s.calls) {
        const inner = summary(s.calls.module, s.calls.entry);
        if (inner.writes === "all") all = true;
        else written.push(...inner.writes);
      } else if (/^l?call$/.test(s.mnemonic)) all = true;
    }
    result.writes = all ? "all" : written;
    result.pops = pops.size === 1 ? [...pops][0] : undefined;
    return result;
  };

  type Back = { value: number } | { dynamic: true } | { want: Want };
  /** What AH (or the word followed) was before `step`, given what it is after. */
  const back = (step: Step, want: Want): Back => {
    const { mnemonic, operands } = step;
    if (step.calls || /^l?call$/.test(mnemonic)) {
      if (!step.calls) return { dynamic: true };
      const callee = summary(step.calls.module, step.calls.entry);
      if (want.slot === undefined) {
        if (callee.writes === "all" || callee.writes.some((w) => w.reg === want.reg && overlaps(w.half, want.half))) return { dynamic: true };
        return { want };
      }
      if (callee.pops === undefined) return { dynamic: true };
      // The call pushes its return address and the return takes it and any arguments off.
      return { want: { slot: want.slot + (callee.pops - (step.calls.far ? 4 : 2)) / 2, half: want.half } };
    }
    if (want.slot !== undefined) {
      if (mnemonic === "push" || mnemonic === "pushf") {
        if (want.slot > 0) return { want: { slot: want.slot - 1, half: want.half } };
        const source = register(operands[0]);
        const value = immediate(operands[0]);
        if (mnemonic === "push" && source?.half === "w") return { want: { reg: source.reg, half: want.half } };
        if (mnemonic === "push" && value !== undefined) return { value: pick(value, want.half) };
        return { dynamic: true };
      }
      if (mnemonic === "pop" || mnemonic === "popf") return { want: { slot: want.slot + 1, half: want.half } };
      if ((mnemonic === "add" || mnemonic === "sub") && operands[0] === "sp" && immediate(operands[1]) !== undefined) {
        const slot = want.slot + (mnemonic === "add" ? 1 : -1) * immediate(operands[1])! / 2;
        return slot < 0 ? { dynamic: true } : { want: { slot, half: want.half } };
      }
      const own = writes(step);
      if (own === "all" ? mnemonic !== "int" : own.some((w) => w.reg === "sp")) return { dynamic: true };
      return { want };
    }
    const own = writes(step);
    if (own === "all") return { dynamic: true };
    if (!own.some((w) => w.reg === want.reg && overlaps(w.half, want.half))) return { want };
    const destination = register(operands[0]);
    const source = register(operands[1]);
    if (mnemonic === "mov" && destination && destination.reg === want.reg) {
      const value = immediate(operands[1]);
      if (destination.half === "w") {
        if (value !== undefined) return { value: pick(value, want.half) };
        if (source?.half === "w") return { want: { reg: source.reg, half: want.half } };
      } else if (want.half === destination.half) {
        if (value !== undefined) return { value: value & 0xff };
        if (source && source.half !== "w") return { want: { reg: source.reg, half: source.half } };
      }
      return { dynamic: true };
    }
    if ((mnemonic === "xor" || mnemonic === "sub") && operands[0] === operands[1] && destination?.reg === want.reg &&
        (destination.half === "w" || destination.half === want.half)) return { value: 0 };
    if (mnemonic === "pop" && destination?.half === "w" && destination.reg === want.reg) return { want: { slot: 0, half: want.half } };
    if (mnemonic === "xchg" && destination && source && (destination.half === "w") === (source.half === "w")) {
      const [mine, other] = destination.reg === want.reg ? [destination, source] : [source, destination];
      if (mine.reg === want.reg && (mine.half === "w" || mine.half === want.half)) {
        return { want: { reg: other.reg, half: other.half === "w" ? want.half : other.half } };
      }
    }
    return { dynamic: true };
  };

  const sites: DosCallSite[] = [];
  for (const procedure of procedures) {
    for (const s of procedure.steps.values()) {
      if (s.text !== "int 0x21") continue;
      const functions = new Set<number>();
      const dynamic = new Set<string>();
      const uncalled = new Set<string>();
      const seen = new Set<string>();
      // Each entry is what is wanted just before the instruction at `at` runs.
      const queue: { procedure: Procedure; at: number; want: Want }[] = [{ procedure, at: s.at, want: { reg: "ax", half: "h" } }];
      const visit = (p: Procedure, at: number, want: Want) => {
        const key = `${p.module}:${at}:${want.slot ?? want.reg}:${want.half}`;
        if (seen.has(key)) return;
        seen.add(key);
        queue.push({ procedure: p, at, want });
      };
      while (queue.length) {
        const { procedure: p, at, want } = queue.pop()!;
        if (at === p.entry) {
          const from = callers.get(`${p.module}:${p.entry}`) ?? [];
          if (!from.length && immediates.has(offsetInSegment(p))) {
            dynamic.add(`${p.module} ${p.name}: no call names it, but its offset 0x${offsetInSegment(p).toString(16)} is an immediate`);
          } else if (!from.length) uncalled.add(`${p.module} ${p.name}`);
          for (const call of from) {
            if (want.slot === undefined) visit(call.procedure, call.step.at, want);
            else {
              // At the entry the return address is on top of what the caller pushed.
              const slot = want.slot - (call.step.calls!.far ? 2 : 1);
              if (slot < 0) dynamic.add(`${p.module} ${p.name}: its return address`);
              else visit(call.procedure, call.step.at, { slot, half: want.half });
            }
          }
        }
        for (const previous of p.before.get(at) ?? []) {
          const step = p.steps.get(previous)!;
          const result = back(step, want);
          if ("value" in result) functions.add(result.value);
          else if ("dynamic" in result) dynamic.add(`${p.module} ${previous.toString(16)}: ${step.text}`);
          else visit(p, previous, result.want);
        }
      }
      sites.push({
        module: procedure.module, procedure: procedure.name, at: s.at,
        functions: [...functions].sort((a, b) => a - b), dynamic: [...dynamic], uncalled: [...uncalled],
      });
    }
  }
  return sites;
}
