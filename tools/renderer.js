// Place-agnostic Enhanced exploration and overland renderer.
// Exploration lighting, derived maps and post replace the old flat multiply.
// Overland is unchanged. Geometry and camera stay as they were.

export const defaultLayout = {
  id: "local",
  ground: { x0: -5, z0: -5, x1: 21, z1: 21, height: .7, tile: 16, shade: .5 },
};

/** New Phlan harbor, piers, pilings and city gates. Passed as per-area config. */
export const phlanHarborLayout = {
  id: "phlan",
  ground: { x0: -5, z0: -5, x1: 13, z1: 21, height: .7, tile: 16, shade: .5 },
  water: { x0: 13, z0: -5, x1: 24, z1: 21, y: -.09, tile: 17, shade: 0 },
  seawall: { x: 13, z0: -5, z1: 21, y0: -.16, y1: 0, tile: 2, shade: .5 },
  piers: { zs: [1, 3, 5, 7], x0: 13, x1: 16, height: .7, tile: 16, shade: .5, edgeY: -.12, edgeTile: 18 },
  pilings: {
    xs: [13.15, 13.86, 14.57, 15.28, 15.92],
    radius: .055, bottom: -.18, top: .46, tile: 18, nsShade: .89, ewShade: .54,
  },
  skipWall: { type: 14, minX: 12, maxZExclusive: 8 },
  gates: { type: 1, axes: [0, 13], height: 1.52, openingHalf: .26, openingTop: .92, jambTile: 2, recess: 15 },
};

export function resolveLayout(layout) {
  if (!layout || layout === "local") return defaultLayout;
  if (layout === "phlan") return phlanHarborLayout;
  if (typeof layout === "object") {
    if (layout.id === "phlan" || layout.water || layout.gates || layout.pilings) {
      return { ...phlanHarborLayout, ...layout, id: layout.id ?? "phlan" };
    }
    return { ...defaultLayout, ...layout };
  }
  return defaultLayout;
}

function tileBumpStrength(index) {
  if (index === 16) return 0.7;
  if (index === 17) return 0.7;
  if (index === 18) return 0.75;
  if (index >= 1 && index <= 15) return 2.7;
  return 1.2;
}

function blurBox(src, size, radius, wrap) {
  const tmp = new Float32Array(size * size);
  const out = new Float32Array(size * size);
  const clamp = (v) => {
    if (wrap) return ((v % size) + size) % size;
    return v < 0 ? 0 : v > size - 1 ? size - 1 : v;
  };
  const div = 1 / (radius * 2 + 1);
  for (let y = 0; y < size; y++) {
    let acc = 0;
    const row = y * size;
    for (let k = -radius; k <= radius; k++) acc += src[row + clamp(k)];
    tmp[row] = acc;
    for (let x = 1; x < size; x++) {
      acc += src[row + clamp(x + radius)] - src[row + clamp(x - radius - 1)];
      tmp[row + x] = acc;
    }
  }
  for (let i = 0; i < tmp.length; i++) tmp[i] *= div;
  for (let x = 0; x < size; x++) {
    let acc = 0;
    for (let k = -radius; k <= radius; k++) acc += tmp[clamp(k) * size + x];
    out[x] = acc;
    for (let y = 1; y < size; y++) {
      acc += tmp[clamp(y + radius) * size + x] - tmp[clamp(y - radius - 1) * size + x];
      out[y * size + x] = acc;
    }
  }
  for (let i = 0; i < out.length; i++) out[i] *= div;
  return out;
}

function deriveNormalRoughness(atlas) {
  // Per-atlas-cell, multi-scale Sobel on band-passed luminance so mortar,
  // brick edges, planks and ivy get real relief without wrapping into
  // neighboring tiles or following large painted gradients.
  const width = atlas.width, height = atlas.height;
  const work = document.createElement("canvas");
  work.width = width;
  work.height = height;
  const context = work.getContext("2d");
  context.drawImage(atlas, 0, 0);
  const source = context.getImageData(0, 0, width, height);
  const out = context.createImageData(width, height);
  const cell = 256, cols = 8, rows = 4;
  for (let cy = 0; cy < rows; cy++) {
    for (let cx = 0; cx < cols; cx++) {
      const index = cy * cols + cx;
      const ox = cx * cell, oy = cy * cell;
      const lum = new Float32Array(cell * cell);
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const i = ((oy + y) * width + (ox + x)) * 4;
          lum[y * cell + x] = source.data[i] * .299 + source.data[i + 1] * .587 + source.data[i + 2] * .114;
        }
      }
      const wrap = index === 16 || index === 17 || index === 18;
      const fine = blurBox(lum, cell, 1, wrap);
      const mid = blurBox(lum, cell, 3, wrap);
      const broad = blurBox(lum, cell, 8, wrap);
      let fineEnergy = 0, midEnergy = 0;
      const count = cell * cell;
      for (let i = 0; i < count; i++) {
        const f = fine[i] - mid[i];
        const m = mid[i] - broad[i];
        fineEnergy += f * f;
        midEnergy += m * m;
      }
      fineEnergy = Math.sqrt(fineEnergy / count);
      midEnergy = Math.sqrt(midEnergy / count);
      const lowRatio = midEnergy / (fineEnergy + midEnergy + 1e-4);
      // Cave rock is dominated by large painted patches; ivy/mottle is noisy
      // at a fine scale. Brick mortar stays mid-frequency and regular.
      const wallTile = index >= 1 && index <= 15;
      const organic = wallTile ? Math.max(0, Math.min(1, (lowRatio - 0.52) / 0.30)) : 0;
      const sparkle = wallTile ? Math.max(0, Math.min(1, (fineEnergy - 3.5) / 9.0)) : 0;
      let fineAmt = (index === 16 || index === 18) ? 0.4 : 1.15;
      let midAmt = (index === 16 || index === 18) ? 0.22 : 0.42;
      fineAmt *= 1 - 0.55 * sparkle;
      midAmt *= 1 - 0.62 * organic;
      const band = new Float32Array(count);
      let mean = 0;
      for (let i = 0; i < band.length; i++) {
        band[i] = (fine[i] - mid[i]) * fineAmt + (mid[i] - broad[i]) * midAmt;
        mean += band[i];
      }
      mean /= band.length;
      let variance = 0;
      for (let i = 0; i < band.length; i++) {
        const d = band[i] - mean;
        variance += d * d;
      }
      const std = Math.sqrt(variance / band.length) || 1;
      const heightMap = new Float32Array(count);
      for (let i = 0; i < band.length; i++)
        heightMap[i] = Math.max(0, Math.min(1, 0.5 + (band[i] - mean) / (std * 2.6)));
      let strength = tileBumpStrength(index);
      if (wallTile) strength *= (1 - 0.86 * organic) * (1 - 0.25 * sparkle);
      const clampC = (v) => {
        if (wrap) return ((v % cell) + cell) % cell;
        return v < 0 ? 0 : v > cell - 1 ? cell - 1 : v;
      };
      const at = (x, y) => heightMap[clampC(y) * cell + clampC(x)];
      for (let y = 0; y < cell; y++) {
        for (let x = 0; x < cell; x++) {
          const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)
            - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1))) / 8;
          const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)
            - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1))) / 8;
          let nx = -dx * strength, ny = -dy * strength, nz = 1;
          const length = Math.hypot(nx, ny, nz) || 1;
          nx /= length; ny /= length; nz /= length;
          const contrast = Math.abs(fine[y * cell + x] - mid[y * cell + x]);
          const roughness = Math.min(.92, Math.max(.2, .3 + contrast / 40 + sparkle * 0.22));
          const i = ((oy + y) * width + (ox + x)) * 4;
          out.data[i] = (nx * .5 + .5) * 255;
          out.data[i + 1] = (ny * .5 + .5) * 255;
          out.data[i + 2] = heightMap[y * cell + x] * 255;
          out.data[i + 3] = roughness * 255;
        }
      }
    }
  }
  context.putImageData(out, 0, 0);
  return work;
}


