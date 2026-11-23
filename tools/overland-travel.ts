import { gameProgram, readGameFile } from "./gamedata.js";
import type { Cpu } from "../src/cpu/machine.js";
import { parseDax } from "../src/lib/dax.js";
import { data, eclGlobalOffset, segment as unit } from "../src/runtime/bindings.js";

const width = 44;
const height = 36;

// Geographic features painted over individual terrain slots in local encounter views.
export const overlandLandmarkSlots: ReadonlySet<number> = new Set([
  231, 232, 243, 244, 248, 249, 250, 251, 252, 253, 254,
]);
const sectors = [
  { area: 25, offset: 0, archive: 6, blocked: 0xadce, count: 8 },
  { area: 26, offset: 13, archive: 7, blocked: 0xb019, count: 29 },
  { area: 27, offset: 26, archive: 8, blocked: 0xab9e, count: 8 },
];
type Position = { x: number; y: number; sector: number };
export type TravelState = Position & { nomads: boolean; buccaneers: boolean; zhentil: boolean; riverCleared: boolean };
type Step = Position & { key: string; arrival?: { approach: PhlanApproach; key: string } };

/** Positions and quest flags used by the original overland scripts. */
export function captureOverlandTravel(cpu: Cpu, segment: number, offset: number): TravelState | undefined {
  const sector = cpu.read8(unit.data, data.sector) - 2;
  if (!sectors[sector] || !segment) return;
  const global = (address: number) => cpu.read16(segment, offset + eclGlobalOffset(address));
  // Wilderness encounter interiors reuse the world ECL and its menu.
  if (global(0x4a9e) === 255) return;
  const x = cpu.read16(segment, offset + eclGlobalOffset(0x49c3)) + sectors[sector].offset;
  const y = cpu.read16(segment, offset + eclGlobalOffset(0x49c4));
  if (x < 2 || x >= width - 2 || y < 2 || y >= height) return;
  return { x, y, sector, nomads: global(0x4a0f) === 0,
    buccaneers: global(0x4a8c) === 255 && global(0x4aa9) === 0,
    zhentil: global(0x4a98) === 255 && global(0x4ab4) < 253, riverCleared: global(0x4ab3) >= 254 };
}

// Wilderness ECL arrival triggers, in the world coordinates shown on screen.
type Coordinate = readonly [number, number];
const northGate = [[25, 26], [26, 26]] as const;
const eastApproach = [[26, 27]] as const;
const westApproach = [[24, 28]] as const;
const docks = [[20, 29], [35, 29]] as const;
const rowboat = [[19, 14]] as const;
const approaches = { northGate, eastApproach, westApproach, docks, rowboat };
export type PhlanApproach = keyof typeof approaches;
const phlanDestinations: Record<string, Partial<Record<PhlanApproach, string>>> = {
  graveyard: { northGate: "g" },
  kovelMansion: { eastApproach: "n", northGate: "c" },
  templeOfBane: { eastApproach: "s" },
  podolPlaza: { westApproach: "n" },
  stojanow: { westApproach: "n" },
  kutoWell: { westApproach: "n" },
  valjevo: { westApproach: "n" },
  textileHouse: { westApproach: "s" },
  mendorLibrary: { westApproach: "s" },
  newPhlan: { docks: "t", eastApproach: "b" },
  cityHall: { docks: "t", eastApproach: "b" },
  trainingHall: { docks: "t", eastApproach: "b" },
  slums: { docks: "t", eastApproach: "b" },
  sokal: { docks: "t", eastApproach: "b" },
  island: { rowboat: "y" },
};
const approachIds = Object.keys(approaches) as PhlanApproach[];
const phlanPrompts: Record<PhlanApproach, { menu: string; dialogue: RegExp }> = {
  northGate: { menu: "CITYGRAVEYARDLEAVE", dialogue: /^YOUAREONTHENORTHEDGEOFTHECITY\./ },
  eastApproach: { menu: "NORTHSOUTHBOATLEAVE", dialogue: /^YOUAREONTHEEASTERNEDGEOFTHECITY\./ },
  westApproach: { menu: "NORTHSOUTHLEAVE", dialogue: /^YOUAREONTHEWESTERNEDGEOFTHECITY\./ },
  docks: { menu: "TAKEBOATSTAY", dialogue: /^THEREISA(?:BOATHERETHATWILLTAKEYOUBACK|BOATDOCKEDHERETHATWILLRETURNYOU)/ },
  rowboat: { menu: "YESNO", dialogue: /^YOUHAVEFOUNDAROWBOATHIDDENAMOUNGSTTHEREEDS\./ },
};

