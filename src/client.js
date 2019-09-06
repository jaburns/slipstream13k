gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
gl.getExtension("OES_texture_half_float");

let blobs = __binaryBlobs

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



let terrainProg = gfx_compileProgram(terrain_vert,terrain_frag)
  , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
  , terrainStuff = terrainGen_getRenderer(blobs[G_MAP_BLOB])
  , meshes = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])

let scene = {
    cameraTransform: Transform_create(),
    objects: terrainStuff.meshes.map(mesh => ({
        transform: Transform_create(),
        mesh,
        prog: terrainProg,
        tex: terrainStuff.heightMapTexture
    }))
};
let playerObjectsById = {};

let getPlayerObject = id => {
    if (!(id in playerObjectsById)) {
        playerObjectsById[id] = {
            transform: Transform_create(),
            mesh: meshes[G_MODEL_INDEX_Nuke],
            prog: cubeProg
        };

        scene.objects.push(playerObjectsById[id]);
    }
    return playerObjectsById[id];
};

let updateSceneFromGameState = state => {
    state.playerStates.forEach(ps => {
        let obj = getPlayerObject(ps.id);

        obj.transform.p[0] = ps.x;
        obj.transform.p[1] = ps.y;
        obj.transform.p[2] = -1;

        if (state.myId == ps.id) {
            scene.cameraTransform.p[0] = ps.x;
            scene.cameraTransform.p[1] = ps.y + 0.5;
        }
    });

};



let update = () => {
    if (lastState && currentState) {
        let stateNow = state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS);
        updateSceneFromGameState(stateNow);
        renderer.render(scene);
    }
    requestAnimationFrame(update);
};
update();



let exampleSFX=__includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1});
sbPlay(exampleSFX, x => soundEffect = x);
sbPlay(song);
onclick = soundEffect