//__include shaders.gen.js
//__include math.inc.js
//__include gfx.inc.js
//__include meshLoader.inc.js

gl.enable(gl.DEPTH_TEST);
gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

let blobs = __binaryBlobs;

let w = innerWidth, h = innerHeight;
C.width = w;
C.height = h;
gl.viewport(0, 0, w, h);

let aspectRatio = w / h;

let transform = {
    p: [0,0,-1],
    r: [0,0,0,1],
    s: [1,1,1]
};

let cubeModel = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])[G_MODEL_INDEX_Nuke];

let testNormalsProg = gfx_compileProgram(testNormals_vert, testNormals_frag)

let update = () => {
    let t = Date.now() / 1000;
    transform.r = quat_setAxisAngle([.81,.16,.57], t);

    let viewMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];
    let projectionMatrix = mat4_perspective(aspectRatio, .2, 100);
    let modelMatrix = Transform_toMatrix(transform);
    let vp = mat4_multiply(projectionMatrix, viewMatrix);
        
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(testNormalsProg);

    gl.uniformMatrix4fv(gl.getUniformLocation(testNormalsProg, 'u_model'), false, modelMatrix);
    gl.uniformMatrix4fv(gl.getUniformLocation(testNormalsProg, 'u_vp'), false, vp);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.v);
    let posLoc = gl.getAttribLocation(testNormalsProg, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.n);
    posLoc = gl.getAttribLocation(testNormalsProg, 'a_normal');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.i);
    gl.drawElements(gl.TRIANGLES, cubeModel.t, gl.UNSIGNED_SHORT, 0);

    requestAnimationFrame(update);
}

update();