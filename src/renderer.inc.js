let renderer_create = () => {
    let skyboxProg = gfx_compileProgram(skybox_vert, skybox_frag)
        , linProg = gfx_compileProgram(fullQuad_vert,linearize_frag)
        , reprojectProg = gfx_compileProgram(reproject_vert,reproject_frag)
        , copyProg = gfx_compileProgram(fullQuad_vert,copy_frag)
        , downDepthProg = gfx_compileProgram(fullQuad_vert, downDepth_frag)
        , frameBuffers = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(0,0,true)]
        , swap = 0
        , frame = 0
        , cubeTexture = gfx_createCube(gfx_compileProgram(fullQuad_vert,sky_frag),1024,gl.UNSIGNED_BYTE,0)
        , FRAMES = 32
        , motionCubeTexture = gfx_createMotionCubeMap(FRAMES)
        , projectionMatrix =    [G_ASPECT_RATIO_INV, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1.004, -1,     0, 0, -0.4008, 0]
        , projectionMatrixInv = [ G_ASPECT_RATIO, 0, 0, 0, 0, 1, 0, 0, 0, 0,      0, -2.495, 0, 0, -1,      2.505]
        , viewMatrix
        , viewMatrixInv
        , lastViewMatrix
        , depthStack = []
        , mipStack = [];

    for (let i = 0, w = globalWidth, h = globalHeight; i < 9; ++i) {
        depthStack.push(gfx_createFrameBufferTexture(w, h));
        mipStack.push(gfx_createFrameBufferTexture(w>>=1, h>>=1));
    }

    let killTranslation = (x,i) => i > 11 && i < 15 ? 0 : x;

    let createDrawText = () => {
        let ctx = gfx_createCanvas2d(256,128);
        ctx.fillStyle = '#fff';
        let texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        return (s0, s1) => {
            ctx.clearRect(0, 0, 256, 128);
            ctx.font = 'bold 64px sans-serif';
            ctx.fillText(s0, 2, 128-2*32);
            ctx.font = '28px sans-serif';
            ctx.fillText(s1, 2, 128-1*32);

            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);

            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            gl.useProgram(textProg);
            gfx_renderBuffer(textProg, {t:texture,w:1,h:1});
            gl.disable(gl.BLEND);
        };
    };

    let textProg = gfx_compileProgram(text_vert, text_frag);
    let drawText = createDrawText();

    let oldModelMatrices = {};

    let drawScene = scene => {
        gl.enable(gl.DEPTH_TEST);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.blendFunc(gl.ONE,gl.ZERO);
        
        gl.depthMask(false);
        {
            let invertProjection = mat4_multiply(viewMatrixInv, projectionMatrixInv);
            
            let lastProjection = mat4_multiply(projectionMatrix,lastViewMatrix);
            let reproject = mat4_multiply(lastProjection,invertProjection);

            gl.useProgram(skyboxProg);

            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeTexture);
            gl.uniform1i(gl.getUniformLocation(skyboxProg, "u_tex"), 0);

            let rvi = viewMatrixInv.map(killTranslation);
            let inv_vp = mat4_multiply(rvi,projectionMatrixInv);

            gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'u_invVp'), false, inv_vp);
            gl.uniformMatrix4fv(gl.getUniformLocation(skyboxProg, 'u_reproject'), false, reproject);

            gl.bindBuffer(gl.ARRAY_BUFFER, gfx_fullQuadVertexBuffer);
            let posLoc = gl.getAttribLocation(skyboxProg, "a_position");
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        };
        gl.depthMask(true);

        scene.$static.concat(scene.$dynamic).forEach(obj => {
            if (obj.$cull) gl.enable(gl.CULL_FACE);
            else gl.disable(gl.CULL_FACE);

            gl.useProgram(obj.$prog);

            if (!oldModelMatrices[obj.$id])
                oldModelMatrices[obj.$id] = obj.$matrix;

            let mvpOld = mat4_multiply(mat4_multiply(projectionMatrix,lastViewMatrix),oldModelMatrices[obj.$id]);
            let mvp = mat4_multiply(mat4_multiply(projectionMatrix,viewMatrix),obj.$matrix);

            oldModelMatrices[obj.$id] = obj.$matrix;

            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_model'), false, obj.$matrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_view'), false, viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_proj'), false, projectionMatrix); // TODO maybe inline projection matrix in shaders since it's constant now.
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_mvp'), false, mvp);
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_mvpOld'), false, mvpOld);

            gl.bindBuffer(gl.ARRAY_BUFFER, obj.$mesh.v);
            let posLoc = gl.getAttribLocation(obj.$prog, 'a_position');
            gl.enableVertexAttribArray(posLoc);
            gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

            if (obj.$tex) {
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, obj.$tex);
                gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_objTex'), 0);
            }

            if (obj.$mesh.n) {
                gl.bindBuffer(gl.ARRAY_BUFFER, obj.$mesh.n);
                posLoc = gl.getAttribLocation(obj.$prog, 'a_normal');
                gl.enableVertexAttribArray(posLoc);
                gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);
            }

            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, obj.$mesh.i);
            gl.drawElements(gl.TRIANGLES, obj.$mesh.t, gl.UNSIGNED_SHORT, 0);
        });
    };

    return scene => {
        gl.viewport(0,0,globalWidth, globalHeight);
        nextswap = (swap+1)%2;

        viewMatrix = mat4_multiply(
            mat4_fromRotationTranslationScale(quat_conj(scene.$player.$camRot), [0,0,0], [1,1,1]),
            mat4_fromRotationTranslationScale([0,0,0,1], scene.$player.$camPos.map(x=>-x), [1,1,1])
        );
        viewMatrixInv = 
            mat4_fromRotationTranslationScale(scene.$player.$camRot, scene.$player.$camPos, [1,1,1]);

        if(!lastViewMatrix) {
            lastViewMatrix = viewMatrix;
            lastViewMatrixInv = viewMatrixInv;
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[2].f);

        drawScene(scene);

        lastViewMatrix = viewMatrix;

        gl.disable(gl.DEPTH_TEST);

        gfx_renderBuffer(linProg, frameBuffers[2].d,depthStack[0],()=>{
            gl.uniform3f(gl.getUniformLocation(linProg, 'u_clip'), G_NEAR_PLANE*G_FAR_PLANE, G_NEAR_PLANE-G_FAR_PLANE, G_FAR_PLANE);
        });

        for(i=1; i<depthStack.length; i++){
            gfx_renderBuffer(downDepthProg,depthStack[i-1],depthStack[i]);
        }

        gfx_renderBuffer(reprojectProg, frameBuffers[2],frameBuffers[nextswap], () => {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, frameBuffers[swap].t);
            gl.uniform1i(gl.getUniformLocation(reprojectProg, 'u_old'), 1);

            gl.uniform3f(gl.getUniformLocation(reprojectProg, 'u_clip'), G_NEAR_PLANE*G_FAR_PLANE, G_NEAR_PLANE-G_FAR_PLANE, G_FAR_PLANE);

            let inverter = [-2.0/(projectionMatrix[0]),
            -2.0/(projectionMatrix[5]),
            (1.0- projectionMatrix[8]) / projectionMatrix[0],
            (1.0+ projectionMatrix[9]) / projectionMatrix[5]];

            gl.uniform4fv(gl.getUniformLocation(reprojectProg, 'u_proj'), inverter);

            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, depthStack[0].t);
            gl.uniform1i(gl.getUniformLocation(reprojectProg, 'd'), 2);

            for (let i = 0; i <= 5; ++i) {
                gl.activeTexture(gl.TEXTURE5+i);
                gl.bindTexture(gl.TEXTURE_2D, depthStack[1+i].t);
                gl.uniform1i(gl.getUniformLocation(reprojectProg, 'd'+(i+1)), 5+i);
            }

            gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_time"), frame);

            let rvi = viewMatrixInv.map(killTranslation);
            let invertProjection =  mat4_multiply(rvi, projectionMatrixInv);

            gl.uniformMatrix4fv(gl.getUniformLocation(reprojectProg, 'u_invVp'), false, invertProjection);

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
            gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_aspect"), G_ASPECT_RATIO);
        });

        let downed = gfx_downSample(frameBuffers[nextswap],5,mipStack);

        gfx_renderBuffer(copyProg, frameBuffers[nextswap],null,()=>{
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, downed.t);
            gl.uniform1i(gl.getUniformLocation(copyProg, 'u_bloom'), 1);
        });
        swap = nextswap;

        drawText(scene.$text0, scene.$text1);
    };
};