const explorationSunDir = (() => {
  const d = [0.78, 0.36, 0.50];
  const length = Math.hypot(...d);
  return [d[0] / length, d[1] / length, d[2] / length];
})();

const AO_BOUNDS = { x0: -6, z0: -6, x1: 25, z1: 25 };
const AO_RES = 256;

function collectOccluders(walls, layout, wallRows) {
  const segments = [];
  const posts = [];
  const skip = layout.skipWall;
  const gates = layout.gates;
  const step = [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 0, 1]];
  for (let z = 0; z < 16; z++) {
    for (let x = 0; x < 16; x++) {
      const sides = walls[z * 16 + x];
      if (!sides) continue;
      sides.forEach((type, side) => {
        if (!type || (skip && type === skip.type && x >= skip.minX && z < skip.maxZExclusive))
          return;
        const rows = wallRows[type] ?? 8;
        if (rows === 0) return;
        const [sx, sz, ex, ez] = step[side];
        const ax = x + sx, az = z + sz, bx = x + ex, bz = z + ez;
        const isGate = Boolean(gates && type === gates.type && gates.axes.includes(ax));
        const height = (isGate ? gates.height : 1.19) * rows / 8;
        if (isGate) {
          const mx = ax + (bx - ax) * .24, mz = az + (bz - az) * .24;
          const nx = ax + (bx - ax) * .76, nz = az + (bz - az) * .76;
          segments.push({ x0: ax, z0: az, x1: mx, z1: mz, y: .92 });
          segments.push({ x0: nx, z0: nz, x1: bx, z1: bz, y: .92 });
          segments.push({ x0: ax, z0: az, x1: bx, z1: bz, y: height, y0: .92 });
        } else {
          segments.push({ x0: ax, z0: az, x1: bx, z1: bz, y: height });
        }
      });
    }
  }
  if (layout.pilings && layout.piers) {
    const p = layout.pilings;
    for (const z of layout.piers.zs) {
      for (const x of p.xs) {
        posts.push({ x, z: z + .03, r: p.radius * 1.6, y: p.top });
        posts.push({ x, z: z + .97, r: p.radius * 1.6, y: p.top });
      }
    }
  }
  return { segments, posts };
}

function distToSeg(px, pz, s) {
  const vx = s.x1 - s.x0, vz = s.z1 - s.z0;
  const l2 = vx * vx + vz * vz;
  if (l2 < 1e-8) return Math.hypot(px - s.x0, pz - s.z0);
  let t = ((px - s.x0) * vx + (pz - s.z0) * vz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (s.x0 + t * vx), pz - (s.z0 + t * vz));
}

function indexOccluders(segments, posts) {
  const cells = new Map();
  function add(ix, iz, bucket, item) {
    const key = ix + "," + iz;
    let cell = cells.get(key);
    if (!cell) { cell = { segments: [], posts: [] }; cells.set(key, cell); }
    cell[bucket].push(item);
  }
  for (const s of segments) {
    const minx = Math.floor(Math.min(s.x0, s.x1)) - 1;
    const maxx = Math.floor(Math.max(s.x0, s.x1)) + 1;
    const minz = Math.floor(Math.min(s.z0, s.z1)) - 1;
    const maxz = Math.floor(Math.max(s.z0, s.z1)) + 1;
    for (let x = minx; x <= maxx; x++)
      for (let z = minz; z <= maxz; z++) add(x, z, "segments", s);
  }
  for (const p of posts) add(Math.floor(p.x), Math.floor(p.z), "posts", p);
  return cells;
}

function occluderAt(cells, px, py, pz) {
  const cell = cells.get(Math.floor(px) + "," + Math.floor(pz));
  if (!cell) return false;
  for (const s of cell.segments) {
    const y0 = s.y0 ?? 0;
    if (py < y0 || py > s.y + .02) continue;
    if (distToSeg(px, pz, s) < .08) return true;
  }
  for (const p of cell.posts) {
    if (py <= p.y + .02 && Math.hypot(px - p.x, pz - p.z) < p.r + .05) return true;
  }
  return false;
}

function sunVisibility(cells, x, z, y, sunDir) {
  const offsets = [[0, 0], [.06, .04], [-.06, .04], [.04, -.06], [-.05, -.04]];
  let vis = 0;
  for (const [ox, oz] of offsets) {
    let px = x + ox, py = y + .05, pz = z + oz;
    let blocked = false;
    for (let i = 0; i < 40; i++) {
      px += sunDir[0] * .1;
      py += sunDir[1] * .1;
      pz += sunDir[2] * .1;
      if (py > 2.2) break;
      if (occluderAt(cells, px, py, pz)) { blocked = true; break; }
    }
    if (!blocked) vis += 1;
  }
  return vis / offsets.length;
}

function nearbyOccluders(cells, x, z) {
  const segments = [], posts = [], seenS = new Set(), seenP = new Set();
  const ix = Math.floor(x), iz = Math.floor(z);
  for (let dz = -2; dz <= 2; dz++) {
    for (let dx = -2; dx <= 2; dx++) {
      const cell = cells.get((ix + dx) + "," + (iz + dz));
      if (!cell) continue;
      for (const s of cell.segments) {
        if (seenS.has(s)) continue;
        seenS.add(s);
        segments.push(s);
      }
      for (const p of cell.posts) {
        if (seenP.has(p)) continue;
        seenP.add(p);
        posts.push(p);
      }
    }
  }
  return { segments, posts };
}

function bakeOcclusion(walls, layout, wallRows, sunDir) {
  const { segments, posts } = collectOccluders(walls, layout, wallRows);
  const cells = indexOccluders(segments, posts);
  const { x0, z0, x1, z1 } = AO_BOUNDS;
  const res = AO_RES;
  const data = new Uint8Array(res * res * 4);
  for (let j = 0; j < res; j++) {
    const z = z0 + (j + .5) / res * (z1 - z0);
    for (let i = 0; i < res; i++) {
      const x = x0 + (i + .5) / res * (x1 - x0);
      const near = nearbyOccluders(cells, x, z);
      let dark = 0;
      for (const s of near.segments) {
        const d = distToSeg(x, z, s);
        dark = Math.max(dark, .62 * Math.exp(-(d * d) / .032));
      }
      for (const p of near.posts) {
        const d = Math.max(0, Math.hypot(x - p.x, z - p.z) - p.r);
        dark = Math.max(dark, .55 * Math.exp(-(d * d) / .022));
      }
      const ao = Math.max(.4, 1 - dark);
      const sun = sunVisibility(cells, x, z, .03, sunDir);
      const o = (j * res + i) * 4;
      data[o] = Math.round(ao * 255);
      data[o + 1] = Math.round(sun * 255);
      data[o + 2] = 0;
      data[o + 3] = 255;
    }
  }
  return data;
}

