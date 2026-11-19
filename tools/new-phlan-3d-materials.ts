import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseDax } from "../src/lib/dax.js";
import { decodePicture } from "../src/lib/picture.js";
import { glyphFor, glyphsFromPicture, loadWalldef, parseGeo, SYMBOL_BASE, wallSlot } from "../src/lib/world.js";

type ArtAsset = { file: string; reflected: boolean };
export type NewPhlanTrace = { trace: string; batches: [number,number,string,string][][] };

export function buildNewPhlanMaterials(root: string, enhancedTiles: ReadonlyMap<string, ArtAsset>,
  traceSources: readonly NewPhlanTrace[] = []) {
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
      part.status === "exact" && part.art?.key.startsWith(`tile:0:${suffix}`));
    if (!source?.art) throw new Error(`Missing verified masonry for wall type ${type}`);
    return {type, slot:source.slot, symbol:source.symbol, art:source.art,
      crop:type === 11 ? [16,0,16,32] : null};
  });
  const wallFaces = faces.map((parts, i) => ({ type: i+1, parts: parts.map(({pixels,...part})=>part) }));
  const unresolved = wallFaces.flatMap(wall=>wall.parts).filter(part=>part.status==="unresolved").length;
  if (unresolved) throw new Error(`Could not resolve ${unresolved} New Phlan wall slots`);
  return { walls, wallFaces, ground:groundArt, sky:skyArt, ...harborMaterials, materialOverrides };
}
