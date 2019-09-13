gl.getExtension('OES_texture_float');
gl.getExtension('OES_texture_float_linear');
gl.getExtension('OES_texture_half_float_linear');
gl.getExtension('OES_standard_derivatives');
gl.getExtension('WEBGL_depth_texture');
gl.getExtension("OES_texture_half_float");
gl.clearColor(0, 0, 0, 1);

C.style.display='none';

let globalWidth, globalHeight;

let resizeFunc = () => {
    let wide = innerHeight / innerWidth < .5625;
    let s = C.style;

    s.width = wide ? 'auto' : '100%';
    s.height = wide ? '100%' : 'auto';
    s.position = 'absolute';
    s.left = wide ? (innerWidth - C.clientWidth) / 2 : '0';
    s.top = wide ? '0' : (innerHeight - C.clientHeight) / 2;
};

let roomCode, Z = () =>
{
    C.width = globalWidth = 853;
    C.height = globalHeight = 480;

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
      , soundEffectsCopied = []
      , soundEffects = []
      , render = renderer_create()

    sbPlay(song);
    [
        // "G_SOUNDID_HIT_WALL": 0,
    __includeSongData({
      songData: [
        { // Instrument 0
          i: [
          2, // OSC1_WAVEFORM
          160, // OSC1_VOL
          128, // OSC1_SEMI
          1, // OSC1_XENV
          1, // OSC2_WAVEFORM
          160, // OSC2_VOL
          128, // OSC2_SEMI
          0, // OSC2_DETUNE
          1, // OSC2_XENV
          175, // NOISE_VOL
          4, // ENV_ATTACK
          28, // ENV_SUSTAIN
          65, // ENV_RELEASE
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          60, // LFO_AMT
          4, // LFO_FREQ
          1, // LFO_FX_FREQ
          2, // FX_FILTER
          255, // FX_FREQ
          81, // FX_RESONANCE
          0, // FX_DIST
          32, // FX_DRIVE
          61, // FX_PAN_AMT
          5, // FX_PAN_FREQ
          25, // FX_DELAY_AMT
          6 // FX_DELAY_TIME
          ],
          // Patterns
          p: [1],
          // Columns
          c: [
            {n: [115],
             f: []}
          ]
        },
        { // Instrument 1
          i: [
          0, // OSC1_WAVEFORM
          0, // OSC1_VOL
          128, // OSC1_SEMI
          0, // OSC1_XENV
          0, // OSC2_WAVEFORM
          0, // OSC2_VOL
          128, // OSC2_SEMI
          0, // OSC2_DETUNE
          0, // OSC2_XENV
          125, // NOISE_VOL
          0, // ENV_ATTACK
          1, // ENV_SUSTAIN
          59, // ENV_RELEASE
          0, // ARP_CHORD
          0, // ARP_SPEED
          0, // LFO_WAVEFORM
          0, // LFO_AMT
          0, // LFO_FREQ
          0, // LFO_FX_FREQ
          1, // FX_FILTER
          193, // FX_FREQ
          171, // FX_RESONANCE
          0, // FX_DIST
          29, // FX_DRIVE
          39, // FX_PAN_AMT
          3, // FX_PAN_FREQ
          41, // FX_DELAY_AMT
          3 // FX_DELAY_TIME
          ],
          // Patterns
          p: [],
          // Columns
          c: [
          ]
        },
        { // Instrument 2
          i: [
          0, // OSC1_WAVEFORM
          192, // OSC1_VOL
          104, // OSC1_SEMI
          1, // OSC1_XENV
          0, // OSC2_WAVEFORM
          80, // OSC2_VOL
          99, // OSC2_SEMI
          0, // OSC2_DETUNE
          0, // OSC2_XENV
          0, // NOISE_VOL
          4, // ENV_ATTACK
          44, // ENV_SUSTAIN
          66, // ENV_RELEASE
          0, // ARP_CHORD
          0, // ARP_SPEED
          3, // LFO_WAVEFORM
          0, // LFO_AMT
          0, // LFO_FREQ
          0, // LFO_FX_FREQ
          1, // FX_FILTER
          0, // FX_FREQ
          1, // FX_RESONANCE
          24, // FX_DIST
          32, // FX_DRIVE
          37, // FX_PAN_AMT
          4, // FX_PAN_FREQ
          23, // FX_DELAY_AMT
          0 // FX_DELAY_TIME
          ],
          // Patterns
          p: [1],
          // Columns
          c: [
            {n: [120],
             f: []}
          ]
        },
      ],
      rowLen: 5513,   // In sample lengths
      patternLen: 32,  // Rows per pattern
      endPattern: 0,  // End pattern
      numChannels: 3  // Number of channels
    }),

        // "G_SOUNDID_LASER": 1,
              __includeSongData({
                  songData: [
                    { // Instrument 0
                      i: [
                      3, // OSC1_WAVEFORM
                      127, // OSC1_VOL
                      106, // OSC1_SEMI
                      1, // OSC1_XENV
                      3, // OSC2_WAVEFORM
                      119, // OSC2_VOL
                      106, // OSC2_SEMI
                      0, // OSC2_DETUNE
                      1, // OSC2_XENV
                      0, // NOISE_VOL
                      7, // ENV_ATTACK
                      17, // ENV_SUSTAIN
                      103, // ENV_RELEASE
                      0, // ARP_CHORD
                      0, // ARP_SPEED
                      0, // LFO_WAVEFORM
                      155, // LFO_AMT
                      0, // LFO_FREQ
                      1, // LFO_FX_FREQ
                      2, // FX_FILTER
                      193, // FX_FREQ
                      85, // FX_RESONANCE
                      2, // FX_DIST
                      77, // FX_DRIVE
                      83, // FX_PAN_AMT
                      3, // FX_PAN_FREQ
                      135, // FX_DELAY_AMT
                      1 // FX_DELAY_TIME
                      ],
                      // Patterns
                      p: [1],
                      // Columns
                      c: [
                        {n: [144],
                         f: []}
                      ]
                    },
                  ],
                  rowLen: 5513,   // In sample lengths
                  patternLen: 32,  // Rows per pattern
                  endPattern: 0,  // End pattern
                  numChannels: 1  // Number of channels
            }),

        // G_SOUNDID_BOOST
              __includeSongData({
                      songData: [
                        { // Instrument 0
                          i: [
                          2, // OSC1_WAVEFORM
                          138, // OSC1_VOL
                          116, // OSC1_SEMI
                          0, // OSC1_XENV
                          2, // OSC2_WAVEFORM
                          138, // OSC2_VOL
                          128, // OSC2_SEMI
                          4, // OSC2_DETUNE
                          0, // OSC2_XENV
                          0, // NOISE_VOL
                          49, // ENV_ATTACK
                          21, // ENV_SUSTAIN
                          0, // ENV_RELEASE
                          106, // ARP_CHORD
                          5, // ARP_SPEED
                          0, // LFO_WAVEFORM
                          139, // LFO_AMT
                          4, // LFO_FREQ
                          1, // LFO_FX_FREQ
                          3, // FX_FILTER
                          64, // FX_FREQ
                          160, // FX_RESONANCE
                          3, // FX_DIST
                          32, // FX_DRIVE
                          0, // FX_PAN_AMT
                          4, // FX_PAN_FREQ
                          53, // FX_DELAY_AMT
                          5 // FX_DELAY_TIME
                          ],
                          // Patterns
                          p: [1],
                          // Columns
                          c: [
                            {n: [149],
                             f: []}
                          ]
                        },
                      ],
                      rowLen: 5513,   // In sample lengths
                      patternLen: 32,  // Rows per pattern
                      endPattern: 0,  // End pattern
                      numChannels: 1  // Number of channels
            }),

    ]
    .map((x,i) => {
        soundEffectsCopied[i] = {c:0,f:[]};
        for (let j = 0; j < 8; j++) 
            sbPlay(x, y => soundEffectsCopied[i].f[j] = y);

        soundEffects[i] = () =>
            soundEffectsCopied[i].f[soundEffectsCopied[i].c = (1+soundEffectsCopied[i].c) % 8]();
    });

    C.style.display='inline-block';

    let terrainProg = gfx_compileProgram(terrain_vert,terrain_frag)
      , cubeProg = gfx_compileProgram(cube_vert, cube_frag)
      , terrainStuff = terrainGen_getRenderer(mapHandles)
      , meshes = meshLoader_loadMeshesBlob(blobs[G_MODELS_BLOB])


    let scene = {
        $player: 0,
        $static: terrainStuff.meshes.map(($mesh,i) => ({
            $id: 't'+i,
            $matrix: mat4_identity(),
            $mesh,
            $cull: 1,
            $prog: terrainProg,
            $tex: terrainStuff.$heightMapTexture
        })),
        $dynamic: []
    };


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
                    $terrain: terrainGen_serializeHeightMap(terrainStuff.$heightMapTexture),
                    $mapHandles: mapHandles,
                });
            });

            socket.on(G_MSG_RETURN_ROOM_SORRY, () => {
                document.body.style.color = '#fff';
                document.body.innerText = 'Sorry, that race has started!';
            });

            socket.on(G_MSG_REQUEST_ROOM_CODE, () =>
                socket.emit(G_MSG_UPLOAD_ROOM_CODE, roomCode));
        });
    };

    let updateSceneFromGameState = state => {
        scene.$dynamic = state.$playerStates.map(p => {
            if (state.$myId == p.$id) 
                scene.$player = p;

            return {
                $id: p.$id,
                $matrix: mat4_fromRotationTranslationScale(
                    quat_fromYawPitchRoll(p.$yaw, p.$pitch, p.$roll),
                    p.$position,
                    [G_SHIP_SCALE,G_SHIP_SCALE,-G_SHIP_SCALE]
                ),
                $mesh: meshes[G_MODEL_INDEX_ShipGameObject],
                $cull: 0,
                $prog: cubeProg,
                $bullet: 0
            };
        }).concat(state.$bullets.map(b => ({
            $id: b.$id,
            $matrix: mat4_fromRotationTranslationScale(
                b.$rotation,
                b.$position,
                [0.1*G_SHIP_SCALE,0.1*G_SHIP_SCALE,-G_SHIP_SCALE]
            ),
            $mesh: meshes[G_MODEL_INDEX_ShipGameObject],
            $cull: 0,
            $prog: cubeProg,
            $bullet: 10
        })));

        if (state.$raceCountdown > 0) {
            if (state.$playerStates.length < 2) {
                scene.$text0 = '';
                scene.$text1 = 'waiting';
            } else {
                scene.$text0 = ((state.$raceCountdown / G_TICK_MILLIS)|0);
                scene.$text1 = '';
            }
        } else {
            scene.$text0 = '# '+scene.$player.$place;
            scene.$text1 = scene.$player.$lap > 2 ? '' : 'Lap ' + (scene.$player.$lap+1)+'/3';
        }
    };

    let update = () => {
        if (lastState && currentState) {
            let stateNow = state_lerp(lastState, currentState, (Date.now() - lastReceiveState) / G_TICK_MILLIS);
            updateSceneFromGameState(stateNow);
        }
        if (scene.$player) render(scene);
        requestAnimationFrame(update);
    };

    update();
    connect();

    document.body.style.backgroundColor = '#000';
    resizeFunc();
};

// NOTE: deduplicating this code makes the zip bigger.

I.onkeypress = e => {
    if (e.keyCode == 13) {
        roomCode = I.value.trim();
        P.innerText='Loading...';
        setTimeout(Z, 9);
    }
};


onresize = resizeFunc;
