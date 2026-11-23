export function createNewPhlanViewport(canvas, walls, atlas, layout = "phlan", wallRows = {}) {
    const gl = canvas.getContext("webgl", { antialias: true, preserveDrawingBuffer: true });
    if (!gl)
        throw new Error("WebGL is unavailable");
    const vertex = `
    attribute vec3 position;
    attribute vec4 surface;
    attribute float tile;
    attribute float faceU;
    uniform vec3 eye;
    uniform float aspect;
    uniform vec2 forward;
    uniform vec2 right;
    varying vec3 world;
    varying vec4 material;
    varying float depth;
    varying float tileIndex;
    varying float wallU;
    void main() {
      vec3 d = position - eye;
      float z = dot(d.xz, forward);
      world = position;
      material = surface;
      depth = z;
      tileIndex = tile;
      wallU = faceU;
      // The native view fits the nearest wall and its floor contact inside
      // the encounter panel. Keep that field of view for the 3D geometry.
      const float focalLength = .60;
      gl_Position = vec4(dot(d.xz, right) * focalLength / aspect, d.y * focalLength + z * .11,
                         z * 1.003 - .08, z);
    }
  `;
    const fragment = `
    precision highp float;
    varying vec3 world;
    varying vec4 material;
    varying float depth;
    varying float tileIndex;
    varying float wallU;
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
      float u = wallU < 0.0 ? fract(axis) : wallU;
      vec2 faceUV = vec2(u, 1.0-world.y/max(material.z,.1));
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
    function quad(a, b, c, d, surface, tile = 0, direction = 0) {
        const left = direction > 0 ? 0 : 1;
        const right = 1 - left;
        for (const [p, u] of [[a, left], [b, right], [c, right], [a, left], [c, right], [d, left]])
            vertices.push(...p, ...surface, tile, direction ? u : -1);
    }
    if (layout !== "phlan") {
        quad([-5, 0, -5], [21, 0, -5], [21, 0, 21], [-5, 0, 21], [0, 0, .7, .5], 16);
    } else {
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
    }
    const step = [[0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 1], [0, 0, 0, 1]];
    for (let z = 0; z < 16; z++)
        for (let x = 0; x < 16; x++) {
            walls[z * 16 + x].forEach((type, side) => {
                if (!type || (layout === "phlan" && type === 14 && x >= 12 && z < 8))
                    return;
                const rows = wallRows[type] ?? 8;
                if (rows === 0) return;
                const [sx, sz, ex, ez] = step[side];
                const ax = x + sx, az = z + sz, bx = x + ex, bz = z + ez;
                const axis = sx === ex ? 1 : 0;
                const isGate = layout === "phlan" && type === 1 && (ax === 0 || ax === 13);
                const height = (isGate ? 1.52 : 1.19) * rows / 8;
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
    const faceU = gl.getAttribLocation(program, "faceU");
    gl.enableVertexAttribArray(pos);
    gl.enableVertexAttribArray(mat);
    gl.enableVertexAttribArray(tile);
    gl.enableVertexAttribArray(faceU);
    gl.vertexAttribPointer(pos, 3, gl.FLOAT, false, 36, 0);
    gl.vertexAttribPointer(mat, 4, gl.FLOAT, false, 36, 12);
    gl.vertexAttribPointer(tile, 1, gl.FLOAT, false, 36, 28);
    gl.vertexAttribPointer(faceU, 1, gl.FLOAT, false, 36, 32);
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
        gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 9);
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

export async function createNewPhlanAtlas(materials, artUrl, highlight = false, palette) {
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
  const assets = [materials.ground, materials.sky];
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
  const skyUrl = materials.sky.pixels ? images.get(materials.sky.key).toDataURL() : artUrl(materials.sky);
  return {atlas, skyUrl};
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
