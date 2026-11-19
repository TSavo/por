import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { disassemble, formatInstruction, scriptFromBlock, type Operand } from "../src/lib/ecl.js";
import { parseGeo, type GeoMap } from "../src/lib/world.js";
import { requireBrowserGameRoot } from "./gamedata.js";

type Arrival = { x: number; y: number; facing?: number };
type AreaMetadata = { name?: string; confidence: "confirmed" | "probable" | "unknown"; geos: number[];
  arrival?: Arrival; region: "phlan" | "wilderness" | "remote" | "interior" };

// Names and script-to-map relationships were checked against the official clue
// book and Adventurer's Journal, then against the independently measured Wish
// area table. Geometry and instructions below are always extracted from the
// user's original game data.
const metadata: Record<number, AreaMetadata> = {
  0:{name:"New Phlan",confidence:"confirmed",geos:[0],arrival:{x:15,y:1,facing:6},region:"phlan"},
  1:{name:"Buccaneer Base",confidence:"confirmed",geos:[1],arrival:{x:8,y:0,facing:4},region:"remote"},
  2:{name:"Cadorna Textile House",confidence:"confirmed",geos:[2],arrival:{x:0,y:4,facing:6},region:"phlan"},
  3:{name:"Valjevo Castle, a Floor",confidence:"probable",geos:[3],region:"phlan"},
  4:{name:"Valjevo Castle, a Floor",confidence:"probable",geos:[4],region:"phlan"},
  5:{name:"Valjevo Castle, a Floor",confidence:"probable",geos:[5],region:"phlan"},
  6:{name:"Valjevo Castle, a Floor",confidence:"probable",geos:[6],arrival:{x:4,y:15,facing:0},region:"phlan"},
  7:{name:"Valjevo Castle, the Pool",confidence:"probable",geos:[7],arrival:{x:5,y:7},region:"phlan"},
  8:{name:"Phlan City Hall",confidence:"confirmed",geos:[],arrival:{x:4,y:4},region:"interior"},
  9:{name:"Stojanow Gate",confidence:"confirmed",geos:[9],region:"phlan"},
  10:{name:"Valhingen Graveyard",confidence:"confirmed",geos:[10],arrival:{x:0,y:4,facing:6},region:"phlan"},
  11:{name:"The Training Hall",confidence:"confirmed",geos:[],region:"interior"},
  13:{name:"The Kobold Caves",confidence:"confirmed",geos:[13],arrival:{x:6,y:15,facing:0},region:"remote"},
  14:{name:"Kovel Mansion",confidence:"confirmed",geos:[14],arrival:{x:4,y:0,facing:4},region:"phlan"},
  15:{name:"Mendor's Library",confidence:"confirmed",geos:[15],region:"phlan"},
  16:{name:"The Lizardman Keep",confidence:"confirmed",geos:[16,30],arrival:{x:8,y:14,facing:0},region:"remote"},
  17:{name:"The Nomad Camp",confidence:"confirmed",geos:[17],arrival:{x:1,y:14,facing:2},region:"remote"},
  18:{name:"Podol Plaza",confidence:"confirmed",geos:[18],arrival:{x:0,y:4,facing:6},region:"phlan"},
  19:{name:"Cave of Diogenes",confidence:"confirmed",geos:[],region:"remote"},
  20:{name:"The Slums",confidence:"confirmed",geos:[20],region:"phlan"},
  21:{name:"Sokal Keep",confidence:"confirmed",geos:[21],arrival:{x:8,y:14,facing:0},region:"remote"},
  22:{name:"Yarash's Pyramid",confidence:"confirmed",geos:[22],arrival:{x:15,y:7,facing:2},region:"remote"},
  23:{name:"Yarash's Pyramid, Lower",confidence:"probable",geos:[23],arrival:{x:15,y:0,facing:4},region:"remote"},
  24:{name:"Temple of Bane",confidence:"confirmed",geos:[24,31],arrival:{x:15,y:4,facing:6},region:"phlan"},
  25:{name:"Wilderness, West Window",confidence:"confirmed",geos:[25],region:"wilderness"},
  26:{name:"Wilderness, Middle Window",confidence:"confirmed",geos:[26],region:"wilderness"},
  27:{name:"Wilderness, East Window",confidence:"confirmed",geos:[27],region:"wilderness"},
  28:{name:"Zhentil Keep Outpost",confidence:"confirmed",geos:[28],arrival:{x:7,y:0,facing:4},region:"remote"},
  29:{name:"Kuto's Well",confidence:"confirmed",geos:[29,32],region:"phlan"},
};

const immediate = (operand: Operand | undefined) => operand?.code === 0 ? operand.low
  : operand?.code === 2 ? operand.word ?? undefined : undefined;

