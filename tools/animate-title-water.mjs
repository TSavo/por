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
const tau = Math.PI * 2;
function falloff(x,y,cx,cy,rx,ry) {
  return Math.max(0, 1 - ((x-cx)/rx)**2 - ((y-cy)/ry)**2);
}
const dir = mkdtempSync(join(tmpdir(), "por-harbor-"));
try {
  for (let frame = 0; frame < frames; frame++) {
    const phase = tau * frame / frames;
    const pixels = Buffer.from(original);
    for (let y = shore[0][0]; y < height; y++) {
      const i = shore.findIndex(([row]) => row >= y);
      const [y1,x1] = shore[i], [y0,x0] = shore[Math.max(0,i-1)];
      const left = Math.ceil(y1 === y0 ? x1 : x0+(x1-x0)*(y-y0)/(y1-y0));
      for (let x = left; x < width-2; x++) {
        const fade = Math.min(1,(x-left)/14,(width-2-x)/12,(y-624)/5);
        const wave = (Math.sin(phase+y*.19+x*.006)-Math.sin(y*.19+x*.006))*.58 +
          (Math.sin(phase*2+y*.08-x*.013)-Math.sin(y*.08-x*.013))*.20;
        const sample = x + wave*fade;
        const j = (y*width+x)*3, k = (y*width+Math.floor(sample))*3;
        for (let c=0;c<3;c++) pixels[j+c] = Math.round(original[k+c]+(sample%1)*(original[k+3+c]-original[k+c]));
      }
    }
    for (const [i,[cx,cy,rx,ry]] of lights.entries()) {
      const flicker = .043*(Math.sin(phase*3+i)-Math.sin(i)) + .021*(Math.sin(phase*5+i*2)-Math.sin(i*2));
      for(let y=cy-ry;y<=cy+ry;y++) for(let x=cx-rx;x<=cx+rx;x++){
        const k=(y*width+x)*3;
        if(original[k] <= original[k+2]*1.5) continue;
        const amount=flicker*falloff(x,y,cx,cy,rx,ry);
        for(let c=0;c<3;c++) pixels[k+c]=Math.max(0,Math.min(255,Math.round(original[k+c]*(1+amount))));
      }
    }
    // Only the cyan light on the far arch and its reflection breathe. The stone stays still.
    for(let y=410;y<height;y++) for(let x=783;x<1060;x++){
      const k=(y*width+x)*3;
      const color=Math.min(1,Math.max(0,(original[k+1]-original[k]-22)/80));
      const amount=.046*Math.sin(phase)*color*falloff(x,y,925,553,139,232);
      for(let c=1;c<=2;c++) pixels[k+c]=Math.min(255,Math.round(pixels[k+c]*(1+amount)));
    }
    writeFileSync(join(dir,`frame-${String(frame).padStart(2,"0")}.rgb`),pixels);
  }
  execFileSync("ffmpeg", ["-y","-loglevel","error","-f","image2","-vcodec","rawvideo","-pixel_format","rgb24",
    "-video_size","1280x800","-framerate","8","-i",join(dir,"frame-%02d.rgb"),join(dir,"paint-%02d.png")]);
  execFileSync("apngasm", ["upgrades/harbor-title-ripple.png", join(dir,"paint-01.png"), "1", "8"]);
} finally {
  rmSync(dir,{recursive:true,force:true});
}