export function identifyPhlanPrompt(dialogue: string, menu?: string): PhlanApproach | undefined {
  return approachIds.find(approach => {
    const prompt = phlanPrompts[approach];
    return (menu === undefined || menu === prompt.menu) && prompt.dialogue.test(dialogue);
  });
}

export type SokalPrompt = "directions" | "fare" | "payer" | "boarding";
export type SokalQuay = { x: number; facing: number; ticket: "sokal" | "other" | "none" };
const freePassage = /^'BYORDEROFTHECITYCOUNCIL,'.*THEONLYBOATOUTISGOINGTOSOKALKEEP\./;
const boardingBoat = "YOUBOARDABOAT.";

export function identifySokalPrompt(dialogue: string, menu: string, ticket: SokalQuay["ticket"]): SokalPrompt | undefined {
  if (menu === "SOKALEASTWESTBAYNONE" && dialogue.startsWith("THEHARBORMASTERTELLSYOUBOATSLEAVE")) return "fare";
  if (menu === "WHOWILLPAY?SELECT") return "payer";
  if (menu !== "PRESS<ENTER>/<RETURN>TOCONTINUE") return;
  if (freePassage.test(dialogue)) return "directions";
  if (ticket === "sokal" && dialogue === boardingBoat) return "boarding";
}

export function isQuayDialogue(dialogue: string) {
  return !dialogue || dialogue === "'CATCHTHEBOATATTHEENDOFTHEPIER.'" || freePassage.test(dialogue);
}

export function isSokalBoatHandoff(dialogue: string, ecl: number, ticket: SokalQuay["ticket"]) {
  return dialogue === boardingBoat && (ecl === 21 || ecl === 0 && ticket === "sokal");
}

const landmarks: Record<string, readonly Coordinate[]> = {
  diogenes: [[10, 9]], buccaneers: [[12, 31]], zhentil: [[3, 32]], nomads: [[25, 11]],
  kobolds: [[32, 15]], lizardmen: [[37, 8]],
  phlan: [...northGate, ...eastApproach, ...westApproach, ...docks],
  ...approaches,
  ...Object.fromEntries(Object.entries(phlanDestinations).map(([destination, choices]) =>
    [destination, approachIds.filter(approach => choices[approach]).flatMap<Coordinate>(approach => approaches[approach])])),
  island: [...rowboat, [19, 16]],
};

function arrivalAt(id: string, { x, y }: Position): Step["arrival"] {
  const approach = approachIds.find(name => approaches[name].some(([atX, atY]) => atX === x && atY === y));
  const key = approach && phlanDestinations[id]?.[approach];
  return approach && key ? { approach, key } : undefined;
}

const directions = [[0, -1, "up"], [1, 0, "right"], [0, 1, "down"], [-1, 0, "left"]] as const;
const cell = (x: number, y: number) => y * width + x;
const entranceCells = new Set(Object.values(landmarks).flat().map(([x, y]) => cell(x, y)));
// The original movement accepts the east and west crossroads despite their ECL terrain bans.
const phlanCrossroads = new Set([...eastApproach, ...westApproach].map(([x, y]) => cell(x, y)));

function terrainTable(root: string) {
  // The overland overlay reads the world terrain table from the data segment. START.EXE initializes it.
  const { image } = gameProgram(root);
  const offset = unit.data * 16 + data.overlandTerrain;
  return image.subarray(offset, offset + width * height);
}

