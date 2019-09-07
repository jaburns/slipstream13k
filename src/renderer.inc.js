let renderer_create = () => {
    let skyboxProg = gfx_compileProgram(skybox_vert, skybox_frag)
        , linProg = gfx_compileProgram(fullQuad_vert,linearize_frag)
        , reprojectProg = gfx_compileProgram(reproject_vert,reproject_frag)
        , copyProg = gfx_compileProgram(fullQuad_vert,copy_frag)
        , downDepthProg = gfx_compileProgram(fullQuad_vert, downDepth_frag)
        , frameBuffers = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
        , depthStack = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
        , mipStack = [gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture(),gfx_createFrameBufferTexture()]
        , swap = 0
        , frame = 0
        , cubeTexture = gfx_createCubeMap()
        , FRAMES = 32
        , motionCubeTexture = gfx_createMotionCubeMap(FRAMES)
        , projectionMatrix
        , viewMatrix
        , lastViewMatrix
        , near = 0.2
        , far = 100
        , aspectRatio = 1;

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

        scene.$objects.forEach(obj => {
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
            gl.uniformMatrix4fv(gl.getUniformLocation(obj.$prog, 'u_mvp_old'), false, mvpOld);

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
        
        projectionMatrix = mat4_perspective(aspectRatio, near, far);
        viewMatrix = mat4_invert(Transform_toMatrix(scene.$cameraTransform));

        if(lastViewMatrix==null) lastViewMatrix=viewMatrix;

        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffers[2].f);

        drawScene(scene);

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

        let downed = gfx_downSample(frameBuffers[nextswap],5,mipStack);

        gfx_renderBuffer(copyProg, frameBuffers[nextswap],null,()=>{
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, downed.t);
            gl.uniform1i(gl.getUniformLocation(copyProg, 'u_bloom'), 1);
        });
        swap = nextswap
    };

    return {
        render,
        resize
    };
};
