let track_nodes;

let track_parseUploadedCurveHandles = pts => {
    track_nodes = [];

    let bezier = (ax, ay, bx, by, cx, cy, dx, dy, t, u) => [
        u*u*u*ax + 3*u*u*t*bx + 3*u*t*t*cx + t*t*t*dx,
        u*u*u*ay + 3*u*u*t*by + 3*u*t*t*cy + t*t*t*dy,
    ];

    for (let i = 0; i < pts.length; i += 6) {
        let j = (i + 6) % pts.length;
        for (let t = 0; t < 1; t += 0.05)
            track_nodes.push(bezier(pts[i],pts[i+1],pts[i+2],pts[i+3],pts[i+4],pts[i+5],pts[j],pts[j+1],t,1-t));
    }
};

let track_getLapPosition = pos3 => {
    let minDist = 1e9;
    let minI = -1;
    for (let i = 0; i < track_nodes.length; ++i) {
        let dx = pos3[0] - track_nodes[i][0]*G_TERRAIN_WORLDSPACE_SIZE;
        let dz = pos3[2] - track_nodes[i][1]*G_TERRAIN_WORLDSPACE_SIZE;
        let d2 = dx*dx+dz*dz;
        if (d2 < minDist) {
            minDist = d2;
            minI = i;
        }
    }
    return minI / track_nodes.length;
};

let track_getStartYaw = () => 
    Math.atan2(track_nodes[0][0]-track_nodes[1][0], track_nodes[0][1]-track_nodes[1][1]);

let track_getStartPosition = i => {
    let result = quat_mulVec3(
        quat_setAxisAngle([0,1,0], track_getStartYaw()),
        [
            ((i%2)*2-1)*G_START_LINE_HORIZONTAL_STAGGER,
            G_TERRAIN_WORLDSPACE_HEIGHT - G_START_LINE_VERTICAL_BASE - ((i/2)|0)*G_START_LINE_VERTICAL_STAGGER,
            0
        ]
    );

    result[0] += track_nodes[0][0] * G_TERRAIN_WORLDSPACE_SIZE;
    result[2] += track_nodes[0][1] * G_TERRAIN_WORLDSPACE_SIZE;
    return result;
};
