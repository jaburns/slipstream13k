let _meshLoader_loadBufferObjects = (verts, tris, norms) => {
    let result = {t:tris.length};

    result.v = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, result.v);
    gl.bufferData(gl.ARRAY_BUFFER, verts, gl.STATIC_DRAW);

    result.i = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.i);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, tris, gl.STATIC_DRAW);

    if (norms) {
        result.n = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, result.n);
        gl.bufferData(gl.ARRAY_BUFFER, norms, gl.STATIC_DRAW);
    }

    return result;
};

let _meshLoader_flatShadeAndloadBufferObjects = (verts, tris) => {
    let newVerts = [];
    let newTris = [];
    let normals = [];
    let i = 0;

    tris.forEach((t,i) => {
        newVerts=newVerts.concat(verts[3*t],verts[3*t+1],verts[3*t+2]);
        newTris.push(i);
    });

    for (; i < newVerts.length; i += 9) {
        let a = [newVerts[i+0], newVerts[i+1], newVerts[i+2]];
        let b = [newVerts[i+3], newVerts[i+4], newVerts[i+5]];
        let c = [newVerts[i+6], newVerts[i+7], newVerts[i+8]];

        let ab = vec3_minus(b, a);
        let ac = vec3_minus(c, a);
        let normal = vec3_normalize(vec3_cross(ab, ac));

        normals = normals.concat([
            normal[0],normal[1],normal[2],
            normal[0],normal[1],normal[2],
            normal[0],normal[1],normal[2]
        ]);
    }

    return _meshLoader_loadBufferObjects(
        new Float32Array(newVerts),
        new Uint16Array(newTris),
        new Float32Array(normals)
    );
};

let meshLoader_loadBufferObjectsFromModelFile_legacy = (bytes) => {
    let scaleX = bytes[0] / 256 * 8;
    let scaleY = bytes[1] / 256 * 8;
    let scaleZ = bytes[2] / 256 * 8;
    let originX = bytes[3] / 256 * scaleX;
    let originY = bytes[4] / 256 * scaleY;
    let originZ = bytes[5] / 256 * scaleZ;
    let numVerts = bytes[6] + 256*bytes[7];
    let triOffset = 8 + 3*numVerts;

    let verts = [];
    let vertSub = bytes.subarray(8, triOffset);
    for (let i = 0; i < vertSub.length; i += 3) {
        verts.push(vertSub[i  ] / 256 * scaleX - originX);
        verts.push(vertSub[i+1] / 256 * scaleY - originY);
        verts.push(vertSub[i+2] / 256 * scaleZ - originZ);
    }

    let tris = new Uint16Array(bytes.subarray(triOffset));

    return _meshLoader_flatShadeAndloadBufferObjects(new Float32Array(verts), tris);
};


let meshLoader_loadMeshesBlob = bytes => {
    let ptr = 0;

    let deserializeMesh = () => {
        let flatShaded = bytes[ptr] & 0x80 !== 0;
        let materialIndex = bytes[ptr++] % 128;

        let scaleX = bytes[ptr++] / 256 * 8;
        let scaleY = bytes[ptr++] / 256 * 8;
        let scaleZ = bytes[ptr++] / 256 * 8;

        let originX = bytes[ptr++] / 255 * scaleX;
        let originY = bytes[ptr++] / 255 * scaleY;
        let originZ = bytes[ptr++] / 255 * scaleZ;

        let numVerts = bytes[ptr++];
        let verts = [];
        let vertSub = bytes.subarray(ptr, ptr += 3*numVerts);
        for (let i = 0; i < vertSub.length; i += 3) {
            verts.push(vertSub[i  ] / 255 * scaleX - originX);
            verts.push(vertSub[i+1] / 255 * scaleY - originY);
            verts.push(vertSub[i+2] / 255 * scaleZ - originZ);
        }

        let numTris = bytes[ptr++];
        let tris = new Uint16Array(bytes.subarray(ptr, ptr += 3*numTris));



        return {
            verts, tris, norms
        }


        // todo compute normals and/or flat shade.
    };

    {
        let numMeshes = bytes[ptr++];
        let meshes = [];

        for (let i = 0; i < numMeshes; ++i)
            meshes.push(deserializeMesh());
    }
};











































