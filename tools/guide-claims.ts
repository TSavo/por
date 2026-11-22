// npm run qa:guide-claims
//
// The walkthroughs' concrete claims, each matched against the game's own data (#113). The claims are
// the acceptance catalogue's (qa/acceptance/*.json), which was written from Stephen S. Lee's guide and
// the SSI Clue Book (qa/research/guides-digest.md): its `data` and `fights` notes, and the game text
// its steps quote. Each is matched against the area scripts (ECL), the treasure item tables (ITEM),
// the monsters and what they carry (MON*CHA, MON*ITM) and the program's item name words, read from the
// GOG 1.3 files (POR_GAMEDATA) and from game/, the port's own data:
//
//   text      a quoted line of game text is in the scripts' text or the program's (menus, parley), whole or
//             in the pieces the game prints it in
//   password  each password is a word of the scripts' text
//   journal   "Journal Entry N": a script text gives ENTRY N (or ENTRIES ... N)
//   tale      "Tavern Tale N": the tavern's RANDOM range holds N
//   fight     every group "n NAME (#m)" is a LOAD MONSTER m, n (directly, or through the variables a
//             script saves the numbers in), and monster m of the script's archive is called NAME
//   monster   "NAME (#m)": monster m is called NAME
//   treasure  a TREASURE has exactly the coins named, and every item named is in its item block or
//             carried by a monster the scripts load (random magic items: item number 128 plus the count)
//
// Each claim is matched first in its area's scripts (the catalogue file's `scripts`) and then in every
// script: "in the area", "elsewhere" (the data has it, in another script: a commission's reward is paid
// at City Hall, not in the area) or "no match", with why. The journal's and tavern tales' own texts are
// only in the printed Adventurer's Journal, which has no text layer, so those claims are matched by the
// number the game prints. Coordinates, odds and rules are not claims of these kinds; the report counts
// the notes it left out.
//
// A claim the data contradicts is a guide's error: qa/guide-errata.json records each, with what the
// guide says, what the 1.3 data says and where, and the report accepts it as settled while it fails for
// exactly that reason. Exits 1 while any other claim has no match, or game/ and the 1.3 files differ.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, scriptFromBlock, type Instruction, type Operand } from "../src/lib/ecl.js";
import { gameFiles, gameProgram, isPortGameRoot, portGameRoot } from "./gamedata.js";
import { fromPortRoot } from "./port-root.js";

interface ItemRow { stored: string; identified: string }
interface Block { id: number; archive: number; instructions: Instruction[]; bytes: Uint8Array; base: number }
interface Data {
  name: string;
  /** Each script block by number. */
  scripts: Map<number, Block[]>;
  /** Item rows by "archive:block": the treasure tables (ITEM) and what each monster carries (MON*ITM, "m" before the archive). */
  items: Map<string, ItemRow[]>;
  monsters: Map<string, string>;
  /** The program's own text (START.EXE and GAME.OVR): menus and messages the engine prints, plain. */
  programText: string;
}

const immediate = (operand: Operand | undefined): number | undefined =>
  operand && operand.code === 0 ? operand.low : operand && operand.code === 2 && operand.word !== null ? operand.word : undefined;
/** The variable an operand names, when it names one. */
const variable = (operand: Operand | undefined): number | undefined =>
  operand && operand.code !== 0 && operand.code !== 2 && operand.code !== 0x80 ? operand.word ?? undefined : undefined;
const pascal = (bytes: Uint8Array, at = 0) => String.fromCharCode(...bytes.subarray(at + 1, at + 1 + bytes[at]!));

/** The item name words: Pascal strings in 21-byte slots, from "Battle Axe". */
function itemWords(image: Uint8Array): string[] {
  const start = Buffer.from(image).indexOf(Buffer.from("\x0aBattle Axe", "latin1"));
  if (start < 0) throw new Error("The program holds no item name words");
  const words: string[] = [];
  for (let at = start; at + 21 <= image.length && image[at]! < 21; at += 21) words.push(pascal(image, at));
  return words;
}

