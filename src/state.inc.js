// This file is included in both the client and the server JS packages.
// Need to be careful that the sets of functions they use do not intersect
// or those functions should be moved to shared.js.


let lerpNum = (a, b, t) => a + (b-a)*t;

let lerpPlayerStates = (a, b, t) => {
    let result = [];

    b.forEach(s => {
        let prev = s;
        a.forEach(s0 => s0.id == s.id && (prev = s0))

        result.push({
            id: s.id,
            x: lerpNum(prev.x, s.x, t),
            y: lerpNum(prev.y, s.y, t),
        });
    });

    return result;
}

// Used by client.js
let state_lerp = (a, b, t) => ({
    myId: b.myId,
    playerStates: lerpPlayerStates(a.playerStates, b.playerStates, t)
});

// Used by server.js
let state_updatePlayer = p => {
    const LEFT = 37, 
        UP = 38, 
        RIGHT = 39, 
        DOWN = 40;

    if (p.k.indexOf(LEFT)  >= 0) p.x -= 0.05;
    if (p.k.indexOf(UP)    >= 0) p.y += 0.05;
    if (p.k.indexOf(RIGHT) >= 0) p.x += 0.05;
    if (p.k.indexOf(DOWN)  >= 0) p.y -= 0.05;
};