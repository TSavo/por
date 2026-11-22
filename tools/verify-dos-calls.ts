/**
 * Every DOS function the translated program can ask for is one the port serves (#83).
 *
 *   npm run verify:dos-calls
 *
 * For both translations (src/translated, the first release; src/translated-1.3) tools/dos-calls.ts
 * finds each `int 21h` and the AH values that reach it. Each value is then put to the port's own
 * DOS layer (src/runtime/dos.ts) on a fresh machine: a function it does not serve throws
 * UnhandledDosCall, the error that would stop a game reaching that call. Red while any `int 21h`
 * can ask for such a function, or has an AH the walk cannot follow. Needs no game files.
 */
import { Cpu } from "../src/cpu/machine.js";
import { attachDos, UnhandledDosCall } from "../src/runtime/dos.js";
import { dosCallSites } from "./dos-calls.js";
import { fromPortRoot } from "./port-root.js";

const hex = (n: number) => n.toString(16).padStart(2, "0");

/** Whether the port's DOS layer serves this function, asked with otherwise empty registers. */
function served(ah: number): boolean {
  const m = new Cpu();
  m.ds = m.es = m.ss = 0x2000;
  m.sp = 0xff00;
  attachDos(m, []);
  m.ah = ah;
  m.al = 0;
  try {
    m.intr(0x21);
  } catch (error) {
    if (error instanceof UnhandledDosCall) return false;
  }
  return true;
}

// What the four functions that were missing (Set Date, Set Time, Remove Directory, Rename) do.
function checkServedFunctions(): void {
  const closed: string[] = [];
  const deleted: string[] = [];
  const m = new Cpu();
  m.ds = m.es = m.ss = 0x2000;
  m.sp = 0xff00;
  attachDos(m, [{ name: "SAVE\\OLD.DAT", data: Uint8Array.of(7) }, { name: "SAVE\\KEEP.DAT", data: Uint8Array.of(8) }], [],
    undefined, (name) => closed.push(name), (name) => deleted.push(name));
  const call = (ah: number, set: () => void = () => {}) => {
    set();
    m.ah = ah;
    m.cf = false;
    m.intr(0x21);
  };
  const path = (offset: number, text: string, segment = m.ds) => {
    for (let i = 0; i < text.length; i++) m.write8(segment, offset + i, text.charCodeAt(i));
    m.write8(segment, offset + text.length, 0);
    return offset;
  };
  const expect = (ok: boolean, what: string) => {
    if (!ok) throw new Error(`DOS layer: ${what}`);
  };

  call(0x2a);
  expect(m.cx === 1988 && m.dx === 0x0601 && m.al === 3, "the date before any Set Date is no longer Wednesday 1 June 1988");
  call(0x2b, () => { m.cx = 2026; m.dh = 11; m.dl = 22; });
  expect(m.al === 0, "Set Date refused 22 November 2026");
  call(0x2a);
  expect(m.cx === 2026 && m.dx === 0x0b16 && m.al === 0, "Get Date does not report the date set (a Sunday)");
  call(0x2b, () => { m.cx = 2026; m.dh = 2; m.dl = 29; });
  expect(m.al === 0xff, "Set Date took 29 February 2026");
  call(0x2a);
  expect(m.cx === 2026 && m.dx === 0x0b16, "a refused Set Date changed the date");

  call(0x2d, () => { m.ch = 8; m.cl = 15; m.dh = 30; m.dl = 25; });
  expect(m.al === 0, "Set Time refused 08:15:30.25");
  call(0x2c);
  expect(m.cx === 0x080f && m.dx === 0x1e19, "Get Time does not start from the time set");
  call(0x2d, () => { m.ch = 24; m.cl = 0; m.dh = 0; m.dl = 0; });
  expect(m.al === 0xff, "Set Time took 24:00");

  call(0x39, () => { m.dx = path(0x100, "EMPTY"); });
  call(0x3a, () => { m.dx = path(0x100, "EMPTY"); });
  expect(!m.cf, "Remove Directory refused an empty directory");
  call(0x3a, () => { m.dx = path(0x100, "EMPTY"); });
  expect(m.cf && m.ax === 3, "Remove Directory removed a directory twice");
  call(0x3a, () => { m.dx = path(0x100, "SAVE"); });
  expect(m.cf && m.ax === 5, "Remove Directory removed a directory with files in it");

  const rename = (from: string, to: string) => call(0x56, () => { m.dx = path(0x100, from); m.di = path(0x200, to, m.es); });
  rename("SAVE\\OLD.DAT", "SAVE\\NEW.DAT");
  expect(!m.cf, "Rename refused a file");
  expect(closed.join() === "SAVE\\NEW.DAT" && deleted.join() === "SAVE\\OLD.DAT",
    "a renamed file is not kept under its new name and dropped under its old one");
  const read = (name: string): number | undefined => {
    call(0x3d, () => { m.al = 0; m.dx = path(0x100, name); });
    if (m.cf) return undefined;
    const handle = m.ax;
    call(0x3f, () => { m.bx = handle; m.cx = 1; m.dx = 0x300; });
    call(0x3e, () => { m.bx = handle; });
    return m.read8(m.ds, 0x300);
  };
  expect(read("SAVE\\NEW.DAT") === 7 && read("SAVE\\OLD.DAT") === undefined, "the renamed file is not under its new name only");
  rename("SAVE\\OLD.DAT", "SAVE\\OTHER.DAT");
  expect(m.cf && m.ax === 2, "Rename of a missing file did not fail with file not found");
  rename("SAVE\\NEW.DAT", "SAVE\\KEEP.DAT");
  expect(m.cf && m.ax === 5 && read("SAVE\\KEEP.DAT") === 8, "Rename overwrote a file");
  rename("SAVE\\NEW.DAT", "NOWHERE\\NEW.DAT");
  expect(m.cf && m.ax === 3, "Rename into a missing directory did not fail with path not found");
  console.log("verified Set Date, Set Time, Remove Directory and Rename in the DOS layer");
}

checkServedFunctions();

let left = 0;
const answers = new Map<number, boolean>();
for (const [label, directory] of [["first release", "translated"], ["1.3", "translated-1.3"]] as const) {
  const sites = dosCallSites(fromPortRoot("src", directory));
  const functions = new Map<number, number>();
  const unserved: string[] = [];
  const unresolved: string[] = [];
  for (const site of sites) {
    const where = `${site.module} ${site.at.toString(16)} (${site.procedure})`;
    for (const ah of site.functions) {
      functions.set(ah, (functions.get(ah) ?? 0) + 1);
      if (!answers.has(ah)) answers.set(ah, served(ah));
      if (!answers.get(ah)) unserved.push(`${where}: AH ${hex(ah)}`);
    }
    for (const reason of site.dynamic) unresolved.push(`${where}: AH from ${reason}`);
  }
  const list = [...functions.keys()].sort((a, b) => a - b).map(hex).join(" ");
  console.log(`${label}: ${sites.length} int 21h sites asking for ${functions.size} functions (${list}); ` +
    `${unserved.length} sites ask for a function the port does not serve, ${unresolved.length} have an AH not followed`);
  for (const line of [...unserved, ...unresolved]) console.log(`  ${line}`);
  left += unserved.length + unresolved.length;
}
if (left) {
  console.error(`${left} int 21h sites could stop the game: serve the function in src/runtime/dos.ts`);
  process.exit(1);
}
console.log("verified that the port serves every DOS function the translated program can ask for");