function load(name: string, root: string): Data {
  const files = new Map(gameFiles(root).map((file) => [file.name.toUpperCase().replace(/^.*[\\/]/, ""), file.data]));
  const words = itemWords(gameProgram(root).image);
  const word = (index: number) => index ? words[index - 1] ?? "" : "";
  const rows = (bytes: Uint8Array) => {
    const list: ItemRow[] = [];
    for (let at = 0; at + 63 <= bytes.length; at += 63) {
      const row = bytes.subarray(at, at + 63);
      // The name words are at 2f to 31, shown last first: "Ring", "of", "Feather Falling".
      list.push({ stored: pascal(row), identified: [word(row[0x31]!), word(row[0x30]!), word(row[0x2f]!)].filter(Boolean).join(" ") });
    }
    return list;
  };
  const printable = (bytes: Uint8Array) => (Buffer.from(bytes).toString("latin1").match(/[ -~]{4,}/g) ?? []).map(plain).filter(Boolean);
  const programText = ` ${[...printable(gameProgram(root).image), ...printable(files.get("GAME.OVR") ?? new Uint8Array())].join(" ")} `;
  const data: Data = { name, scripts: new Map(), items: new Map(), monsters: new Map(), programText };
  const archive = (file: string) => files.get(file) ? parseDax(file, files.get(file)!).entries : [];
  for (let n = 1; n <= 8; n++) {
    for (const entry of archive(`ECL${n}.DAX`)) {
      const list = data.scripts.get(entry.id) ?? [];
      const script = scriptFromBlock(entry.data);
      list.push({ id: entry.id, archive: n, instructions: disassemble(script).instructions, bytes: script.bytes, base: script.base });
      data.scripts.set(entry.id, list);
    }
    for (const entry of archive(`ITEM${n}.DAX`)) data.items.set(`${n}:${entry.id}`, rows(entry.data));
    for (const entry of archive(`MON${n}ITM.DAX`)) data.items.set(`m${n}:${entry.id}`, rows(entry.data));
    for (const entry of archive(`MON${n}CHA.DAX`)) data.monsters.set(`${n}:${entry.id}`, pascal(entry.data).trim());
  }
  return data;
}

/** Upper case, letters, digits and plus signs only, single spaces. */
const plain = (text: string) => text.toUpperCase().replace(/[^A-Z0-9+]+/g, " ").trim();
/** Item name tokens: no leading count, nothing in brackets (a scroll's spells), no plural s, hyphens as spaces. */
const itemTokens = (text: string) => plain(text.replace(/\([^)]*\)/g, " ").replace(/-/g, " ").replace(/^\s*\d+\s+/, ""))
  .split(" ").filter((token) => token && token !== "OF").map((token) => token.replace(/S$/, ""));

// ---- What the scripts hold -------------------------------------------------------------------
const textCache = new WeakMap<Block[], string>();
/** Every text of the blocks, plain, in instruction order, between spaces. */
function textOf(blocks: Block[]): string {
  if (!textCache.has(blocks)) {
    textCache.set(blocks, ` ${blocks.flatMap(({ instructions }) => instructions.flatMap(({ operands }) =>
      operands.map(({ text }) => text ?? ""))).map(plain).filter(Boolean).join(" ")} `);
  }
  return textCache.get(blocks)!;
}

