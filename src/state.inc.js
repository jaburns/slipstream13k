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
    $raceCountdown: 10 * G_TICK_MILLIS,
    $playerStates: [],
});

let state_convertToPacket = rootState => ({
    $myId: 0,
    $raceCountdown: rootState.$raceCountdown,
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

let state_playerJoin = (state, $socket, $id) => {
    let newPlayer = {
        $socket,
        $keysDown: [],

        $id,
        $position: track_getStartPosition(state.$playerStates.filter(x=>x.$racing).length),
        $yaw: track_getStartYaw(),
        $pitch: 0,
        $roll: 0,

        $camPos: [0,0,0],
        $camRot: [0,0,0,1],

        $racing: state.$raceCountdown > 0,
        $rollVel: 0,
        $pitchVel: 0,
        $velocity: [0,0,0],
    };

    state.$playerStates.push(newPlayer);
    return newPlayer;
};

let state_playerLeave = (state, player) => {
    state.$playerStates.splice(state.$playerStates.indexOf(player), 1);
};

let state_emitToAllPlayers = rootState => {
    let packet = state_convertToPacket(rootState);
    rootState.$playerStates.forEach(p => {
        packet.$myId = p.$id;
        p.$socket.emit(G_MSG_STATE_UPDATE, packet);
    });
};

let state_update = rootState => {
    if (rootState.$raceCountdown > 0) {
        rootState.$raceCountdown--;

        rootState.$playerStates.forEach(p => {
            if (p.$racing)
                state_updatePlayerOnDeck(p);
            else
                state_updatePlayerQueued(p);
        });
    } else {
        rootState.$playerStates.forEach(p => {
            if (p.$racing)
                state_updatePlayerRacing(p);
            else
                state_updatePlayerQueued(p);
        });
    }
};

let state_updatePlayerQueued = playerState => {
    playerState.$camPos = [G_TERRAIN_WORLDSPACE_SIZE / 2, 50, G_TERRAIN_WORLDSPACE_SIZE / 2]
    playerState.$camRot = [-0.707,0,0,0.707];
};

let state_updatePlayerOnDeck = playerState => {
    let cameraSeekRot = quat_fromYawPitchRoll(playerState.$yaw, 0, 0);
    let offset = quat_mulVec3(cameraSeekRot, [0,0,1]);
    let cameraSeekPos = vec3_plus(playerState.$position, offset);
    cameraSeekPos[1] += 0.5;

    playerState.$camPos = vec3_lerp(playerState.$camPos, cameraSeekPos, G_CAMERA_POS_LAG);
    playerState.$camRot = quat_slerp(playerState.$camRot, cameraSeekRot, G_CAMERA_ROT_LAG);
};

let state_updatePlayerRacing = playerState => {

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
        if (col.length > 3) {
            col.pop();
            playerState.$pitch = G_CEILING_HIT_PITCH_RESET;
        }
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

    //console.log(track_getLapPosition(playerState.$position));
};