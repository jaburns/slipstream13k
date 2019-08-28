let meshLoader_loadMeshesBlob = bytes => {
    let ptr = 0;

    let meshWithFlatShadedNormals = (verts, tris) => {
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

        return {
            v: newVerts,
            t: newTris,
            n: normals
        };
    };

    let meshWithRegularNormals = (verts, tris) => {
        return {
            v: verts,
            t: tris,
            n: verts // TODO calculate normals
        }
    };

    let deserializeMesh = () => {
        let flatShaded = bytes[ptr] & 128 !== 0;
        let materialIndex = bytes[ptr++] % 128;  // TODO create buffer with material index for each vertex

        let scaleX = bytes[ptr++] / 256 * 8;
        let scaleY = bytes[ptr++] / 256 * 8;
        let scaleZ = bytes[ptr++] / 256 * 8;

        let originX = bytes[ptr++] / 255 * scaleX;
        let originY = bytes[ptr++] / 255 * scaleY;
        let originZ = bytes[ptr++] / 255 * scaleZ;

        let numVerts = bytes[ptr++];

        let verts = [].slice.call(bytes.subarray(ptr, ptr += 3*numVerts));
        for (let i = 0; i < verts.length; i += 3) {
            verts[i  ] = verts[i  ] / 256 * scaleX - originX;
            verts[i+1] = verts[i+1] / 256 * scaleY - originY;
            verts[i+2] = verts[i+2] / 256 * scaleZ - originZ;
        }

        let numTris = bytes[ptr++];
        let tris = [].slice.call(bytes.subarray(ptr, ptr += 3*numTris));

        return flatShaded
            ? meshWithFlatShadedNormals(verts, tris)
            : meshWithRegularNormals(verts, tris);
    };

    let unpackPrefabVec3 = () =>
        [bytes[ptr++], bytes[ptr++], bytes[ptr++]].map(x => x / 256 * 4 - 2);

    let unpackPrefabQuat = wSign => {
        let x = [bytes[ptr++], bytes[ptr++], bytes[ptr++]].map(x => x / 256 * 2 - 1);
        x.push(wSign * Math.sqrt(1 - x[0]*x[0] - x[1]*x[1] - x[2]*x[2]));
        return x;
    }

    let _isPrefabAndItemIndexAndWSign, _wSign,
    deserializeChild = () => (
        _isPrefabAndItemIndexAndWSign = bytes[ptr++],
        _wSign = (_isPrefabAndItemIndexAndWSign & 64) != 0 ? -1 : 1,
        {
            f: (_isPrefabAndItemIndexAndWSign & 128) != 0, // f: is prefab?
            i: _isPrefabAndItemIndexAndWSign % 64,                // i: item index

            p: unpackPrefabVec3(),      // p: position
            s: unpackPrefabVec3(),      // s: scale
            r: unpackPrefabQuat(_wSign) // r: rotation
        }
    );

    let deserializePrefab = () => {
        let childCount = bytes[ptr++];
        let children = [];

        for (let i = 0; i < childCount; ++i)
            children.push(deserializeChild());

        return children;
    };

    let numMeshes = bytes[ptr++];
    let meshes = [];

    for (let i = 0; i < numMeshes; ++i)
        meshes.push(deserializeMesh());

    let numPrefabs = bytes[ptr++];
    let prefabs = [];

    for (let i = 0; i < numPrefabs; ++i)
        prefabs.push(deserializePrefab());

    let instantiatePrefab = prefab => {
        let verts = [];
        let tris = [];
        let norms = [];

        let innerPrefab = (prefab, matrix) => {
            prefab.forEach(child => {
                let newMatrix = mat4_multiply(matrix, Transform_toMatrix(child));

                if (child.f) {
                    innerPrefab(prefabs[child.i], newMatrix);
                } else {
                    let mesh = meshes[child.i];
                    let oldVcount = verts.length / 3;

                    verts = verts.concat(vec3_bufferMap(mesh.v, x => mat4_mulPosition(newMatrix, x)));
                    norms = norms.concat(vec3_bufferMap(mesh.n, x => mat4_mulNormal(newMatrix, x)));
                    tris = tris.concat(mesh.t.map(x => x + oldVcount));
                }
            });
        };
        innerPrefab(prefab, mat4_create());

        let result = {t:tris.length};

        result.v = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, result.v);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

        result.i = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, result.i);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(tris), gl.STATIC_DRAW);

        if (norms) {
            result.n = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, result.n);
            gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(norms), gl.STATIC_DRAW);
        }

        return result;
    };

    return prefabs.map(instantiatePrefab);
};











