interface Sources {
  /** Every value a SAVE puts in the variable. */
  saved: Map<number, Set<number>>;
  /** A GET TABLE that fills the variable: the table's bytes, read with the index variable. */
  tables: Map<number, { values: number[]; index: number | undefined }>;
}
const sourcesCache = new WeakMap<Block, Sources>();
/** Where a block's variables get their values: SAVE of a constant, and GET TABLE from a table in the script. */
function sourcesOf(block: Block): Sources {
  if (sourcesCache.has(block)) return sourcesCache.get(block)!;
  const saved = new Map<number, Set<number>>(), tables = new Map<number, { values: number[]; index: number | undefined }>();
  const reads = block.instructions.filter(({ name, operands }) => name === "GET TABLE" && variable(operands[0]) !== undefined);
  // A table ends where the next one the block reads begins; the last is as long as the one before it.
  const starts = [...new Set(reads.map(({ operands }) => variable(operands[0])!))].filter((at) => at >= block.base && at < block.base + block.bytes.length).sort((a, b) => a - b);
  const gaps = starts.slice(1).map((at, index) => at - starts[index]!);
  for (const { name, operands } of block.instructions) {
    if (name === "SAVE") {
      const value = immediate(operands[0]), into = variable(operands[1]);
      if (value !== undefined && into !== undefined) saved.set(into, (saved.get(into) ?? new Set()).add(value));
    } else if (name === "GET TABLE") {
      const at = variable(operands[0]), into = variable(operands[2]);
      const position = at === undefined ? -1 : starts.indexOf(at);
      if (position < 0 || into === undefined) continue;
      const length = Math.min(64, gaps[position] ?? gaps.at(-1) ?? 8);
      tables.set(into, { values: [...block.bytes.subarray(at! - block.base, at! - block.base + length)], index: variable(operands[1]) });
    }
  }
  const sources = { saved, tables };
  sourcesCache.set(block, sources);
  return sources;
}

/**
 * The values an instruction's operands can hold, as a list of possible assignments: one set of values
 * for each operand. Operands read from tables with the same index give one assignment for each entry.
 */
function assignments(block: Block, operands: Operand[]): Set<number>[][] {
  const { saved, tables } = sourcesOf(block);
  const fixed = operands.map((operand) => {
    const value = immediate(operand);
    if (value !== undefined) return new Set([value]);
    const name = variable(operand);
    if (name === undefined || tables.has(name)) return undefined;
    return saved.get(name) ?? new Set<number>();
  });
  const tabled = operands.map((operand) => tables.get(variable(operand) ?? -1));
  const indexes = new Set(tabled.filter(Boolean).map((table) => table!.index));
  if (!tabled.some(Boolean)) return [fixed as Set<number>[]];
  if (indexes.size === 1) {
    const length = Math.min(...tabled.filter(Boolean).map((table) => table!.values.length));
    return Array.from({ length }, (_, entry) => operands.map((_, slot) => fixed[slot] ?? new Set([tabled[slot]!.values[entry]!])));
  }
  return [operands.map((_, slot) => fixed[slot] ?? new Set(tabled[slot]!.values))];
}

/** The monsters a block loads: number and count, each a set of the values they can have. */
function monsterLoads(block: Block): { numbers: Set<number>; counts: Set<number> }[] {
  return block.instructions.filter(({ name }) => name === "LOAD MONSTER")
    .flatMap(({ operands }) => assignments(block, operands).map(([numbers, counts]) => ({ numbers: numbers!, counts: counts! })));
}

// ---- Claims ----------------------------------------------------------------------------------
type Matcher = (data: Data, blocks: Block[]) => string | undefined;
interface Claim { file: string; scenario: string; kind: string; text: string; scripts: number[]; match: Matcher }

/**
 * A quoted line is in the text when it is there whole, or in parts in its order: the game prints many
 * lines in pieces ("YOU ARE JUST " + "NORTH" + " OF KUTO'S WELL."). Each part is the longest run of
 * the line's next words the text holds; at least half the words must be in parts of three or more.
 */
