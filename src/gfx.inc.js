let gfx_loadBufferObjects = (verts, tris, norms) => {
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

let gfx_flatShadeAndloadBufferObjects = (verts, tris) => {
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

    return gfx_loadBufferObjects(
        new Float32Array(newVerts),
        new Uint16Array(newTris),
        new Float32Array(normals)
    );
};

let gfx_loadBufferObjectsFromModelFile = (bytes, mode16) => {
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

    let tris = new Uint16Array(mode16 ? bytes.buffer.slice(triOffset) : bytes.subarray(triOffset));

    return gfx_flatShadeAndloadBufferObjects(new Float32Array(verts), tris);
};

if (__DEBUG) {
    var showHTMLShaderError = (kind, log, code) => {
        let codeWithNumbers = code.split('\n').map((x,i) => `${i+2}:  ${x}`).join('<br />');

        document.body.innerHTML = `<h1>Error in ${kind} shader:</h1>
            <code>${log.replace(/\n/g, '<br/>')}</code><br><br>
            <code>${codeWithNumbers}</code>`;

        throw new Error('Error compiling shader');
    };
}

let gfx_compileProgram = (vert, frag) => {
    let vertShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertShader, vert);
    gl.compileShader(vertShader);

    if (__DEBUG) {
        let vertLog = gl.getShaderInfoLog(vertShader);
        if (vertLog === null || vertLog.length > 0 && vertLog.indexOf('ERROR') >= 0)
            showHTMLShaderError('vertex', vertLog, vert);
    }

    let fragShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragShader, 'precision highp float;'+frag);
    gl.compileShader(fragShader);

    if (__DEBUG) {
        let fragLog = gl.getShaderInfoLog(fragShader);
        if (fragLog === null || fragLog.length > 0 && fragLog.indexOf('ERROR') >= 0)
            showHTMLShaderError('fragment', fragLog, frag);
    }

    let prog = gl.createProgram();
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);

    return prog;
};

let gfx_renderBuffer; {
    let vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

    gfx_renderBuffer = (shader, texture, preDraw) => {
        gl.useProgram(shader);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(gl.getUniformLocation(shader, "u_tex"), 0);

        gl.uniform2f(gl.getUniformLocation(shader, 'u_resolution'), C.width, C.height);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        preDraw && preDraw();

        gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
};

let gfx_createFrameBufferTexture = () => {
    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    let texture = gl.createTexture();
    let depthTexture = gl.createTexture();

    let result = {
        f: framebuffer,
        t: texture,
        d: depthTexture,
        r(width, height) { // resize()
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, ext.HALF_FLOAT_OES, null);

            gl.bindTexture(gl.TEXTURE_2D, depthTexture); // TODO don't always do this
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
        }
    };

    result.r(1,1);

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindTexture(gl.TEXTURE_2D, depthTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);



    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    return result;
};

let gfx_createCubeMap = () =>{

    let shader = gfx_compileProgram(fullQuad_vert,genSkybox_frag);
    let s = 1024;

    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        
    let cube = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
    for(var i=0; i<6; i++){
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, s, s, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }
    for(var i=0; i<6;i++){
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, cube, 0);
        gl.viewport(0,0,s,s);
        v = -~~(i%2*2-1);
        p = ~~(i/2);
        let xpos = [(p==0)*v,(p==1)*v,(p==2)*v];
        let ypos = [p==1,p!=1,0];
        let zpos = vec3_cross(xpos,ypos);
        let rotation = xpos.concat(ypos).concat(zpos);
        if(p==1){
            rotation = ypos.concat(zpos).concat(xpos);
        }

        gfx_renderBuffer(shader,null,()=>{

            gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_rot'), false,rotation);

        });
    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return cube;
}

let gfx_createMotionCubeMap = () =>{

    let shader = gfx_compileProgram(fullQuad_vert,curlBox_frag);
    let s = 1024;

    
    let cube = [];
    let FRAMES = 16;
    for(var f=0; f<FRAMES; f++){
        let framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    
    cube[f] = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube[f]);
    for(var i=0; i<6; i++){
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, s, s, 0, gl.RGBA, ext.HALF_FLOAT_OES, null);
    }
    for(var i=0; i<6;i++){
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, cube[f], 0);
        gl.viewport(0,0,s,s);
        v = -~~(i%2*2-1);
        p = ~~(i/2);
        let xpos = [(p==0)*v,(p==1)*v,(p==2)*v];
        let ypos = [p==1,p!=1,0];
        let zpos = vec3_cross(xpos,ypos);
        let rotation = xpos.concat(ypos).concat(zpos);
        if(p==1){
            rotation = ypos.concat(zpos).concat(xpos);
        }

        gfx_renderBuffer(shader,null,()=>{

            gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_rot'), false,rotation);
            console.log(f/FRAMES);
            gl.uniform1f(gl.getUniformLocation(shader, 'u_slice'),f/FRAMES);

        });
    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    return cube;
}
