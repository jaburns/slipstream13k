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

            $place: s.$place,
            $lap: s.$lap,

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
    $sounds: [],
    $raceCountdown: 30 * G_TICK_MILLIS,
    $playerStates: [],
});

let state_PLAYER_SHARED_PROPS = [
    '$id',
    '$position',
    '$yaw',
    '$pitch',
    '$roll',

    '$place',
    '$lap',
    
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

        $place: 0,

        $checkpoint: 0,
        $lap: 0,
        $lapPosition: 0,

        $sounds: [],
    };

    state.$playerStates.push(newPlayer);
    return newPlayer;
};

let state_playerLeave = (state, player) => {
    state.$playerStates.splice(state.$playerStates.indexOf(player), 1);
};

let state_emitToAllPlayers = rootState => {
    let packet = {
        $raceCountdown: rootState.$raceCountdown,
        $playerStates: rootState.$playerStates.map(x => filterObject(x, state_PLAYER_SHARED_PROPS))
    };

    rootState.$playerStates.forEach(p => {
        packet.$myId = p.$id;
        packet.$sounds = rootState.$sounds.concat(p.$sounds);
        p.$socket.emit(G_MSG_STATE_UPDATE, packet);
    });
};

let state_update = rootState => {
    rootState.$sounds = [];

    if (rootState.$raceCountdown > 0) {
        rootState.$raceCountdown--;
    }

    rootState.$playerStates.forEach(p => {
        state_updatePlayerRacing(p, rootState.$raceCountdown < 1);
    });

    rootState.$playerStates.sort((a,b) => (b.$lap+b.$lapPosition) - (a.$lap+a.$lapPosition));
    rootState.$playerStates.map((p,i) => p.$place = i + 1);
};

let state_updatePlayerRacing = (playerState, raceStarted) => {
    playerState.$sounds = [];

    let cameraSeekPos, cameraSeekRot = quat_fromYawPitchRoll(playerState.$yaw, playerState.$pitch, 0);

    if (raceStarted)
    {
        let runControls = (theta, omega, keyA, keyB, thetaMax, omegaMax, accel, decelRoll) => {
            if (playerState.$keysDown.indexOf(keyA) >= 0) {
                if (playerState[omega] < 0) playerState[omega] = 0;
                playerState[omega] += accel;
            } else if (playerState.$keysDown.indexOf(keyB) >= 0) {
                if (playerState[omega] > 0) playerState[omega] = 0;
                playerState[omega] -= accel;
            } else if (decelRoll) {
                playerState[omega] = playerState[theta] * (G_ROLL_RESTORE - 1);
            } else {
                playerState[omega] *= G_PITCH_RESTORE;
            }

            playerState[omega] = Math.max(Math.min(playerState[omega], omegaMax), -omegaMax);

            playerState[theta] += playerState[omega];

            playerState[theta] = Math.max(Math.min(playerState[theta], thetaMax), -thetaMax);
        };
        runControls('$pitch', '$pitchVel', G_KEYCODE_DOWN, G_KEYCODE_UP, G_PITCH_MAX, G_PITCH_MAX_VEL, G_PITCH_ACCEL, 0);
        runControls('$roll', '$rollVel', G_KEYCODE_LEFT, G_KEYCODE_RIGHT, G_ROLL_MAX, G_ROLL_MAX_VEL, G_ROLL_ACCEL, 1);

        
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
            playerState.$sounds.push(G_SOUNDID_HIT_WALL);
        }

        cameraSeekPos = vec3_minus(playerState.$position, playerState.$velocity.map(x => x*2));
    }
    else 
    {
        cameraSeekPos = vec3_plus(playerState.$position, quat_mulVec3(cameraSeekRot, [0,0,1]));
    }

    cameraSeekPos[1] += 0.5;

    playerState.$camPos = vec3_lerp(playerState.$camPos, cameraSeekPos, G_CAMERA_POS_LAG);
    playerState.$camRot = quat_slerp(playerState.$camRot, cameraSeekRot, G_CAMERA_ROT_LAG);

    playerState.$lapPosition = track_getLapPosition(playerState.$position);

    if (playerState.$checkpoint == 0 && playerState.$lapPosition > .25 && playerState.$lapPosition < .50) playerState.$checkpoint = 1;
    if (playerState.$checkpoint == 1 && playerState.$lapPosition > .50 && playerState.$lapPosition < .75) playerState.$checkpoint = 2;
    if (playerState.$checkpoint == 2 && playerState.$lapPosition > .75 && playerState.$lapPosition < 1.0) playerState.$checkpoint = 3;
    if (playerState.$checkpoint == 3 && playerState.$lapPosition < .25 && playerState.$lapPosition > 0.0) {
        playerState.$checkpoint = 0;
        playerState.$lap++;
    }
};