import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { requireBrowserGameRoot } from "./gamedata.js";
import { loadUpgradeArt } from "./upgrade-art.js";

const root = requireBrowserGameRoot();
const inputSave = process.argv[2];
if (!inputSave) throw new Error("Usage: npm run preview:new-phlan -- path/to/new-phlan-save.json");
const westSlot = inputSave;
const saveTemplate = JSON.parse(readFileSync(westSlot,"utf8"));
if (typeof saveTemplate.data !== "string" || Buffer.from(saveTemplate.data,"base64").length < 12805) {
  throw new Error("Expected a browser save exported from New Phlan");
}
mkdirSync("out", {recursive:true});
const artwork = loadUpgradeArt(undefined,root);
const artKeys = [...artwork.keys()].filter(key=>key.startsWith("tile:")).join(",");
const runs = [
  {name:"Harbor arrival",slot:"B",file:westSlot,pose:[15,1,6]},
  {name:"West gate approach",slot:"B",file:westSlot,pose:[1,4,6]},
  {name:"Civic lanes",slot:"B",file:westSlot,pose:[7,3,6]},
];
const results = [];
for (const {name,slot,file,pose} of runs) {
  const directory = mkdtempSync(join(tmpdir(),"por-phlan-capture-"));
  const save = JSON.parse(readFileSync(file,"utf8"));
  const bytes = Buffer.from(save.data,"base64");
  bytes.set(pose,12801);
  save.data = bytes.toString("base64");
  writeFileSync(join(directory,slot+".json"),JSON.stringify(save));
  const result = spawnSync(process.execPath,["--import","tsx","tools/boot-translated.ts"],{
    windowsHide:true, input:"right\nleft\n", encoding:"utf8",timeout:20000,maxBuffer:32*1024*1024,
    env:{...process.env,POR_GAMEDATA:root,POR_LIVE_AT:"85000000",POR_BOOT_STEPS:"90000000",
      POR_BOOT_KEY_FILE:"",POR_BOOT_KEYS:"31000000:1c0d,45000000:266c,52000000:"+(slot==="A"?"1e61":"3062"),
      POR_SAVE_DIR:directory,POR_TRACE_TILES:"1",POR_PREGEN_PARTY:"0",POR_BROWSER_PLAY:"1",
      POR_TILE_ART_KEYS:artKeys},
  });
  if (result.error || result.status !== 0) throw new Error(result.error?.message ?? result.stderr);
  const frames = result.stdout.split(/\r?\n/)
    .filter(line=>line.startsWith("POR_FRAME ")).map(line=>JSON.parse(line.slice(10)));
  const frame = frames.reverse().find(item=>item.exploration?.area===0 && item.perspective && !item.portrait);
  if (!frame) throw new Error("No New Phlan frame for "+name);
  const {cameraX, cameraY, facing} = frame.exploration;
  if (cameraX !== pose[0] || cameraY !== pose[1] || facing !== pose[2] || frame.tiles?.length !== 121) {
    throw new Error(`Incomplete reference for ${name} at ${cameraX},${cameraY},${facing}`);
  }
  console.log(name,pose,frame.tiles.length);
  results.push({name,pose,...frame});
}
if (new Set(results.map(frame=>JSON.stringify(frame.tiles))).size !== runs.length) {
  throw new Error("Reference captures must contain three distinct views");
}
writeFileSync("out/new-phlan-prototype-reference.json",JSON.stringify(results));
