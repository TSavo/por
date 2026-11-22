// The translated side of tools/qa-instruction-diff.py, which writes the inputs and reads the results.
//
//   node --import tsx tools/qa-instruction-diff-run.ts WORK_DIR TRIALS
//
// WORK_DIR/cases.jsonl lists the translated cases (one instruction each, with the case's TypeScript),
// states.bin holds TRIALS machine states per case and patterns.bin one megabyte of memory per trial.
// Each case runs alone on the port's Cpu from each state. Where it would leave the case (a call, a jump
// out of the procedure, a return, an interrupt) is recorded instead of followed. The results go to
// translated-<chunk>.jsonl, one line per case, in the order of cases.jsonl.

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Cpu } from "../src/cpu/machine.js";

const [work, trialText] = process.argv.slice(2);
if (!work || !trialText) throw new Error("usage: qa-instruction-diff-run.ts WORK_DIR TRIALS");
const trials = Number(trialText);
const MEMORY = 0x100000;
const STATE_WORDS = 14;
const REGS = ["ax", "bx", "cx", "dx", "si", "di", "bp", "sp", "ds", "es", "ss"] as const;

interface Spec { id: number; chunk: number; unit: string; addr: number; code: string; body: string }
const specs = readFileSync(join(work, "cases.jsonl"), "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line) as Spec);
const stateBytes = readFileSync(join(work, "states.bin"));
const states = new Uint16Array(stateBytes.buffer, stateBytes.byteOffset, stateBytes.byteLength / 2);
const patternBytes = readFileSync(join(work, "patterns.bin"));

/** Leaving the case: thrown by the stand-ins for nearCall and farCall. */
class Transfer {
  constructor(readonly kind: "near" | "far", readonly a: number, readonly b = 0) {}
}
type Run = (m: Cpu, nearCall: (m: Cpu, addr: number) => void, farCall: (m: Cpu, seg: number, off: number) => void) => number | undefined;
const nearCall = (_m: Cpu, addr: number): void => { throw new Transfer("near", addr); };
const farCall = (_m: Cpu, seg: number, off: number): void => { throw new Transfer("far", seg, off); };

const compiled: (Run | Error)[] = specs.map(spec => {
  try {
    return new Function("m", "nearCall", "farCall",
      `let ip = ${spec.addr};\nswitch (ip) {\ncase ${spec.addr}: {\n${spec.body}\n}\n}\nreturn ip;`) as Run;
  } catch (error) {
    return error as Error;
  }
});

const m = new Cpu();
let record: { kind: string; a: number; b: number; wrap: boolean; intr: number | null } =
  { kind: "", a: 0, b: 0, wrap: false, intr: null };
const written = new Set<number>();
const outs: [number, number][] = [];
let portValue = 0;
m.tick = () => {};
m.retn = (bytes: number) => {
  const ip = m.pop();
  m.sp = (m.sp + bytes) & 0xffff;
  record.kind = "ret"; record.a = ip;
};
m.retf = (bytes: number) => {
  const ip = m.pop();
  const cs = m.pop();
  m.sp = (m.sp + bytes) & 0xffff;
  record.kind = "retf"; record.a = cs; record.b = ip;
};
m.intr = (n: number) => { record.intr = n; };
m.portIn = () => portValue;
m.portOut = (port: number, value: number) => { outs.push([port & 0xffff, value & 0xff]); };
m.onMemoryWrite = (address: number) => { written.add(address); return false; };
// An 8086 wraps an access past offset FFFF to the start of the segment. Unicorn does not always: a word
// at FFFF, or the second word a far return pops at SP FFFE, is read past the segment's end. States in
// which one instruction touches a segment on both sides of its end are not compared.
const ends = new Map<number, number>();
const touch = (seg: number, off: number) => {
  off &= 0xffff;
  if (off < 0xfff0 && off >= 0x10) return;
  const sides = (ends.get(seg) ?? 0) | (off >= 0xfff0 ? 1 : 2);
  ends.set(seg, sides);
  if (sides === 3) record.wrap = true;
};
const read8 = m.read8.bind(m), write8 = m.write8.bind(m), read16 = m.read16.bind(m), write16 = m.write16.bind(m);
m.read8 = (seg: number, off: number) => { touch(seg, off); return read8(seg, off); };
m.write8 = (seg: number, off: number, value: number) => { touch(seg, off); write8(seg, off, value); };
m.read16 = (seg: number, off: number) => { if ((off & 0xffff) === 0xffff) record.wrap = true; return read16(seg, off); };
m.write16 = (seg: number, off: number, value: number) => { if ((off & 0xffff) === 0xffff) record.wrap = true; write16(seg, off, value); };

type Result = [regs: number[], flags: number, kind: string, a: number, b: number, writes: [number, number][],
  outs: [number, number][], wrap: number, error: string | null];
const chunks = new Map<number, number[]>();
for (const [index, spec] of specs.entries()) {
  const members = chunks.get(spec.chunk) ?? [];
  members.push(index);
  chunks.set(spec.chunk, members);
}
for (const [chunk, members] of chunks) {
  const results: Result[][] = members.map(() => []);
  for (let trial = 0; trial < trials; trial++) {
    const pattern = patternBytes.subarray(trial * MEMORY, (trial + 1) * MEMORY);
    m.mem.set(pattern);
    members.forEach((index, position) => results[position]!.push(runCase(index, trial, pattern)));
  }
  writeFileSync(join(work, `translated-${chunk}.jsonl`),
    members.map((index, position) => JSON.stringify({ id: specs[index]!.id, t: results[position] })).join("\n") + "\n");
}

function runCase(index: number, trial: number, pattern: Uint8Array): Result {
  const spec = specs[index]!;
  const base = (index * trials + trial) * STATE_WORDS;
  const state = states.subarray(base, base + STATE_WORDS);
  const cs = state[11]!;
  const start = ((cs << 4) + (spec.addr & 0xffff)) & 0xfffff;
  const code = Buffer.from(spec.code, "hex");
  m.mem.set(code, start);
  REGS.forEach((name, i) => { m[name] = state[i]!; });
  m.cs = cs;
  const flags = state[12]!;
  m.cf = (flags & 0x1) !== 0; m.pf = (flags & 0x4) !== 0; m.zf = (flags & 0x40) !== 0;
  m.sf = (flags & 0x80) !== 0; m.df = (flags & 0x400) !== 0; m.of = (flags & 0x800) !== 0;
  m.enforceCodeWheel = false;
  portValue = state[13]!;
  record = { kind: "", a: 0, b: 0, wrap: false, intr: null };
  written.clear();
  ends.clear();
  outs.length = 0;
  let error: string | null = null;
  const run = compiled[index]!;
  if (run instanceof Error) {
    error = `does not compile: ${run.message}`;
  } else {
    try {
      const ip = run(m, nearCall, farCall);
      if (record.intr !== null) { record.kind = "int"; record.a = record.intr; }
      else if (record.kind === "") {
        if (ip === undefined) record.kind = "halt";
        else { record.kind = "ip"; record.a = ip; }
      }
    } catch (thrown) {
      if (thrown instanceof Transfer) { record.kind = thrown.kind; record.a = thrown.a; record.b = thrown.b; }
      else if (thrown instanceof Error && /^i?div0$/.test(thrown.message)) record.kind = "fault";
      else error = thrown instanceof Error ? thrown.message : String(thrown);
    }
  }
  const regs = REGS.map(name => m[name] & 0xffff);
  const flagWord = 2 | (m.cf ? 0x1 : 0) | (m.pf ? 0x4 : 0) | (m.zf ? 0x40 : 0) | (m.sf ? 0x80 : 0) |
    (m.df ? 0x400 : 0) | (m.of ? 0x800 : 0);
  const writes: [number, number][] = [...written].sort((x, y) => x - y).map(address => [address, m.mem[address]!]);
  for (const address of written) m.mem[address] = pattern[address]!;
  m.mem.set(pattern.subarray(start, start + code.length), start);
  return [regs, flagWord, record.kind, record.a, record.b, writes, [...outs], record.wrap ? 1 : 0, error];
}

const failed = compiled.filter(entry => entry instanceof Error).length;
console.log(`translated side: ${specs.length} cases x ${trials} states${failed ? `, ${failed} did not compile` : ""}`);
