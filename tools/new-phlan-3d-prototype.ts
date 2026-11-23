import { readFileSync, writeFileSync } from "node:fs";
import { requireBrowserGameRoot } from "./gamedata.js";
import { buildNewPhlanMaterials, type NewPhlanTrace } from "./new-phlan-3d-materials.js";
import { loadUpgradeArt } from "./upgrade-art.js";

await import("./capture-phlan-prototype.js");

const root = requireBrowserGameRoot();
const artwork = loadUpgradeArt(undefined, root);
const enhancedTiles = new Map([...artwork].map(([key, art]) => [key, {
  file: art.path, reflected: Boolean(art.reflected),
}]));
const references = JSON.parse(readFileSync("out/new-phlan-prototype-reference.json","utf8")) as {
  name:string; pose:[number,number,number]; enhancedFrame:string; tiles:[number,number,string][];
  tileInventory:[number,number,string,string][];
}[];
const referenceFiles = references.map(({name,pose,enhancedFrame,tiles}) => ({
  name,pose,enhancedFrame,
  tiles:tiles.map(([x,y,key])=> {
    const art = enhancedTiles.get(key);
    if (!art) throw new Error(`Missing reference tile ${key}`);
    return {x,y,...art};
  }),
}));
const traceSources: NewPhlanTrace[] = [
  {trace:"new-phlan-prototype-reference.json", batches:references.map(frame=>frame.tileInventory)},
  ...process.argv.slice(3).map(trace=>{
    const contents = readFileSync(trace,"utf8").trim();
    type Cell = NewPhlanTrace["batches"][number][number];
    const frames = (trace.endsWith(".jsonl")
      ? contents.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line))
      : JSON.parse(contents)) as (Cell | Cell[] | {cells?:Cell[]})[];
    const batches = Array.isArray(frames[0]) && typeof frames[0][2] === "string"
      ? [frames as Cell[]] : frames.map(frame=>Array.isArray(frame) ? frame as Cell[] : frame.cells ?? []);
    return {trace,batches};
  }),
];
const materials = buildNewPhlanMaterials(root, enhancedTiles, traceSources);
const {walls, wallFaces, ground, sky, water, dockPiling} = materials;
const sources = {walls:wallFaces, ground, sky, water, dockPiling, dockDeck:ground,
  gateRecess:{masonryWallType:2, depth:.405},
  referenceCameras:referenceFiles.map(({name,pose,tiles})=>({name,pose,tiles:tiles.map(({x,y,file})=>({x,y,file}))}))};
writeFileSync("out/new-phlan-3d-texture-sources.json",JSON.stringify(sources,null,2));
const files = new Set([
  ...wallFaces.flatMap(({parts})=>parts.flatMap(part=>part.art ? [part.art.file] : part.crop?.parts.map(piece=>piece.file) ?? [])),
  ground.file, sky.file, water.art.file, dockPiling.art.file,
  ...referenceFiles.flatMap(({tiles})=>tiles.map(({file})=>file)),
]);
const textures = [...files].map(file => [file, "data:image/png;base64," + readFileSync(file).toString("base64")]);
const views = referenceFiles.map(({name,pose:[x,y,facing]})=>({name,x,y,facing}));
const renderer = readFileSync(new URL("./renderer.js", import.meta.url),"utf8");

const out = `<!doctype html><meta charset="utf-8"><title>New Phlan • 3D prototype</title>
<style>
  *{box-sizing:border-box} body{margin:0;padding:29px;background:#171816;color:#f0ddbb;font:17px Georgia,serif}
  h1{font-weight:400;font-size:35px;margin:0 0 6px} p{margin:0 0 24px;color:#c4b7a0}
  main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:17px}
  @media(max-width:700px){main{grid-template-columns:1fr}}
  figure{margin:0;background:#242521;border:1px solid #66604f}
  canvas{display:block;width:100%;height:auto;background:#5598ac}
  .reference{image-rendering:pixelated}
  figcaption,h2{margin:0;padding:10px 14px;font-size:1rem} figcaption{color:#c4b7a0}
</style>
<h1>New Phlan in 3D</h1><p>Existing enhanced art · <label><input type="checkbox" id="audit"> Highlight adapted textures</label></p>
<main>${views.map(({ name }, i) => `<section><h2>${name}</h2>
  <figure><figcaption>3D prototype</figcaption><canvas id="view${i}" width="640" height="480"></canvas></figure>
  <figure><figcaption>Current enhanced viewport</figcaption><canvas class="reference" id="reference${i}" width="352" height="352"></canvas></figure>
</section>`).join("")}</main>
<script type="module">
${renderer}
const materials = ${JSON.stringify(materials)};
const textures = new Map(${JSON.stringify(textures)});
try {
  const references = ${JSON.stringify(referenceFiles)};
  const referenceTextures = new Set(references.flatMap(({tiles})=>tiles.map(({file})=>file)));
  const images = new Map(await Promise.all([...referenceTextures].map(async file=>{
    const image = new Image();
    image.src = textures.get(file);
    await image.decode();
    return [file,image];
  })));
  await Promise.all(references.map(async ({enhancedFrame,tiles},index)=>{
    const canvas = document.getElementById("reference" + index);
    const panel = canvas.getContext("2d");
    const base = new Image();
    base.src = "data:image/png;base64,"+enhancedFrame;
    await base.decode();
    panel.imageSmoothingEnabled = false;
    panel.drawImage(base,24,24,88,88,0,0,352,352);
    for (const {x,y,file,reflected} of tiles) {
      panel.save();
      panel.translate((x-24)*4+(reflected?32:0),(y-24)*4);
      panel.scale(reflected?-1:1,1);
      panel.drawImage(images.get(file),0,0,32,32);
      panel.restore();
    }
  }));
  let viewports = [];
  let drawId = 0;
  async function draw(highlight) {
    const id = ++drawId;
    const atlas = await createExplorationAtlas(materials,art=>textures.get(art.file),highlight);
    if (id !== drawId) return;
    for (const viewport of viewports) viewport.dispose();
    viewports = ${JSON.stringify(views)}.map((view,i)=>{
      const canvas = document.getElementById("view"+i);
      const viewport = createExplorationViewport(canvas, materials.walls, atlas);
      viewport.draw(view);
      return viewport;
    });
  }
  const audit = document.getElementById("audit");
  audit.checked = new URLSearchParams(location.search).has("audit");
  await draw(audit.checked);
  audit.addEventListener("change",()=>draw(audit.checked).catch(error=>{
    document.body.dataset.rendered = "false";
    document.body.append(document.createTextNode(String(error)));
  }));
  document.body.dataset.rendered = "true";
} catch (error) {
  document.body.dataset.rendered = "false";
  document.body.append(document.createTextNode(String(error)));
}
</script>`;
writeFileSync("out/new-phlan-3d-comparison.html", out);
