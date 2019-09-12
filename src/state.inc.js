// This file is included in both the client and the server JS packages.
// Need to be careful that the sets of functions they use do not intersect
// or those functions should be moved to shared.js.

// ===== Client code =============================================================


/*
let state_lerpIdThings = fn => (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.$id == s.$id && (prev = s0));
        result.push(fn(prev, s, t));
    });

    return result;
};

let state_lerpPlayerStates = state_lerpIdThings((a, b, t) => ({
    $id: b.$id,
    $position: vec3_lerp(a.$position, b.$position, t), 
    $yaw: vec3_lerp([a.$yaw], [b.$yaw], t)[0],
    $pitch: vec3_lerp([a.$pitch], [b.$pitch], t)[0],
    $roll: vec3_lerp([a.$roll], [b.$roll], t)[0],

    $place: b.$place,
    $lap: b.$lap,

    $camPos: vec3_lerp(a.$camPos, b.$camPos, t), 
    $camRot: quat_slerp(a.$camRot, b.$camRot, t), 
}));

let state_lerpBullets = (a, b, t) => state_lerpIdThings((a, b, t) => ({
    $id: b.$id,
    $position: vec3_lerp(a.$position, b.$position, t), 
}));
*/

let state_lerpIdThings = (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.$id == s.$id && (prev = s0));
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
};

let state_lerpBullets = (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.$id == s.$id && (prev = s0));
        result.push({
            $id: s.$id,
            $position: vec3_lerp(prev.$position, s.$position, t), 
        });
    });

    return result;
};

let state_lerp = (a, b, t) => {
    return {
        $myId: b.$myId,
        $playerStates: state_lerpPlayerStates(a.$playerStates, b.$playerStates, t),
        $raceCountdown: b.$raceCountdown,
        $bullets: state_lerpBullets(a.$bullets, b.$bullets, t),
    };
};

// ===== Server code =============================================================

let state_createRoot = () => ({
    $myId: 0,
    $raceCountdown: G_SECONDS_TO_START * G_TICK_MILLIS,
    $playerStates: [],
    $bullets: [],
});

// add bullet vel
// add shoot button
// draw bullets
// add boost meter
// allow player to boost
// when race finish do a thing

let state_sockets = {};

let state_playerJoin = (state, socket, $id) => {
    let newPlayer = {
        $keysDown: [],

        $id,
        $position: track_getStartPosition(state.$playerStates.length),
        $yaw: track_getStartYaw(),
        $pitch: 0,
        $roll: 0,

        $camPos: [0,0,0],
        $camRot: [0,0,0,1],

        $rollVel: 0,
        $pitchVel: 0,
        $velocity: [0,0,0],

        $place: 0,
        $checkpoint: 0,
        $lap: 0,

        $toyYaw: track_getStartYaw(),
        $toyPitch: 0,
    };
    state_sockets[$id] = socket;
    state.$playerStates.push(newPlayer);
    state.$raceCountdown = G_SECONDS_TO_START * G_TICK_MILLIS;
    return newPlayer;
};

let state_playerLeave = (state, player) => {
    state.$playerStates.splice(state.$playerStates.indexOf(player), 1);
    delete state_sockets[player.$id];
};

let state_emitToAllPlayers = rootState => {
    let packet = {
        $raceCountdown: rootState.$raceCountdown,
        $playerStates: rootState.$playerStates,
    };

    rootState.$playerStates.forEach(p => {
        packet.$myId = p.$id;
        packet.$sounds = rootState.$sounds.concat(p.$sounds);
        state_sockets[p.$id].emit(G_MSG_STATE_UPDATE, packet);
    });
};

let state_update = rootState => {
    rootState.$sounds = [];

    if (rootState.$raceCountdown > 0 && rootState.$playerStates.length > 1) {
        rootState.$raceCountdown--;
    }

    rootState.$playerStates.forEach(p => {
        state_updatePlayer(p, rootState.$raceCountdown);
    });

    rootState.$playerStates.sort((a,b) => (b.$lap+b.$lapPosition) - (a.$lap+a.$lapPosition));
    rootState.$playerStates.map((p,i) => p.$place = i + 1);
};

let state_updatePlayer = (playerState, countdown) => {
    playerState.$sounds = [];

    let cameraSeekPos, cameraSeekRot;

    if (countdown < 1)
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
        cameraSeekRot = quat_fromYawPitchRoll(playerState.$yaw, playerState.$pitch, 0);
    }
    else 
    {
    //  let fn = (a,b,c) => playerState.$keysDown.indexOf(a) >= 0 && (playerState[b] += c);
    //  fn(G_KEYCODE_DOWN ,'$toyPitch', .1);
    //  fn(G_KEYCODE_UP   ,'$toyPitch',-.1);
    //  fn(G_KEYCODE_RIGHT,'$toyYaw',  -.1);
    //  fn(G_KEYCODE_LEFT, '$toyYaw',   .1);
        if (playerState.$keysDown.indexOf(G_KEYCODE_DOWN) >= 0) playerState.$toyPitch += 0.1;
        if (playerState.$keysDown.indexOf(G_KEYCODE_UP) >= 0) playerState.$toyPitch -= 0.1;
        if (playerState.$keysDown.indexOf(G_KEYCODE_RIGHT) >= 0) playerState.$toyYaw -= 0.1;
        if (playerState.$keysDown.indexOf(G_KEYCODE_LEFT) >= 0) playerState.$toyYaw += 0.1;

        cameraSeekRot = quat_fromYawPitchRoll(playerState.$toyYaw, playerState.$toyPitch, 0);
        cameraSeekPos = vec3_plus(playerState.$position, quat_mulVec3(cameraSeekRot, [0,0,50]));
    }

    cameraSeekPos[1] += 0.5;

    playerState.$camPos = vec3_lerp(playerState.$camPos, cameraSeekPos, G_CAMERA_POS_LAG);
    playerState.$camRot = quat_slerp(playerState.$camRot, cameraSeekRot, G_CAMERA_ROT_LAG);

    playerState.$lapPosition = track_getLapPosition(playerState.$position);

    for (let i = 0; i < 3; ++i) 
        if (playerState.$checkpoint == i && playerState.$lapPosition > (i+1)/4 && playerState.$lapPosition < (i+2)/4)
            playerState.$checkpoint = i+1;

    if (playerState.$checkpoint == 3 && playerState.$lapPosition < .25 && playerState.$lapPosition > 0.0) {
        playerState.$checkpoint = 0;
        playerState.$lap++;
    }
};