function geometrySummary(map: GeoMap) {
  let wallSides = 0, flaggedCells = 0, boundaryOpenings = 0;
  for (let y=0;y<16;y++) for (let x=0;x<16;x++) {
    const cell=map.cells[y*16+x]!;
    wallSides += cell.wall.filter(Boolean).length;
    if (cell.flags) flaggedCells++;
    if (y===0 && !cell.wall[0]) boundaryOpenings++;
    if (x===15 && !cell.wall[1]) boundaryOpenings++;
    if (y===15 && !cell.wall[2]) boundaryOpenings++;
    if (x===0 && !cell.wall[3]) boundaryOpenings++;
  }
  const seen=new Set<number>(); let components=0;
  const directions=[[0,-1,0,2],[1,0,1,3],[0,1,2,0],[-1,0,3,1]] as const;
  for(let start=0;start<256;start++) if(!seen.has(start)) {
    components++; const queue=[start]; seen.add(start);
    while(queue.length) { const at=queue.pop()!, x=at%16, y=Math.floor(at/16), cell=map.cells[at]!;
      for(const [dx,dy,side,other] of directions) { const nx=x+dx,ny=y+dy;if(nx<0||nx>15||ny<0||ny>15||cell.wall[side])continue;
        const next=ny*16+nx;if(map.cells[next]!.wall[other]||seen.has(next))continue;seen.add(next);queue.push(next); }
    }
  }
  return { width:16,height:16,wallSides,flaggedCells,boundaryOpenings,walkableComponents:components };
}

const root=requireBrowserGameRoot();
const geoBlocks=new Map<number,{archive:string;map:GeoMap}>();
for(const archive of readdirSync(root).filter(name=>/^GEO\d+\.DAX$/i.test(name)).sort())
  for(const entry of parseDax(archive,new Uint8Array(readFileSync(join(root,archive)))).entries)
    if(entry.rawSize===0x402) geoBlocks.set(entry.id,{archive,map:parseGeo(entry.data,entry.id)});

const scripts=new Map<number,{archive:string;instructions:ReturnType<typeof disassemble>["instructions"]}>();
for(const archive of readdirSync(root).filter(name=>/^ECL\d+\.DAX$/i.test(name)).sort())
  for(const entry of parseDax(archive,new Uint8Array(readFileSync(join(root,archive)))).entries) {
    try { scripts.set(entry.id,{archive,instructions:disassemble(scriptFromBlock(entry.data)).instructions}); } catch {}
  }

const areas=[...scripts].sort(([a],[b])=>a-b).map(([id,script])=>{
  const meta=metadata[id]??{confidence:"unknown",geos:[],region:"remote"};
  const newEcl=script.instructions.filter(inst=>inst.opcode===0x20);
  const geoLoads=script.instructions.filter(inst=>inst.opcode===0x21).map(inst=>({
    address:`0x${inst.address.toString(16)}`, operands:inst.operands.map(immediate), instruction:formatInstruction(inst)
  }));
  const staticTargets=[...new Set(newEcl.map(inst=>immediate(inst.operands[0])).filter((v):v is number=>v!==undefined))].sort((a,b)=>a-b);
  const dynamicTransitions=newEcl.filter(inst=>immediate(inst.operands[0])===undefined).map(inst=>({
    address:`0x${inst.address.toString(16)}`, instruction:formatInstruction(inst)
  }));
  return { id, hexId:`0x${id.toString(16).padStart(2,"0")}`, name:meta.name??null, nameConfidence:meta.confidence,
    region:meta.region, scriptArchive:script.archive, maps:meta.geos.map(geo=>{
      const found=geoBlocks.get(geo); return { id:geo, hexId:`0x${geo.toString(16).padStart(2,"0")}`,
        archive:found?.archive??null, ...(found?geometrySummary(found.map):{}) }; }), arrival:meta.arrival??null,
    transitions:{ staticTargets, dynamic:dynamicTransitions }, geoLoads };
});

const referencedTargets=new Set(areas.flatMap(area=>area.transitions.staticTargets));
const catalog={ schema:1, generatedFrom:"original Pool of Radiance GEO and ECL DAX blocks",
  sources:{
    geometryAndTransitions:"original game data installed locally",
    areaNames:"official Pool of Radiance clue book and Adventurer's Journal",
    crossCheck:"https://wish-goldbox.readthedocs.io/en/latest/api/generated/goldbox.areas.html"
  },
  counts:{ areas:areas.length,maps:geoBlocks.size,maplessAreas:areas.filter(area=>!area.maps.length).length,
    staticTransitionPairs:areas.reduce((n,area)=>n+area.transitions.staticTargets.length,0),
    dynamicTransitionSites:areas.reduce((n,area)=>n+area.transitions.dynamic.length,0) },
  // ECL identifiers are 0..29. 0x0c/12 is intentionally unused by the game.
  missingScriptIds:[...Array(30).keys()].filter(id=>!scripts.has(id)),
  unreferencedAreas:areas.filter(area=>!referencedTargets.has(area.id)&&area.id!==0).map(area=>area.id), areas };
const output=resolve(process.argv[2]??"src/maps/area-catalog.json");mkdirSync(dirname(output),{recursive:true});
writeFileSync(output,JSON.stringify(catalog,null,2)+"\n");
console.log(`wrote ${areas.length} areas, ${geoBlocks.size} maps, ${catalog.counts.staticTransitionPairs} static transitions, ${catalog.counts.dynamicTransitionSites} dynamic sites to ${output}`);
