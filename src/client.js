gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('WEBGL_depth_texture');
ext = gl.getExtension("OES_texture_half_float");


//__include soundbox-player.inc.js
//__include shaders.gen.js
//__include math.inc.js
//__include gfx.inc.js
//__include state.inc.js
//__include song.inc.js

let socket = io()
  , lastReceiveState
  , blobs = __binaryBlobs
  , lastState
  , currentState
  , skyboxProg = gfx_compileProgram(skybox_vert,skybox_frag)
  , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
  , blurPassProg = gfx_compileProgram(fullQuad_vert, blurPass_frag)
  , pickBloomPassProg = gfx_compileProgram(fullQuad_vert, pickBloomPass_frag)
  , depthPass = gfx_compileProgram(fullQuad_vert,renderDepth_frag)
  , reprojectProg = gfx_compileProgram(reproject_vert,reproject_frag)
  , copyProg = gfx_compileProgram(fullQuad_vert,copy_frag)
  , composePassProg = gfx_compileProgram(fullQuad_vert, composePass_frag)
  , fxaaPassProg = gfx_compileProgram(fullQuad_vert, fxaaPass_frag)
  , frameBuffers = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
  , swap = 0
  , frame = 0
  , cubeTexture = gfx_createCubeMap()
  , motionCubeTexture = gfx_createMotionCubeMap()
  , cubeModel
  , aspectRatio
  , soundEffect
  , lastProjection
  , projectionMatrix
  , viewMatrix
  , transform = Transform_create()
  , resizeFunc = () => {
        let w = innerWidth, h = innerHeight;
        C.width = w;
        C.height = h;
        frameBuffers[0].r(w, h);
        frameBuffers[1].r(w, h);
        frameBuffers[2].r(w, h);
        gl.viewport(0, 0, w, h);
        aspectRatio = w / h;
    };

C.style.left = C.style.top = 0;
onresize = resizeFunc;
resizeFunc();

socket.on("connect", () => {
    onkeydown = k => socket.emit('d', k.keyCode);
    onkeyup = k => socket.emit('u', k.keyCode);

    socket.on('s', s => {
        lastState = currentState;
        currentState = s;
        lastReceiveState = Date.now();
    });
});

gl.clearColor(0, 0, 0, 1);

let drawScene = state => {
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.depthMask(false);
    {
        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

        gl.useProgram(skyboxProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        gl.uniform1i(gl.getUniformLocation(skyboxProg, "u_tex"), 0);
        let inv_vp = mat4_invert(mat4_multiply(projectionMatrix,viewMatrix));
        gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'u_inv_vp'), false, inv_vp);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(skyboxProg, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    };
    gl.depthMask(true);

    gl.useProgram(cubeProg);


    state.forEach((player, i) => {
        let t = Date.now() / 10000 + i*1.7;
        transform.r = quat_setAxisAngle([.16,.81,.57], t);
        transform.p[0] = 4*player.x - 2;
        transform.p[1] = 4*player.y - 2;
        transform.p[2] = -3;


        let modelMatrix = Transform_toMatrix(transform);


        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_model'), false, modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_view'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_proj'), false, projectionMatrix);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.v);
        let posLoc = gl.getAttribLocation(cubeProg, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeModel.n);
        posLoc = gl.getAttribLocation(cubeProg, 'a_normal');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeModel.i);
        gl.drawElements(gl.TRIANGLES, cubeModel.t, gl.UNSIGNED_SHORT, 0);
    });
};

let render = state => {
    nextswap = (swap+1)%2;
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[2].f);
    
    projectionMatrix = mat4_perspective(aspectRatio, .2, 100);
    viewMatrix = mat4_fromRotationTranslationScale(quat_setAxisAngle([0,1,0],Math.cos(Date.now()/1000)*0.1),[0,0,0],[1,1,1])

    let projection = mat4_multiply(projectionMatrix,viewMatrix);
    if(lastProjection==null) lastProjection=projection;
    let reproject = mat4_multiply(lastProjection,mat4_invert(projection));

    lastProjection = projection;

    drawScene(state);

    gl.disable(gl.DEPTH_TEST);
    gl.bindFramebuffer(gl.FRAMEBUFFER,frameBuffers[nextswap].f);

    gfx_renderBuffer(reprojectProg, frameBuffers[2].t, () => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, frameBuffers[swap].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_old'), 1);
        gl.uniformMatrix4fv(gl.getUniformLocation(reprojectProg, 'u_reproject'), false, reproject);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, frameBuffers[2].d);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth'), 2);

        gl.uniformMatrix4fv(gl.getUniformLocation(reprojectProg, 'u_inv_vp'), false, mat4_invert(projection));

        let FRAMES = 16;
        let subFrames=3;
        let f = ~~(frame/subFrames) % (FRAMES * 2 - 1);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, motionCubeTexture[Math.abs(f-(FRAMES-1))]);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, "u_cube1"), 3);

        frame = (frame + 1);

        f = ~~(frame / subFrames) % (FRAMES * 2 - 1);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, motionCubeTexture[Math.abs(f-(FRAMES-1))]);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, "u_cube2"), 4);

        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_interpolate"), (frame % subFrames)/subFrames);
        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_aspect"), aspectRatio);



        
    });


    gl.bindFramebuffer(gl.FRAMEBUFFER,null);
    gfx_renderBuffer(copyProg, frameBuffers[nextswap].t);
    swap = nextswap
};

let update = () => {
    if (lastState && currentState && cubeModel)
        render(state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

update();

cubeModel = gfx_loadBufferObjectsFromModelFile(blobs[G_CUBE_MODEL_BLOB]);

let exampleSFX=__includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1});
sbPlay(exampleSFX, x => soundEffect = x);

sbPlay(song);

onclick = soundEffect