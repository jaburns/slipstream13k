// This file is included in both the client and the server JS packages.
// Need to be careful that the sets of functions they use do not intersect
// or those functions should be moved to shared.js.

// ===== Client code =============================================================

let state_lerpPlayerStates = (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.$id == s.$id && (prev = s0))

        result.push({
            $id: s.$id,
            $position: vec3_lerp(prev.$position, s.$position, t), 
            $yaw: vec3_lerp([prev.$yaw], [s.$yaw], t)[0],
            $pitch: vec3_lerp([prev.$pitch], [s.$pitch], t)[0],
        });
    });

    return result;
}

let state_lerp = (a, b, t) => {
    return {
        $myId: b.$myId,
        $playerStates: state_lerpPlayerStates(a.$playerStates, b.$playerStates, t)
    };
};

// ===== Server code =============================================================

let filterObject = (obj, props) => {
    let result = {};
    props.forEach(p => result[p] = obj[p]);
    return result;
};

let state_createRoot = () => ({
    $myId: 0,
    $playerStates: [],
});

let state_convertToPacket = rootState => ({
    $myId: 0,
    $playerStates: rootState.$playerStates.map(x => filterObject(x, state_PLAYER_SHARED_PROPS))
});

let state_PLAYER_SHARED_PROPS = [
    '$id',
    '$position',
    '$yaw',
    '$pitch',
];

let state_createPlayer = ($socket, $id) => ({
    $socket,
    $keysDown: [],

    $id,
    $position: [Math.random(), Math.random(), 0],
    $yaw: 0,
    $pitch: 0,
});

let state_emitToAllPlayers = rootState => {
    let packet = state_convertToPacket(rootState);
    rootState.$playerStates.forEach(p => {
        packet.$myId = p.$id;
        p.$socket.emit(G_MSG_STATE_UPDATE, packet);
    });
};

let state_update = rootState => {
    rootState.$playerStates.forEach(p => {
        state_updatePlayer(p);
    });
};

let state_updatePlayer = playerState => {
    let vot = 0;

    if (playerState.$keysDown.indexOf(G_KEYCODE_UP)    >= 0) vot =  0.05;
    if (playerState.$keysDown.indexOf(G_KEYCODE_DOWN)  >= 0) vot = -0.05;

    let rot = 0;

    if (playerState.$keysDown.indexOf(G_KEYCODE_LEFT)  >= 0) rot =  0.05;
    if (playerState.$keysDown.indexOf(G_KEYCODE_RIGHT) >= 0) rot = -0.05;

    playerState.$yaw += rot;
    playerState.$pitch += vot;

    rot = [0,0,0,1];
    rot = quat_mul(quat_setAxisAngle([0,1,0], playerState.$yaw), rot);
    rot = quat_mul(quat_setAxisAngle(quat_mulVec3(rot, [1,0,0]), playerState.$pitch), rot);
    // The yaw/pitch to rotation func can be shared.

    playerState.$position = vec3_plus(playerState.$position, quat_mulVec3(rot, [0,0,-0.1]));
};