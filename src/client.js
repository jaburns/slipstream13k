gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
let ext = gl.getExtension("OES_texture_half_float");
let FRAMES = 32;

//__include soundbox-player.inc.js
//__include song.inc.js

//__include shaders.gen.js

//__include math.inc.js
//__include gfx.inc.js
//__include meshLoader.inc.js
//__include terrainGen.inc.js

//__include state.inc.js

let socket = io()
  , lastReceiveState
  , blobs = __binaryBlobs
  , lastState
  , currentState
  , skyboxProg = gfx_compileProgram(skybox_vert, skybox_frag)
  , linProg = gfx_compileProgram(fullQuad_vert,linearize_frag)
  , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
  , blurPassProg = gfx_compileProgram(fullQuad_vert, blurPass_frag)
  , pickBloomPassProg = gfx_compileProgram(fullQuad_vert, pickBloomPass_frag)
  , depthPass = gfx_compileProgram(fullQuad_vert,renderDepth_frag)
  , reprojectProg = gfx_compileProgram(reproject_vert,reproject_frag)
  , terrainProg = gfx_compileProgram(terrain_vert,terrain_frag)
  , copyProg = gfx_compileProgram(fullQuad_vert,copy_frag)
  , composePassProg = gfx_compileProgram(fullQuad_vert, composePass_frag)
  , downDepthProg = gfx_compileProgram(fullQuad_vert, downDepth_frag)
  , frameBuffers = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
  , depthStack = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
  , mipStack = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
  , swap = 0
  , frame = 0
  , cubeTexture = gfx_createCubeMap()
  , motionCubeTexture = gfx_createMotionCubeMap()
  , cubeModel
  , aspectRatio
  , soundEffect
  , projectionMatrix
  , viewMatrix
  , lastViewMatrix
  , transform = Transform_create()
  , oldTransforms = []
  , camPos = [0,0,0]
  , near = 0.2
  , far = 100
  , test = 0
  , resizeFunc = () => {
        let w = innerWidth, h = innerHeight;
        C.width = w;
        C.height = h;
        
        frameBuffers[0].r(w, h);
        frameBuffers[1].r(w, h);
        frameBuffers[2].r(w, h);

        gl.viewport(0, 0, w, h);
        aspectRatio = w / h;
        for(i=0; i<mipStack.length; i++){
            depthStack[i].r(w,h);
            w = ~~(w/2);
            h = ~~(h/2);
            mipStack[i].r(w,h);
        }
        
    };

C.style.left = C.style.top = 0;
onresize = resizeFunc;
resizeFunc();

socket.on("connect", () => {
    onkeydown = k => {socket.emit('d', k.keyCode); console.log(k.keyCode); if(k.keyCode==188)test+=1; if(k.keyCode==79)test-=1;};
    onkeyup = k => {socket.emit('u', k.keyCode);};

    socket.on('s', s => {
        lastState = currentState;
        currentState = s;
        lastReceiveState = Date.now();
    });
});

let terrainStuff = terrainGen_getRenderer(blobs[G_MAP_BLOB]);

gl.clearColor(0, 0, 0, 1);
gl.disable(gl.CULL_FACE);