export function overlandMapSlots(root: string) {
  // The guest decrements the table's one-based picture value before it draws.
  return Array.from(new Set(terrainTable(root)), code => (code - 1) & 255).sort((a, b) => a - b);
}

export function loadOverlandTravel(root: string) {
  const terrain = terrainTable(root);
  const nativeBarrier = new Set([0x4e, 0x7e, 0x7f, 0x80, 0x82, 0x83, 0x84, 0xa8, 0xa9, 0xaa, 0xab, 0xac,
    0xae, 0xaf, 0xb0, 0xb1, 0xb2, 0xb3, 0xbc, 0xdd, 0xde, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xf5,
    0x66, 0x67, 0x68, 0x69, 0x6a, 0x6b, 0x6c, 0x72]);
  const scripts = sectors.map(({ area, archive }) => {
    const name = `ECL${archive}.DAX`;
    return parseDax(name, readGameFile(root, name)).entries.find(entry => entry.id === area)?.data;
  });
  const readBlocked = (script: Uint8Array | undefined, address: number, length: number) =>
    new Set(script?.subarray(address - 0x98fe, address - 0x98fe + length));
  const blocked = sectors.map(({ blocked, count }, index) => readBlocked(scripts[index], blocked, count));
  const clearRiver = readBlocked(scripts[1], 0xb036, 20);

  return function planTravel(start: TravelState) {
    const routes: Record<string, Step> = {};
    if (terrain.length !== width * height || scripts.some(script => !script)) return routes;
    const visited = new Set<number>();
    const queue: (Position & { first?: Step })[] = [start];
    const keyFor = ({ x, y, sector }: Position) => sector * width * height + cell(x, y);
    const arrivals = new Map<number, Step>();
    visited.add(keyFor(start));
    for (const current of queue) {
      const coordinate = cell(current.x, current.y);
      if (current.first && !arrivals.has(coordinate)) arrivals.set(coordinate, current.first);
      if (current.first && entranceCells.has(coordinate)) continue;
      for (const [dx, dy, key] of directions) {
        const x = current.x + dx, y = current.y + dy;
        if (x < 2 || x >= width - 2 || y < 2 || y >= height) continue;
        const localX = current.x - sectors[current.sector]!.offset;
        // The adjoining ECL windows overlap. A cardinal step from an edge yields the next window.
        let sector = current.sector;
        if (dx === 1 && localX === 15 && sector < 2) sector++;
        if (dx === -1 && localX === 2 && sector > 0) sector--;
        const next = { x, y, sector };
        const fingerprint = keyFor(next);
        const destination = cell(x, y);
        const tile = terrain[destination]!;
        const blockedTypes = sector === 1 && start.riverCleared ? clearRiver : blocked[sector]!;
        if (visited.has(fingerprint) || nativeBarrier.has(tile) ||
          (blockedTypes.has(tile) && !phlanCrossroads.has(destination))) continue;
        visited.add(fingerprint);
        queue.push({ ...next, first: current.first ?? { ...next, key } });
      }
    }
    for (const [id, positions] of Object.entries(landmarks)) {
      if (id === "nomads" && !start.nomads || id === "buccaneers" && !start.buccaneers || id === "zhentil" && !start.zhentil) continue;
      const targets = new Set(positions.map(([x, y]) => cell(x, y)));
      if (targets.has(cell(start.x, start.y))) {
        const arrival = arrivalAt(id, start);
        routes[id] = { x: start.x, y: start.y, sector: start.sector, key: "enter", arrival };
        continue;
      }
      for (const [position, step] of arrivals) {
        if (!targets.has(position)) continue;
        const arrival = targets.has(cell(step.x, step.y)) ? arrivalAt(id, step) : undefined;
        routes[id] = arrival ? { ...step, arrival } : step;
        break;
      }
    }
    return routes;
  };
}