function compile(gl, type, source) {
  const item = gl.createShader(type);
  gl.shaderSource(item, source);
  gl.compileShader(item);
  if (!gl.getShaderParameter(item, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(item) ?? "Shader compile failed");
  }
  return item;
}

function link(gl, vertex, fragment) {
  const program = gl.createProgram();
  const vs = compile(gl, gl.VERTEX_SHADER, vertex);
  const fs = compile(gl, gl.FRAGMENT_SHADER, fragment);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "Shader link failed");
  }
  return program;
}

function makeTexture(gl, target = gl.TEXTURE_2D) {
  const texture = gl.createTexture();
  gl.bindTexture(target, texture);
  gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return texture;
}

function colorTarget(gl, width, height) {
  const extHalf = gl.getExtension("EXT_color_buffer_half_float") || gl.getExtension("WEBGL_color_buffer_float");
  const half = gl.getExtension("OES_texture_half_float");
  const halfLinear = gl.getExtension("OES_texture_half_float_linear");
  const texture = makeTexture(gl);
  let format = gl.RGBA, type = gl.UNSIGNED_BYTE, hdr = false;
  if (extHalf && half) {
    const HALF = half.HALF_FLOAT_OES;
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, HALF, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE) {
      type = HALF;
      hdr = true;
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
  }
  if (!hdr) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  }
  if (!hdr || !halfLinear) {
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }
  return { texture, format, type, hdr };
}

const sceneVertex = `
  attribute vec3 position;
  attribute vec4 surface;
  attribute float tile;
  attribute float faceU;
  attribute vec3 normal;
  uniform vec3 eye;
  uniform float aspect;
  uniform vec2 forward;
  uniform vec2 right;
  varying vec3 world;
  varying vec3 worldNormal;
  varying vec4 material;
  varying float depth;
  varying float tileIndex;
  varying float wallU;
  void main() {
    vec3 d = position - eye;
    float z = dot(d.xz, forward);
    world = position;
    worldNormal = normal;
    material = surface;
    depth = z;
    tileIndex = tile;
    wallU = faceU;
    const float focalLength = .60;
    gl_Position = vec4(dot(d.xz, right) * focalLength / aspect, d.y * focalLength + z * .11,
                       z * 1.003 - .08, z);
  }
`;

