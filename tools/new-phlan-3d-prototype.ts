import { readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { requireBrowserGameRoot } from "./gamedata.js";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture } from "../src/lib/picture.js";
import { glyphFor, glyphsFromPicture, loadWalldef, parseGeo, SYMBOL_BASE, wallSlot } from "../src/lib/world.js";

await import("./capture-phlan-prototype.js");

const root = requireBrowserGameRoot();
function block(archive: string, id: number) {
  const result = parseDax(archive, readFileSync(join(root, archive))).entries.find(entry => entry.id === id);
  if (!result) throw new Error(`Missing ${archive} block ${id}`);
  return result.data;
}
const walls = parseGeo(block("GEO3.DAX",0),0).cells.map(({wall})=>wall);
// The translated runtime loaded these blocks in the New Phlan DOS art trace.
const wallDefinition = block("WALLDEF3.DAX", 0);
const tables = [0,1,2].map(index => loadWalldef(wallDefinition.subarray(index*780,(index+1)*780), index));
const sets = [
  glyphsFromPicture(decodePicture(block("8X8D1.DAX",203),13), SYMBOL_BASE[0]),
  ...[101,102,103].map((id,index) => glyphsFromPicture(decodePicture(block("8X8D3.DAX",id),13), SYMBOL_BASE[index+1])),
];
const enhancedTiles = new Map<string, {file: string; reflected: boolean}>();
for (const directory of ["upgrades/slums", "upgrades"]) {
  const manifest = JSON.parse(readFileSync(join(directory, "manifest.json"), "utf8"));
  for (const [key,file] of Object.entries(manifest.assets)) {
    if (!/^tile:(0|8|11):/.test(key)) continue;
    enhancedTiles.set(key, {file: join(directory,String(file)), reflected: manifest.reflectedTiles?.includes(key) ?? false});
  }
}
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
function exactArt(pixels?: Uint8Array) {
  if (!pixels || pixels.length !== 64 || pixels.some(value => value > 15)) return null;
  const key = "tile:0:" + createHash("sha256").update(pixels).digest("hex");
  const result = enhancedTiles.get(key);
  return result ? { key, ...result } : null;
}
function districtArt(pixels: Uint8Array) {
  const hash = createHash("sha256").update(pixels).digest("hex");
  const match = [0,8,11].map(area => `tile:${area}:${hash}`).find(key => enhancedTiles.has(key));
  return match ? {key:match,...enhancedTiles.get(match)!} : null;
}
function mirrorGlyph(pixels: Uint8Array) {
  return Uint8Array.from(pixels, (_, i) => pixels[(i & ~7) + 7 - (i & 7)]);
}
const observations = new Map<string, { pixels: Buffer; count: number; trace: string }>();
const capturedFrames: { trace:string; cells:Map<number,string>; pixels:Uint8Array }[] = [];
const frameKeys = new Set<string>();
const traceSources = [
  {trace:"new-phlan-prototype-reference.json", batches:references.map(frame=>frame.tileInventory)},
  ...process.argv.slice(3).map(trace=>{
    const contents = readFileSync(trace, "utf8").trim();
    type Cell = [number,number,string,string];
    const frames = (trace.endsWith(".jsonl")
      ? contents.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
      : JSON.parse(contents)) as (Cell | Cell[] | {cells?:Cell[]})[];
    const batches = Array.isArray(frames[0]) && typeof frames[0][2] === "string"
      ? [frames as Cell[]] : frames.map(frame => Array.isArray(frame) ? frame as Cell[] : frame.cells ?? []);
    return {trace,batches};
  }),
];
for (const {trace,batches} of traceSources) {
  for (const cells of batches) {
    const frame = {trace,cells:new Map<number,string>(),pixels:new Uint8Array(88*88).fill(255)};
    for (const [x, y, key, raw] of cells) {
    if (typeof key !== "string" || !/^tile:(0|8|11):/.test(key) || typeof raw !== "string" || raw.length !== 128) continue;
    const pixels = Buffer.from(raw,"hex");
    const sx = x-24, sy = y-24;
    if (sx >= 0 && sx <= 80 && sy >= 0 && sy <= 80) {
      frame.cells.set((sy/8)*11+sx/8,key);
      for (let row=0;row<8;row++) frame.pixels.set(pixels.subarray(row*8,row*8+8),(sy+row)*88+sx);
    }
    const existing = observations.get(key);
    if (existing) { existing.count++; continue; }
    if (key.endsWith(":"+createHash("sha256").update(pixels).digest("hex"))) {
      observations.set(key,{pixels,count:1,trace});
    }
    }
    const frameKey = [...frame.cells.entries()].map(entry=>entry.join(":")).join(",");
    if (frame.cells.size >= 100 && !frameKeys.has(frameKey)) {
      frameKeys.add(frameKey);
      capturedFrames.push(frame);
    }
  }
}
const capturedTiles = [...observations].filter(([key]) => enhancedTiles.has(key)).sort(([leftKey,left], [rightKey,right]) =>
  right.count-left.count || leftKey.localeCompare(rightKey));
