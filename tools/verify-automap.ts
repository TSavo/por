import { deepStrictEqual, ok, strictEqual } from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { parseGeo } from "../src/lib/world.js";
import { cleanAutomap, openAutomap } from "./automap.js";
import { findGameRoot } from "./gamedata.js";
import { openSaveSlots } from "./save-slots.js";

// The discovered map belongs to the running game. It is recorded from the
// tiles the guest reports, saved in the slot, and restored on load.

const root = findGameRoot();
if (!root) throw new Error("Pool of Radiance game data not found");
const newPhlan = parseDax("GEO3.DAX", new Uint8Array(readFileSync(join(root, "GEO3.DAX")))).entries
  .find(entry => entry.id === 0 && entry.rawSize === 0x402);
ok(newPhlan, "GEO3.DAX has no New Phlan map");
const walls = parseGeo(newPhlan.data, 0).cells[1 * 16 + 15]!.wall;

const map = openAutomap(root);
strictEqual(map.revision, 0);
deepStrictEqual(map.snapshot(), {});

// A position reported by the guest gains the walls of its own map.
const dock = map.locate({ area: 0, x: 15, y: 1, facing: 6 });
deepStrictEqual(dock.walls, walls);
strictEqual(dock.mapId, undefined);
map.record(dock);
strictEqual(map.revision, 1);
deepStrictEqual(map.snapshot(), { 0: { cells: { "15,1": { x: 15, y: 1, walls } }, position: { x: 15, y: 1, facing: 6 } } });
map.record(dock);
strictEqual(map.revision, 1, "Standing still does not change the map");
map.record({ ...dock, facing: 4 });
strictEqual(map.revision, 2, "Turning moves the party marker");

// A floor with its own atlas plate is kept apart from the area's surface map.
const drawn = Buffer.alloc(512);
drawn[3 * 16 + 4] = 0x12;
drawn[256 + 3 * 16 + 4] = 0x34;
const catacombs = map.locate({ area: 29, x: 9, y: 9, facing: 0 },
  { area: 29, x: 4, y: 3, facing: 2, mapId: 32, walls: drawn.toString("base64") });
deepStrictEqual(catacombs, { area: 29, x: 4, y: 3, facing: 2, mapId: 32, walls: [1, 2, 3, 4] });
map.record(catacombs);
deepStrictEqual(map.snapshot()[29], { cells: {},
  floors: { 32: { cells: { "4,3": { x: 4, y: 3, walls: [1, 2, 3, 4] } }, position: { x: 4, y: 3, facing: 2 } } } });

// Positions outside the 16-by-16 map and tiles without walls are not recorded.
const before = map.revision;
map.record({ area: 26, x: 27, y: 8, facing: 0 });
map.record(map.locate({ area: 0, x: 16, y: 1, facing: 0 }));
strictEqual(map.revision, before);

// A label marks the tile the party stands on. An empty label removes it.
ok(map.label(dock, "  Passenger\tdock  "));
strictEqual(map.snapshot()[0]!.cells["15,1"]!.label, "Passenger dock");
ok(map.label(dock, "x".repeat(60)));
strictEqual(map.snapshot()[0]!.cells["15,1"]!.label, "x".repeat(40));
ok(map.label(dock, ""));
strictEqual(map.snapshot()[0]!.cells["15,1"]!.label, undefined);
ok(!map.label({ area: 0, x: 3, y: 3, facing: 0 }, "Unvisited"), "Only a discovered tile takes a label");
ok(map.label(dock, "Passenger dock"));

// The save slot carries the map, and loading the slot restores it.
const directory = mkdtempSync(join(tmpdir(), "por-automap-"));
try {
  const saved = map.snapshot();
  openSaveSlots(directory).save("SAVGAMA.DAT", new Uint8Array([1, 2, 3]), [], undefined, [], saved);
  const slot = openSaveSlots(directory).get("SAVGAMA.DAT");
  deepStrictEqual(slot?.automap, saved);
  strictEqual(JSON.parse(readFileSync(join(directory, "A.json"), "utf8")).automap[0].cells["15,1"].label, "Passenger dock");
  const loaded = openAutomap(root);
  loaded.restore(slot?.automap);
  deepStrictEqual(loaded.snapshot(), saved);
  strictEqual(loaded.revision, 1, "Loading tells the page to fetch the map again");
  // A slot saved before maps were stored loads as an empty map.
  openSaveSlots(directory).save("SAVGAMB.DAT", new Uint8Array([1]), [], undefined, []);
  loaded.restore(openSaveSlots(directory).get("SAVGAMB.DAT")?.automap);
  deepStrictEqual(loaded.snapshot(), {});
} finally {
  rmSync(directory, { recursive: true, force: true });
}

// A map kept by an older browser adds tiles and never replaces recorded ones.
const adopted = openAutomap(root);
adopted.record(dock);
ok(adopted.adopt({
  0: { cells: { "15,1": { x: 15, y: 1, walls: [9, 9, 9, 9], label: "Old" }, "14,1": { x: 14, y: 1, walls: [1, 0, 1, 0] } } },
  29: { cells: {}, floors: { 32: { cells: { "4,3": { x: 4, y: 3, walls: [1, 2, 3, 4] } } } } },
}));
deepStrictEqual(adopted.snapshot()[0]!.cells["15,1"], { x: 15, y: 1, walls });
deepStrictEqual(adopted.snapshot()[0]!.cells["14,1"], { x: 14, y: 1, walls: [1, 0, 1, 0] });
ok(adopted.snapshot()[29]!.floors![32]!.cells["4,3"]);
ok(!adopted.adopt({ 0: { cells: { "15,1": { x: 15, y: 1, walls: [9, 9, 9, 9] } } } }), "Nothing new to add");

// Malformed records are dropped.
deepStrictEqual(cleanAutomap({
  0: { cells: { a: { x: 16, y: 0, walls: [0, 0, 0, 0] }, b: { x: 1, y: 2, walls: [0, 0, 0] }, c: { x: 1, y: 2, walls: [1, 2, 3, 4], label: 7 } },
    position: { x: 1, y: 2, facing: 10 } },
  nowhere: { cells: {} }, 5: "junk", 6: { cells: null },
}), { 0: { cells: { "1,2": { x: 1, y: 2, walls: [1, 2, 3, 4] } }, position: { x: 1, y: 2, facing: 2 } } });
deepStrictEqual(cleanAutomap("junk"), {});

console.log("verified the discovered map records guest tiles, keeps labels, and round-trips through a save slot");