const sceneFragment = `
  #extension GL_OES_standard_derivatives : enable
  precision highp float;
  varying vec3 world;
  varying vec3 worldNormal;
  varying vec4 material;
  varying float depth;
  varying float tileIndex;
  varying float wallU;
  uniform sampler2D art;
  uniform sampler2D detail;
  uniform vec3 eye;
  uniform vec2 forward;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform vec3 skyColor;
  uniform vec3 groundColor;
  uniform vec3 fogColor;
  uniform float indoor;
  uniform float waterTile;
  uniform sampler2D aoMap;
  uniform vec4 aoRect;
  vec4 sampleArt(sampler2D map, float index, vec2 uv) {
    index = floor(index + .5);
    vec2 cell = vec2(mod(index, 8.0), floor(index/8.0));
    vec2 faceSize = index > 15.5 || index < .5 ? vec2(255.) : vec2(223.,255.);
    vec2 atlasUV = (cell + (vec2(.5) + clamp(uv,0.,1.)*faceSize)/256.) / vec2(8.,4.);
    return texture2D(map, atlasUV);
  }
  void main() {
    float floorSurface = 1.0 - step(.5, material.x);
    float axis = mix(world.x, world.z, material.y);
    float u = wallU < 0.0 ? fract(axis) : wallU;
    vec2 faceUV = vec2(u, 1.0-world.y/max(material.z,.1));
    vec2 groundUV = vec2(world.x,world.z) * 1.48;
    vec2 tileUV = fract(groundUV) * 0.98 + 0.01;
    vec2 textureUV = mix(faceUV, tileUV, floorSurface);
    vec2 derivUV = mix(faceUV, groundUV, floorSurface);
    if (material.x > 1.5) {
      if (abs(faceUV.x-.5) < .26 && world.y < .92) discard;
      textureUV = faceUV;
      derivUV = faceUV;
    }
    vec4 maps = sampleArt(detail, tileIndex, textureUV);
    if (material.x > 1.5) maps = sampleArt(detail, 2., faceUV);
    vec3 Ngeo = normalize(worldNormal);
    vec3 viewDir = eye - world;
    if (dot(Ngeo, viewDir) < 0.0) Ngeo = -Ngeo;
    vec3 dp1 = dFdx(world);
    vec3 dp2 = dFdy(world);
    vec2 duv1 = dFdx(derivUV);
    vec2 duv2 = dFdy(derivUV);
    vec3 T = normalize(dp1 * duv2.t - dp2 * duv1.t);
    vec3 B = normalize(cross(Ngeo, T));
    T = normalize(cross(B, Ngeo));
    float height = maps.b;
    vec2 viewParallax = vec2(dot(viewDir, T), dot(viewDir, B));
    float viewLen = max(length(viewDir), 0.001);
    viewParallax /= viewLen;
    float edgeFade = mix(smoothstep(0.0, 0.08, min(min(textureUV.x, textureUV.y), min(1.0 - textureUV.x, 1.0 - textureUV.y))), 1.0, floorSurface);
    float graze = smoothstep(0.28, 0.82, clamp(dot(Ngeo, normalize(viewDir)), 0.0, 1.0));
    float distFade = smoothstep(14.0, 3.5, max(depth, 0.0));
    float pScale = mix(0.024, 0.0, floorSurface) * edgeFade * graze * distFade;
    vec2 puv = textureUV - viewParallax * (height - 0.5) * pScale;
    puv = mix(clamp(puv, 0.0, 1.0), fract(puv) * 0.98 + 0.01, floorSurface);
    textureUV = puv;
    vec4 texel = sampleArt(art, tileIndex, textureUV);
    if (material.x > 1.5) texel = sampleArt(art, 2., puv);
    if (texel.a < .55) discard;
    maps = sampleArt(detail, tileIndex, textureUV);
    if (material.x > 1.5) maps = sampleArt(detail, 2., puv);
    height = maps.b;
    vec3 tangentNormal = vec3(maps.rg * 2.0 - 1.0, 0.0);
    tangentNormal.z = sqrt(max(0.01, 1.0 - dot(tangentNormal.xy, tangentNormal.xy)));
    tangentNormal = normalize(tangentNormal);
    float roughness = clamp(maps.a, 0.2, 0.95);
    vec3 N = normalize(mat3(T, B, Ngeo) * tangentNormal);
    if (dot(N, Ngeo) < 0.0) N = Ngeo;
    vec3 V = normalize(eye - world);
    // Fade bump hard at grazing angles and with distance so far walls stay clean.
    float bumpAmt = smoothstep(0.28, 0.82, clamp(dot(Ngeo, V), 0.0, 1.0)) * distFade;
    // Indoor floors keep painted pattern, not carved relief (Valjevo tiles).
    bumpAmt *= mix(1.0, 0.38, floorSurface * indoor);
    N = normalize(mix(Ngeo, N, bumpAmt));
    vec3 L = sunDir;
    float ndotl = pow(max(dot(N, L), 0.0), 1.15);
    float ndotv = max(dot(N, V), 0.0);
    vec3 H = normalize(L + V);
    float ndoth = max(dot(N, H), 0.0);
    float a = roughness * roughness;
    float a2 = a * a;
    float dDenom = ndoth * ndoth * (a2 - 1.0) + 1.0;
    float D = a2 / (3.14159 * dDenom * dDenom);
    float k = (roughness + 1.0) * (roughness + 1.0) / 8.0;
    float G = (ndotv / (ndotv * (1.0 - k) + k)) * (ndotl / (ndotl * (1.0 - k) + k));
    vec3 F0 = vec3(0.04);
    vec3 F = F0 + (1.0 - F0) * pow(1.0 - max(dot(H, V), 0.0), 5.0);
    vec3 spec = (D * G * F) / max(4.0 * ndotv * ndotl, 0.001);
    float hemi = N.y * 0.5 + 0.5;
    vec3 ambient = mix(groundColor, skyColor, hemi);
    vec3 albedo = texel.rgb;
    vec2 aoUV = vec2(
      (world.x - aoRect.x) / (aoRect.z - aoRect.x),
      (world.z - aoRect.y) / (aoRect.w - aoRect.y)
    );
    vec2 wallAoUV = vec2(
      (world.x + Ngeo.x * 0.12 - aoRect.x) / (aoRect.z - aoRect.x),
      (world.z + Ngeo.z * 0.12 - aoRect.y) / (aoRect.w - aoRect.y)
    );
    vec4 occ = texture2D(aoMap, mix(wallAoUV, aoUV, floorSurface));
    // Floor shadows stay in the bake. Walls use ndotl so a lit face is not
    // crushed by a floor-height shadow.
    float sunVis = mix(1.0, occ.g, floorSurface * (1.0 - indoor));
    float contact = mix(0.5, 1.0, smoothstep(0.0, 0.22, world.y));
    float ao = mix(mix(0.78, 1.0, occ.r) * contact, mix(0.58, 1.0, occ.r), floorSurface);
    ao *= mix(mix(0.78, 1.0, height), mix(0.94, 1.0, height), floorSurface);
    float raisedFloor = floorSurface * step(0.2, world.y);
    sunVis = mix(sunVis, 1.0, raisedFloor);
    ao = mix(ao, 0.96, raisedFloor);
    vec2 lightUV = vec2(dot(L, T), dot(L, B));
    float lightLen = length(lightUV);
    float bumpShadow = 1.0;
    // Height self-shadow on walls only, and kept soft so it doesn't blob.
    if (lightLen > 0.01 && sunColor.r > 0.0 && floorSurface < 0.5) {
      vec2 lStep = (lightUV / lightLen) * 0.018;
      float rise = max(dot(L, Ngeo), 0.0) * 0.32;
      for (int i = 1; i <= 4; i++) {
        vec2 suv = clamp(textureUV + lStep * float(i), 0.0, 1.0);
        float hs = sampleArt(detail, tileIndex, suv).b;
        float cone = height + rise * float(i);
        bumpShadow *= 1.0 - smoothstep(cone - 0.01, cone + 0.20, hs) * 0.16 * edgeFade * bumpAmt;
      }
    }
    sunVis *= bumpShadow;
    float floorHemi = mix(hemi, 0.28 + hemi * 0.25, floorSurface);
    ambient = mix(groundColor, skyColor, floorHemi);
    vec3 fill = mix(vec3(0.20, 0.23, 0.30), vec3(0.16, 0.14, 0.12), indoor);
    float sunAmt = ndotl * sunVis * (1.0 - indoor);
    sunAmt = sunAmt / (1.0 + 0.34 * sunAmt);
    vec3 sunLight = sunColor * sunAmt;
    vec3 color = albedo * (fill + ambient + sunLight) * ao + spec * sunLight * ao;
    vec3 torchDir = normalize(eye - world);
    float torchDist = length(eye - world);
    float torchAtt = 1.0 / (1.0 + torchDist * torchDist * 0.22);
    float torchN = max(dot(N, torchDir), 0.0);
    vec3 torchCol = vec3(1.0, 0.84, 0.62);
    // Floors take a slightly weaker torch so painted grain isn't a flat orange wash.
    float torchAmt = mix(0.10, 0.82, indoor) * mix(1.0, 0.70, floorSurface * indoor);
    color += albedo * torchCol * torchN * torchAtt * torchAmt * ao;
    color += albedo * vec3(0.14, 0.14, 0.15) * indoor * ao;

    float water = floorSurface * (1.0 - step(0.5, abs(tileIndex - waterTile)));
    float fogDensity = 0.062 + 0.028 * water;
    float haze = 1.0 - exp(-max(0.0, depth) * fogDensity);
    haze *= mix(1.0, 1.18, clamp(0.14 - world.y, 0.0, 1.0));
    haze = mix(haze, haze * 0.32, indoor);
    color = mix(color, fogColor, clamp(haze, 0.0, 0.62));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const skyVertex = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position;
    gl_Position = vec4(position, 1.0, 1.0);
  }
`;

const skyFragment = `
  precision highp float;
  varying vec2 uv;
  uniform float aspect;
  uniform vec2 forward;
  uniform vec2 right;
  uniform vec3 sunDir;
  uniform vec3 sunColor;
  uniform vec3 skyColor;
  uniform vec3 fogColor;
  uniform float indoor;
  void main() {
    if (indoor > 0.5) {
      gl_FragColor = vec4(0.03, 0.035, 0.045, 0.0);
      return;
    }
    vec3 ahead = normalize(vec3(forward.x, 0.0, forward.y));
    vec3 side = normalize(vec3(right.x, 0.0, right.y));
    vec3 up = vec3(0.0, 1.0, 0.0);
    const float focalLength = 0.60;
    vec3 dir = normalize(ahead + side * (uv.x * aspect / focalLength) + up * ((uv.y - 0.11) / focalLength));
    float elev = dir.y;
    bool hasSun = sunColor.r > 0.0;
    vec3 zenith = hasSun ? vec3(0.38, 0.56, 0.82) : vec3(0.016, 0.023, 0.042);
    vec3 color = mix(fogColor, zenith, clamp(elev * 1.5 + 0.12, 0.0, 1.0));
    if (hasSun) {
      float sunCore = pow(max(dot(dir, sunDir), 0.0), 320.0);
      float sunHalo = pow(max(dot(dir, sunDir), 0.0), 48.0);
      color += vec3(1.8, 1.35, 0.8) * sunHalo * 0.22;
      color += vec3(2.8, 2.2, 1.4) * sunCore * 1.55;
    }
    gl_FragColor = vec4(color, 0.0);
  }
`;

