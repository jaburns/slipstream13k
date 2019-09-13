let globalWidth = 512;
let globalHeight = 512;

//__include shaders.gen.js
//__include gfx.inc.js
//__include terrainGen.inc.js

let blobs = __binaryBlobs;

let trackCanvas = terrainGen_loadTrackCanvasFromBlob([].slice.call(blobs[G_MAP_BLOB]).map(x=>x/255));
document.body.appendChild(trackCanvas);

let heightMapTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, heightMapTex);
gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trackCanvas);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

let sliders = {};

let defaults =
{"u_preScalePower":1.1,"u_curveScale":4,"u_curveOffset":0.1,"u_postScalePower":1.5,"u_noise0":[0.05,32,0],"u_noise1":[0.2,8,0],"u_noise2":[0.4,4,1],"u_noise3":[0.6,0.5,3],"u_finalScale":1.6,"u_finalPower":0.9};
//{"u_preScalePower":1.1,"u_curveScale":3.5,"u_curveOffset":0.1,"u_postScalePower":1.2,"u_noise0":[0.1,25,0],"u_noise1":[0.05,20,0.4],"u_noise2":[0.3,5,1],"u_noise3":[0.5,2,1.2],"u_finalScale":1.5,"u_finalPower":1.3};
//{"u_preScalePower":1.2,"u_curveScale":2.87,"u_curveOffset":0.3,"u_postScalePower":1.4,"u_noise0":[0.05,26,1.4],"u_noise1":[0.08,15,0],"u_noise2":[0.3,5,1.1],"u_noise3":[0.5,2,3],"u_finalScale":1.5,"u_finalPower":1.3}

let uniformSlider = label => {
    if (!(label in sliders)) {
        let slider = document.createElement('input');
        let p = document.createElement('i');
        p.innerHTML = label;
        document.body.insertBefore(document.createElement('br'), C);
        document.body.insertBefore(p, C);
        document.body.insertBefore(slider, C);
        slider.value = defaults[label];
        sliders[label] = slider;
    }
    defaults[label] = parseFloat(sliders[label].value);
    return defaults[label];
};

let uniformSliderPair = label => {
    if (!(label in sliders)) {
        let slider0 = document.createElement('input');
        let slider1 = document.createElement('input');
        let slider2 = document.createElement('input');
        let p = document.createElement('i');
        p.innerHTML = label;
        document.body.insertBefore(document.createElement('br'), C);
        document.body.insertBefore(p, C);
        document.body.insertBefore(slider0, C);
        document.body.insertBefore(slider1, C);
        document.body.insertBefore(slider2, C);
        [slider0,slider1,slider2].map((x, i) => x.value = defaults[label][i]);
        sliders[label] = [slider0, slider1, slider2];
    }
    defaults[label] = sliders[label].map((x, i) => parseFloat(x.value));
    return defaults[label];
};

let shader = gfx_compileProgram(fullQuad_vert, terrainMap_frag);

let update = () => {
    C.width = C.height = 512;
    gl.viewport(0, 0, 512, 512);
    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gfx_renderBuffer(shader, {t:heightMapTex,w:512,h:512}, 0, () => {
        gl.uniform1f (gl.getUniformLocation(shader, 'u_preScalePower'), uniformSlider('u_preScalePower'));
        gl.uniform1f (gl.getUniformLocation(shader, 'u_curveScale'), uniformSlider('u_curveScale'));
        gl.uniform1f (gl.getUniformLocation(shader, 'u_curveOffset'), uniformSlider('u_curveOffset'));
        gl.uniform1f (gl.getUniformLocation(shader, 'u_postScalePower'), uniformSlider('u_postScalePower'));
        gl.uniform3fv(gl.getUniformLocation(shader, 'u_noise0'), uniformSliderPair('u_noise0'));
        gl.uniform3fv(gl.getUniformLocation(shader, 'u_noise1'), uniformSliderPair('u_noise1'));
        gl.uniform3fv(gl.getUniformLocation(shader, 'u_noise2'), uniformSliderPair('u_noise2'));
        gl.uniform3fv(gl.getUniformLocation(shader, 'u_noise3'), uniformSliderPair('u_noise3'));
        gl.uniform1f (gl.getUniformLocation(shader, 'u_finalScale'), uniformSlider('u_finalScale'));
        gl.uniform1f (gl.getUniformLocation(shader, 'u_finalPower'), uniformSlider('u_finalPower'));
    });

    requestAnimationFrame(update);
};


let publish = document.createElement('button');
publish.textContent = 'Publish Values';
publish.onclick = () => {
    console.log(JSON.stringify(defaults));
};
document.body.insertBefore(publish, C);

update();

