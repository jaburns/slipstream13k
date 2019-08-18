// This file is included in both the client and the server JS packages.
// Need to be careful that the sets of functions they use do not intersect
// or those functions should be moved to shared.js.

// Used by client.js
let state_lerp = (a, b, t) =>
    b.map((p, i) => (i < a.length) ? {
            x: a[i].x+(p.x-a[i].x)*t,
            y: a[i].y+(p.y-a[i].y)*t
        } : {x:1/0,y:0});

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