const postVertex = `
  attribute vec2 position;
  varying vec2 uv;
  void main() {
    uv = position * 0.5 + 0.5;
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const postFragment = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D color;
  uniform sampler2D bloom;
  uniform vec2 texel;
  float filmic(float x) {
    // Contrast-holding curve: blacks stay down, midtones keep saturation via luma map.
    const float a = 2.8, b = 0.02, c = 2.15, d = 0.72, e = 0.16;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }
  void main() {
    vec3 hdr = texture2D(color, uv).rgb;
    vec3 glow = texture2D(bloom, uv).rgb;
    float l = max(dot(hdr, vec3(0.2126, 0.7152, 0.0722)), 1e-5);
    vec3 mapped = hdr * (filmic(l) / l);
    float skyMask = 1.0 - texture2D(color, uv).a;
    mapped += glow * 0.45 * skyMask;
    float lm = dot(mapped, vec3(0.2126, 0.7152, 0.0722));
    mapped = mix(vec3(lm), mapped, 1.14);
    float vig = smoothstep(1.28, 0.4, length((uv - 0.5) * vec2(1.0, 1.12)));
    mapped *= mix(0.93, 1.0, vig);
    mapped *= vec3(1.03, 1.0, 0.97);
    gl_FragColor = vec4(clamp(mapped, 0.0, 1.0), 1.0);
  }
`;

const bloomFragment = `
  precision highp float;
  varying vec2 uv;
  uniform sampler2D color;
  uniform vec2 texel;
  uniform float extract;
  void main() {
    vec3 acc = vec3(0.0);
    acc += texture2D(color, uv + texel * vec2(-1.0, -1.0)).rgb;
    acc += texture2D(color, uv + texel * vec2( 0.0, -1.0)).rgb * 2.0;
    acc += texture2D(color, uv + texel * vec2( 1.0, -1.0)).rgb;
    acc += texture2D(color, uv + texel * vec2(-1.0,  0.0)).rgb * 2.0;
    acc += texture2D(color, uv).rgb * 4.0;
    acc += texture2D(color, uv + texel * vec2( 1.0,  0.0)).rgb * 2.0;
    acc += texture2D(color, uv + texel * vec2(-1.0,  1.0)).rgb;
    acc += texture2D(color, uv + texel * vec2( 0.0,  1.0)).rgb * 2.0;
    acc += texture2D(color, uv + texel * vec2( 1.0,  1.0)).rgb;
    acc /= 16.0;
    if (extract > 0.5) {
      float lum = dot(acc, vec3(0.2126, 0.7152, 0.0722));
      float sky = 1.0 - texture2D(color, uv).a;
      acc *= smoothstep(1.4, 2.4, lum) * sky;
    }
    gl_FragColor = vec4(acc, 1.0);
  }
`;