function inText(text: string, fragment: string): "whole" | "parts" | false {
  if (text.includes(` ${fragment} `)) return "whole";
  const words = fragment.split(" ");
  let at = 0, long = 0, single = false;
  while (at < words.length) {
    let end = words.length;
    while (end > at + 1 && !text.includes(` ${words.slice(at, end).join(" ")} `)) end--;
    if (!text.includes(` ${words.slice(at, end).join(" ")} `)) return false;
    if (end - at >= 3) long += end - at;
    if (end - at === 1) single = true;
    at = end;
  }
  // A menu is its title and its choices: "CONTINUE BATTLE:" and "YES NO".
  return long * 2 >= words.length || !single ? "parts" : false;
}
/** The text claims each source matched only in parts, for the report. */
const inParts = new Map<string, Set<string>>();
function textClaim(fragment: string): Matcher {
  return (data, blocks) => {
    const found = inText(`${textOf(blocks)}${data.programText}`, fragment);
    if (found === "parts") inParts.set(data.name, (inParts.get(data.name) ?? new Set()).add(fragment));
    return found ? undefined : "no script or program text has it";
  };
}
function passwordClaim(word: string): Matcher {
  return (_, blocks) => textOf(blocks).includes(` ${word} `) ? undefined : "no script text has the word";
}
function journalClaim(number: number): Matcher {
  return (_, blocks) => {
    const said = new Set<number>();
    for (const [, list] of textOf(blocks).matchAll(/ ENTR(?:Y|IES)((?: (?:AND )?\d+)+)/g)) {
      for (const found of list!.match(/\d+/g) ?? []) said.add(Number(found));
    }
    // " YOU RECORD IT IN YOUR JOURNAL UNDER ENTRY " is a subroutine's; the caller prints the number ("20.").
    for (const { instructions } of blocks) {
      const texts = instructions.flatMap(({ operands }) => operands.map(({ text }) => text === null ? "" : plain(text)));
      if (texts.some((text) => text.endsWith(" ENTRY"))) for (const text of texts) if (/^\d+$/.test(text)) said.add(Number(text));
    }
    return said.has(number) ? undefined : `no script text says ENTRY ${number}`;
  };
}
function taleClaim(number: number, all = false): Matcher {
  return (data) => {
    for (const block of [...data.scripts.values()].flat()) {
      const at = block.instructions.findIndex(({ operands }) => operands.some(({ text }) => text !== null && plain(text).includes("TAVERN TALE")));
      if (at < 0) continue;
      const top = immediate(block.instructions.slice(at, at + 6).find(({ name }) => name === "RANDOM")?.operands[0]);
      if (top === undefined) return "the tavern's tale number is not a RANDOM of a constant";
      // RANDOM n draws 0 to n, and the tavern adds 1: tales 1 to n + 1.
      return (all ? number === top + 1 : number >= 1 && number <= top + 1) ? undefined : `the tavern draws tales 1 to ${top + 1}`;
    }
    return "no script prints TAVERN TALE";
  };
}
/** A monster's name as the guides and the game both may write it: LVL is LEVEL, LDR is LEADER. */
const monsterKey = (name: string) => plain(name).replace(/\bLVL\b/g, "LEVEL").replace(/\bLDR\b/g, "LEADER");
function monsterName(data: Data, blocks: Block[], number: number, name: string): string | undefined {
  const archives = [...new Set(blocks.map(({ archive }) => archive))];
  const names = archives.map((archive) => data.monsters.get(`${archive}:${number}`)).filter((found): found is string => found !== undefined);
  return names.some((found) => monsterKey(found) === monsterKey(name)) ? undefined
    : `#${number} is ${[...new Set(names)].map((found) => `'${found}'`).join(" or ") || "no monster"} in MON${archives.join("/")}CHA.DAX`;
}
function monsterClaim(number: number, name: string): Matcher {
  return (data, blocks) => monsterName(data, blocks, number, name);
}
function fightClaim(groups: { count?: number; name: string; number: number }[]): Matcher {
  return (data, blocks) => {
    const loads = blocks.flatMap((block) => monsterLoads(block).map((load) => ({ ...load, block })));
    const problems: string[] = [];
    for (const group of groups) {
      const same = loads.filter(({ numbers }) => numbers.has(group.number));
      if (!same.length) { problems.push(`no script loads monster #${group.number}`); continue; }
      if (group.count !== undefined && !same.some(({ counts }) => counts.has(group.count!))) {
        problems.push(`#${group.number} is loaded ${[...new Set(same.flatMap(({ counts }) => [...counts]))].join(" or ") || "a number no script saves"}, not ${group.count}`);
      }
      const named = monsterName(data, [...new Set(same.map(({ block }) => block))], group.number, group.name);
      if (named) problems.push(named);
    }
    return problems.length ? problems.join("; ") : undefined;
  };
}

