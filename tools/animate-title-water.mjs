// Regenerate the lossless Enhanced title loop from the approved 1280×800 harbor painting.
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const width = 1280, height = 800, frames = 32;
const original = execFileSync("ffmpeg", ["-loglevel", "error", "-i", "upgrades/harbor-title.png",
  "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], { maxBuffer: width * height * 4 });
// Leftmost open water at each scanline. Keep a still margin around the skiffs, quay and mooring ropes.
const shore = [[624, 860], [628, 690], [665, 680], [673, 670], [680, 591],
  [720, 595], [754, 577], [776, 567], [782, 440], [799, 430]];
const lights = [
  // Glass of the dock lantern and the two gate torches, followed by distant lit windows.
  [197,484,17,21], [325,521,8,12], [491,527,7,10],
  [621,488,6,9], [843,489,3,5], [1151,476,5,9],
];
// Pass the bright-ripple and quiet-water ImageGen edits of the same source painting.
const edits = process.argv.slice(2);
if (edits.length !== 2) throw new Error("Expected the two ImageGen keyframe PNG paths.");
const paintings = edits.map(path => execFileSync("ffmpeg", ["-loglevel", "error", "-i", path,
  "-vf", "scale=1280:800:flags=area", "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
  { maxBuffer: width * height * 4 }));
function falloff(x,y,cx,cy,rx,ry) {
  return Math.max(0, 1 - ((x-cx)/rx)**2 - ((y-cy)/ry)**2);
}
const mask = new Float32Array(width * height);
for (let y=410; y<height; y++) {
  const i=shore.findIndex(([row]) => row>=y);
  const [y1,x1]=shore[i], [y0,x0]=shore[Math.max(0,i-1)];
  const left=y1===y0 ? x1 : x0+(x1-x0)*(y-y0)/(y1-y0);
  for (let x=0; x<width; x++) {
    const n=y*width+x, k=n*3;
    const water=Math.max(0,Math.min(1,(x-left)/12,(y-624)/6));
    const cyan=Math.min(1,Math.max(0,(original[k+1]-original[k]-22)/80));
    let amount=Math.max(.29*water,.32*cyan*falloff(x,y,925,553,139,232));
    if (original[k]>original[k+2]*1.5) {
      for(const light of lights) amount=Math.max(amount,.46*falloff(x,y,...light));
    }
    mask[n]=amount;
  }
}
const dir = mkdtempSync(join(tmpdir(), "por-harbor-"));
try {
  // Original, bright, original, quiet, then back to the original across the loop seam.
  for (let frame=0; frame<frames; frame++) {
    const phase=frame/frames;
    const painting=paintings[phase<.5 ? 0 : 1];
    const weight=Math.sin(phase*2*Math.PI)**2;
    const pixels=Buffer.from(original);
    for(let n=0;n<mask.length;n++){
      if (!mask[n]) continue;
      for(let k=n*3;k<n*3+3;k++)
        pixels[k]=Math.round(original[k]+weight*mask[n]*(painting[k]-original[k]));
    }
    writeFileSync(join(dir,`frame-${String(frame).padStart(2,"0")}.rgb`),pixels);
  }
  execFileSync("ffmpeg", ["-y","-loglevel","error","-f","image2","-vcodec","rawvideo","-pixel_format","rgb24",
    "-video_size","1280x800","-framerate","8","-i",join(dir,"frame-%02d.rgb"),join(dir,"paint-%02d.png")]);
  execFileSync("apngasm", ["upgrades/harbor-title-ripple.png", join(dir,"paint-01.png"), "1", "8"]);
} finally {
  rmSync(dir,{recursive:true,force:true});
}
