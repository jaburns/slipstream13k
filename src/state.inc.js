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
            $roll: vec3_lerp([prev.$roll], [s.$roll], t)[0],

            $camPos: vec3_lerp(prev.$camPos, s.$camPos, t), 
            $camRot: quat_slerp(prev.$camRot, s.$camRot, t), 
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
    '$roll',
    
    '$camPos',
    '$camRot',
];

let state_createPlayer = ($socket, $id) => ({
    $socket,
    $keysDown: [],

    $id,
    $position: [0,G_TERRAIN_WORLDSPACE_HEIGHT * 2,G_TERRAIN_WORLDSPACE_SIZE],
    $yaw: 0,
    $pitch: 0,
    $roll: 0,

    $camPos: [0,G_TERRAIN_WORLDSPACE_HEIGHT * 2,G_TERRAIN_WORLDSPACE_SIZE],
    $camRot: [0,0,0,1],

    $rollVel: 0,
    $pitchVel: 0,
    $velocity: [0,0,0],
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

    // Pitch controls

    if (playerState.$keysDown.indexOf(G_KEYCODE_DOWN) >= 0) {
        playerState.$pitchVel += G_PITCH_ACCEL;
        if (playerState.$pitchVel > G_PITCH_MAX_VEL) playerState.$pitchVel = G_PITCH_MAX_VEL;
    } else if (playerState.$keysDown.indexOf(G_KEYCODE_UP) >= 0) {
        playerState.$pitchVel -= G_PITCH_ACCEL;
        if (playerState.$pitchVel < -G_PITCH_MAX_VEL) playerState.$pitchVel = -G_PITCH_MAX_VEL;
    }  else {
        playerState.$pitchVel *= G_PITCH_RESTORE;
    }
    playerState.$pitch += playerState.$pitchVel;
    if (playerState.$pitch >  G_PITCH_MAX) playerState.$pitch =  G_PITCH_MAX;
    if (playerState.$pitch < -G_PITCH_MAX) playerState.$pitch = -G_PITCH_MAX;

    // Bank controls

    if (playerState.$keysDown.indexOf(G_KEYCODE_LEFT) >= 0) {
        if (playerState.$rollVel < 0) playerState.$rollVel = 0;
        playerState.$rollVel += G_ROLL_ACCEL;
        if (playerState.$rollVel > G_ROLL_MAX_VEL) playerState.$rollVel = G_ROLL_MAX_VEL;
    } else if (playerState.$keysDown.indexOf(G_KEYCODE_RIGHT) >= 0) {
        if (playerState.$rollVel > 0) playerState.$rollVel = 0;
        playerState.$rollVel -= G_ROLL_ACCEL;
        if (playerState.$rollVel < -G_ROLL_MAX_VEL) playerState.$rollVel = -G_ROLL_MAX_VEL;
    }  else {
        playerState.$rollVel = playerState.$roll * (G_ROLL_RESTORE - 1);
    }
    playerState.$roll += playerState.$rollVel;
    if (playerState.$roll >  G_ROLL_MAX) playerState.$roll =  G_ROLL_MAX;
    if (playerState.$roll < -G_ROLL_MAX) playerState.$roll = -G_ROLL_MAX;
    
    playerState.$yaw += G_BANK_TURN_SPEED * playerState.$roll;

    let orientation = quat_fromYawPitchRoll(playerState.$yaw, playerState.$pitch, playerState.$roll);
    let accelVec = quat_mulVec3(orientation, [0, 0, -G_ACCEL]);

    playerState.$velocity = vec3_plus(playerState.$velocity, accelVec);

    if (vec3_length(playerState.$velocity) > G_MAX_SPEED)
        playerState.$velocity = vec3_normalize(playerState.$velocity).map(x => x*G_MAX_SPEED);

    playerState.$position = vec3_plus(playerState.$position, playerState.$velocity);

    let col = collision_test(playerState.$position, playerState.$velocity);

    if (col) {
        playerState.$velocity = col.map(x=> x * G_COLLISION_SPEED_LOSS);
        // TODO affect $speed, and if you're flipping around don't do that. Just get negative speed
        // Maybe orientation should be decoupled from actual speed so you can bounce without changing orientation.

    //  playerState.$yaw = col.$yaw;
    //  playerState.$pitch = col.$pitch;
    //  playerState.$yawVel = playerState.$pitchVel = 0;
    }

    let cameraSeekRot = quat_fromYawPitchRoll(playerState.$yaw, playerState.$pitch, 0);
    let cameraSeekPos = vec3_minus(playerState.$position, playerState.$velocity.map(x => x*2));
    cameraSeekPos[1] += 0.5;

    playerState.$camPos = vec3_lerp(playerState.$camPos, cameraSeekPos, G_CAMERA_POS_LAG);
    playerState.$camRot = quat_slerp(playerState.$camRot, cameraSeekRot, G_CAMERA_ROT_LAG);

    console.log(track_getClosestNode(playerState.$position));
};