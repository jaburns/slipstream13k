// This file is included in both the client and the server JS packages.
// Need to be careful that the sets of functions they use do not intersect
// or those functions should be moved to shared.js.

// ===== Client code =============================================================

let state_lerpNum = (a, b, t) => a + (b-a)*t;

let state_lerpPlayerStates = (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.$id == s.$id && (prev = s0))

        result.push({
            $id: s.$id,
            $xPos: state_lerpNum(prev.$xPos, s.$xPos, t),
            $yPos: state_lerpNum(prev.$yPos, s.$yPos, t),
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
    '$xPos',
    '$yPos'
];

let state_createPlayer = ($socket, $id) => ({
    $socket,
    $id,
    $xPos: Math.random(),
    $yPos: Math.random(),
    $keysDown: [],
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
    const LEFT = 37, 
        UP = 38, 
        RIGHT = 39, 
        DOWN = 40;

    if (playerState.$keysDown.indexOf(LEFT)  >= 0) playerState.$xPos -= 0.05;
    if (playerState.$keysDown.indexOf(UP)    >= 0) playerState.$yPos += 0.05;
    if (playerState.$keysDown.indexOf(RIGHT) >= 0) playerState.$xPos += 0.05;
    if (playerState.$keysDown.indexOf(DOWN)  >= 0) playerState.$yPos -= 0.05;
};