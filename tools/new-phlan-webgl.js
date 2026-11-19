export function createNewPhlanViewport(canvas, walls, atlas) {
    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true });
    if (!gl)
        throw new Error("WebGL is unavailable");
    const vertex = `
    attribute vec3 position;
    attribute vec4 surface;
    attribute float tile;
    uniform vec3 eye;
    uniform float aspect;
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
      gl_Position = vec4(dot(d.xz, right) * 1.42 / aspect, d.y * 1.42 + z * .11,
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
    function shader(type, source) {
        const item = gl.createShader(type);
        gl.shaderSource(item, source);
        gl.compileShader(item);
        if (!gl.getShaderParameter(item, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(item) ?? "");
        return item;
    }
    const program = gl.createProgram();
    const vertexShader = shader(gl.VERTEX_SHADER, vertex);
    const fragmentShader = shader(gl.FRAGMENT_SHADER, fragment);
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS))
        throw new Error(gl.getProgramInfoLog(program) ?? "");
    gl.useProgram(program);
    const vertices = [];
    function quad(a, b, c, d, surface, tile = 0) {
        for (const p of [a, b, c, a, c, d])
            vertices.push(...p, ...surface, tile);
    }
    quad([-5, 0, -5], [13, 0, -5], [13, 0, 21], [-5, 0, 21], [0, 0, .7, .5], 16);
    quad([13, -.09, -5], [24, -.09, -5], [24, -.09, 21], [13, -.09, 21], [0, 0, 0, 0], 17);
    quad([13, -.16, -5], [13, -.16, 21], [13, 0, 21], [13, 0, -5], [1, 1, .5, .5], 2);
    function piling(x, z) {
        const radius = .055, bottom = -.18, top = .46;
        const ns = [1, 0, top, .89], ew = [1, 1, top, .54];
        quad([x - radius, bottom, z - radius], [x + radius, bottom, z - radius], [x + radius, top, z - radius], [x - radius, top, z - radius], ns, 18);
        quad([x - radius, bottom, z + radius], [x + radius, bottom, z + radius], [x + radius, top, z + radius], [x - radius, top, z + radius], ns, 18);
        quad([x - radius, bottom, z - radius], [x - radius, bottom, z + radius], [x - radius, top, z + radius], [x - radius, top, z - radius], ew, 18);
        quad([x + radius, bottom, z - radius], [x + radius, bottom, z + radius], [x + radius, top, z + radius], [x + radius, top, z - radius], ew, 18);
        quad([x - radius, top, z - radius], [x + radius, top, z - radius], [x + radius, top, z + radius], [x - radius, top, z + radius], ns, 18);
    }
    for (const z of [1, 3, 5, 7]) {
        quad([13, 0, z], [16, 0, z], [16, 0, z + 1], [13, 0, z + 1], [0, 0, .7, .5], 16);
        quad([16, 0, z], [16, -.12, z], [16, -.12, z + 1], [16, 0, z + 1], [1, 1, 0, 0], 18);
        for (const x of [13.15, 13.86, 14.57, 15.28, 15.92]) {
            piling(x, z + .03);
            piling(x, z + .97);
        }
    }
    const step = [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 0, 1]];
    for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
            walls[z * 16 + x].forEach((type, side) => {
                if (!type || (type === 14 && x >= 12 && z < 8))
                    return;
                const [sx, sz, ex, ez] = step[side];
                const ax = x + sx, az = z + sz, bx = x + ex, bz = z + ez;
                const seed = ((ax * 53 + az * 37 + type * 17) % 61) / 60;
                const axis = sx === ex ? 1 : 0;
                const isGate = type === 1 && (ax === 0 || ax === 13);
                const height = (isGate ? 1.52 : 1.19) + (seed - .5) * .29;
                const lit = axis ? .25 : .92;
                const dx = (bx - ax) * .027, dz = (bz - az) * .027;
                const ox = -dz, oz = dx;
                const color = [isGate ? 2 : 1, axis, height, lit];
                const sign = side === 0 || side === 1 ? 1 : -1;
                quad([ax + sign * ox, 0, az + sign * oz], [bx + sign * ox, 0, bz + sign * oz], [bx + sign * ox, height, bz + sign * oz], [ax + sign * ox, height, az + sign * oz], color, type);
                if (isGate) {
                    const nearX = ax + sign * ox, nearZ = az + sign * oz, endX = bx + sign * ox, endZ = bz + sign * oz;
                    const leftX = nearX + (endX - nearX) * .24, leftZ = nearZ + (endZ - nearZ) * .24;
                    const rightX = nearX + (endX - nearX) * .76, rightZ = nearZ + (endZ - nearZ) * .76;
                    const recessX = -sign * ox * 15, recessZ = -sign * oz * 15;
                    const shade = [1, axis, .92, -2.8];
                    quad([leftX + recessX, 0, leftZ + recessZ], [rightX + recessX, 0, rightZ + recessZ], [rightX + recessX, .92, rightZ + recessZ], [leftX + recessX, .92, leftZ + recessZ], shade, 2);
                    const jamb = [1, 1 - axis, .92, -1];
                    for (const [x, z] of [[leftX, leftZ], [rightX, rightZ]]) {
                        quad([x, 0, z], [x + recessX, 0, z + recessZ], [x + recessX, .92, z + recessZ], [x, .92, z], jamb, 2);
                    }
                }
            });
        }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(program, "position");
    const mat = gl.getAttribLocation(program, "surface");
    const tile = gl.getAttribLocation(program, "tile");
    gl.enableVertexAttribArray(pos);
    gl.enableVertexAttribArray(mat);
    gl.enableVertexAttribArray(tile);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 32, 0);
    gl.vertexAttribPointer(mat, 4, gl.FLOAT, false, 32, 12);
    gl.vertexAttribPointer(tile, 1, gl.FLOAT, false, 32, 28);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    const eye = gl.getUniformLocation(program, "eye");
    const forward = gl.getUniformLocation(program, "forward");
    const right = gl.getUniformLocation(program, "right");
    const aspect = gl.getUniformLocation(program, "aspect");
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);

    return {
      draw(view) {
        if (gl.isContextLost()) throw new Error("WebGL context lost");
        const radians = view.facing * Math.PI / 4;
        gl.uniform3f(eye, view.x + .5, .69, view.y + .5);
        gl.uniform2f(forward, Math.sin(radians), -Math.cos(radians));
        gl.uniform2f(right, Math.cos(radians), Math.sin(radians));
        gl.uniform1f(aspect, canvas.width / canvas.height);
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 8);
        if (gl.getError() !== gl.NO_ERROR)
            throw new Error("WebGL draw failed");
      },
      dispose() {
        gl.deleteBuffer(buffer);
        gl.deleteTexture(texture);
        gl.useProgram(null);
        gl.deleteProgram(program);
      },
    };
}

export async function createNewPhlanAtlas(materials, artUrl, highlight = false) {
  const atlas = document.createElement("canvas");
  atlas.width = 2048;
  atlas.height = 1024;
  const context = atlas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable");
  const overrides = new Map(materials.materialOverrides.map(source => [source.type, source]));
  const assets = [materials.ground, materials.sky, materials.water.art, materials.dockPiling.art];
  for (const {type, parts} of materials.wallFaces) {
    const override = overrides.get(type);
    if (override) assets.push(override.art);
    else for (const {art, crop} of parts) {
      if (crop) assets.push(...crop.parts);
      else if (art) assets.push(art);
    }
  }
  const images = new Map();
  await Promise.all([...new Map(assets.map(art => [art.key, art])).values()].map(async art => {
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
    context.translate(x + (art.reflected ? width : 0),y);
    context.scale(art.reflected ? -1 : 1,1);
    const image = images.get(art.key);
    if (crop) context.drawImage(image,...crop,0,0,width,height);
    else context.drawImage(image,0,0,width,height);
    context.restore();
  }

  for (const {type,parts} of materials.wallFaces) {
    const dx = type % 8 * 256, dy = Math.floor(type / 8) * 256;
    const override = overrides.get(type);
    for (const [index,part] of parts.entries()) {
      const x = dx + index % 7 * 32, y = dy + Math.floor(index / 7) * 32;
      if (override) {
        const {art,crop} = override;
        if (highlight) paint(null,x,y,32,32);
        else if (crop) {
          paint(art,x,y,16,32,crop);
          paint(art,x+16,y,16,32,crop);
        } else paint(art,x,y,32,32);
      } else if (part.status !== "transparent") {
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
  }
  paint(materials.ground,0,512,256,256);
  paint(highlight ? null : materials.water.art,256,512,256,256,materials.water.crop);
  paint(highlight ? null : materials.dockPiling.art,512,512,256,256,materials.dockPiling.crop);
  return {atlas, skyUrl: artUrl(materials.sky)};
}
