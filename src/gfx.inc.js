if (__DEBUG) {
    var showHTMLShaderError = (kind, log, code) => {
        let codeWithNumbers = code.split('\n').map((x,i) => `${i+2}:  ${x}`).join('<br />');

        document.body.innerHTML = `<h1>Error in ${kind} shader:</h1>
            <code>${log.replace(/\n/g, '<br/>')}</code><br><br>
            <code>${codeWithNumbers}</code>`;

        throw new Error('Error compiling shader');
    };
}

let gfx_createCanvas2d = (w,h,c) => (
    c = document.createElement('canvas'),
    c.width = w,
    c.height = h,
    c.getContext('2d')
);

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

let gfx_fullQuadVertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, gfx_fullQuadVertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,1,-1,-1,1,-1,1,-1,1,1,-1,1]), gl.STATIC_DRAW);

let gfx_renderBuffer = (shader, src, dst, preDraw) => {
    gl.useProgram(shader);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src.t||src);
    gl.uniform1i(gl.getUniformLocation(shader, "u_tex"), 0);

    gl.uniform2f(gl.getUniformLocation(shader, 'u_resolution'), src.w||dst.w, src.h||dst.h);

    gl.bindBuffer(gl.ARRAY_BUFFER, gfx_fullQuadVertexBuffer);
    let posLoc = gl.getAttribLocation(shader, "a_position");
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    preDraw && preDraw();
    if(dst){
        gl.bindFramebuffer(gl.FRAMEBUFFER,dst.f);
        gl.viewport(0,0,dst.w,dst.h);
    }else{
        gl.bindFramebuffer(gl.FRAMEBUFFER,null);
        gl.viewport(0,0,globalWidth, globalHeight);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 6);
};

let gfx_createFrameBufferTexture = (width,height,hasdepth) => {
    width = width || globalWidth;
    height = height || globalHeight;

    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);

    let texture = gl.createTexture();
    
    let depthTexture = hasdepth && gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.FLOAT, null);

    // TODO do we need all of these tex parameters?

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

    if (hasdepth) {
        gl.bindTexture(gl.TEXTURE_2D, depthTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT, width, height, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);
    }

    return {
        f: framebuffer,
        t: texture,
        d: depthTexture,
        w: width,
        h: height,
    };
};

let gfx_rotations = [
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

let gfx_createCube = (shader,s,format,frame) => {
    gl.useProgram(shader);

    let framebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
        
    let cube = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, cube);
    for(var i=0; i<6; i++){
        gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, s, s, 0, gl.RGBA, format, null);
    }
    for(var i=0; i<6;i++){

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, cube, 0);
        gl.viewport(0,0,s,s);
        gl.uniform1f(gl.getUniformLocation(shader, 'u_slice'),frame);
        gl.uniformMatrix3fv(gl.getUniformLocation(shader, 'u_rot'), false,gfx_rotations[i]);

        gl.bindBuffer(gl.ARRAY_BUFFER, gfx_fullQuadVertexBuffer);
        let posLoc = gl.getAttribLocation(shader, "a_position");
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 6);


    }
    gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    return cube;
}

let gfx_createMotionCubeMap = FRAMES =>{
    let cube = [];
    for(var f=0; f<FRAMES; f++){
        cube[f] = gfx_createCube(gfx_compileProgram(fullQuad_vert,curlBox_frag),256,36193,f/FRAMES);
    }
    return cube;
}

let gfx_downProg = gfx_compileProgram(fullQuad_vert,downSample_frag)
    , gfx_upProg = gfx_compileProgram(fullQuad_vert,upSample_frag);

let gfx_downSample = (buf,amt,mipStack) =>{
    let shader = gfx_downProg;
    let oldBuf=buf;
    for(i=0; i<amt; i++){
        buf = mipStack[i];
        gfx_renderBuffer(shader,oldBuf,buf);
        oldBuf=buf;
    }

    shader = gfx_upProg;

    for(i=amt-2; i>1; i--){
        buf = mipStack[i];
        
        gfx_renderBuffer(shader,oldBuf,buf);

        oldBuf=buf;
    }

    return oldBuf;
}
