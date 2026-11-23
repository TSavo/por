import assert from "node:assert/strict";
import { useNodeResources } from "./resources/node-play.js";
import { loadCombatMaterialMasks, loadUpgradeArt } from "./upgrade-art.js";
import { pngDimensions } from "./png.js";
import { fromPortRoot } from "./port-root.js";

// Header reads establish which art exists. Indexing must never read an entire PNG, atlas plate or sound.
const { root, resources } = useNodeResources(process.argv[2] ?? fromPortRoot("game"));
const payloads: string[] = [];
const read = resources.readNow.bind(resources);
resources.readNow = (id, length) => {
  if (length === undefined && (/^upgrades:.*\.png$/i.test(id) || /^(?:art|audio|atlas|narration|voice):/.test(id))) payloads.push(id);
  return read(id, length);
};
const art = loadUpgradeArt(undefined, root);
const masks = loadCombatMaterialMasks(art);
assert.deepEqual(payloads, [], "indexing artwork should only read image headers");
const title = art.get("scene:title-name");
assert.ok(title && pngDimensions(title.png), "title PNG decodes on demand");
const mask = masks.get("combat:party:0:1")?.png;
assert.ok(mask && pngDimensions(mask), "combat recolour mask decodes on demand");
assert.equal(payloads.length, 2);
console.log(`${root}: indexed ${art.size} art entries and ${masks.size} masks with zero full asset reads; requested art and mask decoded.`);