const COINS = ["copper", "silver", "electrum", "gold", "platinum", "gems", "jewelry"];
const coinOf = (word: string): number => {
  const coin = word.toLowerCase();
  return ({ copper: 0, cp: 0, silver: 1, sp: 1, electrum: 2, ep: 2, gold: 3, gp: 3, platinum: 4, pp: 4, gem: 5, gems: 5, jewelry: 6, jewel: 6, jewels: 6 } as Record<string, number>)[coin] ?? -1;
};
interface Treasure { coins?: number[]; items: string[][]; random?: number }
function parseTreasure(entry: string, vocabulary: Set<string>, nouns: Set<string>): Treasure | undefined {
  const body = entry.replace(/^Reward:\s*/i, "").replace(/\(([^)]*XP[^)]*)\)/gi, "").replace(/\bVs\./g, "vs").replace(/\.$/, "").trim();
  if (!body || /[=:;]|\bper\b|\bor\b/i.test(body)) return undefined;
  const parts = body.split(/,\s*|\s+\+\s+/).reduce<string[]>((joined, part) => {
    // "Two-Handed Sword +1, +3 Vs. Undead" is one item.
    if (/^\+\d/.test(part) && joined.length) joined[joined.length - 1] += ` ${part}`;
    else joined.push(part);
    return joined;
  }, []);
  const treasure: Treasure = { items: [] };
  for (const part of parts.map((part) => part.trim()).filter(Boolean)) {
    const coin = /^(\d+)\s+([A-Za-z]+)$/.exec(part);
    if (coin && coinOf(coin[2]!) >= 0) {
      treasure.coins ??= [0, 0, 0, 0, 0, 0, 0];
      treasure.coins[coinOf(coin[2]!)] += Number(coin[1]);
      continue;
    }
    const random = /^(\d+) random magic items?$/i.exec(part);
    if (random) { treasure.random = Number(random[1]); continue; }
    // An item is named in the program's item words and names a kind of thing ("magic-user 6" is not one).
    const tokens = itemTokens(part);
    if (!tokens.length || !tokens.every((token) => vocabulary.has(token)) || !tokens.some((token) => nouns.has(token))) return undefined;
    treasure.items.push(tokens);
  }
  return treasure.coins || treasure.items.length || treasure.random ? treasure : undefined;
}
const describeCoins = (coins: number[]) => coins.map((amount, slot) => amount ? `${amount} ${COINS[slot]}` : "").filter(Boolean).join(", ") || "no coins";
const holds = (rows: ItemRow[] | undefined, tokens: string[]) => rows?.some((row) => [row.identified, row.stored].some((name) => {
  const have = new Set(itemTokens(name));
  return tokens.every((token) => have.has(token));
})) ?? false;
function treasureClaim(treasure: Treasure): Matcher {
  return (data, blocks) => {
    // What the monsters the scripts load carry.
    const carried = blocks.flatMap((block) => monsterLoads(block).flatMap(({ numbers }) =>
      [...numbers].map((number) => data.items.get(`m${block.archive}:${number}`) ?? []))).flat();
    let closest = "";
    for (const block of blocks) {
      for (const { name, operands } of block.instructions) {
        if (name !== "TREASURE") continue;
        for (const values of assignments(block, operands)) {
          // Copper, silver, electrum, gold, platinum, gems, jewelry, then the item block.
          if (treasure.coins && treasure.coins.some((amount, slot) => !values[slot]!.has(amount))) continue;
          const items = [...values[7]!];
          if (treasure.random !== undefined && !values[7]!.has(128 + treasure.random)) {
            closest = `the TREASURE with those coins has item number ${items.join(" or ")}, not ${128 + treasure.random}`;
            continue;
          }
          const rows = items.flatMap((item) => data.items.get(`${block.archive}:${item}`) ?? []);
          const missing = treasure.items.filter((tokens) => !holds(rows, tokens) && !holds(carried, tokens));
          if (missing.length) {
            closest = `the TREASURE's ITEM${block.archive}.DAX block ${items.join(" or ")} holds ${rows.map((row) => row.identified || row.stored).join(", ") || "nothing"}`;
            continue;
          }
          return undefined;
        }
      }
    }
    // Items with no coins named: what a monster of the scripts carries is the treasure too.
    if (!treasure.coins && treasure.random === undefined && treasure.items.every((tokens) => holds(carried, tokens))) return undefined;
    return closest || (treasure.coins ? `no TREASURE with ${describeCoins(treasure.coins)}` : "no treasure block or monster of the scripts has these items");
  };
}