export function createExplorationViewport(canvas, walls, atlas, layout = defaultLayout, wallRows = {}) {
  const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true, alpha: true });
  if (!gl) throw new Error("WebGL is unavailable");
  gl.getExtension("OES_standard_derivatives");
  layout = resolveLayout(layout);

  const sceneProgram = link(gl, sceneVertex, sceneFragment);
  const skyProgram = link(gl, skyVertex, skyFragment);
  const postProgram = link(gl, postVertex, postFragment);
  const bloomProgram = link(gl, postVertex, bloomFragment);

  const vertices = [];
  function quad(a, b, c, d, surface, tile = 0, direction = 0) {
    const e1 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const e2 = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    let nx = e1[1] * e2[2] - e1[2] * e2[1];
    let ny = e1[2] * e2[0] - e1[0] * e2[2];
    let nz = e1[0] * e2[1] - e1[1] * e2[0];
    // Horizontal quads were wound clockwise in xz, which pointed the normal down
    // and left floors, water and pier caps unlit. Flip those so they face the sky.
    if (Math.abs(ny) >= Math.abs(nx) && Math.abs(ny) >= Math.abs(nz) && ny < 0) {
      nx = -nx; ny = -ny; nz = -nz;
    }
    const length = Math.hypot(nx, ny, nz) || 1;
    const normal = [nx / length, ny / length, nz / length];
    const left = direction > 0 ? 0 : 1;
    const right = 1 - left;
    for (const [p, u] of [[a, left], [b, right], [c, right], [a, left], [c, right], [d, left]])
      vertices.push(...p, ...surface, tile, direction ? u : -1, ...normal);
  }

  const ground = layout.ground;
  quad([ground.x0, 0, ground.z0], [ground.x1, 0, ground.z0], [ground.x1, 0, ground.z1], [ground.x0, 0, ground.z1],
    [0, 0, ground.height, ground.shade], ground.tile);
  if (layout.water) {
    const w = layout.water;
    quad([w.x0, w.y, w.z0], [w.x1, w.y, w.z0], [w.x1, w.y, w.z1], [w.x0, w.y, w.z1], [0, 0, 0, w.shade], w.tile);
  }
  if (layout.seawall) {
    const s = layout.seawall;
    quad([s.x, s.y0, s.z0], [s.x, s.y0, s.z1], [s.x, s.y1, s.z1], [s.x, s.y1, s.z0], [1, 1, .5, s.shade], s.tile);
  }
  if (layout.pilings && layout.piers) {
    const p = layout.pilings, piers = layout.piers;
    function piling(x, z) {
      const radius = p.radius, bottom = p.bottom, top = p.top;
      const ns = [1, 0, top, p.nsShade], ew = [1, 1, top, p.ewShade];
      quad([x - radius, bottom, z - radius], [x + radius, bottom, z - radius], [x + radius, top, z - radius], [x - radius, top, z - radius], ns, p.tile);
      quad([x - radius, bottom, z + radius], [x + radius, bottom, z + radius], [x + radius, top, z + radius], [x - radius, top, z + radius], ns, p.tile);
      quad([x - radius, bottom, z - radius], [x - radius, bottom, z + radius], [x - radius, top, z + radius], [x - radius, top, z - radius], ew, p.tile);
      quad([x + radius, bottom, z - radius], [x + radius, bottom, z + radius], [x + radius, top, z + radius], [x + radius, top, z - radius], ew, p.tile);
      quad([x - radius, top, z - radius], [x + radius, top, z - radius], [x + radius, top, z + radius], [x - radius, top, z + radius], [0, 0, top, p.nsShade], p.tile);
    }
    for (const z of piers.zs) {
      quad([piers.x0, 0, z], [piers.x1, 0, z], [piers.x1, 0, z + 1], [piers.x0, 0, z + 1], [0, 0, piers.height, piers.shade], piers.tile);
      quad([piers.x1, 0, z], [piers.x1, piers.edgeY, z], [piers.x1, piers.edgeY, z + 1], [piers.x1, 0, z + 1], [1, 1, 0, 0], piers.edgeTile);
      for (const x of p.xs) {
        piling(x, z + .03);
        piling(x, z + .97);
      }
    }
  }

  const step = [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 0, 1]];
  const skip = layout.skipWall;
  const gates = layout.gates;
  for (let z = 0; z < 16; z++)
    for (let x = 0; x < 16; x++) {
      walls[z * 16 + x].forEach((type, side) => {
        if (!type || (skip && type === skip.type && x >= skip.minX && z < skip.maxZExclusive))
          return;
        const rows = wallRows[type] ?? 8;
        if (rows === 0) return;
        const [sx, sz, ex, ez] = step[side];
        const ax = x + sx, az = z + sz, bx = x + ex, bz = z + ez;
        const axis = sx === ex ? 1 : 0;
        const isGate = Boolean(gates && type === gates.type && gates.axes.includes(ax));
        const height = (isGate ? gates.height : 1.19) * rows / 8;
        const lit = axis ? .25 : .92;
        const dx = (bx - ax) * .027, dz = (bz - az) * .027;
        const ox = -dz, oz = dx;
        const color = [isGate ? 2 : 1, axis, height, lit];
        const sign = side === 0 || side === 1 ? 1 : -1;
        quad([ax + sign * ox, 0, az + sign * oz], [bx + sign * ox, 0, bz + sign * oz], [bx + sign * ox, height, bz + sign * oz], [ax + sign * ox, height, az + sign * oz], color, type, sign);
        if (isGate) {
          const nearX = ax + sign * ox, nearZ = az + sign * oz, endX = bx + sign * ox, endZ = bz + sign * oz;
          const leftX = nearX + (endX - nearX) * .24, leftZ = nearZ + (endZ - nearZ) * .24;
          const rightX = nearX + (endX - nearX) * .76, rightZ = nearZ + (endZ - nearZ) * .76;
          const recessX = -sign * ox * gates.recess, recessZ = -sign * oz * gates.recess;
          const shade = [1, axis, .92, -2.8];
          quad([leftX + recessX, 0, leftZ + recessZ], [rightX + recessX, 0, rightZ + recessZ], [rightX + recessX, .92, rightZ + recessZ], [leftX + recessX, .92, leftZ + recessZ], shade, gates.jambTile);
          const jamb = [1, 1 - axis, .92, -1];
          for (const [jx, jz] of [[leftX, leftZ], [rightX, rightZ]]) {
            quad([jx, 0, jz], [jx + recessX, 0, jz + recessZ], [jx + recessX, .92, jz + recessZ], [jx, .92, jz], jamb, gates.jambTile);
          }
        }
      });
    }

  const stride = 12 * 4;
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  const vertexCount = vertices.length / 12;

  function bindSceneAttribs() {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const pos = gl.getAttribLocation(sceneProgram, "position");
    const mat = gl.getAttribLocation(sceneProgram, "surface");
    const tile = gl.getAttribLocation(sceneProgram, "tile");
    const faceU = gl.getAttribLocation(sceneProgram, "faceU");
    const normal = gl.getAttribLocation(sceneProgram, "normal");
    gl.enableVertexAttribArray(pos);
    gl.enableVertexAttribArray(mat);
    gl.enableVertexAttribArray(tile);
    gl.enableVertexAttribArray(faceU);
    gl.enableVertexAttribArray(normal);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, stride, 0);
    gl.vertexAttribPointer(mat, 4, gl.FLOAT, false, stride, 12);
    gl.vertexAttribPointer(tile, 1, gl.FLOAT, false, stride, 28);
    gl.vertexAttribPointer(faceU, 1, gl.FLOAT, false, stride, 32);
    gl.vertexAttribPointer(normal, 3, gl.FLOAT, false, stride, 36);
  }

  const artTexture = makeTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
  const detailTexture = makeTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, deriveNormalRoughness(atlas));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const aoTexture = makeTexture(gl);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, AO_RES, AO_RES, 0, gl.RGBA, gl.UNSIGNED_BYTE,
    bakeOcclusion(walls, layout, wallRows, explorationSunDir));

  const quadBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

  const width = canvas.width, height = canvas.height;
  const hdr = colorTarget(gl, width, height);
  const bloomA = colorTarget(gl, width, height);
  const bloomB = colorTarget(gl, width, height);
  const depth = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, depth);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);
  const sceneFbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, hdr.texture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depth);
  if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    throw new Error("Scene framebuffer is incomplete");
  }
  const bloomFboA = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboA);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomA.texture, 0);
  const bloomFboB = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, bloomFboB);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, bloomB.texture, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  const sunDir = explorationSunDir;

  return {
    draw(view) {
      if (gl.isContextLost()) throw new Error("WebGL context lost");
      const radians = view.facing * Math.PI / 4;
      const eye = [view.x + .5, .69, view.y + .5];
      const forward = [Math.sin(radians), -Math.cos(radians)];
      const right = [Math.cos(radians), Math.sin(radians)];
      const aspect = canvas.width / canvas.height;
      // Bit 7 of the GEO flag on this square (ovl26 0x016d): under a roof.
      const indoor = view.roofed ? 1 : 0;
      // The ECL script selects the native backdrop. Palette index zero is black.
      const darkSky = view.skyColor === 0;
      const sunColor = indoor || darkSky ? [0, 0, 0] : [1.28, 0.96, 0.62];
      const skyColor = indoor ? [0.07, 0.07, 0.08] : darkSky ? [0.14, 0.18, 0.28] : [0.36, 0.48, 0.70];
      const groundColor = indoor ? [0.08, 0.07, 0.06] : darkSky ? [0.15, 0.13, 0.12] : [0.30, 0.22, 0.14];
      const fogColor = indoor ? [0.055, 0.05, 0.045] : darkSky ? [0.035, 0.044, 0.065] : [0.62, 0.72, 0.88];

      gl.bindFramebuffer(gl.FRAMEBUFFER, sceneFbo);
      gl.viewport(0, 0, width, height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.ALWAYS);
      gl.useProgram(skyProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      const skyPos = gl.getAttribLocation(skyProgram, "position");
      gl.enableVertexAttribArray(skyPos);
      gl.vertexAttribPointer(skyPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform1f(gl.getUniformLocation(skyProgram, "aspect"), aspect);
      gl.uniform2f(gl.getUniformLocation(skyProgram, "forward"), forward[0], forward[1]);
      gl.uniform2f(gl.getUniformLocation(skyProgram, "right"), right[0], right[1]);
      gl.uniform3f(gl.getUniformLocation(skyProgram, "sunDir"), sunDir[0], sunDir[1], sunDir[2]);
      gl.uniform3f(gl.getUniformLocation(skyProgram, "sunColor"), ...sunColor);
      gl.uniform3f(gl.getUniformLocation(skyProgram, "skyColor"), ...skyColor);
      gl.uniform3f(gl.getUniformLocation(skyProgram, "fogColor"), ...fogColor);
      gl.uniform1f(gl.getUniformLocation(skyProgram, "indoor"), indoor);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      gl.depthFunc(gl.LEQUAL);
      gl.useProgram(sceneProgram);
      bindSceneAttribs();
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, artTexture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, detailTexture);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, aoTexture);
      gl.uniform1i(gl.getUniformLocation(sceneProgram, "art"), 0);
      gl.uniform1i(gl.getUniformLocation(sceneProgram, "detail"), 1);
      gl.uniform1i(gl.getUniformLocation(sceneProgram, "aoMap"), 2);
      gl.uniform4f(gl.getUniformLocation(sceneProgram, "aoRect"),
        AO_BOUNDS.x0, AO_BOUNDS.z0, AO_BOUNDS.x1, AO_BOUNDS.z1);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "eye"), eye[0], eye[1], eye[2]);
      gl.uniform1f(gl.getUniformLocation(sceneProgram, "aspect"), aspect);
      gl.uniform2f(gl.getUniformLocation(sceneProgram, "forward"), forward[0], forward[1]);
      gl.uniform2f(gl.getUniformLocation(sceneProgram, "right"), right[0], right[1]);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "sunDir"), sunDir[0], sunDir[1], sunDir[2]);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "sunColor"), ...sunColor);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "skyColor"), ...skyColor);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "groundColor"), ...groundColor);
      gl.uniform3f(gl.getUniformLocation(sceneProgram, "fogColor"), ...fogColor);
      gl.uniform1f(gl.getUniformLocation(sceneProgram, "indoor"), indoor);
      gl.uniform1f(gl.getUniformLocation(sceneProgram, "waterTile"), layout.water?.tile ?? -1);
      gl.drawArrays(gl.TRIANGLES, 0, vertexCount);

      function blur(srcTex, destFbo, extract) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, destFbo);
        gl.viewport(0, 0, width, height);
        gl.disable(gl.DEPTH_TEST);
        gl.useProgram(bloomProgram);
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
        const pos = gl.getAttribLocation(bloomProgram, "position");
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, srcTex);
        gl.uniform1i(gl.getUniformLocation(bloomProgram, "color"), 0);
        gl.uniform2f(gl.getUniformLocation(bloomProgram, "texel"), 1 / width, 1 / height);
        gl.uniform1f(gl.getUniformLocation(bloomProgram, "extract"), extract);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
      blur(hdr.texture, bloomFboA, 1);
      blur(bloomA.texture, bloomFboB, 0);
      blur(bloomB.texture, bloomFboA, 0);

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.disable(gl.DEPTH_TEST);
      gl.useProgram(postProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      const postPos = gl.getAttribLocation(postProgram, "position");
      gl.enableVertexAttribArray(postPos);
      gl.vertexAttribPointer(postPos, 2, gl.FLOAT, false, 0, 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, hdr.texture);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bloomA.texture);
      gl.uniform1i(gl.getUniformLocation(postProgram, "color"), 0);
      gl.uniform1i(gl.getUniformLocation(postProgram, "bloom"), 1);
      gl.uniform2f(gl.getUniformLocation(postProgram, "texel"), 1 / width, 1 / height);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("WebGL draw failed");
    },
    dispose() {
      // The next exploration viewport reuses this canvas and its GL state.
      // Its first sky pass must not inherit arrays backed by deleted buffers.
      const attributeCount = gl.getParameter(gl.MAX_VERTEX_ATTRIBS);
      for (let index = 0; index < attributeCount; index++) gl.disableVertexAttribArray(index);
      gl.deleteBuffer(buffer);
      gl.deleteBuffer(quadBuffer);
      gl.deleteTexture(artTexture);
      gl.deleteTexture(detailTexture);
      gl.deleteTexture(aoTexture);
      gl.deleteTexture(hdr.texture);
      gl.deleteTexture(bloomA.texture);
      gl.deleteTexture(bloomB.texture);
      gl.deleteRenderbuffer(depth);
      gl.deleteFramebuffer(sceneFbo);
      gl.deleteFramebuffer(bloomFboA);
      gl.deleteFramebuffer(bloomFboB);
      gl.useProgram(null);
      gl.deleteProgram(sceneProgram);
      gl.deleteProgram(skyProgram);
      gl.deleteProgram(postProgram);
      gl.deleteProgram(bloomProgram);
    },
  };
}

