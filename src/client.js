gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
gl.getExtension("OES_texture_half_float");
gl.clearColor(0, 0, 0, 1);

//__include soundbox-player.inc.js
//__include song.inc.js

//__include shaders.gen.js

//__include gfx.inc.js
//__include meshLoader.inc.js
//__include terrainGen.inc.js

//__include state.inc.js

//__include renderer.inc.js

let blobs = __binaryBlobs
  , mapHandles = [].slice.call(blobs[G_MAP_BLOB]).map(x=>x/255)
  , lastReceiveState
  , lastState
  , currentState
  , soundEffects = []
  , renderer = renderer_create()
  , resizeFunc = () => {
        let w = innerWidth, h = innerHeight;
        C.width = w;
        C.height = h;
        renderer.resize(w, h);
    };


sbPlay(song);
[
    // "G_SOUNDID_HIT_WALL": 0,
    __includeSongData({songData:[{i:[0,255,116,1,0,255,120,0,1,127,4,6,35,0,0,0,0,0,0,2,14,0,10,32,0,0,0,0],p:[1],c:[{n:[140],f:[]}]}],rowLen:5513,patternLen:32,endPattern:0,numChannels:1}),
]
.map((x,i) => sbPlay(x, x=>soundEffects[i]=x));


C.style.left = C.style.top = 0;
onresize = resizeFunc;
resizeFunc();

let terrainProg = gfx_compileProgram(terrain_vert,terrain_frag)
  , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
  , terrainStuff = terrainGen_getRenderer(mapHandles)
  , meshes = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])

let scene = {
    $cameraTransform: Transform_create(),
    $place: 1,
    $lap: 0,
    $objects: terrainStuff.meshes.map($mesh => ({
        $transform: Transform_create(),
        $mesh,
        $cull: 1,
        $prog: terrainProg,
        $tex: terrainStuff.heightMapTexture
    }))
};
let playerObjectsById = {};

let connect = () => {
    let socket = io();

    socket.on("connect", () => {
        onkeydown = k => socket.emit(G_MSG_KEY_DOWN, k.keyCode);
        onkeyup = k => socket.emit(G_MSG_KEY_UP, k.keyCode);

        socket.on(G_MSG_STATE_UPDATE, s => {
            lastState = currentState;
            currentState = s;
            s.$sounds.map(i => soundEffects[i] && soundEffects[i]());
            lastReceiveState = Date.now();
        });

        socket.on(G_MSG_REQUEST_TERRAIN, () => {
            socket.emit(G_MSG_UPLOAD_TERRAIN, {
                $terrain: terrainGen_serializeHeightMap(terrainStuff.heightMapTexture),
                $mapHandles: mapHandles,
            });
        });
    });
};

let getPlayerObject = id => {
    if (!(id in playerObjectsById)) {
        playerObjectsById[id] = {
            $id: id,
            $transform: Transform_create(),
            $mesh: meshes[G_MODEL_INDEX_ShipGameObject],
            $cull: 0,
            $prog: cubeProg
        };

        scene.$objects.push(playerObjectsById[id]);
    }
    return playerObjectsById[id];
};

let updateSceneFromGameState = state => {
    let touchedIds = [];

    state.$playerStates.forEach(p => {
        touchedIds.push(p.$id);
        let obj = getPlayerObject(p.$id);

        let orientation = quat_fromYawPitchRoll(p.$yaw, p.$pitch, p.$roll);
        obj.$transform.p = p.$position;
        obj.$transform.r = orientation;
        obj.$transform.s = [G_SHIP_SCALE,G_SHIP_SCALE,-G_SHIP_SCALE];

        if (state.$myId == p.$id) {
            // TODO scene should just have a $thisPlayer on it
            scene.$place = p.$place;
            scene.$lap = p.$lap;
            scene.$cameraTransform.p = p.$camPos;
            scene.$cameraTransform.r = p.$camRot;
        }
    });

    scene.$objects = scene.$objects.filter(x => !x.$id || touchedIds.indexOf(x.$id) >= 0);
};

let update = () => {
    if (lastState && currentState) {
        let stateNow = state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS);
        updateSceneFromGameState(stateNow);
    }
    renderer.render(scene);
    requestAnimationFrame(update);
};
update();

connect();