function claims(vocabulary: Set<string>, nouns: Set<string>): { list: Claim[]; leftOut: number; entries: number } {
  const list: Claim[] = [];
  let leftOut = 0, entries = 0;
  const directory = fromPortRoot("qa", "acceptance");
  for (const file of readdirSync(directory).filter((name) => /^\d.*\.json$/.test(name)).sort()) {
    const area = JSON.parse(readFileSync(join(directory, file), "utf8")) as
      { scripts: string[]; scenarios: { id: string; data?: string[]; fights?: string[]; steps?: string[]; expect?: string[] }[] };
    const scripts = area.scripts.map((name) => Number(/\d+/.exec(name)![0]));
    for (const scenario of area.scenarios) {
      const add = (kind: string, text: string, match: Matcher) => list.push({ file, scenario: scenario.id, kind, text, scripts, match });
      const quoted = new Set<string>();
      for (const line of [...scenario.steps ?? [], ...scenario.expect ?? [], ...scenario.data ?? []]) {
        for (const [, quote] of line.matchAll(/(?<![A-Za-z])'([A-Z0-9][\s\S]*?[A-Z0-9.!?,)])'(?![A-Za-z])/g)) {
          const letters = quote!.replace(/[^A-Za-z]/g, "");
          if (letters.length < 12 || letters.replace(/[^a-z]/g, "").length > letters.length / 10) continue;
          // "YOU ARE JUST SOUTH/WEST/NORTH/EAST OF KUTO'S WELL" is four lines.
          const choices = [...quote!.matchAll(/[A-Z']+(?:\/[A-Z']+)+/g)].map(([group]) => group.split("/"));
          const variants = choices.length ? Array.from({ length: Math.max(...choices.map((list) => list.length)) }, (_, pick) => {
            let index = 0;
            return quote!.replace(/[A-Z']+(?:\/[A-Z']+)+/g, () => { const list = choices[index++]!; return list[Math.min(pick, list.length - 1)]!; });
          }) : [quote!];
          for (const variant of variants) {
            // Game text is upper case: a lower-case word is the catalogue's own between two quotes.
            for (const fragment of variant.split(/\.\.\.|…|[^A-Z]*[a-z][^A-Z]*/).map(plain).filter((part) => part.split(" ").length >= 4)) quoted.add(fragment);
          }
        }
      }
      for (const fragment of quoted) add("text", fragment, textClaim(fragment));
      for (const entry of scenario.data ?? []) {
        entries++;
        const before = list.length;
        const password = /password[^:]*:\s*(.+)$/i.exec(entry);
        for (const word of password?.[1]!.match(/\b[A-Z]{3,}\b/g) ?? []) add("password", word, passwordClaim(word));
        for (const [, number] of entry.matchAll(/Journal Entry (\d+)/gi)) add("journal", `Journal Entry ${number}`, journalClaim(Number(number)));
        for (const [, number] of entry.matchAll(/Tavern Tale (\d+)/gi)) add("tale", `Tavern Tale ${number}`, taleClaim(Number(number)));
        if (/\btales\b.*:/i.test(entry)) {
          for (const [, number] of entry.matchAll(/(?:^|[:;,]\s*)(\d+) \(/g)) add("tale", `Tavern Tale ${number}`, taleClaim(Number(number)));
        }
        const allTales = /All (\d+) tales/i.exec(entry);
        if (allTales) add("tale", `${allTales[1]} tavern tales`, taleClaim(Number(allTales[1]), true));
        for (const [, found, number] of entry.matchAll(/([A-Z0-9][A-Z0-9 .'-]*[A-Z0-9]) \(#(\d+)\)/g)) {
          const name = found!.replace(/^\d+\s+(?=[A-Z0-9])/, "");
          add("monster", `${name} (#${number})`, monsterClaim(Number(number), name));
        }
        const treasure = parseTreasure(entry, vocabulary, nouns);
        if (treasure) add("treasure", entry, treasureClaim(treasure));
        if (list.length === before) leftOut++;
      }
      for (const entry of scenario.fights ?? []) {
        entries++;
        // "11 each of three consecutive entries ...: 1 NOMAD (#40), 2 ..." numbers the table's entries, not counts.
        const counted = !/\beach of\b/i.test(entry);
        // A group is "[count] NAME (#number)" after the start, a comma, a plus, a slash, a colon or a quote.
        const groups = [...entry.matchAll(/(?:^|[,+/:;'(]\s*)(?:(\d+|\[PS\]) )?([A-Z][A-Z0-9 .'-]*?|\d+(?:ST|ND|RD|TH) [A-Z0-9 .'-]*?) \(#(\d+)\)/g)]
          .map(([, count, name, number]) => ({ count: count === undefined || count === "[PS]" || !counted ? undefined : Number(count), name: name!, number: Number(number) }));
        if (!groups.length) { leftOut++; continue; }
        add("fight", entry, fightClaim(groups));
      }
    }
  }
  return { list, leftOut, entries };
}

// ---- Report ----------------------------------------------------------------------------------
const sources: Data[] = [];
const original = process.env.POR_GAMEDATA;
if (original && !isPortGameRoot(original)) sources.push(load("1.3 files", original));
else console.log("POR_GAMEDATA names no original files: matching against game/ only.");
sources.push(load("game/", portGameRoot));

const words = itemWords(gameProgram(portGameRoot).image);
const vocabulary = new Set(words.flatMap(itemTokens));
// The words for kinds of things come first in the table, up to "Wagon"; then "+1", "of", "Displacement" ...
const nouns = new Set(words.slice(0, words.indexOf("Wagon") + 1).flatMap(itemTokens));
const { list, leftOut, entries } = claims(vocabulary, nouns);
type Outcome = { status: "area" | "elsewhere" | "none"; why?: string };
const everything = new Map(sources.map((data) => [data, [...data.scripts.values()].flat()]));
const areaCache = new Map<string, Block[]>();
const outcome = (claim: Claim, data: Data): Outcome => {
  const key = `${data.name}|${claim.scripts.join()}`;
  if (!areaCache.has(key)) areaCache.set(key, claim.scripts.length ? claim.scripts.flatMap((id) => data.scripts.get(id) ?? []) : everything.get(data)!);
  const why = claim.match(data, areaCache.get(key)!);
  if (!why) return { status: "area" };
  return claim.match(data, everything.get(data)!) ? { status: "none", why } : { status: "elsewhere", why };
};
const results = list.map((claim) => ({ claim, outcomes: sources.map((data) => outcome(claim, data)) }));
const kinds = [...new Set(list.map(({ kind }) => kind))];
console.log(`Guide claims from qa/acceptance (Lee guide, Clue Book): ${list.length} claims; ` +
  `${leftOut} of ${entries} data and fight notes are not claims of these kinds (coordinates, odds, rules).\n`);
console.log(`${"kind".padEnd(10)}${"claims".padStart(7)}${sources.map(({ name }) => `   ${name}: area + elsewhere = matched`.padStart(44)).join("")}`);
for (const kind of [...kinds, "total"]) {
  const rows = results.filter(({ claim }) => kind === "total" || claim.kind === kind);
  const cells = sources.map((_, index) => {
    const area = rows.filter(({ outcomes }) => outcomes[index]!.status === "area").length;
    const elsewhere = rows.filter(({ outcomes }) => outcomes[index]!.status === "elsewhere").length;
    return `${area} + ${elsewhere} = ${area + elsewhere} / ${rows.length}`.padStart(44);
  });
  console.log(`${kind.padEnd(10)}${String(rows.length).padStart(7)}${cells.join("")}`);
}
console.log(`\nText claims matched in parts (a line the game prints in pieces): ${sources.map(({ name }) => `${name} ${inParts.get(name)?.size ?? 0}`).join(", ")}.`);
const show = (claim: Claim) => claim.text.length > 110 ? `${claim.text.slice(0, 107)}...` : claim.text;
const differ = results.filter(({ outcomes }) => new Set(outcomes.map(({ status }) => status)).size > 1);
if (differ.length) {
  console.log(`\n${differ.length} claims where game/ and the 1.3 files differ:`);
  for (const { claim, outcomes } of differ) {
    console.log(`  ${claim.scenario}  ${claim.kind}  ${show(claim)}\n      ${sources.map(({ name }, index) => `${name}: ${outcomes[index]!.status}`).join(" | ")}`);
  }
}
if (differ.length) process.exitCode = 1;

// The guides' errors (qa/guide-errata.json): a claim the data contradicts is settled while it has no
// match, in every source, for exactly the reason recorded.
interface Erratum { scenario: string; kind: string; claim: string; guide: string; data: string; where: string; noMatch: string }
const errata = (JSON.parse(readFileSync(fromPortRoot("qa", "guide-errata.json"), "utf8")) as { errata: Erratum[] }).errata;
const erratumFor = (claim: Claim) => errata.find((erratum) => erratum.scenario === claim.scenario && erratum.kind === claim.kind && erratum.claim === claim.text);
const unmatched = results.filter(({ outcomes }) => outcomes.some(({ status }) => status === "none"));
const settled = unmatched.filter(({ claim, outcomes }) => outcomes.every(({ why }) => why === erratumFor(claim)?.noMatch));
const open = unmatched.filter((result) => !settled.includes(result));
const stale = errata.filter((erratum) => !settled.some(({ claim }) => erratumFor(claim) === erratum));
console.log(`\n${settled.length} claims with no match are recorded guide errata (qa/guide-errata.json):`);
for (const { claim } of settled) {
  const erratum = erratumFor(claim)!;
  console.log(`  ${claim.scenario}  ${claim.kind}  the guide: ${erratum.guide}\n      the 1.3 data: ${erratum.data} (${erratum.where})`);
}
if (open.length) {
  console.log(`\n${open.length} claims with no match in the data (scenario, kind, claim: why):`);
  for (const { claim, outcomes } of open) console.log(`  ${claim.scenario}  ${claim.kind}  ${show(claim)}\n      ${outcomes.find(({ status }) => status === "none")!.why}`);
  process.exitCode = 1;
}
if (stale.length) {
  console.log(`\n${stale.length} errata no longer describe a claim with no match: the claim matches now, is gone, or fails for another reason:`);
  for (const erratum of stale) console.log(`  ${erratum.scenario}  ${erratum.kind}  ${erratum.claim}`);
  process.exitCode = 1;
}
console.log(`\n${list.length - open.length} of ${list.length} claims match the data or are recorded errata; ${open.length} open.`);
if (process.argv.includes("--elsewhere")) {
  const elsewhere = results.filter(({ outcomes }) => outcomes.some(({ status }) => status === "elsewhere"));
  console.log(`\n${elsewhere.length} claims the data has only in another area's script:`);
  for (const { claim, outcomes } of elsewhere) console.log(`  ${claim.scenario}  ${claim.kind}  ${show(claim)}\n      in the area: ${outcomes.find(({ status }) => status === "elsewhere")!.why}`);
}
