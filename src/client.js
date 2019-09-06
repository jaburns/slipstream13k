gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
gl.getExtension("OES_texture_half_float");

let blobs = __binaryBlobs;
let FRAMES = 32;
let aspectRatio = 1;

//__include soundbox-player.inc.js
//__include song.inc.js

//__include shaders.gen.js

//__include math.inc.js
//__include gfx.inc.js
//__include meshLoader.inc.js
//__include terrainGen.inc.js

//__include state.inc.js

//__include renderer.inc.js

let socket = io()
  , lastReceiveState
  , lastState
  , currentState
  , soundEffect
  , renderer = renderer_create()
  , resizeFunc = () => {
        let w = innerWidth, h = innerHeight;
        C.width = w;
        C.height = h;
        renderer.resize(w, h);
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
gl.disable(gl.CULL_FACE);

let update = () => {
    if (lastState && currentState)
        renderer.render(state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS));
    requestAnimationFrame(update);
};

update();

let exampleSFX=__includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1});
sbPlay(exampleSFX, x => soundEffect = x);

sbPlay(song);

onclick = soundEffect