const crops = new Map<string,ReturnType<typeof findCrop>>();
function findCrop(pixels: Uint8Array) {
  const foreground = Array.from(pixels.entries()).filter(([,value])=>value<=15);
  const order = new Map<number,number>();
  for (const [,color] of foreground) order.set(color,(order.get(color) ?? 0)+1);
  foreground.sort(([,a],[,b])=>order.get(a)!-order.get(b)!);
  for (const frame of capturedFrames) for (let y=0;y<=80;y++) for(let x=0;x<=80;x++) {
    if (x%8===0 && y%8===0) continue;
    const start = y*88+x;
    if (!foreground.every(([i,value])=>frame.pixels[start+(i>>3)*88+i%8]===value)) continue;
    const parts: {key:string;file:string;reflected:boolean;x:number;y:number}[] = [];
    for (let cy=y>>3;cy<=((y+7)>>3);cy++) for(let cx=x>>3;cx<=((x+7)>>3);cx++) {
      if (!foreground.some(([i])=>((x+i%8)>>3)===cx && ((y+(i>>3))>>3)===cy)) continue;
      const key=frame.cells.get(cy*11+cx);
      const art=key && enhancedTiles.get(key);
      if (key && art) parts.push({key,...art,x:cx*8-x,y:cy*8-y});
    }
    if (foreground.every(([i])=>parts.some(p=>i%8>=p.x && i%8<p.x+8 && (i>>3)>=p.y && (i>>3)<p.y+8))) {
      return {parts,trace:frame.trace,screenX:x+24,screenY:y+24};
    }
  }
  return null;
}
function capturedCrop(pixels: Uint8Array) {
  const key=Buffer.from(pixels).toString("hex");
  if (!crops.has(key)) crops.set(key,findCrop(pixels));
  return crops.get(key);
}
function surfaceArt(pixels?: Uint8Array) {
  if (!pixels || pixels.length !== 64) return { status:"unresolved", art:null };
  const opaque = Array.from(pixels,value => Number(value <= 15));
  if (!opaque.some(Boolean)) return { status:"transparent", art:null };
  if (opaque.every(Boolean)) {
    const art = districtArt(pixels);
    const mirrored = !art && districtArt(mirrorGlyph(pixels));
    if (mirrored) return {status:"mirrored", art:{...mirrored,reflected:!mirrored.reflected}};
    const crop = !art && capturedCrop(pixels);
    if (crop) return {status:"cropped",art:null,crop};
    const hash = createHash("sha256").update(pixels).digest("hex");
    const observedKeys = [0,8,11].map(area => `tile:${area}:${hash}`).filter(key=>observations.has(key));
    return art ? {status:art.key.startsWith("tile:0:") ? "exact" : "district", art}
      : {status:"unresolved", art:null, observedKeys,
        reason:observedKeys.length ? "Captured without an enhanced tile" : "This opaque pattern did not appear in the captured views"};
  }
  // Match the original visible pixels and require a known flat backdrop in
  // the remaining pixels. The mask removes that backdrop after art lookup.
  let hit = capturedTiles.find(([, {pixels: captured}]) =>
    [6,11].some(background => opaque.every((visible,i) =>
      captured[i] === (visible ? pixels[i] : background))));
  // A wall behind the glyph can also supply the backdrop. Use such a
  // capture only if the visible pixels identify a single art file.
  const foregroundMatches = capturedTiles.filter(([, {pixels: captured}]) =>
    opaque.every((visible,i) => !visible || captured[i] === pixels[i]));
  const candidateFiles = new Set(foregroundMatches.map(([key]) => enhancedTiles.get(key)?.file));
  if (!hit && opaque.filter(Boolean).length >= 12 && candidateFiles.size === 1) {
    hit = foregroundMatches[0];
  }
  if (hit) {
    const [key,{trace}] = hit;
    return {status:"composited", mask:opaque, art:{key,...enhancedTiles.get(key)!}, trace};
  }
  const mirroredPixels = mirrorGlyph(pixels);
  const mirroredHit = capturedTiles.find(([, {pixels: captured}]) =>
    [6,11].some(background => mirroredPixels.every((value,i) =>
      captured[i] === (value <= 15 ? value : background))));
  if (mirroredHit) {
    const [key,{trace}] = mirroredHit;
    const art = enhancedTiles.get(key)!;
    return {status:"mirrored", mask:opaque, art:{key,...art,reflected:!art.reflected}, trace};
  }
  const crop = capturedCrop(pixels);
  if (crop) return {status:"cropped",mask:opaque,art:null,crop};
  const observedKeys = [...observations].filter(([, {pixels: captured}]) =>
    opaque.every((visible,i) => !visible || captured[i] === pixels[i])).map(([key])=>key);
  return {status:"unresolved", mask:opaque, art:null, observedKeys,
    reason:candidateFiles.size ? "Several art files match the visible pixels" : observedKeys.length
      ? "Matching foreground captured without enhanced art" : "The visible pixels did not appear together in the captured views",
    candidates:[...candidateFiles]};
}
const faces = Array.from({length:15}, (_, i) => {
  const table = tables[Math.floor(i/5)];
  return Array.from({length:56}, (_, part) => {
    // Near frontal slot: eight rows of seven glyphs.
    const slot = 54 + part;
    const symbol = wallSlot(table,i%5,slot);
    const glyph = glyphFor(sets,symbol);
    const pixels = glyph?.set.frames[glyph.index];
    return {slot, symbol, ...surfaceArt(pixels), pixels};
  });
});
for (const face of faces) {
  for (const [index, part] of face.entries()) {
    if (part.status !== "unresolved" || !part.pixels) continue;
    const row = Math.floor(index/7), column = index%7;
    const options = face.flatMap((donor, donorIndex) => {
      if (!donor.art || !donor.pixels || donor.status === "reconstructed") return [];
      const visible = Array.from(part.pixels!.entries()).filter(([, value]) => value <= 15);
      const mismatch = visible.reduce((sum, [i, value]) => sum + (donor.pixels![i] === value ? 0 : 1), 0);
      const distance = Math.abs(row-Math.floor(donorIndex/7)) + Math.abs(column-donorIndex%7);
      return [{donor, score:mismatch/visible.length + distance*.025}];
    }).sort((a,b)=>a.score-b.score);
    const choice = options[0];
    if (choice) Object.assign(part, {status:"reconstructed", art:choice.donor.art,
      donorSlot:choice.donor.slot, donorSymbol:choice.donor.symbol});
  }
}
const groundArt = exactArt(new Uint8Array(64).fill(6));
const skyArt = exactArt(new Uint8Array(64).fill(11));
if (!groundArt || !skyArt) throw new Error("Missing the enhanced New Phlan ground or sky");
function textureByFingerprint(prefix: string) {
  const matches = [...enhancedTiles].filter(([key])=>key.startsWith(`tile:0:${prefix}`));
  if (matches.length !== 1) throw new Error(`Expected unique New Phlan tile ${prefix}`);
  const [[key,art]] = matches;
  return {key,...art};
}
const harborMaterials = {
  water:{art:textureByFingerprint("c838dbbfe585"),crop:[0,0,32,32]},
  dockPiling:{art:textureByFingerprint("0d4b58782f4c"),crop:[8,4,12,28]},
};
// The native façade slots also include angled rails, trim and ground.
// Use the verified flat masonry swatch from each affected wall definition.
const masonryPatterns = new Map([
  [6, "f64a590f4187"], [7, "f64a590f4187"], [8, "f64a590f4187"],
  [9, "f64a590f4187"], [10, "f64a590f4187"], [11, "ca1a1292cdd4"],
]);
const materialOverrides = [...masonryPatterns].map(([type, suffix]) => {
  const source = faces[type-1].find(part =>
    part.status === "exact" && part.art?.file.endsWith(`-${suffix}.png`));
  if (!source?.art) throw new Error(`Missing verified masonry for wall type ${type}`);
  return {type, slot:source.slot, symbol:source.symbol, art:source.art,
    crop:type === 11 ? [16,0,16,32] : null};
});
const sources = { walls: faces.map((parts, i) => ({type:i+1, parts:parts.map(({pixels,...part})=>part)})), ground:groundArt,
  materialOverrides, ...harborMaterials, sky:skyArt,
  dockDeck:groundArt, gateRecess:{masonryWallType:2, depth:.405},
  referenceCameras:referenceFiles.map(({name,pose,tiles})=>({name,pose,tiles:tiles.map(({x,y,file})=>({x,y,file}))})) };