let drawScene = state => {
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    gl.depthMask(false);
    {
        let projection = mat4_multiply(projectionMatrix,viewMatrix);
        let lastProjection = mat4_multiply(projectionMatrix,lastViewMatrix)
        let reproject = mat4_multiply(lastProjection,mat4_invert(projection));


        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

        gl.useProgram(skyboxProg);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
        //gl.bindTexture(gl.TEXTURE_CUBE_MAP, motionCubeTexture[0]);
        gl.uniform1i(gl.getUniformLocation(skyboxProg, "u_tex"), 0);
        let inv_vp = mat4_invert(mat4_multiply(projectionMatrix,viewMatrix));
        let inv_vp_old = mat4_invert(mat4_multiply(projectionMatrix,lastViewMatrix));
        gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'u_inv_vp'), false, inv_vp);
        gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'u_reproject'), false, reproject);


        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(skyboxProg, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
    
    };
    gl.depthMask(true);



    gl.useProgram(terrainProg);

    terrainStuff.meshes.forEach((m,i) => {
        let modelMatrix = [1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1];

        let mvpOld = mat4_multiply(mat4_multiply(projectionMatrix,lastViewMatrix),modelMatrix);
        let mvp = mat4_multiply(mat4_multiply(projectionMatrix,viewMatrix),modelMatrix);

        gl.uniformMatrix4fv(gl.getUniformLocation(terrainProg, 'u_model'), false, modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(terrainProg, 'u_view'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(terrainProg, 'u_proj'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(terrainProg, 'u_mvp'), false, mvp);
        gl.uniformMatrix4fv(gl.getUniformLocation(terrainProg, 'u_mvp_old'), false, mvpOld);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, terrainStuff.heightMapTexture);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_heightMap'), 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, m.v);
        let posLoc = gl.getAttribLocation(terrainProg, 'a_position');
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.i);
        gl.drawElements(gl.TRIANGLES, m.t, gl.UNSIGNED_SHORT, 0);
    });



    gl.useProgram(cubeProg);

    state.forEach((player, i) => {
        let t = Date.now() / 10000 + i*1.7;
        transform.r = quat_setAxisAngle([.16,.81,.57], t);
        transform.p[0] = player.x;
        transform.p[1] = player.y;
        transform.p[2] = -1;


        let modelMatrix = Transform_toMatrix(transform);

        if(typeof oldTransforms[i] =='undefined'){
            oldTransforms[i]=modelMatrix;
        }
        
        let mvpOld = mat4_multiply(mat4_multiply(projectionMatrix,lastViewMatrix),oldTransforms[i]);
        let mvp = mat4_multiply(mat4_multiply(projectionMatrix,viewMatrix),modelMatrix);

        oldTransforms[i]=modelMatrix;

        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_model'), false, modelMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_view'), false, viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_proj'), false, projectionMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_mvp'), false, mvp);
        gl.uniformMatrix4fv(gl.getUniformLocation(cubeProg, 'u_mvp_old'), false, mvpOld);

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
    gl.viewport(0,0,innerWidth,innerHeight);
    nextswap = (swap+1)%2;
    
    projectionMatrix = mat4_perspective(aspectRatio, near, far);
    viewMatrix = mat4_fromRotationTranslationScale(quat_setAxisAngle([0,1,0],Math.cos(Date.now()/1000)*0.1),camPos,[1,1,1])

    if(lastViewMatrix==null) lastViewMatrix=viewMatrix;

    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[2].f);

    drawScene(state);

    lastViewMatrix = viewMatrix;


    gl.disable(gl.DEPTH_TEST);

    gfx_renderBuffer(linProg, frameBuffers[2].d,depthStack[0],()=>{
        gl.uniform3f(gl.getUniformLocation(linProg, 'u_clip'), near*far, near-far, far);
    });

    for(i=1; i<depthStack.length; i++){
        gfx_renderBuffer(downDepthProg,depthStack[i-1],depthStack[i]);
    }

    gfx_renderBuffer(reprojectProg, frameBuffers[2],frameBuffers[nextswap], () => {
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, frameBuffers[swap].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_old'), 1);

        gl.uniform3f(gl.getUniformLocation(reprojectProg, 'u_clip'), near*far, near-far, far);
        let inverter = [-2.0/(projectionMatrix[0]),
        -2.0/(projectionMatrix[5]),
        (1.0- projectionMatrix[8]) / projectionMatrix[0],
        (1.0+ projectionMatrix[9]) / projectionMatrix[5]];
        //console.log(inverter);
        let ip = mat4_invert(projectionMatrix);
        for(i=0; i<4;i++){
            s="";
            for(j=0; j<4;j++){
                s+=ip[j*4+i]+", ";
            }
            //console.log(s);
        }

        gl.uniform4f(gl.getUniformLocation(reprojectProg, 'u_proj'), inverter[0],inverter[1],inverter[2],inverter[3]);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[0].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth'), 2);

        gl.activeTexture(gl.TEXTURE5);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[1].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth1'), 5);

        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[2].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth2'), 6);

        gl.activeTexture(gl.TEXTURE7);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[3].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth3'), 7);

        gl.activeTexture(gl.TEXTURE8);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[4].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth4'), 8);

        gl.activeTexture(gl.TEXTURE9);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[5].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth5'), 9);

        gl.activeTexture(gl.TEXTURE10);
        gl.bindTexture(gl.TEXTURE_2D, depthStack[6].t);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_depth6'), 10);

        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_time"), frame);
        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_test"), test);

        

        let projection = mat4_multiply(projectionMatrix,viewMatrix);
        gl.uniformMatrix4fv(gl.getUniformLocation(reprojectProg, 'u_inv_vp'), false, mat4_invert(projection));

        gl.uniformMatrix4fv(gl.getUniformLocation(reprojectProg, 'u_inv_p'), false, mat4_invert(projectionMatrix));

        let subFrames=8;
        let f = ~~(frame/subFrames) % (FRAMES * 2-2);
        gl.activeTexture(gl.TEXTURE3);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, motionCubeTexture[Math.abs(f-(FRAMES-1))]);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, "u_cube1"), 3);

        frame = (frame + 1);

        f = ~~(frame / subFrames) % (FRAMES * 2-2);
        gl.activeTexture(gl.TEXTURE4);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, motionCubeTexture[Math.abs(f-(FRAMES-1))]);
        gl.uniform1i(gl.getUniformLocation(reprojectProg, "u_cube2"), 4);

        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_interpolate"), (frame % subFrames)/subFrames);
        gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_aspect"), aspectRatio);
    });

    let downed = gfx_downSample(frameBuffers[nextswap],5,innerWidth,innerHeight);

    gfx_renderBuffer(copyProg, frameBuffers[nextswap],null,()=>{
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, downed.t);
        gl.uniform1i(gl.getUniformLocation(copyProg, 'u_bloom'), 1);
    });
    swap = nextswap
};

let update = () => {
    if (lastState && currentState && cubeModel)
        render(state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

update();

cubeModel = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])[G_MODEL_INDEX_Nuke];

let exampleSFX=__includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1});
sbPlay(exampleSFX, x => soundEffect = x);

sbPlay(song);

onclick = soundEffect