export async function createExplorationAtlas(materials, artUrl, highlight = false, palette) {
  const atlas = document.createElement("canvas");
  atlas.width = 2048;
  atlas.height = 1024;
  const context = atlas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  const wall = document.createElement("canvas");
  wall.width = 224;
  wall.height = 256;
  const wallContext = wall.getContext("2d");
  if (!wallContext) throw new Error("Wall composition is unavailable");
  const assets = [materials.ground];
  if (materials.water) assets.push(materials.water.art);
  if (materials.dockPiling) assets.push(materials.dockPiling.art);
  for (const {parts} of materials.wallFaces) {
    for (const {art, crop} of parts) {
      if (crop) assets.push(...crop.parts);
      else if (art) assets.push(art);
    }
  }
  const images = new Map();
  await Promise.all([...new Map(assets.map(art => [art.key, art])).values()].map(async art => {
    if (art.pixels) {
      const image = document.createElement("canvas");
      image.width = image.height = 8;
      const pixels = image.getContext("2d");
      for (const [index,color] of art.pixels.entries()) {
        if (color === 16) continue;
        pixels.fillStyle = `rgb(${palette[color].join(",")})`;
        pixels.fillRect(index%8,Math.floor(index/8),1,1);
      }
      images.set(art.key, image);
      return;
    }
    const image = new Image();
    image.src = artUrl(art);
    await image.decode();
    images.set(art.key, image);
  }));

  function paint(art, x, y, width, height, crop) {
    if (!art) {
      context.fillStyle = "#ab3a72";
      context.fillRect(x,y,width,height);
      context.fillStyle = "#6d274d";
      context.fillRect(x,y,width/2,height/2);
      context.fillRect(x+width/2,y+height/2,width/2,height/2);
      return;
    }
    context.save();
    if (art.pixels) context.imageSmoothingEnabled = false;
    context.translate(x + (art.reflected ? width : 0),y);
    context.scale(art.reflected ? -1 : 1,1);
    const image = images.get(art.key);
    if (crop) context.drawImage(image,...crop,0,0,width,height);
    else context.drawImage(image,0,0,width,height);
    context.restore();
  }

  for (const {type,parts,rows = 8} of materials.wallFaces) {
    const dx = type % 8 * 256, dy = Math.floor(type / 8) * 256;
    context.save();
    context.translate(dx,dy);
    for (const [index,part] of parts.entries()) {
      const x = index % 7 * 32, y = Math.floor(index / 7) * 32;
      if (part.status !== "transparent") {
        if (part.crop) {
          context.save();
          context.beginPath();
          context.rect(x,y,32,32);
          context.clip();
          for (const piece of part.crop.parts) paint(piece,x+piece.x*4,y+piece.y*4,32,32);
          context.restore();
        } else {
          paint(highlight && part.status === "reconstructed" ? null : part.art,x,y,32,32);
        }
        part.mask?.forEach((visible,i) => {
          if (!visible) context.clearRect(x+i%8*4,y+Math.floor(i/8)*4,4,4);
        });
      }
    }
    context.restore();
    if (rows > 0 && rows < 8) {
      // Compose art and cutouts on whole pixels before resampling the face.
      // Filtering across the joins treats adjacent tiles as one surface.
      const height = rows * 32;
      wallContext.clearRect(0,0,wall.width,wall.height);
      wallContext.drawImage(atlas,dx,dy,wall.width,height,0,0,wall.width,height);
      context.clearRect(dx,dy,wall.width,wall.height);
      context.drawImage(wall,0,0,wall.width,height,dx,dy,wall.width,wall.height);
    }
  }
  paint(materials.ground,0,512,256,256);
  if (materials.water) paint(highlight ? null : materials.water.art,256,512,256,256,materials.water.crop);
  if (materials.dockPiling) paint(highlight ? null : materials.dockPiling.art,512,512,256,256,materials.dockPiling.crop);
  return atlas;
}

