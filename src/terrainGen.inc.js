let HEIGHTMAP_SIZE = 128;

let _terrainGen_signedDistanceFill = ctx => {
    let data = ctx.getImageData(0, 0, HEIGHTMAP_SIZE, HEIGHTMAP_SIZE).data;
    let outData = ctx.createImageData(HEIGHTMAP_SIZE,HEIGHTMAP_SIZE);

    let findEdgeDistance = (x, y) => {
        let candidates = [];
        let maxRadius = HEIGHTMAP_SIZE;

        let test = (ix, iy) => {
            if (ix < 0 || ix >= HEIGHTMAP_SIZE || iy < 0 || iy >= HEIGHTMAP_SIZE) return false;
            return data[4*(ix+iy*HEIGHTMAP_SIZE)] > 128;
        };

        let pushTest = (ix, iy, radius) => {
            if (! test(ix, iy)) return;
            if (candidates.length < 1) maxRadius = 2*radius;
            let dx = ix-x, dy = iy-y;
            candidates.push(dx*dx + dy*dy);
        };

        for (let radius = 0; radius < maxRadius; ++radius)
        for (let o = -radius; o <= radius; ++o) {
            pushTest(x + o, y - radius, radius);
            pushTest(x + o, y + radius, radius);
            pushTest(x - radius, y + o, radius);
            pushTest(x + radius, y + o, radius);
        }

        if (candidates.length < 1) return HEIGHTMAP_SIZE;

        candidates.sort((a,b)=>a-b);
        return Math.sqrt(candidates[0]);
    };

    for (let x = 0; x < HEIGHTMAP_SIZE; ++x)
    for (let y = 0; y < HEIGHTMAP_SIZE; ++y)
    {
        var dist = findEdgeDistance(x, y);
        var color = 255*math_clamp01(dist / 32);

        if (color < 0) color = 0;
        if (color > 255) color = 255;

        [0,1,2,3].map(i=>
            outData.data[4*(x+y*HEIGHTMAP_SIZE)+i] = i<3?color:255
        );
    }

    ctx.putImageData(outData, 0, 0);
};

let _terrainGen_renderHeightMap = (trackCanvas, uniforms) => {
    let heightMapTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, heightMapTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trackCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    let framebuffer = gfx_createFrameBufferTexture();
    framebuffer.r(4096, 4096);

    let shader = gfx_compileProgram(fullQuad_vert, terrainMap_frag);

    gfx_renderBuffer(shader, {t:heightMapTex}, framebuffer, () => {
        // TODO inline uniforms in shader
        for (let k in uniforms) {
            if (typeof uniforms[k] === 'number') {
                gl.uniform1f(gl.getUniformLocation(shader, k), uniforms[k]);
            } else {
                gl.uniform3fv(gl.getUniformLocation(shader, k), uniforms[k]);
            }
        }
    });

    return framebuffer;
};

let terrainGen_loadTrackCanvasFromBlob = bytes => {
    let canvas = document.createElement('canvas');
    canvas.width = canvas.height = HEIGHTMAP_SIZE;

    let ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, HEIGHTMAP_SIZE, HEIGHTMAP_SIZE);
    ctx.strokeStyle = '#fff';

    let pts = [].slice.call(bytes).map(x => x/255*HEIGHTMAP_SIZE);

    for (let i = 0; i < pts.length; i += 6) {
        let j = (i + 6) % pts.length;

        ctx.moveTo(pts[i],pts[i+1]);
        ctx.bezierCurveTo(pts[i+2],pts[i+3], pts[i+4],pts[i+5], pts[j],pts[j+1]);
        ctx.stroke();
    }

    _terrainGen_signedDistanceFill(ctx);

    return canvas;
}

let chunksPerMapSide = 5;
let verticesPerChunkSide = 256;

let _terrainGen_getChunkMesh = (chunkX, chunkZ) => {
    let chunkUV = [chunkX / chunksPerMapSide, chunkZ / chunksPerMapSide];

    let verts = [];
    let tris = [];

    for (let vx = 0; vx < verticesPerChunkSide; vx++) 
    for (let vz = 0; vz < verticesPerChunkSide; vz++) {
        let uv = [
            chunkUV[0] + vx / (verticesPerChunkSide - 1) / chunksPerMapSide,
            chunkUV[1] + vz / (verticesPerChunkSide - 1) / chunksPerMapSide,
        ];

        verts.push(uv[0] * G_TERRAIN_WORLDSPACE_SIZE - G_TERRAIN_WORLDSPACE_SIZE / 2);
        verts.push(0);
        verts.push(uv[1] * G_TERRAIN_WORLDSPACE_SIZE - G_TERRAIN_WORLDSPACE_SIZE / 2);
    }

    for (var x = 0; x < verticesPerChunkSide - 1; x++)
    for (var y = 0; y < verticesPerChunkSide - 1; y++) {
        tris.push(x + y*verticesPerChunkSide);
        tris.push((x+1) + y*verticesPerChunkSide);
        tris.push(x + (y+1)*verticesPerChunkSide);

        tris.push(x + (y+1)*verticesPerChunkSide);
        tris.push((x+1) + y*verticesPerChunkSide);
        tris.push((x+1) + (y+1)*verticesPerChunkSide);
    }

    let result = {t:tris.length};

    result.v = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, result.v);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

    result.i = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.i);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tris), gl.STATIC_DRAW);

    return result;
};


let terrainGen_getRenderer = bytes => {
    let trackCanvas = terrainGen_loadTrackCanvasFromBlob(bytes);
    let heightMapFB = _terrainGen_renderHeightMap(trackCanvas, 
        {"u_preScalePower":1.1,"u_curveScale":3.5,"u_curveOffset":0.1,"u_postScalePower":1.2,"u_noise0":[0.1,25,0],"u_noise1":[0.05,20,0.4],"u_noise2":[0.3,5,1],"u_noise3":[0.5,2,1.2],"u_finalScale":1.5,"u_finalPower":1.3}
    );

    let meshes = [];

    for (let x = 0; x < chunksPerMapSide; ++x)
    for (let z = 0; z < chunksPerMapSide; ++z)
        meshes.push(_terrainGen_getChunkMesh(x, z));

    return {
        meshes,
        heightMapTexture: heightMapFB.t,
    };
}


let _arrayBufferToBase64 = buffer => {
    let binary = '';
    let bytes = new Uint8Array( buffer );
    for (let i = 0; i < bytes.byteLength; i++)
        binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
}

let terrainGen_serializeHeightMap = heightMapTexture => {
    let shader = gfx_compileProgram(fullQuad_vert, copyRaw_frag);
    let framebuffer = gfx_createFrameBufferTexture();
    framebuffer.r(256, 256);
    gfx_renderBuffer(shader, {t:heightMapTexture,w:256,h:256}, framebuffer);

    let arr = new Float32Array(256 * 256 * 4);
    gl.readPixels(0, 0, 256, 256, gl.RGBA, gl.FLOAT, arr);

    let arrR = new Float32Array(256 * 256);
    for (let i = 0; i < 256 * 256; ++i)
        arrR[i] = arr[i*4];

    return _arrayBufferToBase64(arrR.buffer);
};
