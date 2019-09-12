gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
gl.getExtension("OES_texture_half_float");
gl.clearColor(0, 0, 0, 1);

C.style.display='none';
C.style.left = C.style.top = 0;

let roomCode, Z = () =>
{
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

    C.style.display='block';
    onresize = resizeFunc;
    resizeFunc();

    let terrainProg = gfx_compileProgram(terrain_vert,terrain_frag)
      , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
      , terrainStuff = terrainGen_getRenderer(mapHandles)
      , meshes = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])

    let scene = {
        $player: 0,
        $objects: terrainStuff.meshes.map($mesh => ({
            $matrix: mat4_identity(),
            $mesh,
            $cull: 1,
            $prog: terrainProg,
            $tex: terrainStuff.$heightMapTexture
        })),
        $ships: [],
    };

    let connect = () => {
        let socket = io();

        socket.on("connect", () => {
            onkeydown = k => socket.emit(G_MSG_KEY_DOWN, k.keyCode);
            onkeyup = k => socket.emit(G_MSG_KEY_UP, k.keyCode);

            console.log(roomCode);

            socket.on(G_MSG_STATE_UPDATE, s => {
                lastState = currentState;
                currentState = s;
                s.$sounds.map(i => soundEffects[i] && soundEffects[i]());
                lastReceiveState = Date.now();
            });

            socket.on(G_MSG_REQUEST_TERRAIN, () => {
                socket.emit(G_MSG_UPLOAD_TERRAIN, {
                    $terrain: terrainGen_serializeHeightMap(terrainStuff.$heightMapTexture),
                    $mapHandles: mapHandles,
                });
            });
        });
    };

    let updateSceneFromGameState = state =>
        scene.$ships = state.$playerStates.map(p => (
            (state.$myId == p.$id && (scene.$player = p)),
            {
                $id: p.$id,
                $matrix: mat4_fromRotationTranslationScale(
                    quat_fromYawPitchRoll(p.$yaw, p.$pitch, p.$roll),
                    p.$position,
                    [G_SHIP_SCALE,G_SHIP_SCALE,-G_SHIP_SCALE]
                ),
                $mesh: meshes[G_MODEL_INDEX_ShipGameObject],
                $cull: 0,
                $prog: cubeProg
            }
        ));

    let update = () => {
        if (lastState && currentState) {
            let stateNow = state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS);
            updateSceneFromGameState(stateNow);
        }
        if (scene.$player) renderer.render(scene);
        requestAnimationFrame(update);
    };

    update();
    connect();
};

I.onkeypress = e => {
    if (e.keyCode == 13) {
        roomCode = I.value.trim();
        P.innerText='Loading...';
        setTimeout(Z, 0);
    }
};
