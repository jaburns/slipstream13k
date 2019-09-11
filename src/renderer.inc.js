let renderer_create = () => {
    let skyboxProg = gfx_compileProgram(skybox_vert, skybox_frag)
        , linProg = gfx_compileProgram(fullQuad_vert,linearize_frag)
        , reprojectProg = gfx_compileProgram(reproject_vert,reproject_frag)
        , copyProg = gfx_compileProgram(fullQuad_vert,copy_frag)
        , downDepthProg = gfx_compileProgram(fullQuad_vert, downDepth_frag)
        , frameBuffers = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(true)]
        , depthStack = math_range(0,9).map(gfx_createFrameBufferTexture)
        , mipStack = math_range(0,9).map(gfx_createFrameBufferTexture)
        , swap = 0
        , frame = 0
        , cubeTexture = gfx_createCubeMap()
        , FRAMES = 32
        , motionCubeTexture = gfx_createMotionCubeMap(FRAMES)
        , projectionMatrix
        , projectionMatrixInv
        , viewMatrix
        , viewMatrixInv
        , lastViewMatrix
        , aspectRatio = 1;

    let killTranslation = (x,i) => i > 11 && i < 15 ? 0 : x;

    let createTextTexture = () => {
        let ctx = gfx_createCanvas2d(64,64);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 32px sans-serif';

        let texture = gl.createTexture();

        let update = str => {
            ctx.clearRect(0, 0, 64, 64);
            ctx.fillText(str, 2, 32);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, ctx.canvas);
        };
        update();

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

        return {
            $update: update,
            $texture: texture,
        };
    };

    let textProg = gfx_compileProgram(text_vert, text_frag);
    let textTex = createTextTexture();

    let drawText = txt => {
        textTex.$update(txt);

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(textProg);
        gfx_renderBuffer(textProg, {t:textTex.$texture,w:1,h:1});
        gl.disable(gl.BLEND);
    };

    let resize = (w, h) => {
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

        scene.$objects.forEach(obj => {
            if (obj.$cull) gl.enable(gl.CULL_FACE);
            else gl.disable(gl.CULL_FACE);

            gl.useProgram(obj.$prog);

            let modelMatrix = Transform_toMatrix(obj.$transform);
            if (!obj.$oldModelMatrix)
                obj.$oldModelMatrix = modelMatrix;

            let mvpOld = mat4_multiply(mat4_multiply(projectionMatrix,lastViewMatrix),obj.$oldModelMatrix);
            let mvp = mat4_multiply(mat4_multiply(projectionMatrix,viewMatrix),modelMatrix);

            obj.$oldModelMatrix = modelMatrix;

            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_model'), false, modelMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_view'), false, viewMatrix);
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_proj'), false, projectionMatrix);
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

    let render = scene => {
        gl.viewport(0,0,innerWidth,innerHeight);
        nextswap = (swap+1)%2;
        
        projectionMatrix = mat4_perspectiveHardCoded(aspectRatio);
        projectionMatrixInv = mat4_perspectiveInverseHardCoded(aspectRatio);

        viewMatrix = mat4_multiply(
            mat4_fromRotationTranslationScale(quat_conj(scene.$cameraTransform.r), [0,0,0], [1,1,1]),
            mat4_fromRotationTranslationScale([0,0,0,1], scene.$cameraTransform.p.map(x=>-x), [1,1,1])
        );
        viewMatrixInv = 
            mat4_fromRotationTranslationScale(scene.$cameraTransform.r, scene.$cameraTransform.p, [1,1,1]);

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
            gl.uniform1f(gl.getUniformLocation(reprojectProg, "u_aspect"), aspectRatio);
        });

        let downed = gfx_downSample(frameBuffers[nextswap],5,mipStack);

        gfx_renderBuffer(copyProg, frameBuffers[nextswap],null,()=>{
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, downed.t);
            gl.uniform1i(gl.getUniformLocation(copyProg, 'u_bloom'), 1);
        });
        swap = nextswap;

        drawText(scene.$place + " : " + scene.$lap);
    };

    return {
        render,
        resize
    };
};