/** The world camera remains overhead, using the guest's current map and markers. */
export function createOverlandViewport(canvas) {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true });
  if (!gl) throw new Error("WebGL is unavailable");
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, `
      attribute vec2 position;
      varying vec2 uv;
      void main() {
        uv = vec2(position.x + 1.0, 1.0 - position.y) * 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `],
    [gl.FRAGMENT_SHADER, `
      precision mediump float;
      varying vec2 uv;
      uniform sampler2D map;
      uniform sampler2D materials;
      uniform sampler2D details;
      uniform sampler2D landmarks;
      uniform bool local;
      uniform bool hasDetails;
      uniform bool hasLandmarks;
      uniform vec2 origin;
      struct SurfacePaint {
        vec3 meadow;
        vec3 warmRock;
        vec3 coolRock;
        vec3 snow;
        vec3 canopy;
        vec3 water;
        vec3 marsh;
        vec3 silt;
      };
      vec3 terrainColor(vec2 material, vec2 scale) {
        // Inset a texel to keep filtering inside each cell of the atlas.
        return texture2D(materials, (material * 512.0 + scale * 510.0 + 1.0) / vec2(1024.0, 2048.0)).rgb;
      }
      vec3 paintMaterials(vec4 mask, vec2 point, SurfacePaint paint) {
        // Red marks meadow, green marks snow and blue blends the two rock materials.
        vec3 rock = mix(paint.warmRock, paint.coolRock, mask.b);
        rock = mix(rock, paint.snow, mask.g);
        vec3 ground = mix(rock, paint.meadow, mask.r);
        // Alpha carries inverse canopy coverage.
        if (mask.a < 1.0) ground = mix(paint.canopy, ground, mask.a);
        if (hasDetails) {
          vec3 wet = texture2D(details, point).rgb;
          ground = mix(ground, paint.silt, wet.b);
          ground = mix(ground, paint.marsh, wet.g);
          ground = mix(ground, paint.water, wet.r);
        }
        return ground;
      }

      void main() {
        vec4 pixel = texture2D(map, uv);
        if (!local) {
          gl_FragColor = pixel;
          return;
        }
        // Both sides of a join shade the same world coordinate in the material sheet.
        vec2 scale = fract((origin + uv * 352.0) / 512.0);
        SurfacePaint paint = SurfacePaint(
          terrainColor(vec2(0.0, 0.0), scale), terrainColor(vec2(1.0, 0.0), scale),
          terrainColor(vec2(0.0, 1.0), scale), terrainColor(vec2(1.0, 1.0), scale),
          terrainColor(vec2(0.0, 2.0), scale),
          hasDetails ? terrainColor(vec2(1.0, 2.0), scale) : vec3(0.0),
          hasDetails ? terrainColor(vec2(0.0, 3.0), scale) : vec3(0.0),
          hasDetails ? terrainColor(vec2(1.0, 3.0), scale) : vec3(0.0)
        );
        vec3 ground = paintMaterials(pixel, uv, paint);

        // Each mask is 96 px wide. The 64 px crop places the first join at 32 px.
        vec2 seam = mod(uv * 352.0 + 64.0 + 48.0, 96.0) - 48.0;
        vec2 blend = 0.5 * (1.0 - smoothstep(0.0, 8.0, abs(seam)));
        vec2 opposite = uv - (seam + sign(seam) * 0.5) / 352.0;
        if (blend.x > 0.0) {
          vec2 neighbor = vec2(opposite.x, uv.y);
          ground = mix(ground, paintMaterials(texture2D(map, neighbor), neighbor, paint), blend.x);
        }
        if (blend.y > 0.0) {
          vec2 neighbor = vec2(uv.x, opposite.y);
          vec3 nextRow = paintMaterials(texture2D(map, neighbor), neighbor, paint);
          if (blend.x > 0.0) {
            nextRow = mix(nextRow, paintMaterials(texture2D(map, opposite), opposite, paint), blend.x);
          }
          ground = mix(ground, nextRow, blend.y);
        }
        if (hasLandmarks) {
          vec4 landmark = texture2D(landmarks, uv);
          ground = mix(ground, landmark.rgb, landmark.a);
        }
        gl_FragColor = vec4(ground, 1.0);
      }
    `],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader,source);
    gl.compileShader(shader);
    gl.attachShader(program,shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? "Overland shader failed");
  gl.useProgram(program);
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program,"position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  const materialsTexture = gl.createTexture();
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, materialsTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
  const details = createTileLayer(2, false);
  const landmarks = createTileLayer(3, true);
  gl.activeTexture(gl.TEXTURE0);
  const local = gl.getUniformLocation(program, "local");
  const hasDetails = gl.getUniformLocation(program, "hasDetails");
  const hasLandmarks = gl.getUniformLocation(program, "hasLandmarks");
  const origin = gl.getUniformLocation(program, "origin");
  gl.uniform1i(gl.getUniformLocation(program, "map"), 0);
  gl.uniform1i(gl.getUniformLocation(program, "materials"), 1);
  gl.uniform1i(gl.getUniformLocation(program, "details"), 2);
  gl.uniform1i(gl.getUniformLocation(program, "landmarks"), 3);
  let loadedMaterials;
  const tile = document.createElement("canvas");
  tile.width = tile.height = 352;
  const paint = tile.getContext("2d");
  paint.imageSmoothingEnabled = false;
  function createTileLayer(unit, alpha) {
    const layer = document.createElement("canvas");
    layer.width = layer.height = 352;
    const context = layer.getContext("2d", { alpha });
    context.imageSmoothingEnabled = false;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(4));
    return images => {
      if (!images) return;
      context.clearRect(0, 0, 352, 352);
      drawTerrainTiles(context, images);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, layer);
    };
  }
  function drawTerrainTiles(context, images) {
    images.forEach((image, index) => {
      if (image) context.drawImage(image, index % 5 * 96 - 64, Math.floor(index / 5) * 96 - 64);
    });
  }
  return {
    draw(frame, terrain) {
      if (gl.isContextLost()) throw new Error("WebGL context lost");
      paint.clearRect(0, 0, 352, 352);
      if (terrain) {
        // The guest's 88px viewport is centered in the 120px terrain sheet.
        drawTerrainTiles(paint, terrain.tiles);
        details(terrain.details);
        landmarks(terrain.landmarks);
        if (loadedMaterials !== terrain.materials) {
          gl.activeTexture(gl.TEXTURE1);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, terrain.materials);
          loadedMaterials = terrain.materials;
        }
        const [x, y] = terrain.center;
        gl.uniform2f(origin, (x * 96 - 128) % 512, (y * 96 - 128) % 512);
      } else paint.drawImage(frame, 24, 24, 88, 88, 0, 0, 352, 352);
      gl.uniform1i(local, terrain ? 1 : 0);
      gl.uniform1i(hasDetails, terrain?.details ? 1 : 0);
      gl.uniform1i(hasLandmarks, terrain?.landmarks ? 1 : 0);
      gl.activeTexture(gl.TEXTURE0);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tile);
      gl.viewport(0,0,canvas.width,canvas.height);
      gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      if (gl.getError() !== gl.NO_ERROR) throw new Error("Overland WebGL draw failed");
    },
  };
}