writeFileSync("out/new-phlan-3d-texture-sources.json",JSON.stringify(sources,null,2));
const files = [...new Set([...faces.flatMap(parts=>parts.flatMap(part=>
  part.art ? [part.art.file] : part.crop?.parts.map(piece=>piece.file) ?? [])),
  ...(groundArt ? [groundArt.file] : []), ...(skyArt ? [skyArt.file] : []),
  ...Object.values(harborMaterials).map(({art})=>art.file),
  ...referenceFiles.flatMap(({tiles})=>tiles.map(({file})=>file))])];
const textures = files.map(file => [file, "data:image/png;base64," + readFileSync(file).toString("base64")]);
const stats = faces.flat().reduce((counts,{status}) =>
  Object.assign(counts,{[status]:(counts[status] ?? 0)+1}),{} as Record<string,number>);
console.log("Wall front slots:",stats);
if (stats.unresolved) throw new Error("Unresolved wall slots are listed in out/new-phlan-3d-texture-sources.json");
console.log("Exact ground match:",groundArt?.file ?? "none");
const views = referenceFiles.map(({name,pose:[x,y,facing]})=>({name,x,y,facing}));

function render(canvas: HTMLCanvasElement, walls: number[][], view: typeof views[number], atlas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL is unavailable");
  const vertex = `
    attribute vec3 position;
    attribute vec4 surface;
    attribute float tile;
    uniform vec3 eye;
    uniform vec2 forward;
    uniform vec2 right;
    varying vec3 world;
    varying vec4 material;
    varying float depth;
    varying float tileIndex;
    void main() {
      vec3 d = position - eye;
      float z = dot(d.xz, forward);
      world = position;
      material = surface;
      depth = z;
      tileIndex = tile;
      gl_Position = vec4(dot(d.xz, right) * 1.05, d.y * 1.42 + z * .11,
                         z * 1.003 - .08, z);
    }
  `;
  const fragment = `
    precision highp float;
    varying vec3 world;
    varying vec4 material;
    varying float depth;
    varying float tileIndex;
    uniform sampler2D art;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    float noise(vec2 p) {
      vec2 q = floor(p);
      vec2 f = fract(p);
      f = f*f*(3.0-2.0*f);
      return mix(mix(hash(q), hash(q+vec2(1,0)), f.x),
                 mix(hash(q+vec2(0,1)), hash(q+vec2(1,1)), f.x), f.y);
    }
    vec4 sampleArt(float index, vec2 uv) {
      index = floor(index + .5);
      vec2 cell = vec2(mod(index, 8.0), floor(index/8.0));
      vec2 faceSize = index > 15.5 || index < .5 ? vec2(255.) : vec2(223.,255.);
      vec2 atlasUV = (cell + (vec2(.5) + clamp(uv,0.,1.)*faceSize)/256.) / vec2(8.,4.);
      return texture2D(art, atlasUV);
    }
    void main() {
      float floorSurface = 1.0 - step(.5, material.x);
      float axis = mix(world.x, world.z, material.y);
      vec2 faceUV = vec2(fract(axis), 1.0-world.y/max(material.z,.1));
      vec2 groundUV = vec2(world.x,world.z) * 1.48;
      vec2 textureUV = mix(faceUV, fract(groundUV), floorSurface);
      vec4 texel = sampleArt(tileIndex, textureUV);
      if (material.x > 1.5) {
        // The original gate tile contains a drawn view through the arch.
        // Cut a real opening and let the depth buffer reveal the scene.
        if (abs(faceUV.x-.5) < .26 && world.y < .92) discard;
        texel = sampleArt(2., faceUV);
      }
      if (texel.a < .55) discard;
      vec3 color = texel.rgb;
      color *= (.79 + material.w*.20) * (.93 + noise(world.xz * .76)*.13);
      float haze = 1.0-exp(-max(0.0, depth)*.075);
      gl_FragColor = vec4(mix(color, vec3(.72,.68,.56), haze),1);
    }
  `;
  function shader(type: number, source: string) {
    const item = gl!.createShader(type)!;
    gl!.shaderSource(item, source);
    gl!.compileShader(item);
    if (!gl!.getShaderParameter(item, gl!.COMPILE_STATUS)) throw new Error(gl!.getShaderInfoLog(item) ?? "");
    return item;
  }
  const program = gl.createProgram()!;
  const vertexShader = shader(gl.VERTEX_SHADER, vertex);
  const fragmentShader = shader(gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "");
  gl.useProgram(program);
  type Point = [number, number, number];
  type Surface = [number, number, number, number];
  const vertices: number[] = [];
  function quad(a: Point, b: Point, c: Point, d: Point, surface: Surface, tile = 0) {
    for (const p of [a,b,c,a,c,d]) vertices.push(...p, ...surface, tile);
  }
  quad([-5,0,-5], [13,0,-5], [13,0,21], [-5,0,21], [0,0,.7,.5], 16);
  quad([13,-.09,-5], [24,-.09,-5], [24,-.09,21], [13,-.09,21], [0,0,0,0], 17);
  quad([13,-.16,-5],[13,-.16,21],[13,0,21],[13,0,-5],[1,1,.5,.5],2);
  function piling(x:number,z:number) {
    const radius=.055, bottom=-.18, top=.46;
    const ns: Surface=[1,0,top,.89], ew: Surface=[1,1,top,.54];
    quad([x-radius,bottom,z-radius],[x+radius,bottom,z-radius],[x+radius,top,z-radius],[x-radius,top,z-radius],ns,18);
    quad([x-radius,bottom,z+radius],[x+radius,bottom,z+radius],[x+radius,top,z+radius],[x-radius,top,z+radius],ns,18);
    quad([x-radius,bottom,z-radius],[x-radius,bottom,z+radius],[x-radius,top,z+radius],[x-radius,top,z-radius],ew,18);
    quad([x+radius,bottom,z-radius],[x+radius,bottom,z+radius],[x+radius,top,z+radius],[x+radius,top,z-radius],ew,18);
    quad([x-radius,top,z-radius],[x+radius,top,z-radius],[x+radius,top,z+radius],[x-radius,top,z+radius],ns,18);
  }
  for (const z of [1, 3, 5, 7]) {
    quad([13,0,z], [16,0,z], [16,0,z+1], [13,0,z+1], [0,0,.7,.5], 16);
    quad([16,0,z], [16,-.12,z], [16,-.12,z+1], [16,0,z+1], [1,1,0,0], 18);
    for (const x of [13.15,13.86,14.57,15.28,15.92]) {
      piling(x,z+.03);
      piling(x,z+.97);
    }
  }
  const step = [[0,0,1,0], [1,0,1,1], [0,1,1,1], [0,0,0,1]];
  for (let z = 0; z < 16; z++) for (let x = 0; x < 16; x++) {
    walls[z*16+x].forEach((type, side) => {
      if (!type || (type === 14 && x >= 12 && z < 8)) return;
      const [sx, sz, ex, ez] = step[side];
      const ax = x+sx, az = z+sz, bx = x+ex, bz = z+ez;
      const seed = ((ax*53 + az*37 + type*17) % 61)/60;
      const axis = sx === ex ? 1 : 0;
      const isGate = type === 1 && (ax === 0 || ax === 13);
      const height = (isGate ? 1.52 : 1.19) + (seed-.5)*.29;
      const lit = axis ? .25 : .92;
      const dx = (bx-ax)*.027, dz = (bz-az)*.027;
      const ox = -dz, oz = dx;
      const color: Surface = [isGate ? 2 : 1,axis,height,lit];
      const sign = side === 0 || side === 1 ? 1 : -1;
      quad([ax+sign*ox,0,az+sign*oz],[bx+sign*ox,0,bz+sign*oz],
        [bx+sign*ox,height,bz+sign*oz],[ax+sign*ox,height,az+sign*oz],color,type);
      if (isGate) {
        const nearX=ax+sign*ox, nearZ=az+sign*oz, endX=bx+sign*ox, endZ=bz+sign*oz;
        const leftX=nearX+(endX-nearX)*.24, leftZ=nearZ+(endZ-nearZ)*.24;
        const rightX=nearX+(endX-nearX)*.76, rightZ=nearZ+(endZ-nearZ)*.76;
        const recessX=-sign*ox*15, recessZ=-sign*oz*15;
        const shade: Surface=[1,axis,.92,-2.8];
        quad([leftX+recessX,0,leftZ+recessZ],[rightX+recessX,0,rightZ+recessZ],
          [rightX+recessX,.92,rightZ+recessZ],[leftX+recessX,.92,leftZ+recessZ],shade,2);
        const jamb: Surface=[1,1-axis,.92,-1];
        for (const [x,z] of [[leftX,leftZ],[rightX,rightZ]]) {
          quad([x,0,z],[x+recessX,0,z+recessZ],[x+recessX,.92,z+recessZ],[x,.92,z],jamb,2);
        }
      }
    });
  }
  const radians = view.facing * Math.PI/4;
  gl.uniform3f(gl.getUniformLocation(program, "eye"), view.x+.5,.69,view.y+.5);
  gl.uniform2f(gl.getUniformLocation(program, "forward"), Math.sin(radians),-Math.cos(radians));
  gl.uniform2f(gl.getUniformLocation(program, "right"), Math.cos(radians),Math.sin(radians));
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const pos = gl.getAttribLocation(program, "position");
  const mat = gl.getAttribLocation(program, "surface");
  const tile = gl.getAttribLocation(program, "tile");
  gl.enableVertexAttribArray(pos);
  gl.enableVertexAttribArray(mat);
  gl.enableVertexAttribArray(tile);
  gl.vertexAttribPointer(pos,3,gl.FLOAT,false,32,0);
  gl.vertexAttribPointer(mat,4,gl.FLOAT,false,32,12);
  gl.vertexAttribPointer(tile,1,gl.FLOAT,false,32,28);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.viewport(0,0,canvas.width,canvas.height);
  gl.enable(gl.DEPTH_TEST);
  gl.clearColor(0,0,0,0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLES,0,vertices.length/8);
  if (gl.getError() !== gl.NO_ERROR) throw new Error("WebGL draw failed");
  gl.deleteBuffer(buffer);
  gl.deleteTexture(texture);
  gl.useProgram(null);
  gl.deleteProgram(program);
}

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
const __name = (value) => value;
const render = ${render.toString()};
const walls = ${JSON.stringify(walls)};
try {
  const atlas = document.createElement("canvas");
  atlas.width = 2048;
  atlas.height = 1024;
  const context = atlas.getContext("2d");
  const images = new Map(await Promise.all(${JSON.stringify(textures)}.map(async ([file, source]) => {
    const image = new Image();
    image.src = source;
    await image.decode();
    return [file,image];
  })));
  await Promise.all(${JSON.stringify(referenceFiles)}.map(async ({enhancedFrame,tiles},index)=>{
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
  function paint(art,x,y,width,height,crop) {
    if (!art) {
      context.fillStyle = "#ab3a72";
      context.fillRect(x,y,width,height);
      context.fillStyle = "#6d274d";
      context.fillRect(x,y,width/2,height/2);
      context.fillRect(x+width/2,y+height/2,width/2,height/2);
      return;
    }
    context.save();
    context.translate(x + (art.reflected ? width : 0),y);
    context.scale(art.reflected ? -1 : 1,1);
    const image = images.get(art.file);
    if (crop) context.drawImage(image,...crop,0,0,width,height);
    else context.drawImage(image,0,0,width,height);
    context.restore();
  }
  paint(null,0,0,256,256);
  function draw(highlight) {
  context.clearRect(0,0,atlas.width,atlas.height);
  ${JSON.stringify(sources.walls.map(({parts})=>parts))}.forEach((face,i) => {
    const index = i+1;
    const dx = index%8*256;
    const dy = Math.floor(index/8)*256;
    face.forEach(({art,status,mask,crop}, part) => {
      if (status === "transparent") return;
      const x = dx+part%7*32;
      const y = dy+Math.floor(part/7)*32;
      if (crop) {
        context.save();
        context.beginPath();
        context.rect(x,y,32,32);
        context.clip();
        for (const piece of crop.parts) paint(piece,x+piece.x*4,y+piece.y*4,32,32);
        context.restore();
      } else paint(highlight && status === "reconstructed" ? null : art,x,y,32,32);
      mask?.forEach((visible,i) => {
        if (!visible) context.clearRect(x+i%8*4,y+Math.floor(i/8)*4,4,4);
      });
    });
  });
  for (const {type,art,crop} of ${JSON.stringify(materialOverrides)}) {
    const dx = type%8*256;
    const dy = Math.floor(type/8)*256;
    for (let row=0;row<8;row++) for (let column=0;column<7;column++) {
      const x=dx+column*32, y=dy+row*32;
      if (crop && !highlight) {
        const image = images.get(art.file);
        context.drawImage(image,...crop,x,y,16,32);
        context.drawImage(image,...crop,x+16,y,16,32);
      } else paint(highlight ? null : art,x,y,32,32);
    }
  }
  paint(${JSON.stringify(groundArt)},0,512,256,256);
  context.fillStyle = "#6e6c65";
  context.fillRect(0,0,256,256);
  const harbor = ${JSON.stringify(harborMaterials)};
  paint(highlight ? null : harbor.water.art,256,512,256,256,harbor.water.crop);
  paint(highlight ? null : harbor.dockPiling.art,512,512,256,256,harbor.dockPiling.crop);
  const sky = ${JSON.stringify(skyArt)};
  if (sky) document.querySelectorAll("canvas:not(.reference)").forEach(canvas => {
    const paths = new Map(${JSON.stringify(textures.filter(([file])=>file===skyArt?.file))});
    canvas.style.backgroundImage = "url("+paths.get(sky.file)+")";
  });
  ${JSON.stringify(views)}.forEach((view, i) => render(document.getElementById("view" + i), walls, view, atlas));
  }
  const toggle = document.getElementById("audit");
  toggle.checked = new URLSearchParams(location.search).has("audit");
  draw(toggle.checked);
  toggle.addEventListener("change", () => draw(toggle.checked));
  document.body.dataset.rendered = "true";
} catch (error) {
  document.body.dataset.rendered = "false";
  document.body.append(document.createTextNode(String(error)));
}
</script>`;
writeFileSync("out/new-phlan-3d-comparison.html", out);
