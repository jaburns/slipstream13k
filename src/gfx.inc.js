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
    gl.shaderSource(fragShader, '#extension GL_OES_standard_derivatives : enable\nprecision highp float;'+frag);
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

    gfx_renderBuffer = (shader, src, dst, preDraw) => {
        gl.useProgram(shader);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, src.t||src);
        gl.uniform1i(gl.getUniformLocation(shader, "u_tex"), 0);

        gl.uniform2f(gl.getUniformLocation(shader, 'u_resolution'), src.w||dst.w, src.h||dst.h);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

        preDraw && preDraw();
        if(dst!=null){
            gl.bindFramebuffer(gl.FRAMEBUFFER,dst.f);
            gl.viewport(0,0,dst.w,dst.h);
        }else{
            gl.bindFramebuffer(gl.FRAMEBUFFER,null);
            gl.viewport(0,0,C.width,C.height);
        }
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
        w: 1,
        h: 1,
        r(width, height) { // resize()
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);

            gl.bindTexture(gl.TEXTURE_2D, depthTexture); // TODO don't always do this
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
            this.w=width;
            this.h=height;
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

rotations = [
    [ 0, 0, -1,
      0, 1, 0,
      1, 0, 0],
    [ 0, 0, 1,
      0, 1, 0,
     -1, 0, 0],
    [ 1, 0, 0,
      0, 0,1,
      0, -1, 0],
    [ 1, 0, 0,
      0, 0,-1,
      0, 1, 0],
    [ 1, 0, 0,
      0, 1, 0,
      0, 0, 1],
    [-1, 0, 0,
      0, 1, 0,
      0, 0,-1]
];

let gfx_createCubeMap = () =>{

    let shader = gfx_compileProgram(fullQuad_vert,sky_frag);
    gl.useProgram(shader);

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

        gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_rot'), false,rotations[i]);

        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);


        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);


    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return cube;
}

let gfx_createMotionCubeMap = () =>{

    let shader = gfx_compileProgram(fullQuad_vert,curlBox_frag);
    gl.useProgram(shader);

    let s = 256;

    
    let cube = [];
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

        gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_rot'), false,rotations[i]);
        gl.uniform1f(gl.getUniformLocation(shader, 'u_slice'),f/FRAMES);


        let vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        let posLoc = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);

    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    }
    return cube;
}
let downProg = gfx_compileProgram(fullQuad_vert,downSample_frag)
    , upProg = gfx_compileProgram(fullQuad_vert,upSample_frag);
let gfx_downSample = (buf,amt,width,height) =>{
    let shader = downProg;
    let oldBuf=buf;
    for(i=0; i<amt; i++){
        buf = mipStack[i];
        gfx_renderBuffer(shader,oldBuf,buf);
        oldBuf=buf;
    }

    shader = upProg;

    for(i=amt-2; i>1; i--){
        buf = mipStack[i];
        
        gfx_renderBuffer(shader,oldBuf,buf);

        oldBuf=buf;
    }

    return oldBuf;
}
